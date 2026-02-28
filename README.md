# Score BMN v2.0 — Évaluation Métabolique IA

## Project Overview
- **Name**: Score BMN v2.0
- **Version**: 5.0 (AI-Powered)
- **Goal**: Questionnaire smartphone-first d'évaluation du risque métabolique et d'obésité avec intelligence artificielle adaptative
- **Architecture**: ABCKO+ (BMN-C Clinique + BMN-K Comorbidités + BMN-B Biologie + CTI + GRI)

## URLs
- **Production**: https://3000-ib4jjzlrwtfls79jikkzg-cbeee0f9.sandbox.novita.ai
- **API Health**: /api/health
- **AI Analyze**: POST /api/ai/analyze
- **AI Interpret**: POST /api/ai/interpret

## Features Completed

### Intelligence Artificielle
- ✅ **Claude AI (Sonnet 4)** intégré côté serveur (clé API sécurisée)
- ✅ Analyse adaptative sur 5 écrans clés (famille, exposome, activité, mental, comorbidités)
- ✅ Interprétation finale personnalisée IA avec recommandations

### APIs Géographiques (Automatiques)
- ✅ **GPS automatique** au chargement de l'écran environnement
- ✅ **Open-Meteo Air Quality** (CAMS/Copernicus) — AQI US, Europe, PM2.5, PM10, NO₂, O₃, SO₂, CO, UV
- ✅ **Open-Meteo Weather** — Température, ressenti, humidité, vent
- ✅ **Nominatim/OSM** — Géocodage et reverse geocoding
- ✅ **Haversine** — Calcul automatique distance domicile-travail
- ✅ Score exposome air auto-calculé depuis AQI
- ✅ Impact température automatique

### Questionnaire (17 écrans)
1. Accueil
2. Date de naissance (âge auto)
3. Sexe biologique
4. Origine ethnique (9 groupes × 8 paramètres)
5. Poids & Taille (IMC + seuils ethniques)
6. Tour de taille (WHtR + seuils IDF)
7. Antécédents familiaux
8. Environnement géographique (GPS + API auto)
9. Exposome environnemental (10 facteurs)
10. Profil professionnel (10 dimensions + distance auto)
11. Alimentation (DQI-BMN)
12. Activité physique (IPAQ)
13. Sommeil & substances
14. Santé mentale (PSS-10, PHQ-9, BES)
15. Comorbidités (13 items: maladies + phénotypes + traitements)
16. Biologie optionnelle (15 biomarqueurs, panels P5/P10/P15)
17. Résultat final (BMN-T/200, Markov, CTI, GRI, SII, stratégie, IA)

### Algorithme BMN v2.0 (Complet)
- ✅ **BMN-C** /150 — 17 domaines cliniques
- ✅ **BMN-K** /50 — 13 comorbidités avec OR/HR
- ✅ **BMN-B** /100 — 15 biomarqueurs z-score normalisés
- ✅ **BMN-T** /200 — Pondération dynamique (w_C=0.55, w_B=0.30, w_K=0.15)
- ✅ **CTI** (Index de Chronicisation) — 7 coefficients γ × amplificateurs
- ✅ **GRI** (Index Réponse GLP-1) — Facteurs δ favorables / ε défavorables
- ✅ **SII** (Score Inflammatoire Indirect) — 9 critères
- ✅ **Markov** — Projection 10 ans avec matrice de transition modulée
- ✅ Multiplicateurs ethniques (9 groupes)
- ✅ Rétro-validation biologie/comorbidités
- ✅ Safety floors et comorbidity floor

### Références Internationales
OMS · IDF 2006 · ADA 2024 · FINDRISC · IPAQ · PHQ-9 · PSS-10 · ISI · BES · AUDIT-C · Lancet 2016 (Global BMI Mortality) · BMJ Open 2016 (WHtR) · Lancet 2010 (MetS) · NEJM 1995 (Leibel) · NEJM 2011 (Sumithran) · SCORE2/Framingham · INTERHEART · DPP · DiaRem · Biswas 2015 · Cappuccio 2008 · Aubin 2012 · Lane 2024 · CAMS/Copernicus · Karasek

## Tech Stack
- **Backend**: Hono + TypeScript (Cloudflare Workers compatible)
- **Frontend**: Vanilla JS + CSS (CDN-free, mobile-first)
- **AI**: Claude Sonnet 4 (Anthropic API)
- **APIs**: Open-Meteo (air + weather), Nominatim (geocoding)
- **Build**: Vite
- **Deploy**: Wrangler / PM2

## Data Architecture
- **Côté client**: State objet JS avec tous les scores en temps réel
- **Côté serveur**: Routes API pour Claude AI (clé sécurisée)
- **APIs externes**: Open-Meteo (gratuit, sans clé), Nominatim/OSM (gratuit)

## User Guide
1. Ouvrez l'URL sur smartphone
2. Suivez les écrans un par un (swipe ou boutons)
3. La géolocalisation GPS se lance automatiquement
4. L'IA Claude analyse votre profil sur les écrans clés
5. Le résultat final affiche le score BMN-T/200 avec interprétation IA

## Deployment
- **Platform**: Cloudflare Pages / Sandbox
- **Status**: ✅ Active v5.0
- **Last Updated**: 2026-02-28
