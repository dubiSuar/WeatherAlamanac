import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Line,
  Text as SvgText,
} from "react-native-svg";

import { getWeatherTheme } from "../../theme/weatherThemes";
import { formatHourLabel } from "../../utils/format";
import { TYPE, INK, ACCENT } from "../../theme/type";

const COL = 46; // one hour, shared by every row so the layers stay aligned
const CHART_H = 78;
const PAD_TOP = 22; // headroom for the temperature labels
const PAD_BOTTOM = 14; // headroom for the precipitation bars

/**
 * Catmull-Rom through the data points, converted to cubic béziers.
 *
 * A polyline reads as jagged noise at this scale, and quadratic smoothing
 * pulls the curve off the actual readings. Catmull-Rom passes exactly through
 * every point, which matters when someone is reading a specific hour off it.
 */
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function HourlyStrip({ hours, displayTemp }) {
  const width = Math.max(hours.length, 1) * COL;

  const { points, path, area, min, max } = useMemo(() => {
    if (!hours.length) return { points: [], path: "", area: "", min: 0, max: 0 };
    const temps = hours.map((h) => displayTemp(h.temp));
    const lo = Math.min(...temps);
    const hi = Math.max(...temps);
    // A flat day would otherwise divide by zero and draw a line at the top.
    const span = Math.max(hi - lo, 1);
    const usable = CHART_H - PAD_TOP - PAD_BOTTOM;

    const pts = temps.map((t, i) => ({
      x: i * COL + COL / 2,
      y: PAD_TOP + usable - ((t - lo) / span) * usable,
      t,
    }));

    const line = smoothPath(pts);
    return {
      points: pts,
      path: line,
      area: `${line} L ${pts[pts.length - 1].x} ${CHART_H} L ${pts[0].x} ${CHART_H} Z`,
      min: lo,
      max: hi,
    };
  }, [hours, displayTemp]);

  if (!hours.length) return null;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...TYPE.overline, color: INK.tertiary }}>Next 24 hours</Text>
        <Text style={{ ...TYPE.caption, color: INK.quaternary, fontVariant: ["tabular-nums"] }}>
          {max}° high · {min}° low
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Decelerates onto an hour boundary instead of stopping mid-column.
        snapToInterval={COL}
        decelerationRate="fast"
      >
        <View style={{ width }}>
          {/* Condition icons, one per column, aligned to the curve below. */}
          <View style={{ flexDirection: "row" }}>
            {hours.map((h, i) => {
              const isDay = h.time.getHours() >= 6 && h.time.getHours() < 19;
              const Icon = getWeatherTheme(h.code, isDay).Icon;
              return (
                <View key={i} style={{ width: COL, alignItems: "center", paddingBottom: 6 }}>
                  <Icon size={17} color={INK.secondary} strokeWidth={1.75} />
                </View>
              );
            })}
          </View>

          <Svg width={width} height={CHART_H}>
            <Defs>
              <LinearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.20" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Precipitation probability, only where it's worth a glance. */}
            {hours.map((h, i) => {
              const p = h.precipProb ?? 0;
              if (p < 15) return null;
              const barH = (p / 100) * 11;
              return (
                <Rect
                  key={`p${i}`}
                  x={i * COL + COL / 2 - 2.5}
                  y={CHART_H - barH}
                  width={5}
                  height={barH}
                  rx={2.5}
                  fill="#9AC8E8"
                  opacity={0.55}
                />
              );
            })}

            <Path d={area} fill="url(#curveFill)" />
            <Path
              d={path}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />

            {/* The current hour gets the accent and a vertical tether, so
                "now" is findable after scrolling away and back. */}
            <Line
              x1={points[0].x}
              y1={points[0].y}
              x2={points[0].x}
              y2={CHART_H}
              stroke={ACCENT}
              strokeWidth={1}
              opacity={0.35}
            />
            <Circle cx={points[0].x} cy={points[0].y} r={4.5} fill={ACCENT} />

            {points.map((p, i) =>
              i % 3 === 0 || i === points.length - 1 ? (
                <SvgTemp key={`t${i}`} x={p.x} y={p.y} value={p.t} />
              ) : null
            )}
          </Svg>

          <View style={{ flexDirection: "row", paddingTop: 6 }}>
            {hours.map((h, i) => (
              <View key={i} style={{ width: COL, alignItems: "center" }}>
                <Text
                  style={{
                    ...TYPE.caption,
                    color: i === 0 ? ACCENT : INK.quaternary,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatHourLabel(h.time, i)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * react-native-svg's Text needs explicit anchoring; RN's Text styles don't
 * apply inside an Svg tree, so the label lives here with its own props.
 */
function SvgTemp({ x, y, value }) {
  return (
    <SvgText
      x={x}
      y={y - 11}
      fill="rgba(255,255,255,0.92)"
      fontSize="12"
      fontWeight="600"
      textAnchor="middle"
    >
      {`${value}°`}
    </SvgText>
  );
}
