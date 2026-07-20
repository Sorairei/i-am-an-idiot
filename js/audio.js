import { SOUND_STORAGE_KEY } from "./config.js";
import { getBoolean, setBoolean } from "./storage.js";

export class AudioManager {
  constructor() {
    this.enabled = getBoolean(SOUND_STORAGE_KEY, true);
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.noiseBuildInProgress = false;
    this.lastRattle = 0;
    this.startPromise = null;
  }

  prewarm() {
    if (!this.enabled || this.context) return Boolean(this.context);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      this.context = new AudioContextClass({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);
      this.scheduleReusableNoiseBuffer();
      return true;
    } catch {
      this.context = null;
      this.master = null;
      return false;
    }
  }

  async ensureStarted() {
    if (!this.enabled) return false;
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.startAudioContext();
    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async startAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    if (!this.context && !this.prewarm()) return false;

    if (this.context.state === "suspended") await this.context.resume();
    return true;
  }

  scheduleReusableNoiseBuffer() {
    if (!this.context || this.noiseBuffer || this.noiseBuildInProgress) return;
    this.noiseBuildInProgress = true;

    const sampleCount = Math.ceil(this.context.sampleRate * 0.7);
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let index = 0;
    let previous = 0;
    let seed = 0x2f6e2b1;

    const fillChunk = deadline => {
      const chunkEnd = Math.min(sampleCount, index + 2048);
      while (index < chunkEnd) {
        // Fast deterministic xorshift noise avoids thousands of Math.random
        // calls in a single input frame.
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        const white = ((seed >>> 0) / 2147483648) - 1;
        previous = previous * 0.18 + white * 0.82;
        data[index] = previous;
        index += 1;
      }

      if (index < sampleCount) {
        if ("requestIdleCallback" in window) {
          requestIdleCallback(fillChunk, { timeout: 80 });
        } else {
          setTimeout(fillChunk, 0);
        }
      } else {
        this.noiseBuffer = buffer;
        this.noiseBuildInProgress = false;
      }
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(fillChunk, { timeout: 80 });
    } else {
      setTimeout(fillChunk, 0);
    }
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    setBoolean(SOUND_STORAGE_KEY, this.enabled);
    if (!this.enabled && this.context?.state === "running") this.context.suspend().catch(() => {});
    if (this.enabled) this.ensureStarted().catch(() => {});
  }

  tone({ frequency = 220, endFrequency = frequency, duration = 0.2, type = "sine", gain = 0.12, delay = 0 }) {
    if (!this.enabled || !this.context || !this.master || this.context.state !== "running") return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const amp = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.03, duration * 0.25));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(amp);
    amp.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noise(duration = 0.12, gain = 0.05) {
    if (!this.enabled || !this.context || !this.master || !this.noiseBuffer || this.context.state !== "running") return;

    const source = this.context.createBufferSource();
    const amp = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const start = this.context.currentTime;
    const maxOffset = Math.max(0, this.noiseBuffer.duration - duration - 0.01);
    const offset = Math.random() * maxOffset;

    source.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.frequency.value = 820;
    filter.Q.value = 0.7;
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    source.start(start, offset, duration);
  }

  rattle(intensity = 0.5) {
    const now = performance.now();
    if (now - this.lastRattle < 74) return;
    this.lastRattle = now;
    this.noise(0.05, 0.025 + intensity * 0.045);
    this.tone({ frequency: 95 + intensity * 80, endFrequency: 70, duration: 0.065, type: "triangle", gain: 0.025 });
  }

  reveal(category) {
    const patterns = {
      COMMON: () => { this.tone({ frequency: 360, endFrequency: 520, duration: 0.25, gain: 0.08 }); },
      SNARKY: () => { this.tone({ frequency: 610, endFrequency: 240, duration: 0.18, type: "square", gain: 0.055 }); },
      SAVAGE: () => { this.noise(0.22, 0.12); this.tone({ frequency: 140, endFrequency: 42, duration: 0.48, type: "sawtooth", gain: 0.15 }); },
      RARE_TRUTH: () => [0, 0.15, 0.32].forEach((delay, index) => this.tone({ frequency: [392, 494, 659][index], duration: 0.65, gain: 0.055, delay })),
      FATAL: () => { this.noise(0.45, 0.18); this.tone({ frequency: 82, endFrequency: 24, duration: 1.1, type: "sawtooth", gain: 0.22 }); },
    };
    patterns[category]?.();
  }

  croak() {
    this.tone({ frequency: 135, endFrequency: 74, duration: 0.18, type: "square", gain: 0.045 });
    this.tone({ frequency: 105, endFrequency: 61, duration: 0.22, type: "sawtooth", gain: 0.035, delay: 0.1 });
  }
}
