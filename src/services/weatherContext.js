import { getWeatherTheme } from "../theme/weatherThemes";
import { cToF, kmhToMph } from "../utils/format";

/**
 * Turns the Open-Meteo response into a compact labelled text block for the
 * model.
 *
 * Handing over the raw JSON would work and would also be wasteful — the
 * forecast object is a few thousand tokens of parallel arrays, most of it hours
 * the user will never ask about. This trims to the horizon a person actually
 * reasons over (next 12 hours, next 5 days), resolves WMO codes to words, and
 * converts into the unit the user is looking at so the model never has to do
 * arithmetic it can get wrong.
 *
 * It also means the model sees exactly what the screen shows. If the answer and
 * the UI disagree, that's a bug in one place, not an unknowable.
 */

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const label = (code) => getWeatherTheme(code, true).label;

function offsetLabel(seconds) {
  if (seconds == null) return "";
  const sign = seconds < 0 ? "-" : "+";
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  return `UTC${sign}${h}${m ? `:${pad(m)}` : ""}`;
}

export function buildWeatherContext({ weather, location, now, unit }) {
  if (!weather?.current) return null;

  const metric = unit === "metric";
  const t = (c) => (c == null ? "n/a" : `${Math.round(metric ? c : cToF(c))}°`);
  const w = (kmh) => (kmh == null ? "n/a" : Math.round(metric ? kmh : kmhToMph(kmh)));
  const windUnit = metric ? "km/h" : "mph";
  const c = weather.current;
  const localNow = now || new Date();

  const lines = [];

  lines.push(
    `LOCATION: ${[location.name, location.admin1, location.country].filter(Boolean).join(", ")} ` +
      `(${weather.latitude?.toFixed(2)}, ${weather.longitude?.toFixed(2)})`
  );
  lines.push(
    `LOCAL TIME: ${localNow.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })} ${hhmm(localNow)} ${offsetLabel(weather.utc_offset_seconds)}`
  );
  lines.push(`UNITS: ${metric ? "Celsius, km/h, mm" : "Fahrenheit, mph, inches"}`);
  lines.push(`DAYLIGHT: ${c.is_day === 1 ? "daytime" : "night"}`);
  lines.push("");

  lines.push(
    `NOW: ${t(c.temperature_2m)} (feels ${t(c.apparent_temperature)}), ${label(c.weather_code)}, ` +
      `humidity ${Math.round(c.relative_humidity_2m)}%, ` +
      `wind ${w(c.wind_speed_10m)}${
        c.wind_gusts_10m != null ? ` gusting ${w(c.wind_gusts_10m)}` : ""
      } ${windUnit}, ` +
      `cloud ${c.cloud_cover ?? "n/a"}%, pressure ${Math.round(c.surface_pressure)} hPa`
  );

  const sunrise = weather.daily?.sunrise?.[0];
  const sunset = weather.daily?.sunset?.[0];
  if (sunrise && sunset) {
    lines.push(`SUN TODAY: rises ${hhmm(new Date(sunrise))}, sets ${hhmm(new Date(sunset))}`);
  }

  // Hourly, starting from the current hour.
  const times = weather.hourly?.time ?? [];
  let start = times.findIndex((s) => new Date(s) >= new Date(localNow.getTime() - 30 * 60000));
  if (start < 0) start = 0;

  lines.push("");
  lines.push("NEXT 12 HOURS (time | temp | condition | rain chance | UV):");
  for (let i = start; i < Math.min(start + 12, times.length); i++) {
    lines.push(
      `  ${hhmm(new Date(times[i]))} | ${t(weather.hourly.temperature_2m[i])} | ` +
        `${label(weather.hourly.weather_code[i])} | ` +
        `${weather.hourly.precipitation_probability?.[i] ?? "n/a"}% | ` +
        `${Math.round(weather.hourly.uv_index?.[i] ?? 0)}`
    );
  }

  lines.push("");
  lines.push("NEXT 5 DAYS (day | high/low | condition | rain chance | rain total):");
  const days = weather.daily?.time ?? [];
  for (let i = 0; i < Math.min(5, days.length); i++) {
    const d = new Date(days[i]);
    const name = i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" });
    const mm = weather.daily.precipitation_sum?.[i];
    const rain =
      mm == null ? "n/a" : metric ? `${mm.toFixed(1)}mm` : `${(mm / 25.4).toFixed(2)}in`;
    lines.push(
      `  ${name} | ${t(weather.daily.temperature_2m_max[i])}/${t(
        weather.daily.temperature_2m_min[i]
      )} | ${label(weather.daily.weather_code[i])} | ` +
        `${weather.daily.precipitation_probability_max?.[i] ?? "n/a"}% | ${rain}`
    );
  }

  return lines.join("\n");
}

/**
 * Shared guardrails. Both prompts get these.
 *
 * The "only what's in DATA" rule is doing real work: without it the model will
 * cheerfully answer questions about air quality, pollen and road conditions,
 * none of which we fetch, and the answer will be plausible and made up. The
 * severe-weather line matters because a confident "you'll be fine" from a
 * weather app is exactly the failure worth designing against.
 */
const GUARDRAILS = `
Rules:
- Answer only from the DATA block. Never invent or estimate a number that isn't there.
- The data covers temperature, conditions, wind, humidity, pressure, UV, rain probability and sun times. It does NOT cover air quality, pollen, snow depth, road or sea conditions, or any warning issued by a weather service. If asked about those, say plainly that you don't have that data.
- For severe or fast-moving weather, point the person to their national weather service for warnings. Do not tell anyone an activity is safe.
- Give practical comfort and clothing advice freely. No medical advice.
- Use the units given in DATA. Use the 24-hour clock times as written.
- Concrete and specific. Cite the hour or the number you're reasoning from.
- Never open with a pleasantry, never restate the question, never mention "the data" as a phrase.
`.trim();

export const BRIEFING_SYSTEM = `
You are Almanac, the assistant inside a weather app. You write the short read on current conditions that sits under the temperature.

Format, exactly:
Line 1: one sentence, 12 words maximum, the single most useful judgement about right now. No hedging.
Then a blank line, then 2 to 3 sentences on how the next several hours actually play out.
Then, only if something genuinely warrants it, up to 2 lines each starting with "- " naming a specific thing to plan around, with the hour attached.

Do not use headings, bold, or emoji. Do not mention that you are an assistant.

${GUARDRAILS}
`.trim();

export const CHAT_SYSTEM = `
You are Almanac, the assistant inside a weather app. The person is looking at the forecast in DATA and asking about it.

Keep answers to 2-4 sentences. This is a phone screen. Lead with the answer, then the reason. Use a short "- " list only when the answer is genuinely several separate items. No headings, no bold, no emoji.

If a question is not about weather, conditions, or planning around them, say in one line that you only cover the forecast, and stop.

${GUARDRAILS}
`.trim();

/** Wraps the context block so the model can tell data from instruction. */
export const withContext = (context, text) =>
  `<DATA>\n${context}\n</DATA>\n\n${text}`;
