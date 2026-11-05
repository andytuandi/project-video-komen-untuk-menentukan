#!/usr/bin/env python3
"""Promo reel (< 40 s) for the Studio Animasi Netizen product.

    python3 product/marketing/promo/build_promo.py            # full render -> product/marketing/promo-komen-siap.mp4
    python3 product/marketing/promo/build_promo.py --stills 2,9,20

Narration (edge-tts) + clean clips re-rendered from the episode timelines (no captions, no handle, generic gate
name) + 2D overlays drawn by promo.html (anonymous profile counter, chat bubbles, checklist, product, CTA).
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "engine"))
import audio  # noqa: E402
from build import chunk_words  # noqa: E402
from tts import synth_line  # noqa: E402

WORK = ROOT / "build" / "promo"
FPS = 30
VOICE = ("id-ID-ArdiNeural", "+15%", "+0Hz")

# (type, narration, clip source (day, start second) or None, extra)
LINES = [
    ("hook", "Akun ini ngehasilin lima belas ribu follower dalam satu hari... padahal cuma posting satu konten.", ("day03", 39.6), {"pre": 0.15}),
    ("clip", "Rahasianya? Animasi yang ceritanya diatur penonton.", ("day02", 9.6), {}),
    ("clip", "Follow, jadi rakyat. Komen, besok dibangun.", ("day01", 27.3), {}),
    ("clip", "Penonton ketagihan, nunggu besoknya.", ("day03", 14.9), {}),
    ("chat", "Bikinnya susah? Nggak. Semua ini dibuat cuma ngobrol sama AI.", ("day02", 33.0), {}),
    ("check", "Tanpa coding, tanpa edit video. Suara, teks, musik, otomatis.", ("day03", 22.4), {}),
    ("product", "Studio dan panduannya udah aku siapin.", None, {}),
    ("cta", "Mau? Komen SIAP, nanti aku kirimin filenya.", ("day03", 46.8), {"pause": 1.2}),
]
GAP = 0.18


def run(cmd, **kw):
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def clean_timeline(day):
    """Episode timeline without captions/handle/brand, for re-rendering clips."""
    tl = json.loads((ROOT / "build" / f"kerajaan-netizen-{day}" / "timeline.json").read_text())
    tl["captions"] = []
    tl["handle"] = ""
    tl["endCard"] = None
    if day != "day01":
        tl["popups"] = []
    for p in tl["props"]:
        if p["type"] == "gate":
            p.setdefault("params", {})["title"] = "KERAJAAN KITA"
    out = WORK / f"tl-{day}.json"
    out.write_text(json.dumps(tl))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills")
    a = ap.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)

    # 1) narration + timeline
    t, segs, caps, clips, sfx = 0.0, [], [], [], []
    for i, (kind, say, src, ex) in enumerate(LINES):
        start = t
        wav, dur, words = synth_line(say, *VOICE, ROOT / "build" / "tts_cache")
        s0 = start + ex.get("pre", 0.0)
        clips.append({"path": str(wav), "t": s0})
        for w in words:
            w["s"] = round(w["s"] + s0, 3)
            w["e"] = round(w["e"] + s0, 3)
        end = s0 + dur + GAP + ex.get("pause", 0.0)
        segs.append({"i": i, "type": kind, "start": round(start, 3), "end": round(end, 3), "src": src,
                     "words": [{"w": w["w"], "s": w["s"]} for w in words]})
        if kind not in ("hook", "cta"):
            ch = chunk_words(words, max_words=4, max_chars=24)
            for k, cw in enumerate(ch):
                nxt = ch[k + 1][0]["s"] if k + 1 < len(ch) else min(cw[-1]["e"] + 0.4, end)
                caps.append({"start": cw[0]["s"], "end": round(max(nxt, cw[-1]["e"]), 3), "text": " ".join(x["w"] for x in cw)})
        if i:
            sfx.append({"name": "whoosh", "t": max(0, start - 0.15), "gain": 0.7})
        t = end
    duration = round(t, 3)
    print(f"promo: {duration:.1f}s")
    for s in segs:
        print(f"  {s['i']} {s['type']:7s} {s['start']:6.2f}-{s['end']:6.2f}")

    # sound design cues (relative to the segments)
    S = {s["type"] + str(s["i"]): s for s in segs}
    hook, chat, check, prod, cta = segs[0], segs[4], segs[5], segs[6], segs[7]
    sfx += [{"name": "ding", "t": hook["start"] + 3.0}, {"name": "pop", "t": hook["start"] + 0.15}]
    sfx += [{"name": "pop", "t": chat["start"] + x} for x in (0.3, 1.6, 3.0)]
    sfx += [{"name": "pop", "t": check["start"] + x} for x in (0.2, 1.3, 2.4)]
    sfx += [{"name": "fanfare", "t": prod["start"] + 0.1, "gain": 0.6}]
    sfx += [{"name": "knock", "t": cta["start"] + 0.6 + k * 0.18, "gain": 0.35} for k in range(4)]
    sfx += [{"name": "pop", "t": cta["start"] + 1.5}, {"name": "ding", "t": cta["start"] + 1.6}]

    # 2) clean clips rendered from the episode timelines
    render_js = ROOT / "engine" / "render.js"
    tls = {d: clean_timeline(d) for d in ("day01", "day02", "day03")}
    for s in segs:
        if not s["src"]:
            continue
        day, st = s["src"]
        frames_dir = WORK / f"seg{s['i']}"
        need = int((s["end"] - s["start"]) * FPS) + 2
        if frames_dir.exists() and len(list(frames_dir.glob("*.jpg"))) >= need:
            s["frames"] = f"build/promo/seg{s['i']}"
            continue
        shutil.rmtree(frames_dir, ignore_errors=True)
        frames_dir.mkdir(parents=True)
        mp4 = WORK / f"seg{s['i']}.mp4"
        run(["node", render_js, "--timeline", tls[day], "--out", mp4, "--workers", 4,
             "--start", st, "--end", round(st + (s["end"] - s["start"]) + 0.2, 3)])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-q:v", "3", frames_dir / "%05d.jpg"])
        mp4.unlink()
        s["frames"] = f"build/promo/seg{s['i']}"

    # product images: thumbnail + two PDF pages
    pdf = ROOT / "product" / "dist" / "MULAI DI SINI - Panduan Studio Animasi Netizen.pdf"
    for n in (4, 7):
        out = WORK / f"pdf{n}"
        if not (WORK / f"pdf{n}.png").exists():
            run(["pdftoppm", "-r", "90", "-png", "-f", n, "-l", n, "-singlefile", pdf, out])
    shutil.copy(ROOT / "product" / "marketing" / "lynk" / "01-thumbnail.jpg", WORK / "thumb.jpg")

    tl = {"fps": FPS, "duration": duration, "segs": segs, "captions": caps}
    tl_path = WORK / "promo.json"
    tl_path.write_text(json.dumps(tl, indent=1))

    render = HERE / "render_promo.js"
    if a.stills:
        run(["node", render, tl_path, "--stills", a.stills])
        return

    # 3) audio
    mix = WORK / "mix.wav"
    audio.render_mix({"duration": duration, "sfx": sfx, "musicSections": []}, clips, str(mix))
    video = WORK / "video.mp4"
    run(["node", render, tl_path, "--out", video])
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mix), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
                            "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    ln = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:"
          f"measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    final = ROOT / "product" / "marketing" / "promo-komen-siap.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-af", ln, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final])
    print("done:", final)


if __name__ == "__main__":
    main()
