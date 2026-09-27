interface Disposable {
  dispose(): void;
}

export function disposeGameBasics(
  cleanup: Array<() => void>,
  hud: Disposable | null,
  particles: Disposable | null,
  cameraPulse: Disposable | null,
): void {
  for (const off of cleanup) off();
  hud?.dispose();
  particles?.dispose();
  cameraPulse?.dispose();
  cleanup.length = 0;
}
