// Shared by every page: fake session in the header, sunset/moon world toggle,
// form helpers (aria-invalid bridge, show password, submit loading), pixel skins, island scenes.
import { IslandView } from "./engine.js?v=9";

const root = document.documentElement;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const BASE = new URL(".", import.meta.url).href; // site root

// ---------- session (static mock: localStorage only) ----------
const KEY = "kova.session";
export const session = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set(s) { localStorage.setItem(KEY, JSON.stringify({ since: Date.now(), ...s })); },
  clear() { localStorage.removeItem(KEY); },
};

// ---------- pixel skins (deterministic from the nickname) ----------
function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const HAIR = ["#3b2417", "#6b3e22", "#1f1a2e", "#c98a3c", "#e9d4a7", "#8b2f3f", "#4a3a7a"];
const SKIN = ["#f1c29b", "#d9a27a", "#b97c55", "#8d5a3b", "#f6d3b6"];
const SHIRT = [["#ff9b6b", "#d9734a"], ["#8b6cff", "#6a4fd6"], ["#4fd6c8", "#33a89c"], ["#ff7fa6", "#d65a82"], ["#ffcf7a", "#d9a34f"]];
export function skinColors(nick = "Steve") {
  const h = hash(nick || "Steve");
  return { hair: HAIR[h % HAIR.length], skin: SKIN[(h >>> 3) % SKIN.length], shirt: SHIRT[(h >>> 6) % SHIRT.length], pants: (h >>> 9) & 1 ? "#2c2f5a" : "#3a2b4f", eye: (h >>> 11) & 1 ? "#4fd6c8" : "#4a6cff" };
}
// 8×8 face, Minecraft-style
export function drawHead(c, nick, px = 8) {
  const k = skinColors(nick); c.width = c.height = 8 * px; const x = c.getContext("2d");
  const p = (cx, cy, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(cx * px, cy * px, w * px, h * px); };
  p(0, 0, k.skin, 8, 8); p(0, 0, k.hair, 8, 2); p(0, 2, k.hair, 1, 1); p(7, 2, k.hair, 1, 1);
  p(1, 4, "#fff"); p(2, 4, k.eye); p(5, 4, k.eye); p(6, 4, "#fff");
  p(3, 5, "#00000022", 2, 1); p(2, 6, "#7a3b2e", 4, 1); p(3, 6, "#5a2a22", 2, 1);
  p(0, 7, "#00000014", 8, 1);
}
// 16×32 front body
export function drawBody(c, nick, px = 8) {
  const k = skinColors(nick); c.width = 16 * px; c.height = 32 * px; const x = c.getContext("2d");
  const p = (cx, cy, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(cx * px, cy * px, w * px, h * px); };
  // head
  p(4, 0, k.skin, 8, 8); p(4, 0, k.hair, 8, 2); p(4, 2, k.hair); p(11, 2, k.hair);
  p(5, 4, "#fff"); p(6, 4, k.eye); p(9, 4, k.eye); p(10, 4, "#fff"); p(6, 6, "#7a3b2e", 4, 1); p(7, 6, "#5a2a22", 2, 1);
  // torso + arms
  p(4, 8, k.shirt[0], 8, 12); p(4, 8, k.shirt[1], 8, 1); p(7, 9, "#ffffff55", 2, 3);
  p(0, 8, k.shirt[0], 4, 5); p(12, 8, k.shirt[0], 4, 5); p(0, 13, k.skin, 4, 7); p(12, 13, k.skin, 4, 7);
  p(3, 8, k.shirt[1], 1, 5); p(12, 8, k.shirt[1], 1, 5); p(4, 19, "#2a1f3d", 8, 1); p(7, 19, "#ffcf7a", 2, 1);
  // legs
  p(4, 20, k.pants, 4, 10); p(8, 20, k.pants, 4, 10); p(7, 20, "#00000030", 1, 10); p(4, 30, "#3a3540", 4, 2); p(8, 30, "#3a3540", 4, 2);
}

// ---------- header: auth slot ----------
function renderAuth() {
  const s = session.get();
  $$("[data-auth]").forEach((a) => {
    if (!s) return;
    a.href = BASE + "cabinet/";
    a.classList.add("auth-on"); a.classList.remove("btn-ghost");
    a.setAttribute("aria-label", `Кабинет — ${s.nick}`);
    a.textContent = "";
    const cv = document.createElement("canvas"); cv.className = "av"; cv.setAttribute("aria-hidden", "true"); drawHead(cv, s.nick, 4);
    const t = document.createElement("span"); t.className = "auth-nick"; t.textContent = s.nick; t.translate = false;
    const k = document.createElement("span"); k.className = "auth-cab"; k.textContent = "Кабинет";
    a.append(cv, t, k);
  });
}

// ---------- world (sunset TFG / moon RPG) ----------
export const world = {
  get: () => root.dataset.server || "tfg",
  set(v, { silent = false } = {}) {
    if (v === world.get()) return;
    localStorage.setItem("kova.world", v);
    const apply = () => {
      root.dataset.server = v;
      $('meta[name="theme-color"]')?.setAttribute("content", v === "rpg" ? "#120f2a" : "#2a1f45");
      $$(".world-btn").forEach((b) => { b.setAttribute("aria-pressed", v === "rpg"); b.setAttribute("aria-label", v === "rpg" ? "Тема: ночь RPG. Переключить на закат TFG" : "Тема: закат TFG. Переключить на ночь RPG"); });
    };
    apply();
    if (!silent) dispatchEvent(new CustomEvent("kova:world", { detail: v }));
  },
};
$$(".world-btn").forEach((b) => {
  b.setAttribute("aria-pressed", world.get() === "rpg");
  b.addEventListener("click", () => world.set(world.get() === "rpg" ? "tfg" : "rpg"));
});

// ---------- forms ----------
// accessible-error-announcement: aria-invalid + aria-describedby follow :user-invalid
export function bridgeValidity(form) {
  const sync = (el) => {
    if (!el.dataset.error) return;
    const bad = el.matches(":user-invalid") || el.dataset.custom === "bad";
    el.setAttribute("aria-invalid", bad);
    const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== el.dataset.error);
    if (bad) ids.push(el.dataset.error);
    ids.length ? el.setAttribute("aria-describedby", ids.join(" ")) : el.removeAttribute("aria-describedby");
  };
  $$("input[data-error]", form).forEach((el) => { el.setAttribute("aria-invalid", "false"); for (const ev of ["blur", "change", "input", "invalid"]) el.addEventListener(ev, () => requestAnimationFrame(() => sync(el))); });
  return sync;
}
// show / hide password
document.addEventListener("click", (e) => {
  const b = e.target.closest(".reveal-pw"); if (!b) return;
  const i = b.closest(".pw").querySelector("input"); const show = i.type === "password";
  i.type = show ? "text" : "password"; b.setAttribute("aria-pressed", show); b.setAttribute("aria-label", show ? "Скрыть пароль" : "Показать пароль");
});
export function busy(btn, on, label) {
  btn.toggleAttribute("aria-busy", on); btn.disabled = on;
  if (on) { btn.dataset.label = btn.querySelector(".lbl").textContent; btn.querySelector(".lbl").textContent = label; }
  else if (btn.dataset.label) btn.querySelector(".lbl").textContent = btn.dataset.label;
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function go(path) { location.href = BASE + path; }

// ---------- island scenes (two worlds stacked in one slot) ----------
export function mountScene(host, opts) {
  const views = $$("canvas.isle", host).map((c) => { const v = new IslandView(c, opts[c.dataset.scene]); v.world = c.dataset.world; return v; });
  if (!views.length) return;
  let on = true, raf = 0;
  const run = () => !reduce && !document.hidden;
  const loop = (now) => { raf = 0; views.forEach((v) => v.frame(now, run())); if ((run() && on) || views.some((v) => v.anim)) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const cur = world.get();
  views.forEach((v) => v.layout());
  views.filter((v) => v.world === cur).forEach((v, i) => { if (reduce) { v.prewarm(4); v.show(true); } else v.play("in", 1300, 200 + i * 150); });
  kick();
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) kick(); }).observe(host);
  document.addEventListener("visibilitychange", kick);
  let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { views.forEach((v) => v.layout()); kick(); }, 150); });
  addEventListener("kova:world", ({ detail: w }) => {
    views.forEach((v) => {
      if (v.world === w) { if (reduce) { v.prewarm(4); v.show(true); } else v.play("in", 1200, 380); }
      else if (v.visible) { if (reduce) v.show(false); else v.play("out", 700); }
    });
    kick();
  });
}

renderAuth();
// cross-document view transitions: mark the direction so CSS can slide auth cards
addEventListener("pagereveal", (e) => {
  if (!e.viewTransition) return;
  const from = navigation?.activation?.from?.url || "", to = location.pathname;
  if (/register/.test(from) && /login/.test(to)) e.viewTransition.types.add("back");
  else if (/login/.test(from) && /register/.test(to)) e.viewTransition.types.add("forward");
});
