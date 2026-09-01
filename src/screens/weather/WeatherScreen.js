import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  RefreshControl,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Droplets,
  Wind,
  Sun,
  Gauge,
  Cloud,
  ThermometerSun,
  Settings2,
  Star,
} from "lucide-react-native";

import { useWeather } from "../../hooks/useWeather";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { usePreferences } from "../../context/PreferencesContext";
import { useWeatherBriefing } from "../../hooks/useWeatherBriefing";
import { useWeatherChat } from "../../hooks/useWeatherChat";
import { getWeatherTheme } from "../../theme/weatherThemes";
import { cToF, kmhToMph } from "../../utils/format";
import { TYPE, INK, ACCENT } from "../../theme/type";

import WeatherSearchBar from "../../components/weather/WeatherSearchBar";
import WeatherHero from "../../components/weather/WeatherHero";
import MetricGrid, { uvNote, windDirection } from "../../components/weather/MetricGrid";
import HourlyStrip from "../../components/weather/HourlyStrip";
import SunArc from "../../components/weather/SunArc";
import DailyForecastList from "../../components/weather/DailyForecastList";
import LoadingSkeleton from "../../components/weather/LoadingSkeleton";
import ErrorBanner from "../../components/weather/ErrorBanner";
import Material from "../../components/ui/Material";
import BriefingPanel from "../../components/ai/BriefingPanel";
import AskSheet from "../../components/ai/AskSheet";
import { suggestionsFor } from "../../components/ai/SuggestionChips";

const FALLBACK_LOCATION = {
  name: "Kyoto",
  admin1: "Kyoto",
  country: "Japan",
  latitude: 35.0116,
  longitude: 135.7681,
};

const HEADER_HEIGHT = 60;

export default function WeatherScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { prefs, ready, setUnit, setLastLocation, toggleSaved, isSaved } = usePreferences();
  const [pendingLocation, setPendingLocation] = useState(null);

  // Hold off on the first request until preferences resolve, otherwise we fetch
  // the fallback city and then immediately fetch the stored one.
  const location = pendingLocation || (ready ? prefs.lastLocation || FALLBACK_LOCATION : null);

  const { weather, now, loading, refreshing, error, setError, refetch } = useWeather(location);
  const { getCurrentLocation, locating } = useCurrentLocation();
  const [askOpen, setAskOpen] = useState(false);

  const unit = prefs.unit;
  const theme = weather
    ? getWeatherTheme(weather.current.weather_code, weather.current.is_day === 1)
    : getWeatherTheme(0, true);

  const displayTemp = useCallback(
    (c) => Math.round(unit === "metric" ? c : cToF(c)),
    [unit]
  );
  const displayWind = useCallback(
    (kmh) => Math.round(unit === "metric" ? kmh : kmhToMph(kmh)),
    [unit]
  );
  const windUnitLabel = unit === "metric" ? "km/h" : "mph";

  const briefing = useWeatherBriefing({ weather, location, now, unit });
  const chat = useWeatherChat({ weather, location, now, unit });

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const selectLocation = useCallback(
    (loc) => {
      setPendingLocation(loc);
      setLastLocation(loc);
    },
    [setLastLocation]
  );

  const { hourly, uvNow } = useMemo(() => {
    if (!weather || !now) return { hourly: [], uvNow: null };
    const times = weather.hourly.time;
    let start = times.findIndex((t) => new Date(t) >= new Date(now.getTime() - 30 * 60000));
    if (start < 0) start = 0;
    const slice = times.slice(start, start + 24).map((t, i) => {
      const idx = start + i;
      return {
        time: new Date(t),
        temp: weather.hourly.temperature_2m[idx],
        code: weather.hourly.weather_code[idx],
        precipProb: weather.hourly.precipitation_probability?.[idx],
      };
    });
    return { hourly: slice, uvNow: weather.hourly.uv_index?.[start] ?? null };
  }, [weather, now]);

  const daily = useMemo(
    () =>
      weather
        ? weather.daily.time.map((t, i) => ({
            date: new Date(t),
            max: weather.daily.temperature_2m_max[i],
            min: weather.daily.temperature_2m_min[i],
            code: weather.daily.weather_code[i],
            precipProb: weather.daily.precipitation_probability_max?.[i],
          }))
        : [],
    [weather]
  );

  const metrics = useMemo(() => {
    if (!weather) return [];
    const c = weather.current;
    const uv = uvNow ?? weather.daily.uv_index_max?.[0];
    return [
      {
        icon: ThermometerSun,
        label: "Feels like",
        value: `${displayTemp(c.apparent_temperature)}°`,
        note:
          Math.abs(c.apparent_temperature - c.temperature_2m) < 1
            ? "as it reads"
            : c.apparent_temperature > c.temperature_2m
            ? "warmer than air"
            : "colder than air",
      },
      {
        icon: Wind,
        label: "Wind",
        value: `${displayWind(c.wind_speed_10m)}`,
        unit: windUnitLabel,
        note: [
          windDirection(c.wind_direction_10m),
          c.wind_gusts_10m ? `gusts ${displayWind(c.wind_gusts_10m)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      },
      {
        icon: Droplets,
        label: "Humidity",
        value: `${Math.round(c.relative_humidity_2m)}`,
        unit: "%",
      },
      {
        icon: Sun,
        label: "UV index",
        value: `${Math.round(uv ?? 0)}`,
        note: uvNote(uv),
      },
      {
        icon: Cloud,
        label: "Cloud",
        value: `${Math.round(c.cloud_cover ?? 0)}`,
        unit: "%",
      },
      {
        icon: Gauge,
        label: "Pressure",
        value: `${Math.round(c.surface_pressure)}`,
        unit: "hPa",
      },
    ];
  }, [weather, uvNow, displayTemp, displayWind, windUnitLabel]);

  const handleUseLocation = useCallback(async () => {
    setError("");
    try {
      selectLocation(await getCurrentLocation());
    } catch (e) {
      setError(
        e?.friendly === "PERMISSION"
          ? "Location access was denied. Allow it in Settings, or search for a city instead."
          : "Couldn't determine your location. Try searching for a city instead."
      );
    }
  }, [getCurrentLocation, selectLocation, setError]);

  const locationLabel = location ? location.name : "";
  const saved = location ? isSaved(location) : false;

  // Chrome fades in as content arrives beneath it, rather than sitting as an
  // opaque strip from the first frame.
  const headerMaterial = scrollY.interpolate({
    inputRange: [0, 64],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0.12, y: 0 }}
      end={{ x: 0.88, y: 1 }}
      style={{ flex: 1 }}
    >
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + HEADER_HEIGHT + 8,
          paddingBottom: 48,
          gap: 26,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch({ silent: true })}
            tintColor="#fff"
            colors={["#fff"]}
            progressViewOffset={insets.top + HEADER_HEIGHT}
          />
        }
      >
        {!!error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        {(loading || !ready) && <LoadingSkeleton />}

        {!loading && weather && (
          <>
            <WeatherHero
              location={location}
              now={now}
              theme={theme}
              temp={displayTemp(weather.current.temperature_2m)}
              feelsLike={displayTemp(weather.current.apparent_temperature)}
              high={displayTemp(weather.daily.temperature_2m_max[0])}
              low={displayTemp(weather.daily.temperature_2m_min[0])}
              tempUnitLabel={unit === "metric" ? "°C" : "°F"}
              onToggleUnit={() => setUnit(unit === "metric" ? "imperial" : "metric")}
            />

            <BriefingPanel
              briefing={briefing}
              onAsk={() => setAskOpen(true)}
              onOpenSettings={() => navigation.navigate("Settings")}
            />

            <MetricGrid items={metrics} />

            <HourlyStrip hours={hourly} displayTemp={displayTemp} />

            <SunArc
              sunrise={weather.daily.sunrise?.[0]}
              sunset={weather.daily.sunset?.[0]}
              now={now}
            />

            <DailyForecastList days={daily} displayTemp={displayTemp} />

            <Text
              style={{
                ...TYPE.caption,
                color: INK.quaternary,
                textAlign: "center",
                paddingTop: 6,
              }}
            >
              Forecast by Open-Meteo
            </Text>
          </>
        )}
      </Animated.ScrollView>

      {/* Floating chrome. Content scrolls under it. */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top,
          height: insets.top + HEADER_HEIGHT,
        }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: headerMaterial,
          }}
          pointerEvents="none"
        >
          <Material weight="chrome" style={{ flex: 1 }} />
        </Animated.View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            paddingHorizontal: 20,
            height: HEADER_HEIGHT,
          }}
        >
          <View style={{ flex: 1 }}>
            <WeatherSearchBar
              onSelectLocation={selectLocation}
              onUseLocation={handleUseLocation}
              locating={locating}
              savedLocations={prefs.savedLocations}
            />
          </View>

          <HeaderButton
            label={saved ? "Remove from saved" : "Save this city"}
            onPress={() => location && toggleSaved(location)}
          >
            <Star
              size={16}
              color={saved ? ACCENT : "#fff"}
              fill={saved ? ACCENT : "transparent"}
              strokeWidth={2}
            />
          </HeaderButton>

          <HeaderButton
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
          >
            <Settings2 size={16} color="#fff" strokeWidth={2} />
          </HeaderButton>
        </View>
      </View>

      <AskSheet
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        chat={chat}
        suggestions={suggestionsFor({ weather, now })}
        locationLabel={locationLabel}
      />
    </LinearGradient>
  );
}

function HeaderButton({ children, onPress, label }) {
  const press = React.useRef(new Animated.Value(0)).current;
  return (
    <Animated.View
      style={{
        transform: [
          { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 80, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 130, useNativeDriver: true }).start()
        }
        onPress={onPress}
        hitSlop={6}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.18)",
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
