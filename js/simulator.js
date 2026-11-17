// "Simulate with AI" drawer: pick a fictional business, then run one of four actions
// against the notes on the current board. Uses the learner's own key (js/ai.js);
// without a key, Meridian Services shows canned example output (js/businesses.js).
import { getCurrentTemplate } from "./canvas.js";
import { getNotesByBlock, addNotes } from "./notes.js";
import { BUSINESSES, BUSINESS_BY_ID, OFFLINE_OUTPUTS } from "./businesses.js";
import { ACTIONS, SYSTEM, askClaude, boardText, parseSuggestions, hasKey, MODEL_LABEL } from "./ai.js";
import { onKeyChange } from "./keybox.js";
import { escapeHtml } from "./boards.js";
import { showToast } from "./app.js";

const BIZ_KEY = "bcm.simBusiness";
const drawer = document.getElementById("sim");
const bizSelect = document.getElementById("sim-business");
const blockSelect = document.getElementById("sim-block");
const out = document.getElementById("sim-out");
let busy = false;
let runId = 0;

// ---------- safe Markdown (escape first, then a small subset) ----------
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
}

export function renderMarkdown(md) {
  const lines = escapeHtml(md.replace(/\r/g, "")).split("\n");
  const html = [];
  let i = 0;
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      const level = Math.min(4, Math.max(3, m[1].length + 1));
      html.push(`<h${level}>${inline(m[2])}</h${level}>`);
      i++; continue;
    }
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const body = rows.filter(r => !/^[\s|:-]+$/.test(r)); // drop the |---|---| separator row
      const [head, ...rest] = body;
      html.push(`<table><thead><tr>${cells(head).map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${
        rest.map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^\s*&gt;\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) { q.push(inline(lines[i].replace(/^\s*&gt;\s?/, ""))); i++; }
      html.push(`<blockquote>${q.join("<br>")}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`); i++; }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^\s*\d+[.)]\s+/, ""))}</li>`); i++; }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*\||\s*&gt;|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) { para.push(inline(lines[i])); i++; }
    if (para.length) html.push(`<p>${para.join("<br>")}</p>`);
    else { html.push(`<p>${inline(line)}</p>`); i++; }
  }
  return html.join("");
}

// ---------- UI ----------
function currentBusiness() { return BUSINESS_BY_ID[bizSelect.value] || BUSINESSES[0]; }

function renderProfile() {
  const b = currentBusiness();
  const list = (arr) => `<ul>${arr.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  document.getElementById("sim-profile").innerHTML = `
    <p><b>${escapeHtml(b.sector)}</b> · ${b.staff} staff · fictional</p>
    <p>${escapeHtml(b.profile)}</p>
    <details>
      <summary>Objectives, pain points, systems</summary>
      <h5>Objectives</h5>${list(b.objectives)}
      <h5>Pain points</h5>${list(b.painPoints)}
      <h5>Systems</h5>${list(b.systems)}
    </details>`;
}

function renderActionButtons() {
  document.querySelectorAll("[data-sim]").forEach(btn => {
    const a = ACTIONS[btn.dataset.sim];
    btn.innerHTML = `<b>${escapeHtml(a.label)}</b><small>${escapeHtml(a.hint)}</small>`;
  });
}

function renderBlockSelect() {
  const t = getCurrentTemplate();
  if (!t) return;
  blockSelect.innerHTML = t.blocks.map(b => `<option value="${b.id}">${b.num}. ${escapeHtml(b.title)}</option>`).join("");
}

function setBusy(on) {
  busy = on;
  document.querySelectorAll("[data-sim]").forEach(b => { b.disabled = on; });
}

function box(label, inner, cls = "") {
  out.innerHTML = `<div class="out-box ${cls}"><div class="out-label">${escapeHtml(label)}</div>${inner}</div>`;
  out.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showSuggestions(label, suggestions, blockId, offline) {
  const t = getCurrentTemplate();
  const block = t.blocks.find(b => b.id === blockId);
  if (!suggestions.length) {
    box(label, "<p>No suggestions came back. Try again.</p>", offline ? "offline" : "");
    return;
  }
  box(label, `
    <p>For <b>${escapeHtml(block.title)}</b>. Click to add a note tagged ${offline ? "<b>Example</b>" : "<b>AI</b>"}.</p>
    ${suggestions.map((s, i) => `
      <div class="sugg">
        <b>${escapeHtml(s.title)}</b>
        ${s.description ? `<p>${escapeHtml(s.description)}</p>` : ""}
        <button class="btn btn-sm" type="button" data-add="${i}">Add to board</button>
      </div>`).join("")}
    <button class="btn btn-sm btn-ink" type="button" data-add="all">Add all ${suggestions.length}</button>`,
    offline ? "offline" : "");
  out.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", async () => {
    const pick = btn.dataset.add === "all" ? suggestions : [suggestions[Number(btn.dataset.add)]];
    btn.disabled = true;
    const ok = await addNotes(blockId, pick, offline ? "Example" : "AI");
    if (ok) {
      showToast(pick.length === 1 ? "Added to the board" : `Added ${pick.length} notes`);
      btn.textContent = "Added";
    } else {
      btn.disabled = false;
    }
  }));
}

async function run(action) {
  if (busy) return;
  const t = getCurrentTemplate();
  if (!t) return;
  const b = currentBusiness();
  const blockId = blockSelect.value || t.blocks[0].id;
  const block = t.blocks.find(x => x.id === blockId);
  const label = ACTIONS[action].label;

  // Offline fallback: no key -> canned example output for Meridian Services only
  if (!hasKey()) {
    if (b.id !== "meridian") {
      box("No API key", `<p>Add your Anthropic API key above to simulate <b>${escapeHtml(b.name)}</b>. Without a key, pick <b>Meridian Services Pte Ltd</b> to see example output.</p>`, "offline");
      return;
    }
    const tag = "Example output (no API key)";
    if (action === "suggest") {
      const ex = (block.example || []).slice(0, 3);
      if (!ex.length) return box(tag, "<p>No example notes for this block. Add an API key for live suggestions.</p>", "offline");
      return showSuggestions(tag, ex, blockId, true);
    }
    return box(tag, renderMarkdown(OFFLINE_OUTPUTS[action]), "offline");
  }

  const my = ++runId;
  setBusy(true);
  out.innerHTML = `<div class="out-box"><span class="spinner"></span>${escapeHtml(label)} for ${escapeHtml(b.name)} with ${escapeHtml(MODEL_LABEL)}… this can take up to a minute.</div>`;
  try {
    const prompt = ACTIONS[action].prompt(t, b, boardText(t, getNotesByBlock()), block);
    const res = await askClaude({ system: SYSTEM, prompt, maxTokens: action === "suggest" ? 3000 : 8000 });
    if (my !== runId) return;
    const head = `${label} · ${b.name} · simulated by ${MODEL_LABEL}`;
    if (action === "suggest") {
      const s = parseSuggestions(res.text);
      if (s.length) return showSuggestions(head, s, blockId, false);
      return box(head, renderMarkdown(res.text));
    }
    box(head, renderMarkdown(res.text) + (res.truncated ? "<p><em>(Cut short: the answer hit the length limit.)</em></p>" : ""));
  } catch (e) {
    if (my !== runId) return;
    box("Simulation failed", `<p>${escapeHtml(e.message || String(e))}</p>`, "err");
  } finally {
    if (my === runId) setBusy(false);
  }
}

export function openSimulator() {
  renderBlockSelect();
  renderProfile();
  drawer.hidden = false;
  setTimeout(() => drawer.querySelector(".drawer-panel select, .drawer-panel input")?.focus(), 50);
}
export function closeSimulator() {
  runId++;
  setBusy(false);
  drawer.hidden = true;
  out.innerHTML = "";
}

// ---------- init ----------
bizSelect.innerHTML = BUSINESSES.map(b => `<option value="${b.id}">${escapeHtml(b.name)} · ${escapeHtml(b.sector)}</option>`).join("");
bizSelect.value = localStorage.getItem(BIZ_KEY) || "meridian";
if (!bizSelect.value) bizSelect.value = "meridian";
bizSelect.addEventListener("change", () => { localStorage.setItem(BIZ_KEY, bizSelect.value); renderProfile(); out.innerHTML = ""; });
renderActionButtons();
renderProfile();
document.querySelectorAll("[data-sim]").forEach(btn => btn.addEventListener("click", () => run(btn.dataset.sim)));
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close-sim]")) closeSimulator(); });
onKeyChange(() => { out.innerHTML = ""; });
