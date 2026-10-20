/* =====================================================================
   SYNC — optional cross-device saving via a private GitHub Gist.
   The token is stored only in this browser's localStorage.
   Needs a fine-grained personal access token with "Gists: read and write".
   ===================================================================== */
const SYNC_KEY='colostle-companion-sync';
const GIST_FILE='colostle-companion-save.json';
const sync = { token:null, gistId:null, lastAt:null, busy:false, timer:null, error:null };
function syncLoadConfig(){ try{ const raw=localStorage.getItem(SYNC_KEY); if(raw){ const c=JSON.parse(raw); sync.token=c.token||null; sync.gistId=c.gistId||null; sync.lastAt=c.lastAt||null; } }catch(e){} }
function syncSaveConfig(){ try{ localStorage.setItem(SYNC_KEY, JSON.stringify({token:sync.token, gistId:sync.gistId, lastAt:sync.lastAt})); }catch(e){} }
function syncConnected(){ return !!(sync.token && sync.gistId); }
async function gh(path, opts={}){
  const res=await fetch('https://api.github.com'+path, Object.assign({headers:{'Authorization':'Bearer '+sync.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28', ...(opts.body?{'Content-Type':'application/json'}:{})}}, opts));
  if(res.status===401) throw new Error('GitHub rejected the token (401). Check it has Gists: read and write, and hasn’t expired.');
  if(res.status===404) throw new Error('Gist not found (404). It may have been deleted — disconnect and connect again.');
  if(!res.ok) throw new Error('GitHub error '+res.status);
  return res.status===204? null : res.json();
}
function syncPayload(){ return {format:'colostle-companion-sync', version:1, savedAt:Date.now(), adventures:state.adventures, journal:state.journal, tombstones:state.tombstones||{}}; }
function tombstone(id){ state.tombstones=state.tombstones||{}; state.tombstones[id]=Date.now(); }
function mergeRemote(remote){
  if(!remote || remote.format!=='colostle-companion-sync') return false;
  let changed=false; state.tombstones=state.tombstones||{};
  const tomb=Object.assign({}, remote.tombstones||{}); for(const id in tomb){ if(!state.tombstones[id]||tomb[id]>state.tombstones[id]) state.tombstones[id]=tomb[id]; }
  const dead = id => { const t=state.tombstones[id]; return t!==undefined; };
  const deadAfter = (id, ts) => dead(id) && state.tombstones[id] >= (ts||0);
  (remote.adventures||[]).forEach(ra=>{ if(deadAfter(ra.id, ra.updatedAt)) return; const la=state.adventures.find(a=>a.id===ra.id); if(!la){ state.adventures.push(ra); changed=true; } else if((ra.updatedAt||0)>(la.updatedAt||0)){ Object.assign(la, ra); changed=true; } });
  const rj=remote.journal||{}; for(const aid in rj){ const lj=journalOf(aid); rj[aid].forEach(re=>{ if(deadAfter(re.id, re.updatedAt)) return; const le=lj.find(x=>x.id===re.id); if(!le){ lj.push(re); changed=true; } else if((re.updatedAt||0)>(le.updatedAt||0)){ Object.assign(le, re); changed=true; } }); lj.sort((x,y)=>(y.ts||0)-(x.ts||0)); }
  // apply tombstones locally
  const before=state.adventures.length; state.adventures=state.adventures.filter(a=>!deadAfter(a.id, a.updatedAt)); if(state.adventures.length!==before) changed=true;
  for(const aid in state.journal){ const b=state.journal[aid].length; state.journal[aid]=state.journal[aid].filter(e=>!deadAfter(e.id, e.updatedAt)); if(state.journal[aid].length!==b) changed=true; if(!state.adventures.find(a=>a.id===aid)) delete state.journal[aid]; }
  if(!adv()) state.activeId=state.adventures[0]?.id||null;
  return changed;
}
async function syncPull(){
  if(!syncConnected()) return;
  const g=await gh('/gists/'+sync.gistId); const f=g.files && g.files[GIST_FILE]; if(!f) throw new Error('The gist has no save file yet.');
  let content=f.content; if(f.truncated){ content=await (await fetch(f.raw_url)).text(); }
  const remote=JSON.parse(content); const changed=mergeRemote(remote); saveLocal(); return changed;
}
async function syncPush(){
  if(!syncConnected()) return;
  await gh('/gists/'+sync.gistId, {method:'PATCH', body:JSON.stringify({files:{[GIST_FILE]:{content:JSON.stringify(syncPayload())}}})});
  sync.lastAt=Date.now(); syncSaveConfig();
}
function syncSchedule(){ if(!syncConnected()) return; clearTimeout(sync.timer); sync.timer=setTimeout(syncFlush, 2000); }
async function syncFlush(){
  if(!syncConnected()||sync.busy) { if(sync.busy) syncSchedule(); return; }
  sync.busy=true; setSyncStatus('syncing');
  try{ await syncPush(); sync.error=null; setSyncStatus('synced'); }
  catch(e){ sync.error=e.message; setSyncStatus('error', e.message); }
  finally{ sync.busy=false; }
}
async function syncConnect(token){
  sync.token=token.trim(); if(!sync.token) throw new Error('Paste a token first.');
  setSyncStatus('syncing');
  // find an existing save gist for this token, else create one
  let found=null;
  for(let page=1; page<=5 && !found; page++){ const list=await gh('/gists?per_page=100&page='+page); if(!list.length) break; found=list.find(g=>g.files && g.files[GIST_FILE]); }
  if(found){ sync.gistId=found.id; syncSaveConfig(); const changed=await syncPull(); await syncPush(); render(); toast(changed?'Connected — save merged from your gist':'Connected to your existing save gist'); }
  else { const g=await gh('/gists', {method:'POST', body:JSON.stringify({description:'Colostle Companion save (private)', public:false, files:{[GIST_FILE]:{content:JSON.stringify(syncPayload())}}})}); sync.gistId=g.id; sync.lastAt=Date.now(); syncSaveConfig(); toast('Connected — a private save gist was created'); }
  setSyncStatus('synced');
}
function syncDisconnect(){ sync.token=null; sync.gistId=null; sync.lastAt=null; syncSaveConfig(); localStorage.removeItem(SYNC_KEY); setSyncStatus('local'); }
async function syncInit(){
  syncLoadConfig(); if(!syncConnected()) return;
  setSyncStatus('syncing');
  try{ const changed=await syncPull(); if(changed) render(); await syncPush(); setSyncStatus('synced'); }
  catch(e){ sync.error=e.message; setSyncStatus('error', e.message); }
}
function syncPanelHTML(){
  const on=syncConnected();
  return `<div class="panel plain"><h3>Sync across devices <span class="tag">optional · private GitHub gist</span>${helpBtn('sync','Help: syncing')}</h3>
    ${on? `<p class="small">Connected. Every change is written to a private gist a couple of seconds after you make it, and pulled when the page opens. ${sync.lastAt?`Last pushed ${fmtDate(sync.lastAt)}.`:''} ${sync.error?`<span style="color:var(--lose)"><b>Last error:</b> ${esc(sync.error)}</span>`:''}</p>
      <div class="row"><button class="btn sm" data-act="syncNow">Sync now</button><button class="btn sm ghost" data-act="syncPull">Pull from gist</button><a class="btn sm ghost" href="https://gist.github.com/${esc(sync.gistId)}" target="_blank" rel="noopener">Open the gist</a><button class="btn sm red" data-act="syncOff">Disconnect this device</button></div>`
    : `<p class="small">Play on your phone and laptop with one save. Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained token</a> with only <b>Gists: read and write</b>, paste it here on each device. It is stored in this browser only — never in your site’s files.</p>
      <div class="row" style="align-items:flex-end"><div style="flex:1;min-width:220px"><label for="synctoken">GitHub token</label><input id="synctoken" type="password" autocomplete="off" placeholder="github_pat_…"></div><button class="btn sm ochre" data-act="syncOn">Connect</button></div>`}
  </div>`;
}
HELP.sync={t:'Syncing between devices', b:`<p>A static site has nowhere to keep your save, so the companion can keep it in a <b>private GitHub gist</b> that only your token can read. Each device you connect pulls the gist on load and pushes after every change; the newer version of each adventure and journal entry wins, so finish a session on one device before starting on another and nothing is lost.</p>
  <p>Create the token at github.com → Settings → Developer settings → Personal access tokens → Fine-grained. Give it no repository access and a single account permission: <b>Gists: read and write</b>. Set an expiry you are comfortable with; when it expires, paste a new one.</p>
  <p>The token is saved only in this browser. Disconnect before using a shared computer. Export a save file now and then as a backup regardless.</p>`, src:'Companion feature — not part of the rulebooks'};
