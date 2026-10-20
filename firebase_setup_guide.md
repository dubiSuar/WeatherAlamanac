# Firebase Setup Guide — WeatherAlmanac

Follow every section in order. By the end, your login screen will be fully functional with email/password and Google Sign-In.

---

## Part 1 — Create the Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.
2. Click **Add project**.
3. Name it **WeatherAlmanac** (or any name you like) and click **Continue**.
4. You can disable Google Analytics if you don't need it — it doesn't affect authentication.
5. Click **Create project** and wait for it to finish, then click **Continue**.

---

## Part 2 — Register a Web App (to get your API keys)

The React Native app uses Firebase's JavaScript/Web SDK, so you need to register a Web app first.

1. From the Project Overview page, click the **Web icon** (`</>`).
2. Give it a nickname like **WeatherAlmanac Web** and click **Register app**.
3. Firebase will show you a `firebaseConfig` object. Open your [`.env`](file:///e:/01%20GITHUB%20REPOS/WeatherAlmanac/.env) file and fill in these values from that object:

```env
FIREBASE_API_KEY=          ← firebaseConfig.apiKey
FIREBASE_AUTH_DOMAIN=      ← firebaseConfig.authDomain
FIREBASE_PROJECT_ID=       ← firebaseConfig.projectId
FIREBASE_STORAGE_BUCKET=   ← firebaseConfig.storageBucket
FIREBASE_MESSAGING_SENDER_ID= ← firebaseConfig.messagingSenderId
FIREBASE_APP_ID=           ← firebaseConfig.appId
```

4. Click **Continue to console** when done.

---

## Part 3 — Register the Android App (for Google Sign-In to work)

Google Sign-In on Android requires a registered Android app and a matching SHA-1 fingerprint.

1. On the Project Overview page, click **Add app → Android**.
2. For **Android package name**, enter exactly:
   ```
   com.weatheralmanac
   ```
3. For **Debug signing certificate SHA-1**, run `cd android && ./gradlew signingReport`
   and copy the `SHA1` line under `Variant: debug`. With the debug keystore that
   ships in this repo it is:
   ```
   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
   ```
   > [!TIP]
   > When you create a release keystore (README → Building a release APK), come
   > back and add its SHA-1 too, or Google sign-in fails in the release APK.
4. Click **Register app**.
5. Skip the **Download google-services.json** step: click **Next → Next →
   Continue to console**. This app uses the Firebase JS SDK, configured from
   `.env`, so it doesn't need that file. (If you download it anyway, it is
   gitignored; never commit it.)

---

## Part 4 — Enable Authentication Methods

1. In the left sidebar, click **Authentication** → **Get started**.
2. Click the **Sign-in method** tab.

### Enable Email/Password
1. Click **Email/Password**.
2. Toggle the first switch to **Enable**.
3. Click **Save**.

### Enable Google Sign-In
1. Click **Add new provider** → **Google**.
2. Toggle **Enable** on.
3. Set your **Project support email** to your Google account email.
4. Click **Save**.

---

## Part 5 — Get the Google Web Client ID

After enabling Google Sign-In, Firebase automatically creates an OAuth Web Client ID. This is what the `GOOGLE_WEB_CLIENT_ID` variable in `.env` needs.

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Make sure your Firebase project (`WeatherAlmanac`) is selected in the top-left project dropdown.
3. Under **OAuth 2.0 Client IDs**, find the entry named **Web client (auto created by Google Service)**.
4. Click on it and copy the full **Client ID** (it ends in `.apps.googleusercontent.com`).
5. Paste it into your `.env` file:
   ```env
   GOOGLE_WEB_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com
   ```

---

## Part 6 — Enable Firestore Database

The app stores user profile information in Firestore when someone registers.

1. In the Firebase Console sidebar, click **Firestore Database** → **Create database**.
2. Choose your preferred server location (closest to your users) and click **Next**.
3. Select **Start in test mode** and click **Enable**.

> [!WARNING]
> Test mode rules expire in **30 days**. Before you publish the app, go to Firestore → Rules and add proper rules so users can only access their own data.

---

## Part 7 — Fill in `.env` and Restart

Your [`.env`](file:///e:/01%20GITHUB%20REPOS/WeatherAlmanac/.env) file should now look like this (with real values):

```env
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=weatheralmanac.firebaseapp.com
FIREBASE_PROJECT_ID=weatheralmanac
FIREBASE_STORAGE_BUCKET=weatheralmanac.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
```

Once all values are filled in, restart Metro with a cache clear:

```bash
npm start -- --reset-cache
```

Then rebuild and run the app:

```bash
npm run android
```

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Web app registered → `.env` filled in with Firebase config
- [ ] Android app registered with SHA-1 fingerprint
- [ ] Email/Password sign-in enabled in Firebase Auth
- [ ] Google Sign-In enabled in Firebase Auth
- [ ] `GOOGLE_WEB_CLIENT_ID` filled in `.env`
- [ ] Firestore database created
- [ ] Metro restarted with `--reset-cache`
