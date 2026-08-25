import type { Settings } from './settings';
import type { VocabKey } from './vocab';

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

/** 3Dゲーム等から渡される直接フレーズ → 生成済み音声キーへの写像。 */
const PHRASE_TO_AUDIO_KEY: Readonly<Record<string, string>> = {
  'あお！ しょうぼうしゃ、ごー！': 'phrase_go_fire_truck',
  'あお！ きゅうきゅうしゃ、ごー！': 'phrase_go_ambulance',
  'あお！ ぱとかー、ごー！': 'phrase_go_police_car',
  'あか！ とまれ！': 'phrase_stop',
  'よくできたね！': 'phrase_yokudekita',
  'おおきい！': 'phrase_ookii',
  'ちいさい！': 'phrase_chiisai',
  'あかい くるま！': 'phrase_akai_kuruma',
  'あおい くるま！': 'phrase_aoi_kuruma',
  'きいろい くるま！': 'phrase_kiiroi_kuruma',
  'みどりの くるま！': 'phrase_midori_kuruma',
  'あか！': 'phrase_akai',
  'あお！': 'phrase_ao',
  'きいろ！': 'phrase_kiiroi',
  'みどり！': 'phrase_midori',
  'れっしゃ しゅっぱつ！': 'phrase_ressha_shuppatsu',
  'やったー！ ボーナス！': 'phrase_bonus',
};

const AUDIO_BASE = new URL('audio/', document.baseURI).href;

class PreRenderedSpeechService implements SpeechService {
  private audioContext: AudioContext | null = null;
  private readonly buffers = new Map<string, AudioBuffer | null>();
  private readonly pending = new Map<string, Promise<AudioBuffer | null>>();
  private unlocked = false;
  private rotateIndex = 0;
  private previousMode: LangMode | null = null;

  constructor(private readonly settings: Settings) {}

  speak(key: VocabKey): void {
    this.playVocab(key);
  }

  speakDirect(japaneseText: string): void {
    const audioKey = PHRASE_TO_AUDIO_KEY[japaneseText];
    if (audioKey) {
      this.playVocab(audioKey);
      return;
    }
    // 未生成フレーズは無音でスキップ（子ども向けアプリのため失敗状態を作らない）。
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'running') return;
    void context.resume().catch(() => undefined);
  }

  getLanguage(): Lang {
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

  private playVocab(audioKey: string): void {
    if (!this.unlocked) return;
    const lang = this.getLanguage();
    const cacheKey = lang + '/' + audioKey;
    const context = this.getContext();
    if (!context) return;

    const start = (buffer: AudioBuffer | null): void => {
      if (!buffer || context.state !== 'running') return;
      this.stopCurrent();
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        if (this.currentSource === source) this.currentSource = null;
      };
      source.start();
      this.currentSource = source;
    };

    const buffered = this.buffers.get(cacheKey);
    if (buffered !== undefined) {
      start(buffered);
      return;
    }

    const pendingLoad = this.pending.get(cacheKey);
    if (pendingLoad) {
      void pendingLoad.then(start);
      return;
    }

    const load = this.loadBuffer(context, cacheKey);
    this.pending.set(cacheKey, load);
    void load
      .then((buffer) => {
        start(buffer);
      })
      .catch(() => undefined)
      .finally(() => {
        this.pending.delete(cacheKey);
      });
  }

  private currentSource: AudioBufferSourceNode | null = null;

  private stopCurrent(): void {
    if (!this.currentSource) return;
    try {
      this.currentSource.stop();
    } catch {
      // already stopped
    }
    this.currentSource = null;
  }

  private async loadBuffer(context: AudioContext, cacheKey: string): Promise<AudioBuffer | null> {
    const url = AUDIO_BASE + cacheKey + '.mp3';
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.buffers.set(cacheKey, null);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer);
      this.buffers.set(cacheKey, buffer);
      return buffer;
    } catch {
      this.buffers.set(cacheKey, null);
      return null;
    }
  }

  private getContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return null;
    this.audioContext = new AudioCtx();
    return this.audioContext;
  }
}

export function createSpeechService(settings: Settings): SpeechService {
  return new PreRenderedSpeechService(settings);
}
