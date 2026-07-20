const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Lightweight atmospheric background.
 *
 * V5 rendered a full-window Three.js/WebGL scene continuously. That looked
 * good, but it was the largest runtime and download cost in the project.
 * V6 keeps the same particles, parallax and orbital ambience with Canvas 2D,
 * adaptive frame pacing and no external rendering engine.
 */
export class SceneController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ready = false;
    this.shake = 0;
    this.pointer = { x: 0, y: 0 };
    this.theme = { r: 117, g: 232, b: 42 };
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isSmallScreen = matchMedia("(max-width: 700px)").matches;
    this.frameRequest = 0;
    this.lastPaint = 0;
    this.startTime = performance.now();
    this.visibilityHandler = () => this.handleVisibility();
    this.resizeHandler = () => this.queueResize();
  }

  async init() {
    const context = this.canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });

    if (!context) {
      this.canvas.hidden = true;
      return false;
    }

    this.context = context;
    this.createParticles();
    this.resize();
    this.ready = true;

    addEventListener("resize", this.resizeHandler, { passive: true });
    document.addEventListener("visibilitychange", this.visibilityHandler, { passive: true });
    this.frameRequest = requestAnimationFrame(this.animate);
    return true;
  }

  createParticles() {
    const count = this.reducedMotion ? 36 : (this.isSmallScreen ? 72 : 126);
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      depth: 0.2 + Math.random() * 0.8,
      radius: 0.45 + Math.random() * 1.35,
      speed: 0.000006 + Math.random() * 0.000014,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.16 + Math.random() * 0.48,
    }));
  }

  queueResize() {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => this.resize());
  }

  resize() {
    if (!this.context) return;
    this.width = innerWidth;
    this.height = innerHeight;

    // A restrained DPR is visually indistinguishable for tiny particles but
    // avoids rendering millions of unnecessary pixels on high-density phones.
    const maxDpr = this.isSmallScreen ? 1 : 1.25;
    this.dpr = Math.min(devicePixelRatio || 1, maxDpr);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setPointer(x, y) {
    this.pointer.x = clamp(x, -1, 1);
    this.pointer.y = clamp(y, -1, 1);
  }

  setShake(value) {
    this.shake = clamp(value, 0, 1);
  }

  setTheme(category) {
    const colors = {
      IDLE: [117, 232, 42],
      COMMON: [102, 244, 208],
      SNARKY: [255, 214, 64],
      SAVAGE: [255, 92, 20],
      RARE_TRUTH: [184, 218, 255],
      FATAL: [255, 18, 18],
    };
    const [r, g, b] = colors[category] || colors.IDLE;
    this.theme = { r, g, b };
  }

  handleVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      return;
    }
    this.lastPaint = performance.now();
    if (!this.frameRequest) this.frameRequest = requestAnimationFrame(this.animate);
  }

  drawParticles(elapsed) {
    const { context: ctx, width, height } = this;
    const parallaxX = this.pointer.x * Math.min(24, width * 0.025);
    const parallaxY = this.pointer.y * Math.min(16, height * 0.02);
    const shakeX = this.shake ? (Math.random() - 0.5) * 6 * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * 5 * this.shake : 0;

    ctx.fillStyle = `rgb(${this.theme.r} ${this.theme.g} ${this.theme.b})`;
    for (const particle of this.particles) {
      particle.y -= particle.speed * elapsed;
      if (particle.y < -0.03) {
        particle.y = 1.03;
        particle.x = Math.random();
      }

      const drift = Math.sin(elapsed * 0.00018 + particle.phase) * 7 * particle.depth;
      const x = particle.x * width + drift + parallaxX * particle.depth + shakeX;
      const y = particle.y * height + parallaxY * particle.depth + shakeY;
      ctx.globalAlpha = particle.opacity * (0.55 + particle.depth * 0.45);
      ctx.beginPath();
      ctx.arc(x, y, particle.radius * particle.depth, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFarOrbits(elapsed) {
    if (this.reducedMotion) return;
    const { context: ctx, width, height } = this;
    const cx = width * 0.5 + this.pointer.x * 12;
    const cy = height * 0.52 - this.pointer.y * 8;
    const base = Math.min(width, height);
    const pulse = 1 + Math.sin(elapsed * 0.00032) * 0.018;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(elapsed * 0.000018);
    ctx.strokeStyle = `rgba(${this.theme.r}, ${this.theme.g}, ${this.theme.b}, 0.075)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, base * 0.39 * pulse, base * 0.105, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(Math.PI * 0.49);
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.ellipse(0, 0, base * 0.34, base * 0.085, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  animate = now => {
    if (!this.ready || document.hidden) {
      this.frameRequest = 0;
      return;
    }

    this.frameRequest = requestAnimationFrame(this.animate);

    // 30 FPS is enough for distant ambient particles. While shaking, switch
    // to 60 FPS so the background still reacts immediately to the player.
    const targetInterval = this.shake > 0.04 ? 1000 / 60 : 1000 / 30;
    if (now - this.lastPaint < targetInterval) return;

    const elapsedDelta = Math.min(50, this.lastPaint ? now - this.lastPaint : 16.7);
    this.lastPaint = now;
    this.context.clearRect(0, 0, this.width, this.height);
    this.drawFarOrbits(now - this.startTime);
    this.drawParticles(elapsedDelta);
  };
}
