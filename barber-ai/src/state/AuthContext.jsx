import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../backend/firebase";
import { login as loginUser, logout as logoutUser, signup as signupUser } from "../backend/services/authService";
import { getUserProfile } from "../backend/services/userService";

const AuthCtx = createContext(null);

function normalizeUser(firebaseUser, profile) {
  if (!firebaseUser) {
    return null;
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
