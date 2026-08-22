import menuIcon from '../assets/menu_ball-pool.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

interface Ball {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

const BALL_COUNT = 10;
const GRAVITY = 0.35;
const WALL_BOUNCE = 0.72;
const BALL_BOUNCE = 0.88;

class BallPoolActivity implements Activity {
  readonly id = 'ball-pool';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private particles: ParticleSystem | null = null;
  private balls: Ball[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private tapCount = 0;
  private readonly tapVocab: readonly VocabKey[] = ['bounceBall', 'wellDone', 'great'];

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.balls = [];

    const style = document.createElement('style');
    style.textContent = `
      .ball-pool-activity {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 60%, #90CAF9 100%);
        touch-action: none;
      }
      .ball-pool-activity__hint {
        position: absolute;
        top: max(16px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        padding: 8px 26px;
        border: 4px solid #ffffff;
        border-radius: 30px;
        background: rgb(255 255 255 / 94%);
        box-shadow: 0 8px 20px rgb(21 51 74 / 15%);
        font-size: clamp(15px, 2.2vw, 22px);
        font-weight: 700;
        color: #15334a;
        pointer-events: none;
        white-space: nowrap;
      }
      .ball-pool-activity__ball {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        will-change: transform;
        box-shadow:
          inset -6px -6px 12px rgb(21 51 74 / 12%),
          inset 5px 5px 10px rgb(255 255 255 / 60%),
          0 4px 8px rgb(21 51 74 / 10%);
        z-index: 2;
      }
      .ball-pool-activity__ball::after {
        content: '';
        position: absolute;
        top: 18%;
        left: 20%;
        width: 28%;
        height: 20%;
        border-radius: 50%;
        background: rgb(255 255 255 / 55%);
        pointer-events: none;
      }
    `;

    const stage = document.createElement('div');
    stage.className = 'ball-pool-activity';

    const hint = document.createElement('div');
    hint.className = 'ball-pool-activity__hint';
    const lang = context.speech.getLanguage();
    hint.textContent = '⚽ ' + getI18nText('ballPoolHint', lang);

    stage.append(hint);
    context.root.replaceChildren(style, stage);

    // Spawn balls at random positions
    for (let i = 0; i < BALL_COUNT; i++) {
      const ballEl = document.createElement('div');
      ballEl.className = 'ball-pool-activity__ball';
      ballEl.setAttribute('aria-hidden', 'true');

      const size = 80 + Math.random() * 30;
      const hue = (i * 360) / BALL_COUNT + Math.random() * 30;
      ballEl.style.width = size + 'px';
      ballEl.style.height = size + 'px';
      ballEl.style.background = `hsl(${hue}, 75%, 62%)`;
      stage.append(ballEl);

      this.balls.push({
        el: ballEl,
        x: Math.random() * (window.innerWidth - size),
        y: Math.random() * (window.innerHeight * 0.5),
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2,
        r: size / 2,
        hue,
      });
    }

    this.particles = new ParticleSystem(stage);
    context.speech.speak('bounceBall');

    stage.addEventListener('pointerdown', (e) => this.handleTap(e), {
      signal: this.listeners.signal,
    });

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private handleTap(event: PointerEvent): void {
    if (!this.context) return;
    event.preventDefault();

    let hitAny = false;
    for (const b of this.balls) {
      const dx = event.clientX - b.x;
      const dy = event.clientY - b.y;
      if (Math.hypot(dx, dy) < Math.max(b.r, 44)) {
        hitAny = true;
        // Launch upward from tap point
        const angle = Math.atan2(dy, dx);
        const force = 9 + Math.random() * 5;
        b.vx -= Math.cos(angle) * force;
        b.vy -= Math.sin(angle) * force - 4;
        break; // only launch the closest one
      }
    }

    if (!hitAny) {
      // Tap on empty space: emit sparkles there
      this.particles?.emitSparkles(event.clientX, event.clientY, 10, '#FFD93D');
      this.context.sfx.play('tick');
      return;
    }

    this.context.notifyTaskComplete();
    this.context.sfx.play('pop');
    this.context.sfx.playScale((this.tapCount++ * 2) % 8);
    this.context.speech.speak(this.tapVocab[this.tapCount % this.tapVocab.length]!);
    this.particles?.emitSparkles(event.clientX, event.clientY, 12, '#FFD93D');
    this.particles?.emitStars(event.clientX, event.clientY, 6);
  }

  private loop = (time: number): void => {
    if (!this.root || !this.context || this.listeners === null) return;
    const dt = Math.min(32, time - this.lastTime);
    this.lastTime = time;

    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i]!;
      b.vy += GRAVITY * (dt / 16.7);
      b.x += b.vx * (dt / 16.7);
      b.y += b.vy * (dt / 16.7);

      // Wall bounce
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * WALL_BOUNCE; }
      if (b.x > window.innerWidth - b.r) { b.x = window.innerWidth - b.r; b.vx = -Math.abs(b.vx) * WALL_BOUNCE; }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * WALL_BOUNCE; }
      if (b.y > window.innerHeight - b.r) { b.y = window.innerHeight - b.r; b.vy = -Math.abs(b.vy) * WALL_BOUNCE; }

      // Ball-to-ball collision
      for (let j = i + 1; j < this.balls.length; j++) {
        const o = this.balls[j]!;
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b.r + o.r;
        if (dist < minDist && dist > 0.01) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          const mass1 = b.r * b.r;
          const mass2 = o.r * o.r;
          const totalMass = mass1 + mass2;
          b.x -= nx * overlap * (mass2 / totalMass);
          b.y -= ny * overlap * (mass2 / totalMass);
          o.x += nx * overlap * (mass1 / totalMass);
          o.y += ny * overlap * (mass1 / totalMass);
          const dvn = (o.vx - b.vx) * nx + (o.vy - b.vy) * ny;
          if (dvn < 0) {
            const impulse = -(1 + BALL_BOUNCE) * dvn / (1 / mass1 + 1 / mass2);
            b.vx -= impulse * nx / mass1;
            b.vy -= impulse * ny / mass1;
            o.vx += impulse * nx / mass2;
            o.vy += impulse * ny / mass2;
          }
        }
      }

      b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`;
    }

    this.rafId = window.requestAnimationFrame(this.loop);
  };

  unmount(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners?.abort();
    this.listeners = null;
    this.particles?.destroy();
    this.particles = null;
    this.balls = [];
    this.root?.replaceChildren();
    this.root = null;
    this.context = null;
  }
}

export function createBallPoolActivity(): Activity {
  return new BallPoolActivity();
}
export const ballPoolActivity: Activity = new BallPoolActivity();
