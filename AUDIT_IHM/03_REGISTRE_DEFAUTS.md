# 📋 AUDIT JUNIX PULSE — 03. REGISTRE EXHAUSTIF DES DÉFAUTS ET ANOMALIES

> **Date :** 18 octobre 2026  
> **Classification de gravité :**  
> - **P0** : Perte de données, exposition critique de sécurité, crash bloquant sans contournement.  
> - **P1** : Fausse promesse de sécurité, régression fonctionnelle critique, obstacle d'accessibilité majeur, perte d'occurrences.  
> - **P2** : Dysfonctionnement récurrent, frottement ergonomique fort, défaut de lisibilité ou d'alignement important.  
> - **P3** : Défaut cosmétique local, confort, cohérence stylistique mineure.

---

## 1. DÉFAUTS DE GRAVITÉ P1 (CRITIQUES / MAJEURS)

### [DEF-01 / I-02] — Coffre-fort Sanctuaire : absence totale de chiffrement local et hash PIN vulnérable
- **Source :** Inspection de sécurité
- **Domaine :** Sécurité / Vie privée / Stockage local
- **Fichiers concernés :** `src/app/sanctum.tsx` (L.61-74, 570-573), `src/repositories/sanctum-repository.ts` (L.28, 81), `src/services/backup-service.ts` (L.25, 206)
- **Affirmation initiale :** Sanctuaire non chiffré, PIN haché en SHA-256 avec sel fixe, notes en clair dans SQLite, biométrie purement cosmétique.
- **Verdict :** **Confirmé**
- **Preuve :**
  - Sel fixe codé en dur : `'sanctum_salt_jp_'`.
  - Hachage par SHA-256 direct (1 seul tour), sans KDF robuste (scrypt, argon2 ou PBKDF2). Espace de recherche de 4 à 8 chiffres cassable en moins d'une seconde sur un simple ordinateur.
  - La table SQLite `sanctum_notes` stocke les colonnes `title` et `content` en texte brut non chiffré.
  - L'UI affiche pourtant de façon trompeuse : `<Text>Espace chiffré & déverrouillé</Text>`.
  - La sauvegarde JSON (`createBackup`) exporte l'intégralité de la table `sanctum_notes`, y compris la ligne `id = '__pin_hash__'`.
- **Résultat attendu :** Un coffre-fort dit « chiffré » doit chiffrer les notes individuellement (ou la base) via AES-GCM ou XChaCha20-Poly1305 avec une clé dérivée de manière sécurisée (scrypt/PBKDF2) du PIN de l'utilisateur ou du trousseau matériel Android Keystore.
- **Résultat observé :** Données en clair dans le fichier `junixpulse.db` et hachage trivial du PIN.
- **Référentiel :** Règle normative (OWASP MASVS-STORAGE) & Règle métier (R-12).
- **Impact utilisateur :** Faux sentiment de sécurité absolue. Toute personne ayant accès au fichier SQLite (sauvegarde déchiffrée, téléphone rooté ou copie de données) lit l'intégralité des notes secrètes.
- **Cause racine :** Implémentation hâtive d'un écran de verrouillage d'interface sans sous-couche cryptographique pour le stockage.
- **Piste de correction proposée :** Chiffrer le contenu des notes avec XChaCha20-Poly1305 en dérivant une clé à partir du PIN et d'un sel aléatoire unique stocké dans SecureStore, ou exclure `sanctum_notes` des sauvegardes non authentifiées.
- **Test de validation futur :** Vérifier par inspection SQL brute qu'aucun texte en clair n'apparaît dans la colonne `content` de `sanctum_notes`.
- **Risque de régression :** Élevé lors de la migration des notes existantes (nécessite une routine de migration chiffrée avec mot de passe/PIN).

---

### [DEF-02 / I-14] — « Effacer toutes les données » est incomplet et n'annule pas les notifications planifiées
- **Source :** Inspection de conformité des données
- **Domaine :** Données / Notifications / Cycle de vie
- **Fichiers concernés :** `src/database/seed.ts` (L.58-72), `src/app/settings/index.tsx` (L.280-298)
- **Verdict :** **Confirmé**
- **Preuve :**
  - `clearAllData()` exécute `DELETE FROM` sur 14 tables, mais ignore : `sanctum_notes`, `recurrence_rules`, `personal_schedules`, `planning_blocks`, `settings`.
  - Aucune transaction SQLite exclusive (`withExclusiveTransactionAsync` absent).
  - Aucun appel à `NotificationService.cancelAll()` : les alarmes enregistrées auprès du système d'exploitation persistent.
- **Résultat attendu :** Une fonction « Effacer toutes les données » doit vider 100 % des tables applicatives dans une transaction atomique et purger toutes les notifications planifiées du gestionnaire système.
- **Résultat observé :** Les notes secrètes, le PIN et le planning hebdomadaire restent intacts ; les notifications continuent de sonner sur un rappel censé avoir été effacé.
- **Référentiel :** Règle normative (RGPD Droit à l'effacement) & Règle métier.
- **Impact utilisateur :** Violation de la confidentialité et incompréhension lors de déclenchements de rappels fantômes.
- **Cause racine :** Omission des nouvelles tables créées dans les migrations récentes (014, 015, 020) dans la liste de purge de `seed.ts`.
- **Piste de correction proposée :** Utiliser la liste complète `BACKUP_TABLES` pour purger la base en une seule transaction et appeler `NotificationService.cancelAll()`.

---

### [DEF-03 / I-11] — Rupture définitive des séries de rappels récurrents non marqués manuellement
- **Source :** Inspection de logique métier
- **Domaine :** Rappels / Récurrence / Moteur temporel
- **Fichiers concernés :** `src/use-cases/reminder-use-cases.ts` (L.173-199)
- **Verdict :** **Confirmé**
- **Preuve :**
  - `getNextOccurrence` n'est appelé que dans le corps de `completeReminder()`.
  - Il n'existe aucun composant de conciliation temporelle au lancement de l'application ni de tâche de fond périodique.
- **Résultat attendu :** Un rappel quotidien ou hebdomadaire doit continuer à planifier ses occurrences futures même si une occurrence précédente a été manquée ou ignorée.
- **Résultat observé :** Si l'utilisateur n'ouvre pas l'appli pour cliquer sur « Terminé », la série s'arrête net. Plus aucun rappel de la série n'est jamais émis.
- **Référentiel :** Règle métier (BR-004 Récurrence déterministe).
- **Impact utilisateur :** Perte de confiance critique dans le rôle d'assistant personnel de l'application.
- **Cause racine :** Architecture de récurrence « à l'achèvement » (modèle Todoist) au lieu d'une conciliation temporelle globale basée sur la date actuelle.
- **Piste de correction proposée :** Ajouter au démarrage de l'appli (`src/app/_layout.tsx`) une passe de conciliation des rappels récurrents actifs dont l'échéance est dépassée pour instancier la prochaine occurrence future.

---

### [DEF-04 / I-12] — Génération d'occurrences et de reports « Demain » situés dans le passé
- **Source :** Inspection de logique métier
- **Domaine :** Rappels / Snooze / Calculs de date
- **Fichiers concernés :** `src/domain/rules/reminder-rules.ts` (L.63-65, 185-189)
- **Verdict :** **Confirmé**
- **Preuve :**
  - `computeSnoozeTomorrowSameTime` applique `addDays(parseISO(scheduledAt), 1)` sur la date originale. Si un rappel planifié lundi est reporté le jeudi, le snooze calcule mardi (passé).
  - `getNextOccurrence` pour un rappel `DAILY` ajoute `rule.interval` à la date échue sans boucler jusqu'à une date future.
  - Combiné avec I-01 (`notification-service.ts` L.94-95), la notification est instantanément reprogrammée à +10 secondes.
- **Résultat attendu :** Tout report ou nouvelle occurrence doit obligatoirement tomber dans le futur par rapport à l'instant `now`.
- **Résultat observé :** Occurrences créées dans le passé et alertes parasites 10 secondes plus tard.
- **Référentiel :** Règle métier (BR-003b Snooze) & Ergonomie.
- **Impact utilisateur :** Notifications imprévisibles et confusion sur l'agenda.

---

### [DEF-05 / I-03] — Boutons icône seule dépourvus de nom accessible pour les lecteurs d'écran
- **Source :** Inspection d'accessibilité (a11y)
- **Domaine :** Accessibilité / TalkBack & VoiceOver
- **Fichiers concernés :** `src/components/calendar/CalendarTimetable.tsx` (L.365), `src/app/settings/schedule.tsx` (L.146, 150, 222), `src/app/goals/[id].tsx` (L.142, 148, 275, 297), `src/app/settings/index.tsx` (L.308)
- **Verdict :** **Partiellement confirmé** (confirmé sur tous les boutons icônes pures)
- **Preuve :**
  - Les boutons `<TouchableOpacity>` ne contenant qu'un composant `<Ionicons>` ne possèdent ni `accessibilityLabel` ni `accessibilityRole="button"`.
  - Exemples : le bouton de fermeture de modale dans `CalendarTimetable`, les boutons retour, ajout et suppression de bloc dans `settings/schedule`, et les boutons de suppression/dissociation dans `goals/[id]`.
- **Résultat attendu :** Tout élément cliquable doit comporter un nom accessible explicite et un rôle sémantique (WCAG 2.2 SC 4.1.2 Nom, rôle et valeur).
- **Résultat observé :** Le lecteur d'écran énonce « Bouton » sans indiquer son action (« Retour », « Supprimer », « Fermer »).
- **Référentiel :** Règle normative (WCAG 2.2 niveau AA - Critère 4.1.2).
- **Impact utilisateur :** Application totalement inutilisable par une personne non-voyante sur ces écrans.

---

## 2. DÉFAUTS DE GRAVITÉ P2 (FONCTIONNELS / ERGONOMIQUES)

### [DEF-06 / U-04 & U-09] — Logo de lancement défectueux (carré blanc opaque) et séquence de démarrage heurtée
- **Source :** Propriétaire & Inspection d'assets
- **Domaine :** Identité visuelle / Splash Screen / Expérience de démarrage
- **Fichiers concernés :** `assets/images/splash-icon.png`, `assets/images/android-icon-foreground.png`, `app.json` (L.35-41), `src/components/ui/PulseLogo.tsx`, `src/components/ui/SplashAnimated.tsx`
- **Verdict :** **Confirmé**
- **Preuve :**
  - `splash-icon.png` et `android-icon-foreground.png` ont un canal alpha uniforme de 255 (aucune transparence) avec des coins à `[254, 249, 253, 255]`.
  - `app.json` applique un fond sombre `#141317`. Android affiche un rectangle blanc opaque de 120dp sur fond noir.
  - Puis `SplashAnimated.tsx` prend le relais et impose 1 580 ms d'attente avec un logo tracé au code dont les courbes divergent de `official-logo.png`.
- **Résultat attendu :** Un écran de démarrage avec logo officiel sur fond transparent, s'enchaînant de manière transparente et sans saut vers l'accueil.
- **Résultat observé :** Carré blanc disgracieux sur fond noir, suivi d'un second écran animé qui retarde l'accès de 1,6 s.
- **Référentiel :** Convention Android 12+ & Choix esthétique.

---

### [DEF-07 / U-05] — Décentrage vertical du texte et anneau sombre sur les boutons de création
- **Source :** Propriétaire & Inspection de composants
- **Domaine :** Design System / Composants / Rendu Android
- **Fichiers concernés :** `src/components/ui/Button.tsx` (L.86, 100, 142-163)
- **Verdict :** **Confirmé**
- **Preuve :**
  - Dans `Button.tsx`, `styles['size_' + size]` est appliqué à la fois sur le `<Pressable>` parent et sur le `<LinearGradient>` enfant. Le padding vertical et horizontal est appliqué deux fois.
  - `primaryBase` applique `elevation: 6` et `overflow: 'hidden'` sur le conteneur transparent, ce qui provoque sur le moteur de rendu natif Android un artefact d'anneau noir/halo sombre sur le contour du bouton.
- **Résultat attendu :** Le padding doit être appliqué à un seul niveau de la hiérarchie ; l'élévation Android doit être portée par un conteneur avec fond opaque.
- **Résultat observé :** Bouton écrasé, texte mal centré et bague sombre autour des boutons primaires sur Android.
- **Référentiel :** Ergonomie & Convention Android.

---

### [DEF-08 / U-01] — Absence totale de gestes de swipe sur les cartes et listes
- **Source :** Propriétaire
- **Domaine :** Ergonomie mobile / Interactions gestuelles
- **Fichiers concernés :** `src/app/(tabs)/tasks.tsx`, `src/app/(tabs)/index.tsx`, `src/app/reminders/index.tsx`
- **Verdict :** **Confirmé**
- **Preuve :** 0 occurrence de `Swipeable` ou `GestureDetector` dans tout le dossier `src/`.
- **Résultat attendu :** Possibilité de glisser une carte vers la gauche pour supprimer (avec Undo) ou vers la droite pour terminer/snoozer.
- **Résultat observé :** L'utilisateur est contraint d'ouvrir la fiche détaillée et d'appuyer sur une corbeille confirmée par un dialogue bloquant `Alert.alert`.
- **Référentiel :** Recommandation ergonomique & Convention mobile iOS/Android.

---

### [DEF-09 / I-01] — Reprogrammation silencieuse à +10s des rappels créés avec une heure passée
- **Source :** Inspection fonctionnelle
- **Domaine :** Notifications / Capture rapide
- **Fichiers concernés :** `src/services/notification-service.ts` (L.94-95), `src/app/capture.tsx` (L.170-185)
- **Verdict :** **Confirmé**
- **Preuve :** Si `triggerDate <= now`, le service force `now + 10_000` sans avertir l'utilisateur.
- **Résultat attendu :** Le système doit rejeter la programmation ou avertir que l'échéance est dépassée.
- **Résultat observé :** L'utilisateur valide un rappel, et le téléphone sonne 10 secondes plus tard.
- **Référentiel :** Recommandation ergonomique (prévisibilité de l'IHM).

---

### [DEF-10 / I-13] — Faux positifs massifs du parseur de capture rapide en langage naturel
- **Source :** Inspection algorithmique
- **Domaine :** Traitement du langage naturel local / Capture
- **Fichiers concernés :** `src/app/capture.tsx` (L.109, 120-123, 136-149)
- **Verdict :** **Confirmé**
- **Preuve :**
  - « après-demain » est interprété comme « demain » en raison de l'ordre d'évaluation des chaînes.
  - « soir » écrase toute heure explicite (ex. « 19h » devient « 20:30 »).
  - La présence d'un chiffre et de la lettre « h » dans n'importe quel mot (ex. « chez ») déclenche une fausse heure (ex. 02:00 du matin).
  - Recherche de contact par sous-chaîne sans borne de mot (`\b`), causant des associations erronées.
- **Résultat attendu :** Un parseur déterministe avec regex prioritaires et respect des bornes lexicales.
- **Résultat observé :** Données erronées pré-remplies dans les sélecteurs de confirmation.
- **Référentiel :** Règle métier & Ergonomie.

---

### [DEF-11 / I-06] — Animation de largeur sur le thread JS dans le bouton flottant (FAB)
- **Source :** Inspection de performance
- **Domaine :** Performance / Thread UI / Fluidité
- **Fichiers concernés :** `src/components/ui/GlassFloatingActionButton.tsx` (L.80-85, 117-120)
- **Verdict :** **Confirmé**
- **Preuve :** `Animated.timing` anime `expandAnim` avec `useNativeDriver: false` pour recalculer la largeur du conteneur (52px $\rightarrow$ 168px).
- **Résultat attendu :** Toutes les animations d'interface doivent utiliser le thread natif UI (Reanimated ou `useNativeDriver: true` avec scale/transform).
- **Résultat observé :** Reflows continus sur le thread JavaScript pendant 420 ms à chaque changement d'onglet, créant des micro-saccades sur téléphones modestes.
- **Référentiel :** Convention de performance React Native.

---

### [DEF-12 / I-05] — Ratios de contraste textuel insuffisants sur le CTA dégradé et les surfaces claires
- **Source :** Inspection a11y & colorimétrie
- **Domaine :** Accessibilité visuelle / Design System
- **Fichiers concernés :** `src/constants/palettes.ts` (L.148, 191, 246)
- **Verdict :** **Confirmé**
- **Preuve :**
  - Texte blanc sur début du dégradé `#8B5CF6` = **4,23:1** (seuil requis : 4,5:1).
  - `#A8A29E` sur fond crème `#FBF7F2` = **2,36:1**.
  - `#6B6572` sur fond sombre `#141317` = **3,29:1**.
- **Résultat attendu :** Ratio $\ge 4,5:1$ pour tout texte informatif normal (WCAG 2.2 SC 1.4.3).
- **Résultat observé :** Perte de contraste en ambiance lumineuse élevée.
- **Référentiel :** Règle normative (WCAG 2.2 niveau AA).

---

### [DEF-13 / I-07] — 51 boîtes de dialogue bloquantes `Alert.alert` sans filet de sécurité Undo
- **Source :** Inspection d'interaction
- **Domaine :** IHM / Gestion des erreurs et confirmations
- **Fichiers concernés :** 51 occurrences réparties dans `src/app/**`
- **Verdict :** **Confirmé**
- **Preuve :** 51 appels directs à `Alert.alert`. Seul le rappel possède une annulation différée (30s).
- **Résultat attendu :** Utilisation d'un Snackbar non intrusif avec bouton d'annulation pour les suppressions douces, et messages intégrés dans l'écran pour les erreurs.
- **Résultat observé :** Interruptions modales permanentes et suppressions sans retour possible.
- **Référentiel :** Recommandation ergonomique (Bastien & Scapin : Gestion des erreurs).

---

### [DEF-14 / I-10] — Outils de démo et de test exposés sans garde `__DEV__` en production
- **Source :** Inspection de code
- **Domaine :** Qualité logicielle / Configuration
- **Fichiers concernés :** `src/app/reminders/new.tsx` (L.236-244), `src/app/settings/index.tsx` (L.228-277)
- **Verdict :** **Confirmé**
- **Preuve :** Présence de la puce « Dans 10s (Test) » et des boutons « Charger les données de démo » sans condition `if (__DEV__)`.
- **Résultat attendu :** Les utilitaires de test doivent être masqués ou isolés en mode développement.
- **Résultat observé :** L'utilisateur final a accès à des boutons de test interne.
- **Référentiel :** Bonnes pratiques de livraison logicielle.

---

## 3. DÉFAUTS DE GRAVITÉ P3 (MINEURS / ESTHÉTIQUES)

### [DEF-15 / I-18] — Instruction `addDays(scheduled, 0)` inutile et dérive mensuelle
- **Source :** Inspection de code
- **Domaine :** Qualité du code
- **Fichiers concernés :** `src/domain/rules/reminder-rules.ts` (L.37, 96-102)
- **Verdict :** **Confirmé**
- **Preuve :** `addDays(scheduled, 0)` ne fait rien. `dayOfMonth` non transmis depuis `new.tsx` fige les rappels mensuels au 28 après février.
- **Gravité :** P2 pour la dérive mensuelle, P3 pour le code mort.

### [DEF-16 / I-08] — Bandes claires parasites dans Pulse et bouton « Aujourd'hui » invisible
- **Source :** Propriétaire & Inspection de style
- **Domaine :** Esthétique / Design System
- **Fichiers concernés :** `src/styles/tabs/pulse-styles.ts` (L.295), `src/styles/tabs/calendar-styles.ts` (L.61-64)
- **Verdict :** **Confirmé**
- **Preuve :** Fond `rgba(255,255,255,0.04)` créant des rayures horizontales ; opacité 0.45 rendant le bouton Aujourd'hui quasi invisible.
- **Gravité :** P3.

### [DEF-17 / U-08] — Dégradés violets codés en dur incompatibles avec le langage verre
- **Source :** Propriétaire
- **Domaine :** Direction artistique
- **Fichiers concernés :** `src/components/ui/GlassFloatingActionButton.tsx` (L.166, 209), `src/components/ui/Button.tsx`
- **Verdict :** **Confirmé (choix de design)**
- **Preuve :** Couleurs `#8B5CF6` et `#6D28D9` codées en dur, formant un contraste violent avec le verre sombre de la barre d'onglets.
- **Gravité :** P3.

### [DEF-18 / I-17] — Mode d'apparence système forcé à `'dark'` par défaut dans SQLite
- **Source :** Inspection de configuration
- **Domaine :** Cohérence système
- **Fichiers concernés :** `src/database/migrations.ts` (L.427), `src/repositories/settings-repository.ts` (L.16)
- **Verdict :** **Confirmé**
- **Preuve :** La table SQLite insère `DEFAULT 'dark'` alors que `app.json` spécifie `"automatic"`.
- **Gravité :** P3.
