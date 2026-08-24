import * as THREE from 'three';
import { CAR_COLORS, createCar } from '../cars';
import { type CarColorName, type GameContext, type GameModule } from '../contracts';
import { removeAndDispose } from '../objectCleanup';
import { createGameHud } from '../gameHud';

const COLORS: readonly CarColorName[] = ['red', 'blue', 'yellow', 'green'];
const LABELS: Record<CarColorName, string> = { red: 'あか', blue: 'あお', yellow: 'きいろ', green: 'みどり' };
const GARAGE_COLORS = CAR_COLORS;
const LANES: Record<CarColorName, number> = { red: -4.5, blue: -1.5, yellow: 1.5, green: 4.5 };
const TARGET_Z = -5;
const START_Z = 2.8;

interface DraggableCar {
  group: THREE.Group;
  color: CarColorName;
  homeZ: number;
  dragging: boolean;
  parked?: boolean;
  rejectUntil?: number;
  lastEvent?: PointerEvent;
}

interface GarageVisual {
  color: CarColorName;
  group: THREE.Group;
  material: THREE.MeshStandardMaterial;
  bounceUntil?: number;
}

export class ColorGarageGame implements GameModule {
  readonly id = 'color-garage';
  private context: GameContext | null = null;
  private hud: ReturnType<typeof createGameHud> | null = null;
  private cleanup: Array<() => void> = [];
  private cars: DraggableCar[] = [];
  private dragged: DraggableCar | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;
  private resetTimer?: number;
  private garages: GarageVisual[] = [];

  mount(context: GameContext): void {
    this.context = context;
    this.hud = createGameHud(context, 'いろの しゃこ');
    this.hud.setProgress(0, 4);
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
    this.hud?.dispose();
    if (this.resetTimer) window.clearTimeout(this.resetTimer);
    for (const car of this.cars) removeAndDispose(car.group);
    this.cars = [];
    for (const garage of this.garages) removeAndDispose(garage.group);
    this.garages = [];
    this.cleanup = [];
    this.context = null;
  }

  private buildGarage(color: CarColorName): void {
    if (!this.context) return;
    const visual = new THREE.Group();
    visual.position.set(LANES[color]!, 0, TARGET_Z);
    const geometry = new THREE.BoxGeometry(2.3, 2.3, 2.8);
    const material = new THREE.MeshStandardMaterial({
      color: GARAGE_COLORS[color]!,
      emissive: GARAGE_COLORS[color],
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.32,
    });
    const garageBody = new THREE.Mesh(geometry, material);
    garageBody.position.y = 1.15;
    const roofGeometry = new THREE.CylinderGeometry(1.15, 1.15, 2.3, 24, 1, false, 0, Math.PI);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: GARAGE_COLORS[color]!, roughness: 0.35 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 2.3;
    visual.add(garageBody, roof);
    this.context.world.add(visual);
    this.garages.push({ color, group: visual, material });
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
    if (!found || found.parked) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.lastEvent = event;
    try { this.context.world.renderer.domElement.setPointerCapture(event.pointerId); } catch {}
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
      const nearAnyGarage = Object.values(LANES).some((lane) => Math.abs(item.group.position.x - lane) < 1.55)
        && Math.abs(item.group.position.z - TARGET_Z) < 2.15;
      const nearCorrectGarage = Math.abs(item.group.position.x - LANES[item.color]!) < 1.55
        && Math.abs(item.group.position.z - TARGET_Z) < 2.15;
      if (nearCorrectGarage) {
        item.parked = true;
        item.group.position.set(LANES[item.color]!, 0, TARGET_Z + 0.25);
        item.rejectUntil = undefined;
        const garage = this.garages.find((visual) => visual.color === item.color);
        if (garage) garage.bounceUntil = performance.now() + 480;
        this.context.sfx('chime');
        this.context.speak(`${LABELS[item.color]}！`);
        this.context.complete();
        this.hud?.setProgress(this.cars.filter((car) => car.parked).length, 4);
        if (this.cars.every((car) => car.parked)) {
          this.hud?.celebrate('できた！');
          this.resetTimer = window.setTimeout(() => this.reset(), 1200);
        }
      } else if (nearAnyGarage) {
        item.rejectUntil = performance.now() + 520;
        this.context.sfx('softNo');
        item.group.position.z = item.homeZ;
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
      canvas.removeEventListener('lostpointercapture', release);
      this.moveAttached = false;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
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
    const targetColor = this.currentTarget();
    const pulse = THREE.MathUtils.clamp(0.12 + Math.sin(time * 2) * 0.165, 0.12, 0.45);
    const now = performance.now();
    for (const garage of this.garages) {
      if (garage.bounceUntil !== undefined && now < garage.bounceUntil) {
        const progress = 1 - (garage.bounceUntil - now) / 480;
        garage.group.scale.y = 1 + Math.sin(progress * Math.PI) * 0.08;
      } else {
        garage.group.scale.y = 1;
        garage.bounceUntil = undefined;
      }
      garage.material.emissiveIntensity = garage.color === targetColor ? pulse : 0.12;
    }
    for (const car of this.cars) {
      if (car.dragging) {
        car.group.rotation.z = Math.sin(time * 10) * 0.045;
      } else if (car.rejectUntil && performance.now() < car.rejectUntil) {
        car.group.rotation.z = Math.sin(time * 24) * 0.07;
      } else {
        car.group.rotation.z = 0;
      }
    }
  }

  private reset(): void {
    if (!this.context) return;
    this.resetTimer = undefined;
    this.hud?.setProgress(0, 4);
    for (const car of this.cars) {
      car.parked = false;
      car.group.position.set(LANES[car.color]!, 0, START_Z + Math.random() * 1.4);
    }
  }
}
