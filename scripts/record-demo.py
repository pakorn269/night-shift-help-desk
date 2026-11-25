"""
Night Shift Help Desk — Automated YouTube Demo Video Producer (< 3 min, 1280x720 H.264 MP4)

Produces a studio-paced, frame-synced Kiroween 2026 Costume Contest demo video:
1. Synthesizes calm midnight narration segments with edge-tts (with Windows SAPI fallback).
2. Generates Phosphor-Noir Opening Title Card, Kiro+Piskel Architecture Slide, and Closing CTA Card via Pillow.
3. Records live Playwright Chromium gameplay directly on https://pakorn269.github.io/night-shift-help-desk/
   (desktop 1280x720 + live 360px mobile frame-in-frame showcase) with a visible glowing pointer indicator.
4. Synthesizes subtle procedural midnight room-tone + VoIP ring SFX ducked cleanly under the voiceover.
5. Assembles a crisp YouTube-ready 1280x720 30fps H.264 + AAC stereo MP4 and matching .srt captions via ffmpeg.
"""
from __future__ import annotations

import asyncio
import math
import os
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DEMO_DIR = ROOT / "demo"
WORK_DIR = DEMO_DIR / "_build"
SPRITES_DIR = ROOT / "public" / "sprites"
LIVE_URL = "https://pakorn269.github.io/night-shift-help-desk/"

OUT_MP4 = DEMO_DIR / "night-shift-help-desk-kiroween-demo.mp4"
OUT_SRT = DEMO_DIR / "night-shift-help-desk-kiroween-demo.srt"

WIDTH = 1280
HEIGHT = 720
VOICE = "en-US-AndrewNeural"

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
        "Welcome to Night Shift Help Desk, our Kiroween Costume Contest entry. "
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


def run_cmd(args: List[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def probe_duration(path: Path) -> float:
    res = run_cmd([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ])
    return float(res.stdout.strip())


async def synth_edge_tts(text: str, out_mp3: Path) -> None:
    import edge_tts
    communicate = edge_tts.Communicate(text, voice=VOICE, rate="-3%", pitch="-2Hz")
    await communicate.save(str(out_mp3))


def synth_sapi_fallback(text: str, out_wav: Path) -> None:
    safe_text = text.replace("'", "''")
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.Rate = 0; "
        f"$s.SetOutputToWaveFile('{out_wav}'); "
        f"$s.Speak('{safe_text}'); "
        "$s.Dispose();"
    )
    run_cmd(["powershell", "-NoProfile", "-Command", ps])


def generate_narration() -> dict[str, Tuple[Path, float]]:
    """Generates WAV narration for every segment and returns {id: (wav_path, duration_sec)}."""
    audio_dir = WORK_DIR / "narration"
    audio_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, Tuple[Path, float]] = {}

    for seg_id, text, _ in SEGMENTS:
        mp3_path = audio_dir / f"{seg_id}.mp3"
        wav_path = audio_dir / f"{seg_id}.wav"
        try:
            asyncio.run(synth_edge_tts(text, mp3_path))
            run_cmd([
                "ffmpeg", "-y", "-i", str(mp3_path),
                "-ar", "48000", "-ac", "2", str(wav_path)
            ])
        except Exception as exc:
            print(f"  [tts] edge_tts failed for {seg_id} ({exc}), using Windows SAPI fallback")
            raw_wav = audio_dir / f"{seg_id}_sapi.wav"
            synth_sapi_fallback(text, raw_wav)
            run_cmd([
                "ffmpeg", "-y", "-i", str(raw_wav),
                "-ar", "48000", "-ac", "2", str(wav_path)
            ])
        dur = probe_duration(wav_path)
        results[seg_id] = (wav_path, dur)
        print(f"  [tts] {seg_id}: {dur:.2f}s")
    return results


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
    # Solid subtle midnight scanlines (never un-composited translucent white!)
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

    # Subtle cyan/crimson ambient glow panels
    draw.rectangle([60, 60, WIDTH - 60, 126], fill=C_CHARCOAL + (235,), outline=C_SLATE + (255,), width=2)
    f_mono_sm = load_font(18, mono=True, bold=True)
    f_mono_md = load_font(19, mono=True, bold=True)
    f_title = load_font(66, bold=True)
    f_sub = load_font(26, bold=False)

    draw.text((92, 82), "KIROWEEN 2026  //  COSTUME CONTEST ENTRY", font=f_mono_sm, fill=C_CYAN)
    draw.text((WIDTH - 320, 82), "CLOCK: 03:00  |  NTP: DRIFT", font=f_mono_sm, fill=C_AMBER)

    # Halcyon Logo crisp 4x (128x128)
    paste_sprite_frame(img, SPRITES_DIR / "halcyon-logo.png", 0, 2, (92, 168), 4)

    draw.text((252, 174), "Night Shift Help Desk", font=f_title, fill=C_WHITE)
    draw.text((256, 254), "HALCYON DESK // ITSM v4.2 — The workplace software is the haunted object.", font=f_sub, fill=C_SILVER)

    # Three crisp Piskel CCTV filmstrip thumbnails side-by-side
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

    # Bottom live URLs banner
    draw.rectangle([74, 496, WIDTH - 74, 650], fill=C_VOID + (255,), outline=C_CYAN + (220,), width=2)
    paste_sprite_frame(img, SPRITES_DIR / "analyst-badge.png", 3, 4, (98, 524), 3)
    paste_sprite_frame(img, SPRITES_DIR / "desk-phone.png", 4, 6, (WIDTH - 208, 524), 3)

    draw.text((224, 524), "PLAY LIVE:   https://pakorn269.github.io/night-shift-help-desk/", font=f_mono_md, fill=C_CYAN)
    draw.text((224, 566), "GITHUB REPO: https://github.com/pakorn269/night-shift-help-desk", font=f_mono_md, fill=C_WHITE)
    draw.text((224, 606), "License: MIT   |   Category: Costume Contest   |   Watch your clock at 03:00.", font=f_mono_sm, fill=C_AMBER)

    img.convert("RGB").save(out_png)


def make_still_clip(png_path: Path, duration: float, out_mp4: Path, fade_in: float = 0.4, fade_out: float = 0.4) -> None:
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
        str(out_mp4)
    ])


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
    bottom: '14px',
    padding: '5px 11px',
    borderRadius: '4px',
    border: '1px solid rgba(56, 189, 248, 0.45)',
    background: 'rgba(6, 9, 14, 0.88)',
    color: '#9fb2cc',
    fontFamily: '"JetBrains Mono", Consolas, monospace',
    fontSize: '12px',
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


def record_desktop_gameplay(durations: dict[str, float]) -> Path:
    """Records segments 02 through 09 continuously in live Playwright Chromium at 1280x720."""
    vid_dir = WORK_DIR / "pw_desktop"
    if vid_dir.exists():
        shutil.rmtree(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            record_video_dir=str(vid_dir),
            record_video_size={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
        )
        page = context.new_page()
        page.goto(LIVE_URL, wait_until="networkidle")
        page.evaluate(CURSOR_INJECT_JS)

        # Segment 02: Check-In
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[1][2])
        page.wait_for_timeout(1200)
        glide_and_click(page, "#checkin-name-input", 0.4, 0.25)
        page.fill("#checkin-name-input", "")
        page.type("#checkin-name-input", "Pakorn", delay=95)
        page.wait_for_timeout(700)
        glide_and_click(page, "#checkin-submit-btn", 0.45, 0.6)
        wait_remaining(t0, durations["02_checkin"] + 0.4, page)

        # Segment 03: Case 1 Inspect Audit Trail
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[2][2])
        page.wait_for_timeout(900)
        glide_and_click(page, "#inspect-button", 0.5, 0.9)
        wait_remaining(t0, durations["03_case1_inspect"] + 0.4, page)

        # Segment 04: 6x CCTV Zoom Inspector
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[3][2])
        glide_and_click(page, "#cctv-zoom-button", 0.45, 2.2)
        wait_remaining(t0, durations["04_case1_cctv"] - 1.1, page)
        glide_and_click(page, "#cctv-modal-close", 0.35, 0.5)
        wait_remaining(t0, durations["04_case1_cctv"] + 0.4, page)

        # Segment 05: Case 1 Path A — Close as Resolved (03:07 jump + frozen coffee)
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[4][2])
        glide_and_click(page, "#close-button", 0.5, 1.2)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        wait_remaining(t0, durations["05_case1_close"] + 0.4, page)

        # Segment 06: Replay Case 1 -> Call Requester -> Answer Ext. 419 Transcript
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[5][2])
        glide_and_click(page, "#replay-case-button", 0.4, 0.6)
        glide_and_click(page, "#inspect-button", 0.35, 0.5)
        glide_and_click(page, "#call-button", 0.45, 1.2)
        glide_and_click(page, "#phone-answer-button", 0.55, 1.4)
        wait_remaining(t0, durations["06_case1_call"] + 0.5, page)

        # Segment 07: Case 2 — INC-0314 Stairwell Badge Swipe + 6x Zoom + Revoke
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[6][2])
        glide_and_click(page, "#next-case-button", 0.4, 0.7)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.45, 0.8)
        glide_and_click(page, "#cctv-zoom-button", 0.4, 2.4)
        glide_and_click(page, "#cctv-modal-close", 0.35, 0.45)
        glide_and_click(page, "#call-button", 0.45, 0.9)
        wait_remaining(t0, durations["07_case2"] + 0.4, page)

        # Segment 08: Case 3 — INC-0321 Shift Handover + Pre-dated 02:55 + Desk B-04 CCTV Zoom
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[7][2])
        glide_and_click(page, "#next-case-button", 0.4, 0.8)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.45, 1.0)
        glide_and_click(page, "#cctv-zoom-button", 0.45, 3.2)
        glide_and_click(page, "#cctv-modal-close", 0.35, 0.45)
        wait_remaining(t0, durations["08_case3"] + 0.4, page)

        # Segment 09: Pull Power -> Final Shift Dossier -> Copy Shift Report + Calm Mode toggle
        t0 = page.evaluate("() => performance.now()")
        set_chapter(page, SEGMENTS[8][2])
        glide_and_click(page, "#call-button", 0.4, 0.9)
        glide_and_click(page, "#next-case-button", 0.4, 1.1)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        page.wait_for_timeout(1200)
        glide_and_click(page, "#copy-report-button", 0.5, 0.9)
        glide_and_click(page, "#motion-button", 0.5, 0.7)
        glide_and_click(page, "#motion-button", 0.45, 0.6)
        wait_remaining(t0, durations["09_dossier"] + 0.5, page)

        video_path = Path(page.video.path())
        context.close()
        browser.close()

    print(f"  [pw] desktop gameplay recorded: {video_path} ({probe_duration(video_path):.2f}s)")
    return video_path


def record_mobile_showcase(duration: float) -> Path:
    """Records a crisp 360x680 mobile capture and composites it inside a 1280x720 Phosphor-Noir showcase frame."""
    vid_dir = WORK_DIR / "pw_mobile"
    if vid_dir.exists():
        shutil.rmtree(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 360, "height": 680},
            record_video_dir=str(vid_dir),
            record_video_size={"width": 360, "height": 680},
            device_scale_factor=1,
        )
        page = context.new_page()
        page.goto(LIVE_URL, wait_until="networkidle")
        page.fill("#checkin-name-input", "Pakorn")
        page.click("#checkin-submit-btn")
        page.wait_for_timeout(1200)
        page.click("#inspect-button")
        page.wait_for_timeout(2000)
        # Gentle scroll to display 03:07 audit row, decision controls, and CCTV feed cleanly
        for y in (120, 260, 420, 560, 0):
            page.evaluate(f"window.scrollTo({{ top: {y}, behavior: 'smooth' }})")
            page.wait_for_timeout(int(max(650, (duration * 1000 - 3200) / 5)))
        raw_path = Path(page.video.path())
        context.close()
        browser.close()

    # Build a Phosphor-Noir 1280x720 backdrop with mobile callout specs on the left and phone bezel on the right
    bg_png = WORK_DIR / "mobile_bg.png"
    img = Image.new("RGBA", (WIDTH, HEIGHT), C_OBSIDIAN + (255,))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_scanlines_and_frame(img)

    f_mono_sm = load_font(18, mono=True, bold=True)
    f_h1 = load_font(44, bold=True)
    f_body = load_font(22, bold=False)

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

    # Phone bezel frame on right (x=834..1202, y=14..706)
    draw.rounded_rectangle([830, 12, 1206, 708], radius=22, fill=C_VOID + (255,), outline=C_CYAN + (200,), width=3)
    img.convert("RGB").save(bg_png)

    out_mp4 = WORK_DIR / "scene_mobile.mp4"
    run_cmd([
        "ffmpeg", "-y",
        "-loop", "1", "-i", str(bg_png),
        "-i", str(raw_path),
        "-filter_complex", "[1:v]scale=360:680[mob];[0:v][mob]overlay=838:20:shortest=1,format=yuv420p[v]",
        "-map", "[v]", "-t", f"{duration + 0.4:.3f}", "-r", "30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        str(out_mp4)
    ])
    print(f"  [pw] mobile showcase composed: {out_mp4} ({probe_duration(out_mp4):.2f}s)")
    return out_mp4


def generate_ambient_bed(total_sec: float, phone_ring_at: float, out_wav: Path) -> None:
    """Synthesizes a soft midnight fluorescent hum + eerie sub-drone + authentic VoIP ring at the exact Call cue."""
    sr = 48000
    n = int(total_sec * sr)
    frames = bytearray()
    for i in range(n):
        t = i / sr
        # Gentle fade-in / fade-out envelope
        env = min(1.0, t / 1.5) * min(1.0, max(0.0, (total_sec - t) / 1.8))
        # Subtle 60 Hz ballast hum + soft 46.5 / 47.2 Hz nocturnal dread swell
        dread = min(1.0, t / max(1.0, total_sec * 0.7))
        hum = 0.032 * math.sin(2 * math.pi * 60.0 * t) + 0.008 * math.sin(2 * math.pi * 120.3 * t)
        drone = dread * 0.042 * (
            0.6 * math.sin(2 * math.pi * 46.25 * t)
            + 0.4 * math.sin(2 * math.pi * 47.05 * t)
        )
        # Authentic muffled corporate VoIP double-ring right when Case 1 Call triggers!
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


def format_srt_ts(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build_voice_track_and_srt(
    narration: dict[str, Tuple[Path, float]],
    offsets: List[Tuple[str, float, str]],
    total_sec: float,
    out_wav: Path,
) -> None:
    """Places every narration clip at its exact timestamp offset and exports matching YouTube .srt captions."""
    inputs = ["-f", "lavfi", "-t", f"{total_sec:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    filters = []
    mix_labels = ["[0:a]"]
    srt_lines = []

    for idx, (seg_id, start_s, text) in enumerate(offsets, start=1):
        wav_path, dur = narration[seg_id]
        inputs += ["-i", str(wav_path)]
        delay_ms = int(round(start_s * 1000))
        filters.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume=1.15[a{idx}]")
        mix_labels.append(f"[a{idx}]")

        srt_lines.append(f"{idx}")
        srt_lines.append(f"{format_srt_ts(start_s)} --> {format_srt_ts(start_s + dur)}")
        srt_lines.append(text)
        srt_lines.append("")

    OUT_SRT.write_text("\n".join(srt_lines), encoding="utf-8")

    filter_complex = ";".join(filters) + ";" + "".join(mix_labels) + f"amix=inputs={len(mix_labels)}:normalize=0:duration=first[vout]"
    run_cmd([
        "ffmpeg", "-y", *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-ar", "48000", "-ac", "2",
        str(out_wav)
    ])


def main() -> None:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    print("Step 1/5: Generating studio voiceover narration...")
    narration = generate_narration()
    durations = {k: v[1] for k, v in narration.items()}

    print("Step 2/5: Generating Phosphor-Noir title & Kiro architecture cards...")
    intro_png = WORK_DIR / "intro_card.png"
    outro_png = WORK_DIR / "outro_card.png"
    create_title_card(intro_png)
    create_kiro_outro_card(outro_png)

    intro_dur = durations["01_intro"] + 0.8
    outro_dur = durations["11_kiro_outro"] + 1.2
    intro_mp4 = WORK_DIR / "scene_intro.mp4"
    outro_mp4 = WORK_DIR / "scene_outro.mp4"
    make_still_clip(intro_png, intro_dur, intro_mp4, fade_in=0.35, fade_out=0.35)
    make_still_clip(outro_png, outro_dur, outro_mp4, fade_in=0.35, fade_out=0.6)

    print("Step 3/5: Recording live Playwright gameplay from GitHub Pages...")
    desktop_webm = record_desktop_gameplay(durations)
    desktop_mp4 = WORK_DIR / "scene_desktop.mp4"
    run_cmd([
        "ffmpeg", "-y", "-i", str(desktop_webm),
        "-r", "30", "-vf", f"scale={WIDTH}:{HEIGHT}:flags=neighbor,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        str(desktop_mp4)
    ])
    desktop_dur = probe_duration(desktop_mp4)

    mobile_mp4 = record_mobile_showcase(durations["10_mobile"])
    mobile_dur = probe_duration(mobile_mp4)

    print("Step 4/5: Concatenating scenes & synchronizing narration + ambient audio...")
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
    run_cmd([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list),
        "-c", "copy", str(video_only)
    ])
    total_dur = probe_duration(video_only)

    # Calculate exact timeline offsets for every spoken segment
    offsets: List[Tuple[str, float, str]] = []
    offsets.append(("01_intro", 0.35, SEGMENTS[0][1]))

    # Desktop gameplay segments 02..09 span [intro_dur .. intro_dur + desktop_dur]
    desk_ids = ["02_checkin", "03_case1_inspect", "04_case1_cctv", "05_case1_close", "06_case1_call", "07_case2", "08_case3", "09_dossier"]
    raw_desk_sum = sum(durations[sid] + 0.42 for sid in desk_ids)
    scale = desktop_dur / max(0.1, raw_desk_sum)
    cur = intro_dur + 0.15
    phone_ring_time = intro_dur + 40.0
    seg_text_map = {s[0]: s[1] for s in SEGMENTS}
    for sid in desk_ids:
        offsets.append((sid, cur, seg_text_map[sid]))
        if sid == "06_case1_call":
            phone_ring_time = cur + 2.4
        cur += (durations[sid] + 0.42) * scale

    offsets.append(("10_mobile", intro_dur + desktop_dur + 0.2, seg_text_map["10_mobile"]))
    offsets.append(("11_kiro_outro", intro_dur + desktop_dur + mobile_dur + 0.25, seg_text_map["11_kiro_outro"]))

    voice_wav = WORK_DIR / "voice_full.wav"
    amb_wav = WORK_DIR / "ambient_bed.wav"
    build_voice_track_and_srt(narration, offsets, total_dur, voice_wav)
    generate_ambient_bed(total_dur, phone_ring_time, amb_wav)

    print("Step 5/5: Mastering final YouTube 720p H.264 + AAC stereo MP4 (with sidechain ducking)...")
    run_cmd([
        "ffmpeg", "-y",
        "-i", str(video_only),
        "-i", str(amb_wav),
        "-i", str(voice_wav),
        "-filter_complex",
        "[2:a]asplit=2[vkey][vmix];"
        "[1:a][vkey]sidechaincompress=threshold=0.03:ratio=5:attack=15:release=320[ambduck];"
        "[ambduck][vmix]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.92[aout]",
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-shortest",
        str(OUT_MP4)
    ])

    final_dur = probe_duration(OUT_MP4)
    size_mb = OUT_MP4.stat().st_size / (1024 * 1024)
    print(f"\nDONE! Produced YouTube-ready demo video:")
    print(f"  Video:    {OUT_MP4} ({final_dur:.1f}s / {size_mb:.2f} MB)")
    print(f"  Captions: {OUT_SRT}")


if __name__ == "__main__":
    main()
