import { isConfigured } from "./firebase.js";
import { initLanding, showLandingFor } from "./landing.js";
import { openCanvas, closeCanvas } from "./canvas.js";
import { mountKeyboxes } from "./keybox.js";

// ---- Theme: light (ivory) by default, dark (charcoal) on request ----
const THEME_KEY = "bcm.theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}
applyTheme(localStorage.getItem(THEME_KEY) || "light");
document.querySelectorAll("[data-theme-toggle]").forEach(b => b.addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
}));

// ---- Modals ----
document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) modal.hidden = true;
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".modal:not([hidden])").forEach(m => { if (m.id !== "name-modal") m.hidden = true; });
  const sim = document.getElementById("sim");
  if (!sim.hidden) sim.hidden = true;
});

// ---- Copy buttons ----
document.body.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const target = document.querySelector(btn.dataset.copy);
  if (!target) return;
  try {
    await navigator.clipboard.writeText(target.value);
    showToast("Copied");
  } catch {
    target.select();
    document.execCommand("copy");
    showToast("Copied");
  }
});

// ---- Toast ----
let toastTimer;
export function showToast(msg, ms = 2400) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

// ---- Routing: #/c/<id> opens a board; ?activity=<key> preselects one on the landing page ----
const landing = document.getElementById("landing");
const workspace = document.getElementById("workspace");

function showLanding() {
  closeCanvas();
  workspace.hidden = true;
  landing.hidden = false;
  document.title = "Activity Boards · Business Innovation with Agentic AI and AI Agents";
  if (!isConfigured) document.getElementById("config-warning").hidden = false;
  showLandingFor(new URL(location.href).searchParams.get("activity"));
}
function showWorkspace(canvasId) {
  landing.hidden = true;
  workspace.hidden = false;
  window.scrollTo(0, 0);
  openCanvas(canvasId);
}

function route() {
  const url = new URL(location.href);
  const join = url.searchParams.get("join");
  if (join) {
    location.replace(`${url.pathname}#/c/${encodeURIComponent(join)}`);
    return;
  }
  const m = location.hash.match(/^#\/c\/(.+)$/);
  if (m) showWorkspace(decodeURIComponent(m[1]));
  else showLanding();
}

window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);

document.getElementById("btn-leave").addEventListener("click", (e) => {
  e.preventDefault();
  history.pushState(null, "", location.pathname);
  route();
});

mountKeyboxes();
initLanding();
route();
