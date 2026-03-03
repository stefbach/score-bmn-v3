# Score BMN v3.2 — Evaluation Metabolique IA + Module BTM

## Project Overview
- **Name**: Score BMN v3.2
- **Version**: 7.0 (AI+Geo+BTM)
- **Goal**: Questionnaire smartphone-first d'evaluation du risque metabolique et d'obesite avec intelligence artificielle adaptative et module therapeutique bariatrique
- **Architecture**: CLEO + BSD v4.9 + Bio v4.7.1 + BTM v1.0

## URLs
- **Production**: https://score-bmn-v3.pages.dev
- **Dossier Technique**: https://score-bmn-v3.pages.dev/dossier
- **Dossier Scientifique**: https://score-bmn-v3.pages.dev/dossier-scientifique
- **API Health**: https://score-bmn-v3.pages.dev/api/health
- **GitHub**: https://github.com/stefbach/score-bmn-v3

## Changelog recents

### v3.2 (3 mars 2026) — Module BTM
- Module Bariatric & Therapeutic Module (6 techniques, matrice decisionnelle 14 variables)
- BES-16 (Binge Eating Scale, 16 items, score 0-46, seuils 17/27)
- Algorithme btm_decision() avec safeguards (BES >= 27, ASA >= 4, ATCD chirurgicaux)
- Section 11 RTP (Recommandation Therapeutique Personnalisee) dans le resultat final
- 3 prompts Claude AI enrichis pour analyse/interpretation/rapport BTM
- Dossier technique : section 28 (BTM v3.2)
- Dossier scientifique : chapitre XXIV (62 etudes, >180 000 patients)

### v3.1.1 (3 mars 2026) — IR occulte
- IR occulte retiree des comorbidites declaratives (13 declaratives)
- Auto-detection via TG/HDL > 3.5 dans module biologique
- Badge "IR OCCULTE DETECTEE" dans l'affichage bioNorm

### v3.1 (2 mars 2026) — Dyslipidemie
- Dyslipidemie ajoutee comme 14e comorbidite (3 sous-types)
- Corrections bioNorm (LDL x1.35 statines, TG x1.30 fibrates, ApoB poids 2.5)
- GRS/GRI/CTI adaptes, 5 alertes retro-diagnostiques dyslipidemie

## Features completes

### Intelligence Artificielle (Claude Sonnet 4)
- Analyse adaptative sur 5 ecrans cles
- Interpretation finale personnalisee avec recommandations
- Rapport strategique complet pour le medecin traitant
- Integration BTM v3.2 : analyse indication bariatrique dans les 3 prompts

### Module BTM v3.2 (NOUVEAU)
- **6 techniques** : BT-1 Ballon (Orbera/Spatz3), BT-2 ESG, BT-3 Sleeve, BT-4 Bypass RYGB, BT-5 GLP-1 RA, BT-6 Associations
- **Matrice efficacite** : TBWL 10-34%, EWL 25-66%, remission T2D 29-92%
- **14 variables d'entree** : IMC, SF, CTI, GRS, HbA1c, GERD, SOPK, BES, stress, dyslipidemie, NASH, ASA, ATCD chirurgicaux, preference patient
- **Safeguards** : BES >= 27 contraindication, ASA >= 4 recommandation specifique, ATCD sleeve -> bypass revision
- **Synergies** : ESG+GLP-1 (+6-9% TBWL), Bypass+Semaglutide (92% remission T2D)
- **BES-16** : 16 items, score 0-46, seuils modere (17), severe (27)

### APIs Geographiques (Automatiques)
- GPS automatique + Open-Meteo Air Quality + Weather
- Nominatim/OSM geocodage + Haversine distance domicile-travail
- Score exposome air et temperature automatiques

### Questionnaire (20 ecrans)
1. Accueil
2. Date de naissance
3. Sexe biologique
4. Origine ethnique (9 groupes x 8 parametres)
5. Poids & Taille (IMC + seuils ethniques)
6. Tour de taille (WHtR + seuils IDF)
7. Antecedents familiaux
8. Environnement geographique (GPS + API auto)
9. Profil professionnel (Karasek)
10. Nutrition detaillee (DQI-BMN)
11. Activite physique (IPAQ)
12. Sommeil & substances
13. Stress (PSS-10)
14. Depression (PHQ-9)
15. Comorbidites v3.1.1 (13 declaratives + 1 auto-detectee)
16. Score declaratif
17. Biologie optionnelle (15 biomarqueurs, panels P5/P10/P15)
18. BTM questionnaire (GERD, ASA, ATCD, NASH, preference)
19. BES-16 (Binge Eating Scale)
20. Resultat final (BMN-T, Markov, CTI, GRI, SII, GLP-1, BTM/RTP, IA)

### Algorithme BMN v3.2
- **BMN-C** /150 — 17 domaines cliniques
- **BMN-K** /50 — 13+1 comorbidites avec OR/HR (ir_occ auto-detectee)
- **BMN-B** /100 — 15 biomarqueurs z-score normalises + corrections dyslipidemie
- **BMN-T** /200 — Ponderation dynamique (wC=0.55, wB=0.30, wK=0.15)
- **CTI** — Index de Chronicisation (7 coefficients gamma x amplificateurs)
- **GRI** — Index Reponse GLP-1 (delta favorables / epsilon defavorables)
- **SII** — Score Inflammatoire Indirect (9 criteres)
- **Markov** — Projection 10 ans avec matrice de transition modulee
- **BTM** — Module Therapeutique Bariatrique (btm_decision, 14 variables, 6 techniques)
- Multiplicateurs ethniques (9 groupes)
- Retro-validation biologie/comorbidites (7+ alertes dont 5 dyslipidemie)
- Safety floors et comorbidity floor

### Comorbidites (13 declaratives + 1 auto)
| ID | Nom | Type |
|---|---|---|
| dt2 | Diabete Type 2 | Declaratif |
| predmt | Pre-diabete | Declaratif |
| hta | HTA etablie | Declaratif |
| saos | SAOS | Declaratif |
| sopk | SOPK | Declaratif |
| nafld | NAFLD/Steatose | Declaratif |
| hypo | Hypothyroidie | Declaratif |
| mets | Syndrome metabolique | Declaratif |
| monw | Phenotype MONW | Declaratif |
| cort | Corticosteroides > 3 mo | Declaratif |
| adep | Antidepresseurs obesogenes | Declaratif |
| dep | Depression traitee | Declaratif |
| dyslipi | Dyslipidemie | Declaratif |
| ir_occ | IR occulte | **Auto-detecte** (TG/HDL > 3.5) |

### References
93+ references : OMS, IDF 2006, ADA 2024, ESC/EAS 2020, CTT 2010, Sniderman 2019, McLaughlin 2005, STEP 1, SURMOUNT-1, Genco 2013, Lopez-Nava 2023, Peterli 2018, Adams 2017, Schauer 2017, etc.

## Tech Stack
- **Backend**: Hono + TypeScript (Cloudflare Workers)
- **Frontend**: Vanilla JS + CSS (CDN-free, mobile-first)
- **AI**: Claude Sonnet 4 (Anthropic API)
- **APIs**: Open-Meteo (air + weather), Nominatim (geocoding)
- **Build**: Vite
- **Deploy**: Cloudflare Pages (wrangler)

## Data Architecture
- **Cote client** : State objet JS avec tous les scores en temps reel
- **Cote serveur** : Routes API pour Claude AI (cle securisee)
- **APIs externes** : Open-Meteo (gratuit), Nominatim/OSM (gratuit)
- **Stockage** : Aucun stockage persistant (client-side only)

## Deployment
- **Platform**: Cloudflare Pages
- **Project**: score-bmn-v3
- **Status**: Active v7.0
- **Branches**: main (production), v3.2-btm, v3.1-dyslipidemie
- **Last Updated**: 2026-03-03
