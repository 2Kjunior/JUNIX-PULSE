# 📑 Junix Pulse — Récapitulatif Exhaustif du Projet & État des Lieux Technique

> **Date du document :** 25 septembre 2026  

> **Version cible :** 1.0.0 (Production Offline-First)  
> **Statut global :** V1 fonctionnelle, Typage strict TypeScript validé (`tsc --noEmit` : **0 erreur**), Design System & Onboarding unifiés.

---

## 1. 🌟 Vision Produit & Principes Directeurs

**Junix Pulse** est un système d'exploitation de vie personnelle (*Personal Life OS*) mobile, conçu selon le paradigme **Offline-First / Local-First**.

### Invariants Métier Inviolables (Business Rules)
1. **Confidentialité absolue & Zéro Cloud (BR-018 / BR-021)** : 100% des données utilisateur résident dans une base locale SQLite chiffrable sur l'appareil. Aucun compte obligatoire, aucun tracking, aucun serveur distant requis pour fonctionner.
2. **La Personne au centre du produit** : Les interactions sociales sont un pôle majeur. L'application surveille la qualité du lien social (contacts non relancés depuis $X$ jours).
3. **Moteur de Suggestions Proactif mais Non Intrusif (BR-001)** : L'IA/moteur de suggestion ("Pulse") analyse les données en local et formule des propositions intelligentes avec explication obligatoire. **Il n'impose jamais d'action automatique** : l'utilisateur dispose toujours du choix explicite *Accepter* ou *Refuser*.
4. **Séries d'Habitudes avec Pauses Légitimes (BR-011)** : Une habitude mise en pause (vacances, maladie) **ne brise pas le streak**. Les jours sous pause active sont exclus du calcul sans être pénalisés.
5. **Progression des Objectifs par Dérivation Dynamique (BR-012)** : La progression d'un objectif ($0-100\%$) est calculée en temps réel d'après le ratio de tâches complétées associées. Sans tâche, l'état est `null` ("non mesuré"), jamais $0\%$ en échec artificiel.
6. **Planning Flexible (BR-013 / BR-014)** : L'emploi du temps hebdomadaire par blocs d'activité est une *intention de structure*, jamais une contrainte coercitive.
7. **Suppression avec Filet de Sécurité (Undo 30s)** : Les suppressions sont protégées par une suppression logique réversible pendant 30 secondes via le Snackbar global.

---

## 2. 🛠️ Stack Technique & Dépendances Clés

| Composant | Technologie | Rôle & Justification |
| :--- | :--- | :--- |
| **Framework Mobile** | React Native `0.86.3` / Expo SDK `57.0.19` | Écosystème moderne multiplateforme, support New Architecture. |
| **Routage** | Expo Router `~57.0.18` (v4 file-based) | Navigation déclarative basée sur les dossiers et fichiers (`src/app`). |
| **Base de Données** | `expo-sqlite` `~57.0.2` | Moteur SQLite natif, mode WAL (Write-Ahead Logging), migrations immuables. |
| **Gestion d'État UI** | `zustand` `^5.0.15` | Store léger pour l'état d'interface (Snackbar, initialisation DB, onboarding). |
| **Animations** | `react-native-reanimated` `4.5.1` & `react-native-svg` `15.15.4` | Logo SVG tracé en temps réel, halo respirant, battements cardiaques. |
| **Date & Heure** | `date-fns` `^4.4.0` | Manipulation déterministe et immuable des dates et fuseaux. |
| **Formulaires & Validation** | `react-hook-form` `^7.87.0`, `zod` `^4.6.1` | Schémas de validation stricts pour la création d'entités. |
| **Notifications** | `expo-notifications` `~57.0.17` | Notifications locales planifiées (100% compatibles Expo Go et builds natifs). |
| **Typographie** | `@expo-google-fonts/inter` + `@expo-google-fonts/outfit` | Inter pour le texte courant, Outfit pour les grands titres et l'onboarding. |

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

---

## 5. 🧠 Logique Métier Détaillée (Domain Rules)

### A. Rappels & Snooze (`src/domain/rules/reminder-rules.ts`)
- **Rappels Manqués (BR-002)** : Un rappel dont l'échéance est passée de plus de 2 minutes sans complétion passe en statut `MISSED` pour alerte visuelle.
- **Les 3 Formes de Snooze (BR-003 / BR-003b)** :
  1. *Rapide* : +15, +30 ou +60 minutes par rapport à l'heure actuelle (`now`).
  2. *Lendemain même heure* : calculé par rapport à `scheduledAt` (+24h) et non `now`, évitant de décaler l'horaire de référence si l'utilisateur snooze tard le soir.
  3. *Personnalisé* : date et heure sélectionnées via sélecteur natif.
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
1. *Contacts oubliés* : Personnes sans interaction depuis plus de $N$ jours (défaut: 30j).
2. *Rappels manqués* : Proposition de replanifier à demain les rappels non honorés.
3. *Streaks en danger* : Habitudes actives avec streak en cours non encore validées aujourd'hui.

---

## 6. 🎨 Design System Verrouillé & Identité Visuelle

Conformément à la spécification produit issue de l'audit Stitch :
- **Palette Midnight** : Fond sombre `#141317`, conteneurs `#211F23`, surfaces élevées `#2B292D`.
- **Accents** : Electric Violet (`#D0BCFF` / `#A078FF`) et Digital Cyan (`#7BD0FF` / `#4CD7F6`).
- **Typographie** :
  - *Inter* (Regular, Medium, SemiBold, Bold) pour l'intégralité des textes courants et labels.
  - *Outfit* (SemiBold, Bold) strictement réservé aux grands titres d'écrans et à l'onboarding.
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
2. **Tâches (`tasks.tsx`)** : Filtres *Inbox*, *Aujourd'hui*, *Toutes*. Coche instantanée avec notification Snackbar permettant l'annulation pendant 30 secondes. Décompte des sous-tâches.
3. **Calendrier (`calendar.tsx`)** : Ruban défilant des 7 jours de la semaine courante. Vue combinée des événements horaires (avec temps de trajet), rappels et tâches du jour sélectionné.
4. **Personnes (`people.tsx`)** : Liste des contacts avec badges de relation, calcul du nombre de jours depuis la dernière interaction, filtre "À recontacter" pour les contacts oubliés, bouton d'appel direct.
5. **Pulse (`pulse.tsx`)** : Centre de pilotage proactif. Cartes d'accès rapide aux modules *Habitudes* et *Objectifs*, et liste des suggestions intelligentes avec boutons *Accepter* et *Ignorer*.

### 4. Modules Secondaires Complets
- **Habitudes & Streaks (`src/app/habits/`)** : Liste avec total de jours cumulés, vue détaillée par habitude avec historique des complétions et mise en pause / reprise sans perte de série.
- **Objectifs (`src/app/goals/`)** : Liste avec statut d'échéance, fiche détaillée avec barre de progression dynamique, sélecteur modal pour lier/délier des tâches existantes.
- **Paramètres (`src/app/settings/`)** : Modification du profil, réglage des heures de notifications, export complet de la base SQLite en JSON pour sauvegarde personnelle, bouton de réinitialisation de l'onboarding.
- **Emploi du temps type (`src/app/settings/schedule.tsx`)** : Configuration par onglets Lun-Dim des blocs récurrents (Travail, Études, Repos, Sport, Maison) avec code couleur.

---

## 8. 🔍 État des Lieux des Modifications Récentes (Git Log & Uncommitted)

### Commits récents notables sur `master` :
- `8c124b3` : *fix: calendrier — exclure rappels terminés et inclure événements multi-jours*
- `3191790` : *feat: implémenter les 3 formes de snooze (rapide, demain même heure, personnalisé)*
- `1a6f3c4` : *refactor: retirer l'import inutile CreateReminderParams dans reminder-use-cases.ts*
- `6b1f84f` : *fix: activer expo-notifications dans Expo Go (seul le push est bloqué, les notifs locales fonctionnent)*
- `44c3aea` : *refactor: supprimer calculateSnoozeUntil (code mort)*
- `fcfc324` : *chore: supprimer client.ts et schema.ts obsolètes au profit de sqlite.ts + migrations.ts*
- `4593652` : *feat: finalisation V1.0 - Settings, Documentation, and App Config*

### Onboarding & branding (désormais sur `master`)
La refonte Stitch (PulseLogo, SplashAnimated, StepIndicator, ValueBadge, onboarding 5 étapes, tokens glass) est **commitée**. Ne plus la traiter comme un travail en attente.

---

## 9. 🚦 Validation Technique & Zéro Régression

Le contrôle le plus strict a été exécuté :
```bash
npx tsc --noEmit
# Résultat : Code 0 (0 erreur de compilation sur l'ensemble du projet)
```
Toutes les entités, use cases, repositories, composants et écrans respectent rigoureusement les types TypeScript en mode strict.

---

## 10. 🎯 Feuille de Route

### Déjà en place (vérifié dans le code, 25 septembre 2026)
1. **Édition des rappels** : la route `src/app/reminders/edit/[id].tsx` existe et appelle `updateReminder`.
2. **Onboarding Stitch** : composants `PulseLogo`, `SplashAnimated`, `StepIndicator`, `ValueBadge` et les 5 étapes sont sur `master`.
3. **Modules transversaux V1** : Capture rapide (`capture.tsx`), Sanctum (`sanctum.tsx` + migration 020), Recherche (`search.tsx`).

### Priorité Moyenne (Consolidation & Robustesse)
1. **Tests Unitaires Automatisés des Règles Métier** :
   - *Constat* : les règles pures (`reminder-rules.ts`, `habit-rules.ts`, `goal-rules.ts`) n'ont pas de runner (Jest / Vitest absent de `package.json`).
   - *Action* : couvrir les cas limites (année bissextile, pauses d'habitudes en fin de mois, snooze « lendemain » basé sur `scheduledAt`).
2. **Import Natif des Contacts du Répertoire Téléphonique** :
   - *Constat* : le champ `importedFromContacts` existe en SQLite ; `expo-contacts` n'est pas importé dans `people/new.tsx`.
   - *Action* : option « Importer depuis le carnet d'adresses » avec permission contextuelle.

### Priorité Basse / Roadmap V2
3. **Flux de Restauration de Sauvegarde** :
   - L'export JSON existe dans `settings/index.tsx`. L'import n'est pas implémenté ; le lien d'onboarding doit rester un état « bientôt disponible », pas un bouton mort.
4. **Focus Timer / Pomodoro (V2)** :
   - Aucun écran ni module minuteur n'existe dans `src/` (vérifié par recherche). À relier plus tard aux blocs du planning personnel.

---

*Ce document reflète l'état du codebase au 25 septembre 2026. Les items restants correspondent à une absence vérifiée dans le code, pas à une supposition.*
