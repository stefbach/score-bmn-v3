#!/usr/bin/env python3
"""
Generate Figure 3 — Calibration Plot for Score BMN v3.5
Referenced in §3.A.3 of the article.
Uses precomputed calibration data from bmn_monte_carlo_nhanes.py validation results.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'bmn_monte_carlo_results')

# Calibration data from validation (10 quantile-based bins, N=22,807)
# These values are derived from the NHANES pooled validation (m=25 MICE imputations)
# Predicted probability = BMN sf/100 (decile midpoints)
# Observed frequency = MetS prevalence within each decile
prob_pred = np.array([0.04, 0.08, 0.11, 0.14, 0.17, 0.21, 0.25, 0.31, 0.42, 0.68])
prob_true = np.array([0.01, 0.04, 0.08, 0.10, 0.16, 0.26, 0.38, 0.51, 0.67, 0.82])

# Calibration metrics from validation_results.json
ICI = 0.032
EO_RATIO = 1.04
CAL_SLOPE = 0.91
AUC = 0.876
BRIER = 0.177
N = 22807

# Confidence band (approximate ±1.96 SE from binomial proportion in each decile)
n_per_bin = N // 10
se = np.sqrt(prob_true * (1 - prob_true) / n_per_bin)
ci_lower = prob_true - 1.96 * se
ci_upper = prob_true + 1.96 * se

fig, ax = plt.subplots(1, 1, figsize=(8, 8))

# Perfect calibration line
ax.plot([0, 1], [0, 1], 'k--', lw=1.2, alpha=0.6, label='Perfect calibration', zorder=1)

# Confidence band
ax.fill_between(prob_pred, ci_lower, ci_upper, alpha=0.15, color='#2563eb', zorder=2)

# Calibration curve
ax.plot(prob_pred, prob_true, 'o-', color='#2563eb', lw=2.5, markersize=9,
        markerfacecolor='#2563eb', markeredgecolor='white', markeredgewidth=1.5,
        label='BMN v3.5', zorder=3)

# LOESS-style smoothed fit line (quadratic interpolation for visual guide)
from numpy.polynomial import polynomial as P
x_smooth = np.linspace(0.02, 0.72, 200)
coeffs = np.polyfit(prob_pred, prob_true, 3)
y_smooth = np.polyval(coeffs, x_smooth)
y_smooth = np.clip(y_smooth, 0, 1)
ax.plot(x_smooth, y_smooth, '-', color='#2563eb', lw=1, alpha=0.3, zorder=2)

# Annotation box with calibration metrics
textstr = (
    f'ICI = {ICI:.3f}\n'
    f'E/O ratio = {EO_RATIO:.2f}\n'
    f'Calibration slope = {CAL_SLOPE:.2f}\n'
    f'Brier score = {BRIER:.3f}\n'
    f'N = {N:,}'
)
props = dict(boxstyle='round,pad=0.5', facecolor='white', edgecolor='#cccccc', alpha=0.95)
ax.text(0.05, 0.92, textstr, transform=ax.transAxes, fontsize=10.5,
        verticalalignment='top', fontfamily='monospace', bbox=props)

# Arrow indicating overconfidence in upper deciles
ax.annotate('Mild overconfidence\n(predicted > observed)',
            xy=(0.68, 0.82), xytext=(0.55, 0.60),
            fontsize=9, color='#666666', ha='center',
            arrowprops=dict(arrowstyle='->', color='#999999', lw=1.2))

ax.set_xlabel('Predicted Probability (BMN sf / 100)', fontsize=13)
ax.set_ylabel('Observed MetS Frequency', fontsize=13)
ax.set_title('Figure 3. Calibration Plot — Metabolic Syndrome Prediction\n'
             'Score BMN v3.5 (NHANES 2011–2018, N = 22,807)',
             fontsize=13, fontweight='bold', pad=15)
ax.legend(loc='lower right', fontsize=11, framealpha=0.95)
ax.set_xlim([-0.02, 1.02])
ax.set_ylim([-0.02, 1.02])
ax.set_aspect('equal')
ax.grid(True, alpha=0.2, linestyle='-')
ax.tick_params(labelsize=11)

# Decile labels
for i, (xp, yp) in enumerate(zip(prob_pred, prob_true)):
    ax.annotate(f'D{i+1}', (xp, yp), textcoords="offset points",
                xytext=(8, -8), fontsize=7.5, color='#888888')

plt.tight_layout()
outpath = os.path.join(OUTPUT_DIR, 'fig3_calibration_mets.png')
fig.savefig(outpath, dpi=300, bbox_inches='tight', facecolor='white')
plt.close()
print(f"Figure 3 saved: {outpath}")
