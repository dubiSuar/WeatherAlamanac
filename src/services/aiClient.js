import { AI } from "../config/env";

/**
 * Streaming client for the Claude Messages API.
 *
 * Why XMLHttpRequest and not fetch: React Native's fetch is a polyfill over
 * XHR and does not implement `Response.body`, so `res.body.getReader()` is
 * undefined and there is no way to read a response incrementally. XHR's
 * `onprogress` gives us the partial `responseText`, which we diff and parse as
 * SSE. This is the only way to stream tokens in RN without adding a native
 * networking dependency.
 *
 * Two transports:
 *   proxy  — POST to your own server, which holds the key. Ship this.
 *   direct — key embedded in the bundle. __DEV__ only, enforced in config/env.
 *
 * Verify the current model ids and request shape against
 * https://docs.claude.com/en/api/overview — they move faster than this file.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const REQUEST_TIMEOUT_MS = 60000;

export class AiError extends Error {
  constructor(message, { kind = "unknown", status = null } = {}) {
    super(message);
    this.name = "AiError";
    this.kind = kind; // 'unconfigured' | 'network' | 'auth' | 'rate_limit' | 'server' | 'aborted' | 'unknown'
    this.status = status;
  }
}

export const isConfigured = () => AI.mode !== "unconfigured";

function endpointAndHeaders() {
  if (AI.mode === "proxy") {
    return {
      url: AI.proxyUrl,
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    };
  }
  if (AI.mode === "direct") {
    return {
      url: ANTHROPIC_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "x-api-key": AI.devApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    };
  }
  throw new AiError(
    "Almanac isn't connected yet. Add AI_PROXY_URL to your .env and restart the bundler.",
    { kind: "unconfigured" }
  );
}

function friendlyHttpError(status, body) {
  let detail = "";
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message || parsed?.message || "";
  } catch {
    detail = "";
  }
  if (status === 401 || status === 403)
    return new AiError("The API credentials were rejected.", { kind: "auth", status });
  if (status === 429)
    return new AiError("Rate limited. Give it a few seconds and try again.", {
      kind: "rate_limit",
      status,
    });
  if (status >= 500)
    return new AiError("The model service is having trouble. Try again shortly.", {
      kind: "server",
      status,
    });
  return new AiError(detail || `Request failed (${status}).`, { kind: "unknown", status });
}

/**
 * Parses whatever complete SSE events have arrived, returns the leftover
 * partial chunk to carry into the next progress event. Splitting on the blank
 * line matters — a naive split on "\n" will hand you half a JSON object.
 */
function drainSse(buffer, onDelta, state) {
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const block of parts) {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue; // tolerate keepalive noise
      }

      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        state.text += event.delta.text;
        onDelta?.(event.delta.text, state.text);
      } else if (event.type === "message_delta" && event.delta?.stop_reason) {
        state.stopReason = event.delta.stop_reason;
      } else if (event.type === "error") {
        state.error = new AiError(
          event.error?.message || "The model returned an error.",
          { kind: "server" }
        );
      }
    }
  }
  return remainder;
}

/**
 * A non-streaming response body, in case your proxy buffers instead of
 * passing the event stream through.
 */
function textFromJsonResponse(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed.content)) {
    return parsed.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }
  if (typeof parsed.text === "string") return parsed.text;
  return "";
}

/**
 * @param {object}   opts
 * @param {string}   opts.system      system prompt
 * @param {Array}    opts.messages    [{ role, content }]
 * @param {number}   opts.maxTokens
 * @param {function} opts.onDelta     (chunk, fullTextSoFar) => void
 * @returns {{ promise: Promise<string>, cancel: () => void }}
 *
 * Returns the handle rather than a bare promise so a caller can cancel an
 * in-flight generation. A user who taps "stop" or sends a follow-up mid-answer
 * should not have to wait for the old request to finish.
 */
export function streamMessage({ system, messages, maxTokens = 1024, onDelta }) {
  const { url, headers } = endpointAndHeaders();

  const xhr = new XMLHttpRequest();
  let cancelled = false;

  const promise = new Promise((resolve, reject) => {
    const state = { text: "", stopReason: null, error: null };
    let seen = 0;
    let buffer = "";
    let streamed = false;

    xhr.open("POST", url, true);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.timeout = REQUEST_TIMEOUT_MS;

    xhr.onprogress = () => {
      if (xhr.status >= 400) return; // handled in onload
      const fresh = xhr.responseText.slice(seen);
      seen = xhr.responseText.length;
      if (!fresh) return;
      streamed = true;
      buffer = drainSse(buffer + fresh, onDelta, state);
    };

    xhr.onload = () => {
      if (xhr.status >= 400) return reject(friendlyHttpError(xhr.status, xhr.responseText));
      // Flush anything that arrived between the last progress event and load.
      const fresh = xhr.responseText.slice(seen);
      if (fresh) {
        streamed = true;
        drainSse(buffer + fresh + "\n\n", onDelta, state);
      }
      if (state.error) return reject(state.error);

      if (!streamed || !state.text) {
        // Proxy buffered the whole thing, or returned plain JSON.
        try {
          const text = textFromJsonResponse(xhr.responseText);
          if (text) {
            onDelta?.(text, text);
            return resolve(text);
          }
        } catch {
          /* fall through */
        }
      }
      if (!state.text) {
        return reject(new AiError("The model returned an empty response.", { kind: "server" }));
      }
      resolve(state.text);
    };

    xhr.onerror = () =>
      reject(
        new AiError("Couldn't reach the assistant. Check your connection.", { kind: "network" })
      );
    xhr.ontimeout = () =>
      reject(new AiError("The assistant took too long to respond.", { kind: "network" }));
    xhr.onabort = () => {
      if (cancelled) reject(new AiError("Cancelled.", { kind: "aborted" }));
    };

    xhr.send(
      JSON.stringify({
        model: AI.model,
        max_tokens: maxTokens,
        stream: true,
        system,
        messages,
      })
    );
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      try {
        xhr.abort();
      } catch {
        /* already finished */
      }
    },
  };
}
