# Episode file format (`episodes/<world>/dayNN.json`)

One JSON file = one finished vertical video (1080x1920, 30 fps). `python3 engine/build.py <file> --check` validates it.
Look at `episodes/contoh/day01.json` for a complete, working example.

## Top level

```json
{
  "series": "Kerajaan Kita",            // world name; also used for the file name kerajaan-kita-dayNN.mp4
  "day": 1,                              // episode number, shown as "DAY 1" in the HUD
  "handle": "@akunkamu",                 // watermark top-right + Instagram footer
  "ui": { "day": "DAY", "popBadge": true },   // label of the day badge; popBadge = "👥 N RAKYAT" under the clock
  "leader": { "shirt": "#6b2fa0", "cape": "#b0212b" },  // look of the "king" actor (see ASET.md: queen, colours)
  "population": 1,                       // follower count at the start of the video
  "popKeys": [{ "beat": 0, "at": 0.5, "v": 581, "ramp": 1.6 }],  // optional: count up to v (ramp = seconds)
  "voices": { "raja": { "voice": "id-ID-ArdiNeural", "rate": "+8%", "pitch": "-4Hz", "fx": "royal" } },
  "gap": 0.2,                            // seconds of silence after every line
  "plazas": [[x, z, radius]],            // extra dirt circles (town squares) under new buildings
  "reserved": [[x0, z0, x1, z1]],        // rectangles where no random trees may grow (keep building sites clear)
  "cover": { "frame_at": 22.0, "top": "DAY 1", "lines": ["KERAJAAN INI", "DIATUR NETIZEN"], "bottom": "Follow = jadi rakyat" },
  "props": [ ... ],                      // buildings/objects in the world (below)
  "beats": [ ... ]                       // the script, in order (below)
}
```

## Props (world objects)

```json
{ "id": "tent", "type": "tent", "at": [-5.5, -6], "rot": 25,
  "build": { "beat": 9, "from": 0.04, "to": 1.0 },     // optional: pops in piece by piece during beat 9
  "show": 3, "showAt": 0.8, "hide": 12,                 // optional: appear/disappear at a beat (fraction showAt)
  "params": { ... } }
```
`at` is `[x, z]` on the ground (y is up). `rot` in degrees. Types and params: see `docs/ASET.md`.
A prop without `build`/`show` exists for the whole video. Things built in earlier days must be listed again
(without `build`) in every later episode, at the same position, so the kingdom keeps growing.

Special params: `sign` `text` may contain `{pop}` (live follower count). `campfire` `lit: {beat, at}`.
`paddy` `grow`/`ripe: {beat, from, to}` (rice grows tall, then turns gold) at the prop level next to `build`.

## Beats (script lines)

```json
{
  "say": "Kamu follow, kamu jadi rakyat.",      // narration (the leader's voice). Captions are made from it.
  "speaker": "raja",                           // optional, key in "voices" (default "raja")
  "dur": 2.0,                                  // only for beats without "say": length in seconds
  "pre": 0.2, "pause": 0.6,                    // silence before / extra silence after the line
  "clock": "07:30",                            // real-time clock in the HUD …
  "clock": ["13:00", "17:00"],                 // … or a time-lapse across the beat (sky + sun follow it)
  "clockLabel": "x24 TIME-LAPSE",              // optional label override (e.g. "x9999 TIME-LAPSE" as a joke)
  "transition": "white",                       // "white" flash, "fade" (black dip), default = whoosh cut
  "popup": { "text": "FOLLOW = RAKYAT", "icon": "follow", "word": "follow", "color": "#e63946", "dur": 2.6, "y": 470 },
  "sfx": [["fanfare", 0.02], ["bonk", 0.7, 0.6]],   // [name, fraction of beat, gain]
  "loops": ["hammering", "crickets"],          // sound beds for the whole beat
  "music": "soft",                             // "soft" = no drums (night), "off"
  "end": { "title": "KOMEN DI BAWAH", "q": "Besok bangun apa?", "chips": ["Pasar?", "Istana?"], "follow": "FOLLOW = JADI RAKYAT" },
  "shot": { "cam": { ... }, "actors": [ ... ] } // new camera shot; omit to continue the previous shot
}
```
Popup icons: `follow`, `comment`, `gift`, `crown`. Popup `y` default 470 (top third); use ~1420 when the
subject is in the upper half (e.g. a notice board).

SFX one-shots: `whoosh pop ding fanfare chirp chirp_down fire bonk knock`.
Loops: `hammering crackle crickets cart wind snore`.

### Camera

```json
"cam": { "from": { "pos": [x, y, z], "look": [x, y, z], "fov": 44 },
         "to":   { "pos": [x, y, z], "look": [x, y, z], "fov": 42 },
         "ease": "inout" | "linear" | "out", "drift": 0.06 }
```
The frame is tall and **narrow**: at distance d the visible width is only ≈ 0.47·d (fov 45).
One person + one object needs d ≈ 7–9. A face close-up d ≈ 3–4 (look at y ≈ 1.6).
Captions sit at 64 % of the height: keep faces above that line (aim `look` a little lower than the face to
move the subject up). Use slow pushes (from → to moves 0.5–1 unit). Time-lapses: high aerial, `ease: "linear"`, `drift: 0`.
A camera looking toward −z has +x on the right of the screen; looking toward +z, +x is on the LEFT.

### Actors

```json
{ "id": "king", "type": "king", "at": [2.5, -0.6], "y": 0.92, "face": 15,
  "anim": "talk", "anims": [[0.5, "raise"]], "talk": true,
  "path": [[0, 30], [0, 13]], "move": [0, 0.75], "faceEnd": 180, "smooth": false,
  "dwell": 0.3, "lookAt": [x, z], "hammer": true, "pull": true,
  "name": "@username", "title": "Penasihat Raja", "scale": 1.0, "phase": 0.0 }
```
- `face`: degrees. 0 faces +z (toward a camera at larger z), 180 faces −z. Moving actors face their direction.
- `path` + `move` (fractions of the shot): walk along the points. `dwell`: stop at every point and do `anim`
  there (time-lapse workers). `lookAt` turns a standing actor toward a point.
- `anims`: `[[fraction, name], …]` switches animation during the shot. `talk: true` adds talking gestures.
- `name`/`title`: floating name tag (use for commenters, supporters, ranks).
- Same `id` in different shots = same character (keeps its look).
- `crowd` actor: `count` (≤ 60), `seed`, `mode` (`arrive` | `stand` | `cheer` | `work`), `show` (how many),
  `region` [x0,z0,x1,z1], `avoid` [[rect], …], `lookAt`, `sites` [[x,z,r], …] for work, `workAnim` ("plant"),
  `fromZ`, `spread`, `travel` for arrive. Use the same `seed` in every shot and episode.

Animations (people): `idle walk talk present wave raise point shrug hammer sit sigh lookup plant stuck`.
Dragon: `hop fly fire peek look sleep` (+ `fireAt`, `fireLen`, `ground: true`, `peekAt`). Buffalo/cart walk when moving.

## Length & rhythm

12–16 beats, 110–150 spoken words → 60–80 s. New shot every 3–6 s. One time-lapse building sequence per
episode (`clock` range + `loops: ["hammering"]` + a prop with `build` in that beat, `pause` 1.5–3 s so it can play).
