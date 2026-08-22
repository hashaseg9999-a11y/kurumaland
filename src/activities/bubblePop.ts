import menuIcon from '../assets/menu_bubble-pop.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

interface Bubble {
  el: HTMLDivElement;
  x: number;
  y: number;
  vy: number;
  wobblePhase: number;
  size: number;
  popped: boolean;
}

const MAX_BUBBLES = 10;
const SPAWN_INTERVAL_MS = 700;

class BubblePopActivity implements Activity {
  readonly id = 'bubble-pop';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private bubbles: Bubble[] = [];
  private spawnTimerId: number | null = null;
  private rafId: number | null = null;
  private lastTime = 0;
  private particles: ParticleSystem | null = null;
  private tapCount = 0;
  private readonly tapVocab: readonly VocabKey[] = ['bubblePop', 'wellDone', 'genius'];

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.bubbles = [];

    const style = document.createElement('style');
    style.textContent = `
      .bubble-pop-activity {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background: linear-gradient(180deg, #E1F5FE 0%, #B3E5FC 55%, #81D4FA 100%);
        touch-action: none;
      }
      .bubble-pop-activity__hint {
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
      .bubble-pop-activity__bubble {
        position: absolute;
        border-radius: 50%;
        cursor: pointer;
        will-change: transform;
        z-index: 2;
      }
    `;

    const stage = document.createElement('div');
    stage.className = 'bubble-pop-activity';

    const hint = document.createElement('div');
    hint.className = 'bubble-pop-activity__hint';
    hint.textContent = '🫧 ' + getI18nText('bubblePopHint', context.speech.getLanguage());

    stage.append(hint);
    context.root.replaceChildren(style, stage);

    this.stage = stage;
    this.particles = new ParticleSystem(stage);
    context.speech.speak('bubblePop');
    stage.addEventListener('pointerdown', (e) => this.handleTap(e), { signal: this.listeners.signal });

    // Spawn initial bubbles
    for (let i = 0; i < 6; i++) {
      window.setTimeout(() => this.spawnBubble(), i * 200);
    }

    // Periodic spawning
    const scheduleSpawn = (): void => {
      this.spawnTimerId = window.setTimeout(() => {
        if (this.bubbles.length < MAX_BUBBLES) this.spawnBubble();
        scheduleSpawn();
      }, SPAWN_INTERVAL_MS + Math.random() * 500);
    };
    scheduleSpawn();

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private spawnBubble(): void {
    if (!this.stage || !this.context) return;
    const el = document.createElement('div');
    el.className = 'bubble-pop-activity__bubble';
    el.setAttribute('aria-hidden', 'true');

    const size = 36 + Math.random() * 44;
    const huePick = Math.random();
    const grad = huePick < 0.5
      ? `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 92%), rgb(129 212 250 / 50%) 55%, rgb(79 195 247 / 18%) 100%)`
      : `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 88%), rgb(206 147 216 / 42%) 55%, rgb(186 104 200 / 14%) 100%)`;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = grad;
    el.style.border = '2.5px solid rgb(255 255 255 / 70%)';
    el.style.boxShadow = 'inset -3px -3px 8px rgb(255 255 255 / 45%), 0 3px 8px rgb(1 87 155 / 12%)';
    this.stage.append(el);

    this.bubbles.push({
      el,
      x: Math.random() * (window.innerWidth - size),
      y: window.innerHeight + size,
      vy: -(0.4 + Math.random() * 0.7),
      wobblePhase: Math.random() * Math.PI * 2,
      size,
      popped: false,
    });
  }

  private handleTap(event: PointerEvent): void {
    if (!this.context || !this.stage) return;
    event.preventDefault();

    let poppedAny = false;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]!;
      if (b.popped) continue;
      const dx = event.clientX - b.x;
      const dy = event.clientY - b.y;
      if (Math.hypot(dx, dy) < b.size / 2 + 20) {
        b.popped = true;
        poppedAny = true;
        // Pop animation: quick scale up then remove
        b.el.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
        b.el.style.transform += ' scale(1.35)';
        b.el.style.opacity = '0';
        window.setTimeout(() => b.el.remove(), 200);

        this.context.sfx.play('bubble');
        this.particles?.emitBubbles(b.x, b.y, 7);
        this.particles?.emitSparkles(b.x, b.y, 8, '#81D4FA');
        this.tapCount++;
        this.context.sfx.playScale((this.tapCount * 2) % 8);
        this.context.speech.speak(this.tapVocab[this.tapCount % this.tapVocab.length]!);
        break; // pop only the closest bubble
      }
    }

    if (poppedAny) {
      this.context.notifyTaskComplete();
      // Remove popped from array
      this.bubbles = this.bubbles.filter((b) => !b.popped);
    }
  }

  private loop = (time: number): void => {
    if (!this.root || !this.context || this.listeners === null) return;
    const dt = Math.min(32, time - this.lastTime);
    this.lastTime = time;

    for (const b of this.bubbles) {
      b.y += b.vy * (dt / 16.7);
      b.wobblePhase += 0.02 * (dt / 16.7);
      const wobbleX = Math.sin(b.wobblePhase) * 14;
      b.el.style.transform = `translate(${b.x - b.size / 2 + wobbleX}px, ${b.y - b.size / 2}px)`;

      // Recycle bubbles that float off-screen top
      if (b.y < -b.size * 2) {
        b.el.remove();
        b.popped = true;
      }
    }

    this.bubbles = this.bubbles.filter((b) => !b.popped);
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  unmount(): void {
    if (this.spawnTimerId !== null) {
      window.clearTimeout(this.spawnTimerId);
      this.spawnTimerId = null;
    }
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listeners?.abort();
    this.listeners = null;
    this.particles?.destroy();
    this.particles = null;
    this.bubbles = [];
    this.root?.replaceChildren();
    this.root = null;
    this.stage = null;
    this.context = null;
  }
}

export function createBubblePopActivity(): Activity {
  return new BubblePopActivity();
}
export const bubblePopActivity: Activity = new BubblePopActivity();
