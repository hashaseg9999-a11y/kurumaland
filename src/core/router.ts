import bgRoad from '../assets/bg_road.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import garageBlue from '../assets/garage_blue.svg';
import type { Activity } from './activity';
import { getI18nText, type I18nKey } from './i18n';
import { saveSettings, type Settings } from './settings';
import { attachParallax, createSceneStage, playSceneTransition } from './scene3d';
import type { SfxService } from './sfx';
import type { Lang, SpeechService } from './speech';

const ACTIVITY_I18N_KEYS: Readonly<Record<string, I18nKey>> = {
  signal: 'activitySignal',
  'color-garage': 'activityColorGarage',
  'big-small': 'activityBigSmall',
  trace: 'activityTrace',
  'car-wash': 'activityCarWash',
  puzzle: 'activityPuzzle',
  'lights-sound': 'activityLightsSound',
  'line-up': 'activityLineUp',
};

interface ActivityRouterOptions {
  root: HTMLElement;
  activities: readonly Activity[];
  speech: SpeechService;
  sfx: SfxService;
  getSettings: () => Settings;
  onSettingsChange?: (settings: Readonly<Settings>) => void;
  onTaskComplete(): void;
}

export class ActivityRouter {
  private readonly root: HTMLElement;
  private readonly activities: readonly Activity[];
  private readonly speech: SpeechService;
  private readonly sfx: SfxService;
  private readonly getSettings: () => Settings;
  private readonly onTaskComplete: () => void;
  private readonly onSettingsChange?: (settings: Readonly<Settings>) => void;
  private currentActivity: Activity | null = null;
  private menuEffectsCleanup: (() => void) | null = null;
  private activityEffectsCleanup: (() => void) | null = null;
  private ending = false;

  constructor(options: ActivityRouterOptions) {
    this.root = options.root;
    this.activities = options.activities;
    this.speech = options.speech;
    this.sfx = options.sfx;
    this.getSettings = options.getSettings;
    this.onSettingsChange = options.onSettingsChange;
    this.onTaskComplete = options.onTaskComplete;
  }

  get isShowingEnding(): boolean {
    return this.ending;
  }

  start(): void {
    this.showMenu();
  }

  showMenu = (): void => {
    this.unmountCurrentActivity();
    this.ending = false;
    this.clearScreenEffects();
    this.root.replaceChildren();
    this.root.style.opacity = '';
    this.root.style.transition = '';

    const scene = createSceneStage('menu-scene');
    const stage = scene.stage;
    this.root.append(scene.root);
    this.menuEffectsCleanup = attachParallax(scene.root, {
      maxTilt: 1,
      strength: 10,
    });

    const currentLang: Lang = this.speech.getLanguage();
    playSceneTransition(stage, 'enter');

    // Language Quick Switcher Bar
    const langBar = document.createElement('div');
    langBar.className = 'menu-lang-bar';
    const langOptions: Array<{ code: Lang; label: string }> = [
      { code: 'ja', label: '🇯🇵 JP' },
      { code: 'th', label: '🇹🇭 TH' },
      { code: 'en', label: '🇺🇸 EN' },
    ];

    for (const opt of langOptions) {
      const langBtn = document.createElement('button');
      langBtn.type = 'button';
      langBtn.className = `menu-lang-btn ${currentLang === opt.code ? 'is-active' : ''}`;
      langBtn.textContent = opt.label;
      langBtn.setAttribute('aria-label', opt.label);
      langBtn.addEventListener('click', () => {
        this.sfx.play('pop');
        const nextSettings = { ...this.getSettings(), langMode: opt.code };
        saveSettings(nextSettings);
        this.onSettingsChange?.(nextSettings);
        document.dispatchEvent(new CustomEvent('settingschanged'));
        this.showMenu();
      });
      langBar.append(langBtn);
    }
    stage.append(langBar);

    // Header Title
    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = getI18nText('appTitle', currentLang);
    stage.append(title);

    // Landscape & Animated Drive Track at Bottom
    const landscape = document.createElement('div');
    landscape.className = 'menu-landscape';

    const hills = document.createElement('div');
    hills.className = 'menu-hills';

    const road = document.createElement('div');
    road.className = 'menu-road';

    const drivingCar1 = document.createElement('img');
    drivingCar1.className = 'menu-driving-car car-fire';
    drivingCar1.src = carRed;
    drivingCar1.alt = '';

    const drivingCar2 = document.createElement('img');
    drivingCar2.className = 'menu-driving-car car-police';
    drivingCar2.src = carBlue;
    drivingCar2.alt = '';

    road.append(drivingCar1, drivingCar2);
    landscape.append(hills, road);
    stage.append(landscape);

    // Main 3D Card Grid
    const menu = document.createElement('nav');
    menu.className = 'menu-grid';
    menu.setAttribute('aria-label', getI18nText('chooseActivity', currentLang));

    for (const activity of this.activities) {
      const i18nKey = ACTIVITY_I18N_KEYS[activity.id] ?? 'appTitle';
      const label = getI18nText(i18nKey, currentLang);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `menu-button menu-button--${activity.id}`;
      button.setAttribute('aria-label', label);

      const iconWrap = document.createElement('div');
      iconWrap.className = 'menu-button__icon-wrap';

      const image = document.createElement('img');
      image.src = activity.menuIcon;
      image.alt = '';
      image.draggable = false;
      iconWrap.append(image);

      const badge = document.createElement('span');
      badge.className = 'menu-button__badge';
      badge.textContent = label;

      button.append(iconWrap, badge);

      button.addEventListener('click', () => {
        this.sfx.play('pop');
        this.openActivity(activity);
      });

      menu.append(button);
    }

    stage.append(menu);
  };

  destroy(): void {
    this.unmountCurrentActivity();
    this.ending = false;
    this.clearScreenEffects();
    this.root.replaceChildren();
    this.root.style.opacity = '';
    this.root.style.transition = '';
  }

  showEnding = (): void => {
    if (this.ending) {
      return;
    }

    this.unmountCurrentActivity();
    this.ending = true;
    this.clearScreenEffects();
    this.root.replaceChildren();
    this.root.style.opacity = '';
    this.root.style.transition = '';

    const screen = document.createElement('section');
    const currentLang: Lang = this.speech.getLanguage();
    screen.className = 'ending-screen';
    screen.setAttribute('aria-label', 'おしまい。車たちはおやすみしています');

    const background = document.createElement('img');
    background.className = 'ending-background';
    background.src = bgRoad;
    background.alt = '';
    background.draggable = false;

    const scene = document.createElement('div');
    scene.className = 'ending-scene';
    scene.setAttribute('aria-hidden', 'true');

    const garage = document.createElement('img');
    garage.className = 'ending-garage';
    garage.src = garageBlue;
    garage.alt = '';
    garage.draggable = false;

    const returningCars = [carRed, carGreen, carBlue].map((source, index) => {
      const car = document.createElement('img');
      car.className = `ending-returning-car ending-returning-car-${index + 1}`;
      car.src = source;
      car.alt = '';
      car.draggable = false;
      return car;
    });

    const restingCar = document.createElement('div');
    restingCar.className = 'ending-resting';
    restingCar.setAttribute('aria-hidden', 'true');

    const restingImage = document.createElement('img');
    restingImage.src = garageBlue;
    restingImage.alt = '';
    restingImage.draggable = false;

    const sleepingFace = document.createElement('span');
    sleepingFace.textContent = '😴';
    restingCar.append(restingImage, sleepingFace);
    scene.append(garage, ...returningCars, restingCar);
    screen.append(background, scene);

    const endingTitle = document.createElement('h1');
    endingTitle.setAttribute('aria-live', 'polite');
    endingTitle.textContent = getI18nText('endingMessage', currentLang);
    screen.append(endingTitle);

    const playAgainButton = document.createElement('button');
    playAgainButton.type = 'button';
    playAgainButton.className = 'ending-play-again';
    playAgainButton.textContent = getI18nText('playAgain', currentLang);
    playAgainButton.addEventListener('click', () => {
      this.sfx.play('pop');
      this.showMenu();
    });
    screen.append(playAgainButton);

    this.root.append(screen);
    playSceneTransition(screen, 'enter');
    this.speech.speak('wellDone');
    this.sfx.play('applause');
  };

  private openActivity(activity: Activity): void {
    const currentLang: Lang = this.speech.getLanguage();
    this.unmountCurrentActivity();
    this.ending = false;
    this.clearScreenEffects();
    this.root.replaceChildren();

    const scene = createSceneStage('activity-scene');
    const screen = scene.root;
    const stage = scene.stage;
    this.root.append(screen);
    this.activityEffectsCleanup = attachParallax(screen, {
      maxTilt: 0.65,
      strength: 7,
    });
    playSceneTransition(stage, 'enter');

    const homeButton = document.createElement('button');
    homeButton.type = 'button';
    homeButton.className = 'home-button';
    homeButton.setAttribute('aria-label', 'ホームにもどる');
    homeButton.textContent = '🏠';

    homeButton.addEventListener('click', () => {
      this.sfx.play('pop');
      this.showMenu();
    });

    screen.append(homeButton);

    stage.classList.add('activity-stage');

    try {
      activity.mount({
        root: stage,
        speech: this.speech,
        sfx: this.sfx,
        settings: this.getSettings(),
        exitToMenu: () => {
          this.showMenu();
        },
        notifyTaskComplete: () => {
          this.onTaskComplete();
        },
      });
      this.currentActivity = activity;
    } catch (error) {
      console.error('[KurumaLand] Activity mount failed:', error);
      const fallbackMessage = document.createElement('p');
      fallbackMessage.className = 'activity-fallback';
      fallbackMessage.setAttribute('role', 'alert');
      fallbackMessage.textContent = getI18nText('backToMenu', currentLang);
      stage.append(fallbackMessage);
      window.setTimeout(() => this.showMenu(), 2_000);
    }
  }

  private clearScreenEffects(): void {
    this.menuEffectsCleanup?.();
    this.menuEffectsCleanup = null;
    this.activityEffectsCleanup?.();
    this.activityEffectsCleanup = null;
  }

  private unmountCurrentActivity(): void {
    if (this.currentActivity) {
      try {
        this.currentActivity.unmount();
      } catch {
        // Safe cleanup ignore
      }
      this.currentActivity = null;
    }
  }
}
