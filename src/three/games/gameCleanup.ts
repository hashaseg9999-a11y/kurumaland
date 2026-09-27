import type { createCameraMicroPulse, createGameHud, createParticleBurst } from '../gameHud';

export function disposeGameBasics(
  cleanup: Array<() => void>,
  hud: ReturnType<typeof createGameHud> | null,
  particles: ReturnType<typeof createParticleBurst> | null,
  cameraPulse: ReturnType<typeof createCameraMicroPulse> | null,
): Array<() => void> {
  for (const off of cleanup) off();
  hud?.dispose();
  particles?.dispose();
  cameraPulse?.dispose();
  return [];
}
