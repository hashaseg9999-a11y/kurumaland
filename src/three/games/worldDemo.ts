import { createCar } from '../cars';
import type { GameContext, GameModule } from '../contracts';
import type * as THREE from 'three';

export class WorldDemoGame implements GameModule {
  readonly id = 'world-demo';
  private cleanup: Array<() => void> = [];
  private car?: THREE.Group;

  mount(context: GameContext): void {
    this.car = createCar('red', 1);
    this.car.position.set(-2.6, 0, 7);
    context.world.add(this.car);
    this.cleanup.push(context.world.onUpdate((delta, elapsed) => this.update(delta, elapsed)));
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    this.cleanup = [];
    this.car?.removeFromParent();
  }

  private update(delta: number, elapsed: number): void {
    if (!this.car) return;
    const speed = 5 * delta;
    this.car.position.z -= speed;
    if (this.car.position.z < -45) this.car.position.z = 7;
    this.car.rotation.y = Math.PI + Math.sin(elapsed * 2.4) * 0.04;
  }
}
