// Trainer page (#/trainer): create one board per group in one go, then print or project
// a page with every group's Board ID, join link and QR code.
import { isConfigured, db, doc, writeBatch, serverTimestamp } from "./firebase.js";
import { CREATABLE_TEMPLATES, activityLabel, templateColor, escapeHtml } from "./boards.js";
import { genId } from "./landing.js";
import { showToast } from "./app.js";

const TRAINER_NAME_KEY = "bcm.trainerName";
const form = document.getElementById("trainer-form");
const out = document.getElementById("trainer-out");
const typeSel = document.getElementById("tr-type");
const countIn = document.getElementById("tr-count");
const orgIn = document.getElementById("tr-org");
const nameIn = document.getElementById("tr-name");
const namesIn = document.getElementById("tr-names");
const createBtn = document.getElementById("tr-create");

typeSel.innerHTML = CREATABLE_TEMPLATES.map(t =>
  `<option value="${t.key}">Activity ${t.num}: ${escapeHtml(t.title)}</option>`).join("");
nameIn.value = localStorage.getItem(TRAINER_NAME_KEY) || "";

export function showTrainerPage() {
  form.hidden = false;
  out.hidden = true;
  window.scrollTo(0, 0);
}

function joinUrl(id) {
  return `${location.origin}${location.pathname}?join=${encodeURIComponent(id)}`;
}

function renderCards(t, org, boards) {
  document.getElementById("tr-out-kicker").textContent = `${activityLabel(t)} · ${t.title}`;
  document.getElementById("tr-out-title").textContent =
    `${boards.length} group board${boards.length === 1 ? "" : "s"}${org ? ` · ${org}` : ""}`;
  const site = `${location.host}${location.pathname}`.replace(/\/$/, "");
  document.getElementById("tr-out-help").textContent =
    `Learners: scan your group's QR code, or open ${site}, choose "Join your group board" and enter the Board ID.`;
  const wrap = document.getElementById("tr-cards");
  wrap.innerHTML = boards.map((b, i) => `
    <article class="group-card" style="--c:${templateColor(t)}">
      <h3>${escapeHtml(b.group)}</h3>
      <div class="gc-act">${escapeHtml(activityLabel(t))} · ${escapeHtml(t.title)}</div>
      <div class="gc-qr" data-qr="${i}"></div>
      <div class="gc-id">${escapeHtml(b.id)}</div>
      <div class="gc-link">${escapeHtml(joinUrl(b.id))}</div>
      <a class="gc-open" href="#/c/${encodeURIComponent(b.id)}" target="_blank" rel="noopener">Open board</a>
    </article>`).join("");
  boards.forEach((b, i) => {
    const el = wrap.querySelector(`[data-qr="${i}"]`);
    if (window.QRCode) {
      new window.QRCode(el, { text: joinUrl(b.id), width: 156, height: 156, colorDark: "#21201C", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
    } else {
      el.textContent = "QR unavailable";
    }
  });
  form.hidden = true;
  out.hidden = false;
  window.scrollTo(0, 0);
}

async function createBoards() {
  const t = CREATABLE_TEMPLATES.find(x => x.key === typeSel.value) || CREATABLE_TEMPLATES[0];
  const n = Math.max(1, Math.min(10, parseInt(countIn.value, 10) || 0));
  countIn.value = n;
  const org = orgIn.value.trim();
  const trainer = nameIn.value.trim() || "Trainer";
  localStorage.setItem(TRAINER_NAME_KEY, nameIn.value.trim());
  const lines = namesIn.value.split("\n").map(s => s.trim());

  const used = new Set();
  const boards = Array.from({ length: n }, (_, i) => {
    let id;
    do { id = genId(); } while (used.has(id));
    used.add(id);
    return { id, group: (lines[i] || `Group ${i + 1}`).slice(0, 60) };
  });

  if (!isConfigured) { showToast("Board service not configured"); return; }
  createBtn.disabled = true;
  createBtn.textContent = "Creating…";
  try {
    const batch = writeBatch(db);
    boards.forEach(b => batch.set(doc(db, "canvases", b.id), {
      title: b.group,
      group: b.group,
      org,
      type: t.key,
      ownerName: trainer,
      createdVia: "trainer",
      learners: [],
      createdAt: serverTimestamp()
    }));
    await batch.commit();
    renderCards(t, org, boards);
  } catch (e) {
    console.error(e);
    showToast("Could not create the boards. Check your connection and try again.");
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create group boards";
  }
}

createBtn.addEventListener("click", createBoards);
document.getElementById("tr-again").addEventListener("click", showTrainerPage);
document.getElementById("tr-print").addEventListener("click", () => {
  document.body.classList.add("printing-trainer");
  window.print();
});
window.addEventListener("afterprint", () => document.body.classList.remove("printing-trainer"));
