/**
 * Composant SplashAnimation pour Junix Pulse.
 * 100% conforme à la référence : docs/splash/junix-pulse-splash-reference.html
 * et au brief : docs/splash/BRIEF-splash-junix-pulse.md.
 *
 * Déroulé (4 secondes) :
 * - 0.0s à 0.95s : 3 orbes dégradés (violet / cyan) + carte verre liquide (forme goutte, scale 0.45 -> 1.0)
 * - 0.1s à 1.4s  : Logo enter (scale 0.9 -> 1.0, opacité 0 -> 1)
 * - 0.15s à 1.4s : Tracé de l'anneau dégradé dans le sens horaire depuis l'ouverture gauche
 * - 0.95s à 2.0s : Balayage intérieur (pulse + P) limité au cercle r=212
 * - 2.0s à 3.0s  : Double battement (symbole 1.05 & 1.035 + 2 ondes r1 & r2 + carte battement & reflet sheen)
 * - 2.35s à 3.15s: Texte "JUNIX PULSE" (montée 26px + balayage gauche -> droite)
 * - 3.5s à 4.0s  : Fondu de sortie (opacité 1 -> 0, scale 1 -> 1.04)
 */

import { createAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import {
  SPLASH_COLORS,
  SPLASH_COORDINATES,
  SPLASH_EASINGS,
  SPLASH_TIMINGS,
} from "./splash-constants";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SplashAnimationProps {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const finishCalledRef = useRef(false);

  // Sécurité pour n'appeler onFinish qu'une seule fois
  const handleFinish = () => {
    if (finishCalledRef.current) return;
    finishCalledRef.current = true;
    onFinish();
  };

  // Dimensions réactives : ratio 9 / 16 (conforme viewport mobile de la référence)
  let sceneWidth = Math.min(width, 480);
  let sceneHeight = sceneWidth * (16 / 9);
  if (sceneHeight > height) {
    sceneHeight = height;
    sceneWidth = sceneHeight * (9 / 16);
  }

  // Dimensions carte de verre (86.7% width, 45% height)
  const cardWidth = sceneWidth * 0.867;
  const cardHeight = sceneHeight * 0.45;
  const cardBorderRadiusTarget = cardWidth * 0.12;

  // Circonférence géométrique de l'anneau (2 * PI * r)
  const ringCircumference = 2 * Math.PI * SPLASH_COORDINATES.ringRadius;

  // ─── Valeurs partagées Reanimated ───────────────────────────────────────────
  // Orbes
  const orb1Opacity = useSharedValue(0);
  const orb2Opacity = useSharedValue(0);
  const orb3Opacity = useSharedValue(0);
  const orbDrift = useSharedValue(0);

  // Carte de verre
  const cardLiquidProgress = useSharedValue(0);
  const cardBeatProgress = useSharedValue(0);
  const cardSheenProgress = useSharedValue(0);

  // Logo & SVG
  const enterProgress = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const innerWipeProgress = useSharedValue(0);
  const beatProgress = useSharedValue(0);
  const ripple1Progress = useSharedValue(0);
  const ripple2Progress = useSharedValue(0);
  const textRiseProgress = useSharedValue(0);
  const textSweepProgress = useSharedValue(0);
  const exitProgress = useSharedValue(0);

  // Accessibilité "Mouvement Réduit"
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  // Désactivation retour arrière physique sur Android
  useEffect(() => {
    if (Platform.OS === "android") {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }
  }, []);

  // Déclencheur Audio (4s, volume 0.6, tolérance totale)
  useEffect(() => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      const soundAsset = require("../../../assets/sounds/junix-pulse-launch-sound.wav");
      player = createAudioPlayer(soundAsset);
      player.volume = 0.6;
      player.play();
    } catch {
      // Silencieux
    }

    return () => {
      try {
        if (player) {
          player.pause();
          player.remove();
        }
      } catch {
        // Silencieux
      }
    };
  }, []);

  // Orchestration de la timeline (0.0s à 4.0s)
  useEffect(() => {
    // Garde-fou absolu (4.2 secondes)
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, SPLASH_TIMINGS.safetyTimeoutMs);

    if (reduceMotion) {
      // Mouvement réduit : affichage fixe 0.8s puis fondu de sortie
      enterProgress.value = withTiming(1, { duration: 300 });
      cardLiquidProgress.value = 1;
      ringProgress.value = 1;
      innerWipeProgress.value = 1;
      textRiseProgress.value = 1;
      textSweepProgress.value = 1;

      setTimeout(() => {
        exitProgress.value = withTiming(1, { duration: 400 }, (finished) => {
          if (finished) runOnJS(handleFinish)();
        });
      }, SPLASH_TIMINGS.reducedMotionDurationMs);

      return () => clearTimeout(safetyTimer);
    }

    // 1. Orbes : apparition (0s à 0.9s) et dérive (0s à 4.0s)
    orb1Opacity.value = withTiming(0.85, {
      duration: SPLASH_TIMINGS.orbEntranceDurationMs,
      easing: SPLASH_EASINGS.easeOut,
    });
    orb2Opacity.value = withDelay(
      SPLASH_TIMINGS.orb2DelayMs,
      withTiming(0.85, {
        duration: SPLASH_TIMINGS.orbEntranceDurationMs,
        easing: SPLASH_EASINGS.easeOut,
      })
    );
    orb3Opacity.value = withDelay(
      SPLASH_TIMINGS.orb3DelayMs,
      withTiming(0.6, {
        duration: SPLASH_TIMINGS.orbEntranceDurationMs,
        easing: SPLASH_EASINGS.easeOut,
      })
    );
    orbDrift.value = withTiming(1, {
      duration: SPLASH_TIMINGS.orbDriftDurationMs,
      easing: SPLASH_EASINGS.easeInOut,
    });

    // 2. Carte de verre : formation liquide (0s à 0.95s)
    cardLiquidProgress.value = withTiming(1, {
      duration: SPLASH_TIMINGS.cardLiquidDurationMs,
      easing: SPLASH_EASINGS.liquid,
    });

    // Reflet oblique sheen sur la carte (1.95s à 2.85s)
    cardSheenProgress.value = withDelay(
      SPLASH_TIMINGS.cardSheenDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.cardSheenDurationMs,
        easing: SPLASH_EASINGS.easeInOut,
      })
    );

    // Battement de la carte (2.0s à 3.0s)
    cardBeatProgress.value = withDelay(
      SPLASH_TIMINGS.cardBeatDelayMs,
      withSequence(
        withTiming(1, { duration: 180, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(2, { duration: 160, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(3, { duration: 180, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(4, { duration: 480, easing: SPLASH_EASINGS.easeInOut })
      )
    );

    // 3. Logo enter (0.1s à 1.4s)
    enterProgress.value = withDelay(
      SPLASH_TIMINGS.enterDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.enterDurationMs,
        easing: SPLASH_EASINGS.enterAndRise,
      })
    );

    // 4. Tracé de l'anneau (0.15s à 1.4s)
    ringProgress.value = withDelay(
      SPLASH_TIMINGS.ringDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.ringDurationMs,
        easing: SPLASH_EASINGS.ringDraw,
      })
    );

    // 5. Balayage intérieur (pulse + P) (0.95s à 2.0s)
    innerWipeProgress.value = withDelay(
      SPLASH_TIMINGS.innerSweepDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.innerSweepDurationMs,
        easing: SPLASH_EASINGS.wipeSweep,
      })
    );

    // 6. Double battement symbole (2.0s à 3.0s)
    // 0% -> 1.0, 18% -> 1.05, 34% -> 1.0, 52% -> 1.035, 70%-100% -> 1.0
    beatProgress.value = withDelay(
      SPLASH_TIMINGS.beatDelayMs,
      withSequence(
        withTiming(1, { duration: 180, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(2, { duration: 160, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(3, { duration: 180, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(4, { duration: 180, easing: SPLASH_EASINGS.easeInOut }),
        withTiming(4, { duration: 300 })
      )
    );

    // Ondes dégradées (r1 à 2.0s, r2 à 2.28s)
    ripple1Progress.value = withDelay(
      SPLASH_TIMINGS.ripple1DelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.rippleDurationMs,
        easing: SPLASH_EASINGS.easeOut,
      })
    );
    ripple2Progress.value = withDelay(
      SPLASH_TIMINGS.ripple2DelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.rippleDurationMs,
        easing: SPLASH_EASINGS.easeOut,
      })
    );

    // 7. Texte "JUNIX PULSE" : montée de 26px + balayage (2.35s à 3.15s)
    textRiseProgress.value = withDelay(
      SPLASH_TIMINGS.textDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.textDurationMs,
        easing: SPLASH_EASINGS.enterAndRise,
      })
    );
    textSweepProgress.value = withDelay(
      SPLASH_TIMINGS.textDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.textDurationMs,
        easing: SPLASH_EASINGS.wipeSweep,
      })
    );

    // 8. Fondu de sortie global (3.5s à 4.0s)
    exitProgress.value = withDelay(
      SPLASH_TIMINGS.exitDelayMs,
      withTiming(
        1,
        {
          duration: SPLASH_TIMINGS.exitDurationMs,
          easing: SPLASH_EASINGS.easeIn,
        },
        (finished) => {
          if (finished) runOnJS(handleFinish)();
        }
      )
    );

    return () => clearTimeout(safetyTimer);
  }, [reduceMotion]);

  // ─── Styles animés des Orbes ───────────────────────────────────────────────
  const animatedOrb1Style = useAnimatedStyle(() => {
    const driftX = interpolate(orbDrift.value, [0, 0.5, 1], [0, sceneWidth * 0.03, -sceneWidth * 0.01]);
    const driftY = interpolate(orbDrift.value, [0, 0.5, 1], [0, -sceneHeight * 0.02, sceneHeight * 0.01]);
    return {
      opacity: orb1Opacity.value,
      transform: [
        { translateX: -sceneWidth * 0.52 / 2 + driftX },
        { translateY: -sceneWidth * 0.52 / 2 + driftY },
      ],
    };
  });

  const animatedOrb2Style = useAnimatedStyle(() => {
    const driftX = interpolate(orbDrift.value, [0, 0.5, 1], [0, -sceneWidth * 0.02, sceneWidth * 0.02]);
    const driftY = interpolate(orbDrift.value, [0, 0.5, 1], [0, sceneHeight * 0.02, -sceneHeight * 0.01]);
    return {
      opacity: orb2Opacity.value,
      transform: [
        { translateX: -sceneWidth * 0.48 / 2 + driftX },
        { translateY: -sceneWidth * 0.48 / 2 + driftY },
      ],
    };
  });

  const animatedOrb3Style = useAnimatedStyle(() => {
    const driftX = interpolate(orbDrift.value, [0, 0.5, 1], [0, sceneWidth * 0.02, -sceneWidth * 0.02]);
    const driftY = interpolate(orbDrift.value, [0, 0.5, 1], [0, -sceneHeight * 0.015, sceneHeight * 0.015]);
    return {
      opacity: orb3Opacity.value,
      transform: [
        { translateX: -sceneWidth * 0.30 / 2 + driftX },
        { translateY: -sceneWidth * 0.30 / 2 + driftY },
      ],
    };
  });

  // ─── Styles animés de la Carte de Verre ─────────────────────────────────────
  const animatedCardStyle = useAnimatedStyle(() => {
    // Animation liquide : scale 0.45 -> 1.05 -> 0.985 -> 1.0
    const scaleLiquid = interpolate(
      cardLiquidProgress.value,
      [0, 0.45, 0.75, 1],
      [0.45, 1.05, 0.985, 1.0]
    );

    // Animation de battement (cbeat) : scale 1.0 -> 1.03 -> 1.0 -> 1.02 -> 1.0
    let scaleBeat = 1;
    if (cardBeatProgress.value > 0) {
      if (cardBeatProgress.value <= 1) {
        scaleBeat = interpolate(cardBeatProgress.value, [0, 1], [1.0, 1.03]);
      } else if (cardBeatProgress.value <= 2) {
        scaleBeat = interpolate(cardBeatProgress.value, [1, 2], [1.03, 1.0]);
      } else if (cardBeatProgress.value <= 3) {
        scaleBeat = interpolate(cardBeatProgress.value, [2, 3], [1.0, 1.02]);
      } else {
        scaleBeat = interpolate(cardBeatProgress.value, [3, 4], [1.02, 1.0]);
      }
    }

    const borderRadius = interpolate(
      cardLiquidProgress.value,
      [0, 0.45, 0.75, 1],
      [cardWidth * 0.5, cardWidth * 0.18, cardWidth * 0.13, cardBorderRadiusTarget]
    );

    return {
      opacity: cardLiquidProgress.value,
      borderRadius,
      transform: [
        { translateX: -cardWidth / 2 },
        { translateY: -cardHeight / 2 },
        { scale: scaleLiquid * scaleBeat },
      ],
    };
  });

  // Reflet lumineux sheen à travers la carte
  const animatedSheenStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      cardSheenProgress.value,
      [0, 1],
      [-cardWidth * 1.25, cardWidth * 1.25]
    );
    return {
      transform: [{ translateX }],
    };
  });

  // ─── Props animées du SVG ──────────────────────────────────────────────────
  // Anneau : tracé circulaire horaire depuis x=514, y=447 (strokeDashoffset 1 -> 0)
  const animatedRingProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - ringProgress.value) * ringCircumference,
  }));

  // Balayage intérieur : révélé de gauche à droite depuis x=270
  const animatedInnerWipeProps = useAnimatedProps(() => ({
    width: innerWipeProgress.value * SPLASH_COORDINATES.innerWipe.width,
  }));

  // Balayage du texte : révélé de gauche à droite depuis x=170
  const animatedTextWipeProps = useAnimatedProps(() => ({
    width: textSweepProgress.value * SPLASH_COORDINATES.textWipe.width,
  }));

  // Ondes concentriques (ripples)
  const animatedRipple1Props = useAnimatedProps(() => {
    const scale = interpolate(ripple1Progress.value, [0, 1], [1, 1.55]);
    const opacity = interpolate(ripple1Progress.value, [0, 0.05, 1], [0, 0.55, 0]);
    return {
      r: SPLASH_COORDINATES.ringRadius * scale,
      opacity,
    };
  });

  const animatedRipple2Props = useAnimatedProps(() => {
    const scale = interpolate(ripple2Progress.value, [0, 1], [1, 1.55]);
    const opacity = interpolate(ripple2Progress.value, [0, 0.05, 1], [0, 0.55, 0]);
    return {
      r: SPLASH_COORDINATES.ringRadius * scale,
      opacity,
    };
  });

  // Conteneur global scène (.scene.go : fondu de sortie 3.5s à 4.0s)
  const animatedSceneStyle = useAnimatedStyle(() => {
    const opacity = interpolate(exitProgress.value, [0, 1], [1, 0]);
    const scale = interpolate(exitProgress.value, [0, 1], [1, 1.04]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Symbole et anneau (.sym & .beat)
  const animatedSymStyle = useAnimatedStyle(() => {
    const opacity = interpolate(enterProgress.value, [0, 1], [0, 1]);
    const scaleEnter = interpolate(enterProgress.value, [0, 1], [0.9, 1.0]);

    // Heartbeat: 1.0 -> 1.05 -> 1.0 -> 1.035 -> 1.0
    let scaleBeat = 1;
    if (beatProgress.value > 0) {
      if (beatProgress.value <= 1) {
        scaleBeat = interpolate(beatProgress.value, [0, 1], [1.0, 1.05]);
      } else if (beatProgress.value <= 2) {
        scaleBeat = interpolate(beatProgress.value, [1, 2], [1.05, 1.0]);
      } else if (beatProgress.value <= 3) {
        scaleBeat = interpolate(beatProgress.value, [2, 3], [1.0, 1.035]);
      } else {
        scaleBeat = interpolate(beatProgress.value, [3, 4], [1.035, 1.0]);
      }
    }

    return {
      opacity,
      transform: [{ scale: scaleEnter * scaleBeat }],
    };
  });

  // Texte "JUNIX PULSE" (.tm : montée de 26px)
  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(textRiseProgress.value, [0, 1], [0, 1]);
    const translateY = interpolate(
      textRiseProgress.value,
      [0, 1],
      [SPLASH_COORDINATES.textRisePx, 0]
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const logoImageSource = require("../../../assets/images/splash-icon.png");

  return (
    <Pressable
      style={styles.container}
      onPress={handleFinish}
      accessibilityRole="button"
      accessibilityLabel="Junix Pulse"
    >
      <Animated.View
        style={[
          styles.scene,
          { width: sceneWidth, height: sceneHeight },
          animatedSceneStyle,
        ]}
      >
        {/* ─── Couche 1 : Les 3 Orbes de couleur (Violet / Cyan) ─────────────── */}
        {/* Orbe 1 : Violet (gauche-bas) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orb,
            {
              left: "20%",
              top: "58%",
              width: sceneWidth * 0.52,
              height: sceneWidth * 0.52,
            },
            animatedOrb1Style,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id="gradOrb1"
                cx="35%"
                cy="35%"
                rx="50%"
                ry="50%"
                fx="35%"
                fy="35%"
              >
                <Stop offset="0%" stopColor="#8B3DF0" stopOpacity="0.85" />
                <Stop offset="38%" stopColor="#8B3DF0" stopOpacity="0.38" />
                <Stop offset="68%" stopColor="#8B3DF0" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#gradOrb1)" />
          </Svg>
        </Animated.View>

        {/* Orbe 2 : Cyan (droite-milieu) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orb,
            {
              left: "80%",
              top: "37%",
              width: sceneWidth * 0.48,
              height: sceneWidth * 0.48,
            },
            animatedOrb2Style,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id="gradOrb2"
                cx="60%"
                cy="40%"
                rx="50%"
                ry="50%"
                fx="60%"
                fy="40%"
              >
                <Stop offset="0%" stopColor="#0AE8F0" stopOpacity="0.85" />
                <Stop offset="38%" stopColor="#0AE8F0" stopOpacity="0.38" />
                <Stop offset="68%" stopColor="#0AE8F0" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#gradOrb2)" />
          </Svg>
        </Animated.View>

        {/* Orbe 3 : Doux violet (centre-haut) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orb,
            {
              left: "34%",
              top: "30%",
              width: sceneWidth * 0.30,
              height: sceneWidth * 0.30,
            },
            animatedOrb3Style,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient
                id="gradOrb3"
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
                fx="50%"
                fy="50%"
              >
                <Stop offset="0%" stopColor="#8B3DF0" stopOpacity="0.55" />
                <Stop offset="66%" stopColor="#8B3DF0" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50%" cy="50%" r="50%" fill="url(#gradOrb3)" />
          </Svg>
        </Animated.View>

        {/* ─── Couche 2 : Carte de Verre Liquide (Glassmorphism) ─────────────── */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glassCard,
            {
              left: "50%",
              top: "48.6%",
              width: cardWidth,
              height: cardHeight,
            },
            animatedCardStyle,
          ]}
        >
          {/* Dégradé translucide de verre (62% vers 22%) */}
          <LinearGradient
            colors={["rgba(255,255,255,0.62)", "rgba(255,255,255,0.22)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Reflet lumineux en haut à gauche (.card::before) */}
          <LinearGradient
            colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0.25)", "transparent"]}
            start={{ x: 0.18, y: 0 }}
            end={{ x: 0.75, y: 0.58 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
          />

          {/* Éclat diagonal traversant (.card::after sheen sweep) */}
          <Animated.View style={[styles.sheenContainer, animatedSheenStyle]}>
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.80)", "transparent"]}
              start={{ x: 0, y: 0.36 }}
              end={{ x: 1, y: 0.64 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        {/* ─── Couche 3 : Composition SVG (Anneau, Pulse & "JUNIX PULSE") ───── */}
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Symbole & Anneau (animés en enter et battement) */}
          <Animated.View style={[StyleSheet.absoluteFill, animatedSymStyle]}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`${SPLASH_COORDINATES.viewBox.minX} ${SPLASH_COORDINATES.viewBox.minY} ${SPLASH_COORDINATES.viewBox.width} ${SPLASH_COORDINATES.viewBox.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <Defs>
                {/* Dégradé de tracé de l'onde / anneau */}
                <SvgLinearGradient
                  id="gr"
                  x1="300"
                  y1="660"
                  x2="730"
                  y2="230"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={SPLASH_COLORS.violet} />
                  <Stop offset="1" stopColor={SPLASH_COLORS.cyan} />
                </SvgLinearGradient>

                {/* Dégradé doux de bord de balayage */}
                <SvgLinearGradient id="soft" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.88" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor="#000000" />
                </SvgLinearGradient>

                {/* Découpe intérieure circulaire (r=212) */}
                <ClipPath id="inner">
                  <Circle
                    cx={SPLASH_COORDINATES.center.x}
                    cy={SPLASH_COORDINATES.center.y}
                    r={SPLASH_COORDINATES.innerRadius}
                  />
                </ClipPath>

                {/* Masque 1 : Tracé de l'anneau (#mRing) */}
                <Mask
                  id="mRing"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="1024"
                  height="1024"
                >
                  <Rect width="1024" height="1024" fill="#000000" />
                  <AnimatedCircle
                    cx={SPLASH_COORDINATES.center.x}
                    cy={SPLASH_COORDINATES.center.y}
                    r={SPLASH_COORDINATES.ringRadius}
                    stroke="#FFFFFF"
                    strokeWidth={SPLASH_COLORS.ringStroke}
                    strokeDasharray={`${ringCircumference}`}
                    fill="none"
                    transform={`rotate(180 ${SPLASH_COORDINATES.center.x} ${SPLASH_COORDINATES.center.y})`}
                    animatedProps={animatedRingProps}
                  />
                </Mask>

                {/* Masque 2 : Balayage intérieur pulse & P (#mIn) */}
                <Mask
                  id="mIn"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="1024"
                  height="1024"
                >
                  <Rect width="1024" height="1024" fill="#000000" />
                  <G clipPath="url(#inner)">
                    <AnimatedRect
                      x={SPLASH_COORDINATES.innerWipe.x}
                      y={SPLASH_COORDINATES.innerWipe.y}
                      height={SPLASH_COORDINATES.innerWipe.height}
                      fill="url(#soft)"
                      animatedProps={animatedInnerWipeProps}
                    />
                  </G>
                </Mask>
              </Defs>

              {/* Ondes dégradées d'impact (ripples) */}
              <AnimatedCircle
                cx={SPLASH_COORDINATES.center.x}
                cy={SPLASH_COORDINATES.center.y}
                fill="none"
                stroke="url(#gr)"
                strokeWidth={SPLASH_COLORS.rippleStroke}
                animatedProps={animatedRipple1Props}
              />
              <AnimatedCircle
                cx={SPLASH_COORDINATES.center.x}
                cy={SPLASH_COORDINATES.center.y}
                fill="none"
                stroke="url(#gr)"
                strokeWidth={SPLASH_COLORS.rippleStroke}
                animatedProps={animatedRipple2Props}
              />

              {/* Logo : Anneau révélé */}
              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mRing)"
              />

              {/* Logo : Intérieur révélé */}
              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mIn)"
              />
            </Svg>
          </Animated.View>

          {/* Texte "JUNIX PULSE" (animé en rise et balayage doux) */}
          <Animated.View style={[StyleSheet.absoluteFill, animatedTextStyle]}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`${SPLASH_COORDINATES.viewBox.minX} ${SPLASH_COORDINATES.viewBox.minY} ${SPLASH_COORDINATES.viewBox.width} ${SPLASH_COORDINATES.viewBox.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <Defs>
                <SvgLinearGradient id="softTx" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.88" stopColor="#FFFFFF" />
                  <Stop offset="1" stopColor="#000000" />
                </SvgLinearGradient>

                {/* Masque 3 : Balayage du texte (#mTx) */}
                <Mask
                  id="mTx"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="1024"
                  height="1024"
                >
                  <Rect width="1024" height="1024" fill="#000000" />
                  <AnimatedRect
                    x={SPLASH_COORDINATES.textWipe.x}
                    y={SPLASH_COORDINATES.textWipe.y}
                    height={SPLASH_COORDINATES.textWipe.height}
                    fill="url(#softTx)"
                    animatedProps={animatedTextWipeProps}
                  />
                </Mask>
              </Defs>

              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mTx)"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  scene: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
  },
  glassCard: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: SPLASH_COLORS.cardBorder,
    // Ombre douce violette / élévation (conforme CSS .card box-shadow)
    ...Platform.select({
      ios: {
        shadowColor: SPLASH_COLORS.violet,
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.16,
        shadowRadius: 25,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  sheenContainer: {
    ...StyleSheet.absoluteFill,
  },
});
