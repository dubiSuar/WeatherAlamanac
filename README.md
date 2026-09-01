# Weather (React Native CLI)

A weather app with an assistant, **Almanac**, that reads the current forecast
and answers questions about it. Firebase email/password + Google auth sits in
front.

Bare React Native — no Expo. Native module setup is manual and lives in
[NATIVE_SETUP.md](NATIVE_SETUP.md).

## Stack

- **React Native CLI** (bare workflow)
- **Firebase JS SDK** — `firebase/auth`, `firebase/firestore`
- **Claude Messages API** — streamed, through a proxy you run
- `react-native-linear-gradient` + `@react-native-community/blur` — gradients
  and translucent material
- `@react-native-community/geolocation` — current location
- `react-native-svg` — temperature curve, sun arc
- `lucide-react-native` — icons
- `react-native-dotenv` — `.env` inlined as the `@env` module
- **Open-Meteo** (forecast + geocoding) and **BigDataCloud** (reverse geocode),
  both keyless

Styling is plain `StyleSheet` objects against tokens in `src/theme/`. No
Tailwind/NativeWind — see [Styling](#styling).

## Setup

### 1. Scaffold, then copy this in

```bash
npx @react-native-community/cli@latest init WeatherAlmanac
cd WeatherAlmanac
```

Copy from this archive:

| Copy over the scaffold | Merge by hand | Do **not** copy |
| --- | --- | --- |
| `src/`, `server/`, `App.js`, `index.js`, `babel.config.js`, `.env.example`, `README.md`, `NATIVE_SETUP.md` | `app.json` — keep the `name` the CLI generated, since the native projects reference it | `package.deps.json` (reference list, not a manifest), `metro.config.js` if you've already customised yours |

Keep the scaffold's `package.json`. Mine is deliberately absent: pinning
`react-native` here would downgrade whatever version you just scaffolded into
an inconsistent state with your native projects.

### 2. Dependencies

```bash
npm install \
  @react-native-async-storage/async-storage \
  @react-native-community/blur \
  @react-native-community/geolocation \
  @react-native-google-signin/google-signin \
  @react-navigation/native \
  @react-navigation/native-stack \
  firebase \
  lucide-react-native \
  react-native-linear-gradient \
  react-native-safe-area-context \
  react-native-screens \
  react-native-svg

npm install -D react-native-dotenv

cd ios && pod install && cd ..
```

### 3. Native configuration

**Read [NATIVE_SETUP.md](NATIVE_SETUP.md) before running.** Location
permissions, the Google Sign-In URL scheme, the `react-native-screens`
`MainActivity` change, the Google Services gradle plugin, and the Android SHA-1
fingerprint are all manual, and every one of them fails silently or with a
useless error if missed.

### 4. Firebase

Create a project at console.firebase.google.com.

- Authentication → Sign-in method → enable **Email/Password** and **Google**.
  Enabling Google auto-creates a Web client OAuth ID; copy it.
- Enable **Firestore Database**.
- `cp .env.example .env` and fill in the values, including
  `GOOGLE_WEB_CLIENT_ID` (the *web* client, not iOS or Android).

### 5. Almanac

See below. The app runs fine without it; the assistant panel shows a setup
state instead of a briefing.

### 6. Run

```bash
npm start -- --reset-cache
npm run ios      # or: npm run android
```

`--reset-cache` is not optional after editing `.env`. `react-native-dotenv`
inlines the values at transform time, so stale ones survive in Metro's cache
and you will debug a config problem that no longer exists.

## Almanac

Two surfaces, both fed the same context:

- **Briefing** — a short read on current conditions, generated on load and
  shown under the temperature. Cached per location + hour + unit.
- **Ask sheet** — a conversation about the forecast, opened from the briefing.

### Connecting it

The app must not hold a provider API key. Anyone with the binary can extract it
from the bundle. So the app talks to an endpoint you control, which holds the
key:

```
ANTHROPIC_API_KEY=sk-ant-... node server/proxy.example.js
```

then in `.env`:

```
AI_PROXY_URL=http://192.168.1.x:8787/almanac
```

Use your machine's LAN IP — `localhost` on a phone is the phone.

`server/proxy.example.js` is a zero-dependency reference implementation. It is
called *example* for a reason: before it goes anywhere real it needs auth on
the endpoint, per-user rate limiting, and TLS. Right now anyone who can reach
it can spend your credits.

For quick local work you can set `AI_DEV_API_KEY` instead and skip the proxy.
`src/config/env.js` hard-nulls it outside `__DEV__` so it cannot reach a
release build.

### What it sees

`src/services/weatherContext.js` compresses the Open-Meteo response into a
compact block: current conditions, the next 12 hours, the next 5 days, sun
times — resolved from WMO codes into words and pre-converted into whichever
unit is on screen. The model sees exactly what the UI shows, so the answer and
the display can't disagree.

It explicitly does **not** cover air quality, pollen, snow depth, road or sea
conditions, or any official weather warning, and the system prompt says so.
Without that the model answers those questions anyway, plausibly and wrongly.
It's also instructed to point at national weather services for severe weather
rather than telling anyone an activity is safe.

### Streaming on React Native

`src/services/aiClient.js` uses `XMLHttpRequest`, not `fetch`. RN's `fetch` is
a polyfill over XHR and doesn't implement `Response.body`, so
`res.body.getReader()` is undefined and incremental reads are impossible. XHR's
`onprogress` exposes a growing `responseText`, which the client diffs and
parses as SSE. If your proxy buffers instead of passing the stream through, it
falls back to parsing a whole JSON response.

Every call returns `{ promise, cancel }` so a generation can be stopped
mid-flight — used by the stop button and when a request is superseded.

## Project structure

```
index.js                        AppRegistry entry
App.js                          providers + NavigationContainer
app.json                        native component name
NATIVE_SETUP.md                 manual iOS/Android configuration
server/proxy.example.js         reference AI proxy (run separately)
src/
  config/env.js                 @env access; enforces proxy-vs-dev-key rule
  services/
    aiClient.js                 streaming Messages API client (XHR/SSE)
    weatherContext.js           forecast -> model context, system prompts
  hooks/
    useWeather.js               Open-Meteo fetch, poll, refresh
    useWeatherBriefing.js       the conditions read, cached
    useWeatherChat.js           conversation state
    usePreferences.js           AsyncStorage store (consumed via context)
    useCurrentLocation.js       geolocation + per-platform permission flow
    useReducedMotion.js         reduce-motion + reduce-transparency
  context/
    AuthContext.js
    PreferencesContext.js       shared preferences instance
  navigation/                   Root -> Auth | App (Weather, Settings)
  screens/
    auth/                       Login, Register (inline validation)
    weather/WeatherScreen.js
    settings/SettingsScreen.js
  components/
    ai/                         BriefingPanel, AskSheet, ChatMessage,
                                SuggestionChips
    weather/                    Hero, HourlyStrip, SunArc, MetricGrid,
                                DailyForecastList, SearchBar, Skeleton, Error
    ui/                         Material, PrimaryButton, Field
  theme/
    motion.js                   spring math, momentum projection, rubber-banding
    type.js                     type scale + colour tokens
    weatherThemes.js            WMO code -> gradient + icon
  utils/                        format, validate
```

## Design notes

**Motion.** `src/theme/motion.js` converts Apple's designer-facing spring
parameters (damping ratio + response) into RN's stiffness/damping/mass, with
the values Apple ships named. Default is critically damped — overshoot is
reserved for motion the user's own gesture put energy into.

The ask sheet tracks the finger 1:1 from the grab offset, rubber-bands past the
top, projects momentum on release to pick a snap point, and hands the release
velocity to the spring so there's no seam between dragging and animating. Its
`translateY` deliberately runs off the native driver: the native driver keeps
the value on the UI thread, so JS can't read the live position when a drag
interrupts a running spring, and interruptibility matters more than one bridge
hop.

**Accessibility.** Reduce Motion stops every loop, replaces slides with
cross-fades, and drops overshoot — but drag stays 1:1, because that's the user
moving something, not the interface animating at them. Reduce Transparency
makes `Material` frostier and near-opaque rather than removing the layer.

**Typography.** No custom typeface. The platform font already ships optical
sizing and legibility tuning. Tracking is per-size in `TYPE` — negative on
large text, positive on small caps — because a single global `letterSpacing`
is wrong somewhere.

**Material.** One primitive, three weights (`chrome`, `sheet`, `chip`). Weight
encodes hierarchy. Android falls back to a flat translucent fill because blur
is inconsistent across OEM skins. Note that
`@react-native-community/blur` does not composite a background colour behind
its own blur, so the tint is a sibling layer underneath the `BlurView` rather
than a style on it — putting the colour on the BlurView washes the blur out on
iOS.

## Styling

Everything uses `StyleSheet` objects against `src/theme/type.js`. The type
tokens (per-size tracking, tabular numerals) can't be expressed as Tailwind
classes or spread into `className`, which is why there's no NativeWind here.

If you want it: `npm i nativewind tailwindcss`, add `jsxImportSource:
"nativewind"` to the babel preset options and the `nativewind/babel` preset,
wrap `metro.config.js` in `withNativeWind`, and add `global.css` +
`tailwind.config.js`. It coexists with `StyleSheet` fine — you don't have to
convert anything.

## Still open

- [ ] **Firestore security rules** — `users/{uid}` is wide open in test mode.
      Lock it to `request.auth.uid == uid` before this is reachable by anyone
      else.
- [ ] **Proxy hardening** — auth, rate limiting, TLS (see above).
- [ ] Sync preferences to `users/{uid}` so saved cities follow the account
      rather than the device. Local AsyncStorage is the only store today.
- [ ] Sheet drag is handle-only. Dragging from the message list needs
      `react-native-gesture-handler` + `react-native-reanimated` to arbitrate
      scroll-vs-drag without jitter.
- [ ] Haptics on send, snap and error (`react-native-haptic-feedback`).
      Deliberately left out rather than added untested — a haptic on the wrong
      frame is worse than none.
- [ ] No test suite.

## Data

Forecast by [Open-Meteo](https://open-meteo.com), reverse geocoding by
[BigDataCloud](https://www.bigdatacloud.com). Both free, both keyless, both
rate-limited — worth checking their terms before this has real traffic.
