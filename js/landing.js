import { isConfigured, db, doc, setDoc, getDoc, serverTimestamp } from "./firebase.js";
import { showToast } from "./app.js";
import { TEMPLATES } from "./templates.js";
import { BMC_TEMPLATE, ALL_TEMPLATES, hasTemplate, activityLabel, ppTask, templateColor, escapeHtml } from "./boards.js";

const NAME_KEY = "bmc.displayName"; // kept from the original app so returning users keep their name

const ADJ = ["bright","brave","calm","clever","cosmic","crisp","daring","eager","fancy","gentle","jolly","keen","lucky","mellow","nimble","quick","rapid","silver","stellar","swift","witty","zesty","golden","sunny","royal","mighty","quiet","bold","fresh","kind"];
const NOUN = ["otter","falcon","panther","tiger","koala","lynx","wolf","fox","bear","eagle","hawk","whale","dolphin","puma","heron","raven","panda","gecko","yak","narwhal","badger","bison","cobra","kestrel","mantis","orca","seal","stag","viper","willow"];

function genId() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return `${a}-${n}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function codesLine(t) {
  return [t.lo, t.codes].filter(Boolean).join(" · ");
}

function renderSideNav() {
  document.getElementById("side-activities").innerHTML = TEMPLATES.map(t => `
    <a class="side-act" style="--c:${templateColor(t)}" href="?activity=${t.key}#start">
      <b>${activityLabel(t)} · ${escapeHtml(t.lo)}</b>${escapeHtml(t.title)}
    </a>`).join("");
}

function renderCards() {
  const card = (t) => {
    const pp = ppTask(t);
    return `
    <article class="act-card ${t.key === "bmc" ? "mini" : ""}" style="--c:${templateColor(t)}">
      <div class="n">${activityLabel(t)}${t.lo ? ` · ${escapeHtml(t.lo)}` : ""} · ${t.minutes} min</div>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.pitch)}</p>
      <div class="meta">
        ${pp ? `<span class="chip chip-teal">${pp} evidence</span>` : `<span class="chip">${escapeHtml(t.evidence)}</span>`}
        ${t.codes ? `<span class="chip">${escapeHtml(t.codes)}</span>` : ""}
      </div>
      <button class="btn ${t.key === "bmc" ? "" : "btn-primary"}" type="button" data-start="${t.key}">Start this board</button>
    </article>`;
  };
  const el = document.getElementById("activity-cards");
  el.innerHTML = TEMPLATES.map(card).join("") + card(BMC_TEMPLATE);
  el.querySelectorAll("[data-start]").forEach(b => b.addEventListener("click", () => {
    preselect(b.dataset.start, true);
  }));
}

function renderMapTable() {
  document.getElementById("map-rows").innerHTML = TEMPLATES.map(t => {
    const pp = ppTask(t);
    return `<tr>
      <td>${t.num}</td>
      <td><a href="?activity=${t.key}#start">${escapeHtml(t.title)}</a><br><span class="caption">${escapeHtml(t.short)} · ${t.minutes} min</span></td>
      <td>${pp ? `<b>${pp}</b>` : escapeHtml(t.evidence)}</td>
      <td>${escapeHtml(codesLine(t))}</td>
    </tr>`;
  }).join("");
}

function renderSelect() {
  document.getElementById("create-type").innerHTML = ALL_TEMPLATES.map(t =>
    `<option value="${t.key}">${t.num ? `Activity ${t.num}: ` : ""}${escapeHtml(t.title)}</option>`
  ).join("");
}

function preselect(key, focus) {
  if (!hasTemplate(key)) return;
  document.getElementById("create-type").value = key;
  const start = document.getElementById("start");
  start.scrollIntoView({ behavior: focus ? "smooth" : "auto", block: "center" });
  const nameEl = document.getElementById("create-name");
  const target = nameEl.value ? document.getElementById("create-org") : nameEl;
  setTimeout(() => target.focus({ preventScroll: true }), focus ? 350 : 0);
}

/** Called by the router whenever the landing page shows. */
export function showLandingFor(activityKey) {
  if (activityKey) preselect(activityKey, false);
  else if (location.hash === "#join") document.getElementById("join").scrollIntoView();
}

export function initLanding() {
  renderSideNav();
  renderCards();
  renderMapTable();
  renderSelect();

  const savedName = localStorage.getItem(NAME_KEY) || "";
  document.getElementById("create-name").value = savedName;
  document.getElementById("join-name").value = savedName;

  document.getElementById("btn-create").addEventListener("click", onCreate);
  document.getElementById("btn-join").addEventListener("click", onJoin);
  document.getElementById("create-org").addEventListener("keydown", e => { if (e.key === "Enter") onCreate(); });
  document.getElementById("join-id").addEventListener("keydown", e => { if (e.key === "Enter") onJoin(); });
}

async function onCreate() {
  const btn = document.getElementById("btn-create");
  const type = document.getElementById("create-type").value;
  const name = document.getElementById("create-name").value.trim();
  const org = document.getElementById("create-org").value.trim();
  if (!name) { document.getElementById("create-name").focus(); return showToast("Enter your name to continue"); }
  if (!org) { document.getElementById("create-org").focus(); return showToast("Enter your organisation: it becomes the board title"); }
  localStorage.setItem(NAME_KEY, name);

  const id = genId();
  if (isConfigured) {
    btn.disabled = true;
    try {
      await setDoc(doc(db, "canvases", id), {
        title: org,
        org,
        type,
        ownerName: name,
        learners: [name],
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      showToast("Could not create the board. Check your connection and try again.");
      return;
    } finally {
      btn.disabled = false;
    }
  }
  openBoard(id);
}

/** Go to a board, dropping ?activity= / ?join= from the URL. */
function openBoard(id) {
  history.replaceState(null, "", location.pathname);
  location.hash = `#/c/${encodeURIComponent(id)}`;
}

async function onJoin() {
  const name = document.getElementById("join-name").value.trim();
  let id = document.getElementById("join-id").value.trim();
  // Accept a pasted invite link as well as a bare ID
  const m = id.match(/[?&]join=([^&#]+)/) || id.match(/#\/c\/([^&#?]+)/);
  if (m) id = decodeURIComponent(m[1]);
  if (!name) return showToast("Enter your name to continue");
  if (!id) return showToast("Enter a Board ID");
  localStorage.setItem(NAME_KEY, name);

  if (isConfigured) {
    try {
      const snap = await getDoc(doc(db, "canvases", id));
      if (!snap.exists()) return showToast("No board with that ID");
    } catch (e) {
      console.error(e);
      return showToast("Could not reach the board service");
    }
  }
  openBoard(id);
}
