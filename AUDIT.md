# V6 Performance Audit

## Why this version exists

A tester reported that the game was slow to react. V5 worked, but its full-window Three.js background, large assets, high-frequency DOM writes, and first-interaction audio initialization created unnecessary cost. V6 keeps the spherical frog, moving eyes, particles, orbital atmosphere, sound, voice, weighted answers, and FATAL sequence while reducing the work required from the browser.

## Main optimizations

### Rendering

- Replaced the continuously rendered Three.js/WebGL background with an adaptive Canvas 2D atmosphere.
- Removed the 667 KB Three.js runtime and all WebGL initialization work.
- The background renders at 30 FPS while idle and increases to 60 FPS during shaking.
- Canvas DPR is capped at `1.25` on desktop and `1` on small screens.
- Particle count is adaptive: 126 desktop, 72 mobile, and 36 in reduced-motion mode.
- CSS 3D sphere slices were reduced from 15/11 to 11/8 and no longer use an individual brightness filter.

### Input responsiveness

- Pointer movement is coalesced into one visual update per animation frame.
- Shake scoring still processes coalesced pointer samples, so accuracy is not lost.
- Audio startup no longer blocks `pointerdown` or the Shake button.
- The suspended audio graph is prepared before controls are enabled.
- The shake threshold was reduced from `1650` to `1450`.
- Automatic shaking was shortened from `850 ms` to `700 ms`.
- The answer transition was shortened while preserving the full rotation.

### Audio and effects

- Rattle noise reuses one buffer instead of allocating and filling a new buffer on every sound.
- Noise generation is split into idle-time chunks to avoid a large main-thread task.
- Result particles are appended with one `DocumentFragment` operation.
- Effect counts adapt slightly on mobile while preserving the same appearance and categories.

### Assets

- The supplied BeeTales logo is served as a 24 KB WebP with a PNG fallback.
- Favicon files were resized to practical browser dimensions.
- The emergency avatar fallback is now a compact WebP.
- Unused CDN preconnects were removed.

## Benchmark results

Tests used Chromium 144 with the same test page and interactions before and after optimization. Desktop was measured at 1440×900. Mobile used 390×844 at DPR 2. The 4× cases simulate a slower processor.

| Metric | V5 desktop 1× | V6 desktop 1× | Change |
|---|---:|---:|---:|
| Interactive ready | 866.5 ms | 590.9 ms | 31.8% faster |
| Button to visible answer | 2012.8 ms | 1348.1 ms | 33.0% faster |
| JavaScript heap used | 8.19 MB | 3.37 MB | 58.9% lower |
| Script execution | 274.7 ms | 50.1 ms | 81.8% lower |
| Total task time | 2080.1 ms | 754.7 ms | 63.7% lower |
| Long tasks | 10 / 1189 ms | 0 / 0 ms | Removed in this run |

| Metric | V5 mobile 4× | V6 mobile 4× | Change |
|---|---:|---:|---:|
| Interactive ready | 1589.8 ms | 647.4 ms | 59.3% faster |
| Button to visible answer | 1749.9 ms | 1427.7 ms | 18.4% faster |
| JavaScript heap used | 8.30 MB | 2.96 MB | 64.3% lower |
| Script execution | 636.4 ms | 275.1 ms | 56.8% lower |
| Total task time | 2500.7 ms | 1775.4 ms | 29.0% lower |
| Idle frame throughput | 22.1 FPS | 30.4 FPS | 37.5% higher |
| Action frame throughput | 15.0 FPS | 17.9 FPS | 19.6% higher |

The runtime project payload fell from approximately **2.83 MB to 382 KB**, an **86.5% reduction**. The bundled JavaScript used for the controlled test fell from approximately **935 KB to 66 KB**, a **93% reduction**.

### Benchmark limitation

The automated environment uses headless software rendering and throttles animation frames, so its absolute FPS values should not be interpreted as the FPS users will see on a normal display. The relative before/after comparison is useful because both versions were tested under identical conditions. Three.js could not create WebGL in the test environment, which means V5's real GPU cost was underrepresented rather than exaggerated.

Raw figures are stored in `benchmarks/performance-summary.json`.

## Functional validation

- JavaScript syntax checked for every module.
- ES-module project bundled successfully without broken imports.
- Weighted probabilities total exactly 100%.
- FATAL remains at 0.5%.
- Desktop mouse shaking reached 100% and revealed an answer.
- Mobile fallback shaking revealed an answer.
- Idle, tilted, answer, and mobile layouts rendered without console errors.
- Forced FATAL activated its screen, displayed the countdown, and was cancelled successfully with the escape control.
- Relative paths and assets were checked for GitHub Pages subdirectory deployment.

## Built-in live benchmark

Append `?perf=1` to the deployed URL:

```text
https://username.github.io/repository/?perf=1
```

A small overlay reports FPS, P95 frame time, pointer-to-frame latency, long tasks, heap usage when supported, and DOM-node count. The diagnostic module is dynamically imported and adds no normal-game runtime cost.
