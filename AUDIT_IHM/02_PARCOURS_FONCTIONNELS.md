# Parcours fonctionnels et utilisabilité

**Audit du 17 octobre 2026** · Sources : lecture des routes, composants, migrations, tests et scripts du dépôt.

## Vue d'ensemble

L'application possède une base métier riche et local-first : tâches, rappels, calendrier, relations, habitudes, objectifs, capture et recherche. Les flux principaux sont déjà structurés autour de formulaires, de composants d'état et de routes dédiées. L'utilisabilité est néanmoins pénalisée par des défauts qui interrompent un parcours complet ou qui rendent l'interface moins fiable au clavier, au lecteur d'écran ou avec un thème donné.

## Parcours inspectés

### 1. Recherche globale — interrompu

La recherche est accessible depuis le tableau de bord et propose un champ focalisé. L'intention et le retour de résultat sont clairs, mais le flux est bloqué par deux requêtes incompatibles avec le schéma réel :

- `src/app/search.tsx:106` consulte `reminders.due_at`, alors que la migration crée `reminders.scheduled_at` (`src/database/migrations.ts:76`).
- La même recherche consulte `goals.category`, colonne absente de la table des objectifs.

Conséquence : une recherche contenant au moins deux caractères peut échouer dès la requête des rappels ; le `catch` masque l'erreur et l'utilisateur obtient vraisemblablement une liste vide. La recherche est une fonction transversale : priorité P1 avant diffusion.

### 2. Création de tâche, rappel, habitude et objectif — structure saine, étiquetage faible

Les quatre formulaires partagent une organisation cohérente : barre Annuler/Créer, groupe de titre et notes, sections pour les attributs métier et validation de titre. Les boutons de barre ont un libellé d'accessibilité. En revanche, les champs de titre et de notes reposent sur le `placeholder`, sans étiquette persistante ni `accessibilityLabel` :

- tâche : `src/app/tasks/new.tsx:159` et `:174` ;
- rappel : `src/app/reminders/new.tsx:198` et `:214` ;
- habitude : `src/app/habits/new.tsx:114` et `:130` ;
- objectif : `src/app/goals/new.tsx:104` et `:120`.

Le texte indicatif disparaît dès la saisie ; l'utilisateur et la technologie d'assistance peuvent alors perdre le contexte. Ajouter des libellés visibles et un nom accessible est recommandé (P2).

### 3. Calendrier et création depuis un créneau — riche mais à fiabiliser pour l'assistance

Le planning permet d'ouvrir un créneau libre puis de choisir événement, rappel ou tâche. C'est une bonne réduction de la distance entre planification et action. Les actions de créneau, de fermeture et les cartes d'option sont des `TouchableOpacity` sans rôle ni nom accessible explicitement dans `CalendarTimetable.tsx` (par exemple `:325`, `:364`, `:378`, `:402`, `:426`).

La feuille modale se ferme par toucher de l'arrière-plan. À la recette, vérifier le focus initial, le retour du focus au créneau déclencheur, la fermeture Android et l'annonce du choix sélectionné. Priorité P2.

### 4. Snooze de rappel — options compréhensibles, action peu annoncée

La feuille de report présente quatre raccourcis et deux options explicites (« demain même heure », « choisir une date & heure »). Les titres visuels sont bons. Le fond cliquable et les tuiles ne déclarent pas de rôle/nom d'accessibilité (`ReminderSnoozeSheet.tsx:47`, `:56`, `:73`, `:93`, `:132`).

Le bénéfice utilisateur est immédiat si chaque tuile annonce sa durée et si la feuille reçoit un rôle modal adapté. Priorité P2.

### 5. Navigation principale — utile mais contraste et mouvement à corriger

La barre d'onglets est identifiée par rôle, nom et état sélectionné. C'est un point positif. Toutefois, elle emploie la couleur sémantique réservée aux états désactivés pour les onglets inactifs, alors que ces onglets sont activables. Le contraste mesuré est insuffisant en mode clair et limite en mode sombre ; voir `04_AUDIT_ACCESSIBILITE.md`.

Les changements de sélection et l'appui déclenchent plusieurs animations sans tenir compte de l'option « réduire les animations » ; voir `AUD-UX-004`.

### 6. États de chargement, vide et erreur — fondations présentes, couverture à vérifier

`components/feedback/States.tsx` propose les trois états essentiels avec un bouton de reprise. C'est une bonne fondation. L'audit statique ne permet pas d'attester que chaque route liste les utilise au bon moment : la recette doit provoquer réseau/SQLite indisponible, liste vide, rafraîchissement et erreur pour les six onglets principaux. Priorité P3 de couverture, pas un défaut confirmé de chaque écran.

## Règles de validation fonctionnelle

- Ne pas masquer une erreur métier en liste vide : journaliser techniquement et afficher une erreur récupérable à l'utilisateur.
- Une action destructive doit expliquer l'effet, offrir une annulation lorsque réaliste et conserver les données cohérentes en cas d'échec intermédiaire.
- Une action utilisateur doit produire un retour perceptible : état désactivé pendant sauvegarde, confirmation, erreur actionable ou navigation.
- Une interaction tactile équivalente doit être disponible au lecteur d'écran et au clavier/sélecteur lorsque la plate-forme le permet.

## Tests manquants prioritaires

1. Test d'intégration SQLite de la recherche contre les migrations courantes, un exemple de chaque type de résultat.
2. Test de parcours « nouveau rappel → notification → snooze → annulation » avec permission refusée.
3. Test d'accessibilité des formulaires (nom accessible des champs, erreurs annoncées).
4. Test manuel iOS et Android du calendrier avec lecteur d'écran.
5. Test de régression de la barre d'onglets en thèmes clair/sombre et mouvement réduit.
