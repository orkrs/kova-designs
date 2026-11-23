import { drawIsland } from "../v1/voxel.js";
function rnd(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const TIERS = ["#8d8d8d", "#dcdcdc", "#ff8a2b", "#ffd23f", "#9f7bff"];
// banner: night skyline of machine blocks lit in GregTech tier colours
function banner(c) {
  const W = c.clientWidth, H = c.clientHeight, d = Math.min(2, devicePixelRatio || 1);
  c.width = W * d; c.height = H * d; const x = c.getContext("2d"); x.scale(d, d);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#07080b"); g.addColorStop(1, "#15131a"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W * 0.62, H * 1.05, 0, W * 0.62, H * 1.05, W * 0.55); rg.addColorStop(0, "rgba(255,106,61,.55)"); rg.addColorStop(0.5, "rgba(255,106,61,.12)"); rg.addColorStop(1, "rgba(255,106,61,0)"); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  const r = rnd(42), cell = Math.max(6, Math.round(W / 110));
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; x.fillRect((r() * W) | 0, (r() * H * 0.55) | 0, 1.5, 1.5); }
  const cols = Math.ceil(W / cell); let h = 6;
  for (let i = 0; i < cols; i++) {
    h += (r() - 0.5) * 3; h = Math.max(3, Math.min(H / cell * 0.7, h));
    const tall = r() < 0.1 ? (r() * 12) | 0 : 0;
    for (let j = 0; j < h + tall; j++) {
      const lit = r() < 0.05;
      x.fillStyle = lit ? TIERS[(r() * TIERS.length) | 0] : j > h + tall - 2 ? "#34313a" : j < 3 ? "#121116" : "#1f1d25";
      x.fillRect(i * cell, H - (j + 1) * cell, cell - 1, cell - 1);
    }
  }
}
function shot(c, seed) {
  const W = c.clientWidth, H = c.clientHeight, d = Math.min(2, devicePixelRatio || 1);
  c.width = W * d; c.height = H * d; const x = c.getContext("2d"); x.scale(d, d);
  const r = rnd(seed * 997 + 1), skies = [["#1b2a4a", "#e08a6a"], ["#0d1b2a", "#3a6ea5"], ["#2a1b3d", "#ff9a8b"], ["#13261f", "#8fd694"]][seed % 4];
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, skies[0]); g.addColorStop(1, skies[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const cell = Math.max(6, Math.round(W / 26));
  for (let layer = 0; layer < 3; layer++) {
    let h = H / cell * (0.25 + layer * 0.12);
    const shade = ["#2b3a2e", "#3f5a3a", "#5b8a4a"][layer];
    for (let i = 0; i < Math.ceil(W / cell); i++) {
      h += (r() - 0.5) * 2; h = Math.max(1, h);
      for (let j = 0; j < h - layer * 1.5; j++) { x.fillStyle = j === Math.floor(h - layer * 1.5) - 1 ? shade : layer === 2 ? "#6b4a35" : shade; x.globalAlpha = 0.55 + layer * 0.22; x.fillRect(i * cell, H - (j + 1) * cell, cell, cell); }
    }
  }
  x.globalAlpha = 1;
}
function paint() { banner(document.querySelector(".banner")); document.querySelectorAll(".gallery canvas").forEach((c) => drawIsland(c, { seed: +c.dataset.seed, N: 16, peak: 8, trees: 0.06, depth: 8, fit: 0.78, anchorY: 0.5 })); }
paint();
let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(paint, 150); });
// toggles: like / follow / tabs
document.addEventListener("click", (e) => {
  const like = e.target.closest(".like");
  if (like) { const on = like.getAttribute("aria-pressed") !== "true"; like.setAttribute("aria-pressed", on); const n = like.querySelector("span"); n.textContent = +n.textContent + (on ? 1 : -1); }
  const f = e.target.closest(".follow");
  if (f) { const on = f.getAttribute("aria-pressed") !== "true"; f.setAttribute("aria-pressed", on); f.textContent = on ? "Читаю" : "Следить"; }
  const tab = e.target.closest("[role=tab]");
  if (tab) document.querySelectorAll("[role=tab]").forEach((b) => { const s = b === tab; b.setAttribute("aria-selected", s); b.tabIndex = s ? 0 : -1; });
});
