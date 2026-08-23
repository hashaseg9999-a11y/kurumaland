import menuIcon from '../assets/menu_three-world.svg';
import type { Activity, ActivityContext } from '../core/activity';
import { getI18nText } from '../core/i18n';
import './threeWorldActivity.css';
import { ThreeWorld } from './world';
import { threeGames } from './games';
import type { GameContext, GameModule, GameSfxName } from './contracts';
import type { SfxService, SfxName } from '../core/sfx';
import type { SpeechService } from '../core/speech';

type ActivitySfxName = GameSfxName;
const ACTIVITY_SFX_MAP: Record<ActivitySfxName, SfxName> = {
  chime: 'chime',
  pop: 'pop',
  horn: 'horn',
  sparkle: 'sparkle',
  siren: 'siren',
  policeSiren: 'policeSiren',
};
const THREE_GAME_LABELS: Record<string, string> = {
  signal: 'しんごうで GO!',
  'color-garage': 'いろの しゃこ',
  'big-small': 'おおきい・ちいさい',
  'ball-pool': 'ぼーるぷーる',
  'line-up': 'ならべて れっしゃ',
};

const THREE_GAME_INSTRUCTIONS: Record<string, string> = {
  signal: 'しんごうを おして、あおになったら しゅっぱつ！',
  'color-garage': 'いろと おなじ しゃこに はいろう！',
  'big-small': 'おおきい くるまと ちいさい くるまを ならべよう！',
  'ball-pool': 'ボールを ひっぱって うごかそう！',
  'line-up': 'いろの せいれつに くるまをつなげよう！',
};

export class ThreeWorldActivity implements Activity {
  readonly id = 'three-world';
  readonly menuIcon = menuIcon;
  private world: ThreeWorld | null = null;
  private overlay: HTMLElement | null = null;
  private activeGame: GameModule | null = null;
  private gameButtons: HTMLElement[] = [];
  private listeners: AbortController | null = null;
  private contextServices: { speech: SpeechService; sfx: SfxService; notifyTaskComplete(): void } | null = null;
  private hint: HTMLElement | null = null;

  mount(context: ActivityContext): void {
    this.unmount();
    this.listeners = new AbortController();
    this.contextServices = context;
    const stage = document.createElement('section');
    stage.className = 'three-world';
    const overlay = document.createElement('div');
    overlay.className = 'three-world__overlay';
    const tabs = document.createElement('nav');
    tabs.className = 'three-world__tabs';
    const hint = document.createElement('div');
    hint.className = 'three-world__hint';
    hint.textContent = THREE_GAME_INSTRUCTIONS[threeGames[0]!.id] ?? 'ゲームを えらんでね';
    this.hint = hint;
    overlay.append(hint, tabs);
    stage.append(overlay);
    context.root.replaceChildren(stage);
    this.overlay = overlay;
    try {
      this.world = new ThreeWorld(stage);
    } catch (error) {
      console.error('[ShunichiLand] WebGL init failed', error);
      const fallback = document.createElement('p');
      fallback.className = 'activity-fallback';
      fallback.textContent = getI18nText('webglUnavailable', context.speech.getLanguage());
      overlay.append(fallback);
      return;
    }
    for (const game of threeGames) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `three-world__tab`;
      button.textContent = THREE_GAME_LABELS[game.id] ?? game.id;
      button.setAttribute('aria-label', button.textContent ?? '');
      button.addEventListener('click', () => this.openGame(game), { signal: this.listeners.signal });
      tabs.append(button);
      this.gameButtons.push(button);
    }
    this.openGame(threeGames[0]!);
    window.addEventListener('resize', () => this.world?.resizeToContainer(), { signal: this.listeners.signal });
  }

  unmount(): void {
    this.activeGame?.unmount();
    this.activeGame = null;
    this.hint = null;
    this.listeners?.abort();
    this.listeners = null;
    this.gameButtons = [];
    this.overlay = null;
    this.contextServices = null;
    this.world?.dispose();
    this.world = null;
  }

  private openGame(game: GameModule): void {
    if (!this.world || !this.overlay || !this.contextServices) return;
    this.activeGame?.unmount();
    this.activeGame = null;
    if (this.hint) {
      this.hint.textContent = THREE_GAME_INSTRUCTIONS[game.id] ?? THREE_GAME_LABELS[game.id] ?? game.id;
    }
    const context: GameContext = {
      world: this.world,
      overlay: this.overlay,
      speak: (japaneseText) => this.speakText(japaneseText),
      sfx: (name) => this.contextServices?.sfx.play(ACTIVITY_SFX_MAP[name]),
      complete: () => this.contextServices?.notifyTaskComplete(),
    };
    this.activeGame = game;
    game.mount(context);
    for (const button of this.gameButtons) button.classList.toggle('is-active', button.textContent === (THREE_GAME_LABELS[game.id] ?? game.id));
  }

  private speakText(textValue: string): void {
    if (!this.contextServices) return;
    this.contextServices.speech.speakDirect(textValue);
  }
}
