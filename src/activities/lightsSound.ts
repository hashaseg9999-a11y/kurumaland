import bgNight from '../assets/bg_night.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_lights-sound.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { SfxName } from '../core/sfx';
import type { VocabKey } from '../core/vocab';

interface SoundCar {
  id: string;
  car: string;
  nameJa: string;
  sfx: SfxName;
  vocab: VocabKey;
  beamColor: string;
  scaleIndex: number;
}

const SOUND_CARS: readonly SoundCar[] = [
  { id: 'red', car: carRed, nameJa: 'しょうぼうしゃ', sfx: 'siren', vocab: 'siren', beamColor: '255, 61, 48', scaleIndex: 0 },
  { id: 'blue', car: carBlue, nameJa: 'パトカー', sfx: 'policeSiren', vocab: 'policeSound', beamColor: '68, 138, 255', scaleIndex: 2 },
  { id: 'yellow', car: carYellow, nameJa: 'ダンプカー', sfx: 'horn', vocab: 'hornSound', beamColor: '255, 215, 64', scaleIndex: 4 },
  { id: 'green', car: carGreen, nameJa: 'トラック', sfx: 'horn', vocab: 'hornSound', beamColor: '105, 240, 174', scaleIndex: 7 },
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
      max(92px, calc(env(safe-area-inset-top) + 80px))
      max(24px, calc(env(safe-area-inset-right) + 18px))
      max(22px, calc(env(safe-area-inset-bottom) + 18px))
      max(24px, calc(env(safe-area-inset-left) + 18px));
    background: #141b2b url("${bgNight}") center / cover no-repeat;
    touch-action: none;
  }

  /* Status Banner */
  .lights-sound-activity__banner {
    position: absolute;
    top: max(16px, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 26px;
    border: 4px solid #ffffff;
    border-radius: 30px;
    background: rgb(255 255 255 / 94%);
    box-shadow: 0 8px 20px rgb(0 0 0 / 35%);
    font-size: clamp(15px, 2.2vw, 22px);
    font-weight: 800;
    color: #15334a;
    pointer-events: none;
    white-space: nowrap;
  }

  .lights-sound-activity__moon {
    position: absolute;
    top: max(72px, calc(env(safe-area-inset-top) + 60px));
    right: max(48px, calc(env(safe-area-inset-right) + 36px));
    width: clamp(52px, 7vw, 84px);
    aspect-ratio: 1;
    border-radius: 50%;
    background: #ffe082;
    box-shadow: 0 0 36px rgb(255 224 130 / 65%), 0 0 70px rgb(255 215 64 / 35%);
    pointer-events: none;
    animation: moonGlow 3s ease-in-out infinite alternate;
  }

  @keyframes moonGlow {
    from { transform: scale(1); filter: brightness(1); }
    to { transform: scale(1.06); filter: brightness(1.2); }
  }

  .lights-sound-activity__star {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffffff;
    opacity: 0.8;
    pointer-events: none;
    box-shadow: 0 0 8px #ffffff;
  }

  .lights-sound-activity__row {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(14px, 3.5vw, 36px);
    width: min(880px, 94%);
    height: min(64vh, 530px);
    align-self: center;
  }

  .lights-sound-activity__car {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    min-height: 80px;
    padding: clamp(8px, 1.4vw, 16px);
    border: 4px solid rgb(255 255 255 / 24%);
    border-radius: clamp(24px, 3.5vw, 36px);
    background: rgb(255 255 255 / 12%);
    box-shadow: 0 14px 28px rgb(0 0 0 / 35%);
    cursor: pointer;
    touch-action: none;
    transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), background 200ms ease, border-color 200ms ease;
  }

  .lights-sound-activity__car:active {
    transform: scale(0.94);
  }

  .lights-sound-activity__car img {
    width: auto;
    height: 75%;
    max-height: 125px;
    object-fit: contain;
    filter: drop-shadow(0 8px 12px rgb(0 0 0 / 50%));
    transition: filter 200ms ease;
  }

  .car-label-tag {
    margin-top: 6px;
    padding: 4px 14px;
    border: 2px solid rgb(255 255 255 / 40%);
    border-radius: 12px;
    background: rgb(255 255 255 / 20%);
    color: #ffffff;
    font-size: clamp(12px, 1.6vw, 16px);
    font-weight: 800;
    pointer-events: none;
  }

  /* Headlight Beam */
  .lights-sound-activity__beam {
    position: absolute;
    bottom: 50%;
    left: 70%;
    width: 170px;
    height: 170px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(var(--beam-color), 0.95) 0%,
      rgba(var(--beam-color), 0.35) 40%,
      transparent 70%
    );
    opacity: 0;
    pointer-events: none;
  }

  .lights-sound-activity__car.is-lighting .lights-sound-activity__beam {
    animation: ls-beam 900ms ease-out forwards;
  }

  .lights-sound-activity__car.is-lighting {
    border-color: rgba(var(--beam-color), 0.9);
    background: rgba(var(--beam-color), 0.25);
  }

  .lights-sound-activity__car.is-hazarding img {
    animation: ls-blink 260ms steps(2, jump-none) 6;
  }

  @keyframes ls-beam {
    0% {
      opacity: 0;
      transform: translateX(-10px) scale(0.5);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateX(45px) scale(1.8);
    }
  }

  @keyframes ls-blink {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(2.8) saturate(1.5);
    }
  }
`;

class LightsSoundActivity implements Activity {
  readonly id = 'lights-sound';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private banner: HTMLDivElement | null = null;
  private listeners: AbortController | null = null;
  private particles: ParticleSystem | null = null;
  private tapCount = 0;

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.tapCount = 0;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const stage = document.createElement('div');
    stage.className = 'lights-sound-activity';

    const currentLang = context.speech.getLanguage();
    const banner = document.createElement('div');
    banner.className = 'lights-sound-activity__banner';
    banner.textContent = `🌙 ${getI18nText('lightsSoundHint', currentLang)}`;
    this.banner = banner;

    const moon = document.createElement('div');
    moon.className = 'lights-sound-activity__moon';
    moon.setAttribute('aria-hidden', 'true');

    const stars = Array.from({ length: 14 }, (_, index) => {
      const star = document.createElement('span');
      star.className = 'lights-sound-activity__star';
      star.style.left = `${(index * 83) % 92 + 3}%`;
      star.style.top = `${((index * 47) % 36) + 4}%`;
      star.style.opacity = String(0.4 + ((index * 17) % 50) / 100);
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
      button.setAttribute('aria-label', item.nameJa);
      button.style.setProperty('--beam-color', item.beamColor);

      const car = document.createElement('img');
      car.src = item.car;
      car.alt = '';
      car.draggable = false;

      const beam = document.createElement('span');
      beam.className = 'lights-sound-activity__beam';

      const tag = document.createElement('span');
      tag.className = 'car-label-tag';
      tag.textContent = item.nameJa;

      button.append(car, beam, tag);
      button.addEventListener('pointerdown', (e) => this.handleCarTap(e, item, button), {
        signal: this.listeners.signal,
      });
      row.append(button);
    }

    stage.append(banner, moon, ...stars, row);
    context.root.replaceChildren(style, stage);

    this.particles = new ParticleSystem(stage);
    context.speech.speak('nightExplore');
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.particles?.destroy();
    this.particles = null;
    this.root?.replaceChildren();
    this.banner = null;
    this.root = null;
    this.context = null;
  }

  private handleCarTap(event: PointerEvent, item: SoundCar, button: HTMLButtonElement): void {
    event.preventDefault();
    if (!this.context) return;

    this.tapCount++;
    this.context.notifyTaskComplete();

    // 音声＆効果音
    this.context.sfx.play(item.sfx);
    this.context.sfx.playScale((this.tapCount * 2) % 8); // ドレミ音階が楽しく巡回
    this.context.speech.speak(item.vocab);

    if (this.banner) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `✨ ${getI18nText('lightsSoundPlay', currentLang)}`;
    }

    // 光ビーム演出
    button.classList.remove('is-lighting', 'is-hazarding');
    void button.offsetWidth; // reflow
    button.classList.add('is-lighting');

    if (item.id === 'red' || item.id === 'blue') {
      button.classList.add('is-hazarding');
    }

    // 車のジャンプ
    button.classList.remove('car-jumping');
    void button.offsetWidth;
    button.classList.add('car-jumping');

    // パーティクル（音符・星・光）
    const rect = button.getBoundingClientRect();
    const cX = rect.left + rect.width * 0.7;
    const cY = rect.top + rect.height * 0.35;
    this.particles?.emitMusicNotes(cX, cY, 4);
    this.particles?.emitSparkles(cX, cY, 14, `rgb(${item.beamColor})`);
    this.particles?.emitStars(cX, cY, 8);
  }
}

export function createLightsSoundActivity(): Activity {
  return new LightsSoundActivity();
}
export const lightsSoundActivity: Activity = new LightsSoundActivity();
