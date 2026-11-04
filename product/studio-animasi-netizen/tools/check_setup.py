#!/usr/bin/env python3
"""Cek kesehatan Studio Animasi Netizen dengan satu perintah.

    python3 tools/check_setup.py          # cek + pasang yang kurang + buat video uji ±8 detik
    python3 tools/check_setup.py --quick  # cek saja, tanpa video uji

Exit code 0 = siap membuat video.
"""
import argparse
import importlib
import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
problems = []


def say(ok, msg):
    print(("  OK  " if ok else "  !!  ") + msg, flush=True)
    if not ok:
        problems.append(msg)


def sh(cmd, **kw):
    return subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, **kw)


def pip_install(args):
    base = [sys.executable, "-m", "pip", "install", "-q"]
    r = subprocess.run(base + args, capture_output=True, text=True)
    if r.returncode != 0 and "externally-managed" in (r.stderr + r.stdout):
        r = subprocess.run(base + ["--break-system-packages"] + args, capture_output=True, text=True)
    return r.returncode == 0


def check_python():
    need = {"edge_tts": "edge-tts", "numpy": "numpy", "scipy": "scipy", "PIL": "Pillow"}
    if any(importlib.util.find_spec(m) is None for m in need):
        print("  ..  memasang paket Python", flush=True)
        pip_install(["-r", str(ROOT / "requirements.txt")])
        importlib.invalidate_caches()
    still = [m for m in need if importlib.util.find_spec(m) is None]
    say(not still, "paket Python" + (f" kurang: {still}" if still else ""))


def check_ffmpeg():
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("  ..  memasang ffmpeg", flush=True)
        sh("(apt-get update -qq && apt-get install -y -qq ffmpeg) || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)")
    say(bool(shutil.which("ffmpeg") and shutil.which("ffprobe")), "ffmpeg (alat video)")


def check_node():
    if not shutil.which("node"):
        say(False, "Node.js belum terpasang")
        return False
    if not (ROOT / "node_modules" / "three" / "build" / "three.module.js").exists():
        print("  ..  memasang mesin 3D (three.js)", flush=True)
        sh("npm install --silent --no-audit --no-fund", cwd=ROOT)
    ok = (ROOT / "node_modules" / "three" / "build" / "three.module.js").exists()
    say(ok, "mesin 3D (three.js)")
    return ok


def check_browser():
    test = "const {chromium}=require('playwright');chromium.launch().then(b=>b.close()).then(()=>console.log('ok'))"
    r = sh(["node", "-e", test], cwd=ROOT)
    if "ok" not in r.stdout:
        print("  ..  memasang browser penggambar (Playwright + Chromium), bisa beberapa menit", flush=True)
        sh("npm install --no-save --silent playwright", cwd=ROOT)
        sh("npx --yes playwright install --with-deps chromium || npx --yes playwright install chromium", cwd=ROOT)
        r = sh(["node", "-e", test], cwd=ROOT)
    say("ok" in r.stdout, "browser penggambar (Playwright + Chromium)" + ("" if "ok" in r.stdout else f": {r.stderr.strip()[-300:]}"))


def check_voice():
    sys.path.insert(0, str(ROOT / "engine"))
    try:
        from tts import synth_line
        _, dur, _ = synth_line("Tes suara, satu, dua, tiga.", "id-ID-ArdiNeural", "+0%", "+0Hz", ROOT / "build" / "tts_cache")
        say(dur > 0.5, f"layanan suara ({dur:.1f} detik)")
    except Exception as e:  # noqa: BLE001
        say(False, f"layanan suara: {e}")


def test_video():
    r = subprocess.run([sys.executable, str(ROOT / "engine" / "build.py"), str(ROOT / "episodes" / "_test" / "test.json"),
                        "--workers", "2"], capture_output=True, text=True)
    out = ROOT / "videos" / "tes-studio-day00.mp4"
    ok = r.returncode == 0 and out.exists() and out.stat().st_size > 50_000
    say(ok, f"video uji -> {out.relative_to(ROOT)}" if ok else f"video uji gagal: {(r.stderr or r.stdout).strip()[-600:]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    print("Mengecek Studio Animasi Netizen…", flush=True)
    check_python()
    check_ffmpeg()
    if check_node():
        check_browser()
    check_voice()
    if not a.quick and not problems:
        test_video()
    print()
    if problems:
        print("BELUM SIAP. Masalah:")
        for p in problems:
            print("  - " + p)
        print("\nPerbaikan paling umum: di Claude, buka pengaturan environment cloud, set Network access ke Full, "
              "lalu mulai sesi baru dan jalankan cek ini lagi.")
        sys.exit(1)
    print("READY: semua berfungsi. Kamu sudah bisa membuat video.")


if __name__ == "__main__":
    main()
