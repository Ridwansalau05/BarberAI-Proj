// Defensive Firebase bootstrap: gracefully handles missing SDK/package.
export let auth = null;
export let db = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

(async () => {
  try {
    if (!firebaseConfig?.projectId) return; // no env -> skip
    const appMod = await import(/* @vite-ignore */ "firebase/app");
    const authMod = await import(/* @vite-ignore */ "firebase/auth");
    const fsMod = await import(/* @vite-ignore */ "firebase/firestore");

    const app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = fsMod.getFirestore(app);
  } catch (_) {
    // SDK not installed or failed: keep nulls and allow fallbacks
  }
})();
