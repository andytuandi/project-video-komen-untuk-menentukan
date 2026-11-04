"""Text-to-speech with per-word timestamps (free: Microsoft Edge neural voices via edge-tts).

Each line is cached by (voice, rate, pitch, text) so re-rendering an episode
after a visual tweak never re-requests audio.
"""
import asyncio
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

CA_BUNDLE = os.environ.get("TTS_CA_BUNDLE", "/root/.ccr/ca-bundle.crt")


def _patch_ca():
    # edge-tts pins certifi's bundle; behind a TLS-terminating proxy it must use the proxy CA.
    if Path(CA_BUNDLE).exists():
        import certifi
        certifi.where = lambda: CA_BUNDLE


def clean_for_speech(text):
    """Script markup → what the voice should read. `*word*` marks a caption highlight."""
    return text.replace("*", "")


async def _synth(text, voice, rate, pitch, mp3_path):
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({
                    "w": chunk["text"],
                    "s": chunk["offset"] / 1e7,
                    "e": (chunk["offset"] + chunk["duration"]) / 1e7,
                })
    return words


def synth_line(text, voice, rate, pitch, cache_dir):
    """Return (wav_path, duration_s, words[]) for one line of dialogue/narration."""
    _patch_ca()
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    spoken = clean_for_speech(text)
    key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{spoken}".encode()).hexdigest()[:16]
    wav, meta = cache_dir / f"{key}.wav", cache_dir / f"{key}.json"
    if not (wav.exists() and meta.exists()):
        mp3 = cache_dir / f"{key}.mp3"
        for attempt in range(4):
            try:
                words = asyncio.run(_synth(spoken, voice, rate, pitch, mp3))
                break
            except Exception:
                if attempt == 3:
                    raise
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3),
                        "-ac", "1", "-ar", "48000", str(wav)], check=True)
        mp3.unlink()
        meta.write_text(json.dumps(words))
    words = json.loads(meta.read_text())
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", str(wav)], capture_output=True, text=True).stdout)
    return wav, dur, align_highlights(text, words)


def _norm(s):
    return re.sub(r"[^0-9a-z']", "", s.lower().replace("’", "'"))


def align_highlights(script_text, words):
    """Map TTS word boundaries back onto the script tokens so captions keep the
    script's spelling/punctuation and its `*highlight*` marks."""
    tokens = []
    for raw in script_text.split():
        hl = "*" in raw
        tokens.append({"t": raw.replace("*", ""), "hl": hl, "n": _norm(raw)})
    out, ti = [], 0
    for w in words:
        n = _norm(w["w"])
        if not n:
            continue
        # advance to the next script token that matches (TTS may split/merge oddly)
        j = ti
        while j < len(tokens) and tokens[j]["n"] != n and not tokens[j]["n"].startswith(n):
            j += 1
        if j < len(tokens):
            for k in range(ti, j):  # tokens TTS skipped (e.g. "—") ride on this word
                out.append({"w": tokens[k]["t"], "s": w["s"], "e": w["s"], "hl": tokens[k]["hl"]})
            out.append({"w": tokens[j]["t"], "s": w["s"], "e": w["e"], "hl": tokens[j]["hl"]})
            ti = j + 1
        else:
            out.append({"w": w["w"], "s": w["s"], "e": w["e"], "hl": False})
    for k in range(ti, len(tokens)):
        last = out[-1]["e"] if out else 0
        out.append({"w": tokens[k]["t"], "s": last, "e": last, "hl": tokens[k]["hl"]})
    return out
