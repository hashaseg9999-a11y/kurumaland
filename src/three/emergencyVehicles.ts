import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { EmergencyVehicleType } from './contracts';

export interface EmergencyVehicleParts {
  group: Group;
  beacon: PointLight;
  leftLamp: Mesh<CylinderGeometry, MeshStandardMaterial>;
  rightLamp: Mesh<CylinderGeometry, MeshStandardMaterial>;
  beaconColors: [string, string];
}

interface VehicleSpec {
  bodyColor: string;
  secondaryColor: string;
  roofColor: string;
  stripeColor: string;
  beaconColors: [string, string];
  ladder: boolean;
  cross: boolean;
  stripe: 'horizontal' | 'diagonal' | 'none';
  sirenShape: 'dome' | 'bar';
}

const SPECS: Record<EmergencyVehicleType, VehicleSpec> = {
  'fire-truck': {
    bodyColor: '#d32f2f',
    secondaryColor: '#b71c1c',
    roofColor: '#e53935',
    stripeColor: '#f5f5f5',
    beaconColors: ['#ff1744', '#ffffff'],
    ladder: true,
    cross: false,
    stripe: 'horizontal',
    sirenShape: 'dome',
  },
  ambulance: {
    bodyColor: '#fafafa',
    secondaryColor: '#eceff1',
    roofColor: '#ffffff',
    stripeColor: '#ff5252',
    beaconColors: ['#ff1744', '#2979ff'],
    ladder: false,
    cross: true,
    stripe: 'diagonal',
    sirenShape: 'bar',
  },
  'police-car': {
    bodyColor: '#fafafa',
    secondaryColor: '#263238',
    roofColor: '#212121',
    stripeColor: '#1a1a1a',
    beaconColors: ['#ff1744', '#2979ff'],
    ladder: false,
    cross: false,
    stripe: 'horizontal',
    sirenShape: 'bar',
  },
};

function createWheel(): Group {
  const wheel = new Group();
  const tyreGeometry = new CylinderGeometry(0.4, 0.4, 0.28, 28, 1);
  const rimGeometry = new CylinderGeometry(0.2, 0.2, 0.3, 20, 1);
  const tyreMaterial = new MeshStandardMaterial({ color: '#2b3238', roughness: 0.82 });
  const rimMaterial = new MeshStandardMaterial({ color: '#dfe7ec', metalness: 0.7, roughness: 0.22 });
  const tyre = new Mesh(tyreGeometry, tyreMaterial);
  const rim = new Mesh(rimGeometry, rimMaterial);
  tyre.rotation.z = Math.PI / 2;
  rim.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  rim.castShadow = true;
  wheel.add(tyre, rim);
  return wheel;
}

export function createEmergencyVehicle(type: EmergencyVehicleType): EmergencyVehicleParts {
  const spec = SPECS[type]!;
  const group = new Group();

  const lowerGeometry = new BoxGeometry(1.62, 0.66, 3.1, 3, 2, 4);
  const upperGeometry = new BoxGeometry(1.5, 0.78, 2.7, 3, 2, 4);
  const cabinGeometry = new BoxGeometry(1.36, 0.58, 1.42, 2, 2, 2);
  const glassGeometry = new BoxGeometry(1.38, 0.44, 1.44);

  const paintMaterial = new MeshPhysicalMaterial({
    color: spec.bodyColor,
    roughness: 0.2,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
  });
  const secondaryMaterial = new MeshPhysicalMaterial({
    color: spec.secondaryColor,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.8,
  });
  const roofMaterial = new MeshPhysicalMaterial({ color: spec.roofColor, roughness: 0.3, clearcoat: 0.6 });
  const glassMaterial = new MeshPhysicalMaterial({
    color: '#d8f6ff',
    roughness: 0.05,
    metalness: 0.04,
    transparent: true,
    opacity: 0.7,
  });
  const stripeMaterial = new MeshStandardMaterial({ color: spec.stripeColor, roughness: 0.36 });
  const darkDetailMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.3 });
  const trimMaterial = new MeshStandardMaterial({ color: '#37474f', roughness: 0.38, metalness: 0.12 });
  const chromeMaterial = new MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.68, roughness: 0.2 });

  const lower = new Mesh(lowerGeometry, paintMaterial);
  lower.position.y = 0.78;
  const upper = new Mesh(upperGeometry, secondaryMaterial);
  upper.position.set(0, 1.42, 0.08);
  const cabin = new Mesh(cabinGeometry, roofMaterial);
  cabin.position.set(0, 1.94, -0.18);
  const glass = new Mesh(glassGeometry, glassMaterial);
  glass.position.set(0, 1.88, -0.18);
  group.add(lower, upper, cabin, glass);

  const frontBumperGeometry = new BoxGeometry(1.66, 0.2, 0.16);
  const frontBumper = new Mesh(frontBumperGeometry, trimMaterial);
  frontBumper.position.set(0, 0.52, 1.58);
  const rearBumper = new Mesh(frontBumperGeometry.clone(), trimMaterial);
  rearBumper.position.set(0, 0.52, -1.58);
  const grilleGeometry = new BoxGeometry(1.0, 0.22, 0.07);
  const grille = new Mesh(grilleGeometry, chromeMaterial);
  grille.position.set(0, 0.9, 1.58);
  const mirrorArmGeometry = new BoxGeometry(0.16, 0.05, 0.05);
  const mirrorHeadGeometry = new BoxGeometry(0.06, 0.18, 0.14);
  for (const x of [-0.88, 0.88]) {
    const armX = x > 0 ? x - 0.08 : x + 0.08;
    const mirrorArm = new Mesh(mirrorArmGeometry, trimMaterial);
    mirrorArm.position.set(armX!, 1.6, 0.62);
    const mirrorHead = new Mesh(mirrorHeadGeometry, chromeMaterial);
    mirrorHead.position.set(x!, 1.6, 0.62);
    group.add(mirrorArm, mirrorHead);
  }
  group.add(frontBumper, rearBumper, grille);

  if (type === 'fire-truck') {
    const compartmentLineGeometry = new BoxGeometry(0.02, 0.42, 0.03);
    const compartmentLineMaterial = new MeshStandardMaterial({ color: '#ffcdd2', roughness: 0.4 });
    for (const sideX of [-0.83, 0.83]) {
      for (const z of [-0.7, -0.1, 0.5]) {
        const line = new Mesh(compartmentLineGeometry, compartmentLineMaterial);
        line.position.set(sideX!, 1.05, z!);
        group.add(line);
      }
    }
    const hoseReelGeometry = new CylinderGeometry(0.18, 0.18, 0.12, 16);
    const hoseReel = new Mesh(hoseReelGeometry, trimMaterial);
    hoseReel.rotation.z = Math.PI / 2;
    hoseReel.position.set(-0.55, 2.24, 0.28);
    group.add(hoseReel);
  } else if (type === 'ambulance') {
    const roofBoxGeometry = new BoxGeometry(1.1, 0.14, 1.8);
    const roofBox = new Mesh(roofBoxGeometry, secondaryMaterial);
    roofBox.position.set(0, 2.26, 0.15);
    const roofVentGeometry = new BoxGeometry(0.6, 0.08, 0.4);
    const roofVent = new Mesh(roofVentGeometry, paintMaterial);
    roofVent.position.set(0, 2.36, 0.35);
    group.add(roofBox, roofVent);
  } else {
    const antennaGeometry = new CylinderGeometry(0.025, 0.025, 0.55, 8);
    const antenna = new Mesh(antennaGeometry, darkDetailMaterial);
    antenna.position.set(-0.45, 2.55, -0.85);
    const hoodStripeGeometry = new BoxGeometry(0.44, 0.02, 0.72);
    const hoodStripe = new Mesh(hoodStripeGeometry, stripeMaterial);
    hoodStripe.position.set(0, 1.04, 1.1);
    group.add(antenna, hoodStripe);
  }

  if (spec.stripe === 'horizontal') {
    const stripeGeometry = new BoxGeometry(1.64, 0.26, 3.12);
    const stripe = new Mesh(stripeGeometry, stripeMaterial);
    stripe.position.y = 0.66;
    group.add(stripe);
  } else if (spec.stripe === 'diagonal') {
    const stripeGeometry = new BoxGeometry(1.66, 0.2, 2.6);
    const stripe = new Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, 0.68, 0.08);
    stripe.rotation.z = Math.PI * 0.05;
    group.add(stripe);
  }

  if (spec.cross) {
    const barGeometry = new BoxGeometry(0.76, 0.03, 0.24);
    const crossMaterial = new MeshStandardMaterial({ color: '#e53935', roughness: 0.3 });
    for (const side of [-0.82, 0.82]) {
      const barH = new Mesh(barGeometry, crossMaterial);
      barH.position.set(side!, 1.05, 0.1);
      const barV = new Mesh(barGeometry, crossMaterial);
      barV.position.set(side!, 1.05, 0.1);
      barV.rotation.y = Math.PI / 2;
      group.add(barH, barV);
    }
  }

  if (spec.ladder) {
    const railGeometry = new BoxGeometry(0.08, 0.08, 2.5);
    const rungGeometry = new BoxGeometry(0.66, 0.06, 0.08);
    const metalMaterial = new MeshStandardMaterial({ color: '#b0bec5', metalness: 0.62, roughness: 0.24 });
    for (const x of [-0.28, 0.28]) {
      const rail = new Mesh(railGeometry, metalMaterial);
      rail.position.set(x!, 2.26, 0.28);
      group.add(rail);
    }
    for (let i = 0; i < 7; i++) {
      const rung = new Mesh(rungGeometry, metalMaterial);
      rung.position.set(0, 2.26, 0.28 + (i - 3) * 0.42);
      group.add(rung);
    }
    const ladderBaseGeometry = new BoxGeometry(0.78, 0.08, 2.62);
    const ladderBase = new Mesh(ladderBaseGeometry, trimMaterial);
    ladderBase.position.set(0, 2.19, 0.28);
    group.add(ladderBase);
  }

  const beaconBaseGeometry = new BoxGeometry(0.92, 0.16, 0.38);
  const beaconBaseMaterial = trimMaterial;
  const beaconBase = new Mesh(beaconBaseGeometry, beaconBaseMaterial);
  beaconBase.position.set(0, 2.32, -0.18);
  group.add(beaconBase);

  const lampGeometry = new CylinderGeometry(0.15, 0.15, 0.26, 20);
  const leftLampMaterial = new MeshStandardMaterial({
    color: spec.beaconColors[0],
    emissive: spec.beaconColors[0],
    emissiveIntensity: 1.5,
  });
  const rightLampMaterial = new MeshStandardMaterial({
    color: spec.beaconColors[1],
    emissive: spec.beaconColors[1],
    emissiveIntensity: 1.5,
  });
  const leftLamp = new Mesh(lampGeometry, leftLampMaterial);
  leftLamp.position.set(-0.24, 2.5, -0.18);
  const rightLamp = new Mesh(lampGeometry.clone(), rightLampMaterial);
  rightLamp.position.set(0.24, 2.5, -0.18);
  group.add(leftLamp, rightLamp);

  const beaconHousingGeometry = new BoxGeometry(0.82, 0.34, 0.3);
  const beaconHousingMaterial = darkDetailMaterial;
  const beaconHousing = new Mesh(beaconHousingGeometry, beaconHousingMaterial);
  beaconHousing.position.set(0, 2.48, -0.18);
  group.add(beaconHousing);

  if (spec.sirenShape === 'dome') {
    const domeGeometry = new SphereGeometry(0.17, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, transparent: true, opacity: 0.55 });
    const dome = new Mesh(domeGeometry, domeMaterial);
    dome.position.set(0, 2.58, -0.18);
    group.add(dome);
  }

  const beacon = new PointLight(spec.beaconColors[0], 0, 11, 2);
  beacon.position.set(0, 2.72, -0.18);
  group.add(beacon);

  for (const [x, z] of [[-0.84, 1.0], [0.84, 1.0], [-0.84, -1.06], [0.84, -1.06]] as const) {
    const wheel = createWheel();
    wheel.position.set(x!, 0.4, z!);
    group.add(wheel);
  }

  const headlightGeometry = new BoxGeometry(0.28, 0.18, 0.08);
  const headlightMaterial = new MeshStandardMaterial({
    color: '#fffbe6',
    emissive: '#ffe27a',
    emissiveIntensity: 0.75,
  });
  const taillightMaterial = new MeshStandardMaterial({
    color: '#ff8a80',
    emissive: '#e53935',
    emissiveIntensity: 0.4,
  });
  for (const x of [-0.48, 0.48]) {
    const headlight = new Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(x!, 0.9, 1.56);
    const taillight = new Mesh(headlightGeometry, taillightMaterial);
    taillight.position.set(x!, 0.9, -1.56);
    group.add(headlight, taillight);
  }

  const fogLightGeometry = new BoxGeometry(0.14, 0.1, 0.06);
  const fogLightMaterial = new MeshStandardMaterial({
    color: '#e3f2fd',
    emissive: '#90caf9',
    emissiveIntensity: 0.5,
  });
  for (const x of [-0.66, 0.66]) {
    const fogLight = new Mesh(fogLightGeometry, fogLightMaterial);
    fogLight.position.set(x!, 0.68, 1.57);
    group.add(fogLight);
  }

  const faceGeometry = new SphereGeometry(0.16, 22, 22);
  const eyeWhiteMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 });
  const pupilMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.28 });
  for (const x of [-0.34, 0.34]) {
    const eye = new Mesh(faceGeometry, eyeWhiteMaterial);
    eye.position.set(x!, 1.16, 1.57);
    eye.scale.set(1, 1.06, 0.48);
    const pupil = new Mesh(faceGeometry, pupilMaterial);
    pupil.position.set(x!, 1.17, 1.65);
    pupil.scale.set(0.5, 0.52, 0.26);
    group.add(eye, pupil);
  }
  const smileGeometry = new TorusGeometry(0.22, 0.05, 12, 24, Math.PI);
  const smile = new Mesh(smileGeometry, pupilMaterial);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0, 1.0, 1.57);
  group.add(smile);

  group.traverse((child) => {
    if (child instanceof Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    group,
    beacon,
    leftLamp,
    rightLamp,
    beaconColors: [...spec.beaconColors] as [string, string],
  };
}

export function pickRandomEmergencyType(): EmergencyVehicleType {
  const types: readonly EmergencyVehicleType[] = ['fire-truck', 'ambulance', 'police-car'];
  return types[Math.floor(Math.random() * types.length)]!;
}
