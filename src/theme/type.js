/**
 * Typography and colour tokens.
 *
 * Two deliberate decisions:
 *
 * 1. No custom typeface. On a native app the platform font (SF on iOS, Roboto
 *    on Android) already ships optical sizing, per-size tracking tables and
 *    legibility tuning that a webfont drop-in throws away. We override the
 *    tracking ourselves because RN doesn't apply Apple's tracking tables to
 *    arbitrary sizes.
 *
 * 2. Tracking is size-specific, never one global value. Large text reads too
 *    loose as it grows, so it needs negative tracking; small caps-y labels need
 *    a positive bump to stay legible. A single letterSpacing is wrong somewhere.
 */

export const TYPE = {
  // 100pt+ numerals. Very tight, tabular so the temperature doesn't jitter
  // between 8 and 1 as it updates.
  hero: {
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: -5,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
  },
  display: { fontSize: 34, lineHeight: 38, letterSpacing: -0.8, fontWeight: "600" },
  title: { fontSize: 22, lineHeight: 27, letterSpacing: -0.35, fontWeight: "600" },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 23, letterSpacing: 0, fontWeight: "400" },
  callout: { fontSize: 15, lineHeight: 21, letterSpacing: 0, fontWeight: "400" },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0.05, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: "500" },
  // Section headers. Uppercase needs the most positive tracking of anything.
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  mono: { fontSize: 13, lineHeight: 18, fontVariant: ["tabular-nums"] },
};

/**
 * One accent, desaturated enough to sit on top of the blue/slate gradients
 * without screaming. Reserved for Almanac (the assistant) — nothing else in the
 * app gets to use it, so accent always means "this is the AI layer".
 */
export const ACCENT = "#E4854F";
export const ACCENT_DIM = "rgba(228,133,79,0.22)";

/**
 * Text over translucent material. Flat mid-grey dies over a blurred backdrop —
 * vibrancy means higher contrast and slightly more weight than you'd use on a
 * solid surface.
 */
export const INK = {
  primary: "rgba(255,255,255,0.98)",
  secondary: "rgba(255,255,255,0.72)",
  tertiary: "rgba(255,255,255,0.50)",
  quaternary: "rgba(255,255,255,0.34)",
  hairline: "rgba(255,255,255,0.14)",
};
