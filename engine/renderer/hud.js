// 2D overlay: DAY badge, time-lapse clock, watermark, social handles, captions, popups, end card.
const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOutBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function outlined(g, text, x, y, o = {}) {
  g.font = o.font || "900 64px Nunito";
  g.textAlign = o.align || "center"; g.textBaseline = "middle";
  g.lineJoin = "round";
  if (o.shadow !== false) { g.shadowColor = "rgba(0,0,0,0.45)"; g.shadowBlur = 10; g.shadowOffsetY = 4; }
  g.lineWidth = o.stroke ?? 12; g.strokeStyle = o.strokeColor || "#141414";
  if (g.lineWidth > 0) g.strokeText(text, x, y);
  g.shadowColor = "transparent";
  g.fillStyle = o.color || "#ffffff"; g.fillText(text, x, y);
}

function hhmm(m) {
  const mm = Math.floor(m) % (24 * 60);
  return String(Math.floor(mm / 60)).padStart(2, "0") + ":" + String(mm % 60).padStart(2, "0");
}

// ---------------------------------------------------------------- icons
function icon(g, kind, x, y, s) {
  g.save(); g.translate(x, y);
  if (kind === "tiktok") {
    g.fillStyle = "#111"; g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = `900 ${s * 0.7}px Nunito`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("♪", 0, 2);
  } else if (kind === "ig") {
    const gr = g.createLinearGradient(-s / 2, s / 2, s / 2, -s / 2); gr.addColorStop(0, "#feda75"); gr.addColorStop(0.5, "#d62976"); gr.addColorStop(1, "#4f5bd5");
    g.fillStyle = gr; rr(g, -s / 2, -s / 2, s, s, s * 0.28); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = s * 0.09; rr(g, -s * 0.3, -s * 0.3, s * 0.6, s * 0.6, s * 0.17); g.stroke();
    g.beginPath(); g.arc(0, 0, s * 0.13, 0, 7); g.stroke();
  } else if (kind === "yt") {
    g.fillStyle = "#ff0000"; rr(g, -s / 2, -s * 0.35, s, s * 0.7, s * 0.2); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(-s * 0.12, -s * 0.17); g.lineTo(s * 0.2, 0); g.lineTo(-s * 0.12, s * 0.17); g.fill();
  } else if (kind === "fb") {
    g.fillStyle = "#1877f2"; g.beginPath(); g.arc(0, 0, s / 2, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = `900 ${s * 0.75}px Nunito`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("f", 1, 3);
  } else if (kind === "follow") {
    g.fillStyle = "#fff"; g.beginPath(); g.arc(-s * 0.1, -s * 0.15, s * 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(-s * 0.1, s * 0.28, s * 0.33, s * 0.22, 0, Math.PI, 0); g.fill();
    g.fillRect(s * 0.22, -s * 0.05, s * 0.3, s * 0.09); g.fillRect(s * 0.325, -s * 0.2, s * 0.09, s * 0.39);
  } else if (kind === "comment") {
    g.fillStyle = "#fff"; rr(g, -s * 0.42, -s * 0.34, s * 0.84, s * 0.56, s * 0.2); g.fill();
    g.beginPath(); g.moveTo(-s * 0.2, s * 0.18); g.lineTo(-s * 0.3, s * 0.42); g.lineTo(0, s * 0.2); g.fill();
    g.fillStyle = "#2a9d8f"; [-0.18, 0, 0.18].forEach(dx => { g.beginPath(); g.arc(dx * s, -s * 0.06, s * 0.055, 0, 7); g.fill(); });
  } else if (kind === "gift") {
    g.fillStyle = "#fff"; g.fillRect(-s * 0.38, -s * 0.12, s * 0.76, s * 0.5); g.fillRect(-s * 0.44, -s * 0.28, s * 0.88, s * 0.18);
    g.fillStyle = "#e63946"; g.fillRect(-s * 0.06, -s * 0.28, s * 0.12, s * 0.66);
    g.strokeStyle = "#fff"; g.lineWidth = s * 0.07; g.beginPath(); g.ellipse(-s * 0.13, -s * 0.36, s * 0.13, s * 0.08, 0.4, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(s * 0.13, -s * 0.36, s * 0.13, s * 0.08, -0.4, 0, 7); g.stroke();
  } else if (kind === "crown") {
    g.fillStyle = "#ffd23f"; g.beginPath(); g.moveTo(-s * 0.42, s * 0.3); g.lineTo(-s * 0.42, -s * 0.2); g.lineTo(-s * 0.2, s * 0.02); g.lineTo(0, -s * 0.32);
    g.lineTo(s * 0.2, s * 0.02); g.lineTo(s * 0.42, -s * 0.2); g.lineTo(s * 0.42, s * 0.3); g.closePath(); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- pieces
function badges(g, tl, clock) {
  const label = (tl.ui?.day || "DAY") + " " + tl.day;
  g.font = "900 40px Nunito";
  const w = g.measureText(label).width + 40;
  g.fillStyle = "rgba(22,26,38,0.72)"; rr(g, 44, 70, w, 62, 16); g.fill();
  g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(label, 64, 103);
  if (!clock.label) return;
  g.fillStyle = "rgba(22,26,38,0.72)"; rr(g, 44, 146, 196, 104, 16); g.fill();
  g.fillStyle = "#fff"; g.font = "900 56px Nunito"; g.fillText(hhmm(clock.m), 62, 192);
  g.font = "800 19px Nunito"; g.fillStyle = clock.label.includes("LAPSE") ? "#ffd23f" : "#b9c4d6";
  g.fillText(clock.label, 63, 232);
}

function watermark(g, tl) {
  if (!tl.handle) return;
  g.font = "800 30px Nunito"; g.textAlign = "right"; g.textBaseline = "middle";
  g.fillStyle = "rgba(255,255,255,0.62)"; g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 6;
  g.fillText(tl.handle, W - 44, 102); g.shadowColor = "transparent";
}

function socials(g, tl) {
  if (!tl.handle) return;
  // Instagram-only footer: icon + handle, centred
  const y = 1610;
  g.globalAlpha = 0.92;
  g.font = "800 32px Nunito";
  const tw = g.measureText(tl.handle).width, x = W / 2 - (tw + 52) / 2;
  icon(g, "ig", x + 20, y, 40);
  g.textAlign = "left"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = 7; g.strokeStyle = "rgba(0,0,0,0.55)"; g.strokeText(tl.handle, x + 52, y + 1);
  g.fillStyle = "#fff"; g.fillText(tl.handle, x + 52, y + 1);
  g.globalAlpha = 1;
}

function popBadge(g, tl, pop) {
  if (!tl.ui?.popBadge || pop == null) return;
  const txt = pop.toLocaleString("id-ID") + " RAKYAT";
  g.font = "900 34px Nunito";
  const w = g.measureText(txt).width + 86;
  g.fillStyle = "rgba(22,26,38,0.72)"; rr(g, 44, 264, w, 60, 16); g.fill();
  icon(g, "follow", 82, 294, 40);
  g.fillStyle = "#ffd23f"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(txt, 112, 296);
}

function wrap(g, text, maxW) {
  const words = text.split(" "); const lines = []; let cur = "";
  for (const w of words) { const tst = cur ? cur + " " + w : w; if (g.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur);
  return lines;
}

function captions(g, tl, t) {
  const c = tl.captions.find(c => t >= c.start && t < c.end);
  if (!c) return;
  const k = clamp((t - c.start) / 0.12);
  const s = 0.85 + 0.15 * easeOutBack(k);
  const y = tl.endCard && t >= tl.endCard.t ? 1290 : 1230;  // clear the end card's follow button
  g.save(); g.translate(W / 2, y); g.scale(s, s);
  g.font = "900 66px Nunito";
  const lines = wrap(g, c.text, 900);
  lines.forEach((l, i) => outlined(g, l, 0, (i - (lines.length - 1) / 2) * 80, { font: "900 66px Nunito", stroke: 13, color: c.color || "#fff" }));
  g.restore();
}

function popups(g, tl, t) {
  for (const p of tl.popups || []) {
    if (t < p.t || t > p.t + p.dur) continue;
    const k = clamp((t - p.t) / 0.3), out = clamp((p.t + p.dur - t) / 0.25);
    const s = easeOutBack(k) * (0.6 + 0.4 * out);
    g.save(); g.translate(W / 2, p.y || 470); g.scale(s, s); g.globalAlpha = out;
    g.font = "900 58px Nunito";
    const tw = g.measureText(p.text).width;
    const iw = p.icon ? 86 : 0, w = tw + iw + 90, h = 116;
    g.fillStyle = p.color || "#2a9d8f"; g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 24; g.shadowOffsetY = 8;
    rr(g, -w / 2, -h / 2, w, h, 30); g.fill(); g.shadowColor = "transparent";
    g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,0.9)"; rr(g, -w / 2, -h / 2, w, h, 30); g.stroke();
    if (p.icon) icon(g, p.icon, -w / 2 + 45 + 34, 0, 72);
    g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(p.text, -w / 2 + 45 + iw, 4);
    g.restore();
  }
}

function endCard(g, tl, t) {
  const e = tl.endCard;
  if (!e || t < e.t) return;
  const k = clamp((t - e.t) / 0.5);
  g.fillStyle = `rgba(10,14,30,${0.55 * k})`; g.fillRect(0, 0, W, H);
  const pop = i => easeOutBack(clamp((t - e.t - 0.15 * i) / 0.35));
  const item = (i, fn) => { const s = pop(i); if (s <= 0) return; g.save(); g.translate(W / 2, -150); g.scale(s, s); fn(); g.restore(); };
  item(0, () => { icon(g, "crown", 0, 470 / 1, 120); });
  item(1, () => outlined(g, e.title, 0, 600, { font: "900 74px Nunito", color: "#ffd23f" }));
  item(2, () => {
    g.font = "900 64px Nunito"; const lines = wrap(g, e.q, 900);
    lines.forEach((l, i) => outlined(g, l, 0, 715 + i * 78, { font: "900 64px Nunito" }));
  });
  (e.chips || []).forEach((c, i) => item(3 + i, () => {
    g.font = "800 44px Nunito"; const w = g.measureText(c).width + 70;
    g.fillStyle = "rgba(255,255,255,0.95)"; rr(g, -w / 2, 900 + i * 92 - 36, w, 72, 36); g.fill();
    g.fillStyle = "#1d3557"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(c, 0, 902 + i * 92);
  }));
  const n = (e.chips || []).length;
  item(3 + n, () => {
    g.font = "900 46px Nunito"; const txt = e.follow || "FOLLOW = JADI RAKYAT"; const w = g.measureText(txt).width + 140;
    const y = 960 + n * 92;
    g.fillStyle = "#e63946"; rr(g, -w / 2, y - 44, w, 88, 44); g.fill();
    icon(g, "follow", -w / 2 + 62, y, 54);
    g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(txt, -w / 2 + 100, y + 3);
  });
}

function fades(g, tl, t) {
  for (const f of tl.fades || []) {
    const d = Math.abs(t - f.t);
    if (d < f.len) { g.fillStyle = `rgba(${f.color || "0,0,0"},${1 - d / f.len})`; g.fillRect(0, 0, W, H); }
  }
}

export function drawHUD(g, tl, t, st) {
  fades(g, tl, t);
  endCard(g, tl, t);
  badges(g, tl, st.clock);
  popBadge(g, tl, st.pop);
  watermark(g, tl);
  socials(g, tl);
  popups(g, tl, t);
  if (!(tl.endCard && t >= tl.endCard.t + 0.2 && tl.endCard.hideCaptions)) captions(g, tl, t);
}

export function drawCover(g, tl) {
  const c = tl.cover || {};
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(0,0,0,0.35)"); gr.addColorStop(0.35, "rgba(0,0,0,0)"); gr.addColorStop(0.7, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  badges(g, tl, { label: "" });
  watermark(g, tl);
  outlined(g, c.top || "", W / 2, 330, { font: "900 92px Nunito", color: "#ffd23f", stroke: 16 });
  (c.lines || []).forEach((l, i) => outlined(g, l, W / 2, 440 + i * 96, { font: "900 84px Nunito", stroke: 16 }));
  if (c.bottom) outlined(g, c.bottom, W / 2, 1560, { font: "900 64px Nunito", stroke: 13, color: "#fff" });
}
