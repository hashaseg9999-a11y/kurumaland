import * as THREE from 'three';
import { createCar } from '../cars';
import { type CarColorName, type GameContext, type GameModule } from '../contracts';

const COLORS: readonly CarColorName[] = ['red', 'blue', 'yellow', 'green'];
const LABELS: Record<CarColorName, string> = { red: 'あか', blue: 'あお', yellow: 'きいろ', green: 'みどり' };
const GARAGE_COLORS: Record<CarColorName, string> = {
  red: '#ef5350',
  blue: '#42a5f5',
  yellow: '#ffca28',
  green: '#66bb6a',
};
const LANES: Record<CarColorName, number> = { red: -4.5, blue: -1.5, yellow: 1.5, green: 4.5 };
const TARGET_Z = -5;
const START_Z = 7.5;

interface DraggableCar {
  group: THREE.Group;
  color: CarColorName;
  homeZ: number;
  dragging: boolean;
  parked?: boolean;
  lastEvent?: PointerEvent;
}

export class ColorGarageGame implements GameModule {
  readonly id = 'color-garage';
  private context: GameContext | null = null;
  private cleanup: Array<() => void> = [];
  private cars: DraggableCar[] = [];
  private dragged: DraggableCar | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;

  mount(context: GameContext): void {
    this.context = context;
    context.world.setCameraPreset('garage');
    for (const color of COLORS) this.buildGarage(color);
    for (const [index, color] of COLORS.entries()) {
      const group = createCar(color, 0.92);
      group.position.set(LANES[color]!, 0, START_Z + (index % 2) * 2);
      context.world.add(group);
      this.cars.push({ group, color, homeZ: group.position.z, dragging: false });
    }
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

  private buildGarage(color: CarColorName): void {
    if (!this.context) return;
    const geometry = new THREE.BoxGeometry(2.3, 2.3, 2.8);
    const material = new THREE.MeshStandardMaterial({ color: GARAGE_COLORS[color]!, transparent: true, opacity: 0.32 });
    const garage = new THREE.Mesh(geometry, material);
    garage.position.set(LANES[color]!, 1.15, TARGET_Z);
    const roofGeometry = new THREE.CylinderGeometry(1.15, 1.15, 2.3, 24, 1, false, 0, Math.PI);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: GARAGE_COLORS[color]!, roughness: 0.35 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(LANES[color]!, 2.3, TARGET_Z);
    this.context.world.add(garage, roof);
  }

  private startDrag(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.context || this.pointerId !== null || this.currentTarget() === null) return;
    const hit = raycaster.intersectObjects(this.cars.map((item) => item.group), true)[0];
    if (!hit) return;
    let selected = hit.object;
    while (selected.parent && !this.cars.some((car) => car.group === selected)) {
      selected = selected.parent!;
    }
    const found = this.cars.find((car) => car.group === selected);
    if (!found || found.parked || found.color !== this.currentTarget()) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.lastEvent = event;
    this.attachMoveAndRelease();
    this.context.sfx('pop');
  }

  private currentTarget(): CarColorName | null {
    return COLORS.find((color) => !this.cars.some((car) => car.color === color && car.parked)) ?? null;
  }

  private attachMoveAndRelease(): void {
    if (!this.context || this.moveAttached) return;
    this.moveAttached = true;
    const canvas = this.context.world.renderer.domElement;
    const move = (event: PointerEvent): void => {
      const item = this.dragged;
      if (!item || event.pointerId !== this.pointerId) return;
      item.lastEvent = event;
      this.updateDragFromPointer();
    };
    const release = (): void => {
      const item = this.dragged;
      if (!this.context || !item) return;
      const near = Math.abs(item.group.position.x - LANES[item.color]!) < 1.55 && Math.abs(item.group.position.z - TARGET_Z) < 2.15;
      if (near) {
        item.parked = true;
        item.group.position.set(LANES[item.color]!, 0, TARGET_Z + 0.25);
        this.context.sfx('chime');
        this.context.speak(`${LABELS[item.color]}！`);
        this.context.complete();
        if (this.cars.every((car) => car.parked)) window.setTimeout(() => this.reset(), 900);
      } else {
        item.group.position.z = item.homeZ;
      }
      item.dragging = false;
      item.lastEvent = undefined;
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

  private updateDragFromPointer(): void {
    const item = this.dragged;
    if (!item?.lastEvent || !this.context) return;
    const rect = this.context.world.renderer.domElement.getBoundingClientRect();
    const ndcX = ((item.lastEvent.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((item.lastEvent.clientY - rect.top) / rect.height) * 2 + 1;
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.context.world.camera);
    const direction = vector.sub(this.context.world.camera.position).normalize();
    const distance = -this.context.world.camera.position.y / direction.y;
    item.group.position.copy(this.context.world.camera.position.clone().add(direction.multiplyScalar(distance)));
    item.group.position.y = 0;
    item.group.position.x = THREE.MathUtils.clamp(item.group.position.x, -6, 6);
    item.group.position.z = THREE.MathUtils.clamp(item.group.position.z, TARGET_Z - 1, START_Z + 3);
  }

  private update(): void {
    const time = performance.now() / 1000;
    for (const car of this.cars) {
      if (!car.dragging) continue;
      car.group.rotation.z = Math.sin(time * 10) * 0.045;
    }
  }

  private reset(): void {
    for (const car of this.cars) {
      car.parked = false;
      car.group.position.set(LANES[car.color]!, 0, START_Z + Math.random() * 3);
    }
  }
}
