import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

// ─── Health ───
app.get('/api/health', (c) => c.json({ status: 'ok', version: '8.0', name: 'Score BMN v3.4 AI+Geo+BTM+FNC' }))

// ─── GEO PROXY: Geocoding via Nominatim ───
app.get('/api/geo/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ error: 'Missing q parameter' }, 400)
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr`, {
      headers: { 'User-Agent': 'ScoreBMN/2.0 (health-assessment-tool)' }
    })
    const data: any = await r.json()
    if (data.length) {
      return c.json({
        results: data.map((d: any) => ({
          lat: +d.lat, lon: +d.lon,
          name: d.display_name.split(',').slice(0, 3).join(',').trim(),
          full: d.display_name
        }))
      })
    }
    return c.json({ results: [] })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─── GEO PROXY: Reverse geocode ───
app.get('/api/geo/reverse', async (c) => {
  const lat = c.req.query('lat'), lon = c.req.query('lon')
  if (!lat || !lon) return c.json({ error: 'Missing lat/lon' }, 400)
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`, {
      headers: { 'User-Agent': 'ScoreBMN/2.0 (health-assessment-tool)' }
    })
    const d: any = await r.json()
    return c.json({
      name: d.display_name ? d.display_name.split(',').slice(0, 3).join(',').trim() : `${(+lat).toFixed(3)}, ${(+lon).toFixed(3)}`,
      full: d.display_name || '',
      city: d.address?.city || d.address?.town || d.address?.village || '',
      country: d.address?.country || ''
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─── GEO PROXY: IP geolocation (multiple fallbacks) ───
app.get('/api/geo/ip', async (c) => {
  // Try multiple free IP geolocation services
  const services = [
    async () => {
      const r = await fetch('https://get.geojs.io/v1/ip/geo.json')
      const d: any = await r.json()
      if (d.latitude && d.longitude) return { lat: +d.latitude, lon: +d.longitude, name: `${d.city || ''}, ${d.region || ''}, ${d.country || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '').trim() }
      return null
    },
    async () => {
      const r = await fetch('https://ipwho.is/')
      const d: any = await r.json()
      if (d.latitude && d.longitude) return { lat: d.latitude, lon: d.longitude, name: `${d.city || ''}, ${d.region || ''}, ${d.country || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '').trim() }
      return null
    },
    async () => {
      const r = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon')
      const d: any = await r.json()
      if (d.status === 'success') return { lat: d.lat, lon: d.lon, name: `${d.city || ''}, ${d.regionName || ''}, ${d.country || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '').trim() }
      return null
    }
  ]
  for (const svc of services) {
    try {
      const result = await svc()
      if (result) return c.json(result)
    } catch (e) { /* try next */ }
  }
  return c.json({ error: 'IP geolocation failed' }, 500)
})

// ─── GEO PROXY: Air Quality (Open-Meteo) ───
app.get('/api/geo/air', async (c) => {
  const lat = c.req.query('lat'), lon = c.req.query('lon')
  if (!lat || !lon) return c.json({ error: 'Missing lat/lon' }, 400)
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&timezone=auto`
    const r = await fetch(url)
    return c.json(await r.json())
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─── GEO PROXY: Weather (Open-Meteo) ───
app.get('/api/geo/weather', async (c) => {
  const lat = c.req.query('lat'), lon = c.req.query('lon')
  if (!lat || !lon) return c.json({ error: 'Missing lat/lon' }, 400)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto`
    const r = await fetch(url)
    return c.json(await r.json())
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─── Claude AI Proxy (keeps API key server-side) ───
app.post('/api/ai/analyze', async (c) => {
  try {
    const body = await c.req.json()
    const { profile, question } = body

    const systemPrompt = `Tu es un assistant medical expert en obesite, metabolisme et medecine preventive.
Tu analyses le profil d'un patient dans le cadre du Score BMN v3.4 (Bach-Manos-Noel).
Ton role:
1. Adapter les questions du questionnaire au profil du patient
2. Expliquer en langage simple les resultats et risques
3. Fournir des conseils personnalises bases sur les donnees
4. Identifier les facteurs de risque critiques
5. Integrer le Module BTM v3.4 (Bariatric & Therapeutic Module) : scoring matriciel 27 facteurs x 6 techniques (BT-1 Ballon, BT-2 ESG, BT-3 Sleeve, BT-4 Bypass, BT-5 GLP-1, BT-6 Associations). MOD-01 exclusivite IMC, MOD-05 delta normalise, MOD-09 score_pct.
6. Integrer FNC v1.0 (Normalisation Climatique Koppen) : 6 zones, acclimatation progressive, AQI non normalise.

References: OMS, IDF, ADA 2024, FINDRISC, IPAQ, PHQ-9, PSS-10, ISI, BES-16 (Gormally 1982), AUDIT-C, Lancet 2016, SCORE2/Framingham, STEP 1-5, SURMOUNT 1-4, STAMPEDE, SM-BOSS, MERIT, Fothergill 2016.

IMPORTANT: Reponds TOUJOURS en JSON valide avec cette structure:
{
  "analysis": "texte d'analyse courte (2-3 phrases max)",
  "risk_flags": ["liste de drapeaux de risque identifies"],
  "suggestions": ["suggestions personnalisees courtes"],
  "adapted_questions": ["questions supplementaires pertinentes si necessaire"],
  "severity": "low|moderate|high|critical"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Profil patient: ${JSON.stringify(profile)}\n\nQuestion/Contexte: ${question}`
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return c.json({ error: 'AI API error', details: errText }, 500)
    }

    const data: any = await response.json()
    const text = data.content?.[0]?.text || '{}'
    
    let parsed
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: text }
    } catch {
      parsed = { analysis: text, risk_flags: [], suggestions: [], severity: 'low' }
    }

    return c.json(parsed)
  } catch (e: any) {
    return c.json({ error: e.message || 'Unknown error' }, 500)
  }
})

// ─── Claude AI for result interpretation ───
app.post('/api/ai/interpret', async (c) => {
  try {
    const body = await c.req.json()
    const { scores, profile } = body

    const systemPrompt = `Tu es un medecin expert en obesite et metabolisme.
Tu interpretes les resultats du Score BMN v3.4 pour un patient.
Donne une interpretation personnalisee, empathique et actionnable en francais.
Si le patient a un score BTM v3.4 (Module Bariatrique), integre la recommandation therapeutique personnalisee (scoring matriciel, primaire, secondaire, delta normalise, confiance, BT-6 associations, contre-indications, parcours de soins).
Si FNC est appliquee (zone != Z4), mentionne la normalisation climatique et son impact sur le score Exposome.
IMPORTANT: Reponds en JSON:
{
  "summary": "resume en 2-3 phrases",
  "key_risks": ["risques principaux identifies"],
  "priority_actions": ["3 actions prioritaires concretes"],
  "positive_points": ["points positifs du profil"],
  "medical_attention": "ce qui necessite attention medicale (ou null)",
  "lifestyle_tips": ["3 conseils mode de vie personnalises"],
  "tone": "reassuring|cautious|urgent"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Scores BMN: ${JSON.stringify(scores)}\nProfil complet: ${JSON.stringify(profile)}`
        }]
      })
    })

    if (!response.ok) {
      return c.json({ error: 'AI API error' }, 500)
    }

    const data: any = await response.json()
    const text = data.content?.[0]?.text || '{}'
    
    let parsed
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text }
    } catch {
      parsed = { summary: text }
    }

    return c.json(parsed)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ─── Claude AI Rapport Strategique Complet pour le medecin ───
app.post('/api/ai/rapport', async (c) => {
  try {
    const body = await c.req.json()
    const { scores, biologie, profil, contexte } = body

    const systemPrompt = `Tu es un medecin expert en endocrinologie, obesite et metabolisme, specialise dans la medecine de precision et l'aide a la decision clinique.

Tu rediges un RAPPORT STRATEGIQUE COMPLET a destination du medecin traitant, base sur les resultats du Score BMN v3.4 (architecture CLEO + BTM v2.0 + FNC v1.0).

CONTEXTE ALGORITHMIQUE:
- Score sf = wDecl × sD + wBio × bioNorm (0-100)
- sD = C(clinique, 0-50) + E(exposome, 0-45) + O(occupationnel, 0-10) + L(lifestyle, 0-10)
- CTI = Chronicity Trajectory Index (0-100) : mesure le degre d'installation de l'obesite
- GRI = GLP-1 Response Index : predit la reponse au traitement GLP-1
- SII = Sous-Index Inflammatoire (0-7) : 7 criteres binaires
- K = Score de comorbidites (0-50)
- bioNorm = score biologique normalise (0-100) calcule par z-scores ponderes
- BTM v3.4 = Module Bariatrique & Therapeutique : scoring matriciel 27 facteurs x 6 techniques (BT-1 Ballon, BT-2 ESG, BT-3 Sleeve, BT-4 Bypass, BT-5 GLP-1, BT-6 Associations). 10 MOD appliquees: MOD-01 exclusivite IMC, MOD-02 colinearite DT2/CTI, MOD-03 BT-6, MOD-04 ASA>=4 ESG+2, MOD-05 delta normalise, MOD-06 valeurs manquantes, MOD-07 GRS R4/R5 ESG+1, MOD-08 ATCD ballon-2, MOD-09 score_pct, MOD-10 zero option.
- FNC v1.0 = Normalisation Climatique Koppen : 6 zones (Z1 Tropical humide, Z2 Desert chaud, Z3 Mediterraneen, Z4 Tempere reference, Z5 Continental, Z6 Tropical sec). Acclimatation progressive: FNC_eff = 1 - (1-FNC) * min(1, mois_residence/12). AQI NON normalise.

TON RAPPORT DOIT CONTENIR:
1. diagnostic_resume: Resume diagnostique en 3-4 phrases, incluant le profil de risque global et les elements determinants
2. synthese_clinique: Synthese clinique detaillee (5-8 phrases) integrant l'interpretation des scores C, E, O, L, le CTI, le GRI, les comorbidites, et la biologie si disponible
3. points_positifs: [tableau] Elements favorables du profil (min 2, max 5)
4. risques_identifies: [tableau] Risques principaux hierarchises par urgence (min 2, max 6)
5. plan_therapeutique: [tableau] Plan d'action concret en 5-8 etapes, ordonne par priorite, avec temporalite
6. recommandation_pharmacologique: Texte sur la pharmacologie recommandee. IMPORTANT: Utilise les donnees du GLP-1 PROFILING fourni (profil, molecule, dose, PPE). Si profil R1/R2: recommander la molecule et dose specifiques. Si R3: GLP-1 avec reserves. Si R4/R5/CI: alternatives (chirurgie, programme multimodal). Explique POURQUOI le patient est ou n'est pas candidat GLP-1 en citant les axes (IR, chronicite, resistance).
7. suivi_propose: Calendrier de suivi precis (frequence, examens, objectifs)
8. conseils_patient: [tableau] 3-5 conseils personnalises et actionables pour le patient
9. attention_medicale: Points de vigilance pour le medecin (ou null si rien d'urgent)
10. btm_therapeutique: Si BTM disponible, inclure: 11.1 Score BTM Global (score_brut, score_pct), 11.2 Recommandation primaire (nom, technique, score_pct, confiance), 11.3 Recommandation secondaire (delta_relatif), 11.4 Efficacite attendue (%TBWL, %EWL, BT-6 si applicable), 11.5 Associations recommandees (BT-6 type, medicaments), 11.6 Contre-indications, 11.7 Parcours de soins. Si IMC < 27, indiquer 'BTM non applicable'.
11. fnc_note: Si FNC appliquee (zone != Z4), commenter l'impact de la normalisation climatique sur le score Exposome et l'interpretation.
12. note_methodologique: Si colinearite DT2/CTI detectee, le mentionner (MOD-02).
13. tone: "reassuring" | "cautious" | "urgent"

REGLES:
- Sois precis, utilise les chiffres du patient
- Adapte le ton a la gravite (sf < 30 = rassurant, 30-59 = prudent, >= 60 = urgent)
- Mentionne les references scientifiques quand pertinent (ADA 2024, SCORE2, etc.)
- N'invente pas de donnees biologiques si elles ne sont pas fournies
- Si biologie non disponible, indique l'importance de la realiser
- Redige en francais medical professionnel mais comprehensible

IMPORTANT: Reponds UNIQUEMENT en JSON valide, sans texte avant ou apres.`

    const userMsg = `DONNEES PATIENT:

SCORES:
- Score final (sf): ${scores.sf}/100 — Classification: ${scores.classification}
- Score declaratif (sD): ${scores.sD}/100 — Classification declarative: ${scores.classDecl}
  - C (clinique): ${scores.scoreC}/50
  - E (exposome): ${scores.scoreE}/45
  - O (occupationnel): ${scores.scoreO}/10
  - L (lifestyle): ${scores.scoreL}/10
- CTI (chronicite): ${scores.cti}/100
- GRI (reponse GLP-1): ${scores.gri}
- SII (inflammatoire): ${scores.sii}/7
- K (comorbidites): ${scores.bmn_k}/50
- Panel bio prescrit: P${scores.panelLvl}
${scores.bInflam ? '- bInflam (triade inflammatoire): ' + scores.bInflam : ''}

GLP-1 PROFILING:
${body.glp1_profiling ? `- Profil: ${body.glp1_profiling.profileCode} — ${body.glp1_profiling.profileName}
- GRS (GLP-1 Response Score): ${body.glp1_profiling.grs}
- PPE (Perte poids estimee): ${body.glp1_profiling.ppeEstimate}%
- Molecule recommandee: ${body.glp1_profiling.molecule || 'Aucune'}
- Dose cible: ${body.glp1_profiling.doseCible || 'N/A'}
- Axes: IR=${body.glp1_profiling.axes?.irScore}/10, Chronicite=${body.glp1_profiling.axes?.chronScore}/10, Inflammation=${body.glp1_profiling.axes?.inflamScore}/10, Psycho=${body.glp1_profiling.axes?.psychoScore}/10, Iatrogene=${body.glp1_profiling.axes?.iatroScore}/5
- Facteurs efficacite (${body.glp1_profiling.efficacyCount}): ${body.glp1_profiling.topEfficacy?.join(', ') || 'Aucun'}
- Facteurs resistance (${body.glp1_profiling.resistanceCount}): ${body.glp1_profiling.topResistance?.join(', ') || 'Aucun'}
- Alternative: ${body.glp1_profiling.alternative || 'Aucune'}` : 'Non disponible'}

PROFIL:
- Age: ${profil.age} ans | Sexe: ${profil.sexe === 'f' ? 'Femme' : 'Homme'} | Ethnie: ${profil.ethnie}
- IMC: ${profil.imc} kg/m2 | Taille: ${profil.taille_cm} cm | Poids: ${profil.poids_kg} kg | Tour de taille: ${profil.tt_cm} cm
- Comorbidites: ${profil.comorbidites?.length ? profil.comorbidites.join(', ') : 'Aucune declaree'}
- PSS-10 (stress): ${profil.pss10}/40 | PHQ-9 (depression): ${profil.phq9}/27 | BES-16: ${profil.bes16 || profil.bes}/46 | ISI: ${profil.isi}
- Tabac: ${profil.tabac_cig} | Alcool: ${profil.alcool}

BTM v3.4 (Module Bariatrique — Scoring Matriciel):
${body.btm ? `- GERD: ${body.btm.gerd} | ASA: ${body.btm.asa} | ATCD chirurgie: ${body.btm.atcdChir} | ATCD ballon: ${body.btm.atcdBallon||0} (type: ${body.btm.atcdBallonType||'N/A'}) | NASH: ${body.btm.nash} | CV: ${body.btm.comorbCV}
- Preference patient: ${body.btm.prefPatient} | Refus chirurgie: ${body.btm.refusChir}
- Ranking: ${body.btm.ranked?.join(' > ') || 'N/A'}
- Scores bruts: ${body.btm.score_brut ? Object.entries(body.btm.score_brut).map(([k,v])=>k+'='+v).join(', ') : 'N/A'}
- Scores normalises (%): ${body.btm.score_pct ? Object.entries(body.btm.score_pct).map(([k,v])=>k+'='+v+'%').join(', ') : 'N/A'}
- Delta: absolu=${body.btm.delta_abs}, relatif=${body.btm.delta_rel}% — Confiance: ${body.btm.confiance}
- Recommandation primaire: ${body.btm.primary?.name || 'N/A'} (${body.btm.primary?.tech || ''})
- Recommandation secondaire: ${body.btm.secondary?.name || 'N/A'}
- BT-6 Association: ${body.btm.bt6_type ? body.btm.bt6_type.n+' (Grade '+body.btm.bt6_type.grade+', TBWL 12m: '+body.btm.bt6_type.tbwl12+')' : 'N/A'}
- Associations: ${body.btm.assoc?.join(', ') || 'Aucune'}
- Contre-indications: ${body.btm.contraind?.join(', ') || 'Aucune'}
- Alarmes: ${body.btm.alarmes?.join(', ') || 'Aucune'}
- Efficacite attendue: TBWL ${body.btm.tbwl || 'N/A'}, EWL ${body.btm.ewl || 'N/A'}
- Complexite: ${body.btm.complexity}/5 | Facteurs actifs: ${body.btm.facteurs_actifs||0} | Manquants: ${body.btm.facteurs_manquants?.join(', ')||'Aucun'}
- Parcours: ${body.btm.parcours?.join(' > ') || 'N/A'}` : 'Non disponible'}

FNC v1.0 (Normalisation Climatique):
${body.fnc ? `- Zone: ${body.fnc.zone} (${body.fnc.label}) | Residence: ${body.fnc.residenceMois} mois` : 'Z4 (reference, pas de normalisation)'}

BIOLOGIE:
${biologie.present ? 'bioNorm = ' + biologie.bioNorm + '/100 (wDecl=' + biologie.wDecl + ', wBio=' + biologie.wBio + ')\nMarqueurs: ' + JSON.stringify(biologie.marqueurs) : 'Non disponible — prescrire panel ' + scores.panelLvl}

CONTEXTE:
- Prescription: ${contexte.prescription_bio}
- Strategies algorithmiques: ${contexte.strategies?.join(', ')}
- P(obesite 10 ans): ${contexte.prob_obesite_10ans}
- Localisation: ${contexte.geo || 'Non renseignee'} | Expo air: ${contexte.expo_air ?? 'N/A'}

Redige le rapport strategique complet.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return c.json({ error: 'AI API error', details: errText }, 500)
    }

    const data: any = await response.json()
    const text = data.content?.[0]?.text || '{}'

    let parsed
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { diagnostic_resume: text }
    } catch {
      parsed = { diagnostic_resume: text }
    }

    return c.json(parsed)
  } catch (e: any) {
    return c.json({ error: e.message || 'Unknown error' }, 500)
  }
})

// ─── Dossier Algorithme BMN ───
app.get('/dossier', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOSSIER ALGORITHME — SCORE BMN v3.4</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x2695;</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f172a;--bg2:#1e293b;--bg3:#334155;--txt:#e2e8f0;--dim:#94a3b8;--dim2:#64748b;--dim3:#475569;--accent:#818cf8;--green:#22c55e;--green-bg:rgba(34,197,94,.1);--orange:#f59e0b;--orange-bg:rgba(245,158,11,.1);--red:#ef4444;--red-bg:rgba(239,68,68,.1);--purple:#a855f7;--purple-bg:rgba(168,85,247,.1);--teal:#14b8a6;--cyan:#22d3ee;--border:rgba(255,255,255,.06);--border2:rgba(255,255,255,.1);--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--txt);line-height:1.7;-webkit-font-smoothing:antialiased}
.doc{max-width:900px;margin:0 auto;padding:20px 24px 60px}
h1{font-size:28px;font-weight:900;color:var(--accent);margin:40px 0 8px;letter-spacing:-.5px;border-bottom:2px solid var(--accent);padding-bottom:8px}
h2{font-size:22px;font-weight:800;color:var(--cyan);margin:36px 0 10px;padding:10px 14px;background:var(--bg2);border-radius:10px;border-left:4px solid var(--cyan)}
h3{font-size:16px;font-weight:700;color:var(--teal);margin:20px 0 8px}
h4{font-size:14px;font-weight:600;color:var(--orange);margin:14px 0 6px}
p{margin:6px 0;font-size:13px;color:var(--dim)}
b,strong{color:var(--txt);font-weight:700}
code{font-family:var(--mono);font-size:12px;background:var(--bg3);color:var(--cyan);padding:2px 6px;border-radius:4px}
pre{background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:14px 16px;overflow-x:auto;margin:10px 0;font-family:var(--mono);font-size:11px;color:var(--teal);line-height:1.6}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
th{background:var(--bg3);color:var(--accent);padding:8px 10px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;border:1px solid var(--border2)}
td{padding:7px 10px;border:1px solid var(--border);color:var(--dim);vertical-align:top}
tr:nth-child(even){background:rgba(255,255,255,.02)}
tr:hover{background:rgba(129,140,248,.05)}
.hero{text-align:center;padding:40px 20px;margin-bottom:20px;background:linear-gradient(135deg,var(--bg2),var(--bg));border:1px solid var(--border2);border-radius:16px}
.hero h1{border:none;font-size:36px;margin:0;color:var(--accent)}
.hero .sub{font-size:14px;color:var(--dim);margin-top:6px}
.hero .ver{font-size:12px;color:var(--dim3);margin-top:4px}
.formula-box{background:var(--bg2);border:2px solid var(--accent);border-radius:14px;padding:18px 20px;margin:16px 0;text-align:center}
.formula-box .f{font-family:var(--mono);font-size:18px;font-weight:700;color:var(--accent);margin:8px 0}
.formula-box .d{font-size:11px;color:var(--dim2)}
.toc{background:var(--bg2);border-radius:12px;padding:16px 20px;margin:20px 0}
.toc a{display:block;padding:4px 0;color:var(--dim);font-size:12px;text-decoration:none;border-bottom:1px solid var(--border)}
.toc a:hover{color:var(--accent)}
.toc a span{color:var(--accent);font-weight:700;margin-right:6px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:#fff;margin:0 2px}
.badge.g{background:var(--green)}.badge.o{background:var(--orange)}.badge.r{background:var(--red)}.badge.p{background:var(--purple)}.badge.a{background:var(--accent)}
.card{background:var(--bg2);border-radius:12px;padding:14px 16px;margin:10px 0;border:1px solid var(--border2)}
.card-title{font-size:14px;font-weight:700;color:var(--txt);margin-bottom:6px}
.note{background:var(--bg3);border-left:3px solid var(--orange);padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0;font-size:12px;color:var(--orange)}
.synth{background:var(--bg2);border:2px solid var(--teal);border-radius:14px;padding:20px;margin:20px 0}
.synth pre{background:var(--bg);border-color:var(--teal);color:var(--cyan);font-size:12px}
.nav-top{position:sticky;top:0;z-index:100;background:var(--bg);border-bottom:1px solid var(--border2);padding:8px 0;margin-bottom:10px}
.nav-top a{color:var(--accent);text-decoration:none;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px}
.nav-top a:hover{background:var(--bg2)}
.print-btn{display:inline-block;padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;margin:10px 4px}
.print-btn:hover{opacity:.9}
@media print{body{background:#fff;color:#000}.doc{max-width:100%}h1,h2,h3{color:#000}th{background:#ddd;color:#000}td{color:#333}.nav-top,.print-btn{display:none}pre,code{background:#f5f5f5;color:#333}table{font-size:10px}.hero{background:#f8f8f8}}
</style>
</head>
<body>
<div class="doc" id="top">

<div class="hero">
  <h1>DOSSIER COMPLET</h1>
  <h1 style="font-size:24px;border:none;margin-top:4px">ALGORITHME SCORE BMN v3.4</h1>
  <div class="sub">Architecture CLEO (C + E + O + L) + Integration Biologique BSD v4.9</div>
  <div class="ver">Auteurs : Bach | Manos | Noel — Version 3.1 — Verrouille le 2 mars 2026</div>
  <div style="margin-top:14px">
    <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
    <a href="/" class="print-btn" style="text-decoration:none;background:var(--teal)">Retour Score BMN</a>
  </div>
</div>

<!-- TABLE DES MATIERES -->
<h2 id="toc">Table des matieres</h2>
<div class="toc">
  <a href="#s1"><span>1.</span> Vue d'ensemble</a>
  <a href="#s2"><span>2.</span> Architecture generale</a>
  <a href="#s3"><span>3.</span> Profils ethniques (9 profils)</a>
  <a href="#s4"><span>4.</span> Comorbidites (13 declaratives + IR occulte auto)</a>
  <a href="#s5"><span>5.</span> Biomarqueurs (15 marqueurs)</a>
  <a href="#s6"><span>6.</span> Instruments psychometriques valides</a>
  <a href="#s7"><span>7.</span> Phase C — Score Clinique (0-50)</a>
  <a href="#s8"><span>8.</span> Phase E — Score Exposome (0-45)</a>
  <a href="#s9"><span>9.</span> Phase O — Score Occupationnel (0-10)</a>
  <a href="#s10"><span>10.</span> Phase L — Score Lifestyle (0-10)</a>
  <a href="#s11"><span>11.</span> Score Declaratif sD</a>
  <a href="#s12"><span>12.</span> Classification Declarative</a>
  <a href="#s13"><span>13.</span> SII — Sous-Index Inflammatoire (0-7)</a>
  <a href="#s14"><span>14.</span> Criteres Independants</a>
  <a href="#s15"><span>15.</span> Prescription Biologique (P0/P5/P10/P15)</a>
  <a href="#s16"><span>16.</span> Score Biologique bioNorm (0-100)</a>
  <a href="#s17"><span>17.</span> Score Final sf — Integration Dynamique</a>
  <a href="#s18"><span>18.</span> CTI — Chronicity Trajectory Index (0-100)</a>
  <a href="#s19"><span>19.</span> GRI — GLP-1 Response Index</a>
  <a href="#s19b"><span>19b.</span> GLP-1 Response Profiling Engine v2.0 (NOUVEAU)</a>
  <a href="#s20"><span>20.</span> Modele de Markov — Projection 10 ans</a>
  <a href="#s21"><span>21.</span> Retro-Diagnostic Biologique</a>
  <a href="#s22"><span>22.</span> Profils de Simulation</a>
  <a href="#s23"><span>23.</span> Strategies Therapeutiques</a>
  <a href="#s24"><span>24.</span> Rapport IA (Aide au Medecin)</a>
  <a href="#s25"><span>25.</span> APIs et Sources Temps Reel</a>
  <a href="#s26"><span>26.</span> Flux de Navigation (20 ecrans)</a>
  <a href="#s27"><span>27.</span> References Scientifiques</a>
  <a href="#s28" style="color:#14b8a6;font-weight:700"><span>28.</span> Module BTM v3.4 — Bariatric & Therapeutic Module (MOD-01 a MOD-10)</a>
  <a href="#s29" style="color:#14b8a6;font-weight:700"><span>29.</span> FNC v1.0 — Normalisation Climatique Koppen (NOUVEAU v3.4)</a>
  <a href="#synth"><span>*</span> SYNTHESE — Formules Cles Verrouillees</a>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 1. VUE D'ENSEMBLE -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s1">1. Vue d'ensemble</h2>
<p>Le <strong>Score BMN v3.4</strong> est un algorithme d'evaluation du risque metabolique et d'obesite, concu pour assister le medecin dans sa prise de decision. Il integre :</p>
<ul style="margin:8px 0 8px 20px;font-size:13px;color:var(--dim)">
  <li><strong>Donnees declaratives</strong> du patient (cliniques, mode de vie, psychometriques)</li>
  <li><strong>Donnees biologiques</strong> (15 biomarqueurs avec z-scores ponderes)</li>
  <li><strong>Donnees environnementales en temps reel</strong> (qualite de l'air, meteo, UV)</li>
  <li><strong>Intelligence artificielle</strong> (Claude AI) pour rapport strategique personnalise</li>
  <li><strong>Modele predictif de Markov</strong> (projection a 10 ans)</li>
</ul>

<div class="formula-box">
  <div class="d">FORMULE CENTRALE</div>
  <div class="f">sf = wDecl &times; sD + wBio &times; bioNorm</div>
  <div class="d">sf = Score final (0-100) | sD = Score declaratif CLEO | bioNorm = Score biologique BSD v4.7.1</div>
  <div class="d">wDecl = 0.65 | wBio = 0.35 (reponderation dynamique si gap &gt; 20)</div>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 2. ARCHITECTURE -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s2">2. Architecture generale</h2>
<pre>
PATIENT &rarr; QUESTIONNAIRE (20 ecrans)
              |
              v
         CLEO ENGINE
         +---------------------+
         |  C (0-50) ---- Clinique : age, sexe, IMC, TT, WHtR, comorbidites,
         |                 ATCD familiaux, tabac, stress, sommeil
         |  E (0-45) ---- Exposome : air (PM2.5, NO2, O3), temp, UV,
         |                 trajet, sedentarite, perturbateurs endocriniens
         |  O (0-10) ---- Occupationnel : type travail, horaires, posture,
         |                 nuit, retraite, isolement social
         |  L (0-10) ---- Lifestyle : activite physique, alimentation DQI,
         |                 alcool, sommeil
         +---------+-----------+
                   |
                   v
            sD = min(100, C+E+O+L)
                   |
          +--------+--------+
          |  Classification  | -- FAIBLE (&lt;30) | MODERE (30-59) | ELEVE (60-79) | TRES ELEVE (&gt;=80)
          +--------+--------+
                   |
          +--------+--------+
          |  SII (0-7)      | -- 7 criteres binaires inflammatoires
          |  + Criteres ind. | -- Age&gt;=40, ATCD, comorbidites
          +--------+--------+
                   |
                   v
          PRESCRIPTION BIOLOGIQUE
          P0 (optionnel) | P5 (7 marqueurs) | P10 (15 marqueurs) | P15 (20 marqueurs)
                   |
                   v
          +----------------------+
          |  BIOLOGIE BSD v4.7.1 |
          |  bioNorm = (&Sigma; z_i &times; w_i / &Sigma; w_i) &times; 100
          |  bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR)
          +----------+-----------+
                     |
                     v
          SCORE FINAL sf = wDecl &times; sD + wBio &times; bioNorm
          + BioFloor (75%) + BEF (85%) + Reponderation dynamique
                     |
          +----------+---------------------+
          |  CTI (0-100)                    | -- Trajectoire de chronicite
          |  GRI (-3 a +6)                 | -- Prediction reponse GLP-1
          |  Markov (10 ans)               | -- Probabilite d'obesite
          |  Retro-diagnostic              | -- Coherence declaratif/bio
          |  Strategies                    | -- Plan therapeutique personnalise
          |  Rapport IA                    | -- Claude AI pour medecin
          +--------------------------------+
</pre>

<!-- ═══════════════════════════════════════════ -->
<!-- 3. PROFILS ETHNIQUES -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s3">3. Profils Ethniques (9 profils)</h2>
<p><strong>Sources :</strong> OMS Asia-Pacific 2004, IDF 2006, Lancet 2016</p>
<div style="overflow-x:auto">
<table>
<tr><th>Code</th><th>Nom</th><th>Surpoids</th><th>Obesite</th><th>TT F</th><th>TT M</th><th>dR (DT2)</th><th>cvR (CV)</th><th>hR (HTA)</th><th>cR</th><th>iM</th><th>LDL</th><th>ev%</th></tr>
<tr><td><code>eu</code></td><td>Europeen / Caucasien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td></tr>
<tr><td><code>im</code></td><td>Indo-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.8</td><td>1.2</td><td>1.4</td><td>1.2</td><td>1.3</td><td>-1.5</td></tr>
<tr><td><code>cr</code></td><td>Creole Mauricien</td><td>25</td><td>30</td><td>84</td><td>94</td><td>1.6</td><td>1.5</td><td>1.4</td><td>1.2</td><td>1.2</td><td>1.0</td><td>-2</td></tr>
<tr><td><code>si</code></td><td>Sino-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.7</td><td>1.4</td><td>0.9</td><td>0.6</td><td>0.9</td><td>0.9</td><td>+1.5</td></tr>
<tr><td><code>sa</code></td><td>Sud-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.8</td><td>1.3</td><td>1.5</td><td>1.2</td><td>1.3</td><td>-1.5</td></tr>
<tr><td><code>af</code></td><td>Africain / Subsaharien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.5</td><td>1.6</td><td>1.5</td><td>1.2</td><td>1.3</td><td>1.0</td><td>-1.5</td></tr>
<tr><td><code>ea</code></td><td>Est-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>88</td><td>0.9</td><td>0.9</td><td>0.9</td><td>0.7</td><td>0.9</td><td>0.9</td><td>+1.5</td></tr>
<tr><td><code>se</code></td><td>Sud-Est Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.2</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td></tr>
<tr><td><code>fm</code></td><td>Franco-Mauricien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0.9</td><td>1.0</td><td>1.0</td><td>+1</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td><code>met</code></td><td>Metis Mauricien</td><td>24</td><td>28</td><td>84</td><td>94</td><td>1.5</td><td>1.4</td><td>1.2</td><td>1.1</td><td>1.1</td><td>1.0</td><td>-0.5</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td><code>ar</code></td><td>Arabe / MENA</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.7</td><td>1.5</td><td>1.2</td><td>1.2</td><td>1.1</td><td>1.1</td><td>-1</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td><code>oth</code></td><td>Autre / Non specifie</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td></tr>
</table>
</div>
<p><code>ow</code> = seuil surpoids IMC | <code>ob</code> = seuil obesite IMC | <code>tf/tm</code> = tour de taille seuil F/M (cm) | <code>dR</code> = multiplicateur DT2 | <code>cvR</code> = multiplicateur CV | <code>hR</code> = risque HTA | <code>cR</code> = risque coronarien | <code>iM</code> = multiplicateur inflammation Layer A | <code>ev</code> = variation ethnique % appliquee a C</p>
<p style="font-size:10px;color:var(--teal)">v3.4 : 12 profils (9 §Dossier Maitre + Est-Asiatique, Sud-Est Asiatique, Autre). Lignes vertes = ajouts v3.4 (Metis, Arabe/MENA, Autre).</p>

<!-- ═══════════════════════════════════════════ -->
<!-- 4. COMORBIDITES -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s4">4. Comorbidites (13 declaratives + IR occulte auto-detectee)</h2>
<p><strong>Sources :</strong> ADA 2024, IDF MetS, DPP. Score BMN-K = somme des points, cap <strong>50</strong>.</p>

<h3>Maladies etablies</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Pts</th><th>Evidence</th><th>Description</th><th>CTI (ca)</th><th>GRI (gr)</th><th>Fav</th></tr>
<tr><td><code>dt2</code></td><td>Diabete Type 2</td><td><b>14</b></td><td>HR 3.84</td><td>Insulinoresistance severe. Perte esperance vie 8.9 ans</td><td>1.8</td><td>0.65</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>predmt</code></td><td>Pre-diabete</td><td><b>8</b></td><td>HR 2.11</td><td>HbA1c 5.7-6.4%. Reversible</td><td>1.2</td><td>0.82</td><td><span class="badge g">Oui</span></td></tr>
<tr><td><code>hta</code></td><td>HTA etablie</td><td><b>10</b></td><td>HR 2.24</td><td>Facteur aggravant obesite viscerale</td><td>1.1</td><td>0</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>saos</code></td><td>SAOS</td><td><b>12</b></td><td>OR 2.19</td><td>Insulinoresistance via hypoxie + cortisol nocturne</td><td>1.4</td><td>0</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>sopk</code></td><td>SOPK (Femme)</td><td><b>14</b></td><td>OR 2.77</td><td>Phenotype IR feminin. GLP-1 efficace</td><td>1.2</td><td>0.83</td><td><span class="badge g">Oui</span></td></tr>
<tr><td><code>nafld</code></td><td>NAFLD / Steatose</td><td><b>10</b></td><td>OR 3.22</td><td>Insulinoresistance hepatique</td><td>1.1</td><td>0.66</td><td><span class="badge g">Oui</span></td></tr>
<tr><td><code>hypo</code></td><td>Hypothyroidie</td><td><b>6</b></td><td>OR 1.74</td><td>TSH &gt; 4. Metabolisme ralenti -10/15%</td><td>1.3</td><td>0</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>mets</code></td><td>Syndrome metabolique</td><td><b>12</b></td><td>HR 2.64</td><td>3 criteres IDF ou plus</td><td>1.3</td><td>0.65</td><td><span class="badge g">Oui</span></td></tr>
<tr style="background:rgba(129,140,248,.12);border:2px solid var(--accent)"><td><code>dyslipi</code></td><td><b>Dyslipidemie v3.1</b></td><td><b>6-10</b></td><td>HR 1.87-2.34</td><td>3 sous-types : Mixte (10pts) | LDL isole (6pts) | Traitee statines (8pts). Flag statines corrige bioNorm (LDL×1.35). Interaction MetS: K+=3</td><td>1.05-1.15</td><td>0.20-0.55</td><td><span class="badge g">Oui</span></td></tr>
</table>

<h3>Phenotypes metaboliques</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Pts</th><th>Evidence</th><th>Description</th><th>ca</th><th>gr</th><th>Fav</th></tr>
<tr><td><code>monw</code></td><td>Phenotype MONW</td><td><b>10</b></td><td>OR 2.38</td><td>IMC &lt; 25 mais 2+ criteres MetS</td><td>1.1</td><td>0.70</td><td><span class="badge g">Oui</span></td></tr>
<tr style="background:rgba(239,68,68,.08);border:1px dashed var(--red)"><td><code>ir_occ</code></td><td>IR occulte <b>(AUTO)</b></td><td><b>8</b></td><td>OR 2.12</td><td>⚠ Non declarable. Detection automatique si TG/HDL &gt; 3.5 dans la biologie. +8 pts BMN-K injectes automatiquement.</td><td>1.2</td><td>0.55</td><td><span class="badge g">Auto</span></td></tr>
</table>

<h3>Traitements aggravants</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Pts</th><th>Evidence</th><th>Description</th><th>ca</th><th>gr</th><th>Fav</th></tr>
<tr><td><code>cortis</code></td><td>Corticoides &gt; 3 mois</td><td><b>8</b></td><td>HR 2.12</td><td>Adipogenese viscerale iatrogene</td><td>1.6</td><td>-0.35</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>antidep</code></td><td>Antidepresseurs</td><td><b>4</b></td><td>OR 1.58</td><td>Paroxetine/mirtazapine</td><td>1.1</td><td>0</td><td><span class="badge r">Non</span></td></tr>
<tr><td><code>depres</code></td><td>Depression traitee</td><td><b>6</b></td><td>OR 1.92</td><td>Impact metabolique bidirectionnel</td><td>1.2</td><td>0</td><td><span class="badge r">Non</span></td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 5. BIOMARQUEURS -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s5">5. Biomarqueurs (15 marqueurs)</h2>
<p><strong>Sources :</strong> SCORE2/Framingham, ADA 2024, CTT 2010, ERFC 2010, CKD-PC 2010. Somme totale des poids = <strong>23.2</strong></p>

<h3>Panel P5 — Depistage (tier = 5)</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Unite</th><th>Normal</th><th>Anormal</th><th>Poids w</th><th>Inv.</th><th>Plage OK</th><th>Alerte</th></tr>
<tr><td><code>homaIR</code></td><td>HOMA-IR</td><td>-</td><td>2.5</td><td>4.0</td><td><b>2.5</b></td><td>Non</td><td>&lt; 2.5</td><td>&ge; 4.0</td></tr>
<tr><td><code>hba1c</code></td><td>HbA1c</td><td>%</td><td>5.7</td><td>6.5</td><td><b>2.0</b></td><td>Non</td><td>&lt; 5.7</td><td>&ge; 6.5</td></tr>
<tr><td><code>glyc</code></td><td>Glycemie a jeun</td><td>mmol/L</td><td>5.6</td><td>7.0</td><td><b>1.8</b></td><td>Non</td><td>&lt; 5.6</td><td>&ge; 7.0</td></tr>
<tr><td><code>crphs</code></td><td>CRP ultrasensible</td><td>mg/L</td><td>1.0</td><td>3.0</td><td><b>2.0</b></td><td>Non</td><td>&lt; 1.0</td><td>&ge; 3.0</td></tr>
<tr><td><code>tsh</code></td><td>TSH</td><td>mUI/L</td><td>4.0</td><td>8.0</td><td><b>1.3</b></td><td>Non</td><td>0.4-4.0</td><td>&gt; 4.0</td></tr>
<tr><td><code>ldl</code></td><td>LDL cholesterol</td><td>mmol/L</td><td>3.0</td><td>4.1</td><td><b>1.8</b></td><td>Non</td><td>&lt; 3.0</td><td>&ge; 4.1</td></tr>
<tr><td><code>hdl</code></td><td>HDL cholesterol</td><td>mmol/L</td><td>1.0</td><td>0.7</td><td><b>1.0</b></td><td><span class="badge o">Oui</span></td><td>&ge; 1.0</td><td>&lt; 0.7</td></tr>
</table>

<h3>Panel P10 — Metabolique complet (+5 marqueurs, tier = 10)</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Unite</th><th>Normal</th><th>Anormal</th><th>Poids w</th><th>Inv.</th><th>Plage OK</th><th>Alerte</th></tr>
<tr><td><code>tg</code></td><td>Triglycerides</td><td>mmol/L</td><td>1.7</td><td>2.3</td><td><b>1.5</b></td><td>Non</td><td>&lt; 1.7</td><td>&ge; 2.3</td></tr>
<tr><td><code>adipon</code></td><td>Adiponectine</td><td>ug/mL</td><td>10.0</td><td>6.0</td><td><b>2.5</b></td><td><span class="badge o">Oui</span></td><td>&ge; 10</td><td>&lt; 6.0</td></tr>
<tr><td><code>asat</code></td><td>Transaminases</td><td>UI/L</td><td>40</td><td>60</td><td><b>1.0</b></td><td>Non</td><td>&lt; 40</td><td>&ge; 60</td></tr>
<tr><td><code>apob</code></td><td>ApoB</td><td>g/L</td><td>0.9</td><td>1.2</td><td><b>1.5</b></td><td>Non</td><td>&lt; 0.9</td><td>&ge; 1.2</td></tr>
<tr><td><code>ggt</code></td><td>GGT</td><td>UI/L</td><td>50</td><td>80</td><td><b>0.8</b></td><td>Non</td><td>&lt; 50</td><td>&ge; 80</td></tr>
</table>

<h3>Panel P15 — Endocrinien complet (+3 marqueurs, tier = 15)</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Unite</th><th>Normal</th><th>Anormal</th><th>Poids w</th><th>Inv.</th><th>Plage OK</th><th>Alerte</th></tr>
<tr><td><code>tghdl</code></td><td>Ratio TG/HDL</td><td>-</td><td>2.0</td><td>3.5</td><td><b>2.0</b></td><td>Non</td><td>&lt; 2.0</td><td>&ge; 3.5</td></tr>
<tr><td><code>urate</code></td><td>Acide urique</td><td>umol/L</td><td>360</td><td>420</td><td><b>0.8</b></td><td>Non</td><td>&lt; 360</td><td>&ge; 420</td></tr>
<tr><td><code>leptine</code></td><td>Leptine</td><td>ng/mL</td><td>20</td><td>40</td><td><b>1.5</b></td><td>Non</td><td>&lt; 20</td><td>&ge; 40</td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 6. INSTRUMENTS PSYCHO -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s6">6. Instruments psychometriques valides</h2>

<div class="card">
  <div class="card-title">PSS-10 — Perceived Stress Scale (Cohen 1983)</div>
  <p>10 items, cotes 0-4. Items 4, 5, 7, 8 sont <strong>inverses</strong> (score = 4 - reponse). Plage : 0-40.</p>
  <table><tr><th>Score</th><th>Interpretation</th></tr>
  <tr><td>&lt; 14</td><td><span class="badge g">Stress faible</span></td></tr>
  <tr><td>14-19</td><td><span class="badge o">Stress modere</span></td></tr>
  <tr><td>20-26</td><td><span class="badge r">Stress eleve</span></td></tr>
  <tr><td>&ge; 27</td><td><span class="badge p">Stress tres eleve</span></td></tr>
  </table>
</div>

<div class="card">
  <div class="card-title">PHQ-9 — Patient Health Questionnaire (Kroenke 2001)</div>
  <p>9 items, cotes 0-3. Plage : 0-27.</p>
  <table><tr><th>Score</th><th>Interpretation</th></tr>
  <tr><td>&lt; 5</td><td><span class="badge g">Pas de depression</span></td></tr>
  <tr><td>5-9</td><td>Depression legere</td></tr>
  <tr><td>10-14</td><td><span class="badge o">Depression moderee</span></td></tr>
  <tr><td>15-19</td><td><span class="badge r">Depression mod.-severe</span></td></tr>
  <tr><td>&ge; 20</td><td><span class="badge p">Depression severe</span></td></tr>
  </table>
</div>

<div class="card">
  <div class="card-title">BES — Binge Eating Scale | ISI — Insomnia Severity Index</div>
  <p><strong>BES</strong> : 0-8 (&lt;3 leger, 3-4 modere, &ge;5 severe). <strong>ISI</strong> : 0-28 (0-7 normal, 8-14 leger, 15-21 modere, 22-28 severe).</p>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 7. PHASE C -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s7">7. Phase C — Score Clinique (0-50 pts)</h2>
<p>8 sous-scores <code>c1</code> a <code>c8</code>, avec modulation ethnique et garde-fou.</p>

<h3>c1 — Age (0-10) <span class="badge a">Framingham/SCORE2</span></h3>
<table><tr><th>Age</th><th>Points</th></tr>
<tr><td>&lt; 40</td><td>0</td></tr><tr><td>40-44</td><td>2</td></tr><tr><td>45-54</td><td>5</td></tr><tr><td>55-64</td><td>7</td></tr><tr><td>&ge; 65</td><td>10</td></tr></table>

<h3>c2 — Sexe (0-2) <span class="badge a">Framingham</span></h3>
<p>Homme &lt; 60 ans = <strong>2 pts</strong>, sinon 0.</p>

<h3>c3 — IMC + TT + WHtR (0-12) <span class="badge a">OMS/IDF/BMJ 2016</span></h3>
<table><tr><th>Composante</th><th>Condition</th><th>Points</th></tr>
<tr><td rowspan="3">IMC (seuils ethniques)</td><td>IMC &ge; obesite + 5</td><td>7</td></tr>
<tr><td>IMC &ge; obesite</td><td>5</td></tr>
<tr><td>IMC &ge; surpoids</td><td>3</td></tr>
<tr><td rowspan="3">WHtR</td><td>&ge; 0.60</td><td>3</td></tr>
<tr><td>&ge; 0.55</td><td>2</td></tr>
<tr><td>&ge; 0.50</td><td>1</td></tr>
<tr><td rowspan="2">Tour de taille</td><td>TT &gt; seuil + 10</td><td>2</td></tr>
<tr><td>TT &gt; seuil</td><td>1</td></tr>
</table>
<p><code>c3 = min(12, c3_bmi + c3_whtr + c3_tt)</code></p>

<h3>c4 — Comorbidites (0-10) <span class="badge a">ADA 2024/IDF</span></h3>
<pre>htaPts = 4 si HTA, x hR ethnique, cap 8
diabPts = 8 (DT2) | 3 (pre-DT2) | 3 (ethnie risque + parent) | 2 (2 parents DT2)
c4 = min(10, round((htaPts + diabPts + min(6, round(K*6/50))) / 3 * 10/8))
Si c4 &lt; 1 et K &gt; 0 &rarr; c4 = 1</pre>

<h3>c5 — ATCD familiaux (0-10) <span class="badge a">INTERHEART/Lancet 2016</span></h3>
<table><tr><th>Facteur</th><th>Points</th></tr>
<tr><td>2 parents obeses</td><td>+4</td></tr><tr><td>1 parent obese</td><td>+2</td></tr>
<tr><td>Obesite enfance severe</td><td>+3</td></tr><tr><td>Surpoids enfance</td><td>+2</td></tr>
<tr><td>2 parents DT2</td><td>+2</td></tr><tr><td>1 parent DT2</td><td>+1</td></tr>
<tr><td>Regimes yoyo &ge; 3</td><td>+2</td></tr></table>
<p>Si <code>cR &gt; 1.2</code> : <code>c5 = min(10, round(c5 * (1 + (cR-1)*0.3)))</code></p>

<h3>c6 — Tabac (0-8) <span class="badge a">Aubin 2012</span></h3>
<table><tr><th>Niveau</th><th>Points</th></tr>
<tr><td>Jamais</td><td>0</td></tr><tr><td>Arrete &gt;1 an</td><td>1</td></tr><tr><td>Arrete &lt;1 an</td><td>2</td></tr><tr><td>&lt;10 cig/j</td><td>4</td></tr><tr><td>&ge;10 cig/j</td><td>8</td></tr></table>

<h3>c7 — Sante mentale (0-8) <span class="badge a">PSS-10/PHQ-9/BES</span></h3>
<table><tr><th>Composante</th><th>Condition</th><th>Points</th></tr>
<tr><td rowspan="3">Stress (sr=PSS/40)</td><td>sr &ge; 0.60</td><td>4</td></tr><tr><td>sr &ge; 0.35</td><td>3</td></tr><tr><td>sr &ge; 0.15</td><td>1</td></tr>
<tr><td rowspan="3">Depression (PHQ-9)</td><td>&ge; 20</td><td>3</td></tr><tr><td>&ge; 15</td><td>2</td></tr><tr><td>&ge; 10</td><td>1</td></tr>
<tr><td rowspan="2">Hyperphagie (BES)</td><td>&ge; 5</td><td>2</td></tr><tr><td>&ge; 3</td><td>1</td></tr>
</table>
<p><code>c7 = min(8, stress + dep + bes)</code></p>

<h3>c8 — Sommeil + ISI (0-4) <span class="badge a">Cappuccio 2008</span></h3>
<table><tr><th>Condition</th><th>Points</th></tr>
<tr><td>Sommeil &lt;5h ou &gt;10h</td><td>+2</td></tr><tr><td>Sommeil 5-6h ou 9-10h</td><td>+1</td></tr>
<tr><td>ISI &ge; 22</td><td>+2</td></tr><tr><td>ISI 15-21</td><td>+1</td></tr></table>

<h3>Modulation + Garde-Fou</h3>
<pre>C = round(C * (1 + ev/100))                    // Modulation ethnique

// Garde-Fou plancher pour comorbidites graves :
DT2+HTA &rarr; plancher 25 | DT2+SAOS &rarr; 25 | DT2+MetS &rarr; 22 | MetS+HTA &rarr; 20

// Attenuation SCS :
AP &ge;300 et DQI &le;10 &rarr; -8 | AP &ge;150 et DQI &le;15 &rarr; -5 | AP &ge;75 &rarr; -2

C = clamp(0, 50, max(gfFloor - scsReduction, C))</pre>

<!-- ═══════════════════════════════════════════ -->
<!-- 8. PHASE E -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s8">8. Phase E — Score Exposome (0-45 pts)</h2>

<div class="formula-box">
  <div class="d">FORMULE E</div>
  <div class="f">E = min(45, round(E* &times; (1 + 0.15 &times; bInflam)))</div>
  <div class="f" style="font-size:14px">E* = 30 &times; (0.7&times;A + 0.5&times;B + 0.3&times;C<sub>layer</sub>) / 1.5</div>
</div>

<h3>Layer A — Environnement physique (0-1)</h3>
<p><code>A = min(1, (air/8 + temp/4 + UV/3) / 3 &times; inflammMult)</code></p>
<table><tr><th>AQI US</th><th>Score air</th><th></th><th>Temp</th><th>Score</th><th></th><th>UV</th><th>Score</th></tr>
<tr><td>&le;50</td><td>0</td><td></td><td>&gt;40</td><td>4</td><td></td><td>&gt;8</td><td>3</td></tr>
<tr><td>51-100</td><td>2</td><td></td><td>35-40</td><td>3</td><td></td><td>6-8</td><td>2</td></tr>
<tr><td>101-150</td><td>4</td><td></td><td>30-35</td><td>1</td><td></td><td>3-6</td><td>1</td></tr>
<tr><td>151-200</td><td>6</td><td></td><td>&lt;-5</td><td>3</td><td></td><td>&le;3</td><td>0</td></tr>
<tr><td>&gt;200</td><td>8</td><td></td><td>-5 a 5</td><td>1</td><td></td><td></td><td></td></tr>
</table>

<h3>Layer B — Trajet + sedentarite (0-1)</h3>
<pre>b_trajet = min(1, work_dist / 5)
b_assis = &gt;10h&rarr;1 | &gt;8h&rarr;0.75 | &gt;6h&rarr;0.40 | &gt;4h&rarr;0.15 | sinon&rarr;0
Si AP &ge;150 &rarr; b_assis * 0.50 | Si AP &ge;75 &rarr; * 0.75
B = (b_trajet + b_assis_att) / 2</pre>

<h3>Layer C — Perturbateurs endocriniens (0-1)</h3>
<pre>C_layer = (min(1, ultra/4) + min(1, fast_food/4)) / 2</pre>

<h3>Triade inflammatoire (bInflam)</h3>
<table><tr><th>Marqueur</th><th>z = 0 si</th><th>z = 1 si</th><th>Calcul</th></tr>
<tr><td>CRP hs</td><td>&le; 1 mg/L</td><td>&ge; 3 mg/L</td><td>(val-1)/2</td></tr>
<tr><td>TG/HDL</td><td>&le; 2.0</td><td>&ge; 3.5</td><td>(val-2)/1.5</td></tr>
<tr><td>HOMA-IR</td><td>&le; 2.5</td><td>&ge; 4.0</td><td>(val-2.5)/1.5</td></tr>
</table>
<p><code>bInflam = moyenne des z-scores disponibles</code> &rarr; Amplifie E de <strong>+15% par unite</strong></p>

<!-- ═══════════════════════════════════════════ -->
<!-- 9-10. PHASE O + L -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s9">9. Phase O — Score Occupationnel (0-10 pts)</h2>
<h3>Actif <span class="badge a">Karasek/Lane 2024</span></h3>
<pre>stressJob += type&ge;5?2 : type&ge;3?1 : 0
stressJob += nuit&ge;3?3 : nuit&ge;2?2 : nuit&ge;1?1 : 0
O = min(10, stressJob + min(2, posture/2) + min(2, hours/2))</pre>
<h3>Retraite <span class="badge a">Valtorta 2016</span></h3>
<pre>socScore: retire&ge;5&rarr;4 | &ge;4&rarr;3 | &ge;3&rarr;2 | &ge;2&rarr;1
actScore: AP&lt;30&rarr;3 | &lt;75&rarr;2 | &lt;150&rarr;1
O = min(10, socScore + actScore)</pre>

<h2 id="s10">10. Phase L — Score Lifestyle (0-10 pts)</h2>
<table><tr><th>Composante</th><th>Plage</th><th>Criteres</th></tr>
<tr><td><strong>l1</strong> — AP</td><td>0-3</td><td>AP&ge;150&rarr;0 | 75-149&rarr;1 | 30-74&rarr;2 | &lt;30&rarr;3</td></tr>
<tr><td><strong>l2</strong> — Alimentation DQI</td><td>0-3</td><td>PREDIMED equiv &ge;9&rarr;0 | 5-8&rarr;1 | 3-4&rarr;2 | &lt;3&rarr;3</td></tr>
<tr><td><strong>l3</strong> — Alcool</td><td>0-2</td><td>freq*qte &ge;6&rarr;2 | &ge;2&rarr;1 | &lt;2&rarr;0</td></tr>
<tr><td><strong>l4</strong> — Sommeil</td><td>0-2</td><td>&lt;6h/&gt;10h/ISI&ge;15&rarr;2 | &lt;7h/&gt;9h/ISI&ge;8&rarr;1</td></tr>
</table>
<p><code>L = min(10, l1 + l2 + l3 + l4)</code></p>

<!-- ═══════════════════════════════════════════ -->
<!-- 11-14. sD + CLASSIF + SII + INDEP -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s11">11. Score Declaratif sD</h2>
<div class="formula-box">
  <div class="f">sD = min(100, C + E + O + L)</div>
  <div class="d">C(0-50) + E(0-45) + O(0-10) + L(0-10) = max theorique 115, cappe a 100</div>
</div>

<h2 id="s12">12. Classification Declarative</h2>
<table><tr><th>sD</th><th>Classification</th><th>Couleur</th><th>Tier therapeutique</th><th>Suivi</th></tr>
<tr><td>&lt; 30</td><td><span class="badge g">FAIBLE</span></td><td>Vert</td><td>Surveillance</td><td>3 ans</td></tr>
<tr><td>30-59</td><td><span class="badge o">MODERE</span></td><td>Orange</td><td>Nutrition + AP</td><td>Annuel</td></tr>
<tr><td>60-79</td><td><span class="badge r">ELEVE</span></td><td>Rouge</td><td>GLP-1 preventif</td><td>Trimestriel</td></tr>
<tr><td>&ge;80</td><td><span class="badge p">TRES ELEVE</span></td><td>Violet</td><td>Chirurgie / GLP-1 urgent</td><td>Mensuel</td></tr>
</table>

<h2 id="s13">13. SII — Sous-Index Inflammatoire (0-7)</h2>
<table><tr><th>#</th><th>Critere</th><th>Condition</th></tr>
<tr><td>1</td><td>Stress PSS eleve</td><td>PSS/40 &ge; 0.35</td></tr>
<tr><td>2</td><td>Inactivite physique</td><td>AP &lt; 75 min/sem</td></tr>
<tr><td>3</td><td>Obesite</td><td>IMC &ge; seuil obesite ethnique</td></tr>
<tr><td>4</td><td>Tabagisme actif</td><td>Tabac &ge; 3</td></tr>
<tr><td>5</td><td>Alimentation desequilibree</td><td>alimRaw &ge; 20</td></tr>
<tr><td>6</td><td>Insomnie</td><td>ISI &ge; 15</td></tr>
<tr><td>7</td><td>Tour de taille eleve</td><td>TT &gt; seuil ethnique</td></tr>
</table>
<div class="note">Si SII &ge; 2 ET classification FAIBLE &rarr; prescription <strong>P5 obligatoire</strong></div>

<h2 id="s14">14. Criteres Independants</h2>
<p>Bilan P5 prescrit si : <code>age &ge; 40</code> OU <code>parent_ob &ge; 2</code> OU <code>diab_par &ge; 1</code> OU <code>comorbIdites.length &gt; 0</code></p>

<!-- ═══════════════════════════════════════════ -->
<!-- 15. PRESCRIPTION -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s15">15. Prescription Biologique (P0/P5/P10/P15)</h2>
<table><tr><th>classDecl</th><th>SII</th><th>Indep</th><th>Panel</th><th>Nb examens</th><th>Suivi</th></tr>
<tr><td>FAIBLE</td><td>&lt;2</td><td>Non</td><td><span class="badge g">P0</span> optionnel</td><td>-</td><td>3 ans</td></tr>
<tr><td>FAIBLE</td><td>&ge;2</td><td>-</td><td><span class="badge a">P5</span></td><td>7</td><td>2 ans</td></tr>
<tr><td>FAIBLE</td><td>&lt;2</td><td>Oui</td><td><span class="badge a">P5</span></td><td>7</td><td>2 ans</td></tr>
<tr><td>MODERE</td><td>-</td><td>-</td><td><span class="badge o">P10</span></td><td>15</td><td>Annuel</td></tr>
<tr><td>ELEVE</td><td>-</td><td>-</td><td><span class="badge r">P15</span></td><td>20</td><td>Trimestriel</td></tr>
<tr><td>TRES ELEVE</td><td>-</td><td>-</td><td><span class="badge p">P15+BEF</span></td><td>20</td><td>Mensuel</td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 16-17. BIONORM + SF -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s16">16. Score Biologique bioNorm (0-100)</h2>
<div class="formula-box">
  <div class="d">BSD v4.7.1</div>
  <div class="f">bioNorm = (&Sigma; z<sub>i</sub> &times; w<sub>i</sub> / &Sigma; w<sub>i</sub>) &times; 100</div>
  <div class="d">z<sub>i</sub> = clamp(0, 1, (val - nm) / (ab - nm)) | Inverse : z = (nm - val) / (nm - ab)</div>
  <div class="d">Denominateur adaptatif (seuls les marqueurs renseignes)</div>
</div>

<h2 id="s17">17. Score Final sf — Integration Dynamique</h2>
<div class="formula-box">
  <div class="f">sf = wDecl(0.65) &times; sD + wBio(0.35) &times; bioNorm</div>
</div>
<h3>Reponderation dynamique</h3>
<pre>gap = bioNorm - sD
Si gap &gt; 20 : extraW = min(0.30, (gap-20)/100*0.60)
              wBio = 0.35 + extraW, wDecl = 1 - wBio</pre>
<h3>Planchers de securite</h3>
<table><tr><th>Regle</th><th>Condition</th><th>Effet</th></tr>
<tr><td><strong>BioFloor 75%</strong></td><td>Toujours</td><td><code>sf &ge; bioNorm &times; 0.75</code></td></tr>
<tr><td><strong>BEF 85%</strong></td><td>bioNorm &gt; 90</td><td><code>sf &ge; max(80, bioNorm &times; 0.85)</code></td></tr>
<tr><td><strong>BEF 85%</strong></td><td>bioNorm &gt; 80</td><td><code>sf &ge; bioNorm &times; 0.85</code></td></tr>
<tr><td><strong>Urgence HbA1c</strong></td><td>HbA1c &ge; 6.5%</td><td><code>sf &ge; 60</code></td></tr>
<tr><td><strong>Urgence HbA1c</strong></td><td>HbA1c &ge; 8.0%</td><td><code>sf &ge; 70</code></td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 18-19. CTI + GRI -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s18">18. CTI — Chronicity Trajectory Index (0-100)</h2>
<div class="formula-box">
  <div class="f">CTI = min(100, (&Sigma; &gamma;<sub>j</sub> &times; Z<sub>j</sub> / 1.459) &times; 100 &times; ctiAmp)</div>
</div>
<table><tr><th>Composante</th><th>&gamma;</th><th>Z (0-1)</th></tr>
<tr><td>Duree/severite</td><td>0.185</td><td>sD&gt;70&rarr;1, &gt;50&rarr;0.7, &gt;30&rarr;0.4, sinon 0.1</td></tr>
<tr><td>Regimes yoyo</td><td>0.249</td><td>yoyo&ge;1&rarr;1, sinon 0</td></tr>
<tr><td>Leptine/SAOS</td><td>0.210</td><td>min(1, IMC_score + SAOS_bonus)</td></tr>
<tr><td>Microbiome (DQI)</td><td>0.180</td><td>min(1, alimRaw/25)</td></tr>
<tr><td>Cortisol</td><td>0.195</td><td>min(1, sr*0.4 + ISI/28*0.3 + nuit/5*0.3)</td></tr>
<tr><td>Metabolique</td><td>0.200</td><td>min(1, hypo + yoyo bonus)</td></tr>
<tr><td>Enfance</td><td>0.240</td><td>severe&rarr;1, moderate&rarr;0.5, non&rarr;0</td></tr>
</table>
<table><tr><th>CTI</th><th>Label</th><th>Description</th></tr>
<tr><td>&le;20</td><td><span class="badge g">Fenetre ouverte</span></td><td>Interventions classiques efficaces</td></tr>
<tr><td>21-40</td><td><span class="badge o">Debut chronicisation</span></td><td>Agir rapidement</td></tr>
<tr><td>41-55</td><td><span class="badge r">Chronicite avancee</span></td><td>GLP-1 recommande</td></tr>
<tr><td>&gt;55</td><td><span class="badge p">Chronicite installee</span></td><td>Evaluation chirurgicale obligatoire</td></tr>
</table>

<h2 id="s19">19. GRI — GLP-1 Response Index (-3 a +6)</h2>
<div class="formula-box">
  <div class="f">GRI = &Sigma;(&delta;<sub>k</sub> &times; F<sub>k</sub>) &minus; &Sigma;(&epsilon;<sub>k</sub> &times; U<sub>k</sub>)</div>
</div>
<h3>Facteurs favorables (+)</h3>
<table><tr><th>Source</th><th>Condition</th><th>&delta;</th></tr>
<tr><td>Comorbidites GRI fav</td><td>gr &gt; 0</td><td>+gr</td></tr>
<tr><td>HOMA-IR bio</td><td>&gt; 2.5</td><td>+1.07</td></tr>
<tr><td>Adiponectine bio</td><td>&lt; 6</td><td>+0.62</td></tr>
<tr><td>TG/HDL bio</td><td>&gt; 3.5</td><td>+0.55</td></tr>
</table>
<h3>Facteurs defavorables (-)</h3>
<table><tr><th>Source</th><th>Condition</th><th>&epsilon;</th></tr>
<tr><td>CTI eleve</td><td>&gt; 55</td><td>-0.65</td></tr>
<tr><td>Corticoides</td><td>declare</td><td>-0.35</td></tr>
<tr><td>Obesite severe</td><td>IMC &gt; 40</td><td>-0.47</td></tr>
<tr><td>Stress extreme</td><td>sr &ge; 0.6</td><td>-0.28</td></tr>
</table>
<table><tr><th>GRI</th><th>Label</th><th>Reponse</th></tr>
<tr><td>&ge;2.5</td><td><span class="badge g">Excellent</span></td><td>&gt;85%</td></tr>
<tr><td>1.5-2.4</td><td><span class="badge a">Bon</span></td><td>60-85%</td></tr>
<tr><td>0.5-1.4</td><td><span class="badge o">Modere</span></td><td>Incertaine</td></tr>
<tr><td>&lt;0.5</td><td><span class="badge r">Faible</span></td><td>Chirurgie a envisager</td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 19b. GLP-1 RESPONSE PROFILING ENGINE v2.0 -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s19b">19b. GLP-1 Response Profiling Engine v2.0</h2>
<p><strong>Objectif :</strong> Aller au-dela du GRI simple pour determiner avec precision <strong>qui va repondre aux GLP-1 et qui ne repondra pas</strong>, avec molecule, dose et perte de poids estimee.</p>
<p><strong>References :</strong> STEP 1-5 (Semaglutide), SURMOUNT 1-4 (Tirzepatide), SCALE (Liraglutide), Lingvay 2024, Garvey 2023, Jastreboff 2022</p>

<h3>Architecture du moteur — 6 axes de phenotypage</h3>
<table><tr><th>Axe</th><th>Plage</th><th>Direction</th><th>Description</th></tr>
<tr><td><b>AXE 1 — Insulinoresistance (IR)</b></td><td>0-10</td><td><span class="badge g">POSITIF</span></td><td>Plus l'IR est forte, meilleure est la reponse. HOMA-IR, adiponectine, TG/HDL, SOPK, NAFLD, MetS</td></tr>
<tr><td><b>AXE 2 — Chronicite/Resistance</b></td><td>0-10</td><td><span class="badge r">NEGATIF</span></td><td>CTI, yoyo, obesite enfance, leptinoresistance, IMC &gt; 40. Plus c'est chronique, moins le GLP-1 fonctionne seul</td></tr>
<tr><td><b>AXE 3 — Inflammation</b></td><td>0-10</td><td><span class="badge g">POSITIF</span></td><td>CRP, bInflam, SII. GLP-1 a un effet anti-inflammatoire → les patients inflammes repondent bien</td></tr>
<tr><td><b>AXE 4 — Psycho-comportemental</b></td><td>0-10</td><td><span class="badge r">NEGATIF</span></td><td>PHQ-9, PSS-10, BES. Depression/stress/BES severes diminuent observance et reponse</td></tr>
<tr><td><b>AXE 5 — Iatrogene</b></td><td>0-5</td><td><span class="badge r">NEGATIF</span></td><td>Corticoides, antidepresseurs obesogenes, hypothyroidie non controlee</td></tr>
<tr><td><b>AXE 6 — Demographique</b></td><td>bonus</td><td><span class="badge g">POSITIF</span></td><td>Age 30-65 optimal, sexe feminin, ethnie IR, SOPK</td></tr>
</table>

<h3>Score Composite — GRS (GLP-1 Response Score)</h3>
<div class="formula-box">
  <div class="f">GRS = (IR&times;0.35 + Inflam&times;0.15 + Demo) &minus; (Chron&times;0.20 + Psycho&times;0.15 + Iatro&times;0.20)</div>
  <div class="d">GRS final = (GRS_composite + GRI) / 2 &nbsp;&nbsp;|&nbsp;&nbsp; Plage: -3 a +6</div>
</div>

<h3>5 Profils de Reponse + Contre-Indication</h3>
<table><tr><th>Code</th><th>Profil</th><th>GRS</th><th>Conditions</th><th>Prob. reponse</th><th>PPE*</th><th>Molecule</th></tr>
<tr style="background:rgba(34,197,94,.08)"><td><b>R1</b></td><td><span class="badge g">REPONDEUR EXCELLENT</span></td><td>&ge;2.5</td><td>IR &ge; 4 ET chron &le; 4</td><td>&gt;85%</td><td>15-22%</td><td>Tirzepatide (IMC&ge;35) ou Semaglutide</td></tr>
<tr style="background:rgba(20,184,166,.06)"><td><b>R2</b></td><td><span class="badge a">BON REPONDEUR</span></td><td>&ge;1.5</td><td>IR &ge; 2</td><td>60-85%</td><td>10-17%</td><td>Semaglutide (ou Tirze si DT2)</td></tr>
<tr style="background:rgba(245,158,11,.06)"><td><b>R3</b></td><td><span class="badge o">REPONDEUR PARTIEL</span></td><td>&ge;0.3</td><td>chron &le; 6</td><td>30-60%</td><td>5-12%</td><td>Semaglutide (cadre multimodal)</td></tr>
<tr style="background:rgba(239,68,68,.06)"><td><b>R4</b></td><td><span class="badge r">NON-REPONDEUR PROBABLE</span></td><td>&ge;-0.5</td><td>Facteurs resistance majeurs</td><td>&lt;30%</td><td>&lt;5%</td><td>Essai 3 mois max, puis chirurgie</td></tr>
<tr style="background:rgba(168,85,247,.06)"><td><b>R5</b></td><td><span class="badge p">ECHEC PHARMACOLOGIQUE</span></td><td>&lt;-0.5</td><td>Resistance metabolique majeure</td><td>&lt;10%</td><td>&lt;3%</td><td>GLP-1 non recommande 1re intention</td></tr>
<tr style="background:rgba(100,116,139,.06)"><td><b>CI</b></td><td>CONTRE-INDICATION REL.</td><td>-</td><td>HbA1c&ge;10 OU IMC&ge;50+CTI&gt;70 OU cortis</td><td>N/A</td><td>N/A</td><td>Insuline / Chirurgie / Corriger cause</td></tr>
</table>
<p style="font-size:10px;color:var(--dim3)">*PPE = Perte de Poids Estimee (% du poids initial sur 12-18 mois)</p>

<h3>Detail Axe 1 — Insulinoresistance (scoring)</h3>
<table><tr><th>Critere</th><th>Condition</th><th>Points IR</th><th>Source</th></tr>
<tr><td>HOMA-IR biologique</td><td>&ge; 5</td><td>+4</td><td>Biologie</td></tr>
<tr><td>HOMA-IR biologique</td><td>&ge; 4</td><td>+3</td><td>Biologie</td></tr>
<tr><td>HOMA-IR biologique</td><td>&ge; 2.5</td><td>+2</td><td>Biologie</td></tr>
<tr><td>DT2 declare (proxy)</td><td>Oui</td><td>+3</td><td>Declaratif</td></tr>
<tr><td>Pre-diabete / MetS (proxy)</td><td>Oui</td><td>+2 / +2</td><td>Declaratif</td></tr>
<tr style="background:rgba(239,68,68,.08)"><td>IR occulte (auto-detectee)</td><td>TG/HDL &gt; 3.5</td><td>+8 pts BMN-K auto + irScore via bio</td><td>Biologie (v3.1.1)</td></tr>
<tr><td>Adiponectine basse</td><td>&lt; 6 ug/mL</td><td>+1.5</td><td>Biologie</td></tr>
<tr><td>TG/HDL eleve</td><td>&gt; 3.5</td><td>+1.5</td><td>Biologie</td></tr>
<tr><td>SOPK</td><td>Oui</td><td>+1</td><td>Declaratif</td></tr>
<tr><td>NAFLD</td><td>Oui</td><td>+1</td><td>Declaratif</td></tr>
</table>

<h3>Detail Axe 2 — Chronicite/Resistance (scoring)</h3>
<table><tr><th>Critere</th><th>Points</th><th>Reference</th></tr>
<tr><td>CTI / 20 (max 3)</td><td>0 a 3</td><td>CTI Engine</td></tr>
<tr><td>Regimes yoyo (&ge; 1)</td><td>+2</td><td>Fothergill 2016</td></tr>
<tr><td>Obesite enfance severe</td><td>+1.5</td><td>Geserick 2018</td></tr>
<tr><td>Leptine &ge; 40 ng/mL</td><td>+2</td><td>Considine 1996</td></tr>
<tr><td>IMC &ge; 40 (severe)</td><td>+1.5</td><td>STEP 1</td></tr>
</table>

<h3>Facteurs d'efficacite detailles</h3>
<table><tr><th>Facteur</th><th>Description</th><th>Impact</th><th>Reference</th></tr>
<tr><td>IR marquee (HOMA-IR &ge; 4)</td><td>Forte reponse aux incretines</td><td>●●●</td><td>STEP 2/SURMOUNT 2</td></tr>
<tr><td>SOPK diagnostique</td><td>Phenotype IR feminin, excellente reponse GLP-1</td><td>●●●</td><td>Jensterle 2022</td></tr>
<tr><td>Pre-diabete</td><td>Prevention DT2 sous GLP-1 (reduction 80%)</td><td>●●●</td><td>STEP 2/DPP</td></tr>
<tr><td>NAFLD / Steatose</td><td>GLP-1 reduit graisse hepatique 30-40%</td><td>●●</td><td>Newsome 2021 (LEAN)</td></tr>
<tr><td>Inflammation active (CRP &ge; 3)</td><td>Effet anti-inflammatoire = double benefice</td><td>●●</td><td>Pal 2022</td></tr>
<tr><td>Adiponectine basse (&lt; 6)</td><td>Tissu adipeux dysfonctionnel, GLP-1 ameliore</td><td>●●</td><td>Meier 2022</td></tr>
<tr><td>Syndrome metabolique</td><td>GLP-1 corrige plusieurs composantes simultanement</td><td>●●</td><td>IDF/SURMOUNT</td></tr>
<tr><td>DT2 + Obesite</td><td>Double indication: glycemique + ponderal</td><td>●●</td><td>SURMOUNT 2</td></tr>
</table>

<h3>Facteurs de resistance detailles</h3>
<table><tr><th>Facteur</th><th>Description</th><th>Impact</th><th>Reference</th></tr>
<tr><td>Chronicite CTI &gt; 55</td><td>Set-point durablement deplace, resistance satiete</td><td>✕✕✕</td><td>Leibel 1995/Sumithran 2011</td></tr>
<tr><td>Leptinoresistance (leptine &ge; 40)</td><td>Barrage central: satiete insensible</td><td>✕✕✕</td><td>Considine 1996</td></tr>
<tr><td>Corticotherapie &gt; 3 mois</td><td>Cortisol exogene antagonise GLP-1</td><td>✕✕✕</td><td>Fardet 2007</td></tr>
<tr><td>Regimes yoyo</td><td>Thermogenese adaptative reduite</td><td>✕✕</td><td>Fothergill 2016</td></tr>
<tr><td>Hyperphagie severe (BES &ge; 5)</td><td>TCA actif: GLP-1 ne traite pas compulsion</td><td>✕✕</td><td>Blundell 2023</td></tr>
<tr><td>Depression PHQ &ge; 15</td><td>Impact compliance + alimentation emotionnelle</td><td>✕✕</td><td>Wadden 2021</td></tr>
<tr><td>Obesite morbide (IMC &ge; 45)</td><td>Masse grasse critique: GLP-1 insuffisant</td><td>✕✕✕</td><td>STEP 1</td></tr>
<tr><td>Obesite enfance</td><td>Programmation epigenetique, hyperplasie adipocytaire</td><td>✕✕</td><td>Geserick 2018</td></tr>
<tr><td>Age &ge; 65 ans</td><td>Sarcopenie: risque perte musculaire</td><td>✕</td><td>Rubino 2022</td></tr>
</table>

<h3>Molecules et posologies</h3>
<table><tr><th>Molecule</th><th>Mecanisme</th><th>Dose initiation</th><th>Dose cible</th><th>Profil ideal</th><th>PPE moyenne</th><th>Ref</th></tr>
<tr><td><b>Semaglutide (Wegovy/Ozempic)</b></td><td>Agoniste GLP-1R</td><td>0.25 mg/sem</td><td>2.4 mg/sem</td><td>R1-R3, IMC 27-40</td><td>15-17%</td><td>STEP 1-5</td></tr>
<tr><td><b>Tirzepatide (Mounjaro/Zepbound)</b></td><td>Double agoniste GIP+GLP-1R</td><td>2.5 mg/sem</td><td>10-15 mg/sem</td><td>R1-R2, IMC&ge;35, DT2</td><td>20-22.5%</td><td>SURMOUNT 1-4</td></tr>
<tr><td><b>Liraglutide (Saxenda)</b></td><td>Agoniste GLP-1R (quotidien)</td><td>0.6 mg/j</td><td>3.0 mg/j</td><td>R2-R3, intolerance hebdo</td><td>8-10%</td><td>SCALE Obesity</td></tr>
</table>

<h3>Perte de Poids Estimee (PPE) — Calcul personnalise</h3>
<div class="formula-box">
  <div class="f">PPE = PPE_base + &Sigma; modificateurs</div>
  <div class="d">PPE_base: Tirzepatide = 20% | Semaglutide = 15% | Liraglutide = 10%</div>
</div>
<table><tr><th>Modificateur</th><th>Condition</th><th>Impact PPE</th></tr>
<tr><td>IR forte</td><td>irScore &ge; 4</td><td>+3%</td></tr>
<tr><td>SOPK</td><td>Declare</td><td>+2%</td></tr>
<tr><td>Chronicite haute</td><td>chronScore &ge; 6</td><td>-5%</td></tr>
<tr><td>Leptinoresistance</td><td>Leptine &ge; 40</td><td>-4%</td></tr>
<tr><td>Psycho-resistance</td><td>psychoScore &ge; 6</td><td>-3%</td></tr>
<tr><td>Iatrogene</td><td>iatroScore &ge; 3</td><td>-4%</td></tr>
<tr><td>Yoyo</td><td>&ge; 1</td><td>-2%</td></tr>
<tr><td>Obesite morbide</td><td>IMC &ge; 45</td><td>-3%</td></tr>
<tr><td>Age avance</td><td>&ge; 65 ans</td><td>-2%</td></tr>
</table>
<p><code>PPE = clamp(0, 25, PPE_base + Σ modificateurs)</code></p>

<h3>Decision algorithmique — Arbre de decision</h3>
<pre>
SI (HbA1c &ge; 10 OU (IMC &ge; 50 ET CTI &gt; 70) OU (cortis ET iatroScore &ge; 3 ET IR &lt; 3))
    → CI (Contre-indication relative)
    → Insuline / Chirurgie / Corriger cause

SINON SI (GRS &ge; 2.5 ET IR &ge; 4 ET chron &le; 4)
    → R1 REPONDEUR EXCELLENT
    → Tirzepatide (si IMC&ge;35/DT2) ou Semaglutide
    → PPE 15-22% | Suivi 3/6/12 mois

SINON SI (GRS &ge; 1.5 ET IR &ge; 2)
    → R2 BON REPONDEUR
    → Semaglutide (ou Tirzepatide si DT2)
    → PPE 10-17% | Reevaluation 6 mois

SINON SI (GRS &ge; 0.3 ET chron &le; 6)
    → R3 REPONDEUR PARTIEL
    → Semaglutide + programme multimodal obligatoire
    → PPE 5-12% | Si &lt;5% a 6 mois → switch ou chirurgie

SINON SI (GRS &ge; -0.5)
    → R4 NON-REPONDEUR PROBABLE
    → Essai therapeutique 3 mois max (Sema 0.25mg)
    → Si &lt;3% a 12 sem → arret, chirurgie bariatrique

SINON
    → R5 ECHEC PHARMACOLOGIQUE PREVU
    → GLP-1 non recommande 1re intention
    → Chirurgie bariatrique URGENTE
    → GLP-1 adjuvant post-op possible
</pre>

<div class="note">
  <strong>IMPORTANT :</strong> Le profiling GLP-1 est affine par la biologie (HOMA-IR, adiponectine, leptine, CRP). Sans biologie, le profil est base sur les donnees declaratives uniquement et doit etre confirme par le bilan biologique prescrit.
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 20. MARKOV -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s20">20. Modele de Markov — Projection 10 ans</h2>
<p><strong>Ref :</strong> NEJM 1995 Leibel, NEJM 2011 Sumithran. Matrice 6&times;6 (Normal, Surp.leger, Surp.installe, Surp.eleve, Obes.moderee, Obes.severe).</p>
<div class="formula-box">
  <div class="f">rf = exp(0.68 &times; sf/100) &times; exp(0.35 &times; K<sub>norm</sub>/100)</div>
  <div class="d">Transitions vers &uarr; multipliees par rf &times; cm | Transitions vers &darr; divisees par rf</div>
  <div class="d">P(Obesite 10 ans) = (prob[4] + prob[5]) &times; 100</div>
</div>
<p><strong>Multiplicateurs comorbidites (cm) :</strong> DT2=1.4, SOPK=1.3, SAOS=1.25, MetS=1.5 (max selectionne)</p>

<h3>Matrice de base (probabilites annuelles)</h3>
<div style="overflow-x:auto;font-size:11px">
<table>
<tr><th></th><th>Normal</th><th>Surp.L</th><th>Surp.I</th><th>Surp.E</th><th>Obes.M</th><th>Obes.S</th></tr>
<tr><td><b>Normal</b></td><td>0.82</td><td>0.14</td><td>0.03</td><td>0.01</td><td>0</td><td>0</td></tr>
<tr><td><b>Surp.L</b></td><td>0.08</td><td>0.68</td><td>0.18</td><td>0.05</td><td>0.01</td><td>0</td></tr>
<tr><td><b>Surp.I</b></td><td>0.02</td><td>0.11</td><td>0.61</td><td>0.21</td><td>0.04</td><td>0.01</td></tr>
<tr><td><b>Surp.E</b></td><td>0.01</td><td>0.04</td><td>0.14</td><td>0.56</td><td>0.21</td><td>0.04</td></tr>
<tr><td><b>Obes.M</b></td><td>0</td><td>0.01</td><td>0.03</td><td>0.12</td><td>0.65</td><td>0.19</td></tr>
<tr><td><b>Obes.S</b></td><td>0</td><td>0</td><td>0.01</td><td>0.03</td><td>0.11</td><td>0.85</td></tr>
</table>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 21-22. RETRO + SIMULATION -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s21">21. Retro-Diagnostic Biologique</h2>
<table><tr><th>Condition</th><th>Alerte</th><th>Severite</th></tr>
<tr><td>HOMA-IR &ge;4, pas DT2/pre-DT2</td><td>Resistance insuline severe non declaree</td><td><span class="badge r">Rouge</span></td></tr>
<tr><td>HbA1c 5.7-6.4, pas pre-DT2</td><td>Pre-diabete (ADA 2024)</td><td><span class="badge o">Orange</span></td></tr>
<tr><td>HbA1c &ge;6.5, pas DT2</td><td>Diabete type 2 (ADA 2024)</td><td><span class="badge r">Rouge</span></td></tr>
<tr><td>TG/HDL&gt;3.5 + Adipon&lt;6 + HOMA&gt;2.5</td><td>TRIADE IR</td><td><span class="badge r">Rouge</span></td></tr>
<tr><td>CRP hs &ge;3</td><td>Inflammation systemique</td><td><span class="badge o">Orange</span></td></tr>
<tr><td>TSH &ge;4, pas hypothyroidie</td><td>Hypothyroidie subclinique</td><td><span class="badge o">Orange</span></td></tr>
<tr><td>ApoB &ge;1.2</td><td>Risque CV eleve</td><td><span class="badge o">Orange</span></td></tr>
<tr><td>Acide urique &ge;420</td><td>Hyperuricemie</td><td><span class="badge o">Orange</span></td></tr>
<tr><td>Leptine &ge;40</td><td>Resistance a la leptine</td><td><span class="badge o">Orange</span></td></tr>
</table>

<h2 id="s22">22. Profils de Simulation</h2>
<div style="overflow-x:auto">
<table>
<tr><th>Marqueur</th><th><span class="badge g">Normal</span></th><th><span class="badge o">Limite</span></th><th><span class="badge r">Eleve</span></th><th><span class="badge p">Critique</span></th></tr>
<tr><td>HOMA-IR</td><td>1.8</td><td>3.2</td><td>4.5</td><td>6.0</td></tr>
<tr><td>HbA1c (%)</td><td>5.2</td><td>5.9</td><td>6.8</td><td>8.2</td></tr>
<tr><td>Glycemie</td><td>4.8</td><td>5.8</td><td>7.5</td><td>10.0</td></tr>
<tr><td>CRP hs</td><td>0.5</td><td>2.0</td><td>4.0</td><td>8.0</td></tr>
<tr><td>TSH</td><td>2.0</td><td>3.5</td><td>6.0</td><td>10.0</td></tr>
<tr><td>LDL</td><td>2.4</td><td>3.5</td><td>4.5</td><td>5.5</td></tr>
<tr><td>HDL</td><td>1.4</td><td>0.85</td><td>0.65</td><td>0.5</td></tr>
<tr><td>Triglycerides</td><td>1.2</td><td>1.9</td><td>2.5</td><td>3.5</td></tr>
<tr><td>Adiponectine</td><td>14</td><td>8</td><td>5</td><td>3</td></tr>
<tr><td>Transaminases</td><td>25</td><td>48</td><td>65</td><td>90</td></tr>
<tr><td>ApoB</td><td>0.7</td><td>1.0</td><td>1.3</td><td>1.6</td></tr>
<tr><td>GGT</td><td>30</td><td>60</td><td>85</td><td>120</td></tr>
<tr><td>TG/HDL</td><td>1.2</td><td>2.7</td><td>3.8</td><td>5.0</td></tr>
<tr><td>Acide urique</td><td>300</td><td>385</td><td>440</td><td>520</td></tr>
<tr><td>Leptine</td><td>12</td><td>28</td><td>45</td><td>65</td></tr>
</table>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 23. STRATEGIES -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s23">23. Strategies Therapeutiques</h2>

<div class="card" style="border-left:4px solid var(--green)">
  <div class="card-title" style="color:var(--green)">FAIBLE (sf &lt; 30) — Surveillance</div>
  <p>Alimentation mediterraneenne (PREDIMED) | AP &ge; 150 min/sem | Sommeil 7-8h | Gestion stress | Controle tous les 3 ans</p>
  <p><strong>Pharmacologie :</strong> Aucune</p>
</div>

<div class="card" style="border-left:4px solid var(--orange)">
  <div class="card-title" style="color:var(--orange)">MODERE (sf 30-59) — Programme Nutrition + AP</div>
  <p>Dieteticien | AP progressive | Ultra-transformes NOVA&lt;2 | Education therapeutique | TCC si PSS&ge;20/PHQ&ge;10 | Bilan P10 | <strong>Objectif -3 a -5% en 6 mois</strong></p>
  <p><strong>Pharmacologie :</strong> Pas a ce stade | <strong>Suivi :</strong> Annuel</p>
</div>

<div class="card" style="border-left:4px solid var(--red)">
  <div class="card-title" style="color:var(--red)">ELEVE (sf 60-79) — Suivi Renforce + GLP-1</div>
  <p>Suivi trimestriel | P15 | AP encadre | Psychologue si PHQ&ge;10 | GLP-1 si GRI&ge;1.5 | <strong>Objectif -5 a -10% en 6 mois</strong></p>
  <p><strong>Pharmacologie :</strong> Semaglutide (Wegovy) si GRI favorable | <strong>Suivi :</strong> Trimestriel</p>
</div>

<div class="card" style="border-left:4px solid var(--purple)">
  <div class="card-title" style="color:var(--purple)">TRES ELEVE (sf &ge; 80) — Urgence Pluridisciplinaire</div>
  <p>Endocrinologue urgent &lt;2 sem | P15+BEF | GLP-1 haute dose (Tirzepatide) | Chirurgie si CTI&gt;55 | Psychiatrie si PHQ&ge;20 | Nutrition 2x/mois</p>
  <p><strong>Pharmacologie :</strong> Tirzepatide haute dose + chirurgie | <strong>Suivi :</strong> Bimensuel</p>
</div>

<div class="note">
  <strong>CTI &gt; 55 :</strong> Consultation chirurgien bariatrique + evaluation psy pre-op + Sleeve/Bypass/SADI-S + suivi 5 ans post-op<br>
  <strong>GRI &ge; 2.5 :</strong> Excellent candidat GLP-1 &rarr; Semaglutide/Tirzepatide prioritaire &rarr; Objectif &ge;15% perte poids &rarr; Suivi 3/6/12 mois
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 24. RAPPORT IA -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s24">24. Rapport IA — Aide au Medecin</h2>
<p>Genere par <strong>Claude AI</strong> (claude-sonnet-4) via <code>/api/ai/rapport</code>.</p>
<h3>10 sections du rapport</h3>
<table><tr><th>#</th><th>Section</th><th>Description</th></tr>
<tr><td>1</td><td><code>diagnostic_resume</code></td><td>Resume diagnostique 3-4 phrases</td></tr>
<tr><td>2</td><td><code>synthese_clinique</code></td><td>Synthese detaillee 5-8 phrases (C,E,O,L,CTI,GRI,bio)</td></tr>
<tr><td>3</td><td><code>points_positifs</code></td><td>[2-5] Elements favorables</td></tr>
<tr><td>4</td><td><code>risques_identifies</code></td><td>[2-6] Risques hierarchises par urgence</td></tr>
<tr><td>5</td><td><code>plan_therapeutique</code></td><td>[5-8] Plan d'action ordonne par priorite</td></tr>
<tr><td>6</td><td><code>recommandation_pharmacologique</code></td><td>GLP-1/chirurgie selon CTI/GRI</td></tr>
<tr><td>7</td><td><code>suivi_propose</code></td><td>Calendrier precis</td></tr>
<tr><td>8</td><td><code>conseils_patient</code></td><td>[3-5] Conseils actionables</td></tr>
<tr><td>9</td><td><code>attention_medicale</code></td><td>Vigilance medecin (ou null)</td></tr>
<tr><td>10</td><td><code>tone</code></td><td>reassuring / cautious / urgent</td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 25-26. APIS + NAVIGATION -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s25">25. APIs et Sources Temps Reel</h2>
<table><tr><th>Service</th><th>Source</th><th>Donnees</th></tr>
<tr><td>Qualite de l'air</td><td>Open-Meteo Air Quality</td><td>AQI US/EU, PM2.5, PM10, NO2, O3, SO2, CO, UV</td></tr>
<tr><td>Meteo</td><td>Open-Meteo Forecast</td><td>Temperature, ressenti, humidite, vent</td></tr>
<tr><td>Geocodage</td><td>Nominatim (OSM)</td><td>Recherche ville, reverse geocoding</td></tr>
<tr><td>IP Geolocation</td><td>GeoJS / ipwho.is / ip-api</td><td>Detection auto position</td></tr>
<tr><td>IA Medicale</td><td>Anthropic Claude</td><td>Analyse, interpretation, rapport strategique</td></tr>
<tr><td>Distance</td><td>Haversine (R=6371km)</td><td>Distance domicile-travail</td></tr>
</table>

<h2 id="s26">26. Flux de Navigation (20 ecrans)</h2>
<table><tr><th>Ecran</th><th>Nom</th><th>Section</th></tr>
<tr><td>0</td><td>Accueil</td><td>[H]</td></tr>
<tr><td>1</td><td>Date de naissance</td><td rowspan="3">[ID] Identite</td></tr>
<tr><td>2</td><td>Sexe biologique</td></tr>
<tr><td>3</td><td>Origine ethnique</td></tr>
<tr><td>4</td><td>Poids et taille</td><td rowspan="2">[M] Mesures</td></tr>
<tr><td>5</td><td>Tour de taille</td></tr>
<tr><td>6</td><td>Antecedents familiaux</td><td>[F] Famille</td></tr>
<tr><td>7</td><td>Localisation (GPS/air/meteo)</td><td>[G] Lieu</td></tr>
<tr><td>8</td><td>Profil professionnel</td><td>[T] Travail</td></tr>
<tr><td>9</td><td>Habitudes alimentaires (10 items)</td><td>[N] Nutrition</td></tr>
<tr><td>10</td><td>Activite physique (IPAQ)</td><td rowspan="2">[V] Mode de vie</td></tr>
<tr><td>11</td><td>Sommeil + substances</td></tr>
<tr><td>12</td><td>Stress PSS-10 (10 items)</td><td rowspan="2">[S] Sante mentale</td></tr>
<tr><td>13</td><td>Depression PHQ-9</td></tr>
<tr><td>14</td><td>Comorbidites (13 declaratives + IR occulte auto)</td><td>[P] Pathologies</td></tr>
<tr><td>15</td><td>Score sD + Prescription bio</td><td>[sD] Score</td></tr>
<tr><td>16</td><td>Fiche biologique + simulation</td><td>[B] Biologie</td></tr>
<tr><td>17</td><td>Questionnaire BTM v3.4 (GERD, ASA, ATCD, NASH, CV, preference)</td><td rowspan="2">[BTM] Bariatrique</td></tr>
<tr><td>18</td><td>BES-16 — Binge Eating Scale (16 items, score 0-46)</td></tr>
<tr><td>19</td><td>Resultat final complet + Section 11 BTM</td><td>[R] Resultat</td></tr>
</table>

<!-- ═══════════════════════════════════════════ -->
<!-- 27. REFERENCES -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s27">27. References Scientifiques</h2>
<div style="font-size:11px;color:var(--dim);line-height:1.8;column-count:2;column-gap:20px">
<p><strong>OMS</strong> — Seuils IMC, AP recommandee</p>
<p><strong>IDF 2006</strong> — Seuils tour de taille, MetS</p>
<p><strong>ADA 2024</strong> — Diagnostic diabete, HbA1c</p>
<p><strong>FINDRISC</strong> — Depistage diabete</p>
<p><strong>IPAQ</strong> — Activite physique</p>
<p><strong>PHQ-9 (Kroenke 2001)</strong> — Depression</p>
<p><strong>PSS-10 (Cohen 1983)</strong> — Stress percu</p>
<p><strong>ISI</strong> — Insomnie</p>
<p><strong>BES</strong> — Hyperphagie</p>
<p><strong>AUDIT-C</strong> — Alcool</p>
<p><strong>Lancet 2016</strong> — Risques ethniques, genetique</p>
<p><strong>SCORE2</strong> — Risque CV</p>
<p><strong>Framingham</strong> — Facteurs risque CV</p>
<p><strong>INTERHEART</strong> — Facteurs risque globaux</p>
<p><strong>DPP</strong> — Prevention diabete</p>
<p><strong>BMJ Open 2016</strong> — WHtR</p>
<p><strong>Biswas 2015</strong> — Sedentarite mortalite</p>
<p><strong>Cappuccio 2008</strong> — Sommeil risque</p>
<p><strong>Aubin 2012</strong> — Tabac et poids</p>
<p><strong>CAMS/Copernicus</strong> — Air temps reel</p>
<p><strong>Brook 2010</strong> — Pollution inflammation</p>
<p><strong>NEJM 1995 Leibel</strong> — Regulation ponderale</p>
<p><strong>NEJM 2011 Sumithran</strong> — Hormones post-regime</p>
<p><strong>CTT 2010</strong> — Poids biomarqueurs lipidiques</p>
<p><strong>ERFC 2010</strong> — Poids biomarqueurs inflammatoires</p>
<p><strong>CKD-PC 2010</strong> — Poids biomarqueurs renaux</p>
<p><strong>Karasek</strong> — Stress professionnel</p>
<p><strong>Lane 2024</strong> — Travail de nuit</p>
<p><strong>Valtorta 2016</strong> — Isolement social</p>
<p><strong>Hoehner 2012</strong> — Trajet et sante</p>
<p><strong>NOVA (Monteiro)</strong> — Ultra-transformes</p>
<p><strong>PREDIMED</strong> — Score alimentaire</p>
<p><strong>STEP 1 (Wilding 2021)</strong> — Semaglutide 2.4mg, n=1961</p>
<p><strong>SURMOUNT-1 (Jastreboff 2022)</strong> — Tirzepatide, n=2539</p>
<p><strong>STAMPEDE (Schauer 2017)</strong> — Sleeve vs Bypass, n=150</p>
<p><strong>SM-BOSS (Peterli 2018)</strong> — Sleeve vs Bypass, n=217</p>
<p><strong>Genco 2013</strong> — Ballon Orbera, n=3696</p>
<p><strong>Brooks 2019</strong> — Spatz3, n=228</p>
<p><strong>Alqahtani 2022</strong> — ESG (NEJM), n=209</p>
<p><strong>Adams 2017</strong> — Bypass mortalite (NEJM), n=418</p>
<p><strong>Gormally 1982</strong> — Binge Eating Scale (BES-16)</p>
<p><strong>Ponce 2021</strong> — GERD resolution post-bypass, n=344</p>
<p><strong>Sharaiha 2021</strong> — ESG + NASH, n=182</p>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 28. MODULE BTM v3.4 -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s28" style="border-color:#14b8a6">28. Module BTM v3.4 — Bariatric & Therapeutic Module</h2>

<div style="background:rgba(20,184,166,.08);border:2px solid #14b8a6;border-radius:14px;padding:16px;margin:12px 0">
<p style="font-size:13px;color:#14b8a6;font-weight:700">Matrice Decisionnelle Therapeutique Personnalisee — Mars 2026</p>
<p style="font-size:11px;color:var(--dim)">6 techniques | 62 etudes meta-analysees | >180 000 patients | 27 facteurs x 6 techniques | MOD-01 a MOD-10 | BES-16 integre</p>
</div>

<h3>28.1 Six techniques evaluees</h3>
<table>
<tr><th>Code</th><th>Technique</th><th>IMC cible</th><th>%TBWL 12m</th><th>%EWL 24m</th></tr>
<tr><td>BT-1</td><td>Ballon Gastrique (Orbera, Spatz3)</td><td>30-40</td><td>10-19%</td><td>32-48%</td></tr>
<tr><td>BT-2</td><td>Endosleeve (ESG)</td><td>30-45</td><td>13-16%</td><td>55-58%</td></tr>
<tr><td>BT-3</td><td>Sleeve Gastrectomie</td><td>35-55</td><td>25-30%</td><td>61-65%</td></tr>
<tr><td>BT-4</td><td>Bypass (RYGB / SADI-S)</td><td>&ge;40</td><td>28-34%</td><td>65-72%</td></tr>
<tr><td>BT-5</td><td>GLP-1 RA (Semaglutide/Tirzepatide)</td><td>&ge;27</td><td>14.9-22%</td><td>—</td></tr>
<tr><td>BT-6</td><td>Associations therapeutiques</td><td>variable</td><td>+4-12%</td><td>+8-12%</td></tr>
</table>

<h3>28.2 Vingt-sept facteurs decisionnels (14 variables cliniques)</h3>
<table>
<tr><th>#</th><th>Variable</th><th>Source</th><th>Impact algorithmique</th></tr>
<tr><td>1</td><td>IMC</td><td>Ecran 4</td><td>&lt;35 Ballon/ESG; 35-50 Sleeve; &ge;40+comorb Bypass; &ge;60 SADI-S</td></tr>
<tr><td>2</td><td>Score sf</td><td>calcul</td><td>&lt;40 medical; 40-59 endoscopique; 60-79 discussion chir; &ge;80 chir recommandee</td></tr>
<tr><td>3</td><td>CTI</td><td>calcul</td><td>&ge;55 urgence chirurgicale; 40-55 combinaison traitements</td></tr>
<tr><td>4</td><td>Profil GRS</td><td>calcul</td><td>R1/R2 GLP-1 prioritaire; R4/R5 chirurgie prioritaire</td></tr>
<tr><td>5</td><td>DT2 + HbA1c</td><td>Ecran 14+16</td><td>HbA1c &gt;9% Bypass (remission 29-45%)</td></tr>
<tr><td>6</td><td>GERD</td><td>Ecran 17</td><td>Documente: Bypass obligatoire (resolution 87%); Sleeve CI</td></tr>
<tr><td>7</td><td>SOPK</td><td>Ecran 14</td><td>Sleeve (remission 72% a 2 ans)</td></tr>
<tr><td>8</td><td>BES-16</td><td>Ecran 18</td><td>&ge;17 +Buproprion-Naltrexone; &ge;27 CI chirurgie</td></tr>
<tr><td>9</td><td>PSS-10 stress</td><td>Ecran 12</td><td>&gt;20 compliance chirurgicale reduite</td></tr>
<tr><td>10</td><td>Dyslipidemie</td><td>Ecran 14</td><td>Mixte: Bypass ou GLP-1+SGLT-2</td></tr>
<tr><td>11</td><td>NASH</td><td>Ecran 17</td><td>ESG prioritaire (62% resolution histologique)</td></tr>
<tr><td>12</td><td>ASA</td><td>Ecran 17</td><td>&ge;4 chirurgie CI (Ballon ou GLP-1 uniquement)</td></tr>
<tr><td>13</td><td>ATCD chirurgie</td><td>Ecran 17</td><td>Sleeve ant. Bypass revision (+23% EWL)</td></tr>
<tr><td>14</td><td>Preference patient</td><td>Ecran 17</td><td>Refus chir: escalade Ballon/ESG/GLP-1</td></tr>
</table>

<h3>28.3 Algorithme btm_decision() — Pseudocode</h3>
<div style="background:var(--bg2);border-radius:10px;padding:14px;font-family:var(--mono);font-size:11px;color:var(--cyan);line-height:1.7;overflow-x:auto">
<pre>
ENTREE: imc, sf, cti, grs, dt2, hba1c, gerd, sopk, besT, pss, dyslipiMixte, nash, asa, atcdChir, refusChir, comorbCV
SORTIE: rtp {primary, secondary, assoc[], contraind[], ewl, tbwl, complexity, parcours[], notes[]}

// GARDE-FOUS
SI besT >= 27 → contraind += "Chirurgie (TCA severe)"
SI asa >= 4 → primary=BT-1 Spatz3; secondary=BT-5 GLP-1 → RETOUR
SI atcdChir == "sleeve" → primary=BT-4 Bypass revision → RETOUR

// DECISION PAR PROFIL IMC + SF
SI imc < 30 ET sf < 40 → BT-5 GLP-1 faible dose
SI imc 30-35:
  SI grs R1/R2 → BT-5 GLP-1 haute dose; sec=BT-1 Spatz3
  SINON → BT-1 Spatz3; sec=BT-2 ESG; assoc GLP-1 post-ballon
SI imc 35-40:
  SI gerd → BT-4 Bypass; CI sleeve
  SI nash → BT-2 ESG (62% resolution)
  SI refusChir → BT-2 ESG; sec=BT-5
  SINON → BT-3 Sleeve; sec=BT-2 ESG
SI imc 40-50:
  SI (dt2 ET hba1c>9) OU gerd → BT-4 Bypass
  SI sopk → BT-3 Sleeve (remission 72%)
  SI grs R1 → BT-5 Tirzepatide 15mg
  SINON → BT-3 Sleeve; sec=BT-4 Bypass
SI imc >= 50:
  SI imc >= 60 → BT-4 SADI-S
  SINON → BT-4 Bypass long bras

// ENRICHISSEMENT ASSOCIATIONS
SI dt2+comorbCV → + Empagliflozine (SGLT-2) Grade 1A
SI besT 17-26 → + Buproprion-Naltrexone
SI dt2+imc>=30 → + GLP-1 + SGLT-2
SI cti >= 55 → note: chirurgie prioritaire si eligible
</pre>
</div>

<h3>28.4 BES-16 — Binge Eating Scale (Gormally 1982)</h3>
<p>Echelle validee de 16 items. Score 0-46. Seuils :</p>
<table>
<tr><th>Score</th><th>Interpretation</th><th>Impact BTM</th></tr>
<tr><td>&lt; 10</td><td>Normal</td><td>Aucune restriction</td></tr>
<tr><td>10-16</td><td>Tendance legere</td><td>Surveillance</td></tr>
<tr><td>17-26</td><td>Hyperphagie moderee</td><td>+ Buproprion-Naltrexone recommande</td></tr>
<tr><td>&ge; 27</td><td>Hyperphagie severe</td><td>Contre-indication chirurgie bariatrique. PEC TCA prealable obligatoire</td></tr>
</table>

<h3>28.5 Associations therapeutiques (BT-6)</h3>
<table>
<tr><th>Combinaison</th><th>Gain</th><th>Indication</th><th>Source</th></tr>
<tr><td>ESG + GLP-1</td><td>+6-9% TBWL</td><td>IMC 30-45</td><td>Sharaiha 2023</td></tr>
<tr><td>Spatz3 + GLP-1</td><td>Bridge chirurgie, -35% risque</td><td>Pre-operatoire</td><td>Meta-analyse BTM</td></tr>
<tr><td>Bypass + Semaglutide</td><td>92% remission DT2</td><td>DT2 + IMC &ge; 40</td><td>STAMPEDE post-hoc</td></tr>
<tr><td>GLP-1 + SGLT-2</td><td>+4-6% TBWL, -0.9% HbA1c</td><td>DT2 + maladie CV (1A)</td><td>ADA 2024</td></tr>
<tr><td>GLP-1 + Buproprion-Naltrexone</td><td>Synergie appetit+reward</td><td>BES &ge; 17</td><td>Consensus 2024</td></tr>
</table>

<h3>28.6 Section 11 du rapport final</h3>
<p>Le resultat final (ecran 19) affiche la Section 11 BTM avec :</p>
<table>
<tr><th>Sous-section</th><th>Contenu</th></tr>
<tr><td>11.1</td><td>Complexite therapeutique (1-5 etoiles)</td></tr>
<tr><td>11.2</td><td>Recommandation primaire (technique + justification)</td></tr>
<tr><td>11.3</td><td>Recommandation secondaire / alternative</td></tr>
<tr><td>11.4</td><td>Efficacite attendue (%TBWL + %EWL + BES-16)</td></tr>
<tr><td>11.5</td><td>Associations recommandees</td></tr>
<tr><td>11.6</td><td>Contre-indications identifiees</td></tr>
<tr><td>11.7</td><td>Parcours de soins optimise (chronologie)</td></tr>
</table>

<h3>28.7 Integration prompts IA Claude</h3>
<p>Les trois prompts Claude (analyse, interpretation, rapport) integrent les donnees BTM v3.4 :</p>
<table>
<tr><th>Prompt</th><th>Ajout BTM v3.4</th></tr>
<tr><td>/api/ai/analyse</td><td>Scoring matriciel 27 facteurs x 6 techniques, MOD-01 exclusivite IMC, MOD-05 delta normalise</td></tr>
<tr><td>/api/ai/interpreter</td><td>RTP v3.4 : scoring, classement, delta_rel, confiance, BT-6 type, CI, parcours + FNC</td></tr>
<tr><td>/api/ai/rapport</td><td>Sections 10-12 : btm_therapeutique (score_brut, score_pct, delta, confiance, BT-6, alarmes), fnc_note, note_methodologique</td></tr>
</table>

<h3>28.8 Matrice revisee v3.4 — BT-1 a BT-6 (27 facteurs)</h3>
<p>La matrice integre les 10 MOD du Dossier Maitre :</p>
<table>
<tr><th>Variable</th><th>BT-1 Ballon</th><th>BT-2 ESG</th><th>BT-3 Sleeve</th><th>BT-4 Bypass</th><th>BT-5 GLP-1</th><th>BT-6 Assoc.</th></tr>
<tr><td>IMC 27-30</td><td>+2</td><td>0</td><td>-5</td><td>-5</td><td>+4</td><td>+2</td></tr>
<tr><td>IMC 30-35</td><td>+3</td><td>+3</td><td>-2</td><td>-4</td><td>+4</td><td>+3</td></tr>
<tr><td>IMC 35-40</td><td>+1</td><td>+2</td><td>+4</td><td>+2</td><td>+2</td><td>+4</td></tr>
<tr><td>IMC 40-50</td><td>-1</td><td>0</td><td>+4</td><td>+4</td><td>+1</td><td>+2</td></tr>
<tr><td>IMC 50-60</td><td>-3</td><td>-2</td><td>+2</td><td>+5</td><td>-1</td><td>-1</td></tr>
<tr><td>IMC &ge;60</td><td>-5</td><td>-4</td><td>+1</td><td>+5</td><td>-2</td><td>-2</td></tr>
<tr><td>GERD sev.</td><td>-1</td><td>-1</td><td>-5</td><td>+5</td><td>0</td><td>-1</td></tr>
<tr><td>DT2 HbA1c &gt;9%</td><td>-1</td><td>+1</td><td>+2</td><td>+5</td><td>+2</td><td>+4</td></tr>
<tr><td>CTI &gt; 55</td><td>-2</td><td>0</td><td>+3</td><td>+4</td><td>-1</td><td>+2</td></tr>
<tr><td>GRS R1 (&ge;2.5)</td><td>0</td><td>0</td><td>-1</td><td>-2</td><td>+5</td><td>+3</td></tr>
<tr><td>GRS R4/R5</td><td>+1</td><td><b>+1</b> (MOD-07)</td><td>+3</td><td>+4</td><td>-3</td><td>-1</td></tr>
<tr><td>ASA &ge;4</td><td>+3</td><td><b>+2</b> (MOD-04)</td><td>-5</td><td>-5</td><td>+3</td><td>+1</td></tr>
<tr><td>BES &ge;27</td><td>-2</td><td>-2</td><td>-5</td><td>-5</td><td>+2</td><td>-2</td></tr>
<tr><td>ATCD Ballon</td><td><b>-2</b> (MOD-08)</td><td>+2</td><td>+2</td><td>+2</td><td>+2</td><td>+2</td></tr>
<tr><td>Refus chirurgie</td><td>+3</td><td>+3</td><td>-5</td><td>-5</td><td>+3</td><td>+3</td></tr>
</table>
<p class="ref">Matrice complete : 27 lignes, 6 colonnes. MOD-04 (ASA&ge;4 ESG: -2&rarr;+2), MOD-07 (GRS R4/R5 ESG: +2&rarr;+1), MOD-08 (ATCD Ballon: -3&rarr;-2).</p>

<!-- ═══════════════════════════════════════════ -->
<!-- 29. FNC v1.0 — Normalisation Climatique Koppen -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s29" style="border-color:#14b8a6">29. FNC v1.0 — Normalisation Climatique Koppen</h2>
<p>Le module FNC (Facteur de Normalisation Climatique) corrige le score Exposome Layer A (temperature, UV) pour les patients residant dans des zones a climat extreme. L'AQI (pollution) n'est <b>pas</b> normalise car la pollution a le meme impact independamment de l'acclimatation.</p>

<h3>29.1 Zones de Koppen</h3>
<table>
<tr><th>Zone</th><th>Climat</th><th>FNC_temp</th><th>FNC_uv</th><th>Exemple</th></tr>
<tr><td>Z1</td><td>Tropical humide</td><td>0.55</td><td>0.50</td><td>Maurice, Singapour</td></tr>
<tr><td>Z2</td><td>Desert chaud</td><td>0.50</td><td>0.55</td><td>Dubai, Riyadh</td></tr>
<tr><td>Z3</td><td>Mediterraneen</td><td>0.70</td><td>0.70</td><td>Marseille, Barcelone</td></tr>
<tr><td>Z4</td><td>Tempere oceanique (ref.)</td><td>1.00</td><td>1.00</td><td>Paris, Londres</td></tr>
<tr><td>Z5</td><td>Continental</td><td>1.10</td><td>1.00</td><td>Montreal, Moscou</td></tr>
<tr><td>Z6</td><td>Tropical sec / savane</td><td>0.60</td><td>0.55</td><td>Bamako, Mumbai (saison seche)</td></tr>
</table>

<h3>29.2 Formule d'acclimatation progressive</h3>
<div class="formula-box">
  <div class="d">FNC EFFECTIVE</div>
  <div class="f">FNC_eff = 1 - (1 - FNC) &times; min(1, mois_r&eacute;sidence / 12)</div>
  <div class="d">Si residence &ge; 12 mois : FNC_eff = FNC (acclimatation complete)</div>
  <div class="d">Si residence = 0 mois : FNC_eff = 1.00 (pas d'acclimatation, reference Z4)</div>
</div>

<h3>29.3 Application au Layer A Exposome</h3>
<div class="formula-box">
  <div class="f">A_norm = min(1, (air/8 + temp/4 &times; FNC_eff_temp + UV/3 &times; FNC_eff_uv) / 3 &times; inflammMult_ethnique)</div>
  <div class="d">air = AQI score (0-8, NON normalise) | temp = score thermique (0-4) | UV = score UV (0-3)</div>
</div>

<h3>29.4 Impact sur le Score E</h3>
<p>Un patient residant a Maurice (Z1) depuis &ge;12 mois verra son score temp multiplie par 0.55 et son score UV par 0.50, reduisant significativement le poids de la chaleur/UV dans le score Exposome. Ceci reflete l'acclimatation physiologique (Bain &amp; Jay, J Physiol 2011).</p>

<h3>29.5 Justification scientifique</h3>
<p>L'acclimatation a la chaleur modifie les reponses thermoregulatrices : augmentation du volume plasmatique, sudation precoce, reduction du seuil de vasodilatation (Periard et al., Comp Physiol 2016). Les populations residant en zone tropicale depuis &gt;12 mois presentent une adaptation metabolique qui reduit l'impact du stress thermique sur la depense energetique (Taylor, Auton Neurosci 2014).</p>

<!-- ═══════════════════════════════════════════ -->
<!-- SYNTHESE FINALE -->
<!-- ═══════════════════════════════════════════ -->
<div class="synth" id="synth">
<h2 style="margin:0 0 14px;border:none;background:none;padding:0;color:var(--teal)">SYNTHESE — Formules Cles Verrouillees</h2>
<pre>
+----------------------------------------------------------------+
|                    SCORE BMN v3.4 --- FORMULES                  |
+----------------------------------------------------------------+
|                                                                 |
|  sD = min(100, C + E + O + L)                                  |
|                                                                 |
|  C = min(50, c1+c2+c3+c4+c5+c6+c7+c8) * (1+ev/100)           |
|      avec GF plancher si comorbidites graves                    |
|                                                                 |
|  E = min(45, E* * (1 + 0.15 * bInflam))                       |
|  E* = 30 * (0.7*A + 0.5*B + 0.3*C_layer) / 1.5               |
|                                                                 |
|  O = min(10, stressJob + posture + hours)  [ou retraite]       |
|  L = min(10, l1 + l2 + l3 + l4)                               |
|                                                                 |
|  bioNorm = (Sum z_i * w_i / Sum w_i) * 100                    |
|  z_i = clamp(0, 1, (val - nm) / (ab - nm))                    |
|                                                                 |
|  sf = wDecl(0.65) * sD + wBio(0.35) * bioNorm                 |
|      + reponderation si gap > 20                                |
|      + BioFloor: sf >= 75% * bioNorm                           |
|      + BEF: si bio > 90 -> sf >= max(80, 85% * bio)           |
|      + Urgence: HbA1c >= 6.5 -> sf >= 60                      |
|                                                                 |
|  CTI = (Sum gamma_j * Z_j / 1.459) * 100 * ctiAmp            |
|  GRI = Sum delta_k * F_k - Sum epsilon_k * U_k                |
|  GRS = (IR*0.35+Inflam*0.15+Demo-Chron*0.20-Psy*0.15-Iatro*0.20+GRI)/2  |
|  PPE = clamp(0, 25, PPE_base + Sum modificateurs)             |
|  SII = Sum(7 criteres binaires)                                |
|  P(Ob 10 ans) = Markov 6x6 * exp(0.68*sf/100)*exp(0.35*K)    |
|                                                                 |
|  bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR)                   |
|                                                                 |
|  BTM = btm_decision(27 facteurs × 6 techniques)             |
|  Matrice: score_brut[t] = Sum poids[facteur][technique]      |
|  MOD-01: IMC exclusif (PREMIER_VRAI du plus haut)            |
|  MOD-05: delta_rel = (p-s)/p*100 (25/10/0%)                |
|  MOD-09: score_pct = score/max_possible*100                  |
|  MOD-10: alarme si primary <= 0                              |
|                                                              |
|  FNC v1.0 (Koppen):                                         |
|  FNC_eff = 1-(1-FNC)*min(1,mois/12)                         |
|  A_norm = min(1,(air/8+temp/4*FNC_t+UV/3*FNC_u)/3*iM)      |
|                                                              |
|  BES-16 = Sum(16 items, w_i) in [0,46]                      |
|  Seuils: <10 normal, 17 modere, 27 CI chir                  |
|                                                                 |
+----------------------------------------------------------------+
</pre>
</div>

<div style="text-align:center;margin:40px 0;padding:20px;border-top:2px solid var(--border2)">
  <p style="font-size:14px;font-weight:700;color:var(--accent)">FIN DU DOSSIER &mdash; ALGORITHME SCORE BMN v3.4</p>
  <p style="font-size:12px;color:var(--dim)">Architecture CLEO + BSD v4.9 + Bio v4.7.1 + BTM v2.0 + FNC v1.0</p>
  <p style="font-size:12px;color:var(--dim2)">Bach | Manos | Noel &mdash; 4 Mars 2026</p>
  <p style="font-size:11px;color:var(--dim3)">29 sections | 20 ecrans | 13 comorbidites + IR auto | BES-16 | 62 etudes BTM | 10 MOD | FNC 6 zones | 12 profils ethniques</p>
  <div style="margin-top:14px">
    <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
    <a href="/" class="print-btn" style="text-decoration:none;background:var(--teal)">Retour Score BMN</a>
    <a href="#top" class="print-btn" style="text-decoration:none;background:var(--dim3)">Haut de page</a>
  </div>
</div>

</div>
</body>
</html>`)
})

// ─── Dossier Scientifique Complet ───
app.get('/dossier-scientifique', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOSSIER SCIENTIFIQUE — SCORE BMN v3.4 — Méta-analyse & Justification bibliographique</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x2695;</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f172a;--bg2:#1e293b;--bg3:#334155;--txt:#e2e8f0;--dim:#94a3b8;--dim2:#64748b;--dim3:#475569;--accent:#818cf8;--green:#22c55e;--green-bg:rgba(34,197,94,.1);--orange:#f59e0b;--orange-bg:rgba(245,158,11,.1);--red:#ef4444;--red-bg:rgba(239,68,68,.1);--purple:#a855f7;--purple-bg:rgba(168,85,247,.1);--teal:#14b8a6;--cyan:#22d3ee;--border:rgba(255,255,255,.06);--font:'Inter',sans-serif;--mono:'JetBrains Mono',monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--txt);line-height:1.8;-webkit-font-smoothing:antialiased}
.doc{max-width:960px;margin:0 auto;padding:20px 24px 80px}
h1{font-size:26px;font-weight:900;color:var(--accent);margin:40px 0 8px;border-bottom:2px solid var(--accent);padding-bottom:8px}
h2{font-size:20px;font-weight:800;color:var(--cyan);margin:32px 0 10px;padding:10px 14px;background:var(--bg2);border-radius:10px;border-left:4px solid var(--cyan)}
h3{font-size:16px;font-weight:700;color:var(--teal);margin:20px 0 8px}
h4{font-size:14px;font-weight:600;color:var(--orange);margin:14px 0 6px}
p{margin:8px 0;font-size:14px;color:var(--dim)}
.ref{font-size:11px;color:var(--accent);font-style:italic}
.formula{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 18px;margin:12px 0;font-family:var(--mono);font-size:13px;color:var(--cyan);line-height:1.6}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
th{background:var(--bg3);color:var(--cyan);padding:10px 8px;text-align:left;font-weight:700;border:1px solid var(--border)}
td{padding:8px;border:1px solid var(--border);color:var(--dim)}
tr:nth-child(even){background:var(--bg2)}
.meta-box{background:var(--bg2);border:2px solid var(--accent);border-radius:14px;padding:18px;margin:16px 0}
.warn{background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:10px 14px;margin:10px 0;font-size:12px;color:var(--red)}
.ok{background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:10px 14px;margin:10px 0;font-size:12px;color:var(--green)}
.toc{background:var(--bg2);border-radius:12px;padding:16px 20px;margin:16px 0}
.toc a{color:var(--accent);text-decoration:none;display:block;padding:3px 0;font-size:13px}
.toc a:hover{color:var(--cyan)}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:#fff}
.print-btn{display:inline-block;margin:6px 4px;padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px}
@media print{body{background:#fff;color:#000}.doc{max-width:100%}h1,h2,h3{color:#000}th{background:#ddd;color:#000}td{color:#333}.formula{background:#f5f5f5;color:#000;border-color:#ccc}p,.ref{color:#333}}
</style>
</head>
<body>
<div class="doc" id="top">

<div style="text-align:center;padding:30px 0 20px">
  <div style="font-size:12px;color:var(--dim2);text-transform:uppercase;letter-spacing:2px">Document scientifique confidentiel</div>
  <div style="font-size:36px;font-weight:900;color:var(--accent);margin:10px 0">SCORE BMN v3.4</div>
  <div style="font-size:18px;color:var(--cyan);font-weight:600">Dossier Scientifique Complet</div>
  <div style="font-size:14px;color:var(--dim);margin:8px 0">Méta-analyse, justification bibliographique & validation du modèle</div>
  <div style="font-size:12px;color:var(--dim2);margin-top:12px">Architecture CLEO (C+E+O+L) + BSD v4.9 + Bio v4.7.1 + BTM v2.0 + FNC v1.0</div>
  <div style="font-size:11px;color:var(--dim3);margin-top:4px">Bach · Manos · Noël — Verrouillé le 4 mars 2026</div>
  <div style="font-size:11px;color:var(--dim3)">Version : DS-3.4-FINAL | Classification : Usage médical restreint</div>
  <div style="margin-top:8px;display:inline-block;padding:4px 12px;background:rgba(129,140,248,.15);border:1px solid var(--accent);border-radius:6px;font-size:11px;color:var(--accent);font-weight:700">v3.4 : +BTM v2.0 (10 MOD, 27×6) · +FNC v1.0 (Köppen 6 zones) · 62 études · BES-16 · 12 profils ethniques</div>
</div>

<div class="toc">
<h3 style="margin-top:0">Table des matières</h3>
<a href="#s1">I. Résumé exécutif & objectifs</a>
<a href="#s2">II. Méthodologie de construction du modèle</a>
<a href="#s3">III. Revue systématique de la littérature</a>
<a href="#s4">IV. Architecture CLEO — Justification du modèle composite</a>
<a href="#s5">V. Phase C — Score Clinique (0-50) : justification de chaque sous-score</a>
<a href="#s6">VI. Phase E — Score Exposome (0-45) : justification des couches A/B/C</a>
<a href="#s7">VII. Phase O — Score Occupationnel (0-10) : données probantes</a>
<a href="#s8">VIII. Phase L — Score Lifestyle (0-10) : justification IPAQ/PREDIMED/AUDIT-C</a>
<a href="#s9">IX. Profils ethniques (12 groupes) : seuils & multiplicateurs</a>
<a href="#s10">X. Comorbidités (14 items) : HR/OR & méta-analyses</a>
<a href="#s11">XI. Instruments psychométriques validés (PSS-10, PHQ-9, BES, ISI)</a>
<a href="#s12">XII. Panel biologique (15 biomarqueurs) : justification de chaque poids</a>
<a href="#s13">XIII. Formule bioNorm — Méta-analyse des poids</a>
<a href="#s14">XIV. Intégration déclaratif-biologie : formule sf & repondération dynamique</a>
<a href="#s15">XV. Sous-index inflammatoire indirect (SII) — 7 critères</a>
<a href="#s16">XVI. CTI — Chronicity Trajectory Index : composantes & poids γ</a>
<a href="#s17">XVII. GRI — GLP-1 Response Index : facteurs favorables & défavorables</a>
<a href="#s18">XVIII. GLP-1 Response Profiling Engine v2.0 — 6 axes & 5 profils</a>
<a href="#s19">XIX. Modèle de Markov à 10 ans — Matrice de transition & calibration</a>
<a href="#s20">XX. Analyse de sensibilité du modèle</a>
<a href="#s21">XXI. Limites & biais potentiels</a>
<a href="#s22">XXII. Bibliographie complète (>90 références)</a>
<a href="#s23" style="color:var(--accent);font-weight:700">★ XXIII. MISE À JOUR v3.1 — Dyslipidémie (14e comorbidité)</a>
<a href="#s24" style="color:var(--teal);font-weight:700">★ XXIV. MODULE BTM v3.4 — Bariatric &amp; Therapeutic Module (62 études, &gt;180K patients)</a>
<a href="#s25" style="color:var(--teal);font-weight:700">★ XXV. FNC v1.0 — Normalisation Climatique Köppen (NOUVEAU v3.4)</a>
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s1">I. Résumé exécutif & objectifs</h1>

<p>Le <b>SCORE BMN v3.4</b> (Bach-Manos-Noël) est un algorithme d'évaluation du risque métabolique et d'obésité conçu pour la pratique clinique de première ligne. Il combine quatre dimensions déclaratives (architecture CLEO : Clinique, Exposome, Occupationnel, Lifestyle) avec un panel biologique de 15 biomarqueurs, une intelligence artificielle médicale (Claude AI), et des données environnementales en temps réel (qualité de l'air, météo, géolocalisation).</p>

<h3>Objectifs du modèle</h3>
<p>1. <b>Sensibilité maximale</b> : détecter les patients à risque métabolique AVANT l'apparition de l'obésité clinique manifeste, en identifiant les phénotypes métaboliquement obèses à poids normal (MONW) et les insulinorésistances occultes.</p>
<p>2. <b>Personnalisation ethnique</b> : intégrer les seuils spécifiques OMS/IDF pour 9 groupes ethniques, reconnaissant que les seuils européens sous-estiment le risque chez les populations sud-asiatiques et est-asiatiques.</p>
<p>3. <b>Prédiction pharmacologique</b> : phénotyper la réponse aux agonistes GLP-1 (sémaglutide, tirzépatide) via un modèle multi-axes (GLP-1 Response Profiling Engine v2.0) pour guider la prescription.</p>
<p>4. <b>Aide à la décision thérapeutique (BTM v2.0)</b> : scoring matriciel 27 facteurs × 6 techniques bariatriques (BT-1 à BT-6), 10 MOD conformes au Dossier Maître v3.4, avec associations thérapeutiques et normalisation climatique (FNC v1.0).</p>

<h3>Design du modèle</h3>
<div class="formula">
Score déclaratif : sD = min(100, C + E + O + L)<br>
Score final : sf = w_decl × sD + w_bio × bioNorm<br>
avec w_decl = 0.65, w_bio = 0.35 (repondération dynamique si gap > 20)<br>
Classification : FAIBLE (&lt;30) | MODÉRÉ (30-59) | ÉLEVÉ (60-79) | TRÈS ÉLEVÉ (≥80)
</div>

<p><b>Choix de la sensibilité élevée :</b> Le modèle est intentionnellement calibré pour maximiser la sensibilité (Se > 0.90 visée) au détriment modéré de la spécificité (Sp ~ 0.70-0.75). Ce choix est justifié par le contexte de dépistage en première ligne : le coût d'un faux négatif (patient à risque non détecté → progression vers l'obésité/diabète) est considérablement plus élevé que celui d'un faux positif (bilan biologique prescrit inutilement). Cette philosophie suit les recommandations de l'USPSTF 2018 et de l'OMS pour les outils de dépistage en médecine préventive.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s2">II. Méthodologie de construction du modèle</h1>

<h3>2.1 Stratégie de recherche bibliographique</h3>
<p>La construction du SCORE BMN v3.4 repose sur une revue systématique de la littérature menée entre 2023 et 2026, suivant les directives PRISMA 2020. Les bases de données consultées incluent PubMed/MEDLINE, Cochrane Library, Embase, et Google Scholar.</p>

<h4>Critères d'inclusion</h4>
<p>• Études de cohorte prospectives (n ≥ 1 000 participants) • Méta-analyses et revues systématiques Cochrane • Essais contrôlés randomisés (ECR) de phase III pour les données pharmacologiques • Guidelines internationales (OMS, IDF, ADA, ESC/EAS) • Données de registres nationaux (NHANES, UK Biobank, Framingham Heart Study)</p>

<h4>Critères d'exclusion</h4>
<p>• Études transversales sans suivi longitudinal (sauf pour validation d'instruments psychométriques) • Échantillons n < 500 (sauf populations spécifiques) • Publications antérieures à 2000 (sauf références fondatrices)</p>

<h3>2.2 Extraction des hazard ratios et odds ratios</h3>
<p>Pour chaque facteur de risque intégré au modèle, nous avons extrait les HR/OR ajustés issus des méta-analyses les plus récentes, avec intervalles de confiance à 95%. Les poids du modèle (points attribués) sont proportionnels au log(HR) ou log(OR) normalisé, conformément à la méthodologie utilisée par Framingham Risk Score, SCORE2 (ESC 2021), et FINDRISC.</p>

<h3>2.3 Calibration des poids</h3>
<p>La transformation HR → points suit la formule de Wilson-D'Agostino (Framingham) adaptée :</p>
<div class="formula">
Points_i = round(β_i / β_ref × Scale)<br>
où β_i = ln(HR_i), β_ref = ln(HR_référence), Scale = plage de points maximale<br>
<br>
Exemple pour les comorbidités (plage 0-14) :<br>
DT2 : HR 3.84 → β = 1.345 → 14 pts (référence maximale)<br>
HTA : HR 2.24 → β = 0.806 → 10 pts (0.806/1.345 × 14 ≈ 8.4, arrondi à 10 pour sensibilité)<br>
Hypothyroïdie : OR 1.74 → β = 0.554 → 6 pts
</div>

<h3>2.4 Choix de la pondération déclaratif/biologie (65/35)</h3>
<p>La pondération wDecl=0.65 / wBio=0.35 est fondée sur trois considérations :</p>
<p>1. <b>Disponibilité</b> : le score déclaratif est toujours disponible (100% des patients), la biologie ne l'est qu'après prescription et résultats (délai 1-14 jours).</p>
<p>2. <b>Variance expliquée</b> : dans les cohortes NHANES III et UK Biobank, les facteurs comportementaux et cliniques expliquent ~60-70% de la variance du risque d'obésité à 10 ans, contre ~25-35% pour les biomarqueurs seuls (Khera et al., Nat Genet 2019).</p>
<p>3. <b>Repondération dynamique</b> : lorsque le gap biologie-déclaratif dépasse 20 points (bioNorm > sD + 20), le poids biologique augmente jusqu'à wBio=0.65, pour capturer les cas de risque biologique masqué (patient déclarant peu de symptômes mais biologie alarmante).</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s3">III. Revue systématique de la littérature</h1>

<h3>3.1 Scores de risque existants analysés</h3>
<table>
<tr><th>Score</th><th>Cible</th><th>Variables</th><th>Limites identifiées</th><th>Référence</th></tr>
<tr><td>Framingham Risk Score</td><td>Risque CV à 10 ans</td><td>Âge, sexe, cholestérol, PA, tabac, diabète</td><td>Pas d'obésité directe, pas d'ethnie, pas de comportement alimentaire</td><td>D'Agostino 2008</td></tr>
<tr><td>SCORE2 (ESC)</td><td>Risque CV à 10 ans</td><td>Âge, sexe, tabac, PAS, cholestérol</td><td>Pas de biomarqueurs d'IR, pas d'exposome, pas de psychométrie</td><td>SCORE2 Working Group 2021</td></tr>
<tr><td>FINDRISC</td><td>Risque DT2 à 10 ans</td><td>Âge, IMC, TT, AP, alimentation, ATCD</td><td>Pas de biologie, pas de GLP-1, pas de Markov</td><td>Lindström & Tuomilehto 2003</td></tr>
<tr><td>Edmonton Obesity Staging</td><td>Sévérité obésité</td><td>5 stades (0-4) cliniques</td><td>Qualitatif, pas de score continu, pas de prédiction</td><td>Sharma & Kushner 2009</td></tr>
<tr><td>CMDS Score</td><td>Risque cardiométabolique</td><td>IMC, TT, TG, HDL, glycémie, PA</td><td>Pas d'exposome, pas de psychométrie, pas d'ethnie détaillée</td><td>Guo et al. 2014</td></tr>
</table>

<p><b>Justification du SCORE BMN :</b> Aucun score existant ne combine simultanément (1) les biomarqueurs d'insulinorésistance, (2) l'exposome environnemental temps réel, (3) la psychométrie validée (PSS-10 + PHQ-9 + BES), (4) le phénotypage GLP-1, (5) la projection Markov, et (6) les seuils ethniques IDF. Le SCORE BMN comble ce vide en intégrant ces 6 dimensions dans un modèle unique.</p>

<h3>3.2 Méta-analyses fondatrices utilisées</h3>
<table>
<tr><th>Méta-analyse</th><th>n (participants)</th><th>Résultat clé pour BMN</th><th>Impact sur le modèle</th></tr>
<tr><td>CTT Collaboration 2010</td><td>170 000</td><td>Réduction LDL de 1 mmol/L → -22% événements CV</td><td>Poids LDL w=1.8</td></tr>
<tr><td>ERFC 2010 (Emerging Risk Factors)</td><td>1 200 000</td><td>CRP : HR 1.37/log, HbA1c : HR 1.15/0.1%, TG : HR 1.22/SD</td><td>Poids CRP w=2.0, HbA1c w=2.0</td></tr>
<tr><td>CKD-PC 2010</td><td>1 000 000</td><td>eGFR &lt; 60 : HR 1.56 mortalité toutes causes</td><td>Inclusion créatinine dans P10</td></tr>
<tr><td>Lancet 2016 (NCD-RisC)</td><td>19 200 000</td><td>IMC ≥ 30 : HR 1.45 mortalité ; seuils ethniques validés</td><td>Seuils IMC par ethnie, c3 scoring</td></tr>
<tr><td>Biswas et al. 2015</td><td>828 000</td><td>Sédentarité prolongée : HR 1.24 mortalité toutes causes</td><td>Score sédentarité dans E.B et O</td></tr>
<tr><td>Cappuccio et al. 2008</td><td>474 684</td><td>Sommeil &lt;6h : RR 1.12 obésité ; &lt;5h : RR 1.45</td><td>Scoring sommeil c8 et l4</td></tr>
<tr><td>INTERHEART 2004</td><td>29 000</td><td>9 facteurs modifiables = 90% du risque CV</td><td>Architecture multi-factorielle CLEO</td></tr>
<tr><td>DPP Research Group 2002</td><td>3 234</td><td>Lifestyle -58% incidence DT2 vs placebo</td><td>Justification phase L et stratégies</td></tr>
<tr><td>PREDIMED 2013</td><td>7 447</td><td>Régime méditerranéen -30% événements CV</td><td>Score l2 alimentation PREDIMED-equiv</td></tr>
</table>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s4">IV. Architecture CLEO — Justification du modèle composite</h1>

<p>L'architecture CLEO (Clinique + Exposome + Occupationnel + Lifestyle) est inspirée du modèle biopsychosocial d'Engel (1977) et des déterminants sociaux de la santé de l'OMS (Solar & Irwin 2010). La décomposition en 4 phases permet :</p>

<p>1. <b>Clinique (C, 0-50)</b> : facteurs biomédicaux non modifiables ou difficilement modifiables (âge, sexe, génétique, comorbidités). Poids dominant (50/115 = 43%) car ce sont les déterminants les plus forts du risque métabolique (INTERHEART : OR 2.0-4.0).</p>
<p>2. <b>Exposome (E, 0-45)</b> : environnement physique et chimique. Poids élevé (39%) car la pollution atmosphérique est associée à un OR 1.20-1.49 pour le syndrome métabolique (Eze et al., Environ Health Perspect 2015) et les perturbateurs endocriniens (aliments ultra-transformés) à un OR 1.25-1.79 (Fiolet et al., BMJ 2018).</p>
<p>3. <b>Occupationnel (O, 0-10)</b> : facteurs professionnels. Poids modéré (9%) car le travail de nuit augmente le risque d'obésité de 29% (Lane et al., Sleep Med Rev 2024, OR 1.29) et l'isolement social (retraite) augmente la mortalité de 26% (Valtorta et al., Heart 2016).</p>
<p>4. <b>Lifestyle (L, 0-10)</b> : comportements modifiables à court terme. Poids modéré (9%) car ces facteurs sont les plus rapidement modifiables mais leur impact individuel est plus faible (HR 1.1-1.5 par facteur).</p>

<div class="formula">
Plages : C(0-50) + E(0-45) + O(0-10) + L(0-10) = max théorique 115<br>
sD = min(100, C+E+O+L) — plafonnement à 100 pour normalisation<br>
<br>
Justification des plages :<br>
• C = 50 pts → reflète que les facteurs cliniques ont le poids le plus élevé (INTERHEART)<br>
• E = 45 pts → l'exposome est reconnu comme le 2e déterminant (OMS, Willett 2019)<br>
• O et L = 10 pts chacun → facteurs modificateurs à impact moindre individuellement<br>
• Somme max 115 &gt; 100 → volontaire : permet la saturation en cas de cumul extrême
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s5">V. Phase C — Score Clinique (0-50) : justification détaillée</h1>

<h3>5.1 Sous-score c1 — Âge (0-10 pts)</h3>
<table>
<tr><th>Tranche d'âge</th><th>Points</th><th>Justification</th><th>Référence</th></tr>
<tr><td>&lt; 40 ans</td><td>0</td><td>Risque métabolique de base faible</td><td>Framingham, SCORE2</td></tr>
<tr><td>40-44 ans</td><td>2</td><td>Début de l'augmentation du risque (HR 1.2-1.4 vs &lt;40)</td><td>SCORE2 Working Group 2021</td></tr>
<tr><td>45-54 ans</td><td>5</td><td>Risque significatif (HR 1.8-2.2 vs &lt;40, ménopause chez la femme)</td><td>Framingham, WHI Study</td></tr>
<tr><td>55-64 ans</td><td>7</td><td>Risque élevé (HR 2.5-3.0), sarcopénie débutante</td><td>D'Agostino 2008, Cruz-Jentoft 2019</td></tr>
<tr><td>≥ 65 ans</td><td>10</td><td>Risque maximal : sarcopénie + résistance insuline liée à l'âge + ↓ métabolisme basal (-2%/décennie)</td><td>NHANES III, Baumgartner 1998</td></tr>
</table>

<h3>5.2 Sous-score c2 — Sexe (0-2 pts)</h3>
<p><b>Homme &lt; 60 ans : 2 pts.</b> Justification : les hommes de moins de 60 ans ont un risque CV et métabolique supérieur aux femmes pré-ménopausées (HR 1.5-2.0, Framingham). Les œstrogènes exercent un effet protecteur sur la distribution adipeuse (graisse gynoïde vs androïde) et la sensibilité à l'insuline (Carr 2003, J Clin Endocrinol Metab). Après 60 ans, l'écart se réduit (post-ménopause), d'où la restriction &lt;60 ans.</p>

<h3>5.3 Sous-score c3 — Anthropométrie : IMC + WHtR + Tour de taille (0-12 pts)</h3>

<h4>IMC (0-7 pts)</h4>
<table>
<tr><th>IMC</th><th>Points</th><th>HR/OR associé</th><th>Référence</th></tr>
<tr><td>&lt; seuil surpoids ethnique</td><td>0</td><td>Référence</td><td>OMS / WHO Asia-Pacific 2000</td></tr>
<tr><td>≥ seuil surpoids</td><td>3</td><td>HR 1.20-1.45 mortalité (Lancet 2016, n=10.6M)</td><td>Global BMI Mortality Collaboration 2016</td></tr>
<tr><td>≥ seuil obésité</td><td>5</td><td>HR 1.45-1.94 mortalité (Lancet 2016)</td><td>Global BMI Mortality Collaboration 2016</td></tr>
<tr><td>≥ obésité + 5 kg/m²</td><td>7</td><td>HR 2.76 mortalité (IMC ≥ 40, Lancet 2016)</td><td>Flegal et al. 2013, JAMA</td></tr>
</table>

<h4>WHtR — Waist-to-Height Ratio (0-3 pts bonus)</h4>
<p>Le WHtR est supérieur à l'IMC pour prédire le risque cardiométabolique (Ashwell & Hsieh 2005, méta-analyse n=300 000). Seuil universel ≥ 0.50 validé toutes ethnies (Browning et al., Obes Rev 2010). Le SCORE BMN attribue : WHtR ≥ 0.50 = +1, ≥ 0.55 = +2, ≥ 0.60 = +3.</p>
<p class="ref">Ashwell M, Hsieh SD. Six reasons why the waist-to-height ratio is a rapid and effective global indicator for health risks of obesity. Int J Food Sci Nutr 2005;56:303-7. | Browning LM et al. A systematic review of waist-to-height ratio as a screening tool. Obes Rev 2010;11:67-75.</p>

<h4>Tour de taille (0-2 pts additionnel)</h4>
<p>Seuils IDF 2006 spécifiques par ethnie et sexe. Dépassement du seuil = +1 pt, dépassement &gt;10 cm = +2 pts. L'obésité abdominale est le meilleur prédicteur de la résistance à l'insuline (Després 2012, Nature).</p>

<h3>5.4 Sous-score c4 — Comorbidités projetées (0-10 pts)</h3>
<p>Projection du score BMN-K (0-50, somme pondérée des 13 comorbidités déclaratives + IR occulte auto-détectée) sur une échelle 0-10 avec modulation ethnique pour l'HTA (multiplicateur hR) et le diabète (multiplicateur dR). v3.1 : inclut la dyslipidémie avec 3 sous-types et interaction MetS (+3). v3.1.1 : IR occulte retirée du déclaratif → détection automatique via TG/HDL > 3.5 (+8 pts BMN-K). Voir section X et XXIII pour le détail.</p>

<h3>5.5 Sous-score c5 — Antécédents familiaux & génétique (0-10 pts)</h3>
<table>
<tr><th>Facteur</th><th>Points</th><th>Evidence</th><th>Référence</th></tr>
<tr><td>1 parent obèse</td><td>+2</td><td>RR 3.0 obésité si 1 parent obèse</td><td>Whitaker et al., NEJM 1997</td></tr>
<tr><td>2 parents obèses</td><td>+4</td><td>RR 8.0 obésité si 2 parents obèses</td><td>Whitaker et al., NEJM 1997</td></tr>
<tr><td>Obésité infantile légère</td><td>+2</td><td>OR 1.9-2.5 obésité adulte</td><td>Geserick et al., NEJM 2018</td></tr>
<tr><td>Obésité infantile sévère</td><td>+3</td><td>OR 4.0-5.0 obésité adulte + programmation épigénétique</td><td>Geserick 2018, Lancet 2016</td></tr>
<tr><td>DT2 familial (1 parent)</td><td>+1</td><td>RR 2.4 DT2</td><td>InterAct Consortium, Diabetologia 2013</td></tr>
<tr><td>DT2 familial (2 parents)</td><td>+2</td><td>RR 5.6 DT2</td><td>Meigs et al., Diabetes 2000</td></tr>
<tr><td>Régimes yoyo (≥3)</td><td>+2</td><td>Thermogenèse adaptative ↓ 15%, regain pondéral accéléré</td><td>Fothergill et al., Obesity 2016 ; Sumithran et al., NEJM 2011</td></tr>
</table>
<p>Modulation ethnique : si cvRisk ethnique &gt; 1.2, amplification de c5 par (1 + (cR-1)×0.3). Justification : les populations à risque CV élevé (sud-asiatiques, cR=1.5) cumulent prédisposition génétique et facteurs environnementaux (Yusuf et al., INTERHEART 2004).</p>

<h3>5.6 Sous-score c6 — Tabac (0-8 pts)</h3>
<p>Le tabagisme augmente le risque d'obésité abdominale par redistribution adipeuse (OR 1.35, méta-analyse Morris et al., BMC Public Health 2015) et l'arrêt du tabac s'accompagne d'une prise de poids moyenne de +4.7 kg à 12 mois (Aubin et al., BMJ 2012, méta-analyse n=62 études). Le SCORE BMN attribue : jamais=0, ex >1an=1, ex récent=2 (risque résiduel de prise de poids), &lt;10 cig/j=4, ≥10 cig/j=8.</p>

<h3>5.7 Sous-score c7 — Santé mentale : PSS-10 + PHQ-9 + BES (0-8 pts)</h3>
<p>Le stress chronique (PSS-10) augmente le cortisol plasmatique, favorisant l'adipogenèse viscérale (Björntorp 2001, Obes Rev). La dépression (PHQ-9) est bidirectionnellement associée à l'obésité (Luppino et al., Arch Gen Psychiatry 2010, méta-analyse : OR 1.55 obésité→dépression, OR 1.58 dépression→obésité). L'hyperphagie boulimique (BES) touche 20-30% des patients obèses (Hudson et al., Biol Psychiatry 2007).</p>

<h3>5.8 Sous-score c8 — Sommeil + ISI (0-4 pts)</h3>
<p>Méta-analyse de Cappuccio et al. (2008, n=474 684) : sommeil &lt;6h = RR 1.12 obésité (IC 95% 1.06-1.19). L'insomnie (ISI ≥ 15) perturbe la ghréline (+28%) et la leptine (-18%), favorisant l'hyperphagie (Spiegel et al., Lancet 1999).</p>

<h3>5.9 Modulation ethnique de C</h3>
<div class="formula">
C_final = round(C_brut × (1 + ev/100))<br>
<br>
ev = variation ethnique (%) :<br>
eu = 0%, im = -1.5%, cr = -2%, si = +1.5%, sa = -1.5%, af = -1.5%, ea = +1.5%, se = 0%, fm = +1%<br>
<br>
Justification : les seuils IMC plus bas pour les Asiatiques (23/27.5 vs 25/30) sont compensés<br>
par un ev négatif pour les populations insulaires à risque élevé (im, cr, sa, af) qui<br>
présentent des taux de DT2 2-3x supérieurs malgré des IMC comparables (Yoon et al., Lancet 2006).
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s6">VI. Phase E — Score Exposome (0-45)</h1>

<h3>6.1 Formule générale</h3>
<div class="formula">
E* = 30 × (0.7×A + 0.5×B + 0.3×C) / 1.5<br>
E = min(45, round(E* × (1 + 0.15 × bInflam)))<br>
<br>
Couche A (0-1) : Environnement physique (air + température + UV) × inflammMult ethnique<br>
Couche B (0-1) : Mobilité (trajet domicile-travail + sédentarité, atténuée par AP)<br>
Couche C (0-1) : Perturbateurs endocriniens (ultra-transformés + fast-food)
</div>

<h3>6.2 Couche A — Qualité de l'air, température, UV</h3>
<p><b>Pollution atmosphérique :</b> PM2.5 augmente le risque de syndrome métabolique (OR 1.18 par 10 μg/m³, Eze et al., Environ Health Perspect 2015, méta-analyse n=68 000). L'exposition chronique aux PM2.5 active les voies inflammatoires NF-κB et favorise la résistance à l'insuline (Rajagopalan & Brook, Circulation 2012). Score AQI US : 0-50=0pt, 51-100=2, 101-150=4, 151-200=6, >200=8 (échelle EPA).</p>
<p><b>Stress thermique :</b> Température >35°C augmente le cortisol (+22%, Mora et al., Nat Clim Change 2017). Froid extrême &lt;-5°C augmente la dépense calorique mais induit une compensation alimentaire (van Marken Lichtenbelt 2009). Scoring : >40°C=4, >35°C=3, >30°C=1, &lt;-5°C=3, &lt;5°C=1.</p>
<p><b>UV :</b> L'exposition UV >8 (indice très élevé) est associée à un stress oxydatif cutané avec impact systémique (Holick 2007). Cependant, une exposition modérée est bénéfique (vitamine D). Scoring : UV 3-6=1, 6-8=2, >8=3.</p>
<p><b>Multiplicateur inflammatoire ethnique (iM) :</b> Les populations africaines et indo-mauriciennes présentent des niveaux de base de CRP plus élevés (+20-30%, Khera et al., NEJM 2005). iM = 1.0-1.3 selon l'ethnie.</p>

<h3>6.3 Couche B — Mobilité & sédentarité</h3>
<p><b>Trajet domicile-travail :</b> Un trajet >30 km est associé à un OR 1.16 d'obésité et un trajet >60 km à OR 1.31 (Hoehner et al., Am J Prev Med 2012, n=4 297). Scoring : >60km=5, >30km=4, >15km=3, >5km=2.</p>
<p><b>Sédentarité :</b> Temps assis >8h/jour : HR 1.24 mortalité toutes causes (Biswas et al., Ann Intern Med 2015, méta-analyse n=828 000). Atténuation si activité physique ≥150 min/sem (réduction HR à 1.08, Ekelund et al., Lancet 2016). La formule intègre cette atténuation : b_assis_att = b_assis_raw × 0.50 si AP ≥ 150 min/sem.</p>

<h3>6.4 Couche C — Perturbateurs endocriniens alimentaires</h3>
<p><b>Aliments ultra-transformés (NOVA 4) :</b> Consommation élevée d'ultra-transformés augmente le risque d'obésité de 26% (Pagliai et al., Br J Nutr 2021, méta-analyse de 23 études) et de syndrome métabolique de 35% (Juul et al., AJCN 2022). OR 1.26-1.79 selon le niveau d'exposition (Fiolet et al., BMJ 2018, cohorte NutriNet-Santé n=104 980).</p>
<p><b>Fast-food :</b> Consommation ≥2x/semaine : OR 1.27 obésité, OR 1.51 syndrome métabolique (Pereira et al., Lancet 2005, CARDIA study n=3 031).</p>

<h3>6.5 Amplification inflammatoire (bInflam)</h3>
<div class="formula">
bInflam = moyenne(z_CRP, z_TG/HDL, z_HOMA-IR)<br>
E = E* × (1 + 0.15 × bInflam)<br>
<br>
Justification : l'inflammation chronique (CRP, TG/HDL, HOMA-IR) amplifie l'effet<br>
de l'exposome. Les particules fines aggravent un terrain inflammatoire préexistant<br>
(Brook et al., Circulation 2010). Le coefficient 0.15 (max +15%) est conservateur.
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s7">VII. Phase O — Score Occupationnel (0-10)</h1>

<h3>7.1 Travailleurs actifs — Modèle de Karasek adapté</h3>
<p>Le modèle de Karasek (Job Demand-Control, 1979) est adapté aux facteurs d'obésité :</p>
<table>
<tr><th>Facteur</th><th>Points max</th><th>Evidence</th><th>Référence</th></tr>
<tr><td>Type sédentaire (bureau >8h)</td><td>6</td><td>OR 1.48 obésité (van Uffelen et al., Int J Obes 2010)</td><td>van Uffelen 2010</td></tr>
<tr><td>Travail de nuit régulier</td><td>3</td><td>OR 1.29 obésité (Lane et al., Sleep Med Rev 2024, n=338 000)</td><td>Lane 2024</td></tr>
<tr><td>Posture assise prolongée</td><td>2</td><td>Augmente le risque métabolique indépendamment de l'AP</td><td>Biswas 2015</td></tr>
<tr><td>Heures >55h/sem</td><td>2</td><td>OR 1.12-1.17 obésité (Virtanen et al., Lancet 2015, n=600 000)</td><td>Virtanen 2015</td></tr>
</table>

<h3>7.2 Retraités — Isolement social</h3>
<p>L'isolement social augmente le risque CV de 29% et la mortalité de 26% (Valtorta et al., Heart 2016, méta-analyse n=181 000). La sédentarité liée à la retraite est un facteur indépendant d'obésité sarcopénique (Batsis & Villareal, Nat Rev Endocrinol 2018).</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s8">VIII. Phase L — Score Lifestyle (0-10)</h1>

<h3>8.1 l1 — Activité physique IPAQ (0-3)</h3>
<p>Référence OMS 2020 : ≥150 min/sem d'activité modérée. Le DPP (2002) a démontré une réduction de 58% de l'incidence du DT2 avec 150 min/sem + perte de poids 7%. Scoring : ≥150=0, 75-149=1, 30-74=2, &lt;30=3.</p>

<h3>8.2 l2 — Alimentation DQI-BMN → PREDIMED-equiv (0-3)</h3>
<p>10 items nutritionnels cotés 0-4 chacun (ultra-transformés, boissons sucrées, sucres ajoutés, fruits/légumes, portions, structure repas, grignotage, fast-food, cuisine maison, eau). Score brut 0-39 inversé en équivalent PREDIMED 0-14. PREDIMED : régime méditerranéen -30% événements CV (Estruch et al., NEJM 2013, n=7 447).</p>

<h3>8.3 l3 — Alcool AUDIT-C (0-2)</h3>
<p>Consommation >21 verres/sem : RR 1.19 obésité abdominale (Sayon-Orea et al., Nutr Rev 2011, méta-analyse). L'alcool apporte 7 kcal/g et inhibe l'oxydation des graisses (Shelmet et al., AJCN 1988).</p>

<h3>8.4 l4 — Sommeil/ISI (0-2)</h3>
<p>Sommeil &lt;6h ou insomnie ISI ≥15 : perturbation ghréline/leptine → hyperphagie (Spiegel et al., Lancet 1999 ; Taheri et al., PLoS Med 2004).</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s9">IX. Profils ethniques — 9 groupes, seuils & multiplicateurs</h1>

<h3>9.1 Justification des seuils IMC ethniques</h3>
<p>L'OMS reconnaît depuis 2004 que les seuils standard (25/30 kg/m²) sous-estiment le risque chez les populations asiatiques. Le rapport WHO Expert Consultation (Lancet 2004) recommande des seuils abaissés : 23/27.5 pour les Sud-Asiatiques et Est-Asiatiques. L'IDF (2006) a défini des seuils de tour de taille spécifiques par ethnie.</p>

<table>
<tr><th>Code</th><th>Groupe</th><th>Surpoids</th><th>Obésité</th><th>TT ♀</th><th>TT ♂</th><th>dR (DT2)</th><th>cvR (CV)</th><th>hR</th><th>cR</th><th>iM</th><th>ldl</th><th>ev%</th><th>Références clés</th></tr>
<tr><td>eu</td><td>Européen</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td><td>OMS standard</td></tr>
<tr><td>im</td><td>Indo-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.8</td><td>1.2</td><td>1.4</td><td>1.2</td><td>1.3</td><td>-1.5</td><td>WHO 2004, IDF 2006, Ramachandran 2010</td></tr>
<tr><td>cr</td><td>Créole Mauricien</td><td>25</td><td>30</td><td>84</td><td>94</td><td>1.6</td><td>1.5</td><td>1.4</td><td>1.2</td><td>1.2</td><td>1.0</td><td>-2</td><td>Mauritius NCD Survey, Soderberg 2005</td></tr>
<tr><td>si</td><td>Sino-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.7</td><td>1.4</td><td>0.9</td><td>0.6</td><td>0.9</td><td>0.9</td><td>+1.5</td><td>WHO Asia-Pacific 2000, Chan 2009</td></tr>
<tr><td>sa</td><td>Sud-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.8</td><td>1.3</td><td>1.5</td><td>1.2</td><td>1.3</td><td>-1.5</td><td>Joshi 2007, INTERHEART SA</td></tr>
<tr><td>af</td><td>Africain / Subsaharien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.5</td><td>1.6</td><td>1.5</td><td>1.2</td><td>1.3</td><td>1.0</td><td>-1.5</td><td>Peer 2012, IDF Africa</td></tr>
<tr><td>ea</td><td>Est-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>88</td><td>0.9</td><td>0.9</td><td>0.9</td><td>0.7</td><td>0.9</td><td>0.9</td><td>+1.5</td><td>WHO 2004, Wen 2009</td></tr>
<tr><td>se</td><td>Sud-Est Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.2</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td><td>IDF 2006, Aekplakorn 2007</td></tr>
<tr><td>fm</td><td>Franco-Mauricien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0.9</td><td>1.0</td><td>1.0</td><td>+1</td><td>Profil européen standard, MNSDS</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td>met</td><td>Métis Mauricien</td><td>24</td><td>28</td><td>84</td><td>94</td><td>1.5</td><td>1.4</td><td>1.2</td><td>1.1</td><td>1.1</td><td>1.0</td><td>-0.5</td><td>Profil mixte, Mauritius NCD Survey</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td>ar</td><td>Arabe / MENA</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.7</td><td>1.5</td><td>1.2</td><td>1.2</td><td>1.1</td><td>1.1</td><td>-1</td><td>IDF MENA, Motala 2008, Al-Rubeaan 2015</td></tr>
<tr style="background:rgba(20,184,166,.08)"><td>oth</td><td>Autre / Non spécifié</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td><td>Profil Caucasien par défaut</td></tr>
</table>

<h3>9.2 Justification du multiplicateur diabète (dR)</h3>
<p>Les Indo-Mauriciens et Sud-Asiatiques ont un risque de DT2 2x supérieur aux Européens à IMC équivalent (Ramachandran et al., Diabetologia 2010 ; Joshi et al., JAPI 2007). Ce «paradoxe asiatique» est lié à : (1) une masse grasse viscérale plus élevée à IMC comparable, (2) une fonction β-cellulaire réduite, (3) une prédisposition génétique (variants TCF7L2, SLC30A8). dR = 2.0 signifie que chaque point de diabète est multiplié par 2.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s10">X. Comorbidités (14 items) : HR/OR & méta-analyses</h1>

<table>
<tr><th>ID</th><th>Pathologie</th><th>Pts</th><th>HR/OR</th><th>Source méta-analytique</th><th>n</th><th>cat</th><th>gri_fav</th><th>Justification du poids</th></tr>
<tr><td>dt2</td><td>Diabète Type 2</td><td>14</td><td>HR 3.84</td><td>Emerging Risk Factors Collab., JAMA 2015</td><td>698 782</td><td>dis</td><td>0</td><td>Plus fort HR → points max. Perte espérance vie 8.9 ans. IR sévère irréversible.</td></tr>
<tr><td>sopk</td><td>SOPK</td><td>14</td><td>OR 2.77</td><td>Lim et al., Hum Reprod Update 2019</td><td>92 000</td><td>dis</td><td>1</td><td>Phénotype IR féminin sévère. GLP-1 très efficace (Jensterle 2022). Points = dt2.</td></tr>
<tr><td>saos</td><td>SAOS</td><td>12</td><td>OR 2.19</td><td>Drager et al., Eur Respir J 2015</td><td>15 000</td><td>dis</td><td>0</td><td>Hypoxie intermittente → IR + cortisol nocturne élevé. Cercle vicieux obésité-SAOS.</td></tr>
<tr><td>mets</td><td>Syndrome métabolique</td><td>12</td><td>HR 2.64</td><td>Mottillo et al., JACC 2010</td><td>951 083</td><td>dis</td><td>1</td><td>≥3 critères IDF. Risque CV doublé. GLP-1 corrige plusieurs composantes.</td></tr>
<tr><td>hta</td><td>HTA établie</td><td>10</td><td>HR 2.24</td><td>Lewington et al., Lancet 2002 (PSC)</td><td>1 000 000</td><td>dis</td><td>0</td><td>Aggrave obésité viscérale. Points modulés par hR ethnique.</td></tr>
<tr><td>nafld</td><td>NAFLD</td><td>10</td><td>OR 3.22</td><td>Younossi et al., Hepatology 2016</td><td>8 500 000</td><td>dis</td><td>1</td><td>IR hépatique. Prévalence 25% mondiale. GLP-1 réduit stéatose -30/40% (Newsome 2021).</td></tr>
<tr><td>monw</td><td>Phénotype MONW</td><td>10</td><td>OR 2.38</td><td>Stefan et al., Lancet Diab Endocrinol 2017</td><td>15 études</td><td>phe</td><td>1</td><td>IMC &lt; 25 mais ≥2 critères MetS. Risque sous-estimé. Sensibilité du modèle ++.</td></tr>
<tr><td>predmt</td><td>Pré-diabète</td><td>8</td><td>HR 2.11</td><td>Huang et al., BMJ 2016</td><td>1 611 339</td><td>dis</td><td>1</td><td>HbA1c 5.7-6.4%. Réversible. GLP-1 prévient DT2 (réduction 80%, STEP 2).</td></tr>
<tr style="background:rgba(239,68,68,.08);border:1px dashed var(--red)"><td>ir_occ</td><td>IR occulte <b>(AUTO v3.1.1)</b></td><td>8</td><td>OR 2.12</td><td>McLaughlin et al., Circulation 2005</td><td>n=490</td><td>bio-auto</td><td>1</td><td><b>v3.1.1 : Retirée du déclaratif</b> — le patient ne peut pas savoir qu'il a une IR occulte. Détection automatique via TG/HDL > 3.5 dans le module biologique. +8 pts BMN-K injectés automatiquement, CTI ca ×1.2, GRI +0.55.</td></tr>
<tr><td>cortis</td><td>Corticoïdes >3 mois</td><td>8</td><td>HR 2.12</td><td>Fardet et al., J Clin Endocrinol Metab 2007</td><td>6 500</td><td>tx</td><td>0</td><td>Adipogenèse viscérale iatrogène. gr = -0.35 (antagonise GLP-1).</td></tr>
<tr><td>hypo</td><td>Hypothyroïdie</td><td>6</td><td>OR 1.74</td><td>Laurberg et al., Eur Thyroid J 2012</td><td>34 000</td><td>dis</td><td>0</td><td>TSH>4 → métabolisme ralenti -10/15%. À corriger AVANT GLP-1.</td></tr>
<tr><td>depres</td><td>Dépression traitée</td><td>6</td><td>OR 1.92</td><td>Luppino et al., Arch Gen Psychiatry 2010</td><td>58 745</td><td>tx</td><td>0</td><td>Impact métabolique bidirectionnel. Compliance réduite.</td></tr>
<tr><td>antidep</td><td>Antidépresseurs obésogènes</td><td>4</td><td>OR 1.58</td><td>Gafoor et al., BMJ 2018</td><td>300 000</td><td>tx</td><td>0</td><td>Paroxétine/mirtazapine : +2-4 kg/an. Impact modéré.</td></tr>
<tr style="background:rgba(129,140,248,.12)"><td><b>dyslipi</b></td><td><b>★ Dyslipidémie v3.1</b></td><td><b>6-10</b></td><td>HR 1.87-2.34</td><td>Framingham Heart Study / INTERHEART Study</td><td>NHANES/OMS</td><td>dis</td><td>1</td><td><b>NOUVEAU v3.1.</b> 3 sous-types : Mixte (TG≥1.7+HDL bas, 10 pts, GRI +0.55, ca ×1.15) | LDL isolé (LDL≥4.1, 6 pts, GRI +0.20, ca ×1.05) | Traitée statines (8 pts, GRI +0.35, ca ×1.10). Flag statines → correction LDL×1.35 dans bioNorm. Interaction MetS : K+=3. Interaction DT2 : CTI ca=max(1.20).</td></tr>
</table>

<div class="meta-box" style="border-color:var(--accent)">
<h3 style="margin-top:0;color:var(--accent)">v3.1 — Flag Statines : Correction bioNorm</h3>
<p>Lorsqu'un patient déclare une dyslipidémie sous traitement par statines, le module biologique v3.1 applique des corrections automatiques :</p>
<div class="formula">
// Correction LDL (Source : CTT Meta-analysis 2010, réduction moyenne statines = 26%)<br>
SI traitement = statines OU combinaison :<br>
&nbsp;&nbsp;LDL_corrigé = LDL_mesuré × 1.35<br>
&nbsp;&nbsp;z_LDL = clamp(0, 1, (LDL_corrigé − 3.0) / (4.1 − 3.0))<br><br>
// Correction TG (fibrates réduisent TG de ~25%)<br>
SI traitement = fibrates :<br>
&nbsp;&nbsp;TG_corrigé = TG_mesuré × 1.30<br><br>
// ApoB poids dominant si statines > 5 ans (Sniderman 2019, ESC 2021)<br>
SI statines ET durée > 5 ans :<br>
&nbsp;&nbsp;w_ApoB = 2.5 (au lieu de 1.5)
</div>
<p>Cette correction empêche la sous-estimation des patients traités dont le LDL mesuré est artificiellement bas.</p>
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s11">XI. Instruments psychométriques validés</h1>

<h3>11.1 PSS-10 — Perceived Stress Scale</h3>
<p><b>Auteurs :</b> Cohen, Kamarck & Mermelstein, 1983. <b>Validation :</b> &gt;50 langues, &gt;1 000 études. Alpha de Cronbach : 0.84-0.86. Test-retest : r=0.85 à 2 semaines. 10 items cotés 0-4, items 4,5,7,8 inversés. Score 0-40. Seuils : &lt;14 faible, 14-19 modéré, 20-26 élevé, ≥27 très élevé.</p>
<p><b>Lien obésité :</b> PSS score ≥20 associé à OR 1.36 obésité abdominale (Richardson et al., Prev Med 2015). Le stress chronique élève le cortisol, favorisant l'adipogenèse viscérale (Björntorp 2001).</p>

<h3>11.2 PHQ-9 — Patient Health Questionnaire</h3>
<p><b>Auteurs :</b> Kroenke, Spitzer & Williams, 2001. <b>Validation :</b> Se 88%, Sp 88% pour dépression majeure (seuil ≥10). 9 items cotés 0-3, score 0-27. Seuils : 0-4 minimal, 5-9 léger, 10-14 modéré, 15-19 modérément sévère, 20-27 sévère.</p>
<p><b>Lien obésité :</b> Relation bidirectionnelle (Luppino 2010). Dépression → obésité OR 1.58. Obésité → dépression OR 1.55.</p>

<h3>11.3 BES — Binge Eating Scale (simplifié)</h3>
<p>Version simplifiée 0-8 basée sur la fréquence des crises (Hudson et al., Biol Psychiatry 2007). BES ≥5 = hyperphagie cliniquement significative. Prévalence : 20-30% des patients obèses.</p>

<h3>11.4 ISI — Insomnia Severity Index</h3>
<p><b>Auteurs :</b> Morin et al., 2001. 7 items, score 0-28. Seuils : 0-7 pas d'insomnie, 8-14 légère, 15-21 modérée, 22-28 sévère. Alpha de Cronbach : 0.90.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s12">XII. Panel biologique — 15 biomarqueurs : justification de chaque poids</h1>

<p>Les poids (w) sont proportionnels à la force de l'association avec le risque métabolique, extraite des méta-analyses fondatrices. Le poids total est de 23.2 (dénominateur de bioNorm).</p>

<table>
<tr><th>ID</th><th>Biomarqueur</th><th>w</th><th>Normal</th><th>Anormal</th><th>Panel</th><th>Inv</th><th>HR/OR source</th><th>Justification du poids w</th></tr>
<tr><td>homaIR</td><td>HOMA-IR</td><td>2.5</td><td>&lt;2.5</td><td>≥4.0</td><td>P5</td><td>Non</td><td>HR 2.50 DT2 (Hanley 2002, méta n=16 études)</td><td>Marqueur central d'IR. Plus fort prédicteur de progression DT2. Poids max.</td></tr>
<tr><td>adipon</td><td>Adiponectine</td><td>2.5</td><td>≥10</td><td>&lt;6.0</td><td>P10</td><td>Oui</td><td>HR 0.72 par SD (Li 2009, méta n=14 598)</td><td>Hormone protectrice. Basse = dysfonction adipocytaire. Inversée. Poids = HOMA-IR.</td></tr>
<tr><td>hba1c</td><td>HbA1c</td><td>2.0</td><td>&lt;5.7%</td><td>≥6.5%</td><td>P5</td><td>Non</td><td>HR 1.15/0.1% (ERFC 2010, n=1.2M)</td><td>Gold standard glycémique. Seuils ADA 2024.</td></tr>
<tr><td>crphs</td><td>CRP ultrasensible</td><td>2.0</td><td>&lt;1.0</td><td>≥3.0</td><td>P5</td><td>Non</td><td>HR 1.37/log (ERFC 2010, n=1.2M)</td><td>Marqueur inflammatoire systémique. Seuils AHA/CDC 2003.</td></tr>
<tr><td>tghdl</td><td>Ratio TG/HDL</td><td>2.0</td><td>&lt;2.0</td><td>≥3.5</td><td>P15</td><td>Non</td><td>OR 2.12 IR (McLaughlin 2005)</td><td>Meilleur proxy clinique d'IR sans HOMA-IR. Poids élevé pour sensibilité.</td></tr>
<tr><td>glyc</td><td>Glycémie à jeun</td><td>1.8</td><td>&lt;5.6</td><td>≥7.0</td><td>P5</td><td>Non</td><td>HR 1.17/mmol (ERFC 2010)</td><td>Complément HbA1c. Seuils ADA 2024.</td></tr>
<tr><td>ldl</td><td>LDL cholestérol</td><td>1.8</td><td>&lt;3.0</td><td>≥4.1</td><td>P5</td><td>Non</td><td>HR 1.22/mmol (CTT 2010, n=170 000)</td><td>Risque CV athérosclérotique. Guidelines ESC/EAS 2019.</td></tr>
<tr><td>tg</td><td>Triglycérides</td><td>1.5</td><td>&lt;1.7</td><td>≥2.3</td><td>P10</td><td>Non</td><td>HR 1.22/SD (ERFC 2010)</td><td>Composante du MetS. Marqueur de stéatose hépatique.</td></tr>
<tr><td>apob</td><td>ApoB</td><td>1.5</td><td>&lt;0.9</td><td>≥1.2</td><td>P10</td><td>Non</td><td>HR 1.43/SD (ERFC 2010)</td><td>Supérieur au LDL pour prédiction CV (Sniderman 2019). Recommandé ESC 2019.</td></tr>
<tr><td>leptine</td><td>Leptine</td><td>1.5</td><td>&lt;20</td><td>≥40</td><td>P15</td><td>Non</td><td>OR 2.3 obésité persistante (Considine 1996)</td><td>Leptinorésistance = barrière centrale à la perte de poids. Marqueur de chronicité.</td></tr>
<tr><td>tsh</td><td>TSH</td><td>1.3</td><td>0.4-4.0</td><td>&gt;4.0</td><td>P5</td><td>Non</td><td>OR 1.74 obésité (Laurberg 2012)</td><td>Hypothyroïdie subclinique fréquente et corrigeable. Impact métabolisme basal.</td></tr>
<tr><td>hdl</td><td>HDL cholestérol</td><td>1.0</td><td>≥1.0</td><td>&lt;0.7</td><td>P5</td><td>Oui</td><td>HR 0.78/SD (ERFC 2010)</td><td>Protecteur. Inversé. Poids modéré car HDL isolément controversé (AIM-HIGH).</td></tr>
<tr><td>asat</td><td>Transaminases</td><td>1.0</td><td>&lt;40</td><td>≥60</td><td>P10</td><td>Non</td><td>OR 1.5-2.0 NAFLD (Chalasani 2018)</td><td>Marqueur hépatique. NAFLD screening.</td></tr>
<tr><td>ggt</td><td>GGT</td><td>0.8</td><td>&lt;50</td><td>≥80</td><td>P10</td><td>Non</td><td>HR 1.20 MetS (Lee 2007, méta n=273 000)</td><td>Marqueur de stéatose/alcool. Poids faible car peu spécifique.</td></tr>
<tr><td>urate</td><td>Acide urique</td><td>0.8</td><td>&lt;360</td><td>≥420</td><td>P15</td><td>Non</td><td>HR 1.13 MetS (Li 2014, méta n=38 000)</td><td>Associé au MetS et à la goutte. Marqueur de fructose/purines. Poids faible.</td></tr>
</table>

<div class="ok">Poids total Σw = 2.5+2.5+2.0+2.0+2.0+1.8+1.8+1.5+1.5+1.5+1.3+1.0+1.0+0.8+0.8 = <b>23.2</b></div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s13">XIII. Formule bioNorm — Méta-analyse des poids</h1>

<div class="formula">
bioNorm = (Σ z_i × w_i / Σ w_i) × 100<br>
<br>
où z_i = score z linéaire borné [0, 1] :<br>
  • Marqueur direct (non inversé) : z = max(0, min(1, (valeur - normal) / (anormal - normal)))<br>
  • Marqueur inversé (HDL, adiponectine) : z = max(0, min(1, (normal - valeur) / (normal - anormal)))<br>
<br>
Propriétés :<br>
  • bioNorm = 0 → tous les marqueurs dans la zone normale<br>
  • bioNorm = 100 → tous les marqueurs au-delà du seuil anormal<br>
  • Le dénominateur est adaptatif : Σw_i ne compte que les marqueurs renseignés<br>
  • Cela permet une bioNorm valide même avec un panel partiel (P5 vs P10 vs P15)
</div>

<p><b>Validation de la formule :</b> La méthode de z-score pondéré est identique à celle utilisée par le SCORE2 (ESC 2021) et le FRS (Framingham). L'utilisation de poids proportionnels aux HR/OR publiés assure que les marqueurs les plus fortement associés au risque (HOMA-IR, adiponectine) contribuent davantage au score final.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s14">XIV. Intégration déclaratif-biologie : formule sf</h1>

<div class="formula">
sf = wDecl × sD + wBio × bioNorm<br>
<br>
Défaut : wDecl = 0.65, wBio = 0.35<br>
<br>
REPONDÉRATION DYNAMIQUE :<br>
Si gap = bioNorm - sD > 20 :<br>
  extraW = min(0.30, (gap - 20) / 100 × 0.60)<br>
  wBio = 0.35 + extraW (max 0.65)<br>
  wDecl = 1 - wBio<br>
<br>
PLANCHERS DE SÉCURITÉ (sensibilité maximale) :<br>
  1. BioFloor : sf ≥ 0.75 × bioNorm<br>
     → Un patient avec bioNorm = 80 ne peut PAS avoir sf &lt; 60<br>
  2. BioEmergencyFloor (BEF) :<br>
     Si bioNorm > 90 : sf ≥ max(80, 0.85 × bioNorm)<br>
     Si bioNorm > 80 : sf ≥ 0.85 × bioNorm<br>
  3. Urgences HbA1c :<br>
     HbA1c ≥ 6.5% → sf ≥ 60 (diabète biologique)<br>
     HbA1c ≥ 8.0% → sf ≥ 70 (diabète mal contrôlé)
</div>

<p><b>Justification des planchers :</b> Ces garde-fous garantissent que le modèle ne sous-estime JAMAIS un risque biologique avéré, même si le patient déclare peu de symptômes comportementaux. C'est le cœur de la philosophie de sensibilité du SCORE BMN : un HbA1c à 7.5% DOIT classer le patient au minimum en MODÉRÉ-ÉLEVÉ, indépendamment de son score déclaratif.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s15">XV. Sous-Index Inflammatoire Indirect (SII) — 7 critères</h1>

<table>
<tr><th>#</th><th>Critère</th><th>Seuil</th><th>Justification</th><th>Référence</th></tr>
<tr><td>1</td><td>Stress PSS ratio ≥ 35%</td><td>PSS/40 ≥ 0.35</td><td>Cortisol chronique → inflammation de bas grade</td><td>Björntorp 2001, Cohen 1983</td></tr>
<tr><td>2</td><td>Activité &lt; 75 min/sem</td><td>apT &lt; 75</td><td>Inactivité = inflammation (CRP ↑ 30-40%)</td><td>Kasapis & Thompson 2005</td></tr>
<tr><td>3</td><td>IMC ≥ seuil obésité ethnique</td><td>IMC ≥ e.ob</td><td>Tissu adipeux = organe pro-inflammatoire (TNF-α, IL-6)</td><td>Hotamisligil 1993, Trayhurn 2005</td></tr>
<tr><td>4</td><td>Tabagisme actif</td><td>tabac ≥ 3</td><td>Tabac → CRP ↑, leucocytes ↑, stress oxydatif</td><td>Yanbaeva 2007</td></tr>
<tr><td>5</td><td>Alimentation déséquilibrée</td><td>alimRaw ≥ 20</td><td>Ultra-transformés → inflammation intestinale et systémique</td><td>Fiolet 2018, NOVA</td></tr>
<tr><td>6</td><td>Insomnie modérée+ (ISI ≥ 15)</td><td>ISI ≥ 15</td><td>Privation sommeil → IL-6 ↑, CRP ↑ (Irwin 2016)</td><td>Irwin et al., Biol Psychiatry 2016</td></tr>
<tr><td>7</td><td>Tour taille &gt; seuil ethnique</td><td>TT &gt; seuil</td><td>Obésité abdominale = corrélat majeur de l'inflammation viscérale</td><td>Després 2012, IDF 2006</td></tr>
</table>

<p><b>Usage :</b> SII ≥ 2 chez un patient classé FAIBLE → prescription P5 obligatoire. Le SII est un filet de sécurité pour détecter les patients à inflammation subclinique non captée par le score déclaratif seul.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s16">XVI. CTI — Chronicity Trajectory Index (0-100)</h1>

<div class="formula">
CTI = min(100, round((Σ γ_j × Z_j / 1.459) × 100 × ctiAmp))<br>
<br>
Composantes et poids γ :<br>
1. Score déclaratif sD (γ = 0.185) — Gravité globale du profil<br>
2. Régimes yoyo (γ = 0.249) — Poids le plus élevé : thermogenèse adaptative<br>
3. Leptinorésistance/obésité/SAOS (γ = 0.210) — Barrière centrale à la satiété<br>
4. Alimentation (γ = 0.180) — Perturbateurs endocriniens chroniques<br>
5. Cortisol : stress + sommeil + horaires (γ = 0.195) — Axe HPA hyperactivé<br>
6. Métabolisme : hypothyroïdie + yoyo (γ = 0.200) — Métabolisme basal abaissé<br>
7. Obésité infantile (γ = 0.240) — Programmation épigénétique<br>
<br>
Σ γ = 1.459 (dénominateur de normalisation)<br>
ctiAmp = max(c.ca pour comorbidités sélectionnées) — amplificateur de chronicité
</div>

<h3>Justification des poids γ</h3>
<p><b>γ_yoyo = 0.249 (le plus élevé) :</b> Les régimes yoyo sont le prédicteur le plus fort de chronicisation de l'obésité. Fothergill et al. (Obesity 2016, suivi 6 ans des participants de The Biggest Loser) ont montré que la thermogenèse adaptative persiste 6+ ans après perte de poids, avec une dépense énergétique au repos réduite de ~500 kcal/j. Sumithran et al. (NEJM 2011) ont démontré que les hormones de l'appétit (ghréline, leptine, PYY) restent perturbées 12+ mois après perte de poids.</p>
<p><b>γ_enfance = 0.240 :</b> L'obésité infantile induit une hyperplasie adipocytaire irréversible (Spalding et al., Nature 2008 : le nombre d'adipocytes se fixe à l'adolescence). Geserick et al. (NEJM 2018) : obésité à 5 ans → OR 4.0 obésité adulte.</p>

<h3>Interprétation du CTI</h3>
<table>
<tr><th>CTI</th><th>Label</th><th>Signification clinique</th></tr>
<tr><td>≤ 20</td><td style="color:#22c55e">Fenêtre ouverte</td><td>Interventions classiques (nutrition, AP) pleinement efficaces. Agir maintenant.</td></tr>
<tr><td>21-40</td><td style="color:#f59e0b">Début chronicisation</td><td>Efficacité décroissante. Pharmacologie (GLP-1) à considérer.</td></tr>
<tr><td>41-55</td><td style="color:#ef4444">Chronicité avancée</td><td>Mécanismes adaptatifs installés. GLP-1 haute dose recommandé.</td></tr>
<tr><td>&gt; 55</td><td style="color:#a855f7">Chronicité installée</td><td>Résistance majeure. Évaluation chirurgicale bariatrique obligatoire.</td></tr>
</table>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s17">XVII. GRI — GLP-1 Response Index (-3 à +6)</h1>

<div class="formula">
GRI = Σ δ_k × F_k − Σ ε_k × U_k<br>
<br>
Facteurs FAVORABLES (δ) :<br>
  • Comorbidités gri_fav=1 : predmt (0.82), sopk (0.83), monw (0.70), mets (0.65),<br>
    nafld (0.66), dt2 (0.65)<br>
  • IR occulte : +0.55 (auto-détectée via TG/HDL > 3.5, v3.1.1 — non déclarative)<br>
  • HOMA-IR > 2.5 : +1.07<br>
  • Adiponectine &lt; 6 : +0.62<br>
  • TG/HDL > 3.5 : +0.55<br>
<br>
Facteurs DÉFAVORABLES (ε) :<br>
  • Comorbidités gr &lt; 0 : cortis (-0.35)<br>
  • CTI > 55 : -0.65<br>
  • Corticoïdes : -0.35<br>
  • IMC > 40 : -0.47<br>
  • Stress ratio ≥ 0.6 : -0.28
</div>

<p><b>Justification :</b> Les essais STEP 1-5 (sémaglutide) et SURMOUNT 1-4 (tirzépatide) ont démontré que la réponse aux GLP-1 est fortement corrélée à : (1) le degré d'insulinorésistance (sous-groupe HOMA-IR élevé : perte de poids +3-5% supérieure), (2) la présence de SOPK/NAFLD (Jensterle 2022, Newsome 2021), (3) l'absence de chronicisation avancée. Les facteurs défavorables sont issus des analyses post-hoc des essais : IMC >40 = réponse diminuée (STEP 1), corticoïdes = antagonisme pharmacologique direct, CTI >55 = résistance aux mécanismes de satiété.</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s18">XVIII. GLP-1 Response Profiling Engine v2.0</h1>

<h3>18.1 Les 6 axes d'évaluation</h3>
<table>
<tr><th>Axe</th><th>Plage</th><th>Direction</th><th>Marqueurs clés</th><th>Justification</th></tr>
<tr><td>1. Insulinorésistance (IR)</td><td>0-10</td><td>↑ positif</td><td>HOMA-IR, adiponectine, TG/HDL, SOPK, NAFLD</td><td>STEP 2/SURMOUNT 2 : IR = meilleur prédicteur de réponse GLP-1</td></tr>
<tr><td>2. Chronicité-Résistance</td><td>0-10</td><td>↓ négatif</td><td>CTI, yoyo, leptine, obésité infantile, IMC ≥40</td><td>Leibel 1995 / Sumithran 2011 : chronicité = résistance aux traitements</td></tr>
<tr><td>3. Inflammation</td><td>0-10</td><td>↑ positif</td><td>CRP, bInflam, SII, GGT</td><td>GLP-1 a un effet anti-inflammatoire direct (Pal 2022)</td></tr>
<tr><td>4. Psycho-comportemental</td><td>0-10</td><td>↓ négatif</td><td>PHQ-9, PSS-10, BES, dépression</td><td>Wadden 2021 : compliance réduite si PHQ ≥15</td></tr>
<tr><td>5. Iatrogène</td><td>0-5</td><td>↓ négatif</td><td>Corticoïdes, antidépresseurs, hypothyroïdie</td><td>Fardet 2007, Gafoor 2018 : antagonisme pharmacologique</td></tr>
<tr><td>6. Démographique</td><td>bonus</td><td>↑ positif</td><td>Âge 30-65, sexe féminin, ethnie IR</td><td>STEP 1 : femmes répondent +2% de plus ; âge 30-55 optimal</td></tr>
</table>

<h3>18.2 Score composite GRS</h3>
<div class="formula">
posFactor = IR×0.35 + Inflammation×0.15 + demoBonus<br>
negFactor = Chronicité×0.20 + Psycho×0.15 + Iatrogène×0.20<br>
GRS = (posFactor − negFactor + GRI) / 2<br>
GRS borné [-3, +6]
</div>

<h3>18.3 Les 5 profils + contre-indication</h3>
<table>
<tr><th>Code</th><th>Profil</th><th>GRS</th><th>Prob. réponse</th><th>PPE</th><th>Molécule 1ère ligne</th><th>Source</th></tr>
<tr><td style="color:#22c55e"><b>R1</b></td><td>Excellent répondeur</td><td>≥2.5 + IR≥4 + chron≤4</td><td>&gt;85%</td><td>15-22%</td><td>Tirzépatide ou Sémaglutide</td><td>SURMOUNT-1 (-22.5%), STEP-1 (-14.9%)</td></tr>
<tr><td style="color:#14b8a6"><b>R2</b></td><td>Bon répondeur</td><td>≥1.5 + IR≥2</td><td>60-85%</td><td>10-17%</td><td>Sémaglutide (Wegovy)</td><td>STEP-1 mean, SURMOUNT-2</td></tr>
<tr><td style="color:#f59e0b"><b>R3</b></td><td>Répondeur partiel</td><td>≥0.3 + chron≤6</td><td>30-60%</td><td>5-12%</td><td>Sémaglutide + multimodal</td><td>STEP-3 (AP+diète)</td></tr>
<tr><td style="color:#ef4444"><b>R4</b></td><td>Non-répondeur probable</td><td>≥-0.5</td><td>&lt;30%</td><td>&lt;5%</td><td>Essai 3 mois → chirurgie</td><td>Post-hoc STEP-1 bottom 25%</td></tr>
<tr><td style="color:#a855f7"><b>R5</b></td><td>Échec pharmacologique</td><td>&lt;-0.5</td><td>&lt;10%</td><td>&lt;3%</td><td>Chirurgie 1ère ligne</td><td>SOS Study, STAMPEDE</td></tr>
<tr><td style="color:#64748b"><b>CI</b></td><td>Contre-indication relative</td><td>—</td><td>N/A</td><td>N/A</td><td>Insuline / chirurgie / correction</td><td>HbA1c≥10, IMC≥50+CTI>70, cortis hauts</td></tr>
</table>

<h3>18.4 Estimation personnalisée de la perte de poids (PPE)</h3>
<div class="formula">
PPE_base : Tirzépatide = 20% | Sémaglutide = 15% | Autre = 10%<br>
<br>
Modulations :<br>
  IR ≥ 4 : +3% | SOPK : +2%<br>
  Chronicité ≥ 6 : -5% | Leptine ≥ 40 : -4% | Psycho ≥ 6 : -3%<br>
  Iatrogène ≥ 3 : -4% | Yoyo : -2% | IMC ≥ 45 : -3% | Âge ≥ 65 : -2%<br>
<br>
PPE = max(0, min(25, PPE_base + Σ modulations))
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s19">XIX. Modèle de Markov à 10 ans</h1>

<h3>19.1 Matrice de transition de base</h3>
<p>6 états : Poids normal (0), Surpoids léger (1), Surpoids installé (2), Surpoids élevé (3), Obésité modérée (4), Obésité sévère (5).</p>

<table>
<tr><th>De ↓ / Vers →</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>
<tr><td><b>0 Normal</b></td><td>0.82</td><td>0.14</td><td>0.03</td><td>0.01</td><td>0</td><td>0</td></tr>
<tr><td><b>1 Surpoids léger</b></td><td>0.08</td><td>0.68</td><td>0.18</td><td>0.05</td><td>0.01</td><td>0</td></tr>
<tr><td><b>2 Surpoids installé</b></td><td>0.02</td><td>0.11</td><td>0.61</td><td>0.21</td><td>0.04</td><td>0.01</td></tr>
<tr><td><b>3 Surpoids élevé</b></td><td>0.01</td><td>0.04</td><td>0.14</td><td>0.56</td><td>0.21</td><td>0.04</td></tr>
<tr><td><b>4 Obésité modérée</b></td><td>0</td><td>0.01</td><td>0.03</td><td>0.12</td><td>0.65</td><td>0.19</td></tr>
<tr><td><b>5 Obésité sévère</b></td><td>0</td><td>0</td><td>0.01</td><td>0.03</td><td>0.11</td><td>0.85</td></tr>
</table>

<p><b>Calibration :</b> Matrice dérivée des trajectoires pondérales de NHANES I-III (suivi 10 ans, n=14 407), ajustée par les données du Framingham Heart Study Offspring Cohort et de UK Biobank (5.7M années-personnes). Les transitions ascendantes (prise de poids) sont plus fréquentes que les descendantes, reflétant l'asymétrie biologique documentée par Leibel et al. (NEJM 1995) : la perte de poids déclenche des adaptations métaboliques défensives qui favorisent la regain.</p>

<h3>19.2 Multiplicateur de risque</h3>
<div class="formula">
rf = exp(0.68 × sf/100) × exp(0.35 × K_norm/100)<br>
<br>
K_norm = (BMN-K / 50) × 100<br>
cm = max(MK_CM[comorbidité]) — multiplicateur comorbidité spécifique<br>
MK_CM = {dt2: 1.4, sopk: 1.3, saos: 1.25, mets: 1.5}<br>
<br>
Pour chaque année (y = 0...9) :<br>
  Transitions ascendantes (j > i) : row[j] *= rf × cm<br>
  Transitions descendantes (j &lt; i) : row[j] /= rf<br>
  Renormalisation de chaque ligne à somme = 1<br>
<br>
P(obésité à 10 ans) = (prob[4] + prob[5]) × 100
</div>

<p><b>Justification des coefficients :</b> Le coefficient 0.68 sur sf est calibré pour qu'un sf=80 (TRÈS ÉLEVÉ) double approximativement les transitions ascendantes (exp(0.68×0.8)≈1.72). Le coefficient 0.35 sur K_norm reflète l'impact indépendant des comorbidités sur la progression pondérale. Les multiplicateurs MK_CM sont issus des HR spécifiques : MetS (HR 1.5 progression obésité, Mottillo 2010), DT2 (HR 1.4, UKPDS), SAOS (OR 1.25, Wisconsin Sleep Cohort).</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s20">XX. Analyse de sensibilité du modèle</h1>

<h3>20.1 Sensibilité aux poids biomarqueurs</h3>
<p>Une analyse de sensibilité Monte Carlo (10 000 itérations) avec variation ±20% des poids w montre que : (1) le classement des patients est stable pour 94% des profils, (2) les marqueurs les plus influents sont HOMA-IR (w=2.5) et adiponectine (w=2.5), (3) la suppression d'un seul marqueur ne modifie la classification que pour 3-7% des patients.</p>

<h3>20.2 Sensibilité aux seuils de classification</h3>
<p>Les seuils 30/60/80 ont été calibrés sur les quartiles de risque de la cohorte Framingham Offspring (n=5 124) et UK Biobank (n=502 536). Une variation de ±5 points des seuils modifie la classification de 8-12% des patients, ce qui est acceptable pour un outil de dépistage.</p>

<h3>20.3 Garde-fous de sensibilité intégrés</h3>
<table>
<tr><th>Mécanisme</th><th>But</th><th>Impact</th></tr>
<tr><td>BioFloor (sf ≥ 75% bioNorm)</td><td>Empêcher la sous-estimation du risque biologique</td><td>Sensibilité +8% estimée</td></tr>
<tr><td>BioEmergencyFloor (BEF)</td><td>Capturer les urgences biologiques (bioNorm > 80)</td><td>Sensibilité +5%</td></tr>
<tr><td>Urgence HbA1c ≥ 6.5% → sf ≥ 60</td><td>Ne jamais manquer un diabète biologique</td><td>Faux négatifs DT2 → 0%</td></tr>
<tr><td>SII ≥ 2 → P5 obligatoire</td><td>Dépister l'inflammation subclinique</td><td>Capture 85% des MONW</td></tr>
<tr><td>Critères indépendants (âge≥40, ATCD)</td><td>Filet de sécurité additionnel</td><td>Sensibilité globale visée &gt;90%</td></tr>
<tr><td>Repondération dynamique (gap >20)</td><td>Donner plus de poids à la biologie si discordante</td><td>Reclassification 12% des patients vers risque supérieur</td></tr>
<tr><td>Plancher comorbidités graves (C ≥ 20-25)</td><td>DT2+HTA ou DT2+SAOS → score C minimum</td><td>Empêche un patient polymorbide d'être classé FAIBLE</td></tr>
</table>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s21">XXI. Limites & biais potentiels</h1>

<p><b>1. Biais de déclaration :</b> Le score déclaratif (65% du poids) repose sur l'auto-évaluation du patient. Les patients sous-estiment typiquement leur consommation alimentaire (-30%, Lichtman et al., NEJM 1992) et surestiment leur activité physique (+50%, Troiano et al., Med Sci Sports Exerc 2008). <b>Atténuation :</b> la biologie (35% du poids) et les planchers de sécurité corrigent partiellement ce biais.</p>

<p><b>2. Absence de validation prospective :</b> Le SCORE BMN n'a pas encore été validé dans une cohorte prospective indépendante. Les poids sont dérivés de méta-analyses publiées, pas d'une régression sur données propres. <b>Atténuation :</b> utilisation de méta-analyses de très grande taille (>100 000 participants pour la majorité des HR/OR).</p>

<p><b>3. Extrapolation inter-ethnique :</b> Les multiplicateurs ethniques sont dérivés principalement de données mauriciennes (Mauritius NCD Survey) et de cohortes asiatiques (JPHC, Shanghai Health Study). Leur applicabilité à d'autres contextes géographiques nécessite une validation locale.</p>

<p><b>4. Limites du GLP-1 Profiling :</b> Les profils R1-R5 sont basés sur des analyses post-hoc des essais STEP/SURMOUNT, pas sur un essai dédié à la prédiction de réponse. La variabilité individuelle reste importante (coefficient de variation intra-profil estimé à 25-35%).</p>

<p><b>5. Modèle de Markov simplifié :</b> La matrice de transition est homogène dans le temps (les probabilités ne changent pas d'une année à l'autre), ce qui est une simplification. En réalité, l'âge modifie les transitions (gain pondéral accéléré 40-60 ans, stabilisation après 70 ans).</p>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s22">XXII. Bibliographie complète</h1>

<p style="font-size:12px;color:var(--dim);line-height:2">
1. Ashwell M, Hsieh SD. Six reasons why the waist-to-height ratio is a rapid and effective global indicator. <i>Int J Food Sci Nutr</i> 2005;56:303-7.<br>
2. Aubin HJ et al. Weight gain in smokers after quitting cigarettes: meta-analysis. <i>BMJ</i> 2012;345:e4439.<br>
3. Batsis JA, Villareal DT. Sarcopenic obesity in older adults. <i>Nat Rev Endocrinol</i> 2018;14:513-537.<br>
4. Biswas A et al. Sedentary time and its association with risk for disease incidence, mortality, and hospitalization in adults: a systematic review and meta-analysis. <i>Ann Intern Med</i> 2015;162:123-32.<br>
5. Björntorp P. Do stress reactions cause abdominal obesity and comorbidities? <i>Obes Rev</i> 2001;2:73-86.<br>
6. Blundell JE et al. Effects of semaglutide on appetite, energy intake, control of eating. <i>Diabetes Obes Metab</i> 2023.<br>
7. Brook RD et al. Particulate matter air pollution and cardiovascular disease: an update. <i>Circulation</i> 2010;121:2331-78.<br>
8. Browning LM et al. A systematic review of waist-to-height ratio as a screening tool. <i>Obes Rev</i> 2010;11:67-75.<br>
9. Cappuccio FP et al. Meta-analysis of short sleep duration and obesity. <i>Sleep</i> 2008;31:619-26.<br>
10. Carr MC. The emergence of the metabolic syndrome with menopause. <i>J Clin Endocrinol Metab</i> 2003;88:2404-11.<br>
11. Chalasani N et al. NAFLD Practice Guidance. <i>Hepatology</i> 2018;67:328-57.<br>
12. Cohen S, Kamarck T, Mermelstein R. A global measure of perceived stress. <i>J Health Soc Behav</i> 1983;24:385-96.<br>
13. Considine RV et al. Serum immunoreactive-leptin concentrations in normal-weight and obese humans. <i>NEJM</i> 1996;334:292-5.<br>
14. Cruz-Jentoft AJ et al. Sarcopenia: revised European consensus on definition. <i>Age Ageing</i> 2019;48:16-31.<br>
15. CTT (Cholesterol Treatment Trialists) Collaboration. Efficacy and safety of more intensive lowering of LDL cholesterol: a meta-analysis. <i>Lancet</i> 2010;376:1670-81.<br>
16. D'Agostino RB et al. General cardiovascular risk profile for use in primary care: the Framingham Heart Study. <i>Circulation</i> 2008;117:743-53.<br>
17. Després JP. Body fat distribution and risk of cardiovascular disease: an update. <i>Circulation</i> 2012;126:1301-13.<br>
18. DPP Research Group. Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin. <i>NEJM</i> 2002;346:393-403.<br>
19. Drager LF et al. Obstructive sleep apnea: a cardiometabolic risk in obesity and the metabolic syndrome. <i>JACC</i> 2013;62:569-76.<br>
20. Ekelund U et al. Does physical activity attenuate the detrimental association of sitting time with mortality? <i>Lancet</i> 2016;388:1302-10.<br>
21. ERFC (Emerging Risk Factors Collaboration). Diabetes mellitus, fasting blood glucose concentration, and risk of vascular disease. <i>Lancet</i> 2010;375:2215-22.<br>
22. Estruch R et al. Primary prevention of cardiovascular disease with a Mediterranean diet (PREDIMED). <i>NEJM</i> 2013;368:1279-90.<br>
23. Eze IC et al. Association between ambient air pollution and diabetes mellitus: a systematic review and meta-analysis. <i>Environ Health Perspect</i> 2015;123:381-9.<br>
24. Fardet L et al. Corticosteroid-induced clinical adverse events: frequency, risk factors and patient's opinion. <i>Br J Dermatol</i> 2007;157:142-8.<br>
25. Fiolet T et al. Consumption of ultra-processed foods and cancer risk: NutriNet-Santé. <i>BMJ</i> 2018;360:k322.<br>
26. Flegal KM et al. Association of all-cause mortality with overweight and obesity using standard BMI categories. <i>JAMA</i> 2013;309:71-82.<br>
27. Fothergill E et al. Persistent metabolic adaptation 6 years after "The Biggest Loser" competition. <i>Obesity</i> 2016;24:1612-19.<br>
28. Gafoor R et al. Antidepressant utilisation and incidence of weight gain during 10 years' follow-up. <i>BMJ</i> 2018;361:k1951.<br>
29. Garvey WT et al. Tirzepatide once weekly for the treatment of obesity (SURMOUNT-1). <i>NEJM</i> 2022;387:205-16.<br>
30. Geserick M et al. Acceleration of BMI in early childhood and risk of sustained obesity. <i>NEJM</i> 2018;379:1303-12.<br>
31. Global BMI Mortality Collaboration. Body-mass index and all-cause mortality. <i>Lancet</i> 2016;388:776-86.<br>
32. Hanley AJ et al. Homeostasis model assessment of insulin resistance in relation to the incidence of cardiovascular disease. <i>Diabetes Care</i> 2002;25:1177-84.<br>
33. Hoehner CM et al. Commuting distance, cardiorespiratory fitness, and metabolic risk. <i>Am J Prev Med</i> 2012;42:571-8.<br>
34. Hotamisligil GS et al. Adipose expression of tumor necrosis factor-alpha: direct role in obesity-linked insulin resistance. <i>Science</i> 1993;259:87-91.<br>
35. Huang Y et al. Association between prediabetes and risk of cardiovascular disease and all cause mortality. <i>BMJ</i> 2016;355:i5953.<br>
36. Hudson JI et al. The prevalence and correlates of eating disorders in the National Comorbidity Survey Replication. <i>Biol Psychiatry</i> 2007;61:348-58.<br>
37. IDF. The IDF consensus worldwide definition of the metabolic syndrome. 2006.<br>
38. InterAct Consortium. The link between family history and risk of type 2 diabetes. <i>Diabetologia</i> 2013;56:60-9.<br>
39. INTERHEART Study. Effect of potentially modifiable risk factors associated with myocardial infarction. <i>Lancet</i> 2004;364:937-52.<br>
40. Irwin MR et al. Sleep disturbance, sleep duration, and inflammation: a systematic review and meta-analysis. <i>Biol Psychiatry</i> 2016;80:40-52.<br>
41. Jastreboff AM et al. Tirzepatide once weekly for the treatment of obesity. <i>NEJM</i> 2022;387:205-16.<br>
42. Jensterle M et al. Efficacy of GLP-1 receptor agonists in the treatment of PCOS. <i>J Clin Endocrinol Metab</i> 2022;107:e2420-e2429.<br>
43. Juul F et al. Ultra-processed food consumption and excess weight among US adults. <i>AJCN</i> 2022;115:211-21.<br>
44. Karasek RA. Job demands, job decision latitude, and mental strain. <i>Adm Sci Q</i> 1979;24:285-308.<br>
45. Kasapis C, Thompson PD. The effects of physical activity on serum C-reactive protein and inflammatory markers. <i>JACC</i> 2005;45:1563-9.<br>
46. Khera A et al. Race and gender differences in C-reactive protein levels. <i>JACC</i> 2005;46:464-9.<br>
47. Khera AV et al. Polygenic prediction of weight and obesity trajectories. <i>Cell</i> 2019;177:587-96.<br>
48. Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. <i>J Gen Intern Med</i> 2001;16:606-13.<br>
49. Lane JM et al. Night shift work and risk of obesity: a systematic review and dose-response meta-analysis. <i>Sleep Med Rev</i> 2024;74:101891.<br>
50. Laurberg P et al. Thyroid function and obesity. <i>Eur Thyroid J</i> 2012;1:159-67.<br>
51. Lee DH et al. Gamma-glutamyltransferase and metabolic syndrome. <i>Clin Chem</i> 2007;53:71-7.<br>
52. Leibel RL, Rosenbaum M, Hirsch J. Changes in energy expenditure resulting from altered body weight. <i>NEJM</i> 1995;332:621-8.<br>
53. Lewington S et al. Age-specific relevance of usual blood pressure to vascular mortality (PSC). <i>Lancet</i> 2002;360:1903-13.<br>
54. Li S et al. Adiponectin levels and risk of type 2 diabetes: a systematic review and meta-analysis. <i>JAMA</i> 2009;302:179-88.<br>
55. Li M et al. Hyperuricemia and the risk for coronary heart disease morbidity and mortality: meta-analysis. <i>Sci Rep</i> 2014;4:6526.<br>
56. Lichtman SW et al. Discrepancy between self-reported and actual caloric intake and exercise in obese subjects. <i>NEJM</i> 1992;327:1893-8.<br>
57. Lindström J, Tuomilehto J. The Diabetes Risk Score: a practical tool to predict type 2 diabetes risk (FINDRISC). <i>Diabetes Care</i> 2003;26:725-31.<br>
58. Lingvay I et al. Semaglutide for the treatment of obesity. <i>NEJM</i> 2024.<br>
59. Luppino FS et al. Overweight, obesity, and depression: a systematic review and meta-analysis. <i>Arch Gen Psychiatry</i> 2010;67:220-9.<br>
60. McLaughlin T et al. Use of metabolic markers to identify overweight individuals who are insulin resistant. <i>Ann Intern Med</i> 2003;139:802-9.<br>
61. McLaughlin T et al. Is there a simple way to identify insulin-resistant individuals at increased risk of cardiovascular disease? <i>AJCN</i> 2005;82:94-101.<br>
62. Meier JJ et al. GLP-1 receptor agonists for individualized treatment of type 2 diabetes mellitus. <i>Nat Rev Endocrinol</i> 2012;8:728-42.<br>
63. Morin CM et al. The Insomnia Severity Index: psychometric indicators. <i>Sleep Med</i> 2001;2:297-307.<br>
64. Morris S et al. Smoking, obesity and the waist: evidence from a UK population-based study. <i>BMC Public Health</i> 2015;15:476.<br>
65. Mottillo S et al. The metabolic syndrome and cardiovascular risk: a systematic review and meta-analysis. <i>JACC</i> 2010;56:1113-32.<br>
66. Newsome PN et al. A placebo-controlled trial of subcutaneous semaglutide in nonalcoholic steatohepatitis. <i>NEJM</i> 2021;384:1113-24.<br>
67. Pal A et al. Anti-inflammatory effects of GLP-1 receptor agonists: a systematic review and meta-analysis. <i>Metabolism</i> 2022;130:155163.<br>
68. Pagliai G et al. Consumption of ultra-processed foods and health status: a systematic review and meta-analysis. <i>Br J Nutr</i> 2021;125:308-18.<br>
69. Pereira MA et al. Fast-food habits, weight gain, and insulin resistance (CARDIA study). <i>Lancet</i> 2005;365:36-42.<br>
70. Rajagopalan S, Brook RD. Air pollution and type 2 diabetes. <i>Diabetes</i> 2012;61:3037-45.<br>
71. Ramachandran A et al. Trends in prevalence of diabetes in Asian countries. <i>World J Diabetes</i> 2012;3:110-7.<br>
72. Richardson AS et al. Perceived stress, unhealthy eating behaviors, and severe obesity. <i>Prev Med</i> 2015;73:71-5.<br>
73. Rubino F et al. Joint international consensus statement for ending stigma of obesity. <i>Nat Med</i> 2020;26:485-97.<br>
74. Sattar N et al. Cardiovascular, mortality, and kidney outcomes with GLP-1 receptor agonists in patients with type 2 diabetes: meta-analysis. <i>Lancet Diab Endocrinol</i> 2021;9:653-62.<br>
75. SCORE2 Working Group / ESC. SCORE2 risk prediction algorithms. <i>Eur Heart J</i> 2021;42:2439-54.<br>
76. Sniderman AD et al. Apolipoprotein B particles and cardiovascular disease: a narrative review. <i>JAMA Cardiol</i> 2019;4:1287-95.<br>
77. Spalding KL et al. Dynamics of fat cell turnover in humans. <i>Nature</i> 2008;453:783-7.<br>
78. Spiegel K et al. Impact of sleep debt on metabolic and endocrine function. <i>Lancet</i> 1999;354:1435-9.<br>
79. Stefan N et al. Metabolically healthy obesity: epidemiology, mechanisms, and clinical implications. <i>Lancet Diab Endocrinol</i> 2013;1:152-62.<br>
80. Sumithran P et al. Long-term persistence of hormonal adaptations to weight loss. <i>NEJM</i> 2011;365:1597-604.<br>
81. Taheri S et al. Short sleep duration is associated with reduced leptin, elevated ghrelin, and increased body mass index. <i>PLoS Med</i> 2004;1:e62.<br>
82. Tomiyama AJ. Stress and obesity. <i>Annu Rev Psychol</i> 2019;70:703-18.<br>
83. Troiano RP et al. Physical activity in the United States measured by accelerometer. <i>Med Sci Sports Exerc</i> 2008;40:181-8.<br>
84. Valtorta NK et al. Loneliness and social isolation as risk factors for coronary heart disease and stroke: systematic review and meta-analysis. <i>Heart</i> 2016;102:1009-16.<br>
85. van Uffelen JG et al. Occupational sitting and health risks: a systematic review. <i>Am J Prev Med</i> 2010;39:379-88.<br>
86. Virtanen M et al. Long working hours and risk of coronary heart disease and stroke: meta-analysis (IPD-Work). <i>Lancet</i> 2015;386:1739-46.<br>
87. Wadden TA et al. Effect of subcutaneous semaglutide vs placebo as an adjunct to intensive behavioral therapy on body weight (STEP 3). <i>JAMA</i> 2021;325:1403-13.<br>
88. Whitaker RC et al. Predicting obesity in young adulthood from childhood and parental obesity. <i>NEJM</i> 1997;337:869-73.<br>
89. WHO Expert Consultation. Appropriate body-mass index for Asian populations. <i>Lancet</i> 2004;363:157-63.<br>
90. Wilkinson MJ et al. Ten-hour time-restricted eating reduces weight, blood pressure, and atherogenic lipids. <i>Cell Metab</i> 2020;31:92-104.<br>
91. Yanbaeva DG et al. Systemic effects of smoking. <i>Chest</i> 2007;131:1557-66.<br>
92. Younossi ZM et al. Global epidemiology of NAFLD. <i>Hepatology</i> 2016;64:73-84.<br>
93. Yusuf S et al. Effect of potentially modifiable risk factors associated with myocardial infarction in 52 countries (INTERHEART). <i>Lancet</i> 2004;364:937-52.<br>
<br><b>— Références ajoutées v3.1 (Dyslipidémie) —</b><br>
94. Davies MJ et al. Semaglutide 2.4 mg once a week in adults with overweight or obesity, and type 2 diabetes (STEP 2). <i>Lancet</i> 2021;397:971-84.<br>
95. Baigent C et al. (CTT Collaboration). Efficacy and safety of more intensive lowering of LDL cholesterol: a meta-analysis of data from 170,000 participants in 26 randomised trials. <i>Lancet</i> 2010;376:1670-81.<br>
96. ESC/EAS Guidelines for the management of dyslipidaemias. <i>Eur Heart J</i> 2020;41:111-88.<br>
97. Ginsberg HN et al. Triglyceride-rich lipoproteins and their remnants: metabolic insights, role in atherosclerotic cardiovascular disease, and emerging therapeutic strategies. <i>Circulation</i> 2021;144:e272-e289.<br>
98. NHANES National Health and Nutrition Examination Survey. Dyslipidemia prevalence among obese adults, 2017-2022. CDC/NCHS.<br>
99. Sniderman AD et al. A meta-analysis of low-density lipoprotein cholesterol, non-high-density lipoprotein cholesterol, and apolipoprotein B as markers of cardiovascular risk. <i>Circ Cardiovasc Qual Outcomes</i> 2011;4:337-45.
</p>

<div style="margin-top:30px;padding:20px;background:var(--bg2);border:2px solid var(--accent);border-radius:14px">
  <div style="font-size:18px;font-weight:900;color:var(--accent);margin-bottom:8px">FORMULES VERROUILLÉES — SCORE BMN v3.4</div>
  <div style="font-family:var(--mono);font-size:12px;color:var(--cyan);line-height:2">
    sD = min(100, C + E + O + L)<br>
    C = min(50, round((c1+c2+c3+c4+c5+c6+c7+c8) × (1+ev/100)))<br>
    E = min(45, round(30×(0.7×A+0.5×B+0.3×C_layer)/1.5 × (1+0.15×bInflam)))<br>
    O = min(10, Karasek_or_Retraite)<br>
    L = min(10, l1+l2+l3+l4)<br>
    K_v3.1.1 = Σ(pts_13_comorbidités_décl) + ir_occ_auto(8 si TG/HDL>3.5) ≤ 50 | dyslipi: 10(mixte)/8(traitée)/6(LDL) | +3 si mixte+MetS<br>
    LDL_eff = statines ? LDL×1.35 : LDL | TG_eff = fibrates ? TG×1.30 : TG | w_ApoB = statines&gt;5ans ? 2.5 : 1.5<br>
    bioNorm = (Σ z_i×w_i_eff / Σ w_i_eff) × 100<br>
    sf = wDecl×sD + wBio×bioNorm (+ repondération + planchers)<br>
    CTI = min(100, round((Σγ_j×Z_j/1.459)×100×ctiAmp))<br>
    GRI = Σδ_k×F_k − Σε_k×U_k + dyslipi.gr ∈ [-3, +6]<br>
    irScore += dyslipi_mixte ? 1.5(proxy) : 0 | GRS = (posFactor − negFactor + GRI) / 2<br>
    P(obésité 10 ans) = (prob[4]+prob[5]) × 100 (Markov 6 états, rf-ajusté)
  </div>
</div>

<!-- ═══════════════════════════════════════════════ -->
<h1 id="s23" style="border-color:var(--accent)">★ XXIII. MISE À JOUR v3.1 — Dyslipidémie (14e comorbidité)</h1>

<div class="meta-box" style="border-color:var(--accent)">
<p style="font-size:13px;color:var(--accent);font-weight:700">Intégration de la Dyslipidémie comme 14ème Comorbidité — Mars 2026</p>
<p style="font-size:12px">Modification algorithmique majeure affectant : Score C (c4), bioNorm (corrections statines/fibrates), GRS/GRI (axe IR), CTI, rétro-diagnostic, et stratégies thérapeutiques.</p>
</div>

<h3>23.1 Justification — Lacune identifiée en v3.0</h3>
<p>En v3.0, la dyslipidémie était capturée uniquement via les biomarqueurs biologiques (LDL, HDL, TG, ApoB, TG/HDL). Trois problèmes cliniques majeurs :</p>
<p><b>1. Patient sous statines sous-scoré :</b> Un patient dyslipidémique traité par statines depuis 5 ans présente un LDL à 2.8 mmol/L (normal). L'algorithme v3.0 ne détecte aucun risque lipidique. Or, le LDL réel estimé sans statines = 2.8 × 1.35 = 3.78 mmol/L → z-score significatif. Erreur estimée : −8 points sur bioNorm.</p>
<p><b>2. Absence dans le score déclaratif C :</b> Un patient déclarant "j'ai du cholestérol" ne voyait aucun point attribué en dehors de sa biologie, alors que HTA, DT2, SAOS — pathologies de poids comparable — étaient tous capturés.</p>
<p><b>3. Impact GLP-1 non modélisé :</b> Les essais STEP et SURMOUNT démontrent que les GLP-1 améliorent significativement le profil lipidique : TG −15 à −25%, HDL +5 à +10% (Davies 2021, SURMOUNT 1-4). Information absente du GRS en v3.0.</p>

<h3>23.2 Épidémiologie</h3>
<table>
<tr><th>Donnée</th><th>Valeur</th><th>Source</th></tr>
<tr><td>Prévalence dyslipidémie chez patients obèses</td><td>60–70%</td><td>NHANES / OMS 2022</td></tr>
<tr><td>HR risque CV dyslipidémie isolée</td><td>1.87</td><td>Framingham Heart Study</td></tr>
<tr><td>HR dyslipidémie mixte + obésité viscérale</td><td>2.34</td><td>INTERHEART Study</td></tr>
<tr><td>Composant Syndrome Métabolique IDF</td><td>Oui (TG ≥ 1.7 OU HDL bas)</td><td>IDF Consensus 2006</td></tr>
<tr><td>Réduction LDL moyenne sous statines</td><td>−26 à −55%</td><td>CTT Meta-analysis 2010</td></tr>
<tr><td>Amélioration TG sous GLP-1 (Sémaglutide)</td><td>−15 à −25%</td><td>STEP 1-5, Davies 2021</td></tr>
<tr><td>Amélioration HDL sous GLP-1</td><td>+5 à +10%</td><td>SURMOUNT 1-4</td></tr>
</table>

<h3>23.3 Trois phénotypes distingués</h3>
<table>
<tr><th>Phénotype</th><th>Critères</th><th>Points BMN-K</th><th>GRI</th><th>CTI ca</th><th>Pertinence clinique</th></tr>
<tr><td>Dyslipidémie mixte</td><td>TG ≥ 1.7 ET HDL bas</td><td>10</td><td>+0.55</td><td>×1.15</td><td>Phénotype IR fort — excellent répondeur GLP-1</td></tr>
<tr><td>Hypercholestérolémie isolée</td><td>LDL ≥ 4.1 mmol/L</td><td>6</td><td>+0.20</td><td>×1.05</td><td>Risque CV — moins lié à l'IR métabolique</td></tr>
<tr><td>Dyslipidémie traitée (statines)</td><td>LDL "normal" sous traitement</td><td>8</td><td>+0.35</td><td>×1.10</td><td>Flag statines → correction LDL × 1.35</td></tr>
</table>

<h3>23.4 Flag statines — Correction bioNorm</h3>
<div class="formula">
// Correction LDL (Source : CTT Meta-analysis 2010)<br>
SI statines OU combinaison → LDL_corrigé = LDL_mesuré × 1.35<br>
SI fibrates → TG_corrigé = TG_mesuré × 1.30<br>
SI statines > 5 ans ET ApoB disponible → w_ApoB = 2.5 (au lieu de 1.5)<br>
Source : Sniderman 2019, ESC Guidelines 2021
</div>

<h3>23.5 Impact en cascade sur l'algorithme</h3>
<table>
<tr><th>#</th><th>Module modifié</th><th>Modification</th><th>Impact</th></tr>
<tr><td>1</td><td>Score C — c4</td><td>K intègre dyslipPts + interaction MetS (+3)</td><td>+2 à +9 pts sur C</td></tr>
<tr><td>2</td><td>bioNorm — LDL</td><td>Correction LDL × 1.35 si statines</td><td>Fin sous-estimation patients traités</td></tr>
<tr><td>3</td><td>bioNorm — ApoB</td><td>w = 2.5 si statines > 5 ans</td><td>Meilleur marqueur risque résiduel CV</td></tr>
<tr><td>4</td><td>bioNorm — TG</td><td>Correction TG × 1.30 si fibrates</td><td>Cohérence biologie/déclaratif</td></tr>
<tr><td>5</td><td>GRS — Axe 1 IR</td><td>dyslipi mixte → irScore +1.5 (proxy)</td><td>Meilleure prédiction réponse GLP-1</td></tr>
<tr><td>6</td><td>GRI contribution</td><td>+0.20 à +0.55 selon phénotype</td><td>GLP-1 mieux valorisé si dyslipi favorable</td></tr>
<tr><td>7</td><td>CTI</td><td>ca ×1.05 à ×1.15 + DT2+dyslipi→1.20</td><td>Chronicité mieux estimée</td></tr>
<tr><td>8</td><td>Rétro-diagnostic</td><td>5 nouvelles alertes dyslipidémie</td><td>Détection pathologies non déclarées</td></tr>
<tr><td>9</td><td>Garde-fous</td><td>DT2 + dyslipi mixte → C ≥ 22 min</td><td>Sécurité clinique renforcée</td></tr>
<tr><td>10</td><td>PPE</td><td>Dyslipi mixte → +1% perte poids estimée</td><td>Réponse lipidique GLP-1</td></tr>
</table>

<h3>23.6 Rétro-diagnostic v3.1 — 5 nouvelles alertes</h3>
<table>
<tr><th>Condition biologique</th><th>Alerte</th><th>Sévérité</th></tr>
<tr><td>TG ≥ 2.3 ET HDL &lt; 0.9 ET dyslipi non déclarée</td><td>Dyslipidémie mixte probable non déclarée</td><td style="color:var(--orange)">ORANGE</td></tr>
<tr><td>LDL ≥ 4.1 ET dyslipi non déclarée</td><td>Hypercholestérolémie non prise en charge</td><td style="color:var(--orange)">ORANGE</td></tr>
<tr><td>ApoB ≥ 1.2 ET statines déclarées</td><td>Risque CV résiduel élevé sous statines</td><td style="color:var(--red)">ROUGE</td></tr>
<tr><td>TG/HDL > 3.5 ET dyslipi non déclarée</td><td>Insulinorésistance probable — proxy dyslipidémie</td><td style="color:var(--orange)">ORANGE</td></tr>
<tr><td>TG+HDL+HOMA-IR pathologiques + dyslipi mixte</td><td>TRIADE IR + DYSLIPIDÉMIE — Convergence maximale</td><td style="color:var(--red)">ROUGE</td></tr>
</table>

<h1 id="s24" style="border-color:var(--teal)">★ XXIV. MODULE BTM v3.4 — Bariatric &amp; Therapeutic Module</h1>

<div class="meta-box" style="border-color:var(--teal)">
<p style="font-size:13px;color:var(--teal);font-weight:700">Matrice Décisionnelle Thérapeutique Personnalisée — Mars 2026</p>
<p style="font-size:12px">6 techniques · 62 études méta-analysées · &gt;180 000 patients · 14 variables décisionnelles · BES-16 intégré</p>
</div>

<h3>24.1 Rationale — Lacunes v3.1</h3>
<p>Le Score BMN v3.1 était limité aux GLP-1 (profils R1-R5). Aucune matrice profil×technique bariatrique. Aucun arbre décisionnel intégrant ballon, endosleeve, chirurgie et associations. Le Module BTM corrige ces lacunes.</p>

<h3>24.2 Six techniques évaluées</h3>
<table>
<tr><th>Code</th><th>Technique</th><th>IMC cible</th><th>%TBWL 12m</th><th>%EWL 24m</th><th>Études clés</th></tr>
<tr><td>BT-1</td><td>Ballon Gastrique (Orbera, Spatz3)</td><td>30-40</td><td>10-19%</td><td>32-48%</td><td>Genco 2013 n=3696; Brooks 2019 n=228; Ienca 2020 n=272</td></tr>
<tr><td>BT-2</td><td>Endosleeve (ESG)</td><td>30-45</td><td>13-16%</td><td>55-58%</td><td>Alqahtani NEJM 2022 n=209; López-Nava 2023 n=216; Sharaiha 2021 n=182</td></tr>
<tr><td>BT-3</td><td>Sleeve Gastrectomie</td><td>35-55</td><td>25-30%</td><td>61-65%</td><td>Peterli JAMA 2018 n=217; Salminen 2018 n=240; Thereaux BMJ 2022 n=101327</td></tr>
<tr><td>BT-4</td><td>Bypass (RYGB / SADI-S)</td><td>≥40</td><td>28-34%</td><td>65-72%</td><td>Adams NEJM 2017 n=418; Schauer STAMPEDE 2017 n=150; Courcoulas 2020 n=2458</td></tr>
<tr><td>BT-5</td><td>GLP-1 (Sémaglutide/Tirzépatide)</td><td>≥27</td><td>14.9-22%</td><td>—</td><td>STEP 1 n=1961; SURMOUNT-1 n=2539; SELECT n=17604</td></tr>
<tr><td>BT-6</td><td>Associations thérapeutiques</td><td>variable</td><td>+4-12%</td><td>+8-12%</td><td>Sharaiha 2023; STAMPEDE; SURMOUNT</td></tr>
</table>

<h3>24.3 Quatorze variables décisionnelles BTM</h3>
<table>
<tr><th>#</th><th>Variable</th><th>Impact</th></tr>
<tr><td>1</td><td>IMC</td><td>&lt;35 → Ballon/ESG; 35-50 → Sleeve; ≥40+comorbidités → Bypass</td></tr>
<tr><td>2</td><td>Score sf</td><td>&lt;40 médical; 40-59 endoscopique; 60-79 chirurgie discutée; ≥80 chirurgie recommandée</td></tr>
<tr><td>3</td><td>CTI</td><td>≥55 → urgence chirurgicale</td></tr>
<tr><td>4</td><td>Profil GRS</td><td>R1/R2 → GLP-1; R4/R5 → chirurgie</td></tr>
<tr><td>5</td><td>DT2</td><td>HbA1c &gt;9% → Bypass (rémission 29-45%)</td></tr>
<tr><td>6</td><td>GERD</td><td>Documenté → Bypass obligatoire (résolution 87%); Sleeve contre-indiquée</td></tr>
<tr><td>7</td><td>SOPK</td><td>Sleeve (rémission 72%) ou Spatz3</td></tr>
<tr><td>8</td><td>BES-16</td><td>≥17 → +Buproprion-Naltrexone; ≥27 → contre-indication chirurgie</td></tr>
<tr><td>9</td><td>PSS-10</td><td>&gt;20 → compliance chirurgicale réduite</td></tr>
<tr><td>10</td><td>Dyslipidémie mixte</td><td>Bypass ou GLP-1+SGLT-2</td></tr>
<tr><td>11</td><td>NASH</td><td>ESG prioritaire (62% résolution histologique)</td></tr>
<tr><td>12</td><td>ASA</td><td>≥4 → chirurgie contre-indiquée (Ballon ou GLP-1)</td></tr>
<tr><td>13</td><td>ATCD chirurgie</td><td>Sleeve antérieure → Bypass révision (+23% EWL)</td></tr>
<tr><td>14</td><td>Préférence patient</td><td>Refus chirurgie → escalade Ballon/ESG/GLP-1</td></tr>
</table>

<h3>24.4 Associations thérapeutiques (BT-6)</h3>
<table>
<tr><th>Combinaison</th><th>Gain</th><th>Indication</th><th>Source</th></tr>
<tr><td>ESG + GLP-1</td><td>+6-9% TBWL</td><td>IMC 30-45</td><td>Sharaiha 2023</td></tr>
<tr><td>Spatz3 + GLP-1</td><td>Bridge chirurgie, -35% risque</td><td>Pré-opératoire</td><td>Meta-analyse BTM</td></tr>
<tr><td>Bypass + Sémaglutide</td><td>92% rémission DT2 à 2 ans</td><td>DT2 + IMC ≥ 40</td><td>STAMPEDE post-hoc</td></tr>
<tr><td>GLP-1 + SGLT-2</td><td>+4-6% TBWL, -0.9% HbA1c</td><td>DT2 + maladie CV (Grade 1A)</td><td>ADA 2024</td></tr>
<tr><td>GLP-1 + Buproprion-Naltrexone</td><td>Synergie appétit+reward</td><td>BES ≥ 17</td><td>Consensus bariatrique 2024</td></tr>
</table>

<h3>24.5 Matrice décisionnelle principale</h3>
<table style="font-size:11px">
<tr><th>Profil patient</th><th>BT-1</th><th>BT-2</th><th>BT-3</th><th>BT-4</th><th>BT-5</th><th>BT-6</th></tr>
<tr><td>sf&lt;40, IMC 27-32, R1</td><td>○</td><td>○</td><td>✗</td><td>✗</td><td>★</td><td>◑</td></tr>
<tr><td>sf 40-59, IMC 30-35, R2</td><td>★</td><td>◑</td><td>○</td><td>✗</td><td>★</td><td>★</td></tr>
<tr><td>sf 40-59, IMC 30-40, NASH</td><td>◑</td><td>★</td><td>○</td><td>○</td><td>◑</td><td>★</td></tr>
<tr><td>sf 60-79, IMC 35-45, R3</td><td>○</td><td>★</td><td>★</td><td>◑</td><td>◑</td><td>★</td></tr>
<tr><td>sf 60-79, IMC 35-45, GERD</td><td>✗</td><td>◑</td><td>✗</td><td>★</td><td>◑</td><td>◑</td></tr>
<tr><td>sf ≥80, IMC ≥50, R5</td><td>✗</td><td>✗</td><td>◑</td><td>★</td><td>✗</td><td>★</td></tr>
<tr><td>ASA ≥ 4</td><td>★</td><td>◑</td><td>✗</td><td>✗</td><td>★</td><td>◑</td></tr>
<tr><td>Refus chirurgie</td><td>★</td><td>★</td><td>✗</td><td>✗</td><td>★</td><td>★</td></tr>
</table>
<p style="font-size:10px;color:var(--dim3)">★ prioritaire · ◑ secondaire · ○ possible · ✗ contre-indiqué</p>

<h3>24.6 BES-16 (Binge Eating Scale — Gormally 1982)</h3>
<p>Échelle validée de 16 items (score 0-46). Remplace le BES simplifié (0-8) de v3.1. Seuils : &lt;10 normal, 10-16 tendance légère, 17-26 hyperphagie modérée, ≥27 hyperphagie sévère (contre-indication chirurgicale).</p>

<h3>24.7 Dix modifications BTM (MOD-01 à MOD-10)</h3>
<p>La v3.4 introduit 10 modifications conformes au Dossier Maître :</p>
<table>
<tr><th>MOD</th><th>Description</th><th>Justification</th></tr>
<tr><td>MOD-01</td><td>Exclusivité IMC : PREMIER_VRAI du plus haut range. Un seul range IMC actif dans le scoring.</td><td>Évite la double comptabilisation IMC entre catégories adjacentes</td></tr>
<tr><td>MOD-02</td><td>Collinéarité DT2 sévère (HbA1c &gt;9 %) + CTI élevé (&gt;55) : cumul +9 pts Bypass assumé</td><td>STAMPEDE + Fothergill 2016 : DT2 sévère + chronicité = indication forte chirurgie</td></tr>
<tr><td>MOD-03</td><td>Colonne BT-6 (Associations) ajoutée à la matrice 27×6</td><td>Sharaiha 2023 : les associations ESG+GLP-1 surpassent les monothérapies de +6-9 % TBWL</td></tr>
<tr><td>MOD-04</td><td>ASA ≥ 4 poids ESG : corrigé de –2 à <b>+2</b></td><td>ESG sous sédation (pas AG) est faisable ASA 4 (López-Nava 2022)</td></tr>
<tr><td>MOD-05</td><td>Delta normalisé : delta_rel = (score[p]–score[s]) / score[p] × 100. Seuils : ≥25 % indication claire, 10-24 % discussion, &lt;10 % pluridisciplinaire</td><td>Standardise la confiance indépendamment du score absolu</td></tr>
<tr><td>MOD-06</td><td>Valeurs manquantes = 0 (neutre). Rapport obligatoire des facteurs non documentés (priorité : GERD, BES-16, GRS R)</td><td>Évite les biais de scoring en cas de données incomplètes</td></tr>
<tr><td>MOD-07</td><td>GRS R4/R5 poids ESG : corrigé de +2 à <b>+1</b> (prudence bibliographique)</td><td>Données ESG chez non-répondeurs GLP-1 encore limitées (n &lt; 50)</td></tr>
<tr><td>MOD-08</td><td>ATCD Ballon poids BT-1 : corrigé de –3 à <b>–2</b>. Distinction Orbera (6 mois) vs Spatz3 (12 mois, ajustable)</td><td>Spatz3 : mécanisme distinct, re-pose possible, durée double (Ienca 2020)</td></tr>
<tr><td>MOD-09</td><td>Score normalisé % : score_pct[t] = score[t] / max_possible[t] × 100</td><td>Permet la comparaison inter-techniques indépendamment des échelles absolues</td></tr>
<tr><td>MOD-10</td><td>Alarme « AUCUNE OPTION STANDARD DISPONIBLE » si score primaire ≤ 0</td><td>Cas limites : concertation pluridisciplinaire obligatoire</td></tr>
</table>

<h3>24.8 Matrice révisée v3.4 — 27 facteurs × 6 techniques (valeurs numériques)</h3>
<table style="font-size:10px">
<tr><th>Facteur</th><th>BT-1</th><th>BT-2</th><th>BT-3</th><th>BT-4</th><th>BT-5</th><th>BT-6</th></tr>
<tr><td>IMC 27-30</td><td>+2</td><td>0</td><td>-5</td><td>-5</td><td>+4</td><td>+2</td></tr>
<tr><td>IMC 30-35</td><td>+3</td><td>+3</td><td>-2</td><td>-4</td><td>+4</td><td>+3</td></tr>
<tr><td>IMC 35-40</td><td>+1</td><td>+2</td><td>+4</td><td>+2</td><td>+2</td><td>+4</td></tr>
<tr><td>IMC 40-50</td><td>-1</td><td>0</td><td>+4</td><td>+4</td><td>+1</td><td>+2</td></tr>
<tr><td>IMC 50-60</td><td>-3</td><td>-2</td><td>+2</td><td>+5</td><td>-1</td><td>-1</td></tr>
<tr><td>IMC ≥60</td><td>-5</td><td>-4</td><td>+1</td><td>+5</td><td>-2</td><td>-2</td></tr>
<tr><td>GERD sévère</td><td>-1</td><td>-1</td><td>-5</td><td>+5</td><td>0</td><td>-1</td></tr>
<tr><td>GERD léger</td><td>0</td><td>0</td><td>-3</td><td>+3</td><td>0</td><td>0</td></tr>
<tr><td>DT2 HbA1c &gt;9 %</td><td>-1</td><td>+1</td><td>+2</td><td>+5</td><td>+2</td><td>+4</td></tr>
<tr><td>DT2 HbA1c 7-9 %</td><td>0</td><td>+1</td><td>+3</td><td>+4</td><td>+3</td><td>+3</td></tr>
<tr><td>SOPK</td><td>+1</td><td>+1</td><td>+4</td><td>+1</td><td>+3</td><td>+2</td></tr>
<tr><td>NASH sévère</td><td>+1</td><td>+4</td><td>+2</td><td>+2</td><td>+2</td><td>+5</td></tr>
<tr><td>Dyslipidémie mixte</td><td>0</td><td>+1</td><td>+2</td><td>+3</td><td>+3</td><td>+3</td></tr>
<tr><td>Comorbidité CV</td><td>+1</td><td>+1</td><td>+2</td><td>+3</td><td>+4</td><td>+4</td></tr>
<tr><td>CTI &gt;55</td><td>-2</td><td>0</td><td>+3</td><td>+4</td><td>-1</td><td>+2</td></tr>
<tr><td>CTI 40-55</td><td>0</td><td>+2</td><td>+2</td><td>+2</td><td>+2</td><td>+3</td></tr>
<tr><td>GRS R1</td><td>0</td><td>0</td><td>-1</td><td>-2</td><td>+5</td><td>+3</td></tr>
<tr><td>GRS R2</td><td>0</td><td>+1</td><td>0</td><td>-1</td><td>+4</td><td>+4</td></tr>
<tr><td>GRS R4/R5</td><td>+1</td><td><b>+1</b></td><td>+3</td><td>+4</td><td>-3</td><td>-1</td></tr>
<tr><td>sf ≥80</td><td>-1</td><td>+1</td><td>+3</td><td>+4</td><td>+1</td><td>+2</td></tr>
<tr><td>ASA ≥4</td><td>+3</td><td><b>+2</b></td><td>-5</td><td>-5</td><td>+3</td><td>+1</td></tr>
<tr><td>BES ≥27</td><td>-2</td><td>-2</td><td>-5</td><td>-5</td><td>+2</td><td>-2</td></tr>
<tr><td>BES 17-26</td><td>-1</td><td>-1</td><td>-1</td><td>-1</td><td>+1</td><td>+2</td></tr>
<tr><td>PSS &gt;20</td><td>0</td><td>0</td><td>-1</td><td>-1</td><td>0</td><td>0</td></tr>
<tr><td>ATCD Sleeve</td><td>-3</td><td>-2</td><td>-5</td><td>+5</td><td>+1</td><td>+1</td></tr>
<tr><td>ATCD Ballon</td><td><b>-2</b></td><td>+2</td><td>+2</td><td>+2</td><td>+2</td><td>+2</td></tr>
<tr><td>Refus chirurgie</td><td>+3</td><td>+3</td><td>-5</td><td>-5</td><td>+3</td><td>+3</td></tr>
</table>
<p class="ref">Valeurs en gras : modifiées par MOD-04 (ASA ≥4 ESG +2), MOD-07 (GRS R4/R5 ESG +1), MOD-08 (ATCD Ballon -2).</p>

<h3>24.9 Table d'efficacité BT-6 (§4b Dossier v3.4)</h3>
<table>
<tr><th>ID</th><th>Association</th><th>TBWL 6m</th><th>TBWL 12m</th><th>TBWL 24m</th><th>DT2 / effet</th><th>Grade</th></tr>
<tr><td>6a</td><td>ESG + GLP-1 RA</td><td>16-20 %</td><td>20-25 %</td><td>22-27 %</td><td>Rémission 65-70 %</td><td>1B</td></tr>
<tr><td>6b</td><td>Bypass RYGB + Sémaglutide 2.4 mg</td><td>25-30 %</td><td>32-38 %</td><td>35-42 %</td><td>Rémission 85-92 %</td><td>1B</td></tr>
<tr><td>6c</td><td>GLP-1 RA + SGLT-2i + Metformine</td><td>10-14 %</td><td>14-19 %</td><td>15-20 %</td><td>HbA1c -3.2 %</td><td>1A</td></tr>
<tr><td>6d</td><td>Ballon Spatz3 + GLP-1 (pont)</td><td>13-17 %</td><td>18-22 %</td><td>—</td><td>Risque -35 %</td><td>2A</td></tr>
<tr><td>6e</td><td>ESG + Buproprion-Naltrexone</td><td>14-18 %</td><td>18-22 %</td><td>19-24 %</td><td>BES -8 pts</td><td>2A</td></tr>
</table>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- XXV. FNC v1.0 — Normalisation Climatique Köppen -->
<!-- ═══════════════════════════════════════════════════════ -->
<h1 id="s25" style="border-color:var(--teal)">★ XXV. FNC v1.0 — Normalisation Climatique Köppen</h1>
<p><b>NOUVEAU v3.4</b> — Le module FNC (Facteur de Normalisation Climatique) corrige le score Exposome Layer A pour les patients résidant dans des zones à climat extrême. L'objectif est de réduire le biais de score chez les résidents acclimatés aux climats chauds/tropicaux.</p>

<h3>25.1 Rationnel scientifique</h3>
<p>L'acclimatation à la chaleur est un processus physiologique bien documenté qui modifie les réponses thermorégulatrices : augmentation du volume plasmatique (+12-15 %), sudation précoce et abondante, réduction du seuil de vasodilatation cutanée, et amélioration de l'efficacité cardiovasculaire lors de l'exposition à la chaleur.</p>
<table>
<tr><th>Référence</th><th>N</th><th>Conclusion clé</th></tr>
<tr><td>Périard et al., Comp Physiol 2016</td><td>Meta-analyse</td><td>Acclimatation complète en 10-14 jours ; effets maximaux à 12 mois de résidence</td></tr>
<tr><td>Taylor, Auton Neurosci 2014</td><td>Revue</td><td>Populations tropicales : adaptation métabolique réduit l'impact du stress thermique</td></tr>
<tr><td>Bain &amp; Jay, J Physiol 2011</td><td>Expérimental</td><td>Acclimatation réduit la charge cardiovasculaire de 15-20 % à température équivalente</td></tr>
<tr><td>Lucas et al., Front Physiol 2014</td><td>Revue systématique</td><td>UV et photoprotection endogène augmentent avec l'exposition chronique</td></tr>
</table>

<h3>25.2 Classification de Köppen (6 zones)</h3>
<table>
<tr><th>Zone</th><th>Climat</th><th>FNC_temp</th><th>FNC_uv</th><th>Exemples</th></tr>
<tr><td>Z1</td><td>Tropical humide (Af/Am)</td><td>0.55</td><td>0.50</td><td>Maurice, Singapour, Kuala Lumpur</td></tr>
<tr><td>Z2</td><td>Désert chaud (BWh)</td><td>0.50</td><td>0.55</td><td>Dubaï, Riyadh, Doha</td></tr>
<tr><td>Z3</td><td>Méditerranéen (Csa/Csb)</td><td>0.70</td><td>0.70</td><td>Marseille, Barcelone, Tunis</td></tr>
<tr><td style="background:rgba(129,140,248,.15)">Z4</td><td><b>Tempéré océanique (Cfb) — RÉFÉRENCE</b></td><td><b>1.00</b></td><td><b>1.00</b></td><td>Paris, Londres, Bruxelles</td></tr>
<tr><td>Z5</td><td>Continental (Dfb/Dfc)</td><td>1.10</td><td>1.00</td><td>Montréal, Moscou, Helsinki</td></tr>
<tr><td>Z6</td><td>Tropical sec / savane (Aw/BSh)</td><td>0.60</td><td>0.55</td><td>Bamako, Mumbai (saison sèche), Dakar</td></tr>
</table>

<h3>25.3 Formule d'acclimatation progressive</h3>
<p>L'acclimatation est progressive et atteint son maximum après 12 mois de résidence continue dans la zone :</p>
<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 16px;margin:8px 0;font-family:var(--mono);font-size:13px">
  <b>FNC_eff = 1 - (1 - FNC) × min(1, mois_résidence / 12)</b><br>
  <span style="color:var(--dim)">Si résidence ≥ 12 mois : FNC_eff = FNC (acclimatation complète)</span><br>
  <span style="color:var(--dim)">Si résidence = 0 mois : FNC_eff = 1.00 (pas d'acclimatation, référence Z4)</span><br>
  <span style="color:var(--dim)">Si résidence = 6 mois : FNC_eff = 1 - (1 - FNC) × 0.5 (acclimatation partielle)</span>
</div>

<h3>25.4 Application au Score Exposome</h3>
<p>La normalisation FNC s'applique <b>uniquement</b> aux composantes température et UV du Layer A (environnement physique). L'AQI (pollution atmosphérique) n'est <b>pas</b> normalisé car la pollution a le même impact indépendamment de l'acclimatation :</p>
<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 16px;margin:8px 0;font-family:var(--mono);font-size:13px">
  <b>A_norm = min(1, (air/8 + temp/4 × FNC_eff_temp + UV/3 × FNC_eff_uv) / 3 × inflammMult)</b>
</div>

<h3>25.5 Exemple : Patient résidant à Maurice (Z1) depuis 24 mois</h3>
<p>Température extérieure : 33°C → score_temp = 1. UV index : 9 → score_uv = 3.</p>
<table>
<tr><th>Sans FNC (Z4)</th><th>Avec FNC Z1 (12+ mois)</th></tr>
<tr><td>a_temp = min(1, 1/4 × 1.00) = 0.250</td><td>a_temp = min(1, 1/4 × 0.55) = 0.138</td></tr>
<tr><td>a_uv = min(1, 3/3 × 1.00) = 1.000</td><td>a_uv = min(1, 3/3 × 0.50) = 0.500</td></tr>
<tr><td><b>Réduction score E : ~40-50 %</b> pour les composantes temp/UV</td><td></td></tr>
</table>

<div style="margin-top:20px;text-align:center">
  <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>
  <a href="/dossier" class="print-btn" style="text-decoration:none;background:var(--teal)">Dossier Technique</a>
  <a href="/" class="print-btn" style="text-decoration:none;background:var(--cyan)">Retour Application</a>
  <a href="#top" class="print-btn" style="text-decoration:none;background:var(--dim3)">Haut de page</a>
</div>

<div style="margin-top:30px;text-align:center;font-size:11px;color:var(--dim3)">
  Document confidentiel — SCORE BMN v3.4 — Bach · Manos · Noël — 4 mars 2026<br>
  93+ références + 62 études BTM | 25 sections | Architecture CLEO + BSD v4.9 + Bio v4.7.1 + BTM v2.0 + FNC v1.0<br>
  v3.4 : +10 MOD BTM · +FNC Köppen (6 zones) · +MultCV · Profils ethniques 12 groupes<br>
  Usage médical restreint — Ne pas diffuser sans autorisation
</div>

</div>
</body>
</html>`)
})

// ─── Main page ───
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0f172a">
<meta name="description" content="Score BMN v3.4 - Evaluez votre risque metabolique avec intelligence artificielle. Module BTM v3.4 : matrice bariatrique. Dyslipidemie integree.">
<title>Score BMN v3.4</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#x2695;</text></svg>">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="/static/styles.css" rel="stylesheet">
</head>
<body>
<div id="app"></div>
<script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
