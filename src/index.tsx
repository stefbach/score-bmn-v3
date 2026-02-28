import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

// ─── Health ───
app.get('/api/health', (c) => c.json({ status: 'ok', version: '6.0', name: 'Score BMN v3.0 AI+Geo' }))

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
Tu analyses le profil d'un patient dans le cadre du Score BMN v3.0 (Bach-Manos-Noel).
Ton role:
1. Adapter les questions du questionnaire au profil du patient
2. Expliquer en langage simple les resultats et risques
3. Fournir des conseils personnalises bases sur les donnees
4. Identifier les facteurs de risque critiques

References: OMS, IDF, ADA 2024, FINDRISC, IPAQ, PHQ-9, PSS-10, ISI, BES, AUDIT-C, Lancet 2016, SCORE2/Framingham.

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
Tu interpretes les resultats du Score BMN v3.0 pour un patient.
Donne une interpretation personnalisee, empathique et actionnable en francais.
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

Tu rediges un RAPPORT STRATEGIQUE COMPLET a destination du medecin traitant, base sur les resultats du Score BMN v3.0 (architecture CLEO).

CONTEXTE ALGORITHMIQUE:
- Score sf = wDecl × sD + wBio × bioNorm (0-100)
- sD = C(clinique, 0-50) + E(exposome, 0-45) + O(occupationnel, 0-10) + L(lifestyle, 0-10)
- CTI = Chronicity Trajectory Index (0-100) : mesure le degre d'installation de l'obesite
- GRI = GLP-1 Response Index : predit la reponse au traitement GLP-1
- SII = Sous-Index Inflammatoire (0-7) : 7 criteres binaires
- K = Score de comorbidites (0-50)
- bioNorm = score biologique normalise (0-100) calcule par z-scores ponderes

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
10. tone: "reassuring" | "cautious" | "urgent"

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
- PSS-10 (stress): ${profil.pss10}/40 | PHQ-9 (depression): ${profil.phq9}/27 | BES: ${profil.bes}/8 | ISI: ${profil.isi}
- Tabac: ${profil.tabac_cig} | Alcool: ${profil.alcool}

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
<title>DOSSIER ALGORITHME — SCORE BMN v3.0</title>
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
  <h1 style="font-size:24px;border:none;margin-top:4px">ALGORITHME SCORE BMN v3.0</h1>
  <div class="sub">Architecture CLEO (C + E + O + L) + Integration Biologique BSD v4.9</div>
  <div class="ver">Auteurs : Bach | Manos | Noel — Version 3.0 — Verrouille le 28 fevrier 2026</div>
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
  <a href="#s4"><span>4.</span> Comorbidites (13 pathologies)</a>
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
  <a href="#s26"><span>26.</span> Flux de Navigation (18 ecrans)</a>
  <a href="#s27"><span>27.</span> References Scientifiques</a>
  <a href="#synth"><span>*</span> SYNTHESE — Formules Cles Verrouillees</a>
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- 1. VUE D'ENSEMBLE -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s1">1. Vue d'ensemble</h2>
<p>Le <strong>Score BMN v3.0</strong> est un algorithme d'evaluation du risque metabolique et d'obesite, concu pour assister le medecin dans sa prise de decision. Il integre :</p>
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
PATIENT &rarr; QUESTIONNAIRE (18 ecrans)
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
<tr><th>Code</th><th>Nom</th><th>Surpoids</th><th>Obesite</th><th>TT F</th><th>TT M</th><th>Diab.</th><th>HTA</th><th>CV</th><th>Inflam</th><th>LDL</th><th>Var%</th></tr>
<tr><td><code>eu</code></td><td>Europeen / Caucasien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td></tr>
<tr><td><code>im</code></td><td>Indo-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.2</td><td>1.4</td><td>1.2</td><td>1.3</td><td>-1.5</td></tr>
<tr><td><code>cr</code></td><td>Creole Mauricien</td><td>25</td><td>30</td><td>84</td><td>94</td><td>1.3</td><td>1.4</td><td>1.2</td><td>1.2</td><td>1.0</td><td>-2</td></tr>
<tr><td><code>si</code></td><td>Sino-Mauricien</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.0</td><td>0.9</td><td>0.6</td><td>0.9</td><td>0.9</td><td>+1.5</td></tr>
<tr><td><code>sa</code></td><td>Sud-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>2.0</td><td>1.3</td><td>1.5</td><td>1.2</td><td>1.3</td><td>-1.5</td></tr>
<tr><td><code>af</code></td><td>Africain / Subsaharien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>1.3</td><td>1.5</td><td>1.2</td><td>1.3</td><td>1.0</td><td>-1.5</td></tr>
<tr><td><code>ea</code></td><td>Est-Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>88</td><td>0.9</td><td>0.9</td><td>0.7</td><td>0.9</td><td>0.9</td><td>+1.5</td></tr>
<tr><td><code>se</code></td><td>Sud-Est Asiatique</td><td>23</td><td>27.5</td><td>80</td><td>90</td><td>1.2</td><td>1.0</td><td>1.0</td><td>1.0</td><td>1.0</td><td>0</td></tr>
<tr><td><code>fm</code></td><td>Franco-Mauricien</td><td>25</td><td>30</td><td>88</td><td>102</td><td>0.8</td><td>1.0</td><td>0.9</td><td>1.0</td><td>1.0</td><td>+1</td></tr>
</table>
</div>
<p><code>ow</code> = seuil surpoids IMC | <code>ob</code> = seuil obesite IMC | <code>tf/tm</code> = tour de taille seuil F/M (cm) | <code>dR</code> = risque diabetique | <code>hR</code> = risque HTA | <code>cR</code> = risque CV | <code>iM</code> = multiplicateur inflammation Layer A | <code>ev</code> = variation ethnique % appliquee a C</p>

<!-- ═══════════════════════════════════════════ -->
<!-- 4. COMORBIDITES -->
<!-- ═══════════════════════════════════════════ -->
<h2 id="s4">4. Comorbidites (13 pathologies)</h2>
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
</table>

<h3>Phenotypes metaboliques</h3>
<table>
<tr><th>ID</th><th>Nom</th><th>Pts</th><th>Evidence</th><th>Description</th><th>ca</th><th>gr</th><th>Fav</th></tr>
<tr><td><code>monw</code></td><td>Phenotype MONW</td><td><b>10</b></td><td>OR 2.38</td><td>IMC &lt; 25 mais 2+ criteres MetS</td><td>1.1</td><td>0.70</td><td><span class="badge g">Oui</span></td></tr>
<tr><td><code>ir_occ</code></td><td>IR occulte</td><td><b>8</b></td><td>OR 2.12</td><td>TG/HDL &gt; 3.5 non diagnostique</td><td>1.2</td><td>0.55</td><td><span class="badge g">Oui</span></td></tr>
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
<tr><td>Pre-diabete / MetS / IR occulte (proxy)</td><td>Oui</td><td>+2 / +2 / +2.5</td><td>Declaratif</td></tr>
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

<h2 id="s26">26. Flux de Navigation (18 ecrans)</h2>
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
<tr><td>13</td><td>Depression PHQ-9 + BES</td></tr>
<tr><td>14</td><td>Comorbidites (13 pathologies)</td><td>[P] Pathologies</td></tr>
<tr><td>15</td><td>Score sD + Prescription bio</td><td>[sD] Score</td></tr>
<tr><td>16</td><td>Fiche biologique + simulation</td><td>[B] Biologie</td></tr>
<tr><td>17</td><td>Resultat final complet</td><td>[R] Resultat</td></tr>
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
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- SYNTHESE FINALE -->
<!-- ═══════════════════════════════════════════ -->
<div class="synth" id="synth">
<h2 style="margin:0 0 14px;border:none;background:none;padding:0;color:var(--teal)">SYNTHESE — Formules Cles Verrouillees</h2>
<pre>
+----------------------------------------------------------------+
|                    SCORE BMN v3.0 --- FORMULES                  |
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
+----------------------------------------------------------------+
</pre>
</div>

<div style="text-align:center;margin:40px 0;padding:20px;border-top:2px solid var(--border2)">
  <p style="font-size:14px;font-weight:700;color:var(--accent)">FIN DU DOSSIER &mdash; ALGORITHME SCORE BMN v3.0</p>
  <p style="font-size:12px;color:var(--dim)">Architecture CLEO + BSD v4.9 + Bio v4.7.1</p>
  <p style="font-size:12px;color:var(--dim2)">Bach | Manos | Noel &mdash; Fevrier 2026</p>
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
<meta name="description" content="Score BMN v3.0 - Evaluez votre risque metabolique avec intelligence artificielle.">
<title>Score BMN v3.0</title>
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
