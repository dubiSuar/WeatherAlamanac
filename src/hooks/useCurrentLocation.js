import { useState } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { fetchWithTimeout } from "../utils/http";

// Configured once at module load. `auto` lets iOS pick the native
// CLLocationManager path and keeps requestAuthorization working.
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: "whenInUse",
  locationProvider: "auto",
});

const PERMISSION = "PERMISSION";

/**
 * The two platforms disagree about who asks for permission.
 *
 * Android needs an explicit PermissionsAndroid request before any location call
 * — calling getCurrentPosition first just fails with a permission error you
 * then have to translate. iOS handles it inside requestAuthorization, driven by
 * the NSLocationWhenInUseUsageDescription string in Info.plist; if that key is
 * missing the prompt never appears and the call silently fails, which is the
 * single most common "location is broken" cause in bare RN.
 */
async function ensurePermission() {
  if (Platform.OS === "android") {
    // Ask for both: since Android 12 the user can pick "Approximate", which
    // grants COARSE only. That is plenty for a weather grid cell, so either
    // grant counts.
    const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION } = PermissionsAndroid.PERMISSIONS;
    const result = await PermissionsAndroid.requestMultiple([
      ACCESS_FINE_LOCATION,
      ACCESS_COARSE_LOCATION,
    ]);
    const granted = [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION].some(
      (p) => result[p] === PermissionsAndroid.RESULTS.GRANTED
    );
    if (!granted) {
      throw Object.assign(new Error("permission"), { friendly: PERMISSION });
    }
    return;
  }

  await new Promise((resolve, reject) => {
    Geolocation.requestAuthorization(
      () => resolve(),
      () => reject(Object.assign(new Error("permission"), { friendly: PERMISSION }))
    );
  });
}

/** Promise wrapper — the module is callback-only. */
function getPosition() {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, // coarse is plenty for a weather grid cell
      timeout: 15000,
      maximumAge: 10 * 60 * 1000, // a ten-minute-old fix is fine here
    });
  });
}

export function useCurrentLocation() {
  const [locating, setLocating] = useState(false);

  async function getCurrentLocation() {
    setLocating(true);
    try {
      await ensurePermission();
      const pos = await getPosition();
      const { latitude, longitude } = pos.coords;

      let name = "Current location";
      let admin1 = "";
      let country = "";
      try {
        const res = await fetchWithTimeout(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        name = data.city || data.locality || "Current location";
        admin1 = data.principalSubdivision || "";
        country = data.countryName || "";
      } catch {
        // Best-effort reverse geocode. Coordinates are what we actually need,
        // so a failure here degrades the label, not the forecast.
      }

      return { name, admin1, country, latitude, longitude };
    } finally {
      setLocating(false);
    }
  }

  return { getCurrentLocation, locating };
}
