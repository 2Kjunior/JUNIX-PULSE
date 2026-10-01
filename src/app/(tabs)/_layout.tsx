/**
 * Layout des 5 onglets principaux de Junix Pulse.
 *
 * Tab bar custom :
 * - Glassmorphism flottant avec capsule dégradée sur l'onglet actif
 * - Safe area bottom pour Android (gesture navigation bar)
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
  Primary,
  OnSurface,
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

// ─── Bouton d'onglet individuel avec retour haptique & effet 3D ────────────────

interface TabItemProps {
  tab: TabConfig;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ tab, focused, onPress }: TabItemProps) {
  const pressScale = useSharedValue(1);
  const activeBgOpacity = useSharedValue(focused ? 1 : 0);
  const iconTranslateY = useSharedValue(focused ? -2 : 0);

  useEffect(() => {
    if (focused) {
      activeBgOpacity.value = withTiming(1, { duration: 200 });
      iconTranslateY.value = withSpring(-2, { damping: 14, stiffness: 220 });
    } else {
      activeBgOpacity.value = withTiming(0, { duration: 160 });
      iconTranslateY.value = withSpring(0, { damping: 14, stiffness: 220 });
    }
  }, [focused]);

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: activeBgOpacity.value,
  }));



  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconTranslateY.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.9, { damping: 12, stiffness: 350 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 12, stiffness: 250 });
      }}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={tab.title}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={[styles.tabItemContent, animatedItemStyle]}>
        {/* Capsule active avec contour et dégradé subtil (façon segmented control des tâches) */}
        <Animated.View style={[styles.activeCapsule, animatedBgStyle]}>
          <LinearGradient
            colors={['rgba(208, 188, 255, 0.16)', 'rgba(123, 208, 255, 0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeCapsuleGradient}
          />
        </Animated.View>



        {/* Icône animée */}
        <Animated.View style={animatedIconStyle}>
          <Ionicons
            name={focused ? tab.iconFocused : tab.icon}
            size={focused ? 22 : 21}
            color={focused ? Primary.default : OnSurface.disabled}
          />
        </Animated.View>

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            focused ? styles.tabLabelFocused : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
        >
          {tab.title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Tab Bar custom flottante ──────────────────────────────────────────────────

type CustomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Sur Android : garantir un espace net au-dessus de la barre système (gestes ou 3 boutons)
  const bottomMargin = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8) + (Platform.OS === 'android' ? 10 : 4);

  return (
    <View
      style={[styles.outerContainer, { marginBottom: bottomMargin }]}
      pointerEvents="box-none"
    >
      {/* Capsule flottante 3D avec bordure dégradée */}
      <LinearGradient
        colors={[
          'rgba(208, 188, 255, 0.28)',
          'rgba(123, 208, 255, 0.12)',
          'rgba(255, 255, 255, 0.05)',
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  gradientBorder: {
    width: '100%',
    borderRadius: Radius.full,
    padding: 1.2,
    // Ombre 3D portée (iOS et Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 24,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20, 19, 26, 0.96)',
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: Radius.full,
    position: 'relative',
    minHeight: 48,
    width: '100%',
  },
  activeCapsule: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.32)',
  },
  activeCapsuleGradient: {
    flex: 1,
  },

  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelFocused: {
    color: Primary.default,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: OnSurface.disabled,
    fontFamily: 'Inter-Medium',
  },
});
