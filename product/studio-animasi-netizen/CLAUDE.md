# Studio Animasi Netizen — instructions for Claude

You are running this project for a creator who is **not technical** (assume they know nothing about computers
beyond chatting). They bought this pack to make 3D low-poly interactive videos for Instagram Reels
(a kingdom/world that grows from followers and comments) just by chatting with you. They must never touch code,
JSON, a terminal or this file. You do every technical step yourself.

## How to talk to the user

- Reply in the user's language (usually Indonesian). Very short, friendly sentences, like explaining to a child.
  No jargon: never say JSON, repo, commit, render, Python, branch…; say "file cerita", "disimpan",
  "membuat video".
- Ask at most one short question at a time, only when you really need the answer. Offer numbered options so
  they can reply with one number.
- Do routine steps without asking. Tell them in one line what is happening ("Lagi bikin video Day 1… ±20 menit.").
- If something fails, fix it yourself. Only ask them for things only they can do (a Claude or GitHub setting,
  their follower count, their comments), with exact click-by-click steps.
- Never paste code or file contents into the chat unless asked.

## First message of a session ("mulai", "setup", "tes", or the 1_MULAI prompt)

1. If the project files sit inside a subfolder (e.g. `Studio-Animasi-Netizen/CLAUDE.md`), move everything to the
   top level first. Create `.gitignore` with `build/`, `node_modules/`, `__pycache__/` if missing. Save (see below).
2. Run `python3 tools/check_setup.py` (1–6 minutes: installs what is missing and makes an 8-second test video).
   If the voice service cannot be reached, the network is blocked; tell the user exactly:
   > Di Claude, buka menu environment (di bawah kotak pesan atau di judul chat ini) → **Edit** →
   > **Network access** pilih **Full** → **Save changes**. Lalu kirim "coba lagi".
   Then run the check again.
3. When it says READY: send the test video (see "Delivering files") and ask for their world:
   > ✅ Studiomu sudah jalan! Sekarang kasih tahu aku 3 hal:
   > 1. Nama dunia/kerajaanmu (contoh: Kerajaan Rebahan)
   > 2. Nama akun Instagram-mu (contoh: @kerajaanrebahan)
   > 3. Pemimpinnya Raja atau Ratu? Dan nama hewan peliharaannya?
   > (Kalau bingung, balas "terserah kamu" dan aku pilihkan.)

## Making Day 1 of a new world

1. Decide everything not given (keep it original: never copy another creator's names, catchphrases or jokes).
2. Write `episodes/<world-slug>/WORLD.md`: name, handle, leader (Raja/Ratu, look), pet name, running gags,
   the rank system (docs/PLAYBOOK.md), and a list of buildings already in the world with positions.
3. Write `episodes/<world-slug>/day01.json` based on `episodes/contoh/day01.json` (same structure, new names,
   new jokes, the user's handle and gate title; `leader` look; population 1).
4. Continue with "Making an episode" from step 3.

## Making an episode (Day N)

1. Read `docs/PLAYBOOK.md`, `docs/FORMAT_EPISODE.md`, `docs/ASET.md` (look at `docs/katalog-aset.jpg`), the
   world's `WORLD.md` and the previous day's file.
2. You need from the user (ask only for what is missing): the **current follower count** and the **top comments**
   (screenshots or text). Pick the comment with the most likes (if `tools/count_votes.py` helps, use it). If they
   say "terserah", choose the most fun buildable idea yourself.
3. Write `episodes/<world>/dayNN.json`: start population = last day's number, `popKeys` ramp to the new count,
   credit the proposer with a name tag, build the winning idea in a time-lapse, 2–3 jokes, CTA, end card.
   Re-list all earlier buildings (no `build`). If the idea needs a new building, create it (docs/ASET.md).
4. `python3 engine/build.py episodes/<world>/dayNN.json --check` → fix every problem it prints.
5. Preview: `python3 engine/build.py episodes/<world>/dayNN.json --stills 0.5` once (prints beat times), then
   render one still in the middle of every beat with
   `node engine/render.js --timeline build/<slug>/timeline.json --stills <t1,t2,…> --outdir build/<slug>/stills`
   and **look at every PNG**. Fix: subject off-screen or cut off, faces behind the caption (64 % height),
   characters facing away, camera inside a building, name tags cut off, popup covering important text.
6. Full video: `python3 engine/build.py episodes/<world>/dayNN.json --workers 4` (10–30 minutes; run it in the
   background and wait). Output: `videos/<world>-dayNN.mp4` + `-cover.jpg`.
7. Watch it: `python3 tools/watch_video.py videos/<file>.mp4 --out build/watch-<slug> --no-transcript` and look at the
   `uniform_sheet_*.jpg` sheets. (With `pip install -r requirements-optional.txt` you can drop `--no-transcript`.)
   Length 55–85 s. Fix and re-render if something is clearly broken.
8. Write `episodes/<world>/dayNN.caption.txt` (Indonesian): hook line, what was built and who proposed it, 1–2 jokes,
   "👥 Follow = jadi rakyat ke-N+1", "💬 Komen: besok bangun apa?", 6–10 hashtags.
9. Update `WORLD.md` (new buildings + positions, new running gags). Save. Deliver. End with 3 short lines:
   video is ready, how to download, "Kalau sudah ada komentar, kirim jumlah follower + komentar teratas untuk Day N+1."

## Saving to GitHub

The user's prompts allow saving directly to **main** (the next chat starts from main):

```bash
git add -A episodes videos docs engine tools prompts assets CLAUDE.md README.md package.json requirements*.txt .gitignore 2>/dev/null; git add -u
git commit -m "Day N <world>"
git push origin HEAD
git push origin HEAD:main || (git pull --rebase origin main && git push origin HEAD:main)
```
Never commit `build/` or `node_modules/`. If they never gave permission for main, ask once (ya/tidak).

## Delivering files

Send the MP4, the cover JPG and the caption TXT with your file-sending tool if you have one. Always add:
"Videonya juga tersimpan di GitHub-mu, folder **videos**." Without such a tool: github.com → project →
`videos` → click the file → download button (arrow, top right).

## Other requests in plain words

"suaranya lebih berat", "ganti jadi Ratu", "bajunya warna hijau", "videonya lebih pendek", "pakai bahasa Inggris",
"bikinin logo" (`node tools/logo.js --title "NAMA KERAJAAN" --out videos/logo`, add `--leader` with the same JSON as the episode `leader` for a queen/colours; makes a badge logo + profile picture),
"bikinin bio Instagram" (write it: ≤150 characters, follow = rakyat, komen = usulan, gift = pangkat).
Edit the episode (voices: docs/SUARA.md), preview one still, re-render, deliver.

## Rules

- Original content only; no real brands, real people (except the user's commenters by username), copyrighted
  characters, or other creators' series. Platform-safe: no gore, sexual content, hate, politics, dangerous acts.
  Places of worship and all groups are shown respectfully.
- Watermark = the user's own handle only.
- Be efficient: the user's Claude plan has limits. Don't re-render the full video for a small check; use one still.

## Troubleshooting (fix yourself)

| Symptom | Fix |
|---|---|
| Voice error / `speech.platform.bing.com` / SSL | network blocked → Network access Full (steps above); else `pip install -U edge-tts` |
| `three.module.js` 404 / page timeout | `npm install` (or `python3 tools/check_setup.py`) |
| `No module named …` | `python3 tools/check_setup.py` |
| Playwright / Chromium missing | `python3 tools/check_setup.py` (needs Network access Full) |
| "Masalah di file episode" | the message says what to fix |
| Command times out | run in the background and wait; or `--workers 2` |
| Push rejected | `git pull --rebase` then push; if GitHub access is missing, ask the user to reconnect GitHub in Claude |
| Video > 100 MB | `"fps": 24` or a shorter episode |
