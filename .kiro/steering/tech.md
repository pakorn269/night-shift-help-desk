# Technical Architecture Steering — Night Shift Help Desk

## Stack & Constraints
- **Build & Runtime**: Vite 8 + Vanilla TypeScript (Strict Mode) + Semantic HTML + Modern CSS. Zero runtime UI framework dependencies.
- **State Architecture**: Pure discriminated union FSM in `src/state.ts` and `src/types.ts`. Invalid state transitions must preserve exact referential equality (`next === state`).
- **Content Separation**: All player-facing strings and narrative tables live in `src/content.ts` with `as const` assertions and `{ANALYST}` interpolation.
- **Audio Architecture**: Zero-asset procedural Web Audio mixer in `src/audio.ts` routed through `Master <- {Ambience, SFX, UI}` with squared slider-to-gain volume mapping, soft dynamics limiting, and adaptive vertical dread layering.
- **Pixel Art Pipeline**: All raster sprites authored via the Piskel MCP Server (`scripts/generate-piskel-sprites.mjs`), tracked in `public/sprites/asset-manifest.json`, and validated against the locked 16-color palette (`docs/art-direction-brief.md`).
- **Testing & Verification**: Vitest + jsdom + `fast-check` property-based tests validating transition invariants, DOM rendering, persistence recovery, and all 4 endings.
