# Changelog

All notable changes to **Night Shift Help Desk** are documented here.

## [1.0.0] - 2026-11-25 — Kiroween Costume Contest Edition

### Added
- **Full 3-Case Night Shift Narrative (`src/content.ts`, `src/state.ts`)**:
  - Case 1 (`INC-0300`, `03:00`): Workstation powered on by itself + impossible `03:07` audit trail.
  - Case 2 (`INC-0314`, `03:14`): Duplicate RFID badge swipe `#0419` at the empty Floor 4 North Stairwell, referencing your Case 1 choice.
  - Case 3 (`INC-0321`, `03:21`): Shift Handover Request from your own extension citing your prior decisions pre-dated at `02:55`.
- **4 Persistent Unlockable Shift Endings (`src/storage.ts`)**: *The Quiet Shift*, *Extension 419*, *Split Session*, and *Audit Exception*, with crash-safe `localStorage` tracking and an End-of-Shift Dossier gallery.
- **Customizable Analyst Name**: Editable header badge handle (`A. Mercer` default) dynamically injected into impossible timestamps, audit rows, and endings.
- **Bespoke Piskel MCP Pixel Art Suite (`scripts/generate-piskel-sprites.mjs`, `public/sprites/`)**:
  - 3 animated `64×48` 8-frame CCTV Evidence Feeds (`cctv-workstation`, `cctv-stairwell`, `cctv-desk-b04`)
  - Animated `32×32` Halcyon Desk emblem, 4-frame deteriorating Analyst ID Badge, and 6-frame ringing VoIP desk handset
  - Animated `24×24` steaming/frozen coffee mug and 6 colorblind-safe status icons
  - Full Art Direction Brief (`docs/art-direction-brief.md`) and `public/sprites/asset-manifest.json` validated with raster QA checks.
- **Procedural Web Audio Mixer (`src/audio.ts`)**: Bus-routed synthesizer (`Master ← {Ambience, SFX, UI}`), squared volume curve, soft master limiter, adaptive vertical dread drone layering, VoIP ring generator, and pitch-randomized UI SFX.
- **Proportional Game Feel & Accessibility (`src/juice.ts`, `src/accessibility.ts`)**: Trauma-decay micro-shake, subtle phosphor dip veil, live Calm (Reduced Motion) toggle, and ergonomic keyboard shortcuts (`I`, `1`/`2`, `N`, `R`, `M`).
- **Kiroween Submission Compliance**: Added MIT `LICENSE`, `.kiro/steering/` docs, `.kiro/hooks/verify-on-save.kiro.hook`, and `docs/DEVPOST_SUBMISSION.md`.

### Changed
- Elevated UI from bare-bones prototype to **Halcyon Desk // ITSM v4.2**, a 3-zone responsive enterprise console (`360px` mobile → `768px` tablet → `1100px+` desktop) with progressive diegetic deterioration (`data-dread="0..3"`).
- Expanded test suite across 6 files (unit, `fast-check` property-based, renderer, audio/juice safety, storage recovery, and all 4 endings integration).

## [0.1.0] - Initial First Playable Slice
- Core 1-ticket state machine (`03:00` / `03:07`), two outcomes, replay, dark CSS layout, and initial Vitest + fast-check suite.
