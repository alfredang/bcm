// Screenshot view: hides the editing chrome and shows a clean header strip
// (course, activity, organisation, learners, date) above the board.
// Download PNG uses html2canvas; Download PDF adds jsPDF for a one-page landscape A4.
// Both libraries load from jsDelivr only when first needed. Print uses the print stylesheet.
import { getCurrentTemplate, getMeta, learnerNames, getMe } from "./canvas.js";
import { activityLabel, ppTask } from "./boards.js";
import { showToast } from "./app.js";

const HTML2CANVAS_URL = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
const JSPDF_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

const loaded = {};
function loadScript(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = () => { delete loaded[src]; reject(new Error(`Could not load ${src}`)); };
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}

function todayLabel() {
  return new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

/** Fill the header strip from the current board. Also used by print. */
export function fillStrip() {
  const t = getCurrentTemplate();
  if (!t) return;
  const meta = getMeta();
  const me = getMe().name;
  const others = learnerNames().filter(n => n !== me);
  const pp = ppTask(t);
  document.getElementById("shot-title").textContent = `${activityLabel(t)} · ${t.title}`;
  const groupEl = document.getElementById("shot-group");
  groupEl.textContent = meta.group || meta.org || "";
  groupEl.hidden = !groupEl.textContent;
  document.getElementById("shot-meta").innerHTML = [
    `Learner: <b>${esc(me)}</b>`,
    others.length ? `Also on this board: <b>${esc(others.join(", "))}</b>` : "",
    meta.group && meta.org ? `Organisation: <b>${esc(meta.org)}</b>` : "",
    `Date: <b>${esc(todayLabel())}</b>`,
    pp ? `Evidence for <b>${esc(pp)}</b>` : esc(t.evidence)
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
}

function fileBase() {
  const t = getCurrentTemplate();
  const m = getMeta();
  const org = (m.group || m.org || "board").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const me = getMe().name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  return `${t?.num ? `activity${t.num}` : "board"}-${org || "board"}-${me || "learner"}-${ymd}`;
}

export function enterShot() {
  if (!getCurrentTemplate()) return;
  const active = document.activeElement;
  if (active && active.tagName === "TEXTAREA") active.blur(); // saves a half-typed answer
  fillStrip();
  document.body.classList.add("shot");
  document.getElementById("shot-strip").hidden = false;
  document.getElementById("shot-bar").hidden = false;
  window.scrollTo(0, 0);
}

export function exitShot() {
  document.body.classList.remove("shot");
  document.getElementById("shot-strip").hidden = true;
  document.getElementById("shot-bar").hidden = true;
}

/**
 * Render #capture to a canvas. With targetAspect (width / height), try a few board widths
 * and keep the one whose shape is closest, so a one-page PDF fills the page.
 */
async function renderCanvas(targetAspect) {
  await loadScript(HTML2CANVAS_URL);
  const el = document.getElementById("capture");
  const bg = getComputedStyle(document.body).backgroundColor;
  const oldWidth = el.style.width;
  // Pin the width while rendering so html2canvas lays the clone out exactly as measured
  let width = Math.max(1100, Math.round(el.getBoundingClientRect().width));
  el.style.width = `${width}px`;
  if (targetAspect) {
    let best = { w: width, diff: Infinity };
    for (const w of [1300, 1500, 1700, 1900, 2150, 2400]) {
      el.style.width = `${w}px`;
      const diff = Math.abs(w / el.scrollHeight - targetAspect);
      if (diff < best.diff) best = { w, diff };
    }
    width = best.w;
    el.style.width = `${width}px`;
  }
  try {
    return await window.html2canvas(el, {
      backgroundColor: bg,
      scale: targetAspect ? 1.6 : 2,
      useCORS: true,
      logging: false,
      windowWidth: Math.max(1200, width),
      width: el.scrollWidth,
      height: el.scrollHeight
    });
  } finally {
    el.style.width = oldWidth;
  }
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function withBusy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  try { await fn(); }
  finally { btn.disabled = false; btn.textContent = old; }
}

export async function downloadPng() {
  const btn = document.getElementById("btn-png");
  await withBusy(btn, "Rendering…", async () => {
    try {
      fillStrip();
      const canvas = await renderCanvas();
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      saveBlob(blob, `${fileBase()}.png`);
      showToast("PNG downloaded: paste it into your PP");
    } catch (e) {
      console.error(e);
      showToast("Could not make the PNG. Use your device's screenshot key instead.", 4000);
    }
  });
}

export async function downloadPdf() {
  const btn = document.getElementById("btn-pdf");
  await withBusy(btn, "Rendering…", async () => {
    try {
      fillStrip();
      const margin = 8;
      const A4 = { w: 297, h: 210 };
      const [canvas] = await Promise.all([
        renderCanvas((A4.w - margin * 2) / (A4.h - margin * 2)),
        loadScript(JSPDF_URL)
      ]);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const t = getCurrentTemplate();
      pdf.setProperties({ title: `${activityLabel(t)} · ${t.title} · ${getMeta().group || getMeta().org || ""} · ${getMe().name}`, creator: "Activity Boards · Tertiary Infotech Academy" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pageW - w) / 2, margin, w, h);
      pdf.save(`${fileBase()}.pdf`);
      showToast("PDF downloaded");
    } catch (e) {
      console.error(e);
      showToast("Could not make the PDF here. Opening Print instead: choose Save as PDF.", 4500);
      setTimeout(printBoard, 600);
    }
  });
}

export function printBoard() {
  fillStrip();
  window.print();
}

document.getElementById("btn-png").addEventListener("click", downloadPng);
document.getElementById("btn-pdf").addEventListener("click", downloadPdf);
document.getElementById("btn-print").addEventListener("click", printBoard);
document.getElementById("btn-shot-exit").addEventListener("click", exitShot);
window.addEventListener("beforeprint", fillStrip);
