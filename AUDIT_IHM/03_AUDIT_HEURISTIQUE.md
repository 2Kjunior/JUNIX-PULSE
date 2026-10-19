# Audit heuristique IHM/UX

Référentiel : heuristiques de Nielsen, ISO 9241-110 et conventions iOS/Android. Les sévérités sont définies dans `05_REGISTRE_ANOMALIES.md`.

## Synthèse

La conception présente une identité claire, une palette sémantique, des composants de retour d'état et une bonne intention de local-first. Les écarts significatifs se situent moins dans la couverture fonctionnelle que dans la robustesse de l'interaction : transparence des erreurs, accessibilité d'actions custom, cohérence du système visuel et préférence de mouvement.

## Constats par heuristique

### Visibilité de l'état du système

- **Conforme en partie.** Les barres de formulaires affichent « Création... » et désactivent l'action pendant la sauvegarde. Les composants `LoadingState`, `ErrorState` et `EmptyState` existent.
- **Écart AUD-UX-001 (P1).** La recherche attrape son erreur et ne fournit pas de signal explicite ; un écran vide peut être confondu avec « aucun résultat ».
- **À valider sur appareil.** Chargement initial, rafraîchissement et erreurs sur chaque liste : le code révèle des drapeaux `loading`, mais la couverture visuelle effective doit être vérifiée.

### Correspondance système / monde réel

- **Conforme.** Les objets métier, les libellés (« Échéance », « Reporter », « Créneau disponible ») et les raccourcis de report utilisent le vocabulaire attendu.
- **À améliorer.** Dans les formulaires, un libellé court et stable (« Titre », « Notes ») rendrait les prompts plus faciles à scanner que les seules questions de placeholder.

### Contrôle et liberté de l'utilisateur

- **Conforme en partie.** Les formulaires exposent Annuler, les sélecteurs comportent une fermeture et le calendrier part d'un créneau choisi.
- **Écart à vérifier.** L'annulation de suppression d'un rappel est explicitement décrite dans le code comme ne reprogrammant pas la notification restaurée ; l'interface peut promettre une réversibilité incomplète (P2 fonctionnel, hors seule IHM).
- **Recommandation.** Nommer toutes les sorties d'une feuille modale, garder une cible d'annulation identifiable et restaurer le focus sur le déclencheur.

### Cohérence et standards

- **Point fort.** La typographie, les espacements, la palette et les `useThemedStyles` constituent une base cohérente.
- **Écart AUD-UX-005 (P2).** La couleur des onglets inactifs emploie `onSurface.disabled`, dont le commentaire de palette précise qu'elle est « décoratif uniquement ». Cela mélange état désactivé et état disponible.
- **Écart AUD-UX-006 (P3).** Des couleurs littérales subsistent dans environ 82 lignes TSX ; les écrans Habitudes et certains composants de calendrier/FAB semblent conserver une palette parallèle. Toutes ne sont pas des défauts, mais ce sont des points de divergence à trier.

### Prévention des erreurs

- **Conforme en partie.** Les titres requis affichent une erreur locale et les boutons de sauvegarde évitent les doubles soumissions.
- **Écart AUD-UX-001 (P1).** La recherche ne possède pas de test qui l'exécute avec le schéma réel ; une régression de colonne a atteint l'écran utilisateur.
- **Écart AUD-UX-007 (P2).** Certaines créations multi-étapes se font sans transaction ; un échec intermédiaire peut laisser un état partiel, difficile à comprendre et corriger pour l'utilisateur.

### Reconnaissance plutôt que mémorisation

- **Point fort.** Les raccourcis de snooze et les options du calendrier explicitent l'action.
- **Écart AUD-UX-002 (P2).** Les champs sans libellé persistent après saisie, ce qui oblige à se souvenir du sens initial du champ.

### Flexibilité et efficacité

- **Point fort.** Capture rapide, recherche globale, raccourcis de report et création depuis le calendrier réduisent le nombre d'étapes.
- **Écart AUD-UX-003 (P2).** Les contrôles personnalisés ne déclarent pas tous leur rôle et leur nom : l'efficacité des utilisateurs de technologies d'assistance est diminuée.

### Design esthétique et minimaliste

- **Point fort.** Les surfaces, le mode clair/sombre et le composant GlowCard donnent une direction visuelle identifiable.
- **Risque à valider sur rendu.** Sans capture d'écran ou appareil, il serait impropre d'affirmer la densité, l'alignement ou le débordement réel. La liste de contrôle visuelle est dans `07_PLAN_RECETTE.md`.

### Aide à la reconnaissance et récupération d'erreurs

- `ErrorState` fournit un titre, un message et une action de reprise : bonne base réutilisable.
- La recherche doit remplacer son silence en cas d'erreur par ce même modèle de message récupérable.

### Aide et documentation

- Les textes in situ de snooze et de calendrier guident correctement.
- Les réglages de permissions doivent être testés dans les trois décisions système, notamment le refus persistant.

## Ordre de correction conseillé

1. Réparer et tester la recherche réelle.
2. Corriger le contraste actif/inactif de navigation dans les deux thèmes.
3. Ajouter les noms/rôles aux contrôles custom et les libellés persistants aux champs.
4. Raccorder toutes les animations importantes à la préférence système.
5. Réduire progressivement les couleurs littérales au profit des tokens.
