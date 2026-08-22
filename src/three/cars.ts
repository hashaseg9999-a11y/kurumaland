import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three';
import type { CarColorName } from './contracts';

const COLORS: Record<CarColorName, string> = {
  red: '#ef5350',
  blue: '#42a5f5',
  yellow: '#ffca28',
  green: '#66bb6a',
};

export function createCar(color: CarColorName, scale = 1): Group {
  const bodyColor = COLORS[color];
  const bodyGeometry = new BoxGeometry(1.35, 0.72, 2.45);
  const roofGeometry = new BoxGeometry(1.18, 0.58, 1.22);
  const wheelGeometry = new CylinderGeometry(0.34, 0.34, 0.24, 20);
  const lightGeometry = new BoxGeometry(0.22, 0.14, 0.08);
  const faceGeometry = new SphereGeometry(0.13, 16, 16);
  const bodyMaterial = new MeshStandardMaterial({ color: bodyColor, roughness: 0.32 });
  const roofMaterial = new MeshStandardMaterial({ color: bodyColor, roughness: 0.42 });
  const glassMaterial = new MeshStandardMaterial({
    color: '#cfefff',
    roughness: 0.12,
    transparent: true,
    opacity: 0.82,
  });
  const wheelMaterial = new MeshStandardMaterial({ color: '#37474f' });
  const lightMaterial = new MeshStandardMaterial({ color: '#fff8d6', emissive: '#ffd54f', emissiveIntensity: 0.4 });
  const darkMaterial = new MeshStandardMaterial({ color: '#3e2723' });
  const whiteMaterial = new MeshStandardMaterial({ color: '#ffffff' });
  const car = new Group();
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.68;
  const cabin = new Mesh(roofGeometry, glassMaterial);
  cabin.position.set(0, 1.25, -0.05);
  const roof = new Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, 1.52, -0.05);
  roof.scale.set(0.94, 0.22, 0.88);
  car.add(body, cabin, roof);
  for (const [x, z] of [[-0.72, 0.78], [0.72, 0.78], [-0.72, -0.82], [0.72, -0.82]] as const) {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x!, 0.34, z!);
    car.add(wheel);
  }
  for (const x of [-0.38, 0.38]) {
    const headlight = new Mesh(lightGeometry, lightMaterial);
    headlight.position.set(x!, 0.75, 1.23);
    car.add(headlight);
    const taillight = new Mesh(lightGeometry, new MeshStandardMaterial({ color: '#ff8a80', emissive: '#e53935', emissiveIntensity: 0.25 }));
    taillight.position.set(x!, 0.75, -1.23);
    car.add(taillight);
  }
  for (const x of [-0.26, 0.26]) {
    const eye = new Mesh(faceGeometry, whiteMaterial);
    eye.position.set(x!, 1.02, 1.24);
    eye.scale.set(1, 1, 0.55);
    const pupil = new Mesh(faceGeometry, darkMaterial);
    pupil.position.set(x!, 1.03, 1.29);
    pupil.scale.set(0.52, 0.52, 0.3);
    car.add(eye, pupil);
  }
  const smile = new Mesh(new TorusGeometry(0.19, 0.04, 10, 20, Math.PI), darkMaterial);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.9, 1.24);
  car.add(smile);
  car.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  car.scale.setScalar(scale);
  return car;
}
