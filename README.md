# Score BMN v2.0 (Bach-Manos-Noel)

## Score Predictif, Stratificateur et Therapeutique de l'Obesite

**Architecture ABCKO** | 4 modules | 25 indicateurs | 11 comorbidites | 15 biomarqueurs | 9 groupes ethniques x 8 multiplicateurs

> Dr Patrick Noel, MD, FACS, FASMBS, FIFSO
> Emirates Specialty Hospital, Dubai | ELSAN Clinique Bouchard, Marseille | Qatar

---

## URLs

- **Sandbox** : https://3000-ib4jjzlrwtfls79jikkzg-cbeee0f9.sandbox.novita.ai
- **API Health** : `/api/health`

---

## Vue d'ensemble

Le Score BMN v2.0 est un outil clinique algorithmique complet pour la **prediction**, la **stratification** et la **guidance therapeutique** de l'obesite. Il integre une architecture en 5 etapes (ABCKO) inspiree du modele CLEO du Score BSD v4.9 cardiovasculaire.

### Architecture ABCKO

| Lettre | Module | Description |
|--------|--------|-------------|
| **A** | Anthropometrie | IMC, tour de taille, WHtR ajustes par ethnie |
| **B** | Biologie | 15 biomarqueurs normalises avec ponderation |
| **C** | Comorbidites | 11 maladies + phenotypes metaboliques |
| **K** | Koefficients | Ponderation dynamique tri-source + CTI + GRI |
| **O** | Ordonnance | Strategie therapeutique personnalisee |

---

## DESCRIPTIF ALGORITHMIQUE COMPLET

### 1. MODULE BMN-C : Evaluation Clinique (0-150 pts)

Le module clinique est administre par l'Assistante Medicale et la Dieteticienne, **sans ordonnance**, en 25-40 minutes.

#### 1.1 Anthropometrie (0-34 pts)

| Variable | Points Max | Methode | Seuils |
|----------|-----------|---------|--------|
| **IMC** (seuils ethniques) | 0-10 | Mesure AM | <OW=0, OW-OB=3, OB-OB+5=6, >OB+5=10 |
| **Tour de taille** (PRIORITAIRE) | 0-15 | Mesure AM | >seuil=7, >seuil+5=11, >seuil+10=15 |
| **WHtR** (ratio taille/taille) | 0-9 | Calcul auto | >=0.5=3, >=0.55=6, >=0.6=9 |

**Seuils ethniques du tour de taille (IDF) :**

| Ethnie | Femme (cm) | Homme (cm) | IMC Surpoids | IMC Obesite |
|--------|-----------|-----------|-------------|------------|
| Europeen | 88 | 102 | 25 | 30 |
| Indo-Mauricien | 80 | 90 | 23 | 27.5 |
| Creole | 84 | 94 | 25 | 30 |
| Sino-Mauricien | 80 | 90 | 23 | 27.5 |
| Sud-Asiatique | 80 | 90 | 23 | 27.5 |
| Africain | 88 | 102 | 25 | 30 |
| Est-Asiatique | 80 | 88 | 23 | 27.5 |
| SE-Asiatique | 80 | 90 | 23 | 27.5 |
| Franco-Mauricien | 88 | 102 | 25 | 30 |

#### 1.2 Multiplicateurs Ethniques (9 groupes x 8 parametres)

| Ethnie | EV Adj | CV Risk | Diab Risk | HTA Risk | Inflamm. |
|--------|--------|---------|-----------|----------|----------|
| Europeen | 0 | x1.0 | x1.0 | x1.0 | x1.0 |
| Indo-Mauricien | -1.5 | x1.4 | x2.0 | x1.2 | x1.2 |
| Creole | -2.0 | x1.2 | x1.3 | x1.4 | x1.2 |
| Sino-Mauricien | +1.5 | x0.6 | x1.0 | x0.9 | x0.9 |
| Sud-Asiatique | -1.5 | x1.5 | x2.0 | x1.3 | x1.2 |
| Africain | -1.5 | x1.2 | x1.3 | x1.5 | x1.3 |
| Est-Asiatique | +1.5 | x0.7 | x0.9 | x0.9 | x0.9 |
| Franco-Mauricien | +1.0 | x0.9 | x0.8 | x1.0 | x1.0 |

#### 1.3 Histoire Familiale (0-25 pts)

| Variable | Points | Evidence |
|----------|--------|----------|
| Obesite parentale (2 parents) | 10 | OR 8.42 |
| Obesite parentale (1 parent) | 8 | OR 3.17 |
| Obesite enfance (obese) | 10 | - |
| Obesite enfance (surpoids) | 6 | - |
| Diabete T2 parental (2) | 5 | - |
| Diabete T2 parental (1) | 3 | - |

#### 1.4 Comportements & Mode de Vie (0-53 pts)

| Variable | Points Max | Outil | Evidence |
|----------|-----------|-------|----------|
| Activite physique (IPAQ) | 0-9 | Questionnaire | HR 1.68 si nul |
| Sedentarite (>8h/j) | 0-9 | Questionnaire | HR 1.91 |
| Sommeil (duree) | 0-7 | Questionnaire | - |
| Alimentation DQI-BMN | 0-15 | Dieteticienne | 5 dimensions |
| Tabac | 0-8 | Questionnaire | Sevrage <24m = max |
| Alcool AUDIT-C | 0-5 | Questionnaire | OR 1.46 si >21/sem |

#### 1.5 Sante Mentale & Exposome (0-38 pts)

| Variable | Points Max | Outil | Seuil |
|----------|-----------|-------|-------|
| Stress PSS-10 | 0-10 | Auto-questionnaire | Ratio >=0.6 = max |
| Depression PHQ-9 | 0-10 | Auto-questionnaire | >=20 severe |
| Hyperphagie BES | 0-8 | 16 items | >=6 = severe |
| Qualite sommeil ISI | 0-8 | 7 items | >=15 = OR 1.73 |
| Travail de nuit | 0-5 | Questionnaire | >=3 nuits/sem |
| Perturbateurs endocriniens | 0-5 | Questionnaire | Professionnel/BPA |
| Precarite socio-economique | 0-5 | Questionnaire | - |

#### 1.6 Sub-Score Inflammatoire Indirect (SII)

Le SII est un score 0-7 qui determine si le bilan biologique est obligatoire pour les profils FAIBLE :

```
SII = 0
SI stress_PSS10_ratio >= 0.35    -> SII += 1
SI activite_physique < 75 min    -> SII += 1
SI IMC >= seuil_obesite_ethnique -> SII += 1
SI tabac actif (score >= 3)      -> SII += 1
SI DQI_alimentation >= 10        -> SII += 1
SI ISI_sommeil >= 15             -> SII += 1
SI tour_taille > seuil_ethnique  -> SII += 1

Si SII >= 2 : Panel biologique Tier 2A OBLIGATOIRE
```

---

### 2. MODULE BMN-K : Comorbidites & Phenotypes (0-50 pts)

Administre par le **Medecin**. Introduit en v2.0 pour capturer la realite clinique des maladies etablies.

#### 2.1 Maladies Etablies (8 comorbidites)

| Comorbidite | Points | HR/OR | Amp. CTI | Impact GRI | Risque DT2 10a |
|-------------|--------|-------|----------|------------|----------------|
| Diabete Type 2 | 14 | HR 3.84 | x1.8 | +0.65 | 60-80% |
| Pre-diabete | 8 | HR 2.11 | x1.2 | +0.82 | 60-80% |
| HTA etablie | 10 | HR 2.24 | x1.1 | 0 | - |
| SAOS | 12 | OR 2.19 | x1.4 | 0 | 30-50% |
| SOPK (femme) | 14 | OR 2.77 | x1.2 | +0.83 | 35-55% |
| NAFLD | 10 | OR 3.22 | x1.1 | +0.66 | 25-40% |
| Hypothyroidie | 6 | OR 1.74 | x1.3 | 0 | 20-35% |
| Syndrome metabolique | 12 | HR 2.64 | x1.3 | +0.65 | 70-90% |

#### 2.2 Phenotypes Metaboliques

| Phenotype | Points | OR | CTI | GRI |
|-----------|--------|-----|-----|-----|
| MONW (obese metab. poids normal) | 10 | OR 2.38 | x1.1 | +0.70 |
| IR occulte (TG/HDL > 3.5) | 8 | OR 2.12 | x1.2 | +0.55 |

#### 2.3 Traitements Aggravants

| Traitement | Points | Risque | CTI | GRI |
|------------|--------|--------|-----|-----|
| Corticoides > 3 mois | 8 | HR 2.12 | x1.6 | -0.47 |
| Antidepresseurs | 4 | OR 1.58 | x1.1 | 0 |
| Depression majeure | 6 | OR 1.92 | x1.2 | 0 |

#### 2.4 COMORBIDITY FLOOR (NOUVEAU v2.0)

```
Si BMN_K > 30 ET BMN_T < 40 :
   BMN_T = max(40, BMN_K_norm x 0.80)
```
Garantit une classification >= MODERE meme si le BMN-C est rassurant.

---

### 3. MODULE BMN-B : Biologie (0-100)

#### 3.1 Les 15 Biomarqueurs

| # | Biomarqueur | Unite | Seuil N | Seuil A | Poids w | Inverse | Tier |
|---|-------------|-------|---------|---------|---------|---------|------|
| 1 | HOMA-IR | UI x mU/L | < 2.5 | >= 4.0 | 2.5 | Non | 2A |
| 2 | HbA1c | % | < 5.7 | >= 6.5 | 2.0 | Non | 2A |
| 3 | Glycemie a jeun | mmol/L | < 5.6 | >= 7.0 | 1.8 | Non | 2A |
| 4 | CRP ultra-sensible | mg/L | < 1.0 | >= 3.0 | 2.0 | Non | 2A |
| 5 | TSH | mUI/L | 0.4-4.0 | > 4.0 | 1.3 | Non | 2A |
| 6 | LDL-C | mmol/L | < 3.0 | >= 4.1 | 1.8 | Non | 2A |
| 7 | HDL-C | mmol/L | >= 1.0 | < 0.7 | 1.0 | **Oui** | 2A |
| 8 | Triglycerides | mmol/L | < 1.7 | >= 2.3 | 1.5 | Non | 2B |
| 9 | Adiponectine | ug/mL | >= 10 | < 6.0 | 2.5 | **Oui** | 2B |
| 10 | ASAT/ALAT | UI/L | < 40 | >= 60 | 1.0 | Non | 2B |
| 11 | ApoB | g/L | < 0.9 | >= 1.2 | 1.5 | Non | 2B |
| 12 | GGT | UI/L | < 50 | >= 80 | 0.8 | Non | 2B |
| 13 | Ratio TG/HDL | - | < 2.0 | >= 3.5 | 2.0 | Non | 2C |
| 14 | Acide urique | umol/L | < 360 | >= 420 | 0.8 | Non | 2C |
| 15 | Leptine | ng/mL | < 20 | >= 40 | 1.5 | Non | 2C |

#### 3.2 Formule de normalisation (z-score)

Pour chaque biomarqueur i :
```
Si NON inverse :
  z_i = 0                        si v <= Normal
  z_i = (v - N) / (A - N)        si N < v < A
  z_i = 1                        si v >= Anormal

Si INVERSE (HDL, Adiponectine) :
  z_i = 0                        si v >= Normal
  z_i = (N - v) / (N - A)        si A < v < N
  z_i = 1                        si v <= Anormal
```

**Bio_norm = (Sum(z_i x w_i) / Sum(w_i)) x 100**

Le denominateur est **adaptatif** : seuls les marqueurs saisis sont inclus.

#### 3.3 Panels de Biomarqueurs (Tiers)

| Tier | Declencheur | Marqueurs |
|------|------------|-----------|
| **Tier 2A** | MODERE ou SII >= 2 | HOMA-IR, HbA1c, Glycemie, CRP hs, TSH, LDL, HDL |
| **Tier 2B** | ELEVE | + TG, Adiponectine, ASAT/ALAT, ApoB, GGT |
| **Tier 2C** | TRES ELEVE | + TG/HDL ratio, Acide urique, Leptine |
| **Tier 2D** | CRITIQUE | + Genetique FTO, Microbiote 16S, TDEE |

#### 3.4 Retrovalidation Biologique (6 Regles)

| # | Nom | Condition | Action |
|---|-----|-----------|--------|
| R1 | HOMA-IR nie | HOMA-IR > 4.0 sans traitement | Force IR/DT2 max. Panel 10 |
| R2 | Pre-diabete meconnu | HbA1c 5.7-6.4% non declare | Force pre-diabete. Panel 10 |
| R3 | DT2 non declare | HbA1c >= 6.5% sans antidiabetique | Force DT2. BMN-T min 60 |
| R4 | Steatose silencieuse | ASAT>60 + GGT>50 + TG>1.7 | Signal NAFLD. BMN-K active |
| R5 | IR occulte | TG/HDL>3.5 + Adipon<6 + HOMA-IR>2.5 | Triade IR. CTI amplifie |
| R6 | Alcool cache | GGT>100 + ASAT/ALAT >1.5 | Reevaluation consommation |

---

### 4. FORMULE BMN-T : Score Final (0-200 pts)

#### 4.1 Ponderation Dynamique Tri-Source

```
BMN_T = w_C x BMN_C_norm + w_B x Bio_norm + w_K x BMN_K_norm

Ponderations de base (gap <= 20) :
  w_C = 0.55  (clinique = source principale)
  w_B = 0.30  (biologie)
  w_K = 0.15  (comorbidites)

Si gap = (Bio_norm - BMN_C_norm) > 20 :
  extraWeight = min(0.30, (gap - 20) / 100 x 0.60)
  w_B = 0.30 + extraWeight     (monte jusqu'a 0.60)
  w_C = 0.55 - extra x 0.75   (descend jusqu'a 0.25)
  w_K = 0.15                   (stable)
```

#### 4.2 Mecanismes de Securite (Planchers)

| Plancher | Condition | Action |
|----------|-----------|--------|
| **BioFloor Standard** | BMN_T < Bio_norm x 0.75 | BMN_T = Bio_norm x 0.75 |
| **BioFloor Urgence** | Bio_norm > 90 | BMN_T >= max(80, Bio_norm x 0.85) |
| **BioFloor Urgence** | Bio_norm > 80 | BMN_T >= Bio_norm x 0.85 |
| **Comorbidity Floor** | BMN_K > 30 ET BMN_T < 40 | BMN_T >= max(40, K_norm x 0.80) |
| **Retro DT2** | HbA1c >= 6.5% | BMN_T >= 60 |

#### 4.3 Classification Finale

| BMN-T | Niveau | P(Obesite 10 ans) |
|-------|--------|-------------------|
| 0-40 | FAIBLE | < 8% |
| 41-80 | MODERE | 8-22% |
| 81-120 | ELEVE | 22-47% |
| 121-160 | TRES ELEVE | 47-71% |
| > 160 | CRITIQUE | > 71% |

---

### 5. CTI : Indice de Chronicisation (0-100)

```
CTI = Sum(gamma_j x Z_j) x max(amplificateur_comorbidite)
```

#### 5.1 Coefficients gamma_j

| j | Variable | gamma |
|---|----------|-------|
| 1 | Duree surpoids cumulee | 0.185 |
| 2 | Yo-Yo >= 3 cycles | 0.249 |
| 3 | Resistance leptine | 0.210 |
| 4 | Microbiote (Firmicutes/Bacteroidetes) | 0.180 |
| 5 | Cortisol salivaire nocturne | 0.195 |
| 6 | Metabolisme basal abaisse | 0.200 |
| 7 | Obesite enfance (< 12 ans) | 0.240 |

#### 5.2 Amplificateurs (NON cumulatifs, le plus eleve s'applique)

| Comorbidite | Amplificateur |
|-------------|---------------|
| DT2 etabli (HOMA-IR > 4) | x1.80 |
| Corticoides > 3 mois | x1.60 |
| SAOS severe (IAH > 30) | x1.40 |
| Hypothyroidie | x1.30 |
| SOPK non traite | x1.20 |

#### 5.3 Interpretation

| CTI | Fenetre | Action |
|-----|---------|--------|
| 0-20 | OUVERTE | Reversibilite elevee |
| 21-40 | DEBUTANTE | Intervention urgente |
| 41-55 | AVANCEE | Fenetre se ferme |
| > 55 | **FERMEE** | Chirurgie bariatrique obligatoire |

---

### 6. GRI : Indice de Reponse GLP-1

```
GRI = Sum(delta_k x F_k) - Sum(epsilon_k x U_k)
```

#### 6.1 Predicteurs Favorables (delta_k)

| Predicteur | delta |
|------------|-------|
| HOMA-IR > 2.5 | 1.07 |
| SOPK | 0.83 |
| Pre-diabete confirme | 0.82 |
| Phenotype MONW | 0.70 |
| NAFLD/MAFLD | 0.66 |
| Syndrome metabolique | 0.65 |
| Adiponectine < 6 | 0.62 |
| TG/HDL > 3.5 | 0.55 |

#### 6.2 Predicteurs Defavorables (epsilon_k)

| Predicteur | epsilon |
|------------|---------|
| CTI > 55 | 0.65 |
| IMC > 40 sans profil metabolique | 0.47 |
| Corticoides actifs | 0.35 |
| Cortisol chronique eleve | 0.28 |

#### 6.3 Interpretation GRI

| GRI | Reponse | Recommandation |
|-----|---------|----------------|
| >= 2.5 | Excellent | Tirzepatide si HOMA-IR > 4. Perte > 15% a 1 an |
| 1.5-2.4 | Bon | Semaglutide 2.4 mg. Perte 10-15% a 1 an |
| 0.5-1.4 | Modere | GLP-1 a discuter |
| < 0.5 | Faible/Negatif | GLP-1 insuffisant seul |

---

### 7. MODELE DE MARKOV 6 ETATS

#### 7.1 Etats

| Etat | Description | IMC |
|------|-------------|-----|
| S1 | Poids normal | 18.5-22.9 |
| S2 | Surpoids debutant | 23-24.9 |
| S3 | Surpoids etabli | 25-27.4 |
| S4 | Surpoids eleve | 27.5-29.9 |
| S5 | Obesite moderee | 30-34.9 |
| S6 | Obesite severe/chronique | >= 35 |

#### 7.2 Matrice de Transition de Base

| De \ Vers | S1 | S2 | S3 | S4 | S5 | S6 |
|-----------|------|------|------|------|------|------|
| S1 | 0.82 | 0.14 | 0.03 | 0.01 | 0.00 | 0.00 |
| S2 | 0.08 | 0.68 | 0.18 | 0.05 | 0.01 | 0.00 |
| S3 | 0.02 | 0.11 | 0.61 | 0.21 | 0.04 | 0.01 |
| S4 | 0.01 | 0.04 | 0.14 | 0.56 | 0.21 | 0.04 |
| S5 | 0.00 | 0.01 | 0.03 | 0.12 | 0.65 | 0.19 |
| S6 | 0.00 | 0.00 | 0.01 | 0.03 | 0.11 | 0.85 |

#### 7.3 Modulation

```
P_ij(BMN, K) = P_ij(base) x exp(theta_BMN x BMN_T/100) x exp(theta_K x K_norm/100)

theta_BMN = 0.68 (coefficient modulation score global)
theta_K   = 0.35 (coefficient modulation comorbidites)

Multiplicateurs par comorbidite :
  DT2 :  x1.40
  MetS : x1.50
  SOPK : x1.30
  SAOS : x1.25
```

---

### 8. STRATEGIES THERAPEUTIQUES

| BMN-T | Niveau | Strategie | GLP-1 | Chirurgie |
|-------|--------|-----------|-------|-----------|
| 0-40 | FAIBLE | Surveillance 3 ans. Lifestyle. | Non | Non |
| 41-80 | MODERE | Lifestyle structure + diet. Suivi annuel. | Non | Non |
| 81-120 | ELEVE | Intensif multidisciplinaire. Trimestriel. | Si GRI >= 1.5 : Semaglutide | Non |
| 121-160 | TRES ELEVE | Urgence. Equipe multidisciplinaire. | Tirzepatide si HOMA-IR > 4 | Si CTI > 55 |
| > 160 | CRITIQUE | Prise en charge immediate. | Prioritaire | Obligatoire si CTI > 55 |

#### Recommandations par Comorbidite

| Comorbidite | 1ere intention | 2eme intention |
|-------------|---------------|----------------|
| SOPK | Metformine + Sitagliptine | GLP-1RA |
| SAOS | CPAP obligatoire | Perte 10% poids |
| Pre-diabete | Lifestyle (DPP -58%) | Metformine / GLP-1 si BMN-T > 100 |
| NAFLD | GLP-1RA | Pioglitazone |
| MetS complet | GLP-1 + lifestyle structure | - |
| Hypothyroidie | Levothyroxine | - |
| Corticotherapie | Metformine preventive | Reduction posologie |

---

## Structure du Projet

```
webapp/
  src/
    index.tsx          # Hono app (backend + HTML generation)
  public/
    static/
      app.js           # Moteur algorithmique complet (56 Ko)
      styles.css       # Stylesheet complet
  ecosystem.config.cjs # PM2 config
  wrangler.jsonc       # Cloudflare Pages config
  package.json
  tsconfig.json
  vite.config.ts
```

## Fonctionnalites Implementees

- [x] Module BMN-C complet (21 variables, seuils ethniques)
- [x] 9 groupes ethniques x 8 multiplicateurs
- [x] Module BMN-K (11 comorbidites + phenotypes + traitements)
- [x] Comorbidity Floor
- [x] Module BMN-B (15 biomarqueurs, z-scores, denominateur adaptatif)
- [x] Retrovalidation biologique (6 regles)
- [x] Panels Tier 2A/2B/2C/2D automatiques
- [x] Sub-Score Inflammatoire Indirect (SII)
- [x] Ponderation dynamique tri-source BMN-T
- [x] BioFloor Standard + Urgence
- [x] CTI (Chronicization Trajectory Index) avec 7 gamma + amplificateurs
- [x] GRI (GLP-1 Response Index) avec 8 delta + 4 epsilon
- [x] Modele de Markov 6 etats avec projection 10 ans
- [x] Classification 5 niveaux (FAIBLE -> CRITIQUE)
- [x] Strategies therapeutiques personnalisees par niveau et comorbidite
- [x] Sidebar temps reel avec scores live
- [x] Interface responsive (desktop + mobile)
- [x] Impression (mode print CSS)
- [x] Navigation 5 etapes avec progression

## Stack Technique

- **Backend** : Hono (Cloudflare Pages)
- **Frontend** : Vanilla JS + CSS custom (pas de framework)
- **Polices** : DM Serif Display, DM Mono, Plus Jakarta Sans
- **Deploy** : Cloudflare Pages / Wrangler

## Deploiement

```bash
npm run build
npm run deploy
```

---

**Score BMN v2.0 -- Confidentiel**
**Grade 1a -- Cible BMJ / JAMA**
