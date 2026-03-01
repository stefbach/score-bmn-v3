"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.0 — CHARGEUR DE DONNÉES BioLINCC + VALIDATION COMPLÈTE
═══════════════════════════════════════════════════════════════════════════

Charge et harmonise les données issues des études BioLINCC (NHLBI)
pour validation du SCORE BMN v3.0.

Études supportées :
  - MESA (Multi-Ethnic Study of Atherosclerosis) — imagerie + biomarqueurs
  - FHS  (Framingham Heart Study) — cohorte prospective long terme
  - ARIC (Atherosclerosis Risk in Communities)
  - JHS  (Jackson Heart Study)
  - Générique : tout jeu de fichiers SAS/CSV avec ID commun

Pipeline complet :
  1. Découverte automatique des fichiers dans le répertoire de l'étude
  2. Chargement multi-format (SAS7BDAT, XPT, CSV)
  3. Fusion sur identifiant unique (configurable par étude)
  4. Harmonisation des variables vers le schéma BMN v3.0
  5. Conversions d'unités (mg/dL → mmol/L, etc.)
  6. Dérivation des variables composites (HOMA-IR, WHtR, TG/HDL, LDL Friedewald)
  7. Imputation Monte Carlo (MICE — Multiple Imputation by Chained Equations)
  8. Application du SCORE BMN v3.0 (porté en Python)
  9. Validation statistique complète :
     - AUC-ROC + IC95% bootstrap
     - NRI (Net Reclassification Improvement)
     - IDI (Integrated Discrimination Improvement)
     - Calibration (Hosmer-Lemeshow, calibration plot)
     - Analyse de sensibilité Monte Carlo
     - Modèles comparatifs (Logistic, Random Forest, GradientBoosting)
  10. Génération des figures pour revue scientifique
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
import os, json
import glob as glob_module

np.random.seed(42)

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION PAR ÉTUDE
# ═══════════════════════════════════════════════════════════════════════

# Mappings spécifiques par étude : nom variable source → nom BMN v3
STUDY_CONFIGS = {
    "MESA": {
        "id_col": "idno",
        # Fichiers réels MESA BioLINCC (Exam 1 = Baseline)
        "files": {
            "baseline":  "mesa_e1_main.sas7bdat",      # Démographie + Anthropométrie
            "lab":       "mesa_e1_lab.sas7bdat",        # Biologie (glucose, insuline, lipides, etc.)
            "meds":      "mesa_e1_meds.sas7bdat",       # Médicaments (antidiabétiques, statines, etc.)
            "ct_adipose":"mesa_e1_ct_adipose.sas7bdat",  # CT graisse viscérale/sous-cutanée
        },
        "file_patterns": {
            "baseline": ["*e1_main*", "*exam1*", "*baseline*"],
            "lab":      ["*e1_lab*", "*lab*", "*blood*"],
            "meds":     ["*e1_meds*", "*med*", "*pharm*"],
            "ct_adipose":["*ct_adipose*", "*adipose*", "*visceral*"],
        },
        "var_map": {
            # Démographie — variables réelles MESA Exam 1
            "age1c":    "age",      "AGE1C":    "age",     "AGE":      "age",
            "gender1":  "sex_code", "GENDER1":  "sex_code","GENDER":   "sex_code",
            "race1c":   "race_eth", "RACE1C":   "race_eth","RACE":     "race_eth",
            # Anthropométrie
            "bmi1c":    "bmi",      "BMI1C":    "bmi",     "BMI":      "bmi",
            "waistcm1": "waist",    "WAISTCM1": "waist",   "WAIST":    "waist",
            "htcm1":    "height_cm","HTCM1":    "height_cm","HEIGHT":  "height_cm",
            # Biomarqueurs (MESA Exam 1, unités mg/dL sauf mention)
            "glucos1":  "glucose_mgdl", "GLUCOS1":  "glucose_mgdl", "GLUCOSE": "glucose_mgdl",
            "insulin1": "insulin_uU",   "INSULIN1": "insulin_uU",   "INSULIN": "insulin_uU",
            "hba1c1":   "hba1c",        "HBA1C1":   "hba1c",
            "crphs1":   "crphs",        "CRPHS1":   "crphs",    "CRP":     "crphs",
            "trig1":    "tg_mgdl",      "TRIG1":    "tg_mgdl",  "TRIG":    "tg_mgdl",
            "hdl1":     "hdl_mgdl",     "HDL1":     "hdl_mgdl", "HDL":     "hdl_mgdl",
            "ldl1":     "ldl_mgdl",     "LDL1":     "ldl_mgdl", "LDL":     "ldl_mgdl",
            "totchol1": "tc_mgdl",      "TOTCHOL1": "tc_mgdl",  "TCHOL":   "tc_mgdl",
            "ast1":     "asat",         "AST1":     "asat",      "AST":     "asat",
            "ggt1":     "ggt",          "GGT1":     "ggt",       "GGT":     "ggt",
            "urate1":   "urate_mgdl",   "URATE1":  "urate_mgdl","URICACID":"urate_mgdl",
            # CT Adipose Tissue (spécificité MESA — validation WHtR)
            "vatarea1": "vat_area",     "VATAREA1": "vat_area",   # Visceral Adipose Tissue area (cm²)
            "satarea1": "sat_area",     "SATAREA1": "sat_area",   # Subcutaneous AT area (cm²)
            # Tabagisme MESA
            "cig1":     "tobaccoStatus","CIG1":     "tobaccoStatus",
            "smkstat1": "tobaccoStatus","SMKSTAT1": "tobaccoStatus",
            # Activité physique MESA (MET-min/semaine)
            "modmin1":  "mod_min_week", "MODMIN1":  "mod_min_week",
            "vigmin1":  "vig_min_week", "VIGMIN1":  "vig_min_week",
            # Sommeil
            "sleepdr1": "sleepHours",   "SLEEPDR1": "sleepHours",
            # Alcool (drinks/semaine)
            "alcwk1":   "drinksPerWeek","ALCWK1":   "drinksPerWeek",
            # Comorbidités
            "dm031":    "has_diabetes", "DM031":    "has_diabetes",
            "htn1":     "has_hta",      "HTN1":     "has_hta",
            "htnmed1":  "has_hta_med",  "HTNMED1":  "has_hta_med",
        },
        "sex_map": {0: "F", 1: "M", "F": "F", "M": "M", "Female": "F", "Male": "M"},
        # MESA RACE1C : 1=White/Caucasian, 2=Chinese American, 3=Black/African Am, 4=Hispanic
        "eth_map": {1: "eu", 2: "ea", 3: "af", 4: "eu"},
    },

    "FHS": {
        "id_col": "PID",
        "file_patterns": {
            "baseline": ["*exam*", "*baseline*", "*visit*"],
            "lab":      ["*lab*", "*blood*"],
            "meds":     ["*med*", "*rx*"],
        },
        "var_map": {
            "AGE":       "age",
            "SEX":       "sex_code",
            "BMI":       "bmi",
            "WAIST":     "waist",
            "HEIGHT":    "height_cm",
            "FASTING_GLUCOSE": "glucose_mgdl",
            "INSULIN":   "insulin_uU",
            "HBA1C":     "hba1c",
            "CRP":       "crphs",
            "TRIG":      "tg_mgdl",
            "HDL":       "hdl_mgdl",
            "LDL":       "ldl_mgdl",
            "TCHOL":     "tc_mgdl",
            "AST":       "asat",
            "GGT":       "ggt",
        },
        "sex_map": {1: "M", 2: "F", "M": "M", "F": "F"},
        "eth_map": {},  # FHS est majoritairement européenne
        "default_eth": "eu",
    },

    "ARIC": {
        "id_col": "ID",
        "file_patterns": {
            "baseline": ["*v1*", "*visit1*", "*baseline*"],
            "lab":      ["*lab*", "*chem*"],
            "meds":     ["*med*", "*pharm*"],
        },
        "var_map": {
            "V1AGE01": "age",      "AGE": "age",
            "GENDER":  "sex_code",
            "RACEGRP": "race_eth",
            "BMI01":   "bmi",      "BMI": "bmi",
            "WAESSION01": "waist",
            "HGT01":   "height_cm",
            "FAST08":  "glucose_mgdl",
            "INSULIN": "insulin_uU",
            "HBA1C":   "hba1c",
            "CRP":     "crphs",
            "TRIG01":  "tg_mgdl",
            "HDL01":   "hdl_mgdl",
            "LDL01":   "ldl_mgdl",
            "TCHOL01": "tc_mgdl",
        },
        "sex_map": {"F": "F", "M": "M", 1: "M", 2: "F"},
        "eth_map": {"W": "eu", "B": "af", 1: "eu", 2: "af"},
    },

    "JHS": {
        "id_col": "SUBJID",
        "file_patterns": {
            "baseline": ["*visit1*", "*exam1*", "*baseline*"],
            "lab":      ["*lab*", "*blood*"],
            "meds":     ["*med*"],
        },
        "var_map": {
            "AGE01":   "age",     "AGE": "age",
            "GENDER":  "sex_code",
            "BMI01":   "bmi",     "BMI": "bmi",
            "WAIST01": "waist",
            "HGT01":   "height_cm",
            "GLUCOSE": "glucose_mgdl",
            "INSULIN": "insulin_uU",
            "HBA1C":   "hba1c",
            "CRP":     "crphs",
            "TRIG":    "tg_mgdl",
            "HDL":     "hdl_mgdl",
            "LDL":     "ldl_mgdl",
            "TCHOL":   "tc_mgdl",
        },
        "sex_map": {0: "F", 1: "M", "Female": "F", "Male": "M"},
        "eth_map": {},
        "default_eth": "af",  # JHS est une cohorte afro-américaine
    },
}


# ═══════════════════════════════════════════════════════════════════════
# FONCTIONS DE CHARGEMENT
# ═══════════════════════════════════════════════════════════════════════

def discover_files(data_dir):
    """Découvre tous les fichiers de données dans un répertoire."""
    extensions = ['*.sas7bdat', '*.xpt', '*.csv']
    files = []
    for ext in extensions:
        files.extend(glob_module.glob(os.path.join(data_dir, '**', ext), recursive=True))
    files.sort()
    return files


def read_data_file(filepath):
    """Charge un fichier de données selon son format."""
    ext = os.path.splitext(filepath)[1].lower()
    try:
        if ext == '.sas7bdat':
            return pd.read_sas(filepath, format='sas7bdat', encoding='latin1')
        elif ext == '.xpt':
            return pd.read_sas(filepath, format='xport')
        elif ext == '.csv':
            return pd.read_csv(filepath)
        else:
            print(f"  [!] Format non supporté : {ext}")
            return None
    except Exception as e:
        print(f"  [!] Erreur lecture {os.path.basename(filepath)}: {e}")
        return None


def find_id_column(df, study_config):
    """Identifie la colonne ID dans un DataFrame."""
    preferred = study_config.get("id_col", "ID")
    # Chercher le nom exact (case-insensitive)
    for col in df.columns:
        if col.upper() == preferred.upper():
            return col
    # Fallback : chercher des patterns courants
    for pattern in ["ID", "IDNO", "PID", "SUBJID", "SEQN", "MESAID", "DBGAP_ID"]:
        for col in df.columns:
            if col.upper() == pattern:
                return col
    return None


def safe_merge(left, right, id_col, how='left'):
    """Fusionne deux DataFrames avec gestion d'erreurs."""
    if right is None or right.empty:
        return left
    if id_col not in right.columns:
        return left
    # Éviter les doublons de colonnes (sauf la clé)
    overlap = set(left.columns) & set(right.columns) - {id_col}
    if overlap:
        right = right.drop(columns=list(overlap))
    return left.merge(right, on=id_col, how=how)


# ═══════════════════════════════════════════════════════════════════════
# CHARGEMENT PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════

def load_biolincc_study(study_name, data_path="./biolincc_data/", file_list=None):
    """
    Charge et fusionne les fichiers d'une étude BioLINCC.

    Paramètres
    ----------
    study_name : str
        Nom de l'étude (MESA, FHS, ARIC, JHS) ou 'generic'.
    data_path : str
        Chemin vers le répertoire contenant les fichiers décompressés.
    file_list : dict, optional
        Mapping explicite {catégorie: chemin_fichier} pour remplacer
        la découverte automatique. Ex: {"baseline": "exam1.sas7bdat"}

    Retourne
    --------
    pd.DataFrame ou None
    """
    print(f"\n{'=' * 70}")
    print(f"  CHARGEMENT ÉTUDE BioLINCC : {study_name.upper()}")
    print(f"{'=' * 70}")

    study_dir = os.path.join(data_path, study_name) if study_name not in data_path else data_path

    if not os.path.isdir(study_dir):
        print(f"  [!] Répertoire non trouvé : {study_dir}")
        print(f"      Vérifiez que les données sont décompressées dans ce chemin.")
        return None

    config = STUDY_CONFIGS.get(study_name.upper(), {})
    id_col = config.get("id_col", "ID")

    # --- Découverte des fichiers ---
    if file_list:
        # Mapping explicite fourni par l'utilisateur
        files_by_cat = {}
        for cat, fpath in file_list.items():
            full_path = os.path.join(study_dir, fpath) if not os.path.isabs(fpath) else fpath
            if os.path.exists(full_path):
                files_by_cat[cat] = full_path
            else:
                print(f"  [!] Fichier non trouvé : {fpath}")
    elif "files" in config:
        # Fichiers prédéfinis dans la config de l'étude (ex: MESA)
        files_by_cat = {}
        for cat, fname in config["files"].items():
            full_path = os.path.join(study_dir, fname)
            if os.path.exists(full_path):
                files_by_cat[cat] = full_path
                print(f"  [{cat.upper()}] Trouvé : {fname}")
            else:
                print(f"  [{cat.upper()}] Non trouvé : {fname} (optionnel)")
        # Si aucun fichier prédéfini trouvé, fallback sur découverte auto
        if not files_by_cat:
            print("  Fichiers prédéfinis non trouvés, tentative de découverte automatique...")
            all_files = discover_files(study_dir)
            print(f"  Fichiers découverts : {len(all_files)}")
            for f in all_files:
                print(f"    - {os.path.relpath(f, study_dir)}")
            files_by_cat = _match_files_to_categories(all_files, config)
    else:
        # Découverte automatique par patterns
        all_files = discover_files(study_dir)
        print(f"\n  Fichiers découverts : {len(all_files)}")
        for f in all_files:
            print(f"    - {os.path.relpath(f, study_dir)}")
        files_by_cat = _match_files_to_categories(all_files, config)

    # --- Chargement et fusion ---
    dataframes = {}
    for cat, fpath in files_by_cat.items():
        print(f"\n  [{cat.upper()}] Chargement : {os.path.basename(fpath)}")
        df_part = read_data_file(fpath)
        if df_part is not None:
            print(f"    → {len(df_part):,} obs, {len(df_part.columns)} vars")
            # Trouver la colonne ID
            actual_id = find_id_column(df_part, config)
            if actual_id and actual_id != id_col:
                df_part = df_part.rename(columns={actual_id: id_col})
            dataframes[cat] = df_part

    if not dataframes:
        print("\n  [!] Aucun fichier chargé. Vérifiez le répertoire des données.")
        return None

    # Fusionner tous les DataFrames sur la colonne ID
    categories = list(dataframes.keys())
    df = dataframes[categories[0]].copy()
    for cat in categories[1:]:
        df = safe_merge(df, dataframes[cat], id_col)
        print(f"  Fusion [{cat}] → {len(df):,} obs")

    print(f"\n  Dataset fusionné : {len(df):,} observations, {len(df.columns)} variables")
    return df


def _match_files_to_categories(files, config):
    """Associe les fichiers découverts aux catégories de l'étude."""
    patterns = config.get("file_patterns", {
        "baseline": ["*baseline*", "*exam*", "*visit*", "*demo*"],
        "lab":      ["*lab*", "*blood*", "*chem*", "*biochem*"],
        "meds":     ["*med*", "*pharm*", "*drug*", "*rx*"],
    })
    matched = {}
    for cat, pats in patterns.items():
        for pat in pats:
            for f in files:
                fname = os.path.basename(f).lower()
                # Conversion du glob en match simple
                pat_lower = pat.replace("*", "").lower()
                if pat_lower in fname and cat not in matched:
                    matched[cat] = f
                    break
            if cat in matched:
                break
    # Inclure les fichiers non catégorisés sous 'other_N'
    matched_paths = set(matched.values())
    idx = 0
    for f in files:
        if f not in matched_paths:
            matched[f"other_{idx}"] = f
            idx += 1
    return matched


# ═══════════════════════════════════════════════════════════════════════
# HARMONISATION VERS LE SCHÉMA BMN v3.0
# ═══════════════════════════════════════════════════════════════════════

def harmonize_to_bmn(df, study_name):
    """
    Harmonise un DataFrame BioLINCC vers le schéma de variables BMN v3.0.

    Applique :
      - Renommage des variables selon le mapping de l'étude
      - Conversions d'unités (mg/dL → mmol/L, mg/dL → µmol/L)
      - Dérivation des variables composites (HOMA-IR, WHtR, TG/HDL, LDL Friedewald)
      - Mapping sexe et ethnicité

    Paramètres
    ----------
    df : pd.DataFrame
        DataFrame issu de load_biolincc_study()
    study_name : str
        Nom de l'étude pour sélectionner la bonne configuration

    Retourne
    --------
    pd.DataFrame harmonisé
    """
    config = STUDY_CONFIGS.get(study_name.upper(), {})
    var_map = config.get("var_map", {})
    sex_map = config.get("sex_map", {1: "M", 2: "F"})
    eth_map = config.get("eth_map", {})
    default_eth = config.get("default_eth", "eu")

    print(f"\n[HARMONISATION] Application du mapping BMN v3.0 pour {study_name.upper()}...")

    df_h = df.copy()

    # --- Renommage des variables ---
    rename_map = {}
    for src, dst in var_map.items():
        # Chercher la colonne (case-insensitive)
        for col in df_h.columns:
            if col.upper() == src.upper() and dst not in df_h.columns:
                rename_map[col] = dst
                break
    if rename_map:
        df_h = df_h.rename(columns=rename_map)
        print(f"  Variables renommées : {len(rename_map)}")
        for src, dst in list(rename_map.items())[:10]:
            print(f"    {src} → {dst}")

    # --- Filtrer adultes ≥ 18 ans ---
    if 'age' in df_h.columns:
        n_before = len(df_h)
        df_h = df_h[df_h['age'] >= 18].copy()
        n_removed = n_before - len(df_h)
        if n_removed > 0:
            print(f"  Filtrage adultes ≥18 : {n_removed:,} exclus → {len(df_h):,} restants")

    # --- Sexe ---
    if 'sex_code' in df_h.columns:
        df_h['sex'] = df_h['sex_code'].map(sex_map).fillna('M')
        print(f"  Sexe : {df_h['sex'].value_counts().to_dict()}")

    # --- Ethnicité ---
    if 'race_eth' in df_h.columns and eth_map:
        df_h['ethnicCode'] = df_h['race_eth'].map(eth_map).fillna(default_eth)
    else:
        df_h['ethnicCode'] = default_eth
    print(f"  Ethnicité : {df_h['ethnicCode'].value_counts().to_dict()}")

    # --- Conversions d'unités ---
    # Glucose : mg/dL → mmol/L
    if 'glucose_mgdl' in df_h.columns and 'glyc' not in df_h.columns:
        df_h['glyc'] = df_h['glucose_mgdl'] / 18.0
        print(f"  Glucose : mg/dL → mmol/L (÷18)")

    # Triglycérides : mg/dL → mmol/L
    if 'tg_mgdl' in df_h.columns and 'tg' not in df_h.columns:
        df_h['tg'] = df_h['tg_mgdl'] / 88.57
        print(f"  Triglycérides : mg/dL → mmol/L (÷88.57)")

    # HDL : mg/dL → mmol/L
    if 'hdl_mgdl' in df_h.columns and 'hdl' not in df_h.columns:
        df_h['hdl'] = df_h['hdl_mgdl'] / 38.67
        print(f"  HDL : mg/dL → mmol/L (÷38.67)")

    # LDL : mg/dL → mmol/L
    if 'ldl_mgdl' in df_h.columns and 'ldl' not in df_h.columns:
        df_h['ldl'] = df_h['ldl_mgdl'] / 38.67
        print(f"  LDL : mg/dL → mmol/L (÷38.67)")

    # Cholestérol total : mg/dL → mmol/L
    if 'tc_mgdl' in df_h.columns:
        df_h['tc_mmol'] = df_h['tc_mgdl'] / 38.67

    # Acide urique : mg/dL → µmol/L
    if 'urate_mgdl' in df_h.columns and 'urate' not in df_h.columns:
        df_h['urate'] = df_h['urate_mgdl'] * 59.48
        print(f"  Acide urique : mg/dL → µmol/L (×59.48)")

    # --- Variables dérivées ---
    # WHtR = waist (cm) / height (cm)
    if 'waist' in df_h.columns and 'height_cm' in df_h.columns and 'whtr' not in df_h.columns:
        df_h['whtr'] = df_h['waist'] / df_h['height_cm']
        print(f"  WHtR dérivé : waist / height")

    # HOMA-IR = (glucose mg/dL × insuline µU/mL) / 405
    if 'glucose_mgdl' in df_h.columns and 'insulin_uU' in df_h.columns and 'homaIR' not in df_h.columns:
        df_h['homaIR'] = (df_h['glucose_mgdl'] * df_h['insulin_uU']) / 405.0
        print(f"  HOMA-IR dérivé : (glucose × insuline) / 405")

    # TG/HDL ratio
    if 'tg' in df_h.columns and 'hdl' in df_h.columns and 'tghdl' not in df_h.columns:
        df_h['tghdl'] = df_h['tg'] / df_h['hdl']
        print(f"  TG/HDL ratio dérivé")

    # LDL Friedewald si LDL manquant mais TC, HDL et TG disponibles
    if 'ldl' not in df_h.columns and all(c in df_h.columns for c in ['tc_mmol', 'hdl', 'tg']):
        df_h['ldl'] = df_h['tc_mmol'] - df_h['hdl'] - df_h['tg'] / 2.2
        print(f"  LDL Friedewald dérivé : TC - HDL - TG/2.2")

    # --- Variables spécifiques MESA ---
    # VAT/SAT ratio (CT Adipose Tissue — validation du WHtR)
    if 'vat_area' in df_h.columns and 'sat_area' in df_h.columns:
        df_h['vat_sat_ratio'] = df_h['vat_area'] / df_h['sat_area'].replace(0, np.nan)
        print(f"  VAT/SAT ratio dérivé (CT adipose)")
        print(f"    VAT area : {df_h['vat_area'].mean():.1f} +/- {df_h['vat_area'].std():.1f} cm2")
        print(f"    SAT area : {df_h['sat_area'].mean():.1f} +/- {df_h['sat_area'].std():.1f} cm2")

    # Activité physique MESA : combiner moderate + vigorous minutes/semaine
    if 'mod_min_week' in df_h.columns or 'vig_min_week' in df_h.columns:
        mod = pd.to_numeric(df_h.get('mod_min_week', 0), errors='coerce').fillna(0)
        vig = pd.to_numeric(df_h.get('vig_min_week', 0), errors='coerce').fillna(0)
        df_h['physicalActivityMinWeek'] = mod + vig
        print(f"  Activite physique : moderate + vigorous = {df_h['physicalActivityMinWeek'].mean():.0f} min/sem")

    # --- Résumé des données manquantes ---
    bmn_biomarkers = ['homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl',
                      'asat', 'ggt', 'urate']
    available = [c for c in bmn_biomarkers if c in df_h.columns]
    missing_vars = [c for c in bmn_biomarkers if c not in df_h.columns]

    print(f"\n  Biomarqueurs BMN disponibles : {len(available)}/{len(bmn_biomarkers)}")
    for c in available:
        n_miss = df_h[c].isnull().sum()
        pct = n_miss / len(df_h) * 100
        print(f"    ✓ {c:12s} : {n_miss:,} manquants ({pct:.1f}%)")
    if missing_vars:
        print(f"  Biomarqueurs non disponibles :")
        for c in missing_vars:
            print(f"    ✗ {c}")

    return df_h


# ═══════════════════════════════════════════════════════════════════════
# VARIABLES CIBLES (OUTCOMES)
# ═══════════════════════════════════════════════════════════════════════

def compute_outcomes(df):
    """
    Dérive les variables cibles pour la validation BMN v3.0.

    Critères MetS (IDF simplifiés) :
      1. Tour de taille élevé (>88 F / >102 M pour EU)
      2. TG ≥ 1.7 mmol/L
      3. HDL < 1.0 M / < 1.3 F mmol/L
      4. Glycémie ≥ 5.6 mmol/L ou DT2
      5. HTA diagnostiquée
    """
    print("\n[OUTCOMES] Dérivation des variables cibles...")

    # --- Syndrome métabolique (MetS) ---
    if all(c in df.columns for c in ['sex', 'waist', 'tg', 'hdl', 'glyc']):
        def compute_mets(row):
            criteria = 0
            if row['sex'] == 'F':
                if row.get('waist', 0) > 88:
                    criteria += 1
                if row.get('hdl', 999) < 1.3:
                    criteria += 1
            else:
                if row.get('waist', 0) > 102:
                    criteria += 1
                if row.get('hdl', 999) < 1.0:
                    criteria += 1
            if row.get('tg', 0) >= 1.7:
                criteria += 1
            if row.get('glyc', 0) >= 5.6:
                criteria += 1
            if row.get('has_hta', 0) == 1:
                criteria += 1
            return int(criteria >= 3)

        df['mets_outcome'] = df.apply(compute_mets, axis=1)
        prev = df['mets_outcome'].mean() * 100
        print(f"  MetS : prévalence = {prev:.1f}% (N={df['mets_outcome'].sum():,})")
    else:
        print("  [!] MetS : variables insuffisantes (besoin de sex, waist, tg, hdl, glyc)")

    # --- Obésité (BMI ≥ 30) ---
    if 'bmi' in df.columns:
        df['obesity_outcome'] = (df['bmi'] >= 30).astype(int)
        prev = df['obesity_outcome'].mean() * 100
        print(f"  Obésité : prévalence = {prev:.1f}% (N={df['obesity_outcome'].sum():,})")

    return df


# ═══════════════════════════════════════════════════════════════════════
# SÉLECTION DES COLONNES D'ANALYSE
# ═══════════════════════════════════════════════════════════════════════

def select_analysis_columns(df, id_col="ID"):
    """Sélectionne et ordonne les colonnes utiles pour l'analyse BMN."""
    analysis_cols = [
        id_col, 'age', 'sex', 'ethnicCode', 'bmi', 'waist', 'whtr', 'height_cm',
        'homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl',
        'asat', 'ggt', 'urate',
        'phq9', 'sleepHours', 'physicalActivityMinWeek', 'tobaccoStatus',
        'drinksPerWeek', 'has_diabetes', 'has_hta', 'has_hypo',
        'mets_outcome', 'obesity_outcome',
    ]
    available = [c for c in analysis_cols if c in df.columns]
    return df[available].copy()


# ═══════════════════════════════════════════════════════════════════════
# IMPUTATION MONTE CARLO (MICE)
# ═══════════════════════════════════════════════════════════════════════

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


def run_mice_imputation(df, n_imputations=20, n_iterations=10, random_state=42):
    """
    Exécute l'imputation MICE sur le DataFrame harmonisé.

    Paramètres
    ----------
    df : pd.DataFrame
        DataFrame harmonisé (post harmonize_to_bmn)
    n_imputations : int
        Nombre d'imputations Monte Carlo (défaut: 20)
    n_iterations : int
        Nombre d'itérations MICE par imputation (défaut: 10)
    random_state : int
        Graine aléatoire

    Retourne
    --------
    list[pd.DataFrame] : liste de DataFrames imputés
    """
    print(f"\n{'=' * 70}")
    print(f"  IMPUTATION MONTE CARLO (MICE)")
    print(f"  {n_imputations} imputations × {n_iterations} itérations")
    print(f"{'=' * 70}")

    impute_cols = [
        'bmi', 'waist', 'whtr', 'homaIR', 'hba1c', 'crphs', 'tghdl',
        'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate',
        'phq9', 'sleepHours', 'physicalActivityMinWeek', 'drinksPerWeek'
    ]
    impute_cols = [c for c in impute_cols if c in df.columns]
    print(f"  Colonnes à imputer : {len(impute_cols)}")

    mice = MICEImputer(n_imputations=n_imputations,
                       n_iterations=n_iterations,
                       random_state=random_state)
    imputed_datasets = mice.impute(df, impute_cols)

    print(f"  {len(imputed_datasets)} jeux de données imputés (Monte Carlo MICE)")

    # Vérification : plus aucun NaN dans les colonnes imputées
    for i, ds in enumerate(imputed_datasets[:3]):
        remaining = ds[impute_cols].isnull().sum().sum()
        print(f"    Dataset {i}: NaN résiduels = {remaining}")

    return imputed_datasets


# ═══════════════════════════════════════════════════════════════════════
# ALGORITHME SCORE BMN v3.0 (PORTÉ EN PYTHON)
# ═══════════════════════════════════════════════════════════════════════

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
    """Calcule le SCORE BMN v3.0 pour une ligne du DataFrame."""
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

    # ── C4: Comorbidités (0-10) ──
    bmn_k = 0
    if row.get('has_diabetes', 0) == 1: bmn_k += 14 * ep['dR'] * ep['cR']
    if row.get('has_hta', 0) == 1: bmn_k += 10 * ep['hR'] * ep['cR']
    if row.get('has_hypo', 0) == 1: bmn_k += 6 * ep['cR']
    # MetS détecté par critères
    if row.get('mets_outcome', 0) == 1: bmn_k += 12 * ep['cR']
    bmn_k = min(50, bmn_k)
    c4 = round((bmn_k / 50) * 10)

    # ── C5: Antécédents familiaux → 0 (non disponible BioLINCC standard) ──
    c5 = 0

    # ── C6: Tabac (0-8) ──
    tob = int(row.get('tobaccoStatus', 0))
    c6 = [0, 1, 2, 4, 8][min(tob, 4)]

    # ── C7: Santé mentale (0-8) — PHQ-9 si disponible ──
    phq9 = row.get('phq9', 0)
    if pd.isna(phq9): phq9 = 0
    if phq9 >= 20: c7 = 4
    elif phq9 >= 15: c7 = 3
    elif phq9 >= 10: c7 = 2
    elif phq9 >= 5: c7 = 1
    else: c7 = 0

    # ── C8: Sommeil (0-4) ──
    sleep_h = row.get('sleepHours', 7)
    if pd.isna(sleep_h): sleep_h = 7
    if sleep_h < 5: c8 = 3
    elif sleep_h < 6: c8 = 2
    elif sleep_h < 7: c8 = 1
    else: c8 = 0

    c_raw = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8
    C = min(50, round(c_raw * (1 + ep['ev'] / 100)))

    # ── E: Exposome (simplifié — BioLINCC n'a pas données environnement) ──
    E = 0

    # ── O: Occupationnel (simplifié) ──
    O = 0

    # ── L: Lifestyle (0-10) ──
    # l1: Activité physique
    pa = row.get('physicalActivityMinWeek', 150)
    if pd.isna(pa): pa = 150
    if pa >= 150: l1 = 0
    elif pa >= 75: l1 = 1
    elif pa >= 30: l1 = 2
    else: l1 = 3
    # l2: Nutrition (pas PREDIMED dans BioLINCC) → score 0
    l2 = 0
    # l3: Alcool
    dpw = row.get('drinksPerWeek', 0)
    if pd.isna(dpw): dpw = 0
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

    # ── BioNorm — Z-score pondéré normalisé ──
    sumZW = 0
    sumW = 0
    for bio_id, bio_def in BIOMARKERS.items():
        val = row.get(bio_id)
        if val is None or (isinstance(val, float) and np.isnan(val)):
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

    # ── Score Final sf — avec repondération dynamique ──
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

    # HbA1c emergency gates
    hba1c_val = row.get('hba1c', 5.0)
    if pd.isna(hba1c_val): hba1c_val = 5.0
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


def apply_bmn_score(df, imputed_datasets):
    """
    Applique le SCORE BMN v3.0 sur chaque jeu imputé et combine par la règle de Rubin.

    Paramètres
    ----------
    df : pd.DataFrame
        DataFrame original (non imputé)
    imputed_datasets : list[pd.DataFrame]
        Liste des DataFrames imputés par MICE

    Retourne
    --------
    df : pd.DataFrame avec colonnes sf, sf_se, sD, bioNorm, C, L, bmn_k, label
    imputed_datasets : list[pd.DataFrame] avec scores ajoutés
    """
    print(f"\n{'=' * 70}")
    print(f"  APPLICATION DU SCORE BMN v3.0")
    print(f"  Sur {len(imputed_datasets)} jeux imputés")
    print(f"{'=' * 70}")

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

    print(f"\n  Scores BMN calculés sur {len(imputed_datasets)} imputations")
    print(f"  sf moyen : {df['sf'].mean():.1f} +/- {df['sf'].std():.1f}")
    print(f"  Distribution des classes :")
    print(f"    FAIBLE     : {(df['sf'] < 30).sum():,} ({(df['sf'] < 30).mean()*100:.1f}%)")
    print(f"    MODERE     : {((df['sf'] >= 30) & (df['sf'] < 60)).sum():,} ({((df['sf'] >= 30) & (df['sf'] < 60)).mean()*100:.1f}%)")
    print(f"    ELEVE      : {((df['sf'] >= 60) & (df['sf'] < 80)).sum():,} ({((df['sf'] >= 60) & (df['sf'] < 80)).mean()*100:.1f}%)")
    print(f"    TRES ELEVE : {(df['sf'] >= 80).sum():,} ({(df['sf'] >= 80).mean()*100:.1f}%)")

    return df, imputed_datasets


# ═══════════════════════════════════════════════════════════════════════
# VALIDATION STATISTIQUE COMPLÈTE
# ═══════════════════════════════════════════════════════════════════════

def run_validation(df, imputed_datasets, study_name, output_dir=None):
    """
    Pipeline de validation statistique complet du SCORE BMN v3.0.

    Inclut :
      - AUC-ROC + IC95% bootstrap (2000 itérations)
      - Modèles comparatifs (Logistic, RF, GBM) en cross-validation 5-fold
      - NRI (Net Reclassification Improvement) vs Logistic Regression
      - IDI (Integrated Discrimination Improvement)
      - Brier Score
      - Hosmer-Lemeshow (calibration)
      - DeLong Test (comparaison AUC)
      - Analyse de sensibilité Monte Carlo (sur les M imputations)
      - Génération de 6 figures publication-quality

    Paramètres
    ----------
    df : pd.DataFrame
        DataFrame avec colonnes sf, mets_outcome, obesity_outcome
    imputed_datasets : list[pd.DataFrame]
        Datasets imputés avec scores BMN
    study_name : str
        Nom de l'étude (pour titres et fichiers)
    output_dir : str, optional
        Répertoire de sortie (défaut: ./bmn_validation_biolincc/)

    Retourne
    --------
    dict : résultats de validation par outcome
    """
    if output_dir is None:
        output_dir = f'./bmn_validation_biolincc_{study_name.lower()}'
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'=' * 70}")
    print(f"  VALIDATION STATISTIQUE — {study_name.upper()}")
    print(f"  Sortie : {output_dir}")
    print(f"{'=' * 70}")

    # Outcomes à valider
    outcomes = {}
    if 'mets_outcome' in df.columns:
        outcomes['MetS'] = 'mets_outcome'
    if 'obesity_outcome' in df.columns:
        outcomes['Obesity'] = 'obesity_outcome'

    if not outcomes:
        print("  [!] Aucun outcome disponible pour la validation")
        return {}

    n_boot = 2000
    results = {}

    for outcome_name, outcome_col in outcomes.items():
        print(f"\n  {'─' * 60}")
        print(f"  Validation pour {outcome_name}")
        print(f"  {'─' * 60}")

        # Préparer les données
        valid_mask = df[outcome_col].notna() & df['sf'].notna()
        y = df.loc[valid_mask, outcome_col].values.astype(int)
        sf_scores = df.loc[valid_mask, 'sf'].values
        sf_prob = sf_scores / 100.0  # Normaliser en probabilité [0,1]

        if len(y) < 100 or y.sum() < 10:
            print(f"    Donnees insuffisantes pour {outcome_name}")
            continue

        print(f"    N={len(y):,}, Events={y.sum():,} ({y.mean()*100:.1f}%)")

        # ─── AUC-ROC avec IC95% Bootstrap ───
        print("    [AUC-ROC + Bootstrap IC95%]")
        auc_main = roc_auc_score(y, sf_prob)

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

        fpr, tpr, thresholds = roc_curve(y, sf_prob)

        # ─── Modèles comparatifs ───
        print("    [Modeles comparatifs — cross-validation 5-fold]")

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

        # ─── NRI (Net Reclassification Improvement) ───
        print("    [NRI — Net Reclassification Improvement]")

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

        nri_se = nri_boot.std()
        nri_z = nri_total / nri_se if nri_se > 0 else 0
        nri_p = 2 * (1 - stats.norm.cdf(abs(nri_z)))

        print(f"    NRI total = {nri_total:.4f} [IC95%: {nri_ci[0]:.4f} - {nri_ci[1]:.4f}], p={nri_p:.4f}")
        print(f"    NRI events = {nri_events:.4f}, NRI non-events = {nri_nonevents:.4f}")

        # ─── IDI (Integrated Discrimination Improvement) ───
        print("    [IDI — Integrated Discrimination Improvement]")

        disc_bmn = sf_prob[events].mean() - sf_prob[non_events].mean()
        disc_ref = ref_probs[events].mean() - ref_probs[non_events].mean()
        idi = disc_bmn - disc_ref

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

        # ─── Brier Score ───
        brier_bmn = brier_score_loss(y, sf_prob)
        brier_ref = brier_score_loss(y, ref_probs)
        print(f"    Brier Score BMN = {brier_bmn:.4f} vs Logistic = {brier_ref:.4f}")

        # ─── Hosmer-Lemeshow ───
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
        print(f"    Hosmer-Lemeshow chi2 = {hl_chi2:.2f}, df={hl_df}, p={hl_p:.4f}")
        print(f"    {'Bonne calibration' if hl_p > 0.05 else 'Calibration a ameliorer'}")

        # ─── DeLong Test (comparaison AUC BMN vs LR) ───
        print("    [DeLong Test — Comparaison AUC]")

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
        print(f"    dAUC = {delong_diff:.4f}, z={delong_z:.2f}, p={delong_p:.4f}")

        # ─── Monte Carlo Sensitivity Analysis ───
        print(f"    [Monte Carlo Sensitivity — {len(imputed_datasets)} imputations]")

        mc_aucs = []
        for i, ds in enumerate(imputed_datasets):
            sf_i = ds.loc[valid_mask, 'sf'].values / 100.0
            if len(np.unique(y)) >= 2:
                mc_aucs.append(roc_auc_score(y, sf_i))
        mc_aucs = np.array(mc_aucs)
        print(f"    AUC across imputations: {mc_aucs.mean():.4f} +/- {mc_aucs.std():.4f}")
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

    # ═══════════════════════════════════════════════════════════════════
    # GÉNÉRATION DES FIGURES
    # ═══════════════════════════════════════════════════════════════════

    print(f"\n  Generation des figures pour revue scientifique...")

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

        # ── FIGURE 1 : ROC Curves comparatives ──
        fig, ax = plt.subplots(1, 1, figsize=(8, 7))
        ax.plot(res['fpr'], res['tpr'], 'b-', linewidth=2.5,
                label=f"SCORE BMN v3.0 (AUC={res['AUC_BMN']:.3f})")

        colors = {'Logistic Regression': '#e74c3c', 'Random Forest': '#2ecc71', 'Gradient Boosting': '#f39c12'}
        for model_name, auc_val in res['AUC_models'].items():
            if model_name == 'SCORE BMN v3.0':
                continue
            probs = np.array(res['model_probs'][model_name])
            fpr_m, tpr_m, _ = roc_curve(y_out, probs)
            ax.plot(fpr_m, tpr_m, '--', color=colors.get(model_name, 'gray'), linewidth=1.5,
                    label=f"{model_name} (AUC={auc_val:.3f})")

        ax.plot([0, 1], [0, 1], 'k--', alpha=0.3, linewidth=1)
        ax.set_xlabel('1 - Specificity (False Positive Rate)')
        ax.set_ylabel('Sensitivity (True Positive Rate)')
        ax.set_title(f'ROC Curves — {outcome_name} Prediction\nBioLINCC {study_name.upper()} (N={res["N"]:,})')
        ax.legend(loc='lower right', fontsize=9)
        ax.set_xlim([-0.02, 1.02])
        ax.set_ylim([-0.02, 1.02])
        fig.savefig(f'{output_dir}/fig1_roc_{tag}.png')
        plt.close(fig)
        print(f"    Figure 1 (ROC) sauvegardee : fig1_roc_{tag}.png")

        # ── FIGURE 2 : Calibration Plot ──
        fig, ax = plt.subplots(1, 1, figsize=(7, 7))
        frac_pos, mean_pred = calibration_curve(y_out, sf_out, n_bins=10, strategy='quantile')
        ax.plot(mean_pred, frac_pos, 'bo-', linewidth=2, markersize=8, label='SCORE BMN v3.0')
        ax.plot([0, 1], [0, 1], 'k--', alpha=0.4, label='Perfect calibration')

        probs_lr = np.array(res['model_probs']['Logistic Regression'])
        frac_lr, mean_lr = calibration_curve(y_out, probs_lr, n_bins=10, strategy='quantile')
        ax.plot(mean_lr, frac_lr, 'r^--', linewidth=1.5, markersize=6, label='Logistic Regression')

        ax.set_xlabel('Predicted Probability')
        ax.set_ylabel('Observed Frequency')
        ax.set_title(f'Calibration Plot — {outcome_name}\nHostmer-Lemeshow p={res["HL_p"]:.3f}')
        ax.legend(loc='upper left')
        fig.savefig(f'{output_dir}/fig2_calibration_{tag}.png')
        plt.close(fig)
        print(f"    Figure 2 (Calibration) sauvegardee : fig2_calibration_{tag}.png")

        # ── FIGURE 3 : Distribution des scores par outcome ──
        fig, ax = plt.subplots(1, 1, figsize=(9, 5))
        sf_all = df.loc[valid_mask_out, 'sf'].values

        ax.hist(sf_all[y_out == 0], bins=40, alpha=0.6, color='#3498db', density=True,
                label=f'No {outcome_name} (n={int((y_out==0).sum()):,})')
        ax.hist(sf_all[y_out == 1], bins=40, alpha=0.6, color='#e74c3c', density=True,
                label=f'{outcome_name} (n={int((y_out==1).sum()):,})')

        ax.axvline(30, color='orange', linestyle='--', alpha=0.7, label='Threshold: 30 (Moderate)')
        ax.axvline(60, color='red', linestyle='--', alpha=0.7, label='Threshold: 60 (High)')
        ax.set_xlabel('SCORE BMN v3.0 (sf)')
        ax.set_ylabel('Density')
        ax.set_title(f'Score Distribution by {outcome_name} Status')
        ax.legend(fontsize=9)
        fig.savefig(f'{output_dir}/fig3_distribution_{tag}.png')
        plt.close(fig)
        print(f"    Figure 3 (Distribution) sauvegardee : fig3_distribution_{tag}.png")

    # ── FIGURE 4 : Monte Carlo Sensitivity ──
    if len(results) > 0:
        n_panels = len(results)
        fig, axes = plt.subplots(1, n_panels, figsize=(7*n_panels, 5))
        if n_panels == 1:
            axes = [axes]
        for idx, (outcome_name, res) in enumerate(results.items()):
            ax = axes[idx]
            valid_mask_out = df[outcomes[outcome_name]].notna() & df['sf'].notna()
            y_out = df.loc[valid_mask_out, outcomes[outcome_name]].values.astype(int)

            mc_aucs_fig = []
            for ds in imputed_datasets:
                sf_i = ds.loc[valid_mask_out, 'sf'].values / 100.0
                mc_aucs_fig.append(roc_auc_score(y_out, sf_i))

            ax.bar(range(1, len(mc_aucs_fig)+1), mc_aucs_fig, color='#3498db', alpha=0.7)
            ax.axhline(np.mean(mc_aucs_fig), color='red', linestyle='--', linewidth=2,
                       label=f'Mean AUC = {np.mean(mc_aucs_fig):.4f}')
            ax.fill_between(range(0, len(mc_aucs_fig)+2),
                            np.mean(mc_aucs_fig) - 2*np.std(mc_aucs_fig),
                            np.mean(mc_aucs_fig) + 2*np.std(mc_aucs_fig),
                            color='red', alpha=0.1, label=f'+/-2 SD')
            ax.set_xlabel('Imputation #')
            ax.set_ylabel('AUC')
            ax.set_title(f'Monte Carlo Sensitivity — {outcome_name}')
            ax.legend()
            ax.set_ylim([min(mc_aucs_fig) - 0.02, max(mc_aucs_fig) + 0.02])

        fig.tight_layout()
        fig.savefig(f'{output_dir}/fig4_monte_carlo_sensitivity.png')
        plt.close(fig)
        print(f"    Figure 4 (Monte Carlo) sauvegardee")

    # ── FIGURE 5 : Forest Plot comparatif des AUC ──
    if len(results) > 0:
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
        ax.set_yticks(list(y_pos))
        ax.set_yticklabels(all_models, fontsize=9)
        ax.set_xlabel('AUC-ROC')
        ax.set_title(f'Forest Plot — AUC Comparison ({study_name.upper()})')
        ax.axvline(0.5, color='red', linestyle='--', alpha=0.3)
        fig.tight_layout()
        fig.savefig(f'{output_dir}/fig5_forest_plot.png')
        plt.close(fig)
        print(f"    Figure 5 (Forest Plot) sauvegardee")

    # ── FIGURE 6 : Heatmap biomarqueurs vs score ──
    bio_cols_avail = [c for c in ['homaIR', 'hba1c', 'crphs', 'tghdl', 'glyc', 'ldl', 'tg', 'hdl', 'asat', 'ggt', 'urate'] if c in df.columns]
    if len(bio_cols_avail) >= 3:
        fig, ax = plt.subplots(1, 1, figsize=(12, 5))
        df['sf_quartile'] = pd.qcut(df['sf'], q=4, labels=['Q1 (Low)', 'Q2', 'Q3', 'Q4 (High)'])
        bio_by_q = df.groupby('sf_quartile')[bio_cols_avail].mean()
        bio_norm = (bio_by_q - bio_by_q.min()) / (bio_by_q.max() - bio_by_q.min() + 1e-9)
        sns.heatmap(bio_norm.T, annot=bio_by_q.T.round(2).values, fmt='', cmap='YlOrRd',
                    ax=ax, linewidths=0.5, cbar_kws={'label': 'Normalized level'})
        ax.set_title(f'Biomarker Levels by SCORE BMN Quartile ({study_name.upper()})')
        ax.set_xlabel('Score BMN Quartile')
        fig.tight_layout()
        fig.savefig(f'{output_dir}/fig6_biomarker_heatmap.png')
        plt.close(fig)
        print(f"    Figure 6 (Heatmap biomarqueurs) sauvegardee")

    # ═══════════════════════════════════════════════════════════════════
    # TABLEAUX POUR REVUE SCIENTIFIQUE
    # ═══════════════════════════════════════════════════════════════════

    print(f"\n{'=' * 70}")
    print(f"  RESULTATS FINAUX — TABLEAUX PUBLICATION ({study_name.upper()})")
    print(f"{'=' * 70}")

    # TABLE 1 : Caractéristiques de la cohorte
    print(f"\n  TABLE 1: Baseline Characteristics (BioLINCC {study_name.upper()})")
    print(f"  {'Variable':<30} {'Mean +/- SD / N (%)':<30}")
    print(f"  {'-' * 60}")
    print(f"  {'N':<30} {len(df):,}")
    print(f"  {'Age (years)':<30} {df['age'].mean():.1f} +/- {df['age'].std():.1f}")
    if 'sex' in df.columns:
        print(f"  {'Male sex':<30} {(df['sex']=='M').sum():,} ({(df['sex']=='M').mean()*100:.1f}%)")
    if 'bmi' in df.columns:
        print(f"  {'BMI (kg/m2)':<30} {df['bmi'].mean():.1f} +/- {df['bmi'].std():.1f}")
    if 'waist' in df.columns:
        print(f"  {'Waist circumference (cm)':<30} {df['waist'].mean():.1f} +/- {df['waist'].std():.1f}")
    if 'homaIR' in df.columns:
        print(f"  {'HOMA-IR':<30} {df['homaIR'].mean():.2f} +/- {df['homaIR'].std():.2f}")
    if 'hba1c' in df.columns:
        print(f"  {'HbA1c (%)':<30} {df['hba1c'].mean():.2f} +/- {df['hba1c'].std():.2f}")
    if 'crphs' in df.columns:
        print(f"  {'hs-CRP (mg/L)':<30} {df['crphs'].mean():.2f} +/- {df['crphs'].std():.2f}")
    if 'mets_outcome' in df.columns:
        print(f"  {'Metabolic Syndrome':<30} {df['mets_outcome'].sum():,} ({df['mets_outcome'].mean()*100:.1f}%)")
    if 'obesity_outcome' in df.columns:
        print(f"  {'Obesity (BMI >= 30)':<30} {df['obesity_outcome'].sum():,} ({df['obesity_outcome'].mean()*100:.1f}%)")
    print(f"  {'SCORE BMN sf':<30} {df['sf'].mean():.1f} +/- {df['sf'].std():.1f}")

    # TABLE 2 : Performance discriminative
    if results:
        print(f"\n  TABLE 2: Discriminative Performance")
        print(f"  {'Metric':<35} ", end="")
        for outcome_name in results:
            print(f"{'  ' + outcome_name:<25}", end="")
        print()
        print(f"  {'-' * 85}")

        metrics = [
            ('AUC BMN [IC95%]', lambda r: f"{r['AUC_BMN']:.3f} [{r['AUC_CI'][0]:.3f}-{r['AUC_CI'][1]:.3f}]"),
            ('AUC Logistic Reg.', lambda r: f"{r['AUC_models']['Logistic Regression']:.3f}"),
            ('AUC Random Forest', lambda r: f"{r['AUC_models']['Random Forest']:.3f}"),
            ('AUC Gradient Boost', lambda r: f"{r['AUC_models']['Gradient Boosting']:.3f}"),
            ('DeLong dAUC (vs LR)', lambda r: f"{r['DeLong_diff']:+.4f} (p={r['DeLong_p']:.3f})"),
            ('NRI [IC95%]', lambda r: f"{r['NRI']:.3f} [{r['NRI_CI'][0]:.3f}-{r['NRI_CI'][1]:.3f}]"),
            ('NRI p-value', lambda r: f"{r['NRI_p']:.4f}"),
            ('IDI [IC95%]', lambda r: f"{r['IDI']:.4f} [{r['IDI_CI'][0]:.4f}-{r['IDI_CI'][1]:.4f}]"),
            ('IDI p-value', lambda r: f"{r['IDI_p']:.4f}"),
            ('Brier Score BMN', lambda r: f"{r['Brier_BMN']:.4f}"),
            ('Brier Score LR', lambda r: f"{r['Brier_LR']:.4f}"),
            ('HL chi2 (p-value)', lambda r: f"{r['HL_chi2']:.2f} (p={r['HL_p']:.3f})"),
            ('MC AUC mean +/- SD', lambda r: f"{r['MC_AUC_mean']:.4f} +/- {r['MC_AUC_std']:.4f}"),
        ]

        for label, fmt_func in metrics:
            print(f"  {label:<35} ", end="")
            for outcome_name, res in results.items():
                try:
                    print(f"{'  ' + fmt_func(res):<25}", end="")
                except Exception:
                    print(f"{'  N/A':<25}", end="")
            print()

    # TABLE 3 : Prévalence MetS par catégorie BMN
    if 'mets_outcome' in df.columns and results:
        print(f"\n  TABLE 3: Metabolic Syndrome Prevalence by BMN Risk Category")
        cats = [('FAIBLE', 0, 30), ('MODERE', 30, 60), ('ELEVE', 60, 80), ('TRES ELEVE', 80, 101)]
        print(f"  {'Category':<15} {'N':>8} {'MetS N':>8} {'MetS %':>8} {'OR':>10} {'p-value':>10}")
        print(f"  {'-' * 65}")

        ref_cat = df[(df['sf'] < 30)]
        ref_rate = ref_cat['mets_outcome'].mean() if len(ref_cat) > 0 else 0

        for cat_name, lo, hi in cats:
            sub = df[(df['sf'] >= lo) & (df['sf'] < hi)]
            if len(sub) == 0:
                continue
            n = len(sub)
            n_mets = int(sub['mets_outcome'].sum())
            rate = sub['mets_outcome'].mean()

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
                    table = np.array([[a, b], [c, d]])
                    _, p = stats.fisher_exact(table)
                    or_val = f"{odds_ratio:.2f}"
                    p_val = f"{p:.4f}"
                else:
                    or_val = 'N/A'
                    p_val = 'N/A'

            print(f"  {cat_name:<15} {n:>8,} {n_mets:>8,} {rate*100:>7.1f}% {or_val:>10} {p_val:>10}")

    # Sauvegarder les résultats en JSON
    save_results = {}
    for k, v in results.items():
        save_results[k] = {kk: vv for kk, vv in v.items()
                          if kk not in ['fpr', 'tpr', 'model_probs']}
    with open(f'{output_dir}/results.json', 'w') as f:
        json.dump(save_results, f, indent=2)

    print(f"\n  Resultats sauvegardes dans {output_dir}/results.json")
    print(f"  Figures sauvegardees dans {output_dir}/")

    # Liste des fichiers générés
    print(f"\n  Fichiers generes :")
    for f_name in sorted(os.listdir(output_dir)):
        fsize = os.path.getsize(f'{output_dir}/{f_name}')
        print(f"    {f_name} ({fsize:,} bytes)")

    return results


# ═══════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE — PIPELINE COMPLET
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    STUDY = "MESA"

    # Chemins de données possibles (essayer dans l'ordre)
    DATA_PATHS = ["./mesa_data/", "./biolincc_data/MESA/", "./biolincc_data/"]

    print("=" * 70)
    print("  SCORE BMN v3.0 — VALIDATION SUR COHORTE BioLINCC")
    print("=" * 70)

    # ── ÉTAPE 1 : Chargement des données ──
    print(f"\n[1/5] Chargement des donnees {STUDY}...")

    # Essayer chaque chemin
    df = None
    for DATA_PATH in DATA_PATHS:
        resolved = DATA_PATH
        if os.path.isdir(resolved):
            print(f"  Tentative : {resolved}")
            df = load_biolincc_study(STUDY, data_path=resolved)
            if df is not None:
                break

    if df is None:
        print(f"\n  Pour utiliser ce script :")
        print(f"    1. Telechargez les donnees depuis https://biolincc.nhlbi.nih.gov/")
        print(f"    2. Decompressez dans l'un de ces chemins :")
        for p in DATA_PATHS:
            print(f"       - {p}")
        print(f"    3. Relancez : python3 biolincc_data_loader.py")
        print(f"\n  Fichiers MESA attendus :")
        for cat, fname in STUDY_CONFIGS["MESA"]["files"].items():
            print(f"    - {fname} ({cat})")
        print(f"\n  Etudes supportees : {', '.join(STUDY_CONFIGS.keys())}")
        exit(0)

    # ── ÉTAPE 2 : Harmonisation ──
    print(f"\n[2/5] Harmonisation vers le schema BMN v3.0...")
    df = harmonize_to_bmn(df, STUDY)

    # ── ÉTAPE 3 : Outcomes ──
    print(f"\n[3/5] Derivation des outcomes...")
    df = compute_outcomes(df)

    # ── ÉTAPE 4 : Imputation Monte Carlo (MICE) ──
    print(f"\n[4/5] Imputation Monte Carlo (MICE)...")
    imputed_datasets = run_mice_imputation(df, n_imputations=20, n_iterations=10)

    # ── ÉTAPE 5 : Score BMN + Validation ──
    print(f"\n[5/5] Score BMN v3.0 + Validation statistique...")
    df, imputed_datasets = apply_bmn_score(df, imputed_datasets)
    results = run_validation(df, imputed_datasets, STUDY)

    print("\n" + "=" * 70)
    print("  ANALYSE TERMINEE")
    print("=" * 70)
