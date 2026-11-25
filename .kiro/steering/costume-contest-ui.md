# Costume Contest UI & Visual Craft Steering

## Phosphor-Noir Corporate Aesthetic
- Treat the UI as **Halcyon Desk // ITSM v4.2**, a plausible midnight enterprise service console that quietly deteriorates across `data-dread="0..3"`.
- Keep all CSS custom properties synchronized with the 16-color pixel art palette in `docs/art-direction-brief.md`.
- Render all Piskel sprites with `image-rendering: pixelated` and frame-exact `step-end` CSS `@keyframes` so pixels never blur or drift mid-frame.

## Proportional Game Feel & Accessibility
- Scale visual feedback cleanly by event importance (small click pop, medium audit reveal, large reality shift) via `src/juice.ts`.
- Always provide an in-UI **Calm (Reduced Motion)** toggle that honors `prefers-reduced-motion` and zeroes out shake and motion effects immediately.
- Pair every status color with a distinct Piskel icon silhouette and explicit uppercase text badge (`ACTIVE`, `ANOMALY`, `FILED`, `FLAGGED`, `RINGING`).
- Ensure every interactive control is keyboard-operable with clear `:focus-visible` outlines and non-intrusive shortcuts (`I`, `1`, `2`, `N`, `R`, `M`).
