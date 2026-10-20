import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "./config";
import { GOOGLE_WEB_CLIENT_ID } from "../config/env";

// This must be the OAuth "Web client" ID from Google Cloud Console (Firebase
// creates it when you enable Google sign-in), not the iOS or Android client id.
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

/**
 * Runs the native Google sign-in flow, then signs the resulting
 * credential into Firebase Auth. Returns the Firebase UserCredential.
 */
export async function signInWithGoogle() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw Object.assign(new Error("GOOGLE_WEB_CLIENT_ID is not set in .env"), {
      code: "google/not-configured",
    });
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== "success") {
    // The user closed the account picker. Not an error worth showing.
    throw Object.assign(new Error("Google sign-in cancelled"), { code: "google/cancelled" });
  }
  const { idToken } = response.data;
  if (!idToken) {
    throw Object.assign(new Error("Google returned no idToken"), { code: "google/not-configured" });
  }
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // user may not have signed in via Google - safe to ignore
  }
}

/**
 * Google Sign-In reports problems with its own status codes rather than
 * Firebase ones. Translate the ones a user (or a student setting this up) can
 * act on. DEVELOPER_ERROR almost always means the signing SHA-1 of this APK is
 * not registered in Firebase: the classic "works in debug, fails in release".
 */
export function googleErrorCode(e) {
  if (e?.code === statusCodes.SIGN_IN_CANCELLED) return "google/cancelled";
  if (e?.code === statusCodes.IN_PROGRESS) return "google/in-progress";
  if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return "google/no-play-services";
  if (String(e?.code) === "10" || /DEVELOPER_ERROR/.test(e?.message || "")) {
    return "google/developer-error";
  }
  return e?.code || "";
}
