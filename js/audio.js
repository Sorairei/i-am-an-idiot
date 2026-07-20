import { SOUND_STORAGE_KEY } from "./config.js";
import { getBoolean, setBoolean } from "./storage.js";

export class AudioManager {
  constructor() {
    this.enabled = getBoolean(SOUND_STORAGE_KEY, true);
    this.context = null;
    this.master = null;
    this.lastRattle = 0;
  }

  async ensureStarted() {
    if (!this.enabled) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
    return true;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    setBoolean(SOUND_STORAGE_KEY, this.enabled);
    if (!this.enabled && this.context?.state === "running") this.context.suspend().catch(() => {});
    if (this.enabled) this.ensureStarted().catch(() => {});
  }

  tone({ frequency = 220, endFrequency = frequency, duration = 0.2, type = "sine", gain = 0.12, delay = 0 }) {
    if (!this.enabled || !this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + Math.min(.03, duration * .25));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(amp);
    amp.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  noise(duration = .12, gain = .05) {
    if (!this.enabled || !this.context || !this.master) return;
    const sampleCount = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    const source = this.context.createBufferSource();
    const amp = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 820;
    filter.Q.value = .7;
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start();
  }

  rattle(intensity = .5) {
    const now = performance.now();
    if (now - this.lastRattle < 62) return;
    this.lastRattle = now;
    this.noise(.05, .025 + intensity * .045);
    this.tone({ frequency: 95 + intensity * 80, endFrequency: 70, duration: .065, type: "triangle", gain: .025 });
  }

  reveal(category) {
    const patterns = {
      COMMON: () => { this.tone({ frequency: 360, endFrequency: 520, duration: .25, gain: .08 }); },
      SNARKY: () => { this.tone({ frequency: 610, endFrequency: 240, duration: .18, type: "square", gain: .055 }); },
      SAVAGE: () => { this.noise(.22, .12); this.tone({ frequency: 140, endFrequency: 42, duration: .48, type: "sawtooth", gain: .15 }); },
      RARE_TRUTH: () => [0, .15, .32].forEach((delay, index) => this.tone({ frequency: [392, 494, 659][index], duration: .65, gain: .055, delay })),
      FATAL: () => { this.noise(.45, .18); this.tone({ frequency: 82, endFrequency: 24, duration: 1.1, type: "sawtooth", gain: .22 }); },
    };
    patterns[category]?.();
  }

  croak() {
    this.tone({ frequency: 135, endFrequency: 74, duration: .18, type: "square", gain: .045 });
    this.tone({ frequency: 105, endFrequency: 61, duration: .22, type: "sawtooth", gain: .035, delay: .1 });
  }
}
