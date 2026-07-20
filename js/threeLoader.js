const THREE_MODULE_URLS = Object.freeze([
  "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.min.js",
  "https://unpkg.com/three@0.166.1/build/three.module.min.js",
]);

let modulePromise = null;

async function importFromAvailableCdn() {
  const failures = [];

  for (const url of THREE_MODULE_URLS) {
    try {
      return await import(url);
    } catch (error) {
      failures.push({ url, error });
      console.warn(`Unable to load Three.js from ${url}. Trying the next source.`, error);
    }
  }

  const finalError = new Error("Three.js could not be loaded from any configured CDN.");
  finalError.failures = failures;
  throw finalError;
}

export function loadThree() {
  if (!modulePromise) {
    modulePromise = importFromAvailableCdn().catch(error => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}
