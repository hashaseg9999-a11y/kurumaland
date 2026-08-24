import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { CarColorName } from './contracts';

export const CAR_COLORS: Record<CarColorName, string> = {
  red: '#e53946',
  blue: '#2f8fe8',
  yellow: '#ffc233',
  green: '#4fbf67',
};

export type CarSilhouette = 'sedan' | 'van' | 'truck';

export function createCar(color: CarColorName, scale = 1, silhouette: CarSilhouette = 'sedan'): Group {
  const bodyColor = CAR_COLORS[color];
  const car = new Group();

  const wheelGeometry = new CylinderGeometry(0.36, 0.36, 0.27, 26, 1);
  const hubGeometry = new CylinderGeometry(0.19, 0.19, 0.29, 18, 1);
  const lightGeometry = new BoxGeometry(0.28, 0.16, 0.08);
  const faceGeometry = new SphereGeometry(0.14, 22, 22);

  const paintMaterial = new MeshPhysicalMaterial({
    color: bodyColor,
    roughness: 0.18,
    metalness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const accentMaterial = new MeshStandardMaterial({ color: bodyColor, roughness: 0.34 });
  const glassMaterial = new MeshPhysicalMaterial({
    color: '#d8f6ff',
    roughness: 0.05,
    metalness: 0.04,
    transparent: true,
    opacity: 0.72,
  });
  const tyreMaterial = new MeshStandardMaterial({ color: '#2b3238', roughness: 0.82 });
  const hubMaterial = new MeshStandardMaterial({ color: '#dfe7ec', metalness: 0.72, roughness: 0.24 });
  const headlightMaterial = new MeshStandardMaterial({ color: '#fffbe6', emissive: '#ffe27a', emissiveIntensity: 0.65 });
  const taillightMaterial = new MeshStandardMaterial({ color: '#ff8a80', emissive: '#e53935', emissiveIntensity: 0.35 });
  const whiteMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 });
  const darkMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.3 });

  let faceEyeY = 1.06;
  let faceSmileY = 0.94;
  let headlightY = 0.78;
  let taillightY = 0.78;

  const wheelPositions: ReadonlyArray<readonly [number, number]> =
    silhouette === 'truck'
      ? [[-0.74, 0.98], [0.74, 0.98], [-0.74, -0.98], [0.74, -0.98]]
      : [[-0.74, 0.84], [0.74, 0.84], [-0.74, -0.86], [0.74, -0.86]];

  if (silhouette === 'van') {
    const lowerGeometry = new BoxGeometry(1.42, 0.58, 2.62);
    const bodyGeometry = new BoxGeometry(1.36, 1.06, 2.5, 3, 2, 4);
    const roofCapGeometry = new BoxGeometry(1.28, 0.12, 2.34);
    const windshieldGeometry = new BoxGeometry(1.14, 0.52, 0.06);
    const sideGlassGeometry = new BoxGeometry(0.04, 0.44, 1.8);
    const bumperGeometry = new BoxGeometry(1.44, 0.18, 0.14);
    const acUnitGeometry = new BoxGeometry(0.7, 0.1, 0.5);

    const lower = new Mesh(lowerGeometry, accentMaterial);
    lower.position.y = 0.66;
    const body = new Mesh(bodyGeometry, paintMaterial);
    body.position.set(0, 1.42, -0.04);
    const roofCap = new Mesh(roofCapGeometry, accentMaterial);
    roofCap.position.set(0, 1.99, -0.04);
    const windshield = new Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, 1.58, 1.22);
    windshield.rotation.x = -0.08;
    const leftSideGlass = new Mesh(sideGlassGeometry, glassMaterial);
    leftSideGlass.position.set(-0.69, 1.58, -0.1);
    const rightSideGlass = new Mesh(sideGlassGeometry.clone(), glassMaterial);
    rightSideGlass.position.set(0.69, 1.58, -0.1);
    const frontBumper = new Mesh(bumperGeometry, darkMaterial);
    frontBumper.position.set(0, 0.52, 1.34);
    const rearBumper = new Mesh(bumperGeometry.clone(), darkMaterial);
    rearBumper.position.set(0, 0.52, -1.34);
    const acUnit = new Mesh(acUnitGeometry, whiteMaterial);
    acUnit.position.set(0, 2.09, 0.3);

    car.add(lower, body, roofCap, windshield, leftSideGlass, rightSideGlass,
      frontBumper, rearBumper, acUnit);

    faceEyeY = 1.52;
    faceSmileY = 1.38;
    headlightY = 0.92;
    taillightY = 1.3;
  } else if (silhouette === 'truck') {
    const chassisGeometry = new BoxGeometry(1.42, 0.42, 2.72);
    const cabGeometry = new BoxGeometry(1.38, 0.86, 1.08);
    const cabRoofGeometry = new BoxGeometry(1.3, 0.12, 1.0);
    const windshieldGeometry = new BoxGeometry(1.14, 0.4, 0.06);
    const sideWindowGeometry = new BoxGeometry(0.04, 0.34, 0.72);
    const grilleGeometry = new BoxGeometry(1.06, 0.2, 0.07);
    const bedFloorGeometry = new BoxGeometry(1.48, 0.1, 1.52);
    const bedSideGeometry = new BoxGeometry(0.08, 0.5, 1.52);
    const bedWallGeometry = new BoxGeometry(1.48, 0.5, 0.08);
    const exhaustGeometry = new CylinderGeometry(0.05, 0.05, 0.65, 10);
    const bumperGeometry = new BoxGeometry(1.44, 0.2, 0.14);

    const chassis = new Mesh(chassisGeometry, darkMaterial);
    chassis.position.y = 0.6;
    const cab = new Mesh(cabGeometry, paintMaterial);
    cab.position.set(0, 1.25, 0.78);
    const cabRoof = new Mesh(cabRoofGeometry, accentMaterial);
    cabRoof.position.set(0, 1.73, 0.78);
    const windshield = new Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, 1.4, 1.33);
    windshield.rotation.x = -0.12;
    const leftCabWindow = new Mesh(sideWindowGeometry, glassMaterial);
    leftCabWindow.position.set(-0.71, 1.44, 0.78);
    const rightCabWindow = new Mesh(sideWindowGeometry.clone(), glassMaterial);
    rightCabWindow.position.set(0.71, 1.44, 0.78);
    const grille = new Mesh(grilleGeometry, darkMaterial);
    grille.position.set(0, 0.94, 1.34);
    const bedFloor = new Mesh(bedFloorGeometry, accentMaterial);
    bedFloor.position.set(0, 0.92, -0.56);
    const bedLeftWall = new Mesh(bedSideGeometry, paintMaterial);
    bedLeftWall.position.set(-0.7, 1.22, -0.56);
    const bedRightWall = new Mesh(bedSideGeometry.clone(), paintMaterial);
    bedRightWall.position.set(0.7, 1.22, -0.56);
    const bedBackWall = new Mesh(bedWallGeometry, paintMaterial);
    bedBackWall.position.set(0, 1.22, -1.32);
    const bedFrontWall = new Mesh(bedWallGeometry.clone(), paintMaterial);
    bedFrontWall.position.set(0, 1.22, 0.18);
    const exhaustPipe = new Mesh(exhaustGeometry, hubMaterial);
    exhaustPipe.position.set(-0.62, 1.75, 0.22);
    const frontBumper = new Mesh(bumperGeometry, darkMaterial);
    frontBumper.position.set(0, 0.54, 1.38);
    const rearBumper = new Mesh(bumperGeometry.clone(), darkMaterial);
    rearBumper.position.set(0, 0.54, -1.38);

    car.add(chassis, cab, cabRoof, windshield, leftCabWindow, rightCabWindow,
      grille, bedFloor, bedLeftWall, bedRightWall, bedBackWall, bedFrontWall,
      exhaustPipe, frontBumper, rearBumper);

    faceEyeY = 1.42;
    faceSmileY = 1.28;
    headlightY = 0.76;
    taillightY = 0.98;
  } else {
    const lowerGeometry = new BoxGeometry(1.42, 0.58, 2.62, 3, 2, 4);
    const upperGeometry = new BoxGeometry(1.3, 0.52, 2.3, 3, 2, 4);
    const cabinGeometry = new BoxGeometry(1.16, 0.5, 1.24, 2, 2, 2);

    const lower = new Mesh(lowerGeometry, paintMaterial);
    lower.position.y = 0.66;
    const upper = new Mesh(upperGeometry, paintMaterial);
    upper.position.set(0, 1.12, -0.08);
    upper.scale.set(0.96, 1, 0.9);
    const cabin = new Mesh(cabinGeometry, glassMaterial);
    cabin.position.set(0, 1.24, -0.06);
    const roof = new Mesh(upperGeometry, accentMaterial);
    roof.position.set(0, 1.5, -0.08);
    roof.scale.set(0.82, 0.18, 0.74);
    car.add(lower, upper, cabin, roof);
  }

  for (const [x, z] of wheelPositions) {
    const wheel = new Group();
    const tyre = new Mesh(wheelGeometry, tyreMaterial);
    const hub = new Mesh(hubGeometry, hubMaterial);
    tyre.rotation.z = Math.PI / 2;
    hub.rotation.z = Math.PI / 2;
    wheel.add(tyre, hub);
    wheel.position.set(x!, 0.36, z!);
    car.add(wheel);
  }

  for (const x of [-0.42, 0.42]) {
    const headlight = new Mesh(lightGeometry, headlightMaterial);
    headlight.position.set(x!, headlightY, 1.32);
    car.add(headlight);
    const taillight = new Mesh(lightGeometry, taillightMaterial);
    taillight.position.set(x!, taillightY, -1.32);
    car.add(taillight);
  }

  for (const x of [-0.27, 0.27]) {
    const eye = new Mesh(faceGeometry, whiteMaterial);
    eye.position.set(x!, faceEyeY, 1.33);
    eye.scale.set(1, 1.05, 0.5);
    const pupil = new Mesh(faceGeometry, darkMaterial);
    pupil.position.set(x!, faceEyeY + 0.01, 1.4);
    pupil.scale.set(0.5, 0.52, 0.28);
    car.add(eye, pupil);
  }
  const smile = new Mesh(new TorusGeometry(0.2, 0.045, 12, 24, Math.PI), darkMaterial);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0, faceSmileY, 1.33);
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
