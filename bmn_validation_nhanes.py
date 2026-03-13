"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.5 — VALIDATION SCIENTIFIQUE SUR COHORTE NHANES
═══════════════════════════════════════════════════════════════════════════

Pipeline complet :
  1. Récupération multi-tables NHANES (2017-2018)
  2. Imputation Monte Carlo (MICE — Multiple Imputation by Chained Equations)
  3. Application du SCORE BMN v3.5 (porté en Python)
  4. Validation statistique :
     - AUC-ROC + IC95% bootstrap
     - NRI (Net Reclassification Improvement)
     - IDI (Integrated Discrimination Improvement)
     - Calibration (Hosmer-Lemeshow, calibration plot)
     - Analyse de sensibilité Monte Carlo
     - Modèles comparatifs (Logistic, Random Forest, GradientBoosting)
  5. Génération des résultats pour revue scientifique
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
import os, json, urllib.request, tempfile

np.random.seed(42)
OUTPUT_DIR = '/home/user/bmn_validation'
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("=" * 70)
print("  SCORE BMN v3.5 — VALIDATION SCIENTIFIQUE SUR COHORTE NHANES")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════
# PARTIE 1 : RÉCUPÉRATION DES DONNÉES NHANES 2017-2018
# ═══════════════════════════════════════════════════════════════════════

print("\n[1/6] Récupération des données NHANES 2017-2018...")

def fetch_nhanes(table_name, suffix="J"):
    """Télécharge une table NHANES via l'URL directe CDC Data."""
    url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/{table_name}_{suffix}.XPT"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=60)
        data = resp.read()
        # Sauvegarder temporairement pour pd.read_sas
        tmp = tempfile.NamedTemporaryFile(suffix='.xpt', delete=False)
        tmp.write(data)
        tmp.close()
        df = pd.read_sas(tmp.name, format='xport')
        os.unlink(tmp.name)
        print(f"  ✓ {table_name}: {len(df):,} obs, {len(df.columns)} vars")
        return df
    except Exception as e:
        print(f"  ✗ {table_name}: {e}")
        return None

# --- Téléchargement de toutes les tables nécessaires ---
demo   = fetch_nhanes("DEMO")       # Démographie
bmx    = fetch_nhanes("BMX")        # Anthropométrie (BMI, tour de taille)
biopro = fetch_nhanes("BIOPRO")     # Biochimie (glucose, urate, AST, GGT, etc.)
ghb    = fetch_nhanes("GHB")        # HbA1c
trigly = fetch_nhanes("TRIGLY")     # Triglycérides
hdl_t  = fetch_nhanes("HDL")        # HDL cholesterol
tchol  = fetch_nhanes("TCHOL")      # Cholestérol total
ins    = fetch_nhanes("INS")        # Insuline
hscrp  = fetch_nhanes("HSCRP")      # CRP ultrasensible
dpq    = fetch_nhanes("DPQ")        # PHQ-9 (dépression)
slq    = fetch_nhanes("SLQ")        # Sommeil
paq    = fetch_nhanes("PAQ")        # Activité physique
smq    = fetch_nhanes("SMQ")        # Tabagisme
alq    = fetch_nhanes("ALQ")        # Alcool
diq    = fetch_nhanes("DIQ")        # Diabète
bpq    = fetch_nhanes("BPQ")        # Hypertension (questionnaire)
mcq    = fetch_nhanes("MCQ")        # Conditions médicales

# ═══════════════════════════════════════════════════════════════════════
# PARTIE 2 : FUSION ET HARMONISATION DES VARIABLES
# ═══════════════════════════════════════════════════════════════════════

print("\n[2/6] Fusion et harmonisation des données...")

# Base = démographie
df = demo[['SEQN', 'RIDAGEYR', 'RIAGENDR', 'RIDRETH3']].copy()
df.columns = ['SEQN', 'age', 'sex_code', 'race_eth']

# Filtrer adultes ≥ 18 ans
df = df[df['age'] >= 18].copy()
print(f"  Adultes ≥18 ans : {len(df):,}")

# Sexe : RIAGENDR 1=M, 2=F
df['sex'] = df['sex_code'].map({1: 'M', 2: 'F'})

# Ethnicité NHANES → code ethnique BMN (approximation)
# RIDRETH3: 1=MexAm, 2=OtherHisp, 3=NHWhite, 4=NHBlack, 6=NHAsian, 7=Other
ETH_MAP = {1: 'eu', 2: 'eu', 3: 'eu', 4: 'af', 6: 'ea', 7: 'eu'}
df['ethnicCode'] = df['race_eth'].map(ETH_MAP).fillna('eu')

def safe_merge(left, right, cols, on='SEQN'):
    if right is None:
        return left
    keep = [on] + [c for c in cols if c in right.columns]
    return left.merge(right[keep], on=on, how='left')

# Anthropométrie
if bmx is not None:
    df = safe_merge(df, bmx, ['BMXBMI', 'BMXWAIST', 'BMXHT'])
    df.rename(columns={'BMXBMI': 'bmi', 'BMXWAIST': 'waist', 'BMXHT': 'height_cm'}, inplace=True)
    # WHtR = waist (cm) / height (cm)
    df['whtr'] = df['waist'] / df['height_cm']

# Biochimie standard (BIOPRO contient glucose, AST, GGT, acide urique, etc.)
if biopro is not None:
    df = safe_merge(df, biopro, ['LBXSGL', 'LBXSASSI', 'LBXSGB', 'LBXSUA', 'LBXSAPSI'])
    df.rename(columns={
        'LBXSGL': 'glucose_mgdl',
        'LBXSASSI': 'asat_uL',
        'LBXSGB': 'ggt_uL',
        'LBXSUA': 'urate_mgdl',
    }, inplace=True)
    # Conversions
    df['glyc'] = df['glucose_mgdl'] / 18.0  # mg/dL → mmol/L
    df['asat'] = df['asat_uL']
    df['ggt']  = df['ggt_uL']
    df['urate'] = df['urate_mgdl'] * 59.48  # mg/dL → µmol/L

# HbA1c
if ghb is not None:
    df = safe_merge(df, ghb, ['LBXGH'])
    df.rename(columns={'LBXGH': 'hba1c'}, inplace=True)

# Triglycérides
if trigly is not None:
    df = safe_merge(df, trigly, ['LBXTR'])
    df.rename(columns={'LBXTR': 'tg_mgdl'}, inplace=True)
    df['tg'] = df['tg_mgdl'] / 88.57  # mg/dL → mmol/L

# HDL
if hdl_t is not None:
    df = safe_merge(df, hdl_t, ['LBDHDD'])
    df.rename(columns={'LBDHDD': 'hdl_mgdl'}, inplace=True)
    df['hdl'] = df['hdl_mgdl'] / 38.67  # mg/dL → mmol/L

# Cholestérol total → calcul LDL (Friedewald)
if tchol is not None:
    df = safe_merge(df, tchol, ['LBXTC'])
    df.rename(columns={'LBXTC': 'tc_mgdl'}, inplace=True)
    df['tc_mmol'] = df['tc_mgdl'] / 38.67
    # LDL = TC - HDL - TG/2.2 (Friedewald, en mmol/L)
    df['ldl'] = df['tc_mmol'] - df['hdl'] - df.get('tg', pd.Series(dtype=float)) / 2.2

# Insuline → HOMA-IR
if ins is not None:
    df = safe_merge(df, ins, ['LBXIN'])
    df.rename(columns={'LBXIN': 'insulin_uU'}, inplace=True)
    # HOMA-IR = (glucose mg/dL × insulin µU/mL) / 405
    df['homaIR'] = (df['glucose_mgdl'] * df['insulin_uU']) / 405.0

# CRP ultrasensible
if hscrp is not None:
    df = safe_merge(df, hscrp, ['LBXHSCRP'])
    df.rename(columns={'LBXHSCRP': 'crphs'}, inplace=True)

# TG/HDL ratio
df['tghdl'] = df.get('tg', pd.Series(dtype=float)) / df.get('hdl', pd.Series(dtype=float))

# PHQ-9 score
if dpq is not None:
    phq_cols = [f'DPQ0{i}0' for i in range(1, 10)]
    avail_phq = [c for c in phq_cols if c in dpq.columns]
    if avail_phq:
        dpq_sub = dpq[['SEQN'] + avail_phq].copy()
        # Remplacer les réponses invalides (7=refused, 9=dk) par NaN
        for c in avail_phq:
            dpq_sub[c] = dpq_sub[c].replace({7: np.nan, 9: np.nan})
        dpq_sub['phq9'] = dpq_sub[avail_phq].sum(axis=1, min_count=7)
        df = df.merge(dpq_sub[['SEQN', 'phq9']], on='SEQN', how='left')

# Sommeil
if slq is not None:
    df = safe_merge(df, slq, ['SLD012'])
    df.rename(columns={'SLD012': 'sleepHours'}, inplace=True)

# Activité physique (minutes/semaine vigorous + moderate)
if paq is not None:
    df = safe_merge(df, paq, ['PAQ610', 'PAD615', 'PAQ625', 'PAD630', 'PAQ655', 'PAD660', 'PAQ670', 'PAD675'])
    # Calcul simplifié : vigorous work + moderate work + vigorous rec + moderate rec
    for col in ['PAD615', 'PAD630', 'PAD660', 'PAD675']:
        if col in df.columns:
            df[col] = df[col].replace({9999: np.nan, 7777: np.nan})
    # vigorous work (days × min) + moderate work + vigorous rec + moderate rec
    vig_work = df.get('PAD615', 0)
    mod_work = df.get('PAD630', 0)
    vig_rec  = df.get('PAD660', 0)
    mod_rec  = df.get('PAD675', 0)
    df['physicalActivityMinWeek'] = (
        pd.to_numeric(vig_work, errors='coerce').fillna(0) +
        pd.to_numeric(mod_work, errors='coerce').fillna(0) +
        pd.to_numeric(vig_rec, errors='coerce').fillna(0) +
        pd.to_numeric(mod_rec, errors='coerce').fillna(0)
    )

# Tabagisme
if smq is not None:
    df = safe_merge(df, smq, ['SMQ020', 'SMQ040'])
    # SMQ020: 1=smoked 100+, 2=never | SMQ040: 1=everyday, 2=some days, 3=not at all
    def map_tobacco(row):
        if row.get('SMQ020') == 2 or pd.isna(row.get('SMQ020')):
            return 0  # never
        if row.get('SMQ040') == 3:
            return 1  # ex > 1 year (approx)
        if row.get('SMQ040') == 2:
            return 3  # some days ~ <10/day
        if row.get('SMQ040') == 1:
            return 4  # every day ~ ≥10/day
        return 0
    df['tobaccoStatus'] = df.apply(map_tobacco, axis=1)

# Alcool
if alq is not None:
    df = safe_merge(df, alq, ['ALQ121', 'ALQ130'])
    # ALQ130 = average drinks/day on drinking days
    # Approximation drinks/week
    drinks_day = pd.to_numeric(df.get('ALQ130', 0), errors='coerce').fillna(0)
    freq = pd.to_numeric(df.get('ALQ121', 0), errors='coerce').fillna(0)
    # freq mapping approximation (days per month)
    freq_map = {0: 0, 1: 30, 2: 20, 3: 12, 4: 6, 5: 4, 6: 2, 7: 1, 8: 0.5, 9: 0.1, 10: 0, 77: 0, 99: 0}
    days_per_month = freq.map(freq_map).fillna(0)
    df['drinksPerWeek'] = (drinks_day * days_per_month * 12 / 52).clip(0, 50)

# Diabète diagnostiqué
if diq is not None:
    df = safe_merge(df, diq, ['DIQ010'])
    df['has_diabetes'] = (df['DIQ010'] == 1).astype(int)

# Hypertension diagnostiquée
if bpq is not None:
    df = safe_merge(df, bpq, ['BPQ020'])
    df['has_hta'] = (df['BPQ020'] == 1).astype(int)

# Conditions médicales
if mcq is not None:
    df = safe_merge(df, mcq, ['MCQ160F'])  # thyroid problem
    df['has_hypo'] = (df.get('MCQ160F') == 1).astype(int)

# --- Variable cible : Syndrome métabolique (MetS) ---
# Critères IDF simplifiés disponibles dans NHANES :
# 1. Tour de taille élevé (>88F / >102M pour EU)
# 2. TG ≥ 1.7 mmol/L
# 3. HDL < 1.0M / < 1.3F mmol/L
# 4. Glycémie ≥ 5.6 mmol/L ou DT2
# 5. HTA diagnostiquée
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

# --- Variable cible secondaire : Obésité (BMI ≥ 30) ---
df['obesity_outcome'] = (df['bmi'] >= 30).astype(int)

# Nettoyage : garder les colonnes utiles
analysis_cols = [
    'SEQN', 'age', 'sex', 'ethnicCode', 'bmi', 'waist', 'whtr', 'height_cm',
    'homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl',
    'asat', 'ggt', 'urate',
    'phq9', 'sleepHours', 'physicalActivityMinWeek', 'tobaccoStatus',
    'drinksPerWeek', 'has_diabetes', 'has_hta', 'has_hypo',
    'mets_outcome', 'obesity_outcome'
]
analysis_cols = [c for c in analysis_cols if c in df.columns]
df = df[analysis_cols].copy()

print(f"  Dataset fusionné : {len(df):,} observations, {len(df.columns)} variables")
print(f"  Prévalence MetS : {df['mets_outcome'].mean()*100:.1f}%")
print(f"  Prévalence Obésité : {df['obesity_outcome'].mean()*100:.1f}%")
print(f"  Données manquantes par variable :")
miss = df.isnull().sum()
for c in miss[miss > 0].index:
    pct = miss[c] / len(df) * 100
    print(f"    {c}: {miss[c]:,} ({pct:.1f}%)")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 3 : IMPUTATION MONTE CARLO (MICE)
# ═══════════════════════════════════════════════════════════════════════

print("\n[3/6] Imputation Monte Carlo (MICE — Multiple Imputation by Chained Equations)...")

class MICEImputer:
    """
    Multiple Imputation by Chained Equations (MICE) — Monte Carlo
    Impute les valeurs manquantes par itérations de régressions conditionnelles
    avec injection de bruit aléatoire (variabilité de Monte Carlo).

    Référence : van Buuren & Groothuis-Oudshoorn, J Stat Software 2011
    """

    def __init__(self, n_imputations=20, n_iterations=10, random_state=42):
        self.n_imputations = n_imputations
        self.n_iterations = n_iterations
        self.rng = np.random.RandomState(random_state)

    def impute(self, df, numeric_cols):
        """Retourne une liste de n_imputations DataFrames complétés."""
        imputed_datasets = []

        for m in range(self.n_imputations):
            df_imp = df.copy()
            seed = self.rng.randint(0, 2**31)
            rng_m = np.random.RandomState(seed)

            # Initialisation : remplir les NaN par la médiane + bruit
            for col in numeric_cols:
                mask = df_imp[col].isnull()
                if mask.sum() == 0:
                    continue
                median_val = df_imp[col].median()
                std_val = df_imp[col].std()
                if pd.isna(median_val):
                    median_val = 0
                if pd.isna(std_val) or std_val == 0:
                    std_val = 1
                noise = rng_m.normal(0, std_val * 0.1, mask.sum())
                df_imp.loc[mask, col] = median_val + noise

            # Itérations MICE
            for iteration in range(self.n_iterations):
                for col in numeric_cols:
                    mask = df[col].isnull()  # masque original
                    if mask.sum() == 0:
                        continue

                    # Prédicteurs = toutes les autres colonnes numériques
                    predictors = [c for c in numeric_cols if c != col]

                    # Données d'entraînement (observées)
                    X_train = df_imp.loc[~mask, predictors].fillna(0).values
                    y_train = df_imp.loc[~mask, col].values

                    if len(X_train) < 10:
                        continue

                    # Régression bayésienne pour capturer l'incertitude
                    model = BayesianRidge()
                    model.fit(X_train, y_train)

                    # Prédiction pour les manquants
                    X_pred = df_imp.loc[mask, predictors].fillna(0).values
                    y_pred = model.predict(X_pred)

                    # Injection de bruit Monte Carlo (variabilité postérieure)
                    sigma = np.sqrt(1.0 / model.alpha_)  # écart-type résiduel
                    noise = rng_m.normal(0, sigma, len(y_pred))
                    y_imputed = y_pred + noise

                    df_imp.loc[mask, col] = y_imputed

            imputed_datasets.append(df_imp)
            if (m + 1) % 5 == 0:
                print(f"  Imputation {m+1}/{self.n_imputations} complétée")

        return imputed_datasets

# Colonnes numériques à imputer
impute_cols = [
    'bmi', 'waist', 'whtr', 'homaIR', 'hba1c', 'crphs', 'tghdl',
    'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate',
    'phq9', 'sleepHours', 'physicalActivityMinWeek', 'drinksPerWeek'
]
impute_cols = [c for c in impute_cols if c in df.columns]

mice = MICEImputer(n_imputations=20, n_iterations=10, random_state=42)
imputed_datasets = mice.impute(df, impute_cols)
print(f"  ✓ {len(imputed_datasets)} jeux de données imputés (Monte Carlo MICE)")

# Vérification : plus aucun NaN dans les colonnes imputées
for i, ds in enumerate(imputed_datasets[:3]):
    remaining = ds[impute_cols].isnull().sum().sum()
    print(f"    Dataset {i}: NaN résiduels = {remaining}")


# ═══════════════════════════════════════════════════════════════════════
# PARTIE 4 : ALGORITHME SCORE BMN v3.5 (PORTÉ EN PYTHON)
# ═══════════════════════════════════════════════════════════════════════

print("\n[4/6] Application du SCORE BMN v3.5 sur les données NHANES...")

# --- Données de référence identiques au module JS ---
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
    """Calcule le SCORE BMN v3.5 pour une ligne du DataFrame."""
    eth = row.get('ethnicCode', 'eu')
    ep = ETHNIC_PROFILES.get(eth, ETHNIC_PROFILES['eu'])
    age = row.get('age', 40)
    sex = row.get('sex', 'M')
    bmi_val = row.get('bmi', 25)
    waist_val = row.get('waist', 80)
    whtr_val = row.get('whtr', 0.5)

    # ── C1: Âge (0-10) ──
    if age >= 65: c1 = 10
    elif age >= 55: c1 = 7
    elif age >= 45: c1 = 5
    elif age >= 40: c1 = 2
    else: c1 = 0

    # ── C2: Sexe (0-2) ──
    c2 = 2 if (sex == 'M' and age < 60) else 0

    # ── C3: Anthropométrie (0-12) ──
    # IMC (0-7)
    thresh_s = ep['bmiSurpoids']
    thresh_o = ep['bmiObesite']
    if bmi_val >= thresh_o + 5: imc_pts = 7
    elif bmi_val >= thresh_o: imc_pts = 5
    elif bmi_val >= thresh_s: imc_pts = 3
    else: imc_pts = 0
    # WHtR (0-3)
    if whtr_val >= 0.60: whtr_pts = 3
    elif whtr_val >= 0.55: whtr_pts = 2
    elif whtr_val >= 0.50: whtr_pts = 1
    else: whtr_pts = 0
    # Tour de taille (0-2)
    tt_thresh = ep['waistF'] if sex == 'F' else ep['waistM']
    diff = waist_val - tt_thresh
    if diff > 10: tt_pts = 2
    elif diff > 0: tt_pts = 1
    else: tt_pts = 0
    c3 = min(12, imc_pts + whtr_pts + tt_pts)

    # ── C4: Comorbidités (0-10) — approximation NHANES ──
    bmn_k = 0
    if row.get('has_diabetes', 0) == 1: bmn_k += 14 * ep['dR'] * ep['cR']
    if row.get('has_hta', 0) == 1: bmn_k += 10 * ep['hR'] * ep['cR']
    if row.get('has_hypo', 0) == 1: bmn_k += 6 * ep['cR']
    # MetS détecté par critères
    if row.get('mets_outcome', 0) == 1: bmn_k += 12 * ep['cR']
    bmn_k = min(50, bmn_k)
    c4 = round((bmn_k / 50) * 10)

    # ── C5: Antécédents (pas disponible NHANES) → 0 ──
    c5 = 0

    # ── C6: Tabac (0-8) ──
    tob = int(row.get('tobaccoStatus', 0))
    c6 = [0, 1, 2, 4, 8][min(tob, 4)]

    # ── C7: Santé mentale (0-8) ── PHQ-9 disponible
    phq9 = row.get('phq9', 0)
    if phq9 >= 20: c7 = 4
    elif phq9 >= 15: c7 = 3
    elif phq9 >= 10: c7 = 2
    elif phq9 >= 5: c7 = 1
    else: c7 = 0

    # ── C8: Sommeil (0-4) ──
    sleep_h = row.get('sleepHours', 7)
    if sleep_h < 5: c8 = 3
    elif sleep_h < 6: c8 = 2
    elif sleep_h < 7: c8 = 1
    else: c8 = 0

    c_raw = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8
    C = min(50, round(c_raw * (1 + ep['ev'] / 100)))

    # ── E: Exposome (simplifié — NHANES n'a pas données environnement) ──
    E = 0  # Pas de données AQI/UV/température dans NHANES

    # ── O: Occupationnel (simplifié) ──
    O = 0  # Pas de données Karasek dans NHANES

    # ── L: Lifestyle (0-10) ──
    # l1: Activité physique
    pa = row.get('physicalActivityMinWeek', 150)
    if pa >= 150: l1 = 0
    elif pa >= 75: l1 = 1
    elif pa >= 30: l1 = 2
    else: l1 = 3
    # l2: Nutrition (pas PREDIMED dans NHANES) → score 0
    l2 = 0
    # l3: Alcool
    dpw = row.get('drinksPerWeek', 0)
    if dpw > 21: l3 = 2
    elif dpw > 14: l3 = 1
    else: l3 = 0
    # l4: Sommeil
    if sleep_h < 6: l4 = 2
    elif sleep_h < 7: l4 = 1
    else: l4 = 0
    L = min(10, l1 + l2 + l3 + l4)

    # ── sD (score déclaratif) ──
    sD = min(100, C + E + O + L)

    # ── BioNorm ──
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

    # ── Score Final sf ──
    wDecl = 0.65
    wBio = 0.35
    gap = bioNorm - sD
    if gap > 20:
        extraW = min(0.30, ((gap - 20) / 100) * 0.60)
        wBio = 0.35 + extraW
        wDecl = 1 - wBio

    sf = round(wDecl * sD + wBio * bioNorm)

    # Safety floors
    bioFloor = round(0.75 * bioNorm)
    if sf < bioFloor:
        sf = bioFloor
    if bioNorm > 90:
        bef = max(80, round(0.85 * bioNorm))
        if sf < bef: sf = bef
    elif bioNorm > 80:
        bef = round(0.85 * bioNorm)
        if sf < bef: sf = bef

    # HbA1c emergency
    hba1c_val = row.get('hba1c', 5.0)
    if hba1c_val >= 8.0 and sf < 70: sf = 70
    elif hba1c_val >= 6.5 and sf < 60: sf = 60

    sf = min(100, sf)

    # Classification
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


# Appliquer le score BMN sur chaque jeu imputé
all_sf_scores = []
for i, ds in enumerate(imputed_datasets):
    scores = ds.apply(compute_bmn_row, axis=1)
    ds_scored = pd.concat([ds, scores], axis=1)
    imputed_datasets[i] = ds_scored
    all_sf_scores.append(ds_scored['sf'].values)
    if (i + 1) % 5 == 0:
        print(f"  Score BMN appliqué sur dataset {i+1}/{len(imputed_datasets)}")

# Combiner les scores par la règle de Rubin (moyenne des M imputations)
sf_matrix = np.array(all_sf_scores)  # (M, N)
sf_mean = sf_matrix.mean(axis=0)
sf_variance_within = sf_matrix.var(axis=0)
sf_variance_between = sf_matrix.mean(axis=0)  # simplification
sf_total_var = sf_variance_within.mean() + (1 + 1/len(imputed_datasets)) * sf_matrix.var(axis=0).mean()

# Ajouter le score moyen au dataset principal
df['sf'] = sf_mean
df['sf_se'] = np.sqrt(sf_total_var)

# Utiliser le premier dataset imputé comme référence pour les détails
ref_ds = imputed_datasets[0]
for col in ['sD', 'bioNorm', 'C', 'L', 'bmn_k', 'label']:
    df[col] = ref_ds[col]

print(f"  ✓ Scores BMN calculés sur {len(imputed_datasets)} imputations")
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

# On va valider contre 2 outcomes : MetS et Obésité
outcomes = {
    'MetS': 'mets_outcome',
    'Obesity': 'obesity_outcome',
}

results = {}

for outcome_name, outcome_col in outcomes.items():
    print(f"\n  ── Validation pour {outcome_name} ──")

    # Préparer les données
    valid_mask = df[outcome_col].notna() & df['sf'].notna()
    y = df.loc[valid_mask, outcome_col].values.astype(int)
    sf_scores = df.loc[valid_mask, 'sf'].values
    sf_prob = sf_scores / 100.0  # Normaliser en probabilité [0,1]

    if len(y) < 100 or y.sum() < 10:
        print(f"    ⚠ Données insuffisantes pour {outcome_name}")
        continue

    print(f"    N={len(y):,}, Events={y.sum():,} ({y.mean()*100:.1f}%)")

    # ─── 5a. AUC-ROC avec IC95% Bootstrap ───
    print("    [AUC-ROC + Bootstrap IC95%]")

    auc_main = roc_auc_score(y, sf_prob)

    n_boot = 2000
    auc_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx])) < 2:
            continue
        auc_boot.append(roc_auc_score(y[idx], sf_prob[idx]))
    auc_boot = np.array(auc_boot)
    auc_ci_low = np.percentile(auc_boot, 2.5)
    auc_ci_high = np.percentile(auc_boot, 97.5)

    print(f"    AUC = {auc_main:.4f} [IC95%: {auc_ci_low:.4f} - {auc_ci_high:.4f}]")

    # ROC curve
    fpr, tpr, thresholds = roc_curve(y, sf_prob)

    # ─── 5b. Modèles comparatifs ───
    print("    [Modèles comparatifs — cross-validation 5-fold]")

    # Préparer les features pour les modèles ML
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

    model_aucs['SCORE BMN v3.5'] = auc_main
    model_probs['SCORE BMN v3.5'] = sf_prob

    # ─── 5c. NRI (Net Reclassification Improvement) ───
    print("    [NRI — Net Reclassification Improvement]")

    # NRI compare BMN vs Logistic Regression (modèle de référence)
    ref_probs = model_probs['Logistic Regression']

    # Seuils de catégories : <30% → Low, 30-60% → Moderate, ≥60% → High
    def classify_risk(p):
        if p >= 0.60: return 2
        if p >= 0.30: return 1
        return 0

    cat_bmn = np.array([classify_risk(p) for p in sf_prob])
    cat_ref = np.array([classify_risk(p) for p in ref_probs])

    # NRI pour les events (y=1)
    events = y == 1
    non_events = y == 0

    # Event NRI : proportion reclassée vers le haut - proportion reclassée vers le bas
    up_events = ((cat_bmn > cat_ref) & events).sum()
    down_events = ((cat_bmn < cat_ref) & events).sum()
    nri_events = (up_events - down_events) / events.sum()

    # Non-event NRI
    up_nonevents = ((cat_bmn > cat_ref) & non_events).sum()
    down_nonevents = ((cat_bmn < cat_ref) & non_events).sum()
    nri_nonevents = (down_nonevents - up_nonevents) / non_events.sum()

    nri_total = nri_events + nri_nonevents

    # IC95% bootstrap pour NRI
    nri_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb = y[idx]
        cat_bmn_b = cat_bmn[idx]
        cat_ref_b = cat_ref[idx]
        ev = yb == 1
        nev = yb == 0
        if ev.sum() == 0 or nev.sum() == 0:
            continue
        nri_e = ((cat_bmn_b > cat_ref_b) & ev).sum() / ev.sum() - ((cat_bmn_b < cat_ref_b) & ev).sum() / ev.sum()
        nri_ne = ((cat_bmn_b < cat_ref_b) & nev).sum() / nev.sum() - ((cat_bmn_b > cat_ref_b) & nev).sum() / nev.sum()
        nri_boot.append(nri_e + nri_ne)
    nri_boot = np.array(nri_boot)
    nri_ci = (np.percentile(nri_boot, 2.5), np.percentile(nri_boot, 97.5))

    # p-value pour NRI (test Z)
    nri_se = nri_boot.std()
    nri_z = nri_total / nri_se if nri_se > 0 else 0
    nri_p = 2 * (1 - stats.norm.cdf(abs(nri_z)))

    print(f"    NRI total = {nri_total:.4f} [IC95%: {nri_ci[0]:.4f} - {nri_ci[1]:.4f}], p={nri_p:.4f}")
    print(f"    NRI events = {nri_events:.4f}, NRI non-events = {nri_nonevents:.4f}")

    # ─── 5d. IDI (Integrated Discrimination Improvement) ───
    print("    [IDI — Integrated Discrimination Improvement]")

    # IDI = (mean(p_new|event) - mean(p_new|nonevent)) - (mean(p_old|event) - mean(p_old|nonevent))
    disc_bmn = sf_prob[events].mean() - sf_prob[non_events].mean()
    disc_ref = ref_probs[events].mean() - ref_probs[non_events].mean()
    idi = disc_bmn - disc_ref

    # Bootstrap IDI
    idi_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        yb = y[idx]
        ev = yb == 1
        nev = yb == 0
        if ev.sum() == 0 or nev.sum() == 0:
            continue
        d_bmn = sf_prob[idx][ev].mean() - sf_prob[idx][nev].mean()
        d_ref = ref_probs[idx][ev].mean() - ref_probs[idx][nev].mean()
        idi_boot.append(d_bmn - d_ref)
    idi_boot = np.array(idi_boot)
    idi_ci = (np.percentile(idi_boot, 2.5), np.percentile(idi_boot, 97.5))
    idi_p = 2 * (1 - stats.norm.cdf(abs(idi / idi_boot.std()))) if idi_boot.std() > 0 else 1

    print(f"    IDI = {idi:.4f} [IC95%: {idi_ci[0]:.4f} - {idi_ci[1]:.4f}], p={idi_p:.4f}")

    # ─── 5e. Brier Score ───
    brier_bmn = brier_score_loss(y, sf_prob)
    brier_ref = brier_score_loss(y, ref_probs)
    print(f"    Brier Score BMN = {brier_bmn:.4f} vs Logistic = {brier_ref:.4f}")

    # ─── 5f. Hosmer-Lemeshow Goodness-of-fit ───
    print("    [Hosmer-Lemeshow Calibration Test]")

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
    print(f"    Hosmer-Lemeshow χ² = {hl_chi2:.2f}, df={hl_df}, p={hl_p:.4f}")
    print(f"    {'✓ Bonne calibration' if hl_p > 0.05 else '⚠ Calibration à améliorer'}")

    # ─── 5g. DeLong Test (AUC comparison BMN vs LR) ───
    print("    [DeLong Test — Comparaison AUC]")

    # Simplified DeLong test using bootstrap
    diff_auc_boot = []
    for b in range(n_boot):
        idx = np.random.choice(len(y), len(y), replace=True)
        if len(np.unique(y[idx])) < 2:
            continue
        auc_bmn_b = roc_auc_score(y[idx], sf_prob[idx])
        auc_ref_b = roc_auc_score(y[idx], ref_probs[idx])
        diff_auc_boot.append(auc_bmn_b - auc_ref_b)
    diff_auc_boot = np.array(diff_auc_boot)
    delong_diff = auc_main - model_aucs['Logistic Regression']
    delong_se = diff_auc_boot.std()
    delong_z = delong_diff / delong_se if delong_se > 0 else 0
    delong_p = 2 * (1 - stats.norm.cdf(abs(delong_z)))
    print(f"    ΔAUC = {delong_diff:.4f}, z={delong_z:.2f}, p={delong_p:.4f}")

    # ─── 5h. Monte Carlo Sensitivity Analysis ───
    print("    [Monte Carlo Sensitivity — 20 imputations]")

    mc_aucs = []
    for i, ds in enumerate(imputed_datasets):
        sf_i = ds.loc[valid_mask, 'sf'].values / 100.0
        if len(np.unique(y)) >= 2:
            mc_aucs.append(roc_auc_score(y, sf_i))
    mc_aucs = np.array(mc_aucs)
    print(f"    AUC across imputations: {mc_aucs.mean():.4f} ± {mc_aucs.std():.4f}")
    print(f"    Range: [{mc_aucs.min():.4f} - {mc_aucs.max():.4f}]")
    print(f"    Coefficient de variation: {mc_aucs.std()/mc_aucs.mean()*100:.2f}%")

    # Stocker les résultats
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
# PARTIE 6 : GÉNÉRATION DES FIGURES ET TABLEAUX
# ═══════════════════════════════════════════════════════════════════════

print("\n[6/6] Génération des figures et tableaux pour revue scientifique...")

# Style publication
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
    y_out = df[outcomes[outcome_name]].dropna().values.astype(int)
    valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
    y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)
    sf_out = df.loc[valid_mask_out, 'sf'].values / 100.0

    # ── FIGURE 1 : ROC Curves comparatives ──
    fig, ax = plt.subplots(1, 1, figsize=(8, 7))

    # BMN ROC
    ax.plot(res['fpr'], res['tpr'], 'b-', linewidth=2.5,
            label=f"SCORE BMN v3.5 (AUC={res['AUC_BMN']:.3f})")

    # Modèles comparatifs
    colors = {'Logistic Regression': '#e74c3c', 'Random Forest': '#2ecc71', 'Gradient Boosting': '#f39c12'}
    for model_name, auc_val in res['AUC_models'].items():
        if model_name == 'SCORE BMN v3.5':
            continue
        probs = np.array(res['model_probs'][model_name])
        fpr_m, tpr_m, _ = roc_curve(y_out, probs)
        ax.plot(fpr_m, tpr_m, '--', color=colors.get(model_name, 'gray'), linewidth=1.5,
                label=f"{model_name} (AUC={auc_val:.3f})")

    ax.plot([0, 1], [0, 1], 'k--', alpha=0.3, linewidth=1)
    ax.set_xlabel('1 - Specificity (False Positive Rate)')
    ax.set_ylabel('Sensitivity (True Positive Rate)')
    ax.set_title(f'ROC Curves — {outcome_name} Prediction\nNHANES 2017-2018 (N={res["N"]:,})')
    ax.legend(loc='lower right', fontsize=9)
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    fig.savefig(f'{OUTPUT_DIR}/fig1_roc_{tag}.png')
    plt.close(fig)
    print(f"  ✓ Figure 1 (ROC) sauvegardée : fig1_roc_{tag}.png")

    # ── FIGURE 2 : Calibration Plot ──
    fig, ax = plt.subplots(1, 1, figsize=(7, 7))

    frac_pos, mean_pred = calibration_curve(y_out, sf_out, n_bins=10, strategy='quantile')
    ax.plot(mean_pred, frac_pos, 'bo-', linewidth=2, markersize=8, label='SCORE BMN v3.5')
    ax.plot([0, 1], [0, 1], 'k--', alpha=0.4, label='Perfect calibration')

    # Ajouter la courbe de calibration LR
    probs_lr = np.array(res['model_probs']['Logistic Regression'])
    frac_lr, mean_lr = calibration_curve(y_out, probs_lr, n_bins=10, strategy='quantile')
    ax.plot(mean_lr, frac_lr, 'r^--', linewidth=1.5, markersize=6, label='Logistic Regression')

    ax.set_xlabel('Predicted Probability')
    ax.set_ylabel('Observed Frequency')
    ax.set_title(f'Calibration Plot — {outcome_name}\nHostmer-Lemeshow p={res["HL_p"]:.3f}')
    ax.legend(loc='upper left')
    fig.savefig(f'{OUTPUT_DIR}/fig2_calibration_{tag}.png')
    plt.close(fig)
    print(f"  ✓ Figure 2 (Calibration) sauvegardée : fig2_calibration_{tag}.png")

    # ── FIGURE 3 : Distribution des scores par outcome ──
    fig, ax = plt.subplots(1, 1, figsize=(9, 5))
    sf_all = df.loc[valid_mask_out, 'sf'].values

    ax.hist(sf_all[y_out == 0], bins=40, alpha=0.6, color='#3498db', density=True,
            label=f'No {outcome_name} (n={int((y_out==0).sum()):,})')
    ax.hist(sf_all[y_out == 1], bins=40, alpha=0.6, color='#e74c3c', density=True,
            label=f'{outcome_name} (n={int((y_out==1).sum()):,})')

    ax.axvline(30, color='orange', linestyle='--', alpha=0.7, label='Threshold: 30 (Moderate)')
    ax.axvline(60, color='red', linestyle='--', alpha=0.7, label='Threshold: 60 (High)')
    ax.set_xlabel('SCORE BMN v3.5 (sf)')
    ax.set_ylabel('Density')
    ax.set_title(f'Score Distribution by {outcome_name} Status')
    ax.legend(fontsize=9)
    fig.savefig(f'{OUTPUT_DIR}/fig3_distribution_{tag}.png')
    plt.close(fig)
    print(f"  ✓ Figure 3 (Distribution) sauvegardée : fig3_distribution_{tag}.png")

# ── FIGURE 4 : Monte Carlo Sensitivity ──
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
               label=f'Mean AUC = {np.mean(mc_aucs):.4f}')
    ax.fill_between(range(0, len(mc_aucs)+2),
                    np.mean(mc_aucs) - 2*np.std(mc_aucs),
                    np.mean(mc_aucs) + 2*np.std(mc_aucs),
                    color='red', alpha=0.1, label=f'±2 SD')
    ax.set_xlabel('Imputation #')
    ax.set_ylabel('AUC')
    ax.set_title(f'Monte Carlo Sensitivity — {outcome_name}')
    ax.legend()
    ax.set_ylim([min(mc_aucs) - 0.02, max(mc_aucs) + 0.02])

fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig4_monte_carlo_sensitivity.png')
plt.close(fig)
print(f"  ✓ Figure 4 (Monte Carlo) sauvegardée")

# ── FIGURE 5 : Forest Plot comparatif des AUC ──
fig, ax = plt.subplots(1, 1, figsize=(10, 6))
all_models = []
all_aucs = []
all_ci_low = []
all_ci_high = []

for outcome_name, res in results.items():
    for model_name, auc_val in res['AUC_models'].items():
        label = f"{model_name}\n({outcome_name})"
        all_models.append(label)
        all_aucs.append(auc_val)
        # Bootstrap CI for each model
        valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
        y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)
        probs = np.array(res['model_probs'][model_name])
        boot_aucs = []
        for b in range(500):
            idx_b = np.random.choice(len(y_out), len(y_out), replace=True)
            if len(np.unique(y_out[idx_b])) < 2:
                continue
            boot_aucs.append(roc_auc_score(y_out[idx_b], probs[idx_b]))
        all_ci_low.append(np.percentile(boot_aucs, 2.5))
        all_ci_high.append(np.percentile(boot_aucs, 97.5))

y_pos = range(len(all_models))
xerr = [np.array(all_aucs) - np.array(all_ci_low),
        np.array(all_ci_high) - np.array(all_aucs)]

colors_fp = ['#2980b9' if 'BMN' in m else '#95a5a6' for m in all_models]
ax.barh(y_pos, all_aucs, xerr=xerr, color=colors_fp, alpha=0.8, height=0.6, capsize=3)
ax.set_yticks(y_pos)
ax.set_yticklabels(all_models, fontsize=9)
ax.set_xlabel('AUC-ROC')
ax.set_title('Forest Plot — AUC Comparison Across Models and Outcomes')
ax.axvline(0.5, color='red', linestyle='--', alpha=0.3)
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig5_forest_plot.png')
plt.close(fig)
print(f"  ✓ Figure 5 (Forest Plot) sauvegardée")

# ── FIGURE 6 : Heatmap biomarqueurs vs score ──
fig, ax = plt.subplots(1, 1, figsize=(12, 5))
bio_cols_avail = [c for c in ['homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate'] if c in df.columns]
# Quartiles de score
df['sf_quartile'] = pd.qcut(df['sf'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])
bio_by_q = df.groupby('sf_quartile')[bio_cols_avail].mean()
# Normaliser pour la heatmap
bio_norm = (bio_by_q - bio_by_q.min()) / (bio_by_q.max() - bio_by_q.min() + 1e-9)
sns.heatmap(bio_norm.T, annot=bio_by_q.T.round(2).values, fmt='', cmap='YlOrRd',
            ax=ax, linewidths=0.5, cbar_kws={'label': 'Normalized level'})
ax.set_title('Biomarker Levels by SCORE BMN Quartile')
ax.set_xlabel('Score BMN Quartile')
fig.tight_layout()
fig.savefig(f'{OUTPUT_DIR}/fig6_biomarker_heatmap.png')
plt.close(fig)
print(f"  ✓ Figure 6 (Heatmap biomarqueurs) sauvegardée")


# ═══════════════════════════════════════════════════════════════════════
# RÉSULTATS FINAUX — TABLEAUX POUR REVUE SCIENTIFIQUE
# ═══════════════════════════════════════════════════════════════════════

print("\n" + "=" * 70)
print("  RÉSULTATS FINAUX — TABLEAUX PUBLICATION")
print("=" * 70)

# TABLE 1 : Caractéristiques de la cohorte
print("\n═══ TABLE 1: Baseline Characteristics (NHANES 2017-2018) ═══")
print(f"{'Variable':<30} {'Mean ± SD / N (%)':<30}")
print("-" * 60)
print(f"{'N':<30} {len(df):,}")
print(f"{'Age (years)':<30} {df['age'].mean():.1f} ± {df['age'].std():.1f}")
print(f"{'Male sex':<30} {(df['sex']=='M').sum():,} ({(df['sex']=='M').mean()*100:.1f}%)")
print(f"{'BMI (kg/m²)':<30} {df['bmi'].mean():.1f} ± {df['bmi'].std():.1f}")
if 'waist' in df.columns:
    print(f"{'Waist circumference (cm)':<30} {df['waist'].mean():.1f} ± {df['waist'].std():.1f}")
if 'homaIR' in df.columns:
    print(f"{'HOMA-IR':<30} {df['homaIR'].mean():.2f} ± {df['homaIR'].std():.2f}")
if 'hba1c' in df.columns:
    print(f"{'HbA1c (%)':<30} {df['hba1c'].mean():.2f} ± {df['hba1c'].std():.2f}")
if 'crphs' in df.columns:
    print(f"{'hs-CRP (mg/L)':<30} {df['crphs'].mean():.2f} ± {df['crphs'].std():.2f}")
print(f"{'Metabolic Syndrome':<30} {df['mets_outcome'].sum():,} ({df['mets_outcome'].mean()*100:.1f}%)")
print(f"{'Obesity (BMI ≥ 30)':<30} {df['obesity_outcome'].sum():,} ({df['obesity_outcome'].mean()*100:.1f}%)")
print(f"{'SCORE BMN sf':<30} {df['sf'].mean():.1f} ± {df['sf'].std():.1f}")

# TABLE 2 : Performance discriminative
print("\n═══ TABLE 2: Discriminative Performance ═══")
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
    ('IDI p-value', lambda r: f"{r['IDI_p']:.4f}"),
    ('Brier Score BMN', lambda r: f"{r['Brier_BMN']:.4f}"),
    ('Brier Score LR', lambda r: f"{r['Brier_LR']:.4f}"),
    ('HL χ² (p-value)', lambda r: f"{r['HL_chi2']:.2f} (p={r['HL_p']:.3f})"),
    ('MC AUC mean ± SD', lambda r: f"{r['MC_AUC_mean']:.4f} ± {r['MC_AUC_std']:.4f}"),
]

for label, fmt_func in metrics:
    print(f"{label:<35} ", end="")
    for outcome_name, res in results.items():
        try:
            print(f"{'  ' + fmt_func(res):<25}", end="")
        except:
            print(f"{'  N/A':<25}", end="")
    print()

# TABLE 3 : Score BMN par catégorie vs outcome
print("\n═══ TABLE 3: Metabolic Syndrome Prevalence by BMN Risk Category ═══")
if 'mets_outcome' in df.columns:
    cats = [('FAIBLE', 0, 30), ('MODÉRÉ', 30, 60), ('ÉLEVÉ', 60, 80), ('TRÈS ÉLEVÉ', 80, 101)]
    print(f"{'Category':<15} {'N':>8} {'MetS N':>8} {'MetS %':>8} {'OR':>10} {'p-value':>10}")
    print("-" * 65)

    # Référence : FAIBLE
    ref_cat = df[(df['sf'] < 30)]
    ref_rate = ref_cat['mets_outcome'].mean() if len(ref_cat) > 0 else 0

    for cat_name, lo, hi in cats:
        sub = df[(df['sf'] >= lo) & (df['sf'] < hi)]
        if len(sub) == 0:
            continue
        n = len(sub)
        n_mets = int(sub['mets_outcome'].sum())
        rate = sub['mets_outcome'].mean()

        # OR vs reference
        if cat_name == 'FAIBLE' or ref_rate == 0:
            or_val = 'Ref'
            p_val = '-'
        else:
            a = n_mets
            b = n - n_mets
            c = int(ref_cat['mets_outcome'].sum())
            d = len(ref_cat) - c
            if b > 0 and c > 0 and d > 0:
                odds_ratio = (a * d) / (b * c) if b * c > 0 else float('inf')
                # Fisher exact test approximation
                table = np.array([[a, b], [c, d]])
                _, p = stats.fisher_exact(table)
                or_val = f"{odds_ratio:.2f}"
                p_val = f"{p:.4f}"
            else:
                or_val = 'N/A'
                p_val = 'N/A'

        print(f"{cat_name:<15} {n:>8,} {n_mets:>8,} {rate*100:>7.1f}% {or_val:>10} {p_val:>10}")

# Sauvegarder les résultats en JSON
with open(f'{OUTPUT_DIR}/results.json', 'w') as f:
    # Filtrer les clés non sérialisables
    save_results = {}
    for k, v in results.items():
        save_results[k] = {kk: vv for kk, vv in v.items()
                          if kk not in ['fpr', 'tpr', 'model_probs']}
    json.dump(save_results, f, indent=2)

print(f"\n  ✓ Résultats sauvegardés dans {OUTPUT_DIR}/results.json")
print(f"  ✓ Figures sauvegardées dans {OUTPUT_DIR}/")

# Liste des fichiers générés
print("\n  Fichiers générés :")
for f_name in sorted(os.listdir(OUTPUT_DIR)):
    fsize = os.path.getsize(f'{OUTPUT_DIR}/{f_name}')
    print(f"    {f_name} ({fsize:,} bytes)")

print("\n" + "=" * 70)
print("  ANALYSE TERMINÉE")
print("=" * 70)
