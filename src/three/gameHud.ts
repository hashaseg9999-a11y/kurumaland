import type { GameContext, World3D } from './contracts';
import * as THREE from 'three';

type Position3D = { x: number; y: number; z: number };

const PARTICLE_COLORS: readonly string[] = [
  '#ffd54f',
  '#ff8a80',
  '#81d4fa',
  '#a5d6a7',
  '#ce93d8',
  '#ffe082',
];

interface BurstParticle {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector3;
  spin: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

export interface ParticleBurst3D {
  burst(position: Position3D, options?: { count?: number }): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const drawingContext = canvas.getContext('2d');
  if (!drawingContext) throw new Error('2D context is unavailable');
  const glow = drawingContext.createRadialGradient(64, 64, 4, 64, 64, 62);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.32)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawingContext.fillStyle = glow;
  drawingContext.fillRect(0, 0, 128, 128);
  drawingContext.translate(64, 64);
  drawingContext.fillStyle = '#ffffff';
  drawingContext.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 44 : 19;
    const angle = (point / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) drawingContext.moveTo(x, y);
    else drawingContext.lineTo(x, y);
  }
  drawingContext.closePath();
  drawingContext.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createParticleBurst(world: World3D): ParticleBurst3D {
  const texture = createStarTexture();
  const geometry = new THREE.PlaneGeometry(1, 1);
  const particles: BurstParticle[] = [];
  const maxParticles = 64;

  function despawn(index: number): void {
    const particle = particles[index];
    if (!particle) return;
    particle.mesh.removeFromParent();
    particle.mesh.material.dispose();
    particles.splice(index, 1);
  }

  return {
    burst(position, options) {
      const requested = options?.count ?? 14;
      const count = THREE.MathUtils.clamp(Math.floor(requested), 4, 24);
      for (let index = 0; index < count; index += 1) {
        if (particles.length >= maxParticles) despawn(0);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          position.x + (Math.random() - 0.5) * 0.42,
          position.y + (Math.random() - 0.5) * 0.3,
          position.z + (Math.random() - 0.5) * 0.42,
        );
        mesh.renderOrder = 5;
        world.scene.add(mesh);
        const angle = Math.random() * Math.PI * 2;
        const outwardSpeed = 0.7 + Math.random() * 1.5;
        particles.push({
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * outwardSpeed,
            2.1 + Math.random() * 1.9,
            Math.sin(angle) * outwardSpeed,
          ),
          spin: (Math.random() - 0.5) * 7,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.32,
          baseScale: 0.2 + Math.random() * 0.2,
        });
      }
    },
    update(deltaSeconds) {
      const delta = THREE.MathUtils.clamp(deltaSeconds, 0, 0.1);
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]!;
        particle.life += delta;
        const progress = particle.life / particle.maxLife;
        if (progress >= 1) {
          despawn(index);
          continue;
        }
        particle.velocity.y -= 6.4 * delta;
        particle.mesh.position.addScaledVector(particle.velocity, delta);
        particle.mesh.quaternion.copy(world.camera.quaternion);
        particle.mesh.rotateZ(particle.life * particle.spin);
        const fadeIn = Math.min(1, particle.life / 0.07);
        particle.mesh.material.opacity = (1 - progress) * fadeIn;
        particle.mesh.scale.setScalar(particle.baseScale * (0.65 + 0.35 * (1 - progress)));
      }
    },
    dispose() {
      while (particles.length) despawn(particles.length - 1);
      geometry.dispose();
      texture.dispose();
    },
  };
}

export interface CameraMicroPulse3D {
  trigger(): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export function createCameraMicroPulse(world: World3D): CameraMicroPulse3D {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = 0.55;
  const lastOffset = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const offset = new THREE.Vector3();
  let active = false;
  let elapsed = 0;

  return {
    trigger() {
      if (reducedMotion || active) return;
      active = true;
      elapsed = 0;
    },
    update(deltaSeconds) {
      if (!active) return;
      world.camera.position.sub(lastOffset);
      elapsed += THREE.MathUtils.clamp(deltaSeconds, 0, 0.1);
      if (elapsed >= duration) {
        active = false;
        lastOffset.set(0, 0, 0);
        return;
      }
      const progress = elapsed / duration;
      const envelope = Math.sin(Math.PI * progress);
      world.camera.getWorldDirection(forward);
      right.crossVectors(forward, worldUp).normalize();
      offset.copy(forward).multiplyScalar(0.13 * envelope);
      offset.addScaledVector(right, 0.05 * Math.sin(progress * Math.PI * 2) * envelope);
      offset.y += 0.045 * envelope;
      world.camera.position.add(offset);
      lastOffset.copy(offset);
    },
    dispose() {
      if (!active) return;
      world.camera.position.sub(lastOffset);
      active = false;
      lastOffset.set(0, 0, 0);
    },
  };
}

export interface GameHud {
  setProgress(done: number, total: number): void;
  celebrate(message: string): void;
  dispose(): void;
}

const HUD_STYLE = `
[data-game-hud-v2] {
  padding: 9px 20px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(236 248 255 / 92%));
  border: 2.5px solid rgb(255 255 255 / 95%);
  box-shadow: 0 6px 18px rgb(21 51 74 / 20%), inset 0 -3px 0 rgb(88 196 255 / 25%);
}
[data-game-hud-v2] .three-game-hud__title {
  font-size: clamp(16px, 2.2vw, 21px);
  letter-spacing: 0.03em;
}
[data-game-hud-v2] .three-game-hud__progress {
  gap: 7px;
  padding: 3px 4px;
  border-radius: 999px;
}
[data-game-hud-v2] .three-game-hud__dot {
  width: 15px;
  height: 15px;
  border-width: 2.5px;
  border-color: #9db4c4;
  background:
    radial-gradient(circle at 32% 30%, rgb(255 255 255 / 85%) 0 22%, transparent 26%),
    #eef4f8;
  box-shadow: inset 0 -2px 0 rgb(109 127 139 / 30%);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.22s;
}
[data-game-hud-v2] .three-game-hud__dot.is-done {
  border-color: #2e7d32;
  background:
    radial-gradient(circle at 32% 30%, rgb(255 255 255 / 90%) 0 24%, transparent 28%),
    #4caf50;
  box-shadow: inset 0 -2px 0 rgb(46 125 50 / 55%);
  transform: scale(1.18);
}
[data-game-hud-v2] .three-game-hud__celebrate {
  top: -48px;
  padding: 8px 22px;
  border-radius: 999px;
  border: 2.5px solid rgb(255 255 255 / 90%);
  box-shadow: 0 6px 16px rgb(62 39 35 / 28%);
  font-size: clamp(15px, 2.2vw, 21px);
}
[data-game-hud-v2] .three-game-hud__celebrate.is-visible {
  animation: three-game-celebrate-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes three-game-celebrate-pop {
  0% { transform: translateX(-50%) scale(0.55); }
  62% { transform: translateX(-50%) scale(1.09); }
  100% { transform: translateX(-50%) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-game-hud-v2] .three-game-hud__dot,
  [data-game-hud-v2] .three-game-hud__celebrate {
    transition: none;
    animation: none;
  }
}
`;

export function createGameHud(context: GameContext, label: string): GameHud {
  const root = document.createElement('div');
  root.className = 'three-game-hud';
  root.setAttribute('data-three-game-ui', '');
  root.setAttribute('data-game-hud-v2', '');

  const style = document.createElement('style');
  style.textContent = HUD_STYLE;

  const title = document.createElement('span');
  title.className = 'three-game-hud__title';
  title.textContent = label;

  const progress = document.createElement('span');
  progress.className = 'three-game-hud__progress';
  progress.textContent = '';
  progress.setAttribute('role', 'img');

  const celebrateEl = document.createElement('div');
  celebrateEl.className = 'three-game-hud__celebrate';
  celebrateEl.textContent = '';

  root.append(style, progress, title, celebrateEl);
  context.overlay.append(root);

  let celebrateTimer = 0;

  return {
    setProgress(done, total) {
      if (total <= 0) {
        progress.replaceChildren();
        progress.hidden = true;
        progress.removeAttribute('aria-label');
        progress.classList.remove('is-done');
        return;
      }
      const safeTotal = Math.max(0, Math.floor(total));
      const safeDone = Math.min(safeTotal, Math.max(0, Math.floor(done)));
      progress.hidden = false;
      const dots: HTMLSpanElement[] = [];
      for (let index = 0; index < safeTotal; index += 1) {
        const dot = document.createElement('span');
        dot.className = 'three-game-hud__dot';
        if (index < safeDone) dot.classList.add('is-done');
        dots.push(dot);
      }
      progress.setAttribute('aria-label', 'しんこう ' + safeDone + ' / ' + safeTotal);
      progress.classList.toggle('is-done', safeDone >= safeTotal);
      progress.replaceChildren(...dots);
    },
    celebrate(message) {
      celebrateEl.textContent = message;
      celebrateEl.classList.remove('is-visible');
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      void celebrateEl.offsetWidth;
      celebrateEl.classList.add('is-visible');
      celebrateTimer = window.setTimeout(() => {
        celebrateEl.classList.remove('is-visible');
      }, 1800);
    },
    dispose() {
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      root.remove();
    },
  };
}

