# Inventaire des écrans — Junix Pulse

**Audit du 17 octobre 2026** · Périmètre : sources Expo/React Native, version non exécutée visuellement dans cette session.

## Méthode et limites

- Inventaire établi depuis les routes `src/app/**/*.tsx`, les composants d'interface et les parcours déclarés.
- Les comportements ont été relus dans le code ; les 195 tests automatisés existants passent, mais ils ne remplacent pas une validation sur appareil.
- La prévisualisation Web Expo a démarré, puis la surface navigateur disponible n'a pas pu atteindre `localhost:8081` (`ERR_CONNECTION_TIMED_OUT`). Aucun constat esthétique n'est donc présenté comme une observation de rendu.

## Parcours d'entrée

| Route | Finalité | États/décisions à couvrir lors de la recette | Risque IHM |
|---|---|---|---|
| `(onboarding)/index` | Bienvenue et entrée dans l'onboarding | premier lancement, reprise, retour | faible |
| `(onboarding)/discover` | Présentation des fonctionnalités | lecture avec police agrandie, retour | faible |
| `(onboarding)/personalize` | Personnalisation initiale | champs vides, validation, annulation | moyen |
| `(onboarding)/schedule` | Réglage d'horaires | fuseau, changement d'heure, valeurs limites | moyen |
| `(onboarding)/permissions` | Consentements système | accepter, refuser, « ne plus demander » | élevé |

## Navigation principale

| Route | Finalité | États/décisions à couvrir lors de la recette | Risque IHM |
|---|---|---|---|
| `(tabs)/index` | Tableau de bord / aujourd'hui | vide, chargé, éléments en retard, action rapide | élevé |
| `(tabs)/calendar` | Calendrier et planning | journée vide, créneaux, chevauchements, feuille d'action | élevé |
| `(tabs)/tasks` | Liste et complétion des tâches | vide, filtre, tâche terminée/en retard, erreur de chargement | élevé |
| `(tabs)/people` | Relations et relances | vide, contact sans téléphone, appel/message indisponible | moyen |
| `(tabs)/pulse` | Suggestions et bilan | aucune suggestion, accepter/ignorer, chargement | moyen |
| `(tabs)/_layout` | Barre d'onglets personnalisée | état actif/inactif, lecteur d'écran, mouvement réduit, thème clair/sombre | **critique** |

## Parcours métier détaillés

| Domaine | Routes | Finalité | États/décisions à couvrir lors de la recette | Risque IHM |
|---|---|---|---|---|
| Capture | `capture` | Saisie rapide et aiguillage vers un objet métier | entrée vide, ambiguë, annulation, erreur | élevé |
| Recherche | `search` | Recherche globale | requête vide, zéro résultat, résultat de chaque type, erreur SQL | **critique** |
| Rappels | `reminders/index`, `new`, `edit/[id]`, `[id]` | Créer, modifier, reporter et consulter un rappel | notifications refusées, date passée, récurrence, snooze, suppression/annulation | élevé |
| Tâches | `tasks/new`, `tasks/[id]` | Créer, détailler et terminer une tâche | titre vide, sous-tâches, date, priorité, clavier | élevé |
| Événements | `events/new`, `events/[id]` | Planifier et consulter un événement | date/heure, chevauchement, annulation | moyen |
| Personnes | `people/new`, `people/[id]` | Créer et suivre une relation | import contacts refusé, coordonnées absentes, relance | moyen |
| Habitudes | `habits/index`, `new`, `[id]` | Créer et suivre des habitudes | aucun historique, objectif atteint, édition | moyen |
| Objectifs | `goals/index`, `new`, `[id]` | Créer et mesurer un objectif | échéance absente/passée, progression 0/100 %, édition | moyen |
| Sanctum | `sanctum` | Notes personnelles protégées par PIN | premier PIN, PIN faux, oubli du PIN, contenu sensible | **critique** |
| Réglages | `settings/index`, `settings/schedule` | Préférences et plages horaires | thème, notifications, horaires incohérents, sauvegarde | élevé |
| Système | `+not-found`, `_layout` | Route inconnue et amorçage | lien invalide, chargement, erreur d'initialisation | moyen |

## Composants transverses relevés

- Fondations : `constants/palettes.ts`, `constants/theme.ts`, `useTheme`, `useThemedStyles`, espacements et typographie partagés.
- Actions : `Button`, `AnimatedPressable`, `GlassFloatingActionButton`, `GlowCard`.
- États : `components/feedback/States.tsx` fournit `EmptyState`, `LoadingState`, `ErrorState` et `Skeleton`.
- Mouvement : `AnimatedPressable` et `PulseLogo` prévoient le mouvement réduit ; la barre d'onglets et `SplashAnimated` ne le raccordent pas encore.

## Parcours prioritaires de recette

1. Onboarding → permissions refusées → tableau de bord : vérifier que les explications et alternatives restent compréhensibles.
2. Barre d'onglets dans les deux thèmes, avec lecteur d'écran et option système « Réduire les animations » activée.
3. Créer une tâche, un rappel, une habitude et un objectif avec titre vide, clavier ouvert et taille de police élevée.
4. Recherche globale par rappel, tâche, personne, événement, habitude et objectif ; vérifier l'ouverture du bon détail.
5. Calendrier : sélectionner un créneau, ouvrir puis fermer la feuille, créer chaque type d'objet.
6. Sanctum : évaluer explicitement les attentes de confidentialité avant toute mise en production.

Voir aussi : `02_PARCOURS_FONCTIONNELS.md`, `03_AUDIT_HEURISTIQUE.md` et `04_AUDIT_ACCESSIBILITE.md`.
