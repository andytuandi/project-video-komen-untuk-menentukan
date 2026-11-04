#!/usr/bin/env python3
"""Local "watch" for a video: frames + contact sheets + transcript + audio stats.

Same technique as the open-source `claude-video` /watch skill (local engine) and
`video-analyzer-skill`: ffmpeg scene-change frames (with a uniform fallback),
perceptual de-dup, tiled contact sheets for fast review, and a timestamped
Whisper transcript. Everything stays on this machine.

Usage:
    python3 tools/watch_video.py VIDEO --out analysis/raw/NAME [--fps 1] [--model small]
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(video):
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "format=duration:stream=codec_type,width,height,r_frame_rate",
             "-of", "json", str(video)])
    return json.loads(r.stdout)


def extract_uniform(video, out_dir, fps, width):
    """One frame every 1/fps seconds, labelled with its timestamp."""
    out_dir.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(video),
         "-vf", f"fps={fps},scale={width}:-2", "-q:v", "3",
         str(out_dir / "u_%04d.jpg")])
    frames = sorted(out_dir.glob("u_*.jpg"))
    return [(i / fps, p) for i, p in enumerate(frames)]


def extract_scenes(video, out_dir, threshold, width):
    """Frame 0 plus every frame whose scene score exceeds `threshold`."""
    out_dir.mkdir(parents=True, exist_ok=True)
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "info", "-i", str(video),
             "-vf", f"select='eq(n\\,0)+gt(scene\\,{threshold})',scale={width}:-2,showinfo",
             "-vsync", "vfr", "-q:v", "3", str(out_dir / "s_%04d.jpg")])
    times = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]
    frames = sorted(out_dir.glob("s_*.jpg"))
    return list(zip(times, frames))


def contact_sheets(frames, out_dir, prefix, cols=4, rows=3, cell_w=270):
    """Tile frames into labelled grids so a whole video can be skimmed fast."""
    sheets = []
    per = cols * rows
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    for s in range(0, len(frames), per):
        chunk = frames[s:s + per]
        first = Image.open(chunk[0][1])
        cell_h = int(first.height * cell_w / first.width)
        sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "black")
        d = ImageDraw.Draw(sheet)
        for i, (t, p) in enumerate(chunk):
            im = Image.open(p).convert("RGB").resize((cell_w, cell_h))
            x, y = (i % cols) * cell_w, (i // cols) * cell_h
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 74, y + 24], fill="black")
            d.text((x + 4, y + 2), f"{t:5.1f}s", fill="yellow", font=font)
        path = out_dir / f"{prefix}_sheet_{s // per + 1:02d}.jpg"
        sheet.save(path, quality=85)
        sheets.append(path)
    return sheets


def loudness_profile(video, step=1.0):
    """Per-second RMS level (dB) — shows where music/SFX hits and silences are."""
    r = run(["ffmpeg", "-hide_banner", "-i", str(video), "-af",
             f"asetnsamples=n={int(44100 * step)},astats=metadata=1:reset=1,"
             "ametadata=print:key=lavfi.astats.Overall.RMS_level",
             "-f", "null", "-"])
    vals = re.findall(r"RMS_level=(-?[0-9.]+|-inf)", r.stderr)
    return [(-99.0 if v == "-inf" else round(float(v), 1)) for v in vals]


def transcribe(video, model_name):
    import numpy as np
    from faster_whisper import WhisperModel
    # Decode with ffmpeg ourselves (16 kHz mono float) — avoids PyAV version clashes.
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(video), "-ac", "1",
                          "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio, word_timestamps=True, vad_filter=False)
    out = []
    for seg in segments:
        out.append({
            "start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip(),
            "words": [{"w": w.word, "s": round(w.start, 2), "e": round(w.end, 2)} for w in (seg.words or [])],
        })
    return {"language": info.language, "lang_prob": round(info.language_probability, 2), "segments": out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps", type=float, default=1.0)
    ap.add_argument("--scene", type=float, default=0.25)
    ap.add_argument("--width", type=int, default=540)
    ap.add_argument("--model", default="small")
    ap.add_argument("--no-transcript", action="store_true")
    a = ap.parse_args()

    video, out = Path(a.video), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = probe(video)
    uni = extract_uniform(video, out / "frames", a.fps, a.width)
    scn = extract_scenes(video, out / "scenes", a.scene, a.width)
    sheets = contact_sheets(uni, out, "uniform")
    report = {
        "video": str(video), "meta": meta,
        "uniform_frames": len(uni), "scene_cuts": [round(t, 2) for t, _ in scn],
        "sheets": [str(s) for s in sheets],
        "loudness_db_per_s": loudness_profile(video),
    }
    if not a.no_transcript:
        report["transcript"] = transcribe(video, a.model)
    (out / "report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
    lines = [f"# {video.name}", f"duration: {meta['format']['duration']}s",
             f"scene cuts ({len(scn)}): {report['scene_cuts']}", ""]
    for s in report.get("transcript", {}).get("segments", []):
        lines.append(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
    (out / "transcript.md").write_text("\n".join(lines) + "\n")
    print(out / "transcript.md")


if __name__ == "__main__":
    main()
