/**
 * Version Web spécialisée de SplashAnimation pour Junix Pulse.
 * 100% conforme à docs/splash/junix-pulse-splash-reference.html
 *
 * Utilise le moteur CSS/SVG GPU natif du navigateur pour :
 * - Masques SVG (mRing, mIn, mTx) animés via CSS keyframes matériels
 * - Glassmorphism avec backdrop-filter: blur(22px) saturate(170%)
 * - Orbes radiaux et carte de verre liquide
 * - Audio calé à 0.6 avec gestion de l'autoplay
 * - Transition de sortie à 3.5s - 4.0s et garde-fou strict à 4.2s
 */

import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SPLASH_TIMINGS } from "./splash-constants";

interface SplashAnimationProps {
  onFinish: () => void;
}

const logoImageSource = require("../../../assets/images/splash-icon.png");
const soundAssetSource = require("../../../assets/sounds/junix-pulse-launch-sound.wav");

const SPLASH_CSS = `
.jp-splash-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  z-index: 999999;
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.jp-phone {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 32px;
  background: #FFFFFF;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}
.jp-scene {
  position: absolute;
  inset: 0;
}
.jp-scene.go {
  animation: jp-out 0.5s ease-in 3.5s both;
}
.jp-orb {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.85;
}
.jp-o1 {
  left: 20%;
  top: 58%;
  width: 52%;
  background: radial-gradient(circle at 35% 35%, #8B3DF0 0%, rgba(139,61,240,0.45) 38%, transparent 68%);
}
.jp-o2 {
  left: 80%;
  top: 37%;
  width: 48%;
  background: radial-gradient(circle at 60% 40%, #0AE8F0 0%, rgba(10,232,240,0.45) 38%, transparent 68%);
}
.jp-o3 {
  left: 34%;
  top: 30%;
  width: 30%;
  background: radial-gradient(circle, rgba(139,61,240,0.55), transparent 66%);
  opacity: 0.6;
}
.jp-card {
  --sh: 0 22px 50px rgba(139,61,240,0.16), 0 2px 0 rgba(255,255,255,0.95) inset, 0 -14px 30px rgba(10,232,240,0.10) inset;
  --sh2: 0 26px 70px rgba(139,61,240,0.34), 0 0 56px rgba(10,232,240,0.28), 0 2px 0 rgba(255,255,255,0.95) inset, 0 -14px 30px rgba(10,232,240,0.18) inset;
  position: absolute;
  left: 50%;
  top: 48.6%;
  width: 86.7%;
  height: 45%;
  transform: translate(-50%, -50%);
  border-radius: 12% / 13%;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.22));
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  backdrop-filter: blur(22px) saturate(170%);
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: var(--sh);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .jp-card { background: rgba(255,255,255,0.82); }
}
.jp-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(120% 55% at 18% 0%, rgba(255,255,255,0.85), transparent 58%);
  opacity: 0.7;
}
.jp-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(105deg, transparent 36%, rgba(255,255,255,0.8) 50%, transparent 64%);
  transform: translateX(-125%);
}
.jp-scene.go .jp-orb {
  animation: jp-orbin 0.9s ease-out both, jp-drift 4s ease-in-out both;
}
.jp-scene.go .jp-o2 {
  animation-delay: 0.1s, 0s;
}
.jp-scene.go .jp-o3 {
  animation-delay: 0.2s, 0s;
}
.jp-scene.go .jp-card {
  animation: jp-liquid 0.95s cubic-bezier(0.2, 0.9, 0.25, 1) both, jp-cbeat 1s ease-in-out 2s forwards;
}
.jp-scene.go .jp-card::after {
  animation: jp-sheen 0.9s ease-in-out 1.95s forwards;
}
@keyframes jp-orbin {
  from { opacity: 0; }
  to { opacity: 0.85; }
}
@keyframes jp-drift {
  from { margin: 0 0 0 0; }
  50% { margin: -2% 0 0 3%; }
  to { margin: 1% 0 0 -1%; }
}
@keyframes jp-liquid {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); border-radius: 50%; }
  45% { opacity: 1; transform: translate(-50%, -50%) scale(1.05, 0.96); border-radius: 20% / 16%; }
  75% { transform: translate(-50%, -50%) scale(0.985, 1.01); border-radius: 13% / 12%; }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); border-radius: 12% / 13%; }
}
@keyframes jp-cbeat {
  0% { transform: translate(-50%, -50%) scale(1); box-shadow: var(--sh); }
  18% { transform: translate(-50%, -50%) scale(1.03); box-shadow: var(--sh2); }
  34% { transform: translate(-50%, -50%) scale(1); box-shadow: var(--sh); }
  52% { transform: translate(-50%, -50%) scale(1.02); box-shadow: var(--sh2); }
  100% { transform: translate(-50%, -50%) scale(1); box-shadow: var(--sh); }
}
@keyframes jp-sheen {
  from { transform: translateX(-125%); }
  to { transform: translateX(125%); }
}
.jp-ring {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  fill: none;
}
.jp-wipe, .jp-twipe {
  transform-box: view-box;
}
.jp-scene.go .jp-sym {
  transform-origin: 514px 447px;
  animation: jp-enter 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
}
.jp-scene.go .jp-ring {
  animation: jp-draw 1.25s cubic-bezier(0.65, 0, 0.25, 1) 0.15s both;
}
.jp-scene.go .jp-wipe {
  transform-origin: 270px 447px;
  animation: jp-sweep 1.05s cubic-bezier(0.5, 0, 0.2, 1) 0.95s both;
}
.jp-scene.go .jp-beat {
  transform-origin: 514px 447px;
  animation: jp-beat 1s ease-in-out 2s both;
}
.jp-scene.go .jp-r1, .jp-scene.go .jp-r2 {
  transform-origin: 514px 447px;
  animation: jp-ripple 1s ease-out both;
}
.jp-scene.go .jp-r1 {
  animation-delay: 2s;
}
.jp-scene.go .jp-r2 {
  animation-delay: 2.28s;
}
.jp-scene.go .jp-tm {
  animation: jp-rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 2.35s both;
}
.jp-scene.go .jp-twipe {
  transform-origin: 170px 760px;
  animation: jp-sweep 0.8s cubic-bezier(0.5, 0, 0.2, 1) 2.35s both;
}
@keyframes jp-draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes jp-sweep {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes jp-enter {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes jp-beat {
  0% { transform: scale(1); }
  18% { transform: scale(1.05); }
  34% { transform: scale(1); }
  52% { transform: scale(1.035); }
  70%, 100% { transform: scale(1); }
}
@keyframes jp-ripple {
  0% { opacity: 0.55; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.55); }
}
@keyframes jp-rise {
  from { opacity: 0; transform: translateY(26px); }
  to { opacity: 1; transform: none; }
}
@keyframes jp-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.04); }
}
@media (prefers-reduced-motion: reduce) {
  .jp-scene.go *, .jp-scene.go *::after, .jp-scene.go {
    animation: none !important;
  }
  .jp-scene.go .jp-ring {
    stroke-dashoffset: 0;
  }
  .jp-scene.go .jp-wipe, .jp-scene.go .jp-twipe {
    transform: none;
  }
}
`;

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const { width, height } = useWindowDimensions();
  const finishedRef = useRef(false);

  const safeFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  // Dimensions réactives : ratio 9 / 16 (conforme viewport mobile de la référence)
  let sceneWidth = Math.min(width, 480);
  let sceneHeight = sceneWidth * (16 / 9);
  if (sceneHeight > height) {
    sceneHeight = height;
    sceneWidth = sceneHeight * (9 / 16);
  }

  // Résolution de l'URI de l'image du logo pour le Web
  const resolvedLogoUri =
    (typeof logoImageSource === "string"
      ? logoImageSource
      : logoImageSource?.uri ||
        logoImageSource?.default?.uri ||
        logoImageSource?.default) ||
    "/assets/images/splash-icon.png";

  const resolvedSoundUri =
    (typeof soundAssetSource === "string"
      ? soundAssetSource
      : soundAssetSource?.uri ||
        soundAssetSource?.default?.uri ||
        soundAssetSource?.default) ||
    "/assets/sounds/junix-pulse-launch-sound.wav";

  // Lecture audio et timeline
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    try {
      audio = new window.Audio(resolvedSoundUri);
      audio.volume = 0.6;
      audio.play().catch(() => {
        // En cas de blocage d'autoplay par le navigateur, silencieux
      });
    } catch {
      // Tolérance audio
    }

    // Fin naturelle de l'animation à 4.0s
    const mainTimer = setTimeout(() => {
      safeFinish();
    }, SPLASH_TIMINGS.totalDurationMs);

    // Garde-fou strict de sécurité à 4.2s
    const safetyTimer = setTimeout(() => {
      safeFinish();
    }, SPLASH_TIMINGS.safetyTimeoutMs);

    return () => {
      clearTimeout(mainTimer);
      clearTimeout(safetyTimer);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  return (
    <div
      className="jp-splash-root"
      onClick={safeFinish}
      role="button"
      tabIndex={0}
      aria-label="Junix Pulse"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        cursor: "pointer",
      }}
    >
      <style>{SPLASH_CSS}</style>

      <div
        className="jp-phone"
        style={{
          width: sceneWidth,
          height: sceneHeight,
          position: "relative",
          borderRadius: 32,
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="jp-scene go" id="stage" style={{ position: "absolute", inset: 0 }}>
          {/* Les 3 orbes dégradés */}
          <div className="jp-orb jp-o1" />
          <div className="jp-orb jp-o2" />
          <div className="jp-orb jp-o3" />

          {/* Carte de verre liquide */}
          <div className="jp-card" />

          {/* Composition SVG */}
          <svg
            viewBox="62 -287 900 1600"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Animation de lancement Junix Pulse"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
          >
            <defs>
              <image id="jp-logo-asset" width="1024" height="1024" href={resolvedLogoUri} />

              <linearGradient id="gr" gradientUnits="userSpaceOnUse" x1="300" y1="660" x2="730" y2="230">
                <stop offset="0" stopColor="#8B3DF0" />
                <stop offset="1" stopColor="#0AE8F0" />
              </linearGradient>

              <linearGradient id="soft" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0.88" stopColor="#ffffff" />
                <stop offset="1" stopColor="#000000" />
              </linearGradient>

              <clipPath id="inner">
                <circle cx="514" cy="447" r="212" />
              </clipPath>

              {/* Masque 1 : Tracé de l'anneau (#mRing) */}
              <mask id="mRing" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
                <rect width="1024" height="1024" fill="#000000" />
                <circle
                  className="jp-ring"
                  cx="514"
                  cy="447"
                  r="225"
                  stroke="#ffffff"
                  strokeWidth="64"
                  pathLength={1}
                  transform="rotate(180 514 447)"
                />
              </mask>

              {/* Masque 2 : Balayage intérieur pulse & P (#mIn) */}
              <mask id="mIn" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
                <rect width="1024" height="1024" fill="#000000" />
                <g clipPath="url(#inner)">
                  <rect className="jp-wipe" x="270" y="200" width="490" height="500" fill="url(#soft)" />
                </g>
              </mask>

              {/* Masque 3 : Balayage du texte (#mTx) */}
              <mask id="mTx" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
                <rect width="1024" height="1024" fill="#000000" />
                <rect className="jp-twipe" x="170" y="690" width="690" height="140" fill="url(#soft)" />
              </mask>
            </defs>

            <g id="stageg">
              <g className="all">
                {/* Symbole & Anneau */}
                <g className="jp-sym">
                  <g className="jp-beat">
                    <circle
                      className="jp-r1"
                      cx="514"
                      cy="447"
                      r="225"
                      fill="none"
                      stroke="url(#gr)"
                      strokeWidth="6"
                      opacity="0"
                    />
                    <circle
                      className="jp-r2"
                      cx="514"
                      cy="447"
                      r="225"
                      fill="none"
                      stroke="url(#gr)"
                      strokeWidth="6"
                      opacity="0"
                    />
                    <use href="#jp-logo-asset" mask="url(#mRing)" />
                    <use href="#jp-logo-asset" mask="url(#mIn)" />
                  </g>
                </g>
                {/* Texte "JUNIX PULSE" */}
                <g className="jp-tm">
                  <use href="#jp-logo-asset" mask="url(#mTx)" />
                </g>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

