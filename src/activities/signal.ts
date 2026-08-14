import bgRoad from '../assets/bg_road.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_signal.svg';
import signalImage from '../assets/signal.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { ParticleSystem } from '../core/particles';

const CAR_IMAGES = [carRed, carBlue, carYellow, carGreen] as const;

const STYLES = `
  .signal-activity {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #dff4ff url("${bgRoad}") center / cover no-repeat;
  }

  .signal-activity__signal,
  .signal-activity__car {
    position: absolute;
    z-index: 2;
    min-width: 80px;
    min-height: 80px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    touch-action: none;
  }

  .signal-activity__signal {
    top: clamp(86px, 12vh, 126px);
    right: clamp(38px, 7vw, 92px);
    width: clamp(112px, 13vw, 168px);
    height: clamp(250px, 42vh, 390px);
  }

  .signal-activity__signal img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .signal-activity__lamp {
    position: absolute;
    left: 50%;
    width: 36%;
    aspect-ratio: 1;
    border-radius: 50%;
    opacity: 0;
    transform: translateX(-50%);
    transition: opacity 240ms ease, box-shadow 240ms ease;
  }

  .signal-activity__lamp--red {
    top: 10.5%;
    background: #f45b56;
    box-shadow: 0 0 20px rgb(244 91 86 / 70%);
  }

  .signal-activity__lamp--green {
    top: 61.5%;
    background: #49c978;
    box-shadow: 0 0 20px rgb(73 201 120 / 70%);
  }

  .signal-activity__signal:not(.is-green) .signal-activity__lamp--red,
  .signal-activity__signal.is-green .signal-activity__lamp--green {
    opacity: 0.94;
  }

  .signal-activity__car {
    bottom: clamp(44px, 8vh, 82px);
    left: clamp(34px, 7vw, 94px);
    width: clamp(190px, 26vw, 340px);
    height: clamp(116px, 21vh, 190px);
    transform-origin: 50% 82%;
  }

  .signal-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .signal-activity__car.is-driving {
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .signal-activity__lamp {
      transition: none;
    }
  }
`;

class SignalActivity implements Activity {
  readonly id = 'signal';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private signalButton: HTMLButtonElement | null = null;
  private carButton: HTMLButtonElement | null = null;
  private carImage: HTMLImageElement | null = null;
  private listeners: AbortController | null = null;
  private driveAnimation: Animation | null = null;
  private feedbackAnimation: Animation | null = null;
  private entranceAnimation: Animation | null = null;
  private particles: ParticleSystem | null = null;
  private isDriving = false;
  private carsCompleted = 0;
  private carIndex = -1;

  private readonly handleSignalPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.context || this.isDriving) {
      return;
    }

    this.startCar();
  };

  private readonly handleCarPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.context || !this.carButton || this.isDriving) {
      return;
    }

    this.context.sfx.play('horn');
    this.context.speech.speak('car');
    this.feedbackAnimation?.cancel();
    const animation = this.carButton.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-8px) scale(1.035)' },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 320, easing: 'ease-out' },
    );
    this.feedbackAnimation = animation;
    animation.onfinish = () => {
      if (this.feedbackAnimation === animation) {
        this.feedbackAnimation = null;
      }
    };
    animation.oncancel = () => {
      if (this.feedbackAnimation === animation) {
        this.feedbackAnimation = null;
      }
    };
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.carsCompleted = 0;
    this.carIndex = -1;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const stage = document.createElement('div');
    stage.className = 'signal-activity';

    const signalButton = document.createElement('button');
    signalButton.type = 'button';
    signalButton.className = 'signal-activity__signal';
    signalButton.setAttribute('aria-label', 'しんごう');

    const signal = document.createElement('img');
    signal.src = signalImage;
    signal.alt = '';
    signal.draggable = false;

    const redLamp = document.createElement('span');
    redLamp.className = 'signal-activity__lamp signal-activity__lamp--red';
    const greenLamp = document.createElement('span');
    greenLamp.className = 'signal-activity__lamp signal-activity__lamp--green';
    signalButton.append(signal, redLamp, greenLamp);

    const carButton = document.createElement('button');
    carButton.type = 'button';
    carButton.className = 'signal-activity__car';
    carButton.setAttribute('aria-label', 'くるま');

    const car = document.createElement('img');
    car.alt = '';
    car.draggable = false;
    carButton.append(car);

    stage.append(signalButton, carButton);
    context.root.replaceChildren(style, stage);

    this.particles = new ParticleSystem(stage);
    this.particles.emitSparkles(
      stage.clientWidth / 2,
      stage.clientHeight / 2,
      6,
      '#ffd700',
    );

    signalButton.addEventListener('pointerdown', this.handleSignalPointerDown, {
      signal: this.listeners.signal,
    });
    carButton.addEventListener('pointerdown', this.handleCarPointerDown, {
      signal: this.listeners.signal,
    });

    this.signalButton = signalButton;
    this.carButton = carButton;
    this.carImage = car;
    this.selectNextCar();
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;

    this.driveAnimation?.cancel();
    this.feedbackAnimation?.cancel();
    this.entranceAnimation?.cancel();
    this.driveAnimation = null;
    this.feedbackAnimation = null;
    this.entranceAnimation = null;

    this.particles?.destroy();
    this.particles = null;

    this.root?.replaceChildren();
    this.signalButton = null;
    this.carButton = null;
    this.carImage = null;
    this.root = null;
    this.context = null;
    this.isDriving = false;
    this.carsCompleted = 0;
    this.carIndex = -1;
  }

  private startCar(): void {
    if (!this.context || !this.root || !this.signalButton || !this.carButton) {
      return;
    }

    this.isDriving = true;
    this.signalButton.classList.add('is-green');
    this.signalButton.setAttribute('aria-label', 'あおしんごう');
    this.carButton.classList.add('is-driving');
    this.context.sfx.play('engine');
    this.context.speech.speak('green');

    this.feedbackAnimation?.cancel();
    this.feedbackAnimation = null;
    this.entranceAnimation?.cancel();
    this.entranceAnimation = null;
    const stageRect = this.root.getBoundingClientRect();
    const carRect = this.carButton.getBoundingClientRect();
    const travelDistance = stageRect.right - carRect.left + carRect.width + 40;

    const animation = this.carButton.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${travelDistance}px)` },
      ],
      { duration: 4_400, easing: 'linear', fill: 'forwards' },
    );
    this.driveAnimation = animation;
    animation.onfinish = () => {
      if (this.driveAnimation !== animation || !this.context) {
        return;
      }

      this.driveAnimation = null;
      animation.cancel();
      this.finishCar();
    };
    animation.oncancel = () => {
      if (this.driveAnimation === animation) {
        this.driveAnimation = null;
      }
    };
  }

  private finishCar(): void {
    if (!this.context || !this.signalButton || !this.carButton) {
      return;
    }

    this.context.notifyTaskComplete();
    this.carsCompleted += 1;
    if (this.carsCompleted % 3 === 0) {
      this.context.sfx.play('chime');
      this.context.speech.speak('wellDone');
    }

    this.sparkleAtCar();

    this.isDriving = false;
    this.signalButton.classList.remove('is-green');
    this.signalButton.setAttribute('aria-label', 'あかしんごう');
    this.carButton.classList.remove('is-driving');
    this.selectNextCar();

    const animation = this.carButton.animate(
      [
        { transform: 'translateX(-120%)', opacity: 0.2 },
        { transform: 'translateX(0)', opacity: 1 },
      ],
      { duration: 560, easing: 'ease-out' },
    );
    this.entranceAnimation = animation;
    animation.onfinish = () => {
      if (this.entranceAnimation === animation) {
        this.entranceAnimation = null;
      }
    };
    animation.oncancel = () => {
      if (this.entranceAnimation === animation) {
        this.entranceAnimation = null;
      }
    };
  }

  private sparkleAtCar(): void {
    if (!this.particles || !this.carButton || !this.root) {
      return;
    }

    const rootRect = this.root.getBoundingClientRect();
    const carRect = this.carButton.getBoundingClientRect();
    this.particles.emitSparkles(
      carRect.left - rootRect.left + carRect.width / 2,
      carRect.top - rootRect.top + carRect.height / 2,
      12,
    );
  }

  private selectNextCar(): void {
    if (!this.carImage) {
      return;
    }

    let nextIndex = Math.floor(Math.random() * CAR_IMAGES.length);
    if (CAR_IMAGES.length > 1 && nextIndex === this.carIndex) {
      nextIndex = (nextIndex + 1) % CAR_IMAGES.length;
    }

    this.carIndex = nextIndex;
    this.carImage.src = CAR_IMAGES[nextIndex]!;
  }
}

export const signalActivity: Activity = new SignalActivity();
