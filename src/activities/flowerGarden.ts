import menuIcon from '../assets/menu_flower-garden.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

interface Bloom {
  el: HTMLDivElement;
  x: number;
  y: number;
  size: number;
  hue: number;
  swayPhase: number;
  swaySpeed: number;
  isDandelion: boolean;
}

const MAX_FLOWERS = 18;

class FlowerGardenActivity implements Activity {
  readonly id = 'flower-garden';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private particles: ParticleSystem | null = null;
  private blooms: Bloom[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private tapCount = 0;
  private readonly tapVocab: readonly VocabKey[] = ['flower', 'bloom', 'wellDone', 'great'];
  private flyingSeeds: Array<{
    el: HTMLSpanElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  }> = [];

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.blooms = [];

    const style = document.createElement('style');
    style.textContent = `
      .flower-garden-activity {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background:
          radial-gradient(circle at 82% 12%, rgb(255 241 118 / 55%) 0 8%, transparent 9%),
          linear-gradient(180deg, #E8F5E9 0%, #DCEDC8 58%, #C5E1A5 100%);
        touch-action: none;
      }
      .flower-garden-activity__hint {
        position: absolute;
        top: max(16px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        padding: 8px 26px;
        border: 4px solid #ffffff;
        border-radius: 30px;
        background: rgb(255 255 255 / 94%);
        box-shadow: 0 8px 20px rgb(51 105 30 / 18%);
        font-size: clamp(15px, 2.2vw, 22px);
        font-weight: 700;
        color: #33691e;
        pointer-events: none;
        white-space: nowrap;
      }
      .flower-garden-activity__bloom {
        position: absolute;
        z-index: 2;
        transform-origin: bottom center;
        animation: flower-bloom 520ms cubic-bezier(0.34, 1.56, 0.64, 1);
        will-change: transform;
      }
      @keyframes flower-bloom {
        from { opacity: 0; transform: scale(0.2); }
        to { opacity: 1; transform: scale(1); }
      }
      .flower-garden-activity__stem {
        position: absolute;
        left: 47%;
        top: 42%;
        width: 6%;
        height: 56%;
        border-radius: 4px;
        background: linear-gradient(90deg, #689F38 0%, #7CB342 100%);
      }
      .flower-garden-activity__leaf {
        position: absolute;
        width: 34%;
        height: 20%;
        background: #7CB342;
        border-radius: 60% 10% 60% 10%;
      }
      .flower-garden-activity__petals {
        position: absolute;
        left: 15%;
        top: 6%;
        width: 70%;
        aspect-ratio: 1;
        border-radius: 50%;
        display: grid;
        place-items: center;
      }
      .flower-garden-activity__face {
        position: relative;
        width: 34%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(circle at 36% 30%, #ffe082, #ffb300);
        box-shadow:
          inset 0 -3px 5px rgb(141 78 0 / 20%),
          0 3px 7px rgb(51 105 30 / 18%);
      }
      .flower-garden-activity__eye {
        position: absolute;
        top: 32%;
        width: 15%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: #4e342e;
      }
      .flower-garden-activity__eye--left { left: 25%; }
      .flower-garden-activity__eye--right { right: 25%; }
      .flower-garden-activity__mouth {
        position: absolute;
        left: 50%;
        bottom: 22%;
        width: 38%;
        height: 22%;
        transform: translateX(-50%);
        border-bottom-left-radius: 100px;
        border-bottom-right-radius: 100px;
        background: #4e342e;
      }
      .flower-garden-activity__cheek {
        position: absolute;
        top: 52%;
        width: 16%;
        height: 10%;
        border-radius: 50%;
        background: rgb(255 122 144 / 65%);
      }
      .flower-garden-activity__cheek--left { left: 10%; }
      .flower-garden-activity__cheek--right { right: 10%; }
      .flower-garden-activity__seed {
        position: absolute;
        left: 48%;
        top: 38%;
        width: 14px;
        aspect-ratio: 1;
        border-radius: 50% 50% 50% 0;
        background: #FFF9C4;
        box-shadow: inset -2px -2px 3px rgb(220 200 100 / 70%);
        pointer-events: none;
        z-index: 3;
      }
      .flower-garden-activity__dandelion-head {
        position: absolute;
        left: 28%;
        top: 8%;
        width: 44%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(circle, rgb(255 255 255 / 96%) 22%, transparent 23%);
        filter: drop-shadow(0 2px 3px rgb(130 150 90 / 35%));
      }
      .flower-garden-activity__dandelion-stem {
        position: absolute;
        left: 47%;
        top: 40%;
        width: 6%;
        height: 54%;
        border-radius: 4px;
        background: linear-gradient(90deg, #689F38 0%, #7CB342 100%);
      }
    `;

    const stage = document.createElement('div');
    stage.className = 'flower-garden-activity';
    const hint = document.createElement('div');
    hint.className = 'flower-garden-activity__hint';
    hint.textContent = '🌼 ' + getI18nText('flowerGardenHint', context.speech.getLanguage());
    stage.append(hint);
    context.root.replaceChildren(style, stage);
    this.stage = stage;
    this.particles = new ParticleSystem(stage);
    context.speech.speak('flower');
    context.notifyTaskComplete();
    stage.addEventListener('pointerdown', (event) => this.handleTap(event), {
      signal: this.listeners.signal,
    });
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private handleTap(event: PointerEvent): void {
    if (!this.context || !this.stage) return;
    event.preventDefault();

    const bounds = this.stage.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    const dandelion = this.blooms.find((bloom) => {
      if (!bloom.isDandelion) return false;
      // Use the bloom element's bounding rect center (covers head area)
      const rect = bloom.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.35;
      return Math.hypot(event.clientX - cx, event.clientY - cy) < Math.max(rect.width / 2 + 16, 44);
    });
    if (dandelion) {
      this.blowDandelion(dandelion, event.clientX, event.clientY);
      this.context.notifyTaskComplete();
      this.context.sfx.play('sparkle');
      this.context.speech.speak('dandelion');
      this.particles?.emitSparkles(event.clientX, event.clientY, 10, '#FFF9C4');
      return;
    }

    this.createBloom(localX, localY);
    this.tapCount += 1;
    this.context.notifyTaskComplete();
    this.context.sfx.play(Math.random() < 0.5 ? 'chime' : 'snap');
    this.context.sfx.playScale((this.tapCount * 3) % 8);
    this.context.speech.speak(this.tapVocab[this.tapCount % this.tapVocab.length]!);
    this.particles?.emitFlowers(event.clientX, event.clientY, 7);
  }

  private createBloom(x: number, y: number): void {
    if (!this.stage) return;
    while (this.blooms.length >= MAX_FLOWERS) {
      const oldest = this.blooms.shift();
      oldest?.el.remove();
    }

    const isDandelion = this.tapCount > 0 && (this.tapCount + 1) % 5 === 0;
    const size = isDandelion ? 104 : 104 + Math.random() * 38;
    const bloomTop = y - size / 2;
    const hue = Math.floor(Math.random() * 360 / 40) * 40;
    const el = document.createElement('div');
    el.className = 'flower-garden-activity__bloom';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = String(x - size / 2) + 'px';
    el.style.top = String(bloomTop) + 'px';
    el.style.width = String(size) + 'px';
    el.style.height = String(size) + 'px';

    if (isDandelion) {
      const stem = document.createElement('span');
      stem.className = 'flower-garden-activity__dandelion-stem';
      const head = document.createElement('span');
      head.className = 'flower-garden-activity__dandelion-head';
      head.textContent = '✼';
      head.style.display = 'grid';
      head.style.placeItems = 'center';
      head.style.fontSize = String(size * 0.34) + 'px';
      head.style.color = 'rgb(255 255 255 / 90%)';
      el.append(stem, head);
    } else {
      const petals = document.createElement('div');
      petals.className = 'flower-garden-activity__petals';
      const petalCount = 6;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i * 360) / petalCount;
        const petal = document.createElement('span');
        Object.assign(petal.style, {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '42%',
          height: '42%',
          borderRadius: '60% 10% 60% 10%',
          background: `hsl(${hue} 78% 70%)`,
          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-38%) scale(1)`,
        });
        petals.append(petal);
      }
      const center = document.createElement('span');
      Object.assign(center.style, {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: '40%',
        height: '40%',
        borderRadius: '50%',
        background: '#FFD54F',
        transform: 'translate(-50%, -50%)',
      });
      center.className = 'flower-garden-activity__face';
      const faceMood = this.tapCount % 3;
      for (const side of ['left', 'right'] as const) {
        const eye = document.createElement('span');
        eye.className = `flower-garden-activity__eye flower-garden-activity__eye--${side}`;
        if (faceMood === 1 && side === 'left') {
          eye.style.borderRadius = '50% 50% 0 0';
          eye.style.height = '9%';
          eye.style.top = '35%';
        }
        center.append(eye);
      }
      const mouth = document.createElement('span');
      mouth.className = 'flower-garden-activity__mouth';
      if (faceMood === 1) {
        mouth.style.borderBottomLeftRadius = '8px';
        mouth.style.borderBottomRightRadius = '8px';
        mouth.style.borderTopLeftRadius = '100px';
        mouth.style.borderTopRightRadius = '100px';
        mouth.style.bottom = '28%';
      } else if (faceMood === 2) {
        mouth.style.width = '24%';
        mouth.style.height = '24%';
        mouth.style.bottom = '26%';
        mouth.style.borderRadius = '50%';
      }
      center.append(mouth);
      for (const side of ['left', 'right'] as const) {
        const cheek = document.createElement('span');
        cheek.className = `flower-garden-activity__cheek flower-garden-activity__cheek--${side}`;
        center.append(cheek);
      }
      const stem = document.createElement('div');
      stem.className = 'flower-garden-activity__stem';
      const leaf = document.createElement('div');
      leaf.className = 'flower-garden-activity__leaf';
      leaf.style.left = '-22%';
      leaf.style.top = '68%';
      stem.append(leaf);
      el.append(stem, petals, center);
    }

    this.stage.append(el);
    this.blooms.push({
      el,
      x,
      y: bloomTop + size * 0.35,
      size,
      hue,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.012 + Math.random() * 0.01,
      isDandelion,
    });
  }

  private blowDandelion(bloom: Bloom, clientX: number, clientY: number): void {
    bloom.el.remove();
    this.blooms = this.blooms.filter((candidate) => candidate !== bloom);
    for (let i = 0; i < 12; i++) {
      const seedEl = document.createElement('span');
      seedEl.className = 'flower-garden-activity__seed';
      seedEl.textContent = '❊';
      seedEl.style.color = '#FFF9C4';
      seedEl.style.fontSize = '16px';
      this.stage?.append(seedEl);
      const angle = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5);
      const speed = 2.2 + Math.random() * 1.8;
      this.flyingSeeds.push({
        el: seedEl,
        x: clientX,
        y: clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 75,
      });
    }
  }

  private loop = (time: number): void => {
    if (!this.root || !this.context || this.listeners === null) return;
    const dt = Math.min(32, time - this.lastTime);
    this.lastTime = time;
    for (const bloom of this.blooms) {
      bloom.swayPhase += bloom.swaySpeed * (dt / 16.7);
      const sway = Math.sin(bloom.swayPhase) * (bloom.isDandelion ? 4 : 6);
      bloom.el.style.transform = `translateX(${sway}px) rotate(${sway * 0.25}deg)`;
    }
    for (let i = this.flyingSeeds.length - 1; i >= 0; i--) {
      const seed = this.flyingSeeds[i]!;
      seed.life += dt / 16.7;
      seed.x += seed.vx;
      seed.y += seed.vy;
      seed.vy += 0.03;
      seed.el.style.transform = `translate(${seed.x}px, ${seed.y}px) rotate(${seed.life * 5}deg)`;
      seed.el.style.opacity = String(Math.max(0, 1 - seed.life / seed.maxLife));
      if (seed.life >= seed.maxLife) {
        seed.el.remove();
        this.flyingSeeds.splice(i, 1);
      }
    }
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  unmount(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const seed of this.flyingSeeds) {
      seed.el.remove();
    }
    this.flyingSeeds = [];
    this.listeners?.abort();
    this.listeners = null;
    this.particles?.destroy();
    this.particles = null;
    this.blooms = [];
    this.root?.replaceChildren();
    this.root = null;
    this.stage = null;
    this.context = null;
  }
}

export function createFlowerGardenActivity(): Activity {
  return new FlowerGardenActivity();
}
export const flowerGardenActivity: Activity = new FlowerGardenActivity();
