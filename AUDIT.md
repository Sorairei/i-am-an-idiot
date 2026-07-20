# V7 Geometry and Performance Audit

## Sphere implementation

- The oracle core is a real `THREE.SphereGeometry(1, 64, 48)`, not a CSS plane, cylinder, card, or coin.
- The BeeTales avatar is cleaned in-browser and composited directly into the equirectangular texture mapped onto the single curved sphere using `MeshStandardMaterial`.
- Transparent margins keep the helmet and mouth away from the UV poles to reduce stretching.
- The rear Magic-8-Ball socket is attached to the sphere as actual Three.js geometry.
- Ambient and three point lights create visible curvature, shading, rim light, and depth.
- A slow continuous full Y-axis idle rotation demonstrates the round silhouette from every angle; result reveal pauses that rotation and aligns the rear window with the camera.

## Runtime safeguards

- Three.js r166 is included locally under `js/vendor/`, preventing CDN failures and version drift.
- Pixel ratio is capped at 1.5 on desktop and 1.15 on smaller screens.
- The frog renders at 30 FPS while idle and switches to 60 FPS only while shaking or rotating to a result.
- The separate atmospheric Canvas 2D background retains its adaptive 30/60 FPS pacing.
- Rendering pauses when the page is hidden.
- Sphere meshes and textures are created once and reused; no geometry is allocated during shaking.

## Completed validation

The final package was exercised in Chromium with software WebGL under the same browser session used for the functional tests.

- WebGL initialized successfully and the oracle became interactive in approximately 586 ms in the controlled desktop run.
- Front and side screenshots confirmed a round silhouette at different Y-axis angles; the object never collapses into a disc.
- The supplied face texture remained centred on the curved surface and did not cross the UV poles or seam.
- A real mouse zigzag reached 100% shake energy and revealed a weighted random answer without console errors.
- The fallback Shake button completed the same result flow on desktop and a 390 × 844 touch-oriented mobile viewport.
- A forced FATAL result activated the red sequence, displayed its countdown, and was cancelled successfully with the escape control.
- `DEV_FORCE_RESULT` was restored to `null`, `ENABLE_FATAL_REDIRECT` was restored to `true`, and FATAL remains weighted at 0.5%.
- Footer attribution displays `The BeeTales - Sorairei`, with Sorairei linked to `https://github.com/Sorairei`.

The automated environment uses software rendering, so its absolute GPU timing is not representative of a normal computer. The tests are useful for confirming initialization, interaction, geometry, routing, and the absence of JavaScript errors.
