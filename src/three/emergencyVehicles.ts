import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { EmergencyVehicleType } from './contracts';

export interface EmergencyVehicleParts {
  group: Group;
  beacon: PointLight;
  beaconAssembly: Group;
  leftLamp: Mesh<CylinderGeometry, MeshStandardMaterial>;
  rightLamp: Mesh<CylinderGeometry, MeshStandardMaterial>;
  beaconColors: [string, string];
}

interface VehicleSpec {
  bodyColor: string;
  secondaryColor: string;
  roofColor: string;
  stripeColor: string;
  wheelRimColor: string;
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
    wheelRimColor: '#cfd8dc',
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
    wheelRimColor: '#eceff1',
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
    wheelRimColor: '#90a4ae',
    beaconColors: ['#ff1744', '#2979ff'],
    ladder: false,
    cross: false,
    stripe: 'horizontal',
    sirenShape: 'bar',
  },
};

function createWheel(rimColor = '#dfe7ec'): Group {
  const wheel = new Group();
  const tyreGeometry = new CylinderGeometry(0.41, 0.41, 0.29, 28);
  const sideGeometry = new CylinderGeometry(0.43, 0.43, 0.06, 28);
  const sidewallGeometry = new TorusGeometry(0.412, 0.036, 8, 28);
  const rimGeometry = new CylinderGeometry(0.21, 0.21, 0.31, 18);
  const spokeGeometry = new RoundedBoxGeometry(0.36, 0.29, 0.085, 2, 0.03);
  const caliperGeometry = new RoundedBoxGeometry(0.1, 0.2, 0.14, 2, 0.03);
  const tyreMaterial = new MeshStandardMaterial({ color: '#23282d', roughness: 0.88 });
  const tyreSideMaterial = new MeshStandardMaterial({ color: '#3c444b', roughness: 0.72 });
  const rimMaterial = new MeshStandardMaterial({ color: rimColor, metalness: 0.85, roughness: 0.16 });
  const caliperMaterial = new MeshStandardMaterial({
    color: '#e05a4e',
    metalness: 0.35,
    roughness: 0.38,
  });
  const tyre = new Mesh(tyreGeometry, tyreMaterial);
  const leftTyreSide = new Mesh(sideGeometry, tyreSideMaterial);
  const rightTyreSide = new Mesh(sideGeometry.clone(), tyreSideMaterial);
  const leftSidewall = new Mesh(sidewallGeometry, tyreSideMaterial);
  const rightSidewall = new Mesh(sidewallGeometry.clone(), tyreSideMaterial);
  const rim = new Mesh(rimGeometry, rimMaterial);
  const spoke = new Mesh(spokeGeometry, rimMaterial);
  const crossSpoke = new Mesh(spokeGeometry.clone(), rimMaterial);
  const caliper = new Mesh(caliperGeometry, caliperMaterial);
  for (const item of [tyre, leftTyreSide, rightTyreSide, rim]) {
    item.rotation.z = Math.PI / 2;
  }
  leftSidewall.rotation.y = Math.PI / 2;
  rightSidewall.rotation.y = Math.PI / 2;
  leftSidewall.position.x = 0.13;
  rightSidewall.position.x = -0.13;
  crossSpoke.rotation.x = Math.PI / 2;
  caliper.position.set(0, 0.21, 0.15);
  leftTyreSide.position.x = 0.125;
  rightTyreSide.position.x = -0.125;
  tyre.castShadow = true;
  rim.castShadow = true;
  wheel.add(tyre, leftTyreSide, rightTyreSide, leftSidewall, rightSidewall,
    rim, spoke, crossSpoke, caliper);
  wheel.userData.isEmergencyWheel = true;
  return wheel;
}

function createWheelArch(): Mesh<TorusGeometry, MeshStandardMaterial> {
  const arch = new Mesh(
    new TorusGeometry(0.51, 0.06, 8, 18, Math.PI),
    new MeshStandardMaterial({ color: '#000000', roughness: 0.55 }),
  );
  arch.rotation.y = Math.PI / 2;
  return arch;
}

export function createEmergencyVehicle(type: EmergencyVehicleType): EmergencyVehicleParts {
  const spec = SPECS[type]!;
  const group = new Group();

  const lowerGeometry = new RoundedBoxGeometry(1.62, 0.66, 3.08, 4, 0.16);
  const upperGeometry = new RoundedBoxGeometry(1.5, 0.78, 2.68, 4, 0.18);
  const cabinGeometry = new RoundedBoxGeometry(1.36, 0.58, 1.42, 3, 0.14);
  const glassGeometry = new BoxGeometry(1.38, 0.44, 1.44);

  const paintMaterial = new MeshPhysicalMaterial({
    color: spec.bodyColor,
    roughness: 0.14,
    metalness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
  });
  const secondaryMaterial = new MeshPhysicalMaterial({
    color: spec.secondaryColor,
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.8,
  });
  const roofMaterial = new MeshPhysicalMaterial({ color: spec.roofColor, roughness: 0.3, clearcoat: 0.6 });
  const glassMaterial = new MeshPhysicalMaterial({
    color: '#c4ecff',
    roughness: 0.05,
    metalness: 0.04,
    transparent: true,
    opacity: 0.6,
    envMapIntensity: 1.5,
  });
  const stripeMaterial = new MeshStandardMaterial({ color: spec.stripeColor, roughness: 0.36 });
  const darkDetailMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.3 });
  const trimMaterial = new MeshStandardMaterial({ color: '#37474f', roughness: 0.38, metalness: 0.12 });
  const chromeMaterial = new MeshStandardMaterial({ color: '#cfd8dc', metalness: 0.68, roughness: 0.2 });
  const rockerMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.42 });

  const rocker = new Mesh(new RoundedBoxGeometry(1.67, 0.15, 2.9, 2, 0.05), rockerMaterial);
  rocker.position.set(0, 0.48, -0.02);

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
  const mirrorHeadGeometry = new RoundedBoxGeometry(0.07, 0.19, 0.14, 2, 0.03);
  for (const x of [-0.88, 0.88]) {
    const armX = x > 0 ? x - 0.08 : x + 0.08;
    const mirrorArm = new Mesh(mirrorArmGeometry, trimMaterial);
    mirrorArm.position.set(armX!, 1.6, 0.62);
    const mirrorHead = new Mesh(mirrorHeadGeometry, chromeMaterial);
    mirrorHead.position.set(x!, 1.6, 0.62);
    group.add(mirrorArm, mirrorHead);
  }
  group.add(rocker, frontBumper, rearBumper, grille);

  if (type === 'fire-truck') {
    const compartmentLineGeometry = new BoxGeometry(0.02, 0.42, 0.03);
    const compartmentHandleGeometry = new RoundedBoxGeometry(0.055, 0.075, 0.2, 2, 0.022);
    const compartmentLineMaterial = new MeshStandardMaterial({ color: '#ffcdd2', roughness: 0.4 });
    const compartmentHandleMaterial = chromeMaterial;
    for (const sideX of [-0.83, 0.83]) {
      for (const z of [-0.7, -0.1, 0.5]) {
        const line = new Mesh(compartmentLineGeometry, compartmentLineMaterial);
        line.position.set(sideX!, 1.05, z!);
        group.add(line);
        const handle = new Mesh(compartmentHandleGeometry, compartmentHandleMaterial);
        handle.position.set(sideX! + (sideX! < 0 ? -0.03 : 0.03), 1.24, z! + (sideX! < 0 ? 0.16 : -0.16));
        group.add(handle);
      }
    }
    const hoseReelGroup = new Group();
    const hoseReelGeometry = new CylinderGeometry(0.18, 0.18, 0.14, 18);
    const hoseReel = new Mesh(hoseReelGeometry, trimMaterial);
    const hose = new Mesh(new TorusGeometry(0.15, 0.045, 10, 20), darkDetailMaterial);
    hose.rotation.y = Math.PI / 2;
    hoseReel.rotation.z = Math.PI / 2;
    hoseReelGroup.add(hoseReel, hose);
    hoseReelGroup.position.set(-0.55, 2.25, 0.28);
    hoseReelGroup.userData.animate = 'hose-reel';
    group.add(hoseReelGroup);
  } else if (type === 'ambulance') {
    const roofBoxGeometry = new BoxGeometry(1.1, 0.14, 1.8);
    const roofBox = new Mesh(roofBoxGeometry, secondaryMaterial);
    roofBox.position.set(0, 2.26, 0.15);
    const roofVentGeometry = new RoundedBoxGeometry(0.6, 0.09, 0.4, 2, 0.03);
    const roofVent = new Mesh(roofVentGeometry, paintMaterial);
    roofVent.position.set(0, 2.36, 0.35);
    group.add(roofBox, roofVent);
  } else {
    const antennaGeometry = new CylinderGeometry(0.025, 0.025, 0.55, 8);
    const spotlightArmGeometry = new BoxGeometry(0.055, 0.055, 0.16);
    const spotlightBodyGeometry = new CylinderGeometry(0.08, 0.1, 0.14, 14);
    const antenna = new Mesh(antennaGeometry, darkDetailMaterial);
    antenna.position.set(-0.45, 2.55, -0.85);
    const hoodStripeGeometry = new BoxGeometry(0.44, 0.02, 0.72);
    const hoodStripe = new Mesh(hoodStripeGeometry, stripeMaterial);
    hoodStripe.position.set(0, 1.04, 1.1);
    const spotlightArm = new Mesh(spotlightArmGeometry, trimMaterial);
    spotlightArm.position.set(0.82, 1.72, 0.62);
    const spotlight = new Mesh(spotlightBodyGeometry, chromeMaterial);
    spotlight.rotation.z = Math.PI / 2;
    spotlight.position.set(0.93, 1.72, 0.62);

    // Segmented lightbar on roof (red/blue/white/red/blue segments)
    const lightbarSegmentGeometry = new RoundedBoxGeometry(0.16, 0.12, 0.22, 2, 0.03);
    const segmentColors: ReadonlyArray<string> = ['#ff1744', '#2979ff', '#ffffff', '#ff1744', '#2979ff'];
    for (let i = 0; i < segmentColors.length; i++) {
      const segMat = new MeshStandardMaterial({
        color: segmentColors[i]!,
        emissive: segmentColors[i]!,
        emissiveIntensity: 0.4,
      });
      const segment = new Mesh(lightbarSegmentGeometry.clone(), segMat);
      segment.position.set((i - 2) * 0.19, 2.44, 0.15);
      group.add(segment);
    }

    // Push bar on front bumper
    const pushBarFrameGeometry = new RoundedBoxGeometry(1.2, 0.18, 0.05, 2, 0.02);
    const pushBarVerticalGeometry = new RoundedBoxGeometry(0.05, 0.24, 0.05, 2, 0.02);
    const pushBarHorizontal = new Mesh(pushBarFrameGeometry, trimMaterial);
    pushBarHorizontal.position.set(0, 0.78, 1.66);
    for (const bx of [-0.45, 0, 0.45]) {
      const pushBarVertical = new Mesh(pushBarVerticalGeometry, trimMaterial);
      pushBarVertical.position.set(bx!, 0.68, 1.66);
      group.add(pushBarVertical);
    }

    group.add(antenna, hoodStripe, spotlightArm, spotlight, pushBarHorizontal);
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
    const barGeometry = new BoxGeometry(0.05, 0.5, 0.76);
    const crossMaterial = new MeshStandardMaterial({ color: '#e53935', roughness: 0.3 });
    for (const side of [-0.82, 0.82]) {
      const barH = new Mesh(barGeometry, crossMaterial);
      barH.position.set(side!, 1.42, 0.15);
      const barV = new Mesh(barGeometry, crossMaterial);
      barV.position.set(side!, 1.42, 0.15);
      barV.rotation.y = Math.PI / 2;
      group.add(barH, barV);
    }
  }

  if (spec.ladder) {
    const railGeometry = new RoundedBoxGeometry(0.09, 0.09, 2.5, 2, 0.03);
    const rungGeometry = new RoundedBoxGeometry(0.66, 0.07, 0.09, 2, 0.03);
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

    // Support struts connecting base to rails
    const strutGeometry = new RoundedBoxGeometry(0.06, 0.14, 0.06, 2, 0.02);
    for (const x of [-0.28, 0.28]) {
      const frontStrut = new Mesh(strutGeometry, metalMaterial);
      frontStrut.position.set(x!, 2.22, -0.85);
      const rearStrut = new Mesh(strutGeometry, metalMaterial);
      rearStrut.position.set(x!, 2.22, 1.41);
      group.add(frontStrut, rearStrut);
    }

    // Water cannon on the roof
    const waterCannonBase = new Mesh(new CylinderGeometry(0.06, 0.07, 0.12, 10), darkDetailMaterial);
    waterCannonBase.position.set(0.42, 2.25, 0.7);
    const waterCannonBarrel = new Mesh(new CylinderGeometry(0.045, 0.055, 0.3, 10), chromeMaterial);
    waterCannonBarrel.rotation.x = Math.PI / 6;
    waterCannonBarrel.position.set(0.42, 2.38, 0.72);
    group.add(ladderBase);
    group.add(waterCannonBase, waterCannonBarrel);
  }

  const beaconBaseGeometry = new BoxGeometry(0.92, 0.16, 0.38);
  const beaconBaseTopGeometry = new RoundedBoxGeometry(1.02, 0.055, 0.46, 2, 0.024);
  const beaconBaseMaterial = trimMaterial;
  const beaconBase = new Mesh(beaconBaseGeometry, beaconBaseMaterial);
  beaconBase.position.set(0, 2.32, -0.18);
  const beaconBaseTop = new Mesh(beaconBaseTopGeometry, darkDetailMaterial);
  beaconBaseTop.position.set(0, 2.41, -0.18);
  const beaconAssembly = new Group();
  beaconAssembly.add(beaconBaseTop);
  group.add(beaconBase, beaconAssembly);

  const lampGeometry = new CylinderGeometry(0.16, 0.16, 0.24, 20);
  const lampCapGeometry = new SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
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
  const leftLampCap = new Mesh(lampCapGeometry, leftLampMaterial);
  leftLampCap.position.set(-0.24, 2.62, -0.18);
  const rightLampCap = new Mesh(lampCapGeometry.clone(), rightLampMaterial);
  rightLampCap.position.set(0.24, 2.62, -0.18);
  beaconAssembly.add(leftLamp, rightLamp, leftLampCap, rightLampCap);

  const beaconHousingGeometry = new RoundedBoxGeometry(0.84, 0.35, 0.31, 2, 0.07);
  const beaconHousingMaterial = darkDetailMaterial;
  const beaconHousing = new Mesh(beaconHousingGeometry, beaconHousingMaterial);
  beaconHousing.position.set(0, 2.48, -0.18);
  beaconAssembly.add(beaconHousing);

  if (spec.sirenShape === 'dome') {
    const domeGeometry = new SphereGeometry(0.17, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, transparent: true, opacity: 0.55 });
    const dome = new Mesh(domeGeometry, domeMaterial);
    dome.position.set(0, 2.58, -0.18);
    beaconAssembly.add(dome);
  }

  const beacon = new PointLight(spec.beaconColors[0], 0, 11, 2);
  beacon.position.set(0, 2.72, -0.18);
  group.add(beacon);

  for (const [x, z] of [[-0.84, 1.0], [0.84, 1.0], [-0.84, -1.06], [0.84, -1.06]] as const) {
    const wheel = createWheel(spec.wheelRimColor);
    wheel.position.set(x!, 0.4, z!);
    group.add(wheel);
    const arch = createWheelArch();
    arch.position.set(x!, 0.4, z!);
    group.add(arch);
  }

  const headlightGeometry = new RoundedBoxGeometry(0.29, 0.19, 0.08, 2, 0.034);
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

  const faceGeometry = new SphereGeometry(0.19, 22, 22);
  const highlightGeometry = new SphereGeometry(0.055, 10, 8);
  const eyeWhiteMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.22 });
  const pupilMaterial = new MeshStandardMaterial({ color: '#263238', roughness: 0.28 });
  const highlightMaterial = new MeshBasicMaterial({ color: '#ffffff' });
  for (const x of [-0.34, 0.34]) {
    const eye = new Mesh(faceGeometry, eyeWhiteMaterial);
    eye.position.set(x!, 1.16, 1.57);
    eye.scale.set(1, 1.14, 0.48);
    const pupil = new Mesh(faceGeometry, pupilMaterial);
    pupil.position.set(x!, 1.17, 1.65);
    pupil.scale.set(0.58, 0.6, 0.28);
    const highlight = new Mesh(highlightGeometry, highlightMaterial);
    highlight.position.set(x! + 0.05, 1.24, 1.7);
    highlight.scale.set(1, 1, 0.5);
    group.add(eye, pupil, highlight);
  }
  const smileGeometry = new TorusGeometry(0.25, 0.058, 12, 24, Math.PI);
  const smile = new Mesh(smileGeometry, pupilMaterial);
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  smile.position.set(0, 1.0, 1.57);
  group.add(smile);
  const smileHighlight = new Mesh(new SphereGeometry(0.05, 10, 8), highlightMaterial);
  smileHighlight.position.set(-0.11, 1.06, 1.65);
  smileHighlight.scale.set(1, 0.7, 0.4);
  group.add(smileHighlight);

  for (const x of [-0.62, 0.62]) {
    const cheek = new Mesh(new SphereGeometry(0.09, 12, 10), new MeshStandardMaterial({
      color: '#ffb3a7',
      emissive: '#ff8a80',
      emissiveIntensity: 0.16,
      roughness: 0.42,
    }));
    cheek.position.set(x!, 0.94, 1.55);
    cheek.scale.set(1.12, 0.84, 0.4);
    group.add(cheek);
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
    beaconAssembly,
    leftLamp,
    rightLamp,
    beaconColors: [...spec.beaconColors] as [string, string],
  };
}

export const DEFAULT_EMERGENCY_TYPE: EmergencyVehicleType = 'fire-truck';

/**
 * Fire trucks are the familiar default, while the other two vehicles still
 * appear often enough to keep repeated rounds surprising.
 */
export function pickRandomEmergencyType(): EmergencyVehicleType {
  const types: readonly EmergencyVehicleType[] = ['fire-truck', 'ambulance', 'police-car'];
  const roll = Math.random();
  if (roll < 0.5) return types[0]!;
  if (roll < 0.75) return types[1]!;
  return types[2]!;
}
