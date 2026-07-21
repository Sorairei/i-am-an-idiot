import { getBoolean, getString, setString } from "./storage.js";

export const LANG_STORAGE_KEY = "beetales-idiot-lang";

export const SUPPORTED_LANGS = ["en", "es", "pt", "pl"];
let currentLang = "en";

export const UI = {
  en: {
    "nav-sponsor": "Sponsor",
    "nav-sound": "Sound",
    "nav-voice": "Voice",
    "nav-help": "Help",
    "nav-lang": "Lang",
    "page-title": "AM I AN IDIOT?",
    "instruction": "Grab the frog, shake it hard, and face the truth.",
    "loading": "BUILDING THE 3D ORACLE",
    "answer-category-initial": "THE FROG SAYS",
    "answer-text-initial": "Shake to reveal your verdict.",
    "energy-label": "SHAKE ENERGY",
    "shake-button": "SHAKE THE FROG",
    "again-button": "ASK AGAIN",
    "status-text": "Mouse, touch, Enter, or Space",
    "footer-text": "A harmless decision simulator. Probably.",
    "help-title": "How to consult the frog",
    "help-desktop": "<strong>Desktop:</strong> hold the frog and drag rapidly left and right. Release when the meter is full.",
    "help-mobile": "<strong>Mobile:</strong> drag the frog quickly with one finger, or use the Shake button.",
    "help-keyboard": "<strong>Keyboard:</strong> focus the frog and press Enter or Space.",
    "help-desc": "Answers range from harmless nonsense to rare moments of actual wisdom. The frog is a real WebGL SphereGeometry with a curved BeeTales texture, independent animated 3D eyes, pointer tracking, blinking, expressive reactions, dynamic lighting, and a rotating answer window. The FATAL result is extremely rare and starts a cancellable joke redirect.",
    "help-confirm": "I UNDERSTAND THE RISKS",
    "fatal-code": "FATAL ERROR",
    "fatal-message": "The frog has reached a final conclusion.",
    "fatal-eliminated": "YOU HAVE BEEN ELIMINATED BY THE FROG.",
    "fatal-countdown": "Relocating in {n}...",
    "fatal-escape": "ESCAPE THIS TERRIBLE FATE",
    "lang-title": "Select Language"
  },
  es: {
    "nav-sponsor": "Apoyar",
    "nav-sound": "Sonido",
    "nav-voice": "Voz",
    "nav-help": "Ayuda",
    "nav-lang": "Idioma",
    "page-title": "¿SOY UN IDIOTA?",
    "instruction": "Agarra a la rana, agítala fuerte y enfréntate a la verdad.",
    "loading": "CONSTRUYENDO EL ORÁCULO 3D",
    "answer-category-initial": "LA RANA DICE",
    "answer-text-initial": "Agita para revelar tu veredicto.",
    "energy-label": "ENERGÍA",
    "shake-button": "AGITAR LA RANA",
    "again-button": "PREGUNTAR DE NUEVO",
    "status-text": "Ratón, dedo, Enter o Espacio",
    "footer-text": "Un simulador inofensivo de decisiones. Probablemente.",
    "help-title": "Cómo consultar a la rana",
    "help-desktop": "<strong>PC:</strong> mantén clic en la rana y arrastra rápido de izquierda a derecha.",
    "help-mobile": "<strong>Móvil:</strong> arrastra la rana rápidamente con un dedo, o usa el botón Agitar.",
    "help-keyboard": "<strong>Teclado:</strong> enfoca la rana y presiona Enter o Espacio.",
    "help-desc": "Las respuestas van desde tonterías inofensivas hasta raros momentos de verdadera sabiduría. La rana es una SphereGeometry WebGL real con una textura curvada de BeeTales, ojos 3D animados, parpadeo, reacciones expresivas y una ventana de respuestas giratoria. El resultado FATAL es extremadamente raro e inicia una redirección de broma.",
    "help-confirm": "ENTIENDO LOS RIESGOS",
    "fatal-code": "ERROR FATAL",
    "fatal-message": "La rana ha llegado a una conclusión final.",
    "fatal-eliminated": "HAS SIDO ELIMINADO POR LA RANA.",
    "fatal-countdown": "Reubicando en {n}...",
    "fatal-escape": "ESCAPAR DE ESTE TERRIBLE DESTINO",
    "lang-title": "Seleccionar Idioma"
  },
  pt: {
    "nav-sponsor": "Apoiar",
    "nav-sound": "Som",
    "nav-voice": "Voz",
    "nav-help": "Ajuda",
    "nav-lang": "Idioma",
    "page-title": "SOU UM IDIOTA?",
    "instruction": "Pegue o sapo, agite com força e encare a verdade.",
    "loading": "CONSTRUINDO O ORÁCULO 3D",
    "answer-category-initial": "O SAPO DIZ",
    "answer-text-initial": "Agite para revelar o seu veredito.",
    "energy-label": "ENERGIA",
    "shake-button": "AGITAR O SAPO",
    "again-button": "PERGUNTAR NOVAMENTE",
    "status-text": "Mouse, toque, Enter ou Espaço",
    "footer-text": "Um simulador inofensivo de decisões. Provavelmente.",
    "help-title": "Como consultar o sapo",
    "help-desktop": "<strong>PC:</strong> segure o sapo e arraste rapidamente para os lados.",
    "help-mobile": "<strong>Mobile:</strong> arraste o sapo rapidamente com o dedo, ou use o botão Agitar.",
    "help-keyboard": "<strong>Teclado:</strong> foque no sapo e pressione Enter ou Espaço.",
    "help-desc": "As respostas variam de bobagens inofensivas a raros momentos de verdadeira sabedoria. O sapo é uma SphereGeometry WebGL real com olhos 3D animados, rastreamento de ponteiro, piscar de olhos, reações e iluminação dinâmica. O resultado FATAL é extremamente raro e inicia um redirecionamento brincadeira.",
    "help-confirm": "EU ENTENDO OS RISCOS",
    "fatal-code": "ERRO FATAL",
    "fatal-message": "O sapo chegou a uma conclusão final.",
    "fatal-eliminated": "VOCÊ FOI ELIMINADO PELO SAPO.",
    "fatal-countdown": "Realocando em {n}...",
    "fatal-escape": "ESCAPAR DESTE DESTINO TERRÍVEL",
    "lang-title": "Selecionar Idioma"
  },
  pl: {
    "nav-sponsor": "Wesprzyj",
    "nav-sound": "Dźwięk",
    "nav-voice": "Głos",
    "nav-help": "Pomoc",
    "nav-lang": "Język",
    "page-title": "CZY JESTEM IDIOTĄ?",
    "instruction": "Złap żabę, potrząśnij mocno i zmierz się z prawdą.",
    "loading": "BUDOWANIE WYROCZNI 3D",
    "answer-category-initial": "ŻABA MÓWI",
    "answer-text-initial": "Potrząśnij, aby poznać werdykt.",
    "energy-label": "ENERGIA",
    "shake-button": "POTRZĄŚNIJ ŻABĄ",
    "again-button": "ZAPYTAJ PONOWNIE",
    "status-text": "Myszka, dotyk, Enter lub Spacja",
    "footer-text": "Nieszkodliwy symulator decyzji. Prawdopodobnie.",
    "help-title": "Jak skonsultować się z żabą",
    "help-desktop": "<strong>PC:</strong> przytrzymaj żabę i szybko przeciągnij w lewo i prawo.",
    "help-mobile": "<strong>Mobile:</strong> szybko przeciągnij żabę palcem, lub użyj przycisku Potrząśnij.",
    "help-keyboard": "<strong>Klawiatura:</strong> wybierz żabę i naciśnij Enter lub Spację.",
    "help-desc": "Odpowiedzi wahają się od nieszkodliwych bzdur po rzadkie chwile prawdziwej mądrości. Żaba to prawdziwa geometria sferyczna WebGL z animowanymi oczami 3D, mruganiem, reakcjami i obrotowym oknem odpowiedzi. Werdykt FATALNY jest rzadki i uruchamia fałszywe przekierowanie.",
    "help-confirm": "ROZUMIEM RYZYKO",
    "fatal-code": "BŁĄD FATALNY",
    "fatal-message": "Żaba podjęła ostateczną decyzję.",
    "fatal-eliminated": "ZOSTAŁEŚ WYELIMINOWANY PRZEZ ŻABĘ.",
    "fatal-countdown": "Relokacja za {n}...",
    "fatal-escape": "UCIECZKA PRZED TYM LOSEM",
    "lang-title": "Wybierz język"
  }
};

export function initI18n() {
  const saved = getString(LANG_STORAGE_KEY, null);
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    currentLang = saved;
  } else {
    currentLang = "en";
  }
  document.documentElement.lang = currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  setString(LANG_STORAGE_KEY, lang);
  document.documentElement.lang = currentLang;
  applyTranslations();
  
  // Dispatch event so other modules (like answer engine) can update
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}

export function getLang() {
  return currentLang;
}

export function t(key, params = {}) {
  let text = UI[currentLang]?.[key] || UI.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!UI.en[key]) return; // Fallback missing keys
    
    // For help dialog which uses HTML
    if (el.innerHTML.includes("<") || UI.en[key].includes("<")) {
      el.innerHTML = t(key);
    } else {
      // Find the first text node and replace it, leaving elements like spans/icons intact
      let replaced = false;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
          node.nodeValue = t(key);
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        el.textContent = t(key);
      }
    }
  });

  // Specific for Shake Button which has an icon
  const shakeBtn = document.getElementById("shake-button");
  if (shakeBtn) {
    const icon = shakeBtn.querySelector(".button-icon");
    shakeBtn.innerHTML = "";
    if (icon) shakeBtn.appendChild(icon);
    shakeBtn.appendChild(document.createTextNode(" " + t("shake-button")));
  }
}
