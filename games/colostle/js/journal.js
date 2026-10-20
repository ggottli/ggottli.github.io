/* =====================================================================
   JOURNAL & MAP
   ===================================================================== */
const TERRAIN=[['none','Clear',''],['grass','Grassland','🌾'],['forest','Forest','🌲'],['mountain','Mountains','⛰'],['water','Water','〰'],['sand','Sand / desert','·'],['ice','Ice','❄'],['wall','Room wall','▦'],['abyss','Abyss / dark','■'],['city','City / village','⌂'],['door','Door','🚪'],['stairs','Staircase','≡'],['rook','Rook','♜'],['mark','Mark / X','✕'],['label','Label','Aa']];
function renderJournal(main){
  const a=adv(); if(!a){ main.innerHTML='<div class="panel">Create an adventurer first.</div>'; return; }
  const J=journalOf(a.id); const tool=state.mapTool||'grass';
  const latest=J[0]; const jtext = latest && !latest.text? `A logged ${latest.kind} is waiting: write “${esc(latest.title)}” as a story in ${esc(a.name||'your character')}’s voice.` : J.length? 'Keep writing. Each phase becomes a chapter; fights can sit anywhere inside it.' : 'Log an exploration phase or start a free entry, then write the chapter.';
  let html=`<div class="section-title"><h2>Journal</h2><span class="rule"></span><span class="hint">${J.length} entr${J.length===1?'y':'ies'}</span></div>
  ${guideHTML(['Log a phase or fight','Write the chapter','Draw the next phase'], latest&&!latest.text?1: J.length?2:0, jtext, 'journal')}
  <div class="row" style="margin-bottom:12px"><button class="btn ochre" data-act="newEntry">New entry</button><button class="btn ghost" data-act="toggleMap">${state.showMap?'Hide map':'Show map'}</button><button class="btn ghost" data-act="exportJournal">Export journal as text</button><button class="btn ghost" data-act="printJournal">Print / save as PDF</button></div>`;
  if(state.showMap){
    html+=`<div class="panel"><h3>Map <span class="tag">tap a tool, then paint the grid</span>${helpBtn('map','Help: mapping')}</h3>
      <div class="palette">${TERRAIN.map(([k,n,g])=>`<button data-act="tool" data-t="${k}" aria-pressed="${tool===k}" title="${n}"><span>${g||'∅'}</span>${n}</button>`).join('')}</div>
      <div class="mapgrid" id="mapgrid" role="grid" aria-label="Adventure map">${Array.from({length:a.map.w*a.map.h},(_,i)=>{ const cell=a.map.cells[i]||{}; const t=TERRAIN.find(x=>x[0]===cell.t); return `<button class="t-${cell.t||'none'}" data-act="cell" data-i="${i}" aria-label="Cell ${i}">${t&&cell.t!=='none'&&cell.t!=='label'?t[2]:''}${cell.l?`<span class="lbl">${esc(cell.l)}</span>`:''}</button>`; }).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn xs ghost" data-act="mapClear">Clear map</button><span class="tiny muted">Each exploration phase is roughly one cell. Mark doors, Crackways and places to return to.</span></div></div>`;
  }
  if(!J.length) html+=`<div class="panel plain"><p>Your journal is empty. Draw an exploration phase and log it, or start a free entry. The game lives in what you write here: the prompts are only the skeleton.</p></div>`;
  J.forEach(e=>{ html+=`<article class="entry" id="e-${e.id}"><div class="eh"><span class="kind ${e.kind}">${e.kind}</span><input value="${esc(e.title)}" data-eid="${e.id}" data-f="title" aria-label="Entry title"><span class="when">${esc(e.where||'')}${e.where?' · ':''}${fmtDate(e.ts)}</span><button class="btn xs ghost" data-act="delEntry" data-eid="${e.id}" aria-label="Delete entry">Delete</button></div>
    <div class="eb">${e.cards&&e.cards.length?`<div class="cardline">${e.cards.map(l=>`<div>${esc(l).replace(/^([AJQK0-9]{1,2}[♠♥♣♦])/,'<b>$1</b>')}</div>`).join('')}</div>`:''}
    <textarea class="hand" data-eid="${e.id}" data-f="text" placeholder="Write the chapter…" rows="${Math.max(4,Math.min(30,Math.ceil((e.text||'').length/60)+2))}">${esc(e.text||'')}</textarea></div></article>`; });
  main.innerHTML=html;
  main.querySelectorAll('[data-eid]').forEach(el=>{ if(el.tagName==='BUTTON') return; el.addEventListener('input',()=>{ const e=J.find(x=>x.id===el.dataset.eid); if(!e) return; e[el.dataset.f]=el.value; touchEntry(a.id,e); if(el.tagName==='TEXTAREA'){ el.style.height='auto'; el.style.height=(el.scrollHeight+4)+'px'; } }); });
  if(state.focusEntry){ const el=document.getElementById('e-'+state.focusEntry); if(el){ el.querySelector('textarea')?.focus(); el.scrollIntoView({block:'center'}); } state.focusEntry=null; }
}
function onJournalAction(ev){
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=adv(); const J=journalOf(a.id); const act=b.dataset.act;
  if(act==='printJournal'){ printJournal(a, J); }
  else if(act==='newEntry'){ a.journalCount=(a.journalCount||0)+1; const e={id:uid(), ts:Date.now(), updatedAt:Date.now(), kind:'note', title:`Entry ${a.journalCount}`, where:whereLabel(a), cards:[], text:''}; J.unshift(e); touch(a); touchEntry(a.id,e); state.focusEntry=e.id; render(); }
  else if(act==='delEntry'){ if(confirm('Delete this entry?')){ const id=b.dataset.eid; const i=J.findIndex(x=>x.id===id); if(i>=0){ J.splice(i,1); tombstone(id); cloud.deletedEntries.push(a.id+'/'+id); scheduleSave(); render(); } } }
  else if(act==='toggleMap'){ state.showMap=!state.showMap; saveLocal(); render(); }
  else if(act==='tool'){ state.mapTool=b.dataset.t; saveLocal(); render(); }
  else if(act==='cell'){ const i=Number(b.dataset.i); const tool=state.mapTool||'grass'; const cell=a.map.cells[i]||{}; if(tool==='label'){ const l=prompt('Label for this cell', cell.l||''); if(l!==null){ cell.l=l.trim(); } } else if(tool==='none'){ delete a.map.cells[i]; touch(a); render(); return; } else { cell.t=tool; } a.map.cells[i]=cell; touch(a); render(); }
  else if(act==='mapClear'){ if(confirm('Clear the whole map?')){ a.map.cells={}; touch(a); render(); } }
  else if(act==='exportJournal'){ const txt=[...J].reverse().map(e=>`# ${e.title} (${e.kind}${e.where?', '+e.where:''}, ${fmtDate(e.ts)})\n${(e.cards||[]).join('\n')}\n\n${e.text||''}\n`).join('\n---\n\n'); tryDownload(`colostle-journal-${(a.name||'adventure').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.md`, txt); toast('Journal downloaded as Markdown'); }
}

function printJournal(a, J){
  const c=CLASSES[a.cls]||{}; const esc2=esc;
  const body=`<h1>${esc2(a.name||'An adventurer')}</h1><p class="meta">${esc2(c.name||'')} · Exploration ${a.exp} · Combat ${a.com} · ${a.treasures} treasure${a.treasures===1?'':'s'}${a.callingTitle?` · Calling: ${esc2(a.callingTitle)}`:''}${a.nature?` · Nature: ${esc2(a.nature)}`:''}</p>
    ${a.inventory.length?`<p class="meta">Inventory: ${a.inventory.map(esc2).join(', ')}</p>`:''}${a.notes?`<p class="meta">${esc2(a.notes).replace(/\n/g,'<br>')}</p>`:''}
    ${[...J].reverse().map(e=>`<article><h2>${esc2(e.title)} <small>${esc2(e.kind)}${e.where?' · '+esc2(e.where):''} · ${esc2(fmtDate(e.ts))}</small></h2>${e.cards&&e.cards.length?`<div class="cards">${e.cards.map(l=>`<div>${esc2(l)}</div>`).join('')}</div>`:''}<div class="text">${esc2(e.text||'').replace(/\n/g,'<br>')}</div></article>`).join('')}`;
  const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc2(a.name||'Colostle')} — journal</title><style>body{font:15px/1.5 Georgia,serif;color:#111;max-width:760px;margin:30px auto;padding:0 20px} h1{font:700 30px/1.1 "Arial Narrow",Impact,sans-serif;letter-spacing:.04em;text-transform:uppercase;margin:0 0 6px} h2{font:600 19px/1.2 "Arial Narrow",Impact,sans-serif;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #999;padding-bottom:4px;margin:26px 0 8px} h2 small{font:12px sans-serif;text-transform:none;letter-spacing:0;color:#666;margin-left:8px} .meta{color:#555;font-size:13px;margin:4px 0} .cards{font:13px/1.5 sans-serif;color:#444;background:#f3f3f3;padding:8px 10px;margin-bottom:10px;border-left:3px solid #999} article{break-inside:avoid-page} .text{white-space:normal} @media print{ body{margin:0} }</style></head><body>${body}<script>window.onload=()=>{ setTimeout(()=>window.print(), 300); };<\/script></body></html>`;
  const w=window.open('', '_blank'); if(!w){ toast('Allow pop-ups to print the journal'); return; } w.document.open(); w.document.write(doc); w.document.close();
}

/* =====================================================================
   DECK & RULES
   ===================================================================== */
const DECK_TABS=[['land','Roomlands'],['ocean','Ocean'],['weather','Weather'],['items','Items'],['events','Events'],['battlements','Battlements'],['exposure','Exposure'],['tundroom','Tundroom'],['village','Village events'],['crew','Crew'],['rafters','Rafters'],['crackways','Crackways'],['market','Market ♦'],['crescents','Crescents ♠'],['guildtown','Guildtown ♥'],['lanes','Lanes ♣'],['rooksrest','Rook’s Rest'],['complications','Co-op complications'],['torrents','Halls of Torrents','seastone'],['winds','Hall of Winds','seastone'],['gears','Halls of Gears','seastone'],['combat','Combat tables'],['city','City & quests'],['character','Calling & Nature']];
function deckTabsFor(){ const a=adv(); return DECK_TABS.filter(([id,n,mod])=>!mod || (a&&a.modules&&a.modules[mod])); }
function renderDeck(main){
  const tabs=deckTabsFor(); let t=state.deckTab||'land'; if(!tabs.find(x=>x[0]===t)) t='land';
  const q=(state.deckSearch||'').trim();
  let html=`<div class="section-title"><h2>Deck & rules</h2><span class="rule"></span><span class="hint">Every card, by where you are</span>${helpBtn('deck','Help: the deck')}</div>
  <div class="row" style="margin-bottom:10px"><input id="decksearch" type="search" value="${esc(q)}" placeholder="Search every table — e.g. gargoyle, treasure, heal, cultist" style="max-width:420px" aria-label="Search the rules tables"></div>
  <div class="tabs">${tabs.map(([id,n])=>`<button data-act="deckTab" data-t="${id}" aria-pressed="${t===id&&!q}">${n}</button>`).join('')}</div>`;
  html+=`<div class="panel">`+ (q? deckSearchHTML(q) : TABLES[t]? tableRefHTML(t) : t==='combat'? combatRefHTML() : t==='city'? cityRefHTML() : characterRefHTML()) + `</div>`;
  html+=rulesHTML();
  main.innerHTML=html;
  const si=document.getElementById('decksearch'); si.addEventListener('input',()=>{ state.deckSearch=si.value; const pos=si.selectionStart; render(); const el=document.getElementById('decksearch'); if(el){ el.focus(); try{ el.setSelectionRange(pos,pos); }catch(e){} } });
}
function deckSearchHTML(q){
  const needle=q.toLowerCase(); const rows=[]; const a=adv();
  for(const id in TABLES){ const T=TABLES[id]; if(T.kind==='hall' && !(a&&a.modules&&a.modules.seastone)) continue; const seen=new Set();
    for(const col of ['all','red','black','face']){ if(!T[col]) continue; for(const r in T[col]){ const e=T[col][r]; if(seen.has(e)) continue; seen.add(e);
      const txt=[e.t,e.d,e.m&&Object.values(e.m).join(' ')].filter(Boolean).join(' ').toLowerCase(); if(!txt.includes(needle)) continue;
      let label=rankLabel(+r); if(T.ranges){ const rg=T.ranges.find(x=>x[2]===e); if(rg&&rg[0]!==rg[1]) label=`${rankLabel(rg[0])}–${rankLabel(rg[1])}`; }
      if(col==='red') label+=' ♥♦'; if(col==='black') label+=' ♠♣';
      rows.push(`<tr><td class="rank">${label}</td><td><b>${esc(e.t)}</b>${e.d?` — ${esc(e.d)}`:''}${e.m?`<div class="mods">${Object.keys(e.m).map(k=>`${k.length===1&&SUITS[k]?SUITS[k].sym:k==='R'?'Red':'Black'} ${esc(e.m[k])}`).join(' · ')}</div>`:''}<div class="tiny muted">${esc(T.short)} · ${esc(T.book)}</div></td></tr>`); } } }
  const extra=[]; const addX=(src,t,d)=>{ if((t+' '+d).toLowerCase().includes(needle)) extra.push(`<tr><td class="rank">—</td><td><b>${esc(t)}</b> — ${esc(d)}<div class="tiny muted">${esc(src)}</div></td></tr>`); };
  CITY_FIXED.forEach(f=>addX('City',f.t,f.d)); Object.values(CITY_DRAW).forEach(f=>addX('City',f.t,f.d)); MERCHANT.forEach(m=>addX('Merchant',m.t,m.p+' — '+m.d)); ITEM_FX.forEach(f=>addX('Item effects',f.t,f.d));
  Object.keys(ALT_REWARD).forEach(k=>addX('Elite rewards',ALT_REWARD[k].t,ALT_REWARD[k].d)); Object.keys(NAUGHT_REWARD).forEach(k=>addX('Rooknaught rewards',NAUGHT_REWARD[k].t,NAUGHT_REWARD[k].d));
  Object.values(QUEST.core.twist).forEach(t=>addX('Guild quest twist',t,'')); Object.values(QUEST.parapette.twist).forEach(t=>addX('Parapette quest twist',t,''));
  CALLINGS.forEach(c=>addX('Calling',c[2],c[3])); NATURES.forEach(n=>addX('Nature',n[2],''));
  const all=rows.concat(extra);
  return `<h3>Search: “${esc(q)}” <span class="tag">${all.length} match${all.length===1?'':'es'}</span></h3>${all.length?`<div class="scroller"><table class="ref"><tr><th>Card</th><th>Prompt</th></tr>${all.join('')}</table></div>`:'<p class="muted">Nothing matches. Try a single word.</p>'}`;
}
function tableRefHTML(tid){
  const T=TABLES[tid]; let html=`<h3>${esc(T.name)} <span class="tag">${esc(T.book)}</span></h3><p class="small">${esc(T.intro||'')}</p>`;
  const row=(label, e, cls='')=>`<tr><td class="rank ${cls}">${label}</td><td><b>${esc(e.t)}</b>${e.d?` — ${esc(e.d)}`:''}${e.m?`<div class="mods">${Object.keys(e.m).map(k=>`${k.length===1&&SUITS[k]?SUITS[k].sym:k==='R'?'Red':'Black'} ${esc(e.m[k])}`).join(' · ')}</div>`:''}</td></tr>`;
  if(T.red||T.black){
    html+=`<div class="scroller"><table class="ref"><tr><th colspan="2" style="color:var(--red)">${esc(T.redLabel||'Red cards ♥ ♦ — living things')}</th></tr>${Object.keys(T.red).map(r=>row(rankLabel(+r),T.red[r],'')).join('')}</table></div>`;
    html+=`<div class="scroller" style="margin-top:14px"><table class="ref"><tr><th colspan="2">${esc(T.blackLabel||'Black cards ♠ ♣ — places and things')}</th></tr>${Object.keys(T.black).map(r=>row(rankLabel(+r),T.black[r])).join('')}</table></div>`;
    if(T.face) html+=`<div class="scroller" style="margin-top:14px"><table class="ref"><tr><th colspan="2">Face cards — any suit</th></tr>${Object.keys(T.face).map(r=>row(rankLabel(+r),T.face[r])).join('')}</table></div>`;
  } else {
    const seen=new Set(); html+=`<div class="scroller"><table class="ref"><tr><th>Card</th><th>Prompt</th></tr>`;
    for(let r=1;r<=13;r++){ const e=T.all[r]; if(!e||seen.has(e)) continue; seen.add(e); let label=rankLabel(r); if(T.ranges){ const rg=T.ranges.find(x=>x[2]===e); if(rg&&rg[0]!==rg[1]) label=`${rankLabel(rg[0])}–${rankLabel(rg[1])}`; } html+=row(label,e); }
    html+=`</table></div>`;
  }
  if(tid==='rafters') html+=`<h4 style="margin-top:14px">Gargoyles</h4><p class="small"><b>Gnarled</b> — lifts and drops you: draw a card, red = 1 Wound, black = the trees save you. <b>Swift</b> — flies you to the neighbouring Rafter. <b>Hulk</b> — 1 unavoidable Wound if surprised, then a piece breaks off and it flees: draw a card, red = 1 Treasure, black = a part worth +1 Combat.</p>`;
  if(tid==='tundroom') html+=`<h4 style="margin-top:14px">Rooknaughts</h4><p class="small">A Rook husk crewed by five: a Helmed in the head, two Armed on the arms, a Followed in the core, a Mounted at the legs. On foot: Combat score 6, then the crew at 5 (survivors flee). Rooknaught to Rooknaught: both lay out 5 cards (theirs face down), attack blind one part at a time, armour 3. Rewards by suit: ♠ Great Ice Sword · ♣ Great Ice Shield · ♥ Icicle Rookstone · ♦ the Carapice.</p>`;
  if(tid==='complications') html+=`<h4 style="margin-top:14px">2-player resolution oracle</h4><p class="small"><span class="chip red">Red</span> ${esc(COOP_ORACLE.red)} · <span class="chip black">Black</span> ${esc(COOP_ORACLE.black)}</p><h4 style="margin-top:10px">Co-op combat</h4><p class="small">Opponent scores double (person 2, medium Rook 6, massive 10) and it alternates targets each round. Optional modifier card once you commit: red +1 (beat it and both gain a Treasure), black −1. A partner may defend a lost round with a card that matches or beats the attack. Combo attack: both play a card at once — matching suits is a combo critical for 3 wounds and 3 fewer attacks; otherwise both cards are lost and the attack lands.</p>`;
  if(T.kind==='hall') html+=`<h4 style="margin-top:14px">Bastions</h4><p class="small">Combat score 3, no reward. Draw one card for type (red: Sword Bastion, black: Seastone Bastion) and one for stealth (red: it notices you and the fight is unavoidable; black: you may slip past). Only one Bastion per phase. Sword attacks: ${suitChips(BASTION_ATTACK.sword)}. Seastone attacks: ${suitChips(BASTION_ATTACK.seastone)}.</p>`;
  if(tid==='battlements') html+=`<h4 style="margin-top:14px">Astrolithic Rooks</h4><p class="small">Combat score 6, no creation step. Attacks by suit: ♠ Laser · ♣ Flying · ♥ Grab · ♦ Rocket. Win and the husk is yours to pilot — you become Within (5/5 while inside, you can fly, Astrolithics ignore you).</p>`;
  return html;
}
function combatRefHTML(){
  return `<h3>Combat tables</h3><div class="grid c2">
    <div><h4>Another person — 1 attack</h4><p class="small">Intention (suit): ${suitChips(INTENTION)}</p><p class="small">Weapon (rank): A–6 Ranged · 7–K Melee</p></div>
    <div><h4>Rook — card one</h4><p class="small">Magic (suit): ${suitChips(MAGIC)}</p><p class="small">Body (rank): A–7 Attack · 8–K Defence</p></div>
    <div><h4>Rook — card two</h4><p class="small">Weapon (rank): A–6 Ranged · 7–K Melee</p><p class="small">Reward (suit): ${suitChips(REWARD)}</p></div>
    <div><h4>Opponent scores</h4><table class="ref"><tr><td>Another person</td><td class="rank">1</td></tr><tr><td>Medium Rook</td><td class="rank">3</td></tr><tr><td>Massive Rook / Ice Rook</td><td class="rank">5</td></tr><tr><td>Astrolithic Rook / Rooknaught</td><td class="rank">6</td></tr><tr><td>Feral Massive Rook (Elite): check card A–5 / 6–9 / 10–K</td><td class="rank">6 / 7 / 8</td></tr></table></div>
    <div><h4>Attack types (suit)</h4><p class="small">${suitChips(ATTACK_TYPE)}</p><p class="small">Inside a Rook: ${suitChips(INTERNAL_ATTACK)}</p><p class="small">Astrolithic: ${suitChips(ASTRO_ATTACK)}</p></div>
    <div><h4>Elite alternate rewards (suit)</h4>${Object.keys(ALT_REWARD).map(s=>`<p class="small"><span class="chip ${SUITS[s].color}">${SUITS[s].sym} ${ALT_REWARD[s].t}</span> ${esc(ALT_REWARD[s].d)}</p>`).join('')}</div>
    <div><h4>Rooknaught rewards (suit)</h4>${Object.keys(NAUGHT_REWARD).map(s=>`<p class="small"><span class="chip ${SUITS[s].color}">${SUITS[s].sym} ${NAUGHT_REWARD[s].t}</span> ${esc(NAUGHT_REWARD[s].d)}</p>`).join('')}</div>
    <div><h4>Rookhome maintenance (suit, each phase)</h4>${Object.keys(ROOKHOME_MAINT).map(s=>`<p class="small"><span class="chip ${SUITS[s].color}">${SUITS[s].sym} ${ROOKHOME_MAINT[s].t}</span> ${esc(ROOKHOME_MAINT[s].d)}</p>`).join('')}</div>
  </div>`;
}
function cityRefHTML(){
  return `<h3>Building a city</h3><p class="small">Every city has a King (Hunter’s Guild), Queen (Tavern), Jack (Merchant) and Ten (Housing District). Draw 4 more — face cards go to the bottom — and lay all 8 touching. Two of a kind: redraw, or enjoy some competition.</p>
    <div class="scroller"><table class="ref"><tr><th>Card</th><th>Amenity</th></tr>${CITY_FIXED.map(f=>`<tr><td class="rank">${rankLabel(f.r)}</td><td><b>${esc(f.t)}</b> — ${esc(f.d)}</td></tr>`).join('')}${Object.keys(CITY_DRAW).map(r=>`<tr><td class="rank">${rankLabel(+r)}</td><td><b>${esc(CITY_DRAW[r].t)}</b> — ${esc(CITY_DRAW[r].d)}</td></tr>`).join('')}</table></div>
    <h4 style="margin-top:14px">Hunter’s Guild quests — three draws</h4>
    <div class="grid c2"><div><b>Location</b> (rank) and <b>distance</b> (suit)<table class="ref">${QUEST.core.location.map(l=>`<tr><td class="rank">${l[0]===l[1]?rankLabel(l[0]):rankLabel(l[0])+'–'+rankLabel(l[1])}</td><td>${esc(l[2])}</td></tr>`).join('')}</table><p class="small">♠ 2 · ♣ 3 · ♥ 4 · ♦ 5 Exploration phases each way (a house in the city brings you home in a day). On arrival, don’t draw — use Location and Twist.</p></div>
    <div><b>Twist</b> (rank)<table class="ref">${Object.keys(QUEST.core.twist).map(r=>`<tr><td class="rank">${rankLabel(+r)}</td><td>${esc(QUEST.core.twist[r])}</td></tr>`).join('')}</table><p class="small"><b>Reward</b> (suit): ♠ 2 · ♣ 2 · ♥ 3 · ♦ 2 Treasures. Parapette’s Guild uses its own tables (in the Explore tab) with rewards of 2–4.</p></div></div>
    <h4 style="margin-top:14px">Rookling Crèche</h4><div class="scroller"><table class="ref">${Object.keys(CRECHE).map(r=>`<tr><td class="rank">${rankLabel(+r)}</td><td>${esc(CRECHE[r])}</td></tr>`).join('')}</table></div>
    <h4 style="margin-top:14px">The Merchant</h4><div class="scroller"><table class="ref"><tr><th>Item</th><th>Price</th><th>Effect</th></tr>${MERCHANT.map(m=>`<tr><td><b>${esc(m.t)}</b></td><td>${esc(m.p)}</td><td>${esc(m.d)}</td></tr>`).join('')}</table></div>`;
}
function characterRefHTML(){
  return `<h3>Calling</h3><div class="scroller"><table class="ref">${CALLINGS.map(c=>`<tr><td class="rank">${c[0]===c[1]?rankLabel(c[0]):rankLabel(c[0])+'/'+rankLabel(c[1])}</td><td><b>${esc(c[2])}</b> — ${esc(c[3])}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:14px">Nature</h3><div class="scroller"><table class="ref">${NATURES.map(c=>`<tr><td class="rank">${c[0]===c[1]?rankLabel(c[0]):rankLabel(c[0])+'/'+rankLabel(c[1])}</td><td>${esc(c[2])}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:14px">Classes</h3><div class="scroller"><table class="ref"><tr><th>Class</th><th>Exp</th><th>Com</th><th>Book</th></tr>${Object.keys(CLASSES).map(k=>`<tr><td><b>${esc(CLASSES[k].name)}</b></td><td class="rank">${CLASSES[k].exp}</td><td class="rank">${CLASSES[k].com}</td><td>${esc(CLASSES[k].book)}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:14px">Biomes</h3><div class="scroller"><table class="ref">${BIOMES.map(b=>`<tr><td class="rank">${b[0]}</td><td><b>${b[1]}</b> — ${esc(b[2])}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:14px">Oracles</h3><p class="small"><b>Yes/No:</b> red = no, black = yes; A–4 worse, 5–9 plain, 10–K better. <b>NPC:</b> three draws for name, look, trait. <b>Story:</b> incite + subject, then a twist later.</p>`;
}
function rulesHTML(){
  return `<div class="section-title" style="margin-top:20px"><h2>Rules in brief</h2><span class="rule"></span></div>
  <details class="rule"><summary>The loop of play</summary><div class="body"><ol class="steps"><li>Draw cards equal to your Exploration score and read them against the table for where you are. Weave them into one chapter — a day, or longer.</li><li>If a prompt offers a fight and you take it, run the Combat phase anywhere in the chapter. You only face one Rook at a time; extra Rook cards are ignored.</li><li>Write the journal entry. Note wounds, treasures, items and anything to return to.</li><li>Draw again. Keep one draw pile across both phases; when it runs out, shuffle the discards. Drawing a duplicate: redraw it, or meet two of the thing.</li></ol></div></details>
  <details class="rule"><summary>Your character</summary><div class="body"><p>You need a Calling, a Nature, a Class and a Weapon. Calling drives the long story and surfaces whenever a Calling prompt appears. Nature shapes every reaction. Class sets Exploration (cards drawn) and Combat (options held). Weapons have no stats — they are how you describe a Weapon attack. You may take on aspects of other classes later without changing scores. Scores cap at 5; Treasure, Sunshine, Rook victories, taverns and city services raise them; Wounds lower them.</p></div></details>
  <details class="rule"><summary>Moving between places</summary><div class="body"><ul><li><b>The sea</b> (8♠/8♣) → Ocean table, if you have a boat. Coastline or small island → back ashore.</li><li><b>A city</b> (10♠/10♣) → build it, or treat it as abandoned. Parapette is a fixed city with four quarters.</li><li><b>Door</b> → another Room: ordinary Roomlands, or a Tundroom. Door, Cave or Staircase → may become a Crackway (2+ phases through the wall; a known Crackway is a 1-phase shortcut).</li><li><b>Staircase</b> → your first leads to another floor; later ones may lead to the Battlements.</li><li><b>Gargoyles</b> (7♦), a hole in the Battlements, or a staircase top → the Rafters. Rafters have ways down and skylights to the Battlements.</li></ul></div></details>
  <details class="rule"><summary>Rookhomes, Rooknaughts and the Within</summary><div class="body"><p><b>Rookhome:</b> defeat a Rook from inside (final blow internal), with the mechanical know-how to keep it running. Rooks ignore you inside it; +2 Exploration while travelling in it (not real points, so not wounds); heal one Wound per phase you return to it; draw maintenance by suit each phase. Not battle-worthy — step out to fight.</p><p><b>Rooknaught:</b> a Rook husk sailed by a crew of 5 across the Ice Sea. Rooks ignore it. Fight other Rooknaughts blind, part against part, to 3 damage.</p><p><b>Within:</b> defeat an Astrolithic Rook on the Battlements and pilot its husk: fly, fast-travel, 5/5 scores while inside, ignored by Astrolithics. Leave it and you are yourself again.</p></div></details>
  <details class="rule"><summary>Elite Rookhunting</summary><div class="body"><p>For characters at 5/5 or who have every standard reward. <b>Feral Massive Rooks:</b> after any Massive Rook prompt, draw a check card — red means feral, with Combat score 6 (A–5), 7 (6–9) or 8 (10–K). <b>Alternate rewards</b> by suit: Navigation Matrix, Lubrication Oil, Armour Plate, Clash Bang (see Combat tables).</p></div></details>
  <details class="rule"><summary>Two players</summary><div class="body"><p>Roomlands pp.51–57. Each phase one of you is the <b>Leader</b>: they draw their Exploration score and narrate; the other draws one secret card to reveal when it suits. Either of you may draw a <b>Complication</b> (Oracles panel, or the Co-op complications tab here). In combat, tick <b>Two-player co-op</b> when creating the opponent: its score doubles, it alternates targets, your partner can defend a lost round, and you can gamble on a combo attack.</p></div></details>
  <details class="rule"><summary>Search for the Seastone</summary><div class="body"><p>Roomlands pp.61–85 is a read-as-you-go campaign with “don’t turn the page” gates, so the story stays in the book. Switch the module on in the Character tab when your character reaches Crag’s End and the companion adds Crown Isle (its five areas and the Hall of Doors), the three Halls as exploration locations with their phase counters, Bastion fights, and the three-phase battle with the Drowned Queen with Aanya at your side. The Mysteries of the Gargoyles (p.91) is likewise a reveal for when you hold 3 clues.</p></div></details>`;
}

/* =====================================================================
   INIT
   ===================================================================== */
(function init(){
  loadLocal();
  const main=document.getElementById('main');
  main.addEventListener('click', ev=>{
    if(!ev.target.closest('[data-act]')) return;
    const dt=ev.target.closest('[data-act="deckTab"]'); if(dt){ state.deckTab=dt.dataset.t; saveLocal(); render(); return; }
    if(state.tab==='character') onCharacterAction(ev);
    else if(state.tab==='explore') onExploreAction(ev);
    else if(state.tab==='combat') onCombatAction(ev);
    else if(state.tab==='journal') onJournalAction(ev);
  });
  main.addEventListener('keydown', e=>{ const t=e.target; if((e.key==='Enter'||e.key===' ') && t.dataset && t.dataset.act && t.getAttribute('role')==='button'){ e.preventDefault(); t.click(); } });
  if(state.theme && state.theme!=='auto') document.documentElement.setAttribute('data-theme', state.theme);
  render();
  syncInit();
})();
