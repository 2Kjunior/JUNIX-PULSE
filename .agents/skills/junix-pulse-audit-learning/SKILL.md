---
name: junix-pulse-audit-learning
description: Guide l'audit, la reconstruction et l'implementation pedagogique de Junix Pulse avec Expo SDK 57, TypeScript, Expo Router, SQLite, Zustand et regles metier explicites. Utiliser pour reprendre une fonctionnalite, auditer un module, corriger une anomalie, ou avancer dans la feuille de route sans generer du code que l'utilisateur ne peut pas expliquer.
---

# JUNIX PULSE - Audit, reconstruction et apprentissage

## Contrat de travail

Traiter le projet comme un parcours de reconstruction autonome : l'IA accelere l'analyse et la production, mais l'utilisateur doit pouvoir expliquer chaque changement.

Avant tout code :

1. Lire `AGENTS.md`, les instructions locales et les docs Expo SDK 57 necessaires.
2. Identifier l'ancre locale : fichier, symbole, test, erreur ou comportement signale.
3. Lire le code appelant et appele immediatement pertinents.
4. Formuler une hypothese falsifiable sur la cause ou le comportement attendu.
5. Choisir un controle peu couteux capable de l'infirmer : test, typecheck, reproduction ou inspection ciblee.
6. Verifier les decisions produit verrouillees avant de proposer un changement.

Ne jamais presenter une fonctionnalite comme faite uniquement parce qu'un ecran existe. Exiger une preuve adaptee : comportement verifie, regle metier testee, donnees persistantes confirmees et validation TypeScript.

## Boucle obligatoire pour chaque fonctionnalite

Executer les etapes dans cet ordre, en s'arretant aux points de participation de l'utilisateur :

1. **Concept** - expliquer le probleme, le vocabulaire, la regle metier et le flux de donnees en langage clair.
2. **Exemple minimal** - montrer un petit extrait isole avant d'introduire le code du projet.
3. **Lecture guidee** - expliquer chaque nouveau concept, son role et les alternatives raisonnablement ecartees.
4. **Construction incrementale** - modifier de petits blocs, avec une seule unite de sens par iteration.
5. **Participation utilisateur** - demander a l'utilisateur de modifier ou completer une petite partie avant de poursuivre.
6. **Erreur expliquee** - si une erreur apparait, reproduire ou lire le diagnostic, expliquer la cause racine, puis corriger avec l'utilisateur.
7. **Rappel actif** - demander de reconstruire une partie ou de repondre a une question sans copier.
8. **Validation** - proposer un mini-exercice ou une question fermee, puis executer le controle technique le plus etroit.
9. **Integration** - relier domaine, use case, repository, store et ecran uniquement quand leurs contrats sont compris.
10. **Commit prepare** - formuler le changement en une phrase et proposer un message Git clair. Ne jamais committer sans confirmation explicite.

Si l'utilisateur demande explicitement une implementation urgente, conserver au minimum l'explication du concept, une petite tranche de code, un controle technique et une explication de la correction. Ne pas generer silencieusement un module entier.

## Limites de changement

- Ne pas generer plus d'un nouveau fichier substantiel sans validation intermediaire.
- Ne pas refactorer silencieusement plus de trois fichiers.
- Chaque changement doit correspondre a une unite de sens : regle metier, ecran, flux de donnees, migration ou correction.
- Justifier toute nouvelle dependance avant installation.
- Ne pas reconstituer un diagramme, une decision produit ou une terminologie verrouillee sans raison documentee.
- Preferer les abstractions et conventions deja presentes dans le depot.

## Ordre d'audit d'un module

Pour un module existant, suivre cette sequence :

1. Lire les types et enums du domaine.
2. Lire les regles metier et identifier les invariants.
3. Tracer le flux use case -> repository -> SQLite ou store -> ecran.
4. Comparer l'implementation aux regles et aux appelants reels.
5. Chercher le code mort, les doublons de persistance, les effets de bord et les erreurs silencieuses.
6. Ecrire ou proposer le plus petit test qui distingue le comportement actuel du comportement attendu.
7. Corriger la cause racine, puis relancer le meme controle.
8. Documenter ce qui a ete prouve, ce qui reste a verifier et comment modifier la fonctionnalite.

Pour une correction de regle metier, tester au minimum les cas nominal, limite, invalide et transition temporelle pertinents. Pour une migration SQLite, verifier la version, l'idempotence, les cles etrangeres et le comportement sur une base existante.

## Invariants produit a preserver

Conserver la distinction suivante :

- **Reminder** : action a ne pas oublier a un moment precis.
- **Task** : action a accomplir, sans horaire obligatoire.
- **Event** : periode avec debut et fin, potentiellement des participants.
- **Person** : relation suivie avec historique et prochaine interaction.
- **Habit** : comportement repete suivi dans le temps.
- **Goal** : regroupement de taches avec progression calculee.
- **Suggestion** : proposition jamais appliquee automatiquement.

La personne reste le centre du produit. Le moteur de suggestion propose, mais ne decide pas. Ne pas transformer ces entites en un terme generique de type `Item` sans decision explicite.

Pour les rappels, traiter la recurrence, le rappel manque et le snooze comme des regles testables. Le snooze doit conserver ses trois formes metier : duree rapide, lendemain a la meme heure (+24 h), et date/heure personnalisee. Toute modification de signature doit etre repercutee jusqu'aux appelants UI et validee par TypeScript.

## Stack et points de controle

Respecter la stack existante : TypeScript, React Native + Expo SDK 57, Expo Router, Zustand, expo-sqlite avec migrations versionnees, Zod/React Hook Form lorsque deja utilise, et expo-notifications pour les notifications locales.

Lors d'une implementation :

- utiliser les routes existantes et leurs layouts avant d'en creer de nouvelles ;
- traiter `src/database/sqlite.ts` et `src/database/migrations.ts` comme la persistance officielle ;
- passer par les repositories et use cases existants plutot que d'acceder directement a SQLite depuis les ecrans ;
- verifier les diagnostics avec `npx tsc --noEmit` ou le script de validation le plus cible disponible ;
- distinguer notification locale et push distant, notamment dans Expo Go ;
- verifier les permissions, chargements, erreurs, et etats vides d'un ecran avant de le declarer termine.

## Design system verrouille (source : HTML Stitch inspecte directement)

Regle generale : les fichiers HTML de l'export Stitch servent de reference de
STRUCTURE et de TECHNIQUE, jamais de source de verite pour les valeurs
hexadecimales. Chaque export HTML derive legerement sa propre palette. La
palette officielle reste celle deja implementee dans `src/constants/theme.ts`.

### Logo et ecran de lancement

Reference unique : `ex_01_first_launch_splash/code.html`. Ne jamais
reinterpreter librement cette specification.

- Un seul `<path>` SVG, longueur totale 280 unites, degrade lineaire
  `#D0BCFF -> #A078FF -> #4CD7F6`.
- Animation de tracage : `stroke-dasharray: 280`, `stroke-dashoffset` anime de
  280 a 0 sur 920ms, easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- Halo synchronise derriere le trait pendant le tracage (opacity 0 -> 0.22,
  scale 1 -> 1.18).
- Apres le trace : settle (scale 1.02 -> 1, 360ms) puis boucle de repos toutes
  les 2.4s, double battement scale 1 -> 1.035 -> 1 -> 1.02 -> 1.
- Respecte `prefers-reduced-motion` : etat final statique si actif.
- S'affiche a CHAQUE lancement (pas uniquement la premiere fois), pendant
  l'initialisation DB/fonts dans `_layout.tsx`.
- Texte generique obligatoire : "JUNIX PULSE" / "Preparation de votre
  rythme" -- jamais un texte specifique a un module (le fichier source
  affiche par erreur "Sanctum Calibrating", a corriger).
- Icone d'application (asset statique app.json) = version figee a un seul
  frame de ce meme trace. Les icones systeme ne peuvent pas etre animees.

### Boutons -- recettes exactes trouvees dans le code

**Bouton primaire (CTA degrade)** -- vu dans `ex_03b`, `ex_05` :

- Fond : degrade lineaire violet -> cyan (nos tokens : Electric Violet ->
  Digital Cyan), jamais plus d'un bouton degrade par ecran.
- Texte : blanc, semi-bold, taille petite a moyenne selon contexte.
- Padding : environ 14px horizontal / 6px vertical pour un bouton compact,
  plus genereux (20-24px / 12px) pour un CTA pleine largeur.
- Rayon : 12px (equivalent Tailwind `rounded-xl`) pour un bouton standard,
  pill/`rounded-full` pour un bouton avec icone + label court (ex : "+
  Nouveau").
- Ombre : ombre portee teintee de la couleur du bouton (`shadow-electric/25`),
  jamais une ombre noire generique.
- Etat presse : scale a 95% (`active:scale-95`), retour instantane au
  relachement -- coherent avec la regle de micro-interaction deja definie.
- Etat survole/actif clavier (desktop only, non prioritaire mobile) :
  eclaircissement leger (`brightness-110`).

**Bouton secondaire / fantome** :

- Fond sombre uni ou transparent, bordure fine `1px solid` sur un gris
  fonce (`border-slate-800`), texte clair.
- Meme rayon que le primaire (12-16px), jamais de degrade.

**Segmented control** (ex : bascule Jour/Semaine/Matrice) :

- Conteneur : fond sombre uni, padding interne ~4px, rayon 12px
  (`rounded-xl`), bordure fine.
- Segment actif : fond violet plein, texte blanc, memes coins arrondis
  que le conteneur moins le padding.
- Segment inactif : transparent, texte gris clair.

**Bouton icone seul** (ex : filtre, reglages) :

- Cercle ou carre a coins tres arrondis, fond `midnight.card`, icone
  centree, taille de cible tactile minimum 44x44px meme si l'icone
  visible est plus petite.

### Cartes et glassmorphism -- recette exacte

Deux niveaux de verre, jamais plus, avec une hierarchie stricte :

- **`.glass-card`** (cartes de contenu, niveau standard) :
  `background: rgba(17, 19, 26, 0.75)`, `backdrop-filter: blur(16px)`,
  bordure `1px solid rgba(255, 255, 255, 0.07)`.
- **`.glass-nav`** (navigation flottante, modales -- niveau eleve) :
  `background: rgba(12, 14, 21, 0.88)`, `backdrop-filter: blur(20px)`,
  bordure superieure `1px solid rgba(255, 255, 255, 0.08)`.
- Les listes d'elements (rappels, taches, timeline) utilisent une variante
  de `.glass-card` avec une **bordure gauche coloree** de 2 a 4px indiquant
  la categorie (ex : jaune = biologique/routine, bleu = focus, vert =
  decompression, violet = nocturne/prive) -- ce code couleur par bordure
  gauche est un pattern reutilisable pour toutes nos listes categorisees.
- Ne jamais appliquer `.glass-card` a plus de la moitie des elements
  visibles sur un meme ecran (regle anti-cliche deja verrouillee).

### Badges et chips

- Forme : `rounded-full`, padding tres reduit (`px-1.5 py-0.5`).
- Texte : tres petit (8-10px), majuscules, `font-black`, `tracking-wider`
  (espacement des lettres augmente pour la lisibilite a cette taille).
- Utilises pour : statut ("AUJOURD'HUI", "Optimal", "Critique"), categorie
  ("Perso", "Sync Team"), priorite.
- Couleur de fond = couleur semantique de l'etat, jamais violet/cyan par
  defaut (ces deux couleurs restent reservees a l'accent principal).

### Rayons de bordure -- table de reference (echelle Tailwind standard)

| Element                          | Rayon   | Equivalent Tailwind     |
| -------------------------------- | ------- | ----------------------- |
| Carte de contenu                 | 16px    | `rounded-2xl`           |
| Bouton standard / segmented ctrl | 12px    | `rounded-xl`            |
| Champ de saisie                  | 12px    | `rounded-xl`            |
| Badge / chip / bouton pill       | complet | `rounded-full`          |
| Bottom sheet (coins hauts)       | 24-28px | proche de `rounded-3xl` |
| Case jour (calendrier, inactive) | 16px    | `rounded-2xl`           |

### Calendrier -- structure reutilisable (source : ex_05)

Adopter la STRUCTURE, remplacer tout le contenu "circadien/biometrique"
fabrique (phases neuronales, VFC, "vigilance") par nos vraies entites
(Event, Task, Reminder) :

- Bandeau de 7 jours en haut, cases `w-14 h-20`, coins `rounded-2xl`.
  Jour actif : bordure/fond violet + badge pill "AUJOURD'HUI" flottant
  au-dessus. Jours inactifs : opacite reduite (~70%).
- Sous-titre optionnel sous chaque numero de jour -- a utiliser pour un
  indicateur reel (ex : nombre d'evenements ce jour), jamais une fausse
  donnee physiologique.
- Segmented control Jour/Semaine/Mois juste sous le bandeau (voir section
  Boutons).
- Bouton "+ Nouveau" en haut a droite, style pill degrade compact.
- Timeline verticale en dessous : chaque entree = carte glass avec bordure
  gauche coloree par categorie, marqueur circulaire sur l'axe temporel a
  gauche, heure affichee, badge de statut en haut a droite de la carte,
  titre, description courte, ligne d'action en bas (bouton ou metrique).
- Un composant "minuteur circulaire" avec preset de durees en chips
  (equivalent a notre Focus/Pomodoro, deja classe V2) peut reutiliser
  exactement ce meme style de carte + segmented control de durees.

### Incoherence de navigation trouvee -- regle a appliquer strictement

Trois barres de navigation differentes ont ete vues dans l'export Stitch
selon l'ecran genere :
`Pulse / Taches / Calendrier / Contacts / Sanctum`,
`Accueil / Calendrier / Deep Work / Sante / Profil`, et notre propre
reference verrouillee `Aujourd'hui / Taches / Calendrier / Personnes /
Pulse`. Chaque ecran Stitch a improvise sa propre barre selon son contexte
de demo.

Regle : ignorer systematiquement la barre de navigation montree dans un
fichier HTML source individuel. Utiliser uniquement les 5 destinations
verrouillees, sans exception, quel que soit l'ecran genere ou l'agent qui
le produit.

### Animations concretes trouvees (a reutiliser telles quelles)

```css
@keyframes pulseGlow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.45;
    filter: blur(20px);
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
    filter: blur(28px);
  }
}
/* halo respirant en fond -- 4.5s, boucle infinie, ease-in-out */

@keyframes slowOrbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
/* rotation lente decorative -- 24s, lineaire, boucle infinie */
```

Utiliser `pulseGlow` pour l'orbe IA Pulse et le halo derriere le logo au
lancement. Utiliser `slowOrbit` avec parcimonie (un seul element par ecran
maximum, jamais sur un ecran charge en contenu) -- coherent avec la regle
de restriction deja verrouillee (pas plus d'un element en mouvement
ambiant simultane par ecran).

### Typographie -- configuration exacte

Inter partout en texte courant ; Outfit reserve aux titres d'ecran et aux
moments d'onboarding -- corrige le cliche "Inter partout" identifie comme
signature de design generique IA.

## Sortie attendue a chaque etape

Repondre avec une synthese courte contenant :

- **Hypothese** : ce qui est suppose et comment le verifier.
- **Comprendre** : concept et regle metier en jeu.
- **Tranche suivante** : le plus petit changement propose.
- **Participation** : ce que l'utilisateur doit lire, modifier ou reconstruire.
- **Preuve** : commande, test ou observation qui valide la tranche.
- **Suite** : ce qui est debloque et ce qui reste explicitement ouvert.

Ne cocher une etape de feuille de route qu'apres son critere de validation. Ne pas confondre compilation, presence d'une route et fonctionnalite effectivement verifiee.

## Exemple de declenchement

> Reprends l'audit de `reminder-use-cases.ts`. Commence par m'expliquer la regle de snooze, propose un test minimal, puis avance par petits blocs en me laissant reconstruire la signature avant de modifier l'ecran.
