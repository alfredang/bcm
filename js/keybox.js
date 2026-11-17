// The "Anthropic API key" box, shown in the landing sidebar and in the simulator drawer.
// The key is stored only in this browser (localStorage "bcm.anthropicKey") and is sent only
// to api.anthropic.com. It is never written to Firestore or logged.
import { getKey, setKey, clearKey, MODEL } from "./ai.js";
import { escapeHtml } from "./boards.js";

const EVENT = "bcm:keychange";

function render(box) {
  const has = getKey().length > 0;
  box.innerHTML = `
    <div>Anthropic API key: <span class="keystate ${has ? "ok" : "no"}">${has ? "saved" : "not set"}</span></div>
    <div class="keyrow">
      <input type="password" placeholder="${has ? "•••••••• saved in this browser" : "Paste your Anthropic API key"}" autocomplete="off" spellcheck="false" aria-label="Anthropic API key" />
      <button class="eye" type="button" title="Show or hide the key" aria-label="Show or hide the key">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
    <div class="row">
      <button type="button" data-k="save">Save</button>
      <button type="button" data-k="clear">Clear</button>
    </div>
    <div class="caption">Stored only in this browser, sent only to Anthropic. Optional: the simulator calls <code>${escapeHtml(MODEL)}</code>; without a key it shows example output for Meridian Services.</div>
  `;
  const input = box.querySelector("input");
  box.querySelector(".eye").onclick = () => { input.type = input.type === "password" ? "text" : "password"; };
  box.querySelector("[data-k=save]").onclick = () => {
    const v = input.value.trim();
    if (!v) { input.focus(); return; }
    setKey(v);
    input.value = "";
    document.dispatchEvent(new CustomEvent(EVENT));
  };
  box.querySelector("[data-k=clear]").onclick = () => {
    clearKey();
    input.value = "";
    document.dispatchEvent(new CustomEvent(EVENT));
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") box.querySelector("[data-k=save]").click(); });
}

export function mountKeyboxes() {
  const boxes = [...document.querySelectorAll("[data-keybox]")];
  boxes.forEach(render);
  document.addEventListener(EVENT, () => boxes.forEach(render));
}

export function onKeyChange(fn) { document.addEventListener(EVENT, fn); }
