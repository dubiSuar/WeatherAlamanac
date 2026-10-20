# WeatherAlmanac (React Native CLI)

A weather app with an assistant, **Almanac**, that reads the current forecast
and answers questions about it. Onboarding, then Firebase email/password +
Google sign-in, sits in front. Built as a teaching sample: the comments explain
*why*, not just *what*.

Bare React Native, no Expo. Native module notes live in
[NATIVE_SETUP.md](NATIVE_SETUP.md).

## Stack

- **React Native 0.87** (bare workflow, New Architecture, Hermes)
- **Firebase JS SDK**: `firebase/auth`, `firebase/firestore`
- **Google Gemini API**: streamed, through a proxy you run
- `react-native-linear-gradient` + `@react-native-community/blur`: gradients
  and translucent material
- `@react-native-community/geolocation`: current location
- `react-native-svg`: temperature curve, sun arc
- `lucide-react-native`: icons
- `react-native-dotenv`: `.env` inlined as the `@env` module
- **Open-Meteo** (forecast + geocoding) and **BigDataCloud** (reverse geocode),
  both keyless

## Setup

### 1. Prerequisites

- Node 22 or newer
- JDK 17 and Android Studio (Android SDK platform 37, build-tools 37.0.0,
  NDK 27.1.12297006). Set `ANDROID_HOME`, or create `android/local.properties`
  with `sdk.dir=...`
- For iOS only: macOS, Xcode and CocoaPods

If any of these are new to you, follow the official
[environment setup guide](https://reactnative.dev/docs/set-up-your-environment).

### 2. Install

```bash
git clone <this repo>
cd WeatherAlmanac
npm install
cp .env.example .env
```

iOS only: `cd ios && pod install && cd ..`

### 3. Firebase (optional, needed for real sign-in)

Use **your own** Firebase project. Never reuse someone else's keys.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Authentication → Sign-in method → enable **Email/Password** and **Google**.
   Enabling Google auto-creates a *Web client* OAuth ID; copy it into
   `GOOGLE_WEB_CLIENT_ID`.
3. Enable **Firestore Database** and set the rules shown in [Still open](#still-open).
4. Project settings → Your apps → add a **Web app**; copy its config into the
   `FIREBASE_*` lines of `.env`.
5. For Google sign-in on Android, also add an **Android app** with package
   `com.weatheralmanac` and register the SHA-1 of every key you sign with
   (`cd android && ./gradlew signingReport`). The debug key is enough while
   developing; add your release key's SHA-1 too (see
   [Building a release APK](#building-a-release-apk)).

You do **not** need `google-services.json` or the Google Services Gradle
plugin: the app uses the Firebase *JS* SDK, configured from `.env`.

Without Firebase values the app runs in a demo mode that skips sign-in, so you
can still explore the weather screens.

### 4. Almanac (optional)

See [Almanac](#almanac). Without it the assistant shows "Not connected".

### 5. Run

```bash
npm start -- --reset-cache
npm run android      # or: npm run ios
```

`--reset-cache` is not optional after editing `.env`. `react-native-dotenv`
inlines the values at transform time, so stale ones survive in Metro's cache
and you will debug a config problem that no longer exists.

### 6. Check your work

```bash
npm test        # unit tests for the pure logic (formatting, validation, parsing)
npm run lint
```

## Building a release APK

A release APK runs without Metro and installs on any Android phone.

**1. Create a release key (once).** Keep the file and its passwords safe and
out of git (`*.keystore` is already ignored). If you lose it, you can never
ship an update that installs over the old app.

```bash
keytool -genkeypair -v -keystore weatheralmanac-release.keystore -alias weatheralmanac -keyalg RSA -keysize 2048 -validity 10000
```

Move the file into `android/app/`.

**2. Tell Gradle about it** in `~/.gradle/gradle.properties` (your home
folder, *not* the repo, so the passwords are never committed):

```properties
WEATHERALMANAC_UPLOAD_STORE_FILE=weatheralmanac-release.keystore
WEATHERALMANAC_UPLOAD_STORE_PASSWORD=...
WEATHERALMANAC_UPLOAD_KEY_ALIAS=weatheralmanac
WEATHERALMANAC_UPLOAD_KEY_PASSWORD=...
```

Without these, `android/app/build.gradle` falls back to the public debug key
and prints a warning. That's fine for trying a release build on your own
phone, but don't hand that APK out.

**3. Register the release SHA-1 in Firebase** (`./gradlew signingReport` in
`android/`), or Google sign-in fails with `DEVELOPER_ERROR`.

**4. Build.**

```bash
npm run android:clean      # .env is baked in at build time; clean avoids stale values
npm run android:release
```

The APK lands in `android/app/build/outputs/apk/release/app-release.apk`. The
script builds only the two CPU architectures real phones use, which roughly
halves the size. Bump `versionCode` and `versionName` in
`android/app/build.gradle` for each new release.

Release builds block plain `http://`, so for Almanac to work in the APK,
`AI_PROXY_URL` must be an `https://` address.

## Almanac

Two surfaces, both fed the same context:

- **Briefing**: a short read on current conditions, generated on load and
  shown under the temperature. Cached per location + hour + unit.
- **Ask sheet**: a conversation about the forecast, opened from the briefing.

For the full step-by-step walkthrough (getting a key, the proxy, writing the
prompt rules and templates, usage limits and security), see
**[docs/AI_INTEGRATION_GUIDE.md](docs/AI_INTEGRATION_GUIDE.md)**.

### Connecting it

The app must not hold a provider API key, because anyone with the APK can
extract it from the bundle. So the app talks to an endpoint you control, which
holds the key. Get a Gemini key at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey), then:

```bash
GEMINI_API_KEY=your-key node server/proxy.example.js
```

and in `.env`:

```
AI_PROXY_URL=http://192.168.1.x:8787/almanac
```

Use your machine's LAN IP: `localhost` on a phone is the phone. Plain `http`
only works in debug builds; a release APK needs the proxy behind HTTPS.

`server/proxy.example.js` is a zero-dependency reference implementation. The
server, not the app, picks the model (`GEMINI_MODEL`). It validates the request
shape, caps sizes and output tokens, rate-limits per IP and times out stalled
requests. It has **no user authentication**, so anyone who finds the URL can
use it up to the rate limit. Add auth (for example, verify the user's Firebase
ID token) before you put it on the public internet.

For quick local work you can set `AI_DEV_API_KEY` instead and skip the proxy.
`src/config/env.js` hard-nulls it outside `__DEV__` so it cannot reach a
release build. Never commit your `.env`.

### What it sees

`src/services/weatherContext.js` compresses the Open-Meteo response into a
compact block: current conditions, the next 12 hours, the next 5 days, sun
times. Weather codes are resolved into words and values pre-converted into
whichever unit is on screen. The model sees exactly what the UI shows, so the
answer and the display can't disagree.

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
mid-flight: used by the stop button and when a request is superseded.

## Project structure

```
index.js                        AppRegistry entry
App.js                          providers + NavigationContainer
app.json                        native component name
NATIVE_SETUP.md                 native iOS/Android configuration notes
server/proxy.example.js         reference AI proxy (run separately)
__tests__/                      Jest unit tests (+ jest.setup.js mocks)
src/
  config/env.js                 @env access; enforces proxy-vs-dev-key rule
  services/
    aiClient.js                 streaming Gemini client (XHR/SSE)
    weatherContext.js           forecast -> model context, system prompts
  hooks/
    useWeather.js               Open-Meteo fetch, refresh on foreground
    useWeatherBriefing.js       the conditions read, cached
    useWeatherChat.js           conversation state
    usePreferences.js           AsyncStorage store (consumed via context)
    useCurrentLocation.js       geolocation + per-platform permission flow
    useReducedMotion.js         reduce-motion + reduce-transparency
  context/
    AuthContext.js
    PreferencesContext.js       shared preferences instance
  firebase/                     Firebase init, Google sign-in
  navigation/                   Root -> Auth (Onboarding, Login, Register) | App (Weather, Settings)
  screens/
    auth/                       Onboarding, Login, Register (inline validation)
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
  utils/                        format, validate, http (fetch with timeout)
```

## Design notes

**Motion.** `src/theme/motion.js` converts Apple's designer-facing spring
parameters (damping ratio + response) into RN's stiffness/damping/mass, with
the values Apple ships named. Default is critically damped; overshoot is
reserved for motion the user's own gesture put energy into.

The ask sheet tracks the finger 1:1 from the grab offset, rubber-bands past the
top, projects momentum on release to pick a snap point, and hands the release
velocity to the spring so there's no seam between dragging and animating. Its
`translateY` deliberately runs off the native driver: the native driver keeps
the value on the UI thread, so JS can't read the live position when a drag
interrupts a running spring, and interruptibility matters more than one bridge
hop.

**Accessibility.** Reduce Motion stops every loop, replaces slides with
cross-fades, and drops overshoot, but drag stays 1:1, because that's the user
moving something, not the interface animating at them. Reduce Transparency
makes `Material` frostier and near-opaque rather than removing the layer.

**Typography.** No custom typeface. The platform font already ships optical
sizing and legibility tuning. Tracking is per-size in `TYPE` (negative on
large text, positive on small caps) because a single global `letterSpacing`
is wrong somewhere.

**Material.** One primitive, three weights (`chrome`, `sheet`, `chip`). Weight
encodes hierarchy. Android falls back to a flat translucent fill because blur
is inconsistent across OEM skins. Note that `@react-native-community/blur`
does not composite a background colour behind its own blur, so the tint is a
sibling layer underneath the `BlurView` rather than a style on it. Putting the
colour on the BlurView washes the blur out on iOS.

**Networking.** Every request goes through `fetchWithTimeout` in
`src/utils/http.js` (RN's fetch never times out on its own), checks `res.ok`
before parsing, and guards against an older response overwriting a newer one:
a request id in `useWeather`, an `AbortController` per keystroke in the search
bar.

## Styling

Components use inline style objects built from the tokens in
`src/theme/type.js` (`TYPE`, `INK`, `ACCENT`), which is why `npm run lint`
reports `no-inline-styles` warnings. A good exercise: move the static ones
into `StyleSheet.create` at the bottom of each file, keeping inline only what
depends on props or state.

The type tokens (per-size tracking, tabular numerals) can't be expressed as
Tailwind classes, which is why there's no NativeWind here.

## Still open

- [ ] **Firestore security rules**: `users/{uid}` is wide open in test mode.
      Lock it down before anyone else can reach it:
      ```
      match /users/{uid} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      ```
- [ ] **Proxy auth**: verify a Firebase ID token in the proxy, and deploy it
      behind HTTPS.
- [ ] Sync preferences to `users/{uid}` so saved cities follow the account
      rather than the device. Local AsyncStorage is the only store today.
- [ ] Sheet drag is handle-only. Dragging from the message list needs
      `react-native-gesture-handler` + `react-native-reanimated` to arbitrate
      scroll-vs-drag without jitter.
- [ ] Haptics on send, snap and error (`react-native-haptic-feedback`).
- [ ] Tests for hooks and screens (`@testing-library/react-native`). Only pure
      logic is covered today.

## Data

Forecast and city search by [Open-Meteo](https://open-meteo.com) (CC BY 4.0;
place names from [GeoNames](https://www.geonames.org)), reverse geocoding by
[BigDataCloud](https://www.bigdatacloud.com). Both are free and keyless for
non-commercial use, and both are rate-limited, so check their terms before this
has real traffic.
