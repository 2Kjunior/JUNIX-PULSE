# ⚡ Junix Pulse V1.0 — Personal Life OS (Offline-First)

**Junix Pulse** est une application mobile personnelle de gestion quotidienne développée avec **React Native**, **Expo SDK 57** et **SQLite**. 
Elle est conçue selon le principe **Local-First / Offline-First** : 100% de vos données restent stockées localement sur votre téléphone avec un chiffrement local et zéro dépendance à des serveurs tiers.

---

## 🌟 Vision Produit & Principes Directeurs

- **🔒 100% Local & Confidentiel** : Pas de compte obligatoire, pas de synchronisation cloud opaque. Vos données vous appartiennent.
- **⚡ Moteur de Suggestions Intelligentes (BR-001)** : Analyse vos activités (contacts non relancés, rappels manqués, séries d'habitudes en danger) et formule des propositions explicatives sans jamais imposer de décision automatique.
- **🔥 Streaks & Pauses Légitimes (BR-011)** : Suivez vos séries d'habitudes quotidiennes. Mettez une habitude en pause pendant les vacances sans briser votre streak cumulé.
- **🎯 Objectifs & Progression Automatique (BR-012)** : La progression d'un objectif est calculée en temps réel d'après le taux d'achèvement des tâches qui lui sont liées.

---

## 🚀 Fonctionnalités & Modules

### 1. 📍 Aujourd'hui (Dashboard Central)
- Vue synthétique des 4 pôles du jour : Rappels, Tâches, Agenda et Habitudes.
- Chips de comptage interactifs avec filtres rapides.
- Validation d'une habitude d'un simple tap direct.

### 2. 🔔 Rappels & In-App Snooze
- Définition d'échéances avec priorités (Urgent, Haute, Normale, Faible).
- Actions associées (Appeler, Message, Email, Rencontrer, Faire).
- Bottom sheet **Snooze** pour reporter un rappel (15 min, 1h, 3h, Demain matin).
- Annulation 30 secondes en cas d'erreur de suppression.

### 3. ✅ Tâches & Sous-tâches
- Inbox pour capturer les idées à la volée.
- Planification par date et estimation de durée en minutes.
- Sous-tâches ordonnées avec coche de complétion.
- Filtres : Inbox, Aujourd'hui, Toutes les tâches.

### 4. 👥 Personnes & Contacts
- Carnet de contacts personnels avec historique des interactions (Appels, SMS, Rencontres).
- **Détection des contacts oubliés** (Alerte si aucune interaction depuis le seuil défini).

### 5. 📅 Calendrier & Agenda
- Bandeau hebdomadaire défilant avec sélection de date.
- Agenda combiné des événements et tâches du jour.

### 6. 🔥 Habitudes & Streaks
- Habitudes quotidiennes ou hebdomadaires avec sélecteur de couleurs.
- Compteur de séries en cours (Streak actuel) et meilleur streak historique.
- Gestion des pauses pour geler une habitude pendant les congés.

### 7. 🎯 Objectifs
- Création d'objectifs avec vision et date limite (Deadline).
- Association dynamique de tâches existantes.
- Progression calculée automatiquement (0–100%).

### 8. 🕒 Planning Personnel & Blocs
- Emploi du temps type hebdomadaire structuré par blocs récurrents (Travail, Études, Repos, Sport, Maison).

### 9. 💡 Pulse & Suggestions
- Moteur pro-actif de suggestions d'actions.
- Validation explicite "Accepter" / "Refuser" par l'utilisateur.

---

## 🛠️ Stack Technique

| Élément | Technologie |
|---|---|
| **Framework** | React Native `0.86.3` (Expo SDK `~57.0.30`) |
| **Routing** | Expo Router v4 (`~57.0.28`, File-based navigation) |
| **Language** | TypeScript (Strict mode) |
| **Base de données** | SQLite via `expo-sqlite` (WAL Mode, Migrations versionnées 001-020) |
| **Sécurité** | XChaCha20-Poly1305 + scrypt ($N=32768$) + `expo-secure-store` |
| **State Management** | Zustand (Store UI & Snackbar) |
| **Design System** | Tokens Midnight Glassmorphism (`src/constants/theme.ts`) |
| **Tests Automatisés** | Jest + React Test Renderer (25 suites, 299 tests) |

---

## 💻 Lancement en Développement & Validation Qualité

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage du serveur Metro
```bash
npx expo start --clear
```

### 3. Conformité Expo SDK 57
```bash
npx expo-doctor
```

### 4. Vérification du typage TypeScript
```bash
npx tsc --noEmit
```

### 5. Exécution de la suite de tests automatisés
```bash
npx jest --no-coverage
```

---

## 📄 Licence
Développé dans le cadre du projet **Junix Pulse V1.0**.
