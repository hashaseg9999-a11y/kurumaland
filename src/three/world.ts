import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Euler,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  PMREMGenerator,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import type { CameraPresetName, FrameHandler, PointerRayHandler, World3D } from './contracts';

type Vec3 = [number, number, number];

interface InstanceItem {
  p: Vec3;
  ry?: number;
  s: Vec3;
  color?: string;
}

const PALETTE = {
  skyTop: '#2f8ce0',
  skyMid: '#87d1ff',
  skyHorizon: '#eaf7ff',
  fog: '#e8f6ff',
  sunlight: '#fff2cd',
  skylight: '#e8f7ff',
  bounce: '#b9dcff',
  ground: '#7fb168',
  grassA: '#7cc46a',
  grassB: '#57a151',
  grassDry: '#a8c96a',
  road: '#4e5965',
  sidewalk: '#e9edf0',
  curb: '#f4f7f8',
  lane: '#f6fafc',
  rail: '#dfe7ec',
  trunk: '#7a5443',
  cloud: '#ffffff',
  sunDisc: '#fffbe8',
  sunHalo: '#fff2b0',
};

const BODY_COLORS = ['#fdf6ec', '#fde8d8', '#e8f4ff', '#eaf7ea', '#f6e6f7', '#fff7d6', '#e3f2f4'];
const ROOF_COLORS = ['#e2574d', '#4f86c6', '#f0a63c', '#67a86b', '#8b6fc0'];
const ACCENT_COLORS = ['#ff7f6a', '#ffc94d', '#57c7ff', '#7bd88f'];
const LEAF_COLORS = ['#4caf50', '#3d9142', '#5fb963', '#2f8f4e', '#6dbf74'];
const FLOWER_COLORS = ['#ff6f91', '#ffd166', '#7bd88f', '#9b8cff', '#ff9f68'];
const GLASS_TINTS = ['#ffffff', '#f2fbff', '#fff6de', '#eaf6ff', '#fdf3ea'];

function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function shadeColor(hex: string, amount: number): string {
  const color = new Color(hex);
  if (amount >= 0) color.lerp(new Color('#ffffff'), Math.min(1, amount));
  else color.lerp(new Color('#000000'), Math.min(1, -amount));
  return '#' + color.getHexString();
}

function terrainHeight(x: number, z: number): number {
  const awayFromRoad = smoothstep(13, 36, Math.abs(x));
  const awayFromEnds = smoothstep(88, 122, Math.abs(z));
  const amplitude = Math.max(awayFromRoad, awayFromEnds * 0.92);
  const rolling =
    Math.sin(x * 0.055 + 1.3) * 0.9 +
    Math.sin(z * 0.047 - 0.8) * 0.7 +
    Math.sin((x + z) * 0.021) * 1.1;
  return Math.max(0, amplitude * (1.15 + rolling * 0.58));
}

const PRESETS = {
  drive: { position: [0, 6.4, 16.2], target: [0, 0.7, -1.5] },
  garage: { position: [0, 7.8, 10.8], target: [0, 0.8, -1.5] },
  size: { position: [0, 7.6, 11.0], target: [0, 0.9, -1.3] },
  pool: { position: [0, 9.2, 14.6], target: [0, 1.1, -1.4] },
  train: { position: [0, 6.8, 11.6], target: [0, 1.0, -1.8] },
} as const;

export class ThreeWorld implements World3D {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(52, 16 / 9, 0.1, 260);
  readonly renderer = new WebGLRenderer({ antialias: true, alpha: false });
  readonly roadCenterZ = 0;

  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly frameHandlers = new Set<FrameHandler>();
  private readonly pointerHandlers = new Set<PointerRayHandler>();
  private readonly gameObjects = new Set<Object3D>();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly clouds = new Group();
  private readonly tmpColor = new Color();
  private readonly tmpMatrix = new Matrix4();
  private readonly tmpQuaternion = new Quaternion();
  private readonly tmpEuler = new Euler();
  private animationId = 0;
  private lastTime = performance.now();
  private disposed = false;
  private contextLost = false;
  private cameraPreset: keyof typeof PRESETS = 'drive';
  private cameraTransition = 0;
  private previousCameraPosition: Vec3 = [0, 4.4, 10.2];
  private previousCameraTarget: Vec3 = [0, 1.1, -4];
  private currentCameraTarget: Vec3 = [0, 1.1, -4];
  private readonly sunLight: DirectionalLight;
  private readonly environment = {
    renderTarget: null as import('three').WebGLRenderTarget | null,
  };
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private qualityStep = 0;
  private qualitySampleFrames = 0;
  private qualitySampleStart = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.canvas.className = 'three-world__canvas';
    this.canvas.style.touchAction = 'none';
    this.camera.far = 420;
    this.scene.fog = new Fog('#d8ecfa', 48, 205);

    const hemisphere = new HemisphereLight(PALETTE.skylight, PALETTE.ground, 0.92);
    const sun = new DirectionalLight(PALETTE.sunlight, 2.3);
    this.sunLight = sun;
    sun.position.set(22, 31, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 95;
    sun.shadow.bias = -0.00012;
    sun.shadow.normalBias = 0.028;
    const bounce = new DirectionalLight(PALETTE.bounce, 0.58);
    bounce.position.set(-20, 14, -16);
    const ambient = new AmbientLight('#ffffff', 0.2);
    this.scene.add(hemisphere, sun, bounce, ambient);

    this.createSky();
    this.createTerrain();
    this.createStreet();
    this.createTown();
    this.createClouds();
    this.createEnvironmentMap();
    this.scene.add(this.clouds);
    this.container.append(this.canvas);
    this.resizeToContainer();
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.handleResize);
    this.animationId = requestAnimationFrame(this.tick);
  }

  add(...objects: Parameters<World3D['add']>): void {
    for (const object of objects) this.gameObjects.add(object);
    this.scene.add(...objects);
  }

  clearGameObjects(): void {
    if (!this.gameObjects.size) return;
    for (const object of [...this.gameObjects]) {
      if (!object.parent) {
        this.gameObjects.delete(object);
        continue;
      }
      object.removeFromParent();
      collectObjectDisposables(object).forEach((item) => item.dispose());
      this.gameObjects.delete(object);
    }
  }

  onUpdate(handler: FrameHandler): () => void {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  onPointerDown(handler: PointerRayHandler): () => void {
    this.pointerHandlers.add(handler);
    return () => this.pointerHandlers.delete(handler);
  }

  setCameraPreset(preset: CameraPresetName): void {
    if (this.reducedMotion) {
      this.cameraPreset = preset;
      this.cameraTransition = 0;
      this.applyCamera(true);
      return;
    }
    this.previousCameraPosition = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
    this.previousCameraTarget = [...this.currentCameraTarget];
    this.cameraPreset = preset;
    this.cameraTransition = 1;
  }

  resizeToContainer(): void {
    if (this.disposed || this.contextLost || !this.container.clientWidth || !this.container.clientHeight) return;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.applyCamera(false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    window.removeEventListener('resize', this.handleResize);
    this.frameHandlers.clear();
    this.pointerHandlers.clear();
    this.clearGameObjects();
    for (const item of this.disposables) item.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private createSky(): void {
    const skyGeometry = new SphereGeometry(240, 32, 18);
    const sunDirection = new Vector3(22, 31, 16).normalize();
    const skyMaterial = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new Color(PALETTE.skyTop) },
        midColor: { value: new Color(PALETTE.skyMid) },
        horizonColor: { value: new Color(PALETTE.skyHorizon) },
        sunDirection: { value: sunDirection },
        sunColor: { value: new Color(PALETTE.sunHalo) },
      },
      vertexShader: [
        'varying vec3 vDirection;',
        'void main() {',
        '  vDirection = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vDirection;',
        'uniform vec3 topColor;',
        'uniform vec3 midColor;',
        'uniform vec3 horizonColor;',
        'uniform vec3 sunDirection;',
        'uniform vec3 sunColor;',
        'void main() {',
        '  vec3 dir = normalize(vDirection);',
        '  vec3 color = mix(horizonColor, midColor, smoothstep(-0.02, 0.18, dir.y));',
        '  color = mix(color, topColor, smoothstep(0.16, 0.62, dir.y));',
        '  float alignment = max(dot(dir, normalize(sunDirection)), 0.0);',
        '  color += sunColor * (pow(alignment, 14.0) * 0.24 + pow(alignment, 420.0) * 0.58);',
        '  gl_FragColor = vec4(color, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}',
      ].join('\n'),
    });
    const sky = new Mesh(skyGeometry, skyMaterial);
    sky.userData.isWorldSky = true;
    sky.renderOrder = -2;
    sky.frustumCulled = false;

    this.scene.add(sky);
    this.disposables.push(skyGeometry, skyMaterial);
  }

  private createEnvironmentMap(): void {
    const sky = this.scene.children.find((child) => child.userData.isWorldSky);
    if (!sky) return;
    const sourceScene = new Scene();
    this.scene.remove(sky);
    sourceScene.add(sky);
    const generator = new PMREMGenerator(this.renderer);
    const renderTarget = generator.fromScene(sourceScene, 0, 0.1, 300);
    sourceScene.clear();
    generator.dispose();
    this.scene.add(sky);
    this.environment.renderTarget = renderTarget;
    this.scene.environment = renderTarget.texture;
    this.disposables.push(renderTarget, {
      dispose: () => {
        this.scene.environment = null;
      },
    });
  }

  private createSurfaceTexture(kind: 'grass' | 'asphalt' | 'concrete'): CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    if (kind === 'grass') {
      const rng = mulberry32(20260825);
      ctx.fillStyle = PALETTE.grassA;
      ctx.fillRect(0, 0, size, size);
      const patchTones = ['#6cb75d', '#7ec76b', '#58a752', '#8ed07a', '#a3cd68'];
      for (let index = 0; index < 22; index++) {
        ctx.fillStyle = patchTones[Math.floor(rng() * patchTones.length)] ?? PALETTE.grassA;
        ctx.globalAlpha = 0.16 + rng() * 0.18;
        const radius = 12 + rng() * 26;
        ctx.beginPath();
        ctx.arc(rng() * size, rng() * size, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      const bladeTones = ['#69b558', '#79c467', '#549e4f', '#86cc72'];
      for (let index = 0; index < 320; index++) {
        ctx.fillStyle = bladeTones[Math.floor(rng() * bladeTones.length)] ?? PALETTE.grassA;
        ctx.globalAlpha = 0.06 + rng() * 0.12;
        const radius = 0.8 + rng() * 2.4;
        ctx.beginPath();
        ctx.arc(rng() * size, rng() * size, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const rng = mulberry32(kind === 'asphalt' ? 20260826 : 20260827);
      ctx.fillStyle = kind === 'asphalt' ? PALETTE.road : PALETTE.sidewalk;
      ctx.fillRect(0, 0, size, size);
      const speckle = kind === 'asphalt' ? ['#5a6572', '#47525d', '#616d7a'] : ['#dde4e8', '#f2f5f7', '#d5dde1'];
      for (let index = 0; index < 1300; index++) {
        ctx.fillStyle = speckle[Math.floor(rng() * speckle.length)] ?? '#808080';
        ctx.globalAlpha = 0.05 + rng() * 0.1;
        ctx.fillRect(rng() * size, rng() * size, 1.6, 1.6);
      }
      if (kind === 'concrete') {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = '#c3ccd1';
        ctx.lineWidth = 1.5;
        for (let offset = 0; offset <= size; offset += 32) {
          ctx.beginPath();
          ctx.moveTo(offset, 0);
          ctx.lineTo(offset, size);
          ctx.moveTo(0, offset);
          ctx.lineTo(size, offset);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  private createTerrain(): void {
    const grassTexture = this.createSurfaceTexture('grass');
    grassTexture.repeat.set(42, 34);
    const groundGeometry = new PlaneGeometry(330, 270, 76, 60);
    groundGeometry.rotateX(-Math.PI / 2);
    const positions = groundGeometry.attributes.position;
    if (!positions) throw new Error('Terrain position attribute unavailable');
    const colors: number[] = [];
    const colorA = new Color(PALETTE.grassA);
    const colorB = new Color(PALETTE.grassB);
    const dry = new Color(PALETTE.grassDry);
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const height = terrainHeight(x, z);
      positions.setY(index, height - 0.04);
      const patch = Math.sin(x * 0.11) * Math.sin(z * 0.13) * 0.5 + 0.5;
      const macroPatch = Math.sin(x * 0.031 + z * 0.024) * Math.sin(x * 0.017 - z * 0.028) * 0.5 + 0.5;
      const color = colorA.clone().lerp(colorB, patch);
      color.lerp(dry, macroPatch * 0.18);
      if (height > 1.4) color.lerp(dry, Math.min(0.55, (height - 1.4) / 2.4));
      colors.push(color.r, color.g, color.b);
    }
    groundGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    groundGeometry.computeVertexNormals();
    const groundMaterial = new MeshStandardMaterial({
      map: grassTexture,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.disposables.push(groundGeometry, groundMaterial, grassTexture);
  }

  private createStreet(): void {
    const asphalt = this.createSurfaceTexture('asphalt');
    asphalt.repeat.set(3, 42);
    const roadGeometry = new PlaneGeometry(12.2, 218);
    const roadMaterial = new MeshStandardMaterial({ map: asphalt, roughness: 0.74, metalness: 0.04 });
    const road = new Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;

    const concrete = this.createSurfaceTexture('concrete');
    concrete.repeat.set(2, 56);
    const sidewalkGeometry = new PlaneGeometry(3.7, 212);
    const sidewalkMaterial = new MeshStandardMaterial({ map: concrete, roughness: 0.86 });
    const curbGeometry = new BoxGeometry(0.28, 0.24, 212);
    const curbMaterial = new MeshStandardMaterial({ color: PALETTE.curb, roughness: 0.7 });
    const sidewalks: Mesh[] = [];
    for (const side of [-1, 1]) {
      const sidewalk = new Mesh(sidewalkGeometry, sidewalkMaterial);
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(side * 7.95, 0.09, 0);
      sidewalk.receiveShadow = true;
      const curb = new Mesh(curbGeometry, curbMaterial);
      curb.position.set(side * 6.24, 0.12, 0);
      curb.receiveShadow = true;
      sidewalks.push(sidewalk, curb);
    }

    const dashGeometry = new PlaneGeometry(0.34, 3.2);
    dashGeometry.rotateX(-Math.PI / 2);
    const dashes: InstanceItem[] = [];
    for (let z = -104; z <= 104; z += 8) dashes.push({ p: [0, 0.012, z], s: [1, 1, 1] });
    const dashMaterial = new MeshStandardMaterial({ color: PALETTE.lane, roughness: 0.6 });

    const zebraGeometry = new PlaneGeometry(10.8, 0.7);
    zebraGeometry.rotateX(-Math.PI / 2);
    const zebras: InstanceItem[] = [];
    for (const centerZ of [-26, 26]) {
      for (let index = 0; index < 6; index++) {
        zebras.push({ p: [0, 0.015, centerZ - 3 + index * 1.2], s: [1, 1, 1] });
      }
    }
    const zebraMaterial = new MeshStandardMaterial({ color: '#fbfdff', roughness: 0.72 });

    const postGeometry = new BoxGeometry(0.14, 0.8, 0.14);
    const beamGeometry = new BoxGeometry(0.08, 0.2, 212);
    const railPosts: InstanceItem[] = [];
    for (let z = -102; z <= 102; z += 4) {
      railPosts.push({ p: [-9.6, 0.42, z], s: [1, 1, 1] });
      railPosts.push({ p: [9.6, 0.42, z], s: [1, 1, 1] });
    }
    const railMaterial = new MeshStandardMaterial({ color: PALETTE.rail, metalness: 0.35, roughness: 0.38 });
    const railBeams: Mesh[] = [];
    for (const x of [-9.6, 9.6]) {
      const beam = new Mesh(beamGeometry, railMaterial);
      beam.position.set(x, 0.98, 0);
      railBeams.push(beam);
    }

    const lampPostGeometry = new CylinderGeometry(0.07, 0.1, 4.2, 10);
    const lampArmGeometry = new BoxGeometry(0.9, 0.08, 0.08);
    const bulbGeometry = new SphereGeometry(0.17, 14, 12);
    const lampMetal = new MeshStandardMaterial({ color: '#78909c', metalness: 0.38, roughness: 0.32 });
    const bulbMaterial = new MeshStandardMaterial({
      color: '#fff59d',
      emissive: '#fff176',
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    const lampPosts: InstanceItem[] = [];
    const lampArms: InstanceItem[] = [];
    const bulbs: InstanceItem[] = [];
    for (let index = 0; index < 8; index++) {
      const zLeft = -88 + index * 24;
      const zRight = zLeft + 12;
      lampPosts.push({ p: [-7.4, 2.1, zLeft], s: [1, 1, 1] });
      lampArms.push({ p: [-6.95, 4.15, zLeft], s: [1, 1, 1] });
      bulbs.push({ p: [-6.55, 4.06, zLeft], s: [1, 1, 1] });
      lampPosts.push({ p: [7.4, 2.1, zRight], s: [1, 1, 1] });
      lampArms.push({ p: [6.95, 4.15, zRight], ry: Math.PI, s: [1, 1, 1] });
      bulbs.push({ p: [6.55, 4.06, zRight], s: [1, 1, 1] });
    }

    const hydrantGeometry = new CylinderGeometry(0.19, 0.23, 0.58, 12);
    const hydrantCapGeometry = new SphereGeometry(0.2, 14, 12);
    const hydrantMaterial = new MeshStandardMaterial({ color: '#ef5350', roughness: 0.32 });
    const benchSeatGeometry = new BoxGeometry(1.6, 0.11, 0.48);
    const benchLegGeometry = new BoxGeometry(0.11, 0.4, 0.42);
    const woodMaterial = new MeshStandardMaterial({ color: '#a1887f', roughness: 0.66 });
    const benchMetal = new MeshStandardMaterial({ color: '#607d8b', metalness: 0.28, roughness: 0.4 });
    const decorations = new Group();
    for (let index = 0; index < 7; index++) {
      const z = -84 + index * 26;
      const hydrantSide = index % 2 === 0 ? -1 : 1;
      const hydrant = new Mesh(hydrantGeometry, hydrantMaterial);
      hydrant.position.set(hydrantSide * 7.1, 0.38, z);
      const cap = new Mesh(hydrantCapGeometry, hydrantMaterial);
      cap.position.set(hydrantSide * 7.1, 0.7, z);
      decorations.add(hydrant, cap);
      const bench = new Group();
      const seat = new Mesh(benchSeatGeometry, woodMaterial);
      seat.position.y = 0.55;
      bench.add(seat);
      for (const bx of [-0.66, 0.66]) {
        const leg = new Mesh(benchLegGeometry, benchMetal);
        leg.position.set(bx, 0.29, 0);
        bench.add(leg);
      }
      bench.position.set(-hydrantSide * 8.4, 0.18, z + 8);
      bench.rotation.y = -hydrantSide * Math.PI * 0.5;
      decorations.add(bench);
    }

    this.scene.add(road, ...sidewalks, ...railBeams, decorations);
    this.buildInstanced(dashGeometry, dashMaterial, dashes, { receive: false });
    this.buildInstanced(zebraGeometry, zebraMaterial, zebras, { receive: false });
    this.buildInstanced(postGeometry, railMaterial, railPosts, { cast: false, receive: true });
    this.buildInstanced(lampPostGeometry, lampMetal, lampPosts, { cast: true, receive: false });
    this.buildInstanced(lampArmGeometry, lampMetal, lampArms, { cast: true, receive: false });
    this.buildInstanced(bulbGeometry, bulbMaterial, bulbs, {});
    this.disposables.push(
      roadGeometry,
      roadMaterial,
      asphalt,
      sidewalkGeometry,
      sidewalkMaterial,
      concrete,
      curbGeometry,
      curbMaterial,
      dashGeometry,
      dashMaterial,
      zebraGeometry,
      zebraMaterial,
      postGeometry,
      beamGeometry,
      railMaterial,
      lampPostGeometry,
      lampArmGeometry,
      bulbGeometry,
      lampMetal,
      bulbMaterial,
      hydrantGeometry,
      hydrantCapGeometry,
      hydrantMaterial,
      benchSeatGeometry,
      benchLegGeometry,
      woodMaterial,
      benchMetal,
    );
  }

  private createTown(): void {
    const rng = mulberry32(20260824);
    const boxes: InstanceItem[] = [];
    const cones: InstanceItem[] = [];
    const glass: InstanceItem[] = [];
    const doors: InstanceItem[] = [];

    const addBuilding = (
      kind: 'house' | 'shop' | 'tower',
      x: number,
      z: number,
      baseY: number,
      ry: number,
    ): void => {
      const width = kind === 'tower' ? 6 + rng() * 3 : 4.5 + rng() * 2.5;
      const depth = kind === 'house' ? 4.5 + rng() * 1.5 : width * 0.78;
      const height = kind === 'house' ? 3 + rng() * 1.2 : kind === 'shop' ? 4.5 + rng() * 1.5 : 8 + rng() * 5;
      const bodyColor = BODY_COLORS[Math.floor(rng() * BODY_COLORS.length)] ?? '#fdf6ec';
      const bodyTint = 1 + (rng() - 0.5) * 0.14;
      const tintedBody = shadeColor(bodyColor, (bodyTint - 1) * 3.2);
      const roofShade = -rng() * 0.18;
      const forwardX = Math.sin(ry);
      const forwardZ = Math.cos(ry);
      const rightX = Math.cos(ry);
      const rightZ = -Math.sin(ry);

      boxes.push({ p: [x, baseY + height / 2, z], ry, s: [width, height, depth], color: tintedBody });

      if (kind === 'house') {
        const roofHeight = 1.6 + rng() * 0.9;
        const roofRadius = Math.max(width, depth) * 0.72;
        const roofColor = shadeColor(ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)] ?? '#e2574d', roofShade);
        cones.push({
          p: [x, baseY + height + roofHeight / 2 - 0.04, z],
          ry: ry + Math.PI / 4,
          s: [roofRadius, roofHeight, roofRadius],
          color: roofColor,
        });
        const chimneyOffset = (rng() - 0.5) * width * 0.4;
        boxes.push({
          p: [x + rightX * chimneyOffset + forwardX * depth * 0.18, baseY + height + roofHeight * 0.72, z + rightZ * chimneyOffset + forwardZ * depth * 0.18],
          ry,
          s: [0.42, 0.9, 0.42],
          color: '#cdd6da',
        });
        doors.push({ p: [x + forwardX * (depth / 2 + 0.03), baseY + 1.05, z + forwardZ * (depth / 2 + 0.03)], ry, s: [1.1, 2.1, 1] });
        for (const offset of [-width * 0.26, width * 0.26]) {
          glass.push({
            p: [x + rightX * offset + forwardX * (depth / 2 + 0.04), baseY + 1.9, z + rightZ * offset + forwardZ * (depth / 2 + 0.04)],
            ry,
            s: [0.95, 1.05, 1],
            color: GLASS_TINTS[Math.floor(rng() * GLASS_TINTS.length)],
          });
        }
        return;
      }

      boxes.push({ p: [x, baseY + height + 0.16, z], ry, s: [width + 0.3, 0.34, depth + 0.3], color: shadeColor('#e6ebef', (rng() - 0.5) * 0.08) });
      doors.push({ p: [x + forwardX * (depth / 2 + 0.03), baseY + 1.1, z + forwardZ * (depth / 2 + 0.03)], ry, s: [1.4, 2.2, 1] });
      if (kind === 'shop') {
        const accent = ACCENT_COLORS[Math.floor(rng() * ACCENT_COLORS.length)] ?? '#ffc94d';
        const shadedAccent = shadeColor(accent, (rng() - 0.5) * 0.12);
        boxes.push({
          p: [x + forwardX * (depth / 2 + 0.55), baseY + 2.75, z + forwardZ * (depth / 2 + 0.55)],
          ry,
          s: [width * 0.84, 0.12, 1.5],
          color: shadedAccent,
        });
        boxes.push({
          p: [x + forwardX * (depth / 2 + 0.06), baseY + 3.5, z + forwardZ * (depth / 2 + 0.06)],
          ry,
          s: [width * 0.72, 0.62, 0.08],
          color: shadedAccent,
        });
        for (const offset of [-width * 0.3, 0, width * 0.3]) {
          glass.push({
            p: [x + rightX * offset + forwardX * (depth / 2 + 0.04), baseY + 2.1, z + rightZ * offset + forwardZ * (depth / 2 + 0.04)],
            ry,
            s: [1.15, 1.35, 1],
            color: GLASS_TINTS[Math.floor(rng() * GLASS_TINTS.length)],
          });
        }
        return;
      }

      const columns = 3;
      const rows = Math.max(2, Math.floor(height / 2.5));
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const offsetX = (column - (columns - 1) / 2) * (width / (columns + 0.6));
          glass.push({
            p: [x + rightX * offsetX + forwardX * (depth / 2 + 0.04), baseY + 1.5 + row * 2.3, z + rightZ * offsetX + forwardZ * (depth / 2 + 0.04)],
            ry,
            s: [0.85, 1.2, 1],
            color: GLASS_TINTS[Math.floor(rng() * GLASS_TINTS.length)],
          });
        }
      }
    };

    for (const side of [-1, 1]) {
      let z = -92;
      while (z < 92) {
        if (rng() < 0.82) {
          const roll = rng();
          const kind = roll < 0.48 ? 'house' : roll < 0.82 ? 'shop' : 'tower';
          const previewDepth = kind === 'house' ? 5 : 4.4;
          const distance = 13.5 + rng() * 7 + (kind === 'tower' ? 3.5 : 0);
          addBuilding(kind, side * distance, z + previewDepth / 2, -0.08, (side < 0 ? -Math.PI / 2 : Math.PI / 2) + (rng() - 0.5) * 0.07);
        }
        z += 9 + rng() * 7;
      }
    }

    for (let index = 0; index < 9; index++) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (30 + rng() * 9);
      const z = -105 + rng() * 210;
      addBuilding('house', x, z, terrainHeight(x, z) - 0.25, (side < 0 ? -Math.PI / 2 : Math.PI / 2) + (rng() - 0.5) * 0.2);
    }

    const trunkGeometry = new CylinderGeometry(0.16, 0.25, 1, 8);
    trunkGeometry.translate(0, 0.5, 0);
    const canopyGeometry = new SphereGeometry(1, 14, 11);
    const trunks: InstanceItem[] = [];
    const canopies: InstanceItem[] = [];
    const addTree = (x: number, y: number, z: number, scale: number): void => {
      const trunkHeight = (1.5 + rng() * 0.9) * scale;
      const radiusFactor = (0.9 + rng() * 0.25) * scale;
      trunks.push({ p: [x, y, z], ry: rng() * Math.PI * 2, s: [radiusFactor, trunkHeight, radiusFactor], color: PALETTE.trunk });
      const baseLeaf = LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)] ?? '#4caf50';
      const leafColor = shadeColor(baseLeaf, (rng() - 0.5) * 0.22);
      const mainSize = (1 + rng() * 0.5) * scale;
      canopies.push({
        p: [x, y + trunkHeight + mainSize * 0.45, z],
        ry: rng() * Math.PI,
        s: [mainSize, mainSize * 0.92, mainSize],
        color: leafColor,
      });
      const topSize = mainSize * 0.62;
      canopies.push({
        p: [x + (rng() - 0.5) * 0.3, y + trunkHeight + mainSize * 1.05, z + (rng() - 0.5) * 0.3],
        ry: rng() * Math.PI,
        s: [topSize, topSize * 0.9, topSize],
        color: leafColor,
      });
    };
    for (const side of [-1, 1]) {
      for (let z = -94; z <= 94; z += 16 + rng() * 7) {
        addTree(side * (8.7 + rng() * 1.5), 0.05, z, 0.9 + rng() * 0.3);
      }
    }
    for (let index = 0; index < 46; index++) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (31 + rng() * 16);
      const z = -118 + rng() * 236;
      addTree(x, terrainHeight(x, z) - 0.12, z, 1 + rng() * 0.7);
    }

    const bushGeometry = new SphereGeometry(1, 12, 9);
    const bushes: InstanceItem[] = [];
    for (let index = 0; index < 26; index++) {
      const side = index % 2 === 0 ? -1 : 1;
      const sx = 0.75 + rng() * 0.7;
      const sy = 0.48 + rng() * 0.28;
      bushes.push({
        p: [side * (7.35 + rng() * 1.1), 0.18 + sy * 0.55, -96 + rng() * 192],
        ry: rng() * Math.PI,
        s: [sx, sy, sx],
        color: shadeColor(LEAF_COLORS[Math.floor(rng() * LEAF_COLORS.length)] ?? '#4caf50', (rng() - 0.5) * 0.2),
      });
    }

    const stemGeometry = new CylinderGeometry(0.028, 0.032, 1, 6);
    stemGeometry.translate(0, 0.5, 0);
    const headGeometry = new SphereGeometry(0.09, 10, 8);
    const stems: InstanceItem[] = [];
    const heads: InstanceItem[] = [];
    for (let index = 0; index < 56; index++) {
      const side = index % 2 === 0 ? -1 : 1;
      const x = side * (6.75 + rng() * 0.8);
      const z = -98 + rng() * 196;
      const stemLength = 0.3 + rng() * 0.22;
      stems.push({ p: [x, 0.19, z], s: [1, stemLength, 1], color: '#4c8c3f' });
      heads.push({
        p: [x, 0.19 + stemLength + 0.05, z],
        s: [1, 1, 1],
        color: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
      });
    }

    const boxGeometry = new BoxGeometry(1, 1, 1);
    const roofGeometry = new ConeGeometry(1, 1, 4);
    const paneGeometry = new PlaneGeometry(1, 1);
    const buildingMaterial = new MeshStandardMaterial({ roughness: 0.62, metalness: 0.02 });
    const roofMaterial = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.03 });
    const glassMaterial = new MeshStandardMaterial({
      color: '#dff1ff',
      roughness: 0.16,
      metalness: 0.1,
      emissive: '#9fd8ff',
      emissiveIntensity: 0.14,
    });
    const doorMaterial = new MeshStandardMaterial({ color: '#4a3f35', roughness: 0.5 });
    const trunkMaterial = new MeshStandardMaterial({ roughness: 0.85 });
    const canopyMaterial = new MeshStandardMaterial({ roughness: 0.68, flatShading: true });
    const bushMaterial = new MeshStandardMaterial({ roughness: 0.72, flatShading: true });
    const stemMaterial = new MeshStandardMaterial({ roughness: 0.8 });
    const headMaterial = new MeshStandardMaterial({ roughness: 0.42 });

    this.buildInstanced(boxGeometry, buildingMaterial, boxes, { cast: true, receive: true });
    this.buildInstanced(roofGeometry, roofMaterial, cones, { cast: true, receive: false });
    this.buildInstanced(paneGeometry, glassMaterial, glass, {});
    this.buildInstanced(paneGeometry, doorMaterial, doors, {});
    this.buildInstanced(trunkGeometry, trunkMaterial, trunks, { cast: true, receive: false });
    this.buildInstanced(canopyGeometry, canopyMaterial, canopies, { cast: true, receive: false });
    this.buildInstanced(bushGeometry, bushMaterial, bushes, { cast: false, receive: true });
    this.buildInstanced(stemGeometry, stemMaterial, stems, { cast: false, receive: false });
    this.buildInstanced(headGeometry, headMaterial, heads, { cast: false, receive: false });
    this.disposables.push(
      boxGeometry,
      roofGeometry,
      paneGeometry,
      trunkGeometry,
      canopyGeometry,
      bushGeometry,
      stemGeometry,
      headGeometry,
      buildingMaterial,
      roofMaterial,
      glassMaterial,
      doorMaterial,
      trunkMaterial,
      canopyMaterial,
      bushMaterial,
      stemMaterial,
      headMaterial,
    );
  }

  private createClouds(): void {
    const puffGeometry = new SphereGeometry(1, 14, 11);
    const cloudMaterial = new MeshStandardMaterial({ color: PALETTE.cloud, roughness: 0.96, metalness: 0 });
    const cloudShadeMaterial = new MeshStandardMaterial({ color: '#e6f2fb', roughness: 0.98, metalness: 0 });
    const rng = mulberry32(777);
    for (let index = 0; index < 11; index++) {
      const cloud = new Group();
      const puffCount = 3 + Math.floor(rng() * 3);
      for (let puffIndex = 0; puffIndex < puffCount; puffIndex++) {
        const isShade = puffIndex % 3 === 2 || rng() < 0.22;
        const puff = new Mesh(puffGeometry, isShade ? cloudShadeMaterial : cloudMaterial);
        const scale = 1 + rng() * 1.4;
        puff.position.set(
          (puffIndex - puffCount / 2) * 1.7 + (rng() - 0.5),
          (rng() - 0.5) * 0.5,
          (rng() - 0.5) * 0.9,
        );
        puff.scale.set(scale, scale * 0.68, scale * 0.86);
        cloud.add(puff);
      }
      cloud.position.set(-135 + rng() * 270, 22 + rng() * 15, -65 - rng() * 85);
      cloud.userData.isEnvironment = true;
      cloud.userData.driftSpeed = 0.28 + rng() * 0.42;
      this.clouds.add(cloud);
    }
    this.scene.add(this.clouds);
    this.disposables.push(puffGeometry, cloudMaterial, cloudShadeMaterial);
  }

  private buildInstanced(
    geometry: BufferGeometry,
    material: Material,
    items: readonly InstanceItem[],
    options: { cast?: boolean; receive?: boolean } = {},
  ): void {
    if (!items.length) return;
    const mesh = new InstancedMesh(geometry, material, items.length);
    items.forEach((item, index) => {
      this.tmpQuaternion.setFromEuler(this.tmpEuler.set(0, item.ry ?? 0, 0));
      this.tmpMatrix.compose(new Vector3(...item.p), this.tmpQuaternion, new Vector3(...item.s));
      mesh.setMatrixAt(index, this.tmpMatrix);
      if (item.color) mesh.setColorAt(index, this.tmpColor.set(item.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = options.cast === true;
    mesh.receiveShadow = options.receive === true;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.disposables.push(mesh, geometry, material);
  }

  private applyCamera(instant: boolean): void {
    const preset = PRESETS[this.cameraPreset];
    const aspectScale = Math.max(0.66, Math.min(1.28, 1.58 / this.camera.aspect));
    const [x, y, z] = preset.position;
    const nextZ = z * aspectScale;
    const target: Vec3 = [preset.target[0]!, preset.target[1]!, preset.target[2]!];
    if (instant) {
      this.camera.position.set(x, y, nextZ);
      this.camera.lookAt(target[0]!, target[1]!, target[2]!);
    } else {
      this.camera.position.z = nextZ;
      this.camera.lookAt(this.currentCameraTarget[0]!, this.currentCameraTarget[1]!, this.currentCameraTarget[2]!);
    }
    this.currentCameraTarget = target;
    if (instant) this.cameraTransition = 0;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const handler of [...this.pointerHandlers]) handler(event, this.raycaster);
  };

  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.canvas.classList.add('is-context-lost');
    this.container.classList.add('is-context-lost');
  };

  private handleContextRestored = (): void => {
    this.contextLost = false;
    this.renderer.resetState();
    this.canvas.classList.remove('is-context-lost');
    this.container.classList.remove('is-context-lost');
    this.resizeToContainer();
  };

  private handleResize = (): void => this.resizeToContainer();

  private tick = (time: number): void => {
    if (this.disposed) return;
    if (this.contextLost) {
      this.animationId = requestAnimationFrame(this.tick);
      return;
    }
    const delta = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    const elapsed = time / 1000;
    this.updateAmbient(elapsed, delta);
    for (const handler of [...this.frameHandlers]) handler(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
    this.updateAdaptiveQuality(time);
    this.animationId = requestAnimationFrame(this.tick);
  };

  private updateAdaptiveQuality(time: number): void {
    if (this.contextLost) return;
    this.qualitySampleFrames += 1;
    const elapsed = time - this.qualitySampleStart;
    if (elapsed < 2200) return;
    const fps = this.qualitySampleFrames * 1000 / elapsed;
    this.qualitySampleFrames = 0;
    this.qualitySampleStart = time;
    if (fps >= 40 || this.qualityStep >= 2) return;
    this.qualityStep += 1;
    const ratio = this.qualityStep === 1 ? 1.25 : 1;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    if (this.qualityStep === 2) {
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    }
  }

  private updateAmbient(_elapsed: number, delta: number): void {
    if (!this.reducedMotion) {
      for (const cloud of this.clouds.children) {
        cloud.position.x += cloud.userData.driftSpeed * delta;
        if (cloud.position.x > 110) cloud.position.x = -110;
      }
    }
    if (this.cameraTransition > 0) {
      this.cameraTransition = Math.max(0, this.cameraTransition - delta * 1.6);
      const t = 1 - this.cameraTransition;
      const preset = PRESETS[this.cameraPreset];
      const aspectScale = Math.max(0.66, Math.min(1.28, 1.58 / this.camera.aspect));
      const from = this.previousCameraPosition;
      const to: Vec3 = [preset.position[0]!, preset.position[1]!, preset.position[2]! * aspectScale];
      this.camera.position.set(
        from[0]! + (to[0]! - from[0]!) * t,
        from[1]! + (to[1]! - from[1]!) * t,
        from[2]! + (to[2]! - from[2]!) * t,
      );
      const target = preset.target;
      this.currentCameraTarget = [target[0]!, target[1]!, target[2]!];
      const fromTarget = this.previousCameraTarget;
      this.camera.lookAt(
        fromTarget[0]! + (this.currentCameraTarget[0]! - fromTarget[0]!) * t,
        fromTarget[1]! + (this.currentCameraTarget[1]! - fromTarget[1]!) * t,
        fromTarget[2]! + (this.currentCameraTarget[2]! - fromTarget[2]!) * t,
      );
      if (this.cameraTransition === 0) this.applyCamera(true);
    }
  }
}

function collectObjectDisposables(root: Object3D): Array<{ dispose(): void }> {
  const found: Array<{ dispose(): void }> = [];
  root.traverse((child: Object3D) => {
    const candidate = child as Partial<Record<'geometry' | 'material', unknown>>;
    const geometry = candidate.geometry;
    if (geometry && typeof (geometry as { dispose?: unknown }).dispose === 'function') {
      found.push(geometry as { dispose(): void });
    }
    const material = candidate.material;
    if (Array.isArray(material)) {
      for (const item of material) {
        if (item && typeof (item as { dispose?: unknown }).dispose === 'function') found.push(item as { dispose(): void });
      }
    } else if (material && typeof (material as { dispose?: unknown }).dispose === 'function') {
      found.push(material as { dispose(): void });
    }
    const disposableChild = child as Partial<Record<'dispose', unknown>>;
    if (disposableChild.dispose && typeof disposableChild.dispose === 'function') found.push(child as unknown as { dispose(): void });
  });
  return found;
}
