import { $, $$, session, drawHead, drawBanner, reduce } from "./site.js?v=14";

const me = session.get() || { nick: "Kova_Player" };
$$("[data-head]").forEach((c) => c.dataset.head && drawHead(c, c.dataset.head, 4));
$$("[data-head-me]").forEach((c) => drawHead(c, me.nick, 4));
$$("[data-nick]").forEach((n) => (n.textContent = me.nick + " (вы)"));

const app = $(".st-app");
const NAMES = { citizen: "Житель", treasurer: "Казначей", diplomat: "Дипломат", mayor: "Мэр" };
let role = new URLSearchParams(location.search).get("role");
if (!NAMES[role]) role = "treasurer";
let tab = "overview";
const allowed = (el) => { const r = el.dataset.roles; return !r || r === "all" || r.split(" ").includes(role); };
let running = null;
// scoped to the app panel only, so the role picker stays clickable mid-transition; a new switch skips the old one
const vt = (el, fn) => { running?.skipTransition?.(); if (reduce || !el.startViewTransition) return fn(); running = el.startViewTransition(fn); running.finished.finally(() => (running = null)); };

function render() {
  $$("[data-roles]").forEach((el) => (el.hidden = !allowed(el)));
  if ($(`[data-tab="${tab}"]`).hidden) tab = "overview";
  $$("[data-tab]").forEach((t) => { const on = t.dataset.tab === tab; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
  $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
  $("[data-role-pill]").textContent = NAMES[role];
  $(`input[name="role"][value="${role}"]`).checked = true;
}
render();

// role switch: whole app + hero pill animate as one scoped transition
$$('input[name="role"]').forEach((r) => r.addEventListener("change", () => {
  role = r.value; history.replaceState(null, "", "?role=" + role + location.hash);
  vt(app, render);
}));
// tabs (arrow keys move between visible tabs)
const tabs = () => $$("[data-tab]").filter((t) => !t.hidden);
function selectTab(k, focus) { if (k === tab) return; tab = k; vt(app, render); if (focus) $(`[data-tab="${k}"]`).focus(); }
$(".st-tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) selectTab(t.dataset.tab); });
$(".st-tabs").addEventListener("keydown", (e) => {
  const list = tabs(), i = list.findIndex((t) => t.dataset.tab === tab), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (d) { e.preventDefault(); selectTab(list[(i + d + list.length) % list.length].dataset.tab, true); }
});

// toasts
const toast = $(".toast"); let tt;
const say = (m) => { toast.textContent = m; toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => (toast.hidden = true), 2200); };
document.addEventListener("click", (e) => { const b = e.target.closest("[data-toast]"); if (b && b.tagName === "BUTTON") say(b.dataset.toast); });

// vote (same vote shown in Обзор and Голосования — keep both in sync)
let yes = 14, no = 6, voted = null;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-vote] [data-v]"); if (!b) return;
  if (voted) { voted === "yes" ? yes-- : no--; } voted = b.dataset.v; voted === "yes" ? yes++ : no++;
  $$("[data-yes]").forEach((x) => (x.textContent = yes)); $$("[data-no]").forEach((x) => (x.textContent = no));
  $$(".vbar").forEach((v) => { v.querySelector("i").style.setProperty("--v", yes / (yes + no)); v.setAttribute("aria-label", `За ${yes}, против ${no}`); });
  $$("[data-v]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === voted)); say("Голос учтён");
});

// dialogs
$$("[data-open]").forEach((b) => b.addEventListener("click", () => $("#" + b.dataset.open).showModal()));
$("#leave-dlg").addEventListener("close", (e) => e.target.returnValue === "ok" && say("Вы покинули город (демо)"));

// manage: rename + reroll coat of arms
let seed = "Медноград";
$("[data-reroll]").addEventListener("click", () => { seed += "·"; $$("[data-city-banner]").forEach((c) => drawBanner(c, seed, 4)); });
$(".st-form").addEventListener("submit", (e) => {
  e.preventDefault(); const f = e.currentTarget; if (!f.reportValidity()) return;
  $("[data-city-name]").textContent = $("#cname").value.trim(); say("Сохранено");
});
