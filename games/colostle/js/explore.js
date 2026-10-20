/* =====================================================================
   EXPLORE
   ===================================================================== */
const LOCATIONS = [
  ['land','The Roomlands','On foot through the lands of a Room'],
  ['ocean','The Ocean','Sailing — needs a boat or seagoing mount'],
  ['city','A City','Build it, trade, take quests'],
  ['parapette','Parapette','The great fixed city — four quarters'],
  ['battlements','The Battlements','The rooftops — hide from Astrolithics'],
  ['tundroom','The Tundroom','Ice wastes, villages and Rooknaughts'],
  ['rafters','The Rafters','Jungle beams, Gargoyles and clues'],
  ['crackways','A Crackway','Through the wall to the next Room'],
  ['crownisle','Crown Isle (Seastone)','The circular island — and the Hall of Doors beneath it','seastone'],
  ['torrents','Halls of Torrents (Seastone)','Flooding tunnels in the Colossal Rook’s veins','seastone'],
  ['winds','Hall of Winds (Seastone)','Thin bridges across a cathedral of stone — its lungs','seastone'],
  ['gears','Halls of Gears (Seastone)','A turning three-dimensional maze — its muscles','seastone']
];
function locationsFor(a){ return LOCATIONS.filter(l=>!l[3] || (a.modules&&a.modules[l[3]])); }
function seastoneOf(a){ if(!a.seastone) a.seastone={halls:{}, isle:{}, flags:{}}; a.seastone.flags=a.seastone.flags||{}; a.seastone.isle=a.seastone.isle||{}; a.seastone.halls=a.seastone.halls||{}; return a.seastone; }
function expScore(a){ let n=a.within?5:a.exp; if(a.rookhome) n+=2; return Math.max(0,n); }
function comScore(a){ return a.within?5:a.com; }
function startPhase(a, tid){
  const n=expScore(a); if(n===0){ toast('Exploration is 0 — your adventurer cannot go on.'); return; }
  const cards=drawCards(a, n);
  a.phase={table:tid, cards, sub:[], weather:null, marker:null, exposure:null, hide:false, maze:null, logged:false, ts:Date.now(), clued:[]};
  if(a.quest && a.quest.status==='out') a.quest.phasesTravelled++;
  if(a.city && a.location!=='city') a.city.phasesSince=(a.city.phasesSince||0)+1;
  if(HALL_IDS.includes(tid)){ const ss=seastoneOf(a); ss.halls[tid]=(ss.halls[tid]||0)+1; }
  touch(a);
}
function redCount(ph){ let n=0; for(const c of ph.cards){ if(ph.table==='battlements' && c.r>=12){ n+=TABLES.battlements.all[c.r].redcount; continue; } if(isRed(c)) n++; } return n; }

function renderExplore(main){
  const a=adv(); if(!a){ main.innerHTML='<div class="panel">Create an adventurer first.</div>'; return; }
  const loc=a.location||'land';
  const tidNow = loc==='parapette'? a.quarter : loc;
  const ph0=a.phase; let gstep, gtext;
  if(loc==='city'){ gstep=1; gtext = a.city&&a.city.amenities.length? 'Use the city: rest, trade, take a quest. Leave when ready and draw again outside.' : 'Build the city (draw 4) or treat it as abandoned.'; }
  else if(loc==='crownisle'){ gstep=1; gtext='Investigate the island’s areas, then descend the central tower and choose a door.'; }
  else if(loc==='parapette'&&!a.quarter){ gstep=0; gtext='Choose a quarter of Parapette to explore, or draw a card to let the suit decide.'; }
  else if(!ph0||ph0.table!==tidNow){ gstep=0; gtext=`Draw ${expScore(a)} card${expScore(a)===1?'':'s'} for a new chapter.`; }
  else if(!ph0.logged){ gstep = ph0.cards.some((c,i)=>{ const e=lookup(tidNow,c); return e.fight||e.sub||e.weather||e.extra||e.maze; }) ? 2 : 1; gtext = gstep===2? 'Resolve any extra draws, then take or skip each fight. When the chapter is in your head, log it.' : 'Read the prompts and link them into one chapter. Then log it to the journal.'; }
  else { gstep=4; gtext='Chapter logged. Write it up in the journal, then finish and draw the next phase.'; }
  let html=`<div class="section-title"><h2>Exploration phase</h2><span class="rule"></span><span class="hint">Draw ${expScore(a)} card${expScore(a)===1?'':'s'}${a.rookhome?' (includes +2 Rookhome)':''}</span></div>
  ${guideHTML(['Draw','Read the prompts','Resolve & fight','Log the chapter','Next phase'],gstep,gtext,'explore')}
  <div class="panel plain" style="padding:12px 16px">
    <div class="row between">
      <div class="row"><label for="locsel" style="margin:0">Where are you?</label><select id="locsel" style="width:auto">${locationsFor(a).map(([id,n])=>`<option value="${id}" ${loc===id?'selected':''}>${n}</option>`).join('')}</select>
      ${loc==='parapette'? `<select id="quartersel" style="width:auto" aria-label="Quarter"><option value="">Choose a quarter…</option>${['market','crescents','guildtown','lanes'].map(q=>`<option value="${q}" ${a.quarter===q?'selected':''}>${TABLES[q].name.split('— ')[1]}</option>`).join('')}</select><button class="btn xs ghost" data-act="randQuarter">Draw a quarter</button>`:''}
      </div>
      <div class="row">${deckHTML(a)}<button class="btn xs ghost" data-act="quickDraw" title="Draw one card for anything">Quick draw</button>${helpBtn(loc==='city'?'city': loc==='crownisle'||HALL_IDS.includes(loc)?'seastone' : 'table-'+(loc==='parapette'?'parapette':loc),'Help: rules for this place')}</div>
    </div>
    <p class="small muted" style="margin:8px 0 0">${esc(LOCATIONS.find(l=>l[0]===loc)[2])}${TABLES[loc]? ' — '+esc(TABLES[loc].intro):''}${loc==='parapette'&&a.quarter? ' — '+esc(TABLES[a.quarter].intro):''}</p>
    ${a.lastQuick? `<div class="row" style="margin-top:8px;align-items:center"><span class="small muted">Quick draw:</span><span class="chip ${colorOf(a.lastQuick)}">${cardLabel(a.lastQuick)}</span><span class="small">${isRed(a.lastQuick)?'Red':'Black'} · ${RANK_WORDS[a.lastQuick.r-1]} of ${SUITS[a.lastQuick.s].name}</span></div>`:''}
  </div>`;

  if(loc==='city'){ html+=renderCityPanel(a); }
  else if(loc==='crownisle'){ html+=renderCrownIsle(a); }
  else if(loc==='parapette' && !a.quarter){ html+=renderParapettePanel(a); }
  else {
    const tid = loc==='parapette'? a.quarter : loc;
    const ph=a.phase;
    html+=`<div class="panel">`;
    if(!ph || ph.table!==tid){
      const arriving = a.quest && a.quest.status==='out' && a.quest.phasesTravelled>=a.quest.distance-1;
      html+=`<div class="row"><button class="btn ochre" data-act="startPhase">Draw ${expScore(a)} card${expScore(a)===1?'':'s'}</button>${arriving?`<button class="btn red" data-act="questArrive">Arrive at the quest location (no draw)</button>`:''}${loc==='crackways'?`<button class="btn ghost" data-act="marker">Draw the Crackway marker</button>`:''}${a.rookhome?`<button class="btn ghost" data-act="maint">Rookhome maintenance draw</button>`:''}<span class="small muted">Each phase can be a day — or longer, if the story wants it.</span></div>`;
      if(a.quest && a.quest.status==='out' && !arriving) html+=`<p class="tip">Quest in progress: ${esc(a.quest.twist)} — ${a.quest.distance-a.quest.phasesTravelled} phase${a.quest.distance-a.quest.phasesTravelled===1?'':'s'} to go.</p>`;
      if(arriving) html+=`<p class="tip">Your next phase is the quest's location. Don't draw cards for it — the Location and Twist set the scene.</p>`;
      if(a.phase && a.phase.table!==tid) html+=`<p class="notice">You have an unlogged phase from ${esc(TABLES[a.phase.table]?.short||a.phase.table)}. Drawing here replaces it.</p>`;
      if(a.crackMarker && loc==='crackways') html+=`<p class="notice">Crackway marker: <b>${a.crackMarker==='black'?'Signed safe — ignore Bandit modifiers':'Unmarked — Bandits apply'}</b></p>`;
      if(a.lastMaint) html+=`<p class="notice ocean">Rookhome: <b>${esc(a.lastMaint.t)}</b> — ${esc(a.lastMaint.d)}</p>`;
      if(HALL_IDS.includes(loc)) html+=hallStatusHTML(a, loc);
    } else {
      html+=renderPhase(a, ph, tid);
    }
    html+=`</div>`;
    if(loc==='parapette') html+=renderParapettePanel(a, true);
  }
  html+=renderOracles(a);
  main.innerHTML=html;
  document.getElementById('locsel').addEventListener('change',e=>{ a.location=e.target.value; if(a.location==='city' && !a.city) a.city=null; touch(a); render(); });
  const qs=document.getElementById('quartersel'); if(qs) qs.addEventListener('change',e=>{ a.quarter=e.target.value||null; touch(a); render(); });
}

function renderPhase(a, ph, tid){
  const T=TABLES[tid];
  if(ph.questArrival){ const q=ph.questArrival; return `<div class="row between"><h3>The quest’s location <span class="tag">no cards this phase</span></h3><div class="row"><button class="btn sm ocean" data-act="logPhase">${ph.logged?'Logged ✓ — log again':'Log phase to journal'}</button></div></div>
    <div class="prompt"><div class="h"><h4>${esc(q.location)}</h4></div><div class="d"><b>The twist:</b> ${esc(q.twist)}</div><div class="d">Set the scene from the location, then create the Rook as normal and fight it with the twist in mind. Bring proof back for ${q.reward} Treasures.</div><div class="acts"><button class="btn xs red" data-act="fight" data-type="${/medium/i.test(q.twist)&&!/massive/i.test(q.twist)?'medium':'massive'}">Create and fight the Rook</button></div></div>
    <div class="row" style="margin-top:12px"><button class="btn ocean" data-act="logPhase">${ph.logged?'Log phase again':'Log this phase to the journal'}</button><button class="btn ghost" data-act="newPhase">Finish — next phase</button></div>`; }
  let html=`<div class="row between"><h3>${esc(T.name)} <span class="tag">${ph.cards.length} card${ph.cards.length===1?'':'s'}</span>${helpBtn('table-'+(TABLES[tid].kind==='quarter'?'parapette':tid),'Help: this table')}</h3><div class="row"><button class="btn sm ghost" data-act="redraw" title="Discard these and draw again">Redraw</button><button class="btn sm ocean" data-act="logPhase">${ph.logged?'Logged ✓ — log again':'Log phase to journal'}</button></div></div>`;
  html+=`<div class="cards">${ph.cards.map((c,i)=>cardHTML(c,{table:tid, flip:true, attrs:`data-idx="${i}"`})).join('')}</div>`;
  const rookIdx = ph.cards.map((c,i)=>({c,i,e:lookup(tid,c)})).filter(x=>x.e.fight && x.e.fight!=='person');
  if(rookIdx.length>1){ const kind = rookIdx.every(x=>x.e.fight==='bastion')? 'Bastion' : 'Rook'; html+=`<div class="notice">You drew ${rookIdx.length} ${kind} prompts — you only ever face one ${kind} per phase. Choose which one is real; the rest fade into the story.</div>`; }
  if(tid==='tundroom'){ const bl=ph.cards.find(c=>c.r===5&&isRed(c)); if(bl){ const cover=ph.cards.some(c=>[1,3,9,10].includes(c.r)); html+=`<div class="notice ${cover?'ocean':'red'}"><b>Extreme blizzard.</b> ${cover?'You drew somewhere to take cover this phase — shelter there.':'Nothing to shelter in this phase — take 1 Wound.'}</div>`; } }
  if(a.rookhome) html+=`<div class="notice ocean"><b>Rookhome.</b> Rooks ignore you. ${ph.rested?'You rested here this phase.':`Return to it this phase to heal one Wound: <button class="btn xs grass" data-act="rest" data-k="exp">+1 Exploration</button> <button class="btn xs grass" data-act="rest" data-k="com">+1 Combat</button>`}</div>`;
  if(tid==='battlements'){ const rc=redCount(ph); html+=`<div class="notice ${rc>=3?'red':''}"><b>Red count: ${rc}</b>${rc>=3? ' — three or more. Hide for the phase (redraw everything next time), or take the risk and draw an Exposure Event.':' — fewer than three; you stayed in cover.'}
      ${rc>=3 && !ph.exposure && !ph.hide? `<div class="row" style="margin-top:6px"><button class="btn sm red" data-act="exposure">Take the risk — draw Exposure</button><button class="btn sm ghost" data-act="hide">Hide this phase</button></div>`:''}
      ${ph.hide? '<div style="margin-top:4px">You hid. Write how you passed the time; these prompts are lost.</div>':''}
      ${ph.exposure? `<div style="margin-top:6px"><span class="chip ${colorOf(ph.exposure.card)}">${cardLabel(ph.exposure.card)}</span> <b>${esc(ph.exposure.t)}</b> — ${esc(ph.exposure.d)} ${ph.exposure.fight?`<button class="btn xs red" data-act="fight" data-type="astrolithic">Fight the Astrolithic Rook</button>`:''}</div>`:''}
    </div>`; }
  if(tid==='crackways' && a.crackMarker) html+=`<p class="notice">Marker: <b>${a.crackMarker==='black'?'Signed safe — ignore Bandit modifiers':'Unmarked — Bandits apply'}</b></p>`;
  if(ph.weather) html+=`<div class="notice ocean"><b>Weather this phase:</b> <span class="chip ${colorOf(ph.weather.card)}">${cardLabel(ph.weather.card)}</span> <b>${esc(ph.weather.t)}</b> — ${esc(ph.weather.d||'')}</div>`;
  // Prompts
  ph.cards.forEach((c,i)=>{
    const e=lookup(tid,c);
    const subs=ph.sub.filter(s=>s.forIdx===i);
    html+=`<div class="prompt" id="p${i}"><div class="h"><span class="cardtag ${colorOf(c)}">${cardLabel(c)}</span><h4>${esc(e.t)}</h4>${e.mod?`<span class="m">${esc(e.mod)}</span>`:''}</div><div class="d">${esc(e.d||'')}</div>`;
    const acts=[];
    if(e.sub) acts.push(`<button class="btn xs" data-act="sub" data-sub="${e.sub}" data-i="${i}">Draw ${TABLES[e.sub]?.short||e.sub}</button>`);
    if(e.sub||e.sub2||e.weather) acts.push(helpBtn('subdraw','Help: items, events and weather'));
    if(e.sub2) acts.push(`<button class="btn xs" data-act="sub" data-sub="${e.sub2}" data-i="${i}">Draw ${TABLES[e.sub2]?.short}</button>`);
    if(e.weather) acts.push(`<button class="btn xs ocean" data-act="weather" data-i="${i}" ${ph.weather?'disabled':''}>${ph.weather?'Weather already set':'Check weather'}</button>`);
    if(e.fight){ let type=e.fight; if(type==='rookbysize') type = isRed(c)?'massive':'medium'; acts.push(`<button class="btn xs red" data-act="fight" data-type="${type}">${type==='person'?'Fight them':'Fight it'}</button>`); if((type==='massive') && a.modules.elite) acts.push(`<button class="btn xs ghost" data-act="feral" data-i="${i}">Feral check</button>`); }
    if(e.gain==='score') acts.push(`<button class="btn xs grass" data-act="gain" data-k="exp" data-i="${i}">+1 Exploration</button><button class="btn xs grass" data-act="gain" data-k="com" data-i="${i}">+1 Combat</button>`);
    if(e.gain==='treasure') acts.push(`<button class="btn xs grass" data-act="gainT" data-n="1" data-i="${i}">+1 Treasure</button>`);
    if(e.gain==='treasure2') acts.push(`<button class="btn xs grass" data-act="gainT" data-n="2" data-i="${i}">+2 Treasures</button>`);
    if(e.clue) acts.push(ph.clued.includes(i)? `<span class="chip">Clue recorded (${a.clues}/3)</span>` : `<button class="btn xs ochre" data-act="clue" data-i="${i}">Record this clue</button>`);
    if(e.nest) acts.push(a.clues>=3? `<span class="chip">You hold ${a.clues} clues — enter and read Roomlands p.91</span>`:`<span class="chip">${a.clues}/3 clues — not yet</span>`);
    if(!e.check && (e.garg || /draw (another|a) card/i.test(e.d||''))) acts.push(`<button class="btn xs ghost" data-act="colour" data-i="${i}">Draw a colour card</button>`);
    if(e.check){ const done=ph.sub.find(s=>s.kind==='check'&&s.forIdx===i); if(!done) acts.push(`<button class="btn xs ghost" data-act="check" data-i="${i}">${esc(e.check[0].label||'Draw a card')}</button>`); }
    if(e.item){ const got=ph.sub.find(s=>s.kind==='item'&&s.forIdx===i); acts.push(got? '<span class="chip">Added to inventory</span>' : `<button class="btn xs grass" data-act="takeItem" data-i="${i}">Take: ${esc(e.item)}</button>`); }
    if(e.gain==='combat-item'){ const got=ph.sub.find(s=>s.kind==='gain'&&s.forIdx===i); if(!got) acts.push(`<button class="btn xs grass" data-act="gain" data-k="com" data-i="${i}">Equip it: +1 Combat</button>`); }
    if(e.switchFound||e.jam||e.keyUse||e.exitWith) acts.push(hallFlagButtons(a, tid, e, i));
    if(e.maze) acts.push(`<button class="btn xs ghost" data-act="maze" data-i="${i}">Draw 5 for the maze</button>`);
    if(e.extra) acts.push(ph.sub.find(s=>s.kind==='extra'&&s.forIdx===i)? '' : `<button class="btn xs ochre" data-act="extra" data-i="${i}">Draw the extra card</button>`);
    if(e.t==='A city' ) acts.push(`<button class="btn xs ghost" data-act="goCity">Enter the city</button>`);
    if(e.t==='The sea') acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="ocean">Set sail (Ocean table)</button>`);
    if(e.t==='Door') acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="tundroom">The Room beyond is a Tundroom</button><button class="btn xs ghost" data-act="goLoc" data-loc="crackways">Make it a Crackway</button>`);
    if(e.t==='Cave'||e.t==='Staircase') acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="crackways">Make it a Crackway</button>`);
    if(e.t==='Staircase') acts.push((a.staircases||0)>=1? `<button class="btn xs ghost" data-act="goLoc" data-loc="battlements">Climb to the Battlements</button>` : `<span class="chip">Your first staircase — it leads to another floor</span>`);
    if(e.t==='Gargoyles' && c.s==='D') acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="rafters">Carried to the Rafters</button>`);
    if(tid==='ocean' && (c.r===9||c.r===10)) acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="land">Go ashore (Roomlands table)</button>`);
    if(tid==='battlements' && c.r===11) acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="land">Climb down (Roomlands)</button>`);
    if(tid==='rafters' && c.r===10 && !isRed(c)) acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="land">Leave the Rafters</button>`);
    if(tid==='rafters' && c.r===8 && !isRed(c)) acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="battlements">Through the skylight</button>`);
    if(tid==='tundroom' && c.r===7) acts.push(`<button class="btn xs ghost" data-act="goLoc" data-loc="land">Leave the Tundroom</button>`);
    if(tid==='tundroom' && (c.r===3||c.r===10) && !isRed(c)) acts.push(`<button class="btn xs ghost" data-act="sub" data-sub="crew" data-i="${i}">Draw crew (after solving)</button><button class="btn xs grass" data-act="crewUp" data-i="${i}">+2 crew</button>`);
    if(e.gain==='combat-buy') acts.push(`<button class="btn xs grass" data-act="buyCombat">Pay 1 Treasure, +1 Combat</button>`);
    if(e.heal || (/heal/i.test(e.d||'') && /1 point|one Wound|one of your Wounds|heal a single/i.test(e.d||''))) acts.push(`<button class="btn xs grass" data-act="heal" data-k="exp">Heal +1 Exploration</button><button class="btn xs grass" data-act="heal" data-k="com">Heal +1 Combat</button>`);
    if(/take (1|one) Wound|take one WOUND/i.test(e.d||'')||e.wound) acts.push(`<button class="btn xs red" data-act="wound" data-k="exp">Wound Exploration</button><button class="btn xs red" data-act="wound" data-k="com">Wound Combat</button>`);
    if(acts.length) html+=`<div class="acts">${acts.join('')}</div>`;
    subs.forEach(s=>{ html+=`<div class="row" style="margin-top:8px;align-items:center">${s.cards? s.cards.map(x=>`<span class="chip ${colorOf(x)}">${cardLabel(x)}</span>`).join('') : `<span class="chip ${colorOf(s.card)}">${cardLabel(s.card)}</span>`}<span class="small"><b>${esc(s.title)}</b>${s.text?' — '+esc(s.text):''}</span>${s.fight?`<button class="btn xs red" data-act="fight" data-type="${s.fight}" ${s.feralScore?`data-score="${s.feralScore}"`:''}>Fight</button>`:''}${s.wound&&!s.wounded?`<button class="btn xs red" data-act="subWound" data-k="exp" data-s="${ph.sub.indexOf(s)}">Wound Exploration</button><button class="btn xs red" data-act="subWound" data-k="com" data-s="${ph.sub.indexOf(s)}">Wound Combat</button>`:s.wounded?'<span class="chip">Wound taken</span>':''}</div>`; });
    html+=`</div>`;
  });
  if(hasItem(a,'matrix') && (T.all||T.red)){ const entries=[]; for(const col of ['all','red','black','face']){ if(T[col]) for(const r in T[col]) entries.push({k:col+':'+r, t:(T[col][r].t)+(col==='red'?' (red)':col==='black'?' (black)':'')}); }
    html+=`<div class="row" style="margin-top:10px;align-items:center"><span class="small"><b>Navigation Matrix</b> — add a prompt of your choice to this phase (single use):</span><select id="matrixsel" style="width:auto">${entries.map(e=>`<option value="${e.k}">${esc(e.t)}</option>`).join('')}</select><button class="btn xs ghost" data-act="matrix">Add it</button></div>`; }
  html+=`<div class="row" style="margin-top:12px"><button class="btn ocean" data-act="logPhase">${ph.logged?'Log phase again':'Log this phase to the journal'}</button><button class="btn ghost" data-act="newPhase">Finish — next phase</button>${a.rookhome?`<button class="btn ghost" data-act="maint">Rookhome maintenance draw</button>`:''}</div>`;
  if(HALL_IDS.includes(tid)) html+=hallStatusHTML(a, tid);
  if(a.lastMaint) html+=`<p class="notice ocean" style="margin-top:8px">Rookhome: <b>${esc(a.lastMaint.t)}</b> — ${esc(a.lastMaint.d)}</p>`;
  return html;
}

function addSub(a, ph, kind, idx, extra={}){
  const [c]=drawCards(a,1); if(!c) return null;
  let s={kind, card:c, forIdx:idx};
  if(TABLES[kind]){ const e=lookup(kind,c); s.title=e.t; s.text=[e.mod,e.d].filter(Boolean).join(' · '); if(e.fight) s.fight=e.fight; if(e.gain==='treasure'){ a.treasures++; s.text+=' (+1 Treasure added)'; } if(e.gain==='treasure2'){ a.treasures+=2; s.text+=' (+2 Treasures added)'; } }
  Object.assign(s, extra);
  ph.sub.push(s); touch(a); return s;
}
function onExploreAction(ev){
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=adv(); const act=b.dataset.act; const ph=a.phase; const i=Number(b.dataset.i);
  const tid = a.location==='parapette'? a.quarter : a.location;
  switch(act){
    case 'startPhase': startPhase(a, tid); render(); break;
    case 'questArrive': { a.phase={table:tid, cards:[], sub:[], weather:null, marker:null, exposure:null, hide:false, maze:null, logged:false, ts:Date.now(), clued:[], questArrival:{location:a.quest.location, twist:a.quest.twist, reward:a.quest.reward}}; a.quest.phasesTravelled++; a.quest.arrived=true; touch(a); render(); break; }
    case 'rest': ph.rested=true; a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); touch(a); render(); break;
    case 'redraw': startPhase(a, tid); render(); toast('Redrawn — the earlier cards are discarded'); break;
    case 'newPhase': a.phase=null; touch(a); render(); break;
    case 'quickDraw': { const [c]=drawCards(a,1); a.lastQuick=c; touch(a); render(); break; }
    case 'marker': { const [c]=drawCards(a,1); a.crackMarker=colorOf(c); touch(a); render(); toast(`${cardLabel(c)} — ${a.crackMarker==='black'?'signed safe':'unmarked'}`); break; }
    case 'maint': { const [c]=drawCards(a,1); const m=ROOKHOME_MAINT[c.s]; a.lastMaint={t:`${cardLabel(c)} ${m.t}`, d:m.d}; touch(a); render(); break; }
    case 'sub': addSub(a, ph, b.dataset.sub, i); render(); break;
    case 'weather': { if(ph.weather) break; const [c]=drawCards(a,1); const e=lookup('weather',c); ph.weather={card:c,t:e.t,d:e.d}; if(e.gain==='score') toast('Sunshine — add 1 to Exploration or Combat on your sheet'); touch(a); render(); break; }
    case 'colour': { const [c]=drawCards(a,1); ph.sub.push({kind:'colour', card:c, forIdx:i, title: isRed(c)?'Red':'Black', text:`${RANK_WORDS[c.r-1]} of ${SUITS[c.s].name}`}); touch(a); render(); break; }
    case 'maze': { const cs=drawCards(a,5); const reds=cs.filter(isRed).length; const ok = reds>=3 || (5-reds)>=3; ph.sub.push({kind:'maze', cards:cs, card:cs[0], forIdx:i, title: ok?'You find your way through':'Lost in the maze', text: ok?`${Math.max(reds,5-reds)} of one colour`:'Add one Exploration phase to the crossing'}); touch(a); render(); break; }
    case 'extra': { const [c]=drawCards(a,1); if(c){ ph.cards.push(c); ph.sub.push({kind:'extra', card:c, forIdx:i, title:'Extra card drawn', text:lookup(tid,c).t}); touch(a); render(); } break; }
    case 'feral': { const [c]=drawCards(a,1); const feral=isRed(c); const score = c.r<=5?6: c.r<=9?7:8; ph.sub.push({kind:'feral', card:c, forIdx:i, title: feral?`Feral Massive Rook — Combat score ${score}`:'Not feral — a standard Massive Rook', text: feral?'Much more vicious and skilled. Why are these appearing now?':'', fight: feral?'feral':null, feralScore: feral?score:null}); touch(a); render(); break; }
    case 'exposure': { const [c]=drawCards(a,1); const e=lookup('exposure',c); ph.exposure={card:c,t:e.t,d:e.d,fight:e.fight}; if(e.gain==='treasure'){ a.treasures++; } touch(a); render(); break; }
    case 'hide': ph.hide=true; touch(a); render(); break;
    case 'gain': a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); ph.sub.push({kind:'gain',card:ph.cards[i],forIdx:i,title:`+1 ${b.dataset.k==='exp'?'Exploration':'Combat'} taken`}); touch(a); render(); break;
    case 'gainT': a.treasures+=Number(b.dataset.n); ph.sub.push({kind:'gain',card:ph.cards[i],forIdx:i,title:`+${b.dataset.n} Treasure taken`}); touch(a); render(); break;
    case 'heal': a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); touch(a); render(); toast('Healed'); break;
    case 'wound': a[b.dataset.k]=Math.max(0,a[b.dataset.k]-1); touch(a); render(); toast('Wound taken'); break;
    case 'subWound': { const s=ph.sub[Number(b.dataset.s)]; if(s&&!s.wounded){ s.wounded=true; a[b.dataset.k]=Math.max(0,a[b.dataset.k]-1); touch(a); render(); toast('Wound taken'); } break; }
    case 'clue': if(!ph.clued.includes(i)){ ph.clued.push(i); a.clues++; touch(a); render(); } break;
    case 'crewUp': a.crew=Math.min(5,a.crew+2); touch(a); render(); toast(`Crew: ${a.crew}/5`); break;
    case 'buyCombat': if(a.treasures>0){ a.treasures--; a.com=Math.min(5,a.com+1); touch(a); render(); } else toast('No treasure to spend'); break;
    case 'goLoc': a.location=b.dataset.loc; if(ph) ph.logged||markLog(a); touch(a); render(); break;
    case 'check': { const e=lookup(tid,ph.cards[i]); const stages=e.check; const cards=[]; let text=[]; let wound=false;
      for(const st of stages){ const [c]=drawCards(a,1); cards.push(c); const hit = st.on==='red'? isRed(c) : st.on==='black'? !isRed(c) : c.s===st.on; text.push(`${cardLabel(c)}: ${hit? st.hit : st.miss}`); if(hit && st.wound) wound=true; if(!hit) break; }
      ph.sub.push({kind:'check', cards, card:cards[0], forIdx:i, title: text.join(' · '), text: wound? 'Take 1 Wound: ' : ''}); if(wound) ph.sub[ph.sub.length-1].wound=true; touch(a); render(); break; }
    case 'takeItem': { const e=lookup(tid,ph.cards[i]); a.inventory.push(e.item); ph.sub.push({kind:'item', card:ph.cards[i], forIdx:i, title:`Taken: ${e.item}`}); touch(a); render(); break; }
    case 'matrix': { const sel=document.getElementById('matrixsel'); if(!sel) break; const [col,r]=sel.value.split(':'); const T=TABLES[tid]; const e=T[col][r]; ph.sub.push({kind:'matrix', card:ph.cards[0], forIdx:ph.cards.length-1, title:`Navigation Matrix: ${e.t}`, text:e.d||''}); removeItem(a,'matrix'); touch(a); render(); toast('The Navigation Matrix is spent'); break; }
    case 'hallFlag': { const ss=seastoneOf(a); ss.flags[b.dataset.flag]=true; touch(a); render(); toast(b.dataset.msg||'Noted'); break; }
    case 'hallDone': { const ss=seastoneOf(a); ss.antechamber=true; a.location='crownisle'; a.phase=null; touch(a); render(); toast('The labyrinth opens into the Antechamber — read Roomlands p.74'); break; }
    case 'openDoor': { const ss=seastoneOf(a); ss.door=b.dataset.to; a.location=b.dataset.to; a.phase=null; touch(a); render(); break; }
    case 'isleDraw': { const ss=seastoneOf(a); const [c]=drawCards(a,1); ss.isle[b.dataset.id]={card:c}; touch(a); render(); break; }
    case 'isleItem': { const ss=seastoneOf(a); const ar=CROWN_ISLE.find(x=>x.id===b.dataset.id); const r=ss.isle[ar.id]; const it = b.dataset.reward? ar.rewardOnWin : ar.items[r.card.s]; if(it){ a.inventory.push(it); r.taken=true; } touch(a); render(); break; }
    case 'isleTreasure': { const ss=seastoneOf(a); a.treasures+=Number(b.dataset.n); ss.isle[b.dataset.id].taken=true; touch(a); render(); break; }
    case 'isleHeal': { const ss=seastoneOf(a); a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); ss.isle[b.dataset.id].taken=true; touch(a); render(); break; }
    case 'isleReset': { const ss=seastoneOf(a); ss.isle={}; ss.halls={}; ss.flags={}; ss.antechamber=false; ss.door=null; touch(a); render(); break; }
    case 'goCity': a.location='city'; if(!a.city) a.city={name:'',amenities:[],tavernUsed:false,house:false,phasesSince:0}; touch(a); render(); break;
    case 'randQuarter': { const [c]=drawCards(a,1); a.quarter=QUARTER_BY_SUIT[c.s]; touch(a); render(); toast(`${cardLabel(c)} — ${TABLES[a.quarter].short}`); break; }
    case 'fight': { const type=b.dataset.type; const score=b.dataset.score? Number(b.dataset.score):null; beginCombat(a, type, score); state.tab='combat'; render(); window.scrollTo({top:0}); break; }
    case 'logPhase': logPhaseToJournal(a); break;
    // city & parapette & oracle actions
    default: if(onCityAction(a, act, b)) { render(); } else if(onOracleAction(a, act, b)) { render(); }
  }
}
function markLog(a){ /* no-op hook */ }
function logPhaseToJournal(a){
  const ph=a.phase; if(!ph) return; const tid=ph.table; const T=TABLES[tid];
  const lines=ph.cards.map(c=>{ const e=lookup(tid,c); return `${cardLabel(c)} ${e.t}${e.mod?' ('+e.mod+')':''}`; });
  if(ph.questArrival) lines.push(`Quest location: ${ph.questArrival.location} — ${ph.questArrival.twist}`);
  if(!ph.logged && ph.cards.some(c=>lookup(tid,c).t==='Staircase')) a.staircases=(a.staircases||0)+1;
  ph.sub.forEach(s=>{ if(s.kind==='colour') return; lines.push(`↳ ${s.cards? s.cards.map(cardLabel).join(' '):cardLabel(s.card)} ${s.title}`); });
  if(ph.weather) lines.push(`Weather ${cardLabel(ph.weather.card)} ${ph.weather.t}`);
  if(ph.exposure) lines.push(`Exposure ${cardLabel(ph.exposure.card)} ${ph.exposure.t}`);
  a.journalCount=(a.journalCount||0)+1;
  const e={id:uid(), ts:Date.now(), updatedAt:Date.now(), kind:'exploration', title:`Chapter ${a.journalCount}`, where:T?T.short:whereLabel(a), cards:lines, text:''};
  journalOf(a.id).unshift(e); ph.logged=true; touch(a); touchEntry(a.id,e);
  state.tab='journal'; state.focusEntry=e.id; render(); window.scrollTo({top:0});
}

/* ---------- Oracles ---------- */
function renderOracles(a){
  const o=a.oracle||{};
  return `<details class="rule" ${o.open?'open':''} id="oracles"><summary>Oracles — when you want fate to decide ${helpBtn('oracles','Help: oracles')}</summary><div class="body">
    <div class="grid c3">
      <div><h4>Yes / no</h4><p class="small muted">Draw: red = no, black = yes. Ace–4 worsens it, 10–K improves it.</p><button class="btn sm" data-act="oracleYN">Ask</button>${o.yn?`<p><span class="chip ${colorOf(o.yn.card)}">${cardLabel(o.yn.card)}</span> <b>${esc(o.yn.text)}</b></p>`:''}</div>
      <div><h4>Someone new</h4><p class="small muted">Three draws: a name, a look, a trait.</p><button class="btn sm" data-act="oracleNPC">Meet them</button>${o.npc?`<p>${o.npc.cards.map(c=>`<span class="chip ${colorOf(c)}">${cardLabel(c)}</span>`).join(' ')}<br><b>${esc(o.npc.name)}</b> — ${esc(o.npc.look)}; ${esc(o.npc.trait)}</p>`:''}</div>
      <div><h4>A story thread</h4><p class="small muted">Incite + subject now; save the twist for later.</p><div class="row" style="gap:4px"><button class="btn sm" data-act="oracleStory">Incite + subject</button><button class="btn sm ghost" data-act="oracleTwist">Twist</button></div>${o.story?`<p>${o.story.cards.map(c=>`<span class="chip ${colorOf(c)}">${cardLabel(c)}</span>`).join(' ')}<br><b>${esc(o.story.incite)}</b> ${esc(o.story.subject)}${o.story.twist?`<br>Twist: <b>${esc(o.story.twist)}</b>`:''}</p>`:''}</div>
      <div><h4>Co-op complication</h4><p class="small muted">Two-player games. Red: personal; black: environmental.</p><button class="btn sm" data-act="oracleComp">Draw</button>${o.comp?`<p><span class="chip ${colorOf(o.comp.card)}">${cardLabel(o.comp.card)}</span> <b>${esc(o.comp.t)}</b> — ${esc(o.comp.d)} ${o.comp.fight?`<button class="btn xs red" data-act="fight" data-type="person">Fight</button>`:''}</p>`:''}</div>
      <div><h4>2-player oracle</h4><p class="small muted">Red: bad, no, Player 1 (the Leader). Black: good, yes, Player 2.</p><button class="btn sm" data-act="oracleCoop">Draw</button>${o.coop?`<p><span class="chip ${colorOf(o.coop.card)}">${cardLabel(o.coop.card)}</span> <b>${esc(o.coop.text)}</b></p>`:''}</div>
      <div><h4>Biome of a new land</h4><p class="small muted">Suit and rank name the terrain of a new Room or continent.</p><button class="btn sm" data-act="oracleBiome">Draw terrain</button>${o.biome?`<p><span class="chip ${colorOf(o.biome.card)}">${cardLabel(o.biome.card)}</span> <b>${esc(o.biome.name)}</b> — ${esc(o.biome.d)}</p>`:''}</div>
    </div></div></details>`;
}
function onOracleAction(a, act, b){
  a.oracle=a.oracle||{}; const o=a.oracle; o.open=true;
  if(act==='oracleYN'){ const [c]=drawCards(a,1); const col=isRed(c)?'red':'black'; const lvl=c.r<=4?'lo':c.r<=9?'mid':'hi'; o.yn={card:c,text:ORACLE_RES[col][lvl]}; touch(a); return true; }
  if(act==='oracleNPC'){ const cs=drawCards(a,3); o.npc={cards:cs,name:NPC.name[cs[0].r-1],look:NPC.look[cs[1].r-1],trait:NPC.trait[cs[2].r-1]}; touch(a); return true; }
  if(act==='oracleStory'){ const cs=drawCards(a,2); o.story={cards:cs,incite:STORY.incite[cs[0].r-1],subject:STORY.subject[cs[1].r-1],twist:null}; touch(a); return true; }
  if(act==='oracleTwist'){ const [c]=drawCards(a,1); if(!o.story) o.story={cards:[],incite:'',subject:'',twist:null}; o.story.cards.push(c); o.story.twist=STORY.twist[c.r-1]; touch(a); return true; }
  if(act==='oracleComp'){ const [c]=drawCards(a,1); const e=lookup('complications',c); o.comp={card:c,t:e.t,d:e.d,fight:e.fight}; touch(a); return true; }
  if(act==='oracleCoop'){ const [c]=drawCards(a,1); o.coop={card:c,text:COOP_ORACLE[isRed(c)?'red':'black']}; touch(a); return true; }
  if(act==='oracleBiome'){ const [c]=drawCards(a,1); const idx={S:0,C:2,H:4,D:6}[c.s]+(c.r>=8?1:0); const bm=BIOMES[idx]; o.biome={card:c,name:bm[1],d:bm[2]}; touch(a); return true; }
  return false;
}

/* ---------- Cities ---------- */
function renderCityPanel(a){
  const c=a.city||{name:'',amenities:[],tavernUsed:false,house:false,phasesSince:0};
  let html=`<div class="panel"><div class="row between"><h3>${esc(c.name||'An unnamed city')} <span class="tag">City of Rook husks</span>${helpBtn('city','Help: cities')}</h3><div class="row"><input id="cityname" value="${esc(c.name)}" placeholder="Name this city" style="width:200px"><button class="btn sm ghost" data-act="cityLeave">Leave the city</button></div></div>`;
  if(!c.amenities.length){
    html+=`<p>Every city has a Hunter’s Guild, a Tavern, a Merchant and a Housing District. Draw four more cards for the rest (face cards go to the bottom and are redrawn). Lay them out so each touches another, and sketch the map in your journal.</p><div class="row"><button class="btn ochre" data-act="cityBuild">Build the city — draw 4</button><button class="btn ghost" data-act="cityAbandon">It is abandoned</button></div>`;
  } else {
    html+=`<div class="grid c2" style="margin-top:8px">${c.amenities.map(m=>`<div class="prompt" style="margin:0"><div class="h"><span class="cardtag ${m.s?SUITS[m.s].color:'black'}">${rankLabel(m.r)}${m.s?SUITS[m.s].sym:''}</span><h4>${esc(m.t)}</h4></div><div class="d">${esc(m.d)}</div>${cityActions(a,m)}</div>`).join('')}</div>`;
    html+=`<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="cityBuild">Rebuild (draw 4 again)</button><button class="btn sm ghost" data-act="cityNewVisit">New visit — reset once-per-visit uses</button></div>`;
    html+=questPanel(a,'core');
    html+=`<details class="rule" style="margin-top:10px"><summary>The Merchant’s wares</summary><div class="body"><table class="ref"><tr><th>Item</th><th>Price</th><th>Effect</th><th></th></tr>${MERCHANT.map((m,i)=>{ const tm=m.p.match(/^(\d+) Treasures?$/); const im=m.p.match(/(\d+) items?/i); const can = tm? a.treasures>=Number(tm[1]) : im? a.inventory.length>=Number(im[1]) : true; return `<tr><td><b>${esc(m.t)}</b></td><td>${esc(m.p)}</td><td>${esc(m.d)}</td><td><button class="btn xs ${can?'grass':'ghost'}" data-act="buyMerchant" data-i="${i}" ${can?'':'disabled'}>Buy</button></td></tr>`; }).join('')}</table><p class="tiny muted">Paying with items: the companion adds the purchase and you remove the traded items from your inventory yourself.</p></div></details>`;
  }
  html+='</div>';
  return html;
}
function cityActions(a,m){
  const c=a.city; const acts=[];
  if(m.t==='Tavern') acts.push(c.tavernUsed? `<span class="chip">Stayed this visit</span>`:`<button class="btn xs grass" data-act="tavern" data-k="exp">Stay: +1 Exploration</button><button class="btn xs grass" data-act="tavern" data-k="com">Stay: +1 Combat</button>`, `<button class="btn xs ghost" data-act="questNew" data-origin="core">Ask a stranger for a quest</button>`);
  if(m.t==='Hunter’s Guild') acts.push(`<button class="btn xs ochre" data-act="questNew" data-origin="core">Generate a quest</button>`);
  if(m.t==='Rookling Crèche') acts.push(`<button class="btn xs" data-act="creche">Draw a Rookling (2 Treasures or trade one)</button>${c.lastCreche?`<span class="chip">${esc(c.lastCreche)}</span>`:''}`);
  if(m.t==='House for Sale') acts.push(c.house? `<span class="chip">You own a house here</span><button class="btn xs grass" data-act="houseHeal">Heal fully (a week’s rest)</button>`:`<button class="btn xs" data-act="houseBuy" ${a.treasures<20?'disabled':''}>Buy for 20 Treasures</button>`);
  if(m.t==='Gourmet District') acts.push(`<button class="btn xs grass" data-act="spend" data-k="exp" data-cost="1">Meal: 1 Treasure → +1 Exploration</button>`);
  if(m.t==='Weapon Smith') acts.push(`<button class="btn xs grass" data-act="spend" data-k="com" data-cost="1">Upgrade: 1 Treasure → +1 Combat</button><button class="btn xs grass" data-act="spend" data-k="com" data-cost="2">New weapon: 2 Treasures → +1 Combat</button>`);
  return acts.length? `<div class="acts">${acts.join('')}</div>`:'';
}
function questPanel(a, origin){
  const q=a.quest; const Q=QUEST[origin];
  let html=`<div class="prompt" style="margin-top:12px"><div class="h"><h4>Hunter’s Guild quest</h4>${helpBtn('quest','Help: quests')}</div>`;
  if(q && q.status==='out'){
    html+=`<div class="d"><b>${esc(q.twist)}</b><br>Location: ${esc(q.location)} — ${q.distance} Exploration phase${q.distance===1?'':'s'} out (travelled ${q.phasesTravelled}). Reward: ${q.reward} Treasures.${q.arrived?` <b>Rook dealt with? The journey back is ${q.distance} phase${q.distance===1?'':'s'}${(a.city&&a.city.house)?' — or one day by caravan, since you own a house':''}. Collect the reward once you are back.</b>`:''}</div>
      <div class="acts"><button class="btn xs red" data-act="fight" data-type="${/medium/i.test(q.twist)&&!/massive/i.test(q.twist)?'medium':'massive'}">Fight the quest Rook</button><button class="btn xs grass" data-act="questDone">Completed — collect ${q.reward} Treasures</button><button class="btn xs ghost" data-act="questDrop">Abandon</button></div>`;
  } else {
    html+=`<div class="d">Three draws: where the Rook is (and how far), what makes it unusual, and the reward.</div><div class="acts"><button class="btn xs ochre" data-act="questNew" data-origin="${origin}">Generate a quest</button></div>`;
    if(a.questDraft && a.questDraft.origin===origin){ const d=a.questDraft; html+=`<div class="row" style="margin-top:8px"><span class="chip ${colorOf(d.cards[0])}">${cardLabel(d.cards[0])}</span><span class="chip ${colorOf(d.cards[1])}">${cardLabel(d.cards[1])}</span><span class="chip ${colorOf(d.cards[2])}">${cardLabel(d.cards[2])}</span></div><div class="d"><b>Twist:</b> ${esc(d.twist)}<br><b>Location:</b> ${esc(d.location)} — ${d.distance} phase${d.distance===1?'':'s'} away<br><b>Reward:</b> ${d.reward} Treasures</div><div class="acts"><button class="btn xs grass" data-act="questAccept">Accept</button><button class="btn xs ghost" data-act="questNew" data-origin="${origin}">Ask for another</button></div>`; }
  }
  return html+'</div>';
}
function renderParapettePanel(a, compact){
  const p=a.parapette||{infirmaryUsed:false, questsDone:0};
  let html=`<div class="panel"><h3>The Great City of Parapette <span class="tag">fixed location</span>${helpBtn('table-parapette','Help: Parapette')}</h3>`;
  if(!compact) html+=`<p class="small">Built inside the husk of a Colossal Rook and split into four quarters by canals. Choose a quarter above (or draw one) and run an Exploration phase there — you may ignore any prompts you like. Parapette is the same city in every player’s game.</p>
    <div class="grid c2"><div><b>♦ Market District</b> — anything bought or sold, 24 hours a day.</div><div><b>♠ The Crescents</b> — the wealthy elite, tree-lined and snobbish.</div><div><b>♥ Guildtown</b> — guilds, the Academy, the great Hunter’s Guild.</div><div><b>♣ The Lanes</b> — cramped, crooked, dangerous, indispensable.</div></div>`;
  html+=`<div class="row" style="margin-top:10px"><button class="btn sm" data-act="rooksrest">Rook’s Rest: draw a twist</button>${a.lastRest?`<span class="chip ${colorOf(a.lastRest.card)}">${cardLabel(a.lastRest.card)}</span><span class="small"><b>${esc(a.lastRest.t)}</b> — ${esc(a.lastRest.d)}</span>`:''}</div>
    <div class="row" style="margin-top:8px"><span class="small muted">Infirmary (once per completed Guild quest):</span>${p.infirmaryUsed?'<span class="chip">Used</span>':`<button class="btn xs grass" data-act="infirm" data-k="exp">Heal +1 Exploration</button><button class="btn xs grass" data-act="infirm" data-k="com">Heal +1 Combat</button>`}</div>`;
  html+=questPanel(a,'parapette');
  return html+'</div>';
}
const CITY_ACTS=new Set(['cityBuild','cityAbandon','cityLeave','cityNewVisit','tavern','spend','creche','houseBuy','houseHeal','questNew','questAccept','questDone','questDrop','rooksrest','infirm','buyMerchant']);
function onCityAction(a, act, b){
  if(!CITY_ACTS.has(act)) return false;
  if(act.startsWith('city')||act==='tavern'||act==='spend'||act==='creche'||act.startsWith('house')) a.city=a.city||{name:'',amenities:[],tavernUsed:false,house:false,phasesSince:0};
  const c=a.city||{};
  const nameEl=document.getElementById('cityname'); if(nameEl) c.name=nameEl.value;
  switch(act){
    case 'cityBuild': { const drawn=drawCards(a,4,{skipFace:true,_guard:0}); c.amenities=[...CITY_FIXED.map(f=>({r:f.r,s:null,t:f.t,d:f.d})), ...drawn.map(x=>({r:x.r,s:x.s,t:CITY_DRAW[x.r].t,d:CITY_DRAW[x.r].d}))]; c.tavernUsed=false; touch(a); return true; }
    case 'cityAbandon': a.location='land'; a.city=null; touch(a); toast('The city stands empty. Back to the Roomlands table.'); return true;
    case 'cityLeave': a.location='land'; c.phasesSince=0; touch(a); return true;
    case 'cityNewVisit': c.tavernUsed=false; touch(a); return true;
    case 'tavern': c.tavernUsed=true; a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); touch(a); return true;
    case 'spend': { const cost=Number(b.dataset.cost); if(a.treasures<cost){ toast('Not enough treasure'); return true; } a.treasures-=cost; a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); touch(a); return true; }
    case 'creche': { const [x]=drawCards(a,1); c.lastCreche=`${cardLabel(x)} ${CRECHE[x.r]}`; touch(a); return true; }
    case 'houseBuy': if(a.treasures>=20){ a.treasures-=20; c.house=true; touch(a);} return true;
    case 'houseHeal': a.exp=a.baseExp; a.com=a.baseCom; touch(a); toast('A week at home — scores restored'); return true;
    case 'questNew': { const origin=b.dataset.origin; const Q=QUEST[origin]; const cs=drawCards(a,3); const loc=rangeLookup(Q.location,cs[0].r); a.questDraft={origin, cards:cs, location:loc[2], distance:Q.distance[cs[0].s], twist:Q.twist[cs[1].r], reward:Q.reward[cs[2].s]}; touch(a); return true; }
    case 'questAccept': if(a.questDraft){ a.quest=Object.assign({status:'out',phasesTravelled:0},a.questDraft); a.questDraft=null; touch(a);} return true;
    case 'questDone': if(a.quest){ a.treasures+=a.quest.reward; a.quest=null; a.parapette=a.parapette||{infirmaryUsed:false,questsDone:0}; a.parapette.infirmaryUsed=false; touch(a); toast('Quest complete — reward collected'); } return true;
    case 'questDrop': a.quest=null; touch(a); return true;
    case 'rooksrest': { const [x]=drawCards(a,1); const e=lookup('rooksrest',x); a.lastRest={card:x,t:e.t,d:e.d}; touch(a); return true; }
    case 'infirm': a.parapette=a.parapette||{infirmaryUsed:false}; a.parapette.infirmaryUsed=true; a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); touch(a); return true;
    case 'buyMerchant': { const m=MERCHANT[Number(b.dataset.i)]; const tm=m.p.match(/^(\d+) Treasures?$/); if(tm){ const cost=Number(tm[1]); if(a.treasures<cost){ toast('Not enough treasure'); return true; } a.treasures-=cost; } a.inventory.push(m.t); touch(a); toast(tm? `${m.t} bought for ${tm[1]} Treasure${tm[1]==='1'?'':'s'}` : `${m.t} added — remove the ${m.p.toLowerCase()} you traded`); return true; }
  }
  return false;
}


/* ---------- Search for the Seastone (mechanics only) ---------- */
function hallStatusHTML(a, tid){
  const ss=seastoneOf(a); const n=ss.halls[tid]||0; const fl=ss.flags;
  const flags=[]; if(tid==='torrents'){ if(fl.switch) flags.push('switch thrown'); if(fl.torrentsOff) flags.push('torrents off'); } if(tid==='winds'){ if(fl.fan) flags.push('fan destroyed'); } if(tid==='gears'){ if(fl.jam) flags.push('jam cleared'); }
  return `<div class="notice ocean" style="margin-top:10px"><b>${esc(TABLES[tid].short)}:</b> ${n} of 3 Exploration phases spent${flags.length?' · '+flags.join(', '):''}. ${n>=3?'You may move on.':''}
    <div class="row" style="margin-top:6px">${n>=3?`<button class="btn xs ochre" data-act="hallDone">Move on — the Antechamber</button>`:''}<button class="btn xs ghost" data-act="goLoc" data-loc="crownisle">Back to the Hall of Doors</button></div></div>`;
}
function hallFlagButtons(a, tid, e, i){
  const ss=seastoneOf(a); const fl=ss.flags;
  if(e.switchFound) return fl.switch? '<span class="chip">Switch thrown</span>' : `<button class="btn xs ghost" data-act="hallFlag" data-flag="switch" data-msg="The switch grinds over — somewhere a grating lifts">Throw the switch</button>`;
  if(e.jam) return fl.jam? '<span class="chip">Jam cleared</span>' : `<button class="btn xs ghost" data-act="hallFlag" data-flag="jam" data-msg="The gears turn again">Clear the jam</button>`;
  if(e.keyUse) return fl.torrentsOff? '<span class="chip">Torrents switched off</span>' : a.inventory.some(x=>/key/i.test(x))? `<button class="btn xs ghost" data-act="hallFlag" data-flag="torrentsOff" data-msg="The engine shudders to a halt — no more rushes of water">Use the key</button>` : '<span class="chip">Needs a key</span>';
  if(e.exitWith){ const ok = e.exitWith==='switch'? fl.switch : fl.jam; return ok? `<button class="btn xs ochre" data-act="hallDone">Pass through — the Hall is complete</button>` : `<span class="chip">Needs the ${e.exitWith==='switch'?'switch thrown':'jam cleared'}</span>`; }
  return '';
}
function renderCrownIsle(a){
  const ss=seastoneOf(a); const isle=ss.isle;
  let html=`<div class="panel"><h3>Crown Isle <span class="tag">Search for the Seastone</span>${helpBtn('seastone','Help: the Seastone campaign')}</h3>
  <p class="small">Two ocean phases due north of Crag’s End (ignore the Weather table — mist and fog the whole way). A perfectly circular island ringed by a castellated wall; less than a day to see all of it. Investigate the numbered areas in any order. The story stays in the book (Roomlands pp.62–66); this panel only resolves the draws.</p>
  <div class="grid c2">`;
  for(const ar of CROWN_ISLE){ const r=isle[ar.id];
    html+=`<div class="prompt" style="margin:0"><div class="h"><h4>${esc(ar.t)}</h4></div><div class="d">${esc(ar.d)}</div>`;
    if(ar.doors){ html+=`<div class="acts">${HALL_DOORS.map(d=>`<button class="btn xs ${ss.door===d.to?'ocean':'ghost'}" data-act="openDoor" data-to="${d.to}">${esc(d.t)} → ${esc(TABLES[d.to].short)}${(ss.halls[d.to]||0)>=3?' ✓':''}</button>`).join('')}</div><div class="small muted" style="margin-top:6px">The Hall of Doors (p.67): three doors, each a storytelling puzzle to open with what your character has and knows. ${HALL_DOORS.map(d=>`<b>${d.t}:</b> ${esc(d.d)}`).join(' ')}</div>`; }
    else if(!r){ html+=`<div class="acts"><button class="btn xs" data-act="isleDraw" data-id="${ar.id}">Draw a card</button></div>`; }
    else { html+=`<div class="row" style="margin-top:8px;align-items:center"><span class="chip ${colorOf(r.card)}">${cardLabel(r.card)}</span><span class="small"><b>${esc(ar.draw[r.card.s])}</b></span></div><div class="acts">`;
      if(ar.items&&ar.items[r.card.s]) html+= r.taken? '<span class="chip">Taken</span>' : `<button class="btn xs grass" data-act="isleItem" data-id="${ar.id}">Add to inventory</button>`;
      if(ar.treasure&&ar.treasure[r.card.s]) html+= r.taken? '<span class="chip">Treasure taken</span>' : `<button class="btn xs grass" data-act="isleTreasure" data-id="${ar.id}" data-n="${ar.treasure[r.card.s]}">+${ar.treasure[r.card.s]} Treasure</button>`;
      if(ar.heal&&ar.heal[r.card.s]) html+= r.taken? '<span class="chip">Healed</span>' : `<button class="btn xs grass" data-act="isleHeal" data-id="${ar.id}" data-k="exp">+1 Exploration</button><button class="btn xs grass" data-act="isleHeal" data-id="${ar.id}" data-k="com">+1 Combat</button>`;
      if(ar.fight&&ar.fight[r.card.s]) html+= `<button class="btn xs red" data-act="fight" data-type="${ar.fight[r.card.s]}">Fight the Medium Rook</button>${r.card.s==='H'?'<span class="small muted">or hide and avoid it</span>':''}${r.taken?'<span class="chip">Halberd taken</span>':`<button class="btn xs grass" data-act="isleItem" data-id="${ar.id}" data-reward="1">Beaten it? Take the halberd</button>`}`;
      html+=`</div>`; }
    html+=`</div>`; }
  html+=`</div>`;
  if(ss.antechamber) html+=`<div class="notice grass" style="margin-top:12px"><b>The Antechamber.</b> A camp, a wounded young woman tending her arm — Aanya. Talk with her (Roomlands p.74), then face the Seastone Door together. <button class="btn sm red" data-act="fight" data-type="queen">Face the Drowned Queen</button></div>`;
  html+=`<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="goLoc" data-loc="ocean">Back to sea</button><button class="btn sm ghost" data-act="isleReset">Reset the island</button></div></div>`;
  return html;
}
