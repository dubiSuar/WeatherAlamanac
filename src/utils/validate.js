/**
 * Validation messages say what to do, not what went wrong. "Enter a valid
 * email" tells someone their input failed; "This needs an @" tells them how to
 * fix it, which is the only reason to show the message at all.
 */

// Deliberately loose. Strict RFC-shaped regexes reject real addresses, and the
// server is the actual authority — this is here to catch typos before a
// round trip, not to be the gatekeeper.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!email.includes("@")) return "This needs an @.";
  if (!EMAIL.test(email)) return "That doesn't look like a complete address.";
  return null;
}

export function validatePassword(value, { isNew = false } = {}) {
  if (!value) return "Enter your password.";
  // Firebase rejects under 6 itself, but only after a network round trip.
  if (isNew && value.length < 6) return `${6 - value.length} more character${
    6 - value.length === 1 ? "" : "s"
  } needed.`;
  return null;
}

export function validateName(value) {
  if (!value.trim()) return "Enter a name so we know what to call you.";
  return null;
}

export function validateConfirm(password, confirm) {
  if (!confirm) return "Type the password once more.";
  if (password !== confirm) return "These two don't match.";
  return null;
}

/** Strips null entries so callers can test with a simple key count. */
export function collect(candidates) {
  return Object.fromEntries(Object.entries(candidates).filter(([, v]) => v));
}
