# Score BMN v3.5 — Evaluation Metabolique IA + BTM v2.0 + FNC v1.0

## Project Overview
- **Name**: Score BMN v3.5
- **Version**: 8.0 (AI+Geo+BTM+FNC)
- **Goal**: Questionnaire smartphone-first d'evaluation du risque metabolique et d'obesite avec intelligence artificielle adaptative, module therapeutique bariatrique et normalisation climatique
- **Architecture**: CLEO + BSD v4.9 + Bio v4.7.1 + BTM v2.0 + FNC v1.0

## URLs
- **Production**: https://score-bmn-v3.pages.dev
- **Dossier Technique**: https://score-bmn-v3.pages.dev/dossier
- **API Health**: https://score-bmn-v3.pages.dev/api/health
- **GitHub**: https://github.com/stefbach/score-bmn-v3
- **Backup**: https://www.genspark.ai/api/files/s/z1LxnU65

## Changelog recents

### v3.5 (4 mars 2026) — BTM v2.0 + FNC v1.0
- **10 MOD conformes au Dossier Maitre v3.5**:
  - MOD-01: Exclusivite IMC (PREMIER_VRAI du plus haut)
  - MOD-02: Colinearite DT2 severe (HbA1c>9) + CTI eleve (>55) = cumul +9 Bypass
  - MOD-03: Colonne BT-6 (Associations therapeutiques) ajoutee
  - MOD-04: ASA>=4 ESG corrige de -2 a +2
  - MOD-05: Delta normalise (score[p]-score[s])/score[p]*100, seuils 25%/10%
  - MOD-06: Valeurs manquantes = 0 (neutre), rapport obligatoire
  - MOD-07: GRS R4/R5 ESG corrige de +2 a +1
  - MOD-08: ATCD Ballon corrige de -3 a -2, distinction Orbera/Spatz3
  - MOD-09: Score normalise % par technique (score/max_possible*100)
  - MOD-10: Alarme "AUCUNE OPTION STANDARD" si score primaire <= 0
- **Matrice BTM 27 facteurs x 6 techniques** (BT-1 a BT-6) complete
- **BT-6 Associations**: 5 sous-categories (ESG+GLP-1, Bypass+Sema, GLP1+SGLT2+Met, Ballon+GLP1, ESG+BupNal)
- **FNC v1.0 Normalisation Climatique Koppen**: 6 zones (Z1 Tropical humide a Z6 Tropical sec)
  - Formule: FNC_eff = 1 - (1-FNC) * min(1, mois_residence/12)
  - AQI non normalise (pollution = meme impact partout)
- **12 profils ethniques**: +3 (Metis, Arabe/MENA, Autre) avec multiplicateurs cvR (MultCV)
- **3 prompts Claude AI v3.5** enrichis (BTM v2.0, FNC, BT-6, MOD-01 a MOD-10)
- **Dossier technique**: 25 sections (+ chapitre XXV FNC)
- **Confiance**: INDICATION CLAIRE (>=25%), DISCUSSION PATIENT (10-24%), DECISION PLURIDISCIPLINAIRE (<10%)

### v3.2 (3 mars 2026) — Module BTM
- Module Bariatric & Therapeutic Module (6 techniques, matrice decisionnelle 14 variables)
- BES-16 (Binge Eating Scale, 16 items, score 0-46, seuils 17/27)
- Algorithme btm_decision() avec safeguards (BES >= 27, ASA >= 4, ATCD chirurgicaux)
- Section 11 RTP (Recommandation Therapeutique Personnalisee) dans le resultat final
- 3 prompts Claude AI enrichis pour analyse/interpretation/rapport BTM

### v3.1.1 (3 mars 2026) — IR occulte
- IR occulte retiree des comorbidites declaratives (13 declaratives)
- Auto-detection via TG/HDL > 3.5 dans module biologique

### v3.1 (2 mars 2026) — Dyslipidemie
- Dyslipidemie ajoutee comme 14e comorbidite (3 sous-types)
- Corrections bioNorm (LDL x1.35 statines, TG x1.30 fibrates, ApoB poids 2.5)

## Features completes

### BTM v2.0 — Module Bariatrique & Therapeutique (v3.5)
- **Scoring matriciel**: 27 facteurs x 6 techniques (BT-1 Ballon, BT-2 ESG, BT-3 Sleeve, BT-4 Bypass, BT-5 GLP-1, BT-6 Associations)
- **10 MOD** conformes au Dossier Maitre v3.5
- **BT-6 Associations**: 5 sous-categories avec efficacite (TBWL, DT2 remission, grade evidence)
- **Confiance delta normalise**: 3 niveaux (25%+/10-24%/<10%)
- **Score normalise %**: score_pct par technique
- **Garde-fous**: BES>=27 CI, ASA>=4 restriction, ATCD Sleeve->Bypass
- **MOD-08**: Distinction Orbera (6 mois) vs Spatz3 (12 mois, ajustable)

### FNC v1.0 — Normalisation Climatique Koppen (v3.5)
- **6 zones**: Z1 Tropical humide, Z2 Desert chaud, Z3 Mediterraneen, Z4 Tempere reference, Z5 Continental, Z6 Tropical sec
- **Acclimatation progressive**: FNC_eff = 1 - (1-FNC) * min(1, mois/12)
- **AQI non normalise**: pollution = impact identique partout
- **Integration Layer A Exposome**: temp x fncEff_t, UV x fncEff_u

### Intelligence Artificielle (Claude Sonnet 4)
- Analyse adaptative sur 5 ecrans cles
- Interpretation finale personnalisee avec recommandations
- Rapport strategique complet pour le medecin traitant
- Integration BTM v3.5 + FNC v1.0 dans les 3 prompts

### Questionnaire (20 ecrans)
1. Accueil
2. Date de naissance
3. Sexe biologique
4. Origine ethnique (12 groupes x 12 parametres dont cvR)
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
15. Comorbidites (13 declaratives + 1 auto-detectee)
16. Score declaratif
17. Biologie optionnelle (15 biomarqueurs, panels P5/P10/P15)
18. BTM v3.5 questionnaire (GERD, ASA, ATCD+type, NASH, CV, preference, FNC zone, residence)
19. BES-16 (Binge Eating Scale)
20. Resultat final (BMN-T, Markov, CTI, GRI, SII, GLP-1, BTM/RTP, IA)

### Algorithme BMN v3.5
- **BMN-C** /150 — 17 domaines cliniques
- **BMN-K** /50 — 13+1 comorbidites avec OR/HR
- **BMN-B** /100 — 15 biomarqueurs z-score normalises
- **BMN-T** /200 — Ponderation dynamique (wC=0.55, wB=0.30, wK=0.15)
- **CTI** — Index de Chronicisation
- **GRI** — Index Reponse GLP-1
- **SII** — Score Inflammatoire Indirect (9 criteres)
- **Markov** — Projection 10 ans avec matrice de transition modulee
- **BTM v2.0** — Scoring matriciel 27x6, MOD-01 a MOD-10
- **FNC v1.0** — Normalisation climatique Koppen (6 zones)
- Multiplicateurs ethniques (12 groupes)
- Score Exposome (0-45) = 30 x (0.7*A + 0.5*B + 0.3*C) / 1.5 x (1 + 0.15 x bInflam)

### References
93+ references + 62 etudes BTM : OMS, IDF 2006, ADA 2024, ESC/EAS 2020, STEP 1-5, SURMOUNT 1-4, STAMPEDE, SM-BOSS, MERIT, SOS Study, etc.

## Tech Stack
- **Backend**: Hono + TypeScript (Cloudflare Workers)
- **Frontend**: Vanilla JS + CSS (CDN-free, mobile-first)
- **AI**: Claude Sonnet 4 (Anthropic API)
- **APIs**: Open-Meteo (air + weather), Nominatim (geocoding)
- **Build**: Vite (dist: 220 KB)
- **Deploy**: Cloudflare Pages (wrangler)

## Data Architecture
- **Cote client**: State objet JS avec tous les scores en temps reel
- **Cote serveur**: Routes API pour Claude AI (cle securisee server-side)
- **APIs externes**: Open-Meteo (gratuit), Nominatim/OSM (gratuit)
- **Stockage**: Aucun stockage persistant (client-side only)

## Deployment
- **Platform**: Cloudflare Pages
- **Project**: score-bmn-v3
- **Status**: Active v8.0
- **Last Updated**: 2026-03-04
