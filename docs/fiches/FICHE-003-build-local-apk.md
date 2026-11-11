# FICHE OPÉRATOIRE N° 003 — Construire l'APK sur l'ordinateur (sans Expo)

Projet : **Junix Pulse** · Date : 11 novembre 2026 · Suite de : [FICHE 002](FICHE-002-commit-push-build.md) (le build Expo était bloqué par le quota mensuel)

---

> **État au 11 novembre 2026 : réussi.** L'APK a été fabriqué en 20 min 37 s avec les étapes 1, 2, 2 a, 2 b et 2 c telles qu'écrites ci-dessous. Le compte rendu en bas garde l'historique des essais ratés.

## 1. Objectif

Fabriquer **sur ce PC** le fichier d'installation Android (APK) de Junix Pulse, sans passer par les serveurs d'Expo, puis l'installer sur le téléphone de test.

À la fin, un fichier `junix-pulse-local-2026-11-11.apk` est sur le **Bureau**, et l'application installée à partir de lui s'ouvre sur le téléphone.

## 2. État de départ

| À vérifier | Comment | Résultat attendu |
|---|---|---|
| Le code est enregistré | `git log --oneline -1` (dossier du projet) | `fe0d9f2 feat(backup): a card for the automatic backup…` ou plus récent |
| Le SDK Android est là | Explorateur › `%LOCALAPPDATA%\Android\Sdk` | Les dossiers `platforms`, `build-tools`, `ndk`, `cmake`, `platform-tools` |
| Le Java d'Android Studio est là | `"C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version` | `openjdk version "21…"` |
| Espace disque | Explorateur › Ce PC | Au moins **10 Go** libres (la première fabrication télécharge et compile beaucoup) |

## 3. Matériel

| Outil | Preuve | Sinon |
|---|---|---|
| Android Studio (fournit Java 21 et le SDK) | Le dossier `C:\Program Files\Android\Android Studio` existe | Installer Android Studio depuis developer.android.com, l'ouvrir une fois (il installe le SDK) |
| Node.js et les dépendances du projet | `node --version`, dossier `node_modules` présent | `npm install` |
| Câble USB (pour copier l'APK) | — | Ou envoyer l'APK au téléphone par Google Drive / e-mail |

## 4. Hypothèses

- Windows 11, terminal **Git Bash** (les commandes PowerShell sont données aussi).
- Le Java installé dans le système (version 24) est **trop récent** pour l'outil de fabrication ; on utilise donc celui d'Android Studio (version 21) en le désignant avec la variable `JAVA_HOME`.
- Le SDK est dans `C:\Users\simon\AppData\Local\Android\Sdk`, désigné avec la variable `ANDROID_HOME`.
- L'APK est signé avec la **clé de test** générée par Expo (`debug.keystore`), pas avec la clé des builds Expo.

## 5. Carte de l'intervention

| Fichier / dossier | Action | Raison |
|---|---|---|
| `android/` (dossier entier) | **supprimé puis recréé** par `expo prebuild` | Il datait du 2 novembre, avant le widget, l'agenda et la dictée ; il est ignoré par Git (`.gitignore`, ligne `/android`) |
| `android/app/build/outputs/apk/release/app-release.apk` | créé | Le fichier fabriqué |
| `C:\Users\simon\Desktop\junix-pulse-local-2026-11-11.apk` | créé | Copie facile à trouver, hors du projet |

Aucun fichier suivi par Git n'est modifié.

## 6. Sauvegarde

1. **Le code** : déjà enregistré sur GitHub (commit `fe0d9f2`). Le dossier `android/` est entièrement régénérable : rien à sauvegarder.
2. **Les données du téléphone de test** : dans Junix Pulse sur le téléphone, Paramètres › Sauvegarde et données › **Sauvegarder les données**, choisissez un mot de passe, et rangez le fichier sur Google Drive.

> ⚠ **Point de non-retour** (étape 5) : la clé de cet APK est différente de celle des APK Expo. Android refuse de l'installer par-dessus : il faut **désinstaller** l'application, ce qui **efface toutes ses données** sur le téléphone (tâches, rappels, personnes, réglages). Seule la sauvegarde de l'étape 6.2 permet de les retrouver.

## 7. Étapes

### Étape 1 — Régénérer le dossier Android

- **Où** : terminal, dossier `C:\Users\simon\Desktop\Projets\junix-pulse-glowcard`.

```bash
npx expo prebuild --platform android --clean
```

| Morceau | Sens |
|---|---|
| `npx expo prebuild` | Fabrique le projet Android natif à partir de `app.json` et des modules installés |
| `--platform android` | Seulement Android (pas iPhone) |
| `--clean` | Supprime l'ancien dossier `android/` avant de le recréer, pour repartir de la configuration actuelle |

- **Pourquoi** : le widget, l'accès à l'agenda, la dictée et les autres modules ajoutent leurs réglages dans ce dossier ; l'ancien ne les avait pas.
- **Contrôle** : la sortie se termine par `✔ Finished prebuild`, et le fichier `android/app/src/main/AndroidManifest.xml` contient `.widget.Today` (le widget) et `android.permission.READ_CALENDAR` (l'agenda).
- **Si ça rate** : `git working tree is dirty` → la commande demande confirmation quand des fichiers ne sont pas commités ; répondez `y` (le dossier `android/` n'est pas suivi par Git).

### Étape 2 — Autoriser les chemins longs dans Windows (vous, en administrateur)

> Réglage **système** : à faire vous-même. Il permet aux programmes compatibles d'utiliser des chemins de plus de 260 caractères. Il ne supprime rien et s'annule en remettant la valeur à 0.

- **Où** : menu Démarrer › tapez `PowerShell` › clic droit sur **Windows PowerShell** › **Exécuter en tant qu'administrateur** › Oui.
- **Geste** : collez la commande puis Entrée.

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

| Morceau | Sens |
|---|---|
| `New-ItemProperty` | Crée (ou remplace avec `-Force`) une valeur dans le Registre, la base des réglages de Windows |
| `-Path "HKLM:\…\FileSystem"` | L'emplacement des réglages du système de fichiers |
| `-Name "LongPathsEnabled" -Value 1` | Le réglage « chemins longs », mis à 1 (activé) |
| `-PropertyType DWORD` | Le type de valeur : un nombre entier |

- **Puis** : **redémarrez le PC** (le réglage n'est lu qu'au démarrage des programmes).
- **Contrôle** (PowerShell normal, après redémarrage) : `(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem").LongPathsEnabled` affiche `1`.
- **Annuler** : la même commande avec `-Value 0`, puis redémarrer.
- **Si ça rate** : `Accès refusé` → PowerShell n'a pas été ouvert « en tant qu'administrateur ».

### Étape 2 a — Utiliser CMake 4.1.2 (et son ninja récent)

- **Pourquoi** : le code natif est compilé par **CMake**, qui confie le travail à **ninja**. Le ninja fourni avec CMake 3.22.1 (version 1.10.2) ignore le réglage de l'étape 2 ; celui de CMake 4.1.2 (version 1.12.1, déjà installé dans le SDK) le respecte.
- **Où** : VS Code › dossier `android` › fichier `local.properties` (créez-le s'il n'existe pas : clic droit sur `android` › Nouveau fichier › `local.properties`).
- **Code** (fichier entier) :

```properties
sdk.dir=C\:\\Users\\simon\\AppData\\Local\\Android\\Sdk
cmake.dir=C\:\\Users\\simon\\AppData\\Local\\Android\\Sdk\\cmake\\4.1.2
```

| Ligne | Sens |
|---|---|
| `sdk.dir=…` | Où se trouve le SDK Android ; dans ce format, `:` et `\` s'écrivent `\:` et `\\` |
| `cmake.dir=…` | Le CMake à utiliser pour **tous** les modules : la version 4.1.2 |

- **Contrôle** : `$LOCALAPPDATA/Android/Sdk/cmake/4.1.2/bin/ninja.exe --version` affiche `1.12.1`.
- **Attention** : `npx expo prebuild --clean` recrée le dossier `android` et efface ce fichier : refaites cette étape après chaque prebuild.

### Étape 2 b — Effacer les restes d'une fabrication ratée (seulement après un échec)

- **Où** : terminal, dossier du projet.

```bash
rm -rf node_modules/expo-sqlite/android/.cxx node_modules/react-native-nitro-modules/android/.cxx node_modules/react-native-screens/android/.cxx node_modules/react-native-worklets/android/.cxx
```

| Morceau | Sens |
|---|---|
| `rm -rf` | Supprime les dossiers et tout leur contenu, sans demander |
| `…/android/.cxx` | Les dossiers de compilation du code natif (C++) ; ils retiennent les réglages de l'essai raté et sont recréés automatiquement |

- **Contrôle** : `find node_modules -maxdepth 4 -type d -name ".cxx"` n'affiche plus rien.

### Étape 2 c — Fabriquer l'APK

- **Où** : terminal, dans le sous-dossier `android` du projet (le chemin normal).

Git Bash :

```bash
cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" CMAKE_POLICY_VERSION_MINIMUM=3.5 ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

PowerShell (même chose) :

```powershell
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:CMAKE_POLICY_VERSION_MINIMUM = "3.5"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```

| Morceau | Sens |
|---|---|
| `cd android` | Entre dans le projet Android natif |
| `JAVA_HOME="…"` | Le Java d'Android Studio (version 21) ; celui du système (24) est trop récent pour Gradle |
| `ANDROID_HOME="…"` | Où se trouve le SDK Android |
| `CMAKE_POLICY_VERSION_MINIMUM=3.5` | CMake 4 refuse les modules qui annoncent une version de CMake plus ancienne que 3.5 (c'est le cas d'`expo-sqlite`) ; ce réglage lui demande de les accepter en appliquant les règles de la version 3.5 |
| `./gradlew` (ou `.\gradlew.bat`) | Lance **Gradle**, l'outil qui fabrique l'application |
| `assembleRelease` | La version « release » : optimisée et autonome |
| `-PreactNativeArchitectures=arm64-v8a` | Seulement les processeurs `arm64` des téléphones récents : deux fois plus rapide |

- **Durée** : 15 à 40 minutes la première fois.
- **Contrôle** : `BUILD SUCCESSFUL in …`, et le fichier `android/app/build/outputs/apk/release/app-release.apk` existe.

### Étape 3 — Copier l'APK sur le Bureau

- **Où** : terminal, toujours dans `android`.

```bash
cp app/build/outputs/apk/release/app-release.apk "/c/Users/simon/Desktop/junix-pulse-local-2026-11-11.apk"
```

PowerShell :

```powershell
Copy-Item app\build\outputs\apk\release\app-release.apk "$env:USERPROFILE\Desktop\junix-pulse-local-2026-11-11.apk"
```

- **Contrôle** : le fichier apparaît sur le Bureau, d'une taille d'environ 60 à 120 Mo.

### Étape 4 — Sauvegarder les données du téléphone

- **Où** : sur le téléphone de test, dans Junix Pulse.
- **Geste** : Paramètres › Sauvegarde et données › **Sauvegarder les données** › mot de passe (deux fois) › choisissez Google Drive.
- **Contrôle** : le fichier `.json` apparaît dans Google Drive.
- **Si ça rate** : pas de données à garder sur ce téléphone de test → étape facultative.

### Étape 5 — Désinstaller l'ancienne application

> ⚠ **Point de non-retour** : efface les données de Junix Pulse sur ce téléphone.

- **Geste** : appui long sur l'icône Junix Pulse › **Désinstaller** › OK.

### Étape 6 — Installer l'APK

- **Geste (câble)** : branchez le téléphone au PC, choisissez « Transfert de fichiers » sur le téléphone, copiez le fichier du Bureau dans le dossier `Download` du téléphone ; sur le téléphone, ouvrez **Fichiers** › Téléchargements › touchez le fichier › **Installer** (autorisez l'installation depuis cette source si Android le demande).
- **Geste (sans câble)** : déposez le fichier dans Google Drive depuis le PC, ouvrez-le sur le téléphone, **Installer**.
- **Contrôle** : Junix Pulse s'ouvre ; restaurez la sauvegarde de l'étape 4 dans Paramètres › Sauvegarde et données › Restaurer.

## 8. Test final

1. L'application s'ouvre jusqu'à l'accueil.
2. Paramètres › Sauvegarde et données montre la nouvelle carte « Sauvegarde automatique » (fiche 001).
3. La capture rapide montre le micro (correction de la fiche des stats).

## 9. Dépannage

| Message | Cause | Remède |
|---|---|---|
| `Unsupported class file major version 68` ou erreur Java au démarrage de Gradle | Gradle tourne avec le Java 24 du système | Vérifiez la variable `JAVA_HOME` de l'étape 2 (elle doit pointer vers `Android Studio\jbr`) |
| `SDK location not found` | Gradle ne trouve pas le SDK | Vérifiez `ANDROID_HOME`, ou créez `android/local.properties` avec la ligne `sdk.dir=C\:\\Users\\simon\\AppData\\Local\\Android\\Sdk` |
| `ninja: error: mkdir(CMakeFiles/…): No such file or directory` ou `Filename longer than 260 characters` | Windows limite les chemins à 260 caractères | Faites l'étape 2 (lecteur `J:`) et lancez la fabrication depuis `J:\android` |
| `Failed to install the following SDK components` | Une pièce du SDK manque et sa licence n'est pas acceptée | Ouvrez Android Studio › SDK Manager, installez la pièce indiquée |
| `Compatibility with CMake < 3.5 has been removed from CMake.` | CMake 4 refuse un module qui annonce une très vieille version minimale | Ajoutez `CMAKE_POLICY_VERSION_MINIMUM=3.5` à la commande de l'étape 2 c (c'est déjà dans la commande donnée) |
| Sur le téléphone : « Application non installée » | L'ancienne version (clé Expo) est encore là | Désinstallez-la (étape 5) |
| `BUILD FAILED` avec `OutOfMemoryError` | Pas assez de mémoire pour Gradle | Fermez les autres logiciels et relancez |

## 10. Lexique

- **APK** : le fichier d'installation d'une application Android.
- **Prebuild** : la génération du projet Android natif à partir de la configuration Expo.
- **Gradle** : l'outil qui compile et assemble une application Android.
- **Release** : la version finale, optimisée, qui contient tout le code ; par opposition à « debug », qui a besoin de l'ordinateur pour fonctionner.
- **JDK / Java** : le langage et les outils sur lesquels Gradle tourne.
- **SDK Android** : les outils et bibliothèques de Google pour fabriquer des applications Android.
- **Clé de signature (keystore)** : la « signature » d'une application ; Android n'accepte une mise à jour que si elle porte la même signature que l'application installée.

## 11. Et après

1. **Garder la même clé que les builds Expo** (pour ne plus avoir à désinstaller) : télécharger la clé depuis Expo avec `npx eas-cli credentials -p android` (menu interactif › Keystore › Download), puis configurer `android/app/build.gradle` pour l'utiliser. À faire dans une fiche dédiée, car la clé et ses mots de passe sont secrets et ne doivent jamais entrer dans Git.
2. **Revenir aux builds Expo** à partir du 1er décembre 2026 : [fiche 002](FICHE-002-commit-push-build.md), étape 5. Attention : passer d'un APK local à un APK Expo demandera à nouveau de désinstaller (clé différente).
3. **Prochaine fois en local** : seules les étapes 2 et 3 sont à refaire (l'étape 1 seulement si un module ou `app.json` a changé), et la mise à jour s'installe **par-dessus** l'APK local précédent sans désinstaller.

## Compte rendu d'exécution (11 novembre 2026)

| Essai | Résultat | Cause |
|---|---|---|
| Étape 1, `expo prebuild --clean` | Réussi | — |
| Fabrication depuis `C:\Users\simon\Desktop\Projets\junix-pulse-glowcard\android` | **Échec** après 17 min | `ninja: error: mkdir(…)` : chemin de plus de 260 caractères (module `react-native-worklets`) |
| Lecteur `J:` sur le dossier du projet (`subst`), fabrication depuis `J:\android` | **Échec** après 1 min | L'outil d'autoliaison d'Expo cherche `package.json` en remontant les dossiers mais ne regarde jamais la racine d'un lecteur : `Couldn't find "package.json" up from path "J:\android"` |
| Jonction `C:\jp` vers le projet | Abandonné | Node remplace la jonction par le vrai chemin long : aucun gain |
| Calcul des chemins les plus longs | — | Même avec un lecteur sur le dossier parent (`J:\junix-pulse-glowcard`), le chemin le plus long estimé reste vers 340 caractères (module `react-native-gesture-handler`) |
| Chemins longs activés (étape 2, puis redémarrage) + CMake 4.1.2 (étape 2 a), fabrication depuis le chemin normal | **Échec** après 2 min, mais le problème de chemin est réglé | CMake 4 refuse `expo-sqlite` : `Compatibility with CMake < 3.5 has been removed from CMake.` |
| Même chose + `CMAKE_POLICY_VERSION_MINIMUM=3.5` (étape 2 c actuelle) | **Réussi** : `BUILD SUCCESSFUL in 20m 37s` | — |
| Étape 3, copie sur le Bureau | Réussi | `C:\Users\simon\Desktop\junix-pulse-local-2026-11-11.apk`, 61 673 036 octets (59 Mo), `com.junix.pulse` version 1.1.0, processeurs arm64 uniquement |

**Nettoyage** : la jonction `C:\jp` a été retirée par l'utilisateur avec `cmd /c rmdir C:\jp` (vérifié : elle n'existe plus, le projet est intact). Pour mémoire : Cette commande retire **seulement le raccourci**, jamais le projet. ⚠ N'utilisez pas `Remove-Item -Recurse` ni `rm -rf` sur `C:\jp` : ils pourraient suivre le raccourci et effacer le vrai projet.

**Pistes restantes**, de la plus sûre à la plus longue :
1. Attendre le 1er décembre 2026 et reprendre la [fiche 002](FICHE-002-commit-push-build.md), étape 5 (build Expo, même clé, pas de désinstallation).
2. Activer les chemins longs de Windows (réglage système, à faire soi-même en administrateur, puis redémarrer) : PowerShell administrateur › `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`. Puis relancer l'étape 2 bis depuis le chemin normal. Sans garantie : l'outil `ninja` fourni avec CMake 3.22.1 peut ignorer ce réglage.
3. Fabriquer dans WSL (Linux sous Windows), où la limite de 260 caractères n'existe pas : installation lourde (Ubuntu, Node, Java, SDK Android), à décrire dans une fiche dédiée.
