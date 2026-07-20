# Am I an Idiot? — The BeeTales Frog Oracle

A satirical, interactive frog-oracle website designed for GitHub Pages. The user physically shakes a real-time 3D frog with the mouse or a finger, receives a weighted-rarity verdict, and may encounter an extremely rare FATAL result.

The 3D frog is generated from Three.js geometry at runtime. Its bright green face, construction helmet, orange safety goggles, oversized eyes, nostrils, and smile were designed to resemble the supplied `beetales-avatar.png` without displaying that image as the interactive character.

The supplied BeeTales logo and favicon are used directly by the website. The avatar remains included as the visual reference and as a fallback image for browsers that cannot initialize WebGL.

## Features

- Real-time 3D BeeTales worker frog constructed from spheres, curves, rings, lights, and materials
- Modeled yellow construction helmet, orange safety lenses, black goggle frame, and animated eyes
- Actual mouse and touch shaking with rotation, translation, inertia, jitter, and direction-reversal detection
- Frog eyes follow the pointer before an answer is revealed
- Idle floating and breathing animation
- The frog physically rotates 180 degrees to reveal a Magic-8-Ball-style answer window on its back
- Three.js atmospheric particle background
- Mouse, touch, keyboard, and button controls
- Weighted answer rarity system
- 95 original English responses
- Procedural sound effects through the Web Audio API
- Optional browser text-to-speech
- Reduced-motion support
- Cancellable FATAL countdown and configurable redirect
- No database, cookies, analytics, microphone, camera, or motion permission
- No build step, npm, or GitHub Actions

## Technology

- HTML5
- CSS3
- Vanilla JavaScript ES modules
- Three.js stored locally in `js/vendor/` for reliable GitHub Pages loading
- WebGL
- Web Audio API
- Web Speech API

The Three.js module is included locally in the repository, so the frog does not depend on a CDN. After the site files are downloaded or deployed, all rendering code, answers, branding assets, effects, and game logic load directly from the project.

## Project structure

```text
am-i-an-idiot/
├── index.html
├── README.md
├── LICENSE
├── 404.html
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
│   ├── threeLoader.js
│   ├── vendor/
│   │   ├── three.module.min.js
│   │   └── THREE-LICENSE.txt
│   ├── scene.js
│   ├── frogBall.js
│   ├── interaction.js
│   ├── effects.js
│   └── accessibility.js
└── assets/
    ├── images/
    │   ├── beetales-avatar.png
    │   └── beetales-logo-v2.png
    └── icons/
        ├── favicon.ico
        └── favicon.png
```

## Run locally in Visual Studio Code

Because the JavaScript uses ES modules, use a local web server instead of double-clicking `index.html`.

1. Open this folder in Visual Studio Code.
2. Install the free **Live Server** extension if it is not already installed.
3. Right-click `index.html`.
4. Select **Open with Live Server**.
5. Wait briefly for the message `BUILDING THE 3D ORACLE` to disappear.

No terminal commands, dependencies, compilation, or builds are required.

## How to shake the frog

### Mouse

1. Hold the left mouse button over the frog.
2. Move rapidly left and right several times.
3. Watch the `SHAKE ENERGY` meter.
4. Release after it reaches 100%.

Direction changes receive a bonus, so repeatedly reversing left and right works better than dragging once across the screen.

### Touch

Hold the frog and drag rapidly left and right with one finger. Pointer capture keeps the shake active even when the finger briefly leaves the visible model.

### Keyboard and fallback button

Focus the frog and press Enter or Space, or use the `SHAKE THE FROG` button. The fallback control performs a complete animated 3D shake.

## Edit answers

Open `js/answers.js`. Each answer has this structure:

```js
{ id: "c01", category: "COMMON", text: "Probably, but the evidence is still loading." }
```

Keep every `id` unique. Supported categories are:

- `COMMON`
- `SNARKY`
- `SAVAGE`
- `RARE_TRUTH`
- `FATAL`

## Change probabilities

Open `js/config.js` and edit `CATEGORY_WEIGHTS`. The values must total exactly 100.

```js
COMMON: 50
SNARKY: 28
SAVAGE: 15
RARE_TRUTH: 6.8
FATAL: 0.2
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

Return the value to `null` before publishing.

## Disable the FATAL redirect

For local testing, edit `js/config.js`:

```js
export const ENABLE_FATAL_REDIRECT = false;
```

The animation and countdown will still run, but the browser will remain on the page.

The configured redirect is:

```text
https://replug.link/ccef1e2c
```

The redirect occurs only after a user starts the game and receives the 0.2% FATAL result. A visible escape button and the Escape key can cancel it.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload every file and folder from this project.
3. Open the repository's **Settings**.
4. Open **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)`.
7. Save.
8. Open the generated GitHub Pages URL after deployment finishes.

This project uses relative asset paths and works from a repository subdirectory. GitHub Actions are not required.

## Accessibility

- Keyboard activation with Enter and Space
- Visible focus indicators
- ARIA labels and live result announcements
- Touch-friendly controls
- Reduced-motion behavior
- Sound-independent visual feedback
- Voice-independent text feedback
- Cancellable FATAL redirect
- No unsafe rapid flashing

## Browser notes

The 3D character requires WebGL and JavaScript module support. Current versions of Chrome, Edge, Firefox, and Safari should be used.

Web Speech API voice availability and quality vary by browser and operating system. Unsupported speech synthesis disables the voice control without breaking the rest of the page.

Web Audio begins only after user interaction, as required by modern browsers.

## Privacy

All answer selection and game logic run locally in the browser. The project does not collect or transmit personal data and uses no analytics, cookies, camera, microphone, or sensor permissions.

The browser loads Three.js from the local `js/vendor/` directory. The only intentional external navigation is the configurable FATAL redirect.

## License

MIT. The supplied BeeTales branding artwork remains the property of its owner and is included for this specific project.
