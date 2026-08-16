import bgRoad from '../assets/bg_road.webp';
import carBlue from '../assets/car_blue.svg';
import carGreen from '../assets/car_green.svg';
import carRed from '../assets/car_red.svg';
import garageBlue from '../assets/garage_blue.svg';
import type { Activity } from './activity';
import { getI18nText, type I18nKey } from './i18n';
import { saveSettings, type Settings } from './settings';
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
    this.root.replaceChildren();

    const currentLang: Lang = this.speech.getLanguage();

    // Gentle fade-in for the menu screen.
    this.root.style.opacity = '0';
    this.root.style.transition = 'opacity 220ms ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.root.style.opacity = '1';
      });
    });

    // Floating Clouds Background
    const cloud1 = document.createElement('div');
    cloud1.className = 'menu-cloud cloud-1';
    const cloud2 = document.createElement('div');
    cloud2.className = 'menu-cloud cloud-2';
    this.root.append(cloud1, cloud2);

    // Sunbeam Header Background
    const sunbeam = document.createElement('div');
    sunbeam.className = 'menu-sunbeam';
    this.root.append(sunbeam);

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
        this.showMenu();
      });
      langBar.append(langBtn);
    }
    this.root.append(langBar);

    // Header Title
    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = getI18nText('appTitle', currentLang);
    this.root.append(title);

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
    this.root.append(landscape);

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

    this.root.append(menu);
  };

  destroy(): void {
    this.unmountCurrentActivity();
    this.ending = false;
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
    this.root.replaceChildren();
    this.root.style.opacity = '';
    this.root.style.transition = '';

    const screen = document.createElement('section');
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

    scene.append(garage, ...returningCars);
    screen.append(background, scene);

    this.root.append(screen);
    this.speech.speak('wellDone');
    this.sfx.play('applause');
  };

  private openActivity(activity: Activity): void {
    this.unmountCurrentActivity();
    this.ending = false;
    this.root.replaceChildren();

    // Gentle fade-in for the activity screen.
    this.root.style.opacity = '0';
    this.root.style.transition = 'opacity 200ms ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.root.style.opacity = '1';
      });
    });

    const screen = document.createElement('div');
    screen.className = 'activity-screen';

    const homeButton = document.createElement('button');
    homeButton.type = 'button';
    homeButton.className = 'home-button';
    homeButton.setAttribute('aria-label', 'ホームにもどる');
    homeButton.textContent = '🏠';

    homeButton.addEventListener('click', () => {
      this.sfx.play('pop');
      this.showMenu();
    });

    const stage = document.createElement('div');
    stage.className = 'activity-stage';

    screen.append(stage, homeButton);
    this.root.append(screen);

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
