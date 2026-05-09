import {
  isConfigured, db, doc, setDoc, updateDoc, getDoc,
  collection, onSnapshot, query, orderBy, serverTimestamp
} from "./firebase.js";
import { mountNotes, unmountNotes, openNoteEditor } from "./notes.js";
import { openShareModal } from "./share.js";
import { showToast } from "./app.js";

export const BLOCKS = [
  { id: "keyPartners",     num: 1, title: "Key Partners",          prompt: "Strategic alliances that power your model.",
    questions: [
      "Who are our key partners?",
      "Who are our key suppliers?",
      "Which resources are we acquiring from partners?",
      "Which activities do partners perform?"
    ] },
  { id: "keyActivities",   num: 2, title: "Key Activities",        prompt: "What you must do well to deliver value.",
    questions: [
      "What key activities does our value proposition require?",
      "What activities are needed for distribution channels?",
      "What activities are needed for customer relationships?",
      "What activities are needed for revenue generation?"
    ] },
  { id: "keyResources",    num: 3, title: "Key Resources",         prompt: "The assets your model can't run without.",
    questions: [
      "What key resources are required?",
      "What physical, intellectual, human, or financial resources are needed?",
      "Which resources are most critical?"
    ] },
  { id: "valueProps",      num: 4, title: "Value Propositions",    prompt: "Why customers choose you.",
    questions: [
      "What value do we deliver to customers?",
      "Which customer problems are we solving?",
      "What customer needs are we satisfying?",
      "What makes our offer unique?"
    ] },
  { id: "customerRel",     num: 5, title: "Customer Relationships", prompt: "How you engage and retain each segment.",
    questions: [
      "What type of relationship does each customer segment expect?",
      "How do we acquire customers?",
      "How do we retain customers?",
      "How do we grow customers?"
    ] },
  { id: "channels",        num: 6, title: "Channels",              prompt: "How you reach customers and deliver value.",
    questions: [
      "Through which channels do customers want to be reached?",
      "Which channels work best?",
      "Which channels are most cost-efficient?",
      "How are channels integrated with customer routines?"
    ] },
  { id: "customerSeg",     num: 7, title: "Customer Segments",     prompt: "The people you create value for.",
    questions: [
      "Who are our most important customers?",
      "What are the customer groups?",
      "What are their needs, behaviours, and pain points?",
      "Are we serving mass market, niche market, segmented, or multi-sided market?"
    ] },
  { id: "costStructure",   num: 8, title: "Cost Structure",        prompt: "What it costs to operate the model.",
    questions: [
      "What are the most important costs?",
      "Which key resources are most expensive?",
      "Which key activities are most expensive?",
      "Is the business cost-driven or value-driven?"
    ] },
  { id: "revenueStreams",  num: 9, title: "Revenue Streams",       prompt: "How the business earns money.",
    questions: [
      "What are customers willing to pay for?",
      "How do they currently pay?",
      "How would they prefer to pay?",
      "What pricing model should be used?"
    ] }
];

const PARTICIPANT_KEY = "bmc.participantId";
const NAME_KEY = "bmc.displayName";
const COLOR_KEY = "bmc.color";
const COLORS = ["#5b6cff","#ff6b9b","#1f9d6c","#d98a18","#9b51e0","#ef476f","#06b6d4","#f59e0b","#10b981","#6366f1"];

let currentCanvasId = null;
let unsubCanvasMeta = null;
let unsubPresence = null;
let presenceInterval = null;

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
  if (!c) {
    c = COLORS[Math.floor(Math.random() * COLORS.length)];
    localStorage.setItem(COLOR_KEY, c);
  }
  return c;
}

function renderGrid() {
  const grid = document.getElementById("bmc-grid");
  grid.innerHTML = BLOCKS.map(b => `
    <section class="block" data-id="${b.id}">
      <div class="block-inner">
        <header class="block-head">
          <div class="block-title-wrap">
            <h2 class="block-title"><span class="block-num">${b.num}</span> ${b.title}</h2>
            <p class="block-prompt">${b.prompt}</p>
          </div>
          <div class="block-actions">
            <button class="block-info" data-action="toggle-guidance" aria-label="Show guidance for ${b.title}" title="Guidance">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
            <button class="block-add" data-action="add-note" aria-label="Add note to ${b.title}" title="Add note">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </header>
        <div class="guidance" hidden>
          <ul>${b.questions.map(q => `<li>${q}</li>`).join("")}</ul>
        </div>
        <div class="notes-list" data-block="${b.id}" data-empty="No notes yet. Click + to add one."></div>
      </div>
    </section>
  `).join("");

  grid.querySelectorAll(".block").forEach(blockEl => {
    const id = blockEl.dataset.id;
    blockEl.querySelector("[data-action=toggle-guidance]").addEventListener("click", () => {
      const g = blockEl.querySelector(".guidance");
      g.hidden = !g.hidden;
    });
    blockEl.querySelector("[data-action=add-note]").addEventListener("click", () => {
      openNoteEditor({ blockId: id });
    });
  });
}

function renderPresence(list) {
  const me = getParticipantId();
  const cutoff = Date.now() - 60_000;
  const active = list.filter(p => (p.lastSeen?.toMillis?.() ?? 0) > cutoff);
  const ordered = active.sort((a, b) => (a.id === me ? -1 : 1));
  const visible = ordered.slice(0, 5);
  const extra = active.length - visible.length;
  const el = document.getElementById("presence");
  el.innerHTML = visible.map(p => {
    const initials = (p.name || "?").trim().split(/\s+/).map(s => s[0]).slice(0,2).join("").toUpperCase();
    return `<span class="avatar" style="background:${p.color || '#5b6cff'}" title="${escapeHtml(p.name)}">${initials}</span>`;
  }).join("") + (extra > 0 ? `<span class="presence-more">+${extra}</span>` : "");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

async function joinPresence(canvasId) {
  if (!isConfigured) return;
  const pid = getParticipantId();
  const name = localStorage.getItem(NAME_KEY) || "Guest";
  const color = getColor();
  const ref = doc(db, "canvases", canvasId, "presence", pid);

  const heartbeat = async () => {
    try {
      await setDoc(ref, { name, color, lastSeen: serverTimestamp() }, { merge: true });
    } catch (e) { /* ignore transient */ }
  };
  await heartbeat();
  presenceInterval = setInterval(heartbeat, 20_000);

  const presQ = collection(db, "canvases", canvasId, "presence");
  unsubPresence = onSnapshot(presQ, (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    renderPresence(arr);
  });
}

async function watchCanvasMeta(canvasId) {
  if (!isConfigured) {
    document.getElementById("canvas-title").value = "Untitled Canvas (offline preview)";
    return;
  }
  const ref = doc(db, "canvases", canvasId);
  unsubCanvasMeta = onSnapshot(ref, (snap) => {
    const data = snap.data();
    const titleInput = document.getElementById("canvas-title");
    if (data && document.activeElement !== titleInput) {
      titleInput.value = data.title || "Untitled Canvas";
    }
  });
}

function bindTitleEditing(canvasId) {
  const input = document.getElementById("canvas-title");
  const commit = async () => {
    if (!isConfigured) return;
    const title = input.value.trim() || "Untitled Canvas";
    try {
      await updateDoc(doc(db, "canvases", canvasId), { title });
    } catch (e) { console.error(e); }
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); }
  });
}

export async function openCanvas(canvasId) {
  currentCanvasId = canvasId;
  renderGrid();
  bindTitleEditing(canvasId);

  document.getElementById("btn-share").onclick = () => openShareModal(canvasId);

  await watchCanvasMeta(canvasId);
  await joinPresence(canvasId);
  mountNotes(canvasId);
}

export function closeCanvas() {
  unsubCanvasMeta?.(); unsubCanvasMeta = null;
  unsubPresence?.();   unsubPresence = null;
  if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
  unmountNotes();
  currentCanvasId = null;
  document.getElementById("presence").innerHTML = "";
}

export function getCurrentCanvasId() { return currentCanvasId; }
export function getMe() {
  return {
    id: getParticipantId(),
    name: localStorage.getItem(NAME_KEY) || "Guest",
    color: getColor()
  };
}
