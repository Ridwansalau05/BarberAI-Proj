import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserProfile, updateUserProfile } from "./userService";

const SERVICES_COLLECTION = "services";

const DEFAULT_SERVICE_TEMPLATES = [
  { slug: "fade", name: "Skin Fade", description: "Clean fade with line-up.", price: 35, duration: 45 },
  { slug: "beard", name: "Beard Trim", description: "Beard shape and finish.", price: 15, duration: 20 },
  { slug: "cut-beard", name: "Cut + Beard", description: "Haircut and beard combo.", price: 45, duration: 60 },
  { slug: "lineup", name: "Line Up", description: "Edges and outline only.", price: 12, duration: 20 },
  { slug: "deluxe", name: "Deluxe Package", description: "Cut, beard, hot towel, and style.", price: 60, duration: 75 },
];

export async function ensureShopServices(shopId) {
  const snapshot = await getDocs(query(collection(db, SERVICES_COLLECTION), where("shopId", "==", shopId)));

  if (!snapshot.empty) {
    return;
  }

  await Promise.all(
    DEFAULT_SERVICE_TEMPLATES.map((service) =>
      setDoc(doc(collection(db, SERVICES_COLLECTION)), {
        shopId,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
}

export async function listServicesByShop(shopId) {
  try {
    await ensureShopServices(shopId);
  } catch (error) {
    if (error?.code !== "permission-denied") {
      throw error;
    }
  }

  const snapshot = await getDocs(query(collection(db, SERVICES_COLLECTION), where("shopId", "==", shopId)));

  return snapshot.docs
    .map((serviceDoc) => ({
      id: serviceDoc.id,
      ...serviceDoc.data(),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeServicePayload({ shopId, name, description = "", price, duration }) {
  return {
    shopId,
    name: String(name || "").trim(),
    description: String(description || "").trim(),
    price: Number(price || 0),
    duration: Number(duration || 0),
  };
}

function normalizeBarberServiceIds(serviceIds, shopServices) {
  const validServiceIds = new Set(shopServices.map((service) => service.id));
  return (serviceIds || []).filter((serviceId) => validServiceIds.has(serviceId));
}

function buildBarberSpecialties(serviceIds, shopServices) {
  const activeIds = new Set(serviceIds);
  return shopServices.filter((service) => activeIds.has(service.id)).map((service) => service.name);
}

export async function createService(service) {
  const serviceRef = doc(collection(db, SERVICES_COLLECTION));
  const payload = normalizeServicePayload(service);

  await setDoc(serviceRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: serviceRef.id,
    ...payload,
  };
}

export async function updateService(serviceId, updates) {
  const payload = normalizeServicePayload(updates);

  await updateDoc(doc(db, SERVICES_COLLECTION, serviceId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteService(serviceId) {
  await deleteDoc(doc(db, SERVICES_COLLECTION, serviceId));
}

export async function getBarberServiceSelection(barberId, shopId) {
  const [profile, shopServices] = await Promise.all([getUserProfile(barberId), listServicesByShop(shopId)]);
  const configuredServiceIds = Array.isArray(profile?.serviceIds) ? profile.serviceIds : null;
  const activeServiceIds = configuredServiceIds ? normalizeBarberServiceIds(configuredServiceIds, shopServices) : shopServices.map((service) => service.id);

  return {
    activeServiceIds,
    services: shopServices.map((service) => ({
      ...service,
      adopted: activeServiceIds.includes(service.id),
    })),
  };
}

export async function updateBarberServiceSelection({ barberId, shopId, serviceIds }) {
  const shopServices = await listServicesByShop(shopId);
  const normalizedServiceIds = normalizeBarberServiceIds(serviceIds, shopServices);

  await updateUserProfile(barberId, {
    serviceIds: normalizedServiceIds,
    specialties: buildBarberSpecialties(normalizedServiceIds, shopServices),
  });

  return {
    activeServiceIds: normalizedServiceIds,
    services: shopServices.map((service) => ({
      ...service,
      adopted: normalizedServiceIds.includes(service.id),
    })),
  };
}
