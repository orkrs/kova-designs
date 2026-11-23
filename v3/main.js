const BANDS = ["#ffe08a", "#ffc65c", "#ffa63d", "#ff8a2b", "#f26a1f", "#d9481a", "#b02e16", "#7d2112"];
const GLYPH = {
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  V: ["X...X", "X...X", "X...X", "X...X", ".X.X.", ".X.X.", "..X.."],
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
};
// pixel wordmark
const word = document.querySelector(".word");
"KOVA".split("").forEach((ch, li) => {
  const g = document.createElement("div"); g.className = "glyph";
  GLYPH[ch].forEach((row, y) => [...row].forEach((c, x) => {
    const i = document.createElement("i");
    if (c === "X") { i.style.cssText = `--c:${BANDS[y]};--d:${(li * 5 + x) * 28 + y * 18}ms`; i.className = "on"; }
    g.append(i);
  }));
  word.append(g);
});
// strata skyline
function rnd(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function strata(canvas, seed, opts = {}) {
  const r = rnd(seed), W = canvas.clientWidth, H = canvas.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const cell = opts.cell || Math.max(10, Math.round(W / 96));
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  let h = rows * 0.6; const tops = [];
  for (let x = 0; x < cols; x++) {
    h += (r() - 0.5) * 3.2; h = Math.max(rows * 0.3, Math.min(rows * 0.85, h));
    // occasional spires like pixel stacks
    const spike = r() < 0.09 ? Math.round(r() * rows * 0.35) : 0;
    tops.push(Math.round(h) + spike);
  }
  for (let x = 0; x < cols; x++) for (let y = 0; y < tops[x]; y++) {
    const depth = tops[x] - y; // from top of column
    const gy = rows - y; // global height → band
    const maxTop = Math.max(...tops);
    let bi = Math.floor((1 - y / maxTop) * BANDS.length + (r() - 0.5) * 0.9);
    bi = Math.max(0, Math.min(BANDS.length - 1, bi));
    let col = BANDS[bi];
    if (opts.ore && depth > 2 && r() < 0.012) col = "#fff1d6";
    ctx.fillStyle = col;
    ctx.globalAlpha = depth === 1 ? 1 : 0.94 + r() * 0.06;
    ctx.fillRect(x * cell, H - (y + 1) * cell, cell - (opts.gap ?? 1), cell - (opts.gap ?? 1));
  }
  ctx.globalAlpha = 1;
  return { tops, cell, H };
}
function paint() {
  const c = document.querySelector(".hero .strata");
  const { tops, cell } = strata(c, 1234, { ore: true });
  const place = (el, frac) => { const x = Math.floor(tops.length * frac); el.style.setProperty("--x", x * cell + "px"); el.style.setProperty("--y", tops[x] * cell + "px"); el.style.setProperty("--cell", cell + "px"); };
  place(document.querySelector(".walker"), 0.28);
  place(document.querySelector(".w2"), 0.71);
  strata(document.querySelector(".strata-foot"), 77, { ore: true });
}
paint();
let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(paint, 150); });
