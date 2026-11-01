# Brief : fond ambiant animé Junix Pulse (Ambient Gradient Blobs)

## Mission
Intégrer dans l'app Expo / React Native un fond ambiant animé de halos de couleur flous, **identique en esprit et en paramètres** à `docs/ambient/junix-pulse-ambient-reference.html`, adapté aux thèmes clair et sombre, sans rien casser.

## Fichiers à lire (dans `docs/ambient/`)
1. `MISSION-ambient-gradient-blobs.md` : le cahier des charges général (analyse, performance, accessibilité, tests, compte rendu). Il reste valable en entier.
2. **Ce brief** : paramètres propres à Junix Pulse. En cas de conflit sur un détail, **ce brief prime**.
3. `junix-pulse-ambient-reference.html` : simulation de référence. Ouvre-la dans un navigateur, bascule clair/sombre, active « Animations réduites » et « App en arrière-plan » pour voir les comportements attendus.

## Étape 0 : audit obligatoire AVANT de coder
Lis et résume, sans rien modifier : `package.json` (SDK Expo, `react-native-reanimated`, `react-native-svg`, `expo-blur`, `expo-linear-gradient`), la navigation (layout racine, options d'écran, couleurs de fond), le système de thème (tokens, clair/sombre, préférence utilisateur), les composants de verre existants, et la structure des dossiers. Puis **présente un plan court et attends mon accord** avant d'écrire le code.

## Paramètres visuels (valeurs de la simulation)
Base : clair `#F7F6FD`, sombre `#0A0916`. Si le projet a déjà des tokens de fond, les utiliser, en gardant la palette violet → cyan du logo.

| Halo | Couleur clair / sombre | Taille (% largeur écran) | Position centre (x, y) | Mouvement max (% de sa taille) | Durée d'un cycle | Opacité clair / sombre |
|---|---|---|---|---|---|---|
| 1 violet | `#A78BFA` / `#8B3DF0` | 78 % | 18 %, 20 % | x ±14, y ±14, scale 0,94 à 1,12 | 24 s | 0,50 / 0,62 |
| 2 cyan | `#67E8F9` / `#0AE8F0` | 68 % | 86 %, 36 % | x ±12, y ±12, scale 0,92 à 1,10 | 28 s | 0,45 / 0,50 |
| 3 bleu | `#93A8FB` / `#5E7BF2` | 64 % | 28 %, 76 % | x ±12, y ±10, scale 0,95 à 1,10 | 32 s | 0,40 / 0,48 |
| 4 violet doux | `#C4B5FD` / `#6D28D9` | 50 % | 84 %, 90 % | x ±14, y ±12, scale jusqu'à 1,15 | 20 s | 0,35 / 0,45 |

- Chaque halo est un **dégradé radial** : couleur pleine au centre, ~45 % à 38 % du rayon, transparent à 68 %. Le dégradé est déjà doux : **aucun filtre de flou** n'est appliqué sur les halos.
- Les cycles ont des durées différentes et des **décalages de départ** (0, -9, -17, -5 s) pour que le mouvement ne se répète jamais à l'identique.
- Easing doux et symétrique (sinus). Aucun mouvement brusque, aucun clignotement.
- Passage clair ↔ sombre : fondu des couleurs et opacités en ~600 ms, **sans redémarrer ni sauter** l'animation.

## Technique conseillée
- Composant unique `AmbientBackground`, dans le dossier partagé du projet, `StyleSheet.absoluteFill`, `pointerEvents="none"`, derrière tout le contenu, `accessibilityElementsHidden` et `importantForAccessibility="no-hide-descendants"`.
- Chaque halo = une petite `Svg` statique (un `Circle` avec `RadialGradient`) dans une `Animated.View` animée par **Reanimated** : `translateX`, `translateY`, `scale` sur le thread UI (`withRepeat`, `withSequence`, `withTiming`, `Easing.inOut(Easing.sin)`). Pas de mise à jour d'état par image, pas de re-rendu de la `Svg`.
- Alternative acceptée si plus légère : 4 petites images PNG pré-rendues par thème, mais seulement si leur poids total reste faible (quelques Ko chacune).
- **Monter le composant une seule fois**, au niveau du layout racine, pour que l'animation ne redémarre pas à chaque navigation. Les écrans qui ont besoin d'un fond opaque (connexion, modales, lecture dense) le gardent explicitement.
- Paramètres centralisés dans un seul fichier de constantes (tableau ci-dessus, nombre de halos, durées, amplitudes).

## Contraintes spécifiques au projet
1. **Verre liquide existant** : les cartes en verre du projet passent **au-dessus** du fond. Vérifier que le flou (`BlurView`) sur un fond animé reste fluide, surtout sur Android : si le rythme chute, réduire à 2 ou 3 halos ou passer les cartes en translucide sans flou sur Android. Ne pas modifier le style des cartes.
2. **Espace et poids** : aucune grande image, aucune nouvelle dépendance lourde. Réutiliser `react-native-svg` et `react-native-reanimated` s'ils sont déjà installés. Annoncer le poids ajouté à la fin.
3. **Existant intact** : pas de refactor hors sujet, aucun écran déplacé ni redimensionné. Si un conflit apparaît, le signaler.
4. **Architecture et langue** : respecter les conventions trouvées (Feature First, MVVM, Repository, Service Layer selon le projet). Code et commentaires en anglais, TypeScript strict, pas de `any`.
5. **Cohérence avec le lancement** : l'écran de lancement utilise les mêmes couleurs de halos. Au passage vers l'accueil, faire apparaître le fond ambiant en fondu (~600 ms) au lieu de le faire surgir.
6. **Écrans ciblés** : lister les écrans où le fond apporte de la valeur (accueil, onglets principaux) et ceux à garder sobres (connexion, formulaires longs, listes denses, modales). Demander mon accord sur cette liste dans le plan.

## Comportements obligatoires
- **App en arrière-plan** (`AppState`) ou **écran non visible** : suspendre l'animation, et la reprendre depuis la position courante, sans saut.
- **Mouvement réduit** (`useReducedMotion` de Reanimated ou `AccessibilityInfo`) : fond **statique**, halos placés à leur position de départ.
- **Appareil d'entrée de gamme** : nombre de halos réduit (2) ou fond statique, via une constante, sans casser le reste.
- **Lisibilité** : en mode clair comme en mode sombre, le contraste du texte et des icônes doit rester suffisant. Si un halo gêne un texte, réduire son opacité plutôt que de modifier l'écran.
- **Zones de sécurité, orientation, petits et grands écrans** : le fond couvre tout l'écran, derrière la barre de statut et la barre de navigation, sans créer de défilement ni de hauteur artificielle.
- **Aucune interception** de clics, gestes, clavier ou défilement.
- **Nettoyage** : annuler les animations au démontage, aucune animation dupliquée.

## Tests à exécuter et à rapporter honnêtement
Mode clair et sombre, changement de thème en direct, formulaires et boutons, listes longues, modales et notifications, rotation, retour de l'arrière-plan, mouvement réduit, erreurs de compilation et de lint, tests existants. Indiquer clairement ce qui a été **réellement exécuté** et ce que je dois vérifier moi-même sur un vrai téléphone (fluidité, batterie, chauffe).

## Git
Vérifie l'état du dépôt avant de commencer et préserve mes changements en cours. **Aucun commit, push ou déploiement sans mon autorisation explicite.** Tu peux me proposer un nom de branche.

## Livrables
1. Le plan validé (étape 0).
2. Le composant, le fichier de constantes, l'intégration au layout racine.
3. Un récapitulatif : fichiers créés, modifiés, supprimés, poids ajouté, tests exécutés, limites restantes, et comment **régler ou désactiver** l'effet (une constante unique).
