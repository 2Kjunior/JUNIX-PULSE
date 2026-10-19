# Plan de recette IHM/UX et accessibilité

## Conditions de validation

- Appareil Android et iOS réels ou simulateurs fiables ; base fraîche puis base contenant données de chaque domaine.
- Thème clair et sombre.
- Tailles de texte : 100 %, 130 %, 160 %, 200 %.
- Préférence « Réduire les animations » activée puis désactivée.
- TalkBack Android et VoiceOver iOS.
- Réseau/permissions : notifications et contacts autorisés, refusés, refus persistant.

## Cas de recette critiques

| ID | Parcours | Étapes | Résultat attendu | Liens audit |
|---|---|---|---|---|
| REC-001 | Recherche | Créer rappel/tâche/personne/événement/habitude/objectif ; rechercher un mot de chaque type | résultat affiché, type explicite, ouverture du bon détail ; une erreur SQL est visible et récupérable | AUD-UX-001 |
| REC-002 | Onglets / contraste | Vérifier chaque onglet actif/inactif en clair/sombre | texte et icône distinguables ; inactif n'évoque pas un contrôle désactivé | AUD-A11Y-001 |
| REC-003 | Onglets / mouvement | Activer réduction mouvement ; naviguer et appuyer | aucune animation non essentielle ; état sélectionné reste clair | AUD-A11Y-005 |
| REC-004 | Formulaire tâche | Saisir titre et notes, provoquer titre vide, augmenter police | labels restent identifiables ; erreur annoncée ; pas de recouvrement clavier | AUD-A11Y-003 |
| REC-005 | Formulaires rappel/habitude/objectif | Répéter REC-004, ouvrir sélecteur date si présent | même qualité de labels, navigation, dates et annulation | AUD-A11Y-003 |
| REC-006 | Calendrier | Choisir un créneau libre, ouvrir les trois options, fermer | lecteur d'écran nomme chaque action ; focus et fermeture cohérents | AUD-A11Y-004 |
| REC-007 | Snooze | Ouvrir détail de rappel puis snooze, tester les six choix | durée/choix annoncés, date custom lisible, confirmation claire | AUD-A11Y-004 |
| REC-008 | Permissions | Rejouer onboarding/contact/notification avec accepter, refuser, refus persistant | explication claire, alternative fonctionnelle, pas de boucle de demande | inventaire |
| REC-009 | États de listes | Forcer vide, chargement, erreur et rafraîchissement | état exact annoncé ; action de reprise utile ; pas de silence ambigu | heuristique |
| REC-010 | Sanctum | Créer note, verrouiller, PIN faux, tenter récupération | promesse de confidentialité exacte ; limitation d'essais et données protégées une fois corrigées | AUD-SEC-001 |

## Contrôles ergonomiques transverses

- Tous les boutons clés atteignent une cible tactile confortable (le composant partagé vise 46 px).
- Les zones iconiques ont un nom lisible à voix haute et un état quand elles sont sélectionnées/cochées.
- Aucun texte essentiel ne dépend uniquement d'une couleur, d'une animation ou d'une icône.
- Les modales ferment avec le geste plateforme, ont un contrôle de fermeture identifiable et ne piègent pas le focus.
- Les textes à 200 % ne se chevauchent pas, restent scrollables et ne cachent pas l'action de sauvegarde.
- Les erreurs indiquent quoi faire ensuite, sans effacer la saisie de l'utilisateur.

## Preuves à joindre à une recette réussie

1. Captures clair/sombre des cinq onglets, dont état inactif corrigé.
2. Courte vidéo ou note de test pour réduction mouvement, VoiceOver et TalkBack.
3. Rapport de test d'intégration recherche/migrations.
4. Logs de test notifications/contacts pour les trois réponses de permission.
5. Résultat typecheck, lint et tests unitaires/CI après correction.

## Critères de sortie

- Aucun P0 ou P1 ouvert sans décision de risque explicitement acceptée.
- Toutes les lignes P2 ont un propriétaire, une échéance et un plan de vérification.
- REC-001 à REC-008 sont réussis sur les plateformes réellement livrées.
- Les contrastes de navigation sont recalculés avec les couleurs de rendu définitives.
