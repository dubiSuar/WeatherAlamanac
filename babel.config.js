module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",
        // Missing variables become `undefined` rather than failing the build.
        // src/config/env.js already handles absent config gracefully
        // (FIREBASE_READY, AI.mode === "unconfigured"), and AI_MODEL and
        // AI_DEV_API_KEY are genuinely optional — a hard failure would mean
        // you couldn't run the app without lines you don't need.
        allowUndefined: true,
      },
    ],
  ],
};
