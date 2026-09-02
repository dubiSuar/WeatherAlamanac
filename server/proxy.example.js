/**
 * Reference proxy for Almanac using the Gemini API.
 *
 * The app must not hold a provider API key — anyone with the binary can pull it
 * out of the bundle. This sits between them: the app POSTs a message payload,
 * this adds the key and streams the response straight back.
 *
 * Zero dependencies, Node 18+ (needs global fetch and web streams).
 *
 *   GEMINI_API_KEY=AIzaSy... node server/proxy.example.js
 *
 * Then point the app at it in .env:
 *
 *   AI_PROXY_URL=http://192.168.1.x:8787/almanac
 *
 * Use your machine's LAN IP, not localhost — localhost on a phone is the phone.
 *
 * Called "example" because it is one. Before this goes anywhere real you need
 * auth on the endpoint (right now anyone who can reach it can spend your
 * credits), per-user rate limiting, and TLS.
 */

const http = require("http");

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GEMINI_API_KEY;

// Caps so a malformed or hostile client can't ask for an expensive generation.
const MAX_TOKENS_CEILING = 1024;
const MAX_BODY_BYTES = 64 * 1024;

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set. Refusing to start.");
  process.exit(1);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/almanac")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Not found" } }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
    return;
  }

  // Rebuild the upstream request field by field rather than forwarding the
  // client's body wholesale — that way a client can't smuggle in extra
  // parameters.
  const upstreamBody = {
    contents: payload.contents,
    systemInstruction: payload.systemInstruction,
    generationConfig: {
      maxOutputTokens: Math.min(
        payload.generationConfig?.maxOutputTokens || 512,
        MAX_TOKENS_CEILING
      ),
    },
  };

  const model = payload.model || "gemini-1.5-flash";
  const UPSTREAM = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(text);
      return;
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
    // If the phone disconnects, stop paying for tokens nobody will read.
    req.on("close", () => reader.cancel().catch(() => {}));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error("[almanac-proxy]", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Upstream request failed" } }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`Almanac proxy listening on http://0.0.0.0:${PORT}/almanac`);
});
