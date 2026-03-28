# BMN v3.5 — Simulation BTM/GRS (Partie B)

## Script : `bmn_btm_grs_simulation.py`

### Contexte
Ce script implémente la **Section §2.7** et la **Section §3.B** de l'article :
> Bach S, Manos T, Noel P — *Score BMN v3.5: Development and Internal Validation of a Multidimensional Metabolic Risk and GLP-1 Response Profiling Algorithm (NHANES, N=22,807)*

### ⚠️ Positionnement méthodologique IMPORTANT
Les prédictions thérapeutiques BTM/GRS **ne peuvent pas être validées** contre des outcomes observés dans le design NHANES transversal. Ce script constitue une **analyse de cohérence interne (proof-of-concept)**, pas une validation externe. Prospective validation requise.

### Design anti-circularité (§2.7)
1. Injection bruit latent 25% indépendant sur chaque simulation
2. Modificateurs basés sur valeurs brutes (pas scores GRS)
3. Coefficients modificateurs < maxima théoriques
4. Seed fixe = 42 (reproductibilité totale)
5. N = 1,000 simulations / sujet

### Outputs
| Fichier | Contenu |
|---------|---------|
| `results_btm_simulation.json` | Tables 3, 4, 5 + robustesse |
| `fig_btm_profile_distribution.png` | Distribution profils R1–CI |
| `fig_btm_tbwl_violin.png` | TBWL simulé par profil (violin) |
| `fig_btm_roc_glp1.png` | ROC GRS vs baseline vs null |
| `fig_btm_radar_axes.png` | Radar 7 axes par profil |

### Chiffres cibles (article Table 3)
| Profil | n (%) | Resp% | Super-R% | TBWL% |
|--------|-------|-------|----------|-------|
| R1-Excellent | 2.5% | 92.0% | 33.8% | 17.5% |
| R2-Good | 21.3% | 80.9% | 8.8% | 13.8% |
| R3-Partial | 49.0% | 64.0% | 0.1% | 11.3% |
| R4-Non-responder | 25.0% | 63.1% | 0.1% | 11.2% |
| CI | 2.2% | 0.0% | 0.0% | 5.4% |

### GRS AUC cibles (article Table 4)
- Repondeur (TBWL≥10%) : AUC 0.571 [0.560–0.581]
- Super-repondeur (TBWL≥20%) : AUC 0.911 (circularité résiduelle)
- Baseline LR : AUC 0.579
- Null model : AUC 0.513 [0.501–0.525]

### Usage
```bash
pip install numpy pandas scipy scikit-learn matplotlib seaborn statsmodels
python3 bmn_btm_grs_simulation.py
```

### Algorithme GRS implémenté
- **Axe 1** IR (w=0.30, favorable)
- **Axe 2** Chronicité (w=0.18, défavorable)
- **Axe 3** Inflammation (w=0.12, favorable)
- **Axe 4** Psycho-comportemental (w=0.12, défavorable)
- **Axe 5** Iatrogène (w=0.15, défavorable)
- **Axe 6** Démographie (bonus)
- **Axe 7** Beta-cell/Sécrétoire (w=0.08/0.05, bidirectionnel) — *novel v3.5*

### Cohérence avec app.js
Le calcul GRS Python dans ce script est le **miroir exact** de `public/static/app.js` v3.5 (fonction `getGLP1Profile()`). Toute modification de l'algorithme JS doit être répercutée ici.
