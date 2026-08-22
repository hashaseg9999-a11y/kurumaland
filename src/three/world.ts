import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  BoxGeometry,
  Color,
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
