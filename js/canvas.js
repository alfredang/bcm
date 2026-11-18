import {
  isConfigured, db, doc, setDoc, updateDoc, getDoc,
  collection, onSnapshot, serverTimestamp, arrayUnion
} from "./firebase.js";
import { mountNotes, unmountNotes, openNoteEditor, addTypedAnswer, toggleExamples, loadWorkedExample, resetExampleView } from "./notes.js";
import { openShareModal } from "./share.js";
import { showToast } from "./app.js";
import { getTemplate, activityLabel, ppTask, blockColor, escapeHtml, COURSE } from "./boards.js";
import { enterShot, exitShot } from "./shot.js";

const PARTICIPANT_KEY = "bmc.participantId";
const NAME_KEY = "bmc.displayName";
const COLOR_KEY = "bmc.color";
const COLORS = ["#D97757", "#3A7D7B", "#A06A12", "#A84F2E", "#4F6D8A", "#6E7F3A", "#8A5577", "#2F6F6D"];

let currentCanvasId = null;
let currentTemplate = null;
let meta = { group: "", org: "", learners: [], ownerName: "" };
let unsubCanvasMeta = null;
let unsubPresence = null;
let presenceInterval = null;
let openToken = 0;

function getParticipantId() {
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(PARTICIPANT_KEY, id);
  }
  return id;
}
function getColor() {
  let c = localStorage.getItem(COLOR_KEY);
  if (!c || !COLORS.includes(c)) {
    c = COLORS[Math.floor(Math.random() * COLORS.length)];
    localStorage.setItem(COLOR_KEY, c);
  }
  return c;
}

export function getCurrentCanvasId() { return currentCanvasId; }
export function getCurrentTemplate() { return currentTemplate; }
export function getMeta() { return meta; }
export function getMe() {
  return { id: getParticipantId(), name: localStorage.getItem(NAME_KEY) || "Guest", color: getColor() };
}
/**
 * Group members for the header and screenshot: the creator, then everyone who opened the
 * board. A trainer who batch-creates boards (createdVia "trainer") is not a member.
 */
export function learnerNames() {
  const list = [...(meta.trainerMade ? [] : [meta.ownerName]), ...meta.learners];
  return [...new Set(list.map(s => (s || "").trim()).filter(Boolean))];
}

// ---- Name prompt (no login, just a name) ----
function ensureName() {
  const existing = (localStorage.getItem(NAME_KEY) || "").trim();
  if (existing) return Promise.resolve(existing);
  const modal = document.getElementById("name-modal");
  const form = document.getElementById("name-form");
  const input = document.getElementById("name-input");
  modal.hidden = false;
  setTimeout(() => input.focus(), 30);
  return new Promise(resolve => {
    form.onsubmit = (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      localStorage.setItem(NAME_KEY, v);
      modal.hidden = true;
      resolve(v);
    };
  });
}

// ---- Rendering ----
function renderIntro(t, canvasId) {
  document.getElementById("board-kicker").textContent =
    [activityLabel(t), t.lo, t.codes, `${t.minutes} min`].filter(Boolean).join(" · ");
  document.getElementById("board-title").textContent = t.title;
  document.getElementById("board-pitch").textContent = t.pitch;
  const pp = ppTask(t);
  const chip = document.getElementById("chip-evidence");
  chip.textContent = pp ? `${pp} evidence: screenshot this board` : t.evidence;
  chip.className = `chip ${pp ? "chip-teal" : "chip-accent"}`;
  document.getElementById("chip-id").textContent = `Board ID: ${canvasId}`;
  const discuss = document.getElementById("discuss");
  discuss.querySelector("summary").textContent = `Discuss before you write (${t.discuss.length} questions)`;
  document.getElementById("discuss-list").innerHTML = t.discuss.map(q => `<li>${escapeHtml(q)}</li>`).join("");
  document.getElementById("retired-note").hidden = !t.retired;
  const hasExamples = t.blocks.some(b => (b.example || []).length);
  document.getElementById("btn-view-example").hidden = !hasExamples;
  document.getElementById("btn-load-example").hidden = !hasExamples;
}

function renderMeta() {
  const t = currentTemplate;
  if (!t) return;
  const orgInput = document.getElementById("board-org");
  if (document.activeElement !== orgInput) orgInput.value = meta.org || "";
  const groupInput = document.getElementById("board-group");
  if (document.activeElement !== groupInput) groupInput.value = meta.group || "";
  const names = learnerNames();
  document.getElementById("chip-learners").textContent = names.length ? `On this board: ${names.join(", ")}` : "On this board: —";
  document.title = `${meta.group || meta.org || "Board"} · ${t.title}`;
}

const ICON_INFO = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const ICON_PLUS = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

function renderBoard(t) {
  const board = document.getElementById("board");
  board.className = `board layout-${t.layout === "bmc" ? "bmc" : "grid"}`;
  board.innerHTML = t.blocks.map((b, i) => `
    <section class="block" data-id="${b.id}" style="--c:${blockColor(i)}">
      <header class="block-head">
        <span class="block-num">${b.num}</span>
        <div class="block-titles">
          <h2 class="block-title">${escapeHtml(b.title)}</h2>
          <p class="block-prompt">${escapeHtml(b.prompt)}</p>
        </div>
        <div class="block-tools">
          <button class="mini-btn" data-action="guide" type="button" aria-expanded="false" title="Questions to answer" aria-label="Questions for ${escapeHtml(b.title)}">${ICON_INFO}</button>
          <button class="mini-btn" data-action="add" type="button" title="Add a detailed note" aria-label="Add a detailed note to ${escapeHtml(b.title)}">${ICON_PLUS}</button>
        </div>
      </header>
      <div class="guidance" hidden><ul>${b.questions.map(q => `<li>${escapeHtml(q)}</li>`).join("")}</ul></div>
      <div class="notes-list" data-block="${b.id}"></div>
      <div class="answer">
        <textarea rows="2" maxlength="580" placeholder="Type your answer…" aria-label="Type your answer for ${escapeHtml(b.title)}"></textarea>
        <span class="hint">Enter saves · Shift+Enter for a new line · first line is the headline</span>
      </div>
    </section>`).join("");

  board.querySelectorAll(".block").forEach(el => {
    const blockId = el.dataset.id;
    const guideBtn = el.querySelector("[data-action=guide]");
    guideBtn.addEventListener("click", () => {
      const g = el.querySelector(".guidance");
      g.hidden = !g.hidden;
      guideBtn.setAttribute("aria-expanded", String(!g.hidden));
    });
    el.querySelector("[data-action=add]").addEventListener("click", () => openNoteEditor({ blockId }));

    const ta = el.querySelector(".answer textarea");
    let saving = false;
    const save = async () => {
      const text = ta.value.trim();
      if (!text || saving) return;
      saving = true;
      ta.value = ""; // clear at once; the note appears via the live snapshot
      const ok = await addTypedAnswer(blockId, text);
      saving = false;
      if (!ok && !ta.value) ta.value = text; // put it back if the save failed
    };
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); save(); }
      if (e.key === "Escape") { ta.value = ""; ta.blur(); }
    });
    ta.addEventListener("blur", save);
  });
}

function renderPresence(list) {
  const me = getParticipantId();
  const cutoff = Date.now() - 60_000;
  const active = list.filter(p => (p.lastSeen?.toMillis?.() ?? Date.now()) > cutoff);
  active.sort((a) => (a.id === me ? -1 : 1));
  const visible = active.slice(0, 5);
  const extra = active.length - visible.length;
  document.getElementById("presence").innerHTML = visible.map(p => {
    const initials = (p.name || "?").trim().split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
    return `<span class="avatar" style="background:${escapeHtml(p.color || "#4F6D8A")}" title="${escapeHtml(p.name)}">${escapeHtml(initials)}</span>`;
  }).join("") + (extra > 0 ? `<span class="presence-more">+${extra}</span>` : "");
}

async function joinPresence(canvasId) {
  if (!isConfigured) return;
  const me = getMe();
  const ref = doc(db, "canvases", canvasId, "presence", me.id);
  const heartbeat = async () => {
    try { await setDoc(ref, { name: me.name, color: me.color, lastSeen: serverTimestamp() }, { merge: true }); }
    catch { /* transient */ }
  };
  await heartbeat();
  presenceInterval = setInterval(heartbeat, 20_000);
  unsubPresence = onSnapshot(collection(db, "canvases", canvasId, "presence"), (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    renderPresence(arr);
  });
}

function applyMeta(data) {
  meta = {
    group: data?.group || "",
    // Boards from before `org` existed used the title as the organisation
    org: data?.org ?? (data?.group ? "" : (data?.title || "")),
    learners: Array.isArray(data?.learners) ? data.learners : [],
    trainerMade: data?.createdVia === "trainer",
    ownerName: data?.ownerName || ""
  };
  renderMeta();
}

// Group name (the board title) and organisation editing
function bindMetaInput(inputId, field, label) {
  const input = document.getElementById(inputId);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
  input.addEventListener("blur", async () => {
    const id = currentCanvasId;
    const value = input.value.trim();
    if (!id || !value || value === meta[field]) { input.value = meta[field] || ""; return; }
    meta[field] = value;
    renderMeta();
    if (!isConfigured) return;
    // The board title is the group name; boards without one keep the organisation as title
    const update = { [field]: value };
    if (field === "group" || !meta.group) update.title = value;
    try { await updateDoc(doc(db, "canvases", id), update); }
    catch (e) { console.error(e); showToast(`Could not save the ${label}`); }
  });
}
bindMetaInput("board-group", "group", "group name");
bindMetaInput("board-org", "org", "organisation");

// Toolbar (bound once; acts on the open board)
document.getElementById("btn-share").addEventListener("click", () => currentCanvasId && openShareModal(currentCanvasId));
document.getElementById("btn-view-example").addEventListener("click", (e) => {
  const on = toggleExamples();
  e.currentTarget.setAttribute("aria-pressed", String(on));
  e.currentTarget.textContent = on ? "Hide example" : "View example";
});
document.getElementById("btn-load-example").addEventListener("click", () => loadWorkedExample());
document.getElementById("btn-shot").addEventListener("click", () => enterShot());

export async function openCanvas(canvasId) {
  const token = ++openToken;
  closeCanvas();
  currentCanvasId = canvasId;
  document.getElementById("board").innerHTML = "";
  document.getElementById("board-title").textContent = "Opening board…";

  const name = await ensureName();
  if (token !== openToken) return;

  let data = null;
  if (isConfigured) {
    try {
      const snap = await getDoc(doc(db, "canvases", canvasId));
      if (token !== openToken) return;
      if (!snap.exists()) {
        showToast("No board with that ID");
        location.hash = "";
        return;
      }
      data = snap.data();
    } catch (e) {
      console.error(e);
      showToast("Could not reach the board service");
    }
  }

  currentTemplate = getTemplate(data?.type); // old canvases have no type: classic BMC
  renderIntro(currentTemplate, canvasId);
  renderBoard(currentTemplate);
  applyMeta(data);

  const btn = document.getElementById("btn-view-example");
  btn.setAttribute("aria-pressed", "false");
  btn.textContent = "View example";
  resetExampleView();

  mountNotes(canvasId, currentTemplate);
  // A board just created on the landing page opens straight onto Share: QR code + Board ID for the group.
  try {
    if (sessionStorage.getItem("bcm.showShare") === canvasId) {
      sessionStorage.removeItem("bcm.showShare");
      setTimeout(() => openShareModal(canvasId), 300);
    }
  } catch {}
  if (!isConfigured) return;

  const ref = doc(db, "canvases", canvasId);
  unsubCanvasMeta = onSnapshot(ref, (snap) => { if (snap.exists()) applyMeta(snap.data()); });
  if (!(meta.learners || []).includes(name)) {
    updateDoc(ref, { learners: arrayUnion(name) }).catch(e => console.error("learner add failed", e));
  }
  joinPresence(canvasId);
}

export function closeCanvas() {
  unsubCanvasMeta?.(); unsubCanvasMeta = null;
  unsubPresence?.(); unsubPresence = null;
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  unmountNotes();
  exitShot();
  currentCanvasId = null;
  document.getElementById("presence").innerHTML = "";
}

export { COURSE };
