# 📜 Changelog — Junix Pulse

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.

---

## [1.0.0] - 2026-09-10

### 🎉 Version Initiale (V1.0)

#### 🏗️ Architecture & Core
- Migrations SQLite versionnées `001-019` avec mode WAL et clés étrangères activées.
- Intégration d'Expo SDK 57, Expo Router v4 et TypeScript.
- Design System sombre MD3 (`src/constants/theme.ts`).
- Navigation complète par Onboarding à 5 étapes et Layout avec 5 Onglets principaux.

#### 🔔 Module Rappels
- Crud complet des rappels, priorités, types d'actions.
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
