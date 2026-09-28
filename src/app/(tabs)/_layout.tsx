/**
 * Layout des 5 onglets principaux de Junix Pulse.
 *
 * Tab bar custom :
 * - Glassmorphism flottant avec blur et bordure violet subtil
 * - Safe area bottom pour Android (gesture navigation bar)
 * - Pill animé sous l'icône active (Reanimated + spring)
 * - Label qui fade-in/fade-out selon l'état actif
 * - Légère élévation 3D avec ombre portée
 */
import { Tabs } from 'expo-router';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect, type ComponentProps } from 'react';
import {
  Surface,
  Primary,
  OnSurface,
  Outline,
  Spacing,
  Radius,
} from '@/constants/theme';

// ─── Config des onglets ────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'index',    title: "Aujourd'hui", icon: 'sunny-outline',          iconFocused: 'sunny' },
  { name: 'tasks',   title: 'Tâches',       icon: 'checkmark-circle-outline', iconFocused: 'checkmark-circle' },
  { name: 'calendar',title: 'Calendrier',   icon: 'calendar-outline',        iconFocused: 'calendar' },
  { name: 'people',  title: 'Personnes',    icon: 'people-outline',          iconFocused: 'people' },
  { name: 'pulse',   title: 'Pulse',        icon: 'pulse-outline',           iconFocused: 'pulse' },
];

// ─── Bouton d'onglet individuel ────────────────────────────────────────────────

interface TabItemProps {
  tab: TabConfig;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ tab, focused, onPress }: TabItemProps) {
  const pillWidth = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const labelOpacity = useSharedValue(focused ? 1 : 0.6);
  const translateY = useSharedValue(focused ? 0 : 2);

  useEffect(() => {
    if (focused) {
      // Pill qui grandit
      pillWidth.value = withSpring(40, { damping: 14, stiffness: 200 });
      pillOpacity.value = withTiming(1, { duration: 180 });
      // Icône qui rebondit légèrement
      iconScale.value = withSpring(1.15, { damping: 10, stiffness: 220 });
      // Label qui monte
      labelOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
    } else {
      pillWidth.value = withSpring(0, { damping: 14, stiffness: 200 });
      pillOpacity.value = withTiming(0, { duration: 120 });
      iconScale.value = withSpring(1, { damping: 12, stiffness: 180 });
      labelOpacity.value = withTiming(0.55, { duration: 200, easing: Easing.out(Easing.quad) });
      translateY.value = withSpring(2, { damping: 14, stiffness: 200 });
    }
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    opacity: pillOpacity.value,
  }));

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={tab.title}
      accessibilityState={{ selected: focused }}
    >
      {/* Pill indicateur */}
      <Animated.View style={[styles.pill, pillStyle]} />

      {/* Icône animée */}
      <Animated.View style={iconContainerStyle}>
        <Ionicons
          name={focused ? tab.iconFocused : tab.icon}
          size={24}
          color={focused ? Primary.default : OnSurface.disabled}
        />
      </Animated.View>

      {/* Label */}
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: focused ? Primary.default : OnSurface.disabled },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {tab.title}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─── Tab Bar custom ────────────────────────────────────────────────────────────

type CustomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Sur Android avec gesture navigation, insets.bottom est la hauteur de la barre
  // On ajoute une marge supplémentaire pour ne jamais coller au trait
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0) + 8;

  return (
    <View style={[styles.outerContainer, { paddingBottom: bottomPadding }]}>
      {/* Glassmorphism card */}
      <LinearGradient
        colors={[
          'rgba(208, 188, 255, 0.12)',
          'rgba(123, 208, 255, 0.06)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.tabBarInner}>
          {TABS.map((tab, index) => (
            <TabItem
              key={tab.name}
              tab={tab}
              focused={state.index === index}
              onPress={() => navigation.navigate(tab.name)}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Layout principal ──────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title }}
        />
      ))}
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    // Fond qui prolonge la surface jusqu'au bas de l'écran
    backgroundColor: Surface.base,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    // Ombre douce vers le haut (iOS + Android elevation)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 24,
  },
  gradientBorder: {
    borderRadius: Radius.xl,
    padding: 1, // Épaisseur du contour gradient
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 19, 23, 0.94)', // Surface.base avec transparence
    borderRadius: Radius.xl - 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xs,
    // Légère transparence pour l'effet verre
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 50,
    paddingVertical: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: Primary.default,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
