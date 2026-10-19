# 📱 AUDIT JUNIX PULSE — 01. INVENTAIRE CARTOGRAPHIQUE DES ÉCRANS (v2)

> **Date :** 18 octobre 2026  
> **Application :** Junix Pulse (Expo SDK 57 / React Native 0.86 / TypeScript)  
> **Périmètre :** 34 routes et écrans répertoriés dans `src/app/**`.

---

## 1. CARTOGRAPHIE COMPLÈTE DU ROUTING EXPO ROUTER

| Route / Fichier | Pôle fonctionnel | Rôle & Objectif | Données manipulées | Actions utilisateur | États possibles | Permissions requises |
|---|---|---|---|---|---|---|
| `_layout.tsx` | Racine Système | Init DB, polices, splash animé, routage | Paramètres, thème, DB init | Aucune (layout passif) | Loading (splash), Ready, Error | Notifications (init) |
| `+not-found.tsx` | Racine Système | Écran 404 repli d'erreur de routage | URL non trouvée | Revenir à l'accueil | Normal | Aucune |
| `capture.tsx` | Transversal | Capture rapide en langage naturel | Titre brut, parsing NLP | Saisie, validation, chips | Édition, confirmation | Aucune |
| `sanctum.tsx` | Transversal | Coffre-fort notes privées | `sanctum_notes`, PIN hash | Déverrouillage, CRUD carnets | Locked, PIN setup/verify, List, Editor | Biométrie (`LocalAuth`) |
| `search.tsx` | Transversal | Recherche globale unifiée | Tâches, rappels, contacts, habitudes | Saisie recherche, navigation | Recherche vide, Résultats, Aucun résultat | Aucune |
| `(onboarding)/index.tsx` | Onboarding (1/5) | Bienvenue et valeurs du produit | Zéro (présentation) | Démarrer, restaurer sauvegarde | Statique | Aucune |
| `(onboarding)/discover.tsx` | Onboarding (2/5) | Découverte des 3 concepts | Explications pédagogiques | Suivant | Statique | Aucune |
| `(onboarding)/personalize.tsx` | Onboarding (3/5) | Prénom et détection du fuseau | `display_name`, `timezone` | Saisie prénom, choix fuseau | Saisie active | Aucune |
| `(onboarding)/schedule.tsx` | Onboarding (4/5) | Réglage des heures clés | `morning_briefing_hour`, `end_of_day_hour` | Sélecteur horaire matin/soir | Saisie active | Aucune |
| `(onboarding)/permissions.tsx` | Onboarding (5/5) | Demande pédagogique notifications | `notifications_enabled` | Accorder, passer | Attente permission, Succès | Notifications locales |
| `(tabs)/_layout.tsx` | Navigation Tabs | Barre de navigation flottante 5 onglets | Onglet actif, store UI | Changement d'onglet | Actif / Inactif | Aucune |
| `(tabs)/index.tsx` | Onglet 1 | Dashboard centralisé Aujourd'hui | Rappels du jour, tâches, habitudes | Coche habitude, filtres chips | Chargement, Vide, Erreur, Données | Aucune |
| `(tabs)/tasks.tsx` | Onglet 2 | Hub de gestion des tâches | Tâches, sous-tâches, filtres | Filtres (Inbox/Today/All), Coche | Vide, Liste, Erreur | Aucune |
| `(tabs)/calendar.tsx` | Onglet 3 | Calendrier 7j & Agenda combiné | Événements, rappels, tâches | Navigation semaine, bascule vue | Chargement, Vide, Données | Aucune |
| `(tabs)/people.tsx` | Onglet 4 | Répertoire & contacts oubliés | Contacts, interactions | Recherche, filtre À recontacter | Liste, Vide, Erreur | Contacts (optionnel) |
| `(tabs)/pulse.tsx` | Onglet 5 | Moteur de suggestions & raccourcis | Suggestions IA, métriques | Accepter, refuser suggestion | En attente, Vide, Traité | Aucune |
| `reminders/index.tsx` | Rappels | Liste exhaustive des rappels | Tous les rappels, statuts | Filtres (Actifs, Manqués, Faits) | Chargement, Vide, Liste | Aucune |
| `reminders/new.tsx` | Rappels | Formulaire de création de rappel | Titre, date, heure, priorité, récurrence | Saisie, validation, raccourcis | Édition, Erreur validation | Aucune |
| `reminders/[id].tsx` | Rappels | Fiche détaillée d'un rappel | Détail rappel, checklist, personne | Terminer, Snooze, Supprimer, Éditer | Chargement, Erreur, Détail | Aucune |
| `reminders/edit/[id].tsx` | Rappels | Formulaire de modification | Rappel existant | Enregistrer, Annuler | Édition, Sauvegarde | Aucune |
| `tasks/new.tsx` | Tâches | Formulaire de création de tâche | Titre, date, durée, priorité, sous-tâches | Ajout sous-tâche, validation | Édition, Sauvegarde | Aucune |
| `tasks/[id].tsx` | Tâches | Détail et gestion de tâche | Tâche, sous-tâches ordonnées | Coche sous-tâche, suppression | Chargement, Erreur, Détail | Aucune |
| `events/new.tsx` | Événements | Création d'événement calendrier | Titre, début, fin, lieu, personnes | Saisie, sélection contacts | Édition, Sauvegarde | Aucune |
| `events/[id].tsx` | Événements | Détail d'événement | Événement, personnes liées | Suppression, consultation | Chargement, Erreur, Détail | Aucune |
| `people/new.tsx` | Personnes | Création manuelle d'un contact | Nom, relation, téléphone, seuil | Saisie, validation | Édition, Sauvegarde | Aucune |
| `people/[id].tsx` | Personnes | Fiche relationnelle d'un contact | Contact, historique interactions | Appel direct, ajout interaction | Chargement, Erreur, Fiche | Téléphone/SMS |
| `habits/index.tsx` | Habitudes | Liste des habitudes et streaks | Habitudes actives/en pause | Consultation, ouverture | Liste, Vide, Chargement | Aucune |
| `habits/new.tsx` | Habitudes | Création d'une habitude | Titre, fréquence, jours cibles, couleur | Saisie, validation | Édition, Sauvegarde | Aucune |
| `habits/[id].tsx` | Habitudes | Fiche habitude et calendrier suivi | Historique complétions, streaks | Mettre en pause, reprendre | Chargement, Fiche, Historique | Aucune |
| `goals/index.tsx` | Objectifs | Liste des objectifs à long terme | Objectifs, deadlines, progression | Consultation, nouvel objectif | Liste, Vide, Chargement | Aucune |
| `goals/new.tsx` | Objectifs | Création d'un objectif | Titre, vision, deadline | Saisie, validation | Édition, Sauvegarde | Aucune |
| `goals/[id].tsx` | Objectifs | Fiche objectif & tâches liées | Objectif, tâches associées, ratio | Lier tâche, cocher tâche, supprimer | Chargement, Fiche, Sélecteur | Aucune |
| `settings/index.tsx` | Paramètres | Configuration système & sauvegardes | Heures clés, export/import JSON | Export chiffré, Reset, Thème | Formulaire, Modale mot de passe | Fichiers (`expo-sharing`) |
| `settings/schedule.tsx` | Paramètres | Configuration emploi du temps type | Blocs d'activité Lun-Dim | Ajouter bloc, supprimer bloc | Onglets 7 jours, Modale ajout | Aucune |

---

## 2. SYNTHÈSE DES ÉTATS ET CONTRATS D'INTERFACE

1. **États de chargement (`LoadingState`)** : Présents sur la majorité des écrans de détail (`[id].tsx`), mais absents ou traités par des spinners natifs sur certains formulaires de création.
2. **États d'erreur (`ErrorState`)** : Bien intégrés sur les fiches de détail avec bouton « Réessayer », mais les formulaires de création se contentent souvent de `Alert.alert('Erreur', e.message)`.
3. **États vides (`EmptyState`)** : Présents et soignés sur les onglets principaux (Aujourd'hui, Tâches, Personnes, Sanctum), mais parfois sommaires sur les fiches d'objectifs sans tâches liées.
