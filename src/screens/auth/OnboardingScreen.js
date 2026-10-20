import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Animated,
  useColorScheme,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sun, CloudRain, Moon } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TYPE } from "../../theme/type";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
  {
    Icon: Sun,
    headline: "Your personal\nweather almanac",
    body: "Hourly forecasts, daily summaries, and real-feel conditions — all in one glance.",
  },
  {
    Icon: CloudRain,
    headline: "AI-powered\nweather chat",
    body: "Ask Almanac anything about today's forecast. It reads the same data you see on screen.",
  },
  {
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
  const isDark = useColorScheme() === "dark";

  const theme = {
    bg: isDark ? "#050B22" : "#F2F2F7",
    primary: isDark ? "rgba(255,255,255,0.98)" : "#1C1C1E",
    secondary: isDark ? "rgba(255,255,255,0.72)" : "#3A3A3C",
    tertiary: isDark ? "rgba(255,255,255,0.50)" : "#8E8E93",
    iconBg: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
    iconBorder: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.1)",
    dotActive: isDark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.8)",
    dotInactive: isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.2)",
    btnBg: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    btnBgPressed: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
    btnBorder: isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.1)",
    doneBtnBg: isDark ? "rgba(255,255,255,0.95)" : "#000000",
    doneBtnBgPressed: isDark ? "rgba(255,255,255,0.85)" : "#333333",
    doneBtnText: isDark ? "#0E1B44" : "#FFFFFF",
  };

  function handleScroll(e) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  }

  function goToSlide(idx) {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
  }

  // "Get Started" and "Skip" both end onboarding the same way.
  async function finish() {
    await markSeen();
    navigation.replace("Login");
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* App.js sets light-content globally for the dark weather screens; this
          is the one screen that can be light. */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Skip button */}
        {!isLast && (
          <Pressable
            onPress={finish}
            hitSlop={12}
            style={{ alignSelf: "flex-end", paddingHorizontal: 24, paddingTop: 12 }}
          >
            <Text style={{ ...TYPE.callout, color: theme.tertiary }}>Skip</Text>
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
            <Slide key={i} slide={slide} theme={theme} />
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
                    backgroundColor: i === activeIndex ? theme.dotActive : theme.dotInactive,
                  }}
                />
              </Pressable>
            ))}
          </View>

          {/* CTA */}
          {isLast ? (
            <Pressable
              onPress={finish}
              style={({ pressed }) => ({
                width: "100%",
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: pressed ? theme.doneBtnBgPressed : theme.doneBtnBg,
                alignItems: "center",
              })}
            >
              <Text
                style={{
                  ...TYPE.headline,
                  color: theme.doneBtnText,
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
                backgroundColor: pressed ? theme.btnBgPressed : theme.btnBg,
                borderWidth: 1,
                borderColor: theme.btnBorder,
                alignItems: "center",
              })}
            >
              <Text style={{ ...TYPE.headline, color: theme.primary }}>Next</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Slide({ slide, theme }) {
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
          backgroundColor: theme.iconBg,
          borderWidth: 1,
          borderColor: theme.iconBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={48} color={theme.primary} strokeWidth={1.5} />
      </View>

      <View style={{ gap: 12, alignItems: "center" }}>
        <Text
          style={{
            ...TYPE.display,
            color: theme.primary,
            textAlign: "center",
          }}
        >
          {headline}
        </Text>
        <Text
          style={{
            ...TYPE.body,
            color: theme.secondary,
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
