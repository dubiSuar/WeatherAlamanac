import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG, FIREBASE_READY } from "../config/env";

if (__DEV__ && !FIREBASE_READY) {
  console.warn(
    "[Weather] Firebase config is missing. Copy .env.example to .env and fill " +
      "in the values from Firebase console -> Project settings -> Your apps."
  );
}

let app, authInstance, dbInstance;

if (FIREBASE_READY) {
  app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  // initializeAuth throws if called twice on the same app (e.g. on hot reload),
  // so fall back to getAuth which always returns the existing instance.
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
  dbInstance = getFirestore(app);
} else {
  // Mock implementations for static UI testing
  app = {};
  authInstance = null;
  dbInstance = null;
}

export const auth = authInstance;
export const db = dbInstance;
export default app;
