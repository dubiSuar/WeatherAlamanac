/**
 * Reference proxy for Almanac using the Gemini API.
 *
 * The app must not hold a provider API key — anyone with the binary can pull it
 * out of the bundle. This sits between them: the app POSTs a message payload,
 * this adds the key and streams the response straight back.
 *
 * Zero dependencies, Node 18+ (needs global fetch and web streams).
 *
 *   GEMINI_API_KEY=your-key node server/proxy.example.js
 *
 * Optional settings (environment variables):
 *
 *   GEMINI_MODEL       model used for every request (default below)
 *   RATE_LIMIT_PER_HOUR  requests allowed per client IP per hour (default 30)
 *
 * For local development, point the app at it in .env:
 *
 *   AI_PROXY_URL=http://192.168.1.x:8787/almanac
 *
 * Use your machine's LAN IP, not localhost — localhost on a phone is the phone.
 * Plain http only works in DEBUG builds: release builds block cleartext
 * traffic, so a release APK needs this deployed behind HTTPS.
 *
 * Called "example" because it is one. It has the guard rails a classroom demo
 * needs (fixed model, size caps, per-IP rate limit, timeouts). It has no auth:
 * anyone who finds the URL can use it up to the rate limit. For anything public,
 * add per-user auth (e.g. have the app send its Firebase ID token and verify it
 * here). A shared secret baked into the app would not help, since it can be
 * pulled out of the APK just like an API key.
 */

const http = require("http");

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GEMINI_API_KEY;

// The server decides the model. Letting the client choose would let anyone
// with the URL pick the most expensive one.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Caps so a malformed or hostile client can't ask for an expensive generation.
const MAX_TOKENS_CEILING = 1024;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TURNS = 24;
const MAX_SYSTEM_CHARS = 8000;
const UPSTREAM_TIMEOUT_MS = 30000;

const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 30;
const HOUR_MS = 60 * 60 * 1000;

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set. Refusing to start.");
  process.exit(1);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, message) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message } }));
}

/**
 * Fixed-window counter per client IP, in memory. Fine for one process; use a
 * shared store (Redis etc.) if you run several.
 */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > HOUR_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_PER_HOUR;
}
// Drop expired windows so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of hits) if (now - e.start > HOUR_MS) hits.delete(ip);
}, HOUR_MS).unref();

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Request body too large"));
        req.pause();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Accept only the shape the app sends: text parts, user/model roles. */
function validate(payload) {
  const { contents, systemInstruction } = payload || {};
  if (!Array.isArray(contents) || contents.length === 0 || contents.length > MAX_TURNS) {
    throw new HttpError(400, "contents must be a non-empty array of at most " + MAX_TURNS + " turns");
  }
  const cleanContents = contents.map((turn) => {
    if (!turn || !["user", "model"].includes(turn.role) || !Array.isArray(turn.parts)) {
      throw new HttpError(400, "Each turn needs role user|model and a parts array");
    }
    return {
      role: turn.role,
      parts: turn.parts.map((p) => {
        if (typeof p?.text !== "string") throw new HttpError(400, "Only text parts are allowed");
        return { text: p.text };
      }),
    };
  });

  let cleanSystem;
  if (systemInstruction) {
    const text = (systemInstruction.parts || []).map((p) => p?.text || "").join("\n");
    if (text.length > MAX_SYSTEM_CHARS) throw new HttpError(400, "systemInstruction too long");
    cleanSystem = { parts: [{ text }] };
  }
  return { contents: cleanContents, systemInstruction: cleanSystem };
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/almanac")) {
    return sendJson(res, 404, "Not found");
  }

  const ip = req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    res.setHeader("Retry-After", "3600");
    return sendJson(res, 429, "Too many requests. Try again later.");
  }

  let upstreamBody;
  try {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, "Invalid JSON body");
    }
    // Rebuild the upstream request field by field rather than forwarding the
    // client's body wholesale, so a client can't smuggle in extra parameters.
    upstreamBody = {
      ...validate(payload),
      generationConfig: {
        maxOutputTokens: Math.min(
          Number(payload.generationConfig?.maxOutputTokens) || 512,
          MAX_TOKENS_CEILING
        ),
      },
    };
  } catch (e) {
    return sendJson(res, e.status || 400, e.message);
  }

  const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL
  )}:streamGenerateContent?alt=sse`;

  // One controller for both "upstream took too long" and "the phone went away".
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  // res "close" (not req "close", which has already fired once the body was
  // read) tells us the client disconnected: stop paying for tokens nobody reads.
  res.on("close", () => controller.abort());

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      // Log the provider's detail here; don't hand it to the app verbatim.
      console.error("[almanac-proxy] upstream", upstream.status, await upstream.text());
      const status = upstream.status === 429 ? 429 : 502;
      return sendJson(res, status, status === 429 ? "The model is busy. Try again shortly." : "Upstream request failed");
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Without this, a proxy in front of this one may buffer the whole
      // response and the app will get everything at once instead of streaming.
      "X-Accel-Buffering": "no",
    });

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    if (controller.signal.aborted && res.destroyed) return; // client left
    console.error("[almanac-proxy]", err.message);
    if (!res.headersSent) sendJson(res, 504, "Upstream request timed out or failed");
    else res.end();
  } finally {
    clearTimeout(timer);
  }
});

server.listen(PORT, () => {
  console.log(`Almanac proxy listening on http://0.0.0.0:${PORT}/almanac (model ${MODEL})`);
});
