# Changelog

## V8 — Frog Personality

- Replaced baked/static pupils with independent Three.js eye geometry.
- Added smooth pointer and touch tracking.
- Added natural blinking and occasional double blinks.
- Added idle micro-saccades and a failed-shake side-eye reaction.
- Added shake-responsive pupil movement and category-based expressions.
- Added a pre-cleaned eye-base texture so the animated eyes integrate with the goggles.
- Shared eye geometry buffers between both eyes to reduce GPU allocations.
- Preserved the real SphereGeometry body, answer window, voice, sound, FATAL result, and GitHub Pages compatibility.
