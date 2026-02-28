// ═══════════════════════════════════════════════════════════════════════════════
// SCORE BMN v2.0 ENRICHI — MOTEUR ALGORITHMIQUE COMPLET
// Architecture ABCKO+ : 8 etapes intelligentes
// Anthropometrie > Exposome > Travail > Mode de Vie > Mental > Comorbidites > Bio > Score Final
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. ETHNIES (9 groupes x 8+ multiplicateurs) ───
const ETHNICITY = {
  eu: { name:'Europeen',          bmiOW:25, bmiOB:30,  ttF:88, ttM:102, diabRisk:1.0, htaRisk:1.0, cvRisk:1.0, inflam:1.0, evAdj:0 },
  im: { name:'Indo-Mauricien',    bmiOW:23, bmiOB:27.5,ttF:80, ttM:90,  diabRisk:2.0, htaRisk:1.2, cvRisk:1.4, inflam:1.2, evAdj:-1.5 },
  cr: { name:'Creole Mauricien',  bmiOW:25, bmiOB:30,  ttF:84, ttM:94,  diabRisk:1.3, htaRisk:1.4, cvRisk:1.2, inflam:1.2, evAdj:-2.0 },
  si: { name:'Sino-Mauricien',    bmiOW:23, bmiOB:27.5,ttF:80, ttM:90,  diabRisk:1.0, htaRisk:0.9, cvRisk:0.6, inflam:0.9, evAdj:1.5 },
  sa: { name:'Sud-Asiatique',     bmiOW:23, bmiOB:27.5,ttF:80, ttM:90,  diabRisk:2.0, htaRisk:1.3, cvRisk:1.5, inflam:1.2, evAdj:-1.5 },
  af: { name:'Africain',          bmiOW:25, bmiOB:30,  ttF:88, ttM:102, diabRisk:1.3, htaRisk:1.5, cvRisk:1.2, inflam:1.3, evAdj:-1.5 },
  ea: { name:'Est-Asiatique',     bmiOW:23, bmiOB:27.5,ttF:80, ttM:88,  diabRisk:0.9, htaRisk:0.9, cvRisk:0.7, inflam:0.9, evAdj:1.5 },
  se: { name:'Sud-Est Asiatique', bmiOW:23, bmiOB:27.5,ttF:80, ttM:90,  diabRisk:1.2, htaRisk:1.0, cvRisk:1.0, inflam:1.0, evAdj:0 },
  fm: { name:'Franco-Mauricien',  bmiOW:25, bmiOB:30,  ttF:88, ttM:102, diabRisk:0.8, htaRisk:1.0, cvRisk:0.9, inflam:1.0, evAdj:1.0 },
};

// ─── 2. COMORBIDITES (11 maladies + phenotypes + traitements) ───
const COMORBIDITIES = {
  diseases: [
    { id:'dt2',    name:'Diabete Type 2',             pts:14, or:'HR 3.84', desc:'IR severe. Perte esperance vie 8.9 ans.', ctiAmp:1.8, gri:+0.65 },
    { id:'predmt', name:'Pre-diabete (IFG/IGT)',      pts:8,  or:'HR 2.11', desc:'HbA1c 5.7-6.4%. Reversible.', ctiAmp:1.2, gri:+0.82 },
    { id:'hta',    name:'HTA etablie',                pts:10, or:'HR 2.24', desc:'Facteur aggravant obesite viscerale.', ctiAmp:1.1, gri:0 },
    { id:'saos',   name:'SAOS (Apnee du sommeil)',    pts:12, or:'OR 2.19', desc:'IR via hypoxie + cortisol nocturne.', ctiAmp:1.4, gri:0 },
    { id:'sopk',   name:'SOPK (Femme)',               pts:14, or:'OR 2.77', desc:'Phenotype IR feminin. GLP-1 tres efficace.', ctiAmp:1.2, gri:+0.83 },
    { id:'nafld',  name:'NAFLD / Steatose hepatique', pts:10, or:'OR 3.22', desc:'IR hepatique. GLP-1 reduit steatose.', ctiAmp:1.1, gri:+0.66 },
    { id:'hypo',   name:'Hypothyroidie sub-clinique', pts:6,  or:'OR 1.74', desc:'TSH > 4.0. Metabolisme basal -10-15%.', ctiAmp:1.3, gri:0 },
    { id:'mets',   name:'Syndrome metabolique complet',pts:12, or:'HR 2.64', desc:'>= 3 criteres IDF. Cible GLP-1.', ctiAmp:1.3, gri:+0.65 },
  ],
  phenotypes: [
    { id:'monw',   name:'Phenotype MONW',             pts:10, or:'OR 2.38', desc:'IMC < 25 mais >= 2 criteres MetS.', ctiAmp:1.1, gri:+0.70 },
    { id:'ir_occ', name:'IR occulte (TG/HDL > 3.5)',  pts:8,  or:'OR 2.12', desc:'Triade IR non diagnostiquee.', ctiAmp:1.2, gri:+0.55 },
  ],
  treatments: [
    { id:'cortis', name:'Corticoides > 3 mois',       pts:8,  or:'HR 2.12', desc:'Adipogenese viscerale iatrogene.', ctiAmp:1.6, gri:-0.47 },
    { id:'antidep',name:'Antidepresseurs obesogenes',  pts:4,  or:'OR 1.58', desc:'Paroxetine/mirtazapine.', ctiAmp:1.1, gri:0 },
    { id:'depres', name:'Depression majeure traitee',  pts:6,  or:'OR 1.92', desc:'Impact metabolique bidirectionnel.', ctiAmp:1.2, gri:0 },
  ]
};

// ─── 3. BIOMARQUEURS (15 marqueurs) ───
const BIO_MARKERS = [
  { id:'homaIR', name:'HOMA-IR',           unit:'(UIxmU/L)', n:2.5, a:4.0,  w:2.5, inv:false, panel:5,  normal:'< 2.5',  abnorm:'>= 4.0',  label:'Resistance insulinique' },
  { id:'hba1c',  name:'HbA1c',             unit:'%',         n:5.7, a:6.5,  w:2.0, inv:false, panel:5,  normal:'< 5.7',  abnorm:'>= 6.5',  label:'Glycemie chronique' },
  { id:'glyc',   name:'Glycemie a jeun',   unit:'mmol/L',    n:5.6, a:7.0,  w:1.8, inv:false, panel:5,  normal:'< 5.6',  abnorm:'>= 7.0',  label:'Diabete' },
  { id:'crphs',  name:'CRP ultra-sensible',unit:'mg/L',      n:1.0, a:3.0,  w:2.0, inv:false, panel:5,  normal:'< 1.0',  abnorm:'>= 3.0',  label:'Inflammation' },
  { id:'tsh',    name:'TSH',               unit:'mUI/L',     n:4.0, a:8.0,  w:1.3, inv:false, panel:5,  normal:'0.4-4.0',abnorm:'> 4.0',   label:'Thyroide' },
  { id:'ldl',    name:'LDL-C',             unit:'mmol/L',    n:3.0, a:4.1,  w:1.8, inv:false, panel:5,  normal:'< 3.0',  abnorm:'>= 4.1',  label:'LDL atherogene' },
  { id:'hdl',    name:'HDL-C',             unit:'mmol/L',    n:1.0, a:0.7,  w:1.0, inv:true,  panel:5,  normal:'>= 1.0', abnorm:'< 0.7',   label:'Cardioprotection' },
  { id:'tg',     name:'Triglycerides',     unit:'mmol/L',    n:1.7, a:2.3,  w:1.5, inv:false, panel:10, normal:'< 1.7',  abnorm:'>= 2.3',  label:'Dyslipidemie' },
  { id:'adipon', name:'Adiponectine',      unit:'ug/mL',     n:10.0,a:6.0,  w:2.5, inv:true,  panel:10, normal:'>= 10',  abnorm:'< 6.0',   label:'Metab. adipeux' },
  { id:'asat',   name:'ASAT/ALAT',         unit:'UI/L',      n:40,  a:60,   w:1.0, inv:false, panel:10, normal:'< 40',   abnorm:'>= 60',   label:'Foie' },
  { id:'apob',   name:'ApoB',              unit:'g/L',       n:0.9, a:1.2,  w:1.5, inv:false, panel:10, normal:'< 0.9',  abnorm:'>= 1.2',  label:'Atherogenicite' },
  { id:'ggt',    name:'GGT',               unit:'UI/L',      n:50,  a:80,   w:0.8, inv:false, panel:10, normal:'< 50',   abnorm:'>= 80',   label:'Foie / Alcool' },
  { id:'tghdl',  name:'Ratio TG/HDL',      unit:'-',         n:2.0, a:3.5,  w:2.0, inv:false, panel:15, normal:'< 2.0',  abnorm:'>= 3.5',  label:'IR proxy' },
  { id:'urate',  name:'Acide urique',      unit:'umol/L',    n:360, a:420,  w:0.8, inv:false, panel:15, normal:'< 360',  abnorm:'>= 420',  label:'MetS / IR' },
  { id:'leptine',name:'Leptine',            unit:'ng/mL',     n:20,  a:40,   w:1.5, inv:false, panel:15, normal:'< 20',   abnorm:'>= 40',   label:'Resistance leptine' },
];

// ─── 4. MARKOV 6 ETATS ───
const MARKOV_STATES = ['Poids normal','Surpoids debut.','Surpoids etabli','Surpoids eleve','Obesite mod.','Obesite severe'];
const MARKOV_BASE = [
  [0.82, 0.14, 0.03, 0.01, 0.00, 0.00],
  [0.08, 0.68, 0.18, 0.05, 0.01, 0.00],
  [0.02, 0.11, 0.61, 0.21, 0.04, 0.01],
  [0.01, 0.04, 0.14, 0.56, 0.21, 0.04],
  [0.00, 0.01, 0.03, 0.12, 0.65, 0.19],
  [0.00, 0.00, 0.01, 0.03, 0.11, 0.85],
];
const THETA_BMN = 0.68, THETA_K = 0.35;
const MARKOV_COMORB_MULT = { dt2:1.40, sopk:1.30, saos:1.25, mets:1.50 };

// ─── 5. CTI GAMMA ───
const CTI_GAMMA = { duree_surpoids:0.185, yoyo:0.249, resistance_leptine:0.210, microbiote:0.180, cortisol:0.195, metabolisme_basal:0.200, obesite_enfance:0.240 };

// ─── 6. GRI COEFFICIENTS ───
const GRI_FAV = { homaIR_high:1.07, prediabete:0.82, nafld:0.66, sopk:0.83, adiponectine_low:0.62, monw:0.70, mets:0.65, tghdl_high:0.55 };
const GRI_DEF = { cti_high:0.65, cortisol:0.28, imc_40_meca:0.47, corticoides:0.35 };

// ─── 7. EXPOSOME WEIGHTS ───
const EXPOSOME_WEIGHTS = {
  air_quality:     { max:8, inflam:1.30, desc:'Qualite de l\'air (PM2.5, PM10, NO2, O3)' },
  water_quality:   { max:5, inflam:1.10, desc:'Qualite de l\'eau (chlore, metaux, nitrates)' },
  habitat:         { max:8, inflam:1.05, desc:'Habitat (route, industrie, espaces verts)' },
  noise:           { max:4, inflam:1.05, desc:'Pollution sonore (diurne + nocturne)' },
  pe_diet:         { max:6, inflam:1.20, desc:'PE alimentaires (plastiques, conserves, pesticides)' },
  pe_cosm:         { max:4, inflam:1.10, desc:'PE cosmetiques (parabenes, phtalates)' },
  pe_prof:         { max:5, inflam:1.30, desc:'PE professionnels (BPA, solvants)' },
  light:           { max:3, inflam:1.05, desc:'Pollution lumineuse (ecrans, melatonine)' },
  socio:           { max:5, inflam:1.00, desc:'Precarite socio-economique (EPICES)' },
  food_desert:     { max:4, inflam:1.10, desc:'Desert alimentaire (acces fruits/legumes)' },
};

// ─── 8. WORK WEIGHTS ───
const WORK_WEIGHTS = {
  situation:  { max:5, desc:'Situation professionnelle' },
  type:       { max:6, desc:'Type de travail (sedentaire/actif)' },
  hours:      { max:5, desc:'Heures hebdomadaires' },
  commute:    { max:9, desc:'Distance + mode transport + temps trajet' },
  schedule:   { max:5, desc:'Horaires (jour/nuit/poste)' },
  stress:     { max:8, desc:'Stress Karasek (demande x latitude)' },
  meals:      { max:5, desc:'Restauration au travail' },
  posture:    { max:4, desc:'Posture dominante' },
  toxics:     { max:5, desc:'Exposition toxiques' },
  retirement: { max:5, desc:'Impact retraite' },
};

// ═══════════════════════════════════════════════════
// ETAT GLOBAL
// ═══════════════════════════════════════════════════
let state = {
  step: 1, bmn_c: 0, bmn_k: 0, bmn_b: 0, bmn_t: 0,
  cti: 0, gri: 0, comorbIds: [], panelLevel: 5, bioValues: {}, sii: 0,
  exposomeScore: 0, exposomeDetails: {},
  workScore: 0, workDetails: {},
  airQuality: null,
};

// ═══════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════
function gV(id, def) { const e = document.getElementById(id); return e ? +e.value : (def||0); }
function gS(id) { const e = document.getElementById(id); return e ? e.value : '0'; }
function sT(id, v) { const e = document.getElementById(id); if(e) e.textContent = v; }
function sW(id, v) { const e = document.getElementById(id); if(e) e.style.width = v; }
function sH(id, v) { const e = document.getElementById(id); if(e) e.innerHTML = v; }

// ═══════════════════════════════════════════════════
// IMC AUTO-CALC
// ═══════════════════════════════════════════════════
function calcIMC() {
  const p = gV('poids', 72), t = gV('taille', 165) / 100;
  if (t > 0) {
    const imc = (p / (t * t)).toFixed(1);
    const el = document.getElementById('imc');
    if (el) el.value = imc;
  }
}

// ═══════════════════════════════════════════════════
// API QUALITE DE L'AIR (WAQI)
// ═══════════════════════════════════════════════════
async function fetchAirQuality(city) {
  if (!city || city.trim() === '') { sH('aqiStatus', '<span style="color:var(--orange)">Entrez une ville.</span>'); return; }
  sH('aqiStatus', '<span style="color:var(--blue)">&#x23F3; Recherche AQI pour "' + city + '"...</span>');
  try {
    const resp = await fetch('https://api.waqi.info/feed/' + encodeURIComponent(city) + '/?token=demo');
    const data = await resp.json();
    if (data.status === 'ok' && data.data && typeof data.data.aqi === 'number') {
      processAQI(data.data, city);
    } else {
      sH('aqiStatus', '<span style="color:var(--orange)">Ville non trouvee. Essayez: Paris, London, Dubai, Mumbai, Beijing...</span>');
    }
  } catch (e) {
    sH('aqiStatus', '<span style="color:var(--red)">Erreur connexion API: ' + e.message + '</span>');
  }
}

async function fetchAirQualityGeo() {
  if (!navigator.geolocation) { sH('aqiStatus', '<span style="color:var(--red)">Geolocalisation non disponible.</span>'); return; }
  sH('aqiStatus', '<span style="color:var(--blue)">&#x1F4CD; Localisation GPS en cours...</span>');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const r = await fetch('https://api.waqi.info/feed/geo:' + pos.coords.latitude + ';' + pos.coords.longitude + '/?token=demo');
      const d = await r.json();
      if (d.status === 'ok' && d.data) processAQI(d.data, 'GPS');
      else sH('aqiStatus', '<span style="color:var(--orange)">Pas de station AQI a proximite.</span>');
    } catch (e) {
      sH('aqiStatus', '<span style="color:var(--red)">Erreur: ' + e.message + '</span>');
    }
  }, () => sH('aqiStatus', '<span style="color:var(--red)">Permission GPS refusee.</span>'));
}

function processAQI(data, fallback) {
  state.airQuality = {
    aqi: data.aqi,
    city: data.city?.name || fallback,
    pm25: data.iaqi?.pm25?.v ?? null,
    pm10: data.iaqi?.pm10?.v ?? null,
    no2: data.iaqi?.no2?.v ?? null,
    o3: data.iaqi?.o3?.v ?? null,
    so2: data.iaqi?.so2?.v ?? null,
    co: data.iaqi?.co?.v ?? null,
    time: data.time?.s || new Date().toLocaleString('fr-FR'),
  };
  renderAQIResult();
  recalcExposome();
}

function renderAQIResult() {
  const aq = state.airQuality;
  if (!aq) return;
  const aqi = aq.aqi;
  let level, color, bg, risk, healthMsg;
  if (aqi <= 50) { level='Bon'; color='var(--green)'; bg='var(--l-green)'; risk=0; healthMsg='Impact minimal sur le metabolisme'; }
  else if (aqi <= 100) { level='Modere'; color='#D69E2E'; bg='var(--l-yellow)'; risk=2; healthMsg='Impact modere: inflammation basale +10%'; }
  else if (aqi <= 150) { level='Malsain (sensibles)'; color='var(--orange)'; bg='var(--l-orange)'; risk=4; healthMsg='Stress oxydatif eleve, CRP +0.4 mg/L'; }
  else if (aqi <= 200) { level='Malsain'; color='var(--red)'; bg='var(--l-red)'; risk=6; healthMsg='Inflammation chronique, CRP +0.8 mg/L, IR +15%'; }
  else { level='Dangereux'; color='var(--purple)'; bg='var(--l-purple)'; risk=8; healthMsg='Danger: inflammation majeure, PM2.5 penetration systemique'; }

  state.exposomeDetails.air_quality = risk;

  const pollutants = [
    { k:'pm25', l:'PM2.5', th:[12,35], u:'ug/m3' },
    { k:'pm10', l:'PM10', th:[25,50], u:'ug/m3' },
    { k:'no2', l:'NO2', th:[20,40], u:'ppb' },
    { k:'o3', l:'O3', th:[50,100], u:'ppb' },
    { k:'so2', l:'SO2', th:[20,50], u:'ppb' },
    { k:'co', l:'CO', th:[4,9], u:'ppm' },
  ].filter(p => aq[p.k] !== null);

  sH('aqiResult', '<div style="background:'+bg+';border:2px solid '+color+';border-radius:14px;padding:18px;margin-top:12px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<div><div class="sidebar-label" style="color:'+color+'">Qualite de l\'Air — '+aq.city+'</div><div style="font-size:10px;color:var(--muted);">'+aq.time+'</div></div>'
    + '<div style="text-align:right;"><div style="font-family:\'DM Mono\',monospace;font-size:42px;font-weight:700;color:'+color+';line-height:1;">'+aqi+'</div><div style="font-size:12px;font-weight:700;color:'+color+';">'+level+'</div></div>'
    + '</div>'
    + (pollutants.length ? '<div style="display:grid;grid-template-columns:repeat('+Math.min(pollutants.length,3)+',1fr);gap:8px;">'
      + pollutants.map(p => {
        const v = aq[p.k];
        const c2 = v > p.th[1] ? 'var(--red)' : v > p.th[0] ? 'var(--orange)' : 'var(--green)';
        return '<div style="background:rgba(255,255,255,0.7);padding:10px;border-radius:10px;text-align:center;">'
          + '<div style="font-size:10px;color:var(--muted);">'+p.l+'</div>'
          + '<div style="font-family:\'DM Mono\',monospace;font-weight:700;font-size:18px;color:'+c2+';">'+v+'</div>'
          + '</div>';
      }).join('') + '</div>' : '')
    + '<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.5);border-radius:8px;font-size:12px;color:'+color+';font-weight:600;">'
    + '&#x1F4CA; Impact BMN : +'+risk+'/8 pts exposome — '+healthMsg+'</div>'
    + '</div>');
  sH('aqiStatus', '');
}

// ═══════════════════════════════════════════════════
// CALCUL EXPOSOME (0-47 pts)
// ═══════════════════════════════════════════════════
function recalcExposome() {
  const d = state.exposomeDetails;

  // Air: from API or manual
  const manual = gV('expo_air_manual', -1);
  if (manual >= 0) d.air_quality = manual;
  // else keep API value

  // Water
  d.water_quality = gV('expo_water') + gV('expo_water_chlore');

  // Habitat
  d.habitat = gV('expo_route') + gV('expo_industrie') + gV('expo_vert') + gV('expo_logement');

  // Noise
  d.noise = gV('expo_bruit_jour') + gV('expo_bruit_nuit');

  // PE diet
  d.pe_diet = Math.min(6, gV('pe_plastic') + gV('pe_canned') + gV('pe_pesticide'));

  // PE cosm
  d.pe_cosm = gV('pe_cosm');

  // PE prof
  d.pe_prof = gV('pe_prof');

  // Light
  d.light = gV('expo_light');

  // Socio
  d.socio = gV('expo_socio');

  // Food desert
  d.food_desert = gV('expo_food_desert');

  let total = 0;
  for (const [k, cfg] of Object.entries(EXPOSOME_WEIGHTS)) {
    const v = Math.min(cfg.max, d[k] || 0);
    d[k] = v;
    total += v;
  }
  state.exposomeScore = total;
  renderExposomeSummary();
  recalcC();
}

function renderExposomeSummary() {
  const d = state.exposomeDetails;
  const total = state.exposomeScore;
  const maxTotal = Object.values(EXPOSOME_WEIGHTS).reduce((a, w) => a + w.max, 0);
  const pct = Math.round(total / maxTotal * 100);
  let color = pct < 25 ? 'var(--green)' : pct < 50 ? '#D69E2E' : pct < 75 ? 'var(--orange)' : 'var(--red)';
  let level = pct < 25 ? 'Faible' : pct < 50 ? 'Modere' : pct < 75 ? 'Eleve' : 'Critique';

  let bars = '';
  for (const [k, cfg] of Object.entries(EXPOSOME_WEIGHTS)) {
    const v = d[k] || 0;
    const p = Math.round(v / cfg.max * 100);
    const c = p < 30 ? 'var(--green)' : p < 60 ? '#D69E2E' : p < 80 ? 'var(--orange)' : 'var(--red)';
    bars += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">'
      + '<span style="font-size:11px;width:180px;color:var(--muted);">'+cfg.desc.split('(')[0].trim()+'</span>'
      + '<div class="meter-bar" style="flex:1;height:6px;"><div class="meter-fill" style="width:'+p+'%;background:'+c+';"></div></div>'
      + '<span class="mono-bold" style="font-size:11px;min-width:35px;text-align:right;color:'+c+';">'+v+'/'+cfg.max+'</span></div>';
  }

  sH('exposomeSummary', '<div class="section-block" style="border-left:4px solid '+color+';">'
    + '<h3>&#x1F4CA; Synthese Exposome : '+total+'/'+maxTotal+' — '+level+'</h3>'
    + bars
    + '<div style="margin-top:12px;padding:10px;background:var(--subtle);border-radius:8px;font-size:11px;color:var(--muted);">'
    + 'Contribution au BMN-C : <strong style="color:'+color+';">'+Math.round(total * 15 / maxTotal)+'/15 pts</strong> | '
    + 'Multiplicateur inflammatoire global : <strong>x'+calcInflamMult().toFixed(2)+'</strong>'
    + '</div></div>');
}

function calcInflamMult() {
  let mult = 1.0;
  for (const [k, cfg] of Object.entries(EXPOSOME_WEIGHTS)) {
    const v = state.exposomeDetails[k] || 0;
    if (v > cfg.max * 0.5) mult *= cfg.inflam;
  }
  return Math.min(2.0, mult);
}

// ═══════════════════════════════════════════════════
// CALCUL PROFIL PROFESSIONNEL (0-50 pts)
// ═══════════════════════════════════════════════════
function recalcWork() {
  const d = state.workDetails;

  // Situation
  const sit = gS('work_situation');
  d.situation = sit === 'chomage' ? 4 : sit === 'invalide' ? 5 : sit === 'retraite_recent' ? 3 : sit === 'retraite_ancien' ? 2 : 0;

  d.type = gV('work_type');
  d.hours = gV('work_hours');

  // Commute composite
  d.commute = Math.min(9, gV('commute_dist') + gV('commute_mode') + gV('commute_time'));

  d.schedule = gV('work_schedule');

  // Stress Karasek: demand x latitude (interaction)
  const demand = gV('work_demand');
  const latitude = gV('work_latitude');
  const support = gV('work_support');
  d.stress = Math.min(8, demand + latitude + support);

  d.meals = gV('work_meals');
  d.posture = gV('work_posture');
  d.toxics = gV('work_toxics');
  d.retirement = gV('work_retirement');

  let total = 0;
  for (const [k, cfg] of Object.entries(WORK_WEIGHTS)) {
    const v = Math.min(cfg.max, d[k] || 0);
    d[k] = v;
    total += v;
  }
  state.workScore = Math.min(50, total);
  renderWorkSummary();
  recalcC();
}

function renderWorkSummary() {
  const d = state.workDetails;
  const total = state.workScore;
  const maxTotal = Object.values(WORK_WEIGHTS).reduce((a, w) => a + w.max, 0);
  const pct = Math.round(total / maxTotal * 100);
  let color = pct < 25 ? 'var(--green)' : pct < 50 ? '#D69E2E' : pct < 75 ? 'var(--orange)' : 'var(--red)';
  let level = pct < 25 ? 'Faible' : pct < 50 ? 'Modere' : pct < 75 ? 'Eleve' : 'Critique';

  let bars = '';
  for (const [k, cfg] of Object.entries(WORK_WEIGHTS)) {
    const v = d[k] || 0;
    const p = Math.round(v / cfg.max * 100);
    const c = p < 30 ? 'var(--green)' : p < 60 ? '#D69E2E' : p < 80 ? 'var(--orange)' : 'var(--red)';
    bars += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">'
      + '<span style="font-size:11px;width:180px;color:var(--muted);">'+cfg.desc.split('(')[0].trim()+'</span>'
      + '<div class="meter-bar" style="flex:1;height:6px;"><div class="meter-fill" style="width:'+p+'%;background:'+c+';"></div></div>'
      + '<span class="mono-bold" style="font-size:11px;min-width:35px;text-align:right;color:'+c+';">'+v+'/'+cfg.max+'</span></div>';
  }

  sH('workSummary', '<div class="section-block" style="border-left:4px solid '+color+';">'
    + '<h3>&#x1F4CA; Synthese Profil Professionnel : '+total+'/'+maxTotal+' — '+level+'</h3>'
    + bars
    + '<div style="margin-top:12px;padding:10px;background:var(--subtle);border-radius:8px;font-size:11px;color:var(--muted);">'
    + 'Contribution au BMN-C : <strong style="color:'+color+';">'+Math.round(total * 15 / maxTotal)+'/15 pts</strong> | '
    + 'Impact SII : <strong>'+(total >= 25 ? '+1 (seuil atteint)' : 'non significatif')+'</strong>'
    + '</div></div>');
}

// ═══════════════════════════════════════════════════
// CALCUL BMN-C ENRICHI
// ═══════════════════════════════════════════════════
function recalcC() {
  const eth = ETHNICITY[gS('ethnie')] || ETHNICITY.eu;
  const sexe = gS('sexe');
  const imc = gV('imc', 26.5);
  const tt = gV('tt', 88);
  const taille = gV('taille', 165);
  const whtr = taille > 0 ? tt / taille : 0;
  let c = 0;

  // A1. IMC (0-10)
  if (imc >= eth.bmiOB + 5) c += 10;
  else if (imc >= eth.bmiOB) c += 6;
  else if (imc >= eth.bmiOW) c += 3;

  // A2. Tour de taille (0-15)
  const ttSeuil = sexe === 'f' ? eth.ttF : eth.ttM;
  if (tt > ttSeuil + 10) c += 15;
  else if (tt > ttSeuil + 5) c += 11;
  else if (tt > ttSeuil) c += 7;

  // A3. WHtR (0-9)
  if (whtr >= 0.6) c += 9;
  else if (whtr >= 0.55) c += 6;
  else if (whtr >= 0.5) c += 3;

  // Anthropo summary
  renderAnthropoSummary(imc, tt, whtr, eth, sexe, ttSeuil);

  // F1. Famille (0-25)
  const po = gV('parent_obes');
  if (po >= 2) c += 10; else if (po >= 1) c += 8;
  const oe = gV('obes_enfance');
  if (oe >= 2) c += 10; else if (oe >= 1) c += 6;
  const dp = gV('diab_parent');
  if (dp >= 2) c += 5; else if (dp >= 1) c += 3;

  // DQI-BMN (0-15)
  const alimentTotal = Math.min(15,
    gV('alim_ultra') + gV('alim_sucre') + gV('alim_fibres') + gV('alim_portions') + gV('alim_repas'));
  c += alimentTotal;

  // Activite physique (0-9)
  const ap_total = gV('ap_cardio') + gV('ap_muscu') + gV('ap_marche') * 3.5; // marche = min/j -> min/sem
  if (ap_total < 30) c += 9;
  else if (ap_total < 75) c += 6;
  else if (ap_total < 150) c += 3;

  // Sedentarite (0-9)
  const assis = gV('assis', 7);
  if (assis >= 10) c += 9;
  else if (assis >= 8) c += 6;
  else if (assis >= 6) c += 3;

  // Sommeil (0-7)
  const sommeil = gV('sommeil', 7);
  if (sommeil < 5 || sommeil > 10) c += 7;
  else if (sommeil < 6 || sommeil > 9) c += 4;
  else if (sommeil < 7) c += 2;

  // ISI (0-8)
  const isi = gV('isi', 8);
  if (isi >= 22) c += 8; else if (isi >= 15) c += 6; else if (isi >= 8) c += 3;

  // Tabac (0-8)
  const tabac = gV('tabac');
  if (tabac === 4) c += 8; else if (tabac === 3) c += 5;
  else if (tabac === 2) c += 6; else if (tabac === 1) c += 1;

  // Alcool AUDIT-C (0-5)
  c += Math.min(5, gV('alcool_freq') + gV('alcool_qty'));

  // Sante mentale
  const stress = gV('stress', 14), sr = stress / 40;
  if (sr >= 0.6) c += 10; else if (sr >= 0.4) c += 7; else if (sr >= 0.25) c += 4;

  const phq9 = gV('phq9', 5);
  if (phq9 >= 20) c += 10; else if (phq9 >= 15) c += 7;
  else if (phq9 >= 10) c += 5; else if (phq9 >= 5) c += 2;

  const bes = gV('bes', 2);
  if (bes >= 6) c += 8; else if (bes >= 4) c += 5; else if (bes >= 2) c += 2;

  const yoyo = gV('yoyo');
  if (yoyo >= 1) c += 5;

  // Exposome contribution (normalise 0-15)
  const maxExpo = Object.values(EXPOSOME_WEIGHTS).reduce((a, w) => a + w.max, 0);
  c += Math.round(state.exposomeScore * 15 / maxExpo);

  // Profil professionnel contribution (normalise 0-15)
  const maxWork = Object.values(WORK_WEIGHTS).reduce((a, w) => a + w.max, 0);
  c += Math.round(state.workScore * 15 / maxWork);

  state.bmn_c = Math.min(150, c);

  // SII (0-9 enrichi)
  let sii = 0;
  if (sr >= 0.35) sii++;
  if (ap_total < 75) sii++;
  if (imc >= eth.bmiOB) sii++;
  if (tabac >= 3) sii++;
  if (alimentTotal >= 10) sii++;
  if (isi >= 15) sii++;
  if (tt > ttSeuil) sii++;
  if (state.exposomeScore >= 20) sii++;
  if (state.workScore >= 25) sii++;
  state.sii = sii;

  // Mental summary
  renderMentalSummary(stress, phq9, bes, sii);

  recalcK();
  updateSidebar();
}

function renderAnthropoSummary(imc, tt, whtr, eth, sexe, ttSeuil) {
  const imcClass = imc >= eth.bmiOB + 5 ? {l:'Obesite II+',c:'var(--red)'} : imc >= eth.bmiOB ? {l:'Obese',c:'var(--orange)'} : imc >= eth.bmiOW ? {l:'Surpoids',c:'#D69E2E'} : {l:'Normal',c:'var(--green)'};
  const ttClass = tt > ttSeuil + 10 ? {l:'Tres eleve',c:'var(--red)'} : tt > ttSeuil ? {l:'Eleve',c:'var(--orange)'} : {l:'Normal',c:'var(--green)'};
  const whtrClass = whtr >= 0.6 ? {l:'Eleve',c:'var(--red)'} : whtr >= 0.5 ? {l:'Modere',c:'var(--orange)'} : {l:'Normal',c:'var(--green)'};

  sH('anthropoSummary', '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">'
    + '<div style="padding:12px;background:var(--subtle);border-radius:10px;text-align:center;border-bottom:3px solid '+imcClass.c+';">'
    + '<div style="font-size:10px;color:var(--muted);">IMC</div>'
    + '<div class="mono-bold" style="font-size:22px;color:'+imcClass.c+';">'+imc+'</div>'
    + '<div style="font-size:10px;font-weight:700;color:'+imcClass.c+';">'+imcClass.l+' (seuil '+eth.bmiOW+'/'+eth.bmiOB+')</div></div>'
    + '<div style="padding:12px;background:var(--subtle);border-radius:10px;text-align:center;border-bottom:3px solid '+ttClass.c+';">'
    + '<div style="font-size:10px;color:var(--muted);">Tour de taille</div>'
    + '<div class="mono-bold" style="font-size:22px;color:'+ttClass.c+';">'+tt+' cm</div>'
    + '<div style="font-size:10px;font-weight:700;color:'+ttClass.c+';">'+ttClass.l+' (seuil '+ttSeuil+' cm)</div></div>'
    + '<div style="padding:12px;background:var(--subtle);border-radius:10px;text-align:center;border-bottom:3px solid '+whtrClass.c+';">'
    + '<div style="font-size:10px;color:var(--muted);">WHtR</div>'
    + '<div class="mono-bold" style="font-size:22px;color:'+whtrClass.c+';">'+whtr.toFixed(2)+'</div>'
    + '<div style="font-size:10px;font-weight:700;color:'+whtrClass.c+';">'+whtrClass.l+' (seuil 0.50)</div></div>'
    + '</div>');
}

function renderMentalSummary(stress, phq9, bes, sii) {
  const sr = stress / 40;
  const stressL = sr >= 0.6 ? 'Severe' : sr >= 0.4 ? 'Modere-eleve' : sr >= 0.25 ? 'Modere' : 'Faible';
  const phqL = phq9 >= 20 ? 'Severe' : phq9 >= 15 ? 'Mod-severe' : phq9 >= 10 ? 'Modere' : phq9 >= 5 ? 'Leger' : 'Minimal';
  const besL = bes >= 6 ? 'Severe' : bes >= 4 ? 'Modere' : bes >= 2 ? 'Leger' : 'Absent';

  sH('mentalSummary', '<div class="section-block" style="border-left:4px solid var(--purple);">'
    + '<h3>&#x1F4CA; Synthese Sante Mentale</h3>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">'
    + makeMetricCard('PSS-10', stress+'/40', stressL, sr >= 0.4 ? 'var(--red)' : sr >= 0.25 ? 'var(--orange)' : 'var(--green)')
    + makeMetricCard('PHQ-9', phq9+'/27', phqL, phq9 >= 15 ? 'var(--red)' : phq9 >= 10 ? 'var(--orange)' : 'var(--green)')
    + makeMetricCard('BES', bes+'/8', besL, bes >= 4 ? 'var(--red)' : bes >= 2 ? 'var(--orange)' : 'var(--green)')
    + makeMetricCard('SII', sii+'/9', sii >= 4 ? 'Eleve' : sii >= 2 ? 'Modere' : 'Faible', sii >= 4 ? 'var(--red)' : sii >= 2 ? 'var(--orange)' : 'var(--green)')
    + '</div>'
    + (sii >= 2 ? '<div class="alert" style="margin-top:12px;background:var(--l-orange);border-left:4px solid var(--orange);"><div class="alert-icon">&#x26A1;</div><div class="alert-body"><strong>SII '+sii+'/9 &ge; 2 &mdash; Panel 5 biologique obligatoire</strong>Inflammation sub-clinique probable. Tests CRP, HOMA-IR, lipides requis.</div></div>' : '')
    + '</div>');
}

function makeMetricCard(title, value, level, color) {
  return '<div style="padding:10px;background:var(--subtle);border-radius:10px;text-align:center;border-bottom:3px solid '+color+';">'
    + '<div style="font-size:10px;color:var(--muted);">'+title+'</div>'
    + '<div class="mono-bold" style="font-size:18px;color:'+color+';">'+value+'</div>'
    + '<div style="font-size:10px;font-weight:700;color:'+color+';">'+level+'</div></div>';
}

// ═══════════════════════════════════════════════════
// CALCUL BMN-K
// ═══════════════════════════════════════════════════
function recalcK() {
  const allC = [...COMORBIDITIES.diseases, ...COMORBIDITIES.phenotypes, ...COMORBIDITIES.treatments];
  let k = 0, ctiAmpMax = 1.0, griTotal = 0;
  state.comorbIds.forEach(id => {
    const c = allC.find(x => x.id === id);
    if (c) { k += c.pts; ctiAmpMax = Math.max(ctiAmpMax, c.ctiAmp); griTotal += c.gri; }
  });
  state.bmn_k = Math.min(50, k);

  // CTI
  const oe = gV('obes_enfance');
  const yoyo = gV('yoyo');
  const imc = gV('imc', 26.5);
  const isi = gV('isi', 8);
  const stress = gV('stress', 14);
  const ws = state.workDetails.schedule || 0;
  const alim = gV('alim_ultra', 0) + gV('alim_sucre', 0);

  let ctiRaw = 0;
  ctiRaw += CTI_GAMMA.duree_surpoids * (state.bmn_c > 100 ? 1.0 : state.bmn_c > 70 ? 0.7 : state.bmn_c > 40 ? 0.4 : 0.1);
  ctiRaw += CTI_GAMMA.yoyo * (yoyo >= 1 ? 1.0 : 0);
  const eth = ETHNICITY[gS('ethnie')] || ETHNICITY.eu;
  const lepProxy = Math.min(1, (imc > 35 ? 1.0 : imc > 30 ? 0.6 : imc > 27.5 ? 0.3 : 0) + (state.comorbIds.includes('saos') ? 0.3 : 0));
  ctiRaw += CTI_GAMMA.resistance_leptine * lepProxy;
  ctiRaw += CTI_GAMMA.microbiote * Math.min(1, alim / 6);
  ctiRaw += CTI_GAMMA.cortisol * Math.min(1, (stress/40*0.4) + (isi/28*0.3) + (ws/5*0.3));
  ctiRaw += CTI_GAMMA.metabolisme_basal * Math.min(1, (state.comorbIds.includes('hypo')?0.6:0) + (yoyo>=1?0.4:0));
  ctiRaw += CTI_GAMMA.obesite_enfance * (oe >= 2 ? 1.0 : oe >= 1 ? 0.5 : 0);

  const expoAmp = state.exposomeScore > 30 ? 1.15 : state.exposomeScore > 20 ? 1.05 : 1.0;
  state.cti = Math.min(100, Math.round((ctiRaw / 1.459) * 100 * ctiAmpMax * expoAmp));

  // GRI
  let gri = griTotal;
  if (state.bioValues.homaIR > 2.5) gri += GRI_FAV.homaIR_high;
  if (state.bioValues.adipon < 6) gri += GRI_FAV.adiponectine_low;
  if (state.bioValues.tghdl > 3.5) gri += GRI_FAV.tghdl_high;
  if (state.cti > 55) gri -= GRI_DEF.cti_high;
  if (state.comorbIds.includes('cortis')) gri -= GRI_DEF.corticoides;
  if (imc > 40 && !state.comorbIds.includes('mets') && !state.comorbIds.includes('dt2')) gri -= GRI_DEF.imc_40_meca;
  if (stress/40 >= 0.6) gri -= GRI_DEF.cortisol;
  state.gri = Math.max(-2, Math.min(5, gri));

  updateSidebar();
}

// ═══════════════════════════════════════════════════
// CALCUL BMN-B
// ═══════════════════════════════════════════════════
function recalcB() {
  let sumWZ = 0, sumW = 0;
  const values = {};
  BIO_MARKERS.forEach(m => {
    const inp = document.getElementById('bio_' + m.id);
    if (!inp || inp.value === '') return;
    const v = parseFloat(inp.value);
    if (isNaN(v)) return;
    values[m.id] = v;
    let z;
    if (!m.inv) { z = v <= m.n ? 0 : v >= m.a ? 1 : (v - m.n)/(m.a - m.n); }
    else { z = v >= m.n ? 0 : v <= m.a ? 1 : (m.n - v)/(m.n - m.a); }
    sumWZ += z * m.w;
    sumW += m.w;
  });
  state.bmn_b = sumW > 0 ? Math.round((sumWZ / sumW) * 100) : 0;
  state.bioValues = values;
  renderRetroValidation(values);
  recalcK();
  updateSidebar();
}

function renderRetroValidation(v) {
  const flags = [];
  if (v.homaIR >= 4 && !state.comorbIds.includes('dt2') && !state.comorbIds.includes('predmt'))
    flags.push({e:'&#x26A0;&#xFE0F;',t:'<strong>Regle 1 — HOMA-IR non declare</strong><br>HOMA-IR &ge; 4 sans traitement : IR severe confirmee. Force BMN-K. Panel 10.',sev:'red'});
  if (v.hba1c >= 5.7 && v.hba1c < 6.5 && !state.comorbIds.includes('predmt'))
    flags.push({e:'&#x1F7E1;',t:'<strong>Regle 2 — Pre-diabete non declare</strong><br>HbA1c '+v.hba1c+'% : pre-diabete biologique. Panel 10.',sev:'orange'});
  if (v.hba1c >= 6.5 && !state.comorbIds.includes('dt2'))
    flags.push({e:'&#x1F534;',t:'<strong>Regle 3 — Diabete non declare</strong><br>HbA1c '+v.hba1c+'% : DIABETE TYPE 2 BIOLOGIQUE. BMN-T minimum 60.',sev:'red'});
  if (v.asat > 60 && v.ggt > 50 && v.tg > 1.7)
    flags.push({e:'&#x26A0;&#xFE0F;',t:'<strong>Regle 4 — Steatose silencieuse</strong><br>ASAT>60 + GGT>50 + TG>1.7 : NAFLD probable. Activer BMN-K.',sev:'orange'});
  if (v.tghdl > 3.5 && v.adipon < 6 && v.homaIR > 2.5)
    flags.push({e:'&#x26A0;&#xFE0F;',t:'<strong>Regle 5 — IR occulte</strong><br>Triade TG/HDL + adiponectine + HOMA-IR : IR non diagnostiquee. CTI amplifie, GRI positif.',sev:'orange'});
  if (v.ggt > 100 && v.asat > 60)
    flags.push({e:'&#x1F37A;',t:'<strong>Regle 6 — Alcool cache</strong><br>GGT > 100 + ASAT > 60 : pattern hepatique. Re-evaluer BMN-C alcool.',sev:'red'});

  const el = document.getElementById('retroValid');
  if (!el) return;
  el.innerHTML = flags.length
    ? flags.map(f => '<div class="alert" style="background:var(--l-'+f.sev+');border-left:4px solid var(--'+f.sev+');margin-bottom:8px;"><div class="alert-icon">'+f.e+'</div><div class="alert-body">'+f.t+'</div></div>').join('')
    : '<div class="alert" style="background:var(--l-green);border-left:4px solid var(--green);"><div class="alert-icon">&#x2705;</div><div class="alert-body"><strong>Retrovalidation OK</strong><br>Aucune incoherence detectee entre biologie et declarations cliniques.</div></div>';
}

// ═══════════════════════════════════════════════════
// CALCUL BMN-T
// ═══════════════════════════════════════════════════
function calcBMNT() {
  const c = state.bmn_c, k = state.bmn_k, b = state.bmn_b;
  const cN = (c/150)*100, kN = (k/50)*100, bN = b;
  const gap = bN - cN;
  let wB, wC, wK = 0.15;
  if (gap <= 20) { wB = 0.30; wC = 0.55; }
  else { const ex = Math.min(0.30, (gap-20)/100*0.60); wB = 0.30+ex; wC = 0.55-ex*0.75; }
  wC = Math.max(0.25, wC);
  const s = wB+wC+wK; wB/=s; wC/=s; wK/=s;
  let t = wC*cN + wB*bN + wK*kN;
  if (bN > 0 && t < bN*0.75) t = bN*0.75;
  if (bN > 90) t = Math.max(t, Math.max(80, bN*0.85));
  else if (bN > 80) t = Math.max(t, bN*0.85);
  if (k > 30 && t < 40) t = Math.max(40, kN*0.80);
  if (state.bioValues.hba1c >= 6.5 && t < 60) t = 60;
  state.bmn_t = Math.min(200, Math.round(t*2));
  return state.bmn_t;
}

// ═══════════════════════════════════════════════════
// MARKOV
// ═══════════════════════════════════════════════════
function calcMarkov() {
  const bmnT = state.bmn_t, kN = (state.bmn_k/50)*100;
  const eth = ETHNICITY[gS('ethnie')] || ETHNICITY.eu;
  const imc = gV('imc', 26.5);
  let cs = imc >= 35 ? 5 : imc >= 30 ? 4 : imc >= 27.5 ? 3 : imc >= eth.bmiOW ? 2 : imc >= eth.bmiOW - 2 ? 1 : 0;
  const rf = Math.exp(THETA_BMN*bmnT/200) * Math.exp(THETA_K*kN/100);
  let cm = 1.0;
  for (const id of state.comorbIds) if (MARKOV_COMORB_MULT[id]) cm = Math.max(cm, MARKOV_COMORB_MULT[id]);
  let prob = [0,0,0,0,0,0]; prob[cs] = 1.0;
  for (let y = 0; y < 10; y++) {
    const np = [0,0,0,0,0,0];
    for (let i = 0; i < 6; i++) {
      if (prob[i] < 0.001) continue;
      const row = MARKOV_BASE[i].slice();
      for (let j = i+1; j < 6; j++) row[j] *= rf*cm;
      for (let j = 0; j < i; j++) row[j] /= rf;
      const rt = row.reduce((a,b)=>a+b,0);
      for (let j = 0; j < 6; j++) np[j] += prob[i]*(row[j]/rt);
    }
    prob = np;
  }
  return { currentState:cs, prob };
}

// ═══════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════
function getClass(score) {
  if (score <= 40) return {level:'FAIBLE',color:'var(--green)',bg:'var(--l-green)',emoji:'&#x1F7E2;',prob:'< 8%'};
  if (score <= 80) return {level:'MODERE',color:'#D69E2E',bg:'var(--l-yellow)',emoji:'&#x1F7E1;',prob:'8-22%'};
  if (score <= 120) return {level:'ELEVE',color:'var(--orange)',bg:'var(--l-orange)',emoji:'&#x1F7E0;',prob:'22-47%'};
  if (score <= 160) return {level:'TRES ELEVE',color:'var(--red)',bg:'var(--l-red)',emoji:'&#x1F534;',prob:'47-71%'};
  return {level:'CRITIQUE',color:'var(--purple)',bg:'var(--l-purple)',emoji:'&#x1F6A8;',prob:'> 71%'};
}

function getCompositeClass() {
  const comp = Math.min(200, state.bmn_c + state.bmn_k * 1.5);
  if (comp < 50) return 'FAIBLE'; if (comp < 100) return 'MODERE';
  if (comp < 150) return 'ELEVE'; if (comp < 180) return 'TRES ELEVE'; return 'CRITIQUE';
}

function getPanelLevel() {
  const cls = getCompositeClass();
  if (cls === 'FAIBLE') return state.sii >= 2 ? 5 : 0;
  if (cls === 'MODERE') return 10;
  return 15;
}

// ═══════════════════════════════════════════════════
// COMORBIDITES UI
// ═══════════════════════════════════════════════════
function buildComorbGrid() {
  const build = (items, cid) => {
    const el = document.getElementById(cid);
    if (!el) return;
    el.innerHTML = items.map(c => '<label class="comorbidity-card" id="cc_'+c.id+'" onclick="toggleComorb(\''+c.id+'\')">'
      + '<input type="checkbox" id="cb_'+c.id+'">'
      + '<div class="cc-header"><div class="cc-name">'+c.name+'</div><div class="cc-pts">+'+c.pts+'</div></div>'
      + '<div class="cc-or">'+c.or+'</div>'
      + '<div class="cc-desc">'+c.desc+'</div>'
      + '</label>').join('');
  };
  build(COMORBIDITIES.diseases, 'comorbGrid');
  build(COMORBIDITIES.phenotypes, 'phenoGrid');
  build(COMORBIDITIES.treatments, 'traitGrid');
}

function toggleComorb(id) {
  const cb = document.getElementById('cb_'+id);
  if (!cb) return;
  cb.checked = !cb.checked;
  const card = document.getElementById('cc_'+id);
  if (card) card.classList.toggle('active', cb.checked);
  if (cb.checked && !state.comorbIds.includes(id)) state.comorbIds.push(id);
  else state.comorbIds = state.comorbIds.filter(x => x !== id);
  recalcK();
}

// ═══════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════

function renderStep7() {
  // Classification intermediaire
  const comp = getCompositeClass();
  const ci = {
    'FAIBLE':     {color:'var(--green)',bg:'var(--l-green)',emoji:'&#x1F7E2;',desc:'Bilan conditionnel (SII &ge; 2).'},
    'MODERE':     {color:'#D69E2E',bg:'var(--l-yellow)',emoji:'&#x1F7E1;',desc:'Panel Tier 2A/2B obligatoire.'},
    'ELEVE':      {color:'var(--orange)',bg:'var(--l-orange)',emoji:'&#x1F7E0;',desc:'Panel Tier 2B complet.'},
    'TRES ELEVE': {color:'var(--red)',bg:'var(--l-red)',emoji:'&#x1F534;',desc:'Panel Tier 2C + CTI + GRI.'},
    'CRITIQUE':   {color:'var(--purple)',bg:'var(--l-purple)',emoji:'&#x1F6A8;',desc:'Panel Tier 2D + genetique.'},
  }[comp];

  sH('classificationIntermediate', '<div class="section-block" style="border-left:4px solid '+ci.color+';margin-bottom:20px;">'
    + '<h3>&#x1F4CA; Classification Intermediaire C+K : '+comp+'</h3>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:12px;">'
    + makeMetricCard('BMN-C', state.bmn_c+'/150', '', 'var(--blue)')
    + makeMetricCard('BMN-K', state.bmn_k+'/50', '', 'var(--red)')
    + makeMetricCard('Exposome', state.exposomeScore+'/47', '', 'var(--teal)')
    + makeMetricCard('Travail', state.workScore+'/50', '', 'var(--orange)')
    + '</div>'
    + '<div style="padding:12px;background:'+ci.bg+';border-radius:10px;text-align:center;font-weight:700;color:'+ci.color+';">'+ci.emoji+' '+comp+' — '+ci.desc+'</div>'
    + (state.bmn_k > 30 ? '<div class="alert" style="margin-top:10px;background:var(--l-red);border-left:4px solid var(--red);"><div class="alert-icon">&#x26A1;</div><div class="alert-body"><strong>Comorbidity Floor Actif</strong> BMN-K > 30 : score final minimum MODERE.</div></div>':'')
    + '</div>');

  // Bilan prescrit
  const panel = getPanelLevel();
  state.panelLevel = panel;
  const markers = BIO_MARKERS.filter(m => m.panel <= Math.max(5, panel));
  sH('bilanPrescrit', '<div class="section-block"><h3>&#x1F9EA; Bilan Biologique Prescrit</h3>'
    + '<table class="bilan-table"><thead><tr><th>#</th><th>Biomarqueur</th><th>Normal</th><th>Alarme</th><th>Poids</th><th>Tier</th></tr></thead><tbody>'
    + markers.map((m,i) => '<tr><td>'+(i+1)+'</td><td><strong>'+m.name+'</strong><br><span style="font-size:10px;color:var(--muted);">'+m.label+'</span></td><td style="color:var(--green);font-weight:600;">'+m.normal+'</td><td style="color:var(--red);font-weight:600;">'+m.abnorm+'</td><td class="mono-bold">'+m.w+'</td><td><span class="marker-tag '+(m.panel<=5?'mt-obligatoire':m.panel<=10?'mt-recommande':'mt-optionnel')+'">'+(m.panel<=5?'2A':m.panel<=10?'2B':'2C')+'</span></td></tr>').join('')
    + '</tbody></table></div>');

  // Bio inputs
  let bioHtml = '<div class="section-block"><h3>&#x1FA78; Saisie des Resultats</h3><div class="form-grid">';
  markers.forEach(m => {
    bioHtml += '<div class="form-group"><label>'+m.name+' ('+m.unit+') <span class="label-ref">'+m.normal+'</span></label>'
      + '<input type="number" id="bio_'+m.id+'" placeholder="Laisser vide si non dispo" step="0.01" oninput="recalcB()" style="border-left:3px solid '+(m.panel<=5?'var(--red)':m.panel<=10?'var(--orange)':'var(--blue)')+'"></div>';
  });
  bioHtml += '</div></div>';
  sH('bioPanel', bioHtml);

  // Restore values
  Object.keys(state.bioValues).forEach(id => {
    const inp = document.getElementById('bio_'+id);
    if (inp) inp.value = state.bioValues[id];
  });
  recalcB();
}

function renderStep8() {
  const t = calcBMNT();
  const cls = getClass(t);
  const markov = calcMarkov();
  const allC = [...COMORBIDITIES.diseases,...COMORBIDITIES.phenotypes,...COMORBIDITIES.treatments];
  const actC = state.comorbIds.map(id => allC.find(x => x.id === id)).filter(Boolean);
  const cti = Math.round(state.cti), gri = state.gri;
  const colors = ['var(--green)','var(--green-light)','#D69E2E','var(--orange)','var(--red)','var(--purple)'];

  let h = '';

  // Header
  h += '<div class="final-header"><h2>'+cls.emoji+' BMN-T : '+t+'/200 &mdash; '+cls.level+'</h2>'
    + '<p>P(obesite 10 ans) : '+cls.prob+' &middot; Exposome '+state.exposomeScore+'/47 &middot; Travail '+state.workScore+'/50</p>'
    + '<div class="final-scores-row">'
    + '<div class="fs-item"><div class="fs-label">BMN-C</div><div class="fs-val">'+state.bmn_c+'</div><div class="fs-sub">/150</div></div>'
    + '<div class="fs-item"><div class="fs-label">BMN-K</div><div class="fs-val">'+state.bmn_k+'</div><div class="fs-sub">/50</div></div>'
    + '<div class="fs-item"><div class="fs-label">BMN-B</div><div class="fs-val">'+(state.bmn_b||'-')+'</div><div class="fs-sub">/100</div></div>'
    + '<div class="fs-item"><div class="fs-label">CTI</div><div class="fs-val">'+cti+'</div><div class="fs-sub">'+(cti<20?'Ouvert':cti<40?'Debut':cti<55?'Avance':'Ferme')+'</div></div>'
    + '<div class="fs-item"><div class="fs-label">GRI</div><div class="fs-val">'+gri.toFixed(1)+'</div><div class="fs-sub">'+(gri>=2.5?'Excellent':gri>=1.5?'Bon':gri>=0.5?'Modere':'Faible')+'</div></div>'
    + '</div></div>';

  // Dynamic weights
  const cN = (state.bmn_c/150)*100, bN = state.bmn_b, kN = (state.bmn_k/50)*100;
  const gap = bN - cN;
  let wC=0.55, wB=0.30, wK=0.15;
  if (gap > 20) { const ex = Math.min(0.30, (gap-20)/100*0.60); wB = 0.30+ex; wC = Math.max(0.25, 0.55-ex*0.75); }

  h += '<div class="section-block"><h3>&#x2696;&#xFE0F; Ponderation Dynamique Tri-Source</h3>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">'
    + '<div style="padding:14px;background:var(--l-blue);border-radius:10px;text-align:center;"><div style="font-size:10px;color:var(--muted);">w_C (Clinique)</div><div class="mono-bold" style="font-size:24px;color:var(--blue);">'+(wC*100).toFixed(0)+'%</div></div>'
    + '<div style="padding:14px;background:var(--l-green);border-radius:10px;text-align:center;"><div style="font-size:10px;color:var(--muted);">w_B (Biologie)</div><div class="mono-bold" style="font-size:24px;color:var(--green);">'+(wB*100).toFixed(0)+'%</div></div>'
    + '<div style="padding:14px;background:var(--l-red);border-radius:10px;text-align:center;"><div style="font-size:10px;color:var(--muted);">w_K (Comorbidites)</div><div class="mono-bold" style="font-size:24px;color:var(--red);">'+(wK*100).toFixed(0)+'%</div></div>'
    + '</div>'
    + (gap > 20 ? '<div style="margin-top:8px;padding:8px 12px;background:var(--l-orange);border-radius:8px;font-size:11px;color:var(--orange);font-weight:600;">&#x26A1; Ecart Bio-Clinique '+gap.toFixed(0)+' > 20 : bascule w_B vers '+((wB*100).toFixed(0))+'%</div>' : '')
    + '</div>';

  // Markov
  h += '<div class="section-block"><h3>&#x1F4C8; Projection Markov 6 Etats &mdash; 10 Ans</h3>';
  markov.prob.forEach((p,i) => {
    const pct = (p*100).toFixed(1);
    h += '<div class="markov-state"><div class="markov-state-label" style="color:'+colors[i]+'">'+MARKOV_STATES[i]+(i===markov.currentState?' &#x25C0;':'')+'</div>'
      + '<div class="markov-state-bar"><div class="markov-state-bar-fill" style="width:'+pct+'%;background:'+colors[i]+'"></div></div>'
      + '<div class="markov-state-pct" style="color:'+colors[i]+'">'+pct+'%</div></div>';
  });
  const pObes = ((markov.prob[4]+markov.prob[5])*100).toFixed(1);
  h += '<div style="margin-top:10px;padding:12px;background:var(--subtle);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:12px;color:var(--muted);">P(obesite a 10 ans)</span>'
    + '<span class="mono-bold" style="font-size:20px;color:var(--red);">'+pObes+'%</span></div></div>';

  // Exposome impact
  if (state.exposomeScore > 0) {
    h += '<div class="section-block"><h3>&#x1F30D; Impact Exposome Detaille</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    for (const [k, cfg] of Object.entries(EXPOSOME_WEIGHTS)) {
      const v = state.exposomeDetails[k] || 0;
      if (v > 0) {
        const p = Math.round(v / cfg.max * 100);
        const c = p < 50 ? 'var(--orange)' : 'var(--red)';
        h += '<div style="padding:8px 12px;background:var(--subtle);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:11px;color:var(--muted);">'+cfg.desc.split('(')[0].trim()+'</span>'
          + '<span class="mono-bold" style="color:'+c+';">+'+v+'/'+cfg.max+'</span></div>';
      }
    }
    h += '</div>';
    if (state.airQuality) {
      h += '<div style="margin-top:10px;padding:10px;background:var(--l-teal);border-radius:8px;font-size:11px;">'
        + '&#x1F32B;&#xFE0F; <strong>'+state.airQuality.city+'</strong> AQI '+state.airQuality.aqi
        + (state.airQuality.pm25 !== null ? ' | PM2.5: '+state.airQuality.pm25 : '')
        + (state.airQuality.no2 !== null ? ' | NO2: '+state.airQuality.no2 : '') + '</div>';
    }
    h += '</div>';
  }

  // Work impact
  if (state.workScore > 0) {
    h += '<div class="section-block"><h3>&#x1F4BC; Impact Profil Professionnel</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    for (const [k, cfg] of Object.entries(WORK_WEIGHTS)) {
      const v = state.workDetails[k] || 0;
      if (v > 0) {
        h += '<div style="padding:8px 12px;background:var(--subtle);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">'
          + '<span style="font-size:11px;color:var(--muted);">'+cfg.desc+'</span>'
          + '<span class="mono-bold" style="color:var(--orange);">+'+v+'/'+cfg.max+'</span></div>';
      }
    }
    h += '</div></div>';
  }

  // Comorbidites recap
  if (actC.length > 0) {
    h += '<div class="section-block"><h3>&#x2695;&#xFE0F; Comorbidites Actives</h3>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    actC.forEach(c => {
      h += '<span class="marker-tag mt-obligatoire">'+c.name+' (+'+c.pts+' pts, CTI x'+c.ctiAmp+')</span>';
    });
    h += '</div></div>';
  }

  // Strategy
  const strats = getStrategy(t, cls.level, cti, gri, actC);
  h += '<div class="section-block"><h3>&#x1F3AF; Plan Therapeutique Personnalise</h3><div class="strategy-timeline">';
  strats.forEach((s,i) => {
    h += '<div class="st-item"><div class="st-dot" style="background:'+s.color+';">'+(i+1)+'</div><div class="st-content"><h4>'+s.icon+' '+s.title+'</h4><p>'+s.desc+'</p>'
      + (s.items ? '<ul>'+s.items.map(it=>'<li>'+it+'</li>').join('')+'</ul>' : '') + '</div></div>';
  });
  h += '</div></div>';

  // GLP-1 / CTI cards
  if (gri >= 1.5) {
    h += '<div class="strategy-card" style="background:var(--l-green);border-color:var(--green);"><div class="sc-header"><div class="sc-icon">&#x1F489;</div><div><div class="sc-title" style="color:var(--green);">GLP-1 Recommande &mdash; GRI '+gri.toFixed(1)+'</div></div></div><div class="sc-items">'
      + (gri >= 2.5
        ? '<div class="sc-item"><div class="sc-item-icon">&#x2705;</div><div class="sc-item-text"><strong>Excellent (GRI &ge; 2.5)</strong><span>Tirzepatide si HOMA-IR > 4. Perte attendue > 15% a 1 an.</span></div></div>'
        : '<div class="sc-item"><div class="sc-item-icon">&#x2714;&#xFE0F;</div><div class="sc-item-text"><strong>Bon (GRI 1.5-2.4)</strong><span>Semaglutide 2.4 mg. Perte attendue 10-15% a 1 an.</span></div></div>')
      + '</div></div>';
  }
  if (cti > 40) {
    h += '<div class="strategy-card" style="background:var(--l-red);border-color:var(--red);"><div class="sc-header"><div class="sc-icon">&#x26A1;</div><div><div class="sc-title" style="color:var(--red);">CTI '+cti+' &mdash; Fenetre '+(cti>55?'FERMEE':'En fermeture')+'</div></div></div><div class="sc-items">'
      + (cti > 55
        ? '<div class="sc-item"><div class="sc-item-icon">&#x1FA79;</div><div class="sc-item-text"><strong>Chirurgie bariatrique a evaluer en priorite</strong><span>Sleeve gastrectomie ou bypass gastrique.</span></div></div>'
        : '<div class="sc-item"><div class="sc-item-icon">&#x26A0;&#xFE0F;</div><div class="sc-item-text"><strong>Intervention urgente requise</strong><span>Fenetre therapeutique se referme. GLP-1 intensif + lifestyle.</span></div></div>')
      + '</div></div>';
  }

  h += '<div style="margin-top:24px;padding:16px;background:var(--subtle);border-radius:12px;font-size:11px;color:var(--muted);">'
    + '<strong style="color:var(--navy);">Score BMN v2.0 Enrichi</strong> &mdash; Architecture ABCKO+<br>'
    + '8 etapes &middot; 21+ variables cliniques &middot; Exposome 10 dimensions &middot; Profil professionnel 10 dimensions &middot; API qualite air temps reel &middot; 11 comorbidites &middot; 15 biomarqueurs &middot; Markov 6 etats &middot; CTI 7 composantes &middot; GRI 12 predicteurs'
    + '</div>';

  sH('finalResult', h);
  updateSidebar();
}

function getStrategy(t, level, cti, gri, actC) {
  const b = [];
  if (level === 'FAIBLE') {
    b.push({color:'var(--green)',icon:'&#x2705;',title:'Surveillance Standard',desc:'Faible risque. Reevaluation dans 3 ans.',items:['Alimentation mediterraneenne','AP &ge; 150 min/sem','Recalcul si prise > 3 kg','Reduire exposition exposome si score > 20']});
  } else if (level === 'MODERE') {
    b.push({color:'#D69E2E',icon:'&#x1F4CB;',title:'Programme Lifestyle Structure',desc:'Objectif : BMN-C -20% en 6 mois.',items:['Dieteticienne mensuelle x3','AP 150-300 min/sem progressive','DQI-BMN cible < 5','Gestion stress professionnel (Karasek)','Optimisation trajet/transport']});
    b.push({color:'var(--blue)',icon:'&#x1F9EA;',title:'Suivi Biologique Annuel',desc:'Panel Tier 2A/2B.',items:['HOMA-IR, HbA1c, lipides','Traitement comorbidites si presentes']});
  } else if (level === 'ELEVE') {
    b.push({color:'var(--orange)',icon:'&#x26A1;',title:'Programme Intensif Multidisciplinaire',desc:'Suivi trimestriel obligatoire.',items:['AP supervisee 3-5x/sem','Restriction calorique -500 kcal/j','CPAP si SAOS','Reduction exposome professionnel','Amenagement poste de travail']});
    if (gri>=1.5) b.push({color:'var(--green)',icon:'&#x1F489;',title:'GLP-1 a Initier',desc:'GRI '+gri.toFixed(1)+' favorable.',items:['Semaglutide titration sur 16 sem','Objectif &ge; 10% perte ponderale']});
  } else {
    b.push({color:'var(--red)',icon:'&#x1F6A8;',title:'URGENCE THERAPEUTIQUE &mdash; '+level,desc:'RDV endocrinologie sous 2 semaines.',items:['Panel Tier 2C/2D complet','Evaluation chirurgie bariatrique si CTI > 55','GLP-1 prioritaire (tirzepatide si HOMA-IR > 4)','Prise en charge psychiatrique si PHQ-9 > 15']});
  }
  // Comorbidity-specific
  if (actC.some(x=>x.id==='hypo')) b.push({color:'var(--teal)',icon:'&#x1F98B;',title:'Hypothyroidie',desc:'TSH > 4.',items:['Levothyroxine 25 ug/j','TSH cible 1-2 mUI/L']});
  if (actC.some(x=>x.id==='saos')) b.push({color:'var(--teal)',icon:'&#x1F634;',title:'SAOS',desc:'IAH eleve.',items:['CPAP obligatoire','Perte 10% poids = IAH -30%']});
  if (actC.some(x=>x.id==='sopk')) b.push({color:'var(--teal)',icon:'&#x1F469;&#x200D;&#x2695;&#xFE0F;',title:'SOPK',desc:'GLP-1 tres efficace.',items:['Metformin + Sitagliptin 1ere ligne','GLP-1 si BMN-T > 80']});
  if (state.exposomeScore >= 25) b.push({color:'var(--teal)',icon:'&#x1F30D;',title:'Reduction Exposome',desc:'Score '+state.exposomeScore+'/47.',items:['Filtration air interieur si AQI > 100','Verre/inox au lieu de plastique','Cosmetiques bio/naturels','Reduction bruit nocturne']});
  if (state.workScore >= 25) b.push({color:'var(--teal)',icon:'&#x1F4BC;',title:'Adaptation Professionnelle',desc:'Score travail '+state.workScore+'/50.',items:['Bureau debout/alternance si sedentaire','Pause active toutes les 2h','Repas structure au travail','Covoiturage/velo si trajet > 30 min']});
  return b;
}

// ═══════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════
function updateSidebar() {
  const c = state.bmn_c, k = state.bmn_k, b = state.bmn_b;
  sT('sCval', c); sW('sCbar', (c/150*100)+'%');
  sT('sExpoVal', state.exposomeScore); sW('sExpoBar', (state.exposomeScore/47*100)+'%');
  sT('sWorkVal', state.workScore); sW('sWorkBar', (state.workScore/50*100)+'%');
  sT('sKval', k); sW('sKbar', (k/50*100)+'%');
  sT('sBval', b > 0 ? b : '-'); sW('sBbar', b+'%');
  sT('sSiiVal', state.sii); sW('sSiiBar', (state.sii/9*100)+'%');

  // Update BMN-T in sidebar
  if (state.step >= 7) {
    const t = calcBMNT();
    const cls = getClass(t);
    sT('bmnTNum', t);
    const box = document.getElementById('bmnTBox');
    if (box) { box.style.background = cls.bg; box.style.color = cls.color; }
    const rb = document.getElementById('riskBadge');
    if (rb) { rb.style.background = cls.bg; rb.style.color = cls.color; rb.innerHTML = cls.emoji+' '+cls.level+' &mdash; P '+cls.prob; }
  }

  // CTI/GRI
  const ctiCard = document.getElementById('ctiGriCard');
  if (ctiCard && (state.cti > 0 || state.gri !== 0)) {
    ctiCard.style.display = 'block';
    sT('ctiVal', Math.round(state.cti));
    sW('ctiBar', state.cti+'%');
    sT('ctiWindow', state.cti<20?'Ouverte':state.cti<40?'Debutante':state.cti<55?'Avancee':'FERMEE');
    sT('griVal', state.gri.toFixed(1));
    sW('griBar', Math.max(0,Math.min(100,state.gri*20+20))+'%');
    sT('griLevel', state.gri>=2.5?'Excellent':state.gri>=1.5?'Bon':state.gri>=0.5?'Modere':'Faible');
  }
}

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function goStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.hstep').forEach(h => h.classList.remove('active','done'));
  const panel = document.getElementById('step'+n);
  if (panel) panel.classList.add('active','fade-in');
  state.step = n;
  for (let i = 1; i <= 8; i++) {
    const hs = document.getElementById('hs'+i);
    if (hs) { if (i < n) hs.classList.add('done'); else if (i === n) hs.classList.add('active'); }
  }
  document.getElementById('progressFill').style.width = (n/8*100)+'%';
  if (n === 7) renderStep7();
  if (n === 8) renderStep8();
  updateSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

function recalcAll() {
  recalcExposome();
  recalcWork();
  recalcC();
}

function resetAll() {
  if (!confirm('Reinitialiser toutes les donnees du patient ?')) return;
  state = {step:1,bmn_c:0,bmn_k:0,bmn_b:0,bmn_t:0,cti:0,gri:0,comorbIds:[],panelLevel:5,bioValues:{},sii:0,exposomeScore:0,exposomeDetails:{},workScore:0,workDetails:{},airQuality:null};
  location.reload();
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
function init() {
  buildComorbGrid();
  calcIMC();
  // Sync city fields
  const cityField = document.getElementById('patient_city');
  const aqiCity = document.getElementById('aqi_city');
  if (cityField && aqiCity) {
    cityField.addEventListener('change', () => { aqiCity.value = cityField.value; });
    aqiCity.addEventListener('change', () => { cityField.value = aqiCity.value; });
  }
  recalcAll();
}

init();
