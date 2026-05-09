import {
  isConfigured, db, doc, collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch
} from "./firebase.js";
import { BLOCKS, getMe } from "./canvas.js";
import { showToast } from "./app.js";

let canvasId = null;
const unsubs = [];
const notesByBlock = new Map(); // blockId -> sorted array of notes

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
function relTime(ts) {
  if (!ts?.toMillis) return "just now";
  const diff = Date.now() - ts.toMillis();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function mountNotes(id) {
  canvasId = id;
  if (!isConfigured) {
    BLOCKS.forEach(b => renderBlockNotes(b.id, []));
    return;
  }
  BLOCKS.forEach(b => {
    const q = query(collection(db, "canvases", canvasId, "blocks", b.id, "notes"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      notesByBlock.set(b.id, arr);
      renderBlockNotes(b.id, arr);
    }, (err) => console.error(`[notes:${b.id}]`, err));
    unsubs.push(unsub);
  });
}

export function unmountNotes() {
  while (unsubs.length) { try { unsubs.pop()(); } catch {} }
  notesByBlock.clear();
  canvasId = null;
}

function renderBlockNotes(blockId, notes) {
  const list = document.querySelector(`.notes-list[data-block="${blockId}"]`);
  if (!list) return;
  if (!notes.length) {
    list.innerHTML = `<div class="empty-state">${list.dataset.empty}</div>`;
  } else {
    list.innerHTML = notes.map(n => noteHTML(blockId, n)).join("");
  }
  bindBlockEvents(list, blockId);
}

function noteHTML(blockId, n) {
  const me = getMe();
  const voted = (n.voters || []).includes(me.id);
  return `
    <article class="note" draggable="true"
             data-id="${n.id}" data-block="${blockId}"
             data-priority="${n.priority || 'medium'}">
      <div class="note-meta">
        ${n.category ? `<span class="badge">${escapeHtml(n.category)}</span>` : ""}
        <span class="badge badge-status" data-s="${n.status || 'draft'}">${escapeHtml(n.status || 'draft')}</span>
      </div>
      <h4 class="note-title">${escapeHtml(n.title || "Untitled")}</h4>
      ${n.description ? `<p class="note-desc">${escapeHtml(n.description)}</p>` : ""}
      <div class="note-foot">
        <span class="author">${escapeHtml(n.authorName || "Anon")}</span>
        <span>·</span>
        <span>${relTime(n.updatedAt || n.createdAt)}</span>
        <span class="spacer"></span>
        <div class="note-actions">
          <button class="vote ${voted ? 'voted' : ''}" data-action="vote" aria-label="Vote" title="Vote">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="${voted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9A2 2 0 0 0 19.72 9H14z"/></svg>
            <span class="vote-count">${n.votes || 0}</span>
          </button>
          <button data-action="edit" aria-label="Edit" title="Edit">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button data-action="delete" aria-label="Delete" title="Delete">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function bindBlockEvents(list, blockId) {
  list.querySelectorAll(".note").forEach(noteEl => {
    const id = noteEl.dataset.id;

    noteEl.querySelector("[data-action=vote]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      voteNote(blockId, id);
    });
    noteEl.querySelector("[data-action=edit]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const n = (notesByBlock.get(blockId) || []).find(x => x.id === id);
      if (n) openNoteEditor({ blockId, note: n });
    });
    noteEl.querySelector("[data-action=delete]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this note?")) deleteNote(blockId, id);
    });
    noteEl.addEventListener("click", () => {
      const n = (notesByBlock.get(blockId) || []).find(x => x.id === id);
      if (n) openNoteEditor({ blockId, note: n });
    });

    // drag-drop
    noteEl.addEventListener("dragstart", (e) => {
      noteEl.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify({ blockId, noteId: id }));
    });
    noteEl.addEventListener("dragend", () => noteEl.classList.remove("dragging"));
  });

  list.addEventListener("dragover", onDragOver);
  list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
  list.addEventListener("drop", onDrop);
}

function onDragOver(e) {
  const list = e.currentTarget;
  e.preventDefault();
  list.classList.add("drag-over");
  e.dataTransfer.dropEffect = "move";
}
async function onDrop(e) {
  e.preventDefault();
  const list = e.currentTarget;
  list.classList.remove("drag-over");
  let payload;
  try { payload = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
  const targetBlock = list.dataset.block;
  if (payload.blockId !== targetBlock) return; // MVP: same-block only

  const dragging = list.querySelector(".note.dragging") || document.querySelector(`.note[data-id="${payload.noteId}"]`);
  const after = afterElement(list, e.clientY);
  if (after == null) list.appendChild(dragging);
  else list.insertBefore(dragging, after);

  await persistOrder(targetBlock);
}
function afterElement(container, y) {
  const els = [...container.querySelectorAll(".note:not(.dragging)")];
  return els.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

async function persistOrder(blockId) {
  if (!isConfigured) return;
  const list = document.querySelector(`.notes-list[data-block="${blockId}"]`);
  const ids = [...list.querySelectorAll(".note")].map(el => el.dataset.id);
  try {
    const batch = writeBatch(db);
    ids.forEach((id, idx) => {
      batch.update(doc(db, "canvases", canvasId, "blocks", blockId, "notes", id), { order: idx });
    });
    await batch.commit();
  } catch (e) {
    console.error("Reorder failed", e);
    showToast("Could not save order");
  }
}

async function voteNote(blockId, noteId) {
  if (!isConfigured) return;
  const me = getMe();
  const arr = notesByBlock.get(blockId) || [];
  const n = arr.find(x => x.id === noteId);
  if (!n) return;
  const voted = (n.voters || []).includes(me.id);
  try {
    await updateDoc(doc(db, "canvases", canvasId, "blocks", blockId, "notes", noteId), {
      voters: voted ? arrayRemove(me.id) : arrayUnion(me.id),
      votes:  increment(voted ? -1 : 1),
      updatedAt: serverTimestamp()
    });
  } catch (e) { console.error(e); showToast("Vote failed"); }
}

async function deleteNote(blockId, noteId) {
  if (!isConfigured) return;
  try {
    await deleteDoc(doc(db, "canvases", canvasId, "blocks", blockId, "notes", noteId));
  } catch (e) { console.error(e); showToast("Delete failed"); }
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
const fDelete = document.getElementById("note-delete");

export function openNoteEditor({ blockId, note }) {
  fBlock.value = blockId;
  fId.value = note?.id || "";
  fTitle.value = note?.title || "";
  fDesc.value = note?.description || "";
  fCat.value = note?.category || "";
  setRadio("priority", note?.priority || "medium");
  setRadio("status", note?.status || "draft");
  fHeading.textContent = note ? "Edit Note" : "New Note";
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
  const me = getMe();
  const data = {
    title: fTitle.value.trim() || "Untitled",
    description: fDesc.value.trim(),
    category: fCat.value.trim(),
    priority: getRadio("priority"),
    status: getRadio("status"),
    updatedAt: serverTimestamp()
  };

  if (!isConfigured) {
    showToast("Firebase not configured");
    modal.hidden = true;
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "canvases", canvasId, "blocks", blockId, "notes", id), data);
    } else {
      const list = notesByBlock.get(blockId) || [];
      const order = list.length ? Math.max(...list.map(x => x.order ?? 0)) + 1 : 0;
      await addDoc(collection(db, "canvases", canvasId, "blocks", blockId, "notes"), {
        ...data,
        authorId: me.id,
        authorName: me.name,
        votes: 0,
        voters: [],
        order,
        createdAt: serverTimestamp()
      });
    }
    modal.hidden = true;
  } catch (e) { console.error(e); showToast("Save failed"); }
});

fDelete.addEventListener("click", async () => {
  const blockId = fBlock.value;
  const id = fId.value;
  if (!id) return;
  if (!confirm("Delete this note?")) return;
  await deleteNote(blockId, id);
  modal.hidden = true;
});
