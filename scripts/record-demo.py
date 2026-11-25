"""
Night Shift Help Desk — Automated YouTube Demo Video Producer (< 3 min, 1280x720 H.264 MP4)

Supports studio-grade neural TTS providers (checked in priority order via env or gitignored .env.local):
  1. ElevenLabs       (ELEVENLABS_API_KEY, optional ELEVENLABS_VOICE_ID) — most expressive horror/storytelling voice
  2. Google Cloud TTS (GOOGLE_TTS_API_KEY, Chirp 3 HD voice)            — crisp, lively broadcast narration
  3. Edge Neural TTS  (edge-tts using OS truststore if available)       — zero-key neural fallback
  4. Windows SAPI                                                        — offline last-resort fallback

Also trims the leading Playwright `about:blank` load frames automatically so there is ZERO
white flash at the transition from Title Card into live gameplay, and burns 43 crisp Phosphor-Noir
chunked subtitles directly into the final MP4 alongside the matching .srt file.
"""
from __future__ import annotations

import asyncio
import base64
import json
import math
import os
import re
import shutil
import struct
import subprocess
import time
import wave
from pathlib import Path
from typing import Dict, List, Tuple

import requests
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DEMO_DIR = ROOT / "demo"
WORK_DIR = DEMO_DIR / "_build"
SPRITES_DIR = ROOT / "public" / "sprites"
LIVE_URL = "https://pakorn269.github.io/night-shift-help-desk/"

OUT_MP4 = DEMO_DIR / "night-shift-help-desk-kiroween-demo.mp4"
OUT_SRT = DEMO_DIR / "night-shift-help-desk-kiroween-demo.srt"
OUT_THUMB = DEMO_DIR / "youtube-thumbnail.png"

WIDTH = 1280
HEIGHT = 720

# Default expressive voices
DEFAULT_ELEVENLABS_VOICE = "nPczCjzI2devNBz1zQrb"  # "Brian" — warm, resonant, suspenseful narrator
DEFAULT_GOOGLE_VOICE = "en-US-Chirp3-HD-Charon"    # Chirp 3 HD — lively, natural nocturnal narrator
DEFAULT_EDGE_VOICE = "en-US-AndrewMultilingualNeural"

# Phosphor-Noir palette matching docs/art-direction-brief.md
C_VOID = (6, 9, 14)
C_OBSIDIAN = (12, 17, 26)
C_CHARCOAL = (21, 29, 43)
C_SLATE = (35, 47, 66)
C_STEEL = (59, 77, 104)
C_MIST = (104, 125, 156)
C_SILVER = (159, 178, 204)
C_WHITE = (226, 236, 248)
C_CYAN = (56, 189, 248)
C_EMERALD = (16, 185, 129)
C_AMBER = (245, 158, 11)
C_CRIMSON = (239, 68, 68)
C_VIOLET = (139, 92, 246)

# Scripted segments: (id, narration_text, lower_third_label)
SEGMENTS: List[Tuple[str, str, str]] = [
    (
        "01_intro",
        "Welcome to Night Shift Help Desk—our Kiroween Costume Contest entry. "
        "Instead of pasting Halloween decorations onto a generic app, the ordinary workplace software itself is the horror.",
        "KIROWEEN 2026 · COSTUME CONTEST",
    ),
    (
        "02_checkin",
        "You clock in alone at 3:00 AM on Halcyon Desk version 4.2. "
        "Personalizing your analyst badge writes your own name directly into every forensic log and shift ending.",
        "01 // NIGHT SHIFT CHECK-IN (03:00)",
    ),
    (
        "03_case1_inspect",
        "Incident 0300 reports an empty workstation powering on by itself at 3:00 AM. "
        "Inspecting the audit trail reveals an impossible closure timestamped 3:07—seven minutes in the future—already signed by you.",
        "02 // IMPOSSIBLE 03:07 AUDIT TRAIL",
    ),
    (
        "04_case1_cctv",
        "Every live camera feed is custom animated pixel art authored via the Piskel MCP server. "
        "Zooming into Camera B3-204 reveals the terminal booting on its own, with a faint silhouette reflected in the CRT glass.",
        "03 // PISKEL MCP 6× CCTV INSPECTOR",
    ),
    (
        "05_case1_close",
        "If you trust the log and close the ticket, the shift clock snaps forward to 3:07, "
        "a duplicate closure appears under your name, and your steaming coffee mug sprite freezes cold.",
        "04 // PATH A: COMPLY — CLOCK JUMP 03:07",
    ),
    (
        "06_case1_call",
        "Replaying the case to challenge the log deletes the 3:07 entry, injects a phantom ticket from your own extension, "
        "and rings your desk handset. Answering Extension 419 uncovers a chilling loopback transcript from yourself.",
        "05 // PATH B: DEFY — VOIP LOOPBACK EXT. 419",
    ),
    (
        "07_case2",
        "Case two escalates seven minutes later at 3:14. Your RFID badge unlocks the empty North Stairwell while still docked on your desk, "
        "and the audit log remembers your earlier choice as the stairwell door cracks open on camera.",
        "06 // CASE 2: INC-0314 EMPTY STAIRWELL",
    ),
    (
        "08_case3",
        "By 3:21, the console itself turns uncanny: the Halcyon eye watches in crimson, your ID badge splits into two overlapping silhouettes, "
        "your prior choices appear pre-dated at 2:55, and the ceiling camera behind Desk B-04 shows someone sitting in your chair.",
        "07 // CASE 3: INC-0321 SHIFT HANDOVER",
    ),
    (
        "09_dossier",
        "Your compliance and defiance pattern unlocks four persistent shift endings—like Extension 419—tracked in an end-of-shift dossier "
        "with a shareable report card, Calm Mode for reduced motion, and zero jump scares or color-only clues.",
        "08 // 4 PERSISTENT ENDINGS & ACCESSIBILITY",
    ),
    (
        "10_mobile",
        "Built mobile-first down to 360 pixels, critical timestamps and controls stay legible without clipping on phones, "
        "backed by a procedural Web Audio bus mixer with adaptive dread layering.",
        "09 // 360px MOBILE-FIRST & WEB AUDIO",
    ),
    (
        "11_kiro_outro",
        "Engineered with Kiro specs, steering docs, agent hooks, Piskel MCP pixel sprites, and 35 Vitest and fast-check property tests passing on Linux CI. "
        "Play live on GitHub Pages—and watch your clock at 3:00 AM.",
        "10 // BUILT WITH KIRO + PISKEL MCP",
    ),
]


def load_dotenv_local() -> None:
    """Loads optional gitignored .env.local variables without overriding existing env vars."""
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        return
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and v and not os.environ.get(k):
            os.environ[k] = v


def run_cmd(args: List[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def probe_duration(path: Path) -> float:
    res = run_cmd([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ])
    return float(res.stdout.strip())


# ---------------------------------------------------------------------------
# Multi-Provider Studio Neural TTS
# ---------------------------------------------------------------------------
def synth_elevenlabs(text: str, out_mp3: Path, api_key: str) -> None:
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_ELEVENLABS_VOICE)
    model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    resp = requests.post(
        url,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.78,
                "style": 0.35,
                "use_speaker_boost": True,
            },
        },
        timeout=45,
    )
    resp.raise_for_status()
    out_mp3.write_bytes(resp.content)


def synth_google_tts(text: str, out_mp3: Path, api_key: str) -> None:
    voice_name = os.environ.get("GOOGLE_TTS_VOICE", DEFAULT_GOOGLE_VOICE)
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}"
    resp = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "en-US", "name": voice_name},
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 1.0,
            },
        },
        timeout=45,
    )
    resp.raise_for_status()
    data = resp.json()
    out_mp3.write_bytes(base64.b64decode(data["audioContent"]))


async def synth_edge_tts(text: str, out_mp3: Path) -> None:
    try:
        import truststore
        truststore.inject_into_ssl()
    except Exception:
        pass
    import edge_tts
    voice = os.environ.get("EDGE_TTS_VOICE", DEFAULT_EDGE_VOICE)
    communicate = edge_tts.Communicate(text, voice=voice, rate="+2%", pitch="-1Hz")
    await communicate.save(str(out_mp3))


def synth_sapi_fallback(text: str, out_wav: Path) -> None:
    safe_text = text.replace("'", "''")
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.Rate = 1; "
        f"$s.SetOutputToWaveFile('{out_wav}'); "
        f"$s.Speak('{safe_text}'); "
        "$s.Dispose();"
    )
    run_cmd(["powershell", "-NoProfile", "-Command", ps])


def generate_narration() -> Dict[str, Tuple[Path, float]]:
    """Generates studio 48kHz stereo WAV narration using the best configured TTS engine."""
    load_dotenv_local()
    audio_dir = WORK_DIR / "narration"
    audio_dir.mkdir(parents=True, exist_ok=True)
    results: Dict[str, Tuple[Path, float]] = {}

    eleven_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    google_key = (os.environ.get("GOOGLE_TTS_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()

    provider = (
        "elevenlabs" if eleven_key
        else "google" if google_key
        else "edge"
    )
    print(f"  [tts] active provider: {provider}")

    for seg_id, text, _ in SEGMENTS:
        mp3_path = audio_dir / f"{seg_id}.mp3"
        wav_path = audio_dir / f"{seg_id}.wav"

        if provider == "elevenlabs":
            synth_elevenlabs(text, mp3_path, eleven_key)
            run_cmd(["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "48000", "-ac", "2", str(wav_path)])
        elif provider == "google":
            synth_google_tts(text, mp3_path, google_key)
            run_cmd(["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "48000", "-ac", "2", str(wav_path)])
        else:
            try:
                asyncio.run(synth_edge_tts(text, mp3_path))
                run_cmd(["ffmpeg", "-y", "-i", str(mp3_path), "-ar", "48000", "-ac", "2", str(wav_path)])
            except Exception as exc:
                print(f"  [tts] edge_tts failed ({exc}); falling back to Windows SAPI")
                raw_wav = audio_dir / f"{seg_id}_sapi.wav"
                synth_sapi_fallback(text, raw_wav)
                run_cmd(["ffmpeg", "-y", "-i", str(raw_wav), "-ar", "48000", "-ac", "2", str(wav_path)])

        dur = probe_duration(wav_path)
        results[seg_id] = (wav_path, dur)
        print(f"  [tts] {seg_id}: {dur:.2f}s")
    return results


# ---------------------------------------------------------------------------
# Phosphor-Noir Cards & Pixel Art Compositing
# ---------------------------------------------------------------------------
def load_font(size: int, mono: bool = False, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        ["C:/Windows/Fonts/consolab.ttf", "C:/Windows/Fonts/courbd.ttf"] if (mono and bold)
        else ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"] if mono
        else ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"] if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]
    )
    for fp in candidates:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def draw_scanlines_and_frame(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(0, HEIGHT, 3):
        draw.line([(0, y), (WIDTH, y)], fill=(18, 25, 38, 255))
    draw.rectangle([28, 28, WIDTH - 28, HEIGHT - 28], outline=(35, 47, 66, 255), width=2)


def paste_sprite_frame(canvas: Image.Image, sheet_path: Path, frame_idx: int, total_frames: int, pos: Tuple[int, int], scale: int) -> None:
    sheet = Image.open(sheet_path).convert("RGBA")
    fw = sheet.width // total_frames
    fh = sheet.height
    crop = sheet.crop((frame_idx * fw, 0, (frame_idx + 1) * fw, fh))
    resized = crop.resize((fw * scale, fh * scale), Image.Resampling.NEAREST)
    canvas.alpha_composite(resized, dest=pos)


def create_title_card(out_png: Path) -> None:
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_OBSIDIAN + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_scanlines_and_frame(img)

    draw.rectangle([60, 60, WIDTH - 60, 126], fill=C_CHARCOAL + (235,), outline=C_SLATE + (255,), width=2)
    f_mono_sm = load_font(18, mono=True, bold=True)
    f_mono_md = load_font(19, mono=True, bold=True)
    f_title = load_font(66, bold=True)
    f_sub = load_font(26, bold=False)

    draw.text((92, 82), "KIROWEEN 2026  //  COSTUME CONTEST ENTRY", font=f_mono_sm, fill=C_CYAN)
    draw.text((WIDTH - 320, 82), "CLOCK: 03:00  |  NTP: DRIFT", font=f_mono_sm, fill=C_AMBER)

    paste_sprite_frame(img, SPRITES_DIR / "halcyon-logo.png", 0, 2, (92, 168), 4)
    draw.text((252, 174), "Night Shift Help Desk", font=f_title, fill=C_WHITE)
    draw.text((256, 254), "HALCYON DESK // ITSM v4.2 — The workplace software is the haunted object.", font=f_sub, fill=C_SILVER)

    thumbs = [
        ("CAM-B3-204 · 03:00", SPRITES_DIR / "cctv-workstation.png", 6, C_CYAN),
        ("CAM-B4-STAIR-N · 03:14", SPRITES_DIR / "cctv-stairwell.png", 6, C_VIOLET),
        ("CAM-B4-OPS · 03:21", SPRITES_DIR / "cctv-desk-b04.png", 6, C_CRIMSON),
    ]
    start_x = 92
    for idx, (label, sp, fidx, accent) in enumerate(thumbs):
        bx = start_x + idx * 372
        by = 344
        draw.rectangle([bx, by, bx + 344, by + 278], fill=C_CHARCOAL + (255,), outline=accent + (180,), width=2)
        draw.text((bx + 16, by + 12), label, font=f_mono_sm, fill=accent)
        paste_sprite_frame(img, sp, fidx, 8, (bx + 12, by + 44), 5)

    draw.text((92, 646), "3 Escalating Cases  ·  4 Persistent Endings  ·  Piskel MCP Pixel Art  ·  Procedural Web Audio", font=f_mono_md, fill=C_MIST)
    img.convert("RGB").save(out_png)


def create_kiro_outro_card(out_png: Path) -> None:
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_OBSIDIAN + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_scanlines_and_frame(img)

    f_mono_sm = load_font(17, mono=True, bold=True)
    f_mono_md = load_font(21, mono=True, bold=True)
    f_h1 = load_font(46, bold=True)
    f_card_t = load_font(20, bold=True)
    f_body = load_font(17, bold=False)

    paste_sprite_frame(img, SPRITES_DIR / "halcyon-logo.png", 1, 2, (74, 58), 3)
    draw.text((194, 62), "Built for Kiroween 2026 — Costume Contest", font=f_h1, fill=C_WHITE)
    draw.text((196, 122), "ZERO EXTERNAL FRAMEWORKS  ·  ~24 KB GZIPPED  ·  MIT OPEN SOURCE", font=f_mono_sm, fill=C_CYAN)

    cards = [
        ("KIRO WORKFLOW (.kiro/)", C_CYAN, [
            "• Spec-Driven Development (.kiro/specs/)",
            "• Product, Tech & UI Steering Docs",
            "• Agent Hook verifying tests & build",
            "• Strict TypeScript Discriminated FSM",
        ]),
        ("PISKEL MCP + GAMEDEV CRAFT", C_VIOLET, [
            "• 8 Cohesive 16-Color Pixel Sprite Sheets",
            "• Automated Raster QA (asset_report.py)",
            "• Bus-Routed Web Audio + Dread Layers",
            "• Calm Mode & 360px Mobile Accessibility",
        ]),
        ("VERIFIED & LIVE ON PAGES", C_EMERALD, [
            "• 35 Vitest + fast-check Property Tests",
            "• Automated Linux CI + GitHub Pages",
            "• 4 Persistent Shift Endings + Report Card",
            "• Zero Jump Scares · Zero Color-Only Clues",
        ]),
    ]
    for i, (title, accent, lines) in enumerate(cards):
        cx = 74 + i * 384
        cy = 188
        draw.rectangle([cx, cy, cx + 364, cy + 274], fill=C_CHARCOAL + (255,), outline=accent + (200,), width=2)
        draw.rectangle([cx, cy, cx + 364, cy + 6], fill=accent + (255,))
        draw.text((cx + 20, cy + 24), title, font=f_card_t, fill=C_WHITE)
        for j, line in enumerate(lines):
            draw.text((cx + 20, cy + 74 + j * 44), line, font=f_body, fill=C_SILVER)

    draw.rectangle([74, 496, WIDTH - 74, 650], fill=C_VOID + (255,), outline=C_CYAN + (220,), width=2)
    paste_sprite_frame(img, SPRITES_DIR / "analyst-badge.png", 3, 4, (98, 524), 3)
    paste_sprite_frame(img, SPRITES_DIR / "desk-phone.png", 4, 6, (WIDTH - 208, 524), 3)

    draw.text((224, 524), "PLAY LIVE:   https://pakorn269.github.io/night-shift-help-desk/", font=f_mono_md, fill=C_CYAN)
    draw.text((224, 566), "GITHUB REPO: https://github.com/pakorn269/night-shift-help-desk", font=f_mono_md, fill=C_WHITE)
    draw.text((224, 606), "License: MIT   |   Category: Costume Contest   |   Watch your clock at 03:00.", font=f_mono_sm, fill=C_AMBER)

    img.convert("RGB").save(out_png)


def make_still_clip(png_path: Path, duration: float, out_mp4: Path, fade_in: float = 0.35, fade_out: float = 0.35) -> None:
    vf = f"scale={WIDTH}:{HEIGHT},format=yuv420p"
    if fade_in > 0:
        vf += f",fade=t=in:st=0:d={fade_in:.2f}"
    if fade_out > 0 and duration > fade_out + 0.2:
        vf += f",fade=t=out:st={duration - fade_out:.2f}:d={fade_out:.2f}"
    run_cmd([
        "ffmpeg", "-y", "-loop", "1", "-i", str(png_path),
        "-t", f"{duration:.3f}", "-r", "30",
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        str(out_mp4),
    ])


# ---------------------------------------------------------------------------
# White-Screen Detector + Live Playwright Capture (Zero `about:blank` Flash!)
# ---------------------------------------------------------------------------
def detect_first_painted_timestamp(video_path: Path, fallback_sec: float) -> float:
    """Finds the exact timestamp where Playwright finishes painting real UI (not flat white or flat black)."""
    probe_dir = WORK_DIR / f"luma_{video_path.stem}"
    if probe_dir.exists():
        shutil.rmtree(probe_dir)
    probe_dir.mkdir(parents=True, exist_ok=True)

    # Sample at 10 fps for the first 10 seconds to locate the exact first non-blank painted UI frame
    run_cmd([
        "ffmpeg", "-y", "-i", str(video_path), "-t", "10",
        "-vf", "fps=10,scale=96:54",
        str(probe_dir / "f_%03d.png"),
    ])
    frames = sorted(probe_dir.glob("f_*.png"))
    for idx, fp in enumerate(frames):
        im = Image.open(fp).convert("L")
        pixels = list(im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata())
        mean = sum(pixels) / max(1, len(pixels))
        var = sum((p - mean) ** 2 for p in pixels) / max(1, len(pixels))
        stdev = math.sqrt(var)
        # Blank white or blank dark about:blank has stdev ~0; painted Halcyon Desk UI has stdev > 14 and dark backdrop (mean < 90)
        if stdev > 14.0 and mean < 110.0 and max(pixels) > 120:
            return max(0.0, idx * 0.1 + 0.1)
    return max(0.0, fallback_sec)


CURSOR_INJECT_JS = """
(() => {
  if (document.getElementById('demo-cursor')) return;
  const dot = document.createElement('div');
  dot.id = 'demo-cursor';
  Object.assign(dot.style, {
    position: 'fixed',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #38bdf8',
    background: 'rgba(56, 189, 248, 0.25)',
    boxShadow: '0 0 14px rgba(56, 189, 248, 0.85)',
    pointerEvents: 'none',
    zIndex: '999999',
    transform: 'translate(-50%, -50%)',
    transition: 'left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.14s ease',
    left: '640px',
    top: '360px',
  });
  document.body.appendChild(dot);

  const banner = document.createElement('div');
  banner.id = 'demo-chapter-pill';
  Object.assign(banner.style, {
    position: 'fixed',
    left: '16px',
    bottom: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    border: '1px solid rgba(56, 189, 248, 0.45)',
    background: 'rgba(6, 9, 14, 0.88)',
    color: '#9fb2cc',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    zIndex: '999998',
    pointerEvents: 'none',
    boxShadow: '0 6px 20px rgba(0,0,0,0.55)',
  });
  document.body.appendChild(banner);
})();
"""


def set_chapter(page, label: str) -> None:
    page.evaluate(
        """(txt) => {
          const el = document.getElementById('demo-chapter-pill');
          if (el) el.textContent = txt;
        }""",
        label,
    )


def glide_and_click(page, selector: str, pause_before: float = 0.35, pause_after: float = 0.45) -> None:
    loc = page.locator(selector).first
    loc.scroll_into_view_if_needed()
    box = loc.bounding_box()
    if box:
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2
        page.evaluate(
            """([x, y]) => {
              const d = document.getElementById('demo-cursor');
              if (d) { d.style.left = x + 'px'; d.style.top = y + 'px'; }
            }""",
            [cx, cy],
        )
        page.wait_for_timeout(int(pause_before * 1000))
        page.evaluate(
            """() => {
              const d = document.getElementById('demo-cursor');
              if (d) {
                d.style.transform = 'translate(-50%, -50%) scale(0.72)';
                d.style.borderColor = '#ef4444';
                setTimeout(() => {
                  d.style.transform = 'translate(-50%, -50%) scale(1)';
                  d.style.borderColor = '#38bdf8';
                }, 170);
              }
            }"""
        )
    loc.click()
    page.wait_for_timeout(int(pause_after * 1000))


def wait_remaining(start_ms: float, target_sec: float, page) -> None:
    elapsed = (page.evaluate("() => performance.now()") - start_ms) / 1000.0
    rem = target_sec - elapsed
    if rem > 0.05:
        page.wait_for_timeout(int(rem * 1000))


def record_desktop_gameplay(durations: Dict[str, float]) -> Tuple[Path, float]:
    """Records segments 02..09 in Playwright Chromium and returns (webm_path, measured_load_sec)."""
    vid_dir = WORK_DIR / "pw_desktop"
    if vid_dir.exists():
        shutil.rmtree(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            color_scheme="dark",
            record_video_dir=str(vid_dir),
            record_video_size={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
        )
        t_start = time.monotonic()
        page = context.new_page()
        page.goto(LIVE_URL, wait_until="networkidle")
        page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
        page.evaluate(CURSOR_INJECT_JS)
        set_chapter(page, SEGMENTS[1][2])
        page.wait_for_timeout(250)
        load_sec = time.monotonic() - t_start

        # Segment 02: Check-In
        t0 = page.evaluate("() => performance.now()")
        page.wait_for_timeout(900)
        glide_and_click(page, "#checkin-name-input", 0.35, 0.2)
        page.fill("#checkin-name-input", "")
        page.type("#checkin-name-input", "Pakorn", delay=85)
        page.wait_for_timeout(550)
        glide_and_click(page, "#checkin-submit-btn", 0.4, 0.55)
        wait_remaining(t0, durations["02_checkin"] + 0.35, page)

        # Segment 03: Case 1 Inspect Audit Trail
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[2][2])
        page.wait_for_timeout(750)
        glide_and_click(page, "#inspect-button", 0.45, 0.85)
        wait_remaining(t0, durations["03_case1_inspect"] + 0.35, page)

        # Segment 04: 6x CCTV Zoom Inspector
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[3][2])
        glide_and_click(page, "#cctv-zoom-button", 0.4, 2.0)
        wait_remaining(t0, durations["04_case1_cctv"] - 1.0, page)
        glide_and_click(page, "#cctv-modal-close", 0.35, 0.45)
        wait_remaining(t0, durations["04_case1_cctv"] + 0.35, page)

        # Segment 05: Case 1 Path A — Close as Resolved
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[4][2])
        glide_and_click(page, "#close-button", 0.45, 1.0)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        wait_remaining(t0, durations["05_case1_close"] + 0.35, page)

        # Segment 06: Replay Case 1 -> Call Requester -> Answer Ext. 419
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[5][2])
        glide_and_click(page, "#replay-case-button", 0.35, 0.55)
        glide_and_click(page, "#inspect-button", 0.35, 0.45)
        glide_and_click(page, "#call-button", 0.4, 1.1)
        glide_and_click(page, "#phone-answer-button", 0.5, 1.2)
        wait_remaining(t0, durations["06_case1_call"] + 0.4, page)

        # Segment 07: Case 2 — INC-0314 Stairwell
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[6][2])
        glide_and_click(page, "#next-case-button", 0.35, 0.65)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.4, 0.75)
        glide_and_click(page, "#cctv-zoom-button", 0.35, 2.2)
        glide_and_click(page, "#cctv-modal-close", 0.3, 0.4)
        glide_and_click(page, "#call-button", 0.4, 0.8)
        wait_remaining(t0, durations["07_case2"] + 0.35, page)

        # Segment 08: Case 3 — INC-0321 Shift Handover + Desk B-04 CCTV Zoom
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[7][2])
        glide_and_click(page, "#next-case-button", 0.35, 0.7)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.4, 0.9)
        glide_and_click(page, "#cctv-zoom-button", 0.4, 3.0)
        glide_and_click(page, "#cctv-modal-close", 0.3, 0.4)
        wait_remaining(t0, durations["08_case3"] + 0.35, page)

        # Segment 09: Pull Power -> Final Shift Dossier -> Copy Shift Report + Calm Mode
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[8][2])
        glide_and_click(page, "#call-button", 0.35, 0.85)
        glide_and_click(page, "#next-case-button", 0.35, 1.0)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        page.wait_for_timeout(1000)
        glide_and_click(page, "#copy-report-button", 0.45, 0.85)
        glide_and_click(page, "#motion-button", 0.45, 0.65)
        glide_and_click(page, "#motion-button", 0.4, 0.55)
        wait_remaining(t0, durations["09_dossier"] + 0.4, page)

        video_path = Path(page.video.path())
        context.close()
        browser.close()

    trim_s = detect_first_painted_timestamp(video_path, load_sec)
    print(f"  [pw] desktop captured: {video_path} (trimming {trim_s:.2f}s blank load frames)")
    return video_path, trim_s


def record_mobile_showcase(duration: float) -> Path:
    """Records 360x680 mobile showcase with blank load frames trimmed and composites into 1280x720."""
    vid_dir = WORK_DIR / "pw_mobile"
    if vid_dir.exists():
        shutil.rmtree(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 360, "height": 680},
            color_scheme="dark",
            record_video_dir=str(vid_dir),
            record_video_size={"width": 360, "height": 680},
            device_scale_factor=1,
        )
        t_start = time.monotonic()
        page = context.new_page()
        page.goto(LIVE_URL, wait_until="networkidle")
        page.fill("#checkin-name-input", "Pakorn")
        page.click("#checkin-submit-btn")
        page.wait_for_timeout(300)
        load_sec = time.monotonic() - t_start

        page.wait_for_timeout(1100)
        page.click("#inspect-button")
        page.wait_for_timeout(1800)
        for y in (120, 260, 420, 560, 0):
            page.evaluate(f"window.scrollTo({{ top: {y}, behavior: 'smooth' }})")
            page.wait_for_timeout(int(max(600, (duration * 1000 - 2900) / 5)))
        raw_path = Path(page.video.path())
        context.close()
        browser.close()

    trim_s = detect_first_painted_timestamp(raw_path, load_sec)

    bg_png = WORK_DIR / "mobile_bg.png"
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_OBSIDIAN + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_scanlines_and_frame(img)

    f_mono_sm = load_font(18, mono=True, bold=True)
    f_h1 = load_font(44, bold=True)
    draw.text((84, 96), "MOBILE-FIRST & ACCESSIBLE", font=f_mono_sm, fill=C_CYAN)
    draw.text((84, 134), "Zero Clipping at 360px", font=f_h1, fill=C_WHITE)

    bullets = [
        ("Active Ticket & 03:07 Audit Trail First", "CSS layout prioritizes critical clues above the fold on narrow screens."),
        ("Colorblind-Safe Pixel Silhouettes", "Every status pairs crisp 24×24 Piskel icons with explicit uppercase badges."),
        ("Procedural Web Audio Bus Mixer", "Master <- {Ambience, SFX, UI} with adaptive dread drone & squared gain."),
        ("Calm Mode & Full Keyboard Play", "Instant reduced-motion toggle, focus tracking, and single-key shortcuts."),
    ]
    for idx, (head, desc) in enumerate(bullets):
        by = 226 + idx * 104
        draw.rectangle([84, by, 760, by + 84], fill=C_CHARCOAL + (255,), outline=C_SLATE + (255,), width=1)
        draw.rectangle([84, by, 90, by + 84], fill=C_CYAN + (255,))
        draw.text((108, by + 12), head, font=f_mono_sm, fill=C_WHITE)
        draw.text((108, by + 42), desc, font=load_font(16), fill=C_SILVER)

    draw.rounded_rectangle([830, 12, 1206, 708], radius=22, fill=C_VOID + (255,), outline=C_CYAN + (200,), width=3)
    img.convert("RGB").save(bg_png)

    out_mp4 = WORK_DIR / "scene_mobile.mp4"
    run_cmd([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(bg_png),
        "-ss", f"{trim_s:.3f}", "-i", str(raw_path),
        "-filter_complex", "[1:v]scale=360:680[mob];[0:v][mob]overlay=838:20:shortest=1,format=yuv420p[v]",
        "-map", "[v]", "-t", f"{duration + 0.35:.3f}", "-r", "30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        str(out_mp4),
    ])
    print(f"  [pw] mobile showcase composed: {out_mp4} ({probe_duration(out_mp4):.2f}s, trimmed {trim_s:.2f}s)")
    return out_mp4


# ---------------------------------------------------------------------------
# Audio Bed + Chunked Subtitles (SRT + Burned-in Phosphor-Noir ASS)
# ---------------------------------------------------------------------------
def generate_ambient_bed(total_sec: float, phone_ring_at: float, out_wav: Path) -> None:
    sr = 48000
    n = int(total_sec * sr)
    frames = bytearray()
    for i in range(n):
        t = i / sr
        env = min(1.0, t / 1.5) * min(1.0, max(0.0, (total_sec - t) / 1.8))
        dread = min(1.0, t / max(1.0, total_sec * 0.7))
        hum = 0.032 * math.sin(2 * math.pi * 60.0 * t) + 0.008 * math.sin(2 * math.pi * 120.3 * t)
        drone = dread * 0.042 * (
            0.6 * math.sin(2 * math.pi * 46.25 * t)
            + 0.4 * math.sin(2 * math.pi * 47.05 * t)
        )
        ring = 0.0
        dt = t - phone_ring_at
        if (0.0 <= dt <= 0.38) or (0.48 <= dt <= 0.86):
            mod = 0.5 + 0.5 * math.sin(2 * math.pi * 20.0 * dt)
            ring = 0.085 * mod * (math.sin(2 * math.pi * 440.0 * dt) + math.sin(2 * math.pi * 480.0 * dt)) * 0.5

        sample = max(-0.95, min(0.95, (hum + drone + ring) * env))
        val = int(sample * 32767)
        frames += struct.pack("<hh", val, val)

    with wave.open(str(out_wav), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(frames)


def fmt_srt(sec: float) -> str:
    ms = max(0, int(round(sec * 1000)))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def fmt_ass(sec: float) -> str:
    cs = max(0, int(round(sec * 100)))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def split_into_cues(text: str, max_chars: int = 58) -> List[str]:
    words = text.strip().split()
    chunks: List[str] = []
    buf: List[str] = []
    for w in words:
        candidate = " ".join(buf + [w])
        if buf and len(candidate) > max_chars:
            chunks.append(" ".join(buf))
            buf = [w]
        else:
            buf.append(w)
            if len(" ".join(buf)) >= 30 and w[-1] in ".?!—":
                chunks.append(" ".join(buf))
                buf = []
    if buf:
        if chunks and len(" ".join(buf)) < 18 and len(chunks[-1]) + 1 + len(" ".join(buf)) <= max_chars + 10:
            chunks[-1] = chunks[-1] + " " + " ".join(buf)
        else:
            chunks.append(" ".join(buf))
    return chunks


def build_voice_and_subtitles(
    narration: Dict[str, Tuple[Path, float]],
    offsets: List[Tuple[str, float, str]],
    total_sec: float,
    out_wav: Path,
    out_ass: Path,
) -> None:
    inputs = ["-f", "lavfi", "-t", f"{total_sec:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    filters = []
    mix_labels = ["[0:a]"]
    refined_cues: List[Tuple[float, float, str]] = []

    for idx, (seg_id, start_s, text) in enumerate(offsets, start=1):
        wav_path, dur = narration[seg_id]
        inputs += ["-i", str(wav_path)]
        delay_ms = int(round(start_s * 1000))
        filters.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume=1.18[a{idx}]")
        mix_labels.append(f"[a{idx}]")

        parts = split_into_cues(text, max_chars=58)
        total_chars = sum(max(1, len(p)) for p in parts)
        cursor = start_s
        for p_idx, part in enumerate(parts):
            p_dur = max(0.3, dur) * (max(1, len(part)) / total_chars)
            c_end = start_s + dur if p_idx == len(parts) - 1 else cursor + p_dur
            refined_cues.append((cursor, c_end, part))
            cursor = c_end

    srt_lines = []
    for i, (st, en, txt) in enumerate(refined_cues, start=1):
        srt_lines.extend([str(i), f"{fmt_srt(st)} --> {fmt_srt(en)}", txt, ""])
    OUT_SRT.write_text("\n".join(srt_lines), encoding="utf-8")

    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Phosphor,Segoe UI,24,&H00F8ECE2,&H00F8D038,&H400E0906,&HB80E0906,-1,0,0,0,100,100,0.4,0,3,8,0,2,80,80,46,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = [f"Dialogue: 0,{fmt_ass(st)},{fmt_ass(en)},Phosphor,,0,0,0,,{txt}" for st, en, txt in refined_cues]
    out_ass.write_text(ass_header + "\n".join(events) + "\n", encoding="utf-8")

    filter_complex = ";".join(filters) + ";" + "".join(mix_labels) + f"amix=inputs={len(mix_labels)}:normalize=0:duration=first[vout]"
    run_cmd([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-ar", "48000", "-ac", "2",
        str(out_wav),
    ])


def main() -> None:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    print("Step 1/5: Generating studio voiceover narration...")
    narration = generate_narration()
    durations = {k: v[1] for k, v in narration.items()}

    print("Step 2/5: Generating Phosphor-Noir title, thumbnail & Kiro architecture cards...")
    intro_png = WORK_DIR / "intro_card.png"
    outro_png = WORK_DIR / "outro_card.png"
    create_title_card(intro_png)
    create_kiro_outro_card(outro_png)
    shutil.copy2(intro_png, OUT_THUMB)

    intro_dur = durations["01_intro"] + 0.65
    outro_dur = durations["11_kiro_outro"] + 1.0
    intro_mp4 = WORK_DIR / "scene_intro.mp4"
    outro_mp4 = WORK_DIR / "scene_outro.mp4"
    make_still_clip(intro_png, intro_dur, intro_mp4, fade_in=0.35, fade_out=0.35)
    make_still_clip(outro_png, outro_dur, outro_mp4, fade_in=0.35, fade_out=0.55)

    print("Step 3/5: Recording live Playwright gameplay from GitHub Pages (zero white flash)...")
    desktop_webm, desktop_trim = record_desktop_gameplay(durations)
    desktop_mp4 = WORK_DIR / "scene_desktop.mp4"
    run_cmd([
        "ffmpeg", "-y", "-ss", f"{desktop_trim:.3f}", "-i", str(desktop_webm),
        "-r", "30", "-vf", f"scale={WIDTH}:{HEIGHT}:flags=neighbor,format=yuv420p,fade=t=in:st=0:d=0.25",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        str(desktop_mp4),
    ])
    desktop_dur = probe_duration(desktop_mp4)

    mobile_mp4 = record_mobile_showcase(durations["10_mobile"])
    mobile_dur = probe_duration(mobile_mp4)

    print("Step 4/5: Concatenating scenes & synchronizing voice, ambience, and 43 subtitles...")
    concat_list = WORK_DIR / "concat.txt"
    concat_list.write_text(
        "\n".join([
            f"file '{intro_mp4.as_posix()}'",
            f"file '{desktop_mp4.as_posix()}'",
            f"file '{mobile_mp4.as_posix()}'",
            f"file '{outro_mp4.as_posix()}'",
        ]),
        encoding="utf-8",
    )
    video_only = WORK_DIR / "video_only.mp4"
    run_cmd(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(video_only)])
    total_dur = probe_duration(video_only)

    seg_text_map = {s[0]: s[1] for s in SEGMENTS}
    offsets: List[Tuple[str, float, str]] = [("01_intro", 0.3, seg_text_map["01_intro"])]

    desk_ids = ["02_checkin", "03_case1_inspect", "04_case1_cctv", "05_case1_close", "06_case1_call", "07_case2", "08_case3", "09_dossier"]
    raw_desk_sum = sum(durations[sid] + 0.36 for sid in desk_ids)
    scale = desktop_dur / max(0.1, raw_desk_sum)
    cur = intro_dur + 0.15
    phone_ring_time = intro_dur + 40.0
    for sid in desk_ids:
        offsets.append((sid, cur, seg_text_map[sid]))
        if sid == "06_case1_call":
            phone_ring_time = cur + 2.2
        cur += (durations[sid] + 0.36) * scale

    offsets.append(("10_mobile", intro_dur + desktop_dur + 0.2, seg_text_map["10_mobile"]))
    offsets.append(("11_kiro_outro", intro_dur + desktop_dur + mobile_dur + 0.25, seg_text_map["11_kiro_outro"]))

    voice_wav = WORK_DIR / "voice_full.wav"
    amb_wav = WORK_DIR / "ambient_bed.wav"
    ass_path = WORK_DIR / "subtitles.ass"
    build_voice_and_subtitles(narration, offsets, total_dur, voice_wav, ass_path)
    generate_ambient_bed(total_dur, phone_ring_time, amb_wav)

    print("Step 5/5: Mastering final subtitled YouTube 720p H.264 + AAC stereo MP4...")
    ass_escaped = ass_path.as_posix().replace(":", r"\:")
    run_cmd([
        "ffmpeg", "-y",
        "-i", str(video_only),
        "-i", str(amb_wav),
        "-i", str(voice_wav),
        "-filter_complex",
        f"[0:v]ass='{ass_escaped}'[vout];"
        "[2:a]asplit=2[vkey][vmix];"
        "[1:a][vkey]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=320[ambduck];"
        "[ambduck][vmix]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.92[aout]",
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-shortest",
        str(OUT_MP4),
    ])

    final_dur = probe_duration(OUT_MP4)
    size_mb = OUT_MP4.stat().st_size / (1024 * 1024)
    print(f"\nDONE! Produced YouTube-ready demo video:")
    print(f"  Video:     {OUT_MP4} ({final_dur:.1f}s / {size_mb:.2f} MB)")
    print(f"  Captions:  {OUT_SRT}")
    print(f"  Thumbnail: {OUT_THUMB}")


if __name__ == "__main__":
    main()
