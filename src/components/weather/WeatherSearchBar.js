import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Search, Navigation, MapPin, X, Star } from "lucide-react-native";
import { TYPE, INK, ACCENT } from "../../theme/type";
import { fetchWithTimeout } from "../../utils/http";

/**
 * Search, current-location, and saved cities in one control.
 *
 * The dropdown does three jobs depending on state: saved cities when focused
 * with an empty field, results while typing, and an explicit "nothing found"
 * when the geocoder comes back empty. That last one matters — a silently empty
 * list reads as a broken app rather than a bad spelling.
 */
export default function WeatherSearchBar({
  onSelectLocation,
  onUseLocation,
  locating,
  savedLocations = [],
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const reveal = useRef(new Animated.Value(0)).current;

  const trimmed = query.trim();
  const showSaved = focused && trimmed.length === 0 && savedLocations.length > 0;
  const showResults = trimmed.length >= 2 && (suggestions.length > 0 || noResults);
  const open = showSaved || showResults;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 150,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [open, reveal]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 2) {
      setSuggestions([]);
      setNoResults(false);
      setSearchFailed(false);
      return;
    }
    // Aborted when the query changes or the component unmounts, so a slow
    // response for "Par" can never overwrite the results for "Paris".
    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchFailed(false);
      try {
        const res = await fetchWithTimeout(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            trimmed
          )}&count=6&language=en&format=json`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const results = data.results || [];
        setSuggestions(results);
        setNoResults(results.length === 0);
      } catch {
        if (controller.signal.aborted) return;
        // A failed request is not the same as "no such place"; say which.
        setSuggestions([]);
        setNoResults(true);
        setSearchFailed(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
      setSearching(false);
    };
  }, [trimmed]);

  function pick(result) {
    onSelectLocation({
      name: result.name,
      admin1: result.admin1 || "",
      country: result.country || "",
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setQuery("");
    setSuggestions([]);
    setNoResults(false);
    inputRef.current?.blur();
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          paddingLeft: 14,
          paddingRight: 5,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: focused ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)",
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Search size={15} color={INK.tertiary} strokeWidth={2} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => suggestions.length > 0 && pick(suggestions[0])}
          placeholder="Search a city"
          placeholderTextColor={INK.quaternary}
          style={{ flex: 1, ...TYPE.callout, color: INK.primary }}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={INK.tertiary} />}
        {trimmed.length > 0 && !searching && (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel="Clear search">
            <X size={15} color={INK.tertiary} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable
          onPress={onUseLocation}
          disabled={locating}
          accessibilityLabel="Use my location"
          hitSlop={4}
          style={{
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 17,
            backgroundColor: "rgba(255,255,255,0.14)",
          }}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Navigation size={15} color="#fff" strokeWidth={2} />
          )}
        </Pressable>
      </View>

      {open && (
        <Animated.View
          style={{
            marginTop: 8,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(11,15,25,0.94)",
            overflow: "hidden",
            opacity: reveal,
            // RN 0.74+ supports transformOrigin; without it scaleY would
            // expand from the centre and the panel would appear to grow
            // upwards out of the search field as well as down.
            transformOrigin: "top",
            transform: [
              { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
              // Scales from the top edge so it reads as unfolding out of the
              // field rather than appearing beside it.
              { scaleY: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          }}
        >
          {showSaved && (
            <>
              <Text
                style={{
                  ...TYPE.overline,
                  color: INK.quaternary,
                  paddingHorizontal: 15,
                  paddingTop: 12,
                  paddingBottom: 4,
                }}
              >
                Saved
              </Text>
              {savedLocations.map((loc, i) => (
                <Row
                  key={`${loc.latitude}${loc.longitude}`}
                  icon={Star}
                  iconColor={ACCENT}
                  primary={loc.name}
                  secondary={loc.admin1 || loc.country}
                  onPress={() => pick(loc)}
                  divider={i > 0}
                />
              ))}
            </>
          )}

          {showResults &&
            suggestions.map((item, i) => (
              <Row
                key={String(item.id)}
                icon={MapPin}
                iconColor={INK.tertiary}
                primary={item.name}
                secondary={[item.admin1, item.country].filter(Boolean).join(", ")}
                onPress={() => pick(item)}
                divider={i > 0}
              />
            ))}

          {showResults && noResults && (
            <View style={{ paddingHorizontal: 15, paddingVertical: 16, gap: 3 }}>
              <Text style={{ ...TYPE.callout, color: INK.primary }}>
                {searchFailed ? "Couldn't search right now" : `No place called “${trimmed}”`}
              </Text>
              <Text style={{ ...TYPE.caption, color: INK.tertiary }}>
                {searchFailed
                  ? "Check your connection and try again."
                  : "Try the city on its own, without the country."}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function Row({ icon: Icon, iconColor, primary, secondary, onPress, divider }) {
  const press = useRef(new Animated.Value(0)).current;
  return (
    <Pressable
      // useNativeDriver stays false here: the native driver only handles
      // transform and opacity, and this animates backgroundColor.
      onPressIn={() =>
        Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: false }).start()
      }
      onPressOut={() =>
        Animated.timing(press, { toValue: 0, duration: 140, useNativeDriver: false }).start()
      }
      onPress={onPress}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 11,
          paddingHorizontal: 15,
          paddingVertical: 12,
          borderTopWidth: divider ? 1 : 0,
          borderTopColor: "rgba(255,255,255,0.07)",
          backgroundColor: press.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,0.09)"],
          }),
        }}
      >
        <Icon size={14} color={iconColor} strokeWidth={2} />
        <Text style={{ ...TYPE.callout, color: INK.primary, flex: 1 }} numberOfLines={1}>
          {primary}
        </Text>
        {!!secondary && (
          <Text style={{ ...TYPE.caption, color: INK.quaternary }} numberOfLines={1}>
            {secondary}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
