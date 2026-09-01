import React, { memo, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { MapPin } from "lucide-react-native";
import { TYPE, INK } from "../../theme/type";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * The condition glyph, drifting.
 *
 * Isolated and memoised on purpose: this runs a continuous animation, and the
 * parent screen re-renders whenever the forecast polls or the unit changes.
 * Keeping the loop in its own leaf means those re-renders never restart it and
 * the loop never re-renders them.
 */
const FloatingGlyph = memo(function FloatingGlyph({ Icon }) {
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      drift.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduced]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
        ],
        opacity: 0.95,
      }}
    >
      <Icon size={104} color="#fff" strokeWidth={1.25} />
    </Animated.View>
  );
});

/**
 * Deliberately not centred. A centred column of location / icon / temperature
 * is the default every weather app lands on, and it wastes the left edge where
 * the eye starts. Text runs down the left, the glyph sits in the right margin
 * and overlaps the temperature's optical space, which gives the block a
 * diagonal to read along.
 */
function WeatherHero({
  location,
  now,
  theme,
  temp,
  feelsLike,
  high,
  low,
  tempUnitLabel,
  onToggleUnit,
}) {
  return (
    <View style={{ paddingTop: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <MapPin size={13} color={INK.secondary} strokeWidth={2} />
        <Text style={{ ...TYPE.footnote, color: INK.secondary, fontWeight: "600" }} numberOfLines={1}>
          {location.name}
          {location.admin1 ? `, ${location.admin1}` : ""}
        </Text>
      </View>

      {now && (
        <Text style={{ ...TYPE.caption, color: INK.quaternary, marginTop: 3 }}>
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          {"  ·  "}
          {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{ ...TYPE.hero, color: INK.primary }}>{temp}</Text>
            {/* The unit label is the unit control. A toggle in the header would
                be further from the number it changes and would need explaining;
                this needs none. */}
            <Pressable
              onPress={onToggleUnit}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel={`Showing ${tempUnitLabel}. Switch units.`}
              style={{
                marginTop: 14,
                marginLeft: 3,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ ...TYPE.headline, color: INK.secondary }}>{tempUnitLabel}</Text>
            </Pressable>
          </View>

          <Text style={{ ...TYPE.headline, color: INK.primary, marginTop: -4 }}>
            {theme.label}
          </Text>
          <Text style={{ ...TYPE.footnote, color: INK.tertiary, marginTop: 4 }}>
            Feels like {feelsLike}°
            {high != null && low != null ? `   ·   ${high}° / ${low}°` : ""}
          </Text>
        </View>

        <View style={{ marginTop: -6, marginRight: -6 }}>
          <FloatingGlyph Icon={theme.Icon} />
        </View>
      </View>
    </View>
  );
}

export default memo(WeatherHero);
