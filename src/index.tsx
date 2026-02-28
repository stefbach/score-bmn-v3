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
