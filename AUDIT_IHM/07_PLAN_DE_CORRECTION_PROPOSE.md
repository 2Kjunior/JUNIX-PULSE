# 🛠️ AUDIT JUNIX PULSE — 07. PLAN DE CORRECTION PROPOSÉ PAR LOTS ORDONNÉS

> **Important :** Ce plan est purement propositionnel et méthodologique. **Aucune ligne de code du projet n'a été modifiée.** Les lots sont ordonnés selon la criticité décroissante (sécurité et intégrité des données d'abord, confort et esthétique ensuite).

---

## LOT 1 — SÉCURITÉ, VIE PRIVÉE ET INTÉGRITÉ DE PERSISTANCE (P1)
- **Défauts couverts :** `DEF-01` (Sanctuaire non chiffré, hash PIN), `DEF-02` (Effacement incomplet des données).
- **Actions numérotées :**
  1. Implémenter une routine de chiffrement authentifié XChaCha20-Poly1305 pour la colonne `content` de `sanctum_notes`.
  2. Remplacer le hash SHA-256 à sel fixe par un KDF dérivant une clé cryptographique à partir du PIN et d'un sel aléatoire stocké dans le trousseau matériel (`expo-secure-store`).
  3. Mettre à jour `clearAllData()` pour inclure toutes les tables de l'application (`sanctum_notes`, `recurrence_rules`, `personal_schedules`, `planning_blocks`, `settings`) au sein d'une transaction SQLite unique.
  4. Appeler explicitement `NotificationService.cancelAll()` lors de l'effacement.
- **Fichiers impactés :** `src/app/sanctum.tsx`, `src/repositories/sanctum-repository.ts`, `src/database/seed.ts`, `src/services/backup-service.ts`.
- **Risques :** Nécessité d'une routine de migration pour ne pas perdre les notes existantes non chiffrées.
- **Test de validation futur :** Exécuter une inspection SQL directe démontrant l'illisibilité du contenu sans déverrouillage, et tester l'effacement complet avec contrôle de base vide.

---

## LOT 2 — FIABILITÉ DES RAPPELS, DU TEMPS ET DES NOTIFICATIONS (P1–P2)
- **Défauts couverts :** `DEF-03` (Rupture des récurrences), `DEF-04` (Reports dans le passé), `DEF-09` (Reprogrammation silencieuse à +10s), `DEF-15` (Dérive mensuelle sans `dayOfMonth`).
- **Actions numérotées :**
  1. Ajouter un service de conciliation au démarrage dans `src/app/_layout.tsx` pour détecter les rappels récurrents échus et instancier automatiquement leur prochaine occurrence future.
  2. Réécrire `computeSnoozeTomorrowSameTime` pour baser le calcul sur `max(scheduledAt, now)`.
  3. Réécrire `getNextOccurrence` pour boucler jusqu'à la première occurrence strictement future lorsque le rappel a été validé en retard.
  4. Ajouter une garde dans `capture.tsx` et `reminder-use-cases.ts` empêchant la programmation silencieuse à +10s si l'heure saisie est passée, avec message informatif à l'utilisateur.
  5. Initialiser systématiquement `dayOfMonth` lors de la création d'un rappel mensuel dans `reminders/new.tsx`.
- **Fichiers impactés :** `src/domain/rules/reminder-rules.ts`, `src/use-cases/reminder-use-cases.ts`, `src/services/notification-service.ts`, `src/app/capture.tsx`, `src/app/reminders/new.tsx`.
- **Risques :** Modification de la logique de planification nécessitant des tests unitaires déterministes exhaustifs sur les fuseaux et années bissextiles.

---

## LOT 3 — PARCOURS ESSENTIELS, PARSING NLP ET FORMULAIRES (P2)
- **Défauts couverts :** `DEF-10` (Faux positifs capture NLP), `DEF-14` (Outils de test exposés).
- **Actions numérotées :**
  1. Réordonner les règles d'évaluation dans `capture.tsx` : tester « après-demain » strictement avant « demain ».
  2. Prioriser la détection des heures explicites (« 19h », « 07h30 ») avant l'application des raccourcis flous (« soir », « matin »).
  3. Restreindre la recherche de noms de contacts avec des frontières de mots entiers (`\b${name}\b`).
  4. Entourer les boutons de démo et la puce « Dans 10s » de gardes conditionnelles `if (__DEV__)`.
- **Fichiers impactés :** `src/app/capture.tsx`, `src/app/reminders/new.tsx`, `src/app/settings/index.tsx`.
- **Risques :** Régression sur la tolérance de saisie en langage naturel.

---

## LOT 4 — ARCHITECTURE DE L'INFORMATION ET NAVIGATION (P2–P3)
- **Défauts couverts :** `DEF-02` / `I-15` (Bouton reset trompeur), `U-02` / `U-07` (Terminologie ambiguë « Sanctum » vs « Sanctuaire » et triple usage de « Schedule »).
- **Actions numérotées :**
  1. Renommer clairement l'action de réinitialisation dans `settings/index.tsx` en « Réinitialiser l'onboarding » (ou implémenter une vraie réinitialisation totale après confirmation explicite).
  2. Unifier la dénomination en « Sanctuaire » partout dans les réglages et l'écran.
  3. Renommer les routes et libellés d'écrans pour distinguer « Heures de briefing » (`(onboarding)/schedule`), « Blocs hebdomadaires » (`settings/schedule`) et « Grille horaire » (`calendar.tsx`).
- **Fichiers impactés :** `src/app/settings/index.tsx`, `src/app/sanctum.tsx`, `src/app/(onboarding)/schedule.tsx`.

---

## LOT 5 — ACCESSIBILITÉ NUMÉRIQUE (WCAG 2.2 AA) (P1–P2)
- **Défauts couverts :** `DEF-05` (Boutons icônes sans nom), `DEF-12` (Contrastes textuels).
- **Actions numérotées :**
  1. Ajouter `accessibilityRole="button"` et un `accessibilityLabel` descriptif sur l'intégralité des boutons icône seule (retour, ajout, suppression, fermeture de modale, coches de tâche).
  2. Ajouter `accessibilityRole="radio"` ou `"checkbox"` et `accessibilityState={{ selected }}` sur les chips de filtrage et options d'action.
  3. Réajuster les couleurs de texte et de fond dans `palettes.ts` pour garantir un ratio $\ge 4,5:1$ : assombrir le début du dégradé primaire (`#7C3AED` au lieu de `#8B5CF6`) ou adapter la couleur de texte, et renforcer `#A8A29E` en mode clair vers `#78716C`.
- **Fichiers impactés :** `src/constants/palettes.ts`, `src/components/calendar/CalendarTimetable.tsx`, `src/app/settings/schedule.tsx`, `src/app/goals/[id].tsx`, `src/app/sanctum.tsx`.

---

## LOT 6 — DESIGN SYSTEM ET BOUTONS VERRE (P2–P3)
- **Défauts couverts :** `DEF-07` (Double padding et bague sombre sur Button), `DEF-17` (Remplacement des violets codés en dur par le langage verre).
- **Actions numérotées :**
  1. Corriger `Button.tsx` pour appliquer la taille et les paddings uniquement sur le conteneur `LinearGradient` et non sur le `Pressable` parent.
  2. Retirer `elevation: 6` sur les conteneurs transparents avec `overflow: 'hidden'` sur Android, en isolant l'ombre sur un calque opaque.
  3. Remplacer les dégradés violets codés en dur dans `GlassFloatingActionButton.tsx` par les jetons thématiques Midnight Glassmorphism harmonisés avec la barre inférieure.
- **Fichiers impactés :** `src/components/ui/Button.tsx`, `src/components/ui/GlassFloatingActionButton.tsx`.

---

## LOT 7 — BARRES ET COMPOSITION D'ÉCRAN (P2–P3)
- **Défauts couverts :** `DEF-16` (Bouton Aujourd'hui invisible et rayures de fond dans Pulse), `U-06` (Robustesse de la bottom bar).
- **Actions numérotées :**
  1. Redéfinir `todayBtnDisabled` dans `calendar-styles.ts` avec une bordure visible et un contraste adapté.
  2. Remplacer le fond rayé `rgba(255,255,255,0.04)` des modules de Pulse par les jetons `theme.surface.container` et `theme.glass.card`.
  3. Vérifier les marges et `numberOfLines` des libellés d'onglets pour empêcher tout débordement avec grande taille de police.
- **Fichiers impactés :** `src/styles/tabs/calendar-styles.ts`, `src/styles/tabs/pulse-styles.ts`, `src/app/(tabs)/_layout.tsx`.

---

## LOT 8 — GESTES (SWIPE) ET CONFIRMATIONS ERGONOMIQUES (P2)
- **Défauts couverts :** `DEF-08` (Absence de swipe), `DEF-13` (51 boîtes modales bloquantes `Alert.alert`).
- **Actions numérotées :**
  1. Implémenter un composant réutilisable `SwipeableItem` basé sur `react-native-gesture-handler` et Reanimated pour les listes de tâches, rappels et personnes.
  2. Déclencher une suppression douce réversible avec Snackbar et bouton « Annuler » (durée 30s) pour toutes les entités primaires.
  3. Réduire les appels à `Alert.alert` de 51 à moins de 8, en remplaçant les alertes d'erreur par des bannières contextuelles non bloquantes.
- **Fichiers impactés :** `src/components/ui/SwipeableItem.tsx` (à créer), `src/app/(tabs)/tasks.tsx`, `src/app/(tabs)/index.tsx`, `src/app/reminders/[id].tsx`.

---

## LOT 9 — IDENTITÉ VISUELLE ET SÉQUENCE DE LANCEMENT (P2)
- **Défauts couverts :** `DEF-06` (Carré blanc au démarrage, écran animé redondant).
- **Actions numérotées :**
  1. Régénérer les assets `assets/images/splash-icon.png` et `android-icon-foreground.png` avec **fond 100 % transparent** (alpha = 0) et centrage strict du logo officiel.
  2. Valider l'option de démarrage retenue par le propriétaire (Option A : SplashScreen natif transparent direct sans écran animé, ou Option B : transition fluide courte $\le 600\text{ ms}$).
  3. Aligner le tracé SVG de `PulseLogo.tsx` sur les proportions exactes de `official-logo.png`.
- **Fichiers impactés :** `assets/images/splash-icon.png`, `assets/images/android-icon-foreground.png`, `app.json`, `src/components/ui/SplashAnimated.tsx`, `src/components/ui/PulseLogo.tsx`.

---

## LOT 10 — ANIMATIONS ET BIBLIOTHÈQUES (P2)
- **Défauts couverts :** `DEF-11` (Animation JS du FAB).
- **Actions numérotées :**
  1. Réécrire le repli du FAB dans `GlassFloatingActionButton.tsx` avec Reanimated 4 sur le thread UI via des transformations (`scale`, `opacity`).
  2. Créer un hook central `useSafeReducedMotion()` et conditionner toutes les animations non indispensables.
  3. Formaliser l'abandon de Three.js et Skia pour la V1.
- **Fichiers impactés :** `src/components/ui/GlassFloatingActionButton.tsx`, `src/hooks/use-safe-reduced-motion.ts` (à créer).

---

## LOT 11 — ONBOARDING ET EXPÉRIENCE DE BIENVENUE (P3)
- **Actions numérotées :**
  1. Harmoniser les transitions entre les 5 étapes de l'onboarding Stitch.
  2. Permettre à l'utilisateur de rejouer la présentation des 3 concepts depuis les Réglages.
- **Fichiers impactés :** `src/app/(onboarding)/**`, `src/app/settings/index.tsx`.

---

## LOT 12 — QUALITÉ LINGUISTIQUE, TYPOGRAPHIE ET INCLUSIVITÉ (P3)
- **Actions numérotées :**
  1. Remplacer les apostrophes droites `'` par des apostrophes typographiques `’` dans les chaînes visibles.
  2. Corriger les espaces insécables avant les ponctuations doubles (`:`, `!`, `?`).
  3. Vérifier la neutralité de genre des formulaires et messages.
- **Fichiers impactés :** Fichiers de vues dans `src/app/**`.

---

## LOT 13 — PERFORMANCE, EMPREINTE MÉMOIRE ET BATTERIE (P2–P3)
- **Actions numérotées :**
  1. Mesurer et réduire le coût scrypt dans `backup-crypto.ts` ($N=32768$ ou KDF adapté mobile pour éviter l'OOM sur Android modeste).
  2. Ajuster la fenêtre de virtualisation (`windowSize`, `maxToRenderPerBatch`) sur les `FlatList` longues.
- **Fichiers impactés :** `src/services/backup-crypto.ts`, écrans de listes.

---

## LOT 14 — TESTS DE RÉGRESSION, OUTILS ET DOCUMENTATION (P2)
- **Actions numérotées :**
  1. Écrire des tests Jest couvrant les cas limites de récurrence (retards de complétion, snooze dans le passé).
  2. Mettre à niveau les 3 versions patch signalées par `expo-doctor` (`@expo/ui`, `expo`, `expo-router`).
  3. Mettre à jour `README.md` et `RECAPITULATIF_PROJET.md` pour refléter l'état exact des corrections appliquées.
- **Fichiers impactés :** `src/domain/rules/__tests__/**`, `package.json`, documentation.
