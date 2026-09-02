import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sun, CloudRain, Moon } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TYPE, INK } from "../../theme/type";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
  {
    colors: ["#1F6FD6", "#3E9BE0", "#7BC6E8", "#FCE2A0"],
    Icon: Sun,
    headline: "Your personal\nweather almanac",
    body: "Hourly forecasts, daily summaries, and real-feel conditions — all in one glance.",
  },
  {
    colors: ["#0A1420", "#16232F", "#28374A", "#1F3247"],
    Icon: CloudRain,
    headline: "AI-powered\nweather chat",
    body: "Ask Almanac anything about today's forecast. It reads the same data you see on screen.",
  },
  {
    colors: ["#050B22", "#0E1B44", "#1F2C63", "#3A2E63"],
    Icon: Moon,
    headline: "Built around\nyour location",
    body: "Automatic location detection or search any city in the world. Always up to date.",
  },
];

async function markSeen() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // non-fatal — worst case they see it again next launch
  }
}

export default function OnboardingScreen({ navigation }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  function handleScroll(e) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  }

  function goToSlide(idx) {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
  }

  async function handleDone() {
    await markSeen();
    navigation.replace("Login");
  }

  async function handleSkip() {
    await markSeen();
    navigation.replace("Login");
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={{ flex: 1 }}>
      {/* Background — always match the active slide's gradient */}
      {SLIDES.map((slide, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: scrollX.interpolate({
              inputRange: [
                (i - 1) * SCREEN_WIDTH,
                i * SCREEN_WIDTH,
                (i + 1) * SCREEN_WIDTH,
              ],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            }),
          }}
        >
          <LinearGradient colors={slide.colors} style={{ flex: 1 }} />
        </Animated.View>
      ))}

      <SafeAreaView style={{ flex: 1 }}>
        {/* Skip button */}
        {!isLast && (
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            style={{ alignSelf: "flex-end", paddingHorizontal: 24, paddingTop: 12 }}
          >
            <Text style={{ ...TYPE.callout, color: INK.tertiary }}>Skip</Text>
          </Pressable>
        )}
        {isLast && <View style={{ height: 44 }} />}

        {/* Slides */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true, listener: handleScroll }
          )}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <Slide key={i} slide={slide} />
          ))}
        </Animated.ScrollView>

        {/* Bottom controls */}
        <View
          style={{
            paddingHorizontal: 28,
            paddingBottom: 32,
            gap: 28,
            alignItems: "center",
          }}
        >
          {/* Dot indicator */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {SLIDES.map((_, i) => (
              <Pressable key={i} onPress={() => goToSlide(i)} hitSlop={8}>
                <View
                  style={{
                    width: i === activeIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i === activeIndex
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.30)",
                  }}
                />
              </Pressable>
            ))}
          </View>

          {/* CTA */}
          {isLast ? (
            <Pressable
              onPress={handleDone}
              style={({ pressed }) => ({
                width: "100%",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.95)",
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  ...TYPE.headline,
                  color: "#0E1B44",
                }}
              >
                Get Started
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goToSlide(activeIndex + 1)}
              style={({ pressed }) => ({
                width: "100%",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(255,255,255,0.12)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.20)",
                alignItems: "center",
              })}
            >
              <Text style={{ ...TYPE.headline, color: INK.primary }}>Next</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Slide({ slide }) {
  const { Icon, headline, body } = slide;
  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 36,
        gap: 24,
      }}
    >
      {/* Icon bubble */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={48} color="rgba(255,255,255,0.95)" strokeWidth={1.5} />
      </View>

      <View style={{ gap: 12, alignItems: "center" }}>
        <Text
          style={{
            ...TYPE.display,
            color: INK.primary,
            textAlign: "center",
          }}
        >
          {headline}
        </Text>
        <Text
          style={{
            ...TYPE.body,
            color: INK.secondary,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

// StyleSheet import is needed for absoluteFillObject
import { StyleSheet } from "react-native";
