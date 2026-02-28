import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

// ─── Health ───
app.get('/api/health', (c) => c.json({ status: 'ok', version: '5.0', name: 'Score BMN v2.0 AI-Powered' }))

// ─── Claude AI Proxy (keeps API key server-side) ───
app.post('/api/ai/analyze', async (c) => {
  try {
    const body = await c.req.json()
    const { profile, question } = body

    const systemPrompt = `Tu es un assistant médical expert en obésité, métabolisme et médecine préventive.
Tu analyses le profil d'un patient dans le cadre du Score BMN v2.0 (Bach-Manos-Noël).
Ton rôle:
1. Adapter les questions du questionnaire au profil du patient
2. Expliquer en langage simple les résultats et risques
3. Fournir des conseils personnalisés basés sur les données
4. Identifier les facteurs de risque critiques

Références: OMS, IDF, ADA 2024, FINDRISC, IPAQ, PHQ-9, PSS-10, ISI, BES, AUDIT-C, Lancet 2016, SCORE2/Framingham.

IMPORTANT: Réponds TOUJOURS en JSON valide avec cette structure:
{
  "analysis": "texte d'analyse courte (2-3 phrases max)",
  "risk_flags": ["liste de drapeaux de risque identifiés"],
  "suggestions": ["suggestions personnalisées courtes"],
  "adapted_questions": ["questions supplémentaires pertinentes si nécessaire"],
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
    
    // Parse JSON from Claude response
    let parsed
    try {
      // Try to extract JSON from the response
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

    const systemPrompt = `Tu es un médecin expert en obésité et métabolisme.
Tu interprètes les résultats du Score BMN v2.0 pour un patient.
Donne une interprétation personnalisée, empathique et actionnable en français.
IMPORTANT: Réponds en JSON:
{
  "summary": "résumé en 2-3 phrases",
  "key_risks": ["risques principaux identifiés"],
  "priority_actions": ["3 actions prioritaires concrètes"],
  "positive_points": ["points positifs du profil"],
  "medical_attention": "ce qui nécessite attention médicale (ou null)",
  "lifestyle_tips": ["3 conseils mode de vie personnalisés"],
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
<meta name="description" content="Score BMN v2.0 - Évaluez votre risque métabolique avec intelligence artificielle. Questionnaire validé cliniquement.">
<title>Score BMN v2.0 — Évaluation Métabolique IA</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚕️</text></svg>">
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