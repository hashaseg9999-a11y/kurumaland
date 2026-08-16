import bgRoad from '../assets/bg_road.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import carYellow from '../assets/car_yellow.svg';
import menuIcon from '../assets/menu_signal.svg';
import signalImage from '../assets/signal.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import { ParticleSystem } from '../core/particles';
import type { VocabKey } from '../core/vocab';

interface CarInfo {
  image: string;
  nameJa: string;
  vocab: VocabKey;
}

const CARS: readonly CarInfo[] = [
  { image: carRed, nameJa: 'しょうぼうしゃ', vocab: 'fireTruck' },
  { image: carBlue, nameJa: 'パトカー', vocab: 'policeCar' },
  { image: carYellow, nameJa: 'ダンプカー', vocab: 'dumpTruck' },
  { image: carGreen, nameJa: 'トラック', vocab: 'cargoTruck' },
];

const STYLES = `
  .signal-activity {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #dff4ff url("${bgRoad}") center / cover no-repeat;
    touch-action: none;
  }

  /* Status Banner for 2-3yo cognitive guidance */
  .signal-activity__banner {
    position: absolute;
    top: max(16px, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 24px;
    border: 4px solid #ffffff;
    border-radius: 30px;
    background: rgb(255 255 255 / 92%);
    box-shadow: 0 8px 20px rgb(21 51 74 / 16%);
    font-size: clamp(16px, 2.4vw, 24px);
    font-weight: 800;
    color: #15334a;
    pointer-events: none;
    transition: background 250ms ease, color 250ms ease, transform 200ms ease;
  }

  .signal-activity__banner.is-red {
    background: #ffebee;
    color: #c62828;
    border-color: #ef5350;
  }

  .signal-activity__banner.is-green {
    background: #e8f5e9;
    color: #2e7d32;
    border-color: #66bb6a;
  }

  .signal-activity__banner.is-railroad {
    background: #fff8e1;
    color: #f57f17;
    border-color: #fbc02d;
  }

  .signal-activity__signal,
  .signal-activity__car,
  .signal-activity__crossing {
    position: absolute;
    z-index: 2;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    touch-action: none;
  }

  /* Traffic Light */
  .signal-activity__signal {
    top: clamp(80px, 12vh, 120px);
    right: clamp(38px, 8vw, 110px);
    width: clamp(120px, 14vw, 180px);
    height: clamp(260px, 44vh, 400px);
    transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .signal-activity__signal:active {
    transform: scale(0.94);
  }

  .signal-activity__signal img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 10px 16px rgb(21 51 74 / 20%));
  }

  .signal-activity__lamp {
    position: absolute;
    left: 50%;
    width: 36%;
    aspect-ratio: 1;
    border-radius: 50%;
    opacity: 0.15;
    transform: translateX(-50%);
    transition: opacity 200ms ease, box-shadow 200ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .signal-activity__lamp--red {
    top: 10.5%;
    background: #ff3b30;
  }

  .signal-activity__lamp--yellow {
    top: 36%;
    background: #ffcc00;
  }

  .signal-activity__lamp--green {
    top: 61.5%;
    background: #30d158;
  }

  .signal-activity__signal.is-red .signal-activity__lamp--red {
    opacity: 1;
    box-shadow: 0 0 36px #ff3b30, 0 0 70px rgb(255 59 48 / 80%);
    transform: translateX(-50%) scale(1.12);
  }

  .signal-activity__signal.is-yellow .signal-activity__lamp--yellow {
    opacity: 1;
    box-shadow: 0 0 36px #ffcc00, 0 0 70px rgb(255 204 0 / 80%);
    transform: translateX(-50%) scale(1.12);
  }

  .signal-activity__signal.is-green .signal-activity__lamp--green {
    opacity: 1;
    box-shadow: 0 0 42px #30d158, 0 0 85px rgb(48 209 88 / 85%);
    transform: translateX(-50%) scale(1.18);
  }

  /* Railroad Crossing Gate (カンカンカン踏切) */
  .signal-activity__crossing {
    top: clamp(70px, 10vh, 110px);
    right: clamp(38px, 8vw, 110px);
    width: clamp(130px, 15vw, 190px);
    height: clamp(260px, 44vh, 400px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  .crossing-pole {
    position: relative;
    width: 24px;
    height: 80%;
    background: repeating-linear-gradient(45deg, #212121 0 16px, #fbc02d 16px 32px);
    border: 3px solid #ffffff;
    border-radius: 12px;
    box-shadow: 0 6px 12px rgb(0 0 0 / 25%);
  }

  .crossing-lights {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 18px;
    padding: 6px 12px;
    background: #212121;
    border: 3px solid #ffffff;
    border-radius: 20px;
  }

  .crossing-light {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #ff3b30;
    opacity: 0.2;
    transition: opacity 150ms ease, box-shadow 150ms ease;
  }

  .crossing-light.is-flashing {
    opacity: 1;
    box-shadow: 0 0 24px #ff3b30, 0 0 40px rgb(255 59 48 / 80%);
  }

  .crossing-bar {
    position: absolute;
    bottom: 30px;
    left: 12px;
    width: clamp(160px, 25vw, 280px);
    height: 18px;
    background: repeating-linear-gradient(45deg, #212121 0 20px, #fbc02d 20px 40px);
    border: 3px solid #ffffff;
    border-radius: 8px;
    transform-origin: 10px 50%;
    transform: rotate(-75deg);
    transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .crossing-bar.is-closed {
    transform: rotate(0deg);
  }

  /* Passing Train */
  .signal-activity__train {
    position: absolute;
    top: clamp(60px, 14vh, 120px);
    left: -600px;
    height: clamp(80px, 15vh, 130px);
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }

  .train-car {
    height: 100%;
    width: auto;
    filter: drop-shadow(0 8px 12px rgb(0 0 0 / 25%));
  }

  /* Main Vehicle */
  .signal-activity__car {
    bottom: clamp(40px, 7vh, 76px);
    left: clamp(34px, 7vw, 94px);
    width: clamp(210px, 29vw, 370px);
    height: clamp(130px, 23vh, 210px);
    transform-origin: 50% 85%;
    transition: transform 180ms ease;
  }

  .signal-activity__car img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 12px 14px rgb(21 51 74 / 22%));
  }

  .signal-activity__car.is-waiting {
    animation: car-idle-bounce 2s ease-in-out infinite;
  }

  .signal-activity__car.is-driving {
    pointer-events: none;
  }
`;

type SignalState = 'red' | 'yellow' | 'green';

class SignalActivity implements Activity {
  readonly id = 'signal';
  readonly menuIcon = menuIcon;

  private context: ActivityContext | null = null;
  private root: HTMLElement | null = null;
  private banner: HTMLDivElement | null = null;
  private signalButton: HTMLButtonElement | null = null;
  private carButton: HTMLButtonElement | null = null;
  private carImage: HTMLImageElement | null = null;
  private listeners: AbortController | null = null;
  private driveAnimation: Animation | null = null;
  private entranceAnimation: Animation | null = null;
  private particles: ParticleSystem | null = null;
  private isDriving = false;
  private state: SignalState = 'red';
  private carIndex = 0;

  private readonly handleSignalPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.context || this.isDriving) return;

    if (this.state === 'red') {
      this.setSignalState('yellow');
    } else if (this.state === 'yellow') {
      this.setSignalState('green');
      this.startCar();
    } else {
      this.setSignalState('red');
    }
  };

  private readonly handleCarPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    if (!this.context || !this.carButton || this.isDriving) return;

    const currentCar = CARS[this.carIndex % CARS.length]!;
    this.context.sfx.play('horn');
    this.context.speech.speak(currentCar.vocab);

    // 車両のジャンプ＆星と音符の飛び出し
    this.carButton.classList.remove('car-jumping');
    void this.carButton.offsetWidth; // reflow
    this.carButton.classList.add('car-jumping');

    const rect = this.carButton.getBoundingClientRect();
    this.particles?.emitSparkles(rect.left + rect.width * 0.7, rect.top + rect.height * 0.3, 12, '#ffd700');
    this.particles?.emitMusicNotes(rect.left + rect.width * 0.5, rect.top + rect.height * 0.2, 3);
  };

  mount(context: ActivityContext): void {
    this.unmount();
    this.context = context;
    this.root = context.root;
    this.listeners = new AbortController();
    this.carIndex = 0;
    this.state = 'red';
    this.isDriving = false;

    const style = document.createElement('style');
    style.textContent = STYLES;

    const stage = document.createElement('div');
    stage.className = 'signal-activity';

    const currentLang = context.speech.getLanguage();

    // Status Guidance Banner
    const banner = document.createElement('div');
    banner.className = 'signal-activity__banner is-red';
    banner.textContent = `🛑 ${getI18nText('signalHintStop', currentLang)}`;
    this.banner = banner;

    // Traffic Light Button
    const signalButton = document.createElement('button');
    signalButton.type = 'button';
    signalButton.className = 'signal-activity__signal is-red';
    signalButton.setAttribute('aria-label', '信号機をタップして青にしよう');

    const signal = document.createElement('img');
    signal.src = signalImage;
    signal.alt = '';
    signal.draggable = false;

    const redLamp = document.createElement('span');
    redLamp.className = 'signal-activity__lamp signal-activity__lamp--red';
    const yellowLamp = document.createElement('span');
    yellowLamp.className = 'signal-activity__lamp signal-activity__lamp--yellow';
    const greenLamp = document.createElement('span');
    greenLamp.className = 'signal-activity__lamp signal-activity__lamp--green';
    signalButton.append(signal, redLamp, yellowLamp, greenLamp);

    // Car Button
    const carButton = document.createElement('button');
    carButton.type = 'button';
    carButton.className = 'signal-activity__car is-waiting';
    carButton.setAttribute('aria-label', 'くるま');

    const car = document.createElement('img');
    car.src = CARS[0]!.image;
    car.alt = '';
    car.draggable = false;
    carButton.append(car);

    stage.append(banner, signalButton, carButton);
    context.root.replaceChildren(style, stage);

    this.particles = new ParticleSystem(stage);
    this.signalButton = signalButton;
    this.carButton = carButton;
    this.carImage = car;

    signalButton.addEventListener('pointerdown', this.handleSignalPointerDown, {
      signal: this.listeners.signal,
    });
    carButton.addEventListener('pointerdown', this.handleCarPointerDown, {
      signal: this.listeners.signal,
    });

    // 初期発話
    context.speech.speak('stop');
  }

  unmount(): void {
    this.listeners?.abort();
    this.listeners = null;

    this.driveAnimation?.cancel();
    this.entranceAnimation?.cancel();
    this.driveAnimation = null;
    this.entranceAnimation = null;

    this.particles?.destroy();
    this.particles = null;

    this.root?.replaceChildren();
    this.banner = null;
    this.signalButton = null;
    this.carButton = null;
    this.carImage = null;
    this.root = null;
    this.context = null;
    this.isDriving = false;
  }

  private setSignalState(newState: SignalState): void {
    if (!this.signalButton || !this.context) return;
    this.state = newState;
    this.signalButton.className = `signal-activity__signal is-${newState}`;

    this.context.sfx.play('tick');
    const currentLang = this.context.speech.getLanguage();

    if (newState === 'red') {
      if (this.banner) {
        this.banner.className = 'signal-activity__banner is-red';
        this.banner.textContent = `🛑 ${getI18nText('signalHintStop', currentLang)}`;
      }
      this.context.speech.speak('stop');
    } else if (newState === 'yellow') {
      if (this.banner) {
        this.banner.className = 'signal-activity__banner';
        this.banner.textContent = `⚠️ ${getI18nText('signalHintCaution', currentLang)}`;
      }
      this.context.speech.speak('caution');
    } else if (newState === 'green') {
      if (this.banner) {
        this.banner.className = 'signal-activity__banner is-green';
        this.banner.textContent = `🟢 ${getI18nText('signalHintGo', currentLang)}`;
      }
      this.context.speech.speak('go');
    }
  }

  private startCar(): void {
    if (!this.context || !this.carButton || !this.carImage || !this.root) return;
    this.isDriving = true;
    this.carButton.classList.remove('is-waiting');
    this.carButton.classList.add('is-driving', 'car-driving');

    this.context.sfx.play('engine');
    this.context.notifyTaskComplete();

    // 信号機から星が弾ける
    if (this.signalButton) {
      const sRect = this.signalButton.getBoundingClientRect();
      this.particles?.emitStars(sRect.left + sRect.width / 2, sRect.top + sRect.height * 0.7, 20);
    }

    const stageWidth = this.root.clientWidth;
    const currentCarRect = this.carButton.getBoundingClientRect();
    const driveDistance = stageWidth - currentCarRect.left + 120;

    // 走る時の煙と虹トレイル
    const smokeInterval = window.setInterval(() => {
      if (!this.carButton) return;
      const rect = this.carButton.getBoundingClientRect();
      this.particles?.emitSmokePuffs(rect.left + 20, rect.bottom - 20, 2);
      this.particles?.emitRainbowTrail(rect.left + 40, rect.bottom - 15);
    }, 90);

    const animation = this.carButton.animate(
      [
        { transform: 'translateX(0) scale(1)' },
        { transform: `translateX(${driveDistance * 0.4}px) scale(1.02)`, offset: 0.4 },
        { transform: `translateX(${driveDistance}px) scale(1.06)` },
      ],
      {
        duration: 1700,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards',
      },
    );

    this.driveAnimation = animation;
    animation.onfinish = () => {
      clearInterval(smokeInterval);
      this.driveAnimation = null;
      this.onCarExited();
    };
  }

  private onCarExited(): void {
    if (!this.context || !this.carButton || !this.carImage || !this.root) return;

    // ゴール時の大歓声＆紙吹雪＆花
    this.context.sfx.play('fanfare');
    this.context.speech.speak('great');
    this.particles?.emitCelebration(this.root.clientWidth / 2, this.root.clientHeight * 0.4);
    this.particles?.emitFlowers(this.root.clientWidth / 2, this.root.clientHeight * 0.4, 10);

    // 次の車を選択
    this.carIndex++;
    const nextCar = CARS[this.carIndex % CARS.length]!;
    this.carImage.src = nextCar.image;

    // 次の車が左から入ってくる
    const stageWidth = this.root.clientWidth;
    const targetLeft = Math.max(34, stageWidth * 0.07);

    this.carButton.classList.remove('car-driving');
    this.carButton.style.transform = `translateX(-${targetLeft + 380}px)`;

    window.setTimeout(() => {
      if (!this.carButton || !this.context) return;

      this.context.sfx.play('engine');
      const entranceAnim = this.carButton.animate(
        [
          { transform: `translateX(-${targetLeft + 380}px)` },
          { transform: 'translateX(14px)', offset: 0.85 },
          { transform: 'translateX(0)' },
        ],
        {
          duration: 1000,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        },
      );

      this.entranceAnimation = entranceAnim;
      entranceAnim.onfinish = () => {
        this.entranceAnimation = null;
        this.isDriving = false;
        this.setSignalState('red');
        this.carButton?.classList.remove('is-driving');
        this.carButton?.classList.add('is-waiting');
        this.context?.speech.speak(nextCar.vocab);
      };
    }, 700);
  }
}

export function createSignalActivity(): Activity {
  return new SignalActivity();
}
export const signalActivity: Activity = new SignalActivity();
