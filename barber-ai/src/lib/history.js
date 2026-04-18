// src/lib/history.js
// Simple history persistence with Firestore (if configured) and localStorage fallback.
import { db } from "./firebase";

const lsKey = (userId) => `history:${userId}`;

export async function addHistory(userId, record) {
  try {
    // Firestore subcollection per user
    if (db && userId) {
      const { addDoc, collection } = await import(/* @vite-ignore */ "firebase/firestore");
      const ref = collection(db, "users", String(userId), "history");
      await addDoc(ref, record);
    }
  } catch (_) {
    // ignore firestore errors in demo
  }

  try {
    const cur = JSON.parse(localStorage.getItem(lsKey(userId)) || "[]");
    localStorage.setItem(lsKey(userId), JSON.stringify([record, ...cur]));
  } catch (_) {}
}

export async function listHistory(userId) {
  // Try Firestore first
  try {
    if (db && userId) {
      const { getDocs, orderBy, query, collection } = await import(/* @vite-ignore */ "firebase/firestore");
      const ref = collection(db, "users", String(userId), "history");
      const q = query(ref, orderBy("dateISO", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (items?.length) return items;
    }
  } catch (_) {}

  // Fallback to local
  try {
    return JSON.parse(localStorage.getItem(lsKey(userId)) || "[]");
  } catch (_) {
    return [];
  }
}
