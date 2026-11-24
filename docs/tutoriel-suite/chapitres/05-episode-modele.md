# 26. Épisode modèle — Le Planning qu'on glisse au doigt

<div class="episode"><div class="bandeau"><div class="numero">26</div><div><div class="titre">Le Planning Jour · Semaine · Mois, et le glisser-déposer</div><div class="sous">Épisode modèle de l'édition illustrée · chantier n° 8 · fiche 026 (annexe V)</div></div></div><div class="cases"><div><b>Tu sauras</b>faire bouger une carte au doigt, par quarts d'heure, et annuler</div><div><b>Durée</b>2 h à lire et refaire ; 10 min avec l'outil de la fiche</div><div><b>Prérequis</b>épisodes 1 à 3 (installer, lancer le web, lire une fiche)</div></div></div>

Cet épisode montre **la forme que prendra tout le tutoriel** dans son édition illustrée : une ouverture qui dit ce que tu vas savoir faire, puis des étapes numérotées avec de **vraies captures**, les conseils **dans la marge**, et un récapitulatif à la fin. Comme dans une vidéo tuto de A à Z, on part de ce qu'on voit à l'écran, puis on ouvre le code.

> [note] Chaque figure dit si c'est une **capture réelle** (prise sur l'appli) ou une **illustration reconstituée** (dessinée). Ton écran peut différer un peu d'une illustration, jamais d'une capture.

## 26.1 Ce que tu vas construire

Le Planning a quatre vues : **Agenda** (la liste du jour), **Journée**, **Semaine**, **Mois**. Dans les trois dernières, un **appui long** soulève une carte ; on la glisse, on la lâche. Elle tombe toujours sur un **quart d'heure** (19:00, 19:15, jamais 19:07), garde sa durée, et un bandeau propose **« Annuler »** pendant 6 secondes.

![Vue Journée après un glisser](../fiches/images/fiche-026-jour-deplace.jpg)

*Figure 26-1 — Capture réelle (web, 360 px). Le moment glissé de 10:00 à 11:15 garde sa durée d'une heure. En bas, le bandeau « Déplacé : mar. 24 nov., 11:15 · Annuler ».*

> [astuce] Pour essayer sans téléphone : lance le web (`npx expo start --web`), ouvre l'onglet **Planning**, puis réduis la fenêtre à la largeur d'un téléphone (outils du navigateur, F12, icône téléphone).

## 26.2 Le plan, avant le code

Une bonne habitude de développeur : **découper avant d'écrire**. Ce chantier tient en quatre couches, de la plus simple à la plus visible :

| Couche | Fichier | Son rôle |
|---|---|---|
| Règles | `planning-move-rules.ts` | calculer : le quart d'heure, la durée gardée, la série qui suit, la grille du mois |
| Cas d'usage | `planning-move-use-cases.ts` | enregistrer, et rendre de quoi annuler |
| Composant | `DraggableBlock.tsx` | la carte qui se soulève et suit le doigt |
| Écrans | `DayTimeGrid`, `MonthView`, la Semaine, l'onglet | montrer, et brancher le tout |

> [note] Les **règles** n'ont pas d'écran : on les teste seules, en une seconde. C'est là qu'on met tout ce qui pourrait être faux (une heure, un jour, une répétition).

## 26.3 Les étapes

[Étape 1/5] **Les règles.** Ouvre l'annexe V, étape 1, et crée `src/domain/rules/planning-move-rules.ts`. Le cœur tient en une ligne :

```ts
export function snapMinutes(minutes: number): number {
  const snapped = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES; // 7 -> 0, 8 -> 15, 52 -> 45
  return snapped === 0 ? 0 : snapped; // -0 devient 0 (JavaScript connaît « moins zéro »)
}
```

Lance son test : `npx jest src/domain/rules/__tests__/planning-move-rules.test.ts`. Tu dois lire `Tests: 9 passed`.

> [attention] Une nouvelle règle de répétition ne doit **jamais** garder l'identifiant de l'ancienne : à l'enregistrement, l'ancien identifiant écraserait le nouveau. Le test « not.toHaveProperty('id') » le surveille.

[Étape 2/5] **Enregistrer et annuler.** Le cas d'usage déplace, puis rend une fonction `undo`. Le bandeau de l'appli (`Snackbar`) l'appelle si tu touches « Annuler ». Rien de nouveau n'est stocké : pas de migration.

[Étape 3/5] **La carte qui glisse.** Trois gestes travaillent ensemble :

| Geste | Bibliothèque | Ce qu'il fait |
|---|---|---|
| `usePanGesture({ activateAfterLongPress: 350 })` | gesture-handler | le glisser, seulement après 350 ms d'appui |
| `useTapGesture` | gesture-handler | le toucher court, qui ouvre la carte |
| `useExclusiveGestures(pan, tap)` | gesture-handler | l'appui long gagne ; sinon, c'est un toucher |

> [note] Le mot `'worklet'` en tête d'une fonction la fait tourner sur le fil des **animations**, pas sur celui de l'appli : la carte reste fluide même si l'appli est occupée.

[Étape 4/5] **La vue Journée, à l'échelle.** Une heure fait toujours 64 points ; un quart d'heure, 16. Toucher une heure libre propose d'ajouter quelque chose à cette heure.

![Toucher un créneau libre](../fiches/images/fiche-026-jour-creneau.jpg)

*Figure 26-2 — Capture réelle (web, 360 px). Toucher la ligne de 10:00 ouvre « Créneau de 10:00 », puis « Un moment qui a lieu » ouvre le formulaire déjà réglé sur 10:00.*

> [danger] Sur le web, la position du doigt s'appelle `offsetY`, sur le téléphone `locationY`. La première version ne lisait que `locationY` : le web affichait « Créneau de NaN:00 ». Toujours **vérifier à l'écran**, pas seulement dans les tests.

[Étape 5/5] **La Semaine et le Mois.** Dans la Semaine, un pas de côté vaut un jour (une colonne de 84 points). Dans le Mois, on touche un jour, puis on glisse une de ses lignes **jusque sur une autre case**.

![Vue Semaine après un glisser](../fiches/images/fiche-026-semaine-deplace.jpg)

*Figure 26-3 — Capture réelle (web, 360 px). Glissé d'une colonne vers la droite et d'une heure vers le bas : mardi 10:45 devient mercredi 11:45.*

![Vue Mois après un glisser](../fiches/images/fiche-026-mois-deplace.jpg)

*Figure 26-4 — Capture réelle (web, 360 px). Le point vert est passé du mercredi 25 au vendredi 27.*

## 26.4 Tout appliquer, puis vérifier

```powershell
node docs/tutoriel-suite/outils/appliquer-fiche-026.js .
```

```powershell
npx jest
```

> [video] Comme dans une vidéo : fais chaque contrôle **en même temps** que tu lis, et compare ton écran aux figures. Si ce n'est pas pareil, arrête-toi et regarde le dépannage (annexe V, section 9).

| Contrôle | Tu dois voir |
|---|---|
| `npx jest` | `Tests: 2091 passed` (ou plus) |
| Journée, appui long puis glisser | la carte saute de quart d'heure en quart d'heure, puis le bandeau |
| « Annuler » | la carte revient à sa place |
| Un rappel « chaque lundi » glissé au mardi | la question « Déplacer toutes les répétitions ? » |

## 26.5 Récapitulatif et exercices

**Ce que tu as appris** : découper un chantier en couches ; mettre les calculs dans des règles testées ; un geste qui attend un appui long ; enregistrer **et** savoir annuler ; vérifier à l'écran ce que les tests ne voient pas.

**Exercices** (sans IA, avec la fiche) :

1. Change le pas de 15 à 10 minutes (`SNAP_MINUTES`). Quel test casse, et pourquoi ?
2. Fais durer le bandeau 10 secondes au lieu de 6 (`MOVE_UNDO_MS`).
3. Dans la vue Journée, montre 06:00–23:00 au lieu de 07:00–22:00 (`DAY_FIRST_HOUR`, `DAY_LAST_HOUR`).

> [astuce] Après chaque exercice, `git diff` montre exactement ce que tu as changé, et `git checkout -- <fichier>` le défait.
