import { loadThree } from "./threeLoader.js";

export class SceneController {
  constructor(canvas) {
    this.canvas = canvas;
    this.ready = false;
    this.shake = 0;
    this.theme = { r: 0.42, g: 1, b: 0.17 };
    this.pointer = { x: 0, y: 0 };
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async init() {
    try {
      const THREE = await loadThree();
      this.THREE = THREE;
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x020805, 0.052);
      this.camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 100);
      this.camera.position.set(0, 0, 12);

      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      this.renderer.setSize(innerWidth, innerHeight, false);

      const geometry = new THREE.BufferGeometry();
      const count = this.reducedMotion ? 260 : (innerWidth < 700 ? 520 : 950);
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - .5) * 32;
        positions[i3 + 1] = (Math.random() - .5) * 22;
        positions[i3 + 2] = -3 - Math.random() * 28;
        sizes[i] = Math.random();
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      this.particleMaterial = new THREE.PointsMaterial({ color: 0x75e82a, size: .055, transparent: true, opacity: .58, depthWrite: false, blending: THREE.AdditiveBlending });
      this.particles = new THREE.Points(geometry, this.particleMaterial);
      this.scene.add(this.particles);

      this.rings = new THREE.Group();
      for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(3.7 + i * 1.65, .012 + i * .004, 6, 120),
          new THREE.MeshBasicMaterial({ color: 0x5bd426, transparent: true, opacity: .08 - i * .015, blending: THREE.AdditiveBlending })
        );
        ring.position.z = -5 - i * 3;
        ring.rotation.x = 1.2 + i * .3;
        ring.rotation.y = i * .7;
        this.rings.add(ring);
      }
      this.scene.add(this.rings);
      this.ready = true;
      this.clock = new THREE.Clock();
      addEventListener("resize", () => this.resize(), { passive: true });
      this.animate();
      return true;
    } catch (error) {
      console.warn("Three.js background unavailable. The core experience will continue.", error);
      this.canvas.hidden = true;
      return false;
    }
  }

  setPointer(x, y) { this.pointer.x = x; this.pointer.y = y; }
  setShake(value) { this.shake = Math.max(0, Math.min(1, value)); }

  setTheme(category) {
    const colors = {
      IDLE: [0.42, 1, 0.17], COMMON: [0.40, .96, .82], SNARKY: [1, .84, .25],
      SAVAGE: [1, .36, .08], RARE_TRUTH: [.7, .84, 1], FATAL: [1, .03, .03],
    };
    const [r, g, b] = colors[category] || colors.IDLE;
    this.theme = { r, g, b };
    if (this.particleMaterial) this.particleMaterial.color.setRGB(r, g, b);
    this.rings?.children.forEach(ring => ring.material.color.setRGB(r, g, b));
  }

  resize() {
    if (!this.ready) return;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight, false);
  }

  animate = () => {
    if (!this.ready) return;
    requestAnimationFrame(this.animate);
    if (document.hidden) return;
    const elapsed = this.clock.getElapsedTime();
    const motionScale = this.reducedMotion ? .12 : 1;
    this.particles.rotation.y = elapsed * .012 * motionScale + this.pointer.x * .04;
    this.particles.rotation.x = Math.sin(elapsed * .11) * .025 + this.pointer.y * .025;
    this.particles.position.z = Math.sin(elapsed * .3) * .2;
    this.rings.rotation.z = elapsed * .025 * motionScale;
    this.rings.rotation.y = elapsed * .013 * motionScale;
    this.camera.position.x += ((this.pointer.x * .32 + (Math.random() - .5) * this.shake * .12) - this.camera.position.x) * .045;
    this.camera.position.y += ((-this.pointer.y * .2 + (Math.random() - .5) * this.shake * .12) - this.camera.position.y) * .045;
    this.renderer.render(this.scene, this.camera);
  };
}
