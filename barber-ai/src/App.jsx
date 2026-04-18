import React from "react";
import { Outlet, Route, Routes } from "react-router-dom";

import Navbar from "./components/NavBar";
import OtherNav from "./components/OtherNav";
import BookingPage from "./pages/BookingPage";
import AuthPage from "./pages/AuthPage";
import DashboardBarber from "./pages/DashboardBarber";
import DashboardCustomer from "./pages/DashboardCustomer";
import DashboardOwner from "./pages/DashboardOwner";
import CTA from "./sections/CTA";
import Features from "./sections/Features";
import Hero from "./sections/Hero";
import Reviews from "./sections/Reviews";
import Stats from "./sections/Stats";
import { AuthProvider } from "./state/AuthContext";
import RequireAuth from "./state/RequireAuth";

function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <Stats />
      <Reviews />
      <CTA />
    </>
  );
}

function MainLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <Outlet />
    </div>
  );
}

function MinimalLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <OtherNav />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>

        <Route element={<MinimalLayout />}>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route
            path="/book"
            element={
              <RequireAuth role="customer">
                <BookingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/customer"
            element={
              <RequireAuth role="customer">
                <DashboardCustomer />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/barber"
            element={
              <RequireAuth role="barber">
                <DashboardBarber />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/owner"
            element={
              <RequireAuth role="owner">
                <DashboardOwner />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
