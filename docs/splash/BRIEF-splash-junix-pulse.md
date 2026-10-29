# Brief : animation de lancement Junix Pulse

## Mission
Implémenter dans l'app Expo / React Native l'animation de lancement (4 s max) **identique** à la référence `docs/splash/junix-pulse-splash-reference.html`, avec le son `junix-pulse-launch-sound.wav`. Ensuite l'app charge directement l'accueil.

## Fichiers fournis (à placer dans `docs/splash/` du projet)
1. `junix-pulse-splash-reference.html` : source de vérité (ouvrir dans un navigateur, toucher l'écran pour rejouer avec le son). Les `@keyframes` et les délais CSS donnent les timings exacts.
2. `splash-icon.png` : le logo réel, 1024x1024, fond transparent. À utiliser tel quel, ne pas le redessiner.
3. `junix-pulse-launch-sound.wav` : son de 4 s, calé sur l'animation.

## Règle d'or
Fidélité à 100 % : mêmes couleurs (violet `#8B3DF0` vers cyan `#0AE8F0`, texte `#1A1040`), même fond **blanc `#FFFFFF`**, même couche de **verre liquide / glassmorphism** (le design du projet repose dessus), mêmes timings, même ordre.

## Timeline (secondes)
| Temps | Élément |
|---|---|
| 0 à 0,95 | Trois orbes de couleur (violet, cyan) apparaissent et dérivent doucement jusqu'à la fin. Une carte de verre liquide se forme comme une goutte (scale 0,45 vers 1 avec léger rebond, rayon 50 % vers 12 %), floutage d'arrière-plan fort |
| 0,1 à 1,4 | Le logo entre (scale 0,9 vers 1, opacité 0 vers 1) |
| 0,15 à 1,4 | L'anneau dégradé se trace, de l'ouverture à gauche, dans le sens horaire |
| 0,95 à 2,0 | Balayage gauche vers droite (bord adouci) qui révèle la pulsation et le « P », limité à l'intérieur de l'anneau (cercle r = 212, centre 514/447 sur 1024) |
| 2,0 à 3,0 | Double battement : symbole à 1,05 puis 1,035, 2 ondes dégradées (scale 1 vers 1,55, opacité 0,55 vers 0). La carte de verre bat aussi (scale 1,03 puis 1,02) avec une lueur violet-cyan, et un reflet lumineux la traverse en diagonale (2 à 2,85) |
| 2,35 à 3,15 | « JUNIX PULSE » : balayage gauche vers droite + montée de 26 px vers sa place |
| 3,5 à 4,0 | Fondu de sortie (opacité 1 vers 0, scale 1 vers 1,04), puis navigation vers l'accueil |

Technique conseillée : `react-native-svg` (`Image`, `Mask`, `ClipPath`, `Circle` avec `strokeDasharray` et `strokeDashoffset`) animé avec `react-native-reanimated`. Alternative acceptée : `@shopify/react-native-skia`. Le masque doit révéler l'image PNG, pas une copie redessinée.

## Verre liquide / glassmorphism (obligatoire)
- **Réutiliser** les composants, tokens et styles de verre déjà présents dans le projet (blur, opacité, bordure, ombres) pour rester cohérent avec le design system. N'en créer un nouveau que s'il n'en existe aucun.
- Carte : largeur ~87 % de l'écran, hauteur ~45 %, centrée un peu au-dessus du milieu, fond blanc translucide en dégradé (62 % vers 22 %), bordure blanche fine (80 %), reflet lumineux en haut à gauche, ombre violette douce, léger liseré cyan intérieur.
- Technique : `expo-blur` (`BlurView`, intensité ~60, teinte claire). Sur iOS 26 avec un SDK compatible, `expo-glass-effect` est acceptable si le rendu reste fidèle. Orbes : `react-native-svg` (`RadialGradient`) ou `expo-linear-gradient`, animés avec Reanimated.
- **Replis obligatoires** : sur Android d'entrée de gamme ou si le flou n'est pas supporté, carte blanche à ~82 % d'opacité sans flou. Si « Réduire la transparence » est activé (iOS), même repli opaque.
- Le verre est un décor : il ne doit jamais masquer le logo ni faire dépasser les 4 s.

## Son
- Jouer `junix-pulse-launch-sound.wav` au démarrage de l'animation, volume 0,6 par défaut (`expo-audio`, ou `expo-av` si le SDK est ancien).
- Ne jamais bloquer l'animation si le son échoue (try/catch, silence).
- Respecter le mode silencieux sur iOS.
- Décharger le son à la fin.

## Cas à gérer (obligatoire)
1. **Splash natif** : `expo-splash-screen`, fond `#FFFFFF` en mode clair **et** sombre, même logo, même position que le départ de l'animation, pour qu'il n'y ait aucun saut visuel. Garder le splash natif avec `preventAutoHideAsync()` jusqu'à ce que les assets (logo, son) soient chargés, puis le masquer.
2. **Mode sombre** : le splash reste blanc dans tous les cas (le texte du logo est bleu nuit). L'accueil suit ensuite le thème de l'app.
3. **Responsive** : tout dimensionné d'après `Math.min(width, height)` (`useWindowDimensions`), logo centré, environ 60 % de la largeur sur téléphone, plafonné sur tablette. Gérer petits écrans, grands écrans, pliables.
4. **Orientation** : paysage et tablette, le logo reste entier et centré. La carte de verre garde ses proportions et ne dépasse jamais de l'écran.
5. **Safe areas** : encoches, barre de statut et barre de navigation Android ne doivent rien couper (`react-native-safe-area-context`).
6. **Mouvement réduit** : si `AccessibilityInfo.isReduceMotionEnabled()` est vrai, afficher le logo fixe 0,8 s avec fondu simple, sans battement ni ondes.
7. **Démarrage à froid uniquement** : pas de rejeu quand l'app revient d'arrière-plan ni au rechargement à chaud.
8. **Durée maximale garantie** : timeout de sécurité à 4,2 s qui force la navigation vers l'accueil, même si l'animation ou le chargement a un problème.
9. **Performance** : animations sur le thread UI (worklets Reanimated), pas de re-render React pendant l'animation, testé sur Android d'entrée de gamme.
10. **Android** : retour matériel désactivé pendant le splash, compatible avec l'API Splash Screen d'Android 12+.
11. **Accessibilité** : `accessibilityLabel="Junix Pulse"` sur le logo.
12. **Erreurs** : si une image ou un son ne charge pas, passer directement à l'accueil sans crash.

## Nettoyage demandé
Supprimer l'ancien code de chargement ou d'écran d'attente, et faire en sorte que, après le splash, la navigation mène **directement** à l'écran d'accueil (`router.replace` ou équivalent). L'initialisation (base de données, stores) se fait pendant l'animation, pas après.

## Livrables attendus
- Un composant `SplashAnimation` isolé dans son propre dossier (ex. `src/features/launch/`).
- Les paramètres de timing dans un seul fichier de constantes.
- Un court récapitulatif des fichiers modifiés et supprimés.
- Pas de logique ajoutée en dehors de ce qui est demandé.

## Vérification finale
Lancer l'app avec `npx expo start`, comparer côte à côte avec la référence HTML, et lister les écarts éventuels.
