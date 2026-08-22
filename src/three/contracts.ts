import type * as THREE from 'three';

export type CarColorName = 'red' | 'blue' | 'yellow' | 'green';
export type GameSfxName = 'chime' | 'pop' | 'horn' | 'sparkle';

export interface GameContext {
  world: World3D;
  overlay: HTMLElement;
  speak(japaneseText: string): void;
  sfx(name: GameSfxName): void;
  complete(): void;
}

export interface GameModule {
  readonly id: string;
  mount(context: GameContext): void;
  unmount(): void;
}

export type PointerRayHandler = (
  event: PointerEvent,
  raycaster: THREE.Raycaster,
) => void;

export type FrameHandler = (deltaSeconds: number, elapsedSeconds: number) => void;

export interface World3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly roadCenterZ: number;
  add(...objects: THREE.Object3D[]): void;
  onUpdate(handler: FrameHandler): () => void;
  onPointerDown(handler: PointerRayHandler): () => void;
  setCameraPreset(preset: 'drive' | 'garage' | 'pool'): void;
  resizeToContainer(): void;
  dispose(): void;
}
