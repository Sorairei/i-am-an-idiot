# Am I an Idiot? — The BeeTales Frog Oracle

A satirical interactive frog oracle designed for GitHub Pages. Shake the spherical BeeTales frog with a mouse or finger, receive a weighted-rarity verdict, and try not to encounter the rare FATAL result.

The frog is a browser-native CSS 3D sphere with volumetric depth, a construction helmet, orange safety goggles, animated eyes, and independently rotating front and answer surfaces. Its design is based on the supplied BeeTales avatar while remaining fully interactive rather than using the reference image as a flat sprite.

## Features

- Spherical CSS 3D BeeTales frog with helmet, goggles, face, depth, highlights, and shadow
- Mouse and touch shaking with direction reversal, velocity scoring, inertia, jitter, and pointer capture
- Eyes that follow the pointer
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
- CSS3 and CSS 3D transforms
- Vanilla JavaScript ES modules
- Canvas 2D for the atmospheric background
- Web Audio API
- Web Speech API

The project uses no framework, npm package, CDN, or server-side component. It can be published directly through GitHub Pages.

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
│   └── responsive.css
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
│   └── performanceMonitor.js
└── assets/
    ├── images/
    │   ├── beetales-avatar.webp
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

## Edit answers

Open `js/answers.js`. Each entry follows this structure:

```js
{ id: "c01", category: "COMMON", text: "Probably, but the evidence is still loading." }
```

Supported categories:

- `COMMON`
- `SNARKY`
- `SAVAGE`
- `RARE_TRUTH`
- `FATAL`

Keep each answer ID unique.

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

Use:

```js
export const DEV_FORCE_RESULT = "FATAL";
export const ENABLE_FATAL_REDIRECT = false;
```

The complete effect and countdown will run, but the browser will remain on the site. Return the settings to:

```js
export const DEV_FORCE_RESULT = null;
export const ENABLE_FATAL_REDIRECT = true;
```

The configured redirect is:

```text
https://replug.link/ccef1e2c
```

A visible escape button and the Escape key can cancel the redirect.

## Performance diagnostics

Append `?perf=1` to the site URL:

```text
https://username.github.io/repository/?perf=1
```

The optional overlay shows:

- FPS
- P95 frame duration
- Pointer-to-frame latency
- Long-task count and duration
- JavaScript heap usage when supported
- DOM-node count

The monitor is dynamically imported and is not downloaded during normal gameplay. Benchmark methodology and before/after results are documented in `AUDIT.md`.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload the contents of this project.
3. Open the repository's **Settings**.
4. Select **Pages**.
5. Under **Build and deployment**, select **Deploy from a branch**.
6. Select the `main` branch and `/ (root)`.
7. Save and open the generated GitHub Pages URL after deployment finishes.

All project paths are relative, so the site works inside a GitHub Pages repository subdirectory. GitHub Actions are not required.

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

Current Chrome, Edge, Firefox, and Safari releases support the required JavaScript modules, Canvas 2D, and CSS transforms. The project does not require WebGL.

Web Speech API voice availability and quality vary by browser and operating system. If speech synthesis is unsupported, the voice control is disabled without affecting the game.

The audio graph is prepared silently before controls are enabled, but playback and resume occur only in response to user interaction. No audio autoplays on page load.

## Privacy

All answer selection and game logic run locally in the browser. The project does not collect or transmit personal data and uses no analytics, cookies, camera, microphone, or device-motion permissions. The only intentional external navigation is the configurable FATAL redirect.

## License

MIT. Copyright © 2026 Sorairei. BeeTales logos and character artwork remain the property of their owner and are included for this project rather than granted for unrelated branding use.
