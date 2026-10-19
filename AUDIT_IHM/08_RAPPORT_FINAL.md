# Rapport final — Audit IHM/UX, utilisabilité et qualité connexe

**Projet :** Junix Pulse Glowcard  
**Date :** 17 octobre 2026  
**Périmètre :** application Expo/React Native, routes, composants, thème, migrations, tests, configuration et dépendances.  
**Méthode :** lecture statique ciblée, calcul de contraste, exécution des contrôles projet déjà disponibles et tentative de prévisualisation Web.

## Verdict

Le projet repose sur une base produit sérieuse : architecture local-first, palette sémantique, composants de feedback, formulaires structurés, composants d'action réutilisables et 195 tests existants au moment de l'audit. La qualité perçue peut devenir très bonne après un cycle de fiabilisation ciblé.

Il ne faut toutefois pas présenter la version actuelle comme prête à diffuser sans réserve. Un problème de confidentialité Sanctum est bloquant (P0). La recherche globale, le contraste de la navigation et la permission excessive de contacts ont été corrigés pendant cet audit, mais requièrent une recette sur appareil/build. Plusieurs améliorations P2 touchent directement l'autonomie des utilisateurs : labels persistants, actions custom accessibles et mouvement réduit.

## Éléments positifs

- Thème clair/sombre structuré par tokens et `useThemedStyles`.
- Contraste très bon pour les textes principaux et secondaires généraux.
- Composants `EmptyState`, `LoadingState`, `ErrorState` et `Skeleton` disponibles.
- Bouton partagé avec cible minimale de 46, rôle, nom et état désactivé.
- Barre d'onglets déjà dotée d'un nom et d'un état sélectionné accessibles.
- `AnimatedPressable` et le logo prennent déjà en compte, au moins localement, la préférence de mouvement réduit.
- Typecheck, lint direct et 195 tests réussissaient lors de l'audit antérieur ; les tests ne couvrent toutefois pas tous les défauts UI relevés.

## Points bloquants et urgents

1. **P0 — Sanctum.** Le PIN n'est pas une protection cryptographique suffisante des notes stockées en clair. Corriger la sécurité et la promesse utilisateur avant diffusion sensible.
2. **P1 corrigé, recette requise — Recherche.** Les colonnes obsolètes ont été alignées sur le schéma ; ajouter un test contre les migrations actuelles.
3. **P1 corrigé, recette requise — Navigation.** Les onglets inactifs utilisent maintenant un token conforme, distinct de l'état désactivé ; contrôler les deux thèmes sur appareil.
4. **P1 corrigé, build requis — Permission contacts.** La permission d'écriture de contacts a été supprimée de la configuration Android ; vérifier l'import dans le prochain build.
5. **P1 — Dépendances.** L'audit npm signalait 46 vulnérabilités dans l'arbre ; les mises à jour doivent être compatibles Expo 57 et revues, jamais forcées aveuglément.

## Corrections et validations effectuées pendant l'audit

- Recherche : `scheduled_at`, `description` et `deadline` remplacent les colonnes inexistantes ; l'affichage de sous-titre s'appuie maintenant sur ces données réelles.
- Navigation : ajout du token `onSurface.inactive` et application aux icônes/libellés d'onglets non sélectionnés.
- Android : retrait de `WRITE_CONTACTS` de la liste explicite et ajout à `android.blockedPermissions`, car le plugin Expo Contacts l'ajoute autrement au manifeste final.
- Vérifications : `npx tsc --noEmit`, ESLint ciblé, analyse JSON de `app.json` et Jest (`12` suites, `195` tests) réussis. Le premier essai Jest a échoué uniquement au cache temporaire du sandbox ; le second, configuré sur l'espace de travail, a exécuté toutes les suites avec succès.

## Décision de diffusion recommandée

**Go conditionnel pour une recette interne ; no-go pour une diffusion sensible ou large tant que P0/P1 sont ouverts.**

Après corrections, effectuer le plan de recette sur Android/iOS, thèmes clair/sombre, tailles de police élevées et VoiceOver/TalkBack. L'état final ne devra être qualifié « conforme » que sur la base de captures et de tests d'appareil, pas sur le seul code.

## Livrables associés

- `01_INVENTAIRE_ECRANS.md` : couverture des routes, parcours et états à tester.
- `02_PARCOURS_FONCTIONNELS.md` : parcours utilisateur et ruptures observées.
- `03_AUDIT_HEURISTIQUE.md` : analyse Nielsen / ISO 9241-110.
- `04_AUDIT_ACCESSIBILITE.md` : contraste, noms/rôles, mouvement, police et limites.
- `05_REGISTRE_ANOMALIES.md` : registre actionnable P0–P3.
- `06_RECOMMANDATIONS_PRIORISEES.md` : ordre de correction.
- `07_PLAN_RECETTE.md` : scénarios et critères de sortie.

## Limite importante

Le serveur Expo Web pouvait démarrer, mais le navigateur accessible dans l'environnement n'a pas pu joindre le serveur local. Ainsi, ce rapport ne revendique aucune observation de pixel, alignement ou responsive réelle. Cette transparence est volontaire : les constats de contraste et d'interaction sont fondés sur le code et doivent être finalisés par recette visuelle sur appareil.
