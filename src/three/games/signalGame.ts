import * as THREE from 'three';
import { createCar } from '../cars';
import type { GameContext, GameModule } from '../contracts';

export class SignalGame implements GameModule {
  readonly id = 'signal';
  private context: GameContext | null = null;
  private cleanup: Array<() => void> = [];
  private car!: THREE.Group;
  private lamp!: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private greenLamp?: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private isGo = false;
  private distance = 0;
  private resetAt = Number.POSITIVE_INFINITY;

  mount(context: GameContext): void {
    this.context = context;
    context.world.setCameraPreset('drive');
    this.car = createCar('red');
    this.car.position.set(-2.6, 0, 7);
    this.car.rotation.y = Math.PI;
    this.buildTrafficLight();
    context.world.add(this.car);
    this.cleanup.push(
      context.world.onPointerDown((_event, raycaster) => {
        if (raycaster.intersectObject(this.lamp, true).length) {
          this.toggleSignal();
        }
      }),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    this.cleanup = [];
    this.car?.removeFromParent();
    this.context = null;
  }

  private buildTrafficLight(): void {
    if (!this.context) return;
    const poleGeometry = new THREE.CylinderGeometry(0.09, 0.11, 2.6);
    const boxGeometry = new THREE.BoxGeometry(0.85, 2.15, 0.45);
    const lensGeometry = new THREE.CylinderGeometry(0.27, 0.27, 0.07, 24);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: '#607d8b' });
    const boxMaterial = new THREE.MeshStandardMaterial({ color: '#37474f' });
    this.lamp = new THREE.Mesh(lensGeometry, new THREE.MeshStandardMaterial({ color: '#ff5252', emissive: '#e53935', emissiveIntensity: 1 }));
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    pole.position.set(3.2, 1.3, -4);
    box.position.set(3.2, 3.2, -4);
    this.lamp.rotation.x = Math.PI / 2;
    this.lamp.position.set(3.2, 3.95, -3.76);
    this.context.world.add(pole, box, this.lamp);
    const smallLamp = new THREE.Mesh(lensGeometry, new THREE.MeshStandardMaterial({ color: '#4caf50', emissive: '#43a047', emissiveIntensity: 0.06 }));
    smallLamp.rotation.x = Math.PI / 2;
    smallLamp.position.set(3.2, 2.65, -3.76);
    this.greenLamp = smallLamp;
    this.context.world.add(smallLamp);
  }

  private toggleSignal(): void {
    if (!this.context || !this.greenLamp) return;
    this.isGo = !this.isGo;
    this.lamp.material.color.set(this.isGo ? '#666666' : '#ff5252');
    this.lamp.material.emissiveIntensity = this.isGo ? 0.08 : 1;
    this.greenLamp.material.color.set(this.isGo ? '#00e676' : '#666666');
    this.greenLamp.material.emissiveIntensity = this.isGo ? 1 : 0.06;
    this.context.sfx(this.isGo ? 'chime' : 'horn');
    this.context.speak(this.isGo ? 'あお！ ごー！' : 'あか！ とまれ！');
    if (this.isGo) this.distance = 0;
  }

  private update(delta: number): void {
    if (!this.context || !this.greenLamp) return;
    const time = performance.now() / 1000;
    if (time >= this.resetAt) {
      this.reset();
      return;
    }
    if (this.isGo) {
      const speed = 6.2;
      const move = speed * delta;
      this.car.position.z -= move;
      this.distance += move;
      this.car.rotation.y = Math.PI + Math.sin(time * 9) * 0.025;
      if (this.distance > 46) {
        this.resetAt = time + 1.1;
        this.toggleSignal();
        this.context.complete();
        this.context.speak('よくできたね！');
      }
    }
  }

  private reset(): void {
    this.resetAt = Number.POSITIVE_INFINITY;
    this.distance = 0;
    this.car.position.set(-2.6, 0, 7);
    this.car.rotation.y = Math.PI;
  }
}
