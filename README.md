# Score BMN v2.0 Enrichi — Architecture ABCKO+

## Vue d'ensemble
- **Nom** : Score BMN v2.0 (Bach-Manos-Noel)
- **Objectif** : Algorithme clinique complet de scoring metabolique pour l'evaluation du risque d'obesite et de complications metaboliques
- **Architecture** : ABCKO+ (Anthropometrie, Biologie, Comorbidites, Koefficients, Ordonnance + Exposome + Professionnel)

## URL
- **Sandbox** : https://3000-ib4jjzlrwtfls79jikkzg-cbeee0f9.sandbox.novita.ai

## Fonctionnalites Implementees (8 etapes)

### Etape 1 : Identite & Anthropometrie
- Ethnie (9 groupes x 8 multiplicateurs)
- IMC auto-calcule, Tour de taille, WHtR
- Histoire familiale (obesite parentale, enfance, DT2)
- Cycles Yo-Yo ponderaux
- Resume anthropometrique visuel avec seuils ethniques

### Etape 2 : Exposome Environnemental (0-47 pts)
- **API Qualite de l'Air** (WAQI temps reel) : AQI, PM2.5, PM10, NO2, O3, SO2, CO
- Geolocalisation GPS ou recherche par ville
- Qualite de l'eau (source, chlore)
- Habitat (route, industrie, espaces verts, logement)
- Pollution sonore (diurne + nocturne)
- Perturbateurs endocriniens (alimentaires, cosmetiques, professionnels)
- Pollution lumineuse (ecrans)
- Precarite socio-economique (EPICES)
- Desert alimentaire
- Multiplicateur inflammatoire global calcule

### Etape 3 : Profil Professionnel (0-50 pts)
- Situation professionnelle (actif, chomage, invalide, retraite)
- Type de travail (sedentaire/actif, 7 niveaux)
- Distance domicile-travail + mode transport + temps trajet
- Horaires (jour, nuit, poste 3x8, gardes)
- Stress Karasek simplifie (demande x latitude x soutien)
- Restauration au travail
- Posture dominante
- Exposition toxiques professionnels
- Impact retraite (activite, sedentarite, isolement)
- Synthese visuelle avec contribution au BMN-C

### Etape 4 : Comportements & Mode de Vie (0-60 pts)
- DQI-BMN alimentation detaillee (ultra-transformes, sucres, fibres, portions, repas)
- IPAQ activite physique par type (cardio, muscu, marche)
- Temps assis quotidien
- Sommeil duree + ISI (Insomnia Severity Index)
- Tabac (5 niveaux)
- Alcool AUDIT-C (frequence + quantite)

### Etape 5 : Sante Mentale (0-28 pts)
- PSS-10 (stress percu, 0-40)
- PHQ-9 (depression, 0-27)
- BES (hyperphagie, 0-8)
- Synthese visuelle avec SII auto-calcule

### Etape 6 : BMN-K Comorbidites (0-50 pts)
- 8 maladies etablies (DT2, pre-diabete, HTA, SAOS, SOPK, NAFLD, hypothyroidie, MetS)
- 2 phenotypes metaboliques (MONW, IR occulte)
- 3 traitements aggravants (corticoides, antidepresseurs, depression)
- Comorbidity Floor (K > 30 -> BMN-T >= 40)

### Etape 7 : BMN-B Biologie (0-100 pts)
- Classification intermediaire C+K automatique
- Bilan prescrit (Tier 2A/2B/2C) selon classification
- 15 biomarqueurs z-score normalises avec poids
- 6 regles de retro-validation en temps reel

### Etape 8 : BMN-T Score Final (0-200 pts)
- Ponderation dynamique tri-source (w_C/w_B/w_K)
- Bascule automatique si ecart Bio-Clinique > 20
- BioFloor standard + urgence
- Comorbidity SuperFloor
- Projection Markov 6 etats a 10 ans
- CTI (7 composantes gamma + amplificateurs comorbidites)
- GRI (8 predicteurs favorables + 4 defavorables)
- Plan therapeutique personnalise
- Impact exposome + professionnel detaille

## Architecture Technique
- **Backend** : Hono (Cloudflare Workers)
- **Frontend** : Vanilla JS + CSS (CDN fonts)
- **API externe** : WAQI (World Air Quality Index)
- **Calculs** : 100% client-side pour la confidentialite patient
- **Responsive** : Mobile, tablet, desktop
- **Impression** : CSS print optimise

## Algorithme — Specifications
- BMN_T = w_C * C_norm + w_B * Bio_norm + w_K * K_norm
- w_C = 0.55, w_B = 0.30, w_K = 0.15 (base)
- Gap > 20 : bascule w_B jusqu'a 0.60
- CTI = Sum(gamma_j * Z_j) * max(amplifier)
- GRI = Sum(delta_k * F_k) - Sum(epsilon_k * U_k)
- Markov : P_ij = P_ij(base) * exp(theta_BMN * T/100) * exp(theta_K * K/100)
- Classification : FAIBLE(0-40), MODERE(41-80), ELEVE(81-120), TRES ELEVE(121-160), CRITIQUE(>160)

## Deploiement
- **Plateforme** : Cloudflare Pages
- **Stack** : Hono + TypeScript + Vite
- **Statut** : Actif
- **Derniere MAJ** : 2026-02-28
