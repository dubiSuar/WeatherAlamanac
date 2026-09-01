import React, { useRef } from "react";
import { Pressable, Text, ActivityIndicator, Animated, View } from "react-native";
import { TYPE, INK } from "../../theme/type";
import { SPRINGS } from "../../theme/motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * Press feedback fires on pointer-down, not on release. Waiting for onPress to
 * show state is the cheapest way to make a button feel dead, and it's the one
 * latency users notice without being able to name.
 *
 * The scale springs back rather than easing — a physical button doesn't return
 * on a fixed timer.
 */
export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "solid",
  icon = null,
}) {
  const reduced = useReducedMotion();
  const press = useRef(new Animated.Value(0)).current;
  const isGhost = variant === "ghost";
  const inert = loading || disabled;

  const down = () => {
    if (reduced) return;
    Animated.spring(press, { toValue: 1, useNativeDriver: true, ...SPRINGS.quick }).start();
  };
  const up = () => {
    if (reduced) return;
    Animated.spring(press, { toValue: 0, useNativeDriver: true, ...SPRINGS.quick }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [
          { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) },
        ],
        opacity: inert ? 0.55 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(inert), busy: Boolean(loading) }}
        onPressIn={down}
        onPressOut={up}
        onPress={onPress}
        disabled={inert}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 52,
          borderRadius: 16,
          borderWidth: isGhost ? 1 : 0,
          borderColor: "rgba(255,255,255,0.20)",
          backgroundColor: isGhost ? "rgba(255,255,255,0.08)" : "#FFFFFF",
        }}
      >
        {loading ? (
          <ActivityIndicator color={isGhost ? "#fff" : "#101623"} />
        ) : (
          <>
            {icon}
            <Text
              style={{
                ...TYPE.callout,
                fontWeight: "600",
                color: isGhost ? INK.primary : "#101623",
              }}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Hairline "or" divider used between the primary and federated sign-in. */
export function OrDivider() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: INK.hairline }} />
      <Text style={{ ...TYPE.caption, color: INK.quaternary }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: INK.hairline }} />
    </View>
  );
}
