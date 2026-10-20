/* =====================================================================
   COMBAT
   ===================================================================== */
function beginCombat(a, type, score){
  const def=OPPONENTS[type]||OPPONENTS.custom;
  a.combat={stage:'setup', type, score: score||def.score, baseScore: score||def.score, opp:{}, hand:[], rounds:[], remaining:0, current:null, wounds:0, created:false,
    internal:{allowed: def.create==='rook' && type!=='rooknaught', active:false, onboard:null, boarded:false, thrown:false, checks:[], lastBlowInternal:false},
    assist:0, logged:false, naught:null, coop:null, queen:null, fx:{turtleUsed:false, oilUsed:false, swordUsed:false, notes:[]}};
  if(def.create==='queen'){ a.combat.queen={phase:0, aanya:null, object:{tried:false, shield:0}, tempUsed:false, healUsed:false, phasesDone:0, totalAll:0, winsAll:0}; a.combat.score=QUEEN_PHASES[0].score; }
  touch(a);
}
function oppName(cb){ if(cb.type==='custom') return cb.customName||'Custom opponent'; if(cb.type==='bastion'&&cb.opp.kind) return (cb.opp.kind==='sword'?'Sword':'Seastone')+' Bastion'; return OPPONENTS[cb.type]?.name||cb.type; }
function createOpponent(a){
  const cb=a.combat; const def=OPPONENTS[cb.type]||OPPONENTS.custom; const o={};
  if(def.create==='person'){ const [c]=drawCards(a,1); o.cards=[c]; o.intention=INTENTION[c.s]; o.weapon=c.r<=6?'Ranged':'Melee'; }
  else if(def.create==='rook'){ const [c1,c2]=drawCards(a,2); o.cards=[c1,c2]; o.magic=def.fixedMagic? MAGIC[def.fixedMagic] : MAGIC[c1.s]; o.body=c1.r<=7?'Attack':'Defence'; o.weapon=c2.r<=6?'Ranged':'Melee'; o.reward=REWARD[c2.s]; }
  else if(def.create==='bastion'){ const [c1,c2]=drawCards(a,2); o.cards=[c1,c2]; o.kind=isRed(c1)?'sword':'seastone'; o.noticed=isRed(c2); }
  cb.opp=o; cb.created=true; touch(a);
}
function handSize(a, cb){ let n=comScore(a); if(cb.queen && QUEEN_PHASES[cb.queen.phase].penalty && n>1) n--; return n; }
function startFight(a){
  const cb=a.combat; const n=handSize(a,cb); if(n===0){ toast('Combat is 0 — you cannot fight.'); return; }
  cb.hand=drawCards(a,n,{hold:true});
  if(cb.coop){ cb.coop.hand2=drawCards(a,Math.max(1,cb.coop.com),{hold:true}); cb.coop.target=cb.coop.first||0; cb.coop.wounds=[0,0]; cb.coop.defend=null; cb.coop.combo=null; }
  cb.remaining=Math.max(1,cb.score-cb.assist); cb.total=cb.remaining; cb.stage='fight'; cb.rounds=[]; cb.current=null; cb.wounds=0;
  if(cb.queen) queenStartPhase(a, cb);
  touch(a);
}
function queenStartPhase(a, cb){
  const q=cb.queen; const P=QUEEN_PHASES[q.phase]; const [c]=drawCards(a,1);
  q.aanya={card:c, ability:P.aanya[c.s], text:P.aanyaText[c.s]}; q.object={tried:false, shield:0}; q.tempUsed=false; q.healUsed=false;
  cb.score=P.score; cb.remaining=P.score; cb.total=P.score; cb.current=null;
}
function queenPhaseEnd(a, cb){
  const q=cb.queen; q.phasesDone++; q.totalAll+=cb.total; q.winsAll+=effectiveWins(cb);
  q.rounds=(q.rounds||[]).concat(cb.rounds.map(r=>Object.assign({phase:q.phase+1},r)));
  discardCards(a,cb.hand); cb.hand=[]; cb.current=null;
  if(q.phase<QUEEN_PHASES.length-1){ q.phase++; cb.rounds=[]; cb.hand=drawCards(a,handSize(a,cb),{hold:true}); queenStartPhase(a,cb); toast(`${QUEEN_PHASES[q.phase].title}`); }
  else { cb.stage='done'; finishCombat(a); }
}
function drawAttack(a){
  const cb=a.combat; if(cb.current||cb.remaining<=0) return; if(cb.coop && cb.coop.defend) return;
  if(cb.internal.boarded && !cb.internal.thrown && cb.rounds.length>0){
    const [hc]=drawCards(a,1); const hold = hc.r>cb.internal.onboard.r; cb.internal.checks.push({card:hc, hold});
    if(!hold){ cb.internal.thrown=true; cb.internal.boarded=false; toast(`Hold check ${cardLabel(hc)} vs ${cardLabel(cb.internal.onboard)} — thrown clear!`); } else toast(`Hold check ${cardLabel(hc)} — you keep your grip`);
  }
  const [c]=drawCards(a,1); cb.current=c; touch(a);
}
// Who is targeted: 0 = you, 1 = partner (co-op only)
function targetOf(cb){ return cb.coop? cb.coop.target : 0; }
function handOf(cb, who){ return who===1? cb.coop.hand2 : cb.hand; }
// Resolve a lost round: defend chance (co-op) then mitigation, then the wound itself
function applyWound(a, cb, round){
  const who=round.who||0; const atk=round.atk; const o=cb.opp; const notes=[];
  if(who===0){
    if(hasItem(a,'iceshield') && o.magic==='Ice' && atk.s==='H'){ notes.push('Ice magic cannot harm you — no Wound.'); round.mitigated='ice'; }
    else if(cb.queen && cb.queen.object.shield>0){ cb.queen.object.shield--; notes.push('The worn shield takes the blow and splinters — no Wound.'); round.mitigated='shield'; }
    else if(cb.queen && cb.queen.aanya.ability==='heal' && !cb.queen.healUsed){ cb.queen.healUsed=true; notes.push('Aanya’s potion heals the Wound at once.'); round.mitigated='aanya'; }
    else if(hasItem(a,'turtle') && !cb.fx.turtleUsed){ cb.fx.turtleUsed=true; notes.push('Turtle Shell Armour blocks the Wound (once per fight).'); round.mitigated='turtle'; }
    else if(hasItem(a,'plate')){ removeItem(a,'plate'); notes.push('The Armour Plate shatters instead — no Wound. It is gone from your inventory.'); round.mitigated='plate'; }
  }
  if(!round.mitigated){ if(who===1) cb.coop.wounds[1]++; else { cb.wounds++; if(cb.coop) cb.coop.wounds[0]++; } }
  if(notes.length) round.note=[round.note,notes.join(' ')].filter(Boolean).join(' ');
}
function afterRound(a, cb){
  if(cb.coop) cb.coop.target = cb.coop.target===0?1:0;
  if(cb.queen && (cb.remaining<=0 || cb.queen.dblcrit)){ cb.queen.dblcrit=false; queenPhaseEnd(a,cb); return; }
  if(cb.remaining<=0){ cb.stage='done'; discardCards(a,cb.hand); cb.hand=[]; if(cb.coop){ discardCards(a,cb.coop.hand2); cb.coop.hand2=[]; } finishCombat(a); }
}
function playCounter(a, idx, board){
  const cb=a.combat; const atk=cb.current; if(!atk) return; const who=targetOf(cb); const hand=handOf(cb,who); const ctr=hand[idx]; if(!ctr) return;
  let result; if(ctr.r>atk.r) result = ctr.s===atk.s?'crit':'win'; else if(ctr.r===atk.r) result='clash'; else result='lose';
  let note='';
  if(cb.queen){ const P=QUEEN_PHASES[cb.queen.phase];
    if(atk.s===P.unblock.atk && ctr.s===P.unblock.ctr && result!=='lose'){ result='lose'; note=`${P.atk[atk.s]} cannot be blocked by that kind of attack — a Wound regardless.`; }
    else if(cb.queen.aanya.ability==='crit' && ctr.s===cb.queen.aanya.card.s && (result==='win'||result==='crit')){ if(result==='crit'){ cb.queen.dblcrit=true; note='Double critical hit — Aanya’s suit and the Queen’s! The phase ends at once.'; } else { result='crit'; note='Aanya’s suit — a critical hit.'; } }
  }
  if(result==='clash' && who===0 && a.clashBang && a.clashBang===ctr.s){ result='win'; note='Clash Bang detonates — the clash becomes a win. The gem is spent.'; a.clashBang=null; removeItem(a,'bang'); }
  const internal = cb.internal.boarded && !cb.internal.thrown;
  const round={atk, ctr, result, internal, board:!!board, who, note};
  cb.rounds.push(round); hand.splice(idx,1); discardCards(a,[ctr]); cb.current=null; cb.remaining--;
  if(result==='crit' && cb.remaining>0) cb.remaining--;
  if(board && who===0 && cb.internal.allowed && !cb.internal.boarded && !cb.internal.thrown){ cb.internal.boarded=true; cb.internal.onboard=ctr; cb.internal.active=true; }
  if(result==='lose'){
    const other=who===0?1:0;
    if(cb.coop && handOf(cb,other).length){ cb.coop.defend={round:cb.rounds.length-1, by:other}; touch(a); return; }
    applyWound(a,cb,round);
  }
  afterRound(a,cb); touch(a);
}
function defendRound(a, idx){ // partner plays a card that matches or beats the attack
  const cb=a.combat; const d=cb.coop&&cb.coop.defend; if(!d) return; const round=cb.rounds[d.round]; const hand=handOf(cb,d.by);
  if(idx===null||idx===undefined){ cb.coop.defend=null; applyWound(a,cb,round); afterRound(a,cb); touch(a); return; }
  const c=hand[idx]; if(!c) return; hand.splice(idx,1); discardCards(a,[c]); round.defendCard=c; round.defender=d.by;
  if(c.r>=round.atk.r){ round.defended=true; round.note=[round.note,`${d.by===1?partnerName(a,cb):a.name||'You'} steps in with ${cardLabel(c)} — no Wound.`].filter(Boolean).join(' '); }
  else { round.note=[round.note,`${d.by===1?partnerName(a,cb):a.name||'You'} tries to defend with ${cardLabel(c)} but it is too weak.`].filter(Boolean).join(' '); applyWound(a,cb,round); }
  cb.coop.defend=null; afterRound(a,cb); touch(a);
}
function comboAttack(a, i0, i1){
  const cb=a.combat; const atk=cb.current; if(!atk||!cb.coop) return; const c0=cb.hand[i0], c1=cb.coop.hand2[i1]; if(!c0||!c1) return;
  const who=targetOf(cb); const match=c0.s===c1.s;
  const round={atk, ctr:c0, ctr2:c1, who, result: match?'combo':'combofail', note: match? 'COMBO CRITICAL HIT — the suits match! 3 Wounds to the opponent; it loses three attacks.' : 'The suits don’t match. Both cards are spent and the attack lands.'};
  cb.hand.splice(i0,1); cb.coop.hand2.splice(i1,1); discardCards(a,[c0,c1]); cb.rounds.push(round); cb.current=null; cb.remaining--;
  if(match){ cb.remaining=Math.max(0,cb.remaining-2); } else applyWound(a,cb,round);
  afterRound(a,cb); touch(a);
}
function takeRemainingHits(a){
  const cb=a.combat;
  const noCards = cb.coop? (!cb.hand.length && !cb.coop.hand2.length) : !cb.hand.length;
  if(!noCards) return;
  if(cb.current){ const r={atk:cb.current, ctr:null, result:'lose', auto:true, who:targetOf(cb), internal: cb.internal.boarded&&!cb.internal.thrown}; cb.rounds.push(r); applyWound(a,cb,r); cb.current=null; cb.remaining--; if(cb.coop) cb.coop.target=cb.coop.target===0?1:0; }
  while(cb.remaining>0){ const [c]=drawCards(a,1); if(!c) break; const r={atk:c, ctr:null, result:'lose', auto:true, who:targetOf(cb)}; cb.rounds.push(r); applyWound(a,cb,r); cb.remaining--; if(cb.coop) cb.coop.target=cb.coop.target===0?1:0; }
  if(cb.queen){ queenPhaseEnd(a,cb); touch(a); return; }
  cb.stage='done'; finishCombat(a); touch(a);
}
function noCardThisRound(a){ // co-op: the targeted player has no cards but the partner still might defend
  const cb=a.combat; if(!cb.current||!cb.coop) return; const who=targetOf(cb); if(handOf(cb,who).length) return;
  const r={atk:cb.current, ctr:null, result:'lose', auto:true, who}; cb.rounds.push(r); cb.current=null; cb.remaining--;
  const other=who===0?1:0; if(handOf(cb,other).length){ cb.coop.defend={round:cb.rounds.length-1, by:other}; touch(a); return; }
  applyWound(a,cb,r); afterRound(a,cb); touch(a);
}
function effectiveWins(cb){ return cb.rounds.reduce((n,r)=>n+(r.result==='win'?1:r.result==='crit'?2:r.result==='combo'?3:0),0); }
function partnerName(a,cb){ return (cb.coop&&cb.coop.name)||'Your partner'; }
function finishCombat(a){
  const cb=a.combat; const wins=effectiveWins(cb);
  cb.won = cb.queen? true : wins>cb.total/2; cb.woundsToAllocate=cb.wounds;
  const lastWin=[...cb.rounds].reverse().find(r=>r.result==='win'||r.result==='crit'); cb.internal.lastBlowInternal = !!(lastWin && lastWin.internal);
  if(cb.won){
    if(cb.type==='person'){ a.treasures++; cb.rewardText='+1 Treasure (added)'; }
    if(cb.type==='astrolithic'){ cb.rewardText='The husk is yours — a Rooksuit. You may become Within.'; }
    if(cb.type==='rooknaught'){ cb.rewardText='Now you must fight the crew of five.'; }
    if(cb.type==='bastion'){ cb.rewardText='No reward — a Bastion gives nothing but your survival.'; }
    if(cb.type==='queen'){ cb.rewardText='The Drowned Queen shatters. The Seastone is yours.'; }
    if(cb.coop && cb.coop.modifier===1){ a.treasures++; cb.coopTreasure=true; }
  }
}

function renderCombat(main){
  const a=adv(); if(!a){ main.innerHTML='<div class="panel">Create an adventurer first.</div>'; return; }
  const cb=a.combat;
  let html=`<div class="section-title"><h2>Combat phase</h2><span class="rule"></span><span class="hint">You hold ${comScore(a)} option${comScore(a)===1?'':'s'}</span></div>`;
  const CSTEPS=['Choose opponent','Create it','Draw options','Counter each attack','Wounds & rewards','Log'];
  if(cb && cb.naught){ html+=guideHTML(['Lay out crews','Lock in','Attack, part by part','Loot or pay','Log'], !cb.naught.locked?0: cb.naught.over? (cb.logged?4:3) : 2, !cb.naught.locked?'Arrange your five cards to match your crew’s strengths, then lock in.': cb.naught.over? (cb.logged?'Logged. Finish to return to exploring.':'The battle is decided — settle the loot or the loss, then log it.') : 'Pick one of your parts, then strike an enemy part blind.','naught'); }
  else if(!cb) html+=guideHTML(CSTEPS,0,'Pick who you are fighting. Rook fights are always optional — sneak past if you prefer.','combat-setup');
  else if(cb.stage==='setup') html+=guideHTML(CSTEPS, cb.created||(OPPONENTS[cb.type]||{}).create==='none'||cb.queen?2:1, cb.created||(OPPONENTS[cb.type]||{}).create==='none'||cb.queen? 'Adjust anything if the story demands, then begin: you draw cards equal to your Combat score.' : 'Draw cards to decide how this opponent fights and what it carries.', cb.queen?'queen':cb.type==='bastion'?'bastion':'combat-setup');
  else if(cb.stage==='fight') html+=guideHTML(CSTEPS,3, cb.coop&&cb.coop.defend? `${cb.coop.defend.by===1?partnerName(a,cb):(a.name||'You')} may step in to defend — play a card that matches or beats the attack, or take the Wound.` : cb.current? 'Play a higher card to beat it. Same suit as well is a critical hit; equal is a clash.' : (cb.coop? (cb.hand.length||cb.coop.hand2.length) : cb.hand.length)? 'Draw the opponent’s next attack.' : 'No cards left — the remaining attacks land.', cb.queen?'queen':cb.coop?'coop':'combat-fight');
  else html+=guideHTML(CSTEPS, cb.woundsToAllocate>0?4: cb.logged?5:4, cb.woundsToAllocate>0? `Allocate ${cb.woundsToAllocate} wound${cb.woundsToAllocate===1?'':'s'} to your scores, then take any reward.` : cb.logged? 'Logged. Finish to return to exploring.' : 'Take your reward and log the battle to the journal.','combat-outcome');
  if(!cb){
    const list=Object.keys(OPPONENTS).filter(k=>k!=='crew' && (!OPPONENTS[k].module || (a.modules&&a.modules[OPPONENTS[k].module])));
    html+=`<div class="panel"><p>Combat begins when you draw an opponent while exploring and decide to engage — or start one here. You only ever face one Rook at a time.</p>
      <div class="row">${list.map(k=>`<button class="btn sm ghost" data-act="begin" data-type="${k}">${esc(OPPONENTS[k].name)}</button>`).join('')}${a.rooknaught||a.crew>=5?`<button class="btn sm ocean" data-act="beginNaught">Rooknaught vs Rooknaught</button>`:''}</div>
      ${a.lastCombatSummary?`<p class="notice" style="margin-top:12px">Last battle: ${esc(a.lastCombatSummary)}</p>`:''}</div>`;
    html+=combatRulesHTML();
    main.innerHTML=html; return;
  }
  if(cb.naught){ main.innerHTML=html+renderNaughtBattle(a,cb); return; }
  const def=OPPONENTS[cb.type]||OPPONENTS.custom; const o=cb.opp;
  html+=`<div class="panel"><div class="row between"><h3>${esc(oppName(cb))} <span class="tag">Combat score ${cb.score}${cb.assist?` − ${cb.assist} assist`:''}${cb.coop?' · co-op':''}</span>${helpBtn(cb.queen?'queen':cb.type==='bastion'?'bastion':cb.coop?'coop':cb.stage==='setup'?'combat-setup':cb.stage==='fight'?'combat-fight':'combat-outcome','Help: this stage of combat')}</h3>${cb.stage==='setup'?`<button class="btn sm ghost" data-act="cancel">Cancel</button>`: cb.stage==='fight'?`<button class="btn xs ghost" data-act="abandon" title="Discard the hands and forget this fight">Abandon fight</button>`:''}</div>`;
  if(cb.stage==='setup') html+=renderSetup(a,cb,def,o);
  else html+=renderFight(a,cb,def,o);
  html+=`</div>`;
  if(cb.stage!=='done') html+=combatRulesHTML();
  main.innerHTML=html;
  main.querySelectorAll('[data-o]').forEach(s=>s.addEventListener('change',()=>{ cb.opp[s.dataset.o]= s.type==='checkbox'? s.checked : s.value; touch(a); }));
  const as=document.getElementById('assist'); if(as) as.addEventListener('change',()=>{ cb.assist=as.checked?1:0; touch(a); renderHeader(); });
  const io=document.getElementById('internalopt'); if(io) io.addEventListener('change',()=>{ cb.internal.active=io.checked; touch(a); });
  const cn=document.getElementById('custname'); if(cn) cn.addEventListener('input',()=>{ cb.customName=cn.value; touch(a); });
  const cs=document.getElementById('custscore'); if(cs) cs.addEventListener('change',()=>{ cb.score=cb.baseScore=Math.max(1,Number(cs.value)||1); touch(a); });
  const co=document.getElementById('coopopt'); if(co) co.addEventListener('change',()=>{ if(co.checked){ cb.coop={name:'',com:3,id:null,first:0,modifier:0,modCard:null,hand2:[],wounds:[0,0]}; cb.score=cb.baseScore*2; } else { cb.coop=null; cb.score=cb.baseScore; } touch(a); render(); });
  const ps=document.getElementById('partnersel'); if(ps) ps.addEventListener('change',()=>{ const v=ps.value; if(v){ const p=state.adventures.find(x=>x.id===v); cb.coop.id=p.id; cb.coop.name=p.name; cb.coop.com=p.within?5:p.com; } else { cb.coop.id=null; } touch(a); render(); });
  const pn=document.getElementById('partnername'); if(pn) pn.addEventListener('input',()=>{ cb.coop.name=pn.value; touch(a); });
  const pc=document.getElementById('partnercom'); if(pc) pc.addEventListener('change',()=>{ cb.coop.com=Math.max(1,Math.min(5,Number(pc.value)||1)); touch(a); });
  main.querySelectorAll('input[name="firsttarget"]').forEach(r=>r.addEventListener('change',()=>{ cb.coop.first=Number(r.value); touch(a); }));
  const bs=document.getElementById('bangsuit'); if(bs) bs.addEventListener('change',()=>{ a.clashBang=bs.value||null; touch(a); });
}
function renderSetup(a,cb,def,o){
  let html='';
  if(cb.type==='custom') html+=`<div class="row" style="margin-bottom:8px"><div><label>Opponent name</label><input id="custname" value="${esc(cb.customName||'')}" style="width:220px"></div><div><label>Combat score</label><input id="custscore" type="number" min="1" max="12" value="${cb.baseScore}" style="width:80px"></div></div>`;
  if(cb.queen){ html+=`<p>She represents the mind and power of a Colossal Rook, and carries the Seastone. The battle has <b>three phases</b> (Combat score 3, 4, then 3). You do not need to win each phase — <b>survive</b> every attack of a phase and the next begins, with a fresh hand of options. Wounds still count. Aanya fights beside you: a card drawn at the start of each phase sets her ability. Once per phase you may try for an object in the arena (not in phase 3).</p>`; }
  else if(def.create==='none') html+=`<p>${cb.type==='astrolithic'?'Astrolithic Rooks have no creation step — every one fights alike, with a Combat score of 6. Attack types: ♠ Laser, ♣ Flying, ♥ Grab, ♦ Rocket.':'A gang of five Naught rush you together. Combat score 5. If any are left standing at the end, they flee.'}</p>`;
  else if(!cb.created) html+=`<p>${def.create==='person'?'One card sets their intention (suit) and weapon (rank: A–6 ranged, 7–K melee). If you lose, they succeed in their intention.': def.create==='bastion'? 'Two cards: the first sets its type (red: Sword Bastion, black: Seastone Bastion); the second whether it has noticed you (red: it has — you must fight; black: you may slip away). Combat score 3, no reward.' : 'Two cards. First: magic type (suit) and body type (rank: A–7 attack, 8–K defence). Second: weapon (rank: A–6 ranged, 7–K melee) and your reward if you win (suit).'}</p><button class="btn ochre" data-act="create">Draw to create the opponent</button>`;
  else if(def.create==='bastion'){
    html+=`<div class="row" style="align-items:flex-start;gap:16px"><div class="cards" style="margin:0">${cardHTML(o.cards[0],{small:true,flip:true,title:o.kind==='sword'?'Sword Bastion':'Seastone Bastion',glyph:'rook'})}${cardHTML(o.cards[1],{small:true,flip:true,title:o.noticed?'It notices you!':'Unnoticed',glyph:'person'})}</div>
      <div style="flex:1;min-width:220px"><p class="small">${o.kind==='sword'?'It scuttles in fast, leaning forward, drawing a massive sea-rusted sword from its tall body and wielding it like a trained fighter.':'It keeps its distance behind a ring of frothing water, a globule of summoned water floating above its head, and attacks only with water magic. On defeat there is no Rookstone inside it.'}</p>
      <p class="small">Attacks by suit: ${suitChips(BASTION_ATTACK[o.kind])}</p>
      ${o.noticed? '<p class="small"><b>It has noticed you — the fight happens regardless.</b></p>' : `<p class="small">It has not noticed you. <button class="btn xs ghost" data-act="cancel">Slip away — avoid the fight</button></p>`}
      ${hasItem(a,'bastionarmour')?`<p class="small">Your Bastion-shell armour lets you avoid any Bastion: <button class="btn xs ghost" data-act="cancel">Walk past it</button></p>`:''}
      ${hasItem(a,'explosive')?`<p class="small">Use an explosive to distract it: <button class="btn xs ghost" data-act="useExplosive">Avoid the fight (spends one)</button></p>`:''}</div></div>`;
  } else {
    html+=`<div class="row" style="align-items:flex-start;gap:16px"><div class="cards" style="margin:0">${o.cards.map(c=>cardHTML(c,{small:true,flip:true,title: def.create==='person'? INTENTION[c.s] : (o.cards.indexOf(c)===0? MAGIC[c.s]: REWARD[c.s]), glyph: def.create==='person'?'person':'rook'})).join('')}</div>
      <dl class="kv" style="flex:1;min-width:220px">${def.create==='person'? `<dt>Intention</dt><dd><select data-o="intention">${Object.values(INTENTION).map(v=>`<option ${o.intention===v?'selected':''}>${v}</option>`).join('')}</select></dd><dt>Weapon</dt><dd><select data-o="weapon"><option ${o.weapon==='Ranged'?'selected':''}>Ranged</option><option ${o.weapon==='Melee'?'selected':''}>Melee</option></select></dd>`
        : `<dt>Magic</dt><dd><select data-o="magic">${Object.values(MAGIC).map(v=>`<option ${o.magic===v?'selected':''}>${v}</option>`).join('')}</select></dd><dt>Body</dt><dd><select data-o="body"><option ${o.body==='Attack'?'selected':''}>Attack</option><option ${o.body==='Defence'?'selected':''}>Defence</option></select></dd><dt>Weapon</dt><dd><select data-o="weapon"><option ${o.weapon==='Ranged'?'selected':''}>Ranged</option><option ${o.weapon==='Melee'?'selected':''}>Melee</option></select></dd><dt>Reward</dt><dd><select data-o="reward">${Object.values(REWARD).map(v=>`<option ${o.reward===v?'selected':''}>${v}</option>`).join('')}</select></dd>`}</dl></div>
      <p class="small muted" style="margin-top:8px">${def.create==='person'?'Ranged might be a bow or thrown spear; melee a sword or fists. Use the intention to colour how they fight.':'Attack types come in close and fast; Defence types huddle behind thick hide or a shield. Magic and weapon are flavour for how it fights — and what you take from it. A Rookling reward shares its parent’s body and magic.'}</p>`;
  }
  const ready = def.create==='none' || cb.created || cb.queen;
  // options
  html+=`<div class="row" style="margin-top:12px;gap:16px;align-items:flex-start">${a.location==='battlements'?`<label class="check"><input type="checkbox" id="assist" ${cb.assist?'checked':''}> A friendly adventurer assists (−1 to its score)</label>`:''}
    ${cb.internal.allowed?`<label class="check"><input type="checkbox" id="internalopt" ${cb.internal.active?'checked':''}> Allow fighting inside the Rook (needed to claim it as a Rookhome)</label>`:''}
    ${hasItem(a,'bang')?`<label>Clash Bang installed in <select id="bangsuit" style="width:auto"><option value="">— no suit —</option>${['S','C','H','D'].map(s=>`<option value="${s}" ${a.clashBang===s?'selected':''}>${SUITS[s].sym} ${SUITS[s].name}</option>`).join('')}</select></label>`:''}</div>`;
  if(!cb.queen && cb.type!=='crew'){
    html+=`<div class="prompt" style="margin-top:10px"><label class="check" style="margin:0"><input type="checkbox" id="coopopt" ${cb.coop?'checked':''}> Two-player co-op — a partner fights beside you (Roomlands p.53)${helpBtn('coop','Help: co-op combat')}</label>`;
    if(cb.coop){ const others=state.adventures.filter(x=>x.id!==a.id);
      html+=`<div class="grid c3" style="margin-top:8px"><div><label>Partner</label><select id="partnersel"><option value="">Someone not saved here…</option>${others.map(x=>`<option value="${x.id}" ${cb.coop.id===x.id?'selected':''}>${esc(x.name||'Unnamed')} — Combat ${x.within?5:x.com}</option>`).join('')}</select></div>
        ${cb.coop.id?'':`<div><label>Partner’s name</label><input id="partnername" value="${esc(cb.coop.name||'')}" placeholder="Their adventurer"></div><div><label>Partner’s Combat score</label><input id="partnercom" type="number" min="1" max="5" value="${cb.coop.com}"></div>`}
        <div><label>Who does it attack first?</label><label class="check" style="margin:2px 0"><input type="radio" name="firsttarget" value="0" ${cb.coop.first===0?'checked':''}> ${esc(a.name||'You')}</label><label class="check" style="margin:2px 0"><input type="radio" name="firsttarget" value="1" ${cb.coop.first===1?'checked':''}> ${esc(cb.coop.name||'Partner')}</label></div></div>
        <p class="small" style="margin-top:6px">Its Combat score is doubled to <b>${cb.baseScore*2}</b>${cb.coop.modCard?` ${cb.coop.modifier>0?'+':'−'}1 (modifier ${cardLabel(cb.coop.modCard)}) = <b>${cb.score}</b>`:''}. ${cb.coop.modCard?(cb.coop.modifier>0?'Beat it and you both gain a Treasure as well.':''):`<button class="btn xs ghost" data-act="coopMod">Draw the optional battle modifier</button> (red +1 — and a Treasure each if you win; black −1)`}</p>`;
    }
    html+=`</div>`;
  }
  if(ready) html+=`<div class="row" style="margin-top:12px"><button class="btn red" data-act="start">Begin the fight — draw ${handSize(a,cb)} option${handSize(a,cb)===1?'':'s'}${cb.coop?` + ${Math.max(1,cb.coop.com)} for ${esc(cb.coop.name||'your partner')}`:''}</button></div>`;
  return html;
}
function attackTables(cb){
  if(cb.type==='astrolithic') return [ASTRO_ATTACK, ASTRO_HINT];
  if(cb.type==='bastion') return [BASTION_ATTACK[cb.opp.kind||'sword'], BASTION_HINT[cb.opp.kind||'sword']];
  if(cb.queen){ const P=QUEEN_PHASES[cb.queen.phase]; return [P.atk, P.hint]; }
  if(cb.internal.boarded && !cb.internal.thrown) return [INTERNAL_ATTACK, INTERNAL_HINT];
  return [ATTACK_TYPE, ATTACK_HINT];
}
function renderFight(a,cb,def,o){
  let html='';
  const [attackTable, hintTable]=attackTables(cb);
  html+=`<p class="small">${def.create==='person'? `Intends to <b>${esc(o.intention)}</b> · ${esc(o.weapon)} weapon`: def.create==='rook'? `${esc(o.magic)} magic · ${esc(o.body)} body · ${esc(o.weapon)} weapon · reward: ${esc(o.reward)}`: def.create==='bastion'? `${o.kind==='sword'?'Sword':'Seastone'} Bastion · no reward`:''}${cb.internal.boarded&&!cb.internal.thrown?' · <b>You are inside the Rook</b>':''}${cb.internal.thrown?' · thrown clear — no second boarding':''}</p>`;
  if(cb.queen && cb.stage==='fight'){ const q=cb.queen, P=QUEEN_PHASES[q.phase];
    html+=`<div class="notice ocean"><b>${esc(P.title)}</b> — ${esc(P.intro)}<div class="row" style="margin-top:6px;align-items:center"><span class="chip ${colorOf(q.aanya.card)}">${cardLabel(q.aanya.card)}</span><span class="small"><b>Aanya:</b> ${esc(AANYA_ABILITY[q.aanya.ability])}${q.aanya.ability==='heal'&&q.healUsed?' (used)':''}${q.aanya.ability==='temp'&&q.tempUsed?' (used)':''} — ${esc(q.aanya.text)}</span>
      ${q.aanya.ability==='temp'&&!q.tempUsed?`<button class="btn xs ochre" data-act="aanyaTemp">Take the extra option</button>`:''}
      ${P.objects? (q.object.tried? `<span class="chip">Object: ${esc(q.object.result||'nothing')}</span>` : `<button class="btn xs ghost" data-act="queenObject">Try for an object</button>`) : '<span class="chip">No objects this phase</span>'}
      ${q.object.shield?'<span class="chip">Worn shield ready</span>':''}</div></div>`; }
  const who=targetOf(cb); const tHand=handOf(cb,who);
  html+=`<div class="board"><div class="lane"><h4>Opponent’s attacks <span class="n">${cb.remaining} left of ${cb.total}${cb.queen?` · phase ${cb.queen.phase+1} of 3`:''}</span></h4><div class="cards" style="margin:0;align-items:center">`;
  if(cb.current){ const c=cb.current; html+=cardHTML(c,{flip:true,title:attackTable[c.s],glyph: cb.type==='astrolithic'?'wings':def.create==='person'?'sword':'rook'})+`<div style="flex:1;min-width:180px"><b>${esc(attackTable[c.s])}</b> — strength ${c.r}${cb.coop?`<br><b>Targeting ${esc(who===1?partnerName(a,cb):(a.name||'you'))}</b>`:''}<br><span class="small muted">${esc(hintTable[c.s])}</span><br><span class="small">Play a higher card to defeat it. Same number: a Clash, no wound. Lower: a Wound.</span></div>`; }
  else if(cb.stage==='fight' && !(cb.coop&&cb.coop.defend)){ for(let i=0;i<Math.min(cb.remaining,6);i++) html+=cardBackHTML({small:true}); const anyCards = cb.coop? (cb.hand.length||cb.coop.hand2.length) : cb.hand.length; html+= anyCards? `<button class="btn red" data-act="drawAttack">Draw its attack</button>` : `<div><button class="btn red" data-act="takeHits">Out of options — the remaining ${cb.remaining} attack${cb.remaining===1?'':'s'} land</button><div class="small muted" style="margin-top:4px">With no cards left to counter, each remaining attack is a Wound.</div></div>`; }
  if(cb.stage==='fight' && cb.current && !tHand.length){ const other=who===0?1:0; html+=`<div style="width:100%">${cb.coop && handOf(cb,other).length? `<button class="btn red" data-act="noCard">${esc(who===1?partnerName(a,cb):(a.name||'You'))} has no cards — the attack lands (partner may defend)</button>` : `<button class="btn red" data-act="takeHits">No options left — take the hit${cb.remaining>1?'s':''}</button>`}</div>`; }
  html+=`</div></div>`;
  if(cb.stage==='fight' && cb.coop && cb.coop.defend){ const d=cb.coop.defend; const r=cb.rounds[d.round]; const dh=handOf(cb,d.by);
    html+=`<div class="lane"><h4>${esc(d.by===1?partnerName(a,cb):(a.name||'You'))} may defend <span class="n">needs ${r.atk.r} or higher</span></h4><p class="small">${esc(d.by===1?(a.name||'You'):partnerName(a,cb))} lost the round against <b>${cardLabel(r.atk)}</b>. Play a card that matches or beats it to prevent the Wound — it is spent either way.</p>
      <div class="cards" style="margin:0">${dh.map((c,i)=>cardHTML(c,{title:ATTACK_TYPE[c.s],pick:true,attrs:`data-act="defend" data-i="${i}" role="button" tabindex="0" aria-label="Defend with ${cardLabel(c)}"`})).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="noDefend">Don’t defend — take the Wound</button></div></div>`; }
  if(cb.stage==='fight'){
    const canBoard = cb.internal.active && cb.internal.allowed && !cb.internal.boarded && !cb.internal.thrown;
    const lane=(hand, whoIdx, label)=>{ const active = cb.current && targetOf(cb)===whoIdx && !(cb.coop&&cb.coop.defend) && !(cb.coop&&cb.coop.combo);
      return `<div class="lane" ${cb.coop&&active?'style="outline:3px solid var(--red)"':''}><h4>${esc(label)} <span class="n">${hand.length} in hand${cb.coop&&targetOf(cb)===whoIdx&&cb.current?' · targeted':''}</span></h4>${canBoard&&active&&whoIdx===0?`<label class="check" style="font-size:13px"><input type="checkbox" id="boardchk"> Board the Rook with this counter (you must then beat its number on every later hold check)</label>`:''}
        <div class="cards" style="margin:0">${hand.map((c,i)=>cardHTML(c,{title:ATTACK_TYPE[c.s],glyph: c.s==='C'?'sword':c.s==='H'?'star':c.s==='D'?'gear':'person',pick:!!active,attrs: active? `data-act="counter" data-i="${i}" role="button" tabindex="0" aria-label="Counter with ${cardLabel(c)}"`:''})).join('')}</div></div>`; };
    html+=lane(cb.hand,0,cb.coop?(a.name||'Your options'):'Your options');
    if(cb.coop) html+=lane(cb.coop.hand2,1,partnerName(a,cb));
    const tools=[];
    if(hasItem(a,'oil') && !cb.fx.oilUsed && a.deck.discard.length) tools.push(cb.fx.oilPick? `<span class="small">Lubrication Oil — pick a card from the discards: ${a.deck.discard.map((c,i)=>`<button class="btn xs ghost" data-act="oilTake" data-i="${i}">${cardLabel(c)}</button>`).join(' ')} <button class="btn xs ghost" data-act="oilCancel">never mind</button></span>` : `<button class="btn xs ghost" data-act="oilPick">Use Lubrication Oil</button>`);
    if(cb.coop && cb.current && cb.hand.length && cb.coop.hand2.length && !cb.coop.defend) tools.push(cb.coop.combo? `<span class="small">Combo attack — you: ${cb.hand.map((c,i)=>`<button class="btn xs ${cb.coop.combo.i0===i?'ochre':'ghost'}" data-act="comboPick" data-w="0" data-i="${i}">${cardLabel(c)}</button>`).join(' ')} · ${esc(partnerName(a,cb))}: ${cb.coop.hand2.map((c,i)=>`<button class="btn xs ${cb.coop.combo.i1===i?'ochre':'ghost'}" data-act="comboPick" data-w="1" data-i="${i}">${cardLabel(c)}</button>`).join(' ')} ${cb.coop.combo.i0!=null&&cb.coop.combo.i1!=null?`<button class="btn xs red" data-act="comboGo">3… 2… 1… play!</button>`:''} <button class="btn xs ghost" data-act="comboCancel">cancel</button></span>` : `<button class="btn xs ochre" data-act="comboStart">Combo attack (both play — matching suits = 3 wounds to it)</button>`);
    if(tools.length) html+=`<div class="row" style="margin-top:8px">${tools.join(' ')}</div>`;
    html+=`<p class="tiny muted" style="margin-top:6px">♠ Unarmed · ♣ Weapon · ♥ Magic · ♦ Creative. Beating an attack with the same suit is a Critical Hit: the opponent loses one more attack.${a.clashBang?` Clash Bang armed on ${SUITS[a.clashBang].sym}.`:''}</p>`;
  }
  html+=`</div>`;
  const allRounds = cb.queen&&cb.queen.rounds? cb.queen.rounds.concat(cb.rounds.map(r=>Object.assign({phase:cb.queen.phase+1},r))) : cb.rounds;
  if(allRounds.length){ html+=`<div class="lane" style="margin-top:12px"><h4>Rounds</h4><div class="rounds">${allRounds.map((r,i)=>{ const [at]=attackTables(Object.assign({},cb,{queen: cb.queen? Object.assign({},cb.queen,{phase:(r.phase||1)-1}) : null, internal: r.internal? cb.internal : Object.assign({},cb.internal,{boarded:false})})); const resCls=r.result==='lose'||r.result==='combofail'?(r.defended||r.mitigated?'clash':'lose'):r.result==='clash'?'clash':'win';
      const label = r.result==='crit'?'Critical hit!':r.result==='win'?'Defeated':r.result==='clash'?'Clash':r.result==='combo'?'Combo critical!':(r.defended?'Defended':r.mitigated?'Blocked':'Wounded');
      const how = r.auto?'No card to counter with — the attack lands.':r.result==='crit'?'Same suit and higher — it loses another attack.':r.result==='win'?'Your number was higher.':r.result==='clash'?'Equal numbers — no wound.':r.result==='combo'?'Suits matched.':r.result==='combofail'?'Suits did not match.':'Its number was higher.';
      return `<div class="round">${cardHTML(r.atk,{small:true,title:at[r.atk.s]})}<span class="vs">vs</span>${r.ctr? cardHTML(r.ctr,{small:true,title:ATTACK_TYPE[r.ctr.s]}) : '<div class="card sm" style="opacity:.5;align-items:center;justify-content:center"><span class="small">no card</span></div>'}<span class="res ${resCls}">${label}${cb.coop?` <span class="small muted">(${esc(r.who===1?partnerName(a,cb):(a.name||'you'))})</span>`:''}${r.phase?` <span class="small muted">phase ${r.phase}</span>`:''}<span class="how">${esc(how)}${r.ctr2?` Partner played ${cardLabel(r.ctr2)}.`:''}${r.defendCard?` Defender played ${cardLabel(r.defendCard)}.`:''}${r.board?' You board the Rook.':''}${r.internal?' (inside the Rook)':''}${r.note?' '+esc(r.note):''}</span></span></div>`; }).join('')}</div>
    ${cb.internal.checks.length?`<p class="small" style="margin-top:8px">Hold checks: ${cb.internal.checks.map(h=>`<span class="chip ${colorOf(h.card)}">${cardLabel(h.card)} ${h.hold?'held':'thrown'}</span>`).join(' ')}</p>`:''}</div>`; }
  if(cb.stage==='done') html+=renderOutcome(a,cb);
  return html;
}
function renderOutcome(a,cb){
  const wins=effectiveWins(cb); const def=OPPONENTS[cb.type]||OPPONENTS.custom;
  let html=`<div class="outcome ${cb.won?'win':'lose'}"><h3 style="justify-content:center">${cb.won?'Victory':'Defeat'}${helpBtn('combat-outcome','Help: after the fight')}</h3><div class="tally" style="justify-content:center;margin:8px 0">${cb.queen?`<span>Phases survived<b>${cb.queen.phasesDone}</b></span><span>Attacks beaten<b>${cb.queen.winsAll}</b></span>`:`<span>Defeated<b>${wins}</b></span><span>of<b>${cb.total}</b></span>`}<span>Wounds<b>${cb.wounds}</b></span>${cb.coop?`<span>${esc(partnerName(a,cb))}’s wounds<b>${cb.coop.wounds[1]}</b></span>`:''}</div>`;
  html+=`<p class="small">${cb.queen?'You survived every phase. With a final scream her body shatters.':cb.won?'You beat the majority of its attacks.':'It beat the majority of your counters. It lives, and you take no reward — but it carries the wounds you landed if you ever meet again.'}</p>`;
  if(cb.woundsToAllocate>0){
    const mit=[];
    if(hasItem(a,'potion')) mit.push(`<button class="btn sm ghost" data-act="useItem" data-k="potion">Drink the Mysterious Potion (−1 Wound)</button>`);
    if(hasItem(a,'icesword') && cb.opp.magic==='Ice' && !cb.fx.swordUsed) mit.push(`<button class="btn sm ghost" data-act="iceSword">Great Ice Sword heals one Wound</button>`);
    if(hasItem(a,'rations')) mit.push(`<button class="btn sm ghost" data-act="useItem" data-k="rations">Eat the rations (−1 Wound)</button>`);
    if(hasItem(a,'herbs')) mit.push(`<button class="btn sm ghost" data-act="useItem" data-k="herbs">Use healing herbs / potion (−1 Wound)</button>`);
    html+=`<div class="notice red" style="text-align:left"><b>${cb.woundsToAllocate} Wound${cb.woundsToAllocate===1?'':'s'} to allocate</b> — each removes a point from Exploration or Combat. Decide what form the wound takes. <div class="row" style="margin-top:6px"><button class="btn sm red" data-act="allocWound" data-k="exp">− Exploration</button><button class="btn sm red" data-act="allocWound" data-k="com">− Combat</button>${mit.join('')}</div></div>`;
  }
  if(cb.coop && cb.coop.wounds[1]>0){ const p=cb.coop.id? state.adventures.find(x=>x.id===cb.coop.id):null; const left=cb.coop.toAllocate==null? cb.coop.wounds[1] : cb.coop.toAllocate;
    html+=`<div class="notice" style="text-align:left"><b>${esc(partnerName(a,cb))} took ${cb.coop.wounds[1]} Wound${cb.coop.wounds[1]===1?'':'s'}.</b> ${p? (left>0?`Allocate on their sheet: <button class="btn sm red" data-act="allocPartner" data-k="exp">− Exploration (${p.exp})</button> <button class="btn sm red" data-act="allocPartner" data-k="com">− Combat (${p.com})</button>`:'<span class="chip">Allocated</span>') : 'Mark them on their own character sheet.'}</div>`; }
  if(cb.won){
    html+=`<div style="text-align:left">`;
    if(def.create==='rook'){
      html+=`<p><b>Reward:</b> ${esc(cb.opp.reward)} — ${esc({Helm:'a helm granting this Rook’s magic (wear one at a time)',Arm:'a Rook arm matching its body type (attack: blade or whip; defence: shield or blaster)',Rookling:'its Rookling, sharing its body and magic — yours to command',Weapon:'its weapon — ranged or melee as created (two weapons at a time unless your Arms can hold more)'}[cb.opp.reward]||'')}. ${a.modules.altRewards?'<br>Or use the Elite alternate table:':''}</p>
        <div class="row">${cb.rewardTaken?'<span class="chip">Reward added to inventory</span>':`<button class="btn sm grass" data-act="takeReward">Add ${esc(cb.opp.reward)} to inventory</button>`}${a.modules.altRewards? (cb.altReward?`<span class="chip">${cardLabel(cb.altReward.card)} ${esc(cb.altReward.t)}</span>`:`<button class="btn sm ghost" data-act="altReward">Draw alternate reward</button>`):''}</div>
        ${cb.altReward?`<p class="small">${esc(cb.altReward.d)}</p>`:''}
        <p><b>And +1 to a score:</b> ${cb.bonusTaken?'<span class="chip">Taken</span>':`<button class="btn sm grass" data-act="bonus" data-k="exp">+1 Exploration</button> <button class="btn sm grass" data-act="bonus" data-k="com">+1 Combat</button>`}</p>`;
      if(cb.internal.lastBlowInternal) html+=`<p class="notice grass"><b>Defeated from within.</b> The Rook lies intact. ${a.rookhome?'':`<button class="btn sm grass" data-act="makeHome">Make it your Rookhome</button>`} <button class="btn sm ghost" data-act="sellHusk">Hide it and sell the location to a Rooksmith (+4 Treasures)</button></p>`;
      if(cb.type==='rooknaught') html+=`<p class="notice"><b>The crew remains.</b> Five Naught come at you together. <button class="btn sm red" data-act="fightCrew">Fight the crew (score 5)</button></p>`;
    } else if(cb.type==='person'){ html+=`<p><b>Reward:</b> +1 Treasure (already added). Their intention — ${esc(cb.opp.intention)} — fails.</p>`; }
    else if(cb.type==='astrolithic'){ html+=`<p><b>Reward:</b> the husk itself — a pilotable Rooksuit. ${a.within?'<span class="chip">You are Within</span>':`<button class="btn sm ochre" data-act="becomeWithin">Become Within (5/5 while piloting)</button>`}</p>`; }
    else if(cb.type==='crew'){ html+=`<p>The Rooknaught is yours to loot: <b>+3 Treasures</b> and a legendary item. ${cb.naughtReward?`<span class="chip">${cardLabel(cb.naughtReward.card)} ${esc(cb.naughtReward.t)}</span> <span class="small">${esc(cb.naughtReward.d)}</span>`:`<button class="btn sm grass" data-act="naughtLoot">Loot (+3 Treasures, draw reward)</button>`}</p>`; }
    else if(cb.type==='bastion'){ html+=`<p>${esc(cb.rewardText)}</p>`; }
    else if(cb.type==='queen'){ html+=`<p><b>${esc(cb.rewardText)}</b> It grants the power to summon and control water, and to breathe underwater. Use it like any other Rookstone. ${cb.rewardTaken?'<span class="chip">In your inventory</span>':`<button class="btn sm ochre" data-act="takeSeastone">Take the Seastone</button>`}</p><p class="small">Then read on in the book — Aanya has something to say.</p>`; }
    else if(cb.type==='custom'){ html+=`<p>Decide the reward in your story.</p>`; }
    if(cb.coopTreasure) html+=`<p class="small"><b>Battle modifier was +1:</b> you both gain a Treasure (yours is added; your partner marks their own).</p>`;
    html+=`</div>`;
  } else if(cb.type==='person'){ html+=`<p class="small">They succeed: <b>${esc(cb.opp.intention)}</b>.</p>`; }
  html+=`<div class="row" style="justify-content:center;margin-top:12px"><button class="btn ocean" data-act="logCombat">${cb.logged?'Logged ✓ — log again':'Log this battle to the journal'}</button><button class="btn ghost" data-act="endCombat">Finish</button></div></div>`;
  return html;
}
function abandonFight(a){
  const cb=a.combat; if(!cb) return;
  if(cb.hand) discardCards(a,cb.hand); if(cb.coop&&cb.coop.hand2) discardCards(a,cb.coop.hand2);
  if(cb.naught && !cb.naught.over) discardCards(a,[...cb.naught.enemy,...cb.naught.mine]);
  a.combat=null; touch(a);
}
function onCombatAction(ev){
  const b=ev.target.closest('[data-act]'); if(!b) return; const a=adv(); const cb=a.combat; const act=b.dataset.act;
  switch(act){
    case 'begin': beginCombat(a,b.dataset.type); render(); break;
    case 'beginNaught': beginNaught(a); render(); break;
    case 'cancel': case 'abandon': abandonFight(a); render(); break;
    case 'useExplosive': removeItem(a,'explosive'); abandonFight(a); render(); toast('The explosive goes off — the Bastion turns away'); break;
    case 'create': createOpponent(a); render(); break;
    case 'start': startFight(a); render(); break;
    case 'drawAttack': drawAttack(a); render(); break;
    case 'takeHits': takeRemainingHits(a); render(); break;
    case 'noCard': noCardThisRound(a); render(); break;
    case 'counter': { const chk=document.getElementById('boardchk'); playCounter(a, Number(b.dataset.i), chk&&chk.checked); render(); break; }
    case 'defend': defendRound(a, Number(b.dataset.i)); render(); break;
    case 'noDefend': defendRound(a, null); render(); break;
    case 'comboStart': cb.coop.combo={i0:null,i1:null}; touch(a); render(); break;
    case 'comboPick': if(b.dataset.w==='0') cb.coop.combo.i0=Number(b.dataset.i); else cb.coop.combo.i1=Number(b.dataset.i); touch(a); render(); break;
    case 'comboGo': { const c=cb.coop.combo; cb.coop.combo=null; comboAttack(a,c.i0,c.i1); render(); break; }
    case 'comboCancel': cb.coop.combo=null; touch(a); render(); break;
    case 'coopMod': { const [c]=drawCards(a,1); cb.coop.modCard=c; cb.coop.modifier=isRed(c)?1:-1; cb.score=Math.max(1,cb.baseScore*2+cb.coop.modifier); touch(a); render(); break; }
    case 'oilPick': cb.fx.oilPick=true; touch(a); render(); break;
    case 'oilCancel': cb.fx.oilPick=false; touch(a); render(); break;
    case 'oilTake': { const i=Number(b.dataset.i); const [c]=a.deck.discard.splice(i,1); if(c){ cb.hand.push(c); cb.fx.oilUsed=true; cb.fx.oilPick=false; removeItem(a,'oil'); toast(`${cardLabel(c)} returns to your hand — the oil is spent`); } touch(a); render(); break; }
    case 'aanyaTemp': { const q=cb.queen; if(q&&!q.tempUsed){ q.tempUsed=true; cb.hand.push(...drawCards(a,1,{hold:true})); touch(a); render(); } break; }
    case 'queenObject': { const q=cb.queen; if(q&&!q.object.tried){ q.object.tried=true; const [c]=drawCards(a,1); if(isRed(c)){ q.object.result=`${cardLabel(c)} — she notices; nothing gained`; } else { const [c2]=drawCards(a,1); const ob=QUEEN_OBJECTS[c2.s]; q.object.result=`${cardLabel(c2)} ${ob.t}`; if(ob.kind==='shield') q.object.shield=1; else if(ob.kind==='com'){ a.com=Math.min(5,a.com+1); } else if(ob.kind==='exp'){ a.exp=Math.min(5,a.exp+1); } toast(ob.t+' — '+ob.d); } touch(a); render(); } break; }
    case 'allocWound': a[b.dataset.k]=Math.max(0,a[b.dataset.k]-1); cb.woundsToAllocate--; touch(a); if(a[b.dataset.k]===0) toast(a.cls==='allied'?'A score has hit zero — one of your pair dies. Add 2 back and continue alone.':'A score has hit zero. Write your final entry.'); render(); break;
    case 'allocPartner': { const p=state.adventures.find(x=>x.id===cb.coop.id); if(p){ p[b.dataset.k]=Math.max(0,p[b.dataset.k]-1); p.updatedAt=Date.now(); cb.coop.toAllocate=(cb.coop.toAllocate==null?cb.coop.wounds[1]:cb.coop.toAllocate)-1; touch(a); render(); } break; }
    case 'useItem': if(removeItem(a,b.dataset.k)){ cb.woundsToAllocate--; touch(a); render(); toast('One Wound removed'); } break;
    case 'iceSword': cb.fx.swordUsed=true; cb.woundsToAllocate--; touch(a); render(); toast('The Ice Rook’s magic flows through the sword into you'); break;
    case 'takeReward': a.inventory.push(`${cb.opp.reward} — from ${oppName(cb)} (${cb.opp.magic} / ${cb.opp.body} / ${cb.opp.weapon})`); cb.rewardTaken=true; touch(a); render(); break;
    case 'takeSeastone': a.inventory.push('The Seastone — unique Rookstone: summon and control water, breathe underwater'); cb.rewardTaken=true; touch(a); render(); break;
    case 'altReward': { const [c]=drawCards(a,1); const r=ALT_REWARD[c.s]; cb.altReward={card:c,t:r.t,d:r.d}; a.inventory.push(`${r.t} (Elite reward)`); touch(a); render(); break; }
    case 'bonus': a[b.dataset.k]=Math.min(5,a[b.dataset.k]+1); cb.bonusTaken=true; touch(a); render(); break;
    case 'makeHome': a.rookhome=true; a.inventory.push(`Rookhome — ${cb.opp.magic} ${cb.opp.body} Rook`); touch(a); render(); toast('You have a Rookhome. Rooks will ignore you while you travel in it.'); break;
    case 'sellHusk': a.treasures+=4; cb.internal.lastBlowInternal=false; touch(a); render(); break;
    case 'becomeWithin': a.within=true; a.inventory.push('Rooksuit — a piloted Astrolithic Rook'); touch(a); render(); break;
    case 'fightCrew': { const prev=cb; beginCombat(a,'crew'); a.combat.prevSummary=`Rooknaught husk defeated (${effectiveWins(prev)}/${prev.total})`; render(); break; }
    case 'naughtLoot': { a.treasures+=3; const [c]=drawCards(a,1); const r=NAUGHT_REWARD[c.s]; cb.naughtReward={card:c,t:r.t,d:r.d}; a.inventory.push(`${r.t} (Rooknaught reward)`); touch(a); render(); break; }
    case 'logCombat': logCombatToJournal(a); break;
    case 'endCombat': a.lastCombatSummary=cb.naught? `Rooknaught battle — ${cb.naught.over}` : `${oppName(cb)} — ${cb.won?'victory':'defeat'}, ${cb.wounds} wound${cb.wounds===1?'':'s'}`; a.combat=null; touch(a); render(); break;
    // Rooknaught battle
    case 'nArrange': { const nb=cb.naught; const i=Number(b.dataset.i); if(nb.sel===null||nb.sel===undefined){ nb.sel=i; } else { [nb.mine[nb.sel],nb.mine[i]]=[nb.mine[i],nb.mine[nb.sel]]; nb.sel=null; } touch(a); render(); break; }
    case 'nLock': cb.naught.locked=true; cb.naught.sel=null; touch(a); render(); break;
    case 'nPickMine': { const nb=cb.naught; const i=Number(b.dataset.i); if(nb.used.includes(i)) break; nb.attackWith = nb.attackWith===i? null : i; touch(a); render(); break; }
    case 'nHit': naughtAttack(a, Number(b.dataset.i)); render(); break;
    case 'nCaptain': { beginCombat(a,'person'); a.combat.customName='The enemy captain'; render(); break; }
    case 'nLoseT': a.treasures=Math.max(0,a.treasures-3); cb.naught.paid=true; touch(a); render(); break;
    case 'nLoseW': a.com=Math.max(0,a.com-1); a.exp=Math.max(0,a.exp-1); cb.naught.paid=true; touch(a); render(); break;
    case 'logNaught': { const nb=cb.naught; a.journalCount=(a.journalCount||0)+1; const e={id:uid(), ts:Date.now(), updatedAt:Date.now(), kind:'combat', title:'Battle — Rooknaught against Rooknaught', where:'Tundroom', cards:[...nb.log, `Result: ${nb.over}`], text:''}; journalOf(a.id).unshift(e); cb.logged=true; touch(a); touchEntry(a.id,e); state.tab='journal'; state.focusEntry=e.id; render(); break; }
  }
}
function whereLabel(a){ return TABLES[a.location]?.short || ({city:a.city&&a.city.name||'A city', parapette:'Parapette', crownisle:'Crown Isle'})[a.location] || a.location; }
function logCombatToJournal(a){
  const cb=a.combat; const o=cb.opp; const lines=[];
  lines.push(`${oppName(cb)} — Combat score ${cb.queen? QUEEN_PHASES.map(p=>p.score).join('/') : cb.total}${cb.coop?` (co-op with ${partnerName(a,cb)})`:''}`);
  if(o.cards) lines.push(`Created: ${o.cards.map(cardLabel).join(' ')} — ${[o.intention,o.magic&&o.magic+' magic',o.body&&o.body+' body',o.weapon&&o.weapon+' weapon',o.reward&&'reward '+o.reward,o.kind&&(o.kind==='sword'?'Sword Bastion':'Seastone Bastion'),o.kind&&(o.noticed?'noticed you':'did not notice you')].filter(Boolean).join(', ')}`);
  const rounds = cb.queen&&cb.queen.rounds? cb.queen.rounds : cb.rounds;
  rounds.forEach((r,i)=>lines.push(`${r.phase?`Phase ${r.phase} `:''}Round ${i+1}: ${cardLabel(r.atk)} vs ${r.ctr?cardLabel(r.ctr):'no card'}${r.ctr2?' + '+cardLabel(r.ctr2):''} — ${r.result==='crit'?'critical hit':r.result==='win'?'defeated':r.result==='clash'?'clash':r.result==='combo'?'combo critical':r.defended?'defended':r.mitigated?'blocked':'wounded'}${cb.coop?` (${r.who===1?partnerName(a,cb):'you'})`:''}${r.internal?' (inside)':''}`));
  lines.push(`${cb.won?'Victory':'Defeat'} — ${cb.queen?`${cb.queen.phasesDone} phases survived`:`${effectiveWins(cb)} of ${cb.total}`}, ${cb.wounds} wound${cb.wounds===1?'':'s'}${cb.coop?`; ${partnerName(a,cb)} ${cb.coop.wounds[1]}`:''}${cb.altReward?', '+cb.altReward.t:''}${cb.naughtReward?', '+cb.naughtReward.t:''}`);
  a.journalCount=(a.journalCount||0)+1;
  const e={id:uid(), ts:Date.now(), updatedAt:Date.now(), kind:'combat', title:`Battle — ${oppName(cb)}`, where:whereLabel(a), cards:lines, text:''};
  journalOf(a.id).unshift(e); cb.logged=true; touch(a); touchEntry(a.id,e); state.tab='journal'; state.focusEntry=e.id; render(); window.scrollTo({top:0});
}

/* ---------- Rooknaught vs Rooknaught ---------- */
const NPOS=[['head','Head / Helm'],['a1','Arm 1'],['core','Core'],['a2','Arm 2'],['legs','Legs / Motion']];
function beginNaught(a){
  const enemy=drawCards(a,5,{hold:true}); const mine=drawCards(a,5,{hold:true});
  a.combat={stage:'naught', type:'naughtvs', naught:{enemy, revealed:[false,false,false,false,false], damaged:[false,false,false,false,false], mine, used:[], locked:false, sel:null, attackWith:null, dmgMine:0, dmgEnemy:0, log:[], over:null}, rounds:[], logged:false, internal:{checks:[]}, fx:{}};
  touch(a);
}
function naughtAttack(a, enemyIdx){
  const nb=a.combat.naught; if(nb.over||nb.attackWith===null||nb.attackWith===undefined) return; if(nb.damaged[enemyIdx]) return;
  const mine=nb.mine[nb.attackWith], theirs=nb.enemy[enemyIdx]; nb.revealed[enemyIdx]=true;
  let msg=`${NPOS[nb.attackWith][1]} (${cardLabel(mine)}) strikes their ${NPOS[enemyIdx][1]} (${cardLabel(theirs)}): `;
  if(mine.r>theirs.r){ nb.dmgEnemy++; nb.damaged[enemyIdx]=true; msg+='hit! 1 damage to them.'; }
  else if(mine.r<theirs.r){ nb.dmgMine++; msg+='repelled — 1 damage to you. Their part is exposed.'; }
  else { const [cc]=drawCards(a,1); if(isRed(cc)){ nb.dmgEnemy++; nb.damaged[enemyIdx]=true; msg+=`CLASH — ${cardLabel(cc)} red, you push through! 1 damage to them.`; } else { nb.dmgMine++; msg+=`CLASH — ${cardLabel(cc)} black, they overpower you. 1 damage to you.`; } }
  nb.used.push(nb.attackWith); nb.attackWith=null; nb.log.push(msg);
  if(nb.dmgEnemy>=3) nb.over='win'; else if(nb.dmgMine>=3) nb.over='lose'; else if(nb.used.length>=5) nb.over='stalemate';
  if(nb.over){ discardCards(a,[...nb.enemy,...nb.mine]); }
  touch(a);
}
function renderNaughtBattle(a,cb){
  const nb=cb.naught;
  const grid=(cards, mine)=>`<div class="naught">${NPOS.map(([k,label],i)=>{ const c=cards[i]; let inner;
    if(mine){ inner=cardHTML(c,{small:true, selected: nb.locked? nb.attackWith===i : nb.sel===i, used: nb.used.includes(i), pick: !nb.used.includes(i) && !nb.over, attrs:`data-act="${nb.locked?'nPickMine':'nArrange'}" data-i="${i}" role="button" tabindex="0"`}); }
    else { inner = nb.revealed[i]? cardHTML(c,{small:true, used: nb.damaged[i], tilt: nb.damaged[i], pick: !nb.damaged[i] && nb.attackWith!==null && !nb.over, attrs:`data-act="nHit" data-i="${i}" role="button" tabindex="0"`}) : cardBackHTML({small:true, pick: nb.attackWith!==null && !nb.over, attrs:`data-act="nHit" data-i="${i}" role="button" tabindex="0" aria-label="Attack their ${label}"`}); }
    return `<div class="p-${k}"><div class="pos">${label}</div>${inner}</div>`; }).join('')}</div>`;
  let html=`<div class="panel"><div class="row between"><h3>Rooknaught battle <span class="tag">armour 3 each</span>${helpBtn('naught','Help: Rooknaught battles')}</h3><button class="btn sm ghost" data-act="cancel">Cancel</button></div>
    <p class="small">The enemy crew is hidden inside — you attack blind. Each of your parts can attack once. Higher number: 1 damage to them. Lower: 1 damage to you and their part stays revealed. Equal: a Clash — draw a card, red breaks it your way.</p>
    <div class="grid c2"><div class="lane"><h4>Enemy Rooknaught <span class="n">damage <span class="dmg">${[0,1,2].map(i=>`<i class="${i<nb.dmgEnemy?'on':''}"></i>`).join('')}</span></span></h4>${grid(nb.enemy,false)}</div>
    <div class="lane"><h4>Your Rooknaught <span class="n">damage <span class="dmg">${[0,1,2].map(i=>`<i class="${i<nb.dmgMine?'on':''}"></i>`).join('')}</span></span></h4>${grid(nb.mine,true)}
      ${!nb.locked?`<p class="small" style="margin-top:8px">Arrange your crew: tap two cards to swap them (your strongest fighter’s station deserves your highest card). Then lock in.</p><button class="btn sm ochre" data-act="nLock">Lock positions</button>`: nb.over?'' : nb.attackWith===null||nb.attackWith===undefined?`<p class="small" style="margin-top:8px">Choose one of your parts to attack with.</p>`:`<p class="small" style="margin-top:8px">Now choose which enemy part to strike.</p>`}</div></div>`;
  if(nb.log.length) html+=`<div class="lane" style="margin-top:12px"><h4>Battle log</h4>${nb.log.map(l=>`<div class="small">${esc(l)}</div>`).join('')}</div>`;
  if(nb.over){
    html+=`<div class="outcome ${nb.over==='win'?'win':'lose'}"><h3>${nb.over==='win'?'Their Rooknaught is disabled!':nb.over==='lose'?'Your Rooknaught is boarded':'Stalemate — your parts are spent'}</h3>`;
    if(nb.over==='win') html+=`<p>Gangplanks extend; your crew charges across. Loot <b>3 Treasures</b> and a legendary item. Only the captain will face you.</p><div class="row" style="justify-content:center">${cb.naughtReward?`<span class="chip">${cardLabel(cb.naughtReward.card)} ${esc(cb.naughtReward.t)}</span>`:`<button class="btn sm grass" data-act="naughtLoot">Loot (+3 Treasures, draw reward)</button>`}<button class="btn sm red" data-act="nCaptain">Duel the captain</button></div>${cb.naughtReward?`<p class="small">${esc(cb.naughtReward.d)}</p>`:''}`;
    else html+=`<p>${nb.over==='lose'?'The enemy crew loots you: lose 3 Treasures. If you cannot pay, they beat you half to death — take 1 Wound to Combat and 1 to Exploration.':'Neither fortress could land the third blow; you limp apart across the ice.'}</p>${nb.over==='lose'&&!nb.paid?`<div class="row" style="justify-content:center"><button class="btn sm red" data-act="nLoseT" ${a.treasures<3?'disabled':''}>Pay 3 Treasures</button><button class="btn sm red" data-act="nLoseW">Take the beating (−1 Com, −1 Exp)</button></div>`:nb.over==='lose'?'<span class="chip">Settled</span>':''}`;
    html+=`<div class="row" style="justify-content:center;margin-top:12px"><button class="btn ocean" data-act="logNaught">${cb.logged?'Logged ✓ — log again':'Log to journal'}</button><button class="btn ghost" data-act="endCombat">Finish</button></div></div>`;
  }
  return html+'</div>';
}

function combatRulesHTML(){
  return `<details class="rule"><summary>How a fight works</summary><div class="body">
    <ol class="steps">
      <li><b>Create the opponent.</b> A person: one card — suit for intention, rank for weapon (A–6 ranged, 7–K melee). A Rook: two cards — magic (suit) and body (A–7 attack, 8–K defence), then weapon (rank) and your reward (suit).</li>
      <li><b>Draw your options</b> — as many cards as your Combat score. These are your attacks for the whole battle.</li>
      <li><b>Opponent attacks one card at a time</b> — a person has 1 attack, a medium Rook 3, a massive Rook 5, Astrolithics and Rooknaughts 6, feral Rooks 6–8, Bastions 3.</li>
      <li><b>Counter</b> with one option. Higher number wins the round; same suit as well is a <b>Critical Hit</b> that removes one more of its attacks. Equal numbers <b>Clash</b> — no wound. Lower: you still spend the card and take a <b>Wound</b>.</li>
      <li><b>Win</b> by defeating the majority of its attacks. Against a Rook: take its reward and add 1 to Exploration or Combat. Against a person: +1 Treasure.</li>
      <li><b>Wounds</b> each remove a point from Exploration or Combat (your choice). Scores never exceed 5. A score at zero is death.</li>
    </ol>
    <p><b>Fighting inside a Rook</b> (Roomlands): pick one counter as your boarding attack and note its number. Before each later attack, draw a card — it must beat that number or you are thrown off (one attempt per Rook). A Rook defeated with a final blow from inside stays intact: make it a Rookhome, or sell its location to a Rooksmith for 4 Treasures. Inside, its attacks change: ♠ internal defences, ♣ it reaches in to throw you out, ♥ its magic floods the rooms, ♦ it thrashes.</p>
    <p><b>Two players</b> (Roomlands): the opponent’s score doubles and it targets you in turns; your partner can step in to defend a lost round, and together you can gamble on a combo attack. <b>Items</b> such as Turtle Shell Armour, an Armour Plate, Lubrication Oil or a Clash Bang in your inventory take effect automatically or offer a button when they apply.</p>
    <p><b>Attack types are flavour.</b> ♠ Unarmed · ♣ Weapon · ♥ Magic (Ice, Electric or Rumble) · ♦ Creative. Only the numbers decide the round. Lost fights: the opponent lives and keeps any wounds you landed — a white whale for later.</p>
  </div></details>`;
}
