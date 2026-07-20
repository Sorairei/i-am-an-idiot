/**
 * Optional in-browser benchmark overlay.
 * Activate with ?perf=1. The module is dynamically imported, so normal users
 * download and execute none of this code.
 */
export class PerformanceMonitor {
  constructor() {
    this.frames = [];
    this.pointerLatencies = [];
    this.longTasks = [];
    this.lastFrame = performance.now();
    this.started = this.lastFrame;
    this.frameRequest = 0;
    this.updateTimer = 0;
    this.onPointerMove = this.handlePointerMove.bind(this);
  }

  start() {
    this.panel = document.createElement("aside");
    this.panel.className = "performance-panel";
    this.panel.setAttribute("aria-label", "Performance diagnostics");
    this.panel.innerHTML = `
      <strong>PERFORMANCE</strong>
      <span data-metric="fps">FPS: measuring…</span>
      <span data-metric="frame">FRAME: measuring…</span>
      <span data-metric="input">INPUT: measuring…</span>
      <span data-metric="tasks">LONG TASKS: 0</span>
      <span data-metric="memory">HEAP: unavailable</span>
      <span data-metric="dom">DOM: ${document.getElementsByTagName("*").length} nodes</span>
      <button type="button">CLOSE</button>`;
    document.body.append(this.panel);
    this.panel.querySelector("button").addEventListener("click", () => this.stop());

    addEventListener("pointermove", this.onPointerMove, { passive: true, capture: true });
    if ("PerformanceObserver" in window) {
      try {
        this.observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) this.longTasks.push(entry.duration);
        });
        this.observer.observe({ entryTypes: ["longtask"] });
      } catch {
        // Long Tasks API is not available in every browser.
      }
    }

    this.frameRequest = requestAnimationFrame(this.tick);
    this.updateTimer = setInterval(() => this.update(), 1000);
    this.update();
  }

  handlePointerMove() {
    const start = performance.now();
    requestAnimationFrame(() => {
      this.pointerLatencies.push(performance.now() - start);
      if (this.pointerLatencies.length > 120) this.pointerLatencies.shift();
    });
  }

  tick = now => {
    this.frames.push(now - this.lastFrame);
    if (this.frames.length > 180) this.frames.shift();
    this.lastFrame = now;
    this.frameRequest = requestAnimationFrame(this.tick);
  };

  percentile(values, ratio) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
  }

  setMetric(name, value) {
    const element = this.panel?.querySelector(`[data-metric="${name}"]`);
    if (element) element.textContent = value;
  }

  update() {
    if (!this.panel) return;
    const averageFrame = this.frames.length
      ? this.frames.reduce((sum, value) => sum + value, 0) / this.frames.length
      : 0;
    const fps = averageFrame ? 1000 / averageFrame : 0;
    const p95Frame = this.percentile(this.frames, 0.95);
    const inputMedian = this.percentile(this.pointerLatencies, 0.5);
    const longTotal = this.longTasks.reduce((sum, value) => sum + value, 0);

    this.setMetric("fps", `FPS: ${fps.toFixed(1)}`);
    this.setMetric("frame", `FRAME P95: ${p95Frame.toFixed(1)} ms`);
    this.setMetric("input", `INPUT→FRAME: ${inputMedian.toFixed(1)} ms`);
    this.setMetric("tasks", `LONG TASKS: ${this.longTasks.length} / ${Math.round(longTotal)} ms`);
    this.setMetric("dom", `DOM: ${document.getElementsByTagName("*").length} nodes`);

    if (performance.memory?.usedJSHeapSize) {
      this.setMetric("memory", `HEAP: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`);
    }
  }

  stop() {
    cancelAnimationFrame(this.frameRequest);
    clearInterval(this.updateTimer);
    removeEventListener("pointermove", this.onPointerMove, { capture: true });
    this.observer?.disconnect();
    this.panel?.remove();
    this.panel = null;
  }
}

export function startPerformanceMonitor() {
  const monitor = new PerformanceMonitor();
  monitor.start();
  return monitor;
}
