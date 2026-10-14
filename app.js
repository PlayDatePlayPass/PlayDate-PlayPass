(function(){
'use strict';
const e=PP.esc,$=s=>document.querySelector(s);let view=$('#view');
const KEY='pp1';
let db={kids:[]};
function load(){try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&Array.isArray(d.kids))db=d;}else migrateOld();}catch(x){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch(x){PP.toast('Could not save on this phone');}}
function migrateOld(){ // one-time import of the old single-kid app (key pd9). Photos and last names are dropped.
  try{const o=JSON.parse(localStorage.getItem('pd9')||'null');if(!o||!o.childName)return;
    const rev=(list,val)=>{const x=list.find(i=>i[4]===val||i[1]===val);return x?x[0]:'';};
    const amap={None:'n',Peanuts:'p','Tree Nuts':'t',Dairy:'d',Eggs:'e','Wheat/Gluten':'w',Soy:'s',Shellfish:'f'};
    const dmap={'No restrictions':'n',Vegetarian:'v',Vegan:'g',Halal:'h',Kosher:'k','Gluten-free':'f','No Sugar':'s','Minimal Sugar':'m'};
    const k=newKid();k.n=String(o.childName).trim().split(/\s+/)[0];k.a=o.childAge||'';
    k.al=(o.allergies||[]).map(a=>amap[a]||'').join('')+(o.allergyOther?'o':'');k.ao=o.allergyOther||'';
    k.dt=(o.diet||[]).map(a=>dmap[a]||'').join('')+(o.dietOther?'o':'');k.do=o.dietOther||'';
    k.md=o.medications||'';k.tv=o.tvShows||'';k.nt=o.otherNotes||'';
    k.ph={'No phone':'n','Supervised only':'s',Allowed:'a'}[o.phone]||'';k.st={None:'n',Minimal:'m','No Restrictions':'u'}[o.screentime]||'';
    const li=PP.LIMITS.indexOf(o.screenTimeLimit);if(li>=0)k.sl=li;k.sf={No:'n',Yes:'y'}[o.shortform]||'';
    k.c1=[o.emergencyContact||'',o.emergencyPhone||''];k.dr=[o.doctorName||'',o.doctorPhone||''];
    db.kids.push(k);save();
  }catch(x){}
}
function newKid(){return{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),n:'',a:'',al:'',ao:'',as:'',md:'',dt:'',do:'',lk:'',ph:'',st:'',sl:null,tv:'',sf:'',bt:'',sn:'',so:'',sx:'',c1:['',''],c2:['',''],dr:['',''],nt:''};}
const kidById=id=>db.kids.find(k=>k.id===id);
function fmtPhone(v){let x=v.replace(/\D/g,'');if(x.length>10||v.trim().startsWith('+'))return v.replace(/[^\d+() -]/g,'');if(x.length>6)return`(${x.slice(0,3)}) ${x.slice(3,6)}-${x.slice(6)}`;if(x.length>3)return`(${x.slice(0,3)}) ${x.slice(3)}`;return x.length?`(${x}`:'';}

/* ---------------- HOME ---------------- */
function badge(k){const a=PP.allergyText(k);if(!a)return'<span class="badge gray">Allergies not added</span>';if(a==='None')return'<span class="badge green">✅ No known allergies</span>';return`<span class="badge red">⚠️ ${e(a)}</span>`;}
function home(){
  if(!db.kids.length){location.replace('#new');return;}
  view.innerHTML=`<h1 class="title">My Kids</h1>
  ${db.kids.map(k=>`<div class="kid-tile"><div class="kid-name">${e(k.n)}</div>${k.a?`<div class="kid-age">Age ${e(k.a)}</div>`:''}${badge(k)}
   <div class="tile-actions"><a class="btn btn-green" style="font-size:18px" href="#share/${k.id}">💬 Share</a><a class="btn" href="#edit/${k.id}">✏️ Edit</a></div></div>`).join('')}
  <a class="btn btn-black" style="margin-top:20px" href="#new">+ Add a kid</a>
  <div class="divider"></div>
  <div class="notice">💾 Your kids' info is saved <strong>only on this phone</strong>. Clearing browser data or switching phones deletes it, so keep a backup.</div>
  <div style="display:flex;gap:10px"><button class="btn" id="export">⬇️ Export backup</button><button class="btn" id="import">⬆️ Import backup</button></div>`;
  $('#export').onclick=exportBackup;$('#import').onclick=()=>{$('#import-file').value='';$('#import-file').click();};
}
function exportBackup(){
  const data=JSON.stringify({app:'playdate-pass',v:1,exported:new Date().toISOString(),kids:db.kids},null,1);
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`playdate-pass-backup-${PP.today()}.json`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);PP.toast('Backup saved to Downloads');
}
$('#import-file').addEventListener('change',async ev=>{
  const f=ev.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());if(!d||d.app!=='playdate-pass'||!Array.isArray(d.kids))throw 0;
    const kids=d.kids.filter(k=>k&&typeof k.n==='string'&&k.n.trim()&&typeof k.id==='string');
    if(!confirm(`Import ${kids.length} kid${kids.length===1?'':'s'} from this backup? Kids with the same profile will be replaced by the backup copy.`))return;
    kids.forEach(k=>{const full=Object.assign(newKid(),k);const i=db.kids.findIndex(x=>x.id===k.id);if(i>=0)db.kids[i]=full;else db.kids.push(full);});
    save();PP.toast(`Imported ${kids.length}`);route();
  }catch(x){alert("That file doesn't look like a PlayDate Pass backup.");}
});

/* ---------------- EDIT ---------------- */
const chips=(key,list,cls,excl)=>`<div class="cb-grid ${cls||''}" data-chips="${key}" ${excl?'data-excl="n"':''}>${list.map(c=>`<button type="button" class="cb-item" data-c="${c[0]}"><span class="cb-label">${c[2]} ${e(c[1])}</span></button>`).join('')}</div>`;
const radios=(key,list)=>`<div class="radio-group" data-radio="${key}">${list.map(c=>`<button type="button" class="radio-item" data-c="${c[0]}" data-col="${c[3]}"><span class="ri-emoji">${c[2]}</span><span class="ri-label">${e(c[1])}</span></button>`).join('')}</div>`;
const txt=(key,label,ph,opt={})=>`<div class="field" ${opt.wrap||''}><label for="f-${key}">${label}</label>${opt.area?`<textarea id="f-${key}" data-k="${key}" rows="${opt.area}" placeholder="${e(ph)}" maxlength="${opt.max||300}"></textarea>`:`<input type="${opt.type||'text'}" id="f-${key}" data-k="${key}" placeholder="${e(ph)}" maxlength="${opt.max||80}" ${opt.attrs||''}/>`}</div>`;
function edit(id){
  const isNew=!id;let k=isNew?newKid():kidById(id);
  if(!k){location.replace('#home');return;}
  const others=db.kids.filter(x=>x.id!==k.id);
  view.innerHTML=`
  ${others.length?`<div class="notice" style="margin-top:20px"><label for="copyfrom" class="field-label" style="margin-bottom:8px">👯 Copy from…</label><select id="copyfrom"><option value="">Copy shared info from a sibling…</option>${others.map(o=>`<option value="${o.id}">${e(o.n)}</option>`).join('')}</select><div class="hint" style="margin-top:6px">Fills in emergency contacts, doctor and screen-time rules.</div></div>`:''}
  <div class="sec-head"><h2>About Your Child</h2></div>
  <div class="field"><label for="f-n">First Name <span style="color:var(--red)">*</span></label><input type="text" id="f-n" data-k="n" placeholder="e.g. Sophie" maxlength="30" autocomplete="off" autocapitalize="words"/><div class="hint" style="margin-top:6px">First name only. No last names, ever.</div></div>
  <div class="field"><label for="f-a">Age</label><select id="f-a" data-k="a"><option value="">Select age…</option>${Array.from({length:17},(_,i)=>`<option>${i+1}</option>`).join('')}</select></div>

  <div class="sec-head"><h2>Health &amp; Safety</h2></div>
  <div class="field"><div class="field-label">Food Allergies</div>${chips('al',PP.ALLERGIES,'',1)}
   <div id="ao-wrap" style="margin-top:10px;display:none"><input type="text" data-k="ao" placeholder="Describe other allergy…" maxlength="80"/></div>
   <div class="hint" id="al-nudge" style="margin-top:8px;color:var(--red)">Tip: even "None" helps the host.</div></div>
  <div class="field"><label for="f-as">Allergy severity / what to do</label><textarea id="f-as" data-k="as" rows="2" maxlength="200" placeholder="e.g. EpiPen in backpack, call 911"></textarea></div>
  <div class="field"><label for="f-md">Medications / Medical Notes</label><textarea id="f-md" data-k="md" rows="2" maxlength="200" placeholder="e.g. Inhaler for asthma — or 'None'"></textarea></div>
  <div class="divider"></div>
  <div class="field"><div class="field-label">Dietary Preferences</div>${chips('dt',PP.DIET,'cols3',1)}
   <div id="do-wrap" style="margin-top:10px;display:none"><input type="text" data-k="do" placeholder="Other dietary preference…" maxlength="80"/></div></div>
  ${txt('lk','Likes / dislikes','e.g. Loves pasta, hates mushrooms',{max:120})}

  <div class="sec-head"><h2>Screen Time &amp; Tech</h2></div>
  <div class="field"><div class="field-label">Phone / Tablet Use</div>${radios('ph',PP.PHONE)}</div>
  <div class="field"><div class="field-label">Screen Time Allowed</div>${radios('st',PP.SCREEN)}</div>
  <div class="field" id="sl-wrap" style="display:none"><label for="f-sl">Time Limit</label><select id="f-sl" data-k="sl"><option value="">Choose limit…</option>${PP.LIMITS.map((l,i)=>`<option value="${i}">${e(l)}</option>`).join('')}</select></div>
  <div class="field"><label for="f-tv">TV Shows / Movies Allowed</label><textarea id="f-tv" data-k="tv" rows="2" maxlength="150" placeholder="e.g. Bluey, Paw Patrol, any G-rated movie…"></textarea></div>
  <div class="field"><div class="field-label">Short-Form Videos Allowed?<br><span class="hint">(YouTube Shorts, TikTok, etc.)</span></div>${radios('sf',PP.SHORT)}</div>

  <div class="sec-head"><h2>Bedtime &amp; Sleepover</h2></div>
  <div class="field"><label for="f-bt">Bedtime</label><input type="time" id="f-bt" data-k="bt"/></div>
  <div class="field"><div class="field-label">Sleep needs</div>${chips('sn',PP.SLEEP,'')}<input type="text" data-k="so" placeholder="Anything else for sleep…" maxlength="100" style="margin-top:10px"/></div>
  <div class="field"><label for="f-sx">Sensitive sleepover notes 🔒</label><textarea id="f-sx" data-k="sx" rows="2" maxlength="150" placeholder="e.g. Bedwetting, wears a pull-up"></textarea><div class="hint" style="margin-top:6px">Never shared unless you tick it on the Share screen each time.</div></div>

  <div class="sec-head"><h2>Emergency Contacts</h2></div>
  ${txt('c1.0','Emergency Contact','Mom / Dad / Grandma…')}${txt('c1.1','Emergency Phone','(555) 000-0000',{type:'tel',max:20,attrs:'inputmode="tel" autocomplete="tel"'})}
  <div class="hint" id="c-nudge" style="margin:-12px 0 20px;color:var(--red)">Tip: add at least one contact and phone.</div>
  ${txt('c2.0','Second Contact (optional)','e.g. Dad')}${txt('c2.1','Second Phone','(555) 000-0000',{type:'tel',max:20,attrs:'inputmode="tel"'})}
  <div class="divider"></div>
  ${txt('dr.0',"Doctor's Name",'Dr. Smith')}${txt('dr.1',"Doctor's Phone",'(555) 000-0000',{type:'tel',max:20,attrs:'inputmode="tel"'})}
  <div class="hint" style="margin:-12px 0 20px">Doctor is never shared unless you tick it on the Share screen.</div>

  <div class="sec-head"><h2>General Info</h2></div>
  <div class="field"><label for="f-nt">Other Notes</label><textarea id="f-nt" data-k="nt" rows="4" maxlength="300" placeholder="e.g. Scared of dogs, likes quiet time after lunch…"></textarea><div class="hint" style="margin-top:6px">Pickup / drop-off time is added on the Share screen, since it changes every play date.</div></div>

  <div class="notice">💾 Saved on this phone as you type.</div>
  <button class="btn btn-green" id="done">Done →</button>
  <button class="btn btn-red-outline" id="del" ${isNew?'style="display:none"':''}>Delete kid</button>`;

  const getK=key=>{const[a,b]=key.split('.');return b==null?k[a]:(k[a]||['',''])[+b];};
  const setK=(key,val)=>{const[a,b]=key.split('.');if(b==null)k[a]=val;else{k[a]=(k[a]||['','']).slice();k[a][+b]=val;}};
  let saved=!isNew;
  function persist(){
    if(!k.n.trim()){return;} // name required before anything is stored
    if(!saved){db.kids.push(k);saved=true;history.replaceState(null,'','#edit/'+k.id);$('#del').style.display='';}
    save();
  }
  function paint(){
    view.querySelectorAll('[data-k]').forEach(i=>{const v=getK(i.dataset.k);i.value=v==null?'':v;});
    view.querySelectorAll('[data-chips]').forEach(g=>g.querySelectorAll('.cb-item').forEach(b=>b.classList.toggle('checked',(k[g.dataset.chips]||'').includes(b.dataset.c))));
    view.querySelectorAll('[data-radio]').forEach(g=>g.querySelectorAll('.radio-item').forEach(b=>{b.className='radio-item'+(k[g.dataset.radio]===b.dataset.c?' sel-'+b.dataset.col:'');}));
    $('#ao-wrap').style.display=k.al.includes('o')?'block':'none';$('#do-wrap').style.display=k.dt.includes('o')?'block':'none';
    $('#sl-wrap').style.display=k.st==='m'?'block':'none';
    $('#al-nudge').style.display=k.al?'none':'block';$('#c-nudge').style.display=(k.c1[0]||k.c1[1]||k.c2[1])?'none':'block';
  }
  view.addEventListener('input',ev=>{const i=ev.target;if(!i.dataset||!i.dataset.k)return;
    if(i.type==='tel'){i.value=fmtPhone(i.value);}
    let v=i.value;if(i.dataset.k==='sl')v=v===''?null:+v;setK(i.dataset.k,v);persist();
    if(i.dataset.k.startsWith('c')||i.dataset.k==='n')paint();});
  view.addEventListener('change',ev=>{const i=ev.target;if(i.dataset&&i.dataset.k){let v=i.value;if(i.dataset.k==='sl')v=v===''?null:+v;setK(i.dataset.k,v);persist();}});
  view.addEventListener('click',ev=>{
    const b=ev.target.closest('.cb-item,.radio-item');if(!b)return;
    const g=b.parentElement;
    if(g.dataset.chips){const key=g.dataset.chips,c=b.dataset.c;let s=k[key]||'';
      if(s.includes(c))s=s.replace(c,'');else if(g.dataset.excl&&c==='n')s='n';else s=s.replace('n','')+c;
      k[key]=s;}
    else if(g.dataset.radio){const key=g.dataset.radio;k[key]=k[key]===b.dataset.c?'':b.dataset.c;}
    paint();persist();
  });
  const cf=$('#copyfrom');if(cf)cf.onchange=()=>{const o=kidById(cf.value);cf.value='';if(!o)return;
    if(!confirm(`Copy emergency contacts, doctor and screen-time rules from ${o.n}? This replaces those fields here.`))return;
    ['c1','c2','dr'].forEach(f=>k[f]=(o[f]||['','']).slice());['ph','st','sl','tv','sf'].forEach(f=>k[f]=o[f]);
    paint();persist();PP.toast('Copied from '+o.n);};
  $('#done').onclick=()=>{if(!k.n.trim()){if(confirm("Add a first name to save this kid. Leave without saving?"))location.hash='#home';else $('#f-n').focus();return;}persist();location.hash='#home';};
  $('#del').onclick=()=>{if(confirm(`Delete ${k.n||'this kid'}'s pass from this phone? This can't be undone.`)){db.kids=db.kids.filter(x=>x.id!==k.id);save();location.hash='#home';}};
  paint();if(isNew)setTimeout(()=>$('#f-n').focus(),50);
}

/* ---------------- SHARE ---------------- */
function share(id){
  const k=kidById(id);if(!k){location.replace('#home');return;}
  const sel={};PP.FIELDS.forEach(f=>sel[f.id]=f.def); // doctor & sensitive notes: always unticked by default, every share
  const st={pk:'',pt:''};
  const filled=PP.FIELDS.filter(f=>f.show(k));
  const groups=[...new Set(filled.map(f=>f.group))];
  view.innerHTML=`<h1 class="title">Share ${e(k.n)}'s pass</h1>
  <div class="field-label" style="margin-top:12px">Today's play date</div>
  ${radios('pk',PP.PICK)}
  <div class="field" style="margin-top:14px"><label for="pt" id="pt-label">Time</label><input type="time" id="pt"/></div>
  <div class="group-title">What to include</div>
  <div class="hint">Untick anything this host doesn't need.</div>
  <label class="check-row" style="cursor:default"><input type="checkbox" checked disabled/><div><div class="k">First name</div><div class="vv">${e(k.n)}</div></div></label>
  ${groups.map(g=>`<div class="group-title" style="font-size:20px">${e(g)}</div>`+filled.filter(f=>f.group===g).map(f=>`<label class="check-row"><input type="checkbox" data-f="${f.id}" ${sel[f.id]?'checked':''}/><div><div class="k">${e(f.label)}${f.def?'':'<span class="tag">🔒 off by default</span>'}</div><div class="vv">${e(f.show(k))}</div></div></label>`).join('')).join('')}
  ${filled.some(f=>f.id==='al')?'':'<div class="notice warn" style="margin-top:14px">No allergies entered, so the card will say <strong>"Allergies: not provided"</strong>. <a href="#edit/'+k.id+'">Add them</a></div>'}
  <div id="len" class="len"></div><div id="lenmsg"></div>
  <div class="field-label" style="margin-top:14px">Message preview</div><div class="linkbox" id="msgprev" style="font-size:14px;color:var(--black);white-space:pre-wrap;max-height:none"></div>
  <button class="btn btn-green" id="text">💬 Text it</button>
  <button class="btn btn-black" id="copy">🔗 Copy link</button>
  <div class="hint" style="margin-top:6px">Copies just the link, so you can paste it into any chat.</div>
  <button class="btn" id="prev">👀 Preview card</button>
  <div id="preview" style="display:none;border:2px solid var(--black);border-radius:16px;padding:0 16px 16px;margin-top:12px"></div>
  <div class="notice" style="margin-top:20px;font-size:14px"><strong>Before you send:</strong> anyone who has this link can read the card, even if the host forwards it. It never expires, stays in their texts and can be screenshotted. You can't unsend it, and the app can't tell if the host opened it. Share only what this host needs.</div>
  <a class="btn" href="#home">← Back to My Kids</a>`;
  let link='',busy=null;
  function payload(){
    const p={v:1,n:PP.firstName(k.n),d:PP.today()};
    filled.forEach(f=>{if(sel[f.id])f.keys.forEach(x=>{const v=k[x];if(v!=null&&v!==''&&!(Array.isArray(v)&&!v[0]&&!v[1]))p[x]=v;});});
    if(st.pk)p.pk=st.pk;if(st.pt)p.pt=st.pt;
    return p;
  }
  async function regen(){
    const my=busy={};const p=payload();const frag=await PP.encode(p);if(busy!==my)return;
    link=PP.shareBase()+'#'+frag;
    const n=link.length,L=$('#len'),M=$('#lenmsg');
    L.textContent=`Link length: ${n} characters`+(n<=800?' ✓':'');
    $('#text').disabled=$('#copy').disabled=n>2000;
    M.innerHTML=n>2000?'<div class="notice bad">This link is too long to text reliably. Untick some fields or shorten long notes.</div>':n>1500?'<div class="notice warn">Long notes make the link long, so try trimming.</div>':'';
    if($('#preview').style.display==='block')$('#preview').innerHTML=PP.renderCard(p);
    window.__lastLink=link;$('#msgprev').textContent=PP.introLine(k.n)+'\n'+link;
  }
  view.addEventListener('change',ev=>{const c=ev.target;if(c.dataset&&c.dataset.f){sel[c.dataset.f]=c.checked;regen();}});
  view.querySelector('[data-radio="pk"]').addEventListener('click',ev=>{const b=ev.target.closest('.radio-item');if(!b)return;st.pk=st.pk===b.dataset.c?'':b.dataset.c;
    b.parentElement.querySelectorAll('.radio-item').forEach(r=>r.className='radio-item'+(r.dataset.c===st.pk?' sel-'+r.dataset.col:''));
    $('#pt-label').textContent=st.pk==='p'?'Pickup Time':st.pk==='d'?'Drop Off Time':'Time';regen();});
  $('#pt').addEventListener('input',ev=>{st.pt=ev.target.value;regen();});
  $('#copy').onclick=async()=>{await regen();PP.toast(await PP.copy(link)?'Link copied ✓':'Press and hold the link to copy');if(!$('#rawlink')){const d=document.createElement('div');d.id='rawlink';d.className='linkbox';$('#copy').after(d);}$('#rawlink').textContent=link;};
  $('#text').onclick=async()=>{
    await regen();const intro=PP.introLine(k.n);
    // Web Share: intro as text, link as url (no duplicate link). Fallback: sms: with intro on its own line.
    if(navigator.share){try{await navigator.share({text:intro,url:link});return;}catch(err){if(err&&err.name==='AbortError')return;}}
    const sms=(PP.isIOS()?'sms:&body=':'sms:?body=')+encodeURIComponent(intro+'\n'+link);window.__lastSms=sms;if(!window.__ppNoNav)location.href=sms;
    setTimeout(()=>PP.toast('No Messages app? Use Copy link'),1500);
  };
  $('#prev').onclick=()=>{const p=$('#preview');const show=p.style.display!=='block';p.style.display=show?'block':'none';$('#prev').textContent=show?'Hide preview':'👀 Preview card';if(show)p.innerHTML=PP.renderCard(payload());};
  regen();
}

/* ---------------- ROUTER ---------------- */
function route(){
  const h=location.hash.slice(1);window.scrollTo(0,0);
  let m;
  if(h==='new')edit(null);
  else if((m=/^edit\/(.+)$/.exec(h)))edit(m[1]);
  else if((m=/^share\/(.+)$/.exec(h)))share(m[1]);
  else home();
}
// fresh view element per route so old listeners are dropped
window.addEventListener('hashchange',()=>{const n=view.cloneNode(false);view.replaceWith(n);viewRef(n);route();});
function viewRef(n){view=n;}
load();route();
})();
