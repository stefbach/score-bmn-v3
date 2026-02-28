// ════════════════════════════════════════════════════════════════
// SCORE BMN v3.0 — Architecture CLEO (C+E+O+L) + Bio BSD v4.9
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

// Rapport strategique IA complet pour assister le medecin
async function requestAIReport(){
  try{
    const hasBio=(S.bmn_b>0);
    const bioDetail={};
    BIO.forEach(m=>{const v=S.bioValues[m.id];if(v!==undefined&&v!==null) bioDetail[m.n]={valeur:v,unite:m.u,normal:m.nr,anormal:m.ar};});
    const comorbNames=S.comorbIds.map(id=>COMORB.find(c=>c.id===id)?.n).filter(Boolean);
    const bioPrx=getBioPrescription();
    const strats=getTherapeuticStrategy();
    const mk=calcMarkov();
    const pObes=((mk.prob[4]+mk.prob[5])*100).toFixed(1);

    const payload={
      type:'rapport_strategique',
      scores:{
        sf:S.bmn_t, sD:S.sD, bioNorm:S.bmn_b,
        scoreC:S.scoreC, scoreE:S.scoreE, scoreO:S.scoreO, scoreL:S.scoreL,
        cti:S.cti, gri:+S.gri.toFixed(1), sii:S.sii, bmn_k:S.bmn_k,
        classification:S.classFinal, classDecl:S.classDecl,
        panelLvl:S.panelLvl, bInflam:S.bInflam?.toFixed(2)
      },
      biologie:{present:hasBio, bioNorm:S.bmn_b, marqueurs:bioDetail, wDecl:S.wDecl, wBio:S.wBio},
      profil:{
        age:getAge(), sexe:S.sexe, ethnie:ETH[S.ethnie]?.n,
        imc:S.imc?.toFixed(1), taille_cm:S.taille, poids_kg:S.poids, tt_cm:S.tt,
        comorbidites:comorbNames,
        pss10:getPssTotal(), phq9:getPhqTotal(), bes:S.bes, isi:S.isi,
        tabac_cig:S.tabac, alcool:S.alcool
      },
      contexte:{
        prescription_bio:bioPrx.tier,
        strategies:strats.map(s=>s.title),
        prob_obesite_10ans:pObes+'%',
        geo:S.geo?.name, expo_air:S.expo.air
      }
    };

    const r=await fetch('/api/ai/rapport',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(r.ok)return await r.json();
  }catch(e){console.error('AI report error:',e);}
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
    <h1>Score <b>BMN</b> v3.0</h1>
    <p class="welc-desc">Evaluez votre risque metabolique en quelques minutes. Questionnaire valide scientifiquement, enrichi par l'intelligence artificielle et des donnees environnementales en temps reel.</p>
    <div class="welc-features">
      <div class="welc-feat"><span>IA</span><span>Analyse adaptative</span></div>
      <div class="welc-feat"><span>GEO</span><span>Donnees en direct</span></div>
      <div class="welc-feat"><span>CLEO</span><span>C+E+O+L = sD</span></div>
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

  // ════════════════════════════════════════════════════════════════
  // 15: SCORE DECLARATIF sD + CLASSIFICATION + PRESCRIPTION BIO
  // Score ESR visible en entier, puis ordonnance biologique
  // ════════════════════════════════════════════════════════════════
  ()=>{
    calc();
    const cls=getClass(S.sD);
    const bioPrx=getBioPrescription();

    // SII items
    const e=ETH[S.ethnie]||ETH.eu;
    const ttSeuil=S.sexe==='f'?e.tf:e.tm;
    const apT=S.ap.cardio+S.ap.muscu+S.ap.marche*3.5;
    const alimRaw=S.alim.ultra+S.alim.sucre_boisson+S.alim.sucre_solide+S.alim.fibres+S.alim.portions+S.alim.repas+S.alim.grignotage+S.alim.fast_food+S.alim.cuisine+S.alim.eau;
    const siiItems=[
      {l:'Stress PSS >= 35%', v:(getPssTotal()/40)>=0.35},
      {l:'Activite < 75 min/sem', v:apT<75},
      {l:'IMC >= seuil obesite', v:S.imc>=e.ob},
      {l:'Tabagisme actif', v:S.tabac>=3},
      {l:'Alimentation desequilibree', v:alimRaw>=20},
      {l:'Insomnie ISI >= 15', v:S.isi>=15},
      {l:'Tour taille > seuil', v:S.tt>ttSeuil}
    ];

    // WRAPPER UNIQUE — empeche les animations rise par enfant de faire clignoter
    let html=`<div class="no-rise-children">
    <div class="s-emoji">sD</div>
    <div class="s-title">Score Declaratif & Prescription Biologique</div>
    <div class="s-sub">Score calcule sans biologie (C+E+O+L). Il definit votre <b>niveau de risque</b> et la <b>prescription biologique</b>. <span class="ref">BSD v4.9</span></div>`;

    // ══ HERO SCORE — compact ══
    html+=`<div style="display:flex;align-items:center;gap:14px;padding:16px 20px;border-radius:16px;background:${cls.bg};margin:8px 0">
      <div style="text-align:center;min-width:90px">
        <div style="font-size:42px;font-weight:800;color:${cls.c};line-height:1">${S.sD}</div>
        <div style="font-size:12px;color:${cls.c};opacity:.7">/100</div>
      </div>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:700;color:${cls.c};margin-bottom:2px">${S.classDecl}</div>
        <div style="font-size:11px;color:${cls.c};opacity:.8">Score Declaratif (sans biologie)</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.1);color:${cls.c}">C ${S.scoreC}/50</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.1);color:${cls.c}">E ${S.scoreE}/45</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.1);color:${cls.c}">O ${S.scoreO}/10</span>
          <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.1);color:${cls.c}">L ${S.scoreL}/10</span>
        </div>
      </div>
    </div>`;

    // ══ SII compact (une ligne) ══
    html+=`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border-radius:10px;margin:6px 0">
      <span style="font-weight:700;font-size:12px;color:${S.sii>=3?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)'}">SII ${S.sii}/7</span>
      <div style="display:flex;gap:3px;flex:1;flex-wrap:wrap">${siiItems.map(x=>`<span style="width:8px;height:8px;border-radius:50%;background:${x.v?'var(--red)':'var(--green)'}" title="${x.l}"></span>`).join('')}</div>
      ${S.sii>=2?'<span style="font-size:10px;color:var(--orange);font-weight:600">→ Bio P5 obligatoire</span>':''}
    </div>`;

    // ══ ORDONNANCE BIOLOGIQUE — mise en evidence ══
    html+=`<div style="margin-top:10px;border:2px solid ${bioPrx.color};border-radius:14px;overflow:hidden">
      <div style="background:${bioPrx.color};color:#fff;padding:10px 16px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:16px;font-weight:800">ORDONNANCE BIOLOGIQUE</div>
          <div style="font-size:12px;opacity:.9">${bioPrx.tier}</div>
        </div>
        <div style="font-size:24px;font-weight:800">P${S.panelLvl>0?S.panelLvl:'0'}</div>
      </div>
      <div style="padding:12px 16px">
        <div style="font-size:12px;color:var(--dim);margin-bottom:8px">${bioPrx.desc}</div>
        <div style="font-size:11px;color:var(--dim2);margin-bottom:10px"><b>Logique :</b> sD = ${S.sD} (${S.classDecl}) | SII = ${S.sii}/7 ${S.indepCrit?'| Critere independant':''} → Panel <b>P${S.panelLvl>0?S.panelLvl:'optionnel'}</b></div>`;

    if(bioPrx.panel.length){
      html+=`<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:var(--txt)">Examens a prescrire :</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">`;
      bioPrx.panel.forEach((m,i)=>{
        html+=`<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--bg2);border-radius:6px;font-size:11px">
          <span style="min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${bioPrx.color};color:#fff;font-size:9px;font-weight:700">${i+1}</span>
          <span>${m}</span>
        </div>`;
      });
      html+=`</div>`;
    } else {
      html+=`<div style="color:var(--green);font-size:12px;padding:8px;background:var(--green-bg);border-radius:8px">Pas de bilan obligatoire. Envisager P5 si premiere visite ou bilan &gt; 2 ans.</div>`;
    }

    html+=`<div style="margin-top:10px;padding:8px 10px;background:var(--bg2);border-radius:8px;font-size:11px;color:var(--dim2)">
          <b>Suivi recommande :</b> ${bioPrx.suivi}
        </div>
      </div>
    </div>`;

    // Petite note de flux
    html+=`<div style="font-size:10px;color:var(--dim3);margin-top:8px;text-align:center">
      Etape suivante → Saisie des resultats biologiques → Integration dynamique (sf = wDecl×sD + wBio×bioNorm)
    </div>`;

    html+=`<div id="aiBox15"></div>`;
    html+=`</div>`; // fin du wrapper no-rise-children
    return html;
  },

  // ════════════════════════════════════════════════════════════════
  // 16: BIOLOGIE — Biomarqueurs prescrits + Simulation de profils
  // Liste = uniquement les marqueurs de l'ordonnance (P5/P10/P15)
  // Module de simulation pour tester differents profils biologiques
  // Methodologie BSD v4.7.1 : z-score lineaire, poids HR, bioNorm
  // ════════════════════════════════════════════════════════════════
  ()=>{
    calc();
    const pl=getPanelLvl();
    const bioPrx=getBioPrescription();
    // Filtrer les BIO par panel prescrit (pas Math.max(5,pl) — uniquement ceux prescrits)
    const markers=pl>0 ? BIO.filter(m=>m.t<=pl) : BIO.filter(m=>m.t<=5);

    // Compute z-scores pour affichage jauge
    const zDisplay={};
    BIO.forEach(m=>{
      const v=S.bioValues[m.id];
      if(v===undefined||v===null) return;
      let z;
      if(!m.inv){ z=v<=m.nm?0:v>=m.ab?1:(v-m.nm)/(m.ab-m.nm); }
      else { z=v>=m.nm?0:v<=m.ab?1:(m.nm-v)/(m.nm-m.ab); }
      zDisplay[m.id]=Math.max(0,Math.min(1,z));
    });

    const filled=BIO.filter(m=>S.bioValues[m.id]!==undefined&&S.bioValues[m.id]!==null).length;

    let html=`<div class="no-rise-children">
    <div class="s-emoji">Bio</div>
    <div class="s-title">Fiche Biologique — Biomarqueurs Prescrits</div>
    <div class="s-sub">Saisissez les resultats de l'ordonnance prescrite a l'etape precedente, ou utilisez la <b>simulation</b> pour tester un profil biologique.
      <span class="ref">BSD v4.7.1</span></div>`;

    // ══ RAPPEL ORDONNANCE ══
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1.5px solid ${bioPrx.color};margin-bottom:10px">
      <div style="min-width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${bioPrx.color};color:#fff;font-weight:800;font-size:14px">P${pl>0?pl:'?'}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:${bioPrx.color}">${bioPrx.tier}</div>
        <div style="font-size:10px;color:var(--dim2)">${markers.length} biomarqueurs a renseigner | sD = ${S.sD} (${S.classDecl})</div>
      </div>
    </div>`;

    // ══ MODULE SIMULATION DE PROFILS ══
    html+=`<div style="background:var(--bg2);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">SIMULATION — Profils biologiques</div>
      <div style="font-size:10px;color:var(--dim2);margin-bottom:8px">Pre-remplir les ${markers.length} biomarqueurs avec un profil type pour estimer l'impact sur le score final.</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
        <button onclick="applyBioProfile('normal')" style="padding:10px 8px;border-radius:8px;border:1.5px solid var(--green);background:var(--green-bg);color:var(--green);font-weight:700;font-size:11px;cursor:pointer;font-family:var(--font)">
          Normal<br><span style="font-weight:400;font-size:9px;opacity:.8">Tous dans les normes</span>
        </button>
        <button onclick="applyBioProfile('borderline')" style="padding:10px 8px;border-radius:8px;border:1.5px solid var(--orange);background:var(--orange-bg);color:var(--orange);font-weight:700;font-size:11px;cursor:pointer;font-family:var(--font)">
          Limite<br><span style="font-weight:400;font-size:9px;opacity:.8">Valeurs frontieres</span>
        </button>
        <button onclick="applyBioProfile('elevated')" style="padding:10px 8px;border-radius:8px;border:1.5px solid var(--red);background:var(--red-bg);color:var(--red);font-weight:700;font-size:11px;cursor:pointer;font-family:var(--font)">
          Eleve<br><span style="font-weight:400;font-size:9px;opacity:.8">Marqueurs anormaux</span>
        </button>
        <button onclick="applyBioProfile('critical')" style="padding:10px 8px;border-radius:8px;border:1.5px solid var(--purple);background:var(--purple-bg);color:var(--purple);font-weight:700;font-size:11px;cursor:pointer;font-family:var(--font)">
          Critique<br><span style="font-weight:400;font-size:9px;opacity:.8">Desequilibre majeur</span>
        </button>
      </div>
      <button onclick="applyBioProfile('reset')" style="margin-top:6px;width:100%;padding:8px;border-radius:8px;border:1px solid var(--border2);background:var(--bg3);color:var(--dim);font-weight:600;font-size:11px;cursor:pointer;font-family:var(--font)">
        Effacer tout (reset)
      </button>
    </div>`;

    // ══ bioNorm LIVE ══
    if(filled>0){
      const cls=getClass(S.bmn_b);
      html+=`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:${cls.bg};margin-bottom:10px">
        <div style="text-align:center;min-width:60px">
          <div style="font-size:28px;font-weight:800;color:${cls.c};font-family:'JetBrains Mono',monospace;line-height:1">${S.bmn_b}</div>
          <div style="font-size:9px;color:${cls.c};opacity:.6">/100</div>
        </div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:${cls.c}">bioNorm (${filled}/${markers.length} renseignes)</div>
          <div style="font-size:9px;color:var(--dim3)">bioNorm = (Σ z_i×w_i / Σ w_i) × 100</div>
          ${S.bInflam>0?`<div style="font-size:9px;color:var(--orange);margin-top:2px">bInflam = ${S.bInflam.toFixed(2)} → E amplifiee +${Math.round(S.bInflam*15)}%</div>`:''}
        </div>
      </div>`;
    }

    // ══ LISTE DES BIOMARQUEURS PRESCRITS ══
    html+=`<div style="margin-bottom:8px">`;
    markers.forEach((m,idx)=>{
      const v=S.bioValues[m.id];
      const z=zDisplay[m.id];
      const hasVal=v!==undefined&&v!==null;
      const zCol=!hasVal?'var(--dim3)':z>=0.7?'var(--red)':z>=0.3?'var(--orange)':'var(--green)';
      const tierCol=m.t<=5?'var(--red)':m.t<=10?'var(--orange)':'var(--accent)';

      html+=`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:4px;background:var(--bg2);border-radius:10px;border-left:3px solid ${tierCol}">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span style="font-size:12px;font-weight:700;color:var(--txt)">${m.n}</span>
            ${m.u?`<span style="font-size:9px;color:var(--dim3)">(${m.u})</span>`:''}
            <span style="font-size:8px;padding:1px 4px;border-radius:3px;background:${tierCol};color:#fff;font-weight:600">P${m.t}</span>
          </div>
          <div style="font-size:9px;color:var(--dim2)">${m.l} — Normal: <span style="color:var(--green)">${m.nr}</span> | Anormal: <span style="color:var(--red)">${m.ar}</span> | w=${m.w}</div>
          ${hasVal?`<div style="margin-top:4px;display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
              <div style="width:${Math.round(z*100)}%;height:100%;background:${zCol};border-radius:3px;transition:width .3s"></div>
            </div>
            <span style="font-size:10px;color:${zCol};font-weight:700;min-width:36px">z=${z.toFixed(2)}</span>
          </div>`:''}
        </div>
        <input type="number" class="bio-inp" id="bio_${m.id}" value="${v??''}" step="0.01" placeholder="--"
          style="width:72px;min-width:72px" oninput="S.bioValues['${m.id}']=this.value===''?undefined:+this.value;calc();render(S.step,0);doRetro()">
      </div>`;
    });
    html+=`</div>`;

    // ══ Retro-validation ══
    html+=`<div id="retro"></div>`;

    // ══ Impact sur le score final (preview) ══
    if(filled>0){
      const sfPreview=S.bmn_t;
      const sfCls=getClass(sfPreview);
      html+=`<div style="background:var(--bg2);border-radius:10px;padding:10px 14px;margin-top:8px">
        <div style="font-size:11px;font-weight:700;color:var(--txt);margin-bottom:4px">Preview score final</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:20px;font-weight:800;color:${sfCls.c};font-family:'JetBrains Mono',monospace">${sfPreview}/100</div>
          <div style="flex:1;font-size:10px;color:var(--dim2)">
            sf = ${S.wDecl.toFixed(2)}×${S.sD} + ${S.wBio.toFixed(2)}×${S.bmn_b} = ${(S.wDecl*S.sD+S.wBio*S.bmn_b).toFixed(1)}
            ${Math.abs(S.bmn_b-S.sD)>20?' (reponderation dynamique)':''}<br>
            Classification: <b style="color:${sfCls.c}">${sfCls.l}</b>
          </div>
        </div>
      </div>`;
    }

    // ══ Methodologie ══
    html+=`<details style="margin-top:10px;background:var(--bg2);border-radius:10px;overflow:hidden">
      <summary style="padding:10px 14px;font-size:11px;font-weight:600;color:var(--dim2);cursor:pointer">Methodologie BSD v4.7.1</summary>
      <div style="padding:0 14px 10px;font-size:10px;color:var(--dim3);line-height:1.5">
        z-score lineaire borne [0,1] : z = (val-normal)/(anormal-normal), cap a 1<br>
        Poids (w) proportionnels aux HR publies (>3M participants, CTT, ERFC, CKD-PC, ADA)<br>
        bioNorm = (Σ z_i×w_i / Σ w_i) × 100 — denominateur adaptatif<br>
        Triade inflammatoire : bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR) → E** = E* × (1+0.15×bInflam)<br>
        Integration : sf = wDecl(0.65)×sD + wBio(0.35)×bioNorm, reponderation si gap > 20<br>
        BioFloor : sf ≥ 75% bioNorm | BEF : si bio>90, sf ≥ max(80, 85%×bio)
      </div>
    </details>`;

    html+=`</div>`; // fin wrapper no-rise-children
    return html;
  },

  // 17: Final Result
  ()=>{calc();return '<div class="no-rise-children">'+renderFinal()+'</div>';}
];

const NTOT=SCR.length;
const SECTIONS=[
  {from:0,to:0,name:'Accueil',ico:'[H]'},{from:1,to:3,name:'Identite',ico:'[ID]'},
  {from:4,to:5,name:'Mesures',ico:'[M]'},{from:6,to:6,name:'Famille',ico:'[F]'},
  {from:7,to:7,name:'Lieu',ico:'[G]'},{from:8,to:8,name:'Travail',ico:'[T]'},
  {from:9,to:9,name:'Nutrition',ico:'[N]'},{from:10,to:11,name:'Mode de vie',ico:'[V]'},
  {from:12,to:13,name:'Sante mentale',ico:'[S]'},
  {from:14,to:14,name:'Pathologies',ico:'[P]'},
  {from:15,to:15,name:'Score & Strategie',ico:'[sD]'},
  {from:16,to:16,name:'Biologie',ico:'[B]'},
  {from:17,to:17,name:'Resultat',ico:'[R]'}
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
  if(step===16)setTimeout(doRetro,60);
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
    14:{id:'aiBox14',q:'Comorbidites selectionnees: '+S.comorbIds.join(',')+'. Analyse interactions et impact sur BMN-K.'},
    15:{id:'aiBox15',q:'Score declaratif sD='+S.sD+'/100 ('+S.classDecl+'). C='+S.scoreC+'/50, E='+S.scoreE+'/45, O='+S.scoreO+'/10, L='+S.scoreL+'/10. SII='+S.sii+'/7. Panel=P'+(S.panelLvl||0)+'. CTI='+S.cti+'. GRI='+S.gri.toFixed(1)+'. Analyse la strategie bio et therapeutique.'}
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
// MOTEUR DE CALCUL — Score BMN v3.0 — Architecture CLEO
// Ref: algorithme.html BSD v4.9 + justification-bio.html BSD v4.7.1
// ────────────────────────────────────────────────────────────────
// FLUX:  C(0-50) + E(0-45) + O(0-10) + L(0-10) = sD(0-100)
//        → Classification FAIBLE/MODERE/ELEVE/TRES ELEVE
//        → SII (7 items) + Criteres independants → Prescription Bio P5/P10/P15
//        → bioNorm = Σ(z_i×w_i)/Σ(w_i)×100
//        → sf = wDecl×sD + wBio×bioNorm  (reponderation dynamique)
//        → BioFloor + BioEmergencyFloor + GF Guards
//        → bInflam (triade inflammatoire) amplifie E
//        → Retro-validation → Strategie therapeutique
//        → CTI + GRI + Markov
//
// IMPORTANT: Garde TOUS les 15 biomarqueurs, 13 comorbidites,
//            PSS-10, PHQ-9, BES, DQI-BMN, IPAQ, ISI, AUDIT-C
// ════════════════════════════════════════════════════════════════
function calc(){
  const e=ETH[S.ethnie]||ETH.eu, sex=S.sexe, imc=S.imc, tt=S.tt, taille=S.taille;
  const whtr=taille>0?tt/taille:0, ttSeuil=sex==='f'?e.tf:e.tm;
  const pssT=getPssTotal(), phqT=getPhqTotal(), sr=pssT/40;
  const alimRaw=S.alim.ultra+S.alim.sucre_boisson+S.alim.sucre_solide+S.alim.fibres
    +S.alim.portions+S.alim.repas+S.alim.grignotage+S.alim.fast_food+S.alim.cuisine+S.alim.eau;
  const apT=S.ap.cardio+S.ap.muscu+S.ap.marche*3.5;
  const age=getAge();
  const d={};

  // ════════════════════════════════════════════════════
  // PHASE C — SCORE CLINIQUE (0-50 pts)
  // 8 sous-scores c1…c8, cap 50
  // Logique BSD v4.9 adaptee aux variables BMN
  // ════════════════════════════════════════════════════
  let C=0;

  // c1 — Age (0-10)  [BSD: <40=0, 40-44=2, 45-54=5, 55-64=7, >=65=10]
  let c1=0;
  if(age>=65) c1=10; else if(age>=55) c1=7; else if(age>=45) c1=5; else if(age>=40) c1=2;
  d.c1_age={pts:c1,max:10,label:'c1 — Age ('+age+' ans)',ref:'Framingham/SCORE2',grp:'C'};
  C+=c1;

  // c2 — Sexe (0-2) [BSD: homme<60=2, sinon 0]
  let c2=0;
  if(sex==='m'&&age<60) c2=2;
  d.c2_sexe={pts:c2,max:2,label:'c2 — Sexe ('+(sex==='f'?'Femme':'Homme')+')',ref:'Framingham',grp:'C'};
  C+=c2;

  // c3 — IMC + Tour taille (0-7+3=10) ajuste ethnie
  // [BSD c3: normal=0, surpoids=3, obese=5, severe=7] + WHtR bonus
  let c3_bmi=0;
  if(imc>=e.ob+5) c3_bmi=7;
  else if(imc>=e.ob) c3_bmi=5;
  else if(imc>=e.ow) c3_bmi=3;
  // WHtR additionnel (0-3)
  let c3_whtr=0;
  if(whtr>=0.6) c3_whtr=3;
  else if(whtr>=0.55) c3_whtr=2;
  else if(whtr>=0.5) c3_whtr=1;
  // Tour de taille additionnel
  let c3_tt=0;
  if(tt>ttSeuil+10) c3_tt=2;
  else if(tt>ttSeuil) c3_tt=1;
  let c3=Math.min(12, c3_bmi+c3_whtr+c3_tt);
  d.c3_imc={pts:c3,max:12,label:'c3 — IMC ('+imc?.toFixed(1)+') TT ('+tt+'cm) WHtR ('+whtr.toFixed(2)+') seuils '+e.n.split(' ')[0],ref:'OMS/IDF 2006/BMJ 2016',grp:'C'};
  C+=c3;

  // c4 — Comorbidites (0-10 projete depuis BMN-K)
  // BMN-K complet (0-50) utilise les 13 comorbidites
  let k=0, ctiAmp=1;
  const griF=[], griU=[];
  S.comorbIds.forEach(id=>{
    const cm=COMORB.find(x=>x.id===id); if(!cm)return;
    k+=cm.p; if(cm.ca>ctiAmp) ctiAmp=cm.ca;
    if(cm.gri_fav && cm.gr>0) griF.push({id:cm.id,d:cm.gr});
    else if(cm.gr<0) griU.push({id:cm.id,e:Math.abs(cm.gr)});
  });
  S.bmn_k=Math.min(50,k);
  // HTA modulee par ethnie [BSD c4: htaRisk multiplier, cap 10]
  let htaPts=0;
  if(S.comorbIds.includes('hta')){
    htaPts=4; // HTA declaree = 4 pts de base
    htaPts=Math.min(8, Math.round(htaPts*(e.hR||1)));
  }
  // Diabete [BSD c5: diabete traite=8, prediabete=3]
  let diabPts=0;
  if(S.comorbIds.includes('dt2')) diabPts=8;
  else if(S.comorbIds.includes('predmt')) diabPts=3;
  else if(S.diab_par>=2) diabPts=2; // proxy familial fort
  else if(S.diab_par>=1 && e.dR>=1.5) diabPts=3; // ethn. a risque + 1 parent
  // Projection 0-10
  let c4=Math.min(10, Math.round((htaPts+diabPts+Math.min(6,Math.round(k*6/50)))/3*10/8));
  if(c4<1&&k>0) c4=1; // minimum 1 si comorbidite presente
  d.c4_comorb={pts:c4,max:10,label:'c4 — Comorbidites (K='+k+'/50, HTA='+htaPts+', DT='+diabPts+')',ref:'ADA 2024/IDF',grp:'C'};
  C+=c4;

  // c5 — ATCD familiaux + genetique (0-8)
  // [BSD c6: family<55=2, angor=4, bypass=5, stent=6, IDM/AVC=8]
  // Adapte BMN: parents obeses, enfance, DT2 familial, yoyo
  let c5=0;
  if(S.parent_ob>=2) c5+=4; else if(S.parent_ob>=1) c5+=2;
  if(S.enf_ob>=2) c5+=3; else if(S.enf_ob>=1) c5+=2;
  if(S.diab_par>=2) c5+=2; else if(S.diab_par>=1) c5+=1;
  if(S.yoyo>=1) c5+=2;
  // Modulation ethnique cvRisk [BSD: si cvRisk>1.2 amplifier]
  if(e.cR>1.2) c5=Math.min(10, Math.round(c5*(1+(e.cR-1)*0.3)));
  c5=Math.min(10,c5);
  d.c5_atcd={pts:c5,max:10,label:'c5 — ATCD/Genetique (parents='+S.parent_ob+', enfance='+S.enf_ob+', DT2fam='+S.diab_par+', yoyo='+S.yoyo+')',ref:'INTERHEART/Lancet 2016',grp:'C'};
  C+=c5;

  // c6 — Tabac (0-8)  [BSD c7: jamais=0, ex>1an=1, leger=4, fort=8]
  let c6=0;
  if(S.tabac>=4) c6=8; else if(S.tabac>=3) c6=4; else if(S.tabac==2) c6=2; else if(S.tabac==1) c6=1;
  d.c6_tabac={pts:c6,max:8,label:'c6 — Tabac (niveau '+S.tabac+')',ref:'Aubin 2012',grp:'C'};
  C+=c6;

  // c7 — Stress mental: PSS-10 + PHQ-9 + BES (0-6)
  // [BSD c8: stress ratio <0.15=0, 0.15-0.34=2, 0.35-0.59=4, >=0.60=6]
  let c7_stress=0;
  if(sr>=0.60) c7_stress=4; else if(sr>=0.35) c7_stress=3; else if(sr>=0.15) c7_stress=1;
  let c7_dep=0;
  if(phqT>=20) c7_dep=3; else if(phqT>=15) c7_dep=2; else if(phqT>=10) c7_dep=1;
  let c7_bes=0;
  if(S.bes>=5) c7_bes=2; else if(S.bes>=3) c7_bes=1;
  let c7=Math.min(8, c7_stress+c7_dep+c7_bes);
  d.c7_mental={pts:c7,max:8,label:'c7 — Mental (PSS '+pssT+'/40, PHQ '+phqT+'/27, BES '+S.bes+')',ref:'PSS-10/PHQ-9/BES',grp:'C'};
  C+=c7;

  // c8 — Sommeil + ISI (0-4)
  let c8=0;
  if(S.sommeil<5||S.sommeil>10) c8+=2; else if(S.sommeil<6||S.sommeil>9) c8+=1;
  if(S.isi>=22) c8+=2; else if(S.isi>=15) c8+=1;
  c8=Math.min(4,c8);
  d.c8_sommeil={pts:c8,max:4,label:'c8 — Sommeil ('+S.sommeil+'h) + ISI ('+S.isi+'/28)',ref:'Cappuccio 2008/ISI',grp:'C'};
  C+=c8;

  // Modulation ethnique globale sur C
  C=Math.round(C*(1+e.ev/100));

  // GF GARDE-FOU sur C [BSD: pour ATCD graves, plancher minimum]
  // Si comorbidites graves (DT2+HTA ou DT2+SAOS), C minimum = 25
  let gfFloor=0;
  if(S.comorbIds.includes('dt2')&&S.comorbIds.includes('hta')) gfFloor=25;
  else if(S.comorbIds.includes('dt2')&&S.comorbIds.includes('saos')) gfFloor=25;
  else if(S.comorbIds.includes('dt2')&&S.comorbIds.includes('mets')) gfFloor=22;
  else if(S.comorbIds.includes('mets')&&S.comorbIds.includes('hta')) gfFloor=20;
  // SCS attenuation: si activite physique + alimentation OK, reduire plancher
  let scsReduction=0;
  if(apT>=300 && alimRaw<=10) scsReduction=8;
  else if(apT>=150 && alimRaw<=15) scsReduction=5;
  else if(apT>=75) scsReduction=2;
  gfFloor=Math.max(0, gfFloor-scsReduction);
  C=Math.max(gfFloor, C);

  C=Math.max(0,Math.min(50,C));
  S.scoreC=C;
  d._C_total={pts:C,max:50,label:'SCORE C — Clinique total',ref:'',grp:'C'};

  // ════════════════════════════════════════════════════
  // PHASE E — SCORE EXPOSOME (0-45 pts)
  // E* = 30 × (0.7×A + 0.5×B + 0.3×C) / 1.5
  // E** = min(45, E* × (1 + 0.15 × bInflam))
  // Layer A = Env physique (air+temp+UV) x inflammMult ethnique
  // Layer B = Trajet + sedentarite (attenuee par AP)
  // Layer C = Perturbateurs (ultra-transformes, fast-food)
  // ════════════════════════════════════════════════════
  // Layer A — Environnement physique (0-1)
  const a_air=Math.min(1, S.expo.air/8);
  const a_temp=Math.min(1, S.expo.temp/4);
  const a_uv=Math.min(1, S.expo.uv/3);
  let layerA=Math.min(1, (a_air+a_temp+a_uv)/3 * (e.iM||1));

  // Layer B — Trajet + sedentarite (0-1)
  const b_trajet=Math.min(1, (S.work.dist||0)/5);
  const b_assis_raw=S.assis>10?1:S.assis>8?0.75:S.assis>6?0.4:S.assis>4?0.15:0;
  let b_assis_att=b_assis_raw;
  if(apT>=150) b_assis_att*=0.5;
  else if(apT>=75) b_assis_att*=0.75;
  let layerB=(b_trajet + b_assis_att)/2;

  // Layer C — Perturbateurs endocriniens (0-1)
  const c_ultra=Math.min(1, S.alim.ultra/4);
  const c_fast=Math.min(1, S.alim.fast_food/4);
  let layerC=(c_ultra+c_fast)/2;

  // E* = 30 × (0.7×A + 0.5×B + 0.3×C) / 1.5
  let eStar=30*(0.7*layerA + 0.5*layerB + 0.3*layerC)/1.5;

  // bInflam (triade inflammatoire) — calcule depuis bio si disponible
  // [BSD: bInflam = moyenne(z_hscrp, z_acr, z_ntprobnp)]
  // Adapte BMN: on utilise CRP hs + TG/HDL ratio + HOMA-IR comme proxy triade
  let bInflam=0, bInflamN=0;
  if(S.bioValues.crphs!==undefined){
    const v=S.bioValues.crphs;
    bInflam+=(v<=1?0:v>=3?1:(v-1)/2); bInflamN++;
  }
  if(S.bioValues.tghdl!==undefined){
    const v=S.bioValues.tghdl;
    bInflam+=(v<=2?0:v>=3.5?1:(v-2)/1.5); bInflamN++;
  }
  if(S.bioValues.homaIR!==undefined){
    const v=S.bioValues.homaIR;
    bInflam+=(v<=2.5?0:v>=4?1:(v-2.5)/1.5); bInflamN++;
  }
  S.bInflam = bInflamN>0 ? bInflam/bInflamN : 0;

  // E** = min(45, E* × (1 + 0.15 × bInflam))
  let E=Math.round(eStar * (1 + 0.15 * S.bInflam));
  E=Math.max(0,Math.min(45,E));
  S.scoreE=E;

  d.e_layerA={pts:Math.round(layerA*21),max:21,label:'E.A — Air + Temp + UV (x0.7)' + (e.iM>1?' inflammMult x'+e.iM:''),ref:'CAMS/Copernicus',grp:'E'};
  d.e_layerB={pts:Math.round(layerB*15),max:15,label:'E.B — Trajet + Sedentarite (x0.5)',ref:'Hoehner 2012',grp:'E'};
  d.e_layerC={pts:Math.round(layerC*9),max:9,label:'E.C — Perturbateurs endocriniens (x0.3)',ref:'OR 1.49',grp:'E'};
  if(S.bInflam>0) d.e_inflam={pts:Math.round(S.bInflam*100)/100,max:1,label:'E.bInflam — Amplification inflammatoire (+'+Math.round(S.bInflam*15)+'%)',ref:'Brook 2010',grp:'E'};

  // ════════════════════════════════════════════════════
  // PHASE O — SCORE OCCUPATIONNEL (0-10 pts)
  // Actif: Karasek (type, horaires, posture, heures)
  // Retraite: isolement social + sedentarite
  // ════════════════════════════════════════════════════
  let O=0;
  const sched=S.work.schedule||0;
  const wtype=S.work.type||0;
  const retire=S.work.retire||0;

  if(retire>=1){
    let socScore=0;
    if(retire>=5) socScore=4; else if(retire>=4) socScore=3; else if(retire>=3) socScore=2; else if(retire>=2) socScore=1;
    let actScore=0;
    if(apT<30) actScore=3; else if(apT<75) actScore=2; else if(apT<150) actScore=1;
    O=Math.min(10, socScore+actScore);
    d.o_occup={pts:O,max:10,label:'O — Retraite (isolement '+socScore+' + inactivite '+actScore+')',ref:'Valtorta 2016',grp:'O'};
  } else {
    let stressJob=0;
    if(wtype>=5) stressJob+=2; else if(wtype>=3) stressJob+=1;
    if(sched>=3) stressJob+=3; else if(sched>=2) stressJob+=2; else if(sched>=1) stressJob+=1;
    let posture=Math.min(2, Math.round((S.work.posture||0)/2));
    let hours=Math.min(2, Math.round((S.work.hours||0)/2));
    O=Math.min(10, stressJob+posture+hours);
    d.o_occup={pts:O,max:10,label:'O — Travail (type='+wtype+', nuit='+sched+', posture='+S.work.posture+', h='+S.work.hours+')',ref:'Karasek/Lane 2024',grp:'O'};
  }
  S.scoreO=O;

  // ════════════════════════════════════════════════════
  // PHASE L — SCORE LIFESTYLE (0-10 pts)
  // l1 Activite physique (0-3) + l2 Alimentation PREDIMED-like (0-3)
  // + l3 Alcool (0-2) + l4 Sommeil (0-2)
  // [BSD: L total cap 10]
  // ════════════════════════════════════════════════════
  // l1 — Activite physique (0-3) [BSD: >=150=0, 75-149=1, 30-74=2, <30=3]
  let l1=0;
  if(apT<30) l1=3; else if(apT<75) l1=2; else if(apT<150) l1=1;
  d.l1_ap={pts:l1,max:3,label:'l1 — Activite physique ('+Math.round(apT)+' min/sem)',ref:'IPAQ/OMS 2020',grp:'L'};

  // l2 — Alimentation DQI-BMN → normalise 0-3
  // alimRaw max = 39 (10 items x ~4 max chacun)
  // [BSD: PREDIMED >=9=0, 5-8=1, 3-4=2, <3=3]
  // On inverse: DQI haut = mauvais, donc score haut = mauvais
  let l2=0;
  const predimed_equiv=Math.max(0, 14 - Math.round(alimRaw*14/39)); // conversion en equiv PREDIMED
  if(predimed_equiv<3) l2=3; else if(predimed_equiv<5) l2=2; else if(predimed_equiv<9) l2=1;
  d.l2_alim={pts:l2,max:3,label:'l2 — Alimentation (DQI-BMN '+alimRaw+'/39, PREDIMED-eq ~'+predimed_equiv+'/14)',ref:'NOVA/PREDIMED/OMS',grp:'L'};

  // l3 — Alcool (0-2) [BSD: <=10/sem=0, 10-21=1, >21=2]
  let l3=0;
  const alcool_total=S.alcool_f*S.alcool_q; // proxy
  if(alcool_total>=6) l3=2; else if(alcool_total>=2) l3=1;
  d.l3_alcool={pts:l3,max:2,label:'l3 — Alcool (freq='+S.alcool_f+', qte='+S.alcool_q+')',ref:'AUDIT-C',grp:'L'};

  // l4 — Sommeil (0-2) [BSD: 7-9h=0, moyen=1, <6h/troubles=2]
  let l4=0;
  if(S.sommeil<6||S.sommeil>10||S.isi>=15) l4=2;
  else if(S.sommeil<7||S.sommeil>9||S.isi>=8) l4=1;
  d.l4_sommeil={pts:l4,max:2,label:'l4 — Sommeil ('+S.sommeil+'h, ISI '+S.isi+'/28)',ref:'Cappuccio 2008',grp:'L'};

  let L=l1+l2+l3+l4;
  L=Math.max(0,Math.min(10,L));
  S.scoreL=L;

  // ════════════════════════════════════════════════════
  // SCORE DECLARATIF sD = min(100, C + E + O + L)
  // C(0-50) + E(0-45) + O(0-10) + L(0-10) = max theorique 115
  // ════════════════════════════════════════════════════
  const sD=Math.min(100, C+E+O+L);
  S.sD=sD;
  S.bmn_c=sD; // alias compatibilite
  S.details=d;

  // ════════════════════════════════════════════════════
  // CLASSIFICATION DECLARATIVE (sD/100)
  // FAIBLE <30 | MODERE 30-59 | ELEVE 60-79 | TRES ELEVE >=80
  // ════════════════════════════════════════════════════
  let classDecl;
  if(sD<30) classDecl='FAIBLE';
  else if(sD<60) classDecl='MODERE';
  else if(sD<80) classDecl='ELEVE';
  else classDecl='TRES ELEVE';
  S.classDecl=classDecl;

  // ════════════════════════════════════════════════════
  // SII — Sous-Index Inflammatoire Indirect (7 items binaires)
  // Declenchement P5 pour risque FAIBLE si SII >= 2
  // ════════════════════════════════════════════════════
  let sii=0;
  if(sr>=0.35) sii++;           // 1. Stress PSS ratio >= 35%
  if(apT<75) sii++;             // 2. Activite < 75 min/sem (l1>=2)
  if(imc>=e.ob) sii++;          // 3. IMC >= seuil obesite ethnique
  if(S.tabac>=3) sii++;         // 4. Tabagisme actif
  if(alimRaw>=20) sii++;        // 5. PREDIMED equiv < 5 (l2>=2, mauvaise alim)
  if(S.isi>=15) sii++;          // 6. Insomnie moderee+ (l4=2)
  if(tt>ttSeuil) sii++;         // 7. Tour taille > seuil ethnique
  S.sii=sii;

  // Criteres independants (P5 meme si FAIBLE + SII<2)
  // [BSD: age>=40, family>=2, HTA>0, diabete>=3, 1er examen, dernier>2ans]
  const indepAge=age>=40, indepFam=(S.parent_ob>=2||S.diab_par>=1), indepComorb=S.comorbIds.length>0;
  S.indepCrit = indepAge||indepFam||indepComorb;

  // ════════════════════════════════════════════════════
  // PRESCRIPTION BIOLOGIQUE selon classDecl + SII
  // FAIBLE: optionnel sauf SII>=2 ou critere indep → P5
  // MODERE: P10 obligatoire
  // ELEVE/TRES ELEVE: P15 obligatoire
  // ════════════════════════════════════════════════════
  let panelLvl=0;
  if(classDecl==='FAIBLE'){
    panelLvl = (sii>=2||S.indepCrit) ? 5 : 0;
  } else if(classDecl==='MODERE'){
    panelLvl=10;
  } else {
    panelLvl=15;
  }
  S.panelLvl=panelLvl;

  // ════════════════════════════════════════════════════
  // BMN-B : SCORE BIOLOGIE (0-100)
  // bioNorm = (Σ(z_i × w_i) / Σ(w_i)) × 100
  // z-score lineaire borne [0,1] pour chaque marqueur
  // Poids conformes a justification-bio.html BSD v4.7.1
  // ════════════════════════════════════════════════════
  let swz=0, sw=0;
  const zScores={};
  BIO.forEach(m=>{
    const v=S.bioValues[m.id];
    if(v===undefined || v===null) return;
    let z;
    if(!m.inv){ z=v<=m.nm?0:v>=m.ab?1:(v-m.nm)/(m.ab-m.nm); }
    else { z=v>=m.nm?0:v<=m.ab?1:(m.nm-v)/(m.nm-m.ab); }
    z=Math.max(0,Math.min(1,z));
    zScores[m.id]=z;
    swz+=z*m.w; sw+=m.w;
  });
  const bioNorm=sw>0?Math.round(swz/sw*100):0;
  S.bmn_b=bioNorm;

  // ════════════════════════════════════════════════════
  // SCORE FINAL sf = wDecl × sD + wBio × bioNorm
  // Reponderation dynamique si gap > 20
  // + BioFloor standard (75%) + BioEmergencyFloor (85%)
  // ════════════════════════════════════════════════════
  let wDecl=0.65, wBio=0.35;
  if(bioNorm>0 && sw>0){
    const gap=bioNorm-sD;
    if(gap>20){
      const extraW=Math.min(0.30,(gap-20)/100*0.60);
      wBio=0.35+extraW; wDecl=1-wBio;
    }
  }
  let sf;
  if(bioNorm>0 && sw>0){
    sf=wDecl*sD + wBio*bioNorm;
    // BioFloor standard: sf >= 75% de bioNorm
    sf=Math.max(sf, bioNorm*0.75);
    // BioEmergencyFloor (BEF)
    if(bioNorm>90) sf=Math.max(sf, Math.max(80, bioNorm*0.85));
    else if(bioNorm>80) sf=Math.max(sf, bioNorm*0.85);
    // Urgence HbA1c >= 6.5% → sf minimum 60
    if(S.bioValues.hba1c>=6.5 && sf<60) sf=60;
    // Urgence HbA1c >= 8% → forcer c5 diabete = max
    if(S.bioValues.hba1c>=8) sf=Math.max(sf, 70);
  } else {
    sf=sD; // pas de biologie → score declaratif seul
  }
  sf=Math.max(0,Math.min(100,Math.round(sf)));
  S.sf=sf;
  S.bmn_t=sf;
  S.wDecl=wDecl; S.wBio=wBio;

  // Classification finale (sf/100)
  if(sf<30) S.classFinal='FAIBLE';
  else if(sf<60) S.classFinal='MODERE';
  else if(sf<80) S.classFinal='ELEVE';
  else S.classFinal='TRES ELEVE';

  // ════════════════════════════════════════════════════
  // CTI — Chronicity Trajectory Index (0-100)
  // Σ(γ_j × Z_j) × max(amplificateur comorbidite)
  // ════════════════════════════════════════════════════
  let ctiSum=0;
  ctiSum += 0.185 * (sD>70?1:sD>50?0.7:sD>30?0.4:0.1);
  ctiSum += 0.249 * (S.yoyo>=1?1:0);
  ctiSum += 0.210 * Math.min(1,(imc>35?1:imc>30?0.6:imc>e.ow?0.3:0)+(S.comorbIds.includes('saos')?0.3:0));
  ctiSum += 0.180 * Math.min(1,alimRaw/25);
  ctiSum += 0.195 * Math.min(1,sr*0.4+(S.isi/28)*0.3+(sched/5)*0.3);
  ctiSum += 0.200 * Math.min(1,(S.comorbIds.includes('hypo')?0.6:0)+(S.yoyo>=1?0.4:0));
  ctiSum += 0.240 * (S.enf_ob>=2?1:S.enf_ob>=1?0.5:0);
  S.cti=Math.min(100, Math.round((ctiSum/1.459)*100*ctiAmp));

  // ════════════════════════════════════════════════════
  // GRI — GLP-1 Response Index (-3 to +6)
  // Σ(δ_k × F_k) − Σ(ε_k × U_k)
  // ════════════════════════════════════════════════════
  let gri=0;
  griF.forEach(f=>{ gri+=f.d; });
  if(S.bioValues.homaIR!==undefined && S.bioValues.homaIR>2.5) gri+=1.07;
  if(S.bioValues.adipon!==undefined && S.bioValues.adipon<6) gri+=0.62;
  if(S.bioValues.tghdl!==undefined && S.bioValues.tghdl>3.5) gri+=0.55;
  griU.forEach(u=>{ gri-=u.e; });
  if(S.cti>55) gri-=0.65;
  if(S.comorbIds.includes('cortis')) gri-=0.35;
  if(imc>40) gri-=0.47;
  if(sr>=0.6) gri-=0.28;
  S.gri=Math.max(-3,Math.min(6,gri));
}

// ── PANEL : quel niveau afficher a l'ecran bio ──
function getPanelLvl(){ return S.panelLvl||0; }

// ── Classification couleurs ──
function getClass(s){
  if(s<30) return{l:'FAIBLE',c:'var(--green)',bg:'var(--green-bg)',tier:'Surveillance',suivi:'3 ans'};
  if(s<60) return{l:'MODERE',c:'var(--orange)',bg:'var(--orange-bg)',tier:'Nutrition + AP',suivi:'annuel'};
  if(s<80) return{l:'ELEVE',c:'var(--red)',bg:'var(--red-bg)',tier:'GLP-1 preventif',suivi:'trimestriel'};
  return{l:'TRES ELEVE',c:'var(--purple)',bg:'var(--purple-bg)',tier:'Chirurgie / GLP-1 urgent',suivi:'mensuel'};
}
function getCTILabel(cti){
  if(cti<=20) return{l:'Fenetre ouverte',c:'var(--green)',d:'Interventions classiques efficaces'};
  if(cti<=40) return{l:'Debut chronicisation',c:'var(--orange)',d:'Agir rapidement'};
  if(cti<=55) return{l:'Chronicite avancee',c:'var(--red)',d:'GLP-1 recommande'};
  return{l:'Chronicite installee',c:'var(--purple)',d:'Evaluation chirurgicale obligatoire'};
}
function getGRILabel(gri){
  if(gri>=2.5) return{l:'Excellent',c:'var(--green)',d:'Reponse GLP-1 >85%'};
  if(gri>=1.5) return{l:'Bon',c:'var(--teal)',d:'Reponse GLP-1 60-85%'};
  if(gri>=0.5) return{l:'Modere',c:'var(--orange)',d:'Reponse GLP-1 incertaine'};
  return{l:'Faible',c:'var(--red)',d:'GLP-1 peu probable, chirurgie a envisager'};
}

// ── Prescription biologie detaillee ──
// [BSD v4.9: P5 minimal, P10 intermediaire, P15 complet]
function getBioPrescription(){
  const sD=S.sD, sii=S.sii, cls=S.classDecl;
  // P5 = HbA1c, Glycemie, LDL, HDL, CRP hs (+ TSH, NFS)
  const P5=['HbA1c','Glycemie a jeun','LDL cholesterol','HDL cholesterol','CRP ultrasensible','TSH','NFS'];
  // P10 = P5 + Trigly, ApoB, HOMA-IR, Creatinine, ASAT/ALAT, Acide urique, Adiponectine, GGT, eGFR
  const P10=[...P5,'HOMA-IR','Triglycerides','ApoB','Adiponectine','ASAT/ALAT','GGT','Creatinine','Acide urique'];
  // P15 = P10 + Lp(a), Leptine, FibroScan/CAP, TG/HDL ratio, Cortisol salivaire, Testosterone/AMH si SOPK
  const P15=[...P10,'Leptine','Ratio TG/HDL','FibroScan / CAP','Cortisol salivaire','Testosterone/AMH (si SOPK)'];
  let tier,panel,color,desc,suivi;
  if(cls==='FAIBLE'){
    if(sii>=2||S.indepCrit){
      tier='Panel 5 — OBLIGATOIRE'; panel=P5; color='var(--accent)';
      desc='SII = '+sii+'/7'+(S.indepCrit?' + critere independant':'')+'. Bilan de depistage recommande.';
      suivi='Controle dans 2 ans';
    } else {
      tier='OPTIONNEL'; panel=[]; color='var(--green)';
      desc='Score declaratif faible (sD = '+sD+') et SII < 2. Bilan optionnel. Recommande si 1ere visite ou dernier bilan > 2 ans.';
      suivi='Controle dans 3 ans';
    }
  } else if(cls==='MODERE'){
    tier='Panel 10 — OBLIGATOIRE'; panel=P10; color='var(--orange)';
    desc='Risque modere (sD = '+sD+'). Bilan metabolique complet incluant marqueurs d\'insulinoresistance et profil lipidique avance.';
    suivi='Suivi annuel';
  } else if(cls==='ELEVE'){
    tier='Panel 15 — OBLIGATOIRE'; panel=P15; color='var(--red)';
    desc='Risque eleve (sD = '+sD+'). Bilan endocrinien complet: hepatique, inflammatoire, hormonal, adipokines.';
    suivi='Suivi trimestriel';
  } else {
    tier='Panel 15 + BEF — OBLIGATOIRE'; panel=P15; color='var(--purple)';
    desc='Risque tres eleve (sD = '+sD+'). Bilan complet + BioEmergencyFloor actif. Prise en charge urgente.';
    suivi='Suivi mensuel - equipe specialisee';
  }
  return{tier,panel,color,desc,suivi,sii,sD,cls};
}

// ── Strategies therapeutiques ──
// [BSD v4.9: FAIBLE=lifestyle, MODERE=P10+lifestyle, ELEVE=P15+managed, TRES ELEVE=P15+BEF+intensive]
function getTherapeuticStrategy(){
  const sf=S.sf, cti=S.cti, gri=S.gri, cls=S.classFinal;
  const strats=[];
  if(cls==='FAIBLE'){
    strats.push({level:'FAIBLE',color:'var(--green)',title:'Surveillance — sf < 30/100',
      actions:['Alimentation mediterraneenne (PREDIMED)','Activite physique >= 150 min/sem (OMS)','Sommeil 7-8h regulier','Gestion du stress (PSS-10 de controle)','Controle metabolique tous les 3 ans'],
      suivi:'Controle dans 3 ans',pharma:null});
  } else if(cls==='MODERE'){
    strats.push({level:'MODERE',color:'var(--orange)',title:'Programme Nutrition + AP — sf 30-59/100',
      actions:['Consultation dieteticien specialise','Programme AP progressif personnalise','Reduction ultra-transformes (NOVA < 2)','Education therapeutique: portions + structure repas','TCC si PSS >= 20 ou PHQ >= 10','Bilan Panel 10 obligatoire','Objectif: -3 a -5% poids en 6 mois'],
      suivi:'Suivi annuel',pharma:'Pas de pharmacologie a ce stade'});
  } else if(cls==='ELEVE'){
    strats.push({level:'ELEVE',color:'var(--red)',title:'Suivi Renforce + GLP-1 — sf 60-79/100',
      actions:['Suivi trimestriel medecin + dieteticien','Bilan Panel 15 obligatoire','Programme AP encadre (kinesi, APA)','Psychologue si PHQ >= 10','GLP-1 preventif si GRI >= 1.5','Objectif: -5 a -10% poids en 6 mois'],
      suivi:'Suivi trimestriel',
      pharma:gri>=1.5?'Semaglutide (Wegovy) — GRI favorable ('+gri.toFixed(1)+')':'GLP-1 a evaluer (GRI '+gri.toFixed(1)+')'});
  } else {
    strats.push({level:'TRES ELEVE',color:'var(--purple)',title:'Urgence Pluridisciplinaire — sf >= 80/100',
      actions:['RDV endocrinologue urgent (< 2 semaines)','Bilan Panel 15 + BioEmergencyFloor actif','GLP-1 haute dose (Tirzepatide / Semaglutide)','Evaluation chirurgie bariatrique si CTI > 55','Psychiatrie si depression severe (PHQ >= 20)','Suivi nutritionnel 2x/mois'],
      suivi:'Suivi bimensuel',pharma:'Tirzepatide haute dose + evaluation chirurgie bariatrique'});
  }
  if(cti>55) strats.push({level:'CHIRURGIE',color:'var(--purple)',
    title:'Chirurgie Bariatrique — CTI '+S.cti+'/100',
    actions:['Consultation chirurgien bariatrique','Evaluation psychologique pre-operatoire','Sleeve gastrectomy / bypass / SADI-S','Suivi nutritionnel 5 ans post-op'],
    suivi:'Bilan pre-op + suivi 5 ans',pharma:null});
  if(gri>=2.5) strats.push({level:'GLP-1',color:'var(--green)',
    title:'GLP-1 Excellent — GRI '+gri.toFixed(1),
    actions:['Profil metabolique excellent pour GLP-1','Semaglutide ou Tirzepatide prioritaire','Objectif >= 15% perte de poids','Suivi endocrino 3/6/12 mois'],
    suivi:'Trimestriel sous traitement',pharma:null});
  return strats;
}

// ── MARKOV ──
function calcMarkov(){
  const imc=S.imc, e=ETH[S.ethnie]||ETH.eu;
  let cs=imc>=35?5:imc>=30?4:imc>=27.5?3:imc>=e.ow?2:imc>=e.ow-2?1:0;
  const kN=(S.bmn_k/50)*100;
  const rf=Math.exp(0.68*S.sf/100)*Math.exp(0.35*kN/100);
  let cm=1; S.comorbIds.forEach(id=>{if(MK_CM[id])cm=Math.max(cm,MK_CM[id]);});
  let prob=[0,0,0,0,0,0]; prob[cs]=1;
  for(let y=0;y<10;y++){const np=[0,0,0,0,0,0];
    for(let i=0;i<6;i++){if(prob[i]<0.001)continue;const row=MK_B[i].slice();
      for(let j=i+1;j<6;j++)row[j]*=rf*cm;for(let j=0;j<i;j++)row[j]/=rf;
      const rt=row.reduce((a,b)=>a+b,0);for(let j=0;j<6;j++)np[j]+=prob[i]*(row[j]/rt);}
    prob=np;}
  return{cs,prob};
}

// ── RETRO-DIAGNOSTIC ──
function doRetro(){
  const v=S.bioValues, fl=[];
  if(v.homaIR>=4&&!S.comorbIds.includes('dt2')&&!S.comorbIds.includes('predmt'))
    fl.push({c:'var(--red)',t:'HOMA-IR >= 4: resistance insuline severe non declaree'});
  if(v.hba1c>=5.7&&v.hba1c<6.5&&!S.comorbIds.includes('predmt'))
    fl.push({c:'var(--orange)',t:'HbA1c '+v.hba1c+'%: pre-diabete (5.7-6.4%). Ref: ADA 2024'});
  if(v.hba1c>=6.5&&!S.comorbIds.includes('dt2'))
    fl.push({c:'var(--red)',t:'HbA1c '+v.hba1c+'%: diabete type 2. Ref: ADA 2024'});
  if(v.tghdl>3.5&&v.adipon!==undefined&&v.adipon<6&&v.homaIR>2.5)
    fl.push({c:'var(--red)',t:'TRIADE IR: TG/HDL+Adiponectine+HOMA-IR'});
  if(v.crphs>=3) fl.push({c:'var(--orange)',t:'CRP>=3: inflammation systemique'});
  if(v.tsh>=4&&!S.comorbIds.includes('hypo'))
    fl.push({c:'var(--orange)',t:'TSH>=4: hypothyroidie subclinique'});
  if(v.apob>=1.2) fl.push({c:'var(--orange)',t:'ApoB>=1.2: risque CV eleve'});
  if(v.urate>=420) fl.push({c:'var(--orange)',t:'Acide urique>=420: hyperuricemie'});
  if(v.leptine>=40) fl.push({c:'var(--orange)',t:'Leptine>=40: resistance a la leptine'});
  const el=$('retro');if(!el)return;
  el.innerHTML=fl.length
    ?fl.map(f=>`<div class="retro-alert" style="border-left-color:${f.c}"><span style="color:${f.c}">${f.t}</span></div>`).join('')
    :'<div class="retro-ok">Pas d\'incoherence detectee.</div>';
}

// ── SIMULATION PROFILS BIOLOGIQUES ──
// Pre-remplit les biomarqueurs selon 4 profils types + reset
// Valeurs basees sur les seuils nm/ab de chaque marqueur
function applyBioProfile(profile){
  const pl=getPanelLvl();
  const markers=pl>0 ? BIO.filter(m=>m.t<=pl) : BIO.filter(m=>m.t<=5);

  if(profile==='reset'){
    BIO.forEach(m=>{ S.bioValues[m.id]=undefined; });
    calc(); render(S.step,0); doRetro(); return;
  }

  // Profils de simulation — valeurs realistes par marqueur
  // normal: toutes les valeurs dans la zone normale
  // borderline: valeurs entre normal et anormal (z~0.3-0.5)
  // elevated: valeurs franchement anormales (z~0.7-0.9)
  // critical: valeurs tres anormales (z~0.9-1.0)
  const profiles={
    normal:{
      homaIR:1.8, hba1c:5.2, glyc:4.8, crphs:0.5, tsh:2.0, ldl:2.4, hdl:1.4,
      tg:1.2, adipon:14, asat:25, apob:0.7, ggt:30,
      tghdl:1.2, urate:300, leptine:12
    },
    borderline:{
      homaIR:3.2, hba1c:5.9, glyc:5.8, crphs:2.0, tsh:3.5, ldl:3.5, hdl:0.85,
      tg:1.9, adipon:8, asat:48, apob:1.0, ggt:60,
      tghdl:2.7, urate:385, leptine:28
    },
    elevated:{
      homaIR:4.5, hba1c:6.8, glyc:7.5, crphs:4.0, tsh:6.0, ldl:4.5, hdl:0.65,
      tg:2.5, adipon:5, asat:65, apob:1.3, ggt:85,
      tghdl:3.8, urate:440, leptine:45
    },
    critical:{
      homaIR:6.0, hba1c:8.2, glyc:10, crphs:8.0, tsh:10, ldl:5.5, hdl:0.5,
      tg:3.5, adipon:3, asat:90, apob:1.6, ggt:120,
      tghdl:5.0, urate:520, leptine:65
    }
  };

  const vals=profiles[profile];
  if(!vals) return;

  // Appliquer uniquement aux marqueurs prescrits
  markers.forEach(m=>{
    if(vals[m.id]!==undefined){
      S.bioValues[m.id]=vals[m.id];
    }
  });

  calc(); render(S.step,0); doRetro();
}

// ════════════════════════════════════════════════════════════════
// FINAL RESULT — Architecture CLEO : C+E+O+L → sD → Bio → sf
// Diagnostic complet + CTI/GRI + Strategie + Rapport IA medecin
// ════════════════════════════════════════════════════════════════
function renderFinal(){
  const t=S.bmn_t, cls=getClass(t), mk=calcMarkov();
  const ctiInfo=getCTILabel(S.cti), griInfo=getGRILabel(S.gri);
  const bioPrx=getBioPrescription();
  const strats=getTherapeuticStrategy();
  const colors=['var(--green)','var(--teal)','var(--orange)','var(--orange)','var(--red)','var(--purple)'];
  const pObes=((mk.prob[4]+mk.prob[5])*100).toFixed(1);
  const pssT=getPssTotal(), phqT=getPhqTotal();
  const hasBio=(S.bmn_b>0);
  const age=getAge();

  let r='';

  // ══════════════════════════════════════════════════════
  // 1. HERO SCORE — compact, jamais coupe
  // ══════════════════════════════════════════════════════
  r+=`<div style="display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:16px;background:${cls.bg};margin:0 0 12px">
    <div style="text-align:center;min-width:80px">
      <div style="font-size:48px;font-weight:900;color:${cls.c};line-height:1;font-family:'JetBrains Mono',monospace">${t}</div>
      <div style="font-size:11px;color:${cls.c};opacity:.6">/100</div>
    </div>
    <div style="flex:1">
      <div style="font-size:20px;font-weight:800;color:${cls.c}">${cls.l}</div>
      <div style="font-size:12px;color:${cls.c};opacity:.8;margin:2px 0">${cls.tier}</div>
      <div style="font-size:10px;color:${cls.c};opacity:.6">${hasBio?'sf = '+S.wDecl.toFixed(2)+'×sD + '+S.wBio.toFixed(2)+'×bioNorm':'sf = sD (sans biologie)'}</div>
    </div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 2. TABLEAU DIAGNOSTIQUE COMPLET — 2 lignes
  // ══════════════════════════════════════════════════════
  const gridItem=(lbl,val,sub,col)=>`<div style="text-align:center;padding:8px 4px;background:var(--bg2);border-radius:10px">
    <div style="font-size:9px;color:var(--dim2);text-transform:uppercase;letter-spacing:.5px">${lbl}</div>
    <div style="font-size:22px;font-weight:800;color:${col};font-family:'JetBrains Mono',monospace;line-height:1.2">${val}</div>
    <div style="font-size:9px;color:var(--dim3)">${sub}</div></div>`;

  r+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
    ${gridItem('C',S.scoreC,'/50 clinique','var(--accent)')}
    ${gridItem('E',S.scoreE,'/45 exposome',S.scoreE>20?'var(--red)':S.scoreE>10?'var(--orange)':'var(--green)')}
    ${gridItem('O',S.scoreO,'/10 occup.',S.scoreO>=6?'var(--red)':'var(--green)')}
    ${gridItem('L',S.scoreL,'/10 lifestyle',S.scoreL>=6?'var(--red)':'var(--green)')}
  </div>`;

  r+=`<div style="text-align:center;font-size:11px;color:var(--dim2);margin-bottom:10px">
    sD = min(100, ${S.scoreC}+${S.scoreE}+${S.scoreO}+${S.scoreL}) = <b>${S.sD}</b> → <b style="color:${getClass(S.sD).c}">${S.classDecl}</b>
  </div>`;

  r+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
    ${gridItem('sD',S.sD,'/100 declaratif',getClass(S.sD).c)}
    ${gridItem('Bio',S.bmn_b||'--','/100 biologie',S.bmn_b>0?'var(--teal)':'var(--dim)')}
    ${gridItem('sf',t,'/100 final',cls.c)}
    ${gridItem('K',S.bmn_k,'/50 comorb.',S.bmn_k>20?'var(--red)':S.bmn_k>0?'var(--orange)':'var(--green)')}
  </div>`;

  r+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
    ${gridItem('CTI',S.cti,ctiInfo.l,ctiInfo.c)}
    ${gridItem('GRI',S.gri.toFixed(1),griInfo.l,griInfo.c)}
    ${gridItem('SII',S.sii,'/7 inflam.',S.sii>=4?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)')}
    ${gridItem('P(Ob)',pObes+'%','10 ans',parseFloat(pObes)>50?'var(--red)':parseFloat(pObes)>25?'var(--orange)':'var(--green)')}
  </div>`;

  // ══════════════════════════════════════════════════════
  // 3. DIAGNOSTIC CTI — Trajectoire de chronicite
  // ══════════════════════════════════════════════════════
  r+=`<div style="border:1px solid ${ctiInfo.c};border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:14px;font-weight:700;color:${ctiInfo.c}">CTI = ${S.cti}/100</div>
      <div style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:6px;background:${ctiInfo.c};color:#fff">${ctiInfo.l}</div>
    </div>
    <div style="font-size:12px;color:var(--dim);margin-bottom:6px">${ctiInfo.d}</div>
    <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-bottom:6px">
      <div style="width:${Math.min(S.cti,100)}%;height:100%;background:${ctiInfo.c};border-radius:3px;transition:width .5s"></div>
    </div>
    <div style="font-size:10px;color:var(--dim3)">
      <b>Interpretation :</b> ${S.cti<=20?'Fenetre therapeutique ouverte. Les interventions classiques (nutrition, AP, pharmacologie) ont une efficacite maximale. Agir maintenant.':
      S.cti<=40?'Debut de chronicisation. L\'efficacite des interventions diminue progressivement. Pharmacologie (GLP-1) a considerer rapidement.':
      S.cti<=55?'Chronicite avancee. Les mecanismes adaptatifs (leptinoresistance, reponse metabolique) sont installes. GLP-1 haute dose recommande. Chirurgie a evaluer.':
      'Chronicite installee. Resistance majeure aux interventions conservatrices. Evaluation chirurgicale bariatrique obligatoire. Set-point durablement modifie.'}
    </div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 4. DIAGNOSTIC GRI — Reponse therapeutique
  // ══════════════════════════════════════════════════════
  r+=`<div style="border:1px solid ${griInfo.c};border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:14px;font-weight:700;color:${griInfo.c}">GRI = ${S.gri.toFixed(1)}</div>
      <div style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:6px;background:${griInfo.c};color:#fff">${griInfo.l}</div>
    </div>
    <div style="font-size:12px;color:var(--dim);margin-bottom:6px">${griInfo.d}</div>
    <div style="font-size:10px;color:var(--dim3)">
      <b>Decision therapeutique :</b> ${S.gri>=2.5?'Excellent candidat GLP-1 (Semaglutide/Tirzepatide). Reponse attendue >85%. Perte de poids estimee 15-20%.':
      S.gri>=1.5?'Bon candidat GLP-1. Reponse attendue 60-85%. Associer programme nutritionnel structure.':
      S.gri>=0.5?'Reponse GLP-1 incertaine. Privilegier approche multimodale (nutrition + AP + suivi psycho). GLP-1 en 2e intention.':
      'Reponse GLP-1 peu probable. Orienter vers chirurgie bariatrique si CTI > 55. Sinon, programme intensif pluridisciplinaire.'}
    </div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 5. INTEGRATION BIOLOGIQUE (si bio presente)
  // ══════════════════════════════════════════════════════
  if(hasBio){
    r+=`<div style="background:var(--bg2);border-radius:12px;padding:12px 14px;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;color:var(--teal);margin-bottom:8px">Integration Biologique — BSD v4.7.1</div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:6px">
        <div style="text-align:center;flex:1"><div style="font-size:10px;color:var(--dim2)">sD</div><div style="font-size:18px;font-weight:700">${S.sD}</div><div style="font-size:9px;color:var(--dim3)">w=${S.wDecl.toFixed(2)}</div></div>
        <div style="font-size:16px;color:var(--dim3)">×</div>
        <div style="text-align:center;flex:1"><div style="font-size:10px;color:var(--dim2)">bioNorm</div><div style="font-size:18px;font-weight:700;color:var(--teal)">${S.bmn_b}</div><div style="font-size:9px;color:var(--dim3)">w=${S.wBio.toFixed(2)}</div></div>
        <div style="font-size:16px;color:var(--dim3)">=</div>
        <div style="text-align:center;flex:1"><div style="font-size:10px;color:var(--dim2)">sf</div><div style="font-size:18px;font-weight:700;color:${cls.c}">${t}</div><div style="font-size:9px;color:var(--dim3)">final</div></div>
      </div>
      <div style="font-size:10px;color:var(--dim3)">
        ${S.bmn_b>80?'BioEmergencyFloor actif (bio>80 → sf >= '+Math.round(S.bmn_b*0.85)+') | ':''}
        ${S.bInflam>0?'bInflam = '+S.bInflam.toFixed(2)+' (E amplifiee +'+Math.round(S.bInflam*15)+'%) | ':''}
        Gap = ${Math.abs(S.bmn_b-S.sD)} → ${Math.abs(S.bmn_b-S.sD)>20?'Reponderation dynamique':'Poids standards'}
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // 6. SANTE MENTALE — ligne compacte
  // ══════════════════════════════════════════════════════
  r+=`<div style="display:flex;gap:8px;margin-bottom:10px">
    <div style="flex:1;text-align:center;padding:8px;background:var(--bg2);border-radius:10px">
      <div style="font-size:9px;color:var(--dim2)">PSS-10</div>
      <div style="font-size:16px;font-weight:700;color:${pssT>=27?'var(--red)':pssT>=20?'var(--orange)':pssT>=14?'var(--accent)':'var(--green)'}">${pssT}/40</div>
      <div style="font-size:9px;color:var(--dim3)">${pssT>=27?'Tres eleve':pssT>=20?'Eleve':pssT>=14?'Modere':'Faible'}</div></div>
    <div style="flex:1;text-align:center;padding:8px;background:var(--bg2);border-radius:10px">
      <div style="font-size:9px;color:var(--dim2)">PHQ-9</div>
      <div style="font-size:16px;font-weight:700;color:${phqT>=20?'var(--red)':phqT>=15?'var(--orange)':phqT>=10?'var(--accent)':'var(--green)'}">${phqT}/27</div>
      <div style="font-size:9px;color:var(--dim3)">${phqT>=20?'Severe':phqT>=15?'Mod-sev.':phqT>=10?'Modere':phqT>=5?'Leger':'Normal'}</div></div>
    <div style="flex:1;text-align:center;padding:8px;background:var(--bg2);border-radius:10px">
      <div style="font-size:9px;color:var(--dim2)">BES</div>
      <div style="font-size:16px;font-weight:700;color:${S.bes>=5?'var(--red)':S.bes>=3?'var(--orange)':'var(--green)'}">${S.bes}/8</div>
      <div style="font-size:9px;color:var(--dim3)">${S.bes>=5?'Severe':S.bes>=3?'Modere':'Leger'}</div></div>
    <div style="flex:1;text-align:center;padding:8px;background:var(--bg2);border-radius:10px">
      <div style="font-size:9px;color:var(--dim2)">SII</div>
      <div style="font-size:16px;font-weight:700;color:${S.sii>=4?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)'}">${S.sii}/7</div>
      <div style="font-size:9px;color:var(--dim3)">Inflam.</div></div>
  </div>`;

  // ══════════════════════════════════════════════════════
  // 7. PROJECTION MARKOV — compact
  // ══════════════════════════════════════════════════════
  r+=`<div style="background:var(--bg2);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:13px;font-weight:700;color:var(--txt)">Projection Markov — 10 ans</div>
      <div style="font-size:16px;font-weight:800;color:${parseFloat(pObes)>50?'var(--red)':parseFloat(pObes)>25?'var(--orange)':'var(--green)'}">${pObes}%</div>
    </div>`;
  mk.prob.forEach((p,i)=>{
    const pct=(p*100).toFixed(1);
    r+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <div style="min-width:80px;font-size:10px;color:${colors[i]};font-weight:${i===mk.cs?700:400}">${MK_ST[i]}${i===mk.cs?' •':''}</div>
      <div style="flex:1;height:4px;background:var(--bg3);border-radius:2px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${colors[i]}"></div></div>
      <div style="min-width:35px;font-size:10px;color:${colors[i]};text-align:right;font-weight:600">${pct}%</div></div>`;
  });
  r+=`<div style="font-size:9px;color:var(--dim3);margin-top:4px">Matrice 6x6 × exp(0.68×sf/100) × exp(0.35×K/100) | Leibel 1995, Sumithran 2011</div></div>`;

  // ══════════════════════════════════════════════════════
  // 8. STRATEGIE THERAPEUTIQUE PERSONNALISEE
  // ══════════════════════════════════════════════════════
  r+=`<div style="margin-bottom:10px">
    <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:8px;padding:0 4px">STRATEGIE THERAPEUTIQUE</div>`;
  strats.forEach(s=>{
    r+=`<div style="border-left:3px solid ${s.color};padding:10px 12px;margin-bottom:8px;background:var(--bg2);border-radius:0 12px 12px 0">
      <div style="font-size:13px;font-weight:700;color:${s.color};margin-bottom:4px">${s.title}</div>
      ${s.actions?.length?`<ul style="margin:0;padding-left:18px;font-size:11px;color:var(--dim);line-height:1.6">${s.actions.map(a=>'<li>'+a+'</li>').join('')}</ul>`:''}
      ${s.pharma?`<div style="font-size:11px;margin-top:4px"><span style="color:${s.color};font-weight:600">Pharmacologie:</span> <span style="color:var(--dim)">${s.pharma}</span></div>`:''}
      <div style="font-size:10px;color:var(--dim3);margin-top:4px"><b>Suivi:</b> ${s.suivi}</div>
    </div>`;
  });
  r+=`</div>`;

  // ══════════════════════════════════════════════════════
  // 9. RAPPORT IA STRATEGIQUE — aide au medecin
  // ══════════════════════════════════════════════════════
  r+=`<div style="margin-bottom:10px">
    <div style="font-size:14px;font-weight:800;color:var(--txt);margin-bottom:8px;padding:0 4px">RAPPORT IA — AIDE AU MEDECIN</div>
    <div id="aiFinal" style="min-height:60px">
      <div style="display:flex;align-items:center;gap:10px;padding:16px;background:var(--bg2);border-radius:12px">
        <span class="spinner"></span>
        <span style="font-size:12px;color:var(--dim)">Generation du rapport strategique personnalise...</span>
      </div>
    </div>
  </div>`;

  setTimeout(async()=>{
    const ai=await requestAIReport();
    const box=$('aiFinal');
    if(!box)return;
    if(ai&&(ai.diagnostic_resume||ai.summary)){
      const tone=ai.tone||'cautious';
      const tc=tone==='urgent'?'var(--red)':tone==='cautious'?'var(--orange)':'var(--green)';
      const tLabel=tone==='urgent'?'URGENT':tone==='cautious'?'ATTENTION':'FAVORABLE';
      let h2=`<div style="border:1px solid ${tc};border-radius:12px;overflow:hidden">
        <div style="background:${tc};color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;font-size:13px">Rapport IA — Claude</div>
          <div style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.2)">${tLabel}</div>
        </div>
        <div style="padding:14px">`;

      // Diagnostic resume
      if(ai.diagnostic_resume) h2+=`<div style="font-size:12px;color:var(--txt);line-height:1.6;margin-bottom:12px">${ai.diagnostic_resume}</div>`;
      else if(ai.summary) h2+=`<div style="font-size:12px;color:var(--txt);line-height:1.6;margin-bottom:12px">${ai.summary}</div>`;

      // Synthese clinique
      if(ai.synthese_clinique) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">SYNTHESE CLINIQUE</div><div style="font-size:11px;color:var(--dim);line-height:1.5">${ai.synthese_clinique}</div></div>`;

      // Points positifs
      const pos=ai.points_positifs||ai.positive_points;
      if(pos?.length) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:4px">POINTS FAVORABLES</div>${pos.map(p2=>`<div style="font-size:11px;color:var(--dim);padding:3px 0;border-bottom:1px solid var(--bg3)">+ ${p2}</div>`).join('')}</div>`;

      // Risques identifies
      const risks=ai.risques_identifies||ai.key_risks;
      if(risks?.length) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:4px">RISQUES IDENTIFIES</div>${risks.map(r2=>`<div style="font-size:11px;color:var(--dim);padding:3px 0;border-bottom:1px solid var(--bg3)">! ${r2}</div>`).join('')}</div>`;

      // Plan therapeutique IA
      const plan=ai.plan_therapeutique||ai.priority_actions;
      if(plan?.length) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">PLAN THERAPEUTIQUE RECOMMANDE</div>${plan.map((a2,i)=>`<div style="font-size:11px;color:var(--dim);padding:3px 0;border-bottom:1px solid var(--bg3)">${i+1}. ${a2}</div>`).join('')}</div>`;

      // Pharmacologie
      if(ai.recommandation_pharmacologique) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:4px">PHARMACOLOGIE</div><div style="font-size:11px;color:var(--dim);line-height:1.5">${ai.recommandation_pharmacologique}</div></div>`;

      // Suivi propose
      if(ai.suivi_propose) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:4px">SUIVI PROPOSE</div><div style="font-size:11px;color:var(--dim);line-height:1.5">${ai.suivi_propose}</div></div>`;

      // Conseils personnalises
      const tips=ai.conseils_patient||ai.lifestyle_tips;
      if(tips?.length) h2+=`<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:700;color:var(--teal);margin-bottom:4px">CONSEILS PATIENT</div>${tips.map(l=>`<div style="font-size:11px;color:var(--dim);padding:3px 0;border-bottom:1px solid var(--bg3)">→ ${l}</div>`).join('')}</div>`;

      // Attention medicale
      const med=ai.attention_medicale||ai.medical_attention;
      if(med) h2+=`<div style="padding:8px 10px;background:var(--red-bg);border-radius:8px;font-size:11px;color:var(--red);font-weight:600">${med}</div>`;

      h2+=`</div></div>`;
      box.innerHTML=h2;
    } else {
      box.innerHTML=`<div style="padding:12px;background:var(--bg2);border-radius:10px;font-size:11px;color:var(--dim3);text-align:center">Rapport IA non disponible. Verifiez la connexion.</div>`;
    }
  },300);

  // ══════════════════════════════════════════════════════
  // 10. QUANTIFICATION DETAILLEE (collapse)
  // ══════════════════════════════════════════════════════
  r+=`<details style="margin-bottom:10px;background:var(--bg2);border-radius:12px;overflow:hidden">
    <summary style="padding:12px 14px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer">Quantification detaillee (sD = ${S.sD}/100)</summary>
    <div style="padding:0 14px 14px">`;
  const dd=S.details;
  ['C','E','O','L'].forEach(grp=>{
    const grpLabel=grp==='C'?'Clinique (C='+S.scoreC+'/50)':grp==='E'?'Exposome (E='+S.scoreE+'/45)':grp==='O'?'Occup. (O='+S.scoreO+'/10)':'Lifestyle (L='+S.scoreL+'/10)';
    const grpKeys=Object.keys(dd).filter(k=>dd[k].grp===grp&&!k.startsWith('_'));
    if(grpKeys.length===0)return;
    r+=`<div style="margin:8px 0 4px;font-weight:700;color:var(--accent);font-size:12px">${grpLabel}</div>`;
    grpKeys.sort((a,b)=>dd[b].pts-dd[a].pts);
    grpKeys.forEach(k=>{
      const v=dd[k];if(v.max===0)return;
      const pct=Math.round(v.pts/v.max*100);
      const col=pct>=70?'var(--red)':pct>=40?'var(--orange)':'var(--green)';
      r+=`<div class="contrib-row"><div class="contrib-name">${v.label} <span class="contrib-ref">${v.ref||''}</span></div>
        <div class="contrib-bar"><div class="contrib-bar-fill" style="width:${pct}%;background:${col}"></div></div>
        <div class="contrib-pts" style="color:${col}">${v.pts}/${v.max}</div></div>`;
    });
  });
  r+=`</div></details>`;

  // ══════════════════════════════════════════════════════
  // 11. REFERENCES
  // ══════════════════════════════════════════════════════
  r+=`<div style="margin-top:8px;padding:10px 12px;background:var(--bg2);border-radius:10px;font-size:9px;color:var(--dim3);line-height:1.5">
    <b>References :</b> OMS | IDF 2006 | ADA 2024 | FINDRISC | IPAQ | PHQ-9 (Kroenke 2001) | PSS-10 (Cohen 1983) | ISI | BES | AUDIT-C | Lancet 2016 | BMJ 2016 WHtR | NEJM 1995 Leibel | NEJM 2011 Sumithran | SCORE2 | INTERHEART | DPP | Biswas 2015 | Cappuccio 2008 | Aubin 2012 | CAMS | Brook 2010 | ERFC 2010 | CTT 2010 | CKD-PC 2010<br>
    <b>Score BMN v3.0</b> — Architecture CLEO (C+E+O+L) — BSD v4.9 + Bio v4.7.1 — Bach | Manos | Noel
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
