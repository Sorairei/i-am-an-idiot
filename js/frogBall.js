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
        color: 0x59c90d,
        roughness: 0.24,
        metalness: 0.01,
        clearcoat: 1,
        clearcoatRoughness: 0.10,
      }),
      shellLight: new THREE.MeshPhysicalMaterial({
        color: 0xa8ef1f,
        roughness: 0.29,
        clearcoat: 0.92,
        clearcoatRoughness: 0.12,
      }),
      shellDark: new THREE.MeshPhysicalMaterial({
        color: 0x063f20,
        roughness: 0.30,
        clearcoat: 0.78,
        clearcoatRoughness: 0.16,
      }),
      amber: new THREE.MeshPhysicalMaterial({
        color: 0xb96709,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
      helmetYellow: new THREE.MeshPhysicalMaterial({
        color: 0xffb400,
        roughness: 0.23,
        metalness: 0.04,
        clearcoat: 0.95,
        clearcoatRoughness: 0.10,
      }),
      helmetOrange: new THREE.MeshPhysicalMaterial({
        color: 0xd96d00,
        roughness: 0.28,
        metalness: 0.04,
        clearcoat: 0.86,
      }),
      goggleLens: new THREE.MeshPhysicalMaterial({
        color: 0xffa20b,
        transparent: true,
        opacity: 0.28,
        roughness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      pupil: new THREE.MeshPhysicalMaterial({
        color: 0x03170c,
        roughness: 0.14,
        clearcoat: 1,
      }),
      black: new THREE.MeshStandardMaterial({ color: 0x020403, roughness: 0.42 }),
      white: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xd9ffc8,
        transparent: true,
        opacity: 0.055,
        roughness: 0.03,
        clearcoat: 1,
        clearcoatRoughness: 0.01,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    };

    // The green sphere is deliberately the largest and brightest object. The
    // previous version allowed the helmet and goggles to dominate the silhouette.
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.46, 72, 56), materials.shell);
    body.scale.set(1, 0.98, 0.95);
    this.model.add(body);

    // Light-green frog muzzle, pushed just in front of the sphere.
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(1.92, 64, 42), materials.shellLight);
    muzzle.position.set(0, -0.38, 2.02);
    muzzle.scale.set(1.08, 0.73, 0.31);
    this.model.add(muzzle);

    // Subtle lower-belly patch like the supplied BeeTales frog artwork.
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.55, 56, 34), materials.shellLight.clone());
    belly.material.color.setHex(0xc6f326);
    belly.position.set(0, -1.72, 1.66);
    belly.scale.set(1.15, 0.36, 0.22);
    this.model.add(belly);

    // A thin glossy coat gives the ball a Magic-8-Ball-like finish.
    const gloss = new THREE.Mesh(new THREE.SphereGeometry(2.50, 72, 56), materials.glass);
    gloss.scale.set(1, 0.98, 0.95);
    gloss.renderOrder = 8;
    this.model.add(gloss);

    this.createEyes(materials);
    this.createFaceDetails(materials);
    this.createWorkerGear(materials);
    this.createAnswerWindow(materials);
    this.createOrbitingSpecks();

    this.model.rotation.set(0.015, 0, 0);
  }

  createEyes(materials) {
    const THREE = this.THREE;
    this.pupilGroups = [];

    for (const side of [-1, 1]) {
      const eyeRoot = new THREE.Group();
      eyeRoot.position.set(side * 0.96, 0.98, 1.88);

      // Green raised eye socket: this is what gives the sphere a frog silhouette.
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 34), materials.shellDark);
      socket.scale.set(1.02, 1.02, 0.76);
      eyeRoot.add(socket);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.56, 44, 30), materials.amber);
      iris.position.z = 0.53;
      iris.scale.z = 0.30;
      eyeRoot.add(iris);

      const pupilGroup = new THREE.Group();
      pupilGroup.position.z = 0.72;

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.27, 36, 24), materials.pupil);
      pupil.scale.z = 0.26;
      pupilGroup.add(pupil);

      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 16), materials.white);
      shine.position.set(-0.09, 0.12, 0.24);
      pupilGroup.add(shine);

      const tinyShine = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), materials.white);
      tinyShine.position.set(0.11, -0.08, 0.23);
      pupilGroup.add(tinyShine);

      eyeRoot.add(pupilGroup);
      this.pupilGroups.push(pupilGroup);
      this.model.add(eyeRoot);
    }
  }

  createFaceDetails(materials) {
    const THREE = this.THREE;

    // Nostrils are placed on the light muzzle, clearly below the goggles.
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.078, 20, 14), materials.pupil);
      nostril.position.set(side * 0.30, -0.08, 2.64);
      nostril.scale.set(1, 0.72, 0.45);
      this.model.add(nostril);
    }

    // Friendly curved frog smile.
    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, -0.57, 2.53),
      new THREE.Vector3(-0.62, -0.82, 2.63),
      new THREE.Vector3(0, -0.93, 2.68),
      new THREE.Vector3(0.62, -0.82, 2.63),
      new THREE.Vector3(1.05, -0.57, 2.53),
    ]);
    const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 52, 0.070, 12, false), materials.pupil);
    this.model.add(smile);

    for (const side of [-1, 1]) {
      const corner = new THREE.Mesh(new THREE.SphereGeometry(0.10, 20, 14), materials.pupil);
      corner.position.set(side * 1.06, -0.56, 2.52);
      corner.scale.set(0.70, 1.08, 0.52);
      this.model.add(corner);
    }

    // Soft cheek highlights preserve the cute avatar character.
    const cheekMaterial = materials.shellLight.clone();
    cheekMaterial.transparent = true;
    cheekMaterial.opacity = 0.62;
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 20), cheekMaterial);
      cheek.position.set(side * 1.47, -0.32, 2.28);
      cheek.scale.set(1.18, 0.68, 0.30);
      this.model.add(cheek);
    }
  }

  createWorkerGear(materials) {
    const THREE = this.THREE;
    const gear = new THREE.Group();

    // Compact construction helmet. It decorates the upper quarter of the frog
    // instead of covering most of the green sphere.
    const helmetDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.62, 60, 30, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.helmetYellow,
    );
    helmetDome.position.set(0, 1.64, -0.12);
    helmetDome.scale.set(1, 0.62, 0.82);
    gear.add(helmetDome);

    const helmetBand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.72, 1.82, 0.17, 64, 1, false),
      materials.helmetOrange,
    );
    helmetBand.position.set(0, 1.63, 0.02);
    gear.add(helmetBand);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.17, 0.47, 10, 2, 3), materials.helmetYellow);
    visor.position.set(0, 1.58, 1.63);
    visor.rotation.x = -0.04;
    gear.add(visor);

    const centerRidge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.88, 0.22, 3, 8, 3), materials.helmetOrange);
    centerRidge.position.set(0, 2.10, 1.02);
    centerRidge.rotation.x = -0.08;
    gear.add(centerRidge);

    for (const side of [-1, 1]) {
      const smallRidge = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.31, 0.20, 3, 3, 3), materials.helmetOrange);
      smallRidge.position.set(side * 1.05, 1.82, 1.10);
      gear.add(smallRidge);
    }

    // Safety goggles hug the eye sockets but leave the green muzzle visible.
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.62, 56), materials.goggleLens);
      lens.position.set(side * 0.96, 0.98, 2.66);
      lens.scale.set(1.16, 0.88, 1);
      lens.renderOrder = 5;
      gear.add(lens);

      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.085, 14, 72), materials.black);
      frame.position.set(side * 0.96, 0.98, 2.68);
      frame.scale.set(1.16, 0.88, 1);
      frame.renderOrder = 6;
      gear.add(frame);
    }

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.16), materials.black);
    bridge.position.set(0, 0.98, 2.68);
    bridge.renderOrder = 6;
    gear.add(bridge);

    // Short side straps suggest the BeeTales avatar goggles without creating a
    // large black ring around the whole ball.
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.18), materials.black);
      strap.position.set(side * 1.72, 0.99, 2.18);
      strap.rotation.y = side * 0.42;
      gear.add(strap);
    }

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
