import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import type { CameraPresetName, FrameHandler, PointerRayHandler, World3D } from './contracts';

type Vec3 = [number, number, number];

const PRESETS = {
  drive: { position: [0, 4.4, 10.2], target: [0, 1.1, -4] },
  garage: { position: [0, 7.8, 10.8], target: [0, 0.8, -1.5] },
  size: { position: [0, 7.6, 11.0], target: [0, 0.9, -1.3] },
  pool: { position: [0, 7.6, 11.4], target: [0, 1.2, -1.2] },
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
  private readonly roadProps = new Group();
  private readonly clouds = new Group();
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
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private qualityStep = 0;
  private qualitySampleFrames = 0;
  private qualitySampleStart = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.canvas.className = 'three-world__canvas';
    this.canvas.style.touchAction = 'none';
    this.scene.background = new Color('#8ed8ff');
    this.scene.fog = new Fog('#d8f2ff', 34, 130);

    const hemisphere = new HemisphereLight('#eaffff', '#6fae5c', 1.1);
    const sun = new DirectionalLight('#fff4d6', 2.4);
    this.sunLight = sun;
    sun.position.set(14, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 26;
    sun.shadow.camera.bottom = -26;
    sun.shadow.bias = -0.0004;
    const ambient = new AmbientLight('#ffffff', 0.2);
    this.scene.add(hemisphere, sun, ambient);

    this.createSkyAndGround();
    this.createRoad();
    this.scene.add(this.roadProps, this.clouds);
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

  private createSkyAndGround(): void {
    const skyGeometry = new BoxGeometry(300, 140, 300);
    const skyMaterial = new MeshPhysicalMaterial({
      color: '#7fd2ff',
      side: BackSide,
      roughness: 1,
      metalness: 0,
    });
    const sky = new Mesh(skyGeometry, skyMaterial);
    sky.position.y = 38;
    const groundGeometry = new PlaneGeometry(280, 220, 48, 40);
    const groundMaterial = new MeshPhysicalMaterial({
      color: '#7cb96a',
      roughness: 0.86,
      metalness: 0.02,
      clearcoat: 0.08,
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.scene.add(sky, ground);
    this.disposables.push(skyGeometry, skyMaterial, groundGeometry, groundMaterial);

    // Layered clouds with subtle animation.
    const cloudMaterial = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.94, clearcoat: 0.1 });
    const puffGeometry = new SphereGeometry(1, 18, 16);
    for (let index = 0; index < 14; index++) {
      const cloud = new Group();
      const puffCount = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const puff = new Mesh(puffGeometry, cloudMaterial);
        const scale = 0.8 + Math.random() * 1.1;
        puff.position.set((p - puffCount / 2) * 1.5 + Math.random() * 0.6, Math.random() * 0.55, Math.random() * 0.8);
        puff.scale.setScalar(scale);
        cloud.add(puff);
      }
      cloud.position.set(-90 + Math.random() * 180, 24 + Math.random() * 14, -110 + Math.random() * 90);
      cloud.userData.isEnvironment = true;
      cloud.userData.driftSpeed = 0.35 + Math.random() * 0.5;
      this.clouds.add(cloud);
    }

    const trunkGeometry = new CylinderGeometry(0.17, 0.26, 1.7, 10);
    const trunkMaterial = new MeshPhysicalMaterial({ color: '#7a5443', roughness: 0.8 });
    const leafGeometry = new SphereGeometry(1.05, 18, 16);
    const leafMaterials = ['#4caf50', '#3d9142', '#5fb963', '#2f8f4e'].map(
      (color) => new MeshPhysicalMaterial({ color, roughness: 0.62, clearcoat: 0.12 }),
    );
    for (let index = 0; index < 52; index++) {
      const tree = new Group();
      const trunk = new Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.85;
      tree.add(trunk);
      const leaves = new Mesh(leafGeometry, leafMaterials[index % leafMaterials.length]!);
      leaves.position.y = 2.3;
      const leafScale = 0.9 + Math.random() * 0.75;
      leaves.scale.set(leafScale, leafScale * 0.95, leafScale);
      leaves.castShadow = true;
      tree.add(leaves);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distanceFromRoad = 8 + Math.random() * 32;
      tree.position.set(side * distanceFromRoad, 0, -100 + Math.random() * 200);
      tree.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(tree);
    }

    const buildingColors = ['#f4f6f8', '#dfe6ea', '#ffe3c2', '#d9cdea', '#c4ece4', '#f7d6e0'];
    for (let index = 0; index < 26; index++) {
      const width = 3 + Math.random() * 4;
      const height = 5 + Math.random() * 12;
      const depth = 3 + Math.random() * 3.6;
      const geometry = new BoxGeometry(width, height, depth);
      const material = new MeshPhysicalMaterial({
        color: buildingColors[index % buildingColors.length]!,
        roughness: 0.52,
        metalness: 0.05,
        clearcoat: 0.18,
      });
      const building = new Mesh(geometry, material);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distanceFromRoad = 19 + Math.random() * 34;
      building.position.set(side * distanceFromRoad, height / 2, -100 + Math.random() * 200);
      building.rotation.y = Math.random() * 0.3 - 0.15;
      building.receiveShadow = true;
      this.scene.add(building);
    }

    const railPostGeometry = new BoxGeometry(0.15, 0.78, 0.15);
    const railBeamGeometry = new BoxGeometry(0.09, 0.22, 200);
    const railMaterial = new MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.4, roughness: 0.36 });
    for (const x of [-6.1, 6.1]) {
      const beam = new Mesh(railBeamGeometry, railMaterial);
      beam.position.set(x!, 0.7, 0);
      this.scene.add(beam);
      for (let z = -98; z <= 98; z += 4.2) {
        const post = new Mesh(railPostGeometry, railMaterial);
        post.position.set(x!, 0.38, z);
        this.scene.add(post);
      }
    }
    this.disposables.push(puffGeometry, cloudMaterial, trunkGeometry, trunkMaterial, leafGeometry, ...leafMaterials, railPostGeometry, railBeamGeometry, railMaterial);
  }

  private createRoad(): void {
    const roadGeometry = new PlaneGeometry(12.2, 220, 4, 80);
    const roadMaterial = new MeshPhysicalMaterial({
      color: '#5d6873',
      roughness: 0.62,
      metalness: 0.06,
      clearcoat: 0.12,
      clearcoatRoughness: 0.4,
    });
    const road = new Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    const stripeGeometry = new PlaneGeometry(0.34, 3.4);
    const stripeMaterial = new MeshPhysicalMaterial({ color: '#f8fbff', roughness: 0.5 });
    const stripes = new Group();
    for (let z = -100; z <= 100; z += 7.4) {
      const stripe = new Mesh(stripeGeometry, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.012, z);
      stripes.add(stripe);
    }
    this.scene.add(road, stripes);
    this.disposables.push(roadGeometry, roadMaterial, stripeGeometry, stripeMaterial);

    const hydrantGeometry = new CylinderGeometry(0.19, 0.23, 0.58, 14);
    const hydrantCapGeometry = new SphereGeometry(0.2, 16, 16);
    const hydrantMaterial = new MeshStandardMaterial({ color: '#ef5350', roughness: 0.32 });
    const benchSeatGeometry = new BoxGeometry(1.6, 0.11, 0.48);
    const benchLegGeometry = new BoxGeometry(0.11, 0.4, 0.42);
    const benchWoodMaterial = new MeshPhysicalMaterial({ color: '#a1887f', roughness: 0.66 });
    const benchMetalMaterial = new MeshStandardMaterial({ color: '#607d8b', metalness: 0.28, roughness: 0.4 });
    const lampPostGeometry = new CylinderGeometry(0.08, 0.1, 4.1, 12);
    const lampArmGeometry = new BoxGeometry(1.0, 0.09, 0.09);
    const lampGeometry = new SphereGeometry(0.19, 16, 16);
    const lampMetalMaterial = new MeshStandardMaterial({ color: '#78909c', metalness: 0.38, roughness: 0.32 });
    const lampLightMaterial = new MeshStandardMaterial({ color: '#fff59d', emissive: '#fff176', emissiveIntensity: 0.5 });
    for (let z = -96; z <= 96; z += 22) {
      for (const side of [-6.9, 6.9]) {
        const isLeft = side < 0;
        if (Math.random() > 0.4) {
          const hydrant = new Mesh(hydrantGeometry, hydrantMaterial);
          hydrant.position.set(side + (isLeft ? -0.22 : 0.22), 0.29, z + (isLeft ? 2 : -3));
          const cap = new Mesh(hydrantCapGeometry, hydrantMaterial);
          cap.position.set(hydrant.position.x, 0.61, hydrant.position.z);
          this.roadProps.add(hydrant, cap);
        }
        if (Math.random() > 0.5) {
          const bench = new Group();
          const seat = new Mesh(benchSeatGeometry, benchWoodMaterial);
          seat.position.y = 0.46;
          bench.add(seat);
          for (const bx of [-0.66, 0.66]) {
            const leg = new Mesh(benchLegGeometry, benchMetalMaterial);
            leg.position.set(bx!, 0.2, 0);
            bench.add(leg);
          }
          bench.position.set(side + (isLeft ? -1.1 : 1.1), 0, z + (isLeft ? 5.4 : -5.4));
          bench.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
          this.roadProps.add(bench);
        }
        const post = new Mesh(lampPostGeometry, lampMetalMaterial);
        post.position.set(side, 2.05, z + (isLeft ? -7.4 : 7.4));
        const arm = new Mesh(lampArmGeometry, lampMetalMaterial);
        arm.position.set(side + (isLeft ? 0.46 : -0.46), 4.02, post.position.z);
        const bulb = new Mesh(lampGeometry, lampLightMaterial);
        bulb.position.set(side + (isLeft ? 0.94 : -0.94), 3.95, post.position.z);
        this.roadProps.add(post, arm, bulb);
      }
    }
    const crosswalkStripeGeometry = new PlaneGeometry(0.58, 3.4);
    const crosswalkMaterial = new MeshPhysicalMaterial({ color: '#f8fbff', roughness: 0.72 });
    for (const z of [-26, 26]) {
      for (let x = -5.1; x <= 5.1; x += 1.2) {
        const stripeMesh = new Mesh(crosswalkStripeGeometry, crosswalkMaterial);
        stripeMesh.rotation.x = -Math.PI / 2;
        stripeMesh.position.set(x!, 0.014, z);
        this.roadProps.add(stripeMesh);
      }
    }
    this.disposables.push(
      hydrantGeometry,
      hydrantCapGeometry,
      hydrantMaterial,
      benchSeatGeometry,
      benchLegGeometry,
      benchWoodMaterial,
      benchMetalMaterial,
      lampPostGeometry,
      lampArmGeometry,
      lampGeometry,
      lampMetalMaterial,
      lampLightMaterial,
      crosswalkStripeGeometry,
      crosswalkMaterial,
    );
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
