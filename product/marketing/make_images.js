// Renders the Lynk.id product images (1080x1080) from HTML templates.
//   node product/marketing/make_images.js
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const HERE = __dirname, FONTS = path.resolve(HERE, "../studio-animasi-netizen/assets/fonts");
const css = `
@font-face { font-family: Nunito; src: url(file://${FONTS}/Nunito.ttf); font-weight: 200 1000; }
@font-face { font-family: Fredoka; src: url(file://${FONTS}/Fredoka.ttf); font-weight: 300 700; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1080px; height: 1080px; overflow: hidden; font-family: Nunito; color: #fff;
  background: radial-gradient(circle at 50% 25%, #4a37a0 0%, #22195a 45%, #120e2e 100%); position: relative; }
.title { font-family: Fredoka; font-weight: 700; color: #ffd23f; text-shadow: 0 6px 0 #3b2410, 0 10px 30px #0008; letter-spacing: 1px; }
.pill { display: inline-block; background: #e63946; border-radius: 40px; padding: 10px 26px; font-weight: 900; font-size: 30px; box-shadow: 0 6px 0 #8e1f1a; }
.phone { position: absolute; width: 250px; height: 444px; border-radius: 30px; overflow: hidden; border: 7px solid #0d0b22; box-shadow: 0 20px 40px #0009; background: #000; }
.phone img { width: 100%; height: 100%; object-fit: cover; }
.chip { display: inline-flex; align-items: center; gap: 10px; background: #ffffff17; border: 2px solid #ffffff38; border-radius: 40px; padding: 10px 20px; font-weight: 800; font-size: 27px; }
.card { background: #ffffff12; border: 2px solid #ffffff2e; border-radius: 28px; padding: 22px 26px; }
.big { font-family: Fredoka; font-weight: 700; }
.y { color: #ffd23f; }
`;
const img = f => `file://${path.join(HERE, "img", f)}`;
const slides = {
  "01-thumbnail": `
  <div style="position:absolute;top:46px;left:0;right:0;text-align:center">
    <span class="pill">🔥 PAKET SIAP PAKAI</span>
    <div class="title" style="font-size:96px;line-height:.98;margin-top:22px">STUDIO ANIMASI<br>NETIZEN</div>
    <div style="font-size:35px;font-weight:900;margin-top:16px">Bikin Konten Animasi 3D yang <span class="y">Diatur Penonton</span></div>
    <div style="font-size:29px;font-weight:700;opacity:.85;margin-top:6px">Cukup ngobrol sama AI · Tanpa edit video · Tanpa coding</div>
  </div>
  <div class="phone" style="left:70px;top:520px;transform:rotate(-8deg)"><img src="${img("f-rakyat.jpg")}"></div>
  <div class="phone" style="left:415px;top:470px;width:270px;height:480px;z-index:2"><img src="${img("f-masjid.jpg")}"></div>
  <div class="phone" style="left:760px;top:520px;transform:rotate(8deg)"><img src="${img("f-panen.jpg")}"></div>
  <div style="position:absolute;bottom:26px;left:0;right:0;text-align:center;z-index:3">
    <span class="chip">👥 Follow = rakyat</span> <span class="chip">💬 Komen = dibangun</span> <span class="chip">🎁 Gift = pangkat</span>
  </div>`,
  "02-isi-paket": `
  <div style="padding:60px 70px">
    <div class="title" style="font-size:66px">APA YANG KAMU DAPAT? 🎁</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:40px;font-size:28px;font-weight:800;line-height:1.3">
      <div class="card">🏰 <span class="y">Studio animasi 3D</span><br><span style="font-weight:600;font-size:24px">Gerbang, istana tenda, masjid, gereja, pos prajurit, sawah, rakyat 60 orang, raja/ratu, naga, kerbau…</span></div>
      <div class="card">🤖 <span class="y">"Otak" untuk Claude AI</span><br><span style="font-weight:600;font-size:24px">Claude tahu cara bikin video: tulis cerita, gerakkan kamera, isi suara, render.</span></div>
      <div class="card">🎙️ <span class="y">Suara raja + caption + musik</span><br><span style="font-weight:600;font-size:24px">Narasi bahasa Indonesia, teks otomatis, musik & SFX bebas copyright.</span></div>
      <div class="card">✉️ <span class="y">Prompt siap salin</span><br><span style="font-weight:600;font-size:24px">Tinggal copy–paste. Mulai, Day berikutnya, ubah sesuatu, kalau error.</span></div>
      <div class="card">📖 <span class="y">PDF panduan super gampang</span><br><span style="font-weight:600;font-size:24px">Bahasa anak SD, langkah bernomor, ada gambar tombol yang diklik.</span></div>
      <div class="card">👑 <span class="y">Logo + bio + sistem pangkat</span><br><span style="font-weight:600;font-size:24px">Bikin logo kerajaanmu sendiri, template bio, dan strategi biar orang follow.</span></div>
    </div>
  </div>`,
  "03-cara-kerja": `
  <div style="padding:60px 60px;text-align:center">
    <div class="title" style="font-size:70px">CUMA 3 LANGKAH ✨</div>
    <div style="display:flex;gap:26px;margin-top:46px;text-align:left">
      ${[["1", "📦", "Upload studio", "Masukkan isi ZIP ke GitHub (gratis). Cukup sekali, ±30 menit, dipandu PDF."],
         ["2", "✉️", "Kirim 1 pesan", "Tempel prompt ke Claude + kasih nama kerajaan & akun IG-mu."],
         ["3", "🎬", "Video jadi!", "Claude kirim video, cover & caption. Tinggal posting ke Reels."]]
        .map(([n, e, h, t]) => `<div class="card" style="flex:1;padding:26px">
          <div style="width:74px;height:74px;border-radius:50%;background:#ffd23f;color:#1d1b3a;font-family:Fredoka;font-size:46px;display:flex;align-items:center;justify-content:center;border:5px solid #3b2410">${n}</div>
          <div style="font-size:58px;margin-top:16px">${e}</div>
          <div class="big" style="font-size:38px;margin-top:6px">${h}</div>
          <div style="font-size:26px;font-weight:600;margin-top:8px;line-height:1.35;opacity:.92">${t}</div></div>`).join("")}
    </div>
    <div class="card" style="margin-top:34px;font-size:30px;font-weight:800">🔁 Besoknya? Kirim <span class="y">jumlah follower + screenshot komentar</span>.<br>Claude langsung bikin Day berikutnya.</div>
  </div>
  ${["kerajaan-netizen-day01-cover.jpg", "kerajaan-netizen-day02-cover.jpg", "f-panen.jpg"]
    .map((f, i) => `<div class="phone" style="left:${120 + i * 300}px;top:805px;width:240px;height:426px;transform:rotate(${(i - 1) * 4}deg)"><img src="${img(f)}"></div>`).join("")}`,
  "04-contoh-hasil": `
  <div style="padding:50px 50px 0;text-align:center">
    <div class="title" style="font-size:64px">CONTOH HASILNYA 👀</div>
    <div style="font-size:28px;font-weight:800;margin-top:10px;opacity:.9">Semua frame ini dibuat 100% oleh studio ini</div>
  </div>
  ${[["f-follow.jpg", 50, 190], ["f-timelapse.jpg", 300, 190], ["f-lumpur.jpg", 550, 190], ["f-rakyat.jpg", 800, 190]]
    .map(([f, x, y]) => `<div class="phone" style="left:${x}px;top:${y}px;width:230px;height:409px"><img src="${img(f)}"></div>`).join("")}
  <div style="position:absolute;left:50px;right:50px;top:640px;display:grid;grid-template-columns:1fr 1fr;gap:18px;font-size:27px;font-weight:800">
    <div class="card">⏱️ Timelapse membangun + jam x24</div>
    <div class="card">👥 Papan RAKYAT naik sesuai follower</div>
    <div class="card">🏷️ Nama pengusul muncul di video</div>
    <div class="card">🌙 Langit pagi → siang → malam</div>
    <div class="card" style="grid-column:span 2;text-align:center">📱 1080×1920 · 60–80 detik · siap Reels / TikTok / Shorts</div>
  </div>`,
  "05-cocok-untuk": `
  <div style="padding:60px 70px">
    <div class="title" style="font-size:64px">COCOK BUAT KAMU YANG… 🙋</div>
    <div style="margin-top:36px;font-size:31px;font-weight:800;line-height:1.35;display:grid;gap:18px">
      <div class="card">✅ Mau bikin akun konten baru yang <span class="y">cepat dapat follower</span></div>
      <div class="card">✅ <span class="y">Nggak bisa</span> animasi, edit video, apalagi coding</div>
      <div class="card">✅ Mau konten <span class="y">tiap hari</span> tanpa mikir ide (ide datang dari komentar!)</div>
      <div class="card">✅ Mau <span class="y">monetisasi</span> lewat gift & dukungan penonton</div>
    </div>
    <div class="card" style="margin-top:26px;font-size:25px;font-weight:700;background:#ffd23f22;border-color:#ffd23f88">
      ⚠️ Butuh: langganan <b>Claude Pro/Max</b> (berbayar, di claude.ai) + akun <b>GitHub</b> gratis + laptop untuk setup pertama.
    </div>
    <div class="card" style="margin-top:20px;font-size:25px;font-weight:700;line-height:1.45">
      <span class="big y" style="font-size:32px">🎁 BONUS</span><br>
      • 12 ide nama kerajaan + 16 ide bangunan dari komentar<br>
      • Alat hitung voting komentar otomatis<br>
      • Pembuat logo & foto profil kerajaanmu
    </div>
  </div>`,
};
(async () => {
  const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  const out = path.join(HERE, "lynk"); fs.mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(slides)) {
    const f = path.join(out, `_${name}.html`);
    fs.writeFileSync(f, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
    await p.goto("file://" + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${name}.jpg`), type: "jpeg", quality: 92 });
    fs.unlinkSync(f); console.log(name);
  }
  await b.close();
})();
