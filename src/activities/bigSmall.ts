import bgGarage from '../assets/bg_garage.webp';
import carBlue from '../assets/car_blue.svg';
import carBlueBig from '../assets/car_blue_big.svg';
import carGreen from '../assets/car_green.svg';
import carGreenBig from '../assets/car_green_big.svg';
import carRed from '../assets/car_red.svg';
import carRedBig from '../assets/car_red_big.svg';
import carYellow from '../assets/car_yellow.svg';
import carYellowBig from '../assets/car_yellow_big.svg';
import menuIcon from '../assets/menu_big-small.svg';
import parkingBig from '../assets/parking_big.svg';
import parkingSmall from '../assets/parking_small.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import { VOCAB } from '../core/vocab';

type SizeName = 'big' | 'middle' | 'small';

interface VehicleSet {
  big: string;
  middle: string;
  small: string;
}

interface DragState {
  pointerId: number;
  button: HTMLButtonElement;
  size: SizeName;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  moved: boolean;
}

const VEHICLE_SETS: readonly VehicleSet[] = [
  { big: carRedBig, middle: carRed, small: carRed },
  { big: carBlueBig, middle: carBlue, small: carBlue },
  { big: carYellowBig, middle: carYellow, small: carYellow },
  { big: carGreenBig, middle: carGreen, small: carGreen },
];

const STYLES = `
  .big-small-activity {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: clamp(10px, 2vh, 22px);
    overflow: hidden;
    padding:
      max(92px, calc(env(safe-area-inset-top) + 80px))
      max(28px, calc(env(safe-area-inset-right) + 20px))
      max(20px, calc(env(safe-area-inset-bottom) + 16px))
      max(28px, calc(env(safe-area-inset-left) + 20px));
    background: #dff4ff url("${bgGarage}") center / cover no-repeat;
    touch-action: none;
  }

  /* Cognitive Status Banner */
  .big-small-activity__banner {
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
    font-size: clamp(15px, 2.2vw, 22px);
    font-weight: 800;
    color: #15334a;
    pointer-events: none;
    white-space: nowrap;
  }

  .big-small-activity__row {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: clamp(18px, 4vw, 64px);
    min-height: 0;
  }

  /* Parking Spaces (Big, Middle, Small) */
  .big-small-activity__parking {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    position: relative;
    transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 220ms ease;
  }

  .big-small-activity__parking.is-target {
    transform: scale(1.12);
    filter: drop-shadow(0 0 24px rgba(76, 175, 80, 0.95)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
  }

  .big-small-activity__parking[data-size='big'] {
    width: clamp(210px, 28vw, 360px);
    height: clamp(140px, 23vh, 220px);
  }

  .big-small-activity__parking[data-size='middle'] {
    width: clamp(150px, 20vw, 260px);
    height: clamp(105px, 17vh, 160px);
  }

  .big-small-activity__parking[data-size='small'] {
    width: clamp(110px, 15vw, 190px);
    height: clamp(80px, 13vh, 120px);
  }

  .big-small-activity__parking img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 6px 12px rgb(21 51 74 / 16%));
  }

  .parking-label {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 12px;
    border: 2px solid #ffffff;
    border-radius: 12px;
    background: #2e7d32;
    color: #ffffff;
    font-size: clamp(11px, 1.4vw, 14px);
    font-weight: 800;
    pointer-events: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  /* Cars (Big, Middle, Small) */
  .big-small-activity__car {
    z-index: 2;
    flex: 0 0 auto;
    min-width: 80px;
    min-height: 80px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;
    transform-origin: center;
    will-change: transform;
    transition: transform 180ms ease, filter 180ms ease;
  }

  .big-small-activity__car[data-size='big'] {
    width: clamp(200px, 26vw, 340px);
    height: clamp(135px, 22vh, 210px);
  }

  .big-small-activity__car[data-size='middle'] {
    width: clamp(140px, 19vw, 240px);
    height: clamp(100px, 16vh, 150px);
  }

  .big-small-activity__car[data-size='small'] {
    width: clamp(100px, 14vw, 175px);
    height: clamp(75px, 12vh, 115px);
  }

  .big-small-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 14px rgb(21 51 74 / 22%));
  }

  .big-small-activity__car.is-dragging {
    z-index: 8;
    cursor: grabbing;
    filter: drop-shadow(0 18px 22px rgb(21 51 74 / 35%));
    transform: scale(1.14);
  }

  .big-small-activity__car.is-parked {
    pointer-events: none;
  }
`;

class BigSmallActivity implements Activity {
  readonly id = 'big-small';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private banner: HTMLDivElement | null = null;
  private listeners: AbortController | null = null;
  private dragState: DragState | null = null;
  private readonly parkingSpaces = new Map<SizeName, HTMLElement>();
  private readonly cars = new Map<SizeName, HTMLButtonElement>();
  private particles: ParticleSystem | null = null;
  private parkedCount = 0;
  private roundFinishing = false;
  private setIndex = 0;
  private useThreeSizes = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.context || this.dragState || this.roundFinishing) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>('.big-small-activity__car');
    if (!button || button.dataset.parked === 'true') return;

    const size = button.dataset.size as SizeName | undefined;
    if (!size) return;

    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging');

    const currentLang = this.context.speech.getLanguage();
    if (size === 'big') {
      this.context.sfx.play('engine');
      this.context.speech.speak('bigCar');
      if (this.banner) this.banner.textContent = `🐘 ${getI18nText('bigCarGuide', currentLang)}`;
    } else if (size === 'middle') {
      this.context.sfx.play('pop');
      this.context.speech.speak('middleCar');
      if (this.banner) this.banner.textContent = `🚙 ${getI18nText('middleCarGuide', currentLang)}`;
    } else {
      this.context.sfx.play('bubble');
      this.context.speech.speak('smallCar');
      if (this.banner) this.banner.textContent = `🐤 ${getI18nText('smallCarGuide', currentLang)}`;
    }

    this.dragState = {
      pointerId: event.pointerId,
      button,
      size,
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
    drag.button.style.transform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.14)`;

    // 枠のハイライト判定
    const carRect = drag.button.getBoundingClientRect();
    const cX = carRect.left + carRect.width / 2;
    const cY = carRect.top + carRect.height / 2;

    this.parkingSpaces.forEach((spaceEl, sSize) => {
      const sRect = spaceEl.getBoundingClientRect();
      const isInside =
        cX >= sRect.left - 25 &&
        cX <= sRect.right + 25 &&
        cY >= sRect.top - 25 &&
        cY <= sRect.bottom + 25;

      if (isInside && sSize === drag.size) spaceEl.classList.add('is-target');
      else spaceEl.classList.remove('is-target');
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

    this.parkingSpaces.forEach((s) => s.classList.remove('is-target'));

    if (!drag.moved) {
      drag.button.style.transform = '';
      return;
    }

    const carRect = drag.button.getBoundingClientRect();
    const cX = carRect.left + carRect.width / 2;
    const cY = carRect.top + carRect.height / 2;
    const correctSpace = this.parkingSpaces.get(drag.size);

    if (correctSpace) {
      const sRect = correctSpace.getBoundingClientRect();
      const isInside =
        cX >= sRect.left - 35 &&
        cX <= sRect.right + 35 &&
        cY >= sRect.top - 35 &&
        cY <= sRect.bottom + 35;

      if (isInside) {
        this.parkCar(drag, correctSpace);
        return;
      }
    }

    // 戻る
    this.returnCar(drag);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.setIndex = 0;
    this.useThreeSizes = false;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const board = document.createElement('div');
    board.className = 'big-small-activity';

    const currentLang = context.speech.getLanguage();
    const banner = document.createElement('div');
    banner.className = 'big-small-activity__banner';
    banner.textContent = `📏 ${getI18nText('bigSmallHint', currentLang)}`;
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
    this.parkingSpaces.clear();
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
    this.parkingSpaces.clear();
    this.cars.clear();
    this.parkedCount = 0;
    this.roundFinishing = false;

    const existingBanner = this.banner;
    this.board.replaceChildren();
    const currentLang = this.context.speech.getLanguage();

    if (existingBanner) {
      existingBanner.textContent = `📏 ${getI18nText('bigSmallHint', currentLang)}`;
      this.board.append(existingBanner);
    }

    const set = VEHICLE_SETS[this.setIndex % VEHICLE_SETS.length]!;

    const sizes: SizeName[] = this.useThreeSizes
      ? ['big', 'middle', 'small']
      : ['big', 'small'];

    const shuffledParkingSizes = [...sizes].sort(() => Math.random() - 0.5);
    const shuffledCarSizes = [...sizes].sort(() => Math.random() - 0.5);

    // 駐車枠行（上）
    const parkingRow = document.createElement('div');
    parkingRow.className = 'big-small-activity__row';

    shuffledParkingSizes.forEach((size) => {
      const space = document.createElement('div');
      space.className = 'big-small-activity__parking';
      space.dataset.size = size;

      const img = document.createElement('img');
      img.src = size === 'big' ? parkingBig : parkingSmall;
      img.alt = '';

      const label = document.createElement('span');
      label.className = 'parking-label';
      const sizeVocab = size === 'big' ? VOCAB.big : size === 'middle' ? VOCAB.middle : VOCAB.small;
      label.textContent = sizeVocab[currentLang] ?? sizeVocab.ja;

      space.append(img, label);
      parkingRow.append(space);
      this.parkingSpaces.set(size, space);
    });

    // 車両行（下）
    const carRow = document.createElement('div');
    carRow.className = 'big-small-activity__row';

    shuffledCarSizes.forEach((size) => {
      const carBtn = document.createElement('button');
      carBtn.type = 'button';
      carBtn.className = 'big-small-activity__car';
      carBtn.dataset.size = size;
      carBtn.dataset.parked = 'false';

      const carImg = document.createElement('img');
      carImg.src = size === 'big' ? set.big : size === 'middle' ? set.middle : set.small;
      carImg.alt = '';
      carBtn.append(carImg);

      carRow.append(carBtn);
      this.cars.set(size, carBtn);
    });

    this.board.append(parkingRow, carRow);
  }

  private parkCar(drag: DragState, space: HTMLElement): void {
    if (!this.context) return;
    drag.button.dataset.parked = 'true';
    drag.button.classList.add('is-parked');

    const sRect = space.getBoundingClientRect();
    const cRect = drag.button.getBoundingClientRect();
    const targetX = sRect.left + (sRect.width - cRect.width) / 2;
    const targetY = sRect.top + (sRect.height - cRect.height) / 2;

    const currentTranslateX = drag.deltaX;
    const currentTranslateY = drag.deltaY;
    const finalTranslateX = currentTranslateX + (targetX - cRect.left);
    const finalTranslateY = currentTranslateY + (targetY - cRect.top);

    this.context.sfx.play('snap');
    this.context.speech.speak('perfect');

    if (this.banner) {
      const currentLang = this.context.speech.getLanguage();
      this.banner.textContent = `✨ ${getI18nText('bigSmallFit', currentLang)}`;
    }

    this.particles?.emitStars(sRect.left + sRect.width / 2, sRect.top + sRect.height / 2, 16);
    this.particles?.emitSparkles(sRect.left + sRect.width / 2, sRect.top + sRect.height / 2, 10);

    const anim = drag.button.animate(
      [
        { transform: `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(1.14)` },
        { transform: `translate3d(${finalTranslateX}px, ${finalTranslateY}px, 0) scale(1.0)` },
      ],
      { duration: 280, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    );

    anim.onfinish = () => {
      this.parkedCount++;
      const totalNeeded = this.useThreeSizes ? 3 : 2;
      if (this.parkedCount >= totalNeeded) {
        this.finishRound();
      }
    };
  }

  private returnCar(drag: DragState): void {
    if (!this.context) return;
    this.context.sfx.play('pop');

    drag.button.animate(
      [
        { transform: `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) rotate(5deg)` },
        { transform: `translate3d(${drag.deltaX * 0.5}px, ${drag.deltaY * 0.5}px, 0) rotate(-5deg)`, offset: 0.5 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
      ],
      { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
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
      this.banner.textContent = `🎉 ${getI18nText('bigSmallAllParked', currentLang)}`;
    }

    this.particles?.emitCelebration(this.board.clientWidth / 2, this.board.clientHeight * 0.45);
    this.particles?.emitFlowers(this.board.clientWidth / 2, this.board.clientHeight * 0.45, 12);

    // 車たちが嬉しそうにハイタッチジャンプ
    this.cars.forEach((carBtn) => {
      carBtn.classList.add('car-jumping');
    });

    window.setTimeout(() => {
      if (!this.context) return;
      this.setIndex++;
      this.useThreeSizes = !this.useThreeSizes; // 2段階と3段階をローテーション
      this.startRound();
    }, 2200);
  }
}

export function createBigSmallActivity(): Activity {
  return new BigSmallActivity();
}
export const bigSmallActivity: Activity = new BigSmallActivity();
