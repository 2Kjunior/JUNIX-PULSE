/**
 * Composant SplashAnimation pour Junix Pulse.
 * Rendu SVG animé avec React Native Reanimated et React Native SVG.
 * 100% conforme à la spécification HTML / CSS / SVG de 4 secondes.
 */

import { createAudioPlayer } from "expo-audio";
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
    LinearGradient,
    Mask,
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

  // Dimensions du stage SVG
  const stageSize = Math.min(width, height) * 0.88;

  // Valeurs partagées Reanimated
  // 1. Enter (opacity, scale)
  const enterProgress = useSharedValue(0);

  // 2. Ring draw (0 -> 1)
  const ringProgress = useSharedValue(0);

  // 3. Inner wipe sweep (scaleX: 0 -> 1)
  const innerWipeProgress = useSharedValue(0);

  // 4. Heartbeat
  const beatProgress = useSharedValue(0);

  // 5. Ripples (0 -> 1)
  const ripple1Progress = useSharedValue(0);
  const ripple2Progress = useSharedValue(0);

  // 6. Text rise & sweep
  const textRiseProgress = useSharedValue(0);
  const textSweepProgress = useSharedValue(0);

  // 7. Exit (1 -> 0)
  const exitProgress = useSharedValue(0);

  // Écoute de l'accessibilité Mouvement Réduit
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  // Désactiver le bouton retour physique sur Android pendant le splash
  useEffect(() => {
    if (Platform.OS === "android") {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => sub.remove();
    }
  }, []);

  // Déclencheur audio
  useEffect(() => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    try {
      const soundAsset = require("../../../assets/sounds/junix-pulse-launch-sound.wav");
      player = createAudioPlayer(soundAsset);
      player.volume = 0.6;
      player.play();
    } catch {
      // Tolérance totale aux environnements sans audio (simulateur/web)
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

  // Déroulé des animations
  useEffect(() => {
    // Timeout absolu de sécurité (4.2 s)
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, SPLASH_TIMINGS.safetyTimeoutMs);

    if (reduceMotion) {
      // Mode mouvement réduit : simple fade-in puis fade-out rapide de 800ms
      enterProgress.value = withTiming(1, { duration: 400 });
      ringProgress.value = 1;
      innerWipeProgress.value = 1;
      textRiseProgress.value = 1;
      textSweepProgress.value = 1;

      setTimeout(() => {
        exitProgress.value = withTiming(1, { duration: 400 }, (finished) => {
          if (finished) {
            runOnJS(handleFinish)();
          }
        });
      }, SPLASH_TIMINGS.reducedMotionDurationMs);

      return () => clearTimeout(safetyTimer);
    }

    // 1. Enter (0.1s -> 1.4s)
    enterProgress.value = withDelay(
      SPLASH_TIMINGS.enterDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.enterDurationMs,
        easing: SPLASH_EASINGS.enterAndRise,
      })
    );

    // 2. Ring draw (0.15s -> 1.4s)
    ringProgress.value = withDelay(
      SPLASH_TIMINGS.ringDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.ringDurationMs,
        easing: SPLASH_EASINGS.ringDraw,
      })
    );

    // 3. Inner sweep (0.95s -> 2.0s)
    innerWipeProgress.value = withDelay(
      SPLASH_TIMINGS.innerSweepDelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.innerSweepDurationMs,
        easing: SPLASH_EASINGS.wipeSweep,
      })
    );

    // 4. Double Heartbeat (2.0s -> 3.0s)
    // Keyframes: 0% -> 1.0, 18% -> 1.05, 34% -> 1.0, 52% -> 1.035, 70% -> 1.0
    beatProgress.value = withDelay(
      SPLASH_TIMINGS.beatDelayMs,
      withSequence(
        withTiming(1, { duration: 180, easing: SPLASH_EASINGS.heartbeat }), // 18%
        withTiming(2, { duration: 160, easing: SPLASH_EASINGS.heartbeat }), // 34%
        withTiming(3, { duration: 180, easing: SPLASH_EASINGS.heartbeat }), // 52%
        withTiming(4, { duration: 180, easing: SPLASH_EASINGS.heartbeat }), // 70%
        withTiming(4, { duration: 300 }) // 100%
      )
    );

    // 5. Ripples (r1 à 2.0s, r2 à 2.28s)
    ripple1Progress.value = withDelay(
      SPLASH_TIMINGS.ripple1DelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.rippleDurationMs,
        easing: SPLASH_EASINGS.ripple,
      })
    );

    ripple2Progress.value = withDelay(
      SPLASH_TIMINGS.ripple2DelayMs,
      withTiming(1, {
        duration: SPLASH_TIMINGS.rippleDurationMs,
        easing: SPLASH_EASINGS.ripple,
      })
    );

    // 6. Text rise & sweep (2.35s -> 3.15s)
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

    // 7. Global Exit (3.5s -> 4.0s)
    exitProgress.value = withDelay(
      SPLASH_TIMINGS.exitDelayMs,
      withTiming(
        1,
        {
          duration: SPLASH_TIMINGS.exitDurationMs,
          easing: SPLASH_EASINGS.exit,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleFinish)();
          }
        }
      )
    );

    return () => clearTimeout(safetyTimer);
  }, [reduceMotion]);

  // Props animées du SVG

  // Ring: strokeDashoffset passe de 1414 (circonférence 2*PI*225 ≈ 1413.7) à 0
  const ringCircumference = 2 * Math.PI * SPLASH_COORDINATES.ringRadius;
  const animatedRingProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: (1 - ringProgress.value) * ringCircumference,
    };
  });

  // Inner Wipe: scaleX de 0 à 1 depuis x=270
  const animatedInnerWipeProps = useAnimatedProps(() => {
    return {
      width: innerWipeProgress.value * SPLASH_COORDINATES.innerWipe.width,
    };
  });

  // Text Wipe: largeur de 0 à 690 depuis x=170
  const animatedTextWipeProps = useAnimatedProps(() => {
    return {
      width: textSweepProgress.value * SPLASH_COORDINATES.textWipe.width,
    };
  });

  // Ripples: r de 225 à 225 * 1.55 (= 348.75), opacity de 0.55 à 0
  const animatedRipple1Props = useAnimatedProps(() => {
    const scale = interpolate(ripple1Progress.value, [0, 1], [1, 1.55]);
    const op = interpolate(ripple1Progress.value, [0, 0.05, 1], [0, 0.55, 0]);
    return {
      r: SPLASH_COORDINATES.ringRadius * scale,
      opacity: op,
    };
  });

  const animatedRipple2Props = useAnimatedProps(() => {
    const scale = interpolate(ripple2Progress.value, [0, 1], [1, 1.55]);
    const op = interpolate(ripple2Progress.value, [0, 0.05, 1], [0, 0.55, 0]);
    return {
      r: SPLASH_COORDINATES.ringRadius * scale,
      opacity: op,
    };
  });

  // Style animé du conteneur global (.all)
  const animatedAllStyle = useAnimatedStyle(() => {
    const opacity = interpolate(exitProgress.value, [0, 1], [1, 0]);
    const scale = interpolate(exitProgress.value, [0, 1], [1, 1.04]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Style animé du symbole (.sym & .beat)
  const animatedSymStyle = useAnimatedStyle(() => {
    const opacity = interpolate(enterProgress.value, [0, 1], [0, 1]);
    const scaleEnter = interpolate(enterProgress.value, [0, 1], [0.9, 1]);

    // Heartbeat scale: 1 -> 1.05 -> 1.0 -> 1.035 -> 1.0
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

  // Style animé du texte (.tm)
  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(textRiseProgress.value, [0, 1], [0, 1]);
    const translateY = interpolate(textRiseProgress.value, [0, 1], [26, 0]);
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
      accessibilityLabel="Passer l'animation de démarrage"
    >
      <Animated.View style={[styles.stageWrapper, { width: stageSize, height: stageSize }, animatedAllStyle]}>
        {/* Calque 1 : Symbole et Anneau (animés en scale / beat / enter) */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedSymStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${SPLASH_COORDINATES.viewBoxSize} ${SPLASH_COORDINATES.viewBoxSize}`}
          >
            <Defs>
              <LinearGradient id="gr" x1="280" y1="670" x2="730" y2="230" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={SPLASH_COLORS.violet} />
                <Stop offset="1" stopColor={SPLASH_COLORS.cyan} />
              </LinearGradient>

              <LinearGradient id="soft" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0.88" stopColor="#FFFFFF" />
                <Stop offset="1" stopColor="#000000" />
              </LinearGradient>

              <ClipPath id="inner">
                <Circle
                  cx={SPLASH_COORDINATES.center.x}
                  cy={SPLASH_COORDINATES.center.y}
                  r={SPLASH_COORDINATES.innerRadius}
                />
              </ClipPath>

              {/* Masque 1 : Anneau */}
              <Mask id="mRing" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
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

              {/* Masque 2 : Balayage intérieur */}
              <Mask id="mIn" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
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

            {/* Ondes de battement (ripples) */}
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

            {/* Logo découpé en anneau + intérieur */}
            <G id="logoSymbol">
              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mRing)"
              />
              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mIn)"
              />
            </G>
          </Svg>
        </Animated.View>

        {/* Calque 2 : Texte JUNIX PULSE (animé en rise translateY) */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedTextStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${SPLASH_COORDINATES.viewBoxSize} ${SPLASH_COORDINATES.viewBoxSize}`}
          >
            <Defs>
              <LinearGradient id="softTx" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0.88" stopColor="#FFFFFF" />
                <Stop offset="1" stopColor="#000000" />
              </LinearGradient>

              {/* Masque 3 : Balayage du texte JUNIX PULSE */}
              <Mask id="mTx" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
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

            <G id="logoText">
              <SvgImage
                href={logoImageSource}
                width="1024"
                height="1024"
                mask="url(#mTx)"
              />
            </G>
          </Svg>
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
  stageWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
