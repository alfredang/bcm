import { isConfigured, db, doc, setDoc, getDoc, serverTimestamp } from "./firebase.js";
import { showToast } from "./app.js";

const NAME_KEY = "bmc.displayName";

const ADJ = ["bright","brave","calm","clever","cosmic","crisp","daring","eager","fancy","gentle","jolly","keen","lucky","mellow","nimble","quick","rapid","silver","stellar","swift","witty","zesty","golden","sunny","royal","mighty","quiet","bold","fresh","kind"];
const NOUN = ["otter","falcon","panther","tiger","koala","lynx","wolf","fox","bear","eagle","hawk","whale","dolphin","puma","heron","raven","panda","gecko","yak","narwhal","badger","bison","cobra","kestrel","mantis","orca","seal","stag","viper","willow"];

function genId() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${n}-${num}`;
}

export function initLanding() {
  const savedName = localStorage.getItem(NAME_KEY) || "";
  document.getElementById("create-name").value = savedName;
  document.getElementById("join-name").value = savedName;

  // Pre-fill join id from query (?join=) if present (handled by router as well, but just in case)
  const url = new URL(location.href);
  const j = url.searchParams.get("join");
  if (j) document.getElementById("join-id").value = j;

  document.getElementById("btn-create").addEventListener("click", onCreate);
  document.getElementById("btn-join").addEventListener("click", onJoin);
}

async function onCreate() {
  const name = document.getElementById("create-name").value.trim();
  const title = document.getElementById("create-title").value.trim() || "Untitled Canvas";
  if (!name) return showToast("Enter your name to continue");
  localStorage.setItem(NAME_KEY, name);

  const id = genId();
  if (isConfigured) {
    try {
      await setDoc(doc(db, "canvases", id), {
        title,
        ownerName: name,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      showToast("Could not create canvas. Check Firebase config & rules.");
      return;
    }
  } else {
    showToast("Running in offline preview — Firebase not configured.");
  }

  location.hash = `#/c/${encodeURIComponent(id)}`;
}

async function onJoin() {
  const name = document.getElementById("join-name").value.trim();
  const id = document.getElementById("join-id").value.trim();
  if (!name) return showToast("Enter your name to continue");
  if (!id) return showToast("Enter a Canvas ID");
  localStorage.setItem(NAME_KEY, name);

  if (isConfigured) {
    try {
      const snap = await getDoc(doc(db, "canvases", id));
      if (!snap.exists()) {
        showToast("Canvas not found");
        return;
      }
    } catch (e) {
      console.error(e);
      showToast("Could not reach Firebase");
      return;
    }
  }
  location.hash = `#/c/${encodeURIComponent(id)}`;
}
