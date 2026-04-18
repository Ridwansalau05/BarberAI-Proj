import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAverageRatingForBarber } from "./feedbackService";
import {
  DEFAULT_BARBER_SCHEDULE,
  getBarberSchedule,
  getDayLabel,
  getDaySchedule,
  isBarberAvailable,
  normalizeBarberSchedule,
} from "./scheduleService";
import { listServicesByShop } from "./serviceService";
import { getShop } from "./shopService";
import { getUserProfile, listApprovedBarbersByShop } from "./userService";

const BOOKINGS_COLLECTION = "bookings";

export const BOOKING_STATUS = {
  scheduled: "scheduled",
  checkedIn: "checked-in",
  completed: "completed",
  noShow: "no-show",
  cancelled: "cancelled",
};

function sortBookings(bookings) {
  return bookings.sort((left, right) => `${left.dateISO}${left.time}`.localeCompare(`${right.dateISO}${right.time}`));
}

function calculateRevenue(bookings) {
  return bookings.reduce((sum, booking) => {
    if (booking.status !== BOOKING_STATUS.completed) {
      return sum;
    }

    return sum + Number(booking.price || 0) * Number(booking.commission || 0);
  }, 0);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getBookedTimes(bookings) {
  return bookings
    .filter((booking) => ![BOOKING_STATUS.cancelled, BOOKING_STATUS.noShow].includes(booking.status))
    .map((booking) => booking.time);
}

function parseShopHours(shopHours, dateISO) {
  const day = getDayLabel(dateISO);
  const value = shopHours?.[day];

  if (!value || typeof value !== "string") {
    return null;
  }

  if (value.toLowerCase() === "closed") {
    return null;
  }

  const [startTime, endTime] = value.split("-");

  if (!startTime || !endTime) {
    return null;
  }

  return {
    startTime,
    endTime,
  };
}

function isWithinShopHours(shopHours, dateISO, time, durationMin) {
  const parsedHours = parseShopHours(shopHours, dateISO);

  if (!parsedHours) {
    return false;
  }

  const start = timeToMinutes(time);
  const appointmentEnd = start + durationMin;
  const startBound = timeToMinutes(parsedHours.startTime);
  const endBound = timeToMinutes(parsedHours.endTime);

  return start >= startBound && appointmentEnd <= endBound;
}

function buildSlots(schedule, dateISO, durationMin, bookedTimes = [], shopHours = null) {
  const activeSchedule = normalizeBarberSchedule(schedule || DEFAULT_BARBER_SCHEDULE);
  const daySchedule = getDaySchedule(activeSchedule, dateISO);

  if (!daySchedule) {
    return [];
  }

  const start = timeToMinutes(daySchedule.startTime);
  const end = timeToMinutes(daySchedule.endTime);
  const step = 30;
  const buffer = 10;
  const blockedTimes = new Set(bookedTimes);
  const slots = [];

  for (let minutes = start; minutes + durationMin + buffer <= end; minutes += step) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const slot = `${hh}:${mm}`;

    if (blockedTimes.has(slot)) {
      continue;
    }

    if (
      isBarberAvailable(activeSchedule, dateISO, slot, durationMin) &&
      (!shopHours || isWithinShopHours(shopHours, dateISO, slot, durationMin))
    ) {
      slots.push(slot);
    }
  }

  return slots;
}

function resolveBarberServiceIds(barber, shopServiceIds) {
  const configuredServiceIds = Array.isArray(barber?.serviceIds) ? barber.serviceIds : null;

  if (!configuredServiceIds) {
    return [...shopServiceIds];
  }

  return configuredServiceIds.filter((serviceId) => shopServiceIds.includes(serviceId));
}

function addDays(dateISO, offset) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function getBookingsByBarberAndDate(barberId, dateISO) {
  if (!barberId) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, BOOKINGS_COLLECTION),
      where("barberId", "==", barberId),
      where("dateISO", "==", dateISO),
    ),
  );

  return snapshot.docs.map((bookingDoc) => ({
    id: bookingDoc.id,
    ...bookingDoc.data(),
  }));
}

export async function listBookingsByBarber(barberId, shopId) {
  const snapshot = await getDocs(
    query(
      collection(db, BOOKINGS_COLLECTION),
      where("barberId", "==", barberId),
      where("shopId", "==", shopId),
    ),
  );

  return sortBookings(
    snapshot.docs.map((bookingDoc) => ({
      id: bookingDoc.id,
      ...bookingDoc.data(),
    })),
  );
}

export async function listBookingsByShop(shopId) {
  const snapshot = await getDocs(query(collection(db, BOOKINGS_COLLECTION), where("shopId", "==", shopId)));

  return sortBookings(
    snapshot.docs.map((bookingDoc) => ({
      id: bookingDoc.id,
      ...bookingDoc.data(),
    })),
  );
}

export async function getUserBookings(userId) {
  const snapshot = await getDocs(query(collection(db, BOOKINGS_COLLECTION), where("customerId", "==", userId)));

  return sortBookings(
    snapshot.docs.map((bookingDoc) => ({
      id: bookingDoc.id,
      ...bookingDoc.data(),
    })),
  );
}

export async function getBarberDashboardData({ barberId, shopId, todayISO }) {
  const bookings = await listBookingsByBarber(barberId, shopId);
  const todaysBookings = bookings.filter((booking) => booking.dateISO === todayISO);
  const uniqueCustomers = new Set(bookings.filter((booking) => booking.customerId).map((booking) => booking.customerId));
  const averageRating = await getAverageRatingForBarber(barberId, shopId);

  return {
    bookings,
    todaysBookings,
    metrics: {
      appointmentsToday: todaysBookings.length,
      totalAppointments: bookings.length,
      totalCustomers: uniqueCustomers.size,
      averageRating,
      revenue: calculateRevenue(bookings),
    },
  };
}

export async function getAvailableBarbersForShopDate({ shopId, dateISO, duration, serviceId }) {
  const [approvedBarbers, shopServices, shop] = await Promise.all([
    listApprovedBarbersByShop(shopId),
    listServicesByShop(shopId),
    getShop(shopId),
  ]);
  const shopServiceIds = shopServices.map((service) => service.id);

  const availability = await Promise.all(
    approvedBarbers.map(async (barber) => {
      const offeredServiceIds = resolveBarberServiceIds(barber, shopServiceIds);

      if (serviceId && !offeredServiceIds.includes(serviceId)) {
        return null;
      }

      const [schedule, bookings] = await Promise.all([
        getBarberSchedule(barber.id),
        getBookingsByBarberAndDate(barber.id, dateISO),
      ]);

      const activeSchedule = schedule || DEFAULT_BARBER_SCHEDULE;
      const availableSlots = buildSlots(
        activeSchedule,
        dateISO,
        Number(duration || 0),
        getBookedTimes(bookings),
        shop?.shopHours || null,
      );
      const suggestedSlots = availableSlots.slice(0, 4).map((time) => ({ dateISO, time }));

      if (suggestedSlots.length === 0) {
        for (let offset = 1; offset <= 7 && suggestedSlots.length < 4; offset += 1) {
          const nextDateISO = addDays(dateISO, offset);
          const nextBookings = await getBookingsByBarberAndDate(barber.id, nextDateISO);
          const nextSlots = buildSlots(
            activeSchedule,
            nextDateISO,
            Number(duration || 0),
            getBookedTimes(nextBookings),
            shop?.shopHours || null,
          );

          nextSlots.slice(0, 4 - suggestedSlots.length).forEach((time) => {
            suggestedSlots.push({
              dateISO: nextDateISO,
              time,
            });
          });
        }
      }

      return {
        ...barber,
        schedule: activeSchedule,
        serviceIds: offeredServiceIds,
        availableSlots,
        nextAvailableTime: availableSlots[0] || null,
        suggestedSlots,
      };
    }),
  );

  return availability
    .filter(Boolean)
    .sort((left, right) => (left.name || "").localeCompare(right.name || ""));
}

export async function createBooking(bookingData) {
  let commission = Number(bookingData.commission ?? 0);
  let shop = null;

  if (bookingData.shopId) {
    shop = await getShop(bookingData.shopId);
  }

  if (bookingData.barberId) {
    const barberProfile = await getUserProfile(bookingData.barberId);

    if (!barberProfile || barberProfile.role !== "barber" || barberProfile.status !== "approved") {
      throw new Error("This barber is not approved for bookings yet.");
    }

    if (bookingData.shopId && bookingData.serviceId) {
      const shopServices = await listServicesByShop(bookingData.shopId);
      const offeredServiceIds = resolveBarberServiceIds(barberProfile, shopServices.map((service) => service.id));

      if (!offeredServiceIds.includes(bookingData.serviceId)) {
        throw new Error("This barber does not offer the selected service.");
      }
    }

    const schedule = await getBarberSchedule(bookingData.barberId);
    const scheduleIsValid = isBarberAvailable(
      schedule,
      bookingData.dateISO,
      bookingData.time,
      Number(bookingData.duration || 0),
    );

    if (!scheduleIsValid) {
      throw new Error("This time is outside the barber's working schedule.");
    }

    if (shop?.shopHours && !isWithinShopHours(shop.shopHours, bookingData.dateISO, bookingData.time, Number(bookingData.duration || 0))) {
      throw new Error("This time is outside the shop's operating hours.");
    }

    const existingBookings = await getBookingsByBarberAndDate(bookingData.barberId, bookingData.dateISO);
    const conflicts = existingBookings.some(
      (booking) => booking.time === bookingData.time && booking.status === BOOKING_STATUS.scheduled,
    );

    if (conflicts) {
      throw new Error("That time slot is already booked for this barber.");
    }
  }

  if (!commission && bookingData.shopId) {
    commission = Number(shop?.commissionRate ?? 0.7);
  }

  const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
    ...bookingData,
    customerId: bookingData.customerId ?? null,
    customerName: bookingData.customerName ?? "Walk-in",
    isWalkIn: Boolean(bookingData.isWalkIn),
    status: bookingData.status ?? BOOKING_STATUS.scheduled,
    checkedInAt: bookingData.checkedInAt ?? null,
    completedAt: bookingData.completedAt ?? null,
    commission,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function createWalkInBooking(bookingData) {
  return createBooking({
    ...bookingData,
    customerId: null,
    customerName: bookingData.customerName || "Walk-in",
    customerEmail: bookingData.customerEmail || "",
    isWalkIn: true,
  });
}

export async function updateBooking(id, updates) {
  await updateDoc(doc(db, BOOKINGS_COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateBookingStatus(id, status) {
  const updates = { status };

  if (status === BOOKING_STATUS.checkedIn) {
    updates.checkedInAt = serverTimestamp();
  }

  if (status === BOOKING_STATUS.completed) {
    updates.completedAt = serverTimestamp();
  }

  await updateBooking(id, updates);
}
