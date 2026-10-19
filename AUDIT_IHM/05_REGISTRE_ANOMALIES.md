# Registre des anomalies IHM/UX et qualité connexe

Date de création : 17 octobre 2026. Statuts mis à jour le 18 octobre 2026 après corrections ciblées. Les certitudes sont fondées sur la lecture des sources et, lorsque précisé, sur calcul ou test automatisé.

## Échelle

- **P0** : risque critique de confidentialité, sécurité ou perte majeure de confiance ; bloquant de diffusion.
- **P1** : parcours principal rompu ou exclusion importante ; à corriger avant diffusion.
- **P2** : dégradation significative, risque d'erreur ou d'accessibilité ; à planifier rapidement.
- **P3** : dette, cohérence ou amélioration ; à traiter lors de l'itération appropriée.

| ID | Catégorie / source | Reproduction et preuve | Référence | Gravité / certitude | Cause racine probable | Correction et tests | Statut |
|---|---|---|---|---|---|---|---|
| AUD-SEC-001 | Confidentialité, revue code | Ouvrir Sanctum : PIN 4–8 chiffres haché avec sel prévisible ; notes dans SQLite en clair | `src/app/sanctum.tsx:61`, `src/database/migrations.ts:401` | **P0 / confirmée** | Le PIN protège le flux mais pas les données au repos | Stockage sécurisé lié à l'appareil, KDF à sel aléatoire, chiffrement authentifié des notes, anti-bruteforce ; tests migration et verrouillage | Ouvert |
| AUD-UX-001 | Fonctionnel / utilisabilité, revue code | Rechercher au moins 2 caractères : requête `reminders.due_at` alors que le schéma a `scheduled_at` ; `goals.category` absent | `src/app/search.tsx:106`, `src/database/migrations.ts:76` | **P1 / confirmée** | Pas de test d'intégration recherche/migrations | Colonnes alignées le 18 oct. (`scheduled_at`, `description`, `deadline`) ; ajouter encore un test SQLite avec chaque type | **Corrigé, recette à faire** |
| AUD-A11Y-001 | Contraste, calcul | Onglet inactif : 2,17:1 clair et 2,90:1 sombre sur la barre | `src/constants/palettes.ts:143-147,240-244`, `src/app/(tabs)/_layout.tsx:149,324` | **P1 / confirmée** | Token « disabled » utilisé pour un contrôle disponible | Token `inactive` conforme appliqué le 18 oct. ; contrôler le rendu définitif clair/sombre sur appareil | **Corrigé, recette à faire** |
| AUD-A11Y-002 | Permissions, revue config/code | `WRITE_CONTACTS` déclaré ; le code d'import sélectionne/lit les contacts | `app.json`, import contacts | **P1 / confirmée** | Permission historique inutile | Permission explicite retirée et bloquée via `android.blockedPermissions` (nécessaire car le plugin Expo Contacts l'ajoute) ; revalider le manifeste et l'import dans le prochain build | **Corrigé, build à faire** |
| AUD-A11Y-003 | Libellés de champs, revue code | Saisir dans titre/notes : le prompt disparaît, aucun nom accessible explicite | formulaires tâche/rappel/habitude/objectif, voir `02` | **P2 / confirmée** | Placeholder employé comme label | Ajouter label visible + `accessibilityLabel` ; tests lecteur d'écran | Ouvert |
| AUD-A11Y-004 | Contrôles custom, revue code | Balayer TalkBack/VoiceOver dans snooze ou feuille calendrier | `ReminderSnoozeSheet.tsx`, `CalendarTimetable.tsx` | **P2 / confirmée** | `TouchableOpacity` sans contrat d'accessibilité uniforme | Définir rôle, nom, état et modalité ; tests iOS/Android | Ouvert |
| AUD-A11Y-005 | Mouvement réduit, revue code | Activer « réduire les animations », changer d'onglet ou lancer l'app | `(tabs)/_layout.tsx:88-123`, `SplashAnimated.tsx:45-50` | **P2 / confirmée** | Les composants n'emploient pas la préférence commune | Brancher la préférence, neutraliser transition non essentielle ; test manuel | Ouvert |
| AUD-UX-002 | Intégrité / feedback, revue code | Créer un rappel/tâche avec plusieurs écritures, provoquer une erreur intermédiaire | use cases création et repositories | **P2 / élevée** | Écritures multi-étapes hors transaction | Transaction SQLite, rollback et message actionnable ; test d'échec simulé | Ouvert |
| AUD-UX-003 | Réversibilité, revue code | Supprimer puis annuler un rappel : commentaire indique l'absence de reprogrammation | flux rappel / notification | **P2 / confirmée** | Réservation de notification non restaurée | Replanifier à l'annulation ou adapter la promesse UI ; test notification | Ouvert |
| AUD-DATA-001 | Sauvegarde, revue code | Export pendant modifications ; importer une sauvegarde avec mêmes identifiants | service backup | **P2 / élevée** | Export sans snapshot transactionnel, `INSERT OR IGNORE` silencieux | Snapshot cohérent, rapport de fusion/restauration, tests de conflit | Ouvert |
| AUD-UX-004 | Cohérence visuelle, analyse statique | Comparer écrans Habitudes/Calendrier/FAB avec palette | 82 lignes TSX avec hex littéral | **P3 / élevée** | Migration de tokens incomplète / exceptions locales | Triage des couleurs, tokens pour valeurs sémantiques, captures clair/sombre | Ouvert |
| AUD-QUAL-001 | Validation, CI | Ouvrir CI : typecheck + lint mais pas Jest | `.github/workflows/*` | **P2 / confirmée** | Pipeline incomplet | Ajouter `npm test -- --runInBand` ou commande équivalente ; bloquer les régressions | Ouvert |
| AUD-QUAL-002 | Documentation, revue dépôt | README/recap mentionnent 19/20 migrations, code en contient 22 | docs et `migrations.ts` | **P3 / confirmée** | Documentation non synchronisée | Mettre à jour inventaire, version et procédure de migration | Ouvert |
| AUD-DEP-001 | Dépendances, `npm audit --omit=dev` | 46 vulnérabilités : 1 critique, 28 hautes, 17 modérées | audit npm du 16 oct. 2026 | **P1 / confirmée au niveau arbre** | Dépendances transitives ; correctif forcé destructif proposé | Analyser atteignabilité, monter les versions compatibles Expo 57, ne pas lancer `--force` aveuglément | Ouvert |

## Hors périmètre de preuve actuelle

- L'alignement, les débordements, l'ordre de focus réel et les comportements de clavier n'ont pas été observés sur simulateur/appareil dans cette session.
- Les ratios sont calculés sur les couleurs définies ; les effets de transparence, images ou élévation de rendu doivent être contrôlés par capture.
