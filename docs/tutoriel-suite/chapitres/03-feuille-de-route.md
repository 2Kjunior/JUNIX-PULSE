# 9. La méthode pour chaque nouveau chantier

Chaque recette D à L suit **toujours les mêmes huit gestes**. Apprends-les une fois :

<figure>
<svg width="660" height="120" viewBox="0 0 660 120" font-family="Segoe UI, Arial" font-size="11" text-anchor="middle">
  <g font-weight="700" fill="#fff">
    <rect x="5" y="30" width="72" height="56" rx="8" fill="#3B2A78"/><text x="41" y="55">1 Relire</text><text x="41" y="70" font-weight="400">l'étude</text>
    <rect x="87" y="30" width="72" height="56" rx="8" fill="#3B2A78"/><text x="123" y="55">2 Lire</text><text x="123" y="70" font-weight="400">le code</text>
    <rect x="169" y="30" width="72" height="56" rx="8" fill="#5b3fb0"/><text x="205" y="55">3 Fiche</text><text x="205" y="70" font-weight="400">écrite</text>
    <rect x="251" y="30" width="72" height="56" rx="8" fill="#2e9e57"/><text x="287" y="55">4 Règle</text><text x="287" y="70" font-weight="400">+ test</text>
    <rect x="333" y="30" width="72" height="56" rx="8" fill="#0E7490"/><text x="369" y="55">5 Données</text><text x="369" y="70" font-weight="400">migration</text>
    <rect x="415" y="30" width="72" height="56" rx="8" fill="#0E7490"/><text x="451" y="55">6 Écran</text><text x="451" y="70" font-weight="400">FR + EN</text>
    <rect x="497" y="30" width="72" height="56" rx="8" fill="#B45309"/><text x="533" y="55">7 Vérifier</text><text x="533" y="70" font-weight="400">tests, web</text>
    <rect x="579" y="30" width="76" height="56" rx="8" fill="#141317"/><text x="617" y="55">8 Commit</text><text x="617" y="70" font-weight="400">+ APK</text>
  </g>
</svg>
<figcaption>Figure 6 — Les huit gestes de chaque chantier.</figcaption>
</figure>

1. **Relire la décision** dans l'étude 001, section 12 (annexe F). Ne rien inventer qui contredise une décision.
2. **Lire le code existant** que tu vas toucher, en entier. Les noms de fichiers donnés ici sont ceux du 23 novembre 2026 ; vérifie qu'ils existent toujours (`dir src\services`).
3. **Écrire la fiche** `docs/fiches/FICHE-0NN-nom.md` : copie la structure de la fiche 010 (objectif, état de départ, matériel, hypothèses, carte, sauvegarde, étapes avec blocs, test final, dépannage, lexique, et après).
4. **Commencer par la règle pure** dans `src/domain/rules/` et son test : c'est la partie la plus facile à vérifier, et tout le reste s'appuie dessus.
5. **Les données** : si une colonne ou une table manque, une nouvelle migration (chapitre 9.2), et la sauvegarde mise à jour.
6. **L'écran**, avec les textes en français **et** en anglais.
7. **Vérifier** : `npx jest`, `npx tsc --noEmit`, `npx eslint <fichiers>`, puis le web, puis le téléphone.
8. **Compte rendu** dans la fiche, commit par chemins, APK (recette C).

## 9.1 Recette de base : ajouter un texte dans les deux langues

Ouvre `src/i18n/messages.ts`. Le fichier a **deux blocs** : le français d'abord, l'anglais ensuite. Chaque texte a une **clé** (`'home.quickAdd'`) qui est la même dans les deux blocs.

1. Cherche (Ctrl + F) une clé voisine de celle que tu ajoutes, par exemple `'home.quickAdd'`. Tu la trouveras **deux fois** (vers la ligne 225 en français, vers la ligne 741 en anglais).
2. Ajoute ta clé **juste en dessous**, dans les deux blocs :

```ts
  'home.quickAddHint': 'Touchez pour choisir',      // dans le bloc français
  'home.quickAddHint': 'Tap to choose',             // dans le bloc anglais
```

3. Dans l'écran : `const t = useT();` puis `t('home.quickAddHint')`.

> [attention] Une clé présente dans une seule langue fait échouer un test du projet. C'est voulu : il te prévient.

## 9.2 Recette de base : ajouter une colonne à la base sans rien perdre

La base est à la **version 33**. Ouvre `src/database/migrations.ts` et va tout en bas de la liste des migrations. Ajoute la suivante **après** la dernière, sans jamais modifier une migration existante :

```ts
  {
    version: 34,
    // Niveau de notification choisi pour chaque rappel : discret, normal ou alarme
    sql: `
      ALTER TABLE reminders ADD COLUMN notification_level TEXT NOT NULL DEFAULT 'normal';
    `,
  },
```

> [attention] Recopie **la forme exacte** des migrations voisines (le nom des propriétés peut être `sql`, `up` ou une fonction : regarde la version 33 et fais pareil).

> [danger] Dans les commentaires SQL (`-- …`) à l'intérieur de la requête, **aucune apostrophe** : un test du projet le vérifie, car une apostrophe peut fermer la chaîne SQL par erreur. `DEFAULT 'normal'` est une vraie valeur, pas un commentaire : là, c'est permis.

Ensuite, trois endroits à suivre :

| Endroit | Quoi faire |
|---|---|
| `src/domain/entities` (le type `Reminder`) | Ajouter `notificationLevel: NotificationLevel;` |
| `src/repositories/reminder-repository.ts` | Lire la colonne (`row.notification_level`) et l'écrire dans `INSERT` / `UPDATE` |
| `src/services/backup-service.ts` | Ajouter la colonne à la liste des colonnes exportées, et dans le schéma zod : `notificationLevel: z.enum(['discreet','normal','alarm']).default('normal')` pour que les **anciennes sauvegardes** se restaurent encore |

Test final : le test des migrations du dossier `src/database/__tests__` doit passer ; restaure une ancienne sauvegarde sur le web pour vérifier qu'elle s'ouvre.

# 10. Recette D — Les notifications des trois types, avec trois niveaux

<div class="fiche-recette"><div><b>Temps</b>2 à 3 jours</div><div><b>Difficulté</b>4 / 5</div><div><b>Ingrédients</b>notification-service.ts, reminder-notification-service.ts, une règle, une migration</div><div><b>Ustensiles</b>expo-notifications (déjà là)</div></div>

> [astuce] **Fait le 23 novembre 2026 par la fiche 011** (annexe G), après quatre décisions prises ensemble : nuit 22 h - 7 h réglable, échéances la veille 18 h et le jour 9 h, moments 15 min avant, sons et alarme continue reportés au chantier n° 9. **La fiche 011 est la version qui marche** : elle diffère sur des détails du plan ci-dessous (les niveaux dépendent du moment, de l'urgence et de la nuit ; le critère « type de moment » attend la recette G). Cette recette reste comme explication de la démarche.

## 10.1 La décision (étude 12.6)

- Les notifications existent pour **les trois types** : rappels (déjà fait), **tâches** avec une échéance, **moments** (événements) avec un début.
- Trois **niveaux** : **Discret** (silencieux, sans vibration), **Normal** (son et vibration), **Alarme** (son fort, plein écran si permis, répété).
- Le niveau est proposé **automatiquement** selon des critères, et **modifiable** par l'utilisateur.

## 10.2 Le schéma

<figure>
<svg width="660" height="250" viewBox="0 0 660 250" font-family="Segoe UI, Arial" font-size="12">
  <g fill="#fff" text-anchor="middle" font-weight="700">
    <rect x="10" y="20" width="150" height="44" rx="8" fill="#0E7490"/><text x="85" y="47">Tâche (échéance)</text>
    <rect x="10" y="80" width="150" height="44" rx="8" fill="#0E7490"/><text x="85" y="107">Rappel (heure)</text>
    <rect x="10" y="140" width="150" height="44" rx="8" fill="#B45309"/><text x="85" y="167">Moment (début)</text>
    <rect x="230" y="70" width="170" height="64" rx="10" fill="#2e9e57"/><text x="315" y="96">notificationLevelFor()</text><text x="315" y="116" font-weight="400" font-size="11">règle pure, testée</text>
    <rect x="470" y="10" width="180" height="44" rx="8" fill="#777"/><text x="560" y="37">Canal « discret »</text>
    <rect x="470" y="80" width="180" height="44" rx="8" fill="#3B2A78"/><text x="560" y="107">Canal « normal »</text>
    <rect x="470" y="150" width="180" height="44" rx="8" fill="#B3261E"/><text x="560" y="177">Canal « alarme »</text>
  </g>
  <g stroke="#888" stroke-width="2.5"><line x1="160" y1="42" x2="230" y2="95"/><line x1="160" y1="102" x2="230" y2="102"/><line x1="160" y1="162" x2="230" y2="110"/><line x1="400" y1="95" x2="470" y2="32"/><line x1="400" y1="102" x2="470" y2="102"/><line x1="400" y1="110" x2="470" y2="172"/></g>
  <text x="330" y="230" text-anchor="middle" fill="#555">Le choix du niveau est une règle pure ; seul le service parle à Android.</text>
</svg>
<figcaption>Figure 7 — Un élément, une règle, un canal Android.</figcaption>
</figure>

## 10.3 Étape 1 — La règle pure et son test

Crée `src/domain/rules/notification-level-rules.ts` :

```ts
/**
 * Which notification level an item gets: discreet, normal or alarm (study 001, 12.6).
 * A level the user chose always wins; otherwise it follows simple criteria.
 */

export type NotificationLevel = 'discreet' | 'normal' | 'alarm';

export const NOTIFICATION_LEVELS: readonly NotificationLevel[] = ['discreet', 'normal', 'alarm'];

export interface NotificationLevelInput {
  /** The level the user picked for this item, if any. */
  chosen?: NotificationLevel | null;
  kind: 'reminder' | 'task' | 'event';
  /** Marked important or urgent by the user. */
  important?: boolean;
  /** For an event: its type, for instance 'birthday' or 'funeral' (recipe G). */
  eventType?: string | null;
  /** Minutes between now and the moment it rings. */
  minutesAhead?: number;
}

/** Event types that deserve to be heard. Kept small on purpose: the user can change it. */
const LOUD_EVENT_TYPES = new Set(['medical', 'travel', 'exam']);

export function notificationLevelFor(input: NotificationLevelInput): NotificationLevel {
  if (input.chosen && NOTIFICATION_LEVELS.includes(input.chosen)) return input.chosen;
  if (input.important) return 'alarm';
  if (input.kind === 'event' && input.eventType && LOUD_EVENT_TYPES.has(input.eventType)) return 'alarm';
  if (input.kind === 'task') return 'discreet';
  return 'normal';
}
```

| Ligne | Rôle |
|---|---|
| `chosen` gagne toujours | L'utilisateur garde la main (règle d'or du projet) |
| `important` → alarme | Ce que l'utilisateur a marqué important doit le réveiller |
| `LOUD_EVENT_TYPES` | Quelques types d'événements qui sonnent fort ; à relier à la recette G |
| tâche → discret | Une tâche n'est pas un rendez-vous : on prévient sans déranger |

Crée `src/domain/rules/__tests__/notification-level-rules.test.ts` :

```ts
import { notificationLevelFor } from '../notification-level-rules';

describe('notificationLevelFor', () => {
  it('keeps the level the user chose', () => {
    expect(notificationLevelFor({ kind: 'task', chosen: 'alarm' })).toBe('alarm');
  });
  it('rings loud for what is important', () => {
    expect(notificationLevelFor({ kind: 'reminder', important: true })).toBe('alarm');
  });
  it('keeps tasks discreet and reminders normal by default', () => {
    expect(notificationLevelFor({ kind: 'task' })).toBe('discreet');
    expect(notificationLevelFor({ kind: 'reminder' })).toBe('normal');
  });
  it('rings loud for a medical appointment', () => {
    expect(notificationLevelFor({ kind: 'event', eventType: 'medical' })).toBe('alarm');
  });
});
```

```powershell
npx jest src/domain/rules/__tests__/notification-level-rules.test.ts
```

Tu dois voir `Tests: 4 passed`.

## 10.4 Étape 2 — Les canaux Android

Android range les notifications par **canal**. Le son et l'importance d'un canal sont fixés **à sa création** : on ne peut plus les changer ensuite par le code (l'utilisateur, lui, peut les changer dans les réglages du téléphone). Donc : un canal par niveau, avec un **nouveau nom** de canal si un jour tu changes ses réglages.

1. Ouvre `src/services/notification-service.ts`. Vers la ligne 92, tu trouves les appels `Notifications.setNotificationChannelAsync("reminders", …)`, puis les canaux `NOTIFICATION_CHANNEL_ID`, `NOTIFICATION_SILENT_CHANNEL_ID`, `DAILY_RECAP_CHANNEL_ID`.
2. **Lis-les** : il existe déjà un canal normal et un canal silencieux. Note leurs noms.
3. Ajoute, à côté, le canal **alarme** :

```ts
await Notifications.setNotificationChannelAsync(NOTIFICATION_ALARM_CHANNEL_ID, {
  name: tNow('notifications.channelAlarm'),
  importance: Notifications.AndroidImportance.MAX,
  sound: 'default',
  vibrationPattern: [0, 600, 300, 600, 300, 600],
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  bypassDnd: false,
});
```

> [danger] `bypassDnd: false` : on ne contourne **pas** le mode Ne pas déranger du téléphone. C'est une règle de sécurité Android et du projet. L'utilisateur peut l'autoriser lui-même dans les réglages Android du canal.

4. Définis la constante en haut du fichier, à côté des autres : `export const NOTIFICATION_ALARM_CHANNEL_ID = 'reminders-alarm';`
5. Ajoute les textes `notifications.channelAlarm` (FR : « Alarmes », EN : « Alarms ») dans les deux langues (recette 9.1).
6. Écris une petite fonction qui donne le canal d'un niveau :

```ts
export function channelForLevel(level: NotificationLevel): string {
  if (level === 'alarm') return NOTIFICATION_ALARM_CHANNEL_ID;
  if (level === 'discreet') return NOTIFICATION_SILENT_CHANNEL_ID;
  return NOTIFICATION_CHANNEL_ID;
}
```

7. Là où la notification est programmée (vers la ligne 205, `channelId:`), remplace le canal fixe par `channelForLevel(level)`.

> [note] Vérifie dans la documentation Expo 58 (`expo-notifications`) le nom exact des options (`importance`, `vibrationPattern`, `lockscreenVisibility`) avant d'écrire : c'est la règle `AGENTS.md`.

## 10.5 Étape 3 — Les tâches et les moments

Aujourd'hui, seule la synchronisation des **rappels** existe (`src/services/reminder-notification-service.ts`, fonction `syncReminderNotifications`). Pour les deux autres types :

1. Lis `syncReminderNotifications` en entier : elle annule les notifications périmées, puis programme les prochaines. **Copie sa logique**, ne réinvente pas.
2. Crée `src/services/item-notification-service.ts` avec `syncTaskNotifications()` (tâches non faites avec une échéance future : une notification à l'échéance) et `syncEventNotifications()` (événements futurs : une notification à `début − délai`, où le délai vient du réglage « Partir … min avant » s'il y a un lieu, sinon 15 min).
3. Identifie chaque notification par un **identifiant stable** : `task:<id>` et `event:<id>`. Ainsi, reprogrammer remplace au lieu de doubler.
4. Appelle ces deux fonctions aux mêmes endroits que `syncReminderNotifications` (démarrage dans `_layout.tsx`, après une création ou une modification).
5. Dans `notification-action-service.ts`, gère l'appui sur une notification `task:` (ouvrir `/tasks/<id>`) et `event:` (ouvrir `/events/<id>`). Les routes existent : `src/app/tasks/[id].tsx` et `src/app/events/[id].tsx`.

## 10.6 Étape 4 — Le choix dans les formulaires

Dans les formulaires (recette E), ajoute une rangée de trois boutons **Discret · Normal · Alarme**, pré-sélectionnée avec `notificationLevelFor(...)`, et enregistrée dans la nouvelle colonne (migration 34, recette 9.2, une colonne par table concernée : `reminders`, `tasks`, `events`).

## 10.7 Vérifier

| Test | Comment | Attendu |
|---|---|---|
| Règle | `npx jest notification-level` | 4 tests réussis |
| Rappel normal | Créer un rappel dans 2 min, téléphone verrouillé | Son + vibration habituels |
| Tâche discrète | Une tâche à échéance dans 2 min | Notification silencieuse |
| Alarme | Un rappel marqué Alarme | Vibration longue, son ; visible sur l'écran verrouillé |
| Ne pas déranger | Activer « Ne pas déranger » | L'alarme ne passe **pas** (sauf si l'utilisateur l'autorise) |

# 11. Recette E — Les formulaires 2-B

<div class="fiche-recette"><div><b>Temps</b>2 jours</div><div><b>Difficulté</b>3 / 5</div><div><b>Ingrédients</b>src/app/reminders/new, tasks/new, events/new, item-kinds.ts</div><div><b>Ustensiles</b>composants existants (GlowCard, champs)</div></div>

> [astuce] **Fait le 23 novembre 2026 par la fiche 012** (annexe H), pour les écrans de **création**, après quatre décisions prises ensemble (création d'abord, priorité et options des rappels sous l'Alerte, durée renommée « Temps pour le faire » et reliée à Focus). **La fiche 012 est la version qui marche** ; les écrans de **modification** restent à faire avec les mêmes briques (`FormBricks.tsx`).

## 11.1 La décision (étude 12.2)

Deux formulaires **bien différents à l'œil**, construits depuis le registre :

| | Formulaire **À faire** | Formulaire **Moment** |
|---|---|---|
| Couleur | Cyan `#7BD0FF` (sombre) / `#0E7490` (clair) | Ambre `#F5B942` / `#B45309` |
| Icône | `checkbox-outline` | `calendar-outline` |
| Champs | Titre, **interrupteur « Alerte »** (si activé : date et heure), note, personnes, étiquettes | Titre, **début et fin**, **lieu**, « Partir … min avant » (**seulement si un lieu**), type d'événement, personnes |
| Dictée | Oui (micro) | Oui (micro) |
| À enlever | « Combien de temps pour y arriver » (jugé absurde) | — |

## 11.2 Les gestes

1. Ouvre `src/app/tasks/new.tsx`, `src/app/reminders/new.tsx` et `src/app/events/new.tsx`. Note ce qu'ils ont **en commun** (titre, note, personnes, étiquettes, dictée).
2. Crée `src/components/create/ItemFormHeader.tsx` : un en-tête qui prend `family` et affiche l'icône, la couleur et le titre venant de `ITEM_FAMILY_DEFINITIONS` et `itemFamilyColor(family, isDark)`. Les deux formulaires l'utilisent : ainsi, changer une couleur dans le registre change les formulaires.
3. **Fusion À faire** : dans `tasks/new.tsx`, ajoute l'interrupteur « Alerte à une heure ». S'il est activé, l'enregistrement crée un **rappel** (`reminder`) ; sinon une **tâche** (`task`). Le choix « Nouveau » (`NewItemChooser.tsx`) a déjà les deux entrées `new-item-task` et `new-item-reminder` : elles peuvent ouvrir le même formulaire avec l'interrupteur pré-réglé (`?alert=1`).
4. **Moment** : dans `events/new.tsx`, n'affiche le champ « Partir … min avant » que si `location.trim() !== ''`.
5. Enlève le champ « combien de temps pour y arriver » : **ne supprime pas la colonne** de la base (règle des migrations), cache seulement le champ.
6. Ajoute les textes (`create.todo.alertSwitch`, `create.moment.leaveBefore`…) en FR et EN.
7. Les tests : un test par formulaire qui vérifie que le champ « Partir avant » est caché sans lieu, et que l'interrupteur crée le bon type.

> [astuce] Garde les `testID` existants (`new-item-todo`, `new-item-moment`…) : des tests s'en servent.

# 12. Recette F — L'onglet « À faire » et le bouton « + À faire ou moment »

<div class="fiche-recette"><div><b>Temps</b>15 min (bouton) · 1 à 2 jours (onglet)</div><div><b>Difficulté</b>1 puis 3 / 5</div><div><b>Ingrédients</b>messages.ts, (tabs)/_layout.tsx, tasks.tsx, reminders.tsx</div><div><b>Ustensiles</b>—</div></div>

> [astuce] **Fait le 23 novembre 2026 par la fiche 015** (annexe K) : un seul onglet « À faire », filtre en haut, liste par moment, carte unique, barre du bas à 4 onglets. Le bouton de l'Accueil a été renommé « + À faire ou moment » le 24 novembre par la **fiche 017** (annexe M).

## 12.1 Le bouton : changement immédiat

Le bouton de l'accueil dit encore « + Rappel, tâche ou événement ». Ouvre `src/i18n/messages.ts` :

**Ligne 224-225 (français)** — avant :

```ts
  'home.quickAddA11y': 'Ajouter un rappel, une tâche ou un événement',
  'home.quickAdd': '+ Rappel, tâche ou événement',
```

après :

```ts
  'home.quickAddA11y': 'Ajouter une chose à faire ou un moment',
  'home.quickAdd': '+ À faire ou moment',
```

**Ligne 740-741 (anglais)** — avant :

```ts
  'home.quickAddA11y': 'Add a reminder, a task or an event',
  'home.quickAdd': '+ Reminder, task or event',
```

après :

```ts
  'home.quickAddA11y': 'Add a to-do or a moment',
  'home.quickAdd': '+ To-do or moment',
```

Vérifie : `npx jest` (un test peut chercher l'ancien texte : mets-le à jour), puis regarde l'accueil sur le web.

## 12.2 L'onglet « À faire »

Aujourd'hui, la barre d'onglets (`src/app/(tabs)/_layout.tsx`) a des onglets séparés `reminders` et `tasks`. La décision 1-B : un seul onglet **À faire** qui montre les deux, avec la cloche sur ceux qui sonnent.

1. Lis `src/app/(tabs)/_layout.tsx` : chaque `<Tabs.Screen name="…" />` est un onglet.
2. Dans `src/app/(tabs)/tasks.tsx`, ajoute la liste des rappels **sous** (ou mêlée à) celle des tâches, triées par heure. Utilise `itemKindLook(kind)` pour l'icône et la cloche (comme le fil de l'accueil, `src/app/(tabs)/index.tsx`).
3. Renomme le libellé de l'onglet `tasks` en `itemFamily.todo` (« À faire »).
4. **Cache** l'onglet `reminders` sans supprimer le fichier : `<Tabs.Screen name="reminders" options={{ href: null }} />`. Les liens profonds (`/reminders/<id>`) continuent de marcher.
5. Les cartes : une seule forme de carte pour les deux (GlowCard avec la couleur de la famille) ; une case à cocher ; la cloche si `withAlert`.

> [attention] Les notifications de rappel ouvrent `/reminders/<id>` : ne supprime pas ces écrans.

# 13. Recette G — La hiérarchie des alertes et les types d'événements

<div class="fiche-recette"><div><b>Temps</b>1 jour</div><div><b>Difficulté</b>3 / 5</div><div><b>Ingrédients</b>item-kinds.ts (ou un nouveau event-types.ts), migration</div><div><b>Ustensiles</b>Ionicons</div></div>

> [astuce] **Fait le 24 novembre 2026 par la fiche 023** (annexe S) : neuf types de moment devinés du titre, un niveau Auto · Discrète · Normale · Alarme sur les rappels et les moments, un niveau par défaut par famille dans les Paramètres. **La fiche 023 est la version qui marche** ; les sons par type et l'alarme continue restent pour la recette K.

Ton message : « des types d'événements (anniversaire, enterrement…) ». Comme pour les familles, on fait un **registre**, pour pouvoir en ajouter ou en retirer sans rien casser.

Crée `src/constants/event-types.ts` :

```ts
/**
 * The types of moments (study 001, 12.2 and 12.6). Add or remove one here only:
 * forms, cards and notification levels follow.
 */
import type { NotificationLevel } from '@/domain/rules/notification-level-rules';

export const EVENT_TYPES = ['general', 'birthday', 'meeting', 'medical', 'travel', 'exam', 'celebration', 'funeral'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventTypeDefinition {
  type: EventType;
  icon: string;               // an Ionicons name
  labelKey: string;           // the text key, in messages.ts
  defaultLevel: NotificationLevel;
  /** A sober look and no party mood for the mascot (a funeral is not a celebration). */
  sober?: boolean;
}

export const EVENT_TYPE_DEFINITIONS: Record<EventType, EventTypeDefinition> = {
  general: { type: 'general', icon: 'calendar-outline', labelKey: 'eventType.general', defaultLevel: 'normal' },
  birthday: { type: 'birthday', icon: 'gift-outline', labelKey: 'eventType.birthday', defaultLevel: 'normal' },
  meeting: { type: 'meeting', icon: 'people-outline', labelKey: 'eventType.meeting', defaultLevel: 'normal' },
  medical: { type: 'medical', icon: 'medkit-outline', labelKey: 'eventType.medical', defaultLevel: 'alarm' },
  travel: { type: 'travel', icon: 'airplane-outline', labelKey: 'eventType.travel', defaultLevel: 'alarm' },
  exam: { type: 'exam', icon: 'school-outline', labelKey: 'eventType.exam', defaultLevel: 'alarm' },
  celebration: { type: 'celebration', icon: 'sparkles-outline', labelKey: 'eventType.celebration', defaultLevel: 'normal' },
  funeral: { type: 'funeral', icon: 'flower-outline', labelKey: 'eventType.funeral', defaultLevel: 'discreet', sober: true },
};

export function eventTypeDefinition(type: string | null | undefined): EventTypeDefinition {
  return EVENT_TYPE_DEFINITIONS[(type ?? 'general') as EventType] ?? EVENT_TYPE_DEFINITIONS.general;
}
```

Puis :

1. **Données** : migration `ALTER TABLE events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'general';` (recette 9.2), plus le dépôt et la sauvegarde.
2. **Textes** : les clés `eventType.general` … `eventType.funeral` en FR (Général, Anniversaire, Réunion, Rendez-vous médical, Voyage, Examen, Fête, Obsèques) et EN.
3. **Formulaire Moment** : une rangée de puces (icône + libellé) pour choisir le type.
4. **Niveau** : dans `notificationLevelFor`, remplace l'ensemble `LOUD_EVENT_TYPES` par `eventTypeDefinition(input.eventType).defaultLevel` (et mets à jour le test).
5. **Mascotte** : un type `sober` ne doit jamais déclencher l'humeur « fête ». Cherche `'party'` dans `src/domain/rules/mascot-mood-rules.ts` et ajoute la condition.
6. **Test** : `eventTypeDefinition('inconnu')` renvoie `general` (un ancien type supprimé ne casse rien).

> [note] Les icônes `Ionicons` : vérifie que chaque nom existe dans la version du projet (une icône inconnue s'affiche en point d'interrogation). La liste est sur le site `icons.expo.fyi`.

# 14. Recette H — Des gestes découvrables

<div class="fiche-recette"><div><b>Temps</b>1 jour</div><div><b>Difficulté</b>2 / 5</div><div><b>Ingrédients</b>FirstVisitTip.tsx, mascot-tour-rules.ts, réglages</div><div><b>Ustensiles</b>la mascotte</div></div>

> [astuce] **Fait le 24 novembre 2026 par la fiche 024** (annexe T) : « ⋯ » et appui long sur les cartes des listes, l'astuce du glissement une fois (jamais le même jour qu'une autre). Les astuces du Planning et des invitations viendront avec les recettes J et I suivantes.

La décision (12.3) : les gestes (glisser pour cocher, appui long = menu dans les listes, glisser dans le planning) étaient comme des « œufs de Pâques ». On les fait découvrir **une astuce à la fois**, par Pulse, au bon moment, et on peut les revoir dans les réglages.

1. Lis `src/features/mascot/FirstVisitTip.tsx` et `src/domain/rules/mascot-tour-rules.ts` : le mécanisme d'astuce au premier passage existe déjà.
2. Crée `src/domain/rules/gesture-tip-rules.ts` : une liste ordonnée d'astuces `{ id, screen, condition }`, et une fonction `nextGestureTip(seenIds, screen, context)` qui renvoie **une seule** astuce non vue, adaptée à l'écran, ou `null`. Exemple de condition : l'astuce « glisser pour cocher » seulement si la liste a au moins une tâche.
3. Teste la règle : jamais deux astuces à la fois ; une astuce vue ne revient pas ; `null` quand tout est vu.
4. Enregistre les astuces vues dans les réglages (migration : `seen_gesture_tips TEXT NOT NULL DEFAULT ''`, liste séparée par des virgules).
5. Dans les réglages : un bouton **« Revoir les astuces »** qui vide cette liste.
6. Respecte la présence de la mascotte : si elle est désactivée, l'astuce s'affiche dans une simple bulle (`MascotBubble` avec `solid`), sans Pulse.

# 15. Recette I — Le partage, étape 5-A

<div class="fiche-recette"><div><b>Temps</b>1 à 2 jours</div><div><b>Difficulté</b>3 / 5</div><div><b>Ingrédients</b>une règle de mise en forme, l'écran détail</div><div><b>Ustensiles</b>`Share` de React Native (déjà là), aucune dépendance</div></div>

> [astuce] **Fait le 24 novembre 2026 par la fiche 025** (annexe U), après quatre décisions prises ensemble : texte et lien Junix, pour les trois types, QR plus tard, « Invitation envoyée » à l'envoi. Limite : WhatsApp et la plupart des SMS ne rendent cliquables que les liens `https://` ; sinon, on colle le message dans « Invitation reçue ».

La décision (12.5) : partage **hybride**, par étapes, **gratuit**. Étape 5-A = partager **un message lisible** (WhatsApp, SMS, e-mail, Bluetooth : tout ce que le téléphone propose), sans compte.

> [danger] On n'envoie **jamais** rien tout seul quand on ajoute une personne. Le partage se fait toujours par un bouton, par exemple **« Envoyer à Paul »**.

1. Crée `src/domain/rules/share-text-rules.ts` : `shareTextFor(item, language)` renvoie un texte simple, par exemple :

```txt
Moment : Anniversaire de Léa
Samedi 29 novembre, 19:00 - 22:00
Lieu : 12 rue des Lilas
Partagé avec Junix Pulse
```

2. Teste-la : date dans la bonne langue, lieu absent s'il n'y en a pas, aucune donnée privée (pas les notes, pas les étiquettes, pas le Sanctuaire).
3. Sur `src/app/events/[id].tsx` (et les tâches) : un bouton **Partager** qui appelle :

```ts
import { Share } from 'react-native';
await Share.share({ message: shareTextFor(event, language) });
```

4. Si l'élément a des personnes avec un téléphone : un bouton **« Envoyer à Paul »** qui ouvre directement le SMS : `Linking.openURL('sms:' + phone + '?body=' + encodeURIComponent(text))` (vérifier la forme exacte de l'adresse `sms:` sur Android).
5. Plus tard, 5-B (un fichier `.junix` que l'autre appli importe) et 5-C (compte et synchro, recette L).

# 16. Recette J — Le planning : Jour, Semaine, Mois, et glisser-déposer

<div class="fiche-recette"><div><b>Temps</b>4 à 6 jours</div><div><b>Difficulté</b>5 / 5</div><div><b>Ingrédients</b>(tabs)/calendar.tsx, une règle de grille</div><div><b>Ustensiles</b>gesture-handler + reanimated (déjà là)</div></div>

La décision (12.4) : trois vues **Jour · Semaine · Mois** (l'Agenda et la Journée faisaient doublon), glisser-déposer **dans les trois**, par pas de **15 minutes**.

## 16.1 La règle la plus importante : arrondir au quart d'heure

Tout le glisser-déposer repose sur un calcul simple : « l'élément a été lâché à telle hauteur, quelle heure est-ce ? ». Écris-le **à part**, testé, avant toute animation. Crée `src/domain/rules/planning-grid-rules.ts` :

```ts
/** The planning grid: from a position on screen to a time, in steps of 15 minutes. */

export const SNAP_MINUTES = 15;

/** Rounds a number of minutes to the nearest step. */
export function snapMinutes(minutes: number, step = SNAP_MINUTES): number {
  'worklet';
  return Math.round(minutes / step) * step;
}

/** Minutes since midnight for a vertical position, given the height of one hour. */
export function minutesAtY(y: number, hourHeight: number, step = SNAP_MINUTES): number {
  'worklet';
  const raw = (y / hourHeight) * 60;
  return Math.min(24 * 60 - step, Math.max(0, snapMinutes(raw, step)));
}

/** Moves a start date by a number of minutes, keeping the length of the item. */
export function movedRange(start: Date, end: Date, deltaMinutes: number): { start: Date; end: Date } {
  const shift = snapMinutes(deltaMinutes) * 60000;
  return { start: new Date(start.getTime() + shift), end: new Date(end.getTime() + shift) };
}
```

Et son test :

```ts
import { minutesAtY, movedRange, snapMinutes } from '../planning-grid-rules';

describe('planning grid', () => {
  it('snaps to the nearest quarter of an hour', () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(52)).toBe(45);
  });
  it('turns a position into a time, inside the day', () => {
    expect(minutesAtY(120, 60)).toBe(120);   // 2:00
    expect(minutesAtY(-30, 60)).toBe(0);     // never before midnight
    expect(minutesAtY(5000, 60)).toBe(1425); // never after 23:45
  });
  it('keeps the length of a moved item', () => {
    const moved = movedRange(new Date('2026-11-29T19:00:00'), new Date('2026-11-29T22:00:00'), 31);
    expect(moved.start.toTimeString().slice(0, 5)).toBe('19:30');
    expect(moved.end.getTime() - moved.start.getTime()).toBe(3 * 3600000);
  });
});
```

## 16.2 Le glisser, geste par geste

1. Dans la vue Jour, chaque carte est enveloppée dans un `GestureDetector` avec `Gesture.Pan().activateAfterLongPress(350)` : on **appuie longtemps**, puis on glisse (sinon le défilement de la page serait gêné).
2. Pendant le glisser, une valeur partagée `translateY` suit le doigt ; la carte s'affiche à `snapMinutes` près (elle « saute » de quart d'heure en quart d'heure), avec une petite vibration à chaque saut (`haptic-service.ts`).
3. Au lâcher (`onEnd`), on appelle en JS (`runOnJS`) la mise à jour : `movedRange(...)`, puis le dépôt (`event-repository` ou `task-repository`), puis la resynchronisation des notifications (recette D).
4. **Annuler** : une barre « Déplacé à 19:30 — Annuler » (le `Snackbar` existe déjà) qui remet l'ancienne heure.
5. Semaine : même chose en horizontal (changer de jour) **et** vertical (changer d'heure). Mois : glisser change seulement **le jour**, l'heure est gardée.
6. Accessibilité : le glisser est impossible pour certains ; garde toujours le menu « Déplacer… » de l'appui long, qui ouvre un choix de date et d'heure.

# 17. Recette K — Les sons et l'alarme

<div class="fiche-recette"><div><b>Temps</b>2 jours</div><div><b>Difficulté</b>4 / 5</div><div><b>Ingrédients</b>src/services/sound/, canaux de la recette D</div><div><b>Ustensiles</b>expo-audio</div></div>

La décision (12.6) : une **hiérarchie** de sons et d'images ; une alarme « comme l'appli Horloge », mais **à l'intérieur de la notification**.

1. Lis `src/services/sound/NotificationSoundService.ts` et `notification-sound-constants.ts` : le son de l'appli au premier plan.
2. **Au premier plan** (appli ouverte) : un son par niveau (discret = aucun, normal = le son actuel, alarme = un son plus long, répété 3 fois au plus, arrêté par un toucher).
3. **En arrière-plan** : le son est celui du **canal** (recette D). Pour un son personnalisé : le fichier dans `assets/sounds/`, déclaré dans le module `expo-notifications` de `app.json` (option `sounds`), puis `sound: 'nom-du-fichier.wav'` dans le canal. Il faut un prebuild (recette C).
4. **Les sonneries et musiques du téléphone** (ton souhait) : Android ne laisse pas une appli lire librement les sonneries système depuis JavaScript sans module natif. Solution simple et sûre : l'utilisateur choisit le son **du canal** dans les réglages Android (bouton « Choisir le son de l'alarme » qui ouvre ces réglages avec `Linking.openSettings()`).
5. **Plein écran** : la notification « plein écran » (comme un appel) demande la permission Android `USE_FULL_SCREEN_INTENT`, que Google limite aux applis d'alarme et d'appel. **Ne la demande pas** sans être sûr que Junix Pulse y a droit (règles du Play Store). L'alarme de la recette D (importance maximale, visible sur l'écran verrouillé) est le bon compromis.

> [danger] Ne contourne jamais les restrictions de sécurité Android (Ne pas déranger, alarmes exactes, plein écran). Le projet a déjà `src/features/reminders/offer-exact-alarms.ts`, qui **demande** poliment la permission des alarmes exactes : c'est le modèle à suivre.

# 18. Recette L — Le compte et la synchronisation (plus tard)

<div class="fiche-recette"><div><b>Temps</b>plusieurs semaines</div><div><b>Difficulté</b>5 / 5</div><div><b>Ingrédients</b>un serveur</div><div><b>Ustensiles</b>à choisir</div></div>

C'est le dernier chantier, volontairement. Avant d'écrire une ligne, une **étude** (comme l'étude 001) doit trancher :

| Question | Options | Coût |
|---|---|---|
| Où vivent les données partagées ? | Supabase (gratuit jusqu'à un certain volume), Firebase, ton propre serveur | Gratuit au début, payant si l'appli grandit |
| Le chiffrement | De bout en bout (le serveur ne lit rien) ou non | De bout en bout = plus de travail, mais cohérent avec le Sanctuaire |
| Le compte | Adresse e-mail, téléphone, ou lien magique | — |
| Les conflits | Deux personnes modifient le même moment | Règle « le dernier gagne » + historique |
| Les rôles (organisations) | Propriétaire, éditeur, lecteur | — |

> [attention] Ton budget est nul pour l'instant (« on n'a pas d'argent ») : reste sur 5-A et 5-B (sans serveur) tant que l'appli n'a pas d'utilisateurs qui le demandent.
