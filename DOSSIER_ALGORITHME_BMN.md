# DOSSIER COMPLET — ALGORITHME SCORE BMN v3.5

## Architecture CLEO (C + E + O + L) + Integration Biologique BSD v4.9

**Auteurs** : Bach | Manos | Noel
**Version** : 3.0 (BSD v4.9 + Bio v4.7.1)
**Date de verrouillage** : 28 fevrier 2026

---

## TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture generale](#2-architecture-generale)
3. [Donnees d'entree — Profils ethniques](#3-donnees-dentree--profils-ethniques)
4. [Donnees d'entree — Comorbidites](#4-donnees-dentree--comorbidites)
5. [Donnees d'entree — Biomarqueurs](#5-donnees-dentree--biomarqueurs)
6. [Instruments psychometriques valides](#6-instruments-psychometriques-valides)
7. [Phase C — Score Clinique (0-50 pts)](#7-phase-c--score-clinique-0-50-pts)
8. [Phase E — Score Exposome (0-45 pts)](#8-phase-e--score-exposome-0-45-pts)
9. [Phase O — Score Occupationnel (0-10 pts)](#9-phase-o--score-occupationnel-0-10-pts)
10. [Phase L — Score Lifestyle (0-10 pts)](#10-phase-l--score-lifestyle-0-10-pts)
11. [Score Declaratif sD](#11-score-declaratif-sd)
12. [Classification Declarative](#12-classification-declarative)
13. [SII — Sous-Index Inflammatoire Indirect](#13-sii--sous-index-inflammatoire-indirect)
14. [Criteres Independants de Prescription](#14-criteres-independants-de-prescription)
15. [Prescription Biologique (P0/P5/P10/P15)](#15-prescription-biologique-p0p5p10p15)
16. [Score Biologique bioNorm (0-100)](#16-score-biologique-bionorm-0-100)
17. [Score Final sf — Integration Dynamique](#17-score-final-sf--integration-dynamique)
18. [CTI — Chronicity Trajectory Index (0-100)](#18-cti--chronicity-trajectory-index-0-100)
19. [GRI — GLP-1 Response Index (-3 a +6)](#19-gri--glp-1-response-index--3-a-6)
20. [Modele de Markov — Projection 10 ans](#20-modele-de-markov--projection-10-ans)
21. [Retro-Diagnostic Biologique](#21-retro-diagnostic-biologique)
22. [Profils de Simulation Biologique](#22-profils-de-simulation-biologique)
23. [Strategies Therapeutiques](#23-strategies-therapeutiques)
24. [Rapport IA Strategique (Aide au Medecin)](#24-rapport-ia-strategique-aide-au-medecin)
25. [APIs et Sources de Donnees Temps Reel](#25-apis-et-sources-de-donnees-temps-reel)
26. [Flux de Navigation (18 ecrans)](#26-flux-de-navigation-18-ecrans)
27. [References Scientifiques](#27-references-scientifiques)

---

## 1. Vue d'ensemble

Le **Score BMN v3.5** est un algorithme d'evaluation du risque metabolique et d'obesite, concu pour assister le medecin dans sa prise de decision. Il integre :

- **Donnees declaratives** du patient (cliniques, mode de vie, psychometriques)
- **Donnees biologiques** (15 biomarqueurs avec z-scores ponderes)
- **Donnees environnementales en temps reel** (qualite de l'air, meteo, UV)
- **Intelligence artificielle** (Claude AI) pour rapport strategique personnalise
- **Modele predictif de Markov** (projection 10 ans)

**Formule centrale :**

```
sf = wDecl x sD + wBio x bioNorm
```

Ou :
- `sf` = Score final (0-100)
- `sD` = Score declaratif CLEO = min(100, C + E + O + L)
- `bioNorm` = Score biologique normalise (0-100)
- `wDecl` = 0.65 (poids declaratif, ajustable)
- `wBio` = 0.35 (poids biologique, ajustable)

---

## 2. Architecture generale

```
PATIENT → QUESTIONNAIRE (18 ecrans)
              |
              v
         CLEO ENGINE
         ┌─────────────────┐
         │  C (0-50) ──────│──── Clinique: age, sexe, IMC, TT, WHtR, comorbidites, 
         │                 │      ATCD familiaux, tabac, stress, sommeil
         │  E (0-45) ──────│──── Exposome: air (PM2.5, NO2, O3), temp, UV,
         │                 │      trajet, sedentarite, perturbateurs endocriniens
         │  O (0-10) ──────│──── Occupationnel: type travail, horaires, posture,
         │                 │      nuit, retraite, isolement social
         │  L (0-10) ──────│──── Lifestyle: activite physique, alimentation DQI,
         │                 │      alcool, sommeil
         └────────┬────────┘
                  |
                  v
           sD = min(100, C+E+O+L)
                  |
         ┌────────┴────────┐
         │  Classification  │──── FAIBLE (<30) | MODERE (30-59) | ELEVE (60-79) | TRES ELEVE (>=80)
         └────────┬────────┘
                  |
         ┌────────┴────────┐
         │  SII (0-7)      │──── 7 criteres binaires inflammatoires
         │  + Criteres ind. │──── Age>=40, ATCD, comorbidites
         └────────┬────────┘
                  |
                  v
         PRESCRIPTION BIOLOGIQUE
         P0 (optionnel) | P5 (7 marqueurs) | P10 (15 marqueurs) | P15 (20 marqueurs)
                  |
                  v
         ┌────────────────────┐
         │  BIOLOGIE BSD v4.7.1│
         │  bioNorm = (Σ z_i × w_i / Σ w_i) × 100
         │  bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR)
         └────────┬───────────┘
                  |
                  v
         SCORE FINAL sf = wDecl × sD + wBio × bioNorm
         + BioFloor (75%) + BEF (85%) + Reponderation dynamique
                  |
         ┌────────┴────────────────┐
         │  CTI (0-100)            │──── Trajectoire de chronicite
         │  GRI (-3 a +6)         │──── Prediction reponse GLP-1
         │  Markov (10 ans)       │──── Probabilite d'obesite
         │  Retro-diagnostic      │──── Coherence declaratif/bio
         │  Strategies            │──── Plan therapeutique personnalise
         │  Rapport IA            │──── Claude AI pour medecin
         └─────────────────────────┘
```

---

## 3. Donnees d'entree — Profils ethniques

**Source** : OMS Asia-Pacific 2004, IDF 2006, Lancet 2016

9 profils ethniques avec seuils adaptes :

| Code | Nom | Surpoids (ow) | Obesite (ob) | TT Femme (tf) | TT Homme (tm) | Diabete (dR) | HTA (hR) | CV (cR) | InflamMult (iM) | LDL (ldl) | Ethnique Var (ev) |
|------|-----|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| eu | Europeen / Caucasien | 25 | 30 | 88 | 102 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 0 |
| im | Indo-Mauricien | 23 | 27.5 | 80 | 90 | 2.0 | 1.2 | 1.4 | 1.2 | 1.3 | -1.5 |
| cr | Creole Mauricien | 25 | 30 | 84 | 94 | 1.3 | 1.4 | 1.2 | 1.2 | 1.0 | -2 |
| si | Sino-Mauricien | 23 | 27.5 | 80 | 90 | 1.0 | 0.9 | 0.6 | 0.9 | 0.9 | 1.5 |
| sa | Sud-Asiatique | 23 | 27.5 | 80 | 90 | 2.0 | 1.3 | 1.5 | 1.2 | 1.3 | -1.5 |
| af | Africain / Subsaharien | 25 | 30 | 88 | 102 | 1.3 | 1.5 | 1.2 | 1.3 | 1.0 | -1.5 |
| ea | Est-Asiatique | 23 | 27.5 | 80 | 88 | 0.9 | 0.9 | 0.7 | 0.9 | 0.9 | 1.5 |
| se | Sud-Est Asiatique | 23 | 27.5 | 80 | 90 | 1.2 | 1.0 | 1.0 | 1.0 | 1.0 | 0 |
| fm | Franco-Mauricien | 25 | 30 | 88 | 102 | 0.8 | 1.0 | 0.9 | 1.0 | 1.0 | 1 |

**Parametres** :
- `ow` : Seuil de surpoids (IMC)
- `ob` : Seuil d'obesite (IMC)
- `tf` / `tm` : Tour de taille seuil femme / homme (cm)
- `dR` : Multiplicateur risque diabetique
- `hR` : Multiplicateur risque HTA
- `cR` : Multiplicateur risque cardiovasculaire
- `iM` : Multiplicateur inflammation (influence Layer A exposome)
- `ldl` : Modulateur LDL
- `ev` : Variation ethnique (%) appliquee au score C global

---

## 4. Donnees d'entree — Comorbidites

**Source** : ADA 2024, IDF MetS, DPP

13 comorbidites classees en 3 categories :

### Maladies etablies (cat: `dis`)

| ID | Nom | Points (p) | Evidence | Description | Coeff CTI (ca) | Gradient GRI (gr) | GRI fav |
|----|-----|:---:|---------|-------------|:---:|:---:|:---:|
| dt2 | Diabete Type 2 | 14 | HR 3.84 | Insulinoresistance severe. Perte esperance vie 8.9 ans | 1.8 | 0.65 | Non |
| predmt | Pre-diabete | 8 | HR 2.11 | HbA1c 5.7-6.4%. Reversible | 1.2 | 0.82 | Oui |
| hta | HTA etablie | 10 | HR 2.24 | Facteur aggravant obesite viscerale | 1.1 | 0 | Non |
| saos | SAOS (Apnee du sommeil) | 12 | OR 2.19 | Insulinoresistance via hypoxie + cortisol nocturne | 1.4 | 0 | Non |
| sopk | SOPK (Femme) | 14 | OR 2.77 | Phenotype IR feminin. GLP-1 efficace | 1.2 | 0.83 | Oui |
| nafld | NAFLD / Steatose hepatique | 10 | OR 3.22 | Insulinoresistance hepatique | 1.1 | 0.66 | Oui |
| hypo | Hypothyroidie | 6 | OR 1.74 | TSH > 4. Metabolisme ralenti -10/15% | 1.3 | 0 | Non |
| mets | Syndrome metabolique | 12 | HR 2.64 | 3 criteres IDF ou plus | 1.3 | 0.65 | Oui |

### Phenotypes metaboliques (cat: `phe`)

| ID | Nom | Points (p) | Evidence | Description | ca | gr | GRI fav |
|----|-----|:---:|---------|-------------|:---:|:---:|:---:|
| monw | Phenotype MONW | 10 | OR 2.38 | IMC < 25 mais 2+ criteres MetS | 1.1 | 0.70 | Oui |
| ir_occ | IR occulte | 8 | OR 2.12 | TG/HDL > 3.5 non diagnostique | 1.2 | 0.55 | Oui |

### Traitements aggravants (cat: `tx`)

| ID | Nom | Points (p) | Evidence | Description | ca | gr | GRI fav |
|----|-----|:---:|---------|-------------|:---:|:---:|:---:|
| cortis | Corticoides > 3 mois | 8 | HR 2.12 | Adipogenese viscerale iatrogene | 1.6 | -0.35 | Non |
| antidep | Antidepresseurs obesogenes | 4 | OR 1.58 | Paroxetine/mirtazapine | 1.1 | 0 | Non |
| depres | Depression traitee | 6 | OR 1.92 | Impact metabolique bidirectionnel | 1.2 | 0 | Non |

**Score BMN-K** = Somme des points des comorbidites selectionnees, cap a **50 points**.

---

## 5. Donnees d'entree — Biomarqueurs

**Source** : SCORE2/Framingham, ADA 2024, CTT 2010, ERFC 2010, CKD-PC 2010

15 biomarqueurs organises en 3 tiers de prescription :

### Panel P5 — Depistage (7 marqueurs, tier = 5)

| ID | Nom | Unite | Normal (nm) | Anormal (ab) | Poids (w) | Inverse | Plage normale | Plage alerte | Label |
|----|-----|-------|:---:|:---:|:---:|:---:|---------|--------|-------|
| homaIR | HOMA-IR | - | 2.5 | 4.0 | **2.5** | Non | < 2.5 | >= 4.0 | Resistance insuline |
| hba1c | HbA1c | % | 5.7 | 6.5 | **2.0** | Non | < 5.7 | >= 6.5 | Sucre moyen 3 mois |
| glyc | Glycemie a jeun | mmol/L | 5.6 | 7.0 | **1.8** | Non | < 5.6 | >= 7.0 | Sucre sanguin |
| crphs | CRP ultrasensible | mg/L | 1.0 | 3.0 | **2.0** | Non | < 1.0 | >= 3.0 | Inflammation |
| tsh | TSH | mUI/L | 4.0 | 8.0 | **1.3** | Non | 0.4-4.0 | > 4.0 | Thyroide |
| ldl | LDL cholesterol | mmol/L | 3.0 | 4.1 | **1.8** | Non | < 3.0 | >= 4.1 | Mauvais cholesterol |
| hdl | HDL cholesterol | mmol/L | 1.0 | 0.7 | **1.0** | **Oui** | >= 1.0 | < 0.7 | Bon cholesterol |

### Panel P10 — Metabolique complet (ajoute 5 marqueurs, tier = 10)

| ID | Nom | Unite | Normal (nm) | Anormal (ab) | Poids (w) | Inverse | Plage normale | Plage alerte | Label |
|----|-----|-------|:---:|:---:|:---:|:---:|---------|--------|-------|
| tg | Triglycerides | mmol/L | 1.7 | 2.3 | **1.5** | Non | < 1.7 | >= 2.3 | Graisses sang |
| adipon | Adiponectine | ug/mL | 10.0 | 6.0 | **2.5** | **Oui** | >= 10 | < 6.0 | Hormone tissu gras |
| asat | Transaminases | UI/L | 40 | 60 | **1.0** | Non | < 40 | >= 60 | Foie |
| apob | ApoB | g/L | 0.9 | 1.2 | **1.5** | Non | < 0.9 | >= 1.2 | Risque vasculaire |
| ggt | GGT | UI/L | 50 | 80 | **0.8** | Non | < 50 | >= 80 | Foie / Alcool |

### Panel P15 — Endocrinien complet (ajoute 3 marqueurs, tier = 15)

| ID | Nom | Unite | Normal (nm) | Anormal (ab) | Poids (w) | Inverse | Plage normale | Plage alerte | Label |
|----|-----|-------|:---:|:---:|:---:|:---:|---------|--------|-------|
| tghdl | Ratio TG/HDL | - | 2.0 | 3.5 | **2.0** | Non | < 2.0 | >= 3.5 | IR cachee |
| urate | Acide urique | umol/L | 360 | 420 | **0.8** | Non | < 360 | >= 420 | Goutte / MetS |
| leptine | Leptine | ng/mL | 20 | 40 | **1.5** | Non | < 20 | >= 40 | Hormone satiete |

**Somme totale des poids** : 23.2

**Note sur les marqueurs inverses** : Pour HDL et Adiponectine, une valeur **basse** est defavorable. Le z-score est inverse : `z = (nm - val) / (nm - ab)` au lieu de `z = (val - nm) / (ab - nm)`.

---

## 6. Instruments psychometriques valides

### PSS-10 — Perceived Stress Scale (Cohen, Kamarck & Mermelstein 1983)

- **10 items**, cotes de 0 (jamais) a 4 (tres souvent)
- **4 items inverses** : items 4, 5, 7, 8 (score = 4 - reponse)
- **Plage** : 0 a 40
- **Interpretation** :
  - < 14 : Stress faible
  - 14-19 : Stress modere
  - 20-26 : Stress eleve
  - >= 27 : Stress tres eleve
- **Utilisation dans l'algorithme** : Stress Ratio (sr) = PSS / 40

### PHQ-9 — Patient Health Questionnaire (Kroenke, Spitzer & Williams 2001)

- **9 items**, cotes de 0 a 3
- **Plage** : 0 a 27
- **Interpretation** :
  - < 5 : Pas de depression
  - 5-9 : Depression legere
  - 10-14 : Depression moderee
  - 15-19 : Depression moderement severe
  - >= 20 : Depression severe

### BES — Binge Eating Scale

- **Score** : 0 a 8 (simplifie)
- **Interpretation** :
  - < 3 : Leger
  - 3-4 : Modere
  - >= 5 : Severe

### ISI — Insomnia Severity Index

- **Score** : 0 a 28
- **Interpretation** :
  - 0-7 : Pas d'insomnie
  - 8-14 : Insomnie legere
  - 15-21 : Insomnie moderee
  - 22-28 : Insomnie severe

---

## 7. Phase C — Score Clinique (0-50 pts)

Le score C est compose de **8 sous-scores** (c1 a c8) :

### c1 — Age (0-10 pts)
**Ref** : Framingham/SCORE2

| Age | Points |
|-----|:---:|
| < 40 ans | 0 |
| 40-44 ans | 2 |
| 45-54 ans | 5 |
| 55-64 ans | 7 |
| >= 65 ans | 10 |

### c2 — Sexe (0-2 pts)
**Ref** : Framingham

| Condition | Points |
|-----------|:---:|
| Homme < 60 ans | 2 |
| Sinon | 0 |

### c3 — IMC + Tour de taille + WHtR (0-12 pts)
**Ref** : OMS, IDF 2006, BMJ 2016

**Composante IMC** (seuils ethniques) :

| Condition | Points |
|-----------|:---:|
| IMC >= obesite + 5 (severe) | 7 |
| IMC >= obesite | 5 |
| IMC >= surpoids | 3 |
| IMC normal | 0 |

**Composante WHtR** (Waist-to-Height Ratio) :

| WHtR | Points |
|------|:---:|
| >= 0.60 | 3 |
| >= 0.55 | 2 |
| >= 0.50 | 1 |
| < 0.50 | 0 |

**Composante Tour de taille** :

| Condition | Points |
|-----------|:---:|
| TT > seuil ethnique + 10 cm | 2 |
| TT > seuil ethnique | 1 |
| TT <= seuil | 0 |

**c3 = min(12, c3_bmi + c3_whtr + c3_tt)**

### c4 — Comorbidites (0-10 pts)
**Ref** : ADA 2024, IDF

Projection depuis BMN-K (0-50) vers (0-10) :

```
htaPts = 4 pts si HTA declaree, x hR ethnique, cap 8
diabPts = 8 (DT2) | 3 (pre-diabete) | 3 (ethnie risque + 1 parent DT2) | 2 (2 parents DT2)
c4 = min(10, round((htaPts + diabPts + min(6, round(K*6/50))) / 3 * 10 / 8))
Si c4 < 1 et K > 0 → c4 = 1
```

### c5 — Antecedents familiaux et genetique (0-10 pts)
**Ref** : INTERHEART, Lancet 2016

| Facteur | Points |
|---------|:---:|
| 2 parents obeses | +4 |
| 1 parent obese | +2 |
| Obesite enfance severe | +3 |
| Surpoids enfance | +2 |
| 2 parents DT2 | +2 |
| 1 parent DT2 | +1 |
| Regimes yoyo (>= 3) | +2 |

**Modulation ethnique** : Si cR > 1.2 → c5 = min(10, round(c5 * (1 + (cR-1) * 0.3)))

### c6 — Tabac (0-8 pts)
**Ref** : Aubin 2012

| Niveau | Points |
|--------|:---:|
| Jamais fume | 0 |
| Arrete > 1 an | 1 |
| Arrete < 1 an | 2 |
| < 10 cig/jour | 4 |
| >= 10 cig/jour | 8 |

### c7 — Sante mentale (0-8 pts)
**Ref** : PSS-10, PHQ-9, BES

**Stress (c7_stress, 0-4)** :

| Stress Ratio (PSS/40) | Points |
|------------------------|:---:|
| >= 0.60 | 4 |
| >= 0.35 | 3 |
| >= 0.15 | 1 |
| < 0.15 | 0 |

**Depression (c7_dep, 0-3)** :

| PHQ-9 | Points |
|-------|:---:|
| >= 20 | 3 |
| >= 15 | 2 |
| >= 10 | 1 |
| < 10 | 0 |

**Hyperphagie (c7_bes, 0-2)** :

| BES | Points |
|-----|:---:|
| >= 5 | 2 |
| >= 3 | 1 |
| < 3 | 0 |

**c7 = min(8, c7_stress + c7_dep + c7_bes)**

### c8 — Sommeil + ISI (0-4 pts)
**Ref** : Cappuccio 2008, ISI

| Condition | Points |
|-----------|:---:|
| Sommeil < 5h ou > 10h | +2 |
| Sommeil 5-6h ou 9-10h | +1 |
| ISI >= 22 | +2 |
| ISI 15-21 | +1 |

**c8 = min(4, total)**

### Modulation ethnique globale

```
C = round(C * (1 + ev/100))
```

### Garde-Fou (GF) — Plancher minimum

| Condition comorbidites | Plancher C |
|------------------------|:---:|
| DT2 + HTA | 25 |
| DT2 + SAOS | 25 |
| DT2 + MetS | 22 |
| MetS + HTA | 20 |

**Attenuation SCS** (activite physique + alimentation) :
- AP >= 300 min/sem ET DQI <= 10 → reduction -8
- AP >= 150 min/sem ET DQI <= 15 → reduction -5
- AP >= 75 min/sem → reduction -2

```
gfFloor = max(0, gfFloor - scsReduction)
C = max(gfFloor, C)
C = clamp(0, 50, C)
```

---

## 8. Phase E — Score Exposome (0-45 pts)

### Layer A — Environnement physique (0-1)

```
a_air = min(1, expo_air / 8)
a_temp = min(1, expo_temp / 4)
a_uv = min(1, expo_uv / 3)
Layer A = min(1, (a_air + a_temp + a_uv) / 3 * inflammMult_ethnique)
```

**Conversion qualite de l'air** (AQI US → score 0-8) :

| AQI US | Score |
|--------|:---:|
| <= 50 | 0 |
| 51-100 | 2 |
| 101-150 | 4 |
| 151-200 | 6 |
| > 200 | 8 |

**Conversion temperature** → score 0-4 :

| Temperature | Score |
|-------------|:---:|
| > 40 C | 4 |
| 35-40 C | 3 |
| 30-35 C | 1 |
| < -5 C | 3 |
| -5 a 5 C | 1 |
| Sinon | 0 |

**Conversion UV** → score 0-3 :

| Index UV | Score |
|----------|:---:|
| > 8 | 3 |
| 6-8 | 2 |
| 3-6 | 1 |
| <= 3 | 0 |

### Layer B — Trajet + sedentarite (0-1)

```
b_trajet = min(1, work_dist / 5)        // Distance domicile-travail (score 0-5)
b_assis_raw = assis>10? 1 : assis>8? 0.75 : assis>6? 0.40 : assis>4? 0.15 : 0
```

**Attenuation par activite physique** :
- AP >= 150 min/sem → b_assis * 0.50
- AP >= 75 min/sem → b_assis * 0.75

```
Layer B = (b_trajet + b_assis_att) / 2
```

### Layer C — Perturbateurs endocriniens (0-1)

```
c_ultra = min(1, alim_ultra / 4)         // Ultra-transformes
c_fast = min(1, alim_fast_food / 4)      // Fast-food
Layer C = (c_ultra + c_fast) / 2
```

### Calcul E*

```
E* = 30 * (0.7 * LayerA + 0.5 * LayerB + 0.3 * LayerC) / 1.5
```

### Amplification inflammatoire (bInflam)

La **triade inflammatoire** est calculee a partir des biomarqueurs disponibles :

| Marqueur | z = 0 si | z = 1 si | Calcul intermediaire |
|----------|----------|----------|---------------------|
| CRP hs | <= 1 mg/L | >= 3 mg/L | (val - 1) / 2 |
| Ratio TG/HDL | <= 2.0 | >= 3.5 | (val - 2) / 1.5 |
| HOMA-IR | <= 2.5 | >= 4.0 | (val - 2.5) / 1.5 |

```
bInflam = moyenne des z-scores disponibles (0 si aucun bio disponible)
```

### Score E final

```
E = min(45, round(E* * (1 + 0.15 * bInflam)))
```

---

## 9. Phase O — Score Occupationnel (0-10 pts)

### Actif (non retraite)
**Ref** : Karasek, Lane 2024

```
stressJob += (type >= 5 ? 2 : type >= 3 ? 1 : 0)
stressJob += (nuit >= 3 ? 3 : nuit >= 2 ? 2 : nuit >= 1 ? 1 : 0)
posture = min(2, round(posture_score / 2))
hours = min(2, round(hours_score / 2))
O = min(10, stressJob + posture + hours)
```

### Retraite
**Ref** : Valtorta 2016

```
socScore:  retire >= 5 → 4 | >= 4 → 3 | >= 3 → 2 | >= 2 → 1
actScore:  AP < 30 → 3 | AP < 75 → 2 | AP < 150 → 1
O = min(10, socScore + actScore)
```

---

## 10. Phase L — Score Lifestyle (0-10 pts)

### l1 — Activite physique (0-3 pts)
**Ref** : IPAQ, OMS 2020

```
apT = AP_cardio + AP_muscu + AP_marche * 3.5
```

| AP totale (min/sem) | Points |
|---------------------|:---:|
| >= 150 | 0 |
| 75-149 | 1 |
| 30-74 | 2 |
| < 30 | 3 |

### l2 — Alimentation DQI-BMN (0-3 pts)
**Ref** : NOVA, PREDIMED, OMS

```
alimRaw = somme des 10 items alimentaires (max 39)
predimed_equiv = max(0, 14 - round(alimRaw * 14 / 39))
```

| PREDIMED equiv | Points |
|----------------|:---:|
| >= 9 | 0 |
| 5-8 | 1 |
| 3-4 | 2 |
| < 3 | 3 |

**10 items alimentaires** (chacun 0-4) :
1. Ultra-transformes (NOVA)
2. Boissons sucrees
3. Sucres ajoutes/desserts
4. Fruits et legumes (inverse)
5. Taille des portions
6. Structure des repas
7. Grignotage
8. Fast-food
9. Cuisine maison (inverse)
10. Consommation d'eau (0-3)

### l3 — Alcool (0-2 pts)
**Ref** : AUDIT-C

```
alcool_total = frequence * quantite
```

| Total | Points |
|-------|:---:|
| >= 6 | 2 |
| 2-5 | 1 |
| < 2 | 0 |

### l4 — Sommeil (0-2 pts)
**Ref** : Cappuccio 2008

| Condition | Points |
|-----------|:---:|
| Sommeil < 6h ou > 10h, ou ISI >= 15 | 2 |
| Sommeil < 7h ou > 9h, ou ISI >= 8 | 1 |
| Sinon | 0 |

**L = min(10, l1 + l2 + l3 + l4)**

---

## 11. Score Declaratif sD

```
sD = min(100, C + E + O + L)
```

| Composante | Plage | Description |
|------------|:---:|-------------|
| C | 0-50 | Score clinique (age, sexe, IMC, TT, comorbidites, ATCD, tabac, stress, sommeil) |
| E | 0-45 | Score exposome (air, meteo, UV, trajet, sedentarite, perturbateurs) |
| O | 0-10 | Score occupationnel (type travail, horaires, posture, retraite) |
| L | 0-10 | Score lifestyle (activite physique, alimentation, alcool, sommeil) |
| **sD** | **0-100** | **Maximum theorique 115, cappe a 100** |

---

## 12. Classification Declarative

| sD | Classification | Couleur | Tier therapeutique | Suivi |
|:---:|---------------|---------|-------------------|-------|
| < 30 | **FAIBLE** | Vert | Surveillance | 3 ans |
| 30-59 | **MODERE** | Orange | Nutrition + AP | Annuel |
| 60-79 | **ELEVE** | Rouge | GLP-1 preventif | Trimestriel |
| >= 80 | **TRES ELEVE** | Violet | Chirurgie / GLP-1 urgent | Mensuel |

---

## 13. SII — Sous-Index Inflammatoire Indirect

**7 criteres binaires** (chacun vaut 1 point si positif) :

| # | Critere | Condition |
|:-:|---------|-----------|
| 1 | Stress PSS eleve | Stress Ratio (PSS/40) >= 0.35 |
| 2 | Inactivite physique | AP totale < 75 min/sem |
| 3 | Obesite | IMC >= seuil obesite ethnique |
| 4 | Tabagisme actif | Tabac >= 3 (< 10 cig/jour ou plus) |
| 5 | Alimentation desequilibree | DQI-BMN alimRaw >= 20 |
| 6 | Insomnie | ISI >= 15 |
| 7 | Tour de taille eleve | TT > seuil ethnique (F/M) |

**SII = somme des criteres positifs (0-7)**

**Impact** : Si SII >= 2 ET classification FAIBLE → prescription P5 obligatoire.

---

## 14. Criteres Independants de Prescription

Meme si SII < 2, un bilan P5 est prescrit si **au moins un** des criteres suivants est rempli :

| Critere | Condition |
|---------|-----------|
| Age | >= 40 ans |
| ATCD familiaux forts | 2+ parents obeses OU 1+ parent DT2 |
| Comorbidite presente | Au moins 1 comorbidite declaree |

```
indepCrit = age >= 40 OR parent_ob >= 2 OR diab_par >= 1 OR comorbIds.length > 0
```

---

## 15. Prescription Biologique (P0/P5/P10/P15)

| classDecl | SII | Critere Indep | Panel | Contenu |
|-----------|:---:|:---:|:---:|---------|
| FAIBLE | < 2 | Non | **P0** (optionnel) | Aucun obligatoire. Recommande si 1ere visite ou bilan > 2 ans |
| FAIBLE | >= 2 | - | **P5** | HbA1c, Glycemie, LDL, HDL, CRP hs, TSH, NFS |
| FAIBLE | < 2 | Oui | **P5** | Idem |
| MODERE | - | - | **P10** | P5 + HOMA-IR, Triglycerides, ApoB, Adiponectine, ASAT/ALAT, GGT, Creatinine, Acide urique |
| ELEVE | - | - | **P15** | P10 + Leptine, Ratio TG/HDL, FibroScan/CAP, Cortisol salivaire, Testosterone/AMH (si SOPK) |
| TRES ELEVE | - | - | **P15 + BEF** | P15 + BioEmergencyFloor actif. Prise en charge urgente |

**Detail des panels** :
- **P5** (7 examens) : HbA1c, Glycemie a jeun, LDL cholesterol, HDL cholesterol, CRP ultrasensible, TSH, NFS
- **P10** (15 examens) : P5 + HOMA-IR, Triglycerides, ApoB, Adiponectine, ASAT/ALAT, GGT, Creatinine, Acide urique
- **P15** (20 examens) : P10 + Leptine, Ratio TG/HDL, FibroScan/CAP, Cortisol salivaire, Testosterone/AMH (si SOPK)

---

## 16. Score Biologique bioNorm (0-100)

### Methode BSD v4.7.1

**z-score lineaire borne [0,1]** :

Pour chaque biomarqueur :
```
Si non inverse:   z = clamp(0, 1, (val - nm) / (ab - nm))
Si inverse (HDL, Adiponectine):  z = clamp(0, 1, (nm - val) / (nm - ab))
```

**bioNorm** :
```
bioNorm = (Σ z_i * w_i / Σ w_i) * 100
```

- Le denominateur est **adaptatif** : seuls les marqueurs renseignes sont pris en compte
- Les poids (w) sont proportionnels aux **hazard ratios publies** dans des etudes > 3M participants (CTT, ERFC, CKD-PC, ADA)

### Triade inflammatoire (bInflam)

```
bInflam = moyenne(z_CRP_hs, z_TG/HDL, z_HOMA-IR)
```

- **Appliquee uniquement aux marqueurs biologiques disponibles**
- **Impact** : Amplifie le score E de +15% par unite de bInflam
  - `E** = E* * (1 + 0.15 * bInflam)`

---

## 17. Score Final sf — Integration Dynamique

### Formule de base

```
sf = wDecl * sD + wBio * bioNorm
```

Avec `wDecl = 0.65` et `wBio = 0.35` par defaut.

### Reponderation dynamique

Si la biologie est **significativement plus elevee** que le declaratif :

```
gap = bioNorm - sD
Si gap > 20 :
    extraW = min(0.30, (gap - 20) / 100 * 0.60)
    wBio = 0.35 + extraW
    wDecl = 1 - wBio
```

Cela signifie que `wBio` peut monter jusqu'a **0.65** (et `wDecl` descendre a **0.35**) si le gap est tres important.

### BioFloor Standard (75%)

```
sf = max(sf, bioNorm * 0.75)
```

Le score final ne peut pas etre inferieur a 75% du score biologique. Cela protege contre un declaratif anormalement bas qui masquerait une biologie alarmante.

### BioEmergencyFloor (BEF)

```
Si bioNorm > 90 :  sf = max(sf, max(80, bioNorm * 0.85))
Si bioNorm > 80 :  sf = max(sf, bioNorm * 0.85)
```

### Urgences HbA1c

```
Si HbA1c >= 6.5% et sf < 60 → sf = 60
Si HbA1c >= 8.0%            → sf = max(sf, 70)
```

### Classification finale

| sf | Classification | Couleur |
|:---:|---------------|---------|
| < 30 | FAIBLE | Vert |
| 30-59 | MODERE | Orange |
| 60-79 | ELEVE | Rouge |
| >= 80 | TRES ELEVE | Violet |

---

## 18. CTI — Chronicity Trajectory Index (0-100)

**Objectif** : Mesurer le degre d'installation chronique de l'obesite. Plus le CTI est eleve, plus les interventions conservatrices sont inefficaces.

### Formule

```
CTI = min(100, round((ctiSum / 1.459) * 100 * ctiAmp))
```

Ou `ctiAmp` est le **coefficient d'amplification maximal** parmi les comorbidites selectionnees (champ `ca`).

### Composantes (gamma_j * Z_j)

| Composante | Poids (gamma) | Z_j (0-1) |
|------------|:---:|-----------|
| Duree/severite | 0.185 | sD>70→1 / sD>50→0.7 / sD>30→0.4 / sinon→0.1 |
| Regimes yoyo | 0.249 | yoyo >= 1 → 1, sinon 0 |
| Leptine/SAOS | 0.210 | min(1, IMC_score + SAOS_bonus) |
| Microbiome (DQI) | 0.180 | min(1, alimRaw / 25) |
| Cortisol (stress+ISI+nuit) | 0.195 | min(1, sr*0.4 + ISI/28*0.3 + nuit/5*0.3) |
| Metabolique (hypo+yoyo) | 0.200 | min(1, hypo_bonus + yoyo_bonus) |
| Enfance | 0.240 | enfance severe → 1 / moderate → 0.5 / non → 0 |

**Somme des poids** : 1.459

### Interpretation

| CTI | Label | Description |
|:---:|-------|-------------|
| 0-20 | Fenetre ouverte | Interventions classiques efficaces |
| 21-40 | Debut chronicisation | Agir rapidement |
| 41-55 | Chronicite avancee | GLP-1 recommande |
| > 55 | Chronicite installee | Evaluation chirurgicale obligatoire |

---

## 19. GRI — GLP-1 Response Index (-3 a +6)

**Objectif** : Predire la probabilite de reponse aux traitements GLP-1 (Semaglutide, Tirzepatide).

### Formule

```
GRI = Σ(delta_k * F_k) - Σ(epsilon_k * U_k)
```

### Facteurs favorables (+)

| Source | Condition | delta |
|--------|-----------|:---:|
| Comorbidites GRI_fav | gri_fav = true ET gr > 0 | +gr |
| HOMA-IR biologique | > 2.5 | +1.07 |
| Adiponectine biologique | < 6 ug/mL | +0.62 |
| Ratio TG/HDL biologique | > 3.5 | +0.55 |

### Facteurs defavorables (-)

| Source | Condition | epsilon |
|--------|-----------|:---:|
| Comorbidites GRI defav | gr < 0 | -|gr| |
| CTI eleve | > 55 | -0.65 |
| Corticoides | cortis declare | -0.35 |
| Obesite severe | IMC > 40 | -0.47 |
| Stress extreme | sr >= 0.6 | -0.28 |

### Interpretation

| GRI | Label | Reponse GLP-1 |
|:---:|-------|---------------|
| >= 2.5 | Excellent | > 85% |
| 1.5-2.4 | Bon | 60-85% |
| 0.5-1.4 | Modere | Incertaine |
| < 0.5 | Faible | Peu probable, chirurgie a envisager |

---

## 20. Modele de Markov — Projection 10 ans

**Ref** : NEJM 1995 Leibel, NEJM 2011 Sumithran

### Matrice de transition (6 etats)

```
Etats : [Poids normal, Surpoids leger, Surpoids installe, Surpoids eleve, Obesite moderee, Obesite severe]
```

**Matrice de base (MK_B)** — probabilites annuelles :

|  | Normal | Surp.leger | Surp.inst. | Surp.eleve | Obes.mod. | Obes.sev. |
|--|:---:|:---:|:---:|:---:|:---:|:---:|
| **Normal** | 0.82 | 0.14 | 0.03 | 0.01 | 0 | 0 |
| **Surp.leger** | 0.08 | 0.68 | 0.18 | 0.05 | 0.01 | 0 |
| **Surp.inst.** | 0.02 | 0.11 | 0.61 | 0.21 | 0.04 | 0.01 |
| **Surp.eleve** | 0.01 | 0.04 | 0.14 | 0.56 | 0.21 | 0.04 |
| **Obes.mod.** | 0 | 0.01 | 0.03 | 0.12 | 0.65 | 0.19 |
| **Obes.sev.** | 0 | 0 | 0.01 | 0.03 | 0.11 | 0.85 |

### Ajustements

**Etat initial** (cs) base sur l'IMC :
- IMC >= 35 → 5 (Obesite severe)
- IMC >= 30 → 4 (Obesite moderee)
- IMC >= 27.5 → 3 (Surpoids eleve)
- IMC >= seuil surpoids → 2 (Surpoids installe)
- IMC >= surpoids - 2 → 1 (Surpoids leger)
- Sinon → 0 (Normal)

**Facteur de risque** :
```
rf = exp(0.68 * sf/100) * exp(0.35 * kN/100)
```
Ou `kN = (bmn_k / 50) * 100`

**Multiplicateur comorbidites** (cm) : maximum parmi :
- DT2 : 1.4
- SOPK : 1.3
- SAOS : 1.25
- MetS : 1.5

### Iteration

Sur 10 ans, chaque annee :
- Les transitions vers des etats superieurs sont multipliees par `rf * cm`
- Les transitions vers des etats inferieurs sont divisees par `rf`
- Les lignes sont renormalisees

**Probabilite d'obesite a 10 ans** = `(prob[4] + prob[5]) * 100`

---

## 21. Retro-Diagnostic Biologique

Verification de coherence entre les donnees declaratives et les resultats biologiques.

| Condition | Alerte | Couleur |
|-----------|--------|---------|
| HOMA-IR >= 4, pas de DT2/pre-DT2 declare | Resistance insuline severe non declaree | Rouge |
| HbA1c 5.7-6.4, pas de pre-DT2 declare | Pre-diabete (ADA 2024) | Orange |
| HbA1c >= 6.5, pas de DT2 declare | Diabete type 2 (ADA 2024) | Rouge |
| TG/HDL > 3.5 + Adiponectine < 6 + HOMA > 2.5 | TRIADE IR | Rouge |
| CRP hs >= 3 | Inflammation systemique | Orange |
| TSH >= 4, pas d'hypothyroidie declaree | Hypothyroidie subclinique | Orange |
| ApoB >= 1.2 | Risque cardiovasculaire eleve | Orange |
| Acide urique >= 420 | Hyperuricemie | Orange |
| Leptine >= 40 | Resistance a la leptine | Orange |

---

## 22. Profils de Simulation Biologique

4 profils types pour pre-remplir les biomarqueurs prescrits :

| Marqueur | Normal (z~0) | Limite (z~0.3-0.5) | Eleve (z~0.7-0.9) | Critique (z~0.9-1.0) |
|----------|:---:|:---:|:---:|:---:|
| HOMA-IR | 1.8 | 3.2 | 4.5 | 6.0 |
| HbA1c (%) | 5.2 | 5.9 | 6.8 | 8.2 |
| Glycemie (mmol/L) | 4.8 | 5.8 | 7.5 | 10.0 |
| CRP hs (mg/L) | 0.5 | 2.0 | 4.0 | 8.0 |
| TSH (mUI/L) | 2.0 | 3.5 | 6.0 | 10.0 |
| LDL (mmol/L) | 2.4 | 3.5 | 4.5 | 5.5 |
| HDL (mmol/L) | 1.4 | 0.85 | 0.65 | 0.5 |
| Triglycerides (mmol/L) | 1.2 | 1.9 | 2.5 | 3.5 |
| Adiponectine (ug/mL) | 14 | 8 | 5 | 3 |
| Transaminases (UI/L) | 25 | 48 | 65 | 90 |
| ApoB (g/L) | 0.7 | 1.0 | 1.3 | 1.6 |
| GGT (UI/L) | 30 | 60 | 85 | 120 |
| Ratio TG/HDL | 1.2 | 2.7 | 3.8 | 5.0 |
| Acide urique (umol/L) | 300 | 385 | 440 | 520 |
| Leptine (ng/mL) | 12 | 28 | 45 | 65 |

---

## 23. Strategies Therapeutiques

### FAIBLE (sf < 30)

| Parametre | Valeur |
|-----------|--------|
| **Niveau** | Surveillance |
| **Actions** | Alimentation mediterraneenne (PREDIMED), AP >= 150 min/sem (OMS), Sommeil 7-8h, Gestion stress, Controle metabolique tous les 3 ans |
| **Suivi** | 3 ans |
| **Pharmacologie** | Aucune |

### MODERE (sf 30-59)

| Parametre | Valeur |
|-----------|--------|
| **Niveau** | Programme Nutrition + AP |
| **Actions** | Dieteticien specialise, Programme AP progressif, Reduction ultra-transformes (NOVA < 2), Education therapeutique, TCC si PSS >= 20 ou PHQ >= 10, Bilan P10, Objectif -3 a -5% en 6 mois |
| **Suivi** | Annuel |
| **Pharmacologie** | Pas a ce stade |

### ELEVE (sf 60-79)

| Parametre | Valeur |
|-----------|--------|
| **Niveau** | Suivi Renforce + GLP-1 |
| **Actions** | Suivi trimestriel medecin + dieteticien, Bilan P15, Programme AP encadre (kinesi, APA), Psychologue si PHQ >= 10, GLP-1 preventif si GRI >= 1.5, Objectif -5 a -10% en 6 mois |
| **Suivi** | Trimestriel |
| **Pharmacologie** | Semaglutide (Wegovy) si GRI >= 1.5, sinon GLP-1 a evaluer |

### TRES ELEVE (sf >= 80)

| Parametre | Valeur |
|-----------|--------|
| **Niveau** | Urgence Pluridisciplinaire |
| **Actions** | RDV endocrinologue urgent (< 2 semaines), Bilan P15 + BEF actif, GLP-1 haute dose (Tirzepatide / Semaglutide), Chirurgie bariatrique si CTI > 55, Psychiatrie si PHQ >= 20, Suivi nutritionnel 2x/mois |
| **Suivi** | Bimensuel |
| **Pharmacologie** | Tirzepatide haute dose + evaluation chirurgicale |

### Conditions supplementaires

**Si CTI > 55** (Chronicite installee) :
- Consultation chirurgien bariatrique
- Evaluation psychologique pre-operatoire
- Sleeve gastrectomy / bypass / SADI-S
- Suivi nutritionnel 5 ans post-op

**Si GRI >= 2.5** (Excellent candidat GLP-1) :
- Profil metabolique excellent pour GLP-1
- Semaglutide ou Tirzepatide prioritaire
- Objectif >= 15% perte de poids
- Suivi endocrino 3/6/12 mois

---

## 24. Rapport IA Strategique (Aide au Medecin)

Le rapport est genere par **Claude AI** (claude-sonnet-4-20250514) via l'endpoint `/api/ai/rapport`.

### Donnees envoyees a l'IA

| Section | Contenu |
|---------|---------|
| **Scores** | sf, sD, bioNorm, C, E, O, L, CTI, GRI, SII, K, classification, panelLvl, bInflam |
| **Biologie** | Presence, bioNorm, marqueurs avec valeurs/unites/normes, wDecl, wBio |
| **Profil** | Age, sexe, ethnie, IMC, taille, poids, TT, comorbidites, PSS-10, PHQ-9, BES, ISI, tabac, alcool |
| **Contexte** | Prescription bio, strategies algorithmiques, P(obesite 10 ans), localisation, expo air |

### Structure du rapport (10 sections)

1. **diagnostic_resume** : Resume diagnostique 3-4 phrases
2. **synthese_clinique** : Synthese detaillee 5-8 phrases (C, E, O, L, CTI, GRI, bio)
3. **points_positifs** : [2-5] Elements favorables
4. **risques_identifies** : [2-6] Risques hierarchises par urgence
5. **plan_therapeutique** : [5-8] Plan d'action ordonne par priorite + temporalite
6. **recommandation_pharmacologique** : GLP-1, chirurgie, etc. selon CTI/GRI
7. **suivi_propose** : Calendrier precis (frequence, examens, objectifs)
8. **conseils_patient** : [3-5] Conseils personnalises et actionables
9. **attention_medicale** : Points de vigilance medecin (ou null)
10. **tone** : reassuring / cautious / urgent

### Regles de l'IA
- Adapter le ton a la gravite (sf < 30 = rassurant, 30-59 = prudent, >= 60 = urgent)
- Utiliser les chiffres reels du patient
- Mentionner les references scientifiques
- Ne pas inventer de donnees biologiques
- Si bio non disponible, insister sur sa realisation

---

## 25. APIs et Sources de Donnees Temps Reel

| Service | URL | Donnees |
|---------|-----|---------|
| **Qualite de l'air** | Open-Meteo Air Quality API | AQI US/EU, PM2.5, PM10, NO2, O3, SO2, CO, UV |
| **Meteo** | Open-Meteo Forecast API | Temperature, ressenti, humidite, vent |
| **Geocodage** | Nominatim (OpenStreetMap) | Recherche de ville, reverse geocoding |
| **IP Geolocation** | GeoJS / ipwho.is / ip-api.com | Detection automatique de position |
| **IA Medicale** | Anthropic Claude (claude-sonnet-4) | Analyse adaptative, interpretation, rapport strategique |

### Calcul de distance domicile-travail

**Formule de Haversine** :
```
R = 6371 km
a = sin(dLat/2)^2 + cos(lat1) * cos(lat2) * sin(dLon/2)^2
distance = R * 2 * asin(sqrt(a))
```

---

## 26. Flux de Navigation (18 ecrans)

| Ecran | Nom | Description |
|:---:|------|-------------|
| 0 | **Accueil** | Presentation, references, disclaimer |
| 1 | **Date de naissance** | Age, risque lie a l'age |
| 2 | **Sexe biologique** | Seuils F/M |
| 3 | **Origine ethnique** | 9 profils, seuils adaptes |
| 4 | **Poids et taille** | IMC, poids ideal |
| 5 | **Tour de taille** | TT, WHtR, seuils ethniques |
| 6 | **Antecedents familiaux** | Parents, enfance, DT2, yoyo |
| 7 | **Localisation** | GPS/IP + Air + Meteo (temps reel) |
| 8 | **Profil professionnel** | Type, horaires, trajet, posture, retraite |
| 9 | **Habitudes alimentaires** | 10 questions DQI-BMN |
| 10 | **Activite physique** | IPAQ : cardio, muscu, marche, sedentarite |
| 11 | **Sommeil et substances** | Sommeil, ISI, tabac, alcool |
| 12 | **Stress PSS-10** | 10 items valides (Cohen 1983) |
| 13 | **Depression et BES** | PHQ-9 (9 items) + BES |
| 14 | **Comorbidites** | 13 pathologies en 3 categories |
| 15 | **Score sD + Prescription** | Score declaratif, CLEO, SII, ordonnance biologique |
| 16 | **Fiche biologique** | Biomarqueurs prescrits, simulation 4 profils, bioNorm LIVE |
| 17 | **Resultat final** | sf, diagnostic complet, CTI/GRI, Markov, strategie, rapport IA |

### Sections de navigation

| Section | Ecrans | Icone |
|---------|:---:|:---:|
| Accueil | 0 | [H] |
| Identite | 1-3 | [ID] |
| Mesures | 4-5 | [M] |
| Famille | 6 | [F] |
| Lieu | 7 | [G] |
| Travail | 8 | [T] |
| Nutrition | 9 | [N] |
| Mode de vie | 10-11 | [V] |
| Sante mentale | 12-13 | [S] |
| Pathologies | 14 | [P] |
| Score & Strategie | 15 | [sD] |
| Biologie | 16 | [B] |
| Resultat | 17 | [R] |

---

## 27. References Scientifiques

| Reference | Source | Utilisation dans l'algorithme |
|-----------|--------|-------------------------------|
| OMS | Organisation Mondiale de la Sante | Seuils IMC, AP recommandee |
| IDF 2006 | International Diabetes Federation | Seuils tour de taille ethniques, MetS |
| ADA 2024 | American Diabetes Association | Diagnostic diabete, HbA1c, comorbidites |
| FINDRISC | Finnish Diabetes Risk Score | Depistage diabete |
| IPAQ | International Physical Activity Questionnaire | Quantification activite physique |
| PHQ-9 | Kroenke, Spitzer & Williams 2001 | Depression |
| PSS-10 | Cohen, Kamarck & Mermelstein 1983 | Stress percu |
| ISI | Insomnia Severity Index | Insomnie |
| BES | Binge Eating Scale | Hyperphagie |
| AUDIT-C | Alcohol Use Disorders Identification Test | Consommation alcool |
| Lancet 2016 | The Lancet Commission on Obesity | Risques ethniques, genetique |
| SCORE2 | European Society of Cardiology | Risque cardiovasculaire |
| Framingham | Framingham Heart Study | Facteurs de risque CV |
| INTERHEART | Yusuf et al. 2004 | Facteurs de risque CV globaux |
| DPP | Diabetes Prevention Program | Prevention diabete |
| BMJ Open 2016 | Ashwell et al. | WHtR (Waist-to-Height Ratio) |
| Biswas 2015 | Sedentary time and mortality | Sedentarite et mortalite |
| Cappuccio 2008 | Sleep duration and mortality | Sommeil et risque metabolique |
| Aubin 2012 | Smoking and obesity | Tabac et prise de poids |
| CAMS/Copernicus | Atmosphere Monitoring Service | Qualite de l'air en temps reel |
| Brook 2010 | Air pollution and CV disease | Pollution et inflammation |
| NEJM 1995 Leibel | Changes in energy expenditure | Regulation ponderale |
| NEJM 2011 Sumithran | Long-term persistence of hormonal adaptations | Hormones post-regime |
| CTT 2010 | Cholesterol Treatment Trialists | Poids biomarqueurs lipidiques |
| ERFC 2010 | Emerging Risk Factors Collaboration | Poids biomarqueurs inflammatoires |
| CKD-PC 2010 | CKD Prognosis Consortium | Poids biomarqueurs renaux |
| NOVA | Monteiro et al. | Classification aliments ultra-transformes |
| PREDIMED | Mediterranean Diet Study | Score alimentaire |
| Karasek | Job Demand-Control Model | Stress professionnel |
| Lane 2024 | Night work and obesity | Travail de nuit |
| Valtorta 2016 | Social isolation and loneliness | Isolement social retraite |
| Hoehner 2012 | Commuting distance and health | Trajet et sante |

---

## SYNTHESE — Formules cles verrouillees

```
┌────────────────────────────────────────────────────────────────┐
│                    SCORE BMN v3.5 — FORMULES                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  sD = min(100, C + E + O + L)                                 │
│                                                                │
│  C = min(50, c1+c2+c3+c4+c5+c6+c7+c8) * (1+ev/100)          │
│      avec GF plancher si comorbidites graves                   │
│                                                                │
│  E = min(45, E* * (1 + 0.15 * bInflam))                      │
│  E* = 30 * (0.7*A + 0.5*B + 0.3*C_layer) / 1.5              │
│                                                                │
│  O = min(10, stressJob + posture + hours)  [ou retraite]      │
│  L = min(10, l1 + l2 + l3 + l4)                              │
│                                                                │
│  bioNorm = (Σ z_i * w_i / Σ w_i) * 100                       │
│  z_i = clamp(0, 1, (val - nm) / (ab - nm))                   │
│                                                                │
│  sf = wDecl(0.65) * sD + wBio(0.35) * bioNorm                │
│      + reponderation si gap > 20                               │
│      + BioFloor: sf >= 75% * bioNorm                          │
│      + BEF: si bio > 90 → sf >= max(80, 85% * bio)           │
│      + Urgence: HbA1c >= 6.5 → sf >= 60                      │
│                                                                │
│  CTI = (Σ gamma_j * Z_j / 1.459) * 100 * ctiAmp             │
│  GRI = Σ delta_k * F_k - Σ epsilon_k * U_k                   │
│  SII = Σ(7 criteres binaires)                                 │
│  P(Ob 10 ans) = Markov 6x6 * exp(0.68*sf/100) * exp(0.35*K) │
│                                                                │
│  bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR)                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**FIN DU DOSSIER — ALGORITHME SCORE BMN v3.5**
**Architecture CLEO + BSD v4.9 + Bio v4.7.1**
**Bach | Manos | Noel — Fevrier 2026**
