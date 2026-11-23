import { drawIsland, drawCloud } from "./voxel.js";
const $ = (s) => document.querySelector(s);
function paint() {
  drawIsland($(".isle-main"), { seed: 11, N: 36, peak: 13, trees: 0.035, depth: 18, fit: 0.94, anchorY: 0.42 });
  drawIsland($(".isle-a"), { seed: 4, N: 16, peak: 8, lake: false, trees: 0.1, depth: 9, hazeAmt: 0.55, haze: "#e9a0b4" });
  drawIsland($(".isle-b"), { seed: 9, N: 12, peak: 7, lake: false, trees: 0.12, depth: 7, hazeAmt: 0.68, haze: "#e7a3b8" });
  document.querySelectorAll(".thumb").forEach((c) =>
    drawIsland(c, { seed: +c.dataset.seed, N: 18, peak: 9, trees: 0.05, depth: 9, fit: 0.8, anchorY: 0.55 }));
}
const clouds = $(".clouds");
const specs = [[12, 8, 14, 1], [27, 22, 9, 0.8], [3, 60, 18, 0.7], [41, 70, 11, 0.9], [15, 36, 7, 0.55], [33, 48, 13, 0.6]];
specs.forEach(([seed, x, y, sc], i) => {
  const c = document.createElement("canvas");
  drawCloud(c, seed);
  c.style.cssText = `--x:${x}%;--y:${y}%;--s:${sc};--d:${90 + i * 23}s;--delay:${-i * 17}s`;
  clouds.append(c);
});
paint();
document.documentElement.classList.add("painted");
let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(paint, 150); });
