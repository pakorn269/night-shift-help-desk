# Kiroween 2026 — Devpost Submission Pack

## Project Title
**Night Shift Help Desk**

## Live Links
- **Live Playable App**: https://pakorn269.github.io/night-shift-help-desk/
- **Public GitHub Repository (MIT + `.kiro/`)**: https://github.com/pakorn269/night-shift-help-desk
- **Public YouTube Demo (`2m 07s`)**: https://youtu.be/iKEAG_p1iWA

## Tagline
A browser horror game disguised as an enterprise IT help desk console where impossible timestamps, live pixel CCTV feeds, and your own audit trail quietly turn against you.

## Recommended Category
**Costume Contest** — *"Build an application featuring an unforgettable, hauntingly polished user interface. Incorporate spooky design elements that successfully enhance the app's overall function."*

### Why It Fits Costume Contest
Instead of bolting Halloween cobwebs onto a generic dashboard, **the corporate interface itself is the costume and the narrative engine**. **Halcyon Desk // ITSM v4.2** starts as a calm, credible midnight service console (`03:00`, green NTP sync, steaming pixel coffee mug, empty office CCTV). As the player investigates three escalating incidents separated by 7 minutes (`03:00` → `03:14` → `03:21`), the UI subtly deteriorates around their exact choices:
- Their own custom **Analyst Name** (entered at Shift Check-In or edited live in the header) appears on an impossible `03:07` closure before `03:07` has happened.
- Trusting the log jumps the console clock to `03:07`, duplicates the closure, and freezes the steaming coffee mug sprite.
- Challenging the log deletes the row, injects a phantom `INC-0419` ticket into the live queue, rings the animated pixel VoIP handset from their own extension, and lets them **answer Ext. 419** to uncover a chilling loopback transcript.
- Clicking any live CCTV feed opens a **6× Forensic Zoom Inspector** showcasing custom Piskel MCP pixel art—culminating in Case 3 where the Halcyon eye-monitor watches in crimson, the analyst ID badge splits into two overlapping silhouettes, and the ceiling camera behind Desk B-04 shows someone sitting in **your chair**.

---

## Judging Pillars Checklist (`kiroween.devpost.com/rules`)

1. **Quality & Design (Hauntingly Polished UI)**
   - Locked 16-color **Phosphor-Noir** palette uniting 8 bespoke **Piskel MCP Server** animated pixel sprite sheets with CSS tokens (`docs/art-direction-brief.md` + `public/sprites/asset-manifest.json`), validated with automated raster QA (`asset_report.py`).
   - Adaptive procedural Web Audio bus mixer (`Master ← {Ambience, SFX, UI}`) with squared slider-to-gain volume control, soft master limiting, vertical dread drone layering, and synthesized VoIP pickup/ring cues.
   - Accessible by design: zero jump scares, zero strobing flashes, colorblind-safe pixel icon silhouettes + uppercase status tags, full keyboard play (`I`, `1`/`2`, `Z`, `P`, `N`, `R`, `M`), live **Calm (Reduced Motion)** toggle, and mobile-first layout verified at `360px` and `1280px`.
2. **Implementation of Kiro & Tooling**
   - Built with Kiro Spec-Driven Development (`.kiro/specs/first-playable-slice/`), Kiro Steering Docs (`.kiro/steering/product.md`, `tech.md`, `costume-contest-ui.md`), Kiro Agent Hook (`.kiro/hooks/verify-on-save.kiro.hook`), and MCP-powered pixel art generation (`scripts/generate-piskel-sprites.mjs` talking to the Piskel MCP Server).
   - Pure TypeScript discriminated-union FSM verified with **35 Vitest + `fast-check` property-based tests** passing on Linux CI (`~24 kB` gzipped app bundle).
3. **Potential Value & Replayability**
   - Complete 3–5 minute playable experience live on GitHub Pages with zero backend or account friction.
   - 4 persistent unlockable Shift Endings (`The Quiet Shift`, `Extension 419`, `Split Session`, `Audit Exception`) with a shareable **Copy Shift Report** card.

---

## Recorded Demo Video (`2m 07s`, Strictly Under 3 Minutes)

Local deliverables ready for YouTube Studio upload (in gitignored `demo/` folder):
- **Subtitled HD Video (`1280×720` @ 30fps, H.264 + AAC stereo, Google Cloud Chirp 3 HD per-cue narration)**: `demo/night-shift-help-desk-kiroween-demo.mp4`
- **Synced YouTube Captions (23 exact per-sentence cues)**: `demo/night-shift-help-desk-kiroween-demo.srt`
- **Custom 16:9 Thumbnail**: `demo/youtube-thumbnail.png`

### Video Timeline (`0:00 – 2:07`)
- **0:00–0:09 — Opening Card**: Phosphor-Noir title card showcasing Halcyon emblem and all three animated Piskel CCTV cameras.
- **0:09–0:18 — Night Shift Check-In**: Personalize analyst handle (`Pakorn`) and clock in at `03:00` on the live GitHub Pages deployment.
- **0:18–0:42 — Case 1 Audit Trail & 6× CCTV Zoom**: Reveal impossible `03:07` closure signed by `Pakorn`, then open `CAM-B3-204` at 6× forensic zoom to inspect the self-powered CRT reflection.
- **0:42–1:02 — Both Case 1 Paths & VoIP Loopback**: Demonstrate *Close as Resolved* (`03:07` clock jump + duplicate rows + frozen coffee), then replay and pick *Keep Open & Call Requester* (phantom `INC-0419` + clicking **Answer Ext. 419** for the loopback transcript).
- **1:02–1:30 — Escalation (Case 2 & Case 3)**: `INC-0314` empty North Stairwell badge override + 6× CCTV zoom, followed by `INC-0321` Shift Handover pre-dated at `02:55` with Desk B-04 overhead camera showing the operator in your chair.
- **1:30–1:42 — Ending Dossier & Accessibility**: Unlock *Ending II: Extension 419*, demonstrate **Copy Shift Report** and **Calm Mode**.
- **1:42–1:55 — `360px` Mobile-First Showcase**: Live `360px` viewport playback proving zero clipping and ticket-first ordering.
- **1:55–2:07 — Under the Hood (Kiro + Piskel MCP)**: Summary of `.kiro/` specs/steering/hooks, Piskel MCP sprites, 35 automated tests on Linux CI, and live URLs.

### Ready-to-Paste YouTube Metadata
- **Title**: `Night Shift Help Desk — Kiroween 2026 Costume Contest Demo (Halcyon Desk v4.2)`
- **Visibility**: `Public`
- **Description**:
  ```text
  Night Shift Help Desk — Kiroween 2026 Costume Contest Entry

  Play live: https://pakorn269.github.io/night-shift-help-desk/
  Source code (MIT + .kiro/): https://github.com/pakorn269/night-shift-help-desk

  You are the only analyst on the night shift. A workstation powered on by itself at 03:00. Your audit log says you closed the ticket at 03:07. It is still 03:00.

  Built with Kiro specs, steering docs, agent hooks, bespoke Piskel MCP pixel art sprites, procedural Web Audio bus mixing, and 35 Vitest + fast-check tests deployed via Linux CI.
  ```

---

## Pre-Submission Launch Checklist (For Pakorn)
- [x] Review changes locally and commit to Git (`.kiro/` specs/steering/hooks and `LICENSE` tracked).
- [x] Create a **public GitHub repository** (`https://github.com/pakorn269/night-shift-help-desk`) and push — confirmed **MIT License** detected by GitHub API and repo visibility `public`.
- [x] Run locked Linux CI (`npm ci && npm test && npm run build`) and deploy `dist/` automatically to **GitHub Pages** (`https://pakorn269.github.io/night-shift-help-desk/`), verified end-to-end in live browser with HTTP `200` on all sprites and `0` console errors.
- [x] Record `<3 min` subtitled HD demo video (`2m 07s`, Google Cloud Chirp 3 HD per-cue synced voiceover), synced `.srt` captions, and `1280×720` thumbnail locally in `demo/`.
- [x] Upload demo video to YouTube as **Public** — live at https://youtu.be/iKEAG_p1iWA.
- [x] Submit repo URL, live app URL, YouTube video URL, and Costume Contest write-up on Devpost — live at https://devpost.com/software/night-shift-help-desk.

---

## Copy-Paste Devpost Submission Form Fields

- **Project Name**: `Night Shift Help Desk`
- **Tagline**: `A browser horror game disguised as an enterprise IT help desk console where impossible timestamps, live pixel CCTV feeds, and your own audit trail quietly turn against you.`
- **Category**: `Costume Contest`
- **Built With**: `kiro`, `typescript`, `vite`, `html5`, `css3`, `web-audio-api`, `piskel-mcp`, `vitest`, `fast-check`, `github-actions`, `github-pages`
- **Try it out links**:
  - `https://pakorn269.github.io/night-shift-help-desk/`
  - `https://github.com/pakorn269/night-shift-help-desk`
- **Video Demo link**: `https://youtu.be/iKEAG_p1iWA`

### Devpost "About the Project" Markdown (Ready to Paste)

```markdown
## Inspiration
Most spooky web demos glue Halloween clip art on top of a normal dashboard. We wanted to flip that idea for **Costume Contest**: make ordinary enterprise IT service-desk software feel so credible that a single impossible timestamp—a `03:07` ticket closure under your own analyst name while the console clock still reads `03:00`—creates genuine dread before anything visibly supernatural happens.

## What it does
**Night Shift Help Desk** disguises a 3-case, 4-ending psychological horror game inside **Halcyon Desk // ITSM v4.2**:
- **Shift Check-In & Personalization**: Clock in at `03:00` with your own Analyst Handle so **your name** appears on impossible future closures, VoIP transcripts, and shift endings.
- **Case 1 (`INC-0300`, `03:00`)**: Inspect the forensic audit trail to uncover your own `03:07` closure. Comply and the console clock jumps to `03:07`, duplicate closures appear, and your steaming coffee mug pixel sprite freezes cold. Defy and the log vanishes, phantom ticket `INC-0419` injects into your live queue, and your VoIP desk handset rings from your own extension (`Ext. 419`)—which you can pick up (`[P]`) to uncover a chilling loopback transcript.
- **Case 2 (`INC-0314`, `03:14`) & Case 3 (`INC-0321`, `03:21`)**: Your RFID badge unlocks an empty North Stairwell while still on your desk, your prior choices appear pre-dated at `02:55`, your ID badge splits into two silhouettes, and the live ceiling camera behind Desk B-04 reveals someone sitting in your chair.
- **6× Forensic CCTV Zoom & 4 Persistent Endings**: Click any live pixel camera (`[Z]`) for 6× nearest-neighbor inspection, unlock all 4 persistent endings (*The Quiet Shift*, *Extension 419*, *Split Session*, *Audit Exception*), and export a shareable Shift Report card.

## How we built it
- **Kiro Workflow (`.kiro/`)**: Started with Kiro Spec-Driven Development (`.kiro/specs/first-playable-slice/requirements.md`, `design.md`, `tasks.md`), expanded with Kiro Steering Docs (`.kiro/steering/product.md`, `tech.md`, `costume-contest-ui.md`) and a Kiro Agent Hook (`.kiro/hooks/verify-on-save.kiro.hook`) that triggers automated test and build verification on source edits.
- **Bespoke Pixel Art via Piskel MCP Server**: Authored 8 cohesive 16-color Phosphor-Noir animated sprite sheets (three `64×48` live CCTV cameras, Halcyon eye-monitor emblem, 4-frame deteriorating ID badge, ringing VoIP phone, steaming/frozen coffee mug, and 6 colorblind-safe status icons) via a reproducible Piskel MCP JSON-RPC script (`scripts/generate-piskel-sprites.mjs`) validated with automated raster QA.
- **Zero-Framework Frontend & Procedural Web Audio**: Pure TypeScript strict discriminated-union FSM (`src/state.ts`), centralized narrative tables (`src/content.ts`), crash-safe `localStorage` ending tracking (`src/storage.ts`), proportional reduced-motion-safe game feel (`src/juice.ts`), and a zero-asset Web Audio API bus mixer (`Master ← {Ambience, SFX, UI}`) with squared slider-to-gain volume curves and adaptive vertical dread layering (`src/audio.ts`).
- **Testing & Linux CI**: 35 Vitest unit, DOM, integration, and `fast-check` property-based tests run on every push in GitHub Actions (`.github/workflows/deploy.yml`) before auto-deploying the ~24 kB gzipped bundle to GitHub Pages.

## Challenges we ran into
- Keeping every horror beat effective with **zero jump scares, zero strobing flashes, zero audio-only clues, and zero color-only indicators** while preserving a clean `360px` mobile-first layout.
- Ensuring pixel art sprite strips animate with pixel-exact `step-end` CSS keyframes and load cleanly across both root hosts and subpath GitHub Pages URLs (`vite.config.ts` `base: './'`).

## Accomplishments that we're proud of
- Turning subtle UI deterioration (`data-dread="0..3"`), custom Piskel pixel art, and adaptive room-tone audio into a complete, replayable 3–5 minute horror experience in ~24 kB gzipped JavaScript/CSS/HTML.
- Achieving 100% passing property-based and integration tests across all 4 endings and zero console/network errors on the live public deployment.

## What we learned
- Kiro specs + steering docs keep visual craft, accessibility guardrails, and pure state invariants tightly aligned even across rapid feature expansion.
- Treating pixel art and UI CSS tokens as one locked 16-color palette makes animated sprites feel genuinely native inside enterprise software chrome.

## What's next
- Adding an optional Night 2 escalation queue with community-authored custom incident JSON packs and localization support leveraging our centralized `src/content.ts` string tables.
```
