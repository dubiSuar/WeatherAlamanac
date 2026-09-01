import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "weather.prefs.v1";

const DEFAULTS = {
  unit: "metric", // 'metric' | 'imperial'
  lastLocation: null,
  savedLocations: [],
};

const sameSpot = (a, b) =>
  a && b && Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01;

/**
 * Preferences live in AsyncStorage so the app opens on the city you were last
 * looking at, in the unit you last chose, instead of resetting to Tokyo in
 * Celsius every launch.
 *
 * Consumed once by PreferencesProvider — screens import `usePreferences` from
 * context/PreferencesContext, not this file.
 *
 * `ready` matters: the first render happens before storage resolves, and
 * rendering the default city for one frame and then swapping produces a visible
 * flash plus a wasted forecast request. Callers hold off until ready.
 */
export function usePreferencesStore() {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {
        // Corrupt or unreadable store: fall back to defaults rather than
        // blocking the app on a preference.
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Persist on change, but never write the defaults back over stored values
  // before hydration has finished.
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs]);

  const setUnit = useCallback((unit) => setPrefs((p) => ({ ...p, unit })), []);

  const setLastLocation = useCallback(
    (loc) => setPrefs((p) => ({ ...p, lastLocation: loc })),
    []
  );

  const toggleSaved = useCallback((loc) => {
    setPrefs((p) => {
      const exists = p.savedLocations.some((s) => sameSpot(s, loc));
      return {
        ...p,
        savedLocations: exists
          ? p.savedLocations.filter((s) => !sameSpot(s, loc))
          : [...p.savedLocations, loc].slice(-12),
      };
    });
  }, []);

  const isSaved = useCallback(
    (loc) => prefs.savedLocations.some((s) => sameSpot(s, loc)),
    [prefs.savedLocations]
  );

  return { prefs, ready, setUnit, setLastLocation, toggleSaved, isSaved };
}
