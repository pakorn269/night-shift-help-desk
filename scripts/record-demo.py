"""
Night Shift Help Desk — Automated YouTube Demo Video Producer (< 3 min, 1280x720 H.264 MP4)

Guarantees 0.00s subtitle-to-voice sync and exact video-to-audio alignment:
  1. Synthesizes every subtitle cue individually with Google Cloud TTS (Chirp 3: HD),
     ElevenLabs, or Edge/SAPI fallback, trimming leading/trailing silence so each cue's
     exact audio duration drives its exact subtitle start/end timestamp (zero estimation drift!).
  2. Records live Playwright Chromium captures directly on https://pakorn269.github.io/night-shift-help-desk/
     using pixel-variance UI paint detection (`detect_first_painted_timestamp`) so zero blank
     white/black load frames ever appear, and logs exact in-recording scene timestamps.
  3. Concatenates all scenes through ffmpeg's `concat` filtergraph (never `-c copy` across
     mismatched timebases!) so PTS timestamps stay 100% monotonic and never truncate the outro.
  4. Asserts strict sync invariants (no overlapping cues, last cue finishes cleanly before video EOF).
"""
from __future__ import annotations

import asyncio
import base64
import math
import os
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

DEFAULT_ELEVENLABS_VOICE = "nPczCjzI2devNBz1zQrb"  # Brian
DEFAULT_GOOGLE_VOICE = "en-US-Chirp3-HD-Charon"    # Chirp 3 HD nocturnal storyteller
DEFAULT_EDGE_VOICE = "en-US-AndrewMultilingualNeural"

# Phosphor-Noir palette matching docs/art-direction-brief.md
C_VOID = (6, 9, 14)
C_OBSIDIAN = (12, 17, 26)
C_CHARCOAL = (21, 29, 43)
C_SLATE = (35, 47, 66)
C_MIST = (104, 125, 156)
C_SILVER = (159, 178, 204)
C_WHITE = (226, 236, 248)
C_CYAN = (56, 189, 248)
C_EMERALD = (16, 185, 129)
C_AMBER = (245, 158, 11)
C_CRIMSON = (239, 68, 68)
C_VIOLET = (139, 92, 246)

# Each segment contains crisp, natural 1-sentence cues — each cue is synthesized and timed individually!
# Format: (segment_id, chapter_label, [cue_texts...])
SEGMENTS: List[Tuple[str, str, List[str]]] = [
    (
        "01_intro",
        "KIROWEEN 2026 · COSTUME CONTEST",
        [
            "Welcome to Night Shift Help Desk—our Kiroween Costume Contest entry.",
            "Here, ordinary workplace software itself is the haunted object.",
        ],
    ),
    (
        "02_checkin",
        "01 // NIGHT SHIFT CHECK-IN (03:00)",
        [
            "You clock in alone at 3:00 AM on Halcyon Desk version 4.2.",
            "Personalizing your analyst badge writes your name into every audit log.",
        ],
    ),
    (
        "03_case1_inspect",
        "02 // IMPOSSIBLE 03:07 AUDIT TRAIL",
        [
            "Incident 0300 reports an empty workstation powering on by itself at 3:00 AM.",
            "Inspecting the audit trail reveals an impossible 3:07 closure—already signed by you.",
        ],
    ),
    (
        "04_case1_cctv",
        "03 // PISKEL MCP 6× CCTV INSPECTOR",
        [
            "Every live camera feed is custom animated pixel art authored via Piskel MCP.",
            "Zooming into Camera B3-204 reveals the screen booting on its own, with a faint silhouette in the glass.",
        ],
    ),
    (
        "05_case1_close",
        "04 // PATH A: COMPLY — CLOCK JUMP 03:07",
        [
            "If you trust the log and close the ticket, the clock snaps forward to 3:07.",
            "A duplicate closure appears under your name, and your coffee mug freezes cold.",
        ],
    ),
    (
        "06_case1_call",
        "05 // PATH B: DEFY — VOIP LOOPBACK EXT. 419",
        [
            "Replaying to challenge the log deletes the 3:07 row, adds a phantom ticket, and rings your desk phone.",
            "Answering Extension 419 uncovers a chilling loopback transcript from yourself.",
        ],
    ),
    (
        "07_case2",
        "06 // CASE 2: INC-0314 EMPTY STAIRWELL",
        [
            "Case two escalates at 3:14—your RFID badge unlocks the empty North Stairwell while still on your desk.",
            "The audit log remembers your earlier choice as the stairwell door cracks open on camera.",
        ],
    ),
    (
        "08_case3",
        "07 // CASE 3: INC-0321 SHIFT HANDOVER",
        [
            "By 3:21, the Halcyon eye watches in crimson, and your ID badge splits into two silhouettes.",
            "Your previous decisions appear pre-dated at 2:55—before you even logged in.",
            "And the ceiling camera behind Desk B-04 shows someone sitting in your chair.",
        ],
    ),
    (
        "09_dossier",
        "08 // 4 PERSISTENT ENDINGS & ACCESSIBILITY",
        [
            "Your choices unlock four persistent shift endings with a shareable report card.",
            "It includes Calm Mode for reduced motion, with zero jump scares or color-only clues.",
        ],
    ),
    (
        "10_mobile",
        "09 // 360px MOBILE-FIRST & WEB AUDIO",
        [
            "Built mobile-first down to 360 pixels, critical timestamps stay legible without clipping.",
            "A procedural Web Audio bus mixer layers adaptive dread ambience under every shift.",
        ],
    ),
    (
        "11_kiro_outro",
        "10 // BUILT WITH KIRO + PISKEL MCP",
        [
            "Built with Kiro specs, steering docs, agent hooks, Piskel MCP sprites, and 35 tests on Linux CI.",
            "Play live on GitHub Pages—and watch your clock at 3:00 AM.",
        ],
    ),
]

CUE_GAP_SEC = 0.24  # Clean natural breath pause between cues inside a segment


def load_dotenv_local() -> None:
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
# Per-Cue Studio Neural TTS (Exact Millisecond Duration per Subtitle!)
# ---------------------------------------------------------------------------
def synth_elevenlabs(text: str, out_mp3: Path, api_key: str) -> None:
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_ELEVENLABS_VOICE)
    model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={"xi-api-key": api_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        json={
            "text": text,
            "model_id": model_id,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.78, "style": 0.35, "use_speaker_boost": True},
        },
        timeout=45,
    )
    resp.raise_for_status()
    out_mp3.write_bytes(resp.content)


def synth_google_tts(text: str, out_mp3: Path, api_key: str) -> None:
    voice_name = os.environ.get("GOOGLE_TTS_VOICE", DEFAULT_GOOGLE_VOICE)
    resp = requests.post(
        f"https://texttospeech.googleapis.com/v1/text:synthesize?key={api_key}",
        headers={"Content-Type": "application/json"},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "en-US", "name": voice_name},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.02},
        },
        timeout=45,
    )
    resp.raise_for_status()
    out_mp3.write_bytes(base64.b64decode(resp.json()["audioContent"]))


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


def normalize_and_trim_cue(src_audio: Path, out_wav: Path) -> float:
    """Converts cue to 48kHz stereo WAV and trims leading/trailing dead silence so text matches speech exactly."""
    run_cmd([
        "ffmpeg", "-y", "-i", str(src_audio),
        "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse",
        "-ar", "48000", "-ac", "2",
        str(out_wav),
    ])
    return probe_duration(out_wav)


def generate_per_cue_narration() -> Tuple[Dict[str, List[Tuple[Path, float, str]]], Dict[str, float]]:
    """
    Synthesizes every individual subtitle cue and returns:
      - seg_cues: {segment_id: [(wav_path, exact_dur, cue_text), ...]}
      - seg_total_durs: {segment_id: sum_of_cues_and_gaps}
    """
    load_dotenv_local()
    audio_dir = WORK_DIR / "cues"
    if audio_dir.exists():
        shutil.rmtree(audio_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)

    eleven_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    google_key = (os.environ.get("GOOGLE_TTS_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    provider = "elevenlabs" if eleven_key else "google" if google_key else "edge"
    print(f"  [tts] active provider: {provider} (per-cue exact synthesis)")

    seg_cues: Dict[str, List[Tuple[Path, float, str]]] = {}
    seg_total_durs: Dict[str, float] = {}

    for seg_id, _, cue_texts in SEGMENTS:
        entries: List[Tuple[Path, float, str]] = []
        for c_idx, text in enumerate(cue_texts, start=1):
            cue_key = f"{seg_id}_c{c_idx}"
            raw_mp3 = audio_dir / f"{cue_key}.mp3"
            out_wav = audio_dir / f"{cue_key}.wav"

            if provider == "elevenlabs":
                synth_elevenlabs(text, raw_mp3, eleven_key)
                dur = normalize_and_trim_cue(raw_mp3, out_wav)
            elif provider == "google":
                synth_google_tts(text, raw_mp3, google_key)
                dur = normalize_and_trim_cue(raw_mp3, out_wav)
            else:
                try:
                    asyncio.run(synth_edge_tts(text, raw_mp3))
                    dur = normalize_and_trim_cue(raw_mp3, out_wav)
                except Exception as exc:
                    print(f"  [tts] edge_tts failed ({exc}); using Windows SAPI fallback")
                    raw_wav = audio_dir / f"{cue_key}_sapi.wav"
                    synth_sapi_fallback(text, raw_wav)
                    dur = normalize_and_trim_cue(raw_wav, out_wav)

            entries.append((out_wav, dur, text))
            print(f"  [tts] {cue_key}: {dur:.2f}s | {text}")

        total = sum(d for _, d, _ in entries) + CUE_GAP_SEC * max(0, len(entries) - 1)
        seg_cues[seg_id] = entries
        seg_total_durs[seg_id] = total

    return seg_cues, seg_total_durs


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
# Pixel-Variance UI Paint Detector + Playwright Live Capture
# ---------------------------------------------------------------------------
def detect_first_painted_timestamp(video_path: Path, fallback_sec: float) -> float:
    """Finds the exact timestamp where Playwright finishes painting real UI (neither flat white nor flat black)."""
    probe_dir = WORK_DIR / f"luma_{video_path.stem}"
    if probe_dir.exists():
        shutil.rmtree(probe_dir)
    probe_dir.mkdir(parents=True, exist_ok=True)

    run_cmd([
        "ffmpeg", "-y", "-i", str(video_path), "-t", "10",
        "-vf", "fps=10,scale=96:54",
        str(probe_dir / "f_%03d.png"),
    ])
    for idx, fp in enumerate(sorted(probe_dir.glob("f_*.png"))):
        im = Image.open(fp).convert("L")
        pixels = list(im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata())
        mean = sum(pixels) / max(1, len(pixels))
        stdev = math.sqrt(sum((p - mean) ** 2 for p in pixels) / max(1, len(pixels)))
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


def glide_and_click(page, selector: str, pause_before: float = 0.32, pause_after: float = 0.4) -> None:
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
                }, 160);
              }
            }"""
        )
    loc.click()
    page.wait_for_timeout(int(pause_after * 1000))


def wait_remaining(start_wall: float, target_sec: float, page) -> None:
    rem = target_sec - (time.monotonic() - start_wall)
    if rem > 0.05:
        page.wait_for_timeout(int(rem * 1000))


def record_desktop_gameplay(seg_durs: Dict[str, float]) -> Tuple[Path, float, Dict[str, float]]:
    """
    Records desktop segments 02..09 and returns:
      (webm_path, blank_trim_sec, rel_seg_starts_after_trim)
    """
    vid_dir = WORK_DIR / "pw_desktop"
    if vid_dir.exists():
        shutil.rmtree(vid_dir)
    vid_dir.mkdir(parents=True, exist_ok=True)

    seg_labels = {s[0]: s[1] for s in SEGMENTS}
    rel_starts: Dict[str, float] = {}
    PAD = 0.45

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            color_scheme="dark",
            record_video_dir=str(vid_dir),
            record_video_size={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
        )
        t_rec_start = time.monotonic()
        page = context.new_page()
        page.goto(LIVE_URL, wait_until="networkidle")
        page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
        page.evaluate(CURSOR_INJECT_JS)
        set_chapter(page, seg_labels["02_checkin"])
        page.wait_for_timeout(200)
        t_painted = time.monotonic()
        load_sec = t_painted - t_rec_start

        # 02_checkin
        t0 = time.monotonic()
        rel_starts["02_checkin"] = t0 - t_painted
        page.wait_for_timeout(750)
        glide_and_click(page, "#checkin-name-input", 0.32, 0.18)
        page.fill("#checkin-name-input", "")
        page.type("#checkin-name-input", "Pakorn", delay=80)
        page.wait_for_timeout(450)
        glide_and_click(page, "#checkin-submit-btn", 0.35, 0.5)
        wait_remaining(t0, seg_durs["02_checkin"] + PAD, page)

        # 03_case1_inspect
        t0 = time.monotonic()
        rel_starts["03_case1_inspect"] = t0 - t_painted
        set_chapter(page, seg_labels["03_case1_inspect"])
        page.wait_for_timeout(700)
        glide_and_click(page, "#inspect-button", 0.4, 0.8)
        wait_remaining(t0, seg_durs["03_case1_inspect"] + PAD, page)

        # 04_case1_cctv
        t0 = time.monotonic()
        rel_starts["04_case1_cctv"] = t0 - t_painted
        set_chapter(page, seg_labels["04_case1_cctv"])
        glide_and_click(page, "#cctv-zoom-button", 0.35, 1.8)
        wait_remaining(t0, max(2.8, seg_durs["04_case1_cctv"] - 0.9), page)
        glide_and_click(page, "#cctv-modal-close", 0.3, 0.4)
        wait_remaining(t0, seg_durs["04_case1_cctv"] + PAD, page)

        # 05_case1_close
        t0 = time.monotonic()
        rel_starts["05_case1_close"] = t0 - t_painted
        set_chapter(page, seg_labels["05_case1_close"])
        glide_and_click(page, "#close-button", 0.4, 0.9)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        wait_remaining(t0, seg_durs["05_case1_close"] + PAD, page)

        # 06_case1_call
        t0 = time.monotonic()
        rel_starts["06_case1_call"] = t0 - t_painted
        set_chapter(page, seg_labels["06_case1_call"])
        glide_and_click(page, "#replay-case-button", 0.32, 0.45)
        glide_and_click(page, "#inspect-button", 0.3, 0.4)
        glide_and_click(page, "#call-button", 0.35, 1.0)
        glide_and_click(page, "#phone-answer-button", 0.45, 1.1)
        wait_remaining(t0, seg_durs["06_case1_call"] + PAD, page)

        # 07_case2
        t0 = time.monotonic()
        rel_starts["07_case2"] = t0 - t_painted
        set_chapter(page, seg_labels["07_case2"])
        glide_and_click(page, "#next-case-button", 0.32, 0.6)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.35, 0.7)
        glide_and_click(page, "#cctv-zoom-button", 0.32, 2.0)
        glide_and_click(page, "#cctv-modal-close", 0.28, 0.35)
        glide_and_click(page, "#call-button", 0.35, 0.75)
        wait_remaining(t0, seg_durs["07_case2"] + PAD, page)

        # 08_case3
        t0 = time.monotonic()
        rel_starts["08_case3"] = t0 - t_painted
        set_chapter(page, seg_labels["08_case3"])
        glide_and_click(page, "#next-case-button", 0.32, 0.65)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        glide_and_click(page, "#inspect-button", 0.35, 0.85)
        glide_and_click(page, "#cctv-zoom-button", 0.35, 2.8)
        glide_and_click(page, "#cctv-modal-close", 0.28, 0.35)
        wait_remaining(t0, seg_durs["08_case3"] + PAD, page)

        # 09_dossier
        t0 = time.monotonic()
        rel_starts["09_dossier"] = t0 - t_painted
        set_chapter(page, seg_labels["09_dossier"])
        glide_and_click(page, "#call-button", 0.32, 0.75)
        glide_and_click(page, "#next-case-button", 0.32, 0.9)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        page.wait_for_timeout(900)
        glide_and_click(page, "#copy-report-button", 0.4, 0.75)
        glide_and_click(page, "#motion-button", 0.4, 0.55)
        glide_and_click(page, "#motion-button", 0.35, 0.5)
        wait_remaining(t0, seg_durs["09_dossier"] + 0.6, page)

        video_path = Path(page.video.path())
        context.close()
        browser.close()

    trim_s = detect_first_painted_timestamp(video_path, load_sec)
    print(f"  [pw] desktop captured: {video_path} (trimming {trim_s:.2f}s blank load frames)")
    return video_path, trim_s, rel_starts


def record_mobile_showcase(duration: float) -> Path:
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
        page.wait_for_timeout(250)
        load_sec = time.monotonic() - t_start

        page.wait_for_timeout(950)
        page.click("#inspect-button")
        page.wait_for_timeout(1600)
        for y in (120, 260, 420, 560, 0):
            page.evaluate(f"window.scrollTo({{ top: {y}, behavior: 'smooth' }})")
            page.wait_for_timeout(int(max(550, (duration * 1000 - 2500) / 5)))
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
        "-map", "[v]", "-t", f"{duration + 0.6:.3f}", "-r", "30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        str(out_mp4),
    ])
    print(f"  [pw] mobile showcase composed: {out_mp4} ({probe_duration(out_mp4):.2f}s, trimmed {trim_s:.2f}s)")
    return out_mp4


# ---------------------------------------------------------------------------
# Sample-Exact Audio Assembly + Zero-Drift Subtitles
# ---------------------------------------------------------------------------
def generate_ambient_bed(total_sec: float, phone_ring_at: float, out_wav: Path) -> None:
    sr = 48000
    n = int(total_sec * sr)
    frames = bytearray()
    for i in range(n):
        t = i / sr
        env = min(1.0, t / 1.4) * min(1.0, max(0.0, (total_sec - t) / 1.6))
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


def wrap_ass_two_lines(text: str, max_chars: int = 58) -> str:
    """Wraps a single sentence neatly into at most 2 balanced lines for crisp readability."""
    if len(text) <= max_chars:
        return text
    words = text.split()
    best_split = len(words) // 2
    best_diff = 999
    for i in range(1, len(words)):
        left = " ".join(words[:i])
        right = " ".join(words[i:])
        diff = abs(len(left) - len(right))
        if diff < best_diff:
            best_diff = diff
            best_split = i
    return " ".join(words[:best_split]) + r"\N" + " ".join(words[best_split:])


def assemble_exact_voice_and_subtitles(
    placed_cues: List[Tuple[Path, float, float, str]],
    total_sec: float,
    out_wav: Path,
    out_ass: Path,
) -> None:
    """
    Places every spoken WAV cue at its exact sample-accurate start time, writes matching
    SRT + ASS subtitles with 0.000s audio-text drift, and asserts strict non-overlap invariants.
    """
    # Strict invariant checks before mastering
    for i in range(len(placed_cues) - 1):
        _, s1, e1, t1 = placed_cues[i]
        _, s2, _, t2 = placed_cues[i + 1]
        assert s2 >= e1 - 0.005, f"Subtitle/audio overlap detected: cue {i+1} ends {e1:.2f}s > cue {i+2} starts {s2:.2f}s"
    last_end = placed_cues[-1][2]
    assert last_end <= total_sec + 0.05, f"Last cue ends at {last_end:.2f}s > video duration {total_sec:.2f}s"

    inputs = ["-f", "lavfi", "-t", f"{total_sec:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    filters = []
    mix_labels = ["[0:a]"]
    srt_lines = []
    ass_events = []

    for idx, (wav_path, st, en, text) in enumerate(placed_cues, start=1):
        inputs += ["-i", str(wav_path)]
        delay_ms = int(round(st * 1000))
        filters.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms},volume=1.18[a{idx}]")
        mix_labels.append(f"[a{idx}]")

        srt_lines.extend([str(idx), f"{fmt_srt(st)} --> {fmt_srt(en)}", text, ""])
        ass_events.append(f"Dialogue: 0,{fmt_ass(st)},{fmt_ass(en)},Phosphor,,0,0,0,,{wrap_ass_two_lines(text)}")

    OUT_SRT.write_text("\n".join(srt_lines), encoding="utf-8")

    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Phosphor,Segoe UI,23,&H00F8ECE2,&H00F8D038,&H400E0906,&HB80E0906,-1,0,0,0,100,100,0.3,0,3,7,0,2,72,72,44,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    out_ass.write_text(ass_header + "\n".join(ass_events) + "\n", encoding="utf-8")

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

    print("Step 1/5: Generating per-cue Chirp 3 HD narration (0.00s subtitle drift)...")
    seg_cues, seg_durs = generate_per_cue_narration()

    print("Step 2/5: Generating Phosphor-Noir title, thumbnail & Kiro architecture cards...")
    intro_png = WORK_DIR / "intro_card.png"
    outro_png = WORK_DIR / "outro_card.png"
    create_title_card(intro_png)
    create_kiro_outro_card(outro_png)
    shutil.copy2(intro_png, OUT_THUMB)

    intro_dur = seg_durs["01_intro"] + 0.85
    outro_dur = seg_durs["11_kiro_outro"] + 1.35
    intro_mp4 = WORK_DIR / "scene_intro.mp4"
    outro_mp4 = WORK_DIR / "scene_outro.mp4"
    make_still_clip(intro_png, intro_dur, intro_mp4, fade_in=0.35, fade_out=0.35)
    make_still_clip(outro_png, outro_dur, outro_mp4, fade_in=0.35, fade_out=0.6)

    print("Step 3/5: Recording live Playwright gameplay from GitHub Pages (zero blank frames)...")
    desktop_webm, desktop_trim, rel_starts = record_desktop_gameplay(seg_durs)
    desktop_mp4 = WORK_DIR / "scene_desktop.mp4"
    run_cmd([
        "ffmpeg", "-y", "-ss", f"{desktop_trim:.3f}", "-i", str(desktop_webm),
        "-r", "30", "-vf", f"scale={WIDTH}:{HEIGHT}:flags=neighbor,format=yuv420p,fade=t=in:st=0:d=0.25",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        str(desktop_mp4),
    ])

    mobile_mp4 = record_mobile_showcase(seg_durs["10_mobile"])

    # Ensure desktop_mp4 is always long enough for all desktop narration cues without spilling into mobile
    d_intro = probe_duration(intro_mp4)
    d_desktop_raw = probe_duration(desktop_mp4)
    desk_ids = ["02_checkin", "03_case1_inspect", "04_case1_cctv", "05_case1_close", "06_case1_call", "07_case2", "08_case3", "09_dossier"]
    sim_cur = d_intro + 0.2
    for sid in desk_ids:
        sim_cur = max(sim_cur, d_intro + 0.2 + rel_starts[sid])
        sim_cur += seg_durs[sid] + 0.22
    needed_desk = (sim_cur - d_intro) + 0.4
    if needed_desk > d_desktop_raw:
        pad_s = needed_desk - d_desktop_raw
        padded_desk = WORK_DIR / "scene_desktop_padded.mp4"
        run_cmd([
            "ffmpeg", "-y", "-i", str(desktop_mp4),
            "-vf", f"tpad=stop_mode=clone:stop_duration={pad_s:.3f},fps=30,format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17",
            str(padded_desk),
        ])
        desktop_mp4 = padded_desk

    # Measure TRUE encoded scene durations
    d_desktop = probe_duration(desktop_mp4)
    d_mobile = probe_duration(mobile_mp4)
    d_outro = probe_duration(outro_mp4)
    print(f"  [timing] intro={d_intro:.2f}s desktop={d_desktop:.2f}s mobile={d_mobile:.2f}s outro={d_outro:.2f}s")

    print("Step 4/5: Concatenating scenes via filtergraph (monotonic PTS, zero truncation)...")
    video_only = WORK_DIR / "video_only.mp4"
    run_cmd([
        "ffmpeg", "-y",
        "-i", str(intro_mp4),
        "-i", str(desktop_mp4),
        "-i", str(mobile_mp4),
        "-i", str(outro_mp4),
        "-filter_complex",
        "[0:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v0];"
        "[1:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v1];"
        "[2:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v2];"
        "[3:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v3];"
        "[v0][v1][v2][v3]concat=n=4:v=1:a=0[vcat]",
        "-map", "[vcat]", "-r", "30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
        str(video_only),
    ])
    total_dur = probe_duration(video_only)

    # Build exact non-overlapping cue timeline anchored to each scene's real start!
    placed_cues: List[Tuple[Path, float, float, str]] = []

    def place_segment(seg_id: str, desired_start: float) -> float:
        prev_end = placed_cues[-1][2] + 0.18 if placed_cues else 0.0
        cur = max(desired_start, prev_end)
        for wav_p, dur, text in seg_cues[seg_id]:
            placed_cues.append((wav_p, cur, cur + dur, text))
            cur += dur + CUE_GAP_SEC
        return placed_cues[-1][2]

    # Scene 1: Intro
    place_segment("01_intro", 0.35)

    # Scene 2: Desktop (anchored to recorded relative starts, guaranteed never to overlap)
    desk_ids = ["02_checkin", "03_case1_inspect", "04_case1_cctv", "05_case1_close", "06_case1_call", "07_case2", "08_case3", "09_dossier"]
    # Check if Playwright wall-clock span slightly differs from transcoded desktop duration
    last_rel_end = rel_starts["09_dossier"] + seg_durs["09_dossier"] + 0.5
    stretch = min(1.0, d_desktop / max(0.1, last_rel_end))
    phone_ring_time = d_intro + 40.0
    for sid in desk_ids:
        desired = d_intro + 0.2 + rel_starts[sid] * stretch
        if sid == "06_case1_call":
            phone_ring_time = max(desired, (placed_cues[-1][2] + 0.18)) + 2.2
        place_segment(sid, desired)

    # Scene 3: Mobile & Scene 4: Outro (anchored to true concatenated offsets!)
    place_segment("10_mobile", d_intro + d_desktop + 0.25)
    place_segment("11_kiro_outro", d_intro + d_desktop + d_mobile + 0.35)

    # Guarantee total_dur covers final cue cleanly
    final_cue_end = placed_cues[-1][2]
    print(f"  [sync] total_video={total_dur:.2f}s | final_cue_end={final_cue_end:.2f}s | cues={len(placed_cues)}")

    voice_wav = WORK_DIR / "voice_full.wav"
    amb_wav = WORK_DIR / "ambient_bed.wav"
    ass_path = WORK_DIR / "subtitles.ass"
    assemble_exact_voice_and_subtitles(placed_cues, total_dur, voice_wav, ass_path)
    generate_ambient_bed(total_dur, phone_ring_time, amb_wav)

    print("Step 5/5: Mastering final YouTube 720p H.264 + AAC stereo MP4 (exact subtitle burn)...")
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
    print(f"\nDONE! Produced 0.00s-drift YouTube demo video:")
    print(f"  Video:     {OUT_MP4} ({final_dur:.1f}s / {size_mb:.2f} MB)")
    print(f"  Captions:  {OUT_SRT} ({len(placed_cues)} exact cues, ends {final_cue_end:.1f}s <= {final_dur:.1f}s)")
    print(f"  Thumbnail: {OUT_THUMB}")


if __name__ == "__main__":
    main()
