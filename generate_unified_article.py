"""
Generate a self-contained HTML document combining the BMN v3.5 article
with all figures embedded as base64 images.

Output: bmn_monte_carlo_results/BMN_v35_Article_Unified.html
"""

import base64
import os
import re
import markdown

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bmn_monte_carlo_results")
ARTICLE_PATH = os.path.join(RESULTS_DIR, "ARTICLE_BMN_BTM_v35_Revised.md")
OUTPUT_PATH = os.path.join(RESULTS_DIR, "BMN_v35_Article_Unified.html")

# ── Figure mapping: Article figure number → actual file ──
# Main text figures (appear inline in the article body)
MAIN_FIGURES = {
    "Figure 1": {
        "file": None,  # Architecture schematic - generated as SVG below
        "caption": "Schematic overview of the Score BMN v3.5 algorithm architecture. "
                   "CLEO declarative score (sD) and biological normalization (bioNorm) combine "
                   "into the final metabolic risk score (sf). The CTI and 7-axis GRS feed into "
                   "the BTM for therapeutic strategy selection.",
        "insert_after": "A schematic overview is presented in **Figure 1**.",
    },
    "Figure 2": {
        "file": "fig1_roc_curves.png",
        "caption": "ROC curves for MetS and Obesity prediction. BMN v3.5 achieves AUC = 0.876 "
                   "for MetS and 0.778 for Obesity (ethnic-adjusted).",
        "insert_after": "| Obesity (ethnic-adjusted) | **0.778** | 0.776–0.780 | 0.215 |",
    },
    "Figure 3": {
        "file": "fig2_calibration.png",
        "caption": "Calibration plot: observed vs. predicted MetS probability by decile. "
                   "The dashed line represents perfect calibration.",
        "insert_after": "These metrics confirm that the HL significance is driven by statistical power rather than clinically meaningful miscalibration.",
    },
    "Figure 4": {
        "file": "fig_btm3_profile_distribution.png",
        "caption": "GLP-1 response profile distribution among 12,733 eligible subjects (BMI ≥ 27). "
                   "R1-Excellent through CI, showing the distribution of therapeutic profiles.",
        "insert_after": "| CI | 278 (2.2%) | 0.0% | 0.0% | 5.4% | Redirect |",
    },
    "Figure 5": {
        "file": "fig_btm5_tbwl_violin.png",
        "caption": "TBWL distribution by response profile (violin plots). Horizontal dashed lines "
                   "indicate responder (10% TBWL) and super-responder (20% TBWL) thresholds.",
        "insert_after": "supporting the \"Excellent\" classification.",
    },
    "Figure 6": {
        "file": "fig_btm4_radar_axes.png",
        "caption": "Radar chart of 7 GRS axes by response profile. R1-Excellent shows high insulin "
                   "resistance signal and low chronicity; R4-Non-responder shows the inverse pattern.",
        "insert_after": "preventing tautological validation.",
    },
    "Figure 7": {
        "file": "fig_btm7_subgroup_forest.png",
        "caption": "Subgroup forest plot: GRS AUC for simulated responder prediction by sex, age, "
                   "BMI, ethnicity, T2DM, and MetS status. The GRS discriminates better in "
                   "metabolically deranged subgroups (T2DM: 0.681; MetS: 0.635).",
        "insert_after": "*Complete subgroup table in Supplementary Table S2.*",
    },
    "Figure 8": {
        "file": "fig_btm6_strategy_bmi.png",
        "caption": "Therapeutic strategy distribution by BMI category. Higher BMI shifts recommendations "
                   "from GLP-1 monotherapy toward combined or surgical approaches.",
        "insert_after": "## 5. CONCLUSION",
        "insert_before": True,
    },
}

# Supplementary figures
SUPP_FIGURES = {
    "S1": {"file": "fig3_distributions.png", "caption": "BMN score distribution by MetS status and risk classification."},
    "S2": {"file": "fig6_biomarker_heatmap.png", "caption": "Biomarker correlation heatmap (18 biomarkers + sf + bioNorm)."},
    "S3": {"file": "fig8_mc_distributions.png", "caption": "Monte Carlo modeled indicator distributions for 11 imputed variables."},
    "S4": {"file": "fig7_model_comparison.png", "caption": "Comparative discrimination for MetS prediction: BMN v3.5 vs. ML models (Logistic Regression, Random Forest, Gradient Boosting). The BMN v3.5 (AUC = 0.876) achieves lower discrimination than ensemble ML models (AUC ~0.95) but operates under fundamentally different constraints."},
    "S5": {"file": "fig_btm2_calibration_ppe.png", "caption": "PPE calibration: predicted vs. simulated TBWL, by response profile. Scatter plot with group means (large circles) for R1 (n=314), R2 (n=2714), R3 (n=6,241), R4 (n=3,186). Dashed line indicates perfect calibration."},
    "S6": {"file": "fig5_subgroup_forest.png", "caption": "Subgroup forest plot for BMN MetS prediction AUC by demographic and clinical subgroups."},
    "S7": {"file": "fig_btm8_molecule_outcomes.png", "caption": "Molecule-specific outcomes: simulated TBWL distribution by recommended molecule."},
    "S8": {"file": "fig_btm1_roc_glp1.png", "caption": "BTM ROC curves: GRS/GRI discrimination for simulated GLP-1 responder and super-responder prediction."},
    "S9": {"file": "fig4_mc_sensitivity.png", "caption": "Monte Carlo sensitivity analysis: tornado chart of variable importance for MetS prediction."},
}


def img_to_base64(filepath):
    """Convert an image file to a base64 data URI."""
    if not os.path.exists(filepath):
        return None
    with open(filepath, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    ext = os.path.splitext(filepath)[1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml"}.get(ext.lstrip("."), "image/png")
    return f"data:{mime};base64,{data}"


def generate_architecture_svg():
    """Generate an SVG schematic of the BMN v3.5 architecture."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" style="max-width:100%;height:auto;font-family:'Segoe UI',Arial,sans-serif;">
  <defs>
    <linearGradient id="gCLEO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient>
    <linearGradient id="gBio" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient>
    <linearGradient id="gSF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
    <linearGradient id="gCTI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
    <linearGradient id="gGRS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
    <linearGradient id="gBTM" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0891b2"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter>
  </defs>
  <!-- Title -->
  <text x="450" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">Score BMN v3.5 — Algorithm Architecture</text>
  <!-- CLEO Box -->
  <rect x="30" y="55" width="260" height="200" rx="12" fill="url(#gCLEO)" filter="url(#shadow)"/>
  <text x="160" y="82" text-anchor="middle" font-size="15" font-weight="bold" fill="white">CLEO Framework (sD: 0–100)</text>
  <rect x="45" y="92" width="230" height="28" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="160" y="111" text-anchor="middle" font-size="12" fill="white">C — Clinical (0–50)</text>
  <rect x="45" y="125" width="230" height="28" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="160" y="144" text-anchor="middle" font-size="12" fill="white">L — Lifestyle (0–10)</text>
  <rect x="45" y="158" width="230" height="28" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="160" y="177" text-anchor="middle" font-size="12" fill="white">E — Exposome (0–45)</text>
  <rect x="45" y="191" width="230" height="28" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="160" y="210" text-anchor="middle" font-size="12" fill="white">O — Occupational (0–10)</text>
  <text x="160" y="245" text-anchor="middle" font-size="11" fill="white" font-style="italic">Age, BMI, comorbidities, tobacco, sleep...</text>
  <!-- BioNorm Box -->
  <rect x="320" y="55" width="260" height="200" rx="12" fill="url(#gBio)" filter="url(#shadow)"/>
  <text x="450" y="82" text-anchor="middle" font-size="15" font-weight="bold" fill="white">bioNorm (0–100)</text>
  <text x="450" y="108" text-anchor="middle" font-size="12" fill="white">18 biomarkers × adaptive z-score</text>
  <rect x="335" y="120" width="230" height="125" rx="5" fill="rgba(255,255,255,0.15)"/>
  <text x="450" y="140" text-anchor="middle" font-size="11" fill="white">HOMA-IR • HbA1c • hs-CRP • TG • HDL</text>
  <text x="450" y="158" text-anchor="middle" font-size="11" fill="white">LDL • Urate • ApoB • TSH • GGT</text>
  <text x="450" y="176" text-anchor="middle" font-size="11" fill="white">Adiponectin • Leptin • TG/HDL</text>
  <text x="450" y="198" text-anchor="middle" font-size="11" font-weight="bold" fill="#fef08a">v3.5: + C-peptide + FGF21 + Glucagon</text>
  <text x="450" y="218" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">(Axis 7 — Beta-cell/Secretory)</text>
  <!-- Arrows to SF -->
  <line x1="160" y1="260" x2="370" y2="305" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#arrowhead)"/>
  <line x1="450" y1="260" x2="440" y2="305" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#arrowhead)"/>
  <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8"/></marker></defs>
  <!-- SF Box -->
  <rect x="310" y="305" width="180" height="55" rx="10" fill="url(#gSF)" filter="url(#shadow)"/>
  <text x="400" y="330" text-anchor="middle" font-size="14" font-weight="bold" fill="white">Final Score (sf)</text>
  <text x="400" y="350" text-anchor="middle" font-size="12" fill="white">0–100 | AUC = 0.876</text>
  <!-- CTI Box -->
  <rect x="620" y="55" width="260" height="120" rx="12" fill="url(#gCTI)" filter="url(#shadow)"/>
  <text x="750" y="82" text-anchor="middle" font-size="15" font-weight="bold" fill="white">CTI (0–100)</text>
  <text x="750" y="105" text-anchor="middle" font-size="11" fill="white">Chronicity Trajectory Index</text>
  <text x="750" y="125" text-anchor="middle" font-size="11" fill="white">7 factors: duration, yo-yo, age onset,</text>
  <text x="750" y="143" text-anchor="middle" font-size="11" fill="white">comorbidity burden, biomarker severity</text>
  <text x="750" y="163" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)" font-style="italic">Metabolic entrenchment quantification</text>
  <!-- GRS Box -->
  <rect x="620" y="195" width="260" height="150" rx="12" fill="url(#gGRS)" filter="url(#shadow)"/>
  <text x="750" y="222" text-anchor="middle" font-size="15" font-weight="bold" fill="white">GRS (−3 to +6)</text>
  <text x="750" y="242" text-anchor="middle" font-size="11" fill="white">7-Axis GLP-1 Response Score</text>
  <rect x="635" y="252" width="230" height="80" rx="5" fill="rgba(255,255,255,0.15)"/>
  <text x="750" y="270" text-anchor="middle" font-size="10" fill="white">1. IR (0.30) | 2. Chronicity (0.18)</text>
  <text x="750" y="286" text-anchor="middle" font-size="10" fill="white">3. Inflammation (0.12) | 4. Psycho (0.12)</text>
  <text x="750" y="302" text-anchor="middle" font-size="10" fill="white">5. Iatrogenic (0.15) | 6. Demographics</text>
  <text x="750" y="318" text-anchor="middle" font-size="10" font-weight="bold" fill="#fef08a">7. Beta-cell/Secretory (0.08/0.05)</text>
  <!-- Arrows to BTM -->
  <line x1="400" y1="360" x2="400" y2="405" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#arrowhead)"/>
  <line x1="750" y1="175" x2="600" y2="420" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4" marker-end="url(#arrowhead)"/>
  <line x1="750" y1="345" x2="600" y2="435" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#arrowhead)"/>
  <!-- BTM Box -->
  <rect x="200" y="405" width="500" height="100" rx="12" fill="url(#gBTM)" filter="url(#shadow)"/>
  <text x="450" y="432" text-anchor="middle" font-size="16" font-weight="bold" fill="white">Bariatric-Therapeutic Module (BTM)</text>
  <rect x="215" y="442" width="115" height="25" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="272" y="459" text-anchor="middle" font-size="11" fill="white">R1 Excellent</text>
  <rect x="340" y="442" width="80" height="25" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="380" y="459" text-anchor="middle" font-size="11" fill="white">R2 Good</text>
  <rect x="430" y="442" width="85" height="25" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="472" y="459" text-anchor="middle" font-size="11" fill="white">R3 Partial</text>
  <rect x="525" y="442" width="80" height="25" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="565" y="459" text-anchor="middle" font-size="11" fill="white">R4 Non-R</text>
  <rect x="615" y="442" width="75" height="25" rx="5" fill="rgba(255,255,255,0.2)"/>
  <text x="652" y="459" text-anchor="middle" font-size="11" fill="white">R5 / CI</text>
  <text x="450" y="492" text-anchor="middle" font-size="12" fill="white">→ Molecule Selection • PPE • Strategy (BT-1 to BT-6)</text>
</svg>"""


def build_figure_html(fig_id, data_uri, caption, is_supp=False):
    """Build an HTML figure block."""
    prefix = "Supplementary Figure" if is_supp else "Figure"
    border_color = "#94a3b8" if is_supp else "#3b82f6"
    bg = "#f8fafc" if is_supp else "#ffffff"
    return f"""
<figure style="margin:2em auto;max-width:90%;text-align:center;page-break-inside:avoid;
               border:1px solid {border_color};border-radius:8px;padding:16px;background:{bg};">
  <img src="{data_uri}" alt="{prefix} {fig_id}" style="max-width:100%;height:auto;border-radius:4px;"/>
  <figcaption style="margin-top:12px;font-size:0.9em;color:#374151;line-height:1.5;text-align:left;padding:0 8px;">
    <strong>{prefix} {fig_id}.</strong> {caption}
  </figcaption>
</figure>
"""


def convert_md_to_html(md_text):
    """Convert markdown to HTML with extensions."""
    extensions = ['tables', 'fenced_code', 'footnotes', 'toc', 'nl2br']
    html = markdown.markdown(md_text, extensions=extensions)
    # Fix superscript references: ^1,2^ → <sup>1,2</sup>
    html = re.sub(r'\^([0-9,–\-]+)\^', r'<sup>\1</sup>', html)
    return html


def insert_figures_into_md(md_text):
    """Insert figure HTML blocks at appropriate positions in the markdown."""
    lines = md_text.split('\n')
    result = []

    # Track which figures have been inserted
    inserted = set()

    for line in lines:
        # Check if we need to insert a figure BEFORE this line
        for fig_id, info in MAIN_FIGURES.items():
            if info.get("insert_before") and info["insert_after"] in line and fig_id not in inserted:
                # Insert figure before this line
                if info["file"] is None:
                    # Architecture SVG
                    svg = generate_architecture_svg()
                    fig_html = f"""
<figure style="margin:2em auto;max-width:90%;text-align:center;page-break-inside:avoid;
               border:1px solid #3b82f6;border-radius:8px;padding:16px;background:#ffffff;">
  {svg}
  <figcaption style="margin-top:12px;font-size:0.9em;color:#374151;line-height:1.5;text-align:left;padding:0 8px;">
    <strong>{fig_id}.</strong> {info['caption']}
  </figcaption>
</figure>
"""
                else:
                    filepath = os.path.join(RESULTS_DIR, info["file"])
                    data_uri = img_to_base64(filepath)
                    if data_uri:
                        fig_html = build_figure_html(fig_id.split()[-1], data_uri, info["caption"])
                    else:
                        fig_html = f"<!-- {fig_id}: file not found: {info['file']} -->"
                result.append(f"\n{fig_html}\n")
                inserted.add(fig_id)

        result.append(line)

        # Check if we need to insert a figure AFTER this line
        for fig_id, info in MAIN_FIGURES.items():
            if not info.get("insert_before") and info["insert_after"] in line and fig_id not in inserted:
                if info["file"] is None:
                    svg = generate_architecture_svg()
                    fig_html = f"""
<figure style="margin:2em auto;max-width:90%;text-align:center;page-break-inside:avoid;
               border:1px solid #3b82f6;border-radius:8px;padding:16px;background:#ffffff;">
  {svg}
  <figcaption style="margin-top:12px;font-size:0.9em;color:#374151;line-height:1.5;text-align:left;padding:0 8px;">
    <strong>{fig_id}.</strong> {info['caption']}
  </figcaption>
</figure>
"""
                else:
                    filepath = os.path.join(RESULTS_DIR, info["file"])
                    data_uri = img_to_base64(filepath)
                    if data_uri:
                        fig_html = build_figure_html(fig_id.split()[-1], data_uri, info["caption"])
                    else:
                        fig_html = f"<!-- {fig_id}: file not found: {info['file']} -->"
                result.append(f"\n{fig_html}\n")
                inserted.add(fig_id)

    return '\n'.join(result)


def generate_supplementary_section():
    """Generate the supplementary figures section as HTML."""
    html = """
<div style="page-break-before:always;"></div>
<h2 style="color:#1e293b;border-bottom:3px solid #3b82f6;padding-bottom:8px;">SUPPLEMENTARY FIGURES</h2>
"""
    for sid, info in SUPP_FIGURES.items():
        filepath = os.path.join(RESULTS_DIR, info["file"])
        data_uri = img_to_base64(filepath)
        if data_uri:
            html += build_figure_html(sid, data_uri, info["caption"], is_supp=True)
        else:
            html += f"<p><em>Supplementary Figure {sid}: file not found ({info['file']})</em></p>\n"
    return html


def generate_html():
    """Generate the complete self-contained HTML document."""
    print("=" * 70)
    print("  Generating unified HTML article with embedded figures...")
    print("=" * 70)

    # Read markdown
    with open(ARTICLE_PATH, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Insert figures into markdown
    print("  Inserting main figures...")
    md_with_figures = insert_figures_into_md(md_text)

    # Convert to HTML
    print("  Converting markdown to HTML...")
    try:
        article_html = convert_md_to_html(md_with_figures)
    except Exception:
        # Fallback: basic conversion without markdown library
        article_html = basic_md_to_html(md_with_figures)

    # Generate supplementary
    print("  Generating supplementary figures section...")
    supp_html = generate_supplementary_section()

    # Wrap in complete HTML document
    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Score BMN v3.5 — Unified Article with Figures</title>
<style>
  @page {{
    size: A4;
    margin: 2cm;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    font-family: 'Georgia', 'Times New Roman', serif;
    max-width: 900px;
    margin: 0 auto;
    padding: 20px 40px;
    color: #1e293b;
    line-height: 1.7;
    font-size: 11pt;
    background: #fff;
  }}
  h1 {{
    font-size: 1.6em;
    color: #0f172a;
    line-height: 1.3;
    border-bottom: 3px solid #3b82f6;
    padding-bottom: 12px;
    margin-top: 0;
  }}
  h2 {{
    font-size: 1.3em;
    color: #1e293b;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 2em;
    page-break-after: avoid;
  }}
  h3 {{
    font-size: 1.1em;
    color: #334155;
    margin-top: 1.5em;
    page-break-after: avoid;
  }}
  h4 {{
    font-size: 1em;
    color: #475569;
    margin-top: 1.2em;
    page-break-after: avoid;
  }}
  p {{
    margin: 0.8em 0;
    text-align: justify;
  }}
  table {{
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 0.9em;
    page-break-inside: avoid;
  }}
  th, td {{
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    text-align: left;
  }}
  th {{
    background: #f1f5f9;
    font-weight: 600;
    color: #1e293b;
  }}
  tr:nth-child(even) {{
    background: #f8fafc;
  }}
  blockquote {{
    border-left: 4px solid #3b82f6;
    background: #eff6ff;
    padding: 16px 20px;
    margin: 1.5em 0;
    border-radius: 0 8px 8px 0;
    page-break-inside: avoid;
  }}
  blockquote p {{
    margin: 0.4em 0;
  }}
  sup {{
    font-size: 0.75em;
    line-height: 0;
  }}
  strong {{
    color: #0f172a;
  }}
  em {{
    color: #475569;
  }}
  hr {{
    border: none;
    border-top: 2px solid #e2e8f0;
    margin: 2em 0;
  }}
  code {{
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }}
  ul, ol {{
    padding-left: 1.5em;
  }}
  li {{
    margin: 0.3em 0;
  }}
  figure {{
    page-break-inside: avoid;
  }}
  figcaption {{
    font-family: 'Segoe UI', Arial, sans-serif;
  }}
  .meta {{
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 0.9em;
    color: #64748b;
    margin-bottom: 2em;
  }}
  .meta strong {{
    color: #334155;
  }}
  @media print {{
    body {{
      padding: 0;
      font-size: 10pt;
    }}
    figure {{
      page-break-inside: avoid;
      break-inside: avoid;
    }}
    h2, h3, h4 {{
      page-break-after: avoid;
    }}
    table {{
      page-break-inside: avoid;
    }}
  }}
</style>
</head>
<body>
{article_html}

{supp_html}

<hr>
<p style="text-align:center;color:#94a3b8;font-size:0.85em;margin-top:3em;">
  Generated automatically from ARTICLE_BMN_BTM_v35_Revised.md<br>
  Score BMN v3.5 &mdash; Bach, Manos, Noel &mdash; March 2026
</p>
</body>
</html>"""

    # Write output
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(html_doc)

    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"\n  Output: {OUTPUT_PATH}")
    print(f"  Size: {size_mb:.1f} MB")
    print(f"  Figures embedded: {len(MAIN_FIGURES)} main + {len(SUPP_FIGURES)} supplementary")
    print("  Done!")


def basic_md_to_html(md_text):
    """Fallback markdown to HTML converter (no dependencies)."""
    lines = md_text.split('\n')
    html = []
    in_table = False
    in_blockquote = False
    in_list = False

    for line in lines:
        stripped = line.strip()

        # Pass through raw HTML (figure blocks)
        if stripped.startswith('<figure') or stripped.startswith('</figure') or stripped.startswith('<img') or stripped.startswith('<figcaption') or stripped.startswith('</figcaption') or stripped.startswith('<svg') or stripped.startswith('</svg') or stripped.startswith('<!--'):
            html.append(line)
            continue
        if '<figure' in stripped or '</figure>' in stripped or '<svg' in stripped:
            html.append(line)
            continue

        # Headers
        if stripped.startswith('# '):
            html.append(f'<h1>{process_inline(stripped[2:])}</h1>')
            continue
        if stripped.startswith('## '):
            html.append(f'<h2>{process_inline(stripped[3:])}</h2>')
            continue
        if stripped.startswith('### '):
            html.append(f'<h3>{process_inline(stripped[4:])}</h3>')
            continue
        if stripped.startswith('#### '):
            html.append(f'<h4>{process_inline(stripped[5:])}</h4>')
            continue

        # Horizontal rule
        if stripped == '---' or stripped == '***':
            if in_table:
                in_table = False
            html.append('<hr>')
            continue

        # Blockquote
        if stripped.startswith('> '):
            if not in_blockquote:
                html.append('<blockquote>')
                in_blockquote = True
            content = stripped[2:]
            if content.startswith('> '):
                content = content[2:]
            html.append(f'<p>{process_inline(content)}</p>')
            continue
        elif in_blockquote and stripped == '>':
            html.append('<br>')
            continue
        elif in_blockquote and not stripped.startswith('>'):
            html.append('</blockquote>')
            in_blockquote = False

        # Table
        if '|' in stripped and stripped.startswith('|'):
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            if all(set(c) <= {'-', ':', ' '} for c in cells):
                continue  # Skip separator row
            if not in_table:
                html.append('<table>')
                html.append(f'<tr>{"".join(f"<th>{process_inline(c)}</th>" for c in cells)}</tr>')
                in_table = True
            else:
                html.append(f'<tr>{"".join(f"<td>{process_inline(c)}</td>" for c in cells)}</tr>')
            continue
        elif in_table:
            html.append('</table>')
            in_table = False

        # List items
        if stripped.startswith('- ') or stripped.startswith('* '):
            if not in_list:
                html.append('<ul>')
                in_list = True
            html.append(f'<li>{process_inline(stripped[2:])}</li>')
            continue
        if re.match(r'^\d+\.\s', stripped):
            if not in_list:
                html.append('<ol>')
                in_list = True
            content = re.sub(r'^\d+\.\s', '', stripped)
            html.append(f'<li>{process_inline(content)}</li>')
            continue
        if in_list and stripped == '':
            tag = '</ol>' if any('</ol>' not in h and '<ol>' in h for h in html[-10:]) else '</ul>'
            html.append('</ul>')
            in_list = False

        # Empty line
        if stripped == '':
            html.append('')
            continue

        # Paragraph
        html.append(f'<p>{process_inline(stripped)}</p>')

    # Close any open tags
    if in_table:
        html.append('</table>')
    if in_blockquote:
        html.append('</blockquote>')
    if in_list:
        html.append('</ul>')

    return '\n'.join(html)


def process_inline(text):
    """Process inline markdown formatting."""
    # Superscripts: ^1,2^
    text = re.sub(r'\^([0-9,–\-]+)\^', r'<sup>\1</sup>', text)
    # Bold + italic: ***text***
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    # Bold: **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic: *text*
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Links
    text = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', text)
    # Code: `text`
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    return text


if __name__ == "__main__":
    generate_html()
