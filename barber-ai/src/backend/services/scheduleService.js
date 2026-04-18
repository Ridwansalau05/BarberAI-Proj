import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const BARBER_SCHEDULES_COLLECTION = "barberSchedules";
export const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_ENABLED_DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

function createDefaultDaySchedule(day) {
  const enabled = DEFAULT_ENABLED_DAYS.has(day);

  return {
    enabled,
    startTime: enabled ? "09:00" : "10:00",
    endTime: enabled ? "18:00" : "16:00",
    breaks: enabled ? ["13:00-14:00"] : [],
  };
}

export function createDefaultBarberSchedule() {
  return {
    days: DAY_OPTIONS.reduce((days, day) => {
      days[day] = createDefaultDaySchedule(day);
      return days;
    }, {}),
  };
}

export const DEFAULT_BARBER_SCHEDULE = createDefaultBarberSchedule();

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getDayLabel(dateISO) {
  return DAY_LABELS[new Date(`${dateISO}T00:00:00`).getDay()];
}

function normalizeBreaks(breaks, fallback = []) {
  if (!Array.isArray(breaks)) {
    return [...fallback];
  }

  return breaks.map((value) => value?.trim()).filter(Boolean);
}

export function normalizeBarberSchedule(schedule) {
  const defaults = createDefaultBarberSchedule();

  if (!schedule) {
    return defaults;
  }

  if (schedule.days) {
    const days = DAY_OPTIONS.reduce((result, day) => {
      const currentDay = schedule.days?.[day] || {};
      const defaultDay = defaults.days[day];

      result[day] = {
        enabled: currentDay.enabled ?? defaultDay.enabled,
        startTime: currentDay.startTime || defaultDay.startTime,
        endTime: currentDay.endTime || defaultDay.endTime,
        breaks: normalizeBreaks(currentDay.breaks, defaultDay.breaks),
      };

      return result;
    }, {});

    return {
      ...schedule,
      days,
    };
  }

  const workingDays = Array.isArray(schedule.workingDays) ? schedule.workingDays : [];
  const fallbackBreaks = normalizeBreaks(schedule.breaks, ["13:00-14:00"]);
  const days = DAY_OPTIONS.reduce((result, day) => {
    const defaultDay = defaults.days[day];
    const enabled = workingDays.includes(day);

    result[day] = {
      enabled,
      startTime: schedule.startTime || defaultDay.startTime,
      endTime: schedule.endTime || defaultDay.endTime,
      breaks: enabled ? fallbackBreaks : [],
    };

    return result;
  }, {});

  return {
    ...schedule,
    days,
  };
}

function serializeBarberSchedule(schedule) {
  const normalized = normalizeBarberSchedule(schedule);
  const { id, workingDays, startTime, endTime, breaks, ...rest } = normalized;

  return {
    ...rest,
    days: DAY_OPTIONS.reduce((days, day) => {
      days[day] = {
        enabled: Boolean(normalized.days?.[day]?.enabled),
        startTime: normalized.days?.[day]?.startTime || createDefaultDaySchedule(day).startTime,
        endTime: normalized.days?.[day]?.endTime || createDefaultDaySchedule(day).endTime,
        breaks: normalizeBreaks(normalized.days?.[day]?.breaks),
      };
      return days;
    }, {}),
  };
}

export function getDaySchedule(schedule, dateISO) {
  const day = getDayLabel(dateISO);
  const normalized = normalizeBarberSchedule(schedule || DEFAULT_BARBER_SCHEDULE);
  const daySchedule = normalized.days?.[day];

  if (!daySchedule?.enabled) {
    return null;
  }

  return daySchedule;
}

export function isBarberAvailable(schedule, dateISO, time, duration = 0) {
  const daySchedule = getDaySchedule(schedule || DEFAULT_BARBER_SCHEDULE, dateISO);

  if (!daySchedule) {
    return false;
  }

  const start = timeToMinutes(time);
  const startBound = timeToMinutes(daySchedule.startTime);
  const endBound = timeToMinutes(daySchedule.endTime);
  const appointmentEnd = start + duration;

  if (start < startBound || appointmentEnd > endBound) {
    return false;
  }

  const breaks = daySchedule.breaks || [];

  return !breaks.some((slot) => {
    const [breakStart, breakEnd] = slot.split("-");
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    return start < breakEndMinutes && appointmentEnd > breakStartMinutes;
  });
}

export async function getBarberSchedule(barberId) {
  const snapshot = await getDoc(doc(db, BARBER_SCHEDULES_COLLECTION, barberId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeBarberSchedule({
    id: snapshot.id,
    ...snapshot.data(),
  });
}

export async function ensureBarberSchedule(barberId, overrides = {}) {
  const scheduleRef = doc(db, BARBER_SCHEDULES_COLLECTION, barberId);
  const snapshot = await getDoc(scheduleRef);

  if (!snapshot.exists()) {
    const payload = serializeBarberSchedule({
      barberId,
      ...createDefaultBarberSchedule(),
      ...overrides,
    });

    await setDoc(scheduleRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const nextSnapshot = await getDoc(scheduleRef);

  return normalizeBarberSchedule({
    id: nextSnapshot.id,
    ...nextSnapshot.data(),
  });
}

export async function updateBarberSchedule(barberId, updates) {
  const payload = serializeBarberSchedule({
    barberId,
    ...updates,
  });

  await setDoc(
    doc(db, BARBER_SCHEDULES_COLLECTION, barberId),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
