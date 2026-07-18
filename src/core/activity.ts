import type { Settings } from './settings';
import type { SfxService } from './sfx';
import type { SpeechService } from './speech';

export interface ActivityContext {
  root: HTMLElement;
  speech: SpeechService;
  sfx: SfxService;
  settings: Settings;
  exitToMenu(): void;
  notifyTaskComplete(): void;
}

export interface Activity {
  readonly id: string;
  readonly menuIcon: string;
  mount(ctx: ActivityContext): void;
  unmount(): void;
}
