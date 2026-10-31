#!/usr/bin/env python3
"""Hitung hasil voting komentar untuk episode berikutnya + undi "Rakyat Bernama".

Mode 1 — manual (tanpa API): salin komentar ke file teks, satu komentar per baris:
    username | isi komentar | jumlah like
  lalu:
    python3 tools/count_votes.py --file komentar_day01.txt

Mode 2 — Instagram Graph API (akun Creator/Bisnis yang terhubung ke Facebook Page):
    export IG_TOKEN=...          # long-lived access token
    python3 tools/count_votes.py --media <IG_MEDIA_ID>
  (followers_count bisa diambil dengan --user <IG_USER_ID>)

Output: peringkat usulan (dikelompokkan per kata kunci, dibobot like), komentar teratas,
dan daftar nama acak untuk ditampilkan sebagai rakyat di video berikutnya.
"""
import argparse
import json
import os
import random
import re
import urllib.request
from collections import defaultdict

STOP = set("""yang dan di ke dari aja dong deh sih nya ini itu buat bikin bangun bangunin tolong pak raja min
kak bang please plis ya yg gw gue aku saya kita kamu lu lo juga lagi udah sudah biar supaya mau pengen ingin
harus dulu duluan apa ada the a gak nggak ga enggak tidak jangan kalo kalau terus sama untuk""".split())


def graph(path, token, **params):
    q = "&".join(f"{k}={v}" for k, v in {**params, "access_token": token}.items())
    with urllib.request.urlopen(f"https://graph.facebook.com/v21.0/{path}?{q}") as r:
        return json.load(r)


def from_api(media, token):
    out, url = [], None
    data = graph(f"{media}/comments", token, fields="username,text,like_count", limit=50)
    while True:
        for c in data.get("data", []):
            out.append((c.get("username", "?"), c.get("text", ""), int(c.get("like_count", 0))))
        nxt = data.get("paging", {}).get("next")
        if not nxt:
            break
        with urllib.request.urlopen(nxt) as r:
            data = json.load(r)
    return out


def from_file(path):
    out = []
    for line in open(path, encoding="utf-8"):
        if not line.strip():
            continue
        parts = [p.strip() for p in line.split("|")]
        user, text = parts[0], parts[1] if len(parts) > 1 else ""
        likes = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
        out.append((user, text, likes))
    return out


def keywords(text):
    words = re.findall(r"[a-zA-Z]+", text.lower())
    return [w for w in words if w not in STOP and len(w) > 2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file")
    ap.add_argument("--media")
    ap.add_argument("--user", help="IG user id: print followers_count")
    ap.add_argument("--names", type=int, default=12, help="berapa nama rakyat diundi")
    ap.add_argument("--seed", type=int, default=None)
    a = ap.parse_args()
    token = os.environ.get("IG_TOKEN")
    if a.user:
        print("followers_count:", graph(a.user, token, fields="followers_count")["followers_count"])
    comments = from_api(a.media, token) if a.media else from_file(a.file)
    print(f"{len(comments)} komentar\n")

    score, voters = defaultdict(int), defaultdict(set)
    for user, text, likes in comments:
        for kw in set(keywords(text)):
            score[kw] += 1 + likes          # 1 suara per komentar + 1 per like
            voters[kw].add(user)
    print("PERINGKAT USULAN (kata kunci, skor = komentar + like):")
    for kw, s in sorted(score.items(), key=lambda x: -x[1])[:10]:
        print(f"  {kw:<16} {s:>5}   ({len(voters[kw])} orang)")
    print("\nKOMENTAR DENGAN LIKE TERBANYAK:")
    for user, text, likes in sorted(comments, key=lambda c: -c[2])[:5]:
        print(f"  {likes:>4} ♥  @{user}: {text}")
    users = sorted({u for u, _, _ in comments})
    random.seed(a.seed)
    pick = random.sample(users, min(a.names, len(users)))
    print(f"\nRAKYAT BERNAMA (diundi {len(pick)} dari {len(users)} pengomentar):")
    print("  " + ", ".join("@" + u for u in pick))


if __name__ == "__main__":
    main()
