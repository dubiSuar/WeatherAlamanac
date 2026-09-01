import React, { memo, useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { RotateCcw, MessageCircle, AlertCircle, Settings2 } from "lucide-react-native";

import { TYPE, INK, ACCENT } from "../../theme/type";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * Skeleton that matches the shape of the text about to land in it — two full
 * lines and a short third — rather than a spinner. A spinner tells you to wait;
 * this tells you what's coming.
 *
 * Memoised and self-contained: the shimmer runs continuously, and if it lived
 * in the parent it would re-render the whole weather screen every frame.
 */
const Shimmer = memo(function Shimmer() {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      x.setValue(-1);
    };
  }, [x, reduced]);

  const Bar = ({ width }) => (
    <View
      style={{
        height: 13,
        width,
        borderRadius: 7,
        backgroundColor: "rgba(255,255,255,0.11)",
        overflow: "hidden",
      }}
    >
      {!reduced && (
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-240, 240],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.16)",
              "rgba(255,255,255,0)",
            ]}
            style={{ flex: 1, width: 160 }}
          />
        </Animated.View>
      )}
    </View>
  );

  return (
    <View style={{ gap: 9, paddingTop: 3 }}>
      <Bar width="94%" />
      <Bar width="100%" />
      <Bar width="58%" />
    </View>
  );
});

function Header({ children, right }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT }} />
        <Text style={{ ...TYPE.overline, color: INK.tertiary }}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

export default function BriefingPanel({ briefing, onAsk, onOpenSettings }) {
  const { headline, body, advisories, status, error, streaming, refresh } = briefing;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: INK.hairline,
        paddingTop: 16,
      }}
    >
      <Header
        right={
          status === "done" ? (
            <Pressable onPress={refresh} hitSlop={10} accessibilityLabel="Regenerate briefing">
              <RotateCcw size={13} color={INK.quaternary} strokeWidth={2} />
            </Pressable>
          ) : null
        }
      >
        Almanac
      </Header>

      {status === "unconfigured" && (
        <View style={{ gap: 12 }}>
          <Text style={{ ...TYPE.callout, color: INK.secondary }}>
            Almanac reads the forecast and answers questions about it. It needs a model
            endpoint before it can say anything.
          </Text>
          <Pressable
            onPress={onOpenSettings}
            hitSlop={6}
            style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
          >
            <Settings2 size={14} color={ACCENT} strokeWidth={2} />
            <Text style={{ ...TYPE.footnote, color: ACCENT, fontWeight: "600" }}>
              How to connect it
            </Text>
          </Pressable>
        </View>
      )}

      {status === "error" && (
        <View style={{ gap: 11 }}>
          <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}>
            <AlertCircle size={15} color={ACCENT} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={{ ...TYPE.callout, color: INK.secondary, flex: 1 }}>
              {error?.message || "Couldn't write the briefing."}
            </Text>
          </View>
          <Pressable onPress={refresh} hitSlop={8}>
            <Text style={{ ...TYPE.footnote, color: ACCENT, fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      )}

      {status === "streaming" && !headline && <Shimmer />}

      {(headline || (status === "done" && body)) && (
        <View style={{ gap: 10 }}>
          <Text style={{ ...TYPE.headline, color: INK.primary }}>{headline}</Text>
          {!!body && <Text style={{ ...TYPE.callout, color: INK.secondary }}>{body}</Text>}

          {advisories.length > 0 && (
            <View style={{ gap: 7, paddingTop: 2 }}>
              {advisories.map((a, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: ACCENT,
                      marginTop: 8,
                    }}
                  />
                  <Text style={{ ...TYPE.footnote, color: INK.secondary, flex: 1 }}>{a}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {status !== "unconfigured" && (
        <Pressable
          onPress={onAsk}
          disabled={streaming}
          hitSlop={6}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            marginTop: 14,
            opacity: streaming ? 0.4 : 1,
          }}
        >
          <MessageCircle size={14} color={ACCENT} strokeWidth={2} />
          <Text style={{ ...TYPE.footnote, color: ACCENT, fontWeight: "600" }}>
            Ask about the forecast
          </Text>
        </Pressable>
      )}
    </View>
  );
}
