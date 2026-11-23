import { drawIsland, drawCloud, PALETTES } from "./voxel.js?v=5";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TFG = { seed: 11, N: 36, peak: 13, trees: 0.035, depth: 18 };
const RPG = { seed: 29, N: 34, peak: 11, trees: 0.04, depth: 17, castle: true, crystals: 0.05, lake: false, pal: PALETTES.arcane };
const kind = (k) => (k === "rpg" ? RPG : TFG);
function haze(c) {
  const px = 8, W = Math.ceil(c.clientWidth / px), H = Math.ceil(c.clientHeight / px);
  c.width = W; c.height = H; const x = c.getContext("2d");
  const rows = [[0.32, "rgb(120 72 130 / .28)", 3], [0.52, "rgb(64 42 96 / .45)", 7], [0.72, "rgb(34 25 58 / .7)", 11]];
  for (const [base, col, seed] of rows) {
    x.fillStyle = col; let s = seed;
    for (let i = 0; i < W; i++) {
      const t = i / W, n = Math.sin(t * 9 + seed) * 0.5 + Math.sin(t * 23 + seed * 2) * 0.3 + Math.sin(t * 51 + seed * 3) * 0.2;
      const top = Math.round(H * (base - n * 0.12));
      x.fillRect(i, top, 1, H - top);
    }
  }
}
function paint() {
  haze(document.querySelector(".haze"));
  drawIsland($(".isle-tfg"), { ...TFG, fit: 0.94, anchorY: 0.42 });
  drawIsland($(".isle-rpg"), { ...RPG, fit: 0.94, anchorY: 0.42 });
  drawIsland($(".isle-a"), { seed: 4, N: 16, peak: 8, lake: false, trees: 0.1, depth: 9, hazeAmt: 0.55, haze: "#e9a0b4" });
  drawIsland($(".isle-b"), { seed: 9, N: 12, peak: 7, lake: false, trees: 0.12, depth: 7, hazeAmt: 0.68, haze: "#e7a3b8" });
  $$(".mini").forEach((c) => drawIsland(c, { ...kind(c.dataset.kind), fit: 0.82, anchorY: 0.5 }));
  $$(".l-ico").forEach((c) => drawIsland(c, { ...kind(c.dataset.kind), N: 14, depth: 6, peak: 7, fit: 0.9, anchorY: 0.5 }));
  $$(".thumb").forEach((c) => drawIsland(c, c.dataset.kind === "rpg"
    ? { ...RPG, seed: +c.dataset.seed, N: 22, fit: 0.78, anchorY: 0.55 }
    : { seed: +c.dataset.seed, N: 18, peak: 9, trees: 0.05, depth: 9, fit: 0.8, anchorY: 0.55 }));
}
// clouds
const clouds = $(".clouds");
[[12, 8, 14, 1], [27, 22, 9, 0.8], [3, 60, 18, 0.7], [41, 70, 11, 0.9], [15, 36, 7, 0.55], [33, 48, 13, 0.6]].forEach(([seed, x, y, sc], i) => {
  const c = document.createElement("canvas"); drawCloud(c, seed);
  c.style.cssText = `--x:${x}%;--y:${y}%;--s:${sc};--d:${90 + i * 23}s;--delay:${-i * 17}s`; clouds.append(c);
});
const dcc = $(".dc-clouds");
[[5, 6, 10, 0.9], [19, 62, 70, 0.7], [8, 78, 18, 0.5]].forEach(([seed, x, y, sc]) => {
  const c = document.createElement("canvas"); drawCloud(c, seed, "#fff1f3", "#f6b9c9");
  c.style.cssText = `--x:${x}%;--y:${y}%;--s:${sc}`; dcc.append(c);
});
// stars for the RPG night sky
const st = $(".stars"); let sh = "";
for (let i = 0; i < 90; i++) sh += `${(Math.random() * 100).toFixed(2)}vw ${(Math.random() * 70).toFixed(2)}vh 0 ${Math.random() < 0.2 ? 1 : 0}px rgb(255 255 255 / ${(0.3 + Math.random() * 0.6).toFixed(2)}),`;
st.style.boxShadow = sh.slice(0, -1);
paint();
let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(paint, 150); });

// server switcher — same-document view transition between worlds
const root = document.documentElement;
function setServer(v) {
  const apply = () => {
    root.dataset.server = v;
    $$("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== v));
    $('meta[name="theme-color"]').content = v === "rpg" ? "#120f2a" : "#2a1f45";
  };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
  else apply();
}
$$('input[name="srv"]').forEach((r) => r.addEventListener("change", () => r.checked && setServer(r.value)));

// notify toggles
document.addEventListener("click", (e) => {
  const b = e.target.closest(".notify"); if (!b) return;
  const on = b.getAttribute("aria-pressed") !== "true";
  $$(".notify").forEach((n) => { n.setAttribute("aria-pressed", on); $(".lbl", n).textContent = on ? "Сообщим первым" : "Сообщить о запуске"; });
});
