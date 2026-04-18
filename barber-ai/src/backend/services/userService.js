import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";

const USERS_COLLECTION = "users";

export async function createUserProfile(uid, profile) {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(uid, updates) {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function listApprovedBarbersByShop(shopId) {
  const snapshot = await getDocs(
    query(
      collection(db, USERS_COLLECTION),
      where("role", "==", "barber"),
      where("shopId", "==", shopId),
      where("status", "==", "approved"),
    ),
  );

  return snapshot.docs.map((userDoc) => ({
    id: userDoc.id,
    ...userDoc.data(),
  }));
}

export async function listBarbersByShop(shopId) {
  const snapshot = await getDocs(
    query(collection(db, USERS_COLLECTION), where("role", "==", "barber"), where("shopId", "==", shopId)),
  );

  return snapshot.docs
    .map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }))
    .sort((left, right) => (left.name || "").localeCompare(right.name || ""));
}
