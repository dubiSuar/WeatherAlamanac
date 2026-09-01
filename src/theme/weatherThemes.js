import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
} from "lucide-react-native";

/**
 * Each entry has a day/night pair of colors used as LinearGradient stops,
 * plus the icon shown for that condition. Mirrors the web app's palette
 * so both platforms feel like the same product.
 */
export const WEATHER_THEMES = {
  clear: {
    label: "Clear sky",
    icon: { day: Sun, night: Moon },
    colors: {
      day: ["#1F6FD6", "#3E9BE0", "#7BC6E8", "#FCE2A0"],
      night: ["#050B22", "#0E1B44", "#1F2C63", "#3A2E63"],
    },
  },
  mainlyClear: {
    label: "Mainly clear",
    icon: { day: Sun, night: Moon },
    colors: {
      day: ["#2A72CE", "#4C9BDD", "#9BCBE6"],
      night: ["#081026", "#141F42", "#26305E"],
    },
  },
  partlyCloudy: {
    label: "Partly cloudy",
    icon: { day: CloudSun, night: CloudMoon },
    colors: {
      day: ["#4A7FB5", "#7FA6C9", "#C9D8E2"],
      night: ["#131A2C", "#233049", "#3A4560"],
    },
  },
  overcast: {
    label: "Overcast",
    icon: { day: Cloudy, night: Cloudy },
    colors: {
      day: ["#5D6B7C", "#8291A0", "#B7C1CA"],
      night: ["#1B2029", "#2B313D", "#454C58"],
    },
  },
  fog: {
    label: "Foggy",
    icon: { day: CloudFog, night: CloudFog },
    colors: {
      day: ["#8C97A1", "#B6BFC7", "#DDE3E7"],
      night: ["#2A2F36", "#3F454C", "#5B6169"],
    },
  },
  drizzle: {
    label: "Drizzle",
    icon: { day: CloudDrizzle, night: CloudDrizzle },
    colors: {
      day: ["#3E5A73", "#5D7C93", "#96AFC0"],
      night: ["#0F1A26", "#1E2E3F", "#334458"],
    },
  },
  rain: {
    label: "Rain",
    icon: { day: CloudRain, night: CloudRain },
    colors: {
      day: ["#2E4A63", "#43617D", "#6F8CA3"],
      night: ["#0A1420", "#16232F", "#28374A"],
    },
  },
  heavyRain: {
    label: "Heavy rain",
    icon: { day: CloudRainWind, night: CloudRainWind },
    colors: {
      day: ["#233A4E", "#37536B", "#587390"],
      night: ["#070E17", "#101C29", "#1E2E3F"],
    },
  },
  snow: {
    label: "Snow",
    icon: { day: CloudSnow, night: CloudSnow },
    colors: {
      day: ["#8FB4CC", "#BFDCE9", "#EEF6FA"],
      night: ["#26374A", "#3C5468", "#6B8598"],
    },
  },
  thunder: {
    label: "Thunderstorm",
    icon: { day: CloudLightning, night: CloudLightning },
    colors: {
      day: ["#262A3C", "#3B3856", "#584D74"],
      night: ["#0A0A14", "#181628", "#2C2440"],
    },
  },
};

export function themeKeyForCode(code) {
  if (code === 0) return "clear";
  if (code === 1) return "mainlyClear";
  if (code === 2) return "partlyCloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 66].includes(code)) return "rain";
  if ([65, 67, 80, 81, 82].includes(code)) return "heavyRain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunder";
  return "partlyCloudy";
}

export function getWeatherTheme(code, isDay) {
  const t = WEATHER_THEMES[themeKeyForCode(code)];
  return {
    label: t.label,
    Icon: isDay ? t.icon.day : t.icon.night,
    colors: isDay ? t.colors.day : t.colors.night,
    isDay,
  };
}
