import {
  isConfigured, db, doc, collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch
} from "./firebase.js";
import { getMe } from "./canvas.js";
import { showToast } from "./app.js";
import { escapeHtml, EXAMPLE_COMPANY } from "./boards.js";

let canvasId = null;
let template = null;
let showExamples = false;
const unsubs = [];
const notesByBlock = new Map(); // blockId -> notes sorted by order

function relTime(ts) {
  if (!ts?.toMillis) return "just now";
  const m = Math.floor((Date.now() - ts.toMillis()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const notesRef = (blockId) => collection(db, "canvases", canvasId, "blocks", blockId, "notes");
const noteRef = (blockId, id) => doc(db, "canvases", canvasId, "blocks", blockId, "notes", id);

export function getNotesByBlock() { return notesByBlock; }
export function countNotes() {
  let n = 0;
  notesByBlock.forEach(arr => { n += arr.length; });
  return n;
}

export function mountNotes(id, tpl) {
  canvasId = id;
  template = tpl;
  template.blocks.forEach(b => {
    notesByBlock.set(b.id, []);
    renderBlockNotes(b.id);
  });
  if (!isConfigured) return;
  template.blocks.forEach(b => {
    const q = query(notesRef(b.id), orderBy("order", "asc"));
    unsubs.push(onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      notesByBlock.set(b.id, arr);
      renderBlockNotes(b.id);
    }, (err) => console.error(`[notes:${b.id}]`, err)));
  });
}

export function unmountNotes() {
  while (unsubs.length) { try { unsubs.pop()(); } catch {} }
  notesByBlock.clear();
  canvasId = null;
  template = null;
}

// ---- Rendering ----
const ICON_VOTE = (on) => `<svg viewBox="0 0 24 24" width="13" height="13" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9A2 2 0 0 0 19.72 9H14z"/></svg>`;
const ICON_EDIT = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
const ICON_DEL = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

function tagHTML(cat) {
  if (!cat) return "";
  const cls = cat === "Example" ? "tag tag-example" : cat === "AI" ? "tag tag-ai" : "tag";
  return `<span class="${cls}">${escapeHtml(cat)}</span>`;
}

function noteHTML(blockId, n) {
  const me = getMe();
  const voted = (n.voters || []).includes(me.id);
  const pr = n.priority || "medium";
  const st = n.status || "draft";
  return `
    <article class="note" draggable="true" tabindex="0" data-id="${escapeHtml(n.id)}" data-block="${blockId}">
      <div class="note-meta">
        <span class="pri" data-p="${escapeHtml(pr)}" title="Priority: ${escapeHtml(pr)}"></span>
        ${tagHTML(n.category)}
        ${st !== "draft" ? `<span class="tag tag-status" data-s="${escapeHtml(st)}">${escapeHtml(st)}</span>` : ""}
      </div>
      <h4 class="note-title">${escapeHtml(n.title || "Untitled")}</h4>
      ${n.description ? `<p class="note-desc">${escapeHtml(n.description)}</p>` : ""}
      <div class="note-foot">
        <span>${escapeHtml(n.authorName || "Anon")}<span class="when"> · ${relTime(n.updatedAt || n.createdAt)}</span></span>
        <span class="grow"></span>
        <div class="note-actions">
          <button class="vote ${voted ? "voted" : ""}" data-action="vote" type="button" title="Vote" aria-label="Vote">${ICON_VOTE(voted)}<span>${n.votes || 0}</span></button>
          <button data-action="edit" type="button" title="Edit" aria-label="Edit">${ICON_EDIT}</button>
          <button data-action="delete" type="button" title="Delete" aria-label="Delete">${ICON_DEL}</button>
        </div>
      </div>
    </article>`;
}

function ghostHTML(ex) {
  return `
    <article class="note ghost" aria-label="Example note">
      <div class="note-meta"><span class="tag tag-example">Example</span></div>
      <h4 class="note-title">${escapeHtml(ex.title)}</h4>
      ${ex.description ? `<p class="note-desc">${escapeHtml(ex.description)}</p>` : ""}
    </article>`;
}

function renderBlockNotes(blockId) {
  const list = document.querySelector(`.notes-list[data-block="${blockId}"]`);
  if (!list) return;
  const notes = notesByBlock.get(blockId) || [];
  const block = template?.blocks.find(b => b.id === blockId);
  let html = notes.map(n => noteHTML(blockId, n)).join("");
  if (!notes.length) html += `<p class="empty-block">No answer yet.</p>`;
  if (showExamples && block?.example?.length) {
    html += `<div class="ghost-head">Example · ${escapeHtml(EXAMPLE_COMPANY)}</div>` + block.example.map(ghostHTML).join("");
  }
  list.innerHTML = html;
  bindNotes(list, blockId);
}

function renderAll() {
  template?.blocks.forEach(b => renderBlockNotes(b.id));
}

export function toggleExamples() {
  showExamples = !showExamples;
  renderAll();
  return showExamples;
}
export function resetExampleView() { showExamples = false; }

function findNote(blockId, id) {
  return (notesByBlock.get(blockId) || []).find(x => x.id === id);
}

function bindNotes(list, blockId) {
  list.querySelectorAll(".note:not(.ghost)").forEach(el => {
    const id = el.dataset.id;
    el.querySelector("[data-action=vote]").addEventListener("click", (e) => { e.stopPropagation(); voteNote(blockId, id); });
    el.querySelector("[data-action=edit]").addEventListener("click", (e) => {
      e.stopPropagation();
      const n = findNote(blockId, id);
      if (n) openNoteEditor({ blockId, note: n });
    });
    el.querySelector("[data-action=delete]").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this note?")) deleteNote(blockId, id);
    });
    const open = () => { const n = findNote(blockId, id); if (n) openNoteEditor({ blockId, note: n }); };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === el) open(); });
    el.addEventListener("dragstart", (e) => {
      el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({ blockId, noteId: id }));
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
  });
  if (!list.dataset.dnd) {
    list.dataset.dnd = "1";
    list.addEventListener("dragover", (e) => { e.preventDefault(); list.classList.add("drag-over"); e.dataTransfer.dropEffect = "move"; });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", onDrop);
  }
}

async function onDrop(e) {
  e.preventDefault();
  const list = e.currentTarget;
  list.classList.remove("drag-over");
  let payload;
  try { payload = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
  const targetBlock = list.dataset.block;
  if (payload.blockId !== targetBlock) return; // reorder within a block only
  const dragging = list.querySelector(".note.dragging");
  if (!dragging) return;
  const after = [...list.querySelectorAll(".note:not(.dragging):not(.ghost)")].reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = e.clientY - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
  }, { offset: -Infinity, element: null }).element;
  if (after) list.insertBefore(dragging, after);
  else {
    const lastNote = [...list.querySelectorAll(".note:not(.ghost)")].pop();
    lastNote ? lastNote.after(dragging) : list.prepend(dragging);
  }
  if (!isConfigured) return;
  const ids = [...list.querySelectorAll(".note:not(.ghost)")].map(el => el.dataset.id);
  try {
    const batch = writeBatch(db);
    ids.forEach((id, idx) => batch.update(noteRef(targetBlock, id), { order: idx }));
    await batch.commit();
  } catch (err) {
    console.error("Reorder failed", err);
    showToast("Could not save the new order");
  }
}

async function voteNote(blockId, noteId) {
  if (!isConfigured) return;
  const me = getMe();
  const n = findNote(blockId, noteId);
  if (!n) return;
  const voted = (n.voters || []).includes(me.id);
  try {
    await updateDoc(noteRef(blockId, noteId), {
      voters: voted ? arrayRemove(me.id) : arrayUnion(me.id),
      votes: increment(voted ? -1 : 1),
      updatedAt: serverTimestamp()
    });
  } catch (e) { console.error(e); showToast("Vote failed"); }
}

async function deleteNote(blockId, noteId) {
  if (!isConfigured) return;
  try { await deleteDoc(noteRef(blockId, noteId)); }
  catch (e) { console.error(e); showToast("Delete failed"); }
}

function nextOrder(blockId) {
  const list = notesByBlock.get(blockId) || [];
  return list.length ? Math.max(...list.map(x => x.order ?? 0)) + 1 : 0;
}

function baseNote(fields) {
  const me = getMe();
  return {
    title: "Untitled",
    description: "",
    category: "",
    priority: "medium",
    status: "draft",
    authorId: me.id,
    authorName: me.name,
    votes: 0,
    voters: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...fields
  };
}

/** Split typed text into a headline (first line, max 80 chars) and detail (the rest). */
export function splitAnswer(text) {
  const clean = text.replace(/\r/g, "").trim();
  const [first, ...rest] = clean.split("\n");
  let title = first.trim();
  let description = rest.join("\n").trim();
  if (title.length > 80) {
    const cut = title.slice(0, 80);
    const at = cut.lastIndexOf(" ");
    title = `${cut.slice(0, at > 40 ? at : 77)}…`;
    description = clean;
  }
  return { title, description: description.slice(0, 500) };
}

/** Inline "Type your answer" box: one note per answer. Returns true when saved. */
export async function addTypedAnswer(blockId, text) {
  if (!isConfigured) { showToast("Board service not configured"); return false; }
  const { title, description } = splitAnswer(text);
  try {
    await addDoc(notesRef(blockId), baseNote({ title, description, order: nextOrder(blockId) }));
    return true;
  } catch (e) {
    console.error(e);
    showToast("Could not save your answer. Check your connection.");
    return false;
  }
}

/** Add several notes at once (AI suggestions). */
export async function addNotes(blockId, notes, category) {
  if (!isConfigured) return false;
  const batch = writeBatch(db);
  let order = nextOrder(blockId);
  notes.forEach(n => {
    batch.set(doc(notesRef(blockId)), baseNote({
      title: String(n.title || "Untitled").slice(0, 80),
      description: String(n.description || "").slice(0, 500),
      category: category || "",
      order: order++
    }));
  });
  try { await batch.commit(); return true; }
  catch (e) { console.error(e); showToast("Could not add the notes"); return false; }
}

/** Copy the template's worked example (Meridian Services) onto the board as "Example" notes. */
export async function loadWorkedExample() {
  if (!template) return;
  const blocks = template.blocks.filter(b => (b.example || []).length);
  if (!blocks.length) return;
  const existing = countNotes();
  const total = blocks.reduce((s, b) => s + b.example.length, 0);
  const msg = existing
    ? `This board already has ${existing} note${existing === 1 ? "" : "s"}. Add the ${total} worked-example notes for ${EXAMPLE_COMPANY} as well? They are tagged "Example" so you can delete them later.`
    : `Copy the ${total} worked-example notes for ${EXAMPLE_COMPANY} onto this board? They are tagged "Example"; edit or delete them as you write your own.`;
  if (!confirm(msg)) return;
  if (!isConfigured) { showToast("Board service not configured"); return; }
  try {
    const batch = writeBatch(db);
    blocks.forEach(b => {
      let order = nextOrder(b.id);
      b.example.forEach(ex => {
        batch.set(doc(notesRef(b.id)), baseNote({
          title: ex.title.slice(0, 80),
          description: (ex.description || "").slice(0, 500),
          category: "Example",
          authorName: "Worked example",
          order: order++
        }));
      });
    });
    await batch.commit();
    showToast(`Loaded ${total} example notes`);
  } catch (e) {
    console.error(e);
    showToast("Could not load the example");
  }
}

// ---- Editor modal ----
const modal = document.getElementById("note-modal");
const form = document.getElementById("note-form");
const fBlock = document.getElementById("note-block");
const fId = document.getElementById("note-id");
const fTitle = document.getElementById("note-title");
const fDesc = document.getElementById("note-desc");
const fCat = document.getElementById("note-category");
const fHeading = document.getElementById("note-title-h");
const fBlockName = document.getElementById("note-block-name");
const fDelete = document.getElementById("note-delete");

export function openNoteEditor({ blockId, note }) {
  fBlock.value = blockId;
  fId.value = note?.id || "";
  fTitle.value = note?.title || "";
  fDesc.value = note?.description || "";
  fCat.value = note?.category || "";
  setRadio("priority", note?.priority || "medium");
  setRadio("status", note?.status || "draft");
  const block = template?.blocks.find(b => b.id === blockId);
  fBlockName.textContent = block ? `${block.num}. ${block.title}` : "";
  fHeading.textContent = note ? "Edit note" : "New note";
  fDelete.hidden = !note;
  modal.hidden = false;
  setTimeout(() => fTitle.focus(), 30);
}
function setRadio(name, value) {
  const r = form.querySelector(`input[name="${name}"][value="${value}"]`);
  if (r) r.checked = true;
}
function getRadio(name) {
  return form.querySelector(`input[name="${name}"]:checked`)?.value;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const blockId = fBlock.value;
  const id = fId.value;
  const data = {
    title: fTitle.value.trim() || "Untitled",
    description: fDesc.value.trim(),
    category: fCat.value.trim(),
    priority: getRadio("priority"),
    status: getRadio("status"),
    updatedAt: serverTimestamp()
  };
  if (!isConfigured) { modal.hidden = true; return showToast("Board service not configured"); }
  try {
    if (id) await updateDoc(noteRef(blockId, id), data);
    else await addDoc(notesRef(blockId), baseNote({ ...data, order: nextOrder(blockId) }));
    modal.hidden = true;
  } catch (err) { console.error(err); showToast("Save failed"); }
});

fDelete.addEventListener("click", async () => {
  if (!fId.value || !confirm("Delete this note?")) return;
  await deleteNote(fBlock.value, fId.value);
  modal.hidden = true;
});
