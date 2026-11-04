"""Procedural, copyright-free soundtrack for Kerajaan Netizen: a cosy medieval-ish
pluck loop (lute + bass + frame drum + shaker + recorder motif) and cartoon SFX.
Music ducks under the king's voice."""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 100
BEAT = 60 / BPM


def _t(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc):
    return sosfilt(butter(2, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc):
    return sosfilt(butter(2, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def noise(d, seed=0):
    return np.random.default_rng(seed).standard_normal(int(d * SR))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


# ------------------------------------------------------------------ instruments
def pluck(f, d=0.9, bright=1.0):
    t = _t(d)
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.5 + k * 2.2 / bright)) / k ** 1.2 for k in range(1, 9))
    return s * np.minimum(1, t / 0.004)


def bass(f, d):
    t = _t(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)
    return s * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)


def flute(f, d):
    t = _t(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    env = np.minimum(1, t / 0.06) * np.minimum(1, (d - t) / 0.12)
    return (s + 0.04 * lp(noise(d, 9), 3000)) * env


def drum(d=0.5):
    t = _t(d)
    f = 70 + 60 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.2 * lp(noise(d, 3), 900) * np.exp(-t * 30)


def shaker(d=0.09, seed=4):
    t = _t(d)
    return hp(noise(d, seed), 5000) * np.exp(-t * 45)


CHORDS = [  # G  D  Em  C  (I V vi IV), as midi root + triad
    (43, [55, 59, 62, 67]), (38, [54, 57, 62, 66]), (40, [55, 59, 64, 67]), (36, [55, 60, 64, 67]),
]
MOTIF = [(0, 74, 1), (1, 76, 0.5), (1.5, 74, 0.5), (2, 71, 1), (3, 67, 1), (4, 69, 1.5), (5.5, 71, 0.5), (6, 74, 2)]


def music(dur, sections):
    """sections: list of (t0, t1, mode) with mode in full|soft|off."""
    buf = np.zeros(int((dur + 3) * SR))
    lute, low, perc, lead = (np.zeros_like(buf) for _ in range(4))
    nbars = int(dur / (4 * BEAT)) + 2
    rng = np.random.default_rng(11)
    for b in range(nbars):
        root, tri = CHORDS[b % 4]
        t0 = b * 4 * BEAT
        pattern = [0, 1, 2, 3, 2, 1, 2, 3]
        for i, ni in enumerate(pattern):
            add(lute, pluck(midi(tri[ni]), 0.8), t0 + i * BEAT / 2, 0.32 if i % 2 == 0 else 0.24)
        add(low, bass(midi(root), 1.2), t0, 0.55)
        add(low, bass(midi(root + 7), 0.9), t0 + 2 * BEAT, 0.4)
        for i in range(8):
            add(perc, shaker(seed=b * 8 + i), t0 + i * BEAT / 2 + 0.01, 0.08 if i % 2 else 0.12)
        add(perc, drum(), t0, 0.5)
        add(perc, drum(), t0 + 2.5 * BEAT, 0.3)
        add(perc, drum(), t0 + 3 * BEAT, 0.35)
        if b % 4 == 2:
            for (bt, n, ln) in MOTIF:
                add(lead, flute(midi(n + (0 if b % 8 == 2 else 2 * 0)), ln * BEAT * 0.95), t0 + bt * BEAT, 0.16)
    # section gains
    g_perc, g_lead, g_all = (np.ones_like(buf) for _ in range(3))
    for (a, b, mode) in sections:
        i0, i1 = int(a * SR), int(b * SR)
        if mode == "soft":
            g_perc[i0:i1] = 0.0
            g_lead[i0:i1] = 0.5
            g_all[i0:i1] = 0.6
        elif mode == "off":
            g_all[i0:i1] = 0.0
    sm = lambda x: np.convolve(x, np.ones(SR // 5) / (SR // 5), mode="same")
    out = (lute + low + perc * sm(g_perc) + lead * sm(g_lead)) * sm(g_all)
    return lp(out, 9000)


# ------------------------------------------------------------------ sfx
def sfx_whoosh(d=0.45, seed=2):
    t = _t(d)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return norm(bp(noise(d, seed), 500, 3500) * env) * 0.5


def sfx_pop(d=0.18):
    t = _t(d)
    f = 500 + 900 * np.exp(-t * 25)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22))


def sfx_ding(d=1.2):
    t = _t(d)
    s = sum(np.sin(2 * np.pi * 1318 * k * t) * np.exp(-t * (3 + k * 2)) / k for k in (1, 2.76, 5.4))
    return norm(s) * 0.7


def sfx_knock(seed=0):
    d = 0.16
    t = _t(d)
    f = 240 + seed * 13
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 40) + 0.6 * bp(noise(d, seed), 800, 3000) * np.exp(-t * 60)
    return norm(s)


def sfx_hammering(d, rate=4.2):
    buf = np.zeros(int(d * SR) + SR)
    n = int(d * rate)
    for i in range(n):
        add(buf, sfx_knock(i % 5), i / rate + (0.03 if i % 3 == 1 else 0), 0.55 + 0.25 * (i % 2))
    return buf[:int(d * SR)]


def sfx_fanfare(d=1.6):
    t = _t(d)
    out = np.zeros(len(t))
    for i, (n, s, ln) in enumerate([(67, 0, 0.18), (67, 0.2, 0.12), (72, 0.34, 0.9)]):
        tt = _t(ln)
        f = midi(n)
        tone = sum(np.sin(2 * np.pi * f * k * tt) / k for k in range(1, 8))
        tone = lp(tone, 3500) * np.minimum(1, tt / 0.02) * np.minimum(1, (ln - tt) / 0.08)
        add(out, tone, s)
    return norm(out) * 0.8


def sfx_chirp(d=0.35, up=True):
    t = _t(d)
    f = (900 + 900 * (t / d)) if up else (1700 - 700 * (t / d))
    s = np.sin(2 * np.pi * np.cumsum(f + 120 * np.sin(2 * np.pi * 30 * t)) / SR)
    return norm(s * np.sin(np.pi * t / d)) * 0.6


def sfx_fire_burst(d=1.2):
    t = _t(d)
    env = np.minimum(1, t / 0.08) * np.exp(-t * 2.5)
    return norm(lp(noise(d, 6), 1600) * env + 0.3 * bp(noise(d, 7), 2000, 6000) * env)


def sfx_crackle(d, seed=8):
    rng = np.random.default_rng(seed)
    buf = 0.12 * lp(noise(d, seed), 500)
    for _ in range(int(d * 9)):
        add(buf, bp(noise(0.03, int(rng.integers(1e6))), 1500, 6000) * np.exp(-_t(0.03) * 120), rng.random() * d, 0.4 + rng.random() * 0.4)
    return buf


def sfx_crickets(d):
    t = _t(d)
    chirp = (np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.2)) * ((t * 1.6) % 1 < 0.28)
    chirp2 = (np.sin(2 * np.pi * 4700 * t) * (np.sin(2 * np.pi * 31 * t) > 0.3)) * (((t + 0.35) * 1.3) % 1 < 0.22)
    return (chirp + 0.7 * chirp2) * 0.12


def sfx_cart(d):
    t = _t(d)
    rumble = lp(noise(d, 12), 180) * 0.6
    clack = ((t * 3.1) % 1 < 0.03) * bp(noise(d, 13), 300, 1500) * 2.0
    return norm(rumble + clack) * 0.5


def sfx_bonk(d=0.35):
    t = _t(d)
    f = 320 * np.exp(-t * 3)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12))


def sfx_wind(d):
    return norm(lp(noise(d, 21), 600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * _t(d)))) * 0.35


def sfx_snore(d):
    t = _t(d)
    env = np.clip(np.sin(2 * np.pi * t / 2.4), 0, 1) ** 2
    return norm(lp(noise(d, 30), 300) * env * (1 + 0.5 * np.sin(2 * np.pi * 35 * t))) * 0.4


ONESHOT = {"whoosh": sfx_whoosh, "pop": sfx_pop, "ding": sfx_ding, "fanfare": sfx_fanfare, "chirp": sfx_chirp,
           "chirp_down": lambda: sfx_chirp(0.4, False), "fire": sfx_fire_burst, "bonk": sfx_bonk, "knock": lambda: sfx_knock(1)}
LOOPS = {"hammering": sfx_hammering, "crackle": sfx_crackle, "crickets": sfx_crickets, "cart": sfx_cart,
         "wind": sfx_wind, "snore": sfx_snore}
GAIN = {"whoosh": 0.35, "pop": 0.45, "ding": 0.4, "fanfare": 0.55, "chirp": 0.5, "chirp_down": 0.5, "fire": 0.7,
        "bonk": 0.5, "knock": 0.6, "hammering": 0.45, "crackle": 0.5, "crickets": 0.55, "cart": 0.4, "wind": 0.3, "snore": 0.6}


def _load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return x / 32768.0


def render_mix(tl, clips, out_path):
    dur = tl["duration"] + 0.6
    n = int(dur * SR)
    voice = np.zeros(n)
    for c in clips:
        add(voice, _load(c["path"]), c["t"], 1.0)
    sfx = np.zeros(n)
    for s in tl.get("sfx", []):
        name = s["name"]
        if name in LOOPS:
            sig = LOOPS[name](max(0.2, s["len"]))
            k = int(min(0.25, s["len"] / 3) * SR)
            if k:
                sig[:k] *= np.linspace(0, 1, k)
                sig[-k:] *= np.linspace(1, 0, k)
        else:
            sig = ONESHOT[name]()
        add(sfx, sig, s["t"], GAIN.get(name, 0.5) * s.get("gain", 1.0))
    mus = music(dur, tl.get("musicSections", []))[:n]
    # duck under narration
    env = np.abs(voice)
    win = SR // 8
    env = np.convolve(env, np.ones(win) / win, mode="same")
    duck = 1 - 0.55 * np.clip(env / 0.03, 0, 1)
    duck = np.convolve(duck, np.ones(SR // 6) / (SR // 6), mode="same")
    mix = voice * 1.0 + sfx * 0.9 + mus * 0.22 * duck
    fade = int(0.8 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = norm(mix, 0.95)
    wavfile.write(out_path, SR, (mix * 32767).astype(np.int16))
