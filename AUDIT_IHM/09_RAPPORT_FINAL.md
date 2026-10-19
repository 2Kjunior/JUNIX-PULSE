# 🏆 AUDIT GLOBAL IHM & CONCEPTION — JUNIX PULSE (RAPPORT FINAL)

> **Projet :** Junix Pulse (Expo SDK 57 / React Native 0.86 / TypeScript / SQLite Local-First)  
> **Date de livraison :** 18 octobre 2026  
> **Statut de conformité :** Audit en lecture seule — Zéro modification de code — Zéro régression.

---

## 1. PÉRIMÈTRE EFFECTIVEMENT INSPECTÉ

### Ce qui a été inspecté avec preuve directe :
1. **L'intégralité du code TypeScript / React Native** : 34 routes et écrans (`src/app/**`), composants UI et feedback (`src/components/**`), styles thématisés (`src/styles/**`), tokens (`src/constants/**`), règles pures du domaine (`src/domain/rules/**`), cas d'utilisation (`src/use-cases/**`), repositories SQLite (`src/repositories/**`), services (`src/services/**`), schéma et migrations versionnées (`src/database/**`), état global Zustand (`src/store/**`).
2. **Assets graphiques et binaires** : Analyse hexadécimale et des canaux RGBA de `assets/images/{splash-icon,icon,android-icon-foreground,official-logo}.png`.
3. **Contrôles d'outillage exécutés** :
   - `npx tsc --noEmit` : 0 erreur de compilation.
   - `jest` (195 tests unitaires) : 12 suites passées, 195/195 tests validés.
   - `expo lint` : 0 erreur, 44 avertissements.
   - `npx expo-doctor` : 20/21 contrôles validés (3 écarts de version patch).
   - `npm audit --omit=dev` : 46 vulnérabilités transitives cartographiées.
4. **Calculs de contrastes WCAG 2.2** : Calculs mathématiques exacts de luminance relative sur les palettes sombre et claire.

### Ce qui n'a pas pu être testé sur l'environnement hôte (Limites assumées) :
- Le rendu audio réel du canal de notification Android sur haut-parleur physique.
- Le comportement de TalkBack / VoiceOver avec un vrai geste de balayage au doigt sur écran tactile.
- L'impact d'une mise en veille agressive constructeur Android (Xiaomi MIUI, Samsung OneUI, Transsion/Infinix) sur les alarmes locales de rappel.
- L'empreinte mémoire exacte de scrypt en cours d'exécution sur un terminal d'entrée de gamme 2 Go RAM.

---

## 2. DÉCOMPTE STATISTIQUE DES HYPOTHÈSES (PHASE 1)

Sur les 21 hypothèses initiales soumises à l'audit :
- **Confirmées sans réserve :** **16 (76,2 %)**
- **Partiellement confirmées :** **5 (23,8 %)**
- **Infirmées :** **0 (0,0 %)**
- **Non vérifiables :** **0 (0,0 %)**

*Note d'intégrité :* L'absence d'hypothèse totalement infirmée s'explique par la très grande perspicacité de l'inspection initiale du propriétaire et des auditeurs. En revanche, plusieurs hypothèses ont été sévèrement requalifiées techniquement (ex. I-04 est conforme à la norme WCAG AA de 24 px bien qu'en-dessous des recommandations de plateforme de 48 dp ; I-09 ne présente aucun risque de fuite de secret).

---

## 3. LES 10 DÉFAUTS À TRAITER EN PRIORITÉ ABSOLUE

| Rang | ID | Intitulé synthétique | Gravité | Rationale & Justification du rang |
|:---:|:---:|---|:---:|---|
| **1** | `DEF-01` | Coffre-fort Sanctuaire sans chiffrement réel | **P1** | Fausse promesse de sécurité majeure : les notes sont lisibles en clair dans SQLite et exportées en clair dans les sauvegardes. |
| **2** | `DEF-02` | « Effacer toutes les données » incomplet | **P1** | Laisse subsister les notes privées, les plannings et maintient les alarmes système actives. |
| **3** | `DEF-03` | Rupture des récurrences de rappels | **P1** | Perte d'occurrences dès qu'un rappel récurrent n'est pas validé le jour même. |
| **4** | `DEF-04` | Snooze et récurrence générant des dates passées | **P1** | Déclenche des notifications instantanées aberrantes 10 secondes plus tard. |
| **5** | `DEF-05` | Boutons icônes sans libellé TalkBack / VoiceOver | **P1** | Bloque complètement l'utilisation de l'application par les personnes déficientes visuelles. |
| **6** | `DEF-06` | Carré blanc opaque au lancement et saut visuel | **P2** | Dégrade immédiatement l'image de marque et donne un sentiment de produit inachevé. |
| **7** | `DEF-07` | Double padding et bague sombre sur les boutons CTA | **P2** | Texte écrasé/décentré et artefact visuel sombre autour des boutons d'action sur Android. |
| **8** | `DEF-08` | Absence totale de geste de swipe | **P2** | Friction ergonomique quotidienne sur la manipulation des listes de rappels et de tâches. |
| **9** | `DEF-10` | Faux positifs massifs du parseur de capture NLP | **P2** | Erreurs de date (« après-demain » = demain) et d'heures (écrasées par 20:30 ou 02:00). |
| **10** | `DEF-11` | Animation JS de largeur sur le FAB | **P2** | Micro-saccades et perte de fluidité 60 FPS lors de la navigation entre onglets. |

---

## 4. DÉCISIONS REQUISES DE VOTRE PART (QUESTIONS FERMÉES)

Afin d'engager le prompt de correction sans ambiguïté, veuillez trancher les 6 questions de conception suivantes :

1. **Séquence de lancement** :  
   Souhaitez-vous :  
   - **(A)** Un lancement quasi instantané (~600 ms) avec logo officiel transparent et suppression de l'écran animé d'attente ? *(Recommandé)*  
   - **(B)** Un enchaînement court ($\le 600\text{ ms}$) avec une brève pulsation cardiaque de marque avant d'afficher l'accueil ?
2. **Couleur du logo vs Boutons** :  
   Le dégradé violet $\rightarrow$ cyan fait partie intégrante de l'identité de marque du logo officiel. Confirmez-vous que la consigne « supprimer le violet » s'applique **uniquement aux boutons et composants d'action**, tout en conservant le dégradé officiel pour le logo de l'application ?
3. **Langage visuel des boutons CTA** :  
   Pour remplacer le pavé violet opaque des boutons d'action, préférez-vous :  
   - **(A)** Un bouton en verre sombre texturé (Midnight Glass) avec contour lumineux subtil harmonisé avec la barre inférieure ? *(Recommandé)*  
   - **(B)** Un bouton à aplat sombre contrasté avec accent cyan Digital Cyan sur le texte ?
4. **Récurrence des rappels échus** :  
   Lorsqu'un rappel récurrent quotidien n'a pas été marqué terminé pendant 3 jours, souhaitez-vous :  
   - **(A)** Sauter les occurrences passées et planifier directement la prochaine occurrence future ? *(Recommandé)*  
   - **(B)** Créer une occurrence en statut « Manqué » dans l'historique pour chaque jour sauté ?
5. **Chiffrement du Sanctuaire** :  
   Validez-vous l'intégration du chiffrement transparent XChaCha20-Poly1305 pour chaque note secrète avec clé dérivée du PIN via KDF sécurisé ?
6. **Bibliothèques candidates** :  
   Confirmez-vous l'abandon définitif de **Three.js** et le maintien exclusif de **Reanimated 4** pour toutes les animations d'interface ?

---

## 5. PROTOCOLE DE RECETTE À EFFECTUER SUR TÉLÉPHONE PHYSIQUE

1. **Accessibilité TalkBack (Android) :**
   - Activer TalkBack dans les paramètres d'accessibilité.
   - Parcourir l'onglet Calendrier et la modale d'ajout de bloc : vérifier que chaque bouton icône annonce son action (« Retour », « Fermer », « Supprimer ») et non simplement « Bouton ».
2. **Affichage à fort grossissement (Police 200 %) :**
   - Régler la taille de police du système au maximum.
   - Vérifier que les 5 onglets de la barre inférieure restent lisibles sans chevauchement avec l'icône.
3. **Cycle de vie des notifications et réveil :**
   - Programmer un rappel dans 5 minutes.
   - Fermer complètement l'application (suppression des applications récentes) et éteindre l'écran.
   - Vérifier l'émission exacte du signal sonore et de la bannière.
   - Redémarrer le téléphone et vérifier que le rappel planifié pour plus tard est toujours programmé.
4. **Sauvegarde chiffrée :**
   - Exporter une sauvegarde avec un mot de passe test.
   - Ouvrir le fichier `.json` exporté dans un éditeur texte : vérifier que le champ `ciphertext` est opaque et qu'aucune note secrète n'apparaît en clair.

---

## 6. PROCHAINES ÉTAPES

Tous les éléments d'audit sont documentés et archivés dans le dossier `AUDIT_IHM/` :
- `01_INVENTAIRE_ECRANS_v2.md`
- `02_REFERENTIEL_IHM.md`
- `03_REGISTRE_DEFAUTS.md`
- `04_VERIFICATION_HYPOTHESES.md`
- `05_MATRICE_ECRANS_AXES.md`
- `06_ANALYSE_CAUSES_RACINES.md`
- `07_PLAN_DE_CORRECTION_PROPOSE.md`
- `08_REGISTRE_TESTS.md`
- `09_RAPPORT_FINAL.md`
- `10_AUDIT_ANIMATIONS_ET_LANCEMENT.md`

Dès validation de vos décisions sur les 6 questions de la section 4, nous serons prêts à basculer sur le **prompt de correction séquentielle par lots**.
