# Kerajaan Netizen (@kerajaannetizen.idn)

Serial video vertikal (Reels/TikTok/Shorts, 1080x1920) dengan animasi **3D low-poly** yang ceritanya dikendalikan penonton:
follow = jadi rakyat, komentar = usulan bangunan berikutnya, gift/dukungan = naik pangkat.
Sistem lengkap ada di [SISTEM_PANGKAT.md](SISTEM_PANGKAT.md).

## Mesin

Semua visual dibuat dengan kode, tanpa aset 3D eksternal: Three.js dirender di Chromium headless.
Suaranya edge-tts (id-ID-ArdiNeural), dan musik serta SFX disintesis prosedural, jadi bebas copyright.

```
engine/build.py            naskah JSON → timeline → audio → render → MP4 (-14 LUFS) + cover
engine/render.js           Playwright: server lokal + render frame paralel → ffmpeg
engine/renderer/assets.js  aset low-poly: pohon, gunung, pulau melayang, kristal, gerbang, papan, tenda, api unggun, gerobak, Raja, warga, naga "Kompor"
engine/renderer/main.js    dunia, langit siang/malam mengikuti jam, kamera, animasi tokoh, progres bangunan
engine/renderer/hud.js     badge DAY, jam time-lapse, watermark, blok sosmed, caption, popup, end card
engine/audio.py            musik lute/flute prosedural + SFX (palu, api, naga, fanfare, jangkrik)
engine/tts.py              TTS + timestamp per kata (cache di build/tts_cache)
tools/count_votes.py       hitung voting komentar + undi nama rakyat
episodes/dayNN.json        naskah per episode; dayNN.caption.txt = caption siap tempel
```

## Pakai

```bash
pip install --break-system-packages -r requirements.txt
npm install
python3 engine/build.py episodes/day01.json --stills 3,10,20   # cek gambar
python3 engine/build.py episodes/day01.json --workers 4         # render penuh → output/
```

## Format naskah (ringkas)

- `props`: benda di dunia (`gate`, `sign` dengan `{pop}`, `throne`, `tent`, `campfire`, `crate`, `sack`),
  dengan `show`/`hide` (indeks beat) dan `build: {beat, from, to}` untuk animasi membangun.
- `beats[]`: `say` (narasi Raja), `clock` (`"07:30"` = real time, `["13:00","17:00"]` = x24 time-lapse),
  `shot.cam` (`from`/`to` → `pos`, `look`, `fov`), `shot.actors` (`king`/`dragon`/`villager`/`cart`
  dengan `at` atau `path`+`move`, `anim`/`anims`: idle, walk, talk, wave, raise, point, shrug, present,
  hammer, sit; naga: hop, fly, fire, peek, look, sleep), `popup`, `sfx`, `loops`, `music: "soft"`, `end` (end card).
- Frame vertikal itu sempit: untuk memuat satu tokoh plus satu benda, kamera perlu berjarak sekitar 7–9 unit.
