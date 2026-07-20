import { SHAKE_THRESHOLD } from "./config.js";

export class InteractionController {
  constructor({ orb, stage, button, frog, audio, scene, onTrigger, onStatus }) {
    this.orb = orb;
    this.stage = stage;
    this.button = button;
    this.frog = frog;
    this.audio = audio;
    this.scene = scene;
    this.onTrigger = onTrigger;
    this.onStatus = onStatus;
    this.energy = 0;
    this.dragging = false;
    this.locked = false;
    this.lastPoint = null;
    this.origin = null;
    this.lastMoveTime = 0;
    this.lastHorizontalDirection = 0;
    this.reversals = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.hoverFrame = 0;
    this.dragFrame = 0;
    this.pendingHover = null;
    this.pendingDrag = null;
    this.bind();
  }

  bind() {
    this.orb.addEventListener("pointerdown", this.pointerDown);
    this.orb.addEventListener("pointermove", this.pointerMove);
    this.orb.addEventListener("pointerup", this.pointerUp);
    this.orb.addEventListener("pointercancel", this.pointerUp);
    this.orb.addEventListener("lostpointercapture", this.pointerUp);
    this.button.addEventListener("click", () => this.buttonShake());
    this.orb.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.buttonShake();
      }
    });

    // High-polling-rate mice can produce hundreds of events per second. Keep
    // the latest position and update visual CSS only once per rendered frame.
    addEventListener("pointermove", event => {
      this.pendingHover = {
        x: (event.clientX / innerWidth) * 2 - 1,
        y: (event.clientY / innerHeight) * 2 - 1,
      };
      if (!this.hoverFrame) this.hoverFrame = requestAnimationFrame(this.flushHover);
    }, { passive: true });
  }

  flushHover = () => {
    this.hoverFrame = 0;
    if (!this.pendingHover) return;
    const { x, y } = this.pendingHover;
    this.pendingHover = null;
    this.scene.setPointer(x, y);
    if (!this.dragging && !this.locked) this.frog.setPointerTilt(x, y);
  };

  pointerDown = event => {
    if (this.locked || !this.frog.ready) return;
    event.preventDefault();

    // Do not block the first frame while the browser creates/resumes its audio
    // context. The frog must react instantly even on slower mobile devices.
    this.audio.ensureStarted().catch(() => {});

    this.dragging = true;
    this.lastPoint = { x: event.clientX, y: event.clientY };
    this.origin = { ...this.lastPoint };
    this.lastVisualX = event.clientX;
    this.lastVisualY = event.clientY;
    this.lastMoveTime = performance.now();
    this.lastHorizontalDirection = 0;
    this.reversals = 0;
    this.orb.classList.add("is-dragging");
    this.orb.setPointerCapture?.(event.pointerId);
    this.onStatus("Shake left and right. Make the frog question your choices.");
  };

  pointerMove = event => {
    if (!this.dragging || this.locked || !this.lastPoint) return;
    event.preventDefault();

    const samples = event.getCoalescedEvents?.() || [event];
    for (const sample of samples) this.scoreMovement(sample);

    this.pendingDrag = {
      totalDx: event.clientX - this.origin.x,
      totalDy: event.clientY - this.origin.y,
      ratio: this.energy / SHAKE_THRESHOLD,
      dx: event.clientX - this.lastVisualX,
      dy: event.clientY - this.lastVisualY,
    };
    this.lastVisualX = event.clientX;
    this.lastVisualY = event.clientY;
    if (!this.dragFrame) this.dragFrame = requestAnimationFrame(this.flushDragVisual);
  };

  scoreMovement(sample) {
    const now = performance.now();
    const dx = sample.clientX - this.lastPoint.x;
    const dy = sample.clientY - this.lastPoint.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.25) return;

    const elapsed = Math.max(4, now - this.lastMoveTime);
    const velocity = Math.min(5.5, distance / elapsed);
    const horizontalDirection = Math.abs(dx) > 2 ? Math.sign(dx) : 0;

    if (horizontalDirection && this.lastHorizontalDirection && horizontalDirection !== this.lastHorizontalDirection) {
      this.reversals += 1;
    }
    if (horizontalDirection) this.lastHorizontalDirection = horizontalDirection;

    const horizontalRatio = Math.abs(dx) / Math.max(1, Math.abs(dx) + Math.abs(dy));
    const directionQuality = 0.48 + horizontalRatio * 0.94;
    const reversalBonus = Math.min(1.9, 1 + this.reversals * 0.08);
    const movementScore = distance * (0.38 + velocity * 0.86) * directionQuality * reversalBonus;

    this.energy = Math.min(SHAKE_THRESHOLD * 1.16, this.energy + movementScore);
    this.audio.rattle(this.energy / SHAKE_THRESHOLD);
    this.lastPoint = { x: sample.clientX, y: sample.clientY };
    this.lastMoveTime = now;
  }

  flushDragVisual = () => {
    this.dragFrame = 0;
    if (!this.pendingDrag || !this.dragging) return;
    const { totalDx, totalDy, ratio, dx, dy } = this.pendingDrag;
    this.pendingDrag = null;
    this.frog.setEnergy(ratio);
    this.frog.setDrag(totalDx, totalDy, ratio, dx, dy);
    this.scene.setShake(ratio);
  };

  pointerUp = async event => {
    if (!this.dragging) return;
    this.dragging = false;
    this.orb.classList.remove("is-dragging");
    cancelAnimationFrame(this.dragFrame);
    this.dragFrame = 0;
    this.pendingDrag = null;

    try {
      if (this.orb.hasPointerCapture?.(event.pointerId)) this.orb.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released by the browser.
    }

    this.frog.setEnergy(this.energy / SHAKE_THRESHOLD);
    this.frog.releaseDrag();
    this.scene.setShake(0);

    if (this.energy >= SHAKE_THRESHOLD) {
      await this.trigger();
    } else {
      this.frog.deny();
      this.audio.croak();
      const percent = Math.round(this.energy / SHAKE_THRESHOLD * 100);
      const directionHint = this.reversals < 2 ? " Reverse direction several times." : " Shake faster.";
      this.onStatus(`Only ${percent}% energy.${directionHint}`);
      this.energy *= 0.3;
      this.frog.setEnergy(this.energy / SHAKE_THRESHOLD);
    }
  };

  async buttonShake() {
    if (this.locked || !this.frog.ready) return;
    this.audio.ensureStarted().catch(() => {});
    this.locked = true;
    this.onStatus("Invisible hands are shaking the frog oracle...");
    const duration = this.reducedMotion ? 300 : 700;
    const start = performance.now();

    await new Promise(resolve => {
      const tick = now => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 2);
        this.energy = SHAKE_THRESHOLD * eased;
        this.frog.setEnergy(eased);
        this.frog.setDrag(
          Math.sin(now * 0.075) * 105 * (1 - progress * 0.42),
          Math.cos(now * 0.11) * 28,
          eased,
        );
        this.scene.setShake(eased);
        this.audio.rattle(eased);
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    this.frog.releaseDrag();
    this.scene.setShake(0);
    this.locked = false;
    await this.trigger();
  }

  async trigger() {
    if (this.locked) return;
    this.locked = true;
    await this.onTrigger();
  }

  reset() {
    this.energy = 0;
    this.dragging = false;
    this.locked = false;
    this.lastPoint = null;
    this.origin = null;
    this.lastVisualX = 0;
    this.lastVisualY = 0;
    this.lastHorizontalDirection = 0;
    this.reversals = 0;
    this.pendingDrag = null;
    cancelAnimationFrame(this.dragFrame);
    this.dragFrame = 0;
    this.orb.classList.remove("is-dragging");
    this.scene.setShake(0);
    this.frog.setEnergy(0);
  }
}
