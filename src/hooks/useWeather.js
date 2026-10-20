import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { localDateFromOffset } from "../utils/format";
import { fetchWithTimeout } from "../utils/http";

// Refetch on return to the foreground once the forecast is this old.
const STALE_AFTER_MS = 20 * 60 * 1000;

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "cloud_cover",
  "surface_pressure",
  "precipitation",
];

const HOURLY_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "weather_code",
  "precipitation_probability",
  "uv_index",
  "wind_speed_10m",
];

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "uv_index_max",
  "precipitation_probability_max",
  "precipitation_sum",
  "sunrise",
  "sunset",
];

function forecastUrl(loc) {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current: CURRENT_FIELDS.join(","),
    hourly: HOURLY_FIELDS.join(","),
    daily: DAILY_FIELDS.join(","),
    timezone: "auto",
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function useWeather(location) {
  const [weather, setWeather] = useState(null);
  const [now, setNow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  // Guards against a slow request for a previous city landing after a newer
  // one and overwriting the screen with stale weather.
  const requestId = useRef(0);
  const fetchedAt = useRef(0);

  const fetchWeather = useCallback(async (loc, { silent = false } = {}) => {
    const id = ++requestId.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout(forecastUrl(loc));
      if (!res.ok) throw new Error("network");
      const data = await res.json();
      if (!data.current) throw new Error("shape");
      if (id !== requestId.current) return;
      setWeather(data);
      fetchedAt.current = Date.now();
      setNow(localDateFromOffset(data.utc_offset_seconds));
    } catch {
      if (id !== requestId.current) return;
      setError("Couldn't reach the weather service. Check your connection and try again.");
      if (!silent) setWeather(null);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (location) fetchWeather(location);
  }, [location, fetchWeather]);

  useEffect(() => {
    if (!weather) return;
    const id = setInterval(
      () => setNow(localDateFromOffset(weather.utc_offset_seconds)),
      30000
    );
    return () => clearInterval(id);
  }, [weather]);

  // Nothing polls while the app is open, so a phone left in a pocket for a few
  // hours would come back to an old forecast. Refresh quietly when the app
  // returns to the foreground with stale data.
  useEffect(() => {
    if (!location) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - fetchedAt.current > STALE_AFTER_MS) {
        fetchWeather(location, { silent: true });
      }
    });
    return () => sub.remove();
  }, [location, fetchWeather]);

  const refetch = useCallback(
    (opts) => location && fetchWeather(location, opts),
    [location, fetchWeather]
  );

  return { weather, now, loading, refreshing, error, setError, refetch };
}
