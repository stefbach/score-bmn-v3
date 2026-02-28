import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()
app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok', version: '2.0', name: 'Score BMN v2.0 Enrichi' }))

app.get('/', (c) => c.html(mainHTML()))

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

<!-- ══════════ HEADER ══════════ -->
<div class="site-header">
  <div class="header-inner">
    <div class="logo">
      <div class="logo-badge">B</div>
      <div class="logo-text">
        <h1>Score BMN v2.0</h1>
        <p>Bach &middot; Manos &middot; Noel &mdash; Architecture ABCKO+</p>
      </div>
    </div>
    <div class="header-steps">
      <div class="hstep active" id="hs1" onclick="goStep(1)"><div class="hstep-num">1</div><span class="hstep-label">Identite</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs2" onclick="goStep(2)"><div class="hstep-num">2</div><span class="hstep-label">Exposome</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs3" onclick="goStep(3)"><div class="hstep-num">3</div><span class="hstep-label">Travail</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs4" onclick="goStep(4)"><div class="hstep-num">4</div><span class="hstep-label">Mode de vie</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs5" onclick="goStep(5)"><div class="hstep-num">5</div><span class="hstep-label">Mental</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs6" onclick="goStep(6)"><div class="hstep-num">6</div><span class="hstep-label">Comorbidites</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs7" onclick="goStep(7)"><div class="hstep-num">7</div><span class="hstep-label">Biologie</span></div>
      <div class="sep-arrow">&rsaquo;</div>
      <div class="hstep" id="hs8" onclick="goStep(8)"><div class="hstep-num">8</div><span class="hstep-label">Score Final</span></div>
    </div>
  </div>
  <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:12.5%"></div></div>
</div>

<!-- ══════════ MAIN LAYOUT ══════════ -->
<div class="main-layout">
<div class="content-area">

<!-- ═══ STEP 1 : IDENTITE & ANTHROPOMETRIE ═══ -->
<div class="step-panel active fade-in" id="step1">
  <div class="panel-header">
    <div class="panel-icon" style="background:#EBF4FF;">&#x1F464;</div>
    <div class="panel-title">
      <h2>Etape 1 &mdash; Identite &amp; Anthropometrie</h2>
      <p>Donnees de base patient &middot; Mesures anthropometriques &middot; Histoire familiale</p>
      <span class="panel-badge" style="background:#EBF4FF;color:var(--navy);">Fondation du Score BMN-C</span>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F4CB; Identite &amp; Ethnie</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Ethnie <span class="label-ref">Ajuste tous les seuils IMC, TT et multiplicateurs</span></label>
        <select id="ethnie" onchange="recalcAll()">
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
        <select id="sexe" onchange="recalcAll()">
          <option value="f">Femme</option>
          <option value="m">Homme</option>
        </select>
      </div>
      <div class="form-group">
        <label>Age (ans)</label>
        <input type="number" id="age" value="42" min="18" max="90" onchange="recalcAll()">
      </div>
      <div class="form-group">
        <label>Ville / Localite <span class="label-ref">Pour API qualite air</span></label>
        <input type="text" id="patient_city" placeholder="Ex: Port-Louis, Paris, Dubai..." onchange="recalcAll()">
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F4CF; Anthropometrie</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Poids (kg)</label>
        <input type="number" id="poids" value="72" min="30" max="300" step="0.1" onchange="calcIMC();recalcAll()">
      </div>
      <div class="form-group">
        <label>Taille (cm)</label>
        <input type="number" id="taille" value="165" min="140" max="220" onchange="calcIMC();recalcAll()">
      </div>
      <div class="form-group">
        <label>IMC (kg/m2) <span class="label-ref">Auto-calcule</span></label>
        <input type="number" id="imc" value="26.4" min="14" max="80" step="0.1" readonly style="background:var(--subtle);font-weight:700;">
      </div>
      <div class="form-group">
        <label>Tour de taille (cm) <span class="label-ref">&#x2B50; Prioritaire &mdash; Obesite viscerale</span></label>
        <input type="number" id="tt" value="88" min="50" max="200" onchange="recalcAll()">
      </div>
    </div>
    <div id="anthropoSummary" style="margin-top:14px;"></div>
  </div>

  <div class="section-block">
    <h3>&#x1F468;&#x200D;&#x1F469;&#x200D;&#x1F467; Histoire Familiale</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Obesite parentale</label>
        <select id="parent_obes" onchange="recalcAll()">
          <option value="0">Aucun parent obese</option>
          <option value="1">1 parent obese (IMC &ge; 30)</option>
          <option value="2">2 parents obeses (OR 8.42)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Obesite dans l'enfance (&lt; 12 ans)</label>
        <select id="obes_enfance" onchange="recalcAll()">
          <option value="0">Non</option>
          <option value="1">Surpoids enfant</option>
          <option value="2">Obese enfant (gamma CTI 0.240)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Diabete T2 parental</label>
        <select id="diab_parent" onchange="recalcAll()">
          <option value="0">Non</option>
          <option value="1">1 parent diabetique</option>
          <option value="2">2 parents diabetiques</option>
        </select>
      </div>
      <div class="form-group">
        <label>Cycles Yo-Yo ponderaux (&ge; 3 cycles)</label>
        <select id="yoyo" onchange="recalcAll()">
          <option value="0">Non (0-2 cycles)</option>
          <option value="1">Oui (&ge; 3 cycles &mdash; gamma CTI 0.249)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="step-nav-bottom">
    <div></div>
    <button class="btn btn-primary" onclick="goStep(2)">Etape 2 : Exposome &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 2 : EXPOSOME ENVIRONNEMENTAL ═══ -->
<div class="step-panel fade-in" id="step2">
  <div class="panel-header">
    <div class="panel-icon" style="background:#E6FFFA;">&#x1F30D;</div>
    <div class="panel-title">
      <h2>Etape 2 &mdash; Exposome Environnemental</h2>
      <p>Qualite de l'air (API temps reel) &middot; Eau &middot; Habitat &middot; Perturbateurs endocriniens &middot; Bruit &middot; Lumiere</p>
      <span class="panel-badge" style="background:#E6FFFA;color:var(--teal);">Score 0 &rarr; 47 pts &middot; Multiplicateur inflammatoire</span>
    </div>
  </div>

  <div class="alert" style="background:#E6FFFA;border-left:4px solid var(--teal);">
    <div class="alert-icon">&#x1F4A1;</div>
    <div class="alert-body">
      <strong>Exposome &amp; Obesite</strong>
      L'environnement contribue a 40-60% du risque d'obesite via l'inflammation chronique, la perturbation endocrinienne et le stress oxydatif. Chaque facteur est quantifie et ses effets sur le SII (inflammation) sont calcules.
    </div>
  </div>

  <!-- API QUALITE DE L'AIR -->
  <div class="section-block">
    <h3>&#x1F32B;&#xFE0F; Qualite de l'Air &mdash; API Temps Reel</h3>
    <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">Interroge l'API WAQI (World Air Quality Index) en temps reel. PM2.5, PM10, NO2, O3, SO2, CO.</p>
    <div class="form-grid">
      <div class="form-group">
        <label>Ville de residence</label>
        <div style="display:flex;gap:8px;">
          <input type="text" id="aqi_city" placeholder="Port-Louis, Paris, London..." style="flex:1;" value="">
          <button class="btn btn-primary" onclick="fetchAirQuality(document.getElementById('aqi_city').value)" style="padding:9px 18px;font-size:12px;">&#x1F50D; Rechercher</button>
        </div>
      </div>
      <div class="form-group">
        <label>Ou utiliser la geolocalisation</label>
        <button class="btn btn-secondary" onclick="fetchAirQualityGeo()" style="padding:9px 18px;font-size:12px;">&#x1F4CD; Ma position GPS</button>
      </div>
    </div>
    <div id="aqiStatus" style="margin-top:8px;font-size:12px;"></div>
    <div id="aqiResult"></div>
    <div class="form-group" style="margin-top:12px;">
      <label>Score air manuel (si API indisponible) <span class="label-ref">0=bon, 8=dangereux</span></label>
      <select id="expo_air_manual" onchange="recalcExposome()">
        <option value="-1">-- Utiliser API --</option>
        <option value="0">0 &mdash; Excellent (AQI &le; 50)</option>
        <option value="2">2 &mdash; Modere (AQI 51-100)</option>
        <option value="4">4 &mdash; Malsain sensibles (AQI 101-150)</option>
        <option value="6">6 &mdash; Malsain (AQI 151-200)</option>
        <option value="8">8 &mdash; Dangereux (AQI &gt; 200)</option>
      </select>
    </div>
  </div>

  <!-- QUALITE EAU -->
  <div class="section-block">
    <h3>&#x1F4A7; Qualite de l'Eau</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Source d'eau principale</label>
        <select id="expo_water" onchange="recalcExposome()">
          <option value="0">Eau filtree / osmose inverse</option>
          <option value="1">Eau du robinet (ville, controlee)</option>
          <option value="2">Eau en bouteille plastique (PE)</option>
          <option value="3">Eau non traitee / puits / citerne</option>
          <option value="4">Eau avec metaux lourds connus</option>
        </select>
      </div>
      <div class="form-group">
        <label>Exposition chlore/fluor excessive</label>
        <select id="expo_water_chlore" onchange="recalcExposome()">
          <option value="0">Non</option>
          <option value="1">Oui (zone avec chloration forte)</option>
        </select>
      </div>
    </div>
  </div>

  <!-- HABITAT -->
  <div class="section-block">
    <h3>&#x1F3E0; Habitat &amp; Environnement Immediat</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Proximite route a fort trafic</label>
        <select id="expo_route" onchange="recalcExposome()">
          <option value="0">Non (&gt; 500m)</option>
          <option value="1">Moderee (200-500m)</option>
          <option value="2">Proche (&lt; 200m &mdash; PM2.5 +40%)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Proximite zone industrielle</label>
        <select id="expo_industrie" onchange="recalcExposome()">
          <option value="0">Non (&gt; 2km)</option>
          <option value="1">Moderee (500m-2km)</option>
          <option value="2">Proche (&lt; 500m)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Acces espaces verts</label>
        <select id="expo_vert" onchange="recalcExposome()">
          <option value="0">Parc / foret a &lt; 5 min</option>
          <option value="1">Espaces verts a 10-20 min</option>
          <option value="2">Aucun espace vert accessible</option>
        </select>
      </div>
      <div class="form-group">
        <label>Type de logement</label>
        <select id="expo_logement" onchange="recalcExposome()">
          <option value="0">Maison aeree avec jardin</option>
          <option value="1">Appartement standard</option>
          <option value="2">Logement confine / insalubre</option>
        </select>
      </div>
    </div>
  </div>

  <!-- BRUIT -->
  <div class="section-block">
    <h3>&#x1F50A; Pollution Sonore</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Bruit ambiant diurne</label>
        <select id="expo_bruit_jour" onchange="recalcExposome()">
          <option value="0">Calme (&lt; 55 dB)</option>
          <option value="1">Modere (55-70 dB)</option>
          <option value="2">Fort (&gt; 70 dB &mdash; cortisol +15%)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Bruit nocturne <span class="label-ref">Impact sommeil &amp; cortisol</span></label>
        <select id="expo_bruit_nuit" onchange="recalcExposome()">
          <option value="0">Silence (&lt; 40 dB)</option>
          <option value="1">Modere (40-55 dB)</option>
          <option value="2">Eleve (&gt; 55 dB &mdash; ISI +3 pts)</option>
        </select>
      </div>
    </div>
  </div>

  <!-- PERTURBATEURS ENDOCRINIENS -->
  <div class="section-block">
    <h3>&#x2623;&#xFE0F; Perturbateurs Endocriniens (PE)</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>PE alimentaires : plastiques</label>
        <select id="pe_plastic" onchange="recalcExposome()">
          <option value="0">Utilise verre/inox</option>
          <option value="1">Plastique occasionnel</option>
          <option value="2">Plastique quotidien (BPA, phtalates)</option>
        </select>
      </div>
      <div class="form-group">
        <label>PE alimentaires : conserves/emballages</label>
        <select id="pe_canned" onchange="recalcExposome()">
          <option value="0">Rarement (&lt; 1x/sem)</option>
          <option value="1">Regulier (2-4x/sem)</option>
          <option value="2">Quotidien (BPA +60%)</option>
        </select>
      </div>
      <div class="form-group">
        <label>PE alimentaires : pesticides</label>
        <select id="pe_pesticide" onchange="recalcExposome()">
          <option value="0">Bio/local majoritaire</option>
          <option value="1">Mixte bio/conventionnel</option>
          <option value="2">Conventionnel exclusif</option>
        </select>
      </div>
      <div class="form-group">
        <label>PE cosmetiques (parabenes, phtalates)</label>
        <select id="pe_cosm" onchange="recalcExposome()">
          <option value="0">Cosmetiques bio/naturels</option>
          <option value="1">Usage modere conventionnel</option>
          <option value="2">Usage intensif (>5 produits/j)</option>
          <option value="3">Usage tres intensif + teintures</option>
          <option value="4">Professionnels cosmetiques</option>
        </select>
      </div>
      <div class="form-group">
        <label>PE professionnels (solvants, BPA, retardateurs) <span class="label-ref">Voir etape 3</span></label>
        <select id="pe_prof" onchange="recalcExposome()">
          <option value="0">Aucune exposition</option>
          <option value="1">Faible (bureau standard)</option>
          <option value="2">Moderee (industrie legere)</option>
          <option value="3">Elevee (chimie, agriculture)</option>
          <option value="4">Tres elevee (solvants quotidiens)</option>
          <option value="5">Extreme (petrochimie, pesticides)</option>
        </select>
      </div>
    </div>
  </div>

  <!-- LUMIERE & SOCIO -->
  <div class="section-block">
    <h3>&#x1F4A1; Pollution Lumineuse &amp; Contexte Socio-economique</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Ecrans le soir (&gt; 21h)</label>
        <select id="expo_light" onchange="recalcExposome()">
          <option value="0">&lt; 30 min ou filtres actifs</option>
          <option value="1">30-120 min</option>
          <option value="2">&gt; 2h sans filtre bleu</option>
          <option value="3">&gt; 4h (melatonine -50%)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Precarite socio-economique (EPICES simplifie)</label>
        <select id="expo_socio" onchange="recalcExposome()">
          <option value="0">Aisee (score EPICES &lt; 30)</option>
          <option value="1">Classe moyenne</option>
          <option value="2">Moderement precaire</option>
          <option value="3">Precaire (score 30-40)</option>
          <option value="4">Tres precaire (score 40-60)</option>
          <option value="5">Grande precarite (&gt; 60)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Desert alimentaire</label>
        <select id="expo_food_desert" onchange="recalcExposome()">
          <option value="0">Acces facile fruits/legumes frais (&lt; 10 min)</option>
          <option value="1">Acces modere (10-20 min)</option>
          <option value="2">Difficile (20-30 min)</option>
          <option value="3">Tres difficile (&gt; 30 min)</option>
          <option value="4">Desert alimentaire complet</option>
        </select>
      </div>
    </div>
  </div>

  <div id="exposomeSummary"></div>

  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(1)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(3)">Etape 3 : Profil Professionnel &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 3 : PROFIL PROFESSIONNEL ═══ -->
<div class="step-panel fade-in" id="step3">
  <div class="panel-header">
    <div class="panel-icon" style="background:#FFF8F0;">&#x1F4BC;</div>
    <div class="panel-title">
      <h2>Etape 3 &mdash; Profil Professionnel</h2>
      <p>Type de travail &middot; Distance &middot; Transport &middot; Horaires &middot; Stress &middot; Posture &middot; Toxiques &middot; Restauration &middot; Retraite</p>
      <span class="panel-badge" style="background:#FFF8F0;color:var(--orange);">Score 0 &rarr; 50 pts &middot; Impact BMN-C + SII + CTI</span>
    </div>
  </div>

  <div class="alert" style="background:#FFF8F0;border-left:4px solid var(--orange);">
    <div class="alert-icon">&#x26A1;</div>
    <div class="alert-body">
      <strong>Travail &amp; Obesite</strong>
      Le travail sedentaire augmente le risque de 45% (HR 1.45). Le travail de nuit multiplie par 1.29. Les trajets &gt; 60 min reduisent l'AP de 33% et augmentent l'IMC de 0.8 kg/m2 en moyenne.
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F3ED; Type &amp; Nature du Travail</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Situation professionnelle</label>
        <select id="work_situation" onchange="recalcWork()">
          <option value="actif">Actif (emploi)</option>
          <option value="chomage">Chomeur (&gt; 6 mois)</option>
          <option value="invalide">Invalidite / Arret longue duree</option>
          <option value="retraite_recent">Retraite recente (&lt; 2 ans)</option>
          <option value="retraite_ancien">Retraite ancienne (&gt; 2 ans)</option>
          <option value="etudiant">Etudiant</option>
        </select>
      </div>
      <div class="form-group">
        <label>Type de travail</label>
        <select id="work_type" onchange="recalcWork()">
          <option value="0">Tres actif (manutention, BTP, agricole)</option>
          <option value="1">Actif (debout, marche : commerce, soins)</option>
          <option value="2">Mixte (alternance assis/debout)</option>
          <option value="3">Sedentaire modere (bureau avec pauses)</option>
          <option value="4">Sedentaire (bureau 6-8h assis)</option>
          <option value="5">Tres sedentaire (bureau &gt; 8h sans pause)</option>
          <option value="6">Hyper-sedentaire (teletravail confine)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Heures de travail par semaine</label>
        <select id="work_hours" onchange="recalcWork()">
          <option value="0">&lt; 35h (temps partiel)</option>
          <option value="1">35-40h (standard)</option>
          <option value="2">40-48h (surcharge legere)</option>
          <option value="3">48-55h (surcharge moderee)</option>
          <option value="4">55-65h (surcharge importante)</option>
          <option value="5">&gt; 65h (surcharge extreme)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F697; Distance &amp; Transport Domicile-Travail</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Distance domicile-travail (aller simple)</label>
        <select id="commute_dist" onchange="recalcWork()">
          <option value="0">Teletravail / domicile</option>
          <option value="1">&lt; 5 km</option>
          <option value="2">5-15 km</option>
          <option value="3">15-30 km</option>
          <option value="4">30-60 km</option>
          <option value="5">&gt; 60 km (IMC +0.8 kg/m2)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Mode de transport principal</label>
        <select id="commute_mode" onchange="recalcWork()">
          <option value="0">Marche / velo (actif)</option>
          <option value="1">Transport en commun (mixte)</option>
          <option value="2">Moto / scooter</option>
          <option value="3">Voiture (&lt; 30 min)</option>
          <option value="4">Voiture (&gt; 30 min &mdash; sedentaire)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Temps de trajet total quotidien (A/R)</label>
        <select id="commute_time" onchange="recalcWork()">
          <option value="0">&lt; 20 min</option>
          <option value="1">20-40 min</option>
          <option value="2">40-60 min</option>
          <option value="3">60-90 min</option>
          <option value="4">&gt; 90 min (AP -33%)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x23F0; Horaires &amp; Rythme</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Type d'horaires</label>
        <select id="work_schedule" onchange="recalcWork()">
          <option value="0">Journee standard (8h-18h)</option>
          <option value="1">Horaires decales (matin ou soir)</option>
          <option value="2">Travail de nuit occasionnel (&lt; 3/sem)</option>
          <option value="3">Travail de nuit regulier (&ge; 3/sem &mdash; OR 1.29)</option>
          <option value="4">Poste 3x8 / rotation</option>
          <option value="5">Gardes 24h (medical, securite)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Pauses repas structurees</label>
        <select id="work_pause" onchange="recalcWork()">
          <option value="0">Oui, pause &ge; 45 min</option>
          <option value="1">Pause courte 20-45 min</option>
          <option value="2">Pas de pause formelle</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F4A2; Stress Professionnel (Karasek simplifie)</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Demande psychologique <span class="label-ref">Charge, urgence, complexite</span></label>
        <select id="work_demand" onchange="recalcWork()">
          <option value="0">Faible (rythme tranquille)</option>
          <option value="1">Moderee</option>
          <option value="2">Elevee (cadences, deadlines)</option>
          <option value="3">Tres elevee (urgence constante)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Latitude decisionnelle <span class="label-ref">Autonomie, creativite</span></label>
        <select id="work_latitude" onchange="recalcWork()">
          <option value="0">Forte (autonome, creatif)</option>
          <option value="1">Moderee</option>
          <option value="2">Faible (executant, controle)</option>
          <option value="3">Nulle (travail a la chaine)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Soutien social au travail</label>
        <select id="work_support" onchange="recalcWork()">
          <option value="0">Bon (equipe solidaire)</option>
          <option value="1">Moyen</option>
          <option value="2">Faible (isolement, conflits)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F37D;&#xFE0F; Restauration au Travail</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Repas du midi habituel</label>
        <select id="work_meals" onchange="recalcWork()">
          <option value="0">Repas maison equilibre</option>
          <option value="1">Cantine d'entreprise</option>
          <option value="2">Sandwich / fast-food occasionnel</option>
          <option value="3">Fast-food / livraison regulier</option>
          <option value="4">Saute le repas (grignotage compensatoire)</option>
          <option value="5">Distributeur / snacking permanent</option>
        </select>
      </div>
      <div class="form-group">
        <label>Posture de travail dominante</label>
        <select id="work_posture" onchange="recalcWork()">
          <option value="0">Debout dynamique / marche</option>
          <option value="1">Alternance assis/debout (bureau reglable)</option>
          <option value="2">Assis avec pauses regulieres</option>
          <option value="3">Assis prolonge (&gt; 4h continu)</option>
          <option value="4">Posture contrainte (conduite, port de charges)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x2623;&#xFE0F; Exposition Toxiques Professionnels</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Exposition chimiques / poussieres</label>
        <select id="work_toxics" onchange="recalcWork()">
          <option value="0">Aucune</option>
          <option value="1">Faible (bureau, commerce)</option>
          <option value="2">Moderee (atelier, garage)</option>
          <option value="3">Elevee (industrie, agriculture)</option>
          <option value="4">Tres elevee (mines, chimie lourde)</option>
          <option value="5">Amiante / radiations / solvants</option>
        </select>
      </div>
      <div class="form-group">
        <label>Statut retraite et impact</label>
        <select id="work_retirement" onchange="recalcWork()">
          <option value="0">Non concerne (actif)</option>
          <option value="1">Retraite active (AP maintenue)</option>
          <option value="2">Retraite sedentaire moderee</option>
          <option value="3">Retraite sedentaire (prise poids +5-8 kg)</option>
          <option value="4">Retraite avec perte de lien social</option>
          <option value="5">Retraite + isolement + depression</option>
        </select>
      </div>
    </div>
  </div>

  <div id="workSummary"></div>

  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(2)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(4)">Etape 4 : Mode de Vie &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 4 : COMPORTEMENTS & MODE DE VIE ═══ -->
<div class="step-panel fade-in" id="step4">
  <div class="panel-header">
    <div class="panel-icon" style="background:#F0FFF4;">&#x1F3C3;</div>
    <div class="panel-title">
      <h2>Etape 4 &mdash; Comportements &amp; Mode de Vie</h2>
      <p>Alimentation detaillee (DQI-BMN) &middot; Activite physique (IPAQ) &middot; Sommeil &middot; Substances</p>
      <span class="panel-badge" style="background:#F0FFF4;color:var(--green);">Score 0 &rarr; 60 pts &middot; 5 questionnaires quantifies</span>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F957; Alimentation Detaillee &mdash; DQI-BMN (0-15 pts)</h3>
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">Chaque dimension est evaluee independamment. Score eleve = mauvaise qualite.</p>
    <div class="form-grid">
      <div class="form-group">
        <label>Ultra-transformes (AUT) <span class="label-ref">DQI_AUT &ge; 2 &rarr; SII+1</span></label>
        <select id="alim_ultra" onchange="recalcAll()">
          <option value="0">Rarement (&lt; 1x/sem)</option>
          <option value="1">Occasionnel (2-3x/sem)</option>
          <option value="2">Regulier (4-6x/sem &mdash; SII+)</option>
          <option value="3">Quotidien (&ge; 1x/jour)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Boissons sucrees / jus industriels</label>
        <select id="alim_sucre" onchange="recalcAll()">
          <option value="0">Jamais / eau uniquement</option>
          <option value="1">Occasionnel (&lt; 2x/sem)</option>
          <option value="2">Regulier (3-5x/sem)</option>
          <option value="3">Quotidien (&ge; 1x/jour)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Fibres &amp; fruits/legumes (portions/jour)</label>
        <select id="alim_fibres" onchange="recalcAll()">
          <option value="0">&ge; 5 portions/jour (optimal)</option>
          <option value="1">3-4 portions/jour</option>
          <option value="2">1-2 portions/jour</option>
          <option value="3">&lt; 1 portion (carence)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Taille des portions</label>
        <select id="alim_portions" onchange="recalcAll()">
          <option value="0">Normales (pas de re-service)</option>
          <option value="1">Legerement excessives</option>
          <option value="2">Excessives (re-service regulier)</option>
          <option value="3">Tres excessives (pas de satiete)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Structure des repas</label>
        <select id="alim_repas" onchange="recalcAll()">
          <option value="0">3 repas structures / horaires fixes</option>
          <option value="1">Repas irreguliers</option>
          <option value="2">Saute 1 repas + grignotage</option>
          <option value="3">Desorganise (grignotage permanent)</option>
        </select>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F3CB;&#xFE0F; Activite Physique Detaillee &mdash; IPAQ (0-9 pts)</h3>
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">Detaillez par type. Score &lt; 150 min totales = insuffisant OMS.</p>
    <div class="form-grid">
      <div class="form-group">
        <label>Cardio (marche rapide, course, natation, velo) <span class="label-ref">min/semaine</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="ap_cardio" min="0" max="300" value="60" step="10" oninput="document.getElementById('apCardioVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="apCardioVal">60</div>
          </div>
          <div class="slider-labels"><span>0</span><span>75</span><span>150 OMS</span><span>300+</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Renforcement musculaire <span class="label-ref">min/semaine</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="ap_muscu" min="0" max="180" value="0" step="10" oninput="document.getElementById('apMuscuVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="apMuscuVal">0</div>
          </div>
          <div class="slider-labels"><span>0</span><span>60 OMS</span><span>180</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Marche quotidienne (non sportive) <span class="label-ref">min/jour</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="ap_marche" min="0" max="120" value="20" step="5" oninput="document.getElementById('apMarcheVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="apMarcheVal">20</div>
          </div>
          <div class="slider-labels"><span>0</span><span>30 seuil</span><span>120</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Temps assis quotidien total (heures)</label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="assis" min="1" max="16" value="7" step="0.5" oninput="document.getElementById('assisVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="assisVal">7</div>
          </div>
          <div class="slider-labels"><span>1h</span><span>6h</span><span>8h seuil HR1.91</span><span>16h</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F634; Sommeil &amp; Qualite</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Duree de sommeil habituelle (h/nuit)</label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="sommeil" min="3" max="12" value="7" step="0.5" oninput="document.getElementById('sommeilVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="sommeilVal">7</div>
          </div>
          <div class="slider-labels"><span>3h</span><span>6h</span><span>7-9h optimal</span><span>12h</span></div>
        </div>
      </div>
      <div class="form-group">
        <label>Score ISI (Insomnia Severity Index) <span class="label-ref">0-28, &ge;15 OR 1.73</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="isi" min="0" max="28" value="8" oninput="document.getElementById('isiVal').textContent=this.value;recalcAll()">
            <div class="slider-val" id="isiVal">8</div>
          </div>
          <div class="slider-labels"><span>0 (bon)</span><span>8 sub</span><span>15 modere</span><span>22 severe</span><span>28</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F6AC; Substances</h3>
    <div class="form-grid">
      <div class="form-group">
        <label>Statut tabagique</label>
        <select id="tabac" onchange="recalcAll()">
          <option value="0">Jamais fume</option>
          <option value="1">Ex-fumeur &gt; 1 an</option>
          <option value="2">Ex-fumeur &lt; 1 an (sevrage = prise poids)</option>
          <option value="3">Fumeur leger (&lt; 10 cig/j)</option>
          <option value="4">Fumeur important (&ge; 10 cig/j &mdash; SII+)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Alcool : frequence <span class="label-ref">AUDIT-C question 1</span></label>
        <select id="alcool_freq" onchange="recalcAll()">
          <option value="0">Jamais / exceptionnel</option>
          <option value="1">2-4x/mois</option>
          <option value="2">2-3x/semaine</option>
          <option value="3">4+ x/semaine</option>
        </select>
      </div>
      <div class="form-group">
        <label>Alcool : quantite par occasion <span class="label-ref">AUDIT-C question 2</span></label>
        <select id="alcool_qty" onchange="recalcAll()">
          <option value="0">1-2 verres</option>
          <option value="1">3-4 verres</option>
          <option value="2">5-6 verres</option>
          <option value="3">7-9 verres</option>
          <option value="4">&ge; 10 verres</option>
        </select>
      </div>
    </div>
  </div>

  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(3)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(5)">Etape 5 : Sante Mentale &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 5 : SANTE MENTALE ═══ -->
<div class="step-panel fade-in" id="step5">
  <div class="panel-header">
    <div class="panel-icon" style="background:#FAF5FF;">&#x1F9E0;</div>
    <div class="panel-title">
      <h2>Etape 5 &mdash; Sante Mentale</h2>
      <p>Stress (PSS-10) &middot; Depression (PHQ-9) &middot; Hyperphagie (BES) &middot; Questionnaires auto-administres</p>
      <span class="panel-badge" style="background:#FAF5FF;color:var(--purple);">Score 0 &rarr; 28 pts &middot; Impact SII + CTI</span>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F4CA; Stress Percu &mdash; PSS-10 (0-40)</h3>
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">Echelle de stress percu de Cohen. Ratio &ge; 0.35 &rarr; SII+1. Impact cortisol &rarr; CTI.</p>
    <div class="form-group">
      <div class="slider-group">
        <div class="slider-row">
          <input type="range" id="stress" min="0" max="40" value="14" oninput="document.getElementById('stressVal').textContent=this.value;recalcAll()">
          <div class="slider-val" id="stressVal">14</div>
        </div>
        <div class="slider-labels"><span>0 (faible)</span><span>14 moyen</span><span>27 eleve</span><span>40 severe</span></div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F614; Depression &mdash; PHQ-9 (0-27)</h3>
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">9 items. &ge; 10 = depression moderee. &ge; 20 = severe. Impact metabolique bidirectionnel.</p>
    <div class="form-group">
      <div class="slider-group">
        <div class="slider-row">
          <input type="range" id="phq9" min="0" max="27" value="5" oninput="document.getElementById('phq9Val').textContent=this.value;recalcAll()">
          <div class="slider-val" id="phq9Val">5</div>
        </div>
        <div class="slider-labels"><span>0</span><span>5 leger</span><span>10 modere</span><span>15 mod-sev</span><span>20 severe</span><span>27</span></div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <h3>&#x1F37D;&#xFE0F; Hyperphagie &mdash; BES (0-8)</h3>
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px;">Binge Eating Scale simplifiee. &ge; 4 = modere, &ge; 6 = severe.</p>
    <div class="form-group">
      <div class="slider-group">
        <div class="slider-row">
          <input type="range" id="bes" min="0" max="8" value="2" oninput="document.getElementById('besVal').textContent=this.value;recalcAll()">
          <div class="slider-val" id="besVal">2</div>
        </div>
        <div class="slider-labels"><span>0 (absent)</span><span>4 modere</span><span>6 severe</span><span>8 extreme</span></div>
      </div>
    </div>
  </div>

  <div id="mentalSummary"></div>

  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(4)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(6)">Etape 6 : Comorbidites &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 6 : BMN-K COMORBIDITES ═══ -->
<div class="step-panel fade-in" id="step6">
  <div class="panel-header">
    <div class="panel-icon" style="background:#FFF5F5;">&#x1F3E5;</div>
    <div class="panel-title">
      <h2>Etape 6 &mdash; BMN-K : Comorbidites &amp; Phenotypes</h2>
      <p>11 comorbidites documentees &middot; Phenotypes metaboliques &middot; Traitements aggravants</p>
      <span class="panel-badge" style="background:#FFF5F5;color:var(--red);">Score 0 &rarr; 50 pts &middot; Comorbidity Floor si K &gt; 30</span>
    </div>
  </div>
  <div class="alert" style="background:#FFF5F5;border-left:4px solid var(--red);">
    <div class="alert-icon">&#x26A1;</div>
    <div class="alert-body">
      <strong>Comorbidity Floor</strong>
      Si BMN-K &gt; 30 pts, le score BMN-T final est garanti &ge; MODERE (40 pts minimum), meme si le BMN-C est rassurant.
    </div>
  </div>
  <div class="section-block"><h3>&#x1F534; Maladies Etablies</h3><div class="comorbidity-grid" id="comorbGrid"></div></div>
  <div class="section-block"><h3>&#x1F7E0; Phenotypes Metaboliques</h3><div class="comorbidity-grid" id="phenoGrid"></div></div>
  <div class="section-block"><h3>&#x1F48A; Traitements Aggravants</h3><div class="comorbidity-grid" id="traitGrid"></div></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(5)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(7)">Etape 7 : Biologie &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 7 : BMN-B BIOLOGIQUE ═══ -->
<div class="step-panel fade-in" id="step7">
  <div class="panel-header">
    <div class="panel-icon" style="background:#F0FFF4;">&#x1F52C;</div>
    <div class="panel-title">
      <h2>Etape 7 &mdash; BMN-B : Resultats Biologiques</h2>
      <p>15 biomarqueurs z-score normalises &middot; 6 regles de retro-validation en temps reel</p>
      <span class="panel-badge" style="background:#F0FFF4;color:var(--green);">Score 0 &rarr; 100 &middot; Retrovalidation Active</span>
    </div>
  </div>
  <div id="classificationIntermediate"></div>
  <div id="bilanPrescrit"></div>
  <div id="bioPanel"></div>
  <div class="section-block"><h3>&#x1F504; Retrovalidation (6 Regles)</h3><div id="retroValid"></div></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(6)">&larr; Retour</button>
    <button class="btn btn-primary" onclick="goStep(8)">Etape 8 : Score Final &amp; Strategie &rarr;</button>
  </div>
</div>

<!-- ═══ STEP 8 : BMN-T SCORE FINAL ═══ -->
<div class="step-panel fade-in" id="step8">
  <div class="panel-header">
    <div class="panel-icon" style="background:#EBF4FF;">&#x1F3AF;</div>
    <div class="panel-title">
      <h2>Etape 8 &mdash; BMN-T : Score Final &amp; Strategie</h2>
      <p>Ponderation dynamique tri-source &middot; Markov 6 etats &middot; CTI &middot; GRI &middot; Plan therapeutique</p>
      <span class="panel-badge" style="background:#EBF4FF;color:var(--navy);">Score 0 &rarr; 200 pts &middot; Classification + Strategie</span>
    </div>
  </div>
  <div id="finalResult"></div>
  <div class="step-nav-bottom">
    <button class="btn btn-secondary" onclick="goStep(7)">&larr; Retour</button>
    <button class="btn btn-danger" onclick="resetAll()">&#x1F504; Nouveau Patient</button>
    <button class="btn btn-primary" onclick="window.print()">&#x1F5A8;&#xFE0F; Imprimer Rapport</button>
  </div>
</div>

</div><!-- /content-area -->

<!-- ══════════ SIDEBAR ══════════ -->
<div class="sidebar">
  <div class="score-card">
    <div class="score-card-header"><h3>Scores en temps reel</h3><span class="live-dot">LIVE</span></div>
    <div class="score-card-body">
      <div class="score-meter"><div class="score-meter-label"><span>BMN-C Clinique</span><span id="sCval">&mdash;</span>/150</div><div class="meter-bar"><div class="meter-fill" id="sCbar" style="width:0%;background:var(--blue)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>Exposome</span><span id="sExpoVal">&mdash;</span>/47</div><div class="meter-bar"><div class="meter-fill" id="sExpoBar" style="width:0%;background:var(--teal)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>Travail</span><span id="sWorkVal">&mdash;</span>/50</div><div class="meter-bar"><div class="meter-fill" id="sWorkBar" style="width:0%;background:var(--orange)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>BMN-K Comorbidites</span><span id="sKval">&mdash;</span>/50</div><div class="meter-bar"><div class="meter-fill" id="sKbar" style="width:0%;background:var(--red)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>BMN-B Biologique</span><span id="sBval">&mdash;</span>/100</div><div class="meter-bar"><div class="meter-fill" id="sBbar" style="width:0%;background:var(--green)"></div></div></div>
      <div class="score-meter"><div class="score-meter-label"><span>SII Inflammation</span><span id="sSiiVal">&mdash;</span>/9</div><div class="meter-bar"><div class="meter-fill" id="sSiiBar" style="width:0%;background:var(--purple)"></div></div></div>
      <div class="score-big" id="bmnTBox"><div class="number" id="bmnTNum">&mdash;</div><div class="label">BMN-T Score Final</div></div>
      <div class="risk-badge" id="riskBadge" style="background:var(--subtle);color:var(--muted);">En cours de calcul...</div>
    </div>
  </div>
  <div class="score-card">
    <div class="score-card-header"><h3>Guide de lecture</h3></div>
    <div class="score-card-body" style="display:flex;flex-direction:column;gap:6px;">
      <div class="info-box" style="background:#F0FFF4;border-left-color:var(--green);"><strong>FAIBLE</strong> 0-40 &middot; P &lt; 8%</div>
      <div class="info-box" style="background:var(--l-yellow);border-left-color:#D69E2E;"><strong>MODERE</strong> 41-80 &middot; P 8-22%</div>
      <div class="info-box" style="background:var(--l-orange);border-left-color:var(--orange);"><strong>ELEVE</strong> 81-120 &middot; P 22-47%</div>
      <div class="info-box" style="background:var(--l-red);border-left-color:var(--red);"><strong>TRES ELEVE</strong> 121-160 &middot; P 47-71%</div>
      <div class="info-box" style="background:var(--l-purple);border-left-color:var(--purple);"><strong>CRITIQUE</strong> &gt; 160 &middot; P &gt; 71%</div>
    </div>
  </div>
  <div class="score-card" id="ctiGriCard" style="display:none;">
    <div class="score-card-header"><h3>CTI &amp; GRI</h3></div>
    <div class="score-card-body">
      <div style="margin-bottom:14px;">
        <div class="sidebar-label">CTI &mdash; Chronicisation</div>
        <div class="meter-bar" style="height:8px;margin-bottom:4px;"><div class="meter-fill" id="ctiBar" style="width:0%;background:var(--red)"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span id="ctiVal" class="mono-bold" style="color:var(--red);">0</span><span style="color:var(--muted);">Fenetre: <span id="ctiWindow">Ouverte</span></span></div>
      </div>
      <div>
        <div class="sidebar-label">GRI &mdash; Reponse GLP-1</div>
        <div class="meter-bar" style="height:8px;margin-bottom:4px;"><div class="meter-fill" id="griBar" style="width:0%;background:var(--green-light)"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;"><span id="griVal" class="mono-bold" style="color:var(--green);">0.0</span><span style="color:var(--muted);"><span id="griLevel">&mdash;</span></span></div>
      </div>
    </div>
  </div>
</div>

</div><!-- /main-layout -->

<script src="/static/app.js"></script>
</body>
</html>`
}

export default app