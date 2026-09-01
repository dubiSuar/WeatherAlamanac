import React, { memo, useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { TYPE, INK, ACCENT } from "../../theme/type";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * The caret that trails streaming text. Isolated and memoised so its blink
 * never re-renders the message list — a 1Hz interval in a parent would
 * re-render every bubble in the conversation once a second.
 */
const Caret = memo(function Caret() {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 480,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View
      style={{
        opacity,
        width: 2,
        height: 15,
        marginLeft: 3,
        marginBottom: -2,
        borderRadius: 1,
        backgroundColor: ACCENT,
      }}
    />
  );
});

/** Splits an answer into prose and "- " list items so lists get real indents. */
function segments(content) {
  return content.split("\n").reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("-");
    acc.push({ bullet: isBullet, text: isBullet ? trimmed.replace(/^-\s*/, "") : trimmed });
    return acc;
  }, []);
}

function ChatMessage({ message, streaming }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={{ alignItems: "flex-end", paddingLeft: 44 }}>
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.13)",
            borderColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            borderBottomRightRadius: 7,
          }}
        >
          <Text style={{ ...TYPE.callout, color: INK.primary }}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const parts = segments(message.content);
  const showCaret = streaming;

  // Pending with nothing streamed yet: three settling dots rather than a
  // spinner, so the shape matches the text that's about to replace it.
  if (!message.content) {
    return (
      <View style={{ paddingRight: 44 }}>
        <ThinkingDots />
      </View>
    );
  }

  return (
    <View style={{ paddingRight: 32, gap: 6 }}>
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        return (
          <View
            key={i}
            style={{ flexDirection: "row", gap: part.bullet ? 8 : 0, alignItems: "flex-start" }}
          >
            {part.bullet && (
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: ACCENT,
                  marginTop: 8,
                }}
              />
            )}
            <Text style={{ ...TYPE.body, color: INK.primary, flex: 1 }}>
              {part.text}
              {isLast && showCaret ? " " : ""}
            </Text>
            {isLast && showCaret && <Caret />}
          </View>
        );
      })}
    </View>
  );
}

const ThinkingDots = memo(function ThinkingDots() {
  const reduced = useReducedMotion();
  const dots = [useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current];

  useEffect(() => {
    if (reduced) {
      dots.forEach((d) => d.setValue(0.55));
      return;
    }
    const animations = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(d, { toValue: 1, duration: 340, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.25, duration: 340, useNativeDriver: true }),
          Animated.delay((2 - i) * 140),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <View style={{ flexDirection: "row", gap: 5, paddingVertical: 6 }}>
      {dots.map((opacity, i) => (
        <Animated.View
          key={i}
          style={{ opacity, width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }}
        />
      ))}
    </View>
  );
});

export default memo(ChatMessage);
