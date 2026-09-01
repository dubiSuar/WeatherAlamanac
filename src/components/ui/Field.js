import React, { useRef } from "react";
import { View, Text, TextInput, Pressable, Animated } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { TYPE, INK } from "../../theme/type";

const DANGER = "#E0705F"; // desaturated, sits on the night gradient without buzzing

/**
 * Label above the input, helper text under it, error text replacing the helper.
 *
 * The error slot is always in the tree rather than conditionally mounted — an
 * error that appears by inserting a line shoves every field below it down, and
 * on a four-field form that means the button moves out from under a thumb
 * that's already travelling toward it.
 */
export default function Field({
  label,
  value,
  onChangeText,
  error,
  helper,
  icon: Icon,
  secure,
  onToggleSecure,
  secureVisible,
  ...inputProps
}) {
  const focus = useRef(new Animated.Value(0)).current;

  const animateFocus = (to) =>
    Animated.timing(focus, { toValue: to, duration: 140, useNativeDriver: false }).start();

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ ...TYPE.caption, color: INK.secondary }}>{label}</Text>

      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          height: 50,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: error
            ? "rgba(224,112,95,0.65)"
            : focus.interpolate({
                inputRange: [0, 1],
                outputRange: ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.38)"],
              }),
          backgroundColor: "rgba(255,255,255,0.07)",
        }}
      >
        {Icon && <Icon size={16} color={INK.tertiary} strokeWidth={2} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => animateFocus(1)}
          onBlur={() => animateFocus(0)}
          placeholderTextColor={INK.quaternary}
          secureTextEntry={secure && !secureVisible}
          style={{ flex: 1, ...TYPE.callout, color: INK.primary }}
          {...inputProps}
        />
        {secure && (
          <Pressable
            onPress={onToggleSecure}
            hitSlop={10}
            accessibilityLabel={secureVisible ? "Hide password" : "Show password"}
          >
            {secureVisible ? (
              <EyeOff size={16} color={INK.tertiary} strokeWidth={2} />
            ) : (
              <Eye size={16} color={INK.tertiary} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </Animated.View>

      {/* Reserved space, so validating doesn't reflow the form. */}
      <View style={{ minHeight: 15 }}>
        {(error || helper) && (
          <Text style={{ ...TYPE.caption, color: error ? DANGER : INK.quaternary }}>
            {error || helper}
          </Text>
        )}
      </View>
    </View>
  );
}

export { DANGER };
