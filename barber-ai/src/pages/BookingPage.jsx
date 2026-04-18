import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Calendar,
  ChevronLeft,
  Clock,
  MapPin,
  Scissors,
  Search,
  Store,
} from "lucide-react";
import { createBooking, getAvailableBarbersForShopDate } from "../backend/services/bookingService";
import { DEFAULT_BARBER_SCHEDULE } from "../backend/services/scheduleService";
import { listServicesByShop } from "../backend/services/serviceService";
import { listShops } from "../backend/services/shopService";
import { useAuth } from "../state/AuthContext";

const SHOP_ICONS = {
  downtown: Building2,
  midtown: Store,
  eastside: Building2,
  university: Store,
};

const ANY_BARBER = {
  id: "any",
  name: "Any available barber",
  role: "fallback",
  specialties: ["Fastest match"],
};

const fmtMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function sortSlotValues(values) {
  return [...values].sort((left, right) => timeToMinutes(left) - timeToMinutes(right));
}

function StepHeader({ step }) {
  const steps = ["Shop", "Service", "Barber", "Time", "Details", "Confirm"];

  return (
    <div className="mb-8">
      <div className="flex justify-center gap-6 text-sm">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const active = step === stepNumber;

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full ${
                  active ? "bg-brand-gold text-slate-900" : "bg-slate-200 text-slate-600"
                }`}
              >
                {stepNumber}
              </div>
              <span className={`font-semibold ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none mt-4 h-[2px] bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
    </div>
  );
}

function StepActions({ onBack, onNext, nextDisabled }) {
  return (
    <div className={`mt-6 flex ${onBack ? "justify-between" : "justify-end"}`}>
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}
      <button type="button" disabled={nextDisabled} onClick={onNext} className="btn btn-primary disabled:opacity-50">
        Continue
      </button>
    </div>
  );
}

function ShopStep({ shops, loading, value, onChange, onNext }) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return shops;

    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(normalized) ||
        (shop.address || "").toLowerCase().includes(normalized),
    );
  }, [query, shops]);

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Choose a shop</h2>
      <p className="mt-1 text-slate-600">Pick your preferred location.</p>

      <div className="mt-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shops by name or address"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 outline-none focus:ring-2 focus:ring-brand-gold"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              x
            </button>
          )}
        </div>
      </div>

      {loading && <div className="mt-6 text-slate-500">Loading shops...</div>}

      {!loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="text-slate-500">No shops match "{query}".</div>
          ) : (
            filtered.map((shop) => {
              const Icon = SHOP_ICONS[shop.id] ?? Store;
              const selected = value?.id === shop.id;

              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => onChange(shop)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    selected ? "border-brand-gold shadow-soft" : "border-slate-200 hover:shadow"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-1 h-5 w-5 text-brand-gold" />
                    <div>
                      <div className="font-semibold">{shop.name}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {shop.address || "Address not set"}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      <StepActions onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

function ServiceStep({ services, loading, value, onChange, onBack, onNext }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold">Choose a service</h2>
      <p className="mt-1 text-slate-600">Pick what you would like to book.</p>

      {loading ? (
        <div className="mt-6 text-slate-500">Loading services...</div>
      ) : services.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
          This shop has no services configured yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const selected = value?.id === service.id;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onChange(service)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected ? "border-brand-gold shadow-soft" : "border-slate-200 hover:shadow"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-brand-gold" />
                  <div className="font-semibold">{service.name}</div>
                </div>
                <div className="mt-2 text-slate-600">{service.description || "No description provided."}</div>
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {service.duration}m
                  </span>
                  <span>{fmtMoney(service.price)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

function BarberStep({ shop, barbers, loading, value, valueDate, onDate, onChange, onSuggestionPick, onBack, onNext }) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return barbers;

    return barbers.filter((barber) => {
      const haystack = [barber.name, barber.email, ...(barber.specialties || [])].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [barbers, query]);

  const anyBarberAvailable = filtered.some((barber) => (barber.availableSlots || []).length > 0);
  const list = anyBarberAvailable ? [ANY_BARBER, ...filtered] : filtered;

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Choose your barber</h2>
      <p className="mt-1 text-slate-600">We only show barbers with real availability for your selected date.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[220px,1fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 font-medium">
            <Calendar className="h-5 w-5 text-brand-gold" /> Date
          </label>
          <input
            type="date"
            min={todayISO()}
            value={valueDate}
            onChange={(event) => onDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-gold"
          />
          <p className="mt-2 text-xs text-slate-500">{shop?.name}</p>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search barbers by name"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 outline-none focus:ring-2 focus:ring-brand-gold"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              x
            </button>
          )}
        </div>
      </div>

      {loading && <div className="mt-6 text-slate-500">Loading available barbers...</div>}

      {!loading && list.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
          No barbers in this shop offer the selected service.
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((barber) => {
            const selected = value?.id === barber.id;
            const isAnyBarber = barber.id === "any";
            const isAvailableOnDate = isAnyBarber || (barber.availableSlots?.length || 0) > 0;
            const suggestedSlots = isAnyBarber ? [] : barber.suggestedSlots || [];

            return (
              <div
                key={barber.id}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected ? "border-brand-gold shadow-soft" : "border-slate-200 hover:shadow"
                } ${!isAvailableOnDate ? "bg-slate-50/60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isAvailableOnDate) {
                      onChange(barber);
                    }
                  }}
                  disabled={!isAvailableOnDate}
                  className="w-full text-left disabled:cursor-not-allowed"
                >
                  <div className="font-semibold">{barber.name}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {isAnyBarber
                      ? "We will assign the first barber with a real open slot."
                      : isAvailableOnDate
                        ? barber.nextAvailableTime
                          ? `Available on ${valueDate}. Next slot ${barber.nextAvailableTime}.`
                          : `Available on ${valueDate}.`
                        : `Not available on ${valueDate}.`}
                  </div>
                </button>
                {!isAnyBarber && (
                  <>
                    <div className="mt-2 text-xs text-slate-500">
                      {isAvailableOnDate
                        ? `${barber.availableSlots?.length || 0} slot${barber.availableSlots?.length === 1 ? "" : "s"} available`
                        : "Pick one of the next open times below."}
                    </div>
                    {suggestedSlots.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {suggestedSlots.map((slot) => {
                          const label =
                            slot.dateISO === valueDate ? slot.time : `${slot.dateISO} ${slot.time}`;

                          return (
                            <button
                              key={`${barber.id}-${slot.dateISO}-${slot.time}`}
                              type="button"
                              onClick={() => onSuggestionPick(barber, slot)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}

function TimeStep({ slots, loading, valueDate, valueTime, onDate, onTime, onBack, onNext }) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold">Pick a date and time</h2>
      <p className="mt-1 text-slate-600">Available slots reflect real barber schedules and existing bookings.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[220px,1fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 font-medium">
            <Calendar className="h-5 w-5 text-brand-gold" /> Date
          </label>
          <input
            type="date"
            min={todayISO()}
            value={valueDate}
            onChange={(event) => onDate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-brand-gold"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 font-medium">Available times</div>
          {loading ? (
            <div className="text-slate-500">Checking availability...</div>
          ) : slots.length === 0 ? (
            <div className="text-slate-500">No slots are available for this date.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {slots.map((slot) => {
                const selected = valueTime === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onTime(slot)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      selected ? "border-brand-gold bg-amber-50 text-slate-900" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!valueDate || !valueTime} />
    </div>
  );
}

function DetailsPaymentStep({
  user,
  shop,
  service,
  barber,
  requestedBarber,
  dateISO,
  time,
  onBack,
  onConfirm,
  submitting,
  error,
}) {
  const [name, setName] = React.useState(user?.name || user?.displayName || "");
  const [email, setEmail] = React.useState(user?.email || "");
  const [notes, setNotes] = React.useState("");
  const valid = Boolean(name && email && service && barber && dateISO && time);

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Your details</h2>
      <p className="mt-1 text-slate-600">We will send confirmation and reminders.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Stephen Cole"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-gold"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any preferences?"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <div className="font-semibold">Summary</div>
        <div className="mt-2 text-sm text-slate-600">
          {service?.name} | {service?.duration}m | {fmtMoney(service?.price || 0)}
          <br />
          Shop: {shop?.name}
          <br />
          Barber: {requestedBarber?.id === "any" ? barber?.name || "Select a time to assign a barber" : barber?.name}
          <br />
          When: {dateISO} at {time}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          disabled={!valid || submitting}
          onClick={() => onConfirm({ name, email, notes })}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({ payload }) {
  const navigate = useNavigate();

  return (
    <div className="text-center">
      <h2 className="text-2xl font-extrabold">You&apos;re booked!</h2>
      <p className="mt-2 text-slate-600">
        We&apos;ve saved your booking for <span className="font-semibold">{payload.email}</span>.
      </p>

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 p-5 text-left">
        <div className="font-semibold">Appointment</div>
        <div className="mt-2 text-sm text-slate-600">
          {payload.service.name} | {payload.service.duration}m | {fmtMoney(payload.service.price)}
          <br />
          Shop: {payload.shop.name}
          <br />
          Barber: {payload.barber?.name}
          <br />
          When: {payload.dateISO} at {payload.time}
          <br />
          Name: {payload.name}
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={() => navigate("/")} className="btn btn-ghost">
          Back to home
        </button>
        <button type="button" onClick={() => navigate("/dashboard/customer")} className="btn btn-primary">
          Go to my appointments
        </button>
      </div>
    </div>
  );
}

export default function BookingPage() {
  const { user } = useAuth();
  const [step, setStep] = React.useState(1);
  const [shops, setShops] = React.useState([]);
  const [shopsLoading, setShopsLoading] = React.useState(true);
  const [shop, setShop] = React.useState(null);
  const [services, setServices] = React.useState([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);
  const [service, setService] = React.useState(null);
  const [barbers, setBarbers] = React.useState([]);
  const [barbersLoading, setBarbersLoading] = React.useState(false);
  const [barber, setBarber] = React.useState(null);
  const [schedule, setSchedule] = React.useState(DEFAULT_BARBER_SCHEDULE);
  const [slotAssignments, setSlotAssignments] = React.useState({});
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [dateISO, setDateISO] = React.useState(todayISO());
  const [time, setTime] = React.useState("");
  const [details, setDetails] = React.useState(null);
  const [bookingId, setBookingId] = React.useState("");
  const [slots, setSlots] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");

  const assignedBarber = barber?.id === "any" ? slotAssignments[time] || null : barber;

  React.useEffect(() => {
    let cancelled = false;

    async function loadShops() {
      setShopsLoading(true);

      try {
        const data = await listShops();
        if (!cancelled) {
          setShops(data);
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message ?? "Failed to load shops.");
        }
      } finally {
        if (!cancelled) {
          setShopsLoading(false);
        }
      }
    }

    loadShops();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      if (!shop?.id) {
        setServices([]);
        return;
      }

      setServicesLoading(true);

      try {
        const data = await listServicesByShop(shop.id);
        if (!cancelled) {
          setServices(data);
          if (!data.find((item) => item.id === service?.id)) {
            setService(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message ?? "Failed to load services.");
        }
      } finally {
        if (!cancelled) {
          setServicesLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [service?.id, shop?.id]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadBarbers() {
      if (!shop?.id || !service) {
        setBarbers([]);
        setBarbersLoading(false);
        return;
      }

      setBarbersLoading(true);

      try {
        const data = await getAvailableBarbersForShopDate({
          shopId: shop.id,
          dateISO,
          duration: service.duration,
          serviceId: service.id,
        });
        if (!cancelled) {
          setBarbers(data);
          if (!data.find((item) => item.id === barber?.id) && barber?.id !== "any") {
            setBarber(null);
          }
          if (barber?.id === "any" && data.length === 0) {
            setBarber(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(error.message ?? "Failed to load available barbers.");
        }
      } finally {
        if (!cancelled) {
          setBarbersLoading(false);
        }
      }
    }

    loadBarbers();

    return () => {
      cancelled = true;
    };
  }, [barber?.id, dateISO, service, shop?.id]);

  React.useEffect(() => {
    setSlotsLoading(barbersLoading);

    if (!service || !shop?.id || !barber) {
      setSchedule(DEFAULT_BARBER_SCHEDULE);
      setSlotAssignments({});
      setSlots([]);
      return;
    }

    if (barber.id === "any") {
      const nextAssignments = {};

      barbers.forEach((availableBarber) => {
        (availableBarber.availableSlots || []).forEach((slot) => {
          if (!nextAssignments[slot]) {
            nextAssignments[slot] = availableBarber;
          }
        });
      });

      setSchedule(DEFAULT_BARBER_SCHEDULE);
      setSlotAssignments(nextAssignments);
      setSlots(sortSlotValues(Object.keys(nextAssignments)));
      return;
    }

    const selectedBarber = barbers.find((item) => item.id === barber.id);

    if (!selectedBarber) {
      setSchedule(DEFAULT_BARBER_SCHEDULE);
      setSlotAssignments({});
      setSlots([]);
      return;
    }

    setSchedule(selectedBarber.schedule || DEFAULT_BARBER_SCHEDULE);
    setSlotAssignments({});
    setSlots(selectedBarber.availableSlots || []);
  }, [barber, barbers, barbersLoading, service, shop?.id]);

  async function handleConfirm(detailsPayload) {
    if (!user || !shop || !service || !barber || !dateISO || !time || !assignedBarber) {
      setSubmitError("Missing booking information.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const bookingPayload = {
        customerId: user.uid,
        customerName: detailsPayload.name,
        customerEmail: detailsPayload.email,
        shopId: shop.id,
        shopName: shop.name,
        shopAddress: shop.address || "",
        serviceId: service.id,
        serviceName: service.name,
        duration: service.duration,
        price: service.price,
        barberId: assignedBarber.id,
        barberName: assignedBarber.name,
        dateISO,
        time,
        notes: detailsPayload.notes || "",
      };

      const id = await createBooking(bookingPayload);
      setBookingId(id);
      setDetails(detailsPayload);
      setStep(6);
    } catch (error) {
      setSubmitError(error.message ?? "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container-xl py-10">
      <StepHeader step={step} />

      {submitError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {step === 1 && (
        <ShopStep
          shops={shops}
          loading={shopsLoading}
          value={shop}
          onChange={(nextShop) => {
            setShop(nextShop);
            setService(null);
            setBarber(null);
            setBarbers([]);
            setServices([]);
            setSlotAssignments({});
            setTime("");
          }}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <ServiceStep
          services={services}
          loading={servicesLoading}
          value={service}
          onChange={(nextService) => {
            setService(nextService);
            setBarber(null);
            setSlotAssignments({});
            setTime("");
          }}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <BarberStep
          shop={shop}
          barbers={barbers}
          loading={barbersLoading}
          value={barber}
          valueDate={dateISO}
          onDate={(nextDate) => {
            setDateISO(nextDate);
            setTime("");
          }}
          onChange={(nextBarber) => {
            setBarber(nextBarber);
            setSlotAssignments({});
            setTime("");
          }}
          onSuggestionPick={(nextBarber, slot) => {
            setBarber(nextBarber);
            setDateISO(slot.dateISO);
            setTime(slot.time);
            setStep(4);
          }}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <TimeStep
          slots={slots}
          loading={slotsLoading}
          valueDate={dateISO}
          valueTime={time}
          onDate={(nextDate) => {
            setDateISO(nextDate);
            setTime("");
          }}
          onTime={setTime}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      )}

      {step === 5 && (
        <DetailsPaymentStep
          user={user}
          shop={shop}
          service={service}
          barber={assignedBarber}
          requestedBarber={barber}
          dateISO={dateISO}
          time={time}
          onBack={() => setStep(4)}
          onConfirm={handleConfirm}
          submitting={submitting}
          error={submitError}
        />
      )}

      {step === 6 && details && (
        <ConfirmStep payload={{ ...details, bookingId, shop, service, barber: assignedBarber, schedule, dateISO, time }} />
      )}
    </section>
  );
}
