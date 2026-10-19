# Recommandations priorisées

## Palier 0 — bloquer toute promesse de confidentialité non tenue

### R-SEC-001 — Reconcevoir la protection de Sanctum

**Cible :** P0 avant communication « privé », « sécurisé » ou diffusion sensible.

- Ne pas considérer le hachage du PIN comme du chiffrement de notes.
- Conserver le secret de dérivation dans le stockage sécurisé de la plate-forme ou protéger une clé aléatoire générée par appareil.
- Chiffrer les notes par AEAD, ajouter un sel aléatoire et une limitation d'essais.
- Prévoir une migration non destructive, une récupération explicitement définie et des tests de rétrocompatibilité.

## Palier 1 — restaurer les parcours fondamentaux et l'accès universel

### R-UX-001 — Réparer la recherche sur le schéma réel

- Remplacer les noms de colonnes obsolètes par le schéma courant.
- Choisir une donnée réelle pour le sous-titre d'objectif (par exemple échéance formatée), sans inventer de catégorie.
- Renvoyer un état erreur actionnable plutôt qu'un résultat vide lors d'une requête SQL défaillante.
- Écrire un test d'intégration avec les migrations actuelles et six jeux de résultats.

### R-A11Y-001 — Séparer visuellement inactif et désactivé

- Ajouter `onSurface.inactive` à chaque palette avec contraste AA sur la surface de barre.
- Appliquer ce token seulement aux onglets disponibles non sélectionnés.
- Réserver `disabled` aux contrôles réellement indisponibles.
- Valider labels et icônes dans les deux thèmes, sur appareil.

### R-A11Y-002 — Retirer la permission d'écriture de contacts

- Supprimer `WRITE_CONTACTS` de `app.json` après vérification de l'import Android.
- Vérifier la justification d'usage dans les store listings et l'écran de permission.

### R-DEP-001 — Traiter les dépendances sans mise à jour forcée

- Évaluer l'atteignabilité de chaque vulnérabilité production.
- Utiliser une montée de versions compatible Expo SDK 57, avec build Android/iOS et test complet.
- Interdire par politique un `npm audit fix --force` non revu : la proposition observée change des fondations incompatibles.

## Palier 2 — rendre les interactions fiables et inclusives

### R-A11Y-003 — Rendre les formulaires autoportants

- Afficher « Titre », « Notes », etc. en tant que labels persistants.
- Définir `accessibilityLabel`, annoncer les erreurs et conserver le focus de correction.
- Ajouter des tests UI et une recette avec taille de police élevée.

### R-A11Y-004 — Normaliser les actions tactiles custom

- Préférer le composant partagé accessible pour les nouvelles actions.
- Ajouter rôle, nom, état et cible tactile aux choix de snooze, créneaux, fermeture et cartes de feuille.
- Pour les modales : focus initial cohérent, fermeture identifiée, retour au déclencheur.

### R-A11Y-005 — Centraliser « réduire les animations »

- Mettre à disposition un hook/paramètre de mouvement réduit pour barre d'onglets, splash et futurs composants.
- Lorsque la préférence est active, appliquer directement l'état final tout en gardant contraste et feedback pressé.

### R-DATA-001 — Transactions et restauration explicite

- Regrouper les créations multi-entités dans une transaction.
- Réparer la réservation de notification lors de l'annulation d'une suppression de rappel.
- Faire de la sauvegarde un snapshot cohérent et rapporter les conflits importés/ignorés à l'utilisateur.

### R-QUAL-001 — Tester les régressions qui ont atteint l'UI

- Ajouter Jest à la CI.
- Prioriser recherche/migrations, sauvegarde, notifications et règles de récurrence.
- Ajouter une courte recette manuelle Android/iOS pour accessibilité et permissions avant version.

## Palier 3 — assainir et pérenniser le système de design

### R-DS-001 — Achever la migration vers les tokens

- Recenser les hex littéraux par fonction : décoratif, marque, sémantique, legacy.
- Migrer en premier les couleurs sémantiques (texte, succès, erreur, états interactifs).
- Conserver les effets décoratifs justifiés dans des tokens nommés ; ne pas uniformiser aveuglément les dégradés et glows.

### R-DOC-001 — Synchroniser la documentation de projet

- Mettre à jour le nombre de migrations (22 au moment de l'audit), versions et procédures de tests.
- Ajouter le registre d'audit à la documentation de livraison et faire évoluer les statuts à chaque correction.

## Séquence recommandée

1. Ouvrir une branche de corrections P0/P1 avec test d'intégration de recherche et tokens d'onglet.
2. Faire tester les changements sur Android/iOS, thèmes clair/sombre et outils d'assistance.
3. Traiter formulaires, modales, mouvement réduit, transactions et sauvegarde.
4. Planifier nettoyage des tokens, documentation et dette de qualité dans une itération séparée.
