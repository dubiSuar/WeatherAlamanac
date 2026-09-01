import React from "react";
import { View, Text } from "react-native";
import { TYPE, INK } from "../../theme/type";

/**
 * Six readings on a hairline grid rather than six cards.
 *
 * Cards imply elevation, and elevation should mean something — that a surface
 * is above another and can be acted on. These are just numbers; boxing each one
 * adds twelve borders and a lot of visual noise to communicate nothing. Rules
 * and alignment group them fine.
 */
export default function MetricGrid({ items }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={{
            width: "50%",
            paddingVertical: 13,
            paddingRight: 12,
            paddingLeft: i % 2 === 1 ? 16 : 0,
            borderTopWidth: 1,
            borderTopColor: INK.hairline,
            borderLeftWidth: i % 2 === 1 ? 1 : 0,
            borderLeftColor: INK.hairline,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <item.icon size={13} color={INK.quaternary} strokeWidth={2} />
            <Text style={{ ...TYPE.overline, color: INK.quaternary }}>{item.label}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5, marginTop: 6 }}>
            <Text
              style={{
                ...TYPE.title,
                color: INK.primary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {item.value}
            </Text>
            {!!item.unit && (
              <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>{item.unit}</Text>
            )}
          </View>
          {!!item.note && (
            <Text style={{ ...TYPE.caption, color: INK.quaternary, marginTop: 2 }}>
              {item.note}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Plain-language read on a UV number — the number alone means little. */
export function uvNote(uv) {
  if (uv == null) return "";
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high, cover up";
  if (uv < 11) return "very high, avoid midday";
  return "extreme";
}

/** Compass point from a bearing in degrees. */
export function windDirection(deg) {
  if (deg == null) return "";
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round(deg / 22.5) % 16];
}
