// ════════════════════════════════════════════════════════════════
// SCORE BMN v3.4 — Architecture CLEO (C+E+O+L) + Bio BSD v4.9 + BTM v2.0 + FNC v1.0
// Open-Meteo · Nominatim · Haversine · Claude AI · IP-Geoloc
// Ref: OMS, IDF 2006, ADA 2024, IPAQ, PHQ-9, PSS-10, ISI, BES
// Lancet 2016, SCORE2/Framingham, FINDRISC, DPP, INTERHEART
// BTM v3.4: 10 MOD (exclusivite IMC, colinearite DT2/CTI, BT-6, delta normalise)
// FNC v1.0: Normalisation climatique Koppen (6 zones, acclimatation progressive)
// ════════════════════════════════════════════════════════════════

// ─── ETHNICITY v3.4 (WHO Asia-Pacific + IDF 2006 + Lancet 2016 + MultCV §9) ───
// dR=MultDT2, cvR=MultCV, ow=IMC seuil surpoids (ethnique)
const ETH={
  eu:{n:'Europeen / Caucasien',ow:25,ob:30,tf:88,tm:102,dR:1,cvR:1,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  im:{n:'Indo-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:2,cvR:1.8,hR:1.2,cR:1.4,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  cr:{n:'Creole Mauricien',ow:25,ob:30,tf:84,tm:94,dR:1.6,cvR:1.5,hR:1.4,cR:1.2,iM:1.2,ldl:1,ev:-2,p:1},
  si:{n:'Sino-Mauricien',ow:23,ob:27.5,tf:80,tm:90,dR:1.7,cvR:1.4,hR:.9,cR:.6,iM:.9,ldl:.9,ev:1.5,p:1.1},
  sa:{n:'Sud-Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:2,cvR:1.8,hR:1.3,cR:1.5,iM:1.2,ldl:1.3,ev:-1.5,p:1},
  af:{n:'Africain / Subsaharien',ow:25,ob:30,tf:88,tm:102,dR:1.5,cvR:1.6,hR:1.5,cR:1.2,iM:1.3,ldl:1,ev:-1.5,p:1},
  ea:{n:'Est-Asiatique',ow:23,ob:27.5,tf:80,tm:88,dR:.9,cvR:.9,hR:.9,cR:.7,iM:.9,ldl:.9,ev:1.5,p:1.1},
  se:{n:'Sud-Est Asiatique',ow:23,ob:27.5,tf:80,tm:90,dR:1.2,cvR:1,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1},
  fm:{n:'Franco-Mauricien',ow:25,ob:30,tf:88,tm:102,dR:1,cvR:1,hR:1,cR:.9,iM:1,ldl:1,ev:1,p:1},
  met:{n:'Metis Mauricien',ow:24,ob:28,tf:84,tm:94,dR:1.5,cvR:1.4,hR:1.2,cR:1.1,iM:1.1,ldl:1,ev:-.5,p:1},
  ar:{n:'Arabe / MENA',ow:23,ob:27.5,tf:80,tm:90,dR:1.7,cvR:1.5,hR:1.2,cR:1.2,iM:1.1,ldl:1.1,ev:-1,p:1},
  oth:{n:'Autre / Non specifie',ow:25,ob:30,tf:88,tm:102,dR:1,cvR:1,hR:1,cR:1,iM:1,ldl:1,ev:0,p:1}
};

// ─── FNC v1.0 — Normalisation Climatique Koppen (§5 Dossier v3.4) ───
// Zone => {FNC_temp, FNC_uv, label}
// AQI n'est PAS normalise (pollution = meme impact partout)
// FNC_eff = 1 - (1 - FNC) * min(1, mois_residence / 12)
const FNC_ZONES={
  Z1:{ft:0.55,fu:0.50,l:'Tropical humide'},
  Z2:{ft:0.50,fu:0.55,l:'Desert chaud'},
  Z3:{ft:0.70,fu:0.70,l:'Mediterraneen'},
  Z4:{ft:1.00,fu:1.00,l:'Tempere oceanique (reference)'},
  Z5:{ft:1.10,fu:1.00,l:'Continental'},
  Z6:{ft:0.60,fu:0.55,l:'Tropical sec / savane'}
};

// ─── BTM MATRIX v3.4 — 27 facteurs × 6 techniques (§4 Dossier v3.4) ───
// MOD-01: IMC exclusif (PREMIER_VRAI du plus haut)
// MOD-03: colonne BT6 ajoutee
// MOD-04: ASA>=4 ESG = +2 (corrige de -2)
// MOD-07: GRS R4/R5 ESG = +1 (prudence biblio)
// MOD-08: ATCD Ballon BT1 = -2 (corrige de -3)
const BTM_MATRIX={
  // IMC ranges (exclusifs MOD-01)
  'IMC_27_30' :{BT1:2,BT2:0,BT3:-5,BT4:-5,BT5:4,BT6:2},
  'IMC_30_35' :{BT1:3,BT2:3,BT3:-2,BT4:-4,BT5:4,BT6:3},
  'IMC_35_40' :{BT1:1,BT2:2,BT3:4,BT4:2,BT5:2,BT6:4},
  'IMC_40_50' :{BT1:-1,BT2:0,BT3:4,BT4:4,BT5:1,BT6:2},
  'IMC_50_60' :{BT1:-3,BT2:-2,BT3:2,BT4:5,BT5:-1,BT6:-1},
  'IMC_60+'   :{BT1:-5,BT2:-4,BT3:1,BT4:5,BT5:-2,BT6:-2},
  // Facteurs non-IMC
  'GERD_SEV'  :{BT1:-1,BT2:-1,BT3:-5,BT4:5,BT5:0,BT6:-1,cond:(v)=>v.gerd>=2},
  'GERD_LEG'  :{BT1:0,BT2:0,BT3:-3,BT4:3,BT5:0,BT6:0,cond:(v)=>v.gerd===1},
  'DT2_HBA_9+':{BT1:-1,BT2:1,BT3:2,BT4:5,BT5:2,BT6:4,cond:(v)=>v.dt2&&v.hba1c>9},
  'DT2_HBA_79':{BT1:0,BT2:1,BT3:3,BT4:4,BT5:3,BT6:3,cond:(v)=>v.dt2&&v.hba1c>=7&&v.hba1c<=9},
  'SOPK'      :{BT1:1,BT2:1,BT3:4,BT4:1,BT5:3,BT6:2,cond:(v)=>v.sopk},
  'NASH_SEV'  :{BT1:1,BT2:4,BT3:2,BT4:2,BT5:2,BT6:5,cond:(v)=>v.nash>=2},
  'DYSLIPI_MX':{BT1:0,BT2:1,BT3:2,BT4:3,BT5:3,BT6:3,cond:(v)=>v.dyslipiMixte},
  'COMORB_CV' :{BT1:1,BT2:1,BT3:2,BT4:3,BT5:4,BT6:4,cond:(v)=>v.comorbCV},
  'CTI_55+'   :{BT1:-2,BT2:0,BT3:3,BT4:4,BT5:-1,BT6:2,cond:(v)=>v.cti>55},
  'CTI_40_55' :{BT1:0,BT2:2,BT3:2,BT4:2,BT5:2,BT6:3,cond:(v)=>v.cti>=40&&v.cti<=55},
  'GRS_R1'    :{BT1:0,BT2:0,BT3:-1,BT4:-2,BT5:5,BT6:3,cond:(v)=>v.grs==='R1'},
  'GRS_R2'    :{BT1:0,BT2:1,BT3:0,BT4:-1,BT5:4,BT6:4,cond:(v)=>v.grs==='R2'},
  'GRS_R4R5'  :{BT1:1,BT2:1,BT3:3,BT4:4,BT5:-3,BT6:-1,cond:(v)=>v.grs==='R4'||v.grs==='R5'},
  'SF_80+'    :{BT1:-1,BT2:1,BT3:3,BT4:4,BT5:1,BT6:2,cond:(v)=>v.sf>=80},
  'ASA_4+'    :{BT1:3,BT2:2,BT3:-5,BT4:-5,BT5:3,BT6:1,cond:(v)=>v.asa>=4},
  'BES_27+'   :{BT1:-2,BT2:-2,BT3:-5,BT4:-5,BT5:2,BT6:-2,cond:(v)=>v.besT>=27},
  'BES_17_26' :{BT1:-1,BT2:-1,BT3:-1,BT4:-1,BT5:1,BT6:2,cond:(v)=>v.besT>=17&&v.besT<27},
  'PSS_20+'   :{BT1:0,BT2:0,BT3:-1,BT4:-1,BT5:0,BT6:0,cond:(v)=>v.pss>20},
  'ATCD_SLEEV':{BT1:-3,BT2:-2,BT3:-5,BT4:5,BT5:1,BT6:1,cond:(v)=>v.atcdChir==='sleeve'},
  'ATCD_BALL' :{BT1:-2,BT2:2,BT3:2,BT4:2,BT5:2,BT6:2,cond:(v)=>v.atcdBallon},
  'REFUS_CHIR':{BT1:3,BT2:3,BT3:-5,BT4:-5,BT5:3,BT6:3,cond:(v)=>v.refusChir}
};
const BT_NAMES={BT1:'Ballon Gastrique',BT2:'Endosleeve (ESG)',BT3:'Sleeve Gastrectomie',BT4:'Bypass (RYGB)',BT5:'GLP-1 RA',BT6:'Association'};

// ─── BT-6 Sous-categories efficacite (§4b Dossier v3.4) ───
const BT6_ASSOC=[
  {id:'6a',n:'ESG + GLP-1 RA',tbwl6:'16-20%',tbwl12:'20-25%',tbwl24:'22-27%',dt2r:'65-70%',grade:'1B'},
  {id:'6b',n:'Bypass RYGB + Semaglutide 2.4mg',tbwl6:'25-30%',tbwl12:'32-38%',tbwl24:'35-42%',dt2r:'85-92%',grade:'1B'},
  {id:'6c',n:'GLP-1 RA + SGLT-2i + Metformine',tbwl6:'10-14%',tbwl12:'14-19%',tbwl24:'15-20%',dt2r:'HbA1c -3.2%',grade:'1A'},
  {id:'6d',n:'Ballon Spatz3 + GLP-1 (pont)',tbwl6:'13-17%',tbwl12:'18-22%',tbwl24:'—',dt2r:'Risque -35%',grade:'2A'},
  {id:'6e',n:'ESG + Buproprion-Naltrexone',tbwl6:'14-18%',tbwl12:'18-22%',tbwl24:'19-24%',dt2r:'BES -8 pts',grade:'2A'}
];

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
  // ir_occ retiré v3.1.1 : non déclarable par le patient (occulte). Détection automatique via TG/HDL > 3.5 dans le module biologique.
  {id:'cortis',n:'Corticoides > 3 mois',p:8,or:'HR 2.12',d:'Adipogenese viscerale iatrogene.',ca:1.6,gr:-.35,cat:'tx',gri_fav:0},
  {id:'antidep',n:'Antidepresseurs obesogenes',p:4,or:'OR 1.58',d:'Paroxetine/mirtazapine.',ca:1.1,gr:0,cat:'tx',gri_fav:0},
  {id:'depres',n:'Depression traitee',p:6,or:'OR 1.92',d:'Impact metabolique bidirectionnel.',ca:1.2,gr:0,cat:'tx',gri_fav:0},
  {id:'dyslipi',n:'Dyslipidemie (cholesterol / triglycerides)',p:10,or:'HR 1.87-2.34',d:'3 sous-types: mixte (TG+HDL), LDL isole, traitee (statines). Flag statines corrige bioNorm.',ca:1.15,gr:.55,cat:'dis',gri_fav:1}
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
  {id:'leptine',n:'Leptine',u:'ng/mL',nm:20,ab:40,w:1.5,inv:0,t:15,nr:'< 20',ar:'>= 40',l:'Hormone satiete'},
  {id:'cpep',n:'C-peptide',u:'ng/mL',nm:1.1,ab:0.4,w:2.0,inv:1,t:15,nr:'>= 1.1',ar:'< 0.4',l:'Reserve beta-cellulaire'},
  {id:'fgf21',n:'FGF21',u:'pg/mL',nm:200,ab:500,w:1.5,inv:0,t:15,nr:'< 200',ar:'>= 500',l:'Stress metabolique'},
  {id:'glucag',n:'Glucagon a jeun',u:'pg/mL',nm:100,ab:180,w:1.3,inv:0,t:15,nr:'< 100',ar:'>= 180',l:'Dysregulation alpha-cellulaire'}
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
const MK_CM={dt2:1.4,sopk:1.3,saos:1.25,mets:1.5,dyslipi:1.15};
const CTI_G={dur:.185,yoyo:.249,lep:.21,micro:.18,cort:.195,meta:.2,enf:.24};

// ─── BTM v3.4 — Bariatric & Therapeutic Module ───
// 6 techniques évaluées, 62 études méta-analysées, >180K patients
// Bach | Manos | Noel — 2026
const BTM_TECH={
  'BT-1':{id:'BT-1',name:'Ballon Gastrique',sub:{orbera:{n:'Orbera™',tbwl6:'10-12%',ewl2y:'32-38%',src:'Genco 2013, n=3696'},reshape:{n:'ReShape Duo',tbwl6:'9.8%',ewl2y:'25.1%',src:'Ponce 2015, n=326'},spatz3:{n:'Spatz3™ 12m',tbwl12:'17-19%',ewl2y:'44-48%',src:'Brooks 2019, n=228; Ienca 2020, n=272'}},imc:'30-40',compl:'7-14% intolerance',mort:'<0.01%',reversible:1},
  'BT-2':{id:'BT-2',name:'Endosleeve (ESG)',tbwl12:'13-16%',ewl2y:'55-58%',ewl5y:'56.8%',dt2rem:'49%',nashRes:'62%',compl:'<0.5%',mort:'<0.01%',imc:'30-45',src:'Alqahtani NEJM 2022, n=209; Lopez-Nava 2023, n=216; Badurdeen 2021, n=311; Sharaiha 2021, n=182',reversible:0},
  'BT-3':{id:'BT-3',name:'Sleeve Gastrectomie',tbwl12:'25-30%',ewl2y:'61-65%',ewl5y:'61.1%',ewl10y:'55%',dt2rem:'37%',sopkRem:'72%',mort30j:'0.09%',imc:'35-55',src:'Peterli JAMA 2018, n=217; Salminen JAMA 2018, n=240; Sieber 2023, n=167; Thereaux BMJ 2022, n=101327; Climent 2022, n=94',reversible:0},
  'BT-4':{id:'BT-4',name:'Bypass Gastrique (RYGB)',tbwl12:'28-34%',ewl2y:'65-72%',ewl7y:'65.7%',dt2rem:'29-45%',gerdRes:'87%',mortReduct:'-40%',cancerReduct:'-33%',cvReduct:'-29%',mort30j:'0.15%',imc:'>=40',src:'Adams NEJM 2017, n=418; Schauer NEJM 2017 STAMPEDE, n=150; Courcoulas 2020, n=2458; Sjostrom 2012, n=4047; Ponce 2021, n=344',sadi:{n:'SADI-S',ewl:'80-85%',imc:'>=60'},reversible:0},
  'BT-5':{id:'BT-5',name:'GLP-1 Receptor Agonists',sema:{n:'Semaglutide 2.4mg',tbwl:'14.9%',src:'STEP 1, Wilding NEJM 2021, n=1961; SELECT, Lincoff 2023, n=17604; FLOW, Perkovic 2024, n=3533'},tirza:{n:'Tirzepatide 15mg',tbwl:'19-22%',src:'SURMOUNT-1, Jastreboff NEJM 2022, n=2539; SURPASS-4, Del Prato 2021, n=2002'},reta:{n:'Retatrutide',tbwl:'24.2%',src:'REDEFINE-1, n=338'},cagrima:{n:'CagriSema',tbwl:'22.7%'},imc:'>=27',reversible:1},
  'BT-6':{id:'BT-6',name:'Associations Therapeutiques',combos:[
    {id:'esg_glp1',n:'ESG + GLP-1',gain:'+6-9% TBWL',src:'Sharaiha 2023'},
    {id:'spatz_glp1',n:'Spatz3 + GLP-1',gain:'Bridge to surgery, -35% risque chirurgical'},
    {id:'bypass_sema',n:'Bypass + Semaglutide',gain:'92% remission DT2 a 2 ans'},
    {id:'glp1_sglt2',n:'GLP-1 + SGLT-2',gain:'+4-6% TBWL, -0.9% HbA1c, Grade 1A si DT2+CV'},
    {id:'glp1_bupnal',n:'GLP-1 + Buproprion-Naltrexone',gain:'BES >= 17, synergie appetit+reward'},
    {id:'esg_topir',n:'ESG + Topiramate/BupNal',gain:'+4-7% TBWL'},
    {id:'sleeve_glp1',n:'Sleeve + GLP-1 post-op',gain:'+8-12% EWL si plateau'}
  ]}
};

// BES-16 (Binge Eating Scale — Gormally 1982, validee)
const BES16_ITEMS=[
  {q:'Je ne me sens pas gene(e) par mon poids ou ma taille quand je suis avec d\'autres personnes.',opts:['Pas gene(e)','Un peu gene(e)','Assez gene(e)','Tres gene(e)'],w:[0,0,1,3]},
  {q:'Je mange ce que je veux, quand je veux.',opts:['Vrai','Je mange parfois impulsivement','J\'ai un fort besoin de manger que j\'ai du mal a controler','J\'ai un besoin constant de manger que je ne controle pas'],w:[0,0,1,3]},
  {q:'Je n\'ai aucune difficulte a manger lentement et de maniere appropriee.',opts:['Vrai','Parfois je mange vite','J\'ai tendance a engloutir ma nourriture','J\'engloutis ma nourriture sans macher'],w:[0,0,1,3]},
  {q:'Je n\'ai jamais l\'impression de ne pas pouvoir arreter de manger.',opts:['Jamais','Parfois','Souvent','Presque toujours'],w:[0,0,1,3]},
  {q:'Je ne mange pas plus que d\'habitude lorsque je suis seul(e).',opts:['Vrai','Parfois un peu plus','Souvent beaucoup plus','Je mange constamment quand je suis seul(e)'],w:[0,0,1,3]},
  {q:'Apres avoir mange, je ne me sens pas coupable.',opts:['Jamais coupable','Parfois','Souvent','Presque toujours'],w:[0,0,1,3]},
  {q:'Je ne perds pas le controle de mon alimentation.',opts:['Jamais','Rarement','Souvent','Constamment'],w:[0,0,1,3]},
  {q:'Mon alimentation ne me cause aucun mal-etre.',opts:['Aucun','Leger','Modere','Severe'],w:[0,0,1,3]},
  {q:'Je n\'ai pas tendance a manger plus quand je suis triste ou anxieux(se).',opts:['Non','Un peu','Souvent','Toujours'],w:[0,0,1,3]},
  {q:'Je ne mange pas en secret.',opts:['Jamais','Rarement','Souvent','Tres souvent'],w:[0,0,1,3]},
  {q:'Je mange des quantites normales.',opts:['Normales','Un peu plus','Nettement plus','Enormement'],w:[0,0,1,3]},
  {q:'Je ne ressens pas de pulsion irresistible a manger.',opts:['Jamais','Parfois','Souvent','Constamment'],w:[0,0,1,3]},
  {q:'Je n\'ai pas de periodes de fringales incontroles.',opts:['Jamais','Rarement','Regulierement','Quotidiennement'],w:[0,0,1,3]},
  {q:'Je ne pense pas a la nourriture tout le temps.',opts:['Rarement','Parfois','Souvent','Constamment'],w:[0,0,1,3]},
  {q:'Je n\'ai pas honte de mon poids.',opts:['Pas du tout','Un peu','Assez','Beaucoup'],w:[0,0,1,3]},
  {q:'Mes habitudes alimentaires sont normales.',opts:['Normales','Un peu perturbees','Moderement perturbees','Severement perturbees'],w:[0,0,1,3]}
];
function getBesTotal(){return S.bes16.reduce((s,v,i)=>s+(BES16_ITEMS[i]?BES16_ITEMS[i].w[v]:0),0);}

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
  // BES simplifié (ancien) conservé pour compat
  bes:0,
  // BES-16 complet (v3.4)
  bes16:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // BTM v3.4 — Bariatric & Therapeutic Module (MOD-01 a MOD-10)
  btm:{gerd:0,asa:1,atcdChir:'aucun',atcdBallon:0,atcdBallonType:'',refusChir:0,prefPatient:'neutre',nash:0,comorbCV:0},
  btmResult:null,
  // FNC v1.0 — Normalisation climatique
  fncZone:'Z4', // Koppen zone par defaut (tempere oceanique)
  residenceMois:12, // mois de residence (pour acclimatation progressive)
  // Comorbidities & bio
  comorbIds:[],bioValues:{},
  // Dyslipidémie v3.1
  dyslipi:{type:'',traitement:'',duree:''},
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
      glp1_profiling:(()=>{
        const g=getGLP1Profile();
        return{
          profileCode:g.profileCode, profileName:g.profile.name,
          grs:g.grs, ppeEstimate:g.ppeEstimate,
          molecule:g.profile.molecule, doseCible:g.profile.doseCible,
          axes:g.axes,
          efficacyCount:g.efficacyFactors.length,
          resistanceCount:g.resistanceFactors.length,
          topEfficacy:g.efficacyFactors.slice(0,3).map(f=>f.t),
          topResistance:g.resistanceFactors.slice(0,3).map(f=>f.t),
          alternative:g.profile.alternative
        };
      })(),
      biologie:{present:hasBio, bioNorm:S.bmn_b, marqueurs:bioDetail, wDecl:S.wDecl, wBio:S.wBio},
      profil:{
        age:getAge(), sexe:S.sexe, ethnie:ETH[S.ethnie]?.n,
        imc:S.imc?.toFixed(1), taille_cm:S.taille, poids_kg:S.poids, tt_cm:S.tt,
        comorbidites:comorbNames,
        pss10:getPssTotal(), phq9:getPhqTotal(), bes:S.bes, bes16:getBesTotal(), isi:S.isi,
        tabac_cig:S.tabac, alcool:S.alcool
      },
      btm:(()=>{
        const rtp=S.btmResult||btm_decision();
        return rtp?{
          gerd:S.btm.gerd,asa:S.btm.asa,atcdChir:S.btm.atcdChir,nash:S.btm.nash,comorbCV:S.btm.comorbCV,
          atcdBallon:S.btm.atcdBallon,atcdBallonType:S.btm.atcdBallonType,
          prefPatient:S.btm.prefPatient,refusChir:S.btm.refusChir,
          primary:rtp.primary,secondary:rtp.secondary,
          ranked:rtp.ranked,score_brut:rtp.score_brut,score_pct:rtp.score_pct,
          delta_abs:rtp.delta_abs,delta_rel:rtp.delta_rel,confiance:rtp.confiance,
          bt6_type:rtp.bt6_type,assoc:rtp.assoc,
          contraind:rtp.contraind,tbwl:rtp.tbwl,ewl:rtp.ewl,complexity:rtp.complexity,
          facteurs_actifs:rtp.facteurs_actifs?.length||0,facteurs_manquants:rtp.facteurs_manquants||[],
          parcours:rtp.parcours,notes:rtp.notes,alarmes:rtp.alarmes||[],besTotal:getBesTotal()
        }:null;
      })(),
      fnc:{zone:S.fncZone,residenceMois:S.residenceMois,label:FNC_ZONES[S.fncZone]?.l||''},
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
// SCREENS — 20 ecrans progressifs, grand public
// ════════════════════════════════════════════════════════════════
const SCR=[
  // 0: Welcome
  ()=>`<div class="welc">
    <div class="welc-logo">B</div>
    <h1>Score <b>BMN</b> v3.4</h1>
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

  // 3: Ethnicity v3.4 (+ MultCV, Metis, Arabe, Autre)
  ()=>{const list=Object.entries(ETH).map(([k,v])=>({k,...v}));
    return `<div class="s-emoji">Origine</div>
    <div class="s-title">Origine ethnique</div>
    <div class="s-sub">Les seuils d'obesite et les risques metaboliques varient significativement selon l'origine. <span class="ref">OMS 2004</span> <span class="ref">IDF 2006</span> <span class="ref">Lancet 2016</span></div>
    <div class="opts opts-compact">${list.map(o=>`<div class="opt${S.ethnie===o.k?' sel':''}" onclick="S.ethnie='${o.k}';render(S.step,0)">
      <div class="opt-txt"><b>${o.n}</b><small>Surpoids des ${o.ow} | Obesite des ${o.ob} | DT2 x${o.dR} | CV x${o.cvR||1}</small></div>
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

  // 14: Comorbidities v3.1.1 (13 comorbidites declaratives + ir_occ auto-detectee via bio)
  ()=>{
    const dis=COMORB.filter(c=>c.cat==='dis'),phe=COMORB.filter(c=>c.cat==='phe'),tx=COMORB.filter(c=>c.cat==='tx');
    const mk=arr=>arr.map(c=>{
      const isOn=S.comorbIds.includes(c.id);
      // v3.1: pour dyslipi, afficher les points du sous-type
      let ptsLabel=c.p;
      if(c.id==='dyslipi'&&isOn){
        ptsLabel=S.dyslipi.type==='ldl_isole'?6:S.dyslipi.type==='traitee'?8:10;
      }
      return `<div class="cm-card${isOn?' on':''}" onclick="toggleCM('${c.id}')">
      <div class="cm-top"><span class="cm-nm">${c.n}</span><span class="cm-pts" style="color:${isOn?'var(--orange)':'var(--dim3)'}">+${ptsLabel}</span></div>
      <div class="cm-meta">${c.or} -- ${c.d}</div></div>`;
    }).join('');
    // v3.1: Arbre adaptatif dyslipidémie
    let dyslipiHtml='';
    if(S.comorbIds.includes('dyslipi')){
      dyslipiHtml=`<div class="sec" style="border:2px solid var(--accent);border-radius:12px;padding:14px;margin:10px 0;background:var(--bg2)">
        <div style="font-weight:700;color:var(--accent);margin-bottom:8px;font-size:13px">Dyslipidemie — Sous-typage v3.1</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:6px"><b>Q14a :</b> De quel type ?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          ${['mixte','ldl_isole','ne_sait_pas'].map(t=>{
            const labels={mixte:'Triglycerides eleves ET HDL bas (mixte)',ldl_isole:'Cholesterol LDL eleve uniquement',ne_sait_pas:'Je ne sais pas / les deux'};
            const act=S.dyslipi.type===t||(t==='ne_sait_pas'&&!S.dyslipi.type);
            return `<div class="cm-card${act?' on':''}" style="cursor:pointer;padding:6px 10px;font-size:11px" onclick="setDyslipiType('${t}')">${labels[t]}</div>`;
          }).join('')}
        </div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:6px"><b>Q14b :</b> Etes-vous sous traitement ?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          ${['statines','fibrates','combinaison','autre','non'].map(t=>{
            const labels={statines:'Statines (Atorvastatine, Rosuvastatine...)',fibrates:'Fibrates (Fenofibrate...)',combinaison:'Combinaison statines + fibrates',autre:'Autre traitement',non:'Non traite(e)'};
            const act=S.dyslipi.traitement===t||(t==='non'&&!S.dyslipi.traitement);
            return `<div class="cm-card${act?' on':''}" style="cursor:pointer;padding:6px 10px;font-size:11px" onclick="setDyslipiTrait('${t}')">${labels[t]}</div>`;
          }).join('')}
        </div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:6px"><b>Q14c :</b> Depuis combien de temps ?</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${['<1an','1-5ans','>5ans'].map(t=>{
            const labels={'<1an':'Moins de 1 an','1-5ans':'1 a 5 ans','>5ans':'Plus de 5 ans'};
            const act=S.dyslipi.duree===t;
            return `<div class="cm-card${act?' on':''}" style="cursor:pointer;padding:6px 10px;font-size:11px" onclick="setDyslipiDuree('${t}')">${labels[t]}</div>`;
          }).join('')}
        </div>
        <div style="font-size:10px;color:var(--dim3);margin-top:8px">v3.1 : Le sous-type determine les points BMN-K (6/8/10), la correction bioNorm (LDL×1.35 si statines), et le profil GLP-1.</div>
      </div>`;
    }
    return `<div class="s-emoji">Sante</div>
    <div class="s-title">Comorbidites (v3.4 — 13 declaratives + IR auto)</div>
    <div class="s-sub">Selectionnez les maladies et conditions dont vous souffrez ou avez souffert. Cela influence directement votre score BMN-K (comorbidites). <span class="ref">ADA 2024</span> <span class="ref">IDF MetS</span> <span class="ref">Framingham</span></div>
    <div class="sec"><div class="sec-tt">Maladies etablies</div>${mk(dis)}</div>
    ${dyslipiHtml}
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
          ${S.ir_occ_auto?`<div style="font-size:9px;color:var(--red);margin-top:2px;font-weight:700">★ IR OCCULTE détectée (TG/HDL > 3.5) → +8 pts BMN-K auto</div>`:''}
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
        v3.1 : Correction statines LDL×1.35 | fibrates TG×1.30 | ApoB w=2.5 si statines&gt;5ans<br>
        Triade inflammatoire : bInflam = moy(z_CRP, z_TG/HDL, z_HOMA-IR) → E** = E* × (1+0.15×bInflam)<br>
        Integration : sf = wDecl(0.65)×sD + wBio(0.35)×bioNorm, reponderation si gap > 20<br>
        BioFloor : sf ≥ 75% bioNorm | BEF : si bio>90, sf ≥ max(80, 85%×bio)
      </div>
    </details>`;

    html+=`</div>`; // fin wrapper no-rise-children
    return html;
  },

  // 17: BTM v3.4 — Questionnaire Bariatrique & Therapeutique
  ()=>{
    const besT=getBesTotal();
    const besLvl=besT>=27?'Hyperphagie severe':besT>=17?'Hyperphagie moderee':besT>=10?'Legere tendance':'Pas d\'hyperphagie';
    const besCol=besT>=27?'var(--red)':besT>=17?'var(--orange)':besT>=10?'var(--accent)':'var(--green)';
    let html=`<div class="s-emoji">BTM</div>
    <div class="s-title">Module Bariatrique & Therapeutique v3.4</div>
    <div class="s-sub">Scoring matriciel 27 facteurs x 6 techniques. MOD-01 a MOD-10 conformes au Dossier Maitre v3.4. <span class="ref">62+ etudes, >180K patients</span></div>`;

    // GERD
    html+=`<div class="sec"><div class="sec-tt">Reflux gastro-oesophagien (GERD)</div></div>`;
    html+=`<div class="opts">${[{v:0,l:'Non / pas de reflux'},{v:1,l:'Reflux occasionnel (non traite)'},{v:2,l:'GERD documente / traite (IPP)'}].map(o=>
      `<div class="opt${S.btm.gerd===o.v?' sel':''}" onclick="S.btm.gerd=${o.v};render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
    if(S.btm.gerd>=2) html+=`<div style="font-size:10px;color:var(--red);margin:4px 12px">⚠ GERD documente → Bypass prioritaire (resolution 87%, Ponce 2021). Sleeve contre-indiquee.</div>`;

    // ASA
    html+=`<div class="sec"><div class="sec-tt">Score ASA (risque chirurgical)</div></div>`;
    html+=`<div class="opts opts-compact">${[{v:1,l:'ASA 1 — Sain'},{v:2,l:'ASA 2 — Maladie legere'},{v:3,l:'ASA 3 — Maladie severe'},{v:4,l:'ASA 4 — Menace vitale'}].map(o=>
      `<div class="opt${S.btm.asa===o.v?' sel':''}" onclick="S.btm.asa=${o.v};render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
    if(S.btm.asa>=4) html+=`<div style="font-size:10px;color:var(--red);margin:4px 12px">⚠ ASA ≥ 4 → Chirurgie contre-indiquee. Ballon ou GLP-1 uniquement.</div>`;

    // ATCD chirurgie bariatrique
    html+=`<div class="sec"><div class="sec-tt">Antecedent chirurgie bariatrique</div></div>`;
    html+=`<div class="opts opts-compact">${[{v:'aucun',l:'Aucun'},{v:'ballon',l:'Ballon gastrique'},{v:'sleeve',l:'Sleeve gastrectomie'},{v:'bypass',l:'Bypass gastrique'},{v:'autre',l:'Autre intervention'}].map(o=>
      `<div class="opt${S.btm.atcdChir===o.v?' sel':''}" onclick="S.btm.atcdChir='${o.v}';render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
    if(S.btm.atcdChir==='sleeve') html+=`<div style="font-size:10px;color:var(--orange);margin:4px 12px">Sleeve anterieure → Bypass revision recommande (+23% EWL, Thereaux 2022)</div>`;

    // MOD-08: ATCD Ballon type (Orbera vs Spatz3)
    if(S.btm.atcdChir==='ballon'){
      html+=`<div class="sec"><div class="sec-tt">Type de ballon anterieur (MOD-08)</div></div>`;
      html+=`<div class="opts opts-compact">${[{v:'orbera',l:'Orbera (6 mois)'},{v:'spatz3',l:'Spatz3 (12 mois, ajustable)'},{v:'autre_ballon',l:'Autre / inconnu'}].map(o=>
        `<div class="opt${S.btm.atcdBallonType===o.v?' sel':''}" onclick="S.btm.atcdBallonType='${o.v}';S.btm.atcdBallon=1;render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
      if(S.btm.atcdBallonType==='spatz3') html+=`<div style="font-size:10px;color:var(--teal);margin:4px 12px">Spatz3 (mecanisme distinct, ajustable) — Re-pose possible. Poids BTM -2 (MOD-08).</div>`;
    }

    // NASH
    html+=`<div class="sec"><div class="sec-tt">Steatohepatite / NASH</div></div>`;
    html+=`<div class="opts">${[{v:0,l:'Non / non connue'},{v:1,l:'NAFLD / steatose simple'},{v:2,l:'NASH confirmee (biopsie/FibroScan)'}].map(o=>
      `<div class="opt${S.btm.nash===o.v?' sel':''}" onclick="S.btm.nash=${o.v};render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
    if(S.btm.nash>=2) html+=`<div style="font-size:10px;color:var(--teal);margin:4px 12px">NASH confirmee → ESG prioritaire (62% resolution histologique, Sharaiha 2021)</div>`;

    // Comorbidité CV
    html+=`<div class="sec"><div class="sec-tt">Maladie cardiovasculaire etablie</div></div>`;
    html+=`<div class="opts">${[{v:0,l:'Non'},{v:1,l:'Oui (IDM, AVC, AOMI, IC...)'}].map(o=>
      `<div class="opt${S.btm.comorbCV===o.v?' sel':''}" onclick="S.btm.comorbCV=${o.v};render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;

    // Refus chirurgie
    html+=`<div class="sec"><div class="sec-tt">Preference patient</div></div>`;
    html+=`<div class="opts opts-compact">${[{v:'neutre',l:'Neutre (accepte toute option)'},{v:'refus_chir',l:'Refuse la chirurgie'},{v:'prefer_chir',l:'Prefere la chirurgie'},{v:'prefer_endo',l:'Prefere endoscopie (ESG/Ballon)'},{v:'prefer_med',l:'Prefere le traitement medical'}].map(o=>
      `<div class="opt${S.btm.prefPatient===o.v?' sel':''}" onclick="S.btm.prefPatient='${o.v}';render(S.step,0)"><span>${o.l}</span></div>`).join('')}</div>`;
    S.btm.refusChir=(S.btm.prefPatient==='refus_chir')?1:0;

    // FNC v3.4 — Zone climatique Koppen
    html+=`<div class="sec"><div class="sec-tt">Zone climatique de residence (FNC v3.4)</div>
      <div style="font-size:10px;color:var(--dim3)">Normalise le score Exposome selon l'acclimatation climatique. AQI non normalise.</div></div>`;
    html+=`<div class="opts opts-compact">${Object.entries(FNC_ZONES).map(([k,z])=>
      `<div class="opt${S.fncZone===k?' sel':''}" onclick="S.fncZone='${k}';render(S.step,0)"><span>${k}: ${z.l}</span></div>`).join('')}</div>`;
    if(S.fncZone!=='Z4'){
      const fnc=FNC_ZONES[S.fncZone];
      html+=`<div style="font-size:10px;color:var(--teal);margin:4px 12px">FNC ${S.fncZone} (${fnc.l}) — Temp x${fnc.ft}, UV x${fnc.fu}. Residence: ${S.residenceMois||12} mois.</div>`;
    }
    // Durée de résidence
    html+=`<div class="sec"><div class="sec-tt">Duree de residence (mois)</div></div>`;
    html+=`<div class="range-wrap"><input type="range" min="0" max="120" value="${S.residenceMois||12}" oninput="S.residenceMois=+this.value;render(S.step,0)"><span class="range-val">${S.residenceMois||12} mois</span></div>`;
    if(S.residenceMois<12) html+=`<div style="font-size:10px;color:var(--orange);margin:4px 12px">Residence < 12 mois — FNC progressif applique (acclimatation partielle).</div>`;

    html+=`<div id="aiBox17"></div>`;
    return html;
  },

  // 18: BES-16 — Binge Eating Scale complete (Gormally 1982)
  ()=>{
    const besT=getBesTotal();
    const besLvl=besT>=27?'Hyperphagie severe (BES ≥ 27)':besT>=17?'Hyperphagie moderee (BES 17-26)':besT>=10?'Tendance legere (BES 10-16)':'Normal (BES < 10)';
    const besCol=besT>=27?'var(--red)':besT>=17?'var(--orange)':besT>=10?'var(--accent)':'var(--green)';
    let html=`<div class="s-emoji">BES</div>
    <div class="s-title">Binge Eating Scale — 16 items</div>
    <div class="s-sub">Echelle validee d'hyperphagie boulimique. Score 0-46. <span class="ref">Gormally 1982</span></div>
    <div class="metric-hero"><div class="metric-main" style="color:${besCol}">${besT}</div><div class="metric-lbl">${besLvl}</div></div>`;
    if(besT>=27) html+=`<div style="background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:8px;padding:8px 12px;margin:6px 0;font-size:11px;color:var(--red);font-weight:600">⚠ BES ≥ 27 : Contre-indication chirurgie bariatrique. Prise en charge TCA prealable obligatoire.</div>`;
    else if(besT>=17) html+=`<div style="background:rgba(245,158,11,.1);border:1px solid var(--orange);border-radius:8px;padding:8px 12px;margin:6px 0;font-size:11px;color:var(--orange);font-weight:600">⚠ BES ≥ 17 : Ajout Buproprion-Naltrexone recommande en association.</div>`;

    BES16_ITEMS.forEach((item,i)=>{
      const val=S.bes16[i];
      html+=`<div class="fc pss-item">
        <div class="fc-top"><div class="fc-label">BES ${i+1}/16</div>
        <div class="fc-score" style="color:${val>=3?'var(--red)':val>=1?'var(--orange)':'var(--green)'}">${item.w[val]}/3</div></div>
        <div class="pss-q">${item.q}</div>
        <div class="pss-opts">
          ${item.opts.map((lbl,j)=>`<div class="pss-opt${val===j?' sel':''}" onclick="S.bes16[${i}]=${j};calc();render(S.step,0)"><span class="pss-opt-n">${item.w[j]}</span><span class="pss-opt-l">${lbl}</span></div>`).join('')}
        </div>
      </div>`;
    });
    // Sync ancien BES simplifié pour compat
    S.bes=Math.min(8,Math.round(besT/46*8));
    html+=`<div id="aiBox18"></div>`;
    return html;
  },

  // 19: Final Result (inclut BTM Section 11)
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
  {from:17,to:18,name:'BTM Bariatrique',ico:'[BTM]'},
  {from:19,to:19,name:'Resultat',ico:'[R]'}
];
function getSec(step){return SECTIONS.find(s=>step>=s.from&&step<=s.to)||SECTIONS[0];}
function toggleCM(id){if(S.comorbIds.includes(id))S.comorbIds=S.comorbIds.filter(x=>x!==id);else S.comorbIds.push(id);
  // v3.1: reset dyslipi sub-fields if deselected
  if(id==='dyslipi'&&!S.comorbIds.includes('dyslipi')){S.dyslipi={type:'',traitement:'',duree:''};}
  // v3.1: default dyslipi type to mixte on first select
  if(id==='dyslipi'&&S.comorbIds.includes('dyslipi')&&!S.dyslipi.type){S.dyslipi.type='mixte';}
  render(S.step,0);}
// v3.1: Dyslipidemie sous-typage
function setDyslipiType(t){S.dyslipi.type=(t==='ne_sait_pas'?'mixte':t);render(S.step,0);}
function setDyslipiTrait(t){S.dyslipi.traitement=(t==='non'?'':t);if(t==='statines'||t==='combinaison'){S.dyslipi.type='traitee';}render(S.step,0);}
function setDyslipiDuree(d){S.dyslipi.duree=d;render(S.step,0);}

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
// MOTEUR DE CALCUL — Score BMN v3.4 — Architecture CLEO + BTM + FNC
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
  // BMN-K complet (0-50) utilise les 13 comorbidites declaratives (v3.1.1: ir_occ retiree, auto-detectee via bio)
  let k=0, ctiAmp=1;
  const griF=[], griU=[];
  S.comorbIds.forEach(id=>{
    const cm=COMORB.find(x=>x.id===id); if(!cm)return;
    // v3.1: dyslipi points varient selon sous-type
    let pts=cm.p;
    if(id==='dyslipi'){
      if(S.dyslipi.type==='ldl_isole') pts=6;
      else if(S.dyslipi.type==='traitee') pts=8;
      else pts=10; // mixte ou defaut
      // v3.1: GRI contribution variable selon sous-type
      const grVal=S.dyslipi.type==='ldl_isole'?0.20:S.dyslipi.type==='traitee'?0.35:0.55;
      griF.push({id:'dyslipi',d:grVal});
      // v3.1: CTI ca variable selon sous-type
      const caVal=S.dyslipi.type==='ldl_isole'?1.05:S.dyslipi.type==='traitee'?1.10:1.15;
      if(caVal>ctiAmp) ctiAmp=caVal;
    } else {
      if(cm.ca>ctiAmp) ctiAmp=cm.ca;
      if(cm.gri_fav && cm.gr>0) griF.push({id:cm.id,d:cm.gr});
      else if(cm.gr<0) griU.push({id:cm.id,e:Math.abs(cm.gr)});
    }
    k+=pts;
  });
  // v3.1: Interaction dyslipi mixte + MetS → K += 3 (co-occurrence aggravante)
  if(S.comorbIds.includes('dyslipi') && S.dyslipi.type==='mixte' && S.comorbIds.includes('mets')) k+=3;
  S.bmn_k=Math.min(50,k);
  // v3.1: Interaction dyslipi + DT2 → CTI ca = max(ca_dyslipi, 1.20)
  if(S.comorbIds.includes('dyslipi') && S.comorbIds.includes('dt2')) ctiAmp=Math.max(ctiAmp, 1.20);
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
  d.c4_comorb={pts:c4,max:10,label:'c4 — Comorbidites v3.1 (K='+k+'/50, HTA='+htaPts+', DT='+diabPts+')',ref:'ADA 2024/IDF/Framingham',grp:'C'};
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
  else if(S.comorbIds.includes('dt2')&&S.comorbIds.includes('dyslipi')&&S.dyslipi.type==='mixte') gfFloor=22;
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
  // Layer A — Environnement physique (0-1) + FNC v3.4
  // FNC: Facteur Normalisation Climatique Koppen (§5 Dossier v3.4)
  // AQI n'est PAS normalise — pollution = meme impact partout
  // FNC_eff = 1 - (1 - FNC) * min(1, mois_residence / 12)
  const fnc=FNC_ZONES[S.fncZone]||FNC_ZONES.Z4;
  const fncEff_t=1-(1-fnc.ft)*Math.min(1,(S.residenceMois||12)/12);
  const fncEff_u=1-(1-fnc.fu)*Math.min(1,(S.residenceMois||12)/12);
  const a_air=Math.min(1, S.expo.air/8);
  const a_temp=Math.min(1, S.expo.temp/4 * fncEff_t);
  const a_uv=Math.min(1, S.expo.uv/3 * fncEff_u);
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
  // v3.1: Corrections statines (LDL×1.35) + fibrates (TG×1.30) + ApoB poids dominant
  // ════════════════════════════════════════════════════
  const hasStatines=S.comorbIds.includes('dyslipi')&&(S.dyslipi.traitement==='statines'||S.dyslipi.traitement==='combinaison');
  const hasFibrates=S.comorbIds.includes('dyslipi')&&(S.dyslipi.traitement==='fibrates'||S.dyslipi.traitement==='combinaison');
  const statines5ans=hasStatines&&S.dyslipi.duree==='>5ans';
  let swz=0, sw=0;
  const zScores={};
  BIO.forEach(m=>{
    let v_val=S.bioValues[m.id];
    if(v_val===undefined || v_val===null) return;
    // v3.1: Correction LDL si statines (reconstitution LDL pre-traitement)
    let wEff=m.w;
    if(m.id==='ldl' && hasStatines){ v_val=v_val*1.35; }
    // v3.1: Correction TG si fibrates
    if(m.id==='tg' && hasFibrates){ v_val=v_val*1.30; }
    // v3.1: ApoB poids dominant si statines > 5 ans (meilleur marqueur risque residuel CV)
    if(m.id==='apob' && statines5ans){ wEff=2.5; }
    let z;
    if(!m.inv){ z=v_val<=m.nm?0:v_val>=m.ab?1:(v_val-m.nm)/(m.ab-m.nm); }
    else { z=v_val>=m.nm?0:v_val<=m.ab?1:(m.nm-v_val)/(m.nm-m.ab); }
    z=Math.max(0,Math.min(1,z));
    zScores[m.id]=z;
    swz+=z*wEff; sw+=wEff;
  });
  const bioNorm=sw>0?Math.round(swz/sw*100):0;
  S.bmn_b=bioNorm;

  // ════════════════════════════════════════════════════
  // v3.1.1: IR OCCULTE — Détection automatique via biologie
  // Si TG/HDL > 3.5 ET ir_occ non déjà dans comorbIds → injection automatique
  // Points BMN-K (+8), GRI (+0.55), CTI ca (1.2) — McLaughlin 2005
  // ════════════════════════════════════════════════════
  S.ir_occ_auto=false;
  if(S.bioValues.tghdl!==undefined && S.bioValues.tghdl>3.5){
    S.ir_occ_auto=true;
    // Ajouter points BMN-K si pas déjà compté
    S.bmn_k=Math.min(50, S.bmn_k+8);
    // Recalculer c4 avec K augmenté
    const kNorm_ir=S.bmn_k/50*100;
    const c4_ir=Math.min(10, Math.round(kNorm_ir/10));
    // Ajuster C si c4 augmente (delta)
    const c4_old=Math.min(10, Math.round(((S.bmn_k-8)/50*100)/10));
    const c4_delta=c4_ir - c4_old;
    if(c4_delta>0) C=Math.min(50, C+c4_delta);
    sD=Math.min(100, C+E+O+L);
    // GRI bonus déjà géré ligne 1568 (tghdl>3.5 → +0.55)
    // CTI amplificateur
    if(1.2>ctiAmp) ctiAmp=1.2;
  }

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

// ════════════════════════════════════════════════════════════════
// GLP-1 RESPONSE PROFILING ENGINE v2.0
// Phenotypage complet multi-axes du patient pour predire:
// 1. PROFIL de reponse (5 niveaux + contre-indication)
// 2. MOLECULE recommandee (Semaglutide/Tirzepatide/Liraglutide)
// 3. DOSE cible personnalisee
// 4. % perte de poids attendue (PPE)
// 5. Facteurs d'efficacite / resistance detailles
// 6. Timeline de reponse
// 7. Strategie si non-repondeur
//
// Ref: STEP 1-5 (Sema), SURMOUNT 1-4 (Tirze), SCALE (Lira),
//      Lingvay 2024, Garvey 2023, Jastreboff 2022
// ════════════════════════════════════════════════════════════════

function getGLP1Profile(){
  const gri=S.gri, cti=S.cti, sf=S.sf, imc=S.imc;
  const age=getAge(), sr=getPssTotal()/40, phq=getPhqTotal();
  const e=ETH[S.ethnie]||ETH.eu;
  const hasBio=(S.bmn_b>0);
  const v=S.bioValues;

  // ── AXE 1: Score IR (Insulinoresistance) 0-10 ──
  // Cle de la reponse GLP-1: plus l'IR est forte, meilleure est la reponse
  let irScore=0;
  if(v.homaIR!==undefined){
    if(v.homaIR>=5) irScore+=4;
    else if(v.homaIR>=4) irScore+=3;
    else if(v.homaIR>=2.5) irScore+=2;
    else irScore+=0.5; // normal = leger bonus (bonne sensibilite de base)
  } else {
    // Estimation IR sans biologie (proxy declaratif)
    if(S.comorbIds.includes('dt2')) irScore+=3;
    else if(S.comorbIds.includes('predmt')) irScore+=2;
    else if(S.comorbIds.includes('mets')) irScore+=2;
    // ir_occ retiré du déclaratif v3.1.1 — détection auto via TG/HDL dans la bio
    else if(imc>=e.ob+5) irScore+=1.5;
    else if(imc>=e.ob) irScore+=1;
  }
  if(v.adipon!==undefined && v.adipon<6) irScore+=1.5;
  else if(v.adipon!==undefined && v.adipon<10) irScore+=0.5;
  if(v.tghdl!==undefined && v.tghdl>3.5) irScore+=1.5;
  else if(v.tghdl!==undefined && v.tghdl>2.5) irScore+=0.5;
  if(S.comorbIds.includes('sopk')) irScore+=1; // SOPK = IR feminine, tres bon repondeur
  if(S.comorbIds.includes('nafld')) irScore+=1; // Steatose = IR hepatique
  // v3.1: Dyslipidemie mixte = proxy IR fort (correlation TG/HDL → IR)
  if(S.comorbIds.includes('dyslipi') && S.dyslipi.type==='mixte'){
    if(v.tghdl===undefined) irScore+=1.5; // proxy declaratif si pas de bio TG/HDL
    else if(v.tghdl>3.5) irScore+=0.5; // bonus convergence bio+declaratif
  }
  irScore=Math.min(10,irScore);

  // ── AXE 2: Score Chronicite-Resistance 0-10 ──
  // Plus c'est chronique, moins le GLP-1 sera efficace seul
  let chronScore=0;
  chronScore+=Math.min(3, cti/20); // CTI 0-100 → 0-3 (principal)
  if(S.yoyo>=1) chronScore+=2; // Regimes yoyo = set-point deplace
  if(S.enf_ob>=2) chronScore+=1.5; // Obesite enfance = programmation epigenetique
  else if(S.enf_ob>=1) chronScore+=0.5;
  if(v.leptine!==undefined && v.leptine>=40) chronScore+=2; // Leptinoresistance = barrage central
  else if(v.leptine!==undefined && v.leptine>=25) chronScore+=1;
  if(imc>=40) chronScore+=1.5; // Obesite severe = masse grasse resistante
  else if(imc>=35) chronScore+=0.5;
  chronScore=Math.min(10,chronScore);

  // ── AXE 3: Score Inflammation 0-10 ──
  // GLP-1 a un effet anti-inflammatoire, les patients inflammes repondent bien
  let inflamScore=0;
  if(v.crphs!==undefined){
    if(v.crphs>=5) inflamScore+=3;
    else if(v.crphs>=3) inflamScore+=2;
    else if(v.crphs>=1) inflamScore+=1;
  }
  if(S.bInflam>0) inflamScore+=Math.min(3, S.bInflam*3);
  if(S.sii>=4) inflamScore+=2;
  else if(S.sii>=2) inflamScore+=1;
  if(v.ggt!==undefined && v.ggt>=80) inflamScore+=1; // Inflammation hepatique
  inflamScore=Math.min(10,inflamScore);

  // ── AXE 4: Score Psycho-Comportemental 0-10 ──
  // Depression/stress/BES severes diminuent l'observance et la reponse
  let psychoScore=0;
  if(phq>=20) psychoScore+=3; // Depression severe = mauvaise compliance
  else if(phq>=15) psychoScore+=2;
  else if(phq>=10) psychoScore+=1;
  if(sr>=0.6) psychoScore+=2; // Stress extreme = cortisol → resistance
  else if(sr>=0.35) psychoScore+=1;
  if(S.bes>=5) psychoScore+=3; // BES severe = TCA actif, GLP-1 peut aider mais limitee
  else if(S.bes>=3) psychoScore+=1.5;
  if(S.comorbIds.includes('depres')) psychoScore+=1;
  psychoScore=Math.min(10,psychoScore);

  // ── AXE 5: Score Iatrogene 0-5 ──
  // Medicaments qui antagonisent les GLP-1
  let iatroScore=0;
  if(S.comorbIds.includes('cortis')) iatroScore+=3; // Corticoides = principal antagoniste
  if(S.comorbIds.includes('antidep')) iatroScore+=1.5; // Antidep obesogenes
  if(S.comorbIds.includes('hypo')&&(v.tsh===undefined||v.tsh>=6)) iatroScore+=1; // Hypothyroidie non controlee
  iatroScore=Math.min(5,iatroScore);

  // ── AXE 6: Facteurs demographiques ──
  let demoBonus=0;
  if(age>=30&&age<=65) demoBonus+=0.5; // Age optimal pour GLP-1
  if(S.sexe==='f') demoBonus+=0.3; // Femmes repondent legerement mieux (STEP data)
  if(e.dR>=1.5) demoBonus+=0.5; // Ethnies IR = meilleure reponse
  if(S.comorbIds.includes('sopk')) demoBonus+=0.5; // SOPK = excellente reponse

  // ── AXE 7: Fonction beta-cellulaire / secretoire (-3 a +5) ──
  // Reserve beta-cellulaire preservee = meilleure reponse GLP-1 (effet incretine)
  let betaCellAxis=0;
  if(v.cpep!==undefined){
    if(v.cpep>=2.0) betaCellAxis+=2;       // Reserve secretoire forte
    else if(v.cpep>=1.1) betaCellAxis+=1;   // Fonction normale
    if(v.cpep<0.4) betaCellAxis-=2;         // Depletion beta-cellulaire
  } else {
    // Proxy: HOMA-IR + HbA1c comme substitut
    const homaProxy=v.homaIR||0, hba1cProxy=v.hba1c||5.5;
    if(homaProxy>=2.5 && hba1cProxy<7.0) betaCellAxis+=1;  // IR-driven, beta preservee
    if(hba1cProxy>=8.5) betaCellAxis-=1;  // Probable depletion beta
  }
  // FGF21 resistance (FGF21 eleve = stress metabolique chronique)
  if(v.fgf21!==undefined){
    if(v.fgf21>=500) betaCellAxis-=1;      // Resistance FGF21
    else if(v.fgf21<=200) betaCellAxis+=1;  // Signaling FGF21 sain
  }
  // Glucagon a jeun (hyperglucagonemie = dysregulation alpha-cellulaire)
  if(v.glucag!==undefined){
    if(v.glucag>=180) betaCellAxis-=1;      // Dysregulation alpha
    else if(v.glucag<=100) betaCellAxis+=1;  // Suppression normale
  }
  betaCellAxis=Math.max(-3,Math.min(5,betaCellAxis));

  // ════════════════════════════════════════════════════
  // SCORE COMPOSITE DE REPONSE GLP-1 (GRS: GLP-1 Response Score)
  // ════════════════════════════════════════════════════
  // 7 axes: IR + inflammation + demo + betaCell (positifs)
  //         chronicite + psycho + iatrogene + betaCell neg (negatifs)
  const posFactor = irScore*0.30 + inflamScore*0.12 + demoBonus + Math.max(0,betaCellAxis)*0.08;
  const negFactor = chronScore*0.18 + psychoScore*0.12 + iatroScore*0.15 + Math.max(0,-betaCellAxis)*0.05;
  let grs = posFactor - negFactor;
  // Calibrer sur le GRI existant pour coherence
  grs = (grs + gri) / 2;
  grs = Math.max(-3, Math.min(6, grs));

  // ════════════════════════════════════════════════════
  // DETERMINATION DU PROFIL
  // 5 profils + 1 contre-indication
  // ════════════════════════════════════════════════════
  let profile, profileCode;
  const isContraindicated = (
    (v.hba1c!==undefined && v.hba1c>=10) || // Urgence diabetique → insuline d'abord
    (imc>=50 && cti>70) || // Super-obesite chronicisee → chirurgie
    (S.comorbIds.includes('cortis') && iatroScore>=3 && irScore<3) // Corticoides hauts sans IR
  );

  if(isContraindicated){
    profileCode='CI';
    profile={
      code:'CI',
      name:'CONTRE-INDICATION RELATIVE',
      color:'#64748b',
      bgColor:'rgba(100,116,139,.12)',
      icon:'⊘',
      response:'N/A',
      ppeRange:'N/A',
      description:'Le profil actuel ne permet pas d\'attendre une reponse satisfaisante aux GLP-1 en premiere intention.',
      molecule:null,
      doseInit:null,
      doseCible:null,
      timeline:null,
      alternative:'Insuline si HbA1c ≥ 10% | Chirurgie bariatrique si IMC ≥ 50 + CTI > 70 | Corriger corticotherapie'
    };
  } else if(grs>=2.5 && irScore>=4 && chronScore<=4){
    profileCode='R1';
    profile={
      code:'R1',
      name:'REPONDEUR EXCELLENT',
      color:'var(--green)',
      bgColor:'var(--green-bg)',
      icon:'★',
      response:'>85%',
      ppeRange:'15-22%',
      description:'Profil metabolique ideal pour les agonistes GLP-1. Insulinoresistance marquee avec faible chronicite. Reponse attendue rapide et durable.',
      molecule:imc>=35||S.comorbIds.includes('dt2')?'Tirzepatide (Mounjaro/Zepbound)':'Semaglutide (Wegovy/Ozempic)',
      moleculeAlt:imc>=35?'Semaglutide 2.4mg/sem si Tirzepatide non disponible':'Tirzepatide si reponse insuffisante a 6 mois',
      doseInit:imc>=35?'Tirzepatide 2.5mg/sem':'Semaglutide 0.25mg/sem',
      doseCible:imc>=35?'Tirzepatide 10-15mg/sem':'Semaglutide 2.4mg/sem',
      timeline:'Perte appetit: 2-4 sem | -5% poids: 8-12 sem | -10%: 16-24 sem | -15%+: 6-12 mois | Plateau: 12-18 mois',
      maintenance:'Traitement au long cours recommande. Risque de regain 50-70% a l\'arret (STEP 4 extension). Si objectif atteint: reduire dose mais ne pas arreter.',
      alternative:null
    };
  } else if(grs>=1.5 && irScore>=2){
    profileCode='R2';
    profile={
      code:'R2',
      name:'BON REPONDEUR',
      color:'var(--teal)',
      bgColor:'rgba(20,184,166,.1)',
      icon:'●',
      response:'60-85%',
      ppeRange:'10-17%',
      description:'Bon profil de reponse. L\'insulinoresistance est presente mais moderee. Associer obligatoirement un programme nutritionnel structure pour optimiser la reponse.',
      molecule:S.comorbIds.includes('dt2')?'Tirzepatide (Mounjaro)':'Semaglutide (Wegovy)',
      moleculeAlt:'Liraglutide 3mg/j (Saxenda) si intolerance digestive GLP-1 hebdomadaire',
      doseInit:S.comorbIds.includes('dt2')?'Tirzepatide 2.5mg/sem':'Semaglutide 0.25mg/sem',
      doseCible:S.comorbIds.includes('dt2')?'Tirzepatide 10mg/sem':'Semaglutide 1.7-2.4mg/sem',
      timeline:'Perte appetit: 3-6 sem | -5% poids: 12-16 sem | -10%: 20-30 sem | Plateau: 9-15 mois',
      maintenance:'Traitement prolonge recommande (>12 mois). Reevaluation a 6 mois: si <5% de perte → envisager switch ou ajout.',
      alternative:'Si reponse <5% a 6 mois: switch Sema→Tirze ou vice versa | Ajouter Metformine si IR persistante'
    };
  } else if(grs>=0.5 && chronScore<=6 && irScore>=1){
    profileCode='R3';
    profile={
      code:'R3',
      name:'REPONDEUR PARTIEL',
      color:'var(--orange)',
      bgColor:'var(--orange-bg)',
      icon:'◐',
      response:'30-60%',
      ppeRange:'5-12%',
      description:'Reponse incertaine. Facteurs limitants identifies (chronicite, stress, iatrogenie). GLP-1 possible mais dans un cadre multimodal obligatoire.',
      molecule:'Semaglutide (Wegovy)',
      moleculeAlt:'Tirzepatide si echec Semaglutide a 6 mois (switch recommande)',
      doseInit:'Semaglutide 0.25mg/sem (titration lente sur 16 sem)',
      doseCible:'Semaglutide 1.7-2.4mg/sem (selon tolerance)',
      timeline:'Perte appetit: 4-8 sem (variable) | -5%: 16-24 sem | -10%: 30-40 sem (si atteint) | Evaluation: 6 mois',
      maintenance:'Reevaluation obligatoire a 6 mois. Si <5% de perte: echec GLP-1, orienter vers chirurgie si CTI > 50.',
      alternative:'Approche multimodale: GLP-1 + programme AP supervise + TCC + dieteticien | Si echec: evaluation chirurgicale'
    };
  } else if(grs>=-0.5){
    profileCode='R4';
    profile={
      code:'R4',
      name:'NON-REPONDEUR PROBABLE',
      color:'var(--red)',
      bgColor:'var(--red-bg)',
      icon:'✕',
      response:'<30%',
      ppeRange:'<5%',
      description:'Le profil du patient suggere une probabilite de reponse faible aux GLP-1. Facteurs de resistance majeurs identifies. Privilegier d\'autres strategies.',
      molecule:'Essai GLP-1 possible (3 mois max) mais faible attente',
      moleculeAlt:'Tirzepatide (double agoniste GIP/GLP-1) a titre de derniere tentative pharmacologique',
      doseInit:'Semaglutide 0.25mg/sem (essai therapeutique)',
      doseCible:'A evaluer selon reponse a 12 semaines',
      timeline:'Si aucune reponse appetit a 8 sem: probablement non-repondeur | Evaluation stricte a 12 sem',
      maintenance:'Arret si <3% de perte a 12 semaines. Redirection vers chirurgie bariatrique.',
      alternative:'Chirurgie bariatrique prioritaire si IMC >= 35 ou IMC >= 30 + comorbidites | Programme intensif pluridisciplinaire'
    };
  } else {
    profileCode='R5';
    profile={
      code:'R5',
      name:'ECHEC PHARMACOLOGIQUE PREVU',
      color:'var(--purple)',
      bgColor:'var(--purple-bg)',
      icon:'⬇',
      response:'<10%',
      ppeRange:'<3%',
      description:'Resistance metabolique majeure. Les mecanismes adaptatifs (leptinoresistance, set-point eleve, chronicite installee) rendent les GLP-1 inefficaces comme monotherapie.',
      molecule:'GLP-1 non recommande en premiere intention',
      moleculeAlt:null,
      doseInit:'N/A',
      doseCible:'N/A',
      timeline:'N/A — Orienter directement vers chirurgie',
      maintenance:'Post-chirurgie: GLP-1 possible en adjuvant pour maintien ponderal (Semaglutide 1mg/sem)',
      alternative:'Chirurgie bariatrique URGENTE (Sleeve/Bypass/SADI-S) + suivi 5 ans + GLP-1 adjuvant post-op si besoin'
    };
  }

  // ════════════════════════════════════════════════════
  // FACTEURS DETAILLES (pour affichage)
  // ════════════════════════════════════════════════════
  const efficacyFactors=[], resistanceFactors=[];

  // Facteurs d'efficacite (+)
  if(irScore>=4) efficacyFactors.push({t:'Insulinoresistance marquee',d:'HOMA-IR eleve = forte reponse aux incretines',s:3,ref:'STEP 2/SURMOUNT 2'});
  else if(irScore>=2) efficacyFactors.push({t:'Insulinoresistance moderee',d:'IR presente, reponse probable',s:2,ref:'STEP 2'});
  if(S.comorbIds.includes('sopk')) efficacyFactors.push({t:'SOPK diagnostique',d:'Phenotype IR feminin, excellente reponse GLP-1 (OR 2.77)',s:3,ref:'Jensterle 2022'});
  if(S.comorbIds.includes('nafld')) efficacyFactors.push({t:'NAFLD / Steatose',d:'GLP-1 reduit la graisse hepatique de 30-40%',s:2,ref:'Newsome 2021, LEAN trial'});
  if(S.comorbIds.includes('predmt')) efficacyFactors.push({t:'Pre-diabete',d:'Prevention du DT2 sous GLP-1 (reduction 80%)',s:3,ref:'STEP 2, DPP'});
  if(v.crphs!==undefined && v.crphs>=3) efficacyFactors.push({t:'Inflammation active (CRP ≥ 3)',d:'Effet anti-inflammatoire du GLP-1 = double benefice',s:2,ref:'Pal 2022'});
  if(v.adipon!==undefined && v.adipon<6) efficacyFactors.push({t:'Adiponectine basse',d:'Tissu adipeux dysfonctionnel, GLP-1 ameliore adipokines',s:2,ref:'Meier 2022'});
  if(S.comorbIds.includes('mets')) efficacyFactors.push({t:'Syndrome metabolique',d:'GLP-1 corrige plusieurs composantes MetS simultanement',s:2,ref:'IDF/SURMOUNT'});
  // v3.1: Dyslipidemie comme facteur d'efficacite GLP-1
  if(S.comorbIds.includes('dyslipi')){
    if(S.dyslipi.type==='mixte') efficacyFactors.push({t:'Dyslipidemie mixte',d:'GLP-1 ameliore TG (-15 a -25%) et HDL (+5 a +10%). Phenotype IR fort.',s:2,ref:'STEP 1-5/Davies 2021/SURMOUNT 1-4'});
    else if(S.dyslipi.type==='traitee') efficacyFactors.push({t:'Dyslipidemie traitee (statines)',d:'GLP-1 apporte un benefice lipidique additionnel (ApoB, TG)',s:1,ref:'Sattar 2021'});
    else efficacyFactors.push({t:'Hypercholesterolemie',d:'GLP-1 a un effet modere sur le LDL (-5 a -10%)',s:1,ref:'Sattar 2021'});
  }
  if(age>=30 && age<=55) efficacyFactors.push({t:'Age optimal (30-55 ans)',d:'Meilleure reponse metabolique et meilleure compliance',s:1,ref:'STEP 1'});
  if(S.comorbIds.includes('dt2') && imc>=30) efficacyFactors.push({t:'DT2 + Obesite',d:'Double indication: controle glycemique + ponderal',s:2,ref:'SURMOUNT 2'});
  if(v.tghdl!==undefined && v.tghdl>3.0) efficacyFactors.push({t:'Dyslipidemie atherogenique',d:'TG/HDL eleve = IR periph., GLP-1 efficace sur ce profil',s:1,ref:'Sattar 2021'});
  if(inflamScore>=4) efficacyFactors.push({t:'Profil inflammatoire eleve (SII ≥ 4)',d:'L\'inflammation chronique renforce la cible GLP-1',s:2,ref:'Brook 2010'});
  if(betaCellAxis>=2) efficacyFactors.push({t:'Reserve beta-cellulaire preservee',d:'C-peptide eleve = effet incretine potentialise',s:2,ref:'Nauck & Meier 2016'});
  if(v.cpep!==undefined && v.cpep>=1.5) efficacyFactors.push({t:'C-peptide ≥ 1.5 ng/mL',d:'Secretion insuline residuelle forte, GLP-1 optimal',s:2,ref:'STEP 2/Nauck 2016'});
  if(v.fgf21!==undefined && v.fgf21<=200) efficacyFactors.push({t:'FGF21 normal',d:'Axe hepatique GLP-1R→FGF21 fonctionnel',s:1,ref:'ScienceDirect 2024'});

  // Facteurs de resistance (-)
  if(chronScore>=6) resistanceFactors.push({t:'Chronicite installee (CTI '+S.cti+')',d:'Set-point pondere durablement deplace, resistance aux mecanismes de satiete',s:3,ref:'Leibel 1995/Sumithran 2011'});
  else if(chronScore>=3) resistanceFactors.push({t:'Debut de chronicisation (CTI '+S.cti+')',d:'Mecanismes adaptatifs en cours d\'installation',s:2,ref:'Sumithran 2011'});
  if(v.leptine!==undefined && v.leptine>=40) resistanceFactors.push({t:'Leptinoresistance (leptine ≥ 40)',d:'Barrage central: satiete insensible, GLP-1 partiellement court-circuite',s:3,ref:'Considine 1996'});
  if(S.yoyo>=1) resistanceFactors.push({t:'Regimes yoyo repetitifs',d:'Thermogenese adaptative reduite, depense energetique abaissee',s:2,ref:'Fothergill 2016'});
  if(S.comorbIds.includes('cortis')) resistanceFactors.push({t:'Corticotherapie > 3 mois',d:'Cortisol exogene = adipogenese viscerale, antagonise GLP-1',s:3,ref:'Fardet 2007'});
  if(S.bes>=5) resistanceFactors.push({t:'Hyperphagie severe (BES ≥ 5)',d:'TCA actif: GLP-1 reduit appetit mais ne traite pas la compulsion',s:2,ref:'Blundell 2023'});
  if(phq>=15) resistanceFactors.push({t:'Depression moderee a severe (PHQ '+phq+')',d:'Impact sur compliance + alimentation emotionnelle',s:2,ref:'Wadden 2021'});
  if(sr>=0.6) resistanceFactors.push({t:'Stress extreme (PSS '+getPssTotal()+')',d:'Hypercortisolemie chronique → resistance insuline + appetit',s:2,ref:'Tomiyama 2019'});
  if(imc>=45) resistanceFactors.push({t:'Obesite morbide (IMC '+imc?.toFixed(1)+')',d:'Masse grasse critique: GLP-1 insuffisant comme monotherapie',s:3,ref:'STEP 1: IMC>40 = reponse diminuee'});
  if(S.comorbIds.includes('saos') && S.comorbIds.includes('dt2')) resistanceFactors.push({t:'SAOS + DT2',d:'Hypoxie nocturne renforce l\'IR et la resistance au traitement',s:2,ref:'Drager 2015'});
  if(S.comorbIds.includes('antidep')) resistanceFactors.push({t:'Antidepresseurs obesogenes',d:'Paroxetine/mirtazapine: prise poids +2-4 kg/an, antagonise partiellement GLP-1',s:1,ref:'Gafoor 2018'});
  if(S.enf_ob>=2) resistanceFactors.push({t:'Obesite installee depuis l\'enfance',d:'Programmation epigenetique: hyperplasie adipocytaire irreversible',s:2,ref:'Geserick 2018'});
  if(age>=65) resistanceFactors.push({t:'Age ≥ 65 ans',d:'Sarcopenie: risque de perte musculaire sous GLP-1, necessite AP structure',s:1,ref:'Rubino 2022'});
  if(S.comorbIds.includes('hypo') && (v.tsh===undefined || v.tsh>=6)) resistanceFactors.push({t:'Hypothyroidie mal controlee',d:'Metabolisme basal abaisse, corriger TSH AVANT GLP-1',s:2,ref:''});
  if(betaCellAxis<=-2) resistanceFactors.push({t:'Depletion beta-cellulaire',d:'C-peptide bas = effet incretine reduit, envisager insuline',s:3,ref:'Nauck & Meier 2016'});
  if(v.fgf21!==undefined && v.fgf21>=500) resistanceFactors.push({t:'Resistance FGF21 (≥ 500)',d:'Stress metabolique chronique, axe GLP-1R→FGF21 sature',s:2,ref:'ScienceDirect 2024'});
  if(v.glucag!==undefined && v.glucag>=180) resistanceFactors.push({t:'Hyperglucagonemie a jeun',d:'Dysregulation alpha-cellulaire, GLP-1 moins efficace sur suppression glucagon',s:2,ref:'Lund 2014'});

  // Tri par severite
  efficacyFactors.sort((a,b)=>b.s-a.s);
  resistanceFactors.sort((a,b)=>b.s-a.s);

  // ════════════════════════════════════════════════════
  // PERTE DE POIDS ESTIMEE (PPE) personnalisee
  // Ref: STEP 1 baseline: -15.3% (Sema 2.4), SURMOUNT-1: -22.5% (Tirze 15mg)
  // Modulation selon profil patient
  // ════════════════════════════════════════════════════
  let ppeBase;
  if(profile.molecule && profile.molecule.includes('Tirzepatide')) ppeBase=20;
  else if(profile.molecule && profile.molecule.includes('Semaglutide')) ppeBase=15;
  else ppeBase=10;

  let ppeMod=0;
  if(irScore>=4) ppeMod+=3; // Forte IR = meilleure reponse
  if(S.comorbIds.includes('sopk')) ppeMod+=2;
  if(S.comorbIds.includes('dyslipi')&&S.dyslipi.type==='mixte') ppeMod+=1; // v3.1: reponse lipidique GLP-1
  if(chronScore>=6) ppeMod-=5; // Chronicite = diminue
  if(v.leptine!==undefined && v.leptine>=40) ppeMod-=4;
  if(psychoScore>=6) ppeMod-=3;
  if(iatroScore>=3) ppeMod-=4;
  if(S.yoyo>=1) ppeMod-=2;
  if(imc>=45) ppeMod-=3;
  if(age>=65) ppeMod-=2;

  const ppeEstimate=Math.max(0,Math.min(25,Math.round(ppeBase+ppeMod)));

  return{
    profileCode,
    profile,
    grs:Math.round(grs*100)/100,
    axes:{irScore:Math.round(irScore*10)/10, chronScore:Math.round(chronScore*10)/10, inflamScore:Math.round(inflamScore*10)/10, psychoScore:Math.round(psychoScore*10)/10, iatroScore:Math.round(iatroScore*10)/10, betaCellAxis:Math.round(betaCellAxis*10)/10},
    efficacyFactors,
    resistanceFactors,
    ppeEstimate,
    hasBio
  };
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

// ════════════════════════════════════════════════════
// BTM v3.4 — Bariatric & Therapeutic Module Decision Engine
// MOD-01 a MOD-10 conformes au Dossier Maitre v3.4
// Scoring matriciel 27 facteurs × 6 techniques
// ════════════════════════════════════════════════════
function btm_decision(){
  const imc=S.imc, sf=S.bmn_t||S.sD, cti=S.cti;
  const grs=S.glp1_profile||'R3';
  const dt2=S.comorbIds.includes('dt2'), hba1c=S.bioValues.hba1c||0;
  const gerd=S.btm.gerd||0, sopk=S.comorbIds.includes('sopk');
  const besT=getBesTotal(), pss=getPssTotal();
  const dyslipiMixte=S.comorbIds.includes('dyslipi')&&S.dyslipi.type==='mixte';
  const nash=S.btm.nash||0, asa=S.btm.asa||1, atcdChir=S.btm.atcdChir;
  const atcdBallon=S.btm.atcdBallon||0;
  const refusChir=S.btm.refusChir||S.btm.prefPatient==='refus_chir';
  const comorbCV=S.btm.comorbCV;

  const rtp={primary:null,secondary:null,ranked:[],score_brut:{BT1:0,BT2:0,BT3:0,BT4:0,BT5:0,BT6:0},
    score_pct:{},delta_abs:0,delta_rel:0,confiance:'',
    facteurs_actifs:[],facteurs_manquants:[],
    assoc:[],contraind:[],bt6_type:null,ewl:'',tbwl:'',parcours:[],complexity:1,notes:[],alarmes:[]};

  // ── MOD-01: IMC EXCLUSIF (PREMIER_VRAI du plus haut) ──
  let imcRange=null;
  if(imc>=60) imcRange='IMC_60+';
  else if(imc>=50) imcRange='IMC_50_60';
  else if(imc>=40) imcRange='IMC_40_50';
  else if(imc>=35) imcRange='IMC_35_40';
  else if(imc>=30) imcRange='IMC_30_35';
  else if(imc>=27) imcRange='IMC_27_30';

  // Appliquer poids IMC exclusif
  if(imcRange && BTM_MATRIX[imcRange]){
    const w=BTM_MATRIX[imcRange];
    ['BT1','BT2','BT3','BT4','BT5','BT6'].forEach(t=>{rtp.score_brut[t]+=w[t]||0;});
    rtp.facteurs_actifs.push({f:imcRange,w});
  }

  // ── SCORING MATRICIEL : 20 facteurs non-IMC ──
  const vars={imc,sf,cti,grs,dt2,hba1c,gerd,sopk,besT,pss,dyslipiMixte,nash,asa,atcdChir,atcdBallon,refusChir,comorbCV};
  // Liste des facteurs optionnels potentiellement manquants (MOD-06)
  const optionalFactors=['GERD_SEV','GERD_LEG','NASH_SEV','BES_27+','BES_17_26'];

  Object.keys(BTM_MATRIX).forEach(fk=>{
    if(fk.startsWith('IMC_')) return; // deja traite
    const row=BTM_MATRIX[fk];
    if(!row.cond) return;
    // MOD-06: gestion valeurs manquantes
    try{
      if(row.cond(vars)){
        ['BT1','BT2','BT3','BT4','BT5','BT6'].forEach(t=>{rtp.score_brut[t]+=(row[t]||0);});
        rtp.facteurs_actifs.push({f:fk,w:{BT1:row.BT1,BT2:row.BT2,BT3:row.BT3,BT4:row.BT4,BT5:row.BT5,BT6:row.BT6}});
      }
    }catch(e){
      rtp.facteurs_manquants.push(fk);
    }
  });

  // ── MOD-02: NOTE COLLINEARITE DT2/CTI ──
  if(dt2&&hba1c>9&&cti>55){
    rtp.notes.push('Colinearite DT2 severe (HbA1c>9%) + CTI eleve (>55) — cumul +9 Bypass assume (STAMPEDE + Fothergill 2016).');
  }

  // ── CLASSEMENT ──
  const techs=['BT1','BT2','BT3','BT4','BT5','BT6'];
  rtp.ranked=techs.slice().sort((a,b)=>rtp.score_brut[b]-rtp.score_brut[a]);

  // ── MOD-10: CAS LIMITE ZERO OPTION ──
  if(rtp.score_brut[rtp.ranked[0]]<=0){
    rtp.alarmes.push('AUCUNE OPTION STANDARD DISPONIBLE — Concertation pluridisciplinaire obligatoire.');
    rtp.primary={tech:rtp.ranked[0],name:BT_NAMES[rtp.ranked[0]],reason:'Score maximal <= 0. Decision pluridisciplinaire requise.',score:rtp.score_brut[rtp.ranked[0]]};
    S.btmResult=rtp; return rtp;
  }

  // ── MOD-05: DELTA NORMALISE ──
  rtp.delta_abs=rtp.score_brut[rtp.ranked[0]] - rtp.score_brut[rtp.ranked[1]];
  rtp.delta_rel=rtp.score_brut[rtp.ranked[0]]>0 ? Math.round(rtp.delta_abs / rtp.score_brut[rtp.ranked[0]] * 100) : 0;
  if(rtp.delta_rel>=25) rtp.confiance='INDICATION CLAIRE';
  else if(rtp.delta_rel>=10) rtp.confiance='DISCUSSION PATIENT';
  else rtp.confiance='DECISION PLURIDISCIPLINAIRE';

  // ── MOD-09: SCORE NORMALISE % ──
  // Calculer max possible pour chaque technique
  const maxPoss={BT1:0,BT2:0,BT3:0,BT4:0,BT5:0,BT6:0};
  Object.values(BTM_MATRIX).forEach(row=>{
    techs.forEach(t=>{if((row[t]||0)>0) maxPoss[t]+=(row[t]||0);});
  });
  techs.forEach(t=>{rtp.score_pct[t]=maxPoss[t]>0?Math.round(rtp.score_brut[t]/maxPoss[t]*100):0;});

  // ── PRIMARY & SECONDARY ──
  rtp.primary={tech:rtp.ranked[0],name:BT_NAMES[rtp.ranked[0]],reason:'Score matriciel: '+rtp.score_brut[rtp.ranked[0]]+' pts ('+rtp.score_pct[rtp.ranked[0]]+'%)',score:rtp.score_brut[rtp.ranked[0]]};
  rtp.secondary={tech:rtp.ranked[1],name:BT_NAMES[rtp.ranked[1]],reason:'Alternative: '+rtp.score_brut[rtp.ranked[1]]+' pts ('+rtp.score_pct[rtp.ranked[1]]+'%)',score:rtp.score_brut[rtp.ranked[1]]};

  // ── GARDE-FOUS ABSOLUS ──
  if(besT>=27){
    rtp.contraind.push('CI chirurgie bariatrique — TCA severe non stabilise (BES >= 27)');
    rtp.notes.push('BES >= 27 : Prise en charge TCA prealable obligatoire avant toute chirurgie.');
  }
  if(asa>=4){
    rtp.contraind.push('CI chirurgie sous AG (ASA >= 4)');
    rtp.notes.push('ASA >= 4 : ESG ou Ballon recommandes (pas AG). GLP-1 en alternative.');
  }
  if(atcdChir==='sleeve'){
    rtp.notes.push('ATCD Sleeve : Bypass revision prioritaire si reintervention necessaire (+23% EWL).');
  }

  // ── BT-6 TYPE DETERMINATION ──
  if(rtp.ranked[0]==='BT6'||(rtp.ranked[1]==='BT6'&&rtp.delta_rel<10)){
    // Determiner la sous-categorie BT-6
    if(dt2&&comorbCV) rtp.bt6_type=BT6_ASSOC.find(a=>a.id==='6c'); // GLP1+SGLT2+Met
    else if(rtp.facteurs_actifs.some(f=>f.f==='DT2_HBA_9+')&&(rtp.score_brut.BT4>0)) rtp.bt6_type=BT6_ASSOC.find(a=>a.id==='6b'); // Bypass+Sema
    else if(nash>=2&&imc>=30) rtp.bt6_type=BT6_ASSOC.find(a=>a.id==='6a'); // ESG+GLP1
    else if(besT>=17&&besT<27) rtp.bt6_type=BT6_ASSOC.find(a=>a.id==='6e'); // ESG+Bupropion
    else rtp.bt6_type=BT6_ASSOC.find(a=>a.id==='6a'); // defaut ESG+GLP1
  }

  // ── ASSOCIATIONS POST-TRAITEMENT ──
  if(dt2&&comorbCV) rtp.assoc.push('GLP-1 + SGLT-2i (Grade 1A — SELECT trial)');
  if(besT>=17&&besT<27) rtp.assoc.push('Buproprion-Naltrexone (BES '+besT+' >= 17 — synergie appetit + reward)');
  if(rtp.ranked[0]==='BT2'&&imc>=30) rtp.assoc.push('ESG + GLP-1 synergique (TBWL +6-9%)');
  if(rtp.ranked[0]==='BT4'&&dt2) rtp.assoc.push('Bypass + Semaglutide (remission DT2 92%)');
  if(dyslipiMixte&&rtp.ranked[0]==='BT4') rtp.notes.push('Bypass optimise dyslipidemie via acides biliaires.');
  if(dt2&&!comorbCV&&imc>=30) rtp.assoc.push('GLP-1 + SGLT-2 (synergie +4-6% TBWL, -0.9% HbA1c)');
  if(pss>20&&!refusChir) rtp.notes.push('PSS-10 > 20 : Compliance chirurgicale reduite. Suivi psychologique renforce recommande.');
  if(cti>55) rtp.notes.push('CTI > 55 (chronicite installee) : chirurgie prioritaire si eligible. GLP-1 seul insuffisant.');
  else if(cti>=40) rtp.notes.push('CTI 40-55 (chronicite avancee) : combiner traitements. Monotherapie insuffisante.');

  // ── MOD-08: ATCD BALLON ──
  if(atcdBallon&&S.btm.atcdBallonType==='spatz3'){
    rtp.notes.push('ATCD Ballon Spatz3 (12 mois, ajustable) — mecanisme distinct d\'Orbera. Re-pose possible.');
  } else if(atcdBallon){
    rtp.notes.push('ATCD Ballon (Orbera 6 mois) — re-pose deconseille, envisager ESG ou chirurgie.');
  }

  // ── CONTRE-INDICATIONS ADDITIONNELLES ──
  if(besT>=27) rtp.contraind.push('Toute chirurgie bariatrique jusqu\'a stabilisation TCA');
  if(gerd>=2) rtp.contraind.push('Sleeve gastrectomie (aggravation GERD documentee)');

  // ── COMPLEXITE & EFFICACITE ──
  if(rtp.assoc.length>=2) rtp.complexity=Math.min(5,rtp.complexity+1);
  if(besT>=17) rtp.complexity=Math.min(5,rtp.complexity+1);
  if(asa>=4) rtp.complexity=Math.min(5,rtp.complexity+1);
  // Estimation TBWL/EWL basee sur technique primaire
  const effMap={BT1:{ewl:'25-45%',tbwl:'10-19%'},BT2:{ewl:'50-58%',tbwl:'13-16%'},BT3:{ewl:'60-65%',tbwl:'25-30%'},
    BT4:{ewl:'65-72%',tbwl:'28-34%'},BT5:{ewl:'35-48%',tbwl:'14-22%'},BT6:{ewl:'50-70%',tbwl:'16-38%'}};
  const eff=effMap[rtp.ranked[0]]||{ewl:'—',tbwl:'—'};
  rtp.ewl=eff.ewl; rtp.tbwl=eff.tbwl;

  // ── PARCOURS TYPE ──
  rtp.parcours=['J0: Evaluation initiale multidisciplinaire','M-3: Preparation (nutrition, psycho, kine)',
    'M0: Intervention primaire ('+BT_NAMES[rtp.ranked[0]]+')',
    'M1: Controle post-intervention','M3: Bio + evaluation nutritionnelle',
    'M6: Ajustement therapeutique (ajout GLP-1 si plateau)','M12: Bilan annuel complet',
    'M24: Suivi long terme + strategie maintenance'];

  // ── MOD-06: RAPPORT VALEURS MANQUANTES ──
  if(rtp.facteurs_manquants.length>0){
    rtp.notes.push('Facteurs non documentes: '+rtp.facteurs_manquants.join(', ')+'. Pour affiner: documenter GERD, BES-16, GRS R (P10 min).');
  }

  // ── FNC NOTE ──
  if(S.fncZone && S.fncZone!=='Z4'){
    const z=FNC_ZONES[S.fncZone];
    if(z) rtp.notes.push('FNC '+S.fncZone+' ('+z.l+') appliquee — Score Exposome normalise pour acclimatation climatique.');
  }

  S.btmResult=rtp;
  return rtp;
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

// ── RETRO-DIAGNOSTIC v3.1 ──
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
  // v3.1.1: IR occulte auto-détectée
  if(v.tghdl>3.5)
    fl.push({c:'var(--red)',t:'★ IR OCCULTE DÉTECTÉE (TG/HDL > 3.5) — Insulinorésistance non diagnostiquée. +8 pts BMN-K automatiques. Ref: McLaughlin 2005, Circulation'});
  // v3.1: 5 alertes dyslipidemie
  if(v.tg>=2.3&&v.hdl!==undefined&&v.hdl<0.9&&!S.comorbIds.includes('dyslipi'))
    fl.push({c:'var(--orange)',t:'Dyslipidemie mixte probable non declaree (TG>=2.3 + HDL<0.9). Ref: Framingham/INTERHEART'});
  if(v.ldl>=4.1&&!S.comorbIds.includes('dyslipi'))
    fl.push({c:'var(--orange)',t:'Hypercholesterolemie non prise en charge (LDL>=4.1). Consultation CV recommandee'});
  if(v.apob>=1.2&&S.comorbIds.includes('dyslipi')&&(S.dyslipi.traitement==='statines'||S.dyslipi.traitement==='combinaison'))
    fl.push({c:'var(--red)',t:'Risque CV residuel eleve sous statines (ApoB>=1.2). Intensifier traitement. Ref: Sniderman 2019/ESC 2021'});
  if(v.tghdl>3.5&&!S.comorbIds.includes('dyslipi'))
    fl.push({c:'var(--orange)',t:'IR probable — proxy dyslipidemie mixte (TG/HDL>3.5). Bilan IR complet. Ref: McLaughlin 2005'});
  if(v.tg>=2.3&&v.hdl!==undefined&&v.hdl<0.9&&v.homaIR>2.5&&S.comorbIds.includes('dyslipi')&&S.dyslipi.type==='mixte')
    fl.push({c:'var(--red)',t:'TRIADE IR + DYSLIPIDEMIE — Convergence maximale (TG+HDL+HOMA-IR + dyslipi mixte). GLP-1 urgent.'});
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
      tghdl:1.2, urate:300, leptine:12, cpep:1.8, fgf21:120, glucag:70
    },
    borderline:{
      homaIR:3.2, hba1c:5.9, glyc:5.8, crphs:2.0, tsh:3.5, ldl:3.5, hdl:0.85,
      tg:1.9, adipon:8, asat:48, apob:1.0, ggt:60,
      tghdl:2.7, urate:385, leptine:28, cpep:1.0, fgf21:280, glucag:120
    },
    elevated:{
      homaIR:4.5, hba1c:6.8, glyc:7.5, crphs:4.0, tsh:6.0, ldl:4.5, hdl:0.65,
      tg:2.5, adipon:5, asat:65, apob:1.3, ggt:85,
      tghdl:3.8, urate:440, leptine:45, cpep:0.6, fgf21:450, glucag:160
    },
    critical:{
      homaIR:6.0, hba1c:8.2, glyc:10, crphs:8.0, tsh:10, ldl:5.5, hdl:0.5,
      tg:3.5, adipon:3, asat:90, apob:1.6, ggt:120,
      tghdl:5.0, urate:520, leptine:65, cpep:0.3, fgf21:650, glucag:220
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
  // 4. GLP-1 RESPONSE PROFILING — Phenotypage complet
  // ══════════════════════════════════════════════════════
  const glp1=getGLP1Profile();
  S.glp1_profile=glp1.profileCode; // v3.4: store for BTM
  const gp=glp1.profile;
  const ax=glp1.axes;

  // 4a. Header Profil GLP-1
  r+=`<div style="border:2px solid ${gp.color};border-radius:14px;overflow:hidden;margin-bottom:10px">
    <div style="padding:14px 16px;background:${gp.bgColor}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:24px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${gp.color};color:#fff;font-weight:900">${gp.icon}</div>
          <div>
            <div style="font-size:15px;font-weight:800;color:${gp.color}">${gp.name}</div>
            <div style="font-size:10px;color:var(--dim2)">${gp.code} | GRI = ${S.gri.toFixed(1)} | GRS = ${glp1.grs.toFixed(2)}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:900;color:${gp.color}">${gp.response}</div>
          <div style="font-size:9px;color:var(--dim3)">prob. reponse</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--dim);line-height:1.5">${gp.description}</div>
    </div>

    <!-- Axes radar simplifie -->
    <div style="padding:10px 16px;background:var(--bg2)">
      <div style="font-size:10px;font-weight:700;color:var(--dim2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Axes du phenotypage</div>
      ${[
        {n:'Insulinoresistance (IR)',v:ax.irScore,max:10,good:true,c:'var(--teal)'},
        {n:'Chronicite / Resistance',v:ax.chronScore,max:10,good:false,c:'var(--red)'},
        {n:'Inflammation',v:ax.inflamScore,max:10,good:true,c:'var(--orange)'},
        {n:'Psycho-comportemental',v:ax.psychoScore,max:10,good:false,c:'var(--purple)'},
        {n:'Iatrogene',v:ax.iatroScore,max:5,good:false,c:'var(--red)'},
        {n:'Beta-cellulaire',v:Math.max(0,ax.betaCellAxis),max:5,good:true,c:'var(--accent)',neg:Math.min(0,ax.betaCellAxis)}
      ].map(a=>{
        const isBeta=(a.neg!==undefined);
        const barPct=Math.round(a.v/a.max*100);
        const barCol=isBeta?(a.neg<0?'var(--red)':'var(--green)'):a.good?'var(--green)':a.c;
        const valTxt=isBeta?(a.neg<0?a.neg+'/'+a.max:'+'+a.v+'/'+a.max):a.v+'/'+a.max;
        const valCol=isBeta?(a.neg<0?'var(--red)':a.v>=2?'var(--green)':'var(--dim3)'):(a.good&&a.v>=4?'var(--green)':!a.good&&a.v>=4?a.c:'var(--dim3)');
        const arrow=isBeta?(a.neg<0?'↓':a.v>=2?'↑':''):(a.good?(a.v>=4?'↑':''):(a.v>=4?'↓':''));
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <div style="min-width:130px;font-size:10px;color:var(--dim)">${a.n}</div>
        <div style="flex:1;height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
          <div style="width:${barPct}%;height:100%;background:${barCol};border-radius:3px"></div>
        </div>
        <div style="min-width:36px;font-size:10px;font-weight:700;color:${valCol}; text-align:right">${valTxt}</div>
        <div style="min-width:12px;font-size:9px">${arrow}</div>
      </div>`;}).join('')}
    </div>

    <!-- Perte de poids estimee -->
    ${gp.code!=='CI'&&gp.code!=='R5'?`<div style="padding:10px 16px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--dim2);text-transform:uppercase;letter-spacing:.5px">Perte de poids estimee (PPE)</div>
          <div style="font-size:10px;color:var(--dim3)">Ref: STEP 1-5 (Semaglutide) | SURMOUNT 1-4 (Tirzepatide)</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:900;color:${gp.color}">~${glp1.ppeEstimate}%</div>
          <div style="font-size:9px;color:var(--dim3)">du poids initial</div>
        </div>
      </div>
      ${S.poids>0?`<div style="font-size:10px;color:var(--dim);margin-top:4px">Soit environ <b style="color:var(--txt)">-${Math.round(S.poids*glp1.ppeEstimate/100)} kg</b> sur 12-18 mois (poids actuel: ${S.poids} kg → cible ~${Math.round(S.poids*(1-glp1.ppeEstimate/100))} kg)</div>`:''}
    </div>`:''}

    <!-- Molecule recommandee -->
    ${gp.molecule?`<div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2)">
      <div style="font-size:10px;font-weight:700;color:var(--dim2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Prescription GLP-1 recommandee</div>
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <div style="flex:1;padding:8px;border-radius:8px;border:1px solid ${gp.color};background:${gp.bgColor}">
          <div style="font-size:11px;font-weight:700;color:${gp.color}">${gp.molecule}</div>
          ${gp.doseInit&&gp.doseInit!=='N/A'?`<div style="font-size:9px;color:var(--dim);margin-top:2px">Initiation: <b>${gp.doseInit}</b></div>`:''}
          ${gp.doseCible&&gp.doseCible!=='N/A'?`<div style="font-size:9px;color:var(--dim)">Cible: <b>${gp.doseCible}</b></div>`:''}
        </div>
      </div>
      ${gp.moleculeAlt?`<div style="font-size:9px;color:var(--dim3)"><b>Alternative:</b> ${gp.moleculeAlt}</div>`:''}
    </div>`:''}

    <!-- Timeline -->
    ${gp.timeline&&gp.timeline!=='N/A'?`<div style="padding:10px 16px;border-top:1px solid var(--border)">
      <div style="font-size:10px;font-weight:700;color:var(--dim2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Timeline de reponse attendue</div>
      <div style="font-size:10px;color:var(--dim);line-height:1.5">${gp.timeline.split('|').map(t=>'<div style="padding:2px 0;border-left:2px solid '+gp.color+';padding-left:8px;margin-bottom:2px">'+t.trim()+'</div>').join('')}</div>
    </div>`:''}

    <!-- Facteurs d'efficacite -->
    ${glp1.efficacyFactors.length>0?`<div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2)">
      <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
        Facteurs d'efficacite (${glp1.efficacyFactors.length})
      </div>
      ${glp1.efficacyFactors.slice(0,6).map(f=>`<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
        <div style="min-width:8px;margin-top:4px;width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0"></div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--txt)">${f.t} ${'●'.repeat(f.s)}</div>
          <div style="font-size:9px;color:var(--dim3)">${f.d} <span style="color:var(--accent)">[${f.ref}]</span></div>
        </div>
      </div>`).join('')}
    </div>`:''}

    <!-- Facteurs de resistance -->
    ${glp1.resistanceFactors.length>0?`<div style="padding:10px 16px;border-top:1px solid var(--border)">
      <div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">
        Facteurs de resistance (${glp1.resistanceFactors.length})
      </div>
      ${glp1.resistanceFactors.slice(0,6).map(f=>`<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
        <div style="min-width:8px;margin-top:4px;width:8px;height:8px;border-radius:50%;background:var(--red);flex-shrink:0"></div>
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--txt)">${f.t} ${'✕'.repeat(f.s)}</div>
          <div style="font-size:9px;color:var(--dim3)">${f.d}${f.ref?' <span style="color:var(--accent)">['+f.ref+']</span>':''}</div>
        </div>
      </div>`).join('')}
    </div>`:''}

    <!-- Maintenance / Alternative -->
    ${gp.maintenance||gp.alternative?`<div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--bg2)">
      ${gp.maintenance?`<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:700;color:var(--dim2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Maintien / Long terme</div><div style="font-size:10px;color:var(--dim);line-height:1.5">${gp.maintenance}</div></div>`:''}
      ${gp.alternative?`<div><div style="font-size:10px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Si echec / Alternative</div><div style="font-size:10px;color:var(--dim);line-height:1.5">${gp.alternative}</div></div>`:''}
    </div>`:''}

    <!-- Avertissement bio -->
    ${!glp1.hasBio?`<div style="padding:8px 16px;border-top:1px solid var(--orange);background:rgba(245,158,11,.08)">
      <div style="font-size:10px;color:var(--orange);font-weight:600">⚠ Profil base sur les donnees declaratives uniquement. La biologie (HOMA-IR, adiponectine, leptine, C-peptide, FGF21, glucagon) affinera significativement cette prediction.</div>
    </div>`:''}

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
  // 11. MODULE BTM v3.4 — Recommandation Thérapeutique Personnalisée
  // MOD-01 à MOD-10 conformes au Dossier Maître v3.4
  // ══════════════════════════════════════════════════════
  const btm=btm_decision();
  if(btm && btm.primary){
    const cmplxCol=['','var(--green)','var(--teal)','var(--orange)','var(--red)','var(--purple)'][btm.complexity]||'var(--accent)';
    const cmplxLbl=['','Simple','Modere','Complexe','Tres complexe','Maximal'][btm.complexity]||'';
    const besT=getBesTotal();
    const confCol=btm.confiance==='INDICATION CLAIRE'?'var(--green)':btm.confiance==='DISCUSSION PATIENT'?'var(--orange)':'var(--red)';
    r+=`<div style="margin-top:12px;border:2px solid var(--accent);border-radius:14px;overflow:hidden">
      <div style="background:linear-gradient(135deg,rgba(129,140,248,.15),rgba(56,189,248,.1));padding:14px 16px;border-bottom:1px solid rgba(129,140,248,.2)">
        <div style="font-size:14px;font-weight:800;color:var(--accent)">11. MODULE BTM v3.4 — Recommandation Therapeutique</div>
        <div style="font-size:10px;color:var(--dim2);margin-top:2px">Bariatric & Therapeutic Module — Scoring matriciel 27 facteurs x 6 techniques — 62+ etudes</div>
      </div>
      <div style="padding:12px 14px">
        <!-- 11.1 Score BTM Global + Confiance -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <div style="font-size:10px;color:var(--dim3)">Complexite</div>
          <div style="display:flex;gap:3px">${[1,2,3,4,5].map(i=>`<div style="width:20px;height:8px;border-radius:4px;background:${i<=btm.complexity?cmplxCol:'var(--bg2)'}"></div>`).join('')}</div>
          <div style="font-size:10px;font-weight:700;color:${cmplxCol}">${btm.complexity}/5 — ${cmplxLbl}</div>
          <div style="margin-left:auto;font-size:9px;font-weight:800;color:${confCol};background:${confCol}15;padding:2px 8px;border-radius:6px">${btm.confiance} (delta ${btm.delta_rel}%)</div>
        </div>
        ${btm.alarmes.length?btm.alarmes.map(a=>`<div style="background:rgba(239,68,68,.15);border:2px solid var(--red);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:12px;font-weight:800;color:var(--red)">⚠ ${a}</div>`).join(''):''}
        <!-- 11.2 Recommandation primaire (MOD-05/09) -->
        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:10px 12px;margin-bottom:8px">
          <div style="font-size:10px;color:var(--green);font-weight:700;text-transform:uppercase;margin-bottom:4px">★ Recommandation Primaire</div>
          <div style="font-size:14px;font-weight:800;color:var(--txt)">${btm.primary.name}</div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px">${btm.primary.reason}</div>
          <div style="font-size:10px;color:var(--dim2);margin-top:2px">[${btm.primary.tech}] — Score ${btm.score_brut[btm.primary.tech]||0} pts (${btm.score_pct[btm.primary.tech]||0}%)</div>
        </div>
        <!-- 11.3 Recommandation secondaire + delta -->
        ${btm.secondary?`<div style="background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.3);border-radius:10px;padding:10px 12px;margin-bottom:8px">
          <div style="font-size:10px;color:var(--cyan);font-weight:700;text-transform:uppercase;margin-bottom:4px">Alternative / Secondaire (delta relatif: ${btm.delta_rel}%)</div>
          <div style="font-size:13px;font-weight:700;color:var(--txt)">${btm.secondary.name}</div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px">${btm.secondary.reason}</div>
        </div>`:''}
        <!-- 11.4 Efficacité attendue -->
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          ${btm.tbwl?`<div style="flex:1;min-width:70px;background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:var(--accent)">${btm.tbwl}</div>
            <div style="font-size:9px;color:var(--dim3)">%TBWL estim. 12m</div>
          </div>`:''}
          ${btm.ewl?`<div style="flex:1;min-width:70px;background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:var(--teal)">${btm.ewl}</div>
            <div style="font-size:9px;color:var(--dim3)">%EWL estim. 24m</div>
          </div>`:''}
          <div style="flex:1;min-width:70px;background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-size:18px;font-weight:800;color:${besT>=27?'var(--red)':besT>=17?'var(--orange)':'var(--green)'}">${besT}</div>
            <div style="font-size:9px;color:var(--dim3)">BES-16 /46</div>
          </div>
        </div>
        <!-- Score par technique (MOD-09) -->
        <details style="margin-bottom:8px"><summary style="font-size:10px;color:var(--accent);font-weight:700;cursor:pointer">Scores par technique (6 familles)</summary>
          <div style="margin-top:4px;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
            ${['BT1','BT2','BT3','BT4','BT5','BT6'].map(t=>{
              const sc=btm.score_brut[t]||0;const pct=btm.score_pct[t]||0;
              const isPrim=btm.ranked[0]===t;
              return `<div style="background:${isPrim?'rgba(129,140,248,.15)':'var(--bg2)'};border-radius:6px;padding:4px 6px;text-align:center;border:${isPrim?'1px solid var(--accent)':'none'}">
                <div style="font-size:9px;color:var(--dim3)">${BT_NAMES[t]?.split(' ')[0]||t}</div>
                <div style="font-size:14px;font-weight:800;color:${sc>0?'var(--txt)':'var(--dim3)'}">${sc}</div>
                <div style="font-size:8px;color:var(--dim3)">${pct}%</div>
              </div>`;
            }).join('')}
          </div>
        </details>
        <!-- 11.5 Associations + BT-6 type -->
        ${btm.bt6_type?`<div style="background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.3);border-radius:8px;padding:8px 12px;margin-bottom:8px">
          <div style="font-size:10px;color:var(--purple);font-weight:700;margin-bottom:4px">BT-6 Association recommandee</div>
          <div style="font-size:12px;font-weight:700;color:var(--txt)">${btm.bt6_type.n}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px">TBWL 12m: ${btm.bt6_type.tbwl12} | DT2: ${btm.bt6_type.dt2r} | Grade ${btm.bt6_type.grade}</div>
        </div>`:''}
        ${btm.assoc.length?`<div style="margin-bottom:8px">
          <div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:4px">Associations recommandees</div>
          ${btm.assoc.map(a=>`<div style="font-size:11px;color:var(--dim);padding:3px 0;border-bottom:1px solid var(--bg2)">+ ${a}</div>`).join('')}
        </div>`:''}
        <!-- 11.6 Contre-indications -->
        ${btm.contraind.length?`<div style="margin-bottom:8px">
          <div style="font-size:10px;color:var(--red);font-weight:700;margin-bottom:4px">Contre-indications identifiees</div>
          ${btm.contraind.map(c=>`<div style="font-size:11px;color:var(--red);padding:3px 0">${c}</div>`).join('')}
        </div>`:''}
        <!-- 11.7 Parcours de soins -->
        ${btm.parcours.length?`<details><summary style="font-size:10px;color:var(--accent);font-weight:700;cursor:pointer">Parcours de soins optimise (${btm.parcours.length} etapes)</summary>
          <div style="margin-top:6px">${btm.parcours.map((p,i)=>`<div style="font-size:10px;color:var(--dim);padding:3px 0;border-left:2px solid var(--accent);padding-left:8px;margin-left:4px">${p}</div>`).join('')}</div>
        </details>`:''}
        <!-- Notes + FNC -->
        ${btm.notes.length?`<div style="margin-top:6px">${btm.notes.map(n=>`<div style="font-size:10px;color:var(--dim2);padding:2px 0;font-style:italic">${n}</div>`).join('')}</div>`:''}
        <!-- Facteurs actifs -->
        ${btm.facteurs_actifs.length?`<details style="margin-top:6px"><summary style="font-size:9px;color:var(--dim3);cursor:pointer">${btm.facteurs_actifs.length} facteurs actifs dans le scoring</summary>
          <div style="margin-top:4px;font-size:9px;color:var(--dim3)">${btm.facteurs_actifs.map(f=>f.f).join(', ')}</div>
        </details>`:''}
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════
  // 12. REFERENCES
  // ══════════════════════════════════════════════════════
  r+=`<div style="margin-top:8px;padding:10px 12px;background:var(--bg2);border-radius:10px;font-size:9px;color:var(--dim3);line-height:1.5">
    <b>References :</b> OMS | IDF 2006 | ADA 2024 | FINDRISC | IPAQ | PHQ-9 (Kroenke 2001) | PSS-10 (Cohen 1983) | ISI | BES-16 (Gormally 1982) | AUDIT-C | Lancet 2016 | BMJ 2016 WHtR | NEJM 1995 Leibel | NEJM 2011 Sumithran | SCORE2 | INTERHEART | DPP | STEP 1-5 | SURMOUNT 1-4 | STAMPEDE | SM-BOSS | MERIT | SOS Study | Biswas 2015 | Cappuccio 2008<br>
    <b>Score BMN v3.4</b> — Architecture CLEO (C+E+O+L) — BSD v4.9 + Bio v4.7.1 + BTM v2.0 + FNC v1.0 — Bach | Manos | Noel
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
