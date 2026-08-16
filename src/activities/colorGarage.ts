import bgGarage from '../assets/bg_garage.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import garageBlue from '../assets/garage_blue.svg';
import garageGreen from '../assets/garage_green.svg';
import garageRed from '../assets/garage_red.svg';
import garageYellow from '../assets/garage_yellow.svg';
import menuIcon from '../assets/menu_color-garage.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

type ColorName = 'red' | 'blue' | 'yellow' | 'green';

interface ColorItem {
  color: ColorName;
  nameJa: string;
  car: string;
  garage: string;
  carVocab: VocabKey;
  garageVocab: VocabKey;
  themeColor: string;
}

interface DragState {
  pointerId: number;
  button: HTMLButtonElement;
  color: ColorName;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  moved: boolean;
}

const COLOR_ITEMS: readonly ColorItem[] = [
  { color: 'red', nameJa: 'あか', car: carRed, garage: garageRed, carVocab: 'redCar', garageVocab: 'redGarage', themeColor: '#ff5252' },
  { color: 'blue', nameJa: 'あお', car: carBlue, garage: garageBlue, carVocab: 'blueCar', garageVocab: 'blueGarage', themeColor: '#448aff' },
  { color: 'yellow', nameJa: 'きいろ', car: carYellow, garage: garageYellow, carVocab: 'yellowCar', garageVocab: 'yellowGarage', themeColor: '#ffd740' },
  { color: 'green', nameJa: 'みどり', car: carGreen, garage: garageGreen, carVocab: 'greenCar', garageVocab: 'greenGarage', themeColor: '#69f0ae' },
];

const STYLES = `
  .color-garage-activity {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(14px, 2.5vh, 28px);
    overflow: hidden;
    padding:
      max(92px, calc(env(safe-area-inset-top) + 80px))
      max(28px, calc(env(safe-area-inset-right) + 22px))
      max(22px, calc(env(safe-area-inset-bottom) + 18px))
      max(28px, calc(env(safe-area-inset-left) + 22px));
    background: #dff4ff url("${bgGarage}") center / cover no-repeat;
    touch-action: none;
  }

  /* Cognitive Banner */
  .color-garage-activity__banner {
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
    box-shadow: 0 8px 20px rgb(21 51 74 / 16%);
    font-size: clamp(16px, 2.2vw, 22px);
    font-weight: 800;
    color: #15334a;
    pointer-events: none;
  }

  .color-garage-activity__row {
    display: grid;
    grid-template-columns: repeat(var(--item-count), minmax(104px, 1fr));
    align-items: center;
    justify-items: center;
    gap: clamp(14px, 3.5vw, 48px);
    min-height: 0;
  }

  /* Garage Container & Animated Shutter */
  .color-garage-activity__garage {
    display: grid;
    position: relative;
    width: min(21vw, 240px);
    min-width: 112px;
    height: min(29vh, 225px);
    min-height: 112px;
    place-items: center;
    transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 220ms ease;
  }

  .color-garage-activity__garage.is-target {
    transform: scale(1.12);
    filter: drop-shadow(0 0 24px rgba(255, 215, 0, 0.95)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
  }

  .color-garage-activity__garage img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 14px rgb(21 51 74 / 18%));
  }

  /* Shutter visual overlay on the garage */
  .garage-shutter {
    position: absolute;
    bottom: 12%;
    left: 20%;
    width: 60%;
    height: 52%;
    border-radius: 8px 8px 0 0;
    background: repeating-linear-gradient(180deg, #b0bec5 0 8px, #78909c 8px 16px);
    border: 2px solid #546e7a;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    transform-origin: top center;
    transition: transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease;
    pointer-events: none;
    z-index: 1;
  }

  .color-garage-activity__garage.is-open .garage-shutter {
    transform: scaleY(0.08);
    opacity: 0.7;
  }

  .color-garage-activity__garage.is-parked .garage-shutter {
    transform: scaleY(1);
    opacity: 0.9;
    border-color: #37474f;
  }

  /* Garage Roof Glow Light */
  .garage-light {
    position: absolute;
    top: 6%;
    left: 50%;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    opacity: 0.3;
    transform: translateX(-50%);
    transition: opacity 250ms ease, box-shadow 250ms ease;
    pointer-events: none;
  }

  .color-garage-activity__garage.is-parked .garage-light {
    opacity: 1;
    background: #ffd700;
    box-shadow: 0 0 20px #ffd700, 0 0 35px #ffb300;
  }

  /* Car Button */
  .color-garage-activity__car {
    z-index: 2;
    width: min(20vw, 230px);
    min-width: 104px;
    height: min(22vh, 165px);
    min-height: 104px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;
    transform-origin: center;
    will-change: transform;
    transition: transform 180ms ease, filter 180ms ease;
  }

  .color-garage-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 12px rgb(21 51 74 / 22%));
  }

  .color-garage-activity__car.is-dragging {
    z-index: 8;
    cursor: grabbing;
    filter: drop-shadow(0 18px 22px rgb(21 51 74 / 35%));
    transform: scale(1.15);
  }

  .color-garage-activity__car.is-parked {
    pointer-events: none;
  }
`;

function shuffle<T>(values: readonly T[]): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index]!;
    const swap = shuffled[swapIndex]!;
    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }
  return shuffled;
}

class ColorGarageActivity implements Activity {
  readonly id = 'color-garage';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private banner: HTMLDivElement | null = null;
  private listeners: AbortController | null = null;
  private dragState: DragState | null = null;
  private readonly garages = new Map<ColorName, HTMLElement>();
  private readonly cars = new Map<ColorName, HTMLButtonElement>();
  private particles: ParticleSystem | null = null;
  private colorCount = 2;
  private parkedCount = 0;
  private roundFinishing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.context || this.dragState || this.roundFinishing) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>('.color-garage-activity__car');
    if (!button || button.dataset.parked === 'true') return;

    const color = button.dataset.color as ColorName | undefined;
    if (!color) return;

    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging');

    const item = COLOR_ITEMS.find((c) => c.color === color);
    if (item) {
      this.context.speech.speak(item.carVocab);
      if (this.banner) {
        const currentLang = this.context.speech.getLanguage();
        this.banner.textContent = `🚗 ${getI18nText('garageHint', currentLang)}`;
      }
    }
    this.context.sfx.play('pop');

    // 正しい車庫を開く
    const correctGarage = this.garages.get(color);
    if (correctGarage) {
      correctGarage.classList.add('is-open');
    }

    this.dragState = {
      pointerId: event.pointerId,
      button,
      color,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      moved: false,
    };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const drag = this.dragState;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
    drag.moved ||= Math.hypot(drag.deltaX, drag.deltaY) > 12;
    drag.button.style.transform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.15)`;

    // 車庫のハイライト＆オープン判定
    const carRect = drag.button.getBoundingClientRect();
    const cX = carRect.left + carRect.width / 2;
    const cY = carRect.top + carRect.height / 2;

    this.garages.forEach((garageEl, gColor) => {
      const gRect = garageEl.getBoundingClientRect();
      const isInside =
        cX >= gRect.left - 30 &&
        cX <= gRect.right + 30 &&
        cY >= gRect.top - 30 &&
        cY <= gRect.bottom + 30;

      if (isInside && gColor === drag.color) {
        garageEl.classList.add('is-target', 'is-open');
      } else {
        garageEl.classList.remove('is-target');
        if (gColor !== drag.color && garageEl.dataset.parked !== 'true') {
          garageEl.classList.remove('is-open');
        }
      }
    });
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const drag = this.dragState;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    try {
      drag.button.releasePointerCapture(drag.pointerId);
    } catch {}
    drag.button.classList.remove('is-dragging');
    this.dragState = null;

    // ハイライトクリア
    this.garages.forEach((g) => {
      g.classList.remove('is-target');
      if (g.dataset.parked !== 'true') {
        g.classList.remove('is-open');
      }
    });

    if (!drag.moved) {
      drag.button.style.transform = '';
      return;
    }

    const carRect = drag.button.getBoundingClientRect();
    const cX = carRect.left + carRect.width / 2;
    const cY = carRect.top + carRect.height / 2;
    const correctGarage = this.garages.get(drag.color);

    if (correctGarage) {
      const gRect = correctGarage.getBoundingClientRect();
      const isInsideCorrect =
        cX >= gRect.left - 40 &&
        cX <= gRect.right + 40 &&
        cY >= gRect.top - 40 &&
        cY <= gRect.bottom + 40;

      if (isInsideCorrect) {
        this.parkCar(drag, correctGarage);
        return;
      }
    }

    // 不正解または枠外：ぷるぷる戻る
    this.returnCar(drag);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.colorCount = 2;
    this.roundFinishing = false;
    this.parkedCount = 0;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const board = document.createElement('div');
    board.className = 'color-garage-activity';

    const currentLang = context.speech.getLanguage();
    const banner = document.createElement('div');
    banner.className = 'color-garage-activity__banner';
    banner.textContent = `🎨 ${getI18nText('garageHint', currentLang)}`;
    this.banner = banner;

    board.append(banner);
    context.root.replaceChildren(style, board);

    this.board = board;
    this.particles = new ParticleSystem(board);

    board.addEventListener('pointerdown', this.handlePointerDown, { signal: this.listeners.signal });
    board.addEventListener('pointermove', this.handlePointerMove, { signal: this.listeners.signal });
    board.addEventListener('pointerup', this.handlePointerUp, { signal: this.listeners.signal });
    board.addEventListener('pointercancel', this.handlePointerUp, { signal: this.listeners.signal });

    this.startRound();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    this.particles?.destroy();
    this.particles = null;
    this.garages.clear();
    this.cars.clear();
    this.root?.replaceChildren();
    this.banner = null;
    this.board = null;
    this.root = null;
    this.context = null;
    this.dragState = null;
    this.roundFinishing = false;
  }

  private startRound(): void {
    if (!this.board || !this.context) return;
    this.garages.clear();
    this.cars.clear();
    this.parkedCount = 0;
    this.roundFinishing = false;

    // バナーを残して子要素をリセット
    const existingBanner = this.banner;
    this.board.replaceChildren();
    if (existingBanner) {
      const currentLang = this.context.speech.getLanguage();
      existingBanner.textContent = `🎨 ${getI18nText('garageHint', currentLang)}`;
      this.board.append(existingBanner);
    }

    const selectedItems = COLOR_ITEMS.slice(0, this.colorCount);
    const shuffledCars = shuffle(selectedItems);
    const shuffledGarages = shuffle(selectedItems);

    this.board.style.setProperty('--item-count', String(this.colorCount));

    // 車庫行（上）
    const garageRow = document.createElement('div');
    garageRow.className = 'color-garage-activity__row';
    shuffledGarages.forEach((item) => {
      const garageEl = document.createElement('div');
      garageEl.className = 'color-garage-activity__garage';
      garageEl.dataset.color = item.color;
      garageEl.dataset.parked = 'false';

      const img = document.createElement('img');
      img.src = item.garage;
      img.alt = '';

      const shutter = document.createElement('div');
      shutter.className = 'garage-shutter';

      const light = document.createElement('div');
      light.className = 'garage-light';

      garageEl.append(img, shutter, light);
      garageRow.append(garageEl);
      this.garages.set(item.color, garageEl);
    });

    // 車行（下）
    const carRow = document.createElement('div');
    carRow.className = 'color-garage-activity__row';
    shuffledCars.forEach((item) => {
      const carBtn = document.createElement('button');
      carBtn.type = 'button';
      carBtn.className = 'color-garage-activity__car';
      carBtn.dataset.color = item.color;
      carBtn.dataset.parked = 'false';

      const img = document.createElement('img');
      img.src = item.car;
      img.alt = '';
      carBtn.append(img);
      carRow.append(carBtn);
      this.cars.set(item.color, carBtn);
    });

    this.board.append(garageRow, carRow);
  }

  private parkCar(drag: DragState, garage: HTMLElement): void {
    if (!this.context) return;
    drag.button.dataset.parked = 'true';
    drag.button.classList.add('is-parked');
    garage.dataset.parked = 'true';
    garage.classList.add('is-parked', 'is-open');

    const gRect = garage.getBoundingClientRect();
    const cRect = drag.button.getBoundingClientRect();
    const targetX = gRect.left + (gRect.width - cRect.width) / 2;
    const targetY = gRect.top + gRect.height * 0.45;

    const currentTranslateX = drag.deltaX;
    const currentTranslateY = drag.deltaY;
    const finalTranslateX = currentTranslateX + (targetX - cRect.left);
    const finalTranslateY = currentTranslateY + (targetY - cRect.top);

    this.context.sfx.play('chime');
    const item = COLOR_ITEMS.find((c) => c.color === drag.color);
    if (item) {
      this.context.speech.speak(item.garageVocab);
      if (this.banner) {
        const currentLang = this.context.speech.getLanguage();
        this.banner.textContent = `✨ ${getI18nText('garageMatch', currentLang)}`;
      }
    }

    // 星エフェクト
    this.particles?.emitStars(gRect.left + gRect.width / 2, gRect.top + gRect.height / 2, 16, [item?.themeColor ?? '#ffd700', '#ffffff']);
    this.particles?.emitSparkles(gRect.left + gRect.width / 2, gRect.top + gRect.height / 2, 12);

    const anim = drag.button.animate(
      [
        { transform: `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(1.15)` },
        { transform: `translate3d(${finalTranslateX}px, ${finalTranslateY}px, 0) scale(0.85)` },
      ],
      { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    );

    anim.onfinish = () => {
      this.parkedCount++;
      if (this.parkedCount >= this.colorCount) {
        this.finishRound();
      }
    };
  }

  private returnCar(drag: DragState): void {
    if (!this.context) return;
    this.context.sfx.play('pop');

    drag.button.animate(
      [
        { transform: `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) rotate(6deg)` },
        { transform: `translate3d(${drag.deltaX * 0.5}px, ${drag.deltaY * 0.5}px, 0) rotate(-6deg)`, offset: 0.5 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    );
  }

  private finishRound(): void {
    if (!this.context || !this.board || this.roundFinishing) return;
    this.roundFinishing = true;

    this.context.notifyTaskComplete();
    this.context.sfx.play('fanfare');
    this.context.speech.speak('great');

    if (this.banner) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `🎉 ${getI18nText('garageAllParked', currentLang)}`;
    }

    this.particles?.emitCelebration(this.board.clientWidth / 2, this.board.clientHeight * 0.45);
    this.particles?.emitFlowers(this.board.clientWidth / 2, this.board.clientHeight * 0.45, 12);

    // 全車の一斉ジャンプ＆クラクション
    this.cars.forEach((carBtn) => {
      carBtn.classList.add('car-jumping');
    });

    window.setTimeout(() => {
      if (!this.context) return;
      this.colorCount = this.colorCount === 2 ? 3 : this.colorCount === 3 ? 4 : 2;
      this.startRound();
    }, 2200);
  }
}

export function createColorGarageActivity(): Activity {
  return new ColorGarageActivity();
}
export const colorGarageActivity: Activity = new ColorGarageActivity();
