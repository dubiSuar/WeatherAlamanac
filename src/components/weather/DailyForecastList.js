import React, { useMemo } from "react";
import { View, Text } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { Droplet } from "lucide-react-native";

import { getWeatherTheme } from "../../theme/weatherThemes";
import { formatDayLabel } from "../../utils/format";
import { TYPE, INK, ACCENT } from "../../theme/type";

const TRACK = 96;

/**
 * Each row's bar is positioned against the whole week's range, not its own, so
 * the bars line up into a shape you can read down the column — a cold snap on
 * Thursday shows as a bar that starts further left, which two bare numbers
 * never communicate.
 */
export default function DailyForecastList({ days, displayTemp }) {
  const { weekMin, weekSpan } = useMemo(() => {
    if (!days.length) return { weekMin: 0, weekSpan: 1 };
    const mins = days.map((d) => displayTemp(d.min));
    const maxs = days.map((d) => displayTemp(d.max));
    const lo = Math.min(...mins);
    const hi = Math.max(...maxs);
    return { weekMin: lo, weekSpan: Math.max(hi - lo, 1) };
  }, [days, displayTemp]);

  if (!days.length) return null;

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ ...TYPE.overline, color: INK.tertiary, marginBottom: 6 }}>
        Next 7 days
      </Text>

      {days.map((d, i) => {
        const theme = getWeatherTheme(d.code, true);
        const Icon = theme.Icon;
        const lo = displayTemp(d.min);
        const hi = displayTemp(d.max);
        const left = ((lo - weekMin) / weekSpan) * TRACK;
        const barWidth = Math.max(((hi - lo) / weekSpan) * TRACK, 6);
        const rain = d.precipProb;

        return (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 11,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: INK.hairline,
            }}
          >
            <Text
              style={{
                ...TYPE.callout,
                width: 46,
                color: i === 0 ? INK.primary : INK.secondary,
                fontWeight: i === 0 ? "600" : "400",
              }}
            >
              {formatDayLabel(d.date, i)}
            </Text>

            <View style={{ width: 30, alignItems: "center" }}>
              <Icon size={17} color={INK.secondary} strokeWidth={1.75} />
            </View>

            <View style={{ width: 42, flexDirection: "row", alignItems: "center", gap: 3 }}>
              {rain != null && rain >= 15 && (
                <>
                  <Droplet size={10} color="#9AC8E8" strokeWidth={2.5} />
                  <Text style={{ ...TYPE.caption, color: "#9AC8E8", fontVariant: ["tabular-nums"] }}>
                    {rain}%
                  </Text>
                </>
              )}
            </View>

            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Text
                style={{
                  ...TYPE.callout,
                  color: INK.tertiary,
                  width: 30,
                  textAlign: "right",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {lo}°
              </Text>

              <View
                style={{
                  width: TRACK,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  overflow: "hidden",
                }}
              >
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={
                    i === 0
                      ? [ACCENT, "rgba(255,255,255,0.85)"]
                      : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.85)"]
                  }
                  style={{
                    position: "absolute",
                    left,
                    width: barWidth,
                    height: 4,
                    borderRadius: 2,
                  }}
                />
              </View>

              <Text
                style={{
                  ...TYPE.callout,
                  color: INK.primary,
                  width: 30,
                  fontWeight: "600",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {hi}°
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
