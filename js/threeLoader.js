import * as THREE from "./vendor/three.module.min.js";

// Three.js is vendored with the project so GitHub Pages never depends on a CDN.
export async function loadThree() {
  return THREE;
}
