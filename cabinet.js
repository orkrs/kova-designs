import { $, $$, session, drawBody, drawHead, bridgeValidity, busy, wait, go, mountScene } from "./site.js?v=10";

const s = session.get();
const me = s || { nick: "Kova_Player", email: "player@mail.ru", via: "email", since: Date.parse("2026-11-01") };
$("[data-demo]").hidden = !!s;
$("[data-nick]").textContent = me.nick;
$("[data-email]").textContent = me.email;
$("[data-user]").value = me.email;
$("[data-dc]").textContent = me.via === "discord" ? "@" + me.nick.toLowerCase() : "не привязан";
if (me.via !== "discord") { const b = $('[data-link="dc"]'); b.textContent = "Привязать"; b.classList.replace("btn-ghost", "btn-discord"); }
$("[data-since]").textContent = "С нами с " + new Date(me.since || Date.now()).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
drawBody($("canvas.skin"), me.nick, 4);

mountScene($(".scene"), {
  house: { scene: "house", seed: 9, pal: "dusk", fit: 0.8, padTop: 0.2 },
  shard: { scene: "shard", seed: 13, pal: "arcane", fit: 0.8 },
});

const toast = $(".toast"); let tt;
function say(msg) { toast.textContent = msg; toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => (toast.hidden = true), 2400); }
$$("[data-toast]").forEach((i) => i.addEventListener("change", () => say(i.checked ? i.dataset.toast : i.dataset.toastOff || "Сохранено")));
$$(".list .switch-t:not([data-toast])").forEach((i) => i.addEventListener("change", () => say("Настройки сохранены")));
$$("[data-end]").forEach((b) => b.addEventListener("click", () => { const li = b.closest("li"); const go = () => li.remove(); document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches ? document.startViewTransition(go) : go(); say("Сессия завершена"); }));
$$("[data-logout]").forEach((b) => b.addEventListener("click", () => { session.clear(); go("login/"); }));
$('[data-link="dc"]').addEventListener("click", async (e) => { const b = e.currentTarget; if (b.classList.contains("btn-discord")) { b.textContent = "Подключаем…"; await wait(900); session.set({ ...me, via: "discord" }); location.reload(); } else { say("Discord отвязан"); $("[data-dc]").textContent = "не привязан"; } });

// settlement card: your own head next to the role
const hm = $("[data-head-me]"); if (hm) drawHead(hm, me.nick, 4);

// skin upload (local preview only)
$("[data-skin-btn]").addEventListener("click", () => $("[data-skin-file]").click());
$("[data-skin-file]").addEventListener("change", (e) => { if (e.target.files[0]) say("Скин загружен (демо)"); });

// password dialog
const dlg = $("#pw-dlg"), form = $("#pw-form"); bridgeValidity(form);
$$('[data-open="pw-dlg"]').forEach((b) => b.addEventListener("click", () => dlg.showModal()));
$("[data-close]", dlg).addEventListener("click", () => dlg.close());
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { $$("input[data-error]", form).forEach((i) => { if (!i.validity.valid) { i.dataset.custom = "bad"; i.setAttribute("aria-invalid", "true"); } }); $(":invalid:not(form)", form)?.focus(); return; }
  const b = $('button[type="submit"]', form); busy(b, true, "Сохраняем…"); await wait(800); busy(b, false); dlg.close(); form.reset(); say("Пароль изменён");
});
$$("input[data-error]", form).forEach((i) => i.addEventListener("input", () => { if (i.validity.valid) delete i.dataset.custom; }));

// section nav: highlight the card in view
const links = $$(".cab-nav a");
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", a.hash === "#" + e.target.id)); }), { rootMargin: "-30% 0px -60% 0px" });
$$(".card-c[id]").forEach((c) => io.observe(c));
