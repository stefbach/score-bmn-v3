// ════════════════════════════════════════════════════════════════
// SCORE BMN v2.0 — ULTRA MOBILE ENGINE
// Native-app grade · Screen-by-screen · Touch-first
// ════════════════════════════════════════════════════════════════

// ─── DATA CONSTANTS ───
const ETH={
  eu:{n:'Européen',ow:25,ob:30,tf:88,tm:102,dR:1,hR:1,cR:1,iM:1,ev:0},
  im:{n:'Indo-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.2,cR:1.4,iM:1.2,ev:-1.5},
  cr:{n:'Créole Mauricien',ow:25,ob:30,tf:84,tm:94,dR:1.3,hR:1.4,cR:1.2,iM:1.2,ev:-2},
  si:{n:'Sino-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:1,hR:.9,cR:.6,iM:.9,ev:1.5},
  sa:{n:'Sud-Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:2,hR:1.3,cR:1.5,iM:1.2,ev:-1.5},
  af:{n:'Africain / Subsaharien',ow:25,ob:30,tf:88,tm:102,dR:1.3,hR:1.5,cR:1.2,iM:1.3,ev:-1.5},
  ea:{n:'Est-Asiatique',ow:23,ob:27.5,tf:80,tm:88,dR:.9,hR:.9,cR:.7,iM:.9,ev:1.5},
  se:{n:'Sud-Est Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:1.2,hR:1,cR:1,iM:1,ev:0},
  fm:{n:'Franco-Mauricien',ow:25,ob:30,tf:88,tm:102,dR:.8,hR:1,cR:.9,iM:1,ev:1}
};

const COMORB=[
  {id:'dt2',n:'Diabète Type 2',p:14,or:'HR 3.84',d:'IR sévère. Perte espérance vie 8.9 ans.',ca:1.8,gr:.65,cat:'dis'},
  {id:'predmt',n:'Pré-diabète',p:8,or:'HR 2.11',d:'HbA1c 5.7-6.4%. Réversible.',ca:1.2,gr:.82,cat:'dis'},
  {id:'hta',n:'HTA établie',p:10,or:'HR 2.24',d:'Facteur aggravant obésité viscérale.',ca:1.1,gr:0,cat:'dis'},
  {id:'saos',n:'SAOS (Apnée)',p:12,or:'OR 2.19',d:'IR via hypoxie + cortisol nocturne.',ca:1.4,gr:0,cat:'dis'},
  {id:'sopk',n:'SOPK (Femme)',p:14,or:'OR 2.77',d:'Phénotype IR féminin. GLP-1 efficace.',ca:1.2,gr:.83,cat:'dis'},
  {id:'nafld',n:'NAFLD / Stéatose',p:10,or:'OR 3.22',d:'IR hépatique.',ca:1.1,gr:.66,cat:'dis'},
  {id:'hypo',n:'Hypothyroïdie',p:6,or:'OR 1.74',d:'TSH > 4. Métabolisme -10/15%.',ca:1.3,gr:0,cat:'dis'},
  {id:'mets',n:'Syndrome métabolique',p:12,or:'HR 2.64',d:'≥ 3 critères IDF.',ca:1.3,gr:.65,cat:'dis'},
  {id:'monw',n:'Phénotype MONW',p:10,or:'OR 2.38',d:'IMC < 25 mais ≥ 2 critères MetS.',ca:1.1,gr:.70,cat:'phe'},
  {id:'ir_occ',n:'IR occulte',p:8,or:'OR 2.12',d:'TG/HDL > 3.5 non diagnostiqué.',ca:1.2,gr:.55,cat:'phe'},
  {id:'cortis',n:'Corticoïdes > 3 mois',p:8,or:'HR 2.12',d:'Adipogénèse viscérale iatrogène.',ca:1.6,gr:-.47,cat:'tx'},
  {id:'antidep',n:'Antidépresseurs obésogènes',p:4,or:'OR 1.58',d:'Paroxétine/mirtazapine.',ca:1.1,gr:0,cat:'tx'},
  {id:'depres',n:'Dépression traitée',p:6,or:'OR 1.92',d:'Impact métabolique bidirectionnel.',ca:1.2,gr:0,cat:'tx'}
];

const BIO=[
  {id:'homaIR',n:'HOMA-IR',u:'',nm:2.5,ab:4,w:2.5,inv:0,t:5,nr:'< 2.5',ar:'≥ 4.0',l:'Résistance insulinique'},
  {id:'hba1c',n:'HbA1c',u:'%',nm:5.7,ab:6.5,w:2,inv:0,t:5,nr:'< 5.7',ar:'≥ 6.5',l:'Glycémie chronique'},
  {id:'glyc',n:'Glycémie à jeun',u:'mmol/L',nm:5.6,ab:7,w:1.8,inv:0,t:5,nr:'< 5.6',ar:'≥ 7.0',l:'Diabète'},
  {id:'crphs',n:'CRP-hs',u:'mg/L',nm:1,ab:3,w:2,inv:0,t:5,nr:'< 1.0',ar:'≥ 3.0',l:'Inflammation'},
  {id:'tsh',n:'TSH',u:'mUI/L',nm:4,ab:8,w:1.3,inv:0,t:5,nr:'0.4-4.0',ar:'> 4.0',l:'Thyroïde'},
  {id:'ldl',n:'LDL-C',u:'mmol/L',nm:3,ab:4.1,w:1.8,inv:0,t:5,nr:'< 3.0',ar:'≥ 4.1',l:'LDL athérogène'},
  {id:'hdl',n:'HDL-C',u:'mmol/L',nm:1,ab:.7,w:1,inv:1,t:5,nr:'≥ 1.0',ar:'< 0.7',l:'Cardioprotection'},
  {id:'tg',n:'Triglycérides',u:'mmol/L',nm:1.7,ab:2.3,w:1.5,inv:0,t:10,nr:'< 1.7',ar:'≥ 2.3',l:'Dyslipidémie'},
  {id:'adipon',n:'Adiponectine',u:'µg/mL',nm:10,ab:6,w:2.5,inv:1,t:10,nr:'≥ 10',ar:'< 6.0',l:'Métab. adipeux'},
  {id:'asat',n:'ASAT/ALAT',u:'UI/L',nm:40,ab:60,w:1,inv:0,t:10,nr:'< 40',ar:'≥ 60',l:'Foie'},
  {id:'apob',n:'ApoB',u:'g/L',nm:.9,ab:1.2,w:1.5,inv:0,t:10,nr:'< 0.9',ar:'≥ 1.2',l:'Athérogénicité'},
  {id:'ggt',n:'GGT',u:'UI/L',nm:50,ab:80,w:.8,inv:0,t:10,nr:'< 50',ar:'≥ 80',l:'Foie / Alcool'},
  {id:'tghdl',n:'Ratio TG/HDL',u:'',nm:2,ab:3.5,w:2,inv:0,t:15,nr:'< 2.0',ar:'≥ 3.5',l:'IR proxy'},
  {id:'urate',n:'Acide urique',u:'µmol/L',nm:360,ab:420,w:.8,inv:0,t:15,nr:'< 360',ar:'≥ 420',l:'MetS'},
  {id:'leptine',n:'Leptine',u:'ng/mL',nm:20,ab:40,w:1.5,inv:0,t:15,nr:'< 20',ar:'≥ 40',l:'Résistance leptine'}
];

const MK_ST=['Poids normal','Surpoids débutant','Surpoids établi','Surpoids élevé','Obésité modérée','Obésité sévère'];
const MK_B=[[.82,.14,.03,.01,0,0],[.08,.68,.18,.05,.01,0],[.02,.11,.61,.21,.04,.01],[.01,.04,.14,.56,.21,.04],[0,.01,.03,.12,.65,.19],[0,0,.01,.03,.11,.85]];
const MK_CM={dt2:1.4,sopk:1.3,saos:1.25,mets:1.5};
const CTI_G={dur:.185,yoyo:.249,lep:.21,micro:.18,cort:.195,meta:.2,enf:.24};

// ─── GLOBAL STATE ───
let S={
  step:0, dob:'', sexe:'', ethnie:'eu',
  poids:0, taille:0, imc:0, tt:0,
  parent_ob:0, enf_ob:0, diab_par:0, yoyo:0,
  expo:{air:0,water:0,habitat:0,noise:0,pe_diet:0,pe_cosm:0,pe_prof:0,light:0,socio:0,food:0},
  work:{type:0,hours:0,dist:0,mode:0,schedule:0,stress:0,meals:0,posture:0,toxics:0,retire:0},
  alim:{ultra:0,sucre:0,fibres:0,portions:0,repas:0},
  ap:{cardio:60,muscu:0,marche:20}, assis:7,
  sommeil:7, isi:8, tabac:0, alcool_f:0, alcool_q:0,
  stress:14, phq9:5, bes:2,
  comorbIds:[], bioValues:{},
  airQuality:null,
  bmn_c:0, bmn_k:0, bmn_b:0, bmn_t:0, sii:0, cti:0, gri:0
};

// ─── UTILS ───
const $=id=>document.getElementById(id);
const h=(el,html)=>{const e=typeof el==='string'?$(el):el;if(e)e.innerHTML=html;};

function getAge(){
  if(!S.dob)return 0;
  const b=new Date(S.dob),n=new Date();
  let a=n.getFullYear()-b.getFullYear();
  if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;
  return Math.max(0,a);
}

// ════════════════════════════════════════════════════════════════
// FORM BUILDERS
// ════════════════════════════════════════════════════════════════
function getN(key){
  if(key.startsWith('expo_'))return S.expo[key.slice(5)]||0;
  if(key.startsWith('work_'))return S.work[key.slice(5)]||0;
  if(key.startsWith('alim_'))return S.alim[key.slice(5)]||0;
  if(key.startsWith('ap_'))return S.ap[key.slice(3)]||0;
  return S[key]??0;
}
function setN(key,val){
  if(key.startsWith('expo_'))S.expo[key.slice(5)]=val;
  else if(key.startsWith('work_'))S.work[key.slice(5)]=val;
  else if(key.startsWith('alim_'))S.alim[key.slice(5)]=val;
  else if(key.startsWith('ap_'))S.ap[key.slice(3)]=val;
  else S[key]=val;
}

function sel(label,key,opts){
  const cur=getN(key);
  return `<div class="fc"><div class="fc-label">${label}</div>
    <select class="fc-input" onchange="setN('${key}',+this.value)">
    ${opts.map(o=>`<option value="${o[0]}"${cur==o[0]?' selected':''}>${o[1]}</option>`).join('')}
    </select></div>`;
}

function sld(label,key,val,min,max,step,unit){
  return `<div class="fc"><div class="fc-label">${label}</div>
    <div class="sld">
      <div class="sld-big" id="sv_${key}">${val}</div>
      ${unit?`<div class="sld-unit">${unit}</div>`:''}
      <input type="range" min="${min}" max="${max}" value="${val}" step="${step}"
        oninput="setN('${key}',+this.value);$('sv_${key}').textContent=this.value">
      <div class="sld-lbl"><span>${min}</span><span>${max}</span></div>
    </div></div>`;
}

// ════════════════════════════════════════════════════════════════
// SCREEN DEFINITIONS
// ════════════════════════════════════════════════════════════════
const SCR=[

  // ═══ 0: Welcome ═══
  ()=>`<div class="welc">
    <div class="welc-logo">B</div>
    <h1>Score <b>BMN</b> v2.0</h1>
    <p>Évaluation multidimensionnelle du risque d'obésité et stratégie thérapeutique personnalisée</p>
    <div class="welc-tags">
      <span class="welc-tag">8 modules</span>
      <span class="welc-tag">API Air</span>
      <span class="welc-tag">Exposome</span>
      <span class="welc-tag">Markov 10 ans</span>
      <span class="welc-tag">CTI / GRI</span>
    </div>
    <button class="welc-go" onclick="go(1)">Commencer l'évaluation →</button>
  </div>`,

  // ═══ 1: Date de naissance ═══
  ()=>{
    const age=getAge();
    return `<div class="s-emoji">🎂</div>
    <div class="s-title">Date de naissance</div>
    <div class="s-sub">Permet de calculer l'âge et d'adapter les seuils de risque métabolique.</div>
    <div class="fc">
      <div class="fc-label">Votre date de naissance</div>
      <input type="date" class="fc-input" id="inp_dob" value="${S.dob}" onchange="S.dob=this.value;render(S.step,0)">
    </div>
    ${age>0?`<div class="mrow"><div class="mbox" style="grid-column:1/-1">
      <div class="mbox-lbl">Âge calculé</div>
      <div class="mbox-val" style="color:var(--accent)">${age} ans</div>
      <div class="mbox-sub" style="color:var(--dim)">${age<18?'Mineur — seuils pédiatriques':age>=65?'Senior — risque sarcopénique':'Adulte'}</div>
    </div></div>`:''}`},

  // ═══ 2: Sexe ═══
  ()=>{
    const opts=[{v:'f',ico:'♀',t:'Femme',s:'Seuils TT, SOPK, spécificités hormonales'},{v:'m',ico:'♂',t:'Homme',s:'Seuils TT, adiposité viscérale'}];
    return `<div class="s-emoji">⚧</div>
    <div class="s-title">Sexe biologique</div>
    <div class="s-sub">Déterminant pour les seuils anthropométriques et certaines comorbidités.</div>
    <div class="opts">${opts.map(o=>`<div class="opt${S.sexe===o.v?' sel':''}" onclick="S.sexe='${o.v}';render(S.step,0)">
      <div class="opt-ico">${o.ico}</div>
      <div class="opt-txt">${o.t}<small>${o.s}</small></div>
      <div class="opt-chk">${S.sexe===o.v?'✓':''}</div>
    </div>`).join('')}</div>`;
  },

  // ═══ 3: Ethnie ═══
  ()=>{
    const list=Object.entries(ETH).map(([k,v])=>({k,n:v.n,s:`IMC seuil ${v.ow}/${v.ob} · DT2 ×${v.dR}`}));
    return `<div class="s-emoji">🌍</div>
    <div class="s-title">Origine ethnique</div>
    <div class="s-sub">Ajuste les seuils IMC, tour de taille et multiplicateurs de risque (<b>9 groupes × 8 paramètres</b>).</div>
    <div class="opts">${list.map(o=>`<div class="opt${S.ethnie===o.k?' sel':''}" onclick="S.ethnie='${o.k}';render(S.step,0)">
      <div class="opt-txt">${o.n}<small>${o.s}</small></div>
      <div class="opt-chk">${S.ethnie===o.k?'✓':''}</div>
    </div>`).join('')}</div>`;
  },

  // ═══ 4: Poids & Taille ═══
  ()=>{
    const imc=S.taille>0?(S.poids/((S.taille/100)**2)).toFixed(1):'--';
    S.imc=parseFloat(imc)||0;
    const e=ETH[S.ethnie]||ETH.eu;
    let col='var(--green)',lbl='Normal';
    if(S.imc>=e.ob+5){col='var(--red)';lbl='Obésité II+';}
    else if(S.imc>=e.ob){col='var(--orange)';lbl='Obèse';}
    else if(S.imc>=e.ow){col='var(--orange)';lbl='Surpoids';}
    return `<div class="s-emoji">⚖️</div>
    <div class="s-title">Poids & Taille</div>
    <div class="s-sub">L'IMC est calculé en temps réel avec les seuils ethniques de <b>${e.n}</b>.</div>
    <div class="fc">
      <div class="fc-label">Poids (kg)</div>
      <input type="number" class="fc-input" id="inp_p" value="${S.poids||''}" placeholder="Ex: 72" step="0.1" min="30" max="300"
        oninput="S.poids=+this.value;render(S.step,0)">
    </div>
    <div class="fc">
      <div class="fc-label">Taille (cm)</div>
      <input type="number" class="fc-input" id="inp_t" value="${S.taille||''}" placeholder="Ex: 165" min="100" max="230"
        oninput="S.taille=+this.value;render(S.step,0)">
    </div>
    ${S.poids>0&&S.taille>0?`<div class="mrow">
      <div class="mbox"><div class="mbox-lbl">IMC</div><div class="mbox-val" style="color:${col}">${imc}</div><div class="mbox-sub" style="color:${col}">${lbl}</div></div>
      <div class="mbox"><div class="mbox-lbl">Seuil OW</div><div class="mbox-val">${e.ow}</div><div class="mbox-sub" style="color:var(--dim)">Surpoids</div></div>
      <div class="mbox"><div class="mbox-lbl">Seuil OB</div><div class="mbox-val">${e.ob}</div><div class="mbox-sub" style="color:var(--dim)">Obésité</div></div>
    </div>`:''}`},

  // ═══ 5: Tour de taille ═══
  ()=>{
    const e=ETH[S.ethnie]||ETH.eu;
    const seuil=S.sexe==='f'?e.tf:e.tm;
    const whtr=S.taille>0?(S.tt/S.taille).toFixed(3):'--';
    let col='var(--green)',lbl='Normal';
    if(S.tt>seuil+10){col='var(--red)';lbl='Très élevé';}else if(S.tt>seuil){col='var(--orange)';lbl='Élevé';}
    return `<div class="s-emoji">📏</div>
    <div class="s-title">Tour de taille</div>
    <div class="s-sub">Indicateur prioritaire d'obésité viscérale. Seuil ethnique: <b>${seuil} cm</b> (${S.sexe==='f'?'♀':'♂'} ${e.n})</div>
    <div class="fc">
      <div class="sld">
        <div class="sld-big" id="sv_tt">${S.tt||'--'}</div>
        <div class="sld-unit">centimètres</div>
        <input type="range" min="55" max="180" value="${S.tt||80}" step="1"
          oninput="S.tt=+this.value;render(S.step,0)">
        <div class="sld-lbl"><span>55</span><span>${seuil} seuil</span><span>180</span></div>
      </div>
    </div>
    ${S.tt>0?`<div class="mrow">
      <div class="mbox"><div class="mbox-lbl">Tour de taille</div><div class="mbox-val" style="color:${col}">${S.tt}</div><div class="mbox-sub" style="color:${col}">${lbl}</div></div>
      <div class="mbox"><div class="mbox-lbl">WHtR</div><div class="mbox-val" style="color:${parseFloat(whtr)>=.5?'var(--orange)':'var(--green)'}">${whtr}</div><div class="mbox-sub" style="color:var(--dim)">seuil 0.50</div></div>
      <div class="mbox"><div class="mbox-lbl">Seuil ethn.</div><div class="mbox-val">${seuil}</div><div class="mbox-sub" style="color:var(--dim)">${e.n}</div></div>
    </div>`:''}`},

  // ═══ 6: Famille ═══
  ()=>`<div class="s-emoji">👨‍👩‍👧</div>
    <div class="s-title">Histoire familiale</div>
    <div class="s-sub">Antécédents — génétique et épigénétique. Impact majeur sur le risque.</div>
    ${sel('Obésité parentale','parent_ob',[['0','Aucun parent obèse'],['1','1 parent obèse (IMC ≥ 30)'],['2','2 parents obèses (OR 8.42)']])}
    ${sel('Obésité dans l\'enfance (< 12 ans)','enf_ob',[['0','Non'],['1','Surpoids enfant'],['2','Obèse enfant (CTI γ 0.240)']])}
    ${sel('Diabète T2 parental','diab_par',[['0','Non'],['1','1 parent diabétique'],['2','2 parents diabétiques']])}
    ${sel('Cycles Yo-Yo (≥ 3 cycles)','yoyo',[['0','Non (0-2 cycles)'],['1','Oui ≥ 3 cycles (CTI γ 0.249)']])}`,

  // ═══ 7: Qualité de l'air ═══
  ()=>`<div class="s-emoji">🌫️</div>
    <div class="s-title">Qualité de l'air</div>
    <div class="s-sub">API temps réel <b>WAQI</b> — PM2.5, PM10, NO₂, O₃. Impact direct sur l'inflammation systémique.</div>
    <div class="fc">
      <div class="fc-label">Ville de résidence</div>
      <div style="display:flex;gap:8px">
        <input type="text" class="fc-input" id="aqi_city" placeholder="Paris, London, Dubai..." style="flex:1">
        <button class="btn btn-p btn-sm" onclick="doAQI()">🔍</button>
      </div>
      <div style="margin-top:8px">
        <button class="btn-ghost" onclick="doAQIgeo()">📍 Ma position GPS</button>
      </div>
    </div>
    <div id="aqiSt" style="font-size:11px;margin:8px 0;color:var(--dim)"></div>
    <div id="aqiRes"></div>
    ${sel('Score air manuel (si API indisponible)','expo_air',[
      ['-1','— Utiliser API —'],['0','Bon (AQI ≤ 50)'],['2','Modéré (AQI 51-100)'],
      ['4','Malsain sensibles (101-150)'],['6','Malsain (151-200)'],['8','Dangereux (> 200)']])}`,

  // ═══ 8: Exposome environnemental ═══
  ()=>`<div class="s-emoji">🏭</div>
    <div class="s-title">Exposome environnemental</div>
    <div class="s-sub">Eau, habitat, bruit, perturbateurs endocriniens, lumière, facteurs socio-économiques.</div>
    ${sel('Source d\'eau','expo_water',[['0','Eau filtrée / osmose'],['1','Robinet contrôlé'],['2','Bouteille plastique'],['3','Non traitée / puits'],['4','Métaux lourds connus']])}
    ${sel('Proximité route à fort trafic','expo_habitat',[['0','> 500m'],['1','200-500m'],['2','100-200m'],['3','< 100m (PM2.5 +40%)'],['5','Habitation zone industrielle']])}
    ${sel('Bruit nocturne','expo_noise',[['0','Silence (< 40 dB)'],['1','Modéré (40-55 dB)'],['2','Élevé (55-70 dB)'],['4','Très élevé (> 70 dB — ISI +3)']])}
    ${sel('PE alimentaires (plastiques/conserves)','expo_pe_diet',[['0','Verre/inox exclusif'],['1','Plastique occasionnel'],['2','Usage fréquent'],['3','Quotidien (BPA +60%)'],['5','Réchauffage plastique quotidien']])}
    ${sel('PE cosmétiques','expo_pe_cosm',[['0','Bio/naturels'],['1','Conventionnel modéré'],['2','Usage intensif (> 5 prod/j)'],['4','Prod. industriels + teintures']])}
    ${sel('PE professionnels','expo_pe_prof',[['0','Aucune exposition'],['1','Faible (bureau)'],['2','Modérée'],['3','Élevée (industrie)'],['5','Solvants/pesticides quotidiens']])}
    ${sel('Écrans le soir (> 21h)','expo_light',[['0','< 30 min'],['1','30-120 min'],['2','> 2h sans filtre'],['3','> 4h (mélatonine -50%)']])}
    ${sel('Précarité socio-économique','expo_socio',[['0','Aisée'],['1','Classe moyenne'],['2','Modeste'],['3','Précaire'],['5','Grande précarité (insécurité alim.)']])}
    ${sel('Désert alimentaire','expo_food',[['0','Accès facile (< 10 min)'],['1','10-20 min'],['2','> 20 min'],['3','Désert complet'],['4','Désert + fast-food dominant']])}`,

  // ═══ 9: Profil professionnel ═══
  ()=>`<div class="s-emoji">💼</div>
    <div class="s-title">Profil professionnel</div>
    <div class="s-sub">Type de travail, distance, horaires, stress, restauration, retraite — <b>10 dimensions</b>.</div>
    ${sel('Type de travail','work_type',[['0','Très actif (BTP, agricole)'],['1','Actif (debout, soins)'],['2','Mixte'],['3','Sédentaire modéré'],['4','Sédentaire (bureau 6-8h)'],['5','Très sédentaire (> 8h)'],['6','Hyper-sédentaire (télétravail)']])}
    ${sel('Heures / semaine','work_hours',[['0','< 35h'],['1','35-40h'],['2','40-48h'],['3','48-55h'],['4','55-65h'],['5','> 65h']])}
    ${sel('Distance domicile-travail','work_dist',[['0','Télétravail'],['1','< 5 km'],['2','5-15 km'],['3','15-30 km'],['4','30-60 km'],['5','> 60 km']])}
    ${sel('Mode de transport','work_mode',[['0','Marche / vélo'],['1','Transport en commun'],['2','Voiture < 30 min'],['3','Voiture > 30 min']])}
    ${sel('Horaires','work_schedule',[['0','Journée standard'],['1','Décalés'],['2','Nuit occasionnel'],['3','Nuit régulier (OR 1.29)'],['4','Poste 3×8'],['5','Gardes 24h']])}
    ${sel('Stress professionnel (Karasek)','work_stress',[['0','Faible'],['1','Modéré'],['2','Élevé (demande forte / autonomie faible)'],['3','Très élevé'],['4','Harcèlement / burn-out'],['6','Burn-out avec arrêt']])}
    ${sel('Repas du midi','work_meals',[['0','Repas maison équilibré'],['1','Cantine équilibrée'],['2','Cantine déséquilibrée'],['3','Sandwich/fast-food'],['4','Saute le repas'],['5','Grignotage permanent']])}
    ${sel('Posture dominante','work_posture',[['0','Debout dynamique'],['1','Alternance assis/debout'],['2','Assis avec pauses'],['3','Assis prolongé > 4h'],['4','Assis > 6h sans pause']])}
    ${sel('Exposition toxiques professionnels','work_toxics',[['0','Aucune'],['1','Faible'],['2','Modérée'],['3','Élevée (industrie)'],['4','Solvants'],['5','Radiations / pesticides']])}
    ${sel('Retraite','work_retire',[['0','Non concerné'],['1','Retraite active (AP maintenue)'],['2','Sédentaire modérée'],['3','Sédentaire + prise de poids'],['4','Isolement social'],['5','Isolement + dépression']])}`,

  // ═══ 10: Alimentation ═══
  ()=>`<div class="s-emoji">🥗</div>
    <div class="s-title">Alimentation</div>
    <div class="s-sub">DQI-BMN — 5 dimensions nutritionnelles. Score élevé = mauvaise qualité alimentaire.</div>
    ${sel('Ultra-transformés (AUT)','alim_ultra',[['0','Rarement (< 1×/sem)'],['1','2-3×/sem'],['2','4-6×/sem (SII+)'],['3','Quotidien']])}
    ${sel('Boissons sucrées','alim_sucre',[['0','Jamais / eau uniquement'],['1','< 2×/sem'],['2','3-5×/sem'],['3','Quotidien']])}
    ${sel('Fruits & légumes (portions/jour)','alim_fibres',[['0','≥ 5 portions (optimal)'],['1','3-4 portions'],['2','1-2 portions'],['3','< 1 portion']])}
    ${sel('Taille des portions','alim_portions',[['0','Normales'],['1','Légèrement excessives'],['2','Excessives'],['3','Très excessives']])}
    ${sel('Structure des repas','alim_repas',[['0','3 repas structurés'],['1','Irréguliers'],['2','Saute 1 repas + grignotage'],['3','Désorganisé']])}`,

  // ═══ 11: Activité physique ═══
  ()=>`<div class="s-emoji">🏃</div>
    <div class="s-title">Activité physique</div>
    <div class="s-sub">IPAQ détaillé par type. OMS recommande <b>≥ 150 min/semaine</b> modérée.</div>
    ${sld('Cardio','ap_cardio',S.ap.cardio,0,300,10,'min/semaine')}
    ${sld('Renforcement musculaire','ap_muscu',S.ap.muscu,0,180,10,'min/semaine')}
    ${sld('Marche quotidienne','ap_marche',S.ap.marche,0,120,5,'min/jour')}
    ${sld('Temps assis total','assis',S.assis,1,16,.5,'heures/jour')}`,

  // ═══ 12: Sommeil & substances ═══
  ()=>`<div class="s-emoji">😴</div>
    <div class="s-title">Sommeil & substances</div>
    <div class="s-sub">Durée, qualité (ISI), tabac et alcool — 4 axes de risque.</div>
    ${sld('Durée de sommeil','sommeil',S.sommeil,3,12,.5,'heures/nuit')}
    ${sld('Score ISI (insomnie, 0-28)','isi',S.isi,0,28,1,'')}
    ${sel('Tabac','tabac',[['0','Jamais fumé'],['1','Ex-fumeur > 1 an'],['2','Ex-fumeur < 1 an'],['3','Fumeur < 10 cig/j'],['4','Fumeur ≥ 10 cig/j (SII+)']])}
    ${sel('Alcool: fréquence','alcool_f',[['0','Jamais'],['1','2-4×/mois'],['2','2-3×/sem'],['3','4+ ×/sem']])}
    ${sel('Alcool: quantité/occasion','alcool_q',[['0','1-2 verres'],['1','3-4'],['2','5-6'],['3','7-9'],['4','≥ 10']])}`,

  // ═══ 13: Santé mentale ═══
  ()=>`<div class="s-emoji">🧠</div>
    <div class="s-title">Santé mentale</div>
    <div class="s-sub">Stress perçu (PSS-10), dépression (PHQ-9), hyperphagie (BES). Axe bidirectionnel avec l'obésité.</div>
    ${sld('Stress PSS-10','stress',S.stress,0,40,1,'/ 40')}
    ${sld('Dépression PHQ-9','phq9',S.phq9,0,27,1,'/ 27')}
    ${sld('Hyperphagie BES','bes',S.bes,0,8,1,'/ 8')}`,

  // ═══ 14: Comorbidités ═══
  ()=>{
    const dis=COMORB.filter(c=>c.cat==='dis');
    const phe=COMORB.filter(c=>c.cat==='phe');
    const tx=COMORB.filter(c=>c.cat==='tx');
    const mk=arr=>arr.map(c=>`<div class="cm-card${S.comorbIds.includes(c.id)?' on':''}" onclick="toggleCM('${c.id}')">
      <div class="cm-top"><span class="cm-nm">${c.n}</span><span class="cm-pts">+${c.p}</span></div>
      <div class="cm-desc">${c.or} — ${c.d}</div></div>`).join('');
    return `<div class="s-emoji">🏥</div>
    <div class="s-title">Comorbidités</div>
    <div class="s-sub">BMN-K: <b>11 comorbidités + phénotypes + traitements</b>. Comorbidity Floor si K > 30.</div>
    <div class="sec"><div class="sec-tt">Maladies établies</div>${mk(dis)}</div>
    <div class="sec"><div class="sec-tt">Phénotypes métaboliques</div>${mk(phe)}</div>
    <div class="sec"><div class="sec-tt">Traitements aggravants</div>${mk(tx)}</div>`;
  },

  // ═══ 15: Biologie ═══
  ()=>{
    calc();
    const pl=getPanelLvl();
    const markers=BIO.filter(m=>m.t<=Math.max(5,pl));
    return `<div class="s-emoji">🔬</div>
    <div class="s-title">Résultats biologiques</div>
    <div class="s-sub">Panel Tier ${pl<=5?'2A':pl<=10?'2B':'2C'} — <b>${markers.length} biomarqueurs</b>. Laissez vide si non disponible.</div>
    <div class="fc">${markers.map(m=>`<div class="bio-row">
      <div class="bio-inf"><div class="bio-nm">${m.n}${m.u?' ('+m.u+')':''}</div><div class="bio-rg">${m.nr} | ${m.ar}</div></div>
      <input type="number" class="bio-inp" id="bio_${m.id}" value="${S.bioValues[m.id]??''}" step="0.01" placeholder="--"
        oninput="S.bioValues['${m.id}']=this.value===''?undefined:+this.value;calc();doRetro()">
      <span class="bio-tier" style="background:${m.t<=5?'var(--red-bg);color:var(--red)':m.t<=10?'var(--orange-bg);color:var(--orange)':'var(--accent-bg);color:var(--accent)'}">${m.t<=5?'2A':m.t<=10?'2B':'2C'}</span>
    </div>`).join('')}</div>
    <div id="retro"></div>`;
  },

  // ═══ 16: Résultat final ═══
  ()=>{calc();return renderFinal();}
];

const NTOT=SCR.length;

const SECTIONS=[
  {from:0,to:0,name:'Accueil',ico:'🏠'},
  {from:1,to:3,name:'Identité',ico:'👤'},
  {from:4,to:5,name:'Anthropométrie',ico:'📐'},
  {from:6,to:6,name:'Famille',ico:'🧬'},
  {from:7,to:8,name:'Exposome',ico:'🌍'},
  {from:9,to:9,name:'Travail',ico:'💼'},
  {from:10,to:11,name:'Mode de vie',ico:'🍎'},
  {from:12,to:13,name:'Santé',ico:'🧠'},
  {from:14,to:14,name:'Comorbidités',ico:'🏥'},
  {from:15,to:15,name:'Biologie',ico:'🔬'},
  {from:16,to:16,name:'Résultat',ico:'📊'}
];

function getSec(step){return SECTIONS.find(s=>step>=s.from&&step<=s.to)||SECTIONS[0];}

// ════════════════════════════════════════════════════════════════
// COMORBIDITY TOGGLE
// ════════════════════════════════════════════════════════════════
function toggleCM(id){
  if(S.comorbIds.includes(id))S.comorbIds=S.comorbIds.filter(x=>x!==id);
  else S.comorbIds.push(id);
  render(S.step,0);
}

// ════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════
let curEl=null;

function go(step,dir){
  if(step<0||step>=NTOT)return;
  if(dir===undefined)dir=step>S.step?1:step<S.step?-1:0;
  S.step=step;
  calc();
  render(step,dir);
}

function render(step,dir){
  const wrap=$('scrWrap');
  if(!wrap)return;

  const html=SCR[step]();
  const el=document.createElement('div');
  el.className='scr'+(dir>0?' in-r':dir<0?' in-l':'');
  el.innerHTML=html;

  if(curEl&&dir!==0){
    curEl.className='scr'+(dir>0?' out-l':' out-r');
    const old=curEl;
    setTimeout(()=>old.remove(),320);
  }else if(curEl){
    curEl.remove();
  }
  wrap.appendChild(el);
  curEl=el;

  // Header
  const sec=getSec(step);
  h('hdrSec',sec.ico+' '+sec.name);
  h('hdrStep',`Étape ${step}/${NTOT-1}`);

  // Progress
  const pf=$('pgFill');
  if(pf)pf.style.width=(step/(NTOT-1)*100)+'%';

  // Score badge
  updateBadge();

  // Nav buttons
  renderNav(step);

  // Retro for bio
  if(step===15)setTimeout(doRetro,60);
}

function renderNav(step){
  const nav=$('bNav');
  if(!nav)return;
  if(step===0){nav.innerHTML='';return;}
  const last=step===NTOT-1;
  nav.innerHTML=`
    <button class="btn btn-s" onclick="go(${step-1},-1)">← Retour</button>
    ${last?`<button class="btn btn-d" onclick="resetAll()">🔄</button>
      <button class="btn btn-p" style="flex:none;padding:15px 18px" onclick="window.print()">🖨️</button>`
    :`<button class="btn btn-p" onclick="go(${step+1},1)">Suivant →</button>`}`;
}

function updateBadge(){
  const el=$('hdrScore');
  if(!el)return;
  if(S.step<2){el.textContent='';el.style.display='none';return;}
  calc();
  el.style.display='';
  el.textContent=`C:${S.bmn_c} K:${S.bmn_k}${S.bmn_b>0?' B:'+S.bmn_b:''}`;
}

// ════════════════════════════════════════════════════════════════
// AQI API
// ════════════════════════════════════════════════════════════════
async function doAQI(){
  const city=$('aqi_city')?.value;
  if(!city){h('aqiSt','<span style="color:var(--orange)">Entrez une ville.</span>');return;}
  h('aqiSt','⏳ Recherche…');
  try{
    const r=await fetch('https://api.waqi.info/feed/'+encodeURIComponent(city)+'/?token=demo');
    const d=await r.json();
    if(d.status==='ok'&&d.data&&typeof d.data.aqi==='number')procAQI(d.data,city);
    else h('aqiSt','<span style="color:var(--orange)">Ville non trouvée. Essayez: Paris, London, Dubai.</span>');
  }catch(e){h('aqiSt','<span style="color:var(--red)">Erreur: '+e.message+'</span>');}
}
async function doAQIgeo(){
  if(!navigator.geolocation){h('aqiSt','GPS non disponible.');return;}
  h('aqiSt','📍 Localisation…');
  navigator.geolocation.getCurrentPosition(async p=>{
    try{
      const r=await fetch('https://api.waqi.info/feed/geo:'+p.coords.latitude+';'+p.coords.longitude+'/?token=demo');
      const d=await r.json();
      if(d.status==='ok'&&d.data)procAQI(d.data,'GPS');
      else h('aqiSt','Pas de station à proximité.');
    }catch(e){h('aqiSt','Erreur: '+e.message);}
  },()=>h('aqiSt','Permission refusée.'));
}

function procAQI(data,fb){
  S.airQuality={aqi:data.aqi,city:data.city?.name||fb,pm25:data.iaqi?.pm25?.v??null,pm10:data.iaqi?.pm10?.v??null,no2:data.iaqi?.no2?.v??null,o3:data.iaqi?.o3?.v??null,so2:data.iaqi?.so2?.v??null,co:data.iaqi?.co?.v??null,time:data.time?.s||''};
  const aqi=data.aqi;
  let risk=0;if(aqi>200)risk=8;else if(aqi>150)risk=6;else if(aqi>100)risk=4;else if(aqi>50)risk=2;
  S.expo.air=risk;
  renderAQI();h('aqiSt','');
}

function renderAQI(){
  const aq=S.airQuality;if(!aq)return;
  const aqi=aq.aqi;
  let lv,c,bg;
  if(aqi<=50){lv='Bon';c='var(--green)';bg='var(--green-bg)';}
  else if(aqi<=100){lv='Modéré';c='var(--orange)';bg='var(--orange-bg)';}
  else if(aqi<=150){lv='Malsain sensibles';c='var(--orange)';bg='var(--orange-bg)';}
  else if(aqi<=200){lv='Malsain';c='var(--red)';bg='var(--red-bg)';}
  else{lv='Dangereux';c='var(--purple)';bg='var(--purple-bg)';}
  const pols=[{k:'pm25',l:'PM2.5'},{k:'pm10',l:'PM10'},{k:'no2',l:'NO₂'},{k:'o3',l:'O₃'},{k:'so2',l:'SO₂'},{k:'co',l:'CO'}].filter(p=>aq[p.k]!==null);
  h('aqiRes',`<div class="aqi-box" style="background:${bg};border-color:${c}">
    <div class="aqi-hd"><div><div class="aqi-city" style="color:${c}">${aq.city}</div><div style="font-size:9px;color:var(--dim)">${aq.time}</div></div>
      <div style="text-align:right"><div class="aqi-num" style="color:${c}">${aqi}</div><div class="aqi-lv" style="color:${c}">${lv}</div></div></div>
    ${pols.length?`<div class="aqi-grid">${pols.map(p=>`<div class="aqi-pol"><div class="aqi-pol-l">${p.l}</div><div class="aqi-pol-v" style="color:${c}">${aq[p.k]}</div></div>`).join('')}</div>`:''}
    <div class="aqi-imp" style="color:${c}">Impact BMN: +${S.expo.air}/8 pts exposome</div></div>`);
}

// ════════════════════════════════════════════════════════════════
// CALCULATION ENGINE
// ════════════════════════════════════════════════════════════════
function calc(){
  const e=ETH[S.ethnie]||ETH.eu;
  const sex=S.sexe;
  const imc=S.imc;
  const tt=S.tt;
  const taille=S.taille;
  const whtr=taille>0?tt/taille:0;
  const ttSeuil=sex==='f'?e.tf:e.tm;
  let c=0;

  // IMC (0-10)
  if(imc>=e.ob+5)c+=10;else if(imc>=e.ob)c+=6;else if(imc>=e.ow)c+=3;
  // TT (0-15)
  if(tt>ttSeuil+10)c+=15;else if(tt>ttSeuil+5)c+=11;else if(tt>ttSeuil)c+=7;
  // WHtR (0-9)
  if(whtr>=.6)c+=9;else if(whtr>=.55)c+=6;else if(whtr>=.5)c+=3;
  // Family (0-25)
  if(S.parent_ob>=2)c+=10;else if(S.parent_ob>=1)c+=8;
  if(S.enf_ob>=2)c+=10;else if(S.enf_ob>=1)c+=6;
  if(S.diab_par>=2)c+=5;else if(S.diab_par>=1)c+=3;
  // Alim (0-15)
  const alimT=Math.min(15,S.alim.ultra+S.alim.sucre+S.alim.fibres+S.alim.portions+S.alim.repas);
  c+=alimT;
  // AP (0-9)
  const apT=S.ap.cardio+S.ap.muscu+S.ap.marche*3.5;
  if(apT<30)c+=9;else if(apT<75)c+=6;else if(apT<150)c+=3;
  // Assis (0-9)
  if(S.assis>=10)c+=9;else if(S.assis>=8)c+=6;else if(S.assis>=6)c+=3;
  // Sommeil (0-7)
  if(S.sommeil<5||S.sommeil>10)c+=7;else if(S.sommeil<6||S.sommeil>9)c+=4;else if(S.sommeil<7)c+=2;
  // ISI (0-8)
  if(S.isi>=22)c+=8;else if(S.isi>=15)c+=6;else if(S.isi>=8)c+=3;
  // Tabac (0-8)
  if(S.tabac==4)c+=8;else if(S.tabac==3)c+=5;else if(S.tabac==2)c+=6;else if(S.tabac==1)c+=1;
  // Alcool (0-5)
  c+=Math.min(5,S.alcool_f+S.alcool_q);
  // Mental
  const sr=S.stress/40;
  if(sr>=.6)c+=10;else if(sr>=.4)c+=7;else if(sr>=.25)c+=4;
  if(S.phq9>=20)c+=10;else if(S.phq9>=15)c+=7;else if(S.phq9>=10)c+=5;else if(S.phq9>=5)c+=2;
  if(S.bes>=6)c+=8;else if(S.bes>=4)c+=5;else if(S.bes>=2)c+=2;
  if(S.yoyo>=1)c+=5;

  // Exposome (0-15 normalized)
  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  c+=Math.round(expoT*15/47);
  // Work (0-15 normalized)
  const workT=Object.values(S.work).reduce((a,b)=>a+b,0);
  c+=Math.round(workT*15/57);

  // Ethnic modifier
  c=Math.round(c*(1+e.ev/100));

  S.bmn_c=Math.min(150,c);

  // SII
  let sii=0;
  if(sr>=.35)sii++;if(apT<75)sii++;if(imc>=e.ob)sii++;if(S.tabac>=3)sii++;
  if(alimT>=10)sii++;if(S.isi>=15)sii++;if(tt>ttSeuil)sii++;
  if(expoT>=20)sii++;if(workT>=25)sii++;
  S.sii=sii;

  // BMN-K
  let k=0,ctiA=1,griT=0;
  S.comorbIds.forEach(id=>{
    const cm=COMORB.find(x=>x.id===id);
    if(cm){k+=cm.p;ctiA=Math.max(ctiA,cm.ca);griT+=cm.gr;}
  });
  S.bmn_k=Math.min(50,k);

  // CTI
  let ctiR=0;
  ctiR+=CTI_G.dur*(S.bmn_c>100?1:S.bmn_c>70?.7:S.bmn_c>40?.4:.1);
  ctiR+=CTI_G.yoyo*(S.yoyo>=1?1:0);
  const lepP=Math.min(1,(imc>35?1:imc>30?.6:imc>27.5?.3:0)+(S.comorbIds.includes('saos')?.3:0));
  ctiR+=CTI_G.lep*lepP;
  ctiR+=CTI_G.micro*Math.min(1,alimT/6);
  ctiR+=CTI_G.cort*Math.min(1,sr*.4+S.isi/28*.3+(S.work.schedule||0)/5*.3);
  ctiR+=CTI_G.meta*Math.min(1,(S.comorbIds.includes('hypo')?.6:0)+(S.yoyo>=1?.4:0));
  ctiR+=CTI_G.enf*(S.enf_ob>=2?1:S.enf_ob>=1?.5:0);
  const expoAmp=expoT>30?1.15:expoT>20?1.05:1;
  S.cti=Math.min(100,Math.round(ctiR/1.459*100*ctiA*expoAmp));

  // GRI
  let gri=griT;
  if(S.bioValues.homaIR>2.5)gri+=1.07;
  if(S.bioValues.adipon<6)gri+=.62;
  if(S.bioValues.tghdl>3.5)gri+=.55;
  if(S.cti>55)gri-=.65;
  if(S.comorbIds.includes('cortis'))gri-=.35;
  if(imc>40&&!S.comorbIds.includes('mets')&&!S.comorbIds.includes('dt2'))gri-=.47;
  if(sr>=.6)gri-=.28;
  S.gri=Math.max(-2,Math.min(5,gri));

  // BMN-B
  let swz=0,sw=0;
  BIO.forEach(m=>{
    const v=S.bioValues[m.id];if(v===undefined)return;
    let z;
    if(!m.inv){z=v<=m.nm?0:v>=m.ab?1:(v-m.nm)/(m.ab-m.nm);}
    else{z=v>=m.nm?0:v<=m.ab?1:(m.nm-v)/(m.nm-m.ab);}
    swz+=z*m.w;sw+=m.w;
  });
  S.bmn_b=sw>0?Math.round(swz/sw*100):0;

  // BMN-T
  const cN=(S.bmn_c/150)*100,kN=(S.bmn_k/50)*100,bN=S.bmn_b;
  const gap=bN-cN;
  let wB,wC,wK=.15;
  if(gap<=20){wB=.30;wC=.55;}else{const ex=Math.min(.30,(gap-20)/100*.60);wB=.30+ex;wC=Math.max(.25,.55-ex*.75);}
  const s2=wB+wC+wK;wB/=s2;wC/=s2;wK/=s2;
  let t=wC*cN+wB*bN+wK*kN;
  if(bN>0&&t<bN*.75)t=bN*.75;
  if(bN>90)t=Math.max(t,Math.max(80,bN*.85));else if(bN>80)t=Math.max(t,bN*.85);
  if(k>30&&t<40)t=Math.max(40,kN*.80);
  if(S.bioValues.hba1c>=6.5&&t<60)t=60;
  S.bmn_t=Math.min(200,Math.round(t*2));
}

function getPanelLvl(){
  const comp=Math.min(200,S.bmn_c+S.bmn_k*1.5);
  if(comp<50)return S.sii>=2?5:0;if(comp<100)return 10;return 15;
}

function getClass(s){
  if(s<=40)return{l:'FAIBLE',c:'var(--green)',bg:'var(--green-bg)',p:'< 8%'};
  if(s<=80)return{l:'MODÉRÉ',c:'var(--orange)',bg:'var(--orange-bg)',p:'8-22%'};
  if(s<=120)return{l:'ÉLEVÉ',c:'var(--orange)',bg:'var(--orange-bg)',p:'22-47%'};
  if(s<=160)return{l:'TRÈS ÉLEVÉ',c:'var(--red)',bg:'var(--red-bg)',p:'47-71%'};
  return{l:'CRITIQUE',c:'var(--purple)',bg:'var(--purple-bg)',p:'> 71%'};
}

function calcMarkov(){
  const bT=S.bmn_t,kN=(S.bmn_k/50)*100,imc=S.imc,e=ETH[S.ethnie]||ETH.eu;
  let cs=imc>=35?5:imc>=30?4:imc>=27.5?3:imc>=e.ow?2:imc>=e.ow-2?1:0;
  const rf=Math.exp(.68*bT/200)*Math.exp(.35*kN/100);
  let cm=1;S.comorbIds.forEach(id=>{if(MK_CM[id])cm=Math.max(cm,MK_CM[id]);});
  let prob=[0,0,0,0,0,0];prob[cs]=1;
  for(let y=0;y<10;y++){
    const np=[0,0,0,0,0,0];
    for(let i=0;i<6;i++){
      if(prob[i]<.001)continue;
      const row=MK_B[i].slice();
      for(let j=i+1;j<6;j++)row[j]*=rf*cm;
      for(let j=0;j<i;j++)row[j]/=rf;
      const rt=row.reduce((a,b)=>a+b,0);
      for(let j=0;j<6;j++)np[j]+=prob[i]*(row[j]/rt);
    }
    prob=np;
  }
  return{cs,prob};
}

// ─── RETRO-VALIDATION ───
function doRetro(){
  const v=S.bioValues,fl=[];
  if(v.homaIR>=4&&!S.comorbIds.includes('dt2')&&!S.comorbIds.includes('predmt'))
    fl.push({c:'var(--red)',bg:'var(--red-bg)',t:'HOMA-IR ≥ 4 non déclaré → IR sévère. Force BMN-K.'});
  if(v.hba1c>=5.7&&v.hba1c<6.5&&!S.comorbIds.includes('predmt'))
    fl.push({c:'var(--orange)',bg:'var(--orange-bg)',t:'HbA1c '+v.hba1c+'% → Pré-diabète biologique.'});
  if(v.hba1c>=6.5&&!S.comorbIds.includes('dt2'))
    fl.push({c:'var(--red)',bg:'var(--red-bg)',t:'HbA1c '+v.hba1c+'% → DIABÈTE T2. BMN-T plancher 60.'});
  if(v.asat>60&&v.ggt>50&&v.tg>1.7)
    fl.push({c:'var(--orange)',bg:'var(--orange-bg)',t:'ASAT>60 + GGT>50 + TG>1.7 → NAFLD probable.'});
  if(v.tghdl>3.5&&v.adipon<6&&v.homaIR>2.5)
    fl.push({c:'var(--orange)',bg:'var(--orange-bg)',t:'Triade IR occulte détectée.'});
  if(v.ggt>100&&v.asat>60)
    fl.push({c:'var(--red)',bg:'var(--red-bg)',t:'GGT>100 + ASAT>60 → Pattern hépatique (alcool?).'});

  const el=$('retro');if(!el)return;
  el.innerHTML=fl.length
    ?fl.map(f=>`<div class="alrt" style="background:${f.bg};border-left:3px solid ${f.c}"><div class="alrt-ico">⚠️</div><div class="alrt-txt" style="color:${f.c}">${f.t}</div></div>`).join('')
    :'<div class="alrt" style="background:var(--green-bg);border-left:3px solid var(--green)"><div class="alrt-ico">✅</div><div class="alrt-txt" style="color:var(--green)">Rétrovalidation OK — Aucune incohérence.</div></div>';
}

// ════════════════════════════════════════════════════════════════
// FINAL RESULT
// ════════════════════════════════════════════════════════════════
function renderFinal(){
  const t=S.bmn_t,cls=getClass(t),mk=calcMarkov();
  const cti=S.cti,gri=S.gri;
  const colors=['var(--green)','var(--teal)','var(--orange)','var(--orange)','var(--red)','var(--purple)'];
  const pObes=((mk.prob[4]+mk.prob[5])*100).toFixed(1);
  const age=getAge();

  let r=`<div class="res-hero" style="background:${cls.bg}">
    <div class="res-num" style="color:${cls.c}">${t}<span class="res-max">/200</span></div>
    <div class="res-lv" style="color:${cls.c}">${cls.l}</div>
    <div class="res-pr" style="color:${cls.c}">P(obésité 10 ans): ${cls.p}</div>
  </div>`;

  // Summary grid
  r+=`<div class="res-grid">
    <div class="res-item"><div class="res-item-l">BMN-C</div><div class="res-item-v" style="color:var(--accent)">${S.bmn_c}</div><div class="res-item-s">/150</div></div>
    <div class="res-item"><div class="res-item-l">BMN-K</div><div class="res-item-v" style="color:var(--red)">${S.bmn_k}</div><div class="res-item-s">/50</div></div>
    <div class="res-item"><div class="res-item-l">BMN-B</div><div class="res-item-v" style="color:var(--green)">${S.bmn_b||'—'}</div><div class="res-item-s">/100</div></div>
    <div class="res-item"><div class="res-item-l">CTI</div><div class="res-item-v" style="color:${cti>55?'var(--red)':cti>40?'var(--orange)':'var(--teal)'}">${cti}</div><div class="res-item-s">${cti<20?'Ouvert':cti<40?'Début':cti<55?'Avancé':'Fermé'}</div></div>
    <div class="res-item"><div class="res-item-l">GRI</div><div class="res-item-v" style="color:${gri>=1.5?'var(--green)':'var(--dim)'}">${gri.toFixed(1)}</div><div class="res-item-s">${gri>=2.5?'Excellent':gri>=1.5?'Bon':gri>=.5?'Modéré':'Faible'}</div></div>
    <div class="res-item"><div class="res-item-l">SII</div><div class="res-item-v" style="color:${S.sii>=4?'var(--red)':S.sii>=2?'var(--orange)':'var(--green)'}">${S.sii}</div><div class="res-item-s">/9</div></div>
  </div>`;

  // Patient info
  if(age>0||S.sexe){
    r+=`<div class="sec"><div class="sec-tt">Patient</div>
      <div style="padding:12px;background:var(--surf);border-radius:var(--r2);display:flex;flex-wrap:wrap;gap:8px;border:1px solid var(--border)">
        ${age>0?`<span class="badge badge-ok">${age} ans</span>`:''}
        ${S.sexe?`<span class="badge badge-ok">${S.sexe==='f'?'♀ Femme':'♂ Homme'}</span>`:''}
        <span class="badge badge-ok">${(ETH[S.ethnie]||ETH.eu).n}</span>
        ${S.imc>0?`<span class="badge ${S.imc>=30?'badge-err':S.imc>=25?'badge-warn':'badge-ok'}">IMC ${S.imc.toFixed(1)}</span>`:''}
        ${S.tt>0?`<span class="badge ${S.tt>(S.sexe==='f'?(ETH[S.ethnie]||ETH.eu).tf:(ETH[S.ethnie]||ETH.eu).tm)?'badge-warn':'badge-ok'}">TT ${S.tt} cm</span>`:''}
      </div></div>`;
  }

  // Markov
  r+=`<div class="sec"><div class="sec-tt">Projection Markov 10 ans</div>`;
  mk.prob.forEach((p,i)=>{
    const pct=(p*100).toFixed(1);
    r+=`<div class="mk-row"><div class="mk-lbl" style="color:${colors[i]}">${MK_ST[i]}${i===mk.cs?' ◀':''}</div>
      <div class="mk-bar"><div class="mk-fill" style="width:${pct}%;background:${colors[i]}"></div></div>
      <div class="mk-pct" style="color:${colors[i]}">${pct}%</div></div>`;
  });
  r+=`<div style="text-align:center;margin-top:10px;font-size:12px;color:var(--red);font-weight:700">P(obésité) = ${pObes}%</div></div>`;

  // Exposome & Work recap
  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  const workT=Object.values(S.work).reduce((a,b)=>a+b,0);
  r+=`<div class="sec"><div class="sec-tt">Scores environnementaux</div>
    <div class="mrow" style="grid-template-columns:1fr 1fr">
      <div class="mbox"><div class="mbox-lbl">Exposome</div><div class="mbox-val" style="color:${expoT>=25?'var(--red)':expoT>=15?'var(--orange)':'var(--green)'}">${expoT}</div><div class="mbox-sub" style="color:var(--dim)">/47</div></div>
      <div class="mbox"><div class="mbox-lbl">Professionnel</div><div class="mbox-val" style="color:${workT>=25?'var(--red)':workT>=15?'var(--orange)':'var(--green)'}">${workT}</div><div class="mbox-sub" style="color:var(--dim)">/57</div></div>
    </div></div>`;

  // AQI recap
  if(S.airQuality){
    r+=`<div class="sec"><div class="sec-tt">Qualité de l'air</div>
      <div style="padding:12px;background:var(--surf);border-radius:var(--r2);display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border)">
        <div><div style="font-size:11px;font-weight:700">${S.airQuality.city}</div><div style="font-size:9px;color:var(--dim)">PM2.5: ${S.airQuality.pm25??'—'} · NO₂: ${S.airQuality.no2??'—'}</div></div>
        <div style="font-family:var(--mono);font-size:28px;font-weight:900;color:var(--accent)">${S.airQuality.aqi}</div></div></div>`;
  }

  // Strategy
  r+=`<div class="sec"><div class="sec-tt">Stratégie thérapeutique</div>`;
  const strats=getStrats(t,cls.l,cti,gri);
  strats.forEach(s=>{
    r+=`<div class="str-card" style="background:${s.bg};border-color:${s.c}">
      <div class="str-tt" style="color:${s.c}">${s.ico} ${s.title}</div>
      <div class="str-desc">${s.desc}</div>
      ${s.items?`<ul class="str-list">${s.items.map(i=>'<li>'+i+'</li>').join('')}</ul>`:''}</div>`;
  });
  r+=`</div>`;

  r+=`<div style="text-align:center;padding:24px 0;font-size:9px;color:var(--dim3);line-height:1.6">
    Score BMN v2.0 — Architecture ABCKO+<br>
    8 modules · API Air · Exposome · Markov · CTI · GRI<br>
    Bach — Manos — Noël</div>`;
  return r;
}

function getStrats(t,level,cti,gri){
  const b=[];
  if(level==='FAIBLE'){
    b.push({c:'var(--green)',bg:'var(--green-bg)',ico:'✅',title:'Surveillance Standard',desc:'Réévaluation dans 3 ans.',items:['Alimentation méditerranéenne','AP ≥ 150 min/sem','Réduire exposome si score élevé']});
  }else if(level==='MODÉRÉ'){
    b.push({c:'var(--orange)',bg:'var(--orange-bg)',ico:'📋',title:'Programme Lifestyle',desc:'Objectif BMN-C -20% en 6 mois.',items:['Diététicienne mensuelle','AP progressive 150-300 min','Gestion stress professionnel','Réduction ultra-transformés']});
  }else if(level==='ÉLEVÉ'){
    b.push({c:'var(--orange)',bg:'var(--orange-bg)',ico:'⚡',title:'Programme Intensif',desc:'Suivi trimestriel multidisciplinaire.',items:['AP supervisée + coaching','Restriction -500 kcal/j','Aménagement poste travail','Suivi psychologique']});
    if(gri>=1.5)b.push({c:'var(--green)',bg:'var(--green-bg)',ico:'💉',title:'GLP-1 agoniste (GRI '+gri.toFixed(1)+')',desc:'Sémaglutide titration 16 semaines.',items:['Objectif ≥ 10% perte pondérale','Monitoring glycémique','Réévaluation à 6 mois']});
  }else{
    b.push({c:'var(--red)',bg:'var(--red-bg)',ico:'🚨',title:'URGENCE — '+level,desc:'RDV endocrinologie sous 2 semaines.',items:['Panel Tier 2C/2D complet','GLP-1 agoniste prioritaire','Évaluation chirurgie si CTI > 55','Prise en charge psychiatrique si PHQ-9 > 15']});
  }
  if(cti>55)b.push({c:'var(--purple)',bg:'var(--purple-bg)',ico:'🩹',title:'Chirurgie bariatrique',desc:'CTI '+cti+' — Fenêtre thérapeutique fermée.',items:['Sleeve / Bypass gastrique','Évaluation psychologique pré-op','Suivi nutritionnel 5 ans']});

  const expoT=Object.values(S.expo).reduce((a,b)=>a+b,0);
  if(expoT>=20)b.push({c:'var(--teal)',bg:'var(--teal-bg)',ico:'🌍',title:'Réduction Exposome',desc:'Score '+expoT+'/47.',items:['Filtration air si AQI > 100','Verre/inox au lieu de plastique','Cosmétiques bio','Réduction écrans nocturnes']});
  const workT=Object.values(S.work).reduce((a,b)=>a+b,0);
  if(workT>=20)b.push({c:'var(--teal)',bg:'var(--teal-bg)',ico:'💼',title:'Adaptation Professionnelle',desc:'Score '+workT+'/57.',items:['Bureau debout si sédentaire','Pause active toutes les 2h','Repas structuré le midi','Aménagement horaires si nuit']});
  return b;
}

// ═══ RESET ═══
function resetAll(){
  if(!confirm('Réinitialiser toutes les données ?'))return;
  location.reload();
}

// ════════════════════════════════════════════════════════════════
// TOUCH SWIPE SUPPORT
// ════════════════════════════════════════════════════════════════
let touchX=0,touchY=0,swiping=false;
function initSwipe(){
  const wrap=$('scrWrap');
  if(!wrap)return;
  wrap.addEventListener('touchstart',e=>{
    touchX=e.touches[0].clientX;
    touchY=e.touches[0].clientY;
    swiping=true;
  },{passive:true});
  wrap.addEventListener('touchend',e=>{
    if(!swiping)return;swiping=false;
    const dx=e.changedTouches[0].clientX-touchX;
    const dy=e.changedTouches[0].clientY-touchY;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){
      if(dx<0&&S.step<NTOT-1)go(S.step+1,1);
      else if(dx>0&&S.step>0)go(S.step-1,-1);
    }
  },{passive:true});
}

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════
function init(){
  const app=$('app');
  app.innerHTML=`
    <div class="hdr">
      <button class="hdr-back" id="hdrBack" onclick="if(S.step>0)go(S.step-1,-1)">←</button>
      <div class="hdr-center"><div class="hdr-section" id="hdrSec">🏠 Accueil</div><div class="hdr-step" id="hdrStep"></div></div>
      <div class="hdr-score" id="hdrScore" style="display:none"></div>
    </div>
    <div class="pgbar"><div class="pgbar-fill" id="pgFill" style="width:0%"></div></div>
    <div class="scr-wrap" id="scrWrap"></div>
    <div class="bnav" id="bNav"></div>`;
  initSwipe();
  go(0,0);
}
init();
