import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_lights-sound.svg';
import type { Activity, ActivityContext } from '../core/activity';
import type { VocabKey } from '../core/vocab';
import { ParticleSystem } from '../core/particles';
import type { SfxName } from '../core/sfx';

interface SoundCar {
  id: string;
  car: string;
  label: string;
  sfx: SfxName;
  vocab: VocabKey;
  beamColor: string;
}

const SOUND_CARS: readonly SoundCar[] = [
  {
    id: 'red',
    car: carRed,
    label: 'しょうぼうしゃ',
    sfx: 'siren',
    vocab: 'siren',
    beamColor: '255 61 48',
  },
  {
    id: 'blue',
    car: carBlue,
    label: 'パトカー',
    sfx: 'siren',
    vocab: 'siren',
    beamColor: '68 138 255',
  },
  {
    id: 'yellow',
    car: carYellow,
    label: 'ダンプカー',
    sfx: 'horn',
    vocab: 'hornSound',
    beamColor: '255 215 64',
  },
  {
    id: 'green',
    car: carGreen,
    label: 'トラック',
    sfx: 'horn',
    vocab: 'hornSound',
    beamColor: '105 240 174',
  },
];

const STYLES = `
  .lights-sound-activity {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    padding:
      max(104px, calc(env(safe-area-inset-top) + 92px))
      max(24px, calc(env(safe-area-inset-right) + 18px))
      max(22px, calc(env(safe-area-inset-bottom) + 18px))
      max(24px, calc(env(safe-area-inset-left) + 18px));
    background:
      radial-gradient(circle at 78% 12%, rgb(255 224 130 / 22%), transparent 22%),
      radial-gradient(circle at 20% 85%, rgb(105 240 174 / 14%), transparent 30%),
      linear-gradient(180deg, #232a3d 0%, #2b3248 60%, #3d4459 100%);
    touch-action: none;
  }

  .lights-sound-activity__moon {
    position: absolute;
    top: max(76px, calc(env(safe-area-inset-top) + 64px));
    right: max(56px, calc(env(safe-area-inset-right) + 44px));
    width: clamp(44px, 6vw, 72px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: #ffe082;
    box-shadow: 0 0 28px rgb(255 224 130 / 55%);
    pointer-events: none;
  }

  .lights-sound-activity__star {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ffffff;
    opacity: 0.7;
    pointer-events: none;
  }

  .lights-sound-activity__row {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(14px, 3vw, 34px);
    width: min(860px, 94%);
    height: min(62vh, 520px);
    align-self: center;
  }

  .lights-sound-activity__car {
    position: relative;
    display: grid;
    min-width: 80px;
    min-height: 80px;
    padding: clamp(6px, 1.2vw, 14px);
    place-items: center;
    border: 4px solid rgb(255 255 255 / 18%);
    border-radius: clamp(22px, 3vw, 34px);
    background: rgb(255 255 255 / 8%);
    box-shadow: 0 12px 24px rgb(0 0 0 / 28%);
    cursor: pointer;
    touch-action: none;
  }

  .lights-sound-activity__car img {
    width: auto;
    height: 100%;
    max-height: 118px;
    object-fit: contain;
    filter: drop-shadow(0 6px 8px rgb(0 0 0 / 40%));
  }

  .lights-sound-activity__beam {
    position: absolute;
    bottom: 60%;
    left: 72%;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgb(var(--beam-color) / 80%) 0%,
      rgb(var(--beam-color) / 28%) 42%,
      transparent 70%
    );
    opacity: 0;
    pointer-events: none;
    transform: translateX(-6px);
  }

  .lights-sound-activity__car.is-lighting .lights-sound-activity__beam {
    animation: ls-beam 900ms ease-out forwards;
  }

  .lights-sound-activity__car.is-hazarding img {
    animation: ls-blink 300ms steps(2, jump-none) infinite;
  }

  .lights-sound-activity__label {
    position: absolute;
    left: 50%;
    bottom: max(8px, calc(env(safe-area-inset-bottom) + 6px));
    z-index: 3;
    display: inline-block;
    padding: 6px 20px;
    border: 3px solid rgb(255 255 255 / 30%);
    border-radius: 18px;
    background: rgb(255 255 255 / 14%);
    color: #ffffff;
    font-size: clamp(13px, 1.8vw, 18px);
    font-weight: 700;
    opacity: 0;
    transform: translate(-50%, 8px);
    transition: opacity 200ms ease, transform 200ms ease;
    white-space: nowrap;
  }

  .lights-sound-activity__label.is-visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  @keyframes ls-beam {
    0% {
      opacity: 0;
      transform: translateX(-6px) scale(0.5);
    }
    18% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateX(30px) scale(1.6);
    }
  }

  @keyframes ls-blink {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(2.6) saturate(1.4);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lights-sound-activity__car.is-lighting .lights-sound-activity__beam,
    .lights-sound-activity__car.is-hazarding img {
      animation: none;
    }
  }
`;

class LightsSoundActivity implements Activity {
  readonly id = 'lights-sound';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private particles: ParticleSystem | null = null;
  private readonly timers = new Set<number>();
  private readonly labelTimers = new Map<string, number>();

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();

    const style = document.createElement('style');
    style.textContent = STYLES;

    const stage = document.createElement('div');
    stage.className = 'lights-sound-activity';

    const moon = document.createElement('div');
    moon.className = 'lights-sound-activity__moon';
    moon.setAttribute('aria-hidden', 'true');

    const stars = Array.from({ length: 10 }, (_, index) => {
      const star = document.createElement('span');
      star.className = 'lights-sound-activity__star';
      star.style.left = `${(index * 97) % 92 + 2}%`;
      star.style.top = `${((index * 53) % 34) + 4}%`;
      star.style.opacity = String(0.35 + ((index * 13) % 40) / 100);
      return star;
    });

    const row = document.createElement('div');
    row.className = 'lights-sound-activity__row';
    row.setAttribute('aria-label', 'くるまの おとと ひかりあそび');

    for (const item of SOUND_CARS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lights-sound-activity__car';
      button.dataset.carId = item.id;
      button.setAttribute('aria-label', item.label);

      const car = document.createElement('img');
      car.src = item.car;
      car.alt = '';
      car.draggable = false;

      const beam = document.createElement('span');
      beam.className = 'lights-sound-activity__beam';
      beam.style.setProperty('--beam-color', item.beamColor);

      button.append(car, beam);
      button.addEventListener('pointerdown', this.handleCarPointerDown, {
        signal: this.listeners.signal,
      });
      row.append(button);
    }

    const label = document.createElement('div');
    label.className = 'lights-sound-activity__label';
    label.setAttribute('aria-live', 'polite');

    stage.append(moon, ...stars, row, label);
    context.root.replaceChildren(style, stage);

    this.particles = new ParticleSystem(stage);

    label.textContent = 'タップしてね';
    this.showLabel(label, 2_400);
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    for (const timer of this.labelTimers.values()) {
      window.clearTimeout(timer);
    }
    this.labelTimers.clear();
    this.particles?.destroy();
    this.particles = null;
    this.root?.replaceChildren();
    this.root = null;
    this.context = null;
  }

  private readonly handleCarPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.context) {
      return;
    }

    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const carId = target.dataset.carId;
    const item = SOUND_CARS.find((candidate) => candidate.id === carId);
    if (!item) {
      return;
    }

    const label = this.root?.querySelector<HTMLElement>(
      '.lights-sound-activity__label',
    ) ?? undefined;
    this.context.sfx.play(item.sfx);
    this.context.speech.speak(item.vocab);
    this.triggerLight(target, item, label);
  };

  private triggerLight(
    button: HTMLButtonElement,
    item: SoundCar,
    label: HTMLElement | undefined,
  ): void {
    button.classList.remove('is-lighting', 'is-hazarding');

    if (item.id === 'red' || item.id === 'blue') {
      button.classList.add('is-hazarding');
      this.schedule(() => {
        button.classList.remove('is-hazarding');
      }, 1_800);
    } else {
      button.classList.add('is-lighting');
      this.schedule(() => {
        button.classList.remove('is-lighting');
      }, 950);
    }

    if (label) {
      this.showLabel(label, 1_600);
    }

    if (this.particles && this.root) {
      const rootRect = this.root.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      this.particles.emitSparkles(
        buttonRect.left - rootRect.left + buttonRect.width / 2,
        buttonRect.top - rootRect.top + 18,
        10,
        `rgb(${item.beamColor})`,
      );
    }
  }

  private showLabel(label: HTMLElement, durationMs: number): void {
    label.classList.add('is-visible');
    const previous = this.labelTimers.get('label');
    if (previous) {
      window.clearTimeout(previous);
    }
    const timer = window.setTimeout(() => {
      label.classList.remove('is-visible');
      this.labelTimers.delete('label');
    }, durationMs);
    this.labelTimers.set('label', timer);
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }
}

export const lightsSoundActivity: Activity = new LightsSoundActivity();
