// KOVA voxel engine v2 — procedural isometric scenes with animated assembly,
// emissive blocks and live overlays (smoke, furnace glow, LEDs, rail cart, sparkles).
// Canvas 2D only; static frames are baked to an offscreen bitmap and blitted.

const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function makeNoise(r) {
  const G = 64, v = Array.from({ length: G * G }, r);
  const at = (x, y) => v[((y % G + G) % G) * G + ((x % G + G) % G)];
  const s = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (x, y) => n(x, y) * 0.55 + n(x * 2.1, y * 2.1) * 0.3 + n(x * 4.3, y * 4.3) * 0.15;
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgbs = (c, a = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, v)) | 0).join(" ")}${a < 1 ? " / " + a.toFixed(3) : ""})`;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const easeOutBack = (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInCubic = (t) => t * t * t;

export const PALETTES = {
  dusk: {
    grass: "#7fbf5a", dirt: "#9a6446", stone: "#8b8090", granite: "#b08884", basalt: "#5d5468", deep: "#4a4258",
    sand: "#f0c98f", snow: "#fff3f0", water: "#9fd0ff", trunk: "#6b3f2a", leaf: "#3f8a4f", bloom: "#ff9fc4",
    copper: "#ff8a4c", tin: "#dfe3ea", gold: "#ffd23f",
    brick: "#b4563c", brickDark: "#7a3527", stripe: "#f1e4d2", roof: "#4f8a84", ridge: "#e08a4c",
    casing: "#a6abb5", casingDark: "#656b79", bronze: "#d48a38", gravel: "#8a8088", plank: "#a4723f", post: "#3b3442",
    glow: "#ffb347", window: "#ffd486", lamp: "#ffe6a8", crystal: "#8ff3ff", banner: "#ffcf7a", rail: "#3a3540",
    light: { top: 1.12, left: 0.92, right: 0.66 }, tint: "#ff8db0", tintAmt: 0.16,
  },
  arcane: {
    grass: "#5fae8e", dirt: "#5d4766", stone: "#5f5873", granite: "#7a6a8e", basalt: "#3d3550", deep: "#2f2942",
    sand: "#c9b7e0", snow: "#eef0ff", water: "#7fd8ff", trunk: "#3f2d4a", leaf: "#6a4fa8", bloom: "#4fd6c8",
    copper: "#b48cff", tin: "#8ff3ff", gold: "#ff7fa6",
    brick: "#a7a1bd", brickDark: "#77708f", stripe: "#e9ecff", roof: "#5b3f9e", ridge: "#8ff3ff",
    casing: "#8c86a6", casingDark: "#4b4562", bronze: "#b48cff", gravel: "#5f5873", plank: "#6a4fa8", post: "#2f2942",
    glow: "#8ff3ff", window: "#b7f6ff", lamp: "#c8fbff", crystal: "#8ff3ff", banner: "#ff7fa6", rail: "#2f2942",
    light: { top: 1.08, left: 0.86, right: 0.6 }, tint: "#6d5cff", tintAmt: 0.2,
  },
};
const EMISSIVE = new Set(["glow", "window", "lamp", "crystal", "banner"]);

class Builder {
  constructor() { this.map = new Map(); this.f = { smoke: [], glow: [], leds: [], rail: [], sparkle: [] }; }
  k(x, y, z) { return ((x + 128) * 512 + (y + 128)) * 1024 + (z + 512); }
  has(x, y, z) { return this.map.has(this.k(x, y, z)); }
  put(x, y, z, m) { const k = this.k(x, y, z); if (!this.map.has(k)) this.map.set(k, { x, y, z, m }); }
  set(x, y, z, m) { this.map.set(this.k(x, y, z), { x, y, z, m }); }
  box(x0, y0, z0, w, d, h, m) { for (let z = z0; z < z0 + h; z++) for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, z, m); }
}

function terrain(b, r, noise, o) {
  const { N, peak, depth, plot, plotH, trees = 0.04, lake = false, margin = 0 } = o;
  const c = (N - 1) / 2, top = new Map(), W = 3;
  const inPlot = (x, y) => plot && x >= plot[0] && x <= plot[1] && y >= plot[2] && y <= plot[3];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - c) / c, dy = (y - c) / c;
    const d = Math.sqrt(dx * dx + dy * dy) + (noise(x * 0.21 + 40, y * 0.21) - 0.5) * 0.5;
    if (d > 0.98 && !inPlot(x, y)) continue;
    const e = noise(x * 0.11, y * 0.11);
    let h = Math.max(2, Math.round((e * 1.2 + 0.45 - d * 0.95) * peak));
    if (inPlot(x, y)) h = plotH;
    else if (plot) { // soften the terrace next to the plot
      const px = Math.max(plot[0] - x, 0, x - plot[1]), py = Math.max(plot[2] - y, 0, y - plot[3]);
      if (px + py <= 2) h = Math.round((h + plotH) / 2);
    }
    const dd = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 1.02);
    const rim = Math.max(2, Math.round(depth * 0.22));
    const bottom = -Math.round((1 - dd) ** 1.35 * depth * (0.55 + noise(x * 0.3, y * 0.3 + 9) * 0.9)) - rim;
    top.set(x + "," + y, h);
    for (let z = bottom; z < h; z++) {
      let m;
      if (z === h - 1) m = h >= peak + 1 ? "snow" : lake && h <= W ? "sand" : "grass";
      else if (z >= h - 2) m = "dirt";
      else {
        // geology: wavy strata bands + clustered ore veins
        const band = (((z + Math.floor(noise(x * 0.15 + 5, y * 0.15) * 4)) % 7) + 7) % 7;
        m = z < bottom + 3 ? "deep" : band < 2 ? "granite" : band === 5 ? "basalt" : "stone";
        const vein = noise(x * 0.35 + z * 0.6, y * 0.35 - z * 0.45 + 30);
        if (vein > 0.7) m = vein > 0.76 ? "gold" : (x + y + z) % 3 ? "copper" : "tin";
      }
      b.put(x, y, z, m);
    }
    if (lake && h < W) for (let z = h; z < W; z++) b.put(x, y, z, "water");
    const far = !plot || Math.max(plot[0] - x, 0, x - plot[1]) + Math.max(plot[2] - y, 0, y - plot[3]) > margin;
    if (!inPlot(x, y) && far && h > 2 && h < peak && r() < trees) tree(b, r, x, y, h);
  }
  return { top, c, ci: Math.round(c) };
}
function tree(b, r, x, y, h) {
  const th = 3 + ((r() * 2) | 0), lm = r() < 0.45 ? "bloom" : "leaf";
  for (let z = h; z < h + th; z++) b.put(x, y, z, "trunk");
  for (let lz = h + th - 1; lz < h + th + 2; lz++) {
    const rad = lz === h + th + 1 ? 0 : 1;
    for (let ly = -rad; ly <= rad; ly++) for (let lx = -rad; lx <= rad; lx++) {
      if (rad && Math.abs(lx) + Math.abs(ly) === 2 && r() < 0.5) continue;
      if (lx === 0 && ly === 0 && lz < h + th) continue;
      b.put(x + lx, y + ly, lz, lm);
    }
  }
}

// ---------- scenes ----------
function industrial(seed, small = false) {
  const r = rng(seed), noise = makeNoise(r), b = new Builder();
  const N = 36, P = 6;
  const ci = 18;
  const plot = [ci - 9, ci + 7, ci - 10, ci + 6];
  terrain(b, r, noise, { N, peak: 8, depth: 19, plot, plotH: P, trees: 0.045, margin: 2 });
  const g = P; // ground z (first free layer)
  // paved yard
  for (let y = plot[2]; y <= plot[3]; y++) for (let x = plot[0]; x <= plot[1]; x++) if ((x * 7 + y * 3) % 5 === 0) b.set(x, y, g - 1, "gravel");
  // factory hall (brick, windows, gabled roof)
  const hx = ci - 8, hy = ci - 7, hw = 10, hd = 6, hh = 6;
  for (let z = g; z < g + hh; z++) for (let y = hy; y < hy + hd; y++) for (let x = hx; x < hx + hw; x++) {
    const edge = x === hx || x === hx + hw - 1 || y === hy || y === hy + hd - 1;
    if (!edge) continue;
    let m = (z === g || z === g + hh - 1) ? "brickDark" : "brick";
    if ((x === hx + hw - 1 || x === hx) && y > hy && y < hy + hd - 1 && (y - hy) % 1 === 0 && (y - hy) % 2 === 1 && z >= g + 1 && z <= g + 3) m = z === g + 1 ? "brickDark" : "window";
    if (y === hy + hd - 1 && (x - hx) % 2 === 1 && z >= g + 2 && z <= g + 3) m = "window";
    if (x === hx + 4 && y === hy + hd - 1 && z < g + 2) m = "post"; // door
    if ((x === hx || x === hx + hw - 1) && (y === hy || y === hy + hd - 1)) m = "brickDark"; // pilasters
    b.set(x, y, z, m);
  }
  for (let k = 0; k < 3; k++) for (let y = hy - 1 + k; y <= hy + hd - k; y++) for (let x = hx - 1; x <= hx + hw; x++) {
    if (y < hy - 1 + k || y > hy + hd - k) continue;
    b.set(x, y, g + hh + k, k === 2 ? "ridge" : "roof");
  }
  // striped chimneys behind the hall
  for (const [cx, cy, chh] of [[hx + 1, hy - 3, 19], [hx + 5, hy - 3, 15]]) {
    for (let z = g; z < g + chh; z++) {
      const m = z >= g + chh - 1 ? "brickDark" : (z - g) > 4 && Math.floor((z - g) / 2) % 3 === 0 ? "stripe" : "brick";
      b.box(cx, cy, z, 2, 2, 1, m);
    }
    b.f.smoke.push({ x: cx + 1, y: cy + 1, z: g + chh, s: 1 });
  }
  // blast furnace: steel casing with glowing mouth
  const fx = ci + 2, fy = ci - 5;
  b.box(fx, fy, g, 4, 4, 5, "casing");
  b.box(fx + 1, fy + 1, g + 5, 2, 2, 3, "casingDark");
  b.set(fx + 1, fy + 3, g + 1, "glow"); b.set(fx + 2, fy + 3, g + 1, "glow"); b.set(fx + 1, fy + 3, g + 2, "glow"); b.set(fx + 2, fy + 3, g + 2, "glow");
  b.set(fx + 3, fy + 1, g + 1, "glow"); b.set(fx + 3, fy + 2, g + 1, "glow");
  for (let x = fx; x < fx + 4; x++) b.set(x, fy + 3, g + 4, "bronze");
  b.f.glow.push({ x: fx + 2, y: fy + 4, z: g + 2, r: 3.4, c: [255, 170, 70] });
  b.f.glow.push({ x: fx + 4, y: fy + 1.5, z: g + 1.5, r: 2.2, c: [255, 170, 70] });
  b.f.smoke.push({ x: fx + 2, y: fy + 2, z: g + 8, s: 0.8 });
  b.f.leds.push({ x: fx, y: fy + 3, z: g + 3, face: "left", u: 0.3, v: 0.5, c: "#6dff8a", mode: 0 });
  b.f.leds.push({ x: fx, y: fy + 3, z: g + 3, face: "left", u: 0.65, v: 0.5, c: "#ffd23f", mode: 1 });
  // machine row (GregTech casings with status LEDs)
  const my = ci + 1;
  [[ci - 7, "casing"], [ci - 6, "bronze"], [ci - 5, "casing"], [ci - 3, "casingDark"], [ci - 2, "bronze"], [ci + 0, "casing"]].forEach(([x, m], i) => {
    b.set(x, my, g, m); if (i % 2 === 0) b.set(x, my, g + 1, i === 4 ? "bronze" : "casingDark");
    b.f.leds.push({ x, y: my, z: g, face: "left", u: 0.3, v: 0.62, c: i % 3 ? "#6dff8a" : "#ffd23f", mode: i % 3 });
    b.f.leds.push({ x, y: my, z: g, face: "left", u: 0.66, v: 0.62, c: "#6dff8a", mode: (i + 1) % 3 });
  });
  // pipe from machines to furnace
  for (let x = ci - 7; x <= fx; x++) b.put(x, my - 1, g + 2, "casingDark");
  // crates & ore piles
  b.set(ci + 4, ci + 1, g, "plank"); b.set(ci + 5, ci + 1, g, "plank"); b.set(ci + 4, ci + 1, g + 1, "plank");
  b.set(ci + 5, ci - 1, g, "copper"); b.set(ci + 6, ci - 1, g, "tin"); b.set(ci + 5, ci - 1, g + 1, "copper");
  // lamp posts
  for (const [lx, ly] of [[ci - 8, ci + 3], [ci + 1, ci + 3], [ci + 6, ci - 7]]) {
    b.set(lx, ly, g, "post"); b.set(lx, ly, g + 1, "post"); b.set(lx, ly, g + 2, "lamp");
    b.f.glow.push({ x: lx + 0.5, y: ly + 0.5, z: g + 2.5, r: 1.6, c: [255, 220, 150], soft: true });
  }
  // rail along the front edge
  const ry = ci + 5;
  for (let x = plot[0]; x <= plot[1]; x++) { b.set(x, ry, g - 1, "rail"); b.f.rail.push({ x, y: ry, z: g }); }
  return b;
}
function mineIsland(seed) {
  const r = rng(seed), noise = makeNoise(r), b = new Builder();
  const N = 16, ci = 8; terrain(b, r, noise, { N, peak: 7, depth: 10, plot: [ci - 3, ci + 2, ci - 3, ci + 2], plotH: 5, trees: 0.07 });
  const g = 5;
  // headframe over the shaft
  for (const [x, y] of [[ci - 2, ci - 2], [ci + 1, ci - 2], [ci - 2, ci + 1], [ci + 1, ci + 1]]) for (let z = g; z < g + 5; z++) b.set(x, y, z, "plank");
  b.box(ci - 2, ci - 2, g + 5, 4, 4, 1, "plank");
  b.set(ci - 1, ci - 1, g + 6, "casingDark"); b.set(ci, ci - 1, g + 6, "casingDark");
  for (const [x, y] of [[ci - 1, ci - 1], [ci, ci - 1], [ci - 1, ci], [ci, ci]]) b.set(x, y, g - 1, "post");
  // ore heaps
  b.set(ci + 3, ci, g, "copper"); b.set(ci + 3, ci + 1, g, "tin"); b.set(ci + 2, ci + 3, g, "gold"); b.set(ci + 3, ci + 1, g + 1, "copper");
  b.set(ci - 4, ci + 2, g, "lamp"); b.f.glow.push({ x: ci - 3.5, y: ci + 2.5, z: g + 0.5, r: 1.4, c: [255, 220, 150], soft: true });
  return b;
}
function houseIsland(seed) {
  const r = rng(seed), noise = makeNoise(r), b = new Builder();
  const N = 13, ci = 6; terrain(b, r, noise, { N, peak: 6, depth: 8, plot: [ci - 2, ci + 2, ci - 2, ci + 2], plotH: 4, trees: 0.12 });
  const g = 4;
  for (let z = g; z < g + 3; z++) for (let y = ci - 2; y <= ci + 1; y++) for (let x = ci - 2; x <= ci + 1; x++) {
    const edge = x === ci - 2 || x === ci + 1 || y === ci - 2 || y === ci + 1; if (!edge) continue;
    b.set(x, y, z, z === g + 1 && ((x === ci + 1 && y === ci - 1) || (y === ci + 1 && x === ci - 1)) ? "window" : (x === ci - 2 || x === ci + 1) && (y === ci - 2 || y === ci + 1) ? "plank" : "brick");
  }
  for (let k = 0; k < 2; k++) for (let y = ci - 3 + k; y <= ci + 2 - k; y++) for (let x = ci - 3; x <= ci + 2; x++) b.set(x, y, g + 3 + k, "brickDark");
  b.set(ci + 1, ci - 2, g + 5, "brick"); b.set(ci + 1, ci - 2, g + 6, "brick");
  b.f.smoke.push({ x: ci + 1.5, y: ci - 1.5, z: g + 7, s: 0.55 });
  return b;
}
function arcaneIsland(seed) {
  const r = rng(seed), noise = makeNoise(r), b = new Builder();
  const N = 34, ci = 17; const t = terrain(b, r, noise, { N, peak: 11, depth: 17, plot: [ci - 5, ci + 4, ci - 5, ci + 4], plotH: 6, trees: 0.05 });
  const g = 6;
  const tower = (x0, y0, w, hgt, roof) => {
    for (let z = g - 1; z < g + hgt; z++) for (let y = y0; y < y0 + w; y++) for (let x = x0; x < x0 + w; x++) b.set(x, y, z, (z + x + y) % 5 ? "brick" : "brickDark");
    for (let y = y0; y < y0 + w; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + w - 1;
      if (!roof && edge && (x + y) % 2 === 0) b.set(x, y, g + hgt, "brick");
    }
    if (roof) for (let k = 0; k * 2 < w; k++) for (let y = y0 + k; y < y0 + w - k; y++) for (let x = x0 + k; x < x0 + w - k; x++) b.set(x, y, g + hgt + k, "roof");
    if (w >= 3) { b.set(x0 + 1, y0 + w - 1, g + hgt - 3, "window"); b.set(x0 + w - 1, y0 + 1, g + hgt - 3, "window"); }
    return g + hgt;
  };
  const t1 = tower(ci - 2, ci - 2, 5, 10, true);
  b.set(ci, ci, t1 + 3, "banner"); b.set(ci, ci, t1 + 4, "banner");
  tower(ci + 3, ci - 4, 3, 7, false);
  tower(ci - 5, ci + 2, 3, 6, true);
  for (let x = ci - 4; x <= ci + 3; x++) for (let z = g - 1; z < g + 3; z++) b.set(x, ci + 3, z, (x + z) % 2 ? "brick" : "brickDark");
  // crystals: on surface, hanging below
  for (let i = 0; i < 70; i++) {
    const x = (r() * 34) | 0, y = (r() * 34) | 0, h = t.top.get(x + "," + y);
    if (h == null) continue;
    if (Math.abs(x - ci) < 6 && Math.abs(y - ci) < 6) continue;
    if (i % 2) { const L = 1 + ((r() * 3) | 0); for (let z = h; z < h + L; z++) b.set(x, y, z, "crystal"); b.f.sparkle.push({ x: x + 0.5, y: y + 0.5, z: h + L }); }
    else { let lo = 0; for (let z = h; z > -40; z--) if (b.has(x, y, z)) lo = z; const L = 1 + ((r() * 4) | 0); for (let z = lo - 1; z >= lo - L; z--) b.set(x, y, z, "crystal"); }
  }
  b.f.glow.push({ x: ci + 0.5, y: ci + 0.5, z: t1 + 4, r: 2.4, c: [255, 127, 166], soft: true });
  return b;
}
function shardIsland(seed, n = 12) {
  const r = rng(seed), noise = makeNoise(r), b = new Builder();
  const t = terrain(b, r, noise, { N: n, peak: 6, depth: 9, trees: 0.1 });
  for (let i = 0; i < 10; i++) { const x = (r() * n) | 0, y = (r() * n) | 0, h = t.top.get(x + "," + y); if (h == null) continue; const L = 1 + ((r() * 3) | 0); for (let z = h; z < h + L; z++) b.set(x, y, z, "crystal"); b.f.sparkle.push({ x: x + 0.5, y: y + 0.5, z: h + L }); }
  return b;
}
const SCENES = { industrial, mine: mineIsland, house: houseIsland, arcane: arcaneIsland, shard: shardIsland };

// ---------- view ----------
export class IslandView {
  constructor(canvas, { scene, seed = 1, pal = "dusk", haze = null, hazeAmt = 0, fit = 0.9, anchorY = 0.5, padTop = 0, dprCap = 1.75, smokeScale = 1, fx = true } = {}) {
    Object.assign(this, { canvas, scene, seed, pal: PALETTES[pal], haze, hazeAmt, fit, anchorY, padTop, dprCap, smokeScale, fxOn: fx });
    this.ctx = canvas.getContext("2d");
    const b = SCENES[scene](seed);
    this.cubes = [...b.map.values()].sort((a, c) => a.x + a.y - (c.x + c.y) || a.z - c.z || a.x - c.x);
    this.occ = b.map; this.k = b.k.bind(b); this.f = b.f;
    this.visible = false; this.anim = null; this.particles = []; this.fxAlpha = 0; this.last = 0; this.spawnAcc = 0;
    this.layout();
  }
  P(x, y, z) { return [(x - y) * 0.5 * this.s + this.ox, ((x + y) * 0.25 - z * 0.5) * this.s + this.oy]; }
  layout() {
    const c = this.canvas, W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return false;
    const dpr = Math.min(this.dprCap, devicePixelRatio || 1);
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); this.W = W; this.H = H; this.dpr = dpr;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const q of this.cubes) {
      const xs = [(q.x - q.y - 1) * 0.5, (q.x - q.y + 1) * 0.5], ys = [(q.x + q.y) * 0.25 - (q.z + 1) * 0.5, (q.x + q.y + 2) * 0.25 - q.z * 0.5];
      if (xs[0] < minX) minX = xs[0]; if (xs[1] > maxX) maxX = xs[1]; if (ys[0] < minY) minY = ys[0]; if (ys[1] > maxY) maxY = ys[1];
    }
    const availH = H * (1 - this.padTop);
    this.s = Math.min((W * this.fit) / (maxX - minX), (availH * this.fit) / (maxY - minY));
    this.ox = (W - (maxX - minX) * this.s) / 2 - minX * this.s;
    this.oy = H * this.padTop + (availH - (maxY - minY) * this.s) * this.anchorY - minY * this.s;
    this.buildPaths();
    this.bake();
    return true;
  }
  buildPaths() {
    const pal = this.pal, L = pal.light, tint = hex(pal.tint), hz = this.haze ? hex(this.haze) : null;
    const col = {}; for (const k in pal) if (typeof pal[k] === "string" && pal[k][0] === "#") col[k] = hex(pal[k]);
    const has = (x, y, z) => this.occ.has(this.k(x, y, z));
    const T = (x, y, z) => this.P(x, y, z);
    const poly = (pts) => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; };
    const rr = rng(this.seed * 31 + 7);
    let cx = 0, cy = 0, zmin = 1e9, zmax = -1e9, rmax = 0;
    for (const q of this.cubes) { cx += q.x; cy += q.y; zmin = Math.min(zmin, q.z); zmax = Math.max(zmax, q.z); }
    cx /= this.cubes.length; cy /= this.cubes.length;
    for (const q of this.cubes) rmax = Math.max(rmax, Math.hypot(q.x - cx, q.y - cy));
    this.items = [];
    for (const q of this.cubes) {
      const { x, y, z, m } = q, emi = EMISSIVE.has(m), isW = m === "water";
      const base = col[m] || col.stone, jit = 0.93 + rr() * 0.12;
      const shade = (face, k, mat = base) => {
        if (emi) { const e = face === "top" ? 1.06 : face === "left" ? 1 : 0.9; return rgbs(mat.map((v) => v * e)); }
        let c = mix(mat, tint, pal.tintAmt * (face === "right" ? 1.6 : face === "left" ? 0.6 : 0.4)).map((v) => v * k * jit);
        const fog = hz ? Math.min(1, this.hazeAmt + Math.max(0, -z) * 0.012) : Math.min(0.5, Math.max(0, -z) * 0.014);
        return rgbs(mix(c, hz || [52, 36, 76], fog));
      };
      const faces = [];
      if (!has(x, y, z + 1)) {
        let k = L.top; if (has(x - 1, y, z + 1) || has(x, y - 1, z + 1)) k *= 0.86;
        faces.push([poly([T(x, y, z + 1), T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x, y + 1, z + 1)]), isW ? "rgb(170 200 255 / .8)" : shade("top", k)]);
        if (m === "rail") { // sleepers + steel rails along x
          for (const u of [0.15, 0.5, 0.85]) faces.push([poly([T(x + u - 0.07, y + 0.12, z + 1), T(x + u + 0.07, y + 0.12, z + 1), T(x + u + 0.07, y + 0.88, z + 1), T(x + u - 0.07, y + 0.88, z + 1)]), rgbs(hex("#6b4a35"))]);
          for (const v of [0.3, 0.7]) faces.push([poly([T(x, y + v - 0.04, z + 1), T(x + 1, y + v - 0.04, z + 1), T(x + 1, y + v + 0.04, z + 1), T(x, y + v + 0.04, z + 1)]), "rgb(210 205 220)"]);
        }
      }
      const side = m === "grass" ? col.dirt : m === "rail" ? col.gravel : base;
      if (!has(x + 1, y, z)) {
        faces.push([poly([T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z), T(x + 1, y, z)]), shade("right", L.right, side)]);
        if (m === "grass") faces.push([poly([T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z + 0.72), T(x + 1, y, z + 0.72)]), shade("right", L.right * 1.05, col.grass)]);
        if (m === "brick" || m === "brickDark") faces.push([poly([T(x + 1, y, z + 0.52), T(x + 1, y + 1, z + 0.52), T(x + 1, y + 1, z + 0.46), T(x + 1, y, z + 0.46)]), "rgb(40 20 30 / .25)"]);
      }
      if (!has(x, y + 1, z)) {
        faces.push([poly([T(x, y + 1, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z), T(x, y + 1, z)]), shade("left", L.left, side)]);
        if (m === "grass") faces.push([poly([T(x, y + 1, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z + 0.72), T(x, y + 1, z + 0.72)]), shade("left", L.left * 1.05, col.grass)]);
        if (m === "brick" || m === "brickDark") faces.push([poly([T(x, y + 1, z + 0.52), T(x + 1, y + 1, z + 0.52), T(x + 1, y + 1, z + 0.46), T(x, y + 1, z + 0.46)]), "rgb(40 20 30 / .25)"]);
      }
      if (!faces.length) continue;
      const dist = Math.hypot(x - cx, y - cy) / rmax;
      this.items.push({ faces, d: clamp01(dist * 0.55 + ((z - zmin) / (zmax - zmin)) * 0.3 + rr() * 0.15), z });
    }
  }
  drawCubes(ctx, t, mode) {
    const dpr = this.dpr, rise = this.s * 9;
    for (const it of this.items) {
      let dy = 0, a = 1;
      if (mode === "in") { const l = clamp01((t - it.d * 0.62) / 0.38); if (l <= 0) continue; dy = (1 - easeOutBack(l)) * rise; a = Math.min(1, l * 2.5); }
      else if (mode === "out") { const l = clamp01((t - (1 - it.d) * 0.55) / 0.45); if (l >= 1) continue; dy = easeInCubic(l) * rise * 1.4; a = 1 - l; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, dy * dpr);
      ctx.globalAlpha = a;
      for (const [p, fill] of it.faces) { ctx.fillStyle = fill; ctx.fill(p); ctx.strokeStyle = fill; ctx.lineWidth = 0.5; ctx.stroke(p); }
    }
    ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  bake() {
    const off = this.off || (this.off = document.createElement("canvas"));
    off.width = this.canvas.width; off.height = this.canvas.height;
    const o = off.getContext("2d"); o.clearRect(0, 0, off.width, off.height); this.drawCubes(o, 1, null);
  }
  // ----- animation control -----
  play(mode, dur, delay = 0) {
    return new Promise((res) => { this.anim = { mode, dur, t0: performance.now() + delay, res }; this.visible = true; });
  }
  show(on) { this.visible = on; this.anim = null; this.fxAlpha = on ? 1 : 0; }
  frame(now, running) {
    const ctx = this.ctx, dpr = this.dpr; if (!this.W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    if (this.anim) {
      const t = (now - this.anim.t0) / this.anim.dur;
      if (t < 0) { if (this.anim.mode === "out") this.drawCubes(ctx, 0, "out"); return; }
      if (t >= 1) { const { mode, res } = this.anim; this.anim = null; this.visible = mode === "in"; this.fxAlpha = mode === "in" ? 0 : 0; res(); }
      else { this.drawCubes(ctx, t, this.anim.mode); if (this.anim.mode === "out") this.fx(ctx, now, dt, running, Math.max(0, 1 - t * 2)); return; }
    }
    if (!this.visible) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.off, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fxAlpha = Math.min(1, this.fxAlpha + dt * 1.5);
    if (!running) this.fxAlpha = 1;
    this.fx(ctx, now, dt, running, this.fxAlpha);
  }
  fx(ctx, now, dt, running, alpha) {
    if (!this.fxOn || alpha <= 0) return;
    const s = this.s, t = now / 1000, f = this.f;
    ctx.save(); ctx.globalAlpha = alpha;
    // glows (furnace flicker = smooth sum of sines, never flashes)
    ctx.globalCompositeOperation = "lighter";
    f.glow.forEach((g, i) => {
      const [gx, gy] = this.P(g.x, g.y, g.z);
      const fl = g.soft ? 0.85 + 0.15 * Math.sin(t * 1.3 + i) : 0.75 + 0.14 * Math.sin(t * 7.1 + i) + 0.08 * Math.sin(t * 13.7 + i * 2) + 0.05 * Math.sin(t * 2.3);
      const R = g.r * s * (g.soft ? 1 : 0.9 + 0.1 * fl);
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
      gr.addColorStop(0, `rgb(${g.c.join(" ")} / ${(0.55 * fl).toFixed(3)})`); gr.addColorStop(0.4, `rgb(${g.c.join(" ")} / ${(0.2 * fl).toFixed(3)})`); gr.addColorStop(1, `rgb(${g.c.join(" ")} / 0)`);
      ctx.fillStyle = gr; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = "source-over";
    // LEDs (slow blink, ≤1 Hz)
    for (const l of f.leds) {
      const p = l.face === "left" ? this.P(l.x + l.u, l.y + 1, l.z + l.v) : this.P(l.x + 1, l.y + l.u, l.z + l.v);
      const on = l.mode === 0 ? 1 : l.mode === 1 ? (Math.sin(t * 2.4 + l.x) > -0.3 ? 1 : 0.25) : 0.55 + 0.45 * Math.sin(t * 1.6 + l.x * 1.7);
      const sz = Math.max(1.5, s * 0.16);
      ctx.fillStyle = l.c; ctx.globalAlpha = alpha * on; ctx.fillRect(p[0] - sz / 2, p[1] - sz / 2, sz, sz);
      ctx.globalAlpha = alpha * on * 0.35; ctx.fillRect(p[0] - sz, p[1] - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = alpha;
    // rail cart (ping-pong along the track)
    if (f.rail.length > 2) {
      const n = f.rail.length - 1, ph = (t * 0.06) % 2, u = ph < 1 ? ph : 2 - ph;
      const e = u * u * (3 - 2 * u), pos = e * (n - 0.2), i0 = Math.floor(pos), fr = pos - i0;
      const a = f.rail[i0], x = a.x + fr + 0.1, y = a.y + 0.15, z = a.z + 0.05, w = 0.8, h = 0.55;
      const T = (X, Y, Z) => this.P(X, Y, Z);
      const quad = (pts, c) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (let k = 1; k < 4; k++) ctx.lineTo(...pts[k]); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
      quad([T(x + w, y, z + h), T(x + w, y + 0.7, z + h), T(x + w, y + 0.7, z), T(x + w, y, z)], "#3c3647");
      quad([T(x, y + 0.7, z + h), T(x + w, y + 0.7, z + h), T(x + w, y + 0.7, z), T(x, y + 0.7, z)], "#5a5368");
      quad([T(x, y, z + h), T(x + w, y, z + h), T(x + w, y + 0.7, z + h), T(x, y + 0.7, z + h)], "#ff9a55");
      quad([T(x + 0.2, y + 0.15, z + h + 0.01), T(x + 0.45, y + 0.15, z + h + 0.01), T(x + 0.45, y + 0.45, z + h + 0.01), T(x + 0.2, y + 0.45, z + h + 0.01)], "#e9edf3");
    }
    // smoke (pixel puffs, sunset-lit)
    const px = Math.max(2, Math.round(s * 0.34));
    if (running) {
      this.spawnAcc += dt;
      while (this.spawnAcc > 0.16) {
        this.spawnAcc -= 0.16;
        for (const e of f.smoke) { const [ex, ey] = this.P(e.x, e.y, e.z); this.particles.push({ x: ex + (Math.random() - 0.5) * s * 0.6, y: ey, vx: (6 + Math.random() * 8) * s / 22, vy: -(16 + Math.random() * 10) * s / 22 * e.s, life: 0, max: 4 + Math.random() * 2.5, sz: e.s * this.smokeScale, kind: 0 }); }
        for (const e of f.sparkle) if (Math.random() < 0.12) { const [ex, ey] = this.P(e.x, e.y, e.z); this.particles.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 4, vy: -(10 + Math.random() * 12) * s / 22, life: 0, max: 2.5 + Math.random() * 2, sz: 0.4, kind: 1 }); }
      }
      for (const p of this.particles) { p.life += dt; p.x += p.vx * dt * (1 + p.life * 0.4); p.y += p.vy * dt; }
      this.particles = this.particles.filter((p) => p.life < p.max);
    }
    for (const p of this.particles) {
      const k = p.life / p.max;
      if (p.kind === 1) { ctx.fillStyle = k < 0.5 ? "#c8fbff" : "#ff9fd0"; ctx.globalAlpha = alpha * (1 - k) * 0.9; const q = Math.max(1.5, px * 0.45); ctx.fillRect(Math.round(p.x / q) * q, Math.round(p.y / q) * q, q, q); continue; }
      const size = px * p.sz * (1.2 + k * 3.2), c = mix([92, 78, 104], [238, 196, 214], Math.min(1, k * 1.6));
      ctx.globalAlpha = alpha * (k < 0.12 ? k / 0.12 : 1) * (1 - k) * 0.55;
      ctx.fillStyle = rgbs(c);
      const q = px; ctx.fillRect(Math.round((p.x - size / 2) / q) * q, Math.round((p.y - size / 2) / q) * q, Math.ceil(size / q) * q, Math.ceil(size / q) * q);
    }
    ctx.restore();
  }
  prewarm(sec = 5) { const step = 1 / 30; let now = 0; for (let i = 0; i < sec * 30; i++) { now += step * 1000; this.last = now - step * 1000; this.fxSim(step); } }
  fxSim(dt) { // advance particles without drawing (for reduced motion snapshot)
    this.spawnAcc += dt; const s = this.s;
    while (this.spawnAcc > 0.16) { this.spawnAcc -= 0.16; for (const e of this.f.smoke) { const [ex, ey] = this.P(e.x, e.y, e.z); this.particles.push({ x: ex + (Math.random() - 0.5) * s * 0.6, y: ey, vx: (6 + Math.random() * 8) * s / 22, vy: -(16 + Math.random() * 10) * s / 22 * e.s, life: 0, max: 4 + Math.random() * 2.5, sz: e.s * this.smokeScale, kind: 0 }); } }
    for (const p of this.particles) { p.life += dt; p.x += p.vx * dt * (1 + p.life * 0.4); p.y += p.vy * dt; }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }
}

// static one-shot render helper (thumbnails, launcher icons)
export function renderStatic(canvas, opts) { const v = new IslandView(canvas, { dprCap: 2, ...opts }); v.prewarm(4); v.show(true); v.frame(performance.now(), false); return v; }

export function drawCloud(canvas, seed, color = "#ffe1e6", shadow = "#f3a9bd") {
  const r = rng(seed), w = 26 + ((r() * 14) | 0), h = 7;
  canvas.width = w; canvas.height = h + 1;
  const ctx = canvas.getContext("2d"), cols = [];
  for (let x = 0; x < w; x++) { const t = x / (w - 1); cols.push(Math.max(1, Math.round(Math.sin(t * Math.PI) * h * (0.65 + r() * 0.35)))); }
  for (let x = 0; x < w; x++) { ctx.fillStyle = shadow; ctx.fillRect(x, h - cols[x] + 1, 1, cols[x]); ctx.fillStyle = color; ctx.fillRect(x, h - cols[x], 1, cols[x]); }
}
