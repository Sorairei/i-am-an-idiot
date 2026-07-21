import { AudioManager } from "./audio.js";
import { SpeechManager } from "./speech.js";
import { SceneController } from "./scene.js";
import { FrogBall } from "./frogBall.js";
import { InteractionController } from "./interaction.js";
import { EffectsController } from "./effects.js";
import { AccessibilityController } from "./accessibility.js";
import { selectResult, validateAnswerInventory } from "./resultEngine.js";
import { initI18n, setLang, applyTranslations, t } from "./i18n.js";

const APP_START = performance.now();
const $ = selector => document.querySelector(selector);

const elements = {
  canvas: $("#scene-canvas"),
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
  langDialog: $("#lang-dialog"),
  langButton: $("#lang-button"),
};

initI18n();
applyTranslations();

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

syncToggle(elements.soundToggle, audio.enabled, t("nav-sound-mute") || "Mute sound", t("nav-sound-enable") || "Enable sound");
syncToggle(elements.voiceToggle, speech.enabled, t("nav-voice-disable") || "Disable voice", t("nav-voice-enable") || "Enable voice");

if (!speech.supported) {
  elements.voiceToggle.disabled = true;
  elements.voiceToggle.title = t("voice-unavailable-title") || "Speech synthesis is unavailable in this browser.";
  elements.voiceToggle.setAttribute("aria-label", t("voice-unavailable") || "Voice unavailable");
}

elements.soundToggle.addEventListener("click", async () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) await audio.ensureStarted();
  syncToggle(elements.soundToggle, audio.enabled, t("nav-sound-mute") || "Mute sound", t("nav-sound-enable") || "Enable sound");
});

elements.voiceToggle.addEventListener("click", () => {
  speech.setEnabled(!speech.enabled);
  syncToggle(elements.voiceToggle, speech.enabled, t("nav-voice-disable") || "Disable voice", t("nav-voice-enable") || "Enable voice");
});

elements.langButton.addEventListener("click", () => {
  elements.langDialog.showModal();
});

document.querySelectorAll(".lang-option").forEach(btn => {
  btn.addEventListener("click", () => {
    setLang(btn.dataset.lang);
  });
});

async function revealAnswer() {
  if (revealInProgress) return;
  revealInProgress = true;
  document.body.classList.add("is-busy");
  setStatus(t("status-rotating") || "The 3D oracle is rotating toward the answer window...");

  const revealStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 100));
  currentAnswer = selectResult();
  document.body.dataset.theme = currentAnswer.category;
  scene.setTheme(currentAnswer.category);
  frog.reveal(currentAnswer);

  await new Promise(resolve => setTimeout(resolve, 470));
  console.info(`[Benchmark] Verdict visible in ${Math.round(performance.now() - revealStart)} ms.`);
  effects.burst(currentAnswer.category);
  audio.reveal(currentAnswer.category);
  speech.speak(currentAnswer.text, currentAnswer.category);
  accessibility.announce(`${currentAnswer.category.replace("_", " ")}: ${currentAnswer.text}`);

  elements.shakeButton.hidden = true;
  elements.againButton.hidden = false;
  setStatus(currentAnswer.category === "RARE_TRUTH"
    ? (t("status-rare-truth") || "The frog became unexpectedly reasonable.")
    : (t("status-verdict") || "Verdict delivered. No refunds."));

  if (currentAnswer.category === "FATAL") {
    setStatus(t("status-fatal") || "Fatal verdict. The frog is preparing relocation.");
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
    setStatus(t("status-text"));
    elements.orb.focus({ preventScroll: true });
  });
}

async function bootstrap() {
  document.querySelector("#year").textContent = new Date().getFullYear();
  elements.shakeButton.disabled = true;
  setStatus(t("status-loading") || "Assembling the BeeTales frog oracle...");

  try {
    const [frogResult] = await Promise.allSettled([frog.init(), scene.init()]);
    if (frogResult.status === "rejected") throw frogResult.reason;

    // Create the suspended audio graph before enabling interaction. This moves
    // the one-time browser audio setup out of the player's first shake.
    audio.prewarm();

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
    setStatus(t("status-ready") || "Grab the spherical frog and shake it left and right.");
    performance.mark("oracle-interactive");
    console.info(`[Benchmark] Interactive oracle ready in ${Math.round(performance.now() - APP_START)} ms.`);
  } catch (error) {
    console.error("The 3D frog could not be initialized.", error);
    elements.orb.classList.remove("is-loading");
    elements.orb.classList.add("webgl-failed");
    elements.shakeButton.disabled = true;
    setStatus(t("status-failed") || "The frog interface could not initialize. Reload the page in a current browser.");
    accessibility.announce(t("announce-failed") || "The frog oracle could not load.");
  }
}

try {
  const inventory = validateAnswerInventory();
  console.info("Frog oracle answer inventory:", inventory);
} catch (error) {
  console.error(error);
  setStatus(t("status-broken") || "The frog's answer database is broken. Check the console.");
}

bindReplay();
bootstrap();

// Append ?perf=1 to the URL to display live FPS, frame pacing, input latency,
// long-task and memory measurements. The diagnostic module is not downloaded
// during normal gameplay.
if (new URLSearchParams(location.search).get("perf") === "1") {
  import("./performanceMonitor.js")
    .then(({ startPerformanceMonitor }) => startPerformanceMonitor())
    .catch(error => console.warn("Performance monitor unavailable.", error));
}
