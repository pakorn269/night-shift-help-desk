# Kiroween 2026 — Devpost Submission Pack

## Project Title
**Night Shift Help Desk**

## Live Links
- **Live Playable App**: https://pakorn269.github.io/night-shift-help-desk/
- **Public GitHub Repository (MIT + `.kiro/`)**: https://github.com/pakorn269/night-shift-help-desk

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
- [ ] Upload `demo/night-shift-help-desk-kiroween-demo.mp4` (plus `youtube-thumbnail.png` and `.srt`) to YouTube as **Public**.
- [ ] Submit repo URL, live app URL, YouTube video URL, and Costume Contest write-up on [kiroween.devpost.com](https://kiroween.devpost.com/).
