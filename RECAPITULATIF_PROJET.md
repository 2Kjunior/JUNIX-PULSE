# 📑 Junix Pulse — Récapitulatif Exhaustif du Projet & État des Lieux Technique

> **Date du document :** 28 septembre 2026

> **Version cible :** 1.0.0 (Production Offline-First)  
> **Statut global :** V1 fonctionnelle, Typage strict TypeScript validé (`tsc --noEmit` : **0 erreur**), Design System & Onboarding unifiés.

---

## 1. 🌟 Vision Produit & Principes Directeurs

**Junix Pulse** est un système d'exploitation de vie personnelle (_Personal Life OS_) mobile, conçu selon le paradigme **Offline-First / Local-First**.

### Invariants Métier Inviolables (Business Rules)

1. **Confidentialité absolue & Zéro Cloud (BR-018 / BR-021)** : 100% des données utilisateur résident dans une base locale SQLite chiffrable sur l'appareil. Aucun compte obligatoire, aucun tracking, aucun serveur distant requis pour fonctionner.
2. **La Personne au centre du produit** : Les interactions sociales sont un pôle majeur. L'application surveille la qualité du lien social (contacts non relancés depuis $X$ jours).
3. **Moteur de Suggestions Proactif mais Non Intrusif (BR-001)** : L'IA/moteur de suggestion ("Pulse") analyse les données en local et formule des propositions intelligentes avec explication obligatoire. **Il n'impose jamais d'action automatique** : l'utilisateur dispose toujours du choix explicite _Accepter_ ou _Refuser_.
4. **Séries d'Habitudes avec Pauses Légitimes (BR-011)** : Une habitude mise en pause (vacances, maladie) **ne brise pas le streak**. Les jours sous pause active sont exclus du calcul sans être pénalisés.
5. **Progression des Objectifs par Dérivation Dynamique (BR-012)** : La progression d'un objectif ($0-100\%$) est calculée en temps réel d'après le ratio de tâches complétées associées. Sans tâche, l'état est `null` ("non mesuré"), jamais $0\%$ en échec artificiel.
6. **Planning Flexible (BR-013 / BR-014)** : L'emploi du temps hebdomadaire par blocs d'activité est une _intention de structure_, jamais une contrainte coercitive.
7. **Suppression avec Filet de Sécurité (Undo 30s)** : Les suppressions sont protégées par une suppression logique réversible pendant 30 secondes via le Snackbar global.

---

## 2. 🛠️ Stack Technique & Dépendances Clés

| Composant                    | Technologie                                                      | Rôle & Justification                                                           |
| :--------------------------- | :--------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Framework Mobile**         | React Native `0.86.3` / Expo SDK `~57.0.30`                      | Écosystème moderne multiplateforme, support New Architecture.                  |
| **Routage**                  | Expo Router `~57.0.28` (v4 file-based)                           | Navigation déclarative basée sur les dossiers et fichiers (`src/app`).         |
| **Base de Données**          | `expo-sqlite` `~57.0.4`                                          | Moteur SQLite natif, mode WAL (Write-Ahead Logging), migrations immuables.     |
| **Gestion d'État UI**        | `zustand` `^5.0.15`                                              | Store léger pour l'état d'interface (Snackbar, initialisation DB, onboarding). |
| **Animations**               | `react-native-reanimated` `4.5.1` & `react-native-svg` `15.15.4` | Logo SVG tracé en temps réel, halo respirant, battements cardiaques.           |
| **Date & Heure**             | `date-fns` `^4.4.0`                                              | Manipulation déterministe et immuable des dates et fuseaux.                    |
| **Formulaires & Validation** | `react-hook-form` `^7.87.0`, `zod` `^4.6.1`                      | Schémas de validation stricts pour la création d'entités.                      |
| **Notifications**            | `expo-notifications` `~57.0.23`                                  | Notifications locales planifiées (100% compatibles Expo Go et builds natifs).  |
| **Typographie**              | `@expo-google-fonts/inter` + `@expo-google-fonts/outfit`         | Inter pour le texte courant, Outfit pour les grands titres et l'onboarding.    |
| **Tests Automatisés**        | `jest` `^29.7.0` + `react-test-renderer` `19.2.3`                 | 25 suites de tests unitaires et d'intégration (299 tests, 100% passants).       |

---

## 3. 🏗️ Architecture du Code & Arborescence

Le projet suit une **architecture en couches découplées** (Clean Architecture allégée) :

```
junix-pulse/
├── src/
│   ├── app/                      # Couche Présentation (Expo Router v4)
│   │   ├── _layout.tsx           # Layout racine (DB init, polices, splash animé, routes)
│   │   ├── (onboarding)/         # Parcours 5 étapes du premier lancement
│   │   │   ├── _layout.tsx       # Layout isolé de l'onboarding
│   │   │   ├── index.tsx         # Étape 1 : Bienvenue & valeurs (R-02)
│   │   │   ├── discover.tsx      # Étape 2 : Découverte des 3 concepts
│   │   │   ├── personalize.tsx   # Étape 3 : Prénom & détection fuseau horaire
│   │   │   ├── schedule.tsx      # Étape 4 : Heures clés (matin / fin de journée)
│   │   │   └── permissions.tsx   # Étape 5 : Permissions locales bienveillantes
│   │   ├── (tabs)/               # 5 Onglets principaux (Navigation principale)
│   │   │   ├── _layout.tsx       # Barre de navigation à 5 destinations
│   │   │   ├── index.tsx         # Onglet 1 : "Aujourd'hui" (Dashboard centralisé)
│   │   │   ├── tasks.tsx         # Onglet 2 : Tâches (Inbox, Aujourd'hui, Toutes)
│   │   │   ├── calendar.tsx      # Onglet 3 : Calendrier & Agenda combiné 7 jours
│   │   │   ├── people.tsx        # Onglet 4 : Personnes & Contacts oubliés
│   │   │   └── pulse.tsx         # Onglet 5 : Pulse (Moteur IA, Streaks, Objectifs)
│   │   ├── reminders/            # Routes dédiées Rappels (index, new, [id], edit/[id])
│   │   ├── tasks/                # Routes dédiées Tâches ([id].tsx, new.tsx)
│   │   ├── people/               # Routes dédiées Personnes ([id].tsx, new.tsx)
│   │   ├── events/               # Routes dédiées Événements ([id].tsx, new.tsx)
│   │   ├── habits/               # Routes dédiées Habitudes ([id].tsx, new.tsx, index.tsx)
│   │   ├── goals/                # Routes dédiées Objectifs ([id].tsx, new.tsx, index.tsx)
│   │   ├── settings/             # Paramètres système & Emploi du temps type
│   │   ├── capture.tsx           # Capture rapide (R-11)
│   │   ├── sanctum.tsx           # Coffre-fort biométrique (R-12)
│   │   └── search.tsx            # Recherche globale (R-13)
│   ├── components/               # Composants UI réutilisables
│   │   ├── feedback/             # Snackbar global, LoadingState, ErrorState, EmptyState
│   │   └── ui/                   # Button dégradé, PulseLogo SVG, StepIndicator, ValueBadge, Collapsible
│   ├── constants/
│   │   └── theme.ts              # Design tokens (Midnight, Electric Violet, Digital Cyan, Glass, Radius)
│   ├── database/                 # Couche de persistance SQLite
│   │   ├── sqlite.ts             # Initialisation SQLite, PRAGMA WAL, exécuteur de migrations
│   │   └── migrations.ts         # Définition des 20 migrations incrémentales immuables
│   ├── domain/                   # Coeur Métier pur (indépendant de React et SQLite)
│   │   ├── entities/             # Types TypeScript de toutes les entités
│   │   ├── enums/                # Énumérations strictes (statuts, types, priorités)
│   │   └── rules/                # Fonctions pures déterministes (calcul streak, snooze, progression)
│   ├── repositories/             # Couche d'Accès aux Données (SQL <-> Entités)
│   ├── services/                 # Services natifs (NotificationService locale)
│   ├── store/                    # État global UI Zustand (app-store.ts)
│   └── use-cases/                # Cas d'utilisation orchestrant repositories et règles métier
```

---

## 4. 🗄️ Persistance : Schéma SQLite & Migrations (001 à 020)

Toutes les migrations sont versionnées dans `src/database/migrations.ts` et appliquées séquentiellement dans une transaction avec table de suivi `_migrations`.

1. **`001_create_persons`** : Répertoire de relations (`display_name`, `phone`, `email`, `last_interaction_at`, `forgotten_threshold_days`).
2. **`002_create_recurrence_rules`** : Moteur de récurrence (`DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM_INTERVAL`, positions mensuelles).
3. **`003_create_reminders`** : Rappels (`scheduled_at`, `priority`, `action_type`, `snoozed_until`, `recurrence_rule_id`, `person_id`).
4. **`004_create_reminder_checklist_items`** : Sous-items de contrôle liés à un rappel.
5. **`005_create_tasks`** : Tâches d'action (`status`, `scheduled_date`, `estimated_minutes`, `priority`, `tags`).
6. **`006_create_subtasks`** : Sous-tâches niveau 1 ordonnées par position.
7. **`007_create_events`** : Événements calendrier avec début, fin, lieu, type et temps de trajet (`travel_buffer_minutes`).
8. **`008_create_event_persons`** : Table de jointure plusieurs-à-plusieurs Événements $\leftrightarrow$ Personnes.
9. **`009_create_habits`** : Habitudes récurrentes (`frequency`, `target_days_per_week`, `color`, `status`).
10. **`010_create_habit_completions`** : Journal de complétion quotidienne (`habit_id`, `completed_date` UNIQUE).
11. **`011_create_habit_pauses`** : Périodes de gel des habitudes pour préserver les séries.
12. **`012_create_goals`** : Objectifs à long terme (`deadline`, `status`).
13. **`013_create_goal_tasks`** : Jointure dynamique Objectif $\leftrightarrow$ Tâches pour calcul de complétion.
14. **`014_create_personal_schedules`** : Emplois du temps hebdomadaires (`valid_from`, `valid_until`).
15. **`015_create_planning_blocks`** : Blocs d'activité récurrents (`day_of_week`, `start_time`, `end_time`, `type`).
16. **`016_create_interactions`** : Journal des interactions (`CALL`, `SMS`, `MEET`, `EMAIL`) relié aux personnes.
17. **`017_create_suggestions`** : Propositions du moteur IA (`type`, `status`, `explanation`, `target_id`, `expires_at`).
18. **`018_create_settings`** : Configuration unique utilisateur (`timezone`, `onboarding_completed`, `morning_briefing_hour`, `end_of_day_hour`).
19. **`019_create_indexes`** : Index de performance pour les requêtes fréquentes (dates, statuts, clés étrangères).
20. **`020_create_sanctum_notes`** : Note privée du coffre-fort Sanctum (`content`, `updated_at`).

### Stratégie de suppression (vérifiée dans le code, cohérente)

- **Suppression douce (`deleted_at`)** pour les 6 entités primaires manipulées directement par l'utilisateur : `persons`, `reminders`, `tasks`, `events`, `habits`, `goals`. Chaque repository correspondant écrit `UPDATE ... SET deleted_at = ?` (jamais `DELETE FROM`) et chaque lecture filtre systématiquement `WHERE deleted_at IS NULL`. Cela permet un Undo (30s) et évite toute référence orpheline sur les clés étrangères qui pointent vers ces tables (`reminders.person_id`, `goal_tasks.task_id`, etc.) puisque la ligne référencée n'est jamais physiquement effacée.
- **Suppression physique (`DELETE FROM` + `ON DELETE CASCADE`)** uniquement pour les tables de jointure ou de journal qui n'ont pas de cycle de vie propre indépendant de leur parent : `reminder_checklist_items`, `subtasks`, `event_persons`, `habit_completions`, `habit_pauses`, `goal_tasks`, `planning_blocks`, `interactions`. C'est le comportement attendu pour ce type de table.
- **`recurrence_rules`** n'est actuellement ni soft-delete ni jamais supprimée (aucun repository dédié) : les lignes s'accumulent sans nettoyage. Sans impact fonctionnel immédiat (volume négligeable à l'échelle d'un usage personnel), mais à garder en tête si une purge de données devient nécessaire plus tard.

---

## 5. 🧠 Logique Métier Détaillée (Domain Rules)

### A. Rappels & Snooze (`src/domain/rules/reminder-rules.ts`)

- **Rappels Manqués (BR-002)** : Un rappel dont l'échéance est passée de plus de 2 minutes sans complétion passe en statut `MISSED` pour alerte visuelle.
- **Les 3 Formes de Snooze (BR-003 / BR-003b)** :
  1. _Rapide_ : +15, +30 ou +60 minutes par rapport à l'heure actuelle (`now`).
  2. _Lendemain même heure_ : calculé par rapport à `scheduledAt` (+24h) et non `now`, évitant de décaler l'horaire de référence si l'utilisateur snooze tard le soir.
  3. _Personnalisé_ : date et heure sélectionnées via sélecteur natif.
- **Récurrence déterministe (BR-004)** : Calcule la prochaine occurrence selon le type d'intervalle, gérant les jours de semaine spécifiques et les positions mensuelles ("dernier vendredi du mois").

### B. Habitudes & Streaks (`src/domain/rules/habit-rules.ts`)

- **Calcul de Streak Robuste** : Remonte jour par jour dans le passé.
- **Gestion des Pauses (BR-011)** : Si une date est couverte par `habit_pauses`, la boucle saute le jour sans le comptabiliser et **sans rompre la série**.
- **Calcul du Meilleur Streak** : Parcours chronologique complet depuis la création avec réinitialisation uniquement sur jour manqué hors pause.

### C. Objectifs & Dérivation (`src/domain/rules/goal-rules.ts`)

- **Calcul de Complétion (BR-012)** :  
  $$\text{Progress} = \text{round}\left(\frac{\text{Tâches complétées}}{\text{Total tâches associées}} \times 100\right)$$
  Si aucune tâche n'est rattachée, retourne `null` pour signifier l'absence d'indicateur objectif.
- **Échéance (Overdue)** : Détecte les dépassements de date cible en jours restants ou jours de retard.

### D. Moteur de Suggestions Proactif (`src/use-cases/suggestion-use-cases.ts`)

Le moteur analyse trois sources critiques en tâche de fond ou au rafraîchissement :

1. _Contacts oubliés_ : Personnes sans interaction depuis plus de $N$ jours (défaut: 30j).
2. _Rappels manqués_ : Proposition de replanifier à demain les rappels non honorés.
3. _Streaks en danger_ : Habitudes actives avec streak en cours non encore validées aujourd'hui.

---

## 6. 🎨 Design System Verrouillé & Identité Visuelle

Conformément à la spécification produit issue de l'audit Stitch :

- **Palette Midnight** : Fond sombre `#141317`, conteneurs `#211F23`, surfaces élevées `#2B292D`.
- **Accents** : Electric Violet (`#D0BCFF` / `#A078FF`) et Digital Cyan (`#7BD0FF` / `#4CD7F6`).
- **Typographie** :
  - _Inter_ (Regular, Medium, SemiBold, Bold) pour l'intégralité des textes courants et labels.
  - _Outfit_ (SemiBold, Bold) strictement réservé aux grands titres d'écrans et à l'onboarding.
- **Règle Zéro Emoji dans les composants structurels** : Remplacement systématique par des icônes vectorielles `Ionicons`.
- **Règle du Bouton Dégradé Unique** : Un seul bouton avec dégradé violet $\rightarrow$ cyan par écran (le CTA principal). Tous les autres boutons utilisent des aplats sombres bordés.
- **Logo Animé SVG (`PulseLogo.tsx`)** :
  - Tracé vectoriel stylisé "P-Pulse" avec ligne cardiaque intégrée (longueur 280 unités).
  - Animation `strokeDashoffset` de 280 à 0 sur 920ms avec easing de Bézier `(0.4, 0, 0.2, 1)`.
  - Halo respirant synchronisé (`opacity 0 -> 0.22`, `scale 1 -> 1.18`).
  - Double battement cardiaque au repos toutes les 2.4s.
  - Respect strict de `prefers-reduced-motion` (état statique instantané).

---

## 7. 📱 Détail des Écrans & Parcours Utilisateur

### 1. Démarrage & Splash (`src/app/_layout.tsx` & `SplashAnimated.tsx`)

- S'affiche à chaque lancement pendant l'initialisation SQLite et la lecture des paramètres.
- Fondu sortant fluide de 300ms dès que la base et les polices sont opérationnelles.

### 2. Onboarding à 5 Étapes (`src/app/(onboarding)/`)

- **Étape 1 (Bienvenue)** : Logo centré animé, accroche, 3 badges de valeur piluliers vectoriels ("Serein", "Privé 100% hors-ligne", "Rhythm"), CTA pleine largeur, lien restauration V2.
- **Étape 2 (Découverte)** : Explication des 3 concepts fondamentaux (Rappels, Tâches, Événements) et de leur distinction.
- **Étape 3 (Personnalisation)** : Prénom optionnel et sélecteur de fuseau horaire (détecté par `expo-localization`).
- **Étape 4 (Rythme)** : Heure de début de journée (briefing matin) et de fin de journée (bilan du soir).
- **Étape 5 (Permissions)** : Demande bienveillante et expliquée des notifications locales.

### 3. Les 5 Onglets Principaux (`src/app/(tabs)/`)

1. **Aujourd'hui (`index.tsx`)** : Synthèse complète du jour avec chips interactifs (rappels, tâches, événements, habitudes), validation 1-tap directe des habitudes, bandeau d'alerte des rappels manqués.
2. **Tâches (`tasks.tsx`)** : Filtres _Inbox_, _Aujourd'hui_, _Toutes_. Coche instantanée avec notification Snackbar permettant l'annulation pendant 30 secondes. Décompte des sous-tâches.
3. **Calendrier (`calendar.tsx`)** : Ruban défilant des 7 jours de la semaine courante. Vue combinée des événements horaires (avec temps de trajet), rappels et tâches du jour sélectionné.
4. **Personnes (`people.tsx`)** : Liste des contacts avec badges de relation, calcul du nombre de jours depuis la dernière interaction, filtre "À recontacter" pour les contacts oubliés, bouton d'appel direct.
5. **Pulse (`pulse.tsx`)** : Centre de pilotage proactif. Cartes d'accès rapide aux modules _Habitudes_ et _Objectifs_, et liste des suggestions intelligentes avec boutons _Accepter_ et _Ignorer_.

### 4. Modules Secondaires Complets

- **Habitudes & Streaks (`src/app/habits/`)** : Liste avec total de jours cumulés, vue détaillée par habitude avec historique des complétions et mise en pause / reprise sans perte de série.
- **Objectifs (`src/app/goals/`)** : Liste avec statut d'échéance, fiche détaillée avec barre de progression dynamique, sélecteur modal pour lier/délier des tâches existantes.
- **Paramètres (`src/app/settings/`)** : Modification du profil, réglage des heures de notifications, export complet de la base SQLite en JSON pour sauvegarde personnelle, bouton de réinitialisation de l'onboarding.
- **Emploi du temps type (`src/app/settings/schedule.tsx`)** : Configuration par onglets Lun-Dim des blocs récurrents (Travail, Études, Repos, Sport, Maison) avec code couleur.

---

## 8. 🔍 Plan de Correction & Audit IHM — Résolution Intégrale des 14 Lots

Le plan de correction issu de l'Audit IHM (`AUDIT_IHM/07_PLAN_DE_CORRECTION_PROPOSE.md`) a été intégralement implémenté, validé et commité sur `master` :

| Lot | Domaine | Défauts résolus & Réalisations | Statut |
| :--- | :--- | :--- | :---: |
| **Lot 1** | Sécurité, vie privée & intégrité (P1) | `DEF-01`, `DEF-02` : Chiffrement XChaCha20-Poly1305 de `sanctum_notes`, dérivation KDF via `expo-secure-store`, `clearAllData` atomique SQLite multi-tables, `NotificationService.cancelAll()`. | ✅ Fait |
| **Lot 2** | Fiabilité rappels & notifications (P1-P2) | `DEF-03`, `DEF-04`, `DEF-09`, `DEF-15` : Conciliation au démarrage (`reconcileOverdueRecurringReminders`), calcul `max(scheduledAt, now)` sur snooze et getNextOccurrence strictly future, garde contre reprogrammation silencieuse +10s, fixation `dayOfMonth`. | ✅ Fait |
| **Lot 3** | Parcours essentiels, parsing NLP (P2) | `DEF-10`, `DEF-14` : Priorisation NLP (« après-demain » avant « demain », heures explicites avant raccourcis flous, frontières de mots `\b${name}\b`), masquage des boutons démo sous gardes `__DEV__`. | ✅ Fait |
| **Lot 4** | Architecture de l'info & navigation (P2-P3) | Unification terminologique « Sanctuaire », distinction des 3 écrans de planning (heures de briefing, blocs hebdomadaires, grille horaire), clarification de la réinitialisation d'onboarding. | ✅ Fait |
| **Lot 5** | Accessibilité numérique (WCAG 2.2 AA) | `DEF-05`, `DEF-12` : Ajout exhaustif de `accessibilityRole` et `accessibilityLabel` sur tous les boutons icônes et sélecteurs, harmonisation des contrastes textuels $\ge 4.5:1$ dans `palettes.ts`. | ✅ Fait |
| **Lot 6** | Design system & boutons verre (P2-P3) | `DEF-07`, `DEF-17` : Élimination du double padding et de l'anneau Android sur `Button.tsx`, thématisation Midnight Glass de `GlassFloatingActionButton.tsx`. | ✅ Fait |
| **Lot 7** | Barres et composition d'écran (P2-P3) | `DEF-16`, `U-06` : Redéfinition du bouton Aujourd'hui visible, harmonisation des fonds de modules Pulse (`theme.surface.container`), sécurisation des libellés d'onglets. | ✅ Fait |
| **Lot 8** | Gestes swipe & suppression douce (P2) | `DEF-08`, `DEF-13` : Composant `SwipeableItem` réutilisable, suppression douce réversible 30s avec Snackbar Undo, élimination de 40+ alertes modales bloquantes. | ✅ Fait |
| **Lot 9** | Identité visuelle & lancement (P2) | `DEF-06` : Régénération des assets `splash-icon.png` et `android-icon-foreground.png` à fond 100% transparent (alpha = 0), séquence directe Option A sans écran animé redondant. | ✅ Fait |
| **Lot 10** | Animations & accessibilité moteur (P2) | `DEF-11` : Migration du repli FAB vers Reanimated 4 sur le thread UI, création du hook central `useSafeReducedMotion()`. | ✅ Fait |
| **Lot 11** | Onboarding & replay (P3) | Transitions harmonisées `slide_from_right`, raccourcis « Passer » vers permissions sur toutes les étapes, persistance BDD de `resetOnboarding` pour le replay depuis les Réglages. | ✅ Fait |
| **Lot 12** | Qualité linguistique & neutralité (P3) | Remplacement des apostrophes droites par des apostrophes typographiques `’`, espaces insécables avant ponctuations doubles, relecture inclusive. | ✅ Fait |
| **Lot 13** | Performance & mémoire mobile (P2-P3) | Réduction du coût scrypt à $N=32768$ (32 Mo max au lieu de 64 Mo, prévient les OOM sur Android modeste) avec compatibilité descendante $N=65536$, virtualisation `FlatList` (`windowSize=5`, `maxToRenderPerBatch=10`). | ✅ Fait |
| **Lot 14** | Tests de régression & conformité (P2) | Tests Jest couvrant les cas limites de récurrence (multi-jours, années bissextiles), conformité `expo-doctor` (21/21 ok), synchronisation documentation. | ✅ Fait |

---

## 9. 🚦 Validation Technique & Zéro Régression

Tous les contrôles qualité automatisés les plus stricts ont été exécutés avec succès :

```bash
# 1. Vérification de conformité de l'écosystème Expo
npx expo-doctor
# Résultat : 21/21 checks passed. No issues detected!

# 2. Vérification du typage TypeScript strict
npx tsc --noEmit
# Résultat : Code 0 (0 erreur de compilation sur l'ensemble du projet)

# 3. Suite complète de tests Jest automatisés
npx jest --no-coverage
# Résultat : 25 suites passées, 299 tests unitaires et d'intégration validés (100% passants)
```

---

## 10. 🎯 Synthèse & Perspectives V2

L'application **Junix Pulse V1.0** est désormais entièrement stabilisée, sécurisée, accessible, performante et couverte par une suite de tests unitaires rigoureuse.

### Perspectives pour la V2 :
1. **Import Natif des Contacts** : Branchement de `expo-contacts` dans `people/new.tsx` pour préremplir les contacts depuis le carnet du téléphone.
2. **Focus Timer / Pomodoro (V2)** : Minuteur de concentration relié aux blocs horaires de l'emploi du temps.
3. **Synchronisation P2P chiffrée** : Partage local chiffré de pair-à-pair sans serveur central.

---

_Ce document reflète l'état certifié du codebase Junix Pulse V1.0 (20 octobre 2026)._
