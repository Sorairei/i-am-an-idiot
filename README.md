# Am I an Idiot? — The BeeTales Frog Oracle

A satirical interactive frog oracle designed for GitHub Pages. Shake the spherical BeeTales frog with a mouse or finger, receive a weighted-rarity verdict, and try not to encounter the rare FATAL result.

The frog is a genuine WebGL sphere built with Three.js `SphereGeometry(1, 64, 48)`. The BeeTales artwork is mapped onto the curved surface, while both eyes are separate Three.js objects with their own pupils, highlights, blinking, micro-movements, and reactions.

## Features

- True Three.js `SphereGeometry` frog with 64×48 segments
- Independent animated 3D eyes that follow the mouse or touch movement
- Natural blinking, occasional double blinks, idle eye movements, and playful side-eye reactions
- Eyes react to shaking, failed attempts, and answer categories
- The sphere turns back toward the player during pointer interaction
- Mouse and touch shaking with direction reversal, velocity scoring, inertia, jitter, and pointer capture
- Magic-8-Ball-style rotating answer window
- Lightweight Canvas 2D particles, parallax, and orbital atmosphere
- Mouse, touch, keyboard, and fallback-button controls
- 122 original English answers across five weighted categories
- FATAL probability of 0.5%, with cancellable countdown and configurable joke redirect
- Generated sound effects through the Web Audio API
- Optional browser text-to-speech
- Reduced-motion and mobile-performance adaptations
- Optional live performance overlay
- No database, analytics, cookies, camera, microphone, paid API, build process, or GitHub Actions

## Technology

- HTML5
- CSS3
- Vanilla JavaScript ES modules
- Three.js r166 included locally as a pinned ES module
- Canvas 2D for the atmospheric background
- Web Audio API
- Web Speech API

The project uses no framework, npm installation, build process, CDN, or server-side component. It can be published directly through GitHub Pages.

## Project structure

```text
am-i-an-idiot/
├── index.html
├── 404.html
├── README.md
├── AUDIT.md
├── LICENSE
├── benchmarks/
│   └── performance-summary.json
├── css/
│   ├── styles.css
│   ├── effects.css
│   ├── responsive.css
│   └── sphere3d.css
├── js/
│   ├── main.js
│   ├── config.js
│   ├── answers.js
│   ├── storage.js
│   ├── resultEngine.js
│   ├── audio.js
│   ├── speech.js
│   ├── scene.js
│   ├── frogBall.js
│   ├── interaction.js
│   ├── effects.js
│   ├── accessibility.js
│   ├── performanceMonitor.js
│   └── vendor/
│       └── three.module.min.js
└── assets/
    ├── images/
    │   ├── beetales-avatar.webp
    │   ├── beetales-avatar-eye-base.webp
    │   ├── beetales-logo-v2.webp
    │   └── beetales-logo-v2.png
    └── icons/
        ├── favicon.ico
        └── favicon.png
```

## Run locally in Visual Studio Code

Because the project uses JavaScript modules, run it through a local web server rather than double-clicking `index.html`.

1. Open the project folder in Visual Studio Code.
2. Install the free **Live Server** extension.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

No terminal command, dependency installation, compilation, or build step is required.

## How to shake the frog

### Mouse

Hold the left mouse button over the frog, move rapidly left and right several times, and release when the meter reaches 100%. Reversing direction earns more energy than dragging once across the screen.

### Touch

Hold the frog and drag rapidly left and right with one finger. Pointer capture keeps the shake active if the finger briefly moves outside the model.

### Keyboard and fallback

Focus the frog and press Enter or Space, or select **SHAKE THE FROG**. The fallback button performs the complete animated shake.

## Eye personality system

The face texture no longer contains static pupils. The pupils, irises, highlights, and eye bulges are separate Three.js objects attached to the curved sphere.

The eye system includes:

- Pointer and touch tracking
- Smooth interpolation instead of instant jumps
- Random idle micro-saccades
- Automatic and occasional double blinking
- A brief annoyed side-eye after an insufficient shake
- Extra jitter and widened pupils while shaking
- Category-specific expressions for COMMON, SNARKY, SAVAGE, RARE_TRUTH, and FATAL
- A red FATAL pupil glow before the sphere turns to the answer window

## Edit answers

Open `js/answers.js`. Each entry follows this structure:

```js
{ id: "c01", category: "COMMON", text: "Probably, but the evidence is still loading." }
```

Supported categories: `COMMON`, `SNARKY`, `SAVAGE`, `RARE_TRUTH`, and `FATAL`. Keep each answer ID unique.

## Change probabilities

Open `js/config.js` and edit `CATEGORY_WEIGHTS`. Values must total exactly 100.

```js
COMMON: 49.7
SNARKY: 28
SAVAGE: 15
RARE_TRUTH: 6.8
FATAL: 0.5
```

## Force a result for testing

In `js/config.js`, change:

```js
export const DEV_FORCE_RESULT = null;
```

To one of:

```js
"COMMON"
"SNARKY"
"SAVAGE"
"RARE_TRUTH"
"FATAL"
```

Return it to `null` before publishing.

## Test FATAL without leaving the page

```js
export const DEV_FORCE_RESULT = "FATAL";
export const ENABLE_FATAL_REDIRECT = false;
```

The complete effect and countdown will run, but the browser will remain on the site. Restore `DEV_FORCE_RESULT` to `null` and `ENABLE_FATAL_REDIRECT` to `true` before publishing.

The configured redirect is `https://replug.link/ccef1e2c`. A visible escape button and the Escape key can cancel it.

## Performance diagnostics

Append `?perf=1` to the deployed URL. The optional overlay shows FPS, P95 frame duration, pointer-to-frame latency, long tasks, heap usage when supported, and DOM-node count. The monitor is dynamically imported and adds no cost during normal gameplay.

## Publish with GitHub Pages

1. Upload the project contents to a repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Select `main` and `/ (root)`.
5. Save and open the generated URL after deployment finishes.

All paths are relative, so the site works inside a GitHub Pages repository subdirectory. GitHub Actions are not required.

## Accessibility

- Enter and Space keyboard activation
- Visible focus indicators
- ARIA labels and live result announcements
- Touch-friendly controls
- Reduced-motion behavior
- Visual feedback independent of sound and voice
- Cancellable FATAL redirect
- No unsafe rapid flashing

## Browser notes

Current Chrome, Edge, Firefox, and Safari releases support the required modules, Canvas 2D, and WebGL. WebGL is required for the geometric sphere and animated eyes. Web Speech API voice availability varies by browser and operating system.

## Privacy

All answer selection and game logic run locally in the browser. The project does not collect or transmit personal data and uses no analytics, cookies, camera, microphone, or device-motion permissions. The only intentional external navigation is the configurable FATAL redirect.

## License

MIT. Copyright © 2026 The BeeTales - Sorairei. BeeTales logos and character artwork remain the property of their owner and are included for this project rather than granted for unrelated branding use.
