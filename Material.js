import React from "react";
import { View, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useReduceTransparency } from "../../hooks/useReducedMotion";

/**
 * Translucent surface. One place, three weights.
 *
 * Weight encodes hierarchy: heavier materials separate structural regions,
 * lighter ones sit closer to the content and draw the eye to something
 * interactive. Bigger surfaces also read as thicker, so `sheet` blurs harder
 * than `chrome` and `chrome` harder than `chip`.
 *
 * Three platform realities baked in:
 *
 * - Android's blur is inconsistent enough across OEM skins that it isn't worth
 *   the frame cost. It falls back to a flat translucent fill, which is why
 *   every weight also defines a background rather than relying on the blur.
 *
 * - Under Reduce Transparency the blur is dropped and the background goes
 *   near-opaque. The surface stays a distinct layer; it just stops depending on
 *   what's behind it.
 *
 * - @react-native-community/blur does NOT composite a background colour behind
 *   its own blur the way expo-blur does, so the tint is a sibling layer
 *   underneath rather than a style on the BlurView itself. Putting the colour on
 *   the BlurView washes the blur out on iOS.
 */
const WEIGHTS = {
  // Nav bars and floating headers. Content scrolls under.
  chrome: { blurAmount: 12, background: "rgba(9,13,22,0.42)", solid: "rgba(12,17,28,0.94)" },
  // Modal sheets. The heaviest surface in the app.
  sheet: { blurAmount: 24, background: "rgba(11,15,25,0.80)", solid: "rgba(13,18,29,0.99)" },
  // Small inline containers.
  chip: { blurAmount: 8, background: "rgba(255,255,255,0.10)", solid: "rgba(46,54,72,0.96)" },
};

export default function Material({
  weight = "chip",
  blurType = "dark",
  style,
  children,
  ...rest
}) {
  const opaque = useReduceTransparency();
  const spec = WEIGHTS[weight] ?? WEIGHTS.chip;

  if (Platform.OS === "ios" && !opaque) {
    return (
      <View style={style} {...rest}>
        <BlurView
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          blurType={blurType}
          blurAmount={spec.blurAmount}
          // Only used if the OS falls back off the blur (older devices,
          // low power mode); without it those devices render nothing.
          reducedTransparencyFallbackColor={spec.solid}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: spec.background,
          }}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      style={[{ backgroundColor: opaque ? spec.solid : spec.background }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
