import { isLangMode, LANG_MODES, saveSettings, type Settings } from './settings';
import type { SpeechService } from './speech';

const DEFAULT_HOLD_DURATION_MS = 3_000;
const MOVE_TOLERANCE_PX = 16;
const LANGUAGE_LABELS: Readonly<Record<Settings['langMode'], string>> = {
  ja: '日本語 (ja)',
  en: '英語 (en)',
  th: 'タイ語 (th)',
  rotate: '順番 (ja → en → th)',
};
const END_TIMER_CHOICES = [
  { value: 'none', minutes: null, label: 'なし' },
  { value: '10', minutes: 10, label: '10分' },
  { value: '20', minutes: 20, label: '20分' },
  { value: '30', minutes: 30, label: '30分' },
] as const;

export interface ParentalGateOptions {
  holdDurationMs?: number;
}

export interface ParentalSettingsGateOptions extends ParentalGateOptions {
  root: HTMLElement;
  settings: Settings;
  speech: SpeechService;
  onSettingsChange?(settings: Readonly<Settings>): void;
  isEnding?(): boolean;
  onResume?(): void;
}

export function installParentalGate(
  trigger: HTMLElement,
  onOpen: () => void,
  options: ParentalGateOptions = {},
): () => void {
  const holdDurationMs = options.holdDurationMs ?? DEFAULT_HOLD_DURATION_MS;
  let timerId: number | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  const releasePointer = (pointerId: number): void => {
    try {
      if (trigger.hasPointerCapture(pointerId)) {
        trigger.releasePointerCapture(pointerId);
      }
    } catch {
      // 合成イベント等でPointer Captureが使えない場合も安全に終了する。
    }
  };

  const cancelHold = (releaseCapture = true): void => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }

    if (releaseCapture && activePointerId !== null) {
      releasePointer(activePointerId);
    }

    activePointerId = null;
    trigger.classList.remove('is-holding');
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0 || activePointerId !== null) {
      return;
    }

    event.preventDefault();
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    trigger.classList.add('is-holding');

    try {
      trigger.setPointerCapture(event.pointerId);
    } catch {
      // Pointer Capture非対応環境でもタイマー自体は動作させる。
    }

    timerId = window.setTimeout(() => {
      const completedPointerId = activePointerId;
      timerId = null;
      activePointerId = null;
      trigger.classList.remove('is-holding');

      if (completedPointerId !== null) {
        releasePointer(completedPointerId);
      }

      onOpen();
    }, holdDurationMs);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance > MOVE_TOLERANCE_PX) {
      cancelHold();
    }
  };

  const handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) {
      cancelHold();
    }
  };

  const handleLostPointerCapture = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) {
      cancelHold(false);
    }
  };

  const preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  trigger.addEventListener('pointerdown', handlePointerDown);
  trigger.addEventListener('pointermove', handlePointerMove);
  trigger.addEventListener('pointerup', handlePointerEnd);
  trigger.addEventListener('pointercancel', handlePointerEnd);
  trigger.addEventListener('lostpointercapture', handleLostPointerCapture);
  trigger.addEventListener('contextmenu', preventContextMenu);

  return () => {
    cancelHold();
    trigger.removeEventListener('pointerdown', handlePointerDown);
    trigger.removeEventListener('pointermove', handlePointerMove);
    trigger.removeEventListener('pointerup', handlePointerEnd);
    trigger.removeEventListener('pointercancel', handlePointerEnd);
    trigger.removeEventListener('lostpointercapture', handleLostPointerCapture);
    trigger.removeEventListener('contextmenu', preventContextMenu);
  };
}

export function mountParentalSettingsGate(
  options: ParentalSettingsGateOptions,
): () => void {
  const {
    root,
    settings,
    speech,
    holdDurationMs,
    onSettingsChange,
    isEnding,
    onResume,
  } = options;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'settings-gate';
  trigger.setAttribute('aria-label', '保護者向け設定を開く（3秒長押し）');
  trigger.textContent = '⚙';

  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.hidden = true;

  const panel = document.createElement('section');
  panel.className = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'settings-title');

  const title = document.createElement('h2');
  title.id = 'settings-title';
  title.textContent = '保護者向け設定';

  const summary = document.createElement('p');
  summary.className = 'settings-summary';
  summary.setAttribute('aria-live', 'polite');

  const languageField = document.createElement('p');
  languageField.className = 'settings-field';

  const languageLabel = document.createElement('label');
  languageLabel.htmlFor = 'settings-language-mode';
  languageLabel.textContent = '発話する言語';

  const languageSelect = document.createElement('select');
  languageSelect.id = 'settings-language-mode';
  languageSelect.className = 'settings-select settings-language-mode';
  for (const mode of LANG_MODES) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = LANGUAGE_LABELS[mode];
    languageSelect.append(option);
  }
  languageSelect.value = settings.langMode;

  languageField.append(languageLabel, document.createElement('br'), languageSelect);

  const timerField = document.createElement('p');
  timerField.className = 'settings-field';

  const timerLabel = document.createElement('label');
  timerLabel.htmlFor = 'settings-end-timer';
  timerLabel.textContent = 'おしまいタイマー';

  const timerSelect = document.createElement('select');
  timerSelect.id = 'settings-end-timer';
  timerSelect.className = 'settings-select settings-end-timer';
  for (const choice of END_TIMER_CHOICES) {
    const option = document.createElement('option');
    option.value = choice.value;
    option.textContent = choice.label;
    timerSelect.append(option);
  }

  timerField.append(timerLabel, document.createElement('br'), timerSelect);

  const testSpeechButton = document.createElement('button');
  testSpeechButton.type = 'button';
  testSpeechButton.className = 'settings-close settings-test-speech';
  testSpeechButton.textContent = 'テスト発話';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'settings-close';
  closeButton.textContent = '閉じる';

  const resumeButton = document.createElement('button');
  resumeButton.type = 'button';
  resumeButton.className = 'settings-close settings-resume';
  resumeButton.textContent = '遊びを再開';
  resumeButton.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'settings-actions';
  actions.append(testSpeechButton, resumeButton, closeButton);

  const previousInert = new Map<HTMLElement, boolean>();

  const updateSummary = (): void => {
    const timerLabel =
      settings.endTimerMinutes === null ? 'なし' : String(settings.endTimerMinutes) + '分';
    summary.textContent =
      '言語：' + LANGUAGE_LABELS[settings.langMode] + '　おしまいタイマー：' + timerLabel;
  };

  const setBackgroundInert = (isInert: boolean): void => {
    if (isInert) {
      previousInert.clear();
      for (const child of Array.from(root.children)) {
        if (child === overlay) {
          continue;
        }

        const element = child as HTMLElement;
        previousInert.set(element, element.inert);
        element.inert = true;
      }
      return;
    }

    for (const [element, wasInert] of previousInert) {
      element.inert = wasInert;
    }
    previousInert.clear();
  };

  const handleClose = (): void => {
    if (overlay.hidden) {
      return;
    }

    overlay.hidden = true;
    setBackgroundInert(false);
    trigger.focus({ preventScroll: true });
  };

  const handleOpen = (): void => {
    languageSelect.value = settings.langMode;
    timerSelect.value =
      settings.endTimerMinutes === null ? 'none' : String(settings.endTimerMinutes);
    updateSummary();
    resumeButton.hidden = !(isEnding?.() ?? false);
    setBackgroundInert(true);
    overlay.hidden = false;
    languageSelect.focus({ preventScroll: true });
  };

  const handleLanguageChange = (): void => {
    if (!isLangMode(languageSelect.value)) {
      languageSelect.value = settings.langMode;
      return;
    }

    settings.langMode = languageSelect.value;
    saveSettings(settings);
    onSettingsChange?.({ ...settings });
    updateSummary();
  };

  const handleTimerChange = (): void => {
    const choice = END_TIMER_CHOICES.find((item) => item.value === timerSelect.value);
    if (!choice) {
      timerSelect.value =
        settings.endTimerMinutes === null ? 'none' : String(settings.endTimerMinutes);
      return;
    }

    settings.endTimerMinutes = choice.minutes;
    saveSettings(settings);
    onSettingsChange?.({ ...settings });
    updateSummary();
  };

  const handleTestSpeech = (): void => {
    speech.speak('wellDone');
  };

  const handleResume = (): void => {
    onResume?.();
    handleClose();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (overlay.hidden) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('button:not([hidden]), select:not([disabled])'),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  updateSummary();
  languageSelect.addEventListener('change', handleLanguageChange);
  timerSelect.addEventListener('change', handleTimerChange);
  testSpeechButton.addEventListener('click', handleTestSpeech);
  resumeButton.addEventListener('click', handleResume);
  closeButton.addEventListener('click', handleClose);
  document.addEventListener('keydown', handleKeyDown);
  panel.append(title, summary, languageField, timerField, actions);
  overlay.append(panel);
  root.append(trigger, overlay);

  const uninstallHoldGate = installParentalGate(trigger, handleOpen, {
    holdDurationMs,
  });

  return () => {
    uninstallHoldGate();
    document.removeEventListener('keydown', handleKeyDown);
    languageSelect.removeEventListener('change', handleLanguageChange);
    timerSelect.removeEventListener('change', handleTimerChange);
    testSpeechButton.removeEventListener('click', handleTestSpeech);
    resumeButton.removeEventListener('click', handleResume);
    closeButton.removeEventListener('click', handleClose);
    setBackgroundInert(false);
    trigger.remove();
    overlay.remove();
  };
}
