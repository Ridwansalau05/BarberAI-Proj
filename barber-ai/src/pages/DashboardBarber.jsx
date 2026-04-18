import React from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Link2,
  Plus,
  Settings,
  Star,
  Store,
  Users2,
  X,
} from "lucide-react";
import {
  cancelOwnBarberRequest,
  getBarberRequest,
  updateOwnBarberRequest,
} from "../backend/services/barberRequestService";
import {
  BOOKING_STATUS,
  createWalkInBooking,
  getBarberDashboardData,
  updateBookingStatus,
} from "../backend/services/bookingService";
import {
  createDefaultBarberSchedule,
  DAY_OPTIONS,
  getBarberSchedule,
  normalizeBarberSchedule,
  updateBarberSchedule,
} from "../backend/services/scheduleService";
import { getBarberServiceSelection, updateBarberServiceSelection } from "../backend/services/serviceService";
import { listShops } from "../backend/services/shopService";
import { useAuth } from "../state/AuthContext";

const initials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-lg font-semibold">{title}</div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
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

function StatusBadge({ status }) {
  const tone =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : status === "cancelled"
          ? "bg-slate-100 text-slate-700"
          : "bg-amber-100 text-amber-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>{status}</span>;
}

function BookingStatusPill({ status }) {
  const tone =
    status === BOOKING_STATUS.completed
      ? "bg-emerald-100 text-emerald-700"
      : status === BOOKING_STATUS.checkedIn
        ? "bg-blue-100 text-blue-700"
        : status === BOOKING_STATUS.noShow
          ? "bg-red-100 text-red-700"
          : status === BOOKING_STATUS.cancelled
            ? "bg-slate-100 text-slate-700"
            : "bg-amber-100 text-amber-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>;
}

function RequestPanel({
  user,
  request,
  shops,
  loading,
  actionLoading,
  actionError,
  selectedShopId,
  setSelectedShopId,
  onUpdate,
  onCancel,
}) {
  const currentShopName =
    shops.find((shop) => shop.id === (request?.shopId || user?.shopId))?.name || user?.shopName || "No shop selected";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Barber Request Status</h2>
            <p className="mt-1 text-slate-600">
              Track your approval state and manage which shop you are requesting access to.
            </p>
          </div>
          <StatusBadge status={user?.status || request?.status || "pending"} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={Store} label="Requested Shop" value={currentShopName} />
          <StatCard icon={Clock} label="Current Status" value={user?.status || request?.status || "pending"} />
          <StatCard icon={CalendarDays} label="Request ID" value={request?.id || user?.uid || "-"} />
        </div>
      </div>

      <Card title="Manage Request" right={null}>
        {loading ? (
          <div className="text-slate-500">Loading request details...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Requested shop</label>
              <select
                value={selectedShopId}
                onChange={(event) => setSelectedShopId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose a shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>

            {user?.status === "pending" && (
              <p className="text-sm text-slate-600">
                Your request is pending owner approval. You can switch shops or withdraw the request before it is reviewed.
              </p>
            )}

            {user?.status === "rejected" && (
              <p className="text-sm text-slate-600">
                Your previous request was rejected. Select a shop and resubmit when you are ready.
              </p>
            )}

            {user?.status === "cancelled" && (
              <p className="text-sm text-slate-600">
                Your request was withdrawn. Select a shop below to submit a new request.
              </p>
            )}

            {actionError && <p className="text-sm text-red-600">{actionError}</p>}

            <div className="flex flex-wrap gap-3">
              <button onClick={onUpdate} disabled={!selectedShopId || actionLoading} className="btn btn-primary disabled:opacity-50">
                {actionLoading ? "Saving..." : request ? "Update request" : "Submit request"}
              </button>
              {request && request.status !== "cancelled" && (
                <button
                  onClick={onCancel}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" /> Cancel request
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ScheduleEditor({ schedule, onToggleDay, onChangeDay, onSave, saving }) {
  return (
    <Card title="Working Schedule" right={<Settings className="h-4 w-4 text-slate-400" />}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Set different hours for each day. Disabled days are treated as unavailable.
        </p>

        <div className="space-y-3">
          {DAY_OPTIONS.map((day) => {
            const daySchedule = schedule.days?.[day] || createDefaultBarberSchedule().days[day];

            return (
              <div key={day} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-4 lg:grid-cols-[120px,1fr,1fr,1.4fr] lg:items-end">
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={daySchedule.enabled}
                      onChange={() => onToggleDay(day)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    {day}
                  </label>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start</label>
                    <input
                      type="time"
                      value={daySchedule.startTime}
                      disabled={!daySchedule.enabled}
                      onChange={(event) => onChangeDay(day, "startTime", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End</label>
                    <input
                      type="time"
                      value={daySchedule.endTime}
                      disabled={!daySchedule.enabled}
                      onChange={(event) => onChangeDay(day, "endTime", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Breaks</label>
                    <input
                      type="text"
                      value={daySchedule.breaks.join(", ")}
                      disabled={!daySchedule.enabled}
                      onChange={(event) =>
                        onChangeDay(
                          day,
                          "breaks",
                          event.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="13:00-14:00, 16:00-16:30"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button onClick={onSave} disabled={saving} className="btn btn-primary disabled:opacity-50">
            {saving ? "Saving..." : "Save schedule"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ServiceOfferingsEditor({ services, onToggle, onSave, saving }) {
  const adoptedCount = services.filter((service) => service.adopted).length;

  return (
    <Card title="Services You Offer" right={<Link2 className="h-4 w-4 text-slate-400" />}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Adopt the shop services you personally offer. Booking and walk-ins will only use the adopted services.
        </p>

        <div className="space-y-3">
          {services.map((service) => (
            <label key={service.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <div className="font-medium text-slate-900">{service.name}</div>
                <div className="mt-1 text-sm text-slate-600">{service.description || "No description provided."}</div>
                <div className="mt-2 text-xs text-slate-500">
                  ${Number(service.price || 0).toFixed(2)} | {service.duration} mins
                </div>
              </div>

              <input
                type="checkbox"
                checked={service.adopted}
                onChange={() => onToggle(service.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{adoptedCount} adopted</span>
          <button onClick={onSave} disabled={saving} className="btn btn-primary disabled:opacity-50">
            {saving ? "Saving..." : "Save services"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function DashboardBarber() {
  const { user, refreshUser } = useAuth();
  const [request, setRequest] = React.useState(null);
  const [shops, setShops] = React.useState([]);
  const [services, setServices] = React.useState([]);
  const [schedule, setSchedule] = React.useState(() => createDefaultBarberSchedule());
  const [dashboard, setDashboard] = React.useState({
    bookings: [],
    todaysBookings: [],
    metrics: {
      appointmentsToday: 0,
      totalAppointments: 0,
      totalCustomers: 0,
      averageRating: null,
      revenue: 0,
    },
  });
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [scheduleSaving, setScheduleSaving] = React.useState(false);
  const [servicesSaving, setServicesSaving] = React.useState(false);
  const [actionError, setActionError] = React.useState("");
  const [selectedShopId, setSelectedShopId] = React.useState("");
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const [walkInName, setWalkInName] = React.useState("");
  const [walkInServiceId, setWalkInServiceId] = React.useState("");
  const [walkInDateISO, setWalkInDateISO] = React.useState(todayISO());
  const [walkInTime, setWalkInTime] = React.useState(new Date().toTimeString().slice(0, 5));
  const [walkInError, setWalkInError] = React.useState("");
  const currentShopName =
    shops.find((shop) => shop.id === user?.shopId)?.name ||
    shops.find((shop) => shop.id === request?.shopId)?.name ||
    user?.shopName ||
    "No shop assigned";

  const loadData = React.useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setActionError("");

    try {
      const [requestData, shopData] = await Promise.all([getBarberRequest(user.uid), listShops()]);
      setRequest(requestData);
      setShops(shopData);
      setSelectedShopId(requestData?.shopId || user?.shopId || "");

      if (user.status === "approved" && user.shopId) {
        const [dashboardData, scheduleData, serviceSelection] = await Promise.all([
          getBarberDashboardData({ barberId: user.uid, shopId: user.shopId, todayISO: todayISO() }),
          getBarberSchedule(user.uid),
          getBarberServiceSelection(user.uid, user.shopId),
        ]);

        setDashboard(dashboardData);
        setSchedule(normalizeBarberSchedule(scheduleData || createDefaultBarberSchedule()));
        setServices(serviceSelection.services);
      } else {
        setDashboard({
          bookings: [],
          todaysBookings: [],
          metrics: {
            appointmentsToday: 0,
            totalAppointments: 0,
            totalCustomers: 0,
            averageRating: null,
            revenue: 0,
          },
        });
        setSchedule(createDefaultBarberSchedule());
        setServices([]);
      }
    } catch (error) {
      setActionError(error.message ?? "Failed to load barber data.");
    } finally {
      setLoading(false);
    }
  }, [user?.shopId, user?.status, user?.uid]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateRequest() {
    if (!user?.uid || !selectedShopId) {
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      await updateOwnBarberRequest(user.uid, selectedShopId);
      await refreshUser();
      await loadData();
    } catch (error) {
      setActionError(error.message ?? "Failed to update barber request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!user?.uid) {
      return;
    }

    setActionLoading(true);
    setActionError("");

    try {
      await cancelOwnBarberRequest(user.uid);
      await refreshUser();
      await loadData();
    } catch (error) {
      setActionError(error.message ?? "Failed to cancel barber request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBookingStatus(bookingId, status) {
    setActionLoading(true);
    setActionError("");

    try {
      await updateBookingStatus(bookingId, status);
      await loadData();
    } catch (error) {
      setActionError(error.message ?? "Failed to update booking status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveSchedule() {
    if (!user?.uid || !user?.shopId) {
      return;
    }

    setScheduleSaving(true);
    setActionError("");

    try {
      await updateBarberSchedule(user.uid, {
        shopId: user.shopId,
        days: schedule.days,
      });
      await loadData();
    } catch (error) {
      setActionError(error.message ?? "Failed to save schedule.");
    } finally {
      setScheduleSaving(false);
    }
  }

  function handleToggleService(serviceId) {
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              adopted: !service.adopted,
            }
          : service,
      ),
    );
  }

  async function handleSaveServices() {
    if (!user?.uid || !user?.shopId) {
      return;
    }

    setServicesSaving(true);
    setActionError("");

    try {
      await updateBarberServiceSelection({
        barberId: user.uid,
        shopId: user.shopId,
        serviceIds: services.filter((service) => service.adopted).map((service) => service.id),
      });
      await refreshUser();
      await loadData();
    } catch (error) {
      setActionError(error.message ?? "Failed to save services.");
    } finally {
      setServicesSaving(false);
    }
  }

  async function handleAddWalkIn() {
    if (!user?.uid || !user?.shopId || !walkInServiceId) {
      return;
    }

    const selectedService = services.find((service) => service.id === walkInServiceId && service.adopted);

    if (!selectedService) {
      setWalkInError("Choose a valid service for the walk-in booking.");
      return;
    }

    setActionLoading(true);
    setWalkInError("");

    try {
      await createWalkInBooking({
        barberId: user.uid,
        barberName: user.name || user.displayName || "Barber",
        shopId: user.shopId,
        shopName: user.shopName || "",
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        duration: selectedService.duration,
        price: selectedService.price,
        customerName: walkInName || "Walk-in",
        dateISO: walkInDateISO,
        time: walkInTime,
      });

      setWalkInOpen(false);
      setWalkInName("");
      setWalkInServiceId("");
      setWalkInDateISO(todayISO());
      setWalkInTime(new Date().toTimeString().slice(0, 5));
      await loadData();
    } catch (error) {
      setWalkInError(error.message ?? "Failed to add walk-in.");
    } finally {
      setActionLoading(false);
    }
  }

  const metrics = dashboard.metrics;

  return (
    <section className="container-xl py-8">
      <h1 className="text-3xl font-extrabold">Welcome back, {user?.name || user?.displayName || "Barber"}!</h1>
      <p className="mt-1 text-slate-600">
        {user?.status === "approved"
          ? `Manage appointments, walk-ins, and schedule for ${currentShopName}.`
          : "You can track and manage your shop approval request here."}
      </p>

      {actionError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}

      {user?.status !== "approved" ? (
        <div className="mt-6">
          <RequestPanel
            user={user}
            request={request}
            shops={shops}
            loading={loading}
            actionLoading={actionLoading}
            actionError={actionError}
            selectedShopId={selectedShopId}
            setSelectedShopId={setSelectedShopId}
            onUpdate={handleUpdateRequest}
            onCancel={handleCancelRequest}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={CalendarDays} label="Appointments Today" value={metrics.appointmentsToday} />
            <StatCard icon={CheckCircle2} label="Total Appointments" value={metrics.totalAppointments} />
            <StatCard icon={Users2} label="Total Customers" value={metrics.totalCustomers} />
            <StatCard icon={Star} label="Average Rating" value={metrics.averageRating ?? "-"} />
            <StatCard icon={DollarSign} label="Revenue" value={formatMoney(metrics.revenue)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card
              title="Appointments"
              right={
                <button onClick={() => setWalkInOpen(true)} className="btn btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Walk-in
                </button>
              }
            >
              {loading ? (
                <div className="text-slate-500">Loading appointments...</div>
              ) : dashboard.todaysBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
                  No appointments for today.
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.todaysBookings.map((booking) => (
                    <div key={booking.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 font-semibold text-amber-700">
                            {initials(booking.customerName || "Walk-in")}
                          </div>
                          <div>
                            <div className="font-medium">{booking.customerName || "Walk-in"}</div>
                            <div className="text-sm text-slate-600">{booking.serviceName}</div>
                            <div className="mt-1 inline-flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" /> {booking.time}
                              </span>
                              <span>{booking.isWalkIn ? "Walk-in" : "Booked customer"}</span>
                              <span>{formatMoney(booking.price)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:items-end">
                          <BookingStatusPill status={booking.status} />
                          <div className="flex flex-wrap gap-2">
                            {booking.status === BOOKING_STATUS.scheduled && (
                              <button
                                onClick={() => handleBookingStatus(booking.id, BOOKING_STATUS.checkedIn)}
                                disabled={actionLoading}
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                              >
                                Check-in
                              </button>
                            )}
                            {booking.status !== BOOKING_STATUS.completed && booking.status !== BOOKING_STATUS.noShow && (
                              <button
                                onClick={() => handleBookingStatus(booking.id, BOOKING_STATUS.completed)}
                                disabled={actionLoading}
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                              >
                                Complete
                              </button>
                            )}
                            {booking.status !== BOOKING_STATUS.noShow && booking.status !== BOOKING_STATUS.completed && (
                              <button
                                onClick={() => handleBookingStatus(booking.id, BOOKING_STATUS.noShow)}
                                disabled={actionLoading}
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
                              >
                                Mark no-show
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <ScheduleEditor
                schedule={schedule}
                onToggleDay={(day) =>
                  setSchedule((current) => ({
                    ...current,
                    days: {
                      ...current.days,
                      [day]: {
                        ...current.days[day],
                        enabled: !current.days[day].enabled,
                        breaks: current.days[day].enabled ? [] : current.days[day].breaks,
                      },
                    },
                  }))
                }
                onChangeDay={(day, field, value) =>
                  setSchedule((current) => ({
                    ...current,
                    days: {
                      ...current.days,
                      [day]: {
                        ...current.days[day],
                        [field]: value,
                      },
                    },
                  }))
                }
                onSave={handleSaveSchedule}
                saving={scheduleSaving}
              />

              <ServiceOfferingsEditor
                services={services}
                onToggle={handleToggleService}
                onSave={handleSaveServices}
                saving={servicesSaving}
              />

              <Card title="Shop Context" right={null}>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Shop</span>
                    <span className="font-medium text-slate-900">{currentShopName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <StatusBadge status={user?.status || "approved"} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Commission applied</span>
                    <span className="font-medium text-slate-900">
                      {dashboard.bookings[0]?.commission ? `${Math.round(Number(dashboard.bookings[0].commission) * 100)}%` : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Services adopted</span>
                    <span className="font-medium text-slate-900">{services.filter((service) => service.adopted).length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Modal
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title="Add walk-in"
        footer={
          <>
            <button onClick={() => setWalkInOpen(false)} className="btn btn-ghost">
              Close
            </button>
            <button onClick={handleAddWalkIn} disabled={!walkInServiceId || actionLoading} className="btn btn-primary disabled:opacity-50">
              {actionLoading ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Customer name</label>
            <input
              value={walkInName}
              onChange={(event) => setWalkInName(event.target.value)}
              placeholder="Walk-in"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Service</label>
            <select
              value={walkInServiceId}
              onChange={(event) => setWalkInServiceId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Choose a service</option>
              {services.filter((service) => service.adopted).map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({formatMoney(service.price)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              min={todayISO()}
              value={walkInDateISO}
              onChange={(event) => setWalkInDateISO(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Time</label>
            <input
              type="time"
              value={walkInTime}
              onChange={(event) => setWalkInTime(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {walkInError && <p className="text-sm text-red-600">{walkInError}</p>}
        </div>
      </Modal>
    </section>
  );
}
