/* eslint-env jest */

// Native modules have no implementation under Jest. Swap in small fakes so
// pure logic that happens to import them (directly or transitively) can load.

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn(async key => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

jest.mock('@react-native-community/geolocation', () => ({
  setRNConfiguration: jest.fn(),
  requestAuthorization: jest.fn(),
  getCurrentPosition: jest.fn(),
}));

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// Icons are irrelevant to logic tests; any named import resolves to a stub
// component name. (The package ships .mjs files the preset doesn't transform.)
jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: (_, name) => (name === '__esModule' ? false : String(name)) }),
);
