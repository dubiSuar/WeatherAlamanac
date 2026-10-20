module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // The AI proxy runs on Node, not in the app.
      files: ['server/**/*.js'],
      env: { node: true, es2022: true },
    },
    {
      files: ['jest.setup.js', '__tests__/**/*.js'],
      env: { jest: true },
    },
  ],
};
