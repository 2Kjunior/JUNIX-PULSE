# 6. Recette A — Installer l'APK sur le téléphone

<div class="fiche-recette"><div><b>Temps</b>10 minutes</div><div><b>Difficulté</b>1 / 5</div><div><b>Ingrédients</b>le fichier .apk (62 Mo)</div><div><b>Ustensiles</b>câble USB ou Google Drive / WhatsApp</div></div>

## 6.1 Avant tout : sauvegarder les données de l'appli

> [danger] Si l'appli déjà installée sur le téléphone a été fabriquée par **Expo** (EAS, dans le nuage), Android refusera d'installer par-dessus notre APK (signature différente) : il faudra **désinstaller**, ce qui **efface les données**. Sauvegarde d'abord.

1. Ouvre Junix Pulse sur le téléphone.
2. Va dans **Réglages › Sauvegarde**.
3. Touche **Exporter une sauvegarde**, choisis un mot de passe dont tu te souviendras, et enregistre le fichier dans **Téléchargements** ou Google Drive.
4. Vérifie que le fichier existe (application **Fichiers**).

## 6.2 Mettre le fichier sur le téléphone

**Méthode 1 — câble USB**

1. Branche le téléphone au PC. Sur le téléphone, choisis **Transfert de fichiers**.
2. Dans l'Explorateur Windows, ouvre le téléphone › **Download**.
3. Copie-colle `C:\Users\simon\Desktop\junix-pulse-local-2026-11-23.apk` dedans.

**Méthode 2 — sans câble** : envoie le fichier sur ton Google Drive, ou en message à toi-même, puis télécharge-le sur le téléphone.

## 6.3 Installer

1. Sur le téléphone, ouvre **Fichiers › Téléchargements**, touche le fichier `.apk`.
2. Android demande l'autorisation d'installer des applications inconnues pour l'application Fichiers : **Paramètres › Autoriser cette source**, puis retour.
3. Touche **Installer**.
   - Si Android dit **« Application non installée »** ou **« conflit de package »** : l'appli installée a une autre signature. Désinstalle Junix Pulse (appui long sur l'icône › Désinstaller), puis recommence l'étape 1.
   - Si l'APK précédent venait déjà de ton PC (fiche 003), l'installation se fait **par-dessus**, sans perdre les données.
4. Si tu as dû désinstaller : ouvre l'appli, **Réglages › Sauvegarde › Restaurer**, choisis ton fichier, tape le mot de passe.

## 6.4 Ce que tu dois voir avec cet APK

| Où | Ce que tu dois voir |
|---|---|
| Écran d'accueil du téléphone | L'**orbe** (anneau violet → cyan, liquide, battement blanc) sur fond sombre, sans texte |
| Réglages Android › Fond d'écran et style › Icônes à thème | L'orbe d'une seule couleur, avec la vague pleine et le battement découpé |
| Une notification de rappel | La silhouette blanche (anneau + battement) dans la barre d'état |
| Le bouton « + » de l'accueil | Le choix **À faire** (avec ou sans alerte) ou **Moment** |
| Au lancement | Encore l'**ancienne** animation, sur fond blanc (normal : la fiche 010 n'est pas dans cet APK) |

# 7. Recette B — Terminer la fiche 010 (la nouvelle animation de lancement)

<div class="fiche-recette"><div><b>Temps</b>45 minutes à 1 h 30</div><div><b>Difficulté</b>2 / 5</div><div><b>Ingrédients</b>les 12 fichiers de la fiche 010</div><div><b>Ustensiles</b>PowerShell, Edge, le navigateur</div></div>

> [astuce] **Où tu en es (23 novembre 2026)** : les étapes 1 à 5 de cette recette sont **faites et réussies** (image refabriquée, 13 tests puis 1904 tests réussis, `tsc` et `eslint` propres, animation vue sur le web, compte rendu et index écrits). **Commence directement à l'étape 6 (7.8, l'enregistrement)**. Les étapes 1 à 5 restent décrites ci-dessous pour pouvoir les refaire, par exemple après une modification de l'animation.

> [note] **Ce que les tests ont réellement demandé** (et qui est maintenant dans la fiche) : un faux module de son dans le test (`jest.mock('expo-audio', …)`), la propriété `label` au lieu de `accessibilityLabel` sur `OrbMark`, et `cancelAnimation` ajouté au faux Reanimated de `jest.setup.js`. Si tu rencontres l'une de ces erreurs dans un autre test, la solution est la même.

## 7.1 Ce que fait la nouvelle animation

<figure>
<svg width="680" height="190" viewBox="0 0 680 190" font-family="Segoe UI, Arial" font-size="11">
  <defs>
    <linearGradient id="r2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B3DF0"/><stop offset="1" stop-color="#0AE8F0"/></linearGradient>
    <linearGradient id="l2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b58bff"/><stop offset="1" stop-color="#7fe9f2"/></linearGradient>
    <clipPath id="k2"><circle r="62"/></clipPath>
  </defs>
  <rect width="680" height="190" rx="12" fill="#141317"/>
  <g transform="translate(70 80) scale(0.4)"><circle r="78" fill="none" stroke="url(#r2)" stroke-width="10" stroke-dasharray="245 490" transform="rotate(180)"/></g>
  <g transform="translate(200 80) scale(0.4)"><circle r="78" fill="none" stroke="url(#r2)" stroke-width="10" transform="rotate(180)"/><g clip-path="url(#k2)"><path d="M-150 50 Q-130 38 -110 50 T-70 50 T-30 50 T10 50 T50 50 T90 50 T130 50 V150 H-150 Z" fill="url(#l2)"/></g></g>
  <g transform="translate(330 80) scale(0.4)"><circle r="78" fill="none" stroke="url(#r2)" stroke-width="10"/><g clip-path="url(#k2)"><path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#l2)" opacity="0.9"/></g><path d="M-58 6 H-26 L-16 -26 L-2 34" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <g transform="translate(460 70) scale(0.36)"><circle r="78" fill="none" stroke="url(#r2)" stroke-width="10"/><g clip-path="url(#k2)"><path d="M-70 18 Q-50 6 -30 18 T10 18 T50 18 T90 18 V80 H-70 Z" fill="url(#l2)" opacity="0.9"/></g><path d="M-58 6 H-26 L-16 -26 L-2 34 L10 -6 L18 6 H58" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>
  <text x="460" y="118" fill="#fff" text-anchor="middle" font-weight="700" font-size="13" letter-spacing="3">JUNIX</text>
  <text x="460" y="131" fill="#7FE9F2" text-anchor="middle" font-size="8" letter-spacing="4">PULSE</text>
  <g transform="translate(600 75)"><circle r="30" fill="#2b2050" stroke="#8B3DF0" stroke-width="3"/><circle cx="-10" cy="-4" r="4" fill="#fff"/><circle cx="10" cy="-4" r="4" fill="#fff"/><path d="M-8 9 Q0 15 8 9" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="28" y="-38" width="7" height="24" rx="3.5" fill="#b58bff" transform="rotate(25 31 -14)"/></g>
  <g fill="#cfc6e8" text-anchor="middle">
    <text x="70" y="160">0,15 s</text><text x="70" y="175">l'anneau se dessine</text>
    <text x="200" y="160">0,85 s</text><text x="200" y="175">le liquide monte</text>
    <text x="330" y="160">1,75 s</text><text x="330" y="175">le battement passe</text>
    <text x="460" y="160">2,30 s</text><text x="460" y="175">le nom apparaît</text>
    <text x="600" y="160">3,00 s</text><text x="600" y="175">Pulse salue</text>
  </g>
</svg>
<figcaption>Figure 4 — Le déroulé de l'animation (4,4 s). Fondu sur l'appli à 3,90 s. Pulse n'apparaît que si la mascotte est activée.</figcaption>
</figure>

## 7.2 Les ingrédients, déjà en place

Les dix fichiers listés au chapitre 2.2. Le code complet de chacun est dans la fiche 010 (annexe A), section 7, étapes 1 à 7, avec l'explication ligne par ligne.

> [note] Si un jour tu dois **réappliquer** la fiche 010 (par exemple après avoir tout annulé), l'outil fourni le fait tout seul, à partir des blocs de la fiche :
>
> `node docs/tutoriel-suite/outils/appliquer-fiche-010.js "C:\Users\simon\Desktop\Projets\junix-pulse-glowcard"`
>
> Il vérifie d'abord que chaque morceau à remplacer existe **une seule fois** ; sinon il s'arrête sans rien écrire.

## 7.3 Étape 1 — Refabriquer l'image de démarrage

L'image `assets/images/splash-icon.png` doit devenir **transparente** (vide), car l'écran de démarrage d'Android est maintenant sombre et vide, et c'est notre animation qui dessine l'orbe.

```powershell
cd C:\Users\simon\Desktop\Projets\junix-pulse-glowcard
node scripts/logo/generer-icones.js
```

**Tu dois voir** six lignes, par exemple :

```txt
assets/images/icon.png (1024 x 1024)
assets/images/android-icon-foreground.png (1024 x 1024)
assets/images/android-icon-monochrome.png (1024 x 1024)
assets/images/notification-icon.png (96 x 96)
assets/images/splash-icon.png (1024 x 1024)
assets/images/favicon.png (48 x 48)
```

Puis :

```powershell
git status --short assets/images
```

**Tu dois voir** au moins ` M assets/images/splash-icon.png`. Si d'autres images apparaissent, ouvre-les (double-clic) : si elles sont identiques à l'œil, c'est Edge qui a recompressé autrement ; tu peux les garder ou les remettre comme avant avec `git restore assets/images/icon.png` (par exemple).

> [attention] Si tu vois `Image non produite`, ferme toutes les fenêtres Edge et relance. Voir le dépannage de l'annexe C.

## 7.4 Étape 2 — Lancer les tests de la fiche

```powershell
npx jest src/__tests__/launch-orb.test.tsx src/__tests__/splash-and-logo.test.tsx src/__tests__/app-icons.test.ts
```

**Tu dois voir** à la fin : `Tests: 13 passed, 13 total`.

**Si un test échoue**, voici les cas les plus probables (ces tests n'avaient pas encore été lancés quand la session s'est arrêtée) :

| Message | Cause probable | Remède |
|---|---|---|
| `Cannot find module 'expo-audio'` ou une erreur venant de `createAudioPlayer` | Le module son n'existe pas dans l'environnement de test | En haut de `launch-orb.test.tsx`, après les `import`, ajouter : `jest.mock('expo-audio', () => ({ createAudioPlayer: () => ({ play() {}, pause() {}, remove() {}, volume: 1 }) }));` |
| `expect(received).toHaveBeenCalledTimes(1)` reçoit 0 dans « always ends » | Les minuteurs simulés de Jest ne pilotent pas ceux de Reanimated | Le filet de sécurité est un `setTimeout` ordinaire : vérifier que `jest.useFakeTimers()` est bien dans `beforeEach` ; sinon remplacer `advanceTimersByTime` par `jest.runOnlyPendingTimers()` |
| `findAllByType(PulseMascot)` reçoit 0 avec `greet` vrai | Import de `PulseMascot` différent | Vérifier que le test importe `../features/mascot/PulseMascot` |
| Le test du thème clair ne trouve pas le contour blanc | `useTheme` lit le thème autrement | Ouvrir `src/hooks/use-theme.ts`, vérifier comment `isDark` est calculé, et régler `useAppStore.setState({ themeMode: 'light' })` en conséquence |
| `ORB_BEAT_LENGTH - length` trop grand | Le dessin du battement a été modifié | Mettre dans `orb-logo.ts` la longueur affichée par le test, arrondie au-dessus |

> [astuce] Pour ne relancer qu'un test : `npx jest src/__tests__/launch-orb.test.tsx -t "tapped"` (le mot après `-t` est un morceau du nom du test).

## 7.5 Étape 3 — Vérifier les types et le style du code

```powershell
npx tsc --noEmit
npx eslint src/constants/orb-logo.ts src/components/ui/OrbMark.tsx src/components/ui/PulseLogo.tsx src/features/launch src/app/_layout.tsx src/__tests__/launch-orb.test.tsx
```

**Tu dois voir** : rien (aucune ligne) pour les deux commandes.

| Erreur fréquente | Remède |
|---|---|
| `Type '"…"' is not assignable to type 'MascotSize'` | `MASCOT_BASE_SIZE` doit valoir 96 ; écrire `size={96}` dans `SplashAnimation.tsx` |
| `Property 'absoluteFill' …` dans un `StyleSheet.create` | Remplacer `...StyleSheet.absoluteFill` par `position: 'absolute', top: 0, right: 0, bottom: 0, left: 0` |
| eslint `react-hooks/exhaustive-deps` | Ajouter la valeur citée dans le tableau des dépendances du `useEffect` |
| `Cannot find name 'require'` dans `SplashAnimation.tsx` | Ajouter en haut du fichier : `declare const require: (id: string) => number;` (l'ancien fichier faisait déjà un `require` du son ; vérifier qu'il ne déclarait pas cela) |

## 7.6 Étape 4 — Regarder l'animation sur le web

1. Lance le serveur de développement :

```powershell
npx expo start --web
```

2. Le navigateur s'ouvre sur `http://localhost:8081`.
3. L'animation ne se joue qu'**au premier lancement** ou après **15 minutes** sans utiliser l'appli. Pour la rejouer : touche **F12** › onglet **Application** › **Stockage** › **Effacer les données du site**, puis **F5**.

> [danger] « Effacer les données du site » efface les données **de la version web** seulement, jamais celles du téléphone. Sur le web, refais l'onboarding ensuite.

4. **Ce que tu dois voir**, dans l'ordre : fond sombre (plus de blanc) ; l'anneau se dessine depuis la gauche ; le liquide monte en ondulant ; le battement blanc passe ; deux petits battements et une onde cyan ; « JUNIX » blanc et « PULSE » cyan montent ; Pulse apparaît à la place de l'orbe et fait coucou ; fondu sur l'appli.
5. Teste **un toucher** pendant l'animation : elle doit s'arrêter et l'appli s'ouvrir.
6. Ferme le serveur : **Ctrl + C** dans PowerShell.

| Ce que tu vois | Cause | Remède |
|---|---|---|
| L'anneau se dessine depuis la droite | La rotation n'est pas appliquée sur le web | Dans `OrbMark.tsx`, remplacer `transform="rotate(180)"` par `rotation={180}` |
| Le dégradé de l'anneau est inversé (cyan en bas) | Le dégradé tourne avec l'anneau | Garder `x1="1" y1="0" x2="0" y2="1"` **avec** la rotation ; si tu enlèves l'une, enlève l'autre |
| Le liquide ne bouge pas | `d` animé non pris en charge sur le web | Normal sur certains navigateurs : vérifier sur le téléphone, c'est lui qui compte |
| Pulse est décalé de quelques pixels | Les proportions de la mascotte | Ajuster `MASCOT_SHIFT.y` dans `SplashAnimation.tsx` (par pas de 2) |
| Pulse n'apparaît pas | Mascotte désactivée, ou base ouverte après 3 s | Réglages › Mascotte : Présence ; c'est le comportement voulu |

## 7.7 Étape 5 — Le compte rendu dans la fiche (concordance)

Ouvre `docs/fiches/FICHE-010-animation-lancement-orbe.md`, va tout en bas, et ajoute (en adaptant à ce qui s'est vraiment passé) :

```md
## Compte rendu d'exécution (date du jour)

- Étapes 1 à 7 appliquées à partir des blocs de cette fiche.
- Image de démarrage refabriquée : splash-icon.png transparente.
- Test final : Tests: 13 passed ; tsc et eslint sans erreur.
- Vu sur le web : (ce que tu as vu)
- Écarts corrigés : (chaque correction faite, et la fiche mise à jour en conséquence)
- Pas encore vu sur le téléphone.
```

> [attention] Si tu as corrigé un fichier pendant l'exécution, **corrige aussi le bloc correspondant dans la fiche**. Sinon, la prochaine personne qui suivra la fiche refera l'erreur.

Puis, dans `docs/fiches/INDEX.md`, ajoute la ligne :

```md
| [010](FICHE-010-animation-lancement-orbe.md) | L'animation de lancement autour de l'orbe, et le nouveau PulseLogo | 23 novembre 2026 | fait (vu sur le web, à voir sur le téléphone) |
```

## 7.8 Étape 6 — Enregistrer (commit) sans rien emporter d'autre

On liste **chaque chemin** (règle du projet). Les fichiers nouveaux doivent d'abord être « annoncés » à git avec `git add -N` :

```powershell
git add -N src/constants/orb-logo.ts src/components/ui/OrbMark.tsx src/__tests__/launch-orb.test.tsx docs/fiches/FICHE-010-animation-lancement-orbe.md
```

Puis le commit, en une seule commande (dans **Git Bash** c'est plus simple pour le message sur plusieurs lignes ; dans PowerShell, un message d'une ligne suffit) :

```powershell
git commit -m "feat(launch): the launch animation around the orb, on a dark screen, and PulseLogo as the orb" -- src/constants/orb-logo.ts src/components/ui/OrbMark.tsx src/components/ui/PulseLogo.tsx src/features/launch/splash-constants.ts src/features/launch/SplashAnimation.tsx src/app/_layout.tsx app.json assets/logo/orbe-demarrage.svg assets/images/splash-icon.png src/__tests__/launch-orb.test.tsx src/__tests__/app-icons.test.ts jest.setup.js docs/fiches/FICHE-010-animation-lancement-orbe.md docs/fiches/INDEX.md
```

Vérifie :

```powershell
git status --short
git log --oneline -3
```

**Tu dois voir** : seulement `?? docs/motion/` (et `?? docs/tutoriel-suite/` si tu ne l'as pas encore enregistré), et ton commit en haut de la liste.

> [danger] Jamais `git add .` ni `git commit -a` : cela emporterait `docs/motion/`.

## 7.9 Étape 7 — Envoyer sur GitHub (push)

```powershell
git push origin master
```

Cela envoie **les trois commits** en attente (`dc6cf03`, `cda1910`, et celui de la fiche 010). Si Git demande de te connecter, une fenêtre de connexion GitHub s'ouvre : connecte-toi dans cette fenêtre.

# 8. Recette C — Fabriquer un APK sur le PC

<div class="fiche-recette"><div><b>Temps</b>25 min (1re fois) · 8 à 15 min ensuite</div><div><b>Difficulté</b>2 / 5</div><div><b>Ingrédients</b>le projet, `local.properties`</div><div><b>Ustensiles</b>Git Bash, Android SDK, NDK, CMake 4.1.2</div></div>

Le détail complet, avec le dépannage, est la fiche 003 (annexe B). Voici la recette condensée, **testée le 23 novembre 2026**.

## 8.1 Le schéma

<figure>
<svg width="660" height="150" viewBox="0 0 660 150" font-family="Segoe UI, Arial" font-size="12">
  <g fill="#fff" font-weight="700" text-anchor="middle">
    <rect x="10" y="40" width="140" height="60" rx="10" fill="#3B2A78"/><text x="80" y="66">app.json + src/</text><text x="80" y="84" font-weight="400" font-size="11">ton code</text>
    <rect x="180" y="40" width="140" height="60" rx="10" fill="#5b3fb0"/><text x="250" y="66">expo prebuild</text><text x="250" y="84" font-weight="400" font-size="11">crée android/</text>
    <rect x="350" y="40" width="140" height="60" rx="10" fill="#0E7490"/><text x="420" y="66">gradlew</text><text x="420" y="84" font-weight="400" font-size="11">compile (C++, Java, JS)</text>
    <rect x="520" y="40" width="130" height="60" rx="10" fill="#2e9e57"/><text x="585" y="66">app-release.apk</text><text x="585" y="84" font-weight="400" font-size="11">≈ 62 Mo</text>
  </g>
  <g stroke="#888" stroke-width="3" fill="#888"><line x1="150" y1="70" x2="175" y2="70"/><line x1="320" y1="70" x2="345" y2="70"/><line x1="490" y1="70" x2="515" y2="70"/></g>
  <text x="250" y="125" text-anchor="middle" fill="#B45309" font-size="11">puis recréer android/local.properties</text>
</svg>
<figcaption>Figure 5 — De ton code à l'APK.</figcaption>
</figure>

## 8.2 Les gestes

**1. Refaire le projet Android** (obligatoire quand `app.json`, les icônes ou un module natif changent) — dans PowerShell :

```powershell
cd C:\Users\simon\Desktop\Projets\junix-pulse-glowcard
npx expo prebuild --platform android --clean
```

Tu dois voir `✔ Finished prebuild`.

**2. Recréer `android/local.properties`** (le prebuild l'efface). Crée le fichier avec VS Code, contenu exact (les doubles barres sont voulues) :

```txt
sdk.dir=C\:\\Users\\simon\\AppData\\Local\\Android\\Sdk
cmake.dir=C\:\\Users\\simon\\AppData\\Local\\Android\\Sdk\\cmake\\4.1.2
```

**3. Compiler** — dans **Git Bash** (pas PowerShell), une seule commande :

```bash
cd /c/Users/simon/Desktop/Projets/junix-pulse-glowcard/android && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" CMAKE_POLICY_VERSION_MINIMUM=3.5 ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

| Morceau | Rôle |
|---|---|
| `JAVA_HOME=…jbr` | Utilise le Java livré avec Android Studio |
| `ANDROID_HOME=…` | Où est le SDK Android |
| `CMAKE_POLICY_VERSION_MINIMUM=3.5` | CMake 4 refuse un vieux réglage de `expo-sqlite` : on l'autorise |
| `assembleRelease` | Fabrique la version « release » (rapide, sans serveur de développement) |
| `-PreactNativeArchitectures=arm64-v8a` | Seulement pour les téléphones récents (64 bits) : 4 fois plus rapide |

Tu dois voir à la fin `BUILD SUCCESSFUL`.

> [attention] Ne modifie pas le code **pendant** la compilation : l'étape `createBundleReleaseJsAndAssets` emballe le code tel qu'il est à ce moment-là.

**4. Copier l'APK sur le Bureau** (Git Bash) :

```bash
cp app/build/outputs/apk/release/app-release.apk "/c/Users/simon/Desktop/junix-pulse-local-$(date +%F).apk"
```

**5. Installer** : recette A.

## 8.3 Si ça échoue

| Message | Remède |
|---|---|
| `SDK location not found` | Étape 2 oubliée (`local.properties`) |
| `ninja: error: mkdir(...): No such file or directory` | Chemins longs désactivés : voir annexe B |
| `Compatibility with CMake < 3.5 has been removed` | Oubli de `CMAKE_POLICY_VERSION_MINIMUM=3.5` |
| `JAVA_HOME is set to an invalid directory` | Vérifier que le dossier `jbr` existe |
| La compilation s'arrête sans erreur (fenêtre fermée, PC en veille) | Relancer la même commande : Gradle reprend là où il en était |
| Quota Expo (EAS) épuisé | C'est pourquoi on compile sur le PC ; le quota gratuit revient le 1er décembre 2026 |
