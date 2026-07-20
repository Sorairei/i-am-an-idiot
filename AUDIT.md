# V8 Personality and Animated-Eye Audit

## Implementation

- The frog remains a real `THREE.SphereGeometry(1, 64, 48)` using `MeshStandardMaterial` and dynamic lighting.
- Static pupils were removed from the mapped avatar derivative so the eyes no longer look baked into the texture.
- Each eye is now assembled from independent Three.js geometry: curved eye bulge, iris, ring, pupil, two highlights, and blink line.
- Eye anchors are placed tangentially on the sphere and rotate naturally with the head from different angles.
- Pupils track pointer movement with damping and remain constrained inside the lens area.
- During interaction, the idle sphere gently returns toward the player so the animated face remains visible.
- Personality behavior includes idle micro-saccades, normal blinks, occasional double blinks, shake reactions, and annoyed side-eye after an insufficient attempt.
- Category-specific eye expressions are configured for COMMON, SNARKY, SAVAGE, RARE_TRUTH, and FATAL.

## Performance safeguards

- Eye geometry and materials are created once during initialization and reused.
- No geometry, textures, or materials are allocated during pointer movement or shaking.
- The frog renders at 30 FPS while idle and switches to 60 FPS only during pointer tracking, blinking, shaking, reactions, or result rotation.
- Pixel ratio remains capped at 1.5 on desktop and 1.15 on smaller screens.
- Three.js remains bundled locally, so no CDN request is required.
- The pre-cleaned eye-base asset removes the expensive runtime connected-component image cleanup from the normal startup path.

## Completed validation

The package was tested in Chromium using software WebGL in a visible Xvfb browser session.

- Desktop initialization completed without JavaScript errors.
- The animated eyes appeared in the correct goggle positions on the curved sphere.
- Pointer movement visibly moved both pupils while keeping them inside their lenses.
- A forced failed shake activated the blink and annoyed side-eye reaction.
- A real mouse zigzag reached 100% shake energy and revealed a random answer.
- The fallback Shake button completed the result flow.
- A 390 × 844 mobile viewport loaded without overflow and completed the result flow.
- The rear Magic-8-Ball answer window still aligned with the camera after the personality changes.
- The answer inventory and weighted category system remained intact.
- `DEV_FORCE_RESULT` remains `null`, `ENABLE_FATAL_REDIRECT` remains `true`, and FATAL remains weighted at 0.5%.
- Footer attribution remains `The BeeTales - Sorairei`, with Sorairei linked to `https://github.com/Sorairei`.

The automated browser uses software rendering, so absolute GPU timing is not representative of a normal device. The validation confirms initialization, geometry, animation, input, mobile layout, and the absence of application errors.
