#!/usr/bin/env node
// Deterministic frame renderer: serves the repo over localhost, loads engine/renderer/index.html in headless Chromium,
// calls window.renderFrame(t) for every frame and pipes JPEGs into ffmpeg.
// Frames are split across N browser workers, then the segments are concatenated.
//   node engine/render.js --timeline build/x/timeline.json --out build/x/video.mp4 --workers 4
//   node engine/render.js --timeline ... --stills 1,12.5 --outdir build/x/stills
//   node engine/render.js --timeline ... --cover out/cover.jpg
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { once } = require("events");

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
const tl = JSON.parse(fs.readFileSync(args.timeline, "utf8"));
const fps = tl.fps || 30;
const http = require("http");
const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".json": "application/json" };
let server, page_url;
function serve() {
  // modules + importmap need http (file:// blocks ES module imports)
  server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => { page_url = `http://127.0.0.1:${server.address().port}/engine/renderer/index.html`; r(); }));
}

async function openPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => { console.error("page error:", e.message); process.exitCode = 1; });
  page.on("console", m => { if (m.type() === "error") console.error("console:", m.text()); });
  await page.goto(page_url);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  await page.evaluate(t => window.setup(t), tl);
  return { browser, page };
}

const decode = d => Buffer.from(d.slice(d.indexOf(",") + 1), "base64");

async function renderRange(f0, f1, outFile, label) {
  const { browser, page } = await openPage();
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps),
    "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-maxrate", "9M", "-bufsize", "18M",
    "-pix_fmt", "yuv420p", "-r", String(fps), outFile], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const data = await page.evaluate(t => window.renderFrame(t), f / fps);
    if (!ff.stdin.write(decode(data))) await once(ff.stdin, "drain");
    if ((f - f0) % 150 === 0) console.log(`[${label}] frame ${f - f0}/${f1 - f0} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await once(ff, "close");
  await browser.close();
}

async function main() {
  await serve();
  if (args.stills) {
    fs.mkdirSync(args.outdir, { recursive: true });
    const { browser, page } = await openPage();
    for (const s of args.stills.split(",")) {
      const data = await page.evaluate(t => window.renderFrame(t, "image/png"), parseFloat(s));
      const f = path.join(args.outdir, `still_${parseFloat(s).toFixed(2)}.png`);
      fs.writeFileSync(f, decode(data)); console.log(f);
    }
    await browser.close();
    return;
  }
  if (args.cover) {
    const { browser, page } = await openPage();
    const data = await page.evaluate(t => window.renderCover(t), tl.cover.frame_at || 1);
    fs.writeFileSync(args.cover, decode(data)); console.log(args.cover);
    await browser.close();
    return;
  }
  const start = parseFloat(args.start || 0), end = args.end ? parseFloat(args.end) : tl.duration;
  const F0 = Math.round(start * fps), F1 = Math.ceil(end * fps);
  const n = Math.max(1, parseInt(args.workers || "4", 10));
  const per = Math.ceil((F1 - F0) / n);
  const dir = path.dirname(args.out);
  const segs = [];
  const jobs = [];
  for (let k = 0; k < n; k++) {
    const a = F0 + k * per, b = Math.min(F1, a + per);
    if (a >= b) break;
    const seg = path.join(dir, `seg_${k}.mp4`);
    segs.push(seg);
    jobs.push(renderRange(a, b, seg, `w${k}`));
  }
  await Promise.all(jobs);
  const list = path.join(dir, "segs.txt");
  fs.writeFileSync(list, segs.map(s => `file '${path.resolve(s)}'`).join("\n"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", args.out]);
  segs.forEach(s => fs.unlinkSync(s)); fs.unlinkSync(list);
  console.log("video:", args.out);
}

main().then(() => server.close()).catch(e => { console.error(e); process.exit(1); });
