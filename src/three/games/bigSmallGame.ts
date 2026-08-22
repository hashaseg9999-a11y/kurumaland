import * as THREE from 'three';
import { createCar } from '../cars';
import { type CarColorName, type GameContext, type GameModule } from '../contracts';

const COLORS: readonly CarColorName[] = ['red', 'blue', 'yellow', 'green'];
const LANES: Record<CarColorName, [number, number]> = {
  red: [-3.2, 3.2],
  blue: [-3.4, 3.0],
  yellow: [-3.0, 3.4],
  green: [-3.1, 3.1],
};

interface SizedCar {
  group: THREE.Group;
  color: CarColorName;
  big: boolean;
  dragging: boolean;
  parked?: boolean;
  lastEvent?: PointerEvent;
}

export class BigSmallGame implements GameModule {
  readonly id = 'big-small';
  private context: GameContext | null = null;
  private cleanup: Array<() => void> = [];
  private cars: SizedCar[] = [];
  private dragged: SizedCar | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;

  mount(context: GameContext): void {
    this.context = context;
    context.world.setCameraPreset('garage');
    for (const color of COLORS) this.buildSlots(color);
    for (const color of COLORS) this.buildPair(color);
    this.cleanup.push(
      context.world.onPointerDown((event, raycaster) => this.startDrag(event, raycaster)),
      context.world.onUpdate(() => this.update()),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    for (const car of this.cars) car.group.removeFromParent();
    this.cars = [];
    this.cleanup = [];
    this.context = null;
  }

  private buildSlots(color: CarColorName): void {
    if (!this.context) return;
    const positions = LANES[color]!;
    for (const [index, x] of positions.entries()) {
      const big = index === 0;
      const geometry = new THREE.BoxGeometry(big ? 3.5 : 2.4, 0.12, big ? 5.0 : 3.6);
      const material = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 });
      const frame = new THREE.Mesh(geometry, material);
      frame.position.set(x!, 0.02, -3.5);
      this.context.world.add(frame);
    }
  }

  private buildPair(color: CarColorName): void {
    if (!this.context) return;
    const bigCar = createCar(color, 1.45);
    const smallCar = createCar(color, 0.78);
    const z = 6 + Math.random() * 3;
    bigCar.position.set(-4.8 + Math.random() * 2, 0, z);
    smallCar.position.set(2.7 + Math.random() * 2, 0, z + Math.random() * 1.5);
    bigCar.rotation.y = Math.PI;
    smallCar.rotation.y = Math.PI;
    this.context.world.add(bigCar, smallCar);
    this.cars.push(
      { group: bigCar, color, big: true, dragging: false },
      { group: smallCar, color, big: false, dragging: false },
    );
  }

  private startDrag(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.context || this.pointerId !== null || !this.cars.some((car) => !car.parked)) return;
    const hit = raycaster.intersectObjects(this.cars.filter((car) => !car.parked).map((car) => car.group), true)[0];
    if (!hit) return;
    let selected = hit.object;
    while (selected.parent && !this.cars.some((car) => car.group === selected)) selected = selected.parent!;
    const found = this.cars.find((car) => car.group === selected);
    if (!found) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.lastEvent = event;
    this.attachMoveAndRelease();
    this.context.sfx('pop');
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
      const slotX = item.big ? -3.2 : 3.2;
      if (Math.abs(item.group.position.x - slotX) < 2.15 && item.group.position.z < -0.5) {
        item.parked = true;
        item.group.position.set(slotX, 0, -3.5);
        item.group.rotation.y = 0;
        this.context.sfx('chime');
        this.context.speak(item.big ? 'おおきい！' : 'ちいさい！');
        this.context.complete();
        if (!this.cars.some((car) => !car.parked)) window.setTimeout(() => this.reset(), 900);
      } else {
        item.group.position.z = 6 + Math.random() * 3;
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

  private updateDrag(): void {
    const item = this.dragged;
    if (!item?.lastEvent || !this.context) return;
    const point = this.screenToGround(item.lastEvent);
    if (!point) return;
    item.group.position.set(THREE.MathUtils.clamp(point.x, -6.5, 6.5), 0, THREE.MathUtils.clamp(point.z, -4.2, 10));
  }

  private screenToGround(event: PointerEvent): THREE.Vector3 | null {
    if (!this.context) return null;
    const rect = this.context.world.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const vector = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(this.context.world.camera);
    const direction = vector.sub(this.context.world.camera.position).normalize();
    if (Math.abs(direction.y) < 0.0001) return null;
    const distance = -this.context.world.camera.position.y / direction.y;
    return this.context.world.camera.position.clone().add(direction.multiplyScalar(distance));
  }

  private update(): void {
    const time = performance.now() / 1000;
    for (const car of this.cars) {
      if (car.dragging) car.group.rotation.z = Math.sin(time * 9) * 0.04;
    }
  }

  private reset(): void {
    for (const car of this.cars) {
      car.parked = false;
      const z = 6 + Math.random() * 3;
      car.group.position.set(car.big ? -4.8 + Math.random() * 2 : 2.7 + Math.random() * 2, 0, car.big ? z : z + 1.2);
      car.group.rotation.y = Math.PI;
    }
  }
}
