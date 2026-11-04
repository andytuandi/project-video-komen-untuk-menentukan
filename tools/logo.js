#!/usr/bin/env node
// Kerajaan Netizen logo: renders the King + Kompor with the episode engine, then composes a
// crowned round badge with a ribbon. Outputs assets/logo/logo.png (transparent) and profile.png.
//   node tools/logo.js [--title "KERAJAAN NETIZEN"] [--out assets/logo] [--leader '{"mustache":false,"hair":"bun"}']
const { chromium } = require("playwright");
const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const TITLE = (args.title || "KERAJAAN NETIZEN").toUpperCase();
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf" };

const tl = {
  fps: 30, W: 1080, H: 1920, duration: 5, series: "Kerajaan Netizen", day: 0, handle: "@kerajaannetizen.idn", ui: {},
  population: 1, popKeys: [], seed: 7, leader: args.leader ? JSON.parse(args.leader) : {}, captions: [], popups: [], fades: [], sfx: [], musicSections: [],
  clock: [{ t0: 0, t1: 0, m0: 10 * 60, m1: 10 * 60, label: "" }], plazas: [], reserved: [],
  props: [],
  beats: [{ i: 0, start: 0, end: 5, words: [] }],
  shots: [{ start: 0, end: 5, beats: [0],
    cam: { from: { pos: [0.35, 1.75, 7.2], look: [0.35, 1.35, 0], fov: 30 }, to: { pos: [0.35, 1.75, 7.2], look: [0.35, 1.35, 0], fov: 30 }, drift: 0 },
    actors: [
      { id: "king", type: "king", at: [0, 0], face: 0, anim: "wave", phase: 0.18 },
      { id: "kompor", type: "dragon", at: [0.95, -0.4], y: 0.95, face: -25, anim: "look", phase: 0.1, scale: 0.85 },
    ] }],
};

const serve = () => new Promise(r => {
  const s = http.createServer((q, res) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  s.listen(0, "127.0.0.1", () => r(s));
});

(async () => {
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/engine/renderer/index.html`);
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate(t => window.setup(t), tl);
  const out = await page.evaluate(async (TITLE) => {
    const raw = new Image(); raw.src = window.renderRaw(0.6); await raw.decode();
    const S = 2048, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    const cx = S / 2, cy = S * 0.53, R = S * 0.36;
    // crown above the badge
    const crown = (y) => {
      g.save(); g.translate(cx, y);
      const w = R * 1.05, h = R * 0.55;
      g.beginPath(); g.moveTo(-w / 2, h * 0.55); g.lineTo(-w / 2, -h * 0.35); g.lineTo(-w * 0.25, h * 0.05); g.lineTo(0, -h * 0.6);
      g.lineTo(w * 0.25, h * 0.05); g.lineTo(w / 2, -h * 0.35); g.lineTo(w / 2, h * 0.55); g.closePath();
      g.lineJoin = "round"; g.lineWidth = 34; g.strokeStyle = "#3b2410"; g.stroke();
      const gr = g.createLinearGradient(0, -h, 0, h); gr.addColorStop(0, "#ffe27a"); gr.addColorStop(1, "#e2a90f");
      g.fillStyle = gr; g.fill();
      [[-w / 2, -h * 0.35], [0, -h * 0.6], [w / 2, -h * 0.35]].forEach(([x, yy]) => {
        g.beginPath(); g.arc(x, yy, 34, 0, 7); g.fillStyle = "#e63946"; g.fill(); g.lineWidth = 14; g.stroke();
      });
      g.restore();
    };
    crown(cy - R * 1.02);
    // gold ring
    g.beginPath(); g.arc(cx, cy, R + 70, 0, 7); g.fillStyle = "#3b2410"; g.fill();
    const ring = g.createLinearGradient(0, cy - R, 0, cy + R); ring.addColorStop(0, "#ffe27a"); ring.addColorStop(1, "#d99a0b");
    g.beginPath(); g.arc(cx, cy, R + 52, 0, 7); g.fillStyle = ring; g.fill();
    g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.fillStyle = "#3b2410"; g.fill();
    // 3D portrait clipped to the circle (crop the middle of the vertical frame)
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
    const sw = 1000, sh = 1000, sx = 40, sy = 400;
    g.drawImage(raw, sx, sy, sw, sh, cx - R, cy - R, R * 2, R * 2);
    g.restore();
    // ribbon
    const ry = cy + R * 0.8, rw = R * 2.25, rh = 230;
    const tail = (sd) => {
      g.beginPath(); const x0 = cx + sd * rw / 2;
      g.moveTo(x0 - sd * 40, ry - rh * 0.2); g.lineTo(x0 + sd * 120, ry - rh * 0.2); g.lineTo(x0 + sd * 65, ry + rh * 0.2);
      g.lineTo(x0 + sd * 120, ry + rh * 0.6); g.lineTo(x0 - sd * 40, ry + rh * 0.6); g.closePath();
      g.fillStyle = "#8e1f1a"; g.fill(); g.lineWidth = 26; g.strokeStyle = "#3b2410"; g.lineJoin = "round"; g.stroke();
    };
    tail(-1); tail(1);
    g.beginPath(); g.moveTo(cx - rw / 2, ry - rh / 2); g.quadraticCurveTo(cx, ry - rh / 2 - 70, cx + rw / 2, ry - rh / 2);
    g.lineTo(cx + rw / 2, ry + rh / 2); g.quadraticCurveTo(cx, ry + rh / 2 - 70, cx - rw / 2, ry + rh / 2); g.closePath();
    const rg = g.createLinearGradient(0, ry - rh, 0, ry + rh); rg.addColorStop(0, "#e74c3c"); rg.addColorStop(1, "#b0212b");
    g.fillStyle = rg; g.fill(); g.lineWidth = 30; g.strokeStyle = "#3b2410"; g.stroke();
    // text following the ribbon curve
    const txt = TITLE;
    let fs = 140;
    g.font = `700 ${fs}px Fredoka`;
    while (g.measureText(txt).width * 1.04 > rw * 0.9 && fs > 60) { fs -= 4; g.font = `700 ${fs}px Fredoka`; }
    g.textAlign = "center"; g.textBaseline = "middle";
    const total = g.measureText(txt).width * 1.04;
    let x = cx - total / 2;
    for (const ch of txt) {
      const w = g.measureText(ch).width * 1.04, mx = x + w / 2, u = (mx - cx) / (rw / 2);
      const y = ry - 30 * (1 - u * u) + 4, rot = u * 0.12;
      g.save(); g.translate(mx, y); g.rotate(rot);
      g.lineWidth = 26; g.strokeStyle = "#3b2410"; g.lineJoin = "round"; g.strokeText(ch, 0, 0);
      g.fillStyle = "#fff8e1"; g.fillText(ch, 0, 0); g.restore();
      x += w;
    }
    const logo = c.toDataURL("image/png");
    // profile picture: square, solid background, badge scaled to survive Instagram's circle crop
    const p = document.createElement("canvas"); p.width = p.height = 1080;
    const pg = p.getContext("2d");
    const bg = pg.createRadialGradient(540, 470, 60, 540, 540, 760); bg.addColorStop(0, "#3a2d6b"); bg.addColorStop(1, "#14122b");
    pg.fillStyle = bg; pg.fillRect(0, 0, 1080, 1080);
    const lim = new Image(); lim.src = logo; await lim.decode();
    const k = 0.86; pg.drawImage(lim, 540 - 540 * k, 540 - 540 * k - 10, 1080 * k, 1080 * k);
    return { logo, profile: p.toDataURL("image/png") };
  }, TITLE);
  const dir = path.resolve(ROOT, args.out || path.join("assets", "logo"));
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(out)) {
    const f = path.join(dir, `${k}.png`); fs.writeFileSync(f, Buffer.from(v.split(",")[1], "base64")); console.log(f);
  }
  await browser.close(); server.close();
})();
