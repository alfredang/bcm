import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
  arrayUnion, arrayRemove, increment, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: Replace with your Firebase project credentials.
// Firestore security rules MUST be configured by the project owner.
const firebaseConfig = {
  apiKey: "AIzaSyBDt2e--3tv_Gk2c3xVWwADKIcziOQyle0",
  authDomain: "businesscanvamodel.firebaseapp.com",
  projectId: "businesscanvamodel",
  storageBucket: "businesscanvamodel.firebasestorage.app",
  messagingSenderId: "86402341176",
  appId: "1:86402341176:web:5be40afde48728193289cd",
  measurementId: "G-MT9L55KW5T"
};

export const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let app, db;
if (isConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  console.warn(
    "[BMC Studio] Firebase is not configured. Edit js/firebase.js with your project credentials to enable real-time collaboration."
  );
}

export {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
  arrayUnion, arrayRemove, increment, writeBatch
};
