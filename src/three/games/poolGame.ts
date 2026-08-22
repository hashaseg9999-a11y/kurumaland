import * as THREE from 'three';
import { type GameContext, type GameModule } from '../contracts';

interface Ball3D {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  velocity: THREE.Vector3;
  radius: number;
  dragging: boolean;
  lastEvent?: PointerEvent;
}

const GRAVITY = 13;
const BONUS_DISTANCE = 5.2;
const BONUS_DURATION_MS = 2600;
const BALL_COLORS = ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a', '#ab47bc', '#26c6da'];

export class PoolGame implements GameModule {
  readonly id = 'ball-pool';
  private context: GameContext | null = null;
  private cleanup: Array<() => void> = [];
  private balls: Ball3D[] = [];
  private dragged: Ball3D | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;
  private dragDistance = 0;
  private bonusUntil = 0;
  private nextBonusPulseAt = 0;
  private bonusTimeout?: number;

  mount(context: GameContext): void {
    this.context = context;
    context.world.setCameraPreset('pool');
    for (let i = 0; i < 10; i++) this.createBall(i);
    this.cleanup.push(
      context.world.onPointerDown((event, raycaster) => this.startDrag(event, raycaster)),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    if (this.bonusTimeout) window.clearTimeout(this.bonusTimeout);
    for (const ball of this.balls) ball.mesh.removeFromParent();
    this.balls = [];
    this.cleanup = [];
    this.context = null;
  }

  private createBall(index: number): void {
    if (!this.context) return;
    const radius = 0.52 + Math.random() * 0.18;
    const geometry = new THREE.SphereGeometry(radius, 28, 28);
    const material = new THREE.MeshStandardMaterial({ color: BALL_COLORS[index % BALL_COLORS.length]!, roughness: 0.24 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.set(-4 + Math.random() * 8, radius + Math.random() * 4, -2 + Math.random() * 8);
    this.context.world.add(mesh);
    this.balls.push({ mesh, velocity: new THREE.Vector3(), radius, dragging: false });
  }

  private startDrag(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.context || this.pointerId !== null) return;
    const hit = raycaster.intersectObjects(this.balls.map((ball) => ball.mesh), false)[0];
    const found = hit ? this.balls.find((ball) => ball.mesh === hit.object) : undefined;
    if (!found || !hit) return;
    this.dragged = found;
    this.pointerId = event.pointerId;
    found.dragging = true;
    found.velocity.set(0, 0, 0);
    found.lastEvent = event;
    this.dragDistance = 0;
    try { this.context.world.renderer.domElement.setPointerCapture(event.pointerId); } catch {}
    this.attachMoveAndRelease();
    this.context.sfx('pop');
  }

  private attachMoveAndRelease(): void {
    if (!this.context || this.moveAttached) return;
    this.moveAttached = true;
    const canvas = this.context.world.renderer.domElement;
    let previousTime = performance.now();
    const move = (event: PointerEvent): void => {
      const ball = this.dragged;
      if (!ball || event.pointerId !== this.pointerId) return;
      const now = performance.now();
      const elapsed = Math.max(16, now - previousTime) / 1000;
      const before = ball.mesh.position.clone();
      ball.lastEvent = event;
      this.moveBallToPointer(ball, event);
      const moved = before.distanceTo(ball.mesh.position);
      this.dragDistance += moved;
      ball.velocity.copy(ball.mesh.position).sub(before).divideScalar(elapsed);
      previousTime = now;
      if (this.dragDistance >= BONUS_DISTANCE && Date.now() >= this.bonusUntil) this.triggerBonus();
    };
    const release = (): void => {
      const ball = this.dragged;
      if (!ball) return;
      ball.dragging = false;
      const maxSpeed = 15;
      if (ball.velocity.length() > maxSpeed) ball.velocity.setLength(maxSpeed);
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

  private moveBallToPointer(ball: Ball3D, event: PointerEvent): void {
    if (!this.context) return;
    const rect = this.context.world.renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const vector = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(this.context.world.camera);
    const direction = vector.sub(this.context.world.camera.position).normalize();
    const distance = -(this.context.world.camera.position.y - ball.radius) / direction.y;
    const point = this.context.world.camera.position.clone().add(direction.multiplyScalar(distance));
    ball.mesh.position.set(THREE.MathUtils.clamp(point.x, -5.2, 5.2), Math.max(ball.radius, point.y), THREE.MathUtils.clamp(point.z, -7, 9));
  }

  private triggerBonus(): void {
    if (!this.context) return;
    this.dragDistance = 0;
    this.bonusUntil = Date.now() + BONUS_DURATION_MS;
    this.nextBonusPulseAt = performance.now() + 320;
    if (this.bonusTimeout) window.clearTimeout(this.bonusTimeout);
    this.bonusTimeout = window.setTimeout(() => { this.bonusUntil = 0; }, BONUS_DURATION_MS);
    this.context.sfx('chime');
    this.context.speak('やったー！ ボーナス！');
    this.context.complete();
    for (const ball of this.balls) {
      if (ball.dragging) continue;
      ball.velocity.x += (Math.random() - 0.5) * 7;
      ball.velocity.y = 8 + Math.random() * 6;
    }
  }

  private update(delta: number): void {
    const time = performance.now();
    for (const ball of this.balls) {
      if (!ball.dragging) {
        ball.velocity.y -= GRAVITY * delta;
        ball.mesh.position.addScaledVector(ball.velocity, delta);
        if (ball.mesh.position.y < ball.radius) {
          ball.mesh.position.y = ball.radius;
          ball.velocity.y = Math.abs(ball.velocity.y) * 0.72;
          if (Math.abs(ball.velocity.y) > 1.2) this.context?.sfx('pop');
        }
        if (Math.abs(ball.mesh.position.x) > 5.2) {
          ball.mesh.position.x = Math.sign(ball.mesh.position.x) * 5.2;
          ball.velocity.x *= -0.72;
        }
        if (ball.mesh.position.z > 9) { ball.mesh.position.z = 9; ball.velocity.z *= -0.72; }
        if (ball.mesh.position.z < -7) { ball.mesh.position.z = -7; ball.velocity.z *= -0.72; }
      }
    }
    if (Date.now() < this.bonusUntil && time >= this.nextBonusPulseAt) {
      this.nextBonusPulseAt = time + 340;
      for (const ball of this.balls) {
        if (ball.dragging || Math.random() < 0.25) continue;
        ball.velocity.y = 7 + Math.random() * 5;
        ball.velocity.x += (Math.random() - 0.5) * 3;
      }
    }
  }
}
