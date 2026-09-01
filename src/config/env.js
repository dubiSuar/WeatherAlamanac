import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  GOOGLE_WEB_CLIENT_ID as WEB_CLIENT_ID,
  AI_PROXY_URL,
  AI_MODEL,
  AI_DEV_API_KEY,
} from "@env";

/**
 * Values come from `.env` via the react-native-dotenv babel plugin, which
 * inlines them at build time. Two consequences worth knowing:
 *
 * - The imports have to be static and named. You cannot do `env[key]` or
 *   destructure dynamically; there is no runtime object to index into.
 * - Editing `.env` requires a bundler restart with a cleared cache
 *   (`npm start -- --reset-cache`). The old values are baked into the
 *   transform cache otherwise, and you will chase a "why is my key wrong"
 *   bug that isn't one.
 *
 * Anything inlined here is readable in the shipped bundle. Firebase web config
 * is designed to be public; a model provider key is not.
 */

export const FIREBASE_CONFIG = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

export const GOOGLE_WEB_CLIENT_ID = WEB_CLIENT_ID;

export const FIREBASE_READY = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId
);

/**
 * How the app talks to the model.
 *
 * `proxy` — the app POSTs to a server you control, which holds the API key and
 * forwards to the provider. This is the only mode you should ship.
 *
 * `direct` — the key is embedded in the app. Anyone can extract it from the
 * bundle in about a minute and spend your credits. Allowed in __DEV__ only, so
 * a forgotten key can't reach a release build.
 */
const proxyUrl = AI_PROXY_URL || null;
const devApiKey = AI_DEV_API_KEY || null;

export const AI = {
  proxyUrl,
  model: AI_MODEL || "claude-sonnet-5",
  devApiKey: __DEV__ ? devApiKey : null,
  mode: proxyUrl ? "proxy" : __DEV__ && devApiKey ? "direct" : "unconfigured",
};

if (__DEV__ && AI.mode === "direct") {
  console.warn(
    "[Almanac] Calling the model API directly with an embedded key. Fine for " +
      "local development; set AI_PROXY_URL before you ship a build."
  );
}
