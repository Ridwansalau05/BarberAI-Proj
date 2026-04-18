import { Link, NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext";

const linkCls =
  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-slate-200 transition hover:bg-white/5 hover:text-white";

const activeCls = "bg-white/10 text-white";

function getInitials(name) {
  return (name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDashboardPath(role) {
  if (role === "owner") {
    return "/dashboard/owner";
  }

  if (role === "barber") {
    return "/dashboard/barber";
  }

  return "/dashboard/customer";
}

export default function OtherNav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dashboardPath = getDashboardPath(user?.role);
  const displayName = user?.name || user?.displayName || user?.email || "User";
  const initials = getInitials(displayName);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const link =
    "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition";
  const active = "bg-white/10 text-white";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#121F2F]/95 backdrop-blur">
      <div className="container-xl flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl text-amber-500">✂</span>
          <span className="text-lg font-semibold text-white">BarberAI</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to={dashboardPath} className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>

          {user?.role === "customer" && (
            <NavLink to="/book" className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}>
              <CalendarDays className="h-4 w-4" />
              Appointments
            </NavLink>
          )}

          {user?.role === "owner" && (
            <NavLink to="/dashboard/owner" className={({ isActive }) => `${linkCls} ${isActive ? activeCls : ""}`}>
              <ShieldCheck className="h-4 w-4" />
              Approvals
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className={`${link} !text-red-300 hover:!text-white`}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <div className="ml-3 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 font-semibold">{initials}</div>
            <div className="hidden text-right sm:block">
              <div className="max-w-[10rem] truncate text-sm font-medium">{displayName}</div>
              <div className="text-xs uppercase tracking-wide text-slate-300">{user?.role || "member"}</div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
