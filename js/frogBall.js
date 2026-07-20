import * as THREE from "./vendor/three.module.min.js";
import { CATEGORY_LABELS } from "./answers.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (current, target, amount) => current + (target - current) * amount;
const TWO_PI = Math.PI * 2;

const THEME_COLORS = {
  IDLE: 0xaaff2c,
  COMMON: 0x66f4d0,
  SNARKY: 0xffd84f,
  SAVAGE: 0xff7a21,
  RARE_TRUTH: 0xd7e9ff,
  FATAL: 0xff2525,
};

/**
 * Real WebGL frog oracle built around one smooth THREE.SphereGeometry.
 *
 * The supplied BeeTales avatar is cleaned and composited into an
 * equirectangular CanvasTexture. The face therefore follows the curvature of
 * the same illuminated sphere instead of sitting on a plane, cylinder or coin.
 */
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
    this.canvas = orb.querySelector("#frog-canvas");

    this.ready = false;
    this.revealed = false;
    this.shaking = false;
    this.shakeIntensity = 0;
    this.energy = 0;
    this.pointer = { x: 0, y: 0 };
    this.current = { rx: 0, ry: 0, rz: 0, x: 0, y: 0 };
    this.target = { rx: 0, ry: 0, rz: 0, x: 0, y: 0 };
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.smallScreen = matchMedia("(max-width: 700px)").matches;
    this.startTime = performance.now();
    this.previousAnimationTime = performance.now();
    this.lastFrame = 0;
    this.lastEnergyPercent = -1;
    this.lastShadowTransform = "";
    this.lastShadowOpacity = "";
    this.resizeFrame = 0;

    // A full, slow Y-axis turn proves the object is spherical. It pauses while
    // the player shakes it and while the back answer window is being revealed.
    this.autoYaw = 0;
    this.autoSpinSpeed = this.reducedMotion ? 0 : 0.145;
  }

  async init() {
    if (!this.canvas) throw new Error("The frog WebGL canvas is missing from index.html.");

    this.createRenderer();
    this.createCameraAndScene();
    this.createLights();
    await this.createSphereModel();
    this.resize();

    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = requestAnimationFrame(() => this.resize());
      });
      this.resizeObserver.observe(this.orb);
    } else {
      addEventListener("resize", () => this.resize(), { passive: true });
    }

    this.ready = true;
    this.orb.classList.remove("is-loading");
    this.orb.classList.add("is-ready");
    this.animate(performance.now());
    return true;
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: this.smallScreen ? "low-power" : "high-performance",
      preserveDrawingBuffer: false,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
  }

  createCameraAndScene() {
    this.scene3d = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0, 3.55);
    this.camera.lookAt(0, 0, 0);

    this.frogGroup = new THREE.Group();
    this.frogGroup.rotation.order = "YXZ";
    this.scene3d.add(this.frogGroup);
  }

  createLights() {
    // Lighting is deliberately inexpensive: no realtime shadow map is needed
    // to show curvature. The standard material still receives real diffuse and
    // specular shading from every viewing angle.
    this.ambientLight = new THREE.AmbientLight(0xcfffb1, 1.28);
    this.scene3d.add(this.ambientLight);

    this.keyLight = new THREE.PointLight(0xffefbc, 34, 12, 2);
    this.keyLight.position.set(-2.45, 2.75, 4.25);
    this.scene3d.add(this.keyLight);

    this.fillLight = new THREE.PointLight(0x77ff9d, 13, 9, 2);
    this.fillLight.position.set(-2.1, -1.8, 2.2);
    this.scene3d.add(this.fillLight);

    this.rimLight = new THREE.PointLight(THEME_COLORS.IDLE, 25, 10, 2);
    this.rimLight.position.set(2.75, -0.25, 2.15);
    this.scene3d.add(this.rimLight);

    this.backLight = new THREE.PointLight(0x0aa84f, 12, 8, 2);
    this.backLight.position.set(0, 1.2, -3.2);
    this.scene3d.add(this.backLight);
  }

  async createSphereModel() {
    // 64 × 48 segments exceed the requested 32-segment minimum and keep the
    // silhouette smooth on large desktop displays and close side views.
    this.sphereGeometry = new THREE.SphereGeometry(1, 64, 48);

    const avatarUrl = new URL("../assets/images/beetales-avatar.webp", import.meta.url).href;
    const avatar = await this.loadImage(avatarUrl);
    this.sphereTexture = this.createSphereTexture(avatar);

    this.baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.sphereTexture,
      roughness: 0.36,
      metalness: 0.035,
      emissive: 0x082b14,
      emissiveIntensity: 0.2,
    });

    this.baseSphere = new THREE.Mesh(this.sphereGeometry, this.baseMaterial);
    this.baseSphere.renderOrder = 1;
    this.frogGroup.add(this.baseSphere);

    this.createAnswerWindow();
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load the frog texture: ${url}`));
      image.src = url;
    });
  }

  createSphereTexture(image) {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = this.smallScreen ? 1536 : 2048;
    textureCanvas.height = textureCanvas.width / 2;
    const ctx = textureCanvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("The browser could not create the frog texture canvas.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Equirectangular base texture. A broad horizontal gradient and baked
    // highlights complement the runtime lights without requiring extra meshes.
    const baseGradient = ctx.createLinearGradient(0, 0, textureCanvas.width, textureCanvas.height);
    baseGradient.addColorStop(0, "#0a6b39");
    baseGradient.addColorStop(0.18, "#4fbe18");
    baseGradient.addColorStop(0.34, "#8ee91c");
    baseGradient.addColorStop(0.52, "#60c716");
    baseGradient.addColorStop(0.78, "#1b8b27");
    baseGradient.addColorStop(1, "#07552f");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    const frontX = textureCanvas.width * 0.25;
    const glow = ctx.createRadialGradient(
      frontX - textureCanvas.width * 0.08,
      textureCanvas.height * 0.22,
      4,
      frontX,
      textureCanvas.height * 0.34,
      textureCanvas.width * 0.22,
    );
    glow.addColorStop(0, "rgba(255,255,190,.72)");
    glow.addColorStop(0.32, "rgba(215,255,90,.22)");
    glow.addColorStop(1, "rgba(215,255,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    const random = this.seededRandom(7371);
    for (let index = 0; index < 54; index += 1) {
      const x = random() * textureCanvas.width;
      const y = textureCanvas.height * (0.1 + random() * 0.8);
      const radius = textureCanvas.width * (0.0015 + random() * 0.0048);
      ctx.fillStyle = `rgba(3,66,29,${0.025 + random() * 0.055})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const cleanAvatar = this.cleanAvatarComponent(image);

    // Three.js SphereGeometry faces +Z at U ≈ 0.25. The avatar is centred at
    // that longitude and kept well away from V=0/V=1, so the face, helmet and
    // mouth are not stretched across the poles or UV seam.
    const drawWidth = Math.round(textureCanvas.width * 0.342);
    const drawHeight = Math.round(drawWidth * cleanAvatar.height / cleanAvatar.width);
    const drawX = Math.round(frontX - drawWidth / 2);
    const drawY = Math.round(textureCanvas.height * 0.5 - drawHeight / 2 - textureCanvas.height * 0.008);

    ctx.save();
    ctx.shadowColor = "rgba(0, 28, 13, .45)";
    ctx.shadowBlur = textureCanvas.width * 0.012;
    ctx.drawImage(cleanAvatar, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    ctx.drawImage(cleanAvatar, drawX, drawY, drawWidth, drawHeight);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    return texture;
  }

  cleanAvatarComponent(image) {
    // Crop around the connected mascot component, removing the isolated edge
    // pixels present in the supplied transparent reference image.
    const sourceX = Math.round(image.naturalWidth * 0.2265);
    const sourceY = Math.round(image.naturalHeight * 0.047);
    const sourceWidth = Math.round(image.naturalWidth * 0.547);
    const sourceHeight = Math.round(image.naturalHeight * 0.843);

    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("The browser could not prepare the supplied frog avatar.");
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

    const pixels = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
    const data = pixels.data;
    const total = sourceWidth * sourceHeight;
    const keep = new Uint8Array(total);
    const stack = new Int32Array(total);
    let stackSize = 0;

    const centerX = Math.floor(sourceWidth * 0.5);
    const centerY = Math.floor(sourceHeight * 0.54);
    let seed = centerY * sourceWidth + centerX;

    if (data[seed * 4 + 3] < 20) {
      outer: for (let radius = 1; radius < 70; radius += 1) {
        for (let y = Math.max(0, centerY - radius); y <= Math.min(sourceHeight - 1, centerY + radius); y += 1) {
          for (let x = Math.max(0, centerX - radius); x <= Math.min(sourceWidth - 1, centerX + radius); x += 1) {
            const index = y * sourceWidth + x;
            if (data[index * 4 + 3] >= 20) {
              seed = index;
              break outer;
            }
          }
        }
      }
    }

    keep[seed] = 1;
    stack[stackSize++] = seed;
    while (stackSize) {
      const index = stack[--stackSize];
      const x = index % sourceWidth;
      const neighbours = [index - 1, index + 1, index - sourceWidth, index + sourceWidth];
      for (const next of neighbours) {
        if (next < 0 || next >= total || keep[next]) continue;
        const nextX = next % sourceWidth;
        if (Math.abs(nextX - x) > 1) continue;
        if (data[next * 4 + 3] < 12) continue;
        keep[next] = 1;
        stack[stackSize++] = next;
      }
    }

    for (let index = 0; index < total; index += 1) {
      if (!keep[index]) data[index * 4 + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }

  createAnswerWindow() {
    this.answerGroup = new THREE.Group();
    // Sit just outside the rear surface. It becomes the front surface after the
    // parent sphere rotates by PI during a result reveal.
    this.answerGroup.position.z = -1.014;
    this.answerGroup.rotation.y = Math.PI;
    this.answerGroup.visible = false;

    const socketMaterial = new THREE.MeshStandardMaterial({
      color: 0x010706,
      roughness: 0.22,
      metalness: 0.16,
      emissive: 0x000000,
      side: THREE.FrontSide,
    });
    const socket = new THREE.Mesh(new THREE.CircleGeometry(0.57, 64), socketMaterial);
    socket.renderOrder = 4;
    this.answerGroup.add(socket);

    this.answerRimMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a4b27,
      roughness: 0.29,
      metalness: 0.16,
      emissive: THEME_COLORS.IDLE,
      emissiveIntensity: 0.18,
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.055, 18, 72), this.answerRimMaterial);
    rim.position.z = 0.025;
    rim.renderOrder = 5;
    this.answerGroup.add(rim);

    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 0.42);
    triangleShape.lineTo(-0.39, -0.31);
    triangleShape.lineTo(0.39, -0.31);
    triangleShape.closePath();

    this.triangleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e9c28,
      roughness: 0.4,
      metalness: 0.035,
      emissive: THEME_COLORS.IDLE,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const triangle = new THREE.Mesh(new THREE.ShapeGeometry(triangleShape), this.triangleMaterial);
    triangle.position.z = 0.04;
    triangle.renderOrder = 6;
    this.answerGroup.add(triangle);

    this.frogGroup.add(this.answerGroup);
  }

  seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const rect = this.orb.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * 1.12));
    const height = Math.max(1, Math.round(rect.height * 1.12));
    const maxDpr = this.smallScreen ? 1.15 : 1.5;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setPointerTilt(normalX, normalY) {
    const nextX = clamp(normalX, -1, 1);
    const nextY = clamp(normalY, -1, 1);
    if (Math.abs(nextX - this.pointer.x) < 0.002 && Math.abs(nextY - this.pointer.y) < 0.002) return;
    this.pointer.x = nextX;
    this.pointer.y = nextY;

    if (this.revealed || this.shaking) return;
    this.target.rx = -nextY * 0.12;
    this.target.ry = nextX * 0.16;
    this.target.rz = -nextX * 0.03;
  }

  setDrag(totalDx, totalDy, intensity, deltaX = totalDx, deltaY = totalDy) {
    if (this.revealed) return;
    this.energy = clamp(intensity, 0, 1.2);
    this.target.x = clamp(totalDx * 0.28, -78, 78);
    this.target.y = clamp(totalDy * 0.18, -42, 42);
    this.target.ry = clamp(totalDx * 0.0025 + deltaX * 0.008, -0.72, 0.72);
    this.target.rx = clamp(-totalDy * 0.0022 - deltaY * 0.004, -0.36, 0.36);
    this.target.rz = clamp(deltaX * -0.0038, -0.23, 0.23);
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
    if (this.baseMaterial) this.baseMaterial.emissiveIntensity = 0.2 + normalized * 0.28;
    if (this.rimLight) this.rimLight.intensity = 25 + normalized * 18;
  }

  setTheme(category) {
    const hex = THEME_COLORS[category] || THEME_COLORS.IDLE;
    const color = new THREE.Color(hex);
    this.rimLight?.color.copy(color);
    this.answerRimMaterial?.emissive.copy(color);
    this.triangleMaterial?.emissive.copy(color);
    if (this.triangleMaterial) this.triangleMaterial.color.copy(color).multiplyScalar(0.52);
  }

  deny() {
    this.stage.classList.remove("denied");
    void this.stage.offsetWidth;
    this.stage.classList.add("denied");
    this.target.rz = -0.12;
    setTimeout(() => { this.target.rz = 0.12; }, 95);
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
    this.answerGroup.visible = true;

    // Bake the continuously rotating idle yaw into the animated yaw, then aim
    // for the nearest orientation where the rear answer window faces camera.
    const totalYaw = this.autoYaw + this.current.ry;
    this.autoYaw = 0;
    this.current.ry = totalYaw;
    const nearestBackTurn = Math.round((totalYaw - Math.PI) / TWO_PI);
    const backFacingYaw = Math.PI + nearestBackTurn * TWO_PI;

    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.ry = backFacingYaw;
    this.target.rz = 0;

    setTimeout(() => {
      this.orb.classList.remove("is-settling");
      this.orb.classList.add("is-revealed");
      this.answerOverlay.setAttribute("aria-hidden", "false");
    }, this.reducedMotion ? 50 : 500);
  }

  reset() {
    this.revealed = false;
    this.setTheme("IDLE");
    this.orb.classList.remove("is-revealed", "is-turning", "is-settling", "is-shaking", "is-dragging");
    this.answerOverlay.setAttribute("aria-hidden", "true");
    this.answerGroup.visible = false;
    this.autoYaw = 0;
    this.current.ry = 0;
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
    const deltaSeconds = Math.min(0.08, Math.max(0.001, (now - this.previousAnimationTime) / 1000));
    this.previousAnimationTime = now;

    if (!this.shaking && !this.revealed && this.autoSpinSpeed > 0) {
      this.autoYaw = (this.autoYaw + this.autoSpinSpeed * deltaSeconds) % TWO_PI;
    }

    const dampingSpeed = this.shaking ? 22 : (this.revealed ? 13 : 5.6);
    const ease = 1 - Math.exp(-dampingSpeed * deltaSeconds);
    this.current.rx = lerp(this.current.rx, this.target.rx, ease);
    this.current.ry = lerp(this.current.ry, this.target.ry, ease);
    this.current.rz = lerp(this.current.rz, this.target.rz, ease);
    this.current.x = lerp(this.current.x, this.target.x, ease);
    this.current.y = lerp(this.current.y, this.target.y, ease);

    const motionScale = this.reducedMotion ? 0.08 : 1;
    const idleBob = !this.shaking ? Math.sin(elapsed * 1.55) * 0.055 * motionScale : 0;
    const breathing = 1 + Math.sin(elapsed * 1.2) * 0.009 * motionScale;
    const jitter = this.shaking ? this.shakeIntensity : 0;
    const jitterX = jitter ? (Math.random() - 0.5) * 0.075 * jitter : 0;
    const jitterY = jitter ? (Math.random() - 0.5) * 0.065 * jitter : 0;
    const jitterRot = jitter ? (Math.random() - 0.5) * 0.052 * jitter : 0;

    this.frogGroup.position.x = this.current.x / 205 + jitterX;
    this.frogGroup.position.y = -this.current.y / 205 + idleBob + jitterY;
    this.frogGroup.rotation.x = clamp(this.current.rx + jitterRot, -0.44, 0.44);
    this.frogGroup.rotation.y = this.autoYaw + this.current.ry + jitterRot * 1.15;
    this.frogGroup.rotation.z = this.current.rz - jitterRot;
    this.frogGroup.scale.setScalar(breathing + jitter * 0.007);

    // Render at 30 FPS while idle and at 60 FPS during direct interaction or
    // result rotation. The full geometric sphere remains smooth without keeping
    // mobile GPUs at maximum load when nobody is touching the page.
    const rotatingToResult = this.revealed && Math.abs(this.target.ry - this.current.ry) > 0.008;
    const active = this.shaking || rotatingToResult;
    const interval = active ? 1000 / 60 : 1000 / 30;
    if (now - this.lastFrame >= interval) {
      this.lastFrame = now;
      this.renderer.render(this.scene3d, this.camera);
    }

    const bobPixels = idleBob * 205;
    const shadowPulse = `scaleX(${(1 - Math.abs(bobPixels) * 0.012).toFixed(3)})`;
    const shadowOpacity = (0.68 - Math.abs(bobPixels) * 0.018).toFixed(3);
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
