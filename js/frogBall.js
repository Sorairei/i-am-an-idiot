import { CATEGORY_LABELS } from "./answers.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (current, target, amount) => current + (target - current) * amount;

export class FrogBall {
  constructor({ orb, stage, shadow, energyFill, energyValue, answerOverlay, answerText, answerCategory }) {
    this.orb = orb;
    this.stage = stage;
    this.shadow = shadow;
    this.energyFill = energyFill;
    this.energyValue = energyValue;
    this.answerOverlay = answerOverlay;
    this.answerText = answerText;
    this.answerCategory = answerCategory;
    this.model = orb.querySelector("#frog-model");
    this.volume = orb.querySelector("#sphere-volume");

    this.ready = false;
    this.revealed = false;
    this.shaking = false;
    this.shakeIntensity = 0;
    this.energy = 0;
    this.pointer = { x: 0, y: 0 };
    this.current = { rx: 0, ry: 0, rz: 0, x: 0, y: 0 };
    this.target = { rx: 0, ry: 0, rz: 0, x: 0, y: 0 };
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.startTime = performance.now();
    this.resizeFrame = 0;
    this.lastEnergyPercent = -1;
    this.lastTransform = "";
    this.lastShadowTransform = "";
    this.lastShadowOpacity = "";
  }

  async init() {
    if (!this.model || !this.volume) {
      throw new Error("The spherical frog model is missing from index.html.");
    }

    this.buildSphereVolume();
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.buildSphereVolume());
      });
      this.resizeObserver.observe(this.model);
    } else {
      addEventListener("resize", () => this.buildSphereVolume(), { passive: true });
    }

    this.ready = true;
    this.orb.classList.remove("is-loading");
    this.orb.classList.add("is-ready");
    this.model.style.visibility = "visible";
    this.animate();
    return true;
  }

  buildSphereVolume() {
    const size = this.model.clientWidth;
    if (!size) return;

    const radius = size * 0.485;
    const depth = radius * 0.52;
    const sliceCount = matchMedia("(max-width: 600px)").matches ? 8 : 11;
    const fragment = document.createDocumentFragment();

    this.volume.replaceChildren();
    this.model.style.setProperty("--sphere-face-z", `${(depth + 2).toFixed(1)}px`);
    this.model.style.setProperty("--sphere-depth", `${depth.toFixed(1)}px`);

    for (let index = 0; index < sliceCount; index += 1) {
      const normalized = -0.92 + (index / (sliceCount - 1)) * 1.84;
      const scale = Math.sqrt(Math.max(0.06, 1 - normalized * normalized));
      const slice = document.createElement("span");
      slice.className = "sphere-slice";
      slice.style.setProperty("--slice-scale", scale.toFixed(4));
      slice.style.setProperty("--slice-z", `${(normalized * depth).toFixed(1)}px`);
      slice.style.setProperty("--slice-opacity", (0.5 + scale * 0.44).toFixed(3));
      fragment.append(slice);
    }

    this.volume.append(fragment);
  }

  setPointerTilt(normalX, normalY) {
    const nextX = clamp(normalX, -1, 1);
    const nextY = clamp(normalY, -1, 1);
    if (Math.abs(nextX - this.pointer.x) < 0.002 && Math.abs(nextY - this.pointer.y) < 0.002) return;

    this.pointer.x = nextX;
    this.pointer.y = nextY;
    this.model.style.setProperty("--eye-x", `${(nextX * 10).toFixed(2)}px`);
    this.model.style.setProperty("--eye-y", `${(-nextY * 8).toFixed(2)}px`);
    this.model.style.setProperty("--shine-x", `${(nextX * 4).toFixed(2)}px`);
    this.model.style.setProperty("--shine-y", `${(-nextY * 3).toFixed(2)}px`);

    if (this.revealed || this.shaking) return;
    this.target.rx = -nextY * 0.12;
    this.target.ry = nextX * 0.16;
    this.target.rz = -nextX * 0.025;
  }

  setDrag(totalDx, totalDy, intensity, deltaX = totalDx, deltaY = totalDy) {
    if (this.revealed) return;
    this.energy = clamp(intensity, 0, 1.2);
    this.target.x = clamp(totalDx * 0.28, -78, 78);
    this.target.y = clamp(totalDy * 0.18, -42, 42);

    // Keep the outer object spherical. The face no longer turns edge-on like a flat disc.
    this.target.ry = clamp(totalDx * 0.0023 + deltaX * 0.007, -0.42, 0.42);
    this.target.rx = clamp(-totalDy * 0.0021 - deltaY * 0.004, -0.28, 0.28);
    this.target.rz = clamp(deltaX * -0.0036, -0.19, 0.19);
    this.setShaking(intensity > 0.055, intensity);
  }

  releaseDrag() {
    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.ry = 0;
    this.target.rz = 0;
    this.setShaking(false, 0);
  }

  setShaking(value, intensity = this.shakeIntensity) {
    this.shaking = value;
    this.shakeIntensity = value ? clamp(intensity, 0.08, 1.2) : 0;
    this.orb.classList.toggle("is-shaking", value);
    this.orb.classList.toggle("is-dragging", value);
  }

  setEnergy(ratio) {
    const normalized = clamp(ratio, 0, 1);
    const percent = Math.round(normalized * 100);
    this.energy = normalized;
    if (percent === this.lastEnergyPercent) return;

    this.lastEnergyPercent = percent;
    this.energyFill.style.transform = `scaleX(${(percent / 100).toFixed(2)})`;
    this.energyValue.textContent = `${percent}%`;
    this.model.style.setProperty("--energy", normalized.toFixed(2));
  }

  setTheme(category) {
    const colors = {
      IDLE: "#aaff2c",
      COMMON: "#66f4d0",
      SNARKY: "#ffd84f",
      SAVAGE: "#ff7a21",
      RARE_TRUTH: "#d7e9ff",
      FATAL: "#ff2525",
    };
    this.model.style.setProperty("--frog-theme", colors[category] || colors.IDLE);
  }

  deny() {
    this.stage.classList.remove("denied");
    void this.stage.offsetWidth;
    this.stage.classList.add("denied");
    this.target.rz = -0.11;
    setTimeout(() => { this.target.rz = 0.11; }, 95);
    setTimeout(() => {
      this.target.rz = 0;
      this.stage.classList.remove("denied");
    }, 330);
  }

  reveal(answer) {
    this.revealed = true;
    this.setShaking(false, 0);
    this.setTheme(answer.category);
    this.orb.classList.add("is-settling", "is-turning");
    this.answerCategory.textContent = CATEGORY_LABELS[answer.category];
    this.answerText.textContent = answer.text;
    this.answerText.classList.toggle("is-long", answer.text.length > 96);
    this.answerText.classList.toggle("is-very-long", answer.text.length > 145);

    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.ry = 0;
    this.target.rz = 0;

    setTimeout(() => {
      this.orb.classList.remove("is-settling");
      this.orb.classList.add("is-revealed");
      this.answerOverlay.setAttribute("aria-hidden", "false");
    }, this.reducedMotion ? 50 : 430);
  }

  reset() {
    this.revealed = false;
    this.setTheme("IDLE");
    this.orb.classList.remove("is-revealed", "is-turning", "is-settling", "is-shaking", "is-dragging");
    this.answerOverlay.setAttribute("aria-hidden", "true");
    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.rz = 0;
    this.target.ry = 0;
    this.lastEnergyPercent = -1;
    this.setEnergy(0);
    this.answerCategory.textContent = "THE FROG SAYS";
    this.answerText.textContent = "Shake to reveal your verdict.";
    this.answerText.classList.remove("is-long", "is-very-long");
  }

  animate = now => {
    if (!this.ready) return;
    requestAnimationFrame(this.animate);
    if (document.hidden) return;

    const elapsed = (now - this.startTime) / 1000;
    const ease = this.shaking ? 0.31 : (this.revealed ? 0.11 : 0.085);
    this.current.rx = lerp(this.current.rx, this.target.rx, ease);
    this.current.ry = lerp(this.current.ry, this.target.ry, ease);
    this.current.rz = lerp(this.current.rz, this.target.rz, ease);
    this.current.x = lerp(this.current.x, this.target.x, ease);
    this.current.y = lerp(this.current.y, this.target.y, ease);

    const motionScale = this.reducedMotion ? 0.08 : 1;
    const idleBob = !this.shaking ? Math.sin(elapsed * 1.55) * 7 * motionScale : 0;
    const breathing = 1 + Math.sin(elapsed * 1.2) * 0.009 * motionScale;
    const jitter = this.shaking ? this.shakeIntensity : 0;
    let jitterX = 0;
    let jitterY = 0;
    let jitterRot = 0;
    if (jitter > 0) {
      jitterX = (Math.random() - 0.5) * 8 * jitter;
      jitterY = (Math.random() - 0.5) * 7 * jitter;
      jitterRot = (Math.random() - 0.5) * 0.042 * jitter;
    }

    const rx = clamp(this.current.rx + jitterRot, -0.34, 0.34);
    const ry = clamp(this.current.ry + jitterRot * 1.15, -0.48, 0.48);
    const rz = this.current.rz - jitterRot;
    const x = this.current.x + jitterX;
    const y = this.current.y + idleBob + jitterY;
    const scale = breathing + jitter * 0.007;

    const transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(4)}rad) rotateY(${ry.toFixed(4)}rad) rotateZ(${rz.toFixed(4)}rad) scale(${scale.toFixed(4)})`;
    if (transform !== this.lastTransform) {
      this.model.style.transform = transform;
      this.lastTransform = transform;
    }

    const shadowPulse = `scaleX(${(1 - Math.abs(idleBob) * 0.012).toFixed(3)})`;
    const shadowOpacity = (0.68 - Math.abs(idleBob) * 0.018).toFixed(3);
    if (shadowPulse !== this.lastShadowTransform) {
      this.shadow.style.transform = shadowPulse;
      this.lastShadowTransform = shadowPulse;
    }
    if (shadowOpacity !== this.lastShadowOpacity) {
      this.shadow.style.opacity = shadowOpacity;
      this.lastShadowOpacity = shadowOpacity;
    }
  };
}
