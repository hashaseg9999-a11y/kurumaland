import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { CarColorName } from './contracts';

export const CAR_COLORS: Record<CarColorName, string> = {
  red: '#e53946',
  blue: '#2f8fe8',
  yellow: '#ffc233',
  green: '#4fbf67',
};

export type CarSilhouette = 'sedan' | 'van' | 'truck';

function createWheelArch(): Mesh<TorusGeometry, MeshStandardMaterial> {
  const arch = new Mesh(
    new TorusGeometry(0.47, 0.055, 8, 18, Math.PI),
    new MeshStandardMaterial({ color: '#000000', roughness: 0.55 }),
  );
  arch.rotation.y = Math.PI / 2;
  return arch;
}

function createStyledWheel(): Group {
  const wheel = new Group();
  const wheelGeometry = new CylinderGeometry(0.37, 0.37, 0.28, 28);
  const wheelSideGeometry = new CylinderGeometry(0.39, 0.39, 0.055, 28);
  const sidewallGeometry = new TorusGeometry(0.372, 0.034, 8, 28);
  const hubGeometry = new CylinderGeometry(0.19, 0.19, 0.31, 18);
  const spokeGeometry = new RoundedBoxGeometry(0.3, 0.27, 0.08, 2, 0.03);
  const caliperGeometry = new RoundedBoxGeometry(0.1, 0.19, 0.13, 2, 0.03);
  const treadBlockGeometry = new BoxGeometry(0.06, 0.2, 0.3);
  const tyreMaterial = new MeshStandardMaterial({ color: '#23282d', roughness: 0.88 });
  const tyreSideMaterial = new MeshStandardMaterial({ color: '#3c444b', roughness: 0.72 });
  const hubMaterial = new MeshStandardMaterial({
    color: '#e3ebf0',
    metalness: 0.85,
    roughness: 0.18,
  });
  const caliperMaterial = new MeshStandardMaterial({
    color: '#e05a4e',
    metalness: 0.35,
    roughness: 0.38,
  });
  const tyre = new Mesh(wheelGeometry, tyreMaterial);
  const leftTyreSide = new Mesh(wheelSideGeometry, tyreSideMaterial);
  const rightTyreSide = new Mesh(wheelSideGeometry.clone(), tyreSideMaterial);
  const leftSidewall = new Mesh(sidewallGeometry, tyreSideMaterial);
  const rightSidewall = new Mesh(sidewallGeometry.clone(), tyreSideMaterial);
  const hub = new Mesh(hubGeometry, hubMaterial);
  const spokeA = new Mesh(spokeGeometry, hubMaterial);
  const spokeB = new Mesh(spokeGeometry.clone(), hubMaterial);
  const caliper = new Mesh(caliperGeometry, caliperMaterial);
  const treadA = new Mesh(treadBlockGeometry, tyreSideMaterial);
  const treadB = new Mesh(treadBlockGeometry.clone(), tyreSideMaterial);

  for (const item of [tyre, leftTyreSide, rightTyreSide, hub]) {
    item.rotation.z = Math.PI / 2;
  }
  leftSidewall.rotation.y = Math.PI / 2;
  rightSidewall.rotation.y = Math.PI / 2;
  leftSidewall.position.x = 0.128;
  rightSidewall.position.x = -0.128;
  spokeB.rotation.x = Math.PI / 2;
  caliper.position.set(0, 0.2, 0.14);
  leftTyreSide.position.x = 0.125;
  rightTyreSide.position.x = -0.125;
  treadA.position.set(-0.155, 0.245, 0);
  treadB.position.set(-0.155, -0.245, 0);
  treadA.rotation.x = Math.PI / 2;
  treadB.rotation.x = Math.PI / 2;
  wheel.add(
    tyre,
    leftTyreSide,
    rightTyreSide,
    leftSidewall,
    rightSidewall,
    hub,
    spokeA,
    spokeB,
    caliper,
    treadA,
    treadB,
  );
  return wheel;
}

export function createCar(color: CarColorName, scale = 1, silhouette: CarSilhouette = 'sedan'): Group {
  const bodyColor = CAR_COLORS[color];
  const car = new Group();

  const lightGeometry = new RoundedBoxGeometry(0.29, 0.17, 0.08, 2, 0.035);
  const faceGeometry = new SphereGeometry(0.17, 20, 18);
  const highlightGeometry = new SphereGeometry(0.05, 10, 8);
  const cheekGeometry = new SphereGeometry(0.095, 14, 12);

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
  const hubMaterial = new MeshStandardMaterial({ color: '#dfe7ec', metalness: 0.72, roughness: 0.24 });
  const headlightMaterial = new MeshStandardMaterial({ color: '#fffbe6', emissive: '#ffe27a', emissiveIntensity: 0.65 });
  const taillightMaterial = new MeshStandardMaterial({ color: '#ff8a80', emissive: '#e53935', emissiveIntensity: 0.35 });
  const whiteMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 });
  const darkMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.3 });
  const chromeRailMaterial = new MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.68, roughness: 0.2 });
  const cheekMaterial = new MeshStandardMaterial({
    color: '#ffb3a7',
    emissive: '#ff8a80',
    emissiveIntensity: 0.3,
    roughness: 0.42,
  });
  const highlightMaterial = new MeshBasicMaterial({ color: '#ffffff' });

  let faceEyeY = 1.06;
  let faceSmileY = 0.94;
  let headlightY = 0.78;
  let taillightY = 0.78;

  const wheelPositions: ReadonlyArray<readonly [number, number]> =
    silhouette === 'truck'
      ? [[-0.74, 0.98], [0.74, 0.98], [-0.74, -0.98], [0.74, -0.98]]
      : [[-0.74, 0.84], [0.74, 0.84], [-0.74, -0.86], [0.74, -0.86]];

  if (silhouette === 'van') {
    const lowerGeometry = new RoundedBoxGeometry(1.44, 0.6, 2.66, 3, 0.13);
    const cabGeometry = new RoundedBoxGeometry(1.34, 0.72, 0.8, 3, 0.14);
    const cargoGeometry = new RoundedBoxGeometry(1.38, 1.06, 1.98, 4, 0.2);
    const roofCapGeometry = new RoundedBoxGeometry(1.27, 0.13, 2.33, 3, 0.055);
    const windshieldGeometry = new BoxGeometry(1.16, 0.48, 0.06);
    const cabSideGlassGeometry = new BoxGeometry(0.04, 0.4, 0.62);
    const cargoWindowGeometry = new BoxGeometry(0.04, 0.34, 0.5);
    const bumperGeometry = new BoxGeometry(1.44, 0.18, 0.14);
    const acUnitGeometry = new RoundedBoxGeometry(0.7, 0.11, 0.5, 2, 0.04);
    const roofRailGeometry = new CylinderGeometry(0.035, 0.035, 2.02, 8);
    const vanDoorLineGeometry = new BoxGeometry(0.02, 0.58, 0.025);
    const handleGeometry = new RoundedBoxGeometry(0.2, 0.055, 0.055, 2, 0.024);
    const steeringWheelGeometry = new TorusGeometry(0.1, 0.026, 10, 20);
    const seatBaseGeometry = new RoundedBoxGeometry(0.72, 0.26, 0.42, 2, 0.08);
    const seatBackGeometry = new RoundedBoxGeometry(0.72, 0.4, 0.13, 2, 0.06);

    const lower = new Mesh(lowerGeometry, accentMaterial);
    lower.position.y = 0.66;
    const cab = new Mesh(cabGeometry, paintMaterial);
    cab.position.set(0, 1.3, 0.9);
    const cargo = new Mesh(cargoGeometry, paintMaterial);
    cargo.position.set(0, 1.4, -0.32);
    const roofCap = new Mesh(roofCapGeometry, accentMaterial);
    roofCap.position.set(0, 1.97, -0.32);
    const windshield = new Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, 1.5, 1.26);
    windshield.rotation.x = -0.16;
    const leftCabGlass = new Mesh(cabSideGlassGeometry, glassMaterial);
    leftCabGlass.position.set(-0.68, 1.44, 0.88);
    const rightCabGlass = new Mesh(cabSideGlassGeometry.clone(), glassMaterial);
    rightCabGlass.position.set(0.68, 1.44, 0.88);
    const leftCargoWindow = new Mesh(cargoWindowGeometry, glassMaterial);
    leftCargoWindow.position.set(-0.7, 1.52, -0.35);
    const rightCargoWindow = new Mesh(cargoWindowGeometry.clone(), glassMaterial);
    rightCargoWindow.position.set(0.7, 1.52, -0.35);
    const frontBumper = new Mesh(bumperGeometry, darkMaterial);
    frontBumper.position.set(0, 0.52, 1.34);
    const rearBumper = new Mesh(bumperGeometry.clone(), darkMaterial);
    rearBumper.position.set(0, 0.52, -1.34);
    const acUnit = new Mesh(acUnitGeometry, whiteMaterial);
    acUnit.position.set(0, 2.07, -0.3);
    const steeringWheel = new Mesh(steeringWheelGeometry, darkMaterial);
    steeringWheel.position.set(-0.3, 1.38, 0.78);
    steeringWheel.rotation.x = -0.3;
    const seatBase = new Mesh(seatBaseGeometry, darkMaterial);
    seatBase.position.set(-0.3, 1.28, 0.52);
    const seatBack = new Mesh(seatBackGeometry, darkMaterial);
    seatBack.position.set(-0.3, 1.5, 0.32);

    car.add(lower, cab, cargo, roofCap, windshield, leftCabGlass, rightCabGlass,
      leftCargoWindow, rightCargoWindow, frontBumper, rearBumper, acUnit,
      steeringWheel, seatBase, seatBack);

    for (const railX of [-0.34, 0.34]) {
      const roofRail = new Mesh(roofRailGeometry, chromeRailMaterial);
      roofRail.position.set(railX!, 2.05, -0.32);
      car.add(roofRail);
    }

    for (const [x, z] of wheelPositions) {
      const arch = createWheelArch();
      arch.position.set(x!, 0.37, z!);
      car.add(arch);
    }
    for (const sideX of [-0.69, 0.69]) {
      for (const lineZ of [0.86, -0.64]) {
        const doorLine = new Mesh(vanDoorLineGeometry, darkMaterial);
        doorLine.position.set(sideX!, 1.24, lineZ!);
        car.add(doorLine);
      }
      const doorHandle = new Mesh(handleGeometry, chromeRailMaterial);
      doorHandle.position.set(sideX!, 1.5, 0.6);
      car.add(doorHandle);
    }

    faceEyeY = 1.44;
    faceSmileY = 1.3;
    headlightY = 0.92;
    taillightY = 1.3;
  } else if (silhouette === 'truck') {
    const chassisGeometry = new RoundedBoxGeometry(1.42, 0.43, 2.72, 2, 0.08);
    const cabGeometry = new RoundedBoxGeometry(1.38, 0.86, 1.08, 3, 0.15);
    const cabRoofGeometry = new RoundedBoxGeometry(1.29, 0.13, 0.99, 2, 0.05);
    const windshieldGeometry = new BoxGeometry(1.14, 0.4, 0.06);
    const sideWindowGeometry = new BoxGeometry(0.04, 0.34, 0.72);
    const steeringWheelGeometry = new TorusGeometry(0.1, 0.026, 10, 20);
    const seatBaseGeometry = new RoundedBoxGeometry(0.72, 0.24, 0.4, 2, 0.08);
    const seatBackGeometry = new RoundedBoxGeometry(0.72, 0.36, 0.12, 2, 0.055);
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
    windshield.rotation.x = -0.2;
    const leftCabWindow = new Mesh(sideWindowGeometry, glassMaterial);
    leftCabWindow.position.set(-0.71, 1.44, 0.78);
    leftCabWindow.rotation.x = -0.08;
    const rightCabWindow = new Mesh(sideWindowGeometry.clone(), glassMaterial);
    rightCabWindow.position.set(0.71, 1.44, 0.78);
    rightCabWindow.rotation.x = -0.08;
    const steeringWheel = new Mesh(steeringWheelGeometry, darkMaterial);
    steeringWheel.position.set(-0.3, 1.32, 0.9);
    steeringWheel.rotation.x = -0.3;
    const seatBase = new Mesh(seatBaseGeometry, darkMaterial);
    seatBase.position.set(-0.3, 1.22, 0.62);
    const seatBack = new Mesh(seatBackGeometry, darkMaterial);
    seatBack.position.set(-0.3, 1.42, 0.44);
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
    const bedStripeGeometry = new BoxGeometry(1.5, 0.08, 0.1);
    const frontBumper = new Mesh(bumperGeometry, darkMaterial);
    frontBumper.position.set(0, 0.54, 1.38);
    const rearBumper = new Mesh(bumperGeometry.clone(), darkMaterial);
    rearBumper.position.set(0, 0.54, -1.38);

    car.add(chassis, cab, cabRoof, windshield, leftCabWindow, rightCabWindow,
      grille, bedFloor, bedLeftWall, bedRightWall, bedBackWall, bedFrontWall,
      exhaustPipe, frontBumper, rearBumper, steeringWheel, seatBase, seatBack);

    for (const stripeZ of [0.18, -1.32]) {
      const bedStripe = new Mesh(bedStripeGeometry, paintMaterial);
      bedStripe.position.set(0, 1.49, stripeZ!);
      car.add(bedStripe);
    }

    for (const [x, z] of wheelPositions) {
      const arch = createWheelArch();
      arch.position.set(x!, 0.37, z!);
      car.add(arch);
    }

    faceEyeY = 1.42;
    faceSmileY = 1.28;
    headlightY = 0.76;
    taillightY = 0.98;
  } else {
    const lowerGeometry = new RoundedBoxGeometry(1.42, 0.55, 2.62, 4, 0.19);
    const hoodGeometry = new RoundedBoxGeometry(1.34, 0.34, 0.72, 3, 0.12);
    const cabinBaseGeometry = new RoundedBoxGeometry(1.3, 0.42, 1.26, 3, 0.11);
    const cabinRoofGeometry = new RoundedBoxGeometry(1.26, 0.14, 1.18, 3, 0.055);
    const cabinPillarFrontLeftGeometry = new RoundedBoxGeometry(0.09, 0.42, 0.08, 2, 0.03);
    const cabinPillarRearLeftGeometry = new RoundedBoxGeometry(0.09, 0.38, 0.08, 2, 0.03);
    const trunkLidGeometry = new RoundedBoxGeometry(1.36, 0.22, 0.56, 3, 0.09);
    const rockerGeometry = new RoundedBoxGeometry(1.47, 0.13, 2.36, 2, 0.05);
    const sedanDoorLineGeometry = new BoxGeometry(0.02, 0.54, 0.025);
    const mirrorArmGeometry = new BoxGeometry(0.14, 0.05, 0.05);
    const mirrorHeadGeometry = new RoundedBoxGeometry(0.07, 0.15, 0.12, 2, 0.03);
    const windshieldGlassGeometry = new BoxGeometry(1.06, 0.44, 0.055);
    const rearGlassGeometry = new BoxGeometry(1.04, 0.4, 0.055);
    const sideGlassGeometry = new BoxGeometry(0.04, 0.32, 0.92);
    const steeringWheelGeometry = new TorusGeometry(0.1, 0.024, 10, 20);
    const seatBaseGeometry = new RoundedBoxGeometry(0.66, 0.22, 0.38, 2, 0.07);
    const seatBackGeometry = new RoundedBoxGeometry(0.66, 0.34, 0.11, 2, 0.05);

    const lower = new Mesh(lowerGeometry, paintMaterial);
    lower.position.y = 0.66;
    const hood = new Mesh(hoodGeometry, paintMaterial);
    hood.position.set(0, 1.11, 0.86);
    const cabinBase = new Mesh(cabinBaseGeometry, paintMaterial);
    cabinBase.position.set(0, 1.13, -0.12);
    const cabinRoof = new Mesh(cabinRoofGeometry, accentMaterial);
    cabinRoof.position.set(0, 1.58, -0.12);

    // Windshield: angled forward glass panel
    const windshield = new Mesh(windshieldGlassGeometry, glassMaterial);
    windshield.position.set(0, 1.36, 0.48);
    windshield.rotation.x = -0.42;

    // Rear window: angled backward glass
    const rearWindow = new Mesh(rearGlassGeometry, glassMaterial);
    rearWindow.position.set(0, 1.36, -0.7);
    rearWindow.rotation.x = 0.42;

    // Side windows (front and rear door)
    for (const sideX of [-0.63, 0.63]) {
      const sideGlass = new Mesh(sideGlassGeometry, glassMaterial);
      sideGlass.position.set(sideX!, 1.36, -0.12);
      car.add(sideGlass);
    }

    // A-pillars
    for (const sideX of [-0.6, 0.6]) {
      const pillar = new Mesh(cabinPillarFrontLeftGeometry, paintMaterial);
      pillar.position.set(sideX!, 1.36, 0.52);
      pillar.rotation.x = -0.42;
      car.add(pillar);
    }
    // C-pillars
    for (const sideX of [-0.6, 0.6]) {
      const pillar = new Mesh(cabinPillarRearLeftGeometry, paintMaterial);
      pillar.position.set(sideX!, 1.36, -0.74);
      pillar.rotation.x = 0.42;
      car.add(pillar);
    }

    // Trunk lid step behind cabin
    const trunkLid = new Mesh(trunkLidGeometry, paintMaterial);
    trunkLid.position.set(0, 1.09, -1.02);

    // Interior hints visible through glass
    const steeringWheel = new Mesh(steeringWheelGeometry, darkMaterial);
    steeringWheel.position.set(-0.28, 1.3, 0.28);
    steeringWheel.rotation.x = -0.3;
    const seatBase = new Mesh(seatBaseGeometry, darkMaterial);
    seatBase.position.set(-0.28, 1.18, 0.02);
    const seatBack = new Mesh(seatBackGeometry, darkMaterial);
    seatBack.position.set(-0.28, 1.36, -0.16);

    const rocker = new Mesh(rockerGeometry, darkMaterial);
    rocker.position.set(0, 0.45, -0.03);
    car.add(lower, hood, cabinBase, cabinRoof, windshield, rearWindow, trunkLid,
      steeringWheel, seatBase, seatBack, rocker);

    // Fender arches over all four wheels
    for (const [x, z] of wheelPositions) {
      const arch = createWheelArch();
      arch.position.set(x!, 0.37, z!);
      car.add(arch);
    }

    for (const sideX of [-0.72, 0.72]) {
      for (const lineZ of [0.56, -0.62]) {
        const doorLine = new Mesh(sedanDoorLineGeometry, darkMaterial);
        doorLine.position.set(sideX!, 0.94, lineZ!);
        car.add(doorLine);
      }
      const mirrorArm = new Mesh(mirrorArmGeometry, accentMaterial);
      mirrorArm.position.set(sideX! > 0 ? sideX! - 0.07 : sideX! + 0.07, 1.32, 0.55);
      const mirrorHead = new Mesh(mirrorHeadGeometry, glassMaterial);
      mirrorHead.position.set(sideX!, 1.32, 0.55);
      car.add(mirrorArm, mirrorHead);
    }
  }

  for (const [x, z] of wheelPositions) {
    const wheel = createStyledWheel();
    wheel.position.set(x!, 0.37, z!);
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
    eye.scale.set(1, 1.12, 0.5);
    const pupil = new Mesh(faceGeometry, darkMaterial);
    pupil.position.set(x!, faceEyeY + 0.01, 1.4);
    pupil.scale.set(0.58, 0.6, 0.3);
    const highlight = new Mesh(highlightGeometry, highlightMaterial);
    highlight.position.set(x! + 0.045, faceEyeY + 0.07, 1.45);
    highlight.scale.set(1, 1, 0.5);
    car.add(eye, pupil, highlight);
  }
  for (const x of [-0.52, 0.52]) {
    const cheek = new Mesh(cheekGeometry, cheekMaterial);
    cheek.position.set(x!, faceSmileY + 0.03, 1.31);
    cheek.scale.set(1.1, 0.82, 0.42);
    car.add(cheek);
  }
  const smile = new Mesh(new TorusGeometry(0.23, 0.052, 12, 24, Math.PI), darkMaterial);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0, faceSmileY, 1.33);
  car.add(smile);
  const smileHighlight = new Mesh(new SphereGeometry(0.045, 10, 8), highlightMaterial);
  smileHighlight.position.set(-0.1, faceSmileY + 0.05, 1.4);
  smileHighlight.scale.set(1, 0.7, 0.4);
  car.add(smileHighlight);

  car.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  car.scale.setScalar(scale);
  return car;
}
