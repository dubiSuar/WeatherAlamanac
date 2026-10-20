module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // These packages ship untranspiled ES modules, so Jest has to run them
  // through Babel instead of skipping node_modules as it does by default.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-async-storage|@react-native-google-signin|react-native-svg)/)',
  ],
};
