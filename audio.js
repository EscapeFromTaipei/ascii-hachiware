window.HachiwareAudio = (() => {
  class GuitarSynth {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.lastStep = -1;
      // 柔和原聲民謠循環旋律（頻率 Hz，0 代表休止符）
      this.melody = [
        329.63, 392.00, 440.00, 392.00,
        523.25, 493.88, 440.00, 392.00,
        349.23, 392.00, 440.00, 523.25,
        440.00, 392.00, 329.63, 0,
        293.66, 329.63, 392.00, 440.00,
        493.88, 440.00, 392.00, 329.63,
        349.23, 329.63, 293.66, 329.63,
        392.00, 392.00, 261.63, 0,
      ];
      this.bass = [
        130.81, 0, 196.00, 0,
        110.00, 0, 164.81, 0,
        174.61, 0, 130.81, 0,
        196.00, 0, 130.81, 0,
        146.83, 0, 196.00, 0,
        164.81, 0, 110.00, 0,
        174.61, 0, 196.00, 0,
        130.81, 0, 130.81, 0,
      ];
    }

    toggle() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      this.lastStep = -1;
      return this.enabled;
    }

    pluck(freq, gainLevel, duration) {
      if (!this.ctx || !freq || !this.enabled) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      sub.type = "sine";
      sub.frequency.setValueAtTime(freq * 2, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(520, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(gainLevel, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      sub.start(now);
      osc.stop(now + duration + 0.03);
      sub.stop(now + duration + 0.03);
    }

    tick(t, isPlaying) {
      if (!this.enabled || !isPlaying) return;
      const step = Math.floor(t * 2.5) % this.melody.length;
      if (step === this.lastStep) return;
      this.lastStep = step;
      this.pluck(this.melody[step], 0.085, 0.42);
      if (this.bass[step]) {
        this.pluck(this.bass[step], 0.06, 0.55);
      }
    }
  }

  return { GuitarSynth };
})();
