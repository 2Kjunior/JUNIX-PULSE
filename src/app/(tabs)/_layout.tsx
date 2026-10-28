/**
 * Layout des 5 onglets principaux de Junix Pulse.
 *
 * Tab bar custom :
 * - Glassmorphism flottant avec capsule dégradée sur l'onglet actif
 * - Safe area bottom pour Android (gesture navigation bar)
 * - Label qui fade-in/fade-out selon l'état actif
 * - Légère élévation 3D avec ombre portée
 */
import { Radius, Spacing } from "@/constants/theme";
import type { ThemePalette } from "@/constants/palettes";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import { useEffect, type ComponentProps } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Config des onglets ────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  {
    name: "index",
    title: "Aujourd'hui",
    icon: "sunny-outline",
    iconFocused: "sunny",
  },
  {
    name: "tasks",
    title: "Tâches",
    icon: "checkmark-circle-outline",
    iconFocused: "checkmark-circle",
  },
  {
    name: "calendar",
    title: "Calendrier",
    icon: "calendar-outline",
    iconFocused: "calendar",
  },
  {
    name: "people",
    title: "Personnes",
    icon: "people-outline",
    iconFocused: "people",
  },
  {
    name: "pulse",
    title: "Pulse",
    icon: "pulse-outline",
    iconFocused: "pulse",
  },
];

// ─── Bouton d'onglet individuel avec retour haptique & effet 3D ────────────────

interface TabItemProps {
  tab: TabConfig;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ tab, focused, onPress }: TabItemProps) {
  const { palette, isDark } = useTheme();
  const styles = useThemedStyles(makeTabsLayoutStyles);
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
        {/* Capsule active avec contour et dégradé subtil */}
        <Animated.View style={[styles.activeCapsule, animatedBgStyle]}>
          <LinearGradient
            colors={
              isDark
                ? ["rgba(208, 188, 255, 0.16)", "rgba(123, 208, 255, 0.06)"]
                : ["rgba(103, 80, 164, 0.12)", "rgba(0, 100, 146, 0.05)"]
            }
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
            color={focused ? palette.primary.default : palette.onSurface.inactive}
          />
        </Animated.View>

        {/* Label */}
        <Text
          style={[
            styles.tabLabel,
            focused ? styles.tabLabelFocused : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.2}
        >
          {tab.title}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Tab Bar custom flottante ──────────────────────────────────────────────────

type CustomTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

function CustomTabBar({ state, navigateToTab }: CustomTabBarProps) {
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeTabsLayoutStyles);
  const insets = useSafeAreaInsets();

  // Sur Android : garantir un espace net au-dessus de la barre système (gestes ou 3 boutons)
  const bottomMargin =
    Math.max(insets.bottom, Platform.OS === "android" ? 16 : 8) +
    (Platform.OS === "android" ? 10 : 4);

  return (
    <View
      style={[styles.outerContainer, { marginBottom: bottomMargin }]}
      pointerEvents="box-none"
    >
      {/* Capsule flottante 3D avec bordure dégradée */}
      <LinearGradient
        colors={
          isDark
            ? [
                "rgba(208, 188, 255, 0.28)",
                "rgba(123, 208, 255, 0.12)",
                "rgba(255, 255, 255, 0.05)",
              ]
            : [
                "rgba(103, 80, 164, 0.20)",
                "rgba(0, 100, 146, 0.10)",
                "rgba(0, 0, 0, 0.04)",
              ]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.tabBarInner}>
          {TABS.map((tab, index) => {
            const route = state.routes.find((r) => r.name === tab.name) ?? state.routes[index];
            return (
              <TabItem
                key={tab.name}
                tab={tab}
                focused={state.index === index}
                onPress={() => {
                  if (route) {
                    navigateToTab(route.key);
                  }
                }}
              />
            );
          })}
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
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {TABS.map((tab) => (
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

const makeTabsLayoutStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    outerContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Spacing.md,
      backgroundColor: "transparent",
      alignItems: "center",
    },
    gradientBorder: {
      width: "100%",
      borderRadius: Radius.full,
      padding: 1.2,
      // Ombre 3D portée (iOS et Android)
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.65 : 0.15,
      shadowRadius: 20,
      elevation: 24,
    },
    tabBarInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: theme.surface.container,
      borderRadius: Radius.full,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.outline.variant,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    tabItemContent: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      paddingHorizontal: 2,
      borderRadius: Radius.full,
      position: "relative",
      minHeight: 48,
      width: "100%",
    },
    activeCapsule: {
      ...StyleSheet.absoluteFill,
      borderRadius: Radius.full,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.primary.default + "52",
    },
    activeCapsuleGradient: {
      flex: 1,
    },

    tabLabel: {
      fontSize: 10,
      letterSpacing: 0,
      marginTop: 2,
      textAlign: "center",
      paddingHorizontal: 2,
    },
    tabLabelFocused: {
      color: theme.primary.default,
      fontFamily: "Inter-Bold",
      fontWeight: "700",
    },
    tabLabelInactive: {
      color: theme.onSurface.inactive,
      fontFamily: "Inter-Medium",
    },
  });

