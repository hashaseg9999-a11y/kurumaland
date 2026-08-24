type Cleanup = () => void;

export type SceneTransition = 'enter' | 'exit';

const TRANSITION_MS = 620;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createElement(tagName: string, className: string): HTMLElement {
  const element = document.createElement(tagName);
  element.className = className;
  return element;
}

/**
 * Create an isolated CSS 3D scene. Pointer events stay enabled on the stage,
 * while decorative layers are non-interactive.
 */
export function createSceneStage(className: string): {
  root: HTMLDivElement;
  stage: HTMLDivElement;
  destroy: Cleanup;
} {
  const root = createElement('div', 'scene3d ' + className) as HTMLDivElement;
  const sky = createElement('div', 'scene3d-sky');
  const farClouds = createElement('div', 'scene3d-cloud-band scene3d-cloud-far');

  for (let index = 0; index < 5; index += 1) {
    const cloud = createElement('span', 'scene3d-cloud');
    cloud.style.animationDelay = String(index * -7.4) + 's';
    cloud.style.setProperty('--cloud-scale', String(0.72 + (index % 3) * 0.16));
    cloud.style.setProperty('--cloud-y', String(8 + (index % 4) * 9) + '%');
    cloud.style.animationDuration = String(34 + index * 6) + 's';
    farClouds.append(cloud);
  }

  const sun = createElement('div', 'scene3d-sun');
  const hillsFar = createElement('div', 'scene3d-hills scene3d-hills-far');
  const hillsNear = createElement('div', 'scene3d-hills scene3d-hills-near');
  const road = createElement('div', 'scene3d-road');
  const lane = createElement('span', 'scene3d-road-lane');
  road.append(lane);
  root.append(sky, farClouds, sun, hillsFar, hillsNear, road);

  const stage = createElement('div', 'scene3d-stage') as HTMLDivElement;
  root.append(stage);

  return {
    root,
    stage,
    destroy: () => {
      root.replaceChildren();
    },
  };
}

/**
 * A short, calm camera move. It never blocks input and always settles to a
 * stable identity transform so child activities can use their own transforms.
 */
export function playSceneTransition(
  target: HTMLElement,
  transition: SceneTransition,
): Cleanup {
  if (prefersReducedMotion()) {
    return () => undefined;
  }

  target.classList.remove('is-entering', 'is-exiting');
  // Force a style flush so repeat transitions are reliable on iOS Safari.
  void target.offsetWidth;
  target.classList.add(transition === 'enter' ? 'is-entering' : 'is-exiting');

  const timer = window.setTimeout(() => {
    target.classList.remove('is-entering', 'is-exiting');
    target.style.transform = '';
    target.style.opacity = '';
  }, TRANSITION_MS + 40);

  return () => {
    window.clearTimeout(timer);
    target.classList.remove('is-entering', 'is-exiting');
  };
}

interface ParallaxOptions {
  strength?: number;
  maxTilt?: number;
}

/**
 * Gentle device tilt / pointer parallax. iOS requires permission for motion
 * events; if permission is not granted, the scene remains still and usable.
 */
export function attachParallax(
  root: HTMLElement,
  options: ParallaxOptions = {},
): Cleanup {
  void options.strength;
  const maxTilt = options.maxTilt ?? 1.1;
  let raf = 0;
  let pointerX = 0;
  let pointerY = 0;
  let motionX = 0;
  let motionY = 0;
  let hasMotionPermission = false;

  const apply = (): void => {
    raf = 0;
    const x = clamp(pointerX + motionX, -1, 1);
    const y = clamp(pointerY + motionY, -1, 1);
    root.style.setProperty('--parallax-x', x.toFixed(3));
    root.style.setProperty('--parallax-y', y.toFixed(3));
    root.style.setProperty('--scene-tilt-x', (-y * maxTilt).toFixed(2));
    root.style.setProperty('--scene-tilt-y', (x * maxTilt).toFixed(2));
  };

  const requestFrame = (): void => {
    if (!raf) {
      raf = window.requestAnimationFrame(apply);
    }
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const bounds = root.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    requestFrame();
  };

  const handlePointerLeave = (): void => {
    pointerX = 0;
    pointerY = 0;
    requestFrame();
  };

  const handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
    if (!hasMotionPermission || event.gamma === null || event.beta === null) return;
    motionX = clamp(event.gamma / 32, -1, 1);
    motionY = clamp((event.beta - 45) / 38, -1, 1);
    requestFrame();
  };

  const requestMotion = async (): Promise<void> => {
    const orientationCtor = (
      window as Window & {
        DeviceOrientationEvent?: {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        };
      }
    ).DeviceOrientationEvent;
    if (!orientationCtor?.requestPermission || hasMotionPermission) return;

    try {
      hasMotionPermission = await orientationCtor.requestPermission() === 'granted';
    } catch {
      hasMotionPermission = false;
    }
  };

  root.addEventListener('pointermove', handlePointerMove, { passive: true });
  root.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  root.addEventListener('pointerdown', requestMotion, { passive: true });
  window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });

  return () => {
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    root.removeEventListener('pointermove', handlePointerMove);
    root.removeEventListener('pointerleave', handlePointerLeave);
    root.removeEventListener('pointerdown', requestMotion);
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    root.style.removeProperty('--parallax-x');
    root.style.removeProperty('--parallax-y');
    root.style.removeProperty('--scene-tilt-x');
    root.style.removeProperty('--scene-tilt-y');
  };
}
