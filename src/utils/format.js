export const cToF = (c) => (c * 9) / 5 + 32;
export const kmhToMph = (k) => k * 0.621371;

export function localDateFromOffset(utcOffsetSeconds) {
  return new Date(Date.now() + utcOffsetSeconds * 1000);
}

export function formatDayLabel(date, idx) {
  if (idx === 0) return "Today";
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatHourLabel(date, idx) {
  if (idx === 0) return "Now";
  return date.toLocaleTimeString(undefined, { hour: "numeric" }).replace(" ", "");
}
