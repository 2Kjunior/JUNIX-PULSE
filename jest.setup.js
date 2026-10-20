/**
 * jest.setup.js — Setup global pour les tests Jest de Junix Pulse.
 *
 * Mock des modules natifs qui ne sont pas disponibles dans l'environnement
 * de test Node.js : react-native-reanimated, react-native-worklets,
 * expo-linear-gradient.
 */

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (component) => component,
    },
    useSharedValue: (initialValue) => ({ value: initialValue }),
    useAnimatedStyle: (styleFunc) => styleFunc(),
    useAnimatedProps: (propsFunc) => propsFunc(),
    interpolate: (value, input, output) => {
      if (value <= input[0]) return output[0];
      if (value >= input[input.length - 1]) return output[output.length - 1];
      return output[0] + ((value - input[0]) * (output[output.length - 1] - output[0])) / (input[input.length - 1] - input[0]);
    },
    withTiming: (toValue, _config, cb) => {
      if (cb) cb(true);
      return toValue;
    },
    withSpring: (toValue, _config, cb) => {
      if (cb) cb(true);
      return toValue;
    },
    withRepeat: (anim) => anim,
    withSequence: (...anims) => anims[0],
    withDelay: (_delay, anim) => anim,
    useReducedMotion: () => false,
    Easing: {
      bezier: () => (t) => t,
      in: (fn) => fn,
      out: (fn) => fn,
      inOut: (fn) => fn,
      ease: (t) => t,
      linear: (t) => t,
      quad: (t) => t,
      cubic: (t) => t,
      sin: (t) => t,
      circle: (t) => t,
      exp: (t) => t,
    },
    runOnJS: (fn) => fn,
    // Animated components
    View,
  };
});

// Mock @expo/vector-icons (évite le chargement asynchrone des polices en environnement de test)
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: View,
    MaterialIcons: View,
    FontAwesome: View,
    Feather: View,
  };
});

// Mock react-native-worklets (dépendance de reanimated)
jest.mock('react-native-worklets', () => ({
  __esModule: true,
  default: {},
}));

// Mock expo-linear-gradient (composant natif)
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: View,
  };
});

// Mock useColorScheme (hook natif)
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

// Mock expo-secure-store (stockage chiffré natif en mémoire pour Jest)
const mockSecureStoreMap = new Map();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockSecureStoreMap.get(key) ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStoreMap.set(key, String(value));
  }),
  deleteItemAsync: jest.fn(async (key) => {
    mockSecureStoreMap.delete(key);
  }),
  isAvailableAsync: jest.fn(async () => true),
  __resetMockStorage: () => mockSecureStoreMap.clear(),
}));

// Timeout global à 30s pour absorber la charge CPU des tests cryptographiques en environnement Windows
jest.setTimeout(30000);
