export type SfxName = 'chime' | 'pop' | 'horn' | 'engine' | 'water' | 'applause';

export interface SfxService {
  play(name: SfxName): void;
  unlock(): void;
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function scheduleTone(
  context: AudioContext,
  startTime: number,
  options: ToneOptions,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const endTime = startTime + options.duration;

  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.frequency, startTime);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, endTime);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(options.gain, startTime + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}

function scheduleNoise(
  context: AudioContext,
  startTime: number,
  duration: number,
  gainValue: number,
  frequency: number,
): void {
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const endTime = startTime + duration;

  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequency, startTime);
  filter.Q.setValueAtTime(0.8, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startTime);
  source.stop(endTime + 0.02);
}

class WebAudioSfxService implements SfxService {
  private context: AudioContext | null = null;

  unlock(): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    const playSilentBuffer = (): void => {
      if (context.state !== 'running') {
        return;
      }

      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
    };

    if (context.state === 'running') {
      playSilentBuffer();
      return;
    }

    void context.resume().then(playSilentBuffer).catch(() => undefined);
  }

  play(name: SfxName): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    const schedule = (): void => {
      if (context.state === 'running') {
        this.scheduleSound(context, name);
      }
    };

    if (context.state === 'running') {
      schedule();
      return;
    }

    void context.resume().then(schedule).catch(() => undefined);
  }

  private scheduleSound(context: AudioContext, name: SfxName): void {
    const startTime = context.currentTime + 0.01;

    switch (name) {
      case 'chime':
        scheduleTone(context, startTime, {
          frequency: 660,
          duration: 0.24,
          gain: 0.035,
        });
        scheduleTone(context, startTime + 0.11, {
          frequency: 880,
          duration: 0.3,
          gain: 0.03,
        });
        break;
      case 'pop':
        scheduleTone(context, startTime, {
          frequency: 520,
          endFrequency: 180,
          duration: 0.13,
          gain: 0.032,
        });
        break;
      case 'horn':
        scheduleTone(context, startTime, {
          frequency: 220,
          duration: 0.28,
          gain: 0.022,
          type: 'triangle',
        });
        scheduleTone(context, startTime, {
          frequency: 277,
          duration: 0.28,
          gain: 0.018,
          type: 'triangle',
        });
        break;
      case 'engine':
        scheduleTone(context, startTime, {
          frequency: 85,
          endFrequency: 120,
          duration: 0.38,
          gain: 0.018,
          type: 'sawtooth',
        });
        break;
      case 'water':
        scheduleNoise(context, startTime, 0.34, 0.016, 1_200);
        break;
      case 'applause':
        for (let index = 0; index < 4; index += 1) {
          scheduleNoise(context, startTime + index * 0.08, 0.07, 0.014, 1_700);
        }
        break;
    }
  }

  private getContext(): AudioContext | null {
    if (this.context?.state === 'closed') {
      this.context = null;
    }

    if (this.context) {
      return this.context;
    }

    const AudioContextConstructor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    try {
      this.context = new AudioContextConstructor();
      return this.context;
    } catch {
      return null;
    }
  }
}

export function createSfxService(): SfxService {
  return new WebAudioSfxService();
}
