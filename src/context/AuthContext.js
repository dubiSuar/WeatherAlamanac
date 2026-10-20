import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  getAdditionalUserInfo,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { signInWithGoogle, signOutGoogle, googleErrorCode } from "../firebase/googleAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!auth) {
      // Bypass auth for static UI testing
      setUser({ uid: "static-demo", email: "demo@example.com", displayName: "Demo User" });
      setInitializing(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  async function register({ name, email, password }) {
    setAuthError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      // Store a user profile doc. A natural next step for students: sync
      // preferences (default city, units) here too.
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: name || "",
        email,
        createdAt: serverTimestamp(),
      });
      return cred.user;
    } catch (e) {
      setAuthError(mapFirebaseError(e));
      throw e;
    }
  }

  async function login({ email, password }) {
    setAuthError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (e) {
      setAuthError(mapFirebaseError(e));
      throw e;
    }
  }

  async function loginWithGoogle() {
    setAuthError("");
    try {
      const cred = await signInWithGoogle();
      // Upsert profile doc so Google users also have a users/{uid} record.
      // createdAt is written only on the first sign-in; merging it every time
      // would overwrite the real account creation date.
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser;
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          name: cred.user.displayName || "",
          email: cred.user.email || "",
          ...(isNewUser ? { createdAt: serverTimestamp() } : {}),
        },
        { merge: true }
      );
      return cred.user;
    } catch (e) {
      const code = googleErrorCode(e);
      // Closing the account picker is a choice, not a failure.
      if (code === "google/cancelled") return null;
      setAuthError(mapFirebaseError({ code }));
      throw e;
    }
  }

  async function logout() {
    await signOutGoogle();
    if (auth) await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, initializing, authError, setAuthError, register, login, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapFirebaseError(e) {
  const code = e?.code || "";
  if (code.includes("email-already-in-use")) return "That email is already registered.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "Incorrect email or password.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection.";
  if (code === "google/in-progress") return "Google sign-in is already open.";
  if (code === "google/no-play-services") return "Google Play services is unavailable on this device.";
  if (code === "google/not-configured")
    return "Google sign-in is not set up in this build. Use email and password instead.";
  if (code === "google/developer-error")
    return "Google sign-in is misconfigured for this build (signing key not registered in Firebase).";
  return "Something went wrong. Please try again.";
}
