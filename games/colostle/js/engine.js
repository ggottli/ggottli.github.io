/* =====================================================================
   ENGINE — table lookup, deck, state, persistence
   ===================================================================== */
// Normalise range tables into per-rank maps
for (const id in TABLES){ const T=TABLES[id]; if(T.ranges){ T.all={}; for(const [a,b,e] of T.ranges){ for(let r=a;r<=b;r++) T.all[r]=e; } } }
const EXPLORE_TABLES = ['land','ocean','battlements','tundroom','rafters','crackways','market','crescents','guildtown','lanes'];
const QUARTER_BY_SUIT = {D:'market',S:'crescents',H:'guildtown',C:'lanes'};

function lookup(tid, c){
  const T=TABLES[tid]; if(!T) return {t:'?',d:''};
  const col = isRed(c)?'red':'black';
  let e=null;
  if(c.r>=11 && T.face && T.face[c.r]) e=T.face[c.r];
  else if(T.all) e=T.all[c.r];
  else if(T[col]) e=T[col][c.r];
  if(!e) return {t:'—',d:''};
  let mod=null;
  if(e.m){ mod = e.m[c.s] ?? e.m[col==='red'?'R':'B'] ?? null; }
  return Object.assign({}, e, {mod, card:c, table:tid});
}
function rangeLookup(ranges, r){ for(const row of ranges){ if(r>=row[0]&&r<=row[1]) return row; } return null; }

/* ---------- Deck ---------- */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function freshDeck(){ const d=[]; for(const s of ['S','H','C','D']) for(let r=1;r<=13;r++) d.push({r,s}); return {draw:shuffle(d), discard:[], reshuffles:0}; }
function drawCards(adv, n, opts={}){
  const out=[]; const deck=adv.deck; const aside=[]; // skipFace: face cards go to the bottom of the pile afterwards
  for(let i=0;i<n;i++){
    if(deck.draw.length===0){ if(deck.discard.length===0) break; deck.draw=shuffle(deck.discard); deck.discard=[]; deck.reshuffles=(deck.reshuffles||0)+1; toast('Draw pile empty — discards reshuffled'); }
    const c=deck.draw.pop();
    if(opts.skipFace && c.r>=11){ aside.push(c); i--; if(aside.length>=12 && deck.draw.length===0 && deck.discard.length===0) break; continue; }
    if(!opts.hold) deck.discard.push(c);
    out.push(c);
  }
  if(aside.length) deck.draw.unshift(...aside);
  return out;
}
function discardCards(adv, cards){ for(const c of cards) adv.deck.discard.push(c); }
function deckHTML(adv){ const d=adv.deck; return `<span class="minideck"><span class="stack ${d.draw.length?'':'empty'}"></span><span><b>${d.draw.length}</b> to draw<br><b>${d.discard.length}</b> discarded</span></span>`; }

/* ---------- State ---------- */
const LS_KEY='colostle-companion-v1';
const uid = () => Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
function newAdventure(name){
  return { id:uid(), createdAt:Date.now(), updatedAt:Date.now(),
    name:name||'', companion:'', cls:'armed', look:'', calling:'', callingTitle:'', nature:'', weapon:'',
    exp:3, com:4, baseExp:3, baseCom:4, treasures:0, inventory:[], notes:'',
    location:'land', clues:0, crew:1, rookhome:false, rooknaught:false, within:false,
    modules:{elite:false, altRewards:false},
    deck:freshDeck(), phase:null, combat:null, city:null, quest:null, parapetteVisited:false,
    map:{cells:{}, w:12, h:8}, journalCount:0 };
}
let state = { adventures:[], activeId:null, theme:'auto', tab:'character', journal:{} /* advId -> entries[] */ };
function adv(){ return state.adventures.find(a=>a.id===state.activeId) || null; }
function journalOf(id){ if(!state.journal[id]) state.journal[id]=[]; return state.journal[id]; }

function loadLocal(){
  try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const s=JSON.parse(raw); if(s && Array.isArray(s.adventures)) state=Object.assign(state,s); } }catch(e){}
  if(!state.journal) state.journal={};
  if(state.activeId && !adv()) state.activeId=null;
}
function saveLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }

/* ---------- Saving (this browser only) ---------- */
// Progress lives in localStorage. Use Export / Import on the Character tab to move it between devices.
const cloud = { ready:false, status:'local', dirtyAdv:new Set(), dirtyEntries:new Set(), dirtyIndex:false, deletedEntries:[], deletedAdv:[] };
let saveTimer=null;
function touch(a){ if(a){ a.updatedAt=Date.now(); } scheduleSave(); }
function touchEntry(advId, e){ e.updatedAt=Date.now(); scheduleSave(); }
function scheduleSave(){ saveLocal(); renderHeader(); if(typeof syncConnected==='function' && syncConnected()){ syncSchedule(); } else { setSyncStatus('saved'); clearTimeout(saveTimer); saveTimer=setTimeout(()=>setSyncStatus('local'), 1500); } }
function setSyncStatus(s, msg){ cloud.status=s; const labels={saved:'Saved ✓', local:'Saved', syncing:'Syncing…', synced:'Synced ✓', error:'Sync error'}; const h=document.getElementById('syncpill'); if(h){ h.textContent=labels[s]||'Saved'; h.title = msg || (s==='synced'?'Saved to your private gist':'Progress is saved in this browser. Export a save file to move it to another device.'); h.style.color = s==='error'?'var(--lose)':''; } const f=document.getElementById('syncfoot'); if(f) f.textContent = s==='error'? 'Sync error — '+(msg||'see the Character tab') : (typeof syncConnected==='function'&&syncConnected())? 'Synced to your private GitHub gist' : 'Saved in this browser — export a save file, or connect sync, to play on other devices'; }

/* ---------- Utilities ---------- */
const esc = s => String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function toast(msg){ let t=document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.setAttribute('role','status'); t.style.cssText='position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:8px 14px;border-radius:4px;font-size:14px;z-index:50;box-shadow:var(--shadow);max-width:90vw;text-align:center'; document.body.appendChild(t);} t.textContent=msg; t.style.opacity='1'; clearTimeout(t._h); t._h=setTimeout(()=>{t.style.opacity='0'},2600); }
function fmtDate(ts){ try{ return new Date(ts).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'}); }catch(e){ return ''; } }
function cardHTML(c, opts={}){
  const e = opts.entry || (opts.table? lookup(opts.table,c) : null);
  const cls = ['card', colorOf(c), opts.small?'sm':'', opts.flip?'flip':'', opts.pick?'pick':'', opts.selected?'selected':'', opts.used?'used':'', opts.tilt?'tilt':''].filter(Boolean).join(' ');
  const title = opts.title ?? (e? e.t : '');
  const mod = opts.mod ?? (e && e.mod ? e.mod : '');
  const g = opts.glyph ?? (e && e.g ? e.g : (opts.table ? 'star' : null));
  return `<div class="${cls}" ${opts.attrs||''}>
    <span class="corner">${rankLabel(c.r)}<span class="su">${SUITS[c.s].sym}</span></span>
    ${g? `<div class="glyph">${glyph(g)}</div>`:'<div class="glyph"></div>'}
    ${title? `<div class="title ${title.length>22?'long':''}">${esc(title)}</div>`:''}
    ${mod? `<div class="mod">${esc(mod)}</div>`:''}
    <span class="corner br">${rankLabel(c.r)}<span class="su">${SUITS[c.s].sym}</span></span>
    ${opts.badge? `<span class="badge ${opts.badgeCls||''}">${esc(opts.badge)}</span>`:''}
  </div>`;
}
function cardBackHTML(opts={}){ return `<div class="card back ${opts.small?'sm':''} ${opts.pick?'pick':''}" ${opts.attrs||''}></div>`; }
function boxes(n, max=5, temp=0){ let h='<span class="boxes">'; for(let i=0;i<max;i++) h+=`<i class="${i<n?'on':''}"></i>`; for(let i=0;i<temp;i++) h+='<i class="on temp"></i>'; return h+'</span>'; }
function suitChips(map, isObj=false){ return Object.keys(map).map(s=>`<span class="chip ${SUITS[s].color}">${SUITS[s].sym} ${esc(isObj?map[s].t:map[s])}</span>`).join(' '); }
