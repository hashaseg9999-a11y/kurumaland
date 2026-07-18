import type { LangMode } from './speech';

export type EndTimerMinutes = 10 | 20 | 30 | null;

export interface Settings {
  langMode: LangMode;
  endTimerMinutes: EndTimerMinutes;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  langMode: 'ja',
  endTimerMinutes: null,
});

const STORAGE_KEY = 'kuruma-land.settings.v1';
export const LANG_MODES = ['ja', 'en', 'th', 'rotate'] as const satisfies readonly LangMode[];
const VALID_END_TIMERS: readonly EndTimerMinutes[] = [10, 20, 30, null];

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isLangMode(value: unknown): value is LangMode {
  return typeof value === 'string' && LANG_MODES.some((mode) => mode === value);
}

function normalizeSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  const langMode = isLangMode(value.langMode) ? value.langMode : DEFAULT_SETTINGS.langMode;
  const endTimerMinutes = VALID_END_TIMERS.includes(value.endTimerMinutes as EndTimerMinutes)
    ? (value.endTimerMinutes as EndTimerMinutes)
    : DEFAULT_SETTINGS.endTimerMinutes;

  return { langMode, endTimerMinutes };
}

export function loadSettings(): Settings {
  const storage = getStorage();
  if (!storage) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const saved = storage.getItem(STORAGE_KEY);
    return saved ? normalizeSettings(JSON.parse(saved) as unknown) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Safariのプライベートブラウズ等で保存できない場合も、アプリの利用は継続する。
  }
}
