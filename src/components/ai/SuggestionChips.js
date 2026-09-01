import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { TYPE, INK } from "../../theme/type";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/**
 * Suggestions are read off the forecast rather than hardcoded. A fixed list
 * ends up offering "will it rain?" on a cloudless afternoon, which tells the
 * user immediately that nothing here is paying attention. These fire on the
 * conditions that are actually present, and fall back to plain planning
 * questions when nothing stands out.
 */
export function suggestionsFor({ weather, now }) {
  if (!weather?.current) return [];
  const out = [];
  const c = weather.current;
  const hourly = weather.hourly || {};
  const times = hourly.time || [];

  let start = times.findIndex((t) => new Date(t) >= new Date((now || new Date()).getTime() - 30 * 60000));
  if (start < 0) start = 0;
  const next12 = (arr) => (arr || []).slice(start, start + 12);

  const rainChances = next12(hourly.precipitation_probability);
  const peakRain = Math.max(0, ...rainChances);
  const uvPeak = Math.max(0, ...next12(hourly.uv_index).map((v) => v ?? 0));
  const temps = next12(hourly.temperature_2m);
  const swing = temps.length ? Math.max(...temps) - Math.min(...temps) : 0;

  if (peakRain >= 45) out.push("When does the rain actually stop?");
  if (peakRain >= 25 && peakRain < 45) out.push("Do I need to take an umbrella?");
  if (uvPeak >= 6) out.push("How long can I be out before I burn?");
  if (c.wind_speed_10m >= 28) out.push("Is it too windy to cycle?");
  if (swing >= 7) out.push("Will I regret this jacket by 3pm?");
  if (c.apparent_temperature - c.temperature_2m >= 3)
    out.push("Why does it feel warmer than it is?");
  if (c.relative_humidity_2m >= 80 && c.temperature_2m >= 24)
    out.push("Is it going to stay this muggy?");
  if (c.is_day !== 1) out.push("What should I expect first thing tomorrow?");

  // Always-useful fillers, only if there's room.
  const fallback = [
    "Best two-hour window to be outside?",
    "Can I hang washing out today?",
    "How does the weekend look?",
  ];
  for (const f of fallback) {
    if (out.length >= 4) break;
    out.push(f);
  }

  return out.slice(0, 4);
}

function Chip({ label, index, onPress, reduced }) {
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      delay: index * 55, // waterfall rather than a simultaneous pop-in
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter, index, reduced]);

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { scale },
          {
            translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
          },
        ],
      }}
    >
      <Pressable
        // Feedback on press-in, not on release. Waiting for onPress to show
        // state is the single cheapest way to make a UI feel dead.
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 140, useNativeDriver: true }).start()
        }
        onPress={() => onPress(label)}
        hitSlop={8}
        style={{
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
          backgroundColor: "rgba(255,255,255,0.07)",
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderRadius: 16,
        }}
      >
        <Text style={{ ...TYPE.footnote, color: INK.secondary }}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SuggestionChips({ suggestions, onSelect }) {
  const reduced = useReducedMotion();
  if (!suggestions?.length) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {suggestions.map((s, i) => (
        <Chip key={s} label={s} index={i} onPress={onSelect} reduced={reduced} />
      ))}
    </View>
  );
}
