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
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three';
import type { FrameHandler, PointerRayHandler, World3D } from './contracts';

const PRESETS = {
  drive: { position: [0, 4.2, 9.5], target: [0, 1, -3] },
  garage: { position: [0, 5.0, 8.0], target: [0, 0.7, 0] },
  pool: { position: [0, 6.0, 9.0], target: [0, 1.2, 0] },
} as const;

export class ThreeWorld implements World3D {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(52, 16 / 9, 0.1, 220);
  readonly renderer = new WebGLRenderer({ antialias: true, alpha: false });
  readonly roadCenterZ = 0;

  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly frameHandlers = new Set<FrameHandler>();
  private readonly pointerHandlers = new Set<PointerRayHandler>();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly roadProps = new Group();
  private animationId = 0;
  private lastTime = performance.now();
  private disposed = false;
  private cameraPreset: keyof typeof PRESETS = 'drive';

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = this.renderer.domElement;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.canvas.className = 'three-world__canvas';
    this.canvas.style.touchAction = 'none';
    this.scene.background = new Color('#aee6ff');
    this.scene.fog = new Fog('#cbeeff', 28, 105);

    const hemisphere = new HemisphereLight('#eaffff', '#69a45a', 1.05);
    const sun = new DirectionalLight('#fff6dd', 2.15);
    sun.position.set(12, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    const ambient = new AmbientLight('#ffffff', 0.22);
    this.scene.add(hemisphere, sun, ambient);

    this.createSkyAndGround();
    this.createRoad();
    this.scene.add(this.roadProps);
    this.container.append(this.canvas);
    this.resizeToContainer();
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('resize', this.handleResize);
    this.animationId = requestAnimationFrame(this.tick);
  }

  add(...objects: Parameters<World3D['add']>): void {
    this.scene.add(...objects);
  }

  onUpdate(handler: FrameHandler): () => void {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  onPointerDown(handler: PointerRayHandler): () => void {
    this.pointerHandlers.add(handler);
    return () => this.pointerHandlers.delete(handler);
  }

  setCameraPreset(preset: 'drive' | 'garage' | 'pool'): void {
    this.cameraPreset = preset;
    this.applyCamera(true);
  }

  resizeToContainer(): void {
    if (this.disposed || !this.container.clientWidth || !this.container.clientHeight) return;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.applyCamera(false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('resize', this.handleResize);
    this.frameHandlers.clear();
    this.pointerHandlers.clear();
    for (const item of this.disposables) item.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private createSkyAndGround(): void {
    const skyGeometry = new BoxGeometry(260, 120, 260);
    const skyMaterial = new MeshStandardMaterial({ color: '#78d3ff', side: BackSide });
    const sky = new Mesh(skyGeometry, skyMaterial);
    sky.position.y = 35;
    const groundGeometry = new PlaneGeometry(240, 180);
    const groundMaterial = new MeshStandardMaterial({ color: '#83c46f' });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(sky, ground);
    this.disposables.push(skyGeometry, skyMaterial, groundGeometry, groundMaterial);

    // --- Quality upgrade: clouds, trees, buildings, road furniture ---
    const cloudMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const puffGeometry = new SphereGeometry(1, 14, 12);
    for (let index = 0; index < 9; index++) {
      const cloud = new Group();
      const puffCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const puff = new Mesh(puffGeometry, cloudMaterial);
        const scale = 0.7 + Math.random() * 0.8;
        puff.position.set((p - puffCount / 2) * 1.4 + Math.random() * 0.5, Math.random() * 0.45, Math.random() * 0.6);
        puff.scale.setScalar(scale);
        cloud.add(puff);
      }
      cloud.position.set(
        -70 + Math.random() * 140,
        22 + Math.random() * 10,
        -80 + Math.random() * 60,
      );
      cloud.userData.isEnvironment = true;
      this.scene.add(cloud);
    }

    const trunkGeometry = new CylinderGeometry(0.16, 0.24, 1.5, 8);
    const trunkMaterial = new MeshStandardMaterial({ color: '#795548', roughness: 0.75 });
    const leafGeometry = new SphereGeometry(0.95, 14, 12);
    const leafMaterials = ['#43a047', '#388e3c', '#4caf50'].map(
      (color) => new MeshStandardMaterial({ color, roughness: 0.62 }),
    );
    for (let index = 0; index < 34; index++) {
      const tree = new Group();
      const trunk = new Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.75;
      tree.add(trunk);
      const leaves = new Mesh(leafGeometry, leafMaterials[index % leafMaterials.length]!);
      leaves.position.y = 2.05;
      const leafScale = 0.85 + Math.random() * 0.6;
      leaves.scale.set(leafScale, leafScale * 0.92, leafScale);
      tree.add(leaves);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distanceFromRoad = 7.5 + Math.random() * 26;
      tree.position.set(side * distanceFromRoad, 0, -78 + Math.random() * 156);
      tree.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(tree);
    }

    const buildingColors = ['#eceff1', '#cfd8dc', '#ffe0b2', '#d1c4e9', '#b2dfdb'];
    for (let index = 0; index < 18; index++) {
      const width = 2.6 + Math.random() * 3.4;
      const height = 4.5 + Math.random() * 9;
      const depth = 2.6 + Math.random() * 3;
      const geometry = new BoxGeometry(width, height, depth);
      const material = new MeshStandardMaterial({
        color: buildingColors[index % buildingColors.length]!,
        roughness: 0.55,
      });
      const building = new Mesh(geometry, material);
      const side = Math.random() > 0.5 ? 1 : -1;
      const distanceFromRoad = 17 + Math.random() * 30;
      building.position.set(side * distanceFromRoad, height / 2, -76 + Math.random() * 152);
      building.rotation.y = Math.random() * 0.28 - 0.14;
      building.castShadow = false;
      building.receiveShadow = true;
      this.scene.add(building);
    }

    // Guard rails along the road
    const railPostGeometry = new BoxGeometry(0.14, 0.72, 0.14);
    const railBeamGeometry = new BoxGeometry(0.08, 0.2, 180);
    const railMaterial = new MeshStandardMaterial({ color: '#b0bec5', metalness: 0.35, roughness: 0.42 });
    for (const x of [-5.9, 5.9]) {
      const beam = new Mesh(railBeamGeometry, railMaterial);
      beam.position.set(x!, 0.66, 0);
      this.scene.add(beam);
      for (let z = -88; z <= 88; z += 4) {
        const post = new Mesh(railPostGeometry, railMaterial);
        post.position.set(x!, 0.36, z);
        this.scene.add(post);
      }
    }
    this.disposables.push(puffGeometry, cloudMaterial, trunkGeometry, trunkMaterial, leafGeometry, ...leafMaterials, railPostGeometry, railBeamGeometry, railMaterial);
  }

  private createRoad(): void {
    const roadGeometry = new PlaneGeometry(11, 190);
    const roadMaterial = new MeshStandardMaterial({ color: '#66717d' });
    const road = new Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    const stripeGeometry = new PlaneGeometry(0.32, 3.2);
    const stripeMaterial = new MeshStandardMaterial({ color: '#ffffff' });
    const stripes = new Group();
    for (let z = -90; z <= 90; z += 7) {
      const stripe = new Mesh(stripeGeometry, stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, z);
      stripes.add(stripe);
    }
    this.scene.add(road, stripes);
    this.disposables.push(roadGeometry, roadMaterial, stripeGeometry, stripeMaterial);

    // Road-side props: hydrants, benches, streetlights and crosswalks.
    const hydrantGeometry = new CylinderGeometry(0.18, 0.22, 0.55, 12);
    const hydrantCapGeometry = new SphereGeometry(0.19, 14, 14);
    const hydrantMaterial = new MeshStandardMaterial({ color: '#ef5350', roughness: 0.35 });
    const benchSeatGeometry = new BoxGeometry(1.5, 0.1, 0.45);
    const benchLegGeometry = new BoxGeometry(0.1, 0.38, 0.4);
    const benchWoodMaterial = new MeshStandardMaterial({ color: '#a1887f', roughness: 0.65 });
    const benchMetalMaterial = new MeshStandardMaterial({ color: '#607d8b', metalness: 0.25, roughness: 0.45 });
    const lampPostGeometry = new CylinderGeometry(0.07, 0.09, 3.8, 10);
    const lampArmGeometry = new BoxGeometry(0.9, 0.08, 0.08);
    const lampGeometry = new SphereGeometry(0.17, 14, 14);
    const lampMetalMaterial = new MeshStandardMaterial({ color: '#78909c', metalness: 0.35, roughness: 0.35 });
    const lampLightMaterial = new MeshStandardMaterial({ color: '#fff59d', emissive: '#fff176', emissiveIntensity: 0.45 });
    for (let z = -84; z <= 84; z += 21) {
      for (const side of [-6.6, 6.6]) {
        const isLeft = side < 0;
        if (Math.random() > 0.42) {
          const hydrant = new Mesh(hydrantGeometry, hydrantMaterial);
          hydrant.position.set(side + (isLeft ? -0.2 : 0.2), 0.28, z + (isLeft ? 2 : -3));
          const cap = new Mesh(hydrantCapGeometry, hydrantMaterial);
          cap.position.set(hydrant.position.x, 0.58, hydrant.position.z);
          this.roadProps.add(hydrant, cap);
        }
        if (Math.random() > 0.52) {
          const bench = new Group();
          const seat = new Mesh(benchSeatGeometry, benchWoodMaterial);
          seat.position.y = 0.44;
          bench.add(seat);
          for (const bx of [-0.62, 0.62]) {
            const leg = new Mesh(benchLegGeometry, benchMetalMaterial);
            leg.position.set(bx!, 0.19, 0);
            bench.add(leg);
          }
          bench.position.set(side + (isLeft ? -1 : 1), 0, z + (isLeft ? 5 : -5));
          bench.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
          this.roadProps.add(bench);
        }
        const post = new Mesh(lampPostGeometry, lampMetalMaterial);
        post.position.set(side, 1.9, z + (isLeft ? -7 : 7));
        const arm = new Mesh(lampArmGeometry, lampMetalMaterial);
        arm.position.set(side + (isLeft ? 0.42 : -0.42), 3.72, post.position.z);
        const bulb = new Mesh(lampGeometry, lampLightMaterial);
        bulb.position.set(side + (isLeft ? 0.85 : -0.85), 3.66, post.position.z);
        this.roadProps.add(post, arm, bulb);
      }
    }
    const crosswalkStripeGeometry = new PlaneGeometry(0.55, 3.2);
    const crosswalkMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
    for (const z of [-24, 24]) {
      for (let x = -4.6; x <= 4.6; x += 1.15) {
        const stripeMesh = new Mesh(crosswalkStripeGeometry, crosswalkMaterial);
        stripeMesh.rotation.x = -Math.PI / 2;
        stripeMesh.position.set(x!, 0.011, z);
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
    const aspectScale = Math.max(0.68, Math.min(1.25, 1.55 / this.camera.aspect));
    const [x, y, z] = preset.position;
    const nextZ = z * aspectScale;
    if (instant) {
      this.camera.position.set(x, y, nextZ);
      this.camera.lookAt(preset.target[0]!, preset.target[1]!, preset.target[2]!);
    } else {
      this.camera.position.z = nextZ;
      this.camera.lookAt(preset.target[0]!, preset.target[1]!, preset.target[2]!);
    }
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

  private handleResize = (): void => this.resizeToContainer();

  private tick = (time: number): void => {
    if (this.disposed) return;
    const delta = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    const elapsed = time / 1000;
    for (const handler of [...this.frameHandlers]) handler(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.tick);
  };
}
