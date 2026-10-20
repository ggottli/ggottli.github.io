/* =====================================================================
   CHARACTER
   ===================================================================== */
function classCardHTML(id, selected){
  const c=CLASSES[id];
  return `<button type="button" class="panel plain classpick" data-class="${id}" aria-pressed="${selected}" style="text-align:left; cursor:pointer; margin:0; ${selected?'outline:3px solid var(--ochre); outline-offset:-3px;':''}">
    <h3 style="justify-content:space-between">${esc(c.name)} <span class="tag">${esc(c.book)}</span></h3>
    <div class="row" style="gap:16px;margin:4px 0 8px"><span class="score">Exp ${boxes(c.exp)}</span><span class="score">Com ${boxes(c.com)}</span></div>
    <p class="small" style="margin:0">${esc(c.blurb)}</p>
  </button>`;
}
function renderCharacter(main){
  const a=adv();
  if(!a){
    main.innerHTML=`
      <div class="section-title"><h2>Create your adventurer</h2><span class="rule"></span><span class="hint">Calling · Nature · Class · Weapon</span></div>
      ${guideHTML(['Class','Calling','Nature','Weapon','Set out'],0,'Name your adventurer and choose a class. The other three come next, on the character sheet.','character')}
      <div class="panel">
        <p>Your character is someone this world has called out of the safety of the village. Pick a class — it sets how many cards you draw when exploring and how many attack options you hold in a fight. Calling and Nature can be drawn with cards once your adventurer exists.</p>
        <div class="field"><label for="newname">Name</label><input id="newname" placeholder="e.g. Ilsa of the Doorway Forest"></div>
        <div class="grid c2" id="classgrid">${Object.keys(CLASSES).filter(k=>k!=='within').map(k=>classCardHTML(k, k==='armed')).join('')}</div>
        <div class="row" style="margin-top:14px"><button class="btn ochre" id="createbtn">Begin the adventure</button><span class="muted small">You can change class later; scores stay as they are.</span></div>
      </div>
      ${syncPanelHTML()}
      <div class="panel plain"><h3>Already have a save file?</h3><p class="small">Paste or choose an exported companion file to restore it.</p>${importHTML()}</div>`;
    let picked='armed';
    main.querySelectorAll('.classpick').forEach(b=>b.addEventListener('click',()=>{ picked=b.dataset.class; main.querySelectorAll('.classpick').forEach(x=>{ x.setAttribute('aria-pressed', x.dataset.class===picked); x.style.outline = x.dataset.class===picked?'3px solid var(--ochre)':'none'; }); }));
    document.getElementById('createbtn').addEventListener('click',()=>{ const n=document.getElementById('newname').value.trim(); const na=newAdventure(n||'Unnamed adventurer'); const c=CLASSES[picked]; na.cls=picked; na.exp=na.baseExp=c.exp; na.com=na.baseCom=c.com; state.adventures.push(na); state.activeId=na.id; touch(na); render(); toast('A new chapter begins'); });
    wireImport(main);
    return;
  }
  const c=CLASSES[a.cls];
  const missing = [!a.cls, !(a.calling||a.callingTitle), !a.nature, !a.weapon];
  const step = missing.indexOf(true)===-1? 4 : missing.indexOf(true);
  const nowText = ['Choose a class.','Give your character a Calling — draw a card, or write your own.','Give them a Nature — draw a card, or write your own.','Name their weapon. Anything roughly medieval; it has no stats.','Everything is in place. Head to Explore and draw your first phase.'][step];
  main.innerHTML=`
    <div class="section-title"><h2>Character sheet</h2><span class="rule"></span><span class="hint">${esc(c.name)} · ${esc(c.book)}</span></div>
    ${guideHTML(['Class','Calling','Nature','Weapon','Set out'],step,nowText,'character')}
    <div class="grid c2">
      <div class="panel">
        <div class="field"><label>Name</label><input data-bind="name"></div>
        ${a.cls==='allied'? `<div class="field"><label>Companion’s name (Allied)</label><input data-bind="companion" placeholder="Your second adventurer"></div>`:''}
        <div class="field"><label>Class</label><select data-bind="cls">${Object.keys(CLASSES).map(k=>`<option value="${k}">${esc(CLASSES[k].name)} — Exp ${CLASSES[k].exp} / Com ${CLASSES[k].com}</option>`).join('')}</select></div>
        <div class="field"><label>Weapon</label><input data-bind="weapon" placeholder="Sword, axe, hand cannon, mount-mounted ram… roughly medieval"></div>
        <div class="field"><label>Look</label><textarea data-bind="look" rows="3" placeholder="Armour, arm, helm, mount, scars, colours…"></textarea></div>
        <div class="field"><label>Nature <button class="btn xs ghost" data-act="drawNature" style="margin-left:6px">Draw a card</button></label><input data-bind="nature" placeholder="How you react to the world"></div>
        <div class="field"><label>Calling <button class="btn xs ghost" data-act="drawCalling" style="margin-left:6px">Draw a card</button></label>
          <input data-bind="callingTitle" placeholder="Title (optional)" style="margin-bottom:6px"><textarea data-bind="calling" rows="4" placeholder="What calls you beyond the safe and known?"></textarea></div>
      </div>
      <div>
        <div class="panel">
          <h3>Scores <span class="tag">max 5 each</span>${helpBtn('scores','Help: scores and wounds')}</h3>
          <div class="row between" style="margin-bottom:8px"><span class="score" style="font-size:14px">Exploration ${boxes(a.exp,5,a.rookhome?2:0)}</span><span class="row" style="gap:4px"><button class="btn xs ghost" data-act="score" data-k="exp" data-d="-1" aria-label="Wound exploration">− wound</button><button class="btn xs ghost" data-act="score" data-k="exp" data-d="1" aria-label="Heal exploration">+ heal</button></span></div>
          <div class="row between"><span class="score" style="font-size:14px">Combat ${boxes(a.com)}</span><span class="row" style="gap:4px"><button class="btn xs ghost" data-act="score" data-k="com" data-d="-1" aria-label="Wound combat">− wound</button><button class="btn xs ghost" data-act="score" data-k="com" data-d="1" aria-label="Heal combat">+ heal</button></span></div>
          <p class="tiny muted" style="margin-top:8px">Each Wound removes a point from Exploration or Combat — your choice. A score at zero means death${a.cls==='allied'?' for one of your pair (add 2 back and carry on alone)':''}. Starting values: Exp ${a.baseExp} / Com ${a.baseCom} (a house in a city heals back to these).</p>
          ${(a.exp===0||a.com===0)? `<div class="notice red">${a.cls==='allied'? `A score is at zero: one of your pair dies. <button class="btn xs red" data-act="alliedFall" data-k="${a.exp===0?'exp':'com'}">They fall — add 2 and carry on alone</button>` : 'A score is at zero. Your adventurer is dying — write their final entry in the journal, or begin a new adventurer who finds this one’s book.'}</div>`:''}
          <div class="row" style="margin-top:8px; gap:14px; align-items:flex-end">
            <div><label>Treasures</label><div class="row" style="gap:4px"><button class="btn xs ghost" data-act="treasure" data-d="-1">−</button><b style="font-family:Oswald,sans-serif;font-size:22px;min-width:28px;text-align:center">${a.treasures}</b><button class="btn xs ghost" data-act="treasure" data-d="1">+</button></div></div>
            ${(a.location==='rafters'||a.clues>0)? `<div><label>Gargoyle clues</label><div class="row" style="gap:4px"><button class="btn xs ghost" data-act="clue" data-d="-1">−</button><b style="font-family:Oswald,sans-serif;font-size:22px;min-width:28px;text-align:center">${a.clues}</b><button class="btn xs ghost" data-act="clue" data-d="1">+</button></div></div>`:''}
            ${(a.location==='tundroom'||a.crew>1)? `<div><label>Rooknaught crew (incl. you)</label><div class="row" style="gap:4px"><button class="btn xs ghost" data-act="crew" data-d="-1">−</button><b style="font-family:Oswald,sans-serif;font-size:22px;min-width:28px;text-align:center">${a.crew}</b><button class="btn xs ghost" data-act="crew" data-d="1">+</button></div></div>`:''}
          </div>
        </div>
        <div class="panel">
          <h3>Inventory <span class="tag">equipment · items · rewards</span>${helpBtn('inventory','Help: inventory and rewards')}</h3>
          <div class="chips" id="inv">${a.inventory.map((it,i)=>{ const fx=ITEM_FX.find(f=>f.re.test(it)); return `<span class="chip" ${fx?`title="${esc(fx.d)}"`:''}>${esc(it)}${fx?' <span class="tiny muted">⚙</span>':''}<button data-act="rmItem" data-i="${i}" aria-label="Remove ${esc(it)}">×</button></span>`; }).join('')||'<span class="muted small">Nothing yet. Rewards from Rooks and items you find go here.</span>'}</div>
          <div class="row" style="margin-top:8px"><input id="newitem" placeholder="Add an item (Helm — Ice, Rookling, Map of the Wall Caves…)" style="flex:1"><button class="btn sm" data-act="addItem">Add</button></div>
          <p class="tiny muted" style="margin-top:6px">Items marked ⚙ have a rules effect the companion applies for you in combat or on the sheet (hover for details).${helpBtn('items','Help: items with rules effects')}</p>
        </div>
        <div class="panel">
          <h3>Status & modules${helpBtn('modules','Help: Rookhomes, Rooknaughts, Within, Elite')}</h3>
          <label class="check"><input type="checkbox" data-bind="within"> Piloting a Rooksuit (Within) — treat scores as 5/5 while inside</label>
          <label class="check"><input type="checkbox" data-bind="rookhome"> Travelling in a Rookhome — +2 Exploration (temporary), Rooks ignore you, heal 1 Wound per phase at home, draw maintenance each phase</label>
          <label class="check"><input type="checkbox" data-bind="rooknaught"> Sailing a Rooknaught (needs crew of 5) — Rooks ignore you</label>
          <hr style="border:0;border-top:1px dashed var(--rule);margin:10px 0">
          <label class="check"><input type="checkbox" data-bind="modules.elite"> Elite Rookhunting: Feral Massive Rooks (draw a check card after every Massive Rook prompt)</label>
          <label class="check"><input type="checkbox" data-bind="modules.altRewards"> Elite Rookhunting: alternate reward table for Rook victories</label>
          <p class="tiny muted">The Elite module is meant for characters at 5/5 or who have collected every standard reward.</p>
          <hr style="border:0;border-top:1px dashed var(--rule);margin:10px 0">
          <label class="check"><input type="checkbox" data-bind="modules.seastone"> <span>Search for the Seastone campaign (Roomlands pp.61–85) — adds Crown Isle, the three Halls, Bastions and the Drowned Queen to Explore and Combat. <b>Spoilers</b>: switch it on only when your character reaches Crag’s End.</span></label>
        </div>
      </div>
    </div>
    <div class="panel">
      <h3>Adventure notes</h3>
      <textarea data-bind="notes" rows="5" placeholder="Quests in progress, people met, places to return to, theories about the Colostle…"></textarea>
    </div>
    <div class="panel plain">
      <h3>Save file${helpBtn('deck','Help: the deck and saving')}</h3>
      <div class="row">
        <button class="btn sm ghost" data-act="export">Export this adventure</button>
        <button class="btn sm ghost" data-act="newAdv">New adventurer</button>
        <button class="btn sm ghost" data-act="resetDeck">Reshuffle a fresh deck</button>
        <button class="btn sm red" data-act="deleteAdv">Delete this adventurer</button>
      </div>
      <p class="tiny muted" style="margin-top:8px">Progress is saved in this browser. To play on another device, export a save file here and import it there.</p>
      <div id="exportbox" class="hidden" style="margin-top:10px"><label>Downloaded — or copy this text and keep it somewhere safe</label><textarea id="exporttxt" rows="4" readonly></textarea></div>
      <details style="margin-top:10px"><summary class="small" style="cursor:pointer">Import a save file</summary>${importHTML()}</details>
    </div>
    ${syncPanelHTML()}`;
  bindInputs(main, a, (k)=>{ if(k==='cls'||k==='within'||k==='rookhome'||k==='name') renderHeader(); if(k==='cls'){ const c2=CLASSES[a.cls]; a.baseExp=c2.exp; a.baseCom=c2.com; touch(a); } if(k==='modules.seastone' && !a.modules.seastone && (a.location==='crownisle'||HALL_IDS.includes(a.location))){ a.location='land'; a.phase=null; touch(a); } });
  wireImport(main);
}
function onCharacterAction(ev){
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=adv(); const act=b.dataset.act;
  if(act==='score'){ const k=b.dataset.k, d=Number(b.dataset.d); a[k]=Math.max(0, Math.min(5, a[k]+d)); touch(a); if(a[k]===0) toast('A score at zero — your adventurer is dying. Write the final entry.'); render(); }
  else if(act==='alliedFall'){ a[b.dataset.k]=Math.min(5,a[b.dataset.k]+2); if(a.companion){ a.notes=(a.notes?a.notes+'\n':'')+`${a.companion} fell. ${a.name} carries on alone.`; a.companion=''; } touch(a); render(); toast('Add their last moments to the journal.'); }
  else if(act==='treasure'){ a.treasures=Math.max(0,a.treasures+Number(b.dataset.d)); touch(a); render(); }
  else if(act==='clue'){ a.clues=Math.max(0,a.clues+Number(b.dataset.d)); touch(a); render(); }
  else if(act==='crew'){ a.crew=Math.max(1,a.crew+Number(b.dataset.d)); touch(a); render(); }
  else if(act==='addItem'){ const i=document.getElementById('newitem'); const v=i.value.trim(); if(v){ a.inventory.push(v); touch(a); render(); } }
  else if(act==='rmItem'){ a.inventory.splice(Number(b.dataset.i),1); touch(a); render(); }
  else if(act==='drawNature'){ const [c]=drawCards(a,1); if(!c) return; const row=rangeLookup(NATURES,c.r); a.nature=row[2]; touch(a); render(); toast(`${cardLabel(c)} — ${row[2]}`); }
  else if(act==='drawCalling'){ const [c]=drawCards(a,1); if(!c) return; const row=rangeLookup(CALLINGS,c.r); a.callingTitle=row[2]; a.calling=row[3]; touch(a); render(); toast(`${cardLabel(c)} — ${row[2]}`); }
  else if(act==='export'){ const box=document.getElementById('exportbox'); const payload={format:'colostle-companion',version:1,adventure:a,journal:journalOf(a.id)}; document.getElementById('exporttxt').value=JSON.stringify(payload); box.classList.remove('hidden'); tryDownload(`colostle-${(a.name||'adventure').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`, JSON.stringify(payload,null,1)); }
  else if(act==='newAdv'){ state.activeId=null; state.tab='character'; touch(null); render(); }
  else if(act==='resetDeck'){ if(confirm('Shuffle a brand-new 52-card deck? Current draw and discard piles are replaced.')){ a.deck=freshDeck(); touch(a); render(); } }
  else if(act==='syncOn'){ const t=document.getElementById('synctoken').value; b.disabled=true; syncConnect(t).then(()=>render()).catch(e=>{ sync.token=null; setSyncStatus('error', e.message); toast(e.message); b.disabled=false; }); }
  else if(act==='syncOff'){ if(confirm('Disconnect sync on this device? Your gist and local save both stay as they are.')){ syncDisconnect(); render(); } }
  else if(act==='syncNow'){ syncFlush().then(()=>render()); }
  else if(act==='syncPull'){ syncPull().then(ch=>{ render(); toast(ch?'Save merged from your gist':'Already up to date'); }).catch(e=>{ setSyncStatus('error', e.message); toast(e.message); }); }
  else if(act==='deleteAdv'){ if(confirm(`Delete ${a.name||'this adventurer'} and their journal? This cannot be undone.`)){ tombstone(a.id); journalOf(a.id).forEach(e=>tombstone(e.id)); cloud.deletedAdv.push(a.id); journalOf(a.id).forEach(e=>cloud.deletedEntries.push(a.id+'/'+e.id)); state.adventures=state.adventures.filter(x=>x.id!==a.id); delete state.journal[a.id]; state.activeId=state.adventures[0]?.id||null; touch(null); render(); } }
}
function tryDownload(filename, text){
  try{ const blob=new Blob([text],{type: filename.endsWith('.json')?'application/json':'text/markdown'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); }catch(e){ console.warn('download failed', e); }
}
function importHTML(){ return `<div class="row" style="margin-top:6px;align-items:flex-start"><textarea id="importtxt" rows="3" placeholder="Paste the exported text here" style="flex:1;min-width:200px"></textarea><div style="display:flex;flex-direction:column;gap:6px"><input type="file" id="importfile" accept="application/json,.json" style="width:auto;font-size:12px"><button class="btn sm" data-act="import">Import</button></div></div>`; }
function wireImport(root){
  const f=root.querySelector('#importfile'); if(f) f.addEventListener('change',()=>{ const file=f.files[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ root.querySelector('#importtxt').value=r.result; }; r.readAsText(file); });
  const b=root.querySelector('[data-act="import"]'); if(b) b.addEventListener('click',()=>{
    try{ const p=JSON.parse(root.querySelector('#importtxt').value); if(p.format!=='colostle-companion'||!p.adventure) throw 0;
      const na=p.adventure; const existing=state.adventures.find(x=>x.id===na.id); if(existing){ if(!confirm('An adventurer with this id already exists. Replace it?')) return; Object.assign(existing,na); state.journal[na.id]=p.journal||[]; } else { state.adventures.push(na); state.journal[na.id]=p.journal||[]; }
      state.activeId=na.id; touch(na); journalOf(na.id).forEach(e=>cloud.dirtyEntries.add(na.id+'/'+e.id)); render(); toast('Adventure restored'); }
    catch(e){ toast('That doesn’t look like a companion save file'); }
  });
}
