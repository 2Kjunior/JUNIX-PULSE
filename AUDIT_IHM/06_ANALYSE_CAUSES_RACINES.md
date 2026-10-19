# 🧠 AUDIT JUNIX PULSE — 06. ANALYSE DES CAUSES RACINES

> **Objectif :** Regrouper les 18 défauts et anomalies constatés autour de leurs causes techniques et conceptuelles profondes afin d'éviter les corrections superficielles (*quick fixes*) qui déplacent le problème.

---

## 1. CAUSE RACINE N° 1 — DÉFAUT D'ASSETS GRAPHIQUES ET ABSENCE DE CANAL ALPHA
- **Défauts rattachés :** `DEF-06` (Carré blanc au lancement, saut visuel natif/animé, divergence logo).
- **Mécanisme :**
  Les images `assets/images/splash-icon.png` et `android-icon-foreground.png` ont été générées ou exportées en mode RVB opaque (alpha = 255) avec un fond blanc solide `#FEF9FD` de 1024x1024 px.
  Or, la configuration du SplashScreen natif dans `app.json` spécifie un arrière-plan sombre `#141317`.
  L'OS Android ne disposant d'aucune transparence pour fondre le logo dans la surface, il découpe et centre un carré blanc opaque de 120dp.
- **Principe de remédiation :**
  Remplacer ces fichiers par un export SVG/PNG détouré avec fond 100 % transparent (`alpha = 0`) et zone de protection (*safe zone*) conforme aux spécifications Android 12+.

---

## 2. CAUSE RACINE N° 2 — SÉCURITÉ DE SURFACE SANS CHIFFREMENT DE PERSISTANCE
- **Défauts rattachés :** `DEF-01` (Notes en clair dans SQLite, hash PIN à sel fixe), `DEF-02` (Effacement incomplet omettant `sanctum_notes`).
- **Mécanisme :**
  Le Sanctuaire a été conçu comme un verrouillage d'écran cosmétique (état booléen React `currentView: 'locked' | 'list'`) contrôlé par `expo-local-authentication`, plutôt que comme un coffre-fort cryptographique.
  Les données ont été insérées directement dans une table SQLite non chiffrée. Le mot de passe/PIN n'a servi qu'à comparer un condensat SHA-256 sans KDF au lieu de dériver une clé de chiffrement symétrique (ex. XChaCha20-Poly1305 ou AES-GCM).
- **Principe de remédiation :**
  Appliquer le principe de *chiffrement au repos* (*encryption at rest*) : le champ `content` de `sanctum_notes` doit être chiffré avant écriture avec une clé dérivée du PIN ou d'une clé aléatoire stockée dans `expo-secure-store`.

---

## 3. CAUSE RACINE N° 3 — ABSENCE DE CONCILIATION TEMPORELLE ACTIVE AU DÉMARRAGE
- **Défauts rattachés :** `DEF-03` (Rupture des récurrences non marquées achevées), `DEF-04` (Report et occurrences créées dans le passé), `DEF-09` (Reprogrammation sauvage à +10s).
- **Mécanisme :**
  L'application calcule la prochaine occurrence uniquement au moment de l'événement utilisateur « Terminer ».
  Si l'utilisateur ne valide pas l'occurrence, le système ne se réveille jamais pour avancer la série. De plus, les formules mathématiques `addDays(scheduledAt, 1)` font l'hypothèse fausse que l'action a lieu le jour même de l'échéance.
- **Principe de remédiation :**
  1. Instaurer un hook de conciliation au démarrage (`_layout.tsx`) qui balaie les règles de récurrence et instancie la prochaine occurrence future si l'actuelle est échue.
  2. Remplacer les formules de report par des calculs relatifs à `max(scheduledAt, now)`.

---

## 4. CAUSE RACINE N° 4 — EMPILAGE DE PADDING ET D'ÉLÉVATION DANS LES COMPOSANTS UI
- **Défauts rattachés :** `DEF-07` (Décentrage du texte des boutons et bague sombre Android), `DEF-11` (Reflow JS du FAB).
- **Mécanisme :**
  Dans `Button.tsx`, le style de taille (`size_md`, etc.) contenant `paddingVertical` et `minHeight` a été assigné simultanément au `<Pressable>` parent ET au `<LinearGradient>` enfant.
  Sur Android, l'attribut `elevation: 6` sur une vue parente transparente avec `overflow: 'hidden'` produit un artefact de rasterisation (anneau sombre).
  Pour le FAB, la volonté d'animer le repli a été codée via l'API historique `Animated` avec `useNativeDriver: false` au lieu d'interpolations de scale/opacity gérées nativement.
- **Principe de remédiation :**
  Normaliser le composant `Button` pour que seul le conteneur interne gère le padding, et migrer le FAB vers Reanimated 4 sur le thread UI.

---

## 5. CAUSE RACINE N° 5 — DÉLÉGATION SYSTÉMIQUE AUX MODALES BLOQUANTES `Alert.alert`
- **Défauts rattachés :** `DEF-13` (51 Alert.alert intrusives), `DEF-08` (Manque de gestes swipe avec undo).
- **Mécanisme :**
  Face à l'absence de composants de dialogue personnalisés et de gestes de swipe, le code a eu recours systématique à `Alert.alert` pour traiter à la fois les erreurs brutes, les confirmations destructives et les informations de service.
- **Principe de remédiation :**
  Systématiser l'usage du store Zustand `useAppStore().showSnackbar(message, { action: undo })` pour toutes les suppressions, et réserver `Alert.alert` aux seules opérations irréversibles critiques.

---

## 6. CAUSE RACINE N° 6 — OMISSOIN DES MÉTADONNÉES D'ACCESSIBILITÉ SUR LES ICÔNES PURS
- **Défauts rattachés :** `DEF-05` (Boutons sans libellé accessible pour TalkBack/VoiceOver).
- **Mécanisme :**
  React Native utilise par défaut le texte enfant pour composer le libellé accessible d'un composant cliquable. Quand un bouton ne contient qu'une balise `<Ionicons>`, aucun texte n'est disponible et le composant est invisible sémantiquement pour le lecteur d'écran.
- **Principe de remédiation :**
  Instaurer une règle de linter ou un composant wrapper `IconButton` imposant obligatoirement un `accessibilityLabel` non vide.
