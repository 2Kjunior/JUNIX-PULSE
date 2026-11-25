# FICHE OPÉRATOIRE N° 016 — Revue de tous les écrans à la largeur d'un téléphone

Projet : **Junix Pulse** · Date : 23 novembre 2026 · Suite de : [FICHE 015](FICHE-015-onglet-a-faire-unique.md) · Étude : [ÉTUDE 001](../etudes/ETUDE-001-clarifier-et-faire-evoluer.md), section 14 (« et bien d'autres »)

---

## 1. Objectif

Trouver et corriger tout ce qui **déborde** ou est **coupé** sur un téléphone, sur tous les écrans principaux.

## 2. La méthode (pour la refaire seul)

1. Lancer le web : `npx expo start --web`, ouvrir `http://localhost:8081`.
2. Mettre la fenêtre à la taille d'un téléphone : **F12** › icône téléphone (« Toggle device toolbar ») › largeur **360**.
3. Dans la console (onglet **Console** de F12), coller ce petit détecteur, puis l'appeler sur chaque écran :

```js
window.__scan = () => {
  const W = window.innerWidth;
  const out = [];
  for (const el of document.querySelectorAll('div,span')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    const text = el.textContent.trim().slice(0, 40);
    if (r.right > W + 1 && r.left < W) out.push('DÉBORDE ' + Math.round(r.right) + ' : ' + text);
    else if (el.scrollWidth > el.clientWidth + 2 && (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden')) out.push('COUPÉ : ' + text);
  }
  return [...new Set(out)];
};
window.__scan();
```

4. Regarder aussi chaque écran à l'œil : le détecteur ne voit pas tout (un texte trop petit, un bouton trop près d'un autre).

## 3. Ce qui a été passé en revue (23 novembre 2026, 360 px)

| Écran | Détecteur | À l'œil | Résultat |
|---|---|---|---|
| Accueil | rien | — | bon |
| À faire (fiche 015) | « Nouvelle chose à faire » coupé | le bouton flottant est trop long | **corrigé** (étape 4) |
| Planning | un élément dépasse de 16 px | l'en-tête pousse la flèche droite hors de l'écran ; « Agen… », « Journ… », « Semaine (… » coupés | **corrigé** (étapes 1 à 3) |
| Proches | rien | — | bon |
| Pulse | rien | — | bon |
| Réglages (accueil et 4 sections) | rien | — | bon |
| Saisie rapide, Focus, Maintenant, Bilan, Recherche, Objectifs, Habitudes | rien | — | bon |
| Formulaires À faire, Moment, Personne, Rappel (fiche 014) | rien | — | bon |
| Fiche d'une tâche, fiche d'un rappel, ancienne liste des rappels | rien | — | bon |

En plus : la barre de filtre (commune à À faire, Planning, Proches) ne disait pas aux lecteurs d'écran quel bouton est choisi : **corrigé** (étape 5).

**Pas passé en revue** : le Sanctuaire (verrouillé par code), la fiche d'un moment et la fiche d'une personne (pas ouvertes) ; le thème clair. Le téléphone réel peut encore montrer autre chose : le texte agrandi dans les réglages d'accessibilité d'Android, par exemple.

## 4. Étapes

### Étape 1 — L'en-tête du Planning

Dans `src/styles/tabs/calendar-styles.ts` :

<!-- bloc: cal-style-1-avant -->

```ts
    headerTitleCol: {
      gap: 2,
    },
```

<!-- bloc: cal-style-1-apres -->

```ts
    headerTitleCol: {
      gap: 2,
      // The title takes what the buttons leave: on a phone they are never pushed out (sheet 016)
      flex: 1,
      minWidth: 0,
    },
```

<!-- bloc: cal-style-2-avant -->

```ts
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
```

<!-- bloc: cal-style-2-apres -->

```ts
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      flexShrink: 0,
    },
```

Dans `src/app/(tabs)/calendar.tsx`, le sous-titre (la date) sur deux lignes au plus, plutôt que coupé (vu : « Lundi 23 Nove… » avec une seule ligne) :

<!-- bloc: cal-1-avant -->

```tsx
          <Text style={styles.subtitle}>
            {viewMode === 'week'
```

<!-- bloc: cal-1-apres -->

```tsx
          <Text style={styles.subtitle} numberOfLines={2}>
            {viewMode === 'week'
```

### Étape 2 — La barre des vues du Planning

Toujours dans `src/app/(tabs)/calendar.tsx`, sans icônes (les mots ont besoin de la place) :

<!-- bloc: cal-2-avant -->

```tsx
            key: 'agenda',
            label: t('calendar.view.agenda'),
            count: events.length + reminders.length + tasks.length,
            icon: 'list-outline',
          },
          {
            key: 'timetable',
            label: t('calendar.view.day'),
            icon: 'time-outline',
          },
          {
            key: 'week',
            label: t('calendar.view.week'),
            icon: 'grid-outline',
          },
```

<!-- bloc: cal-2-apres -->

```tsx
            key: 'agenda',
            label: t('calendar.view.agenda'),
            count: events.length + reminders.length + tasks.length,
          },
          {
            key: 'timetable',
            label: t('calendar.view.day'),
          },
          {
            key: 'week',
            label: t('calendar.view.week'),
          },
```

### Étape 3 — « Semaine (7J) » devient « Semaine »

Dans `src/i18n/messages.ts` :

<!-- bloc: week-fr-avant -->

```ts
  'calendar.view.week': 'Semaine (7J)',
```

<!-- bloc: week-fr-apres -->

```ts
  'calendar.view.week': 'Semaine',
```

<!-- bloc: week-en-avant -->

```ts
  'calendar.view.week': 'Week (7D)',
```

<!-- bloc: week-en-apres -->

```ts
  'calendar.view.week': 'Week',
```

### Étape 4 — Le bouton flottant d'« À faire »

Dans `src/features/todo/TodoTabScreen.tsx` : le bouton dit « Ajouter », comme celui du Planning ; la phrase complète reste pour les lecteurs d'écran.

<!-- bloc: fab-avant -->

```tsx
      <GlassFloatingActionButton label={t('todoTab.add')} icon="add" onPress={() => router.push(addPath as never)} />
```

<!-- bloc: fab-apres -->

```tsx
      <GlassFloatingActionButton
        label={t('itemForm.save')}
        accessibilityLabel={t('todoTab.add')}
        icon="add"
        onPress={() => router.push(addPath as never)}
      />
```

### Étape 5 — La barre de filtre dit quel bouton est choisi

Dans `src/components/ui/PillTopBar.tsx` (sur le web, `accessibilityState` seul ne suffisait pas) :

<!-- bloc: pill-avant -->

```tsx
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
```

<!-- bloc: pill-apres -->

```tsx
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              aria-selected={isActive}
```

## 5. Test final

```bash
npx jest
npx tsc --noEmit
npx eslint "src/app/(tabs)/calendar.tsx" src/styles/tabs/calendar-styles.ts src/features/todo src/components/ui/PillTopBar.tsx
```

Puis le détecteur de l'étape 2 sur le Planning et sur À faire : **rien**. À l'œil : la flèche droite et les réglages du Planning sont visibles, « Agenda · Journée · Semaine » tiennent.

Pas de nouveau test automatique : ce sont des réglages d'affichage, vérifiés à l'écran par le détecteur.

## 6. Dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Un bouton d'en-tête sort de l'écran | Le titre n'a pas `flex: 1, minWidth: 0` | Même remède qu'aux étapes 1 (Planning) et 014 (formulaires) |
| Un texte de bouton est coupé (« … ») | Trop de choses dans le bouton (icône, nombre, long mot) | Retirer l'icône, raccourcir le mot, garder la phrase longue en `accessibilityLabel` |

## 7. Et après

Le tutoriel avant l'APK, puis l'APK de test.

## Compte rendu d'exécution (23 novembre 2026)

- Revue faite avec le détecteur de la section 2 sur 24 écrans à 360 px, et à l'œil sur ceux qu'il signalait.
- Étapes 1 à 5 appliquées **à partir des blocs de cette fiche** (`docs/fiches/outils/appliquer-fiche-016.js`).
- **Écart corrigé après l'avoir vu** : la date sous « Planning » était coupée (« Lundi 23 Nove… ») une fois les boutons protégés ; elle passe sur deux lignes au plus (étape 1).
- Après : le détecteur ne trouve plus rien sur le Planning ni sur À faire ; les boutons du Planning sont tous visibles ; « Agenda · Journée · Semaine » tiennent ; la barre de filtre dit aux lecteurs d'écran quel bouton est choisi.
- Tests : toute la suite `Test Suites: 91 passed`, `Tests: 1947 passed` ; `tsc` et `eslint` sans erreur.
- **Pas vérifié** : thème clair, Sanctuaire, fiches d'un moment et d'une personne, texte agrandi d'Android. Rien n'est encore enregistré dans git.
