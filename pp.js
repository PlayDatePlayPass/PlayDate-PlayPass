/* PlayDate Pass v1 — shared schema, codec and card renderer. No network. */
(function(){
'use strict';
const PP={};
PP.ALLERGIES=[['n','None','✅'],['p','Peanuts','🥜'],['t','Tree Nuts','🌰'],['d','Dairy','🥛'],['e','Eggs','🥚'],['w','Wheat/Gluten','🌾'],['s','Soy','🫘'],['f','Shellfish','🦐'],['o','Other…','✏️']];
PP.DIET=[['n','None','✅'],['v','Vegetarian','🥦'],['g','Vegan','🌱'],['h','Halal','☪️'],['k','Kosher','✡️'],['f','GF','🌾'],['s','No Sugar','🍬'],['m','Minimal Sugar','🍭'],['o','Other…','✏️']];
PP.DIET_FULL={n:'No restrictions',f:'Gluten-free'};
PP.PHONE=[['n','No Phone','🚫','red','No phone'],['s','Supervised','👀','blue','Supervised only'],['a','Allowed','✅','green','Allowed']];
PP.SCREEN=[['n','None','🚫','red','None'],['m','Minimal','⏱️','yellow','Minimal'],['u','No Restrictions','✅','green','No restrictions']];
PP.SHORT=[['n','No','🚫','red','No'],['y','Yes','✅','green','Yes']];
PP.LIMITS=['30 minutes','1 hour','1.5 hours','2 hours','No more than 2 episodes','1 movie'];
PP.SLEEP=[['t','Comfort toy','🧸'],['l','Night-light','💡'],['b','Bathroom at night','🚽']];
PP.PICK=[['p',"I'm Picking Up",'🚗','blue','Pickup'],['d','Host Dropping Off','👋','green','Drop-off']];

const lab=(list,c,full)=>{const x=list.find(i=>i[0]===c);return x?(full&&x[4]?x[4]:x[1].replace('…','')):''};
PP.lab=lab;
PP.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
PP.digits=p=>String(p||'').replace(/[^\d+]/g,'');
PP.fmtTime=t=>{if(!t||!/^\d\d:\d\d$/.test(t))return'';const[h,m]=t.split(':').map(Number);return`${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;};
PP.firstName=n=>String(n||'').trim();

/* ---- display helpers on a profile/payload (same short keys used everywhere) ---- */
PP.allergyText=k=>{
  const a=(k.al||'').split('').filter(c=>c!=='o'&&c!=='n').map(c=>lab(PP.ALLERGIES,c));
  if((k.al||'').includes('o')&&k.ao)a.push(k.ao);
  if(a.length)return a.join(', ');
  if((k.al||'').includes('n'))return 'None';
  return '';
};
PP.dietText=k=>{
  const a=(k.dt||'').split('').filter(c=>c!=='o').map(c=>PP.DIET_FULL[c]||lab(PP.DIET,c));
  if((k.dt||'').includes('o')&&k.do)a.push(k.do);
  return a.join(', ');
};
PP.screenText=k=>{if(!k.st)return'';let s=lab(PP.SCREEN,k.st,1);if(k.st==='m'&&k.sl!=null&&PP.LIMITS[k.sl])s+=' ('+PP.LIMITS[k.sl]+')';return s;};
PP.sleepText=k=>{const a=(k.sn||'').split('').map(c=>lab(PP.SLEEP,c)).filter(Boolean);if(k.so)a.push(k.so);return a.join(', ');};
PP.contactText=c=>c&&(c[0]||c[1])?[c[0],c[1]].filter(Boolean).join(' · '):'';

/* ---- share field catalog: id, group, label, keys copied to payload, display(k), default ---- */
PP.FIELDS=[
 ['age','About','Age',['a'],k=>k.a?'Age '+k.a:''],
 ['al','Health & Safety','Food allergies',['al','ao'],k=>PP.allergyText(k)],
 ['as','Health & Safety','Allergy severity / what to do',['as'],k=>k.as||''],
 ['md','Health & Safety','Medications / medical notes',['md'],k=>k.md||''],
 ['dt','Food','Dietary preferences',['dt','do'],k=>PP.dietText(k)],
 ['lk','Food','Likes / dislikes',['lk'],k=>k.lk||''],
 ['ph','Screen Time & Tech','Phone / tablet use',['ph'],k=>k.ph?lab(PP.PHONE,k.ph,1):''],
 ['st','Screen Time & Tech','Screen time',['st','sl'],k=>PP.screenText(k)],
 ['tv','Screen Time & Tech','TV / movies allowed',['tv'],k=>k.tv||''],
 ['sf','Screen Time & Tech','Short-form videos',['sf'],k=>k.sf?lab(PP.SHORT,k.sf,1):''],
 ['bt','Bedtime & Sleepover','Bedtime',['bt'],k=>PP.fmtTime(k.bt)],
 ['sn','Bedtime & Sleepover','Sleep needs',['sn','so'],k=>PP.sleepText(k)],
 ['sx','Bedtime & Sleepover','Sensitive sleepover notes',['sx'],k=>k.sx||'',false],
 ['c1','Emergency Contacts','Emergency contact',['c1'],k=>PP.contactText(k.c1)],
 ['c2','Emergency Contacts','Second contact',['c2'],k=>PP.contactText(k.c2)],
 ['dr','Emergency Contacts','Doctor',['dr'],k=>PP.contactText(k.dr),false],
 ['nt','General','Other notes',['nt'],k=>k.nt||''],
].map(f=>({id:f[0],group:f[1],label:f[2],keys:f[3],show:f[4],def:f[5]!==false}));

/* ---- codec: JSON -> deflate-raw -> base64url, prefixed with a format letter ---- */
const b64u={
  enc(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');},
  dec(str){if(!/^[A-Za-z0-9_-]*$/.test(str))throw new Error('bad chars');str=str.replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';const b=atob(str);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
};
async function pipe(bytes,stream){const r=new Blob([bytes]).stream().pipeThrough(stream);return new Uint8Array(await new Response(r).arrayBuffer());}
PP.canCompress=typeof CompressionStream!=='undefined';
/* v2 fragments carry a 2-char FNV checksum after the version char, so a cut-off link is caught.
   v1 (legacy, still decoded): 'z'+b64u(deflate-raw(JSON)) or 'j'+b64u(JSON).
   v2 (current): positional fields joined by \x1f, empties dropped from the tail.
     '2'+b64u(utf8)                          -> uncompressed
     '3'+b64u(deflate-raw with preset DICT2) -> compressed (fflate, self-hosted)
   Encoder picks whichever is shorter. DICT2 is frozen: changing it needs a new version char. */
const SEP='\x1f';
const ORDER=['d','n','a','al','ao','as','md','dt','do','lk','c1n','c1p','pk','pt','nt','ph','st','sl','tv','sf','bt','sn','so','c2n','c2p','sx','drn','drp'];
const DICT2=new TextEncoder().encode('Grandma Grandpa Aunt Uncle Nanny Mom Dad Dr. allergic to nuts, no dairy, gluten free, dairy free, inhaler for asthma, EpiPen in backpack, call 911 and me right away. Benadryl if hives. Scared of dogs. Likes pizza, pasta, chicken nuggets, fruit, hates vegetables, mushrooms, spicy food. Bluey, Paw Patrol, Disney movies, G-rated, PG, any. Bedwetting, wears a pull-up. Comfort toy, night-light. Loves Minecraft, Lego, drawing. Please no candy or soda. ');
const EPOCH=Date.UTC(2020,0,1);
const toDays=d=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(d||'');return m?Math.round((Date.UTC(+m[1],m[2]-1,+m[3])-EPOCH)/864e5).toString(36):'';};
const fromDays=s=>{if(!s)return'';const t=new Date(EPOCH+parseInt(s,36)*864e5);return`${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')}`;};
const toMin=t=>{const m=/^(\d\d):(\d\d)$/.exec(t||'');return m?(m[1]*60+ +m[2]).toString(36):'';};
const fromMin=s=>{if(!s)return'';const n=parseInt(s,36);return`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
const clean=v=>String(v==null?'':v).replace(/[\x00-\x09\x0b-\x1f]/g,' ').trim();
PP.pack=function(o){
  const f={d:toDays(o.d),n:o.n,a:o.a,al:o.al,ao:o.ao,as:o.as,md:o.md,dt:o.dt,do:o.do,lk:o.lk,
    c1n:o.c1&&o.c1[0],c1p:o.c1&&PP.digits(o.c1[1]),pk:o.pk,pt:toMin(o.pt),nt:o.nt,ph:o.ph,st:o.st,
    sl:o.sl==null||o.sl===''?'':String(o.sl),tv:o.tv,sf:o.sf,bt:toMin(o.bt),sn:o.sn,so:o.so,
    c2n:o.c2&&o.c2[0],c2p:o.c2&&PP.digits(o.c2[1]),sx:o.sx,drn:o.dr&&o.dr[0],drp:o.dr&&PP.digits(o.dr[1])};
  const arr=ORDER.map(k=>clean(f[k]));while(arr.length&&!arr[arr.length-1])arr.pop();
  return arr.join(SEP);
};
const fmtP=d=>{if(!d)return'';const x=d.replace(/^\+?1(?=\d{10}$)/,'');return/^\d{10}$/.test(x)?`(${x.slice(0,3)}) ${x.slice(3,6)}-${x.slice(6)}`:d;};
PP.unpack=function(str){
  const a=str.split(SEP),g={};ORDER.forEach((k,i)=>g[k]=a[i]||'');
  const o={v:1,n:g.n,d:fromDays(g.d)};
  ['a','al','ao','as','md','dt','do','lk','pk','nt','ph','st','tv','sf','sn','so','sx'].forEach(k=>{if(g[k])o[k]=g[k];});
  if(g.pt)o.pt=fromMin(g.pt);if(g.bt)o.bt=fromMin(g.bt);if(g.sl!=='')o.sl=+g.sl;
  [['c1','c1n','c1p'],['c2','c2n','c2p'],['dr','drn','drp']].forEach(([k,n,p])=>{if(g[n]||g[p])o[k]=[g[n],fmtP(g[p])];});
  return o;
};
const hash=b=>{let h=0x811c9dc5;for(const x of b){h^=x;h=Math.imul(h,16777619)>>>0;}return(h%1296).toString(36).padStart(2,'0');};
PP.encode=async function(obj){
  const raw=new TextEncoder().encode(PP.pack(obj)),h=hash(raw);
  let best='2'+h+b64u.enc(raw);
  if(window.fflate){try{const z='3'+h+b64u.enc(fflate.deflateSync(raw,{level:9,dictionary:DICT2}));if(z.length<best.length)best=z;}catch(e){}}
  return best;
};
PP.decode=async function(frag){
  frag=String(frag||'').replace(/^#/,'').trim();
  try{frag=decodeURIComponent(frag);}catch(e){}
  if(frag.length<3)throw new Error('empty');
  const kind=frag[0],v2=kind==='2'||kind==='3',body=b64u.dec(frag.slice(v2?3:1));
  let bytes,obj;
  if(kind==='z'){
    if(typeof DecompressionStream==='undefined')throw new Error('nodecomp');
    bytes=await pipe(body,new DecompressionStream('deflate-raw'));
  }else if(kind==='j'||kind==='2')bytes=body;
  else if(kind==='3'){if(!window.fflate)throw new Error('nodecomp');bytes=fflate.inflateSync(body,{dictionary:DICT2});}
  else throw new Error('kind');
  if(v2&&hash(bytes)!==frag.slice(1,3))throw new Error('checksum');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(kind==='z'||kind==='j')obj=JSON.parse(text);else obj=PP.unpack(text);
  if(!obj||typeof obj!=='object'||obj.v!==1||typeof obj.n!=='string'||!obj.n.trim())throw new Error('shape');
  return obj;
};
PP.shareBase=()=>new URL('./',location.href).href;
PP.introLine=n=>`${PP.firstName(n)}'s Play Pass 👇`;

/* ---- card renderer (used by card.html and the Share preview) ---- */
const DOTS=['#E8272A','#1B6FE8','#1DB954','#F5C400'];
PP.renderCard=function(k){
  const e=PP.esc;let i=0;
  const row=(l,v)=>v?`<div class="info-row"><div class="info-dot" style="background:${DOTS[i++%4]}"></div><div><div class="info-key">${e(l)}</div><div class="info-val">${e(v)}</div></div></div>`:'';
  let h='';
  h+=`<div style="padding-top:20px"><div class="card-name">${e(PP.firstName(k.n))}</div>`;
  const sub=[k.a?'Age '+k.a:'',k.d?'Shared '+PP.fmtDate(k.d):''].filter(Boolean).join(' · ');
  if(sub)h+=`<div class="card-sub">${e(sub)}</div>`;
  h+='</div>';
  // 1. allergy / medical banner
  const al=PP.allergyText(k),hasAl=al&&al!=='None',med=[k.as,k.md].filter(Boolean);
  if(hasAl||med.length){
    h+='<div class="banner red" role="alert">';
    h+=`<div class="bk">⚠️ Allergies</div><div class="bv">${hasAl?e(al):(al==='None'?'No known allergies':'Not provided')}</div>`;
    if(k.as)h+=`<div class="bk">What to do</div><div class="bv small">${e(k.as)}</div>`;
    if(k.md)h+=`<div class="bk">Medications / medical</div><div class="bv small">${e(k.md)}</div>`;
    h+='</div>';
  }else if(al==='None')h+='<div class="banner green">✅ No known allergies</div>';
  else h+='<div class="banner gray">Allergies: not provided</div>';
  // 2. dietary
  h+=row('Diet',PP.dietText(k))+row('Likes / dislikes',k.lk);
  // 3. preferences / notes
  h+=row('Notes',k.nt);
  // 4. screen time & tech
  h+=row('Phone / tablet',k.ph?lab(PP.PHONE,k.ph,1):'')+row('Screen time',PP.screenText(k))+row('TV / movies',k.tv)+row('Short videos',k.sf?lab(PP.SHORT,k.sf,1):'');
  // 5. bedtime / sleepover
  h+=row('Bedtime',PP.fmtTime(k.bt))+row('Sleep needs',PP.sleepText(k))+row('Sleepover note',k.sx);
  // 6. pickup / drop-off
  if(k.pk||k.pt){const t=PP.fmtTime(k.pt);h+=row(k.pk==='d'?'Host drop-off':k.pk==='p'?'Parent pickup':'Pickup / drop-off',(k.pk==='d'?'Please drop off':k.pk==='p'?'Picking up':'')+(t?(k.pk?' at ':'')+t:''));}
  // 7. tap-to-call
  const calls=[];
  [[k.c1,'📞',''],[k.c2,'📞',''],[k.dr,'🩺','doc']].forEach(([c,ic,cls],j)=>{
    if(!c||!(c[0]||c[1]))return;
    const d=PP.digits(c[1]);const nm=(c[0]||'')+(cls?(c[0]?' (doctor)':'Doctor'):'');
    calls.push(d?`<a class="call ${cls}" href="tel:${e(d)}"><span class="ic">${ic}</span><span><span class="cn">${e(nm||'Emergency contact')}</span><br><span class="cp">${e(c[1])}</span></span></a>`
      :`<div class="call ${cls}"><span class="ic">${ic}</span><span class="cn">${e(nm)}</span></div>`);
  });
  if(calls.length)h+=`<div class="group-title" style="margin-top:24px">Emergency contacts</div>`+calls.join('');
  return h;
};
PP.fmtDate=d=>{const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(d||'');if(!m)return d;try{return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});}catch(e){return d;}};
PP.today=()=>{const t=new Date();return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;};
PP.isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
PP.copy=async function(text){
  try{await navigator.clipboard.writeText(text);return true;}catch(e){}
  const t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.cssText='position:fixed;top:0;left:0;opacity:0;';document.body.appendChild(t);
  t.select();t.setSelectionRange(0,text.length);let ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(t);return ok;
};
PP.toast=function(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}t.textContent=msg;t.style.display='block';clearTimeout(PP._tt);PP._tt=setTimeout(()=>t.style.display='none',2200);};
window.PP=PP;
})();
