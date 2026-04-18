// src/pages/BarberAppointments.jsx
import React from "react";
import {
  CalendarDays,
  Clock,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Ban,
  X,
  NotebookPen,
  Repeat2,
} from "lucide-react";

/* ------------------ demo data (swap with API later) ------------------ */
const APPTS = [
  // upcoming (today)
  { id: "a1", date: "2025-10-07", time: "09:00", customer: "John Doe",     service: "Haircut & Styling", duration: 60, status: "scheduled" },
  { id: "a2", date: "2025-10-07", time: "10:30", customer: "Mike Smith",   service: "Beard Trim",        duration: 30, status: "scheduled" },
  // upcoming (future)
  { id: "a3", date: "2025-10-08", time: "14:00", customer: "Alex Johnson", service: "Full Service",      duration: 90, status: "scheduled" },
  { id: "a4", date: "2025-10-10", time: "11:00", customer: "Taylor R.",    service: "Skin Fade",         duration: 45, status: "scheduled" },

  // past (this month)
  { id: "p1", date: "2025-10-03", time: "15:00", customer: "Chris Y.",     service: "Cut + Beard",       duration: 60, status: "completed" },
  { id: "p2", date: "2025-10-02", time: "12:00", customer: "Zed K.",       service: "Beard Trim",        duration: 25, status: "no-show" },

  // older
  { id: "p3", date: "2025-09-25", time: "13:30", customer: "Liam P.",      service: "Head Shave",        duration: 35, status: "completed" },
];

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const initials = (n = "") =>
  n.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

function Pill({ children, color = "green" }) {
  const map = {
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
    </div>
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

export default function BarberAppointments() {
  const [tab, setTab] = React.useState("Upcoming"); // "Upcoming" | "Past"
  const [q, setQ] = React.useState("");
  const [dateISO, setDateISO] = React.useState(TODAY_ISO);

  // Modals
  const [rescheduleId, setRescheduleId] = React.useState(null);
  const [cancelId, setCancelId] = React.useState(null);
  const [noteId, setNoteId] = React.useState(null);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");
  const [noteText, setNoteText] = React.useState("");

  function shiftDay(delta) {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + delta);
    setDateISO(d.toISOString().slice(0, 10));
  }

  // Helpers
  const toDate = (a) => new Date(`${a.date}T${a.time}:00`);
  const isUpcoming = (a) => toDate(a).getTime() >= new Date().getTime();
  const isToday = (a) => a.date === TODAY_ISO;

  const upcoming = APPTS
    .filter((a) => isUpcoming(a))
    .filter((a) => a.date >= dateISO) // respect the header's date as "from"
    .filter((a) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [a.customer, a.service].join(" ").toLowerCase().includes(s);
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const past = APPTS
    .filter((a) => !isUpcoming(a))
    .filter((a) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [a.customer, a.service].join(" ").toLowerCase().includes(s);
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const todayCount = upcoming.filter(isToday).length;
  const thisMonthPast = past.filter((a) => a.date.slice(0, 7) === TODAY_ISO.slice(0, 7)).length;

  const list = tab === "Upcoming" ? upcoming : past;

  return (
    <section className="container-xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Appointments</h1>
          <p className="text-slate-600">Upcoming bookings and your recent history.</p>
        </div>

        {/* Date control (light theme) */}
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

      {/* KPI Row */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Today" value={todayCount} />
        <Stat label="Past (this month)" value={thisMonthPast} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2">
        {["Upcoming", "Past"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              t === tab ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-100"
            }`}
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
          placeholder="Search by customer or service…"
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* List */}
      <div className="mt-4 grid gap-3">
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
            {tab === "Upcoming" ? "No upcoming appointments match your filters." : "No past appointments match your filters."}
          </div>
        ) : (
          list.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700 font-semibold">
                  {initials(a.customer)}
                </div>
                <div>
                  <div className="font-medium">{a.customer}</div>
                  <div className="text-slate-600 text-sm">{a.service}</div>
                  <div className="text-slate-500 text-xs inline-flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {a.date} • {a.time}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {a.duration} min
                    </span>
                    <span>•</span>
                    {a.status === "scheduled" && <Pill color="blue">scheduled</Pill>}
                    {a.status === "completed" && <Pill color="gray">completed</Pill>}
                    {a.status === "no-show" && <Pill color="red">no-show</Pill>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {tab === "Upcoming" ? (
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                    <User className="h-4 w-4" /> Check-in
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                    <CheckCircle2 className="h-4 w-4" /> Complete
                  </button>
                  <button
                    onClick={() => setRescheduleId(a.id)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <Repeat2 className="h-4 w-4" /> Reschedule
                  </button>
                  <button
                    onClick={() => setCancelId(a.id)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <Ban className="h-4 w-4" /> Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
                    <NotebookPen className="h-4 w-4" /> Add note
                  </button>
                  <a
                    href="/book"
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Rebook
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reschedule modal */}
      <Modal
        open={!!rescheduleId}
        onClose={() => setRescheduleId(null)}
        title="Reschedule appointment"
        footer={
          <>
            <button onClick={() => setRescheduleId(null)} className="btn btn-ghost">
              Close
            </button>
            <button
              disabled={!newDate || !newTime}
              onClick={() => {
                // TODO: integrate API
                setRescheduleId(null);
                setNewDate("");
                setNewTime("");
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
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Time</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
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
            <button onClick={() => setCancelId(null)} className="btn btn-ghost">
              Keep
            </button>
            <button
              onClick={() => {
                // TODO: integrate API
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

      {/* Add note modal (for past) */}
      <Modal
        open={!!noteId}
        onClose={() => setNoteId(null)}
        title="Add client note"
        footer={
          <>
            <button onClick={() => setNoteId(null)} className="btn btn-ghost">
              Close
            </button>
            <button
              onClick={() => {
                // TODO: save note
                setNoteId(null);
                setNoteText("");
              }}
              className="btn btn-primary"
            >
              Save note
            </button>
          </>
        }
      >
        <textarea
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="e.g., Prefers low fade with slight crop; sensitive skin around neckline."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
        />
      </Modal>
    </section>
  );
}
