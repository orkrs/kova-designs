import { IslandView, renderStatic, drawCloud } from "./engine.js?v=9";
import { world } from "./site.js?v=9";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let motionOK = !reduce.matches;

// ---------- hero worlds ----------
const OPTS = {
  industrial: { seed: 11, pal: "dusk", fit: 0.94, anchorY: 0.55, padTop: 0.14 },
  arcane: { seed: 29, pal: "arcane", fit: 0.94, anchorY: 0.55, padTop: 0.1 },
  mine: { seed: 4, pal: "dusk", haze: "#e9a0b4", hazeAmt: 0.42, fit: 0.9, smokeScale: 0.6, dprCap: 1.5 },
  house: { seed: 9, pal: "dusk", haze: "#e7a3b8", hazeAmt: 0.5, fit: 0.86, padTop: 0.25, smokeScale: 0.6, dprCap: 1.5 },
  shard: { seed: 13, pal: "arcane", haze: "#2b2160", hazeAmt: 0.45, fit: 0.9, dprCap: 1.5 },
};
const worlds = { tfg: [], rpg: [] };
const heroViews = [];
$$(".scene canvas.isle").forEach((c, i) => {
  const sc = c.dataset.scene, v = new IslandView(c, { scene: sc, ...OPTS[sc], seed: OPTS[sc].seed + (sc === "shard" ? i : 0) });
  v.world = c.dataset.world; v.slot = c.parentElement.classList.contains("slot-main") ? 0 : c.parentElement.classList.contains("slot-a") ? 1 : 2;
  worlds[v.world].push(v); heroViews.push(v);
});
let current = world.get();

// ---------- sections: server-card minis (animated), static thumbs ----------
const cardViews = $$(".mini").map((c) => new IslandView(c, c.dataset.kind === "rpg" ? { scene: "arcane", seed: 29, pal: "arcane", fit: 0.84, padTop: 0.06 } : { scene: "industrial", seed: 11, pal: "dusk", fit: 0.8, padTop: 0.24 }));
cardViews.forEach((v) => v.show(true));
function statics() {
  $$(".l-ico").forEach((c) => renderStatic(c, c.dataset.kind === "rpg" ? { scene: "shard", seed: 13, pal: "arcane", fit: 0.92 } : { scene: "house", seed: 9, pal: "dusk", fit: 0.88, padTop: 0.2 }));
  $$(".thumb").forEach((c, i) => renderStatic(c, c.dataset.kind === "rpg" ? { scene: "arcane", seed: 29, pal: "arcane", fit: 0.8 } : i === 0 ? { scene: "house", seed: 21, pal: "dusk", fit: 0.72, padTop: 0.2 } : { scene: "mine", seed: 33, pal: "dusk", fit: 0.72, padTop: 0.1 }));
}

// ---------- clouds, stars, haze ----------
const clouds = $(".clouds");
[[12, 6, 15, 1], [27, 24, 6, 0.8], [3, 58, 16, 0.7], [41, 72, 9, 0.9], [15, 40, 4, 0.55], [33, 86, 20, 0.6]].forEach(([seed, x, y, sc], i) => {
  const c = document.createElement("canvas"); drawCloud(c, seed);
  c.style.cssText = `--x:${x}%;--y:${y}%;--s:${sc};--d:${110 + i * 23}s;--delay:${-i * 19}s`; clouds.append(c);
});
const dcc = $(".dc-clouds");
[[5, 6, 10, 0.9], [19, 62, 70, 0.7], [8, 78, 18, 0.5]].forEach(([seed, x, y, sc]) => {
  const c = document.createElement("canvas"); drawCloud(c, seed, "#fff1f3", "#f6b9c9");
  c.style.cssText = `--x:${x}%;--y:${y}%;--s:${sc}`; dcc.append(c);
});
$$(".stars").forEach((st, j) => { let sh = ""; for (let i = 0; i < 70; i++) sh += `${(Math.random() * 100).toFixed(2)}vw ${(Math.random() * 70).toFixed(2)}vh 0 ${Math.random() < 0.2 ? 1 : 0}px rgb(255 255 255 / ${(0.35 + Math.random() * 0.6).toFixed(2)}),`; st.style.boxShadow = sh.slice(0, -1); });
function haze(c) {
  const px = 8, W = Math.ceil(c.clientWidth / px), H = Math.ceil(c.clientHeight / px);
  c.width = W; c.height = H; const x = c.getContext("2d");
  for (const [base, col, seed] of [[0.32, "rgb(120 72 130 / .28)", 3], [0.52, "rgb(64 42 96 / .45)", 7], [0.72, "rgb(34 25 58 / .7)", 11]]) {
    x.fillStyle = col;
    for (let i = 0; i < W; i++) { const t = i / W, n = Math.sin(t * 9 + seed) * 0.5 + Math.sin(t * 23 + seed * 2) * 0.3 + Math.sin(t * 51 + seed * 3) * 0.2; const top = Math.round(H * (base - n * 0.12)); x.fillRect(i, top, 1, H - top); }
  }
}

// ---------- render loop (rAF; paused when hero/cards not rendered or tab hidden) ----------
let heroOn = true, cardsOn = false, userPaused = false, raf = 0;
const running = () => motionOK && !userPaused && !document.hidden;
function loop(now) {
  raf = 0;
  const run = running();
  if (heroOn) heroViews.forEach((v) => v.frame(now, run));
  if (cardsOn) cardViews.forEach((v) => v.frame(now, run));
  const animating = heroViews.some((v) => v.anim);
  if ((run && (heroOn || cardsOn)) || animating) raf = requestAnimationFrame(loop);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
const drawOnce = () => { const now = performance.now(); heroViews.forEach((v) => v.frame(now, false)); cardViews.forEach((v) => v.frame(now, false)); };
document.addEventListener("visibilitychange", () => (document.hidden ? null : kick()));
// efficient-background-processing: content-visibility state, IO fallback
const watch = (el, set) => {
  if ("oncontentvisibilityautostatechange" in el) el.addEventListener("contentvisibilityautostatechange", (e) => { set(!e.skipped); if (!e.skipped) kick(); });
  else new IntersectionObserver(([e]) => { set(e.isIntersecting); if (e.isIntersecting) kick(); }, { rootMargin: "200px" }).observe(el);
};
watch($(".hero"), (v) => (heroOn = v));
watch($(".servers"), (v) => (cardsOn = v));

// ---------- intro ----------
function layoutAll() { heroViews.forEach((v) => v.layout()); cardViews.forEach((v) => v.layout()); haze($(".haze")); }
layoutAll(); statics();
if (motionOK) {
  root.classList.add("intro");
  // drop the intro hooks once it has played so nothing lingers on later sun/moon switches
  setTimeout(() => root.classList.remove("intro"), 3200);
  const [m, a, b] = [0, 1, 2].map((s) => worlds[current].find((v) => v.slot === s));
  m.play("in", 1700, 250); a.play("in", 1200, 650); b.play("in", 1100, 850);
  kick();
} else {
  worlds[current].forEach((v) => { v.prewarm(5); v.show(true); });
  cardViews.forEach((v) => v.prewarm(5));
  drawOnce();
}
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layoutAll(); statics(); running() ? kick() : drawOnce(); }, 150); });

// ---------- world switch: islands dissolve → new world assembles; UI via scoped View Transition ----------
const ui = $(".hero-ui");
let vts = [];
function applyUI(v) {
  world.set(v, { silent: true });
  $$("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== v));
  $('meta[name="theme-color"]').content = v === "rpg" ? "#120f2a" : "#2a1f45";
}
async function setServer(v) {
  if (v === current) return;
  const from = worlds[current], to = worlds[v]; current = v;
  // interruptible: finish any running UI transition instantly, then start the new one;
  // scoped transitions only on the card + CTA, so the switch itself stays clickable mid-transition
  vts.forEach((t) => { try { t.skipTransition(); } catch {} }); vts = [];
  if (motionOK && ui.startViewTransition) {
    const scopes = [$(".cta-wrap"), $(".hero-card")].filter((el) => el.offsetParent);
    vts = scopes.map((el, i) => el.startViewTransition(() => applyUI(v)));
    if (!vts.length) applyUI(v);
    vts.forEach((t) => t.ready.catch(() => {}));
  }
  else applyUI(v); // @starting-style handles the entry fallback
  if (!motionOK || userPaused) {
    from.forEach((x) => x.show(false)); to.forEach((x) => { x.prewarm(4); x.show(true); }); drawOnce(); return;
  }
  from.forEach((x, i) => x.visible && x.play("out", 750, i * 60));
  to.forEach((x) => x.play("in", x.slot === 0 ? 1500 : 1000, 380 + x.slot * 140));
  kick();
}
$$('input[name="srv"]').forEach((r) => r.addEventListener("change", () => r.checked && setServer(r.value)));
// header sun/moon toggle drives the same switch
addEventListener("kova:world", ({ detail: v }) => { const r = $(`input[name="srv"][value="${v}"]`); if (r) r.checked = true; setServer(v); });
if (current === "rpg") { $('input[name="srv"][value="rpg"]').checked = true; $$("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== "rpg")); }

// ---------- pause control (WCAG 2.2.2) ----------
const mt = $(".motion-toggle");
mt.addEventListener("click", () => {
  userPaused = !userPaused;
  root.classList.toggle("paused", userPaused);
  mt.setAttribute("aria-label", userPaused ? mt.dataset.labelPlay : mt.dataset.labelPause);
  if (userPaused) { heroViews.forEach((v) => { if (v.anim) { v.anim = null; v.visible = v.world === current; } }); drawOnce(); } else kick();
});
if (!motionOK) mt.hidden = true;

// ---------- pointer parallax (desktop, fine pointer only) ----------
if (motionOK && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const layers = $$(".px-layer"), hero = $(".hero");
  let tx = 0, ty = 0, cx = 0, cy = 0, pr = 0;
  hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (!pr) pr = requestAnimationFrame(step); });
  hero.addEventListener("pointerleave", () => { tx = ty = 0; if (!pr) pr = requestAnimationFrame(step); });
  function step() {
    pr = 0; if (userPaused) return;
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    layers.forEach((l) => { const d = +l.dataset.depth; l.style.transform = `translate3d(${(-cx * 28 * d).toFixed(2)}px, ${(-cy * 16 * d).toFixed(2)}px, 0)`; });
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) pr = requestAnimationFrame(step);
  }
}

// notify toggles
document.addEventListener("click", (e) => {
  const b = e.target.closest(".notify"); if (!b) return;
  const on = b.getAttribute("aria-pressed") !== "true";
  $$(".notify").forEach((n) => { n.setAttribute("aria-pressed", on); $(".lbl", n).textContent = on ? "Сообщим первым" : "Сообщить о запуске"; });
});
