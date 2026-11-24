# Fiches opératoires — Junix Pulse

Chaque fiche décrit pas à pas une intervention sur le projet, assez en détail pour la refaire ou la terminer seul.

| N° | Titre | Date | Statut |
|---|---|---|---|
| [001](FICHE-001-sauvegarde-auto.md) | Nouveau design de la sauvegarde automatique | 11 novembre 2026 | fait (à tester sur téléphone) |
| [002](FICHE-002-commit-push-build.md) | Enregistrer, envoyer sur GitHub et construire l'APK | 11 novembre 2026 | commit et push faits, build bloqué (quota Expo) |
| [003](FICHE-003-build-local-apk.md) | Construire l'APK sur l'ordinateur (sans Expo) | 11 novembre 2026 | fait (APK sur le Bureau, à installer) |
| [004](FICHE-004-construire-junix-pulse-de-zero.html) ([PDF](FICHE-004-construire-junix-pulse-de-zero.pdf)) | Construire Junix Pulse de zéro, de l'installation à l'app actuelle | 12 novembre 2026 | fait (code des phases 2 à 10 vérifié par TypeScript et Jest, pas encore refait sur un téléphone) |
| [005](FICHE-005-choisir-rappel-tache-evenement.md) | Rendre claire la différence entre rappel, tâche et événement (choix « Nouveau » à trois types) | 22 novembre 2026 | fait par une session précédente, non commité ; remplacé en partie par 008 |
| [006](FICHE-006-registre-des-types.md) | Le registre des types : une identité pour rappel, tâche et événement | 22 novembre 2026 | fait par une session précédente, non commité ; étendu par 008 |
| 007 | (images `fiche-007-apres-choix` seulement : fiche jamais écrite) | 22 novembre 2026 | inachevée |
| [008](FICHE-008-deux-familles.md) | Deux familles : « À faire » et « Moment » (1-B, étape 1) | 22 novembre 2026 | fait (vérifié sur le web, à tester sur téléphone) |
| [009](FICHE-009-icones-logo-a1.md) | Les icônes du logo A1 (l'orbe) | 22 novembre 2026 | fait (à voir sur le téléphone après un nouvel APK) |
| [010](FICHE-010-animation-lancement-orbe.md) | L'animation de lancement autour de l'orbe, et le nouveau `PulseLogo` | 23 novembre 2026 | fait et testé (à voir sur le téléphone après un nouvel APK) |
| [011](FICHE-011-notifications-trois-types.md) | Les notifications des trois types, avec trois niveaux (Discret, Normal, Alarme) et la nuit réglable | 23 novembre 2026 | fait et testé (à voir sur le téléphone après un nouvel APK) |
| [012](FICHE-012-formulaires-a-faire-et-moment.md) | Les formulaires de création « À faire » (cyan) et « Moment » (ambre), avec la dictée ; « Temps pour le faire » règle Focus | 23 novembre 2026 | fait et testé (à voir sur le téléphone après un nouvel APK) |
| [013](FICHE-013-dicter-tout-et-y-aller.md) | « Dicter tout » remplit les formulaires d'une phrase ; « Y aller » ouvre l'itinéraire vers le lieu d'un moment | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [014](FICHE-014-formulaires-ajustes-et-dicter-tout-complet.md) | Formulaires ajustés après l'essai (Ajouter toujours visible, À faire direct, en-tête selon l'alerte, petit micro) et « Dicter tout » complet ; voix dans l'ajout d'une personne | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [015](FICHE-015-onglet-a-faire-unique.md) | Un seul onglet « À faire » (filtre Tout · Avec alerte · Sans alerte, liste par moment, carte unique) ; barre du bas Accueil · À faire · Planning · Proches | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [016](FICHE-016-revue-ecrans-largeur-telephone.md) | Revue de tous les écrans à la largeur d'un téléphone (360 px) et corrections (Planning, bouton d'À faire, barre de filtre) | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [017](FICHE-017-coherence-parametres-et-mots.md) | Cohérence : un seul bouton Paramètres sur tous les onglets, les mots Tâche et Rappel partout, plus de liste sur un rappel, « + À faire ou moment » | 23 novembre 2026 | fait et testé (à voir à l'écran) |
| [018](FICHE-018-progres-habitudes-et-objectifs.md) | « Progrès » : carte de l'Accueil, page Habitudes · Objectifs, un objectif avance avec ses habitudes (migration 35) | 23 novembre 2026 | fait et testé (à voir à l'écran) |
| [019](FICHE-019-habitude-qui-sonne.md) | Une habitude qui sonne à une heure, et « Fait » dans la notification qui la coche (migration 36) | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [020](FICHE-020-pulse-propose-une-habitude.md) | Pulse propose « En faire une habitude ? » pour un rappel répété ou une tâche faite souvent | 23 novembre 2026 | fait et testé (à voir sur le téléphone) |
| [021](FICHE-021-presentation-et-bulles-de-pulse.md) | La présentation et les bulles de Pulse à jour : badges Simple · Privé · Pulse, « Comment ça fonctionne » en 5 cartes (Tâche, Rappel, Moment, Habitude, Objectif), visite de l'accueil et astuce d'À faire | 24 novembre 2026 | fait et testé (à voir à l'écran) |
| [022](FICHE-022-modifier-avec-les-memes-formulaires.md) | Modifier avec les mêmes formulaires que pour créer (tâche, rappel, moment) ; « à confirmer » enregistré, une tâche peut perdre son jour, la répétition d'un rappel se change | 24 novembre 2026 | fait et testé, vu sur le web (à voir sur le téléphone) |
| [023](FICHE-023-types-de-moment-et-niveaux-d-alerte.md) | Types de moment (Santé, Deuil, Voyage…) devinés du titre, et hiérarchie des alertes : Auto · Discrète · Normale · Alarme, niveau par défaut dans les Paramètres (migration 37) | 24 novembre 2026 | fait et testé, vu sur le web (à voir sur le téléphone) |
| [024](FICHE-024-gestes-decouvrables.md) | Gestes découvrables : bouton « ⋯ » et appui long sur les cartes (mêmes actions que le glissement), et Pulse montre le glissement une fois (la première carte s'entrouvre) | 24 novembre 2026 | fait et testé, vu sur le web (à voir sur le téléphone) |

Pour comprendre le rôle de chaque dossier et fichier : [l'explorateur du projet](../apprendre/explorateur-du-projet.html) (à ouvrir dans un navigateur ; le remettre à jour avec `node docs/apprendre/generer-explorateur.js`).
