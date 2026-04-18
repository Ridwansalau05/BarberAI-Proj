import React from "react";
import { CheckCircle2, Clock3, Pencil, Plus, Settings, Store, Trash2, UserRoundX, Users } from "lucide-react";
import { approveBarberRequest, getPendingBarberRequestsByShop, rejectBarberRequest } from "../backend/services/barberRequestService";
import { listBookingsByShop } from "../backend/services/bookingService";
import { getAverageRatingForBarber } from "../backend/services/feedbackService";
import { createService, deleteService, listServicesByShop, updateService } from "../backend/services/serviceService";
import { DEFAULT_SHOP_HOURS, getShop, updateShop } from "../backend/services/shopService";
import { listBarbersByShop, updateUserProfile } from "../backend/services/userService";
import { useAuth } from "../state/AuthContext";

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const EMPTY_SERVICE_FORM = {
  name: "",
  description: "",
  price: "",
  duration: "",
};

function normalizeShopData(shop) {
  if (!shop) {
    return null;
  }

  return {
    ...shop,
    commissionRate: shop.commissionRate ?? 0.7,
    shopHours: {
      ...DEFAULT_SHOP_HOURS,
      ...(shop.shopHours || {}),
    },
  };
}

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

function DayHoursEditor({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="09:00-18:00 or Closed"
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}

export default function DashboardOwner() {
  const { user } = useAuth();
  const [requests, setRequests] = React.useState([]);
  const [barbers, setBarbers] = React.useState([]);
  const [shop, setShop] = React.useState(null);
  const [services, setServices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionId, setActionId] = React.useState("");
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [serviceForm, setServiceForm] = React.useState(EMPTY_SERVICE_FORM);
  const [editingServiceId, setEditingServiceId] = React.useState("");
  const [serviceSaving, setServiceSaving] = React.useState(false);
  const [serviceActionId, setServiceActionId] = React.useState("");

  const loadData = React.useCallback(async () => {
    if (!user?.shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [requestData, barberData, shopData, bookings, serviceData] = await Promise.all([
        getPendingBarberRequestsByShop(user.shopId),
        listBarbersByShop(user.shopId),
        getShop(user.shopId),
        listBookingsByShop(user.shopId),
        listServicesByShop(user.shopId),
      ]);

      const enhancedBarbers = await Promise.all(
        barberData.map(async (barber) => {
          const barberBookings = bookings.filter((booking) => booking.barberId === barber.id);
          const revenue = barberBookings.reduce((sum, booking) => {
            if (booking.status !== "completed") {
              return sum;
            }

            return sum + Number(booking.price || 0) * Number(booking.commission || shopData?.commissionRate || 0.7);
          }, 0);

          const rating = await getAverageRatingForBarber(barber.id, user.shopId);

          return {
            ...barber,
            revenue,
            rating,
          };
        }),
      );

      setRequests(requestData);
      setBarbers(enhancedBarbers);
      setShop(normalizeShopData(shopData));
      setServices(serviceData);
    } catch (loadError) {
      if (loadError?.code === "permission-denied") {
        setError("Firestore rules are blocking owner access to shop data. Update your Firestore rules for owners.");
      } else {
        setError(loadError.message ?? "Failed to load owner dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.shopId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(requestId) {
    setActionId(requestId);
    try {
      await approveBarberRequest(requestId, user.uid);
      await loadData();
    } catch (actionError) {
      setError(actionError.message ?? "Failed to approve barber.");
    } finally {
      setActionId("");
    }
  }

  async function handleReject(requestId) {
    setActionId(requestId);
    try {
      await rejectBarberRequest(requestId, user.uid);
      await loadData();
    } catch (actionError) {
      setError(actionError.message ?? "Failed to reject barber.");
    } finally {
      setActionId("");
    }
  }

  async function handleFireBarber(barberId) {
    setActionId(barberId);
    try {
      await updateUserProfile(barberId, {
        shopId: "",
        shopName: "",
        status: "unassigned",
        serviceIds: [],
        specialties: [],
      });
      await loadData();
    } catch (actionError) {
      setError(actionError.message ?? "Failed to remove barber from shop.");
    } finally {
      setActionId("");
    }
  }

  async function handleSaveShopSettings() {
    if (!shop?.id) {
      return;
    }

    setSettingsSaving(true);
    setError("");

    try {
      await updateShop(shop.id, {
        commissionRate: Number(shop.commissionRate || 0.7),
        shopHours: {
          ...DEFAULT_SHOP_HOURS,
          ...(shop.shopHours || {}),
        },
      });
      await loadData();
    } catch (saveError) {
      setError(saveError.message ?? "Failed to save shop settings.");
    } finally {
      setSettingsSaving(false);
    }
  }

  function resetServiceForm() {
    setEditingServiceId("");
    setServiceForm(EMPTY_SERVICE_FORM);
  }

  function handleEditService(service) {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      duration: String(service.duration ?? ""),
    });
  }

  async function handleSaveService() {
    if (!user?.shopId) {
      return;
    }

    if (!serviceForm.name.trim()) {
      setError("Service name is required.");
      return;
    }

    setServiceSaving(true);
    setError("");

    try {
      const payload = {
        shopId: user.shopId,
        name: serviceForm.name,
        description: serviceForm.description,
        price: serviceForm.price,
        duration: serviceForm.duration,
      };

      if (editingServiceId) {
        await updateService(editingServiceId, payload);
      } else {
        await createService(payload);
      }

      resetServiceForm();
      await loadData();
    } catch (saveError) {
      setError(saveError.message ?? "Failed to save service.");
    } finally {
      setServiceSaving(false);
    }
  }

  async function handleDeleteService(serviceId) {
    setServiceActionId(serviceId);
    setError("");

    try {
      await deleteService(serviceId);
      if (editingServiceId === serviceId) {
        resetServiceForm();
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message ?? "Failed to delete service.");
    } finally {
      setServiceActionId("");
    }
  }

  return (
    <section className="container-xl py-8">
      <h1 className="text-3xl font-extrabold">Welcome back, {user?.name || "Owner"}!</h1>
      <p className="mt-1 text-slate-600">
        Manage barbers, requests, commission, and hours for {user?.shopName || "your shop"}.
      </p>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Shop" value={shop?.name || user?.shopName || "-"} />
        <StatCard icon={Clock3} label="Pending Requests" value={requests.length} />
        <StatCard icon={Users} label="Barbers in Shop" value={barbers.length} />
        <StatCard icon={CheckCircle2} label="Commission" value={`${Math.round(Number(shop?.commissionRate || 0.7) * 100)}%`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card title="Barbers in Shop" right={null}>
          {loading ? (
            <div className="text-slate-500">Loading barbers...</div>
          ) : barbers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
              No barbers are assigned to this shop yet.
            </div>
          ) : (
            <div className="space-y-3">
              {barbers.map((barber) => (
                <div key={barber.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{barber.name}</div>
                    <div className="text-sm text-slate-600">{barber.email}</div>
                    <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Status: {barber.status}</span>
                      <span>Rating: {barber.rating ?? "-"}</span>
                      <span>Revenue: {formatMoney(barber.revenue)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleFireBarber(barber.id)}
                    disabled={actionId === barber.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <UserRoundX className="h-4 w-4" /> Fire barber
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Shop Settings" right={<Settings className="h-4 w-4 text-slate-400" />}>
          {shop ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Commission rate</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={shop.commissionRate ?? 0.7}
                  onChange={(event) =>
                    setShop((current) => ({
                      ...current,
                      commissionRate: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid gap-3">
                {Object.entries({
                  ...DEFAULT_SHOP_HOURS,
                  ...(shop.shopHours || {}),
                }).map(([day, hours]) => (
                  <DayHoursEditor
                    key={day}
                    label={day}
                    value={hours}
                    onChange={(value) =>
                      setShop((current) =>
                        normalizeShopData({
                          ...current,
                          shopHours: {
                            ...(current?.shopHours || {}),
                            [day]: value,
                          },
                        }),
                      )
                    }
                  />
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveShopSettings} disabled={settingsSaving} className="btn btn-primary disabled:opacity-50">
                  {settingsSaving ? "Saving..." : "Save settings"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">Loading shop settings...</div>
          )}
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold">Pending Barber Requests</div>
        {loading && <div className="mt-4 text-slate-500">Loading requests...</div>}
        {!loading && requests.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
            No pending barber requests for this shop.
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div className="mt-4 space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold">{request.barber?.name || "Unnamed barber"}</div>
                  <div className="text-sm text-slate-600">{request.barber?.email}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">Status: {request.status}</div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={actionId === request.id}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {actionId === request.id ? "Working..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={actionId === request.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <UserRoundX className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card
          title="Shop Services"
          right={
            <button onClick={resetServiceForm} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              <Plus className="h-4 w-4" /> New service
            </button>
          }
        >
          {loading ? (
            <div className="text-slate-500">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
              No services have been added for this shop yet.
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="mt-1 text-sm text-slate-600">{service.description || "No description provided."}</div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Price: {formatMoney(service.price)}</span>
                      <span>Duration: {service.duration} mins</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditService(service)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      disabled={serviceActionId === service.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={editingServiceId ? "Edit Service" : "Add Service"} right={null}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Service name</label>
              <input
                value={serviceForm.name}
                onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Skin Fade"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={serviceForm.description}
                onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                placeholder="Short service description"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Price</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={serviceForm.price}
                  onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="35"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Duration (mins)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={serviceForm.duration}
                  onChange={(event) => setServiceForm((current) => ({ ...current, duration: event.target.value }))}
                  placeholder="45"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {editingServiceId && (
                <button onClick={resetServiceForm} className="btn btn-ghost">
                  Cancel edit
                </button>
              )}
              <button onClick={handleSaveService} disabled={serviceSaving} className="btn btn-primary disabled:opacity-50">
                {serviceSaving ? "Saving..." : editingServiceId ? "Update service" : "Add service"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
