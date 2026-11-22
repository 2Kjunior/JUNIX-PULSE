# ÉTUDE 001 — Clarifier, organiser et faire évoluer Junix Pulse

Date : 22 novembre 2026 · Statut : **hiérarchie validée, ordre de N1 à confirmer** (section 10)

Cette étude reprend tous les points de ton message, dit ce que le code fait **aujourd'hui**, propose **plusieurs approches** pour chacun, et une **hiérarchie** à valider. Le principe que tu as mis en avant (tout doit pouvoir évoluer sans casser) passe en premier, parce qu'il conditionne tout le reste.

---

## 0. Le principe qui guide tout : ajouter et retirer sans casser

Ce que le projet fait déjà bien :
- les migrations de base de données **ajoutent** sans jamais effacer (règle testée) ;
- les sauvegardes acceptent les anciennes versions (valeurs par défaut) ;
- les couches sont séparées : règles pures (`domain/rules`), base (`repositories`), actions (`use-cases`), écrans (`app/`).

Ce qui manque pour que les évolutions futures se branchent sans risque :

| Brique | Rôle | Exemple concret |
|---|---|---|
| **Registre des types d'éléments** | Un seul endroit qui décrit chaque type (rappel, tâche, événement… et demain d'autres) : son nom, son icône, ses champs, s'il sonne, s'il se coche, s'il se déplace dans le planning | Ajouter un type « Rendez-vous médical » = ajouter une entrée au registre, pas modifier 15 écrans |
| **Interrupteurs de fonctions** (« modules ») | Chaque grande fonction peut être activée ou retirée d'un endroit : gestes, dictée, partage, alarme plein écran… | Une fonction qui déplaît aux utilisateurs se coupe sans toucher au reste |
| **Champs optionnels décrits, pas codés en dur** | Les formulaires sont fabriqués à partir de la description du type (registre) | Ajouter un champ « Lieu » à la tâche = une ligne dans le registre |
| **Événements internes** (déjà amorcés avec le bus de la mascotte) | « Élément créé », « élément fait », « personne contactée »… diffusés à qui veut les écouter | Les notifications, la mascotte, le widget et demain le partage écoutent sans se connaître |
| **Préparation au cloud** | Identifiants uniques (déjà fait), date de modification (déjà fait), **propriétaire** et **version** de chaque élément (à ajouter) | Le jour du partage, rien n'est à refaire dans la base |

**Approches**
- **0-A, progressive** (recommandée) : on crée le registre et les interrupteurs **en même temps** que la première fonction qui en a besoin (clarification des types, point 1), puis chaque nouveauté s'y branche.
- **0-B, d'abord le socle** : on construit tout le socle avant toute nouveauté. Plus propre sur le papier, mais plusieurs semaines sans rien de visible.
- **0-C, rien de spécial** : on continue comme avant. Rapide au début, coûteux à chaque ajout ensuite. Déconseillé, vu ta demande.

---

## 1. Rappel, tâche, événement : qu'est-ce qui les différencie ?

**Ce que le code fait aujourd'hui**

| | Rappel | Tâche | Événement |
|---|---|---|---|
| Définition dans le code | Une **heure précise** où l'appli te **notifie** | Une chose **à faire**, qui se **coche**, avec ou sans jour, échéance possible | Un **moment** avec **début et fin**, lieu, personnes |
| Sonne ? | Oui | Non | **Non** (aucune notification n'est programmée pour un événement) |
| Se coche ? | Oui (« Terminer ») | Oui | Non |
| Personnes, étiquettes | Oui | Oui | Oui |
| Particularités | Action (appeler, message…), répétition, rappel à confirmer | Sous-tâches, durée estimée, échéance, objectif | Lieu, temps de trajet, « libre / occupé » |

Ce qui crée la confusion : un rappel peut avoir l'action « Faire » (donc ressembler à une tâche), une tâche peut avoir un jour (donc ressembler à un rappel), et l'événement, qui est le cœur de l'appli, **ne prévient jamais**. Tu ne te trompes pas : la frontière n'est pas claire, même dans le code.

**Approches**

- **1-A, garder les trois, mieux les expliquer**
  - Un seul bouton « Nouveau » qui demande d'abord « C'est quoi ? » avec un exemple sous chaque choix : *Me faire penser à… (rappel)* · *Une chose à faire (tâche)* · *Un moment avec une heure de début et de fin (événement)*.
  - Les événements prennent enfin des **alertes** (voir point 6).
  - Impact : faible, aucune donnée ne change.
- **1-B, deux familles seulement** : « **À faire** » (une tâche, qui peut avoir une alerte à une heure : le rappel devient une option) et « **Moment** » (l'événement, avec ses alertes).
  - C'est ce que font Google Agenda / Tasks et Apple Rappels.
  - Plus simple pour l'utilisateur, mais il faut fusionner rappels et tâches dans la base (migration, sauvegardes, notifications à reprendre).
  - Impact : fort.
- **1-C, un seul « élément » à options** (heure ? durée ? à cocher ? qui sonne ?) : le plus souple, le plus abstrait pour l'utilisateur, et le plus lourd à faire.

**Recommandation** : **1-A maintenant**, construit sur le registre (0-A), qui prépare **1-B plus tard** si les utilisateurs le demandent. Avec le registre, le passage à 1-B devient une évolution et non une réécriture.

---

## 2. Les formulaires : trop de champs, des champs mal placés, et la dictée partout

**Ce que le code fait aujourd'hui**
- Trois formulaires construits séparément (rappel, tâche, événement), avec un ordre et des styles différents.
- Événement : le champ **« temps de trajet »** est toujours proposé, même sans lieu. Il ne sert qu'à une ligne dans le planning et à un message de Pulse **si l'appli est ouverte** : il ne prévient pas de partir. Ta remarque est juste.
- La dictée n'existe que dans la capture rapide.

**Approches**
- **2-A, nettoyer les trois formulaires**
  - Même ordre partout : *Quoi* (titre, avec micro) → *Quand* → *Avec qui* → *Plus d'options* (repliées).
  - « Temps de trajet » n'apparaît **qu'une fois un lieu saisi**, renommé « **Partir … min avant** », et il **déclenche une alerte de départ** (« Pars maintenant pour arriver à 15 h »).
  - Le micro est ajouté dans le titre et les notes de chaque formulaire, avec le même outil que la capture rapide.
- **2-B, un seul formulaire fabriqué par le registre** (0-A) : chaque type déclare ses champs, et un seul composant les dessine. Même résultat visible que 2-A, mais les ajouts futurs se font sans toucher aux écrans.
- **2-C, tout passer par la capture rapide** (une phrase, l'appli remplit) et garder les formulaires pour corriger. Pratique, mais ne remplace pas des formulaires clairs.

**Recommandation** : **2-B**, en commençant par le formulaire d'événement, puis tâche, puis rappel.

---

## 3. Les gestes cachés (glisser une carte pour modifier ou supprimer)

**Aujourd'hui** : glisser vers la gauche ou la droite ouvre des actions, mais rien ne l'indique. On le découvre par hasard.

**Approches** (elles se combinent)
- **3-A, Pulse le montre une fois** : la première fois qu'une liste a des cartes, Pulse dit « Glisse une carte pour la modifier ou la supprimer », et la première carte **s'entrouvre seule** une seconde pour montrer les boutons. Une seule fois (le guide de Pulse sait déjà ne montrer qu'une fois).
- **3-B, un bouton visible** « ⋯ » sur chaque carte, qui ouvre les mêmes actions. Indispensable pour l'accessibilité (TalkBack ne glisse pas).
- **3-C, appui long** = menu des actions. C'est un réflexe courant sur Android.

**Recommandation** : **3-A + 3-B**. 3-C entre en conflit avec le glisser-déposer du planning (point 4) : à réserver au planning.

---

## 4. Déplacer une activité dans le planning, sans passer par le formulaire

**Aujourd'hui** : le planning a trois affichages, *Agenda* (liste), *Emploi du temps* (journée en grille) et *Semaine*. Il n'y a **pas de vue Mois**. Changer l'heure d'un élément oblige à ouvrir son formulaire.

**Ce que tu demandes** : appui long sur une carte → elle se soulève → on la fait glisser à une autre heure ou un autre jour → elle se pose. Dans toutes les vues.

**Approches**
- **4-A, toutes les vues d'un coup** : semaine, jour, mois (à créer) et agenda. C'est long, risqué, et tout arrive en même temps.
- **4-B, par étapes** (recommandée) :
  1. vue **Jour** (grille horaire), avec pas de 15 min ;
  2. vue **Semaine** (jour + heure) ;
  3. nouvelle vue **Mois** (déplacer vers un autre jour, l'heure est gardée).

  À chaque dépôt : vibration légère et message « Déplacé à 15:30 · Annuler ». Pour un élément **qui se répète** : « Seulement celui-ci ou tous ? ».
- **4-C, sans glisser** : appui long → « Déplacer » → choisir l'heure dans une petite roue. Plus simple et plus accessible, mais moins direct.

Les bibliothèques nécessaires (gestes et animations) sont **déjà installées**. Il faut décider quels éléments se déplacent : événements et tâches planifiées, et les rappels (cela change leur heure de notification, qu'il faut reprogrammer).

---

## 5. Partager, faire participer, travailler à plusieurs (organisations)

C'est le plus gros chantier, et il change la nature de l'appli : aujourd'hui **tout reste sur le téléphone** (« aucune donnée n'est envoyée à des serveurs tiers », c'est écrit dans les Paramètres).

**Ce que ça demande, quelle que soit l'approche** :
- **comptes** (identifier chaque utilisateur) ;
- **un serveur** (cloud) qui fait le relais ;
- la **synchronisation** (et les conflits quand deux personnes modifient en même temps) ;
- le **consentement** (la personne accepte ou refuse) ;
- la **confidentialité**, avec idéalement un chiffrement de bout en bout ;
- un **coût** de serveur et des **règles légales** (RGPD, données personnelles).

**Approches**, de la plus légère à la plus complète :
- **5-A, partager sans compte** : envoyer un événement ou une tâche par WhatsApp, SMS ou mail sous forme d'invitation (fichier d'agenda standard `.ics`, ou lien qui l'ajoute dans Junix chez l'autre). Pas de serveur, pas de synchronisation : la copie de l'autre ne bouge plus ensuite. **Faisable maintenant**, utile tout de suite.
- **5-B, éléments partagés avec comptes** : j'invite une personne qui a l'appli. Elle **accepte** et l'élément apparaît chez elle. Les modifications se synchronisent dans les deux sens. Il faut le cloud.
- **5-C, espaces de travail (organisations)** : sur 5-B, un « espace » (famille, association, entreprise) avec des **rôles** (responsable, membre, invité), des projets, et l'attribution des tâches, événements et rappels à des membres depuis le formulaire. C'est un produit à part entière.

**Recommandation**
- **5-A bientôt.**
- **Préparer 5-B dès maintenant** dans la base (point 0 : propriétaire, version) sans rien activer.
- Décider ensemble du **cloud** (fournisseur, coût, chiffrement) **avant** 5-B.
- 5-C ensuite, comme extension de 5-B, pas avant.

**À trancher ensemble** : l'appli reste-t-elle utilisable **sans compte** (recommandé, fidèle à « local d'abord »), le compte ne servant qu'au partage ?

---

## 6. Les notifications : le vrai point faible

**Ce que le code fait aujourd'hui**
- Les **rappels** notifient : titre, son, vibration, boutons Terminer / Plus tard.
- Les **événements ne notifient pas du tout**. C'est le manque le plus important, vu le but de Junix.
- Les canaux Android existent (rappels avec son, silencieux, récapitulatif du jour), mais tous les rappels ont **la même importance** et **le même son**.

**Ce que tu demandes**
- être prévenu d'un événement (le sien, ou celui d'une personne) avec **quand, où, avec qui**, sans ouvrir l'appli ;
- une **alerte façon réveil** : plein écran, sonnerie qui continue jusqu'à un geste ;
- une **hiérarchie** sonore et visuelle ;
- des **types d'événements** avec leur ton (un enterrement n'est pas une fête) ;
- la **gestion des sons** dans les Paramètres : sons de l'appli, sonneries du téléphone, musiques téléchargées.

**Approches**, par couches qui s'ajoutent :
- **6-A, les événements notifient** (indispensable) : « Dans 30 min · Dîner chez Paul · 12 rue X · avec Paul, Léa », avec boutons *Itinéraire* et *Appeler*. L'alerte de départ vient du « Partir … min avant » (point 2). Notification « étendue » qui montre tout sans ouvrir l'appli.
- **6-B, trois niveaux d'alerte**, choisis par élément (avec une valeur par défaut par type) :

  | Niveau | Son | Visuel | Exemple |
  |---|---|---|---|
  | **Discret** | aucun ou léger | notification simple | « Acheter du pain » |
  | **Normal** | son de Junix | notification étendue | « Réunion à 15 h » |
  | **Alarme** | sonnerie **qui continue** | **plein écran**, même téléphone verrouillé, geste pour arrêter | « Médicament », « Départ pour l'aéroport » |

- **6-C, types d'événements**, chacun avec couleur, icône, ton de Pulse et son par défaut : *Anniversaire* (festif), *Rendez-vous* (neutre), *Travail*, *Santé*, *Religieux / cérémonie*, *Deuil* (sobre : pas de couleurs vives, Pulse calme et discret, son doux), *Fête*, *Voyage*, *Autre*. La liste vit dans le registre (point 0), donc on en ajoute ou retire sans casser.
- **6-D, les sons dans les Paramètres** :
  - *Sons de Junix* (un petit ensemble fourni avec l'appli) : simple ;
  - *Sonneries du téléphone* : demande un module natif Android (la bibliothèque actuelle ne sait pas lister les sonneries) ;
  - *Musique du téléphone* : choisir un fichier, l'appli en garde une copie. Faisable, avec une contrainte Android : le son d'une catégorie de notification est fixé à sa création, donc changer de son demande de recréer la catégorie (géré par l'appli, invisible pour l'utilisateur).

**Contraintes honnêtes** :
- l'**alarme plein écran** demande une autorisation spéciale ; depuis Android 14, Google la réserve aux applis de **réveil et d'appel**, ce qui comptera si l'appli va sur le Play Store ;
- la **sonnerie continue** et le **plein écran** demandent probablement une bibliothèque de notifications plus puissante (par exemple Notifee) à la place d'une partie d'expo-notifications. C'est un changement d'architecture que je t'expliquerai avant de le faire.

**Recommandation** : **6-A** d'abord, puis **6-B** et **6-C** ensemble, puis **6-D** (sons de Junix d'abord, sonneries et musiques ensuite). L'alarme plein écran est le dernier étage de 6-B.

---

## 7. Le logo

**Aujourd'hui** : un P avec une ligne de pouls dans un cercle, et le nom **écrit dans l'icône**. Le nom se lit mal en petit, le P ressemble à un R, et le lien avec la mascotte n'apparaît pas.

![Trois propositions de logo](images/logo-propositions.svg)

| | Idée | Points forts | Points faibles |
|---|---|---|---|
| **A · L'orbe** | Le corps de Pulse (anneau + liquide) traversé par un battement | Le logo **et** la mascotte racontent la même chose ; reconnaissable en tout petit ; s'anime facilement au lancement (le liquide monte, le battement passe) | Proche de la mascotte : moins de « signe » abstrait |
| **B · Le lien** | Deux cercles qui se chevauchent (toi et l'autre) reliés par un battement | Dit « relations » d'un coup d'œil | Dit moins « temps » ; deux cercles fins en tout petit |
| **C · Le cadran** | Une horloge dont l'aiguille devient un battement | Dit « temps » tout de suite | Dit moins « relations » ; ressemble à beaucoup d'icônes d'horloge |

Dans les trois : plus de texte dans l'icône, une version d'une seule couleur pour les icônes à thème d'Android 13+, et l'animation de lancement redessinée à partir du logo choisi.

**Ma recommandation : A · L'orbe.** C'est la seule qui relie le logo, la mascotte et le nom « Pulse ».

---

## 8. Hiérarchie proposée (à valider ou modifier)

| Niveau | Sens | Points |
|---|---|---|
| **N1 — tout de suite** | Ce qui manque au but même de l'appli, ou gêne tous les jours | **0-A** socle (registre, interrupteurs) · **6-A** les événements notifient · **1-A** clarifier les trois types · **2** formulaires (en commençant par l'événement et son « Partir … min avant ») · **7** logo |
| **N2 — ensuite** | Ce qui rend l'appli nettement meilleure | **6-B + 6-C** niveaux d'alerte et types d'événements · **3-A + 3-B** gestes expliqués · **2** micro dans tous les formulaires · **5-A** partager sans compte |
| **N3 — plus tard** | Gros chantiers, à faire par étapes | **4-B** glisser-déposer dans le planning (jour, puis semaine, puis mois) · **6-D** sons et sonneries · alarme plein écran |
| **N4 — après une décision sur le cloud** | Change la nature de l'appli | **5-B** éléments partagés avec comptes · **5-C** espaces de travail et rôles |

## 9. Ce que j'ai besoin que tu tranches

1. **La hiérarchie** ci-dessus : la valides-tu, ou veux-tu déplacer des points ?
2. **Types (point 1)** : 1-A (trois types mieux expliqués) ou tu veux déjà aller vers 1-B (deux familles) ?
3. **Logo** : A, B ou C ?
4. **Partage (point 5)** : l'appli doit-elle rester utilisable **sans compte** ?
5. **Alarme plein écran** : prête à accepter qu'elle soit peut-être limitée sur le Play Store, ou on la garde pour une version installée à la main ?

Rien ne sera réalisé avant tes réponses. Ensuite, chaque point validé aura sa fiche opératoire avant d'être fait.

---

## 10. Tes réponses (22 novembre) et ce qu'elles changent

### 10.1 Hiérarchie : validée

On suit N1 → N2 → N3 → N4 (section 8).

### 10.2 Types : trois types, chacun avec une identité nette (1-A renforcé)

Tu as raison : expliquer ne suffit pas, il faut que chaque type **se reconnaisse d'un coup d'œil, partout de la même façon** (listes, planning, accueil, notifications, widget).

| | Rappel | Tâche | Événement |
|---|---|---|---|
| **Phrase-clé** (sous le choix « Nouveau ») | « Me faire penser à quelque chose, à une heure » | « Une chose à faire, que je coche quand c'est fait » | « Un moment qui a lieu : début, fin, souvent un lieu et des gens » |
| **Icône** | Cloche | Case à cocher | Calendrier |
| **Couleur du type** | Violet (couleur principale) | Cyan | Ambre (déjà utilisé pour l'agenda sur l'accueil) |
| **Forme de carte** | Heure en grand à gauche | Case à cocher à gauche | Barre verticale de couleur à gauche (la couleur de son **type d'événement** : anniversaire, deuil… voir 6-C), plage horaire « 14:00 – 16:00 » |
| **Geste principal** | Terminer / Plus tard | Cocher | Ouvrir (il n'y a rien à cocher) |
| **Notification** | Sonne à l'heure | Seulement si une alerte est ajoutée | Alerte avant le début (et alerte de départ s'il y a un lieu) |

Les couleurs restent celles de la palette, avec des contrastes vérifiés dans les deux thèmes. L'identité vit dans le **registre des types** (section 0) : chaque écran la lit au même endroit.

### 10.3 Logo : A · L'orbe, avec le nom là où il compte

![Logo A avec le nom](images/logo-A-avec-nom.svg)

- **Icône du téléphone** : sans texte. Android écrit déjà « Junix Pulse » sous l'icône ; un texte dans l'icône devient illisible en petit (le défaut du logo actuel).
- **Logo complet** (orbe + « JUNIX » + « PULSE ») : écran de lancement, onboarding, Play Store, page web de partage, documents.
- **Animation de lancement** : l'anneau se dessine, le liquide monte, le battement passe, le nom apparaît, puis l'orbe devient Pulse, qui salue.

### 10.4 Planning : faut-il garder trois vues, et faut-il une vue Mois ?

**Constat confirmé dans le code** : « Agenda » et « Journée » montrent **exactement le même jour** (même bandeau de 7 jours en haut), l'un en liste, l'autre en grille horaire. Deux vues pour un seul contenu, c'est un choix de plus à faire sans rien apprendre de plus, donc une charge pour la mémoire (loi de Hick : plus il y a de choix équivalents, plus on hésite).

**Approches**
- **P-A, trois échelles de temps : Jour · Semaine · Mois** (recommandée)
  - **Jour** fusionne Agenda et Journée : la grille horaire, avec en haut une bande « Sans heure » (tâches du jour, anniversaires). C'est là que se fera le glisser-déposer.
  - **Semaine** : comme aujourd'hui.
  - **Mois** : volontairement léger. Chaque jour montre des petits points de la couleur de chaque type, sans texte ; toucher un jour ouvre la vue Jour.
  - Pourquoi : ce sont les trois vues que tout le monde connaît (Google Agenda, Samsung Calendrier), donc rien à apprendre. Chaque vue a un rôle distinct (le détail, l'organisation, l'anticipation).
- **P-B, Jour · Semaine · À venir** : pas de Mois, mais une liste des 30 prochains jours (anniversaires, voyages, rendez-vous lointains). Plus simple, mais on perd la vision d'ensemble d'un mois.
- **P-C, garder les vues actuelles** : déconseillé, la redondance demeure.

**La vue Mois est-elle nécessaire ?** Pas pour la journée de tous les jours. Elle sert pour ce que Junix suit au-delà de la semaine : anniversaires, cérémonies, voyages, échéances. Gardée minimale (des points), elle ne charge pas l'écran. Sans elle, il faut faire défiler semaine après semaine pour voir le 15 du mois prochain.

### 10.5 Partager, gratuitement et sans serveur payant

Contraintes posées : **pas d'argent**, gratuit, léger, simple à présenter, et peut-être un **compte Junix Pulse** plus tard.

**Le transport, déjà gratuit et déjà dans le téléphone** : un seul bouton **« Partager »** ouvre la feuille de partage d'Android. Elle propose déjà **WhatsApp, SMS, Gmail, e-mail, Bluetooth et Quick Share** (l'équivalent d'AirDrop sur Android, par Wi-Fi à proximité). Aucun code de transport à écrire, aucun coût.

**Ce qui est partagé : une invitation**
- Un **lien** vers une petite page web **gratuite** (hébergée sur GitHub Pages).
- Les informations de l'élément (titre, date, lieu, personnes) sont **dans le lien lui-même**, après un `#`. Ce morceau du lien n'est **jamais envoyé au serveur** : rien n'est stocké ailleurs que dans le message.
- La page affiche l'invitation et trois boutons :
  - **Ouvrir dans Junix** (si l'appli est installée) ;
  - **Installer Junix** (lien vers l'APK, puis le Play Store un jour) ;
  - **Ajouter à mon agenda** (pour ceux qui n'ont pas Junix : fichier d'agenda standard).
- **Le QR code** : le même lien, affiché en QR à l'écran. L'autre le scanne avec l'appareil photo de **son** téléphone (tous les Android récents lisent les QR) : pas besoin d'ajouter un module caméra à Junix.

**Participer, avec consentement**
1. Paul partage « Dîner samedi 20 h » avec Léa.
2. Léa ouvre le lien : Junix affiche « Paul t'invite : Dîner samedi 20 h · **Accepter** / **Refuser** ».
3. Si elle accepte, l'élément est ajouté chez elle, et Junix lui propose de répondre à Paul par le même moyen (message prérempli « J'ai accepté : Dîner samedi 20 h »).
4. Si Paul ouvre cette réponse, Junix marque Léa « participe ».

**Limite honnête** : sans serveur, **pas de synchronisation automatique**. Si Paul change l'heure, il repartage ; Junix reconnaît la même invitation (même identifiant, version plus récente) et la met à jour au lieu d'en créer une deuxième.

**Coût** : zéro. Ce qu'il faut ajouter : une petite bibliothèque de QR code (elle s'appuie sur le dessin SVG déjà utilisé par l'appli) et une page web statique.

**Plus tard (N4) : le compte Junix Pulse**, pour la synchronisation automatique et les espaces de travail. Les offres gratuites existent (Firebase « Spark » de Google, Supabase « Free »), avec des quotas : suffisants pour commencer, mais Supabase met en pause un projet inactif une semaine. Le compte reste **facultatif** : l'appli marche sans.

### 10.6 Question 5 expliquée : l'alarme plein écran et le Play Store

**Ce que c'est** : comme le réveil du téléphone. Si le téléphone est verrouillé, l'écran s'allume avec une **grande page** (titre, heure, boutons « Arrêter » et « Plus tard »), et la sonnerie continue jusqu'à ce que tu touches l'écran.

**Ce que ça sous-entend**
- Android exige une **autorisation spéciale** pour ouvrir un écran par-dessus tout, même verrouillé (« notifications plein écran »).
- Depuis **Android 14**, Google ne la donne automatiquement **qu'aux applis de réveil et d'appel**. Pour les autres :
  - **APK installé à la main** (comme maintenant) : l'utilisateur peut l'activer lui-même dans les réglages d'Android, et l'alarme marche ;
  - **Play Store** : Google peut **refuser** l'appli si elle demande cette autorisation sans être une appli de réveil ou d'appel, ou demander une justification.

**Proposition** : construire l'alarme avec une **solution de repli automatique**.
- Autorisation accordée : **plein écran** + sonnerie continue.
- Autorisation absente : **notification prioritaire** (bandeau en haut de l'écran, ou écran de verrouillage) avec sonnerie **qui continue** jusqu'à un geste.

Tu n'as rien à trancher maintenant ; la question reviendra seulement le jour d'une publication sur le Play Store.

### 10.7 Ordre proposé pour démarrer N1

1. **Registre des types + identité visuelle des trois types** (socle 0-A et 10.2) : tout le reste s'appuie dessus.
2. **Les événements notifient** (6-A), avec l'alerte de départ.
3. **Formulaire d'événement** remis à plat (2), avec « Partir … min avant » seulement si un lieu est saisi.
4. **Logo A** (icône, logo complet, animation de lancement).
5. **Formulaires de tâche et de rappel**, puis le choix « Nouveau » avec les phrases-clés.

Chaque étape : une fiche opératoire, puis la réalisation, puis tes tests sur le téléphone avant l'étape suivante.

---

## 11. Précisions du 22 novembre (suite)

### 11.1 Glisser-déposer : dans les trois vues, pour les trois types

Ta demande, reformulée pour qu'on parle de la même chose :

| Vue | Ce qu'on attrape | Où on le pose | Ce qui change dans l'élément |
|---|---|---|---|
| **Jour** (grille des heures) | n'importe quelle carte : tâche, rappel, événement | plus haut ou plus bas | **l'heure** (ex. 7 h → 19 h), par pas de 15 min ; un événement garde sa durée |
| **Semaine** (colonnes des jours) | n'importe quelle carte | dans une autre colonne, et à une autre hauteur | **le jour et l'heure** |
| **Mois** (grille des jours) | un point ou une carte du jour | sur une autre case | **le jour** ; l'heure est gardée |

Dans les trois cas :
- **appui long** : la carte se soulève avec une vibration légère ;
- pendant le glisser, l'heure ou le jour visé s'affiche en direct (« 19:00 ») ;
- au lâcher, l'élément est **enregistré tout de suite**, avec un message « Déplacé à 19:00 · Annuler » ;
- **les alertes suivent** : un rappel ou un événement déplacé sonne à sa nouvelle heure ;
- un élément **qui se répète** demande « Seulement celui-ci ou tous ? ».

La section 4 recommandait de le faire « par étapes » : l'objectif reste les trois vues, mais elles seront construites l'une après l'autre (Jour, puis Semaine, puis Mois) et testées entre deux. Ça reste au niveau **N3**, après la refonte des vues en Jour · Semaine · Mois (10.4).

### 11.2 1-A ou 1-B : mon avis

Ma recommandation de la section 1 était « **1-A maintenant, qui prépare 1-B plus tard** ». Ton message, lui, montre que la confusion vient du **chevauchement** entre rappel et tâche, pas d'un manque d'explication. Le code le confirme : un rappel peut avoir l'action « **Faire** » (c'est alors une tâche avec une heure), et une tâche peut avoir un jour.

**Pourquoi 1-B est le bon choix pour Junix**
- **Deux familles qui ne se chevauchent plus** :
  - **À faire** : ce qui se coche, avec ou sans alerte à une heure ;
  - **Moment** : ce qui a lieu, avec début et fin.

  La question « rappel ou tâche ? » disparaît, parce qu'un rappel devient **une chose à faire avec une alerte**.
- C'est le modèle que les gens connaissent déjà : Google (Tasks + Agenda), Apple (Rappels + Calendrier), TickTick. Rien à apprendre.
- Ça sert le but de Junix : « Appeler Paul à 18 h » reste une chose à faire, avec une alerte et l'action Appeler. Les personnes, les étiquettes, l'échéance et la confirmation restent.

**Ce qui le rend risqué si on le fait d'un bloc** : rappels et tâches sont stockés dans deux tables différentes, avec leurs notifications, sauvegardes, statistiques, widget et mascotte. Tout fusionner d'un coup, c'est des semaines de travail et un gros risque de casser.

**Donc : 1-B, en deux temps, sans casser** (c'est le principe de la section 0)
1. **L'interface passe à deux familles.** L'utilisateur ne voit plus que « À faire » et « Moment ». Dans la base, rien ne bouge : un « À faire » avec une alerte est enregistré comme un rappel, un « À faire » sans alerte comme une tâche. Le **registre des types** fait le lien.
2. **Les données fusionnent plus tard**, seulement si c'est utile, par une migration qui ajoute sans effacer.

**Ce que tu verras changer** (à confirmer avant de commencer)

| Aujourd'hui | Après 1-B (étape 1) |
|---|---|
| Onglets : Accueil · **Rappels** · **Tâches** · Planning · Proches | Accueil · **À faire** · Planning · Proches (un onglet de moins) |
| « Nouveau » : rappel, tâche ou événement | « Nouveau » : **À faire** (« une chose à faire, avec ou sans alerte ») ou **Moment** (« quelque chose qui a lieu ») |
| Deux formulaires (rappel, tâche) | Un formulaire « À faire » : *Quoi* → *Quand* (jour, heure facultative) → **Alerte** (interrupteur : sonner à cette heure, rappel à confirmer) → *Avec qui* → *Plus d'options* (sous-tâches, échéance, durée, étiquettes) |
| Liste des rappels et liste des tâches séparées | Une liste « À faire » avec des filtres : *Aujourd'hui* · *Avec alerte* · *Sans date* · *Tout* |
| Carte rappel et carte tâche différentes | Une seule carte « À faire » (case à cocher), avec une **petite cloche et l'heure** quand elle a une alerte |
| Rappels et tâches déjà enregistrés | **Gardés tels quels**, affichés comme des « À faire » (avec cloche pour les anciens rappels) : rien n'est perdu |

**L'identité visuelle de 10.2 devient** : **À faire** = case à cocher, cyan (cloche ajoutée s'il y a une alerte) ; **Moment** = calendrier, ambre, avec la barre de couleur de son type d'événement.

### 11.3 Ordre de N1 avec 1-B

1. **Registre des types** (À faire / Moment) et identité visuelle.
2. **Les Moments (événements) notifient**, avec l'alerte de départ.
3. **Formulaire Moment** remis à plat (« Partir … min avant » seulement avec un lieu).
4. **Formulaire À faire** unique, et le choix « Nouveau » à deux familles.
5. **Onglet À faire** (fusion des onglets Rappels et Tâches) et cartes unifiées.
6. **Logo A**.
