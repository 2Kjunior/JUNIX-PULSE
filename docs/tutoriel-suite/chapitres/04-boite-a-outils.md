# 19. Travailler avec une IA (Claude, ou une autre) sans perdre le fil

Quand tu auras de nouveau des jetons, ou avec un autre assistant, donne-lui **ce cadre** au début. Copie-colle ce texte, puis la recette voulue :

```txt
Projet : Junix Pulse (Expo SDK 58, React Native 0.88, expo-router, SQLite chiffré SQLCipher, FR/EN).
Dossier : C:\Users\simon\Desktop\Projets\junix-pulse-glowcard, branche master.
Avant tout code Expo, lire https://docs.expo.dev/versions/v58.0.0/ (Expo a changé).

Règles :
- Fiche opératoire d'abord dans docs/fiches/ (modèle : FICHE-010), puis exécution, puis compte rendu.
- Les décisions produit sont dans docs/etudes/ETUDE-001-clarifier-et-faire-evoluer.md, section 12. Ne pas les contredire.
- Tout ajout passe par les registres (src/constants/item-kinds.ts, event-types.ts) pour pouvoir ajouter ou retirer sans casser.
- Migrations additives seulement (version actuelle 33), sauvegarde (backup-service.ts) mise à jour, pas d'apostrophe dans les commentaires SQL.
- Textes en français ET en anglais (src/i18n/messages.ts).
- Ne jamais affaiblir le PIN, le chiffrement ni le Sanctuaire. Ne pas contourner les restrictions Android.
- Pas de nouvelle dépendance sans justification.
- Ne jamais commiter, pousser ni publier sans mon accord. Commit par chemins (git commit -- fichiers), jamais docs/motion/, jamais --no-verify.
- Ne jamais dire qu'un test a réussi sans l'avoir lancé.

Tâche : (colle ici la recette, par exemple « Recette D, étape 1 »).
```

> [astuce] Demande **une étape à la fois**, et vérifie chaque étape (tests) avant de passer à la suivante. C'est plus lent sur le moment, beaucoup plus rapide au total.

# 20. Git : l'aide-mémoire

| Je veux… | Commande |
|---|---|
| Voir ce qui a changé | `git status --short` |
| Voir le détail d'un fichier | `git diff src/app/_layout.tsx` |
| Voir l'historique | `git log --oneline -10` |
| Annoncer un fichier nouveau | `git add -N chemin/du/fichier` |
| Enregistrer certains fichiers seulement | `git commit -m "message" -- fichier1 fichier2` |
| Envoyer sur GitHub | `git push origin master` |
| Annuler mes changements d'un fichier (pas encore enregistrés) | `git restore chemin/du/fichier` |
| Revenir sur un commit déjà envoyé, proprement | `git revert <numéro>` (crée un commit inverse) |
| Mettre de côté un instant | `git stash push -- fichier` puis `git stash pop` |

> [danger] Évite `git reset --hard`, `git push --force` et `git clean -fd` : ils effacent du travail sans retour possible. Et ne change pas de branche : d'autres travaux vivent dans ce dossier.

**Écrire un bon message de commit** : un type, puis ce que l'utilisateur gagne. Exemples tirés du projet :

```txt
feat(logo): the orb A1 as the app icon, themed icon, notification icon and launch image
fix(stats): figures that follow what the user does, and a microphone that explains itself
docs(fiches): build the APK on the PC, and the Expo quota on the shared build sheet
```

# 21. Les commandes de vérification, en un coup d'œil

| Commande | Ce qu'elle vérifie | Durée |
|---|---|---|
| `npx jest` | Tous les tests | 1 à 3 min |
| `npx jest <fichier>` | Un seul fichier de test | quelques secondes |
| `npx tsc --noEmit` | Les types (fautes de nom, mauvais arguments) | 30 s à 1 min |
| `npx eslint <fichiers>` | Le style et les erreurs courantes | quelques secondes |
| `npx expo start --web` | L'appli dans le navigateur | — |
| `npx expo config --type public` | Que `app.json` est lisible | quelques secondes |
| `npx expo-doctor` | Les versions des modules | 30 s |

# 22. Dépannage général

| Symptôme | Cause probable | Remède |
|---|---|---|
| `Invalid VFS state` sur le web | Deux onglets de l'appli ouverts sur la même base | Fermer tous les onglets sauf un |
| L'écran du web reste vide | Erreur JavaScript | F12 › Console : lire la première erreur rouge |
| L'appli du téléphone ne change pas après un APK | Ancien APK installé, ou prebuild oublié | Recette C depuis l'étape 1 |
| « Application non installée » | Signature différente (Expo contre PC) | Sauvegarder, désinstaller, réinstaller, restaurer (recette A) |
| Un test des migrations échoue | Apostrophe dans un commentaire SQL, ou migration modifiée | Corriger le commentaire ; ne jamais modifier une ancienne migration |
| Une ancienne sauvegarde ne se restaure plus | Nouvelle colonne sans valeur par défaut dans zod | Ajouter `.default(...)` dans le schéma (recette 9.2) |
| Texte affiché comme `home.quickAdd` | Clé absente dans une langue | La recopier dans les deux blocs de `messages.ts` |
| Icône en point d'interrogation | Nom `Ionicons` inexistant | Vérifier sur `icons.expo.fyi` |
| Animation saccadée | Calcul lourd sur le fil JavaScript | Mettre le calcul dans un `worklet`, utiliser des valeurs partagées |
| `Cannot find name 'fs'` dans un test | Pas de types Node dans le projet | `declare const __dirname: string; const fs = require('fs');` (comme `app-icons.test.ts`) |
| Le serveur web s'arrête au démarrage (`exited with code 3221225477`) ou Metro dit `Unable to deserialize cloned data` | Le cache de Metro est abîmé (souvent après un plantage du PC ou d'une compilation) | `npx expo start --web --clear` : vide le cache et le reconstruit (une minute de plus) |
| PowerShell affiche du rouge après un collage | Le résultat d'une commande a été recollé | Ne copier que la commande |
| Le PC se met en veille pendant la compilation | Veille automatique | Relancer : Gradle reprend |

# 23. Lexique

| Mot | Sens |
|---|---|
| **APK** | Le fichier d'installation d'une appli Android |
| **Build / compilation** | La fabrication de l'APK à partir du code |
| **Prebuild** | La création du dossier `android/` à partir de `app.json` |
| **Commit** | Un enregistrement daté du projet dans git |
| **Push** | L'envoi des commits sur GitHub |
| **Migration** | Une modification numérotée de la structure de la base |
| **Dépôt (repository)** | Le code qui lit et écrit une table |
| **Règle pure** | Une fonction sans écran ni base : même entrée, même sortie, facile à tester |
| **Registre** | Une liste unique qui décrit des types (familles, types d'événements) |
| **Canal (Android)** | Une catégorie de notifications avec son propre son et sa propre importance |
| **Worklet** | Une fonction exécutée sur le fil des animations |
| **Valeur partagée** | Un nombre animé par Reanimated |
| **i18n** | L'internationalisation : les textes en plusieurs langues |
| **zod** | La bibliothèque qui vérifie la forme d'une sauvegarde importée |
| **SQLCipher** | La version chiffrée de SQLite |
| **Fiche opératoire** | Le tutoriel écrit avant chaque action (`docs/fiches/`) |

# 24. Les fichiers fournis avec ce document

Tout est dans `docs/tutoriel-suite/` (et dans l'archive `junix-pulse-tutoriel-suite.zip` sur le Bureau) :

| Chemin | Contenu |
|---|---|
| `tutoriel-junix-pulse.pdf` | Ce document |
| `tutoriel-junix-pulse.html` | Le même, à ouvrir dans un navigateur (liens cliquables) |
| `chapitres/*.md` | Le texte source des chapitres, modifiable |
| `outils/construire-pdf.js` | Refabrique le PDF (et l'archive avec `--zip`) : chapitre 25 |
| `outils/appliquer-fiche-010.js` | Réapplique la fiche 010 à partir de ses blocs |
| `assets/logo/*.svg` | Les cinq dessins sources du logo (icône, Android, une couleur, notification, démarrage) |
| `assets/images/*.png` | Les icônes fabriquées (icon, android-icon-*, notification-icon, splash-icon, favicon) |
| `assets/etude/*.svg` | Les planches de l'étude (propositions de logo, A1 final) |
| `assets/sons/junix-pulse-launch-sound.wav` | Le son de lancement |
| `assets/scripts/generer-icones.js` | Le script qui fabrique les icônes |

## 24.1 Les planches du logo

<figure><img src="assets/etude/logo-A1-final.svg" style="width:100%"><figcaption>Figure 8 — Le logo A1 validé, dans tous ses usages (docs/etudes/images/logo-A1-final.svg).</figcaption></figure>

<figure><img src="assets/images/icon.png" style="width:30%"> <img src="assets/images/android-icon-monochrome.png" style="width:30%; background:#E9DDFF"><figcaption>Figure 9 — L'icône de l'appli et l'icône à thème (Android 13+), telles que fabriquées.</figcaption></figure>

<figure><img src="assets/etude/logo-propositions.svg" style="width:100%"><figcaption>Figure 10 — Les propositions de logo de l'étude (A, B, C) : A a été choisi.</figcaption></figure>

# 25. Mettre à jour ce document

<div class="fiche-recette"><div><b>Temps</b>10 à 30 minutes</div><div><b>Difficulté</b>1 / 5</div><div><b>Ingrédients</b>les fichiers `chapitres/*.md`</div><div><b>Ustensiles</b>VS Code, Node, Edge</div></div>

Ce document n'est pas figé : il est **fabriqué** à partir de fichiers texte. Tu modifies le texte, tu lances une commande, et le PDF, la page HTML et l'archive du Bureau sont refaits.

## 25.1 Comment le document est fabriqué

<figure>
<svg width="660" height="170" viewBox="0 0 660 170" font-family="Segoe UI, Arial" font-size="11.5" text-anchor="middle">
  <g font-weight="700" fill="#fff">
    <rect x="10" y="10" width="170" height="44" rx="8" fill="#3B2A78"/><text x="95" y="30">chapitres/*.md</text><text x="95" y="46" font-weight="400">ton texte (00, 01, 02…)</text>
    <rect x="10" y="64" width="170" height="44" rx="8" fill="#5b3fb0"/><text x="95" y="84">docs/fiches/*.md</text><text x="95" y="100" font-weight="400">les annexes, lues telles quelles</text>
    <rect x="10" y="118" width="170" height="44" rx="8" fill="#0E7490"/><text x="95" y="138">git</text><text x="95" y="154" font-weight="400">date, commit, fichiers en cours</text>
    <rect x="250" y="55" width="160" height="60" rx="10" fill="#2e9e57"/><text x="330" y="80">construire-pdf.js</text><text x="330" y="98" font-weight="400">+ style.css, couverture.html</text>
    <rect x="480" y="10" width="170" height="44" rx="8" fill="#141317"/><text x="565" y="37">tutoriel-junix-pulse.pdf</text>
    <rect x="480" y="64" width="170" height="44" rx="8" fill="#141317"/><text x="565" y="91">tutoriel-junix-pulse.html</text>
    <rect x="480" y="118" width="170" height="44" rx="8" fill="#B45309"/><text x="565" y="138">Bureau : .zip</text><text x="565" y="154" font-weight="400">avec --zip</text>
  </g>
  <g stroke="#888" stroke-width="2.5"><line x1="180" y1="32" x2="250" y2="75"/><line x1="180" y1="86" x2="250" y2="86"/><line x1="180" y1="140" x2="250" y2="98"/><line x1="410" y1="75" x2="480" y2="32"/><line x1="410" y1="86" x2="480" y2="86"/><line x1="410" y1="98" x2="480" y2="140"/></g>
</svg>
<figcaption>Figure 11 — La fabrication du document.</figcaption>
</figure>

| Fichier | Rôle | À modifier ? |
|---|---|---|
| `chapitres/00-journal.md` | Le journal des mises à jour | **Oui, à chaque fois** |
| `chapitres/01-…md` à `04-…md` | Les chapitres | Oui, là où l'état a changé |
| `outils/couverture.html` | La couverture ; `{{DATE}}`, `{{COMMIT}}`… sont remplis tout seuls | Rarement |
| `outils/style.css` | Couleurs, marges, polices du PDF | Rarement |
| `outils/construire-pdf.js` | La fabrique | Seulement pour ajouter une annexe |
| `docs/fiches/*.md` | Les annexes A à E, reprises **automatiquement** | Non : elles suivent les fiches |

## 25.2 La recette, geste par geste

1. **Ouvre** le dossier `docs/tutoriel-suite/chapitres/` dans VS Code.
2. **Mets à jour l'état du projet** : chapitre 2 (`01-avant-de-commencer.md`, sections 2.1 à 2.4). Exemple après l'enregistrement de la fiche 010 : dans le tableau 2.1, ajoute la ligne du nouveau commit ; dans 2.2, écris « rien en attente ».
3. **Coche la recette terminée** : au début de la recette concernée, ajoute un encadré :

```md
> [astuce] **Fait le 25 novembre 2026** : commit `abc1234`, vu sur le téléphone.
```

4. **Ajoute une ligne au journal** (`00-journal.md`), la plus récente en bas.
5. **Si tu as créé une nouvelle fiche** (par exemple la 011), ajoute-la comme annexe : dans `outils/construire-pdf.js`, dans la liste `annexes`, ajoute une ligne sur le modèle des autres :

```js
  ['Annexe G — Fiche 011 complète (notifications)', 'docs/fiches/FICHE-011-notifications.md'],
```

6. **Fabrique** le document, depuis la racine du projet :

```powershell
cd C:\Users\simon\Desktop\Projets\junix-pulse-glowcard
node docs/tutoriel-suite/outils/construire-pdf.js --zip
```

**Tu dois voir** deux lignes :

```txt
C:\...\docs\tutoriel-suite\tutoriel-junix-pulse.pdf : 120 pages
C:\Users\simon\Desktop\junix-pulse-tutoriel-suite.zip : 2300 Ko
```

7. **Vérifie** : ouvre le PDF (double-clic), regarde la couverture (date et commit du jour) et la page que tu as modifiée.

## 25.3 Ce que le Markdown permet ici

| Tu écris | Tu obtiens |
|---|---|
| `# Titre` | Un nouveau chapitre (nouvelle page, entrée du sommaire) |
| `## Titre` | Une section (entrée du sommaire) |
| `### Titre` | Une sous-section |
| `**gras**`, `*italique*`, `` `code` `` | Mise en forme |
| Une ligne qui commence par `- ` ou `1. ` | Une liste |
| Un tableau avec des `|` | Un tableau |
| Trois accents graves suivis de `powershell`, `bash`, `ts`… puis le code, puis trois accents graves | Un bloc de commande noir |
| `> [note] …`, `> [astuce] …`, `> [attention] …`, `> [danger] …` | Les encadrés de couleur |
| `![légende](assets/images/icon.png)` | Une image (chemin à partir de `docs/tutoriel-suite/`) |
| Un bloc qui commence par `<figure>` ou `<svg` | Un schéma dessiné (copie un schéma existant et modifie-le) |

> [attention] Une ligne vide sépare chaque paragraphe, tableau, liste ou schéma. Dans un schéma `<svg>`, **pas de ligne vide** à l'intérieur, sinon il est coupé en deux.

> [note] Pour ajouter une **capture d'écran** de l'appli : sur le téléphone, bouton marche + volume bas ; copie l'image dans `docs/tutoriel-suite/assets/captures/`, puis écris `![Accueil en thème sombre](assets/captures/accueil.png)` dans le chapitre.

## 25.4 Si ça ne marche pas

| Message | Remède |
|---|---|
| `Edge introuvable` | Indique le chemin de Chrome ou Edge : `$env:EDGE_PATH = 'C:\chemin\vers\msedge.exe'` puis relance |
| Le PDF a 0 page ou n'apparaît pas | Ferme toutes les fenêtres Edge, puis relance |
| `ENOENT … FICHE-011…` | Le chemin de l'annexe ajoutée est faux : vérifie le nom exact dans `docs/fiches/` |
| Un tableau s'affiche comme du texte | La 2e ligne du tableau doit être `|---|---|` (autant de colonnes que l'en-tête) |
| Le zip échoue (`being used by another process`) | Ferme le zip s'il est ouvert, et le PDF dans le lecteur, puis relance |
