import * as THREE from 'three';
import { createCar } from '../cars';
import { type GameContext, type GameModule } from '../contracts';

type TrainColor = 'red' | 'blue' | 'green';
const COLORS: readonly TrainColor[] = ['red', 'blue', 'green'];
const LABELS: Record<TrainColor, string> = { red: 'あかい くるま', blue: 'あおい くるま', green: 'みどりの くるま' };

interface TrainCar {
  group: THREE.Group;
  color: TrainColor;
  dragging: boolean;
  attached?: boolean;
  lastEvent?: PointerEvent;
}

export class LineUpGame implements GameModule {
  readonly id = 'line-up';
  private context: GameContext | null = null;
  private cleanup: Array<() => void> = [];
  private cars: TrainCar[] = [];
  private dragged: TrainCar | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;
  private trainRunning = false;
  private trainDistance = 0;
  private locomotive?: THREE.Group;

  mount(context: GameContext): void {
    this.context = context;
    context.world.setCameraPreset('drive');
    this.buildLocomotive();
    for (const color of COLORS) this.buildCar(color);
    this.cleanup.push(
      context.world.onPointerDown((event, raycaster) => this.startDrag(event, raycaster)),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    for (const car of this.cars) car.group.removeFromParent();
    this.locomotive?.removeFromParent();
    this.cars = [];
    this.cleanup = [];
    this.context = null;
  }

  private buildLocomotive(): void {
    if (!this.context) return;
    const train = createCar('yellow', 1.1);
    train.position.set(0, 0, -4.5);
    train.rotation.y = Math.PI;
    const face = document.createElement('div');
    face.textContent = '🚂';
    face.style.cssText = 'position:absolute;top:max(16px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:8px 20px;border-radius:24px;background:rgb(255 255 255 / 92%);font-weight:bold;pointer-events:none;';
    face.textContent = 'きいろい ディーゼルを さきとうに つなげよう';
    this.context.overlay.append(face);
    this.locomotive = train;
    this.context.world.add(train);
  }

  private buildCar(color: TrainColor): void {
    if (!this.context) return;
    const group = createCar(color, 0.95);
    group.position.set(color === 'red' ? -3.8 : color === 'blue' ? 3.7 : -2.2, 0, 5 + Math.random() * 3);
    group.rotation.y = Math.PI;
    this.context.world.add(group);
    this.cars.push({ group, color, dragging: false });
  }

  private startDrag(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.context || this.pointerId !== null || this.trainRunning || !this.cars.some((car) => !car.attached)) return;
    const hit = raycaster.intersectObjects(this.cars.filter((car) => !car.attached).map((car) => car.group), true)[0];
    if (!hit) return;
    let selected = hit.object;
    while (selected.parent && !this.cars.some((car) => car.group === selected)) selected = selected.parent!;
    const found = this.cars.find((car) => car.group === selected);
    if (!found || found.attached || found.color !== this.currentTarget()) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.lastEvent = event;
    this.attachMoveAndRelease();
    this.context.sfx('pop');
  }

  private currentTarget(): TrainColor | null {
    return COLORS.find((color) => !this.cars.some((car) => car.color === color && car.attached)) ?? null;
  }

  private attachMoveAndRelease(): void {
    if (!this.context || this.moveAttached) return;
    this.moveAttached = true;
    const canvas = this.context.world.renderer.domElement;
    const move = (event: PointerEvent): void => {
      if (!this.dragged || event.pointerId !== this.pointerId) return;
      this.dragged.lastEvent = event;
      this.updateDrag();
    };
    const release = (): void => {
      const item = this.dragged;
      if (!this.context || !item) return;
      if (this.nearCoupling(item)) {
        item.attached = true;
        item.dragging = false;
        item.lastEvent = undefined;
        this.dragged = null;
        this.pointerId = null;
        this.context.sfx('chime');
        this.context.speak(`${LABELS[item.color]}！`);
        this.context.complete();
        if (this.cars.every((car) => car.attached)) window.setTimeout(() => this.startTrain(), 700);
      } else {
        item.lastEvent = undefined;
      }
      item.dragging = false;
      this.dragged = null;
      this.pointerId = null;
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', release);
      canvas.removeEventListener('pointercancel', release);
      this.moveAttached = false;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  }

  private nearCoupling(item: TrainCar): boolean {
    if (!this.locomotive) return false;
    const attachedCount = this.cars.filter((car) => car.attached).length;
    const targetZ = -4.5 + (attachedCount + 1) * 2.55;
    return Math.abs(item.group.position.x) < 1.9 && Math.abs(item.group.position.z - targetZ) < 2.6;
  }

  private updateDrag(): void {
    const item = this.dragged;
    if (!item?.lastEvent || !this.context) return;
    const rect = this.context.world.renderer.domElement.getBoundingClientRect();
    const ndcX = ((item.lastEvent.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((item.lastEvent.clientY - rect.top) / rect.height) * 2 + 1;
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.context.world.camera);
    const direction = vector.sub(this.context.world.camera.position).normalize();
    const distance = -this.context.world.camera.position.y / direction.y;
    const point = this.context.world.camera.position.clone().add(direction.multiplyScalar(distance));
    item.group.position.set(THREE.MathUtils.clamp(point.x, -5, 5), 0, THREE.MathUtils.clamp(point.z, -3.5, 10));
  }

  private startTrain(): void {
    if (!this.context) return;
    this.trainRunning = true;
    this.trainDistance = 0;
    this.context.sfx('chime');
    this.context.speak('れっしゃ しゅっぱつ！');
  }

  private update(delta: number): void {
    if (!this.trainRunning || !this.locomotive) return;
    const speed = 7 * delta;
    this.trainDistance += speed;
    this.locomotive.position.z -= speed;
    let cursorZ = this.locomotive.position.z;
    for (const car of this.cars) {
      cursorZ += 2.55;
      car.group.position.z = cursorZ;
      car.group.position.x = Math.sin(performance.now() / 500 + cursorZ) * 0.04;
    }
    if (this.trainDistance > 48) {
      this.trainRunning = false;
      this.resetPositions();
    }
  }

  private resetPositions(): void {
    if (!this.locomotive) return;
    this.locomotive.position.set(0, 0, -4.5);
    for (const car of this.cars) {
      car.attached = false;
      car.group.position.set(car.color === 'red' ? -3.8 : car.color === 'blue' ? 3.7 : -2.2, 0, 5 + Math.random() * 3);
    }
  }
}
