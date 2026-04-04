# COMPASS Platform — Concept de plateforme ecosystemique de sante hybride

**Auteurs** : Bach S, Manos T, Noel P
**Date** : Avril 2026
**Statut** : Paragraphe pour article — Preuve de concept

---

## Concept de la plateforme

COMPASS (Comprehensive Metabolic Profiling & Stratification System) est concu comme une plateforme ecosystemique de sante hybride, articulant un moteur algorithmique multicouche avec un parcours de soins structure medecin-patient. Contrairement aux scores de risque metabolique classiques — unidimensionnels, statistiques et decontextualises — COMPASS integre six modules complementaires au sein d'une architecture modulaire unique : (1) le Score BMN v3.5, algorithme composite a base de regles couvrant quatre dimensions (Clinique, Exposome, Occupationnel, Lifestyle) et 18 biomarqueurs, valide sur 22 807 adultes NHANES avec une AUC de 0.849 pour la prediction du syndrome metabolique ; (2) le module BTM v3.4, moteur de decision bariatrique evaluant 27 facteurs cliniques pour 6 techniques chirurgicales et les agonistes GLP-1 ; (3) le GLP-1 Response Score (GRS), score de profilage de la reponse aux agonistes GLP-1 sur 7 axes incluant l'insulino-resistance, la chronicite, l'inflammation, les dimensions psycho-comportementales, iatrogenes, demographiques et la reserve beta-cellulaire/secretoire ; (4) l'indice de chronicite CTI (Chronicity Trajectory Index), quantifiant la trajectoire d'enracinement de l'obesite sur 7 facteurs ponderes ; (5) un modele de Markov projetant l'evolution ponderale a 10 ans ; et (6) le module FNC v1.0 de normalisation climatique, ajustant les composantes environnementales selon 6 zones de Koppen et la duree de residence.

Le caractere hybride de la plateforme repose sur trois axes. Premierement, l'hybridation methodologique : COMPASS combine des poids derives de connaissances cliniques expertes (architecture CLEO) avec une normalisation biologique guidee par les donnees (z-scores ponderes de 18 biomarqueurs), selon une ponderation declaratif/biologique de 65/35 avec recalibrage dynamique si l'ecart entre les deux sources depasse 20 %. Cette approche semi-supervisee preserve l'interpretabilite clinique tout en tirant parti de la precision de la biologie, atteignant une performance comparable a la regression logistique supervisee (AUC 0.872) sans aucun entrainement sur les donnees cibles. Deuxiemement, l'hybridation du parcours de soins : la plateforme s'inscrit dans un protocole en deux phases — Phase 1 (questionnaire patient autonome + consultation medicale avec prescription adaptative de panels biologiques P0 a P15 selon le niveau de risque initial) et Phase 2 (integration biologique + generation d'un rapport strategique par intelligence artificielle + restitution medicale) — positionnant l'outil comme interface entre le patient autonomise et le medecin decisionnaire, et non comme un substitut a la decision medicale. Troisiemement, l'hybridation de la population cible : l'algorithme integre 12 profils ethniques avec des seuils differentiels d'IMC, de tour de taille, de risque diabetique et cardiovasculaire, et de sensibilite inflammatoire, permettant une calibration specifique aux populations multi-ethniques insulaires, en particulier mauriciennes (Indo-Mauriciens, Creoles, Sino-Mauriciens, Franco-Mauriciens).

L'architecture logicielle est deployee en mode serverless (Cloudflare Workers, Hono framework) avec un frontend JavaScript integrant l'ensemble des calculs cote client pour garantir la confidentialite des donnees patient. Le backend assure exclusivement les services de geolocalisation (qualite de l'air, meteo en temps reel via Open-Meteo), de geocodage (OpenStreetMap Nominatim) et de generation de rapports par IA (Claude, Anthropic), sans stockage de donnees medicales cote serveur. Cette architecture zero-stockage est un choix delibere de conception, alignant la plateforme avec les principes de privacy-by-design et les exigences reglementaires des ecosystemes de sante numerique.

Du point de vue ecosystemique, COMPASS opere selon un paradigme « diagnostiquer-profiler-stratifier-projeter » : le Score BMN quantifie le risque (diagnostiquer), le CTI et le GRS phenotypent le patient (profiler), le module BTM selectionne la strategie therapeutique optimale (stratifier), et le modele de Markov projette la trajectoire a 10 ans (projeter). Cette chaine de traitement produit un rapport clinique integre, interpretable a chaque etape, ou chaque module alimente le suivant tout en restant independamment actionnable. L'ensemble constitue une preuve de concept d'un ecosysteme de sante hybride — combinant evaluation autonome du patient, intelligence algorithmique multicouche, integration biologique conditionnelle et intelligence artificielle generative — au service de la medecine de precision metabolique en soins primaires.

---

## Schema de la plateforme

```
                    PATIENT                           MEDECIN
                       |                                 |
              [Phase 1: Autonome]              [Phase 1: Prescription]
                       |                                 |
            Questionnaire COMPASS               Validation clinique
            (20 ecrans, ~10 min)              Prescription biologique
                       |                      (P0/P5/P10/P15 adaptatif)
                       |                                 |
                       v                                 v
              +-----------------+              +------------------+
              |  Score sD       |              |  Panels bio      |
              |  (declaratif)   |              |  (7-21 examens)  |
              |  CLEO: C+E+O+L |              |  Laboratoire     |
              +-----------------+              +------------------+
                       |                                 |
                       +------------ Phase 2 -----------+
                                     |
                       +-------------v--------------+
                       |    MOTEUR COMPASS v3.5     |
                       |                            |
                       |  Score BMN sf/100          |
                       |  (65% declaratif +         |
                       |   35% biologique)          |
                       |                            |
                       |  CTI  -> Chronicite 0-100  |
                       |  GRS  -> Profil GLP-1      |
                       |          (R1-R5/CI)        |
                       |  BTM  -> Strategie         |
                       |          bariatrique        |
                       |  Markov -> Projection      |
                       |           10 ans            |
                       |  FNC  -> Normalisation     |
                       |          climatique         |
                       +----------------------------+
                                     |
                       +-------------v--------------+
                       |   RAPPORT IA (Claude)      |
                       |   Strategique, langage     |
                       |   clair, recommandations   |
                       |   personnalisees           |
                       +----------------------------+
                                     |
                       +-------------v--------------+
                       |   RESTITUTION MEDICALE     |
                       |   Medecin + Patient        |
                       |   Decision partagee        |
                       +----------------------------+
```

## Integration ecosystemique — Vision

```
+------------------------------------------------------------------+
|                 ECOSYSTEME DE SANTE HYBRIDE                      |
|                                                                  |
|  +------------------+    +------------------+    +-----------+   |
|  | Sources donnees  |    | COMPASS Engine   |    | Outputs   |   |
|  |                  |    |                  |    |           |   |
|  | - Patient (CLEO) |--->| - BMN sf/100     |--->| - Rapport |   |
|  | - Biologie (BSD) |    | - CTI 0-100      |    |   IA      |   |
|  | - Geolocalisation|    | - GRS R1-R5/CI   |    | - Score   |   |
|  |   (Open-Meteo,   |    | - BTM BT1-BT6    |    |   global  |   |
|  |    Nominatim)    |    | - Markov 10 ans  |    | - Alerte  |   |
|  | - Profil ethni-  |    | - FNC v1.0       |    |   retro-  |   |
|  |   que (12 types) |    | - Retro-diag     |    |   diag    |   |
|  +------------------+    +------------------+    +-----------+   |
|                                                                  |
|  Architecture: Zero-stockage | Privacy-by-design | Serverless   |
|  Validation: NHANES N=22,807 | AUC MetS 0.849 | Seed=42        |
+------------------------------------------------------------------+
```

---

*Document genere en avril 2026 — Preuve de concept pour article scientifique*
*Repository : https://github.com/stefbach/score-bmn-v3*
