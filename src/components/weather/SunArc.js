import React, { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { TYPE, INK, ACCENT } from "../../theme/type";

const W = 150;
const H = 62;
const R = 60;
const CX = W / 2;
const CY = H - 2;

const pad = (n) => String(n).padStart(2, "0");
const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Point on the semicircle at progress t (0 = sunrise, 1 = sunset). */
function pointAt(t) {
  const angle = Math.PI * (1 - t); // sweep left to right
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

/**
 * Daylight as an arc with the sun where it currently sits.
 *
 * "Sunset 18:54" is a fact you have to convert into a feeling. An arc with the
 * marker three quarters along answers "how much light is left" without reading
 * anything, which is what people are actually asking.
 */
export default function SunArc({ sunrise, sunset, now }) {
  const { progress, isDaylight, rise, set } = useMemo(() => {
    if (!sunrise || !sunset) return { progress: 0, isDaylight: false };
    const r = new Date(sunrise);
    const s = new Date(sunset);
    const n = now || new Date();
    const total = s - r;
    const raw = total > 0 ? (n - r) / total : 0;
    return {
      rise: r,
      set: s,
      progress: Math.min(1, Math.max(0, raw)),
      isDaylight: raw > 0 && raw < 1,
    };
  }, [sunrise, sunset, now]);

  if (!sunrise || !sunset) return null;

  const sun = pointAt(progress);
  const elapsed = pointAt(0);

  // Two paths: the part of the day already spent, drawn solid, and the whole
  // arc drawn faint underneath.
  const full = `M ${elapsed.x} ${elapsed.y} A ${R} ${R} 0 0 1 ${pointAt(1).x} ${pointAt(1).y}`;
  const done = `M ${elapsed.x} ${elapsed.y} A ${R} ${R} 0 0 1 ${sun.x} ${sun.y}`;

  const remaining = Math.max(0, set - (now || new Date()));
  const hoursLeft = Math.floor(remaining / 3600000);
  const minsLeft = Math.floor((remaining % 3600000) / 60000);

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ ...TYPE.overline, color: INK.tertiary }}>Daylight</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 18 }}>
        <Svg width={W} height={H}>
          <Path d={full} stroke={INK.hairline} strokeWidth={1.5} fill="none" />
          {progress > 0 && progress < 1 && (
            <Path
              d={done}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
            />
          )}
          {isDaylight && (
            <>
              <Circle cx={sun.x} cy={sun.y} r={9} fill={ACCENT} opacity={0.18} />
              <Circle cx={sun.x} cy={sun.y} r={4.5} fill={ACCENT} />
            </>
          )}
        </Svg>

        <View style={{ flex: 1, gap: 6, paddingBottom: 2 }}>
          <Row label="Sunrise" value={clock(rise)} />
          <Row label="Sunset" value={clock(set)} />
          {isDaylight && (
            <Text style={{ ...TYPE.caption, color: INK.quaternary }}>
              {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`} of light left
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>{label}</Text>
      <Text style={{ ...TYPE.footnote, color: INK.primary, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}
