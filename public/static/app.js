// ════════════════════════════════════════════════════════════════
// SCORE BMN v2.0 — MOTEUR IA ADAPTATIF + GEO AUTO + PSS-10 + DQI
// Open-Meteo · Nominatim · Haversine · Claude AI · IP-Geoloc
// Ref: OMS, IDF 2006, ADA 2024, IPAQ, PHQ-9, PSS-10, ISI, BES
// Lancet 2016, SCORE2/Framingham, FINDRISC, DPP, INTERHEART
// ════════════════════════════════════════════════════════════════

// ─── ETHNICITY (WHO Asia-Pacific + IDF 2006 + Lancet 2016) ───
const ETH={
  eu:{n:'Europeen / Caucasien',ow:25,ob:30,tf:88,tm:102,dR:1,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  im:{n:'Indo-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.2,cR:1.4,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  cr:{n:'Creole Mauricien',ow:25,ob:30,tf:84,tm:94,dR:1.3,hR:1.4,cR:1.2,iM:1.2,ldl:1,ev:-2,p:1},
  si:{n:'Sino-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:1,hR:.9,cR:.6,iM:.9,ldl:.9,ev:1.5,p:1.1},
  sa:{n:'Sud-Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.3,cR:1.5,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  af:{n:'Africain / Subsaharien',ow:25,ob:30,tf:88,tm:102,dR:1.3,hR:1.5,cR:1.2,iM:1.3,ldl:1,ev:-1.5,p:1},
  ea:{n:'Est-Asiatique',ow:23,ob:27.5,tf:80,tm:88,dR:.9,hR:.9,cR:.7,iM:.9,ldl:.9,ev:1.5,p:1.1},
  se:{n:'Sud-Est Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:1.2,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  fm:{n:'Franco-Mauricien',ow:25,ob:30,tf:88,tm:102,dR:.8,hR:1,cR:.9,iM:1,ldl:1,ev:1,p:1}
};

// ─── COMORBIDITIES (ADA 2024, IDF MetS, DPP) ───
const COMORB=[
  {id:'dt2',n:'Diabete Type 2',p:14,or:'HR 3.84',d:'Insulinoresistance severe. Perte esperance vie 8.9 ans.',ca:1.8,gr:.65,cat:'dis',gri_fav:0},
  {id:'predmt',n:'Pre-diabete',p:8,or:'HR 2.11',d:'HbA1c 5.7-6.4%. Reversible.',ca:1.2,gr:.82,cat:'dis',gri_fav:1},
  {id:'hta',n:'HTA etablie',p:10,or:'HR 2.24',d:'Facteur aggravant obesite viscerale.',ca:1.1,gr:0,cat:'dis',gri_fav:0},
  {id:'saos',n:'SAOS (Apnee du sommeil)',p:12,or:'OR 2.19',d:'Insulinoresistance via hypoxie + cortisol nocturne.',ca:1.4,gr:0,cat:'dis',gri_fav:0},
  {id:'sopk',n:'SOPK (Femme)',p:14,or:'OR 2.77',d:'Phenotype IR feminin. GLP-1 efficace.',ca:1.2,gr:.83,cat:'dis',gri_fav:1},
  {id:'nafld',n:'NAFLD / Steatose hepatique',p:10,or:'OR 3.22',d:'Insulinoresistance hepatique.',ca:1.1,gr:.66,cat:'dis',gri_fav:1},
  {id:'hypo',n:'Hypothyroidie',p:6,or:'OR 1.74',d:'TSH > 4. Metabolisme ralenti -10/15%.',ca:1.3,gr:0,cat:'dis',gri_fav:0},
  {id:'mets',n:'Syndrome metabolique',p:12,or:'HR 2.64',d:'3 criteres IDF ou plus.',ca:1.3,gr:.65,cat:'dis',gri_fav:1},
  {id:'monw',n:'Phenotype MONW',p:10,or:'OR 2.38',d:'IMC < 25 mais 2+ criteres MetS.',ca:1.1,gr:.70,cat:'phe',gri_fav:1},
  {id:'ir_occ',n:'IR occulte',p:8,or:'OR 2.12',d:'TG/HDL > 3.5 non diagnostique.',ca:1.2,gr:.55,cat:'phe',gri_fav:1},
  {id:'cortis',n:'Corticoides > 3 mois',p:8,or:'HR 2.12',d:'Adipogenese viscerale iatrogene.',ca:1.6,gr:-.35,cat:'tx',gri_fav:0},
  {id:'antidep',n:'Antidepresseurs obesogenes',p:4,or:'OR 1.58',d:'Paroxetine/mirtazapine.',ca:1.1,gr:0,cat:'tx',gri_fav:0},
  {id:'depres',n:'Depression traitee',p:6,or:'OR 1.92',d:'Impact metabolique bidirectionnel.',ca:1.2,gr:0,cat:'tx',gri_fav:0}
];

// ─── BIOMARKERS (SCORE2/Framingham, ADA 2024) ───
const BIO=[
  {id:'homaIR',n:'HOMA-IR',u:'',nm:2.5,ab:4,w:2.5,inv:0,t:5,nr:'< 2.5',ar:'>= 4.0',l:'Resistance insuline'},
  {id:'hba1c',n:'HbA1c',u:'%',nm:5.7,ab:6.5,w:2,inv:0,t:5,nr:'< 5.7',ar:'>= 6.5',l:'Sucre moyen 3 mois'},
  {id:'glyc',n:'Glycemie a jeun',u:'mmol/L',nm:5.6,ab:7,w:1.8,inv:0,t:5,nr:'< 5.6',ar:'>= 7.0',l:'Sucre sanguin'},
  {id:'crphs',n:'CRP ultrasensible',u:'mg/L',nm:1,ab:3,w:2,inv:0,t:5,nr:'< 1.0',ar:'>= 3.0',l:'Inflammation'},
  {id:'tsh',n:'TSH',u:'mUI/L',nm:4,ab:8,w:1.3,inv:0,t:5,nr:'0.4-4.0',ar:'> 4.0',l:'Thyroide'},
  {id:'ldl',n:'LDL cholesterol',u:'mmol/L',nm:3,ab:4.1,w:1.8,inv:0,t:5,nr:'< 3.0',ar:'>= 4.1',l:'Mauvais cholesterol'},
  {id:'hdl',n:'HDL cholesterol',u:'mmol/L',nm:1,ab:.7,w:1,inv:1,t:5,nr:'>= 1.0',ar:'< 0.7',l:'Bon cholesterol'},
  {id:'tg',n:'Triglycerides',u:'mmol/L',nm:1.7,ab:2.3,w:1.5,inv:0,t:10,nr:'< 1.7',ar:'>= 2.3',l:'Graisses sang'},
  {id:'adipon',n:'Adiponectine',u:'ug/mL',nm:10,ab:6,w:2.5,inv:1,t:10,nr:'>= 10',ar:'< 6.0',l:'Hormone tissu gras'},
  {id:'asat',n:'Transaminases',u:'UI/L',nm:40,ab:60,w:1,inv:0,t:10,nr:'< 40',ar:'>= 60',l:'Foie'},
  {id:'apob',n:'ApoB',u:'g/L',nm:.9,ab:1.2,w:1.5,inv:0,t:10,nr:'< 0.9',ar:'>= 1.2',l:'Risque vasculaire'},
  {id:'ggt',n:'GGT',u:'UI/L',nm:50,ab:80,w:.8,inv:0,t:10,nr:'< 50',ar:'>= 80',l:'Foie / Alcool'},
  {id:'tghdl',n:'Ratio TG/HDL',u:'',nm:2,ab:3.5,w:2,inv:0,t:15,nr:'< 2.0',ar:'>= 3.5',l:'IR cachee'},
  {id:'urate',n:'Acide urique',u:'umol/L',nm:360,ab:420,w:.8,inv:0,t:15,nr:'< 360',ar:'>= 420',l:'Goutte / MetS'},
  {id:'leptine',n:'Leptine',u:'ng/mL',nm:20,ab:40,w:1.5,inv:0,t:15,nr:'< 20',ar:'>= 40',l:'Hormone satiete'}
];

// ─── PSS-10 (Cohen, Kamarck & Mermelstein 1983) ───
// 10 vrais items, cotes 0 (jamais) a 4 (tres souvent)
// Items 4,5,7,8 sont INVERSES (score = 4 - reponse)
const PSS10_ITEMS = [
  {q: "Au cours du dernier mois, combien de fois avez-vous ete derange(e) par un evenement inattendu ?", inv: false, tip: "Pensez aux imprevu qui vous ont contrarie(e)"},
  {q: "Au cours du dernier mois, combien de fois avez-vous eu l'impression de ne pas pouvoir controler les choses importantes de votre vie ?", inv: false, tip: "Sentiment de perte de controle"},
  {q: "Au cours du dernier mois, combien de fois vous etes-vous senti(e) nerveux(se) et stresse(e) ?", inv: false, tip: "Tension, nervosite au quotidien"},
  {q: "Au cours du dernier mois, combien de fois avez-vous senti que les choses allaient comme vous le vouliez ?", inv: true, tip: "Plus c'est souvent, mieux c'est"},
  {q: "Au cours du dernier mois, combien de fois avez-vous senti que vous faisiez face efficacement aux changements importants ?", inv: true, tip: "Capacite a gerer les changements"},
  {q: "Au cours du dernier mois, combien de fois avez-vous eu confiance en votre capacite a gerer vos problemes personnels ?", inv: true, tip: "Confiance en soi face aux difficultes"},
  {q: "Au cours du dernier mois, combien de fois avez-vous senti que les choses allaient dans le bon sens pour vous ?", inv: true, tip: "Sentiment que ca va bien"},
  {q: "Au cours du dernier mois, combien de fois avez-vous pense que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?", inv: false, tip: "Submersion, trop de choses a gerer"},
  {q: "Au cours du dernier mois, combien de fois avez-vous ete capable de maitriser votre enervement ?", inv: true, tip: "Controle de la colere"},
  {q: "Au cours du dernier mois, combien de fois avez-vous senti que les difficultes s'accumulaient tellement que vous ne pouviez les surmonter ?", inv: false, tip: "Sentiment d'etre deborde(e)"}
];
const PSS_LABELS = ['Jamais','Presque jamais','Parfois','Assez souvent','Tres souvent'];

// ─── PHQ-9 (Kroenke, Spitzer & Williams 2001) ───
const PHQ9_ITEMS = [
  "Peu d'interet ou de plaisir a faire les choses",
  "Etre triste, deprime(e) ou desespere(e)",
  "Difficultes a s'endormir ou a rester endormi(e), ou dormir trop",
  "Se sentir fatigue(e) ou manquer d'energie",
  "Peu d'appetit ou manger trop",
  "Avoir une mauvaise opinion de soi-meme, se sentir nul(le)",
  "Difficultes a se concentrer (lire, regarder la TV)",
  "Bouger ou parler tres lentement, ou etre agite(e)",
  "Penser qu'il vaudrait mieux mourir ou se faire du mal"
];
const PHQ_LABELS = ['Jamais','Plusieurs jours','Plus de la moitie du temps','Presque tous les jours'];

// ─── Markov (NEJM 1995 Leibel, NEJM 2011 Sumithran) ───
const MK_ST=['Poids normal','Surpoids leger','Surpoids installe','Surpoids eleve','Obesite moderee','Obesite severe'];
const MK_B=[[.82,.14,.03,.01,0,0],[.08,.68,.18,.05,.01,0],[.02,.11,.61,.21,.04,.01],[.01,.04,.14,.56,.21,.04],[0,.01,.03,.12,.65,.19],[0,0,.01,.03,.11,.85]];
const MK_CM={dt2:1.4,sopk:1.3,saos:1.25,mets:1.5};
const CTI_G={dur:.185,yoyo:.249,lep:.21,micro:.18,cort:.195,meta:.2,enf:.24};

// ─── STATE ───
let S={
  step:0,dob:'',sexe:'',ethnie:'eu',poids:0,taille:0,imc:0,tt:0,
  parent_ob:0,enf_ob:0,diab_par:0,yoyo:0,
  // Exposome now computed from geo data
  expo:{air:0,temp:0,uv:0},
  // Work
  work:{type:0,hours:0,dist:0,mode:0,schedule:0,posture:0,retire:0},
  // Nutrition detaillee
  alim:{ultra:0,sucre_boisson:0,sucre_solide:0,fibres:0,portions:0,repas:0,grignotage:0,fast_food:0,cuisine:0,eau:0},
  // Activity
  ap:{cardio:60,muscu:0,marche:20},assis:7,
  // Sleep
  sommeil:7,isi:8,
  // Substances
  tabac:0,alcool_f:0,alcool_q:0,
  // PSS-10 individual items
  pss: [0,0,0,0,0,0,0,0,0,0],
  // PHQ-9 individual items
  phq: [0,0,0,0,0,0,0,0,0],
  // BES
  bes:0,
  // Comorbidities & bio
  comorbIds:[],bioValues:{},
  // Geo
  geo:null,airData:null,weatherData:null,workGeo:null,commuteDist:null,
  geoCity:'',workCity:'',
  // Scores
  bmn_c:0,bmn_k:0,bmn_b:0,bmn_t:0,sii:0,cti:0,gri:0,
  details:{},
  aiInsights:{},aiLoading:false,geoLoading:false
};

const $=id=>document.getElementById(id);
const h=(el,html)=>{const e=typeof el==='string'?$(el):el;if(e)e.innerHTML=html;};
function getAge(){if(!S.dob)return 0;const b=new Date(S.dob),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return Math.max(0,a);}
function getPssTotal(){let t=0;S.pss.forEach((v,i)=>{t+=PSS10_ITEMS[i].inv?(4-v):v;});return t;}
function getPhqTotal(){return S.phq.reduce((a,b)=>a+b,0);}

// ════════════════════════════════════════════════════════════════
// GEO APIs — Open-Meteo (free) + Nominatim + IP Fallback
// ════════════════════════════════════════════════════════════════
function haversine(lat1,lon1,lat2,lon2){
  const R=6371,toR=Math.PI/180;
  const dLat=(lat2-lat1)*toR,dLon=(lon2-lon1)*toR;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*toR)*Math.cos(lat2*toR)*Math.sin(dLon/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}

async function geocode(query){
  try{
    const r=await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
    const d=await r.json();
    if(d.results&&d.results.length)return d.results[0];
  }catch(e){console.warn('Geocode error:',e);}
  return null;
}

async function reverseGeocode(lat,lon){
  try{
    const r=await fetch(`/api/geo/reverse?lat=${lat}&lon=${lon}`);
    const d=await r.json();
    return d.name||`${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }catch(e){return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;}
}

// IP-based geolocation fallback via server proxy (no CORS issues)
async function ipGeolocate(){
  try{
    const r=await fetch('/api/geo/ip');
    const d=await r.json();
    if(d.lat&&d.lon)return{lat:d.lat,lon:d.lon,name:d.name||'Position detectee'};
  }catch(e){console.warn('IP geoloc error:',e);}
  return null;
}

async function fetchAirQuality(lat,lon){
  try{const r=await fetch(`/api/geo/air?lat=${lat}&lon=${lon}`);return await r.json();}catch(e){return null;}
}

async function fetchWeather(lat,lon){
  try{const r=await fetch(`/api/geo/weather?lat=${lat}&lon=${lon}`);return await r.json();}catch(e){return null;}
}

function aqiToScore(usAqi){
  if(!usAqi||usAqi<=50)return 0;if(usAqi<=100)return 2;if(usAqi<=150)return 4;if(usAqi<=200)return 6;return 8;
}
function aqiLabel(v){
  if(!v)return{l:'--',c:'var(--dim)',e:'--'};
  if(v<=50)return{l:'Bon',c:'var(--green)',e:'OK'};if(v<=100)return{l:'Modere',c:'var(--orange)',e:'!'};
  if(v<=150)return{l:'Sensibles',c:'var(--orange)',e:'!!'};if(v<=200)return{l:'Malsain',c:'var(--red)',e:'!!!'};
  return{l:'Dangereux',c:'var(--purple)',e:'!!!!'};
}
function tempToExpoScore(temp){
  if(temp===null||temp===undefined)return 0;
  if(temp>40)return 4;if(temp>35)return 3;if(temp>30)return 1;if(temp<-5)return 3;if(temp<5)return 1;return 0;
}
function uvToScore(uv){
  if(!uv||uv<=3)return 0;if(uv<=6)return 1;if(uv<=8)return 2;return 3;
}

// ─── Detect location: GPS first, then IP fallback ───
async function autoDetectGeo(){
  const statusEl=$('geoStatus');
  if(statusEl)statusEl.innerHTML='<div class="geo-loading"><span class="spinner"></span> Detection de votre position...</div>';
  S.geoLoading=true;

  // Try GPS first
  let found=false;
  try{
    const pos=await new Promise((ok,ko)=>navigator.geolocation.getCurrentPosition(ok,ko,{timeout:8000,enableHighAccuracy:true,maximumAge:60000}));
    const lat=pos.coords.latitude,lon=pos.coords.longitude;
    const name=await reverseGeocode(lat,lon);
    S.geo={lat,lon,name};S.geoCity=name;found=true;
  }catch(e){
    console.log('GPS non disponible, tentative IP...');
  }

  // IP fallback
  if(!found){
    const ipGeo=await ipGeolocate();
    if(ipGeo){
      S.geo=ipGeo;S.geoCity=ipGeo.name;found=true;
    }
  }

  if(found&&S.geo){
    if(statusEl)statusEl.innerHTML=`<div class="geo-ok">OK ${S.geo.name}</div>`;
    await loadAllGeoData(S.geo.lat,S.geo.lon);
  }else{
    if(statusEl)statusEl.innerHTML='<div class="geo-warn">Position non detectee. Tapez votre ville ci-dessous.</div>';
  }
  S.geoLoading=false;
}

async function searchCity(){
  const q=$('geoSearch')?.value?.trim();
  if(!q){h('geoStatus','<div class="geo-warn">Entrez une ville ou adresse.</div>');return;}
  h('geoStatus','<div class="geo-loading"><span class="spinner"></span> Recherche...</div>');
  const g=await geocode(q);
  if(g){
    S.geo={lat:g.lat,lon:g.lon,name:g.name};S.geoCity=g.name;
    h('geoStatus',`<div class="geo-ok">OK ${g.name}</div>`);
    await loadAllGeoData(g.lat,g.lon);
  }else{
    h('geoStatus','<div class="geo-warn">Lieu non trouve. Essayez un autre nom (ex: Paris, France).</div>');
  }
}

async function loadAllGeoData(lat,lon){
  h('geoResults','<div class="geo-loading"><span class="spinner"></span> Analyse qualite de l\'air et meteo...</div>');
  try{
    const [air,weather]=await Promise.all([fetchAirQuality(lat,lon),fetchWeather(lat,lon)]);
    S.airData=air?.current||null;
    S.weatherData=weather?.current||null;
    // Auto-compute exposome
    S.expo.air=aqiToScore(S.airData?.us_aqi);
    S.expo.temp=tempToExpoScore(S.weatherData?.temperature_2m);
    S.expo.uv=uvToScore(S.airData?.uv_index);
    calc();updateBadge();
    renderGeoResults();
  }catch(e){
    h('geoResults','<div class="geo-warn">Erreur de connexion aux APIs meteo. Reessayez.</div>');
  }
}

function renderGeoResults(){
  const a=S.airData,w=S.weatherData;if(!a&&!w){h('geoResults','');return;}
  const usAqi=a?.us_aqi;const aq=aqiLabel(usAqi);
  let html='';
  if(a){
    const pols=[{k:'pm2_5',l:'PM2.5',u:'ug/m3',lim:25},{k:'pm10',l:'PM10',u:'ug/m3',lim:50},{k:'nitrogen_dioxide',l:'NO2',u:'ug/m3',lim:40},{k:'ozone',l:'O3',u:'ug/m3',lim:100},{k:'sulphur_dioxide',l:'SO2',u:'ug/m3',lim:40},{k:'carbon_monoxide',l:'CO',u:'ug/m3',lim:4000}].filter(p=>a[p.k]!=null);
    html+=`<div class="geo-card air-card">
      <div class="geo-hd"><span class="geo-tag">Qualite de l'air</span><span class="geo-time">${new Date().toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="aqi-hero"><div class="aqi-num" style="color:${aq.c}">${usAqi||'--'}</div><div class="aqi-lv" style="color:${aq.c}">AQI US -- ${aq.l}</div>
        ${a.european_aqi?`<div class="aqi-eu">AQI Europe: ${a.european_aqi}</div>`:''}</div>
      <div class="geo-grid">${pols.map(p=>{
        const v=a[p.k];const over=v>p.lim;
        return`<div class="geo-pill${over?' over':''}"><span class="geo-pill-l">${p.l}</span><span class="geo-pill-v" style="color:${over?'var(--red)':aq.c}">${v?.toFixed?v.toFixed(1):v}</span></div>`;
      }).join('')}
      ${a.uv_index!=null?`<div class="geo-pill${a.uv_index>6?' over':''}"><span class="geo-pill-l">UV</span><span class="geo-pill-v" style="color:${a.uv_index>6?'var(--red)':a.uv_index>3?'var(--orange)':'var(--green)'}">${a.uv_index.toFixed(1)}</span></div>`:''}</div>
      <div class="geo-impact" style="border-color:${aq.c}"><span style="color:${aq.c}">Impact score: +${S.expo.air}/8 pts (pollution atmospherique)</span></div>
      <div class="geo-src">Source: CAMS/Copernicus via Open-Meteo | Temps reel</div>
    </div>`;
  }
  if(w){
    const t=w.temperature_2m;const hot=t>35,cold=t<5;
    html+=`<div class="geo-card weather-card">
      <div class="geo-hd"><span class="geo-tag">Meteo actuelle</span></div>
      <div class="weather-grid">
        ${t!=null?`<div class="weather-item main"><div class="weather-val" style="color:${hot?'var(--red)':cold?'var(--cyan)':'var(--green)'}">${t} C</div><div class="weather-lbl">Temperature</div></div>`:''}
        ${w.apparent_temperature!=null?`<div class="weather-item"><div class="weather-val">${w.apparent_temperature} C</div><div class="weather-lbl">Ressenti</div></div>`:''}
        ${w.relative_humidity_2m!=null?`<div class="weather-item"><div class="weather-val">${w.relative_humidity_2m}%</div><div class="weather-lbl">Humidite</div></div>`:''}
        ${w.wind_speed_10m!=null?`<div class="weather-item"><div class="weather-val">${w.wind_speed_10m}</div><div class="weather-lbl">km/h vent</div></div>`:''}
      </div>
      ${hot?'<div class="geo-alert hot">Canicule -- Activite exterieure deconseille. Impact metabolique (cortisol eleve).</div>':''}
      ${cold?'<div class="geo-alert cold">Grand froid -- Depense calorique accrue. Risque de compensation alimentaire.</div>':''}
      ${S.expo.temp>0?`<div class="geo-impact" style="border-color:var(--orange)"><span style="color:var(--orange)">Impact thermique: +${S.expo.temp} pts</span></div>`:''}
    </div>`;
  }
  h('geoResults',html);
}

// ─── Work location search ───
async function searchWork(){
  const q=$('workSearch')?.value?.trim();
  if(!q){h('workDist','<div class="geo-warn">Entrez l\'adresse ou la ville de votre lieu de travail.</div>');return;}
  h('workDist','<div class="geo-loading"><span class="spinner"></span> Recherche et calcul de distance...</div>');
  
  const g=await geocode(q);
  if(!g){
    h('workDist','<div class="geo-warn">Lieu non trouve. Essayez: "nom entreprise, ville" ou juste "ville, pays".</div>');
    return;
  }
  
  S.workGeo=g;S.workCity=g.name;
  
  if(S.geo){
    S.commuteDist=haversine(S.geo.lat,S.geo.lon,g.lat,g.lon);
    const d=S.commuteDist;
    let sc=0;if(d>60)sc=5;else if(d>30)sc=4;else if(d>15)sc=3;else if(d>5)sc=2;else if(d>0)sc=1;
    S.work.dist=sc;
    h('workDist',`<div class="dist-result">
      <div class="dist-val">${d.toFixed(1)} <span>km</span></div>
      <div class="dist-route">${S.geo.name} -> ${g.name}</div>
      <div class="dist-score" style="color:${sc>=3?'var(--orange)':'var(--green)'}">Score trajet: ${sc}/5 ${sc>=3?'(trajet long = fatigue + sedentarite)':'(trajet raisonnable)'}</div>
    </div>`);
  }else{
    h('workDist',`<div class="geo-ok">Lieu: ${g.name}</div><div class="geo-warn">Localisez d'abord votre domicile pour calculer la distance.</div>`);
  }
  calc();updateBadge();
}

// ════════════════════════════════════════════════════════════════
// CLAUDE AI — Adaptive Intelligence (server-side key)
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
    },2000);
  });
}

async function requestAIInterpret(){
  try{
    const r=await fetch('/api/ai/interpret',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        scores:{bmn_t:S.bmn_t,bmn_c:S.bmn_c,bmn_k:S.bmn_k,bmn_b:S.bmn_b,cti:S.cti,gri:S.gri.toFixed(1),sii:S.sii,stress_pss:getPssTotal(),phq9:getPhqTotal()},
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
    <div class="ai-hd"><span class="ai-tag">IA Adaptative</span><span class="ai-sev" style="color:${col}">${sev==='critical'?'Critique':sev==='high'?'Eleve':sev==='moderate'?'Modere':'Faible'}</span></div>
    <div class="ai-text">${data.analysis||''}</div>`;
  if(data.risk_flags?.length){
    html+=`<div class="ai-flags">${data.risk_flags.map(f=>`<span class="ai-flag">${f}</span>`).join('')}</div>`;
  }
  if(data.suggestions?.length){
    html+=`<div class="ai-sugg">${data.suggestions.map(s=>`<div class="ai-sugg-item">${s}</div>`).join('')}</div>`;
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

function sld(label,key,val,min,max,step,unit,ref){
  return `<div class="fc"><div class="fc-top"><div class="fc-label">${label}${ref?`<span class="ref">${ref}</span>`:''}</div>
    <div class="fc-score">${val} ${unit||''}</div></div>
    <div class="sld"><div class="sld-big" id="sv_${key}">${val}</div>
    ${unit?`<div class="sld-unit">${unit}</div>`:''}
    <input type="range" min="${min}" max="${max}" value="${val}" step="${step}"
      oninput="setN('${key}',+this.value);$('sv_${key}').textContent=this.value">
    <div class="sld-lbl"><span>${min}</span><span>${max}</span></div></div></div>`;
}

// ════════════════════════════════════════════════════════════════
// SCREENS — 18 ecrans progressifs, grand public
// ════════════════════════════════════════════════════════════════
const SCR=[
  // 0: Welcome
  ()=>`<div class="welc">
    <div class="welc-logo">B</div>
    <h1>Score <b>BMN</b> v2.0</h1>
    <p class="welc-desc">Evaluez votre risque metabolique en quelques minutes. Questionnaire valide scientifiquement, enrichi par l'intelligence artificielle et des donnees environnementales en temps reel.</p>
    <div class="welc-features">
      <div class="welc-feat"><span>IA</span><span>Analyse adaptative</span></div>
      <div class="welc-feat"><span>GEO</span><span>Donnees en direct</span></div>
      <div class="welc-feat"><span>17+</span><span>Modules valides</span></div>
      <div class="welc-feat"><span>15</span><span>Biomarqueurs</span></div>
    </div>
    <button class="welc-go" onclick="go(1)">Commencer l'evaluation</button>
    <div class="welc-refs">Ref. OMS | IDF 2006 | ADA 2024 | FINDRISC | IPAQ | PHQ-9 | PSS-10 | ISI | BES | AUDIT-C | Lancet 2016 | SCORE2</div>
    <div class="welc-disclaimer">Cet outil ne remplace pas une consultation medicale. Resultats a usage informatif uniquement.</div>
  </div>`,

  // 1: DOB
  ()=>{const age=getAge();
    let ageRisk='';
    if(age>=65)ageRisk='<div class="info-badge red">Plus de 65 ans: risque sarcopenique accru. Suivi renforce recommande.</div>';
    else if(age>=45)ageRisk='<div class="info-badge orange">Plus de 45 ans: le risque metabolique augmente avec l\'age.</div>';
    else if(age>0&&age<18)ageRisk='<div class="info-badge blue">Mineur: des seuils specifiques pediatriques s\'appliquent.</div>';
    return `<div class="s-emoji">Date</div>
    <div class="s-title">Votre date de naissance</div>
    <div class="s-sub">L'age influence votre metabolisme de base et les seuils de risque. <span class="ref">OMS</span></div>
    <div class="fc"><div class="fc-label">Date de naissance</div>
      <input type="date" class="fc-input" id="inp_dob" value="${S.dob}" onchange="S.dob=this.value;render(S.step,0)"></div>
    ${age>0?`<div class="age-display"><div class="age-num">${age}</div><div class="age-lbl">ans</div></div>${ageRisk}`:''}
    <div id="aiBox1"></div>`;
  },

  // 2: Sex
  ()=>{const o=[{v:'f',i:'F',t:'Femme',s:'Seuils tour de taille feminins, SOPK, hormones'},{v:'m',i:'M',t:'Homme',s:'Graisse viscerale masculine, seuils specifiques'}];
    return `<div class="s-emoji">Sexe</div>
    <div class="s-title">Sexe biologique</div>
    <div class="s-sub">Les seuils de tour de taille et certaines pathologies different selon le sexe. <span class="ref">IDF 2006</span></div>
    <div class="opts">${o.map(x=>`<div class="opt${S.sexe===x.v?' sel':''}" onclick="S.sexe='${x.v}';render(S.step,0)">
      <div class="opt-ico">${x.i}</div><div class="opt-txt"><b>${x.t}</b><small>${x.s}</small></div>
      <div class="opt-chk">${S.sexe===x.v?'OK':''}</div></div>`).join('')}</div>`;
  },

  // 3: Ethnicity
  ()=>{const list=Object.entries(ETH).map(([k,v])=>({k,...v}));
    return `<div class="s-emoji">Origine</div>
    <div class="s-title">Origine ethnique</div>
    <div class="s-sub">Les seuils d'obesite et les risques metaboliques varient significativement selon l'origine. <span class="ref">OMS 2004</span> <span class="ref">IDF 2006</span> <span class="ref">Lancet 2016</span></div>
    <div class="opts opts-compact">${list.map(o=>`<div class="opt${S.ethnie===o.k?' sel':''}" onclick="S.ethnie='${o.k}';render(S.step,0)">
      <div class="opt-txt"><b>${o.n}</b><small>Surpoids des ${o.ow} | Obesite des ${o.ob} | Diabete x${o.dR} | CV x${o.cR}</small></div>
      <div class="opt-chk">${S.ethnie===o.k?'OK':''}</div></div>`).join('')}</div>`;
  },

  // 4: Weight & Height
  ()=>{
    const e=ETH[S.ethnie]||ETH.eu;
    const imc=S.taille>0?(S.poids/((S.taille/100)**2)):0;S.imc=parseFloat(imc.toFixed(1))||0;
    let col='var(--green)',lbl='Normal',pts=0;
    if(S.imc>=e.ob+5){col='var(--red)';lbl='Obesite severe';pts=10;}
    else if(S.imc>=e.ob){col='var(--orange)';lbl='Obesite';pts=6;}
    else if(S.imc>=e.ow){col='var(--orange)';lbl='Surpoids';pts=3;}
    return `<div class="s-emoji">Poids</div>
    <div class="s-title">Poids et Taille</div>
    <div class="s-sub">IMC calcule avec les seuils specifiques a votre origine (<b>${e.n}</b>). <span class="ref">OMS</span> <span class="ref">WHO Asia-Pacific</span></div>
    <div class="fc"><div class="fc-label">Poids (kg)</div><input type="number" class="fc-input" value="${S.poids||''}" placeholder="Ex: 72" step="0.1" min="30" max="300" oninput="S.poids=+this.value;render(S.step,0)"></div>
    <div class="fc"><div class="fc-label">Taille (cm)</div><input type="number" class="fc-input" value="${S.taille||''}" placeholder="Ex: 165" min="100" max="250" oninput="S.taille=+this.value;render(S.step,0)"></div>
    ${S.poids>0&&S.taille>0?`
    <div class="metric-hero"><div class="metric-main" style="color:${col}">${S.imc.toFixed(1)}</div><div class="metric-lbl">IMC -- ${lbl}</div>
      <div class="metric-pts" style="color:${col}">${pts}/10 pts</div></div>
    <div class="mrow">
      <div class="mbox"><div class="mbox-lbl">Surpoids des</div><div class="mbox-val">${e.ow}</div></div>
      <div class="mbox"><div class="mbox-lbl">Obesite des</div><div class="mbox-val">${e.ob}</div></div>
      <div class="mbox"><div class="mbox-lbl">Poids ideal</div><div class="mbox-val">${(22*(S.taille/100)**2).toFixed(0)} kg</div></div>
    </div>`:''}`
  },

  // 5: Waist
  ()=>{const e=ETH[S.ethnie]||ETH.eu;const seuil=S.sexe==='f'?e.tf:e.tm;
    const whtr=S.taille>0?(S.tt/S.taille):0;
    let col='var(--green)',lbl='Normal',pts=0;
    if(S.tt>seuil+10){col='var(--red)';lbl='Tres eleve';pts=15;}else if(S.tt>seuil+5){col='var(--orange)';lbl='Eleve';pts=11;}else if(S.tt>seuil){col='var(--orange)';lbl='Au-dessus du seuil';pts=7;}
    let whtrPts=0;if(whtr>=.6)whtrPts=9;else if(whtr>=.55)whtrPts=6;else if(whtr>=.5)whtrPts=3;
    return `<div class="s-emoji">Taille</div>
    <div class="s-title">Tour de taille</div>
    <div class="s-sub">Meilleur indicateur de graisse viscerale. Seuil ${S.sexe==='f'?'feminin':'masculin'} (${e.n}): <b>${seuil} cm</b>. <span class="ref">IDF</span> <span class="ref">BMJ Open 2016</span></div>
    <div class="fc"><div class="fc-explain">Comment mesurer: debout, a mi-distance entre la derniere cote et la crete iliaque (au-dessus du nombril), en expirant normalement. Utilisez un metre ruban non elastique.</div>
    <div class="sld"><div class="sld-big" id="sv_tt">${S.tt||'--'}</div><div class="sld-unit">centimetres</div>
    <input type="range" min="55" max="180" value="${S.tt||80}" step="1" oninput="S.tt=+this.value;render(S.step,0)">
    <div class="sld-lbl"><span>55</span><span style="color:var(--orange)">${seuil} seuil</span><span>180</span></div></div></div>
    ${S.tt>0?`<div class="mrow">
      <div class="mbox"><div class="mbox-lbl">Tour taille</div><div class="mbox-val" style="color:${col}">${S.tt}</div><div class="mbox-sub">${lbl} | ${pts}/15 pts</div></div>
      <div class="mbox"><div class="mbox-lbl">WHtR</div><div class="mbox-val" style="color:${whtr>=.5?'var(--orange)':'var(--green)'}">${whtr.toFixed(3)}</div><div class="mbox-sub">seuil 0.50 | ${whtrPts}/9 pts</div></div>
      <div class="mbox"><div class="mbox-lbl">Seuil</div><div class="mbox-val">${seuil}</div><div class="mbox-sub">${S.sexe==='f'?'Femme':'Homme'} ${e.n.split(' ')[0]}</div></div></div>`:''}`
  },

  // 6: Family
  ()=>`<div class="s-emoji">Famille</div>
    <div class="s-title">Antecedents familiaux</div>
    <div class="s-sub">La genetique explique 40-70% du risque d'obesite. <span class="ref">Lancet 2016</span> <span class="ref">Diabetologia 2014</span></div>
    ${sel('Parents en surpoids ou obeses','parent_ob',[['0','Aucun parent concerne'],['1','Un parent en surpoids/obese (risque x3)'],['2','Les deux parents (risque x8)']],'INTERHEART',10)}
    ${sel('Surpoids dans l\'enfance (avant 12 ans)','enf_ob',[['0','Non, poids normal enfant'],['1','Leger surpoids enfant'],['2','Oui, obese pendant l\'enfance (risque de chronicisation)']],'Lancet 2016',10)}
    ${sel('Diabete type 2 dans la famille','diab_par',[['0','Aucun parent diabetique'],['1','Un parent diabetique type 2'],['2','Deux parents diabetiques']],'ADA 2024',5)}
    ${sel('Historique de regimes yoyo (perte puis reprise de poids)','yoyo',[['0','Non (0 a 2 tentatives)'],['1','Oui, 3 regimes ou plus avec reprise de poids']],'NEJM 2011',5)}
    <div id="aiBox6"></div>`,

  // 7: Geo + Air + Weather (AUTO)
  ()=>{
    if(!S.geo&&!S.geoLoading)setTimeout(autoDetectGeo,400);
    return `<div class="s-emoji">Lieu</div>
    <div class="s-title">Votre lieu de residence</div>
    <div class="s-sub">La qualite de l'air et la meteo sont detectees automatiquement. Ces facteurs influencent directement votre metabolisme. <span class="ref">CAMS/Copernicus</span> <span class="ref">Open-Meteo</span></div>
    <div class="fc">
      <div class="fc-label">Votre localisation</div>
      <div id="geoStatus">${S.geo?`<div class="geo-ok">OK ${S.geo.name}</div>`:(S.geoLoading?'<div class="geo-loading"><span class="spinner"></span> Detection en cours...</div>':'')}</div>
      <div class="geo-btns">
        <button class="btn btn-p btn-sm" onclick="autoDetectGeo()">Detecter ma position</button>
      </div>
      <div class="geo-or">-- ou recherchez votre ville --</div>
      <div class="geo-search-row">
        <input type="text" class="fc-input" id="geoSearch" placeholder="Ex: Paris, Lyon, Port-Louis..." value="${S.geoCity||''}">
        <button class="btn btn-p btn-sm" onclick="searchCity()">OK</button>
      </div>
    </div>
    <div id="geoResults">${S.airData?'':''}</div>`;
  },

  // 8: Work profile
  ()=>`<div class="s-emoji">Travail</div>
    <div class="s-title">Profil professionnel</div>
    <div class="s-sub">Votre activite professionnelle influence directement votre risque metabolique: sedentarite, horaires, stress, alimentation au travail. <span class="ref">Biswas 2015</span></div>
    ${sel('Type d\'activite professionnelle','work_type',[['0','Tres actif physiquement (BTP, agriculture, demenagement)'],['1','Actif (debout, soignant, commerce)'],['2','Mixte (alternance bureau/terrain)'],['3','Plutot assis (bureau avec pauses)'],['4','Bureau 6 a 8h par jour'],['5','Tres sedentaire (+ de 8h assis par jour)'],['6','Teletravail intensif sans pauses']],'',6)}
    ${sel('Heures de travail par semaine','work_hours',[['0','Moins de 35h'],['1','35 a 40h'],['2','40 a 48h'],['3','48 a 55h'],['4','55 a 65h'],['5','Plus de 65h']],'',5)}
    <div class="fc"><div class="fc-top"><div class="fc-label">Lieu de travail <span class="ref">Distance auto</span></div></div>
      <div class="fc-explain">Entrez l'adresse ou la ville de votre travail. La distance sera calculee automatiquement depuis votre domicile.</div>
      <div class="geo-search-row">
        <input type="text" class="fc-input" id="workSearch" placeholder="Ex: La Defense, Paris ou nom d'entreprise, ville" value="${S.workCity||''}">
        <button class="btn btn-p btn-sm" onclick="searchWork()">Calculer</button>
      </div></div>
    <div id="workDist">${S.commuteDist?`<div class="dist-result"><div class="dist-val">${S.commuteDist.toFixed(1)} <span>km</span></div><div class="dist-route">${S.geoCity} -> ${S.workCity}</div><div class="dist-score">Score: ${S.work.dist}/5</div></div>`:''}</div>
    ${sel('Mode de transport principal','work_mode',[['0','Marche ou velo'],['1','Transport en commun'],['2','Voiture < 30 min'],['3','Voiture > 30 min']],'',3)}
    ${sel('Horaires de travail','work_schedule',[['0','Journee standard (8h-18h)'],['1','Horaires decales'],['2','Travail de nuit occasionnel'],['3','Travail de nuit regulier (OR 1.29 obesite)'],['4','Poste 3x8'],['5','Gardes 24h']],'Lane 2024',5)}
    ${sel('Posture dominante au travail','work_posture',[['0','Debout et en mouvement'],['1','Alternance assis/debout'],['2','Assis avec pauses regulieres'],['3','Assis plus de 4h sans pause'],['4','Assis plus de 6h immobile']],'',4)}
    ${sel('Situation vis-a-vis de la retraite','work_retire',[['0','Non concerne (en activite)'],['1','Retraite, actif physiquement'],['2','Retraite sedentaire'],['3','Retraite + prise de poids'],['4','Isolement social'],['5','Isolement + tendance depressive']],'',5)}`,

  // 9: NUTRITION DETAILLEE (obesite-specifique)
  ()=>`<div class="s-emoji">Repas</div>
    <div class="s-title">Habitudes alimentaires</div>
    <div class="s-sub">Evaluation detaillee de votre alimentation. Chaque question cible un comportement specifique lie a la prise de poids. <span class="ref">NOVA</span> <span class="ref">OMS</span></div>
    
    ${sel('Aliments ultra-transformes (plats prepares, snacks industriels, charcuterie, cereales sucrées)','alim_ultra',[['0','Rarement (moins d\'une fois par semaine)'],['1','2 a 3 fois par semaine'],['2','4 a 6 fois par semaine'],['3','Tous les jours ou presque'],['4','Plusieurs fois par jour (base de mon alimentation)']],'NOVA',4)}
    
    ${sel('Boissons sucrees (sodas, jus industriels, boissons energisantes, thes sucres)','alim_sucre_boisson',[['0','Jamais ou tres rarement'],['1','1 a 2 fois par semaine'],['2','3 a 5 fois par semaine'],['3','Tous les jours (1 verre)'],['4','Plusieurs par jour']],'OMS',4)}
    
    ${sel('Sucres ajoutes et desserts (gateaux, bonbons, chocolat, glaces)','alim_sucre_solide',[['0','Rarement (1 fois par semaine max)'],['1','2 a 3 fois par semaine'],['2','Quotidien, une portion'],['3','Quotidien, plusieurs portions'],['4','Grignotage sucre permanent']],'',4)}
    
    ${sel('Fruits et legumes (portions par jour : 1 portion = 1 fruit, 1 bol de legumes)','alim_fibres',[['0','5 portions ou plus par jour (excellent)'],['1','3 a 4 portions par jour'],['2','1 a 2 portions par jour'],['3','Moins d\'une portion par jour'],['4','Presque jamais']],'OMS 5/jour',4)}
    
    ${sel('Taille des portions au repas','alim_portions',[['0','Portions normales, j\'arrete quand je n\'ai plus faim'],['1','Portions legerement grandes'],['2','Grandes portions, j\'ai du mal a m\'arreter'],['3','Tres grandes portions, je mange souvent trop'],['4','Je me ressers systematiquement ou mange jusqu\'a la douleur']],'',4)}
    
    ${sel('Structure des repas dans la journee','alim_repas',[['0','3 repas reguliers a heures fixes'],['1','3 repas mais horaires irreguliers'],['2','Je saute souvent un repas (surtout le petit-dejeuner)'],['3','Repas completement desorganises'],['4','Pas de vrai repas, je mange en continu']],'',4)}
    
    ${sel('Grignotage entre les repas','alim_grignotage',[['0','Jamais ou presque'],['1','Parfois, des collations saines (fruit, yaourt)'],['2','Regulier, souvent des produits sucres ou gras'],['3','Grignotage frequent, souvent par ennui ou stress'],['4','Grignotage permanent, impossible de m\'en passer']],'BES',4)}
    
    ${sel('Restauration rapide / fast-food','alim_fast_food',[['0','Jamais ou exceptionnellement'],['1','1 a 2 fois par mois'],['2','1 fois par semaine'],['3','2 a 3 fois par semaine'],['4','4 fois ou plus par semaine']],'',4)}
    
    ${sel('Cuisine maison vs plats prepares','alim_cuisine',[['0','Je cuisine presque tout moi-meme avec des produits frais'],['1','Majorite cuisine maison, parfois des plats prepares'],['2','Moitie-moitie'],['3','Majorite plats prepares ou livraison'],['4','Je ne cuisine presque jamais']],'',4)}
    
    ${sel('Consommation d\'eau','alim_eau',[['0','1.5L ou plus d\'eau par jour'],['1','1L a 1.5L par jour'],['2','Moins de 1L par jour'],['3','Je bois surtout des boissons sucrees ou du cafe']],'',3)}
    <div id="aiBox9"></div>`,

  // 10: Physical activity (IPAQ)
  ()=>`<div class="s-emoji">Sport</div>
    <div class="s-title">Activite physique</div>
    <div class="s-sub">L'OMS recommande au minimum <b>150 minutes par semaine</b> d'activite moderee. <span class="ref">OMS 2020</span> <span class="ref">IPAQ</span></div>
    ${sld('Activite cardio (marche rapide, course, velo, natation, danse)','ap_cardio',S.ap.cardio,0,300,10,'min/semaine','IPAQ')}
    ${sld('Renforcement musculaire (musculation, yoga, pilates, exercices au poids du corps)','ap_muscu',S.ap.muscu,0,180,10,'min/semaine','')}
    ${sld('Marche quotidienne (trajets, courses, promenades)','ap_marche',S.ap.marche,0,120,5,'min/jour','')}
    ${sld('Temps total assis par jour (bureau, transport, TV, telephone)','assis',S.assis,1,16,.5,'heures/jour','Biswas 2015')}
    <div id="aiBox10"></div>`,

  // 11: Sleep & substances
  ()=>`<div class="s-emoji">Sommeil</div>
    <div class="s-title">Sommeil et substances</div>
    <div class="s-sub">Le manque de sommeil favorise la prise de poids via la ghreline (hormone de la faim). Tabac et alcool aggravent le risque metabolique. <span class="ref">Cappuccio 2008</span></div>
    ${sld('Duree de sommeil par nuit','sommeil',S.sommeil,3,12,.5,'heures','Cappuccio')}
    ${sld('Score ISI (Insomnia Severity Index, 0-28)','isi',S.isi,0,28,1,'/ 28','ISI')}
    <div class="fc"><div class="fc-explain">ISI: 0-7 = pas d\'insomnie | 8-14 = legere | 15-21 = moderee | 22-28 = severe</div></div>
    ${sel('Tabac','tabac',[['0','Jamais fume'],['1','Arrete depuis plus d\'un an'],['2','Arrete depuis moins d\'un an (risque residuel de prise de poids)'],['3','Moins de 10 cigarettes par jour'],['4','10 cigarettes ou plus par jour']],'Aubin 2012',4)}
    ${sel('Alcool: frequence','alcool_f',[['0','Jamais'],['1','2 a 4 fois par mois'],['2','2 a 3 fois par semaine'],['3','4 fois ou plus par semaine']],'AUDIT-C',3)}
    ${sel('Alcool: quantite par occasion','alcool_q',[['0','1 a 2 verres'],['1','3 a 4 verres'],['2','5 a 6 verres'],['3','7 a 9 verres'],['4','10 verres ou plus']],'',4)}`,

  // 12: STRESS PSS-10 (validated items, hierarchical)
  ()=>{
    const pssTotal=getPssTotal();
    let lvl='',col='var(--green)';
    if(pssTotal>=27){lvl='Stress tres eleve';col='var(--red)';}
    else if(pssTotal>=20){lvl='Stress eleve';col='var(--orange)';}
    else if(pssTotal>=14){lvl='Stress modere';col='var(--orange)';}
    else{lvl='Stress faible';col='var(--green)';}
    
    let html=`<div class="s-emoji">Stress</div>
    <div class="s-title">Stress percu (PSS-10)</div>
    <div class="s-sub">Ce questionnaire valide mesure votre niveau de stress au cours du <b>dernier mois</b>. Le stress chronique favorise la prise de poids via le cortisol. <span class="ref">PSS-10 (Cohen 1983)</span></div>
    <div class="metric-hero"><div class="metric-main" style="color:${col}">${pssTotal}</div><div class="metric-lbl">${lvl} (sur 40)</div></div>
    <div class="fc"><div class="fc-explain">Repondez pour chaque situation: 0 = Jamais | 1 = Presque jamais | 2 = Parfois | 3 = Assez souvent | 4 = Tres souvent</div></div>`;
    
    PSS10_ITEMS.forEach((item,i)=>{
      const val=S.pss[i];
      html+=`<div class="fc pss-item">
        <div class="fc-top"><div class="fc-label">Question ${i+1}/10 ${item.inv?'<span class="ref">+ = protecteur</span>':''}</div>
        <div class="fc-score" style="color:${item.inv?(val>=3?'var(--green)':val<=1?'var(--red)':'var(--orange)'):(val>=3?'var(--red)':val<=1?'var(--green)':'var(--orange)')}">${item.inv?(4-val):val}/4</div></div>
        <div class="pss-q">${item.q}</div>
        <div class="pss-tip">${item.tip}</div>
        <div class="pss-opts">
          ${PSS_LABELS.map((lbl,j)=>`<div class="pss-opt${val===j?' sel':''}" onclick="S.pss[${i}]=${j};calc();render(S.step,0)"><span class="pss-opt-n">${j}</span><span class="pss-opt-l">${lbl}</span></div>`).join('')}
        </div>
      </div>`;
    });
    html+=`<div id="aiBox12"></div>`;
    return html;
  },

  // 13: PHQ-9 Depression + BES
  ()=>{
    const phqTotal=getPhqTotal();
    let phqLvl='',phqCol='var(--green)';
    if(phqTotal>=20){phqLvl='Depression severe';phqCol='var(--red)';}
    else if(phqTotal>=15){phqLvl='Depression moderement severe';phqCol='var(--orange)';}
    else if(phqTotal>=10){phqLvl='Depression moderee';phqCol='var(--orange)';}
    else if(phqTotal>=5){phqLvl='Depression legere';phqCol='var(--accent)';}
    else{phqLvl='Pas de depression';phqCol='var(--green)';}

    let html=`<div class="s-emoji">Mental</div>
    <div class="s-title">Depression et comportement alimentaire</div>
    <div class="s-sub">La depression et l'hyperphagie sont des facteurs majeurs de prise de poids. Relation bidirectionnelle avec l'obesite. <span class="ref">PHQ-9 (Kroenke 2001)</span> <span class="ref">BES</span></div>
    <div class="metric-hero"><div class="metric-main" style="color:${phqCol}">${phqTotal}</div><div class="metric-lbl">${phqLvl} (PHQ-9 sur 27)</div></div>
    <div class="fc"><div class="fc-explain">Au cours des 2 dernieres semaines, a quelle frequence avez-vous ete gene(e) par les problemes suivants?</div></div>`;
    
    PHQ9_ITEMS.forEach((q,i)=>{
      const val=S.phq[i];
      html+=`<div class="fc pss-item">
        <div class="fc-top"><div class="fc-label">PHQ ${i+1}/9</div>
        <div class="fc-score" style="color:${val>=2?'var(--red)':val>=1?'var(--orange)':'var(--green)'}">${val}/3</div></div>
        <div class="pss-q">${q}</div>
        <div class="pss-opts">
          ${PHQ_LABELS.map((lbl,j)=>`<div class="pss-opt${val===j?' sel':''}" onclick="S.phq[${i}]=${j};calc();render(S.step,0)"><span class="pss-opt-n">${j}</span><span class="pss-opt-l">${lbl}</span></div>`).join('')}
        </div>
      </div>`;
    });

    html+=`<div class="sec"><div class="sec-tt">Hyperphagie (BES - Binge Eating Scale)</div></div>`;
    html+=sel('Tendance a l\'hyperphagie / crises de boulimie','bes',[
      ['0','Aucune crise'],['1','Rarement (moins d\'une fois par mois)'],['2','1 a 3 fois par mois'],
      ['3','1 fois par semaine'],['4','2 a 3 fois par semaine'],['5','4 a 5 fois par semaine'],
      ['6','Quasi quotidien'],['7','Quotidien avec sentiment de perte de controle'],['8','Plusieurs fois par jour, perte de controle totale']
    ],'BES',8);
    html+=`<div id="aiBox13"></div>`;
    return html;
  },

  // 14: Comorbidities
  ()=>{
    const dis=COMORB.filter(c=>c.cat==='dis'),phe=COMORB.filter(c=>c.cat==='phe'),tx=COMORB.filter(c=>c.cat==='tx');
    const mk=arr=>arr.map(c=>`<div class="cm-card${S.comorbIds.includes(c.id)?' on':''}" onclick="toggleCM('${c.id}')">
      <div class="cm-top"><span class="cm-nm">${c.n}</span><span class="cm-pts" style="color:${S.comorbIds.includes(c.id)?'var(--orange)':'var(--dim3)'}">+${c.p}</span></div>
      <div class="cm-meta">${c.or} -- ${c.d}</div></div>`).join('');
    return `<div class="s-emoji">Sante</div>
    <div class="s-title">Comorbidites</div>
    <div class="s-sub">Selectionnez les maladies et conditions dont vous souffrez ou avez souffert. Cela influence directement votre score BMN-K (comorbidites). <span class="ref">ADA 2024</span> <span class="ref">IDF MetS</span></div>
    <div class="sec"><div class="sec-tt">Maladies etablies</div>${mk(dis)}</div>
    <div class="sec"><div class="sec-tt">Phenotypes metaboliques</div>${mk(phe)}</div>
    <div class="sec"><div class="sec-tt">Traitements aggravants</div>${mk(tx)}</div>
    <div id="aiBox14"></div>`;
  },

  // 15: Bio
  ()=>{calc();const pl=getPanelLvl();const markers=BIO.filter(m=>m.t<=Math.max(5,pl));
    return `<div class="s-emoji">Bio</div>
    <div class="s-title">Resultats biologiques (optionnel)</div>
    <div class="s-sub">Si vous avez des resultats de prise de sang recents, entrez les valeurs ci-dessous. Panel ${pl<=5?'basique (P5)':pl<=10?'intermediaire (P10)':'complet (P15)'} -- <b>${markers.length} marqueurs</b>. <span class="ref">SCORE2</span> <span class="ref">ADA 2024</span></div>
    ${S.sii>=2?'<div class="auto-filled orange">SII >= 2: Panel P5 recommande (inflammation indirecte detectee)</div>':''}
    <div class="fc">${markers.map(m=>`<div class="bio-row">
      <div class="bio-inf"><div class="bio-nm">${m.n}${m.u?' <small>('+m.u+')</small>':''}</div><div class="bio-rg">${m.l}: <span class="bio-ok">${m.nr}</span> / <span class="bio-bad">${m.ar}</span></div></div>
      <input type="number" class="bio-inp" id="bio_${m.id}" value="${S.bioValues[m.id]??''}" step="0.01" placeholder="--"
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
  {from:0,to:0,name:'Accueil',ico:'[H]'},{from:1,to:3,name:'Identite',ico:'[ID]'},
  {from:4,to:5,name:'Mesures',ico:'[M]'},{from:6,to:6,name:'Famille',ico:'[F]'},
  {from:7,to:7,name:'Lieu',ico:'[G]'},{from:8,to:8,name:'Travail',ico:'[T]'},
  {from:9,to:9,name:'Nutrition',ico:'[N]'},{from:10,to:11,name:'Mode de vie',ico:'[V]'},
  {from:12,to:13,name:'Sante mentale',ico:'[S]'},
  {from:14,to:14,name:'Pathologies',ico:'[P]'},{from:15,to:15,name:'Biologie',ico:'[B]'},
  {from:16,to:16,name:'Resultat',ico:'[R]'}
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
  if(step===7&&S.airData)setTimeout(renderGeoResults,50);
  if(step===15)setTimeout(doRetro,60);
  triggerAI(step);
}

function renderNav(step){
  const nav=$('bNav');if(!nav)return;
  if(step===0){nav.innerHTML='';return;}
  const last=step===NTOT-1;
  nav.innerHTML=`<button class="btn btn-s" onclick="go(${step-1},-1)">Retour</button>
    ${last?`<button class="btn btn-d btn-sm" onclick="resetAll()">Recommencer</button><button class="btn btn-p btn-sm" onclick="window.print()">Imprimer</button>`
    :`<button class="btn btn-p" onclick="go(${step+1},1)">Suivant</button>`}`;
}

function updateBadge(){const el=$('hdrScore');if(!el)return;if(S.step<2){el.textContent='';el.style.display='none';return;}calc();el.style.display='';el.textContent=`${S.bmn_c}`;}

// ─── AI trigger on specific screens ───
function triggerAI(step){
  const aiScreens={
    6:{id:'aiBox6',q:'Antecedents: yoyo='+S.yoyo+', parents obeses='+S.parent_ob+', enfant obese='+S.enf_ob+', DT2 familial='+S.diab_par},
    9:{id:'aiBox9',q:'Nutrition: ultra='+S.alim.ultra+', boissons sucrees='+S.alim.sucre_boisson+', portions='+S.alim.portions+', grignotage='+S.alim.grignotage+', fast-food='+S.alim.fast_food+', cuisine maison='+S.alim.cuisine+'. Analyse les habitudes.'},
    10:{id:'aiBox10',q:'Activite physique: cardio='+S.ap.cardio+'min/sem, muscu='+S.ap.muscu+'min/sem, marche='+S.ap.marche+'min/j, assis='+S.assis+'h/j. OMS recommande 150min. Analyse.'},
    12:{id:'aiBox12',q:'Stress PSS-10='+getPssTotal()+'/40. Items: '+S.pss.join(',')+'. Impact sur poids et comportement alimentaire?'},
    13:{id:'aiBox13',q:'Depression PHQ-9='+getPhqTotal()+'/27. BES='+S.bes+'/8. Analyse impact bidirectionnel obesite-depression-hyperphagie.'},
    14:{id:'aiBox14',q:'Comorbidites selectionnees: '+S.comorbIds.join(',')+'. Analyse interactions et impact sur BMN-K.'}
  };
  if(aiScreens[step]){
    const cfg=aiScreens[step];
    const box=$(cfg.id);if(!box)return;
    box.innerHTML='<div class="ai-loading"><span class="spinner"></span> Analyse IA en cours...</div>';
    requestAI(cfg.q,'Ecran '+step).then(d=>{
      if(d)renderAIBubble(cfg.id,d);
      else{const b=$(cfg.id);if(b)b.innerHTML='';}
    });
  }
}

// ════════════════════════════════════════════════════════════════
// CALCULATION ENGINE — BMN v2.0 ABCKO+ (EXACT from Score_BMN_V2.0.docx)
// Modelisation complete avec ponderation, SII, CTI, GRI, Markov
// Strategie prescription biologie P5/Tier2A-2D + Strategie therapeutique
// ════════════════════════════════════════════════════════════════
function calc(){
  const e=ETH[S.ethnie]||ETH.eu,sex=S.sexe,imc=S.imc,tt=S.tt,taille=S.taille;
  const whtr=taille>0?tt/taille:0,ttSeuil=sex==='f'?e.tf:e.tm;
  let c=0;const d={};

  // ── BMN-C : MODULE CLINIQUE (0-150 pts) ──────────────────────
  // IMC 0-10 (OMS / WHO Asia-Pacific / IDF)
  let p=0;
  if(imc>=e.ob+10)p=10;      // obesite morbide
  else if(imc>=e.ob+5)p=8;   // obesite severe
  else if(imc>=e.ob)p=6;     // obesite
  else if(imc>=e.ow)p=3;     // surpoids
  d.imc={pts:p,max:10,label:'IMC ('+S.imc?.toFixed(1)+')',ref:'OMS/IDF'};c+=p;

  // Tour de taille 0-15 (IDF 2006, seuils ethniques)
  p=0;
  if(tt>ttSeuil+15)p=15;
  else if(tt>ttSeuil+10)p=12;
  else if(tt>ttSeuil+5)p=9;
  else if(tt>ttSeuil)p=6;
  else if(tt>ttSeuil-5&&tt<=ttSeuil)p=2; // pre-seuil
  d.tt={pts:p,max:15,label:'Tour de taille ('+tt+' cm)',ref:'IDF 2006'};c+=p;

  // WHtR 0-9 (BMJ Open 2016)
  p=0;if(whtr>=.63)p=9;else if(whtr>=.58)p=7;else if(whtr>=.55)p=5;else if(whtr>=.5)p=3;
  d.whtr={pts:p,max:9,label:'WHtR ('+whtr.toFixed(3)+')',ref:'BMJ Open 2016'};c+=p;

  // Obesite parentale 0-10 (INTERHEART, Lancet 2016)
  p=0;if(S.parent_ob>=2)p=10;else if(S.parent_ob>=1)p=6;
  d.parent={pts:p,max:10,label:'Obesite parentale',ref:'INTERHEART'};c+=p;

  // Enfance + DT2 familial + Yoyo = Famille / genetique (max ~23)
  p=0;if(S.enf_ob>=2)p=8;else if(S.enf_ob>=1)p=4;
  d.enfance={pts:p,max:8,label:'Surpoids enfance',ref:'Lancet 2016'};c+=p;

  p=0;if(S.diab_par>=2)p=5;else if(S.diab_par>=1)p=3;
  d.dt2fam={pts:p,max:5,label:'DT2 familial',ref:'ADA 2024'};c+=p;

  p=S.yoyo>=1?5:0;
  d.yoyo={pts:p,max:5,label:'Regimes yoyo (>= 3 tentatives)',ref:'NEJM 2011'};c+=p;

  // Tabac 0-8 (Aubin 2012)
  p=0;if(S.tabac==4)p=8;else if(S.tabac==3)p=5;else if(S.tabac==2)p=6;else if(S.tabac==1)p=1;
  d.tabac={pts:p,max:8,label:'Tabac',ref:'Aubin 2012'};c+=p;

  // Alcool 0-5 (AUDIT-C)
  p=Math.min(5,S.alcool_f+S.alcool_q);
  d.alcool={pts:p,max:5,label:'Alcool',ref:'AUDIT-C'};c+=p;

  // Alimentation 0-15 (DQI-BMN: 10 items x0-4 = 0-39 raw, normalise /15)
  const alimRaw=S.alim.ultra+S.alim.sucre_boisson+S.alim.sucre_solide+S.alim.fibres
    +S.alim.portions+S.alim.repas+S.alim.grignotage+S.alim.fast_food+S.alim.cuisine+S.alim.eau;
  const alimT=Math.min(15,Math.round(alimRaw*15/39));
  d.alim={pts:alimT,max:15,label:'Alimentation (DQI-BMN)',ref:'NOVA/OMS',raw:alimRaw,rawMax:39};c+=alimT;

  // Activite physique 0-9 (IPAQ / OMS 2020)
  const apT=S.ap.cardio+S.ap.muscu+S.ap.marche*3.5;
  p=0;if(apT<30)p=9;else if(apT<75)p=7;else if(apT<150)p=4;else if(apT<300)p=1;
  d.ap={pts:p,max:9,label:'Activite physique',ref:'IPAQ/OMS'};c+=p;

  // Sedentarite 0-9 (Biswas 2015, HR 1.91 si >8h/j)
  p=0;if(S.assis>=12)p=9;else if(S.assis>=10)p=7;else if(S.assis>=8)p=5;else if(S.assis>=6)p=3;
  d.assis={pts:p,max:9,label:'Sedentarite ('+S.assis+'h/j)',ref:'Biswas 2015'};c+=p;

  // Sommeil duree 0-7 (Cappuccio 2008)
  p=0;if(S.sommeil<5||S.sommeil>10)p=7;else if(S.sommeil<6||S.sommeil>9)p=4;else if(S.sommeil<7)p=2;
  d.sleep={pts:p,max:7,label:'Sommeil ('+S.sommeil+'h)',ref:'Cappuccio 2008'};c+=p;

  // Insomnie ISI 0-8
  p=0;if(S.isi>=22)p=8;else if(S.isi>=15)p=6;else if(S.isi>=8)p=3;
  d.isi={pts:p,max:8,label:'Insomnie (ISI '+S.isi+'/28)',ref:'ISI'};c+=p;

  // Stress PSS-10 0-10 (Cohen 1983)
  const pssT=getPssTotal();
  const sr=pssT/40; // ratio normalise
  p=0;if(pssT>=27)p=10;else if(pssT>=20)p=8;else if(pssT>=14)p=5;else if(pssT>=7)p=2;
  d.stress={pts:p,max:10,label:'Stress PSS-10 ('+pssT+'/40)',ref:'PSS-10 Cohen 1983'};c+=p;

  // Depression PHQ-9 0-10 (Kroenke 2001)
  const phqT=getPhqTotal();
  p=0;if(phqT>=20)p=10;else if(phqT>=15)p=8;else if(phqT>=10)p=5;else if(phqT>=5)p=2;
  d.phq9={pts:p,max:10,label:'Depression PHQ-9 ('+phqT+'/27)',ref:'PHQ-9 Kroenke'};c+=p;

  // BES Hyperphagie 0-8
  p=0;if(S.bes>=7)p=8;else if(S.bes>=5)p=6;else if(S.bes>=3)p=4;else if(S.bes>=1)p=1;
  d.bes={pts:p,max:8,label:'Hyperphagie (BES)',ref:'BES'};c+=p;

  // Perturbateurs endocriniens 0-5 (OR 1.49)
  const endocScore=Math.min(5, Math.round((S.alim.ultra*0.5 + S.alim.fast_food*0.5)*5/4));
  d.endoc={pts:endocScore,max:5,label:'Perturbateurs endocriniens (estime)',ref:'OR 1.49'};c+=endocScore;

  // Niveau socio-economique 0-5
  // estime via travail + alimentation
  const seScore=Math.min(5, Math.round((S.work.type>=5?3:S.work.type>=3?1:0) + (S.alim.cuisine>=3?2:S.alim.cuisine>=2?1:0)));
  d.socio={pts:seScore,max:5,label:'Niveau socio-economique',ref:'Determinants sociaux'};c+=seScore;

  // Travail de nuit 0-5 (OR 1.43, Lane 2024)
  p=0;
  const sched=S.work.schedule||0;
  if(sched>=5)p=5;else if(sched>=3)p=4;else if(sched>=2)p=3;else if(sched>=1)p=1;
  d.nuit={pts:p,max:5,label:'Travail de nuit',ref:'Lane 2024 (OR 1.43)'};c+=p;

  // Exposome environnemental auto 0-10 (CAMS/Copernicus)
  const expoT=S.expo.air+S.expo.temp+S.expo.uv;
  p=Math.min(10,expoT);
  d.expo={pts:p,max:10,label:'Exposome auto (air+temp+UV)',ref:'CAMS/Copernicus',raw:expoT,rawMax:15};c+=p;

  // Distance domicile-travail 0-5
  d.commute={pts:S.work.dist||0,max:5,label:'Trajet domicile-travail',ref:'Sedentarite transport'};c+=S.work.dist||0;

  // Posture travail 0-4
  d.posture={pts:Math.min(4,S.work.posture||0),max:4,label:'Posture au travail',ref:'Biswas 2015'};c+=Math.min(4,S.work.posture||0);

  // ── MODULATION ETHNIQUE ──
  c=Math.round(c*(1+e.ev/100));
  S.bmn_c=Math.max(0,Math.min(150,c));
  S.details=d;

  // ── SII : Sous-Index Inflammatoire (7 items binaires du document) ──
  // Ref: "chaque item binaire ajoute 1 point"
  let sii=0;
  if(sr>=0.35) sii++;                     // PSS-10 >= 0.35 (normalise)
  if(d.assis.pts>=2) sii++;              // sedentarite >= 2 pts
  if(imc>=e.ob) sii++;                   // IMC >= seuil obesite ethnique
  if(S.tabac>=3) sii++;                  // tabagisme actif (c7 >= 4 -> tabac val 3 ou 4)
  if(S.alim.ultra>=2) sii++;            // ultra-transformes score >= 2
  if(S.isi>=15) sii++;                   // ISI >= 15 (insomnie moderee+)
  if(tt>ttSeuil) sii++;                  // tour de taille > seuil ethnique
  S.sii=sii;

  // ── BMN-K : MODULE COMORBIDITES (0-50 pts) ──────────────────
  // Chaque comorbidite a: points (p), amplificateur CTI (ca), coefficient GRI (gr)
  let k=0, ctiAmp=1;
  const griF=[], griU=[]; // favorables et defavorables pour GRI
  S.comorbIds.forEach(id=>{
    const cm=COMORB.find(x=>x.id===id);
    if(!cm)return;
    k+=cm.p;
    // Amplificateur CTI: on prend le MAX
    if(cm.ca>ctiAmp) ctiAmp=cm.ca;
    // GRI: favorables (gri_fav=1) vs defavorables (gr<0)
    if(cm.gri_fav && cm.gr>0) griF.push({id:cm.id,d:cm.gr});
    else if(cm.gr<0) griU.push({id:cm.id,e:Math.abs(cm.gr)});
  });
  S.bmn_k=Math.min(50,k);

  // ── CTI : Chronicity Trajectory Index ──────────────────────
  // CTI = sum(gamma_j * Z_j) * max(amplificateur comorbidite)
  // gamma: dur=0.185, yoyo=0.249, lep=0.210, micro=0.180, cort=0.195, meta=0.200, enf=0.240
  let ctiSum=0;
  // Z1 = duree/severite obesite (proxy: BMN-C normalise)
  const z1=S.bmn_c>100?1:S.bmn_c>70?0.7:S.bmn_c>40?0.4:0.1;
  ctiSum += 0.185 * z1;
  // Z2 = yoyo (binaire)
  ctiSum += 0.249 * (S.yoyo>=1?1:0);
  // Z3 = leptino-resistance (proxy: IMC + SAOS)
  const z3=Math.min(1, (imc>35?1:imc>30?0.6:imc>27.5?0.3:0) + (S.comorbIds.includes('saos')?0.3:0));
  ctiSum += 0.210 * z3;
  // Z4 = dysbiose/microbiote (proxy: diet ultra-transformes normalise)
  ctiSum += 0.180 * Math.min(1, alimRaw/25);
  // Z5 = cortisol chronique (stress + insomnie + nuit)
  const z5=Math.min(1, sr*0.4 + (S.isi/28)*0.3 + (sched/5)*0.3);
  ctiSum += 0.195 * z5;
  // Z6 = ralentissement metabolique (hypothyroidie + yoyo)
  const z6=Math.min(1, (S.comorbIds.includes('hypo')?0.6:0) + (S.yoyo>=1?0.4:0));
  ctiSum += 0.200 * z6;
  // Z7 = programming enfance
  ctiSum += 0.240 * (S.enf_ob>=2?1:S.enf_ob>=1?0.5:0);
  // Normalisation CTI [0-100], application amplificateur
  const ctiMax = 0.185+0.249+0.210+0.180+0.195+0.200+0.240; // = 1.459
  S.cti=Math.min(100, Math.round((ctiSum/ctiMax)*100 * ctiAmp));

  // ── GRI : GLP-1 Response Index ──────────────────────────────
  // GRI = sum(delta_k * F_k) - sum(epsilon_k * U_k)
  // Favorables delta: HOMA-IR>2.5=1.07, pre-diabete=0.82, NAFLD=0.66, SOPK=0.83,
  //   adiponectine<6=0.62, MONW=0.70, MetS=0.65, TG/HDL>3.5=0.55
  // Defavorables epsilon: CTI>55=0.65, cortisol eleve=0.28, IMC>40=0.47, corticoides=0.35
  let gri=0;
  // Favorables depuis comorbidites
  griF.forEach(f=>{ gri += f.d; });
  // Favorables depuis biomarqueurs
  if(S.bioValues.homaIR!==undefined && S.bioValues.homaIR>2.5) gri += 1.07;
  if(S.bioValues.adipon!==undefined && S.bioValues.adipon<6) gri += 0.62;
  if(S.bioValues.tghdl!==undefined && S.bioValues.tghdl>3.5) gri += 0.55;
  // Defavorables
  if(S.cti>55) gri -= 0.65;
  if(S.comorbIds.includes('cortis')) gri -= 0.35;
  if(imc>40) gri -= 0.47;
  if(sr>=0.6) gri -= 0.28; // cortisol chronique proxy
  S.gri=Math.max(-3, Math.min(6, gri));

  // ── BMN-B : MODULE BIOLOGIE (0-100, score normalise pondere) ──
  // 15 biomarqueurs, chacun avec seuils normal/anormal, poids w, certains inverses
  let swz=0, sw=0;
  BIO.forEach(m=>{
    const v=S.bioValues[m.id];
    if(v===undefined || v===null) return;
    let z;
    if(!m.inv){
      z = v<=m.nm ? 0 : v>=m.ab ? 1 : (v-m.nm)/(m.ab-m.nm);
    } else {
      z = v>=m.nm ? 0 : v<=m.ab ? 1 : (m.nm-v)/(m.nm-m.ab);
    }
    z=Math.max(0, Math.min(1, z));
    swz += z * m.w;
    sw += m.w;
  });
  S.bmn_b = sw>0 ? Math.round(swz/sw*100) : 0;

  // ── BMN-T : SCORE TOTAL (ponderation dynamique du document) ──
  // BMN_T = w_C * C_norm + w_B * Bio_norm + w_K * K_norm
  // Base: w_C=0.55, w_B=0.30, w_K=0.15
  const cN=(S.bmn_c/150)*100;  // C normalise [0-100]
  const kN=(S.bmn_k/50)*100;   // K normalise [0-100]
  const bN=S.bmn_b;            // B deja [0-100]

  let wC=0.55, wB=0.30, wK=0.15;

  // Ponderation dynamique: si gap Bio-Clinique > 20
  const gap=bN-cN;
  if(gap>20){
    const extraW=Math.min(0.30, (gap-20)/100 * 0.60);
    wB = 0.30 + extraW;
    wC = 0.55 - extraW * 0.75;
  }
  // Normalisation des poids pour somme=1
  const wSum=wC+wB+wK;
  wC/=wSum; wB/=wSum; wK/=wSum;

  let bmnt_raw = wC*cN + wB*bN + wK*kN;

  // Floors (planchers) du document:
  // 1) BioFloor: BMN_T >= 0.75 * Bio_norm
  if(bN>0 && bmnt_raw < bN*0.75) bmnt_raw = bN*0.75;
  // 2) Urgent BioFloor: si Bio_norm > 90, BMN_T >= max(80, 0.85*Bio_norm)
  if(bN>90) bmnt_raw = Math.max(bmnt_raw, Math.max(80, bN*0.85));
  // 3) Comorbidity floor: si BMN_K > 30 et BMN_T < 40
  if(k>30 && bmnt_raw<40) bmnt_raw = Math.max(40, kN*0.80);
  // 4) Urgence HbA1c
  if(S.bioValues.hba1c>=6.5 && bmnt_raw<60) bmnt_raw=60;

  // Mise a l'echelle /200
  S.bmn_t=Math.max(0, Math.min(200, Math.round(bmnt_raw*2)));
}

// ── PRESCRIPTION BIOLOGIE : Panels selon BMN-C + SII ──────────
function getBioPrescription(){
  const bmnc=S.bmn_c, sii=S.sii;
  // Criteres independants declenchant P5
  const age=getAge();
  const indep = age>=40 || S.diab_par>=1 || S.comorbIds.length>0;

  // Panel de base P5 (7 marqueurs)
  const P5=['Glycemie a jeun','HbA1c','TSH','NFS (Numeration Formule Sanguine)','CRP ultrasensible','LDL cholesterol','HDL cholesterol'];
  // Tier 2A = P5 + 2
  const T2A=[...P5,'HOMA-IR','Triglycerides'];
  // Tier 2B = T2A + 7
  const T2B=[...T2A,'Insulinemie','Ratio TG/HDL','ApoB','Adiponectine','ASAT/ALAT','GGT','Creatinine','Acide urique'];
  // Tier 2C = T2B + 4
  const T2C=[...T2B,'Leptine','FibroScan / CAP','Cortisol salivaire','Testosterone / AMH (si SOPK)'];
  // Tier 2D = T2C + 3
  const T2D=[...T2C,'Genetique FTO / MC4R','Microbiote 16S rRNA','TDEE mesure (calorimetrie)'];

  let tier='', panel=[], color='', desc='', suivi='';

  if(bmnc<40){
    if(sii>=2 || indep){
      tier='P5 (Panel de base)'; panel=P5; color='var(--accent)';
      desc='SII >= 2 ou critere independant (age >= 40, antecedent familial, comorbidite connue). Bilan de depistage recommande.';
      suivi='Controle dans 2-3 ans';
    } else {
      tier='Optionnel'; panel=[]; color='var(--green)';
      desc='BMN-C faible et SII < 2 : pas de bilan biologique obligatoire. Envisager P5 si premiere consultation ou bilan > 2 ans.';
      suivi='Controle dans 3 ans';
    }
  } else if(bmnc<=70){
    tier='Tier 2A (P5 + metabolisme glucidique)'; panel=T2A; color='var(--orange)';
    desc='Risque modere. Bilan metabolique incluant HOMA-IR et triglycerides pour depister l\'insulinoresistance precoce.';
    suivi='Suivi annuel';
  } else if(bmnc<=100){
    tier='Tier 2B (Bilan metabolique etendu)'; panel=T2B; color='var(--orange)';
    desc='Risque eleve. Bilan complet incluant marqueurs hepatiques, inflammatoires et vasculaires. Recherche active de NAFLD et syndrome metabolique.';
    suivi='Suivi trimestriel';
  } else if(bmnc<=130){
    tier='Tier 2C (Bilan endocrinien complet)'; panel=T2C; color='var(--red)';
    desc='Risque tres eleve. Bilan endocrinien complet avec recherche de resistance a la leptine, steatose hepatique (FibroScan), hypercortisolisme et SOPK.';
    suivi='Suivi mensuel';
  } else {
    tier='Tier 2D (Bilan exhaustif + genetique)'; panel=T2D; color='var(--purple)';
    desc='Risque critique. Bilan exhaustif incluant analyses genetiques (FTO, MC4R), profil microbiote et mesure de la depense energetique reelle.';
    suivi='Suivi mensuel - equipe pluridisciplinaire';
  }

  return {tier, panel, color, desc, suivi, sii, bmnc, indep};
}

// ── STRATEGIE THERAPEUTIQUE : 5 tiers selon BMN-T ─────────────
function getTherapeuticStrategy(){
  const t=S.bmn_t, cti=S.cti, gri=S.gri;
  const strats=[];

  if(t<=40){
    strats.push({
      level:'FAIBLE',color:'var(--green)',
      title:'Surveillance - Risque faible (BMN-T <= 40)',
      actions:[
        'Alimentation mediterraneenne equilibree',
        'Activite physique >= 150 min/semaine (OMS)',
        'Sommeil 7-8h regulier',
        'Gestion du stress (coherence cardiaque, relaxation)',
        'Bilan metabolique de controle tous les 3 ans'
      ],
      suivi:'Consultation de controle tous les 3 ans',
      pharma:null
    });
  } else if(t<=80){
    strats.push({
      level:'MODERE',color:'var(--orange)',
      title:'Programme Nutrition + Activite Physique (Tier 2A)',
      actions:[
        'Consultation dieteticien/nutritionniste',
        'Programme d\'activite physique adapte et progressif',
        'Reduction des aliments ultra-transformes (classification NOVA)',
        'Education therapeutique sur les portions',
        'Gestion active du stress (meditation, TCC)',
        'Suivi psychologique si PHQ-9 >= 10 ou PSS-10 >= 20'
      ],
      suivi:'Suivi annuel avec medecin + dieteticien',
      pharma:'Pas de traitement pharmacologique recommande a ce stade'
    });
  } else if(t<=120){
    strats.push({
      level:'ELEVE',color:'var(--orange)',
      title:'Suivi Renforce + GLP-1 Preventif (Tier 2B)',
      actions:[
        'Suivi trimestriel medecin + dieteticien',
        'Bilan Panel Tier 2B complet',
        'Programme d\'activite physique encadre (kinesitherapeute)',
        'Prise en charge psychologique si stress/depression',
        'Semaglutide preventif a discuter si GRI >= 1.5',
        'Objectif perte de poids : >= 5-10% en 6 mois'
      ],
      suivi:'Suivi trimestriel',
      pharma: gri>=1.5 
        ? 'Semaglutide (Ozempic/Wegovy) - Profil GLP-1 favorable (GRI '+gri.toFixed(1)+')'
        : 'GLP-1 a discuter apres analyse GRI complete (actuel: '+gri.toFixed(1)+')'
    });
  } else if(t<=160){
    strats.push({
      level:'TRES ELEVE',color:'var(--red)',
      title:'GLP-1 Prioritaire + Equipe Pluridisciplinaire (Tier 2C)',
      actions:[
        'RDV endocrinologue dans les 2 semaines',
        'Bilan Panel Tier 2C complet',
        'GLP-1 (Tirzepatide ou Semaglutide haute dose) en priorite',
        'Suivi nutrition mensuel',
        'Programme d\'activite physique adapte supervise',
        'Prise en charge psychologique systematique',
        'Evaluation bariatrique si CTI > 55'
      ],
      suivi:'Suivi mensuel',
      pharma:'Tirzepatide (Mounjaro) ou Semaglutide haute dose - objectif >= 15% perte de poids'
    });
  } else {
    strats.push({
      level:'CRITIQUE',color:'var(--purple)',
      title:'Prise en Charge Multidisciplinaire Urgente + Evaluation Bariatrique (Tier 2D)',
      actions:[
        'RDV urgent centre specialise obesite',
        'Bilan Panel Tier 2D complet (genetique + microbiote)',
        'GLP-1 haute dose + combinaison si necessite',
        'Evaluation chirurgie bariatrique obligatoire si CTI > 55',
        'Suivi psychiatrique (comorbidites mentales)',
        'Programme de rehabilitation metabolique',
        'Suivi nutritionnel intensif (2x/mois)'
      ],
      suivi:'Suivi bimensuel - equipe pluridisciplinaire',
      pharma:'Tirzepatide haute dose + evaluation chirurgie bariatrique'
    });
  }

  // Ajout carte chirurgie si CTI > 55
  if(cti>55){
    strats.push({
      level:'CHIRURGIE',color:'var(--purple)',
      title:'Chirurgie Bariatrique a Evaluer (CTI '+cti+'/100)',
      actions:[
        'Consultation chirurgien bariatrique obligatoire',
        'Evaluation psychologique pre-operatoire',
        'Bilan nutritionnel pre-operatoire complet',
        'Techniques: sleeve gastrectomy, bypass gastrique, SADI-S',
        'Suivi nutritionnel post-operatoire 5 ans minimum',
        'Score DiaRem si diabete type 2'
      ],
      suivi:'Bilan pre-operatoire puis suivi 5 ans',
      pharma:'Arret GLP-1 en peri-operatoire - reprise a evaluer'
    });
  }

  // Carte GRI si eleve
  if(gri>=2.5){
    strats.push({
      level:'GLP-1 EXCELLENT',color:'var(--green)',
      title:'Reponse GLP-1 Excellente (GRI '+gri.toFixed(1)+')',
      actions:[
        'Votre profil metabolique predit une excellente reponse aux GLP-1',
        'HOMA-IR eleve + marqueurs favorables = forte chance de succes',
        'Semaglutide ou Tirzepatide recommandes',
        'Objectif: >= 15-20% de perte de poids',
        'Suivi endocrinologue a 3, 6 et 12 mois'
      ],
      suivi:'Suivi trimestriel sous traitement',
      pharma:null
    });
  } else if(gri>=1.5 && t>80){
    strats.push({
      level:'GLP-1 BON',color:'var(--teal)',
      title:'Reponse GLP-1 Bonne (GRI '+gri.toFixed(1)+')',
      actions:[
        'Profil metabolique compatible avec les GLP-1',
        'Semaglutide ou Tirzepatide a discuter avec endocrinologue',
        'Surveillance de la reponse a 3 mois'
      ],
      suivi:'Evaluation de la reponse a 3 mois',
      pharma:null
    });
  }

  // Carte exposome
  if(expoT>=6){
    strats.push({
      level:'ENVIRONNEMENT',color:'var(--teal)',
      title:'Actions Environnementales (Exposome '+expoT+'/15)',
      actions:[
        expoT>=8?'Purificateur d\'air HEPA recommande (AQI eleve)':'Ventilation naturelle reguliere',
        S.expo.uv>=2?'Protection solaire quotidienne (UV eleve)':'',
        S.expo.temp>=3?'Adapter l\'activite physique aux conditions thermiques extremes':'',
        'Eviter les heures de pointe pour la pollution',
        'Limiter l\'exposition aux perturbateurs endocriniens'
      ].filter(Boolean),
      suivi:'Surveillance continue des indicateurs environnementaux',
      pharma:null
    });
  }

  return strats;
}

// ── Classification BMN-T ──
function getClass(s){
  if(s<=40) return{l:'FAIBLE',c:'var(--green)',bg:'var(--green-bg)',p:'< 8%',tier:'Surveillance'};
  if(s<=80) return{l:'MODERE',c:'var(--orange)',bg:'var(--orange-bg)',p:'8-22%',tier:'Nutrition + AP'};
  if(s<=120) return{l:'ELEVE',c:'var(--orange)',bg:'var(--orange-bg)',p:'22-47%',tier:'GLP-1 preventif'};
  if(s<=160) return{l:'TRES ELEVE',c:'var(--red)',bg:'var(--red-bg)',p:'47-71%',tier:'GLP-1 prioritaire'};
  return{l:'CRITIQUE',c:'var(--purple)',bg:'var(--purple-bg)',p:'> 71%',tier:'Chirurgie bariatrique'};
}

// ── CTI Interpretation ──
function getCTILabel(cti){
  if(cti<=20) return {l:'Fenetre therapeutique ouverte',c:'var(--green)',d:'Les interventions classiques (nutrition, AP) seront efficaces'};
  if(cti<=40) return {l:'Debut de chronicisation',c:'var(--orange)',d:'Agir rapidement, efficacite des mesures classiques encore bonne'};
  if(cti<=55) return {l:'Chronicite avancee',c:'var(--red)',d:'Les methodes classiques seules seront insuffisantes. GLP-1 recommande.'};
  return {l:'Chronicite installee - chirurgie',c:'var(--purple)',d:'Trajet metabolique ferme. Evaluation chirurgicale obligatoire.'};
}

// ── GRI Interpretation ──
function getGRILabel(gri){
  if(gri>=2.5) return {l:'Excellent',c:'var(--green)',d:'Forte probabilite de reponse aux GLP-1 (>85%)'};
  if(gri>=1.5) return {l:'Bon',c:'var(--teal)',d:'Bonne probabilite de reponse aux GLP-1 (60-85%)'};
  if(gri>=0.5) return {l:'Modere',c:'var(--orange)',d:'Reponse GLP-1 possible mais incertaine (35-60%)'};
  return {l:'Faible',c:'var(--red)',d:'Faible probabilite de reponse GLP-1 (<35%). Chirurgie a envisager.'};
}

// ── Panel biologique pour ecran 15 ──
function getPanelLvl(){
  if(S.bmn_c<40) return S.sii>=2?5:0;
  if(S.bmn_c<=70) return 5;  // Tier 2A -> P5 + HOMA-IR + TG
  if(S.bmn_c<=100) return 10; // Tier 2B
  return 15; // Tier 2C/2D
}

// ── MARKOV : Projection 10 ans ──────────────────────────────
function calcMarkov(){
  const bT=S.bmn_t, kN=(S.bmn_k/50)*100, imc=S.imc, e=ETH[S.ethnie]||ETH.eu;
  // Etat initial selon IMC
  let cs=0;
  if(imc>=35) cs=5;
  else if(imc>=30) cs=4;
  else if(imc>=27.5) cs=3;
  else if(imc>=e.ow) cs=2;
  else if(imc>=e.ow-2) cs=1;

  // Facteur de risque: exp(theta_BMN * BMN_T/100) * exp(theta_K * K_norm/100)
  // theta_BMN=0.68, theta_K=0.35
  const rf=Math.exp(0.68*bT/200) * Math.exp(0.35*kN/100);

  // Amplificateur comorbidite max
  let cm=1;
  S.comorbIds.forEach(id=>{ if(MK_CM[id]) cm=Math.max(cm, MK_CM[id]); });

  let prob=[0,0,0,0,0,0];
  prob[cs]=1;

  for(let y=0; y<10; y++){
    const np=[0,0,0,0,0,0];
    for(let i=0; i<6; i++){
      if(prob[i]<0.001) continue;
      const row=MK_B[i].slice();
      // Augmenter transitions vers etats superieurs
      for(let j=i+1; j<6; j++) row[j] *= rf*cm;
      // Diminuer transitions vers etats inferieurs
      for(let j=0; j<i; j++) row[j] /= rf;
      const rt=row.reduce((a,b)=>a+b, 0);
      for(let j=0; j<6; j++) np[j] += prob[i]*(row[j]/rt);
    }
    prob=np;
  }
  return {cs, prob};
}

// ── RETRO-DIAGNOSTIC ──
function doRetro(){
  const v=S.bioValues, fl=[];
  if(v.homaIR>=4 && !S.comorbIds.includes('dt2') && !S.comorbIds.includes('predmt'))
    fl.push({c:'var(--red)',t:'HOMA-IR >= 4 : resistance insuline severe non declaree. Ajoutez "Pre-diabete" ou "DT2".'});
  if(v.hba1c>=5.7 && v.hba1c<6.5 && !S.comorbIds.includes('predmt'))
    fl.push({c:'var(--orange)',t:'HbA1c '+v.hba1c+'% : zone pre-diabete (5.7-6.4%). Ajoutez "Pre-diabete". Ref: ADA 2024'});
  if(v.hba1c>=6.5 && !S.comorbIds.includes('dt2'))
    fl.push({c:'var(--red)',t:'HbA1c '+v.hba1c+'% : seuil diabete type 2 franchi. Ajoutez "DT2". Ref: ADA 2024'});
  if(v.tghdl>3.5 && v.adipon!==undefined && v.adipon<6 && v.homaIR>2.5)
    fl.push({c:'var(--red)',t:'TRIADE IR CACHEE: TG/HDL '+v.tghdl?.toFixed(1)+' + Adiponectine '+v.adipon+' + HOMA-IR '+v.homaIR+'. Resistance insuline severe.'});
  if(v.crphs>=3 && v.crphs<10)
    fl.push({c:'var(--orange)',t:'CRP '+v.crphs+' mg/L : inflammation systemique chronique. Impact: adipogenese, insulinoresistance.'});
  if(v.crphs>=10)
    fl.push({c:'var(--red)',t:'CRP '+v.crphs+' mg/L : inflammation aigue/severe. Exclure infection avant interpretation metabolique.'});
  if(v.tsh>=4 && v.tsh<10 && !S.comorbIds.includes('hypo'))
    fl.push({c:'var(--orange)',t:'TSH '+v.tsh+' mUI/L : hypothyroidie subclinique. Metabolisme ralenti -10/15%. Ajoutez "Hypothyroidie".'});
  if(v.tsh>=10)
    fl.push({c:'var(--red)',t:'TSH '+v.tsh+' mUI/L : hypothyroidie franche. Traitement L-thyroxine necessaire.'});
  if(v.apob>=1.2)
    fl.push({c:'var(--orange)',t:'ApoB '+v.apob+' g/L : risque cardiovasculaire eleve (meilleur predicteur que LDL).'});
  if(v.urate>=420)
    fl.push({c:'var(--orange)',t:'Acide urique '+v.urate+' umol/L : hyperuricemie. Risque de goutte + marqueur MetS.'});
  if(v.leptine>=40)
    fl.push({c:'var(--orange)',t:'Leptine '+v.leptine+' ng/mL : resistance a la leptine. Signal de satiete altere.'});

  const el=$('retro');if(!el)return;
  el.innerHTML=fl.length
    ? fl.map(f=>`<div class="retro-alert" style="border-left-color:${f.c}"><span style="color:${f.c}">${f.t}</span></div>`).join('')
    : '<div class="retro-ok">Pas d\'incoherence biologie/comorbidites detectee.</div>';
}

// ════════════════════════════════════════════════════════════════
// FINAL RESULT — Affichage complet avec strategies et ordonnances
// ════════════════════════════════════════════════════════════════
function renderFinal(){
  const t=S.bmn_t, cls=getClass(t), mk=calcMarkov();
  const ctiInfo=getCTILabel(S.cti), griInfo=getGRILabel(S.gri);
  const bioPrx=getBioPrescription();
  const strats=getTherapeuticStrategy();
  const colors=['var(--green)','var(--teal)','var(--orange)','var(--orange)','var(--red)','var(--purple)'];
  const pObes=((mk.prob[4]+mk.prob[5])*100).toFixed(1);
  const pssT=getPssTotal(), phqT=getPhqTotal();
  const expoT=S.expo.air+S.expo.temp+S.expo.uv;

  let r='';

  // ── 1. HERO SCORE ──
  r+=`<div class="res-hero" style="background:${cls.bg}">
    <div class="res-num" style="color:${cls.c}">${t}<span class="res-max">/200</span></div>
    <div class="res-lv" style="color:${cls.c}">${cls.l}</div>
    <div class="res-tier" style="color:${cls.c}">${cls.tier}</div>
    <div class="res-pr">P(obesite 10 ans): ${cls.p}</div></div>`;

  // ── 2. GRILLE DES SCORES ──
  r+=`<div class="res-grid">
    <div class="res-item"><div class="res-item-l">BMN-C</div><div class="res-item-v" style="color:var(--accent)">${S.bmn_c}</div><div class="res-item-s">/150 clinique</div></div>
    <div class="res-item"><div class="res-item-l">BMN-K</div><div class="res-item-v" style="color:var(--orange)">${S.bmn_k}</div><div class="res-item-s">/50 comorbidites</div></div>
    <div class="res-item"><div class="res-item-l">BMN-B</div><div class="res-item-v" style="color:${S.bmn_b>0?'var(--teal)':'var(--dim)'}">${S.bmn_b||'--'}</div><div class="res-item-s">/100 biologie</div></div>
    <div class="res-item"><div class="res-item-l">CTI</div><div class="res-item-v" style="color:${ctiInfo.c}">${S.cti}</div><div class="res-item-s">${ctiInfo.l}</div></div>
    <div class="res-item"><div class="res-item-l">GRI</div><div class="res-item-v" style="color:${griInfo.c}">${S.gri.toFixed(1)}</div><div class="res-item-s">${griInfo.l}</div></div>
    <div class="res-item"><div class="res-item-l">SII</div><div class="res-item-v" style="color:${S.sii>=4?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)'}">${S.sii}</div><div class="res-item-s">/7 inflam.</div></div>
  </div>`;

  // ── 3. DETAIL CTI et GRI ──
  r+=`<div class="sec"><div class="sec-tt">Indices de chronicite et reponse therapeutique</div>
    <div class="str-card" style="border-left-color:${ctiInfo.c}">
      <div class="str-tt" style="color:${ctiInfo.c}">CTI = ${S.cti}/100 -- ${ctiInfo.l}</div>
      <div class="str-desc">${ctiInfo.d}</div>
      <div class="str-desc" style="font-size:11px;color:var(--dim2)">Formule: CTI = sum(gamma_j * Z_j) * max(amplificateur) | gamma: 0.185, 0.249, 0.210, 0.180, 0.195, 0.200, 0.240</div>
    </div>
    <div class="str-card" style="border-left-color:${griInfo.c}">
      <div class="str-tt" style="color:${griInfo.c}">GRI = ${S.gri.toFixed(1)} -- ${griInfo.l}</div>
      <div class="str-desc">${griInfo.d}</div>
      <div class="str-desc" style="font-size:11px;color:var(--dim2)">Formule: GRI = sum(delta_k * F_k) - sum(epsilon_k * U_k) | Favorable: HOMA-IR 1.07, pre-DT 0.82, NAFLD 0.66, SOPK 0.83, adiponectine 0.62</div>
    </div>
  </div>`;

  // ── 4. QUANTIFICATION BMN-C ──
  r+=`<div class="contrib"><div class="contrib-title">Quantification BMN-C (${S.bmn_c}/150)</div>`;
  const dd=S.details;
  const keys=Object.keys(dd).sort((a,b)=>dd[b].pts-dd[a].pts);
  keys.forEach(k=>{
    const v=dd[k];if(v.max===0)return;
    const pct=Math.round(v.pts/v.max*100);
    const col=pct>=70?'var(--red)':pct>=40?'var(--orange)':'var(--green)';
    r+=`<div class="contrib-row"><div class="contrib-name">${v.label} <span class="contrib-ref">${v.ref||''}</span></div>
      <div class="contrib-bar"><div class="contrib-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <div class="contrib-pts" style="color:${col}">${v.pts}/${v.max}</div></div>`;
  });
  r+=`</div>`;

  // ── 5. PONDERATION BMN-T ──
  const cN2=(S.bmn_c/150)*100,kN2=(S.bmn_k/50)*100,bN2=S.bmn_b;
  r+=`<div class="sec"><div class="sec-tt">Ponderation BMN-T (${t}/200)</div>
    <div class="mrow">
      <div class="mbox"><div class="mbox-lbl">C norm</div><div class="mbox-val">${cN2.toFixed(0)}</div><div class="mbox-sub">wC=0.55</div></div>
      <div class="mbox"><div class="mbox-lbl">B norm</div><div class="mbox-val">${bN2||'--'}</div><div class="mbox-sub">wB=0.30</div></div>
      <div class="mbox"><div class="mbox-lbl">K norm</div><div class="mbox-val">${kN2.toFixed(0)}</div><div class="mbox-sub">wK=0.15</div></div>
    </div>
    <div class="str-desc" style="font-size:11px;color:var(--dim2);margin:8px 0">BMN_T = wC*C_norm + wB*Bio_norm + wK*K_norm. Ponderation dynamique si gap Bio-Clinique > 20. Floors: BioFloor >= 0.75*Bio, Urgent >= max(80, 0.85*Bio), Comorbidity >= max(40, 0.80*K).</div>
  </div>`;

  // ── 6. SANTE MENTALE ──
  r+=`<div class="sec"><div class="sec-tt">Sante mentale -- detail</div>
    <div class="mrow">
      <div class="mbox"><div class="mbox-lbl">PSS-10</div><div class="mbox-val" style="color:${pssT>=27?'var(--red)':pssT>=20?'var(--orange)':pssT>=14?'var(--accent)':'var(--green)'}">${pssT}/40</div>
        <div class="mbox-sub">${pssT>=27?'Tres eleve':pssT>=20?'Eleve':pssT>=14?'Modere':'Faible'}</div></div>
      <div class="mbox"><div class="mbox-lbl">PHQ-9</div><div class="mbox-val" style="color:${phqT>=20?'var(--red)':phqT>=15?'var(--orange)':phqT>=10?'var(--accent)':'var(--green)'}">${phqT}/27</div>
        <div class="mbox-sub">${phqT>=20?'Severe':phqT>=15?'Mod-severe':phqT>=10?'Modere':phqT>=5?'Leger':'Normal'}</div></div>
      <div class="mbox"><div class="mbox-lbl">BES</div><div class="mbox-val" style="color:${S.bes>=5?'var(--red)':S.bes>=3?'var(--orange)':'var(--green)'}">${S.bes}/8</div>
        <div class="mbox-sub">${S.bes>=5?'Severe':S.bes>=3?'Modere':'Leger'}</div></div>
    </div></div>`;

  // ── 7. SII DETAIL ──
  r+=`<div class="sec"><div class="sec-tt">SII -- Sous-Index Inflammatoire (${S.sii}/7)</div>
    <div class="str-desc">Chaque critere binaire positif = +1 point. SII >= 2 declenche le bilan biologique P5.</div>
    <div class="sii-grid">
      ${[
        {l:'Stress PSS >= 35%', v:(getPssTotal()/40)>=0.35},
        {l:'Sedentarite >= 2 pts', v:dd.assis?.pts>=2},
        {l:'IMC >= seuil obesite', v:S.imc>=(ETH[S.ethnie]||ETH.eu).ob},
        {l:'Tabagisme actif', v:S.tabac>=3},
        {l:'Ultra-transformes >= 2', v:S.alim.ultra>=2},
        {l:'Insomnie ISI >= 15', v:S.isi>=15},
        {l:'Tour taille > seuil', v:S.tt>(S.sexe==='f'?(ETH[S.ethnie]||ETH.eu).tf:(ETH[S.ethnie]||ETH.eu).tm)}
      ].map(x=>`<div class="sii-item ${x.v?'on':'off'}"><span class="sii-dot" style="background:${x.v?'var(--red)':'var(--green)'}"></span>${x.l}</div>`).join('')}
    </div></div>`;

  // ── 8. PROJECTION MARKOV 10 ANS ──
  r+=`<div class="sec"><div class="sec-tt">Projection Markov -- 10 ans</div>
    <div class="markov-sub">Matrice 6x6 modulee: P_ij(base) * exp(0.68 * BMN_T/100) * exp(0.35 * K_norm/100) | Ref: NEJM 1995 Leibel, NEJM 2011 Sumithran</div>`;
  mk.prob.forEach((p,i)=>{
    const pct=(p*100).toFixed(1);
    r+=`<div class="mk-row"><div class="mk-lbl" style="color:${colors[i]}">${MK_ST[i]}${i===mk.cs?' (actuel)':''}</div>
      <div class="mk-bar"><div class="mk-fill" style="width:${pct}%;background:${colors[i]}"></div></div>
      <div class="mk-pct" style="color:${colors[i]}">${pct}%</div></div>`;
  });
  r+=`<div class="mk-total">P(obesite a 10 ans) = <b style="color:var(--red)">${pObes}%</b></div></div>`;

  // ── 9. ENVIRONNEMENT & TRAVAIL ──
  r+=`<div class="sec"><div class="sec-tt">Environnement et travail</div>
    <div class="mrow c2">
      <div class="mbox"><div class="mbox-lbl">Exposome auto</div><div class="mbox-val" style="color:${expoT>=8?'var(--red)':expoT>=4?'var(--orange)':'var(--green)'}">${expoT}</div><div class="mbox-sub">/15 (air+temp+UV)</div></div>
      <div class="mbox"><div class="mbox-lbl">Nuit</div><div class="mbox-val" style="color:${dd.nuit?.pts>=3?'var(--red)':'var(--green)'}">${dd.nuit?.pts||0}</div><div class="mbox-sub">/5 (OR 1.43)</div></div>
    </div>`;
  if(S.airData){
    const aq=aqiLabel(S.airData.us_aqi);
    r+=`<div class="res-aqi"><div class="res-aqi-left"><div class="res-aqi-city">${S.geo?.name||'--'}</div><div class="res-aqi-detail">PM2.5: ${S.airData.pm2_5?.toFixed(1)??'--'} | NO2: ${S.airData.nitrogen_dioxide?.toFixed(1)??'--'} | O3: ${S.airData.ozone?.toFixed(1)??'--'}</div></div>
      <div class="res-aqi-right"><div class="res-aqi-num" style="color:${aq.c}">${S.airData.us_aqi||'--'}</div><div class="res-aqi-lbl" style="color:${aq.c}">${aq.l}</div></div></div>`;
  }
  if(S.commuteDist!=null){
    r+=`<div class="res-commute">Trajet domicile-travail: <b>${S.commuteDist.toFixed(1)} km</b> | Score distance: ${S.work.dist}/5</div>`;
  }
  r+=`</div>`;

  // ── 10. ORDONNANCE BIOLOGIQUE ──
  r+=`<div class="sec"><div class="sec-tt">Prescription Biologique</div>
    <div class="str-card" style="border-left-color:${bioPrx.color}">
      <div class="str-tt" style="color:${bioPrx.color}">${bioPrx.tier}</div>
      <div class="str-desc">${bioPrx.desc}</div>
      <div class="str-desc" style="margin-top:4px"><b>Declencheur:</b> BMN-C = ${bioPrx.bmnc}/150 | SII = ${bioPrx.sii}/7${bioPrx.indep?' | Critere independant present':''}</div>
      ${bioPrx.panel.length?`<div class="ordo-panel"><div class="ordo-title">Examens a prescrire :</div>
        <div class="ordo-list">${bioPrx.panel.map((m,i)=>`<div class="ordo-item"><span class="ordo-num">${i+1}</span>${m}</div>`).join('')}</div></div>`
        :'<div class="str-desc" style="color:var(--green)">Pas de bilan obligatoire. Envisager P5 si premiere visite ou bilan > 2 ans.</div>'}
      <div class="str-desc" style="margin-top:4px;font-weight:600">Suivi: ${bioPrx.suivi}</div>
    </div></div>`;

  // ── 11. STRATEGIE THERAPEUTIQUE COMPLETE ──
  r+=`<div class="sec"><div class="sec-tt">Strategie Therapeutique Personnalisee</div>`;
  strats.forEach(s=>{
    r+=`<div class="str-card" style="border-left-color:${s.color}">
      <div class="str-tt" style="color:${s.color}">${s.title}</div>
      ${s.actions?.length?`<ul class="str-list">${s.actions.map(a=>'<li>'+a+'</li>').join('')}</ul>`:''}
      ${s.pharma?`<div class="str-pharma"><span style="color:${s.color}">Pharmacologie:</span> ${s.pharma}</div>`:''}
      <div class="str-suivi"><b>Suivi:</b> ${s.suivi}</div>
    </div>`;
  });
  r+=`</div>`;

  // ── 12. INTERPRETATION IA ──
  r+=`<div id="aiFinal"><div class="ai-loading"><span class="spinner"></span> Interpretation IA personnalisee en cours...</div></div>`;
  setTimeout(async()=>{
    const ai=await requestAIInterpret();
    const box=$('aiFinal');
    if(!box)return;
    if(ai&&ai.summary){
      const tone=ai.tone||'cautious';
      const tc=tone==='urgent'?'var(--red)':tone==='cautious'?'var(--orange)':'var(--green)';
      let h2=`<div class="ai-final-card" style="border-color:${tc}">
        <div class="ai-hd"><span class="ai-tag">Interpretation IA Claude</span></div>
        <div class="ai-summary">${ai.summary}</div>`;
      if(ai.positive_points?.length) h2+=`<div class="ai-section"><b style="color:var(--green)">Points positifs</b>${ai.positive_points.map(p2=>`<div class="ai-item green">${p2}</div>`).join('')}</div>`;
      if(ai.key_risks?.length) h2+=`<div class="ai-section"><b style="color:var(--red)">Risques identifies</b>${ai.key_risks.map(r2=>`<div class="ai-item red">${r2}</div>`).join('')}</div>`;
      if(ai.priority_actions?.length) h2+=`<div class="ai-section"><b style="color:var(--accent)">Actions prioritaires</b>${ai.priority_actions.map(a2=>`<div class="ai-item blue">${a2}</div>`).join('')}</div>`;
      if(ai.lifestyle_tips?.length) h2+=`<div class="ai-section"><b style="color:var(--teal)">Conseils personnalises</b>${ai.lifestyle_tips.map(l=>`<div class="ai-item teal">${l}</div>`).join('')}</div>`;
      if(ai.medical_attention) h2+=`<div class="ai-medical">${ai.medical_attention}</div>`;
      h2+=`</div>`;
      box.innerHTML=h2;
    } else {
      box.innerHTML='';
    }
  },200);

  // ── 13. REFERENCES ──
  r+=`<div class="res-refs">
    <div class="res-refs-title">References internationales</div>
    <div class="res-refs-list">OMS | IDF 2006 | ADA 2024 | FINDRISC | IPAQ | PHQ-9 (Kroenke 2001) | PSS-10 (Cohen 1983) | ISI | BES | AUDIT-C | Lancet 2016 (Global BMI Mortality) | BMJ Open 2016 (WHtR) | Lancet 2010 (MetS) | NEJM 1995 (Leibel) | NEJM 2011 (Sumithran) | SCORE2/Framingham | INTERHEART | DPP | DiaRem | Biswas 2015 | Cappuccio 2008 | Aubin 2012 | Lane 2024 | CAMS/Copernicus | Karasek</div>
    <div class="res-refs-algo">Score BMN v2.0 -- Architecture ABCKO+ -- Modelisation complete -- Bach | Manos | Noel</div>
  </div>`;

  return r;
}

function resetAll(){if(!confirm('Recommencer depuis le debut ?'))return;location.reload();}

// ─── SWIPE ───
let tX=0,tY=0,sw=false;
function initSwipe(){const w=$('scrWrap');if(!w)return;
  w.addEventListener('touchstart',e=>{tX=e.touches[0].clientX;tY=e.touches[0].clientY;sw=true;},{passive:true});
  w.addEventListener('touchend',e=>{if(!sw)return;sw=false;const dx=e.changedTouches[0].clientX-tX,dy=e.changedTouches[0].clientY-tY;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0&&S.step<NTOT-1)go(S.step+1,1);else if(dx>0&&S.step>0)go(S.step-1,-1);}},{passive:true});
}

// ─── KEYBOARD ───
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'&&S.step<NTOT-1)go(S.step+1,1);
  if(e.key==='ArrowLeft'&&S.step>0)go(S.step-1,-1);
});

// ─── INIT ───
function init(){
  $('app').innerHTML=`<div class="hdr">
    <button class="hdr-back" onclick="if(S.step>0)go(S.step-1,-1)">&#8592;</button>
    <div class="hdr-center"><div class="hdr-sec" id="hdrSec">[H] Accueil</div><div class="hdr-step" id="hdrStep"></div></div>
    <div class="hdr-score" id="hdrScore" style="display:none"></div></div>
    <div class="pgbar"><div class="pgbar-fill" id="pgFill" style="width:0%"></div></div>
    <div class="scr-wrap" id="scrWrap"></div>
    <div class="bnav" id="bNav"></div>`;
  initSwipe();go(0,0);
}
init();
