# COMPASS / Score BMN v3.5 — Note de Synthese Methodologique

## Inventaire complet des travaux de modelisation, validation et simulation

**Auteurs** : Bach S, Manos T, Noel P
**Date** : 28 mars 2026
**Repository** : https://github.com/stefbach/score-bmn-v3
**Application** : https://score-bmn-v3.pages.dev

---

## Table des matieres

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Base de donnees NHANES — Acquisition et consolidation](#2-base-de-donnees-nhanes--acquisition-et-consolidation)
3. [Modelisation du Score BMN (architecture CLEO)](#3-modelisation-du-score-bmn-architecture-cleo)
4. [Modelisation du module BTM (Bariatric Treatment Module)](#4-modelisation-du-module-btm-bariatric-treatment-module)
5. [Modelisation Monte Carlo — Validation BMN](#5-modelisation-monte-carlo--validation-bmn)
6. [Modelisation Monte Carlo — Simulation BTM/GRS](#6-modelisation-monte-carlo--simulation-btmgrs)
7. [Validation multi-cohortes — Resultats consolides](#7-validation-multi-cohortes--resultats-consolides)
8. [Arbre des fichiers du depot](#8-arbre-des-fichiers-du-depot)
9. [Reproductibilite et execution](#9-reproductibilite-et-execution)
10. [Limites et perspectives](#10-limites-et-perspectives)

---

## 1. Vue d'ensemble du projet

Le projet COMPASS (ex-Score BMN) est un algorithme multidimensionnel d'evaluation du risque metabolique et d'aide a la decision therapeutique pour l'obesite. Il integre :

- **Score BMN v3.5** : score composite CLEO (Clinique + Exposome + Occupationnel + Lifestyle) + integration biologique (18 biomarqueurs)
- **Module BTM v3.4** : moteur de decision bariatrique (6 techniques chirurgicales + GLP-1)
- **Module GRS** : GLP-1 Response Score (7 axes, profils R1-R5 + CI)
- **Modele de Markov** : projection d'evolution ponderale a 10 ans
- **CTI** : Chronicity Trajectory Index (indice de chronicite)

Le tout est implemente en **JavaScript** (application web COMPASS) avec portage en **Python** pour validation scientifique sur cohortes reelles.

---

## 2. Base de donnees NHANES — Acquisition et consolidation

### 2.1 Principe d'acquisition

Les donnees NHANES (National Health and Nutrition Examination Survey) du CDC ne sont **pas stockees dans le depot Git** — elles sont **telechargees en temps reel** depuis les serveurs publics du CDC a chaque execution des scripts. C'est un choix methodologique delibere :

- **Reproductibilite** : n'importe quel chercheur peut relancer les scripts et obtenir les memes resultats (seed fixe = 42)
- **Conformite** : les fichiers XPT sont publics et librement accessibles, pas besoin de redistribution
- **Volume** : les donnees brutes representent ~500 Mo pour 4 cycles, inadapte a un depot Git

### 2.2 Source des donnees

```
URL : https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{year}/DataFiles/{table}_{suffix}.XPT
Format : SAS Transport (.XPT)
Acces : Public, sans authentification
```

### 2.3 Cycles NHANES utilises

| Cycle | Suffixe | Annees | Utilisation |
|-------|---------|--------|-------------|
| G | 2011-2012 | Cohorte elargie (4 cycles) |
| H | 2013-2014 | Cohorte elargie (4 cycles) |
| I | 2015-2016 | Cohorte elargie (4 cycles) |
| J | 2017-2018 | Cohorte simple + cohorte elargie |

### 2.4 Tables NHANES telechargees (17 tables par cycle)

| Table | Contenu | Variables cles extraites |
|-------|---------|-------------------------|
| DEMO | Demographie | Age, sexe, ethnicite (RIDAGEYR, RIAGENDR, RIDRETH3) |
| BMX | Anthropometrie | IMC, tour de taille, taille (BMXBMI, BMXWAIST, BMXHT) |
| BIOPRO | Biochimie | Glucose, urate, AST, GGT, creatinine, albumine |
| GHB | HbA1c | Hemoglobine glyquee (LBXGH) |
| TRIGLY | Triglycerides | Triglycerides seriques (LBXTR) |
| HDL | HDL cholesterol | HDL-C (LBDHDD) |
| TCHOL | Cholesterol total | CT (LBXTC) |
| INS | Insuline | Insulinemie a jeun (LBXIN) |
| HSCRP | CRP ultrasensible | hs-CRP (LBXHSCRP) |
| DPQ | PHQ-9 depression | Score PHQ-9 (DPQ010-DPQ090) |
| SLQ | Sommeil | Heures de sommeil, troubles (SLD012, SLQ050) |
| PAQ | Activite physique | Minutes activite/semaine (PAQ610, PAQ625, PAD660, PAD675) |
| SMQ | Tabagisme | Statut tabac, nombre cig/jour (SMQ020, SMQ040, SMD650) |
| ALQ | Alcool | Consommation alcool (ALQ130, ALQ142) |
| DIQ | Diabete | Diagnostic diabete, prediabete (DIQ010, DIQ160) |
| BPQ | Hypertension | Diagnostic HTA, traitement (BPQ020, BPQ040A) |
| MCQ | Conditions medicales | Maladies cardiovasculaires, cancers, foie (MCQ160B-F, MCQ220) |

### 2.5 Pipeline de consolidation

```
17 tables NHANES (par cycle)
        |
        v
   Fusion sur SEQN (identifiant unique)
        |
        v
   Filtrage adultes >= 18 ans
        |
        v
   Harmonisation des variables
   (recodage, creation variables derivees)
        |
        v
   Variables derivees :
   - HOMA-IR = (insuline x glucose) / 405
   - WHtR = tour_taille / taille
   - TG/HDL ratio
   - LDL Friedewald = CT - HDL - TG/5
   - Score PHQ-9 (somme items)
   - Minutes activite physique/semaine
        |
        v
   Imputation MICE (Monte Carlo)
   - 5 imputations multiples
   - BayesianRidge pour variables continues
   - Seed fixe = 42
        |
        v
   Cohorte consolidee prete pour validation
```

### 2.6 Taille des cohortes consolidees

| Cohorte | N final | Script |
|---------|---------|--------|
| NHANES 2017-2018 (simple) | **5 856** adultes | `bmn_validation_nhanes.py` |
| NHANES 2011-2018 (elargie, 4 cycles) | **23 825** adultes | `bmn_validation_nhanes_large.py` |
| MESA synthetique | **6 814** participants | `bmn_validation_mesa_synthetic.py` |

---

## 3. Modelisation du Score BMN (architecture CLEO)

### 3.1 Structure du score

Le Score BMN est un score composite sur 100 points, divise en 4 dimensions :

```
Score BMN = C + E + O + L  (cap a 100)

C = Score Clinique       (0–50 points)
E = Score Exposome       (0–45 points)
O = Score Occupationnel  (0–10 points)
L = Score Lifestyle      (0–10 points)
```

### 3.2 Score C — Composante Clinique (0–50 pts)

8 sous-scores :

| Sous-score | Description | Max |
|------------|-------------|-----|
| c1 | Age (>=65: 10pts, >=55: 7, >=45: 5, >=40: 2) | 10 |
| c2 | Sexe masculin < 60 ans | 2 |
| c3 | Anthropometrie (IMC + WHtR + tour de taille) | 12 |
| c4 | Comorbidites (K-score 0-50, HTA x multiplicateur, diabete) | 10 |
| c5 | Antecedents familiaux/genetiques (parents obeses, DT2 familial, yoyo) + facteur ethnique | 10 |
| c6 | Tabagisme (niveaux 0-4) | 8 |
| c7 | Stress mental (PSS + PHQ-9 + BES) | 8 |
| c8 | Sommeil (heures + ISI) | 4 |

Un plancher (GF >= 25) est applique pour certaines combinaisons de comorbidites severes (DT2 + HTA), modulable par l'activite physique et le regime (jusqu'a -8 pts).

### 3.3 Score E — Composante Exposome (0–45 pts)

3 couches environnementales :

| Couche | Description | Poids |
|--------|-------------|-------|
| A | Environnement physique : qualite de l'air (PM2.5, NO2, O3), temperature, UV | 0.70 |
| B | Mobilite/sedentarite : distance domicile-travail, temps assis (modere par activite physique) | 0.50 |
| C | Perturbateurs : alimentation ultra-transformee, fast-food | 0.30 |

Formule : `E* = 30 x (0.7A + 0.5B + 0.3C) / 1.5` puis multiplication par un facteur inflammatoire biologique (bInflam).

### 3.4 Score final integre

```
sf = wDecl x sD + wBio x bioNorm

sD     = min(100, C + E + O + L)     Score declaratif
bioNorm = Score biologique (0-100)    15-18 biomarqueurs z-scores
wDecl  = 0.65                         Poids declaratif
wBio   = 0.35                         Poids biologique
```

Classification finale :

| Classe | Score sf |
|--------|----------|
| FAIBLE | < 30 |
| MODERE | 30–59 |
| ELEVE | 60–79 |
| TRES ELEVE | >= 80 |

### 3.5 Implementation

- **JavaScript** : `public/static/app.js` (application web COMPASS, 3 000+ lignes)
- **Python** : portage dans chaque script de validation (`bmn_validation_nhanes.py`, etc.)
- **Documentation** : `DOSSIER_ALGORITHME_BMN.md` (43 000 caracteres, 27 sections)
- **Tests** : `score-bmn-v3.test.js`

---

## 4. Modelisation du module BTM (Bariatric Treatment Module)

### 4.1 Moteur de decision BTM v3.4

Le module BTM attribue un score a 6 techniques chirurgicales + GLP-1 :

| Code | Technique |
|------|-----------|
| BT-1 | Ballon intragastrique |
| BT-2 | ESG (Endoscopic Sleeve Gastroplasty) |
| BT-3 | Anneau gastrique ajustable |
| BT-4 | Sleeve gastrectomie |
| BT-5 | Bypass gastrique (Roux-en-Y) |
| BT-6 | SADI-S / Bypass biliopancreatique (sous-types 6a-6e) |

### 4.2 Matrice de decision

27 facteurs sont evalues avec poids specifiques par technique :

- IMC (ranges), comorbidites, diabete, HTA, SAOS
- BES (Binge Eating Scale), PHQ-9, stress PSS-10
- CTI (chronicite), GRS (reponse GLP-1)
- Antecedents chirurgicaux, GERD, ASA score
- Age, preference patient

### 4.3 GLP-1 Response Score (GRS) — 7 axes

| Axe | Poids | Direction |
|-----|-------|-----------|
| 1 — Insulino-resistance | 0.30 | Favorable |
| 2 — Chronicite | 0.18 | Defavorable |
| 3 — Inflammation | 0.12 | Favorable |
| 4 — Psycho-comportemental | 0.12 | Defavorable |
| 5 — Iatrogene | 0.15 | Defavorable |
| 6 — Demographie | Bonus | Variable |
| 7 — Beta-cell/Secretoire | 0.08/0.05 | Bidirectionnel |

Profils GLP-1 (bases sur GRS, IR et chronicite) :

| Profil | GRS seuil | Description |
|--------|-----------|-------------|
| R1 | >= 2.5, IR >= 4, chronique <= 4 | Excellent repondeur |
| R2 | >= 1.0, IR >= 2 | Bon repondeur |
| R3 | >= -0.5 | Repondeur partiel |
| R4 | < -0.5 | Non-repondeur |
| CI | Contre-indications | Contre-indication |

### 4.4 CTI — Chronicity Trajectory Index

```
CTI = somme ponderee de 7 facteurs (coefficients 0.185–0.240), echelonnee 0–100
```

Facteurs : duree obesite, tentatives de perte de poids, yoyo, IMC max, comorbidites chroniques, sedentarite prolongee, antecedents familiaux.

---

## 5. Modelisation Monte Carlo — Validation BMN

### 5.1 Objectif

Valider la capacite discriminative du Score BMN v3.0 a predire le syndrome metabolique (MetS) et l'obesite sur des cohortes reelles (NHANES) et synthetiques (MESA).

### 5.2 Protocole de validation

```
Pour chaque cohorte :
  1. Telecharger les tables NHANES (ou generer cohorte MESA)
  2. Consolider et harmoniser les variables
  3. Imputation MICE (5 imputations, BayesianRidge, seed=42)
  4. Appliquer le Score BMN v3.0 (porte en Python)
  5. Definir les outcomes :
     - MetS : >= 3 criteres NCEP-ATP III (WC, TG, HDL, glycemie, HTA)
     - Obesite : IMC >= 30 kg/m²
  6. Validation statistique :
     a) AUC-ROC + IC 95% bootstrap (1 000 iterations)
     b) NRI (Net Reclassification Improvement)
     c) IDI (Integrated Discrimination Improvement)
     d) Calibration Hosmer-Lemeshow + graphique
     e) Score de Brier
     f) Analyse de sensibilite Monte Carlo (50 imputations)
     g) Comparaison avec modeles supervisses :
        - Regression logistique
        - Random Forest
        - Gradient Boosting
  7. Sous-groupes : foret plot par sexe, age, IMC, ethnicite
  8. Heatmap biomarqueurs : contribution individuelle de chaque biomarqueur
```

### 5.3 Scripts associes

| Script | Cohorte | N |
|--------|---------|---|
| `bmn_validation_nhanes.py` | NHANES 2017-2018 | 5 856 |
| `bmn_validation_nhanes_large.py` | NHANES 2011-2018 (4 cycles) | 23 825 |
| `bmn_validation_mesa_synthetic.py` | MESA synthetique | 6 814 |
| `biolincc_data_loader.py` | Chargeur generique BioLINCC (MESA, FHS, ARIC, JHS) | Variable |

### 5.4 Figures generees (par cohorte)

| Figure | Contenu |
|--------|---------|
| fig1_roc_mets.png / fig1_roc_obesity.png | Courbes ROC (BMN vs LR vs RF vs GB) |
| fig2_calibration_mets.png / fig2_calibration_obesity.png | Graphiques de calibration |
| fig3_distribution_mets.png / fig3_distribution_obesity.png | Distribution des scores par outcome |
| fig4_monte_carlo_sensitivity.png | Sensibilite Monte Carlo (50 runs) |
| fig5_forest_plot.png | Foret plot AUC sous-groupes |
| fig6_biomarker_heatmap.png | Heatmap contribution biomarqueurs |
| fig7_auc_by_cycle.png | AUC par cycle NHANES (cohorte elargie uniquement) |

---

## 6. Modelisation Monte Carlo — Simulation BTM/GRS

### 6.1 Objectif

Preuve de concept de la coherence interne du module BTM/GRS. **Ce n'est PAS une validation externe** — le design NHANES transversal ne permet pas de valider des predictions therapeutiques. Une validation prospective sur cohortes GLP-1 traitees est requise.

### 6.2 Design anti-circularite (§2.7 de l'article)

Pour eviter la circularite (le score GRS predit lui-meme les outcomes qu'il a generes), le design impose :

1. **Injection de bruit latent** : 25% de variance independante sur chaque simulation
2. **Modificateurs bases sur valeurs brutes** (non les scores GRS eux-memes)
3. **Coefficients modificateurs < maxima theoriques**
4. **Seed fixe = 42** pour reproductibilite totale
5. **N = 1 000 simulations par sujet**

### 6.3 Pipeline de simulation

```
Donnees NHANES (23 825 sujets, 4 cycles)
        |
        v
   Calcul GRS Python (miroir exact de app.js v3.5)
   7 axes : IR, Chronicite, Inflammation, Psycho, Iatrogene, Demo, Beta-cell
        |
        v
   Attribution profils (R1, R2, R3, R4, CI)
        |
        v
   Simulation Monte Carlo (1 000 iterations/sujet, seed=42)
   - TBWL (Total Body Weight Loss) simule
   - Injection bruit 25%
   - Modificateurs biomarqueurs bruts
        |
        v
   Analyse discriminative
   - AUC GRS vs baseline LR vs null model
   - Taux de reponse / super-reponse par profil
   - Sensibilite par axe GRS
        |
        v
   Tables 3, 4, 5 de l'article
```

### 6.4 Resultats cibles (article Table 3)

| Profil | n (%) | Repondeurs (%) | Super-resp (%) | TBWL moyen (%) |
|--------|-------|----------------|----------------|----------------|
| R1 — Excellent | 2.5% | 92.0% | 33.8% | 17.5% |
| R2 — Bon | 21.3% | 80.9% | 8.8% | 13.8% |
| R3 — Partiel | 49.0% | 64.0% | 0.1% | 11.3% |
| R4 — Non-repondeur | 25.0% | 63.1% | 0.1% | 11.2% |
| CI — Contre-indication | 2.2% | 0.0% | 0.0% | 5.4% |

### 6.5 AUC discriminatives (article Table 4)

| Modele | AUC | IC 95% |
|--------|-----|--------|
| GRS — Repondeur (TBWL >= 10%) | 0.571 | [0.560–0.581] |
| GRS — Super-repondeur (TBWL >= 20%) | 0.911 | [0.898–0.922] * |
| Baseline LR | 0.579 | — |
| Null model | 0.513 | [0.501–0.525] |

\* Circularite residuelle reconnue — design anti-circularite attenuation maximale.

### 6.6 Script et documentation

- **Script** : `bmn_btm_grs_simulation.py` (40 000+ caracteres)
- **Documentation** : `BTM_SIMULATION_README.md`

---

## 7. Validation multi-cohortes — Resultats consolides

### 7.1 AUC-ROC pour le syndrome metabolique (MetS)

| Cohorte | N | AUC BMN | IC 95% | AUC MC (mean +/- sd) |
|---------|---|---------|--------|----------------------|
| NHANES 2017-2018 | 5 856 | **0.838** | [0.827–0.849] | 0.837 +/- 0.002 |
| NHANES 4 cycles (2011-2018) | 23 825 | **0.849** | [0.844–0.855] | 0.837 +/- 0.001 |
| MESA synthetique | 6 814 | **0.801** | [0.791–0.812] | 0.801 +/- 0.000 |

### 7.2 AUC-ROC pour l'obesite (IMC >= 30)

| Cohorte | N | AUC BMN | IC 95% |
|---------|---|---------|--------|
| NHANES 2017-2018 | 5 856 | **0.716** | [0.703–0.728] |
| NHANES 4 cycles | 23 825 | **0.739** | [0.733–0.745] |
| MESA synthetique | 6 814 | **0.738** | [0.727–0.749] |

### 7.3 Comparaison avec modeles supervises (MetS, NHANES 4 cycles)

| Modele | AUC |
|--------|-----|
| Gradient Boosting | 0.926 |
| Random Forest | 0.919 |
| Regression logistique | 0.872 |
| **Score BMN v3.0** | **0.849** |

> **Interpretation** : Le Score BMN, en tant qu'algorithme a base de regles sans entrainement supervise, atteint une AUC de 0.849 pour la prediction du MetS — comparable a la regression logistique et a 8% du Gradient Boosting. Ceci valide la pertinence clinique d'une approche basee sur des connaissances d'experts plutot que sur un pur apprentissage statistique.

### 7.4 Resultats JSON archivees

Les resultats numeriques complets sont archives dans :

```
bmn_validation/results.json          — NHANES 2017-2018
bmn_validation_large/results_large.json  — NHANES 4 cycles
bmn_validation_mesa_synthetic/results.json  — MESA synthetique
```

Chaque fichier contient : AUC, IC 95%, NRI, IDI, Brier, Hosmer-Lemeshow, DeLong, AUC Monte Carlo, taux observes/predits par decile.

---

## 8. Arbre des fichiers du depot

```
score-bmn-v3/
|
|-- SCRIPTS PYTHON (validation & simulation)
|   |-- bmn_validation_nhanes.py          # Validation NHANES 2017-2018 (N=5,856)
|   |-- bmn_validation_nhanes_large.py    # Validation NHANES 4 cycles (N=23,825)
|   |-- bmn_validation_mesa_synthetic.py  # Validation MESA synthetique (N=6,814)
|   |-- biolincc_data_loader.py           # Chargeur universel BioLINCC (MESA/FHS/ARIC/JHS)
|   |-- bmn_btm_grs_simulation.py         # Simulation Monte Carlo BTM/GRS (Partie B article)
|   |-- regenerate_fr_figures.py          # Regeneration figures FR -> EN
|
|-- RESULTATS DE VALIDATION
|   |-- bmn_validation/                   # NHANES 2017-2018
|   |   |-- fig1_roc_mets.png             #   ROC syndrome metabolique
|   |   |-- fig1_roc_obesity.png          #   ROC obesite
|   |   |-- fig2_calibration_mets.png     #   Calibration MetS
|   |   |-- fig2_calibration_obesity.png  #   Calibration obesite
|   |   |-- fig3_distribution_mets.png    #   Distribution scores MetS
|   |   |-- fig3_distribution_obesity.png #   Distribution scores obesite
|   |   |-- fig4_monte_carlo_sensitivity.png  # Sensibilite Monte Carlo
|   |   |-- fig5_forest_plot.png          #   Foret plot sous-groupes
|   |   |-- fig6_biomarker_heatmap.png    #   Heatmap biomarqueurs
|   |   +-- results.json                  #   Resultats numeriques
|   |
|   |-- bmn_validation_large/             # NHANES 4 cycles (2011-2018)
|   |   |-- (memes figures + fig7_auc_by_cycle.png)
|   |   +-- results_large.json
|   |
|   +-- bmn_validation_mesa_synthetic/    # MESA synthetique
|       |-- (memes 6 figures)
|       +-- results.json
|
|-- ALGORITHME & DOCUMENTATION
|   |-- score-bmn-v3.js                   # Algorithme BMN v3.0 (JavaScript)
|   |-- score-bmn-v3.test.js              # Tests unitaires
|   |-- DOSSIER_ALGORITHME_BMN.md         # Documentation complete algorithme (27 sections)
|   |-- BTM_SIMULATION_README.md          # Documentation simulation BTM/GRS
|   |-- SYNTHESE_METHODOLOGIQUE.md        # Cette note de synthese
|   +-- README.md                         # README general du projet
|
|-- APPLICATION WEB (COMPASS v3.5)
|   |-- src/
|   |   +-- index.tsx                     # Backend Hono (routes, pages HTML)
|   |-- public/static/
|   |   |-- app.js                        # Frontend COMPASS (3,000+ lignes, 335 t() calls)
|   |   |-- i18n.js                       # Dictionnaire bilingue FR/EN (500+ cles)
|   |   |-- styles.css                    # Styles CSS
|   |   |-- BMN_v35_Article_Unified.html  # Article scientifique complet
|   |   |-- BMN_v35_Article_FULL_FORMULAS.html  # Article avec formules
|   |   +-- article-figures/              # 16 figures pour l'article (8 BMN + 8 BTM)
|   |
|   |-- package.json, tsconfig.json, vite.config.ts, wrangler.jsonc
|   +-- ecosystem.config.cjs              # Configuration PM2
|
+-- CONFIGURATION
    |-- .gitignore
    +-- Score_BMN_V2.0.docx               # Version historique v2.0
```

**Total : 74 fichiers trackes dans Git**
- 6 scripts Python
- 3 dossiers de resultats (26 figures PNG + 3 JSON)
- 16 figures article
- 3 fichiers documentation Markdown
- Application web complete (HTML/JS/CSS + backend TypeScript)

---

## 9. Reproductibilite et execution

### 9.1 Pre-requis

```bash
pip install numpy pandas scipy scikit-learn matplotlib seaborn statsmodels
```

### 9.2 Execution des validations

```bash
# Validation NHANES simple (2017-2018) — ~10 min
python3 bmn_validation_nhanes.py

# Validation NHANES elargie (4 cycles) — ~30 min
python3 bmn_validation_nhanes_large.py

# Validation MESA synthetique — ~5 min
python3 bmn_validation_mesa_synthetic.py

# Simulation Monte Carlo BTM/GRS — ~45 min
python3 bmn_btm_grs_simulation.py
```

### 9.3 Parametres de reproductibilite

| Parametre | Valeur |
|-----------|--------|
| Seed global | `np.random.seed(42)` |
| Imputations MICE | 5 |
| Bootstrap iterations | 1 000 |
| Monte Carlo runs (sensibilite) | 50 |
| Monte Carlo runs (BTM/GRS) | 1 000 par sujet |
| Bruit latent (BTM) | 25% variance independante |

### 9.4 Connexion requise

Les scripts necessitent une **connexion internet** pour telecharger les fichiers XPT depuis `wwwn.cdc.gov`. En cas d'echec reseau, le script `biolincc_data_loader.py` supporte aussi le chargement depuis des fichiers locaux (SAS7BDAT, XPT, CSV) si les donnees ont ete prealablement obtenues via BioLINCC.

---

## 10. Limites et perspectives

### 10.1 Limites actuelles

1. **Validation croisee uniquement** : le Score BMN est un algorithme a base de regles, pas un modele entraine — la comparaison AUC avec des modeles supervises est donc interpretative
2. **Design transversal** : NHANES est une enquete transversale — aucune validation longitudinale prospective
3. **BTM/GRS = simulation** : les predictions therapeutiques sont basees sur une simulation Monte Carlo avec design anti-circularite, PAS sur des outcomes reels de traitement GLP-1
4. **Cohorte MESA = synthetique** : generee a partir de distributions publiees, pas de donnees individuelles reelles
5. **Biomarqueurs manquants** : NHANES ne contient pas tous les 18 biomarqueurs du Score BMN v3.5 (ex: C-peptide, FGF21, glucagon, adiponectine, leptine, ApoB)

### 10.2 Perspectives

1. **Validation prospective** : etude en cours a Maurice (12 profils ethniques, recrutement en cours)
2. **Cohorte BioLINCC reelle** : le chargeur `biolincc_data_loader.py` est pret pour MESA, FHS, ARIC, JHS des que les acces seront obtenus
3. **Validation GLP-1** : necessaire sur cohortes traitees par Tirzepatide/Semaglutide pour confirmer les profils R1-R5
4. **Score BMN v4.0** : integration potentielle de donnees genetiques/epigenetiques

---

## References

- Bach S, Manos T, Noel P. *Score BMN v3.5: Development and Internal Validation of a Multidimensional Metabolic Risk and GLP-1 Response Profiling Algorithm (NHANES, N=22,807)*. Soumis 2026.
- NHANES — Centers for Disease Control and Prevention. National Health and Nutrition Examination Survey. https://wwwn.cdc.gov/nchs/nhanes/
- Bild DE et al. (2002) Multi-Ethnic Study of Atherosclerosis: objectives and design. Am J Epidemiol 156:871–881.
- ADA Standards of Care 2024.
- ESC 2021 Guidelines on Cardiovascular Disease Prevention.

---

*Document genere le 28 mars 2026 — Repository : https://github.com/stefbach/score-bmn-v3*
