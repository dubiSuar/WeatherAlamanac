import { useCallback, useEffect, useRef, useState } from "react";
import { streamMessage, isConfigured } from "../services/aiClient";
import { CHAT_SYSTEM, buildWeatherContext, withContext } from "../services/weatherContext";

const MAX_TURNS = 10;
let seq = 0;
const nextId = () => `m${++seq}`;

/**
 * The turns worth sending back to the model: each user question that got an
 * answer, plus that answer. A question whose reply failed or was stopped
 * before any text is dropped, otherwise the model sees two user turns in a row
 * and the failed question gets asked again alongside the new one.
 */
export function answeredTurns(messages) {
  const out = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const next = messages[i + 1];
    if (m.role === "user" && next?.role === "assistant" && next.content) {
      out.push(m, next);
      i++;
    }
  }
  return out;
}

/**
 * Conversation over the current forecast.
 *
 * The context block is attached to the newest user turn only, never to the
 * stored history. Two reasons: the history would balloon by ~600 tokens per
 * turn, and — the one that actually bites — a conversation started at 08:00
 * would keep re-sending the 08:00 forecast, so by lunchtime the model would be
 * answering "is it still raining" against stale hours. Rebuilding on every send
 * means the model always sees what the screen currently shows.
 */
export function useWeatherChat({ weather, location, now, unit }) {
  const [messages, setMessages] = useState([]);
  // send() reads history from here rather than from `messages`, so it never
  // works from a stale render (retry() trims the list right before sending).
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);
  const lastPrompt = useRef(null);

  const patch = useCallback((id, fields) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)));
  }, []);

  const send = useCallback(
    async (raw) => {
      const question = raw?.trim();
      if (!question || streaming) return;

      if (!isConfigured()) {
        setError({
          message: "Almanac isn't connected. Add AI_PROXY_URL to .env and restart the bundler.",
          kind: "unconfigured",
        });
        return;
      }
      if (!weather?.current) {
        setError({ message: "Waiting on the forecast — try again in a moment.", kind: "network" });
        return;
      }

      lastPrompt.current = question;
      setError(null);

      const userMsg = { id: nextId(), role: "user", content: question };
      const replyId = nextId();
      const history = answeredTurns(messagesRef.current)
        .slice(-MAX_TURNS)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: replyId, role: "assistant", content: "", pending: true },
      ]);
      setStreaming(true);

      const context = buildWeatherContext({ weather, location, now, unit });
      const handle = streamMessage({
        system: CHAT_SYSTEM,
        maxTokens: 2000,
        messages: [...history, { role: "user", content: withContext(context, question) }],
        onDelta: (_chunk, full) => patch(replyId, { content: full, pending: false }),
      });
      inFlight.current = handle;

      try {
        const full = await handle.promise;
        patch(replyId, { content: full, pending: false });
      } catch (e) {
        if (e?.kind === "aborted") {
          // Keep whatever streamed in before the stop, drop an empty bubble.
          setMessages((prev) =>
            prev.filter((m) => !(m.id === replyId && !m.content))
          );
        } else {
          setError({ message: e?.message || "Something went wrong.", kind: e?.kind });
          setMessages((prev) => prev.filter((m) => m.id !== replyId));
        }
      } finally {
        if (inFlight.current === handle) inFlight.current = null;
        setStreaming(false);
      }
    },
    [streaming, weather, location, now, unit, patch]
  );

  const stop = useCallback(() => inFlight.current?.cancel(), []);

  const retry = useCallback(() => {
    const prompt = lastPrompt.current;
    if (!prompt) return;
    // Drop the failed user turn so the retry doesn't duplicate it. Update the
    // ref too, so send() sees the trimmed list without waiting for a render.
    const prev = messagesRef.current;
    const idx = prev.map((m) => m.content).lastIndexOf(prompt);
    const trimmed = idx === -1 ? prev : prev.slice(0, idx);
    messagesRef.current = trimmed;
    setMessages(trimmed);
    send(prompt);
  }, [send]);

  const clear = useCallback(() => {
    inFlight.current?.cancel();
    setMessages([]);
    setError(null);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => () => inFlight.current?.cancel(), []);

  return { messages, send, stop, retry, clear, streaming, error, dismissError };
}
