import { $, $$, session, bridgeValidity, busy, wait, go, mountScene, reduce } from "./site.js?v=13";

mountScene($(".scene"), {
  industrial: { scene: "industrial", seed: 11, pal: "dusk", fit: 0.92, padTop: 0.16 },
  arcane: { scene: "arcane", seed: 29, pal: "arcane", fit: 0.92, padTop: 0.1 },
});

const card = $(".auth-card");
// in-card states (login → forgot → sent) with a scoped view transition when available
function show(name) {
  const swap = () => { $$(".auth-panel", card).forEach((p) => (p.hidden = p.dataset.panel !== name)); $(`[data-panel="${name}"] h1`, card)?.focus?.(); };
  if (!reduce && card.startViewTransition) card.startViewTransition(swap); else swap();
}
$$(".auth-panel h1").forEach((h) => h.setAttribute("tabindex", "-1"));
card.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) show(b.dataset.go); });

// Discord OAuth (mock)
$$("[data-discord]").forEach((b) => b.addEventListener("click", async () => {
  busy(b, true, "Открываем Discord…"); await wait(1100);
  session.set({ nick: "Kova_Miner", email: "miner@kova.gg", via: "discord" }); go("cabinet/");
}));

function wire(form, onOk) {
  if (!form) return;
  const sync = bridgeValidity(form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      // mark every field as interacted so :user-invalid styles show, then focus the first bad one
      $$("input", form).forEach((i) => { i.dispatchEvent(new Event("blur")); });
      const bad = $(":invalid:not(form)", form); bad?.focus();
      $$("input[data-error]", form).forEach((i) => { if (!i.validity.valid) { i.dataset.custom = "bad"; sync(i); } });
      return;
    }
    const btn = $('button[type="submit"]', form);
    busy(btn, true, btn.dataset.busy || "Секунду…"); await wait(900);
    busy(btn, false); onOk(new FormData(form));
  });
  $$("input[data-error]", form).forEach((i) => i.addEventListener("input", () => { if (i.validity.valid && i.dataset.custom) { delete i.dataset.custom; sync(i); } }));
}

wire($("#login-form"), (d) => { const email = d.get("email"); session.set({ nick: email.split("@")[0].replace(/[^A-Za-z0-9_]/g, "_").slice(0, 16) || "Player", email, via: "email" }); go("cabinet/"); });
wire($("#register-form"), (d) => { session.set({ nick: d.get("nickname"), email: d.get("email"), via: "email", fresh: true }); go("cabinet/"); });
wire($("#forgot-form"), (d) => { $(".sent-to").textContent = d.get("email"); show("sent"); });

// password rules light up as you type
const npw = $("#new-password");
npw?.addEventListener("input", () => {
  const v = npw.value, ok = { len: v.length >= 8, letter: /\p{L}/u.test(v), digit: /\d/.test(v) };
  $$("#pw-rules li").forEach((li) => li.classList.toggle("ok", ok[li.dataset.rule]));
});

// resend with cooldown
const rs = $("[data-resend]");
rs?.addEventListener("click", async () => {
  const st = $("[data-resend-status]"); let n = 30; rs.disabled = true;
  st.textContent = "Письмо отправлено повторно.";
  const lbl = $(".lbl", rs), base = "Отправить ещё раз";
  const t = setInterval(() => { n--; lbl.textContent = n > 0 ? `${base} · ${n} с` : base; if (n <= 0) { clearInterval(t); rs.disabled = false; } }, 1000);
});
