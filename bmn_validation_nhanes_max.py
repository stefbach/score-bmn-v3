"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.0 — VALIDATION MAXIMALE : 10 CYCLES NHANES (1999-2018)
═══════════════════════════════════════════════════════════════════════════

Cohorte poolée : ~50,000+ adultes ≥ 18 ans
Cycles : 1999-2000 → 2017-2018 (10 vagues continues)
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
import seaborn as sns
import os, json, urllib.request, tempfile, time

np.random.seed(42)
OUTPUT_DIR = '/home/user/bmn_validation_max'
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("  SCORE BMN v3.0 — VALIDATION MAXIMALE (10 CYCLES NHANES)")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════
# PARTIE 1 : CONFIGURATION DES 10 CYCLES
# ═══════════════════════════════════════════════════════════════════════

# Suffixes NHANES : 1999-2000 = pas de suffixe, 2001-2002 = _B, etc.
CYCLES = [
    {'name': '1999-2000', 'suffix': '',  'year': 1999},
    {'name': '2001-2002', 'suffix': 'B', 'year': 2001},
    {'name': '2003-2004', 'suffix': 'C', 'year': 2003},
    {'name': '2005-2006', 'suffix': 'D', 'year': 2005},
    {'name': '2007-2008', 'suffix': 'E', 'year': 2007},
    {'name': '2009-2010', 'suffix': 'F', 'year': 2009},
    {'name': '2011-2012', 'suffix': 'G', 'year': 2011},
    {'name': '2013-2014', 'suffix': 'H', 'year': 2013},
    {'name': '2015-2016', 'suffix': 'I', 'year': 2015},
    {'name': '2017-2018', 'suffix': 'J', 'year': 2017},
]

# Tables à télécharger. Certains noms varient entre cycles anciens/récents.
# On essaie plusieurs noms si le premier échoue.
TABLE_ALIASES = {
    'DEMO':  ['DEMO'],
    'BMX':   ['BMX'],
    'BIOPRO':['BIOPRO', 'L40'],  # L40 dans cycles anciens
    'GHB':   ['GHB', 'L10'],
    'TRIGLY':['TRIGLY', 'L13'],
    'HDL':   ['HDL', 'L13AM'],
    'TCHOL': ['TCHOL', 'L13AM'],
    'INS':   ['INS', 'L10'],
    'HSCRP': ['HSCRP', 'CRP'],
    'DPQ':   ['DPQ'],
    'SLQ':   ['SLQ'],
    'PAQ':   ['PAQ'],
    'SMQ':   ['SMQ'],
    'ALQ':   ['ALQ'],
    'DIQ':   ['DIQ'],
    'BPQ':   ['BPQ'],
    'MCQ':   ['MCQ'],
}


def fetch_nhanes(table_name, suffix, year, max_retries=3):
    """Télécharge une table NHANES. Gère le format avec/sans suffixe."""
    if suffix:
        filename = f"{table_name}_{suffix}.XPT"
    else:
        filename = f"{table_name}.XPT"

    url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{year}/DataFiles/{filename}"

    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Research/BMN-Validation-Study)'
            })
            resp = urllib.request.urlopen(req, timeout=90)
            data = resp.read()
            tmp = tempfile.NamedTemporaryFile(suffix='.xpt', delete=False)
            tmp.write(data)
            tmp.close()
            df = pd.read_sas(tmp.name, format='xport')
            os.unlink(tmp.name)
            return df
        except urllib.error.HTTPError:
            return None  # Table doesn't exist for this cycle
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
            else:
                return None


def fetch_table_with_aliases(aliases, suffix, year):
    """Essaie plusieurs noms de tables pour gérer les changements entre cycles."""
    for alias in aliases:
        df = fetch_nhanes(alias, suffix, year)
        if df is not None:
            return df
    return None


print("\n[1/6] Récupération des données NHANES — 10 cycles (1999-2018)...")

all_cycle_data = {}

for cycle in CYCLES:
    name = cycle['name']
    suffix = cycle['suffix']
    year = cycle['year']
    print(f"\n  ── {name} (suffix={'_'+suffix if suffix else 'aucun'}) ──")

    tables = {}
    for table_key, aliases in TABLE_ALIASES.items():
        df_table = fetch_table_with_aliases(aliases, suffix, year)
        if df_table is not None:
            print(f"    ✓ {table_key}: {len(df_table):,} obs ({len(df_table.columns)} vars)")
            tables[table_key] = df_table
        else:
            print(f"    ✗ {table_key}")

    all_cycle_data[name] = tables
    # Petit délai entre cycles pour ne pas surcharger le serveur CDC
    time.sleep(1)


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 2 : HARMONISATION MULTI-CYCLES
# ═══════════════════════════════════════════════════════════════════════

print("\n[2/6] Fusion et harmonisation (10 cycles)...")


def safe_merge(left, right, cols, on='SEQN'):
    if right is None:
        return left
    keep = [on] + [c for c in cols if c in right.columns]
    if len(keep) <= 1:
        return left
    return left.merge(right[keep], on=on, how='left')


def find_col(df, candidates):
    """Trouve la première colonne disponible parmi les candidats."""
    for c in candidates:
        if c in df.columns:
            return c
    return None


def process_cycle(cycle_name, tables):
    """Traite un cycle NHANES et retourne un DataFrame harmonisé."""
    demo = tables.get('DEMO')
    if demo is None:
        return None

    # SEQN + Age + Sexe
    age_col = find_col(demo, ['RIDAGEYR', 'RIDAGEEX'])
    sex_col = find_col(demo, ['RIAGENDR'])
    if not age_col or not sex_col:
        return None

    df = demo[['SEQN', age_col, sex_col]].copy()
    df.columns = ['SEQN', 'age', 'sex_code']

    # Ethnicité
    eth_col = find_col(demo, ['RIDRETH3', 'RIDRETH1'])
    if eth_col:
        df['race_eth'] = demo[eth_col]
    else:
        df['race_eth'] = np.nan

    df = df[df['age'] >= 18].copy()
    if len(df) == 0:
        return None

    df['sex'] = df['sex_code'].map({1: 'M', 2: 'F'})
    ETH_MAP = {1: 'eu', 2: 'eu', 3: 'eu', 4: 'af', 5: 'eu', 6: 'ea', 7: 'eu'}
    df['ethnicCode'] = df['race_eth'].map(ETH_MAP).fillna('eu')
    df['cycle'] = cycle_name

    # ── Anthropométrie ──
    bmx = tables.get('BMX')
    if bmx is not None:
        bmi_col = find_col(bmx, ['BMXBMI'])
        waist_col = find_col(bmx, ['BMXWAIST'])
        ht_col = find_col(bmx, ['BMXHT'])
        merge_cols = [c for c in [bmi_col, waist_col, ht_col] if c]
        if merge_cols:
            df = safe_merge(df, bmx, merge_cols)
            if bmi_col: df.rename(columns={bmi_col: 'bmi'}, inplace=True)
            if waist_col: df.rename(columns={waist_col: 'waist'}, inplace=True)
            if ht_col: df.rename(columns={ht_col: 'height_cm'}, inplace=True)
            if 'waist' in df.columns and 'height_cm' in df.columns:
                df['whtr'] = df['waist'] / df['height_cm']

    # ── Biochimie ──
    biopro = tables.get('BIOPRO')
    if biopro is not None:
        glu_col = find_col(biopro, ['LBXSGL', 'LBDGLUSI', 'LBXGLU'])
        ast_col = find_col(biopro, ['LBXSASSI', 'LBXSAST'])
        ggt_col = find_col(biopro, ['LBXSGB', 'LBXSGTSI'])
        ua_col = find_col(biopro, ['LBXSUA', 'LBXSUASI'])
        merge_cols = [c for c in [glu_col, ast_col, ggt_col, ua_col] if c]
        if merge_cols:
            df = safe_merge(df, biopro, merge_cols)
            if glu_col:
                df.rename(columns={glu_col: 'glucose_mgdl'}, inplace=True)
                df['glyc'] = df['glucose_mgdl'] / 18.0
            if ast_col:
                df.rename(columns={ast_col: 'asat'}, inplace=True)
            if ggt_col:
                df.rename(columns={ggt_col: 'ggt'}, inplace=True)
            if ua_col:
                df.rename(columns={ua_col: 'urate_mgdl'}, inplace=True)
                df['urate'] = df['urate_mgdl'] * 59.48

    # ── HbA1c ──
    ghb = tables.get('GHB')
    if ghb is not None:
        hba1c_col = find_col(ghb, ['LBXGH', 'LBXGLT'])
        if hba1c_col:
            df = safe_merge(df, ghb, [hba1c_col])
            df.rename(columns={hba1c_col: 'hba1c'}, inplace=True)

    # ── Triglycérides ──
    trigly = tables.get('TRIGLY')
    if trigly is not None:
        tg_col = find_col(trigly, ['LBXTR', 'LBDTRSI'])
        if tg_col:
            df = safe_merge(df, trigly, [tg_col])
            df.rename(columns={tg_col: 'tg_mgdl'}, inplace=True)
            df['tg'] = df['tg_mgdl'] / 88.57

    # ── HDL ──
    hdl_t = tables.get('HDL')
    if hdl_t is not None:
        hdl_col = find_col(hdl_t, ['LBDHDD', 'LBDHDL', 'LBXHDD'])
        if hdl_col:
            df = safe_merge(df, hdl_t, [hdl_col])
            df.rename(columns={hdl_col: 'hdl_mgdl'}, inplace=True)
            df['hdl'] = df['hdl_mgdl'] / 38.67

    # ── Cholestérol total → LDL Friedewald ──
    tchol = tables.get('TCHOL')
    if tchol is not None:
        tc_col = find_col(tchol, ['LBXTC', 'LBDTCSI'])
        if tc_col:
            df = safe_merge(df, tchol, [tc_col])
            df.rename(columns={tc_col: 'tc_mgdl'}, inplace=True)
            df['tc_mmol'] = df['tc_mgdl'] / 38.67
            if 'hdl' in df.columns and 'tg' in df.columns:
                df['ldl'] = df['tc_mmol'] - df['hdl'] - df['tg'] / 2.2

    # ── Insuline → HOMA-IR ──
    ins = tables.get('INS')
    if ins is not None:
        ins_col = find_col(ins, ['LBXIN', 'LBDINSI'])
        if ins_col:
            df = safe_merge(df, ins, [ins_col])
            df.rename(columns={ins_col: 'insulin_uU'}, inplace=True)
            if 'glucose_mgdl' in df.columns:
                df['homaIR'] = (df['glucose_mgdl'] * df['insulin_uU']) / 405.0

    # ── CRP ──
    hscrp = tables.get('HSCRP')
    if hscrp is not None:
        crp_col = find_col(hscrp, ['LBXHSCRP', 'LBXCRP'])
        if crp_col:
            df = safe_merge(df, hscrp, [crp_col])
            df.rename(columns={crp_col: 'crphs'}, inplace=True)

    # ── TG/HDL ──
    if 'tg' in df.columns and 'hdl' in df.columns:
        df['tghdl'] = df['tg'] / df['hdl']

    # ── PHQ-9 ──
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

    # ── Sommeil ──
    slq = tables.get('SLQ')
    if slq is not None:
        sleep_col = find_col(slq, ['SLD012', 'SLD010H', 'SLQ060'])
        if sleep_col:
            df = safe_merge(df, slq, [sleep_col])
            df.rename(columns={sleep_col: 'sleepHours'}, inplace=True)

    # ── Activité physique ──
    paq = tables.get('PAQ')
    if paq is not None:
        pa_min_cols = ['PAD615', 'PAD630', 'PAD660', 'PAD675']
        avail_pa = [c for c in pa_min_cols if c in paq.columns]
        if avail_pa:
            df = safe_merge(df, paq, avail_pa)
            for col in avail_pa:
                if col in df.columns:
                    df[col] = df[col].replace({9999: np.nan, 7777: np.nan})
            pa_sum = sum(pd.to_numeric(df.get(c, 0), errors='coerce').fillna(0) for c in avail_pa)
            df['physicalActivityMinWeek'] = pa_sum

    # ── Tabagisme ──
    smq = tables.get('SMQ')
    if smq is not None:
        smq020_col = find_col(smq, ['SMQ020'])
        smq040_col = find_col(smq, ['SMQ040'])
        if smq020_col and smq040_col:
            df = safe_merge(df, smq, [smq020_col, smq040_col])
            v020 = df[smq020_col].values
            v040 = df[smq040_col].values
            ever_smoked = (v020 == 1)
            tob = np.zeros(len(df), dtype=int)
            tob = np.where(ever_smoked & (v040 == 3), 1, tob)
            tob = np.where(ever_smoked & (v040 == 2), 3, tob)
            tob = np.where(ever_smoked & (v040 == 1), 4, tob)
            df['tobaccoStatus'] = tob

    # ── Alcool ──
    alq = tables.get('ALQ')
    if alq is not None:
        freq_col = find_col(alq, ['ALQ121', 'ALQ120Q', 'ALQ101'])
        qty_col = find_col(alq, ['ALQ130', 'ALQ141Q', 'ALQ120Q'])
        if freq_col and qty_col and freq_col != qty_col:
            df = safe_merge(df, alq, [freq_col, qty_col])
            drinks_day = pd.to_numeric(df.get(qty_col, 0), errors='coerce').fillna(0)
            freq = pd.to_numeric(df.get(freq_col, 0), errors='coerce').fillna(0)
            freq_map = {0:0, 1:30, 2:20, 3:12, 4:6, 5:4, 6:2, 7:1, 8:0.5, 9:0.1, 10:0, 77:0, 99:0}
            days_per_month = freq.map(freq_map).fillna(0)
            df['drinksPerWeek'] = (drinks_day * days_per_month * 12 / 52).clip(0, 50)

    # ── Diabète ──
    diq = tables.get('DIQ')
    if diq is not None:
        diq_col = find_col(diq, ['DIQ010'])
        if diq_col:
            df = safe_merge(df, diq, [diq_col])
            df['has_diabetes'] = (df[diq_col] == 1).astype(int)

    # ── Hypertension ──
    bpq = tables.get('BPQ')
    if bpq is not None:
        bpq_col = find_col(bpq, ['BPQ020'])
        if bpq_col:
            df = safe_merge(df, bpq, [bpq_col])
            df['has_hta'] = (df[bpq_col] == 1).astype(int)

    # ── Thyroïde ──
    mcq = tables.get('MCQ')
    if mcq is not None:
        thy_col = find_col(mcq, ['MCQ160F', 'MCQ160M'])
        if thy_col:
            df = safe_merge(df, mcq, [thy_col])
            df['has_hypo'] = (df[thy_col] == 1).astype(int)

    return df


# Traiter chaque cycle
cycle_dfs = []
for cycle in CYCLES:
    name = cycle['name']
    tables = all_cycle_data.get(name, {})
    print(f"\n  Traitement {name}...")
    df_cycle = process_cycle(name, tables)
    if df_cycle is not None:
        print(f"    → {len(df_cycle):,} adultes")
        cycle_dfs.append(df_cycle)
    else:
        print(f"    → Échec (DEMO manquant ou données insuffisantes)")

# Combiner
df = pd.concat(cycle_dfs, ignore_index=True)
print(f"\n  {'='*50}")
print(f"  COHORTE TOTALE : {len(df):,} adultes (10 cycles)")
print(f"  {'='*50}")

# Variables cibles — VECTORISÉ
is_F = (df['sex'] == 'F').values
waist_v = df['waist'].fillna(0).values
hdl_v = df['hdl'].fillna(999).values
tg_v = df['tg'].fillna(0).values
glyc_v = df['glyc'].fillna(0).values
diab_v = df['has_diabetes'].fillna(0).values if 'has_diabetes' in df.columns else np.zeros(len(df))
hta_v = df['has_hta'].fillna(0).values if 'has_hta' in df.columns else np.zeros(len(df))

criteria = np.zeros(len(df), dtype=int)
criteria += np.where(is_F, (waist_v > 88).astype(int), (waist_v > 102).astype(int))
criteria += np.where(is_F, (hdl_v < 1.3).astype(int), (hdl_v < 1.0).astype(int))
criteria += (tg_v >= 1.7).astype(int)
criteria += ((glyc_v >= 5.6) | (diab_v == 1)).astype(int)
criteria += (hta_v == 1).astype(int)
df['mets_outcome'] = (criteria >= 3).astype(int)
df['obesity_outcome'] = (df['bmi'].fillna(0) >= 30).astype(int)

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

print(f"\n  Dataset : {len(df):,} obs, {len(df.columns)} vars")
print(f"  Prévalence MetS : {df['mets_outcome'].mean()*100:.1f}%")
print(f"  Prévalence Obésité : {df['obesity_outcome'].mean()*100:.1f}%")
print(f"\n  Par cycle :")
for cycle in sorted(df['cycle'].unique()):
    n = (df['cycle'] == cycle).sum()
    mets_r = df.loc[df['cycle']==cycle, 'mets_outcome'].mean()*100
    print(f"    {cycle}: {n:>6,} (MetS {mets_r:.1f}%)")

miss = df.isnull().sum()
print(f"\n  Manquants :")
for c in miss[miss > 0].index:
    pct = miss[c] / len(df) * 100
    print(f"    {c}: {miss[c]:,} ({pct:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 3 : MICE
# ═══════════════════════════════════════════════════════════════════════

print("\n[3/6] Imputation MICE (5 imputations × 3 itérations — adapté à N=59k)...")

# Avec N~59k, 5 imputations suffisent (Rubin, 1987; White et al., 2011)
# On utilise aussi un sous-échantillon pour le fit des modèles MICE (accélère x10)

from sklearn.linear_model import Ridge

impute_cols = [c for c in [
    'bmi', 'waist', 'whtr', 'homaIR', 'hba1c', 'crphs', 'tghdl',
    'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate',
    'phq9', 'sleepHours', 'physicalActivityMinWeek', 'drinksPerWeek'
] if c in df.columns]

N_IMPUTATIONS = 5
N_ITERATIONS = 3
MAX_TRAIN = 15000  # Sous-échantillon pour fit (Ridge sur 15k ≈ instantané)
rng = np.random.RandomState(42)

imputed_datasets = []
for m in range(N_IMPUTATIONS):
    t0 = time.time()
    df_imp = df.copy()
    seed = rng.randint(0, 2**31)
    rng_m = np.random.RandomState(seed)
    # Init: médiane + bruit
    for col in impute_cols:
        mask = df_imp[col].isnull()
        if mask.sum() == 0: continue
        med = df_imp[col].median()
        std = df_imp[col].std()
        if pd.isna(med): med = 0
        if pd.isna(std) or std == 0: std = 1
        df_imp.loc[mask, col] = med + rng_m.normal(0, std*0.1, mask.sum())
    # Itérations
    for it in range(N_ITERATIONS):
        for col in impute_cols:
            mask = df[col].isnull()
            if mask.sum() == 0: continue
            preds = [c for c in impute_cols if c != col]
            obs_idx = np.where(~mask)[0]
            # Sous-échantillonner pour le fit
            if len(obs_idx) > MAX_TRAIN:
                sub = rng_m.choice(obs_idx, MAX_TRAIN, replace=False)
            else:
                sub = obs_idx
            X_tr = df_imp.iloc[sub][preds].fillna(0).values
            y_tr = df_imp.iloc[sub][col].values
            model = Ridge(alpha=1.0)
            model.fit(X_tr, y_tr)
            X_pr = df_imp.loc[mask, preds].fillna(0).values
            y_pr = model.predict(X_pr)
            resid = y_tr - model.predict(X_tr)
            sigma = resid.std()
            df_imp.loc[mask, col] = y_pr + rng_m.normal(0, max(sigma, 1e-6), len(y_pr))
    imputed_datasets.append(df_imp)
    print(f"  Imputation {m+1}/{N_IMPUTATIONS} ({time.time()-t0:.0f}s)")

print(f"  ✓ {len(imputed_datasets)} jeux imputés")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 4 : SCORE BMN v3.0
# ═══════════════════════════════════════════════════════════════════════

print("\n[4/6] Application du SCORE BMN v3.0 (vectorisé)...")

ETHNIC_PROFILES = {
    'eu': {'bmiSurpoids':25,'bmiObesite':30,'waistF':88,'waistM':102,'dR':1.0,'hR':1.0,'cR':1.0,'iM':1.0,'ev':0},
    'af': {'bmiSurpoids':25,'bmiObesite':30,'waistF':88,'waistM':102,'dR':1.3,'hR':1.5,'cR':1.2,'iM':1.3,'ev':-1.5},
    'ea': {'bmiSurpoids':23,'bmiObesite':27.5,'waistF':80,'waistM':88,'dR':0.9,'hR':0.9,'cR':0.7,'iM':0.9,'ev':1.5},
    'sa': {'bmiSurpoids':23,'bmiObesite':27.5,'waistF':80,'waistM':90,'dR':2.0,'hR':1.3,'cR':1.5,'iM':1.2,'ev':-1.5},
    'im': {'bmiSurpoids':23,'bmiObesite':27.5,'waistF':80,'waistM':90,'dR':2.0,'hR':1.2,'cR':1.4,'iM':1.2,'ev':-1.5},
}

BIOMARKERS = {
    'homaIR':{'w':2.5,'normal':2.5,'abnormal':4.0,'inv':False},
    'hba1c':{'w':2.0,'normal':5.7,'abnormal':6.5,'inv':False},
    'crphs':{'w':2.0,'normal':1.0,'abnormal':3.0,'inv':False},
    'tghdl':{'w':2.0,'normal':2.0,'abnormal':3.5,'inv':False},
    'glyc':{'w':1.8,'normal':5.6,'abnormal':7.0,'inv':False},
    'ldl':{'w':1.8,'normal':3.0,'abnormal':4.1,'inv':False},
    'tg':{'w':1.5,'normal':1.7,'abnormal':2.3,'inv':False},
    'hdl':{'w':1.0,'normal':1.0,'abnormal':0.7,'inv':True},
    'asat':{'w':1.0,'normal':40,'abnormal':60,'inv':False},
    'ggt':{'w':0.8,'normal':50,'abnormal':80,'inv':False},
    'urate':{'w':0.8,'normal':360,'abnormal':420,'inv':False},
}


def compute_bmn_vectorized(ds):
    """Score BMN v3.0 entièrement vectorisé — ~100x plus rapide que apply."""
    n = len(ds)
    eth = ds['ethnicCode'].fillna('eu').values
    age = ds['age'].fillna(40).values
    is_M = (ds['sex'] == 'M').values
    is_F = ~is_M
    bmi_val = ds['bmi'].fillna(25).values
    waist_val = ds['waist'].fillna(80).values
    whtr_val = ds['whtr'].fillna(0.5).values

    # Profils ethniques vectorisés
    ep_bmiS = np.where(np.isin(eth, ['ea','sa','im']), 23, 25).astype(float)
    ep_bmiO = np.where(np.isin(eth, ['ea','sa','im']), 27.5, 30).astype(float)
    ep_waistF = np.where(np.isin(eth, ['ea','sa','im']), 80, 88).astype(float)
    ep_waistM = np.where(eth == 'ea', 88, np.where(np.isin(eth, ['sa','im']), 90, 102)).astype(float)
    ep_dR = np.where(eth == 'af', 1.3, np.where(eth == 'ea', 0.9, np.where(np.isin(eth, ['sa','im']), 2.0, 1.0)))
    ep_hR = np.where(eth == 'af', 1.5, np.where(eth == 'ea', 0.9, np.where(eth == 'sa', 1.3, np.where(eth == 'im', 1.2, 1.0))))
    ep_cR = np.where(eth == 'af', 1.2, np.where(eth == 'ea', 0.7, np.where(eth == 'sa', 1.5, np.where(eth == 'im', 1.4, 1.0))))
    ep_ev = np.where(eth == 'ea', 1.5, np.where(np.isin(eth, ['af','sa','im']), -1.5, 0.0))

    # C1 (age)
    c1 = np.where(age >= 65, 10, np.where(age >= 55, 7, np.where(age >= 45, 5, np.where(age >= 40, 2, 0)))).astype(float)
    # C2 (sexe/age)
    c2 = np.where(is_M & (age < 60), 2, 0).astype(float)

    # C3 (anthropo)
    imc = np.where(bmi_val >= ep_bmiO + 5, 7, np.where(bmi_val >= ep_bmiO, 5, np.where(bmi_val >= ep_bmiS, 3, 0))).astype(float)
    wp = np.where(whtr_val >= 0.60, 3, np.where(whtr_val >= 0.55, 2, np.where(whtr_val >= 0.50, 1, 0))).astype(float)
    tt = np.where(is_F, ep_waistF, ep_waistM)
    d_waist = waist_val - tt
    tp = np.where(d_waist > 10, 2, np.where(d_waist > 0, 1, 0)).astype(float)
    c3 = np.minimum(12, imc + wp + tp)

    # C4 (comorbidités)
    has_diab = ds['has_diabetes'].fillna(0).values if 'has_diabetes' in ds.columns else np.zeros(n)
    has_hta = ds['has_hta'].fillna(0).values if 'has_hta' in ds.columns else np.zeros(n)
    has_hypo = ds['has_hypo'].fillna(0).values if 'has_hypo' in ds.columns else np.zeros(n)
    has_mets = ds['mets_outcome'].fillna(0).values if 'mets_outcome' in ds.columns else np.zeros(n)
    bk = np.zeros(n)
    bk += (has_diab == 1) * 14 * ep_dR * ep_cR
    bk += (has_hta == 1) * 10 * ep_hR * ep_cR
    bk += (has_hypo == 1) * 6 * ep_cR
    bk += (has_mets == 1) * 12 * ep_cR
    bk = np.minimum(50, bk)
    c4 = np.round((bk / 50) * 10)

    # C6 (tabac)
    tob = ds['tobaccoStatus'].fillna(0).values.astype(int) if 'tobaccoStatus' in ds.columns else np.zeros(n, dtype=int)
    tob = np.clip(tob, 0, 4)
    tob_map = np.array([0, 1, 2, 4, 8])
    c6 = tob_map[tob].astype(float)

    # C7 (PHQ-9)
    phq9 = ds['phq9'].fillna(0).values if 'phq9' in ds.columns else np.zeros(n)
    c7 = np.where(phq9 >= 20, 4, np.where(phq9 >= 15, 3, np.where(phq9 >= 10, 2, np.where(phq9 >= 5, 1, 0)))).astype(float)

    # C8 (sommeil)
    sh = ds['sleepHours'].fillna(7).values if 'sleepHours' in ds.columns else np.full(n, 7.0)
    c8 = np.where(sh < 5, 3, np.where(sh < 6, 2, np.where(sh < 7, 1, 0))).astype(float)

    # C total
    C_raw = c1 + c2 + c3 + c4 + c6 + c7 + c8
    C_total = np.minimum(50, np.round(C_raw * (1 + ep_ev / 100)))

    # L (lifestyle)
    pa = ds['physicalActivityMinWeek'].fillna(150).values if 'physicalActivityMinWeek' in ds.columns else np.full(n, 150.0)
    l1 = np.where(pa >= 150, 0, np.where(pa >= 75, 1, np.where(pa >= 30, 2, 3))).astype(float)
    dpw = ds['drinksPerWeek'].fillna(0).values if 'drinksPerWeek' in ds.columns else np.zeros(n)
    l3 = np.where(dpw > 21, 2, np.where(dpw > 14, 1, 0)).astype(float)
    l4 = np.where(sh < 6, 2, np.where(sh < 7, 1, 0)).astype(float)
    L = np.minimum(10, l1 + l3 + l4)

    sD = np.minimum(100, C_total + L)

    # bioNorm
    szw = np.zeros(n)
    sw = np.zeros(n)
    for bid, bd in BIOMARKERS.items():
        if bid not in ds.columns:
            continue
        vals = ds[bid].values
        valid = ~np.isnan(vals)
        z = np.zeros(n)
        if bd['inv']:
            denom = bd['normal'] - bd['abnormal']
            if denom != 0:
                z = (bd['normal'] - vals) / denom
        else:
            denom = bd['abnormal'] - bd['normal']
            if denom != 0:
                z = (vals - bd['normal']) / denom
        z = np.clip(z, 0, 1)
        szw += np.where(valid, z * bd['w'], 0)
        sw += np.where(valid, bd['w'], 0)
    bioNorm = np.where(sw > 0, np.round((szw / sw) * 100), 0)

    # sf
    wD = np.full(n, 0.65)
    wB = np.full(n, 0.35)
    gap = bioNorm - sD
    adjust = gap > 20
    extra = np.minimum(0.30, ((gap - 20) / 100) * 0.60)
    wB = np.where(adjust, 0.35 + extra, wB)
    wD = 1 - wB
    sf = np.round(wD * sD + wB * bioNorm)

    bf = np.round(0.75 * bioNorm)
    sf = np.maximum(sf, bf)
    bef_90 = np.maximum(80, np.round(0.85 * bioNorm))
    bef_80 = np.round(0.85 * bioNorm)
    sf = np.where(bioNorm > 90, np.maximum(sf, bef_90), np.where(bioNorm > 80, np.maximum(sf, bef_80), sf))

    hba1c_val = ds['hba1c'].fillna(5.0).values if 'hba1c' in ds.columns else np.full(n, 5.0)
    sf = np.where((hba1c_val >= 8.0) & (sf < 70), 70, sf)
    sf = np.where((hba1c_val >= 6.5) & (hba1c_val < 8.0) & (sf < 60), 60, sf)
    sf = np.minimum(100, sf)

    label = np.where(sf >= 80, 'TRES_ELEVE', np.where(sf >= 60, 'ELEVE', np.where(sf >= 30, 'MODERE', 'FAIBLE')))

    return sD, bioNorm, sf, label, bk


all_sf = []
for i, ds in enumerate(imputed_datasets):
    sD, bioNorm, sf, label, bk = compute_bmn_vectorized(ds)
    ds['sD'] = sD; ds['bioNorm'] = bioNorm; ds['sf'] = sf; ds['label'] = label; ds['bmn_k'] = bk
    imputed_datasets[i] = ds
    all_sf.append(sf)
    if (i + 1) % 5 == 0:
        print(f"  Dataset {i+1}/{len(imputed_datasets)}")

sf_matrix = np.array(all_sf)
df['sf'] = sf_matrix.mean(axis=0)
ref = imputed_datasets[0]
for col in ['sD', 'bioNorm', 'label', 'bmn_k']:
    df[col] = ref[col]

print(f"\n  ✓ sf moyen : {df['sf'].mean():.1f} ± {df['sf'].std():.1f}")
print(f"  FAIBLE:     {(df['sf'] < 30).sum():>6,} ({(df['sf'] < 30).mean()*100:.1f}%)")
print(f"  MODÉRÉ:     {((df['sf']>=30)&(df['sf']<60)).sum():>6,} ({((df['sf']>=30)&(df['sf']<60)).mean()*100:.1f}%)")
print(f"  ÉLEVÉ:      {((df['sf']>=60)&(df['sf']<80)).sum():>6,} ({((df['sf']>=60)&(df['sf']<80)).mean()*100:.1f}%)")
print(f"  TRÈS ÉLEVÉ: {(df['sf']>=80).sum():>6,} ({(df['sf']>=80).mean()*100:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 5 : VALIDATION
# ═══════════════════════════════════════════════════════════════════════

print("\n[5/6] Validation statistique...")

outcomes = {'MetS': 'mets_outcome', 'Obesity': 'obesity_outcome'}
results = {}

for oname, ocol in outcomes.items():
    print(f"\n  ── {oname} ──")
    vm = df[ocol].notna() & df['sf'].notna()
    y = df.loc[vm, ocol].values.astype(int)
    sf_prob = df.loc[vm, 'sf'].values / 100.0

    if len(y) < 100 or y.sum() < 10:
        print(f"    ⚠ Insuffisant"); continue

    print(f"    N={len(y):,}, Events={y.sum():,} ({y.mean()*100:.1f}%)")

    # AUC + Bootstrap
    auc = roc_auc_score(y, sf_prob)
    ab = []
    for b in range(1000):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx])) < 2: continue
        ab.append(roc_auc_score(y[idx], sf_prob[idx]))
    ab = np.array(ab)
    ci_lo, ci_hi = np.percentile(ab, 2.5), np.percentile(ab, 97.5)
    print(f"    AUC = {auc:.4f} [{ci_lo:.4f} - {ci_hi:.4f}]")

    fpr, tpr, _ = roc_curve(y, sf_prob)

    # Modèles ML
    fcols = [c for c in ['age','bmi','waist','homaIR','hba1c','crphs','tghdl','glyc','ldl','tg','hdl','tobaccoStatus'] if c in df.columns]
    X_ml = imputed_datasets[0].loc[vm, fcols].values
    X_sc = StandardScaler().fit_transform(X_ml)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42),
    }
    m_aucs = {}; m_probs = {}
    for mn, mdl in models.items():
        pr = cross_val_predict(mdl, X_sc, y, cv=cv, method='predict_proba')[:,1]
        a = roc_auc_score(y, pr)
        m_aucs[mn] = a; m_probs[mn] = pr
        print(f"    {mn}: AUC = {a:.4f}")
    m_aucs['SCORE BMN v3.0'] = auc
    m_probs['SCORE BMN v3.0'] = sf_prob

    # NRI
    ref_pr = m_probs['Logistic Regression']
    def cr(p):
        if p >= 0.60: return 2
        if p >= 0.30: return 1
        return 0
    cb = np.array([cr(p) for p in sf_prob])
    cref = np.array([cr(p) for p in ref_pr])
    ev = y == 1; nev = y == 0
    nri_e = (((cb > cref) & ev).sum() - ((cb < cref) & ev).sum()) / ev.sum()
    nri_ne = (((cb < cref) & nev).sum() - ((cb > cref) & nev).sum()) / nev.sum()
    nri = nri_e + nri_ne
    nri_b = []
    for b in range(1000):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb=y[idx]; cbb=cb[idx]; crb=cref[idx]
        e=yb==1; ne=yb==0
        if e.sum()==0 or ne.sum()==0: continue
        ne_ = ((cbb>crb)&e).sum()/e.sum()-((cbb<crb)&e).sum()/e.sum()
        nne_ = ((cbb<crb)&ne).sum()/ne.sum()-((cbb>crb)&ne).sum()/ne.sum()
        nri_b.append(ne_+nne_)
    nri_b = np.array(nri_b)
    nri_ci = (np.percentile(nri_b,2.5), np.percentile(nri_b,97.5))
    nri_p = 2*(1-stats.norm.cdf(abs(nri/nri_b.std()))) if nri_b.std()>0 else 1
    print(f"    NRI = {nri:.4f} [{nri_ci[0]:.4f}, {nri_ci[1]:.4f}] p={nri_p:.4f}")

    # IDI
    di_bmn = sf_prob[ev].mean() - sf_prob[nev].mean()
    di_ref = ref_pr[ev].mean() - ref_pr[nev].mean()
    idi = di_bmn - di_ref
    idi_b = []
    for b in range(1000):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb=y[idx]; e=yb==1; ne=yb==0
        if e.sum()==0 or ne.sum()==0: continue
        idi_b.append((sf_prob[idx][e].mean()-sf_prob[idx][ne].mean())-(ref_pr[idx][e].mean()-ref_pr[idx][ne].mean()))
    idi_b = np.array(idi_b)
    idi_ci = (np.percentile(idi_b,2.5), np.percentile(idi_b,97.5))
    idi_p = 2*(1-stats.norm.cdf(abs(idi/idi_b.std()))) if idi_b.std()>0 else 1
    print(f"    IDI = {idi:.4f} [{idi_ci[0]:.4f}, {idi_ci[1]:.4f}] p={idi_p:.4f}")

    # Brier
    br_bmn = brier_score_loss(y, sf_prob)
    br_lr = brier_score_loss(y, ref_pr)
    print(f"    Brier: BMN={br_bmn:.4f} vs LR={br_lr:.4f}")

    # HL
    si = np.argsort(sf_prob); gs = np.array_split(si, 10)
    hl = 0; obs_r = []; pred_r = []
    for g in gs:
        o=y[g].mean(); p=sf_prob[g].mean()
        obs_r.append(o); pred_r.append(p)
        if 0<p<1: hl += len(g)*(o-p)**2/(p*(1-p))
    hl_p = 1-stats.chi2.cdf(hl, 8)
    print(f"    HL χ²={hl:.1f}, p={hl_p:.4f}")

    # DeLong
    dab = []
    for b in range(1000):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx]))<2: continue
        dab.append(roc_auc_score(y[idx],sf_prob[idx])-roc_auc_score(y[idx],ref_pr[idx]))
    dab = np.array(dab)
    dd = auc-m_aucs['Logistic Regression']
    dp = 2*(1-stats.norm.cdf(abs(dd/dab.std()))) if dab.std()>0 else 1
    print(f"    ΔAUC vs LR = {dd:.4f}, p={dp:.4f}")

    # MC
    mc = []
    for ds in imputed_datasets:
        si2 = ds.loc[vm, 'sf'].values/100.0
        if len(np.unique(y))>=2: mc.append(roc_auc_score(y, si2))
    mc = np.array(mc)
    print(f"    MC AUC: {mc.mean():.4f} ± {mc.std():.4f}")

    results[oname] = {
        'N':len(y), 'events':int(y.sum()), 'prevalence':float(y.mean()),
        'AUC_BMN':float(auc), 'AUC_CI':[float(ci_lo),float(ci_hi)],
        'AUC_models':{k:float(v) for k,v in m_aucs.items()},
        'NRI':float(nri), 'NRI_CI':[float(nri_ci[0]),float(nri_ci[1])], 'NRI_p':float(nri_p),
        'NRI_events':float(nri_e), 'NRI_nonevents':float(nri_ne),
        'IDI':float(idi), 'IDI_CI':[float(idi_ci[0]),float(idi_ci[1])], 'IDI_p':float(idi_p),
        'Brier_BMN':float(br_bmn), 'Brier_LR':float(br_lr),
        'HL_chi2':float(hl), 'HL_p':float(hl_p),
        'DeLong_diff':float(dd), 'DeLong_p':float(dp),
        'MC_AUC_mean':float(mc.mean()), 'MC_AUC_std':float(mc.std()),
        'fpr':fpr.tolist(), 'tpr':tpr.tolist(),
        'obs_rates':obs_r, 'pred_rates':pred_r,
        'model_probs':{k:v.tolist() for k,v in m_probs.items()},
    }


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 6 : FIGURES
# ═══════════════════════════════════════════════════════════════════════

print("\n[6/6] Figures...")
plt.rcParams.update({'font.size':11,'axes.labelsize':12,'axes.titlesize':13,'figure.dpi':300,'savefig.dpi':300,'savefig.bbox':'tight'})
sns.set_style("whitegrid")

for oname, res in results.items():
    tag = oname.lower()
    vm = df[outcomes[oname]].notna() & df['sf'].notna()
    y_out = df.loc[vm, outcomes[oname]].values.astype(int)
    sf_out = df.loc[vm, 'sf'].values / 100.0

    # ROC
    fig, ax = plt.subplots(figsize=(8,7))
    ax.plot(res['fpr'], res['tpr'], 'b-', lw=2.5, label=f"BMN v3.0 (AUC={res['AUC_BMN']:.3f})")
    cols = {'Logistic Regression':'#e74c3c','Random Forest':'#2ecc71','Gradient Boosting':'#f39c12'}
    for mn, av in res['AUC_models'].items():
        if mn=='SCORE BMN v3.0': continue
        pr = np.array(res['model_probs'][mn])
        f2,t2,_ = roc_curve(y_out, pr)
        ax.plot(f2, t2, '--', color=cols.get(mn,'gray'), lw=1.5, label=f"{mn} ({av:.3f})")
    ax.plot([0,1],[0,1],'k--',alpha=0.3)
    ax.set_xlabel('1 - Specificity'); ax.set_ylabel('Sensitivity')
    ax.set_title(f'ROC — {oname}\nNHANES 1999-2018 (N={res["N"]:,})')
    ax.legend(loc='lower right', fontsize=9)
    fig.savefig(f'{OUTPUT_DIR}/fig1_roc_{tag}.png'); plt.close(fig)
    print(f"  ✓ fig1_roc_{tag}.png")

    # Calibration
    fig, ax = plt.subplots(figsize=(7,7))
    fp, mp = calibration_curve(y_out, sf_out, n_bins=10, strategy='quantile')
    ax.plot(mp, fp, 'bo-', lw=2, ms=8, label='BMN v3.0')
    ax.plot([0,1],[0,1],'k--',alpha=0.4, label='Perfect')
    plr = np.array(res['model_probs']['Logistic Regression'])
    flr, mlr = calibration_curve(y_out, plr, n_bins=10, strategy='quantile')
    ax.plot(mlr, flr, 'r^--', lw=1.5, ms=6, label='Logistic Reg')
    ax.set_xlabel('Predicted'); ax.set_ylabel('Observed')
    ax.set_title(f'Calibration — {oname} (HL p={res["HL_p"]:.3f})')
    ax.legend()
    fig.savefig(f'{OUTPUT_DIR}/fig2_cal_{tag}.png'); plt.close(fig)
    print(f"  ✓ fig2_cal_{tag}.png")

    # Distribution
    fig, ax = plt.subplots(figsize=(9,5))
    sfa = df.loc[vm, 'sf'].values
    ax.hist(sfa[y_out==0], bins=40, alpha=0.6, color='#3498db', density=True, label=f'No {oname}')
    ax.hist(sfa[y_out==1], bins=40, alpha=0.6, color='#e74c3c', density=True, label=oname)
    ax.axvline(30, color='orange', ls='--', alpha=0.7); ax.axvline(60, color='red', ls='--', alpha=0.7)
    ax.set_xlabel('SCORE BMN'); ax.set_ylabel('Density')
    ax.set_title(f'Distribution — {oname} (N={res["N"]:,})')
    ax.legend(fontsize=9)
    fig.savefig(f'{OUTPUT_DIR}/fig3_dist_{tag}.png'); plt.close(fig)
    print(f"  ✓ fig3_dist_{tag}.png")

# MC Sensitivity
fig, axes = plt.subplots(1,2,figsize=(14,5))
for idx, (oname, res) in enumerate(results.items()):
    ax = axes[idx]
    vm = df[outcomes[oname]].notna() & df['sf'].notna()
    y_out = df.loc[vm, outcomes[oname]].values.astype(int)
    mc_a = [roc_auc_score(y_out, ds.loc[vm,'sf'].values/100.0) for ds in imputed_datasets]
    ax.bar(range(1, len(mc_a)+1), mc_a, color='#3498db', alpha=0.7)
    ax.axhline(np.mean(mc_a), color='red', ls='--', lw=2, label=f'Mean={np.mean(mc_a):.4f}')
    ax.set_xlabel('Imputation #'); ax.set_ylabel('AUC')
    ax.set_title(f'MC — {oname}'); ax.legend()
fig.tight_layout(); fig.savefig(f'{OUTPUT_DIR}/fig4_mc.png'); plt.close(fig)
print(f"  ✓ fig4_mc.png")

# Forest Plot
fig, ax = plt.subplots(figsize=(10,6))
labs=[]; aucs=[]; cilo=[]; cihi=[]
for oname, res in results.items():
    vm = df[outcomes[oname]].notna() & df['sf'].notna()
    y_out = df.loc[vm, outcomes[oname]].values.astype(int)
    for mn, av in res['AUC_models'].items():
        labs.append(f"{mn}\n({oname})"); aucs.append(av)
        pr = np.array(res['model_probs'][mn])
        ba = [roc_auc_score(y_out[i:=np.random.choice(len(y_out),len(y_out),replace=True)], pr[i])
              for _ in range(500) if len(np.unique(y_out[i:=np.random.choice(len(y_out),len(y_out),replace=True)])) >= 2]
        cilo.append(np.percentile(ba,2.5)); cihi.append(np.percentile(ba,97.5))
xerr = [np.array(aucs)-np.array(cilo), np.array(cihi)-np.array(aucs)]
cols_fp = ['#2980b9' if 'BMN' in m else '#95a5a6' for m in labs]
ax.barh(range(len(labs)), aucs, xerr=xerr, color=cols_fp, alpha=0.8, height=0.6, capsize=3)
ax.set_yticks(range(len(labs))); ax.set_yticklabels(labs, fontsize=9)
ax.set_xlabel('AUC-ROC'); ax.set_title('Forest Plot — NHANES 1999-2018')
ax.axvline(0.5, color='red', ls='--', alpha=0.3)
fig.tight_layout(); fig.savefig(f'{OUTPUT_DIR}/fig5_forest.png'); plt.close(fig)
print(f"  ✓ fig5_forest.png")

# Heatmap biomarqueurs
fig, ax = plt.subplots(figsize=(12,5))
bcols = [c for c in ['homaIR','hba1c','crphs','tghdl','glyc','ldl','tg','hdl','asat','ggt','urate'] if c in df.columns]
df['sf_q'] = pd.qcut(df['sf'], q=4, labels=['Q1','Q2','Q3','Q4'], duplicates='drop')
bq = df.groupby('sf_q')[bcols].mean()
bn = (bq-bq.min())/(bq.max()-bq.min()+1e-9)
sns.heatmap(bn.T, annot=bq.T.round(2).values, fmt='', cmap='YlOrRd', ax=ax, linewidths=0.5)
ax.set_title('Biomarkers by BMN Quartile — NHANES 1999-2018')
fig.tight_layout(); fig.savefig(f'{OUTPUT_DIR}/fig6_heatmap.png'); plt.close(fig)
print(f"  ✓ fig6_heatmap.png")

# AUC par cycle
fig, axes = plt.subplots(1,2,figsize=(16,6))
for idx, (oname, ocol) in enumerate(outcomes.items()):
    ax = axes[idx]
    ca = {}
    for cyc in sorted(df['cycle'].unique()):
        m = (df['cycle']==cyc) & df[ocol].notna() & df['sf'].notna()
        if m.sum() < 50: continue
        yc = df.loc[m, ocol].values.astype(int)
        sc = df.loc[m, 'sf'].values / 100.0
        if len(np.unique(yc)) < 2: continue
        ca[cyc] = roc_auc_score(yc, sc)
    bars = ax.bar(ca.keys(), ca.values(), color='#3498db', alpha=0.8)
    ax.axhline(results[oname]['AUC_BMN'], color='red', ls='--', label=f'Pooled={results[oname]["AUC_BMN"]:.3f}')
    ax.set_ylabel('AUC'); ax.set_title(f'AUC by Cycle — {oname}')
    ax.legend(); ax.set_ylim([0.5, 1.0])
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
    for bar, (c, a) in zip(bars, ca.items()):
        ax.text(bar.get_x()+bar.get_width()/2., bar.get_height()+0.005, f'{a:.3f}',
                ha='center', va='bottom', fontsize=9, fontweight='bold')
fig.tight_layout(); fig.savefig(f'{OUTPUT_DIR}/fig7_by_cycle.png'); plt.close(fig)
print(f"  ✓ fig7_by_cycle.png")

# Trend temporel
fig, ax = plt.subplots(figsize=(10,5))
cycle_stats = []
for cyc in sorted(df['cycle'].unique()):
    sub = df[df['cycle']==cyc]
    cycle_stats.append({
        'cycle': cyc,
        'N': len(sub),
        'MetS%': sub['mets_outcome'].mean()*100,
        'Obesity%': sub['obesity_outcome'].mean()*100,
        'sf_mean': sub['sf'].mean(),
    })
cs = pd.DataFrame(cycle_stats)
ax.plot(cs['cycle'], cs['MetS%'], 'ro-', lw=2, ms=8, label='MetS %')
ax.plot(cs['cycle'], cs['Obesity%'], 'bs-', lw=2, ms=8, label='Obesity %')
ax2 = ax.twinx()
ax2.plot(cs['cycle'], cs['sf_mean'], 'g^--', lw=2, ms=8, label='Mean BMN sf')
ax.set_xlabel('NHANES Cycle'); ax.set_ylabel('Prevalence (%)')
ax2.set_ylabel('Mean SCORE BMN', color='green')
ax.legend(loc='upper left'); ax2.legend(loc='upper right')
ax.set_title('Temporal Trends — NHANES 1999-2018')
plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
fig.tight_layout(); fig.savefig(f'{OUTPUT_DIR}/fig8_trends.png'); plt.close(fig)
print(f"  ✓ fig8_trends.png")


# ═══════════════════════════════════════════════════════════════════════
# RÉSULTATS
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("  RÉSULTATS — COHORTE MAXIMALE (10 CYCLES NHANES)")
print("=" * 70)

print(f"\n═══ TABLE 1: Cohorte ═══")
print(f"  Total N = {len(df):,}")
print(f"  Cycles : {', '.join(sorted(df['cycle'].unique()))}")
for cyc in sorted(df['cycle'].unique()):
    n = (df['cycle']==cyc).sum()
    print(f"    {cyc}: {n:,}")
print(f"  Age : {df['age'].mean():.1f} ± {df['age'].std():.1f}")
print(f"  Hommes : {(df['sex']=='M').sum():,} ({(df['sex']=='M').mean()*100:.1f}%)")
print(f"  BMI : {df['bmi'].mean():.1f} ± {df['bmi'].std():.1f}")
print(f"  MetS : {df['mets_outcome'].sum():,} ({df['mets_outcome'].mean()*100:.1f}%)")
print(f"  Obésité : {df['obesity_outcome'].sum():,} ({df['obesity_outcome'].mean()*100:.1f}%)")
print(f"  sf : {df['sf'].mean():.1f} ± {df['sf'].std():.1f}")

print(f"\n═══ TABLE 2: Performance ═══")
print(f"{'Metric':<35} ", end="")
for o in results: print(f"{'  '+o:<25}", end="")
print()
print("-"*85)
metrics = [
    ('AUC BMN [IC95%]', lambda r: f"{r['AUC_BMN']:.3f} [{r['AUC_CI'][0]:.3f}-{r['AUC_CI'][1]:.3f}]"),
    ('AUC Logistic', lambda r: f"{r['AUC_models']['Logistic Regression']:.3f}"),
    ('AUC RF', lambda r: f"{r['AUC_models']['Random Forest']:.3f}"),
    ('AUC GB', lambda r: f"{r['AUC_models']['Gradient Boosting']:.3f}"),
    ('ΔAUC vs LR', lambda r: f"{r['DeLong_diff']:+.4f} (p={r['DeLong_p']:.3f})"),
    ('NRI [IC95%]', lambda r: f"{r['NRI']:.3f} [{r['NRI_CI'][0]:.3f},{r['NRI_CI'][1]:.3f}]"),
    ('IDI [IC95%]', lambda r: f"{r['IDI']:.4f} [{r['IDI_CI'][0]:.4f},{r['IDI_CI'][1]:.4f}]"),
    ('Brier BMN/LR', lambda r: f"{r['Brier_BMN']:.4f}/{r['Brier_LR']:.4f}"),
    ('HL χ² (p)', lambda r: f"{r['HL_chi2']:.1f} ({r['HL_p']:.3f})"),
    ('MC AUC±SD', lambda r: f"{r['MC_AUC_mean']:.4f}±{r['MC_AUC_std']:.4f}"),
]
for label, fn in metrics:
    print(f"{label:<35} ", end="")
    for o, r in results.items():
        try: print(f"{'  '+fn(r):<25}", end="")
        except: print(f"{'  N/A':<25}", end="")
    print()

print(f"\n═══ TABLE 3: MetS par catégorie BMN ═══")
cats = [('FAIBLE',0,30),('MODÉRÉ',30,60),('ÉLEVÉ',60,80),('TRÈS ÉLEVÉ',80,101)]
print(f"{'Cat':<15} {'N':>8} {'MetS':>8} {'%':>7} {'OR':>10} {'p':>10}")
print("-"*60)
ref = df[df['sf']<30]
for cn,lo,hi in cats:
    sub = df[(df['sf']>=lo)&(df['sf']<hi)]
    if len(sub)==0: continue
    n=len(sub); nm=int(sub['mets_outcome'].sum()); rt=sub['mets_outcome'].mean()
    if cn=='FAIBLE':
        print(f"{cn:<15} {n:>8,} {nm:>8,} {rt*100:>6.1f}% {'Ref':>10} {'-':>10}")
    else:
        a=nm; b=n-nm; c=int(ref['mets_outcome'].sum()); d=len(ref)-c
        if b>0 and c>0 and d>0:
            orr=(a*d)/(b*c); _,p=stats.fisher_exact(np.array([[a,b],[c,d]]))
            print(f"{cn:<15} {n:>8,} {nm:>8,} {rt*100:>6.1f}% {orr:>10.2f} {p:>10.4f}")

# Comparaison 3 tailles
print(f"\n═══ TABLE 4: Comparaison des 3 tailles de cohorte ═══")
print(f"{'Metric':<30} {'N≈5,856':>15} {'N≈23,825':>15} {'N≈{0}':>15}".format(len(df)))
print("-"*75)
old1 = None; old2 = None
if os.path.exists('/home/user/bmn_validation/results.json'):
    with open('/home/user/bmn_validation/results.json') as f: old1 = json.load(f)
if os.path.exists('/home/user/bmn_validation_large/results_large.json'):
    with open('/home/user/bmn_validation_large/results_large.json') as f: old2 = json.load(f)

def safe_get(d, *keys):
    try:
        v = d
        for k in keys: v = v[k]
        return v
    except: return None

comps = [
    ('N (MetS)', 'MetS','N'),
    ('AUC MetS', 'MetS','AUC_BMN'),
    ('AUC Obesity', 'Obesity','AUC_BMN'),
    ('Brier MetS', 'MetS','Brier_BMN'),
    ('MC AUC MetS', 'MetS','MC_AUC_mean'),
]
for label, *keys in comps:
    v1 = safe_get(old1, *keys)
    v2 = safe_get(old2, *keys)
    v3 = safe_get(results, *keys)
    def fmt(v):
        if v is None: return 'N/A'
        if isinstance(v, int): return f"{v:,}"
        return f"{v:.4f}"
    print(f"{label:<30} {fmt(v1):>15} {fmt(v2):>15} {fmt(v3):>15}")

# IC95% width
for label, outcome in [('IC95% width MetS','MetS'), ('IC95% width Obesity','Obesity')]:
    def ciw(d, o):
        try: return d[o]['AUC_CI'][1]-d[o]['AUC_CI'][0]
        except: return None
    v1=ciw(old1,outcome) if old1 else None
    v2=ciw(old2,outcome) if old2 else None
    v3=ciw(results,outcome)
    def fmt(v):
        if v is None: return 'N/A'
        return f"{v:.4f}"
    print(f"{label:<30} {fmt(v1):>15} {fmt(v2):>15} {fmt(v3):>15}")

# Save
sr = {k:{kk:vv for kk,vv in v.items() if kk not in ['fpr','tpr','model_probs']} for k,v in results.items()}
with open(f'{OUTPUT_DIR}/results_max.json', 'w') as f:
    json.dump(sr, f, indent=2)

print(f"\n  ✓ {OUTPUT_DIR}/results_max.json")
print(f"\n  Fichiers :")
for fn in sorted(os.listdir(OUTPUT_DIR)):
    print(f"    {fn} ({os.path.getsize(f'{OUTPUT_DIR}/{fn}'):,} bytes)")

print("\n" + "="*70)
print("  ANALYSE MAXIMALE TERMINÉE")
print("="*70)
