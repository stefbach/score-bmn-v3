"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.0 — VALIDATION SUR COHORTE SYNTHÉTIQUE MESA
═══════════════════════════════════════════════════════════════════════════

Génère une cohorte synthétique de 6 814 participants fidèle aux
caractéristiques publiées de MESA (Multi-Ethnic Study of Atherosclerosis)
et exécute la validation complète du SCORE BMN v3.0.

Sources des distributions :
  - Malik S et al. (2009) Atherosclerosis 205:599–605 (PMC2677914)
  - Lin SX et al. (2011) Metab Syndr Relat Disord 9:145–151 (PMC3125569)
  - Rodriguez CJ et al. (2023) Circulation 146:229–239 (PMC9937428)
  - Bradley RD et al. (2013) Biomark Med 7:709–721 (PMC4106917)
  - Bradley RD et al. (2014) Atherosclerosis 233:387–393 (PMC4000064)
  - Lakoski SG et al. (2006) Am Heart J 152:593–598
  - Bild DE et al. (2002) Am J Epidemiol 156:871–881

Cohorte MESA (Exam 1, 2000-2002) :
  N = 6 814 adultes 45–84 ans, sans MCV clinique
  38% White, 28% African American, 22% Hispanic, 12% Chinese American
  53% femmes, 47% hommes
"""

import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from scipy import stats
import os
import sys

# Réutiliser les fonctions du chargeur BioLINCC existant
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from biolincc_data_loader import (
    compute_outcomes,
    run_mice_imputation,
    apply_bmn_score,
    run_validation,
    ETHNIC_PROFILES,
    BIOMARKERS,
)

np.random.seed(42)


# ═══════════════════════════════════════════════════════════════════════
# PARAMÈTRES DÉMOGRAPHIQUES MESA (publiés)
# ═══════════════════════════════════════════════════════════════════════

MESA_N = 6814

# Répartition ethnique et sexe (Bild 2002, Rodriguez 2023)
MESA_GROUPS = {
    # (eth, sex): (N, proportion)
    ('eu', 'M'): {'n': 1215, 'pct': 0.178},   # White men
    ('eu', 'F'): {'n': 1377, 'pct': 0.202},   # White women
    ('ea', 'M'): {'n': 382,  'pct': 0.056},   # Chinese men
    ('ea', 'F'): {'n': 421,  'pct': 0.062},   # Chinese women
    ('af', 'M'): {'n': 884,  'pct': 0.130},   # African American men
    ('af', 'F'): {'n': 1009, 'pct': 0.148},   # African American women
    ('eu_hisp', 'M'): {'n': 660, 'pct': 0.097},  # Hispanic men (coded eu in MESA)
    ('eu_hisp', 'F'): {'n': 866, 'pct': 0.127},  # Hispanic women
}

# ═══════════════════════════════════════════════════════════════════════
# DISTRIBUTIONS PAR SOUS-GROUPE (mean, SD)
# Sources: Malik 2009, Lin 2011, Rodriguez 2023, Bradley 2013-2014
# ═══════════════════════════════════════════════════════════════════════

# Clé: (eth_group, sex) → dict de biomarqueurs {nom: (mean, sd)}
# Unités : glucose mg/dL, insulin µU/mL, lipids mg/dL, waist cm, BMI kg/m²
# CRP mg/L, GGT U/L, AST U/L, uric acid mg/dL, HbA1c %

DISTRIBUTIONS = {
    # ── WHITE MEN ──
    ('eu', 'M'): {
        'age':      (62.4, 10.3),
        'bmi':      (27.7, 3.9),
        'waist':    (100.5, 11.2),
        'height_cm':(176.0, 7.0),
        'glucose_mgdl': (90.1, 9.8),
        'insulin_uU':   (5.4, 4.0),   # median 4.5, IQR 3.1-7.2 → lognormal
        'hba1c':    (5.5, 0.5),
        'crphs':    (1.6, 2.5),   # geometric mean ~1.43, skewed
        'tg_mgdl':  (129.6, 77.5),
        'hdl_mgdl': (45.5, 12.1),
        'ldl_mgdl': (124.4, 29.4),
        'tc_mgdl':  (203.2, 33.0),
        'asat':     (26.0, 10.0),
        'ggt':      (35.5, 22.0),   # median 35.5, IQR 28.6-46.6
        'urate_mgdl': (6.3, 1.4),
        'sbp':      (123.5, 20.4),
        'dbp':      (70.2, 10.0),
    },
    # ── WHITE WOMEN ──
    ('eu', 'F'): {
        'age':      (62.4, 10.3),
        'bmi':      (27.3, 5.7),
        'waist':    (94.4, 15.9),
        'height_cm':(162.0, 6.5),
        'glucose_mgdl': (85.8, 9.7),
        'insulin_uU':   (4.8, 3.5),
        'hba1c':    (5.5, 0.5),
        'crphs':    (2.5, 3.5),   # women have higher CRP
        'tg_mgdl':  (129.2, 75.7),
        'hdl_mgdl': (59.2, 15.7),
        'ldl_mgdl': (124.4, 29.4),
        'tc_mgdl':  (203.2, 33.0),
        'asat':     (23.0, 8.0),
        'ggt':      (29.1, 16.0),
        'urate_mgdl': (4.9, 1.3),
        'sbp':      (123.5, 20.4),
        'dbp':      (70.2, 10.0),
    },
    # ── CHINESE MEN ──
    ('ea', 'M'): {
        'age':      (61.8, 10.4),
        'bmi':      (24.5, 3.0),
        'waist':    (88.5, 9.0),
        'height_cm':(168.0, 6.5),
        'glucose_mgdl': (91.6, 10.0),
        'insulin_uU':   (5.0, 3.5),
        'hba1c':    (5.6, 0.5),
        'crphs':    (1.0, 1.5),   # Chinese have lowest CRP
        'tg_mgdl':  (142.7, 84.7),
        'hdl_mgdl': (48.0, 11.5),
        'ldl_mgdl': (120.5, 28.4),
        'tc_mgdl':  (198.1, 31.5),
        'asat':     (26.0, 10.0),
        'ggt':      (32.0, 20.0),
        'urate_mgdl': (6.1, 1.3),
        'sbp':      (124.6, 21.6),
        'dbp':      (72.0, 10.3),
    },
    # ── CHINESE WOMEN ──
    ('ea', 'F'): {
        'age':      (61.8, 10.4),
        'bmi':      (23.1, 3.5),
        'waist':    (84.7, 10.5),
        'height_cm':(156.0, 5.5),
        'glucose_mgdl': (91.6, 10.0),
        'insulin_uU':   (4.6, 3.0),
        'hba1c':    (5.6, 0.5),
        'crphs':    (1.2, 2.0),
        'tg_mgdl':  (142.7, 84.7),
        'hdl_mgdl': (52.0, 13.5),
        'ldl_mgdl': (120.5, 28.4),
        'tc_mgdl':  (198.1, 31.5),
        'asat':     (22.0, 7.5),
        'ggt':      (25.0, 14.0),
        'urate_mgdl': (4.5, 1.2),
        'sbp':      (124.6, 21.6),
        'dbp':      (72.0, 10.3),
    },
    # ── AFRICAN AMERICAN MEN ──
    ('af', 'M'): {
        'age':      (61.7, 10.2),
        'bmi':      (28.4, 4.6),
        'waist':    (99.6, 12.5),
        'height_cm':(175.5, 7.0),
        'glucose_mgdl': (91.3, 10.9),
        'insulin_uU':   (5.8, 4.5),
        'hba1c':    (5.8, 0.7),   # Higher in AA
        'crphs':    (2.1, 3.0),
        'tg_mgdl':  (104.8, 64.1),   # Lower TG in AA
        'hdl_mgdl': (47.4, 12.8),
        'ldl_mgdl': (121.9, 33.0),
        'tc_mgdl':  (195.8, 36.3),
        'asat':     (27.0, 11.0),
        'ggt':      (38.0, 25.0),
        'urate_mgdl': (6.8, 1.5),   # Higher in AA
        'sbp':      (131.7, 21.6),   # Higher BP in AA
        'dbp':      (74.5, 10.2),
    },
    # ── AFRICAN AMERICAN WOMEN ──
    ('af', 'F'): {
        'age':      (61.7, 10.2),
        'bmi':      (30.9, 6.4),    # Higher BMI in AA women
        'waist':    (100.1, 15.9),
        'height_cm':(163.0, 6.5),
        'glucose_mgdl': (89.3, 10.3),
        'insulin_uU':   (6.5, 5.0),
        'hba1c':    (5.8, 0.7),
        'crphs':    (3.2, 4.0),
        'tg_mgdl':  (95.9, 45.8),
        'hdl_mgdl': (57.9, 15.9),
        'ldl_mgdl': (121.9, 33.0),
        'tc_mgdl':  (195.8, 36.3),
        'asat':     (23.0, 8.0),
        'ggt':      (30.0, 18.0),
        'urate_mgdl': (5.2, 1.4),
        'sbp':      (131.7, 21.6),
        'dbp':      (74.5, 10.2),
    },
    # ── HISPANIC MEN ──
    ('eu_hisp', 'M'): {
        'age':      (60.6, 10.4),
        'bmi':      (28.8, 4.3),
        'waist':    (100.5, 11.5),
        'height_cm':(170.0, 7.0),
        'glucose_mgdl': (90.9, 10.9),
        'insulin_uU':   (6.5, 4.5),   # Higher insulin in Hispanics
        'hba1c':    (5.7, 0.6),
        'crphs':    (2.5, 3.5),
        'tg_mgdl':  (157.1, 101.1),   # Higher TG in Hispanics
        'hdl_mgdl': (44.0, 11.5),     # Lower HDL
        'ldl_mgdl': (125.1, 30.9),
        'tc_mgdl':  (203.1, 35.7),
        'asat':     (27.0, 11.0),
        'ggt':      (38.0, 25.0),
        'urate_mgdl': (6.5, 1.5),
        'sbp':      (126.7, 21.9),
        'dbp':      (71.6, 10.1),
    },
    # ── HISPANIC WOMEN ──
    ('eu_hisp', 'F'): {
        'age':      (60.6, 10.4),
        'bmi':      (29.2, 5.2),
        'waist':    (98.3, 13.5),
        'height_cm':(157.0, 6.0),
        'glucose_mgdl': (90.9, 10.9),
        'insulin_uU':   (6.8, 5.0),
        'hba1c':    (5.7, 0.6),
        'crphs':    (3.4, 4.5),
        'tg_mgdl':  (157.1, 101.1),
        'hdl_mgdl': (52.2, 14.0),
        'ldl_mgdl': (125.1, 30.9),
        'tc_mgdl':  (203.1, 35.7),
        'asat':     (23.0, 8.5),
        'ggt':      (28.0, 16.0),
        'urate_mgdl': (4.8, 1.3),
        'sbp':      (126.7, 21.9),
        'dbp':      (71.6, 10.1),
    },
}

# Prévalences de comorbidités par ethnie (MESA publications)
COMORBIDITY_PREV = {
    # (eth, sex) → {diabetes, hta, smoking_status}
    ('eu', 'M'):      {'diabetes': 0.060, 'hta': 0.38, 'smoker_current': 0.12, 'smoker_past': 0.40},
    ('eu', 'F'):      {'diabetes': 0.060, 'hta': 0.36, 'smoker_current': 0.10, 'smoker_past': 0.32},
    ('ea', 'M'):      {'diabetes': 0.131, 'hta': 0.36, 'smoker_current': 0.10, 'smoker_past': 0.30},
    ('ea', 'F'):      {'diabetes': 0.131, 'hta': 0.34, 'smoker_current': 0.02, 'smoker_past': 0.10},
    ('af', 'M'):      {'diabetes': 0.176, 'hta': 0.55, 'smoker_current': 0.22, 'smoker_past': 0.32},
    ('af', 'F'):      {'diabetes': 0.176, 'hta': 0.55, 'smoker_current': 0.16, 'smoker_past': 0.25},
    ('eu_hisp', 'M'): {'diabetes': 0.177, 'hta': 0.38, 'smoker_current': 0.16, 'smoker_past': 0.35},
    ('eu_hisp', 'F'): {'diabetes': 0.177, 'hta': 0.38, 'smoker_current': 0.10, 'smoker_past': 0.22},
}

# Corrélations inter-biomarqueurs (approximations physiologiques MESA)
# Structure de corrélation pour une génération multivariée réaliste
CORR_VARS = ['bmi', 'waist', 'glucose_mgdl', 'insulin_uU', 'tg_mgdl',
             'hdl_mgdl', 'ldl_mgdl', 'tc_mgdl', 'crphs', 'sbp', 'dbp',
             'hba1c', 'asat', 'ggt', 'urate_mgdl']

# Matrice de corrélation basée sur les publications MESA
# (corrélations Pearson après log-transformation des variables skewed)
CORRELATION_MATRIX = np.array([
    # bmi   waist  gluc   ins    tg     hdl    ldl    tc     crp    sbp    dbp    hba1c  asat   ggt    urate
    [1.00,  0.85,  0.20,  0.55,  0.20, -0.35,  0.05,  0.02,  0.40,  0.15,  0.12,  0.18,  0.10,  0.25,  0.25], # bmi
    [0.85,  1.00,  0.22,  0.50,  0.22, -0.30,  0.05,  0.03,  0.35,  0.15,  0.12,  0.20,  0.10,  0.22,  0.22], # waist
    [0.20,  0.22,  1.00,  0.45,  0.15, -0.12,  0.05,  0.05,  0.12,  0.10,  0.05,  0.65,  0.10,  0.15,  0.10], # glucose
    [0.55,  0.50,  0.45,  1.00,  0.30, -0.30,  0.05,  0.05,  0.25,  0.10,  0.08,  0.35,  0.10,  0.25,  0.20], # insulin
    [0.20,  0.22,  0.15,  0.30,  1.00, -0.45,  0.15,  0.25,  0.15,  0.05,  0.05,  0.12,  0.08,  0.20,  0.15], # tg
    [-0.35,-0.30, -0.12, -0.30, -0.45,  1.00, -0.05, -0.02, -0.15, -0.05, -0.03, -0.10, -0.05, -0.15, -0.10], # hdl
    [0.05,  0.05,  0.05,  0.05,  0.15, -0.05,  1.00,  0.85,  0.05,  0.05,  0.03,  0.05,  0.05,  0.05,  0.05], # ldl
    [0.02,  0.03,  0.05,  0.05,  0.25, -0.02,  0.85,  1.00,  0.05,  0.05,  0.03,  0.05,  0.05,  0.08,  0.08], # tc
    [0.40,  0.35,  0.12,  0.25,  0.15, -0.15,  0.05,  0.05,  1.00,  0.12,  0.08,  0.10,  0.08,  0.15,  0.12], # crp
    [0.15,  0.15,  0.10,  0.10,  0.05, -0.05,  0.05,  0.05,  0.12,  1.00,  0.65,  0.10,  0.05,  0.08,  0.10], # sbp
    [0.12,  0.12,  0.05,  0.08,  0.05, -0.03,  0.03,  0.03,  0.08,  0.65,  1.00,  0.05,  0.05,  0.05,  0.08], # dbp
    [0.18,  0.20,  0.65,  0.35,  0.12, -0.10,  0.05,  0.05,  0.10,  0.10,  0.05,  1.00,  0.08,  0.12,  0.10], # hba1c
    [0.10,  0.10,  0.10,  0.10,  0.08, -0.05,  0.05,  0.05,  0.08,  0.05,  0.05,  0.08,  1.00,  0.35,  0.12], # asat
    [0.25,  0.22,  0.15,  0.25,  0.20, -0.15,  0.05,  0.08,  0.15,  0.08,  0.05,  0.12,  0.35,  1.00,  0.18], # ggt
    [0.25,  0.22,  0.10,  0.20,  0.15, -0.10,  0.05,  0.08,  0.12,  0.10,  0.08,  0.10,  0.12,  0.18,  1.00], # urate
])


# ═══════════════════════════════════════════════════════════════════════
# GÉNÉRATION DE LA COHORTE SYNTHÉTIQUE
# ═══════════════════════════════════════════════════════════════════════

def generate_mesa_synthetic(n_total=MESA_N, seed=42):
    """
    Génère une cohorte synthétique fidèle aux caractéristiques publiées de MESA.

    Utilise une distribution normale multivariée avec matrice de corrélation
    inter-biomarqueurs pour préserver la structure de dépendance physiologique.

    Returns
    -------
    pd.DataFrame : cohorte synthétique harmonisée au schéma BMN v3.0
    """
    rng = np.random.RandomState(seed)

    print("=" * 70)
    print("  GÉNÉRATION COHORTE SYNTHÉTIQUE MESA")
    print(f"  N cible = {n_total:,}")
    print("=" * 70)

    all_subjects = []
    subject_id = 1

    for (eth_group, sex), group_info in MESA_GROUPS.items():
        n_group = group_info['n']
        dist = DISTRIBUTIONS[(eth_group, sex)]
        comorbidities = COMORBIDITY_PREV[(eth_group, sex)]

        # Map eth_group for BMN
        eth_code = eth_group.replace('_hisp', '')

        print(f"\n  [{eth_group.upper()} {sex}] Génération de {n_group} sujets...")

        # Construire les vecteurs de moyennes et écarts-types
        means = np.array([dist[v][0] for v in CORR_VARS])
        sds = np.array([dist[v][1] for v in CORR_VARS])

        # Matrice de covariance = diag(SD) × R × diag(SD)
        D = np.diag(sds)
        cov = D @ CORRELATION_MATRIX @ D

        # Assurer la positivité définie
        eigvals = np.linalg.eigvalsh(cov)
        if eigvals.min() < 0:
            cov += np.eye(len(cov)) * (abs(eigvals.min()) + 1e-6)

        # Génération multivariée
        raw = rng.multivariate_normal(means, cov, size=n_group)

        for i in range(n_group):
            row = {}
            row['ID'] = f"MESA_S{subject_id:05d}"
            subject_id += 1
            row['sex'] = sex
            row['ethnicCode'] = eth_code

            # Assigner les valeurs corrélées
            for j, var in enumerate(CORR_VARS):
                row[var] = raw[i, j]

            # Âge : généré séparément (critères MESA : 45-84 ans)
            row['age'] = np.clip(dist['age'][0] + rng.normal(0, dist['age'][1]), 45, 84)

            # Taille : générée séparément (non dans la matrice de corrélation)
            row['height_cm'] = max(130, min(210,
                rng.normal(dist['height_cm'][0], dist['height_cm'][1])))

            # Appliquer des bornes physiologiques
            row['bmi'] = max(15, min(55, row['bmi']))
            row['waist'] = max(50, min(180, row['waist']))
            row['height_cm'] = max(130, min(210, row['height_cm']))
            row['glucose_mgdl'] = max(50, min(300, row['glucose_mgdl']))
            row['insulin_uU'] = max(0.5, row['insulin_uU'])
            row['hba1c'] = max(3.5, min(14.0, row['hba1c']))
            row['crphs'] = max(0.1, row['crphs'])
            row['tg_mgdl'] = max(20, min(800, row['tg_mgdl']))
            row['hdl_mgdl'] = max(15, min(120, row['hdl_mgdl']))
            row['ldl_mgdl'] = max(30, min(300, row['ldl_mgdl']))
            row['tc_mgdl'] = max(80, min(400, row['tc_mgdl']))
            row['asat'] = max(5, min(200, row['asat']))
            row['ggt'] = max(5, min(300, row['ggt']))
            row['urate_mgdl'] = max(1.5, min(12.0, row['urate_mgdl']))
            row['sbp'] = max(80, min(220, row['sbp']))
            row['dbp'] = max(40, min(130, row['dbp']))

            # Comorbidités (binomial selon prévalence)
            row['has_diabetes'] = int(rng.random() < comorbidities['diabetes'])
            row['has_hta'] = int(rng.random() < comorbidities['hta'])
            row['has_hypo'] = 0

            # Si diabète : glucose et HbA1c plus élevés
            if row['has_diabetes']:
                row['glucose_mgdl'] = max(row['glucose_mgdl'], rng.normal(140, 40))
                row['hba1c'] = max(row['hba1c'], rng.normal(7.5, 1.0))
                row['insulin_uU'] = max(row['insulin_uU'], rng.normal(12, 5))

            # Tabac
            r = rng.random()
            if r < comorbidities['smoker_current']:
                row['tobaccoStatus'] = 3  # fumeur actuel
            elif r < comorbidities['smoker_current'] + comorbidities['smoker_past']:
                row['tobaccoStatus'] = 1  # ancien fumeur
            else:
                row['tobaccoStatus'] = 0  # non-fumeur

            # Lifestyle
            row['physicalActivityMinWeek'] = max(0, rng.normal(150, 90))
            row['sleepHours'] = max(3, min(12, rng.normal(7.0, 1.2)))
            row['drinksPerWeek'] = max(0, rng.exponential(4.0))
            row['phq9'] = max(0, min(27, int(rng.exponential(3.0))))

            all_subjects.append(row)

        print(f"    BMI moyen : {np.mean([s['bmi'] for s in all_subjects[-n_group:]]):.1f}")
        print(f"    Waist moyen : {np.mean([s['waist'] for s in all_subjects[-n_group:]]):.1f}")
        print(f"    Glucose moyen : {np.mean([s['glucose_mgdl'] for s in all_subjects[-n_group:]]):.1f}")

    df = pd.DataFrame(all_subjects)

    # ── Harmonisation vers le schéma BMN v3.0 ──
    print(f"\n{'=' * 70}")
    print(f"  HARMONISATION VERS LE SCHÉMA BMN v3.0")
    print(f"{'=' * 70}")

    # Conversions d'unités
    df['glyc'] = df['glucose_mgdl'] / 18.0
    df['tg'] = df['tg_mgdl'] / 88.57
    df['hdl'] = df['hdl_mgdl'] / 38.67
    df['ldl'] = df['ldl_mgdl'] / 38.67
    df['urate'] = df['urate_mgdl'] * 59.48
    print("  Conversions : glucose, TG, HDL, LDL (mg/dL→mmol/L), urate (→µmol/L)")

    # Variables dérivées
    df['homaIR'] = (df['glucose_mgdl'] * df['insulin_uU']) / 405.0
    df['whtr'] = df['waist'] / df['height_cm']
    df['tghdl'] = df['tg'] / df['hdl']
    print("  Dérivées : HOMA-IR, WHtR, TG/HDL ratio")

    # Résumé
    print(f"\n  Dataset synthétique MESA : {len(df):,} sujets")
    print(f"  Sexe : {df['sex'].value_counts().to_dict()}")
    print(f"  Ethnie : {df['ethnicCode'].value_counts().to_dict()}")
    print(f"  Âge : {df['age'].mean():.1f} ± {df['age'].std():.1f} [{df['age'].min():.0f}-{df['age'].max():.0f}]")
    print(f"  BMI : {df['bmi'].mean():.1f} ± {df['bmi'].std():.1f}")
    print(f"  Waist : {df['waist'].mean():.1f} ± {df['waist'].std():.1f}")
    print(f"  Glucose : {df['glucose_mgdl'].mean():.1f} ± {df['glucose_mgdl'].std():.1f} mg/dL")
    print(f"  HDL : {df['hdl_mgdl'].mean():.1f} ± {df['hdl_mgdl'].std():.1f} mg/dL")
    print(f"  TG : {df['tg_mgdl'].mean():.1f} ± {df['tg_mgdl'].std():.1f} mg/dL")
    print(f"  LDL : {df['ldl_mgdl'].mean():.1f} ± {df['ldl_mgdl'].std():.1f} mg/dL")
    print(f"  HbA1c : {df['hba1c'].mean():.2f} ± {df['hba1c'].std():.2f}")
    print(f"  CRP : {df['crphs'].median():.2f} mg/L (médiane)")
    print(f"  GGT : {df['ggt'].median():.1f} U/L (médiane)")
    print(f"  HOMA-IR : {df['homaIR'].median():.2f} (médiane)")
    print(f"  Diabète : {df['has_diabetes'].mean()*100:.1f}%")
    print(f"  HTA : {df['has_hta'].mean()*100:.1f}%")

    return df


# ═══════════════════════════════════════════════════════════════════════
# VALIDATION DE LA FIDÉLITÉ DE LA COHORTE SYNTHÉTIQUE
# ═══════════════════════════════════════════════════════════════════════

def validate_fidelity(df):
    """
    Compare les statistiques de la cohorte synthétique aux valeurs publiées MESA.
    """
    print(f"\n{'=' * 70}")
    print(f"  VALIDATION DE FIDÉLITÉ : SYNTHÉTIQUE vs PUBLIÉ")
    print(f"{'=' * 70}")

    # Références publiées (Malik 2009, Table 1)
    published = {
        'All': {
            'N': 5923,
            'age': (61.8, 10.3),
            'bmi': (28.0, 5.4),
            'waist': (97.2, 14.1),
            'glucose': (89.6, 10.5),
            'tc': (200.6, 34.4),
            'ldl': (123.4, 30.6),
            'hdl': (51.3, 14.7),
        },
        'White': {
            'N': 2452,
            'bmi': (27.5, 5.0),
            'waist': (97.3, 14.2),
            'glucose': (87.9, 10.1),
            'hdl': (52.3, 15.5),
        },
        'Chinese': {
            'N': 695,
            'bmi': (23.8, 3.3),
            'waist': (86.6, 9.9),
            'glucose': (91.6, 10.0),
            'hdl': (50.0, 12.6),
        },
        'AA': {
            'N': 1546,
            'bmi': (29.9, 5.9),
            'waist': (99.9, 14.5),
            'glucose': (90.3, 10.8),
            'hdl': (53.1, 15.3),
        },
        'Hispanic': {
            'N': 1230,
            'bmi': (29.0, 4.8),
            'waist': (99.4, 12.6),
            'glucose': (90.9, 10.9),
            'hdl': (48.1, 12.8),
        },
    }

    # Mapping ethnie → filtre
    eth_filters = {
        'All': df,
        'White': df[df['ethnicCode'] == 'eu'],
        'Chinese': df[df['ethnicCode'] == 'ea'],
        'AA': df[df['ethnicCode'] == 'af'],
        'Hispanic': df[df['ethnicCode'] == 'eu'],  # Hispanics coded as 'eu' in MESA
    }

    for group_name, ref in published.items():
        sub = eth_filters[group_name]
        print(f"\n  [{group_name}] N synthétique={len(sub):,} (publié: {ref['N']:,})")

        for var, val in ref.items():
            if var == 'N' or not isinstance(val, tuple):
                continue
            ref_mean, ref_sd = val
            col_map = {'glucose': 'glucose_mgdl', 'tc': 'tc_mgdl', 'ldl': 'ldl_mgdl', 'hdl': 'hdl_mgdl'}
            col = col_map.get(var, var)
            if col in sub.columns:
                syn_mean = sub[col].mean()
                syn_sd = sub[col].std()
                delta = abs(syn_mean - ref_mean)
                pct_diff = (delta / ref_mean) * 100 if ref_mean != 0 else 0
                ok = "OK" if pct_diff < 10 else "ECART"
                print(f"    {var:10s}: synth {syn_mean:7.1f}±{syn_sd:5.1f}  "
                      f"| pub {ref_mean:7.1f}±{ref_sd:5.1f}  "
                      f"| diff {pct_diff:4.1f}% [{ok}]")


# ═══════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    OUTPUT_DIR = "./bmn_validation_mesa_synthetic"
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 70)
    print("  SCORE BMN v3.0 — VALIDATION COHORTE SYNTHÉTIQUE MESA")
    print("  (basée sur les publications MESA 2002-2023)")
    print("=" * 70)

    # ── ÉTAPE 1 : Génération de la cohorte synthétique ──
    print(f"\n[1/5] Génération de la cohorte synthétique MESA...")
    df = generate_mesa_synthetic()

    # ── ÉTAPE 2 : Validation de fidélité ──
    print(f"\n[2/5] Validation de fidélité vs publications...")
    validate_fidelity(df)

    # ── ÉTAPE 3 : Outcomes ──
    print(f"\n[3/5] Dérivation des outcomes...")
    df = compute_outcomes(df)

    # ── ÉTAPE 4 : Imputation Monte Carlo (MICE) ──
    print(f"\n[4/5] Imputation Monte Carlo (MICE)...")
    imputed_datasets = run_mice_imputation(df, n_imputations=20, n_iterations=10)

    # ── ÉTAPE 5 : Score BMN + Validation ──
    print(f"\n[5/5] Score BMN v3.0 + Validation statistique...")
    df, imputed_datasets = apply_bmn_score(df, imputed_datasets)
    results = run_validation(df, imputed_datasets, "MESA_Synthetic", output_dir=OUTPUT_DIR)

    print("\n" + "=" * 70)
    print("  ANALYSE TERMINÉE — COHORTE SYNTHÉTIQUE MESA")
    print("=" * 70)
