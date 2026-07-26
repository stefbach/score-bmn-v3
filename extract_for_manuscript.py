"""
═══════════════════════════════════════════════════════════════════════════
SCORE BMN v3.5 — EXTRACTION MANUSCRIT (Tables 3/4/5)
═══════════════════════════════════════════════════════════════════════════

Article reference: Bach S, Manos T, Noel P — Score BMN v3.5

Objectif : Lire les resultats produits par `bmn_btm_grs_simulation.py`
           (bmn_btm_simulation/results_btm_simulation.json) et les mettre
           en forme pour insertion dans le manuscrit :
             - Table 3 (profils BTM + outcomes simules), avec ecart aux
               cibles publiees dans l'article
             - Table 4 (AUC discriminative GRS, avec CI 95%)
             - Table 5 (AUC par sous-groupe clinique)
             - valeurs inline (N, deltas, robustesse)

Usage :
    # apres avoir lance la simulation :
    python bmn_btm_grs_simulation.py
    # dans un shell Python (recette manuscrit) :
    exec(open('extract_for_manuscript.py').read())
    # ou directement :
    python extract_for_manuscript.py

Sortie : impression console + fichier Markdown
         bmn_btm_simulation/manuscript_extract.md

RAPPEL METHODOLOGIQUE : les chiffres sont SIMULATION-dependants et
data-pull-dependants (disponibilite NHANES). Analyse de coherence interne,
PAS une validation externe.
"""

import json
import math
import os

# ── Localisation du JSON de resultats ───────────────────────────────────
OUTPUT_DIR = './bmn_btm_simulation'
RESULTS_JSON = os.path.join(OUTPUT_DIR, 'results_btm_simulation.json')

if not os.path.exists(RESULTS_JSON):
    raise FileNotFoundError(
        f"Resultats introuvables: {RESULTS_JSON}\n"
        "Lancez d'abord la simulation : python bmn_btm_grs_simulation.py"
    )

# json.load accepte NaN par defaut (super-repondeur peut etre NaN)
with open(RESULTS_JSON, encoding='utf-8') as f:
    R = json.load(f)


def fmt(x, nd=3):
    """Formatte un nombre, gere NaN/None proprement pour le manuscrit."""
    if x is None:
        return "—"
    if isinstance(x, float) and math.isnan(x):
        return "n.d."
    return f"{x:.{nd}f}"


def ci(low, high, nd=3):
    if low is None or high is None or (isinstance(low, float) and math.isnan(low)):
        return "—"
    return f"[{fmt(low, nd)}–{fmt(high, nd)}]"


# ── Cibles publiees dans l'article (header bmn_btm_grs_simulation.py) ────
TARGETS = {
    'R1': {'pct': 2.5,  'resp': 92.0, 'super': 33.8, 'tbwl': 17.5},
    'R2': {'pct': 21.3, 'resp': 80.9, 'super': 8.8,  'tbwl': 13.8},
    'R3': {'pct': 49.0, 'resp': 64.0, 'super': 0.1,  'tbwl': 11.3},
    'R4': {'pct': 25.0, 'resp': 63.1, 'super': 0.1,  'tbwl': 11.2},
    'CI': {'pct': 2.2,  'resp': 0.0,  'super': 0.0,  'tbwl': 5.4},
}

meta = R['metadata']
t3 = R['table3_profiles']
t4 = R['table4_discrimination']
t5 = R['table5_subgroups']
axes = R.get('axis_sensitivity', {})
robust = R.get('mc_robustness', {})

lines = []


def out(s=""):
    print(s)
    lines.append(s)


# ═══════════════════════════════════════════════════════════════════════
out("=" * 74)
out("  EXTRACTION MANUSCRIT — SCORE BMN v3.5 (Tables 3/4/5)")
out("  " + meta.get('article', ''))
out("=" * 74)
out()
out(f"  Design         : {meta.get('design', '')}")
out(f"  N NHANES total : {meta.get('n_subjects_total_nhanes', 0):,}")
out(f"  N GLP-1 elig.  : {meta.get('n_subjects_glp1_eligible', 0):,}")
out(f"  Sim / sujet    : {meta.get('n_sim_per_subject', 0):,}")
out()
out("  ⚠ " + meta.get('warning', ''))
out()

# ── TABLE 3 ─────────────────────────────────────────────────────────────
out("-" * 74)
out("  TABLE 3 — Profils BTM et outcomes simules (observe vs cible article)")
out("-" * 74)
out(f"  {'Profil':<7} {'n':>6} {'%':>6} {'Resp%':>7} {'SupR%':>7} {'TBWL%':>7}   {'(cible %/Resp/SupR/TBWL)':<28}")
for r in t3:
    p = r['Profile']
    tgt = TARGETS.get(p)
    tgt_str = ""
    if tgt:
        tgt_str = f"({tgt['pct']}/{tgt['resp']}/{tgt['super']}/{tgt['tbwl']})"
    out(f"  {p:<7} {r['n']:>6,} {r['pct']:>6.1f} {r['resp_rate']:>7.1f} "
        f"{r['super_resp_rate']:>7.1f} {r['mean_tbwl']:>7.1f}   {tgt_str:<28}")
out()
out("  Note: ecarts aux cibles = data-pull NHANES (disponibilite tables INS/")
out("  insuline variable) + nature simulation-dependante. Cf. §2.7 / §4.")
out()

# ── TABLE 4 ─────────────────────────────────────────────────────────────
out("-" * 74)
out("  TABLE 4 — Performance discriminative GRS (design anti-circularite)")
out("-" * 74)
resp = t4['responder_TBWL_10']
sup = t4['super_responder_TBWL_20']
lr = t4['baseline_LR']
nul = t4['null_model']
out(f"  {'Cible':<32} {'AUC':>7}  {'CI 95%':>17}")
out(f"  {'Repondeur (TBWL >= 10%)':<32} {fmt(resp['auc']):>7}  {ci(resp.get('ci_low'), resp.get('ci_high')):>17}")
out(f"  {'Super-repondeur (TBWL >= 20%)':<32} {fmt(sup['auc']):>7}  {ci(sup.get('ci_low'), sup.get('ci_high')):>17}")
out(f"  {'Baseline LR (BMI+age+sex+HOMA)':<32} {fmt(lr['auc']):>7}  {'N/A':>17}")
out(f"  {'Modele nul (permute)':<32} {fmt(nul['auc']):>7}  {ci(nul.get('ci_low'), nul.get('ci_high')):>17}")
if isinstance(sup['auc'], float) and math.isnan(sup['auc']):
    out()
    out("  * Super-repondeur = n.d. : trop peu de sujets a TBWL moyen >= 20%")
    out("    dans ce data-pull pour un bootstrap valide (classes degenerees).")
out()

# ── TABLE 5 ─────────────────────────────────────────────────────────────
out("-" * 74)
out("  TABLE 5 — AUC discriminative par sous-groupe clinique")
out("-" * 74)
out(f"  {'Sous-groupe':<18} {'n':>7} {'AUC':>7}  {'CI 95%':>17}  {'Resp%':>6}")
for s in t5:
    out(f"  {s['subgroup']:<18} {s['n']:>7,} {fmt(s['auc']):>7}  "
        f"{ci(s.get('ci_low'), s.get('ci_high')):>17}  {s['resp_rate']:>6.1f}")
out()

# ── Sensibilite des axes + robustesse ───────────────────────────────────
if axes:
    out("-" * 74)
    out("  Sensibilite — AUC individuelle par axe GRS")
    out("-" * 74)
    for k, v in axes.items():
        out(f"  {k:<16} AUC = {fmt(v)}")
    out()

if robust:
    out("-" * 74)
    out("  Robustesse Monte Carlo")
    out("-" * 74)
    out(f"  Delta AUC (perturbation +/-50% poids) : {fmt(robust.get('weight_perturbation_50pct_delta_auc'))}")
    out(f"  Robuste (< 0.10)                      : {robust.get('robust')}")
    out()

# ── Valeurs inline pretes a citer ───────────────────────────────────────
out("-" * 74)
out("  VALEURS INLINE (pretes a citer dans le texte)")
out("-" * 74)
out(f"  N GLP-1 eligibles ............ {meta.get('n_subjects_glp1_eligible', 0):,}")
out(f"  AUC repondeur (GRS) .......... {fmt(resp['auc'])} {ci(resp.get('ci_low'), resp.get('ci_high'))}")
out(f"  AUC baseline LR .............. {fmt(lr['auc'])}")
out(f"  AUC modele nul ............... {fmt(nul['auc'])} {ci(nul.get('ci_low'), nul.get('ci_high'))}")
out(f"  Delta AUC robustesse ......... {fmt(robust.get('weight_perturbation_50pct_delta_auc'))}")
out()
out("=" * 74)

# ── Ecriture du Markdown ────────────────────────────────────────────────
md_path = os.path.join(OUTPUT_DIR, 'manuscript_extract.md')
with open(md_path, 'w', encoding='utf-8') as f:
    f.write("# Score BMN v3.5 — Extraction manuscrit\n\n")
    f.write("```\n")
    f.write("\n".join(lines))
    f.write("\n```\n")
print(f"\n  ✓ Extraction ecrite : {md_path}")
