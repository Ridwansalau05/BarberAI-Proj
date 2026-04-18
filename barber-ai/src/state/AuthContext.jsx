import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../backend/firebase";
import { login as loginUser, logout as logoutUser, signup as signupUser } from "../backend/services/authService";
import { getUserProfile } from "../backend/services/userService";

const AuthCtx = createContext(null);

<<<<<<< HEAD
function normalizeUser(firebaseUser, profile) {
  if (!firebaseUser) {
    return null;
=======
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // restore on refresh
  useEffect(() => {
    const saved = localStorage.getItem("authUser");
    if (saved) setUser(JSON.parse(saved));
  }, []);
  // persist on change
  useEffect(() => {
    if (user) localStorage.setItem("authUser", JSON.stringify(user));
    else localStorage.removeItem("authUser");
  }, [user]);

  async function login({ email, role }) {
    // TODO: replace with real backend auth
    setUser({ id: crypto.randomUUID(), email, role }); // demo
>>>>>>> 524560b169670769cc9550be57233ec9bf3e3aac
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName ?? profile?.name ?? "",
    name: profile?.name ?? firebaseUser.displayName ?? "",
    role: profile?.role ?? "customer",
    status: profile?.status ?? "approved",
    shopId: profile?.shopId ?? "",
    shopName: profile?.shopName ?? "",
    profile,
    raw: firebaseUser,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser(firebaseUser = auth.currentUser) {
    if (!firebaseUser) {
      setUser(null);
      return null;
    }

    const profile = await getUserProfile(firebaseUser.uid);
    const normalizedUser = normalizeUser(firebaseUser, profile);
    setUser(normalizedUser);
    return normalizedUser;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      await refreshUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function login(credentials) {
    const { user: firebaseUser, profile } = await loginUser(credentials);
    const normalizedUser = normalizeUser(firebaseUser, profile);
    setUser(normalizedUser);
    return normalizedUser;
  }

  async function signup(payload) {
    const { user: firebaseUser, profile } = await signupUser(payload);
    const normalizedUser = normalizeUser(firebaseUser, profile);
    setUser(normalizedUser);
    return normalizedUser;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {!loading && children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
