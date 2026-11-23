import { $, $$, drawHead, mountScene, world, reduce } from "./site.js?v=12";
import { renderStatic } from "./engine.js?v=12";

const order = ["login", "home", "servers", "download", "settings", "mods"];
let cur = "home";
function select(k, { focus = false } = {}) {
  if (!order.includes(k) || k === cur) return;
  const dir = order.indexOf(k) < order.indexOf(cur) ? "up" : "down";
  const upd = () => {
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== k));
    $$('.screens [role="tab"]').forEach((t) => { const on = t.dataset.screen === k; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $$(".lw-side [data-screen]").forEach((b) => b.dataset.screen === k ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current"));
    cur = k; history.replaceState(null, "", "#" + k); onShow(k);
  };
  if (!reduce && document.startViewTransition) { try { document.startViewTransition({ update: upd, types: [dir] }); } catch { document.startViewTransition(upd); } } else upd();
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-screen], [data-fake]"); if (!b || !b.closest(".lw, .screens")) return; e.preventDefault(); select(b.dataset.screen || b.dataset.fake); });
$(".l-login form").addEventListener("submit", (e) => { e.preventDefault(); select("home"); });
$(".screens").addEventListener("keydown", (e) => {
  const i = order.indexOf(cur), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (d) { e.preventDefault(); select(order[(i + d + order.length) % order.length], { focus: true }); }
  if (e.key === "Home") select(order[0], { focus: true }); if (e.key === "End") select(order.at(-1), { focus: true });
});

// art
const big = { industrial: { scene: "industrial", seed: 11, pal: "dusk", fit: 0.9, padTop: 0.14, dprCap: 1.5 }, arcane: { scene: "arcane", seed: 29, pal: "arcane", fit: 0.9, padTop: 0.1, dprCap: 1.5 } };
let mounted = new Set();
function mountIn(k) { const p = $(`[data-panel="${k}"]`); $$(".lscene", p).forEach((s) => { if (!mounted.has(s)) { mounted.add(s); mountScene(s, big); } }); }
$$("[data-head]").forEach((c) => drawHead(c, c.dataset.head, 4));
const statics = (p) => {
  $$("canvas[data-mini]:not([data-done])", p).forEach((c) => { c.dataset.done = 1; renderStatic(c, c.dataset.mini === "rpg" ? { scene: "arcane", seed: 29, pal: "arcane", fit: 0.82 } : { scene: "industrial", seed: 11, pal: "dusk", fit: 0.8, padTop: 0.2 }); });
  $$("canvas[data-thumb]:not([data-done])", p).forEach((c) => { c.dataset.done = 1; renderStatic(c, c.dataset.kind === "rpg" ? { scene: "shard", seed: +c.dataset.thumb, pal: "arcane", fit: 0.8 } : { scene: c.dataset.thumb === "21" ? "house" : "mine", seed: +c.dataset.thumb, pal: "dusk", fit: 0.75, padTop: 0.15 }); });
  $$("canvas[data-shot]:not([data-done])", p).forEach((c) => { c.dataset.done = 1; c.style.background = "linear-gradient(180deg,#3a2a59,#b45a86 60%,#f08a8f)"; renderStatic(c, { scene: c.dataset.shot, seed: 11, pal: "dusk", fit: 0.85, padTop: 0.15 }); });
  $$("canvas[data-dl-ico]:not([data-done])", p).forEach((c) => { c.dataset.done = 1; renderStatic(c, { scene: "house", seed: 9, pal: "dusk", fit: 0.95, padTop: 0.2 }); });
  $$("canvas[data-modic]:not([data-done])", p).forEach((c) => { c.dataset.done = 1; drawModIcon(c, +c.dataset.modic); });
};
function drawModIcon(c, i) {
  const cols = [["#4fd6c8", "#2a8f86"], ["#ffcf7a", "#ff9b6b"], ["#a6abb5", "#5b6478"], ["#ff7fa6", "#8b6cff"], ["#7fbf5a", "#3f7a2e"]][i % 5];
  c.width = c.height = 8; const x = c.getContext("2d");
  x.fillStyle = cols[1]; x.fillRect(0, 0, 8, 8); x.fillStyle = cols[0]; x.fillRect(1, 1, 6, 6);
  x.fillStyle = "#ffffff99"; for (let k = 0; k < 4; k++) x.fillRect(2 + ((i * 3 + k * 5) % 4), 2 + ((i + k * 3) % 4), 1, 1);
}

// download simulation (runs while the screen is visible)
let p = 0, timer = 0, paused = false;
const bar = $(".bigbar"), pause = $("[data-pause]");
function tick() {
  if (paused) return; p = Math.min(100, p + 0.7 + Math.random() * 0.8);
  bar.style.setProperty("--p", p.toFixed(1)); bar.setAttribute("aria-valuenow", Math.round(p)); $("[data-p]").textContent = Math.round(p);
  $("[data-mb]").textContent = Math.round(p * 4.12); $("[data-eta]").textContent = p >= 100 ? "готово" : `~${Math.ceil((100 - p) / 3)} с`;
  const fp = $("[data-file-p]"); if (fp) fp.textContent = Math.min(100, Math.round(64 + p / 3)) + "%";
  if (p >= 100) { clearInterval(timer); timer = 0; }
}
pause.addEventListener("click", () => { paused = !paused; pause.setAttribute("aria-pressed", paused); pause.textContent = paused ? "Продолжить" : "Пауза"; $(".l-download").classList.toggle("paused-dl", paused); });
function onShow(k) {
  const panel = $(`[data-panel="${k}"]`); statics(panel); mountIn(k);
  clearInterval(timer); timer = 0;
  if (k === "download") { if (p >= 100) p = 0; if (reduce) { p = 72; paused = true; } tick(); paused = reduce; timer = setInterval(tick, 250); }
}

// settings: RAM slider
const ram = $("#ram");
const setRam = () => { ram.style.setProperty("--p", ((ram.value - ram.min) / (ram.max - ram.min)) * 100); $("[data-ram]").textContent = ram.value; ram.setAttribute("aria-valuetext", `${ram.value} гигабайт`); };
ram.addEventListener("input", setRam); setRam();
const wt = $("[data-world-toggle]"); wt.checked = world.get() === "rpg";
wt.addEventListener("change", () => world.set(wt.checked ? "rpg" : "tfg"));
addEventListener("kova:world", ({ detail }) => (wt.checked = detail === "rpg"));
$("[data-notify]").addEventListener("click", (e) => { const b = e.currentTarget, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); b.textContent = on ? "Сообщим первым" : "Уведомить о запуске"; });

// initial screen (deep link via hash)
const start = location.hash.slice(1);
onShow("home");
if (order.includes(start) && start !== "home") select(start);
