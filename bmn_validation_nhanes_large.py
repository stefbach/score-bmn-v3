"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.0 — VALIDATION SUR COHORTE ÉLARGIE NHANES (4 CYCLES)
═══════════════════════════════════════════════════════════════════════════

Cohorte poolée : NHANES 2011-2012, 2013-2014, 2015-2016, 2017-2018
~20,000+ adultes ≥ 18 ans

Pipeline identique au script original :
  1. Récupération multi-tables NHANES (4 cycles)
  2. Imputation Monte Carlo (MICE)
  3. Application du SCORE BMN v3.0
  4. Validation statistique complète
  5. Comparaison avec la cohorte simple (2017-2018)
"""

import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LogisticRegression, BayesianRidge
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.metrics import roc_auc_score, roc_curve, brier_score_loss
from sklearn.calibration import calibration_curve
from sklearn.preprocessing import StandardScaler
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
import statsmodels.api as sm
import os, json, urllib.request, tempfile, time

np.random.seed(42)
OUTPUT_DIR = '/home/user/bmn_validation_large'
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("  SCORE BMN v3.0 — VALIDATION COHORTE ÉLARGIE (4 CYCLES NHANES)")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════
# PARTIE 1 : RÉCUPÉRATION DES DONNÉES NHANES — 4 CYCLES
# ═══════════════════════════════════════════════════════════════════════

# Suffixes et années pour chaque cycle NHANES
CYCLES = {
    '2011-2012': {'suffix': 'G', 'year': 2011},
    '2013-2014': {'suffix': 'H', 'year': 2013},
    '2015-2016': {'suffix': 'I', 'year': 2015},
    '2017-2018': {'suffix': 'J', 'year': 2017},
}

# Tables nécessaires
TABLES = {
    'DEMO':  'Démographie',
    'BMX':   'Anthropométrie',
    'BIOPRO':'Biochimie',
    'GHB':   'HbA1c',
    'TRIGLY':'Triglycérides',
    'HDL':   'HDL cholestérol',
    'TCHOL': 'Cholestérol total',
    'INS':   'Insuline',
    'HSCRP': 'CRP ultrasensible',
    'DPQ':   'PHQ-9 (dépression)',
    'SLQ':   'Sommeil',
    'PAQ':   'Activité physique',
    'SMQ':   'Tabagisme',
    'ALQ':   'Alcool',
    'DIQ':   'Diabète',
    'BPQ':   'Hypertension',
    'MCQ':   'Conditions médicales',
}

def fetch_nhanes(table_name, suffix, year, max_retries=3):
    """Télécharge une table NHANES via l'URL CDC."""
    url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{year}/DataFiles/{table_name}_{suffix}.XPT"
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Research/BMN-Validation)'})
            resp = urllib.request.urlopen(req, timeout=90)
            data = resp.read()
            tmp = tempfile.NamedTemporaryFile(suffix='.xpt', delete=False)
            tmp.write(data)
            tmp.close()
            df = pd.read_sas(tmp.name, format='xport')
            os.unlink(tmp.name)
            return df
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
            else:
                print(f"    ✗ {table_name}_{suffix}: {e}")
                return None


print("\n[1/6] Récupération des données NHANES — 4 cycles...")

all_cycle_data = {}

for cycle_name, cycle_info in CYCLES.items():
    suffix = cycle_info['suffix']
    year = cycle_info['year']
    print(f"\n  ── Cycle {cycle_name} (suffix={suffix}) ──")

    cycle_tables = {}
    for table_name, desc in TABLES.items():
        df_table = fetch_nhanes(table_name, suffix, year)
        if df_table is not None:
            print(f"    ✓ {table_name}: {len(df_table):,} obs")
            cycle_tables[table_name] = df_table
        else:
            print(f"    ✗ {table_name}: non disponible")

    all_cycle_data[cycle_name] = cycle_tables


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 2 : FUSION ET HARMONISATION — TOUS LES CYCLES
# ═══════════════════════════════════════════════════════════════════════

print("\n[2/6] Fusion et harmonisation des données (tous cycles)...")

def safe_merge(left, right, cols, on='SEQN'):
    if right is None:
        return left
    keep = [on] + [c for c in cols if c in right.columns]
    return left.merge(right[keep], on=on, how='left')

def process_cycle(cycle_name, tables):
    """Traite un cycle NHANES et retourne un DataFrame harmonisé."""

    demo = tables.get('DEMO')
    if demo is None:
        return None

    # Colonnes démographiques (noms stables entre cycles)
    df = demo[['SEQN', 'RIDAGEYR', 'RIAGENDR']].copy()

    # Ethnicité : RIDRETH3 (2011+) ou RIDRETH1 (fallback)
    if 'RIDRETH3' in demo.columns:
        df['race_eth'] = demo['RIDRETH3']
    elif 'RIDRETH1' in demo.columns:
        df['race_eth'] = demo['RIDRETH1']
    else:
        df['race_eth'] = np.nan

    df.columns = ['SEQN', 'age', 'sex_code', 'race_eth']
    df = df[df['age'] >= 18].copy()

    df['sex'] = df['sex_code'].map({1: 'M', 2: 'F'})
    ETH_MAP = {1: 'im', 2: 'im', 3: 'eu', 4: 'af', 6: 'ea', 7: 'eu'}
    df['ethnicCode'] = df['race_eth'].map(ETH_MAP).fillna('eu')
    df['cycle'] = cycle_name

    # Anthropométrie
    bmx = tables.get('BMX')
    if bmx is not None:
        df = safe_merge(df, bmx, ['BMXBMI', 'BMXWAIST', 'BMXHT'])
        df.rename(columns={'BMXBMI': 'bmi', 'BMXWAIST': 'waist', 'BMXHT': 'height_cm'}, inplace=True)
        df['whtr'] = df['waist'] / df['height_cm']

    # Biochimie
    biopro = tables.get('BIOPRO')
    if biopro is not None:
        df = safe_merge(df, biopro, ['LBXSGL', 'LBXSASSI', 'LBXSGB', 'LBXSUA'])
        df.rename(columns={
            'LBXSGL': 'glucose_mgdl',
            'LBXSASSI': 'asat_uL',
            'LBXSGB': 'ggt_uL',
            'LBXSUA': 'urate_mgdl',
        }, inplace=True)
        df['glyc'] = df['glucose_mgdl'] / 18.0
        df['asat'] = df['asat_uL']
        df['ggt']  = df['ggt_uL']
        df['urate'] = df['urate_mgdl'] * 59.48

    # HbA1c
    ghb = tables.get('GHB')
    if ghb is not None:
        df = safe_merge(df, ghb, ['LBXGH'])
        df.rename(columns={'LBXGH': 'hba1c'}, inplace=True)

    # Triglycérides
    trigly = tables.get('TRIGLY')
    if trigly is not None:
        df = safe_merge(df, trigly, ['LBXTR'])
        df.rename(columns={'LBXTR': 'tg_mgdl'}, inplace=True)
        df['tg'] = df['tg_mgdl'] / 88.57

    # HDL
    hdl_t = tables.get('HDL')
    if hdl_t is not None:
        # HDL variable name differs between cycles
        hdl_col = None
        for candidate in ['LBDHDD', 'LBDHDL']:
            if candidate in hdl_t.columns:
                hdl_col = candidate
                break
        if hdl_col:
            df = safe_merge(df, hdl_t, [hdl_col])
            df.rename(columns={hdl_col: 'hdl_mgdl'}, inplace=True)
            df['hdl'] = df['hdl_mgdl'] / 38.67

    # Cholestérol total → LDL Friedewald
    tchol = tables.get('TCHOL')
    if tchol is not None:
        df = safe_merge(df, tchol, ['LBXTC'])
        df.rename(columns={'LBXTC': 'tc_mgdl'}, inplace=True)
        df['tc_mmol'] = df['tc_mgdl'] / 38.67
        if 'hdl' in df.columns and 'tg' in df.columns:
            df['ldl'] = df['tc_mmol'] - df['hdl'] - df['tg'] / 2.2

    # Insuline → HOMA-IR
    ins = tables.get('INS')
    if ins is not None:
        df = safe_merge(df, ins, ['LBXIN'])
        df.rename(columns={'LBXIN': 'insulin_uU'}, inplace=True)
        if 'glucose_mgdl' in df.columns:
            df['homaIR'] = (df['glucose_mgdl'] * df['insulin_uU']) / 405.0

    # CRP
    hscrp = tables.get('HSCRP')
    if hscrp is not None:
        df = safe_merge(df, hscrp, ['LBXHSCRP'])
        df.rename(columns={'LBXHSCRP': 'crphs'}, inplace=True)

    # TG/HDL ratio
    if 'tg' in df.columns and 'hdl' in df.columns:
        df['tghdl'] = df['tg'] / df['hdl']

    # PHQ-9
    dpq = tables.get('DPQ')
    if dpq is not None:
        phq_cols = [f'DPQ0{i}0' for i in range(1, 10)]
        avail_phq = [c for c in phq_cols if c in dpq.columns]
        if avail_phq:
            dpq_sub = dpq[['SEQN'] + avail_phq].copy()
            for c in avail_phq:
                dpq_sub[c] = dpq_sub[c].replace({7: np.nan, 9: np.nan})
            dpq_sub['phq9'] = dpq_sub[avail_phq].sum(axis=1, min_count=7)
            df = df.merge(dpq_sub[['SEQN', 'phq9']], on='SEQN', how='left')

    # Sommeil
    slq = tables.get('SLQ')
    if slq is not None:
        sleep_col = None
        for candidate in ['SLD012', 'SLD010H']:
            if candidate in slq.columns:
                sleep_col = candidate
                break
        if sleep_col:
            df = safe_merge(df, slq, [sleep_col])
            df.rename(columns={sleep_col: 'sleepHours'}, inplace=True)

    # Activité physique
    paq = tables.get('PAQ')
    if paq is not None:
        df = safe_merge(df, paq, ['PAQ610', 'PAD615', 'PAQ625', 'PAD630', 'PAQ655', 'PAD660', 'PAQ670', 'PAD675'])
        for col in ['PAD615', 'PAD630', 'PAD660', 'PAD675']:
            if col in df.columns:
                df[col] = df[col].replace({9999: np.nan, 7777: np.nan})
        vig_work = pd.to_numeric(df.get('PAD615', 0), errors='coerce').fillna(0)
        mod_work = pd.to_numeric(df.get('PAD630', 0), errors='coerce').fillna(0)
        vig_rec  = pd.to_numeric(df.get('PAD660', 0), errors='coerce').fillna(0)
        mod_rec  = pd.to_numeric(df.get('PAD675', 0), errors='coerce').fillna(0)
        df['physicalActivityMinWeek'] = vig_work + mod_work + vig_rec + mod_rec

    # Tabagisme
    smq = tables.get('SMQ')
    if smq is not None:
        df = safe_merge(df, smq, ['SMQ020', 'SMQ040'])
        def map_tobacco(row):
            if row.get('SMQ020') == 2 or pd.isna(row.get('SMQ020')):
                return 0
            if row.get('SMQ040') == 3:
                return 1
            if row.get('SMQ040') == 2:
                return 3
            if row.get('SMQ040') == 1:
                return 4
            return 0
        df['tobaccoStatus'] = df.apply(map_tobacco, axis=1)

    # Alcool
    alq = tables.get('ALQ')
    if alq is not None:
        # ALQ variable names differ slightly between cycles
        alq_freq_col = None
        for candidate in ['ALQ121', 'ALQ120Q']:
            if candidate in alq.columns:
                alq_freq_col = candidate
                break
        alq_qty_col = None
        for candidate in ['ALQ130', 'ALQ141Q']:
            if candidate in alq.columns:
                alq_qty_col = candidate
                break

        if alq_freq_col and alq_qty_col:
            df = safe_merge(df, alq, [alq_freq_col, alq_qty_col])
            drinks_day = pd.to_numeric(df.get(alq_qty_col, 0), errors='coerce').fillna(0)
            freq = pd.to_numeric(df.get(alq_freq_col, 0), errors='coerce').fillna(0)
            freq_map = {0: 0, 1: 30, 2: 20, 3: 12, 4: 6, 5: 4, 6: 2, 7: 1, 8: 0.5, 9: 0.1, 10: 0, 77: 0, 99: 0}
            days_per_month = freq.map(freq_map).fillna(0)
            df['drinksPerWeek'] = (drinks_day * days_per_month * 12 / 52).clip(0, 50)

    # Diabète
    diq = tables.get('DIQ')
    if diq is not None:
        df = safe_merge(df, diq, ['DIQ010'])
        df['has_diabetes'] = (df['DIQ010'] == 1).astype(int)

    # Hypertension
    bpq = tables.get('BPQ')
    if bpq is not None:
        df = safe_merge(df, bpq, ['BPQ020'])
        df['has_hta'] = (df['BPQ020'] == 1).astype(int)

    # Thyroïde
    mcq = tables.get('MCQ')
    if mcq is not None:
        df = safe_merge(df, mcq, ['MCQ160F'])
        df['has_hypo'] = (df.get('MCQ160F') == 1).astype(int)

    return df


# Traiter chaque cycle et combiner
cycle_dfs = []
for cycle_name, tables in all_cycle_data.items():
    print(f"\n  Traitement du cycle {cycle_name}...")
    df_cycle = process_cycle(cycle_name, tables)
    if df_cycle is not None:
        print(f"    → {len(df_cycle):,} adultes")
        cycle_dfs.append(df_cycle)

# Combiner tous les cycles
df = pd.concat(cycle_dfs, ignore_index=True)
print(f"\n  ═══ COHORTE TOTALE POOLÉE : {len(df):,} adultes ═══")

# --- Variables cibles ---
def compute_mets_outcome(row):
    criteria = 0
    if row['sex'] == 'F':
        if row.get('waist', 0) > 88: criteria += 1
        if row.get('hdl', 999) < 1.3: criteria += 1
    else:
        if row.get('waist', 0) > 102: criteria += 1
        if row.get('hdl', 999) < 1.0: criteria += 1
    if row.get('tg', 0) >= 1.7: criteria += 1
    if row.get('glyc', 0) >= 5.6 or row.get('has_diabetes', 0) == 1: criteria += 1
    if row.get('has_hta', 0) == 1: criteria += 1
    return int(criteria >= 3)

df['mets_outcome'] = df.apply(compute_mets_outcome, axis=1)
df['obesity_outcome'] = (df['bmi'] >= 30).astype(int)

# Colonnes d'analyse
analysis_cols = [
    'SEQN', 'cycle', 'age', 'sex', 'ethnicCode', 'bmi', 'waist', 'whtr', 'height_cm',
    'homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl',
    'asat', 'ggt', 'urate',
    'phq9', 'sleepHours', 'physicalActivityMinWeek', 'tobaccoStatus',
    'drinksPerWeek', 'has_diabetes', 'has_hta', 'has_hypo',
    'mets_outcome', 'obesity_outcome'
]
analysis_cols = [c for c in analysis_cols if c in df.columns]
df = df[analysis_cols].copy()

print(f"\n  Dataset fusionné : {len(df):,} observations, {len(df.columns)} variables")
print(f"  Prévalence MetS : {df['mets_outcome'].mean()*100:.1f}%")
print(f"  Prévalence Obésité : {df['obesity_outcome'].mean()*100:.1f}%")

# Distribution par cycle
print(f"\n  Distribution par cycle :")
for cycle in df['cycle'].unique():
    n = (df['cycle'] == cycle).sum()
    print(f"    {cycle}: {n:,}")

print(f"\n  Données manquantes par variable :")
miss = df.isnull().sum()
for c in miss[miss > 0].index:
    pct = miss[c] / len(df) * 100
    print(f"    {c}: {miss[c]:,} ({pct:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 3 : IMPUTATION MONTE CARLO (MICE)
# ═══════════════════════════════════════════════════════════════════════

print("\n[3/6] Imputation Monte Carlo (MICE)...")

class MICEImputer:
    def __init__(self, n_imputations=25, n_iterations=15, random_state=42):
        self.n_imputations = n_imputations
        self.n_iterations = n_iterations
        self.rng = np.random.RandomState(random_state)

    def impute(self, df, numeric_cols):
        imputed_datasets = []
        for m in range(self.n_imputations):
            df_imp = df.copy()
            seed = self.rng.randint(0, 2**31)
            rng_m = np.random.RandomState(seed)

            for col in numeric_cols:
                mask = df_imp[col].isnull()
                if mask.sum() == 0:
                    continue
                median_val = df_imp[col].median()
                std_val = df_imp[col].std()
                if pd.isna(median_val): median_val = 0
                if pd.isna(std_val) or std_val == 0: std_val = 1
                noise = rng_m.normal(0, std_val * 0.1, mask.sum())
                df_imp.loc[mask, col] = median_val + noise

            for iteration in range(self.n_iterations):
                for col in numeric_cols:
                    mask = df[col].isnull()
                    if mask.sum() == 0:
                        continue
                    predictors = [c for c in numeric_cols if c != col]
                    X_train = df_imp.loc[~mask, predictors].fillna(0).values
                    y_train = df_imp.loc[~mask, col].values
                    if len(X_train) < 10:
                        continue
                    model = BayesianRidge()
                    model.fit(X_train, y_train)
                    X_pred = df_imp.loc[mask, predictors].fillna(0).values
                    y_pred = model.predict(X_pred)
                    sigma = np.sqrt(1.0 / model.alpha_)
                    noise = rng_m.normal(0, sigma, len(y_pred))
                    df_imp.loc[mask, col] = y_pred + noise

            imputed_datasets.append(df_imp)
            if (m + 1) % 5 == 0:
                print(f"  Imputation {m+1}/{self.n_imputations} complétée")
        return imputed_datasets

impute_cols = [
    'bmi', 'waist', 'whtr', 'homaIR', 'hba1c', 'crphs', 'tghdl',
    'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate',
    'phq9', 'sleepHours', 'physicalActivityMinWeek', 'drinksPerWeek'
]
impute_cols = [c for c in impute_cols if c in df.columns]

mice = MICEImputer(n_imputations=25, n_iterations=15, random_state=42)
imputed_datasets = mice.impute(df, impute_cols)
print(f"  ✓ {len(imputed_datasets)} jeux de données imputés")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 4 : ALGORITHME SCORE BMN v3.0
# ═══════════════════════════════════════════════════════════════════════

print("\n[4/6] Application du SCORE BMN v3.0...")

ETHNIC_PROFILES = {
    'eu': {'bmiSurpoids':25, 'bmiObesite':30, 'waistF':88, 'waistM':102, 'dR':1.0,'hR':1.0,'cR':1.0,'iM':1.0,'ev':0},
    'im': {'bmiSurpoids':23, 'bmiObesite':27.5,'waistF':80, 'waistM':90,  'dR':2.0,'hR':1.2,'cR':1.4,'iM':1.2,'ev':-1.5},
    'cr': {'bmiSurpoids':25, 'bmiObesite':30,  'waistF':84, 'waistM':94,  'dR':1.3,'hR':1.4,'cR':1.2,'iM':1.2,'ev':-2},
    'si': {'bmiSurpoids':23, 'bmiObesite':27.5,'waistF':80, 'waistM':90,  'dR':1.0,'hR':0.9,'cR':0.6,'iM':0.9,'ev':1.5},
    'sa': {'bmiSurpoids':23, 'bmiObesite':27.5,'waistF':80, 'waistM':90,  'dR':2.0,'hR':1.3,'cR':1.5,'iM':1.2,'ev':-1.5},
    'af': {'bmiSurpoids':25, 'bmiObesite':30,  'waistF':88, 'waistM':102, 'dR':1.3,'hR':1.5,'cR':1.2,'iM':1.3,'ev':-1.5},
    'ea': {'bmiSurpoids':23, 'bmiObesite':27.5,'waistF':80, 'waistM':88,  'dR':0.9,'hR':0.9,'cR':0.7,'iM':0.9,'ev':1.5},
    'se': {'bmiSurpoids':23, 'bmiObesite':27.5,'waistF':80, 'waistM':90,  'dR':1.2,'hR':1.0,'cR':1.0,'iM':1.0,'ev':0},
    'fm': {'bmiSurpoids':25, 'bmiObesite':30,  'waistF':88, 'waistM':102, 'dR':0.8,'hR':1.0,'cR':0.9,'iM':1.0,'ev':1},
}

BIOMARKERS = {
    'homaIR':  {'w':2.5, 'normal':2.5, 'abnormal':4.0,  'inv':False},
    'hba1c':   {'w':2.0, 'normal':5.7, 'abnormal':6.5,  'inv':False},
    'crphs':   {'w':2.0, 'normal':1.0, 'abnormal':3.0,  'inv':False},
    'tghdl':   {'w':2.0, 'normal':2.0, 'abnormal':3.5,  'inv':False},
    'glyc':    {'w':1.8, 'normal':5.6, 'abnormal':7.0,  'inv':False},
    'ldl':     {'w':1.8, 'normal':3.0, 'abnormal':4.1,  'inv':False},
    'tg':      {'w':1.5, 'normal':1.7, 'abnormal':2.3,  'inv':False},
    'hdl':     {'w':1.0, 'normal':1.0, 'abnormal':0.7,  'inv':True},
    'asat':    {'w':1.0, 'normal':40,  'abnormal':60,   'inv':False},
    'ggt':     {'w':0.8, 'normal':50,  'abnormal':80,   'inv':False},
    'urate':   {'w':0.8, 'normal':360, 'abnormal':420,  'inv':False},
}

def compute_bmn_row(row):
    eth = row.get('ethnicCode', 'eu')
    ep = ETHNIC_PROFILES.get(eth, ETHNIC_PROFILES['eu'])
    age = row.get('age', 40)
    sex = row.get('sex', 'M')
    bmi_val = row.get('bmi', 25)
    waist_val = row.get('waist', 80)
    whtr_val = row.get('whtr', 0.5)

    if age >= 65: c1 = 10
    elif age >= 55: c1 = 7
    elif age >= 45: c1 = 5
    elif age >= 40: c1 = 2
    else: c1 = 0

    c2 = 2 if (sex == 'M' and age < 60) else 0

    thresh_s = ep['bmiSurpoids']
    thresh_o = ep['bmiObesite']
    if bmi_val >= thresh_o + 5: imc_pts = 7
    elif bmi_val >= thresh_o: imc_pts = 5
    elif bmi_val >= thresh_s: imc_pts = 3
    else: imc_pts = 0
    if whtr_val >= 0.60: whtr_pts = 3
    elif whtr_val >= 0.55: whtr_pts = 2
    elif whtr_val >= 0.50: whtr_pts = 1
    else: whtr_pts = 0
    tt_thresh = ep['waistF'] if sex == 'F' else ep['waistM']
    diff = waist_val - tt_thresh
    if diff > 10: tt_pts = 2
    elif diff > 0: tt_pts = 1
    else: tt_pts = 0
    c3 = min(12, imc_pts + whtr_pts + tt_pts)

    bmn_k = 0
    if row.get('has_diabetes', 0) == 1: bmn_k += 14 * ep['dR'] * ep['cR']
    if row.get('has_hta', 0) == 1: bmn_k += 10 * ep['hR'] * ep['cR']
    if row.get('has_hypo', 0) == 1: bmn_k += 6 * ep['cR']
    if row.get('mets_outcome', 0) == 1: bmn_k += 12 * ep['cR']
    bmn_k = min(50, bmn_k)
    c4 = round((bmn_k / 50) * 10)

    c5 = 0

    tob = int(row.get('tobaccoStatus', 0))
    c6 = [0, 1, 2, 4, 8][min(tob, 4)]

    phq9 = row.get('phq9', 0)
    if phq9 >= 20: c7 = 4
    elif phq9 >= 15: c7 = 3
    elif phq9 >= 10: c7 = 2
    elif phq9 >= 5: c7 = 1
    else: c7 = 0

    sleep_h = row.get('sleepHours', 7)
    if sleep_h < 5: c8 = 3
    elif sleep_h < 6: c8 = 2
    elif sleep_h < 7: c8 = 1
    else: c8 = 0

    c_raw = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8
    C = min(50, round(c_raw * (1 + ep['ev'] / 100)))

    E = 0
    O = 0

    pa = row.get('physicalActivityMinWeek', 150)
    if pa >= 150: l1 = 0
    elif pa >= 75: l1 = 1
    elif pa >= 30: l1 = 2
    else: l1 = 3
    l2 = 0
    dpw = row.get('drinksPerWeek', 0)
    if dpw > 21: l3 = 2
    elif dpw > 14: l3 = 1
    else: l3 = 0
    if sleep_h < 6: l4 = 2
    elif sleep_h < 7: l4 = 1
    else: l4 = 0
    L = min(10, l1 + l2 + l3 + l4)

    sD = min(100, C + E + O + L)

    sumZW = 0
    sumW = 0
    for bio_id, bio_def in BIOMARKERS.items():
        val = row.get(bio_id)
        if val is None or np.isnan(val):
            continue
        norm = bio_def['normal']
        abn = bio_def['abnormal']
        if bio_def['inv']:
            z = (norm - val) / (norm - abn) if norm != abn else 0
        else:
            z = (val - norm) / (abn - norm) if abn != norm else 0
        z = max(0.0, min(1.0, z))
        sumZW += z * bio_def['w']
        sumW += bio_def['w']
    bioNorm = round((sumZW / sumW) * 100) if sumW > 0 else 0

    wDecl = 0.65
    wBio = 0.35
    gap = bioNorm - sD
    if gap > 20:
        extraW = min(0.30, ((gap - 20) / 100) * 0.60)
        wBio = 0.35 + extraW
        wDecl = 1 - wBio

    sf = round(wDecl * sD + wBio * bioNorm)

    bioFloor = round(0.75 * bioNorm)
    if sf < bioFloor: sf = bioFloor
    if bioNorm > 90:
        bef = max(80, round(0.85 * bioNorm))
        if sf < bef: sf = bef
    elif bioNorm > 80:
        bef = round(0.85 * bioNorm)
        if sf < bef: sf = bef

    hba1c_val = row.get('hba1c', 5.0)
    if hba1c_val >= 8.0 and sf < 70: sf = 70
    elif hba1c_val >= 6.5 and sf < 60: sf = 60

    sf = min(100, sf)

    if sf >= 80: label = 'TRES_ELEVE'
    elif sf >= 60: label = 'ELEVE'
    elif sf >= 30: label = 'MODERE'
    else: label = 'FAIBLE'

    return pd.Series({
        'C': C, 'E': E, 'O': O, 'L': L,
        'sD': sD, 'bioNorm': bioNorm, 'sf': sf,
        'bmn_k': bmn_k, 'label': label,
        'wDecl': wDecl, 'wBio': wBio,
    })

all_sf_scores = []
for i, ds in enumerate(imputed_datasets):
    scores = ds.apply(compute_bmn_row, axis=1)
    ds_scored = pd.concat([ds, scores], axis=1)
    imputed_datasets[i] = ds_scored
    all_sf_scores.append(ds_scored['sf'].values)
    if (i + 1) % 5 == 0:
        print(f"  Score BMN appliqué sur dataset {i+1}/{len(imputed_datasets)}")

sf_matrix = np.array(all_sf_scores)
sf_mean = sf_matrix.mean(axis=0)
sf_total_var = sf_matrix.var(axis=0).mean() + (1 + 1/len(imputed_datasets)) * sf_matrix.var(axis=0).mean()

df['sf'] = sf_mean
df['sf_se'] = np.sqrt(sf_total_var)

ref_ds = imputed_datasets[0]
for col in ['sD', 'bioNorm', 'C', 'L', 'bmn_k', 'label']:
    df[col] = ref_ds[col]

print(f"\n  ✓ Scores BMN calculés sur {len(imputed_datasets)} imputations")
print(f"  sf moyen : {df['sf'].mean():.1f} ± {df['sf'].std():.1f}")
print(f"  Distribution des classes :")
print(f"    FAIBLE     : {(df['sf'] < 30).sum():,} ({(df['sf'] < 30).mean()*100:.1f}%)")
print(f"    MODÉRÉ     : {((df['sf'] >= 30) & (df['sf'] < 60)).sum():,} ({((df['sf'] >= 30) & (df['sf'] < 60)).mean()*100:.1f}%)")
print(f"    ÉLEVÉ      : {((df['sf'] >= 60) & (df['sf'] < 80)).sum():,} ({((df['sf'] >= 60) & (df['sf'] < 80)).mean()*100:.1f}%)")
print(f"    TRÈS ÉLEVÉ : {(df['sf'] >= 80).sum():,} ({(df['sf'] >= 80).mean()*100:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 5 : VALIDATION STATISTIQUE
# ═══════════════════════════════════════════════════════════════════════

print("\n[5/6] Validation statistique complète...")

outcomes = {
    'MetS': 'mets_outcome',
    'Obesity': 'obesity_outcome',
}

results = {}

for outcome_name, outcome_col in outcomes.items():
    print(f"\n  ── Validation pour {outcome_name} ──")

    valid_mask = df[outcome_col].notna() & df['sf'].notna()
    y = df.loc[valid_mask, outcome_col].values.astype(int)
    sf_scores = df.loc[valid_mask, 'sf'].values
    sf_prob = sf_scores / 100.0

    if len(y) < 100 or y.sum() < 10:
        print(f"    ⚠ Données insuffisantes pour {outcome_name}")
        continue

    print(f"    N={len(y):,}, Events={y.sum():,} ({y.mean()*100:.1f}%)")

    # AUC-ROC + Bootstrap
    auc_main = roc_auc_score(y, sf_prob)
    n_boot = 2000
    auc_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx])) < 2: continue
        auc_boot.append(roc_auc_score(y[idx], sf_prob[idx]))
    auc_boot = np.array(auc_boot)
    auc_ci_low = np.percentile(auc_boot, 2.5)
    auc_ci_high = np.percentile(auc_boot, 97.5)
    print(f"    AUC = {auc_main:.4f} [IC95%: {auc_ci_low:.4f} - {auc_ci_high:.4f}]")

    fpr, tpr, thresholds = roc_curve(y, sf_prob)

    # Modèles comparatifs
    print("    [Modèles comparatifs — cross-validation 5-fold]")
    feature_cols = ['age', 'bmi', 'waist', 'homaIR', 'hba1c', 'crphs',
                    'tghdl', 'glyc', 'ldl', 'tg', 'hdl', 'tobaccoStatus']
    feature_cols = [c for c in feature_cols if c in df.columns]

    X_ml = imputed_datasets[0].loc[valid_mask, feature_cols].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_ml)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=200, max_depth=5, random_state=42),
    }

    model_aucs = {}
    model_probs = {}
    for model_name, model in models.items():
        probs = cross_val_predict(model, X_scaled, y, cv=cv, method='predict_proba')[:, 1]
        auc_val = roc_auc_score(y, probs)
        model_aucs[model_name] = auc_val
        model_probs[model_name] = probs
        print(f"    {model_name}: AUC = {auc_val:.4f}")

    model_aucs['SCORE BMN v3.0'] = auc_main
    model_probs['SCORE BMN v3.0'] = sf_prob

    # NRI
    print("    [NRI]")
    ref_probs = model_probs['Logistic Regression']
    def classify_risk(p):
        if p >= 0.60: return 2
        if p >= 0.30: return 1
        return 0

    cat_bmn = np.array([classify_risk(p) for p in sf_prob])
    cat_ref = np.array([classify_risk(p) for p in ref_probs])
    events = y == 1
    non_events = y == 0

    up_events = ((cat_bmn > cat_ref) & events).sum()
    down_events = ((cat_bmn < cat_ref) & events).sum()
    nri_events = (up_events - down_events) / events.sum()
    up_nonevents = ((cat_bmn > cat_ref) & non_events).sum()
    down_nonevents = ((cat_bmn < cat_ref) & non_events).sum()
    nri_nonevents = (down_nonevents - up_nonevents) / non_events.sum()
    nri_total = nri_events + nri_nonevents

    nri_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb = y[idx]; cat_bmn_b = cat_bmn[idx]; cat_ref_b = cat_ref[idx]
        ev = yb == 1; nev = yb == 0
        if ev.sum() == 0 or nev.sum() == 0: continue
        nri_e = ((cat_bmn_b > cat_ref_b) & ev).sum() / ev.sum() - ((cat_bmn_b < cat_ref_b) & ev).sum() / ev.sum()
        nri_ne = ((cat_bmn_b < cat_ref_b) & nev).sum() / nev.sum() - ((cat_bmn_b > cat_ref_b) & nev).sum() / nev.sum()
        nri_boot.append(nri_e + nri_ne)
    nri_boot = np.array(nri_boot)
    nri_ci = (np.percentile(nri_boot, 2.5), np.percentile(nri_boot, 97.5))
    nri_se = nri_boot.std()
    nri_z = nri_total / nri_se if nri_se > 0 else 0
    nri_p = 2 * (1 - stats.norm.cdf(abs(nri_z)))
    print(f"    NRI = {nri_total:.4f} [{nri_ci[0]:.4f} - {nri_ci[1]:.4f}], p={nri_p:.4f}")

    # IDI
    print("    [IDI]")
    disc_bmn = sf_prob[events].mean() - sf_prob[non_events].mean()
    disc_ref = ref_probs[events].mean() - ref_probs[non_events].mean()
    idi = disc_bmn - disc_ref

    idi_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb = y[idx]; ev = yb == 1; nev = yb == 0
        if ev.sum() == 0 or nev.sum() == 0: continue
        d_bmn = sf_prob[idx][ev].mean() - sf_prob[idx][nev].mean()
        d_ref = ref_probs[idx][ev].mean() - ref_probs[idx][nev].mean()
        idi_boot.append(d_bmn - d_ref)
    idi_boot = np.array(idi_boot)
    idi_ci = (np.percentile(idi_boot, 2.5), np.percentile(idi_boot, 97.5))
    idi_p = 2 * (1 - stats.norm.cdf(abs(idi / idi_boot.std()))) if idi_boot.std() > 0 else 1
    print(f"    IDI = {idi:.4f} [{idi_ci[0]:.4f} - {idi_ci[1]:.4f}], p={idi_p:.4f}")

    # Brier
    brier_bmn = brier_score_loss(y, sf_prob)
    brier_ref = brier_score_loss(y, ref_probs)
    print(f"    Brier BMN = {brier_bmn:.4f} vs LR = {brier_ref:.4f}")

    # Hosmer-Lemeshow
    n_groups = 10
    sorted_idx = np.argsort(sf_prob)
    groups = np.array_split(sorted_idx, n_groups)
    hl_chi2 = 0
    obs_rates = []
    pred_rates = []
    for g in groups:
        obs = y[g].mean()
        pred = sf_prob[g].mean()
        n_g = len(g)
        obs_rates.append(obs)
        pred_rates.append(pred)
        if pred > 0 and pred < 1:
            hl_chi2 += (n_g * (obs - pred)**2) / (pred * (1 - pred))
    hl_df = n_groups - 2
    hl_p = 1 - stats.chi2.cdf(hl_chi2, hl_df)
    print(f"    HL χ² = {hl_chi2:.2f}, p={hl_p:.4f}")

    # DeLong
    diff_auc_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx])) < 2: continue
        auc_bmn_b = roc_auc_score(y[idx], sf_prob[idx])
        auc_ref_b = roc_auc_score(y[idx], ref_probs[idx])
        diff_auc_boot.append(auc_bmn_b - auc_ref_b)
    diff_auc_boot = np.array(diff_auc_boot)
    delong_diff = auc_main - model_aucs['Logistic Regression']
    delong_se = diff_auc_boot.std()
    delong_z = delong_diff / delong_se if delong_se > 0 else 0
    delong_p = 2 * (1 - stats.norm.cdf(abs(delong_z)))
    print(f"    ΔAUC = {delong_diff:.4f}, p={delong_p:.4f}")

    # Monte Carlo
    mc_aucs = []
    for ds in imputed_datasets:
        sf_i = ds.loc[valid_mask, 'sf'].values / 100.0
        if len(np.unique(y)) >= 2:
            mc_aucs.append(roc_auc_score(y, sf_i))
    mc_aucs = np.array(mc_aucs)
    print(f"    MC AUC: {mc_aucs.mean():.4f} ± {mc_aucs.std():.4f}")

    # Stocker
    results[outcome_name] = {
        'N': len(y),
        'events': int(y.sum()),
        'prevalence': float(y.mean()),
        'AUC_BMN': float(auc_main),
        'AUC_CI': [float(auc_ci_low), float(auc_ci_high)],
        'AUC_models': {k: float(v) for k, v in model_aucs.items()},
        'NRI': float(nri_total),
        'NRI_CI': [float(nri_ci[0]), float(nri_ci[1])],
        'NRI_p': float(nri_p),
        'NRI_events': float(nri_events),
        'NRI_nonevents': float(nri_nonevents),
        'IDI': float(idi),
        'IDI_CI': [float(idi_ci[0]), float(idi_ci[1])],
        'IDI_p': float(idi_p),
        'Brier_BMN': float(brier_bmn),
        'Brier_LR': float(brier_ref),
        'HL_chi2': float(hl_chi2),
        'HL_p': float(hl_p),
        'DeLong_diff': float(delong_diff),
        'DeLong_p': float(delong_p),
        'MC_AUC_mean': float(mc_aucs.mean()),
        'MC_AUC_std': float(mc_aucs.std()),
        'fpr': fpr.tolist(),
        'tpr': tpr.tolist(),
        'obs_rates': obs_rates,
        'pred_rates': pred_rates,
        'model_probs': {k: v.tolist() for k, v in model_probs.items()},
    }


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 6 : FIGURES ET TABLEAUX
# ═══════════════════════════════════════════════════════════════════════

print("\n[6/6] Génération des figures...")

plt.rcParams.update({
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'figure.dpi': 300,
    'savefig.bbox': 'tight',
    'savefig.dpi': 300,
})
sns.set_style("whitegrid")

for outcome_name, res in results.items():
    tag = outcome_name.lower()
    valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
    y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)
    sf_out = df.loc[valid_mask_out, 'sf'].values / 100.0

    # FIGURE 1: ROC
    fig, ax = plt.subplots(1, 1, figsize=(8, 7))
    ax.plot(res['fpr'], res['tpr'], 'b-', linewidth=2.5,
            label=f"SCORE BMN v3.0 (AUC={res['AUC_BMN']:.3f})")
    colors = {'Logistic Regression': '#e74c3c', 'Random Forest': '#2ecc71', 'Gradient Boosting': '#f39c12'}
    for model_name, auc_val in res['AUC_models'].items():
        if model_name == 'SCORE BMN v3.0': continue
        probs = np.array(res['model_probs'][model_name])
        fpr_m, tpr_m, _ = roc_curve(y_out, probs)
        ax.plot(fpr_m, tpr_m, '--', color=colors.get(model_name, 'gray'), linewidth=1.5,
                label=f"{model_name} (AUC={auc_val:.3f})")
    ax.plot([0, 1], [0, 1], 'k--', alpha=0.3)
    ax.set_xlabel('1 - Specificity (FPR)')
    ax.set_ylabel('Sensitivity (TPR)')
    ax.set_title(f'ROC Curves — {outcome_name}\nNHANES 2011-2018 Pooled (N={res["N"]:,})')
    ax.legend(loc='lower right', fontsize=9)
    fig.savefig(f'{OUTPUT_DIR}/fig1_roc_{tag}.png')
    plt.close(fig)
    print(f"  ✓ fig1_roc_{tag}.png")

    # FIGURE 2: Calibration
    fig, ax = plt.subplots(1, 1, figsize=(7, 7))
    frac_pos, mean_pred = calibration_curve(y_out, sf_out, n_bins=10, strategy='quantile')
    ax.plot(mean_pred, frac_pos, 'bo-', linewidth=2, markersize=8, label='SCORE BMN v3.0')
    ax.plot([0, 1], [0, 1], 'k--', alpha=0.4, label='Perfect calibration')
    probs_lr = np.array(res['model_probs']['Logistic Regression'])
    frac_lr, mean_lr = calibration_curve(y_out, probs_lr, n_bins=10, strategy='quantile')
    ax.plot(mean_lr, frac_lr, 'r^--', linewidth=1.5, markersize=6, label='Logistic Regression')
    ax.set_xlabel('Predicted Probability')
    ax.set_ylabel('Observed Frequency')
    ax.set_title(f'Calibration — {outcome_name}\nHL p={res["HL_p"]:.3f}')
    ax.legend(loc='upper left')
    fig.savefig(f'{OUTPUT_DIR}/fig2_calibration_{tag}.png')
    plt.close(fig)
    print(f"  ✓ fig2_calibration_{tag}.png")

    # FIGURE 3: Distribution
    fig, ax = plt.subplots(1, 1, figsize=(9, 5))
    sf_all = df.loc[valid_mask_out, 'sf'].values
    ax.hist(sf_all[y_out == 0], bins=40, alpha=0.6, color='#3498db', density=True,
            label=f'No {outcome_name} (n={int((y_out==0).sum()):,})')
    ax.hist(sf_all[y_out == 1], bins=40, alpha=0.6, color='#e74c3c', density=True,
            label=f'{outcome_name} (n={int((y_out==1).sum()):,})')
    ax.axvline(30, color='orange', linestyle='--', alpha=0.7, label='Seuil 30')
    ax.axvline(60, color='red', linestyle='--', alpha=0.7, label='Seuil 60')
    ax.set_xlabel('SCORE BMN v3.0 (sf)')
    ax.set_ylabel('Density')
    ax.set_title(f'Distribution — {outcome_name} (N={res["N"]:,})')
    ax.legend(fontsize=9)
    fig.savefig(f'{OUTPUT_DIR}/fig3_distribution_{tag}.png')
    plt.close(fig)
    print(f"  ✓ fig3_distribution_{tag}.png")

# FIGURE 4: Monte Carlo
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for idx, (outcome_name, res) in enumerate(results.items()):
    ax = axes[idx]
    valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
    y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)
    mc_aucs = []
    for ds in imputed_datasets:
        sf_i = ds.loc[valid_mask_out, 'sf'].values / 100.0
        mc_aucs.append(roc_auc_score(y_out, sf_i))
    ax.bar(range(1, len(mc_aucs)+1), mc_aucs, color='#3498db', alpha=0.7)
    ax.axhline(np.mean(mc_aucs), color='red', linestyle='--', linewidth=2,
               label=f'Mean = {np.mean(mc_aucs):.4f}')
    ax.fill_between(range(0, len(mc_aucs)+2),
                    np.mean(mc_aucs) - 2*np.std(mc_aucs),
                    np.mean(mc_aucs) + 2*np.std(mc_aucs),
                    color='red', alpha=0.1, label='±2 SD')
    ax.set_xlabel('Imputation #')
    ax.set_ylabel('AUC')
    ax.set_title(f'MC Sensitivity — {outcome_name}')
    ax.legend()
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig4_monte_carlo.png')
plt.close(fig)
print(f"  ✓ fig4_monte_carlo.png")

# FIGURE 5: Forest Plot
fig, ax = plt.subplots(1, 1, figsize=(10, 6))
all_models_fp = []; all_aucs_fp = []; all_ci_low_fp = []; all_ci_high_fp = []
for outcome_name, res in results.items():
    valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
    y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)
    for model_name, auc_val in res['AUC_models'].items():
        all_models_fp.append(f"{model_name}\n({outcome_name})")
        all_aucs_fp.append(auc_val)
        probs = np.array(res['model_probs'][model_name])
        boot_aucs = []
        for b in range(500):
            idx_b = np.random.choice(len(y_out), len(y_out), replace=True)
            if len(np.unique(y_out[idx_b])) < 2: continue
            boot_aucs.append(roc_auc_score(y_out[idx_b], probs[idx_b]))
        all_ci_low_fp.append(np.percentile(boot_aucs, 2.5))
        all_ci_high_fp.append(np.percentile(boot_aucs, 97.5))

y_pos = range(len(all_models_fp))
xerr = [np.array(all_aucs_fp) - np.array(all_ci_low_fp),
        np.array(all_ci_high_fp) - np.array(all_aucs_fp)]
colors_fp = ['#2980b9' if 'BMN' in m else '#95a5a6' for m in all_models_fp]
ax.barh(y_pos, all_aucs_fp, xerr=xerr, color=colors_fp, alpha=0.8, height=0.6, capsize=3)
ax.set_yticks(y_pos)
ax.set_yticklabels(all_models_fp, fontsize=9)
ax.set_xlabel('AUC-ROC')
ax.set_title('Forest Plot — NHANES 2011-2018 Pooled')
ax.axvline(0.5, color='red', linestyle='--', alpha=0.3)
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig5_forest_plot.png')
plt.close(fig)
print(f"  ✓ fig5_forest_plot.png")

# FIGURE 6: Heatmap
fig, ax = plt.subplots(1, 1, figsize=(12, 5))
bio_cols_avail = [c for c in ['homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate'] if c in df.columns]
df['sf_quartile'] = pd.qcut(df['sf'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'], duplicates='drop')
bio_by_q = df.groupby('sf_quartile')[bio_cols_avail].mean()
bio_norm_hm = (bio_by_q - bio_by_q.min()) / (bio_by_q.max() - bio_by_q.min() + 1e-9)
sns.heatmap(bio_norm_hm.T, annot=bio_by_q.T.round(2).values, fmt='', cmap='YlOrRd',
            ax=ax, linewidths=0.5, cbar_kws={'label': 'Normalized'})
ax.set_title('Biomarkers by BMN Quartile — NHANES 2011-2018')
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig6_heatmap.png')
plt.close(fig)
print(f"  ✓ fig6_heatmap.png")

# FIGURE 7 (NOUVEAU) : Comparaison par cycle NHANES
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
for idx, (outcome_name, outcome_col) in enumerate(outcomes.items()):
    ax = axes[idx]
    cycle_aucs = {}
    for cycle in sorted(df['cycle'].unique()):
        mask = (df['cycle'] == cycle) & df[outcome_col].notna() & df['sf'].notna()
        if mask.sum() < 50: continue
        y_c = df.loc[mask, outcome_col].values.astype(int)
        sf_c = df.loc[mask, 'sf'].values / 100.0
        if len(np.unique(y_c)) < 2: continue
        auc_c = roc_auc_score(y_c, sf_c)
        cycle_aucs[cycle] = auc_c

    bars = ax.bar(cycle_aucs.keys(), cycle_aucs.values(), color='#3498db', alpha=0.8)
    ax.axhline(results[outcome_name]['AUC_BMN'], color='red', linestyle='--',
               label=f'Pooled AUC = {results[outcome_name]["AUC_BMN"]:.3f}')
    ax.set_ylabel('AUC')
    ax.set_title(f'AUC by NHANES Cycle — {outcome_name}')
    ax.legend()
    ax.set_ylim([0.5, 1.0])
    for bar, (cycle, auc) in zip(bars, cycle_aucs.items()):
        ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.005,
                f'{auc:.3f}', ha='center', va='bottom', fontsize=10, fontweight='bold')
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig7_auc_by_cycle.png')
plt.close(fig)
print(f"  ✓ fig7_auc_by_cycle.png")


# ═══════════════════════════════════════════════════════════════════════
# RÉSULTATS FINAUX
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("  RÉSULTATS FINAUX — COHORTE ÉLARGIE (4 CYCLES NHANES)")
print("=" * 70)

# TABLE 1: Baseline
print("\n═══ TABLE 1: Baseline Characteristics ═══")
print(f"{'Variable':<35} {'Value':<30}")
print("-" * 65)
print(f"{'Total N':<35} {len(df):,}")
print(f"{'Cycles':<35} 2011-2012, 2013-2014, 2015-2016, 2017-2018")
for cycle in sorted(df['cycle'].unique()):
    n = (df['cycle'] == cycle).sum()
    print(f"  {cycle:<33} {n:,}")
print(f"{'Age (years)':<35} {df['age'].mean():.1f} ± {df['age'].std():.1f}")
print(f"{'Male sex':<35} {(df['sex']=='M').sum():,} ({(df['sex']=='M').mean()*100:.1f}%)")
print(f"{'BMI (kg/m²)':<35} {df['bmi'].mean():.1f} ± {df['bmi'].std():.1f}")
if 'waist' in df.columns:
    print(f"{'Waist (cm)':<35} {df['waist'].mean():.1f} ± {df['waist'].std():.1f}")
if 'homaIR' in df.columns:
    print(f"{'HOMA-IR':<35} {df['homaIR'].mean():.2f} ± {df['homaIR'].std():.2f}")
if 'hba1c' in df.columns:
    print(f"{'HbA1c (%)':<35} {df['hba1c'].mean():.2f} ± {df['hba1c'].std():.2f}")
if 'crphs' in df.columns:
    print(f"{'hs-CRP (mg/L)':<35} {df['crphs'].mean():.2f} ± {df['crphs'].std():.2f}")
print(f"{'Metabolic Syndrome':<35} {df['mets_outcome'].sum():,} ({df['mets_outcome'].mean()*100:.1f}%)")
print(f"{'Obesity (BMI ≥ 30)':<35} {df['obesity_outcome'].sum():,} ({df['obesity_outcome'].mean()*100:.1f}%)")
print(f"{'SCORE BMN sf':<35} {df['sf'].mean():.1f} ± {df['sf'].std():.1f}")

# TABLE 2: Performance
print("\n═══ TABLE 2: Discriminative Performance — Pooled Cohort ═══")
print(f"{'Metric':<35} ", end="")
for outcome_name in results:
    print(f"{'  ' + outcome_name:<25}", end="")
print()
print("-" * 85)

metrics = [
    ('AUC BMN [IC95%]', lambda r: f"{r['AUC_BMN']:.3f} [{r['AUC_CI'][0]:.3f}-{r['AUC_CI'][1]:.3f}]"),
    ('AUC Logistic Reg.', lambda r: f"{r['AUC_models']['Logistic Regression']:.3f}"),
    ('AUC Random Forest', lambda r: f"{r['AUC_models']['Random Forest']:.3f}"),
    ('AUC Gradient Boost', lambda r: f"{r['AUC_models']['Gradient Boosting']:.3f}"),
    ('DeLong ΔAUC (vs LR)', lambda r: f"{r['DeLong_diff']:+.4f} (p={r['DeLong_p']:.3f})"),
    ('NRI [IC95%]', lambda r: f"{r['NRI']:.3f} [{r['NRI_CI'][0]:.3f}-{r['NRI_CI'][1]:.3f}]"),
    ('NRI p-value', lambda r: f"{r['NRI_p']:.4f}"),
    ('IDI [IC95%]', lambda r: f"{r['IDI']:.4f} [{r['IDI_CI'][0]:.4f}-{r['IDI_CI'][1]:.4f}]"),
    ('Brier BMN / LR', lambda r: f"{r['Brier_BMN']:.4f} / {r['Brier_LR']:.4f}"),
    ('HL χ² (p)', lambda r: f"{r['HL_chi2']:.1f} (p={r['HL_p']:.3f})"),
    ('MC AUC ± SD', lambda r: f"{r['MC_AUC_mean']:.4f} ± {r['MC_AUC_std']:.4f}"),
]

for label, fmt_func in metrics:
    print(f"{label:<35} ", end="")
    for outcome_name, res in results.items():
        try:
            print(f"{'  ' + fmt_func(res):<25}", end="")
        except:
            print(f"{'  N/A':<25}", end="")
    print()

# TABLE 3: MetS par catégorie
print("\n═══ TABLE 3: MetS Prevalence by BMN Category ═══")
if 'mets_outcome' in df.columns:
    cats = [('FAIBLE', 0, 30), ('MODÉRÉ', 30, 60), ('ÉLEVÉ', 60, 80), ('TRÈS ÉLEVÉ', 80, 101)]
    print(f"{'Category':<15} {'N':>8} {'MetS N':>8} {'MetS %':>8} {'OR':>10} {'p-value':>10}")
    print("-" * 65)
    ref_cat = df[(df['sf'] < 30)]
    ref_rate = ref_cat['mets_outcome'].mean() if len(ref_cat) > 0 else 0
    for cat_name, lo, hi in cats:
        sub = df[(df['sf'] >= lo) & (df['sf'] < hi)]
        if len(sub) == 0: continue
        n = len(sub)
        n_mets = int(sub['mets_outcome'].sum())
        rate = sub['mets_outcome'].mean()
        if cat_name == 'FAIBLE' or ref_rate == 0:
            or_val = 'Ref'
            p_val = '-'
        else:
            a = n_mets; b = n - n_mets
            c = int(ref_cat['mets_outcome'].sum())
            d = len(ref_cat) - c
            if b > 0 and c > 0 and d > 0:
                odds_ratio = (a * d) / (b * c)
                table = np.array([[a, b], [c, d]])
                _, p = stats.fisher_exact(table)
                or_val = f"{odds_ratio:.2f}"
                p_val = f"{p:.4f}"
            else:
                or_val = 'N/A'
                p_val = 'N/A'
        print(f"{cat_name:<15} {n:>8,} {n_mets:>8,} {rate*100:>7.1f}% {or_val:>10} {p_val:>10}")

# TABLE 4 (NOUVEAU) : Comparaison cohorte simple vs élargie
print("\n═══ TABLE 4: Comparison — Single Cycle vs Pooled Cohort ═══")
print(f"{'Metric':<35} {'2017-2018 (N≈5,856)':<25} {'2011-2018 Pooled':<25}")
print("-" * 85)

# Charger les anciens résultats
old_results = None
old_path = '/home/user/bmn_validation/results.json'
if os.path.exists(old_path):
    with open(old_path) as f:
        old_results = json.load(f)

if old_results:
    comparisons = [
        ('N (MetS)', lambda o,n: (f"{o['MetS']['N']:,}", f"{n['MetS']['N']:,}")),
        ('AUC MetS', lambda o,n: (f"{o['MetS']['AUC_BMN']:.4f}", f"{n['MetS']['AUC_BMN']:.4f}")),
        ('AUC MetS CI95% width', lambda o,n: (
            f"{o['MetS']['AUC_CI'][1]-o['MetS']['AUC_CI'][0]:.4f}",
            f"{n['MetS']['AUC_CI'][1]-n['MetS']['AUC_CI'][0]:.4f}"
        )),
        ('AUC Obesity', lambda o,n: (f"{o['Obesity']['AUC_BMN']:.4f}", f"{n['Obesity']['AUC_BMN']:.4f}")),
        ('Brier MetS', lambda o,n: (f"{o['MetS']['Brier_BMN']:.4f}", f"{n['MetS']['Brier_BMN']:.4f}")),
        ('Brier Obesity', lambda o,n: (f"{o['Obesity']['Brier_BMN']:.4f}", f"{n['Obesity']['Brier_BMN']:.4f}")),
        ('MC AUC MetS ± SD', lambda o,n: (
            f"{o['MetS']['MC_AUC_mean']:.4f}±{o['MetS']['MC_AUC_std']:.4f}",
            f"{n['MetS']['MC_AUC_mean']:.4f}±{n['MetS']['MC_AUC_std']:.4f}"
        )),
    ]
    for label, fn in comparisons:
        try:
            old_val, new_val = fn(old_results, results)
            print(f"{label:<35} {old_val:<25} {new_val:<25}")
        except:
            print(f"{label:<35} {'N/A':<25} {'N/A':<25}")

# ═══════════════════════════════════════════════════════════════════════
# VALIDATION TEMPORELLE : développement 2011-2014 vs validation 2015-2018
# ═══════════════════════════════════════════════════════════════════════

print("\n═══ VALIDATION TEMPORELLE (dev 2011-2014 vs val 2015-2018) ═══")

dev_mask = df['cycle'].isin(['2011-2012', '2013-2014'])
val_mask = df['cycle'].isin(['2015-2016', '2017-2018'])
n_dev = dev_mask.sum()
n_val = val_mask.sum()
print(f"  Development cohort: N = {n_dev:,}")
print(f"  Validation cohort:  N = {n_val:,}")

temporal_results = {}
for outcome_name, outcome_col in outcomes.items():
    print(f"\n  ── {outcome_name} ──")
    for cohort_name, mask in [('Development (2011-2014)', dev_mask), ('Validation (2015-2018)', val_mask)]:
        valid = mask & df[outcome_col].notna() & df['sf'].notna()
        y_t = df.loc[valid, outcome_col].values.astype(int)
        sf_t = df.loc[valid, 'sf'].values / 100.0
        if len(y_t) < 50 or len(np.unique(y_t)) < 2:
            print(f"    {cohort_name}: insufficient data")
            continue
        auc_t = roc_auc_score(y_t, sf_t)
        boot_aucs_t = []
        for b in range(2000):
            idx = np.random.choice(len(y_t), len(y_t), replace=True)
            if len(np.unique(y_t[idx])) < 2: continue
            boot_aucs_t.append(roc_auc_score(y_t[idx], sf_t[idx]))
        boot_aucs_t = np.array(boot_aucs_t)
        ci_lo = np.percentile(boot_aucs_t, 2.5)
        ci_hi = np.percentile(boot_aucs_t, 97.5)
        print(f"    {cohort_name}: AUC = {auc_t:.4f} [{ci_lo:.4f} - {ci_hi:.4f}] (N={len(y_t):,}, events={y_t.sum():,})")
        temporal_results[f"{outcome_name}_{cohort_name[:3]}"] = {
            'AUC': float(auc_t), 'CI': [float(ci_lo), float(ci_hi)],
            'N': int(len(y_t)), 'events': int(y_t.sum())
        }

    dev_key = f"{outcome_name}_Dev"
    val_key = f"{outcome_name}_Val"
    if dev_key in temporal_results and val_key in temporal_results:
        attenuation = temporal_results[dev_key]['AUC'] - temporal_results[val_key]['AUC']
        print(f"    Attenuation: {attenuation*100:+.2f} percentage points")

# ═══════════════════════════════════════════════════════════════════════
# CALIBRATION AVANCÉE : ICI, E/O ratio, pente de calibration
# ═══════════════════════════════════════════════════════════════════════

print("\n═══ CALIBRATION AVANCÉE ═══")

for outcome_name, outcome_col in outcomes.items():
    print(f"\n  ── {outcome_name} ──")
    valid = df[outcome_col].notna() & df['sf'].notna()
    y_cal = df.loc[valid, outcome_col].values.astype(int)
    sf_cal = df.loc[valid, 'sf'].values / 100.0

    # ICI (Integrated Calibration Index)
    from sklearn.isotonic import IsotonicRegression
    iso = IsotonicRegression(out_of_bounds='clip')
    cal_probs = iso.fit_transform(sf_cal, y_cal)
    ici = np.mean(np.abs(cal_probs - sf_cal))
    print(f"    ICI = {ici:.4f}")

    # E/O ratio
    expected = sf_cal.sum()
    observed = y_cal.sum()
    eo_ratio = expected / observed if observed > 0 else float('inf')
    print(f"    E/O ratio = {eo_ratio:.3f} (Expected={expected:.0f}, Observed={observed})")

    # Calibration slope (logistic recalibration)
    log_odds = np.log(np.clip(sf_cal, 1e-6, 1-1e-6) / (1 - np.clip(sf_cal, 1e-6, 1-1e-6)))
    X_slope = sm.add_constant(log_odds)
    try:
        logit_model = sm.Logit(y_cal, X_slope).fit(disp=0)
        cal_intercept = logit_model.params[0]
        cal_slope = logit_model.params[1]
        print(f"    Calibration intercept = {cal_intercept:.4f}")
        print(f"    Calibration slope = {cal_slope:.4f}")
    except:
        cal_intercept = float('nan')
        cal_slope = float('nan')
        print(f"    Calibration slope: convergence failure")

    results[outcome_name]['ICI'] = float(ici)
    results[outcome_name]['EO_ratio'] = float(eo_ratio)
    results[outcome_name]['cal_intercept'] = float(cal_intercept)
    results[outcome_name]['cal_slope'] = float(cal_slope)

# ═══════════════════════════════════════════════════════════════════════
# TABLE 1 ÉTENDUE : colonnes MetS+ / MetS- avec p-values
# ═══════════════════════════════════════════════════════════════════════

print("\n═══ TABLE 1 ÉTENDUE (MetS+ vs MetS-) ═══")

mets_pos = df[df['mets_outcome'] == 1]
mets_neg = df[df['mets_outcome'] == 0]
print(f"{'Variable':<25} {'Overall (N={:,})'.format(len(df)):<25} {'MetS+ (N={:,})'.format(len(mets_pos)):<25} {'MetS- (N={:,})'.format(len(mets_neg)):<25} {'p':>10}")
print("-" * 110)

cont_vars = [
    ('Age (years)', 'age'), ('BMI (kg/m²)', 'bmi'), ('Waist (cm)', 'waist'),
    ('HOMA-IR', 'homaIR'), ('HbA1c (%)', 'hba1c'), ('hs-CRP (mg/L)', 'crphs'),
    ('HDL (mmol/L)', 'hdl'), ('TG (mmol/L)', 'tg'), ('Glucose (mmol/L)', 'glyc'),
    ('SCORE BMN sf', 'sf'),
]
for label, col in cont_vars:
    if col not in df.columns: continue
    overall_n = df[col].notna().sum()
    pos_vals = mets_pos[col].dropna()
    neg_vals = mets_neg[col].dropna()
    if len(pos_vals) > 1 and len(neg_vals) > 1:
        _, p = stats.mannwhitneyu(pos_vals, neg_vals, alternative='two-sided')
        p_str = f"{p:.1e}" if p < 0.001 else f"{p:.4f}"
    else:
        p_str = "N/A"
    print(f"{label:<25} {df[col].mean():.1f} ± {df[col].std():.1f} (n={overall_n:,}){'':<3} "
          f"{pos_vals.mean():.1f} ± {pos_vals.std():.1f} (n={len(pos_vals):,}){'':<3} "
          f"{neg_vals.mean():.1f} ± {neg_vals.std():.1f} (n={len(neg_vals):,}){'':<3} "
          f"{p_str:>10}")

cat_vars = [
    ('Male sex', lambda r: r['sex'] == 'M'),
    ('Obesity (BMI≥30)', lambda r: r['obesity_outcome'] == 1 if pd.notna(r.get('obesity_outcome')) else False),
    ('Diabetes (self-report)', lambda r: r.get('diabetes', 0) == 1 if pd.notna(r.get('diabetes')) else False),
    ('Hypertension', lambda r: r.get('hypertension', 0) == 1 if pd.notna(r.get('hypertension')) else False),
]
for label, cond in cat_vars:
    overall_n = df.apply(cond, axis=1).sum()
    pos_n = mets_pos.apply(cond, axis=1).sum()
    neg_n = mets_neg.apply(cond, axis=1).sum()
    table = np.array([[pos_n, len(mets_pos) - pos_n], [neg_n, len(mets_neg) - neg_n]])
    if table.min() > 0 and table.sum() > 0:
        chi2, p, _, _ = stats.chi2_contingency(table)
        p_str = f"{p:.1e}" if p < 0.001 else f"{p:.4f}"
    else:
        p_str = "N/A"
    print(f"{label:<25} {overall_n:,} ({overall_n/len(df)*100:.1f}%){'':<12} "
          f"{pos_n:,} ({pos_n/len(mets_pos)*100:.1f}%){'':<12} "
          f"{neg_n:,} ({neg_n/len(mets_neg)*100:.1f}%){'':<12} "
          f"{p_str:>10}")


# Sauvegarder
save_results = {}
for k, v in results.items():
    save_results[k] = {kk: vv for kk, vv in v.items()
                      if kk not in ['fpr', 'tpr', 'model_probs']}
save_results['temporal_validation'] = temporal_results
with open(f'{OUTPUT_DIR}/results_large.json', 'w') as f:
    json.dump(save_results, f, indent=2)

print(f"\n  ✓ Résultats : {OUTPUT_DIR}/results_large.json")
print(f"  ✓ Figures : {OUTPUT_DIR}/")

print("\n  Fichiers générés :")
for f_name in sorted(os.listdir(OUTPUT_DIR)):
    fsize = os.path.getsize(f'{OUTPUT_DIR}/{f_name}')
    print(f"    {f_name} ({fsize:,} bytes)")

print("\n" + "=" * 70)
print("  ANALYSE COHORTE ÉLARGIE TERMINÉE")
print("=" * 70)
