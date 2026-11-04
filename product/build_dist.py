#!/usr/bin/env python3
"""Builds the two files you upload to Lynk.id:

    product/dist/MULAI DI SINI - Panduan Studio Animasi Netizen.pdf
    product/dist/Studio-Animasi-Netizen.zip

    python3 product/build_dist.py
"""
import subprocess
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACK = HERE / "studio-animasi-netizen"
DIST = HERE / "dist"
SKIP_DIRS = {"build", "__pycache__", "node_modules", ".git"}
SKIP_FILES = {"package-lock.json", ".DS_Store"}


def keep(p: Path) -> bool:
    rel = p.relative_to(PACK)
    if any(part in SKIP_DIRS for part in rel.parts) or p.name in SKIP_FILES:
        return False
    if rel.parts[0] == "videos" and p.name != "README.txt":
        return False  # never ship rendered videos inside the pack
    return p.is_file()


def main():
    DIST.mkdir(exist_ok=True)
    pdf = DIST / "MULAI DI SINI - Panduan Studio Animasi Netizen.pdf"
    subprocess.run(["node", str(HERE / "tutorial" / "make_pdf.js"), str(pdf)], check=True)
    zpath = DIST / "Studio-Animasi-Netizen.zip"
    files = sorted(p for p in PACK.rglob("*") if keep(p))
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, Path("Studio-Animasi-Netizen") / f.relative_to(PACK))
    print(f"{pdf.name}: {pdf.stat().st_size // 1024} KB")
    print(f"{zpath.name}: {len(files)} files, {zpath.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
