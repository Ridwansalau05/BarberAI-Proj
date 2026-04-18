import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { ensureShopServices } from "./serviceService";

const SHOPS_COLLECTION = "shops";

export const DEFAULT_SHOP_HOURS = {
  Mon: "09:00-18:00",
  Tue: "09:00-18:00",
  Wed: "09:00-18:00",
  Thu: "09:00-18:00",
  Fri: "09:00-18:00",
  Sat: "10:00-16:00",
  Sun: "Closed",
};

export const DEFAULT_SHOPS = [
  { id: "downtown", name: "Breezy Cutz", address: "123 Main St", ownerId: null },
  { id: "midtown", name: "Brazy Cutz", address: "456 Oak Ave", ownerId: null },
  { id: "eastside", name: "CrossFades", address: "618 Church St", ownerId: null },
  { id: "university", name: "Dapper Cutz", address: "419 Ogunmefun Ave", ownerId: null },
];

let seededDefaults = false;

function normalizeShopHours(shopHours = {}) {
  return {
    ...DEFAULT_SHOP_HOURS,
    ...(shopHours || {}),
  };
}

export async function ensureDefaultShops() {
  if (seededDefaults) {
    return;
  }

  const snapshot = await getDocs(collection(db, SHOPS_COLLECTION));
  const existingIds = new Set(snapshot.docs.map((shopDoc) => shopDoc.id));

  try {
    await Promise.all(
      DEFAULT_SHOPS.filter((shop) => !existingIds.has(shop.id)).map((shop) =>
        setDoc(doc(db, SHOPS_COLLECTION, shop.id), {
          ...shop,
          commissionRate: 0.7,
          shopHours: DEFAULT_SHOP_HOURS,
          createdAt: serverTimestamp(),
        }),
      ),
    );
  } catch (error) {
    if (error?.code !== "permission-denied") {
      throw error;
    }
  }

  try {
    await Promise.all(DEFAULT_SHOPS.map((shop) => ensureShopServices(shop.id)));
  } catch (error) {
    if (error?.code !== "permission-denied") {
      throw error;
    }
  }

  seededDefaults = true;
}

export async function listShops() {
  await ensureDefaultShops();

  const snapshot = await getDocs(query(collection(db, SHOPS_COLLECTION), orderBy("name", "asc")));

  return snapshot.docs.map((shopDoc) => ({
    id: shopDoc.id,
    ...shopDoc.data(),
    commissionRate: shopDoc.data().commissionRate ?? 0.7,
    shopHours: normalizeShopHours(shopDoc.data().shopHours),
  }));
}

export async function createShop({ name, ownerId, address = "" }) {
  const shopRef = await addDoc(collection(db, SHOPS_COLLECTION), {
    name,
    ownerId,
    address,
    commissionRate: 0.7,
    shopHours: DEFAULT_SHOP_HOURS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await ensureShopServices(shopRef.id);

  return {
    id: shopRef.id,
    name,
    ownerId,
    address,
    commissionRate: 0.7,
    shopHours: DEFAULT_SHOP_HOURS,
  };
}

export async function deleteShop(shopId) {
  await deleteDoc(doc(db, SHOPS_COLLECTION, shopId));
}

export async function getShop(shopId) {
  const snapshot = await getDoc(doc(db, SHOPS_COLLECTION, shopId));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
    commissionRate: snapshot.data().commissionRate ?? 0.7,
    shopHours: normalizeShopHours(snapshot.data().shopHours),
  };
}

export async function updateShop(shopId, updates) {
  const payload = {
    updatedAt: serverTimestamp(),
  };

  if (updates.commissionRate !== undefined) {
    payload.commissionRate = Number(updates.commissionRate ?? 0.7);
  }

  if (updates.shopHours !== undefined) {
    payload.shopHours = normalizeShopHours(updates.shopHours);
  }

  await updateDoc(doc(db, SHOPS_COLLECTION, shopId), payload);
}
