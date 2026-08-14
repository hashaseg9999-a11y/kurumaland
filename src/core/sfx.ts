export type SfxName = 'chime' | 'pop' | 'horn' | 'engine' | 'water' | 'applause' | 'siren' | 'tick' | 'highbeam';

export interface SfxService {
  play(name: SfxName): void;
  unlock(): void;
}

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function createNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const frameCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

class WebAudioSfxService implements SfxService {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  unlock(): void {
    const context = this.getContext();
    if (!context) return;

    if (!this.noiseBuffer) {
      this.noiseBuffer = createNoiseBuffer(context, 2.0);
    }

    const playSilentBuffer = (): void => {
      if (context.state !== 'running') return;
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
    if (!context) return;
    const schedule = (): void => {
      if (context.state === 'running') this.scheduleSound(context, name);
    };
    if (context.state === 'running') {
      schedule();
      return;
    }
    void context.resume().then(schedule).catch(() => undefined);
  }

  private scheduleSound(context: AudioContext, name: SfxName): void {
    const t = context.currentTime + 0.01;
    switch (name) {
      case 'chime':
        this.playMarimbaChord(context, t, [523.25, 659.25, 783.99]);
        break;
      case 'pop':
        this.playRubberyPop(context, t);
        break;
      case 'horn':
        this.playThickHorn(context, t);
        break;
      case 'engine':
        this.playEngineRumble(context, t);
        break;
      case 'water':
        this.playWaterSplash(context, t);
        break;
      case 'applause':
        this.playThickApplause(context, t);
        break;
      case 'siren':
        this.playSiren(context, t);
        break;
      case 'tick':
        this.playClick(context, t);
        break;
      case 'highbeam':
        this.playHighBeam(context, t);
        break;
    }
  }

  private playMarimbaChord(context: AudioContext, t: number, freqs: number[]) {
    freqs.forEach((freq, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const delay = index * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);

      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.3, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.5);

      const osc2 = context.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t + delay);

      const gain2 = context.createGain();
      gain2.gain.setValueAtTime(0.0001, t + delay);
      gain2.gain.exponentialRampToValueAtTime(0.08, t + delay + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(context.destination);
      gain2.connect(context.destination);

      osc.start(t + delay);
      osc2.start(t + delay);
      osc.stop(t + delay + 0.6);
      osc2.stop(t + delay + 0.3);
    });
  }

  private playRubberyPop(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playThickHorn(context: AudioContext, t: number) {
    const freqs = [330, 334, 440];
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, t);
    masterGain.gain.linearRampToValueAtTime(0.15, t + 0.05);
    masterGain.gain.linearRampToValueAtTime(0.0001, t + 0.4);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, t);
    filter.connect(masterGain);
    masterGain.connect(context.destination);

    freqs.forEach(freq => {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  private playEngineRumble(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const masterGain = context.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.3);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(15, t);
    lfo.frequency.linearRampToValueAtTime(25, t + 0.3);

    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);

    const amGain = context.createGain();
    amGain.gain.value = 0.5;
    lfoGain.connect(amGain.gain);

    osc.connect(amGain);
    amGain.connect(masterGain);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    masterGain.connect(filter);
    filter.connect(context.destination);

    masterGain.gain.setValueAtTime(0.0001, t);
    masterGain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.7);
    lfo.stop(t + 0.7);
  }

  private playWaterSplash(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + 0.1);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    filter.Q.value = 1.0;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(t);
    source.stop(t + 0.5);
  }

  private playThickApplause(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);

    for (let i = 0; i < 12; i++) {
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const delay = t + Math.random() * 0.4;

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000 + Math.random() * 1000;
      filter.Q.value = 1.2;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, delay);
      gain.gain.linearRampToValueAtTime(0.1, delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, delay + 0.15);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);

      source.start(delay, Math.random());
      source.stop(delay + 0.2);
    }
  }

  private playSiren(context: AudioContext, t: number) {
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, t);
    masterGain.gain.linearRampToValueAtTime(0.14, t + 0.08);
    masterGain.gain.linearRampToValueAtTime(0.0001, t + 1.4);

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.4;
    filter.connect(masterGain);
    masterGain.connect(context.destination);

    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    const lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.5, t);
    const lfoDepth = context.createGain();
    lfoDepth.gain.value = 380;
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);
    osc.frequency.setValueAtTime(720, t);
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + 1.5);
    lfo.start(t);
    lfo.stop(t + 1.5);
  }

  private playClick(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1300, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  private playHighBeam(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.4);
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
    if (!AudioContextConstructor) return null;
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
