import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
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
  roofColor: string;
  stripeColor: string;
  beaconColors: [string, string];
  ladder: boolean;
  cross: boolean;
  stripe: 'horizontal' | 'diagonal' | 'none';
}

const SPECS: Record<EmergencyVehicleType, VehicleSpec> = {
  'fire-truck': {
    bodyColor: '#d32f2f',
    roofColor: '#b71c1c',
    stripeColor: '#ffffff',
    beaconColors: ['#ff1744', '#ffffff'],
    ladder: true,
    cross: false,
    stripe: 'horizontal',
  },
  ambulance: {
    bodyColor: '#fafafa',
    roofColor: '#e0e0e0',
    stripeColor: '#ff5252',
    beaconColors: ['#ff1744', '#2979ff'],
    ladder: false,
    cross: true,
    stripe: 'diagonal',
  },
  'police-car': {
    bodyColor: '#fafafa',
    roofColor: '#212121',
    stripeColor: '#1a1a1a',
    beaconColors: ['#ff1744', '#2979ff'],
    ladder: false,
    cross: false,
    stripe: 'horizontal',
  },
};

function createWheel(): Group {
  const wheel = new Group();
  const wheelGeometry = new CylinderGeometry(0.38, 0.38, 0.26, 22);
  const wheelMaterial = new MeshStandardMaterial({ color: '#37474f', roughness: 0.7 });
  const hubGeometry = new CylinderGeometry(0.17, 0.17, 0.28, 16);
  const hubMaterial = new MeshStandardMaterial({ color: '#bdbdbd', metalness: 0.5, roughness: 0.3 });
  const tyre = new Mesh(wheelGeometry, wheelMaterial);
  const hub = new Mesh(hubGeometry, hubMaterial);
  tyre.rotation.z = Math.PI / 2;
  hub.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  hub.castShadow = true;
  wheel.add(tyre, hub);
  return wheel;
}

export function createEmergencyVehicle(type: EmergencyVehicleType): EmergencyVehicleParts {
  const spec = SPECS[type]!;
  const group = new Group();

  // Main body
  const bodyGeometry = new BoxGeometry(1.5, 0.95, 2.85);
  const bodyMaterial = new MeshStandardMaterial({ color: spec.bodyColor, roughness: 0.28 });
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.82;
  group.add(body);

  // Cabin
  const cabinGeometry = new BoxGeometry(1.32, 0.62, 1.35);
  const cabinMaterial = new MeshStandardMaterial({ color: spec.roofColor, roughness: 0.34 });
  const cabin = new Mesh(cabinGeometry, cabinMaterial);
  cabin.position.set(0, 1.58, -0.12);
  group.add(cabin);

  // Glass
  const glassGeometry = new BoxGeometry(1.34, 0.42, 1.37);
  const glassMaterial = new MeshStandardMaterial({
    color: '#cfefff',
    roughness: 0.1,
    transparent: true,
    opacity: 0.78,
  });
  const glass = new Mesh(glassGeometry, glassMaterial);
  glass.position.set(0, 1.5, -0.12);
  group.add(glass);

  // Side stripe / livery
  if (spec.stripe === 'horizontal') {
    const stripeGeometry = new BoxGeometry(1.52, 0.24, 2.87);
    const stripeMaterial = new MeshStandardMaterial({ color: spec.stripeColor, roughness: 0.4 });
    const stripe = new Mesh(stripeGeometry, stripeMaterial);
    stripe.position.y = 0.72;
    group.add(stripe);
  } else if (spec.stripe === 'diagonal') {
    const stripeGeometry = new BoxGeometry(1.54, 0.18, 2.4);
    const stripeMaterial = new MeshStandardMaterial({ color: spec.stripeColor, roughness: 0.42 });
    const stripe = new Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(0, 0.72, 0.05);
    stripe.rotation.z = Math.PI * 0.06;
    group.add(stripe);
  }

  // Ambulance cross on the sides
  if (spec.cross) {
    const barGeometry = new BoxGeometry(0.72, 0.02, 0.22);
    const barMaterial = new MeshStandardMaterial({ color: '#e53935', roughness: 0.36 });
    for (const side of [-0.76, 0.76]) {
      const barH = new Mesh(barGeometry, barMaterial);
      barH.position.set(side!, 0.95, 0);
      const barV = new Mesh(barGeometry, barMaterial);
      barV.position.set(side!, 0.95, 0);
      barV.rotation.y = Math.PI / 2;
      group.add(barH, barV);
    }
  }

  // Fire truck ladder on the roof
  if (spec.ladder) {
    const railGeometry = new BoxGeometry(0.07, 0.07, 2.3);
    const railMaterial = new MeshStandardMaterial({ color: '#9e9e9e', metalness: 0.55, roughness: 0.3 });
    for (const x of [-0.26, 0.26]) {
      const rail = new Mesh(railGeometry, railMaterial);
      rail.position.set(x!, 1.92, 0.15);
      group.add(rail);
    }
    const rungGeometry = new BoxGeometry(0.6, 0.05, 0.07);
    for (let i = 0; i < 6; i++) {
      const rung = new Mesh(rungGeometry, railMaterial);
      rung.position.set(0, 1.92, 0.15 + (i - 2.5) * 0.42);
      group.add(rung);
    }
  }

  // Beacon light bar on the cabin roof
  const beaconBaseGeometry = new BoxGeometry(0.86, 0.14, 0.34);
  const beaconBaseMaterial = new MeshStandardMaterial({ color: '#37474f', roughness: 0.45 });
  const beaconBase = new Mesh(beaconBaseGeometry, beaconBaseMaterial);
  beaconBase.position.set(0, 1.96, -0.12);
  group.add(beaconBase);

  const lampGeometry = new CylinderGeometry(0.13, 0.13, 0.24, 16);
  const leftLampMaterial = new MeshStandardMaterial({
    color: spec.beaconColors[0],
    emissive: spec.beaconColors[0],
    emissiveIntensity: 1.4,
  });
  const rightLampMaterial = new MeshStandardMaterial({
    color: spec.beaconColors[1],
    emissive: spec.beaconColors[1],
    emissiveIntensity: 1.4,
  });
  const leftLamp = new Mesh(lampGeometry, leftLampMaterial);
  leftLamp.position.set(-0.22, 2.12, -0.12);
  const rightLamp = new Mesh(lampGeometry.clone(), rightLampMaterial);
  rightLamp.position.set(0.22, 2.12, -0.12);
  group.add(leftLamp, rightLamp);

  const beacon = new PointLight(spec.beaconColors[0], 0, 9, 2);
  beacon.position.set(0, 2.3, -0.12);
  group.add(beacon);

  // Wheels
  for (const [x, z] of [[-0.78, 0.92], [0.78, 0.92], [-0.78, -0.98], [0.78, -0.98]] as const) {
    const wheel = createWheel();
    wheel.position.set(x!, 0.38, z!);
    group.add(wheel);
  }

  // Headlights and taillights
  const headlightGeometry = new BoxGeometry(0.24, 0.15, 0.08);
  const headlightMaterial = new MeshStandardMaterial({
    color: '#fff8d6',
    emissive: '#ffd54f',
    emissiveIntensity: 0.55,
  });
  const taillightMaterial = new MeshStandardMaterial({
    color: '#ff8a80',
    emissive: '#e53935',
    emissiveIntensity: 0.35,
  });
  for (const x of [-0.44, 0.44]) {
    const headlight = new Mesh(headlightGeometry, headlightMaterial);
    headlight.position.set(x!, 0.86, 1.43);
    const taillight = new Mesh(headlightGeometry, taillightMaterial);
    taillight.position.set(x!, 0.86, -1.43);
    group.add(headlight, taillight);
  }

  // Friendly face
  const faceGeometry = new SphereGeometry(0.14, 18, 18);
  const eyeWhiteMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
  const pupilMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.3 });
  for (const x of [-0.3, 0.3]) {
    const eye = new Mesh(faceGeometry, eyeWhiteMaterial);
    eye.position.set(x!, 1.06, 1.44);
    eye.scale.set(1, 1, 0.5);
    const pupil = new Mesh(faceGeometry, pupilMaterial);
    pupil.position.set(x!, 1.07, 1.5);
    pupil.scale.set(0.5, 0.5, 0.3);
    group.add(eye, pupil);
  }

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
