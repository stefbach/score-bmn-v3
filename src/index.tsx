import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors())

// API endpoint pour le calcul complet BMN
app.post('/api/calculate', async (c) => {
  try {
    const data = await c.req.json()
    // Le calcul se fait côté client pour cette application
    return c.json({ success: true, received: true })
  } catch (e) {
    return c.json({ error: 'Invalid data' }, 400)
  }
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', version: '2.0', name: 'Score BMN v2.0' })
})

// Serve the main application
app.get('/', (c) => {
  return c.html(mainHTML())
})

function mainHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Score BMN v2.0 — Bach-Manos-Noel</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="data:,">
<link href="/static/styles.css" rel="stylesheet">
</head>
<body>
<!-- HEADER -->
<div class="site-header">
  <div class="header-inner">
    <div class="logo">
      <div class="logo-badge">B</div>
      <div class="logo-text">
        <h1>Score BMN v2.0</h1>
        <p>Bach &middot; Manos &middot; Noel &mdash; Architecture ABCKO</p>
      </div>
    </div>
    <div class="header-steps">
      <div class="hstep active" id="hs1" onclick="goStep(1)"><div class="hstep-num">1</div> BMN-C Clinique</div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs2" onclick="goStep(2)"><div class="hstep-num">2</div> BMN-K Comorbidites</div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs3" onclick="goStep(3)"><div class="hstep-num">3</div> Classification C+K</div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs4" onclick="goStep(4)"><div class="hstep-num">4</div> BMN-B Biologique</div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs5" onclick="goStep(5)"><div class="hstep-num">5</div> BMN-T Strategie</div>
    </div>
  </div>
  <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:20%"></div></div>
</div>

<!-- MAIN LAYOUT -->
<div class="main-layout">
<div class="content-area">

<!-- STEP 1: BMN-C CLINIQUE -->
<div class="step-panel active fade-in" id="step1">
  <div class="panel-header">
    <div class="panel-icon" style="background:#EBF4FF;">&#x1F464;</div>
    <div class="panel-title">
      <h2>Etape 1 &mdash; BMN-C : Evaluation Clinique</h2>
      <p>Administre par l'Assistante Medicale + Dieteticienne &middot; Sans ordonnance &middot; 25-40 min</p>
      <span class="panel-badge" style="background:#EBF4FF;color:var(--navy);">Score 0 &rarr; 150 pts</span>
    </div>
  </div>

  <!-- ANTHROPOMETRIE -->
  <div class="section-block">
    <h3>&#x1F52C; Anthropometrie</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Ethnie <span class="label-ref">Ajuste les seuils IMC</span></label>
        <select id="ethnie" onchange="recalcC()">
          <option value="eu">Europeen / Franco-Mauricien</option>
          <option value="im">Indo-Mauricien</option>
          <option value="cr">Creole Mauricien</option>
          <option value="si">Sino-Mauricien</option>
          <option value="sa">Sud-Asiatique</option>
          <option value="af">Africain</option>
          <option value="ea">Est-Asiatique</option>
          <option value="se">Sud-Est Asiatique</option>
          <option value="fm">Franco-Mauricien</option>
        </select>
      </div>
      <div class="form-group">
        <label>Sexe</label>
        <select id="sexe" onchange="recalcC()">
          <option value="f">Femme</option>
          <option value="m">Homme</option>
        </select>
      </div>
      <div class="form-group">
        <label>Age (ans)</label>
        <input type="number" id="age" value="42" min="18" max="90" onchange="recalcC()">
      </div>
      <div class="form-group">
        <label>IMC (kg/m2) <span class="label-ref">Mesure par AM</span></label>
        <input type="number" id="imc" value="26.5" min="16" max="70" step="0.1" onchange="recalcC()">
      </div>
      <div class="form-group">
        <label>Tour de taille (cm) <span class="label-ref">&#x2B50; Prioritaire</span></label>
        <input type="number" id="tt" value="88" min="50" max="200" onchange="recalcC()">
      </div>
      <div class="form-group">
        <label>Taille (cm) <span class="label-ref">Pour WHtR auto</span></label>
        <input type="number" id="taille" value="165" min="140" max="220" onchange="recalcC()">
      </div>
    </div>
  </div>

  <!-- HISTOIRE FAMILIALE -->
  <div class="section-block">
    <h3>&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467; Histoire Familiale</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Obesite parentale</label>
        <select id="parent_obes" onchange="recalcC()">
          <option value="0">Aucun parent obese</option>
          <option value="1">1 parent obese (IMC &ge; 30)</option>
          <option value="2">2 parents obeses (OR 8.42)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Obesite dans l'enfance (&lt; 12 ans)</label>
        <select id="obes_enfance" onchange="recalcC()">
          <option value="0">Non</option>
          <option value="1">Oui &mdash; Surpoids enfant</option>
          <option value="2">Oui &mdash; Obese enfant</option>
        </select>
      </div>
      <div class="form-group">
        <label>Diabete T2 parental</label>
        <select id="diab_parent" onchange="recalcC()">
          <option value="0">Non</option>
          <option value="1">1 parent diabetique</option>
          <option value="2">2 parents diabetiques</option>
        </select>
      </div>
    </div>
  </div>

  <!-- COMPORTEMENTS -->
  <div class="section-block">
    <h3>&#x1F3C3; Comportements &amp; Mode de Vie</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Activite physique (min/semaine) <span class="label-ref">IPAQ</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="ap" min="0" max="400" value="90" step="10" oninput="document.getElementById('apVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="apVal">90</div>
          </div>
          <div class="slider-labels"><span>0 (nul)</span><span>150 OMS</span><span>400+</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Temps assis quotidien (heures) <span class="label-ref">HR 1.91 si &gt;8h</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="assis" min="1" max="16" value="7" step="0.5" oninput="document.getElementById('assisVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="assisVal">7</div>
          </div>
          <div class="slider-labels"><span>1h</span><span>8h seuil</span><span>16h</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Duree sommeil (h/nuit)</label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="sommeil" min="3" max="12" value="7" step="0.5" oninput="document.getElementById('sommeilVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="sommeilVal">7</div>
          </div>
          <div class="slider-labels"><span>3h</span><span>6h</span><span>7-9h optimal</span><span>12h</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Score alimentaire DQI-BMN <span class="label-ref">5 dimensions</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="alimentation" min="0" max="15" value="8" oninput="document.getElementById('alimVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="alimVal">8</div>
          </div>
          <div class="slider-labels"><span>0 (optimal)</span><span>8</span><span>15 (critique)</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Statut tabagique</label>
        <select id="tabac" onchange="recalcC()">
          <option value="0">Jamais fume</option>
          <option value="1">Ex-fumeur &gt; 1 an</option>
          <option value="2">Ex-fumeur &lt; 1 an (sevrage recent)</option>
          <option value="3">Fumeur leger (&lt; 10 cig/j)</option>
          <option value="4">Fumeur important (&ge; 10 cig/j)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Alcool (verres/semaine) <span class="label-ref">AUDIT-C</span></label>
        <select id="alcool" onchange="recalcC()">
          <option value="0">Abstinent ou &le; 3/sem</option>
          <option value="1">4-10/sem</option>
          <option value="2">11-21/sem</option>
          <option value="3">&gt; 21/sem (OR 1.46)</option>
        </select>
      </div>
    </div>
  </div>

  <!-- SANTE MENTALE -->
  <div class="section-block">
    <h3>&#x1F9E0; Sante Mentale &amp; Exposome</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Score stress PSS-10 <span class="label-ref">Auto-questionnaire</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="stress" min="0" max="40" value="14" oninput="document.getElementById('stressVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="stressVal">14</div>
          </div>
          <div class="slider-labels"><span>0 (faible)</span><span>20 modere</span><span>40 severe</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Score depression PHQ-9 <span class="label-ref">Auto-questionnaire</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="phq9" min="0" max="27" value="5" oninput="document.getElementById('phq9Val').textContent=this.value;recalcC()">
            <div class="slider-val" id="phq9Val">5</div>
          </div>
          <div class="slider-labels"><span>0</span><span>10 modere</span><span>27 severe</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Score hyperphagie BES <span class="label-ref">16 items, 0-8 pts</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="bes" min="0" max="8" value="2" oninput="document.getElementById('besVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="besVal">2</div>
          </div>
          <div class="slider-labels"><span>0</span><span>4 modere</span><span>8 severe</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Qualite sommeil ISI <span class="label-ref">7 items &mdash; OR 1.73 si &ge;15</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="isi" min="0" max="28" value="8" oninput="document.getElementById('isiVal').textContent=this.value;recalcC()">
            <div class="slider-val" id="isiVal">8</div>
          </div>
          <div class="slider-labels"><span>0</span><span>15 seuil</span><span>28 severe</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Travail de nuit / poste</label>
        <select id="nuit" onchange="recalcC()">
          <option value="0">Non</option>
          <option value="1">Occasionnel (&lt; 3 nuits/sem)</option>
          <option value="2">Regulier (&ge; 3 nuits/sem)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Exposition perturbateurs endocriniens</label>
        <select id="pe" onchange="recalcC()">
          <option value="0">Faible</option>
          <option value="1">Moderee (plastiques, cosmetiques)</option>
          <option value="2">Elevee (professionnelle / BPA)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Precarite socio-economique</label>
        <select id="socio" onchange="recalcC()">
          <option value="0">Aisee</option>
          <option value="1">Classe moyenne</option>
          <option value="2">Precaire</option>
          <option value="3">Grande precarite</option>
        </select>
      </div>
      <div class="form-group">
        <label>Yo-Yo pondere (&ge; 3 cycles)</label>
        <select id="yoyo" onchange="recalcC()">
          <option value="0">Non (0-2 cycles)</option>
          <option value="1">Oui (&ge; 3 cycles de perte/reprise)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="step-nav-bottom">
    <div></div>
    <button class="btn btn-primary" onclick="goStep(2)">Etape 2 : Comorbidites &rarr;</button>
  </div>
</div>

<!-- STEP 2: BMN-K COMORBIDITES -->
<div class="step-panel fade-in" id="step2">
  <div class="panel-header">
    <div class="panel-icon" style="background:#FFF8F0;">&#x1F3E5;</div>
    <div class="panel-title">
      <h2>Etape 2 &mdash; BMN-K : Comorbidites &amp; Phenotypes</h2>
      <p>Maladies etablies et phenotypes metaboliques documentes &middot; Administre par le Medecin</p>
      <span class="panel-badge" style="background:#FFF8F0;color:var(--orange);">Score 0 &rarr; 50 pts</span>
    </div>
  </div>
  <div class="alert" style="background:#FFF8F0;border-left:4px solid var(--orange);">
    <div class="alert-icon">&#x26A1;</div>
    <div class="alert-body">
      <strong>Comorbidity Floor</strong>
      Si BMN-K &gt; 30 pts (comorbidites majeures), le score BMN-T final est garanti &ge; MODERE, meme si le BMN-C est rassurant.
    </div>
  </div>
  <div class="section-block"><h3>&#x1F534; Maladies Etablies</h3><div class="comorbidity-grid" id="comorbGrid"></div></div>
  <div class="section-block"><h3>&#x1F7E0; Phenotypes Metaboliques</h3><div class="comorbidity-grid" id="phenoGrid"></div></div>
  <div class="section-block"><h3>&#x1F48A; Traitements Aggravants</h3><div class="comorbidity-grid" id="traitGrid"></div></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(1)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(3)">Etape 3 : Classification C+K &rarr;</button>
  </div>
</div>

<!-- STEP 3: CLASSIFICATION INTERMEDIAIRE -->
<div class="step-panel fade-in" id="step3">
  <div class="panel-header">
    <div class="panel-icon" style="background:#F0FFF4;">&#x1F4CA;</div>
    <div class="panel-title">
      <h2>Etape 3 &mdash; Classification Intermediaire</h2>
      <p>Synthese BMN-C + BMN-K &rarr; Niveau de risque composite &rarr; Determine le bilan biologique prescrit</p>
      <span class="panel-badge" style="background:#F0FFF4;color:var(--green);">Decision Strategique</span>
    </div>
  </div>
  <div class="synth-grid" id="synthGrid"></div>
  <div id="classificationResult"></div>
  <div class="section-block" id="keyIndicators"><h3>&#x1F3AF; Signaux Cliniques Detectes</h3><div id="signalsList"></div></div>
  <div class="section-block">
    <h3>&#x1F9EA; Bilan Biologique Prescrit (Ordonnance)</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px;">Determine par la classification C+K intermediaire. Le SII module le panel pour les profils faibles.</p>
    <div id="bilanPrescrit"></div>
  </div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(2)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(4)">Etape 4 : Saisir Biologie &rarr;</button>
  </div>
</div>

<!-- STEP 4: BMN-B BIOLOGIQUE -->
<div class="step-panel fade-in" id="step4">
  <div class="panel-header">
    <div class="panel-icon" style="background:#F0FFF4;">&#x1F52C;</div>
    <div class="panel-title">
      <h2>Etape 4 &mdash; BMN-B : Resultats Biologiques</h2>
      <p>Saisir uniquement les marqueurs du panel prescrit &middot; La biologie valide ou corrige la classification</p>
      <span class="panel-badge" style="background:#F0FFF4;color:var(--green);">Retrovalidation Active</span>
    </div>
  </div>
  <div id="bioPanel"></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(3)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(5)">Etape 5 : Score Final &amp; Strategie &rarr;</button>
  </div>
</div>

<!-- STEP 5: BMN-T STRATEGIE -->
<div class="step-panel fade-in" id="step5">
  <div class="panel-header">
    <div class="panel-icon" style="background:#EBF4FF;">&#x1F3AF;</div>
    <div class="panel-title">
      <h2>Etape 5 &mdash; BMN-T : Score Final &amp; Strategie</h2>
      <p>Score consolide pondere C + K + B &rarr; Classification finale &rarr; Plan therapeutique personnalise</p>
      <span class="panel-badge" style="background:#EBF4FF;color:var(--navy);">Score 0 &rarr; 200 pts</span>
    </div>
  </div>
  <div id="finalResult"></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(4)">&larr; Retour</button>
    <button class="btn btn-danger" onclick="resetAll()">&#x1F504; Nouveau Patient</button>
    <button class="btn btn-primary" onclick="window.print()">&#x1F5A8;&#xFE0F; Imprimer</button>
  </div>
</div>

</div><!-- /content-area -->

<!-- SIDEBAR -->
<div class="sidebar">
  <div class="score-card">
    <div class="score-card-header">
      <h3>Scores en temps reel</h3>
      <span style="font-size:11px;opacity:0.6;font-family:'DM Mono',monospace;">LIVE</span>
    </div>
    <div class="score-card-body">
      <div class="score-meter"><div class="score-meter-label"><span>BMN-C Clinique</span><span id="sCval">&mdash;</span>/150</div><div class="meter-bar"><div class="meter-fill" id="sCbar" style="width:0%;background:var(--blue)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>BMN-K Comorbidites</span><span id="sKval">&mdash;</span>/50</div><div class="meter-bar"><div class="meter-fill" id="sKbar" style="width:0%;background:var(--orange)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>BMN-B Biologique</span><span id="sBval">&mdash;</span>/100</div><div class="meter-bar"><div class="meter-fill" id="sBbar" style="width:0%;background:var(--green)"></div></div></div>
      <div class="score-big" id="bmnTBox" style="background:var(--subtle);color:var(--navy);"><div class="number" id="bmnTNum">&mdash;</div><div class="label">BMN-T Score Final</div></div>
      <div class="risk-badge" id="riskBadge" style="background:var(--subtle);color:var(--muted);">Calculer le score</div>
      <div class="score-breakdown" id="scoreBreakdown"></div>
    </div>
  </div>
  <div class="score-card">
    <div class="score-card-header"><h3>Guide de lecture</h3></div>
    <div class="score-card-body" style="display:flex;flex-direction:column;gap:8px;">
      <div class="info-box" style="background:#F0FFF4;border-left-color:var(--green);"><strong>FAIBLE</strong> BMN-T 0-40 &middot; P(obesite 10 ans) &lt; 8%</div>
      <div class="info-box" style="background:var(--l-yellow);border-left-color:#D69E2E;"><strong>MODERE</strong> BMN-T 41-80 &middot; P 8-22%</div>
      <div class="info-box" style="background:var(--l-orange);border-left-color:var(--orange);"><strong>ELEVE</strong> BMN-T 81-120 &middot; P 22-47%</div>
      <div class="info-box" style="background:var(--l-red);border-left-color:var(--red);"><strong>TRES ELEVE</strong> BMN-T 121-160 &middot; P 47-71%</div>
      <div class="info-box" style="background:var(--l-purple);border-left-color:var(--purple);"><strong>CRITIQUE</strong> BMN-T &gt; 160 &middot; P &gt; 71%</div>
    </div>
  </div>
  <!-- CTI / GRI -->
  <div class="score-card" id="ctiGriCard" style="display:none;">
    <div class="score-card-header"><h3>Indices Specialises</h3></div>
    <div class="score-card-body">
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">CTI &mdash; Chronicisation</div>
        <div class="meter-bar" style="height:8px;margin-bottom:4px;"><div class="meter-fill" id="ctiBar" style="width:0%;background:var(--red)"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span id="ctiVal" style="font-family:'DM Mono',monospace;font-weight:700;color:var(--red);">0</span><span style="color:var(--muted);">Fenetre: <span id="ctiWindow">Ouverte</span></span></div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">GRI &mdash; Reponse GLP-1</div>
        <div class="meter-bar" style="height:8px;margin-bottom:4px;"><div class="meter-fill" id="griBar" style="width:0%;background:var(--green-light)"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span id="griVal" style="font-family:'DM Mono',monospace;font-weight:700;color:var(--green);">0.0</span><span style="color:var(--muted);"><span id="griLevel">&mdash;</span></span></div>
      </div>
    </div>
  </div>
  <!-- MARKOV -->
  <div class="score-card" id="markovCard" style="display:none;">
    <div class="score-card-header"><h3>Markov 6 Etats</h3></div>
    <div class="score-card-body" id="markovBody"></div>
  </div>
</div>
</div><!-- /main-layout -->

<script src="/static/app.js"></script>
</body>
</html>`
}

export default app
