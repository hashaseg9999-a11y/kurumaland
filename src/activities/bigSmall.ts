import carBlue from '../assets/car_blue.webp';
import carBlueBig from '../assets/car_blue_big.webp';
import carGreen from '../assets/car_green.webp';
import carGreenBig from '../assets/car_green_big.webp';
import carRed from '../assets/car_red.webp';
import carRedBig from '../assets/car_red_big.webp';
import carYellow from '../assets/car_yellow.webp';
import carYellowBig from '../assets/car_yellow_big.webp';
import menuIcon from '../assets/menu_big-small.webp';
import parkingBig from '../assets/parking_big.webp';
import parkingSmall from '../assets/parking_small.webp';
import type { Activity, ActivityContext } from '../core/activity';

type SizeName = 'big' | 'small';

interface VehiclePair {
  small: string;
  big: string;
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

const VEHICLE_PAIRS: readonly VehiclePair[] = [
  { small: carRed, big: carRedBig },
  { small: carBlue, big: carBlueBig },
  { small: carYellow, big: carYellowBig },
  { small: carGreen, big: carGreenBig },
];

const STYLES = `
  .big-small-activity {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: minmax(0, 1.12fr) minmax(0, 0.88fr);
    gap: clamp(10px, 2vh, 20px);
    overflow: hidden;
    padding:
      max(104px, calc(env(safe-area-inset-top) + 92px))
      max(34px, calc(env(safe-area-inset-right) + 24px))
      max(20px, calc(env(safe-area-inset-bottom) + 16px))
      max(34px, calc(env(safe-area-inset-left) + 24px));
    background:
      radial-gradient(circle at 84% 13%, #fff4a9 0 5%, transparent 5.3%),
      linear-gradient(#dff4ff 0 52%, #a9c9a2 52% 100%);
  }

  .big-small-activity__row {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: clamp(34px, 9vw, 130px);
    min-height: 0;
  }

  .big-small-activity__parking {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
  }

  .big-small-activity__parking[data-size='big'] {
    width: clamp(240px, 34vw, 430px);
    height: clamp(150px, 25vh, 245px);
  }

  .big-small-activity__parking[data-size='small'] {
    width: clamp(104px, 16vw, 190px);
    height: clamp(80px, 12vh, 112px);
  }

  .big-small-activity__parking img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

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
  }

  .big-small-activity__car[data-size='big'] {
    width: clamp(220px, 29vw, 370px);
    height: clamp(150px, 23vh, 225px);
  }

  .big-small-activity__car[data-size='small'] {
    width: clamp(100px, 14vw, 170px);
    height: clamp(80px, 11vh, 104px);
  }

  .big-small-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .big-small-activity__car.is-dragging {
    z-index: 8;
    cursor: grabbing;
    filter: drop-shadow(0 12px 10px rgb(21 51 74 / 20%));
  }

  .big-small-activity__car.is-parked {
    pointer-events: none;
  }

  @media (max-height: 620px) and (orientation: landscape) {
    .big-small-activity {
      padding-top: 88px;
      gap: 6px;
    }

    .big-small-activity__parking[data-size='big'],
    .big-small-activity__car[data-size='big'] {
      height: 22vh;
    }
  }
`;

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

class BigSmallActivity implements Activity {
  readonly id = 'big-small';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private dragState: DragState | null = null;
  private readonly parkingSpaces = new Map<SizeName, HTMLElement>();
  private readonly animations = new Set<Animation>();
  private readonly carAnimations = new Map<HTMLButtonElement, Animation>();
  private readonly timers = new Set<number>();
  private parkedCount = 0;
  private roundFinishing = false;
  private pairIndex = -1;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.context || this.dragState || this.roundFinishing) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('.big-small-activity__car');
    if (!button || button.dataset.parked === 'true') {
      return;
    }

    const size = button.dataset.size as SizeName | undefined;
    if (!size) {
      return;
    }

    event.preventDefault();
    this.cancelCarAnimation(button);
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging');
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
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
    drag.moved ||= Math.hypot(drag.deltaX, drag.deltaY) > 12;
    drag.button.style.transform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.035)`;
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
      this.context?.speech.speak(drag.size === 'big' ? 'bigCar' : 'smallCar');
      this.bounceCar(drag);
      return;
    }

    const carRect = drag.button.getBoundingClientRect();
    const centerX = carRect.left + carRect.width / 2;
    const centerY = carRect.top + carRect.height / 2;
    const correctSpace = this.parkingSpaces.get(drag.size);

    if (
      correctSpace &&
      isInsideExpandedTarget(centerX, centerY, correctSpace)
    ) {
      this.parkCar(drag, correctSpace);
      return;
    }

    const otherSize: SizeName = drag.size === 'big' ? 'small' : 'big';
    const wrongSpace = this.parkingSpaces.get(otherSize);
    this.returnCar(
      drag,
      Boolean(
        wrongSpace && isInsideExpandedTarget(centerX, centerY, wrongSpace),
      ),
    );
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
    this.pairIndex = -1;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const board = document.createElement('div');
    board.className = 'big-small-activity';
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
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.parkingSpaces.clear();

    this.root?.replaceChildren();
    this.board = null;
    this.root = null;
    this.context = null;
    this.parkedCount = 0;
    this.roundFinishing = false;
    this.pairIndex = -1;
  }

  private startRound(): void {
    if (!this.board || !this.context) {
      return;
    }

    this.cancelAnimations();
    this.dragState = null;
    this.parkingSpaces.clear();
    this.parkedCount = 0;
    this.roundFinishing = false;
    this.selectNextPair();

    const pair = VEHICLE_PAIRS[this.pairIndex] ?? VEHICLE_PAIRS[0]!;
    const parkingRow = document.createElement('div');
    parkingRow.className =
      'big-small-activity__row big-small-activity__row--parking';
    const vehicleRow = document.createElement('div');
    vehicleRow.className =
      'big-small-activity__row big-small-activity__row--vehicles';

    const sizeOrder: SizeName[] = Math.random() < 0.5
      ? ['big', 'small']
      : ['small', 'big'];
    for (const size of sizeOrder) {
      const parking = document.createElement('div');
      parking.className = 'big-small-activity__parking';
      parking.dataset.size = size;

      const image = document.createElement('img');
      image.src = size === 'big' ? parkingBig : parkingSmall;
      image.alt = '';
      image.draggable = false;
      parking.append(image);
      parkingRow.append(parking);
      this.parkingSpaces.set(size, parking);
    }

    const vehicleOrder: SizeName[] = Math.random() < 0.5
      ? ['big', 'small']
      : ['small', 'big'];
    for (const size of vehicleOrder) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'big-small-activity__car';
      button.dataset.size = size;
      button.setAttribute('aria-label', size === 'big' ? 'おおきいくるま' : 'ちいさいくるま');

      const image = document.createElement('img');
      image.src = size === 'big' ? pair.big : pair.small;
      image.alt = '';
      image.draggable = false;
      button.append(image);
      vehicleRow.append(button);
    }

    this.board.replaceChildren(parkingRow, vehicleRow);
  }

  private parkCar(drag: DragState, parking: HTMLElement): void {
    if (!this.context) {
      return;
    }

    drag.button.dataset.parked = 'true';
    drag.button.classList.remove('is-dragging');
    drag.button.classList.add('is-parked');

    const originalRect = drag.button.getBoundingClientRect();
    const parkingRect = parking.getBoundingClientRect();
    const currentTransform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.035)`;
    const targetX =
      parkingRect.left + parkingRect.width / 2 -
      (originalRect.left - drag.deltaX + originalRect.width / 2);
    const targetY =
      parkingRect.top + parkingRect.height / 2 -
      (originalRect.top - drag.deltaY + originalRect.height / 2);
    const targetTransform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.86)`;

    const animation = drag.button.animate(
      [
        { transform: currentTransform },
        { transform: targetTransform },
      ],
      { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
    this.trackAnimation(animation, drag.button, () => {
      drag.button.style.transform = targetTransform;
      animation.cancel();
    });

    this.context.sfx.play('chime');
    this.context.speech.speak(drag.size);
    this.parkedCount += 1;
    if (this.parkedCount === this.parkingSpaces.size) {
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

  private selectNextPair(): void {
    let nextIndex = Math.floor(Math.random() * VEHICLE_PAIRS.length);
    if (VEHICLE_PAIRS.length > 1 && nextIndex === this.pairIndex) {
      nextIndex = (nextIndex + 1) % VEHICLE_PAIRS.length;
    }
    this.pairIndex = nextIndex;
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

export const bigSmallActivity: Activity = new BigSmallActivity();
