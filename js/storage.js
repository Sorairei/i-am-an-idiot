export function getBoolean(key, fallback = true) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

export function setBoolean(key, value) {
  try { localStorage.setItem(key, String(Boolean(value))); } catch { /* Storage is optional. */ }
}

export function getString(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setString(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Storage is optional. */ }
}

export function getSessionList(key) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setSessionList(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
