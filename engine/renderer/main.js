// Kerajaan Netizen renderer: deterministic low-poly 3D world. window.renderFrame(t) draws
// the world state at time t (seconds) plus the 2D HUD, and returns a data URL.
import * as THREE from "three";
import * as A from "./assets.js";
import { drawHUD, drawCover } from "./hud.js";

const W = 1080, H = 1920;
const glCanvas = document.getElementById("gl");
const out = document.getElementById("out");
const ctx = out.getContext("2d");

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 900);
scene.fog = new THREE.Fog("#a8d8f5", 90, 420);

const hemi = new THREE.HemisphereLight("#dff3ff", "#6a8f4e", 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff4dd", 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 260 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);

let TL = null;
const props = new Map();   // id -> {obj, spec}
const actors = new Map();  // id -> {obj, type}
let stars, moon, clouds = [];

// ------------------------------------------------------------------ static world
function buildWorld(seed = 7) {
  const r = A.rng(seed);
  // ground with faceted vertex colours
  let geo = new THREE.PlaneGeometry(600, 600, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
    // flat inside the kingdom so roads/plazas never z-fight with the grass; hills only far away
    let h = 0;
    if (d > 55) h = (Math.sin(x * 0.11) + Math.cos(z * 0.09)) * 0.12 * clamp((d - 55) / 15) + (d - 55) * 0.05 * (0.6 + 0.4 * Math.sin(x * 0.05 + z * 0.07));
    pos.setY(i, h - 0.02);
  }
  geo = geo.toNonIndexed();
  const cols = [];
  const greens = ["#7cc15a", "#74b955", "#83c862", "#6fb150"].map(c => new THREE.Color(c));
  for (let f = 0; f < geo.attributes.position.count / 3; f++) {
    const c = greens[Math.floor(r() * greens.length)];
    for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // dirt road from the gate to the clearing, and the clearing itself
  const dirt = new THREE.MeshStandardMaterial({ color: "#c79d6b", roughness: 1, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(3, 70, 1, 10), dirt);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 33); road.receiveShadow = true; scene.add(road);
  const clearing = new THREE.Mesh(new THREE.CircleGeometry(9, 9), dirt);
  clearing.rotation.x = -Math.PI / 2; clearing.position.set(0, 0.002, -1); clearing.receiveShadow = true; scene.add(clearing);
  for (const [x, z, rad] of (TL.plazas || [])) {
    const pz = new THREE.Mesh(new THREE.CircleGeometry(rad, 10), dirt);
    pz.rotation.x = -Math.PI / 2; pz.position.set(x, 0.004, z); pz.receiveShadow = true; scene.add(pz);
  }

  const free = (x, z) => !(Math.abs(x) < 4.5 && z > -2) && Math.hypot(x, z + 1) > 11 &&
    !(TL.reserved || []).some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  // grass tufts + flowers (instanced)
  const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.34, 3), A.mat("#4f9a3c"), 3200);
  const flower = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ flatShading: true }), 500);
  const m4 = new THREE.Matrix4();
  let n = 0;
  while (n < 3200) {
    const x = (r() - 0.5) * 140, z = (r() - 0.5) * 140;
    if (Math.abs(x) < 1.8 && z > -1) continue;
    if ((TL.plazas || []).some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr)) continue;
    m4.makeTranslation(x, 0.15, z); tuft.setMatrixAt(n++, m4);
  }
  const fcol = ["#ffffff", "#ffd84d", "#ff8fb3", "#b48cff"].map(c => new THREE.Color(c));
  for (let i = 0; i < 500; i++) {
    let x, z; do { x = (r() - 0.5) * 110; z = (r() - 0.5) * 110; } while (!free(x, z));
    m4.makeTranslation(x, 0.12, z); flower.setMatrixAt(i, m4); flower.setColorAt(i, fcol[i % 4]);
  }
  scene.add(tuft, flower);

  for (let i = 0; i < 90; i++) {
    let x, z; do { const a = r() * Math.PI * 2, d = 20 + r() * 70; x = Math.cos(a) * d; z = Math.sin(a) * d; } while (!free(x, z) || (Math.abs(x) < 7 && z > 0));
    const t = A.tree(r, r() > 0.45 ? "pine" : "round"); t.position.set(x, 0, z); scene.add(t);
  }
  for (let i = 0; i < 30; i++) {
    let x, z; do { x = (r() - 0.5) * 90; z = (r() - 0.5) * 90; } while (!free(x, z));
    const k = A.rock(r, 0.6 + r() * 1.4); k.position.set(x, 0.1, z); scene.add(k);
  }
  [[13, -15, "#9fd8ff"], [-17, 9, "#d6a8ff"], [21, 12, "#9fd8ff"], [-24, -20, "#ffb3e6"]].forEach(([x, z, c]) => {
    const cr = A.crystal(c); cr.position.set(x, 0, z); cr.scale.setScalar(1.4); scene.add(cr);
  });
  // mountains ring
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + r() * 0.2, d = 170 + r() * 60, h = 35 + r() * 45, rad = 22 + r() * 18;
    const m = A.mesh(new THREE.ConeGeometry(rad, h, 6), r() > 0.5 ? "#8492b8" : "#7a86ad");
    m.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d); m.rotation.y = r(); m.castShadow = false; scene.add(m);
    if (h > 55) { const cap = A.mesh(new THREE.ConeGeometry(rad * 0.32, h * 0.32, 6), "#f4f7ff"); cap.position.set(m.position.x, h - 2 - h * 0.16 + 0.3, m.position.z); cap.rotation.y = m.rotation.y; cap.castShadow = false; scene.add(cap); }
  }
  [[-75, 40, -130, 1.3], [95, 52, -160, 1.6], [-110, 34, 60, 1.1], [60, 45, 120, 1.2]].forEach(([x, y, z, s]) => {
    const fi = A.floatingIsland(r, s); fi.position.set(x, y, z); fi.userData.baseY = y; scene.add(fi); clouds.push(fi);
  });
  for (let i = 0; i < 14; i++) {
    const c = A.cloud(r); const a = r() * Math.PI * 2, d = 60 + r() * 140;
    c.position.set(Math.cos(a) * d, 38 + r() * 25, Math.sin(a) * d); c.userData.drift = 0.4 + r() * 0.6; c.userData.x0 = c.position.x;
    scene.add(c); clouds.push(c);
  }
  // night sky
  const sp = [];
  for (let i = 0; i < 900; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.4; sp.push(Math.cos(a) * Math.cos(e) * 400, Math.sin(e) * 400, Math.sin(a) * Math.cos(e) * 400); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#ffffff", size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  scene.add(stars);
  moon = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 1), new THREE.MeshBasicMaterial({ color: "#fff6d8", fog: false, transparent: true, opacity: 0 }));
  moon.position.set(-140, 170, -300); scene.add(moon);
}

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOutBack = k => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

function skyAt(hour) {
  const keys = [[0, "#0b1430"], [4.8, "#0e1a3d"], [5.8, "#f2a77f"], [7, "#9fd3f7"], [12, "#8fcdf5"], [16.8, "#a6d4f0"], [17.9, "#f7a36b"], [18.7, "#6b4c8a"], [19.6, "#152045"], [24, "#0b1430"]];
  for (let i = 0; i < keys.length - 1; i++) {
    if (hour >= keys[i][0] && hour <= keys[i + 1][0]) {
      const k = (hour - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
      return new THREE.Color(keys[i][1]).lerp(new THREE.Color(keys[i + 1][1]), k);
    }
  }
  return new THREE.Color("#8fcdf5");
}
function nightFactor(h) {
  if (h >= 7 && h <= 17) return 0;
  if (h > 17 && h < 19.6) return clamp((h - 17.6) / 2);
  if (h > 4.8 && h < 7) return clamp(1 - (h - 4.8) / 1.6);
  return 1;
}

export function clockAt(t) {
  const cl = TL.clock || [];
  let cur = null;
  for (const c of cl) if (c.t0 <= t + 1e-6) cur = c;
  if (!cur) return { m: 9 * 60, label: "" };
  const k = cur.t1 > cur.t0 ? clamp((t - cur.t0) / (cur.t1 - cur.t0)) : 1;
  return { m: lerp(cur.m0, cur.m1, k), label: cur.label || "" };
}

function populationAt(t) {
  let v = TL.population ?? 1;
  for (const p of TL.popKeys || []) {
    if (p.t > t) break;
    const from = v;
    v = p.ramp ? Math.round(lerp(from, p.v, ease(clamp((t - p.t) / p.ramp)))) : p.v;
  }
  return v;
}
window.populationAt = populationAt;

function shotAt(t) {
  let s = TL.shots[0];
  for (const sh of TL.shots) if (sh.start <= t + 1e-6) s = sh;
  return s;
}

// ------------------------------------------------------------------ props
function makeProp(spec) {
  const p = spec.params || {};
  switch (spec.type) {
    case "gate": return A.gate(p.title || "KERAJAAN NETIZEN");
    case "sign": return A.signPost(p.text || "");
    case "throne": return A.stumpThrone();
    case "tent": return A.tent();
    case "campfire": return A.campfire();
    case "crate": return A.crate();
    case "sack": return A.sack();
    case "hammer": return A.hammer();
    case "mosque": return A.mosque();
    case "church": return A.church();
    case "guardpost": return A.guardPost(p.lines);
    case "paddy": return A.paddyField(p.cols, p.rows, p.size);
    case "hut": return A.hut();
    case "scarecrow": return A.scarecrow();
    default: throw new Error("unknown prop " + spec.type);
  }
}

function updateProps(t, hour, night) {
  for (const { obj, spec } of props.values()) {
    const vis = t >= (spec.show ?? -1) && t < (spec.hide ?? 1e9);
    obj.visible = vis;
    if (!vis) continue;
    let prog = 1;
    if (spec.build) prog = clamp((t - spec.build[0]) / (spec.build[1] - spec.build[0]));
    obj.traverse(o => {
      if (o.userData.step === undefined) return;
      const k = clamp((prog - o.userData.step) / 0.1);
      o.visible = k > 0;
      const s = Math.max(0.001, easeOutBack(k));
      o.scale.setScalar(s);
    });
    if (spec.type === "campfire") {
      const lit = spec.params?.lit ?? -1;
      const on = lit >= 0 && t >= lit ? clamp((t - lit) / 0.6) : 0;
      const fl = 1 + 0.15 * Math.sin(t * 19) + 0.08 * Math.sin(t * 31 + 1);
      obj.userData.flame.scale.set(0.7 * on * (1 + 0.05 * Math.sin(t * 23)), 0.7 * on * fl, 0.7 * on);
      obj.userData.flame.visible = on > 0;
      obj.userData.light.intensity = on * (8 + 2 * Math.sin(t * 17)) * (0.35 + night);
    }
    if (spec.type === "paddy") {
      const gk = spec.grow ? clamp((t - spec.grow[0]) / (spec.grow[1] - spec.grow[0])) : 1;
      obj.userData.riceRoot.scale.y = lerp(0.35, 1.45, ease(gk));
      const rk = spec.ripe ? clamp((t - spec.ripe[0]) / (spec.ripe[1] - spec.ripe[0])) : 0;
      A.riceMat.color.set("#6cc24a").lerp(new THREE.Color("#e2b93f"), rk);
    }
    if (spec.type === "sign" && spec.params?.text?.includes("{pop}")) {
      const txt = spec.params.text.replace("{pop}", populationAt(t).toLocaleString("id-ID"));
      if (obj.userData.last !== txt) { obj.userData.tex.draw(txt.split("\n")); obj.userData.last = txt; }
    }
  }
}

// ------------------------------------------------------------------ actors
function makeActor(a) {
  switch (a.type) {
    case "king": return A.person({ king: true, shirt: "#6b2fa0" });
    case "villager": return A.person({ shirt: a.shirt || "#6aa7d8", hat: a.hat, mustache: a.mustache, hair: a.hair, hijab: a.hijab, skin: a.skin });
    case "soldier": return A.person({ soldier: true, shirt: "#5b6b7a", pants: "#3b4652", skin: a.skin });
    case "crowd": return makeCrowd(a);
    case "dragon": return A.dragon();
    case "buffalo": return A.buffalo();
    case "cart": return A.cart();
    default: throw new Error("unknown actor " + a.type);
  }
}

function resetPose(P) {
  for (const k of ["legL", "legR", "armL", "armR", "head", "body"]) if (P[k]) P[k].rotation.set(0, 0, 0);
  if (P.body) P.body.position.set(0, 0, 0);
  if (P.eyes) P.eyes.scale.set(1, 1, 1);
}

// position along a polyline (points [[x,z],...]) for k in 0..1, plus heading
function along(path, k) {
  if (path.length === 1) return { x: path[0][0], z: path[0][1], dir: null };
  const segs = []; let tot = 0;
  for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); segs.push(l); tot += l; }
  let d = k * tot;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? clamp(d / segs[i]) : 1;
      const [x0, z0] = path[i], [x1, z1] = path[i + 1];
      return { x: lerp(x0, x1, f), z: lerp(z0, z1, f), dir: Math.atan2(x1 - x0, z1 - z0) };
    }
    d -= segs[i];
  }
}

function animAt(a, f) {
  let an = a.anim || "idle";
  for (const [ff, name] of a.anims || []) if (f >= ff) an = name;
  return an;
}

function poseActor(entry, a, t, shot) {
  const { obj } = entry;
  const P = obj.userData.parts || {};
  const dur = shot.end - shot.start;
  const f = clamp((t - shot.start) / dur);
  const path = a.path || [a.at || [0, 0]];
  const [m0, m1] = a.move || [0, 1];
  const mk = path.length > 1 ? clamp((f - m0) / (m1 - m0)) : 0;
  let pos, moving = path.length > 1 && f > m0 && f < m1;
  if (a.dwell && path.length > 1) {
    // time-lapse worker: hop to each point, then work there (stationary) for the rest of the slot
    const S = path.length - 1, u = Math.min(mk * S, S - 1e-6), seg = Math.floor(u), uu = u - seg;
    const tr = a.dwell === true ? 0.35 : a.dwell;
    if (uu < tr && f < m1) pos = along([path[seg], path[seg + 1]], ease(uu / tr));
    else { pos = { x: path[seg + 1][0], z: path[seg + 1][1], dir: null }; moving = false; }
  } else pos = along(path, a.smooth === false ? mk : ease(mk));
  obj.position.set(pos.x, a.y || 0, pos.z);
  let yaw = a.face !== undefined ? a.face * Math.PI / 180 : 0;
  if (!moving && a.lookAt) yaw = Math.atan2(a.lookAt[0] - pos.x, a.lookAt[1] - pos.z);
  if (moving && pos.dir !== null && a.faceMove !== false) yaw = pos.dir;
  else if (a.faceEnd !== undefined && f >= m1) yaw = a.faceEnd * Math.PI / 180;
  obj.rotation.y = yaw;
  const an = animAt(a, f);
  const ph = t + (a.phase || 0);

  if (entry.type === "cart") {
    obj.userData.wheels.forEach(w => { w.rotation.x = moving ? -mk * 30 : 0; });
    return;
  }
  if (entry.type === "buffalo") {
    const s2 = moving ? Math.sin(ph * 6) * 0.45 : 0;
    P.legFL.rotation.x = s2; P.legBR.rotation.x = s2; P.legFR.rotation.x = -s2; P.legBL.rotation.x = -s2;
    P.head.rotation.x = moving ? 0.1 : 0.15 + 0.08 * Math.sin(ph * 1.3);
    return;
  }
  if (entry.type === "dragon") {
    const R = P.root;
    R.position.set(0, 0, 0); R.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
    P.eyes.scale.set(1, 1, 1); P.fire.scale.setScalar(0.001);
    let flap = 0.25 * Math.sin(ph * 4);
    if (an === "fly" || (an === "fire" && !a.ground)) { R.position.y = 1.1 + 0.15 * Math.sin(ph * 5); flap = 0.9 * Math.sin(ph * 16); }
    if (an === "hop" || (moving && an !== "fly")) R.position.y = Math.abs(Math.sin(ph * 9)) * 0.25;
    if (an === "peek") { const k = clamp((f - (a.peekAt ?? 0.3)) / 0.15); R.position.y = lerp(-0.9, 0, easeOutBack(k)); P.head.rotation.z = 0.25 * Math.sin(ph * 3) * k; }
    if (an === "sleep") { R.rotation.z = 0; R.scale.y = 0.85 + 0.04 * Math.sin(ph * 2); P.head.rotation.x = 0.5; P.eyes.scale.y = 0.12; flap = -0.5; }
    else R.scale.y = 1;
    if (an === "fire") {
      const fk = clamp((f - (a.fireAt ?? 0.4)) / 0.08) * (1 - clamp((f - (a.fireAt ?? 0.4) - (a.fireLen ?? 0.25)) / 0.08));
      P.head.rotation.x = 0.35 * fk;
      P.fire.scale.set(fk * (1 + 0.1 * Math.sin(t * 40)), fk * (1 + 0.1 * Math.sin(t * 33)), fk * (1.2 + 0.25 * Math.sin(t * 27)));
    }
    if (an === "look") P.head.rotation.y = 0.5 * Math.sin(ph * 1.5);
    P.wingL.rotation.z = flap; P.wingR.rotation.z = -flap;
    return;
  }

  resetPose(P);
  // blinks
  if (P.eyes && (ph % 3.7) < 0.12) P.eyes.scale.y = 0.15;
  if (moving || an === "walk") {
    const s = Math.sin(ph * 9);
    P.legL.rotation.x = s * 0.6; P.legR.rotation.x = -s * 0.6;
    P.armL.rotation.x = -s * 0.5; P.armR.rotation.x = s * 0.5;
    P.body.position.y = Math.abs(Math.cos(ph * 9)) * 0.05;
    if (a.pull) { P.armL.rotation.x = 0.55; P.armR.rotation.x = 0.55; P.body.rotation.x = 0.12; }
  } else {
    P.body.position.y = 0.012 * Math.sin(ph * 2.2);
    P.armL.rotation.z = 0.08; P.armR.rotation.z = -0.08;
  }
  if (an === "talk") { P.head.rotation.x = 0.05 * Math.sin(ph * 7); P.armR.rotation.x = -0.6 - 0.25 * Math.sin(ph * 4); P.armR.rotation.z = -0.2; }
  if (an === "present") { P.armL.rotation.z = 1.0 + 0.05 * Math.sin(ph * 3); P.armR.rotation.z = -1.0 - 0.05 * Math.sin(ph * 3); P.armL.rotation.x = -0.4; P.armR.rotation.x = -0.4; }
  if (an === "wave") { P.armR.rotation.z = -2.5 + 0.3 * Math.sin(ph * 9); }
  if (an === "raise") { P.armR.rotation.z = -2.95; P.head.rotation.x = -0.08; }
  if (an === "point") { P.armR.rotation.x = -1.5; P.armR.rotation.y = 0.0; }
  if (an === "shrug") { P.armL.rotation.z = 0.7; P.armR.rotation.z = -0.7; P.armL.rotation.x = -0.6; P.armR.rotation.x = -0.6; P.head.rotation.z = 0.12; }
  if (an === "hammer") { P.armR.rotation.x = -1.5 + 0.75 * Math.sin(ph * 15); P.body.rotation.x = 0.15; P.legL.rotation.x = -0.2; }
  if (an === "sit") {
    P.legL.rotation.x = -1.45; P.legR.rotation.x = -1.45; obj.position.y += a.sitY ?? 0.45;
    P.armL.rotation.x = -0.7; P.armR.rotation.x = -0.7;
  }
  if (a.talk && !(an === "wave" || an === "raise")) {
    const k = 0.5 + 0.5 * Math.sin(ph * 3.3);
    P.head.rotation.x += 0.06 * Math.sin(ph * 7); P.head.rotation.y = 0.1 * Math.sin(ph * 1.3);
    P.armR.rotation.x = -0.7 - 0.35 * k; P.armR.rotation.z = -0.25;
  }
  if (an === "plant") {
    P.body.rotation.x = 0.65; P.head.rotation.x = 0.3;
    P.armR.rotation.x = -1.0 - 0.45 * Math.max(0, Math.sin(ph * 4)); P.armL.rotation.x = -0.6;
    P.legL.rotation.x = -0.25; P.legR.rotation.x = 0.15;
  }
  if (an === "stuck") {
    P.armL.rotation.z = 1.2 + 0.4 * Math.sin(ph * 6); P.armR.rotation.z = -1.2 - 0.4 * Math.sin(ph * 6 + 1);
    P.body.rotation.z = 0.12 * Math.sin(ph * 3); P.head.rotation.z = 0.1 * Math.sin(ph * 3 + 0.5);
  }
  if (an === "sigh") { P.head.rotation.x = 0.25; P.body.rotation.x = 0.06; }
  if (an === "lookup") { P.head.rotation.x = -0.35; }
  if (a.hammer && P.armR) {
    if (!entry.hammer) { entry.hammer = A.hammer(); entry.hammer.position.y = -0.45; entry.hammer.rotation.x = Math.PI / 2; P.armR.add(entry.hammer); }
  }
  if (entry.hammer) entry.hammer.visible = !!a.hammer;
}


// ------------------------------------------------------------------ crowd of citizens
const SHIRTS = ["#e76f51", "#2a9d8f", "#e9c46a", "#6aa7d8", "#8ab17d", "#f4a261", "#9b5de5", "#f15bb5", "#4d908e", "#ffffff", "#577590", "#bc6c25"];
const SKINS = ["#c68a5a", "#b97a4c", "#d9a27a", "#a8693f", "#e0b48c"];
const HIJABS = ["#3d6fb6", "#2a9d8f", "#e76f51", "#6d597a", "#f2cc8f", "#264653"];

function makeCrowd(a) {
  const g = new THREE.Group();
  const r = A.rng(a.seed || 5);
  g.userData.members = [];
  for (let i = 0; i < (a.count || 40); i++) {
    const woman = r() < 0.42, k = r();
    const o = { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], skin: SKINS[Math.floor(r() * SKINS.length)],
      pants: r() < 0.5 ? "#efe6d2" : "#4a4e69" };
    if (woman) { o.mustache = false; if (k < 0.5) { o.hair = "hijab"; o.hijab = HIJABS[Math.floor(r() * HIJABS.length)]; } else o.hair = "bun"; }
    else { o.mustache = r() < 0.55; if (r() < 0.3) o.hat = "straw"; }
    const obj = A.person(o);
    obj.scale.setScalar(0.88 + r() * 0.16);
    g.add(obj);
    g.userData.members.push({ entry: { obj, type: "villager" }, rnd: [r(), r(), r(), r(), r()] });
  }
  return g;
}

function crowdTargets(a, members) {
  if (a._targets) return a._targets;
  const [x0, z0, x1, z1] = a.region || [-10, -8, 10, 10];
  const blocked = (x, z) => (a.avoid || []).some(([ax0, az0, ax1, az1]) => x > ax0 && x < ax1 && z > az0 && z < az1);
  a._targets = members.map(({ rnd }, i) => {
    let u = rnd[0], v = rnd[1], x, z, n = 0;
    do { x = x0 + u * (x1 - x0); z = z0 + v * (z1 - z0); u = (u * 7.31 + 0.137) % 1; v = (v * 3.77 + 0.411) % 1; } while (blocked(x, z) && ++n < 30);
    return [x, z];
  });
  return a._targets;
}

function poseCrowd(e, a, t, shot) {
  const members = e.obj.userData.members;
  const N = Math.min(a.show ?? members.length, members.length);
  const targets = crowdTargets(a, members);
  members.forEach((m, i) => {
    const vis = i < N;
    m.entry.obj.visible = vis;
    if (!vis) return;
    const [r0, r1, r2, r3, r4] = m.rnd;
    const target = targets[i];
    let spec;
    if (a.mode === "arrive") {
      const delay = (i / N) * (a.spread ?? 0.55), travel = a.travel ?? 0.42;
      const start = [(r1 - 0.5) * 2.2, (a.fromZ ?? 36) + r2 * 6];
      spec = { path: [start, [(r3 - 0.5) * 2.2, 17], target], move: [delay, delay + travel], smooth: false, anim: "idle", lookAt: a.lookAt, phase: r4 * 10 };
    } else if (a.mode === "work") {
      const sites = a.sites || [[0, 0, 3]];
      const [sx, sz, sr] = sites[i % sites.length];
      const pts = [0, 1, 2, 3].map(k => { const ang = (r0 + k * 0.27 + r2 * 0.1) * Math.PI * 2; const rr = sr + r1 * 1.4; return [sx + Math.cos(ang) * rr, sz + Math.sin(ang) * rr]; });
      spec = { path: pts, dwell: 0.3, smooth: false, lookAt: [sx, sz], anim: a.workAnim || (r3 < 0.75 ? "hammer" : "talk"), hammer: !a.workAnim && r3 < 0.75, phase: r4 * 10 };
    } else if (a.mode === "cheer") {
      spec = { at: target, lookAt: a.lookAt, anim: r3 < 0.6 ? "wave" : "raise", phase: r4 * 10 };
    } else {
      spec = { at: target, lookAt: a.lookAt, anim: r3 < 0.25 ? "talk" : "idle", talk: r3 < 0.25, phase: r4 * 10 };
    }
    poseActor(m.entry, spec, t + r4 * 0.0, shot);
    if (a.mode === "cheer") m.entry.obj.position.y += Math.max(0, Math.sin((t + r4 * 3) * 7)) * 0.25;
  });
}

function updateActors(t, shot) {
  const seen = new Set();
  for (const a of shot.actors || []) {
    let e = actors.get(a.id);
    if (!e) { const obj = makeActor(a); scene.add(obj); e = { obj, type: a.type }; actors.set(a.id, e); }
    e.obj.visible = true;
    e.obj.scale.setScalar(a.scale || 1);
    const tagKey = a.name ? a.name + "|" + (a.title || "") : null;
    if (e.tag && e.tagKey !== tagKey) { e.obj.remove(e.tag); e.tag = null; }
    if (tagKey && !e.tag) { e.tag = A.nameTag(a.name, a.title); e.tag.position.y = a.tagY || 2.55; e.obj.add(e.tag); e.tagKey = tagKey; }
    if (e.tag) e.tag.visible = !!a.name;
    seen.add(a.id);
    if (e.type === "crowd") { e.obj.scale.setScalar(1); poseCrowd(e, a, t, shot); } else poseActor(e, a, t, shot);
  }
  for (const [id, e] of actors) if (!seen.has(id)) e.obj.visible = false;
}

// ------------------------------------------------------------------ camera
function updateCamera(t, shot) {
  const c = shot.cam;
  const k = clamp((t - shot.start) / (shot.end - shot.start));
  const e = c.ease === "linear" ? k : c.ease === "out" ? 1 - Math.pow(1 - k, 3) : ease(k);
  const to = c.to || c.from;
  const p = v3(c.from.pos).lerp(v3(to.pos), e);
  const l = v3(c.from.look).lerp(v3(to.look), e);
  // gentle handheld drift
  const dr = c.drift ?? 0.06;
  p.x += Math.sin(t * 0.7) * dr; p.y += Math.sin(t * 0.9 + 1) * dr * 0.6;
  camera.position.copy(p);
  camera.fov = lerp(c.from.fov || 45, to.fov || c.from.fov || 45, e);
  camera.updateProjectionMatrix();
  camera.lookAt(l);
}

// ------------------------------------------------------------------ frame
function updateWorld(t) {
  const { m } = clockAt(t);
  const hour = (m / 60) % 24;
  const night = nightFactor(hour);
  const sky = skyAt(hour);
  scene.background = sky;
  scene.fog.color.copy(sky);
  const el = Math.sin(clamp((hour - 5.5) / 13.5) * Math.PI);
  sun.position.set(Math.cos((hour - 6) / 12 * Math.PI) * 60, 15 + Math.max(el, 0.25) * 70, 35);
  sun.intensity = lerp(2.3, 0.45, night);
  sun.color.set(night > 0.5 ? "#9fb6ff" : (hour > 16.5 || hour < 7.5 ? "#ffc58f" : "#fff4dd"));
  hemi.intensity = lerp(1.15, 0.4, night);
  hemi.color.set(night > 0.5 ? "#5a6fb0" : "#dff3ff");
  stars.material.opacity = night;
  moon.material.opacity = night;
  clouds.forEach((c, i) => {
    if (c.userData.drift) c.position.x = c.userData.x0 + t * c.userData.drift;
    if (c.userData.baseY) c.position.y = c.userData.baseY + Math.sin(t * 0.4 + i) * 0.8;
  });
  updateProps(t, hour, night);
  return { hour, night };
}

window.setup = async (tl) => {
  TL = tl;
  await Promise.all(["700 40px Fredoka", "600 40px Fredoka", "900 40px Nunito", "800 40px Nunito"].map(f => document.fonts.load(f)));
  buildWorld(tl.seed || 7);
  for (const spec of tl.props || []) {
    const obj = makeProp(spec);
    obj.position.set(spec.at[0], spec.y || 0, spec.at[1]);
    obj.rotation.y = (spec.rot || 0) * Math.PI / 180;
    if (spec.scale) obj.scale.setScalar(spec.scale);
    scene.add(obj);
    props.set(spec.id, { obj, spec });
  }
  return true;
};

function draw(t) {
  const shot = shotAt(t);
  const w = updateWorld(t);
  updateActors(t, shot);
  updateCamera(t, shot);
  renderer.render(scene, camera);
  ctx.drawImage(glCanvas, 0, 0, W, H);
  return { shot, ...w };
}

window.renderFrame = (t, mime = "image/jpeg") => {
  const st = draw(t);
  drawHUD(ctx, TL, t, { ...st, clock: clockAt(t), pop: populationAt(t) });
  return out.toDataURL(mime, 0.93);
};

// raw 3D frame without HUD (used by tools/logo.js)
window.renderRaw = (t) => { draw(t); return glCanvas.toDataURL("image/png"); };

window.renderCover = (t) => {
  draw(t);
  drawCover(ctx, TL);
  return out.toDataURL("image/jpeg", 0.93);
};

window.ready = true;
