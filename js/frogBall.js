import { CATEGORY_LABELS } from "./answers.js";
import { loadThree } from "./threeLoader.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (current, target, amount) => current + (target - current) * amount;

export class FrogBall {
  constructor({ orb, canvas, stage, shadow, energyFill, energyValue, answerOverlay, answerText, answerCategory }) {
    this.orb = orb;
    this.canvas = canvas;
    this.stage = stage;
    this.shadow = shadow;
    this.energyFill = energyFill;
    this.energyValue = energyValue;
    this.answerOverlay = answerOverlay;
    this.answerText = answerText;
    this.answerCategory = answerCategory;

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
    this.resizeObserver = null;
  }

  async init() {
    const THREE = await loadThree();
    this.THREE = THREE;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    this.camera.position.set(0, 0, 10.45);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x000000, 0);

    this.clock = new THREE.Clock();
    this.createLights();
    this.createOracleModel();
    this.resize();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.orb);

    this.ready = true;
    this.orb.classList.remove("is-loading");
    this.orb.classList.add("is-ready");
    this.animate();
    return true;
  }

  createLights() {
    const THREE = this.THREE;
    const hemisphere = new THREE.HemisphereLight(0xd9ffad, 0x00130b, 2.25);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xffffff, 4.5);
    key.position.set(-4.5, 5.5, 7);
    this.scene.add(key);

    const warmFill = new THREE.PointLight(0xffbd49, 20, 18, 2);
    warmFill.position.set(4, 1.4, 5.5);
    this.scene.add(warmFill);

    this.rimLight = new THREE.PointLight(0x99ff31, 26, 17, 2);
    this.rimLight.position.set(-4, -2, 2);
    this.scene.add(this.rimLight);

    const backLight = new THREE.PointLight(0x0b8d4a, 18, 14, 2);
    backLight.position.set(0, 1, -6);
    this.scene.add(backLight);
  }

  createOracleModel() {
    const THREE = this.THREE;
    this.oracleRoot = new THREE.Group();
    this.model = new THREE.Group();
    this.oracleRoot.add(this.model);
    this.scene.add(this.oracleRoot);

    const materials = {
      shell: new THREE.MeshPhysicalMaterial({
        color: 0x78d414,
        roughness: 0.28,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      shellDark: new THREE.MeshPhysicalMaterial({
        color: 0x023d20,
        roughness: 0.34,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
      }),
      lime: new THREE.MeshPhysicalMaterial({
        color: 0xa8f31f,
        roughness: 0.3,
        clearcoat: 0.9,
        clearcoatRoughness: 0.15,
      }),
      limeSoft: new THREE.MeshPhysicalMaterial({
        color: 0xcdf42a,
        roughness: 0.36,
        clearcoat: 0.72,
      }),
      eyeAmber: new THREE.MeshPhysicalMaterial({
        color: 0xb75d08,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
      helmetYellow: new THREE.MeshPhysicalMaterial({
        color: 0xffb000,
        roughness: 0.26,
        metalness: 0.04,
        clearcoat: 0.94,
        clearcoatRoughness: 0.12,
      }),
      helmetOrange: new THREE.MeshPhysicalMaterial({
        color: 0xd66a00,
        roughness: 0.3,
        metalness: 0.05,
        clearcoat: 0.82,
      }),
      goggleLens: new THREE.MeshPhysicalMaterial({
        color: 0xff8a00,
        transparent: true,
        opacity: 0.46,
        roughness: 0.08,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      pupil: new THREE.MeshPhysicalMaterial({
        color: 0x002f18,
        roughness: 0.18,
        clearcoat: 1,
      }),
      black: new THREE.MeshStandardMaterial({ color: 0x010503, roughness: 0.48 }),
      white: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, clearcoat: 1 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xc8ffb4,
        transparent: true,
        opacity: 0.075,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    };

    const outerShell = new THREE.Mesh(new THREE.SphereGeometry(2.62, 72, 52), materials.shellDark);
    outerShell.scale.y = 0.97;
    this.model.add(outerShell);

    const frontShell = new THREE.Mesh(
      new THREE.SphereGeometry(2.635, 72, 42, 0, Math.PI, 0, Math.PI),
      materials.shell,
    );
    frontShell.scale.y = 0.97;
    this.model.add(frontShell);

    const glassShell = new THREE.Mesh(new THREE.SphereGeometry(2.68, 72, 52), materials.glass);
    glassShell.scale.y = 0.97;
    this.model.add(glassShell);

    const edgeRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.61, 0.055, 14, 150),
      new THREE.MeshStandardMaterial({ color: 0x032716, roughness: 0.26, metalness: 0.12 }),
    );
    this.model.add(edgeRing);

    this.createEyes(materials);
    this.createFaceDetails(materials);
    this.createWorkerGear(materials);
    this.createAnswerWindow(materials);
    this.createOrbitingSpecks();

    this.model.rotation.set(0.02, 0, 0);
  }

  createEyes(materials) {
    const THREE = this.THREE;
    this.pupilGroups = [];

    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(side * 1.04, 1.34, 1.92);

      const outer = new THREE.Mesh(new THREE.SphereGeometry(0.84, 48, 34), materials.shellDark);
      outer.scale.z = 0.55;
      eye.add(outer);

      const irisBase = new THREE.Mesh(new THREE.SphereGeometry(0.68, 48, 34), materials.eyeAmber);
      irisBase.position.z = 0.29;
      irisBase.scale.z = 0.43;
      eye.add(irisBase);

      const pupilGroup = new THREE.Group();
      pupilGroup.position.z = 0.57;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), materials.pupil);
      pupil.scale.z = 0.32;
      pupilGroup.add(pupil);

      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), materials.white);
      shine.position.set(side === -1 ? -0.1 : -0.12, 0.14, 0.3);
      pupilGroup.add(shine);

      const tinyShine = new THREE.Mesh(new THREE.SphereGeometry(0.04, 18, 14), materials.white);
      tinyShine.position.set(0.12, -0.08, 0.3);
      tinyShine.material = materials.white.clone();
      tinyShine.material.opacity = 0.8;
      tinyShine.material.transparent = true;
      pupilGroup.add(tinyShine);

      eye.add(pupilGroup);
      this.pupilGroups.push(pupilGroup);
      this.model.add(eye);
    }
  }

  createFaceDetails(materials) {
    const THREE = this.THREE;

    const belly = new THREE.Mesh(new THREE.CircleGeometry(1.28, 64), materials.limeSoft);
    belly.scale.set(1.37, 0.57, 1);
    belly.position.set(0, -1.46, 2.18);
    belly.rotation.x = -0.06;
    this.model.add(belly);

    const cheekMaterial = materials.lime.clone();
    cheekMaterial.transparent = true;
    cheekMaterial.opacity = 0.55;
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.42, 30, 22), cheekMaterial);
      cheek.position.set(side * 1.46, -0.25, 2.08);
      cheek.scale.set(1.25, 0.7, 0.32);
      this.model.add(cheek);
    }

    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.085, 22, 16), materials.pupil);
      nostril.position.set(side * 0.34, 0.12, 2.61);
      nostril.scale.set(1, 0.72, 0.5);
      this.model.add(nostril);
    }

    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.02, -0.42, 2.40),
      new THREE.Vector3(-0.55, -0.72, 2.50),
      new THREE.Vector3(0, -0.83, 2.54),
      new THREE.Vector3(0.55, -0.72, 2.50),
      new THREE.Vector3(1.02, -0.42, 2.40),
    ]);
    const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 48, 0.073, 12, false), materials.pupil);
    this.model.add(smile);

    const mouthCornerGeometry = new THREE.SphereGeometry(0.105, 22, 16);
    for (const side of [-1, 1]) {
      const corner = new THREE.Mesh(mouthCornerGeometry, materials.pupil);
      corner.position.set(side * 1.04, -0.41, 2.39);
      corner.scale.set(0.72, 1.15, 0.6);
      this.model.add(corner);
    }
  }


  createWorkerGear(materials) {
    const THREE = this.THREE;
    const gear = new THREE.Group();

    // Construction helmet: a compressed upper hemisphere, a thick brim, and raised safety ridges.
    const helmetDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.76, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.helmetYellow,
    );
    helmetDome.position.set(0, 1.82, -0.16);
    helmetDome.scale.set(1, 0.73, 0.88);
    gear.add(helmetDome);

    const helmetBrim = new THREE.Mesh(
      new THREE.CylinderGeometry(2.05, 2.18, 0.23, 72, 1, false),
      materials.helmetOrange,
    );
    helmetBrim.position.set(0, 1.79, 0.02);
    gear.add(helmetBrim);

    const frontVisor = new THREE.Mesh(
      new THREE.BoxGeometry(3.88, 0.2, 0.54, 12, 2, 4),
      materials.helmetYellow,
    );
    frontVisor.position.set(0, 1.75, 1.92);
    frontVisor.rotation.x = -0.035;
    gear.add(frontVisor);

    const centerRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 1.26, 0.24, 3, 10, 3),
      materials.helmetOrange,
    );
    centerRidge.position.set(0, 2.48, 1.11);
    centerRidge.rotation.x = -0.08;
    gear.add(centerRidge);

    for (const side of [-1, 1]) {
      const sideRidge = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.42, 0.25, 3, 4, 3),
        materials.helmetOrange,
      );
      sideRidge.position.set(side * 1.16, 2.03, 1.19);
      sideRidge.rotation.z = side * -0.08;
      gear.add(sideRidge);
    }

    // Safety-goggle strap circles the head behind the two orange lenses.
    const strap = new THREE.Mesh(
      new THREE.TorusGeometry(2.19, 0.105, 14, 120),
      materials.black,
    );
    strap.position.y = 1.23;
    strap.rotation.x = Math.PI / 2;
    gear.add(strap);

    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.68, 64), materials.goggleLens);
      lens.position.set(side * 1.01, 1.27, 2.68);
      lens.scale.set(1.22, 0.78, 1);
      lens.renderOrder = 4;
      gear.add(lens);

      const frame = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.105, 16, 84),
        materials.black,
      );
      frame.position.set(side * 1.01, 1.27, 2.71);
      frame.scale.set(1.22, 0.78, 1);
      frame.renderOrder = 5;
      gear.add(frame);
    }

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.18), materials.black);
    bridge.position.set(0, 1.27, 2.7);
    bridge.renderOrder = 5;
    gear.add(bridge);

    const lowerGoggleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, 0.96, 2.47),
      new THREE.Vector3(-1.05, 0.82, 2.63),
      new THREE.Vector3(0, 0.72, 2.67),
      new THREE.Vector3(1.05, 0.82, 2.63),
      new THREE.Vector3(1.9, 0.96, 2.47),
    ]);
    const lowerGoggleFrame = new THREE.Mesh(
      new THREE.TubeGeometry(lowerGoggleCurve, 56, 0.075, 10, false),
      materials.black,
    );
    lowerGoggleFrame.renderOrder = 5;
    gear.add(lowerGoggleFrame);

    this.model.add(gear);
  }

  createAnswerWindow(materials) {
    const THREE = this.THREE;
    const back = new THREE.Group();
    back.position.z = -2.61;
    back.rotation.y = Math.PI;

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.49, 80),
      new THREE.MeshPhysicalMaterial({ color: 0x010403, roughness: 0.22, clearcoat: 0.85, side: THREE.DoubleSide }),
    );
    disc.position.z = 0.018;
    back.add(disc);

    this.rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x94ff2b,
      emissive: 0x245d05,
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.18,
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.49, 0.115, 20, 120), this.rimMaterial);
    rim.position.z = 0.052;
    back.add(rim);

    const innerRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.025, 10, 96),
      new THREE.MeshBasicMaterial({ color: 0x3f7c18, transparent: true, opacity: 0.7 }),
    );
    innerRim.position.z = 0.075;
    back.add(innerRim);

    const triangleShape = new THREE.Shape();
    triangleShape.moveTo(0, 1.04);
    triangleShape.lineTo(-1.02, -0.77);
    triangleShape.lineTo(1.02, -0.77);
    triangleShape.closePath();

    this.triangleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c642b,
      emissive: 0x0f431c,
      emissiveIntensity: 1.35,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      roughness: 0.35,
    });
    const triangle = new THREE.Mesh(new THREE.ShapeGeometry(triangleShape), this.triangleMaterial);
    triangle.position.z = 0.085;
    back.add(triangle);

    const triangleWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(triangle.geometry),
      new THREE.LineBasicMaterial({ color: 0x9cff45, transparent: true, opacity: 0.78 }),
    );
    triangleWire.position.z = 0.09;
    back.add(triangleWire);

    this.model.add(back);
  }

  createOrbitingSpecks() {
    const THREE = this.THREE;
    const count = this.reducedMotion ? 18 : 42;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 0.8;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 4.8;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.speckMaterial = new THREE.PointsMaterial({
      color: 0xb0ff33,
      size: 0.055,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.specks = new THREE.Points(geometry, this.speckMaterial);
    this.model.add(this.specks);
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.orb.clientWidth);
    const height = Math.max(1, this.orb.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setPointerTilt(normalX, normalY) {
    this.pointer.x = clamp(normalX, -1, 1);
    this.pointer.y = clamp(normalY, -1, 1);
    if (this.revealed || this.shaking) return;
    this.target.rx = -this.pointer.y * 0.17;
    this.target.ry = this.pointer.x * 0.22;
    this.target.rz = -this.pointer.x * 0.025;
  }

  setDrag(totalDx, totalDy, intensity, deltaX = totalDx, deltaY = totalDy) {
    if (this.revealed) return;
    this.energy = clamp(intensity, 0, 1.2);
    this.target.x = clamp(totalDx / 215, -0.88, 0.88);
    this.target.y = clamp(-totalDy / 260, -0.54, 0.54);
    this.target.ry += deltaX * 0.018;
    this.target.rx -= deltaY * 0.014;
    this.target.rz = clamp(deltaX * -0.0045, -0.24, 0.24);
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
    if (this.rimLight) this.rimLight.intensity = 26 + normalized * 18;
  }

  setTheme(category) {
    if (!this.ready) return;
    const colors = {
      IDLE: 0x9dff30,
      COMMON: 0x66f4d0,
      SNARKY: 0xffd84f,
      SAVAGE: 0xff7a21,
      RARE_TRUTH: 0xd7e9ff,
      FATAL: 0xff2525,
    };
    const color = colors[category] || colors.IDLE;
    this.rimMaterial?.color.setHex(color);
    this.rimMaterial?.emissive.setHex(color);
    this.triangleMaterial?.color.setHex(color);
    this.triangleMaterial?.emissive.setHex(color);
    this.speckMaterial?.color.setHex(color);
    this.rimLight?.color.setHex(color);
  }

  deny() {
    this.stage.classList.remove("denied");
    void this.stage.offsetWidth;
    this.stage.classList.add("denied");
    this.target.rz = -0.12;
    setTimeout(() => {
      this.target.rz = 0.12;
    }, 110);
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

  animate = () => {
    if (!this.ready) return;
    requestAnimationFrame(this.animate);
    if (document.hidden) return;

    const elapsed = this.clock.getElapsedTime();
    const ease = this.shaking ? 0.28 : (this.revealed ? 0.095 : 0.075);
    this.current.rx = lerp(this.current.rx, this.target.rx, ease);
    this.current.ry = lerp(this.current.ry, this.target.ry, ease);
    this.current.rz = lerp(this.current.rz, this.target.rz, ease);
    this.current.x = lerp(this.current.x, this.target.x, ease);
    this.current.y = lerp(this.current.y, this.target.y, ease);

    const motionScale = this.reducedMotion ? 0.08 : 1;
    const idleBob = !this.shaking ? Math.sin(elapsed * 1.6) * 0.11 * motionScale : 0;
    const breathing = 1 + Math.sin(elapsed * 1.25) * 0.008 * motionScale;
    const jitter = this.shaking ? this.shakeIntensity : 0;
    const jitterX = (Math.random() - 0.5) * 0.11 * jitter;
    const jitterY = (Math.random() - 0.5) * 0.11 * jitter;
    const jitterRot = (Math.random() - 0.5) * 0.08 * jitter;

    this.oracleRoot.position.set(this.current.x + jitterX, this.current.y + idleBob + jitterY, 0);
    this.oracleRoot.rotation.set(this.current.rx + jitterRot, this.current.ry + jitterRot * 1.4, this.current.rz - jitterRot);
    this.oracleRoot.scale.setScalar(breathing + jitter * 0.008);

    const pupilX = clamp(this.pointer.x * 0.12, -0.13, 0.13);
    const pupilY = clamp(-this.pointer.y * 0.10, -0.1, 0.1);
    for (const pupil of this.pupilGroups) {
      pupil.position.x = lerp(pupil.position.x, pupilX, 0.09);
      pupil.position.y = lerp(pupil.position.y, pupilY, 0.09);
    }

    if (this.specks) {
      this.specks.rotation.y = elapsed * 0.16 * motionScale;
      this.specks.rotation.z = elapsed * 0.07 * motionScale;
      this.speckMaterial.opacity = 0.45 + this.energy * 0.35;
    }

    const shadowPulse = 1 - Math.abs(idleBob) * 0.14;
    this.shadow.style.transform = `scaleX(${shadowPulse.toFixed(3)})`;
    this.shadow.style.opacity = String(0.7 - Math.abs(idleBob) * 0.42);

    this.renderer.render(this.scene, this.camera);
  };
}
