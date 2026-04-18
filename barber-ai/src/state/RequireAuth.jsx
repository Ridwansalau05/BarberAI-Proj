// src/state/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="container-xl py-10 text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    const fallback =
      user.role === "owner"
        ? "/dashboard/owner"
        : user.role === "barber"
          ? "/dashboard/barber"
          : "/dashboard/customer";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
