"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.0 — CHARGEUR DE DONNÉES BioLINCC
═══════════════════════════════════════════════════════════════════════════

Charge et harmonise les données issues des études BioLINCC (NHLBI)
pour validation du SCORE BMN v3.0.

Études supportées :
  - MESA (Multi-Ethnic Study of Atherosclerosis) — imagerie + biomarqueurs
  - FHS  (Framingham Heart Study) — cohorte prospective long terme
  - ARIC (Atherosclerosis Risk in Communities)
  - JHS  (Jackson Heart Study)
  - Générique : tout jeu de fichiers SAS/CSV avec ID commun

Pipeline :
  1. Découverte automatique des fichiers dans le répertoire de l'étude
  2. Chargement multi-format (SAS7BDAT, XPT, CSV)
  3. Fusion sur identifiant unique (configurable par étude)
  4. Harmonisation des variables vers le schéma BMN v3.0
  5. Conversions d'unités (mg/dL → mmol/L, etc.)
  6. Dérivation des variables composites (HOMA-IR, WHtR, TG/HDL, LDL Friedewald)
"""

import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import os
import glob as glob_module

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION PAR ÉTUDE
# ═══════════════════════════════════════════════════════════════════════

# Mappings spécifiques par étude : nom variable source → nom BMN v3
STUDY_CONFIGS = {
    "MESA": {
        "id_col": "MESAID",
        "file_patterns": {
            "baseline": ["*exam1*", "*baseline*", "*visit1*"],
            "lab":      ["*lab*", "*blood*", "*biochem*"],
            "meds":     ["*med*", "*pharm*", "*drug*"],
            "demo":     ["*demo*", "*participant*"],
            "anthro":   ["*anthro*", "*exam*", "*body*"],
        },
        "var_map": {
            # Démographie
            "AGE1C":    "age",     "AGE":      "age",
            "GENDER1":  "sex_code", "GENDER":  "sex_code",
            "RACE1C":   "race_eth", "RACE":    "race_eth",
            # Anthropométrie
            "BMI1C":    "bmi",      "BMI":     "bmi",
            "WAISTCM1": "waist",    "WAIST":   "waist",
            "HTCM1":    "height_cm","HEIGHT":  "height_cm",
            # Biomarqueurs (unités MESA : mg/dL sauf mention)
            "GLUCOS1":  "glucose_mgdl", "GLUCOSE": "glucose_mgdl",
            "INSULIN1": "insulin_uU",   "INSULIN": "insulin_uU",
            "HBA1C1":   "hba1c",
            "CRPHS1":   "crphs",    "CRP":     "crphs",
            "TRIG1":    "tg_mgdl",  "TRIG":    "tg_mgdl",
            "HDL1":     "hdl_mgdl", "HDL":     "hdl_mgdl",
            "LDL1":     "ldl_mgdl", "LDL":     "ldl_mgdl",
            "TOTCHOL1": "tc_mgdl",  "TCHOL":   "tc_mgdl",
            "AST1":     "asat",     "AST":     "asat",
            "GGT1":     "ggt",      "GGT":     "ggt",
            "URATE1":   "urate_mgdl", "URICACID": "urate_mgdl",
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
    for pattern in ["ID", "PID", "SUBJID", "SEQN", "MESAID", "DBGAP_ID"]:
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
        files_by_cat = {}
        for cat, fpath in file_list.items():
            full_path = os.path.join(study_dir, fpath) if not os.path.isabs(fpath) else fpath
            if os.path.exists(full_path):
                files_by_cat[cat] = full_path
            else:
                print(f"  [!] Fichier non trouvé : {fpath}")
    else:
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
# POINT D'ENTRÉE
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    DATA_PATH = "./biolincc_data/"

    # --- Exemple : Charger l'étude MESA ---
    df_mesa = load_biolincc_study("MESA", data_path=DATA_PATH)

    if df_mesa is not None:
        # Harmoniser vers le schéma BMN v3.0
        df_mesa = harmonize_to_bmn(df_mesa, "MESA")

        # Dériver les outcomes
        df_mesa = compute_outcomes(df_mesa)

        # Sélectionner les colonnes d'analyse
        config = STUDY_CONFIGS.get("MESA", {})
        df_analysis = select_analysis_columns(df_mesa, id_col=config.get("id_col", "ID"))

        print(f"\n{'=' * 70}")
        print(f"  RÉSUMÉ FINAL")
        print(f"{'=' * 70}")
        print(f"  Colonnes : {list(df_analysis.columns)}")
        print(f"  Nombre de patients : {len(df_analysis):,}")
        print(f"\n  Statistiques descriptives :")
        print(df_analysis.describe().round(2).to_string())
    else:
        print("\n  Pour utiliser ce script :")
        print(f"    1. Téléchargez les données depuis https://biolincc.nhlbi.nih.gov/")
        print(f"    2. Décompressez dans {DATA_PATH}<STUDY_NAME>/")
        print(f"    3. Relancez ce script")
        print(f"\n  Études supportées : {', '.join(STUDY_CONFIGS.keys())}")
