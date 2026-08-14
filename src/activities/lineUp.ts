import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_line-up.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { ParticleSystem } from '../core/particles';

interface TrainCar {
  id: string;
  car: string;
  label: string;
}

interface DragState {
  pointerId: number;
  button: HTMLButtonElement;
  carId: string;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  moved: boolean;
}

const TRAIN_CARS: readonly TrainCar[] = [
  { id: 'red', car: carRed, label: 'しょうぼうしゃ' },
  { id: 'blue', car: carBlue, label: 'パトカー' },
  { id: 'yellow', car: carYellow, label: 'ダンプカー' },
  { id: 'green', car: carGreen, label: 'トラック' },
];

const TRAIN_LENGTH = 4;

const STYLES = `
  .line-up-activity {
    position: absolute;
    inset: 0;
    overflow: hidden;
    padding:
      max(104px, calc(env(safe-area-inset-top) + 92px))
      max(24px, calc(env(safe-area-inset-right) + 18px))
      max(24px, calc(env(safe-area-inset-bottom) + 18px))
      max(24px, calc(env(safe-area-inset-left) + 18px));
    background:
      radial-gradient(circle at 84% 13%, rgb(255 244 169 / 80%) 0 5%, transparent 5.3%),
      linear-gradient(#cceeff 0 46%, #aee3ff 46% 52%, #8bc34a 52% 100%);
    touch-action: none;
  }

  .line-up-activity__cars {
    position: absolute;
    top: max(108px, calc(env(safe-area-inset-top) + 96px));
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    gap: clamp(16px, 4vw, 48px);
    height: clamp(120px, 20vh, 180px);
  }

  .line-up-activity__car {
    position: relative;
    z-index: 2;
    flex: 0 0 auto;
    width: clamp(110px, 17vw, 200px);
    height: clamp(84px, 13vh, 130px);
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

  .line-up-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .line-up-activity__car.is-dragging {
    z-index: 8;
    cursor: grabbing;
    filter: drop-shadow(0 12px 10px rgb(21 51 74 / 20%));
  }

  .line-up-activity__car.is-connected {
    pointer-events: none;
  }

  .line-up-activity__road {
    position: absolute;
    bottom: max(24px, calc(env(safe-area-inset-bottom) + 20px));
    left: 0;
    right: 0;
    height: clamp(120px, 18vh, 170px);
  }

  .line-up-activity__road::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 6px;
    transform: translateY(-50%);
    background: repeating-linear-gradient(90deg, #ffffff 0 28px, transparent 28px 58px);
    opacity: 0.9;
  }

  .line-up-activity__slot {
    position: absolute;
    bottom: 0;
    display: grid;
    width: clamp(110px, 17vw, 200px);
    height: clamp(84px, 13vh, 130px);
    place-items: center;
    border: 4px dashed rgb(53 85 103 / 32%);
    border-radius: 18px;
    background: rgb(255 255 255 / 30%);
  }

  .line-up-activity__slot.is-engine::after {
    content: "★";
    position: absolute;
    top: -14px;
    left: 50%;
    color: #ffb703;
    font-size: clamp(22px, 3vw, 30px);
    line-height: 1;
    transform: translateX(-50%);
  }

  .line-up-activity__slot.is-connected {
    border-style: solid;
    border-color: rgb(83 183 136 / 60%);
    background: rgb(255 255 255 / 55%);
  }

  .line-up-activity__hint {
    position: absolute;
    z-index: 4;
    top: max(60px, calc(env(safe-area-inset-top) + 48px));
    left: 50%;
    padding: 6px 22px;
    border-radius: 18px;
    background: rgb(255 255 255 / 70%);
    box-shadow: 0 6px 14px rgb(21 51 74 / 12%);
    color: #15334a;
    font-size: clamp(13px, 1.8vw, 18px);
    font-weight: 700;
    opacity: 0;
    transform: translate(-50%, -6px);
    transition: opacity 200ms ease, transform 200ms ease;
    white-space: nowrap;
  }

  .line-up-activity__hint.is-visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  @media (prefers-reduced-motion: reduce) {
    .line-up-activity * {
      animation-duration: 1ms !important;
    }
  }
`;

class LineUpActivity implements Activity {
  readonly id = 'line-up';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private board: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private dragState: DragState | null = null;
  private particles: ParticleSystem | null = null;
  private readonly animations = new Set<Animation>();
  private readonly carAnimations = new Map<HTMLButtonElement, Animation>();
  private readonly timers = new Set<number>();
  private readonly slots: HTMLElement[] = [];
  private readonly carButtons = new Map<string, HTMLButtonElement>();
  private readonly connected: string[] = [];
  private readonly occupiedSlots = new Set<number>();
  private roundFinishing = false;

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.context || this.dragState || this.roundFinishing) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('.line-up-activity__car');
    if (!button || button.dataset.connected === 'true') {
      return;
    }

    const carId = button.dataset.carId;
    if (!carId) {
      return;
    }

    event.preventDefault();
    this.cancelCarAnimation(button);
    button.setPointerCapture(event.pointerId);
    button.classList.add('is-dragging');
    this.dragState = {
      pointerId: event.pointerId,
      button,
      carId,
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
    drag.button.style.transform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.05)`;
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
      this.context?.speech.speak('car');
      this.bounceCar(drag);
      return;
    }

    const expectedSlotIndex = TRAIN_CARS.findIndex((car) => car.id === drag.carId);
    if (expectedSlotIndex === -1 || this.occupiedSlots.has(expectedSlotIndex)) {
      this.returnCar(drag, false);
      return;
    }

    const slot = this.slots[expectedSlotIndex];
    if (!slot) {
      this.returnCar(drag, false);
      return;
    }

    if (this.isInsideExpandedTarget(drag, slot)) {
      this.connectCar(drag, slot, expectedSlotIndex);
      return;
    }

    this.returnCar(drag, false);
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
    this.connected.length = 0;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const board = document.createElement('div');
    board.className = 'line-up-activity';

    const carsArea = document.createElement('div');
    carsArea.className = 'line-up-activity__cars';
    carsArea.setAttribute('aria-label', 'くるまを ならべて れっしゃにしよう');

    for (const item of TRAIN_CARS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'line-up-activity__car';
      button.dataset.carId = item.id;
      button.setAttribute('aria-label', item.label);

      const car = document.createElement('img');
      car.src = item.car;
      car.alt = '';
      car.draggable = false;
      button.append(car);
      carsArea.append(button);
      this.carButtons.set(item.id, button);
    }

    const road = document.createElement('div');
    road.className = 'line-up-activity__road';
    road.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < TRAIN_LENGTH; index += 1) {
      const slot = document.createElement('div');
      slot.className = 'line-up-activity__slot';
      if (index === 0) {
        slot.classList.add('is-engine');
      }
      road.append(slot);
      this.slots.push(slot);
    }

    const hint = document.createElement('div');
    hint.className = 'line-up-activity__hint';
    hint.setAttribute('aria-live', 'polite');
    hint.textContent = 'くるまを むかえるよ';

    board.append(carsArea, road, hint);
    context.root.replaceChildren(style, board);
    this.board = board;

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

    this.particles = new ParticleSystem(board);
    this.layoutSlots();
    this.layoutCars();
    this.showHint();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;
    if (this.dragState) {
      this.releasePointer(this.dragState);
    }
    this.dragState = null;
    for (const animation of this.animations) {
      animation.cancel();
    }
    this.animations.clear();
    this.carAnimations.clear();
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers.clear();
    this.particles?.destroy();
    this.particles = null;
    this.carButtons.clear();
    this.slots.length = 0;
    this.connected.length = 0;
    this.occupiedSlots.clear();
    this.root?.replaceChildren();
    this.root = null;
    this.board = null;
    this.context = null;
    this.roundFinishing = false;
  }

  private layoutSlots(): void {
    const road = this.board?.querySelector<HTMLElement>('.line-up-activity__road');
    if (!road) {
      return;
    }

    const width = road.clientWidth;
    const slotWidth = this.slots[0]?.clientWidth ?? 120;
    const gap = clampNumber(width * 0.02, 8, 20);
    const totalWidth = TRAIN_LENGTH * slotWidth + (TRAIN_LENGTH - 1) * gap;
    let left = Math.max(12, (width - totalWidth) / 2);

    for (const slot of this.slots) {
      slot.style.left = `${left}px`;
      left += slotWidth + gap;
    }
  }

  private layoutCars(): void {
    const area = this.board?.querySelector<HTMLElement>('.line-up-activity__cars');
    if (!area) {
      return;
    }

    const areaWidth = area.clientWidth;
    const count = TRAIN_CARS.length;
    const positions: number[] = [];

    for (let index = 0; index < count; index += 1) {
      const jittered = (index + 0.5) / count;
      positions.push(clampNumber(areaWidth * jittered + jitterNumber(12), 40, areaWidth - 40));
    }

    positions.sort(() => Math.random() - 0.5);

    this.carButtons.forEach((button, carId) => {
      const index = TRAIN_CARS.findIndex((car) => car.id === carId);
      button.style.position = 'absolute';
      button.style.left = `${positions[index]}px`;
      button.style.transform = 'translateX(-50%)';
    });
  }

  private isInsideExpandedTarget(drag: DragState, target: HTMLElement): boolean {
    const rect = target.getBoundingClientRect();
    const horizontalPadding = rect.width * 0.5;
    const verticalPadding = rect.height * 0.5;
    const buttonRect = drag.button.getBoundingClientRect();
    const centerX = buttonRect.left + buttonRect.width / 2;
    const centerY = buttonRect.top + buttonRect.height / 2;
    return (
      centerX >= rect.left - horizontalPadding &&
      centerX <= rect.right + horizontalPadding &&
      centerY >= rect.top - verticalPadding &&
      centerY <= rect.bottom + verticalPadding
    );
  }

  private connectCar(drag: DragState, slot: HTMLElement, slotIndex: number): void {
    if (!this.context || !this.board) {
      return;
    }

    drag.button.classList.remove('is-dragging');
    drag.button.classList.add('is-connected');
    drag.button.dataset.connected = 'true';
    slot.classList.add('is-connected');
    this.occupiedSlots.add(slotIndex);
    this.connected.push(drag.carId);

    const originalRect = drag.button.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const currentTransform = `translate3d(${drag.deltaX}px, ${drag.deltaY}px, 0) scale(1.05)`;
    const targetX =
      slotRect.left + slotRect.width / 2 -
      (originalRect.left - drag.deltaX + originalRect.width / 2);
    const targetY =
      slotRect.top + slotRect.height / 2 -
      (originalRect.top - drag.deltaY + originalRect.height / 2);
    const targetTransform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.92)`;

    const animation = drag.button.animate(
      [
        { transform: currentTransform },
        { transform: targetTransform },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
    this.trackAnimation(animation, drag.button, () => {
      drag.button.style.transform = targetTransform;
      animation.cancel();
    });

    this.context.sfx.play('tick');
    this.context.speech.speak(drag.carId === 'red' ? 'fireTruck' : 'car');
    this.sparkleAt(slot);

    if (this.occupiedSlots.size === TRAIN_LENGTH) {
      this.schedule(() => this.finishTrain(), 520);
    }
  }

  private finishTrain(): void {
    if (!this.context || !this.board || this.roundFinishing) {
      return;
    }

    this.roundFinishing = true;
    this.context.notifyTaskComplete();
    this.context.sfx.play('chime');
    this.context.speech.speak('wellDone');

    const connectedButtons = this.connected
      .map((carId) => this.carButtons.get(carId))
      .filter((button): button is HTMLButtonElement => Boolean(button));

    this.schedule(() => {
      if (!this.board || connectedButtons.length === 0) {
        this.startNewRound();
        return;
      }
      const travel = this.board.clientWidth + 300;
      const animations: Animation[] = [];
      for (const button of connectedButtons) {
        const base = button.style.transform;
        const animation = button.animate(
          [
            { transform: `${base} translateX(0)` },
            { transform: `${base} translateX(${travel}px)` },
          ],
          { duration: 1_600, easing: 'ease-in-out', fill: 'forwards' },
        );
        this.trackAnimation(animation, button);
        animations.push(animation);
      }
      this.context?.sfx.play('engine');
    }, 1_100);

    this.schedule(() => {
      this.context?.sfx.play('applause');
    }, 1_700);

    this.schedule(() => this.startNewRound(), 2_600);
  }

  private startNewRound(): void {
    this.roundFinishing = false;
    this.connected.length = 0;
    this.occupiedSlots.clear();

    for (const button of this.carButtons.values()) {
      button.dataset.connected = '';
      button.classList.remove('is-connected');
      button.style.transform = '';
    }
    for (const slot of this.slots) {
      slot.classList.remove('is-connected');
    }

    this.cancelAnimations();
    this.layoutCars();
    this.showHint();
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
    this.particles.emitSparkles(
      rect.left - boardRect.left + rect.width / 2,
      rect.top - boardRect.top + rect.height / 2,
      8,
      '#ffd740',
    );
  }

  private showHint(): void {
    const hint = this.board?.querySelector<HTMLElement>('.line-up-activity__hint');
    if (!hint) {
      return;
    }

    hint.classList.add('is-visible');
    this.schedule(() => hint.classList.remove('is-visible'), 2_400);
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
    const previous = this.carAnimations.get(button);
    if (previous) {
      previous.cancel();
    }
    this.carAnimations.set(button, animation);
    const remove = (): void => {
      this.animations.delete(animation);
      if (this.carAnimations.get(button) === animation) {
        this.carAnimations.delete(button);
      }
      onFinish?.();
    };
    animation.addEventListener('finish', remove, { once: true });
    animation.addEventListener('cancel', remove, { once: true });
  }

  private cancelCarAnimation(button: HTMLButtonElement): void {
    const animation = this.carAnimations.get(button);
    if (!animation) {
      return;
    }
    animation.cancel();
    this.animations.delete(animation);
    this.carAnimations.delete(button);
  }

  private cancelAnimations(): void {
    for (const animation of this.animations) {
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

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function jitterNumber(amount: number): number {
  return (Math.random() * 2 - 1) * amount;
}

export const lineUpActivity: Activity = new LineUpActivity();
