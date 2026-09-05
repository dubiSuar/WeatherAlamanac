import React from "react";
import { View, Text, Pressable, ScrollView, Animated, Linking, Alert } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, LogOut, Trash2, Check, ExternalLink } from "lucide-react-native";

import { useAuth } from "../../context/AuthContext";
import { usePreferences } from "../../context/PreferencesContext";
import { AI } from "../../config/env";
import { TYPE, INK, ACCENT } from "../../theme/type";

const NIGHT = ["#050B22", "#0E1B44", "#1F2C63", "#3A2E63"];

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { prefs, setUnit, toggleSaved } = usePreferences();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <LinearGradient colors={NIGHT} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityLabel="Back"
            style={{ padding: 8 }}
          >
            <ChevronLeft size={22} color="#fff" strokeWidth={2} />
          </Pressable>
          <Text style={{ ...TYPE.title, color: INK.primary }}>Settings</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, gap: 34 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ------------------------------------------------------------ units */}
          <Section title="Units">
            <Segmented
              value={prefs.unit}
              onChange={setUnit}
              options={[
                { value: "metric", label: "Celsius", detail: "°C · km/h · mm" },
                { value: "imperial", label: "Fahrenheit", detail: "°F · mph · in" },
              ]}
            />
          </Section>

          {/* ----------------------------------------------------- saved cities */}
          <Section
            title="Saved cities"
            caption={
              prefs.savedLocations.length
                ? "These appear the moment you tap the search field."
                : null
            }
          >
            {prefs.savedLocations.length === 0 ? (
              <Empty
                headline="Nothing saved yet"
                body="Tap the star in the header while looking at a city and it lands here."
              />
            ) : (
              prefs.savedLocations.map((loc, i) => (
                <View
                  key={`${loc.latitude}${loc.longitude}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: INK.hairline,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TYPE.body, color: INK.primary }}>{loc.name}</Text>
                    <Text style={{ ...TYPE.caption, color: INK.quaternary, marginTop: 2 }}>
                      {[loc.admin1, loc.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => toggleSaved(loc)}
                    hitSlop={10}
                    accessibilityLabel={`Remove ${loc.name}`}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={16} color={INK.tertiary} strokeWidth={2} />
                  </Pressable>
                </View>
              ))
            )}
          </Section>

          {/* ---------------------------------------------------------- almanac */}
          <Section title="Almanac">
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: AI.mode === "unconfigured" ? INK.quaternary : ACCENT,
                  }}
                />
                <Text style={{ ...TYPE.body, color: INK.primary }}>
                  {AI.mode === "proxy"
                    ? "Connected through your proxy"
                    : AI.mode === "direct"
                    ? "Connected directly (development)"
                    : "Not connected"}
                </Text>
              </View>

              <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>
                {AI.mode === "unconfigured"
                  ? "Set AI_PROXY_URL in .env to a server that forwards to the Messages API, then restart the bundler with a cleared cache."
                  : AI.mode === "direct"
                  ? "The API key is embedded in this build. Fine on your own device, but move to a proxy before you distribute it — anyone with the binary can extract the key."
                  : `Requests go to your endpoint, which holds the key. Model: ${AI.model}.`}
              </Text>

              <Row label="Model" value={AI.model} />
              <Row
                label="Sees"
                value="Current conditions, next 12 hours, next 5 days"
              />
              <Row label="Doesn't see" value="Air quality, pollen, official warnings" />

              <Pressable
                onPress={() => Linking.openURL("https://docs.claude.com/en/api/overview")}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 }}
              >
                <Text style={{ ...TYPE.footnote, color: ACCENT, fontWeight: "600" }}>
                  Messages API reference
                </Text>
                <ExternalLink size={12} color={ACCENT} strokeWidth={2} />
              </Pressable>
            </View>
          </Section>

          {/* ---------------------------------------------------------- account */}
          <Section title="Account">
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ ...TYPE.body, color: INK.primary }}>
                  {user?.displayName || "Signed in"}
                </Text>
                <Text style={{ ...TYPE.footnote, color: INK.tertiary, marginTop: 2 }}>
                  {user?.email}
                </Text>
              </View>

              <Pressable
                onPress={handleLogout}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(255,255,255,0.07)",
                }}
              >
                <LogOut size={15} color={INK.primary} strokeWidth={2} />
                <Text style={{ ...TYPE.callout, color: INK.primary, fontWeight: "600" }}>
                  Log out
                </Text>
              </Pressable>
            </View>
          </Section>

          <Text style={{ ...TYPE.caption, color: INK.quaternary, textAlign: "center" }}>
            Forecast by Open-Meteo · Reverse geocoding by BigDataCloud
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Section({ title, caption, children }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ ...TYPE.overline, color: INK.tertiary }}>{title}</Text>
        {!!caption && (
          <Text style={{ ...TYPE.caption, color: INK.quaternary }}>{caption}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 20,
        paddingTop: 9,
        borderTopWidth: 1,
        borderTopColor: INK.hairline,
      }}
    >
      <Text style={{ ...TYPE.footnote, color: INK.tertiary }}>{label}</Text>
      <Text style={{ ...TYPE.footnote, color: INK.secondary, flex: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function Empty({ headline, body }) {
  return (
    <View style={{ paddingVertical: 18, gap: 5 }}>
      <Text style={{ ...TYPE.body, color: INK.secondary }}>{headline}</Text>
      <Text style={{ ...TYPE.footnote, color: INK.quaternary, maxWidth: 300 }}>{body}</Text>
    </View>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <SegmentRow
            key={opt.value}
            active={active}
            label={opt.label}
            detail={opt.detail}
            onPress={() => onChange(opt.value)}
          />
        );
      })}
    </View>
  );
}

function SegmentRow({ active, label, detail, onPress }) {
  const press = React.useRef(new Animated.Value(0)).current;
  return (
    <Animated.View
      style={{
        transform: [
          { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 130, useNativeDriver: true }).start()
        }
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: active ? "rgba(228,133,79,0.45)" : "rgba(255,255,255,0.14)",
          backgroundColor: active ? "rgba(228,133,79,0.10)" : "rgba(255,255,255,0.05)",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.body, color: INK.primary }}>{label}</Text>
          <Text style={{ ...TYPE.caption, color: INK.quaternary, marginTop: 2 }}>{detail}</Text>
        </View>
        {active && <Check size={16} color={ACCENT} strokeWidth={2.5} />}
      </Pressable>
    </Animated.View>
  );
}
