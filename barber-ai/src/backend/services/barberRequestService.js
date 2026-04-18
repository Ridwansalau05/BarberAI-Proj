import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { ensureBarberSchedule } from "./scheduleService";
import { listServicesByShop } from "./serviceService";
import { getShop } from "./shopService";
import { getUserProfile, updateUserProfile } from "./userService";

const BARBER_REQUESTS_COLLECTION = "barberRequests";

export async function getBarberRequest(barberId) {
  const snapshot = await getDoc(doc(db, BARBER_REQUESTS_COLLECTION, barberId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function submitBarberRequest({ barberId, shopId }) {
  const requestRef = doc(db, BARBER_REQUESTS_COLLECTION, barberId);

  await setDoc(
    requestRef,
    {
      barberId,
      shopId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: barberId,
    barberId,
    shopId,
    status: "pending",
  };
}

export async function getPendingBarberRequestsByShop(shopId) {
  const requestsQuery = query(
    collection(db, BARBER_REQUESTS_COLLECTION),
    where("shopId", "==", shopId),
    where("status", "==", "pending"),
  );

  const snapshot = await getDocs(requestsQuery);
  const requests = await Promise.all(
    snapshot.docs.map(async (requestDoc) => {
      const request = { id: requestDoc.id, ...requestDoc.data() };
      const barber = await getUserProfile(request.barberId);
      return { ...request, barber };
    }),
  );

  return requests.sort((left, right) => left.id.localeCompare(right.id));
}

export async function updateOwnBarberRequest(barberId, shopId) {
  const requestRef = doc(db, BARBER_REQUESTS_COLLECTION, barberId);
  const shop = await getShop(shopId);

  await setDoc(
    requestRef,
    {
      barberId,
      shopId,
      status: "pending",
      reviewedBy: deleteField(),
      reviewedAt: deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await updateUserProfile(barberId, {
    shopId,
    shopName: shop?.name || "",
    status: "pending",
    serviceIds: [],
    specialties: [],
  });
}

export async function cancelOwnBarberRequest(barberId) {
  const requestRef = doc(db, BARBER_REQUESTS_COLLECTION, barberId);

  await updateDoc(requestRef, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });

  await updateUserProfile(barberId, {
    status: "cancelled",
    shopId: "",
    shopName: "",
    serviceIds: [],
    specialties: [],
  });
}

export async function approveBarberRequest(requestId, ownerId) {
  const requestRef = doc(db, BARBER_REQUESTS_COLLECTION, requestId);
  const requestSnapshot = await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    throw new Error("Barber request not found.");
  }

  const request = requestSnapshot.data();
  const shop = await getShop(request.shopId);
  const shopServices = await listServicesByShop(request.shopId);

  await updateDoc(requestRef, {
    status: "approved",
    reviewedBy: ownerId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateUserProfile(request.barberId, {
    shopId: request.shopId,
    shopName: shop?.name || "",
    status: "approved",
    serviceIds: shopServices.map((service) => service.id),
    specialties: shopServices.map((service) => service.name),
  });

  await ensureBarberSchedule(request.barberId, { shopId: request.shopId });
}

export async function rejectBarberRequest(requestId, ownerId) {
  const requestRef = doc(db, BARBER_REQUESTS_COLLECTION, requestId);
  const requestSnapshot = await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    throw new Error("Barber request not found.");
  }

  const request = requestSnapshot.data();
  const shop = await getShop(request.shopId);

  await updateDoc(requestRef, {
    status: "rejected",
    reviewedBy: ownerId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateUserProfile(request.barberId, {
    shopId: request.shopId,
    shopName: shop?.name || "",
    status: "rejected",
    serviceIds: [],
    specialties: [],
  });
}
