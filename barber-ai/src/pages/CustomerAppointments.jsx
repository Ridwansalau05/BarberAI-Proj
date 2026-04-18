import React from "react";
import {
  CalendarDays,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from "lucide-react";

/* -------- demo data (swap with API later) -------- */
const APPTS = [
  // upcoming
  { id: "u1", date: "2025-10-08", time: "10:00", duration: 45, service: "Skin Fade", barber: "Kofi D.",   shop: "Brazy Cutz",   address: "456 Oak Ave",   status: "scheduled" },
  { id: "u2", date: "2025-10-28", time: "14:30", duration: 30, service: "Beard Trim", barber: "Mike J.", shop: "Breezy Cutz",  address: "123 Main St",   status: "scheduled" },
  // past
  { id: "p1", date: "2025-09-12", time: "16:00", duration: 60, service: "Cut + Beard", barber: "Ayo L.",  shop: "CrossFades",   address: "618 Church St", rating: 5, status: "completed" },
  { id: "p2", date: "2025-08-20", time: "12:00", duration: 45, service: "Skin Fade",   barber: "Mike J.", shop: "Breezy Cutz",  address: "123 Main St",   rating: 4, status: "completed" },
];

/* ---------------- helpers / atoms ---------------- */
function fmtDateTime(dateISO, time) {
  const d = new Date(`${dateISO}T${time}:00`);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Pill({ children, color = "green" }) {
  const map = {
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="p-4 border-t flex justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

// quick inline ICS maker
function downloadICS({ title, startISO, endISO, location = "", description = "" }) {
  const strip = (s) => s.replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarberAI//Appointments//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}`,
    `DTSTAMP:${strip(new Date().toISOString())}`,
    `DTSTART:${strip(startISO)}`,
    `DTEND:${strip(endISO)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "appointment.ics";
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------- page -------------------- */
export default function CustomerAppointments() {
  const [tab, setTab] = React.useState("Upcoming");
  const [q, setQ] = React.useState("");
  const [dateISO, setDateISO] = React.useState(new Date().toISOString().slice(0, 10));

  const [rescheduleId, setRescheduleId] = React.useState(null);
  const [cancelId, setCancelId] = React.useState(null);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");

  function shiftDay(delta) {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + delta);
    setDateISO(d.toISOString().slice(0, 10));
  }

  const upcoming = APPTS
    .filter((a) => a.status !== "completed")
    .filter((a) => a.date >= dateISO)
    .filter((a) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [a.service, a.barber, a.shop].join(" ").toLowerCase().includes(s);
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const past = APPTS
    .filter((a) => a.status === "completed")
    .filter((a) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [a.service, a.barber, a.shop].join(" ").toLowerCase().includes(s);
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const list = tab === "Upcoming" ? upcoming : past;

  return (
    <section className="container-xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">My Appointments</h1>
          <p className="text-slate-600">Manage your upcoming visits and browse your history.</p>
        </div>

        {/* Light date control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDay(-1)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative [color-scheme:light]">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="w-[168px] rounded-full border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm
                         text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={() => shiftDay(1)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2">
        {["Upcoming", "Past"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition
              ${t === tab ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by service, barber, or shop…"
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* List */}
      <div className="mt-4 grid gap-3">
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
            {tab === "Upcoming"
              ? "No upcoming appointments. "
              : "No past appointments yet. "}
            <a href="/book" className="text-amber-600 underline">Book your next visit →</a>
          </div>
        ) : (
          list.map((a) => {
            const start = new Date(`${a.date}T${a.time}:00`);
            const end = new Date(start.getTime() + a.duration * 60000);
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.service}</div>
                  <div className="text-slate-600 text-sm">
                    with {a.barber} at {a.shop}
                  </div>
                  <div className="text-slate-500 text-xs inline-flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {fmtDateTime(a.date, a.time)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {a.duration} min
                    </span>
                    <span>•</span>
                    <Pill color={a.status === "completed" ? "gray" : "green"}>{a.status}</Pill>
                  </div>
                </div>

                {/* Actions */}
                {tab === "Upcoming" ? (
                  <div className="flex gap-2">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        downloadICS({
                          title: `${a.service} — ${a.shop}`,
                          startISO: start.toISOString(),
                          endISO: end.toISOString(),
                          location: a.address,
                          description: `Barber: ${a.barber}`,
                        });
                      }}
                    >
                      Add to Calendar
                    </button>
                    <button
                      onClick={() => setRescheduleId(a.id)}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setCancelId(a.id)}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < (a.rating || 0) ? "text-amber-500" : "text-slate-300"
                          }`}
                          fill={i < (a.rating || 0) ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <a href="/book" className="btn btn-ghost">Book again</a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reschedule modal */}
      <Modal
        open={!!rescheduleId}
        onClose={() => setRescheduleId(null)}
        title="Reschedule appointment"
        footer={
          <>
            <button onClick={() => setRescheduleId(null)} className="btn btn-ghost">Close</button>
            <button
              disabled={!newDate || !newTime}
              onClick={() => {
                // TODO: call API
                setRescheduleId(null);
                setNewDate(""); setNewTime("");
              }}
              className="btn btn-primary disabled:opacity-50"
            >
              Save changes
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
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Time</label>
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancel appointment"
        footer={
          <>
            <button onClick={() => setCancelId(null)} className="btn btn-ghost">Keep</button>
            <button
              onClick={() => {
                // TODO: call API
                setCancelId(null);
              }}
              className="btn btn-primary"
            >
              Confirm cancel
            </button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to cancel this appointment? You can always rebook later.
        </p>
      </Modal>
    </section>
  );
}
