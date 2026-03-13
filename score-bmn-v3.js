/**
 * SCORE BMN v3.5 — Algorithme complet
 * Dossier scientifique : https://score-bmn-v3.pages.dev/dossier-scientifique
 *
 * Modules :
 *   I.   Données de référence (ethnies, comorbidités, biomarqueurs)
 *   II.  Section C  – Score Clinique (0-50)
 *   III. Section E  – Score Exposome (0-45)
 *   IV.  Section O  – Score Occupationnel (0-10)
 *   V.   Section L  – Score Lifestyle (0-10)
 *   VI.  Section XIII – BioNorm
 *   VII. Section XIV  – Score Final (sf)
 *   VIII.Section XV   – SII (Indice Inflammatoire Indirect)
 *   IX.  Section XVI  – CTI (Chronicity Trajectory Index)
 *   X.   Section XVII/XVIII – GRI / GRS / PPE (GLP-1 Engine)
 *   XI.  Section XIX  – Modèle de Markov (projection 10 ans)
 *   XII. Orchestration principale
 */

// ═══════════════════════════════════════════════════════════════════
// I. DONNÉES DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════════

/** Section IX — Profils Ethniques (9 groupes) */
export const ETHNIC_PROFILES = {
  eu: { label: 'European',           bmiSurpoids: 25, bmiObesite: 30, waistF: 88, waistM: 102, dR: 1.0, hR: 1.0, cR: 1.0, iM: 1.0, ldlM: 1.0, ev: 0    },
  im: { label: 'Indo-Mauritian',     bmiSurpoids: 23, bmiObesite: 27.5, waistF: 80, waistM: 90,  dR: 2.0, hR: 1.2, cR: 1.4, iM: 1.2, ldlM: 1.3, ev: -1.5 },
  cr: { label: 'Creole Mauritian',   bmiSurpoids: 25, bmiObesite: 30, waistF: 84, waistM: 94,  dR: 1.3, hR: 1.4, cR: 1.2, iM: 1.2, ldlM: 1.0, ev: -2   },
  si: { label: 'Sino-Mauritian',     bmiSurpoids: 23, bmiObesite: 27.5, waistF: 80, waistM: 90,  dR: 1.0, hR: 0.9, cR: 0.6, iM: 0.9, ldlM: 0.9, ev: 1.5  },
  sa: { label: 'South Asian',        bmiSurpoids: 23, bmiObesite: 27.5, waistF: 80, waistM: 90,  dR: 2.0, hR: 1.3, cR: 1.5, iM: 1.2, ldlM: 1.3, ev: -1.5 },
  af: { label: 'African',            bmiSurpoids: 25, bmiObesite: 30, waistF: 88, waistM: 102, dR: 1.3, hR: 1.5, cR: 1.2, iM: 1.3, ldlM: 1.0, ev: -1.5 },
  ea: { label: 'East Asian',         bmiSurpoids: 23, bmiObesite: 27.5, waistF: 80, waistM: 88,  dR: 0.9, hR: 0.9, cR: 0.7, iM: 0.9, ldlM: 0.9, ev: 1.5  },
  se: { label: 'South-East Asian',   bmiSurpoids: 23, bmiObesite: 27.5, waistF: 80, waistM: 90,  dR: 1.2, hR: 1.0, cR: 1.0, iM: 1.0, ldlM: 1.0, ev: 0    },
  fm: { label: 'Franco-Mauritian',   bmiSurpoids: 25, bmiObesite: 30, waistF: 88, waistM: 102, dR: 0.8, hR: 1.0, cR: 0.9, iM: 1.0, ldlM: 1.0, ev: 1    },
};

/** Section X — Comorbidités (13 items) */
export const COMORBIDITIES = {
  dt2:     { label: 'Type 2 Diabetes',               pts: 14, category: 'dis', griFav: 0, ca: 1.4  },
  sopk:    { label: 'PCOS',                           pts: 14, category: 'dis', griFav: 1, ca: 1.3  },
  saos:    { label: 'Sleep Apnea',                    pts: 12, category: 'dis', griFav: 0, ca: 1.25 },
  mets:    { label: 'Metabolic Syndrome',             pts: 12, category: 'dis', griFav: 1, ca: 1.5  },
  hta:     { label: 'Hypertension',                   pts: 10, category: 'dis', griFav: 0, ca: 1.0  },
  nafld:   { label: 'NAFLD',                          pts: 10, category: 'dis', griFav: 1, ca: 1.0  },
  monw:    { label: 'MONW phenotype',                 pts: 10, category: 'phe', griFav: 1, ca: 1.0  },
  predmt:  { label: 'Prediabetes',                    pts: 8,  category: 'dis', griFav: 1, ca: 1.0  },
  ir_occ:  { label: 'Occult IR',                      pts: 8,  category: 'phe', griFav: 1, ca: 1.0  },
  cortis:  { label: 'Corticosteroids >3 mo',          pts: 8,  category: 'tx',  griFav: 0, ca: 1.0  },
  hypo:    { label: 'Hypothyroidism',                 pts: 6,  category: 'dis', griFav: 0, ca: 1.0  },
  depres:  { label: 'Depression (treated)',            pts: 6,  category: 'tx',  griFav: 0, ca: 1.0  },
  antidep: { label: 'Obesiogenic antidepressants',    pts: 4,  category: 'tx',  griFav: 0, ca: 1.0  },
};

/** Section XII — Panel Biomarqueurs (15 items) */
export const BIOMARKERS = {
  homaIR:  { label: 'HOMA-IR',           w: 2.5, normal: 2.5, abnormal: 4.0,  inverted: false },
  adipon:  { label: 'Adiponectin',       w: 2.5, normal: 10,  abnormal: 6.0,  inverted: true  },
  hba1c:   { label: 'HbA1c',             w: 2.0, normal: 5.7, abnormal: 6.5,  inverted: false },
  crphs:   { label: 'CRP ultrasensitive',w: 2.0, normal: 1.0, abnormal: 3.0,  inverted: false },
  tghdl:   { label: 'TG/HDL ratio',      w: 2.0, normal: 2.0, abnormal: 3.5,  inverted: false },
  glyc:    { label: 'Fasting glucose',    w: 1.8, normal: 5.6, abnormal: 7.0,  inverted: false },
  ldl:     { label: 'LDL cholesterol',    w: 1.8, normal: 3.0, abnormal: 4.1,  inverted: false },
  tg:      { label: 'Triglycerides',      w: 1.5, normal: 1.7, abnormal: 2.3,  inverted: false },
  apob:    { label: 'ApoB',              w: 1.5, normal: 0.9, abnormal: 1.2,  inverted: false },
  leptine: { label: 'Leptin',            w: 1.5, normal: 20,  abnormal: 40,   inverted: false },
  tsh:     { label: 'TSH',               w: 1.3, normal: 4.0, abnormal: 4.0,  inverted: false },
  hdl:     { label: 'HDL cholesterol',    w: 1.0, normal: 1.0, abnormal: 0.7,  inverted: true  },
  asat:    { label: 'Transaminases',      w: 1.0, normal: 40,  abnormal: 60,   inverted: false },
  ggt:     { label: 'GGT',               w: 0.8, normal: 50,  abnormal: 80,   inverted: false },
  urate:   { label: 'Uric acid',         w: 0.8, normal: 360, abnormal: 420,  inverted: false },
  cpep:    { label: 'C-peptide',         w: 2.0, normal: 1.1, abnormal: 0.4,  inverted: true  },
  fgf21:   { label: 'FGF21',            w: 1.5, normal: 200, abnormal: 500,  inverted: false },
  glucag:  { label: 'Fasting glucagon',  w: 1.3, normal: 100, abnormal: 180,  inverted: false },
};

/** Markov comorbidity multipliers */
const MK_CM = { dt2: 1.4, sopk: 1.3, saos: 1.25, mets: 1.5 };

// ═══════════════════════════════════════════════════════════════════
// II. SECTION C — SCORE CLINIQUE (0-50)
// ═══════════════════════════════════════════════════════════════════

/** c1 : Âge */
function scoreAge(age) {
  if (age >= 65) return 10;
  if (age >= 55) return 7;
  if (age >= 45) return 5;
  if (age >= 40) return 2;
  return 0;
}

/** c2 : Sexe */
function scoreSex(sex, age) {
  return (sex === 'M' && age < 60) ? 2 : 0;
}

/** c3 : Anthropométrie (0-12) */
function scoreAnthropometry(bmi, whtr, waistCircumference, sex, ethnicCode) {
  const ep = ETHNIC_PROFILES[ethnicCode] || ETHNIC_PROFILES.eu;
  const thresholdSurpoids = ep.bmiSurpoids;
  const thresholdObesite  = ep.bmiObesite;

  // IMC component (0-7)
  let imcPts = 0;
  if (bmi >= thresholdObesite + 5) imcPts = 7;
  else if (bmi >= thresholdObesite)  imcPts = 5;
  else if (bmi >= thresholdSurpoids) imcPts = 3;

  // WHtR bonus (0-3)
  let whtrPts = 0;
  if (whtr != null) {
    if (whtr >= 0.60)      whtrPts = 3;
    else if (whtr >= 0.55) whtrPts = 2;
    else if (whtr >= 0.50) whtrPts = 1;
  }

  // Tour de taille bonus (0-2) — IDF 2006 ethnic thresholds
  let ttPts = 0;
  if (waistCircumference != null) {
    const ttThreshold = sex === 'F' ? ep.waistF : ep.waistM;
    const diff = waistCircumference - ttThreshold;
    if (diff > 10) ttPts = 2;
    else if (diff > 0) ttPts = 1;
  }

  return Math.min(12, imcPts + whtrPts + ttPts);
}

/** c4 : Comorbidités projetées (0-10) — Score BMN-K remappé */
function scoreComorbidities(activeComorbidities, ethnicCode) {
  const ep = ETHNIC_PROFILES[ethnicCode] || ETHNIC_PROFILES.eu;
  let bmnK = 0;

  for (const id of activeComorbidities) {
    const comorb = COMORBIDITIES[id];
    if (!comorb) continue;
    let pts = comorb.pts;
    // Modulation ethnique
    if (id === 'dt2' || id === 'predmt') pts *= ep.dR;
    if (id === 'hta') pts *= ep.hR;
    pts *= ep.cR;
    bmnK += pts;
  }

  bmnK = Math.min(50, bmnK);
  // Remap 0-50 → 0-10
  return Math.round((bmnK / 50) * 10);
}

/** c5 : Antécédents familiaux & génétique (0-10) */
function scoreFamilyHistory(familyData, ethnicCode) {
  const ep = ETHNIC_PROFILES[ethnicCode] || ETHNIC_PROFILES.eu;
  let pts = 0;

  // Parents obèses
  if (familyData.parentsObese === 2) pts += 4;
  else if (familyData.parentsObese === 1) pts += 2;

  // Obésité infantile
  if (familyData.childhoodObesity === 'severe') pts += 3;
  else if (familyData.childhoodObesity === 'mild') pts += 2;

  // DT2 parental
  if (familyData.parentsDT2 === 2) pts += 2;
  else if (familyData.parentsDT2 === 1) pts += 1;

  // Yo-yo dieting (≥3 cycles)
  if (familyData.yoyoDieting >= 3) pts += 2;

  // Modulation ethnique : c5_final = c5_raw × (1 + (cR-1)×0.3)
  pts = pts * (1 + (ep.cR - 1) * 0.3);

  return Math.min(10, Math.round(pts));
}

/** c6 : Tabac (0-8) */
function scoreTobacco(tobaccoStatus) {
  // tobaccoStatus: 0=never, 1=ex>1yr, 2=exRecent, 3=<10/day, 4=>=10/day
  const map = [0, 1, 2, 4, 8];
  return map[tobaccoStatus] ?? 0;
}

/** c7 : Santé mentale (0-8) — Composite PSS-10 + PHQ-9 + BES */
function scoreMentalHealth(pss10, phq9, bes) {
  let pts = 0;

  // PSS-10 (0-40)
  if (pss10 != null) {
    if (pss10 >= 27)      pts += 3;
    else if (pss10 >= 20) pts += 2;
    else if (pss10 >= 14) pts += 1;
  }

  // PHQ-9 (0-27)
  if (phq9 != null) {
    if (phq9 >= 20)      pts += 3;
    else if (phq9 >= 15) pts += 2;
    else if (phq9 >= 10) pts += 1;
  }

  // BES simplifié (0-8)
  if (bes != null) {
    if (bes >= 5) pts += 2;
    else if (bes >= 3) pts += 1;
  }

  return Math.min(8, pts);
}

/** c8 : Sommeil (0-4) — ISI + durée */
function scoreSleep(isi, sleepHours) {
  let pts = 0;

  // ISI (0-28)
  if (isi != null) {
    if (isi >= 22)      pts += 2;
    else if (isi >= 15) pts += 1.5;
    else if (isi >= 8)  pts += 1;
  }

  // Durée de sommeil (Cappuccio)
  if (sleepHours != null) {
    if (sleepHours < 5)       pts += 2;
    else if (sleepHours < 6)  pts += 1.5;
    else if (sleepHours < 7)  pts += 0.5;
  }

  return Math.min(4, Math.round(pts));
}

/**
 * Calcul complet du Score Clinique C (0-50)
 * C_final = round(C_raw × (1 + ev/100))
 */
export function computeScoreC(patient) {
  const eth = patient.ethnicCode || 'eu';
  const ep = ETHNIC_PROFILES[eth];

  const c1 = scoreAge(patient.age);
  const c2 = scoreSex(patient.sex, patient.age);
  const c3 = scoreAnthropometry(patient.bmi, patient.whtr, patient.waistCircumference, patient.sex, eth);
  const c4 = scoreComorbidities(patient.comorbidities || [], eth);
  const c5 = scoreFamilyHistory(patient.familyHistory || {}, eth);
  const c6 = scoreTobacco(patient.tobaccoStatus ?? 0);
  const c7 = scoreMentalHealth(patient.pss10, patient.phq9, patient.bes);
  const c8 = scoreSleep(patient.isi, patient.sleepHours);

  const cRaw = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8;
  const cFinal = Math.min(50, Math.round(cRaw * (1 + ep.ev / 100)));

  return {
    c1, c2, c3, c4, c5, c6, c7, c8,
    cRaw,
    C: cFinal,
  };
}

// ═══════════════════════════════════════════════════════════════════
// III. SECTION E — SCORE EXPOSOME (0-45)
// ═══════════════════════════════════════════════════════════════════

/** Layer A : Qualité de l'air, Température, UV → (0-1 normalisé) */
function computeLayerA(env) {
  let pts = 0;
  const maxPts = 15; // 8 (AQI) + 4 (thermal) + 3 (UV)

  // AQI
  const aqi = env.aqi ?? 0;
  if (aqi > 200)      pts += 8;
  else if (aqi > 150) pts += 6;
  else if (aqi > 100) pts += 4;
  else if (aqi > 50)  pts += 2;

  // Stress thermique
  const temp = env.temperature;
  if (temp != null) {
    if (temp > 40)       pts += 4;
    else if (temp > 35)  pts += 3;
    else if (temp > 30)  pts += 1;
    else if (temp < -5)  pts += 3;
    else if (temp < 5)   pts += 1;
  }

  // Indice UV
  const uv = env.uvIndex ?? 0;
  if (uv > 8)      pts += 3;
  else if (uv >= 6) pts += 2;
  else if (uv >= 3) pts += 1;

  return Math.min(1, pts / maxPts);
}

/** Layer B : Mobilité & Sédentarité → (0-1 normalisé) */
function computeLayerB(env) {
  let pts = 0;
  const maxPts = 10;

  // Distance de trajet
  const dist = env.commuteKm ?? 0;
  if (dist > 60)      pts += 5;
  else if (dist > 30) pts += 4;
  else if (dist > 15) pts += 3;
  else if (dist > 5)  pts += 2;

  // Temps assis — avec atténuation si AP ≥ 150 min/semaine
  let sittingPts = env.sittingHoursDay ?? 0;
  if (sittingPts > 8)      sittingPts = 5;
  else if (sittingPts > 6) sittingPts = 3;
  else if (sittingPts > 4) sittingPts = 2;
  else                      sittingPts = 0;

  // Atténuation si activité physique ≥ 150 min/semaine
  if ((env.physicalActivityMinWeek ?? 0) >= 150) {
    sittingPts *= 0.50;
  }
  pts += sittingPts;

  return Math.min(1, pts / maxPts);
}

/** Layer C : Perturbateurs endocriniens alimentaires → (0-1 normalisé) */
function computeLayerC(env) {
  let pts = 0;
  const maxPts = 6;

  // Ultra-transformés NOVA-4
  // env.ultraProcessedLevel : 0=low, 1=moderate, 2=high
  const upLevel = env.ultraProcessedLevel ?? 0;
  if (upLevel >= 2) pts += 3;
  else if (upLevel >= 1) pts += 1.5;

  // Fast-food fréquence
  // env.fastFoodPerWeek
  const ff = env.fastFoodPerWeek ?? 0;
  if (ff >= 4) pts += 3;
  else if (ff >= 2) pts += 2;
  else if (ff >= 1) pts += 1;

  return Math.min(1, pts / maxPts);
}

/**
 * Score Exposome E (0-45)
 * E* = 30 × (0.7×A + 0.5×B + 0.3×C) / 1.5
 * E  = min(45, round(E* × (1 + 0.15 × bInflam)))
 */
export function computeScoreE(env, bInflam = 0) {
  const A = computeLayerA(env);
  const B = computeLayerB(env);
  const C = computeLayerC(env);

  const eStar = 30 * (0.7 * A + 0.5 * B + 0.3 * C) / 1.5;
  const E = Math.min(45, Math.round(eStar * (1 + 0.15 * bInflam)));

  return { A, B, C, eStar, E };
}

// ═══════════════════════════════════════════════════════════════════
// IV. SECTION O — SCORE OCCUPATIONNEL (0-10)
// ═══════════════════════════════════════════════════════════════════

/**
 * Karasek model adapté
 * @param {Object} occ
 *   - status: 'active' | 'retired'
 *   - sedentaryDesk: boolean (>8h)
 *   - nightShift: boolean
 *   - prolongedSitting: boolean
 *   - hoursPerWeek: number
 *   - socialIsolation: boolean (retirees)
 */
export function computeScoreO(occ) {
  if (!occ) return { O: 0 };
  let pts = 0;

  if (occ.status === 'retired') {
    // Retraité : isolement social → risque CV +29%, mortalité +26%
    if (occ.socialIsolation) pts += 5;
    return { O: Math.min(10, pts) };
  }

  // Actif
  if (occ.sedentaryDesk)    pts += 6;  // OR 1.48
  if (occ.nightShift)       pts += 3;  // OR 1.29
  if (occ.prolongedSitting) pts += 2;
  if ((occ.hoursPerWeek ?? 0) > 55) pts += 2; // OR 1.12-1.17

  return { O: Math.min(10, pts) };
}

// ═══════════════════════════════════════════════════════════════════
// V. SECTION L — SCORE LIFESTYLE (0-10)
// ═══════════════════════════════════════════════════════════════════

/** l1 : Activité physique IPAQ (0-3) */
function scorePhysicalActivity(minPerWeek) {
  if (minPerWeek >= 150) return 0;
  if (minPerWeek >= 75)  return 1;
  if (minPerWeek >= 30)  return 2;
  return 3;
}

/** l2 : Nutrition DQI-BMN → PREDIMED (0-3) */
function scoreNutrition(predimed) {
  // PREDIMED 0-14 inversé : haut = bon → 0 pts
  if (predimed == null) return 0;
  if (predimed >= 10) return 0;
  if (predimed >= 7)  return 1;
  if (predimed >= 4)  return 2;
  return 3;
}

/** l3 : Alcool AUDIT-C (0-2) */
function scoreAlcohol(drinksPerWeek) {
  if (drinksPerWeek == null) return 0;
  if (drinksPerWeek > 21) return 2;
  if (drinksPerWeek > 14) return 1;
  return 0;
}

/** l4 : Sommeil / ISI (0-2) */
function scoreSleepLifestyle(isi, sleepHours) {
  let pts = 0;
  if ((sleepHours != null && sleepHours < 6) || (isi != null && isi >= 15)) {
    pts = 2;
  } else if ((sleepHours != null && sleepHours < 7) || (isi != null && isi >= 8)) {
    pts = 1;
  }
  return pts;
}

export function computeScoreL(lifestyle) {
  if (!lifestyle) return { l1: 0, l2: 0, l3: 0, l4: 0, L: 0 };
  const l1 = scorePhysicalActivity(lifestyle.physicalActivityMinWeek ?? 0);
  const l2 = scoreNutrition(lifestyle.predimed);
  const l3 = scoreAlcohol(lifestyle.drinksPerWeek);
  const l4 = scoreSleepLifestyle(lifestyle.isi, lifestyle.sleepHours);

  return { l1, l2, l3, l4, L: Math.min(10, l1 + l2 + l3 + l4) };
}

// ═══════════════════════════════════════════════════════════════════
// VI. SECTION XIII — BIONORM (Score Biomarqueurs)
// ═══════════════════════════════════════════════════════════════════

/**
 * Z-score borné [0, 1]
 * Direct :  z = clamp((value - normal) / (abnormal - normal), 0, 1)
 * Inversé : z = clamp((normal - value) / (normal - abnormal), 0, 1)
 */
function bioZScore(value, biomarkerDef) {
  const { normal, abnormal, inverted } = biomarkerDef;
  if (value == null) return null;

  let z;
  if (inverted) {
    z = (normal - value) / (normal - abnormal);
  } else {
    z = (value - normal) / (abnormal - normal);
  }
  return Math.max(0, Math.min(1, z));
}

/**
 * bioNorm = (Σ z_i × w_i / Σ w_i) × 100
 * Dénominateur adaptatif : seuls les biomarqueurs renseignés comptent
 */
export function computeBioNorm(bioValues) {
  if (!bioValues) return { bioNorm: 0, zScores: {}, sumW: 0, reportedCount: 0 };

  let sumZW = 0;
  let sumW = 0;
  const zScores = {};

  for (const [id, def] of Object.entries(BIOMARKERS)) {
    const val = bioValues[id];
    const z = bioZScore(val, def);
    if (z !== null) {
      zScores[id] = z;
      sumZW += z * def.w;
      sumW += def.w;
    }
  }

  const bioNorm = sumW > 0 ? Math.round((sumZW / sumW) * 100) : 0;
  return { bioNorm, zScores, sumW, reportedCount: Object.keys(zScores).length };
}

// ═══════════════════════════════════════════════════════════════════
// VII. SECTION XIV — SCORE FINAL (sf)
// ═══════════════════════════════════════════════════════════════════

/**
 * sD = min(100, C + E + O + L)
 * sf = wDecl × sD + wBio × bioNorm
 * Dynamic reweighting si gap > 20
 * Safety floors : BioFloor, BioEmergencyFloor, HbA1c Emergency
 */
export function computeScoreFinal(C, E, O, L, bioNorm, hba1cValue) {
  const sD = Math.min(100, C + E + O + L);

  // Poids par défaut
  let wDecl = 0.65;
  let wBio  = 0.35;

  // Dynamic reweighting
  const gap = bioNorm - sD;
  if (gap > 20) {
    const extraW = Math.min(0.30, ((gap - 20) / 100) * 0.60);
    wBio  = 0.35 + extraW; // max 0.65
    wDecl = 1 - wBio;
  }

  let sf = Math.round(wDecl * sD + wBio * bioNorm);

  // Safety Floor : sf ≥ 0.75 × bioNorm
  const bioFloor = Math.round(0.75 * bioNorm);
  if (sf < bioFloor) sf = bioFloor;

  // BioEmergencyFloor (BEF)
  if (bioNorm > 90) {
    const bef = Math.max(80, Math.round(0.85 * bioNorm));
    if (sf < bef) sf = bef;
  } else if (bioNorm > 80) {
    const bef = Math.round(0.85 * bioNorm);
    if (sf < bef) sf = bef;
  }

  // HbA1c Emergency gates
  if (hba1cValue != null) {
    if (hba1cValue >= 8.0 && sf < 70) sf = 70;
    else if (hba1cValue >= 6.5 && sf < 60) sf = 60;
  }

  sf = Math.min(100, sf);

  // Classification
  let label;
  if (sf >= 80)      label = 'TRÈS ÉLEVÉ';
  else if (sf >= 60) label = 'ÉLEVÉ';
  else if (sf >= 30) label = 'MODÉRÉ';
  else               label = 'FAIBLE';

  return { sD, sf, wDecl, wBio, label };
}

// ═══════════════════════════════════════════════════════════════════
// VIII. SECTION XV — SII (Indice Inflammatoire Indirect)
// ═══════════════════════════════════════════════════════════════════

/**
 * 7 critères binaires ; ≥2 déclenche panel P5 obligatoire
 */
export function computeSII(patient) {
  const eth = patient.ethnicCode || 'eu';
  const ep = ETHNIC_PROFILES[eth];
  const criteria = [];

  // 1. Stress PSS ratio ≥ 0.35
  if ((patient.pss10 ?? 0) / 40 >= 0.35) criteria.push('stress');

  // 2. Inactivité AP < 75 min/semaine
  if ((patient.physicalActivityMinWeek ?? 0) < 75) criteria.push('inactivity');

  // 3. Obésité IMC ≥ seuil ethnique
  if ((patient.bmi ?? 0) >= ep.bmiObesite) criteria.push('obesity');

  // 4. Tabagisme actif (tobaccoStatus ≥ 3)
  if ((patient.tobaccoStatus ?? 0) >= 3) criteria.push('smoking');

  // 5. Alimentation pauvre (alimRaw ≥ 20)
  if ((patient.alimRaw ?? 0) >= 20) criteria.push('poorDiet');

  // 6. Insomnie modérée+ (ISI ≥ 15)
  if ((patient.isi ?? 0) >= 15) criteria.push('insomnia');

  // 7. Obésité abdominale TT > seuil ethnique
  const ttThreshold = patient.sex === 'F' ? ep.waistF : ep.waistM;
  if ((patient.waistCircumference ?? 0) > ttThreshold) criteria.push('abdominalObesity');

  const count = criteria.length;
  const triggerP5 = count >= 2;

  return { criteria, count, triggerP5 };
}

// ═══════════════════════════════════════════════════════════════════
// IX. SECTION XVI — CTI (Chronicity Trajectory Index)
// ═══════════════════════════════════════════════════════════════════

/**
 * CTI = min(100, round((Σ γ_j × Z_j / 1.459) × 100 × ctiAmp))
 *
 * Composants Z_j normalisés [0, 1]
 */
export function computeCTI(patient, sD, activeComorbidities) {
  const GAMMA_SUM = 1.459;

  // Calcul des Z normalisés
  const zDeclarative = Math.min(1, (sD ?? 0) / 100);                              // γ = 0.185
  const zYoyo = Math.min(1, ((patient.familyHistory?.yoyoDieting ?? 0) >= 3) ? 1 : (patient.familyHistory?.yoyoDieting ?? 0) / 3); // γ = 0.249
  const hasLeptinResistance = (patient.bioValues?.leptine ?? 0) >= 40;
  const hasSAOS = (activeComorbidities || []).includes('saos');
  const hasObesity = (patient.bmi ?? 0) >= (ETHNIC_PROFILES[patient.ethnicCode || 'eu'].bmiObesite);
  const zLeptin = Math.min(1, ((hasLeptinResistance ? 0.4 : 0) + (hasSAOS ? 0.3 : 0) + (hasObesity ? 0.3 : 0))); // γ = 0.210

  // Nutrition — inversé depuis le score PREDIMED
  const predimed = patient.lifestyle?.predimed ?? 7;
  const zNutrition = Math.min(1, Math.max(0, 1 - predimed / 14));                 // γ = 0.180

  // Cortisol composite (stress + sommeil + horaire)
  const stressZ = Math.min(1, (patient.pss10 ?? 0) / 40);
  const sleepZ  = Math.min(1, Math.max(0, (patient.isi ?? 0) / 28));
  const nightZ  = patient.occupational?.nightShift ? 0.5 : 0;
  const zCortisol = Math.min(1, (stressZ + sleepZ + nightZ) / 2.5);               // γ = 0.195

  // Métabolisme (hypothyroïdie + yo-yo)
  const hasHypo = (activeComorbidities || []).includes('hypo');
  const zMetabolism = Math.min(1, ((hasHypo ? 0.5 : 0) + (zYoyo * 0.5)));        // γ = 0.200

  // Obésité infantile
  const childObesity = patient.familyHistory?.childhoodObesity;
  const zChildhood = childObesity === 'severe' ? 1.0 : childObesity === 'mild' ? 0.6 : 0; // γ = 0.240

  // Somme pondérée
  const weightedSum =
    0.185 * zDeclarative +
    0.249 * zYoyo +
    0.210 * zLeptin +
    0.180 * zNutrition +
    0.195 * zCortisol +
    0.200 * zMetabolism +
    0.240 * zChildhood;

  // ctiAmp = max comorbidity category amplifier
  let ctiAmp = 1.0;
  for (const id of (activeComorbidities || [])) {
    const c = COMORBIDITIES[id];
    if (c && c.ca > ctiAmp) ctiAmp = c.ca;
  }

  const cti = Math.min(100, Math.round((weightedSum / GAMMA_SUM) * 100 * ctiAmp));

  // Interprétation
  let label;
  if (cti <= 20)      label = 'Fenêtre ouverte';
  else if (cti <= 40) label = 'Début chronicisation';
  else if (cti <= 55) label = 'Chronicité avancée';
  else                label = 'Chronicité installée';

  return {
    cti, label, ctiAmp,
    components: { zDeclarative, zYoyo, zLeptin, zNutrition, zCortisol, zMetabolism, zChildhood },
  };
}

// ═══════════════════════════════════════════════════════════════════
// X. SECTION XVII/XVIII — GRI / GRS / PPE (GLP-1 Engine v2.0)
// ═══════════════════════════════════════════════════════════════════

/** Facteurs favorables δ pour le GRI */
const GRI_FAVORABLE_DELTAS = {
  predmt: 0.82, sopk: 0.83, monw: 0.70, mets: 0.65,
  nafld: 0.66, dt2: 0.65, ir_occ: 0.55,
};

/**
 * GRI = Σ δ_k × F_k − Σ ε_k × U_k
 * Range: −3 à +6
 */
export function computeGRI(patient, activeComorbidities, cti, bioValues) {
  let posFav = 0;
  let negUnfav = 0;

  // Facteurs favorables — comorbidités avec gri_fav=1
  for (const id of (activeComorbidities || [])) {
    const delta = GRI_FAVORABLE_DELTAS[id];
    if (delta) posFav += delta;
  }

  // Facteurs favorables — biomarqueurs
  if ((bioValues?.homaIR ?? 0) > 2.5) posFav += 1.07;
  if ((bioValues?.adipon ?? Infinity) < 6) posFav += 0.62;
  if ((bioValues?.tghdl ?? 0) > 3.5) posFav += 0.55;

  // Facteurs défavorables
  if ((activeComorbidities || []).includes('cortis')) negUnfav += 0.35;
  if (cti > 55) negUnfav += 0.65;
  if ((patient.bmi ?? 0) > 40) negUnfav += 0.47;
  if ((patient.pss10 ?? 0) / 40 >= 0.6) negUnfav += 0.28;

  let gri = posFav - negUnfav;
  gri = Math.max(-3, Math.min(6, gri));

  return { gri, posFav, negUnfav };
}

/**
 * 6 axes d'évaluation pour le moteur de réponse GLP-1
 */
function computeGLP1Axes(patient, activeComorbidities, cti, bioValues) {
  // Axe 1: Insulin Resistance (0-10, ↑ positive)
  let irAxis = 0;
  if ((bioValues?.homaIR ?? 0) >= 4.0) irAxis += 4;
  else if ((bioValues?.homaIR ?? 0) >= 2.5) irAxis += 2;
  if ((bioValues?.adipon ?? Infinity) < 6) irAxis += 2;
  if ((bioValues?.tghdl ?? 0) >= 3.5) irAxis += 2;
  if ((activeComorbidities || []).includes('sopk')) irAxis += 1;
  if ((activeComorbidities || []).includes('nafld')) irAxis += 1;
  irAxis = Math.min(10, irAxis);

  // Axe 2: Chronicity-Resistance (0-10, ↓ negative)
  let chronAxis = 0;
  chronAxis += Math.min(4, Math.round(cti / 15));
  if ((patient.familyHistory?.yoyoDieting ?? 0) >= 3) chronAxis += 2;
  if ((bioValues?.leptine ?? 0) >= 40) chronAxis += 2;
  if (patient.familyHistory?.childhoodObesity) chronAxis += 1;
  if ((patient.bmi ?? 0) >= 40) chronAxis += 1;
  chronAxis = Math.min(10, chronAxis);

  // Axe 3: Inflammation (0-10, ↑ positive)
  let inflamAxis = 0;
  if ((bioValues?.crphs ?? 0) >= 3.0) inflamAxis += 3;
  else if ((bioValues?.crphs ?? 0) >= 1.0) inflamAxis += 1;
  if ((bioValues?.ggt ?? 0) >= 80) inflamAxis += 2;
  // bInflam proxy
  const zCRP = bioValues?.crphs != null ? Math.min(1, Math.max(0, (bioValues.crphs - 1) / 2)) : 0;
  const zTGHDL = bioValues?.tghdl != null ? Math.min(1, Math.max(0, (bioValues.tghdl - 2) / 1.5)) : 0;
  const zHOMA = bioValues?.homaIR != null ? Math.min(1, Math.max(0, (bioValues.homaIR - 2.5) / 1.5)) : 0;
  const bInflam = (zCRP + zTGHDL + zHOMA) / 3;
  inflamAxis += Math.round(bInflam * 5);
  inflamAxis = Math.min(10, inflamAxis);

  // Axe 4: Psycho-behavioral (0-10, ↓ negative)
  let psychoAxis = 0;
  if ((patient.phq9 ?? 0) >= 15) psychoAxis += 3;
  else if ((patient.phq9 ?? 0) >= 10) psychoAxis += 2;
  if ((patient.pss10 ?? 0) >= 20) psychoAxis += 3;
  else if ((patient.pss10 ?? 0) >= 14) psychoAxis += 2;
  if ((patient.bes ?? 0) >= 5) psychoAxis += 2;
  if ((activeComorbidities || []).includes('depres')) psychoAxis += 2;
  psychoAxis = Math.min(10, psychoAxis);

  // Axe 5: Iatrogenic (0-5, ↓ negative)
  let iatroAxis = 0;
  if ((activeComorbidities || []).includes('cortis')) iatroAxis += 2;
  if ((activeComorbidities || []).includes('antidep')) iatroAxis += 2;
  if ((activeComorbidities || []).includes('hypo')) iatroAxis += 1;
  iatroAxis = Math.min(5, iatroAxis);

  // Axe 6: Demographic (bonus, ↑ positive)
  let demoBonus = 0;
  if (patient.age >= 30 && patient.age <= 65) demoBonus += 0.5;
  if (patient.sex === 'F') demoBonus += 0.3;
  const irProneEthnicities = ['im', 'sa', 'cr'];
  if (irProneEthnicities.includes(patient.ethnicCode)) demoBonus += 0.2;

  // Axe 7: Beta-cell / Secretory Function (0-5, ↑ positive)
  // Preserved beta-cell function = better GLP-1 response (incrétine effect)
  let betaCellAxis = 0;
  const cpep = bioValues?.cpep;
  if (cpep != null) {
    if (cpep >= 2.0) betaCellAxis += 2;      // Strong secretory reserve
    else if (cpep >= 1.1) betaCellAxis += 1;  // Normal function
    // Low C-peptide = depleted beta cells = poor GLP-1 response
    if (cpep < 0.4) betaCellAxis -= 2;
  } else {
    // Proxy: if no C-peptide available, use HOMA-IR + HbA1c as surrogate
    // High HOMA + moderate HbA1c = IR-driven (good beta reserve)
    // High HOMA + high HbA1c = beta-cell failure
    const homaVal = bioValues?.homaIR ?? 0;
    const hba1cVal = bioValues?.hba1c ?? 5.5;
    if (homaVal >= 2.5 && hba1cVal < 7.0) betaCellAxis += 1;  // IR-driven, preserved beta
    if (hba1cVal >= 8.5) betaCellAxis -= 1;  // Likely beta depletion
  }
  // FGF21 resistance (elevated FGF21 = chronic metabolic stress)
  const fgf21Val = bioValues?.fgf21;
  if (fgf21Val != null) {
    if (fgf21Val >= 500) betaCellAxis -= 1;  // FGF21 resistance
    else if (fgf21Val <= 200) betaCellAxis += 1;  // Healthy FGF21 signaling
  }
  // Fasting glucagon (hyperglucagonemia = GLP-1 resistance)
  const glucagVal = bioValues?.glucag;
  if (glucagVal != null) {
    if (glucagVal >= 180) betaCellAxis -= 1;  // Alpha-cell dysregulation
    else if (glucagVal <= 100) betaCellAxis += 1;  // Normal suppression
  }
  betaCellAxis = Math.max(-3, Math.min(5, betaCellAxis));

  return { irAxis, chronAxis, inflamAxis, psychoAxis, iatroAxis, demoBonus, bInflam, betaCellAxis };
}

/**
 * GRS composite + Profil de réponse + PPE
 * GRS = (posFactor − negFactor + GRI) / 2    borné [−3, +6]
 */
export function computeGLP1Engine(patient, activeComorbidities, cti, bioValues) {
  const { gri } = computeGRI(patient, activeComorbidities, cti, bioValues);
  const axes = computeGLP1Axes(patient, activeComorbidities, cti, bioValues);

  const posFactor = axes.irAxis * 0.30 + axes.inflamAxis * 0.12 + axes.demoBonus + Math.max(0, axes.betaCellAxis) * 0.08;
  const negFactor = axes.chronAxis * 0.18 + axes.psychoAxis * 0.12 + axes.iatroAxis * 0.15 + Math.max(0, -axes.betaCellAxis) * 0.05;

  let grs = (posFactor - negFactor + gri) / 2;
  grs = Math.max(-3, Math.min(6, grs));

  // Profil de réponse
  let profile, respProb, firstLine;

  // Contra-indications
  const hba1c = bioValues?.hba1c ?? 0;
  const hasCortis = (activeComorbidities || []).includes('cortis');
  if (hba1c >= 10 || ((patient.bmi ?? 0) >= 50 && cti > 70) || hasCortis) {
    profile = 'CI';
    respProb = 'N/A';
    firstLine = 'Insulin/surgery/correction';
  } else if (grs >= 2.5 && axes.irAxis >= 4 && axes.chronAxis <= 4) {
    profile = 'R1';
    respProb = '>85%';
    firstLine = 'Tirzepatide | Semaglutide';
  } else if (grs >= 1.5 && axes.irAxis >= 2) {
    profile = 'R2';
    respProb = '60-85%';
    firstLine = 'Semaglutide';
  } else if (grs >= 0.5 && axes.chronAxis <= 6 && axes.irAxis >= 1) {
    profile = 'R3';
    respProb = '30-60%';
    firstLine = 'Semaglutide + multimodal';
  } else if (grs >= -0.5) {
    profile = 'R4';
    respProb = '<30%';
    firstLine = '3-month trial → surgery';
  } else {
    profile = 'R5';
    respProb = '<10%';
    firstLine = 'Bariatric surgery 1st line';
  }

  // PPE — Personalized Weight Loss Estimate
  let ppeBase;
  if (profile === 'R1') ppeBase = 20; // Tirzepatide
  else if (profile === 'R2') ppeBase = 15; // Semaglutide
  else ppeBase = 10;

  let ppeMod = 0;
  // Positive modulations
  if (axes.irAxis >= 4) ppeMod += 3;
  if ((activeComorbidities || []).includes('sopk')) ppeMod += 2;
  // Negative modulations
  if (axes.chronAxis >= 6) ppeMod -= 5;
  if ((bioValues?.leptine ?? 0) >= 40) ppeMod -= 4;
  if (axes.psychoAxis >= 6) ppeMod -= 3;
  if (axes.iatroAxis >= 3) ppeMod -= 4;
  if ((patient.familyHistory?.yoyoDieting ?? 0) >= 3) ppeMod -= 2;
  if ((patient.bmi ?? 0) >= 45) ppeMod -= 3;
  if ((patient.age ?? 0) >= 65) ppeMod -= 2;

  const ppe = Math.max(0, Math.min(25, ppeBase + ppeMod));

  return {
    gri, grs: Math.round(grs * 100) / 100,
    axes,
    profile, respProb, firstLine,
    ppe,
  };
}

// ═══════════════════════════════════════════════════════════════════
// XI. SECTION XIX — MODÈLE DE MARKOV (Projection 10 ans)
// ═══════════════════════════════════════════════════════════════════

/** Matrice de transition de base (10 ans NHANES) — 6 états */
const BASE_TRANSITION_MATRIX = [
  [0.82, 0.14, 0.03, 0.01, 0,    0   ],
  [0.08, 0.68, 0.18, 0.05, 0.01, 0   ],
  [0.02, 0.11, 0.61, 0.21, 0.04, 0.01],
  [0.01, 0.04, 0.14, 0.56, 0.21, 0.04],
  [0,    0.01, 0.03, 0.12, 0.65, 0.19],
  [0,    0,    0.01, 0.03, 0.11, 0.85],
];

/**
 * Déterminer l'état initial Markov à partir du BMI et profil ethnique
 */
function getInitialState(bmi, ethnicCode) {
  const ep = ETHNIC_PROFILES[ethnicCode] || ETHNIC_PROFILES.eu;
  if (bmi < ep.bmiSurpoids - 2) return 0;       // Poids normal
  if (bmi < ep.bmiSurpoids) return 1;             // Surpoids léger
  if (bmi < ep.bmiObesite) return 2;               // Surpoids établi
  if (bmi < ep.bmiObesite + 3) return 3;           // Surpoids élevé
  if (bmi < ep.bmiObesite + 8) return 4;           // Obésité modérée
  return 5;                                         // Obésité sévère
}

/**
 * Projection Markov 10 ans
 *
 * rf = exp(0.68 × sf/100) × exp(0.35 × K_norm/100)
 * cm = max(MK_CM[comorbidity])
 *
 * Pour chaque année :
 *   - transitions ascendantes (j > i) : row[j] *= rf × cm
 *   - transitions descendantes (j < i) : row[j] /= rf
 *   - renormaliser chaque ligne → somme = 1
 *
 * P(obesity @ 10yr) = (prob[4] + prob[5]) × 100
 */
export function computeMarkov(sf, bmnK, bmi, activeComorbidities, ethnicCode) {
  const kNorm = (Math.min(50, bmnK) / 50) * 100;
  const rf = Math.exp(0.68 * sf / 100) * Math.exp(0.35 * kNorm / 100);

  // cm = max comorbidity multiplier
  let cm = 1.0;
  for (const id of (activeComorbidities || [])) {
    if (MK_CM[id] && MK_CM[id] > cm) cm = MK_CM[id];
  }

  const initialState = getInitialState(bmi, ethnicCode);

  // État initial : vecteur de probabilité
  let stateVec = new Array(6).fill(0);
  stateVec[initialState] = 1.0;

  // Appliquer 10 itérations annuelles
  for (let year = 0; year < 10; year++) {
    // Construire la matrice ajustée pour cette année
    const matrix = BASE_TRANSITION_MATRIX.map(row => [...row]);

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        if (j > i) {
          // Transition ascendante
          matrix[i][j] *= rf * cm;
        } else if (j < i) {
          // Transition descendante
          matrix[i][j] /= rf;
        }
      }
      // Renormaliser la ligne
      const rowSum = matrix[i].reduce((a, b) => a + b, 0);
      for (let j = 0; j < 6; j++) {
        matrix[i][j] /= rowSum;
      }
    }

    // Multiplier le vecteur d'état par la matrice
    const newVec = new Array(6).fill(0);
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < 6; i++) {
        newVec[j] += stateVec[i] * matrix[i][j];
      }
    }
    stateVec = newVec;
  }

  // P(obesity @ 10yr) = (prob[state 4] + prob[state 5]) × 100
  const pObesity10yr = Math.round((stateVec[4] + stateVec[5]) * 100);

  return {
    initialState,
    rf: Math.round(rf * 1000) / 1000,
    cm,
    stateDistribution: stateVec.map(v => Math.round(v * 1000) / 1000),
    pObesity10yr,
  };
}

// ═══════════════════════════════════════════════════════════════════
// XII. ORCHESTRATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════

/**
 * Calcul complet SCORE BMN v3.5
 *
 * @param {Object} patient — Données complètes du patient :
 *   - age: number
 *   - sex: 'M' | 'F'
 *   - ethnicCode: string (eu, im, cr, si, sa, af, ea, se, fm)
 *   - bmi: number
 *   - whtr: number | null
 *   - waistCircumference: number | null
 *   - comorbidities: string[] (ids from COMORBIDITIES)
 *   - familyHistory: { parentsObese: 0|1|2, childhoodObesity: null|'mild'|'severe',
 *                       parentsDT2: 0|1|2, yoyoDieting: number }
 *   - tobaccoStatus: 0-4
 *   - pss10: number (0-40)
 *   - phq9: number (0-27)
 *   - bes: number (0-8)
 *   - isi: number (0-28)
 *   - sleepHours: number
 *   - physicalActivityMinWeek: number
 *   - alimRaw: number (score alimentation brut)
 *   - environment: { aqi, temperature, uvIndex, commuteKm, sittingHoursDay,
 *                     physicalActivityMinWeek, ultraProcessedLevel, fastFoodPerWeek }
 *   - occupational: { status, sedentaryDesk, nightShift, prolongedSitting,
 *                       hoursPerWeek, socialIsolation }
 *   - lifestyle: { physicalActivityMinWeek, predimed, drinksPerWeek, isi, sleepHours }
 *   - bioValues: { homaIR, adipon, hba1c, crphs, tghdl, glyc, ldl, tg, apob,
 *                   leptine, tsh, hdl, asat, ggt, urate, cpep, fgf21, glucag } (all optional)
 *
 * @returns {Object} Résultat complet avec tous les sous-scores
 */
export function computeScoreBMN(patient) {
  const eth = patient.ethnicCode || 'eu';
  const comorbidities = patient.comorbidities || [];
  const bioValues = patient.bioValues || {};

  // ── 1. Score Clinique C (0-50) ──
  const scoreC = computeScoreC(patient);

  // ── 2. Calcul bInflam pour l'Exposome ──
  const zCRP  = bioValues.crphs != null  ? Math.min(1, Math.max(0, (bioValues.crphs - 1) / 2)) : 0;
  const zTGHDL = bioValues.tghdl != null ? Math.min(1, Math.max(0, (bioValues.tghdl - 2) / 1.5)) : 0;
  const zHOMA  = bioValues.homaIR != null ? Math.min(1, Math.max(0, (bioValues.homaIR - 2.5) / 1.5)) : 0;
  const bInflam = (zCRP + zTGHDL + zHOMA) / 3;

  // ── 3. Score Exposome E (0-45) ──
  const scoreE = computeScoreE(patient.environment || {}, bInflam);

  // ── 4. Score Occupationnel O (0-10) ──
  const scoreO = computeScoreO(patient.occupational);

  // ── 5. Score Lifestyle L (0-10) ──
  const scoreL = computeScoreL(patient.lifestyle);

  // ── 6. BioNorm ──
  const bio = computeBioNorm(bioValues);

  // ── 7. Score Final sf ──
  const final = computeScoreFinal(
    scoreC.C, scoreE.E, scoreO.O, scoreL.L,
    bio.bioNorm,
    bioValues.hba1c
  );

  // ── 8. SII (Indice Inflammatoire Indirect) ──
  const sii = computeSII(patient);

  // ── 9. CTI (Chronicity Trajectory Index) ──
  const ctiResult = computeCTI(patient, final.sD, comorbidities);

  // ── 10. GLP-1 Engine (GRI + GRS + PPE) ──
  const glp1 = computeGLP1Engine(patient, comorbidities, ctiResult.cti, bioValues);

  // ── 11. BMN-K pour Markov ──
  let bmnK = 0;
  const ep = ETHNIC_PROFILES[eth];
  for (const id of comorbidities) {
    const c = COMORBIDITIES[id];
    if (!c) continue;
    let pts = c.pts;
    if (id === 'dt2' || id === 'predmt') pts *= ep.dR;
    if (id === 'hta') pts *= ep.hR;
    pts *= ep.cR;
    bmnK += pts;
  }
  bmnK = Math.min(50, bmnK);

  // ── 12. Modèle de Markov (projection 10 ans) ──
  const markov = computeMarkov(final.sf, bmnK, patient.bmi, comorbidities, eth);

  // ── Résultat complet ──
  return {
    // Sous-scores déclaratifs
    clinical: scoreC,
    exposome: scoreE,
    occupational: scoreO,
    lifestyle: scoreL,

    // Score déclaratif agrégé
    sD: final.sD,

    // Biomarqueurs
    bioNorm: bio.bioNorm,
    bioDetails: bio,
    bInflam: Math.round(bInflam * 1000) / 1000,

    // Score final
    sf: final.sf,
    sfLabel: final.label,
    wDecl: final.wDecl,
    wBio: final.wBio,

    // SII
    sii,

    // CTI
    cti: ctiResult.cti,
    ctiLabel: ctiResult.label,
    ctiDetails: ctiResult,

    // GLP-1 Engine
    gri: glp1.gri,
    grs: glp1.grs,
    glp1Profile: glp1.profile,
    glp1RespProb: glp1.respProb,
    glp1FirstLine: glp1.firstLine,
    ppe: glp1.ppe,
    glp1Axes: glp1.axes,

    // Markov
    markov,

    // Classification
    classification: {
      sf: final.label,
      sD: final.sD < 30 ? 'FAIBLE' : final.sD < 60 ? 'MODÉRÉ' : final.sD < 80 ? 'ÉLEVÉ' : 'TRÈS ÉLEVÉ',
      bioNorm: bio.bioNorm < 30 ? 'FAIBLE' : bio.bioNorm < 60 ? 'MODÉRÉ' : bio.bioNorm < 80 ? 'ÉLEVÉ' : 'TRÈS ÉLEVÉ',
      cti: ctiResult.label,
      grs: glp1.grs < -0.5 ? 'FAIBLE' : glp1.grs < 1.5 ? 'MODÉRÉ' : glp1.grs < 2.5 ? 'ÉLEVÉ' : 'TRÈS ÉLEVÉ',
    },
  };
}
