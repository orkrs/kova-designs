// Procedural isometric voxel islands rendered to <canvas> (no assets).
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(rand) {
  const G = 64, v = Array.from({ length: G * G }, rand);
  const at = (x, y) => v[((y % G + G) % G) * G + ((x % G + G) % G)];
  const s = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (x, y) => n(x, y) * 0.55 + n(x * 2.1, y * 2.1) * 0.3 + n(x * 4.3, y * 4.3) * 0.15;
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, v * k)) | 0).join(",")})`;

export const PALETTES = {
  dusk: {
    grass: "#7fbf5a", grassSide: "#6a9b47", dirt: "#9a6446", stone: "#8b8090", deep: "#5d5468",
    sand: "#f0c98f", snow: "#fff3f0", water: "#9fd0ff", trunk: "#6b3f2a", leaf: "#3f8a4f",
    bloom: "#ff9fc4", copper: "#ff8a4c", tin: "#d8dde6",
    light: { top: 1.12, left: 0.92, right: 0.66 }, tint: "#ff8db0", tintAmt: 0.16,
  },
};

export function buildIsland({ seed = 7, N = 30, peak = 11, lake = true, trees = 0.07, depth = 14 } = {}) {
  const r = mulberry(seed), noise = makeNoise(r), cubes = [], occ = new Set();
  const key = (x, y, z) => x + "," + y + "," + z;
  const put = (x, y, z, m) => { const k = key(x, y, z); if (occ.has(k)) return; occ.add(k); cubes.push({ x, y, z, m, j: r() }); };
  const H = [], W = 3, c = (N - 1) / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - c) / c, dy = (y - c) / c;
    const d = Math.sqrt(dx * dx + dy * dy) + (noise(x * 0.21 + 40, y * 0.21) - 0.5) * 0.55;
    const e = noise(x * 0.11, y * 0.11);
    let h = Math.round((e * 1.25 + 0.48 - d * 1.0) * peak);
    if (d > 0.98) h = -99;
    H[y * N + x] = h;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let h = H[y * N + x]; if (h < -50) continue;
    h = Math.max(h, lake ? 1 : 2);
    const dx = (x - c) / c, dy = (y - c) / c, d = Math.sqrt(dx * dx + dy * dy);
    if (h < W && (!lake || d > 0.42 || noise(x * 0.2 + 70, y * 0.2) < 0.45)) h = W;
    const bottom = -Math.round((1 - Math.min(1, d * 1.05)) ** 1.4 * depth * (0.55 + noise(x * 0.3, y * 0.3 + 9) * 0.9)) - 1;
    for (let z = bottom; z < h; z++) {
      let m = z === h - 1 ? (h >= peak + 1 ? "snow" : h <= W && lake && d < 0.5 ? "sand" : "grass") : z >= h - 3 ? "dirt" : "stone";
      if (m === "stone") { const q = r(); m = q < 0.035 ? "copper" : q < 0.05 ? "tin" : z < bottom + 3 ? "deep" : "stone"; }
      put(x, y, z, m);
    }
    if (lake && h < W) for (let z = h; z < W; z++) put(x, y, z, "water");
    if (h > W && h < peak - 1 && r() < trees) {
      const th = 3 + ((r() * 2) | 0), lm = r() < 0.45 ? "bloom" : "leaf";
      for (let z = h; z < h + th; z++) put(x, y, z, "trunk");
      for (let lz = h + th - 1; lz < h + th + 2; lz++) {
        const rad = lz === h + th + 1 ? 0 : 1;
        for (let ly = -rad; ly <= rad; ly++) for (let lx = -rad; lx <= rad; lx++) {
          if (rad && Math.abs(lx) + Math.abs(ly) === 2 && r() < 0.5) continue;
          if (lx === 0 && ly === 0 && lz < h + th) continue;
          put(x + lx, y + ly, lz, lm);
        }
      }
      if (r() < 0.6) put(x, y, h + th + 2, lm);
    }
  }
  cubes.sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.z - b.z || a.x - b.x);
  return { cubes, occ, key };
}

export function drawIsland(canvas, opts = {}) {
  const { haze = "#f6b38f", hazeAmt = 0, pal = PALETTES.dusk, fit = 0.92, anchorY = 0.5 } = opts;
  const { cubes, occ, key } = buildIsland(opts);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth, Hh = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // bounds in unit space
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const P = (x, y, z) => [(x - y) * 0.5, (x + y) * 0.25 - z * 0.5];
  for (const q of cubes) for (const [px, py] of [P(q.x, q.y + 1, q.z), P(q.x + 1, q.y, q.z), P(q.x, q.y, q.z + 1), P(q.x + 1, q.y + 1, q.z)]) {
    if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  const s = Math.min((W * fit) / (maxX - minX), (Hh * fit) / (maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2 - minX * s, oy = (Hh - (maxY - minY) * s) * anchorY - minY * s;
  const T = (x, y, z) => { const [a, b] = P(x, y, z); return [a * s + ox, b * s + oy]; };
  const L = pal.light, tint = hex(pal.tint), hz = hex(haze);
  const col = {}; for (const k in pal) if (typeof pal[k] === "string" && pal[k][0] === "#") col[k] = hex(pal[k]);
  const poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = fill; ctx.lineWidth = 0.6; ctx.stroke(); };
  for (const q of cubes) {
    const { x, y, z, m } = q;
    const isW = m === "water";
    let base = col[m] || col.stone;
    const jit = 0.93 + q.j * 0.12;
    const shade = (face, k, mat = base) => {
      let c = mix(mat, tint, pal.tintAmt * (face === "right" ? 1.6 : face === "left" ? 0.6 : 0.4));
      c = c.map((v) => v * k * jit);
      // atmospheric depth: lower blocks fade a bit into the dusk
      const fog = Math.min(1, hazeAmt + Math.max(0, -z) * 0.018);
      return rgb(mix(c, hz, fog));
    };
    if (!occ.has(key(x, y, z + 1))) {
      let k = L.top;
      if (occ.has(key(x - 1, y, z + 1)) || occ.has(key(x, y - 1, z + 1))) k *= 0.86;
      const fill = isW ? `rgba(${mix(col.water, tint, 0.25).map((v) => v | 0).join(",")},0.82)` : shade("top", k);
      poly([T(x, y, z + 1), T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x, y + 1, z + 1)], fill);
      if (isW && q.j > 0.8) { ctx.fillStyle = "rgba(255,255,255,.45)"; const [a, b] = T(x + 0.3, y + 0.5, z + 1); ctx.fillRect(a, b, s * 0.22, s * 0.05); }
    }
    if (isW) continue;
    const sideMat = m === "grass" ? col.dirt : base;
    if (!occ.has(key(x + 1, y, z))) {
      poly([T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z), T(x + 1, y, z)], shade("right", L.right, sideMat));
      if (m === "grass") poly([T(x + 1, y, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z + 0.72), T(x + 1, y, z + 0.72)], shade("right", L.right * 1.05, col.grass));
    }
    if (!occ.has(key(x, y + 1, z))) {
      poly([T(x, y + 1, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z), T(x, y + 1, z)], shade("left", L.left, sideMat));
      if (m === "grass") poly([T(x, y + 1, z + 1), T(x + 1, y + 1, z + 1), T(x + 1, y + 1, z + 0.72), T(x, y + 1, z + 0.72)], shade("left", L.left * 1.05, col.grass));
    }
  }
}

export function drawCloud(canvas, seed, color = "#ffe1e6", shadow = "#f3a9bd") {
  const r = mulberry(seed), w = 26 + ((r() * 14) | 0), h = 7;
  canvas.width = w; canvas.height = h + 1;
  const ctx = canvas.getContext("2d"), cols = [];
  for (let x = 0; x < w; x++) { const t = x / (w - 1); cols.push(Math.max(1, Math.round(Math.sin(t * Math.PI) * h * (0.65 + r() * 0.35)))); }
  for (let x = 0; x < w; x++) { ctx.fillStyle = shadow; ctx.fillRect(x, h - cols[x] + 1, 1, cols[x]); ctx.fillStyle = color; ctx.fillRect(x, h - cols[x], 1, cols[x]); }
}
