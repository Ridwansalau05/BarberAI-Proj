// src/state/RoleRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // your context with user

export default function RoleRoute({ allow = [], children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    // send them to their own dashboard if they hit the wrong page
    return <Navigate to={user.role === "barber" ? "/dashboard/barber" : "/dashboard/customer"} replace />;
  }
  return children;
}
