# Voices

Free Microsoft neural voices through `edge-tts` (needs internet: Network access = Full).

```json
"voices": { "raja": { "voice": "id-ID-ArdiNeural", "rate": "+8%", "pitch": "-4Hz", "fx": "royal" } }
```

| Want | Setting |
|---|---|
| Indonesian king (default) | `id-ID-ArdiNeural`, `fx: "royal"` (deeper, bigger voice + small hall echo) |
| Indonesian queen / female narrator | `id-ID-GadisNeural`, `pitch: "-2Hz"`, `fx: "royal"` optional |
| Plain voice (no effect) | remove `fx` |
| Faster / slower | `rate`: "+15%" faster, "-5%" slower |
| Higher / lower | `pitch`: "+5Hz" / "-8Hz" |
| Malay | `ms-MY-OsmanNeural` / `ms-MY-YasminNeural` |
| English | `en-US-AndrewNeural`, `en-US-GuyNeural`, `en-US-AvaNeural`, `en-GB-RyanNeural` |
| Other languages | any `xx-XX-NameNeural` voice from `edge-tts --list-voices` |

A second speaker: add another key (e.g. `"naga": {...}`) and set `"speaker": "naga"` on a beat.
Write numbers as words in `say`. Captions copy the `say` text exactly.
