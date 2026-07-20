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
    this.autoSpinSpeed = this.reducedMotion ? 0 : 0.075;

    // Personality state. The eyes are independent 3D objects rather than a
    // baked section of the sphere texture, so they can track the pointer,
    // blink, squint, react to shaking, and briefly return the face toward the
    // player when interaction begins.
    const now = performance.now();
    this.pointerEngagedUntil = 0;
    this.eyeLook = { x: 0, y: 0 };
    this.eyeLookTarget = { x: 0, y: 0 };
    this.eyeMicro = { x: 0, y: 0 };
    this.eyeMicroTarget = { x: 0, y: 0 };
    this.nextSaccadeAt = now + 900 + Math.random() * 1300;
    this.blinking = false;
    this.blinkStart = 0;
    this.blinkDuration = 150;
    this.pendingExtraBlink = 0;
    this.nextBlinkAt = now + 1800 + Math.random() * 2800;
    this.eyeExpression = { squint: 0, pupilScale: 1, biasX: 0, biasY: 0 };
    this.eyeReaction = null;
    this.eyes = [];
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

    this.orb.addEventListener("pointerenter", () => {
      this.pointerEngagedUntil = performance.now() + 1800;
    }, { passive: true });

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

    const avatarUrl = new URL("../assets/images/beetales-avatar-eye-base.webp", import.meta.url).href;
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

    this.createAnimatedEyes();
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

    // The supplied mascot was pre-cleaned into a transparent derivative with
    // neutral lens wells. Animated Three.js eyes are layered above those wells.
    const cleanAvatar = image;

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

  createAnimatedEyes() {
    this.eyeRoot = new THREE.Group();
    this.eyeRoot.name = "Animated frog eyes";
    this.eyeRoot.renderOrder = 8;
    this.frogGroup.add(this.eyeRoot);

    this.eyeMaterials = {
      bulge: new THREE.MeshPhongMaterial({
        color: 0x6d2904,
        emissive: 0x160400,
        emissiveIntensity: 0.16,
        shininess: 72,
        specular: 0xb86819,
      }),
      iris: new THREE.MeshPhongMaterial({
        color: 0x8b3a07,
        emissive: 0x1c0500,
        emissiveIntensity: 0.12,
        shininess: 58,
        specular: 0xb55d18,
      }),
      irisRing: new THREE.MeshStandardMaterial({
        color: 0x351000,
        roughness: 0.34,
        metalness: 0.04,
      }),
      pupil: new THREE.MeshStandardMaterial({
        color: 0x070502,
        roughness: 0.14,
        metalness: 0.02,
        emissive: 0x000000,
        emissiveIntensity: 0,
      }),
      highlight: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      rim: new THREE.MeshStandardMaterial({
        color: 0x160b02,
        roughness: 0.22,
        metalness: 0.18,
      }),
      blinkLine: new THREE.MeshBasicMaterial({
        color: 0x120801,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    };

    this.eyeGeometries = {
      back: new THREE.CircleGeometry(0.158, 40),
      bulge: new THREE.SphereGeometry(0.145, 36, 24),
      iris: new THREE.CircleGeometry(0.106, 40),
      irisRing: new THREE.TorusGeometry(0.088, 0.009, 10, 40),
      pupil: new THREE.CircleGeometry(0.063, 36),
      largeHighlight: new THREE.CircleGeometry(0.025, 24),
      smallHighlight: new THREE.CircleGeometry(0.011, 20),
      blinkLine: new THREE.PlaneGeometry(0.245, 0.014),
    };

    const eyeDefinitions = [
      { side: -1, longitude: -0.555, latitude: -0.015 },
      { side: 1, longitude: 0.555, latitude: -0.015 },
    ];
    for (const definition of eyeDefinitions) {
      this.eyes.push(this.createEye(definition));
    }
  }

  createEye({ side, longitude, latitude }) {
    const normal = new THREE.Vector3(
      Math.sin(longitude) * Math.cos(latitude),
      Math.sin(latitude),
      Math.cos(longitude) * Math.cos(latitude),
    ).normalize();

    const anchor = new THREE.Group();
    anchor.name = side < 0 ? "Left animated eye" : "Right animated eye";
    anchor.position.copy(normal).multiplyScalar(1.006);
    anchor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    this.eyeRoot.add(anchor);

    const visual = new THREE.Group();
    visual.position.z = 0.008;
    anchor.add(visual);

    const darkBack = new THREE.Mesh(
      this.eyeGeometries.back,
      this.eyeMaterials.rim,
    );
    darkBack.position.z = 0.002;
    visual.add(darkBack);

    const bulge = new THREE.Mesh(
      this.eyeGeometries.bulge,
      this.eyeMaterials.bulge,
    );
    bulge.scale.z = 0.24;
    bulge.position.z = 0.027;
    visual.add(bulge);

    const pupilGroup = new THREE.Group();
    pupilGroup.position.z = 0.067;
    visual.add(pupilGroup);

    const iris = new THREE.Mesh(
      this.eyeGeometries.iris,
      this.eyeMaterials.iris,
    );
    pupilGroup.add(iris);

    const irisRing = new THREE.Mesh(
      this.eyeGeometries.irisRing,
      this.eyeMaterials.irisRing,
    );
    irisRing.position.z = 0.004;
    pupilGroup.add(irisRing);

    const pupil = new THREE.Mesh(
      this.eyeGeometries.pupil,
      this.eyeMaterials.pupil,
    );
    pupil.position.z = 0.008;
    pupilGroup.add(pupil);

    const largeHighlight = new THREE.Mesh(
      this.eyeGeometries.largeHighlight,
      this.eyeMaterials.highlight,
    );
    largeHighlight.position.set(-0.034, 0.038, 0.013);
    pupilGroup.add(largeHighlight);

    const smallHighlight = new THREE.Mesh(
      this.eyeGeometries.smallHighlight,
      this.eyeMaterials.highlight,
    );
    smallHighlight.position.set(0.021, 0.016, 0.014);
    pupilGroup.add(smallHighlight);

    const blinkLineMaterial = this.eyeMaterials.blinkLine.clone();
    const blinkLine = new THREE.Mesh(
      this.eyeGeometries.blinkLine,
      blinkLineMaterial,
    );
    blinkLine.position.z = 0.085;
    blinkLine.visible = false;
    anchor.add(blinkLine);

    return {
      side,
      anchor,
      visual,
      pupilGroup,
      pupil,
      bulge,
      blinkLine,
      blinkLineMaterial,
    };
  }

  forceBlink(doubleBlink = false) {
    if (this.revealed) return;
    this.nextBlinkAt = performance.now();
    if (doubleBlink) this.pendingExtraBlink = Math.max(this.pendingExtraBlink, 1);
  }

  updateBlink(now) {
    if (this.reducedMotion || this.revealed) return 0;

    if (!this.blinking && now >= this.nextBlinkAt) {
      this.blinking = true;
      this.blinkStart = now;
      this.blinkDuration = 125 + Math.random() * 45;
      if (!this.pendingExtraBlink && Math.random() < 0.22) this.pendingExtraBlink = 1;
    }

    if (!this.blinking) return 0;
    const progress = (now - this.blinkStart) / this.blinkDuration;
    if (progress >= 1) {
      this.blinking = false;
      if (this.pendingExtraBlink > 0) {
        this.pendingExtraBlink -= 1;
        this.nextBlinkAt = now + 85;
      } else {
        this.nextBlinkAt = now + 2500 + Math.random() * 3900;
      }
      return 0;
    }
    return Math.sin(progress * Math.PI);
  }

  setEyeExpression(category = "IDLE") {
    const expressions = {
      IDLE: { squint: 0, pupilScale: 1, biasX: 0, biasY: 0 },
      COMMON: { squint: 0.02, pupilScale: 1.02, biasX: 0, biasY: 0 },
      SNARKY: { squint: 0.12, pupilScale: 0.94, biasX: 0.025, biasY: 0.006 },
      SAVAGE: { squint: 0.23, pupilScale: 0.82, biasX: -0.018, biasY: -0.008 },
      RARE_TRUTH: { squint: 0, pupilScale: 1.08, biasX: 0, biasY: 0.012 },
      FATAL: { squint: 0.08, pupilScale: 0.48, biasX: 0, biasY: 0 },
    };
    this.eyeExpression = expressions[category] || expressions.IDLE;

    if (this.eyeMaterials?.pupil) {
      if (category === "FATAL") {
        this.eyeMaterials.pupil.color.setHex(0x180000);
        this.eyeMaterials.pupil.emissive.setHex(0xff0000);
        this.eyeMaterials.pupil.emissiveIntensity = 0.72;
      } else {
        this.eyeMaterials.pupil.color.setHex(0x070502);
        this.eyeMaterials.pupil.emissive.setHex(0x000000);
        this.eyeMaterials.pupil.emissiveIntensity = 0;
      }
    }
  }

  updateEyes(now, deltaSeconds) {
    if (!this.eyes.length) return;

    const pointerActive = now < this.pointerEngagedUntil;
    if (!pointerActive && !this.shaking && now >= this.nextSaccadeAt) {
      this.eyeMicroTarget.x = (Math.random() - 0.5) * 0.026;
      this.eyeMicroTarget.y = (Math.random() - 0.5) * 0.018;
      this.nextSaccadeAt = now + 900 + Math.random() * 2200;
    }

    const microEase = 1 - Math.exp(-5.5 * deltaSeconds);
    this.eyeMicro.x = lerp(this.eyeMicro.x, pointerActive ? 0 : this.eyeMicroTarget.x, microEase);
    this.eyeMicro.y = lerp(this.eyeMicro.y, pointerActive ? 0 : this.eyeMicroTarget.y, microEase);

    const reaction = this.eyeReaction && now < this.eyeReaction.until ? this.eyeReaction : null;
    if (this.eyeReaction && !reaction) this.eyeReaction = null;

    let targetX = this.eyeLookTarget.x + this.eyeMicro.x + this.eyeExpression.biasX;
    let targetY = this.eyeLookTarget.y + this.eyeMicro.y + this.eyeExpression.biasY;
    let squint = this.eyeExpression.squint;
    let pupilScale = this.eyeExpression.pupilScale;

    if (reaction) {
      targetX += reaction.biasX || 0;
      targetY += reaction.biasY || 0;
      squint = Math.max(squint, reaction.squint || 0);
      pupilScale *= reaction.pupilScale || 1;
    }

    if (this.shaking) {
      targetX += (Math.random() - 0.5) * 0.025 * this.shakeIntensity;
      targetY += (Math.random() - 0.5) * 0.018 * this.shakeIntensity;
      pupilScale *= 1 + this.shakeIntensity * 0.12;
      squint += this.shakeIntensity * 0.06;
    }

    const lookEase = 1 - Math.exp(-(this.shaking ? 18 : 10) * deltaSeconds);
    this.eyeLook.x = lerp(this.eyeLook.x, clamp(targetX, -0.052, 0.052), lookEase);
    this.eyeLook.y = lerp(this.eyeLook.y, clamp(targetY, -0.041, 0.041), lookEase);

    const blinkAmount = this.updateBlink(now);
    const openScale = clamp(1 - blinkAmount * 0.94 - squint, 0.075, 1.08);
    const lineOpacity = clamp((blinkAmount - 0.55) * 2.3, 0, 0.9);

    for (const eye of this.eyes) {
      // A tiny inward bias gives the pair a friendly focus instead of making
      // the pupils appear to diverge at close range.
      const convergence = -eye.side * 0.004;
      eye.pupilGroup.position.x = clamp(this.eyeLook.x + convergence, -0.054, 0.054);
      eye.pupilGroup.position.y = clamp(this.eyeLook.y, -0.043, 0.043);
      eye.pupilGroup.scale.setScalar(pupilScale);
      eye.visual.scale.y = openScale;
      eye.blinkLine.visible = lineOpacity > 0.02;
      eye.blinkLineMaterial.opacity = lineOpacity;
    }
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
      emissiveIntensity: 0.12,
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
    this.pointerEngagedUntil = performance.now() + 1500;
    this.eyeLookTarget.x = nextX * 0.047;
    this.eyeLookTarget.y = -nextY * 0.036;

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
    this.pointerEngagedUntil = performance.now() + 320;
    this.eyeLookTarget.x = clamp(-deltaX * 0.0019, -0.052, 0.052);
    this.eyeLookTarget.y = clamp(deltaY * 0.0015, -0.038, 0.038);
    this.setShaking(intensity > 0.055, intensity);
  }

  releaseDrag() {
    this.target.x = 0;
    this.target.y = 0;
    this.target.rx = 0;
    this.target.ry = 0;
    this.target.rz = 0;
    this.eyeLookTarget.x = 0;
    this.eyeLookTarget.y = 0;
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
    this.setEyeExpression(category);
  }

  deny() {
    this.stage.classList.remove("denied");
    void this.stage.offsetWidth;
    this.stage.classList.add("denied");
    this.eyeReaction = {
      until: performance.now() + 720,
      squint: 0.28,
      biasX: Math.random() < 0.5 ? -0.042 : 0.042,
      pupilScale: 0.9,
    };
    this.forceBlink(true);
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
    this.setEyeExpression("IDLE");
    this.eyeLookTarget.x = 0;
    this.eyeLookTarget.y = 0;
    this.eyeReaction = null;
    this.nextBlinkAt = performance.now() + 900 + Math.random() * 1800;
  }

  animate = now => {
    if (!this.ready) return;
    requestAnimationFrame(this.animate);
    if (document.hidden) return;

    const elapsed = (now - this.startTime) / 1000;
    const deltaSeconds = Math.min(0.08, Math.max(0.001, (now - this.previousAnimationTime) / 1000));
    this.previousAnimationTime = now;

    const pointerActive = now < this.pointerEngagedUntil;
    if (!this.shaking && !this.revealed && this.autoSpinSpeed > 0) {
      if (pointerActive) {
        // Turn the mascot back toward the player when they approach it. The
        // continuous idle turn resumes after interaction stops.
        const frontDelta = Math.atan2(Math.sin(-this.autoYaw), Math.cos(-this.autoYaw));
        const faceEase = 1 - Math.exp(-4.4 * deltaSeconds);
        this.autoYaw += frontDelta * faceEase;
      } else {
        this.autoYaw = (this.autoYaw + this.autoSpinSpeed * deltaSeconds) % TWO_PI;
      }
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
    this.updateEyes(now, deltaSeconds);

    // Render at 30 FPS while idle and at 60 FPS during direct interaction or
    // result rotation. The full geometric sphere remains smooth without keeping
    // mobile GPUs at maximum load when nobody is touching the page.
    const rotatingToResult = this.revealed && Math.abs(this.target.ry - this.current.ry) > 0.008;
    const active = this.shaking || rotatingToResult || pointerActive || this.blinking || Boolean(this.eyeReaction);
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
