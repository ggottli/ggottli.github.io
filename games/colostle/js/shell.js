/* =====================================================================
   SHELL — nav, header, router
   ===================================================================== */
const NAV = [
  ['character','Character','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/></svg>'],
  ['explore','Explore','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-4 0 2-6z"/></svg>'],
  ['combat','Combat','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20l6-6M20 4l-8 8M14 6l4 4M6 14l4 4M3 21l3-3"/></svg>'],
  ['journal','Journal','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2zM5 17h14M9 7h6M9 11h6"/></svg>'],
  ['deck','Deck & Rules','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="12" height="16" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/></svg>']
];
function renderNav(){
  const nav=document.getElementById('nav'), mb=document.getElementById('mobilebar');
  const mk = short => NAV.map(([id,label,icon])=>`<button data-tab="${id}" ${state.tab===id?'aria-current="page"':''}>${icon}<span>${short&&id==='deck'?'Deck':label}</span></button>`).join('');
  nav.innerHTML=mk(false); mb.innerHTML=mk(true);
  [nav,mb].forEach(n=>n.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ state.tab=b.dataset.tab; saveLocal(); render(); window.scrollTo({top:0}); })));
}
function renderHeader(){
  const a=adv(); const tb=document.getElementById('topbar');
  const themeBtn = `<button class="iconbtn" id="themebtn" title="Toggle light/dark" aria-label="Toggle light or dark theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9c-5 0-9-4-9-9z"/></svg></button>`;
  if(!a){ tb.innerHTML=`<div class="who"><span class="name">No adventurer yet</span><span class="cls">Create one in Character</span></div><div class="right"><span class="pill" id="syncpill" title="Progress is saved in this browser">Saved</span>${themeBtn}</div>`; }
  else {
    const c=CLASSES[a.cls]||CLASSES.armed; const tempE = a.rookhome?2:0;
    const sel = state.adventures.length>1? `<select id="advsel" aria-label="Switch adventurer" style="width:auto;padding:3px 6px;font-size:13px">${state.adventures.map(x=>`<option value="${x.id}" ${x.id===a.id?'selected':''}>${esc(x.name||'Unnamed')}</option>`).join('')}</select>`:'';
    tb.innerHTML=`<div class="who"><span class="name">${esc(a.name||'Unnamed adventurer')}</span><span class="cls">${esc(c.name)}${a.within?' · Within':''}</span>${sel}</div>
      <div class="scores"><span class="score">Exploration ${boxes(a.exp,5,tempE)}</span><span class="score">Combat ${boxes(a.com,5)}</span></div>
      <span class="pill" title="Treasures for trading">⚜ <b>${a.treasures}</b></span>
      <span class="pill" title="Draw pile / discard">🂠 <b>${a.deck.draw.length}</b> / ${a.deck.discard.length}</span>
      <div class="right"><span class="pill" id="syncpill" title="Progress is saved in this browser">Saved</span>${themeBtn}</div>`;
    const s=document.getElementById('advsel'); if(s) s.addEventListener('change',()=>{ state.activeId=s.value; touch(null); render(); });
  }
  if(typeof setSyncStatus==='function' && cloud.status && cloud.status!=='saved') setSyncStatus(cloud.status, (typeof sync!=='undefined'&&sync.error)||undefined);
  document.getElementById('themebtn').addEventListener('click',()=>{ const cur=document.documentElement.getAttribute('data-theme'); const sysDark=matchMedia('(prefers-color-scheme: dark)').matches; const effDark = cur? cur==='dark' : sysDark; const next = effDark?'light':'dark'; document.documentElement.setAttribute('data-theme',next); state.theme=next; saveLocal(); });
}
function render(){
  renderNav(); renderHeader();
  const main=document.getElementById('main'); const a=adv();
  if(!a && state.tab!=='deck' && state.tab!=='character'){ state.tab='character'; renderNav(); }
  switch(state.tab){
    case 'character': renderCharacter(main); break;
    case 'explore': renderExplore(main); break;
    case 'combat': renderCombat(main); break;
    case 'journal': renderJournal(main); break;
    case 'deck': renderDeck(main); break;
  }
}
// Generic bound inputs: data-bind="field" on the active adventure
function bindInputs(root, target, after){
  root.querySelectorAll('[data-bind]').forEach(el=>{
    const k=el.dataset.bind; const path=k.split('.');
    const get=()=>{ let o=target; for(const p of path) o=o?.[p]; return o; };
    const set=v=>{ let o=target; for(let i=0;i<path.length-1;i++){ o[path[i]]=o[path[i]]||{}; o=o[path[i]]; } o[path.at(-1)]=v; };
    const v=get(); if(el.type==='checkbox') el.checked=!!v; else if(v!==undefined) el.value=v;
    el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input', ()=>{ let v = el.type==='checkbox'? el.checked : el.type==='number'? Number(el.value) : el.value; set(v); touch(target.id?target:adv()); if(after) after(k,v,el); });
  });
}
