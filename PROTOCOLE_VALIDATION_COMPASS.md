# PROTOCOLE DE VALIDATION SCIENTIFIQUE — COMPASS v3.5

## Dossier complet pour comite d'experts

**Titre de l'article** : *From Risk Assessment to Treatment Selection: COMPASS, a Diagnose-and-Treat Platform for Precision Obesity Medicine — Proof of Concept and Prospective Validation Protocol*

**Auteurs** : Bach S, Manos T, Noel P
**Version** : 1.0 — Septembre 2026
**Repository** : https://github.com/stefbach/score-bmn-v3
**Application** : https://score-bmn-v3.pages.dev

---

## TABLE DES MATIERES

1. [Resume executif](#1-resume-executif)
2. [Rationnel scientifique](#2-rationnel-scientifique)
3. [Synthese des resultats existants](#3-synthese-des-resultats-existants)
4. [Protocole de validation prospective COMPASS-MU](#4-protocole-de-validation-prospective-compass-mu)
5. [Aspects ethiques et reglementaires](#5-aspects-ethiques-et-reglementaires)
6. [Comite scientifique d'experts](#6-comite-scientifique-dexperts)
7. [Limites, risques et plan de mitigation](#7-limites-risques-et-plan-de-mitigation)
8. [Budget estimatif et calendrier](#8-budget-estimatif-et-calendrier)
9. [References reglementaires et scientifiques](#9-references-reglementaires-et-scientifiques)

---

## 1. Resume executif

### 1.1 Contexte

L'obesite touche plus de 890 millions d'adultes dans le monde (OMS 2024). A Maurice, pres d'un adulte sur quatre est diabetique et l'obesite progresse dans toutes les communautes ethniques, avec des disparites majeures : un Indo-Mauricien presente un risque de diabete de type 2 deux fois superieur a IMC equivalent par rapport a un Europeen. Les outils de depistage existants — Framingham Risk Score, FINDRISC, SCORE2 — sont unidimensionnels, entraines sur des populations occidentales, et ne couvrent ni le profilage therapeutique ni la diversite ethnique insulaire.

### 1.2 Objectif du dossier

Ce dossier presente :
- La **synthese des resultats** de la validation retrospective de COMPASS sur 22 807 adultes NHANES
- Le **protocole de validation prospective** COMPASS-MU (COMPASS-Mauritius) pour confirmer la validite externe en conditions reelles
- La **structure du comite d'experts** charge de valider le dispositif
- Les **aspects ethiques et reglementaires** applicables

### 1.3 Ce que COMPASS apporte de nouveau

COMPASS est le premier outil integrant dans une plateforme unique :
- **Quantification du risque** : Score BMN v3.5, algorithme composite CLEO (Clinique + Exposome + Occupationnel + Lifestyle) + 18 biomarqueurs (AUC 0.849 pour le syndrome metabolique)
- **Profilage therapeutique** : GLP-1 Response Score (GRS) sur 7 axes, incluant un axe beta-cellulaire/secretoire original (C-peptide, FGF21, glucagon)
- **Decision bariatrique** : Module BTM v3.4 evaluant 27 facteurs pour 6 techniques chirurgicales + GLP-1
- **Trajectoire de chronicite** : CTI (Chronicity Trajectory Index), quantifiant la resistance aux interventions conservatrices
- **Projection a 10 ans** : Modele de Markov a 6 etats
- **Calibration multi-ethnique** : 12 profils avec seuils differentiels (IDF 2006, OMS Asia-Pacific 2004)

Le paradigme est « diagnostiquer-profiler-stratifier-projeter », deployable au point de soins en 10 minutes.

---

## 2. Rationnel scientifique

### 2.1 Limites des outils existants

| Outil | Dimensions | Population | Therapeutique | Limites |
|-------|-----------|-----------|--------------|---------|
| Framingham (2008) | CV uniquement | Caucasiens US | Non | Pas d'obesite, pas de MetS |
| FINDRISC (2003) | DT2 uniquement | Finlandais | Non | Pas d'exposome, pas multi-ethnique |
| SCORE2 (2021) | CV 10 ans | Europeens | Non | Pas de metabolisme, pas d'obesite |
| Edmonton (2009) | Obesite | Caucasiens | Partiel | Qualitatif, pas quantitatif |
| CTSGRS (Cifuentes 2025) | GLP-1 genetique | Caucasiens | GLP-1 seulement | Necessite genotypage, pas de risk scoring |
| PRS genomique (German 2025) | Genetique | UK Biobank | GLP-1/bariatrie | Cout genotypage, non disponible en routine |

**Aucun outil existant ne combine** : evaluation du risque metabolique + profilage de la reponse GLP-1 + decision bariatrique + calibration multi-ethnique + integration de l'exposome.

### 2.2 Pourquoi une approche multidimensionnelle

L'obesite est une maladie chronique multifactorielle. Les determinants ne sont pas seulement cliniques : l'environnement (qualite de l'air, climat, urbanisation), le mode de vie (alimentation ultra-transformee, sedentarite, sommeil), la dimension psycho-comportementale (stress, depression, binge eating) et la trajectoire de chronicisation interagissent. Un score unidimensionnel (IMC seul, HbA1c seul) manque systematiquement des phenotypes a risque, en particulier le phenotype MONW (Metabolically Obese Normal Weight) et l'insulino-resistance occulte.

L'architecture CLEO de COMPASS repond a ce besoin en integrant 4 dimensions (Clinique 0-50 pts, Exposome 0-45 pts, Occupationnel 0-10 pts, Lifestyle 0-10 pts) avec une couche biologique adaptative (18 biomarqueurs, ponderation 35%).

### 2.3 Innovation : le paradigme « diagnostiquer et traiter »

La contribution originale de COMPASS est l'integration des modules de **diagnostic** (Score BMN) et de **decision therapeutique** (BTM/GRS) dans un meme outil. Ce paradigme « diagnose-and-treat » permet :

1. **Score BMN** (sf/100) → quantifie le risque metabolique global
2. **CTI** (0-100) → evalue la chronicite et la resistance aux interventions
3. **GRS** (-3 a +6, 7 axes) → predit la reponse individuelle aux agonistes GLP-1
4. **BTM** (27 facteurs x 6 techniques) → selectionne la strategie bariatrique optimale
5. **Markov** (6 etats, 10 ans) → projette la trajectoire ponderale

Chaque module alimente le suivant tout en restant independamment interpretable et actionnable.

### 2.4 Positionnement concurrentiel

Par rapport aux travaux recents :
- **CTSGRS** (Cifuentes, Cell Metab 2025) : score genetique de reponse GLP-1 necessitant un genotypage. COMPASS utilise des variables cliniques et biologiques de routine, accessibles en soins primaires.
- **PRS genomiques** (German, Nat Med 2025) : score polygenetique pour la prediction de la perte de poids sous GLP-1. Meme limitation : necessite genotypage, non deploye en routine.
- **Sous-classes d'obesite** (Coral, Nat Med 2025) : clustering non supervise identifiant 4 sous-types. Approche descriptive, sans module de decision therapeutique integre.

COMPASS se positionne comme un outil **complementaire** a ces approches genomiques : deployable immediatement avec des donnees cliniques de routine, en attendant que le genotypage devienne accessible en soins primaires dans les pays a revenu intermediaire.

---

## 3. Synthese des resultats existants

### 3.1 Validation retrospective — Vue d'ensemble

La preuve de concept repose sur une validation retrospective en 3 cohortes :

| Cohorte | Source | N | Design | Script |
|---------|--------|---|--------|--------|
| NHANES 2017-2018 | CDC public | 5 856 | Cycle unique | `bmn_validation_nhanes.py` |
| NHANES 2011-2018 | CDC public (4 cycles) | 23 825 | Multi-cycles + validation temporelle | `bmn_validation_nhanes_large.py` |
| MESA synthetique | Distributions publiees | 6 814 | Cohorte generee | `bmn_validation_mesa_synthetic.py` |

Toutes les analyses utilisent une seed fixe (42), 5 imputations MICE (BayesianRidge), et 1 000 iterations bootstrap pour les IC 95%.

### 3.2 Discrimination — AUC-ROC pour le syndrome metabolique

| Cohorte | N | AUC BMN | IC 95% | AUC MC (mean +/- sd) |
|---------|---|---------|--------|---------------------|
| NHANES 2017-2018 | 5 856 | **0.838** | [0.827-0.849] | 0.837 +/- 0.002 |
| NHANES 4 cycles | 23 825 | **0.849** | [0.844-0.855] | 0.837 +/- 0.001 |
| MESA synthetique | 6 814 | **0.801** | [0.791-0.812] | 0.801 +/- 0.000 |

### 3.3 Discrimination — AUC-ROC pour l'obesite

| Cohorte | N | AUC BMN | IC 95% |
|---------|---|---------|--------|
| NHANES 2017-2018 | 5 856 | **0.716** | [0.703-0.728] |
| NHANES 4 cycles | 23 825 | **0.739** | [0.733-0.745] |
| MESA synthetique | 6 814 | **0.738** | [0.727-0.749] |

### 3.4 Comparaison avec modeles supervises (MetS, NHANES 4 cycles)

| Modele | AUC | Type |
|--------|-----|------|
| Gradient Boosting | 0.926 | Supervise |
| Random Forest | 0.919 | Supervise |
| Regression logistique | 0.872 | Supervise |
| **Score BMN v3.0** | **0.849** | **A base de regles** |

Le Score BMN, sans aucun entrainement supervise, atteint 92% de la performance de la regression logistique et 92% du Gradient Boosting pour le MetS. C'est remarquable pour un algorithme a base de regles cliniques.

### 3.5 Metriques complementaires (NHANES 4 cycles, MetS)

| Metrique | Valeur | Interpretation |
|----------|--------|---------------|
| Score de Brier (BMN) | 0.136 | Acceptable (LR: 0.118) |
| NRI vs LR | -0.133 | Negatif — BMN reclasse moins bien que LR |
| IDI vs LR | -0.145 | Negatif — discrimination incrementale inferieure |
| Hosmer-Lemeshow chi2 | 1423.3 (p<0.001) | Calibration sous-optimale |
| DeLong BMN vs LR | p<0.001 | Difference significative |
| Stabilite MC (50 runs) | 0.837 +/- 0.001 | Excellente stabilite |

### 3.6 Simulation BTM/GRS — Preuve de concept interne

**Important** : Il ne s'agit PAS d'une validation externe. Le design NHANES transversal ne permet pas de valider des predictions therapeutiques. C'est une preuve de coherence interne avec design anti-circularite.

**Design anti-circularite** (3 garde-fous) :
1. Injection de 25% de variance latente independante par simulation
2. Modificateurs bases sur valeurs brutes (HOMA-IR, hs-CRP, leptine), non sur les scores GRS
3. Coefficients inferieurs aux maxima theoriques

**Resultats GRS simules (N=12 733, 1 000 simulations/sujet)** :

| Profil | N (%) | Repondeurs (%) | Super-resp (%) | TBWL moyen (%) |
|--------|-------|---------------|----------------|----------------|
| R1 — Excellent | 314 (2.5%) | 92.0% | 33.8% | 17.5% |
| R2 — Bon | 2 714 (21.3%) | 80.9% | 8.8% | 13.8% |
| R3 — Partiel | 6 241 (49.0%) | 64.0% | 0.1% | 11.3% |
| R4 — Non-repondeur | 3 186 (25.0%) | 63.1% | 0.1% | 11.2% |
| CI — Contre-indication | 278 (2.2%) | 0.0% | 0.0% | 5.4% |

**Discrimination GRS simulee** :

| Modele | AUC | IC 95% |
|--------|-----|--------|
| GRS — Repondeur (TBWL >= 10%) | 0.571 | [0.560-0.581] |
| GRS — Super-repondeur (TBWL >= 20%) | 0.911 | [0.898-0.922] * |
| Baseline LR (IMC+age+sexe+HOMA) | 0.579 | — |
| Null model (profils permutes) | 0.513 | [0.501-0.525] |

\* Circularite residuelle reconnue pour les super-repondeurs.

Correlation residuelle GRS-TBWL simule : r = 0.24 (IC 95% : 0.22-0.26), confirmant un couplage partiel mais non tautologique.

### 3.7 Forces de la validation existante

- AUC MetS 0.849 **sans entrainement supervise** : valide la pertinence des regles cliniques
- **Stabilite Monte Carlo** : AUC 0.837 +/- 0.001 sur 50 imputations
- **Reproductibilite totale** : seed fixe 42, code open source, donnees publiques NHANES
- **Validation temporelle** : developpement 2011-2014, validation 2015-2018
- **Multi-cohortes** : coherence des resultats sur 3 cohortes independantes
- **Compliance TRIPOD+AI** : reporting conforme aux standards actuels

### 3.8 Limites reconnues honnetement

1. **Design transversal** : NHANES est une enquete transversale — pas de validation longitudinale
2. **NRI negatif** : BMN reclasse moins bien que la regression logistique entraine
3. **Calibration Hosmer-Lemeshow significative** : le score BMN est mal calibre dans les deciles extremes
4. **Circularite GRS** : la simulation BTM/GRS est une preuve de coherence interne, PAS une validation de la prediction GLP-1 reelle
5. **Biomarqueurs manquants** : NHANES ne dispose pas des 18 biomarqueurs (C-peptide, FGF21, glucagon, adiponectine, leptine absents)
6. **Cohorte MESA synthetique** : generee a partir de distributions, pas de donnees individuelles
7. **Pas de cohorte GLP-1 traitee** : aucun sujet n'a recu de GLP-1 dans NHANES

### 3.9 Ce qui reste a prouver

| Question | Methode requise |
|----------|----------------|
| Le Score BMN predit-il le MetS en population multi-ethnique reelle ? | Validation prospective COMPASS-MU |
| Les profils GRS (R1-R4) correspondent-ils a la reponse GLP-1 reelle ? | Sous-cohorte GLP-1 prospective |
| Le CTI predit-il la resistance a la perte de poids ? | Suivi longitudinal 12 mois |
| Les seuils ethniques sont-ils calibres pour Maurice ? | Recalibration sur cohorte mauricienne |
| Le modele de Markov est-il predictif a 12 mois ? | Comparaison trajectoire predite vs observee |
| Le module BTM oriente-t-il la decision chirurgicale ? | Concordance BTM vs decision experte |

---

## 4. Protocole de validation prospective COMPASS-MU

### 4.1 Identite de l'etude

| Element | Detail |
|---------|--------|
| Acronyme | **COMPASS-MU** (COMPASS-Mauritius) |
| Titre | Validation prospective multi-ethnique de la plateforme COMPASS pour la stratification du risque metabolique et le profilage de la reponse GLP-1 a Maurice |
| Design | Etude de cohorte prospective observationnelle, multicentrique |
| Phase | Validation externe (phase III de developpement d'un score) |
| Duree | 24 mois de recrutement + 12 mois de suivi minimum |
| Sites | 3 a 5 centres a Maurice |
| Promoteur | A definir |
| Registre | ClinicalTrials.gov (pre-enregistrement obligatoire) |

### 4.2 Objectifs

**Objectif principal (Bras A)** :
Evaluer la performance discriminative du Score BMN v3.5 pour la prediction du syndrome metabolique (criteres harmonises 2009) dans une cohorte adulte multi-ethnique mauricienne.

**Objectif principal (Bras B)** :
Evaluer la concordance entre le profil GRS predit (R1-R4) et la reponse observee aux agonistes GLP-1 a 6 mois (seuil : TBWL >= 10%).

**Objectifs secondaires** :
- Calibration du Score BMN par groupe ethnique (Indo-Mauricien, Creole, Sino-Mauricien, Franco-Mauricien)
- Comparaison Score BMN vs FINDRISC pour la prediction du MetS (NRI, IDI)
- Valeur predictive du CTI pour la perte de poids a 12 mois
- Concordance entre recommandation BTM et decision chirurgicale reelle
- Performance du modele de Markov : trajectoire predite vs observee a 12 mois
- Validation de l'axe 7 (beta-cellulaire/secretoire) du GRS avec dosages C-peptide, FGF21, glucagon

### 4.3 Design de l'etude

```
                   SCREENING (V-1)
                        |
                   Consentement eclaire
                   Criteres inclusion/exclusion
                        |
                   INCLUSION (V0) ---- Bras A: TOUS (N=500)
                   Questionnaire COMPASS        |
                   Bilan biologique P15      Bras B: sous-cohorte GLP-1
                   Score BMN + GRS + CTI     (N=180, inclus dans Bras A)
                   MetS objectif (V0)            |
                        |                   Initiation GLP-1
                        |                   (semaglutide ou tirzepatide)
                        |                        |
                   SUIVI M3 (V1) ---------- SUIVI M3 (V1)
                   Telephone                Consultation
                   Observance               Poids + observance
                   Effets indesirables           |
                        |                        |
                   SUIVI M6 (V2) ---------- SUIVI M6 (V2)
                   Consultation             Consultation
                   Biologie + poids         Biologie + poids
                   MetS objectif            TBWL calcule
                        |                   ENDPOINT PRIMAIRE B
                        |                        |
                   SUIVI M12 (V3) --------- SUIVI M12 (V3)
                   Consultation             Consultation
                   Biologie + poids         Biologie + poids
                   MetS objectif            TBWL 12 mois
                   Markov check             CTI vs perte poids
                   ENDPOINTS SECONDAIRES    ENDPOINTS SECONDAIRES
```

### 4.4 Population

**Criteres d'inclusion** :
- Age >= 18 ans
- IMC >= 25 kg/m2 (ou >= 23 kg/m2 pour les sujets d'origine sud-asiatique ou est-asiatique, conformement aux seuils OMS/IDF)
- Consultation pour surpoids, obesite ou risque metabolique
- Resident a Maurice depuis >= 6 mois (necessaire pour le module FNC)
- Consentement eclaire signe

**Criteres d'inclusion specifiques Bras B** :
- Indication a un traitement par agoniste GLP-1 (semaglutide ou tirzepatide) posee par le medecin traitant independamment de l'etude
- IMC >= 27 kg/m2 avec au moins une comorbidite OU IMC >= 30 kg/m2

**Criteres d'exclusion** :
- Grossesse ou allaitement
- Cancer actif ou traitement oncologique en cours
- Chirurgie bariatrique < 2 ans
- Insuffisance renale severe (DFG < 30 mL/min)
- Antecedent personnel ou familial de neoplasie endocrinienne multiple de type 2 (NEM2) ou carcinome medullaire de la thyroide (contre-indication GLP-1)
- Incapacite a consentir
- Participation a un autre essai therapeutique

**Stratification obligatoire** :
- Par ethnie : minimum 25% Indo-Mauricien, 25% Creole, 10% Sino-Mauricien, 10% Franco-Mauricien, 30% autres/mixte
- Par sexe : minimum 40% par sexe
- Par classe IMC : minimum 20% IMC 25-30, 30% IMC 30-35, 20% IMC 35-40, 10% IMC >= 40

### 4.5 Calcul de puissance

**Bras A — Validation BMN (endpoint : AUC MetS)** :

Hypotheses :
- Prevalence MetS attendue a Maurice : 35% (donnees MoH 2019)
- AUC attendue : 0.82 (conservateur vs 0.849 NHANES)
- Precision souhaitee : IC 95% de largeur <= 0.06 (soit +/- 0.03)
- Alpha bilateral = 0.05

Formule de Hanley-McNeil :
```
N = (z_alpha/2)^2 * AUC * (1 - AUC) * (1 + (n1-1)*D1 + (n0-1)*D0) / (SE_max)^2
```

Avec les parametres ci-dessus et attrition de 15% :
- **N minimum = 400** (dont ~140 MetS+, ~260 MetS-)
- **N recommande avec attrition = 470**
- **N cible = 500**

**Bras B — Validation GRS (endpoint : concordance profil/reponse)** :

Hypotheses :
- Taux de reponse global attendu (TBWL >= 10%) : 65% (STEP 1, SURMOUNT-1)
- Difference attendue entre R1-R2 et R3-R4 : 20% (85% vs 65%)
- Alpha bilateral = 0.05, puissance 80%

Formule chi-2 :
```
N par groupe = (z_alpha/2 + z_beta)^2 * (p1*(1-p1) + p2*(1-p2)) / (p1 - p2)^2
```

- **N minimum sous GLP-1 = 150** (75 R1-R2, 75 R3-R4)
- **N recommande avec attrition 20% = 180**

**Total** : N = 500 (dont 180 sous GLP-1 dans le Bras B)

### 4.6 Deroulement pratique

**Visite V-1 — Screening (J-14 a J0)** :
- Information du patient, remise de la notice
- Verification des criteres d'inclusion/exclusion
- Signature du consentement eclaire

**Visite V0 — Inclusion (J0)** :
- Questionnaire COMPASS complet (20 ecrans, ~10 minutes, supervise)
- Mesures anthropometriques standardisees : taille (stadiometre), poids (balance calibree), tour de taille (ruban a mi-distance entre derniere cote et crete iliaque)
- Pression arterielle (3 mesures au repos, moyenne des 2 dernieres)
- Bilan biologique P15 complet :
  - Panel de base : glycemie a jeun, HbA1c, insulinemie a jeun, bilan lipidique (CT, HDL, LDL, TG), hs-CRP, TSH, ASAT, ALAT, GGT, creatinine, urate, NFS
  - Panel etendu : adiponectine, leptine, ApoB
  - Panel axe 7 (beta-cellulaire) : C-peptide a jeun, FGF21, glucagon a jeun
- Calcul HOMA-IR = (insuline x glycemie) / 22.5
- Diagnostic MetS objectif (criteres harmonises 2009 — Alberti et al.)
- Calcul Score BMN sf, CTI, GRS, profil R1-R5/CI, recommandation BTM
- Geolocalisation (code postal + coordonnees GPS pour module FNC/Exposome)

**Visite V1 — M3 (Bras A : telephone / Bras B : consultation)** :
- Bras A : appel telephonique structure (evenements, changements de traitement)
- Bras B : consultation avec pesee, evaluation observance GLP-1, effets indesirables, score de satisfaction

**Visite V2 — M6** :
- Consultation
- Pesee + tour de taille
- Bilan biologique P15 complet (identique a V0)
- MetS objectif
- Bras B : calcul TBWL a 6 mois = (poids V0 - poids V2) / poids V0 x 100
- **Endpoint primaire Bras B** : TBWL >= 10% = repondeur

**Visite V3 — M12** :
- Consultation
- Pesee + tour de taille
- Bilan biologique P15
- MetS objectif
- TBWL a 12 mois
- Comparaison Markov predit vs observe
- Endpoints secondaires

### 4.7 Plan d'analyse statistique (SAP)

#### 4.7.1 Analyse primaire Bras A

- **AUC-ROC** du Score BMN sf pour la prediction du MetS a V0
- IC 95% par bootstrap (2 000 iterations, stratifie par ethnie)
- Test de DeLong pour comparaison BMN vs FINDRISC
- Seuil de succes : AUC >= 0.80 (borne inferieure de l'IC 95%)

#### 4.7.2 Analyse primaire Bras B

- Tableau de contingence : profil GRS predit (R1-R2 vs R3-R4) x reponse observee (repondeur vs non-repondeur)
- Sensibilite, specificite, VPP, VPN du GRS pour la prediction de la reponse
- Kappa pondere (accord profil predit vs observe)
- AUC du GRS continu pour la prediction du statut repondeur
- Seuil de succes : taux de reponse R1-R2 significativement superieur a R3-R4 (p < 0.05)

#### 4.7.3 Analyses secondaires

| Analyse | Methode | Metrique |
|---------|---------|----------|
| Calibration BMN | Hosmer-Lemeshow, ICI, E/O ratio, calibration slope | p, ICI, slope |
| BMN vs FINDRISC | NRI, IDI, DeLong | NRI, IDI, p |
| Sous-groupes ethniques | Foret plot AUC par ethnie | AUC + IC par groupe |
| CTI vs perte poids M12 | Correlation Spearman, regression lineaire | rho, R2 |
| BTM vs decision reelle | Kappa, concordance | kappa, % accord |
| Markov M12 | RMSE trajectoire predite vs observee | RMSE |
| Axe 7 GRS | Correlation C-peptide/FGF21/glucagon vs reponse GLP-1 | r, AUC par axe |

#### 4.7.4 Gestion des donnees manquantes

- Imputation multiple MICE (m = 25, 15 iterations, BayesianRidge)
- Regles de Rubin pour la combinaison des estimations
- Analyse de sensibilite en cas complets
- Seed fixe = 42

#### 4.7.5 Corrections pour comparaisons multiples

- Correction de Bonferroni pour les analyses de sous-groupes (6 groupes ethniques : alpha ajuste = 0.05/6 = 0.0083)
- Procedure de Benjamini-Hochberg (FDR 5%) pour les analyses exploratoires

#### 4.7.6 Logiciels

- Python 3.11 (scikit-learn, scipy, statsmodels)
- R 4.3 (pROC, rms, mice)
- REDCap pour la gestion des donnees

### 4.8 Criteres de succes de l'etude

| Critere | Seuil | Niveau |
|---------|-------|--------|
| AUC BMN MetS (Bras A) | Borne inf IC 95% >= 0.75 | Critique |
| AUC BMN MetS (Bras A) | Point estimate >= 0.80 | Cible |
| Repondeurs R1-R2 vs R3-R4 (Bras B) | Difference >= 15%, p < 0.05 | Critique |
| Calibration (slope) | 0.8 - 1.2 | Cible |
| Stabilite inter-ethnique | AUC >= 0.75 dans chaque groupe >= 50 sujets | Souhaitable |

---

## 5. Aspects ethiques et reglementaires

### 5.1 Validation retrospective (realisee)

Les donnees NHANES sont publiques, de-identifiees, et **exemptees d'IRB** conformement a 45 CFR 46.101(b)(4). Aucune approbation ethique n'etait requise pour l'analyse secondaire.

### 5.2 Etude prospective COMPASS-MU

**Comite d'ethique** : soumission au National Ethics Committee, Ministry of Health and Wellness, Republic of Mauritius.

**Consentement eclaire** :
- Formulaire bilingue francais/anglais
- Version creole mauricien disponible si necessaire
- Information claire sur :
  - L'utilisation de l'algorithme COMPASS (aide a la decision, pas substitut)
  - L'utilisation de l'IA (Claude, Anthropic) pour la generation du rapport en langage naturel
  - La collecte de donnees de geolocalisation (code postal, FNC)
  - La contribution anonyme a la recherche
  - Le droit de retrait a tout moment sans consequence sur la prise en charge

**Protection des donnees** :
- Conformite au Data Protection Act 2017 (Maurice)
- Architecture zero-stockage : les donnees patient sont traitees cote client (navigateur), aucune donnee medicale n'est stockee sur le serveur
- CRF electronique (REDCap) : donnees pseudonymisees, heberge sur serveur securise local ou institutionnel
- Separation identite/donnees cliniques par code d'etude

### 5.3 Classification reglementaire du dispositif

COMPASS est un **Software as a Medical Device (SaMD)** selon la classification IMDRF :

| Critere IMDRF | Valeur |
|---------------|--------|
| Signification de l'information | Aide au diagnostic et orientation therapeutique |
| Etat de sante cible | Maladie chronique (obesite metabolique) |
| Categorie de risque | **IIa** (aide a la decision, non autonome) |

A Maurice, il n'existe pas encore de cadre reglementaire specifique aux SaMD. Le positionnement actuel est celui d'un **outil d'aide a la decision clinique** (Clinical Decision Support, CDS) qui :
- Ne remplace PAS la decision medicale
- Requiert la validation par un medecin
- Ne realise aucun diagnostic autonome

**Roadmap reglementaire** (si necessaire) :
1. Phase actuelle : outil de recherche (validation scientifique)
2. Phase 2 : marquage CE (MDR 2017/745) si commercialisation en UE
3. Phase 3 : FDA De Novo ou 510(k) si marche US

### 5.4 Gestion de l'IA dans le dispositif

| Aspect | Implementation |
|--------|---------------|
| Role de l'IA | Generation de rapports en langage naturel uniquement |
| Decision clinique | 100% algorithmique deterministe (pas d'IA dans le calcul) |
| Supervision | Le medecin valide systematiquement le rapport IA |
| Disclosure | Conforme ICMJE — utilisation de LLM declaree dans l'article |
| Risque d'hallucination | Attenuation par prompts structures avec donnees patients exactes |

### 5.5 Equite algorithmique

Les 12 profils ethniques integrent des seuils differentiels scientifiquement fondes (IDF 2006, OMS Asia-Pacific 2004). Un monitoring des performances par groupe ethnique est prevu dans COMPASS-MU pour detecter tout biais :

- AUC par groupe ethnique (foret plot)
- Taux de faux positifs et faux negatifs par groupe
- Calibration par groupe (E/O ratio)
- Si ecart > 10% d'AUC entre groupes : recalibration des poids ethniques

---

## 6. Comite scientifique d'experts

### 6.1 Composition recommandee

| Role | Profil | Mission principale |
|------|--------|-------------------|
| **Expert 1** | Endocrinologue / Diabetologue specialise en obesite | Validation clinique du Score BMN, pertinence des seuils, adequation des parcours therapeutiques |
| **Expert 2** | Chirurgien bariatrique OU specialiste pharmacologie GLP-1 | Validation du module BTM (27 facteurs, 6 techniques), pertinence des profils GRS (R1-R5), adequation des recommandations |
| **Expert 3** | Biostatisticien / Epidemiologiste | Validation methodologique (design anti-circularite, plan d'analyse, calcul de puissance, interpretation des AUC) |

**Membres consultatifs** :
- Specialiste en sante publique (Maurice) : contexte epidemiologique local
- Expert en reglementation SaMD / dispositifs medicaux numeriques : classification, roadmap CE/FDA
- Representant des patients ou association de patients obeses

### 6.2 Missions du comite

1. **Revue critique de l'algorithme** :
   - Pertinence clinique de chaque sous-score (c1-c8, exposome, occupationnel, lifestyle)
   - Adequation des poids et seuils aux connaissances actuelles
   - Coherence des profils ethniques avec la litterature

2. **Validation du protocole prospectif** :
   - Approbation du design, des criteres d'inclusion/exclusion
   - Validation du SAP avant soumission ethique
   - Revue des formulaires de consentement

3. **Evaluation par vignettes cliniques** :
   - 20 vignettes cliniques representant des profils varies (ages, ethnies, comorbidites, severites)
   - Chaque expert evalue independamment : score de risque estime, orientation therapeutique suggeree
   - Comparaison expert vs COMPASS : concordance (kappa), face validity

4. **Monitoring independant** :
   - Analyse intermediaire a N=250 (50% du recrutement)
   - Verification de la qualite des donnees
   - Decision de continuation/arret/modification

5. **Rapport d'expertise conjoint** :
   - Document signe par les 3 experts
   - Conclusion sur la validite de la preuve de concept
   - Recommandations pour la suite

### 6.3 Criteres de validation par les experts

**A. Face validity (validite apparente)** :
- Les resultats COMPASS correspondent-ils a l'intuition clinique du praticien ?
- Methode : 20 vignettes cliniques, echelle de Likert 1-5 par expert
- Seuil : score moyen >= 3.5/5

**B. Content validity (validite de contenu)** :
- Les dimensions CLEO couvrent-elles les determinants connus de l'obesite metabolique ?
- Methode : checklist des facteurs de risque connus, notation de la couverture
- Seuil : >= 80% des facteurs identifies couverts par au moins une dimension

**C. Construct validity (validite de construit)** :
- Les correlations avec MetS/obesite sont-elles dans la direction attendue ?
- Les sous-scores se comportent-ils comme prevu (ex: c4 comorbidites correle a MetS) ?
- Methode : matrice de correlation des sous-scores avec les outcomes
- Seuil : correlations conformes aux hypotheses dans >= 90% des cas

**D. Pertinence therapeutique (BTM/GRS)** :
- Les recommandations BTM sont-elles coherentes avec les guidelines (ADA 2024, ESC 2021, IFSO) ?
- Les profils GRS sont-ils cliniquement plausibles ?
- Methode : revue structuree par l'expert bariatrique/GLP-1
- Seuil : accord sur >= 80% des recommandations BTM sur les 20 vignettes

### 6.4 Calendrier des travaux du comite

| Phase | Periode | Activites |
|-------|---------|-----------|
| **Phase 1** | M0 - M2 | Constitution du comite, revue algorithmique, revue du protocole |
| **Phase 2** | M3 - M5 | Vignettes cliniques (20 cas), evaluation face/content validity |
| **Phase 3** | M5 - M6 | Rapport d'expertise pre-lancement, soumission ethique |
| **Phase 4** | M6 - M18 | Monitoring du recrutement, analyse intermediaire a N=250 |
| **Phase 5** | M18 - M24 | Monitoring fin de recrutement |
| **Phase 6** | M24 - M30 | Analyse finale, rapport d'expertise definitif |
| **Phase 7** | M30 - M36 | Publication des resultats, recommandations pour v4.0 |

---

## 7. Limites, risques et plan de mitigation

### 7.1 Risques identifies et mitigation

| # | Risque | Probabilite | Impact | Mitigation |
|---|--------|------------|--------|------------|
| R1 | **Biais de selection** : Maurice ne represente pas la population mondiale | Elevee | Modere | Stratification ethnique obligatoire ; comparaison avec AUC NHANES ; positionnement clair comme validation regionale |
| R2 | **Attrition** : GLP-1 couteux, abandon du traitement | Elevee | Eleve | Surrecrutement 20% Bras B ; suivi telephonique M3 ; prise en charge du cout GLP-1 si budget disponible |
| R3 | **Performance ethnique heterogene** : AUC insuffisante dans un groupe minoritaire | Moderee | Eleve | Quotas minimaux par ethnie ; analyse pre-specifiee par sous-groupe ; recalibration si ecart > 10% |
| R4 | **Sur-ajustement ethnique** : 12 profils pour des effectifs potentiellement faibles | Moderee | Modere | Regroupement des ethnies a faible effectif (< 30) ; validation croisee leave-one-group-out |
| R5 | **Hallucination IA** : rapport Claude contenant des informations incorrectes | Faible | Modere | Prompts structures avec donnees exactes ; supervision medicale obligatoire ; disclaimer visible |
| R6 | **Circularite residuelle GRS** : les resultats simules ne predisent pas la realite | Elevee | Eleve | C'est exactement pourquoi le Bras B existe — validation sur reponse GLP-1 reelle |
| R7 | **Recrutement insuffisant** | Moderee | Eleve | 3-5 centres ; partenariat avec associations de patients ; delai de recrutement 24 mois |
| R8 | **Calibration inadaptee** | Moderee | Modere | Recalibration locale planifiee si calibration slope hors [0.8-1.2] |

### 7.2 Criteres d'arret premature

- Analyse intermediaire a N=250 : si AUC BMN < 0.65 (borne inf IC 95%), arret pour futilite
- Evenement de securite grave lie a une mauvaise orientation therapeutique par COMPASS (improbable car COMPASS est non interventionnel et toute decision requiert validation medicale)

---

## 8. Budget estimatif et calendrier

### 8.1 Budget estimatif

| Poste | Cout estime (EUR) | Justification |
|-------|-------------------|---------------|
| Comite d'experts (3 membres, 7 reunions) | 15 000 - 25 000 | Honoraires + deplacements |
| Biologie P15 (500 patients x 3 visites) | 75 000 - 120 000 | Panel etendu incluant C-peptide, FGF21, glucagon, adiponectine, leptine |
| Coordination clinique (ARC, CRA) | 40 000 - 60 000 | 1 ARC temps partiel, 24 mois |
| CRF electronique (REDCap) | 5 000 - 10 000 | Licence + hebergement |
| Logistique (sites, equipements) | 10 000 - 15 000 | Balances calibrees, stadiometres, tensiometres |
| Analyse statistique | 10 000 - 15 000 | Biostatisticien independant |
| Publication | 3 000 - 5 000 | Open access fees |
| Imprevus (10%) | 15 000 - 25 000 | |
| **TOTAL** | **173 000 - 275 000** | |

### 8.2 Chronogramme (Gantt simplifie)

```
M0  M3  M6  M9  M12 M15 M18 M21 M24 M27 M30 M33 M36
|---|---|---|---|---|---|---|---|---|---|---|---|---|
[PHASE 1: PREPARATION                          ]
|===|===|                                        Constitution comite
|===|===|===|                                    Revue algorithme + vignettes
        |===|                                    Soumission ethique
            |===|                                Approbation + pre-enregistrement
                                                 
[PHASE 2: RECRUTEMENT + SUIVI                  ]
            |===|===|===|===|===|===|===|===|    Recrutement (24 mois)
                |===|                            Analyse intermediaire (N=250)
                                                 
[PHASE 3: ANALYSE + PUBLICATION                ]
                                    |===|===|    Fin de suivi dernier patient
                                        |===|===| Analyse finale
                                            |===|===| Redaction article
                                                |===| Soumission + publication
```

---

## 9. References reglementaires et scientifiques

### 9.1 Cadre ethique et reglementaire

1. Declaration d'Helsinki (WMA, version 2013) — principes ethiques pour la recherche medicale
2. CIOMS International Ethical Guidelines for Health-related Research Involving Humans (2016)
3. Data Protection Act 2017, Republic of Mauritius
4. Reglement General sur la Protection des Donnees (RGPD) UE 2016/679 — reference
5. IEC 62304:2006+A1:2015 — Software life cycle processes for medical device software
6. EU MDR 2017/745 — Medical Devices Regulation
7. IMDRF SaMD Framework — Software as a Medical Device: Possible Framework for Risk Categorization and Corresponding Considerations (2014)
8. FDA Digital Health Policy Framework — Clinical Decision Support Software (2022)
9. 45 CFR 46.101(b)(4) — Exemption IRB pour donnees publiques de-identifiees
10. ICMJE Recommendations — Disclosure de l'utilisation de l'IA generative

### 9.2 References scientifiques cles

11. Alberti KG, et al. Harmonizing the metabolic syndrome. Circulation. 2009;120:1640-1645.
12. Wilding JPH, et al. STEP 1 — Semaglutide. N Engl J Med. 2021;384:989-1002.
13. Jastreboff AM, et al. SURMOUNT-1 — Tirzepatide. N Engl J Med. 2022;387:205-216.
14. Davies M, et al. STEP 2 — Semaglutide in T2DM. Lancet. 2021;397:971-984.
15. Garvey WT, et al. SURMOUNT-2 — Tirzepatide in T2DM. Lancet. 2023;402:613-626.
16. Lincoff AM, et al. SELECT — Semaglutide CV outcomes. N Engl J Med. 2023;389:2221-2232.
17. Cifuentes L, et al. CTSGRS — GLP-1 genetic response score. Cell Metab. 2025;37:1655-1666.
18. German J, et al. PRS for GLP-1 response. Nat Med. 2025;31(7):2269-2276.
19. Coral DE, et al. Obesity subclasses. Nat Med. 2025;31:534-543.
20. Lindstrom J, Tuomilehto J. FINDRISC. Diabetes Care. 2003;26:725-731.
21. D'Agostino RB, et al. Framingham Risk Score. Circulation. 2008;117:743-753.
22. SCORE2 Working Group. Eur Heart J. 2021;42:2439-2454.
23. IDF Consensus Worldwide Definition of Metabolic Syndrome. Brussels: IDF; 2006.
24. WHO Expert Consultation. Appropriate BMI for Asian populations. Lancet. 2004;363:157-163.
25. Le TDV, et al. FGF21 and GLP-1 RA weight loss. Mol Metab. 2023;72:101718.
26. Nauck MA, Meier JJ. Incretin effect. J Clin Endocrinol Metab. 2016;101:2908-2918.
27. Sumithran P, et al. Hormonal adaptation persistence. N Engl J Med. 2011;365:1597-1604.
28. ADA Standards of Care in Diabetes — 2024. Diabetes Care. 2024;47(Suppl 1).
29. ESC 2021 Guidelines on CV Disease Prevention. Eur Heart J. 2021;42:3227-3337.
30. Collins GS, et al. TRIPOD+AI. BMJ. 2024;385:e078378.
31. Hanley JA, McNeil BJ. The meaning and use of the AUC. Radiology. 1982;143:29-36.
32. DeLong ER, et al. Comparing the areas under two or more correlated ROC curves. Biometrics. 1988;44:837-845.
33. Rubin DB. Multiple Imputation for Nonresponse in Surveys. Wiley; 1987.
34. Gasoyan H, et al. Real-world semaglutide effectiveness. JAMA Intern Med. 2024;184:1056-1063.

---

## Annexe A — Structure du formulaire de consentement eclaire

1. Titre de l'etude
2. Investigateur principal et coordonnees
3. Objectif de l'etude (langage simple)
4. Description de la participation (visites, prises de sang, questionnaire)
5. Utilisation d'un algorithme informatique (COMPASS) comme outil d'aide
6. Utilisation d'intelligence artificielle pour la generation du rapport (Claude, Anthropic) — l'IA ne prend aucune decision medicale
7. Collecte de donnees de geolocalisation (code postal) pour l'analyse environnementale
8. Risques potentiels (prise de sang, anxiete liee aux resultats)
9. Benefices attendus (bilan metabolique complet gratuit, suivi structure)
10. Confidentialite et protection des donnees (pseudonymisation, Data Protection Act 2017)
11. Droit de retrait a tout moment sans consequence sur la prise en charge
12. Contribution anonyme a la recherche scientifique
13. Coordonnees du comite d'ethique
14. Espace de signature (patient + investigateur + temoin si necessaire)

---

## Annexe B — Checklist de validation algorithmique (pour le comite d'experts)

| # | Item | Expert responsable | Statut |
|---|------|-------------------|--------|
| 1 | Les seuils d'age (c1) sont-ils conformes a Framingham ? | Expert 1 | _ |
| 2 | Les seuils IMC ethniques sont-ils conformes a IDF 2006 / OMS 2004 ? | Expert 1 | _ |
| 3 | Le K-score comorbidites (c4) couvre-t-il les pathologies pertinentes ? | Expert 1 | _ |
| 4 | Les poids des biomarqueurs reflètent-ils les hazard ratios publies ? | Expert 3 | _ |
| 5 | La formule d'integration sf (65/35) est-elle justifiee ? | Expert 3 | _ |
| 6 | Les seuils de classification (30/60/80) sont-ils cliniquement pertinents ? | Expert 1 | _ |
| 7 | Le CTI couvre-t-il les facteurs de chronicisation connus ? | Expert 2 | _ |
| 8 | Les 7 axes du GRS sont-ils fondes sur des mecanismes pharmacologiques documentes ? | Expert 2 | _ |
| 9 | L'axe 7 (beta-cellulaire) est-il supporte par la litterature ? | Expert 2 | _ |
| 10 | La matrice BTM (27 facteurs) est-elle conforme aux guidelines IFSO/ADA ? | Expert 2 | _ |
| 11 | Le modele de Markov (matrice de transition) est-il plausible ? | Expert 3 | _ |
| 12 | Le design anti-circularite (25% bruit, valeurs brutes) est-il suffisant ? | Expert 3 | _ |
| 13 | Le calcul de puissance est-il adequat ? | Expert 3 | _ |
| 14 | Le SAP couvre-t-il toutes les analyses necessaires ? | Expert 3 | _ |
| 15 | Les seuils de succes (AUC >= 0.75/0.80) sont-ils realistes ? | Expert 3 | _ |
| 16 | L'architecture zero-stockage protege-t-elle la vie privee ? | Consultant SaMD | _ |
| 17 | Les 12 profils ethniques sont-ils ethiquement justifies ? | Consultant ethique | _ |
| 18 | Le module FNC (normalisation climatique) est-il pertinent pour Maurice ? | Expert 1 | _ |
| 19 | La prescription adaptative (P0-P15) est-elle appropriee ? | Expert 1 | _ |
| 20 | Le rapport IA est-il encadre par des garde-fous suffisants ? | Consultant SaMD | _ |

---

*Document genere en septembre 2026*
*COMPASS v3.5 — Bach S, Manos T, Noel P*
*Repository : https://github.com/stefbach/score-bmn-v3*
