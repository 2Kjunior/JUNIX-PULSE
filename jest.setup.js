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
    withTiming: (toValue) => toValue,
    useReducedMotion: () => false,
    // Animated components
    View,
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
