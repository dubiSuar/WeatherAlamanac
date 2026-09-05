import { GoogleSignin } from "@react-native-google-signin/google-signin";
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
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') {
    throw new Error('Google sign-in failed or was cancelled');
  }
  const { idToken } = response.data;
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
