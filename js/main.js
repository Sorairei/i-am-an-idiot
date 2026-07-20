import { AudioManager } from "./audio.js";
import { SpeechManager } from "./speech.js";
import { SceneController } from "./scene.js";
import { FrogBall } from "./frogBall.js";
import { InteractionController } from "./interaction.js";
import { EffectsController } from "./effects.js";
import { AccessibilityController } from "./accessibility.js";
import { selectResult, validateAnswerInventory } from "./resultEngine.js";

const APP_START = performance.now();
const $ = selector => document.querySelector(selector);

const elements = {
  canvas: $("#scene-canvas"),
  frogCanvas: $("#frog-canvas"),
  orb: $("#frog-orb"),
  stage: $("#frog-stage"),
  shadow: $("#frog-shadow"),
  energyFill: $("#energy-fill"),
  energyValue: $("#energy-value"),
  answerOverlay: $("#answer-overlay"),
  answerText: $("#answer-text"),
  answerCategory: $("#answer-category"),
  shakeButton: $("#shake-button"),
  againButton: $("#again-button"),
  statusText: $("#status-text"),
  soundToggle: $("#sound-toggle"),
  voiceToggle: $("#voice-toggle"),
  helpDialog: $("#help-dialog"),
  helpButton: $("#help-button"),
  liveRegion: $("#aria-live"),
  fxLayer: $("#fx-layer"),
  fatalScreen: $("#fatal-screen"),
  fatalMessage: $("#fatal-message"),
  fatalCountdown: $("#fatal-countdown"),
  fatalEscape: $("#fatal-escape"),
};

const audio = new AudioManager();
const speech = new SpeechManager();
const scene = new SceneController(elements.canvas);
const frog = new FrogBall(elements);
const effects = new EffectsController({
  layer: elements.fxLayer,
  fatalScreen: elements.fatalScreen,
  fatalMessage: elements.fatalMessage,
  fatalCountdown: elements.fatalCountdown,
  fatalEscape: elements.fatalEscape,
});
const accessibility = new AccessibilityController({
  dialog: elements.helpDialog,
  helpButton: elements.helpButton,
  liveRegion: elements.liveRegion,
});

let currentAnswer = null;
let revealInProgress = false;
let interaction = null;

function setStatus(text) {
  elements.statusText.textContent = text;
}

function syncToggle(button, enabled, onLabel, offLabel) {
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? onLabel : offLabel);
}

syncToggle(elements.soundToggle, audio.enabled, "Mute sound", "Enable sound");
syncToggle(elements.voiceToggle, speech.enabled, "Disable voice", "Enable voice");

if (!speech.supported) {
  elements.voiceToggle.disabled = true;
  elements.voiceToggle.title = "Speech synthesis is unavailable in this browser.";
  elements.voiceToggle.setAttribute("aria-label", "Voice unavailable");
}

elements.soundToggle.addEventListener("click", async () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) await audio.ensureStarted();
  syncToggle(elements.soundToggle, audio.enabled, "Mute sound", "Enable sound");
});

elements.voiceToggle.addEventListener("click", () => {
  speech.setEnabled(!speech.enabled);
  syncToggle(elements.voiceToggle, speech.enabled, "Disable voice", "Enable voice");
});

async function revealAnswer() {
  if (revealInProgress) return;
  revealInProgress = true;
  document.body.classList.add("is-busy");
  setStatus("The 3D oracle is rotating toward the answer window...");

  const revealStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 220));
  currentAnswer = selectResult();
  document.body.dataset.theme = currentAnswer.category;
  scene.setTheme(currentAnswer.category);
  frog.reveal(currentAnswer);

  await new Promise(resolve => setTimeout(resolve, 610));
  console.info(`[Benchmark] Verdict visible in ${Math.round(performance.now() - revealStart)} ms.`);
  effects.burst(currentAnswer.category);
  audio.reveal(currentAnswer.category);
  speech.speak(currentAnswer.text, currentAnswer.category);
  accessibility.announce(`${currentAnswer.category.replace("_", " ")}: ${currentAnswer.text}`);

  elements.shakeButton.hidden = true;
  elements.againButton.hidden = false;
  setStatus(currentAnswer.category === "RARE_TRUTH"
    ? "The frog became unexpectedly reasonable."
    : "Verdict delivered. No refunds.");

  if (currentAnswer.category === "FATAL") {
    setStatus("Fatal verdict. The frog is preparing relocation.");
    await new Promise(resolve => setTimeout(resolve, 1300));
    const fatalResult = await effects.fatalSequence(currentAnswer.text);
    if (!fatalResult.redirected) {
      document.body.classList.remove("is-busy");
      elements.againButton.hidden = false;
      elements.againButton.focus({ preventScroll: true });
    }
  } else {
    document.body.classList.remove("is-busy");
    elements.againButton.focus({ preventScroll: true });
  }

  revealInProgress = false;
}

function bindReplay() {
  elements.againButton.addEventListener("click", () => {
    speech.cancel();
    effects.clear();
    effects.hideFatal();
    currentAnswer = null;
    revealInProgress = false;
    document.body.classList.remove("is-busy");
    document.body.dataset.theme = "IDLE";
    scene.setTheme("IDLE");
    frog.reset();
    interaction?.reset();
    elements.againButton.hidden = true;
    elements.shakeButton.hidden = false;
    setStatus("Mouse, touch, Enter, or Space");
    elements.orb.focus({ preventScroll: true });
  });
}

async function bootstrap() {
  document.querySelector("#year").textContent = new Date().getFullYear();
  elements.shakeButton.disabled = true;
  setStatus("Assembling the BeeTales frog oracle...");

  try {
    const [frogResult] = await Promise.allSettled([frog.init(), scene.init()]);
    if (frogResult.status === "rejected") throw frogResult.reason;

    interaction = new InteractionController({
      orb: elements.orb,
      stage: elements.stage,
      button: elements.shakeButton,
      frog,
      audio,
      scene,
      onTrigger: revealAnswer,
      onStatus: setStatus,
    });

    elements.shakeButton.disabled = false;
    setStatus("Grab the spherical frog and shake it left and right.");
    console.info(`[Benchmark] Interactive oracle ready in ${Math.round(performance.now() - APP_START)} ms.`);
  } catch (error) {
    console.error("The 3D frog could not be initialized.", error);
    elements.orb.classList.remove("is-loading");
    elements.orb.classList.add("webgl-failed");
    elements.shakeButton.disabled = true;
    setStatus("The frog interface could not initialize. Reload the page in a current browser.");
    accessibility.announce("The frog oracle could not load.");
  }
}

try {
  const inventory = validateAnswerInventory();
  console.info("Frog oracle answer inventory:", inventory);
} catch (error) {
  console.error(error);
  setStatus("The frog's answer database is broken. Check the console.");
}

bindReplay();
bootstrap();
