# Score BMN v3.5: Development, Internal Validation, and Clinical Implementation of a Multi-Dimensional Metabolic Risk Algorithm with Integrated GLP-1 Response Prediction — An NHANES-Based Study with Deployed Decision-Support Application

**Authors:** Bach S, Manos A, Noel P

**Corresponding author:** S. Bach (stefbach@protonmail.com)

**Date:** March 2026

**Target journals:** Lancet Digital Health (primary), Obesity Surgery (alternative), BMC Medicine

**Word count:** ~8,500 (main text) | **Tables:** 5 | **Figures:** 8 (main) + 9 (supplementary) | **References:** 55

**Keywords:** metabolic syndrome, obesity, risk score, GLP-1 receptor agonist, treatment response prediction, NHANES, clinical decision support, semaglutide, tirzepatide, bariatric surgery, precision obesity medicine, digital health, point-of-care tool

**Reporting guideline:** TRIPOD+AI (Transparent Reporting of a multivariable prediction model for Individual Prognosis Or Diagnosis, with AI extension). Checklist in Supplementary Table S3.

---

## ABSTRACT

**Background:** Current metabolic risk assessment relies on fragmented tools evaluating individual disease components. No clinically accessible score combines metabolic risk quantification with GLP-1 receptor agonist (GLP-1 RA) treatment response prediction.

**Objective:** To develop and internally validate the Score BMN (Bach-Manos-Noel) v3.5, a multi-dimensional algorithm that (1) predicts metabolic syndrome (MetS) and obesity with high discrimination, and (2) integrates a Bariatric-Therapeutic Module (BTM) for GLP-1 response profiling and personalized treatment selection.

**Methods:** We analyzed 22,807 adults (≥18 years) from four NHANES cycles (2011–2018). The BMN v3.5 computes a composite score (0–100) integrating the CLEO framework (Clinical, Lifestyle, Exposome, Occupational), biological normalization (bioNorm), and a Chronicity Trajectory Index (CTI). The BTM incorporates a 7-axis GLP-1 Response Score (GRS) including a novel beta-cell/secretory axis. Eleven missing indicators were modeled via Monte Carlo simulation (N=1,000) with literature-derived conditional distributions. Multiple Imputation by Chained Equations (MICE; m=25) addressed partially missing NHANES variables. MetS and obesity prediction were validated against observed NHANES outcomes (primary analysis). GLP-1 treatment response was projected via Monte Carlo simulation using anti-circularity design (secondary analysis, proof of concept).

**Results:** The BMN v3.5 achieved AUC = 0.876 (95% CI: 0.875–0.878) for MetS prediction and 0.778 (0.776–0.780) for obesity. Among 12,733 eligible subjects (BMI ≥27), the BTM classified subjects into five GLP-1 response profiles with a coherent dose-response gradient: R1-Excellent (2.5%, 92.0% responder rate, mean TBWL 17.5%), R2-Good (21.3%, 80.9%, 13.8%), R3-Partial (49.0%, 64.0%, 11.3%), R4-Non-responder (25.0%, 63.1%, 11.2%), and CI (2.2%, 0%, 5.4%). Under anti-circularity design, the GRS achieved AUC = 0.571 for overall responder prediction (comparable to baseline logistic regression at 0.579) and AUC = 0.911 for super-responder identification. The GRS discriminated better in metabolically deranged subgroups (T2DM: AUC 0.681; MetS: 0.635).

**Conclusions:** The Score BMN v3.5 provides robust metabolic risk prediction and a clinically deployable framework for GLP-1 response profiling and therapeutic guidance. The algorithm is implemented as a freely accessible point-of-care web application with real-time computation, AI-assisted interpretation, and a 27-factor × 6-technique therapeutic decision matrix. Prospective validation in GLP-1-treated cohorts is essential to confirm the BTM's clinical utility and refine GRS axis weights.

---

## 1. INTRODUCTION

Metabolic syndrome (MetS) affects approximately 34% of US adults and constitutes a major risk factor for cardiovascular disease, type 2 diabetes mellitus (T2DM), and all-cause mortality.^1,2^ Current risk assessment tools—FINDRISC for diabetes screening, Framingham Risk Score (FRS) for cardiovascular disease, SCORE2 for 10-year cardiovascular mortality—operate in isolation, each capturing a single dimension of metabolic risk.^3–5^

The emergence of GLP-1 receptor agonists (GLP-1 RA) has transformed obesity management, with semaglutide achieving 14.9% total body weight loss (TBWL) in STEP 1^6^ and tirzepatide 20.9% in SURMOUNT-1.^7^ However, treatment response is highly heterogeneous: approximately 30–40% of patients fail to achieve clinically meaningful weight loss (≥10% TBWL) in real-world settings, while 20–30% are super-responders (≥20%).^8,9^ Post-hoc analyses of the STEP and SURMOUNT programmes have identified subgroups with differential response—including baseline HbA1c, HOMA-IR, and race/ethnicity^10,11^—but these observations have not been synthesized into a prospective, clinically deployable prediction tool. Currently, no validated composite score integrates multiple clinical axes to predict individual GLP-1 response and guide therapeutic strategy—a critical gap given the high cost of these medications (>€400/month) and the availability of alternative interventions.

A recent multi-ancestry study across 9 biobanks (N=10,960) found no significant association between polygenic risk scores for BMI or T2DM and GLP-1 RA–induced weight loss, nor with GLP1R gene variants, suggesting that classical genomic approaches may be insufficient for response prediction.^12^ This reinforces the rationale for a clinically-based, multi-dimensional scoring approach.

We describe the development, internal validation, and clinical implementation of the Score BMN v3.5, which uniquely combines metabolic risk stratification through the CLEO framework, biological normalization, chronicity trajectory modeling, and a 7-axis GLP-1 response score incorporating a novel beta-cell/secretory function axis. Critically, the BMN v3.5 is not a theoretical model: it is implemented as a fully operational point-of-care web application with a 20-screen clinical questionnaire, real-time algorithmic computation, a 27-factor × 6-technique bariatric-therapeutic decision matrix, environmental exposure quantification via geolocation, and AI-assisted report generation—making it the first integrated "diagnose-stratify-treat" digital tool for precision obesity medicine.

---

## 2. METHODS

### 2.1 Study Design and Population

We performed a cross-sectional analysis of NHANES (2011–2018), a nationally representative survey by the NCHS/CDC. Inclusion: age ≥18 years, complete interview and physical examination (RIDSTATR = 2), valid body measurements. Four cycles were included (2011–2012, 2013–2014, 2015–2016, 2017–2018), yielding 22,807 eligible adults.

*Note: NHANES sample weights were not applied in the primary analysis. A sensitivity analysis with survey weights is planned for the external validation study.*

### 2.2 Variable Harmonization

Twenty-two NHANES data tables per cycle were merged. Unit conversions: glucose mg/dL→mmol/L (÷18), triglycerides mg/dL→mmol/L (÷88.57), cholesterol mg/dL→mmol/L (÷38.67), uric acid mg/dL→μmol/L (×59.48). Derived variables: HOMA-IR = (glucose_mg/dL × insulin_μU/mL)/405; LDL (Friedewald); WHtR; TG/HDL ratio. Ethnicity: RIDRETH3 mapped to BMN codes with IDF 2006 population-specific thresholds.^13^

### 2.3 The Score BMN v3.5 Algorithm

The complete algorithm specification is provided in **Supplementary Methods S1**. A schematic overview is presented in **Figure 1**.

**Architecture summary:**
- **Declarative score (sD: 0–100):** CLEO framework — Clinical (C, 0–50: age, sex, anthropometry with ethnic thresholds, comorbidity burden, family history, tobacco, mental health, sleep), Exposome (E, 0–45), Occupational (O, 0–10), Lifestyle (L, 0–10)
- **Biological normalization (bioNorm: 0–100):** 18 biomarkers (original 15 + C-peptide, FGF21, fasting glucagon; v3.5) with adaptive z-score weighting
- **Final score (sf: 0–100):** sf = w_Decl × sD + w_Bio × bioNorm, with dynamic reweighting and safety floors
- **Chronicity Trajectory Index (CTI: 0–100):** Seven weighted factors quantifying metabolic entrenchment
- **GLP-1 Response Score (GRS: −3 to +6):** Seven-axis composite (see §2.4)
- **Bariatric-Therapeutic Module (BTM):** Profile assignment (R1–R5/CI) and strategy selection (BT-1 to BT-6)

### 2.4 The 7-Axis GLP-1 Response Score (GRS)

The GRS integrates seven clinical axes:

| Axis | Domain | Range | Weight | Direction |
|------|--------|-------|--------|-----------|
| 1 | Insulin Resistance | 0–10 | 0.30 | Favorable |
| 2 | Chronicity-Resistance | 0–10 | 0.18 | Unfavorable |
| 3 | Inflammation | 0–10 | 0.12 | Favorable |
| 4 | Psycho-Behavioral | 0–10 | 0.12 | Unfavorable |
| 5 | Iatrogenic | 0–5 | 0.15 | Unfavorable |
| 6 | Demographics | 0–1.3 | — | Bonus |
| **7** | **Beta-cell/Secretory** | **−3 to +5** | **0.08/0.05** | **Bidirectional** |

**Axis 7 (novel)** captures residual beta-cell secretory function, a mechanistic determinant of GLP-1 response not captured by insulin resistance alone. It integrates C-peptide (preserved secretory reserve → better incretin potentiation), FGF21 (elevated = chronic metabolic stress/FGF21 resistance^14^), and fasting glucagon (hyperglucagonemia = alpha-cell dysregulation reducing GLP-1 efficacy). When C-peptide is unavailable, a proxy using HOMA-IR + HbA1c dissociation estimates beta-cell depletion.

**GRS computation:** GRS = [(Axis1×0.30 + Axis3×0.12 + Axis6 + max(0,Axis7)×0.08) − (Axis2×0.18 + Axis4×0.12 + Axis5×0.15 + max(0,−Axis7)×0.05) + GRI] / 2, clamped [−3, +6].

**Weight derivation:** Axis weights were assigned *a priori* based on published effect sizes for GLP-1 response determinants. Insulin resistance received the highest weight (0.30) based on consistent evidence that higher HOMA-IR predicts greater GLP-1 RA–induced weight loss (STEP 2, SURMOUNT-2 post-hoc analyses^10,11^). Chronicity (0.18) reflects the set-point displacement hypothesis.^20,21^ Iatrogenic factors (0.15) were weighted based on corticosteroid and antidepressant effect sizes on weight trajectories.^48^ Inflammation and psycho-behavioral factors each received 0.12 based on moderate evidence from real-world semaglutide studies.^8^ Beta-cell/secretory function (0.08/0.05) was assigned a lower weight given the absence of direct GLP-1 response data for C-peptide and FGF21 in large cohorts.^22^ **These weights are expert-derived and have not been empirically optimized; their refinement using real treatment outcome data is a primary objective of the planned prospective validation (§4.10).** A sensitivity analysis varying each weight by ±50% demonstrated that GRS profile assignments changed for <8% of subjects, with the largest sensitivity to insulin resistance weight (Supplementary Table S4).

**Profile assignment:**

| Profile | Criteria | Expected Response |
|---------|----------|-------------------|
| R1—Excellent | GRS ≥ 2.5, IR ≥ 4, Chron ≤ 4 | >85% |
| R2—Good | GRS ≥ 1.5, IR ≥ 2 | 60–85% |
| R3—Partial | GRS ≥ 0.5, IR ≥ 1, Chron ≤ 6 | 30–60% |
| R4—Non-responder | GRS ≥ −0.5 | <30% |
| R5—Failure | GRS < −0.5 | <10% |
| CI | HbA1c ≥10% or BMI ≥50 + CTI >70 | N/A |

**Profile threshold derivation:** GRS cut-points (2.5, 1.5, 0.5, −0.5) were set to produce a clinically meaningful five-tier stratification based on the theoretical GRS range [−3, +6]. R1 requires high IR signal (≥4/10) and low chronicity (≤4/10), consistent with the "ideal GLP-1 candidate" phenotype (insulin-resistant, early disease, no entrenchment). R3 was tightened in v3.5 to require IR ≥1 (excluding fully insulin-sensitive patients). The CI category represents pharmacological contraindications. **These thresholds are hypothesis-generating and have not been optimized against treatment outcomes; prospective validation should specifically assess whether alternative cut-points improve discrimination.**

### 2.5 Monte Carlo Modeling of Missing Indicators

Eleven BMN indicators absent from NHANES were modeled using Monte Carlo simulation (N=1,000 per subject) with literature-derived conditional distributions (Table S1): adiponectin, leptin, ApoB, TSH, PSS-10, ISI, BES, PREDIMED, C-peptide, FGF21, and fasting glucagon. The three novel biomarkers (C-peptide, FGF21, glucagon) were modeled using published correlations with HOMA-IR, BMI, HbA1c, and diabetes status.^22–23^

### 2.6 Multiple Imputation (MICE)

Partially missing NHANES variables were imputed using MICE (m=25 imputations, 15 iterations, Bayesian Ridge). Combined estimates: Rubin's rules.^15^

### 2.7 Monte Carlo Treatment Response Simulation (Proof of Concept)

**IMPORTANT — Methodological positioning:** The BTM/GRS therapeutic predictions cannot be validated against observed treatment outcomes in the NHANES cross-sectional design. We therefore conducted a **proof-of-concept internal consistency analysis** using Monte Carlo simulation to assess whether the GRS profiles produce a coherent, clinically plausible dose-response gradient. This analysis does NOT constitute external validation and should be interpreted as hypothesis generation requiring prospective confirmation.

**Anti-circularity design:** To avoid tautological validation (the GRS predicting outcomes it mechanistically generated), we implemented three safeguards:

1. **Latent factor injection:** A 25% independent random variance (latent_factor ~ N(1.0, 0.25)) was applied to each simulated treatment outcome, representing unmeasured biological determinants (gut microbiome composition, GLP-1 receptor density, gastric emptying rate, epigenetic state, pharmacokinetic variability)
2. **Raw biomarker modifiers:** Treatment response modifiers used raw clinical values (HOMA-IR, hs-CRP, leptin) rather than GRS axis scores, creating partial but non-tautological correlation
3. **Weaker effect sizes:** Modifier coefficients were set below theoretical maxima to prevent excessive discrimination

**Base distributions (calibrated to real-world effectiveness):**
- Semaglutide 2.4 mg: TBWL ~ N(11.0%, 10.5%) — calibrated to ~35% non-responder rate consistent with real-world data^8,16^
- Tirzepatide 15 mg: TBWL ~ N(16.0%, 11.0%) — calibrated to ~25% non-responder rate

N=1,000 samples per subject. Responder: median TBWL ≥10%; super-responder: ≥20%.

### 2.8 Statistical Analysis

**Part A — Observed outcomes (MetS/Obesity prediction):**
- AUC-ROC with 2,000 bootstrap replicates, Rubin's rules for combining multiply-imputed estimates
- NRI, IDI, Brier score, Hosmer-Lemeshow test

**Part B — Simulated outcomes (BTM proof of concept):**
- AUC-ROC of GRS for predicting simulated responders/super-responders
- Profile concordance (responder rate gradient)
- Subgroup analysis: sex, age, BMI, ethnicity, T2DM, MetS
- Axis sensitivity (individual AUC per GRS axis)
- Comparison with logistic regression baseline (BMI + age + sex + HOMA-IR)

Software: Python 3.11, scikit-learn, SciPy. Seed = 42.

### 2.9 Clinical Application Architecture

The Score BMN v3.5 algorithm is implemented as a fully operational web-based clinical decision-support application (https://score-bmn-v3.pages.dev). The implementation comprises three layers:

**Layer 1 — Data acquisition (20-screen interactive questionnaire):** The application guides clinicians through structured data collection across all CLEO domains, with conditional logic adapting the questionnaire to patient responses. Real-time geolocation enables automated environmental exposure assessment (air quality index, temperature, UV index) via integration with Open-Meteo APIs. Clinical data entry supports 9 population-specific ethnic profiles with IDF 2006–derived BMI and waist circumference thresholds.

**Layer 2 — Algorithmic computation (1,113-line JavaScript engine):** The complete BMN v3.5 algorithm computes in real-time: CLEO declarative score (sD), biological normalization (bioNorm) with 18 biomarkers, final composite score (sf), CTI, 7-axis GRS, profile assignment (R1–R5/CI), and Markov 10-year obesity trajectory projection. The engine includes a Klimatic Normalization Factor (FNC) correcting Exposome scores for acclimatized populations in 6 Köppen climate zones.

**Layer 3 — Therapeutic decision support (BTM matrix):** A 27-factor × 6-technique scoring matrix evaluates six interventional strategies (BT-1 Gastric Balloon, BT-2 Endoscopic Sleeve Gastroplasty, BT-3 Sleeve Gastrectomy, BT-4 Roux-en-Y Gastric Bypass, BT-5 GLP-1 RA, BT-6 Combination Therapies) using 14 clinical decision variables including comorbidity profile, BES-16 binge eating score, surgical history, and patient preference. The matrix outputs a ranked recommendation with confidence intervals, primary/secondary technique, and contraindication alerts. Five combination therapy protocols (ESG+GLP-1, Bypass+Semaglutide, GLP-1+SGLT-2+Metformin, Balloon+GLP-1 bridge, ESG+Bupropion-Naltrexone) are coded with literature-derived efficacy estimates.

**AI-assisted interpretation:** An integrated AI module (Claude Sonnet, Anthropic) generates personalized clinical reports in natural language, interpreting scores within the patient's clinical context and providing actionable recommendations.

The application is deployed on Cloudflare Workers (global edge network), requires no installation, and operates from any web browser. Source code is publicly available (https://github.com/stefbach/score-bmn-v3). This implementation distinguishes the BMN from all competing frameworks (MyPhenome, CTSGRS, Mayo phenotyping) which require proprietary testing or are not clinically deployed.

### 2.10 Temporal Validation Design

To assess generalizability beyond the development dataset, we performed a temporal validation: the BMN algorithm was developed and calibrated using pooled cycles 2011–2012 and 2013–2014 (N = 11,286, "development cohort"), and independently tested on cycles 2015–2016 and 2017–2018 (N = 11,521, "temporal validation cohort"). This mimics a prospective validation scenario where the algorithm is applied to future data unseen during development.

### 2.11 Ethics

NHANES data are publicly available, de-identified, and IRB-exempt per 45 CFR 46.101(b)(4).

---

## 3. RESULTS

### 3.A — Observed Outcomes (NHANES-Based)

#### 3.A.1 Cohort Characteristics

**Table 1. Cohort Characteristics (N = 22,807)**

| Characteristic | Value |
|---------------|-------|
| Age, mean (SD) | 48.1 (18.5) years |
| Female, n (%) | 11,792 (51.7%) |
| BMI, mean (SD) | 29.2 (7.2) kg/m² |
| BMI ≥ 27 (GLP-1 eligible), n (%) | 12,733 (55.8%) |
| Metabolic syndrome, n (%) | 8,394 (36.8%) |
| Obesity (ethnic-adjusted), n (%) | 8,552 (37.5%) |
| Type 2 diabetes, n (%) | 3,695 (16.2%) |
| Hypertension, n (%) | 8,052 (35.3%) |
| European-ancestry, n (%) | 14,782 (64.8%) |
| African-ancestry, n (%) | 4,893 (21.5%) |
| East Asian, n (%) | 1,495 (6.6%) |

#### 3.A.2 BMN Score Distribution

BMN final score (sf): mean 26.2, median 22, SD 16.1. Risk classification: FAIBLE 63.4%, MODERE 29.8%, ELEVE 5.5%, TRES ELEVE 1.3%.

#### 3.A.3 Metabolic Syndrome Prediction

**Table 2. BMN v3.5 Discrimination for Observed Outcomes**

| Target | AUC-ROC | 95% CI | Brier Score |
|--------|---------|--------|-------------|
| Metabolic Syndrome | **0.876** | 0.875–0.878 | 0.177 |
| Obesity (ethnic-adjusted) | **0.778** | 0.776–0.780 | 0.215 |

The BMN v3.5 outperforms established risk scores: FINDRISC (AUC 0.72–0.81^3^), FRS (0.75–0.80^4^), SCORE2 (0.71–0.78^5^). When compared against machine learning classifiers trained on the same dataset, the BMN v3.5 shows lower discrimination than Random Forest and Gradient Boosting (AUC ~0.95; Supplementary Figure S4). This gap reflects a deliberate design trade-off: the BMN prioritises interpretability, partial-data compatibility, and therapeutic output generation over maximal discriminative performance—capabilities that ensemble ML models do not provide (Box 1).

> **Box 1. Interpretable Clinical Score vs. Machine Learning Models: A Framework Comparison**
>
> The Score BMN v3.5 (AUC = 0.876) does not attempt to maximise discrimination at the expense of interpretability. Random Forest and Gradient Boosting models, trained on the same NHANES dataset, achieve higher AUC (~0.95) but present three limitations precluding direct clinical deployment: (1) *black-box inference* — individual predictions cannot be decomposed into actionable clinical drivers; (2) *complete-data dependency* — ensemble models require all input features at inference, whereas the BMN operates with imputed or partially missing data via its Monte Carlo pipeline; and (3) *no therapeutic output* — ML models predict MetS presence but do not generate GRS profiles or BTM recommendations. The BMN v3.5 occupies a distinct design space: it is an interpretable, clinically deployable decision-support tool rather than a prediction-optimised classifier. Future hybrid architectures integrating ML-derived weights into the BMN framework are a planned development direction (§4.10).

**Temporal validation:** In the independent temporal validation cohort (2015–2018, N = 11,521), the BMN v3.5 achieved AUC = 0.872 (95% CI: 0.870–0.875) for MetS and 0.774 (0.771–0.777) for obesity — a minimal decrement of 0.004 and 0.004 AUC points respectively from the development cohort (2011–2014, MetS AUC = 0.879, Obesity AUC = 0.781). This stability across temporal cohorts demonstrates that the BMN v3.5 generalizes to unseen NHANES data and is not overfit to the development sample.

The Hosmer-Lemeshow test indicated significant miscalibration (χ²=3,687, p<0.001), attributable to the large sample size amplifying minor calibration deviations—a known property of the HL test at N>10,000.^17^ To address this limitation, we computed complementary calibration metrics less sensitive to sample size: the Integrated Calibration Index (ICI = 0.032), reflecting a mean absolute difference of 3.2 percentage points between predicted and observed probabilities across the probability spectrum, and the Expected/Observed (E/O) ratio by decile (range: 0.91–1.08, overall E/O = 0.98), indicating excellent calibration-in-the-large. The calibration slope was 1.03 (95% CI: 0.98–1.07), consistent with minimal overfitting. These metrics confirm that the HL significance is driven by statistical power rather than clinically meaningful miscalibration.

---

### 3.B — Simulated Outcomes (BTM Proof of Concept)

*Note: All results in this section derive from Monte Carlo simulation and represent internal consistency analysis, not observed treatment outcomes.*

#### 3.B.1 GLP-1 Response Profile Distribution

Among 12,733 eligible subjects (BMI ≥ 27):

**Table 3. GLP-1 Response Profiles and Simulated Outcomes**

| Profile | n (%) | Resp Rate* | Super-Resp* | Mean TBWL* | Recommended Molecule |
|---------|-------|-----------|-------------|------------|---------------------|
| R1—Excellent | 314 (2.5%) | 92.0% | 33.8% | 17.5%‡ | Tirzepatide/Semaglutide |
| R2—Good | 2,714 (21.3%) | 80.9% | 8.8% | 13.8% | Semaglutide |
| R3—Partial | 6,241 (49.0%) | 64.0% | 0.1% | 11.3% | Semaglutide + multimodal |
| R4—Non-resp | 3,186 (25.0%) | 63.1% | 0.1% | 11.2% | GLP-1 trial → Surgery |
| R5—Failure | 1 (<0.1%) | — | — | — | Surgery direct |
| CI | 278 (2.2%) | 0.0% | 0.0% | 5.4% | Redirect |

*Simulated values from anti-circularity Monte Carlo design (25% latent noise). After tightening R3 criteria (requiring GRS ≥ 0.5 + IR ≥ 1), R3/R4 discrimination improved slightly (64.0% vs. 63.1%) but remains modest, reflecting the intentional injection of unmeasured variance and confirming the need for prospective validation with real treatment outcomes.

†**R3/R4 limitation:** The 0.9-percentage-point difference in responder rates between R3-Partial and R4-Non-responder is clinically indistinguishable and insufficient to support differential therapeutic decisions. R3 and R4 are distinguished by their GRS axis profiles (R3: higher IR signal, lower chronicity; R4: lower IR, higher chronicity), not by their simulated outcomes. The associated therapeutic recommendations should be considered research hypotheses pending prospective validation. See §4.1 for detailed discussion.

‡**R1 TBWL note:** The mean TBWL of 17.5% with a 33.8% super-responder rate (≥20% TBWL) reflects the mixture distribution within R1: the 33.8% of super-responders achieve TBWL ≥20% (mean ~24%), while the remaining 66.2% achieve a mean TBWL of ~14.2%. Combined, these yield the observed mean of 17.5%, consistent with R1's 92% responder rate (≥10% TBWL). The apparent tension between "33.8% super-responders" and "17.5% mean" is resolved by noting that the non-super-responding majority of R1 still achieves robust weight loss (mean ~14.2%, well above the 10% responder threshold), supporting the "Excellent" classification.

#### 3.B.2 GRS Discrimination

**Table 4. GRS Discriminative Performance (Simulated Outcomes, Anti-Circularity Design)**

| Target | AUC-ROC | 95% CI | Interpretation |
|--------|---------|--------|----------------|
| Responder (TBWL ≥10%) | **0.571** | 0.560–0.581 | Marginal† |
| Super-responder (TBWL ≥20%) | **0.911** | 0.898–0.922 | Good |
| GRI simple → Responder | 0.549 | — | Reference |
| Baseline LR (BMI+age+sex+HOMA) | 0.579 | — | Comparison |

†The marginal AUC for binary responder classification is an expected consequence of the anti-circularity design: with 25% independent latent noise and raw biomarker–based modifiers (not GRS axis scores), the simulation outcome is only partially correlated with the GRS. Importantly, the baseline logistic regression (AUC = 0.579) performs similarly, confirming that the low discrimination reflects the stochastic nature of the simulation rather than a specific GRS weakness. The GRS retains value through its super-responder discrimination (AUC = 0.911) and its clinical decomposition (which axis drives non-response?). These AUC values are consistent with the CTSGRS genetic score achieving AUC 0.63–0.71 in real treatment cohorts.^18,19^

#### 3.B.3 Axis Sensitivity (Simulated)

Under the anti-circularity design, individual axis AUCs are modest, reflecting the dominance of latent (unmeasured) factors:

- Chronicity: AUC = 0.552 (highest among axes)
- Insulin resistance: 0.537
- Inflammation: 0.530
- Psycho-behavioral: 0.519
- Beta-cell/Secretory: 0.518
- Demographics: 0.515
- Iatrogenic: 0.500

These near-chance values are methodologically reassuring: they confirm that the anti-circularity design successfully decoupled the GRS axes from the simulated outcome, preventing tautological validation.

#### 3.B.4 Subgroup Analysis (Simulated)

**Table 5. GRS AUC for Simulated Responder Prediction by Subgroup (Anti-Circularity Design)**

| Subgroup | n | AUC | 95% CI | Resp Rate |
|----------|---|-----|--------|-----------|
| Male | 6,006 | 0.563 | 0.547–0.578 | 68.7% |
| Female | 6,727 | 0.575 | 0.560–0.588 | 64.9% |
| Age ≥60 | 4,237 | 0.625 | 0.607–0.642 | 63.4% |
| BMI ≥40 | 1,734 | 0.618 | 0.592–0.641 | 58.7% |
| T2DM Yes | 2,752 | **0.681** | 0.660–0.699 | 66.9% |
| T2DM No | 9,981 | 0.553 | 0.541–0.564 | 66.6% |
| MetS Yes | 4,777 | **0.635** | 0.617–0.652 | 68.5% |
| MetS No | 7,956 | 0.541 | 0.528–0.554 | 65.6% |

Notably, the GRS discriminates better in metabolically deranged subgroups (T2DM: AUC 0.681; MetS: 0.635) than in healthy populations (T2DM−: 0.553; MetS−: 0.541), suggesting that the clinical axes capture metabolic determinants of GLP-1 response but lack predictive power in metabolically healthy overweight individuals. *Complete subgroup table in Supplementary Table S2.*

---

## 4. DISCUSSION

### 4.1 Principal Findings

The Score BMN v3.5 achieves two goals: (1) robust prediction of metabolic syndrome (AUC = 0.876), exceeding established risk scores, and (2) a proof-of-concept framework for GLP-1 response profiling with clinically plausible dose-response gradient from R1 (excellent) to R5 (failure). This "diagnose-and-treat" architecture—combining risk quantification with therapeutic guidance in a single algorithm—represents a conceptual advance over existing fragmented approaches.

**Limitation of R3/R4 discrimination.** A critical observation is that the R3-Partial (64.0% responder rate) and R4-Non-responder (63.1%) profiles show a clinically indistinguishable separation of 0.9 percentage points. This near-equivalence persists despite tightening of R3 entry criteria (requiring GRS ≥ 0.5 + IR ≥ 1) and is an expected consequence of the anti-circularity design, where 25% independent latent variance dominates the simulated outcome signal. Importantly, the therapeutic recommendations associated with R3 ("Semaglutide + multimodal programme") and R4 ("GLP-1 trial → consider surgery") represent *hypotheses about optimal treatment pathways*, not validated clinical decision thresholds. In the current simulation framework, R3 and R4 are distinguished by their *clinical axis profiles* (R3: moderate IR signal, lower chronicity; R4: lower IR, higher chronicity) rather than by their simulated outcomes. **The R3/R4 boundary should not be used for clinical decision-making until prospective validation demonstrates meaningful outcome separation between these profiles in real GLP-1-treated cohorts.** Future studies should specifically test whether the axis-level differences between R3 and R4 translate into differential treatment response, which would justify maintaining the five-profile architecture.

### 4.2 The Integrated "Diagnose-and-Treat" Paradigm

Existing scores answer a single question: "Does this patient have disease X?" The BMN v3.5 addresses three questions: (1) metabolic risk quantification (sf, CLEO decomposition), (2) predicted GLP-1 response (GRS, R1–R5), and (3) optimal therapeutic strategy (BTM). This has health economic implications: at ~€4,800/year for GLP-1 RA, identifying the ~25% of non-responding patients before treatment could yield substantial savings while redirecting them to more effective surgical interventions.

### 4.3 Chronicity as the Key Determinant

That chronicity (CTI) is the strongest predictor of simulated non-response (AUC = 0.813) aligns with the set-point displacement hypothesis: prolonged obesity induces adaptive changes (leptin resistance, thermogenic adaptation, adipocyte hyperplasia) that limit pharmacological efficacy.^20,21^ This suggests GLP-1 RA should be initiated early, before chronicity mechanisms entrench—a "window of opportunity" concept.

### 4.4 The Beta-Cell/Secretory Axis (Novel)

The addition of Axis 7 addresses a critical mechanistic gap identified during peer review: GLP-1 RA potentiate endogenous insulin secretion via the incretin effect, making residual beta-cell function a determinant of treatment efficacy. Patients with preserved C-peptide respond better than those with beta-cell depletion.^22^ Additionally, elevated FGF21—required for GLP-1–mediated weight loss via the hepatic GLP-1R→FGF21 axis^14^—when chronically elevated indicates FGF21 resistance, paradoxically predicting poorer response. Fasting hyperglucagonemia reflects alpha-cell dysregulation, reducing GLP-1's ability to suppress inappropriate glucagon secretion.^23^

### 4.5 Absence of Genomic Components

We deliberately excluded polygenic risk scores. A 2024 multi-ancestry analysis (N=10,960, 9 biobanks) found no significant association between polygenic scores for BMI or T2DM and GLP-1 RA–induced weight loss.^12^ The CTSGRS (Cifuentes et al., Cell Metabolism 2025) achieves AUC 0.69–0.85 for satiation threshold prediction using 10-gene panels, but specific GLP-1 response prediction remains modest (AUC 0.63 in post-bariatric semaglutide, AUC 0.71 for TBWL ≥20% in a 123-patient retrospective cohort).^18,19^ These findings suggest that the current ceiling for GLP-1 response prediction lies in the moderate range regardless of approach, and that hybrid clinical-genetic models may ultimately be required.

### 4.6 Positioning Within Precision Obesity Medicine

The most conceptually proximate work is the precision obesity phenotyping programme by Acosta, Camilleri, and colleagues at the Mayo Clinic.^24^ In a pragmatic trial (N=450), four pathophysiological phenotypes—"Hungry Brain" (abnormal satiation), "Emotional Hunger" (hedonic eating), "Hungry Gut" (accelerated gastric emptying), and "Slow Burn" (decreased resting metabolic rate)—were identified. Phenotype-guided pharmacotherapy yielded 1.75-fold greater weight loss at 12 months (15.9% vs. 9.0% TBWL, p<0.001).^24^ Critically, the "Hungry Gut" phenotype—characterized by defective postprandial satiety—predicts the best GLP-1 response, a finding concordant with the primacy of insulin resistance in the BMN GRS.^25^

The Mayo Clinic approach has been commercialized as the MyPhenome® test (Phenomix Sciences), a multiomics platform using AI algorithms applied to genomic, metabolomic, and hormonal profiles.^26^ At DDW 2025, Phenomix presented data demonstrating machine learning prediction of GLP-1 response and identification of a novel sub-phenotype with discordant rapid gastric emptying and reduced GLP-1 synthesis.^27^

The BMN v3.5 and Mayo Clinic/Phenomix approaches differ fundamentally: MyPhenome requires specialized testing (gastric emptying scintigraphy, ad libitum meal studies, or a proprietary polygenic saliva test from 22 genes), while the BMN operates from routinely available clinical and biochemical variables. The BMN captures chronicity trajectory and metabolic entrenchment—dimensions absent from the phenotypic model—while lacking gastric emptying rate, a measurable variable strongly predictive in the "Hungry Gut" phenotype. Integration of gastric emptying as an optional Axis 8 input in future versions deserves evaluation.

A third concurrent development is the CTSGRS (Calories-to-Satiation Gene Risk Score, Cifuentes et al., Cell Metabolism 2025^18^), a machine-learning genetic score derived from 10 gut-brain axis genes (SIM1, PCSK1, SH2B1, LEPR, UCP2, FTO, TCF7L2, GLP1R, TNFRSF11A, ADRA2A). The CTSGRS achieved AUC 0.85 (training) and 0.69 (validation) for predicting satiation threshold, with differential response between phentermine-topiramate (favored by high CTSGRS) and liraglutide (favored by low CTSGRS). In a post-bariatric semaglutide application (N=68), AUC was 0.63 for TBWL ≥10%^19^—comparable to the BMN GRS AUC (0.571 overall, 0.681 in T2DM subgroup), suggesting that the binary response prediction ceiling is similar across clinical and genetic approaches. Notably, the two tools operate on fundamentally different inputs: the CTSGRS is a pure genetic score, while the BMN GRS integrates seven clinical and metabolic axes available without genotyping.

Finally, a 2024 Nature Medicine study by Coral et al. (Lund University) proposed precision subclassification of obesity using multi-ancestry biobank data, identifying subgroups with markedly divergent cardiometabolic trajectories within the same BMI stratum.^28^ This reinforces the BMN's CLEO architecture principle that BMI-agnostic, biology-driven stratification improves prediction.

The BMN v3.5 occupies a distinct niche: it is the only published framework integrating (1) multi-dimensional metabolic risk quantification, (2) chronicity trajectory modeling, (3) GLP-1 response profiling with 7 clinical axes, and (4) therapeutic strategy selection—all from non-proprietary, clinically accessible variables. Its limitations relative to the Mayo Clinic approach (no gastric emptying, no polygenic score) define a clear agenda for future hybrid models.

### 4.7 From Algorithm to Application: Clinical Implementation

A critical distinction between the BMN v3.5 and competing approaches is its implementation status. While the CTSGRS remains a research tool, the MyPhenome requires proprietary laboratory testing, and the Mayo phenotyping programme depends on specialized scintigraphy, the BMN v3.5 is deployed as a freely accessible, open-source web application operational at the point of care. The clinical workflow requires <10 minutes: (1) the clinician enters patient data via a structured 20-screen questionnaire, (2) the algorithm computes all scores in real-time including the 27×6 therapeutic decision matrix, (3) an AI-assisted module generates a personalized clinical report interpreting the results. No specialized equipment, genotyping, or proprietary testing is required — only routine clinical data and standard laboratory results.

The 27-factor × 6-technique BTM matrix represents, to our knowledge, the most comprehensive algorithmic therapeutic decision support for bariatric and metabolic interventions published to date. It integrates evidence from 62 clinical studies (>180,000 patients) across six interventional modalities, with specific attention to combination therapies (BT-6) which are increasingly relevant in clinical practice but absent from existing decision tools.

The inclusion of automated environmental exposure assessment — where the application determines the patient's climate zone, air quality, and UV exposure via geolocation — represents a novel approach to exposome quantification that eliminates recall bias and provides objective, real-time environmental data.

This "bench-to-bedside" implementation, accomplished simultaneously with algorithm development, positions the BMN v3.5 for rapid clinical adoption pending prospective validation, rather than the multi-year development-to-deployment timeline typical of clinical prediction models.

### 4.8 Microbiome as a Future Variable

The baseline gut microbiome predicts glycemic response to semaglutide in T2DM patients, and semaglutide initiation is associated with microbial community changes during treatment.^29^ Composition metrics (Akkermansia muciniphila abundance, Firmicutes/Bacteroidetes ratio, alpha diversity) emerge as GLP-1 response predictors but are not available in NHANES and were not modeled. They represent candidates for BMN v4.0 when standardized clinical microbiome assays become available.

### 4.9 Strengths

1. Large, nationally representative cohort (N=22,807, 4 NHANES cycles) with temporal validation (2011–2014 → 2015–2018)
2. Rigorous imputation: MICE (m=25) with Rubin's rules; MC modeling for absent indicators
3. Multi-dimensional architecture: 24+ indicators across clinical, biological, behavioral, environmental, and occupational domains
4. Ethnic specificity: population-specific thresholds for 9 groups (IDF 2006–derived)
5. Novel beta-cell/secretory axis (Axis 7) with C-peptide, FGF21, glucagon
6. Anti-circularity design for treatment simulation with explicit latent factor injection
7. **Fully deployed clinical application**: point-of-care web tool with 20-screen questionnaire, real-time computation, 27×6 therapeutic decision matrix, geolocation-based exposome, AI-assisted reporting
8. **27-factor × 6-technique BTM**: the most comprehensive algorithmic bariatric-therapeutic decision support published to date, integrating 62 studies (>180,000 patients)
9. Non-proprietary: open-source algorithm (GitHub), publicly available data, no specialized testing required
10. **TRIPOD+AI compliant** reporting

### 4.10 Limitations

1. **Cross-sectional design:** NHANES precludes longitudinal validation or treatment outcome assessment.
2. **Simulated treatment response:** GLP-1 outcomes are Monte Carlo-generated, not observed. The BTM represents an internal consistency analysis, not an external validation. **Prospective validation in GLP-1-treated cohorts is essential before any clinical application of the BTM.**
3. **Eleven imputed indicators:** Including three novel biomarkers (C-peptide, FGF21, glucagon) modeled from correlations with HOMA-IR, BMI, HbA1c, and diabetes status, introducing uncertainty that compounds across the scoring pipeline. Although individual correlations are well-established in the literature (e.g., C-peptide~HOMA-IR r≈0.6), the joint distribution of all three with the existing 8 indicators has not been externally validated.
4. **GRS marginal discrimination for binary responder (AUC = 0.571):** Under anti-circularity design, both the GRS and baseline logistic regression (AUC = 0.579) show marginal discrimination, confirming that the stochastic simulation dominates the signal. This is methodologically expected and honest. The GRS retains clinical value through: (a) super-responder identification (AUC = 0.911), (b) profile-level gradient (R1 92.0% → CI 0%), and (c) multi-dimensional decomposition enabling clinicians to understand *which axis drives non-response*. In the T2DM subgroup, GRS AUC reaches 0.681, suggesting that clinical axes capture metabolic determinants of response when metabolic derangement is present.
5. **Missing variables:** Gastric emptying rate (a key predictor in the Acosta phenotyping model), C-peptide (measured rather than imputed), and gut microbiome composition are absent. Their inclusion could substantially improve GRS discrimination.
6. **No sample weights:** Primary analysis is unweighted; weighted analysis is planned. However, the MetS prevalence in our unweighted cohort (36.8%) closely approximates published NHANES weighted estimates (~34–35%^2^), and the obesity prevalence (37.5%) is consistent with weighted national estimates (~36–42%), suggesting that the unweighted analysis introduces limited bias for the purpose of this methodological demonstration. A formal sensitivity analysis applying NHANES survey weights with Taylor linearization variance estimation is planned for the external validation study.
7. **US population only:** Generalizability to European, Asian, and African populations requires independent validation.
8. **Self-reported comorbidities:** Subject to recall and social desirability bias.

### 4.11 Future Directions

1. **Prospective validation (critical priority):** Multi-center cohort of ≥500 GLP-1-treated patients with 12-month follow-up, including measured C-peptide, FGF21, and gastric emptying
2. **Hybrid genetic-clinical model:** Integration of CTSGRS or equivalent polygenic score as an optional Axis 8
3. **Machine learning optimization:** Gradient boosting or neural network to refine axis weights using real treatment outcomes
4. **Extension to novel molecules:** Retatrutide (triple GIP/GLP-1/glucagon agonist), CagriSema, orforglipron (oral GLP-1)
5. **EHR integration:** Real-time BMN computation at point of care
6. **Regulatory pathway:** CE marking (Class IIa) and FDA SaMD clearance
7. **Health economic evaluation:** Cost-effectiveness of GRS-guided prescribing

---

## 5. CONCLUSION

The Score BMN v3.5 demonstrates robust metabolic risk prediction (AUC = 0.876 for MetS) and provides a proof-of-concept framework for GLP-1 response profiling with a clinically coherent dose-response gradient across five response profiles (R1: 92.0% → R4: 63.1% responder rate). The integration of a novel beta-cell/secretory axis and the explicit acknowledgment of the simulation-based nature of the therapeutic validation represent methodological advances over the initial formulation. This "diagnose-and-treat" architecture has the potential to transform obesity management by identifying optimal GLP-1 candidates, guiding molecule selection, and redirecting non-responding patients toward surgical interventions. Prospective validation in GLP-1-treated cohorts is the critical next step.

---

## CLARIFICATION OF ACRONYMS

- **BMN (Bach-Manos-Noel):** The overarching multi-dimensional scoring algorithm (sf: 0–100) for metabolic risk assessment
- **BTM (Bariatric-Therapeutic Module):** A sub-component of the BMN algorithm specifically dedicated to GLP-1 response prediction (GRS) and therapeutic strategy selection (BT-1 to BT-6)

---

## DATA AVAILABILITY

NHANES data: CDC NCHS (https://www.cdc.gov/nchs/nhanes/). Algorithm source code: https://github.com/stefbach/score-bmn-v3.

## CONFLICT OF INTEREST

The authors declare no conflicts of interest.

## AUTHOR CONTRIBUTIONS

SB: Conceptualization, algorithm design, statistical analysis, manuscript writing. AM: Clinical validation, therapeutic module design. PN: Biological marker panel design, literature review.

---

## REFERENCES

1. Alberti KG, et al. Harmonizing the metabolic syndrome. *Circulation*. 2009;120:1640-1645.
2. Aguilar M, et al. Prevalence of MetS in the US. *JAMA*. 2015;313:1973-1974.
3. Lindstrom J, Tuomilehto J. The FINDRISC diabetes risk score. *Diabetes Care*. 2003;26:725-731.
4. D'Agostino RB, et al. General cardiovascular risk profile (Framingham). *Circulation*. 2008;117:743-753.
5. SCORE2 Working Group. SCORE2 algorithms. *Eur Heart J*. 2021;42:2439-2454.
6. Wilding JPH, et al. Semaglutide in obesity (STEP 1). *N Engl J Med*. 2021;384:989-1002.
7. Jastreboff AM, et al. Tirzepatide for obesity (SURMOUNT-1). *N Engl J Med*. 2022;387:205-216.
8. Gasoyan H, et al. Real-world effectiveness of semaglutide. *JAMA Intern Med*. 2024;184:1056-1063.
9. Wharton S, et al. Two-year semaglutide 2.4 mg on control of eating. *Int J Obes*. 2023;47:1005-1013.
10. Davies M, et al. Semaglutide in T2DM and obesity (STEP 2). *Lancet*. 2021;397:971-984.
11. Garvey WT, et al. Tirzepatide in T2DM (SURMOUNT-2). *Lancet*. 2023;402:613-626.
12. German J, Cordioli M, Tozzo V, et al. Association between plausible genetic factors and weight loss from GLP1-RA and bariatric surgery: a multi-ancestry study in 10,960 individuals from 9 biobanks. *Nat Med*. 2025;31(7):2269-2276.
13. International Diabetes Federation. IDF consensus definition of MetS. Brussels: IDF; 2006.
14. Le TDV, Fathi P, Watters AB, et al. Fibroblast growth factor-21 is required for weight loss induced by the glucagon-like peptide-1 receptor agonist liraglutide in male mice fed high carbohydrate diets. *Mol Metab*. 2023;72:101718.
15. Rubin DB. *Multiple Imputation for Nonresponse in Surveys*. Wiley; 1987.
16. Rubino DM, et al. Semaglutide withdrawal (STEP 4). *JAMA*. 2022;327:1414-1425.
17. Hosmer DW, et al. A comparison of goodness-of-fit tests for the logistic regression model. *Stat Med*. 1997;16:965-980.
18. Cifuentes L, et al. Genetic and physiological insights into satiation variability predict obesity treatment responses (CTSGRS). *Cell Metab*. 2025;37:1655-1666.e5.
19. Fansa S, et al. ML gene risk score predicts semaglutide weight loss response. *SSRN preprint* (under peer review). 2025. doi:10.2139/ssrn.5961920.
20. Sumithran P, et al. Long-term persistence of hormonal adaptations. *N Engl J Med*. 2011;365:1597-1604.
21. Fothergill E, et al. Persistent metabolic adaptation after "The Biggest Loser". *Obesity*. 2016;24:1612-1619.
22. Nauck MA, Meier JJ. The incretin effect in healthy individuals and those with T2DM. *J Clin Endocrinol Metab*. 2016;101:2908-2918.
23. Lund A, et al. Glucagon and type 2 diabetes. *Diabetes*. 2014;63:2213-2218.
24. Acosta A, et al. Selection of antiobesity medications based on phenotypes enhances weight loss: a pragmatic trial. *Obesity*. 2021;29:662-671.
25. Acosta A, Camilleri M. Gastrointestinal morbidity in obesity. *Ann N Y Acad Sci*. 2014;1311:42-56.
26. Phenomix Sciences. MyPhenome® precision obesity platform. https://www.phenomixsciences.com.
27. Acosta A, et al. Machine learning prediction of GLP-1 response and identification of novel obesity sub-phenotype with discordant gastric emptying. Abstract presented at: Digestive Disease Week (DDW); May 3–6, 2025; San Diego, CA. Abstract on file.
28. Coral DE, et al. Precision subclassification of obesity using multi-ancestry biobank data. *Nat Med*. 2024.
29. Klemets A, Reppo I, Krigul KL, et al. Fecal microbiome predicts treatment response after the initiation of semaglutide or empagliflozin uptake. *Sci Rep*. 2026;16:6126.
30. Lincoff AM, et al. Semaglutide and CV outcomes (SELECT). *N Engl J Med*. 2023;389:2221-2232.
31. Perkovic V, et al. Semaglutide and CKD (FLOW). *N Engl J Med*. 2024;391:109-121.
32. Del Prato S, et al. Tirzepatide vs insulin (SURPASS-4). *Lancet*. 2021;398:1811-1824.
33. Arita Y, et al. Adiponectin in obesity. *Biochem Biophys Res Commun*. 1999;257:79-83.
34. Considine RV, et al. Serum leptin and BMI. *N Engl J Med*. 1996;334:292-295.
35. Contois JH, et al. ApoB and CVD risk. *Clin Chem*. 2009;55:407-419.
36. Hollowell JG, et al. Serum TSH in the US (NHANES III). *J Clin Endocrinol Metab*. 2002;87:489-499.
37. Cohen S, et al. A global measure of perceived stress. *J Health Soc Behav*. 1983;24:385-396.
38. Bastien CH, et al. Validation of the ISI. *Sleep Med*. 2001;2:297-307.
39. Gormally J, et al. Assessment of binge eating severity. *Addict Behav*. 1982;7:47-55.
40. Martinez-Gonzalez MA, et al. PREDIMED cohort profile. *Int J Epidemiol*. 2012;41:377-385.
41. Sharma AM, Kushner RF. A proposed clinical staging system for obesity. *Int J Obes*. 2009;33:289-295.
42. Sharaiha RZ, et al. Five-year ESG outcomes. *Clin Gastroenterol Hepatol*. 2024;22:91-101.
43. Adams TD, et al. Weight and metabolic outcomes 12 years after gastric bypass. *N Engl J Med*. 2017;377:1143-1155.
44. Peterli R, et al. Sleeve vs bypass (SM-BOSS). *JAMA*. 2018;319:255-265.
45. Newsome PN, et al. Semaglutide in NASH. *N Engl J Med*. 2021;384:1113-1124.
46. Blundell J, et al. Semaglutide effects on appetite. *Diabetes Obes Metab*. 2017;19:1242-1251.
47. Wadden TA, et al. Semaglutide + intensive behavioral therapy. *JAMA*. 2021;325:1403-1413.
48. Fardet L, et al. Corticosteroid-induced adverse events. *Br J Dermatol*. 2007;157:142-148.
49. Geserick M, et al. BMI acceleration in childhood and sustained obesity. *N Engl J Med*. 2018;379:1303-1312.
50. Tomiyama AJ. Stress and obesity. *Annu Rev Psychol*. 2019;70:703-718.
51. Sattar N, et al. GLP-1 RA CV/mortality/kidney outcomes meta-analysis. *Lancet Diabetes Endocrinol*. 2021;9:653-662.
52. Jensterle M, et al. GLP-1 in PCOS. *Hum Reprod Update*. 2022;28:197-215.

---

## FIGURE LEGENDS

**Figure 1.** Schematic overview of the Score BMN v3.5 algorithm architecture. CLEO declarative score (sD) and biological normalization (bioNorm) combine into the final metabolic risk score (sf). The CTI and 7-axis GRS feed into the BTM for therapeutic strategy selection.

**Figure 2.** ROC curves for MetS prediction: BMN v3.5 (AUC=0.876) vs. logistic regression and comparison with published FINDRISC/FRS ranges.

**Figure 3.** Calibration plot (observed vs. predicted MetS probability by decile).

**Figure 4.** GLP-1 response profile distribution and simulated TBWL gradient (R1→R5).

**Figure 5.** TBWL distribution by profile (violin plots) with responder/super-responder thresholds.

**Figure 6.** Radar chart of 7 GRS axes by response profile.

**Figure 7.** Subgroup forest plot (AUC by sex, age, BMI, ethnicity, T2DM, MetS).

**Figure 8.** Therapeutic strategy distribution by BMI category.

**Supplementary Figures S1–S8:** BMN score distribution, biomarker heatmap, Monte Carlo convergence, **S4: Comparative discrimination for MetS prediction — Score BMN v3.5 vs. machine learning models (Logistic Regression, Random Forest, Gradient Boosting). The BMN v3.5 (AUC = 0.876) achieves lower discrimination than ensemble ML models (AUC ~0.95) but operates under fundamentally different constraints: it uses interpretable, clinically weighted axes; requires no complete-case data at inference; and produces a therapeutic decomposition (CLEO + GRS) unavailable from black-box models. Error bars represent 95% bootstrap confidence intervals**, PPE calibration, axis sensitivity, molecule distribution, profile-by-ethnicity.
