// Web Audio Synthesizer for Romantic Ambient Sound Effects and Background Pads

const MUTE_KEY = 'tod_couples_muted';

const readStoredMute = (): boolean => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private isMuted: boolean = readStoredMute();
  private musicOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private isMusicPlaying: boolean = false;
  private timerAlarmSources: OscillatorNode[] = [];
  private timerAlarmGain: GainNode | null = null;
  private timerAlarmCleanupTimeout: ReturnType<typeof setTimeout> | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Opens the sound device early: the first sound would otherwise hold up the first draw. */
  public warmUp() {
    if (this.isMuted || this.ctx) return;
    try { this.initCtx(); } catch { /* no sound on this device */ }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try { localStorage.setItem(MUTE_KEY, this.isMuted ? '1' : '0'); } catch { /* not remembered */ }
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
    }
    if (this.isMuted) this.stopTimerAlarm();
    // Opens the sound device right after this click, not in the middle of the next draw.
    else setTimeout(() => this.warmUp(), 250);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Short vibration on phones for key moments; silent when sound is muted. */
  public haptic(pattern: number | number[]) {
    if (this.isMuted || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(pattern); } catch { /* unsupported */ }
  }

  // Card Flip Chime
  public playCardFlip() {
    try {
      if (this.isMuted) return;
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5 chime

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  // Shuffle card deck sound effect (soft noise sweep)
  public playShuffle() {
    try {
      if (this.isMuted) return;
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      whiteNoise.start();
    } catch {
      // Audio fallback
    }
  }

  // Complete Challenge Confetti Sparkle Sound
  public playCompleteSound() {
    try {
      if (this.isMuted) return;
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 harp chord

      freqs.forEach((f, index) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + index * 0.06);

        gain.gain.setValueAtTime(0, now + index * 0.06);
        gain.gain.linearRampToValueAtTime(0.2, now + index * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + index * 0.06);
        osc.stop(now + index * 0.06 + 0.6);
      });
    } catch {
      // Audio fallback
    }
  }

  // Timer Tick Sound
  public playTick() {
    try {
      if (this.isMuted) return;
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Plays a paired, bell-like "reng reng" alarm for approximately three seconds.
   * Every strike is scheduled on the Web Audio timeline, so callers do not need
   * to manage a repeating interval. Starting a new alarm always cancels the old
   * one first.
   */
  public playTimerAlarm(durationMs: number = 3000): boolean {
    this.stopTimerAlarm();

    try {
      if (this.isMuted) return false;
      this.initCtx();
      if (!this.ctx || !this.masterGain) return false;

      const durationSeconds = Math.min(5, Math.max(0.8, durationMs / 1000));
      const now = this.ctx.currentTime;
      const alarmGain = this.ctx.createGain();
      alarmGain.gain.setValueAtTime(0.72, now);
      alarmGain.connect(this.masterGain);
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
        if (!this.ctx) return;
        const startAt = now + offset;
        const alternatingPitch = strikeIndex % 2 === 0 ? 1174.66 : 1318.51;

        [
          { ratio: 1, volume: 0.25, type: 'triangle' as OscillatorType },
          { ratio: 2.01, volume: 0.1, type: 'sine' as OscillatorType },
          { ratio: 3.04, volume: 0.045, type: 'sine' as OscillatorType },
        ].forEach(({ ratio, volume, type }) => {
          if (!this.ctx) return;
          const oscillator = this.ctx.createOscillator();
          const strikeGain = this.ctx.createGain();

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
        if (this.timerAlarmGain === alarmGain) {
          this.clearTimerAlarmNodes();
        }
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
      } catch {
        // The oscillator may already have ended.
      }
      try {
        oscillator.disconnect();
      } catch {
        // Already disconnected.
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

  private clearTimerAlarmNodes() {
    this.timerAlarmSources.forEach((oscillator) => {
      try {
        oscillator.disconnect();
      } catch {
        // Already disconnected.
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
    this.timerAlarmCleanupTimeout = null;
  }

  // Background Ambient Music Generator (Warm Romantic Synth Pad)
  public toggleBackgroundMusic(): boolean {
    this.initCtx();
    if (!this.ctx || !this.musicGain) return false;

    if (this.isMusicPlaying) {
      this.stopBackgroundMusic();
      this.isMusicPlaying = false;
      return false;
    } else {
      this.startBackgroundMusic();
      this.isMusicPlaying = true;
      return true;
    }
  }

  public isMusicOn(): boolean {
    return this.isMusicPlaying;
  }

  private startBackgroundMusic() {
    if (!this.ctx || !this.musicGain) return;
    this.stopBackgroundMusic();

    // Warm Romantic Chords (A Major 7 / F#m7 / Dmaj7 gentle synth pad)
    const notes = [220, 277.18, 329.63, 415.3]; // A3, C#4, E4, G#4
    const now = this.ctx.currentTime;

    notes.forEach((freq) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Low pass filter for warm lush sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 3.0); // Gentle 3s fade in

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      this.musicOscillators.push({ osc, gain });
    });
  }

  private stopBackgroundMusic() {
    this.musicOscillators.forEach(({ osc, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.5);
          setTimeout(() => osc.stop(), 1500);
        } else {
          osc.stop();
        }
      } catch {
        // ignore
      }
    });
    this.musicOscillators = [];
  }
}

export const soundEngine = new SoundEngine();
