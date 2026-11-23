import { $, $$, drawHead, mountScene, world, reduce } from "./site.js?v=14";
import { renderStatic } from "./engine.js?v=14";

const order = ["login", "home", "servers", "settings", "mods"];
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
document.addEventListener("click", (e) => { const b = e.target.closest("[data-screen], [data-fake]"); if (b?.dataset.fake === "download") return; if (!b || !b.closest(".lw, .screens")) return; e.preventDefault(); select(b.dataset.screen || b.dataset.fake); });
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

// per-server modpack update (inline on the server card); "Играть" unlocks only when the pack is current
const card = $('[data-pack="tfg"]'), bar = $(".bigbar", card), upd = $("[data-upd]", card), pauseB = $("[data-pause]", card);
const playB = $("[data-play]", card), updB = $("[data-update]", card), why = $("[data-why]", card);
const homeB = $("[data-home-play]"), homeS = $("[data-home-state]");
let p = 0, timer = 0, paused = false, state = "outdated";
const toast = (m) => { let t = $(".toast"); if (!t) { t = document.createElement("p"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); } t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2000); };
function paint() {
  card.dataset.state = state; upd.hidden = state !== "updating"; updB.hidden = state !== "outdated";
  playB.disabled = state !== "ready"; playB.classList.toggle("btn-sun", state === "ready"); playB.classList.toggle("themed", state === "ready"); playB.classList.toggle("btn-ghost", state !== "ready");
  why.hidden = state === "ready";
  $("[data-pack-text]", card).textContent = state === "ready" ? "Сборка актуальна · 0.9.2" : state === "updating" ? "Обновление 0.9.1 → 0.9.2" : "Доступно обновление 0.9.1 → 0.9.2 · 412 МБ";
  homeB.textContent = state === "ready" ? "ИГРАТЬ" : state === "updating" ? `ОБНОВЛЕНИЕ ${Math.round(p)}%` : "ОБНОВИТЬ";
  homeS.textContent = state === "ready" ? "Сборка 0.9.2 · готова к запуску" : state === "updating" ? "Идёт обновление сборки" : "Доступно обновление 0.9.1 → 0.9.2";
}
function tick() {
  if (paused) return;
  p = Math.min(100, p + (reduce ? 4 : 0.9 + Math.random() * 0.9));
  bar.style.setProperty("--p", p.toFixed(1)); bar.setAttribute("aria-valuenow", Math.round(p));
  $("[data-p]", card).textContent = Math.round(p); $("[data-mb]", card).textContent = Math.round(p * 4.12);
  if (p >= 100) { clearInterval(timer); timer = 0; state = "ready"; toast("TerraFirmaGreg обновлена"); }
  paint();
}
function start() { state = "updating"; p = 0; paused = false; pauseB.textContent = "Пауза"; pauseB.setAttribute("aria-pressed", false); paint(); clearInterval(timer); timer = setInterval(tick, 200); }
updB.addEventListener("click", start);
pauseB.addEventListener("click", () => { paused = !paused; pauseB.setAttribute("aria-pressed", paused); pauseB.textContent = paused ? "Продолжить" : "Пауза"; card.classList.toggle("paused-dl", paused); });
$("[data-cancel]", card).addEventListener("click", () => { clearInterval(timer); timer = 0; state = "outdated"; p = 0; bar.style.setProperty("--p", 0); paint(); });
playB.addEventListener("click", () => toast("Запуск TerraFirmaGreg… (демо)"));
homeB.addEventListener("click", () => { if (state === "ready") return toast("Запуск TerraFirmaGreg… (демо)"); select("servers"); if (state === "outdated") start(); });
paint();
function onShow(k) { const panel = $(`[data-panel="${k}"]`); statics(panel); mountIn(k); }

// settings: RAM slider
const ram = $("#ram");
const setRam = () => { ram.style.setProperty("--p", ((ram.value - ram.min) / (ram.max - ram.min)) * 100); $("[data-ram]").textContent = ram.value; ram.setAttribute("aria-valuetext", `${ram.value} гигабайт`); };
ram.addEventListener("input", setRam); setRam();
const wt = $("[data-world-toggle]"); wt.checked = world.get() === "rpg";
wt.addEventListener("change", () => world.set(wt.checked ? "rpg" : "tfg"));
addEventListener("kova:world", ({ detail }) => (wt.checked = detail === "rpg"));
$("[data-notify]").addEventListener("click", (e) => { const b = e.currentTarget, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); b.textContent = on ? "Сообщим первым" : "Уведомить о запуске"; });

// initial screen (deep link via hash)
let initial = location.hash.slice(1);
if (initial === "download") { initial = "servers"; history.replaceState(null, "", "#servers"); }
onShow("home");
if (order.includes(initial) && initial !== "home") select(initial);
