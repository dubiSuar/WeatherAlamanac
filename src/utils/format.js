export const cToF = (c) => (c * 9) / 5 + 32;
export const kmhToMph = (k) => k * 0.621371;

/**
 * "Now" as a wall-clock time at the forecast location.
 *
 * Open-Meteo (with timezone=auto) returns times like "2026-10-10T14:00" in the
 * location's local time, with no offset, and `new Date()` parses those as
 * device-local. So every Date in the app is a location wall-clock time stored
 * as if it were device-local, and `now` has to follow the same convention or
 * comparisons and getHours() drift by the gap between the two time zones.
 *
 * Location UTC offset minus device UTC offset gives that shift. (A DST change
 * on the device in the next few hours can be off by an hour; fine here.)
 */
export function localDateFromOffset(utcOffsetSeconds) {
  const deviceOffsetMs = -new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() + utcOffsetSeconds * 1000 - deviceOffsetMs);
}

export function formatDayLabel(date, idx) {
  if (idx === 0) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatHourLabel(date, idx) {
  if (idx === 0) return "Now";
  return date.toLocaleTimeString(undefined, { hour: "numeric" }).replace(" ", "");
}
