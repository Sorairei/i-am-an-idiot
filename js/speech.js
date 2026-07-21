import { SPEECH_STORAGE_KEY } from "./config.js";
import { getBoolean, setBoolean } from "./storage.js";
import { getLang } from "./i18n.js";

const SETTINGS = Object.freeze({
  COMMON: { rate: 1.0, pitch: 1.05 },
  SNARKY: { rate: 1.05, pitch: 0.95 },
  SAVAGE: { rate: 0.92, pitch: 0.75 },
  RARE_TRUTH: { rate: 0.88, pitch: 0.95 },
  FATAL: { rate: 0.72, pitch: 0.45 },
});

export class SpeechManager {
  constructor() {
    this.supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    this.enabled = this.supported && getBoolean(SPEECH_STORAGE_KEY, true);
    this.voices = [];
    if (this.supported) {
      this.refreshVoices();
      speechSynthesis.addEventListener?.("voiceschanged", () => this.refreshVoices());
    }
  }

  refreshVoices() {
    this.voices = speechSynthesis.getVoices();
  }

  setEnabled(value) {
    this.enabled = this.supported && Boolean(value);
    setBoolean(SPEECH_STORAGE_KEY, this.enabled);
    if (!this.enabled && this.supported) speechSynthesis.cancel();
  }

  speak(text, category) {
    if (!this.supported || !this.enabled) return false;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = getLang();
    const regex = new RegExp(`^${lang}(_|-|$)`, "i");
    const preferredNameRegex = /male|daniel|david|alex|george|jorge|pablo|joao|tiago|krzysztof|jan|tomasz/i;
    
    const preferred = this.voices.find(voice => regex.test(voice.lang) && preferredNameRegex.test(voice.name))
      || this.voices.find(voice => regex.test(voice.lang));
      
    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang || (lang === 'en' ? 'en-US' : (lang === 'es' ? 'es-ES' : (lang === 'pt' ? 'pt-BR' : 'pl-PL')));
    utterance.rate = SETTINGS[category]?.rate ?? 1;
    utterance.pitch = SETTINGS[category]?.pitch ?? 1;
    utterance.volume = 0.86;
    speechSynthesis.speak(utterance);
    return true;
  }

  cancel() {
    if (this.supported) speechSynthesis.cancel();
  }
}
