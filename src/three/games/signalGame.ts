import * as THREE from 'three';
import { createEmergencyVehicle, pickRandomEmergencyType } from '../emergencyVehicles';
import type { GameContext, GameModule } from '../contracts';
import { removeAndDispose } from '../objectCleanup';
import { createGameHud } from '../gameHud';

export class SignalGame implements GameModule {
  readonly id = 'signal';
  private context: GameContext | null = null;
  private hud: ReturnType<typeof createGameHud> | null = null;
  private cleanup: Array<() => void> = [];
  private car: THREE.Group | null = null;
  private beacon?: THREE.PointLight;
  private beaconAssembly?: THREE.Group;
  private wheels: THREE.Group[] = [];
  private hoseReel?: THREE.Group;
  private leftLamp?: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private rightLamp?: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private beaconColors: [string, string] = ['#ff1744', '#2979ff'];
  private beaconPulse = 0;
  private lamp!: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private signalHit?: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private greenLamp?: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private isGo = false;
  private distance = 0;
  private resetAt = Number.POSITIVE_INFINITY;
  private nextSirenAt = 0;
  private vehicleLabel = '';

  mount(context: GameContext): void {
    this.context = context;
    this.hud = createGameHud(context, 'しんごうで GO!');
    this.hud.setProgress(0, 1);
    context.world.setCameraPreset('drive');
    this.createRandomVehicle();
    this.buildTrafficLight();
    this.cleanup.push(
      context.world.onPointerDown((_event, raycaster) => {
        if (this.signalHit && raycaster.intersectObject(this.signalHit, false).length) {
          this.toggleSignal();
        }
      }),
      context.world.onUpdate((delta) => this.update(delta)),
    );
  }

  unmount(): void {
    for (const off of this.cleanup) off();
    this.hud?.dispose();
    this.cleanup = [];
    if (this.car) removeAndDispose(this.car);
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
    const hitGeometry = new THREE.BoxGeometry(1.35, 3.7, 1.25);
    const hitMaterial = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.signalHit = new THREE.Mesh(hitGeometry, hitMaterial);
    this.signalHit.position.set(3.2, 2.35, -4);
    this.context.world.add(this.signalHit);
    const smallLamp = new THREE.Mesh(lensGeometry, new THREE.MeshStandardMaterial({ color: '#4caf50', emissive: '#43a047', emissiveIntensity: 0.06 }));
    smallLamp.rotation.x = Math.PI / 2;
    smallLamp.position.set(3.2, 2.65, -3.76);
    this.greenLamp = smallLamp;
    this.context.world.add(smallLamp);
  }

  private createRandomVehicle(): void {
    if (!this.context) return;
    if (this.car) removeAndDispose(this.car);
    this.car = null;
    const type = pickRandomEmergencyType();
    const vehicle = createEmergencyVehicle(type);
    this.car = vehicle.group;
    this.beacon = vehicle.beacon;
    this.beaconAssembly = vehicle.beaconAssembly;
    this.wheels = [];
    this.hoseReel = undefined;
    vehicle.group.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.isEmergencyWheel) {
        this.wheels.push(child);
      }
      if (child instanceof THREE.Group && child.userData.animate === 'hose-reel') {
        this.hoseReel = child;
      }
    });
    this.leftLamp = vehicle.leftLamp;
    this.rightLamp = vehicle.rightLamp;
    this.beaconColors = vehicle.beaconColors;
    this.vehicleLabel = type === 'fire-truck' ? 'しょうぼうしゃ' : type === 'ambulance' ? 'きゅうきゅうしゃ' : 'パトカー';
    this.car!.position.set(-1.6, 0, 7);
    this.car!.rotation.y = Math.PI;
    this.context.world.setCameraPreset('drive');
    this.context.world.add(this.car);
  }

  private toggleSignal(): void {
    if (!this.context || !this.greenLamp) return;
    this.isGo = !this.isGo;
    this.lamp.material.color.set(this.isGo ? '#666666' : '#ff5252');
    this.lamp.material.emissiveIntensity = this.isGo ? 0.08 : 1;
    this.greenLamp.material.color.set(this.isGo ? '#00e676' : '#666666');
    this.greenLamp.material.emissiveIntensity = this.isGo ? 1 : 0.06;
    this.context.sfx(this.isGo ? 'chime' : 'horn');
    this.context.speak(this.isGo ? `あお！ ${this.vehicleLabel}、ごー！` : 'あか！ とまれ！');
    if (this.isGo && this.beacon) {
      // Start the looping siren from update() while the beacon rotates.
      this.nextSirenAt = performance.now();
    }
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
      const car = this.car;
      if (!car) return;
      car.position.z -= move;
      car.position.y = Math.sin(time * 13) * 0.022;
      this.distance += move;
      this.context.world.camera.position.x = car.position.x * 0.5;
      this.context.world.camera.position.y = 4.6;
      this.context.world.camera.position.z = car.position.z + 4.8;
      this.context.world.camera.lookAt(car.position.x * 0.45, 0.9, car.position.z - 6);
      const now = performance.now();
      if (now >= this.nextSirenAt) {
        this.context.sfx(this.vehicleLabel === 'パトカー' ? 'policeSiren' : 'siren');
        this.nextSirenAt = now + (this.vehicleLabel === 'パトカー' ? 620 : 740);
      }
      car.rotation.y = Math.PI + Math.sin(time * 9) * 0.025;
      if (this.beacon) {
        this.beaconPulse += delta * 9;
        const pulse = (Math.sin(this.beaconPulse) + 1) / 2;
        this.beacon.intensity = pulse * 3.4;
        if (this.beaconAssembly) {
          this.beaconAssembly.rotation.y += delta * 8.5;
        }
        const leftPhase = Math.sin(this.beaconPulse) > 0 ? 1.6 : 0.12;
        const rightPhase = leftPhase > 1 ? 0.12 : 1.6;
        if (this.leftLamp) {
          this.leftLamp.material.emissive.set(leftPhase > 1 ? this.beaconColors[0]! : '#4b5563');
          this.leftLamp.material.emissiveIntensity = leftPhase > 1 ? 2.2 : 0.3;
        }
        if (this.rightLamp) {
          this.rightLamp.material.emissive.set(rightPhase > 1 ? this.beaconColors[1]! : '#4b5563');
          this.rightLamp.material.emissiveIntensity = rightPhase > 1 ? 2.2 : 0.3;
        }
      }
      for (const wheel of this.wheels) {
        wheel.rotation.x -= delta * speed / 0.41;
      }
      if (this.hoseReel) {
        this.hoseReel.rotation.x -= delta * 2.6;
      }
      if (this.distance > 46) {
        this.resetAt = time + 1.1;
        this.toggleSignal();
        this.context.complete();
        this.context.speak('よくできたね！');
        this.hud?.setProgress(1, 1);
        this.hud?.celebrate('すごい！');
      }
    }
  }

  private reset(): void {
    this.resetAt = Number.POSITIVE_INFINITY;
    this.hud?.setProgress(0, 1);
    this.distance = 0;
    if (this.car) {
    this.car.position.set(-1.6, 0, 7);
      this.car.rotation.y = Math.PI;
      this.car.position.y = 0;
    }
    if (this.beaconAssembly) {
      this.beaconAssembly.rotation.set(0, 0, 0);
    }
    for (const wheel of this.wheels) {
      wheel.rotation.set(0, 0, 0);
    }
    if (this.hoseReel) {
      this.hoseReel.rotation.set(0, 0, 0);
    }
    if (this.beacon) this.beacon.intensity = 0;
    if (this.leftLamp) {
      this.leftLamp.material.emissive.set(this.beaconColors[0]!);
      this.leftLamp.material.emissiveIntensity = 1.4;
    }
    if (this.rightLamp) {
      this.rightLamp.material.emissive.set(this.beaconColors[1]!);
      this.rightLamp.material.emissiveIntensity = 1.4;
    }
    void this.createRandomVehicle();
  }
}
