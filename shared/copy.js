// Copy-to-clipboard via Invoker Commands (command="--copy" commandfor="id"),
// with a click fallback. Pattern from modern-web-guidance "copy-button".
const timers = new WeakMap();
let last = "";
function legacyCopy(text) {
  const f = Object.assign(document.createElement("textarea"), { value: text });
  f.setAttribute("readonly", "");
  f.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(f);
  f.select();
  try { return document.execCommand("copy"); } finally { f.remove(); }
}
function report(button, ok) {
  const tip = button.parentElement.querySelector("[role=status]");
  clearTimeout(timers.get(button));
  button.removeAttribute("data-copied");
  button.removeAttribute("data-failed");
  let msg = ok ? (button.dataset.ok || "Скопировано") : "Не удалось";
  if (msg === last) msg += "\u00A0";
  last = msg;
  if (tip) tip.textContent = "";
  void button.offsetWidth;
  button.setAttribute(ok ? "data-copied" : "data-failed", "");
  requestAnimationFrame(() => tip && (tip.textContent = msg));
  timers.set(button, setTimeout(() => {
    button.removeAttribute("data-copied");
    button.removeAttribute("data-failed");
    if (tip) tip.textContent = "";
  }, 2000));
}
async function copy(button, target) {
  const text = target.matches("input,textarea") ? target.value : target.innerText.trim();
  if (!text) return;
  try {
    try { await navigator.clipboard.writeText(text); }
    catch { if (!legacyCopy(text)) throw new Error("copy failed"); }
    report(button, true);
  } catch { report(button, false); }
}
if ("CommandEvent" in window) {
  document.addEventListener("command", (e) => {
    if (e.command === "--copy") copy(e.source, e.target);
  }, true);
} else {
  document.addEventListener("click", (e) => {
    const b = e.target.closest('button[command="--copy"]');
    if (!b) return;
    const t = document.getElementById(b.getAttribute("commandfor"));
    if (t) copy(b, t);
  });
}
