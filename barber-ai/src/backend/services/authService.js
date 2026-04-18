import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { submitBarberRequest } from "./barberRequestService";
import { createShop, deleteShop } from "./shopService";
import { createUserProfile, getUserProfile, updateUserProfile } from "./userService";

function createFriendlyError(message) {
  const error = new Error(message);
  error.isFriendly = true;
  return error;
}

function mapAuthError(error, mode) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return createFriendlyError("An account with this email already exists.");
    case "auth/invalid-email":
      return createFriendlyError("Enter a valid email address.");
    case "auth/weak-password":
      return createFriendlyError("Password must be at least 6 characters long.");
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return createFriendlyError("Incorrect email or password.");
    case "auth/user-not-found":
      return createFriendlyError("No account was found for that email.");
    case "permission-denied":
      return createFriendlyError("Firestore blocked the signup request. Check your Firestore rules or test mode settings.");
    case "failed-precondition":
      return createFriendlyError("Firestore is not fully set up yet. Create the database first, then try again.");
    case "unavailable":
      return createFriendlyError("Firebase is temporarily unavailable. Try again in a moment.");
    default:
      return createFriendlyError(
        mode === "signup" ? "Unable to create your account right now." : "Unable to sign you in right now.",
      );
  }
}

export async function signup({ email, password, name, role, shopId = "", shopName = "", shopAddress = "" }) {
  let createdAuthUser = null;
  let createdShop = null;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    createdAuthUser = user;

    await updateProfile(user, { displayName: name });

    let nextProfile = {
      name,
      email,
      role,
      status: role === "barber" ? "pending" : "approved",
      shopId: shopId || "",
      shopName: "",
      ...(role === "barber" ? { serviceIds: [], specialties: [] } : {}),
    };

    if (role === "owner") {
      createdShop = await createShop({ name: shopName, ownerId: user.uid, address: shopAddress });
      nextProfile = {
        ...nextProfile,
        status: "approved",
        shopId: createdShop.id,
        shopName: createdShop.name,
      };
    }

    await createUserProfile(user.uid, nextProfile);

    if (role === "barber" && shopId) {
      await submitBarberRequest({ barberId: user.uid, shopId });
    }

    const profile = await getUserProfile(user.uid);

    return { user, profile };
  } catch (error) {
    if (createdShop?.id) {
      try {
        await deleteShop(createdShop.id);
      } catch {
        // Best-effort rollback for partial owner signup failures.
      }
    }

    if (createdAuthUser) {
      try {
        await deleteUser(createdAuthUser);
      } catch {
        // If rollback fails we still want to surface the original error.
      }
    }

    throw mapAuthError(error, "signup");
  }
}

export async function login({ email, password, expectedRole }) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    const profile = await getUserProfile(user.uid);

    if (expectedRole && profile?.role && profile.role !== expectedRole) {
      await signOut(auth);
      throw createFriendlyError(
        `These credentials belong to a ${profile.role} account. Switch to the ${profile.role} tab to continue.`,
      );
    }

    return { user, profile };
  } catch (error) {
    if (error?.isFriendly) {
      throw error;
    }

    throw mapAuthError(error, "login");
  }
}

export async function refreshUserProfile(uid) {
  return getUserProfile(uid);
}

export async function assignOwnerShopName(uid, shopName) {
  await updateUserProfile(uid, { shopName });
}

export async function logout() {
  await signOut(auth);
}
