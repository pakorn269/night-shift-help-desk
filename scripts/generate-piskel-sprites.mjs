/**
 * Night Shift Help Desk — Piskel MCP Pixel Art Asset Generator
 *
 * Spawns the Piskel MCP Server over JSON-RPC stdio and authors all cohesive
 * Phosphor-Noir pixel art sprites, animated CCTV feeds, hardware widgets,
 * and colorblind-safe status icons into public/sprites/.
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'sprites')
const ICONS_DIR = path.join(OUT_DIR, 'icons')
const PREVIEWS_DIR = path.join(OUT_DIR, 'previews')
const PISKEL_SERVER = 'C:/piskel-mcp-server/dist/index.js'

mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(ICONS_DIR, { recursive: true })
mkdirSync(PREVIEWS_DIR, { recursive: true })

// Locked 16-color Phosphor-Noir Corporate Palette (matches docs/art-direction-brief.md)
const PAL = {
  '.': null,
  k: '#06090E', // Void Black (outlines, deepest shadow)
  o: '#0C111A', // Midnight Obsidian
  c: '#151D2B', // Charcoal Surface
  s: '#232F42', // Slate Bezel
  m: '#3B4D68', // Steel Midtone
  l: '#687D9C', // Cool Mist
  g: '#9FB2CC', // Silver Dust
  w: '#E2ECF8', // Phosphor White
  b: '#38BDF8', // Halcyon Cyan
  t: '#0F766E', // Deep Teal
  e: '#10B981', // Signal Emerald
  a: '#F59E0B', // Warning Amber
  r: '#EF4444', // Anomaly Crimson
  d: '#5E1520', // Blood Shadow
  v: '#8B5CF6', // Ghost Violet
  u: '#A16207', // Warm Mug Clay
}

// ---------------------------------------------------------------------------
// Minimal JSON-RPC stdio client for Piskel MCP Server
// ---------------------------------------------------------------------------
class PiskelClient {
  constructor() {
    this.proc = spawn('node', [PISKEL_SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.nextId = 1
    this.pending = new Map()
    this.buffer = ''

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8')
      let idx
      while ((idx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, idx).trim()
        this.buffer = this.buffer.slice(idx + 1)
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve, reject } = this.pending.get(msg.id)
            this.pending.delete(msg.id)
            if (msg.error) reject(new Error(JSON.stringify(msg.error)))
            else resolve(msg.result)
          }
        } catch {
          // Ignore non-JSON log lines
        }
      }
    })
  }

  request(method, params = {}) {
    const id = this.nextId++
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.proc.stdin.write(payload)
    })
  }

  async init() {
    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'night-shift-sprite-gen', version: '1.0.0' },
    })
  }

  async tool(name, args) {
    const res = await this.request('tools/call', { name, arguments: args })
    if (res?.isError) {
      throw new Error(`Piskel tool ${name} failed: ${JSON.stringify(res)}`)
    }
    return res
  }

  close() {
    this.proc.stdin.end()
    this.proc.kill()
  }
}

// ---------------------------------------------------------------------------
// 2D Pixel Canvas Helper
// ---------------------------------------------------------------------------
class PixelCanvas {
  constructor(width, height) {
    this.w = width
    this.h = height
    this.grid = new Map()
  }

  set(x, y, colorKeyOrHex) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h) return
    const hex = PAL[colorKeyOrHex] !== undefined ? PAL[colorKeyOrHex] : colorKeyOrHex
    const key = `${ix},${iy}`
    if (!hex) {
      this.grid.delete(key)
    } else {
      this.grid.set(key, hex)
    }
  }

  get(x, y) {
    return this.grid.get(`${x},${y}`) || null
  }

  rect(x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.set(xx, yy, color)
      }
    }
  }

  ditherRect(x, y, w, h, color, phase = 0, density = 2) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if ((xx + yy + phase) % density === 0) {
          this.set(xx, yy, color)
        }
      }
    }
  }

  strokeRect(x, y, w, h, color) {
    for (let xx = x; xx < x + w; xx++) {
      this.set(xx, y, color)
      this.set(xx, y + h - 1, color)
    }
    for (let yy = y; yy < y + h; yy++) {
      this.set(x, yy, color)
      this.set(x + w - 1, yy, color)
    }
  }

  hline(x, y, len, color) {
    for (let i = 0; i < len; i++) this.set(x + i, y, color)
  }

  vline(x, y, len, color) {
    for (let i = 0; i < len; i++) this.set(x, y + i, color)
  }

  line(x0, y0, x1, y1, color) {
    let dx = Math.abs(x1 - x0)
    let dy = Math.abs(y1 - y0)
    let sx = x0 < x1 ? 1 : -1
    let sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0
    while (true) {
      this.set(x, y, color)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 > -dy) { err -= dy; x += sx }
      if (e2 < dx) { err += dx; y += sy }
    }
  }

  blitAscii(lines, ox = 0, oy = 0, overrides = {}) {
    for (let y = 0; y < lines.length; y++) {
      const row = lines[y]
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]
        if (ch === '.' || ch === ' ') continue
        const color = overrides[ch] !== undefined ? overrides[ch] : ch
        this.set(ox + x, oy + y, color)
      }
    }
  }

  toPixels() {
    const out = []
    for (const [k, color] of this.grid.entries()) {
      const [x, y] = k.split(',').map(Number)
      out.push({ x, y, color })
    }
    return out
  }
}

async function emitProject(client, { id, name, width, height, fps, frames, sheetPath, gifPath, gifScale = 4, previewPath, previewScale = 4, singlePngs = [] }) {
  await client.tool('create_project', { projectId: id, name, width, height })
  await client.tool('set_fps', { projectId: id, fps })

  for (let i = 0; i < frames.length; i++) {
    if (i > 0) {
      await client.tool('add_frame', { projectId: id, layerIndex: 0 })
    }
    const pixels = frames[i].toPixels()
    if (pixels.length > 0) {
      await client.tool('draw_pixels', { projectId: id, frameIndex: i, layerIndex: 0, pixels })
    }
  }

  if (sheetPath) {
    await client.tool('export_sprite_sheet', {
      projectId: id,
      outputPath: sheetPath,
      columns: frames.length,
      scale: 1,
    })
  }
  if (previewPath) {
    await client.tool('export_sprite_sheet', {
      projectId: id,
      outputPath: previewPath,
      columns: frames.length,
      scale: previewScale,
    })
  }
  if (gifPath) {
    await client.tool('export_gif', {
      projectId: id,
      outputPath: gifPath,
      frameDelay: Math.round(1000 / fps),
      scale: gifScale,
    })
  }
  for (const s of singlePngs) {
    await client.tool('export_png', {
      projectId: id,
      frameIndex: s.frameIndex,
      outputPath: s.outputPath,
      scale: s.scale ?? 1,
    })
  }
  console.log(`  [piskel] exported ${id} (${width}x${height} x ${frames.length}f)`)
}

// ---------------------------------------------------------------------------
// 1. HALCYON DESK LOGO (32x32, 2 frames: normal corporate eye-monitor / watching anomaly)
// ---------------------------------------------------------------------------
function buildHalcyonLogo() {
  const frames = []
  for (let f = 0; f < 2; f++) {
    const cv = new PixelCanvas(32, 32)
    // Outer corporate monitor housing (rounded pixel corners)
    cv.rect(4, 3, 24, 21, 'k')
    cv.rect(5, 4, 22, 19, 's')
    cv.hline(6, 4, 20, 'm')
    cv.vline(5, 5, 17, 'm')
    cv.hline(6, 22, 20, 'c')
    // Inner CRT cavity
    cv.rect(7, 6, 18, 13, 'k')
    cv.rect(8, 7, 16, 11, 'o')
    // Scanline subtle sheen
    cv.hline(8, 8, 16, 'c')
    cv.hline(8, 11, 16, 'c')
    cv.hline(8, 14, 16, 'c')
    // Geometric diamond / eye mark inside screen
    const accent = f === 0 ? 'b' : 'r'
    const mid = f === 0 ? 't' : 'd'
    // Almond eye / diamond outline
    cv.line(10, 12, 15, 8, accent)
    cv.line(16, 8, 21, 12, accent)
    cv.line(10, 12, 15, 16, accent)
    cv.line(16, 16, 21, 12, accent)
    cv.rect(13, 10, 6, 5, mid)
    // Iris / pupil
    if (f === 0) {
      cv.rect(14, 11, 4, 3, accent)
      cv.rect(15, 12, 2, 1, 'w')
    } else {
      // Slightly wider watchful crimson pupil shifted 1px left with phosphor glint
      cv.rect(13, 10, 5, 5, 'r')
      cv.rect(14, 11, 3, 3, 'k')
      cv.set(14, 11, 'w')
      cv.set(16, 13, 'a')
      // Glitch tear line
      cv.hline(8, 15, 5, 'v')
      cv.hline(19, 9, 5, 'r')
    }
    // Power LED on bezel
    cv.set(23, 20, f === 0 ? 'e' : 'r')
    cv.set(21, 20, 'm')
    // Monitor neck & stand
    cv.rect(13, 24, 6, 3, 'k')
    cv.rect(14, 24, 4, 2, 's')
    cv.rect(9, 27, 14, 3, 'k')
    cv.rect(10, 27, 12, 2, 'm')
    cv.hline(10, 27, 12, 'l')
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 2. ANALYST ID BADGE (32x32, 4 frames: normal -> scan -> ghost split -> double portrait)
// ---------------------------------------------------------------------------
function buildAnalystBadge() {
  const frames = []
  for (let f = 0; f < 4; f++) {
    const cv = new PixelCanvas(32, 32)
    // Lanyard clip top
    cv.rect(13, 1, 6, 4, 'k')
    cv.rect(14, 2, 4, 2, 'g')
    cv.set(15, 2, 'w')
    // Card outer shell
    cv.rect(5, 5, 22, 26, 'k')
    cv.rect(6, 6, 20, 24, 'c')
    cv.strokeRect(6, 6, 20, 24, 's')
    // Top corporate cyan header stripe (turns crimson on frame 3)
    cv.rect(7, 7, 18, 3, f === 3 ? 'd' : 't')
    cv.hline(7, 7, 18, f === 3 ? 'r' : 'b')
    // Photo frame
    cv.rect(9, 11, 14, 12, 'k')
    cv.rect(10, 12, 12, 10, 'o')

    // Helper to draw analyst silhouette at horizontal offset
    const drawSilhouette = (dx, headCol, bodyCol, eyeCol = null) => {
      // Head
      cv.rect(14 + dx, 13, 4, 4, headCol)
      cv.hline(15 + dx, 13, 2, headCol)
      // Shoulders
      cv.rect(12 + dx, 18, 8, 4, bodyCol)
      cv.hline(13 + dx, 17, 6, bodyCol)
      if (eyeCol) {
        cv.set(15 + dx, 15, eyeCol)
        cv.set(17 + dx, 15, eyeCol)
      }
    }

    if (f === 0) {
      drawSilhouette(0, 'g', 'm')
      cv.set(15, 13, 'w')
    } else if (f === 1) {
      drawSilhouette(0, 'g', 'm')
      // Scanline across photo
      cv.hline(10, 15, 12, 't')
    } else if (f === 2) {
      // Subtle ghostly chromatic split (duplicate analyst!)
      drawSilhouette(-2, 't', 's')
      drawSilhouette(2, 'd', 'd')
      drawSilhouette(0, 'g', 'm')
      cv.hline(10, 17, 12, 'v')
    } else {
      // Frame 3: Two distinct overlapping analysts inside one badge photo
      drawSilhouette(-2, 'l', 's', 'b')
      drawSilhouette(2, 'w', 'm', 'r')
    }

    // Barcode / ID number lines below photo
    cv.hline(9, 25, 10, 'l')
    cv.hline(9, 27, 14, 'm')
    for (let x = 9; x <= 21; x += 2) {
      cv.set(x, 28, x % 4 === 1 ? 'g' : 's')
    }
    // Status dot bottom-right
    cv.set(22, 25, f >= 2 ? 'r' : 'e')
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 3. VOIP DESK PHONE (32x32, 6 frames: 0-1 calm idle, 2-5 ringing EXT. 419!)
// ---------------------------------------------------------------------------
function buildDeskPhone() {
  const frames = []
  for (let f = 0; f < 6; f++) {
    const cv = new PixelCanvas(32, 32)
    const ringing = f >= 2
    const lift = ringing ? (f % 2 === 0 ? -2 : -1) : 0
    const tilt = ringing ? (f === 2 || f === 4 ? -1 : 1) : 0

    // Phone base trapezoid
    cv.rect(5, 14, 22, 14, 'k')
    cv.rect(6, 15, 20, 12, 'c')
    cv.hline(6, 15, 20, 'm')
    cv.strokeRect(6, 15, 20, 12, 's')
    // Cradle recess
    cv.rect(8, 12, 16, 4, 'k')
    cv.rect(9, 13, 14, 2, 's')

    // LCD display on base
    cv.rect(9, 17, 14, 4, 'k')
    cv.rect(10, 18, 12, 2, ringing ? (f % 2 === 0 ? 'd' : 'r') : 'o')
    if (ringing) {
      // "419" tiny pixel blips
      cv.hline(11, 18, 2, 'w')
      cv.set(15, 18, 'w')
      cv.hline(18, 18, 3, 'w')
      cv.hline(11, 19, 10, 'a')
    } else {
      cv.hline(11, 18, 5, 't')
      cv.set(17, 18, f === 1 ? 'b' : 't')
    }

    // Keypad 3x2 dots
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 4; col++) {
        cv.set(10 + col * 3, 23 + r * 2, 'l')
        cv.set(11 + col * 3, 23 + r * 2, 'm')
      }
    }

    // Message Waiting LED (top right of base)
    cv.rect(22, 17, 2, 2, ringing ? (f % 2 === 0 ? 'r' : 'w') : 's')

    // Handset (vibrates when ringing!)
    const hy = 8 + lift
    cv.rect(4, hy, 24, 6, 'k')
    cv.rect(5, hy + 1, 22, 4, 's')
    cv.hline(6, hy + 1, 20, 'l')
    // Left & right earpieces (slightly tilted during ring)
    cv.rect(4, hy + 2 + Math.min(0, tilt), 6, 5, 'k')
    cv.rect(5, hy + 3 + Math.min(0, tilt), 4, 3, 'm')
    cv.rect(22, hy + 2 + Math.min(0, -tilt), 6, 5, 'k')
    cv.rect(23, hy + 3 + Math.min(0, -tilt), 4, 3, 'm')

    // Coiled cord on left side
    cv.set(4, 20, 'm'); cv.set(3, 21, 's'); cv.set(4, 22, 'm'); cv.set(3, 23, 's'); cv.set(4, 24, 'm')

    // Acoustic ring arcs above handset when ringing
    if (ringing) {
      const waveCol = f % 2 === 0 ? 'r' : 'a'
      cv.hline(12, 3, 8, waveCol)
      cv.set(11, 4, waveCol); cv.set(20, 4, waveCol)
      if (f === 3 || f === 5) {
        cv.hline(10, 1, 12, 'r')
        cv.set(9, 2, 'r'); cv.set(22, 2, 'r')
      }
    }
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 4. NIGHT SHIFT COFFEE MUG (24x24, 6 frames: 0-3 warm curling steam, 4-5 frozen cold)
// ---------------------------------------------------------------------------
function buildCoffeeMug() {
  const frames = []
  for (let f = 0; f < 6; f++) {
    const cv = new PixelCanvas(24, 24)
    // Ceramic mug body
    cv.rect(5, 10, 11, 11, 'k')
    cv.rect(6, 11, 9, 9, 's')
    cv.vline(6, 11, 9, 'm')
    cv.vline(7, 11, 9, 'l')
    cv.vline(14, 11, 9, 'c')
    // Rim & dark coffee surface
    cv.hline(6, 10, 9, 'g')
    cv.hline(7, 11, 7, 'k')
    cv.hline(8, 11, 5, f < 4 ? 'u' : 'o')
    // Subtle mug emblem stripe
    cv.hline(8, 15, 5, f < 4 ? 'a' : 'm')
    cv.hline(8, 16, 5, f < 4 ? 'u' : 's')
    // Handle on right
    cv.rect(16, 12, 3, 7, 'k')
    cv.rect(16, 13, 2, 5, 'm')
    cv.rect(16, 14, 1, 3, 'o')
    // Saucer shadow
    cv.hline(4, 21, 13, 'k')
    cv.hline(6, 20, 9, 'c')

    // Curling steam (frames 0-3 alive; frames 4-5 dead cold/frozen at 03:07)
    if (f < 4) {
      const s1 = [0, 1, 0, -1][f]
      const s2 = [0, -1, 0, 1][f]
      cv.set(8 + s1, 8, 'l')
      cv.set(8 + s2, 6, 'm')
      cv.set(9 + s1, 4, 's')
      cv.set(12 + s2, 8, 'g')
      cv.set(12 + s1, 6, 'l')
      cv.set(11 + s2, 4, 'm')
      if (f % 2 === 0) cv.set(12, 2, 's')
    } else {
      // Cold shimmer crystal pixel on rim (time stopped)
      cv.set(7, 10, 'b')
      cv.set(13, 10, 'w')
    }
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 5. SIX 24x24 STATUS ICONS (colorblind-safe silhouettes!)
// ---------------------------------------------------------------------------
function buildStatusIcons() {
  const icons = []

  // 0: Ticket slip with notched sides
  {
    const cv = new PixelCanvas(24, 24)
    cv.rect(3, 5, 18, 14, 'k')
    cv.rect(4, 6, 16, 12, 's')
    cv.hline(4, 6, 16, 'm')
    // Side ticket notches
    cv.rect(3, 11, 2, 2, 'o'); cv.set(3, 11, null); cv.set(3, 12, null)
    cv.rect(19, 11, 2, 2, 'o'); cv.set(20, 11, null); cv.set(20, 12, null)
    // Header accent bar & lines
    cv.rect(6, 8, 12, 2, 'b')
    cv.hline(6, 12, 9, 'w')
    cv.hline(6, 14, 11, 'g')
    cv.hline(6, 16, 6, 'l')
    icons.push({ name: 'icon-ticket', cv })
  }

  // 1: Audit Trail (ledger + magnifying glass)
  {
    const cv = new PixelCanvas(24, 24)
    cv.rect(3, 2, 13, 18, 'k')
    cv.rect(4, 3, 11, 16, 'c')
    cv.strokeRect(4, 3, 11, 16, 'm')
    cv.hline(6, 6, 7, 'g')
    cv.hline(6, 9, 7, 'r') // Highlighted anomalous 03:07 row!
    cv.hline(6, 12, 5, 'l')
    cv.hline(6, 15, 6, 'l')
    // Magnifying lens overlapping bottom-right
    cv.rect(11, 10, 9, 9, 'k')
    cv.rect(12, 11, 7, 7, 'b')
    cv.rect(13, 12, 5, 5, 'o')
    cv.set(14, 13, 'w')
    cv.line(19, 18, 22, 21, 'k')
    cv.line(18, 18, 21, 21, 'g')
    icons.push({ name: 'icon-audit', cv })
  }

  // 2: Clock (03:07 anomaly clock face)
  {
    const cv = new PixelCanvas(24, 24)
    // Octagonal/round bezel
    cv.rect(5, 3, 14, 18, 'k')
    cv.rect(3, 5, 18, 14, 'k')
    cv.rect(6, 4, 12, 16, 's')
    cv.rect(4, 6, 16, 12, 's')
    cv.rect(6, 6, 12, 12, 'o')
    // Cardinal ticks
    cv.set(12, 6, 'g'); cv.set(12, 17, 'g'); cv.set(6, 12, 'g'); cv.set(17, 12, 'g')
    // Hour hand at 3, minute hand past 1 (03:07)
    cv.hline(12, 12, 4, 'w')
    cv.line(12, 12, 15, 7, 'r')
    cv.set(12, 12, 'b')
    icons.push({ name: 'icon-clock', cv })
  }

  // 3: RFID Security Badge / Keycard
  {
    const cv = new PixelCanvas(24, 24)
    cv.rect(2, 5, 20, 14, 'k')
    cv.rect(3, 6, 18, 12, 's')
    cv.hline(3, 6, 18, 'l')
    cv.rect(5, 8, 6, 8, 'o')
    cv.rect(7, 9, 2, 2, 'g')
    cv.rect(6, 12, 4, 3, 'm')
    // RFID wave arcs
    cv.vline(14, 10, 4, 'e')
    cv.vline(16, 9, 6, 'b')
    cv.vline(18, 8, 8, 't')
    icons.push({ name: 'icon-badge', cv })
  }

  // 4: Anomaly Diamond Alert (distinct shape from circle/square!)
  {
    const cv = new PixelCanvas(24, 24)
    for (let dy = -9; dy <= 9; dy++) {
      const span = 9 - Math.abs(dy)
      cv.hline(12 - span, 12 + dy, span * 2 + 1, 'k')
      if (span >= 1) {
        cv.hline(12 - span + 1, 12 + dy, Math.max(1, (span - 1) * 2 + 1), Math.abs(dy) === 8 ? 'r' : 'd')
      }
      if (span >= 2) {
        cv.hline(12 - span + 2, 12 + dy, Math.max(1, (span - 2) * 2 + 1), 'r')
      }
    }
    // Crisp white exclamation mark
    cv.rect(11, 7, 2, 6, 'w')
    cv.rect(11, 15, 2, 2, 'w')
    icons.push({ name: 'icon-anomaly', cv })
  }

  // 5: Resolved Archive Folder
  {
    const cv = new PixelCanvas(24, 24)
    cv.rect(2, 6, 9, 4, 'k')
    cv.rect(3, 7, 7, 3, 'm')
    cv.rect(2, 9, 20, 12, 'k')
    cv.rect(3, 10, 18, 10, 's')
    cv.hline(3, 10, 18, 'l')
    // Emerald check mark stamped on folder
    cv.line(8, 15, 11, 18, 'e')
    cv.line(11, 18, 17, 12, 'e')
    cv.line(8, 14, 11, 17, 'w')
    cv.line(11, 17, 17, 11, 'w')
    icons.push({ name: 'icon-archive', cv })
  }

  return icons
}

// ---------------------------------------------------------------------------
// CCTV Overlay helper (bezel frame, REC dot, scanline sweep)
// ---------------------------------------------------------------------------
function applyCctvOverlay(cv, frameIdx, alertMode) {
  // Moving horizontal CRT scanline bar
  const scanY = (frameIdx * 6 + 3) % 44 + 2
  for (let x = 2; x < 62; x++) {
    if (x % 2 === 0) {
      const existing = cv.get(x, scanY)
      if (existing === PAL.o || existing === PAL.k) cv.set(x, scanY, 'c')
    }
  }
  // Subtle corner viewfinder brackets
  const brk = alertMode ? 'r' : 'l'
  cv.hline(2, 2, 4, brk); cv.vline(2, 2, 4, brk)
  cv.hline(58, 2, 4, brk); cv.vline(61, 2, 4, brk)
  cv.hline(2, 45, 4, brk); cv.vline(2, 42, 4, brk)
  cv.hline(58, 45, 4, brk); cv.vline(61, 42, 4, brk)

  // Blinking REC dot top-left
  if (frameIdx % 2 === 0) {
    cv.rect(5, 5, 2, 2, 'r')
  } else {
    cv.rect(5, 5, 2, 2, 'd')
  }
  // Outer 1px CRT bezel border
  cv.strokeRect(0, 0, 64, 48, 'k')
  cv.strokeRect(1, 1, 62, 46, 's')
}

// ---------------------------------------------------------------------------
// 6. CCTV FEED 1: CASE 1 — WKST-B3-204 (64x48, 8 frames)
//    Frames 0-3: Dark empty cubicle at 03:00, monitor off, amber standby LED
//    Frames 4-7: Monitor self-powers on! Phosphor glow + ghostly reflection on F6
// ---------------------------------------------------------------------------
function buildCctvWorkstation() {
  const frames = []
  for (let f = 0; f < 8; f++) {
    const cv = new PixelCanvas(64, 48)
    const poweredOn = f >= 4
    const ghostFrame = f === 6

    // Room backdrop
    cv.rect(0, 0, 64, 48, 'o')
    // Back cubicle wall
    cv.rect(2, 2, 60, 27, 'c')
    // Venetian window blinds on left-back wall
    cv.rect(6, 5, 16, 15, 'k')
    for (let y = 6; y < 19; y += 2) {
      cv.hline(7, y, 14, 's')
      if (y % 4 === 0) cv.hline(8, y, 6, 'm') // faint moonlight strip
    }
    // Wall clock on right wall (tiny pixel face)
    cv.rect(49, 7, 7, 7, 'k')
    cv.rect(50, 8, 5, 5, 's')
    cv.set(52, 10, 'w'); cv.set(54, 10, 'w'); cv.set(52, 8, poweredOn ? 'r' : 'b')

    // Overhead fluorescent tube (dim / flickers faintly on frame 5)
    cv.rect(22, 2, 20, 2, f === 5 ? 'g' : 's')
    if (f === 5) cv.ditherRect(18, 4, 28, 6, 's', 1, 2)

    // Desk top surface (perspective trapezoid)
    cv.rect(4, 29, 56, 17, 's')
    cv.hline(4, 29, 56, poweredOn ? 't' : 'm')
    cv.rect(4, 34, 56, 12, 'c')
    // Light pool cast onto desk when monitor powers on!
    if (poweredOn) {
      cv.ditherRect(18, 29, 28, 8, 't', f % 2, 2)
      cv.ditherRect(23, 30, 18, 5, 'b', 0, 3)
    }

    // Retro CRT Workstation Monitor (center)
    cv.rect(20, 11, 24, 17, 'k')
    cv.rect(21, 12, 22, 15, 'm')
    cv.hline(21, 12, 22, 'l')
    cv.vline(42, 12, 15, 's')
    // Monitor stand neck + base
    cv.rect(28, 28, 8, 2, 'k')
    cv.rect(25, 30, 14, 2, 's')
    cv.hline(26, 30, 12, 'm')

    // CRT Glass Screen (18x11)
    cv.rect(23, 14, 18, 11, 'k')
    if (!poweredOn) {
      cv.rect(24, 15, 16, 9, 'o')
      // Subtle glass corner glint
      cv.set(25, 16, 's'); cv.set(26, 16, 's'); cv.set(25, 17, 's')
      // Blinking amber standby LED
      cv.set(40, 26, f % 2 === 0 ? 'a' : 'c')
    } else {
      // Self-powered glowing terminal screen!
      cv.rect(24, 15, 16, 9, 't')
      cv.ditherRect(24, 15, 16, 9, 'b', f % 2, 2)
      // Tiny glowing terminal log lines on screen
      cv.hline(25, 16, 9, 'w')
      cv.hline(25, 18, 12, 'b')
      cv.hline(25, 20, 7, 'r') // 03:07 anomaly line!
      cv.hline(25, 22, 10, 'w')
      // Subtle ghostly silhouette reflection inside CRT glass on peak frame 6
      if (ghostFrame) {
        // Translucent dark-teal glass reflection of head + sloped shoulders
        cv.hline(31, 16, 3, 'o')
        cv.rect(30, 17, 5, 3, 'o')
        cv.hline(31, 20, 3, 'o')
        cv.hline(29, 21, 7, 'c')
        cv.hline(28, 22, 9, 'o')
        // Faint pale glint where eyes catch phosphor glow
        cv.set(31, 18, 'g')
        cv.set(33, 18, 'g')
      }
      // Bright crimson/emerald active LED
      cv.set(40, 26, ghostFrame ? 'r' : 'e')
    }

    // Keyboard on desk
    cv.rect(21, 33, 22, 4, 'k')
    cv.rect(22, 34, 20, 2, poweredOn ? 'l' : 'm')
    for (let x = 23; x < 41; x += 2) cv.set(x, 34, 's')

    // Empty desk chair backrest visible at bottom-left foreground
    cv.rect(8, 35, 12, 11, 'k')
    cv.rect(9, 36, 10, 10, 'o')
    cv.hline(10, 36, 8, 's')

    // Small pixel desk lamp on right
    cv.rect(50, 24, 5, 5, 'k')
    cv.rect(51, 25, 3, 3, 'm')
    cv.vline(53, 28, 5, 's')
    cv.rect(50, 32, 6, 2, 'm')

    applyCctvOverlay(cv, f, poweredOn)
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 7. CCTV FEED 2: CASE 2 — FLOOR 4 NORTH STAIRWELL ACCESS DOOR (64x48, 8 frames)
//    Frames 0-3: Locked heavy door, red RFID reader LED, empty concrete hall
//    Frames 4-7: Badge #0419 granted (green LED!), door cracks open spilling cold violet light
// ---------------------------------------------------------------------------
function buildCctvStairwell() {
  const frames = []
  for (let f = 0; f < 8; f++) {
    const cv = new PixelCanvas(64, 48)
    const unlocked = f >= 4
    const wideOpen = f >= 6

    // Concrete hallway perspective
    cv.rect(0, 0, 64, 48, 'o')
    // Ceiling
    cv.rect(2, 2, 60, 10, 'c')
    // Perspective walls left & right
    for (let i = 0; i < 18; i++) {
      const col = i < 9 ? 's' : 'c'
      cv.vline(2 + i, 2 + Math.floor(i / 2), 44 - i, col)
      cv.vline(61 - i, 2 + Math.floor(i / 2), 44 - i, col)
    }
    // Perspective corridor edge lines
    cv.line(2, 2, 20, 11, 'k')
    cv.line(61, 2, 43, 11, 'k')
    cv.line(2, 45, 20, 36, 'k')
    cv.line(61, 45, 43, 36, 'k')

    // Back wall surrounding stairwell door
    cv.rect(20, 11, 24, 25, 's')
    // Corridor floor tiles
    cv.rect(20, 36, 24, 10, 'c')
    cv.line(32, 36, 32, 46, 'o')
    cv.hline(14, 40, 36, 'o')
    cv.hline(8, 44, 48, 'o')

    // Overhead wire-cage lamp (flickers faintly when door unlocks)
    cv.rect(28, 5, 8, 3, 'k')
    cv.rect(29, 6, 6, 1, f === 5 ? 'o' : 'w')
    if (f !== 5) cv.ditherRect(24, 8, 16, 4, 'm', 0, 2)

    // Heavy Steel Stairwell Door (24, 14, 15, 22)
    cv.rect(24, 14, 15, 22, 'k')
    if (!unlocked) {
      cv.rect(25, 15, 13, 21, 'm')
      cv.strokeRect(25, 15, 13, 21, 's')
      // Small wired glass door slit
      cv.rect(29, 17, 5, 7, 'k')
      cv.rect(30, 18, 3, 5, 'o')
      // Push bar
      cv.hline(26, 27, 11, 'g')
    } else {
      // Doorajar! Cold violet/cyan stairwell light pours through the gap on the right!
      const gap = wideOpen ? 4 : 2
      cv.rect(25, 15, 13 - gap, 21, 'm')
      cv.rect(25 + (13 - gap), 15, gap, 21, wideOpen ? 'b' : 'v')
      cv.vline(37, 15, 21, 'w')
      // Wired glass window lit from behind
      cv.rect(28, 17, 4, 7, 'k')
      cv.rect(29, 18, 2, 5, 'v')
      // Angled trapezoidal light spill pouring out of the cracked door edge onto floor
      for (let dy = 0; dy < 10; dy++) {
        const leftX = 35 - Math.floor(dy * 0.9)
        const rightX = Math.min(46, 38 + Math.floor(dy * 0.7))
        for (let x = leftX; x <= rightX; x++) {
          if ((x + dy + (f % 2)) % 2 === 0) {
            cv.set(x, 36 + dy, wideOpen && x >= 35 - Math.floor(dy * 0.3) ? 'b' : 'v')
          }
        }
      }
      // Subtle shadow figure visible behind the small wired door glass on frame 7
      if (f === 7) {
        cv.rect(29, 19, 2, 2, 'o')
        cv.rect(29, 21, 2, 2, 'k')
      }
    }

    // RFID Badge Reader mounted right of door (41, 23)
    cv.rect(40, 22, 4, 6, 'k')
    cv.rect(41, 23, 2, 4, 'c')
    // LED: crimson locked -> emerald ACCESS GRANTED!
    cv.set(42, 23, unlocked ? (f % 2 === 0 ? 'e' : 'w') : (f % 2 === 0 ? 'r' : 'd'))

    // EXIT sign above door
    cv.rect(29, 11, 6, 2, 'd')
    cv.hline(30, 11, 4, 'r')

    applyCctvOverlay(cv, f, unlocked)
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// 8. CCTV FEED 3: CASE 3 — CAM-B4-OPS // DESK B-04 (BEHIND YOU!) (64x48, 8 frames)
//    Frames 0-3: Your desk seen from ceiling cam — monitors dark, empty chair
//    Frames 4-7: Monitors flare cyan-red + faint double-exposure operator sitting in YOUR chair!
// ---------------------------------------------------------------------------
function buildCctvDeskB04() {
  const frames = []
  for (let f = 0; f < 8; f++) {
    const cv = new PixelCanvas(64, 48)
    const haunted = f >= 4

    // Dim floor tiles
    cv.rect(0, 0, 64, 48, 'o')
    for (let y = 6; y < 46; y += 8) cv.hline(2, y, 60, 'c')
    for (let x = 8; x < 60; x += 12) cv.vline(x, 2, 44, 'c')

    // Back wall with digital shift clock
    cv.rect(2, 2, 60, 13, 'c')
    cv.rect(25, 4, 14, 6, 'k')
    // Digital 03:07 / 03:21 pixel glow
    const clk = haunted ? 'r' : 'b'
    cv.hline(27, 6, 2, clk); cv.hline(27, 8, 2, clk)
    cv.set(31, 6, clk); cv.set(31, 8, clk)
    cv.hline(33, 6, 4, clk); cv.set(36, 7, clk); cv.set(35, 8, clk)

    // Wide Night Operations Desk B-04
    cv.rect(6, 15, 52, 16, 'k')
    cv.rect(7, 16, 50, 14, 's')
    cv.hline(7, 16, 50, 'm')

    // Dual Monitors on Desk B-04
    // Left monitor
    cv.rect(12, 10, 17, 11, 'k')
    cv.rect(13, 11, 15, 9, haunted ? 't' : 'o')
    if (haunted) {
      cv.hline(14, 13, 10, 'b')
      cv.hline(14, 15, 12, 'w')
      cv.hline(14, 17, 8, 'r')
    }
    // Right monitor
    cv.rect(33, 10, 17, 11, 'k')
    cv.rect(34, 11, 15, 9, haunted ? 'd' : 'o')
    if (haunted) {
      cv.hline(35, 13, 11, 'r')
      cv.hline(35, 15, 9, 'a')
      cv.hline(35, 17, 12, 'w')
    }

    // Monitor glow across desk
    if (haunted) {
      cv.ditherRect(12, 21, 38, 8, 't', f % 2, 2)
      cv.ditherRect(33, 21, 17, 7, 'd', 0, 2)
    }

    // VoIP phone on left edge of desk & coffee mug on right
    cv.rect(8, 22, 4, 5, 'k'); cv.set(9, 23, haunted && f % 2 === 0 ? 'r' : 'm')
    cv.rect(52, 23, 3, 4, 'k'); cv.rect(52, 23, 2, 3, 'u')

    // Swivel Office Chair seen from behind (center foreground)
    cv.rect(24, 27, 16, 15, 'k')
    cv.rect(25, 28, 14, 13, 'c')
    cv.hline(26, 28, 12, 'm')
    cv.rect(29, 42, 6, 4, 's') // chair stem

    // Haunted frames: A calm, silhouetted operator sits in YOUR chair facing the monitors
    if (haunted) {
      // Sculpted head silhouette (rounded crown, rim-lit by monitors)
      cv.hline(30, 20, 4, 'b')
      cv.rect(29, 21, 6, 4, 'k')
      cv.rect(30, 21, 4, 3, 'o')
      cv.hline(30, 25, 4, 'k') // neck
      // Sloped shoulders over chair back
      cv.hline(27, 26, 10, 'k')
      cv.rect(26, 27, 12, 5, 'k')
      cv.ditherRect(27, 27, 10, 4, 's', 0, 2)
      cv.hline(27, 26, 3, 't') // cyan monitor rim on left shoulder
      cv.hline(34, 26, 3, 'd') // crimson monitor rim on right shoulder
      // Subtle ghostly double-exposure echo shifted 2px right on frames 6-7
      if (f >= 6) {
        cv.hline(33, 20, 4, 'v')
        cv.ditherRect(32, 21, 6, 4, f === 7 ? 'r' : 'v', 1, 2)
        cv.ditherRect(30, 26, 10, 4, 'd', 0, 2)
      }
    }

    applyCctvOverlay(cv, f, haunted)
    frames.push(cv)
  }
  return frames
}

// ---------------------------------------------------------------------------
// Main Execution
// ---------------------------------------------------------------------------
async function main() {
  console.log('Connecting to Piskel MCP Server...')
  const client = new PiskelClient()
  try {
    await client.init()

    // 1. Halcyon Logo
    const logoFrames = buildHalcyonLogo()
    await emitProject(client, {
      id: 'ns-halcyon-logo',
      name: 'Halcyon Desk Emblem',
      width: 32,
      height: 32,
      fps: 2,
      frames: logoFrames,
      sheetPath: path.join(OUT_DIR, 'halcyon-logo.png'),
      previewPath: path.join(PREVIEWS_DIR, 'halcyon-logo-4x.png'),
      singlePngs: [
        { frameIndex: 0, outputPath: path.join(ROOT, 'public', 'favicon.png'), scale: 1 },
      ],
    })

    // 2. Analyst ID Badge
    await emitProject(client, {
      id: 'ns-analyst-badge',
      name: 'Analyst ID Badge',
      width: 32,
      height: 32,
      fps: 4,
      frames: buildAnalystBadge(),
      sheetPath: path.join(OUT_DIR, 'analyst-badge.png'),
      previewPath: path.join(PREVIEWS_DIR, 'analyst-badge-4x.png'),
    })

    // 3. VoIP Desk Phone
    await emitProject(client, {
      id: 'ns-desk-phone',
      name: 'VoIP Desk Handset',
      width: 32,
      height: 32,
      fps: 8,
      frames: buildDeskPhone(),
      sheetPath: path.join(OUT_DIR, 'desk-phone.png'),
      previewPath: path.join(PREVIEWS_DIR, 'desk-phone-4x.png'),
      gifPath: path.join(PREVIEWS_DIR, 'desk-phone.gif'),
      gifScale: 4,
    })

    // 4. Night Shift Coffee Mug
    await emitProject(client, {
      id: 'ns-coffee-mug',
      name: 'Night Shift Coffee Mug',
      width: 24,
      height: 24,
      fps: 4,
      frames: buildCoffeeMug(),
      sheetPath: path.join(OUT_DIR, 'coffee-mug.png'),
      previewPath: path.join(PREVIEWS_DIR, 'coffee-mug-4x.png'),
    })

    // 5. Status Icons (strip + individual 24x24 PNGs)
    const iconEntries = buildStatusIcons()
    await emitProject(client, {
      id: 'ns-status-icons',
      name: 'Status Icon Set',
      width: 24,
      height: 24,
      fps: 2,
      frames: iconEntries.map((i) => i.cv),
      sheetPath: path.join(OUT_DIR, 'status-icons.png'),
      previewPath: path.join(PREVIEWS_DIR, 'status-icons-4x.png'),
      singlePngs: iconEntries.map((item, idx) => ({
        frameIndex: idx,
        outputPath: path.join(ICONS_DIR, `${item.name}.png`),
        scale: 1,
      })),
    })

    // 6. CCTV Case 1: Workstation B3-204
    await emitProject(client, {
      id: 'ns-cctv-workstation',
      name: 'CCTV Workstation B3-204',
      width: 64,
      height: 48,
      fps: 6,
      frames: buildCctvWorkstation(),
      sheetPath: path.join(OUT_DIR, 'cctv-workstation.png'),
      previewPath: path.join(PREVIEWS_DIR, 'cctv-workstation-3x.png'),
      previewScale: 3,
      gifPath: path.join(PREVIEWS_DIR, 'cctv-workstation.gif'),
      gifScale: 4,
    })

    // 7. CCTV Case 2: Floor 4 North Stairwell
    await emitProject(client, {
      id: 'ns-cctv-stairwell',
      name: 'CCTV Stairwell Access Door',
      width: 64,
      height: 48,
      fps: 6,
      frames: buildCctvStairwell(),
      sheetPath: path.join(OUT_DIR, 'cctv-stairwell.png'),
      previewPath: path.join(PREVIEWS_DIR, 'cctv-stairwell-3x.png'),
      previewScale: 3,
      gifPath: path.join(PREVIEWS_DIR, 'cctv-stairwell.gif'),
      gifScale: 4,
    })

    // 8. CCTV Case 3: Desk B-04 (Behind You)
    await emitProject(client, {
      id: 'ns-cctv-desk-b04',
      name: 'CCTV Desk B-04 Behind You',
      width: 64,
      height: 48,
      fps: 6,
      frames: buildCctvDeskB04(),
      sheetPath: path.join(OUT_DIR, 'cctv-desk-b04.png'),
      previewPath: path.join(PREVIEWS_DIR, 'cctv-desk-b04-3x.png'),
      previewScale: 3,
      gifPath: path.join(PREVIEWS_DIR, 'cctv-desk-b04.gif'),
      gifScale: 4,
    })

    console.log('All Piskel sprites exported cleanly!')
  } finally {
    client.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
