# 1. Comment lire ce document

Ce document est un **livre de recettes**. Chaque chantier qui reste à faire sur Junix Pulse est écrit comme une recette de cuisine :

<div class="fiche-recette"><div><b>Temps</b>la durée à prévoir</div><div><b>Difficulté</b>de 1 (facile) à 5 (expert)</div><div><b>Ingrédients</b>les fichiers à toucher</div><div><b>Ustensiles</b>les outils et les commandes</div></div>

Puis viennent **les étapes, dans l'ordre**, une action à la fois : « ouvre tel fichier », « cherche telle ligne », « remplace-la par celle-ci », « lance telle commande », « tu dois voir ceci ». Comme dans une vidéo tuto, rien n'est sous-entendu.

## 1.1 Les encadrés

> [note] **À savoir** : une explication pour comprendre ce que tu fais.

> [astuce] **Astuce** : une façon plus rapide ou plus sûre de faire.

> [attention] **Attention** : une erreur fréquente, à éviter.

> [danger] **Danger** : une action qui peut casser l'application ou faire perdre des données. Lis deux fois avant.

## 1.2 Les blocs de commande

Un bloc noir comme celui-ci est **à copier tel quel** dans un terminal (PowerShell ou Git Bash, c'est précisé à chaque fois) :

```powershell
cd C:\Users\simon\Desktop\Projets\junix-pulse-glowcard
git status --short
```

> [attention] Ne copie **que la commande**, jamais le texte qui s'affiche après (`PS C:\...>` ou le résultat). Si tu recolles le résultat d'une commande dans le terminal, PowerShell essaie de l'exécuter et affiche des erreurs rouges sans conséquence, mais déroutantes.

## 1.3 Les trois règles qui ne se discutent pas

1. **Une fiche d'abord, le code ensuite.** Avant de toucher au projet, on écrit (ou on relit) la fiche opératoire dans `docs/fiches/`. Après, on compare ce qui s'est passé à la fiche, et on corrige la fiche si la réalité est différente. C'est ce qui te permet, à toi ou à n'importe qui, de refaire le travail sans aide.
2. **On ne casse rien.** Les migrations de la base de données ne font qu'**ajouter** (jamais supprimer une colonne ni une table). Les données des utilisateurs sont sacrées. Le code PIN, le chiffrement et le Sanctuaire ne sont jamais affaiblis.
3. **On ne prétend jamais qu'un test a réussi s'il n'a pas été lancé.** Une étape « faite » veut dire : faite **et** vérifiée.

<div class="pb"></div>

# 2. Où en est le projet (24 novembre 2026)

## 2.1 Ce qui est fait et enregistré dans git

| Commit | Ce qu'il contient | Envoyé sur GitHub ? |
|---|---|---|
| `fe0d9f2` | La carte de sauvegarde automatique, les premières fiches | oui |
| `132bd3d` | Fiche 003 : fabriquer l'APK sur le PC | oui |
| `dc6cf03` | Les deux familles « À faire » et « Moment », le choix « Nouveau », le registre des types, l'étude 001 | oui |
| `cda1910` | Le logo A1 (l'orbe) : icône, icône à thème, icône de notification, image de démarrage | oui |
| `1f9b1d8` | Fiche 010 : l'animation de lancement autour de l'orbe, sur fond sombre, et `PulseLogo` | oui |
| `5e5f049` | Ce tutoriel, ses outils et ses fichiers fournis | oui |
| `ea1d5a1` | Fiches 014 à 016, le tutoriel à jour avant le 2e APK | oui |
| `4f70b58` | Fiche 017 : un seul bouton Paramètres, les mots Tâche et Rappel partout, plus de liste sur un rappel | oui |
| `c26aadd` | Fiche 018 : « Progrès » (carte de l'Accueil, page Habitudes · Objectifs), un objectif avance avec ses habitudes (migration 35) | oui |
| `cf906b4` | Fiche 019 : une habitude sonne à son heure, « Fait » dans la notification la coche (migration 36) | oui |
| `48d15f1` | Fiche 020 : Pulse propose « En faire une habitude ? » | oui |

| `f8134d3` | Fiche 021 : la présentation en 5 cartes et les bulles de Pulse à jour | oui |
| `b08ea08` | Le tutoriel avant le 3e APK (annexes M à Q) | oui |
| `851d01f` | Fiches 022 et 023 : modifier avec les mêmes formulaires ; types de moment et niveaux d'alerte (migration 37) | oui |
| `8b64f91` | Fiche 024 : bouton « ⋯ », appui long, Pulse montre le glissement une fois | oui |
| `79bbf73` | Fiche 025 : partager sans compte (migration 38) | oui |

> [astuce] Tout ce qui est enregistré est aussi sur GitHub (envoyé le 24 novembre 2026).

## 2.2 sexies Fiches 022 à 025 : modifier, alertes, gestes, partage

- **022** (annexe R) : modifier une tâche, un rappel ou un moment avec **le même formulaire** que pour créer ; « à confirmer » enfin enregistré, une tâche peut retourner dans l'Inbox, la répétition d'un rappel se change.
- **023** (annexe S, chantier n° 5) : **types de moment** (Santé, Deuil, Voyage…) devinés du titre, et **niveau d'alerte** Auto · Discrète · Normale · Alarme, avec un niveau par défaut par famille dans les Paramètres (migration 37).
- **024** (annexe T, chantier n° 6) : bouton **« ⋯ »** et **appui long** sur les cartes ; Pulse montre le glissement **une fois** (la première carte s'entrouvre).
- **025** (annexe U, chantier n° 7) : **« Envoyer »** une tâche, un rappel ou un moment (texte et lien Junix, sans serveur) ; **« Invitation reçue »** pour l'ajouter ; « Invitation envoyée / Participe » (migration 38).

Tests : 2070. Ces fiches ont été vues sur le web à 360 px ; l'APK de la section 2.3 sert à les voir sur le téléphone (notifications, glissement, partage).

## 2.2 quinquies Fiches 017 à 021 : cohérence, Progrès, habitudes, présentation

- **017** (annexe M) : un seul bouton Paramètres sur tous les onglets ; les mots **Tâche** (sans heure) et **Rappel** (sonne à une heure) partout ; plus de liste de sous-tâches sur un rappel ; bouton « + À faire ou moment ».
- **018** (annexe N) : **Progrès** : une carte sur l'Accueil et une page Habitudes · Objectifs ; une habitude peut être liée à un objectif et le fait avancer.
- **019** (annexe O) : une habitude peut **sonner à son heure** ; « Fait » dans la notification la coche.
- **020** (annexe P) : Pulse propose d'**en faire une habitude** pour un rappel répété ou une tâche faite souvent.
- **021** (annexe Q, **pas encore enregistrée**) : la présentation à jour (badges Simple · Privé · Pulse ; « Comment ça fonctionne » en **5 cartes** : Tâche, Rappel, Moment, Habitude, Objectif) et les bulles de Pulse avec ce vocabulaire.

Tests : 2009. Ces fiches ont été vérifiées par les tests, TypeScript et eslint, **pas à l'écran** (le panneau du navigateur était masqué) : l'APK de la section 2.3 sert à les voir.

## 2.2 quater Après l'essai du 23 novembre sur le téléphone : fiches 014, 015, 016

Tes retours (étude, section 14) ont donné trois fiches :

- **014** (annexe J, enregistrée `3edca99`) : « Ajouter » toujours visible, « À faire » ouvre directement le formulaire, l'en-tête change avec l'alerte, petit micro pour les notes, voix dans l'ajout d'une personne, et **« Dicter tout » complet** (priorité, échéance, temps, « à confirmer », notes ; titre nettoyé ; ligne « Compris »).
- **015** (annexe K, enregistrée et envoyée `7ccb568`) : **un seul onglet « À faire »** (filtre Tout · Avec alerte · Sans alerte, liste par moment, carte unique) ; barre du bas **Accueil · À faire · Planning · Proches**.
- **016** (annexe L, **pas encore enregistrée**) : revue de tous les écrans à 360 px, avec une méthode pour la refaire seul (un petit détecteur à coller dans la console du navigateur).

Tests : 1947. APK de test fabriqué juste après cette mise à jour.

## 2.2 ter La fiche 013 (Dicter tout, Y aller), enregistrée (`3edca99`)

La **fiche 013** (annexe I) : un bouton **« Dicter tout »** en haut des deux formulaires (une phrase remplit titre, jour, heure, alerte, personne, priorité, répétition ; pour un Moment aussi le lieu et la fin), et **« Y aller »** (itinéraire Google Maps) sur la page d'un moment qui a un lieu. 1936 tests. Les idées « applis de course » et « carte » sont notées pour la **version 2.0** (étude, section 13).

## 2.2 bis La fiche 012 (formulaires), enregistrée (`e9587da`)

La **fiche 012** (annexe H) fait le chantier n° 3 : deux formulaires de création, **« À faire »** (cyan, avec l'interrupteur Alerte) et **« Moment »** (ambre, « Partir … min avant » seulement avec un lieu), construits à partir d'un registre (`src/constants/item-forms.ts`), avec la **dictée** dans le titre et les notes. La durée devient **« Temps pour le faire »** et règle le minuteur de Focus. Appliquée, testée (1926 tests), vue sur le web ; à enregistrer, puis à voir sur le téléphone.

## 2.2 La fiche 011 (notifications)

La **fiche 011** (annexe G) fait le chantier n° 2 : les notifications des trois types, avec trois niveaux et la nuit réglable. Elle est **appliquée, testée (1918 tests) et vue sur le web** (le réglage « Nuit plus calme »). Il reste à l'**enregistrer** (commit), puis à la voir sur le téléphone avec un nouvel APK (recette C). Le détail est dans le compte rendu en bas de la fiche.

| Fichiers de la fiche 011 | État |
|---|---|
| 3 créés : `notification-level-rules.ts`, `item-notification-rules.ts`, `item-notification-service.ts` | + 2 fichiers de tests |
| 15 modifiés : service de notifications, rappels, migration 34, réglages, sauvegarde, textes, tâches, moments, `_layout.tsx`, un ancien test | voir la carte de la fiche (section 5) |

## 2.2 bis La fiche 010 (animation de lancement), enregistrée

La fiche 010 est **enregistrée** (`1f9b1d8`) et sur GitHub. Ce qui suit décrit comment elle a été vérifiée.

| Fichier | État |
|---|---|
| `src/constants/orb-logo.ts` | créé |
| `src/components/ui/OrbMark.tsx` | créé |
| `src/components/ui/PulseLogo.tsx` | remplacé |
| `src/features/launch/splash-constants.ts` | remplacé |
| `src/features/launch/SplashAnimation.tsx` | remplacé |
| `src/app/_layout.tsx` | modifié (5 endroits) |
| `app.json` | fond de démarrage passé à `#141317` |
| `assets/logo/orbe-demarrage.svg` | remplacé (image vide) |
| `assets/images/splash-icon.png` | refabriquée (transparente) |
| `src/__tests__/launch-orb.test.tsx` | créé |
| `src/__tests__/app-icons.test.ts` | 1 ligne modifiée |
| `jest.setup.js` | 1 ligne ajoutée (`cancelAnimation`) |
| `docs/fiches/FICHE-010-…md` et `INDEX.md` | fiche corrigée, compte rendu écrit |

**Les vérifications faites le 23 novembre 2026** :

| Vérification | Résultat |
|---|---|
| Les 3 fichiers de test de la fiche | `Tests: 13 passed, 13 total` |
| Toute la suite de tests | `86 passed` (fichiers), `1904 passed` (tests) |
| `npx tsc --noEmit` | aucune erreur |
| `npx eslint` sur les fichiers de la fiche | aucune erreur |
| Sur le web | animation complète conforme, aucune erreur dans la console |
| Sur le téléphone | **pas encore** (il faut un nouvel APK) |

Trois corrections ont été nécessaires pendant les tests ; elles sont décrites dans le compte rendu de la fiche 010 (annexe A, tout en bas) et la fiche a été corrigée pour décrire la version qui marche.

<figure>
<svg width="660" height="250" viewBox="0 0 660 250" font-family="Segoe UI, Arial">
  <defs>
    <linearGradient id="v1" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8B3DF0"/><stop offset="1" stop-color="#0AE8F0"/></linearGradient>
    <linearGradient id="v2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b58bff"/><stop offset="1" stop-color="#7fe9f2"/></linearGradient>
    <radialGradient id="v3"><stop offset="0" stop-color="#8B3DF0" stop-opacity="0.45"/><stop offset="1" stop-color="#8B3DF0" stop-opacity="0"/></radialGradient>
    <clipPath id="v4"><circle r="62"/></clipPath>
  </defs>
  <rect width="660" height="250" rx="14" fill="#141317"/>
  <circle cx="330" cy="100" r="110" fill="url(#v3)"/>
  <circle cx="330" cy="100" r="98" fill="none" stroke="#0AE8F0" stroke-width="2" opacity="0.4"/>
  <g transform="translate(330 100) scale(0.95)">
    <circle r="78" fill="none" stroke="url(#v1)" stroke-width="10"/>
    <g clip-path="url(#v4)"><path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#v2)" opacity="0.9"/></g>
    <path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="334" y="215" fill="#fff" text-anchor="middle" font-size="26" font-weight="800" letter-spacing="6">JUNIX</text>
  <text x="334" y="236" fill="#7FE9F2" text-anchor="middle" font-size="11" letter-spacing="8">PULSE</text>
</svg>
<figcaption>Figure 1 bis — Ce que montre l'animation à 2,5 s sur le web (reconstitution fidèle de la capture du 23 novembre) : l'orbe battant, l'onde cyan, le nom.</figcaption>
</figure>

> [note] Si un jour tu dois tout annuler et repartir de l'état `cda1910`, la fiche 010 donne la commande à sa section 6 (Sauvegarde). Tu peux ensuite réappliquer la fiche avec l'outil `outils/appliquer-fiche-010.js` fourni avec ce document.

## 2.3 L'APK du jour

Le plus récent est fabriqué le 24 novembre, juste après cette mise à jour :

- **Fichier** : `C:\Users\simon\Desktop\junix-pulse-local-2026-11-24-fiches-022-025.apk`
- **Contient** : tout jusqu'à la fiche 025 (commit `79bbf73`)
- **À regarder en priorité** : modifier un rappel, une tâche, un moment ; un moment « Dentiste » (type Santé) ; un rappel en « Alarme » ; le « ⋯ » et l'appui long ; « Envoyer » un moment par WhatsApp, puis le lien ou « Invitation reçue ».

Les APK plus anciens (`junix-pulse-local-2026-11-2*-*.apk`) peuvent être supprimés.

La recette A (chapitre 6) explique comment l'installer.

## 2.4 La feuille de route : ce qui reste à faire, dans l'ordre

C'est l'ordre décidé ensemble dans l'étude 001, section 12.10 (texte complet en annexe F) :

<figure>
<svg width="680" height="330" viewBox="0 0 680 330" font-family="Segoe UI, Arial" font-size="12">
  <defs><linearGradient id="fr" x1="0" x2="1"><stop offset="0" stop-color="#8B3DF0"/><stop offset="1" stop-color="#0AE8F0"/></linearGradient></defs>
  <rect x="10" y="150" width="660" height="6" rx="3" fill="url(#fr)"/>
  <g>
    <circle cx="40" cy="153" r="16" fill="#2e9e57"/><text x="40" y="158" text-anchor="middle" fill="#fff" font-weight="700">1</text>
    <text x="40" y="120" text-anchor="middle" font-weight="700">Logo +</text><text x="40" y="135" text-anchor="middle">lancement</text>
    <text x="40" y="190" text-anchor="middle" fill="#2e9e57">icônes : fait</text><text x="40" y="205" text-anchor="middle" fill="#2e9e57">anim : faite</text>
  </g>
  <g>
    <circle cx="110" cy="153" r="16" fill="#3B2A78"/><text x="110" y="158" text-anchor="middle" fill="#fff" font-weight="700">2</text>
    <text x="110" y="95" text-anchor="middle" font-weight="700">Notifications</text><text x="110" y="110" text-anchor="middle">3 types,</text><text x="110" y="125" text-anchor="middle">3 niveaux</text>
  </g>
  <g>
    <circle cx="180" cy="153" r="16" fill="#3B2A78"/><text x="180" y="158" text-anchor="middle" fill="#fff" font-weight="700">3</text>
    <text x="180" y="200" text-anchor="middle" font-weight="700">Formulaires</text><text x="180" y="215" text-anchor="middle">2-B</text>
  </g>
  <g>
    <circle cx="250" cy="153" r="16" fill="#3B2A78"/><text x="250" y="158" text-anchor="middle" fill="#fff" font-weight="700">4</text>
    <text x="250" y="110" text-anchor="middle" font-weight="700">Onglet</text><text x="250" y="125" text-anchor="middle">À faire</text>
  </g>
  <g>
    <circle cx="320" cy="153" r="16" fill="#3B2A78"/><text x="320" y="158" text-anchor="middle" fill="#fff" font-weight="700">5</text>
    <text x="320" y="200" text-anchor="middle" font-weight="700">Alertes et</text><text x="320" y="215" text-anchor="middle">types d'évén.</text>
  </g>
  <g>
    <circle cx="390" cy="153" r="16" fill="#3B2A78"/><text x="390" y="158" text-anchor="middle" fill="#fff" font-weight="700">6</text>
    <text x="390" y="110" text-anchor="middle" font-weight="700">Gestes</text><text x="390" y="125" text-anchor="middle">découvrables</text>
  </g>
  <g>
    <circle cx="460" cy="153" r="16" fill="#3B2A78"/><text x="460" y="158" text-anchor="middle" fill="#fff" font-weight="700">7</text>
    <text x="460" y="200" text-anchor="middle" font-weight="700">Partage</text><text x="460" y="215" text-anchor="middle">5-A</text>
  </g>
  <g>
    <circle cx="530" cy="153" r="16" fill="#3B2A78"/><text x="530" y="158" text-anchor="middle" fill="#fff" font-weight="700">8</text>
    <text x="530" y="110" text-anchor="middle" font-weight="700">Planning</text><text x="530" y="125" text-anchor="middle">+ glisser</text>
  </g>
  <g>
    <circle cx="600" cy="153" r="16" fill="#3B2A78"/><text x="600" y="158" text-anchor="middle" fill="#fff" font-weight="700">9</text>
    <text x="600" y="200" text-anchor="middle" font-weight="700">Sons et</text><text x="600" y="215" text-anchor="middle">alarme</text>
  </g>
  <g>
    <circle cx="655" cy="153" r="14" fill="#777"/><text x="655" y="158" text-anchor="middle" fill="#fff" font-weight="700">10</text>
    <text x="640" y="110" text-anchor="middle" font-weight="700">Compte</text><text x="640" y="125" text-anchor="middle">+ synchro</text>
  </g>
  <text x="340" y="275" text-anchor="middle" fill="#555">Une étape à la fois. Chaque étape = une fiche, un commit, un APK de test.</text>
</svg>
<figcaption>Figure 1 — La feuille de route (étude 001, 12.10). Vert : fait. Violet : à faire. Gris : plus tard.</figcaption>
</figure>

| N° | Chantier | Recette dans ce document | Difficulté |
|---|---|---|---|
| 1 | Terminer l'animation de lancement | B | 2 |
| 2 | Notifications pour les trois types, niveaux Discret / Normal / Alarme | D | 4 |
| 3 | Formulaires 2-B (À faire cyan, Moment ambre) | E | 3 |
| 4 | Onglet « À faire », cartes unifiées, bouton « + À faire ou moment » | F | 3 |
| 5 | Hiérarchie des alertes, types d'événements | G | 3 |
| 6 | Gestes découvrables (astuces par Pulse) | H | 2 |
| 7 | Partage 5-A (lien, message, QR) | I | 3 |
| 8 | Planning Jour / Semaine / Mois, glisser-déposer | J | 5 |
| 9 | Sons et alarme | K | 4 |
| 10 | Compte et synchronisation | L | 5 (plus tard) |

<div class="pb"></div>

# 3. La cuisine : les outils et leurs versions exactes

## 3.1 Les ustensiles (ce qui doit être installé)

| Outil | Version utilisée | Où il est | Comment vérifier |
|---|---|---|---|
| Windows | 11 Famille | — | — |
| Node.js | celle installée (≥ 20) | dans le PATH | `node --version` |
| npm / npx | livré avec Node | dans le PATH | `npx --version` |
| Git | celle installée | dans le PATH | `git --version` |
| Android Studio | avec son Java intégré (JBR) | `C:\Program Files\Android\Android Studio\jbr` | le dossier existe |
| Android SDK | — | `C:\Users\simon\AppData\Local\Android\Sdk` | le dossier existe |
| NDK | **27.1.12297006** | dans le SDK, dossier `ndk` | affiché au début de la compilation |
| CMake | **4.1.2** (avec ninja 1.12.1) | `...\Android\Sdk\cmake\4.1.2` | le dossier existe |
| Kotlin | 2.2.10 (géré par Gradle) | — | affiché au début de la compilation |
| Microsoft Edge | celui de Windows | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | sert à fabriquer les images et ce PDF |
| Un éditeur | VS Code conseillé | — | — |
| Un téléphone Android | ton second téléphone | câble USB ou envoi du fichier | Réglages › À propos |

> [note] Le réglage Windows **chemins longs** (`LongPathsEnabled = 1`) est déjà activé sur ton PC. Sans lui, la compilation Android échoue (`ninja: mkdir ... No such file or directory`). Si tu changes de PC, voir l'annexe B (fiche 003).

## 3.2 Les ingrédients de base (les bibliothèques du projet)

Ne rien installer de plus sans raison. Voici celles dont on se sert dans les recettes, toutes **déjà présentes** :

| Bibliothèque | À quoi elle sert dans Junix Pulse |
|---|---|
| `expo` (SDK 58) et `expo-router` | L'application et ses écrans (un fichier dans `src/app` = un écran) |
| `react-native` 0.88 | Les composants de base (`View`, `Text`, `Pressable`) |
| `react-native-reanimated` | Les animations fluides (valeurs partagées, `withTiming`) |
| `react-native-gesture-handler` | Les gestes (glisser, appui long) |
| `react-native-svg` | Les dessins (logo, mascotte, graphiques) |
| `expo-sqlite` + SQLCipher | La base de données chiffrée |
| `expo-notifications` | Les notifications et leurs canaux Android |
| `expo-audio` | Les sons (son de lancement, son des rappels) |
| `zod` | La vérification des sauvegardes importées |
| `jest` + `react-test-renderer` | Les tests automatiques |

> [attention] La règle du projet (fichier `AGENTS.md`) : **Expo a changé**. Avant d'écrire du code qui utilise Expo, lis la documentation de la version exacte : https://docs.expo.dev/versions/v58.0.0/ (pas celle de la dernière version, pas un vieux tuto).

## 3.3 Ouvrir le projet

1. Ouvre **PowerShell** (touche Windows, tape `powershell`, Entrée).
2. Va dans le dossier du projet :

```powershell
cd C:\Users\simon\Desktop\Projets\junix-pulse-glowcard
```

3. Vérifie l'état :

```powershell
git status --short
git log --oneline -5
```

Tu dois voir les fichiers de la fiche 010 en `M` (modifié) ou `??` (nouveau), et `?? docs/motion/`.

> [danger] Le dossier `docs/motion/` **n'est pas à toi** (il vient d'un autre travail). Ne l'ajoute jamais à un commit, ne le supprime pas.

4. Ouvre le dossier dans VS Code :

```powershell
code .
```

<div class="pb"></div>

# 4. Le plan de la maison : comment le code est rangé

## 4.1 Les étages

Le code est rangé en **couches**, comme les étages d'une maison. Une couche n'utilise que celles **en dessous** d'elle. C'est ce qui permet d'ajouter ou d'enlever une fonction sans tout casser.

<figure>
<svg width="660" height="400" viewBox="0 0 660 400" font-family="Segoe UI, Arial" font-size="12.5">
  <g>
    <rect x="20" y="10" width="620" height="48" rx="10" fill="#3B2A78"/>
    <text x="40" y="32" fill="#fff" font-weight="700">src/app/ — les écrans (expo-router)</text>
    <text x="40" y="49" fill="#e2dcf5">(tabs)/index.tsx, reminders/new.tsx, events/[id].tsx, settings/…, _layout.tsx</text>
  </g>
  <g>
    <rect x="20" y="68" width="300" height="56" rx="10" fill="#5b3fb0"/>
    <text x="35" y="90" fill="#fff" font-weight="700">src/features/</text>
    <text x="35" y="108" fill="#e2dcf5">launch, mascot, create, now, people…</text>
    <rect x="340" y="68" width="300" height="56" rx="10" fill="#5b3fb0"/>
    <text x="355" y="90" fill="#fff" font-weight="700">src/components/</text>
    <text x="355" y="108" fill="#e2dcf5">ui (GlowCard, PulseLogo, OrbMark), feedback…</text>
  </g>
  <g>
    <rect x="20" y="134" width="620" height="48" rx="10" fill="#0E7490"/>
    <text x="40" y="156" fill="#fff" font-weight="700">src/use-cases/ et src/hooks/ — les actions de l'utilisateur</text>
    <text x="40" y="173" fill="#d8f6fa">créer un rappel, cocher une tâche, lire le thème…</text>
  </g>
  <g>
    <rect x="20" y="192" width="300" height="56" rx="10" fill="#0891b2"/>
    <text x="35" y="214" fill="#fff" font-weight="700">src/services/</text>
    <text x="35" y="232" fill="#d8f6fa">notifications, sons, sauvegarde, mascotte</text>
    <rect x="340" y="192" width="300" height="56" rx="10" fill="#0891b2"/>
    <text x="355" y="214" fill="#fff" font-weight="700">src/repositories/</text>
    <text x="355" y="232" fill="#d8f6fa">lire / écrire chaque table (reminder, task…)</text>
  </g>
  <g>
    <rect x="20" y="258" width="300" height="56" rx="10" fill="#B45309"/>
    <text x="35" y="280" fill="#fff" font-weight="700">src/database/</text>
    <text x="35" y="298" fill="#fde9c8">sqlite.ts, migrations.ts (v33), chiffrement</text>
    <rect x="340" y="258" width="300" height="56" rx="10" fill="#2e9e57"/>
    <text x="355" y="280" fill="#fff" font-weight="700">src/domain/rules/ — les règles pures</text>
    <text x="355" y="298" fill="#e0f5e7">sans écran ni base : faciles à tester</text>
  </g>
  <g>
    <rect x="20" y="324" width="620" height="56" rx="10" fill="#141317"/>
    <text x="40" y="346" fill="#fff" font-weight="700">src/constants/ et src/i18n/ — les briques communes</text>
    <text x="40" y="364" fill="#cfc6e8">item-kinds.ts (registre des types), orb-logo.ts, theme.ts, messages.ts (FR / EN)</text>
  </g>
</svg>
<figcaption>Figure 2 — Les couches du code. Une couche n'appelle que celles du dessous.</figcaption>
</figure>

## 4.2 Les pièces les plus importantes

| Fichier | Rôle | Quand tu le touches |
|---|---|---|
| `src/constants/item-kinds.ts` | **Le registre des types** : les deux familles (À faire, Moment), leurs couleurs, icônes, libellés | Pour ajouter un type ou une famille : **un seul endroit** |
| `src/i18n/messages.ts` | Tous les textes, en français puis en anglais | À chaque texte affiché : toujours **les deux langues** |
| `src/database/migrations.ts` | L'historique de la base (version 33 actuellement) | Pour une nouvelle colonne ou table : une **nouvelle** version, jamais modifier une ancienne |
| `src/services/backup-service.ts` | La sauvegarde et la restauration | Dès qu'une table ou une colonne est ajoutée |
| `src/services/notification-service.ts` | Les canaux Android et la programmation des notifications | Recettes D et K |
| `src/app/_layout.tsx` | Le démarrage : base, réglages, notifications, animation | Avec prudence |
| `src/constants/theme.ts` | Les couleurs et tailles (sombre `#141317`, violet, cyan) | Jamais de couleur « en dur » ailleurs |
| `src/features/mascot/` | Pulse, la mascotte | Recettes H et B |

## 4.3 Le registre des types, en image

<figure>
<svg width="640" height="230" viewBox="0 0 640 230" font-family="Segoe UI, Arial" font-size="12.5">
  <rect x="220" y="10" width="200" height="50" rx="10" fill="#141317"/>
  <text x="320" y="32" fill="#fff" text-anchor="middle" font-weight="700">item-kinds.ts</text>
  <text x="320" y="49" fill="#cfc6e8" text-anchor="middle">le registre</text>
  <line x1="320" y1="60" x2="160" y2="95" stroke="#888" stroke-width="2"/>
  <line x1="320" y1="60" x2="480" y2="95" stroke="#888" stroke-width="2"/>
  <rect x="50" y="95" width="220" height="50" rx="10" fill="#0E7490"/>
  <text x="160" y="117" fill="#fff" text-anchor="middle" font-weight="700">Famille « À faire »</text>
  <text x="160" y="134" fill="#d8f6fa" text-anchor="middle">cyan · case à cocher</text>
  <rect x="370" y="95" width="220" height="50" rx="10" fill="#B45309"/>
  <text x="480" y="117" fill="#fff" text-anchor="middle" font-weight="700">Famille « Moment »</text>
  <text x="480" y="134" fill="#fde9c8" text-anchor="middle">ambre · calendrier</text>
  <line x1="110" y1="145" x2="90" y2="175" stroke="#888" stroke-width="2"/>
  <line x1="210" y1="145" x2="230" y2="175" stroke="#888" stroke-width="2"/>
  <line x1="480" y1="145" x2="480" y2="175" stroke="#888" stroke-width="2"/>
  <rect x="20" y="175" width="140" height="44" rx="8" fill="#e6f6fa" stroke="#0E7490"/>
  <text x="90" y="194" text-anchor="middle" font-weight="700">task</text><text x="90" y="210" text-anchor="middle" font-size="11">sans alerte</text>
  <rect x="170" y="175" width="140" height="44" rx="8" fill="#e6f6fa" stroke="#0E7490"/>
  <text x="240" y="194" text-anchor="middle" font-weight="700">reminder</text><text x="240" y="210" text-anchor="middle" font-size="11">avec cloche</text>
  <rect x="410" y="175" width="140" height="44" rx="8" fill="#fdf1dc" stroke="#B45309"/>
  <text x="480" y="194" text-anchor="middle" font-weight="700">event</text><text x="480" y="210" text-anchor="middle" font-size="11">début / fin / lieu</text>
</svg>
<figcaption>Figure 3 — Deux familles à l'écran, trois types dans les données (décision 1-B).</figcaption>
</figure>

> [note] **Pourquoi c'est important** : quand tu ajoutes plus tard un type (par exemple « Anniversaire » comme type de Moment), tu l'ajoutes **dans le registre**, et le choix « Nouveau », les cartes et les couleurs suivent tout seuls. C'est la règle « ajouter ou enlever sans casser ».

<div class="pb"></div>

# 5. Les règles de la maison (à relire avant chaque recette)

| Règle | Pourquoi | Comment la respecter |
|---|---|---|
| Fiche d'abord | Pouvoir refaire seul | Copier une fiche existante (ex. FICHE-010) et l'adapter |
| Commit par chemin | D'autres travaux vivent dans le même dossier | `git commit -m "…" -- fichier1 fichier2` (voir chapitre 13) |
| Jamais `docs/motion/` | Ce n'est pas notre travail | Ne jamais faire `git add .` |
| Jamais `--no-verify` | Les vérifications avant commit protègent | Si une vérification échoue, corriger la cause |
| Migrations additives | Ne jamais perdre les données | Nouvelle version dans `migrations.ts`, `ALTER TABLE … ADD COLUMN` avec une valeur par défaut |
| Pas d'apostrophe dans les commentaires SQL | Un test du projet le vérifie (elle casse la requête) | Écrire « de la » au lieu de « l'… » dans les `--` SQL |
| Sauvegarde à jour | Une restauration doit tout ramener | Toute nouvelle table : dans `backup-service.ts`, avec `.default([])` dans le schéma zod |
| Deux langues | L'appli est FR / EN | Chaque clé ajoutée dans le bloc FR **et** le bloc EN de `messages.ts` |
| Pas d'emoji dans l'interface | Règle de design A.1 | Utiliser les icônes (`Ionicons`) |
| Cibles de 44 px | Accessibilité | `minHeight: 44` sur tout ce qui se touche |
| `accessibilityLabel` | Lecteurs d'écran | Sur chaque bouton qui n'a qu'une icône |
| Mouvement réduit | Accessibilité | `useSafeReducedMotion()` dans toute animation |
| Clair **et** sombre | Les deux thèmes existent | Regarder chaque écran dans les deux |
| Un seul dégradé par écran | Sobriété | — |
| PIN et chiffrement intouchables | Sécurité | Ne jamais réduire le nombre d'essais, la dérivation de clé, ni stocker le PIN en clair |
| Pas de nouvelle dépendance sans raison | Poids, sécurité | Chercher d'abord dans ce qui est déjà installé |
