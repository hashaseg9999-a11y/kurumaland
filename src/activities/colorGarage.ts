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
import { ParticleSystem } from '../core/particles';

type ColorName = 'red' | 'blue' | 'yellow' | 'green';

interface ColorItem {
  color: ColorName;
  car: string;
  garage: string;
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
  { color: 'red', car: carRed, garage: garageRed },
  { color: 'blue', car: carBlue, garage: garageBlue },
  { color: 'yellow', car: carYellow, garage: garageYellow },
  { color: 'green', car: carGreen, garage: garageGreen },
];

const STYLES = `
  .color-garage-activity {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: clamp(12px, 2vh, 24px);
    overflow: hidden;
    padding:
      max(104px, calc(env(safe-area-inset-top) + 92px))
      max(28px, calc(env(safe-area-inset-right) + 22px))
      max(22px, calc(env(safe-area-inset-bottom) + 18px))
      max(28px, calc(env(safe-area-inset-left) + 22px));
    background:
      radial-gradient(circle at 50% 16%, rgb(255 255 255 / 80%), transparent 34%),
      linear-gradient(#dff4ff 0 56%, #b8e7ad 56% 100%);
  }

  .color-garage-activity__row {
    display: grid;
    grid-template-columns: repeat(var(--item-count), minmax(104px, 1fr));
    align-items: center;
    justify-items: center;
    gap: clamp(12px, 3vw, 44px);
    min-height: 0;
  }

  .color-garage-activity__garage {
    display: grid;
    width: min(19vw, 238px);
    min-width: 112px;
    height: min(28vh, 218px);
    min-height: 112px;
    place-items: center;
  }

  .color-garage-activity__garage img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .color-garage-activity__car {
    z-index: 2;
    width: min(18vw, 220px);
    min-width: 104px;
    height: min(20vh, 156px);
    min-height: 104px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: grab;
    touch-action: none;
    transform-origin: center;
    will-change: transform;
  }

  .color-garage-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .color-garage-activity__car.is-dragging {
    z-index: 8;
    cursor: grabbing;
    filter: drop-shadow(0 12px 10px rgb(21 51 74 / 20%));
  }

  .color-garage-activity__car.is-parked {
    pointer-events: none;
  }

  @media (max-height: 620px) and (orientation: landscape) {
    .color-garage-activity {
      padding-top: 88px;
      gap: 8px;
    }

    .color-garage-activity__garage {
      height: 25vh;
    }

    .color-garage-activity__car {
      height: 18vh;
    }
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

function isInsideExpandedTarget(
  x: number,
  y: number,
  target: HTMLElement,
): boolean {
  const rect = target.getBoundingClientRect();
  const horizontalPadding = rect.width * 0.25;
  const verticalPadding = rect.height * 0.25;
  return (
    x >= rect.left - horizontalPadding &&
    x <= rect.right + horizontalPadding &&
    y >= rect.top - verticalPadding &&
    y <= rect.bottom + verticalPadding
  );
}

class ColorGarageActivity implements Activity {
  readonly id = 'color-garage';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private dragState: DragState | null = null;
  private readonly garages = new Map<ColorName, HTMLElement>();
  private readonly animations = new Set<Animation>();
  private readonly carAnimations = new Map<HTMLButtonElement, Animation>();
  private readonly timers = new Set<number>();
  private particles: ParticleSystem | null = null;
  private colorCount = 2;
  private correctStreak = 0;
  private parkedCount = 0;
  private roundFinishing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.context || this.dragState || this.roundFinishing) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>(
      '.color-garage-activity__car',
    );
    if (!button || button.dataset.parked === 'true') {
      return;
    }

    const color = button.dataset.color as ColorName | undefined;
    if (!color) {
      return;
    }

    event.preventDefault();
    this.cancelCarAnimation(button);
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging');
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
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
    drag.moved ||= Math.hypot(drag.deltaX, drag.deltaY) > 12;
    drag.button.style.transform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.045)`;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const drag = this.dragState;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.releasePointer(drag);
    this.dragState = null;

    if (!drag.moved) {
      this.context?.speech.speak(drag.color);
      this.bounceCar(drag);
      return;
    }

    const carRect = drag.button.getBoundingClientRect();
    const centerX = carRect.left + carRect.width / 2;
    const centerY = carRect.top + carRect.height / 2;
    const correctGarage = this.garages.get(drag.color);

    if (
      correctGarage &&
      isInsideExpandedTarget(centerX, centerY, correctGarage)
    ) {
      this.parkCar(drag, correctGarage);
      return;
    }

    const overWrongGarage = [...this.garages.entries()].some(
      ([color, garage]) =>
        color !== drag.color &&
        isInsideExpandedTarget(centerX, centerY, garage),
    );
    if (overWrongGarage) {
      this.correctStreak = 0;
    }
    this.returnCar(drag, overWrongGarage);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    const drag = this.dragState;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    this.releasePointer(drag);
    this.dragState = null;
    this.returnCar(drag, false);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.colorCount = 2;
    this.correctStreak = 0;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const board = document.createElement('div');
    board.className = 'color-garage-activity';
    board.addEventListener('pointerdown', this.handlePointerDown, {
      signal: this.listeners.signal,
    });
    board.addEventListener('pointermove', this.handlePointerMove, {
      signal: this.listeners.signal,
    });
    board.addEventListener('pointerup', this.handlePointerUp, {
      signal: this.listeners.signal,
    });
    board.addEventListener('pointercancel', this.handlePointerCancel, {
      signal: this.listeners.signal,
    });

    context.root.replaceChildren(style, board);
    this.board = board;
    this.particles = new ParticleSystem(board);
    this.startRound();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    if (this.dragState) {
      this.releasePointer(this.dragState);
    }
    this.dragState = null;
    this.cancelAnimations();
    this.particles?.destroy();
    this.particles = null;
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.garages.clear();

    this.root?.replaceChildren();
    this.board = null;
    this.root = null;
    this.context = null;
    this.colorCount = 2;
    this.correctStreak = 0;
    this.parkedCount = 0;
    this.roundFinishing = false;
  }

  private startRound(): void {
    if (!this.board || !this.context) {
      return;
    }

    this.cancelAnimations();
    this.dragState = null;
    this.garages.clear();
    this.parkedCount = 0;
    this.roundFinishing = false;

    const activeColors = COLOR_ITEMS.slice(0, this.colorCount);
    const garageOrder = shuffle(activeColors);
    const carOrder = shuffle(activeColors);
    this.board.style.setProperty('--item-count', String(activeColors.length));

    const garageRow = document.createElement('div');
    garageRow.className =
      'color-garage-activity__row color-garage-activity__row--garages';
    for (const item of garageOrder) {
      const garage = document.createElement('div');
      garage.className = 'color-garage-activity__garage';
      garage.dataset.color = item.color;

      const image = document.createElement('img');
      image.src = item.garage;
      image.alt = '';
      image.draggable = false;
      garage.append(image);
      garageRow.append(garage);
      this.garages.set(item.color, garage);
    }

    const carRow = document.createElement('div');
    carRow.className =
      'color-garage-activity__row color-garage-activity__row--cars';
    for (const item of carOrder) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-garage-activity__car';
      button.dataset.color = item.color;
      button.setAttribute('aria-label', item.color);

      const image = document.createElement('img');
      image.src = item.car;
      image.alt = '';
      image.draggable = false;
      button.append(image);
      carRow.append(button);
    }

    this.board.replaceChildren(garageRow, carRow);
  }

  private parkCar(drag: DragState, garage: HTMLElement): void {
    if (!this.context) {
      return;
    }

    drag.button.dataset.parked = 'true';
    drag.button.classList.remove('is-dragging');
    drag.button.classList.add('is-parked');

    const originalRect = drag.button.getBoundingClientRect();
    const garageRect = garage.getBoundingClientRect();
    const currentTransform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.045)`;
    const targetX =
      garageRect.left + garageRect.width / 2 -
      (originalRect.left - drag.deltaX + originalRect.width / 2);
    const targetY =
      garageRect.top + garageRect.height * 0.62 -
      (originalRect.top - drag.deltaY + originalRect.height / 2);
    const targetTransform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.58)`;

    const animation = drag.button.animate(
      [
        { transform: currentTransform, opacity: 1 },
        { transform: targetTransform, opacity: 0.88 },
      ],
      { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
    this.trackAnimation(animation, drag.button, () => {
      drag.button.style.transform = targetTransform;
      drag.button.style.opacity = '0.88';
      animation.cancel();
    });

    this.context.sfx.play('chime');
    this.context.speech.speak(drag.color);
    this.sparkleAt(garage);
    this.correctStreak += 1;
    if (this.correctStreak >= 3 && this.colorCount < COLOR_ITEMS.length) {
      this.colorCount += 1;
      this.correctStreak = 0;
    }

    this.parkedCount += 1;
    if (this.parkedCount === this.garages.size) {
      this.finishRound();
    }
  }

  private bounceCar(drag: DragState): void {
    drag.button.classList.remove('is-dragging');
    drag.button.style.transform = '';

    const from = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0)`;
    const animation = drag.button.animate(
      [
        { transform: `${from} scale(1)` },
        {
          transform: 'translate3d(0, 0, 0) scale(1.07)',
          offset: 0.55,
        },
        { transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    );
    this.trackAnimation(animation, drag.button);
  }

  private returnCar(drag: DragState, shake: boolean): void {
    drag.button.classList.remove('is-dragging');
    drag.button.style.transform = '';

    const from = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0)`;
    const keyframes: Keyframe[] = shake
      ? [
          { transform: `${from} rotate(0deg)` },
          { transform: `${from} rotate(-4deg)`, offset: 0.2 },
          { transform: `${from} rotate(4deg)`, offset: 0.38 },
          { transform: `${from} rotate(-3deg)`, offset: 0.54 },
          { transform: `${from} rotate(2deg)`, offset: 0.68 },
          { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
        ]
      : [
          { transform: from },
          { transform: 'translate3d(0, 0, 0)' },
        ];
    const animation = drag.button.animate(keyframes, {
      duration: shake ? 620 : 360,
      easing: 'ease-out',
    });
    this.trackAnimation(animation, drag.button);
  }

  private sparkleAt(element: HTMLElement): void {
    if (!this.particles || !this.board) {
      return;
    }

    const boardRect = this.board.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const color = element.dataset.color as ColorName | undefined;
    const palette =
      color === 'red'
        ? ['#ff5252', '#ffd740']
        : color === 'blue'
          ? ['#448aff', '#ffd740']
          : color === 'yellow'
            ? ['#ffd740', '#fff176']
            : ['#69f0ae', '#ffd740'];
    this.particles.emitSparkles(
      rect.left - boardRect.left + rect.width / 2,
      rect.top - boardRect.top + rect.height / 2,
      10,
      palette[0],
    );
  }

  private finishRound(): void {
    if (!this.context || this.roundFinishing) {
      return;
    }

    this.roundFinishing = true;
    this.context.notifyTaskComplete();
    this.schedule(() => {
      if (!this.context) {
        return;
      }
      this.context.sfx.play('applause');
      this.context.speech.speak('wellDone');
    }, 1_200);
    this.schedule(() => this.startRound(), 2_200);
  }

  private releasePointer(drag: DragState): void {
    if (drag.button.hasPointerCapture(drag.pointerId)) {
      drag.button.releasePointerCapture(drag.pointerId);
    }
  }

  private trackAnimation(
    animation: Animation,
    button: HTMLButtonElement,
    onFinish?: () => void,
  ): void {
    this.animations.add(animation);
    this.carAnimations.set(button, animation);
    animation.onfinish = () => {
      this.animations.delete(animation);
      if (this.carAnimations.get(button) === animation) {
        this.carAnimations.delete(button);
      }
      onFinish?.();
    };
    animation.oncancel = () => {
      this.animations.delete(animation);
      if (this.carAnimations.get(button) === animation) {
        this.carAnimations.delete(button);
      }
    };
  }

  private cancelCarAnimation(button: HTMLButtonElement): void {
    const animation = this.carAnimations.get(button);
    if (!animation) {
      return;
    }

    animation.onfinish = null;
    animation.oncancel = null;
    animation.cancel();
    this.animations.delete(animation);
    this.carAnimations.delete(button);
  }

  private cancelAnimations(): void {
    for (const animation of this.animations) {
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
    }
    this.animations.clear();
    this.carAnimations.clear();
  }

  private schedule(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }
}

export const colorGarageActivity: Activity = new ColorGarageActivity();
