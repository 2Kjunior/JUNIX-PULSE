# 📐 AUDIT JUNIX PULSE — 02. RÉFÉRENTIEL MÉTHODOLOGIQUE ET CRITÈRES IHM

> **Cadre normatif et ergonomique pour l'évaluation de Junix Pulse.**  
> Ce document définit les 26 axes d'évaluation, leur typologie et les seuils d'acceptabilité.

---

## 1. DISTINCTION OBLIGATOIRE DES 5 TYPOLOGIES DE RÈGLES

Pour éviter toute confusion entre goût personnel et défaut avéré, chaque constat de l'audit est qualifié selon l'un des 5 types suivants :

1. **Règle normative** : Obligation légale ou standard international formel (ex. WCAG 2.2 niveau AA, ISO 9241-110, OWASP MASVS). Le non-respect constitue une non-conformité objective.
2. **Recommandation ergonomique** : Règle issue des sciences cognitives, de la psychologie de la forme (Gestalt) ou de l'ergonomie logicielle (ex. loi de Fitts, loi de Miller, critères de Bastien & Scapin).
3. **Convention de plateforme** : Lignes directrices officielles du système hôte (Android Material Design 3 / Apple Human Interface Guidelines).
4. **Choix esthétique** : Direction artistique, identité de marque, tonalité visuelle choisie par le propriétaire (ex. Dark Mode Midnight, dégradés, palettes). Un choix esthétique ne devient un défaut que s'il nuit à la lisibilité, au contraste ou à la cohérence.
5. **Règle métier propre à l'application** : Invariant logique ou fonctionnel défini par le produit (ex. BR-001 à BR-022, isolation SQLite offline-first, calcul de streak avec pause).

---

## 2. LES 26 AXES D'INSPECTION TRANSVERSALE

| Axe # | Domaine d'inspection | Type dominant | Critères & Preuves attendues |
|:---:|---|---|---|
| **01** | Design visuel | Choix esthétique / Ergonomie | Alignements de grille, hiérarchie typographique, rayons de courbure, cohérence des élévations et ombres. |
| **02** | Design system | Architecture logicielle / Esthétique | Consommation stricte des tokens dynamiques (`ThemePalette`), zéro valeur hexadécimale codée en dur. |
| **03** | IHM / Interaction | Ergonomie (Bastien & Scapin) | Visibilité des états (chargement, succès, erreur), feedback immédiat, réversibilité (Undo), tolérance aux erreurs. |
| **04** | Ergonomie & Mobilité | Convention plateforme / Fitts | Zone du pouce (reachability), cibles tactiles atteignables à une main, support des gauchers, brièveté des flux. |
| **05** | Intuitivité & Découvrabilité | Ergonomie cognitive | Affordance des composants, clarté des icônes sans ambiguïté, zéro jargon cryptique. |
| **06** | Apprentissage & Onboarding | Ergonomie pédagogique | Clarté du premier lancement, explication des concepts clés (Rappels vs Tâches vs Événements), possibilité de réviser. |
| **07** | Quantité d'information | Recommandation ergonomique | Prévention de la surcharge cognitive (loi de Miller), pas de compteurs à zéro répétitifs, présence de textes d'aide. |
| **08** | Doublons | Architecture de l'information | Zéro écran redondant, mutualisation des composants formulaires, suppression des routes concurrentes. |
| **09** | Boutons et commandes | Ergonomie / Convention | Libellé honnête indiquant l'action réelle, prévention du double-tap accidentel, distinction visuelle primaire / secondaire. |
| **10** | Accessibilité (a11y) | **Règle normative (WCAG 2.2 AA)** | Cibles $\ge 24\text{ px}$, contrastes texte $\ge 4,5:1$, vocalisation TalkBack/VoiceOver, ordre de focus, pas d'information par la seule couleur. |
| **11** | Utilisateurs variés | Recommandation ergonomique | Inclusivité linguistique (neutralité ou paramétrage), adaptation aux seniors, basse vision (texte à 200 %), daltonisme. |
| **12** | Menaces et sécurité | **Règle normative (OWASP MASVS)** | Sécurité en cas de vol/prêt, protection contre les captures récentes (`FLAG_SECURE`), stockage chiffré des secrets, isolation locale. |
| **13** | Vie privée & Données | **Règle normative (RGPD / Local-First)** | Minimisation des permissions (`READ_CONTACTS` contextuelle), transparence absolue, export/import complet sans fuite. |
| **14** | Rappels, notifs, temps | Règle métier / Plateforme | Fiabilité du réveil après redémarrage, respect de la mise en veille agressive Android, synchronisation des fuseaux, snooze déterministe. |
| **15** | Contenu et langue | Recommandation linguistique | Orthographe, grammaire, typographie française (espaces insécables, apostrophes typographiques), cohérence tutoiement/vouvoiement. |
| **16** | Architecture navigation | Convention Expo Router | Arborescence logique, gestion propre de la touche retour matérielle Android, absence d'écrans en cul-de-sac. |
| **17** | Architecture logicielle | Architecture logicielle | Clean Architecture : séparation stricte Domaine $\rightarrow$ Use-cases $\rightarrow$ Repositories $\rightarrow$ UI, zéro requête SQL dans les écrans. |
| **18** | Qualité du code | Norme technique | Typage TypeScript strict (`noImplicitAny`), zéro `catch` vide ou silencieux, nettoyage des abonnements d'effets (`useEffect`). |
| **19** | Performance et fluidité | Norme technique / UX | 60/120 FPS sur thread UI, virtualisation des listes (`FlatList`), démarrage rapide, budget mémoire modeste. |
| **20** | Robustesse | Norme technique | Résilience hors-ligne totale, atomicité des migrations SQLite, reprise sur erreur sans plantage applicatif. |
| **21** | Couverture de tests | Norme technique | Tests unitaires sur toutes les règles pures du domaine et cas limites (bissextile, retard, pause streak). |
| **22** | Outils et build | Norme technique | Scripts package.json propres, configuration CI, absence de dérive des dépendances Expo SDK 57. |
| **23** | Documentation | Norme technique | Alignement exact entre documentation produit (`README.md`, `RECAPITULATIF_PROJET.md`) et code réel. |
| **24** | Extras et accessoires | Convention plateforme | Icônes adaptatives Android monochrome, retours haptiques subtils, raccourcis d'icônes applicatives. |
| **25** | Animation et mouvement | Règle normative / Ergonomie | Respect absolu de `prefers-reduced-motion` (WCAG 2.2.2 / 2.3.3), animations motivées et exécutées sur thread UI natif. |
| **26** | Séquence lancement & Identité | Ergonomie / Marque | Continuité visuelle parfaite entre SplashScreen natif OS et application, zéro carré opaque, respect de la charte graphique. |
