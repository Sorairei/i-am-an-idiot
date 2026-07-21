import { ANSWERS } from "./answers.js";
import { CATEGORY_WEIGHTS, DEV_FORCE_RESULT, HISTORY_SIZE, HISTORY_STORAGE_KEY } from "./config.js";
import { getSessionList, setSessionList } from "./storage.js";
import { getLang } from "./i18n.js";

const VALID_CATEGORIES = Object.keys(CATEGORY_WEIGHTS);

function secureRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 0x100000000;
  }
  return Math.random();
}

function weightedCategory() {
  if (DEV_FORCE_RESULT && VALID_CATEGORIES.includes(DEV_FORCE_RESULT)) return DEV_FORCE_RESULT;

  const total = Object.values(CATEGORY_WEIGHTS).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.0001) throw new Error(`Category weights must total 100. Current total: ${total}`);

  let cursor = secureRandom() * 100;
  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    if (cursor < weight) return category;
    cursor -= weight;
  }
  return "COMMON";
}

export function selectResult() {
  const category = weightedCategory();
  const history = getSessionList(HISTORY_STORAGE_KEY);
  const recentIds = new Set(history.slice(-HISTORY_SIZE));
  const categoryAnswers = ANSWERS[getLang()].filter(answer => answer.category === category);
  const freshAnswers = categoryAnswers.filter(answer => !recentIds.has(answer.id));
  const pool = freshAnswers.length ? freshAnswers : categoryAnswers;
  const answer = pool[Math.floor(secureRandom() * pool.length)];

  const updatedHistory = [...history, answer.id].slice(-HISTORY_SIZE);
  setSessionList(HISTORY_STORAGE_KEY, updatedHistory);
  return answer;
}

export function validateAnswerInventory() {
  const counts = Object.fromEntries(VALID_CATEGORIES.map(category => [category, 0]));
  for (const answer of ANSWERS[getLang()]) {
    if (!VALID_CATEGORIES.includes(answer.category)) throw new Error(`Unknown answer category: ${answer.category}`);
    counts[answer.category] += 1;
  }
  return counts;
}
