# Kiroween 2026 — Devpost Submission Pack

## Project Title
**Night Shift Help Desk**

## Tagline
A browser horror game disguised as an enterprise IT help desk console where impossible timestamps, live pixel CCTV feeds, and your own audit trail quietly turn against you.

## Recommended Category
**Costume Contest** — *"Build an application featuring an unforgettable, hauntingly polished user interface. Incorporate spooky design elements that successfully enhance the app's overall function."*

### Why It Fits Costume Contest
Instead of bolting Halloween cobwebs onto a generic dashboard, **the corporate interface itself is the costume and the narrative engine**. **Halcyon Desk // ITSM v4.2** starts as a calm, credible midnight service console (`03:00`, green NTP sync, steaming pixel coffee mug, empty office CCTV). As the player investigates three escalating incidents separated by 7 minutes (`03:00` → `03:14` → `03:21`), the UI subtly deteriorates around their exact choices:
- Their own custom **Analyst Name** appears on an impossible `03:07` closure before `03:07` has happened.
- Trusting the log jumps the console clock to `03:07`, duplicates the closure, and freezes the steaming coffee mug sprite.
- Challenging the log deletes the row, injects a phantom `INC-0419` ticket into the live queue, and rings the animated pixel VoIP handset from their own extension.
- By Case 3, the Halcyon eye-monitor logo watches, the analyst ID badge splits into two overlapping silhouettes, and the ceiling CCTV feed shows someone sitting in **your chair at Desk B-04**.

---

## Judging Pillars Checklist (`kiroween.devpost.com/rules`)

1. **Quality & Design (Hauntingly Polished UI)**
   - Locked 16-color **Phosphor-Noir** palette uniting bespoke **Piskel MCP Server** pixel art sprites with CSS tokens (`docs/art-direction-brief.md` + `public/sprites/asset-manifest.json`).
   - Adaptive procedural Web Audio bus mixer (`Master ← {Ambience, SFX, UI}`) with squared slider-to-gain volume control and vertical dread layering.
   - Accessible by design: zero jump scares, zero strobing flashes, colorblind-safe pixel icon silhouettes + text tags, full keyboard play (`I`, `1`/`2`, `N`, `R`, `M`), live **Calm (Reduced Motion)** toggle, and mobile-first layout verified at `360px` and `1280px`.
2. **Implementation of Kiro & Tooling**
   - Built with Kiro Spec-Driven Development (`.kiro/specs/first-playable-slice/`), Kiro Steering Docs (`.kiro/steering/product.md`, `tech.md`, `costume-contest-ui.md`), Kiro Agent Hook (`.kiro/hooks/verify-on-save.kiro.hook`), and MCP-powered pixel art generation (`scripts/generate-piskel-sprites.mjs` talking to the Piskel MCP Server).
   - Pure TypeScript discriminated-union FSM verified with Vitest + `fast-check` property-based tests and strict zero-error builds (`~21 kB` gzipped).
3. **Potential Value & Replayability**
   - Complete 3–5 minute playable experience playable instantly in any desktop or mobile browser with zero backend or account friction.
   - 4 persistent unlockable Shift Endings (`The Quiet Shift`, `Extension 419`, `Split Session`, `Audit Exception`) encourage immediate replay and sharing.

---

## Demo Video Script (Target: ~2m 20s, Strictly Under 3 Minutes)

- **0:00–0:20 — Hook**: Open the live console at `03:00`. Show the clean corporate UI, steaming pixel coffee mug, and calm CCTV feed `CAM-B3-204`. Type your own name into the Analyst Badge in the top right.
- **0:20–0:55 — Case 1 Reveal & Both Paths**: Click **Inspect Audit Trail** (`[I]`). Point out the impossible `03:07` closure signed with **your own name** while the clock is still `03:00`, and notice the CRT workstation on CCTV powering on with a reflection in the glass. Click **Close as Resolved** → watch the clock snap to `03:07`, duplicate entries appear, and the coffee mug freeze. Hit **Replay This Case** → pick **Keep Open & Call Requester** → watch `INC-0419` appear in the queue and hear/see the pixel VoIP handset ring from `Ext. 419`.
- **0:55–1:35 — Escalation (Case 2 & Case 3)**: Advance to `INC-0314` (empty North Stairwell unlocking with your badge `#0419`, pixel CCTV door cracking open spilling violet light) and `INC-0321` (Shift Handover Request citing your earlier decisions pre-dated at `02:55`, live Desk B-04 CCTV showing an operator silhouette sitting in your chair, badge portrait splitting into two silhouettes).
- **1:35–2:00 — Ending Dossier & Accessibility**: Reach one of the 4 Shift Endings (`Extension 419` or `The Quiet Shift`), show the 4-ending discovery tracker, toggle **Calm Mode** and Audio controls, and resize down to `360px` mobile width.
- **2:00–2:25 — Under the Hood (Kiro + Piskel MCP)**: Quick flash of `.kiro/` specs/steering/hooks, `scripts/generate-piskel-sprites.mjs`, and `npm test && npm run build` passing cleanly.

---

## Pre-Submission Launch Checklist (For Pakorn)
- [ ] Review changes locally and commit to Git (keep `.kiro/` and `LICENSE` tracked!).
- [ ] Create a **public GitHub repository** and push (confirm MIT License shows in GitHub's About sidebar).
- [ ] Deploy static `dist/` folder to GitHub Pages, Vercel, Netlify, or Cloudflare Pages and verify the live URL from a signed-out browser.
- [ ] Record and upload a public YouTube demo video (< 3 minutes) using the script above.
- [ ] Submit repo URL, live app URL, video URL, and Costume Contest write-up on [kiroween.devpost.com](https://kiroween.devpost.com/).
