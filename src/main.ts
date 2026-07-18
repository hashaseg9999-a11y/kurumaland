import './styles/main.css';

import { activities } from './activities';
import { EndSessionController } from './core/endSession';
import { mountParentalSettingsGate } from './core/gate';
import { ActivityRouter } from './core/router';
import { loadSettings, saveSettings } from './core/settings';
import { createSfxService } from './core/sfx';
import { createSpeechService } from './core/speech';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('KurumaLandの描画先が見つかりません。');
}

const settings = loadSettings();
saveSettings(settings);

const sfx = createSfxService();
const speech = createSpeechService(settings);
let configuredEndTimer = settings.endTimerMinutes;
let router: ActivityRouter | null = null;

const endSession = new EndSessionController({
  onEnd: () => {
    router?.showEnding();
  },
});

const routeRoot = document.createElement('main');
routeRoot.className = 'router-root';

const orientationOverlay = document.createElement('div');
orientationOverlay.className = 'orientation-overlay';
orientationOverlay.setAttribute('role', 'status');

const orientationPicture = document.createElement('div');
orientationPicture.className = 'orientation-picture';
orientationPicture.setAttribute('aria-hidden', 'true');

const tabletShape = document.createElement('span');
tabletShape.className = 'tablet-shape';

const rotateArrow = document.createElement('span');
rotateArrow.className = 'rotate-arrow';
rotateArrow.textContent = '↻';

const orientationMessage = document.createElement('p');
orientationMessage.textContent = 'よこにしてね';

orientationPicture.append(tabletShape, rotateArrow);
orientationOverlay.append(orientationPicture, orientationMessage);
app.append(routeRoot);
mountParentalSettingsGate({
  root: app,
  settings,
  speech,
  onSettingsChange: (nextSettings) => {
    if (nextSettings.endTimerMinutes === configuredEndTimer) {
      return;
    }

    configuredEndTimer = nextSettings.endTimerMinutes;
    endSession.configure(configuredEndTimer);
  },
  isEnding: () => router?.isShowingEnding ?? false,
  onResume: () => {
    endSession.configure(settings.endTimerMinutes);
    router?.showMenu();
  },
});
app.append(orientationOverlay);

router = new ActivityRouter({
  root: routeRoot,
  activities,
  speech,
  sfx,
  getSettings: () => ({ ...settings }),
  onTaskComplete: () => {
    endSession.notifyTaskComplete();
  },
});

const unlockAudio = (): void => {
  sfx.unlock();
  speech.unlock();
};

const preventGesture = (event: Event): void => {
  event.preventDefault();
};

document.addEventListener('pointerdown', unlockAudio, {
  capture: true,
  once: true,
});
document.addEventListener('gesturestart', preventGesture, { passive: false });
document.addEventListener('gesturechange', preventGesture, { passive: false });

router.start();
endSession.configure(configuredEndTimer);
