interface Disposable {
  dispose(): void;
}

export function disposeGameBasics(
  cleanup: ReadonlyArray<() => void>,
  hud: Disposable | null,
  particles: Disposable | null,
  cameraPulse: Disposable | null,
): Array<() => void> {
  for (const off of cleanup) off();
  hud?.dispose();
  particles?.dispose();
  cameraPulse?.dispose();
  return [];
}
