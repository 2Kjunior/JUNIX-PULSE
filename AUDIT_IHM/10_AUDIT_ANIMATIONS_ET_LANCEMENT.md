# 🎬 AUDIT JUNIX PULSE — 10. ANIMATIONS, SÉQUENCE DE LANCEMENT ET IDENTITÉ SONORE

> **Date :** 18 octobre 2026  
> **Auteurs :** Équipe d'audit expert IHM, UX Mobile, React Native / Expo 57, Audio & Performance  
> **Statut :** Lecture seule — Recommandations et options de simulation sans modification du code.

---

## 1. SÉQUENCE DE LANCEMENT (U-09, U-04)

### 1.1 Chronologie exacte de ce que voit l'utilisateur
Lors d'un démarrage à froid (*Cold Start*) de Junix Pulse sur un smartphone Android 12+ :

```
[0 ms]            Toucher sur l'icône de l'application
  │
  ├─ ÉTAPE A : Écran système natif (Android 12+ SplashScreen API / expo-splash-screen)
  │   - Durée : ~400 à 700 ms (temps de spawn du process OS, chargement d'Hermes et des DLL natives).
  │   - Ce que voit l'utilisateur : Un écran entièrement noir (#141317) avec un RECTANGLE BLANC OPAQUE
  │     au centre contenant le logo officiel figé.
  │
[~550 ms]         Transition brute sans enchaînement
  │   - L'écran natif est masqué brutalement via `SplashScreen.hideAsync()` déclenché dans `_layout.tsx`.
  │
  ├─ ÉTAPE B : Écran de démarrage animé JS (`SplashAnimated.tsx` + `PulseLogo.tsx`)
  │   - Durée : 1 580 ms fixes imposées par le code JS :
  │       * 920 ms : animation de tracé vectoriel `strokeDashoffset` (0 → 280)
  │       * 360 ms : settle d'échelle (1.02 → 1)
  │       * 300 ms : fondu sortant `withTiming(0)`
  │   - Ce que voit l'utilisateur : Le carré blanc disparaît d'un coup. Un tracé filaire violet/cyan
  │     différent se dessine sur fond noir avec un halo pulsant et le texte « JUNIX PULSE / Préparation de votre rythme ».
  │
[~2 150 ms]       Arrivée sur la première page (Dashboard Aujourd'hui ou Onboarding)
```

**Durée totale observée :** ~2,1 à 2,5 secondes, dont **1,6 seconde de retard purement artificiel** alors que SQLite et les polices sont déjà prêtes en moins de 150 ms.

---

### 1.2 Diagnostic prouvé de l'écran natif : pourquoi un carré blanc ?
L'affirmation de l'utilisateur a été soumise à une analyse d'octets sur les fichiers PNG :

1. **Inspection binaire des assets (`assets/images/`)** :
   - `splash-icon.png` (1024x1024 px) : `cornerRGBA = [254, 249, 253, 255]`, `minAlpha = 255`, `maxAlpha = 255`.
   - `android-icon-foreground.png` (1024x1024 px) : `cornerRGBA = [255, 255, 255, 255]`, `minAlpha = 255`, `maxAlpha = 255`.
2. **Preuve irréfutable** :
   - Ces deux fichiers n'ont **AUCUN canal de transparence** (alpha = 255 sur 100 % des pixels).
   - Leurs quatre coins sont d'un blanc cassé presque pur (`#FEF9FD`).
   - `app.json` configure le plugin `expo-splash-screen` avec `backgroundColor: "#141317"` (noir profond) et `imageWidth: 120`.
   - L'OS Android affiche l'image au centre du fond noir. Comme l'image est un carré blanc opaque de 1024x1024 compressé à 120dp, elle forme un **carré blanc net au milieu de l'écran noir**.
3. **Sur Android 12+** :
   - La fenêtre de SplashScreen applique un masque adaptatif (rond de 160dp). Comme l'icône de premier plan est opaque avec fond blanc, le masque découpe un disque ou carré blanc sur le fond sombre de la fenêtre.

---

### 1.3 Diagnostic de l'écran animé (`PulseLogo.tsx` vs `official-logo.png`)
1. **Divergence de tracé** :
   - `official-logo.png` représente le logo de marque final : un cercle stylisé intégrant une pulsation ECG harmonieuse et une lettre « P ».
   - `PulseLogo.tsx` réimplémente ce tracé sous forme d'un path SVG manuscrit (`M 30 78 L 30 22 C 30 22 ...`) avec deux blocs disjoints non continus. Les proportions, les courbes et les épaisseurs de trait ne correspondent pas à l'asset officiel.
2. **Colorimétrie et halo** :
   - Le tracé animé utilise un dégradé `#D0BCFF -> #A078FF -> #4CD7F6` avec un halo violet/cyan. Ce contraste est agréable isolément, mais heurte violemment le carré blanc qui vient de précéder.
3. **Question de nécessité produit** :
   - **Écran natif** : OBLIGATOIRE sur Android 12+ et iOS (imposé par le système pendant le chargement du runtime). Il est personnalisable (fond, icône transparente, logo de marque).
   - **Écran animé** : NON INDISPENSABLE techniquement. La base SQLite et les polices s'initialisent en ~120 ms. L'animation de 1 580 ms retarde inutilement l'accès à l'application.

---

### 1.4 Options de design pour la séquence de lancement

#### Option A (Recommandée) : Séquence unifiée fluide sans écran animé redondant
- **Principe** :
  1. Générer `splash-icon.png` et `android-icon-foreground.png` avec **fond 100 % transparent** (alpha = 0) autour du tracé officiel du logo.
  2. Aligner exactement la couleur de fond de l'écran natif sur `#141317`.
  3. Dès que l'application est initialisée (~150 ms), `SplashScreen.hideAsync()` révèle directement l'écran d'accueil avec une micro-transition en fondu doux (150 ms).
- **Avantages** : Lancement quasi instantané (~600 ms au total), aucun carré blanc, aucune duplication d'écran, économie maximale de batterie.
- **Inconvénients** : Pas d'animation de tracé complexe au démarrage.

#### Option B : Continuité visuelle parfaite « Morphing » (Natif → Animé sans saut)
- **Principe** :
  1. L'écran natif affiche le logo officiel transparent exactement au même emplacement, même échelle (ex. 96dp) et sur le même fond `#141317`.
  2. L'écran animé démarre avec le logo exactement figé sur la même frame, puis lance une pulsation douce unique de confirmation (250 ms) avec apparition en fondu du nom « JUNIX PULSE » avant de s'effacer.
  3. Durée totale de l'animé plafonnée à **600 ms maximum** (au lieu de 1 580 ms).
- **Avantages** : Respecte l'envie d'une identité visuelle vivante sans saut visuel ni carré blanc.
- **Inconvénients** : Reste un délai supplémentaire de ~600 ms par rapport au chargement direct.

#### Option C : Suppression totale du splash animé (Zero Delay)
- **Principe** : Masquer `SplashAnimated.tsx`. L'app affiche l'écran d'accueil dès la fin du splash natif.
- **Recommandation du collège d'auditeurs** : Valider avec le propriétaire entre **Option A** (vitesse & sobriété) et **Option B** (rythme de marque soigné).

---

## 2. INVENTAIRE EXHAUSTIF DES ANIMATIONS EXISTANTES

| Composant / Fichier | Technologie | Déclencheur | Durée | Thread | Respect de « Réduire les animations » | Diagnostic performance |
|---|---|---|---|---|:---:|---|
| `PulseLogo.tsx` | Reanimated 4 | Montage écran / mode `draw` & `idle` | 920ms + 360ms + boucle 2.4s | UI | **OUI** (`AccessibilityInfo`) | Conforme sur le plan du thread. Tracé SVG à harmoniser. |
| `AnimatedBackgroundGlow.tsx` | Reanimated 4 | Ambiant en arrière-plan (mode sombre) | 6.5s et 8.5s (boucle infinie) | UI | **OUI** (`useReducedMotion`) | Ultra fluide, GPU-first, 0 reflow. |
| `GlassFloatingActionButton.tsx` | React Native `Animated` | Entrée sur onglet (`useFocusEffect`) | 420ms repli après 10s | **JS** (`useNativeDriver: false`) | **NON** | **DÉFECTUEUX** : anime `width` sur le thread JS, provoque des saccades lors du défilement des listes. |
| `(tabs)/_layout.tsx` (TabItem) | Reanimated 4 | Sélection d'onglet | Ressort (spring) + 200ms | UI | **NON** | Fluide sur thread UI mais ignore le paramètre système de mouvement réduit. |
| `Snackbar.tsx` | Reanimated 4 | Apparition d'un message / Undo | 250ms entrée / sortie | UI | **NON** | Fluide mais sans garde de mouvement réduit. |
| `GlowCard.tsx` | Reanimated 4 | Appui tactile (`onPressIn/Out`) | Ressort léger (scale 0.985) | UI | **NON** | Interaction tactile subtile et réactive. |
| Transitions d'écrans | Expo Router (Native Stack) | Navigation push / pop | ~300ms (standard OS) | Natif | **OUI** (géré par l'OS) | Conforme. |

---

## 3. ANALYSE CRITIQUE DES BIBLIOTHÈQUES CANDIDATES

### 3.1 Reanimated 4.5.1 (Déjà installée)
- **Besoin couvert :** 95 % des besoins d'animation (apparitions de cartes, listes décalées, transitions, pastille d'onglets, swipe gestuel).
- **Compatibilité :** Expo SDK 57 / React Native 0.86 / Architecture New Architecture (Bridgeless).
- **Poids ajouté :** 0 Ko (déjà dans le bundle).
- **Verdict :** **INDISPENSABLE ET PRIORITAIRE**. Toutes les améliorations d'animation doivent être réalisées en priorité avec Reanimated 4 avant toute nouvelle dépendance.

### 3.2 expo-glass-effect ~57.0.4 (Déjà installée)
- **Besoin couvert :** Effet de flou matériel en temps réel (« Liquid Glass »).
- **Compatibilité :** Complète sur iOS (UIVisualEffectView). Sur Android, le support dépend des capacités GPU de l'appareil ; repli semi-transparent (`rgba`) nécessaire.
- **Verdict :** **UTILE AVEC REPLI**. À exploiter pour les barres et modales, avec fallback propre pour Android.

### 3.3 react-native-gesture-handler ~2.32.0 (Déjà installée)
- **Besoin couvert :** Gestes de balayage (Swipe to delete / Swipe to snooze).
- **Compatibilité :** Déjà configurée à la racine (`GestureHandlerRootView`).
- **Verdict :** **INDISPENSABLE**. À brancher sur les cartes de listes pour résorber U-01.

### 3.4 @shopify/react-native-skia (Candidate)
- **Besoin couvert :** Rendu 2D shader, flous vectoriels sophistiqués, lueur volumique en temps réel.
- **Poids ajouté :** ~3 à 5 Mo dans l'APK final.
- **Compatibilité Expo 57 :** Nécessite un build natif (EAS Build / prebuild), support New Architecture en cours de stabilisation.
- **Verdict :** **NON NÉCESSAIRE EN V1**. Les effets actuels avec `LinearGradient`, SVG et Reanimated sont amplement suffisants et n'alourdissent pas l'application pour les téléphones d'entrée de gamme.

### 3.5 lottie-react-native (Candidate)
- **Besoin couvert :** Micro-illustrations vectorielles complexes (icône de succès animée, mascottes, tutoriel).
- **Poids ajouté :** ~300 Ko + poids des fichiers JSON d'animation.
- **Verdict :** **OPTIONNELLE POUR LA V2**. Utile uniquement si des illustrations narratives sont dessinées par un motion designer. Inutile pour l'interface courante.

### 3.6 Three.js (`@react-three/fiber` / `expo-gl`)
- **Besoin couvert :** Scène 3D réelle en volume (mesh, lumières, caméra 3D).
- **Poids ajouté :** > 600 Ko de bundle JS + bibliothèques natives C++ OpenGL.
- **Impact matériel :**
  - Consommation mémoire vive : +40 à 80 Mo.
  - Consommation batterie : critique (maintien du GPU à haute fréquence).
  - Chauffe thermique sévère sur smartphones d'entrée/milieu de gamme sous climat tropical chaud (Abidjan).
  - Accessibilité et mouvement réduit quasi impossibles à standardiser.
- **Verdict :** **FORMELLEMENT DÉCONSEILLÉE**. Absurde pour une application de productivité personnelle locale.

---

## 4. ORDRE D'AJOUT ET DE CONSOLIDATION RECOMMANDÉ

1. **Élimination de la dette existante** : Migrer l'animation du FAB (`GlassFloatingActionButton.tsx`) de `useNativeDriver: false` vers **Reanimated 4** (thread UI) avec un hook `useReducedMotion()`.
2. **Harmonisation de la séquence de lancement** : Remplacer les PNG opaques par des PNG à fond transparent centrés, éliminant le carré blanc.
3. **Apparition progressive des listes** : Introduire des animations d'entrée Reanimated légères (`FadeInDown.duration(200).delay(index * 40)`) sur les listes de tâches et rappels (jouées une seule fois par montage).
4. **Swipe gestuel (U-01)** : Implémenter le swipe vers la gauche (suppression avec Undo) et vers la droite (snooze / complétion) via `react-native-gesture-handler` et Reanimated.

---

## 5. AUDIT DU SIGNAL SONORE DES NOTIFICATIONS (U-11)

### 5.1 Diagnostic de l'existant
Actuellement, `notification-service.ts` utilise :
- `sound: "default"` dans le payload de planification.
- Aucun son personnalisé rattaché au canal Android `reminders`.
- Par conséquent, l'application émet le son de notification par défaut configuré au niveau de l'OS du smartphone.

### 5.2 Contraintes techniques Android 8+ et Expo SDK 57
1. **Canal Android immuable** : Sur Android 8.0+ (API 26+), le son d'une notification est fixé lors de la création du **canal de notification**. Une fois le canal créé sur l'appareil de l'utilisateur, l'application ne peut plus modifier son son par code. Tout changement de son exige la création d'un **nouveau canal versionné** (ex. `channelId: "reminders_v2"`).
2. **Exigence de build natif** : La documentation officielle Expo SDK 57 (`expo-notifications`) stipule que la prise en charge de fichiers sons personnalisés (`sounds: [...]` dans `app.json`) n'est **pas supportée dans Expo Go standard**. Elle nécessite un Development Build ou un APK de production généré via EAS Build.
3. **Statut d'audit :** **Non vérifiable sur machine hôte** — Le rendu sonore et la compatibilité du canal doivent obligatoirement être validés sur un appareil physique Android en build autonome.

### 5.3 Comparatif des options sonores

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|:---:|
| **Option A : Son système par défaut** | • 100 % fiable sur tous les constructeurs.<br>• Respecte les préférences de l'utilisateur.<br>• 0 Ko ajouté au bundle. | • Aucune identité de marque sonore. | **Repli sécurisé** |
| **Option B : Son court de marque (1,2s - 2 notes)** | • Reconnaissance immédiate de l'app.<br>• Signature élégante et moderne. | • Nécessite un build natif.<br>• Risque de saturation si mal calibré. | **Recommandée (V1.1)** |
| **Option C : Sélecteur dans les réglages** | • Contrôle total laissé à l'utilisateur. | • Complexité de gestion de multiples canaux Android. | **Optionnelle (V2)** |

### 5.4 Règles de composition et droits d'auteur
- **Durée recommandée :** 800 ms à 1 400 ms maximum (2 à 3 notes claires, timbre marimba / harpe douce / onde sinusoïdale feutrée).
- **Règles juridiques strictes :** Ne jamais intégrer un son système propriétaire (Apple Tri-Tone, Android Chime) ni un extrait d'enregistrement d'une œuvre musicale protégée.
- **Sources admissibles :**
  1. Son synthétisé sur-mesure pour Junix Pulse (libre de tout droit d'enregistrement).
  2. Son sous licence commerciale permissive (CC0 ou licence commerciale royalty-free avec attestation).
