// src/lib/db.js
// Firebase v10 modular helpers with graceful fallback to localStorage for demo.

// Lazy-import Firebase to avoid hard dependency in dev where SDK may be absent.
async function lazyFirestore() {
  try {
    const appMod = await import(/* @vite-ignore */ "firebase/app");
    const fs = await import(/* @vite-ignore */ "firebase/firestore");
    const app = appMod.getApp();
    const db = fs.getFirestore(app);
    return { fs, db };
  } catch (_) {
    return { fs: null, db: null };
  }
}

// Demo user helper (works with local mock auth)
export function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem("authUser") || "{}");
    return u || {};
  } catch (_) {
    return {};
  }
}

// Keys for local fallback
const LS_ALL_FEEDBACK = "feedback:all";

export async function createFeedback({ appointmentId, barberId, customerId, rating, comment, customerName, serviceName, dateISO }) {
  // Attempt Firestore write
  const { fs, db } = await lazyFirestore();
  if (db && fs) {
    const { addDoc, collection, serverTimestamp } = fs;
    const ref = await addDoc(collection(db, "feedback"), {
      appointmentId,
      barberId,
      customerId,
      rating,
      comment,
      customerName,
      serviceName,
      dateISO,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
  // Fallback: append to localStorage list
  const row = {
    id: crypto.randomUUID?.() || String(Date.now()),
    appointmentId,
    barberId,
    customerId,
    rating,
    comment,
    customerName,
    serviceName,
    dateISO,
    createdAt: Date.now(),
  };
  try {
    const list = JSON.parse(localStorage.getItem(LS_ALL_FEEDBACK) || "[]");
    localStorage.setItem(LS_ALL_FEEDBACK, JSON.stringify([row, ...list]));
  } catch (_) {}
  return row.id;
}

export async function bumpBarberAggregates(barberId, newRating) {
  const { fs, db } = await lazyFirestore();
  if (db && fs) {
    const { doc, getDoc, updateDoc } = fs;
    const barberRef = doc(db, "barbers", String(barberId));
    const snap = await getDoc(barberRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const reviewCount = (data.reviewCount || 0) + 1;
    const currentAvg = data.avgRating || 0;
    const avgRating = Number(((currentAvg * (reviewCount - 1) + Number(newRating)) / reviewCount).toFixed(2));
    await updateDoc(barberRef, { reviewCount, avgRating });
    return;
  }
  // Fallback: no-op in local demo
}

export function listenFeedbackForBarber(barberId, cb) {
  let unsub = () => {};
  lazyFirestore().then(({ fs, db }) => {
    if (db && fs) {
      const { collection, query, where, orderBy, onSnapshot } = fs;
      const q = query(
        collection(db, "feedback"),
        where("barberId", "==", String(barberId)),
        orderBy("createdAt", "desc")
      );
      unsub = onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        cb(items);
      });
    } else {
      // Fallback: read from local list once
      try {
        const list = JSON.parse(localStorage.getItem(LS_ALL_FEEDBACK) || "[]");
        cb(list.filter((x) => String(x.barberId) === String(barberId)));
      } catch (_) {
        cb([]);
      }
    }
  });
  return () => unsub();
}

export async function markAppointmentCompleted(appointmentId) {
  const { fs, db } = await lazyFirestore();
  if (db && fs) {
    const { updateDoc, doc } = fs;
    await updateDoc(doc(db, "appointments", String(appointmentId)), { status: "completed" });
    return true;
  }
  // Fallback: no-op
  return false;
}

