import * as THREE from 'three';
import { type GameContext, type GameModule } from '../contracts';
import { removeAndDispose } from '../objectCleanup';
import { createCameraMicroPulse, createGameHud, createParticleBurst } from '../gameHud';

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
const POOL_MIN_X = -6.6;
const POOL_MAX_X = 6.6;
const POOL_MIN_Z = -9.5;
const POOL_MAX_Z = 6.5;

export class PoolGame implements GameModule {
  readonly id = 'ball-pool';
  private context: GameContext | null = null;
  private hud: ReturnType<typeof createGameHud> | null = null;
  private cleanup: Array<() => void> = [];
  private balls: Ball3D[] = [];
  private dragged: Ball3D | null = null;
  private pointerId: number | null = null;
  private moveAttached = false;
  private dragDistance = 0;
  private bonusUntil = 0;
  private nextBonusPulseAt = 0;
  private bonusTimeout?: number;
  private boundary?: THREE.Group;
  private particles: ReturnType<typeof createParticleBurst> | null = null;
  private cameraPulse: ReturnType<typeof createCameraMicroPulse> | null = null;

  mount(context: GameContext): void {
    this.context = context;
    this.hud = createGameHud(context, 'ぼーるぷーる');
    this.hud.setProgress(0, 0);
    context.world.setCameraPreset('pool');
    this.particles = createParticleBurst(context.world);
    this.cameraPulse = createCameraMicroPulse(context.world);
    this.createBoundary();
    for (let i = 0; i < 10; i++) this.createBall(i);
    this.cleanup.push(
      context.world.onPointerDown((event, raycaster) => this.startDrag(event, raycaster)),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    this.hud?.dispose();
    if (this.bonusTimeout) window.clearTimeout(this.bonusTimeout);
    this.particles?.dispose();
    this.cameraPulse?.dispose();
    this.particles = null;
    this.cameraPulse = null;
    if (this.boundary) removeAndDispose(this.boundary);
    this.boundary = undefined;
    for (const ball of this.balls) removeAndDispose(ball.mesh);
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
    mesh.position.set(-5 + Math.random() * 10, radius + Math.random() * 3, -4 + Math.random() * 8.5);
    this.context.world.add(mesh);
    this.balls.push({ mesh, velocity: new THREE.Vector3(), radius, dragging: false });
  }

  private createBoundary(): void {
    if (!this.context) return;
    const width = POOL_MAX_X - POOL_MIN_X;
    const depth = POOL_MAX_Z - POOL_MIN_Z;
    const centerZ = (POOL_MIN_Z + POOL_MAX_Z) / 2;
    const boundary = new THREE.Group();

    const outer = new THREE.Mesh(
      new THREE.ShapeGeometry(this.createRoundedRectangle(width + 0.44, depth + 0.44, 0.72), 10),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82 }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(0, 0.02, centerZ);
    outer.receiveShadow = true;

    const inner = new THREE.Mesh(
      new THREE.ShapeGeometry(this.createRoundedRectangle(width, depth, 0.58), 10),
      new THREE.MeshStandardMaterial({ color: '#dff0ff', roughness: 0.92 }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(0, 0.045, centerZ);
    inner.receiveShadow = true;

    boundary.add(outer, inner);
    this.context.world.add(boundary);
    this.boundary = boundary;
  }

  private createRoundedRectangle(width: number, depth: number, radius: number): THREE.Shape {
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    shape.moveTo(-halfWidth + radius, -halfDepth);
    shape.lineTo(halfWidth - radius, -halfDepth);
    shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + radius);
    shape.lineTo(halfWidth, halfDepth - radius);
    shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - radius, halfDepth);
    shape.lineTo(-halfWidth + radius, halfDepth);
    shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - radius);
    shape.lineTo(-halfWidth, -halfDepth + radius);
    shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + radius, -halfDepth);
    return shape;
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
      canvas.removeEventListener('lostpointercapture', release);
      this.moveAttached = false;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
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
    ball.mesh.position.set(
      THREE.MathUtils.clamp(point.x, POOL_MIN_X, POOL_MAX_X),
      Math.max(ball.radius, point.y),
      THREE.MathUtils.clamp(point.z, POOL_MIN_Z, POOL_MAX_Z),
    );
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
    const draggedBall = this.balls.find((ball) => ball.dragging);
    if (draggedBall) {
      this.particles?.burst(
        { x: draggedBall.mesh.position.x, y: draggedBall.mesh.position.y + 0.4, z: draggedBall.mesh.position.z },
        { count: 18 },
      );
    }
    this.cameraPulse?.trigger();
    for (const ball of this.balls) {
      if (ball.dragging) continue;
      ball.velocity.x += (Math.random() - 0.5) * 7;
      ball.velocity.y = 8 + Math.random() * 6;
    }
  }

  private update(delta: number): void {
    const time = performance.now();
    this.particles?.update(delta);
    this.cameraPulse?.update(delta);
    for (const ball of this.balls) {
      if (!ball.dragging) {
        ball.velocity.y -= GRAVITY * delta;
        ball.velocity.x *= 1 - Math.min(0.6, delta * 0.35);
        ball.velocity.z *= 1 - Math.min(0.6, delta * 0.35);
        ball.mesh.position.addScaledVector(ball.velocity, delta);
        if (ball.mesh.position.y < ball.radius) {
          ball.mesh.position.y = ball.radius;
          ball.velocity.y = Math.abs(ball.velocity.y) * 0.66;
          if (Math.abs(ball.velocity.y) > 1.2) this.context?.sfx('pop');
          if (Math.abs(ball.velocity.y) > 2.2 && this.particles) {
            this.particles.burst(
              { x: ball.mesh.position.x, y: 0.25, z: ball.mesh.position.z },
              { count: 5 },
            );
          }
        }
        if (Math.abs(ball.mesh.position.x) > POOL_MAX_X) {
          ball.mesh.position.x = Math.sign(ball.mesh.position.x) * POOL_MAX_X;
          ball.velocity.x *= -0.72;
        }
        if (ball.mesh.position.z > POOL_MAX_Z) { ball.mesh.position.z = POOL_MAX_Z; ball.velocity.z *= -0.72; }
        if (ball.mesh.position.z < POOL_MIN_Z) { ball.mesh.position.z = POOL_MIN_Z; ball.velocity.z *= -0.72; }
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

    // Ball-to-ball elastic collisions (simple impulse exchange).
    for (let a = 0; a < this.balls.length; a += 1) {
      const first = this.balls[a]!;
      for (let b = a + 1; b < this.balls.length; b += 1) {
        const second = this.balls[b]!;
        const deltaPosition = second.mesh.position.clone().sub(first.mesh.position);
        const distance = deltaPosition.length();
        const minDistance = first.radius + second.radius;
        if (distance >= minDistance || distance === 0) continue;
        const normal = deltaPosition.divideScalar(distance);
        const overlap = minDistance - distance;
        const firstStatic = first.dragging;
        const secondStatic = second.dragging;
        if (!firstStatic && !secondStatic) {
          first.mesh.position.addScaledVector(normal, -overlap / 2);
          second.mesh.position.addScaledVector(normal, overlap / 2);
        } else if (firstStatic && !secondStatic) {
          second.mesh.position.addScaledVector(normal, overlap);
        } else if (!firstStatic && secondStatic) {
          first.mesh.position.addScaledVector(normal, -overlap);
        }
        const relativeVelocity = second.velocity.clone().sub(first.velocity);
        const separatingSpeed = relativeVelocity.dot(normal);
        if (separatingSpeed >= 0) continue;
        const impulseMagnitude = -separatingSpeed * 0.5;
        if (!firstStatic) first.velocity.addScaledVector(normal, -impulseMagnitude * 0.78);
        if (!secondStatic) second.velocity.addScaledVector(normal, impulseMagnitude * 0.78);
        if (Math.abs(separatingSpeed) > 2.4 && this.particles) {
          this.particles.burst(
            {
              x: first.mesh.position.x + normal.x * first.radius,
              y: Math.max(0.3, (first.mesh.position.y + second.mesh.position.y) / 2),
              z: first.mesh.position.z + normal.z * first.radius,
            },
            { count: 4 },
          );
        }
      }
    }
  }
}
