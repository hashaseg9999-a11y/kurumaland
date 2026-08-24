import type { Object3D } from 'three';

type Disposable = { dispose(): void };

function collectDisposables(root: Object3D): Disposable[] {
  const found: Disposable[] = [];
  root.traverse((child) => {
    const candidate = child as Partial<Record<'geometry' | 'material', unknown>>;
    if (candidate.geometry && typeof (candidate.geometry as Disposable).dispose === 'function') {
      found.push(candidate.geometry as Disposable);
    }
    const material = candidate.material;
    if (!material) return;
    if (Array.isArray(material)) {
      for (const item of material) {
        if (item && typeof item.dispose === 'function') found.push(item);
      }
    } else if (typeof (material as Disposable).dispose === 'function') {
      found.push(material as Disposable);
    }
  });
  return found;
}

/** Remove an object from its parent and release geometry/material GPU resources. */
export function removeAndDispose(root: Object3D): void {
  for (const item of collectDisposables(root)) item.dispose();
  root.removeFromParent();
}
