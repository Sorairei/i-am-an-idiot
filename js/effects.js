import { ENABLE_FATAL_REDIRECT, FATAL_COUNTDOWN_SECONDS, FATAL_REDIRECT_URL } from "./config.js";

export class EffectsController {
  constructor({ layer, fatalScreen, fatalMessage, fatalCountdown, fatalEscape }) {
    this.layer = layer;
    this.fatalScreen = fatalScreen;
    this.fatalMessage = fatalMessage;
    this.fatalCountdown = fatalCountdown;
    this.fatalEscape = fatalEscape;
    this.fatalCancelled = false;
    this.fatalTimer = null;
    this.fatalResolve = null;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  clear() {
    this.layer.replaceChildren();
    document.body.classList.remove("screen-impact", "screen-shake");
  }

  burst(category) {
    this.clear();
    const count = this.reducedMotion ? 8 : ({ COMMON: 18, SNARKY: 24, SAVAGE: 38, RARE_TRUTH: 26, FATAL: 45 }[category] || 18);
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("i");
      particle.className = "fx-particle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 300;
      particle.style.setProperty("--x", `${45 + Math.random() * 10}%`);
      particle.style.setProperty("--y", `${44 + Math.random() * 12}%`);
      particle.style.setProperty("--size", `${2 + Math.random() * 7}px`);
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--duration", `${.55 + Math.random() * .85}s`);
      this.layer.append(particle);
    }

    const ring = document.createElement("i");
    ring.className = "fx-ring";
    this.layer.append(ring);

    if (category === "SNARKY" || category === "SAVAGE" || category === "FATAL") {
      const sparks = this.reducedMotion ? 5 : category === "FATAL" ? 32 : 18;
      for (let i = 0; i < sparks; i += 1) {
        const spark = document.createElement("i");
        spark.className = "fx-spark";
        spark.style.setProperty("--angle", `${Math.random() * 360}deg`);
        spark.style.setProperty("--length", `${50 + Math.random() * 120}px`);
        this.layer.append(spark);
      }
    }

    const impactClass = category === "SAVAGE" || category === "FATAL" ? "screen-shake" : "screen-impact";
    document.body.classList.add(impactClass);
    setTimeout(() => document.body.classList.remove(impactClass), 650);
    setTimeout(() => this.layer.replaceChildren(), 1700);
  }

  async fatalSequence(message) {
    this.fatalCancelled = false;
    this.fatalMessage.textContent = message;
    this.fatalScreen.classList.add("is-active");
    this.fatalScreen.setAttribute("aria-hidden", "false");
    this.fatalEscape.focus({ preventScroll: true });

    const cancel = () => this.cancelFatal();
    this.fatalEscape.addEventListener("click", cancel, { once: true });
    const escapeKey = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelFatal();
      }
    };
    addEventListener("keydown", escapeKey);

    let remaining = FATAL_COUNTDOWN_SECONDS;
    this.fatalCountdown.textContent = `Relocating in ${remaining}...`;
    await new Promise(resolve => {
      this.fatalResolve = resolve;
      this.fatalTimer = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          this.fatalCountdown.textContent = `Relocating in ${remaining}...`;
        } else {
          clearInterval(this.fatalTimer);
          this.fatalTimer = null;
          this.fatalResolve = null;
          resolve();
        }
      }, 1000);
    });
    removeEventListener("keydown", escapeKey);

    if (!this.fatalCancelled && ENABLE_FATAL_REDIRECT) {
      window.location.assign(FATAL_REDIRECT_URL);
      return { redirected: true, cancelled: false };
    }
    if (!this.fatalCancelled) {
      this.fatalCountdown.textContent = "Redirect disabled in config.js.";
      await new Promise(resolve => setTimeout(resolve, 1400));
      this.hideFatal();
    }
    return { redirected: false, cancelled: this.fatalCancelled };
  }

  cancelFatal() {
    this.fatalCancelled = true;
    if (this.fatalTimer) clearInterval(this.fatalTimer);
    this.fatalTimer = null;
    if (this.fatalResolve) {
      const resolve = this.fatalResolve;
      this.fatalResolve = null;
      resolve();
    }
    this.fatalCountdown.textContent = "Escape successful. The frog is disappointed.";
    setTimeout(() => this.hideFatal(), 900);
  }

  hideFatal() {
    this.fatalScreen.classList.remove("is-active");
    this.fatalScreen.setAttribute("aria-hidden", "true");
  }
}
