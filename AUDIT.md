# V5 Audit Summary

## Main correction

The frog no longer behaves like a flat rotating disc. The model now uses:

- A shaded spherical shell that remains visible throughout the animation
- 15 volumetric CSS 3D depth slices on desktop and 11 on smaller screens
- A separately rotating front/back surface for the frog face and oracle window
- Limited outer-body tilt so mouse movement cannot turn the whole model edge-on

## Responsiveness changes

- Shake threshold reduced from `2400` to `1650`
- Automatic button shake reduced from `1150 ms` to `850 ms`
- Pre-result delay reduced from `380 ms` to `220 ms`
- Result effect begins approximately `830 ms` after a valid shake starts resolving, instead of approximately `1140 ms`
- Browser console benchmark messages report initialization and verdict-display timing

## Content changes

- FATAL probability increased from `0.2%` to `0.5%`
- Probability total remains exactly `100%`
- Answer inventory increased to 122 entries:
  - COMMON: 35
  - SNARKY: 37
  - SAVAGE: 30
  - RARE_TRUTH: 12
  - FATAL: 8
- Added sharper satirical answers without slurs, hate speech, or attacks on protected traits
- Copyright and MIT license updated to `Sorairei`

## Validation performed

- JavaScript syntax checked with Node.js
- HTML structure parsed and verified
- Actual Chromium rendering tested for idle, tilted, and answer states
- Simulated pointer shaking reached 100%, triggered the result, and revealed the answer
- FATAL screen activation, cancellation, and cleanup tested
- Relative project paths checked for GitHub Pages compatibility

## Testing configuration

To force the FATAL result without leaving the page:

```js
export const DEV_FORCE_RESULT = "FATAL";
export const ENABLE_FATAL_REDIRECT = false;
```

Return these values to `null` and `true` before publishing.
