#!/usr/bin/env python3
"""Episode JSON → finished vertical reel (1080x1920 MP4) for Kerajaan Netizen.

    python3 engine/build.py episodes/day01.json --stills 2,9,16      # preview PNGs only
    python3 engine/build.py episodes/day01.json --workers 4          # full render

Steps: TTS per beat (cached) → timeline.json → procedural audio mix →
Three.js render in headless Chromium (Playwright) → mux + loudness normalisation (-14 LUFS).
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

import audio  # noqa: E402
from tts import synth_line  # noqa: E402


def load_episode(path):
    ep = json.loads(Path(path).read_text())
    slug = re.sub(r"[^a-z0-9]+", "-", ep["series"].lower()).strip("-")
    ep["_slug"] = f"{slug}-day{ep['day']:02d}"
    return ep


def chunk_words(words, max_words=5, max_chars=28):
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        if len(cur) >= max_words or len(text) >= max_chars or re.search(r"[.,!?…:]$", w["w"]):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    if len(chunks) > 1 and len(chunks[-1]) == 1 and len(chunks[-2]) < max_words \
            and not re.search(r"[.,!?:]$", chunks[-2][-1]["w"]):
        chunks[-2] += chunks.pop()
    return chunks


def to_min(s):
    h, m = s.split(":")
    return int(h) * 60 + int(m)


def build_timeline(ep, cache_dir):
    voices = ep["voices"]
    gap = ep.get("gap", 0.35)
    t = 0.0
    beats, shots, captions, clock, popups, sfx, fades, music = [], [], [], [], [], [], [], []
    clips = []
    end_card = None
    for i, b in enumerate(ep["beats"]):
        v = voices[b.get("speaker", "raja")]
        start = t
        speech_start = start + b.get("pre", 0.0)
        words, dur = [], b.get("dur", 0.0)
        if b.get("say"):
            wav, dur, words = synth_line(b["say"], v["voice"], v.get("rate", "+0%"), v.get("pitch", "+0Hz"), cache_dir)
            clips.append({"path": str(wav), "t": speech_start})
            for w in words:
                w["s"] = round(w["s"] + speech_start, 3)
                w["e"] = round(w["e"] + speech_start, 3)
        end = speech_start + dur + gap + b.get("pause", 0.0)
        span = end - start
        beats.append({"i": i, "start": round(start, 3), "end": round(end, 3), "words": words})

        # camera / actors
        if b.get("shot") or not shots:
            sh = dict(b.get("shot", {}))
            shots.append({"start": round(start, 3), "end": round(end, 3), "cam": sh.get("cam"),
                          "actors": sh.get("actors", []), "beats": [i]})
            if b.get("transition") == "fade":
                fades.append({"t": round(start, 3), "len": 0.35})
            elif b.get("transition") == "white":
                fades.append({"t": round(start, 3), "len": 0.3, "color": "255,255,255"})
            elif i > 0 and b.get("transition") != "none":
                sfx.append({"name": "whoosh", "t": max(0, start - 0.2), "gain": 0.6})
        else:
            shots[-1]["end"] = round(end, 3)
            shots[-1]["beats"].append(i)

        # clock: "HH:MM" static (real time) or ["HH:MM","HH:MM"] time-lapse across the beat
        c = b.get("clock")
        if isinstance(c, list):
            clock.append({"t0": round(start, 3), "t1": round(end, 3), "m0": to_min(c[0]), "m1": to_min(c[1]),
                          "label": b.get("clockLabel", "x24 TIME-LAPSE")})
        elif isinstance(c, str):
            clock.append({"t0": round(start, 3), "t1": round(start, 3), "m0": to_min(c), "m1": to_min(c),
                          "label": b.get("clockLabel", "REAL TIME")})

        pops = b.get("popup", [])
        for p in (pops if isinstance(pops, list) else [pops]):
            pt = start + p.get("at", 0.1) * span
            if p.get("word"):
                for w in words:
                    if re.sub(r"\W", "", w["w"].lower()) == p["word"].lower():
                        pt = w["s"] - 0.05
                        break
            popups.append({"t": round(pt, 3), "dur": p.get("dur", 2.2), "text": p["text"], "icon": p.get("icon"),
                           "color": p.get("color"), "y": p.get("y")})
            sfx.append({"name": "pop", "t": pt})

        for s in b.get("sfx", []):
            name, at = (s[0], s[1]) if isinstance(s, list) else (s["name"], s.get("at", 0))
            gain = s[2] if isinstance(s, list) and len(s) > 2 else (s.get("gain", 1) if isinstance(s, dict) else 1)
            sfx.append({"name": name, "t": round(start + at * span, 3), "gain": gain})
        for name in b.get("loops", []):
            sfx.append({"name": name, "t": round(start, 3), "len": round(span, 3)})
        if b.get("music"):
            music.append([round(start, 3), round(end, 3), b["music"]])

        if b.get("end"):
            end_card = dict(b["end"], t=round(start + b["end"].get("at", 0.0) * span, 3))

        if words and not b.get("nocap"):
            ch = chunk_words(words)
            for k, cw in enumerate(ch):
                nxt = ch[k + 1][0]["s"] if k + 1 < len(ch) else min(cw[-1]["e"] + 0.5, end)
                captions.append({"start": cw[0]["s"], "end": round(max(nxt, cw[-1]["e"]), 3),
                                 "text": " ".join(w["w"] for w in cw), "color": b.get("capColor")})
        t = end

    def beat_t(ref, frac=0.0):
        bb = beats[ref]
        return round(bb["start"] + frac * (bb["end"] - bb["start"]), 3)

    props = []
    for p in ep.get("props", []):
        q = dict(p)
        if isinstance(p.get("show"), int):
            q["show"] = beat_t(p["show"], p.get("showAt", 0))
        if isinstance(p.get("hide"), int):
            q["hide"] = beat_t(p["hide"], p.get("hideAt", 0))
        if p.get("build"):
            bd = p["build"]
            q["build"] = [beat_t(bd["beat"], bd.get("from", 0)), beat_t(bd.get("endBeat", bd["beat"]), bd.get("to", 1))]
            q.setdefault("show", q["build"][0])
        if p.get("params", {}).get("lit"):
            lit = p["params"]["lit"]
            q["params"] = dict(p["params"], lit=beat_t(lit["beat"], lit.get("at", 0)))
        props.append(q)

    pop_keys = [{"t": beat_t(k["beat"], k.get("at", 0)), "v": k["v"]} for k in ep.get("popKeys", [])]
    tl = {
        "fps": ep.get("fps", 30), "W": 1080, "H": 1920, "duration": round(t, 3),
        "series": ep["series"], "day": ep["day"], "handle": ep["handle"], "ui": ep.get("ui", {}),
        "population": ep.get("population", 1), "popKeys": pop_keys, "seed": ep.get("seed", 7),
        "shots": shots, "beats": beats, "captions": captions, "clock": clock, "popups": popups,
        "fades": fades, "endCard": end_card, "props": props, "cover": ep.get("cover"),
        "sfx": sfx, "musicSections": music,
    }
    return tl, clips


def run(cmd):
    print("+", " ".join(str(c) for c in cmd[:6]), "…" if len(cmd) > 6 else "", flush=True)
    subprocess.run([str(c) for c in cmd], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--out", default=str(ROOT / "output"))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--fps", type=int, default=None)
    ap.add_argument("--stills", default=None, help="comma list of seconds: render PNG previews only")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    a = ap.parse_args()

    ep = load_episode(a.episode)
    work = ROOT / "build" / ep["_slug"]
    work.mkdir(parents=True, exist_ok=True)
    tl, clips = build_timeline(ep, ROOT / "build" / "tts_cache")
    if a.fps:
        tl["fps"] = a.fps
    tl_path = work / "timeline.json"
    tl_path.write_text(json.dumps(tl, indent=1))
    print(f"timeline: {tl['duration']:.1f}s, {len(tl['shots'])} shots, {len(tl['captions'])} captions")
    for b in tl["beats"]:
        print(f"  beat {b['i']:2d} {b['start']:6.2f}-{b['end']:6.2f}")

    render_js = ROOT / "engine" / "render.js"
    if a.stills:
        run(["node", render_js, "--timeline", tl_path, "--stills", a.stills, "--outdir", work / "stills"])
        return

    mix = work / "mix.wav"
    audio.render_mix(tl, clips, mix)
    silent = work / "video.mp4"
    cmd = ["node", render_js, "--timeline", tl_path, "--out", silent, "--workers", a.workers, "--start", a.start]
    if a.end is not None:
        cmd += ["--end", a.end]
    run(cmd)

    out_dir = Path(a.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    final = out_dir / f"{ep['_slug']}.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-ss", a.start, "-i", mix,
         "-map", "0:v", "-map", "1:a", "-c:v", "copy",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-shortest", "-movflags", "+faststart", final])
    if tl.get("cover"):
        run(["node", render_js, "--timeline", tl_path, "--cover", out_dir / f"{ep['_slug']}-cover.jpg"])
    print("done:", final)


if __name__ == "__main__":
    main()
