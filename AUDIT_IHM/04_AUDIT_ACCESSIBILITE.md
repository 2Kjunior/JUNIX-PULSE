# Audit accessibilité

Référentiel : WCAG 2.2 AA lorsque transposable à React Native, bonnes pratiques d'accessibilité mobile et ISO 9241-11. Il s'agit d'un audit statique complété par des calculs de contraste ; aucune certification ne peut être délivrée sans essais VoiceOver/TalkBack et appareils réels.

## Résumé

La base est prometteuse : le `Button` partagé cible une hauteur minimale de 46, les boutons de navigation principaux fournissent rôle/nom/état, `AnimatedPressable` respecte le mouvement réduit et `PulseLogo` interroge la préférence système. Les écarts couvrent principalement le contraste des onglets, les libellés des champs, le nommage de boutons custom et une prise en charge incomplète du mouvement réduit.

## Contraste (WCAG 1.4.3 / 1.4.11)

Calculs de contraste à partir des tokens actuels :

| Élément | Association | Ratio mesuré | Attendu | Évaluation |
|---|---|---:|---:|---|
| Onglet inactif sombre | `#6B6572` sur `#211F23` | 2,90:1 | 4,5:1 pour texte 10 px ; 3:1 pour contrôle | insuffisant |
| Onglet inactif clair | `#A8A29E` sur `#F2EDE8` | 2,17:1 | 4,5:1 pour texte 10 px ; 3:1 pour contrôle | insuffisant |
| Texte principal sombre | `#E6E1E7` sur `#141317` | 14,35:1 | 4,5:1 | conforme |
| Texte secondaire sombre | `#CAC4D0` sur `#141317` | 10,85:1 | 4,5:1 | conforme |
| Texte principal clair | `#1C1917` sur `#FBF7F2` | 16,40:1 | 4,5:1 | conforme |
| Texte secondaire clair | `#57534E` sur `#FBF7F2` | 7,15:1 | 4,5:1 | conforme |

Source : `src/constants/palettes.ts:143-147` et `:240-244`, `src/app/(tabs)/_layout.tsx:149` et `:324`. La palette elle-même indique que `onSurface.disabled` est « décoratif uniquement » ; son emploi pour un onglet disponible est donc sémantiquement inadapté.

**Correction attendue :** définir un token `onSurface.inactive` conforme dans chaque thème, l'appliquer à l'icône et au label d'onglet, puis vérifier au minimum les ratios sur la surface effective de la barre.

## Noms, rôles et états (WCAG 4.1.2)

### Points positifs

- La barre d'onglets donne un `accessibilityRole="button"`, un nom et `selected` (`src/app/(tabs)/_layout.tsx:115-127`).
- Le bouton flottant et les actions de liste majeures possèdent des noms accessibles.
- `AnimatedPressable` transmet rôle, nom, état désactivé et cible tactile configurée.

### Écarts confirmés

- Les actions de snooze, le fond de sa feuille et le bouton iOS de confirmation ne définissent pas explicitement de rôle/nom (`components/reminders/ReminderSnoozeSheet.tsx:47-140`).
- Le calendrier comporte plusieurs zones tactiles actionnables sans nom/rôle explicite, notamment créneau libre, fermeture et choix de type (`components/calendar/CalendarTimetable.tsx:325-446`).
- Les champs titre et notes des formulaires principaux ne possèdent ni libellé visible persistant ni `accessibilityLabel` (références dans `02_PARCOURS_FONCTIONNELS.md`).

**Remarque de méthode :** le dépôt contient 421 occurrences de `TouchableOpacity`. Une recherche textuelle ne prouve pas que les 421 soient fautives — beaucoup peuvent être nommées plus loin dans la balise ou par leur contenu. Les exemples ci-dessus ont été revus manuellement et sont ceux à corriger/tester d'abord.

## Mouvement (WCAG 2.3.3 et préférences plateforme)

- `AnimatedPressable` utilise `useReducedMotion` : bonne pratique.
- `PulseLogo` consulte `AccessibilityInfo.isReduceMotionEnabled()` : bonne pratique pour l'animation de marque.
- La barre d'onglets utilise `withTiming` et `withSpring` à la sélection et à l'appui sans `useReducedMotion` (`src/app/(tabs)/_layout.tsx:88-123`).
- `SplashAnimated` applique un fondu de 300 ms sans condition de mouvement réduit (`src/components/ui/SplashAnimated.tsx:45-50`).

**Correction attendue :** centraliser une durée nulle / valeur finale lorsque la préférence est active, sans supprimer le feedback visuel non animé.

## Taille de police et réactivité

L'audit ne trouve ni stratégie explicite `fontScale`, ni limites documentées `maxFontSizeMultiplier`. React Native peut appliquer la mise à l'échelle par défaut, mais les formulaires, cartes et barres custom doivent être testés aux tailles système 100 %, 130 %, 160 % et 200 % sur petits écrans. Statut : **non vérifié**, pas non-conformité déclarée.

## Modalités à tester avant validation

1. TalkBack Android : navigation par balayage, activation et annonce des onglets, calendrier, snooze et formulaires.
2. VoiceOver iOS : ordre de focus, fermeture de feuilles, date picker et retour au déclencheur.
3. Thèmes clair et sombre, contraste des onglets à 100 % et luminosité faible.
4. Mouvement réduit : lancement, changement d'onglet, appui, logo et toute animation répétée.
5. Grande taille de texte et orientation prise en charge par le produit.
