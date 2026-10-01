import type { Settings } from './settings';
import { VOCAB, type VocabKey } from './vocab';

export type Lang = 'ja' | 'en' | 'th';
export type LangMode = Lang | 'rotate';
export type { VocabKey } from './vocab';

export interface SpeechService {
  speak(key: VocabKey): void;
  speakDirect(japaneseText: string): void;
  unlock(): void;
  getLanguage(): Lang;
}

const ROTATING_LANGUAGES = ['ja', 'en', 'th'] as const satisfies readonly Lang[];
const LANGUAGE_TAGS: Readonly<Record<Lang, string>> = {
  ja: 'ja-JP',
  en: 'en-US',
  th: 'th-TH',
};
const SPEECH_RATE = 0.9;

/** 3Dゲームが渡す日本語フレーズ → 3言語語彙キー。キーはひらがな正規化後の表記。 */
const PHRASE_TO_VOCAB: Readonly<Record<string, VocabKey>> = {
  'あお！ しょうぼうしゃ、ごー！': 'goFireTruck',
  'あお！ きゅうきゅうしゃ、ごー！': 'goAmbulance',
  'あお！ ぱとかー、ごー！': 'goPoliceCar',
  'あか！ とまれ！': 'stop',
  'よくできたね！': 'wellDone',
  'おおきい！': 'big',
  'ちいさい！': 'small',
  'あか！': 'red',
  'あお！': 'blue',
  'きいろ！': 'yellow',
  'みどり！': 'green',
  'あかい くるま！': 'redCar',
  'あおい くるま！': 'blueCar',
  'みどりの くるま！': 'greenCar',
  'れっしゃ しゅっぱつ！': 'trainDepart',
  'やったー！ ぼーなす！': 'bonus',
};

/** カタカナをひらがなへ寄せ、「パトカー」「ぱとかー」の表記揺れで無音にならないようにする。 */
function normalizePhrase(text: string): string {
  return text
    .trim()
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

export function resolvePhraseKey(japaneseText: string): VocabKey | undefined {
  return PHRASE_TO_VOCAB[normalizePhrase(japaneseText)];
}

function normalizeLanguageTag(tag: string): string {
  return tag.trim().replaceAll('_', '-').toLowerCase();
}

class WebSpeechService implements SpeechService {
  private readonly synthesis: SpeechSynthesis | null;
  private voices: SpeechSynthesisVoice[] = [];
  private unlocked = false;
  private rotateIndex = 0;
  private previousMode: LangMode | null = null;
  private requestId = 0;

  constructor(private readonly settings: Settings) {
    this.synthesis =
      typeof window !== 'undefined' && 'speechSynthesis' in window
        ? window.speechSynthesis
        : null;

    if (!this.synthesis) {
      return;
    }

    this.refreshVoices();
    if (typeof this.synthesis.addEventListener === 'function') {
      this.synthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
    }
  }

  speak(key: VocabKey): void {
    if (!this.canSpeak()) {
      return;
    }

    const words = VOCAB[key];
    if (!words) {
      return;
    }

    const lang = this.resolveLanguage();
    this.say(words[lang], lang);
  }

  speakDirect(japaneseText: string): void {
    const key = resolvePhraseKey(japaneseText);
    if (key) {
      this.speak(key);
      return;
    }
    // 語彙未登録のフレーズは従来どおり日本語で読み上げる（無音にしない）。
    if (this.canSpeak()) {
      this.say(japaneseText, 'ja');
    }
  }

  /** UI表示用。rotateの巡回順を消費せず、次に発話される言語を返す。 */
  getLanguage(): Lang {
    const mode = this.settings.langMode;
    if (mode !== 'rotate') {
      this.previousMode = mode;
      return mode;
    }
    const index = this.previousMode === 'rotate' ? this.rotateIndex : 0;
    return ROTATING_LANGUAGES[index] ?? 'ja';
  }

  unlock(): void {
    if (this.unlocked) {
      return;
    }

    // unlock前に依頼された発話は保持せず、ここから先の発話だけを受け付ける。
    this.unlocked = true;

    if (!this.synthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }

    try {
      this.refreshVoices();
      const utterance = new SpeechSynthesisUtterance(' ');
      const languageTag = LANGUAGE_TAGS.ja;
      const voice = this.findVoice(languageTag);
      utterance.lang = languageTag;
      utterance.volume = 0;
      utterance.rate = SPEECH_RATE;
      if (voice) {
        utterance.voice = voice;
      }
      this.synthesis.speak(utterance);
    } catch {
      // iOS等で無音発話に失敗しても、例外を画面へ伝播させない。
    }
  }

  private canSpeak(): boolean {
    return (
      this.unlocked &&
      this.synthesis !== null &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  /** 発話中の音声は必ず止めてから話すため、最後の要求だけが聞こえる。 */
  private say(text: string, lang: Lang): void {
    if (!this.synthesis) {
      return;
    }
    const requestId = ++this.requestId;
    const languageTag = LANGUAGE_TAGS[lang];

    try {
      this.synthesis.cancel();
    } catch {
      return;
    }

    this.refreshVoices();
    const voice = this.findVoice(languageTag);
    if (requestId !== this.requestId) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageTag;
      utterance.rate = SPEECH_RATE;
      utterance.pitch = 1.15;
      if (voice) {
        utterance.voice = voice;
      }
      this.synthesis.speak(utterance);
    } catch {
      // 音声APIが不安定な環境でも、遊び自体は止めない。
    }
  }

  private readonly handleVoicesChanged = (): void => {
    this.refreshVoices();
  };

  private refreshVoices(): void {
    if (!this.synthesis) {
      this.voices = [];
      return;
    }

    try {
      this.voices = this.synthesis.getVoices();
    } catch {
      this.voices = [];
    }
  }

  private findVoice(languageTag: string): SpeechSynthesisVoice | undefined {
    const normalizedTarget = normalizeLanguageTag(languageTag);
    const exactMatch = this.voices.find(
      (voice) => normalizeLanguageTag(voice.lang) === normalizedTarget,
    );
    if (exactMatch) {
      return exactMatch;
    }

    const baseLanguage = normalizedTarget.split('-')[0];
    if (!baseLanguage) {
      return undefined;
    }
    return this.voices.find((voice) => {
      const normalizedVoiceLanguage = normalizeLanguageTag(voice.lang);
      return (
        normalizedVoiceLanguage === baseLanguage ||
        normalizedVoiceLanguage.startsWith(baseLanguage + '-')
      );
    });
  }

  private resolveLanguage(): Lang {
    const mode = this.settings.langMode;
    if (mode !== 'rotate') {
      this.previousMode = mode;
      return mode;
    }

    if (this.previousMode !== 'rotate') {
      this.rotateIndex = 0;
    }

    const language = ROTATING_LANGUAGES[this.rotateIndex] ?? 'ja';
    this.rotateIndex = (this.rotateIndex + 1) % ROTATING_LANGUAGES.length;
    this.previousMode = mode;
    return language;
  }
}

export function createSpeechService(settings: Settings): SpeechService {
  return new WebSpeechService(settings);
}
