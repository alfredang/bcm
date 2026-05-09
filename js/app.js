import { isConfigured } from "./firebase.js";
import { initLanding } from "./landing.js";
import { openCanvas, closeCanvas } from "./canvas.js";

// ---- Theme ----
const THEME_KEY = "bmc.theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
}
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

document.getElementById("theme-toggle-landing").addEventListener("click", toggleTheme);
document.getElementById("theme-toggle-workspace").addEventListener("click", toggleTheme);

// ---- Modals ----
function bindModalCloses() {
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]")) modal.hidden = true;
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal:not([hidden])").forEach(m => (m.hidden = true));
    }
  });
}
bindModalCloses();

// ---- Copy buttons ----
document.body.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const target = document.querySelector(btn.dataset.copy);
  if (!target) return;
  try {
    await navigator.clipboard.writeText(target.value);
    showToast("Copied to clipboard");
  } catch {
    target.select();
    document.execCommand("copy");
    showToast("Copied");
  }
});

// ---- Toast ----
let toastTimer;
export function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

// ---- Routing ----
const landing = document.getElementById("landing");
const workspace = document.getElementById("workspace");

function showLanding() {
  closeCanvas();
  workspace.hidden = true;
  landing.hidden = false;
  if (!isConfigured) document.getElementById("config-warning").hidden = false;
}
function showWorkspace(canvasId) {
  landing.hidden = true;
  workspace.hidden = false;
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

document.getElementById("btn-leave").addEventListener("click", () => {
  location.hash = "";
});

initLanding();
route();
