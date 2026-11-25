# Art Direction Brief — Night Shift Help Desk

## Technical Frame
- **Engine / Target**: Static Web App (Vite + Vanilla TypeScript + HTML/CSS + CSS sprite animation)
- **Visual Style**: 16-bit Phosphor-Noir Corporate Pixel Art (diegetic enterprise ITSM terminal)
- **Native Asset Dimensions**:
  - Live CCTV / Evidence Feeds: `64 × 48 px` (8-frame horizontal strips, `512 × 48 px`, rendered crisp at `4×`–`6×` with `image-rendering: pixelated`)
  - Analyst ID Badge & Halcyon Emblem: `32 × 32 px` (2–4 frame horizontal strips)
  - VoIP Desk Handset: `32 × 32 px` (6-frame horizontal strip)
  - Status Icons & Steaming Coffee Mug: `24 × 24 px` (single icons + 6-frame strip)
- **Filtering**: Nearest-neighbor (`image-rendering: pixelated`), zero bilinear blur.
- **Transparency**: Full RGBA alpha transparency on icons, badge, phone, mug, and emblem; opaque framed phosphor-bezel scenes on CCTV feeds.
- **Authoring Tool**: Piskel MCP Server (`piskel` MCP tools + reproducible Piskel MCP JSON-RPC script in `scripts/generate-piskel-sprites.mjs`).

## Visual System — Phosphor-Noir Corporate Palette (16 Locked Colors)
All pixel art and CSS UI tokens share one locked palette so sprites sit natively inside the software chrome without feeling pasted on:

| Role | Hex | Usage |
|------|-----|-------|
| Void Black | `#06090E` | Deepest CRT bezel shadow, outlines |
| Midnight Obsidian | `#0C111A` | Primary terminal canvas, dark room shadows |
| Charcoal Surface | `#151D2B` | Panel backgrounds, desk surfaces, hardware casing |
| Slate Bezel | `#232F42` | Monitor housing, structural midtones, borders |
| Steel Midtone | `#3B4D68` | Hardware highlights, wall concrete, icon strokes |
| Cool Mist | `#687D9C` | Secondary labels, blinds, metal edges |
| Silver Dust | `#9FB2CC` | Primary body chrome, muted highlights |
| Phosphor White | `#E2ECF8` | Crisp focal highlights, clock glass glints |
| Halcyon Cyan | `#38BDF8` | Normal corporate accent, active CRT glow |
| Deep Teal | `#0F766E` | Secondary phosphor bounce light, standby screens |
| Signal Emerald | `#10B981` | RFID access granted LED, nominal system status |
| Warning Amber | `#F59E0B` | Standby power LED, coffee warmth, SLA caution |
| Anomaly Crimson | `#EF4444` | Impossible timestamp alert, ringing VoIP LED, error flags |
| Blood Shadow | `#5E1520` | Crimson glow falloff, danger surface tint |
| Ghost Violet | `#8B5CF6` | Reality drift shimmer, stairwell light spill |
| Warm Mug Clay | `#A16207` | Night shift coffee mug glaze & warm desk contrast |

## Shape Language, Lighting & Motion
- **Shape Language**: Crisp rectilinear enterprise hardware (monitors, badges, steel doors, keypads) contrasted with subtle organic anomalies (curling mug steam, soft CRT phosphor bloom, faint silhouette ghosts).
- **Lighting**: Single overhead fluorescent / CRT screen bounce light from front-center; 1 px dark `#06090E` silhouettes for icon legibility on both `#0C111A` and `#151D2B` panels.
- **Motion Character**: Restrained, deliberate, uncanny — never hyperactive or flashing. CCTV scanline sweeps at 6–8 FPS; coffee steam curls smoothly; ringing phone oscillates ±1 px; anomaly silhouettes appear calmly without jump-scare strobing.
- **Accessibility**: Every icon pairs distinct geometric silhouettes (diamond = anomaly, clock = time drift, handset = call, keycard = badge) with text labels so color is never the sole carrier of meaning.
