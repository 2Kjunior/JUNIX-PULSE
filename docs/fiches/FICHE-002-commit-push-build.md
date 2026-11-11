# FICHE OPÉRATOIRE N° 002 — Enregistrer, envoyer sur GitHub et construire l'APK

Projet : **Junix Pulse** · Date : 11 novembre 2026 · Suite de : [FICHE 001](FICHE-001-sauvegarde-auto.md)

Cette fiche sert **à chaque fois** qu'une intervention est terminée : elle enregistre le travail (commit), l'envoie sur GitHub (push) et fabrique l'application Android à installer (build EAS).

---

## 1. Objectif

À la fin :
- le travail de la fiche 001 est enregistré dans l'historique Git par **un commit** ;
- ce commit est sur **GitHub** (`https://github.com/2Kjunior/JUNIX-PULSE`, branche `master`) ;
- un **fichier APK** est prêt à télécharger sur expo.dev et à installer sur le téléphone de test.

On le reconnaît : `git status --short` n'affiche plus les fichiers de la fiche 001, GitHub montre le nouveau commit, et la page du build sur expo.dev affiche **Finished** avec un bouton de téléchargement.

## 2. État de départ

| À vérifier | Commande (dossier du projet) | Résultat attendu |
|---|---|---|
| Les tests passent | `npx jest` | `Tests: … passed`, aucun `failed` |
| Pas d'erreur de types | `npx tsc --noEmit` | Rien d'autre que des lignes `npm notice` |
| Les fichiers à enregistrer | `git status --short` | Les fichiers de la fiche 001 (voir la carte ci-dessous), plus `?? docs/motion/` qui **n'est pas à nous** et ne doit pas partir |

## 3. Matériel

| Outil | Preuve | Sinon |
|---|---|---|
| Git | `git --version` | Installer depuis git-scm.com |
| Accès GitHub au dépôt | `git push` a déjà marché sur cet ordinateur | Se connecter avec le compte `2Kjunior` (Git Credential Manager s'ouvre au premier push) |
| Compte Expo | `npx eas-cli whoami` affiche `2k_junior` | `npx eas-cli login` puis identifiants Expo |
| Connexion Internet | — | Le push et le build en ont besoin |

## 4. Hypothèses

- Windows, terminal Git Bash ou PowerShell, dossier `C:\Users\simon\Desktop\Projets\junix-pulse-glowcard`.
- La branche est `master` (vérifier avec `git branch --show-current`).
- Le dossier `docs/motion/` appartient à un autre travail : on ne l'ajoute **jamais** au commit.
- On enregistre « par chemin » : on nomme chaque fichier, au lieu de tout ajouter d'un coup, pour ne pas embarquer un fichier qui n'est pas le nôtre.

## 5. Carte de l'intervention

Aucun fichier n'est modifié par cette fiche. Elle enregistre ceux de la fiche 001 :

| Fichier | État |
|---|---|
| `src/app/settings/index.tsx` | modifié |
| `src/domain/rules/auto-backup-rules.ts` | modifié |
| `src/features/backup/use-auto-backup-setup.tsx` | modifié |
| `src/i18n/messages-rest-en.ts` | modifié |
| `src/i18n/messages-rest-fr.ts` | modifié |
| `src/styles/settings/settings-styles.ts` | modifié |
| `src/components/settings/AutoBackupCard.tsx` | nouveau |
| `src/__tests__/auto-backup-card.test.tsx` | nouveau |
| `docs/fiches/` (fiches 001, 002, index, images) | nouveau |

## 6. Sauvegarde

Un commit **est** une sauvegarde : il peut toujours être défait. Avant le push, on peut annuler le dernier commit en gardant les fichiers :

```bash
git reset --soft HEAD~1   # retire le dernier commit, les modifications restent dans les fichiers
```

> ⚠ **Point de non-retour** : une fois **poussé** sur GitHub (étape 4), le commit est public dans le dépôt. On peut encore le corriger par un nouveau commit, mais pas l'effacer proprement. Le **build** (étape 5) envoie le code aux serveurs d'Expo pour fabriquer l'APK.

## 7. Étapes

### Étape 1 — Annoncer les nouveaux fichiers à Git

- **Où** : terminal, dossier du projet.
- **Geste** : tapez la commande puis Entrée.

```bash
git add -N src/components/settings/AutoBackupCard.tsx src/__tests__/auto-backup-card.test.tsx docs/fiches/
```

| Morceau | Sens |
|---|---|
| `git add` | Ajoute des fichiers à ce que Git suit |
| `-N` | « intention d'ajouter » : Git sait que ces nouveaux fichiers existent, sans encore les enregistrer ; le commit par chemin pourra les inclure |
| les chemins | Les deux fichiers créés et le dossier des fiches |

- **Pourquoi** : un commit « par chemin » n'accepte que des fichiers que Git connaît déjà.
- **Contrôle** : `git status --short` montre ` A` devant ces fichiers au lieu de `??`.
- **Si ça rate** : `pathspec did not match` → un chemin est mal tapé ; comparez avec la carte.

### Étape 2 — Enregistrer le commit (par chemin)

```bash
git commit -m "feat(backup): a card for the automatic backup, and the first operating sheets" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/app/settings/index.tsx src/domain/rules/auto-backup-rules.ts src/features/backup/use-auto-backup-setup.tsx src/i18n/messages-rest-en.ts src/i18n/messages-rest-fr.ts src/styles/settings/settings-styles.ts src/components/settings/AutoBackupCard.tsx src/__tests__/auto-backup-card.test.tsx docs/fiches/
```

| Morceau | Sens |
|---|---|
| `git commit` | Enregistre un instantané des fichiers dans l'historique |
| `-m "…"` (premier) | Le titre du commit : ce qui change, en une ligne |
| `-m "…"` (second) | Un paragraphe en plus : ici la mention de co-auteur |
| `--` | « Ce qui suit, ce sont des chemins » |
| les chemins | **Uniquement** ces fichiers partent ; `docs/motion/` reste dehors |

- **Ce qui se passe ensuite tout seul** : le projet a un « crochet » (`.husky/pre-commit`) qui lance `lint-staged` (corrige le style des fichiers) puis `tsc --noEmit` (vérifie les types). Si l'un échoue, le commit est **refusé** et rien n'est enregistré.
- **Contrôle** : la dernière ligne ressemble à `[master abc1234] feat(backup): a card…` suivie de `N files changed`.
- **Si ça rate** : erreur de `tsc` → corrigez l'erreur affichée puis relancez la même commande. Ne contournez jamais le crochet avec `--no-verify`.

### Étape 3 — Vérifier que seul notre travail est parti

```bash
git status --short
```

- **Contrôle** : il ne reste que `?? docs/motion/`.

### Étape 4 — Envoyer sur GitHub

```bash
git push origin master
```

| Morceau | Sens |
|---|---|
| `git push` | Envoie les commits locaux vers le dépôt distant |
| `origin` | Le nom du dépôt distant (GitHub) |
| `master` | La branche envoyée |

- **Contrôle** : une ligne `c3e008c..abc1234  master -> master`.
- **Si ça rate** : `rejected (fetch first)` → quelqu'un a poussé avant vous ; lancez `git pull --rebase origin master` puis refaites le push.

### Étape 5 — Lancer la fabrication de l'APK

```bash
npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

| Morceau | Sens |
|---|---|
| `npx eas-cli build` | Demande aux serveurs Expo (EAS) de fabriquer l'application |
| `--platform android` | Pour Android uniquement |
| `--profile preview` | Le profil défini dans `eas.json` : produit un fichier **APK** installable à la main |
| `--non-interactive` | Ne pose aucune question |
| `--no-wait` | Rend la main tout de suite, sans attendre la fin (≈ 25 minutes) |

- **Contrôle** : la dernière ligne est `See logs: https://expo.dev/accounts/2k_junior/projects/junix-pulse/builds/<NUMERO>`.
- **Si ça rate** : `Not logged in` → `npx eas-cli login`.

### Étape 6 — Récupérer l'APK

- **Où** : navigateur › le lien `See logs` de l'étape 5.
- **Geste** : attendez que l'état passe à **Finished** (≈ 25 min), puis cliquez **Install** ou **Download** ; sur le téléphone, ouvrez le lien et installez par-dessus l'ancienne version.
- **Contrôle** : l'appli s'ouvre et Paramètres › Sauvegarde et données montre la nouvelle carte.

## 8. Test final

1. `git log --oneline -1` affiche le nouveau commit.
2. La page GitHub du dépôt montre ce commit en haut.
3. La page du build sur expo.dev est **Finished**, et l'APK s'installe.

## 9. Dépannage

| Message | Cause | Remède |
|---|---|---|
| `error TS…` pendant le commit | Le crochet a trouvé une erreur de types | Corrigez, puis refaites l'étape 2 |
| `pathspec 'x' did not match any files` | Chemin mal tapé ou fichier inexistant | Vérifiez avec `git status --short` |
| `Updates were rejected` | Le dépôt distant a des commits que vous n'avez pas | `git pull --rebase origin master`, puis push |
| Build **Errored** sur expo.dev | Erreur de compilation côté serveur | Ouvrez les logs, cherchez la première ligne `error` |

## 10. Lexique

- **Commit** : un instantané enregistré du projet, avec un message.
- **Push** : l'envoi des commits vers GitHub.
- **Dépôt distant / origin** : la copie du projet sur GitHub.
- **Crochet (hook)** : un programme lancé automatiquement par Git, ici avant chaque commit.
- **EAS Build** : le service d'Expo qui fabrique l'application dans ses serveurs.
- **APK** : le fichier d'installation d'une application Android.
- **Profil `preview`** : réglage de `eas.json` qui produit un APK installable sans le Play Store.

## 11. Et après

1. Installer l'APK sur le téléphone de test et suivre le « Test final » de la [fiche 001](FICHE-001-sauvegarde-auto.md) (point 4).
2. Pour les prochaines interventions, réutiliser cette fiche : seule la liste des fichiers (étapes 1 et 2) et le titre du commit changent.
3. Suite prévue : même design de carte à la fin de l'onboarding (fiche 001, « Et après », point 3).
