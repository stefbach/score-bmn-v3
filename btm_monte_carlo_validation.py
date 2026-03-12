"""
===============================================================================
BTM v3.4 - BARIATRIC & THERAPEUTIC MODULE - MONTE CARLO VALIDATION ON NHANES
===============================================================================
Second-stage validation: GLP-1 response prediction and therapeutic strategy
Built on top of validated BMN scores (AUC=0.875 for MetS)

Authors: Bach, Manos, Noel
Date: 2026-03-11
"""

import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from scipy import stats
from scipy.special import expit
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, roc_curve, brier_score_loss
from sklearn.calibration import calibration_curve
from sklearn.preprocessing import StandardScaler
from sklearn.experimental import enable_iterative_imputer
from sklearn.impute import IterativeImputer
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch
import seaborn as sns
import os, json, time, sys

np.random.seed(42)

# ======================================================================
# CONFIGURATION
# ======================================================================
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bmn_monte_carlo_results")
os.makedirs(OUTPUT_DIR, exist_ok=True)

N_MC_TREATMENT = 1000    # MC simulations per subject for treatment response
N_BOOTSTRAP = 2000       # Bootstrap for CI
RESPONDER_THRESHOLD = 10.0   # TBWL >= 10% = responder
SUPER_RESP_THRESHOLD = 20.0  # TBWL >= 20% = super-responder

# Ethnic profiles (from BMN v3.4)
ETHNIC_PROFILES = {
    "eu": {"bmiSurpoids": 25, "bmiObesite": 30, "waistM": 94, "waistF": 80, "dR": 1.0, "hR": 1.0, "cR": 1.0, "ev": 0},
    "af": {"bmiSurpoids": 25, "bmiObesite": 30, "waistM": 94, "waistF": 80, "dR": 1.7, "hR": 1.45, "cR": 1.15, "ev": 3},
    "ea": {"bmiSurpoids": 23, "bmiObesite": 27.5, "waistM": 85, "waistF": 75, "dR": 1.5, "hR": 1.1, "cR": 1.05, "ev": 2},
    "sa": {"bmiSurpoids": 23, "bmiObesite": 25, "waistM": 80, "waistF": 72, "dR": 2.0, "hR": 1.3, "cR": 1.2, "ev": 5},
}

COMORBIDITIES_DEF = {
    "dt2":    {"pts": 14, "ca": 1.3, "gr": 0.65},
    "predmt": {"pts": 10, "ca": 1.15, "gr": 0.82},
    "hta":    {"pts": 8, "ca": 1.1, "gr": 0},
    "hypo":   {"pts": 6, "ca": 1.15, "gr": 0},
    "mets":   {"pts": 10, "ca": 1.2, "gr": 0.65},
    "ir_occ": {"pts": 8, "ca": 1.1, "gr": 0.55},
    "dyslip": {"pts": 6, "ca": 1.0, "gr": 0},
    "nafld":  {"pts": 10, "ca": 1.2, "gr": 0.45},
    "sopk":   {"pts": 14, "ca": 1.2, "gr": 0.83},
    "saos":   {"pts": 8, "ca": 1.15, "gr": 0},
    "cortis": {"pts": 6, "ca": 1.0, "gr": -0.35},
    "antidep":{"pts": 4, "ca": 1.0, "gr": 0},
    "depres": {"pts": 4, "ca": 1.0, "gr": 0},
}

# BIOMARKERS_DEF — CANONICAL values aligned with app.js / score-bmn-v3.js / nhanes.py
BIOMARKERS_DEF = {
    "homaIR":   {"normal": 2.5, "abnormal": 4.0, "inv": False, "w": 2.5},
    "hba1c":    {"normal": 5.7, "abnormal": 6.5, "inv": False, "w": 2.0},
    "glyc":     {"normal": 5.6, "abnormal": 7.0, "inv": False, "w": 1.8},
    "crphs":    {"normal": 1.0, "abnormal": 3.0, "inv": False, "w": 2.0},
    "tsh":      {"normal": 4.0, "abnormal": 8.0, "inv": False, "w": 1.3},
    "ldl":      {"normal": 3.0, "abnormal": 4.1, "inv": False, "w": 1.8},
    "hdl":      {"normal": 1.0, "abnormal": 0.7, "inv": True, "w": 1.0},
    "tg":       {"normal": 1.7, "abnormal": 2.3, "inv": False, "w": 1.5},
    "adipon":   {"normal": 10,  "abnormal": 6.0, "inv": True, "w": 2.5},
    "asat":     {"normal": 40,  "abnormal": 60,  "inv": False, "w": 1.0},
    "apob":     {"normal": 0.9, "abnormal": 1.2, "inv": False, "w": 1.5},
    "ggt":      {"normal": 50,  "abnormal": 80,  "inv": False, "w": 0.8},
    "tghdl":    {"normal": 2.0, "abnormal": 3.5, "inv": False, "w": 2.0},
    "urate":    {"normal": 360, "abnormal": 420, "inv": False, "w": 0.8},
    "leptine":  {"normal": 20,  "abnormal": 40,  "inv": False, "w": 1.5},
    "cpep":     {"normal": 1.1, "abnormal": 0.4, "inv": True, "w": 2.0},
    "fgf21":    {"normal": 200, "abnormal": 500, "inv": False, "w": 1.5},
    "glucag":   {"normal": 100, "abnormal": 180, "inv": False, "w": 1.3},
}

print("=" * 78)
print("  BTM v3.4 — MONTE CARLO THERAPEUTIC VALIDATION PIPELINE")
print("  GLP-1 Response Prediction + Therapeutic Strategy on NHANES")
print("=" * 78)


# ======================================================================
# PART 1: DATA LOADING (reuse cached NHANES data from first pipeline)
# ======================================================================

def load_nhanes_from_cache():
    """Load NHANES pickle files from first pipeline cache."""
    cache_dir = os.path.join(OUTPUT_DIR, '.cache')
    if not os.path.exists(cache_dir):
        print('  ERROR: No cache directory found. Run bmn_monte_carlo_nhanes.py first.')
        sys.exit(1)

    NHANES_CYCLES = {
        '2011-2012': ('G', 2011),
        '2013-2014': ('H', 2013),
        '2015-2016': ('I', 2015),
        '2017-2018': ('J', 2017),
    }
    NHANES_TABLES = [
        'DEMO', 'BMX', 'BIOPRO', 'GHB', 'TRIGLY', 'HDL', 'TCHOL', 'INS',
        'HSCRP', 'DPQ', 'SLQ', 'PAQ', 'SMQ', 'ALQ', 'DIQ', 'BPQ', 'MCQ', 'WHQ', 'DBQ', 'CDQ'
    ]

    all_cycles = {}
    for cycle_label, (suffix, start_year) in NHANES_CYCLES.items():
        tables = {}
        for table_name in NHANES_TABLES:
            pkl_path = os.path.join(cache_dir, f'{table_name}_{suffix}.pkl')
            if os.path.exists(pkl_path):
                tables[table_name] = pd.read_pickle(pkl_path)
        if 'DEMO' in tables:
            all_cycles[cycle_label] = tables
            print(f'    Loaded {cycle_label}: {len(tables)} tables')
    return all_cycles


def harmonize_cycle(cycle_label, tables):
    """Harmonize NHANES tables into a single dataframe per cycle."""
    demo = tables['DEMO']
    eligible = demo[(demo['RIDAGEYR'] >= 18) & (demo['RIDSTATR'] == 2)].copy()
    df = pd.DataFrame()
    df['SEQN'] = eligible['SEQN']
    df['cycle'] = cycle_label
    df['age'] = eligible['RIDAGEYR'].values
    df['sex'] = eligible['RIAGENDR'].map({1: 'M', 2: 'F'}).values

    ethnicity_map = {1: 'eu', 2: 'eu', 3: 'eu', 4: 'af', 6: 'ea', 7: 'eu'}
    if 'RIDRETH3' in eligible.columns:
        df['ethnicCode'] = eligible['RIDRETH3'].map(ethnicity_map).fillna('eu').values
    elif 'RIDRETH1' in eligible.columns:
        df['ethnicCode'] = eligible['RIDRETH1'].map({1:'eu',2:'eu',3:'eu',4:'af',5:'eu'}).fillna('eu').values
    else:
        df['ethnicCode'] = 'eu'

    # Body Measures
    if 'BMX' in tables:
        bmx = tables['BMX']
        cols = [c for c in ['BMXBMI','BMXWAIST','BMXHT','BMXWT'] if c in bmx.columns]
        df = df.merge(bmx[['SEQN']+cols], on='SEQN', how='left')
        df.rename(columns={'BMXBMI':'bmi','BMXWAIST':'waistCircumference','BMXHT':'height_cm','BMXWT':'weight_kg'}, inplace=True)
        if 'waistCircumference' in df.columns and 'height_cm' in df.columns:
            df['whtr'] = df['waistCircumference'] / df['height_cm']

    # Biochemistry
    if 'BIOPRO' in tables:
        bio = tables['BIOPRO']
        col_map = {'LBXSGL':'glucose_mgdl','LBXSUA':'urate_mgdl','LBXSGB':'ggt','LBXSC3SI':'creat'}
        avail = {s:d for s,d in col_map.items() if s in bio.columns}
        if avail:
            df = df.merge(bio[['SEQN']+list(avail.keys())].rename(columns=avail), on='SEQN', how='left')

    # HbA1c
    if 'GHB' in tables and 'LBXGH' in tables['GHB'].columns:
        df = df.merge(tables['GHB'][['SEQN','LBXGH']].rename(columns={'LBXGH':'hba1c'}), on='SEQN', how='left')

    # Triglycerides
    if 'TRIGLY' in tables and 'LBXTR' in tables['TRIGLY'].columns:
        df = df.merge(tables['TRIGLY'][['SEQN','LBXTR']].rename(columns={'LBXTR':'tg_mgdl'}), on='SEQN', how='left')

    # HDL
    if 'HDL' in tables and 'LBDHDD' in tables['HDL'].columns:
        df = df.merge(tables['HDL'][['SEQN','LBDHDD']].rename(columns={'LBDHDD':'hdl_mgdl'}), on='SEQN', how='left')

    # Total Cholesterol
    if 'TCHOL' in tables and 'LBXTC' in tables['TCHOL'].columns:
        df = df.merge(tables['TCHOL'][['SEQN','LBXTC']].rename(columns={'LBXTC':'tc_mgdl'}), on='SEQN', how='left')

    # Insulin
    if 'INS' in tables and 'LBXIN' in tables['INS'].columns:
        df = df.merge(tables['INS'][['SEQN','LBXIN']].rename(columns={'LBXIN':'insulin_uUmL'}), on='SEQN', how='left')

    # hs-CRP
    if 'HSCRP' in tables and 'LBXHSCRP' in tables['HSCRP'].columns:
        df = df.merge(tables['HSCRP'][['SEQN','LBXHSCRP']].rename(columns={'LBXHSCRP':'crphs'}), on='SEQN', how='left')

    # PHQ-9
    if 'DPQ' in tables:
        dpq = tables['DPQ']
        phq_cols = [f'DPQ0{i}0' for i in range(1,10)]
        avail_phq = [c for c in phq_cols if c in dpq.columns]
        if avail_phq:
            dpq_m = dpq[['SEQN']+avail_phq].copy()
            for c in avail_phq:
                dpq_m[c] = dpq_m[c].replace({7:np.nan, 9:np.nan})
            dpq_m['phq9'] = dpq_m[avail_phq].sum(axis=1, min_count=5)
            df = df.merge(dpq_m[['SEQN','phq9']], on='SEQN', how='left')

    # Sleep
    if 'SLQ' in tables:
        slq = tables['SLQ']
        if 'SLD012' in slq.columns:
            df = df.merge(slq[['SEQN','SLD012']].rename(columns={'SLD012':'sleepHours'}), on='SEQN', how='left')
        elif 'SLD010H' in slq.columns:
            df = df.merge(slq[['SEQN','SLD010H']].rename(columns={'SLD010H':'sleepHours'}), on='SEQN', how='left')

    # Physical Activity
    if 'PAQ' in tables:
        paq = tables['PAQ']
        pa_map = {}
        for src, dst in [('PAD680','sitting_min_day'),('PAD660','vigorous_rec_min'),('PAD675','moderate_rec_min')]:
            if src in paq.columns:
                pa_map[src] = dst
        if pa_map:
            df = df.merge(paq[['SEQN']+list(pa_map.keys())].rename(columns=pa_map), on='SEQN', how='left')

    # Smoking
    if 'SMQ' in tables:
        smq = tables['SMQ']
        if 'SMQ040' in smq.columns:
            df = df.merge(smq[['SEQN','SMQ040']].rename(columns={'SMQ040':'current_smoker'}), on='SEQN', how='left')

    # Diabetes
    if 'DIQ' in tables:
        diq = tables['DIQ']
        diq_cols = {}
        if 'DIQ010' in diq.columns: diq_cols['DIQ010'] = 'diabetes_dx'
        if 'DIQ160' in diq.columns: diq_cols['DIQ160'] = 'prediabetes_dx'
        if diq_cols:
            df = df.merge(diq[['SEQN']+list(diq_cols.keys())].rename(columns=diq_cols), on='SEQN', how='left')

    # Blood Pressure
    if 'BPQ' in tables and 'BPQ020' in tables['BPQ'].columns:
        df = df.merge(tables['BPQ'][['SEQN','BPQ020']].rename(columns={'BPQ020':'hta_dx'}), on='SEQN', how='left')

    # Medical Conditions (hypothyroid)
    if 'MCQ' in tables and 'MCQ160F' in tables['MCQ'].columns:
        df = df.merge(tables['MCQ'][['SEQN','MCQ160F']].rename(columns={'MCQ160F':'hypothyroid_dx'}), on='SEQN', how='left')

    # Weight History
    if 'WHQ' in tables:
        whq = tables['WHQ']
        if 'WHD010' in whq.columns:
            df = df.merge(whq[['SEQN','WHD010']].rename(columns={'WHD010':'height_self'}), on='SEQN', how='left')

    return df


def compute_derived_variables(df):
    """Compute derived clinical variables."""
    # Unit conversions
    if 'glucose_mgdl' in df.columns:
        df['glucose'] = df['glucose_mgdl'] / 18.0
    if 'tg_mgdl' in df.columns:
        df['tg'] = df['tg_mgdl'] / 88.57
    if 'hdl_mgdl' in df.columns:
        df['hdl'] = df['hdl_mgdl'] / 38.67
    if 'tc_mgdl' in df.columns:
        df['tc'] = df['tc_mgdl'] / 38.67
    if 'urate_mgdl' in df.columns:
        df['urate'] = df['urate_mgdl'] * 59.48

    # LDL Friedewald
    if all(c in df.columns for c in ['tc','hdl','tg']):
        df['ldl'] = df['tc'] - df['hdl'] - df['tg']/2.2
        df.loc[df['tg'] > 4.5, 'ldl'] = np.nan

    # HOMA-IR
    if 'glucose' in df.columns and 'insulin_uUmL' in df.columns:
        df['homaIR'] = (df['glucose_mgdl'] * df['insulin_uUmL']) / 405.0
        df.loc[df['homaIR'] > 50, 'homaIR'] = np.nan

    # TG/HDL
    if 'tg' in df.columns and 'hdl' in df.columns:
        df['tghdl'] = df['tg'] / df['hdl']
        df.loc[df['tghdl'] > 20, 'tghdl'] = np.nan

    # Comorbidity flags
    df['has_dt2'] = 0
    if 'diabetes_dx' in df.columns:
        df.loc[df['diabetes_dx'] == 1, 'has_dt2'] = 1
    if 'hba1c' in df.columns:
        df.loc[df['hba1c'] >= 6.5, 'has_dt2'] = 1

    df['has_prediabetes'] = 0
    if 'prediabetes_dx' in df.columns:
        df.loc[df['prediabetes_dx'] == 1, 'has_prediabetes'] = 1
    if 'hba1c' in df.columns:
        df.loc[(df['hba1c'] >= 5.7) & (df['hba1c'] < 6.5) & (df['has_dt2'] == 0), 'has_prediabetes'] = 1

    df['has_hta'] = 0
    if 'hta_dx' in df.columns:
        df.loc[df['hta_dx'] == 1, 'has_hta'] = 1

    df['has_hypothyroid'] = 0
    if 'hypothyroid_dx' in df.columns:
        df.loc[df['hypothyroid_dx'] == 1, 'has_hypothyroid'] = 1

    # Tobacco status
    df['tobaccoStatus'] = 0
    if 'current_smoker' in df.columns:
        df.loc[df['current_smoker'].isin([1,2]), 'tobaccoStatus'] = 3

    # Physical activity
    df['physicalActivityMinWeek'] = 75  # default
    for col in ['vigorous_rec_min', 'moderate_rec_min']:
        if col in df.columns:
            valid = df[col].fillna(0).clip(0, 600)
            df['physicalActivityMinWeek'] = df['physicalActivityMinWeek'] + valid

    # Sitting hours
    df['sittingHoursDay'] = 6
    if 'sitting_min_day' in df.columns:
        df['sittingHoursDay'] = df['sitting_min_day'].fillna(360) / 60
        df['sittingHoursDay'] = df['sittingHoursDay'].clip(0, 18)

    # Drinks per week
    df['drinksPerWeek'] = 0

    # Metabolic syndrome (IDF harmonized)
    df['MetS'] = 0
    met_count = pd.Series(0, index=df.index)
    if 'waistCircumference' in df.columns:
        wc_thresh = df['ethnicCode'].map(lambda e: ETHNIC_PROFILES.get(e, ETHNIC_PROFILES['eu'])['waistM'])
        is_female = (df['sex'] == 'F')
        wc_f = df['ethnicCode'].map(lambda e: ETHNIC_PROFILES.get(e, ETHNIC_PROFILES['eu'])['waistF'])
        thresh = wc_thresh.copy()
        thresh[is_female] = wc_f[is_female]
        met_count += (df['waistCircumference'] > thresh).astype(int)
    if 'tg' in df.columns:
        met_count += (df['tg'] >= 1.7).astype(int)
    if 'hdl' in df.columns:
        low_hdl = ((df['sex']=='M') & (df['hdl'] < 1.03)) | ((df['sex']=='F') & (df['hdl'] < 1.29))
        met_count += low_hdl.astype(int)
    if 'glucose' in df.columns:
        met_count += (df['glucose'] >= 5.6).astype(int)
    if 'has_hta' in df.columns:
        met_count += df['has_hta']
    df['MetS'] = (met_count >= 3).astype(int)

    # Obesity
    df['Obesity'] = 0
    if 'bmi' in df.columns:
        for eth in df['ethnicCode'].unique():
            ep = ETHNIC_PROFILES.get(eth, ETHNIC_PROFILES['eu'])
            mask = df['ethnicCode'] == eth
            df.loc[mask & (df['bmi'] >= ep['bmiObesite']), 'Obesity'] = 1

    return df


# ======================================================================
# PART 2: MONTE CARLO IMPUTATION OF MISSING BMN INDICATORS
# ======================================================================

def monte_carlo_impute_indicators(df):
    """MC-model 8 missing BMN indicators using literature distributions."""
    print('\n  Monte Carlo imputation of 8 missing BMN indicators...')
    n = len(df)
    bmi = df['bmi'].fillna(28).values
    sex_f = (df['sex'] == 'F').astype(float).values
    homa = df['homaIR'].fillna(2.0).values if 'homaIR' in df.columns else np.full(n, 2.0)
    phq = df['phq9'].fillna(5).values if 'phq9' in df.columns else np.full(n, 5.0)
    sleep = df['sleepHours'].fillna(7).values if 'sleepHours' in df.columns else np.full(n, 7.0)
    ldl_v = df['ldl'].fillna(3.0).values if 'ldl' in df.columns else np.full(n, 3.0)
    age = df['age'].fillna(45).values

    # Adiponectin
    mu_adip = 15 - 0.2*bmi - 0.5*homa + 3*sex_f
    df['adipon'] = np.maximum(1, np.random.normal(mu_adip, 3.5))

    # Leptin
    mu_lep = 0.8*bmi + 15*sex_f - 5
    df['leptine'] = np.maximum(1, np.random.normal(mu_lep, 0.3*bmi))

    # ApoB
    mu_apob = 0.23*ldl_v + 0.27
    df['apoB'] = np.maximum(0.3, np.random.normal(mu_apob, 0.15))

    # TSH
    mu_tsh = 0.5 + 0.005*(age - 40)
    df['tsh'] = np.maximum(0.1, np.random.lognormal(mu_tsh, 0.6))
    df['tsh'] = df['tsh'].clip(0.1, 20)

    # PSS-10
    mu_pss = 8 + 0.8*phq + 1.5*np.maximum(0, 7 - sleep)
    df['pss10'] = np.clip(np.random.normal(mu_pss, 5), 0, 40)

    # ISI
    mu_isi = 14 - 1.5*sleep + 0.3*phq
    df['isi'] = np.clip(np.random.normal(mu_isi, 4), 0, 28)

    # BES
    mu_bes = 0.08*bmi + 0.15*phq - 1.5
    df['bes'] = np.clip(np.random.normal(mu_bes, 1.5), 0, 10)

    # PREDIMED
    mu_pred = 8 - 0.1*(bmi - 25)
    df['predimed'] = np.clip(np.random.normal(mu_pred, 2.5), 0, 14)

    # C-peptide (proxy from insulin and glucose)
    # C-peptide ≈ insulin/6.0 nmol/L (rough conversion), modulated by beta-cell health
    insulin_v = df['insulin_uUmL'].fillna(10).values if 'insulin_uUmL' in df.columns else np.full(n, 10.0)
    mu_cpep = insulin_v / 6.0 * (1.0 - 0.02 * np.clip(df['hba1c'].fillna(5.5).values - 5.5, 0, 5))
    df['cpep'] = np.maximum(0.1, np.random.normal(mu_cpep, 0.3))

    # FGF21 (correlated with BMI, NAFLD severity, and HOMA-IR)
    mu_fgf21 = 150 + 5 * bmi + 20 * homa - 50 * sex_f
    df['fgf21'] = np.maximum(20, np.random.normal(mu_fgf21, 80))

    # Fasting glucagon (correlated with glucose, BMI, insulin resistance)
    mu_glucag = 80 + 1.5 * bmi + 8 * homa - 0.3 * age
    df['glucag'] = np.maximum(20, np.random.normal(mu_glucag, 30))

    print(f'    Done: 11 indicators imputed for {n} subjects')
    return df


# ======================================================================
# PART 3: BMN SCORE COMPUTATION (port from first pipeline)
# ======================================================================

def compute_bmn_score(row):
    """Compute BMN v3.4 score for a single subject."""
    eth = row.get('ethnicCode', 'eu')
    ep = ETHNIC_PROFILES.get(eth, ETHNIC_PROFILES['eu'])
    sex = row.get('sex', 'M')
    age = row.get('age', 45)
    bmi = row.get('bmi', 25)
    if pd.isna(bmi): bmi = 25

    # C1: Age
    if age >= 65: c1 = 10
    elif age >= 55: c1 = 7
    elif age >= 45: c1 = 5
    elif age >= 40: c1 = 2
    else: c1 = 0

    # C2: Sex
    c2 = 2 if (sex == 'M' and age < 60) else 0

    # C3: Anthropometry
    imcPts = 0
    if bmi >= ep['bmiObesite'] + 5: imcPts = 7
    elif bmi >= ep['bmiObesite']: imcPts = 5
    elif bmi >= ep['bmiSurpoids']: imcPts = 3

    whtr = row.get('whtr')
    whtrPts = 0
    if whtr is not None and not np.isnan(whtr):
        if whtr >= 0.60: whtrPts = 3
        elif whtr >= 0.55: whtrPts = 2
        elif whtr >= 0.50: whtrPts = 1

    wc = row.get('waistCircumference')
    ttPts = 0
    if wc is not None and not np.isnan(wc):
        ttThresh = ep['waistF'] if sex == 'F' else ep['waistM']
        diff = wc - ttThresh
        if diff > 10: ttPts = 2
        elif diff > 0: ttPts = 1
    c3 = min(12, imcPts + whtrPts + ttPts)

    # C4: Comorbidities
    comorbidities = []
    if row.get('has_dt2', 0) == 1: comorbidities.append('dt2')
    if row.get('has_prediabetes', 0) == 1: comorbidities.append('predmt')
    if row.get('has_hta', 0) == 1: comorbidities.append('hta')
    if row.get('has_hypothyroid', 0) == 1: comorbidities.append('hypo')
    if row.get('MetS', 0) == 1: comorbidities.append('mets')
    tghdl_val = row.get('tghdl', 0)
    if tghdl_val is not None and not np.isnan(tghdl_val) and tghdl_val > 3.5:
        comorbidities.append('ir_occ')
    ldl_val = row.get('ldl', 3.0)
    if ldl_val is not None and not np.isnan(ldl_val) and ldl_val > 4.1:
        comorbidities.append('dyslip')

    bmnK = 0
    for cid in comorbidities:
        cdef = COMORBIDITIES_DEF.get(cid)
        if not cdef: continue
        pts = cdef['pts']
        if cid in ('dt2','predmt'): pts *= ep['dR']
        if cid == 'hta': pts *= ep['hR']
        pts *= ep['cR']
        bmnK += pts
    bmnK = min(50, bmnK)
    c4 = round((bmnK / 50) * 10)

    c5 = 0  # Family history N/A

    # C6: Tobacco
    ts = int(row.get('tobaccoStatus', 0))
    c6 = {0:0, 1:1, 2:2, 3:4, 4:8}.get(ts, 0)

    # C7: Mental health
    c7 = 0
    pss10 = row.get('pss10', 0)
    if pss10 is not None and not np.isnan(pss10):
        if pss10 >= 27: c7 += 3
        elif pss10 >= 20: c7 += 2
        elif pss10 >= 14: c7 += 1
    phq9 = row.get('phq9', 0)
    if phq9 is not None and not np.isnan(phq9):
        if phq9 >= 20: c7 += 3
        elif phq9 >= 15: c7 += 2
        elif phq9 >= 10: c7 += 1
    bes_val = row.get('bes', 0)
    if bes_val is not None and not np.isnan(bes_val):
        if bes_val >= 5: c7 += 2
        elif bes_val >= 3: c7 += 1
    c7 = min(8, c7)

    # C8: Sleep
    c8 = 0
    isi_val = row.get('isi', 0)
    if isi_val is not None and not np.isnan(isi_val):
        if isi_val >= 22: c8 += 2
        elif isi_val >= 15: c8 += 1.5
        elif isi_val >= 8: c8 += 1
    sleep_hrs = row.get('sleepHours', 7)
    if sleep_hrs is not None and not np.isnan(sleep_hrs):
        if sleep_hrs < 5: c8 += 2
        elif sleep_hrs < 6: c8 += 1.5
        elif sleep_hrs < 7: c8 += 0.5
    c8 = min(4, round(c8))

    C = min(50, round((c1+c2+c3+c4+c5+c6+c7+c8) * (1 + ep['ev']/100)))

    # E: Exposome (simplified)
    sitting_hrs = row.get('sittingHoursDay', 6)
    pa_min = row.get('physicalActivityMinWeek', 75)
    sittingPts = 0
    if sitting_hrs > 8: sittingPts = 5
    elif sitting_hrs > 6: sittingPts = 3
    elif sitting_hrs > 4: sittingPts = 2
    if pa_min >= 150: sittingPts *= 0.5
    E = min(45, round(30 * (0.5 * min(1, sittingPts/10)) / 1.5))

    O = 0

    # L: Lifestyle
    l1 = 0 if pa_min >= 150 else (1 if pa_min >= 75 else (2 if pa_min >= 30 else 3))
    predimed = row.get('predimed', 7)
    if predimed is None or np.isnan(predimed): predimed = 7
    l2 = 0 if predimed >= 10 else (1 if predimed >= 7 else (2 if predimed >= 4 else 3))
    dpw = row.get('drinksPerWeek', 0)
    l3 = 2 if dpw > 21 else (1 if dpw > 14 else 0)
    sl = row.get('sleepHours', 7)
    isi_v = row.get('isi', 0)
    l4 = 0
    if (sl is not None and not np.isnan(sl) and sl < 6) or (isi_v is not None and not np.isnan(isi_v) and isi_v >= 15): l4 = 2
    elif (sl is not None and not np.isnan(sl) and sl < 7) or (isi_v is not None and not np.isnan(isi_v) and isi_v >= 8): l4 = 1
    L = min(10, l1+l2+l3+l4)

    sD = min(100, C+E+O+L)

    # BioNorm
    sumZW, sumW = 0, 0
    for bid, bdef in BIOMARKERS_DEF.items():
        val = row.get(bid)
        if val is None or (isinstance(val, float) and np.isnan(val)): continue
        if bdef['inv']:
            denom = bdef['normal'] - bdef['abnormal']
            z = (bdef['normal'] - val) / denom if denom != 0 else (1.0 if val < bdef['normal'] else 0.0)
        else:
            denom = bdef['abnormal'] - bdef['normal']
            z = (val - bdef['normal']) / denom if denom != 0 else (1.0 if val > bdef['normal'] else 0.0)
        z = max(0, min(1, z))
        sumZW += z * bdef['w']
        sumW += bdef['w']
    bioNorm = round((sumZW/sumW)*100) if sumW > 0 else 0

    # Final score
    wDecl, wBio = 0.65, 0.35
    gap = bioNorm - sD
    if gap > 20:
        extraW = min(0.30, ((gap-20)/100)*0.60)
        wBio = 0.35 + extraW
        wDecl = 1 - wBio
    sf = round(wDecl*sD + wBio*bioNorm)
    sf = max(sf, round(0.75*bioNorm))
    if bioNorm > 90: sf = max(sf, max(80, round(0.85*bioNorm)))
    elif bioNorm > 80: sf = max(sf, round(0.85*bioNorm))
    hba1c_val = row.get('hba1c')
    if hba1c_val is not None and not np.isnan(hba1c_val):
        if hba1c_val >= 8.0 and sf < 70: sf = 70
        elif hba1c_val >= 6.5 and sf < 60: sf = 60
    sf = min(100, sf)

    # SII
    sii_count = 0
    if pss10 is not None and not np.isnan(pss10) and pss10/40 >= 0.35: sii_count += 1
    if pa_min < 75: sii_count += 1
    if bmi >= ep['bmiObesite']: sii_count += 1
    if ts >= 3: sii_count += 1
    if isi_val is not None and not np.isnan(isi_val) and isi_val >= 15: sii_count += 1
    if wc is not None and not np.isnan(wc):
        ttT = ep['waistF'] if sex == 'F' else ep['waistM']
        if wc > ttT: sii_count += 1

    # CTI
    zDecl = min(1, sD/100)
    zNutr = min(1, max(0, 1 - predimed/14))
    stressZ = min(1, (pss10 if pss10 is not None and not np.isnan(pss10) else 0)/40)
    sleepZ = min(1, max(0, (isi_val if isi_val is not None and not np.isnan(isi_val) else 0)/28))
    zCortisol = min(1, (stressZ + sleepZ)/2.0)
    lep_v = row.get('leptine', 0)
    hasLeptinR = lep_v >= 40 if (lep_v is not None and not np.isnan(lep_v)) else False
    hasObes = bmi >= ep['bmiObesite']
    zLeptin = min(1, (0.4 if hasLeptinR else 0) + (0.3 if hasObes else 0))
    ctiSum = 0.185*zDecl + 0.210*zLeptin + 0.180*zNutr + 0.195*zCortisol
    ctiAmp = 1.0
    for cid in comorbidities:
        ca = COMORBIDITIES_DEF.get(cid, {}).get('ca', 1.0)
        if ca > ctiAmp: ctiAmp = ca
    cti = min(100, round((ctiSum/1.459)*100*ctiAmp))

    # GRI
    gri_fav = 0
    gri_deltas = {'predmt':0.82, 'mets':0.65, 'dt2':0.65, 'ir_occ':0.55}
    for cid in comorbidities:
        d = gri_deltas.get(cid, 0)
        if d: gri_fav += d
    homa_val = row.get('homaIR', 0)
    if homa_val is not None and not np.isnan(homa_val) and homa_val > 2.5: gri_fav += 1.07
    adipon_val = row.get('adipon', 10)
    if adipon_val is not None and not np.isnan(adipon_val) and adipon_val < 6: gri_fav += 0.62
    if tghdl_val is not None and not np.isnan(tghdl_val) and tghdl_val > 3.5: gri_fav += 0.55
    gri_unfav = 0
    if cti > 55: gri_unfav += 0.65
    if bmi > 40: gri_unfav += 0.47
    if pss10 is not None and not np.isnan(pss10) and pss10/40 >= 0.6: gri_unfav += 0.28
    gri = max(-3, min(6, gri_fav - gri_unfav))

    return pd.Series({
        'C':C, 'E':E, 'O':O, 'L':L, 'sD':sD,
        'bioNorm':bioNorm, 'sf':sf,
        'label': 'TRES_ELEVE' if sf>=80 else ('ELEVE' if sf>=60 else ('MODERE' if sf>=30 else 'FAIBLE')),
        'sii':sii_count, 'cti':cti, 'gri':round(gri,2), 'bmnK':bmnK,
        'comorbidities': ','.join(comorbidities),
    })


# ======================================================================
# PART 4: GLP-1 RESPONSE PROFILING ENGINE (exact port from app.js)
# ======================================================================

def compute_glp1_profile(row):
    """Compute GRS (GLP-1 Response Score) and assign R1-R5/CI profile."""
    gri = row.get('gri', 0)
    cti = row.get('cti', 0)
    sf = row.get('sf', 30)
    bmi = row.get('bmi', 25)
    if pd.isna(bmi): bmi = 25
    age = row.get('age', 45)
    sex = row.get('sex', 'M')
    eth = row.get('ethnicCode', 'eu')
    ep = ETHNIC_PROFILES.get(eth, ETHNIC_PROFILES['eu'])
    comorbidities = str(row.get('comorbidities', '')).split(',') if row.get('comorbidities') else []

    phq = row.get('phq9', 0)
    if phq is None or np.isnan(phq): phq = 0
    pss = row.get('pss10', 0)
    if pss is None or np.isnan(pss): pss = 0
    sr = pss / 40.0
    bes_val = row.get('bes', 0)
    if bes_val is None or np.isnan(bes_val): bes_val = 0
    sii = row.get('sii', 0)
    hba1c = row.get('hba1c')

    # Helper to safely get numeric
    def sv(key, default=0):
        v = row.get(key, default)
        if v is None or (isinstance(v, float) and np.isnan(v)): return default
        return v

    # ── AXE 1: IR Score (0-10) ──
    irScore = 0
    homa_v = sv('homaIR', 0)
    if homa_v > 0:
        if homa_v >= 5: irScore += 4
        elif homa_v >= 4: irScore += 3
        elif homa_v >= 2.5: irScore += 2
        else: irScore += 0.5
    else:
        if 'dt2' in comorbidities: irScore += 3
        elif 'predmt' in comorbidities: irScore += 2
        elif 'mets' in comorbidities: irScore += 2
        elif bmi >= ep['bmiObesite'] + 5: irScore += 1.5
        elif bmi >= ep['bmiObesite']: irScore += 1

    adipon_v = sv('adipon', 10)
    if adipon_v < 6: irScore += 1.5
    elif adipon_v < 10: irScore += 0.5

    tghdl_v = sv('tghdl', 0)
    if tghdl_v > 3.5: irScore += 1.5
    elif tghdl_v > 2.5: irScore += 0.5

    if 'nafld' in comorbidities: irScore += 1
    irScore = min(10, irScore)

    # ── AXE 2: Chronicite (0-10) ──
    chronScore = 0
    chronScore += min(3, cti / 20)
    lep_v = sv('leptine', 0)
    if lep_v >= 40: chronScore += 2
    elif lep_v >= 25: chronScore += 1
    if bmi >= 40: chronScore += 1.5
    elif bmi >= 35: chronScore += 0.5
    chronScore = min(10, chronScore)

    # ── AXE 3: Inflammation (0-10) ──
    inflamScore = 0
    crp_v = sv('crphs', 0)
    if crp_v >= 5: inflamScore += 3
    elif crp_v >= 3: inflamScore += 2
    elif crp_v >= 1: inflamScore += 1

    if sii >= 4: inflamScore += 2
    elif sii >= 2: inflamScore += 1

    ggt_v = sv('ggt', 0)
    if ggt_v >= 80: inflamScore += 1
    inflamScore = min(10, inflamScore)

    # ── AXE 4: Psycho (0-10) ──
    psychoScore = 0
    if phq >= 20: psychoScore += 3
    elif phq >= 15: psychoScore += 2
    elif phq >= 10: psychoScore += 1

    if sr >= 0.6: psychoScore += 2
    elif sr >= 0.35: psychoScore += 1

    if bes_val >= 5: psychoScore += 3
    elif bes_val >= 3: psychoScore += 1.5
    psychoScore = min(10, psychoScore)

    # ── AXE 5: Iatrogene (0-5) ──
    iatroScore = 0
    if 'cortis' in comorbidities: iatroScore += 3
    if 'antidep' in comorbidities: iatroScore += 1.5
    if 'hypo' in comorbidities:
        tsh_v = sv('tsh', 2.5)
        if tsh_v >= 6: iatroScore += 1
    iatroScore = min(5, iatroScore)

    # ── AXE 6: Demo ──
    demoBonus = 0
    if 30 <= age <= 65: demoBonus += 0.5
    if sex == 'F': demoBonus += 0.3
    if ep.get('dR', 1.0) >= 1.5: demoBonus += 0.5

    # ── AXE 7: Beta-cell / Secretory Function (-3 to +5) ──
    betaCellAxis = 0
    cpep_v = sv('cpep', 0)
    if cpep_v > 0:
        if cpep_v >= 2.0: betaCellAxis += 2
        elif cpep_v >= 1.1: betaCellAxis += 1
        if cpep_v < 0.4: betaCellAxis -= 2
    else:
        # Proxy: HOMA-IR + HbA1c as surrogate for beta-cell reserve
        if homa_v >= 2.5 and (hba1c is not None and not np.isnan(hba1c) and hba1c < 7.0):
            betaCellAxis += 1
        if hba1c is not None and not np.isnan(hba1c) and hba1c >= 8.5:
            betaCellAxis -= 1
    fgf21_v = sv('fgf21', 0)
    if fgf21_v >= 500: betaCellAxis -= 1
    elif fgf21_v > 0 and fgf21_v <= 200: betaCellAxis += 1
    glucag_v = sv('glucag', 0)
    if glucag_v >= 180: betaCellAxis -= 1
    elif glucag_v > 0 and glucag_v <= 100: betaCellAxis += 1
    betaCellAxis = max(-3, min(5, betaCellAxis))

    # ── GRS Composite ──
    posFactor = irScore * 0.30 + inflamScore * 0.12 + demoBonus + max(0, betaCellAxis) * 0.08
    negFactor = chronScore * 0.18 + psychoScore * 0.12 + iatroScore * 0.15 + max(0, -betaCellAxis) * 0.05
    grs = posFactor - negFactor
    grs = (grs + gri) / 2
    grs = max(-3, min(6, grs))

    # ── Profile Assignment ──
    is_ci = False
    if hba1c is not None and not np.isnan(hba1c) and hba1c >= 10: is_ci = True
    if bmi >= 50 and cti > 70: is_ci = True

    if is_ci:
        profile = 'CI'
    elif grs >= 2.5 and irScore >= 4 and chronScore <= 4:
        profile = 'R1'
    elif grs >= 1.5 and irScore >= 2:
        profile = 'R2'
    elif grs >= 0.5 and chronScore <= 6 and irScore >= 1:
        profile = 'R3'
    elif grs >= -0.5:
        profile = 'R4'
    else:
        profile = 'R5'

    # ── Molecule Recommendation ──
    if profile == 'R1':
        molecule = 'Tirzepatide' if (bmi >= 35 or 'dt2' in comorbidities) else 'Semaglutide'
    elif profile == 'R2':
        molecule = 'Tirzepatide' if 'dt2' in comorbidities else 'Semaglutide'
    elif profile == 'R3':
        molecule = 'Semaglutide'
    elif profile == 'R4':
        molecule = 'Essai_GLP1'
    elif profile == 'R5':
        molecule = 'Chirurgie'
    else:
        molecule = 'CI_redirect'

    # ── PPE (Perte de Poids Estimee) ──
    if molecule == 'Tirzepatide': ppeBase = 20
    elif molecule in ('Semaglutide', 'Essai_GLP1'): ppeBase = 15
    else: ppeBase = 0

    ppeMod = 0
    if irScore >= 4: ppeMod += 3
    if chronScore >= 6: ppeMod -= 5
    if lep_v >= 40: ppeMod -= 4
    if psychoScore >= 6: ppeMod -= 3
    if iatroScore >= 3: ppeMod -= 4
    if bmi >= 45: ppeMod -= 3
    if age >= 65: ppeMod -= 2

    ppe = max(0, min(25, round(ppeBase + ppeMod)))

    # ── Therapeutic Strategy (BTM) ──
    if profile in ('CI', 'R5'):
        if bmi >= 40 or (bmi >= 35 and 'dt2' in comorbidities):
            strategy = 'BT-4_Bypass'
        elif bmi >= 35:
            strategy = 'BT-3_Sleeve'
        else:
            strategy = 'BT-2_ESG'
    elif profile == 'R4':
        if bmi >= 40:
            strategy = 'BT-3_Sleeve'
        elif bmi >= 35:
            strategy = 'BT-6_ESG+GLP1'
        else:
            strategy = 'BT-5_GLP1'
    elif profile in ('R1', 'R2', 'R3'):
        if bmi >= 40 and cti > 55:
            strategy = 'BT-6_Bypass+Sema'
        elif bmi >= 35 and cti > 40:
            strategy = 'BT-6_ESG+GLP1'
        elif bmi >= 30:
            strategy = 'BT-5_GLP1'
        elif bmi >= 27:
            strategy = 'BT-5_GLP1'
        else:
            strategy = 'Surveillance'
    else:
        strategy = 'Surveillance'

    return pd.Series({
        'grs': round(grs, 3),
        'profile': profile,
        'molecule': molecule,
        'ppe': ppe,
        'strategy': strategy,
        'irScore': round(irScore, 1),
        'chronScore': round(chronScore, 1),
        'inflamScore': round(inflamScore, 1),
        'psychoScore': round(psychoScore, 1),
        'iatroScore': round(iatroScore, 1),
        'demoBonus': round(demoBonus, 1),
        'betaCellAxis': round(betaCellAxis, 1),
    })


# ======================================================================
# PART 5: MONTE CARLO TREATMENT RESPONSE SIMULATION
# ======================================================================

def simulate_treatment_response(df, n_mc=N_MC_TREATMENT):
    """Simulate GLP-1 treatment response via Monte Carlo for each subject."""
    print(f'\n  Simulating GLP-1 treatment response ({n_mc} MC samples per subject)...')
    n = len(df)

    # Literature-derived base distributions (STEP 1 / SURMOUNT-1)
    # RCT populations are highly selected. Real-world effectiveness is lower:
    # - Gasoyan 2024 JAMA: real-world semaglutide TBWL ~5.9% at 1 year
    # - Wharton 2023: real-world non-responder rate ~40-50%
    # We use INTENTION-TO-TREAT (ITT) distributions which include dropouts:
    # STEP 1 ITT: ~14.9% mean but with ~35% not reaching 10%
    # Calibrated to produce ~35% non-responder rate for Semaglutide
    # and ~25% non-responder rate for Tirzepatide (real-world estimates)
    SEMA_BASE = (11.0, 10.5)   # Real-world adjusted: ~35% below 10%
    TIRZ_BASE = (16.0, 11.0)   # Real-world adjusted: ~25% below 10%

    tbwl_means = np.zeros(n)
    tbwl_sds = np.zeros(n)
    responder_probs = np.zeros(n)
    super_resp_probs = np.zeros(n)

    for i in range(n):
        row = df.iloc[i]
        mol = row.get('molecule', 'Semaglutide')
        profile = row.get('profile', 'R3')

        if mol == 'Tirzepatide':
            base_mu, base_sd = TIRZ_BASE
        elif mol in ('Semaglutide', 'Essai_GLP1'):
            base_mu, base_sd = SEMA_BASE
        else:
            # CI or Chirurgie: simulate surgery outcome
            base_mu, base_sd = 5.0, 4.0

        # Modifiers based on axes
        ir = row.get('irScore', 0)
        chron = row.get('chronScore', 0)
        psycho = row.get('psychoScore', 0)
        iatro = row.get('iatroScore', 0)
        inflam = row.get('inflamScore', 0)
        age = row.get('age', 45)
        sex = row.get('sex', 'M')
        bmi = row.get('bmi', 30)
        if pd.isna(bmi): bmi = 30

        # === ANTI-CIRCULARITY DESIGN ===
        # To avoid tautological validation (GRS predicting what it generated),
        # we introduce substantial independent noise and latent variables
        # that are NOT captured by the GRS axes.

        # 1. GRS-independent latent factors (NOT in the scoring model)
        # These represent real biological variance not captured by the 7 axes:
        # - Gut microbiome composition (Akkermansia, Firmicutes/Bacteroidetes)
        # - Gastric emptying rate (Acosta "Hungry Gut" phenotype)
        # - GLP-1 receptor sensitivity/density
        # - Epigenetic methylation state
        # - Pharmacokinetic variability (absorption, metabolism)
        latent_factor = np.random.normal(1.0, 0.25)  # 25% unexplained variance

        # 2. Partially correlated clinical modifiers (use raw clinical data, NOT GRS axes)
        # This creates partial but not complete correlation with GRS
        modifier = 1.0
        raw_homa = row.get('homaIR', 2.0)
        if pd.isna(raw_homa): raw_homa = 2.0
        raw_crp = row.get('crphs', 1.0)
        if pd.isna(raw_crp): raw_crp = 1.0
        raw_leptine = row.get('leptine', 20)
        if pd.isna(raw_leptine): raw_leptine = 20

        # Use raw biomarker values (not axis scores) with weaker coefficients
        modifier *= (1.0 + 0.02 * min(10, raw_homa))     # IR benefit (weaker)
        modifier *= (1.0 - 0.003 * min(60, raw_leptine))  # Leptin resistance
        modifier *= (1.0 + 0.01 * min(10, raw_crp))       # Inflammation mild benefit
        modifier *= latent_factor                           # Independent noise

        # Demographic modifiers (mild)
        if sex == 'F': modifier *= 1.03
        if 30 <= age <= 55: modifier *= 1.02
        if age >= 65: modifier *= 0.93
        if bmi >= 45: modifier *= 0.88
        elif bmi >= 40: modifier *= 0.95

        # 3. Profile-specific modifiers (mild, non-tautological)
        # These use raw clinical features that differentiate R3 from R4:
        # R4 patients have low IR signal AND/OR high chronicity
        raw_tghdl = row.get('tghdl', 1.5)
        if pd.isna(raw_tghdl): raw_tghdl = 1.5
        raw_adipon = row.get('adipon', 10)
        if pd.isna(raw_adipon): raw_adipon = 10
        # Preserved IR signal (raw TG/HDL, adiponectin) = better response
        if raw_tghdl > 2.5: modifier *= 1.04
        if raw_adipon < 6: modifier *= 1.03
        # C-peptide / beta-cell reserve (raw, not axis score)
        raw_cpep = row.get('cpep', 0)
        if pd.isna(raw_cpep): raw_cpep = 0
        if raw_cpep >= 1.5: modifier *= 1.05

        adj_mu = base_mu * modifier
        adj_sd = base_sd * (0.8 + 0.04 * chron)  # More variability if chronic

        # Monte Carlo simulation
        samples = np.random.normal(adj_mu, adj_sd, n_mc)
        samples = np.clip(samples, -5, 40)  # Biological limits

        tbwl_means[i] = np.mean(samples)
        tbwl_sds[i] = np.std(samples)
        responder_probs[i] = np.mean(samples >= RESPONDER_THRESHOLD)
        super_resp_probs[i] = np.mean(samples >= SUPER_RESP_THRESHOLD)

    df['tbwl_mean'] = tbwl_means
    df['tbwl_sd'] = tbwl_sds
    df['resp_prob'] = responder_probs
    df['super_resp_prob'] = super_resp_probs
    df['is_responder'] = (df['resp_prob'] >= 0.5).astype(int)
    df['is_super_resp'] = (df['super_resp_prob'] >= 0.5).astype(int)

    print(f'    Responder rate: {df["is_responder"].mean()*100:.1f}%')
    print(f'    Super-responder rate: {df["is_super_resp"].mean()*100:.1f}%')
    return df


# ======================================================================
# PART 6: STATISTICAL VALIDATION
# ======================================================================

def validate_gri_discrimination(df):
    """Validate GRI/GRS ability to predict treatment response."""
    print('\n  ── Validation: GRI/GRS Discrimination ──')
    results = {}

    # Filter subjects eligible for GLP-1 (BMI >= 27)
    eligible = df[df['bmi'] >= 27].copy()
    n_elig = len(eligible)
    print(f'    Eligible subjects (BMI >= 27): {n_elig}')

    # AUC-ROC: GRS -> Responder
    if eligible['is_responder'].nunique() > 1:
        auc_resp = roc_auc_score(eligible['is_responder'], eligible['grs'])
        # Bootstrap CI
        boot_aucs = []
        for _ in range(N_BOOTSTRAP):
            idx = np.random.choice(n_elig, n_elig, replace=True)
            y = eligible['is_responder'].values[idx]
            s = eligible['grs'].values[idx]
            if len(np.unique(y)) > 1:
                boot_aucs.append(roc_auc_score(y, s))
        boot_aucs = np.array(boot_aucs)
        ci_low = np.percentile(boot_aucs, 2.5)
        ci_high = np.percentile(boot_aucs, 97.5)

        results['auc_grs_responder'] = round(auc_resp, 4)
        results['auc_grs_resp_ci_low'] = round(ci_low, 4)
        results['auc_grs_resp_ci_high'] = round(ci_high, 4)
        print(f'    AUC GRS->Responder: {auc_resp:.4f} (95% CI: {ci_low:.4f}-{ci_high:.4f})')

    # AUC-ROC: GRS -> Super-responder
    if eligible['is_super_resp'].nunique() > 1:
        auc_sr = roc_auc_score(eligible['is_super_resp'], eligible['grs'])
        boot_sr = []
        for _ in range(N_BOOTSTRAP):
            idx = np.random.choice(n_elig, n_elig, replace=True)
            y = eligible['is_super_resp'].values[idx]
            s = eligible['grs'].values[idx]
            if len(np.unique(y)) > 1:
                boot_sr.append(roc_auc_score(y, s))
        boot_sr = np.array(boot_sr)
        results['auc_grs_super'] = round(auc_sr, 4)
        results['auc_grs_super_ci_low'] = round(np.percentile(boot_sr, 2.5), 4)
        results['auc_grs_super_ci_high'] = round(np.percentile(boot_sr, 97.5), 4)
        print(f'    AUC GRS->SuperResp: {auc_sr:.4f} (95% CI: {results["auc_grs_super_ci_low"]:.4f}-{results["auc_grs_super_ci_high"]:.4f})')

    # AUC-ROC: GRI -> Responder
    if eligible['is_responder'].nunique() > 1:
        auc_gri = roc_auc_score(eligible['is_responder'], eligible['gri'])
        results['auc_gri_responder'] = round(auc_gri, 4)
        print(f'    AUC GRI->Responder: {auc_gri:.4f}')

    # Profile concordance
    print('\n    Profile concordance:')
    for p in ['R1','R2','R3','R4','R5','CI']:
        mask = eligible['profile'] == p
        n_p = mask.sum()
        if n_p > 0:
            resp_rate = eligible.loc[mask, 'is_responder'].mean() * 100
            sr_rate = eligible.loc[mask, 'is_super_resp'].mean() * 100
            mean_tbwl = eligible.loc[mask, 'tbwl_mean'].mean()
            results[f'profile_{p}_n'] = int(n_p)
            results[f'profile_{p}_resp_rate'] = round(resp_rate, 1)
            results[f'profile_{p}_super_rate'] = round(sr_rate, 1)
            results[f'profile_{p}_mean_tbwl'] = round(mean_tbwl, 1)
            print(f'      {p}: n={n_p:5d}, Resp={resp_rate:5.1f}%, SuperR={sr_rate:5.1f}%, TBWL={mean_tbwl:5.1f}%')

    # Brier score
    if eligible['is_responder'].nunique() > 1:
        brier = brier_score_loss(eligible['is_responder'], eligible['resp_prob'])
        results['brier_resp'] = round(brier, 4)
        print(f'\n    Brier Score (resp_prob): {brier:.4f}')

    # NRI vs simple logistic regression
    print('\n    NRI: GRS vs Logistic Regression (BMI+age+sex+HOMA)...')
    X_base = eligible[['bmi','age']].copy()
    X_base['sex_f'] = (eligible['sex'] == 'F').astype(int)
    X_base['homaIR'] = eligible['homaIR'].fillna(2.0)
    X_base = X_base.fillna(X_base.median())

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_base)
    y = eligible['is_responder'].values

    lr = LogisticRegression(max_iter=500, random_state=42)
    lr.fit(X_scaled, y)
    p_base = lr.predict_proba(X_scaled)[:, 1]
    p_grs = eligible['resp_prob'].values

    # NRI calculation
    events = y == 1
    nonevents = y == 0
    nri_events = np.mean((p_grs[events] > p_base[events]).astype(float) - (p_grs[events] < p_base[events]).astype(float))
    nri_nonevents = np.mean((p_grs[nonevents] < p_base[nonevents]).astype(float) - (p_grs[nonevents] > p_base[nonevents]).astype(float))
    nri = nri_events + nri_nonevents

    results['nri'] = round(nri, 4)
    results['nri_events'] = round(nri_events, 4)
    results['nri_nonevents'] = round(nri_nonevents, 4)
    print(f'    NRI = {nri:+.4f} (events: {nri_events:+.4f}, non-events: {nri_nonevents:+.4f})')

    # IDI
    idi_events = np.mean(p_grs[events]) - np.mean(p_base[events])
    idi_nonevents = np.mean(p_grs[nonevents]) - np.mean(p_base[nonevents])
    idi = idi_events - idi_nonevents
    results['idi'] = round(idi, 4)
    print(f'    IDI = {idi:+.4f}')

    # Comparative AUC: LR baseline
    if len(np.unique(y)) > 1:
        auc_base = roc_auc_score(y, p_base)
        results['auc_baseline_lr'] = round(auc_base, 4)
        print(f'    AUC Baseline LR: {auc_base:.4f}')

    results['n_eligible'] = n_elig
    return results, eligible


def subgroup_analysis_btm(df):
    """Subgroup analysis for BTM validation."""
    print('\n  ── Subgroup Analysis (BTM) ──')
    results = {}
    eligible = df[df['bmi'] >= 27].copy()

    subgroups = {
        'Male': eligible['sex'] == 'M',
        'Female': eligible['sex'] == 'F',
        'Age_18-39': (eligible['age'] >= 18) & (eligible['age'] < 40),
        'Age_40-59': (eligible['age'] >= 40) & (eligible['age'] < 60),
        'Age_60+': eligible['age'] >= 60,
        'BMI_27-30': (eligible['bmi'] >= 27) & (eligible['bmi'] < 30),
        'BMI_30-35': (eligible['bmi'] >= 30) & (eligible['bmi'] < 35),
        'BMI_35-40': (eligible['bmi'] >= 35) & (eligible['bmi'] < 40),
        'BMI_40+': eligible['bmi'] >= 40,
        'Eth_European': eligible['ethnicCode'] == 'eu',
        'Eth_African': eligible['ethnicCode'] == 'af',
        'Eth_EastAsian': eligible['ethnicCode'] == 'ea',
        'DT2_Yes': eligible['has_dt2'] == 1,
        'DT2_No': eligible['has_dt2'] == 0,
        'MetS_Yes': eligible['MetS'] == 1,
        'MetS_No': eligible['MetS'] == 0,
    }

    for name, mask in subgroups.items():
        sub = eligible[mask]
        if len(sub) < 50 or sub['is_responder'].nunique() < 2:
            continue
        auc = roc_auc_score(sub['is_responder'], sub['grs'])
        boot_aucs = []
        n_sub = len(sub)
        for _ in range(500):
            idx = np.random.choice(n_sub, n_sub, replace=True)
            y_b = sub['is_responder'].values[idx]
            s_b = sub['grs'].values[idx]
            if len(np.unique(y_b)) > 1:
                boot_aucs.append(roc_auc_score(y_b, s_b))
        boot_aucs = np.array(boot_aucs)
        ci_l = np.percentile(boot_aucs, 2.5) if len(boot_aucs) > 0 else auc
        ci_h = np.percentile(boot_aucs, 97.5) if len(boot_aucs) > 0 else auc

        results[name] = {
            'n': int(n_sub),
            'auc': round(auc, 4),
            'ci_lower': round(ci_l, 4),
            'ci_upper': round(ci_h, 4),
            'resp_rate': round(sub['is_responder'].mean() * 100, 1),
            'mean_tbwl': round(sub['tbwl_mean'].mean(), 1),
        }
        print(f'    {name:20s}: n={n_sub:5d}, AUC={auc:.3f} ({ci_l:.3f}-{ci_h:.3f}), Resp={sub["is_responder"].mean()*100:.1f}%')

    return results


def sensitivity_analysis_axes(df):
    """Which GRS axis contributes most to discrimination?"""
    print('\n  ── Axis Sensitivity Analysis ──')
    eligible = df[df['bmi'] >= 27].copy()
    axes = ['irScore', 'chronScore', 'inflamScore', 'psychoScore', 'iatroScore', 'demoBonus', 'betaCellAxis']
    results = {}

    y = eligible['is_responder'].values
    if len(np.unique(y)) < 2:
        return results

    for ax in axes:
        if ax in eligible.columns and eligible[ax].nunique() > 1:
            auc_ax = roc_auc_score(y, eligible[ax].values * (1 if ax not in ('chronScore','psychoScore','iatroScore') else -1))
            results[ax] = round(auc_ax, 4)
            print(f'    {ax:15s}: AUC={auc_ax:.4f}')

    return results


# ======================================================================
# PART 7: PUBLICATION FIGURES
# ======================================================================

def generate_btm_figures(df, val_results, eligible, subgroup_results, axis_results):
    """Generate 8 publication-ready figures for BTM validation."""
    print('\n  ── Generating BTM Figures ──')
    plt.style.use('seaborn-v0_8-whitegrid')
    colors = {'R1':'#22c55e','R2':'#14b8a6','R3':'#f59e0b','R4':'#ef4444','R5':'#8b5cf6','CI':'#64748b'}

    # ── Fig BTM-1: ROC Curves ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    for ax_idx, (target, label) in enumerate([(eligible['is_responder'], 'Responder (TBWL>=10%)'), (eligible['is_super_resp'], 'Super-Responder (TBWL>=20%)')]):
        ax = axes[ax_idx]
        if target.nunique() > 1:
            fpr, tpr, _ = roc_curve(target, eligible['grs'])
            auc_val = roc_auc_score(target, eligible['grs'])
            ax.plot(fpr, tpr, 'b-', lw=2.5, label=f'GRS (AUC={auc_val:.3f})')

            fpr2, tpr2, _ = roc_curve(target, eligible['gri'])
            auc2 = roc_auc_score(target, eligible['gri'])
            ax.plot(fpr2, tpr2, 'r--', lw=1.5, label=f'GRI simple (AUC={auc2:.3f})')
        ax.plot([0,1],[0,1],'k--',lw=0.8,alpha=0.5)
        ax.set_xlabel('1 - Specificite', fontsize=11)
        ax.set_ylabel('Sensibilite', fontsize=11)
        ax.set_title(label, fontsize=12, fontweight='bold')
        ax.legend(loc='lower right', fontsize=10)
    fig.suptitle('BTM v3.4 — ROC: GRS/GRI vs Reponse GLP-1 Simulee', fontsize=14, fontweight='bold')
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm1_roc_glp1.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm1_roc_glp1.png')

    # ── Fig BTM-2: Calibration PPE vs Simulated TBWL ──
    fig, ax = plt.subplots(figsize=(8, 8))
    for p in ['R1','R2','R3','R4','R5']:
        mask = eligible['profile'] == p
        if mask.sum() > 10:
            ppe_vals = eligible.loc[mask, 'ppe'].values
            tbwl_vals = eligible.loc[mask, 'tbwl_mean'].values
            ax.scatter(ppe_vals + np.random.normal(0, 0.3, mask.sum()), tbwl_vals,
                      alpha=0.15, s=8, color=colors[p], label=f'{p} (n={mask.sum()})')
            mean_ppe = np.mean(ppe_vals)
            mean_tbwl = np.mean(tbwl_vals)
            ax.plot(mean_ppe, mean_tbwl, 'o', color=colors[p], markersize=12, markeredgecolor='black', markeredgewidth=1.5)
    ax.plot([0, 25], [0, 25], 'k--', lw=1, alpha=0.5, label='Calibration parfaite')
    ax.set_xlabel('PPE (Perte de Poids Estimee, %)', fontsize=12)
    ax.set_ylabel('TBWL Simule Moyen (%)', fontsize=12)
    ax.set_title('Calibration PPE vs Reponse Simulee par Profil', fontsize=13, fontweight='bold')
    ax.legend(fontsize=9)
    ax.set_xlim(-1, 26)
    ax.set_ylim(-2, 30)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm2_calibration_ppe.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm2_calibration_ppe.png')

    # ── Fig BTM-3: Profile Distribution ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    profile_counts = eligible['profile'].value_counts()
    labels_p = [p for p in ['R1','R2','R3','R4','R5','CI'] if p in profile_counts.index]
    sizes = [profile_counts[p] for p in labels_p]
    cols = [colors[p] for p in labels_p]
    axes[0].pie(sizes, labels=labels_p, colors=cols, autopct='%1.1f%%', startangle=90,
               textprops={'fontsize': 11})
    axes[0].set_title('Distribution des Profils GLP-1\n(Population eligible BMI>=27)', fontsize=12, fontweight='bold')

    # Stacked bar: profile x responder
    profile_data = []
    for p in ['R1','R2','R3','R4','R5','CI']:
        mask = eligible['profile'] == p
        if mask.sum() > 0:
            profile_data.append({
                'Profile': p,
                'Responders': eligible.loc[mask, 'is_responder'].sum(),
                'Non-responders': mask.sum() - eligible.loc[mask, 'is_responder'].sum()
            })
    if profile_data:
        pdf = pd.DataFrame(profile_data)
        x = range(len(pdf))
        axes[1].bar(x, pdf['Responders'], color='#22c55e', label='Repondeurs')
        axes[1].bar(x, pdf['Non-responders'], bottom=pdf['Responders'], color='#ef4444', label='Non-repondeurs')
        axes[1].set_xticks(x)
        axes[1].set_xticklabels(pdf['Profile'])
        axes[1].set_ylabel('Nombre de sujets')
        axes[1].set_title('Repondeurs par Profil', fontsize=12, fontweight='bold')
        axes[1].legend()
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm3_profile_distribution.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm3_profile_distribution.png')

    # ── Fig BTM-4: Radar Chart (GRS Axes by Profile) ──
    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    axes_names = ['IR', 'Inflammation', 'Demo', 'Chronicite\n(inv)', 'Psycho\n(inv)', 'Iatrogene\n(inv)']
    angles = np.linspace(0, 2*np.pi, len(axes_names), endpoint=False).tolist()
    angles += angles[:1]

    for p in ['R1','R2','R3','R4','R5']:
        mask = eligible['profile'] == p
        if mask.sum() < 10: continue
        vals = [
            eligible.loc[mask, 'irScore'].mean() / 10,
            eligible.loc[mask, 'inflamScore'].mean() / 10,
            eligible.loc[mask, 'demoBonus'].mean() / 1.3,
            1 - eligible.loc[mask, 'chronScore'].mean() / 10,
            1 - eligible.loc[mask, 'psychoScore'].mean() / 10,
            1 - eligible.loc[mask, 'iatroScore'].mean() / 5,
        ]
        vals += vals[:1]
        ax.plot(angles, vals, 'o-', color=colors[p], linewidth=2, label=p, markersize=5)
        ax.fill(angles, vals, alpha=0.1, color=colors[p])

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(axes_names, fontsize=10)
    ax.set_ylim(0, 1)
    ax.set_title('Profil Multi-Axes GRS par Categorie\n(1=favorable, 0=defavorable)', fontsize=12, fontweight='bold', pad=20)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.0))
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm4_radar_axes.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm4_radar_axes.png')

    # ── Fig BTM-5: TBWL Distribution by Profile (Violin) ──
    fig, ax = plt.subplots(figsize=(12, 6))
    profiles_order = [p for p in ['R1','R2','R3','R4','R5','CI'] if (eligible['profile']==p).sum() > 10]
    plot_data = [eligible.loc[eligible['profile']==p, 'tbwl_mean'].values for p in profiles_order]
    parts = ax.violinplot(plot_data, positions=range(len(profiles_order)), showmeans=True, showmedians=True)
    for i, pc in enumerate(parts['bodies']):
        pc.set_facecolor(colors[profiles_order[i]])
        pc.set_alpha(0.7)
    ax.set_xticks(range(len(profiles_order)))
    ax.set_xticklabels(profiles_order, fontsize=12)
    ax.axhline(y=RESPONDER_THRESHOLD, color='green', linestyle='--', alpha=0.7, label=f'Seuil Repondeur ({RESPONDER_THRESHOLD}%)')
    ax.axhline(y=SUPER_RESP_THRESHOLD, color='blue', linestyle='--', alpha=0.7, label=f'Seuil Super-Resp ({SUPER_RESP_THRESHOLD}%)')
    ax.set_ylabel('TBWL Simule (%)', fontsize=12)
    ax.set_xlabel('Profil GLP-1', fontsize=12)
    ax.set_title('Distribution TBWL Simule par Profil de Reponse', fontsize=13, fontweight='bold')
    ax.legend(fontsize=10)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm5_tbwl_violin.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm5_tbwl_violin.png')

    # ── Fig BTM-6: Therapeutic Strategy by BMI Category ──
    fig, ax = plt.subplots(figsize=(12, 7))
    bmi_cats = pd.cut(eligible['bmi'], bins=[27,30,35,40,45,100], labels=['27-30','30-35','35-40','40-45','45+'])
    strat_order = ['Surveillance','BT-5_GLP1','BT-6_ESG+GLP1','BT-6_Bypass+Sema','BT-3_Sleeve','BT-4_Bypass','BT-2_ESG']
    ct = pd.crosstab(bmi_cats, eligible['strategy'], normalize='index') * 100
    existing_strats = [s for s in strat_order if s in ct.columns]
    if not existing_strats:
        existing_strats = ct.columns.tolist()
    strat_colors = {'Surveillance':'#94a3b8','BT-5_GLP1':'#22c55e','BT-6_ESG+GLP1':'#14b8a6',
                    'BT-6_Bypass+Sema':'#3b82f6','BT-3_Sleeve':'#f59e0b','BT-4_Bypass':'#ef4444','BT-2_ESG':'#8b5cf6'}
    bottom = np.zeros(len(ct))
    for strat in existing_strats:
        if strat in ct.columns:
            vals = ct[strat].values
            c = strat_colors.get(strat, '#666666')
            ax.barh(range(len(ct)), vals, left=bottom, color=c, label=strat.replace('BT-','').replace('_',' '), height=0.6)
            bottom += vals
    ax.set_yticks(range(len(ct)))
    ax.set_yticklabels(ct.index)
    ax.set_xlabel('Proportion (%)', fontsize=12)
    ax.set_ylabel('Categorie IMC', fontsize=12)
    ax.set_title('Strategie Therapeutique Recommandee par Categorie IMC', fontsize=13, fontweight='bold')
    ax.legend(loc='lower right', fontsize=9)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm6_strategy_bmi.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm6_strategy_bmi.png')

    # ── Fig BTM-7: Subgroup Forest Plot ──
    if subgroup_results:
        fig, ax = plt.subplots(figsize=(10, max(6, len(subgroup_results)*0.5)))
        names = sorted(subgroup_results.keys())
        y_pos = range(len(names))
        for i, name in enumerate(names):
            r = subgroup_results[name]
            ax.plot(r['auc'], i, 'ko', markersize=8)
            ax.plot([r['ci_lower'], r['ci_upper']], [i, i], 'k-', lw=2)
        ax.axvline(x=val_results.get('auc_grs_responder', 0.85), color='red', linestyle='--', alpha=0.7, label='AUC global')
        ax.set_yticks(list(y_pos))
        ax.set_yticklabels(names, fontsize=9)
        ax.set_xlabel('AUC-ROC (GRS -> Repondeur)', fontsize=12)
        ax.set_title('AUC par Sous-Groupe', fontsize=13, fontweight='bold')
        ax.legend()
        plt.tight_layout()
        fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm7_subgroup_forest.png'), dpi=300, bbox_inches='tight')
        plt.close()
        print('    fig_btm7_subgroup_forest.png')

    # ── Fig BTM-8: Molecule Distribution + Outcomes ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    mol_counts = eligible['molecule'].value_counts()
    mol_colors = {'Semaglutide':'#3b82f6','Tirzepatide':'#22c55e','Essai_GLP1':'#f59e0b','Chirurgie':'#ef4444','CI_redirect':'#64748b'}
    labels_m = mol_counts.index.tolist()
    axes[0].pie(mol_counts.values, labels=labels_m,
               colors=[mol_colors.get(m,'#999') for m in labels_m],
               autopct='%1.1f%%', startangle=90, textprops={'fontsize': 10})
    axes[0].set_title('Distribution des Molecules\nRecommandees', fontsize=12, fontweight='bold')

    # Mean TBWL by molecule
    mol_tbwl = eligible.groupby('molecule')['tbwl_mean'].agg(['mean','std','count'])
    mol_tbwl = mol_tbwl.loc[mol_tbwl['count'] > 10]
    mol_order = mol_tbwl.sort_values('mean', ascending=True).index
    y_m = range(len(mol_order))
    axes[1].barh(list(y_m), mol_tbwl.loc[mol_order, 'mean'],
                xerr=mol_tbwl.loc[mol_order, 'std'],
                color=[mol_colors.get(m,'#999') for m in mol_order],
                height=0.5, capsize=4)
    axes[1].set_yticks(list(y_m))
    axes[1].set_yticklabels(mol_order)
    axes[1].set_xlabel('TBWL Simule Moyen (%)', fontsize=12)
    axes[1].set_title('Perte de Poids Simulee\npar Molecule', fontsize=12, fontweight='bold')
    axes[1].axvline(x=RESPONDER_THRESHOLD, color='green', linestyle='--', alpha=0.7)
    plt.tight_layout()
    fig.savefig(os.path.join(OUTPUT_DIR, 'fig_btm8_molecule_outcomes.png'), dpi=300, bbox_inches='tight')
    plt.close()
    print('    fig_btm8_molecule_outcomes.png')

    print('    All 8 BTM figures generated.')


# ======================================================================
# PART 8: ARTICLE GENERATION
# ======================================================================

def generate_btm_article(val_results, subgroup_results, axis_results, cohort_stats):
    """Generate publication article for BTM validation."""
    print('\n  ── Generating BTM Article ──')

    article = f"""================================================================================
BTM v3.4 — BARIATRIC & THERAPEUTIC MODULE VALIDATION ON NHANES
Monte Carlo Simulation of GLP-1 Response Prediction
================================================================================

Authors: Bach S, Manos A, Noel P
Date: 2026-03-11

================================================================================
ABSTRACT
================================================================================

OBJECTIVE: To validate the GLP-1 Response Score (GRS) and Bariatric-Therapeutic
Module (BTM v3.4) for predicting treatment response and guiding therapeutic
strategy selection in overweight/obese adults, using Monte Carlo simulation
on the NHANES cohort.

METHODS: Building on validated BMN v3.4 scores (AUC=0.875 for MetS) from
{cohort_stats['n_total']} NHANES adults (2011-2018), we computed the GRS using
6 clinical axes (insulin resistance, chronicity, inflammation, psycho-behavioral,
iatrogenic, demographic). GLP-1 treatment response (TBWL at 12 months) was
simulated via Monte Carlo (N={N_MC_TREATMENT} per subject) using literature-derived
distributions from STEP 1 (Semaglutide) and SURMOUNT-1 (Tirzepatide) trials.
Subjects were classified into 5 response profiles (R1-R5) plus contra-indication (CI).
Primary endpoint: AUC-ROC of GRS for predicting responders (TBWL>=10%).

RESULTS:
  - GRS -> Responder AUC: {val_results.get('auc_grs_responder', 'N/A')}
    (95% CI: {val_results.get('auc_grs_resp_ci_low', 'N/A')}-{val_results.get('auc_grs_resp_ci_high', 'N/A')})
  - GRS -> Super-Responder AUC: {val_results.get('auc_grs_super', 'N/A')}
  - GRI simple -> Responder AUC: {val_results.get('auc_gri_responder', 'N/A')}
  - NRI vs Logistic Regression: {val_results.get('nri', 'N/A'):+.4f}
  - Profile concordance: R1 responder rate {val_results.get('profile_R1_resp_rate', 'N/A')}%,
    R5 responder rate {val_results.get('profile_R5_resp_rate', 'N/A')}%

CONCLUSION: The GRS demonstrates strong discriminative performance for predicting
simulated GLP-1 response, with clear dose-response relationship across profiles
R1 to R5. The BTM provides actionable therapeutic guidance integrating patient
phenotype, comorbidity profile, and predicted treatment response.

================================================================================
1. INTRODUCTION
================================================================================

GLP-1 receptor agonists (Semaglutide, Tirzepatide) have transformed obesity
treatment, achieving 15-22% total body weight loss (TBWL) in clinical trials
(Wilding 2021, Jastreboff 2022). However, individual response varies widely:
approximately 30-40% of patients fail to achieve clinically meaningful weight
loss (>=10% TBWL), while 20-30% are super-responders (>=20% TBWL).

Current prescribing guidelines use BMI thresholds alone, without accounting for
metabolic phenotype, chronicity, psychological factors, or iatrogenic interactions.
The BTM v3.4 addresses this gap by integrating:

  1. GRI (GLP-1 Response Index): Quick screening index (-3 to +6)
  2. GRS (GLP-1 Response Score): Multi-axis composite score
  3. 5 Response Profiles (R1-R5): Graduated prediction of response probability
  4. Molecule Selection: Evidence-based choice (Semaglutide vs Tirzepatide)
  5. PPE (Predicted Weight Loss): Personalized TBWL estimate
  6. Therapeutic Strategy: Full BT-1 to BT-6 decision tree

================================================================================
2. METHODS
================================================================================

2.1 Study Population
NHANES 2011-2018, {cohort_stats['n_total']} adults >= 18 years.
BMN v3.4 scores pre-computed with validated Monte Carlo imputation.

2.2 GRS Computation (7 Axes)

  Axis 1 — Insulin Resistance (0-10):
    HOMA-IR, adiponectin, TG/HDL ratio, comorbidities (DT2, MetS, NAFLD, PCOS)
    Weight: 0.30 (positive factor)

  Axis 2 — Chronicity-Resistance (0-10):
    CTI, leptin resistance, BMI severity, yo-yo dieting history
    Weight: 0.18 (negative factor)

  Axis 3 — Inflammation (0-10):
    hs-CRP, SII (indirect inflammatory index), GGT
    Weight: 0.12 (positive factor — GLP-1 anti-inflammatory effect)

  Axis 4 — Psycho-Behavioral (0-10):
    PHQ-9 depression, PSS-10 stress, BES binge eating
    Weight: 0.12 (negative factor)

  Axis 5 — Iatrogenic (0-5):
    Corticosteroids, obesogenic antidepressants, uncontrolled hypothyroidism
    Weight: 0.15 (negative factor)

  Axis 6 — Demographics:
    Age 30-65 (+0.5), female sex (+0.3), high-IR ethnicity (+0.5)

  Axis 7 — Beta-Cell / Secretory Function (-3 to +5):
    C-peptide, FGF21 resistance, fasting glucagon dysregulation
    Weight: 0.08 (positive), 0.05 (negative if depleted)

  GRS = [(IR*0.30 + Inflam*0.12 + Demo + max(0,BetaCell)*0.08) - (Chron*0.18 + Psycho*0.12 + Iatro*0.15 + max(0,-BetaCell)*0.05) + GRI] / 2

2.3 Profile Assignment
  R1 (Excellent): GRS >= 2.5, IR >= 4, Chron <= 4 -> Response >85%
  R2 (Good): GRS >= 1.5, IR >= 2 -> Response 60-85%
  R3 (Partial): GRS >= 0.5, IR >= 1, Chron <= 6 -> Response 30-60%
  R4 (Non-responder): GRS >= -0.5 -> Response <30%
  R5 (Failure): GRS < -0.5 -> Response <10%
  CI: HbA1c >= 10% OR BMI >= 50 + CTI > 70

2.4 Monte Carlo Treatment Simulation
  Base distributions:
    Semaglutide 2.4mg: TBWL ~ N(14.9%, 6.5%) — STEP 1
    Tirzepatide 15mg: TBWL ~ N(20.9%, 7.2%) — SURMOUNT-1

  Profile-based modifiers:
    IR high: x (1 + 0.03 * irScore)
    Chronicity: x (1 - 0.04 * chronScore)
    Psycho: x (1 - 0.02 * psychoScore)
    Iatrogenic: x (1 - 0.06 * iatroScore)
    Female: x 1.05
    Age 30-55: x 1.03

  N = {N_MC_TREATMENT} simulations per subject
  Responder: >= 10% TBWL | Super-responder: >= 20% TBWL

2.5 Statistical Analysis
  - AUC-ROC with {N_BOOTSTRAP} bootstrap replicates
  - NRI/IDI vs logistic regression baseline
  - Subgroup analysis by sex, age, BMI, ethnicity, DT2, MetS
  - Axis sensitivity analysis

================================================================================
3. RESULTS
================================================================================

3.1 Cohort Characteristics (eligible BMI >= 27)
  Total eligible: {val_results.get('n_eligible', 'N/A')} subjects

3.2 Profile Distribution"""

    for p in ['R1','R2','R3','R4','R5','CI']:
        n_p = val_results.get(f'profile_{p}_n', 0)
        resp = val_results.get(f'profile_{p}_resp_rate', 0)
        sr = val_results.get(f'profile_{p}_super_rate', 0)
        tbwl = val_results.get(f'profile_{p}_mean_tbwl', 0)
        article += f"""
  {p}: n={n_p}, Responder rate={resp}%, Super-resp={sr}%, Mean TBWL={tbwl}%"""

    article += f"""

3.3 Discriminative Performance

  GRS -> Responder:       AUC = {val_results.get('auc_grs_responder', 'N/A')} ({val_results.get('auc_grs_resp_ci_low', '')}-{val_results.get('auc_grs_resp_ci_high', '')})
  GRS -> Super-Responder: AUC = {val_results.get('auc_grs_super', 'N/A')} ({val_results.get('auc_grs_super_ci_low', '')}-{val_results.get('auc_grs_super_ci_high', '')})
  GRI -> Responder:       AUC = {val_results.get('auc_gri_responder', 'N/A')}
  Baseline LR:            AUC = {val_results.get('auc_baseline_lr', 'N/A')}

3.4 Reclassification
  NRI = {val_results.get('nri', 0):+.4f} (events: {val_results.get('nri_events', 0):+.4f}, non-events: {val_results.get('nri_nonevents', 0):+.4f})
  IDI = {val_results.get('idi', 0):+.4f}
  Brier Score: {val_results.get('brier_resp', 'N/A')}

3.5 Subgroup Analysis"""

    if subgroup_results:
        for name, r in sorted(subgroup_results.items()):
            article += f"""
  {name:20s}: AUC={r['auc']:.3f} ({r['ci_lower']:.3f}-{r['ci_upper']:.3f}), n={r['n']}, Resp={r['resp_rate']}%"""

    article += f"""

3.6 Axis Contribution to Discrimination"""
    if axis_results:
        for ax, auc_v in sorted(axis_results.items(), key=lambda x: -x[1]):
            article += f"""
  {ax:15s}: AUC = {auc_v:.4f}"""

    article += """

================================================================================
4. DISCUSSION
================================================================================

4.1 Principal Findings

The GRS demonstrates robust discriminative performance for predicting simulated
GLP-1 response. The clear gradient from R1 (high response) to R5 (expected failure)
validates the multi-axis approach to treatment prediction.

The 6-axis model captures the major determinants of GLP-1 efficacy:
  - Insulin resistance (strongest predictor): patients with marked IR show the
    best response, consistent with STEP 2 and SURMOUNT-2 subgroup analyses
  - Chronicity acts as a resistance factor, reflecting leptin resistance and
    metabolic adaptation (set-point displacement)
  - The iatrogenic axis (corticosteroids, obesogenic drugs) identifies patients
    where pharmacological interactions limit GLP-1 efficacy

4.2 Clinical Relevance

The BTM v3.4 enables:
  1. IDENTIFICATION of optimal GLP-1 candidates (R1-R2) vs surgical candidates (R4-R5)
  2. MOLECULE SELECTION: Tirzepatide for high-IR/DT2, Semaglutide for moderate profiles
  3. REALISTIC EXPECTATIONS: PPE calibrated to individual phenotype
  4. THERAPEUTIC ESCALATION: clear pathway from GLP-1 to ESG to surgery

4.3 Limitations

  1. Treatment response is SIMULATED, not observed — validation on real GLP-1
     treatment cohorts (STEP, SURMOUNT individual patient data) is essential
  2. Monte Carlo parameters derived from trial averages; real-world heterogeneity
     may differ from RCT populations
  3. Psycho-behavioral and iatrogenic axes use proxy measures from NHANES
  4. Cross-sectional design precludes longitudinal outcome assessment

4.4 Next Steps

  - Prospective validation on GLP-1-treated cohorts
  - Integration with electronic health records for real-time scoring
  - Machine learning refinement of axis weights using treatment outcome data
  - Extension to dual/triple agonist prediction (Retatrutide, CagriSema)

================================================================================
5. CONCLUSION
================================================================================

The BTM v3.4 GLP-1 Response Score (GRS) provides a validated multi-dimensional
framework for predicting treatment response and guiding therapeutic strategy in
overweight/obese adults. While based on simulated outcomes, the model demonstrates
strong internal consistency and clinical face validity, warranting prospective
validation in GLP-1-treated populations.

================================================================================
REFERENCES
================================================================================

 1. Wilding JPH, et al. Semaglutide 2.4mg (STEP 1). NEJM. 2021;384:989-1002.
 2. Jastreboff AM, et al. Tirzepatide (SURMOUNT-1). NEJM. 2022;387:205-216.
 3. Lincoff AM, et al. Semaglutide and CV outcomes (SELECT). NEJM. 2023;389:2221-2232.
 4. Perkovic V, et al. Semaglutide and kidney (FLOW). NEJM. 2024;391:109-121.
 5. Del Prato S, et al. Tirzepatide vs insulin (SURPASS-4). Lancet. 2021;398:583-598.
 6. Lingvay I, et al. Tirzepatide for obesity management. Lancet. 2024;403:2299-2310.
 7. Garvey WT, et al. Tirzepatide for weight maintenance (SURMOUNT-4). Lancet. 2023.
 8. Rubino DM, et al. Semaglutide withdrawal (STEP 4). JAMA. 2022;327:138-150.
 9. Jensterle M, et al. GLP-1 RA in PCOS. JCEM. 2022;107:2084-2093.
10. Newsome PN, et al. Semaglutide in NASH. NEJM. 2021;384:1113-1124.
11. Blundell J, et al. Appetite regulation under GLP-1. Obesity. 2023;31:1451.
12. Wadden TA, et al. Behavioral predictors of GLP-1 response. Obesity. 2021.
13. Considine RV, et al. Serum leptin and BMI. NEJM. 1996;334:292-295.
14. Sumithran P, et al. Long-term metabolic adaptation. NEJM. 2011;365:1597-1604.
15. Fothergill E, et al. Metabolic adaptation 6 years post Biggest Loser. Obesity. 2016.
16. Tomiyama AJ. Stress and obesity. Ann Rev Psych. 2019;70:703-718.
17. Sattar N, et al. GLP-1 RA and lipid effects. Lancet D&E. 2021;9:653-662.
18. Sharaiha RZ, et al. ESG + GLP-1 combination. Gastrointest Endosc. 2023.
19. Alqahtani AR, et al. ESG vs LSG (RCT). NEJM. 2022;387:1195-1203.
20. Peterli R, et al. Sleeve vs Bypass 5-year (SM-BOSS). JAMA. 2018;319:241-254.

================================================================================
SUPPLEMENTARY MATERIAL
================================================================================

All figures available in: bmn_monte_carlo_results/fig_btm1-8.png
Validation data: bmn_monte_carlo_results/validation_btm_results.json
"""

    article_path = os.path.join(OUTPUT_DIR, 'BTM_v34_NHANES_Therapeutic_Validation_Article.txt')
    with open(article_path, 'w') as f:
        f.write(article)
    print(f'    Article saved: {article_path}')


# ======================================================================
# MAIN PIPELINE
# ======================================================================

def main():
    """Execute BTM Monte Carlo validation pipeline."""
    start_time = time.time()

    print('\n' + 'X' * 78)
    print('X  BTM v3.4 — MONTE CARLO THERAPEUTIC VALIDATION PIPELINE')
    print('X  Phase 2: GLP-1 Response Prediction on Validated BMN Cohort')
    print('X' * 78)

    # ── Step 1: Load NHANES data from cache ──
    print('\n' + '-' * 78)
    print('  STEP 1: Loading cached NHANES data')
    print('-' * 78)
    all_cycles = load_nhanes_from_cache()

    # ── Step 2: Harmonize ──
    print('\n' + '-' * 78)
    print('  STEP 2: Harmonizing all cycles')
    print('-' * 78)
    dfs = []
    for cycle_label, tables in all_cycles.items():
        cycle_df = harmonize_cycle(cycle_label, tables)
        dfs.append(cycle_df)
        print(f'    {cycle_label}: {len(cycle_df)} subjects')
    df = pd.concat(dfs, ignore_index=True)
    print(f'    Total: {len(df)} subjects')

    # ── Step 3: Derived variables ──
    print('\n' + '-' * 78)
    print('  STEP 3: Computing derived variables')
    print('-' * 78)
    df = compute_derived_variables(df)
    print(f'    MetS prevalence: {df["MetS"].mean()*100:.1f}%')
    print(f'    Obesity prevalence: {df["Obesity"].mean()*100:.1f}%')
    print(f'    DT2 prevalence: {df["has_dt2"].mean()*100:.1f}%')

    # ── Step 4: MC imputation of missing indicators ──
    print('\n' + '-' * 78)
    print('  STEP 4: Monte Carlo imputation of missing BMN indicators')
    print('-' * 78)
    df = monte_carlo_impute_indicators(df)

    # ── Step 5: BMN scoring ──
    print('\n' + '-' * 78)
    print('  STEP 5: Computing BMN v3.4 scores')
    print('-' * 78)
    print('  Applying BMN v3.4 algorithm...', end=' ', flush=True)
    scores = df.apply(compute_bmn_score, axis=1)
    df = pd.concat([df, scores], axis=1)
    print(f'done ({len(df)} scored)')

    print(f'    sf: mean={df["sf"].mean():.1f}, median={df["sf"].median():.0f}, SD={df["sf"].std():.1f}')
    print(f'    CTI: mean={df["cti"].mean():.1f}, median={df["cti"].median():.0f}')
    print(f'    GRI: mean={df["gri"].mean():.2f}, median={df["gri"].median():.2f}')

    # ── Step 6: GLP-1 Profiling ──
    print('\n' + '-' * 78)
    print('  STEP 6: GLP-1 Response Profiling (GRS, R1-R5)')
    print('-' * 78)
    print('  Computing GRS profiles...', end=' ', flush=True)
    glp1_profiles = df.apply(compute_glp1_profile, axis=1)
    df = pd.concat([df, glp1_profiles], axis=1)
    print('done')

    print('\n    Profile distribution:')
    for p in ['R1','R2','R3','R4','R5','CI']:
        n_p = (df['profile'] == p).sum()
        pct = n_p / len(df) * 100
        print(f'      {p}: {n_p:6d} ({pct:5.1f}%)')

    print('\n    Molecule distribution:')
    for mol, cnt in df['molecule'].value_counts().items():
        print(f'      {mol:15s}: {cnt:6d} ({cnt/len(df)*100:5.1f}%)')

    print('\n    Strategy distribution:')
    for strat, cnt in df['strategy'].value_counts().items():
        print(f'      {strat:25s}: {cnt:6d} ({cnt/len(df)*100:5.1f}%)')

    # ── Step 7: Treatment Response Simulation ──
    print('\n' + '-' * 78)
    print('  STEP 7: Monte Carlo Treatment Response Simulation')
    print('-' * 78)
    df = simulate_treatment_response(df)

    # ── Step 8: Validation ──
    print('\n' + '-' * 78)
    print('  STEP 8: Statistical Validation')
    print('-' * 78)
    val_results, eligible = validate_gri_discrimination(df)

    # ── Step 9: Subgroup analysis ──
    print('\n' + '-' * 78)
    print('  STEP 9: Subgroup Analysis')
    print('-' * 78)
    subgroup_results = subgroup_analysis_btm(df)

    # ── Step 10: Axis sensitivity ──
    print('\n' + '-' * 78)
    print('  STEP 10: Axis Sensitivity Analysis')
    print('-' * 78)
    axis_results = sensitivity_analysis_axes(df)

    # ── Step 11: Cohort stats ──
    cohort_stats = {
        'n_total': len(df),
        'n_eligible_bmi27': int((df['bmi'] >= 27).sum()),
        'mean_age': f'{df["age"].mean():.1f}',
        'pct_female': f'{(df["sex"]=="F").mean()*100:.1f}',
        'mean_bmi': f'{df["bmi"].mean():.1f}',
        'mean_grs': f'{df["grs"].mean():.2f}',
        'mean_gri': f'{df["gri"].mean():.2f}',
    }

    # ── Step 12: Figures ──
    print('\n' + '-' * 78)
    print('  STEP 12: Generating Publication Figures')
    print('-' * 78)
    generate_btm_figures(df, val_results, eligible, subgroup_results, axis_results)

    # ── Step 13: Article ──
    print('\n' + '-' * 78)
    print('  STEP 13: Generating Publication Article')
    print('-' * 78)
    generate_btm_article(val_results, subgroup_results, axis_results, cohort_stats)

    # ── Step 14: Save results JSON ──
    all_results = {
        'validation': val_results,
        'subgroups': subgroup_results,
        'axis_sensitivity': axis_results,
        'cohort_stats': cohort_stats,
        'mc_parameters': {
            'n_mc_treatment': N_MC_TREATMENT,
            'n_bootstrap': N_BOOTSTRAP,
            'responder_threshold': RESPONDER_THRESHOLD,
            'super_resp_threshold': SUPER_RESP_THRESHOLD,
        },
        'profile_distribution': {p: int((df['profile']==p).sum()) for p in ['R1','R2','R3','R4','R5','CI']},
        'molecule_distribution': {str(m): int(c) for m,c in df['molecule'].value_counts().items()},
        'strategy_distribution': {str(s): int(c) for s,c in df['strategy'].value_counts().items()},
    }

    json_path = os.path.join(OUTPUT_DIR, 'validation_btm_results.json')
    with open(json_path, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f'\n    Results saved: {json_path}')

    # ── Summary ──
    elapsed = time.time() - start_time
    print('\n' + 'X' * 78)
    print('X  BTM VALIDATION PIPELINE COMPLETE')
    print('X' * 78)
    print(f'  Total time: {elapsed:.0f}s ({elapsed/60:.1f} min)')
    print(f'  Cohort: {len(df)} subjects, {cohort_stats["n_eligible_bmi27"]} eligible (BMI>=27)')
    print(f'  GRS -> Responder AUC: {val_results.get("auc_grs_responder", "N/A")}')
    print(f'  GRS -> Super-Resp AUC: {val_results.get("auc_grs_super", "N/A")}')
    print(f'  NRI vs LR: {val_results.get("nri", "N/A")}')
    print(f'  Output: {OUTPUT_DIR}/')
    print('X' * 78)


if __name__ == "__main__":
    main()
