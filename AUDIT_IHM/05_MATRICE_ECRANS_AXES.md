# 📊 AUDIT JUNIX PULSE — 05. MATRICE CROISÉE ÉCRANS × 26 AXES (PHASE 2)

> **Contrat méthodologique :** Chaque écran inventorié est évalué sur l'ensemble des 26 axes d'audit.  
> Statuts :  
> - **OK** : Évalué conforme (avec mention de la preuve minimale).  
> - **DÉFAUT [DEF-xx]** : Anomalie constatée et documentée dans `03_REGISTRE_DEFAUTS.md`.  
> - **N/A** : Non applicable au périmètre fonctionnel de l'écran (avec justification).

---

## 1. TABLEAU DE LA MATRICE (ÉCRANS MAJEURS ET TRANSVERSAUX)

| Écran / Route | 01. Visual | 02. Tokens | 03. IHM/Feedback | 04. Ergonomie/Fitts | 05. Intuitivité | 06. Onboarding | 07. Info density | 08. Doublons | 09. Boutons | 10. Accessibilité |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `_layout.tsx` | OK (racine) | OK (ThemeHook) | OK (Init) | N/A | OK (Neutre) | OK (Routage initial) | OK | OK (Unique) | N/A | OK (Routage) |
| `SplashAnimated.tsx` | **DÉFAUT [DEF-06]** | OK (Tokens) | OK (Fondu) | N/A | OK (Splash) | OK | OK | **DÉFAUT [DEF-06]** | N/A | OK (Accessible) |
| `(tabs)/_layout.tsx` | OK (GlassNav) | OK (Palettes) | OK (Feedback) | **DÉFAUT [DEF-06]** | OK (5 tabs) | N/A | OK | OK | OK (Tabs) | **DÉFAUT [DEF-05]** |
| `(tabs)/index.tsx` (Today) | OK (Midnight) | OK (Tokens) | OK (Snackbar) | OK (Large cards) | OK (Vue synthétique) | OK (Cartes claires) | OK (Équilibré) | OK | **DÉFAUT [DEF-07]** | OK (Vocalisé) |
| `(tabs)/tasks.tsx` | OK (GlassCard) | OK (Tokens) | OK (Coche tâche) | **DÉFAUT [DEF-08]** | OK (3 filtres) | N/A | OK | OK | OK (Filter chips) | OK (Labels) |
| `(tabs)/calendar.tsx` | **DÉFAUT [DEF-16]** | OK (Tokens) | OK (Changement jour) | OK (Ruban) | OK (Semaine) | N/A | OK | OK (Timetable) | **DÉFAUT [DEF-16]** | OK (Semaine) |
| `(tabs)/people.tsx` | OK (Cards) | OK (Tokens) | OK (Appel) | **DÉFAUT [DEF-08]** | OK (Relations) | N/A | OK | OK | OK (Action call) | OK (Labels) |
| `(tabs)/pulse.tsx` | **DÉFAUT [DEF-16]** | OK (Tokens) | OK (Accepter/Refuser)| OK | OK (IA locale) | N/A | OK | OK (Hub modules) | OK (Decisions) | OK (Labels) |
| `capture.tsx` | OK (Form) | OK (Tokens) | **DÉFAUT [DEF-09]** | OK | **DÉFAUT [DEF-10]** | N/A | OK | OK | OK (Validation) | OK (Saisie) |
| `sanctum.tsx` | OK (Midnight) | OK (Tokens) | OK (Lock/Unlock) | OK | OK (PIN/Bio) | N/A | OK | OK | OK (Actions) | **DÉFAUT [DEF-05]** |
| `search.tsx` | OK (List) | OK (Tokens) | OK (Temps réel) | OK | OK (Recherche) | N/A | OK | OK | OK | OK (TextInput) |
| `reminders/new.tsx` | OK (Form) | OK (Tokens) | OK (Validation) | OK | **DÉFAUT [DEF-14]** | N/A | OK | OK | **DÉFAUT [DEF-07]** | OK (Saisie) |
| `reminders/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Undo) | **DÉFAUT [DEF-08]** | OK (Actions) | N/A | OK | OK | **DÉFAUT [DEF-13]** | OK (Textes) |
| `reminders/edit/[id].tsx`| OK (Form) | OK (Tokens) | OK (Sauvegarde) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `tasks/new.tsx` | OK (Form) | OK (Tokens) | OK (Sous-tâches) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `tasks/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Coche) | **DÉFAUT [DEF-08]** | OK | N/A | OK | OK | **DÉFAUT [DEF-13]** | **DÉFAUT [DEF-05]** |
| `events/new.tsx` | OK (Form) | OK (Tokens) | OK (Heures) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `events/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Consultation) | OK | OK | N/A | OK | OK | **DÉFAUT [DEF-13]** | **DÉFAUT [DEF-05]** |
| `people/new.tsx` | OK (Form) | OK (Tokens) | OK (Validation) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `people/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Interactions) | OK | OK | N/A | OK | OK | **DÉFAUT [DEF-13]** | **DÉFAUT [DEF-05]** |
| `habits/index.tsx` | OK (List) | OK (Tokens) | OK (Streaks) | OK | OK | N/A | OK | OK | OK | OK (Textes) |
| `habits/new.tsx` | OK (Form) | OK (Tokens) | OK (Couleurs) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `habits/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Pause/Reprise)| OK | OK | N/A | OK | OK | **DÉFAUT [DEF-13]** | OK (Textes) |
| `goals/index.tsx` | OK (List) | OK (Tokens) | OK (Progression) | OK | OK | N/A | OK | OK | OK | OK (Textes) |
| `goals/new.tsx` | OK (Form) | OK (Tokens) | OK (Deadline) | OK | OK | N/A | OK | OK | OK | OK (Inputs) |
| `goals/[id].tsx` | OK (Detail) | OK (Tokens) | OK (Liaison) | OK | OK | N/A | OK | OK | **DÉFAUT [DEF-13]** | **DÉFAUT [DEF-05]** |
| `settings/index.tsx` | OK (List) | OK (Tokens) | **DÉFAUT [DEF-02]** | OK | **DÉFAUT [DEF-02]** | N/A | OK | OK | **DÉFAUT [DEF-13]** | OK (Labels) |
| `settings/schedule.tsx` | OK (Grid) | OK (Tokens) | OK (7 jours) | OK | **DÉFAUT [DEF-02]** | N/A | OK | OK | **DÉFAUT [DEF-13]** | **DÉFAUT [DEF-05]** |
| `(onboarding)/[1-5]` | OK (Stitch) | OK (Tokens) | OK (Étapes) | OK (Plein écran) | OK (Pédagogie) | OK (Parcours fluide)| OK | OK | OK (CTA) | OK (Inter/Outfit) |

---

## 2. SUITE DE LA MATRICE (AXES 11 À 20 : SÉCURITÉ, TEMPS, CODE, PERFORMANCE)

| Écran / Route | 11. Diversité | 12. Menaces/Sécu | 13. Vie privée | 14. Temps/Notifs | 15. Langue/Micro | 16. Navigation | 17. Architecture | 18. Qualité Code | 19. Fluidité/FPS | 20. Robustesse |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `_layout.tsx` | OK | OK | OK | OK (Init canal) | OK (Français) | OK (Stack) | OK (Clean Arch) | OK (TypeScript 0) | OK (60 FPS) | OK (Offline) |
| `SplashAnimated.tsx` | OK | OK | OK | N/A | OK (Français) | OK (Transition) | OK | OK | OK | OK |
| `(tabs)/_layout.tsx` | OK | OK | OK | N/A | OK (Français) | OK (Tabs) | OK | OK | OK | OK |
| `(tabs)/index.tsx` | OK | OK | OK | **DÉFAUT [DEF-03]** | OK (Français) | OK | OK | OK | OK (FlatList) | OK |
| `(tabs)/tasks.tsx` | OK | OK | OK | OK (Date filtre) | OK (Français) | OK | OK | OK | OK (FlatList) | OK |
| `(tabs)/calendar.tsx` | OK | OK | OK | OK (Semaine) | OK (Français) | OK | OK | OK | OK (Virtualisé) | OK |
| `(tabs)/people.tsx` | OK | OK | OK | OK (30j seuil) | OK (Français) | OK | OK | OK | OK (FlatList) | OK |
| `(tabs)/pulse.tsx` | OK | OK | OK | OK (Suggestions) | OK (Français) | OK | OK | OK | OK | OK |
| `capture.tsx` | OK | OK | OK | **DÉFAUT [DEF-09]** | **DÉFAUT [DEF-10]** | OK | OK | OK | OK | OK |
| `sanctum.tsx` | OK | **DÉFAUT [DEF-01]** | **DÉFAUT [DEF-01]** | N/A | OK (Français) | OK | OK | OK | OK | OK |
| `search.tsx` | OK | OK | OK | N/A | OK (Français) | OK | OK | OK | OK | OK |
| `reminders/new.tsx` | OK | OK | OK | **DÉFAUT [DEF-04]** | OK (Français) | OK | OK | OK | OK | OK |
| `reminders/[id].tsx` | OK | OK | OK | **DÉFAUT [DEF-04]** | OK (Français) | OK | OK | OK | OK | OK |
| `reminders/edit/[id]` | OK | OK | OK | **DÉFAUT [DEF-15]** | OK (Français) | OK | OK | OK | OK | OK |
| `tasks/new.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `tasks/[id].tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `events/new.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `events/[id].tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `people/new.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `people/[id].tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `habits/index.tsx` | OK | OK | OK | OK (Streaks) | OK (Français) | OK | OK | OK | OK | OK |
| `habits/new.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `habits/[id].tsx` | OK | OK | OK | OK (Pauses) | OK (Français) | OK | OK | OK | OK | OK |
| `goals/index.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `goals/new.tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `goals/[id].tsx` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |
| `settings/index.tsx` | OK | **DÉFAUT [DEF-02]** | **DÉFAUT [DEF-02]** | OK | OK (Français) | OK | OK | OK | OK | OK |
| `settings/schedule` | OK | OK | OK | OK (Blocs Lun-Dim)| OK (Français) | OK | OK | OK | OK | OK |
| `(onboarding)/[1-5]` | OK | OK | OK | OK | OK (Français) | OK | OK | OK | OK | OK |

---

## 3. SUITE DE LA MATRICE (AXES 21 À 26 : TESTS, OUTILS, ANIMATION, IDENTITÉ)

| Écran / Route | 21. Tests Unitaires | 22. Outils / Build | 23. Documentation | 24. Extras/Haptique | 25. Mouvement Réduit | 26. Identité & Logo |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `_layout.tsx` | OK (195 tests) | OK (CI) | OK (README) | OK (Status bar) | OK (Standard) | **DÉFAUT [DEF-06]** |
| `SplashAnimated.tsx` | OK (195 tests) | OK (Expo 57) | OK | N/A | OK (Statique si réduit) | **DÉFAUT [DEF-06]** |
| `(tabs)/_layout.tsx` | OK (Theme test) | OK (Expo 57) | OK | OK (Haptique tap) | **DÉFAUT [DEF-11]** | OK (Midnight) |
| `(tabs)/index.tsx` | OK (Rules test) | OK (Expo 57) | OK | OK | OK (GPU Glow) | OK (Electric duo) |
| `(tabs)/tasks.tsx` | OK (Task rules) | OK (Expo 57) | OK | OK | OK | OK |
| `(tabs)/calendar.tsx` | OK (Date rules) | OK (Expo 57) | OK | OK | OK | OK |
| `(tabs)/people.tsx` | OK (Person rules)| OK (Expo 57) | OK | OK | OK | OK |
| `(tabs)/pulse.tsx` | OK (Goal rules) | OK (Expo 57) | OK | OK | OK | OK |
| `capture.tsx` | OK (Use case test)| OK (Expo 57) | OK | OK | OK | OK |
| `sanctum.tsx` | OK (PIN rules) | OK (Expo 57) | OK | OK | OK | **DÉFAUT [DEF-06]** |
| `search.tsx` | OK (Filter test) | OK (Expo 57) | OK | OK | OK | OK |
| `reminders/new.tsx` | OK (Reminder rules)| OK (Expo 57) | OK | OK | OK | OK |
| `reminders/[id].tsx` | OK (Reminder rules)| OK (Expo 57) | OK | OK | OK | OK |
| `reminders/edit/[id]` | OK (Reminder rules)| OK (Expo 57) | OK | OK | OK | OK |
| `tasks/new.tsx` | OK (Task rules) | OK (Expo 57) | OK | OK | OK | OK |
| `tasks/[id].tsx` | OK (Task rules) | OK (Expo 57) | OK | OK | OK | OK |
| `events/new.tsx` | OK (Use case test)| OK (Expo 57) | OK | OK | OK | OK |
| `events/[id].tsx` | OK (Use case test)| OK (Expo 57) | OK | OK | OK | OK |
| `people/new.tsx` | OK (Person rules)| OK (Expo 57) | OK | OK | OK | OK |
| `people/[id].tsx` | OK (Person rules)| OK (Expo 57) | OK | OK | OK | OK |
| `habits/index.tsx` | OK (Habit rules) | OK (Expo 57) | OK | OK | OK | OK |
| `habits/new.tsx` | OK (Habit rules) | OK (Expo 57) | OK | OK | OK | OK |
| `habits/[id].tsx` | OK (Habit rules) | OK (Expo 57) | OK | OK | OK | OK |
| `goals/index.tsx` | OK (Goal rules) | OK (Expo 57) | OK | OK | OK | OK |
| `goals/new.tsx` | OK (Goal rules) | OK (Expo 57) | OK | OK | OK | OK |
| `goals/[id].tsx` | OK (Goal rules) | OK (Expo 57) | OK | OK | OK | OK |
| `settings/index.tsx` | OK (Settings test)| OK (Expo 57) | OK | OK | OK | OK |
| `settings/schedule` | OK (Use case test)| OK (Expo 57) | OK | OK | OK | OK |
| `(onboarding)/[1-5]` | OK (Stitch test) | OK (Expo 57) | OK | OK | OK | **DÉFAUT [DEF-06]** |
