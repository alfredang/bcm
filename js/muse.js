// Meta Muse helpers: copy the board's Muse prompt, and turn Muse's pasted numbered reply
// into notes for the matching blocks (previewed and ticked by the learner first).
import { getCurrentTemplate } from "./canvas.js";
import { addNotes } from "./notes.js";
import { musePromptFor, blockColor, escapeHtml } from "./boards.js";
import { showToast } from "./app.js";

const modal = document.getElementById("muse-modal");
const input = document.getElementById("muse-input");
const preview = document.getElementById("muse-preview");
const unmatchedWrap = document.getElementById("muse-unmatched-wrap");
const unmatchedBox = document.getElementById("muse-unmatched");
const countEl = document.getElementById("muse-count");
const addBtn = document.getElementById("muse-add");

// ---------- clipboard ----------
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    return ok;
  }
}

export async function copyMusePrompt() {
  const t = getCurrentTemplate();
  if (!t) return;
  if (await copyText(musePromptFor(t))) {
    showToast("Paste into Meta Muse, then type the best answers into each block", 4200);
  } else {
    openPasteDialog(true);
    showToast("Copy blocked by the browser: copy the prompt from the box", 4200);
  }
}

// ---------- parsing ----------
const norm = (s) => String(s).toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

/** Strip Markdown decoration Muse tends to add: headings, bold, quotes, bullets. */
function clean(line) {
  return line
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/\*\*|__/g, "")
    .replace(/^\s*[*_]+|[*_]+\s*$/g, "")
    .trim();
}
const BULLET = /^\s*(?:[-*•·–—▪◦‣]|\(?[a-z]\)|\(?\d{1,2}[.)])\s+/i;

/** Ways a learner's Muse reply might name a block. */
function variants(block) {
  const full = norm(block.title);
  const out = new Set([full]);
  const afterDot = block.title.split("·").pop();
  if (afterDot !== block.title) out.add(norm(afterDot));
  const beforeParen = block.title.split("(")[0];
  if (beforeParen !== block.title) out.add(norm(beforeParen));
  return [...out].filter(v => v.length >= 4);
}

/**
 * Block named by `text`. Exact title (or a clear abbreviation of it) always counts; `loose`
 * also accepts a title followed by more words, used only for numbered lines ("1. Title (...)")
 * so an ordinary note that happens to start with a block's name is not taken as a header.
 */
function matchTitle(text, blocks, loose = false) {
  const n = norm(text);
  if (!n) return null;
  for (const b of blocks) {
    for (const v of variants(b)) {
      if (n === v || (n.length >= 8 && v.startsWith(`${n} `)) || (loose && n.startsWith(`${v} `))) return b;
    }
  }
  return null;
}

/** Split "Header: content" / "Header - content"; returns [left, right]. */
function splitHeader(s) {
  const m = s.match(/^(.*?)(?:\s*:\s+|\s*:$|\s+[–—-]\s+)(.*)$/);
  return m ? [m[1], m[2] || ""] : [s, ""];
}

/**
 * Parse Muse's reply. Returns { byBlock: Map(blockId -> [text]), unmatched: [lines] }.
 * A header is a line naming a block (by "N. Title", "Title", "### Title", "**N. Title:**").
 * Lines under a header become notes for that block. Lines before the first header, and
 * lines after a "verify first" section, stay unmatched.
 */
export function parseMuseReply(template, text) {
  const blocks = template.blocks;
  const byNum = new Map(blocks.map(b => [b.num, b]));
  const byBlock = new Map(blocks.map(b => [b.id, []]));
  const unmatched = [];
  let current = null;

  const pushNotes = (block, content, inline = false) => {
    const c = clean(content).replace(BULLET, "").trim();
    if (!c) return;
    // "Title: note one; note two" on a header line -> two notes, when both halves are real phrases
    const parts = inline ? c.split(/\s*;\s+/).map(p => p.trim()).filter(Boolean) : [c];
    const list = parts.length > 1 && parts.every(p => p.split(/\s+/).length >= 3) ? parts : [c];
    byBlock.get(block.id).push(...list);
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = clean(raw);
    if (!line) continue;

    // Header?  "N. Title[: content]" or "Title[: content]"
    let header = null, rest = "";
    const num = line.match(/^(?:block\s*)?(\d{1,2})\s*[.):\-–—]\s*(.*)$/i);
    if (num) {
      const [left, right] = splitHeader(num[2]);
      const byTitle = matchTitle(left, blocks, true);
      const sameNum = byNum.get(Number(num[1]));
      if (byTitle) { header = byTitle; rest = right; }
      else if (sameNum && !num[2].trim()) { header = sameNum; }
    } else if (!BULLET.test(raw)) {
      const [left, right] = splitHeader(line);
      const byTitle = matchTitle(left, blocks);
      if (byTitle) { header = byTitle; rest = right; }
    }

    if (header) {
      current = header;
      if (rest) pushNotes(current, rest, true);
      continue;
    }
    // The closing "three notes I should verify first" section is not a block
    if (/verify (these )?first|should verify|check first|to verify/i.test(line) && !BULLET.test(raw)) {
      current = null;
      unmatched.push(line);
      continue;
    }
    if (current) pushNotes(current, raw);
    else unmatched.push(raw.trim());
  }
  return { byBlock, unmatched };
}

/** "ServiceNow: holds every ticket" -> title + description; long lines keep the full text. */
export function toNote(text) {
  const t = text.trim();
  const m = t.match(/^([^:]{2,60}):\s+(.+)$/);
  if (m) return { title: m[1].trim(), description: m[2].trim().slice(0, 500) };
  if (t.length <= 80) return { title: t, description: "" };
  const cut = t.slice(0, 80);
  const at = cut.lastIndexOf(" ");
  return { title: `${cut.slice(0, at > 40 ? at : 77)}…`, description: t.slice(0, 500) };
}

// ---------- dialog ----------
function renderPreview() {
  const t = getCurrentTemplate();
  const { byBlock, unmatched } = parseMuseReply(t, input.value);
  let total = 0;
  preview.innerHTML = t.blocks.map((b, i) => {
    const items = byBlock.get(b.id) || [];
    total += items.length;
    return `
      <div class="muse-block" style="--c:${blockColor(i)}" data-block="${b.id}">
        <h4>${b.num}. ${escapeHtml(b.title)}</h4>
        ${items.length ? items.map(txt => `
          <label class="muse-item">
            <input type="checkbox" checked aria-label="Add this note" />
            <textarea rows="1">${escapeHtml(txt)}</textarea>
          </label>`).join("") : `<div class="muse-empty">Nothing found for this block.</div>`}
      </div>`;
  }).join("");
  preview.querySelectorAll(".muse-item textarea").forEach(ta => {
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight + 2, 120)}px`;
  });
  unmatchedWrap.hidden = !unmatched.length;
  unmatchedBox.value = unmatched.join("\n");
  countEl.textContent = input.value.trim()
    ? `${total} answer${total === 1 ? "" : "s"} found${unmatched.length ? ` · ${unmatched.length} line${unmatched.length === 1 ? "" : "s"} not matched` : ""}`
    : "";
  preview.querySelectorAll("input[type=checkbox]").forEach(cb => cb.addEventListener("change", updateAddButton));
  updateAddButton();
}

function selected() {
  const out = [];
  preview.querySelectorAll(".muse-block").forEach(el => {
    const notes = [...el.querySelectorAll(".muse-item")]
      .filter(it => it.querySelector("input").checked)
      .map(it => it.querySelector("textarea").value.trim())
      .filter(Boolean)
      .map(toNote);
    if (notes.length) out.push([el.dataset.block, notes]);
  });
  return out;
}

function updateAddButton() {
  const n = selected().reduce((s, [, notes]) => s + notes.length, 0);
  addBtn.disabled = n === 0;
  addBtn.textContent = n ? `Add ${n} selected note${n === 1 ? "" : "s"}` : "Add selected";
}

export function openPasteDialog(showPrompt = false) {
  const t = getCurrentTemplate();
  if (!t) return;
  document.getElementById("muse-prompt-text").value = musePromptFor(t);
  modal.querySelector(".muse-prompt-box").open = Boolean(showPrompt);
  input.value = "";
  preview.innerHTML = "";
  unmatchedWrap.hidden = true;
  countEl.textContent = "";
  updateAddButton();
  modal.hidden = false;
  setTimeout(() => input.focus(), 30);
}

document.getElementById("muse-parse").addEventListener("click", renderPreview);
input.addEventListener("paste", () => setTimeout(renderPreview, 0));
addBtn.addEventListener("click", async () => {
  const groups = selected();
  if (!groups.length) return;
  addBtn.disabled = true;
  let added = 0;
  for (const [blockId, notes] of groups) {
    if (await addNotes(blockId, notes, "Muse")) added += notes.length;
  }
  if (added) {
    showToast(`Added ${added} Muse note${added === 1 ? "" : "s"}: edit them into your own words`, 3500);
    modal.hidden = true;
  } else {
    updateAddButton();
  }
});
document.getElementById("btn-muse-copy").addEventListener("click", copyMusePrompt);
document.getElementById("btn-muse-paste").addEventListener("click", () => openPasteDialog(false));
