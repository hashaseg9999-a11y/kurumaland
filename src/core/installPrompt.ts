import { getI18nText } from './i18n';
import type { Lang } from './speech';

const DISMISS_KEY = 'shunichiland:install-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function mountInstallPrompt(root: HTMLElement, lang: Lang): void {
  if (isStandalone() || wasDismissed()) {
    return;
  }

  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', getI18nText('installBannerLabel', lang));

  const icon = document.createElement('span');
  icon.className = 'install-banner-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📲';

  const message = document.createElement('p');
  message.className = 'install-banner-message';

  const updateMessage = (): void => {
    message.textContent = isIOS()
      ? getI18nText('installBannerIos', lang)
      : getI18nText('installBannerGeneric', lang);
  };

  updateMessage();

  const installButton = document.createElement('button');
  installButton.type = 'button';
  installButton.className = 'install-banner-install';
  installButton.textContent = getI18nText('installBannerInstall', lang);
  installButton.addEventListener('click', () => {
    if (deferredPrompt) {
      void deferredPrompt.prompt();
      void deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          banner.remove();
        }
        deferredPrompt = null;
      });
    }
    // iOS: no programmatic install; instructions in message are enough.
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'install-banner-close';
  closeButton.setAttribute('aria-label', getI18nText('installBannerClose', lang));
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // localStorage unavailable; just hide for this session.
    }
    banner.remove();
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    installButton.hidden = false;
  });

  installButton.hidden = true;
  banner.append(icon, message, installButton, closeButton);
  root.append(banner);
}
