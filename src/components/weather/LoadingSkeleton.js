import React, { memo, useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { INK } from "../../theme/type";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * Skeleton shaped like the screen it precedes: an asymmetric hero block with
 * the glyph on the right, a hairline metric grid, then the two forecast
 * sections. Generic grey rectangles would load just as fast and tell the user
 * nothing about what's arriving.
 */
const Block = memo(function Block({ width, height, radius = 10, delay = 0 }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, delay, reduced]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: "rgba(255,255,255,0.13)",
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }),
      }}
    />
  );
});

export default function LoadingSkeleton() {
  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 9 }}>
        <Block width={150} height={13} delay={0} />
        <Block width={190} height={11} delay={60} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 12 }}>
          <View style={{ flex: 1, gap: 12 }}>
            <Block width={168} height={78} radius={16} delay={120} />
            <Block width={120} height={15} delay={180} />
            <Block width={160} height={12} delay={240} />
          </View>
          <Block width={92} height={92} radius={46} delay={140} />
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: INK.hairline, paddingTop: 16, gap: 9 }}>
        <Block width="94%" height={13} delay={280} />
        <Block width="100%" height={13} delay={320} />
        <Block width="56%" height={13} delay={360} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: "50%",
              paddingVertical: 14,
              paddingLeft: i % 2 === 1 ? 16 : 0,
              borderTopWidth: 1,
              borderTopColor: INK.hairline,
              gap: 8,
            }}
          >
            <Block width={62} height={9} delay={380 + i * 40} />
            <Block width={78} height={22} delay={400 + i * 40} />
          </View>
        ))}
      </View>

      <Block width="100%" height={118} radius={16} delay={520} />
      <Block width="100%" height={210} radius={16} delay={580} />
    </View>
  );
}
