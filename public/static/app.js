// ════════════════════════════════════════════════════════════════
// SCORE BMN v2.0 — MOTEUR IA ADAPTATIF + APIs GÉO AUTO
// Open-Meteo · Nominatim · Haversine · Claude AI
// Réf: OMS, IDF 2006, ADA 2024, IPAQ, PHQ-9, PSS-10, ISI, BES
// Lancet 2016, SCORE2/Framingham, FINDRISC, DPP, INTERHEART
// ════════════════════════════════════════════════════════════════

// ─── ETHNICITY (WHO Asia-Pacific + IDF 2006 + Lancet 2016) ───
const ETH={
  eu:{n:'Européen / Caucasien',ow:25,ob:30,tf:88,tm:102,dR:1,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  im:{n:'Indo-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.2,cR:1.4,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  cr:{n:'Créole Mauricien',ow:25,ob:30,tf:84,tm:94,dR:1.3,hR:1.4,cR:1.2,iM:1.2,ldl:1,ev:-2,p:1},
  si:{n:'Sino-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:1,hR:.9,cR:.6,iM:.9,ldl:.9,ev:1.5,p:1.1},
  sa:{n:'Sud-Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.3,cR:1.5,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  af:{n:'Africain / Subsaharien',ow:25,ob:30,tf:88,tm:102,dR:1.3,hR:1.5,cR:1.2,iM:1.3,ldl:1,ev:-1.5,p:1},
  ea:{n:'Est-Asiatique',ow:23,ob:27.5,tf:80,tm:88,dR:.9,hR:.9,cR:.7,iM:.9,ldl:.9,ev:1.5,p:1.1},
  se:{n:'Sud-Est Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:1.2,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  fm:{n:'Franco-Mauricien',ow:25,ob:30,tf:88,tm:102,dR:.8,hR:1,cR:.9,iM:1,ldl:1,ev:1,p:1}
};

// ─── COMORBIDITIES (ADA 2024, IDF MetS, DPP) ───
const COMORB=[
  {id:'dt2',n:'Diabète Type 2',p:14,or:'HR 3.84',d:'IR sévère. Perte espérance vie 8.9 ans.',ca:1.8,gr:.65,cat:'dis',gri_fav:0},
  {id:'predmt',n:'Pré-diabète',p:8,or:'HR 2.11',d:'HbA1c 5.7-6.4%. Réversible.',ca:1.2,gr:.82,cat:'dis',gri_fav:1},
  {id:'hta',n:'HTA établie',p:10,or:'HR 2.24',d:'Facteur aggravant obésité viscérale.',ca:1.1,gr:0,cat:'dis',gri_fav:0},
  {id:'saos',n:'SAOS (Apnée)',p:12,or:'OR 2.19',d:'IR via hypoxie + cortisol nocturne.',ca:1.4,gr:0,cat:'dis',gri_fav:0},
  {id:'sopk',n:'SOPK (Femme)',p:14,or:'OR 2.77',d:'Phénotype IR féminin. GLP-1 efficace.',ca:1.2,gr:.83,cat:'dis',gri_fav:1},
  {id:'nafld',n:'NAFLD / Stéatose',p:10,or:'OR 3.22',d:'IR hépatique.',ca:1.1,gr:.66,cat:'dis',gri_fav:1},
  {id:'hypo',n:'Hypothyroïdie',p:6,or:'OR 1.74',d:'TSH > 4. Métabolisme -10/15%.',ca:1.3,gr:0,cat:'dis',gri_fav:0},
  {id:'mets',n:'Syndrome métabolique',p:12,or:'HR 2.64',d:'≥ 3 critères IDF.',ca:1.3,gr:.65,cat:'dis',gri_fav:1},
  {id:'monw',n:'Phénotype MONW',p:10,or:'OR 2.38',d:'IMC < 25 mais ≥ 2 critères MetS.',ca:1.1,gr:.70,cat:'phe',gri_fav:1},
  {id:'ir_occ',n:'IR occulte',p:8,or:'OR 2.12',d:'TG/HDL > 3.5 non diagnostiqué.',ca:1.2,gr:.55,cat:'phe',gri_fav:1},
  {id:'cortis',n:'Corticoïdes > 3 mois',p:8,or:'HR 2.12',d:'Adipogénèse viscérale iatrogène.',ca:1.6,gr:-.35,cat:'tx',gri_fav:0},
  {id:'antidep',n:'Antidépresseurs obésogènes',p:4,or:'OR 1.58',d:'Paroxétine/mirtazapine.',ca:1.1,gr:0,cat:'tx',gri_fav:0},
  {id:'depres',n:'Dépression traitée',p:6,or:'OR 1.92',d:'Impact métabolique bidirectionnel.',ca:1.2,gr:0,cat:'tx',gri_fav:0}
];

// ─── BIOMARKERS (SCORE2/Framingham, ADA 2024) ───
const BIO=[
  {id:'homaIR',n:'HOMA-IR',u:'',nm:2.5,ab:4,w:2.5,inv:0,t:5,nr:'< 2.5',ar:'≥ 4.0',l:'Résistance insuline'},
  {id:'hba1c',n:'HbA1c',u:'%',nm:5.7,ab:6.5,w:2,inv:0,t:5,nr:'< 5.7',ar:'≥ 6.5',l:'Sucre moyen 3 mois'},
  {id:'glyc',n:'Glycémie à jeun',u:'mmol/L',nm:5.6,ab:7,w:1.8,inv:0,t:5,nr:'< 5.6',ar:'≥ 7.0',l:'Sucre sanguin'},
  {id:'crphs',n:'CRP ultrasensible',u:'mg/L',nm:1,ab:3,w:2,inv:0,t:5,nr:'< 1.0',ar:'≥ 3.0',l:'Inflammation'},
  {id:'tsh',n:'TSH',u:'mUI/L',nm:4,ab:8,w:1.3,inv:0,t:5,nr:'0.4-4.0',ar:'> 4.0',l:'Thyroïde'},
  {id:'ldl',n:'LDL cholestérol',u:'mmol/L',nm:3,ab:4.1,w:1.8,inv:0,t:5,nr:'< 3.0',ar:'≥ 4.1',l:'Mauvais cholestérol'},
  {id:'hdl',n:'HDL cholestérol',u:'mmol/L',nm:1,ab:.7,w:1,inv:1,t:5,nr:'≥ 1.0',ar:'< 0.7',l:'Bon cholestérol'},
  {id:'tg',n:'Triglycérides',u:'mmol/L',nm:1.7,ab:2.3,w:1.5,inv:0,t:10,nr:'< 1.7',ar:'≥ 2.3',l:'Graisses sang'},
  {id:'adipon',n:'Adiponectine',u:'µg/mL',nm:10,ab:6,w:2.5,inv:1,t:10,nr:'≥ 10',ar:'< 6.0',l:'Hormone tissu gras'},
  {id:'asat',n:'Transaminases',u:'UI/L',nm:40,ab:60,w:1,inv:0,t:10,nr:'< 40',ar:'≥ 60',l:'Foie'},
  {id:'apob',n:'ApoB',u:'g/L',nm:.9,ab:1.2,w:1.5,inv:0,t:10,nr:'< 0.9',ar:'≥ 1.2',l:'Risque vasculaire'},
  {id:'ggt',n:'GGT',u:'UI/L',nm:50,ab:80,w:.8,inv:0,t:10,nr:'< 50',ar:'≥ 80',l:'Foie / Alcool'},
  {id:'tghdl',n:'Ratio TG/HDL',u:'',nm:2,ab:3.5,w:2,inv:0,t:15,nr:'< 2.0',ar:'≥ 3.5',l:'IR cachée'},
  {id:'urate',n:'Acide urique',u:'µmol/L',nm:360,ab:420,w:.8,inv:0,t:15,nr:'< 360',ar:'≥ 420',l:'Goutte / MetS'},
  {id:'leptine',n:'Leptine',u:'ng/mL',nm:20,ab:40,w:1.5,inv:0,t:15,nr:'< 20',ar:'≥ 40',l:'Hormone satiété'}
];

// ─── Markov (NEJM 1995 Leibel, NEJM 2011 Sumithran) ───
const MK_ST=['Poids normal','Surpoids léger','Surpoids installé','Surpoids élevé','Obésité modérée','Obésité sévère'];
const MK_B=[[.82,.14,.03,.01,0,0],[.08,.68,.18,.05,.01,0],[.02,.11,.61,.21,.04,.01],[.01,.04,.14,.56,.21,.04],[0,.01,.03,.12,.65,.19],[0,0,.01,.03,.11,.85]];
const MK_CM={dt2:1.4,sopk:1.3,saos:1.25,mets:1.5};
const CTI_G={dur:.185,yoyo:.249,lep:.21,micro:.18,cort:.195,meta:.2,enf:.24};

// ─── STATE ───
let S={
  step:0,dob:'',sexe:'',ethnie:'eu',poids:0,taille:0,imc:0,tt:0,
  parent_ob:0,enf_ob:0,diab_par:0,yoyo:0,
  expo:{air:0,water:0,habitat:0,noise:0,pe_diet:0,pe_cosm:0,pe_prof:0,light:0,socio:0,food:0},
  work:{type:0,hours:0,dist:0,mode:0,schedule:0,stress:0,meals:0,posture:0,toxics:0,retire:0},
  alim:{ultra:0,sucre:0,fibres:0,portions:0,repas:0},
  ap:{cardio:60,muscu:0,marche:20},assis:7,
  sommeil:7,isi:8,tabac:0,alcool_f:0,alcool_q:0,
  stress:14,phq9:5,bes:2,
  comorbIds:[],bioValues:{},
  geo:null,airData:null,weatherData:null,workGeo:null,commuteDist:null,
  bmn_c:0,bmn_k:0,bmn_b:0,bmn_t:0,sii:0,cti:0,gri:0,
  details:{},
  aiInsights:{},aiLoading:false
};

const $=id=>document.getElementById(id);
const h=(el,html)=>{const e=typeof el==='string'?$(el):el;if(e)e.innerHTML=html;};
function getAge(){if(!S.dob)return 0;const b=new Date(S.dob),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return Math.max(0,a);}

// ════════════════════════════════════════════════════════════════
// GEO APIs — Open-Meteo (free, no key) + Nominatim + Haversine
// ════════════════════════════════════════════════════════════════
function haversine(lat1,lon1,lat2,lon2){
  const R=6371,toR=Math.PI/180;
  const dLat=(lat2-lat1)*toR,dLon=(lon2-lon1)*toR;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toR)*Math.cos(lat2*toR)*Math.sin(dLon/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}

async function geocode(query){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=fr`,{headers:{'User-Agent':'ScoreBMN/2.0'}});
    const d=await r.json();
    if(d.length)return{lat:+d[0].lat,lon:+d[0].lon,name:d[0].display_name.split(',').slice(0,2).join(',')};
  }catch(e){console.warn('Geocode error:',e);}
  return null;
}

async function reverseGeocode(lat,lon){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`,{headers:{'User-Agent':'ScoreBMN/2.0'}});
    const d=await r.json();
    return d.display_name?d.display_name.split(',').slice(0,3).join(',').trim():`${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }catch(e){return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;}
}

async function fetchAirQuality(lat,lon){
  const url=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&timezone=auto`;
  const r=await fetch(url);return await r.json();
}

async function fetchWeather(lat,lon){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto`;
  const r=await fetch(url);return await r.json();
}

function aqiToScore(usAqi){
  if(!usAqi||usAqi<=50)return 0;if(usAqi<=100)return 2;if(usAqi<=150)return 4;if(usAqi<=200)return 6;return 8;
}
function aqiLabel(v){
  if(!v)return{l:'—',c:'var(--dim)',e:'🔘'};
  if(v<=50)return{l:'Bon',c:'var(--green)',e:'🟢'};if(v<=100)return{l:'Modéré',c:'var(--orange)',e:'🟡'};
  if(v<=150)return{l:'Sensibles',c:'var(--orange)',e:'🟠'};if(v<=200)return{l:'Malsain',c:'var(--red)',e:'🔴'};
  return{l:'Dangereux',c:'var(--purple)',e:'🟣'};
}
function tempToExpoScore(temp){
  if(temp===null||temp===undefined)return 0;
  if(temp>40)return 4;if(temp>35)return 3;if(temp>30)return 1;if(temp<-5)return 3;if(temp<5)return 1;return 0;
}

// ─── Auto-detect + load ALL data ───
async function autoDetectGeo(){
  h('geoStatus','<div class="geo-loading"><span class="spinner"></span> Détection GPS en cours…</div>');
  try{
    const pos=await new Promise((ok,ko)=>navigator.geolocation.getCurrentPosition(ok,ko,{timeout:12000,enableHighAccuracy:true}));
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    const name=await reverseGeocode(lat,lon);
    S.geo={lat,lon,name};
    h('geoStatus',`<div class="geo-ok">📍 <b>${name}</b></div>`);
    await loadAllGeoData(lat,lon);
  }catch(e){
    h('geoStatus','<div class="geo-warn">⚠️ GPS non disponible. Tapez votre ville ci-dessous.</div>');
  }
}

async function searchCity(){
  const q=$('geoSearch')?.value?.trim();
  if(!q){h('geoStatus','<div class="geo-warn">Entrez une ville.</div>');return;}
  h('geoStatus','<div class="geo-loading"><span class="spinner"></span> Recherche…</div>');
  const g=await geocode(q);
  if(g){
    S.geo={lat:g.lat,lon:g.lon,name:g.name};
    h('geoStatus',`<div class="geo-ok">📍 <b>${g.name}</b></div>`);
    await loadAllGeoData(g.lat,g.lon);
  }else{
    h('geoStatus','<div class="geo-warn">Ville non trouvée. Essayez un autre nom.</div>');
  }
}

async function loadAllGeoData(lat,lon){
  h('geoResults','<div class="geo-loading"><span class="spinner"></span> Chargement qualité air + météo…</div>');
  try{
    const [air,weather]=await Promise.all([fetchAirQuality(lat,lon),fetchWeather(lat,lon)]);
    S.airData=air.current||null;
    S.weatherData=weather.current||null;
    // Auto-compute exposome air score
    const usAqi=S.airData?.us_aqi;
    S.expo.air=aqiToScore(usAqi);
    // Auto-compute temperature impact
    const tempScore=tempToExpoScore(S.weatherData?.temperature_2m);
    renderGeoResults();
  }catch(e){
    h('geoResults','<div class="geo-warn">Erreur API: '+e.message+'</div>');
  }
}

function renderGeoResults(){
  const a=S.airData,w=S.weatherData;if(!a&&!w){h('geoResults','');return;}
  const usAqi=a?.us_aqi;const aq=aqiLabel(usAqi);
  let html='';
  if(a){
    const pols=[{k:'pm2_5',l:'PM2.5',u:'µg/m³',lim:25},{k:'pm10',l:'PM10',u:'µg/m³',lim:50},{k:'nitrogen_dioxide',l:'NO₂',u:'µg/m³',lim:40},{k:'ozone',l:'O₃',u:'µg/m³',lim:100},{k:'sulphur_dioxide',l:'SO₂',u:'µg/m³',lim:40},{k:'carbon_monoxide',l:'CO',u:'µg/m³',lim:4000}].filter(p=>a[p.k]!=null);
    html+=`<div class="geo-card air-card">
      <div class="geo-hd"><span class="geo-tag">${aq.e} Qualité de l'air</span><span class="geo-time">${new Date().toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="aqi-hero"><div class="aqi-num" style="color:${aq.c}">${usAqi||'—'}</div><div class="aqi-lv" style="color:${aq.c}">AQI US — ${aq.l}</div>
        ${a.european_aqi?`<div class="aqi-eu">AQI Europe: ${a.european_aqi}</div>`:''}</div>
      <div class="geo-grid">${pols.map(p=>{
        const v=a[p.k];const over=v>p.lim;
        return`<div class="geo-pill${over?' over':''}"><span class="geo-pill-l">${p.l}</span><span class="geo-pill-v" style="color:${over?'var(--red)':aq.c}">${v?.toFixed?v.toFixed(1):v}</span></div>`;
      }).join('')}
      ${a.uv_index!=null?`<div class="geo-pill${a.uv_index>6?' over':''}"><span class="geo-pill-l">UV</span><span class="geo-pill-v" style="color:${a.uv_index>6?'var(--red)':a.uv_index>3?'var(--orange)':'var(--green)'}">${a.uv_index.toFixed(1)}</span></div>`:''}</div>
      <div class="geo-impact" style="border-color:${aq.c}"><span style="color:${aq.c}">Impact BMN: <b>+${S.expo.air}/8</b> pts exposome atmosphérique</span></div>
      <div class="geo-src">Source: CAMS/Copernicus via Open-Meteo · Données en temps réel</div>
    </div>`;
  }
  if(w){
    const t=w.temperature_2m;const hot=t>35,cold=t<5;
    html+=`<div class="geo-card weather-card">
      <div class="geo-hd"><span class="geo-tag">🌡️ Météo</span></div>
      <div class="weather-grid">
        ${t!=null?`<div class="weather-item main"><div class="weather-val" style="color:${hot?'var(--red)':cold?'var(--cyan)':'var(--green)'}">${t}°C</div><div class="weather-lbl">Température</div></div>`:''}
        ${w.apparent_temperature!=null?`<div class="weather-item"><div class="weather-val">${w.apparent_temperature}°</div><div class="weather-lbl">Ressenti</div></div>`:''}
        ${w.relative_humidity_2m!=null?`<div class="weather-item"><div class="weather-val">${w.relative_humidity_2m}%</div><div class="weather-lbl">Humidité</div></div>`:''}
        ${w.wind_speed_10m!=null?`<div class="weather-item"><div class="weather-val">${w.wind_speed_10m}</div><div class="weather-lbl">km/h vent</div></div>`:''}
      </div>
      ${hot?'<div class="geo-alert hot">🔥 Canicule — Activité extérieure déconseillée. Impact métabolique.</div>':''}
      ${cold?'<div class="geo-alert cold">❄️ Grand froid — Dépense calorique accrue.</div>':''}
    </div>`;
  }
  h('geoResults',html);
}

// ─── Work distance auto ───
async function searchWork(){
  const q=$('workSearch')?.value?.trim();
  if(!q)return;
  h('workDist','<div class="geo-loading"><span class="spinner"></span> Calcul distance…</div>');
  const g=await geocode(q);
  if(g&&S.geo){
    S.workGeo=g;
    S.commuteDist=haversine(S.geo.lat,S.geo.lon,g.lat,g.lon);
    const d=S.commuteDist;
    let sc=0;if(d>60)sc=5;else if(d>30)sc=4;else if(d>15)sc=3;else if(d>5)sc=2;else if(d>0)sc=1;
    S.work.dist=sc;
    h('workDist',`<div class="dist-result">
      <div class="dist-val">${d.toFixed(1)} <span>km</span></div>
      <div class="dist-route">${S.geo.name} → ${g.name}</div>
      <div class="dist-score" style="color:${sc>=3?'var(--orange)':'var(--green)'}">Score distance: ${sc}/5 ${sc>=3?'⚠️':'✅'}</div>
    </div>`);
  }else if(!S.geo){
    h('workDist','<div class="geo-warn">Localisez d\'abord votre domicile (étape Environnement).</div>');
  }else{
    h('workDist','<div class="geo-warn">Lieu non trouvé.</div>');
  }
}

// ════════════════════════════════════════════════════════════════
// CLAUDE AI — Adaptive Intelligence
// ════════════════════════════════════════════════════════════════
let aiDebounce=null;
async function requestAI(question,context){
  if(aiDebounce)clearTimeout(aiDebounce);
  return new Promise((resolve)=>{
    aiDebounce=setTimeout(async()=>{
      try{
        const profile={
          age:getAge(),sexe:S.sexe,ethnie:ETH[S.ethnie]?.n,
          imc:S.imc?.toFixed(1),tt:S.tt,bmn_c:S.bmn_c,bmn_k:S.bmn_k,
          comorbidites:S.comorbIds.map(id=>COMORB.find(c=>c.id===id)?.n).filter(Boolean),
          exposome_air:S.expo.air,geo:S.geo?.name
        };
        const r=await fetch('/api/ai/analyze',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({profile,question:context+' '+question})
        });
        if(r.ok){const d=await r.json();resolve(d);}else resolve(null);
      }catch(e){resolve(null);}
    },1500);
  });
}

async function requestAIInterpret(){
  try{
    const r=await fetch('/api/ai/interpret',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        scores:{bmn_t:S.bmn_t,bmn_c:S.bmn_c,bmn_k:S.bmn_k,bmn_b:S.bmn_b,cti:S.cti,gri:S.gri.toFixed(1),sii:S.sii},
        profile:{age:getAge(),sexe:S.sexe,ethnie:ETH[S.ethnie]?.n,imc:S.imc?.toFixed(1),tt:S.tt,
          comorbidites:S.comorbIds.map(id=>COMORB.find(c=>c.id===id)?.n).filter(Boolean),
          expo_air:S.expo.air,geo:S.geo?.name,commute:S.commuteDist?.toFixed(1)}
      })
    });
    if(r.ok)return await r.json();
  }catch(e){}
  return null;
}

function renderAIBubble(containerId,data){
  const el=$(containerId);if(!el||!data)return;
  const sev=data.severity||'low';
  const col=sev==='critical'?'var(--red)':sev==='high'?'var(--orange)':sev==='moderate'?'var(--accent)':'var(--teal)';
  let html=`<div class="ai-bubble" style="border-color:${col}">
    <div class="ai-hd"><span class="ai-tag">🤖 IA</span><span class="ai-sev" style="color:${col}">${sev==='critical'?'🔴 Critique':sev==='high'?'🟠 Élevé':sev==='moderate'?'🔵 Modéré':'🟢 Faible'}</span></div>
    <div class="ai-text">${data.analysis||''}</div>`;
  if(data.risk_flags?.length){
    html+=`<div class="ai-flags">${data.risk_flags.map(f=>`<span class="ai-flag">⚠️ ${f}</span>`).join('')}</div>`;
  }
  if(data.suggestions?.length){
    html+=`<div class="ai-sugg">${data.suggestions.map(s=>`<div class="ai-sugg-item">💡 ${s}</div>`).join('')}</div>`;
  }
  html+=`</div>`;
  el.innerHTML=html;
}

// ════════════════════════════════════════════════════════════════
// FORM BUILDERS with live quantification
// ════════════════════════════════════════════════════════════════
function getN(k){if(k.startsWith('expo_'))return S.expo[k.slice(5)]||0;if(k.startsWith('work_'))return S.work[k.slice(5)]||0;if(k.startsWith('alim_'))return S.alim[k.slice(5)]||0;if(k.startsWith('ap_'))return S.ap[k.slice(3)]||0;return S[k]??0;}
function setN(k,v){if(k.startsWith('expo_'))S.expo[k.slice(5)]=v;else if(k.startsWith('work_'))S.work[k.slice(5)]=v;else if(k.startsWith('alim_'))S.alim[k.slice(5)]=v;else if(k.startsWith('ap_'))S.ap[k.slice(3)]=v;else S[k]=v;calc();updateBadge();}

function sel(label,key,opts,ref,maxPts){
  const cur=getN(key);
  const maxV=Math.max(...opts.map(o=>+o[0]));
  const pct=maxV>0?Math.round(cur/maxV*100):0;
  const col=pct>=60?'var(--red)':pct>=30?'var(--orange)':'var(--green)';
  return `<div class="fc"><div class="fc-top"><div class="fc-label">${label}${ref?`<span class="ref">${ref}</span>`:''}</div>
    ${maxPts?`<div class="fc-score" style="color:${col}">${cur}/${maxPts||maxV}</div>`:''}</div>
    <select class="fc-input" onchange="setN('${key}',+this.value);render(S.step,0)">
    ${opts.map(o=>`<option value="${o[0]}"${cur==o[0]?' selected':''}>${o[1]}</option>`).join('')}
    </select></div>`;
}

function sld(label,key,val,min,max,step,unit,ref,maxPts){
  return `<div class="fc"><div class="fc-top"><div class="fc-label">${label}${ref?`<span class="ref">${ref}</span>`:''}</div>
    ${maxPts?`<div class="fc-score">${val}</div>`:''}</div>
    <div class="sld"><div class="sld-big" id="sv_${key}">${val}</div>
    ${unit?`<div class="sld-unit">${unit}</div>`:''}
    <input type="range" min="${min}" max="${max}" value="${val}" step="${step}"
      oninput="setN('${key}',+this.value);$('sv_${key}').textContent=this.value">
    <div class="sld-lbl"><span>${min}</span><span>${max}</span></div></div></div>`;
}

// ════════════════════════════════════════════════════════════════
// SCREENS — 17 écrans progressifs grand public
// ════════════════════════════════════════════════════════════════
const SCR=[
  // 0: Welcome
  ()=>`<div class="welc">
    <div class="welc-logo">B</div>
    <h1>Score <b>BMN</b> v2.0</h1>
    <p class="welc-desc">Évaluez votre risque métabolique en quelques minutes grâce à l'intelligence artificielle et des données environnementales en temps réel.</p>
    <div class="welc-features">
      <div class="welc-feat"><span>🤖</span><span>IA Claude adaptative</span></div>
      <div class="welc-feat"><span>🌍</span><span>Données géo en direct</span></div>
      <div class="welc-feat"><span>📊</span><span>17 modules validés</span></div>
      <div class="welc-feat"><span>🔬</span><span>15 biomarqueurs</span></div>
    </div>
    <button class="welc-go" onclick="go(1)">Commencer l'évaluation →</button>
    <div class="welc-refs">Réf. OMS · IDF 2006 · ADA 2024 · FINDRISC · IPAQ · PHQ-9 · PSS-10 · ISI · BES · AUDIT-C · Lancet 2016 · SCORE2</div>
    <div class="welc-disclaimer">⚕️ Cet outil ne remplace pas une consultation médicale. Résultats à usage informatif.</div>
  </div>`,

  // 1: DOB
  ()=>{const age=getAge();
    let ageRisk='';
    if(age>=65)ageRisk='<div class="info-badge red">Risque sarcopénique accru. Suivi renforcé.</div>';
    else if(age>=45)ageRisk='<div class="info-badge orange">> 45 ans: risque métabolique augmenté.</div>';
    else if(age<18)ageRisk='<div class="info-badge blue">Mineur: seuils pédiatriques applicables.</div>';
    return `<div class="s-emoji">🎂</div>
    <div class="s-title">Date de naissance</div>
    <div class="s-sub">L'âge influence le métabolisme de base et les seuils de risque. <span class="ref">OMS</span></div>
    <div class="fc"><div class="fc-label">Date de naissance</div>
      <input type="date" class="fc-input" id="inp_dob" value="${S.dob}" onchange="S.dob=this.value;render(S.step,0)"></div>
    ${age>0?`<div class="age-display"><div class="age-num">${age}</div><div class="age-lbl">ans</div></div>${ageRisk}`:''}
    <div id="aiBox1"></div>`;
  },

  // 2: Sex
  ()=>{const o=[{v:'f',i:'♀',t:'Femme',s:'Seuils TT ♀, SOPK, hormones féminines'},{v:'m',i:'♂',t:'Homme',s:'Graisse viscérale ♂, seuils masculins'}];
    return `<div class="s-emoji">👤</div>
    <div class="s-title">Sexe biologique</div>
    <div class="s-sub">Les seuils de tour de taille et certaines pathologies diffèrent selon le sexe. <span class="ref">IDF 2006</span></div>
    <div class="opts">${o.map(x=>`<div class="opt${S.sexe===x.v?' sel':''}" onclick="S.sexe='${x.v}';render(S.step,0)">
      <div class="opt-ico">${x.i}</div><div class="opt-txt"><b>${x.t}</b><small>${x.s}</small></div>
      <div class="opt-chk">${S.sexe===x.v?'✓':''}</div></div>`).join('')}</div>`;
  },

  // 3: Ethnicity
  ()=>{const list=Object.entries(ETH).map(([k,v])=>({k,...v}));
    return `<div class="s-emoji">🌍</div>
    <div class="s-title">Origine ethnique</div>
    <div class="s-sub">Les seuils d'obésité et risques métaboliques varient significativement selon l'origine. <span class="ref">OMS 2004</span> <span class="ref">IDF 2006</span> <span class="ref">Lancet 2016</span></div>
    <div class="opts opts-compact">${list.map(o=>`<div class="opt${S.ethnie===o.k?' sel':''}" onclick="S.ethnie='${o.k}';render(S.step,0)">
      <div class="opt-txt"><b>${o.n}</b><small>IMC: ${o.ow}/${o.ob} · DT2 ×${o.dR} · CV ×${o.cR} · HTA ×${o.hR}</small></div>
      <div class="opt-chk">${S.ethnie===o.k?'✓':''}</div></div>`).join('')}</div>`;
  },

  // 4: Weight & Height
  ()=>{
    const e=ETH[S.ethnie]||ETH.eu;
    const imc=S.taille>0?(S.poids/((S.taille/100)**2)):0;S.imc=parseFloat(imc.toFixed(1))||0;
    let col='var(--green)',lbl='Normal',pts=0;
    if(S.imc>=e.ob+5){col='var(--red)';lbl='Obésité sévère';pts=10;}
    else if(S.imc>=e.ob){col='var(--orange)';lbl='Obésité';pts=6;}
    else if(S.imc>=e.ow){col='var(--orange)';lbl='Surpoids';pts=3;}
    return `<div class="s-emoji">⚖️</div>
    <div class="s-title">Poids & Taille</div>
    <div class="s-sub">IMC calculé avec seuils ethniques (<b>${e.n}</b>). <span class="ref">OMS</span> <span class="ref">WHO Asia-Pacific</span></div>
    <div class="fc"><div class="fc-label">Poids (kg)</div><input type="number" class="fc-input" value="${S.poids||''}" placeholder="Ex: 72" step="0.1" min="30" max="300" oninput="S.poids=+this.value;render(S.step,0)"></div>
    <div class="fc"><div class="fc-label">Taille (cm)</div><input type="number" class="fc-input" value="${S.taille||''}" placeholder="Ex: 165" min="100" max="250" oninput="S.taille=+this.value;render(S.step,0)"></div>
    ${S.poids>0&&S.taille>0?`
    <div class="metric-hero"><div class="metric-main" style="color:${col}">${S.imc.toFixed(1)}</div><div class="metric-lbl">IMC — ${lbl}</div>
      <div class="metric-pts" style="color:${col}">${pts}/10 pts</div></div>
    <div class="mrow">
      <div class="mbox"><div class="mbox-lbl">Surpoids dès</div><div class="mbox-val">${e.ow}</div></div>
      <div class="mbox"><div class="mbox-lbl">Obésité dès</div><div class="mbox-val">${e.ob}</div></div>
      <div class="mbox"><div class="mbox-lbl">Poids idéal</div><div class="mbox-val">${(22*(S.taille/100)**2).toFixed(0)} kg</div></div>
    </div>`:''}`
  },

  // 5: Waist
  ()=>{const e=ETH[S.ethnie]||ETH.eu;const seuil=S.sexe==='f'?e.tf:e.tm;
    const whtr=S.taille>0?(S.tt/S.taille):0;
    let col='var(--green)',lbl='Normal',pts=0;
    if(S.tt>seuil+10){col='var(--red)';lbl='Très élevé';pts=15;}else if(S.tt>seuil+5){col='var(--orange)';lbl='Élevé';pts=11;}else if(S.tt>seuil){col='var(--orange)';lbl='Au-dessus du seuil';pts=7;}
    let whtrPts=0;if(whtr>=.6)whtrPts=9;else if(whtr>=.55)whtrPts=6;else if(whtr>=.5)whtrPts=3;
    return `<div class="s-emoji">📏</div>
    <div class="s-title">Tour de taille</div>
    <div class="s-sub">Meilleur indicateur de graisse viscérale. Seuil ${S.sexe==='f'?'♀':'♂'} ${e.n}: <b>${seuil} cm</b>. <span class="ref">IDF</span> <span class="ref">BMJ Open 2016</span></div>
    <div class="fc"><div class="fc-explain">💡 Mesurez debout, à mi-distance entre la dernière côte et la crête iliaque, en expirant normalement.</div>
    <div class="sld"><div class="sld-big" id="sv_tt">${S.tt||'—'}</div><div class="sld-unit">centimètres</div>
    <input type="range" min="55" max="180" value="${S.tt||80}" step="1" oninput="S.tt=+this.value;render(S.step,0)">
    <div class="sld-lbl"><span>55</span><span style="color:var(--orange)">${seuil} seuil</span><span>180</span></div></div></div>
    ${S.tt>0?`<div class="mrow">
      <div class="mbox"><div class="mbox-lbl">Tour taille</div><div class="mbox-val" style="color:${col}">${S.tt}</div><div class="mbox-sub">${lbl} · ${pts}/15 pts</div></div>
      <div class="mbox"><div class="mbox-lbl">WHtR</div><div class="mbox-val" style="color:${whtr>=.5?'var(--orange)':'var(--green)'}">${whtr.toFixed(3)}</div><div class="mbox-sub">seuil 0.50 · ${whtrPts}/9 pts</div></div>
      <div class="mbox"><div class="mbox-lbl">Seuil</div><div class="mbox-val">${seuil}</div><div class="mbox-sub">${S.sexe==='f'?'♀':'♂'} ${e.n.split(' ')[0]}</div></div></div>`:''}`
  },

  // 6: Family
  ()=>`<div class="s-emoji">🧬</div>
    <div class="s-title">Antécédents familiaux</div>
    <div class="s-sub">La génétique explique 40-70% du risque d'obésité. <span class="ref">Lancet 2016</span> <span class="ref">Diabetologia 2014</span></div>
    ${sel('Parents en surpoids/obésité','parent_ob',[['0','Aucun parent'],['1','Un parent (risque ×3)'],['2','Les deux parents (risque ×8)']],'INTERHEART',10)}
    ${sel('Obésité dans l\'enfance (< 12 ans)','enf_ob',[['0','Non'],['1','Léger surpoids'],['2','Oui, obèse enfant (chronicisation)']],'Lancet 2016',10)}
    ${sel('Diabète type 2 familial','diab_par',[['0','Non'],['1','Un parent DT2'],['2','Deux parents DT2']],'ADA 2024',5)}
    ${sel('Régimes yoyo (≥ 3 reprises)','yoyo',[['0','Non (0-2 régimes)'],['1','Oui, ≥ 3 cycles (NEJM Sumithran)']],'NEJM 2011',5)}
    <div id="aiBox6"></div>`,

  // 7: Geo + Air + Weather (AUTO)
  ()=>{
    // Auto-detect on first visit
    if(!S.geo)setTimeout(autoDetectGeo,300);
    return `<div class="s-emoji">🌍</div>
    <div class="s-title">Environnement géographique</div>
    <div class="s-sub">Qualité de l'air et température détectées automatiquement par GPS. <span class="ref">CAMS/Copernicus</span> <span class="ref">Open-Meteo</span></div>
    <div class="fc">
      <div class="fc-label">📍 Votre localisation</div>
      <div id="geoStatus">${S.geo?`<div class="geo-ok">📍 <b>${S.geo.name}</b></div>`:''}</div>
      <div class="geo-btns">
        <button class="btn btn-p btn-sm" onclick="autoDetectGeo()"><span>📍</span> GPS automatique</button>
      </div>
      <div class="geo-or">ou recherchez manuellement</div>
      <div class="geo-search-row">
        <input type="text" class="fc-input" id="geoSearch" placeholder="Tapez votre ville…">
        <button class="btn btn-p btn-sm" onclick="searchCity()">🔍</button>
      </div>
    </div>
    <div id="geoResults">${S.airData?'':''}</div>`;
  },

  // 8: Exposome
  ()=>`<div class="s-emoji">🏭</div>
    <div class="s-title">Exposome environnemental</div>
    <div class="s-sub">10 facteurs d'exposition quotidienne. Score air pré-rempli par les données GPS. <span class="ref">OMS PE</span></div>
    ${S.airData?`<div class="auto-filled">✅ Score air automatique: <b>${S.expo.air}/8</b> (AQI ${S.airData.us_aqi})</div>`:''}
    ${sel('Source d\'eau','expo_water',[['0','Eau filtrée / osmose'],['1','Eau du robinet contrôlée'],['2','Bouteilles plastique (BPA)'],['3','Source non traitée'],['4','Eau potentiellement polluée']],'OMS',4)}
    ${sel('Proximité route à fort trafic','expo_habitat',[['0','> 500m'],['1','200-500m'],['2','100-200m'],['3','< 100m'],['5','Zone industrielle']],'',5)}
    ${sel('Bruit nocturne','expo_noise',[['0','Silence (< 40 dB)'],['1','Modéré (40-55 dB)'],['2','Important (55-70 dB)'],['4','Très fort (> 70 dB)']],'OMS bruit',4)}
    ${sel('PE alimentaires (plastiques/conserves)','expo_pe_diet',[['0','Verre/inox exclusif'],['1','Parfois plastique'],['2','Souvent plastique'],['3','Quotidien'],['5','Réchauffe dans plastique']],'OMS PE',5)}
    ${sel('PE cosmétiques','expo_pe_cosm',[['0','Bio/naturels'],['1','Modérés'],['2','Nombreux (> 5/jour)'],['4','Industriels intensifs']],'',4)}
    ${sel('PE professionnels','expo_pe_prof',[['0','Aucune exposition'],['1','Faible'],['2','Modérée'],['3','Élevée'],['5','Solvants/pesticides']],'',5)}
    ${sel('Écrans le soir (> 21h)','expo_light',[['0','< 30 min'],['1','30 min à 2h'],['2','> 2h'],['3','> 4h (mélatonine -50%)']],'',3)}
    ${sel('Précarité socio-économique','expo_socio',[['0','Aisée'],['1','Correcte'],['2','Difficile'],['3','Budget serré'],['5','Insécurité alimentaire']],'FINDRISC',5)}
    ${sel('Désert alimentaire','expo_food',[['0','Accès facile (< 10 min)'],['1','10-20 min'],['2','> 20 min'],['3','Très difficile'],['4','Fast-food omniprésent']],'',4)}
    <div id="aiBox8"></div>`,

  // 9: Work
  ()=>`<div class="s-emoji">💼</div>
    <div class="s-title">Profil professionnel</div>
    <div class="s-sub">Type de travail, distance, horaires, stress, restauration, retraite — <b>10 dimensions</b>. <span class="ref">Biswas 2015</span> <span class="ref">Karasek</span></div>
    ${sel('Type de travail','work_type',[['0','Très actif (BTP, agricole)'],['1','Actif (debout, soins)'],['2','Mixte (assis/debout)'],['3','Plutôt assis'],['4','Bureau 6-8h'],['5','Très sédentaire (> 8h)'],['6','Télétravail intensif']],'',6)}
    ${sel('Heures / semaine','work_hours',[['0','< 35h'],['1','35-40h'],['2','40-48h'],['3','48-55h'],['4','55-65h'],['5','> 65h']],'',5)}
    <div class="fc"><div class="fc-top"><div class="fc-label">📍 Lieu de travail <span class="ref">Distance auto</span></div></div>
      <div class="fc-explain">Distance calculée automatiquement depuis votre domicile GPS.</div>
      <div class="geo-search-row">
        <input type="text" class="fc-input" id="workSearch" placeholder="Adresse ou ville du travail…">
        <button class="btn btn-p btn-sm" onclick="searchWork()">📍</button>
      </div></div>
    <div id="workDist">${S.commuteDist?`<div class="dist-result"><div class="dist-val">${S.commuteDist.toFixed(1)} <span>km</span></div></div>`:''}</div>
    ${sel('Mode de transport','work_mode',[['0','Marche / vélo 🚲'],['1','Transport en commun 🚇'],['2','Voiture < 30 min 🚗'],['3','Voiture > 30 min']],'',3)}
    ${sel('Horaires','work_schedule',[['0','Journée standard'],['1','Horaires décalés'],['2','Nuit parfois'],['3','Nuit régulière (OR 1.29)'],['4','Poste 3×8'],['5','Gardes 24h']],'Lane 2024',5)}
    ${sel('Stress professionnel (Karasek)','work_stress',[['0','Faible'],['1','Modéré'],['2','Élevé'],['3','Très élevé'],['4','Harcèlement'],['6','Burn-out + arrêt']],'Karasek',6)}
    ${sel('Repas du midi','work_meals',[['0','Repas maison équilibré 🥗'],['1','Cantine équilibrée'],['2','Cantine déséquilibrée'],['3','Sandwich / fast-food 🍔'],['4','Saute le repas'],['5','Grignotage continu']],'',5)}
    ${sel('Posture dominante','work_posture',[['0','Debout dynamique'],['1','Alternance assis/debout'],['2','Assis avec pauses'],['3','Assis > 4h sans pause'],['4','Assis > 6h immobile']],'',4)}
    ${sel('Exposition toxiques professionnels','work_toxics',[['0','Aucune'],['1','Faible'],['2','Modérée'],['3','Élevée'],['4','Solvants'],['5','Pesticides/radiations']],'',5)}
    ${sel('Retraite','work_retire',[['0','Non concerné'],['1','Retraite active'],['2','Retraite sédentaire'],['3','Sédentaire + prise de poids'],['4','Isolement social'],['5','Isolement + dépression']],'',5)}`,

  // 10: Diet
  ()=>`<div class="s-emoji">🍽️</div>
    <div class="s-title">Alimentation</div>
    <div class="s-sub">DQI-BMN — 5 dimensions nutritionnelles. Score élevé = mauvaise qualité alimentaire. <span class="ref">DQI-BMN</span></div>
    ${sel('Ultra-transformés (AUT)','alim_ultra',[['0','Rarement (< 1×/sem)'],['1','2-3×/semaine'],['2','4-6×/semaine'],['3','Tous les jours']],'NOVA',3)}
    ${sel('Boissons sucrées','alim_sucre',[['0','Jamais / eau uniquement'],['1','1-2×/semaine'],['2','3-5×/semaine'],['3','Quotidien']],'',3)}
    ${sel('Fruits & légumes (portions/jour)','alim_fibres',[['0','≥ 5 portions (optimal)'],['1','3-4 portions'],['2','1-2 portions'],['3','Presque aucun']],'OMS 5/j',3)}
    ${sel('Taille des portions','alim_portions',[['0','Normales'],['1','Légèrement grandes'],['2','Grandes'],['3','Très grandes']],'',3)}
    ${sel('Structure des repas','alim_repas',[['0','3 repas structurés'],['1','Irréguliers'],['2','Saute repas + grignotage'],['3','Totalement désorganisés']],'',3)}`,

  // 11: Physical activity
  ()=>`<div class="s-emoji">🏃</div>
    <div class="s-title">Activité physique</div>
    <div class="s-sub">IPAQ détaillé par type. OMS recommande ≥ <b>150 min/semaine</b> modérée. <span class="ref">OMS 2020</span> <span class="ref">IPAQ</span></div>
    ${sld('Cardio','ap_cardio',S.ap.cardio,0,300,10,'min/semaine','IPAQ')}
    ${sld('Renforcement musculaire','ap_muscu',S.ap.muscu,0,180,10,'min/semaine','')}
    ${sld('Marche quotidienne','ap_marche',S.ap.marche,0,120,5,'min/jour','')}
    ${sld('Temps assis total','assis',S.assis,1,16,.5,'heures/jour','Biswas 2015')}
    <div id="aiBox11"></div>`,

  // 12: Sleep & substances
  ()=>`<div class="s-emoji">😴</div>
    <div class="s-title">Sommeil & substances</div>
    <div class="s-sub">Durée, qualité (ISI), tabac et alcool — 4 axes de risque. <span class="ref">Cappuccio 2008</span> <span class="ref">ISI</span></div>
    ${sld('Durée de sommeil','sommeil',S.sommeil,3,12,.5,'heures/nuit','Cappuccio')}
    ${sld('Score ISI (insomnie, 0-28)','isi',S.isi,0,28,1,'/ 28','ISI')}
    ${sel('Tabac','tabac',[['0','Jamais fumé'],['1','Arrêté > 1 an'],['2','Arrêté < 1 an (risque résiduel)'],['3','< 10 cig/jour'],['4','≥ 10 cig/jour']],'Aubin 2012',4)}
    ${sel('Alcool: fréquence','alcool_f',[['0','Jamais'],['1','2-4×/mois'],['2','2-3×/semaine'],['3','4+×/semaine']],'AUDIT-C',3)}
    ${sel('Alcool: quantité/occasion','alcool_q',[['0','1-2 verres'],['1','3-4'],['2','5-6'],['3','7-9'],['4','10+']],'',4)}`,

  // 13: Mental health
  ()=>`<div class="s-emoji">🧠</div>
    <div class="s-title">Santé mentale</div>
    <div class="s-sub">Stress perçu (PSS-10), dépression (PHQ-9), hyperphagie (BES). Axe bidirectionnel avec l'obésité. <span class="ref">PSS-10</span> <span class="ref">PHQ-9</span> <span class="ref">BES</span></div>
    ${sld('Stress PSS-10','stress',S.stress,0,40,1,'/ 40','PSS-10')}
    ${sld('Dépression PHQ-9','phq9',S.phq9,0,27,1,'/ 27','PHQ-9')}
    ${sld('Hyperphagie BES','bes',S.bes,0,8,1,'/ 8','BES')}
    <div id="aiBox13"></div>`,

  // 14: Comorbidities
  ()=>{
    const dis=COMORB.filter(c=>c.cat==='dis'),phe=COMORB.filter(c=>c.cat==='phe'),tx=COMORB.filter(c=>c.cat==='tx');
    const mk=arr=>arr.map(c=>`<div class="cm-card${S.comorbIds.includes(c.id)?' on':''}" onclick="toggleCM('${c.id}')">
      <div class="cm-top"><span class="cm-nm">${c.n}</span><span class="cm-pts" style="color:${S.comorbIds.includes(c.id)?'var(--orange)':'var(--dim3)'}">+${c.p}</span></div>
      <div class="cm-meta">${c.or} — ${c.d}</div></div>`).join('');
    return `<div class="s-emoji">🏥</div>
    <div class="s-title">Comorbidités</div>
    <div class="s-sub">BMN-K: <b>11 comorbidités + phénotypes + traitements</b>. Comorbidity Floor si K > 30. <span class="ref">ADA 2024</span> <span class="ref">IDF MetS</span></div>
    <div class="sec"><div class="sec-tt">Maladies établies</div>${mk(dis)}</div>
    <div class="sec"><div class="sec-tt">Phénotypes métaboliques</div>${mk(phe)}</div>
    <div class="sec"><div class="sec-tt">Traitements aggravants</div>${mk(tx)}</div>
    <div id="aiBox14"></div>`;
  },

  // 15: Bio
  ()=>{calc();const pl=getPanelLvl();const markers=BIO.filter(m=>m.t<=Math.max(5,pl));
    return `<div class="s-emoji">🔬</div>
    <div class="s-title">Biologie (optionnel)</div>
    <div class="s-sub">Si vous avez des résultats récents, entrez-les. Panel ${pl<=5?'basique (P5)':pl<=10?'intermédiaire (P10)':'complet (P15)'} — <b>${markers.length} marqueurs</b>. <span class="ref">SCORE2</span> <span class="ref">ADA 2024</span></div>
    ${S.sii>=2?'<div class="auto-filled orange">⚠️ SII ≥ 2 → Panel P5 obligatoire (inflammation indirecte détectée)</div>':''}
    <div class="fc">${markers.map(m=>`<div class="bio-row">
      <div class="bio-inf"><div class="bio-nm">${m.n}${m.u?' <small>('+m.u+')</small>':''}</div><div class="bio-rg">${m.l}: <span class="bio-ok">${m.nr}</span> / <span class="bio-bad">${m.ar}</span></div></div>
      <input type="number" class="bio-inp" id="bio_${m.id}" value="${S.bioValues[m.id]??''}" step="0.01" placeholder="—"
        oninput="S.bioValues['${m.id}']=this.value===''?undefined:+this.value;calc();doRetro()">
      <span class="bio-tier" style="background:${m.t<=5?'var(--red-bg);color:var(--red)':m.t<=10?'var(--orange-bg);color:var(--orange)':'var(--accent-bg);color:var(--accent)'}">P${m.t}</span>
    </div>`).join('')}</div>
    <div id="retro"></div>`;
  },

  // 16: Final Result
  ()=>{calc();return renderFinal();}
];

const NTOT=SCR.length;
const SECTIONS=[
  {from:0,to:0,name:'Accueil',ico:'🏠'},{from:1,to:3,name:'Identité',ico:'👤'},
  {from:4,to:5,name:'Mesures',ico:'📐'},{from:6,to:6,name:'Famille',ico:'🧬'},
  {from:7,to:8,name:'Environnement',ico:'🌍'},{from:9,to:9,name:'Travail',ico:'💼'},
  {from:10,to:11,name:'Mode de vie',ico:'🍎'},{from:12,to:13,name:'Santé',ico:'🧠'},
  {from:14,to:14,name:'Pathologies',ico:'🏥'},{from:15,to:15,name:'Biologie',ico:'🔬'},
  {from:16,to:16,name:'Résultat',ico:'📊'}
];
function getSec(step){return SECTIONS.find(s=>step>=s.from&&step<=s.to)||SECTIONS[0];}
function toggleCM(id){if(S.comorbIds.includes(id))S.comorbIds=S.comorbIds.filter(x=>x!==id);else S.comorbIds.push(id);render(S.step,0);}

// ════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════
let curEl=null;
function go(step,dir){if(step<0||step>=NTOT)return;if(dir===undefined)dir=step>S.step?1:step<S.step?-1:0;S.step=step;calc();render(step,dir);}

function render(step,dir){
  const wrap=$('scrWrap');if(!wrap)return;
  const html=SCR[step]();const el=document.createElement('div');
  el.className='scr'+(dir>0?' in-r':dir<0?' in-l':'');el.innerHTML=html;
  if(curEl&&dir!==0){curEl.className='scr'+(dir>0?' out-l':' out-r');const old=curEl;setTimeout(()=>old.remove(),300);}
  else if(curEl)curEl.remove();
  wrap.appendChild(el);curEl=el;
  const sec=getSec(step);h('hdrSec',sec.ico+' '+sec.name);h('hdrStep',`${step}/${NTOT-1}`);
  const pf=$('pgFill');if(pf)pf.style.width=(step/(NTOT-1)*100)+'%';
  updateBadge();renderNav(step);
  // Re-render geo data if on step 7
  if(step===7&&S.airData)setTimeout(renderGeoResults,50);
  if(step===15)setTimeout(doRetro,60);
  // AI analysis on key screens
  triggerAI(step);
}

function renderNav(step){
  const nav=$('bNav');if(!nav)return;
  if(step===0){nav.innerHTML='';return;}
  const last=step===NTOT-1;
  nav.innerHTML=`<button class="btn btn-s" onclick="go(${step-1},-1)">← Retour</button>
    ${last?`<button class="btn btn-d btn-sm" onclick="resetAll()">🔄</button><button class="btn btn-p btn-sm" onclick="window.print()">🖨️</button>`
    :`<button class="btn btn-p" onclick="go(${step+1},1)">Suivant →</button>`}`;
}

function updateBadge(){const el=$('hdrScore');if(!el)return;if(S.step<2){el.textContent='';el.style.display='none';return;}calc();el.style.display='';el.textContent=`${S.bmn_c}`;}

// ─── AI trigger on specific screens ───
function triggerAI(step){
  const aiScreens={
    6:{id:'aiBox6',q:'Analyse les antécédents familiaux. Yoyo='+S.yoyo+', parents obèses='+S.parent_ob+', enfant obèse='+S.enf_ob+', DT2 familial='+S.diab_par},
    8:{id:'aiBox8',q:'Analyse l\'exposome. Score air='+S.expo.air+', AQI='+(S.airData?.us_aqi||'?')+'. Quels facteurs sont critiques ?'},
    11:{id:'aiBox11',q:'Activité physique: cardio='+S.ap.cardio+'min/sem, muscu='+S.ap.muscu+'min/sem, marche='+S.ap.marche+'min/j, assis='+S.assis+'h/j. L\'OMS recommande 150min. Analyse.'},
    13:{id:'aiBox13',q:'Santé mentale: stress PSS-10='+S.stress+'/40, PHQ-9='+S.phq9+'/27, BES='+S.bes+'/8. Impact sur le poids ?'},
    14:{id:'aiBox14',q:'Comorbidités sélectionnées: '+S.comorbIds.join(',')+'. Analyse les interactions et impact sur BMN-K.'}
  };
  if(aiScreens[step]){
    const cfg=aiScreens[step];
    const box=$(cfg.id);if(!box)return;
    box.innerHTML='<div class="ai-loading"><span class="spinner"></span> Analyse IA en cours…</div>';
    requestAI(cfg.q,'Écran '+step).then(d=>{
      if(d)renderAIBubble(cfg.id,d);
      else{const b=$(cfg.id);if(b)b.innerHTML='';}
    });
  }
}

// ════════════════════════════════════════════════════════════════
// CALCULATION ENGINE — BMN v2.0 ABCKO+ (exact algorithm)
// ════════════════════════════════════════════════════════════════
function calc(){
  const e=ETH[S.ethnie]||ETH.eu,sex=S.sexe,imc=S.imc,tt=S.tt,taille=S.taille;
  const whtr=taille>0?tt/taille:0,ttSeuil=sex==='f'?e.tf:e.tm;
  let c=0;const d={};

  // IMC 0-10
  let p=0;if(imc>=e.ob+5)p=10;else if(imc>=e.ob)p=6;else if(imc>=e.ow)p=3;
  d.imc={pts:p,max:10,label:'IMC',ref:'OMS/IDF'};c+=p;
  // TT 0-15
  p=0;if(tt>ttSeuil+10)p=15;else if(tt>ttSeuil+5)p=11;else if(tt>ttSeuil)p=7;
  d.tt={pts:p,max:15,label:'Tour de taille',ref:'IDF 2006'};c+=p;
  // WHtR 0-9
  p=0;if(whtr>=.6)p=9;else if(whtr>=.55)p=6;else if(whtr>=.5)p=3;
  d.whtr={pts:p,max:9,label:'WHtR',ref:'BMJ Open 2016'};c+=p;
  // Family 0-25
  let fam=0;if(S.parent_ob>=2)fam+=10;else if(S.parent_ob>=1)fam+=8;
  if(S.enf_ob>=2)fam+=10;else if(S.enf_ob>=1)fam+=6;
  if(S.diab_par>=2)fam+=5;else if(S.diab_par>=1)fam+=3;
  d.family={pts:fam,max:25,label:'Famille/Génétique',ref:'Lancet 2016'};c+=fam;
  // Alim 0-15 (DQI-BMN)
  const alimT=Math.min(15,S.alim.ultra+S.alim.sucre+S.alim.fibres+S.alim.portions+S.alim.repas);
  d.alim={pts:alimT,max:15,label:'Alimentation (DQI-BMN)',ref:'NOVA/OMS'};c+=alimT;
  // AP 0-9 (IPAQ)
  const apT=S.ap.cardio+S.ap.muscu+S.ap.marche*3.5;
  p=0;if(apT<30)p=9;else if(apT<75)p=6;else if(apT<150)p=3;
  d.ap={pts:p,max:9,label:'Activité physique',ref:'IPAQ/OMS'};c+=p;
  // Assis 0-9
  p=0;if(S.assis>=10)p=9;else if(S.assis>=8)p=6;else if(S.assis>=6)p=3;
  d.assis={pts:p,max:9,label:'Sédentarité',ref:'Biswas 2015'};c+=p;
  // Sleep 0-7
  p=0;if(S.sommeil<5||S.sommeil>10)p=7;else if(S.sommeil<6||S.sommeil>9)p=4;else if(S.sommeil<7)p=2;
  d.sleep={pts:p,max:7,label:'Sommeil',ref:'Cappuccio 2008'};c+=p;
  // ISI 0-8
  p=0;if(S.isi>=22)p=8;else if(S.isi>=15)p=6;else if(S.isi>=8)p=3;
  d.isi={pts:p,max:8,label:'Insomnie (ISI)',ref:'ISI'};c+=p;
  // Tabac 0-8
  p=0;if(S.tabac==4)p=8;else if(S.tabac==3)p=5;else if(S.tabac==2)p=6;else if(S.tabac==1)p=1;
  d.tabac={pts:p,max:8,label:'Tabac',ref:'Aubin 2012'};c+=p;
  // Alcool 0-5
  p=Math.min(5,S.alcool_f+S.alcool_q);d.alcool={pts:p,max:5,label:'Alcool',ref:'AUDIT-C'};c+=p;
  // Stress 0-10
  const sr=S.stress/40;
  p=0;if(sr>=.6)p=10;else if(sr>=.4)p=7;else if(sr>=.25)p=4;
  d.stress={pts:p,max:10,label:'Stress (PSS-10)',ref:'PSS-10'};c+=p;
  // PHQ-9 0-10
  p=0;if(S.phq9>=20)p=10;else if(S.phq9>=15)p=7;else if(S.phq9>=10)p=5;else if(S.phq9>=5)p=2;
  d.phq9={pts:p,max:10,label:'Dépression (PHQ-9)',ref:'PHQ-9'};c+=p;
  // BES 0-8
  p=0;if(S.bes>=6)p=8;else if(S.bes>=4)p=5;else if(S.bes>=2)p=2;
  d.bes={pts:p,max:8,label:'Hyperphagie (BES)',ref:'BES'};c+=p;
  // Yoyo 0-5
  if(S.yoyo>=1)c+=5;d.yoyo={pts:S.yoyo>=1?5:0,max:5,label:'Régimes yoyo',ref:'NEJM 2011'};
  // Exposome 0-15
  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  p=Math.round(expoT*15/47);d.expo={pts:p,max:15,label:'Exposome',ref:'OMS PE',raw:expoT,rawMax:47};c+=p;
  // Work 0-15
  const workT=Object.values(S.work).reduce((a,b)=>a+b,0);
  p=Math.round(workT*15/57);d.work={pts:p,max:15,label:'Facteurs professionnels',ref:'Biswas/Lane',raw:workT,rawMax:57};c+=p;

  // Ethnic modulation
  c=Math.round(c*(1+e.ev/100));
  S.bmn_c=Math.min(150,c);S.details=d;

  // SII (7 criteria from doc + 2 extended)
  let sii=0;
  if(sr>=.35)sii++;if(apT<75)sii++;if(imc>=e.ob)sii++;if(S.tabac>=3)sii++;
  if(alimT>=10)sii++;if(S.isi>=15)sii++;if(tt>ttSeuil)sii++;
  if(expoT>=20)sii++;if(workT>=25)sii++;
  S.sii=sii;

  // BMN-K
  let k=0,ctiA=1,griT=0;
  S.comorbIds.forEach(id=>{const cm=COMORB.find(x=>x.id===id);if(cm){k+=cm.p;ctiA=Math.max(ctiA,cm.ca);
    if(cm.gri_fav)griT+=cm.gr;else if(cm.gr<0)griT+=cm.gr;}});
  S.bmn_k=Math.min(50,k);

  // CTI = Σ(γ·Z) × max(amplificateur)
  let ctiR=0;
  ctiR+=CTI_G.dur*(S.bmn_c>100?1:S.bmn_c>70?.7:S.bmn_c>40?.4:.1);
  ctiR+=CTI_G.yoyo*(S.yoyo>=1?1:0);
  ctiR+=CTI_G.lep*Math.min(1,(imc>35?1:imc>30?.6:imc>27.5?.3:0)+(S.comorbIds.includes('saos')?.3:0));
  ctiR+=CTI_G.micro*Math.min(1,alimT/6);
  ctiR+=CTI_G.cort*Math.min(1,sr*.4+S.isi/28*.3+(S.work.schedule||0)/5*.3);
  ctiR+=CTI_G.meta*Math.min(1,(S.comorbIds.includes('hypo')?.6:0)+(S.yoyo>=1?.4:0));
  ctiR+=CTI_G.enf*(S.enf_ob>=2?1:S.enf_ob>=1?.5:0);
  const expoAmp=expoT>30?1.15:expoT>20?1.05:1;
  S.cti=Math.min(100,Math.round(ctiR/1.459*100*ctiA*expoAmp));

  // GRI = Σ(δ·F) - Σ(ε·U)
  let gri=griT;
  if(S.bioValues.homaIR>2.5)gri+=1.07;
  if(S.bioValues.adipon!==undefined&&S.bioValues.adipon<6)gri+=.62;
  if(S.bioValues.tghdl>3.5)gri+=.55;
  if(S.cti>55)gri-=.65;
  if(S.comorbIds.includes('cortis'))gri-=.35;
  if(imc>40&&!S.comorbIds.includes('mets')&&!S.comorbIds.includes('dt2'))gri-=.47;
  if(sr>=.6)gri-=.28;
  S.gri=Math.max(-2,Math.min(5,gri));

  // BMN-B (bio z-scores)
  let swz=0,sw=0;
  BIO.forEach(m=>{const v=S.bioValues[m.id];if(v===undefined)return;
    let z;if(!m.inv){z=v<=m.nm?0:v>=m.ab?1:(v-m.nm)/(m.ab-m.nm);}
    else{z=v>=m.nm?0:v<=m.ab?1:(m.nm-v)/(m.nm-m.ab);}
    z=Math.max(0,Math.min(1,z));
    swz+=z*m.w;sw+=m.w;});
  S.bmn_b=sw>0?Math.round(swz/sw*100):0;

  // BMN-T (dynamic weighting from doc)
  const cN=(S.bmn_c/150)*100,kN=(S.bmn_k/50)*100,bN=S.bmn_b;
  const gap=bN-cN;let wB,wC,wK=.15;
  if(gap<=20){wB=.30;wC=.55;}else{const ex=Math.min(.30,(gap-20)/100*.60);wB=.30+ex;wC=Math.max(.25,.55-ex*.75);}
  const s2=wB+wC+wK;wB/=s2;wC/=s2;wK/=s2;
  let t=wC*cN+wB*bN+wK*kN;
  // Safety floors
  if(bN>0&&t<bN*.75)t=bN*.75;
  if(bN>90)t=Math.max(t,Math.max(80,bN*.85));else if(bN>80)t=Math.max(t,bN*.85);
  if(k>30&&t<40)t=Math.max(40,kN*.80);
  if(S.bioValues.hba1c>=6.5&&t<60)t=60;
  S.bmn_t=Math.min(200,Math.round(t*2));
}

function getPanelLvl(){const comp=Math.min(200,S.bmn_c+S.bmn_k*1.5);if(comp<50)return S.sii>=2?5:0;if(comp<100)return 10;return 15;}
function getClass(s){
  if(s<=40)return{l:'FAIBLE',c:'var(--green)',bg:'var(--green-bg)',p:'< 8%',tier:'Surveillance'};
  if(s<=80)return{l:'MODÉRÉ',c:'var(--orange)',bg:'var(--orange-bg)',p:'8-22%',tier:'Nutrition + AP'};
  if(s<=120)return{l:'ÉLEVÉ',c:'var(--orange)',bg:'var(--orange-bg)',p:'22-47%',tier:'GLP-1 préventif'};
  if(s<=160)return{l:'TRÈS ÉLEVÉ',c:'var(--red)',bg:'var(--red-bg)',p:'47-71%',tier:'GLP-1 prioritaire'};
  return{l:'CRITIQUE',c:'var(--purple)',bg:'var(--purple-bg)',p:'> 71%',tier:'Chirurgie bariatrique'};
}

function calcMarkov(){
  const bT=S.bmn_t,kN=(S.bmn_k/50)*100,imc=S.imc,e=ETH[S.ethnie]||ETH.eu;
  let cs=imc>=35?5:imc>=30?4:imc>=27.5?3:imc>=e.ow?2:imc>=e.ow-2?1:0;
  const rf=Math.exp(.68*bT/200)*Math.exp(.35*kN/100);
  let cm=1;S.comorbIds.forEach(id=>{if(MK_CM[id])cm=Math.max(cm,MK_CM[id]);});
  let prob=[0,0,0,0,0,0];prob[cs]=1;
  for(let y=0;y<10;y++){const np=[0,0,0,0,0,0];
    for(let i=0;i<6;i++){if(prob[i]<.001)continue;const row=MK_B[i].slice();
      for(let j=i+1;j<6;j++)row[j]*=rf*cm;for(let j=0;j<i;j++)row[j]/=rf;
      const rt=row.reduce((a,b)=>a+b,0);for(let j=0;j<6;j++)np[j]+=prob[i]*(row[j]/rt);}
    prob=np;}
  return{cs,prob};
}

function doRetro(){
  const v=S.bioValues,fl=[];
  if(v.homaIR>=4&&!S.comorbIds.includes('dt2')&&!S.comorbIds.includes('predmt'))fl.push({c:'var(--red)',t:'⚠️ HOMA-IR ≥ 4: résistance insuline sévère non déclarée'});
  if(v.hba1c>=5.7&&v.hba1c<6.5&&!S.comorbIds.includes('predmt'))fl.push({c:'var(--orange)',t:'⚠️ HbA1c '+v.hba1c+'% → pré-diabète probable (ADA 2024)'});
  if(v.hba1c>=6.5&&!S.comorbIds.includes('dt2'))fl.push({c:'var(--red)',t:'🚨 HbA1c '+v.hba1c+'% → diabète type 2 probable'});
  if(v.tghdl>3.5&&v.adipon<6&&v.homaIR>2.5)fl.push({c:'var(--orange)',t:'⚠️ Triade IR cachée détectée (TG/HDL + Adiponectine + HOMA-IR)'});
  if(v.crphs>=3)fl.push({c:'var(--orange)',t:'⚠️ CRP ≥ 3: inflammation systémique active'});
  if(v.tsh>=4)fl.push({c:'var(--orange)',t:'⚠️ TSH élevée: hypothyroïdie subclinique possible'});
  const el=$('retro');if(!el)return;
  el.innerHTML=fl.length?fl.map(f=>`<div class="retro-alert" style="border-left-color:${f.c}"><span style="color:${f.c}">${f.t}</span></div>`).join('')
  :'<div class="retro-ok">✅ Pas d\'incohérence biologie/comorbidités détectée.</div>';
}

// ════════════════════════════════════════════════════════════════
// FINAL RESULT with full quantification + AI interpretation
// ════════════════════════════════════════════════════════════════
function renderFinal(){
  const t=S.bmn_t,cls=getClass(t),mk=calcMarkov();
  const colors=['var(--green)','var(--teal)','var(--orange)','var(--orange)','var(--red)','var(--purple)'];
  const pObes=((mk.prob[4]+mk.prob[5])*100).toFixed(1);

  let r=`<div class="res-hero" style="background:${cls.bg}">
    <div class="res-num" style="color:${cls.c}">${t}<span class="res-max">/200</span></div>
    <div class="res-lv" style="color:${cls.c}">${cls.l}</div>
    <div class="res-tier" style="color:${cls.c}">${cls.tier}</div>
    <div class="res-pr">P(obésité 10 ans): ${cls.p}</div></div>`;

  // Score grid
  r+=`<div class="res-grid">
    <div class="res-item"><div class="res-item-l">BMN-C</div><div class="res-item-v" style="color:var(--accent)">${S.bmn_c}</div><div class="res-item-s">/150</div></div>
    <div class="res-item"><div class="res-item-l">BMN-K</div><div class="res-item-v" style="color:var(--orange)">${S.bmn_k}</div><div class="res-item-s">/50</div></div>
    <div class="res-item"><div class="res-item-l">BMN-B</div><div class="res-item-v" style="color:${S.bmn_b>0?'var(--green)':'var(--dim)'}">${S.bmn_b||'—'}</div><div class="res-item-s">/100</div></div>
    <div class="res-item"><div class="res-item-l">CTI</div><div class="res-item-v" style="color:${S.cti>55?'var(--red)':S.cti>40?'var(--orange)':'var(--teal)'}">${S.cti}</div><div class="res-item-s">${S.cti<20?'Ouvert':S.cti<40?'Début':S.cti<55?'Avancé':'Fermé'}</div></div>
    <div class="res-item"><div class="res-item-l">GRI</div><div class="res-item-v" style="color:${S.gri>=1.5?'var(--green)':'var(--dim)'}">${S.gri.toFixed(1)}</div><div class="res-item-s">${S.gri>=2.5?'Excellent':S.gri>=1.5?'Bon':S.gri>=.5?'Modéré':'Faible'}</div></div>
    <div class="res-item"><div class="res-item-l">SII</div><div class="res-item-v" style="color:${S.sii>=4?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)'}">${S.sii}</div><div class="res-item-s">/9</div></div></div>`;

  // Quantification breakdown
  r+=`<div class="contrib"><div class="contrib-title">📊 Quantification BMN-C (${S.bmn_c}/150)</div>`;
  const dd=S.details;const keys=Object.keys(dd).sort((a,b)=>dd[b].pts-dd[a].pts);
  keys.forEach(k=>{const v=dd[k];if(v.max===0)return;
    const pct=Math.round(v.pts/v.max*100);
    const col=pct>=70?'var(--red)':pct>=40?'var(--orange)':'var(--green)';
    r+=`<div class="contrib-row"><div class="contrib-name">${v.label} <span class="contrib-ref">${v.ref||''}</span></div>
      <div class="contrib-bar"><div class="contrib-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="contrib-pts" style="color:${col}">${v.pts}/${v.max}</div></div>`;
  });
  r+=`</div>`;

  // Markov projection
  r+=`<div class="sec"><div class="sec-tt">📈 Modèle de Markov — Projection 10 ans</div>
    <div class="markov-sub">Matrice de transition modulée: P_ij × exp(0.68·BMN_T/100) × exp(0.35·K_norm/100)</div>`;
  mk.prob.forEach((p,i)=>{const pct=(p*100).toFixed(1);
    r+=`<div class="mk-row"><div class="mk-lbl" style="color:${colors[i]}">${MK_ST[i]}${i===mk.cs?' ◀':''}</div>
      <div class="mk-bar"><div class="mk-fill" style="width:${pct}%;background:${colors[i]}"></div></div>
      <div class="mk-pct" style="color:${colors[i]}">${pct}%</div></div>`;
  });
  r+=`<div class="mk-total">P(obésité à 10 ans) = <b style="color:var(--red)">${pObes}%</b></div></div>`;

  // Environment impact
  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  const workT=Object.values(S.work).reduce((a,b)=>a+b,0);
  r+=`<div class="sec"><div class="sec-tt">🌍 Impact environnemental & professionnel</div>
    <div class="mrow c2">
      <div class="mbox"><div class="mbox-lbl">Exposome</div><div class="mbox-val" style="color:${expoT>=25?'var(--red)':expoT>=15?'var(--orange)':'var(--green)'}">${expoT}</div><div class="mbox-sub">/47</div></div>
      <div class="mbox"><div class="mbox-lbl">Travail</div><div class="mbox-val" style="color:${workT>=25?'var(--red)':workT>=15?'var(--orange)':'var(--green)'}">${workT}</div><div class="mbox-sub">/57</div></div>
    </div>`;
  if(S.airData){
    const aq=aqiLabel(S.airData.us_aqi);
    r+=`<div class="res-aqi"><div class="res-aqi-left"><div class="res-aqi-city">${S.geo?.name||'—'}</div><div class="res-aqi-detail">PM2.5: ${S.airData.pm2_5?.toFixed(1)??'—'} · NO₂: ${S.airData.nitrogen_dioxide?.toFixed(1)??'—'}</div></div>
      <div class="res-aqi-right"><div class="res-aqi-num" style="color:${aq.c}">${S.airData.us_aqi||'—'}</div><div class="res-aqi-lbl" style="color:${aq.c}">${aq.l}</div></div></div>`;
  }
  if(S.commuteDist){
    r+=`<div class="res-commute">🚗 Trajet: <b>${S.commuteDist.toFixed(1)} km</b> · Score distance: ${S.work.dist}/5</div>`;
  }
  r+=`</div>`;

  // Strategy cards
  r+=`<div class="sec"><div class="sec-tt">💊 Stratégie thérapeutique</div>`;
  getStrats(t,cls.l,S.cti,S.gri).forEach(s=>{
    r+=`<div class="str-card" style="border-left-color:${s.c}"><div class="str-tt" style="color:${s.c}">${s.ico} ${s.title}</div>
      <div class="str-desc">${s.desc}</div>${s.items?`<ul class="str-list">${s.items.map(i=>'<li>'+i+'</li>').join('')}</ul>`:''}</div>`;
  });
  r+=`</div>`;

  // AI interpretation
  r+=`<div id="aiFinal"><div class="ai-loading"><span class="spinner"></span> Interprétation IA personnalisée en cours…</div></div>`;
  setTimeout(async()=>{
    const ai=await requestAIInterpret();
    const box=$('aiFinal');
    if(!box)return;
    if(ai&&ai.summary){
      const tone=ai.tone||'cautious';
      const tc=tone==='urgent'?'var(--red)':tone==='cautious'?'var(--orange)':'var(--green)';
      let h2=`<div class="ai-final-card" style="border-color:${tc}">
        <div class="ai-hd"><span class="ai-tag">🤖 Interprétation IA Claude</span></div>
        <div class="ai-summary">${ai.summary}</div>`;
      if(ai.positive_points?.length)h2+=`<div class="ai-section"><b style="color:var(--green)">✅ Points positifs</b>${ai.positive_points.map(p=>`<div class="ai-item green">• ${p}</div>`).join('')}</div>`;
      if(ai.key_risks?.length)h2+=`<div class="ai-section"><b style="color:var(--red)">⚠️ Risques identifiés</b>${ai.key_risks.map(r2=>`<div class="ai-item red">• ${r2}</div>`).join('')}</div>`;
      if(ai.priority_actions?.length)h2+=`<div class="ai-section"><b style="color:var(--accent)">🎯 Actions prioritaires</b>${ai.priority_actions.map(a2=>`<div class="ai-item blue">• ${a2}</div>`).join('')}</div>`;
      if(ai.lifestyle_tips?.length)h2+=`<div class="ai-section"><b style="color:var(--teal)">💡 Conseils personnalisés</b>${ai.lifestyle_tips.map(l=>`<div class="ai-item teal">• ${l}</div>`).join('')}</div>`;
      if(ai.medical_attention)h2+=`<div class="ai-medical">🩺 ${ai.medical_attention}</div>`;
      h2+=`</div>`;
      box.innerHTML=h2;
    }else{
      box.innerHTML='';
    }
  },200);

  // References footer
  r+=`<div class="res-refs">
    <div class="res-refs-title">📚 Références internationales</div>
    <div class="res-refs-list">OMS · IDF 2006 · ADA 2024 · FINDRISC · IPAQ · PHQ-9 · PSS-10 · ISI · BES · AUDIT-C · Lancet 2016 (Global BMI Mortality) · BMJ Open 2016 (WHtR) · Lancet 2010 (MetS) · NEJM 1995 (Leibel) · NEJM 2011 (Sumithran) · SCORE2/Framingham · INTERHEART · DPP · DiaRem · Biswas 2015 · Cappuccio 2008 · Aubin 2012 · Lane 2024 · CAMS/Copernicus · Karasek</div>
    <div class="res-refs-algo">Score BMN v2.0 — Architecture ABCKO+ — Bach · Manos · Noël</div>
  </div>`;

  return r;
}

function getStrats(t,level,cti,gri){
  const b=[];
  if(t<=40)b.push({c:'var(--green)',ico:'✅',title:'Risque faible — Surveillance',desc:'Continuez vos bonnes habitudes. Contrôle dans 3 ans.',items:['Alimentation méditerranéenne','Activité physique ≥ 150 min/semaine','Sommeil 7-8h par nuit','Bilan métabolique tous les 3 ans']});
  else if(t<=80)b.push({c:'var(--orange)',ico:'📋',title:'Risque modéré — Programme nutrition + activité',desc:'Suivi annuel recommandé. Changements de mode de vie.',items:['Consultation diététicienne','Programme activité physique progressif','Réduction ultra-transformés','Gestion du stress (relaxation, méditation)','Bilan sanguin Panel P5']});
  else if(t<=120){
    b.push({c:'var(--orange)',ico:'⚡',title:'Risque élevé — Suivi médical renforcé + GLP-1 préventif',desc:'Suivi trimestriel. Bilan Panel P10. GLP-1 à discuter.',items:['Suivi trimestriel médecin + diététicien','Bilan sanguin Panel P10 complet','Programme activité encadré','Soutien psychologique si stress/dépression','Sémaglutide préventif si GRI favorable']});
    if(gri>=1.5)b.push({c:'var(--green)',ico:'💉',title:`GLP-1: profil favorable (GRI ${gri.toFixed(1)})`,desc:'Votre profil métabolique répond bien aux agonistes GLP-1.',items:['Sémaglutide ou Tirzépatide','Objectif: ≥ 10% perte de poids','Suivi endocrinologue à 3/6/12 mois']});
  }else{
    b.push({c:'var(--red)',ico:'🚨',title:'Risque très élevé — Prise en charge urgente',desc:'Consultation spécialisée dans les 2 semaines.',items:['RDV endocrinologie urgent','Bilan Panel P15 complet','GLP-1 (Tirzépatide) en priorité','Évaluation bariatrique si CTI > 55']});
  }
  if(cti>55)b.push({c:'var(--purple)',ico:'🩹',title:`Chirurgie bariatrique à évaluer (CTI ${cti})`,desc:'Index de chronicité élevé: les méthodes classiques seront insuffisantes.',items:['Consultation chirurgien bariatrique','Évaluation psychologique pré-opératoire','Suivi nutritionnel 5 ans post-opératoire']});
  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  if(expoT>=20)b.push({c:'var(--teal)',ico:'🌍',title:`Amélioration environnementale (Exposome ${expoT}/47)`,desc:'Des actions concrètes sur votre environnement réduiront votre risque.',items:['Purificateur d\'air si AQI > 100','Remplacer plastiques par verre/inox','Cosmétiques bio/naturels','Réduire écrans le soir','Améliorer accès aliments frais']});
  return b;
}

function resetAll(){if(!confirm('Recommencer depuis le début ?'))return;location.reload();}

// ─── SWIPE navigation ───
let tX=0,tY=0,sw=false;
function initSwipe(){const w=$('scrWrap');if(!w)return;
  w.addEventListener('touchstart',e=>{tX=e.touches[0].clientX;tY=e.touches[0].clientY;sw=true;},{passive:true});
  w.addEventListener('touchend',e=>{if(!sw)return;sw=false;const dx=e.changedTouches[0].clientX-tX,dy=e.changedTouches[0].clientY-tY;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0&&S.step<NTOT-1)go(S.step+1,1);else if(dx>0&&S.step>0)go(S.step-1,-1);}},{passive:true});
}

// ─── KEYBOARD navigation ───
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'&&S.step<NTOT-1)go(S.step+1,1);
  if(e.key==='ArrowLeft'&&S.step>0)go(S.step-1,-1);
});

// ─── INIT ───
function init(){
  $('app').innerHTML=`<div class="hdr">
    <button class="hdr-back" onclick="if(S.step>0)go(S.step-1,-1)">←</button>
    <div class="hdr-center"><div class="hdr-sec" id="hdrSec">🏠 Accueil</div><div class="hdr-step" id="hdrStep"></div></div>
    <div class="hdr-score" id="hdrScore" style="display:none"></div></div>
    <div class="pgbar"><div class="pgbar-fill" id="pgFill" style="width:0%"></div></div>
    <div class="scr-wrap" id="scrWrap"></div>
    <div class="bnav" id="bNav"></div>`;
  initSwipe();go(0,0);
}
init();
