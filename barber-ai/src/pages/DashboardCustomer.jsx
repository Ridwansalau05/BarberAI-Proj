import React from "react";
import { useNavigate } from "react-router-dom";
import FeedbackModal from "../components/FeedbackModal";
import StarRating from "../components/StarRating";
import FeedbackForm from "../components/FeedbackForm";
import { listFeedbackForUser, submitFeedback } from "../lib/feedback";
import { listHistory } from "../lib/history";
import Recommendations from "../components/Recommendations";
import { bestTimeWindow } from "../ai/rules";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Scissors,
  Star,
  UserCircle2,
  X,
} from "lucide-react";
import { bestTimeWindow } from "../ai/rules";
import { getUserBookings, updateBooking } from "../backend/services/bookingService";
import { useAuth } from "../state/AuthContext";
import Recommendations from "../components/Recommendations";
function fmtDateTime(dateISO, time) {
  const date = new Date(`${dateISO}T${time}:00`);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}



function pillColor(status) {
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (status === "completed") return "bg-slate-100 text-slate-700";
  return "bg-emerald-100 text-emerald-700";
}

function isPastBooking(booking) {
  const bookingDate = new Date(`${booking.dateISO}T${booking.time}:00`);
  return bookingDate.getTime() < Date.now();
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="flex justify-end gap-3 border-t p-4">{footer}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, right }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100">
            <Icon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

function SectionCard({ title, tabs, activeTab, setActiveTab, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-end justify-between px-5 pt-4">
        <div className="flex items-center gap-6">
          <div className="py-3 text-lg font-semibold">{title}</div>
          {!!tabs?.length && (
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    tab === activeTab ? "border-b-2 border-amber-500 text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

export default function DashboardCustomer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("Overview");
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [rescheduleBooking, setRescheduleBooking] = React.useState(null);
  const [cancelBooking, setCancelBooking] = React.useState(null);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");
  const [saving, setSaving] = React.useState(false);
    const legacyProfile = JSON.parse(localStorage.getItem("profile") || "{}") || {};
  const storedProfile = JSON.parse(localStorage.getItem(`profile:${user?.uid}`) || "{}") || {};
    const [feedback, setFeedback] = React.useState([]);
  const profile = { faceShape: "Oval", ...legacyProfile, ...storedProfile };
  const loadBookings = React.useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError("");

    try {
      const data = await getUserBookings(user.uid);
      setBookings(data);
    } catch (loadError) {
      setError(loadError.message ?? "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);
   function handleBookFromRec(style) {
    localStorage.setItem("prefillService", style.service);
    navigate("/book");
  }
    const prefWeights = React.useMemo(() => {
    const weights = {};
    feedback.forEach((f) => {
      const s = `${f.service || ""}`.toLowerCase();
      const apply = (k, delta) => {
        weights[k] = (weights[k] || 0) + delta;
      };
      const delta = f.rating >= 4 ? 1 : f.rating <= 2 ? -1 : 0;
      if (/fade/.test(s)) apply("fade", delta);
      if (/taper/.test(s)) apply("taper", delta);
      if (/beard/.test(s)) apply("beard", delta);
      if (/buzz/.test(s)) apply("buzz", delta);
      if (/classic|side/.test(s)) apply("classic", delta);
      if (/crop/.test(s)) apply("crop", delta);
    });
    return weights;
  }, [feedback]);
  React.useEffect(() => {
    loadBookings();
  }, [loadBookings]);
  const enrichedProfile = { ...profile, prefWeights };
  const upcomingBookings = bookings.filter((booking) => booking.status !== "cancelled" && !isPastBooking(booking));
  const historyBookings = bookings.filter((booking) => booking.status === "cancelled" || isPastBooking(booking));
  const preferredBarber = upcomingBookings[0]?.barberName || historyBookings[0]?.barberName || "-";
  const upcomingCount = upcomingBookings.length;
  const totalVisits = bookings.length;
  
  const historySorted = [...historyBookings].sort((a, b) =>
    (b.dateISO + b.time).localeCompare(a.dateISO + a.time)
  );
  const timeWin = bestTimeWindow(historySorted); 
  const averagePrice = bookings.length
    ? `$${(bookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0) / bookings.length).toFixed(0)}`
    : "-";

  async function handleRescheduleSave() {
    if (!rescheduleBooking || !newDate || !newTime) return;

    setSaving(true);
    setActionError("");

    try {
      await updateBooking(rescheduleBooking.id, { dateISO: newDate, time: newTime });
      setRescheduleBooking(null);
      setNewDate("");
      setNewTime("");
      await loadBookings();
    } catch (updateError) {
      setActionError(updateError.message ?? "Failed to reschedule booking.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelConfirm() {
    if (!cancelBooking) return;

    setSaving(true);
    setActionError("");

    try {
      await updateBooking(cancelBooking.id, { status: "cancelled" });
      setCancelBooking(null);
      await loadBookings();
    } catch (updateError) {
      setActionError(updateError.message ?? "Failed to cancel booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="container-xl py-8">
      <h1 className="text-3xl font-extrabold">Welcome back, {user?.name || user?.displayName || "Customer"}!</h1>
      <p className="mt-1 text-slate-600">Manage your appointments and review your saved bookings.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Upcoming" value={upcomingCount} />
        <StatCard icon={Scissors} label="Total Bookings" value={totalVisits} />
        <StatCard icon={Star} label="Average Spend" value={averagePrice} right={<Star className="h-5 w-5 text-amber-500" />} />
        <StatCard icon={UserCircle2} label="Preferred Barber" value={preferredBarber.split(" ")[0] || "-"} />
      </div>

      <div className="mt-6">
        <SectionCard
          title="Appointments"
          tabs={["Overview", "AI Recommendations", "History"]}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        >
          {loading && <div className="text-slate-500">Loading bookings...</div>}
          {!loading && error && <div className="text-red-600">{error}</div>}

          {!loading && !error && activeTab === "Overview" && (
            <div className="space-y-4">
              <div className="text-lg font-semibold">Upcoming Appointments</div>

              {upcomingBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
                  You have no upcoming appointments.{" "}
                  <a href="/book" className="text-amber-600 underline">
                    Book your next visit {"->"}
                  </a>
                </div>
              ) : (
                upcomingBookings.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold">{booking.serviceName}</div>
                        <div className="text-sm text-slate-600">
                          with {booking.barberName} at {booking.shopName}
                        </div>
                        <div className="mt-1 inline-flex flex-wrap items-center gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {fmtDateTime(booking.dateISO, booking.time)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {booking.duration} min
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${pillColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setRescheduleBooking(booking);
                            setNewDate(booking.dateISO);
                            setNewTime(booking.time);
                          }}
                          className="btn btn-primary"
                        >
                          Reschedule
                        </button>
                        <button onClick={() => setCancelBooking(booking)} className="btn btn-ghost">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && !error && activeTab === "AI Recommendations" && (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Recommendations grid */}
              <div className="lg:col-span-2">
                <Recommendations
                  profile={enrichedProfile}
                  history={historySorted}
                  limit={6}
                  onBook={handleBookFromRec}
                />
              </div>

              {/* Side insights card */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm">
                <div className="font-semibold">Personalized tips</div>
                <ul className="mt-3 list-disc pl-5 text-slate-700 space-y-1">
                  <li>
                    Best times:{" "}
                    <span className="font-medium">{timeWin.label}</span>{" "}
                    <span className="text-slate-500">({timeWin.reason})</span>
                  </li>
                  <li>
                    Face shape: <span className="font-medium">{profile.faceShape}</span>
                  </li>
                  <li>
                    Try a <span className="font-medium">Low Fade</span> with your face shape
                  </li>
                  {Object.keys(prefWeights || {}).length > 0 && (
                    <li>
                      Based on ratings, you favor{' '}
                      <span className="font-medium">
                        {Object.entries(prefWeights)
                          .filter(([,v]) => v > 0)
                          .sort((a,b) => b[1]-a[1])
                          .slice(0,2)
                          .map(([k]) => k)
                          .join(', ') || 'classic'}
                      </span>
                      {' '}styles.
                    </li>
                  )}
                  <li>
                    Not sure of your face shape? Open the AI quiz in the Recommendations tab.
                  </li>
                </ul>
                <button
                  onClick={() => navigate("/book")}
                  className="mt-4 inline-flex items-center gap-2 font-medium text-amber-600"
                >
                  Book now <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!loading && !error && activeTab === "History" && (
            <div className="space-y-3">
              {historyBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
                  Your booking history will appear here after your first appointment.
                </div>
              ) : (
                historyBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <div className="font-medium">{booking.serviceName}</div>
                      <div className="text-sm text-slate-600">
                        with {booking.barberName} - {fmtDateTime(booking.dateISO, booking.time)} - {booking.duration}m
                      </div>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${pillColor(booking.status)}`}>
                      {booking.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </SectionCard>
      </div>

      <Modal
        open={!!rescheduleBooking}
        onClose={() => {
          setRescheduleBooking(null);
          setActionError("");
        }}
        title="Reschedule appointment"
        footer={
          <>
            <button onClick={() => setRescheduleBooking(null)} className="btn btn-ghost">
              Close
            </button>
            <button disabled={!newDate || !newTime || saving} onClick={handleRescheduleSave} className="btn btn-primary disabled:opacity-50">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Time</label>
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
              value={newTime}
              onChange={(event) => setNewTime(event.target.value)}
            />
          </div>
        </div>
        {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}
      </Modal>

      <Modal
        open={!!cancelBooking}
        onClose={() => {
          setCancelBooking(null);
          setActionError("");
        }}
        title="Cancel appointment"
        footer={
          <>
            <button onClick={() => setCancelBooking(null)} className="btn btn-ghost">
              Keep
            </button>
            <button onClick={handleCancelConfirm} disabled={saving} className="btn btn-primary">
              {saving ? "Cancelling..." : "Confirm cancel"}
            </button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to cancel this appointment? You can always rebook later.
        </p>
        {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}
      </Modal>
    </section>
  );
}
