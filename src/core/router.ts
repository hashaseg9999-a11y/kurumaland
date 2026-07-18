import bgRoad from '../assets/bg_road.webp';
import carBlue from '../assets/car_blue.webp';
import carGreen from '../assets/car_green.webp';
import carRed from '../assets/car_red.webp';
import garageBlue from '../assets/garage_blue.webp';
import type { Activity } from './activity';
import type { Settings } from './settings';
import type { SfxService } from './sfx';
import type { SpeechService } from './speech';

const ACTIVITY_LABELS: Readonly<Record<string, string>> = {
  signal: 'しんごうでGO',
  'color-garage': 'いろのしゃこ',
  'big-small': 'おおきい・ちいさい',
  trace: 'みちをなぞろう',
  'car-wash': 'くるまあらい',
  puzzle: 'くるまパズル',
};

interface ActivityRouterOptions {
  root: HTMLElement;
  activities: readonly Activity[];
  speech: SpeechService;
  sfx: SfxService;
  getSettings: () => Settings;
  onTaskComplete(): void;
}

export class ActivityRouter {
  private readonly root: HTMLElement;
  private readonly activities: readonly Activity[];
  private readonly speech: SpeechService;
  private readonly sfx: SfxService;
  private readonly getSettings: () => Settings;
  private readonly onTaskComplete: () => void;
  private currentActivity: Activity | null = null;
  private ending = false;

  constructor(options: ActivityRouterOptions) {
    this.root = options.root;
    this.activities = options.activities;
    this.speech = options.speech;
    this.sfx = options.sfx;
    this.getSettings = options.getSettings;
    this.onTaskComplete = options.onTaskComplete;
  }

  start(): void {
    this.showMenu();
  }

  showMenu = (): void => {
    this.unmountCurrentActivity();
    this.ending = false;
    this.root.replaceChildren();

    const menu = document.createElement('nav');
    menu.className = 'menu-grid';
    menu.setAttribute('aria-label', 'あそびをえらぶ');

    for (const activity of this.activities) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'menu-button';
      button.setAttribute('aria-label', ACTIVITY_LABELS[activity.id] ?? activity.id);

      const image = document.createElement('img');
      image.src = activity.menuIcon;
      image.alt = '';
      image.draggable = false;
      button.append(image);

      button.addEventListener('click', () => {
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
  }

  showEnding = (): void => {
    if (this.ending) {
      return;
    }

    this.unmountCurrentActivity();
    this.ending = true;
    this.root.replaceChildren();

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

    const resting = document.createElement('div');
    resting.className = 'ending-resting';

    const sleepingCar = document.createElement('img');
    sleepingCar.src = carBlue;
    sleepingCar.alt = '';
    sleepingCar.draggable = false;

    const sleepMark = document.createElement('span');
    sleepMark.textContent = 'Z z';
    resting.append(sleepingCar, sleepMark);

    scene.append(background, ...returningCars, garage, resting);

    const message = document.createElement('h1');
    message.textContent = 'おしまい';

    screen.append(scene, message);
    this.root.append(screen);
  };

  get isShowingEnding(): boolean {
    return this.ending;
  }

  private openActivity(activity: Activity): void {
    this.unmountCurrentActivity();
    this.ending = false;
    this.root.replaceChildren();

    const screen = document.createElement('section');
    screen.className = 'activity-screen';

    const stage = document.createElement('div');
    stage.className = 'activity-stage';

    const homeButton = document.createElement('button');
    homeButton.type = 'button';
    homeButton.className = 'home-button';
    homeButton.setAttribute('aria-label', 'おうちに戻る');
    homeButton.textContent = '🏠';
    homeButton.addEventListener('click', this.showMenu);

    screen.append(stage, homeButton);
    this.root.append(screen);
    this.currentActivity = activity;

    activity.mount({
      root: stage,
      speech: this.speech,
      sfx: this.sfx,
      settings: this.getSettings(),
      exitToMenu: this.showMenu,
      notifyTaskComplete: this.onTaskComplete,
    });
  }

  private unmountCurrentActivity(): void {
    this.currentActivity?.unmount();
    this.currentActivity = null;
  }
}
