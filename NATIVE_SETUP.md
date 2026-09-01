# Native setup

Bare React Native has no config plugins, so the things `app.json` did on Expo
are manual edits to the iOS and Android projects. Every item below is required
for something in this app to work, and most of them fail *silently* if skipped
— which is why each one says what breaks.

Paths assume you scaffolded with the project name `WeatherAlmanac`. Substitute
your own.

---

## iOS

### 1. Location permission string

`ios/WeatherAlmanac/Info.plist`, inside the top-level `<dict>`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Weather uses your location to show local conditions.</string>
```

**If skipped:** the permission dialog never appears, `requestAuthorization`
calls neither callback, and the location button spins forever. No error is
logged. This is the single most common "location is broken" cause in bare RN.

### 2. Google Sign-In URL scheme

Drag `GoogleService-Info.plist` (from Firebase → Project settings → your iOS
app) into the Xcode project — into the target, with "Copy items if needed"
checked. Then open it, copy the `REVERSED_CLIENT_ID` value, and add to
`Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.PASTE-REVERSED-CLIENT-ID-HERE</string>
    </array>
  </dict>
</array>
```

**If skipped:** Google sign-in opens the browser and never comes back.

### 3. Pods

```bash
cd ios && pod install && cd ..
```

Autolinking picks up every library here. Re-run this after adding any native
dependency, and after any `npm install` that changes one.

### 4. Blur on the simulator

`@react-native-community/blur` renders correctly on device but can look flat or
black on some simulator/OS combinations. Check the header and ask sheet on a
real device before concluding `Material` is broken.

---

## Android

### 1. Location permissions

`android/app/src/main/AndroidManifest.xml`, above `<application>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Declaring them is not the same as being granted them — the runtime request is
already handled in `src/hooks/useCurrentLocation.js` via `PermissionsAndroid`.
Both are needed.

**If skipped:** `getCurrentPosition` fails immediately with a permission error.

### 2. react-native-screens

`android/app/src/main/java/.../MainActivity.kt`:

```kotlin
import android.os.Bundle

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
  // ...rest of the generated class
}
```

Note `super.onCreate(null)`, not `super.onCreate(savedInstanceState)`. This is
in the react-native-screens docs and looks like a mistake, but passing the real
bundle lets Android try to restore Fragment state that no longer exists.

**If skipped:** the app crashes on rotation or when returning from the
background.

### 3. Google Services plugin

Put `google-services.json` (Firebase → your Android app) at
`android/app/google-services.json`.

`android/build.gradle` — in `buildscript { dependencies { ... } }`:

```gradle
classpath("com.google.gms:google-services:4.4.2")
```

`android/app/build.gradle` — at the top, after the existing `apply plugin`
lines:

```gradle
apply plugin: "com.google.gms.google-services"
```

### 4. SHA-1 fingerprint — the one everybody misses

Google Sign-In on Android will not work until your signing certificate's SHA-1
is registered in Firebase.

```bash
cd android && ./gradlew signingReport
```

Copy the `SHA1` under `Variant: debug`, then add it in Firebase → Project
settings → your Android app → Add fingerprint. Re-download
`google-services.json` afterwards.

**If skipped:** sign-in fails with `DEVELOPER_ERROR` and nothing more
specific. You need to repeat this for your release keystore, and again for
Play App Signing's certificate if you use it.

### 5. Cleartext HTTP for the local AI proxy

Only needed while testing the proxy over plain HTTP on your LAN. Android 9+
blocks cleartext by default.

`android/app/src/debug/AndroidManifest.xml`:

```xml
<application android:usesCleartextTraffic="true" tools:ignore="GoogleAppIndexingWarning" />
```

Put it in the **debug** manifest, not `main`, so it can't reach a release
build. **If skipped:** every Almanac request fails with a network error while
the forecast loads fine, because Open-Meteo is HTTPS and your proxy isn't.

---

## New Architecture

Recent RN versions enable Fabric/TurboModules by default. Nothing in this app's
own code depends on the old architecture — `PanResponder`, `Animated`,
`Modal` and `AppRegistry` are all supported — but the third-party native
libraries are the risk surface, `@react-native-community/blur` most of all.

If the header or ask sheet renders as a solid block or crashes on mount, test
with it off before debugging further. In `android/gradle.properties`:

```
newArchEnabled=false
```

and for iOS, `cd ios && RCT_NEW_ARCH_ENABLED=0 pod install`.

Treat that as a diagnostic step, not a destination — I have not run this on a
device under either architecture.

---

## Verifying

```bash
npm start -- --reset-cache      # required after any .env change
npm run ios                     # or: npm run android
```

Order to check things in, because each depends on the last:

1. App boots to the login screen — entry point, gradients and fonts are fine.
2. Email/password sign-up works — Firebase config reached the bundle.
3. Google sign-in works — plists, URL scheme, SHA-1.
4. Forecast loads for the default city (Kyoto) — plain networking.
5. Location button resolves your city — permission strings and manifest.
6. Almanac briefing streams in under the temperature — proxy reachable,
   cleartext allowed on Android.
