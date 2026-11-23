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

Pour comprendre le rôle de chaque dossier et fichier : [l'explorateur du projet](../apprendre/explorateur-du-projet.html) (à ouvrir dans un navigateur ; le remettre à jour avec `node docs/apprendre/generer-explorateur.js`).
