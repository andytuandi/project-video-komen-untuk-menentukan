#!/usr/bin/env node
// Renders promo.html frame by frame into an MP4 (or PNG stills).
//   node render_promo.js build/promo/promo.json --out build/promo/video.mp4
//   node render_promo.js build/promo/promo.json --stills 2,9.5
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http"), fs = require("fs"), path = require("path");
const { once } = require("events");

const ROOT = path.resolve(__dirname, "../../..");
const tlPath = path.resolve(process.argv[2]);
const args = {};
for (let i = 3; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const tl = JSON.parse(fs.readFileSync(tlPath, "utf8"));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".jpg": "image/jpeg", ".png": "image/png" };

(async () => {
  const server = http.createServer((q, res) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => { console.error("page error:", e.message); process.exitCode = 1; });
  await page.goto(`http://127.0.0.1:${server.address().port}/product/marketing/promo/promo.html`);
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate(t => window.setup(t), tl);
  const decode = d => Buffer.from(d.slice(d.indexOf(",") + 1), "base64");
  if (args.stills) {
    const dir = path.join(path.dirname(tlPath), "stills"); fs.mkdirSync(dir, { recursive: true });
    for (const s of args.stills.split(",")) {
      const f = path.join(dir, `promo_${parseFloat(s).toFixed(2)}.png`);
      fs.writeFileSync(f, decode(await page.evaluate(t => window.renderFrame(t, "image/png"), parseFloat(s)))); console.log(f);
    }
  } else {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(tl.fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(tl.fps), args.out], { stdio: ["pipe", "inherit", "inherit"] });
    const n = Math.ceil(tl.duration * tl.fps);
    for (let f = 0; f < n; f++) {
      const data = await page.evaluate(t => window.renderFrame(t), f / tl.fps);
      if (!ff.stdin.write(decode(data))) await once(ff.stdin, "drain");
      if (f % 150 === 0) console.log(`frame ${f}/${n}`);
    }
    ff.stdin.end(); await once(ff, "close");
  }
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
