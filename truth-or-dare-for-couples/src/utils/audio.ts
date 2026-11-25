// Web Audio synthesizer: short sounds for what happens on the table, and a quiet
// background score that warms up with the game. Nothing is downloaded.

const MUTE_KEY = 'tod_couples_muted';
const HAPTICS_KEY = 'tod_couples_haptics';

const readFlag = (key: string, fallback: boolean): boolean => {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === '1';
  } catch { return fallback; }
};
const writeFlag = (key: string, on: boolean) => {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* not remembered */ }
};

const MASTER_VOLUME = 0.4;
const MUSIC_VOLUME = 0.5;

/** One note of a sound: pitch in Hz, start and length in seconds. */
interface Note {
  freq: number;
  /** Slides to this pitch. */
  to?: number;
  at?: number;
  length: number;
  volume: number;
  type?: OscillatorType;
  attack?: number;
}

/** Every event has its own voice, so a couple can follow the game without looking. */
const SOUNDS = {
  milestone: [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].map((freq, index): Note => ({
    freq, at: index * 0.07, length: index === 5 ? 1.3 : 0.7, volume: 0.16, type: 'triangle',
  })),
  skip: [
    { freq: 493.88, to: 466.16, length: 0.16, volume: 0.1 },
    { freq: 369.99, to: 349.23, at: 0.11, length: 0.28, volume: 0.1 },
  ],
  reroll: [
    { freq: 329.63, to: 440, length: 0.1, volume: 0.1, type: 'triangle' },
    { freq: 440, to: 587.33, at: 0.09, length: 0.1, volume: 0.1, type: 'triangle' },
    { freq: 587.33, to: 783.99, at: 0.18, length: 0.22, volume: 0.1, type: 'triangle' },
  ],
  spend: [
    { freq: 1174.66, length: 0.12, volume: 0.1, type: 'triangle' },
    { freq: 1567.98, at: 0.08, length: 0.3, volume: 0.11, type: 'triangle' },
  ],
  event: [
    { freq: 440, length: 1.1, volume: 0.11, attack: 0.05 },
    { freq: 659.25, at: 0.16, length: 1.2, volume: 0.1, attack: 0.05 },
    { freq: 987.77, at: 0.32, length: 1.6, volume: 0.09, attack: 0.05 },
  ],
  match: [
    { freq: 783.99, length: 0.5, volume: 0.13, type: 'triangle' },
    { freq: 987.77, length: 0.5, volume: 0.11, type: 'triangle' },
    { freq: 1318.5, at: 0.14, length: 0.8, volume: 0.11, type: 'triangle' },
  ],
  deck: [220, 277.18, 329.63, 415.3, 554.37].map((freq, index): Note => ({
    freq, at: index * 0.1, length: 2.4, volume: 0.1, type: index < 2 ? 'triangle' : 'sine', attack: 0.22,
  })),
  final: [
    { freq: 110, length: 3.4, volume: 0.2, type: 'triangle', attack: 0.08 },
    ...[220, 329.63, 415.3, 554.37].map((freq, index): Note => ({ freq, at: 0.1 + index * 0.12, length: 3, volume: 0.1, attack: 0.12 })),
    ...[1108.7, 1318.5, 1661.2].map((freq, index): Note => ({ freq, at: 0.75 + index * 0.16, length: 1.6, volume: 0.07, type: 'triangle' })),
  ],
  undo: [{ freq: 880, to: 440, length: 0.22, volume: 0.12 }],
  closing: [
    { freq: 329.63, length: 2.2, volume: 0.1, attack: 0.3 },
    { freq: 415.3, at: 0.35, length: 2.2, volume: 0.09, attack: 0.3 },
    { freq: 493.88, at: 0.7, length: 2.6, volume: 0.08, attack: 0.3 },
  ],
} satisfies Record<string, Note[]>;

export type SoundName = keyof typeof SOUNDS;

/**
 * The score: slow chords that follow each other without a seam. `heat` (0–1) picks the
 * mood: wide and calm at first, warmer with a soft melody, then darker with a heartbeat.
 */
interface Mood {
  upTo: number;
  /** Seconds per chord. */
  seconds: number;
  cutoff: number;
  /** Melody notes per chord. */
  melody: number;
  heartbeat: boolean;
  chords: readonly (readonly number[])[];
}

const MOODS: readonly Mood[] = [
  {
    upTo: 0.34, seconds: 9, cutoff: 700, melody: 2, heartbeat: false,
    chords: [[110, 220, 277.18, 415.3], [92.5, 220, 277.18, 329.63], [146.83, 220, 277.18, 369.99], [123.47, 246.94, 293.66, 369.99]],
  },
  {
    upTo: 0.68, seconds: 7.5, cutoff: 950, melody: 4, heartbeat: false,
    chords: [[92.5, 185, 277.18, 329.63], [146.83, 220, 277.18, 369.99], [110, 220, 329.63, 415.3], [82.41, 246.94, 329.63, 415.3]],
  },
  {
    upTo: Number.POSITIVE_INFINITY, seconds: 6.4, cutoff: 1250, melody: 5, heartbeat: true,
    chords: [[92.5, 185, 277.18, 415.3], [73.42, 220, 277.18, 369.99], [123.47, 246.94, 293.66, 440], [69.3, 207.65, 329.63, 415.3]],
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private isMuted: boolean = readFlag(MUTE_KEY, false);
  private hapticsOn: boolean = readFlag(HAPTICS_KEY, true);
  /** Quick hide: not a sound, whatever the settings say. */
  private isSilenced = false;

  private musicWanted = false;
  private musicHeld = false;
  private musicHeat = 0;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicVoices = new Set<OscillatorNode>();
  private nextChordAt = 0;
  private chordIndex = 0;

  private timerAlarmSources: OscillatorNode[] = [];
  private timerAlarmGain: GainNode | null = null;
  private timerAlarmCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume();
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = MOODS[0].cutoff;
      this.musicFilter.connect(this.musicGain);
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private volume(): number {
    return this.isMuted || this.isSilenced ? 0 : MASTER_VOLUME;
  }

  /** Ready to play, or null when nothing should be heard or the device has no sound. */
  private open(): { ctx: AudioContext; out: GainNode } | null {
    if (this.isMuted || this.isSilenced) return null;
    try {
      this.initCtx();
    } catch {
      return null;
    }
    return this.ctx && this.masterGain ? { ctx: this.ctx, out: this.masterGain } : null;
  }

  /** Opens the sound device early: the first sound would otherwise hold up the first draw. */
  public warmUp() {
    if (this.isMuted || this.ctx) return;
    try { this.initCtx(); } catch { /* no sound on this device */ }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    writeFlag(MUTE_KEY, this.isMuted);
    if (this.masterGain) this.masterGain.gain.value = this.volume();
    if (this.isMuted) {
      this.stopTimerAlarm();
      this.stopMusic();
    } else {
      // Opens the sound device right after this click, not in the middle of the next draw.
      setTimeout(() => {
        this.warmUp();
        this.syncMusic();
      }, 250);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Quick hide: everything goes quiet at once and stays quiet until it is lifted. */
  public setSilenced(silenced: boolean) {
    this.isSilenced = silenced;
    if (this.masterGain) this.masterGain.gain.value = this.volume();
    if (silenced) this.stopTimerAlarm();
    this.syncMusic();
  }

  // ----- Vibration: its own switch, so a muted phone can still be felt -----

  public canVibrate(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  public getHapticsOn(): boolean {
    return this.hapticsOn;
  }

  public toggleHaptics(): boolean {
    this.hapticsOn = !this.hapticsOn;
    writeFlag(HAPTICS_KEY, this.hapticsOn);
    if (this.hapticsOn) this.haptic(20);
    return this.hapticsOn;
  }

  /** Short vibration on phones for key moments. */
  public haptic(pattern: number | number[]) {
    if (!this.hapticsOn || this.isSilenced || !this.canVibrate()) return;
    try { navigator.vibrate(pattern); } catch { /* unsupported */ }
  }

  // ----- Short sounds -----

  private playNotes(notes: readonly Note[]) {
    const audio = this.open();
    if (!audio) return;
    try {
      const { ctx, out } = audio;
      for (const note of notes) {
        const start = ctx.currentTime + (note.at ?? 0);
        const end = start + note.length;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.type ?? 'sine';
        osc.frequency.setValueAtTime(note.freq, start);
        if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(note.volume, start + Math.min(note.attack ?? 0.02, note.length / 2));
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        osc.connect(gain);
        gain.connect(out);
        osc.start(start);
        osc.stop(end);
      }
    } catch {
      // Audio fallback
    }
  }

  private playNoise({ from, to, length, volume, q = 2 }: { from: number; to: number; length: number; volume: number; q?: number }) {
    const audio = this.open();
    if (!audio) return;
    try {
      const { ctx, out } = audio;
      if (!this.noise) {
        this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      }
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(from, now);
      filter.frequency.exponentialRampToValueAtTime(to, now + length);
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + length);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start(now);
      source.stop(now + length);
    } catch {
      // Audio fallback
    }
  }

  public play(name: SoundName) {
    this.playNotes(SOUNDS[name]);
  }

  // Card Flip Chime
  public playCardFlip() {
    this.playNotes([{ freq: 440, to: 880, length: 0.35, volume: 0.2, attack: 0.03 }]);
  }

  // Shuffle card deck sound effect (soft noise sweep)
  public playShuffle() {
    this.playNoise({ from: 1200, to: 1100, length: 0.25, volume: 0.12 });
  }

  /** Fabric sliding off: a falling breath and a warm low note. */
  public playGarment() {
    this.playNoise({ from: 2600, to: 420, length: 0.5, volume: 0.11, q: 1.1 });
    this.playNotes([
      { freq: 246.94, to: 220, at: 0.12, length: 0.9, volume: 0.12, attack: 0.08 },
      { freq: 329.63, at: 0.26, length: 0.9, volume: 0.07, attack: 0.1 },
    ]);
  }

  // Complete Challenge Confetti Sparkle Sound: C5, E5, G5, C6 harp chord
  public playCompleteSound() {
    this.playNotes([523.25, 659.25, 783.99, 1046.5].map((freq, index): Note => ({
      freq, at: index * 0.06, length: 0.6, volume: 0.2, type: 'triangle',
    })));
  }

  // Timer Tick Sound
  public playTick() {
    this.playNotes([{ freq: 800, length: 0.05, volume: 0.08, attack: 0.002 }]);
  }

  /**
   * Plays a paired, bell-like "reng reng" alarm for approximately three seconds.
   * Every strike is scheduled on the Web Audio timeline, so callers do not need
   * to manage a repeating interval. Starting a new alarm always cancels the old
   * one first.
   */
  public playTimerAlarm(durationMs: number = 3000): boolean {
    this.stopTimerAlarm();
    const audio = this.open();
    if (!audio) return false;

    try {
      const { ctx, out } = audio;
      const durationSeconds = Math.min(5, Math.max(0.8, durationMs / 1000));
      const now = ctx.currentTime;
      const alarmGain = ctx.createGain();
      alarmGain.gain.setValueAtTime(0.72, now);
      alarmGain.connect(out);
      this.timerAlarmGain = alarmGain;

      // Four paired strikes over three seconds gives a recognisable
      // "reng-reng ... reng-reng" cadence without a looping timer.
      const pairSpacing = 0.2;
      const pairInterval = 0.74;
      const strikeDuration = 0.48;
      const strikeTimes: number[] = [];

      for (
        let pairStart = 0;
        pairStart < durationSeconds - strikeDuration;
        pairStart += pairInterval
      ) {
        strikeTimes.push(pairStart);
        if (pairStart + pairSpacing < durationSeconds - strikeDuration / 2) {
          strikeTimes.push(pairStart + pairSpacing);
        }
      }

      strikeTimes.forEach((offset, strikeIndex) => {
        const startAt = now + offset;
        const alternatingPitch = strikeIndex % 2 === 0 ? 1174.66 : 1318.51;

        [
          { ratio: 1, volume: 0.25, type: 'triangle' as OscillatorType },
          { ratio: 2.01, volume: 0.1, type: 'sine' as OscillatorType },
          { ratio: 3.04, volume: 0.045, type: 'sine' as OscillatorType },
        ].forEach(({ ratio, volume, type }) => {
          const oscillator = ctx.createOscillator();
          const strikeGain = ctx.createGain();

          oscillator.type = type;
          oscillator.frequency.setValueAtTime(alternatingPitch * ratio, startAt);
          oscillator.detune.setValueAtTime(strikeIndex % 2 === 0 ? -4 : 4, startAt);

          strikeGain.gain.setValueAtTime(0.0001, startAt);
          strikeGain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
          strikeGain.gain.exponentialRampToValueAtTime(0.0001, startAt + strikeDuration);

          oscillator.connect(strikeGain);
          strikeGain.connect(alarmGain);
          oscillator.start(startAt);
          oscillator.stop(startAt + strikeDuration + 0.02);
          this.timerAlarmSources.push(oscillator);
        });
      });

      this.timerAlarmCleanupTimeout = setTimeout(() => {
        if (this.timerAlarmGain === alarmGain) this.stopTimerAlarm();
      }, durationSeconds * 1000 + 200);

      return true;
    } catch {
      this.stopTimerAlarm();
      return false;
    }
  }

  /** Stops any scheduled timer alarm immediately and releases its audio nodes. */
  public stopTimerAlarm() {
    if (this.timerAlarmCleanupTimeout) {
      clearTimeout(this.timerAlarmCleanupTimeout);
      this.timerAlarmCleanupTimeout = null;
    }

    this.timerAlarmSources.forEach((oscillator) => {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {
        // The oscillator may already have ended.
      }
    });
    this.timerAlarmSources = [];

    if (this.timerAlarmGain) {
      try {
        this.timerAlarmGain.disconnect();
      } catch {
        // Already disconnected.
      }
      this.timerAlarmGain = null;
    }
  }

  // ----- Background music -----

  /** Turning the music on also turns the sound on: otherwise nothing would be heard. */
  public toggleBackgroundMusic(): boolean {
    this.musicWanted = !this.musicWanted;
    if (this.musicWanted && this.isMuted) this.toggleMute();
    this.syncMusic();
    return this.musicWanted;
  }

  public isMusicOn(): boolean {
    return this.musicWanted && !this.isMuted;
  }

  /** 0 at the start of a game, 1 at its hottest; the score follows with its next chord. */
  public setMusicHeat(heat: number) {
    this.musicHeat = Math.max(0, Math.min(1, heat));
  }

  /** Holds the music while the table is paused or the page is in the background. */
  public setMusicHeld(held: boolean) {
    if (this.musicHeld === held) return;
    this.musicHeld = held;
    this.syncMusic();
  }

  private syncMusic() {
    const shouldPlay = this.musicWanted && !this.musicHeld && !this.isMuted && !this.isSilenced;
    if (shouldPlay && this.musicTimer === null) this.startMusic();
    else if (!shouldPlay) this.stopMusic();
  }

  private startMusic() {
    const audio = this.open();
    if (!audio || !this.musicGain) return;
    const now = audio.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, now + 1.6);
    this.nextChordAt = now + 0.05;
    this.scheduleChord();
  }

  private stopMusic() {
    if (this.musicTimer !== null) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0, now + 0.5);
    for (const voice of this.musicVoices) {
      try { voice.stop(now + 0.6); } catch { /* already over */ }
    }
    this.musicVoices.clear();
  }

  private musicNote(note: Note, start: number, out: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const end = start + note.length;
    const attack = note.attack ?? 0.02;
    osc.type = note.type ?? 'sine';
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(note.volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(end);
    this.musicVoices.add(osc);
    osc.onended = () => {
      this.musicVoices.delete(osc);
      gain.disconnect();
    };
  }

  private scheduleChord() {
    if (!this.ctx || !this.musicFilter) return;
    const mood = MOODS.find((item) => this.musicHeat < item.upTo) ?? MOODS[MOODS.length - 1];
    const chord = mood.chords[this.chordIndex % mood.chords.length];
    this.chordIndex += 1;
    const start = Math.max(this.ctx.currentTime + 0.05, this.nextChordAt);
    const { seconds } = mood;
    this.musicFilter.frequency.setTargetAtTime(mood.cutoff, start, 1.5);

    try {
      // Each chord rings into the next one.
      chord.forEach((freq, index) => {
        for (const detune of [-4, 4]) {
          this.musicNote({
            freq: freq * 2 ** (detune / 1200),
            length: seconds + 3,
            volume: index === 0 ? 0.09 : 0.055,
            type: index === 0 ? 'triangle' : 'sine',
            attack: 2.2,
          }, start, this.musicFilter!);
        }
      });
      for (let index = 0; index < mood.melody; index += 1) {
        const freq = chord[1 + ((index * 2 + this.chordIndex) % (chord.length - 1))] * 2;
        // A little unevenness keeps the loop from sounding like a machine.
        const at = start + ((index + 0.35 + Math.random() * 0.2) * seconds) / mood.melody;
        this.musicNote({ freq, length: 1.9, volume: 0.06, type: 'triangle', attack: 0.03 }, at, this.musicFilter!);
      }
      if (mood.heartbeat) {
        for (let at = 0.2; at < seconds - 0.4; at += 1.06) {
          this.musicNote({ freq: 62, to: 42, length: 0.26, volume: 0.34, attack: 0.012 }, start + at, this.musicFilter!);
          this.musicNote({ freq: 56, to: 40, length: 0.22, volume: 0.22, attack: 0.012 }, start + at + 0.27, this.musicFilter!);
        }
      }
    } catch {
      // Audio fallback
    }

    this.nextChordAt = start + seconds;
    this.musicTimer = setTimeout(() => this.scheduleChord(), Math.max(400, (this.nextChordAt - this.ctx.currentTime - 1) * 1000));
  }
}

export const soundEngine = new SoundEngine();
