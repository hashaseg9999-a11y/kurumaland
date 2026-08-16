export type SfxName =
  | 'chime'
  | 'pop'
  | 'bubble'
  | 'snap'
  | 'horn'
  | 'engine'
  | 'water'
  | 'wipe'
  | 'applause'
  | 'fanfare'
  | 'siren'
  | 'policeSiren'
  | 'trainWhistle'
  | 'tick'
  | 'highbeam'
  | 'railroad'
  | 'brush'
  | 'dryer'
  | 'sparkle'
  | 'note_do'
  | 'note_re'
  | 'note_mi'
  | 'note_fa'
  | 'note_so'
  | 'note_la'
  | 'note_ti'
  | 'note_do_high';

export interface SfxService {
  play(name: SfxName): void;
  playScale(noteIndex: number): void;
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
        this.playMarimbaChord(context, t, [523.25, 659.25, 783.99, 1046.5]); // C E G C
        break;
      case 'fanfare':
        this.playFanfare(context, t);
        break;
      case 'pop':
        this.playRubberyPop(context, t);
        break;
      case 'bubble':
        this.playBubble(context, t);
        break;
      case 'snap':
        this.playSnap(context, t);
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
      case 'wipe':
        this.playWipe(context, t);
        break;
      case 'applause':
        this.playThickApplause(context, t);
        break;
      case 'siren':
        this.playSiren(context, t);
        break;
      case 'policeSiren':
        this.playPoliceSiren(context, t);
        break;
      case 'trainWhistle':
        this.playTrainWhistle(context, t);
        break;
      case 'tick':
        this.playClick(context, t);
        break;
      case 'highbeam':
        this.playHighBeam(context, t);
        break;
      case 'railroad':
        this.playRailroad(context, t);
        break;
      case 'brush':
        this.playBrush(context, t);
        break;
      case 'dryer':
        this.playDryer(context, t);
        break;
      case 'sparkle':
        this.playSparkle(context, t);
        break;
      case 'note_do':
        this.playScaleTone(context, t, 261.63);
        break;
      case 'note_re':
        this.playScaleTone(context, t, 293.66);
        break;
      case 'note_mi':
        this.playScaleTone(context, t, 329.63);
        break;
      case 'note_fa':
        this.playScaleTone(context, t, 349.23);
        break;
      case 'note_so':
        this.playScaleTone(context, t, 392.00);
        break;
      case 'note_la':
        this.playScaleTone(context, t, 440.00);
        break;
      case 'note_ti':
        this.playScaleTone(context, t, 493.88);
        break;
      case 'note_do_high':
        this.playScaleTone(context, t, 523.25);
        break;
    }
  }

  playScale(noteIndex: number): void {
    const scaleFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
    const freq = scaleFreqs[Math.max(0, Math.min(scaleFreqs.length - 1, noteIndex))] ?? 261.63;
    const context = this.getContext();
    if (!context) return;
    const schedule = (): void => {
      if (context.state === 'running') this.playScaleTone(context, context.currentTime + 0.01, freq);
    };
    if (context.state === 'running') {
      schedule();
      return;
    }
    void context.resume().then(schedule).catch(() => undefined);
  }

  /** 温かみのある木琴・グロッケン調のアルペジオチャイム */
  private playMarimbaChord(context: AudioContext, t: number, freqs: number[]) {
    freqs.forEach((freq, index) => {
      const delay = index * 0.06;
      const osc = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t + delay);

      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.35, t + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.6);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);

      osc.start(t + delay);
      osc2.start(t + delay);
      osc.stop(t + delay + 0.7);
      osc2.stop(t + delay + 0.7);
    });
  }

  /** 達成時の輝くファンファーレ (Major Pentatonic Arpeggio) */
  private playFanfare(context: AudioContext, t: number) {
    const notes = [
      { f: 523.25, d: 0.0 },  // C5
      { f: 659.25, d: 0.08 }, // E5
      { f: 783.99, d: 0.16 }, // G5
      { f: 1046.5, d: 0.24 }, // C6
      { f: 1318.5, d: 0.36 }, // E6 (Long)
    ];

    notes.forEach((note, idx) => {
      const isLast = idx === notes.length - 1;
      const duration = isLast ? 0.9 : 0.4;
      const osc = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t + note.d);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(note.f * 1.002, t + note.d); // subtle chorus

      gain.gain.setValueAtTime(0.0001, t + note.d);
      gain.gain.exponentialRampToValueAtTime(isLast ? 0.45 : 0.3, t + note.d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d + duration);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);

      osc.start(t + note.d);
      osc2.start(t + note.d);
      osc.stop(t + note.d + duration + 0.05);
      osc2.stop(t + note.d + duration + 0.05);
    });
  }

  /** 弾むゴムまりのようなポップ音 */
  private playRubberyPop(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** 泡がプチッと弾ける軽快な音 */
  private playBubble(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const baseFreq = 800 + Math.random() * 400;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, t + 0.06);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** パズルや連結がカチッと吸着するスナップ音 */
  private playSnap(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.06);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** 明るく太い2音クラクション（プップー！） */
  private playThickHorn(context: AudioContext, t: number) {
    [0, 0.14].forEach((offset) => {
      const freqs = [350, 440];
      freqs.forEach((f) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + offset);

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, t + offset);

        gain.gain.setValueAtTime(0.0001, t + offset);
        gain.gain.linearRampToValueAtTime(0.18, t + offset + 0.02);
        gain.gain.linearRampToValueAtTime(0.0001, t + offset + 0.11);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);

        osc.start(t + offset);
        osc.stop(t + offset + 0.13);
      });
    });
  }

  /** 重厚なトイエンジン音（ブルルン！） */
  private playEngineRumble(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const osc2 = context.createOscillator();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const masterGain = context.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.4);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(30, t);
    osc2.frequency.exponentialRampToValueAtTime(70, t + 0.4);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(20, t);
    lfo.frequency.linearRampToValueAtTime(35, t + 0.4);

    lfoGain.gain.value = 0.4;
    lfo.connect(lfoGain);

    const amGain = context.createGain();
    amGain.gain.value = 0.6;
    lfoGain.connect(amGain.gain);

    osc.connect(amGain);
    osc2.connect(amGain);
    amGain.connect(masterGain);

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    masterGain.connect(filter);
    filter.connect(context.destination);

    masterGain.gain.setValueAtTime(0.0001, t);
    masterGain.gain.linearRampToValueAtTime(0.25, t + 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.start(t);
    osc2.start(t);
    lfo.start(t);
    osc.stop(t + 0.7);
    osc2.stop(t + 0.7);
    lfo.stop(t + 0.7);
  }

  /** 清涼感ある水流シャワー音 */
  private playWaterSplash(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.45);
    filter.Q.value = 1.2;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(t);
    source.stop(t + 0.55);
  }

  /** タオルで拭くときのキュッキュッ音 */
  private playWipe(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.linearRampToValueAtTime(1900, t + 0.08);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** 拍手と歓声 */
  private playThickApplause(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);

    for (let i = 0; i < 14; i++) {
      const source = context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const delay = t + Math.random() * 0.4;

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 1200;
      filter.Q.value = 1.4;

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, delay);
      gain.gain.exponentialRampToValueAtTime(0.045, delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, delay + 0.15);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);

      source.start(delay);
      source.stop(delay + 0.2);
    }
  }

  /** 消防車サイレン（ウーウー） */
  private playSiren(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.35);
    osc.frequency.linearRampToValueAtTime(700, t + 0.7);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  /** パトカーサイレン（ピロピロ） */
  private playPoliceSiren(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
    osc.frequency.linearRampToValueAtTime(800, t + 0.3);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.45);
    osc.frequency.linearRampToValueAtTime(800, t + 0.6);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  /** 列車の汽笛（ポッポー！） */
  private playTrainWhistle(context: AudioContext, t: number) {
    [520, 650].forEach((f) => {
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  /** 木片のような小気味よいタップ音 */
  private playClick(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.03);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** キラーンと星が輝く光の音 */
  private playHighBeam(context: AudioContext, t: number) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.15);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** 踏切の音（カン・カン） */
  private playRailroad(context: AudioContext, t: number) {
    [0, 0.35].forEach((offset) => {
      const osc = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(740, t + offset);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(740 * 2, t + offset);

      gain.gain.setValueAtTime(0.0001, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.28, t + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.3);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(context.destination);

      osc.start(t + offset);
      osc2.start(t + offset);
      osc.stop(t + offset + 0.32);
      osc2.stop(t + offset + 0.32);
    });
  }

  /** 洗車回転ブラシ（シュルシュル） */
  private playBrush(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(1600, t + 0.08);
    filter.frequency.linearRampToValueAtTime(700, t + 0.16);
    filter.Q.value = 3.0;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(t);
    source.stop(t + 0.2);
  }

  /** ドライヤー温風（ブオーン） */
  private playDryer(context: AudioContext, t: number) {
    if (!this.noiseBuffer) this.noiseBuffer = createNoiseBuffer(context, 2.0);
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(1100, t + 0.15);
    filter.frequency.linearRampToValueAtTime(800, t + 0.35);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(t);
    source.stop(t + 0.45);
  }

  /** キラキラワックス・星音（チリン） */
  private playSparkle(context: AudioContext, t: number) {
    const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
    freqs.forEach((f, idx) => {
      const delay = idx * 0.04;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + delay);

      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, t + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.35);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start(t + delay);
      osc.stop(t + delay + 0.4);
    });
  }

  /** ドレミファ音階トイベル（やわらかなグロッケン） */
  private playScaleTone(context: AudioContext, t: number, freq: number) {
    const osc = context.createOscillator();
    const osc2 = context.createOscillator();
    const osc3 = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

    osc.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(context.destination);

    osc.start(t);
    osc2.start(t);
    osc3.start(t);
    osc.stop(t + 0.75);
    osc2.stop(t + 0.75);
    osc3.stop(t + 0.75);
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioCtx = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AudioCtx) return null;
    this.context = new AudioCtx();
    return this.context;
  }
}

export function createSfxService(): SfxService {
  return new WebAudioSfxService();
}
