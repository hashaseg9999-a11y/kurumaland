import * as THREE from 'three';
import { createCar } from '../cars';
import { type GameContext, type GameModule } from '../contracts';
import { removeAndDispose } from '../objectCleanup';
import { createCameraMicroPulse, createGameHud, createParticleBurst } from '../gameHud';

type TrainColor = 'red' | 'blue' | 'green';
const COLORS: readonly TrainColor[] = ['red', 'blue', 'green'];
const LABELS: Record<TrainColor, string> = { red: 'あかい くるま', blue: 'あおい くるま', green: 'みどりの くるま' };
const COUPLING_SPACING = 2.55;
const LOCOMOTIVE_Z = -4.5;

interface TrainCar {
  group: THREE.Group;
  color: TrainColor;
  dragging: boolean;
  attached?: boolean;
  rejectUntil?: number;
  bounceUntil?: number;
  lastEvent?: PointerEvent;
}
export class LineUpGame implements GameModule {
  readonly id = 'line-up';
  private context: GameContext | null = null;
  private hud: ReturnType<typeof createGameHud> | null = null;
  private cleanup: Array<() => void> = [];
  private cars: TrainCar[] = [];
  private dragged: TrainCar | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;
  private trainRunning = false;
  private trainDistance = 0;
  private resetTimer?: number;
  private locomotive?: THREE.Group;
  private guideGroup?: THREE.Group;
  private couplingRing?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private guideArrow?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private sparkleGroup?: THREE.Group;
  private sparkles: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private sparkleUntil = 0;
  private guideBaseX = 0.15;
  private trackGroup?: THREE.Group;
  private particles: ReturnType<typeof createParticleBurst> | null = null;
  private cameraPulse: ReturnType<typeof createCameraMicroPulse> | null = null;
  private shakeUntil = 0;

  mount(context: GameContext): void {
    this.context = context;
    this.hud = createGameHud(context, 'ならべて れっしゃ');
    this.hud.setProgress(0, 3);
    context.world.setCameraPreset('train');
    this.particles = createParticleBurst(context.world);
    this.cameraPulse = createCameraMicroPulse(context.world);
    this.buildTrack();
    this.buildLocomotive();
    this.createCouplingGuide();
    for (const color of COLORS) this.buildCar(color);
    this.cleanup.push(
      context.world.onPointerDown((event, raycaster) => this.startDrag(event, raycaster)),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    this.hud?.dispose();
    if (this.resetTimer) window.clearTimeout(this.resetTimer);
    this.sparkleUntil = 0;
    this.clearSparkles();
    this.particles?.dispose();
    this.cameraPulse?.dispose();
    this.particles = null;
    this.cameraPulse = null;
    if (this.guideGroup) removeAndDispose(this.guideGroup);
    this.guideGroup = undefined;
    if (this.trackGroup) removeAndDispose(this.trackGroup);
    this.trackGroup = undefined;
    this.couplingRing = undefined;
    this.guideArrow = undefined;
    this.sparkleGroup = undefined;
    for (const car of this.cars) removeAndDispose(car.group);
    if (this.locomotive) removeAndDispose(this.locomotive);
    this.cars = [];
    this.cleanup = [];
    this.context = null;
  }

  private buildTrack(): void {
    if (!this.context) return;
    const track = new THREE.Group();
    const ballastGeometry = new THREE.BoxGeometry(3.4, 0.1, 46);
    const ballastMaterial = new THREE.MeshStandardMaterial({ color: '#c9b79c', roughness: 0.92 });
    const ballast = new THREE.Mesh(ballastGeometry, ballastMaterial);
    ballast.position.set(0, 0.03, LOCOMOTIVE_Z + 6);
    ballast.receiveShadow = true;

    const tieGeometry = new THREE.BoxGeometry(3.0, 0.09, 0.5);
    const tieMaterial = new THREE.MeshStandardMaterial({ color: '#7a5c44', roughness: 0.85 });
    const railGeometry = new THREE.BoxGeometry(0.1, 0.1, 46);
    const railMaterial = new THREE.MeshStandardMaterial({ color: '#9aa5ad', metalness: 0.6, roughness: 0.3 });
    const ties: THREE.Mesh[] = [];
    for (let z = LOCOMOTIVE_Z - 17; z <= LOCOMOTIVE_Z + 29; z += 1.4) {
      const tie = new THREE.Mesh(tieGeometry, tieMaterial);
      tie.position.set(0, 0.1, z);
      tie.receiveShadow = true;
      ties.push(tie);
    }
    const leftRail = new THREE.Mesh(railGeometry, railMaterial);
    leftRail.position.set(-0.72, 0.17, LOCOMOTIVE_Z + 6);
    const rightRail = new THREE.Mesh(railGeometry.clone(), railMaterial);
    rightRail.position.set(0.72, 0.17, LOCOMOTIVE_Z + 6);

    track.add(ballast, ...ties, leftRail, rightRail);
    this.context.world.add(track);
    this.trackGroup = track;
  }

  private buildLocomotive(): void {
    if (!this.context) return;
    const train = createCar('yellow', 1.1);
    train.position.set(0, 0, LOCOMOTIVE_Z);
    train.rotation.y = Math.PI;
    this.locomotive = train;
    this.context.world.add(train);
  }

  private createCouplingGuide(): void {
    if (!this.context) return;
    const guide = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.32, 48),
      new THREE.MeshBasicMaterial({ color: '#ffd54f', transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;

    const arrow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.62),
      new THREE.MeshBasicMaterial({
        color: '#ffca28',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.12, -0.78);

    const sparkles = new THREE.Group();
    sparkles.position.y = 0.2;

    guide.add(ring, arrow, sparkles);
    guide.position.set(this.guideBaseX, 0, this.nextCouplingZ());
    this.context.world.add(guide);
    this.guideGroup = guide;
    this.couplingRing = ring;
    this.guideArrow = arrow;
    this.sparkleGroup = sparkles;
  }

  private nextCouplingZ(): number {
    return LOCOMOTIVE_Z + (this.cars.filter((car) => car.attached).length + 1) * COUPLING_SPACING;
  }

  private refreshGuide(): void {
    if (!this.guideGroup) return;
    const hasTarget = this.currentTarget() !== null;
    this.guideGroup.visible = hasTarget;
    if (hasTarget) this.guideGroup.position.set(this.guideBaseX, 0, this.nextCouplingZ());
  }

  private startSuccessFeedback(item: TrainCar): void {
    const targetZ = this.nextCouplingZ();
    item.attached = true;
    item.rejectUntil = undefined;
    item.bounceUntil = performance.now() + 430;
    item.group.position.set(0, 0, targetZ);
    item.group.rotation.y = Math.PI;
    this.refreshGuide();
    this.particles?.burst({ x: 0, y: 1, z: targetZ }, { count: 16 });
    this.cameraPulse?.trigger();
    if (this.cars.every((car) => car.attached)) {
      this.shakeUntil = performance.now() + 640;
    }
    this.spawnSparkles();
  }

  private spawnSparkles(): void {
    if (!this.sparkleGroup) return;
    this.clearSparkles();
    for (let index = 0; index < 10; index++) {
      const size = 0.08 + Math.random() * 0.08;
      const sparkle = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          color: '#fff59d',
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      const angle = (index / 10) * Math.PI * 2;
      const radius = 0.45 + Math.random() * 0.5;
      sparkle.position.set(Math.cos(angle) * radius, 0.18 + Math.random() * 0.38, Math.sin(angle) * radius);
      sparkle.rotation.x = -Math.PI / 2;
      this.sparkleGroup.add(sparkle);
      this.sparkles.push(sparkle);
    }
    this.sparkleUntil = performance.now() + 620;
  }

  private clearSparkles(): void {
    for (const sparkle of this.sparkles) removeAndDispose(sparkle);
    this.sparkles = [];
  }

  private buildCar(color: TrainColor): void {
    if (!this.context) return;
    const group = createCar(color, 0.95);
    const startX = color === 'red' ? -5.4 : color === 'blue' ? 5.2 : -2.6;
    group.position.set(startX, 0, 3.2 + (color === 'green' ? 1.6 : Math.random() * 0.8));
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
    if (!found || found.attached) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.lastEvent = event;
    try { this.context.world.renderer.domElement.setPointerCapture(event.pointerId); } catch {}
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
        if (item.color === this.currentTarget()) {
          this.context.sfx('chime');
          this.context.speak(`${LABELS[item.color]}！`);
          this.context.complete();
          this.startSuccessFeedback(item);
          this.hud?.setProgress(this.cars.filter((car) => car.attached).length, 3);
          if (this.cars.every((car) => car.attached)) {
            this.hud?.celebrate('しゅっぱつ！');
            this.resetTimer = window.setTimeout(() => this.startTrain(), 900);
          }
        } else {
          item.rejectUntil = performance.now() + 520;
          this.context.sfx('softNo');
        const startX = item.color === 'red' ? -5.4 : item.color === 'blue' ? 5.2 : -2.6;
        item.group.position.set(startX, 0, 3.2 + (item.color === 'green' ? 1.6 : Math.random() * 0.8));
        }
      } else {
        item.lastEvent = undefined;
      }
      item.dragging = false;
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
  }

  private nearCoupling(item: TrainCar): boolean {
    if (!this.locomotive) return false;
    const targetZ = this.nextCouplingZ();
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
    item.group.position.set(THREE.MathUtils.clamp(point.x, -5, 5), 0, THREE.MathUtils.clamp(point.z, -3.5, 4.2));
  }

  private startTrain(): void {
    if (!this.context) return;
    this.trainRunning = true;
    this.trainDistance = 0;
    this.context.sfx('chime');
    this.context.speak('れっしゃ しゅっぱつ！');
  }

  private update(delta: number): void {
    const now = performance.now();
    const time = now / 1000;
    this.particles?.update(delta);
    this.cameraPulse?.update(delta);
    for (const car of this.cars) {
      if (!car.attached && car.rejectUntil && now < car.rejectUntil) {
        car.group.rotation.z = Math.sin(time * 24) * 0.07;
      } else if (car.bounceUntil && now < car.bounceUntil) {
        const progress = 1 - (car.bounceUntil - now) / 430;
        car.group.position.y = Math.sin(progress * Math.PI) * 0.28;
        car.group.scale.setScalar(0.95 * (1 + Math.sin(progress * Math.PI) * 0.07));
      } else if (!car.dragging) {
        car.group.rotation.z = 0;
        car.group.position.y = 0;
        car.group.scale.setScalar(1);
      }
    }

    if (this.guideGroup && this.couplingRing && this.guideArrow) {
      const hasTarget = this.currentTarget() !== null;
      this.guideGroup.visible = hasTarget;
      if (hasTarget) {
        this.couplingRing.material.opacity = 0.7 + Math.sin(time * 3.4) * 0.2;
        this.couplingRing.scale.setScalar(1 + Math.sin(time * 3.4) * 0.06);
        this.guideArrow.position.y = 0.12 + Math.sin(time * 4.2) * 0.045;
        this.guideGroup.position.x = this.guideBaseX + Math.sin(time * 2.6) * 0.14;
      }
    }

    if (this.sparkleUntil && now >= this.sparkleUntil) {
      this.clearSparkles();
      this.sparkleUntil = 0;
    }

    if (this.shakeUntil && now < this.shakeUntil && this.locomotive) {
      const shakeProgress = 1 - (this.shakeUntil - now) / 640;
      const shake = Math.sin(shakeProgress * Math.PI * 6) * (1 - shakeProgress) * 0.035;
      this.locomotive.position.x = shake;
      for (const car of this.cars) {
        if (car.attached) car.group.position.x = -shake * 0.8;
      }
    } else if (this.shakeUntil) {
      this.shakeUntil = 0;
      if (this.locomotive) this.locomotive.position.x = 0;
      for (const car of this.cars) {
        if (car.attached) car.group.position.x = 0;
      }
    }

    if (!this.trainRunning || !this.locomotive) return;
    const speedFactor = Math.min(1, 0.35 + this.trainDistance / 12);
    const speed = delta * 7 * speedFactor;
    this.trainDistance += speed;
    this.locomotive.position.z -= speed;
    this.locomotive.position.y = Math.sin(time * 11) * 0.018;
    this.cameraPulse?.trigger();
    let cursorZ = this.locomotive.position.z;
    for (const car of this.cars) {
      cursorZ += COUPLING_SPACING;
      car.group.position.z = cursorZ;
      car.group.position.x = Math.sin(performance.now() / 500 + cursorZ) * 0.04;
      car.group.position.y = Math.sin(time * 10 + cursorZ * 1.7) * 0.016;
    }
    if (this.trainDistance > 48) {
      this.trainRunning = false;
      this.resetPositions();
    }
  }

  private resetPositions(): void {
    if (!this.context) return;
    this.resetTimer = undefined;
    this.hud?.setProgress(0, 3);
    for (const car of this.cars) car.bounceUntil = undefined;
    this.shakeUntil = 0;
    this.refreshGuide();
    if (!this.locomotive) return;
    this.locomotive.position.set(0, 0, LOCOMOTIVE_Z);
    for (const car of this.cars) {
      car.attached = false;
      car.group.scale.setScalar(0.95);
      const startX = car.color === 'red' ? -5.4 : car.color === 'blue' ? 5.2 : -2.6;
      car.group.position.set(startX, 0, 3.2 + (car.color === 'green' ? 1.6 : Math.random() * 0.8));
    }
  }
}
