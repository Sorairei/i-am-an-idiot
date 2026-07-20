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
  }

  async init() {
    if (!this.model) throw new Error("The CSS 3D frog model is missing from index.html.");

    this.ready = true;
    this.orb.classList.remove("is-loading");
    this.orb.classList.add("is-ready");
    this.model.style.visibility = "visible";
    this.animate();
    return true;
  }

  setPointerTilt(normalX, normalY) {
    this.pointer.x = clamp(normalX, -1, 1);
    this.pointer.y = clamp(normalY, -1, 1);
    this.model.style.setProperty("--eye-x", `${(this.pointer.x * 10).toFixed(2)}px`);
    this.model.style.setProperty("--eye-y", `${(-this.pointer.y * 8).toFixed(2)}px`);
    this.model.style.setProperty("--shine-x", `${(this.pointer.x * 4).toFixed(2)}px`);
    this.model.style.setProperty("--shine-y", `${(-this.pointer.y * 3).toFixed(2)}px`);

    if (this.revealed || this.shaking) return;
    this.target.rx = -this.pointer.y * 0.17;
    this.target.ry = this.pointer.x * 0.23;
    this.target.rz = -this.pointer.x * 0.035;
  }

  setDrag(totalDx, totalDy, intensity, deltaX = totalDx, deltaY = totalDy) {
    if (this.revealed) return;
    this.energy = clamp(intensity, 0, 1.2);
    this.target.x = clamp(totalDx * 0.34, -86, 86);
    this.target.y = clamp(totalDy * 0.22, -52, 52);
    this.target.ry += deltaX * 0.015;
    this.target.rx -= deltaY * 0.011;
    this.target.rz = clamp(deltaX * -0.0042, -0.24, 0.24);
    this.setShaking(intensity > 0.055, intensity);
  }

  releaseDrag() {
    this.target.x = 0;
    this.target.y = 0;
    this.target.rz = 0;
    if (!this.revealed) {
      const nearestTurn = Math.round(this.current.ry / (Math.PI * 2)) * Math.PI * 2;
      this.target.rx = 0;
      this.target.ry = nearestTurn;
    }
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
    this.energyFill.style.width = `${percent}%`;
    this.energyValue.textContent = `${percent}%`;
    this.model.style.setProperty("--energy", normalized.toFixed(3));
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
    this.target.rz = -0.13;
    setTimeout(() => { this.target.rz = 0.13; }, 110);
    setTimeout(() => {
      this.target.rz = 0;
      this.stage.classList.remove("denied");
    }, 420);
  }

  reveal(answer) {
    this.revealed = true;
    this.setShaking(false, 0);
    this.setTheme(answer.category);
    this.orb.classList.add("is-settling");
    this.answerCategory.textContent = CATEGORY_LABELS[answer.category];
    this.answerText.textContent = answer.text;
    this.answerText.classList.toggle("is-long", answer.text.length > 96);
    this.answerText.classList.toggle("is-very-long", answer.text.length > 145);

    const fullTurn = Math.round(this.current.ry / (Math.PI * 2)) * Math.PI * 2;
    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.rz = 0;
    this.target.ry = fullTurn + Math.PI;

    setTimeout(() => {
      this.orb.classList.remove("is-settling");
      this.orb.classList.add("is-revealed");
      this.answerOverlay.setAttribute("aria-hidden", "false");
    }, this.reducedMotion ? 80 : 720);
  }

  reset() {
    this.revealed = false;
    this.setTheme("IDLE");
    this.orb.classList.remove("is-revealed", "is-settling", "is-shaking", "is-dragging");
    this.answerOverlay.setAttribute("aria-hidden", "true");
    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.rz = 0;
    this.target.ry = Math.ceil(this.current.ry / (Math.PI * 2)) * Math.PI * 2;
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
    const ease = this.shaking ? 0.3 : (this.revealed ? 0.095 : 0.075);
    this.current.rx = lerp(this.current.rx, this.target.rx, ease);
    this.current.ry = lerp(this.current.ry, this.target.ry, ease);
    this.current.rz = lerp(this.current.rz, this.target.rz, ease);
    this.current.x = lerp(this.current.x, this.target.x, ease);
    this.current.y = lerp(this.current.y, this.target.y, ease);

    const motionScale = this.reducedMotion ? 0.08 : 1;
    const idleBob = !this.shaking ? Math.sin(elapsed * 1.55) * 7 * motionScale : 0;
    const breathing = 1 + Math.sin(elapsed * 1.2) * 0.009 * motionScale;
    const jitter = this.shaking ? this.shakeIntensity : 0;
    const jitterX = (Math.random() - 0.5) * 8 * jitter;
    const jitterY = (Math.random() - 0.5) * 7 * jitter;
    const jitterRot = (Math.random() - 0.5) * 0.055 * jitter;

    const rx = this.current.rx + jitterRot;
    const ry = this.current.ry + jitterRot * 1.4;
    const rz = this.current.rz - jitterRot;
    const x = this.current.x + jitterX;
    const y = this.current.y + idleBob + jitterY;
    const scale = breathing + jitter * 0.007;

    this.model.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateX(${rx.toFixed(5)}rad) rotateY(${ry.toFixed(5)}rad) rotateZ(${rz.toFixed(5)}rad) scale(${scale.toFixed(5)})`;

    const shadowPulse = 1 - Math.abs(idleBob) * 0.012;
    this.shadow.style.transform = `scaleX(${shadowPulse.toFixed(3)})`;
    this.shadow.style.opacity = String(0.68 - Math.abs(idleBob) * 0.018);
  };
}
