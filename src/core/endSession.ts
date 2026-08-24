import type { EndTimerMinutes } from './settings';

const DEFAULT_COMPLETION_DELAY_MS = 1_200;
const GRACE_PERIOD_MS = 15_000;

export interface EndSessionControllerOptions {
  onEnd(): void;
  completionDelayMs?: number;
}

export class EndSessionController {
  private readonly onEnd: () => void;
  private readonly completionDelayMs: number;
  private graceTimerId: number | null = null;
  private expiryTimerId: number | null = null;
  private endingTimerId: number | null = null;
  private deadlineMs: number | null = null;
  private expired = false;
  private ended = false;

  constructor(options: EndSessionControllerOptions) {
    this.onEnd = options.onEnd;
    this.completionDelayMs =
      options.completionDelayMs ?? DEFAULT_COMPLETION_DELAY_MS;
  }

  configure(minutes: EndTimerMinutes): void {
    this.clearTimers();
    this.deadlineMs = null;
    this.expired = false;
    this.ended = false;

    if (minutes === null) {
      return;
    }

    const durationMs = minutes * 60_000;
    this.deadlineMs = Date.now() + durationMs;
    this.expiryTimerId = window.setTimeout(() => {
      this.expiryTimerId = null;
      this.deadlineMs = null;
      this.expired = true;

      // Bounded grace period; if no task completes within it, end the session.
      this.graceTimerId = window.setTimeout(() => {
        this.graceTimerId = null;
        this.notifyTaskComplete();
      }, GRACE_PERIOD_MS);
    }, durationMs);
  }

  notifyTaskComplete(): void {
    if (!this.expired && this.deadlineMs !== null && Date.now() >= this.deadlineMs) {
      if (this.expiryTimerId !== null) {
        window.clearTimeout(this.expiryTimerId);
        this.expiryTimerId = null;
      }
      this.deadlineMs = null;
      this.expired = true;
    }

    if (!this.expired || this.ended || this.endingTimerId !== null) {
      return;
    }

    if (this.graceTimerId !== null) {
      window.clearTimeout(this.graceTimerId);
      this.graceTimerId = null;
    }

    this.endingTimerId = window.setTimeout(() => {
      this.endingTimerId = null;
      this.ended = true;
      this.onEnd();
    }, this.completionDelayMs);
  }

  get isEnded(): boolean {
    return this.ended;
  }

  destroy(): void {
    this.clearTimers();
    this.deadlineMs = null;
  }

  private clearTimers(): void {
    if (this.expiryTimerId !== null) {
      window.clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }

    if (this.graceTimerId !== null) {
      window.clearTimeout(this.graceTimerId);
      this.graceTimerId = null;
    }

    if (this.endingTimerId !== null) {
      window.clearTimeout(this.endingTimerId);
      this.endingTimerId = null;
    }
  }
}
