import React from "react";
import { View, Text, Pressable } from "react-native";
import { AlertCircle, X } from "lucide-react-native";
import { TYPE, INK } from "../../theme/type";
import { DANGER } from "../ui/Field";

/**
 * Semantic red, not the accent. The accent means "this is Almanac"; overloading
 * it onto failures would make both meaningless. Desaturated so it reads as a
 * problem rather than an alarm.
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 11,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(224,112,95,0.32)",
        backgroundColor: "rgba(224,112,95,0.13)",
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <AlertCircle size={15} color={DANGER} strokeWidth={2} style={{ marginTop: 2 }} />
      <Text style={{ ...TYPE.footnote, color: INK.primary, flex: 1 }}>{message}</Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <X size={14} color={INK.tertiary} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}
