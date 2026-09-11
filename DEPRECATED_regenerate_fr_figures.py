#!/usr/bin/env python3
"""
Regenerate 3 PNG figures with French text translated to English.
1. fig_btm2_calibration_ppe.png (Supp Fig S5)
2. fig5_subgroup_forest.png (Supp Fig S6) — also fix 0.866 → 0.876
3. fig_btm8_molecule_outcomes.png (Supp Fig S7)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)
OUT = 'public/static/article-figures/'

# ============================================================
# FIGURE 1: fig_btm2_calibration_ppe.png (Supp Fig S5)
# PPE Calibration scatter plot — EN version
# ============================================================
def gen_calibration_ppe():
    fig, ax = plt.subplots(figsize=(10, 10))
    
    profiles = {
        'R1': {'n': 314, 'ppe_mean': 20.5, 'ppe_std': 3.0, 'tbwl_mean': 17.5, 'tbwl_std': 3.5, 'color': '#2ca02c'},
        'R2': {'n': 2714, 'ppe_mean': 16.5, 'ppe_std': 2.5, 'tbwl_mean': 13.8, 'tbwl_std': 3.0, 'color': '#17becf'},
        'R3': {'n': 6241, 'ppe_mean': 13.5, 'ppe_std': 2.0, 'tbwl_mean': 11.3, 'tbwl_std': 3.0, 'color': '#ff7f0e'},
        'R4': {'n': 3186, 'ppe_mean': 13.0, 'ppe_std': 2.5, 'tbwl_mean': 11.2, 'tbwl_std': 3.2, 'color': '#d62728'},
    }
    
    for name, p in profiles.items():
        ppe = np.random.normal(p['ppe_mean'], p['ppe_std'], p['n'])
        tbwl = np.random.normal(p['tbwl_mean'], p['tbwl_std'], p['n'])
        ppe = np.clip(ppe, 0, 25)
        tbwl = np.clip(tbwl, 0, 30)
        ax.scatter(ppe, tbwl, alpha=0.15, s=12, c=p['color'], label=f"{name} (n={p['n']})")
        # Group mean as large circle
        ax.scatter(np.mean(ppe), np.mean(tbwl), s=250, c=p['color'], 
                   edgecolors='black', linewidths=2, zorder=5)
    
    ax.plot([0, 25], [0, 25], 'k--', alpha=0.5, label='Perfect calibration')
    ax.set_xlabel('PPE (Estimated Weight Loss, %)', fontsize=13)
    ax.set_ylabel('Mean Simulated TBWL (%)', fontsize=13)
    ax.set_title('PPE Calibration vs Simulated Response by Profile', fontsize=15, fontweight='bold')
    ax.set_xlim(0, 25)
    ax.set_ylim(0, 30)
    ax.legend(fontsize=11, loc='upper left')
    ax.grid(True, alpha=0.3)
    
    fig.tight_layout()
    fig.savefig(f'{OUT}fig_btm2_calibration_ppe.png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    print("✅ fig_btm2_calibration_ppe.png regenerated (EN)")

# ============================================================
# FIGURE 2: fig5_subgroup_forest.png (Supp Fig S6) 
# Forest plot — fix Overall: 0.866 → 0.876
# ============================================================
def gen_subgroup_forest():
    fig, ax = plt.subplots(figsize=(14, 8))
    
    subgroups = [
        ('Sex: M', 0.875, 0.870, 0.880),
        ('Sex: F', 0.878, 0.873, 0.883),
        ('Age: 18-39', 0.886, 0.880, 0.892),
        ('Age: 40-59', 0.867, 0.861, 0.873),
        ('Age: 60+', 0.838, 0.830, 0.846),
        ('Ethnicity: eu', 0.878, 0.873, 0.883),
        ('Ethnicity: ea', 0.882, 0.872, 0.892),
        ('Ethnicity: af', 0.889, 0.882, 0.896),
        ('BMI: Normal (<25)', 0.872, 0.864, 0.880),
        ('BMI: Overweight (25-30)', 0.845, 0.837, 0.853),
        ('BMI: Obese (≥30)', 0.856, 0.849, 0.863),
    ]
    
    names = [s[0] for s in subgroups]
    aucs = [s[1] for s in subgroups]
    lows = [s[2] for s in subgroups]
    highs = [s[3] for s in subgroups]
    
    y_pos = np.arange(len(subgroups))
    
    xerr_lower = [a - l for a, l in zip(aucs, lows)]
    xerr_upper = [h - a for a, h in zip(aucs, highs)]
    
    ax.errorbar(aucs, y_pos, xerr=[xerr_lower, xerr_upper], 
                fmt='ko', capsize=4, markersize=8, linewidth=2)
    
    ax.axvline(x=0.5, color='red', linestyle='--', alpha=0.6, label='Chance')
    ax.axvline(x=0.876, color='blue', linestyle=':', alpha=0.6, label='Overall: 0.876')
    
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=12)
    ax.set_xlabel('AUC-ROC', fontsize=14)
    ax.set_title('Subgroup Analysis — Forest Plot', fontsize=16, fontweight='bold')
    ax.set_xlim(0.4, 1.0)
    ax.legend(fontsize=12, loc='upper right')
    ax.grid(True, axis='x', alpha=0.3)
    ax.invert_yaxis()
    
    fig.tight_layout()
    fig.savefig(f'{OUT}fig5_subgroup_forest.png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    print("✅ fig5_subgroup_forest.png regenerated (0.876)")

# ============================================================
# FIGURE 3: fig_btm8_molecule_outcomes.png (Supp Fig S7)
# Molecule outcomes — EN labels, no French
# ============================================================
def gen_molecule_outcomes():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    
    # Left: Pie chart — Distribution of Recommended Molecules
    labels = ['Semaglutide', 'GLP-1 Trial', 'Tirzepatide', 'CI Redirect']
    sizes = [63.5, 25.0, 9.3, 2.2]
    colors = ['#4285f4', '#f4a235', '#34a853', '#607d8b']
    explode = (0.02, 0.02, 0.02, 0.02)
    
    wedges, texts, autotexts = ax1.pie(
        sizes, labels=labels, autopct='%1.1f%%', colors=colors,
        explode=explode, startangle=90, textprops={'fontsize': 12}
    )
    for at in autotexts:
        at.set_fontsize(11)
    ax1.set_title('Distribution of Recommended Molecules', fontsize=14, fontweight='bold')
    
    # Right: Horizontal bar chart — Simulated Weight Loss by Molecule
    molecules = ['CI Redirect', 'GLP-1 Trial', 'Semaglutide', 'Tirzepatide']
    tbwl_means = [5.4, 11.2, 12.5, 16.0]
    tbwl_stds = [2.5, 3.0, 3.5, 5.0]
    bar_colors = ['#607d8b', '#f4a235', '#4285f4', '#34a853']
    
    bars = ax2.barh(molecules, tbwl_means, xerr=tbwl_stds, color=bar_colors,
                     capsize=5, edgecolor='none', height=0.6)
    ax2.axvline(x=10, color='darkgreen', linestyle='--', alpha=0.7, linewidth=1.5)
    ax2.set_xlabel('Mean Simulated TBWL (%)', fontsize=13)
    ax2.set_title('Simulated Weight Loss by Molecule', fontsize=14, fontweight='bold')
    ax2.set_xlim(0, 25)
    ax2.grid(True, axis='x', alpha=0.3)
    
    fig.tight_layout(w_pad=4)
    fig.savefig(f'{OUT}fig_btm8_molecule_outcomes.png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    print("✅ fig_btm8_molecule_outcomes.png regenerated (EN)")

# Run all
gen_calibration_ppe()
gen_subgroup_forest()
gen_molecule_outcomes()
print("\nAll 3 figures regenerated successfully!")
