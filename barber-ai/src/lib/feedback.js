// src/lib/feedback.js
// Customer feedback storage (Firestore + localStorage fallback)
import { db } from "./firebase";

const lsKey = (userId) => `feedback:${userId}`;
const lsAllKey = () => `feedback:all`; // simple aggregate across users for barber dashboard demo

export async function submitFeedback({ userId, bookingId, service, barberId, rating, comment, dateISO }) {
  const payload = {
    userId: String(userId || "demo-user"),
    bookingId: bookingId || crypto.randomUUID(),
    service: service || "",
    barberId: barberId || "",
    rating: Number(rating || 0),
    comment: comment || "",
    dateISO: dateISO || new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  };

  try {
    if (db) {
      const { addDoc, collection, serverTimestamp } = await import(/* @vite-ignore */ "firebase/firestore");
      await addDoc(collection(db, "feedback"), { ...payload, createdAt: serverTimestamp() });
    }
  } catch (_) {}

  try {
    const perUser = JSON.parse(localStorage.getItem(lsKey(payload.userId)) || "[]");
    localStorage.setItem(lsKey(payload.userId), JSON.stringify([payload, ...perUser]));

    const all = JSON.parse(localStorage.getItem(lsAllKey()) || "[]");
    localStorage.setItem(lsAllKey(), JSON.stringify([payload, ...all]));
  } catch (_) {}

  return payload;
}

export async function listFeedbackForUser(userId) {
  try {
    if (db) {
      const { getDocs, query, collection, where } = await import(/* @vite-ignore */ "firebase/firestore");
      const q = query(collection(db, "feedback"), where("userId", "==", String(userId)));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (rows?.length) return rows;
    }
  } catch (_) {}

  try {
    return JSON.parse(localStorage.getItem(lsKey(userId)) || "[]");
  } catch (_) {
    return [];
  }
}

export async function listAllFeedback() {
  try {
    if (db) {
      const { getDocs, collection } = await import(/* @vite-ignore */ "firebase/firestore");
      const snap = await getDocs(collection(db, "feedback"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (_) {}

  try {
    return JSON.parse(localStorage.getItem(lsAllKey()) || "[]");
  } catch (_) {
    return [];
  }
}
