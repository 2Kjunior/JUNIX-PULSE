/**
 * Layout des 5 onglets principaux de Junix Pulse.
 *
 * Tab bar custom :
 * - Glassmorphism flottant avec capsule dégradée sur l'onglet actif
 * - Safe area bottom pour Android (gesture navigation bar)
 * - Label qui fade-in/fade-out selon l'état actif
 * - Légère élévation 3D avec ombre portée
 */
import { GlowCardTokens, Radius, Spacing } from "@/constants/theme";
import type { ThemePalette } from "@/constants/palettes";
import { useReduceTransparency } from "@/hooks/use-reduce-transparency";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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
import { MascotTabsLayer } from "@/features/mascot/MascotTabsLayer";
import { MessageKey, useT } from "@/i18n";

// ─── Config des onglets ────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabConfig {
  name: string;
  titleKey: MessageKey;
  icon: IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  {
    name: "index",
    titleKey: "tab.home",
    icon: "home-outline",
    iconFocused: "home",
  },
  {
    name: "reminders",
    titleKey: "tab.reminders",
    icon: "notifications-outline",
    iconFocused: "notifications",
  },
  {
    name: "tasks",
    titleKey: "tab.tasks",
    icon: "checkmark-circle-outline",
    iconFocused: "checkmark-circle",
  },
  {
    name: "calendar",
    titleKey: "tab.calendar",
    icon: "calendar-outline",
    iconFocused: "calendar",
  },
  {
    name: "people",
    titleKey: "tab.people",
    icon: "people-outline",
    iconFocused: "people",
  },
];

// ─── Bouton d'onglet individuel avec retour haptique & effet 3D ────────────────

interface TabItemProps {
  tab: TabConfig;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ tab, focused, onPress }: TabItemProps) {
  const t = useT();
  const title = t(tab.titleKey);
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
  }, [focused, activeBgOpacity, iconTranslateY]);

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
      accessibilityLabel={title}
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
          {title}
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
  const reduceTransparency = useReduceTransparency();

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
        <View style={[styles.tabBarInner, reduceTransparency && styles.tabBarInnerOpaque]}>
          {/* Android affiche un simple voile sans BlurTargetView : la barre y reste translucide sans flou */}
          {!reduceTransparency && Platform.OS !== "android" && (
            <BlurView
              intensity={GlowCardTokens.glass.blurIntensity}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
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
  const t = useT();
  return (
    <>
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
          options={{ title: t(tab.titleKey) }}
        />
      ))}
      {/* Pulse n'a pas de bouton dans la barre (elle ne dessine que TABS) mais doit rester
          joignable : depuis SDK 58, `href: null` cache l'onglet ET redirige toute navigation vers lui. */}
      <Tabs.Screen
        name="pulse"
        options={{ title: "Pulse" }}
      />
    </Tabs>
    {/* Guidance de la mascotte sur les onglets : visite de l'Accueil et astuces de première visite */}
    <MascotTabsLayer />
    </>
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
      // Ombre portée sur iOS ; pas d'elevation Android, elle se verrait à travers le verre
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'dark' ? 0.65 : 0.15,
      shadowRadius: 20,
    },
    tabBarInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: theme.glass.nav.backgroundColor,
      borderRadius: Radius.full,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.glass.nav.borderColor,
      overflow: "hidden",
    },
    tabBarInnerOpaque: {
      backgroundColor: theme.surface.container,
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

