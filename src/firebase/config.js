import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
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
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
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
