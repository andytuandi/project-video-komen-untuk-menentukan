// Low-poly asset kit: every model is built from primitive geometry with flat shading,
// so the whole world is code (no external 3D files, nothing copyrighted).
import * as THREE from "three";

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.92, metalness: 0, ...opts }));
  }
  return matCache.get(key);
}

export function mesh(geo, color, opts) {
  const m = new THREE.Mesh(geo, typeof color === "string" || typeof color === "number" ? mat(color, opts) : color);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function at(o, x, y, z) { o.position.set(x, y, z); return o; }
function rx(o, a) { o.rotation.x = a; return o; }

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- text textures
export function textTexture(lines, o = {}) {
  const w = o.w || 1024, h = o.h || 256;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // back faces of boxes see the texture mirrored; give them a flipped twin
  const mirror = new THREE.CanvasTexture(c);
  mirror.colorSpace = THREE.SRGBColorSpace; mirror.wrapS = THREE.RepeatWrapping; mirror.repeat.x = -1; mirror.offset.x = 1;
  tex.mirror = mirror;
  tex.draw = (ls) => {
    const g = c.getContext("2d");
    g.fillStyle = o.bg || "#b07a45"; g.fillRect(0, 0, w, h);
    // wood grain
    g.globalAlpha = 0.18; g.strokeStyle = "#5a3517"; g.lineWidth = 3;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, h * i / 6 + Math.sin(i) * 4); g.lineTo(w, h * i / 6 - Math.cos(i) * 5); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 14; g.strokeStyle = o.border || "#6b4220"; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = o.fg || "#3b2410"; g.textAlign = "center"; g.textBaseline = "middle";
    const arr = Array.isArray(ls) ? ls : [ls];
    const fs = o.size || h * 0.55 / arr.length;
    arr.forEach((l, i) => {
      let size = fs;
      g.font = `700 ${size}px Fredoka`;
      while (g.measureText(l).width > w * 0.9 && size > 10) { size -= 2; g.font = `700 ${size}px Fredoka`; }
      g.fillText(l, w / 2, h * (i + 0.5) / arr.length + 4);
    });
    tex.needsUpdate = true; mirror.needsUpdate = true;
  };
  tex.draw(lines);
  return tex;
}

// ---------------------------------------------------------------- nature
export function tree(r, kind) {
  const g = new THREE.Group();
  const s = 0.8 + r() * 0.7;
  if (kind === "pine") {
    g.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5), "#7a5131"), 0, 0.6, 0));
    const greens = ["#2f7d4a", "#3a8f55", "#2b6e43"];
    for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.ConeGeometry(1.25 - i * 0.3, 1.5, 6), greens[i]), 0, 1.4 + i * 0.75, 0));
  } else {
    g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 5), "#7a5131"), 0, 0.7, 0));
    const col = ["#4ea84a", "#5cb84e", "#3f9a46"][Math.floor(r() * 3)];
    g.add(at(mesh(new THREE.IcosahedronGeometry(1.15, 0), col), 0, 2.1, 0));
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.8, 0), col), 0.6, 1.8, 0.3));
  }
  g.scale.setScalar(s);
  g.rotation.y = r() * 6.28;
  return g;
}

export function rock(r, s = 1) {
  const m = mesh(new THREE.DodecahedronGeometry(0.5 * s, 0), r() > 0.5 ? "#9a9a92" : "#8a8c86");
  m.scale.set(1 + r() * 0.5, 0.6 + r() * 0.4, 1 + r() * 0.3);
  m.rotation.set(r(), r() * 6, r());
  return m;
}

export function cloud(r) {
  const g = new THREE.Group();
  const n = 4 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + r() * 1.6, 1), mat("#ffffff", { roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.35 }));
    m.position.set((i - n / 2) * 2.4, r() * 1.2, r() * 1.5);
    m.scale.y = 0.6;
    g.add(m);
  }
  return g;
}

export function floatingIsland(r, s = 1) {
  const g = new THREE.Group();
  const rockM = mesh(new THREE.ConeGeometry(6, 9, 7), "#8b7d93");
  rockM.rotation.x = Math.PI; rockM.position.y = -4.5; g.add(rockM);
  g.add(at(mesh(new THREE.CylinderGeometry(6.2, 6, 1.2, 7), "#6fbf5b"), 0, 0.4, 0));
  for (let i = 0; i < 3; i++) { const t = tree(r, i % 2 ? "pine" : "round"); t.position.set((r() - 0.5) * 7, 1, (r() - 0.5) * 7); g.add(t); }
  // waterfall
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 14), mat("#bfe8ff", { emissive: "#bfe8ff", emissiveIntensity: 0.4, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  fall.position.set(0, -6, 5.9); g.add(fall);
  g.scale.setScalar(s);
  return g;
}

export function crystal(color = "#9fd8ff") {
  const g = new THREE.Group();
  const m = mat(color, { emissive: color, emissiveIntensity: 0.55, roughness: 0.4 });
  [[0, 1.2, 0, 0], [0.5, 0.8, 0.2, 0.4], [-0.4, 0.7, -0.1, -0.35]].forEach(([x, h, z, tilt]) => {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), m);
    c.scale.set(1, h * 2.2, 1); c.position.set(x, h * 0.6, z); c.rotation.z = tilt; c.castShadow = true; g.add(c);
  });
  return g;
}

// ---------------------------------------------------------------- props
// Every buildable prop returns a Group whose children carry userData.step (0..1):
// the build animation pops each piece in when progress passes its step.
function step(o, s) { o.userData.step = s; return o; }

export function gate(title) {
  const g = new THREE.Group();
  const wood = "#8a5a32";
  [-2.4, 2.4].forEach((x, i) => {
    g.add(step(at(mesh(new THREE.CylinderGeometry(0.2, 0.24, 4.6, 6), wood), x, 2.3, 0), 0.1 + i * 0.1));
    g.add(step(at(mesh(new THREE.ConeGeometry(0.32, 0.5, 6), "#c0392b"), x, 4.85, 0), 0.9));
  });
  g.add(step(at(mesh(new THREE.BoxGeometry(5.6, 0.25, 0.3), wood), 0, 3.4, 0), 0.4));
  g.add(step(at(mesh(new THREE.BoxGeometry(5.6, 0.25, 0.3), wood), 0, 4.4, 0), 0.5));
  const tex = textTexture(title, { w: 1024, h: 200 });
  const face = new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 0.12), [mat(wood), mat(wood), mat(wood), mat(wood), face, new THREE.MeshStandardMaterial({ map: tex, flatShading: true, roughness: 0.9 })]);
  board.castShadow = true;
  g.add(step(at(board, 0, 3.9, 0.12), 0.6));
  // pennants
  for (let i = 0; i < 6; i++) {
    const p = mesh(new THREE.ConeGeometry(0.16, 0.42, 3), i % 2 ? "#f1c40f" : "#c0392b");
    p.rotation.x = Math.PI; g.add(step(at(p, -2 + i * 0.8, 3.08, 0.05), 0.8));
  }
  g.userData.tex = tex;
  return g;
}

export function signPost(text) {
  const g = new THREE.Group();
  [-0.92, 0.92].forEach(x => g.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.4, 5), "#7a4f2a"), x, 1.2, 0)));
  const tex = textTexture(text, { w: 512, h: 220, bg: "#c4925a" });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 0.1), [mat("#8a5a32"), mat("#8a5a32"), mat("#8a5a32"), mat("#8a5a32"), new THREE.MeshStandardMaterial({ map: tex, flatShading: true }), new THREE.MeshStandardMaterial({ map: tex, flatShading: true })]);
  board.castShadow = true;
  g.add(at(board, 0, 2.0, 0));
  g.userData.tex = tex;
  return g;
}

export function stumpThrone() {
  const g = new THREE.Group();
  g.add(step(at(mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.75, 8), "#8b5e3c"), 0, 0.375, 0), 0));
  g.add(step(at(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 8), "#e2c18f"), 0, 0.77, 0), 0));
  const cushion = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.14, 8), "#b03a48");
  g.add(step(at(cushion, 0, 0.85, 0), 0.5));
  [[0.6, 0.2], [-0.5, 0.4], [0.1, -0.65]].forEach(([x, z]) => {
    const root = mesh(new THREE.BoxGeometry(0.5, 0.18, 0.22), "#7a5131"); root.rotation.y = Math.atan2(x, z); g.add(step(at(root, x, 0.08, z), 0));
  });
  return g;
}

export function tent() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.2, 1.6, 10, 1, true), mat("#f3e6c8", { side: THREE.DoubleSide }));
  base.castShadow = base.receiveShadow = true;
  g.add(step(at(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 5), "#7a4f2a"), 0, 1.8, 0), 0.05));
  g.add(step(at(base, 0, 0.8, 0), 0.3));
  // striped roof: alternate red / cream segments
  for (let i = 0; i < 10; i++) {
    const seg = mesh(new THREE.ConeGeometry(2.45, 1.9, 10, 1, true, (i / 10) * Math.PI * 2, Math.PI * 2 / 10), i % 2 ? "#c0392b" : "#f3e6c8", { side: THREE.DoubleSide });
    g.add(step(at(seg, 0, 2.55, 0), 0.45 + i * 0.03));
  }
  // door flap
  const door = mesh(new THREE.PlaneGeometry(1, 1.4), "#7b241c", { side: THREE.DoubleSide });
  g.add(step(at(door, 0, 0.7, 2.16), 0.85));
  const flag = mesh(new THREE.ConeGeometry(0.3, 0.9, 3), "#f1c40f");
  flag.rotation.z = -Math.PI / 2; g.add(step(at(flag, 0.45, 3.45, 0), 0.95));
  return g;
}

export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.2, 0), "#8c8c86");
    g.add(step(at(s, Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6), i / 16));
  }
  for (let i = 0; i < 3; i++) {
    const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 5), "#6b4423");
    l.rotation.z = Math.PI / 2; l.rotation.y = i * Math.PI / 3; g.add(step(at(l, 0, 0.2, 0), 0.6 + i * 0.1));
  }
  const flame = new THREE.Group();
  flame.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.95, 6), mat("#ff7b1c", { emissive: "#ff5a00", emissiveIntensity: 1.6 })), 0, 0.6, 0));
  flame.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 5), mat("#ffd23f", { emissive: "#ffc400", emissiveIntensity: 1.8 })), 0.05, 0.5, 0.05));
  flame.scale.setScalar(0.7); g.add(flame);
  const light = new THREE.PointLight("#ff9a3c", 0, 14, 1.6);
  light.position.y = 1.0;
  g.add(light);
  g.userData.flame = flame; g.userData.light = light;
  return g;
}

export function crate(color = "#c8935a") {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), color));
  [-0.36, 0.36].forEach(z => g.add(at(mesh(new THREE.BoxGeometry(0.74, 0.1, 0.04), "#8a5a32"), 0, 0.2, z)));
  return g;
}

export function sack() {
  const m = mesh(new THREE.IcosahedronGeometry(0.4, 1), "#d8c49a");
  m.scale.set(1, 0.8, 0.9);
  return m;
}

export function cart() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(1.6, 0.18, 2.2), "#9c6b3f"), 0, 0.7, 0));
  [[-0.8, 0], [0.8, 0]].forEach(([x]) => g.add(at(mesh(new THREE.BoxGeometry(0.08, 0.4, 2.2), "#8a5a32"), x, 0.95, 0)));
  g.add(at(mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), "#8a5a32"), 0, 0.95, -1.1));
  const wheels = [];
  [-0.9, 0.9].forEach(x => {
    const w = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 10), "#5d3b1e");
    w.rotation.z = Math.PI / 2; at(w, x, 0.45, -0.2); g.add(w); wheels.push(w);
  });
  // handles reach forward (+z) to the puller
  [-0.55, 0.55].forEach(x => { const h = mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), "#7a4f2a"); h.rotation.x = 0.25; g.add(at(h, x, 0.65, 1.7)); });
  const c1 = crate(); c1.position.set(-0.35, 1.15, -0.4); g.add(c1);
  const c2 = crate("#b9844f"); c2.position.set(0.35, 1.15, 0.3); c2.rotation.y = 0.3; g.add(c2);
  const s = sack(); s.position.set(-0.35, 1.05, 0.5); g.add(s);
  const c3 = crate("#d4a06a"); c3.scale.setScalar(0.7); c3.position.set(-0.2, 1.75, -0.3); g.add(c3);
  g.userData.wheels = wheels;
  return g;
}

export function hammer() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 5), "#7a4f2a"), 0, -0.1, 0));
  g.add(at(mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), "#777"), 0, -0.32, 0));
  return g;
}

// ---------------------------------------------------------------- characters
const SKIN = "#c68a5a";

export function person(o = {}) {
  const g = new THREE.Group();
  const parts = {};
  const skin = o.skin || SKIN;
  const legGeo = new THREE.BoxGeometry(0.17, 0.46, 0.19);
  [["legL", 0.13], ["legR", -0.13]].forEach(([k, x]) => {
    const p = new THREE.Group(); p.position.set(x, 0.5, 0);
    p.add(at(mesh(legGeo, o.pants || "#efe6d2"), 0, -0.23, 0));
    p.add(at(mesh(new THREE.BoxGeometry(0.2, 0.1, 0.27), o.shoes || "#3a2a1e"), 0, -0.46, 0.04));
    g.add(p); parts[k] = p;
  });
  const body = new THREE.Group(); g.add(body); parts.body = body;
  if (o.king) {
    body.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.72, 8), o.shirt || "#6b2fa0"), 0, 0.84, 0));
    body.add(at(mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.07, 8), "#f1c40f"), 0, 0.5, 0));
    body.add(at(mesh(new THREE.BoxGeometry(0.07, 0.62, 0.05), "#f1c40f"), 0, 0.84, 0.36));
    body.add(rx(at(mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 10), "#f6f1e6"), 0, 1.18, 0), Math.PI / 2));
    const cape = mesh(new THREE.BoxGeometry(0.78, 1.05, 0.05), "#b0212b");
    cape.position.set(0, 0.68, -0.3); cape.rotation.x = 0.12; body.add(cape); parts.cape = cape;
  } else {
    body.add(at(mesh(new THREE.BoxGeometry(0.52, 0.64, 0.36), o.shirt || "#6aa7d8"), 0, 0.82, 0));
  }
  [["armL", 0.36], ["armR", -0.36]].forEach(([k, x]) => {
    const p = new THREE.Group(); p.position.set(x, 1.1, 0);
    p.add(at(mesh(new THREE.BoxGeometry(0.14, 0.46, 0.15), o.king ? (o.shirt || "#6b2fa0") : (o.shirt || "#6aa7d8")), 0, -0.2, 0));
    p.add(at(mesh(new THREE.IcosahedronGeometry(0.09, 0), skin), 0, -0.46, 0));
    body.add(p); parts[k] = p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.5, 0); body.add(head); parts.head = head;
  const skull = mesh(new THREE.IcosahedronGeometry(0.38, 1), skin);
  skull.scale.set(1, 0.95, 0.95); head.add(skull);
  head.add(at(mesh(new THREE.IcosahedronGeometry(0.07, 0), "#b27449"), 0, -0.02, 0.36));
  const eyes = new THREE.Group(); head.add(eyes); parts.eyes = eyes;
  [-0.13, 0.13].forEach(x => eyes.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), mat("#1b1b1b")), x, 0.06, 0.34)));
  [-0.13, 0.13].forEach(x => { const b = mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), "#2b1d14"); b.rotation.z = x > 0 ? -0.15 : 0.15; head.add(at(b, x, 0.16, 0.33)); });
  if (o.mustache !== false) {
    [-1, 1].forEach(sd => { const m = mesh(new THREE.BoxGeometry(0.17, 0.065, 0.06), "#2b1d14"); m.rotation.z = sd * -0.25; head.add(at(m, sd * 0.085, -0.1, 0.34)); });
  }
  if (o.king) {
    const crown = new THREE.Group(); crown.position.y = 0.33;
    crown.add(mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.16, 8, 1, true), "#f1c40f", { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.5 }));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; crown.add(at(mesh(new THREE.ConeGeometry(0.06, 0.16, 4), "#f1c40f", { metalness: 0.3, roughness: 0.5 }), Math.sin(a) * 0.26, 0.15, Math.cos(a) * 0.26)); }
    crown.add(at(mesh(new THREE.OctahedronGeometry(0.05, 0), "#e74c3c", { emissive: "#e74c3c", emissiveIntensity: 0.4 }), 0, 0.02, 0.26));
    crown.rotation.z = 0.08;
    head.add(crown); parts.crown = crown;
    head.add(rx(at(mesh(new THREE.ConeGeometry(0.1, 0.18, 5), "#2b1d14"), 0, -0.28, 0.27), Math.PI));
  }
  if (o.hat === "straw") head.add(at(mesh(new THREE.ConeGeometry(0.55, 0.3, 8), "#d9b56a"), 0, 0.38, 0));
  if (o.hat === "helmet") head.add(at(mesh(new THREE.SphereGeometry(0.4, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), "#9aa4ad", { metalness: 0.4 }), 0, 0.08, 0));
  g.userData.parts = parts;
  return g;
}

export function dragon() {
  const g = new THREE.Group();
  const parts = {};
  const green = "#3fae6a", belly = "#bfe3a0";
  const root = new THREE.Group(); g.add(root); parts.root = root;
  const body = mesh(new THREE.IcosahedronGeometry(0.34, 1), green); body.scale.set(1, 0.9, 1.15); body.position.y = 0.42; root.add(body);
  { const b = at(mesh(new THREE.IcosahedronGeometry(0.24, 1), belly), 0, 0.36, 0.14); b.scale.set(1, 1, 0.7); root.add(b); }
  const head = new THREE.Group(); head.position.set(0, 0.78, 0.22); root.add(head); parts.head = head;
  head.add(mesh(new THREE.IcosahedronGeometry(0.28, 1), green));
  head.add(at(mesh(new THREE.BoxGeometry(0.26, 0.16, 0.22), green), 0, -0.06, 0.24));
  [-0.06, 0.06].forEach(x => head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 3), mat("#1b1b1b")), x, -0.02, 0.36)));
  const eyes = new THREE.Group(); head.add(eyes); parts.eyes = eyes;
  [-0.12, 0.12].forEach(x => {
    eyes.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), mat("#ffffff")), x, 0.08, 0.2));
    eyes.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat("#1b1b1b")), x, 0.08, 0.27));
  });
  [-0.13, 0.13].forEach(x => { const h = mesh(new THREE.ConeGeometry(0.05, 0.2, 4), "#f3d27a"); h.rotation.x = -0.5; head.add(at(h, x, 0.26, -0.08)); });
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.lineTo(0.55, 0.28); wingShape.lineTo(0.48, -0.05); wingShape.lineTo(0.3, -0.12); wingShape.lineTo(0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  [["wingL", 1], ["wingR", -1]].forEach(([k, sd]) => {
    const p = new THREE.Group(); p.position.set(sd * 0.18, 0.62, -0.08);
    const w = new THREE.Mesh(wingGeo, mat("#2e8c55", { side: THREE.DoubleSide })); w.castShadow = true;
    w.scale.x = sd; w.rotation.x = -Math.PI / 2 + 0.3; p.add(w); root.add(p); parts[k] = p;
  });
  const tail = mesh(new THREE.ConeGeometry(0.12, 0.6, 5), green); tail.rotation.x = -Math.PI / 2 - 0.3; tail.position.set(0, 0.32, -0.5); root.add(tail);
  root.add(rx(at(mesh(new THREE.ConeGeometry(0.08, 0.14, 4), "#f3d27a"), 0, 0.55, -0.82), -1.2));
  [[-0.17, 0.15], [0.17, 0.15], [-0.17, -0.18], [0.17, -0.18]].forEach(([x, z]) => root.add(at(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.2, 5), green), x, 0.1, z)));
  // fire breath
  const fire = new THREE.Group(); fire.position.set(0, -0.05, 0.4); head.add(fire);
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), mat("#ff7b1c", { emissive: "#ff5a00", emissiveIntensity: 1.8, transparent: true, opacity: 0.9 }));
  f1.rotation.x = -Math.PI / 2; f1.position.z = 0.45; fire.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 5), mat("#ffe066", { emissive: "#ffd000", emissiveIntensity: 2 }));
  f2.rotation.x = -Math.PI / 2; f2.position.z = 0.35; fire.add(f2);
  fire.scale.setScalar(0.001); parts.fire = fire;
  g.userData.parts = parts;
  return g;
}

export function zzz() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const x = c.getContext("2d"); x.font = "900 90px Fredoka"; x.fillStyle = "#fff"; x.strokeStyle = "#1d3557"; x.lineWidth = 8;
  x.textAlign = "center"; x.textBaseline = "middle"; x.strokeText("Z", 64, 68); x.fillText("Z", 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.setScalar(0.3); g.add(s); }
  return g;
}
