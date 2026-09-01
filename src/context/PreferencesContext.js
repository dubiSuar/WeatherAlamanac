import React, { createContext, useContext } from "react";
import { usePreferencesStore } from "../hooks/usePreferences";

/**
 * Preferences have to be a single shared instance, not a hook called per
 * screen. Two independent copies would each hold their own state, so changing
 * the unit in Settings wouldn't reach the weather screen, and both would write
 * the whole preferences blob to AsyncStorage on every change — last write
 * silently discarding the other's.
 */
const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const store = usePreferencesStore();
  return (
    <PreferencesContext.Provider value={store}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
