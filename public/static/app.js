// ═══════════════════════════════════════════════════════════════════
// SCORE BMN v2.0 — ALGORITHME COMPLET
// Architecture ABCKO (Anthropometrie, Biologie, Comorbidites, Koefficients, Ordonnance)
// Dr Patrick Noel, MD, FACS, FASMBS, FIFSO
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. DONNEES DE REFERENCE — ETHNIES (9 groupes x 8 multiplicateurs)
// ─────────────────────────────────────────────────────────────
const ETHNICITY = {
  eu: { name:'Europeen',         bmiOW:25,  bmiOB:30,   ttF:88,  ttM:102, diabRisk:1.0, htaRisk:1.0, cvRisk:1.0, inflam:1.0, evAdj:0 },
  im: { name:'Indo-Mauricien',   bmiOW:23,  bmiOB:27.5, ttF:80,  ttM:90,  diabRisk:2.0, htaRisk:1.2, cvRisk:1.4, inflam:1.2, evAdj:-1.5 },
  cr: { name:'Creole Mauricien', bmiOW:25,  bmiOB:30,   ttF:84,  ttM:94,  diabRisk:1.3, htaRisk:1.4, cvRisk:1.2, inflam:1.2, evAdj:-2.0 },
  si: { name:'Sino-Mauricien',   bmiOW:23,  bmiOB:27.5, ttF:80,  ttM:90,  diabRisk:1.0, htaRisk:0.9, cvRisk:0.6, inflam:0.9, evAdj:1.5 },
  sa: { name:'Sud-Asiatique',    bmiOW:23,  bmiOB:27.5, ttF:80,  ttM:90,  diabRisk:2.0, htaRisk:1.3, cvRisk:1.5, inflam:1.2, evAdj:-1.5 },
  af: { name:'Africain',         bmiOW:25,  bmiOB:30,   ttF:88,  ttM:102, diabRisk:1.3, htaRisk:1.5, cvRisk:1.2, inflam:1.3, evAdj:-1.5 },
  ea: { name:'Est-Asiatique',    bmiOW:23,  bmiOB:27.5, ttF:80,  ttM:88,  diabRisk:0.9, htaRisk:0.9, cvRisk:0.7, inflam:0.9, evAdj:1.5 },
  se: { name:'Sud-Est Asiatique',bmiOW:23,  bmiOB:27.5, ttF:80,  ttM:90,  diabRisk:1.2, htaRisk:1.0, cvRisk:1.0, inflam:1.0, evAdj:0 },
  fm: { name:'Franco-Mauricien', bmiOW:25,  bmiOB:30,   ttF:88,  ttM:102, diabRisk:0.8, htaRisk:1.0, cvRisk:0.9, inflam:1.0, evAdj:1.0 },
};

// ─────────────────────────────────────────────────────────────
// 2. COMORBIDITES — 11 maladies + phenotypes + traitements
//    Chaque comorbidite a: pts, OR/HR, description,
//    amplificateur CTI, impact GRI, risque DT2 10ans, risque CV
// ─────────────────────────────────────────────────────────────
const COMORBIDITIES = {
  diseases: [
    { id:'dt2',    name:'Diabete Type 2',             pts:14, or:'HR 3.84', desc:'IR severe documentee. Perte esperance vie 8.9 ans non traite.', ctiAmp:1.8, gri:+0.65, dtRisk:'60-80%', cvRisk:'x1.9' },
    { id:'predmt', name:'Pre-diabete (IFG/IGT)',      pts:8,  or:'HR 2.11', desc:'HbA1c 5.7-6.4% ou glycemie 5.6-6.9 mmol/L. Reversible.', ctiAmp:1.2, gri:+0.82, dtRisk:'60-80%', cvRisk:'-' },
    { id:'hta',    name:'HTA etablie',                pts:10, or:'HR 2.24', desc:'Complication et facteur aggravant de l\'obesite viscerale.', ctiAmp:1.1, gri:0, dtRisk:'-', cvRisk:'x1.6' },
    { id:'saos',   name:'SAOS (Apnee du sommeil)',    pts:12, or:'OR 2.19', desc:'Resistance insulinique via hypoxie + cortisol nocturne eleve.', ctiAmp:1.4, gri:0, dtRisk:'30-50%', cvRisk:'x1.7' },
    { id:'sopk',   name:'SOPK (Femme)',               pts:14, or:'OR 2.77', desc:'Phenotype IR feminin par excellence. GLP-1 tres efficace.', ctiAmp:1.2, gri:+0.83, dtRisk:'35-55%', cvRisk:'-' },
    { id:'nafld',  name:'NAFLD / Steatose hepatique',pts:10, or:'OR 3.22', desc:'IR hepatique. CAP >= 238 dB/m. GLP-1 reduit steatose.', ctiAmp:1.1, gri:+0.66, dtRisk:'25-40%', cvRisk:'x1.8' },
    { id:'hypo',   name:'Hypothyroidie sub-clinique', pts:6,  or:'OR 1.74', desc:'TSH > 4.0. Reduit metabolisme basal de 10-15%.', ctiAmp:1.3, gri:0, dtRisk:'20-35%', cvRisk:'-' },
    { id:'mets',   name:'Syndrome metabolique complet',pts:12,or:'HR 2.64', desc:'>= 3 criteres IDF. Cible prioritaire GLP-1.', ctiAmp:1.3, gri:+0.65, dtRisk:'70-90%', cvRisk:'x2.4' },
  ],
  phenotypes: [
    { id:'monw',   name:'Phenotype MONW',             pts:10, or:'OR 2.38', desc:'IMC < 25 mais >= 2 criteres MetS. Souvent sous-diagnostique.', ctiAmp:1.1, gri:+0.70, dtRisk:'50-70%', cvRisk:'x2.0' },
    { id:'ir_occ', name:'IR occulte (TG/HDL > 3.5)',  pts:8,  or:'OR 2.12', desc:'Triade IR : TG/HDL + adiponectine basse + HOMA-IR eleve.', ctiAmp:1.2, gri:+0.55, dtRisk:'40-60%', cvRisk:'-' },
  ],
  treatments: [
    { id:'cortis', name:'Corticoides long cours (> 3 mois)',pts:8, or:'HR 2.12', desc:'Adipogenese viscerale iatrogene. IR steroidienne.', ctiAmp:1.6, gri:-0.47, dtRisk:'40-60%', cvRisk:'-' },
    { id:'antidep',name:'Antidepresseurs (paroxetine/mirtazapine)',pts:4, or:'OR 1.58', desc:'Certains AD induisent prise de poids. Relation bidirectionnelle.', ctiAmp:1.1, gri:0, dtRisk:'-', cvRisk:'-' },
    { id:'depres', name:'Depression majeure traitee',  pts:6, or:'OR 1.92', desc:'Depression majeure avec impact metabolique. Bidirectionnalite.', ctiAmp:1.2, gri:0, dtRisk:'-', cvRisk:'-' },
  ]
};

// ─────────────────────────────────────────────────────────────
// 3. BIOMARQUEURS — 15 marqueurs avec seuils et poids
//    panel = tier minimal d'inclusion (5=Tier2A, 10=Tier2B, 15=Tier2C/D)
//    inv = true si la valeur normale est HAUTE (HDL, adiponectine)
// ─────────────────────────────────────────────────────────────
const BIO_MARKERS = [
  { id:'homaIR',  name:'HOMA-IR',            unit:'(UI x mU/L)',n:2.5,  a:4.0,  w:2.5, inv:false, panel:5,  normal:'< 2.5',   abnorm:'>= 4.0',  label:'Resistance insulinique' },
  { id:'hba1c',   name:'HbA1c',              unit:'%',          n:5.7,  a:6.5,  w:2.0, inv:false, panel:5,  normal:'< 5.7',   abnorm:'>= 6.5',  label:'Glycemie chronique' },
  { id:'glyc',    name:'Glycemie a jeun',    unit:'mmol/L',     n:5.6,  a:7.0,  w:1.8, inv:false, panel:5,  normal:'< 5.6',   abnorm:'>= 7.0',  label:'Diabete' },
  { id:'crphs',   name:'CRP ultra-sensible', unit:'mg/L',       n:1.0,  a:3.0,  w:2.0, inv:false, panel:5,  normal:'< 1.0',   abnorm:'>= 3.0',  label:'Inflammation' },
  { id:'tsh',     name:'TSH',                unit:'mUI/L',      n:4.0,  a:8.0,  w:1.3, inv:false, panel:5,  normal:'0.4-4.0', abnorm:'> 4.0',   label:'Thyroide' },
  { id:'ldl',     name:'LDL-C',              unit:'mmol/L',     n:3.0,  a:4.1,  w:1.8, inv:false, panel:5,  normal:'< 3.0',   abnorm:'>= 4.1',  label:'LDL atherogene' },
  { id:'hdl',     name:'HDL-C',              unit:'mmol/L',     n:1.0,  a:0.7,  w:1.0, inv:true,  panel:5,  normal:'>= 1.0',  abnorm:'< 0.7',   label:'Cardioprotection' },
  { id:'tg',      name:'Triglycerides',      unit:'mmol/L',     n:1.7,  a:2.3,  w:1.5, inv:false, panel:10, normal:'< 1.7',   abnorm:'>= 2.3',  label:'Dyslipidemie' },
  { id:'adipon',  name:'Adiponectine',       unit:'ug/mL',      n:10.0, a:6.0,  w:2.5, inv:true,  panel:10, normal:'>= 10',   abnorm:'< 6.0',   label:'Metab. adipeux' },
  { id:'asat',    name:'ASAT/ALAT',          unit:'UI/L',       n:40,   a:60,   w:1.0, inv:false, panel:10, normal:'< 40',    abnorm:'>= 60',   label:'Foie' },
  { id:'apob',    name:'ApoB',               unit:'g/L',        n:0.9,  a:1.2,  w:1.5, inv:false, panel:10, normal:'< 0.9',   abnorm:'>= 1.2',  label:'Atherogenicite' },
  { id:'ggt',     name:'GGT',                unit:'UI/L',       n:50,   a:80,   w:0.8, inv:false, panel:10, normal:'< 50',    abnorm:'>= 80',   label:'Foie / Alcool' },
  { id:'tghdl',   name:'Ratio TG/HDL',       unit:'-',          n:2.0,  a:3.5,  w:2.0, inv:false, panel:15, normal:'< 2.0',   abnorm:'>= 3.5',  label:'IR proxy' },
  { id:'urate',   name:'Acide urique',       unit:'umol/L',     n:360,  a:420,  w:0.8, inv:false, panel:15, normal:'< 360',   abnorm:'>= 420',  label:'MetS / IR' },
  { id:'leptine', name:'Leptine',            unit:'ng/mL',      n:20,   a:40,   w:1.5, inv:false, panel:15, normal:'< 20',    abnorm:'>= 40',   label:'Resistance leptine' },
];

// ─────────────────────────────────────────────────────────────
// 4. MATRICE DE MARKOV 6 ETATS — Transition de base
//    [Normal, SurpDebut, SurpEtabli, SurpEleve, ObesMod, ObesSev]
// ─────────────────────────────────────────────────────────────
const MARKOV_STATES = [
  'Poids normal',
  'Surpoids debut.',
  'Surpoids etabli',
  'Surpoids eleve',
  'Obesite mod.',
  'Obesite severe'
];
const MARKOV_BASE = [
  [0.82, 0.14, 0.03, 0.01, 0.00, 0.00],
  [0.08, 0.68, 0.18, 0.05, 0.01, 0.00],
  [0.02, 0.11, 0.61, 0.21, 0.04, 0.01],
  [0.01, 0.04, 0.14, 0.56, 0.21, 0.04],
  [0.00, 0.01, 0.03, 0.12, 0.65, 0.19],
  [0.00, 0.00, 0.01, 0.03, 0.11, 0.85],
];
const THETA_BMN = 0.68;
const THETA_K   = 0.35;

// Multiplicateurs Markov par comorbidite
const MARKOV_COMORB_MULT = {
  dt2:  1.40,
  sopk: 1.30,
  saos: 1.25,
  mets: 1.50,
};

// ─────────────────────────────────────────────────────────────
// 5. COEFFICIENTS CTI (Chronicization Trajectory Index)
//    gamma_j x Z_j, normalise sur 100
// ─────────────────────────────────────────────────────────────
const CTI_GAMMA = {
  duree_surpoids:    0.185,
  yoyo:              0.249,
  resistance_leptine:0.210,
  microbiote:        0.180,
  cortisol:          0.195,
  metabolisme_basal: 0.200,
  obesite_enfance:   0.240,
};

// ─────────────────────────────────────────────────────────────
// 6. COEFFICIENTS GRI (GLP-1 Response Index)
//    delta_k (favorables) et epsilon_k (defavorables)
// ─────────────────────────────────────────────────────────────
const GRI_FAVORABLE = {
  homaIR_high:    1.07,  // HOMA-IR > 2.5
  prediabete:     0.82,
  nafld:          0.66,
  sopk:           0.83,
  adiponectine_low:0.62, // Adiponectine < 6
  monw:           0.70,
  mets:           0.65,
  tghdl_high:     0.55,  // TG/HDL > 3.5
};
const GRI_DEFAVORABLE = {
  cti_high:       0.65,  // CTI > 55
  cortisol:       0.28,
  imc_40_mecanique:0.47, // IMC > 40 sans profil metab
  corticoides:    0.35,
};

// ═══════════════════════════════════════════════════════════════════
// ETAT GLOBAL DE L'APPLICATION
// ═══════════════════════════════════════════════════════════════════
let state = {
  step: 1,
  bmn_c: 0,
  bmn_k: 0,
  bmn_b: 0,
  bmn_t: 0,
  cti: 0,
  gri: 0,
  comorbIds: [],
  panelLevel: 5,
  bioValues: {},
  sii: 0,
};

// ═══════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════
function init() {
  buildComorbGrid();
  recalcC();
}

function buildComorbGrid() {
  const build = (items, containerId) => {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    cont.innerHTML = items.map(c => `
      <label class="comorbidity-card" id="cc_${c.id}" onclick="toggleComorbidity('${c.id}')">
        <input type="checkbox" id="cb_${c.id}">
        <div class="cc-header">
          <div class="cc-name">${c.name}</div>
          <div class="cc-pts">+${c.pts} pts</div>
        </div>
        <div class="cc-or">${c.or}</div>
        <div class="cc-desc">${c.desc}</div>
      </label>
    `).join('');
  };
  build(COMORBIDITIES.diseases, 'comorbGrid');
  build(COMORBIDITIES.phenotypes, 'phenoGrid');
  build(COMORBIDITIES.treatments, 'traitGrid');
}

function toggleComorbidity(id) {
  const cb = document.getElementById('cb_' + id);
  if (!cb) return;
  cb.checked = !cb.checked;
  const card = document.getElementById('cc_' + id);
  if (card) card.classList.toggle('active', cb.checked);
  if (cb.checked && !state.comorbIds.includes(id)) state.comorbIds.push(id);
  else state.comorbIds = state.comorbIds.filter(x => x !== id);
  recalcK();
}

// ═══════════════════════════════════════════════════════════════════
// CALCUL BMN-C — Module Clinique (0-150 pts)
// 21 variables, seuils ajustes ethnie, score inflammatoire SII
// ═══════════════════════════════════════════════════════════════════
function recalcC() {
  const eth = ETHNICITY[document.getElementById('ethnie').value] || ETHNICITY.eu;
  const sexe = document.getElementById('sexe').value;
  const age = +document.getElementById('age').value;
  const imc = +document.getElementById('imc').value;
  const tt = +document.getElementById('tt').value;
  const taille = +document.getElementById('taille').value;
  const whtr = taille > 0 ? tt / taille : 0;
  const parentObes = +document.getElementById('parent_obes').value;
  const obesEnfance = +document.getElementById('obes_enfance').value;
  const diabParent = +document.getElementById('diab_parent').value;
  const ap = +document.getElementById('ap').value;
  const assis = +document.getElementById('assis').value;
  const sommeil = +document.getElementById('sommeil').value;
  const alimentation = +document.getElementById('alimentation').value;
  const tabac = +document.getElementById('tabac').value;
  const alcool = +document.getElementById('alcool').value;
  const stress = +document.getElementById('stress').value;
  const phq9 = +document.getElementById('phq9').value;
  const bes = +document.getElementById('bes').value;
  const isi = +document.getElementById('isi').value;
  const nuit = +document.getElementById('nuit').value;
  const pe = +document.getElementById('pe').value;
  const socio = +document.getElementById('socio').value;
  const yoyo = +document.getElementById('yoyo').value;

  let c = 0;

  // ── A1. IMC ajuste ethnie (0-10 pts) ──
  if (imc < eth.bmiOW) c += 0;
  else if (imc < eth.bmiOB) c += 3;
  else if (imc < eth.bmiOB + 5) c += 6;
  else c += 10;

  // ── A2. Tour de taille — PRIORITAIRE (0-15 pts) ──
  const ttSeuil = sexe === 'f' ? eth.ttF : eth.ttM;
  if (tt > ttSeuil + 10) c += 15;
  else if (tt > ttSeuil + 5) c += 11;
  else if (tt > ttSeuil) c += 7;

  // ── A3. WHtR — Ratio Taille/Taille (0-9 pts) ──
  if (whtr >= 0.6) c += 9;
  else if (whtr >= 0.55) c += 6;
  else if (whtr >= 0.5) c += 3;

  // ── F1. Obesite parentale (0-10 pts) — OR 8.42 si 2 parents ──
  if (parentObes === 2) c += 10;
  else if (parentObes === 1) c += 8;

  // ── F2. Obesite enfance < 12 ans (0-10 pts) ──
  if (obesEnfance === 2) c += 10;
  else if (obesEnfance === 1) c += 6;

  // ── F3. Diabete T2 parental (0-5 pts) ──
  if (diabParent === 2) c += 5;
  else if (diabParent === 1) c += 3;

  // ── C1. Activite physique IPAQ (0-9 pts) — HR 1.68 si nul ──
  if (ap < 30) c += 9;
  else if (ap < 75) c += 6;
  else if (ap < 150) c += 3;

  // ── C2. Sedentarite temps assis (0-9 pts) — HR 1.91 si >8h ──
  if (assis >= 10) c += 9;
  else if (assis >= 8) c += 6;
  else if (assis >= 6) c += 3;

  // ── C3. Duree sommeil (0-7 pts) ──
  if (sommeil < 5 || sommeil > 10) c += 7;
  else if (sommeil < 6 || sommeil > 9) c += 4;
  else if (sommeil < 7) c += 2;

  // ── C4. Alimentation DQI-BMN 5 dimensions (0-15 pts) ──
  c += alimentation;

  // ── C5. Tabac (0-8 pts) — sevrage < 24 mois = risque max ──
  if (tabac === 4) c += 8;
  else if (tabac === 3) c += 5;
  else if (tabac === 2) c += 6; // sevrage recent = risque max
  else if (tabac === 1) c += 1;

  // ── C6. Alcool AUDIT-C (0-5 pts) — OR 1.46 si > 21/sem ──
  if (alcool === 3) c += 5;
  else if (alcool === 2) c += 3;
  else if (alcool === 1) c += 1;

  // ── M1. Stress PSS-10 (0-10 pts) ──
  const stressRatio = stress / 40;
  if (stressRatio >= 0.6) c += 10;
  else if (stressRatio >= 0.4) c += 7;
  else if (stressRatio >= 0.25) c += 4;

  // ── M2. Depression PHQ-9 (0-10 pts) ──
  if (phq9 >= 20) c += 10;
  else if (phq9 >= 15) c += 7;
  else if (phq9 >= 10) c += 5;
  else if (phq9 >= 5) c += 2;

  // ── M3. Hyperphagie BES (0-8 pts) ──
  if (bes >= 6) c += 8;
  else if (bes >= 4) c += 5;
  else if (bes >= 2) c += 2;

  // ── M4. Qualite sommeil ISI (0-8 pts) — OR 1.73 si >= 15 ──
  if (isi >= 22) c += 8;
  else if (isi >= 15) c += 6;
  else if (isi >= 8) c += 3;

  // ── E1. Travail de nuit (0-5 pts) ──
  if (nuit === 2) c += 5;
  else if (nuit === 1) c += 2;

  // ── E2. Perturbateurs endocriniens (0-5 pts) ──
  if (pe === 2) c += 5;
  else if (pe === 1) c += 2;

  // ── E3. Precarite socio-economique (0-5 pts) ──
  if (socio >= 3) c += 5;
  else if (socio >= 2) c += 3;
  else if (socio >= 1) c += 1;

  state.bmn_c = Math.min(150, c);

  // ── Calcul SII (Sub-Score Inflammatoire Indirect, 0-7) ──
  let sii = 0;
  if (stressRatio >= 0.35) sii++;
  if (ap < 75) sii++;
  if (imc >= eth.bmiOB) sii++;
  if (tabac >= 3) sii++;
  if (alimentation >= 10) sii++;   // DQI_AUT >= 2 proxy
  if (isi >= 15) sii++;
  if (tt > ttSeuil) sii++;
  state.sii = sii;

  updateSidebar();
  recalcK();
}

// ═══════════════════════════════════════════════════════════════════
// CALCUL BMN-K — Module Comorbidites (0-50 pts)
// + CTI (Chronicization Trajectory Index, 0-100)
// + GRI (GLP-1 Response Index)
// ═══════════════════════════════════════════════════════════════════
function recalcK() {
  const allComobs = [...COMORBIDITIES.diseases, ...COMORBIDITIES.phenotypes, ...COMORBIDITIES.treatments];
  let k = 0;
  let ctiAmpMax = 1.0;
  let griTotal = 0;

  state.comorbIds.forEach(id => {
    const c = allComobs.find(x => x.id === id);
    if (c) {
      k += c.pts;
      ctiAmpMax = Math.max(ctiAmpMax, c.ctiAmp);
      griTotal += c.gri;
    }
  });
  state.bmn_k = Math.min(50, k);

  // ── CTI Calculation ──
  // CTI = Sum(gamma_j x Z_j) x max(amplificateur)
  // Z_j are normalized 0-1 based on available clinical data
  const obesEnfance = +document.getElementById('obes_enfance').value;
  const yoyo = +document.getElementById('yoyo').value;
  const imc = +document.getElementById('imc').value;
  const eth = ETHNICITY[document.getElementById('ethnie').value] || ETHNICITY.eu;
  const isi = +document.getElementById('isi').value;
  const stress = +document.getElementById('stress').value;

  let ctiRaw = 0;
  // gamma_1: Duree surpoids cumulee (proxy: BMN-C level)
  const surpoidsProxy = state.bmn_c > 100 ? 1.0 : state.bmn_c > 70 ? 0.7 : state.bmn_c > 40 ? 0.4 : 0.1;
  ctiRaw += CTI_GAMMA.duree_surpoids * surpoidsProxy;

  // gamma_2: Yo-Yo >= 3 cycles
  ctiRaw += CTI_GAMMA.yoyo * (yoyo >= 1 ? 1.0 : 0);

  // gamma_3: Resistance leptine (proxy: IMC et SAOS)
  const leptineProxy = (imc > 35 ? 1.0 : imc > 30 ? 0.6 : imc > 27.5 ? 0.3 : 0) + (state.comorbIds.includes('saos') ? 0.3 : 0);
  ctiRaw += CTI_GAMMA.resistance_leptine * Math.min(1, leptineProxy);

  // gamma_4: Microbiote (proxy: alimentation + inflammation)
  const alim = +document.getElementById('alimentation').value;
  const microbioteProxy = alim / 15;
  ctiRaw += CTI_GAMMA.microbiote * microbioteProxy;

  // gamma_5: Cortisol nocturne (proxy: stress + insomnie + travail nuit)
  const nuit = +document.getElementById('nuit').value;
  const cortisolProxy = Math.min(1, (stress / 40 * 0.4) + (isi / 28 * 0.3) + (nuit / 2 * 0.3));
  ctiRaw += CTI_GAMMA.cortisol * cortisolProxy;

  // gamma_6: Metabolisme basal abaisse (proxy: hypothyroidie + yo-yo)
  const metabProxy = (state.comorbIds.includes('hypo') ? 0.6 : 0) + (yoyo >= 1 ? 0.4 : 0);
  ctiRaw += CTI_GAMMA.metabolisme_basal * Math.min(1, metabProxy);

  // gamma_7: Obesite enfance
  ctiRaw += CTI_GAMMA.obesite_enfance * (obesEnfance >= 2 ? 1.0 : obesEnfance >= 1 ? 0.5 : 0);

  // Normaliser sur 100 et appliquer amplificateur (le plus eleve, non cumulatif)
  let cti = (ctiRaw / 1.459) * 100 * ctiAmpMax; // 1.459 = somme des gamma_j
  cti = Math.min(100, Math.round(cti));
  state.cti = cti;

  // ── GRI Calculation ──
  // GRI = Sum(delta_k x F_k) - Sum(epsilon_k x U_k)
  let gri = griTotal; // From comorbidity gri impacts

  // Bio-based GRI adjustments (if bio values available)
  if (state.bioValues.homaIR > 2.5) gri += GRI_FAVORABLE.homaIR_high;
  if (state.bioValues.adipon < 6) gri += GRI_FAVORABLE.adiponectine_low;
  if (state.bioValues.tghdl > 3.5) gri += GRI_FAVORABLE.tghdl_high;

  // Defavorables
  if (cti > 55) gri -= GRI_DEFAVORABLE.cti_high;
  if (state.comorbIds.includes('cortis')) gri -= GRI_DEFAVORABLE.corticoides;
  if (imc > 40 && !state.comorbIds.includes('mets') && !state.comorbIds.includes('dt2')) {
    gri -= GRI_DEFAVORABLE.imc_40_mecanique;
  }
  if (stress / 40 >= 0.6) gri -= GRI_DEFAVORABLE.cortisol;

  state.gri = Math.max(-2, Math.min(5, gri));
  updateSidebar();
}

// ═══════════════════════════════════════════════════════════════════
// CALCUL BMN-B — Module Biologique (0-100)
// Bio_norm = (Sum(z_i x w_i) / Sum(w_i)) x 100
// z_i = score normalise 0-1 par biomarqueur
// ═══════════════════════════════════════════════════════════════════
function recalcB() {
  let sumWZ = 0, sumW = 0;
  const retroFlags = [];
  const values = {};

  BIO_MARKERS.forEach(m => {
    const inp = document.getElementById('bio_' + m.id);
    if (!inp || inp.value === '') return;
    const v = parseFloat(inp.value);
    if (isNaN(v)) return;
    values[m.id] = v;

    let z;
    if (!m.inv) {
      // Normal: low is good
      if (v <= m.n) z = 0;
      else if (v >= m.a) z = 1;
      else z = (v - m.n) / (m.a - m.n);
    } else {
      // Inverse: high is good (HDL, adiponectine)
      if (v >= m.n) z = 0;
      else if (v <= m.a) z = 1;
      else z = (m.n - v) / (m.n - m.a);
    }
    sumWZ += z * m.w;
    sumW += m.w;
  });

  state.bmn_b = sumW > 0 ? Math.round((sumWZ / sumW) * 100) : 0;
  state.bioValues = values;

  // ── RETROVALIDATION BIOLOGIQUE — 6 Regles ──
  // R1: HOMA-IR nie
  if (values.homaIR >= 4 && !state.comorbIds.includes('dt2') && !state.comorbIds.includes('predmt')) {
    retroFlags.push({ emoji:'&#x26A0;&#xFE0F;', txt:'HOMA-IR >= 4 sans traitement declare -> Resistance insulinique severe confirmee. BMN-K IR/DT2 force. Panel 10 declenche.', action:'force_ir' });
  }
  // R2: Pre-diabete meconnu
  if (values.hba1c >= 5.7 && values.hba1c < 6.5 && !state.comorbIds.includes('predmt')) {
    retroFlags.push({ emoji:'&#x1F7E1;', txt:`HbA1c ${values.hba1c}% -> Pre-diabete biologique. BMN-K pre-diabete force. Panel 10 declenche.`, action:'force_predmt' });
  }
  // R3: DT2 non declare
  if (values.hba1c >= 6.5 && !state.comorbIds.includes('dt2')) {
    retroFlags.push({ emoji:'&#x1F534;', txt:`HbA1c ${values.hba1c}% >= 6.5% -> DIABETE BIOLOGIQUE. BMN-K DT2 force. BMN-T minimum 60 garanti.`, action:'force_dt2' });
  }
  // R4: Steatose silencieuse
  if (values.asat > 60 && values.ggt > 50 && values.tg > 1.7 && !state.comorbIds.includes('nafld')) {
    retroFlags.push({ emoji:'&#x26A0;&#xFE0F;', txt:'ASAT > 60 + GGT > 50 + TG > 1.7 -> Signal NAFLD probable. BMN-K active.', action:'force_nafld' });
  }
  // R5: IR occulte
  if (values.tghdl > 3.5 && values.adipon < 6 && values.homaIR > 2.5) {
    retroFlags.push({ emoji:'&#x26A0;&#xFE0F;', txt:'Triade IR occulte detectee (TG/HDL + adiponectine + HOMA-IR). CTI amplifie. GRI positif.' });
  }
  // R6: Alcool cache
  if (values.ggt > 100 && values.asat > 60) {
    retroFlags.push({ emoji:'&#x1F37A;', txt:'Pattern hepatique : GGT > 100 + ASAT/ALAT eleve -> Alcool cache ou NASH. Reevaluation consommation alcool.' });
  }

  const retroDiv = document.getElementById('retroValid');
  if (retroDiv) {
    retroDiv.innerHTML = retroFlags.length
      ? retroFlags.map(f => `<div class="alert" style="background:var(--l-orange);border-left:4px solid var(--orange);margin-bottom:8px;">
          <div class="alert-icon">${f.emoji}</div><div class="alert-body">${f.txt}</div></div>`).join('')
      : `<div class="alert" style="background:var(--l-green);border-left:4px solid var(--green);">
          <div class="alert-icon">&#x2705;</div><div class="alert-body">Aucune incoherence detectee entre donnees declaratives et biologiques.</div></div>`;
  }

  // Recalculate GRI with bio values
  recalcK();
  updateSidebar();
}

// ═══════════════════════════════════════════════════════════════════
// CALCUL BMN-T — Score Final (0-200 pts)
// Ponderation dynamique tri-source + BioFloors + Comorbidity Floor
// BMN_T = w_C x C_norm + w_B x Bio_norm + w_K x K_norm
// ═══════════════════════════════════════════════════════════════════
function calcBMNT() {
  const c = state.bmn_c;
  const k = state.bmn_k;
  const b = state.bmn_b;

  // Normaliser sur 0-100
  const cN = (c / 150) * 100;
  const kN = (k / 50) * 100;
  const bN = b; // deja 0-100

  // ── Ponderation dynamique ──
  const gap = bN - cN;
  let wB, wC, wK = 0.15;

  if (gap <= 20) {
    // Ponderations de base
    wB = 0.30;
    wC = 0.55;
  } else {
    // Bascule dynamique: la bio pese plus si elle diverge du clinique
    const extraWeight = Math.min(0.30, (gap - 20) / 100 * 0.60);
    wB = 0.30 + extraWeight;    // Monte jusqu'a 0.60
    wC = 0.55 - extraWeight * 0.75; // Descend jusqu'a 0.25
  }
  wC = Math.max(0.25, wC);

  // Renormaliser pour que la somme = 1
  const sum = wB + wC + wK;
  wB /= sum; wC /= sum; wK /= sum;

  let t = wC * cN + wB * bN + wK * kN;

  // ── BioFloor Standard ──
  if (bN > 0 && t < bN * 0.75) t = bN * 0.75;

  // ── BioFloor d'Urgence ──
  if (bN > 90) t = Math.max(t, Math.max(80, bN * 0.85));
  else if (bN > 80) t = Math.max(t, bN * 0.85);

  // ── Comorbidity Floor ──
  // Si BMN-K > 30 ET BMN-T < 40 -> BMN-T >= max(40, BMN-K x 0.80)
  if (k > 30 && t < 40) t = Math.max(40, kN * 0.80);

  // ── Retrovalidation: HbA1c >= 6.5 force minimum 60 ──
  if (state.bioValues.hba1c >= 6.5 && t < 60) t = 60;

  // Echelle finale 0-200
  state.bmn_t = Math.min(200, Math.round(t * 2));
  return state.bmn_t;
}

// ═══════════════════════════════════════════════════════════════════
// MODELE DE MARKOV 6 ETATS
// P_ij(BMN,K) = P_ij(base) x exp(theta_BMN x BMN_T/100) x exp(theta_K x K_norm/100)
// ═══════════════════════════════════════════════════════════════════
function calcMarkov() {
  const bmnT = state.bmn_t;
  const kN = (state.bmn_k / 50) * 100;

  // Determine current state from BMI
  const imc = +document.getElementById('imc').value;
  let currentState = 0;
  if (imc >= 35) currentState = 5;
  else if (imc >= 30) currentState = 4;
  else if (imc >= 27.5) currentState = 3;
  else if (imc >= 25) currentState = 2;
  else if (imc >= 23) currentState = 1;

  // Get base transition row
  const baseRow = MARKOV_BASE[currentState].slice();

  // Modulate: multiply forward transitions by risk factor
  const riskFactor = Math.exp(THETA_BMN * bmnT / 200) * Math.exp(THETA_K * kN / 100);

  // Comorbidity-specific multipliers
  let comorbMult = 1.0;
  for (const id of state.comorbIds) {
    if (MARKOV_COMORB_MULT[id]) {
      comorbMult = Math.max(comorbMult, MARKOV_COMORB_MULT[id]);
    }
  }

  // Apply modulation to forward transitions (i > currentState)
  const modRow = baseRow.slice();
  for (let j = currentState + 1; j < 6; j++) {
    modRow[j] *= riskFactor * comorbMult;
  }
  // Reduce backward transitions
  for (let j = 0; j < currentState; j++) {
    modRow[j] /= riskFactor;
  }

  // Renormalize
  const total = modRow.reduce((a, b) => a + b, 0);
  for (let j = 0; j < 6; j++) modRow[j] /= total;

  // Project 10 years
  let prob = [0, 0, 0, 0, 0, 0];
  prob[currentState] = 1.0;
  for (let year = 0; year < 10; year++) {
    const newProb = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i++) {
      if (prob[i] < 0.001) continue;
      const row = MARKOV_BASE[i].slice();
      // Apply modulation
      for (let j = i + 1; j < 6; j++) row[j] *= riskFactor * comorbMult;
      for (let j = 0; j < i; j++) row[j] /= riskFactor;
      const rt = row.reduce((a, b) => a + b, 0);
      for (let j = 0; j < 6; j++) {
        newProb[j] += prob[i] * (row[j] / rt);
      }
    }
    prob = newProb;
  }

  return { currentState, prob, modRow };
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════
function getClassification(score, source) {
  if (source === 'T') {
    if (score <= 40) return { level:'FAIBLE', color:'var(--green)', bg:'var(--l-green)', emoji:'&#x1F7E2;', prob:'< 8%', border:'#9AE6B4' };
    if (score <= 80) return { level:'MODERE', color:'#D69E2E', bg:'var(--l-yellow)', emoji:'&#x1F7E1;', prob:'8-22%', border:'#FAF089' };
    if (score <= 120) return { level:'ELEVE', color:'var(--orange)', bg:'var(--l-orange)', emoji:'&#x1F7E0;', prob:'22-47%', border:'#FBD38D' };
    if (score <= 160) return { level:'TRES ELEVE', color:'var(--red)', bg:'var(--l-red)', emoji:'&#x1F534;', prob:'47-71%', border:'#FEB2B2' };
    return { level:'CRITIQUE', color:'var(--purple)', bg:'var(--l-purple)', emoji:'&#x1F6A8;', prob:'> 71%', border:'#D6BCFA' };
  }
  // Source = C (sur 150)
  if (score < 40) return { level:'FAIBLE', color:'var(--green)', bg:'var(--l-green)', emoji:'&#x1F7E2;', prob:'< 8%' };
  if (score < 70) return { level:'MODERE', color:'#D69E2E', bg:'var(--l-yellow)', emoji:'&#x1F7E1;', prob:'8-22%' };
  if (score < 100) return { level:'ELEVE', color:'var(--orange)', bg:'var(--l-orange)', emoji:'&#x1F7E0;', prob:'22-47%' };
  if (score < 130) return { level:'TRES ELEVE', color:'var(--red)', bg:'var(--l-red)', emoji:'&#x1F534;', prob:'47-71%' };
  return { level:'CRITIQUE', color:'var(--purple)', bg:'var(--l-purple)', emoji:'&#x1F6A8;', prob:'> 71%' };
}

function getCompositeClass() {
  const c = state.bmn_c;
  const k = state.bmn_k;
  const composite = Math.min(200, c + k * 1.5);
  if (composite < 50) return 'FAIBLE';
  if (composite < 100) return 'MODERE';
  if (composite < 150) return 'ELEVE';
  if (composite < 180) return 'TRES ELEVE';
  return 'CRITIQUE';
}

function getPanelLevel() {
  const cls = getCompositeClass();
  if (cls === 'FAIBLE') return state.sii >= 2 ? 5 : 0;
  if (cls === 'MODERE') return 10;
  return 15;
}

// ═══════════════════════════════════════════════════════════════════
// UPDATE SIDEBAR
// ═══════════════════════════════════════════════════════════════════
function updateSidebar() {
  const c = state.bmn_c;
  const k = state.bmn_k;
  const b = state.bmn_b;

  document.getElementById('sCval').textContent = c;
  document.getElementById('sCbar').style.width = (c / 150 * 100) + '%';
  document.getElementById('sKval').textContent = k;
  document.getElementById('sKbar').style.width = (k / 50 * 100) + '%';
  document.getElementById('sBval').textContent = b > 0 ? b : '-';
  document.getElementById('sBbar').style.width = b + '%';

  if (state.step === 5) {
    const t = calcBMNT();
    const cls = getClassification(t, 'T');
    document.getElementById('bmnTNum').textContent = t;
    document.getElementById('bmnTBox').style.background = cls.bg;
    document.getElementById('bmnTBox').style.color = cls.color;
    document.getElementById('riskBadge').style.background = cls.bg;
    document.getElementById('riskBadge').style.color = cls.color;
    document.getElementById('riskBadge').innerHTML = cls.emoji + ' ' + cls.level + ' &mdash; P obesite ' + cls.prob;
  }

  // CTI / GRI display
  if (state.cti > 0 || state.gri !== 0) {
    document.getElementById('ctiGriCard').style.display = 'block';
    document.getElementById('ctiVal').textContent = Math.round(state.cti);
    document.getElementById('ctiBar').style.width = state.cti + '%';
    const cti = state.cti;
    document.getElementById('ctiWindow').textContent =
      cti < 20 ? 'Ouverte' : cti < 40 ? 'Debutante' : cti < 55 ? 'Avancee' : 'FERMEE';

    const gri = state.gri;
    document.getElementById('griVal').textContent = gri.toFixed(1);
    document.getElementById('griBar').style.width = Math.max(0, Math.min(100, gri * 20 + 20)) + '%';
    document.getElementById('griLevel').textContent =
      gri >= 2.5 ? 'Excellent' : gri >= 1.5 ? 'Bon' : gri >= 0.5 ? 'Modere' : gri >= 0 ? 'Faible' : 'Negatif';
  }
}

// ═══════════════════════════════════════════════════════════════════
// ETAPE 3 — CLASSIFICATION INTERMEDIAIRE C+K
// ═══════════════════════════════════════════════════════════════════
function renderStep3() {
  const c = state.bmn_c;
  const k = state.bmn_k;
  const classC = getClassification(c, 'C');
  const classK = k > 30 ? { level:'MAJEUR', color:'var(--red)', bg:'var(--l-red)', emoji:'&#x1F534;' } :
                 k > 15 ? { level:'MODERE', color:'var(--orange)', bg:'var(--l-orange)', emoji:'&#x1F7E0;' } :
                 k > 0  ? { level:'FAIBLE', color:'#D69E2E', bg:'var(--l-yellow)', emoji:'&#x1F7E1;' } :
                          { level:'NUL', color:'var(--green)', bg:'var(--l-green)', emoji:'&#x1F7E2;' };

  const composite = getCompositeClass();
  const compositeInfo = {
    'FAIBLE':      { color:'var(--green)', bg:'var(--l-green)', border:'#9AE6B4', emoji:'&#x1F7E2;', prob:'< 8%', desc:'Risque faible confirme. Bilan biologique conditionnel (SII).' },
    'MODERE':      { color:'#D69E2E', bg:'var(--l-yellow)', border:'#FAF089', emoji:'&#x1F7E1;', prob:'8-22%', desc:'Risque modere. Panel Biologique Tier 2A/2B obligatoire.' },
    'ELEVE':       { color:'var(--orange)', bg:'var(--l-orange)', border:'#FBD38D', emoji:'&#x1F7E0;', prob:'22-47%', desc:'Risque eleve. Panel Biologique Tier 2B complet obligatoire.' },
    'TRES ELEVE':  { color:'var(--red)', bg:'var(--l-red)', border:'#FEB2B2', emoji:'&#x1F534;', prob:'47-71%', desc:'Risque tres eleve. Panel Tier 2C + CTI + GRI obligatoires.' },
    'CRITIQUE':    { color:'var(--purple)', bg:'var(--l-purple)', border:'#D6BCFA', emoji:'&#x1F6A8;', prob:'> 71%', desc:'CRITIQUE. Panel Tier 2D complet + genetique + protocole recherche.' },
  }[composite];

  document.getElementById('synthGrid').innerHTML = `
    <div class="synth-card" style="background:${classC.bg};border-color:${classC.color};">
      <h4 style="color:${classC.color};">BMN-C Clinique</h4>
      <div class="val" style="color:${classC.color};">${c}</div>
      <div class="max">/150 pts</div>
      <div class="level" style="color:${classC.color};">${classC.emoji} ${classC.level}</div>
    </div>
    <div class="synth-card" style="background:${classK.bg};border-color:${classK.color};">
      <h4 style="color:${classK.color};">BMN-K Comorbidites</h4>
      <div class="val" style="color:${classK.color};">${k}</div>
      <div class="max">/50 pts</div>
      <div class="level" style="color:${classK.color};">${classK.emoji} ${classK.level}</div>
    </div>
  `;

  document.getElementById('classificationResult').innerHTML = `
    <div class="classification-result" style="background:${compositeInfo.bg};border-color:${compositeInfo.color};">
      <div class="cr-emoji">${compositeInfo.emoji}</div>
      <div class="cr-level" style="color:${compositeInfo.color};">CLASSIFICATION INTERMEDIAIRE : ${composite}</div>
      <div class="cr-prob" style="color:${compositeInfo.color};">Probabilite obesite a 10 ans : ${compositeInfo.prob}</div>
      <div class="cr-sub">${compositeInfo.desc}</div>
      ${k > 30 ? `<div style="margin-top:10px;padding:8px 16px;background:rgba(192,57,43,0.1);border-radius:8px;font-size:12px;font-weight:700;color:var(--red);">&#x26A1; COMORBIDITY FLOOR ACTIF &mdash; BMN-T minimum garanti >= MODERE</div>` : ''}
    </div>
  `;

  // Signals
  const allComobs = [...COMORBIDITIES.diseases, ...COMORBIDITIES.phenotypes, ...COMORBIDITIES.treatments];
  const signals = state.comorbIds.map(id => {
    const cm = allComobs.find(x => x.id === id);
    return cm ? `<span class="marker-tag mt-obligatoire">&#x26A0;&#xFE0F; ${cm.name} (${cm.or})</span>` : '';
  });
  if (state.bmn_c > 100) signals.push(`<span class="marker-tag mt-obligatoire">&#x1F534; BMN-C CRITIQUE (${state.bmn_c}/150)</span>`);
  if (state.bmn_c > 70) signals.push(`<span class="marker-tag mt-recommande">&#x1F7E0; BMN-C Eleve &mdash; Tour taille critique</span>`);
  if (state.sii >= 2) signals.push(`<span class="marker-tag mt-recommande">&#x1F52C; SII=${state.sii}/7 &mdash; Panel biologique obligatoire</span>`);
  if (state.cti > 40) signals.push(`<span class="marker-tag mt-obligatoire">&#x26A1; CTI=${Math.round(state.cti)} &mdash; Chronicisation avancee</span>`);
  if (state.gri >= 1.5) signals.push(`<span class="marker-tag mt-optionnel">&#x1F489; GRI=${state.gri.toFixed(1)} &mdash; GLP-1 recommande</span>`);
  document.getElementById('signalsList').innerHTML = signals.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${signals.join('')}</div>`
    : `<p style="font-size:12px;color:var(--muted);">Aucun signal d'alarme specifique detecte.</p>`;

  // Bilan prescrit
  const panel = getPanelLevel();
  state.panelLevel = panel;
  renderBilanTable(panel, composite);
}

function renderBilanTable(panel, composite) {
  const panelMarkers = BIO_MARKERS.filter(m => m.panel <= Math.max(5, panel));

  let html = '';
  if (panel === 0) {
    html = `<div class="alert" style="background:var(--l-green);border-left:4px solid var(--green);">
      <div class="alert-icon">&#x2705;</div>
      <div class="alert-body">
        <strong>Bilan Optionnel &mdash; Profil Faible Risque Confirme</strong>
        SII = ${state.sii}/7 (seuil : 2). Aucun critere independant detecte. Bilan recommande si premiere evaluation.
        <br>Ordonner a minima : HbA1c + Glycemie + TSH + Bilan lipidique.
      </div>
    </div>`;
  } else {
    const tierName = panel <= 5 ? 'Tier 2A &mdash; Panel de Base' :
                     panel <= 10 ? 'Tier 2B &mdash; Panel Intermediaire' :
                     'Tier 2C/2D &mdash; Panel Complet (15 marqueurs)';
    html = `
      <div class="info-box" style="background:var(--l-blue);border-left-color:var(--blue);margin-bottom:12px;">
        <strong>${tierName}</strong>
        Classification composite ${composite} &rarr; Ordonnance medicale ${panel > 5 ? 'OBLIGATOIRE' : 'recommandee si SII >= 2'}.
      </div>
      <table class="bilan-table">
        <thead><tr><th>#</th><th>Biomarqueur</th><th>Unite</th><th>Seuil Normal</th><th>Seuil Alarme</th><th>Poids (w)</th><th>Priorite</th></tr></thead>
        <tbody>
          ${panelMarkers.map((m, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${m.name}</strong><br><span style="font-size:10px;color:var(--muted);">${m.label}</span></td>
              <td>${m.unit}</td>
              <td style="color:var(--green);font-weight:600;">${m.normal}</td>
              <td style="color:var(--red);font-weight:600;">${m.abnorm}</td>
              <td style="font-family:'DM Mono',monospace;font-weight:700;">${m.w}</td>
              <td><span class="marker-tag ${m.panel <= 5 ? 'mt-obligatoire' : m.panel <= 10 ? 'mt-recommande' : 'mt-optionnel'}">${m.panel <= 5 ? 'Prioritaire' : m.panel <= 10 ? 'Recommande' : 'Complet'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  document.getElementById('bilanPrescrit').innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
// ETAPE 4 — BMN-B SAISIE BIOLOGIQUE
// ═══════════════════════════════════════════════════════════════════
function renderStep4() {
  const panel = state.panelLevel || 5;
  const markers = BIO_MARKERS.filter(m => m.panel <= Math.max(5, panel));
  const cls = getCompositeClass();

  let html = `
    <div class="alert" style="background:var(--l-blue);border-left:4px solid var(--blue);">
      <div class="alert-icon">&#x1F4CB;</div>
      <div class="alert-body">
        <strong>Panel ${panel <= 5 ? 'Tier 2A' : panel <= 10 ? 'Tier 2B' : 'Tier 2C/2D'} &mdash; Classification intermediaire : ${cls}</strong>
        Saisir les resultats disponibles. Les marqueurs non saisis sont exclus du calcul (denominateur adaptatif).
      </div>
    </div>
    <div class="section-block"><h3>&#x1FA78; Resultats Biologiques</h3><div class="form-grid">
  `;
  markers.forEach(m => {
    html += `
      <div class="form-group">
        <label>${m.name} (${m.unit}) <span class="label-ref">Normal: ${m.normal}</span></label>
        <input type="number" id="bio_${m.id}" placeholder="Laisser vide si non disponible"
          step="0.01" oninput="recalcB()" style="border-left:3px solid ${m.panel <= 5 ? 'var(--red)' : m.panel <= 10 ? 'var(--orange)' : 'var(--blue)'}">
      </div>
    `;
  });
  html += `</div></div>
    <div class="section-block"><h3>&#x1F504; Retrovalidation Biologique</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">La biologie corrige automatiquement les incoherences declaratives (6 regles).</p>
    <div id="retroValid"></div></div>`;
  document.getElementById('bioPanel').innerHTML = html;

  // Restore saved values
  Object.keys(state.bioValues).forEach(id => {
    const inp = document.getElementById('bio_' + id);
    if (inp) inp.value = state.bioValues[id];
  });
  recalcB();
}

// ═══════════════════════════════════════════════════════════════════
// ETAPE 5 — STRATEGIE FINALE BMN-T
// ═══════════════════════════════════════════════════════════════════
function renderStep5() {
  const t = calcBMNT();
  const cls = getClassification(t, 'T');
  const c = state.bmn_c;
  const k = state.bmn_k;
  const b = state.bmn_b;
  const cti = Math.round(state.cti);
  const gri = state.gri;
  const allComobs = [...COMORBIDITIES.diseases, ...COMORBIDITIES.phenotypes, ...COMORBIDITIES.treatments];
  const activeComobs = state.comorbIds.map(id => allComobs.find(x => x.id === id)).filter(Boolean);

  // Markov projection
  const markov = calcMarkov();

  const strategies = getStrategy(t, cls.level, cti, gri, activeComobs);

  let html = `
    <div class="final-header">
      <h2>${cls.emoji} Score BMN-T : ${t} / 200 &mdash; ${cls.level}</h2>
      <p>Probabilite obesite a 10 ans : ${cls.prob} &middot; Architecture ABCKO</p>
      <div class="final-scores-row">
        <div class="fs-item"><div class="fs-label">BMN-C</div><div class="fs-val">${c}</div><div class="fs-sub">/150 Clinique</div></div>
        <div class="fs-item"><div class="fs-label">BMN-K</div><div class="fs-val">${k}</div><div class="fs-sub">/50 Comorbidites</div></div>
        <div class="fs-item"><div class="fs-label">BMN-B</div><div class="fs-val">${b > 0 ? b : '-'}</div><div class="fs-sub">/100 Biologie</div></div>
        <div class="fs-item"><div class="fs-label">CTI</div><div class="fs-val">${cti}</div><div class="fs-sub">${cti < 20 ? 'Ouverte' : cti < 40 ? 'Debut.' : cti < 55 ? 'Avancee' : 'Fermee'}</div></div>
        <div class="fs-item"><div class="fs-label">GRI</div><div class="fs-val">${gri.toFixed(1)}</div><div class="fs-sub">${gri >= 2.5 ? 'Excellent' : gri >= 1.5 ? 'Bon' : gri >= 0.5 ? 'Modere' : 'Faible'}</div></div>
      </div>
    </div>
  `;

  // Markov visualization
  html += `<div class="section-block"><h3>&#x1F4C8; Projection Markov 10 Ans (6 Etats)</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px;">P_ij(BMN,K) = P_ij(base) &times; exp(&#x03B8;<sub>BMN</sub>&times;BMN_T/100) &times; exp(&#x03B8;<sub>K</sub>&times;K_norm/100) &middot; &#x03B8;<sub>BMN</sub>=0.68, &#x03B8;<sub>K</sub>=0.35</p>`;
  const colors = ['var(--green)', 'var(--green-light)', '#D69E2E', 'var(--orange)', 'var(--red)', 'var(--purple)'];
  markov.prob.forEach((p, i) => {
    const pct = (p * 100).toFixed(1);
    html += `<div class="markov-state"><div class="markov-state-label" style="color:${colors[i]}">${MARKOV_STATES[i]}${i === markov.currentState ? ' &#x25C0;' : ''}</div><div class="markov-state-bar"><div class="markov-state-bar-fill" style="width:${pct}%;background:${colors[i]}"></div></div><div class="markov-state-pct" style="color:${colors[i]}">${pct}%</div></div>`;
  });
  html += `<p style="font-size:11px;color:var(--muted);margin-top:8px;">P(obesite a 10 ans) = <strong style="color:var(--red);font-family:'DM Mono',monospace;">${((markov.prob[4]+markov.prob[5])*100).toFixed(1)}%</strong></p></div>`;

  // Comorbidities risk summary
  if (activeComobs.length > 0) {
    html += `<div class="section-block"><h3>&#x2695;&#xFE0F; Risques de Complications Detectes</h3>
      <table class="bilan-table"><thead><tr><th>Comorbidite</th><th>Risque DT2 10ans</th><th>Risque CV (RR)</th><th>CTI Amp.</th><th>GRI Impact</th></tr></thead><tbody>
        ${activeComobs.map(c => `<tr>
          <td><strong>${c.name}</strong></td>
          <td style="color:${c.dtRisk !== '-' ? 'var(--red)' : 'var(--muted)'};font-weight:${c.dtRisk !== '-' ? '700' : '400'};">${c.dtRisk}</td>
          <td style="color:${c.cvRisk !== '-' ? 'var(--orange)' : 'var(--muted)'};">${c.cvRisk}</td>
          <td style="color:var(--red);">x${c.ctiAmp}</td>
          <td style="color:${c.gri > 0 ? 'var(--green)' : c.gri < 0 ? 'var(--red)' : 'var(--muted)'};">${c.gri > 0 ? '+' : ''}${c.gri}</td>
        </tr>`).join('')}
      </tbody></table></div>`;
  }

  // Strategy timeline
  html += `<div class="section-block"><h3>&#x1F3AF; Plan Therapeutique Personnalise</h3><div class="strategy-timeline">`;
  strategies.forEach((s, i) => {
    html += `<div class="st-item"><div class="st-dot" style="background:${s.color};">${i + 1}</div><div class="st-content"><h4>${s.icon} ${s.title}</h4><p>${s.desc}</p>${s.items ? `<ul>${s.items.map(it => `<li>${it}</li>`).join('')}</ul>` : ''}</div></div>`;
  });
  html += `</div></div>`;

  // GRI recommendation card
  if (gri >= 1.5) {
    html += `<div class="strategy-card" style="background:var(--l-green);border-color:var(--green);">
      <div class="sc-header"><div class="sc-icon">&#x1F489;</div><div><div class="sc-title" style="color:var(--green);">GLP-1 Recommande &mdash; GRI ${gri.toFixed(1)}</div><div class="sc-sub">Profil de reponse pharmacologique favorable documente</div></div></div>
      <div class="sc-items">
        ${gri >= 2.5 ? `<div class="sc-item"><div class="sc-item-icon">&#x2705;</div><div class="sc-item-text"><strong>Excellent repondeur (GRI >= 2.5)</strong><span>Perte ponderale predite > 15% a 1 an. Tirzepatide si HOMA-IR > 4. Semaglutide en alternative.</span></div></div>` :
        `<div class="sc-item"><div class="sc-item-icon">&#x2714;&#xFE0F;</div><div class="sc-item-text"><strong>Bon repondeur (GRI 1.5-2.4)</strong><span>Perte ponderale predite 10-15% a 1 an. Semaglutide 2.4 mg hebdomadaire.</span></div></div>`}
        ${state.comorbIds.includes('sopk') ? `<div class="sc-item"><div class="sc-item-icon">&#x2640;&#xFE0F;</div><div class="sc-item-text"><strong>SOPK</strong><span>Metformine + Sitagliptine 1ere intention. GLP-1RA en 2e intention. Amelioration sensibilite insulinique + regularisation cycles.</span></div></div>` : ''}
        ${state.comorbIds.includes('nafld') ? `<div class="sc-item"><div class="sc-item-icon">&#x1FAC0;</div><div class="sc-item-text"><strong>NAFLD/MAFLD</strong><span>GLP-1RA reduit steatose hepatique independamment du poids (Armstrong Hepatology 2016).</span></div></div>` : ''}
      </div>
    </div>`;
  }

  // CTI warning card
  if (cti > 40) {
    html += `<div class="strategy-card" style="background:var(--l-red);border-color:var(--red);">
      <div class="sc-header"><div class="sc-icon">&#x26A1;</div><div><div class="sc-title" style="color:var(--red);">CTI ${cti} &mdash; Chronicisation ${cti > 55 ? 'ETABLIE' : 'AVANCEE'}</div><div class="sc-sub">Fenetre therapeutique ${cti > 55 ? 'FERMEE' : 'en cours de fermeture'}</div></div></div>
      <div class="sc-items">
        ${cti > 55 ? `<div class="sc-item"><div class="sc-item-icon">&#x1FA79;</div><div class="sc-item-text"><strong>Chirurgie bariatrique a evaluer</strong><span>CTI > 55 = obesite chronique etablie. Mecanismes epigenetiques + resistance leptinique ancres. GLP-1 seul insuffisant. Sleeve / bypass selon profil.</span></div></div>` :
        `<div class="sc-item"><div class="sc-item-icon">&#x26A0;&#xFE0F;</div><div class="sc-item-text"><strong>Intervention urgente &mdash; Fenetre en fermeture</strong><span>Programme multimodal intensif. Reevaluation CTI a 6 mois.</span></div></div>`}
      </div>
    </div>`;
  }

  html += `<div style="margin-top:20px;padding:16px 20px;background:var(--subtle);border-radius:12px;border:1px solid var(--border);font-size:11px;color:var(--muted);">
    <strong style="color:var(--navy);display:block;margin-bottom:4px;">Score BMN v2.0 &mdash; Bach &middot; Manos &middot; Noel</strong>
    Architecture ABCKO &middot; 4 modules &middot; 25 indicateurs &middot; 11 comorbidites &middot; 15 biomarqueurs &middot; 9 groupes ethniques &times; 8 multiplicateurs<br>
    Ponderation dynamique tri-source &middot; Retrovalidation biologique (6 regles) &middot; Comorbidity Floor &middot; Markov 6 etats &middot; CTI &middot; GRI<br>
    Emirates Specialty Hospital, Dubai &middot; ELSAN Clinique Bouchard, Marseille &middot; Qatar
  </div>`;

  document.getElementById('finalResult').innerHTML = html;

  // Update Markov sidebar card
  const markovCard = document.getElementById('markovCard');
  if (markovCard) {
    markovCard.style.display = 'block';
    let mc = '<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">Projection 10 ans</div>';
    markov.prob.forEach((p, i) => {
      mc += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="font-size:10px;min-width:80px;color:${colors[i]}">${MARKOV_STATES[i]}</span><span style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;color:${colors[i]}">${(p*100).toFixed(1)}%</span></div>`;
    });
    document.getElementById('markovBody').innerHTML = mc;
  }

  updateSidebar();
}

function getStrategy(t, level, cti, gri, activeComobs) {
  const base = [];
  if (level === 'FAIBLE') {
    base.push({ color:'var(--green)', icon:'&#x2705;', title:'Surveillance Standard', desc:'Profil a faible risque confirme. Pas de traitement pharmacologique indique.',
      items:['Reevaluation BMN-C dans 3 ans','Conseils lifestyle : alimentation mediterraneenne + AP >= 150 min/sem','Recalcul BMN si prise de poids > 3 kg ou nouvelle comorbidite'] });
  } else if (level === 'MODERE') {
    base.push({ color:'#D69E2E', icon:'&#x1F4CB;', title:'Programme Lifestyle Structure', desc:'Prise en charge ambulatoire dieteticienne + medecin. Objectif : reduire BMN-C de 20% en 6 mois.',
      items:['Consultation dieteticienne mensuelle x3 mois','Programme AP structure : 150-300 min/sem aerobie','Score DQI-BMN cible < 5 en 3 mois','Reduction apport calorique -500 kcal/j'] });
    base.push({ color:'var(--blue)', icon:'&#x1F9EA;', title:'Suivi Biologique Annuel', desc:'Panel Tier 2A/2B. Surveillance HOMA-IR, HbA1c, bilan lipidique.',
      items:['Reevaluation BMN-B dans 12 mois','Si progression : passer Panel Tier 2B','Traitement comorbidites decelees'] });
  } else if (level === 'ELEVE') {
    base.push({ color:'var(--orange)', icon:'&#x26A1;', title:'Programme Intensif Multidisciplinaire', desc:'Medecin + diet. + kinesitherapeute. Suivi trimestriel obligatoire.',
      items:['Consultation equipe mensuelle x6 mois','Programme AP supervise + coach','Alimentation : restriction calorique moderee -500 kcal/j + mediterraneenne stricte','Traitement SAOS si IAH > 15 (CPAP)','Traitement SOPK si applicable (metformine 1ere intention)'] });
    if (gri >= 1.5) base.push({ color:'var(--green)', icon:'&#x1F489;', title:'GLP-1 a Discuter', desc:`GRI ${gri.toFixed(1)} : profil de reponse favorable.`,
      items:['Semaglutide 0.25 mg -> 2.4 mg (titration 16 sem)','Objectif : perte >= 10% poids a 6 mois','Suivi HbA1c, PA, bilan hepatique a 3 mois'] });
    base.push({ color:'var(--blue)', icon:'&#x1F52C;', title:'Bilan Tier 2B Complet', desc:'Panel 10+ marqueurs. Recherche IR + MetS + comorbidites silencieuses.',
      items:['HOMA-IR, TG/HDL, adiponectine, ASAT/ALAT','FibroScan si transaminases elevees','Cortisol salivaire si CTI eleve'] });
  } else {
    base.push({ color:'var(--red)', icon:'&#x1F6A8;', title:`PRISE EN CHARGE URGENTE &mdash; ${level}`, desc:'Equipe multidisciplinaire. Premier RDV dans les 2 semaines.',
      items:['Consultation endocrinologie + medecin obesite','Bilan Tier 2C/2D complet (15 marqueurs)','Evaluation chirurgie bariatrique si CTI > 55','CTI + GRI calcules systematiquement'] });
    if (gri >= 1.5) {
      base.push({ color:'var(--green)', icon:'&#x1F489;', title:'GLP-1 Prioritaire', desc:`GRI ${gri.toFixed(1)} : excellent profil de reponse.`,
        items:['Tirzepatide si HOMA-IR > 4 (double action GIP/GLP-1)','Semaglutide 2.4 mg si SOPK ou NAFLD dominant','Objectif : perte >= 15% poids a 12 mois','Monitoring HbA1c, PA, ASAT trimestriel'] });
    }
    if (cti > 55 || gri < 0.5) {
      base.push({ color:'var(--purple)', icon:'&#x1FA79;', title:'Chirurgie Bariatrique a Evaluer', desc:`CTI ${cti} &mdash; Fenetre therapeutique fermee.`,
        items:['Sleeve gastrectomy / bypass selon profil','Evaluation psychologique preoperatoire','Bilan nutritionnel + carence pre-op','Enrolement protocole recherche BMN Phase 2'] });
    }
    base.push({ color:'var(--navy)', icon:'&#x1F9EC;', title:'Protocole Recherche', desc:'Enrolement cohorte BMN. Genetique FTO. Microbiote 16S ARNr.',
      items:['Contact DIM Emirates / Clinique Bouchard','Consentement eclaire protocole prospectif','TDEE mesure (calorimetrie indirecte)','Suivi BMN-T a 3, 6, 12, 18 mois'] });
  }

  // Comorbidity-specific strategies
  if (activeComobs.some(x => x.id === 'hypo')) {
    base.push({ color:'var(--teal)', icon:'&#x1F98B;', title:'Hypothyroidie', desc:'TSH > 4 mUI/L documentee.',
      items:['Levothyroxine &mdash; demarrer a 25 ug/j','Titration progressive, TSH cible 1-2 mUI/L','Reevaluation BMN-C dans 6 mois apres correction'] });
  }
  if (activeComobs.some(x => x.id === 'saos')) {
    base.push({ color:'var(--teal)', icon:'&#x1F634;', title:'SAOS', desc:'Apnee obstructive &mdash; Composante CTI majeure (x1.4). Reduit HbA1c de 0.4%.',
      items:['Polysomnographie si non faite','CPAP si IAH > 15','Perte poids de 10% reduit IAH de 30%','Reevaluation CTI a 6 mois post-CPAP'] });
  }
  if (activeComobs.some(x => x.id === 'cortis')) {
    base.push({ color:'var(--teal)', icon:'&#x1F48A;', title:'Corticotherapie', desc:'Adipogenese viscerale iatrogene. IR steroidienne.',
      items:['Metformine preventive si corticotherapie > 3 mois','Suivi glycemique trimestriel','Discussion reduction posologie avec prescripteur'] });
  }
  if (activeComobs.some(x => x.id === 'predmt')) {
    base.push({ color:'var(--teal)', icon:'&#x1F6A6;', title:'Pre-diabete', desc:'Programme DPP &mdash; Reduction risque DT2 de 58% par lifestyle.',
      items:['Lifestyle prioritaire (alimentation + AP)','GLP-1 ou metformine si BMN-T > 100','Surveillance HbA1c tous les 6 mois','Objectif : HbA1c < 5.7%'] });
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════
function goStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.hstep').forEach(h => { h.classList.remove('active', 'done'); });
  document.getElementById('step' + n).classList.add('active', 'fade-in');
  state.step = n;
  for (let i = 1; i <= 5; i++) {
    const hs = document.getElementById('hs' + i);
    if (i < n) hs.classList.add('done');
    else if (i === n) hs.classList.add('active');
  }
  document.getElementById('progressFill').style.width = (n * 20) + '%';
  if (n === 3) renderStep3();
  if (n === 4) renderStep4();
  if (n === 5) renderStep5();
  updateSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAll() {
  if (!confirm('Reinitialiser toutes les donnees du patient ?')) return;
  state = { step:1, bmn_c:0, bmn_k:0, bmn_b:0, bmn_t:0, cti:0, gri:0, comorbIds:[], panelLevel:5, bioValues:{}, sii:0 };
  document.getElementById('age').value = 42;
  document.getElementById('imc').value = 26.5;
  document.getElementById('tt').value = 88;
  document.getElementById('taille').value = 165;
  document.getElementById('ap').value = 90; document.getElementById('apVal').textContent = 90;
  document.getElementById('assis').value = 7; document.getElementById('assisVal').textContent = 7;
  document.getElementById('sommeil').value = 7; document.getElementById('sommeilVal').textContent = 7;
  document.getElementById('alimentation').value = 8; document.getElementById('alimVal').textContent = 8;
  document.getElementById('stress').value = 14; document.getElementById('stressVal').textContent = 14;
  document.getElementById('phq9').value = 5; document.getElementById('phq9Val').textContent = 5;
  document.getElementById('bes').value = 2; document.getElementById('besVal').textContent = 2;
  document.getElementById('isi').value = 8; document.getElementById('isiVal').textContent = 8;
  document.getElementById('ethnie').value = 'eu';
  document.getElementById('sexe').value = 'f';
  document.getElementById('parent_obes').value = '0';
  document.getElementById('obes_enfance').value = '0';
  document.getElementById('diab_parent').value = '0';
  document.getElementById('tabac').value = '0';
  document.getElementById('alcool').value = '0';
  document.getElementById('nuit').value = '0';
  document.getElementById('pe').value = '0';
  document.getElementById('socio').value = '0';
  document.getElementById('yoyo').value = '0';
  document.getElementById('ctiGriCard').style.display = 'none';
  document.getElementById('markovCard').style.display = 'none';
  buildComorbGrid();
  goStep(1);
  recalcC();
}

// ═══════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════
init();
