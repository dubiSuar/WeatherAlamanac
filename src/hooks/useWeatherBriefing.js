import { useCallback, useEffect, useRef, useState } from "react";
import { streamMessage, isConfigured, AiError } from "../services/aiClient";
import { BRIEFING_SYSTEM, buildWeatherContext, withContext } from "../services/weatherContext";

/**
 * Splits the briefing into its three display slots. Called on every streamed
 * chunk, so it has to tolerate a half-finished sentence — a partial headline
 * renders as a headline mid-type, which is the point.
 */
export function parseBriefing(text) {
  const lines = text.split("\n");
  const advisories = [];
  const prose = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ")) advisories.push(trimmed.slice(2).trim());
    else if (trimmed.startsWith("-")) advisories.push(trimmed.slice(1).trim());
    else prose.push(trimmed);
  }

  return {
    headline: prose[0] || "",
    body: prose.slice(1).join(" "),
    advisories,
  };
}

/**
 * One briefing per location per hour per unit. The forecast barely moves inside
 * an hour and this is a paid call that fires on mount, so re-running it on
 * every pull-to-refresh would spend real money to regenerate the same
 * paragraph. Cache lives in memory only — an explicit refresh bypasses it.
 */
const cache = new Map();
const cacheKey = ({ location, unit, now }) =>
  [
    location.latitude.toFixed(2),
    location.longitude.toFixed(2),
    unit,
    (now || new Date()).getHours(),
  ].join("|");

export function useWeatherBriefing({ weather, location, now, unit, enabled = true }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | streaming | done | error | unconfigured
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  const run = useCallback(
    async ({ force = false } = {}) => {
      if (!weather?.current || !location) return;

      if (!isConfigured()) {
        setStatus("unconfigured");
        setError(
          new AiError(
            "Almanac isn't connected. Add AI_PROXY_URL to .env and restart the bundler.",
            { kind: "unconfigured" }
          )
        );
        return;
      }

      const key = cacheKey({ location, unit, now });
      if (!force && cache.has(key)) {
        setText(cache.get(key));
        setStatus("done");
        setError(null);
        return;
      }

      inFlight.current?.cancel();
      setText("");
      setError(null);
      setStatus("streaming");

      const context = buildWeatherContext({ weather, location, now, unit });
      const handle = streamMessage({
        system: BRIEFING_SYSTEM,
        maxTokens: 1500,
        messages: [
          {
            role: "user",
            content: withContext(context, "Write the read on current conditions."),
          },
        ],
        onDelta: (_chunk, full) => setText(full),
      });
      inFlight.current = handle;

      try {
        const full = await handle.promise;
        cache.set(key, full);
        setStatus("done");
      } catch (e) {
        if (e?.kind === "aborted") return; // superseded, not a failure
        setError(e);
        setStatus("error");
      } finally {
        if (inFlight.current === handle) inFlight.current = null;
      }
    },
    [weather, location, now, unit]
  );

  // Deliberately keyed on the cache inputs rather than on `weather`: the
  // forecast object is replaced by every poll and refresh, and depending on it
  // directly would retrigger generation constantly.
  const key = weather && location ? cacheKey({ location, unit, now }) : null;
  useEffect(() => {
    if (!enabled || !key) return;
    run();
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => inFlight.current?.cancel(), []);

  return {
    ...parseBriefing(text),
    raw: text,
    status,
    error,
    streaming: status === "streaming",
    refresh: () => run({ force: true }),
  };
}
