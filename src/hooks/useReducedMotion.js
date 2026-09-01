import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/**
 * Tracks the OS "Reduce Motion" setting, live.
 *
 * Reduced motion doesn't mean no feedback — it means no vestibular motion.
 * Components that read this should cross-fade instead of sliding, and drop
 * decorative loops entirely. Direct manipulation (a finger dragging a sheet)
 * stays 1:1 either way: that's the user moving the thing, not the interface
 * animating at them.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

/**
 * Tracks "Reduce Transparency". Translucent chrome should get frostier and
 * more solid rather than disappearing — the layer still needs to read as a
 * layer, it just stops relying on what's behind it for legibility.
 *
 * iOS only; Android has no equivalent setting, so it reports false there.
 */
export function useReduceTransparency() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((value) => {
      if (alive) setReduced(Boolean(value));
    });
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
