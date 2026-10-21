# 📜 Changelog — Junix Pulse

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.

---

## [1.1.0] - 2026-10-21

### ⏱️ Module Focus Timer / Pomodoro
- **Cadran circulaire SVG immersif** (`src/app/focus.tsx`) avec halo Midnight Glow et progression fluide en temps réel.
- **Règle d'ajustement exclusif** (`src/domain/rules/focus-rules.ts`) : bascule exclusive entre presets types (5, 15, 25, 50 min) et ajustement libre à la minute près (1 à 120 min).
- **Liaison contextuelle de tâches** : possibilité de démarrer une session de concentration rattachée à une tâche précise depuis `src/app/tasks/[id].tsx`.
- **Suivi du temps de focus quotidien** : cumul des minutes de focus accomplies dans la journée, répercuté dynamiquement sur la carte métrique « Rythme Quotidien / FOCUS » de l'onglet Aujourd'hui.
- **Points d'accès fluides** : accès en un tap depuis la carte Aujourd'hui, l'en-tête de l'onglet Tâches et la vue détaillée d'une tâche.
- **Tests unitaires exhaustifs** : 17 tests déterministes validant toutes les transitions d'état et règles de bornage (total : 316 tests automatisés à 100% passants).

### 👥 Module Personnes & Contacts
- **Import natif depuis le carnet d'adresses** (`src/app/people/new.tsx`) : intégration de `expo-contacts` avec sélecteur natif et pré-remplissage des coordonnées (nom, téléphones, emails, anniversaire).

### 🛡️ Clôture Intégrale des 14 Lots d'Audit IHM
- **Sécurité & Confidentialité** : chiffrement XChaCha20-Poly1305 du coffre Sanctum (`sanctum_notes`) et purge atomique SQLite.
- **Fiabilité des Rappels** : conciliation au démarrage (`reconcileOverdueRecurringReminders`) et détection stricte des occurrences futures.
- **Parsing NLP** : compréhension du langage naturel dans la capture rapide avec priorité contextuelle.
- **Accessibilité WCAG 2.2 AA** : contrastes textuels harmonisés $\ge 4.5:1$ et étiquetage systématique pour lecteurs d'écran.
- **Gestes & Suppression Douce** : gestes de glissement (`SwipeableItem`) avec annulation réversible pendant 30 secondes via le Snackbar.
- **Conformité Expo SDK 57** : validation `expo-doctor` (21/21 vérifications réussies) et typage strict TypeScript (`tsc --noEmit` : 0 erreur).

---

## [1.0.0] - 2026-09-10

### 🎉 Version Initiale (V1.0)

#### 🏗️ Architecture & Core
- Migrations SQLite versionnées `001-019` avec mode WAL et clés étrangères activées.
- Intégration d'Expo SDK 57, Expo Router v4 et TypeScript.
- Design System sombre MD3 (`src/constants/theme.ts`).
- Navigation complète par Onboarding à 5 étapes et Layout avec 5 Onglets principaux.

#### 🔔 Module Rappels
- CRUD complet des rappels, priorités, types d'actions.
- Bottom sheet In-App Snooze (15min, 1h, 3h, Demain).
- Service de notification avec fallback simulation Expo Go.

#### ✅ Module Tâches
- Gestion des tâches, sous-tâches ordonnées et durée estimée.
- Filtres Inbox, Aujourd'hui, Toutes les tâches.

#### 👥 Module Personnes & Contacts
- Carnet d'interactions et détection des contacts oubliés (>30 jours).

#### 📅 Module Calendrier & Événements
- Bandeau hebdomadaire et agenda unifié du jour.

#### 🔥 Module Habitudes & Streaks
- Calculateur de séries (streaks actuels et historiques).
- Gestion des pauses pour préserver le streak pendant les congés.

#### 🎯 Module Objectifs
- Association de tâches et calcul dynamique du pourcentage d'avancement.

#### 🕒 Module Planning Personnel
- Emploi du temps récurrent par blocs d'activité.

#### 💡 Moteur de Suggestions (Pulse)
- Suggestions proactives avec explications et choix Accepter/Refuser.
