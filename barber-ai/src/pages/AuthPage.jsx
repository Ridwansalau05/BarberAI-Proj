import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, MapPin, Store, UserRoundCog } from "lucide-react";
import { listShops } from "../backend/services/shopService";
import { useAuth } from "../state/AuthContext";

function getDashboardPath(role) {
  if (role === "owner") {
    return "/dashboard/owner";
  }

  return role === "barber" ? "/dashboard/barber" : "/dashboard/customer";
}

export default function AuthPage({ mode = "login" }) {
  const isLogin = mode === "login";
  const [role, setRole] = useState("customer");
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();

  const title = isLogin ? "Welcome Back" : "Create your account";
  const cta = isLogin ? "Sign In" : "Create Account";
  const switchText = isLogin ? (
    <>
      Don&apos;t have an account?{" "}
      <Link to="/signup" className="text-brand-gold hover:underline">
        Sign up here
      </Link>
    </>
  ) : (
    <>
      Already have an account?{" "}
      <Link to="/login" className="text-brand-gold hover:underline">
        Sign in here
      </Link>
    </>
  );

  useEffect(() => {
    if (isLogin) {
      return;
    }

    let cancelled = false;

    async function loadShops() {
      setShopsLoading(true);
      try {
        const data = await listShops();
        if (!cancelled) {
          setShops(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message ?? "Failed to load shops.");
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
  }, [isLogin]);

  const roleDescription = useMemo(() => {
    if (role === "owner") {
      return "Owners create shops and approve barber access.";
    }

    if (role === "barber") {
      return "Barbers request access to a shop and wait for approval.";
    }

    return "Customers can book appointments and manage visits.";
  }, [role]);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const name = formData.get("fullName")?.toString().trim() ?? "";
    const shopId = formData.get("shopId")?.toString() ?? "";
    const shopName = formData.get("shopName")?.toString().trim() ?? "";
    const shopAddress = formData.get("shopAddress")?.toString().trim() ?? "";

    if (!isLogin && role === "barber" && !shopId) {
      setSubmitting(false);
      setError("Select a shop before creating a barber account.");
      return;
    }

    if (!isLogin && role === "owner" && !shopName) {
      setSubmitting(false);
      setError("Enter a shop name before creating an owner account.");
      return;
    }

    try {
      const authenticatedUser = isLogin
        ? await login({ email, password, expectedRole: role })
        : await signup({ email, password, name, role, shopId, shopName, shopAddress });

      const defaultPath = getDashboardPath(authenticatedUser?.role ?? role);
      const from = location.state?.from?.pathname;
      const nextPath = from && from !== "/login" && from !== "/signup" ? from : defaultPath;
      navigate(nextPath, { replace: true });
    } catch (authError) {
      setError(authError.message ?? "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-brand-dark via-brand-mid to-brand-dark py-10">
      <div className="container-xl">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-soft [color-scheme:light] sm:p-10">
          <h1 className="text-center text-3xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-2 text-center text-slate-600">
            {isLogin ? "Choose the correct role before signing in." : roleDescription}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {["customer", "barber", "owner"].map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                onClick={() => setRole(roleOption)}
                className={`rounded-2xl px-4 py-3 font-semibold capitalize transition ${
                  role === roleOption ? "bg-brand-gold text-slate-900 shadow-soft" : "bg-slate-200 text-slate-700"
                }`}
              >
                {roleOption}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            {!isLogin && (
              <>
                <label className="block text-sm font-medium text-slate-700">Full name</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <UserRoundCog className="h-5 w-5" />
                  </span>
                  <input
                    name="fullName"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-brand-gold"
                    placeholder={role === "owner" ? "Owner name" : role === "barber" ? "Barber name" : "Your name"}
                    required
                  />
                </div>
              </>
            )}

            <label className="block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-brand-gold"
                placeholder="Enter your email"
              />
            </div>

            <label className="block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-brand-gold"
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && role === "barber" && (
              <>
                <label className="block text-sm font-medium text-slate-700">Select shop</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <Store className="h-5 w-5" />
                  </span>
                  <select
                    name="shopId"
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-brand-gold"
                    required
                  >
                    <option value="" disabled>
                      {shopsLoading ? "Loading shops..." : "Choose a shop"}
                    </option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {!isLogin && role === "owner" && (
              <>
                <label className="block text-sm font-medium text-slate-700">Shop name</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <Store className="h-5 w-5" />
                  </span>
                  <input
                    name="shopName"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-brand-gold"
                    placeholder="Your barbershop name"
                    required
                  />
                </div>

                <label className="block text-sm font-medium text-slate-700">Shop address (optional)</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <input
                    name="shopAddress"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-brand-gold"
                    placeholder="Shop address"
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn btn-primary mt-4 w-full" disabled={submitting}>
              {submitting ? "Please wait..." : cta}
            </button>
          </form>

          {!isLogin && role === "barber" && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Barber accounts stay pending until the shop owner approves the request.
            </p>
          )}

          <p className="mt-6 text-center text-slate-600">{switchText}</p>
        </div>
      </div>
    </div>
  );
}
