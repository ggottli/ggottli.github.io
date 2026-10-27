(() => {
'use strict';
// =====================================================================
// constants
// =====================================================================
const LS = 'sprawl.v1';
const TYPE_META = {
  note:{i:'¶',l:'Note',ex:'any thought at all',d:'A thought, fact, idea, or anything that fits no other card.'},
  todo:{i:'☑',l:'Checklist',ex:'pack charger, passport and headphones',d:'A task, errand, or list of things to do.'},
  heading:{i:'H',l:'Heading',ex:'# Q4 PLAN',d:'A short title or section label.'},
  link:{i:'↗',l:'Link',ex:'https://… read later',d:'Mainly a URL or bookmark to save.'},
  question:{i:'?',l:'Question',ex:'what would make this easier?',d:'An open question to think about (not a vote between options).'},
  quote:{i:'❝',l:'Quote',ex:'"less, but better" — dieter rams',d:'A quotation or something someone said.'},
  event:{i:'📅',l:'Event',ex:'coffee with maya thursday 10am',d:'A plan, meeting, meal, call or trip happening at a date or time.'},
  reminder:{i:'🔔',l:'Reminder',ex:'remind me to renew the passport tomorrow',d:'An explicit "remind me" or "don\'t forget" nudge.'},
  timer:{i:'⏱',l:'Timer',ex:'20 min stretch',d:'A countdown timer for some minutes or seconds.'},
  habit:{i:'🔁',l:'Habit',ex:'run 3x a week',d:'A recurring habit with a frequency like daily or 3x a week.'},
  goal:{i:'🎯',l:'Goal',ex:'walk 500 miles this year, 120 done',d:'A numeric target to track progress toward.'},
  color:{i:'🎨',l:'Color',ex:'#3a7bd5 · sky blue',d:'A color as hex, rgb, or a color name.'},
  calc:{i:'🧮',l:'Calculate',ex:'15% of 240',d:'A math expression or percentage to compute.'},
  convert:{i:'⇄',l:'Convert',ex:'4 miles in km · 68f to c',d:'A unit conversion.'},
  split:{i:'➗',l:'Split',ex:'split 86 between 3',d:'Splitting a bill or amount between people.'},
  expense:{i:'💸',l:'Expense',ex:'spent 14 on lunch',d:'Money spent on something.'},
  countdown:{i:'⏳',l:'Countdown',ex:'days until new year',d:'How long until a date or holiday.'},
  timezone:{i:'🌐',l:'Time zone',ex:'9am est in london · time in sydney',d:'A time zone conversion or the current time in a city.'},
  random:{i:'🎲',l:'Random',ex:'flip a coin · roll 2d6 · pick one: beach, hike or museum',d:'Dice, a coin flip, or a random pick.'},
  poll:{i:'📊',l:'Poll',ex:'tacos, ramen or pizza tonight?',d:'A choice between two or more options to vote on.'},
  contact:{i:'👤',l:'Contact',ex:'maya chen 555 201 8890 maya@example.com',d:'A person with a phone number and/or email.'},
};
const TYPES = Object.keys(TYPE_META);
const BASIC = ['note','todo','heading','link','question','quote'];
const SMART = new Set(TYPES.filter(t=>!BASIC.includes(t)));
const ICON = Object.fromEntries(TYPES.map(t=>[t,TYPE_META[t].i]));
const COLORS = ['', 'yellow','orange','red','pink','purple','blue','teal','green','gray'];
const INK = {yellow:'#d9a400', orange:'#e07a2e', red:'#d64545', pink:'#e0567a', purple:'#8456e0', blue:'#3d7be0', teal:'#14a39a', green:'#2e9e55', gray:'#8a857a'};
const FRAMES = [['','▭','Card'],['sticky','◰','Sticky note'],['badge','⬭','Badge'],['dashed','⬚','Dashed'],['plain','∅','No frame']];
const VERBS = new Set(('call email text buy send finish schedule book review fix write ship pay submit prep prepare update draft ask reply '+
  'clean order research read build deploy check renew cancel return pick grab plan follow set make get file print sign register '+
  'confirm remind meet finalize test refactor merge push publish post share invite reach contact message ping start try learn study practice wash do').split(' '));
const PROMPTS = ["What would make today great?","What's on my mind right now?","What did I learn yesterday?","Who should I reach out to?",
  "What am I avoiding?","What's one thing I'm grateful for?","What's the one thing that matters most today?","What drained me lately, and what energized me?"];
const DOW = {sun:0,sunday:0,mon:1,monday:1,tue:2,tues:2,tuesday:2,wed:3,weds:3,wednesday:3,thu:4,thur:4,thurs:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
const DEFAULTS = {live:true, disabled:[], introSeen:false,
  theme:'auto', snap:false, minimap:innerWidth>600, legend:true, gist:{token:'', id:'', auto:false, last:''}};
const DEBUG = /[?&]debug=1/.test(location.search);
const ICONS={
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  select:'<path d="M5 3h2M11 3h2M17 3h2M3 7v2M3 13v2M21 7v2M21 13v2M5 21h2M11 21h2M17 21h2M3 3v0M21 3v0M3 21v0M21 21v0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  palette:'<path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1a1.6 1.6 0 0 1 1.2-2.7H16a6 6 0 0 0 6-6C22 5.8 17.5 2 12 2Z"/><circle cx="7.5" cy="11.5" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  box:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>',
  card:'<rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 10h8M8 14h5"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7Z"/>',
  layers:'<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',
  move:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  align:'<path d="M4 3v18"/><rect x="8" y="6" width="11" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>',
  clip:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9Z"/>',
  play:'<path d="M7 4v16l13-8Z"/>', fit:'<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>',
  upload:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  select2:'<path d="M3 3l7 18 2.5-7.5L20 11Z"/>', inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
  resize:'<path d="M21 15v6h-6M21 21l-7-7M3 9V3h6M3 3l7 7"/>', edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  // the 21 shapes
  't-note':'<path d="M4 6h16M4 12h16M4 18h10"/>',
  't-todo':'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
  't-heading':'<path d="M6 4v16M18 4v16M6 12h12"/>',
  't-link':'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  't-question':'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8"/><path d="M12 17h.01"/>',
  't-quote':'<path d="M10 7H7a3 3 0 0 0-3 3v1a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3"/><path d="M20 7h-3a3 3 0 0 0-3 3v1a2 2 0 0 0 2 2h2v1a3 3 0 0 1-3 3"/>',
  't-event':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  't-reminder':'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 21h4"/>',
  't-timer':'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  't-habit':'<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  't-goal':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12h.01"/>',
  't-color':'<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  't-calc':'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
  't-convert':'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  't-split':'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.3"/>',
  't-expense':'<path d="M12 3v18"/><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a3.5 3.5 0 0 1-3.5-2.5"/>',
  't-countdown':'<path d="M6 3h12M6 21h12"/><path d="M8 3c0 5 4 6 4 9s-4 4-4 9M16 3c0 5-4 6-4 9s4 4 4 9"/>',
  't-timezone':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  't-random':'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
  't-poll':'<path d="M5 20v-9M12 20V4M19 20v-6"/>',
  't-contact':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};
const I = (n,cls='') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
const TI = t => I('t-'+t,'ti');   // shape icon (SVG) for HTML contexts; ICON[t] stays the emoji for plain-text contexts (toasts, markdown)
const FONTS={sans:['Sans','ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],serif:['Serif','Georgia, "Iowan Old Style", "Times New Roman", serif'],
  rounded:['Rounded','ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif'],mono:['Mono','ui-monospace, "SF Mono", Menlo, Consolas, monospace'],
  hand:['Hand','"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive']};
const ACCENTS=[{n:'Indigo',c:'#4f6bed',d:'#7b91ff'},{n:'Tomato',c:'#e5533d',d:'#ff7b66'},{n:'Emerald',c:'#16935f',d:'#3ccf90'},{n:'Violet',c:'#7c4ddb',d:'#a98bfa'},
  {n:'Amber',c:'#c86f05',d:'#f6a937'},{n:'Pink',c:'#d0287a',d:'#f472b6'},{n:'Teal',c:'#0f8f88',d:'#2dd4bf'},{n:'Graphite',c:'#3a3936',d:'#e7e3da'}];
const GRADS={sunrise:'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',ocean:'linear-gradient(135deg,#e0f2fe 0%,#c7d2fe 100%)',meadow:'linear-gradient(135deg,#e9f9d4 0%,#b8ecc4 100%)',
  dusk:'linear-gradient(135deg,#c3b1e1 0%,#fbc2eb 100%)',cotton:'linear-gradient(160deg,#fde2f3 0%,#d4e4ff 100%)',peach:'linear-gradient(135deg,#fff1e0 0%,#ffd6c9 100%)',
  aurora:'linear-gradient(135deg,#0f2027 0%,#203a43 55%,#2c5364 100%)',midnight:'linear-gradient(160deg,#1b1c2b 0%,#3a2f55 100%)',forest:'linear-gradient(160deg,#14261d 0%,#2e4a3a 100%)'};
const BG_COLORS=[['Paper',''],['Snow','#ffffff'],['Sand','#efe6d2'],['Butter','#fbf3cf'],['Mint','#e3f1e8'],['Sky','#e2ecf7'],['Blush','#f7e4e6'],['Lilac','#ece6f6'],
  ['Slate','#2b2f36'],['Navy','#18223a'],['Forest','#1d2b23'],['Ink','#141518']];
const BG_GRADS=[['Sunrise','sunrise',0],['Ocean','ocean',0],['Meadow','meadow',0],['Dusk','dusk',0],['Cotton','cotton',0],['Peach','peach',0],['Aurora','aurora',1],['Midnight','midnight',1],['Forest','forest',1]];
const LOOKS=[{n:'Paper',bg:{pattern:'dots'},font:'sans'},{n:'Blueprint',bg:{color:'#1d3557',pattern:'grid'},font:'mono'},{n:'Notebook',bg:{color:'#fffef8',pattern:'lines'},font:'hand'},
  {n:'Café',bg:{color:'#efe6d2',pattern:'none'},font:'serif'},{n:'Midnight',bg:{grad:GRADS.aurora,dark:true,pattern:'dots'},font:'rounded'},{n:'Dreamy',bg:{grad:GRADS.cotton,pattern:'none'},font:'rounded'}];
const BOX_EMOJI=['','📌','💡','✅','🔥','🎯','📚','🧠','💼','🗓','✈️','💰','🎨','🚀','⭐','❤️','🌱','⚠️','🏁','🧪'];

// =====================================================================
// dom + helpers
// =====================================================================
const $ = s => document.querySelector(s);
const viewport=$('#viewport'), world=$('#world'), cardsEl=$('#cards'), boxesEl=$('#boxes'), linesSvg=$('#lines'), inkSvg=$('#ink'),
      labelsEl=$('#labels'), tempSvg=$('#temp'), marquee=$('#marquee'), selbar=$('#selbar'), hint=$('#hint'), settingsEl=$('#settings'),
      todayEl=$('#today'), palette=$('#palette'), palIn=$('#palIn'), palList=$('#palList'), mm=$('#minimap'), legendEl=$('#legend'),
      drawbar=$('#drawbar'), presbar=$('#presbar'), engineEl=$('#engine'), styleEl=$('#stylePanel'), mergeBar=$('#mergeBar'), snapSlot=$('#snapSlot');
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const r1 = n => Math.round(n*10)/10;
const esc = s => String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pad2 = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const noon = (d=new Date()) => { const x=new Date(d); x.setHours(12,0,0,0); return x; };
const addDays = (n,d=new Date()) => { const x=noon(d); x.setDate(x.getDate()+n); return x; };
const fromIso = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d,12); };
const cap = s => s ? s[0].toUpperCase()+s.slice(1) : s;
const fmtNum = (n,d=2) => Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:d}) : '—';
function ago(ts){
  if(!ts) return 'a while ago';
  const m=(Date.now()-ts)/60000;
  if(m<1) return 'just now'; if(m<60) return Math.round(m)+'m ago'; if(m<1440) return Math.round(m/60)+'h ago'; if(m<10080) return Math.round(m/1440)+'d ago';
  return new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
function fmtTime(h,m){ const d=new Date(); d.setHours(h,m,0,0); return d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}); }
function relDays(isoStr){ const diff=Math.round((fromIso(isoStr)-noon())/86400000);
  return diff===0?'today':diff===1?'tomorrow':diff===-1?'yesterday':diff>0?`in ${diff} days`:`${-diff} days ago`; }

// =====================================================================
// state
// =====================================================================
let db;
const sel = new Set();
let editingId=null, editOrig='', editSnapshot=null, tagFilter=null, legendFilter=null, selectMode=false;
let drawMode=false; const drawTool={color:'', w:3, erase:false};
let undoStack=[], redoStack=[], lastNudge=0, pres=null;
let pred=null;            // live shapeshift state while editing

function S(){ return db.spaces[db.current]; }
function V(){ const s=S(); if(!s.view) s.view={x:Math.round(innerWidth/2-320), y:110, z:1}; return s.view; }
function find(id){ return S().cards.find(c=>c.id===id); }
function findIn(sp,id){ return sp && sp.cards.find(c=>c.id===id); }
function findBox(id){ return S().boxes.find(b=>b.id===id); }
function cEl(id){ return cardsEl.querySelector(`[data-id="${id}"]`); }
function bEl(id){ return boxesEl.querySelector(`[data-box="${id}"]`); }
const sn = v => db.settings.snap ? Math.round(v/12)*12 : Math.round(v);

function newSpace(name,kind){ return {id:uid(), name, kind:kind||'', pinned:false, cards:[], connections:[], boxes:[], strokes:[], trash:[], bg:{dots:true}, view:null}; }
function newCard(x,y,text=''){ const t=Date.now(); return {id:uid(), x:Math.round(x), y:Math.round(y), w:220, text, type:'note', color:'', frame:'', locked:false, img:'', auto:false, manual:false, data:{}, created:t, updated:t}; }

function welcomeSpace(){
  const s=newSpace('Welcome'); s.bg={pattern:'dots'};
  const C=(id,x,y,text,type,extra={})=>Object.assign(newCard(x,y,text),{id,w:220,type,auto:true},extra);
  const B=(id,x,y,w,h,name,emoji,color)=>({id,x,y,w,h,name,emoji,color,style:'soft'});
  s.boxes=[B('b1',0,0,980,650,'Type anything. It becomes the right card.','✨','yellow'), B('b2',1040,0,640,650,'Arrange it yourself','🧩','blue'), B('b3',0,710,980,330,'Capture, plan, keep','🗓','green')];
  const row=(y,items)=>items.map(([id,text,type,w],i)=>C(id,20+i*240,y,text,type,{w:w||220}));
  s.cards=[
    C('h1',20,44,'No menus. Every card in this box was typed as plain text and shaped itself. Press Enter to finish a card.','note',{w:940,frame:'plain'}),
    ...row(118,[['e1','coffee with maya thursday 10am','event',230],['e2','20 min stretch','timer'],['e3','tacos, ramen or pizza tonight?','poll'],['e4','remind me to renew the passport tomorrow','reminder']]),
    ...row(300,[['e5','Pack:\n[ ] charger\n[ ] passport\n[ ] headphones','todo'],['e6','split 86 between 3','split'],['e7','water the plants every morning','habit'],['e8','walk 500 miles this year, 120 done','goal']]),
    ...row(460,[['e9','4 miles in km','convert'],['e10','days until new year','countdown'],['e11','sky blue','color'],['e12','time in sydney','timezone']]),
    C('a1',1060,50,'Sprawl never moves your cards. Where things sit, and what connects to what, is yours. That\u2019s what makes it stick in memory.','note',{w:290}),
    C('a2',1060,180,'Try it:\n[ ] Drag this card somewhere else\n[ ] Drag the \u25cf on its edge onto another card\n[ ] Drop a card right under another to combine them\n[ ] Drop one a little further down to snap it into a list\n[ ] Drag the \u25e2 corner to resize','todo',{w:290,color:'yellow'}),
    C('a3',1390,50,'Boxes group cards. Each box is also a slide: press P to present them.','note',{w:260,frame:'sticky',color:'pink'}),
    C('a4',1390,210,'Right-click anything (long-press on a phone) for colors, frames, locks and more.','note',{w:260}),
    C('a5',1390,340,'"less, but better" \u2014 dieter rams','quote',{w:260}),
    C('c1',20,762,'**\u2318K** captures a thought from anywhere. It lands in the Inbox, already shaped.','note',{w:300}),
    C('c2',340,762,'**\u2600 Today** gathers every event, reminder, task and habit with a date, across all your spaces.','note',{w:300}),
    C('c3',660,762,'Type **/** at the start of a card to pick any of the 21 shapes yourself. **Tab** cycles the suggestion.','note',{w:300}),
    C('c4',20,910,'It all stays in this browser. No account, no server. Export JSON or Markdown, or sync a private GitHub Gist, from \u2699 Settings.','note',{w:460}),
    C('c5',500,910,'Done looking? Spaces \u25be \u2192 New space, or delete this one. The intro is always in Settings. #welcome','note',{w:460,color:'green'}),
  ];
  s.connections=[{id:uid(),from:'a1',to:'a2',label:'then',color:'blue'},{id:uid(),from:'a2',to:'a3',label:'and',color:''}];
  return s;
}
function seed(){ const s=welcomeSpace(); return {spaces:{[s.id]:s}, order:[s.id], current:s.id, settings:{}, templates:[]}; }
function ensureWelcome(){
  let id=db.order.find(i=>db.spaces[i].name==='Welcome' && db.spaces[i].cards.some(c=>/#welcome/.test(c.text)));
  if(!id){ const s=welcomeSpace(); db.spaces[s.id]=s; db.order.push(s.id); id=s.id; }
  return id;
}
function migrate(d){
  d.settings = Object.assign({}, DEFAULTS, d.settings||{});
  d.settings.gist = Object.assign({}, DEFAULTS.gist, d.settings.gist||{});
  ['ai','ollamaUrl','ollamaModel','jevUrl','jevModel','jevKey'].forEach(k=>delete d.settings[k]);
  if(!Array.isArray(d.settings.disabled)) d.settings.disabled=[];
  d.templates = d.templates || [];
  d.order = (d.order||[]).filter(id=>d.spaces[id]);
  for(const id of Object.keys(d.spaces)){
    const s=d.spaces[id]; s.id=s.id||id;
    ['cards','connections','boxes','strokes','trash'].forEach(k=>{ s[k]=s[k]||[]; });
    s.cards.forEach(c=>{ c.data=c.data||{}; if(!TYPE_META[c.type]) c.type='note'; });
    s.bg=s.bg||{dots:true};
    if(!d.order.includes(id)) d.order.push(id);
  }
  if(!d.spaces[d.current]) d.current=d.order[0];
  return d;
}

// =====================================================================
// persistence + undo
// =====================================================================
function load(){ try{ const d=JSON.parse(localStorage.getItem(LS)); return d && d.spaces && Object.keys(d.spaces).length ? d : null; }catch(e){ return null; } }
let saveT=null, pushT=null;
function save(){ clearTimeout(saveT); saveT=setTimeout(flush,250); }
function flush(){
  clearTimeout(saveT);
  try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(e){ toast('Couldn’t save — browser storage is full. Remove big images or export a backup.'); }
  const g=db.settings.gist;
  if(g.auto && g.token){ clearTimeout(pushT); pushT=setTimeout(()=>syncPush(true).catch(()=>{}),8000); }
}
addEventListener('beforeunload', ()=>{ try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(e){} });
addEventListener('visibilitychange', ()=>{ if(document.hidden) flush(); });
function snap(){ return JSON.stringify(S()); }
// a multi snapshot covers several spaces at once (used when cards move between spaces)
function snapMulti(ids){ return JSON.stringify({__multi:true, spaces:Object.fromEntries(ids.filter(id=>db.spaces[id]).map(id=>[id, JSON.stringify(db.spaces[id])]))}); }
function counterSnap(s){ return s.startsWith('{"__multi"') ? snapMulti(Object.keys(JSON.parse(s).spaces)) : snap(); }
function pushUndo(s=snap()){ undoStack.push(s); if(undoStack.length>80) undoStack.shift(); redoStack=[]; }
function restore(s){
  const view=V(); const sp=JSON.parse(s);
  if(sp.__multi){ for(const [id,j] of Object.entries(sp.spaces)){ if(!db.spaces[id]) continue; const x=JSON.parse(j); if(id===db.current) x.view=view; db.spaces[id]=x; } }
  else { sp.view=view; db.spaces[db.current]=sp; }
  sel.clear(); render(); save();
}
function undo(){ if(editingId) commitEdit(); const u=undoStack.pop(); if(!u) return toast('Nothing to undo'); redoStack.push(counterSnap(u)); restore(u); }
function redo(){ if(editingId) commitEdit(); const r=redoStack.pop(); if(!r) return; undoStack.push(counterSnap(r)); restore(r); }

// =====================================================================
// PARSERS — "the engine decides, code computes"
// =====================================================================
function parseDue(tok){
  const t=tok.toLowerCase(), now=noon();
  if(t==='today'||t==='tod') return iso(now);
  if(t==='tomorrow'||t==='tmr'||t==='tmrw') return iso(addDays(1));
  if(t==='nextweek'||t==='next-week') return iso(addDays(((8-now.getDay())%7)||7));
  if(t in DOW) return iso(addDays((DOW[t]-now.getDay()+7)%7));
  let m=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if(m) return iso(new Date(+m[1],m[2]-1,+m[3],12));
  m=t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if(m){ let y=m[3]?+m[3]:now.getFullYear(); if(y<100) y+=2000; const dt=new Date(y,m[1]-1,+m[2],12);
    if(isNaN(dt)) return null; if(!m[3] && dt < addDays(-60)) dt.setFullYear(y+1); return iso(dt); }
  return null;
}
function normDueText(text){ return text.replace(/(^|\s)@([\w\/-]+)/g,(all,pre,tok)=>{ const v=parseDue(tok); return v ? `${pre}@${v}` : all; }); }

// natural-language date/time, relative to `ref` (when the card was last edited)
function parseWhen(text, ref=Date.now()){
  const now=noon(new Date(ref)); let s=' '+text.toLowerCase().replace(/[,!?]/g,' ').replace(/\.(?!\d)/g,' ')+' '; let date=null, time=null; const hits=[];
  const take=(re,fn)=>{ const m=s.match(re); if(!m) return; if(fn(m)===false) return; hits.push(m[0].trim()); s=s.replace(m[0],' '); };
  const at=(n)=>{ date=addDays(n,now); };
  const am=/\b(breakfast|brunch|morning|sunrise|wake|alarm|standup|stand-up)\b/.test(s);   // "breakfast at 7:30" is 07:30, not 19:30
  take(/[\s@](\d{4})-(\d{2})-(\d{2})(?=\s)/, m=>{ date=new Date(+m[1],m[2]-1,+m[3],12); });
  if(!date) take(/\s(?:the\s+)?day after tomorrow(?=\s)/, ()=>at(2));
  if(!date) take(/\s(today|tonight|tmrw|tmr|tomorrow)(?=\s)/, m=>{ at(/^tom|^tmr/.test(m[1])?1:0); if(m[1]==='tonight') time={h:20,m:0}; });
  if(!date) take(/\sin\s+(\d+|a|an|one|two|three)\s+(day|week|month)s?(?=\s)/, m=>{ const n={a:1,an:1,one:1,two:2,three:3}[m[1]]||+m[1]; if(m[2]==='day') at(n); else if(m[2]==='week') at(n*7); else { const d=noon(now); d.setMonth(d.getMonth()+n); date=d; } });
  if(!date) take(/\s(?:(next|this)\s+)?weekend(?=\s)/, m=>{ let d=(6-now.getDay()+7)%7; if(m[1]==='next' && d<2) d+=7; at(d); });
  if(!date) take(/\snext\s+week(?=\s)/, ()=>at(((8-now.getDay())%7)||7));
  if(!date) take(/\s(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?(?=\s)/, m=>{
    const d=new Date(m[3]?+m[3]:now.getFullYear(),MONTHS[m[1]],+m[2],12); if(!m[3] && d<addDays(-30,now)) d.setFullYear(d.getFullYear()+1); date=d; });
  if(!date) take(/\s(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*(?=\s)/, m=>{
    const d=new Date(now.getFullYear(),MONTHS[m[2]],+m[1],12); if(d<addDays(-30,now)) d.setFullYear(d.getFullYear()+1); date=d; });
  if(!date) take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, m=>{ const v=parseDue(m[0].trim()); if(!v) return false; date=fromIso(v); });
  // weekday: always stripped from the title, but an explicit date above wins. Bare "sat", "sun" and "wed" are also
  // ordinary words ("I sat with him"), so they only count when a time follows or they end the text.
  take(/\s(?:(next|this|on)\s+)?(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)((?:day|nesday|sday|urday|rsday)?)(?=\s)/, m=>{
    if(!m[1] && !m[3] && /^(sat|sun|wed)$/.test(m[2])){ const after=s.slice(s.indexOf(m[0])+m[0].length); if(!/^\s*(\d|at\b|@|noon|midday|midnight|morning|afternoon|evening|night|$)/.test(after)) return false; }
    if(date) return; let d=(DOW[m[2]]-now.getDay()+7)%7; if(m[1]==='next' && d===0) d=7; at(d); });
  take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)(?=\s)/, m=>{ if(+m[1]>12) return false; let h=+m[1]%12; if(m[3][0]==='p') h+=12; time={h,m:+(m[2]||0)}; });
  if(!time) take(/\s(?:at\s+)?(\d{1,2}):(\d{2})(?=\s)/, m=>{ const h=+m[1]; if(h>23) return false; time={h:h<8&&!am?h+12:h,m:+m[2]}; });
  if(!time) take(/\s(?:at\s+)?(noon|midday|midnight)(?=\s)/, m=>{ time={h:m[1]==='midnight'?0:12,m:0}; });
  if(!time) take(/\sat\s+(\d{1,2})(?=\s)/, m=>{ const h=+m[1]; if(h>12) return false; time={h:h<8&&!am?h+12:h,m:0}; });
  if(!time && hits.length) take(/\s(morning|afternoon|evening)(?=\s)/, m=>{ time={h:{morning:9,afternoon:14,evening:18}[m[1]],m:0}; });
  return {date: date?iso(date):null, time, hits};
}
function stripHits(text,hits,extra){
  let t=' '+text+' ';
  hits.forEach(h=>{ const re=new RegExp('(^|[\\s,@])'+h.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&').replace(/\s+/g,'[\\s,]+')+'(?=[\\s,.!?]|$)','i'); t=t.replace(re,'$1'); });
  if(extra) t=t.replace(extra,' ');
  t=t.replace(/\s+/g,' ').trim().replace(/^(on|at|by|for|this|next)\s+/i,'').replace(/\s+(on|at|by|for|this|next|from|,)$/i,'').replace(/[,\s]+$/,'');
  return t;
}
function whenOf(c){ return parseWhen(c.text, c.updated||c.created); }

// amounts
function parseAmount(s){ const m=String(s).match(/([$€£₹¥])?\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(k|m|bn)?\b/i); if(!m) return null;
  let v=parseFloat(m[2].replace(/,/g,'')); const mul={k:1e3,m:1e6,bn:1e9}[(m[3]||'').toLowerCase()]; if(mul) v*=mul; return {v, cur:m[1]||''}; }
const curOf = t => (t.match(/[$€£₹¥]/)||[''])[0] || (/\b(usd|dollars?|bucks)\b/i.test(t)?'$':/\b(inr|rs\.?|rupees?)\b/i.test(t)?'₹':/\b(eur|euros?)\b/i.test(t)?'€':/\b(gbp|pounds?)\b/i.test(t)?'£':'');
const money = (n,cur) => (cur||'')+fmtNum(n,2);

// safe math
function evalExpr(src){
  const s=src.replace(/\s+/g,'');
  const toks=s.match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[-+*/^()%]/g); if(!toks || toks.join('')!==s) return null;
  let i=0; const peek=()=>toks[i], next=()=>toks[i++];
  const FN={sqrt:Math.sqrt,abs:Math.abs,round:Math.round,floor:Math.floor,ceil:Math.ceil,log:Math.log10,ln:Math.log,sin:Math.sin,cos:Math.cos,tan:Math.tan};
  function expr(){ let v=term(); while(peek()==='+'||peek()==='-'){ const o=next(), r=term(); v=o==='+'?v+r:v-r; } return v; }
  function term(){ let v=pow(); while(peek()==='*'||peek()==='/'){ const o=next(), r=pow(); v=o==='*'?v*r:v/r; } return v; }
  function pow(){ const b=unary(); if(peek()==='^'){ next(); return Math.pow(b,pow()); } return b; }
  function unary(){ if(peek()==='-'){ next(); return -unary(); } if(peek()==='+'){ next(); return unary(); } return post(); }
  function post(){ let v=prim(); while(peek()==='%'){ next(); v/=100; } return v; }
  function prim(){ const t=next(); if(t==null) throw 0;
    if(t==='('){ const v=expr(); if(next()!==')') throw 0; return v; }
    if(/^[\d.]/.test(t)) return parseFloat(t);
    if(t==='pi') return Math.PI; if(t==='e') return Math.E;
    if(FN[t]){ if(next()!=='(') throw 0; const v=expr(); if(next()!==')') throw 0; return FN[t](v); }
    throw 0; }
  try{ const v=expr(); return i===toks.length && Number.isFinite(v) ? v : null; }catch(e){ return null; }
}
function parseCalc(text){
  let s=text.toLowerCase().trim().replace(/^(what(?:'s| is)|calc(?:ulate)?|compute|=)\s*/,'').replace(/[?=]\s*$/,'').replace(/\s*\b(tip|tax|gratuity|total|discount)\s*$/,'').replace(/,(?=\d{3})/g,'').replace(/[$€£₹¥]/g,'').trim();
  if(!s || !/\d/.test(s)) return null;
  s=s.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:of|on|tip on|tax on)\s*(\d+(?:\.\d+)?)/g,(m,a,b)=>`(${a}/100*${b})`)
     .replace(/(\d+(?:\.\d+)?)\s*%\s*off\s*(\d+(?:\.\d+)?)/g,(m,a,b)=>`(${b}*(1-${a}/100))`)
     .replace(/(\d+(?:\.\d+)?)\s+(?:plus|\+)\s+(\d+(?:\.\d+)?)\s*%/g,(m,a,b)=>`(${a}*(1+${b}/100))`)
     .replace(/(\d)\s*[x×]\s*(?=[\d(])/g,'$1*').replace(/÷/g,'/').replace(/\bplus\b/g,'+').replace(/\bminus\b/g,'-').replace(/\btimes\b/g,'*').replace(/\b(divided by|over)\b/g,'/')
     .replace(/\s*squared/g,'^2').replace(/\s*cubed/g,'^3').replace(/\bsquare root of\b/g,'sqrt');
  if(!/[-+*/^%]|sqrt|abs|round|log|ln|sin|cos|tan/.test(s)) return null;
  if(/^-?\d+(\.\d+)?$/.test(s)) return null;
  // dates, phone numbers, year ranges and "9-5" are not arithmetic
  if(/^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}\/\d{1,2}(\/\d{2,4})?$|^\d+(-\d+){2,}$|^(19|20)\d{2}-(19|20)\d{2}$|^\d{3}-\d{4}$|^\d{1,2}-\d{1,2}$/.test(s)) return null;
  const v=evalExpr(s); if(v==null) return null;
  return {expr:text.trim().replace(/[?=]\s*$/,''), v, cur:curOf(text)};
}

// units
const UNITS={};
function U(dim,factor,...names){ names.forEach(n=>UNITS[n]={dim,f:factor,n:names[0]}); }
U('len',1e-3,'mm','millimeter','millimeters','millimetre'); U('len',1e-2,'cm','centimeter','centimeters','centimetre','centimetres'); U('len',1,'m','meter','meters','metre','metres');
U('len',1e3,'km','kilometer','kilometers','kilometre','kilometres','kms'); U('len',.0254,'in','inch','inches','"'); U('len',.3048,'ft','foot','feet',"'");
U('len',.9144,'yd','yard','yards'); U('len',1609.344,'mi','mile','miles'); U('len',1852,'nmi','nautical mile','nautical miles');
U('mass',1e-3,'g','gram','grams','gm'); U('mass',1,'kg','kilo','kilos','kilogram','kilograms','kgs'); U('mass',1e-6,'mg','milligram','milligrams');
U('mass',.028349523,'oz','ounce','ounces'); U('mass',.45359237,'lb','lbs','pound','pounds'); U('mass',6.35029,'st','stone','stones'); U('mass',1000,'t','tonne','tonnes','ton','tons');
U('vol',1e-3,'ml','milliliter','milliliters','millilitre'); U('vol',1,'l','liter','liters','litre','litres'); U('vol',.00492892,'tsp','teaspoon','teaspoons');
U('vol',.0147868,'tbsp','tablespoon','tablespoons'); U('vol',.236588,'cup','cups'); U('vol',.0295735,'floz','fl oz','fluid ounce','fluid ounces');
U('vol',.473176,'pt','pint','pints'); U('vol',.946353,'qt','quart','quarts'); U('vol',3.78541,'gal','gallon','gallons');
U('speed',1,'km/h','kph','kmh','kmph'); U('speed',1.609344,'mph','miles per hour'); U('speed',3.6,'m/s','mps'); U('speed',1.852,'knot','knots','kn');
U('data',1,'b','byte','bytes'); U('data',1e3,'kb','kilobyte','kilobytes'); U('data',1e6,'mb','megabyte','megabytes'); U('data',1e9,'gb','gigabyte','gigabytes'); U('data',1e12,'tb','terabyte','terabytes');
U('time',1,'s','sec','secs','second','seconds'); U('time',60,'min','mins','minute','minutes'); U('time',3600,'h','hr','hrs','hour','hours'); U('time',86400,'day','days'); U('time',604800,'week','weeks','wk','wks'); U('time',31557600,'year','years','yr','yrs');
U('area',1,'sqm','m2','square meter','square meters','sq m'); U('area',.092903,'sqft','ft2','square foot','square feet','sq ft'); U('area',4046.86,'acre','acres'); U('area',10000,'ha','hectare','hectares'); U('area',2589988,'sqmi','square mile','square miles');
['c','°c','celsius','f','°f','fahrenheit','k','kelvin'].forEach(n=>UNITS[n]={dim:'temp',n:n.replace('°','')[0]});
function unitOf(s){ s=s.toLowerCase().trim().replace(/\.$/,''); return UNITS[s] || UNITS[s.replace(/s$/,'')] || null; }
function parseConvert(text){
  const m=text.toLowerCase().trim().replace(/\?$/,'').match(/^(?:convert\s+)?(-?[\d,]*\.?\d+)\s*([a-z°"'/0-9 ]*?)\s+(?:to|in|into|as|=|->|→)\s+([a-z°"'/0-9 ]+?)$/);
  if(!m) return null;
  const v=parseFloat(m[1].replace(/,/g,'')), a=unitOf(m[2]), b=unitOf(m[3]); if(!a||!b||a.dim!==b.dim||!Number.isFinite(v)) return null;
  let out;
  if(a.dim==='temp'){ const toC={c:x=>x,f:x=>(x-32)*5/9,k:x=>x-273.15}[a.n](v); out={c:x=>x,f:x=>x*9/5+32,k:x=>x+273.15}[b.n](toC); }
  else out=v*a.f/b.f;
  const lab=(u,raw)=>u.dim==='temp'?(u.n==='k'?'K':'°'+u.n.toUpperCase()):(raw.length<=6?raw:u.n);
  return {v, out, from:lab(a,m[2].trim()), to:lab(b,m[3].trim())};
}

// time zones
const ZONES={pst:'America/Los_Angeles',pdt:'America/Los_Angeles',pt:'America/Los_Angeles',mst:'America/Denver',mdt:'America/Denver',mt:'America/Denver',
  cst:'America/Chicago',cdt:'America/Chicago',ct:'America/Chicago',est:'America/New_York',edt:'America/New_York',et:'America/New_York',
  gmt:'Europe/London',utc:'UTC',bst:'Europe/London',cet:'Europe/Paris',cest:'Europe/Paris',ist:'Asia/Kolkata',jst:'Asia/Tokyo',kst:'Asia/Seoul',
  aest:'Australia/Sydney',sgt:'Asia/Singapore',hkt:'Asia/Hong_Kong',
  'new york':'America/New_York',nyc:'America/New_York',boston:'America/New_York',miami:'America/New_York',atlanta:'America/New_York',toronto:'America/Toronto',
  indianapolis:'America/Indiana/Indianapolis',indy:'America/Indiana/Indianapolis',carmel:'America/Indiana/Indianapolis',chicago:'America/Chicago',dallas:'America/Chicago',austin:'America/Chicago',houston:'America/Chicago',
  denver:'America/Denver',phoenix:'America/Phoenix','los angeles':'America/Los_Angeles',la:'America/Los_Angeles','san francisco':'America/Los_Angeles',sf:'America/Los_Angeles',seattle:'America/Los_Angeles',vancouver:'America/Vancouver',
  'mexico city':'America/Mexico_City','sao paulo':'America/Sao_Paulo','são paulo':'America/Sao_Paulo','buenos aires':'America/Argentina/Buenos_Aires',honolulu:'Pacific/Honolulu',hawaii:'Pacific/Honolulu',
  london:'Europe/London',dublin:'Europe/Dublin',lisbon:'Europe/Lisbon',paris:'Europe/Paris',berlin:'Europe/Berlin',amsterdam:'Europe/Amsterdam',madrid:'Europe/Madrid',rome:'Europe/Rome',
  zurich:'Europe/Zurich',stockholm:'Europe/Stockholm',athens:'Europe/Athens',istanbul:'Europe/Istanbul',moscow:'Europe/Moscow',cairo:'Africa/Cairo',lagos:'Africa/Lagos',nairobi:'Africa/Nairobi',johannesburg:'Africa/Johannesburg',
  dubai:'Asia/Dubai',mumbai:'Asia/Kolkata',delhi:'Asia/Kolkata','new delhi':'Asia/Kolkata',bangalore:'Asia/Kolkata',bengaluru:'Asia/Kolkata',india:'Asia/Kolkata',singapore:'Asia/Singapore',
  'hong kong':'Asia/Hong_Kong',shanghai:'Asia/Shanghai',beijing:'Asia/Shanghai',china:'Asia/Shanghai',seoul:'Asia/Seoul',tokyo:'Asia/Tokyo',japan:'Asia/Tokyo',manila:'Asia/Manila',bangkok:'Asia/Bangkok',jakarta:'Asia/Jakarta',
  sydney:'Australia/Sydney',melbourne:'Australia/Melbourne',perth:'Australia/Perth',auckland:'Pacific/Auckland',
  here:'local',local:'local',me:'local',home:'local'};
const zoneOf = s => { s=(s||'').toLowerCase().trim().replace(/^the\s+/,'').replace(/\s+time$/,''); return ZONES[s] || null; };
const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
function tzOffset(tz,date){ // minutes east of UTC
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));
  return (Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute,+p.second)-date.getTime())/60000;
}
function parseTZ(text){
  const t=text.toLowerCase().trim().replace(/\?$/,'');
  let m=t.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+([a-z ]+?)\s+(?:in|to|into|->|→)\s+([a-z ]+)$/);
  if(m){ const a=zoneOf(m[2]), b=zoneOf(m[3]);
    const n=m[1].match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/); let h=+n[1]; if(n[3]){ h%=12; if(n[3]==='pm') h+=12; }
    if(a&&b&&h<24) return {mode:'conv', from:a==='local'?localTZ:a, to:b==='local'?localTZ:b, fromLab:m[2], toLab:m[3], time:{h,m:+(n[2]||0)}}; }
  m=t.match(/^(?:what(?:'s| is)?\s+)?(?:the\s+)?(?:current\s+)?(?:time|clock)(?:\s+is\s+it)?\s+(?:in|at|for)\s+([a-z ,&]+)$/) || t.match(/^([a-z ]+?)\s+time(?:\s+now)?$/);
  if(m){ const cities=m[1].split(/\s*(?:,|&|\band\b)\s*/).filter(Boolean); const zs=cities.map(c=>[c,zoneOf(c)]).filter(x=>x[1]);
    if(zs.length && zs.length===cities.length) return {mode:'clock', zones:zs.map(([c,z])=>({lab:c, tz:z==='local'?localTZ:z}))}; }
  return null;
}

// countdown
function holiday(name,now=new Date()){
  const y=now.getFullYear(), n=name.toLowerCase().replace(/['’]s?\b/g,'').replace(/\s+day$/,'').trim();
  const fixed={christmas:[11,25],xmas:[11,25],'christmas eve':[11,24],'new year':[0,1],'new years':[0,1],'new year eve':[11,31],'new years eve':[11,31],nye:[11,31],halloween:[9,31],
    valentine:[1,14],valentines:[1,14],'july 4th':[6,4],'4th of july':[6,4],'fourth of july':[6,4],'independence':[6,4],'st patrick':[2,17],'st patricks':[2,17]};
  let mk=null;
  if(fixed[n]) mk=yy=>new Date(yy,fixed[n][0],fixed[n][1],12);
  else if(n==='thanksgiving') mk=yy=>{ const d=new Date(yy,10,1,12); d.setDate(1+((4-d.getDay()+7)%7)+21); return d; };
  else if(n==='memorial') mk=yy=>{ const d=new Date(yy,5,0,12); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d; };
  else if(n==='labor') mk=yy=>{ const d=new Date(yy,8,1,12); d.setDate(1+((1-d.getDay()+7)%7)); return d; };
  else if(n==='mother') mk=yy=>{ const d=new Date(yy,4,1,12); d.setDate(1+((7-d.getDay())%7)+7); return d; };
  else if(n==='father') mk=yy=>{ const d=new Date(yy,5,1,12); d.setDate(1+((7-d.getDay())%7)+14); return d; };
  if(!mk) return null;
  let d=mk(y); if(d<noon(now)) d=mk(y+1); return d;
}
function parseCountdown(text,ref){
  const t=text.toLowerCase().trim().replace(/\?$/,'');
  const m=t.match(/^(?:how\s+(?:many|long)\s+)?(?:days?|weeks?|sleeps?|hours?|time)?\s*(?:left\s+)?(?:until|till|til|before)\s+(.+)$/) || t.match(/^countdown(?:\s+to)?\s*:?\s+(.+)$/) || t.match(/^(.+?)\s+countdown$/);
  if(!m || t.split(/\s+/).length>12) return null;
  const target=m[1].trim(); let d=holiday(target), label=target;
  if(!d){ const w=parseWhen(target,ref); if(!w.date) return null; d=fromIso(w.date); label=stripHits(target,w.hits)||fromIso(w.date).toLocaleDateString(undefined,{month:'long',day:'numeric'}); }
  return {date:iso(d), label:cap(label)};
}

// timer
function parseTimer(text){
  const t=text.toLowerCase().trim();
  if(/^(pomodoro|focus|focus session|deep work)$/.test(t)) return {secs:1500, label:cap(t), words:1, cue:true};
  let secs=0, any=false; const rest=t.replace(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g,(mm,n,u)=>{ any=true; secs+=parseFloat(n)*(u[0]==='h'?3600:u[0]==='m'?60:1); return ' '; });
  if(!any || secs<=0 || secs>86400) return null;
  const label=rest.replace(/\b(set|start|a|an|timer|for|of|countdown)\b/g,' ').replace(/\s+/g,' ').trim();
  return {secs:Math.round(secs), label:cap(label)||'Timer', words:t.split(/\s+/).length, cue:/\b(timer|focus|pomodoro|break|nap|tea|egg|rest|workout|session|countdown|meditat\w*|sprint|study|plank|oven|bake|meeting|deep work)\b/.test(t) || /^\d/.test(t)};
}
const fmtClock = s => { s=Math.max(0,Math.ceil(s)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; return (h?h+':'+pad2(m):m)+':'+pad2(x); };

// habit
function parseHabit(text){
  const t=text.toLowerCase(); let per=null, m;
  if((m=t.match(/(\d+|once|twice|three times)\s*(?:x|times)?\s*(?:a|per|\/|each|every)\s*(week|wk|day)\b/))){ const n={once:1,twice:2,'three times':3}[m[1]]||+m[1]; per=m[2]==='day'?7:n; }
  else if(/\b(daily|every ?day|each day|every morning|every night|every evening|nightly)\b/.test(t)) per=7;
  else if(/\b(weekdays|every weekday)\b/.test(t)) per=5;
  else if(/\b(weekly|every week|once a week)\b/.test(t)) per=1;
  const DAYS='(?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday|rsday)?s?';
  const dl=t.match(new RegExp('\\b'+DAYS+'(?:\\s*(?:,|/|&|and|\\+)\\s*'+DAYS+')+\\b'));
  if(!per && dl && !/\d/.test(t)) per=dl[0].split(/\s*(?:,|\/|&|and|\+)\s*/).length;
  if(!per) return null;
  const name=text.replace(/\s*(\d+|once|twice|three times)\s*(?:x|times)?\s*(?:a|per|\/|each|every)\s*(week|wk|day)\b/i,' ').replace(dl?new RegExp('\\s*(?:on\\s+)?'+dl[0].replace(/[+/]/g,'\\$&'),'i'):/$^/,' ').replace(/\b(daily|every ?day|each day|every (?:morning|night|evening|weekday)|weekdays|weekly|every week|once a week|nightly)\b/i,' ').replace(/\s+/g,' ').trim();
  return {per:clamp(per,1,7), name:cap(name)||'Habit'};
}

// goal
function parseGoal(text){
  const t=text.trim(); const low=t.toLowerCase().replace(/[$€£₹¥]/g,'');
  const m=low.match(/^(?:goal:?\s*)?([a-z][a-z ]*?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|km|mi|miles|lbs?|kg)?\s*([a-z][a-z ]*?)?(?:\s+(this year|this month|this week|this quarter|by [a-z0-9 /]+?|in [a-z0-9]+))?\s*(?:[,;—–-]\s*|\s+)?(?:(\d[\d,]*(?:\.\d+)?)\s*(?:done|so far|completed|finished|down|in|read|logged))?$/);
  if(!m) return null;
  let unitTxt=m[4]||'', period=m[5]||'';                       // the lazy unit group can swallow "by december"; hand it back
  const pm=!period && unitTxt.match(/^(.*?)\s*\b(this (?:year|month|week|quarter)|by [a-z0-9 \/]+|in [a-z0-9]+)$/); if(pm){ unitTxt=pm[1]; period=pm[2]; }
  if(!(/^goal/.test(low) || period || m[6])) return null;
  const target=parseFloat(m[2].replace(/,/g,'')), done=m[6]?parseFloat(m[6].replace(/,/g,'')):0;
  if(!(target>0)) return null;
  const unit=((m[3]||'')+(unitTxt?' '+unitTxt:'')).trim();
  const title=cap(t.replace(/[,;—–-]?\s*\d[\d,.]*\s*(done|so far|completed|finished|down|in|read|logged)\s*$/i,'').replace(/^goal:?\s*/i,''));
  return {target, done, unit, period, title};
}
function periodFrac(period){
  const n=new Date(); let a,b;
  if(period==='this year'){ a=new Date(n.getFullYear(),0,1); b=new Date(n.getFullYear()+1,0,1); }
  else if(period==='this month'){ a=new Date(n.getFullYear(),n.getMonth(),1); b=new Date(n.getFullYear(),n.getMonth()+1,1); }
  else if(period==='this week'){ a=addDays(-((n.getDay()+6)%7)); a.setHours(0,0,0,0); b=new Date(a); b.setDate(a.getDate()+7); }
  else if(period==='this quarter'){ const q=Math.floor(n.getMonth()/3)*3; a=new Date(n.getFullYear(),q,1); b=new Date(n.getFullYear(),q+3,1); }
  else return null;
  return clamp((n-a)/(b-a),0,1);
}

// color
const FUN_COLORS={'tiffany blue':'#0abab5','minecraft diamond':'#4aedd9','millennial pink':'#f3cfc6','klein blue':'#002fa7','international klein blue':'#002fa7',
  'hermes orange':'#f37021','barbie pink':'#e0218a','safety orange':'#ff6700','cobalt':'#0047ab','sage':'#9caf88','sage green':'#9caf88','terracotta':'#e2725b',
  'mustard':'#e1ad01','forest green':'#228b22','burgundy':'#800020','mint':'#98ff98','charcoal':'#36454f','emerald':'#50c878','ruby':'#e0115f',
  'sapphire':'#0f52ba','cream':'#fffdd0','sand':'#c2b280','rust':'#b7410e','sky blue':'#87ceeb','purdue gold':'#cfb991','spotify green':'#1db954','facebook blue':'#1877f2'};
let colorCtx=null;
function parseColor(text){
  const t=text.trim(), low=t.toLowerCase();
  let css=null, name='';
  if(/^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) && (t[0]==='#' || (/[a-f]/i.test(t)&&/\d/.test(t)&&t.length===6))) css=t[0]==='#'?t:'#'+t;
  else if(/^(rgb|rgba|hsl|hsla)\(\s*[\d.%\s,\/]+\)$/i.test(t)) css=t;
  else if(FUN_COLORS[low]){ css=FUN_COLORS[low]; name=t; }
  else if(/^[a-z]{3,20}$/i.test(t)){ const o=new Option().style; o.color=low; if(o.color && !['inherit','initial','unset','currentcolor','transparent','revert'].includes(low)){ css=low; name=t; } }
  if(!css) return null;
  colorCtx=colorCtx||document.createElement('canvas').getContext('2d');
  colorCtx.fillStyle='#000'; colorCtx.fillStyle=css; let hex=colorCtx.fillStyle;
  if(!hex.startsWith('#')){ const n=hex.match(/[\d.]+/g); if(!n) return null; hex='#'+n.slice(0,3).map(x=>pad2((+x).toString(16))).join(''); }
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const mx=Math.max(r,g,b)/255, mn=Math.min(r,g,b)/255, l=(mx+mn)/2, d=mx-mn; let h=0, s=0;
  if(d){ s=d/(1-Math.abs(2*l-1)); const R=r/255,G=g/255,B=b/255; h=mx===R?((G-B)/d)%6:mx===G?(B-R)/d+2:(R-G)/d+4; h=Math.round(h*60); if(h<0) h+=360; }
  const lum=[r,g,b].map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); const L=.2126*lum[0]+.7152*lum[1]+.0722*lum[2];
  return {hex:hex.toUpperCase(), rgb:`rgb(${r}, ${g}, ${b})`, hsl:`hsl(${h}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`, name, dark:L<.4, h, s:Math.round(s*100), l:Math.round(l*100)};
}

// split / expense
function parseSplit(text){
  const t=text.toLowerCase();
  const m=t.match(/split\s+(?:the\s+)?(?:bill\s+(?:of\s+)?)?([$€£₹¥]?\s*[\d,]*\.?\d+\s*k?)\s*(?:dollars|bucks|rs)?\s*(?:between|among|amongst|by|with|into|over|for|across)?\s*(\d+)/) ||
          t.match(/([$€£₹¥]?\s*[\d,]*\.?\d+\s*k?)\s*(?:split|divided)\s*(?:between|among|by|into)?\s*(\d+)/);
  if(!m) return null;
  const a=parseAmount(m[1]); const n=+m[2]; if(!a||!(n>0)||n>500) return null;
  const tip=t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:tip|gratuity)|(?:tip|gratuity)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/); const tp=tip?parseFloat(tip[1]||tip[2]):0;
  return {total:a.v, n, tip:tp, cur:a.cur||curOf(text)};
}
const EXP_CATS=[[/uber|lyft|taxi|cab|ola|ride|parking|toll/,'🚕','Transport'],[/coffee|starbucks|latte|cafe|\btea\b/,'☕','Coffee'],[/grocer|walmart|kroger|costco|aldi|trader|whole foods|target/,'🛒','Groceries'],
  [/lunch|dinner|breakfast|brunch|restaurant|food|pizza|burger|sushi|takeout|doordash|ubereats|chipotle/,'🍽','Food'],[/rent|mortgage|housing/,'🏠','Housing'],[/\bgas\b|fuel|petrol|shell/,'⛽','Fuel'],
  [/flight|hotel|airbnb|trip|travel|train/,'✈','Travel'],[/amazon|shopping|clothes|shoes|store/,'🛍','Shopping'],[/netflix|spotify|subscription|hulu|disney|icloud|chatgpt|claude/,'🔁','Subscriptions'],
  [/gym|doctor|pharmacy|medicine|health/,'💊','Health'],[/movie|concert|ticket|game|\bbar\b|drinks|beer/,'🎟','Fun'],[/electric|water|internet|phone|bill|utility/,'💡','Bills']];
function parseExpense(text){
  const t=text.trim();
  const m=t.match(/^(?:i\s+)?(?:spent|paid|pay|spend|cost)\s+([$€£₹¥]?\s*[\d,]*\.?\d+\s*k?)\s*(?:dollars|bucks|rs|rupees|usd|inr)?\s*(?:on|for|at|to)?\s*(.*)$/i) ||
          t.match(/^([$€£₹¥]\s*[\d,]*\.?\d+\s*k?)\s+(?:on|for|at)?\s*(.+)$/i) ||
          t.match(/^(.+?)\s+(?:cost|was)\s+([$€£₹¥]\s*[\d,]*\.?\d+)$/i);
  if(!m) return null;
  let amt, what;
  if(/^[$€£₹¥]?\s*[\d.,]/.test(m[1])){ amt=parseAmount(m[1]); what=m[2]; } else { amt=parseAmount(m[2]); what=m[1]; }
  if(!amt||!(amt.v>0)) return null;
  what=(what||'').trim();
  if(/^(min|mins|minutes?|hours?|hrs?|h|secs?|seconds?|days?|weeks?|months?|years?|miles?|km|kg|lbs?|x|times|people|ppl|percent|%)\b/i.test(what)) return null; const low=(what+' '+t).toLowerCase(); const cat=EXP_CATS.find(([re])=>re.test(low))||[null,'💸','Other'];
  return {v:amt.v, cur:amt.cur||curOf(t), what:cap(what)||'Expense', icon:cat[1], cat:cat[2]};
}

// random
function parseRandom(text){
  const t=text.toLowerCase().trim().replace(/[?!.]$/,'');
  let m=t.match(/^(?:roll\s+)?(?:a\s+)?(\d*)\s*d(\d+)\s*(?:([+-])\s*(\d+))?$/);
  if(m && (t.startsWith('roll')||/^\d*d\d+/.test(t))) return {kind:'dice', n:clamp(+m[1]||1,1,12), sides:clamp(+m[2]||6,2,1000), mod:m[3]?(m[3]==='-'?-1:1)*+m[4]:0};
  m=t.match(/^roll\s+(?:a\s+|the\s+)?(\d*)\s*(?:dice|die)$/); if(m) return {kind:'dice', n:clamp(+m[1]||1,1,12), sides:6, mod:0};
  if(/^(flip\s+a\s+coin|coin\s*(flip|toss)|toss\s+a\s+coin|heads\s+or\s+tails)$/.test(t)) return {kind:'coin'};
  if(/^(yes\s+or\s+no|magic 8 ball|8 ?ball)$/.test(t)) return {kind:'yesno'};
  m=t.match(/^(?:random\s+number|pick\s+a\s+number|number)\s*(?:between|from)?\s*(-?\d+)\s*(?:and|-|to)\s*(-?\d+)$/); if(m) return {kind:'num', a:Math.min(+m[1],+m[2]), b:Math.max(+m[1],+m[2])};
  m=text.trim().replace(/[?!.]$/,'').match(/^(?:pick|choose|random|decide)(?:\s+one)?(?:\s+(?:from|between|of))?\s*:?\s+(.+)$/i);
  if(m){ const opts=m[1].split(/\s*,\s*(?:or\s+)?|\s+or\s+/i).map(s=>s.trim()).filter(Boolean); if(opts.length>=2) return {kind:'pick', opts}; }
  return null;
}
function rollRandom(p){
  const r=n=>1+Math.floor(Math.random()*n);
  if(p.kind==='dice'){ const dice=Array.from({length:p.n},()=>r(p.sides)); return {dice, total:dice.reduce((a,b)=>a+b,0)+p.mod}; }
  if(p.kind==='coin') return {v:Math.random()<.5?'Heads':'Tails'};
  if(p.kind==='yesno') return {v:['Yes','No','Definitely','Ask again later','Probably not','Absolutely'][Math.floor(Math.random()*6)]};
  if(p.kind==='num') return {v:p.a+Math.floor(Math.random()*(p.b-p.a+1))};
  if(p.kind==='pick') return {v:p.opts[Math.floor(Math.random()*p.opts.length)]};
}

// poll
function parsePoll(text){
  let t=text.trim(); const forced=/^poll:?\s*/i.test(t); t=t.replace(/^poll:?\s*/i,'');
  if(!forced && !t.endsWith('?')) return null; t=t.replace(/\?+$/,'');
  let title='', body=t; const colon=t.match(/^(.{2,60}?):\s*(.+)$/); if(colon){ title=colon[1]; body=colon[2]; }
  body=body.replace(/^(should we|should i|do we want|do you want|want|which|what's better|whats better|which one|let's do|lets do|thoughts on)\s+/i,m=>{ title=title||m.trim(); return ''; });
  let opts=body.split(/\s*,\s*(?:or\s+)?|\s+or\s+|\s+vs\.?\s+/i).map(s=>s.trim()).filter(Boolean);
  if(opts.length<2 || opts.length>8) return null;
  let ctx=''; const last=opts[opts.length-1].match(/^(.+?)\s+((?:for|on|at|this|tonight|today|tomorrow|next)\b.*)$/i);
  if(last){ opts[opts.length-1]=last[1]; ctx=last[2]; }
  if(opts.some(o=>o.split(/\s+/).length>6)) return null;
  title=[title,ctx].filter(Boolean).join(' ');
  return {opts:opts.map(cap), title:cap(title), forced};
}

// contact
function parseContact(text){
  const t=text.trim(); const email=(t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)||[])[0]||'';
  const phoneM=t.replace(email,' ').match(/(\+?\(?\d[\d\s().-]{6,}\d)/); let phone=phoneM&&phoneM[1].replace(/\D/g,'').length>=7?phoneM[1].trim():'';
  if(/^\d?\s*(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$|^\d{4}-\d{2}-\d{2}/.test(phone)) phone='';
  if(!email && !phone) return null;
  const name=t.replace(email,' ').replace(phone,' ').replace(/\b(phone|email|mobile|cell|tel|e-mail|contact)\b:?/gi,' ').replace(/[,;|·•]/g,' ').replace(/\s+/g,' ').trim();
  if(name.split(/\s+/).length>5 || /https?:/.test(t) || /\d/.test(name)) return null;
  return {name:name.split(' ').map(cap).join(' '), email, phone};
}

// event / reminder
const EVENT_WORDS=/\b(lunch|dinner|breakfast|brunch|meeting|meet\s+(?:with|up)|sync|standup|stand-up|1:1|one on one|call with|interview|appointment|appt|party|game|concert|show|class|lecture|flight|trip|coffee with|coffee chat|drinks|date night|wedding|birthday|reservation|dentist|doctor|haircut|webinar|demo|review with|offsite|retreat|conference|hotel|check-?in|vacation|movie|match|practice|rehearsal|recital|ceremony|graduation|shower|hangout|happy hour|catch up|catch-up|visit)\b/i;
const TRIP_WORDS=/\b(flight|fly|trip|hotel|train|vacation|travel|airbnb|road trip|cruise)\b/i;
function parseEvent(c){ const w=whenOf(c); const title=stripHits(c.text,w.hits)||c.text; return {date:w.date, time:w.time, title:cap(title), trip:TRIP_WORDS.test(c.text)}; }
function parseReminder(c){
  const raw=c.text.trim(); const body=raw.replace(/^(?:remind me\s+(?:to\s+)?|reminder:?\s*|don'?t forget\s+(?:to\s+)?|remember\s+to\s+)/i,'');
  const urgent=/\b(urgent|asap|important|critical|high priority)\b|!{2,}/i.test(raw);
  const w=parseWhen(body, c.updated||c.created); const title=stripHits(body,w.hits,/\b(urgent|asap|important|critical|high priority)\b|!{2,}/gi);
  return {title:cap(title)||cap(body), date:w.date, time:w.time, urgent};
}

// =====================================================================
// RULES ENGINE — ranks every shape for a piece of text
// =====================================================================
function todoScore(raw){
  const t=raw.trim(); const lines=t.split('\n').map(l=>l.trim()).filter(Boolean); const first=lines[0]||'', low=first.toLowerCase();
  if(lines.some(l=>/^\[( |x)\]/i.test(l))) return .98;
  if(/^(to ?dos?|tasks?|action items?|checklist|next steps?|groceries|shopping list|packing list)\b/i.test(low)) return .9;
  const bullets = lines.filter(l=>/^([-*•]|\d+[.)])\s+/.test(l)).length;
  if(bullets>=2 && bullets>=lines.length-1){
    const acts = lines.filter(l=>VERBS.has(l.toLowerCase().replace(/^([-*•]|\d+[.)])\s+/,'').split(/\s+/)[0])).length;
    return (acts>=1 || lines.every(l=>l.length<50)) ? .85 : .3;
  }
  if(lines.length===1 && /^(buy|get|pack|bring|grab|pick up|order)\s+[^,]+(,\s*[^,]+)+$/i.test(first)) return .88;
  const stripped = low.replace(/^(i need to|need to|i have to|have to|remember to|must|todo:?|to do:?)\s+/,'');
  if(stripped!==low && lines.length<=3) return .8;
  if(/(^|\s)@\d{4}-\d{2}-\d{2}\b/.test(t) && lines.length<=3) return .7;
  const verbLines = lines.filter(l=>VERBS.has(l.toLowerCase().replace(/^([-*•]|\d+[.)])\s+/,'').split(/\s+/)[0])).length;
  if(lines.length===1 && verbLines===1 && first.length<100) return .72;
  if(lines.length>=2 && verbLines>=Math.ceil(lines.length/2) && lines.every(l=>l.length<80)) return .75;
  return 0;
}
function ruleRank(raw){
  const t=raw.trim(); if(!t) return [{type:'note',score:1}];
  const lines=t.split('\n').map(l=>l.trim()).filter(Boolean), single=lines.length===1, first=lines[0]||'', low=t.toLowerCase(), words=low.split(/\s+/).length;
  const S={note:.2}; const set=(k,v)=>{ if(v>(S[k]||0)) S[k]=v; };
  if(/^```/.test(t)) set('note',.95);
  if(/^https?:\/\/\S+$/i.test(t)) set('link',.97);
  else if(lines.length<=2 && /^https?:\/\/\S+/i.test(first)) set('link',.85);
  else if(/https?:\/\/\S+/.test(t) && /\b(check later|read later|watch later|later|bookmark|save)\b/i.test(t) && words<12) set('link',.85);
  set('todo', todoScore(t));
  if(single && /^#{1,3}\s+\S/.test(first)) set('heading',.9);
  if(single && first.length<=40 && first===first.toUpperCase() && /[A-Z]/.test(first) && words<=6 && !/\d/.test(first)) set('heading',.6);
  if(/^(>|"|“)/.test(first)) set('quote',.75);
  if(lines.length<=3 && /\?\s*$/.test(t)) set('question',.55);
  if(single && /^(why|how|what|who|where|when|which|is|are|should|could|would|can|do|does|did|will)\b/i.test(first) && /\?$/.test(first)) set('question',.62);
  if(!single && !/^#|^\[/.test(t)) set('note',.45);
  if(lines.length<=2 && t.length<160){
    if(/^(remind me|reminder:?|don'?t forget)\b/i.test(t)) set('reminder',.93);
    const tm=parseTimer(t); if(tm) set('timer', tm.words<=6&&tm.cue?.92:tm.words<=4?.62:.3);
    if(parseHabit(t) && words<=8) set('habit',.86);
    if(parseGoal(t)) set('goal',.87);
    if(parseColor(t)) set('color', /^#|rgb|hsl/i.test(t)?.97:.82);
    if(parseSplit(t)) set('split',.96);
    if(parseExpense(t)) set('expense',.88);
    if(parseConvert(t)) set('convert',.96);
    if(parseCalc(t)) set('calc',.95);
    if(parseCountdown(t,Date.now())) set('countdown',.92);
    if(parseTZ(t)) set('timezone',.95);
    if(parseRandom(t)) set('random',.95);
    const pl=parsePoll(t); if(pl) set('poll', pl.forced?.95:.8);
    const w=parseWhen(t); const hasW=!!(w.date||w.time), verbFirst=VERBS.has(low.split(/\s+/)[0]);
    const ct=parseContact(t); if(ct) set('contact', Math.min(verbFirst?.6:1, ct.email&&ct.phone?.92:ct.phone&&ct.name?.85:ct.name?.7:.55));
    if(hasW && EVENT_WORDS.test(t)) set('event',.88);
    else if(hasW && TRIP_WORDS.test(t)) set('event',.86);
    else if(w.time && words<=10 && !S.timer && !S.timezone) set('event',verbFirst?.6:.7);
    else if(w.date && words<=8 && !verbFirst && !S.countdown && !S.reminder) set('event',.55);
    else if(EVENT_WORDS.test(t) && /\bwith\s+[a-z]/i.test(t) && words<=8) set('event',.45);
    if(S.event && verbFirst && !EVENT_WORDS.test(t)) S.event=Math.min(S.event,.6);
    if(S.timer && S.event>=.85 && w.date) S.timer=Math.min(S.timer,.6);
    if(S.reminder) S.todo=Math.min(S.todo||0,.6);
    if(S.poll) S.question=Math.min(S.question||0,.5);
    if(S.event>=.85 && S.todo) S.todo=Math.min(S.todo,.7);
  }
  return Object.entries(S).filter(([type])=>isOn(type)).map(([type,score])=>({type,score})).sort((a,b)=>b.score-a.score);
}
function enabledTypes(){ const off=new Set((db&&db.settings.disabled)||[]); return TYPES.filter(t=>t==='note'||!off.has(t)); }
const isOn = t => t==='note' || !((db&&db.settings.disabled)||[]).includes(t);

function transform(type,text){
  if(type==='todo'){
    const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);
    const one=lines.length===1 && lines[0].match(/^(buy|get|pack|bring|grab|pick up|order)\s+(.+)$/i);
    if(one && /,/.test(one[2]) && !/^\[/.test(lines[0])){ const items=one[2].split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).map(s=>s.trim()).filter(Boolean);
      if(items.length>=2 && items.every(i=>i.split(/\s+/).length<=4)) return `${cap(one[1])}:\n`+items.map(i=>'[ ] '+i).join('\n'); }
    return lines.map((l,i)=>{
      if(/^\[( |x)\]/i.test(l)) return l;
      const b=l.replace(/^([-*•]|\d+[.)])\s+/,'');
      if(i===0 && lines.length>1 && (/:$/.test(b) || /^(to ?dos?|tasks?|groceries|shopping( list)?|checklist|packing list)$/i.test(b))) return b;
      return '[ ] ' + b.replace(/^(to ?do|task)\s*:\s*/i,'').replace(/^(i need to|need to|remember to)\s+/i,'');
    }).join('\n');
  }
  return text.split('\n').map(l=>l.replace(/^\s*\[( |x)\]\s?/i,'')).join('\n');
}

// =====================================================================
// SHAPE MODEL — a tiny on-device classifier (sprawl-model.js, trained by model/train.js) blended with the rules.
// The model only ever picks among shapes the parsers can actually render; code still computes every value.
// =====================================================================
let MODEL=null;
(function loadModel(){
  const M=window.SPRAWL_MODEL, F=window.SprawlFeatures; if(!M||!F||M.buckets!==F.BUCKETS) return;
  try{ const bin=atob(M.w), w=new Int8Array(bin.length); for(let i=0;i<bin.length;i++) w[i]=(bin.charCodeAt(i)<<24)>>24; MODEL={types:M.types, C:M.types.length, w, scale:M.scale, bias:M.bias}; }catch(e){ MODEL=null; }
})();
function modelProbs(text){
  if(!MODEL) return null;
  const x=window.SprawlFeatures.featurize(text), C=MODEL.C, z=MODEL.bias.slice(), k=MODEL.scale/Math.sqrt(x.length||1);
  for(const i of x){ const o=i*C; for(let c=0;c<C;c++) z[c]+=MODEL.w[o+c]*k; }
  const m=Math.max(...z); let sum=0; const e=z.map(v=>{ const t=Math.exp(v-m); sum+=t; return t; });
  return Object.fromEntries(MODEL.types.map((t,i)=>[t,e[i]/sum]));
}
// final ranking: parser-backed rules when they are certain, otherwise rules and model share the vote
function rank(raw){
  const rules=ruleRank(raw); if(!raw.trim() || rules[0].score>=.94) return rules;
  const p=modelProbs(raw); if(!p) return rules;
  const feasible=new Set(rules.map(r=>r.type)); BASIC.forEach(t=>{ if(isOn(t)) feasible.add(t); });
  let sum=0; feasible.forEach(t=>{ sum+=p[t]||0; });
  const rs=Object.fromEntries(rules.map(r=>[r.type,r.score]));
  return [...feasible].map(t=>({type:t, score:Math.min(.99, .5*(rs[t]??(t==='note'?.2:.12)) + .5*((p[t]||0)/(sum||1)))})).sort((a,b)=>b.score-a.score);
}
const classify = raw => rank(raw)[0].type;
function showEngine(){ engineEl.className='live'; engineEl.textContent=MODEL?'model + rules':'rules'; }
function classifyCard(c, sp=S()){
  if(!c.text.trim() || c.manual) return;
  const prev=c.type; applyType(c,classify(c.text),false);
  if(sp===S()){ refreshCard(c.id); if(prev!==c.type) morph(c.id); } save();
}
function applyType(c,type,manual){
  const prev=c.type; c.type=type; c.text=transform(type,c.text);
  if(manual){ c.manual=true; c.auto=false; } else { c.auto=true; }
  if(SMART.has(type) && (c.w||220)<240) c.w=240;
  if(type!==prev && type==='random') c.data.r=null;
}
function morph(id){ const el=cEl(id); if(!el) return; el.classList.remove('morph'); void el.offsetWidth; el.classList.add('morph'); }

// =====================================================================
// RENDERERS
// =====================================================================
function shortUrl(u){ return u.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'').slice(0,40) + (u.length>48?'…':''); }
function dueChip(isoStr){
  const dt=fromIso(isoStr); const diff=Math.round((dt-noon())/86400000);
  const lab = diff===0?'Today':diff===1?'Tomorrow':diff===-1?'Yesterday':(diff>1&&diff<7)?dt.toLocaleDateString(undefined,{weekday:'short'}):dt.toLocaleDateString(undefined,{month:'short',day:'numeric'});
  return `<span class="due ${diff<0?'over':diff===0?'today':''}" title="${isoStr}">⏰ ${lab}</span>`;
}
function fmt(s){
  let h = esc(s);
  h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g,(m,p,u)=>`${p}<a href="${u}" target="_blank" rel="noopener">${shortUrl(u)}</a>`);
  h = h.replace(/\[\[([^\]\n]{1,60})\]\]/g,'<span class="slink" data-space="$1">↗ $1</span>');
  h = h.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g,'$1<i>$2</i>')
       .replace(/~~(.+?)~~/g,'<s>$1</s>').replace(/`([^`]+)`/g,'<code>$1</code>');
  h = h.replace(/(^|\s)#([\w-]{1,40})/g,'$1<span class="tag" data-tag="$2">#$2</span>');
  h = h.replace(/(^|\s)@(\d{4}-\d{2}-\d{2})\b/g,(m,p,d)=>p+dueChip(d));
  return h;
}
function hasTag(c,t){ return !!c && new RegExp('(^|\\s)#'+t.replace(/[-]/g,'\\-')+'(\\b|$)','i').test(c.text); }
function linesHTML(lines){
  let out='', code=null;
  for(const l of lines){
    if(/^\s*```/.test(l)){ if(code===null){ code=[]; continue; } out+=`<pre><code>${esc(code.join('\n'))}</code></pre>`; code=null; continue; }
    if(code!==null){ code.push(l); continue; }
    if(!l.trim()){ out+='<div class="gap"></div>'; continue; }
    const m=l.match(/^\s*[-*•]\s+(.*)$/); out += m ? `<div class="bul">${fmt(m[1])}</div>` : `<div>${fmt(l)}</div>`;
  }
  if(code!==null) out+=`<pre><code>${esc(code.join('\n'))}</code></pre>`;
  return out;
}
function ytId(u){ const m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/); return m&&m[1]; }
function spId(u){ const m=u.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show|artist)\/(\w+)/); return m&&`${m[1]}/${m[2]}`; }
const W = (act,label,cls='') => `<button class="wbtn ${cls}" data-w="${esc(act)}">${label}</button>`;
const fallback = c => linesHTML(c.text.split('\n'));

const SMART_RENDER = {
  event(c){
    const e=parseEvent(c);
    if(!e.date && !e.time) return `<div class="wt">${e.trip?'✈ ':'📅 '}${fmt(e.title)}</div><div class="sub">No date yet — add one like “fri 8pm”</div>`;
    const d=e.date?fromIso(e.date):noon();
    const when=[e.time?fmtTime(e.time.h,e.time.m):'All day', e.date?relDays(e.date):''].filter(Boolean).join(' · ');
    return `<div class="ev"><div class="ev-date"><span class="ev-m">${d.toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</span><span class="ev-d">${d.getDate()}</span><span class="ev-w">${d.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</span></div>
      <div class="ev-body"><div class="wt">${e.trip?'✈ ':''}${fmt(e.title)}</div><div class="sub">${when}</div>
      <div class="acts">${W('ics','＋ Calendar')}<a class="wbtn" target="_blank" rel="noopener" href="${gcalUrl(e)}">Google</a></div></div></div>`;
  },
  reminder(c){
    const r=parseReminder(c), done=!!c.data.done;
    return `<div class="rm ${done?'done':''}"><span class="cb ${done?'x':''}" data-w="rdone"></span><div style="flex:1;min-width:0"><div class="rt wt">🔔 ${fmt(r.title)} ${r.urgent?'<span class="urg">URGENT</span>':''}</div>
      <div class="sub">${r.date?dueChip(r.date):'No date'}${r.time?' · '+fmtTime(r.time.h,r.time.m):''}</div></div></div>`;
  },
  timer(c){
    const p=parseTimer(c.text); if(!p) return fallback(c);
    const d=c.data; if(d.dur!==p.secs){ d.dur=p.secs; d.left=p.secs; d.endAt=null; d.fin=false; }
    const left=d.endAt?(d.endAt-Date.now())/1000:d.left, run=!!d.endAt, pct=clamp(100*(1-left/d.dur),0,100);
    return `<div class="tm ${run?'run':''} ${d.fin?'fin':''}"><div class="sub">⏱ ${esc(p.label)}</div><div class="big" data-tm>${d.fin?'Done ✓':fmtClock(left)}</div>
      <div class="bar"><i data-tmbar style="width:${d.fin?100:pct}%"></i></div>
      <div class="acts">${run?W('tpause','❚❚ Pause'):W('tstart',d.left<d.dur&&!d.fin?'▶ Resume':'▶ Start','pri')}${W('treset','↺ Reset')}</div></div>`;
  },
  habit(c){
    const p=parseHabit(c.text); if(!p) return fallback(c);
    const log=c.data.log=c.data.log||{}; const mon=addDays(-((new Date().getDay()+6)%7)); const today=iso(noon());
    let cnt=0; const days=[...Array(7)].map((_,i)=>{ const k=iso(addDays(i,mon)); if(log[k]) cnt++; return {k, l:'MTWTFSS'[i], on:!!log[k], today:k===today, fut:k>today}; });
    let streak=0; for(let w=1;w<52;w++){ let n=0; for(let i=0;i<7;i++) if(log[iso(addDays(i-7*w,mon))]) n++; if(n>=p.per) streak++; else break; } if(cnt>=p.per) streak++;
    return `<div class="wt">🔁 ${esc(p.name)}</div><div class="sub">${cnt}/${p.per} this week${streak?` · 🔥 ${streak} wk streak`:''}${cnt>=p.per?' · ✓ done':''}</div>
      <div class="hd">${days.map(d=>`<span class="${d.on?'on':''} ${d.today?'today':''} ${d.fut?'fut':''}" data-w="hday:${d.k}" title="${d.k}">${d.l}</span>`).join('')}</div>`;
  },
  goal(c){
    const p=parseGoal(c.text); if(!p) return fallback(c);
    const done=c.data.done!=null?c.data.done:p.done, pct=clamp(done/p.target*100,0,100), fr=periodFrac(p.period);
    let pace=''; if(fr!=null && done<p.target){ const exp=p.target*fr; pace = done>=exp ? '<span style="color:var(--ok)">on track</span>' : `behind pace by ${fmtNum(exp-done,1)}`; }
    return `<div class="wt">🎯 ${fmt(p.title)}</div><div class="bar ${pct>=100?'ok':''}"><i style="width:${pct}%"></i></div>
      <div class="sub">${fmtNum(done,1)} / ${fmtNum(p.target,1)}${p.unit?' '+esc(p.unit):''} · ${Math.round(pct)}%${pct>=100?' 🎉':''}${pace?' · '+pace:''}</div>
      <div class="acts">${W('gdec','−')}${W('ginc','+1','pri')}</div>`;
  },
  color(c){
    const p=parseColor(c.text.trim()); if(!p) return fallback(c);
    const tints=[90,75,60,45,30,15].map(l=>`hsl(${p.h},${p.s}%,${l}%)`);
    return `<div class="swatch" style="background:${p.hex};color:${p.dark?'#fff':'#111'}">${esc(p.name||p.hex)}</div>
      <div class="cv" data-w="copy:${p.hex}"><span>HEX</span><span>${p.hex}</span></div><div class="cv" data-w="copy:${p.rgb}"><span>RGB</span><span>${p.rgb.slice(4,-1)}</span></div><div class="cv" data-w="copy:${p.hsl}"><span>HSL</span><span>${p.hsl.slice(4,-1)}</span></div>
      <div class="tints">${tints.map(t=>`<i style="background:${t}" data-w="copy:${t}" title="${t}"></i>`).join('')}</div>`;
  },
  calc(c){ const p=parseCalc(c.text); if(!p) return fallback(c);
    return `<div class="sub">🧮 ${esc(p.expr)} =</div><div class="big">${(p.cur||'')+fmtNum(p.v,6)}</div><div class="acts">${W('copy:'+p.v,'Copy')}</div>`; },
  convert(c){ const p=parseConvert(c.text); if(!p) return fallback(c);
    return `<div class="sub">⇄ ${fmtNum(p.v,4)} ${esc(p.from)} =</div><div class="big">${fmtNum(p.out,4)} <span style="font-size:16px">${esc(p.to)}</span></div><div class="acts">${W('copy:'+Math.round(p.out*1e4)/1e4,'Copy')}</div>`; },
  split(c){ const p=parseSplit(c.text); if(!p) return fallback(c); const tot=p.total*(1+p.tip/100), each=tot/p.n;
    return `<div class="sub">➗ ${money(p.total,p.cur)}${p.tip?` + ${p.tip}% tip = ${money(tot,p.cur)}`:''} ÷ ${p.n}</div><div class="big">${money(each,p.cur)} <span class="sub" style="font-size:14px;font-weight:500">each</span></div>
      <div class="acts">${W('copy:'+Math.round(each*100)/100,'Copy amount')}</div>`; },
  expense(c){ const p=parseExpense(c.text); if(!p) return fallback(c);
    const m0=new Date(); m0.setDate(1); m0.setHours(0,0,0,0);
    const mine=S().cards.filter(x=>x.type==='expense' && (x.created||0)>=+m0).map(x=>parseExpense(x.text)).filter(Boolean);
    const tot=mine.reduce((a,b)=>a+b.v,0);
    return `<div style="display:flex;gap:10px;align-items:center"><span style="font-size:24px">${p.icon}</span><div style="flex:1;min-width:0"><div class="mid">${money(p.v,p.cur)}</div><div class="sub">${esc(p.what)} · ${p.cat}</div></div></div>
      ${mine.length>1?`<div class="sub" style="margin-top:6px;border-top:1px solid rgba(127,127,127,.15);padding-top:5px">This space, this month: <b>${money(tot,p.cur)}</b> across ${mine.length}</div>`:''}`; },
  countdown(c){ const p=parseCountdown(c.text,c.updated||c.created); if(!p) return fallback(c);
    const d=fromIso(p.date), days=Math.round((d-noon())/86400000);
    const big = days>1?`${days} <span style="font-size:15px">days</span>`:days===1?'Tomorrow':days===0?'Today! 🎉':`${-days} <span style="font-size:15px">days ago</span>`;
    return `<div class="sub">⏳ until ${esc(p.label)}</div><div class="big">${big}</div><div class="sub">${d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}${days>14?` · ${fmtNum(days/7,1)} weeks`:''}</div>`; },
  timezone(c){ const p=parseTZ(c.text); if(!p) return fallback(c);
    const fmtZ=(tz,date)=>({t:date.toLocaleTimeString(undefined,{timeZone:tz,hour:'numeric',minute:'2-digit'}), d:date.toLocaleDateString(undefined,{timeZone:tz,weekday:'short'})});
    if(p.mode==='conv'){
      const now=new Date(), part=o=>+new Intl.DateTimeFormat('en-US',{timeZone:p.from,...o}).format(now);
      const guess=Date.UTC(part({year:'numeric'}),part({month:'numeric'})-1,part({day:'numeric'}),p.time.h,p.time.m); const at=new Date(guess-tzOffset(p.from,new Date(guess))*60000);
      const a=fmtZ(p.from,at), b=fmtZ(p.to,at);
      return `<div class="sub">🌐 Time zone</div><div class="tzr"><span class="sub">${esc(p.fromLab.toUpperCase())}</span><span class="mid">${a.t} <span class="sub">${a.d}</span></span></div>
        <div class="tzr"><span class="sub">${esc(p.toLab.toUpperCase())}</span><span class="mid" style="color:var(--accent)">${b.t} <span class="sub">${b.d}</span></span></div>`;
    }
    const now=new Date(), rows=[{lab:'You',tz:localTZ},...p.zones.filter(z=>z.tz!==localTZ)];
    return `<div class="sub">🌐 World clock</div>`+rows.map(z=>{ const f=fmtZ(z.tz,now), off=(tzOffset(z.tz,now)-tzOffset(localTZ,now))/60;
      return `<div class="tzr"><span class="sub">${esc(cap(z.lab))}${z.tz!==localTZ?` · ${off>=0?'+':''}${fmtNum(off,1)}h`:''}</span><span class="mid">${f.t} <span class="sub">${f.d}</span></span></div>`; }).join(''); },
  random(c){ const p=parseRandom(c.text); if(!p) return fallback(c);
    if(!c.data.r || c.data.rk!==c.text){ c.data.r=rollRandom(p); c.data.rk=c.text; }
    const r=c.data.r;
    const body = p.kind==='dice' ? `<div class="dice">${r.dice.map(v=>`<span class="die">${v}</span>`).join('')}</div><div class="sub">${p.n}d${p.sides}${p.mod?(p.mod>0?'+':'')+p.mod:''} = <b>${r.total}</b></div>`
      : `<div class="big">${p.kind==='coin'?'🪙 ':''}${esc(String(r.v))}</div>${p.kind==='pick'?`<div class="sub">from ${p.opts.map(esc).join(' · ')}</div>`:''}`;
    return `<div class="sub">🎲 ${esc(c.text.trim())}</div>${body}<div class="acts">${W('reroll','🎲 Again','pri')}</div>`; },
  poll(c){ const p=parsePoll(c.text); if(!p) return fallback(c);
    const v=c.data.votes=c.data.votes||{}; const tot=p.opts.reduce((a,o)=>a+(v[o]||0),0), max=Math.max(0,...p.opts.map(o=>v[o]||0));
    return `<div class="wt">📊 ${esc(p.title||'Poll')}</div>`+p.opts.map((o,i)=>{ const n=v[o]||0, pc=tot?n/tot*100:0;
      return `<div class="po ${n&&n===max?'lead':''}" data-w="vote:${i}"><i style="width:${pc}%"></i><span>${esc(o)}</span><b>${n}${tot?` · ${Math.round(pc)}%`:''}</b></div>`; }).join('')+
      `<div class="sub">${tot} vote${tot===1?'':'s'} · tap to vote${tot?` · <span data-w="preset" style="text-decoration:underline;cursor:pointer">reset</span>`:''}</div>`; },
  contact(c){ const p=parseContact(c.text); if(!p) return fallback(c); const ini=(p.name||p.email||'?').split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    return `<div class="ct"><div class="av">${esc(ini)}</div><div style="min-width:0"><div class="wt">${esc(p.name||'Contact')}</div>
      ${p.phone?`<div class="sub">📞 <a href="tel:${esc(p.phone.replace(/[^\d+]/g,''))}">${esc(p.phone)}</a></div>`:''}${p.email?`<div class="sub">✉ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>`:''}</div></div>
      <div class="acts">${W('vcf','Save contact')}${p.email?W('copy:'+p.email,'Copy email'):''}</div>`; },
};
function contentHTML(c){
  let out = c.img ? `<img src="${esc(imgSrc(c.img))}" alt="" onerror="this.outerHTML='<div class=&quot;sub&quot; style=&quot;padding:18px 6px;text-align:center&quot;>🖼 Image couldn’t load — right-click → Replace image</div>'">` : '';
  if(!c.text.trim()) return out;
  if(SMART_RENDER[c.type]){ try{ return out+SMART_RENDER[c.type](c); }catch(e){ console.warn(e); return out+fallback(c); } }
  const lines = c.text.split('\n');
  if(c.type==='todo'){
    lines.forEach((l,i)=>{
      const m = l.match(/^\s*\[( |x)\]\s?(.*)$/i);
      if(m) out += `<div class="todo-item ${m[1].toLowerCase()==='x'?'done':''}"><span class="cb" data-line="${i}"></span><span class="txt">${fmt(m[2])}</span></div>`;
      else if(l.trim()) out += `<div class="todo-title">${fmt(l)}</div>`;
    });
    return out;
  }
  if(c.type==='link'){
    const url = (c.text.match(/https?:\/\/\S+/)||[])[0];
    const rest = url ? c.text.replace(url,'').trim() : c.text;
    if(url){
      const yt=ytId(url), sp=spId(url);
      let host=url, path=''; try{ const u=new URL(url); host=u.hostname.replace(/^www\./,''); path=(u.pathname+u.search).replace(/^\/$/,''); }catch(e){}
      const lc=`<a class="linkcard" href="${esc(url)}" target="_blank" rel="noopener"><span class="host">${esc(host)}</span>${path&&!yt?`<span class="path">${esc(path)}</span>`:''}</a>`;
      if(/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url)) out += `<img src="${esc(url)}" alt="" loading="lazy">`;
      else if(yt) out += `<div class="yt" data-yt="${yt}"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy"><span class="play">▶</span></div>${lc}`;
      else if(sp) out += `<button class="sp-load" data-sp="${sp}">▶ Load Spotify player</button>${lc}`;
      else out += lc;
    }
    return out + (rest ? linesHTML(rest.split('\n')) : '');
  }
  let ls = lines;
  if(c.type==='heading') ls = [lines.join(' ').replace(/^#+\s*/,'')];
  if(c.type==='quote') ls = lines.map(l=>l.replace(/^>\s?/,''));
  return out + linesHTML(ls);
}
function pillText(c){
  if(c.img && !c.text.trim()) return (c.locked?'🔒 ':'')+'🖼 image';
  let p = `${c.locked?'🔒 ':''}${c.auto?'✨ ':''}${TI(c.type)} ${TYPE_META[c.type].l.toLowerCase()}`;
  if(c.type==='todo'){ const all=c.text.match(/^\s*\[( |x)\]/gim)||[]; const done=all.filter(x=>/x/i.test(x)).length; if(all.length) p+=` ${done}/${all.length}`; }
  return p;
}
function rotFor(id){ let h=0; for(const ch of id) h=(h*31+ch.charCodeAt(0))|0; return ((Math.abs(h)%31)/10-1.5).toFixed(1)+'deg'; }

// calendar helpers
function evStamp(e){ const d=fromIso(e.date||iso(noon())); const p=pad2;
  if(!e.time){ const e2=new Date(d); e2.setDate(d.getDate()+1); const f=x=>`${x.getFullYear()}${p(x.getMonth()+1)}${p(x.getDate())}`; return {allday:true,s:f(d),e:f(e2)}; }
  d.setHours(e.time.h,e.time.m,0,0); const end=new Date(d.getTime()+3600000); const f=x=>`${x.getFullYear()}${p(x.getMonth()+1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`;
  return {allday:false,s:f(d),e:f(end)}; }
function gcalUrl(e){ const s=evStamp(e); return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${s.s}/${s.e}&ctz=${encodeURIComponent(localTZ)}`; }
function icsFor(e){ const s=evStamp(e); const k=s.allday?';VALUE=DATE':'';
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sprawl//EN','BEGIN:VEVENT',`UID:${uid()}@sprawl`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}Z`,`DTSTART${k}:${s.s}`,`DTEND${k}:${s.e}`,`SUMMARY:${e.title.replace(/[,;]/g,'\\$&')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n'); }

// =====================================================================
// RENDER
// =====================================================================
function cardNode(c){
  const el = document.createElement('div');
  el.className = `card t-${c.type}` + (SMART.has(c.type)?' smart':'') + (c.color?` c-${c.color}`:'') + (c.frame?` f-${c.frame}`:'') + (c.img?' has-img':'') + (c.locked?' locked':'') +
    (sel.has(c.id)?' selected':'') + (editingId===c.id?' editing':'') +
    (tagFilter && !hasTag(c,tagFilter)?' dim':'');
  el.dataset.id = c.id;
  el.style.left = c.x+'px'; el.style.top = c.y+'px'; el.style.width = (c.w||220)+'px';
  if(c.h) el.style.minHeight = c.h+'px';
  if(c.h && c.img && !c.text.trim()) el.style.setProperty('--imgh', (c.h-12)+'px');
  if(c.frame==='sticky') el.style.setProperty('--rot', rotFor(c.id));
  el.innerHTML = `<div class="pill">${pillText(c)}</div>`;
  if(editingId===c.id){
    if(c.img) el.insertAdjacentHTML('beforeend',`<img src="${esc(imgSrc(c.img))}" alt="">`);
    const ta = document.createElement('textarea');
    ta.value = c.text; ta.rows = 1; ta.spellcheck = true;
    ta.placeholder = c.img ? 'Caption…' : 'Type anything… or / for shapes';
    ta.addEventListener('input', ()=>{ c.text = ta.value; autosize(ta); onLiveInput(c); queueLines(); });
    ta.addEventListener('keydown', onEditKey);
    ta.addEventListener('paste', e=>{ const f=[...(e.clipboardData||{}).files||[]]; if(f.some(x=>x.type.startsWith('image/'))){ e.preventDefault(); const cc=find(editingId); addImages(f, cc.x+cc.w+30, cc.y); } });
    el.appendChild(ta);
    el.insertAdjacentHTML('beforeend','<div class="live"></div>');
  } else {
    const ct = document.createElement('div'); ct.className='content'; ct.innerHTML = contentHTML(c); el.appendChild(ct);
  }
  el.insertAdjacentHTML('beforeend','<div class="handle" title="Drag to connect"></div><div class="grip" title="Drag to resize · double-click to reset"></div>');
  return el;
}
function boxNode(b){
  const el = document.createElement('div');
  el.className='box s-'+(b.style||'soft'); el.dataset.box=b.id;
  el.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;--bc:var(--c-${b.color||'gray'});--bk:${INK[b.color]||'#9a937f'}`;
  el.innerHTML = `<div class="box-head">${b.emoji?`<span class="box-emo">${b.emoji}</span>`:''}<span class="box-name">${esc(b.name||'Box')}</span><span class="box-more" title="Box style & options">⋯</span></div><div class="box-grip" title="Drag to resize · double-click to reset"></div>`;
  return el;
}
function autosize(ta){ ta.style.height='auto'; ta.style.height=ta.scrollHeight+'px'; }
function render(){
  const s = S();
  boxesEl.replaceChildren(...s.boxes.map(boxNode));
  const ordered = [...s.cards.filter(c=>c.locked), ...s.cards.filter(c=>!c.locked)];
  cardsEl.replaceChildren(...ordered.map(cardNode));
  drawInk(); drawLines();
  hint.hidden = s.cards.length>0 || s.strokes.length>0 || s.boxes.length>0;
  $('#spaceName').textContent = (s.kind==='inbox'?'📥 ':'') + s.name;
  $('#selBtn').classList.toggle('on', selectMode);
  $('#drawBtn').classList.toggle('on', drawMode);
  renderSelbar(); applyBg(); queueMini();
  if(editingId){ const ta = cardsEl.querySelector('textarea'); if(ta){ autosize(ta); ta.focus({preventScroll:true}); ta.selectionStart = ta.selectionEnd = ta.value.length; renderLive(find(editingId)); } }
}
function refreshCard(id){ const c=find(id), old=cEl(id); if(!c||!old) return render(); if(editingId===id) return; old.replaceWith(cardNode(c)); queueLines(); }

function rectOf(id){ const c=find(id), el=cEl(id); if(!c||!el) return null; return {x:c.x, y:c.y, w:el.offsetWidth, h:el.offsetHeight}; }
function edge(r,tx,ty){
  const cx=r.x+r.w/2, cy=r.y+r.h/2, dx=tx-cx, dy=ty-cy;
  if(!dx && !dy) return {x:cx,y:cy};
  const s = Math.min(dx ? (r.w/2+6)/Math.abs(dx) : Infinity, dy ? (r.h/2+6)/Math.abs(dy) : Infinity);
  return {x:cx+dx*s, y:cy+dy*s};
}
function curve(a,b){
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1, k=Math.min(28,len*.12);
  const cx=mx-dy/len*k, cy=my+dx/len*k;
  return {d:`M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`, mx:(a.x+2*cx+b.x)/4, my:(a.y+2*cy+b.y)/4};
}
const comboKey = k => (k.label||'')+'|'+(k.color||'');
function drawLines(){
  let svg='', lab='';
  for(const k of S().connections){
    const A=rectOf(k.from), B=rectOf(k.to); if(!A||!B) continue;
    const a=edge(A,B.x+B.w/2,B.y+B.h/2), b=edge(B,A.x+A.w/2,A.y+A.h/2), p=curve(a,b);
    const col = k.color ? INK[k.color] : 'var(--line)';
    const dim = (tagFilter && !(hasTag(find(k.from),tagFilter) || hasTag(find(k.to),tagFilter))) || (legendFilter && comboKey(k)!==legendFilter);
    svg += `<g opacity="${dim?.15:1}"><path class="hit" data-conn="${k.id}" d="${p.d}"/><path class="ln" style="stroke:${col}" d="${p.d}"/><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="3.5" style="fill:${col}"/></g>`;
    if(k.label) lab += `<div class="clabel" data-conn="${k.id}" style="left:${p.mx}px;top:${p.my}px;${dim?'opacity:.2;':''}${k.color?`color:${INK[k.color]};`:''}">${esc(k.label)}</div>`;
  }
  linesSvg.innerHTML = svg; labelsEl.innerHTML = lab;
  renderLegend();
}
function strokePath(p){
  if(p.length<4) return `M${p[0]},${p[1]} l0.01,0`;
  let d=`M${p[0]},${p[1]}`;
  for(let i=2;i<p.length-2;i+=2){ d+=` Q${p[i]},${p[i+1]} ${r1((p[i]+p[i+2])/2)},${r1((p[i+1]+p[i+3])/2)}`; }
  return d+` L${p[p.length-2]},${p[p.length-1]}`;
}
function drawInk(){
  let h='';
  for(const k of S().strokes){
    const d=strokePath(k.pts), col=k.color?INK[k.color]:'var(--ink)';
    h+=`<path class="hitk" data-stroke="${k.id}" d="${d}" stroke-width="${Math.max(16,k.w+12)}"/><path class="stroke" d="${d}" style="stroke:${col}" stroke-width="${k.w}"/>`;
  }
  inkSvg.innerHTML = h + '<path id="liveStroke" class="stroke"/>';
}
let linesQ=false, miniQ=false;
function queueLines(){ if(linesQ) return; linesQ=true; requestAnimationFrame(()=>{ linesQ=false; drawLines(); queueMini(); }); }
function queueMini(){ if(miniQ) return; miniQ=true; requestAnimationFrame(()=>{ miniQ=false; drawMinimap(); }); }
function bgLayers(){
  const b=S().bg||{}, pat=b.pattern||(b.dots===false?'none':'dots'), L=[];
  if(pat==='dots') L.push({img:'radial-gradient(var(--dot) 1.1px, transparent 1.3px)',g:24});
  if(pat==='grid'){ L.push({img:'linear-gradient(var(--dot) 1px, transparent 1px)',g:32}); L.push({img:'linear-gradient(90deg, var(--dot) 1px, transparent 1px)',g:32}); }
  if(pat==='lines') L.push({img:'linear-gradient(transparent calc(100% - 1px), var(--dot) 1px)',g:30});
  if(b.image) L.push({img:`url("${imgSrc(b.image).replace(/"/g,'%22')}")`,base:true}); else if(b.grad) L.push({img:b.grad,base:true});
  return L;
}
function hexLum(h){ const m=(h||'').match(/^#?([0-9a-f]{6})$/i); if(!m) return null; const n=parseInt(m[1],16); return (.2126*((n>>16)&255)+.7152*((n>>8)&255)+.0722*(n&255))/255; }
function applyView(){
  const v=V(); world.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.z})`;
  const L=bgLayers();
  viewport.style.backgroundSize=L.map(l=>l.base?'cover':`${l.g*v.z}px ${l.g*v.z}px`).join(', ');
  viewport.style.backgroundPosition=L.map(l=>l.base?'center':`${v.x}px ${v.y}px`).join(', ');
  $('#zReset').textContent = Math.round(v.z*100)+'%';
  queueMini(); save();
}
function applyBg(){
  const b=S().bg||{}, L=bgLayers();
  viewport.style.backgroundColor = b.color || '';
  viewport.style.backgroundImage = L.length ? L.map(l=>l.img).join(', ') : 'none';
  const lum = (b.image||b.grad) ? (b.dark?0:null) : hexLum(b.color);
  document.body.classList.toggle('bg-dark', (b.image||b.grad) ? !!b.dark : (lum!=null && lum<.38));
  document.body.classList.toggle('bg-light', !(b.image||b.grad) && lum!=null && lum>=.38);
  world.style.fontFamily = (FONTS[S().font]||FONTS.sans)[1];
  applyView();
}
function applyAccent(){ const a=ACCENTS[db.settings.accent||0]||ACCENTS[0]; document.documentElement.style.setProperty('--acc-l',a.c); document.documentElement.style.setProperty('--acc-d',a.d); }
function applyTheme(){ const t=db.settings.theme; if(t==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=t; applyAccent(); queueMini(); }
function toWorld(sx,sy){ const v=V(); return {x:(sx-v.x)/v.z, y:(sy-v.y)/v.z}; }
function centerWorld(){ return toWorld(innerWidth/2, innerHeight/2); }
function zoomAt(sx,sy,f){ const v=V(); const nz=clamp(v.z*f,.15,3); const w=toWorld(sx,sy); v.x=sx-w.x*nz; v.y=sy-w.y*nz; v.z=nz; applyView(); }
function contentRects(ids){
  const sp=S(), rs=[];
  (ids||sp.cards.map(c=>c.id)).forEach(id=>{ const r=rectOf(id); if(r) rs.push(r); });
  if(!ids){ rs.push(...sp.boxes);
    sp.strokes.forEach(k=>{ let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity; for(let i=0;i<k.pts.length;i+=2){ x1=Math.min(x1,k.pts[i]); x2=Math.max(x2,k.pts[i]); y1=Math.min(y1,k.pts[i+1]); y2=Math.max(y2,k.pts[i+1]); } if(x1<Infinity) rs.push({x:x1,y:y1,w:x2-x1,h:y2-y1}); }); }
  return rs;
}
function bbox(rs){ let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity; rs.forEach(r=>{ x1=Math.min(x1,r.x); y1=Math.min(y1,r.y); x2=Math.max(x2,r.x+r.w); y2=Math.max(y2,r.y+r.h); }); return x1===Infinity?null:{x1,y1,x2,y2}; }
function fitRect(b,padX=60,padY=90,maxZ=1.25,minZ=.15){
  const v=V(); const z=clamp(Math.min((innerWidth-padX*2)/Math.max(1,b.x2-b.x1),(innerHeight-padY*2)/Math.max(1,b.y2-b.y1)),minZ,maxZ);
  v.z=z; v.x=innerWidth/2-(b.x1+b.x2)/2*z; v.y=innerHeight/2+(padY>40?10:0)-(b.y1+b.y2)/2*z; applyView();
}
function zoomFit(onlySel,maxZ=1.25,minZ=.15){ const b=bbox(contentRects(onlySel && sel.size ? [...sel] : null)); if(b) fitRect(b,60,90,maxZ,minZ); }
function centerOn(c){ const v=V(), el=cEl(c.id), w=c.w||220, h=el?el.offsetHeight:60; v.x=innerWidth/2-(c.x+w/2)*v.z; v.y=innerHeight/2-(c.y+h/2)*v.z; applyView(); }

// minimap & legend
let mmX=null;
function drawMinimap(){
  const on = db.settings.minimap && !document.body.classList.contains('zen') && !pres;
  mm.hidden=!on; document.body.classList.toggle('nomini', !on);
  if(!on) return;
  const W2=mm.clientWidth||180, H=mm.clientHeight||120, dpr=devicePixelRatio||1;
  if(mm.width!==Math.round(W2*dpr)){ mm.width=Math.round(W2*dpr); mm.height=Math.round(H*dpr); }
  const ctx=mm.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W2,H);
  const sp=S(), a=toWorld(0,0), b=toWorld(innerWidth,innerHeight), vr={x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};
  const cards=sp.cards.map(c=>{ const el=cEl(c.id); return {x:c.x,y:c.y,w:c.w||220,h:el?el.offsetHeight:50,c:c.color}; });
  const bb=bbox([vr,...cards,...sp.boxes]); const pad=60; bb.x1-=pad; bb.y1-=pad; bb.x2+=pad; bb.y2+=pad;
  const s=Math.min(W2/(bb.x2-bb.x1),H/(bb.y2-bb.y1)), ox=(W2-(bb.x2-bb.x1)*s)/2, oy=(H-(bb.y2-bb.y1)*s)/2;
  mmX={x1:bb.x1,y1:bb.y1,s,ox,oy};
  const cs=getComputedStyle(document.documentElement), T=(x,y)=>[ox+(x-bb.x1)*s, oy+(y-bb.y1)*s];
  sp.boxes.forEach(bx=>{ const [px,py]=T(bx.x,bx.y); ctx.fillStyle=cs.getPropertyValue('--c-'+(bx.color||'gray')).trim(); ctx.globalAlpha=.7; ctx.fillRect(px,py,bx.w*s,bx.h*s); });
  cards.forEach(r=>{ const [px,py]=T(r.x,r.y); ctx.fillStyle=r.c?cs.getPropertyValue('--c-'+r.c).trim():cs.getPropertyValue('--muted').trim(); ctx.globalAlpha=r.c?1:.5; ctx.fillRect(px,py,Math.max(2,r.w*s),Math.max(2,r.h*s)); });
  ctx.globalAlpha=1; const [vx,vy]=T(vr.x,vr.y); ctx.strokeStyle=cs.getPropertyValue('--accent').trim(); ctx.lineWidth=1.5; ctx.strokeRect(vx,vy,vr.w*s,vr.h*s);
}
function mmNav(e){ if(!mmX) return; const r=mm.getBoundingClientRect(); const wx=mmX.x1+(e.clientX-r.left-mmX.ox)/mmX.s, wy=mmX.y1+(e.clientY-r.top-mmX.oy)/mmX.s; const v=V(); v.x=innerWidth/2-wx*v.z; v.y=innerHeight/2-wy*v.z; applyView(); }
mm.addEventListener('pointerdown',e=>{ e.preventDefault(); const frozen=mmX; mm.setPointerCapture(e.pointerId); mmNav(e); mmX=frozen; mm.onpointermove=ev=>{ mmX=frozen; mmNav(ev); }; });
mm.addEventListener('pointerup',()=>{ mm.onpointermove=null; queueMini(); });
function legendCombos(){ const m=new Map(); for(const k of S().connections){ if(!k.label || !find(k.from) || !find(k.to)) continue; const key=comboKey(k); const o=m.get(key)||{key,label:k.label,color:k.color||'',n:0}; o.n++; m.set(key,o); } return [...m.values()]; }
function renderLegend(){
  const cs=legendCombos();
  if(!db.settings.legend || !cs.length || document.body.classList.contains('zen') || pres){ legendEl.hidden=true; return; }
  legendEl.hidden=false;
  legendEl.innerHTML=`<div class="lh">Connections</div>`+cs.map(c=>`<button data-key="${esc(c.key)}" class="${legendFilter===c.key?'on':''}"><span class="lsw" style="background:${c.color?INK[c.color]:'var(--line)'}"></span>${esc(c.label)}<span class="desc">${c.n}</span></button>`).join('');
}
legendEl.addEventListener('click',e=>{ const b=e.target.closest('[data-key]'); if(!b) return; legendFilter = legendFilter===b.dataset.key ? null : b.dataset.key; drawLines(); });

// =====================================================================
// LIVE SHAPESHIFT (ghost preview, shape chips, slash menu)
// =====================================================================
let liveT=null;
function startPred(c){
  pred={list:rank(c.text), pick:0, manual:!!c.manual, slash:null};
  if(c.manual) pred.list=[{type:c.type,score:1},...pred.list.filter(x=>x.type!==c.type)];
}
function chosenType(){ return pred && pred.list[pred.pick] ? pred.list[pred.pick].type : 'note'; }
function onLiveInput(c){
  const v=c.text;
  if(/^\/[\w ]*$/.test(v)){ const q=v.slice(1).toLowerCase().trim();
    const items=enabledTypes().filter(t=>!q||t.includes(q)||TYPE_META[t].l.toLowerCase().includes(q));
    pred.slash={items, idx:Math.min(pred.slash?pred.slash.idx:0, Math.max(0,items.length-1))}; renderLive(c); return; }
  pred.slash=null;
  if(pred.manual){ renderLive(c); return; }
  clearTimeout(liveT);
  liveT=setTimeout(()=>{ if(editingId!==c.id||!pred) return; pred.list=rank(c.text); pred.pick=0; renderLive(c); },60);
}
function renderLive(c){
  if(!c || editingId!==c.id || !pred) return; const el=cEl(c.id); if(!el) return; const box=el.querySelector('.live'); if(!box) return;
  const pill=el.querySelector('.pill');
  if(pred.slash){
    const s=pred.slash;
    el.classList.add('slashing');
    box.innerHTML=`<div class="slash">${s.items.map((t,i)=>`<div class="sl ${i===s.idx?'on':''}" data-slash="${t}"><span class="ico">${TI(t)}</span><span class="lab">${TYPE_META[t].l}</span><span class="ex">${esc(TYPE_META[t].ex)}</span></div>`).join('')||'<div class="sub">No shape matches</div>'}</div><div class="sl-foot">↑↓ choose · ↵ pick · esc</div>`;
    const on=box.querySelector('.sl.on'); if(on) on.scrollIntoView({block:'nearest'});
    pill.textContent='/ choose a shape'; queueLines(); return;
  }
  el.classList.remove('slashing');
  const cur=chosenType();
  if(!db.settings.live || !c.text.trim()){ box.innerHTML=''; pill.innerHTML=pred.manual?`${TI(cur)} ${TYPE_META[cur].l.toLowerCase()} — try “${esc(TYPE_META[cur].ex)}”`:pillText(c); queueLines(); return; }
  const shown=pred.list.filter((x,i)=>x.score>=.3||i===pred.pick).slice(0,Math.max(3,pred.pick+1));
  if(!shown.some(x=>x.type==='note')) shown.push({type:'note',score:(pred.list.find(x=>x.type==='note')||{score:.2}).score});
  const chips=shown.map(x=>`<span class="chipS ${x.type===cur?'on':''}" data-pick="${x.type}">${TI(x.type)}${TYPE_META[x.type].l}${DEBUG?`<span class="pc">${Math.round(x.score*100)}%</span>`:''}</span>`).join('');
  let ghost='';
  if(cur!=='note'){
    const text=cur==='todo'?transform('todo',c.text):c.text;
    if(cur!=='todo' || text!==c.text){
      const tmp={...c, type:cur, text, data:JSON.parse(JSON.stringify(c.data||{})), img:''};
      let h=''; try{ h=contentHTML(tmp); }catch(e){}
      if(h && h!==fallback(tmp)) ghost=`<div class="ghost">${h}</div>`;
    }
  }
  box.innerHTML=`<div class="sugg"><span class="lbl2">${pred.manual?'shape':'becomes'}</span>${chips}${pred.manual?`<span class="chipS" data-pick="__auto" title="Let it decide">✨ auto</span>`:''}</div>${ghost}`;
  pill.innerHTML=`${pred.manual?'':'✨ '}${TI(cur)} ${TYPE_META[cur].l.toLowerCase()}${pred.manual?' (picked)':''}`;
  queueLines();
}
function pickShape(c,type){
  if(type==='__auto'){ pred.manual=false; c.manual=false; pred.list=rank(c.text); pred.pick=0; renderLive(c); return; }
  if(!pred.list.some(x=>x.type===type)) pred.list.push({type,score:0});
  pred.pick=pred.list.findIndex(x=>x.type===type); pred.manual=true; renderLive(c);
}
function slashChoose(c,type){
  const ta=cardsEl.querySelector('textarea'); c.text=''; if(ta){ ta.value=''; ta.placeholder=TYPE_META[type].ex; ta.focus(); }
  pred.slash=null; pred.list=[{type,score:1}]; pred.pick=0; pred.manual=true; renderLive(c);
}

// =====================================================================
// MUTATIONS
// =====================================================================
function createCard(x,y,text='',edit=true){
  if(editingId) commitEdit();
  const before=snap(); const c=newCard(sn(x),sn(y),text ? normDueText(text) : ''); S().cards.push(c);
  if(edit){ editSnapshot=before; startEdit(c.id,true); }
  else { pushUndo(before); render(); classifyCard(c); save(); }
  return c;
}
function startEdit(id,keepSnap){
  if(editingId===id){ const ta=cardsEl.querySelector('textarea'); if(ta) ta.focus({preventScroll:true}); return; }
  if(editingId) commitEdit();
  const c=find(id); if(!c) return;
  if(!keepSnap) editSnapshot=snap();
  editingId=id; editOrig=c.text; sel.clear(); closePop(); startPred(c); render();
}
function commitEdit(){
  if(!editingId) return;
  const id=editingId; editingId=null; clearTimeout(liveT);
  const c=find(id); const p=pred; pred=null;
  if(!c){ render(); return; }
  if(p && p.slash) c.text='';
  if(!c.text.trim() && !c.img){
    const had=editOrig.trim(); if(had){ c.text=editOrig; pushUndo(editSnapshot); }
    removeCards([id], !!had); render(); save(); return;
  }
  const changed = c.text!==editOrig;
  const want = p ? (p.list[p.pick]||{}).type : null;
  const typeChanged = p && p.manual && want && (want!==c.type || !c.manual);
  if(changed || typeChanged){ pushUndo(editSnapshot); if(changed){ c.text=normDueText(c.text); c.updated=Date.now(); } }
  if(typeChanged){ applyType(c,want,true); render(); morph(id); save(); return; }
  if(changed && c.manual && c.type==='todo') c.text=transform('todo',c.text);
  if(changed && !c.manual){
    const known=classify(c.text), prev=c.type; applyType(c,known,false); render(); if(prev!==known||SMART.has(known)) morph(id); save(); return;
  }
  render(); save();
}
function onEditKey(e){
  e.stopPropagation();
  const c=find(editingId); if(!c) return;
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); commitEdit(); openPalette(); return; }
  if(pred && pred.slash){
    const s=pred.slash;
    if(e.key==='ArrowDown'){ e.preventDefault(); s.idx=Math.min(s.items.length-1,s.idx+1); return renderLive(c); }
    if(e.key==='ArrowUp'){ e.preventDefault(); s.idx=Math.max(0,s.idx-1); return renderLive(c); }
    if(e.key==='Enter'||e.key==='Tab'){ e.preventDefault(); if(s.items[s.idx]) slashChoose(c,s.items[s.idx]); return; }
    if(e.key==='Escape'){ e.preventDefault(); c.text=''; e.target.value=''; pred.slash=null; renderLive(c); return; }
  }
  if(e.isComposing) return;
  if(e.key==='Enter' && e.shiftKey){ // new line — keep checklist / bullet lists going
    const ta=e.target, pos=ta.selectionStart, before=ta.value.slice(0,pos), line=before.slice(before.lastIndexOf('\n')+1);
    const m=line.match(/^(\s*)(\[[ x]\]\s|[-*•]\s|(\d+)[.)]\s)/i);
    if(!m) return;               // plain newline: let the textarea handle it
    e.preventDefault();
    if(line.trim()===m[2].trim()){ ta.setRangeText('',pos-line.length,pos,'end'); }   // empty item → end the list
    else { const nx=m[3]?`${+m[3]+1}${m[2].trim().slice(-1)} `:m[2].replace(/\[x\]/i,'[ ]'); ta.setRangeText('\n'+m[1]+nx,pos,ta.selectionEnd,'end'); }
    ta.dispatchEvent(new Event('input')); return;
  }
  if(e.key==='Escape' || e.key==='Enter'){
    e.preventDefault();
    if(e.key==='Enter' && e.altKey){ const r=rectOf(c.id); const x=c.x, y=c.y+(r?r.h:40)+18; commitEdit(); createCard(x,y); }
    else commitEdit();
  }
  else if(e.key==='Tab' && pred && c.text.trim()){
    e.preventDefault(); const shown=[...cardsEl.querySelectorAll('.editing [data-pick]')].map(x=>x.dataset.pick).filter(x=>x!=='__auto');
    if(!shown.length) return; const cur=shown.indexOf(chosenType()); pickShape(c,shown[(cur+(e.shiftKey?-1:1)+shown.length)%shown.length]);
  }
}
function removeCards(ids,toTrash=true){
  const s=new Set(ids), sp=S();
  if(toTrash) ids.forEach(id=>{ const c=find(id); if(c) sp.trash.unshift({card:JSON.parse(JSON.stringify(c)), conns:sp.connections.filter(k=>k.from===id||k.to===id), at:Date.now()}); });
  sp.trash=sp.trash.slice(0,100);
  sp.cards=sp.cards.filter(c=>!s.has(c.id)); sp.connections=sp.connections.filter(k=>!s.has(k.from)&&!s.has(k.to)); ids.forEach(i=>sel.delete(i));
}
function delSelected(){ if(!sel.size) return; pushUndo(); const n=sel.size; removeCards([...sel]); sel.clear(); render(); save(); toast(`Removed ${n} — restore from Spaces ▾ → Recently removed`); }
function restoreTrash(i){
  const sp=S(), t=sp.trash[i]; if(!t) return; pushUndo();
  if(!find(t.card.id)) sp.cards.push(t.card);
  t.conns.forEach(k=>{ if(find(k.from)&&find(k.to)&&!sp.connections.some(q=>q.id===k.id)) sp.connections.push(k); });
  sp.trash.splice(i,1); render(); save(); const c=find(t.card.id); if(c){ centerOn(c); sel.clear(); sel.add(c.id); render(); }
}
function setType(ids,type){
  if(editingId) commitEdit();
  pushUndo(); ids.forEach(id=>{ const c=find(id); if(!c) return; applyType(c,type,true); c.updated=Date.now(); });
  render(); ids.forEach(morph); save();
}
function setAuto(id){ const c=find(id); if(!c) return; if(editingId) commitEdit(); c.manual=false; classifyCard(c); }
function setProp(ids,key,val){ if(editingId) commitEdit(); pushUndo(); ids.forEach(id=>{ const c=find(id); if(c) c[key]=val; }); render(); save(); }
function toggleLock(ids){ const lock = ids.some(id=>!find(id)?.locked); setProp(ids,'locked',lock); if(lock){ sel.clear(); render(); } toast(lock?'Locked — locked cards act like background. Right-click to unlock.':'Unlocked'); }
function toggleTodoIn(sid,cid,line){
  const sp=db.spaces[sid], c=findIn(sp,cid); if(!c) return;
  if(sid===db.current) pushUndo();
  const ls=c.text.split('\n'), l=ls[line]; if(l==null) return;
  ls[line] = /^\s*\[x\]/i.test(l) ? l.replace(/\[x\]/i,'[ ]') : l.replace('[ ]','[x]');
  c.text=ls.join('\n');
  if(sid===db.current) refreshCard(cid); save();
}
function connect(a,b){
  const sp=S(); if(a===b || sp.connections.some(k=>(k.from===a&&k.to===b)||(k.from===b&&k.to===a))) return;
  pushUndo(); sp.connections.push({id:uid(),from:a,to:b,label:'',color:''}); drawLines(); save();
}
function duplicate(ids){
  pushUndo(); const map={}; const sp=S(), t=Date.now();
  ids.forEach(id=>{ const c=find(id); if(!c) return; const n={...JSON.parse(JSON.stringify(c)),id:uid(),x:c.x+30,y:c.y+30,created:t}; if(n.type==='timer') n.data={}; map[id]=n.id; sp.cards.push(n); });
  sp.connections.filter(k=>map[k.from]&&map[k.to]).forEach(k=>sp.connections.push({...k,id:uid(),from:map[k.from],to:map[k.to]}));
  sel.clear(); Object.values(map).forEach(i=>sel.add(i)); render(); save();
}
function cardsInBox(b,sp=S()){ return sp.cards.filter(c=>{ const r=sp===S()?rectOf(c.id):{x:c.x,y:c.y,w:c.w||220,h:80}; if(!r) return false; const cx=r.x+r.w/2, cy=r.y+r.h/2; return cx>b.x&&cx<b.x+b.w&&cy>b.y&&cy<b.y+b.h; }); }
function boxAround(ids){
  if(editingId) commitEdit();
  const b=bbox(contentRects(ids)); if(!b) return newBox();
  pushUndo(); const pad=22;
  S().boxes.push({id:uid(), x:Math.round(b.x1-pad), y:Math.round(b.y1-pad-30), w:Math.round(b.x2-b.x1+pad*2), h:Math.round(b.y2-b.y1+pad*2+30), name:'Box', color:''});
  sel.clear(); render(); save();
}
function newBox(at){ pushUndo(); const w=at||centerWorld(); S().boxes.push({id:uid(), x:Math.round(w.x-(at?0:170)), y:Math.round(w.y-(at?0:120)), w:340, h:240, name:'Box', color:''}); render(); save(); }
function align(mode){
  const ids=[...sel].filter(id=>!find(id)?.locked); const rs=ids.map(id=>({id,...rectOf(id)})).filter(r=>r.w!=null);
  if(rs.length<2) return toast('Select 2+ cards to align');
  pushUndo();
  const minX=Math.min(...rs.map(r=>r.x)), maxR=Math.max(...rs.map(r=>r.x+r.w)), minY=Math.min(...rs.map(r=>r.y)), maxB=Math.max(...rs.map(r=>r.y+r.h));
  const put=(r,x,y)=>{ const c=find(r.id); if(x!=null) c.x=Math.round(x); if(y!=null) c.y=Math.round(y); };
  switch(mode){
    case 'left': rs.forEach(r=>put(r,minX)); break;
    case 'right': rs.forEach(r=>put(r,maxR-r.w)); break;
    case 'center': { const cx=(minX+maxR)/2; rs.forEach(r=>put(r,cx-r.w/2)); break; }
    case 'top': rs.forEach(r=>put(r,null,minY)); break;
    case 'bottom': rs.forEach(r=>put(r,null,maxB-r.h)); break;
    case 'middle': { const cy=(minY+maxB)/2; rs.forEach(r=>put(r,null,cy-r.h/2)); break; }
    case 'distH': { rs.sort((a,b)=>a.x-b.x); const tot=rs.reduce((s,r)=>s+r.w,0); const gap=Math.max(12,(maxR-minX-tot)/(rs.length-1)); let x=minX; rs.forEach(r=>{ put(r,x); x+=r.w+gap; }); break; }
    case 'distV': { rs.sort((a,b)=>a.y-b.y); const tot=rs.reduce((s,r)=>s+r.h,0); const gap=Math.max(12,(maxB-minY-tot)/(rs.length-1)); let y=minY; rs.forEach(r=>{ put(r,null,y); y+=r.h+gap; }); break; }
    case 'stack': { rs.sort((a,b)=>a.y-b.y||a.x-b.x); let y=minY; rs.forEach(r=>{ put(r,minX,y); y+=r.h+12; }); break; }
    case 'row': { rs.sort((a,b)=>a.x-b.x||a.y-b.y); let x=minX; rs.forEach(r=>{ put(r,x,minY); x+=r.w+16; }); break; }
    case 'grid': { rs.sort((a,b)=>a.y-b.y||a.x-b.x); const cols=Math.ceil(Math.sqrt(rs.length)), cw=Math.max(...rs.map(r=>r.w))+20; let y=minY;
      for(let i=0;i<rs.length;i+=cols){ const row=rs.slice(i,i+cols); row.forEach((r,j)=>put(r,minX+j*cw,y)); y+=Math.max(...row.map(r=>r.h))+20; } break; }
  }
  render(); save();
}
function moveCards(ids,targetId){
  if(editingId) commitEdit();
  const src=S(), dst=db.spaces[targetId]; if(!dst||dst===src) return;
  pushUndo(snapMulti([db.current,targetId])); const set=new Set(ids);
  const cards=src.cards.filter(c=>set.has(c.id)), conns=src.connections.filter(k=>set.has(k.from)&&set.has(k.to));
  const b=bbox(cards.map(c=>({x:c.x,y:c.y,w:c.w||220,h:80})));
  const dv=dst.view, cx=dv?(innerWidth/2-dv.x)/dv.z:300, cy=dv?(innerHeight/2-dv.y)/dv.z:200;
  const dx=cx-(b.x1+b.x2)/2, dy=cy-(b.y1+b.y2)/2;
  src.cards=src.cards.filter(c=>!set.has(c.id)); src.connections=src.connections.filter(k=>!set.has(k.from)&&!set.has(k.to));
  cards.forEach(c=>{ c.x=Math.round(c.x+dx); c.y=Math.round(c.y+dy); dst.cards.push(c); }); dst.connections.push(...conns);
  sel.clear(); render(); save(); toast(`Moved ${cards.length} card${cards.length>1?'s':''} to “${dst.name}”`);
}
function inbox(){ let id=db.order.find(i=>db.spaces[i].kind==='inbox'); if(!id){ const s=newSpace('Inbox','inbox'); db.spaces[s.id]=s; db.order.unshift(s.id); id=s.id; } return db.spaces[id]; }
function captureToInbox(text){
  const ib=inbox(); const y=ib.cards.length?Math.max(...ib.cards.map(c=>c.y))+130:0;
  const c=newCard(0,y,normDueText(text)); ib.cards.push(c); classifyCard(c,ib); save();
  const t=classify(text); toast(`📥 Captured to Inbox as ${ICON[t]} ${TYPE_META[t].l}`); if(ib===S()) render();
}
function goSpaceByName(name){
  const n=name.trim(); let id=db.order.find(i=>db.spaces[i].name.toLowerCase()===n.toLowerCase());
  if(!id){ const s=newSpace(n); db.spaces[s.id]=s; db.order.splice(db.order.indexOf(db.current)+1,0,s.id); id=s.id; toast(`Created space “${n}”`); }
  switchSpace(id);
}
function switchSpace(id){ if(!db.spaces[id]) return; if(editingId) commitEdit(); if(pres) endPresent(); const fresh=!db.spaces[id].view; db.current=id; sel.clear(); tagFilter=null; legendFilter=null; undoStack=[]; redoStack=[]; closePop(); render(); if(fresh && S().cards.length) zoomFit(false,1,innerWidth<600?.7:.15); save(); }
function jumpTo(sid,cid){
  if(sid!==db.current) switchSpace(sid);
  const c=find(cid); if(!c) return;
  sel.clear(); sel.add(cid); render(); centerOn(c);
  const el=cEl(cid); if(el){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1300); }
}

// =====================================================================
// COMBINE — drop a card just under (or over) another to merge them
// =====================================================================
function cardLines(c){ return c.text.split('\n').map(l=>l.trim()).filter(Boolean); }
function mergeInfo(target, src, mode){
  if(target.img && src.img) return null;
  if(!target.text.trim() && !src.text.trim()) return null;
  const [A,B] = mode==='append' ? [target,src] : [src,target];
  const res={img:target.img||src.img, data:JSON.parse(JSON.stringify(target.data||{})), type:null, text:''};
  // poll ← options
  if(target.type==='poll'){ const p=parsePoll(target.text);
    if(p){ const extra = src.type==='poll' ? ((parsePoll(src.text)||{}).opts||[]) : cardLines(src).map(l=>l.replace(/^([-*•]|\[( |x)\])\s*/i,'').replace(/\?$/,'')).filter(l=>l && l.split(/\s+/).length<=6);
      const opts=[...p.opts]; extra.forEach(o=>{ if(!opts.some(x=>x.toLowerCase()===o.toLowerCase())) opts.push(cap(o)); });
      if(extra.length && opts.length<=8){
        if(src.type==='poll'){ const sv=src.data.votes||{}; res.data.votes={...(res.data.votes||{})}; for(const k in sv) res.data.votes[k]=(res.data.votes[k]||0)+sv[k]; }
        res.type='poll'; res.text=(p.title?p.title+': ':'')+opts.slice(0,-1).join(', ')+' or '+opts[opts.length-1]+'?'; return res; } } }
  // checklist wins — everything becomes items
  if(A.type==='todo' || B.type==='todo'){
    const items=[]; let title=null;
    const same=(x,y)=>x.replace(/:$/,'').trim().toLowerCase()===y.replace(/:$/,'').trim().toLowerCase();
    const add=l=>{ const k=l.replace(/^\[( |x)\]\s?/i,'').toLowerCase(); if(!items.some(o=>o.replace(/^\[( |x)\]\s?/i,'').toLowerCase()===k)) items.push(l); };
    const bHasTitle=c=>c.type==='todo' && !/^\[( |x)\]/i.test(cardLines(c)[0]||'');
    [A,B].forEach((c,i)=>{ const ls=cardLines(c);
      if(c.type==='todo') ls.forEach((l,j)=>{ if(/^\[( |x)\]/i.test(l)) add(l); else if(j===0 && !title) title=l; else if(!(j===0 && title && same(l,title))) items.push(l); });
      else if(i===0 && ls.length===1 && ls[0].length<60 && !/^https?:/i.test(ls[0]) && !bHasTitle(B)) title=ls[0].replace(/^#+\s*/,'').replace(/[:.]$/,'')+':';
      else ls.forEach(l=>add('[ ] '+(c.type==='reminder' ? parseReminder(c).title : l.replace(/^([-*•]|\d+[.)])\s+/,''))));
    });
    res.type='todo'; res.text=(title?[title]:[]).concat(items).join('\n'); return res;
  }
  // heading on top becomes the bold title of a note
  if(A.type==='heading'){ res.type='note'; res.text='**'+A.text.replace(/^#+\s*/,'').trim()+'**\n'+B.text.trim(); return res; }
  res.text=(A.text.trim()+'\n'+B.text.trim()).trim();
  const r=classify(res.text); res.type=['note','todo','event','reminder','link','quote'].includes(r)?r:'note';
  if(res.type==='todo') res.text=transform('todo',res.text);
  return res;
}
function describeMerge(res){
  let d=`${ICON[res.type]} ${TYPE_META[res.type].l}`;
  if(res.type==='todo'){ const n=(res.text.match(/^\[( |x)\]/gim)||[]).length; d+=` · ${n} item${n===1?'':'s'}`; }
  if(res.type==='poll'){ const p=parsePoll(res.text); if(p) d+=` · ${p.opts.length} options`; }
  if(res.img) d+=' + image';
  return 'Combine → '+d;
}
// Two drop zones under (or over) another card: overlapping its edge COMBINES the cards; a little further away
// SNAPS the card into a vertical list (the cards below make room). Hold ⌥ to do neither.
const GAP=12;
const yState = id => { const c=find(id); return c?c.y:0; };
function chainBelow(x,y,h,skip,yOf=yState){ // ids stacked directly under a rect, top to bottom (yOf lets a plan use provisional positions)
  const out=[]; let bottom=y+h, cx=x;
  for(let n=0;n<200;n++){
    const nxt=S().cards.find(c=>c.id!==skip && !c.locked && !out.includes(c.id) && Math.abs(c.x-cx)<=6 && yOf(c.id)-bottom>=-2 && yOf(c.id)-bottom<=GAP+10);
    if(!nxt) break; const r=rectOf(nxt.id); if(!r) break; out.push(nxt.id); bottom=yOf(nxt.id)+r.h; cx=nxt.x; }
  return out;
}
function cardAbove(t,skip,yOf=yState){ const ty=yOf(t.id);
  return S().cards.find(c=>{ if(c.id===skip||c.id===t.id||c.locked||Math.abs(c.x-t.x)>6) return false; const r=rectOf(c.id); if(!r) return false; const g=ty-(yOf(c.id)+r.h); return g>=-2 && g<=GAP+10; }); }
// Everything a snap drop would change, computed once from state (not from the preview DOM), so the preview and the
// drop agree and nothing moves twice: the slot the card came from closes, then the card lands and its new neighbours make room.
function planSnap(d,target,mode){
  const me=rectOf(d.id), o=d.origin; if(!me||!o) return null;
  const y=new Map(), yOf=id=>y.has(id)?y.get(id):yState(id);
  const oc=chainBelow(o.x,o.y,o.h,d.id); oc.forEach(id=>y.set(id,yOf(id)-(o.h+GAP)));
  if(mode==='before' && oc[0]===target.id) return {x:o.x,y:o.y,moves:[]};            // dropped back where it came from
  if(mode==='before'){ const ab=cardAbove(target,d.id,yOf); if(ab){ target=ab; mode='after'; } }   // above a mid-list card = after the one above
  const tr=rectOf(target.id); if(!tr) return null; const ty=yOf(target.id); let land;
  if(mode==='after'){ land={x:target.x,y:ty+tr.h+GAP}; chainBelow(target.x,ty,tr.h,d.id,yOf).forEach(id=>y.set(id,yOf(id)+me.h+GAP)); }
  else land={x:target.x,y:ty-me.h-GAP};
  return {...land, moves:[...y].filter(([id,v])=>v!==yState(id)).map(([id,v])=>({id,y:v}))};
}
function closeGap(d){ // a plain drop somewhere else: the list the card came from closes up
  const o=d.origin, c=find(d.id); if(!o||!c) return;
  const below=chainBelow(o.x,o.y,o.h,d.id), inList=below.length || cardAbove({id:d.id,x:o.x},d.id,id=>id===d.id?o.y:yState(id));
  if(Math.abs(c.y-o.y)<o.h/2 && Math.abs(c.x-o.x)<(c.w||220)/2){ if(inList){ c.x=o.x; c.y=o.y; } return; }   // a nudge inside a list settles back into its slot
  below.forEach(id=>{ const x=find(id); if(x) x.y-=o.h+GAP; });
}
function checkMerge(d){
  const me=rectOf(d.id); if(!me) return clearMerge(d);
  const MERGE=10, SNAP=90; let best=null, snap=null;
  for(const c of S().cards){ if(c.id===d.id || c.locked) continue; const r=rectOf(c.id); if(!r) continue;
    const ov=Math.min(me.x+me.w,r.x+r.w)-Math.max(me.x,r.x); if(ov < Math.min(me.w,r.w)*.4) continue;
    const below=me.y-(r.y+r.h), above=r.y-(me.y+me.h);
    if(below>-19 && below<MERGE && (!best||Math.abs(below)<best.g)) best={c,r,mode:'append',g:Math.abs(below)};
    if(above>-19 && above<MERGE && (!best||Math.abs(above)<best.g)) best={c,r,mode:'prepend',g:Math.abs(above)};
    if(below>=MERGE && below<SNAP && (!snap||below<snap.g)) snap={c,r,mode:'after',g:below};
    if(above>=MERGE && above<SNAP && (!snap||above<snap.g)) snap={c,r,mode:'before',g:above}; }
  // inserting into a list means overlapping the member below the slot; aiming at its top half means "snap", not "combine"
  const plan=snap?planSnap(d,snap.c,snap.mode):null; if(snap && !plan) snap=null;
  if(best && snap && plan.moves.some(m=>m.id===best.c.id) && me.y < best.r.y+best.r.h/2) best=null;
  // a card nudged a few pixels inside its own list must not combine with its neighbours; that needs a deliberate move
  if(best && d.origin){ const o=d.origin, dy=me.y-o.y; const nb=chainBelow(o.x,o.y,o.h,d.id)[0], na=cardAbove({id:d.id,x:o.x},d.id,id=>id===d.id?o.y:yState(id));
    if((best.c.id===nb && dy<o.h*.5) || (na && best.c.id===na.id && dy>-me.h*.5)) best=null; }
  if(best){ const src=find(d.id), res=mergeInfo(best.c,src,best.mode);
    if(res){ clearSnap(d);
      if(!d.merge || d.merge.tid!==best.c.id){ clearMerge(d); const te=cEl(best.c.id); if(te) te.classList.add('merge-target'); const me2=cEl(d.id); if(me2) me2.classList.add('merging'); }
      d.merge={tid:best.c.id, mode:best.mode, res};
      const r=best.r, y = best.mode==='append' ? (r.y+r.h+me.y)/2 : (me.y+me.h+r.y)/2;
      mergeBar.style.cssText=`display:block;left:${r.x+10}px;top:${y-3}px;width:${Math.max(40,r.w-20)}px`;
      mergeBar.firstChild.textContent=describeMerge(res); return; } }
  clearMerge(d, true);
  if(!snap) return clearSnap(d);
  if(!d.snap || d.snap.tid!==snap.c.id || d.snap.mode!==snap.mode){
    clearSnap(d); d.snap={tid:snap.c.id, mode:snap.mode, plan};
    plan.moves.forEach(m=>{ const e=cEl(m.id); if(e) e.style.top=m.y+'px'; });
    snapSlot.style.cssText=`display:block;left:${plan.x}px;top:${plan.y}px;width:${me.w}px;height:${me.h}px`;
  }
}
function clearSnap(d){
  if(d && d.snap){ d.snap.plan.moves.forEach(m=>{ const c=find(m.id), e=cEl(m.id); if(c && e) e.style.top=c.y+'px'; }); d.snap=null; }
  snapSlot.style.display='none';
}
function clearMerge(d, keepSnap){
  if(d) d.merge=null; mergeBar.style.display='none'; if(!keepSnap) clearSnap(d);
  cardsEl.querySelectorAll('.merge-target,.merging').forEach(el=>el.classList.remove('merge-target','merging'));
}
function doSnap(d){
  const p=d.snap.plan, c=find(d.id); clearSnap(d); if(!p||!c) return render();
  p.moves.forEach(m=>{ const x=find(m.id); if(x) x.y=m.y; });
  c.x=p.x; c.y=p.y; render(); save(); if(p.moves.length || c.y!==d.origin.y) toast('Snapped into the list — ⌘Z to undo');
}
function doMerge(m,srcId){
  const sp=S(), t=find(m.tid), src=find(srcId); if(!t||!src) return render();
  const res=m.res, prevType=t.type;
  Object.assign(t,{text:res.text, type:res.type, img:res.img||'', data:res.data, manual:false, auto:true, w:Math.max(t.w||220,src.w||220), h:null, color:t.color||src.color, updated:Date.now()});
  if(SMART.has(t.type) && t.w<240) t.w=240;
  sp.connections.forEach(k=>{ if(k.from===src.id) k.from=t.id; if(k.to===src.id) k.to=t.id; });
  const seen=new Set(); sp.connections=sp.connections.filter(k=>{ if(k.from===k.to) return false; const key=[k.from,k.to].sort().join('|'); if(seen.has(key)) return false; seen.add(key); return true; });
  sp.cards=sp.cards.filter(c=>c!==src); sel.clear();
  render(); save(); morph(t.id);
  const el=cEl(t.id); if(el){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1200); }
  toast(`Combined into ${ICON[t.type]} ${TYPE_META[t.type].l} — ⌘Z to undo`);
}

// =====================================================================
// WIDGET ACTIONS + TICKER
// =====================================================================
let audioCtx=null;
function beep(){ try{ audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); [0,.25,.5].forEach(t=>{ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.frequency.value=880; o.connect(g); g.connect(audioCtx.destination);
  g.gain.setValueAtTime(.0001,audioCtx.currentTime+t); g.gain.exponentialRampToValueAtTime(.25,audioCtx.currentTime+t+.02); g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+t+.2); o.start(audioCtx.currentTime+t); o.stop(audioCtx.currentTime+t+.22); }); }catch(e){} }
async function copyText(v){ try{ await navigator.clipboard.writeText(v); toast('Copied '+(v.length>40?'':v)); }catch(e){ toast('Clipboard blocked by the browser'); } }
function download(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
function widget(c, act){
  const d=c.data, i=act.indexOf(':'), a=i<0?act:act.slice(0,i), arg=i<0?'':act.slice(i+1);
  const commit=()=>{ refreshCard(c.id); save(); };
  switch(a){
    case 'copy': return copyText(arg);
    case 'tstart': try{ audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
      if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
      if(d.fin){ d.left=d.dur; d.fin=false; } d.endAt=Date.now()+d.left*1000; return commit();
    case 'tpause': d.left=Math.max(0,(d.endAt-Date.now())/1000); d.endAt=null; return commit();
    case 'treset': d.left=d.dur; d.endAt=null; d.fin=false; return commit();
    case 'hday': { const log=d.log=d.log||{}; if(arg>iso(noon())) return; pushUndo(); if(log[arg]) delete log[arg]; else log[arg]=1; return commit(); }
    case 'ginc': case 'gdec': { const p=parseGoal(c.text); if(!p) return; pushUndo(); const cur=d.done!=null?d.done:p.done; d.done=Math.max(0,cur+(a==='ginc'?1:-1)); if(d.done>=p.target && a==='ginc') toast('🎯 Goal reached!'); return commit(); }
    case 'vote': { const p=parsePoll(c.text); if(!p) return; const o=p.opts[+arg]; d.votes=d.votes||{}; d.votes[o]=(d.votes[o]||0)+1; return commit(); }
    case 'preset': pushUndo(); d.votes={}; return commit();
    case 'reroll': { const p=parseRandom(c.text); if(!p) return; d.r=rollRandom(p); d.rk=c.text; refreshCard(c.id); const el=cEl(c.id); if(el) el.querySelector('.content').classList.add('rolling'); return save(); }
    case 'rdone': pushUndo(); d.done=!d.done; return commit();
    case 'ics': { const e=parseEvent(c); return download((e.title||'event').replace(/[^\w-]+/g,'-').slice(0,40)+'.ics', icsFor(e), 'text/calendar'); }
    case 'vcf': { const p=parseContact(c.text); if(!p) return; const v=['BEGIN:VCARD','VERSION:3.0',`FN:${p.name||p.email}`,p.phone?`TEL:${p.phone}`:'',p.email?`EMAIL:${p.email}`:'','END:VCARD'].filter(Boolean).join('\r\n');
      return download((p.name||'contact').replace(/\s+/g,'-')+'.vcf', v, 'text/vcard'); }
  }
}
function finishTimer(sp,c){
  const d=c.data; d.endAt=null; d.left=0; d.fin=true; save();
  const p=parseTimer(c.text), msg=`⏱ ${p?p.label:'Timer'} — time’s up`;
  beep(); toast(msg);
  if('Notification' in window && Notification.permission==='granted') try{ new Notification('Sprawl',{body:msg}); }catch(e){}
  if(sp===S()){ refreshCard(c.id); const el=cEl(c.id); if(el){ el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1300); } }
  document.title='⏱ Done — Sprawl'; setTimeout(()=>{ if(document.title.startsWith('⏱')) document.title='Sprawl'; },8000);
}
let tickN=0, tickDay=iso(noon());
setInterval(()=>{
  if(!db) return; tickN++; let run=null;
  if(iso(noon())!==tickDay){ tickDay=iso(noon()); if(!editingId) render(); }
  db.order.forEach(sid=>{ db.spaces[sid].cards.forEach(c=>{ if(c.type!=='timer'||!c.data.endAt) return;
    const left=(c.data.endAt-Date.now())/1000; if(left<=0) return finishTimer(db.spaces[sid],c);
    if(!run || left<run) run=left;
    if(sid===db.current){ const el=cEl(c.id); if(el){ const t=el.querySelector('[data-tm]'), b=el.querySelector('[data-tmbar]'); if(t) t.textContent=fmtClock(left); if(b) b.style.width=clamp(100*(1-left/c.data.dur),0,100)+'%'; } } }); });
  if(run!=null) document.title=`${fmtClock(run)} · Sprawl`; else if(document.title.includes(' · Sprawl')) document.title='Sprawl';
  if(tickN%30===0) S().cards.forEach(c=>{ if(['timezone','countdown','event','reminder'].includes(c.type) && c.id!==editingId) refreshCard(c.id); });
  if(tickN%30===0 && !todayEl.hidden) buildToday();
},1000);

// =====================================================================
// IMAGE STORE — image bytes live in IndexedDB; cards hold an "idb:…" reference that resolves to an object URL.
// localStorage only keeps the small JSON, so saves stay fast and the 5 MB text limit no longer applies to pictures.
// =====================================================================
const IDB={db:null, urls:new Map()};
function idbOpen(){ return new Promise((res,rej)=>{ if(IDB.db) return res(IDB.db); if(!self.indexedDB) return rej(new Error('no idb'));
  const r=indexedDB.open('sprawl-images',1); r.onupgradeneeded=()=>r.result.createObjectStore('img'); r.onsuccess=()=>{ IDB.db=r.result; res(IDB.db); }; r.onerror=()=>rej(r.error); r.onblocked=()=>rej(new Error('blocked')); }); }
const idbTx=(mode,fn)=>idbOpen().then(db=>new Promise((res,rej)=>{ const t=db.transaction('img',mode), q=fn(t.objectStore('img')); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));
const isRef = u => typeof u==='string' && u.startsWith('idb:');
function imgSrc(u){ return !u ? '' : isRef(u) ? (IDB.urls.get(u)||'') : u; }
const blobToDataURL = b => new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(b); });
async function storeImage(x){ // data URL or Blob → "idb:key" (falls back to the data URL when IndexedDB is unavailable)
  try{ const blob = typeof x==='string' ? await (await fetch(x)).blob() : x; const key='idb:'+uid();
    await idbTx('readwrite',st=>st.put(blob,key)); IDB.urls.set(key,URL.createObjectURL(blob)); return key; }
  catch(e){ return typeof x==='string' ? x : await blobToDataURL(x); }
}
function imageHolders(d=db){ // every place an image reference can live: [object, key]
  const out=[];
  for(const sp of Object.values(d.spaces||{})){ sp.cards.forEach(c=>out.push([c,'img'])); (sp.trash||[]).forEach(t=>out.push([t.card,'img'])); if(sp.bg) out.push([sp.bg,'image']); }
  (d.templates||[]).forEach(t=>((t.data||{}).cards||[]).forEach(c=>out.push([c,'img'])));
  return out.filter(([o,k])=>o && o[k]);
}
async function migrateImages(d=db){ let changed=false; for(const [o,k] of imageHolders(d)){ if(o[k].startsWith('data:')){ const key=await storeImage(o[k]); if(key!==o[k]){ o[k]=key; changed=true; } } } return changed; }
async function loadImages(d=db){ for(const [o,k] of imageHolders(d)){ const ref=o[k]; if(!isRef(ref)||IDB.urls.has(ref)) continue;
  try{ const b=await idbTx('readonly',st=>st.get(ref)); IDB.urls.set(ref, b?URL.createObjectURL(b):''); }catch(e){ IDB.urls.set(ref,''); } } }
async function inlineImages(d){ for(const [o,k] of imageHolders(d)){ if(!isRef(o[k])) continue; try{ const b=await idbTx('readonly',st=>st.get(o[k])); o[k]=b?await blobToDataURL(b):''; }catch(e){ o[k]=''; } } return d; }
async function gcImages(){ try{ const used=new Set(imageHolders().map(([o,k])=>o[k])); const keys=await idbTx('readonly',st=>st.getAllKeys()); for(const k of keys||[]) if(!used.has(k)) await idbTx('readwrite',st=>st.delete(k)); }catch(e){} }

// =====================================================================
// IMAGES
// =====================================================================
async function fileToDataURL(file){
  try{
    const bmp=await createImageBitmap(file), max=1000, s=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const cv=document.createElement('canvas'); cv.width=Math.round(bmp.width*s); cv.height=Math.round(bmp.height*s);
    cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
    const png=/png|gif/.test(file.type); let url=cv.toDataURL(png?'image/png':'image/jpeg',.82);
    if(png && url.length>350000) url=cv.toDataURL('image/jpeg',.82);
    return url;
  }catch(e){ return await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
}
function addUrl(u,at){
  u=(u||'').trim(); if(!u) return;
  if(!/^https?:\/\//i.test(u) && !/^data:image\//.test(u)){ if(/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(u)) u='https://'+u; else return toast('That doesn’t look like a link'); }
  const w=at||centerWorld();
  if(/^data:image\//.test(u) || /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(u) || /images\.unsplash\.com|i\.imgur\.com/.test(u)){
    (async()=>{ if(editingId) commitEdit(); pushUndo(); const c=newCard(w.x-130,w.y-90,''); c.img=/^data:/.test(u)?await storeImage(u):u; c.w=260; S().cards.push(c); render(); save(); morph(c.id); toast('Image added'); })();
  } else createCard(w.x-130,w.y-40,u,false);
}
async function addImages(files,wx,wy){
  const imgs=[...files].filter(f=>f.type && f.type.startsWith('image/')); if(!imgs.length) return false;
  if(editingId) commitEdit(); pushUndo(); let i=0;
  for(const f of imgs){ try{ const url=await storeImage(await fileToDataURL(f)); const c=newCard(wx+i*28,wy+i*28,''); c.img=url; c.w=260; S().cards.push(c); sel.add(c.id); i++; }catch(e){ toast('Couldn’t read '+f.name); } }
  render(); save(); return true;
}

// =====================================================================
// TEMPLATES
// =====================================================================
function today(){ return new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); }
function weekStart(){ const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
const C=(id,x,y,text,type='note',extra={})=>Object.assign({id,x,y,text,type},extra);
const K=(from,to,label='',color='')=>({from,to,label,color});
const TEMPLATES=[
  {name:'Kanban board', desc:'to do · doing · done', make:()=>({
    boxes:[{x:0,y:0,w:260,h:380,name:'To do',color:'yellow'},{x:290,y:0,w:260,h:380,name:'Doing',color:'blue'},{x:580,y:0,w:260,h:380,name:'Done',color:'green'}],
    cards:[C('a',20,50,'[ ] First thing','todo'),C('b',20,130,'[ ] Another thing','todo'),C('c',310,50,'[ ] In progress','todo'),C('d',600,50,'[x] Shipped it','todo')],
    connections:[]})},
  {name:'Weekly plan', desc:'priorities, habits, focus', make:()=>{ const days=['Mon','Tue','Wed','Thu','Fri'], base=addDays(-((new Date().getDay()+6)%7));
    return {boxes:days.map((d,i)=>({x:i*250,y:70,w:235,h:280,name:d,color:i%2?'':'gray'})),
      cards:[C('h',0,0,`Week of ${weekStart()}`,'heading',{w:420,frame:'plain'}), ...days.map((d,i)=>C('d'+i,i*250+8,116,`[ ] Top priority @${iso(addDays(i,base))}`,'todo',{w:219})),
        C('g',0,390,'run 3x a week','habit',{w:240}), C('r',260,390,'read daily','habit',{w:240}), C('f',520,390,'50 min deep work','timer',{w:240}),
        C('w',780,390,'**Wins this week**\n- ','note',{w:240,color:'green'})], connections:[]}; }},
  {name:'Decision', desc:'options, pros, cons, vote', make:()=>({boxes:[],
    cards:[C('q',260,0,'What are we deciding, and by when?','question',{w:260}), C('o',0,150,'**Options**\nA —\nB —','note'),
      C('p',260,150,'**Pros**\n- ','note',{color:'green'}), C('c',520,150,'**Cons / risks**\n- ','note',{color:'pink'}),
      C('v',0,300,'Option A or option B?','poll',{w:240}),
      C('d',260,330,'Decision + why','heading',{w:260}), C('n',260,430,'[ ] Tell the people it affects\n[ ] First step','todo',{w:260})],
    connections:[K('q','o'),K('q','p'),K('q','c'),K('o','v'),K('v','d','decides'),K('p','d','for','green'),K('c','d','against','pink'),K('d','n')]})},
  {name:'Meeting notes', desc:'agenda → actions, timer', make:()=>({boxes:[],
    cards:[C('h',0,0,`Meeting — ${today()}`,'heading',{w:340,frame:'plain'}), C('a',0,70,'Who: ','note'), C('g',0,150,'Agenda:\n[ ] \n[ ] ','todo'),
      C('t',0,290,'30 min meeting','timer',{w:240}),
      C('n',280,70,'Notes','note',{w:280,color:'yellow'}), C('x',280,230,'Action items (owner · @date):\n[ ] ','todo',{w:280,color:'blue'})],
    connections:[K('h','a'),K('h','g'),K('g','n'),K('n','x','→')]})},
  {name:'Brainstorm', desc:'one idea, many branches', make:()=>{ const cards=[C('c',0,0,'Central idea','heading',{w:220,color:'purple'})], connections=[];
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2-Math.PI/2; cards.push(C('i'+i,Math.round(Math.cos(a)*300),Math.round(Math.sin(a)*190),'Idea','note',{w:180,frame:'sticky',color:['yellow','pink','blue','green','orange','purple'][i]})); connections.push(K('c','i'+i)); }
    return {boxes:[],cards,connections}; }},
  {name:'Daily journal', desc:'prompts, top 3, focus timer', make:()=>{ const pick=[...PROMPTS].sort(()=>Math.random()-.5).slice(0,3);
    return {boxes:[], cards:[C('h',0,0,today(),'heading',{w:300,frame:'plain'}), C('t',0,70,`Top 3 today:\n[ ] @${iso(noon())}\n[ ] \n[ ] `,'todo',{color:'yellow'}),
      C('f',0,240,'20 min stretch','timer',{w:240}),
      ...pick.map((p,i)=>C('p'+i,270,70+i*95,p,'question',{w:260}))], connections:pick.map((p,i)=>K('h','p'+i))}; }},
  {name:'Project one-pager', desc:'goal → next steps', make:()=>({boxes:[],
    cards:[C('h',220,0,'Project name','heading',{w:260,frame:'plain'}), C('g',0,90,'**Goal** — what does done look like?','note'), C('y',240,90,'**Why it matters** (in business terms)','note'),
      C('s',480,90,'**Stakeholders**\n- ','note'), C('r',120,240,'**Risks / unknowns**\n- ','note',{color:'pink'}), C('n',380,240,'Next steps:\n[ ] ','todo',{color:'blue'}),
      C('k',120,400,'days until 12/1','countdown',{w:240})],
    connections:[K('h','g'),K('h','y'),K('h','s'),K('g','r'),K('g','n')]})},
  {name:'Trip planner', desc:'travel, budget, packing', make:()=>({boxes:[{x:-20,y:60,w:560,h:340,name:'Logistics',color:'blue'}],
    cards:[C('h',0,0,'Trip name','heading',{w:300,frame:'plain'}), C('f',0,110,'flight next friday 9am','event',{w:250}), C('o',270,110,'hotel check-in next friday 3pm','event',{w:250}),
      C('c',0,280,'days until next friday','countdown',{w:250}), C('z',270,280,'time in london','timezone',{w:250}),
      C('p',580,60,'Pack:\n[ ] passport\n[ ] charger\n[ ] ','todo',{color:'yellow'}), C('b',580,230,'split 1200 between 4','split',{w:240})], connections:[K('f','o')]})},
  {name:'Research map', desc:'questions, sources, so what', make:()=>({boxes:[{x:-20,y:120,w:520,h:200,name:'Sources & findings',color:'blue'}],
    cards:[C('h',0,0,'Topic','heading',{w:240}), C('q',280,0,'What do I actually need to know?','question',{w:240}),
      C('s',0,170,'Paste links here — each becomes a link card','note'), C('f',240,170,'Finding:','note'), C('w',140,360,'**So what?** What changes because of this?','note',{color:'yellow',w:260})],
    connections:[K('h','q'),K('q','s'),K('s','f','supports'),K('f','w')]})},
  {name:'SWOT', desc:'strengths · weaknesses · opps · threats', make:()=>({cards:[C('h',0,-70,'SWOT — subject','heading',{w:300,frame:'plain'})],
    boxes:[{x:0,y:0,w:300,h:220,name:'Strengths',color:'green'},{x:320,y:0,w:300,h:220,name:'Weaknesses',color:'pink'},{x:0,y:240,w:300,h:220,name:'Opportunities',color:'blue'},{x:320,y:240,w:300,h:220,name:'Threats',color:'orange'}],
    connections:[]})},
  {name:'Retro', desc:'went well · didn’t · try next', make:()=>({cards:[C('a',20,50,'- ','note'),C('b',300,50,'- ','note'),C('c',580,50,'[ ] ','todo')],
    boxes:[{x:0,y:0,w:260,h:320,name:'Went well',color:'green'},{x:280,y:0,w:260,h:320,name:'Didn’t',color:'pink'},{x:560,y:0,w:260,h:320,name:'Try next',color:'blue'}], connections:[]})},
  {name:'Pitch deck', desc:'boxes = slides · press P', make:()=>{ const sl=['Problem','Solution','Why now','Ask'];
    return {boxes:sl.map((n,i)=>({x:i*520,y:0,w:480,h:300,name:`${i+1}. ${n}`,color:['pink','green','blue','yellow'][i]})),
      cards:sl.map((n,i)=>C('s'+i,i*520+30,60,`**${n}**\n- point one\n- point two`,'note',{w:420,frame:'plain'})), connections:[]}; }},
];
function freeSpot(bw,bh){
  const cw=centerWorld(); const x=cw.x-bw/2, y=cw.y-bh/2;
  const rs=contentRects(null), hits=r=>r.x<x+bw+30&&r.x+r.w>x-30&&r.y<y+bh+30&&r.y+r.h>y-30;
  if(!rs.some(hits)) return {x,y,moved:false};
  const band=rs.filter(r=>r.y<y+bh+300&&r.y+r.h>y-300), maxR=Math.max(...(band.length?band:rs).map(r=>r.x+r.w));
  return {x:maxR+120, y, moved:true};
}
function insertTemplate(t,at){
  if(editingId) commitEdit();
  const data = t.make ? t.make() : JSON.parse(JSON.stringify(t.data));
  const b=bbox([...(data.cards||[]).map(c=>({x:c.x,y:c.y,w:c.w||220,h:80})), ...(data.boxes||[])]); if(!b) return;
  pushUndo();
  const spot = at ? {x:at.x,y:at.y,moved:false} : freeSpot(b.x2-b.x1,b.y2-b.y1);
  const ox=spot.x-b.x1, oy=spot.y-b.y1, map={}, sp=S(), now=Date.now();
  sel.clear();
  (data.boxes||[]).forEach(bx=>sp.boxes.push({name:'Box',color:'',...bx,id:uid(),x:Math.round(bx.x+ox),y:Math.round(bx.y+oy)}));
  (data.cards||[]).forEach(c=>{ const n={...newCard(0,0,''),...JSON.parse(JSON.stringify(c)),auto:false,manual:true,id:uid(),x:Math.round(c.x+ox),y:Math.round(c.y+oy),created:now,updated:now}; n.data={}; map[c.id]=n.id; sp.cards.push(n); sel.add(n.id); });
  (data.connections||[]).forEach(k=>{ if(map[k.from]&&map[k.to]) sp.connections.push({id:uid(),label:k.label||'',color:k.color||'',from:map[k.from],to:map[k.to]}); });
  render(); save(); toast(`Added “${t.name}”`);
  if(spot.moved){ const v=V(); v.x=innerWidth/2-(spot.x+(b.x2-b.x1)/2)*v.z; v.y=innerHeight/2-(spot.y+(b.y2-b.y1)/2)*v.z; applyView(); }
}
function saveAsTemplate(){
  const ids=[...sel]; if(!ids.length) return toast('Select some cards first');
  const name=prompt('Template name','My template'); if(!name) return;
  const set=new Set(ids), sp=S();
  const cards=ids.map(find).filter(Boolean).map(c=>({...c,data:{}}));
  const connections=sp.connections.filter(k=>set.has(k.from)&&set.has(k.to)).map(k=>({...k}));
  const boxes=sp.boxes.filter(b=>cardsInBox(b).some(c=>set.has(c.id))).map(b=>({...b}));
  db.templates.push({id:uid(),name,data:{cards,boxes,connections}}); save(); toast(`Saved template “${name}”`);
}

// =====================================================================
// EXPORT: markdown, JSON canvas
// =====================================================================
function mdOf(c){
  const t=c.text.trim(); let o;
  if(c.type==='heading') o='## '+t.replace(/^#+\s*/,'');
  else if(c.type==='todo') o=t.split('\n').map(l=>/^\s*\[( |x)\]/i.test(l)?'- '+l.trim().replace(/^\[X\]/,'[x]'):'**'+l.trim()+'**').join('\n');
  else if(c.type==='question') o='**Q:** '+t;
  else if(c.type==='quote') o=t.split('\n').map(l=>'> '+l.replace(/^>\s?/,'')).join('\n');
  else if(c.type==='calc'){ const p=parseCalc(t); o=p?`${p.expr} = **${fmtNum(p.v,6)}**`:t; }
  else if(c.type==='convert'){ const p=parseConvert(t); o=p?`${fmtNum(p.v,4)} ${p.from} = **${fmtNum(p.out,4)} ${p.to}**`:t; }
  else if(c.type==='split'){ const p=parseSplit(t); o=p?`${t} → **${money(p.total*(1+p.tip/100)/p.n,p.cur)} each**`:t; }
  else if(c.type==='event'){ const e=parseEvent(c); o=`📅 **${e.title}** — ${e.date||''}${e.time?' '+fmtTime(e.time.h,e.time.m):''}`; }
  else if(c.type==='poll'){ const p=parsePoll(t); const v=c.data.votes||{}; o=p?`📊 ${p.title||'Poll'}\n`+p.opts.map(x=>`- ${x}: ${v[x]||0}`).join('\n'):t; }
  else if(c.type==='goal'){ const p=parseGoal(t); o=p?`🎯 ${p.title} — ${c.data.done??p.done}/${p.target}`:t; }
  else o=(SMART.has(c.type)?ICON[c.type]+' ':'')+t;
  if(c.img) o=((c.img.startsWith('data:')||isRef(c.img))?'*[image]*':`![](${c.img})`)+(o?'\n'+o:'');
  return o;
}
function spaceMarkdown(sp){
  const used=new Set(), sortC=a=>a.sort((p,q)=>p.y-q.y||p.x-q.x); let out=`# ${sp.name}\n\n`;
  [...sp.boxes].sort((a,b)=>a.y-b.y||a.x-b.x).forEach(b=>{ const cs=sortC(cardsInBox(b,sp).filter(c=>!used.has(c.id))); if(!cs.length) return; out+=`## ${b.name||'Box'}\n\n`; cs.forEach(c=>{ used.add(c.id); out+=mdOf(c)+'\n\n'; }); });
  sortC(sp.cards.filter(c=>!used.has(c.id))).forEach(c=>out+=mdOf(c)+'\n\n');
  return out;
}
async function copyMd(ids){
  const cs=ids.map(find).filter(Boolean).sort((p,q)=>p.y-q.y||p.x-q.x); const md=cs.map(mdOf).join('\n\n');
  try{ await navigator.clipboard.writeText(md); toast(`Copied ${cs.length} card${cs.length>1?'s':''} as Markdown`); }catch(e){ toast('Clipboard blocked by the browser'); }
}
const JC_COLOR={pink:'1',orange:'2',yellow:'3',green:'4',blue:'5',purple:'6'}, JC_BACK=Object.fromEntries(Object.entries(JC_COLOR).map(([a,b])=>[b,a]));
function toJsonCanvas(sp){
  const nodes=[...sp.boxes.map(b=>({id:b.id,type:'group',label:b.name||'',x:Math.round(b.x),y:Math.round(b.y),width:Math.round(b.w),height:Math.round(b.h),...(JC_COLOR[b.color]?{color:JC_COLOR[b.color]}:{})})),
    ...sp.cards.map(c=>{ const el=sp===S()?cEl(c.id):null; return {id:c.id,type:'text',text:mdOf(c),x:Math.round(c.x),y:Math.round(c.y),width:Math.round(c.w||220),height:Math.round(el?el.offsetHeight:80),...(JC_COLOR[c.color]?{color:JC_COLOR[c.color]}:{})}; })];
  const edges=sp.connections.map(k=>({id:k.id,fromNode:k.from,toNode:k.to,toEnd:'arrow',...(k.label?{label:k.label}:{}),...(JC_COLOR[k.color]?{color:JC_COLOR[k.color]}:{})}));
  return {nodes,edges};
}
function fromJsonCanvas(d,name){
  const s=newSpace(name||'Imported canvas'); const now=Date.now();
  (d.nodes||[]).forEach(n=>{
    const color=JC_BACK[n.color]||'';
    if(n.type==='group') s.boxes.push({id:n.id||uid(),x:n.x,y:n.y,w:n.width,h:n.height,name:n.label||'Group',color});
    else { const text=n.type==='text'?n.text:n.type==='link'?n.url:n.type==='file'?`[[${n.file}]]`:''; const c={...newCard(n.x,n.y,text||''),id:n.id||uid(),w:n.width||220,color,created:now,updated:now};
      c.type=classify(c.text); c.auto=true; c.text=transform(c.type,c.text); s.cards.push(c); }
  });
  (d.edges||[]).forEach(e=>s.connections.push({id:e.id||uid(),from:e.fromNode,to:e.toNode,label:e.label||'',color:JC_BACK[e.color]||''}));
  return s;
}

// =====================================================================
// POPOVERS / MENUS
// =====================================================================
let pop=null, popJustClosed=false;
function openPop(x,y,html,onAct,cls=''){
  closePop();
  pop=document.createElement('div'); pop.className='pop ui '+cls; pop.innerHTML=html; document.body.appendChild(pop);
  const r=pop.getBoundingClientRect();
  pop.style.left=clamp(x,8,innerWidth-r.width-8)+'px'; pop.style.top=clamp(y,8,innerHeight-r.height-8)+'px';
  pop.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(b && !b.disabled) onAct(b.dataset.act,b,e); });
  return pop;
}
function closePop(){ if(pop){ pop.remove(); pop=null; } }
function closePanels(){ settingsEl.hidden=true; todayEl.hidden=true; styleEl.hidden=true; $('#todayBtn').classList.remove('on'); $('#styleBtn').classList.remove('on'); }
document.addEventListener('pointerdown',e=>{
  popJustClosed=false;
  if(pop && !pop.contains(e.target)){ closePop(); popJustClosed=true; }
  if((!settingsEl.hidden || !todayEl.hidden || !styleEl.hidden) && !e.target.closest('.panel') && !e.target.closest('[data-panelbtn]') && !e.target.closest('.pop') && !e.target.closest('#engine')){ closePanels(); popJustClosed=true; }
},true);
const swatches = (cur, prefix='color') => COLORS.map(c=>`<button class="sw ${c?'':'none'}" data-act="${prefix}:${c}" title="${c||'none'}" style="${c?`background:var(--c-${c})`:''}${cur===c?';outline:2px solid var(--accent);outline-offset:1px':''}"></button>`).join('');
const inkSwatches = (cur, prefix) => ['',...Object.keys(INK)].map(c=>`<button class="sw" data-act="${prefix}:${c}" title="${c||'ink'}" style="background:${c?INK[c]:'var(--ink)'}${cur===c?';outline:2px solid var(--accent);outline-offset:1px':''}"></button>`).join('');

function cardMenu(id,x,y){
  const c=find(id); if(!c) return;
  const fits=rank(c.text).filter(r=>r.score>=.3).map(r=>r.type);
  const smartList=[...new Set([...fits.filter(t=>SMART.has(t)), ...enabledTypes().filter(t=>SMART.has(t)), ...(SMART.has(c.type)?[c.type]:[])])];
  openPop(x,y,`<div class="ph">${TI(c.type)} ${TYPE_META[c.type].l}${c.manual?'':' · auto'}<span class="meta">edited ${ago(c.updated||c.created)}</span></div>
    <div class="row tight">${BASIC.map(t=>`<button class="chip ${c.type===t?'on':''}" data-act="type:${t}" title="${TYPE_META[t].l}">${TI(t)}</button>`).join('')}<button class="chip ${c.manual?'':'on'}" data-act="auto" title="Auto-detect shape">✨</button></div>
    <div class="row tight">${smartList.map(t=>`<button class="chip ${c.type===t?'on':''}" data-act="type:${t}" title="${TYPE_META[t].l}${fits.includes(t)?' — fits this text':''}" style="${fits.includes(t)&&c.type!==t?'border-color:var(--accent)!important':''}">${TI(t)}</button>`).join('')}</div>
    <div class="row">${swatches(c.color)}</div>
    <div class="row tight">${FRAMES.map(([f,i,n])=>`<button class="chip ${(c.frame||'')===f?'on':''}" data-act="frame:${f}" title="${n}">${i}</button>`).join('')}</div><hr>
    <button data-act="edit"><span class="ico">${I('edit')}</span>Edit<kbd>↵</kbd></button>
    <button data-act="img"><span class="ico">${I('image')}</span>${c.img?'Replace image…':'Add image…'}</button>${c.img?`<button data-act="noimg"><span class="ico">${I('x')}</span>Remove image</button>`:''}
    <button data-act="size"><span class="ico">${I('resize')}</span>Reset size</button>
    <button data-act="select"><span class="ico">${I('select2')}</span>${sel.has(id)?'Deselect':'Select'}</button>
    <button data-act="lock"><span class="ico">${I(c.locked?'unlock':'lock')}</span>${c.locked?'Unlock':'Lock to background'}<kbd>L</kbd></button>
    <button data-act="dup"><span class="ico">${I('copy')}</span>Duplicate<kbd>⌘D</kbd></button>
    <button data-act="move"><span class="ico">${I('move')}</span>Move to space…</button>
    <button data-act="md"><span class="ico">${I('clip')}</span>Copy as Markdown</button>
    <hr><button data-act="del" class="danger"><span class="ico">${I('trash')}</span>Delete<kbd>Del</kbd></button>`,
    act=>{
      if(act.startsWith('type:')) setType([id],act.slice(5));
      else if(act==='auto') setAuto(id);
      else if(act.startsWith('color:')||act.startsWith('frame:')){ setProp([id],act.split(':')[0],act.slice(act.indexOf(':')+1)); const r=pop&&pop.getBoundingClientRect(); return cardMenu(id,r?r.left:x,r?r.top:y); }
      else if(act==='img'){ imgTarget=id; $('#imgFile').click(); }
      else if(act==='noimg'){ setProp([id],'img',''); }
      else if(act==='size'){ resetCardSize(id); }
      else if(act==='edit') startEdit(id);
      else if(act==='select'){ if(editingId) commitEdit(); sel.has(id)?sel.delete(id):sel.add(id); render(); }
      else if(act==='lock') toggleLock([id]);
      else if(act==='dup') duplicate([id]);
      else if(act==='move') return moveMenu([id],x,y);
      else if(act==='md') copyMd([id]);
      else if(act==='del'){ pushUndo(); removeCards([id]); render(); save(); }
      closePop();
    });
}
function moveMenu(ids,x,y){
  const others=db.order.filter(i=>i!==db.current);
  openPop(x,y,`<div class="ph">Move ${ids.length} card${ids.length>1?'s':''} to</div>`+(others.map(i=>`<button data-act="to:${i}"><span class="ico">${db.spaces[i].kind==='inbox'?'📥':'◇'}</span>${esc(db.spaces[i].name)}</button>`).join('')||'<div class="empty">No other spaces yet</div>')+
    `<hr><button data-act="new"><span class="ico">＋</span>New space…</button>`,
    act=>{ closePop(); if(act.startsWith('to:')) moveCards(ids,act.slice(3)); else if(act==='new'){ const n=prompt('New space name','Untitled'); if(!n) return; const s=newSpace(n); db.spaces[s.id]=s; db.order.push(s.id); moveCards(ids,s.id); } });
}
function connMenu(kid,x,y){
  const k=S().connections.find(q=>q.id===kid); if(!k) return;
  const recents=legendCombos().filter(c=>c.key!==comboKey(k)).slice(0,6);
  const p=openPop(x,y,`<div class="ph">Connection</div><div class="row"><input id="clab" placeholder="Label — because, blocks, leads to…" value="${esc(k.label||'')}"></div>
    ${recents.length?`<div class="row tight">${recents.map((c,i)=>`<button class="chip" data-act="combo:${i}" style="color:${c.color?INK[c.color]:'inherit'}">${esc(c.label)}</button>`).join('')}</div>`:''}
    <div class="row">${inkSwatches(k.color||'','color')}</div>
    <button data-act="flip"><span class="ico">⇄</span>Reverse direction</button><button data-act="del" class="danger"><span class="ico">✕</span>Delete connection</button>`,
    act=>{ pushUndo();
      if(act==='del') S().connections=S().connections.filter(q=>q.id!==kid);
      else if(act==='flip') [k.from,k.to]=[k.to,k.from];
      else if(act.startsWith('combo:')){ const c=recents[+act.slice(6)]; k.label=c.label; k.color=c.color; }
      else if(act.startsWith('color:')) k.color=act.slice(6);
      drawLines(); save(); closePop(); });
  const inp=p.querySelector('#clab');
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'||e.key==='Escape') closePop(); });
  let pushed=false;
  inp.addEventListener('input',()=>{ if(!pushed){ pushUndo(); pushed=true; } k.label=inp.value; drawLines(); save(); });
  if(matchMedia('(hover:hover)').matches) setTimeout(()=>inp.focus(),0);
}
function boxMenu(bid,x,y){
  const b=findBox(bid); if(!b) return;
  const st=b.style||'soft';
  const p=openPop(x,y,`<div class="row"><input id="bname" class="bname" value="${esc(b.name||'')}" placeholder="Box name"></div>
    <div class="ph">Icon</div><div class="row tight emo">${BOX_EMOJI.map(e=>`<button class="chip ${(b.emoji||'')===e?'on':''}" data-act="emoji:${e}">${e||'∅'}</button>`).join('')}</div>
    <div class="ph">Color</div><div class="row">${swatches(b.color)}</div>
    <div class="ph">Style</div><div class="row"><div class="seg" style="flex:1">${[['soft','Soft'],['solid','Solid'],['outline','Outline'],['dashed','Dashed']].map(([k,l])=>`<button class="${st===k?'on':''}" data-act="style:${k}">${l}</button>`).join('')}</div></div><hr>
    <button data-act="select"><span class="ico">${I('select2')}</span>Select cards inside</button>
    <button data-act="fit"><span class="ico">${I('resize')}</span>Fit box to its cards</button>
    <button data-act="present"><span class="ico">${I('play')}</span>Present from here</button>
    <hr><button data-act="del" class="danger"><span class="ico">${I('trash')}</span>Delete box (keep cards)</button>`,
    act=>{
      const keep=()=>{ const r=pop&&pop.getBoundingClientRect(); boxMenu(bid,r?r.left:x,r?r.top:y); };
      if(act.startsWith('emoji:')){ pushUndo(); b.emoji=act.slice(6); render(); save(); return keep(); }
      if(act.startsWith('color:')){ pushUndo(); b.color=act.slice(6); render(); save(); return keep(); }
      if(act.startsWith('style:')){ pushUndo(); b.style=act.slice(6); render(); save(); return keep(); }
      closePop();
      if(act==='select'){ sel.clear(); cardsInBox(b).forEach(c=>sel.add(c.id)); render(); }
      else if(act==='present') startPresent(bid);
      else if(act==='fit') resetBoxSize(bid);
      else if(act==='del'){ pushUndo(); S().boxes=S().boxes.filter(q=>q.id!==bid); render(); save(); } }, 'wide');
  const inp=p.querySelector('#bname'); let pushed=false;
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'||e.key==='Escape') closePop(); });
  inp.addEventListener('input',()=>{ if(!pushed){ pushUndo(); pushed=true; } b.name=inp.value; const n=bEl(bid)?.querySelector('.box-name'); if(n) n.textContent=b.name||'Box'; save(); });
}
function bgMenu(sx,sy){
  const w=toWorld(sx,sy);
  openPop(sx,sy,`<button data-act="card"><span class="ico">＋</span>New card here</button>
    <button data-act="shape"><span class="ico">◆</span>New shaped card…</button>
    <button data-act="box"><span class="ico">▢</span>New box here</button>
    <button data-act="img"><span class="ico">🖼</span>Image from file…</button>
    <button data-act="tpl"><span class="ico">▦</span>Template here…</button><hr>
    <button data-act="draw"><span class="ico">✎</span>Draw<kbd>D</kbd></button>
    <button data-act="selmode"><span class="ico">⬚</span>${selectMode?'Exit select mode':'Select mode'}</button>
    <button data-act="all"><span class="ico">▣</span>Select all<kbd>⌘A</kbd></button>
    <button data-act="fit"><span class="ico">⤢</span>Zoom to fit<kbd>F</kbd></button>
    <button data-act="present"><span class="ico">▶</span>Present boxes<kbd>P</kbd></button>
    <button data-act="search"><span class="ico">⌕</span>Search…<kbd>⌘K</kbd></button>`,
    act=>{ closePop();
      if(act==='card') createCard(w.x-16,w.y-16);
      else if(act==='shape'){ const c=createCard(w.x-16,w.y-16); const ta=cardsEl.querySelector('textarea'); if(ta){ ta.value='/'; c.text='/'; onLiveInput(c); } }
      else if(act==='box') newBox(w);
      else if(act==='img'){ imgAt=w; $('#imgFile').click(); }
      else if(act==='tpl') templateMenu(sx,sy,w);
      else if(act==='draw') toggleDraw();
      else if(act==='selmode') toggleSelectMode();
      else if(act==='all'){ S().cards.forEach(c=>{ if(!c.locked) sel.add(c.id); }); render(); }
      else if(act==='fit') zoomFit();
      else if(act==='present') startPresent();
      else if(act==='search') openPalette(); });
}
function contextMenu(sx,sy,t){
  if(editingId) commitEdit();
  const ce=t.closest&&t.closest('.card'); if(ce) return cardMenu(ce.dataset.id,sx,sy);
  if(t.dataset&&t.dataset.conn) return connMenu(t.dataset.conn,sx,sy);
  const be=t.closest&&t.closest('.box'); if(be) return boxMenu(be.dataset.box,sx,sy);
  bgMenu(sx,sy);
}
function spaceMenu(){
  const r=$('#spaceBtn').getBoundingClientRect(), cur=S();
  const ids=[...db.order].sort((a,b)=>(db.spaces[b].pinned?1:0)-(db.spaces[a].pinned?1:0));
  const back=db.order.filter(i=>i!==db.current && db.spaces[i].cards.some(c=>c.text.toLowerCase().includes(`[[${cur.name.toLowerCase()}]]`)));
  openPop(r.left,r.bottom+6,`<div class="ph">Spaces</div>`+ids.map(id=>{ const s=db.spaces[id]; return `<button data-act="go:${id}" class="${id===db.current?'on':''}"><span class="ico">${s.kind==='inbox'?'📥':'◇'}</span>${esc(s.name)}<span class="desc">${s.cards.length}</span><span class="x" data-act="pin:${id}" title="${s.pinned?'Unpin':'Pin to top'}">${s.pinned?'★':'☆'}</span></button>`; }).join('')+
    (back.length?`<hr><div class="ph">Linked from</div>`+back.map(id=>`<button data-act="go:${id}"><span class="ico">↖</span>${esc(db.spaces[id].name)}</button>`).join(''):'')+
    `<hr><button data-act="new"><span class="ico">＋</span>New space</button><button data-act="rename"><span class="ico">✎</span>Rename this space</button><button data-act="dup"><span class="ico">⧉</span>Duplicate this space</button>`+
    (cur.trash.length?`<button data-act="trash"><span class="ico">🗑</span>Recently removed<span class="desc">${cur.trash.length}</span></button>`:'')+
    `<button data-act="del" class="danger"><span class="ico">✕</span>Delete this space</button>`,
    (act,b,e)=>{
      if(act.startsWith('pin:')){ e.stopPropagation(); const s=db.spaces[act.slice(4)]; s.pinned=!s.pinned; save(); return spaceMenu(); }
      closePop();
      if(act.startsWith('go:')) return switchSpace(act.slice(3));
      if(act==='new') newSpacePrompt();
      if(act==='rename'){ const n=prompt('Rename space',cur.name); if(n){ cur.name=n; render(); save(); } }
      if(act==='dup'){ const s=JSON.parse(snap()); s.id=uid(); s.name=cur.name+' copy'; s.kind=''; db.spaces[s.id]=s; db.order.push(s.id); switchSpace(s.id); }
      if(act==='trash') trashMenu(r.left,r.bottom+6);
      if(act==='del'){ if(db.order.length<2) return toast('You need at least one space'); if(!confirm(`Delete “${cur.name}”? This can’t be undone.`)) return;
        const id=db.current; delete db.spaces[id]; db.order=db.order.filter(i=>i!==id); switchSpace(db.order[0]); } });
}
function newSpacePrompt(){ const n=prompt('Space name','Untitled'); if(!n) return; const s=newSpace(n); db.spaces[s.id]=s; db.order.push(s.id); switchSpace(s.id); }
function trashMenu(x,y){
  const t=S().trash;
  openPop(x,y,`<div class="ph">Recently removed</div>`+(t.slice(0,40).map((it,i)=>`<button data-act="r:${i}"><span class="ico">${it.card.img?I('image'):TI(it.card.type)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((it.card.text||'image').replace(/\s+/g,' ').slice(0,40))}</span><span class="desc">${ago(it.at)}</span></button>`).join('')||'<div class="empty">Nothing here</div>')+
    (t.length?`<hr><button data-act="empty" class="danger"><span class="ico">✕</span>Empty permanently</button>`:''),
    act=>{ closePop(); if(act.startsWith('r:')){ restoreTrash(+act.slice(2)); toast('Restored'); } else if(act==='empty'){ S().trash=[]; save(); toast('Emptied'); } });
}
function templateMenu(x,y,at){
  const custom=db.templates.map(t=>`<button data-act="c:${t.id}"><span class="ico">★</span>${esc(t.name)}<span class="x" data-act="x:${t.id}" title="Delete template">✕</span></button>`).join('');
  openPop(x,y,`<div class="ph">Templates</div>`+TEMPLATES.map((t,i)=>`<button data-act="b:${i}"><span class="ico">▦</span>${t.name}<span class="desc">${t.desc}</span></button>`).join('')+
    (custom?`<hr><div class="ph">Yours</div>${custom}`:'')+`<hr><button data-act="save" ${sel.size?'':'disabled style="opacity:.45"'}><span class="ico">＋</span>Save selection as template</button>`,
    (act,b,e)=>{
      if(act.startsWith('x:')){ e.stopPropagation(); const id=act.slice(2); db.templates=db.templates.filter(t=>t.id!==id); save(); return templateMenu(x,y,at); }
      closePop();
      if(act.startsWith('b:')) insertTemplate(TEMPLATES[+act.slice(2)],at);
      else if(act.startsWith('c:')){ const t=db.templates.find(q=>q.id===act.slice(2)); if(t) insertTemplate(t,at); }
      else if(act==='save') saveAsTemplate(); });
}
function insertMenu(){
  const r=$('#addBtn').getBoundingClientRect();
  const tile=(act,ic,l)=>`<button class="tile" data-act="${act}">${I(ic)}<span>${l}</span></button>`;
  const p=openPop(r.left-130,r.bottom+6,`<div class="urlrow"><input id="addUrl" placeholder="Paste a link or image URL…" autocomplete="off"><button data-act="url">Add</button></div>
    <div class="tiles">${tile('card','card','Card')}${tile('image','image','Image')}${tile('link','link','Link')}${tile('box','box','Box')}
      ${tile('shape','spark','Shape')}${tile('tpl','grid','Template')}${tile('draw','pen','Draw')}${tile('space','layers','Space')}</div>
    <div class="ph">Shaped cards <span class="meta">type / in any card</span></div><div class="shapes">${enabledTypes().filter(t=>SMART.has(t)).map(t=>`<button class="shape" data-act="shape:${t}" title="${esc(TYPE_META[t].ex)}">${TI(t)}<span>${TYPE_META[t].l}</span></button>`).join('')}</div>
    <div class="ph" style="text-transform:none;letter-spacing:0">Tip: drop or paste images and links straight onto the canvas.</div>`,
    act=>{
      if(act==='link'){ p.querySelector('#addUrl').focus(); return; }
      if(act==='url'){ const v=p.querySelector('#addUrl').value; closePop(); return addUrl(v); }
      closePop();
      if(act==='card'){ const w=centerWorld(); createCard(w.x-110,w.y-20); }
      else if(act==='shape'){ const w=centerWorld(); const c=createCard(w.x-120,w.y-30); const ta=cardsEl.querySelector('textarea'); if(ta){ ta.value='/'; c.text='/'; onLiveInput(c); } }
      else if(act.startsWith('shape:')){ const t=act.slice(6), w=centerWorld(); const c=createCard(w.x-120,w.y-30); slashChoose(c,t); }
      else if(act==='box') sel.size?boxAround([...sel]):newBox();
      else if(act==='image'){ imgAt=null; imgTarget=null; $('#imgFile').click(); }
      else if(act==='tpl') templateMenu(r.left-130,r.bottom+6);
      else if(act==='draw') toggleDraw(true);
      else if(act==='space') newSpacePrompt(); }, 'wide');
  const inp=p.querySelector('#addUrl');
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'){ const v=inp.value; closePop(); addUrl(v); } if(e.key==='Escape') closePop(); });
  if(matchMedia('(hover:hover)').matches) setTimeout(()=>inp.focus(),0);
}
function alignMenu(x,y){
  openPop(x,y,`<div class="ph">Arrange</div>
    <div class="row tight"><button class="chip" data-act="left" title="Align left">⇤</button><button class="chip" data-act="center" title="Align centers">↔</button><button class="chip" data-act="right" title="Align right">⇥</button>
    <button class="chip" data-act="top" title="Align top">⤒</button><button class="chip" data-act="middle" title="Align middles">↕</button><button class="chip" data-act="bottom" title="Align bottom">⤓</button></div><hr>
    <button data-act="stack"><span class="ico">☰</span>Stack as a list</button><button data-act="row"><span class="ico">⋯</span>Line up in a row</button>
    <button data-act="grid"><span class="ico">▦</span>Tidy into a grid</button>
    <button data-act="distH"><span class="ico">⟷</span>Distribute horizontally</button><button data-act="distV"><span class="ico">↕</span>Distribute vertically</button>`,
    act=>{ closePop(); align(act); });
}
function renderSelbar(){
  if(!sel.size || drawMode || pres){ selbar.hidden=true; return; }
  const ids=[...sel], first=find(ids[0]);
  selbar.hidden=false;
  selbar.innerHTML=`<span class="count">${ids.length} selected</span><span class="sep"></span>`+
    BASIC.map(t=>`<button data-act="type:${t}" title="${TYPE_META[t].l}" style="${ids.every(i=>find(i)?.type===t)?'color:var(--accent)':''}">${TI(t)}</button>`).join('')+
    `<button data-act="auto" title="Re-detect shapes">✨</button><span class="sep"></span>${swatches(ids.length===1&&first?first.color:null)}<span class="sep"></span>`+
    `<button data-act="align" title="Align & arrange">${I('align')} Arrange</button><button data-act="box" title="Box (B)">${I('box')}</button><button data-act="move" title="Move to space">${I('move')}</button>`+
    `<button data-act="lock" title="Lock (L)">${I('lock')}</button><button data-act="dup" title="Duplicate (⌘D)">${I('copy')}</button><button data-act="md" title="Copy as Markdown">${I('clip')}</button>`+
    `<button data-act="tpl" title="Save as template">${I('star')}</button><button data-act="del" class="danger" title="Delete">${I('trash')}</button>`;
}
selbar.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return; const act=b.dataset.act, ids=[...sel], r=b.getBoundingClientRect();
  if(act.startsWith('type:')) setType(ids,act.slice(5));
  else if(act==='auto') ids.forEach(setAuto);
  else if(act.startsWith('color:')) setProp(ids,'color',act.slice(6));
  else if(act==='align') alignMenu(r.left,r.top-300);
  else if(act==='box') boxAround(ids);
  else if(act==='move') moveMenu(ids,r.left,r.top-220);
  else if(act==='lock') toggleLock(ids);
  else if(act==='dup') duplicate(ids);
  else if(act==='md') copyMd(ids);
  else if(act==='tpl') saveAsTemplate();
  else if(act==='del') delSelected();
});

// =====================================================================
// DRAWING
// =====================================================================
function toggleDraw(force){
  drawMode = force==null ? !drawMode : force;
  if(drawMode){ if(editingId) commitEdit(); sel.clear(); closePop(); selectMode=false; }
  document.body.classList.toggle('drawing',drawMode);
  document.body.classList.toggle('erasing',drawMode&&drawTool.erase);
  drawbar.hidden=!drawMode; renderDrawbar(); render();
  if(drawMode) toast('Drawing — pick ink & width up top. Esc or D to finish.');
}
function renderDrawbar(){
  drawbar.innerHTML=inkSwatches(drawTool.color,'ink')+'<span class="sep"></span>'+
    [2,4,8].map(w=>`<button data-act="w:${w}" class="${drawTool.w===w&&!drawTool.erase?'on':''}" title="${w}px"><span class="dotw" style="width:${w+3}px;height:${w+3}px"></span></button>`).join('')+
    `<button data-act="erase" class="${drawTool.erase?'on':''}" title="Eraser">⌫ Erase</button><span class="sep"></span><button data-act="clear" title="Clear all drawings">Clear</button><button data-act="done"><b>Done</b></button>`;
}
drawbar.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act;
  if(a.startsWith('ink:')){ drawTool.color=a.slice(4); drawTool.erase=false; }
  else if(a.startsWith('w:')){ drawTool.w=+a.slice(2); drawTool.erase=false; }
  else if(a==='erase') drawTool.erase=!drawTool.erase;
  else if(a==='clear'){ if(S().strokes.length && confirm('Clear all drawings in this space?')){ pushUndo(); S().strokes=[]; drawInk(); save(); } }
  else if(a==='done') return toggleDraw(false);
  document.body.classList.toggle('erasing',drawTool.erase); renderDrawbar();
});
function startStroke(sx,sy){
  pushUndo(); const w=toWorld(sx,sy);
  const k={id:uid(),pts:[r1(w.x),r1(w.y)],color:drawTool.color,w:drawTool.w}; S().strokes.push(k);
  drag={kind:'draw',k,lx:w.x,ly:w.y}; updateLive(k);
}
function updateLive(k){ const p=inkSvg.querySelector('#liveStroke'); if(!p) return; p.setAttribute('d',strokePath(k.pts)); p.style.stroke=k.color?INK[k.color]:'var(--ink)'; p.setAttribute('stroke-width',k.w); }
function eraseAt(sx,sy,d){
  const el=document.elementFromPoint(sx,sy);
  if(el && el.dataset && el.dataset.stroke){ if(!d.pushed){ pushUndo(); d.pushed=true; } S().strokes=S().strokes.filter(k=>k.id!==el.dataset.stroke); drawInk(); }
}

// =====================================================================
// PRESENTATION (boxes are slides)
// =====================================================================
function startPresent(fromBox){
  if(editingId) commitEdit();
  const boxes=[...S().boxes].sort((a,b)=>Math.abs(a.y-b.y)<120?a.x-b.x:a.y-b.y);
  if(!boxes.length) return toast('Add boxes — each box becomes a slide (try the Pitch deck template)');
  pres={slides:boxes, i:Math.max(0,boxes.findIndex(b=>b.id===fromBox)), saved:{...V()}};
  sel.clear(); closePop(); closePanels(); document.body.classList.add('presenting'); presbar.hidden=false;
  render(); goSlide(pres.i);
  try{ if(document.documentElement.requestFullscreen && innerWidth>700) document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){}
}
function goSlide(i){
  if(!pres) return; pres.i=clamp(i,0,pres.slides.length-1); const b=pres.slides[pres.i];
  world.classList.add('anim'); fitRect({x1:b.x,y1:b.y,x2:b.x+b.w,y2:b.y+b.h},30,30,3,.15); setTimeout(()=>world.classList.remove('anim'),600);
  presbar.innerHTML=`<button data-act="prev">←</button><span class="count">${pres.i+1} / ${pres.slides.length} · ${esc(b.name||'')}</span><button data-act="next">→</button><span class="sep"></span><button data-act="end">Exit</button>`;
}
function endPresent(){ if(!pres) return; const v=V(); Object.assign(v,pres.saved); pres=null; document.body.classList.remove('presenting'); presbar.hidden=true; applyView(); render(); try{ if(document.fullscreenElement) document.exitFullscreen(); }catch(e){} }
presbar.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(!b||!pres) return; const a=b.dataset.act; if(a==='prev') goSlide(pres.i-1); else if(a==='next') goSlide(pres.i+1); else endPresent(); });

// =====================================================================
// POINTER INPUT
// =====================================================================
const pointers=new Map(); let drag=null, lpTimer=null, imgAt=null, imgTarget=null, dropT=null;
viewport.addEventListener('pointerdown',onDown);
addEventListener('pointermove',onMove);
addEventListener('pointerup',onUp);
addEventListener('pointercancel',onUp);
viewport.addEventListener('contextmenu',e=>{ if(e.target.closest('textarea')) return; e.preventDefault(); if(drawMode||pres) return; clearLP(); drag=null; contextMenu(e.clientX,e.clientY,e.target); });
function clearLP(){ clearTimeout(lpTimer); lpTimer=null; }
function armLP(e,sx,sy,t){
  if(e.pointerType==='mouse') return; clearLP();
  lpTimer=setTimeout(()=>{ if(drag && !drag.moved && pointers.size===1){ drag=null; cardsEl.classList.remove('dragging'); if(navigator.vibrate) navigator.vibrate(12); contextMenu(sx,sy,t); popJustClosed=false; } },480);
}
function startPinch(){
  const [a,b]=[...pointers.values()], v=V(), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  drag={kind:'pinch', d0:Math.hypot(a.x-b.x,a.y-b.y)||1, z0:v.z, wx:(mx-v.x)/v.z, wy:(my-v.y)/v.z};
  marquee.style.display='none';
}
function onDown(e){
  if(e.target.closest('.ui') || e.button===2) return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    clearLP();
    if(drag && drag.kind==='draw'){ S().strokes=S().strokes.filter(k=>k!==drag.k); undoStack.pop(); drawInk(); }
    if(!drag || ['pan','marquee','draw','erase'].includes(drag.kind)) startPinch();
    return;
  }
  if(pointers.size>2) return;
  const t=e.target, sx=e.clientX, sy=e.clientY, noCreate=popJustClosed;
  if(drawMode){ e.preventDefault(); if(drawTool.erase){ drag={kind:'erase',pushed:false}; eraseAt(sx,sy,drag); } else startStroke(sx,sy); return; }
  if(t.closest('a') || t.closest('iframe')) return;
  const cardElm=t.closest('.card'), id=cardElm && cardElm.dataset.id, card=id && find(id);
  const pk=t.closest('[data-pick]'); if(pk && card){ e.preventDefault(); pickShape(card,pk.dataset.pick); return; }
  const sl=t.closest('[data-slash]'); if(sl && card){ e.preventDefault(); slashChoose(card,sl.dataset.slash); return; }
  if(t.closest('textarea')) return;
  const wa=t.closest('[data-w]'); if(wa && card && editingId!==id){ e.preventDefault(); widget(card,wa.dataset.w); return; }
  if(t.classList.contains('cb') && t.dataset.line!=null){ e.preventDefault(); toggleTodoIn(db.current,id,+t.dataset.line); return; }
  if(t.classList.contains('tag')){ e.preventDefault(); tagFilter = tagFilter===t.dataset.tag ? null : t.dataset.tag; render(); if(tagFilter) toast('Spotlighting #'+tagFilter+' — click empty space to clear'); return; }
  if(t.classList.contains('slink')){ e.preventDefault(); goSpaceByName(t.dataset.space); return; }
  if(t.closest('.yt')){ e.preventDefault(); const y=t.closest('.yt'); y.outerHTML=`<iframe class="embed" src="https://www.youtube-nocookie.com/embed/${y.dataset.yt}?autoplay=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; queueLines(); return; }
  if(t.closest('.sp-load')){ e.preventDefault(); const b=t.closest('.sp-load'); b.outerHTML=`<iframe class="embed sp" src="https://open.spotify.com/embed/${b.dataset.sp}" allow="encrypted-media; clipboard-write"></iframe>`; queueLines(); return; }
  if(pres) return;
  if(t.closest('.pill')){ e.preventDefault(); if(editingId && editingId!==id) commitEdit(); cardMenu(id,sx-20,sy+12); return; }
  if(t.dataset && t.dataset.conn){ e.preventDefault(); connMenu(t.dataset.conn,sx,sy+8); return; }
  if(card && !card.locked){
    if(t.classList.contains('handle')){ e.preventDefault(); drag={kind:'connect',from:id,sx,sy,moved:false}; return; }
    if(t.classList.contains('grip')){ e.preventDefault(); const el=cEl(id); drag={kind:'resize',id,sx,sy,startW:el?el.offsetWidth:(card.w||220),startH:el?el.offsetHeight:60,h0:card.h||null,moved:false}; return; }
    if(editingId===id) return;
    e.preventDefault();
    const ids = sel.has(id) ? [...sel].filter(i=>!find(i)?.locked) : [id];
    drag={kind:'card',id,sx,sy,moved:false,shift:e.shiftKey,start:ids.map(i=>{ const c=find(i); return {id:i,x:c.x,y:c.y}; })};
    armLP(e,sx,sy,t); return;
  }
  const boxElm=t.closest('.box');
  if(boxElm){
    const bid=boxElm.dataset.box, b=findBox(bid);
    if(t.closest('.box-more')){ e.preventDefault(); boxMenu(bid,sx-10,sy+12); return; }
    if(t.classList.contains('box-grip')){ e.preventDefault(); drag={kind:'boxresize',bid,sx,sy,w:b.w,h:b.h,moved:false}; return; }
    if(t.closest('.box-head')){ e.preventDefault(); drag={kind:'box',bid,sx,sy,bx:b.x,by:b.y,cards:cardsInBox(b).filter(c=>!c.locked).map(c=>({id:c.id,x:c.x,y:c.y})),moved:false}; armLP(e,sx,sy,t); return; }
  }
  if(e.shiftKey || selectMode){ drag={kind:'marquee',sx,sy,add:e.shiftKey||selectMode}; return; }
  drag={kind:'pan',sx,sy,lx:sx,ly:sy,moved:false,noCreate};
  armLP(e,sx,sy,t);
}
function onMove(e){
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!drag) return;
  const v=V(), dx=e.clientX-drag.sx, dy=e.clientY-drag.sy, far=Math.hypot(dx,dy)>5;
  if(far) clearLP();
  switch(drag.kind){
    case 'pinch': {
      const pts=[...pointers.values()]; if(pts.length<2) return; const [a,b]=pts;
      const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2, nz=clamp(drag.z0*d/drag.d0,.15,3);
      v.z=nz; v.x=mx-drag.wx*nz; v.y=my-drag.wy*nz; applyView(); break; }
    case 'draw': {
      const w=toWorld(e.clientX,e.clientY);
      if(Math.hypot(w.x-drag.lx,w.y-drag.ly) > 1.5/v.z){ drag.k.pts.push(r1(w.x),r1(w.y)); drag.lx=w.x; drag.ly=w.y; updateLive(drag.k); }
      break; }
    case 'erase': eraseAt(e.clientX,e.clientY,drag); break;
    case 'pan':
      if(far) drag.moved=true;
      if(drag.moved){ v.x+=e.clientX-drag.lx; v.y+=e.clientY-drag.ly; applyView(); }
      drag.lx=e.clientX; drag.ly=e.clientY; break;
    case 'card':
      if(!drag.moved && far){ drag.moved=true; if(editingId) commitEdit(); pushUndo(); cardsEl.classList.add('dragging'); const el0=cEl(drag.id); drag.origin={x:drag.start[0].x,y:drag.start[0].y,h:el0?el0.offsetHeight:60}; }
      if(drag.moved){
        for(const s of drag.start){ const c=find(s.id); if(!c) continue; c.x=sn(s.x+dx/v.z); c.y=sn(s.y+dy/v.z);
          const el=cEl(s.id); if(el){ el.style.left=c.x+'px'; el.style.top=c.y+'px'; } }
        if(drag.start.length===1 && !e.altKey) checkMerge(drag); else clearMerge(drag);
        queueLines();
      } break;
    case 'connect': {
      if(far) drag.moved=true;
      const r=rectOf(drag.from); if(!r) return; const w=toWorld(e.clientX,e.clientY), a=edge(r,w.x,w.y);
      tempSvg.innerHTML=`<path class="ln temp" d="M${a.x},${a.y} L${w.x},${w.y}"/><circle cx="${w.x}" cy="${w.y}" r="4" style="fill:var(--accent)"/>`; break; }
    case 'resize':
      if(!drag.moved && far){ drag.moved=true; pushUndo(); const el=cEl(drag.id); if(el) el.classList.add('resizing'); }
      if(drag.moved){ const c=find(drag.id), el=cEl(drag.id);
        c.w=Math.max(120,sn(drag.startW+dx/v.z));
        if(Math.abs(dy)>3 || drag.vert){ drag.vert=true; c.h=Math.max(36,sn(drag.startH+dy/v.z)); }
        if(el){ el.style.width=c.w+'px'; el.style.minHeight=c.h?c.h+'px':''; if(c.img&&!c.text.trim()&&c.h) el.style.setProperty('--imgh',(c.h-12)+'px'); }
        queueLines(); }
      break;
    case 'box':
      if(!drag.moved && far){ drag.moved=true; pushUndo(); }
      if(drag.moved){
        const b=findBox(drag.bid); b.x=sn(drag.bx+dx/v.z); b.y=sn(drag.by+dy/v.z);
        const be=bEl(drag.bid); be.style.left=b.x+'px'; be.style.top=b.y+'px';
        const ddx=b.x-drag.bx, ddy=b.y-drag.by;
        for(const s of drag.cards){ const c=find(s.id); if(!c) continue; c.x=s.x+ddx; c.y=s.y+ddy; const el=cEl(s.id); if(el){ el.style.left=c.x+'px'; el.style.top=c.y+'px'; } }
        queueLines();
      } break;
    case 'boxresize':
      if(!drag.moved && far){ drag.moved=true; pushUndo(); }
      if(drag.moved){ const b=findBox(drag.bid); b.w=Math.max(140,sn(drag.w+dx/v.z)); b.h=Math.max(80,sn(drag.h+dy/v.z)); const be=bEl(drag.bid); be.style.width=b.w+'px'; be.style.height=b.h+'px'; queueMini(); }
      break;
    case 'marquee': {
      const x=Math.min(drag.sx,e.clientX), y=Math.min(drag.sy,e.clientY), w=Math.abs(dx), h=Math.abs(dy);
      marquee.style.cssText=`display:block;left:${x}px;top:${y}px;width:${w}px;height:${h}px`; drag.rect={x,y,w,h}; break; }
  }
}
function onUp(e){
  pointers.delete(e.pointerId); clearLP();
  if(!drag) return;
  const d=drag;
  if(d.kind==='pinch'){ if(pointers.size<2) drag=null; return; }
  drag=null;
  switch(d.kind){
    case 'draw': drawInk(); save(); queueMini(); hint.hidden=true; break;
    case 'erase': save(); break;
    case 'pan':
      if(d.moved || d.noCreate) break;
      if(editingId){ commitEdit(); break; }
      if(sel.size){ sel.clear(); render(); break; }
      if(tagFilter || legendFilter){ tagFilter=null; legendFilter=null; render(); break; }
      { const w=toWorld(e.clientX,e.clientY); createCard(w.x-16,w.y-16); }
      break;
    case 'card':
      cardsEl.classList.remove('dragging');
      if(d.merge){ const m=d.merge; clearMerge(d); doMerge(m,d.id); break; }
      if(d.snap){ doSnap(d); break; }
      clearMerge(d);
      if(d.moved){ if(d.start.length===1) closeGap(d); render(); save(); queueMini(); break; }
      if(d.shift || selectMode){ if(editingId) commitEdit(); sel.has(d.id)?sel.delete(d.id):sel.add(d.id); render(); break; }
      startEdit(d.id); break;
    case 'connect': {
      tempSvg.innerHTML='';
      const hit=document.elementFromPoint(e.clientX,e.clientY), tc=hit && hit.closest && hit.closest('.card');
      if(tc && tc.dataset.id!==d.from) connect(d.from,tc.dataset.id);
      else if(!tc && d.moved && !(hit && hit.closest && hit.closest('.ui'))){
        if(editingId) commitEdit();
        const before=snap(), w=toWorld(e.clientX,e.clientY), c=newCard(w.x-20,w.y-16);
        S().cards.push(c); S().connections.push({id:uid(),from:d.from,to:c.id,label:'',color:''});
        editSnapshot=before; startEdit(c.id,true);
      }
      break; }
    case 'marquee':
      marquee.style.display='none';
      if(d.rect && (d.rect.w>3 || d.rect.h>3)){
        if(!d.add) sel.clear();
        for(const el of cardsEl.children){ if(el.classList.contains('locked')) continue; const r=el.getBoundingClientRect();
          if(r.right>d.rect.x && r.left<d.rect.x+d.rect.w && r.bottom>d.rect.y && r.top<d.rect.y+d.rect.h) sel.add(el.dataset.id); }
        if(editingId) commitEdit();
        render();
      } else if(sel.size){ sel.clear(); render(); }
      break;
    case 'resize': { const el=cEl(d.id); if(el) el.classList.remove('resizing'); if(d.moved){ save(); queueMini(); } break; }
    default: if(d.moved){ save(); queueMini(); }
  }
}
viewport.addEventListener('wheel',e=>{
  if(e.target.closest('.ui')) return;
  e.preventDefault(); if(pres) return;
  if(e.ctrlKey || e.metaKey){ const dy=e.deltaMode===1?e.deltaY*33:e.deltaY; zoomAt(e.clientX,e.clientY,Math.exp(-clamp(dy,-40,40)*0.0095)); }
  else { const v=V(); v.x-=e.deltaX; v.y-=e.deltaY; applyView(); }
},{passive:false});
function defaultW(c){ return c.img?260:SMART.has(c.type)?240:220; }
function resetCardSize(id){ const c=find(id); if(!c) return; pushUndo(); c.w=defaultW(c); c.h=null; refreshCard(id); save(); toast('Card size reset'); }
function resetBoxSize(bid){ const b=findBox(bid); if(!b) return; pushUndo(); const inside=cardsInBox(b);
  const bb=inside.length?bbox(contentRects(inside.map(c=>c.id))):null;
  if(bb){ b.w=Math.max(200,Math.round(bb.x2-b.x+22)); b.h=Math.max(120,Math.round(bb.y2-b.y+22)); toast('Box fitted to its cards'); }
  else { b.w=340; b.h=240; toast('Box size reset'); }
  render(); save(); }
viewport.addEventListener('dblclick',e=>{
  const g=e.target.closest('.grip'); if(g){ e.preventDefault(); return resetCardSize(g.closest('.card').dataset.id); }
  const bg=e.target.closest('.box-grip'); if(bg){ e.preventDefault(); return resetBoxSize(bg.closest('.box').dataset.box); } });
viewport.addEventListener('dblclick',e=>{ const n=e.target.closest('.box-name'); if(n){ const b=findBox(n.closest('.box').dataset.box); const v=prompt('Box name',b.name); if(v!=null){ pushUndo(); b.name=v; render(); save(); } } });
viewport.addEventListener('dragover',e=>{ e.preventDefault(); document.body.classList.add('dropping'); clearTimeout(dropT); dropT=setTimeout(()=>document.body.classList.remove('dropping'),160); });
viewport.addEventListener('drop',async e=>{
  e.preventDefault(); const w=toWorld(e.clientX,e.clientY), dt=e.dataTransfer;
  document.body.classList.remove('dropping');
  if(dt.files && dt.files.length){ const f=dt.files[0]; if(/\.(canvas|json)$/i.test(f.name)) return importFile(f); if(await addImages(dt.files,w.x-130,w.y-80)) return; }
  const html=dt.getData('text/html'), src=html && (html.match(/<img[^>]+src="([^"]+)"/i)||[])[1];
  if(src && /^https?:/.test(src)) return addUrl(src,w);
  const txt=(dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim();
  if(txt && /^https?:\/\/\S+$/.test(txt)) return addUrl(txt,w);
  if(txt) createCard(w.x-110,w.y-20,txt,false);
});
$('#imgFile').onchange=async e=>{
  if(imgTarget){ const f=e.target.files[0], id=imgTarget; imgTarget=null; e.target.value=''; if(!f) return; const c=find(id); if(!c) return;
    pushUndo(); c.img=await storeImage(await fileToDataURL(f)); c.w=Math.max(c.w||220,260); c.h=null; refreshCard(id); morph(id); save(); return; }
  const w=imgAt||centerWorld(); await addImages(e.target.files,w.x-(imgAt?0:130),w.y-(imgAt?0:80)); e.target.value=''; imgAt=null; };

// =====================================================================
// KEYBOARD + PASTE
// =====================================================================
function toggleSelectMode(){ selectMode=!selectMode; $('#selBtn').classList.toggle('on',selectMode); toast(selectMode?'Select mode: drag to paint-select, tap cards to add':'Select mode off'); }
function toggleZen(){ document.body.classList.toggle('zen'); drawMinimap(); renderLegend(); if(document.body.classList.contains('zen')) toast('Focus mode — press . or ◐ to exit'); }
function toggleMini(){ db.settings.minimap=!db.settings.minimap; save(); drawMinimap(); }
addEventListener('keydown',e=>{
  const tg=e.target.tagName; const inField = tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT';
  const mod=e.metaKey||e.ctrlKey, k=e.key.toLowerCase();
  if(mod && k==='k'){ e.preventDefault(); palette.hidden?openPalette():closePalette(); return; }
  if(inField) return;
  if(!introEl.hidden){ if(e.key==='Escape') closeIntro(); return; }
  if(pres){ if(['arrowright','pagedown',' ','enter'].includes(k)){ e.preventDefault(); goSlide(pres.i+1); } else if(['arrowleft','pageup','backspace'].includes(k)){ e.preventDefault(); goSlide(pres.i-1); } else if(k==='escape'||k==='p'){ endPresent(); } return; }
  if(mod && k==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if(mod && k==='y'){ e.preventDefault(); redo(); return; }
  if(mod && k==='d'){ e.preventDefault(); if(sel.size) duplicate([...sel]); return; }
  if(mod && k==='a'){ e.preventDefault(); S().cards.forEach(c=>{ if(!c.locked) sel.add(c.id); }); render(); return; }
  if(mod && k==='c' && sel.size){ copyMd([...sel]); return; }
  if(mod || e.altKey) return;
  if(e.key==='Escape'){ if(!introEl.hidden) return closeIntro(); closePop(); closePanels(); if(drawMode) toggleDraw(false); sel.clear(); tagFilter=null; legendFilter=null; if(selectMode) toggleSelectMode(); render(); return; }
  if((e.key==='Delete'||e.key==='Backspace') && sel.size){ e.preventDefault(); delSelected(); return; }
  if(e.key==='Enter' && sel.size===1){ e.preventDefault(); startEdit([...sel][0]); return; }
  if(e.key.startsWith('Arrow') && sel.size){ e.preventDefault(); const st=e.shiftKey?24:2; const d={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];
    if(Date.now()-lastNudge>700) pushUndo(); lastNudge=Date.now();
    sel.forEach(id=>{ const c=find(id); if(c&&!c.locked){ c.x+=d[0]; c.y+=d[1]; const el=cEl(id); if(el){ el.style.left=c.x+'px'; el.style.top=c.y+'px'; } } }); queueLines(); save(); return; }
  if(/^[1-6]$/.test(e.key) && sel.size){ setType([...sel],BASIC[+e.key-1]); return; }
  if(e.key==='/'){ e.preventDefault(); openPalette(); return; }
  if(k==='n'){ e.preventDefault(); const w=centerWorld(); createCard(w.x-110,w.y-20); return; }
  if(k==='b'){ e.preventDefault(); sel.size?boxAround([...sel]):newBox(); return; }
  if(k==='d'){ e.preventDefault(); toggleDraw(); return; }
  if(k==='t'){ e.preventDefault(); todayEl.hidden?openToday():closePanels(); return; }
  if(k==='p'){ e.preventDefault(); startPresent(); return; }
  if(k==='f'){ e.preventDefault(); zoomFit(sel.size>0); return; }
  if(k==='m'){ toggleMini(); return; }
  if(k==='l' && sel.size){ toggleLock([...sel]); return; }
  if(e.key==='.'){ toggleZen(); return; }
  if(k==='0'){ const v=V(); v.z=1; applyView(); return; }
  if(e.key==='='||e.key==='+'){ zoomAt(innerWidth/2,innerHeight/2,1.2); return; }
  if(e.key==='-'){ zoomAt(innerWidth/2,innerHeight/2,1/1.2); return; }
});
document.addEventListener('paste',async e=>{
  const tg=e.target.tagName; if(tg==='INPUT'||tg==='TEXTAREA') return;
  const cd=e.clipboardData||window.clipboardData; const files=[...(cd.files||[])];
  const w=centerWorld();
  if(files.length && await addImages(files,w.x-130,w.y-80)){ e.preventDefault(); return; }
  const text=cd.getData('text'); if(!text || !text.trim()) return;
  e.preventDefault(); if(/^https?:\/\/\S+$/.test(text.trim())) return addUrl(text.trim()); createCard(w.x-110,w.y-20,text.trim(),false);
});

// =====================================================================
// COMMAND PALETTE — doubles as a ShapeShift-style capture bar
// =====================================================================
let palItems=[], palIdx=0;
function openPalette(prefill=''){ if(editingId) commitEdit(); closePop(); closePanels(); palette.hidden=false; palIn.value=prefill; buildPal(); palIn.focus(); }
function closePalette(){ palette.hidden=true; palIn.blur(); }
function commands(){
  return [
    {icon:'＋',label:'New card',key:'N',run:()=>{ const w=centerWorld(); createCard(w.x-110,w.y-20); }},
    {icon:'◇',label:'New space',run:newSpacePrompt},
    {icon:'☀',label:'Today — agenda, todos, habits',key:'T',run:openToday},
    {icon:'📥',label:'Go to Inbox',run:()=>switchSpace(inbox().id)},
    {icon:'▶',label:'Present (boxes as slides)',key:'P',run:()=>startPresent()},
    {icon:'✎',label:'Draw',key:'D',run:()=>toggleDraw(true)},
    {icon:'⤢',label:'Zoom to fit',key:'F',run:()=>zoomFit()},
    {icon:'▢',label:'New box',key:'B',run:()=>newBox()},
    {icon:'🖼',label:'Insert image from file…',run:()=>{ imgAt=null; $('#imgFile').click(); }},
    {icon:'◐',label:'Focus mode (hide chrome)',key:'.',run:toggleZen},
    {icon:'▣',label:'Toggle minimap',key:'M',run:toggleMini},
    {icon:'🗑',label:'Recently removed in this space',run:()=>trashMenu(innerWidth/2-150,100)},
    {icon:'⬇',label:'Export everything (JSON backup)',run:exportJson},
    {icon:'⬇',label:'Export this space as Markdown',run:exportMd},
    {icon:'⬇',label:'Export this space as JSON Canvas (Obsidian)',run:exportCanvas},
    {icon:'⎘',label:'Copy this space as Markdown',run:async()=>{ try{ await navigator.clipboard.writeText(spaceMarkdown(S())); toast('Copied space as Markdown'); }catch(e){ toast('Clipboard blocked'); } }},
    {icon:'⇪',label:'Sync: push to GitHub Gist',run:()=>syncPush().catch(err=>toast(err.message))},
    {icon:'⇩',label:'Sync: pull from GitHub Gist',run:()=>syncPull().catch(err=>toast(err.message))},
    {icon:'🎨',label:'Style — background, colors, fonts',run:openStyle},
    {icon:'🖼',label:'Change background image…',run:()=>$('#bgFile').click()},
    {icon:'⚙',label:'Settings',run:openSettings},
    {icon:'👋',label:'Intro & welcome tour',run:openIntro},
    ...enabledTypes().filter(t=>SMART.has(t)).map(t=>({icon:TI(t),label:`New ${TYPE_META[t].l} card`,sub:TYPE_META[t].ex,run:()=>{ const w=centerWorld(); const c=createCard(w.x-120,w.y-30); slashChoose(c,t); }})),
    ...TEMPLATES.map(t=>({icon:'▦',label:'Template: '+t.name,sub:t.desc,run:()=>insertTemplate(t)})),
    ...db.templates.map(t=>({icon:'★',label:'Template: '+t.name,run:()=>insertTemplate(t)})),
  ];
}
function snippet(text,q){
  const t=text.replace(/^\s*\[( |x)\]\s?/gim,'').replace(/\s+/g,' ').trim(); if(!q) return esc(t.slice(0,80));
  const i=t.toLowerCase().indexOf(q); if(i<0) return esc(t.slice(0,80)); const s=Math.max(0,i-30), part=t.slice(s,s+90);
  const j=i-s; return (s?'…':'')+esc(part.slice(0,j))+'<mark>'+esc(part.slice(j,j+q.length))+'</mark>'+esc(part.slice(j+q.length));
}
function buildPal(){
  const q=palIn.value.trim(), ql=q.toLowerCase(), groups=[];
  const allCards=[]; db.order.forEach(sid=>db.spaces[sid].cards.forEach(c=>allCards.push({sid,c})));
  let ghost='';
  if(q && !q.startsWith('#')){
    const top=rank(q)[0].type, lab=`${TI(top)} ${TYPE_META[top].l}`;
    groups.push(['Capture',[
      {icon:'📥',label:`Capture as <b>${lab}</b> → Inbox`,html:true,run:()=>captureToInbox(q)},
      {icon:'＋',label:`Add as <b>${lab}</b> to this space`,html:true,run:()=>{ const w=centerWorld(); createCard(w.x-120,w.y-30,q,false); }}]]);
    if(top!=='note'){ const tmp={...newCard(0,0,q),type:top,text:top==='todo'?transform('todo',q):q}; try{ const h=contentHTML(tmp); if(h!==fallback(tmp)) ghost=`<div class="palghost card t-${top}" style="position:relative">${h}</div>`; }catch(e){} }
  }
  if(q.startsWith('#')){
    const tags=new Map(); allCards.forEach(({c})=>(c.text.match(/(^|\s)#([\w-]{1,40})/g)||[]).forEach(m=>{ const t=m.trim().slice(1).toLowerCase(); tags.set(t,(tags.get(t)||0)+1); }));
    const tq=ql.slice(1); groups.push(['Tags',[...tags].filter(([t])=>t.includes(tq)).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([t,n])=>({icon:'#',label:'#'+esc(t),html:true,sub:n+' card'+(n>1?'s':''),run:()=>{ tagFilter=t; render(); toast('Spotlighting #'+t); }}))]);
  }
  const matches = q ? allCards.filter(({c})=>c.text.toLowerCase().includes(ql)) : [...allCards].sort((a,b)=>(b.c.updated||0)-(a.c.updated||0)).slice(0,6);
  matches.sort((a,b)=>(b.sid===db.current)-(a.sid===db.current) || (b.c.updated||0)-(a.c.updated||0));
  if(matches.length) groups.push([q?'Cards':'Recent cards', matches.slice(0,25).map(({sid,c})=>({icon:c.img&&!c.text.trim()?I('image'):TI(c.type),label:c.text.trim()?snippet(c.text,q?ql:''):'image',html:true,sub:db.spaces[sid].name,run:()=>jumpTo(sid,c.id)}))]);
  const sps=db.order.filter(id=>!q||db.spaces[id].name.toLowerCase().includes(ql)).map(id=>({icon:db.spaces[id].kind==='inbox'?'📥':'◇',label:esc(db.spaces[id].name),html:true,sub:db.spaces[id].cards.length+' cards',run:()=>switchSpace(id)}));
  if(sps.length) groups.push(['Spaces',sps]);
  const cmds=commands().filter(c=>!q||c.label.toLowerCase().includes(ql));
  if(cmds.length){ const g=['Commands',q?cmds.slice(0,12):cmds.slice(0,10)];
    // a strong command / space match beats capture, so "pitch deck" + ↵ inserts the template
    if(q.length>=3 && !q.startsWith('#')){ const sp=groups.findIndex(x=>x[0]==='Spaces' && x[1].some(it=>it.label.toLowerCase()===esc(ql))); if(sp>0) groups.unshift(groups.splice(sp,1)[0]); else groups.unshift(g); }
    else groups.push(g); }
  if(ghost && groups[0] && groups[0][0]!=='Capture') ghost='';
  palItems=[]; let h=ghost;
  groups.forEach(([g,items])=>{ if(!items.length) return; h+=`<div class="pgroup">${g}</div>`; items.forEach(it=>{ const i=palItems.length; palItems.push(it);
    h+=`<div class="pi" data-i="${i}"><span class="ico">${it.icon}</span><span class="pl">${it.html?it.label:esc(it.label)}</span>${it.key?`<kbd>${it.key}</kbd>`:''}${it.sub?`<span class="ps">${esc(it.sub)}</span>`:''}</div>`; }); });
  palList.innerHTML=h||'<div class="pgroup">No matches</div>';
  palIdx=0; markPal();
}
function markPal(){ palList.querySelectorAll('.pi').forEach(el=>el.classList.toggle('on',+el.dataset.i===palIdx)); const on=palList.querySelector('.pi.on'); if(on) on.scrollIntoView({block:'nearest'}); }
function runPal(i){ const it=palItems[i]; if(!it) return; closePalette(); it.run(); }
palIn.addEventListener('input',buildPal);
palIn.addEventListener('keydown',e=>{
  e.stopPropagation();
  if(e.key==='ArrowDown'){ e.preventDefault(); palIdx=Math.min(palItems.length-1,palIdx+1); markPal(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); palIdx=Math.max(0,palIdx-1); markPal(); }
  else if(e.key==='Enter'){ e.preventDefault(); runPal(palIdx); }
  else if(e.key==='Escape' || ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k')){ e.preventDefault(); closePalette(); }
});
palList.addEventListener('click',e=>{ const p=e.target.closest('.pi'); if(p) runPal(+p.dataset.i); });
palList.addEventListener('pointermove',e=>{ const p=e.target.closest('.pi'); if(p && +p.dataset.i!==palIdx){ palIdx=+p.dataset.i; markPal(); } });
palette.addEventListener('pointerdown',e=>{ if(e.target===palette) closePalette(); });

// =====================================================================
// TODAY — agenda across every space
// =====================================================================
function collectAll(){
  const out=[];
  db.order.forEach(sid=>{ const s=db.spaces[sid]; s.cards.forEach(c=>{
    if(c.type==='todo') c.text.split('\n').forEach((l,i)=>{ const m=l.match(/^\s*\[ \]\s?(.*)$/); if(m && m[1].trim()){ const due=(m[1].match(/(?:^|\s)@(\d{4}-\d{2}-\d{2})\b/)||[])[1]||null; out.push({k:'todo',sid,cid:c.id,line:i,text:m[1],due,space:s.name,upd:c.updated||0}); } });
    else if(c.type==='reminder' && !c.data.done){ const r=parseReminder(c); out.push({k:'rem',sid,cid:c.id,text:r.title,due:r.date,time:r.time,space:s.name,upd:c.updated||0,urgent:r.urgent}); }
    else if(c.type==='event'){ const e=parseEvent(c); if(e.date) out.push({k:'event',sid,cid:c.id,text:e.title,due:e.date,time:e.time,space:s.name,upd:c.updated||0}); }
    else if(c.type==='habit'){ const p=parseHabit(c.text); if(p) out.push({k:'habit',sid,cid:c.id,text:p.name,done:!!(c.data.log||{})[iso(noon())],space:s.name}); }
    else if(c.type==='timer' && c.data.endAt) out.push({k:'timer',sid,cid:c.id,text:(parseTimer(c.text)||{}).label||'Timer',left:(c.data.endAt-Date.now())/1000,space:s.name});
  }); });
  return out;
}
function openToday(){ if(editingId) commitEdit(); closePop(); settingsEl.hidden=true; styleEl.hidden=true; $('#styleBtn').classList.remove('on'); todayEl.hidden=false; $('#todayBtn').classList.add('on'); buildToday(); }
function buildToday(){
  const all=collectAll(), t0=iso(noon()), t7=iso(addDays(7));
  const tasks=all.filter(x=>x.k==='todo'||x.k==='rem'||x.k==='event');
  const mins=x=>x.time?x.time.h*60+x.time.m:9999;
  const tsort=(a,b)=>a.due<b.due?-1:a.due>b.due?1:(mins(a)-mins(b))||((b.urgent?1:0)-(a.urgent?1:0));
  const over=tasks.filter(x=>x.due&&x.due<t0&&x.k!=='event').sort(tsort), tod=tasks.filter(x=>x.due===t0).sort(tsort), up=tasks.filter(x=>x.due&&x.due>t0&&x.due<=t7).sort(tsort),
        later=tasks.filter(x=>x.due&&x.due>t7).sort(tsort), none=all.filter(x=>(x.k==='todo'||x.k==='rem')&&!x.due).sort((a,b)=>(b.urgent?1:0)-(a.urgent?1:0)||b.upd-a.upd),
        habits=all.filter(x=>x.k==='habit'), timers=all.filter(x=>x.k==='timer');
  const row=x=>{
    const lead = x.k==='todo' ? `<span class="cb" data-tdone="${x.sid}|${x.cid}|${x.line}"></span>` : x.k==='rem' ? `<span class="cb" data-rdone="${x.sid}|${x.cid}"></span>` : `<span class="ti">📅</span>`;
    const when = x.time ? `<span class="ttime">${fmtTime(x.time.h,x.time.m)}</span>` : '';
    const right = x.due && x.due!==t0 ? fromIso(x.due).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}) : x.space;
    return `<div class="trow">${lead}${when}<span class="ttext" data-jump="${x.sid}|${x.cid}">${x.k==='rem'?'🔔 ':''}${fmt(x.text)}${x.urgent?' <span class="urg">URGENT</span>':''}</span><span class="tsp">${esc(right)}</span></div>`; };
  const sec=(title,items,empty,limit=50)=>`<h4>${title}<span class="n">${items.length||''}</span></h4>`+(items.length?items.slice(0,limit).map(row).join('')+(items.length>limit?`<div class="tempty">+${items.length-limit} more</div>`:''):`<div class="tempty">${empty}</div>`);
  todayEl.innerHTML=`<div class="ph"><b>☀ ${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</b><button data-close title="Close">✕</button></div>
    <p class="small muted" style="margin:4px 0 0">Everything with a date across all spaces — events, reminders, checklists — plus today’s habits. Click an item to jump to it.</p>`+
    (timers.length?`<h4>⏱ Running</h4>`+timers.map(x=>`<div class="trow"><span class="ti">⏱</span><span class="ttext" data-jump="${x.sid}|${x.cid}">${esc(x.text)}</span><span class="ttime">${fmtClock(x.left)}</span></div>`).join(''):'')+
    (over.length?sec('⚠ Overdue',over,''):'')+sec('Today',tod,'Nothing scheduled today 🎉')+
    (habits.length?`<h4>🔁 Habits today<span class="n">${habits.filter(h=>h.done).length}/${habits.length}</span></h4>`+habits.map(x=>`<div class="trow ${x.done?'done':''}"><span class="cb ${x.done?'x':''}" data-hdone="${x.sid}|${x.cid}"></span><span class="ttext" data-jump="${x.sid}|${x.cid}">${esc(x.text)}</span><span class="tsp">${esc(x.space)}</span></div>`).join(''):'')+
    sec('Next 7 days',up,'Nothing scheduled')+(later.length?sec('Later',later,'',15):'')+sec('No date',none,'All clear',20)+
    `<div class="row" style="margin-top:10px"><button class="btn small" data-act="journal">＋ Today’s journal</button><button class="btn small" data-act="inbox">📥 Inbox</button></div>`;
}
todayEl.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest('[data-close]')) return closePanels();
  const d=t.closest('[data-tdone]'); if(d){ const [sid,cid,line]=d.dataset.tdone.split('|'); toggleTodoIn(sid,cid,+line); d.classList.add('x'); d.parentElement.classList.add('done'); setTimeout(buildToday,350); return; }
  const rd=t.closest('[data-rdone]'); if(rd){ const [sid,cid]=rd.dataset.rdone.split('|'); const c=findIn(db.spaces[sid],cid); if(c){ c.data.done=true; save(); if(sid===db.current) refreshCard(cid); } rd.classList.add('x'); setTimeout(buildToday,350); return; }
  const hd=t.closest('[data-hdone]'); if(hd){ const [sid,cid]=hd.dataset.hdone.split('|'); const c=findIn(db.spaces[sid],cid); if(c){ const log=c.data.log=c.data.log||{}, k=iso(noon()); if(log[k]) delete log[k]; else log[k]=1; save(); if(sid===db.current) refreshCard(cid); } buildToday(); return; }
  if(t.closest('a')||t.closest('.tag')||t.closest('.slink')) { if(t.closest('.slink')){ closePanels(); goSpaceByName(t.closest('.slink').dataset.space); } return; }
  const j=t.closest('[data-jump]'); if(j){ const [sid,cid]=j.dataset.jump.split('|'); if(innerWidth<700) closePanels(); jumpTo(sid,cid); return; }
  const a=t.closest('[data-act]'); if(a){ closePanels(); if(a.dataset.act==='journal') insertTemplate(TEMPLATES.find(x=>x.name==='Daily journal')); else switchSpace(inbox().id); }
});

// =====================================================================
// STYLE PANEL — backgrounds, patterns, images, fonts, accent, theme
// =====================================================================
function openStyle(){ if(editingId) commitEdit(); closePop(); settingsEl.hidden=true; todayEl.hidden=true; $('#todayBtn').classList.remove('on'); styleEl.hidden=false; $('#styleBtn').classList.add('on'); buildStyle(); }
function buildStyle(){
  const b=S().bg||{}, pat=b.pattern||(b.dots===false?'none':'dots'), font=S().font||'sans', th=db.settings.theme, acc=db.settings.accent||0;
  const isOn=(o)=>{ if(o.grad) return b.grad===o.grad && !b.image; if(o.color!==undefined) return !b.grad && !b.image && (b.color||'')===o.color; return false; };
  styleEl.innerHTML=`<div class="ph"><b>🎨 Style</b><button data-close title="Close">✕</button></div>
  <h4>Quick looks <span class="n">this space</span></h4>
  <div class="looks">${LOOKS.map((l,i)=>`<button class="look" data-st="look:${i}" style="background:${l.bg.grad||l.bg.color||'var(--bg)'};font-family:${FONTS[l.font][1]}"><span class="aa" style="color:${(l.bg.dark||(l.bg.color&&hexLum(l.bg.color)<.38))?'#fff':'#333'}">Aa</span><b>${l.n}</b></button>`).join('')}</div>
  <h4>Background color</h4>
  <div class="bgs">${BG_COLORS.map(([n,c])=>`<button class="bgsw ${isOn({color:c})?'on':''}" data-st="color:${c}" title="${n}" style="background:${c||'#f6f3ec'}"></button>`).join('')}
    <label class="bgsw custom" title="Custom color"><input type="color" id="stColor" value="${(b.color||'#f6f3ec')}"></label></div>
  <h4>Gradient</h4>
  <div class="bgs">${BG_GRADS.map(([n,k,d])=>`<button class="bgsw ${isOn({grad:GRADS[k]})?'on':''}" data-st="grad:${k}:${d}" title="${n}" style="background:${GRADS[k]}"></button>`).join('')}</div>
  <h4>Pattern</h4>
  <div class="seg">${[['dots','Dots'],['grid','Grid'],['lines','Lines'],['none','None']].map(([k,l])=>`<button class="${pat===k?'on':''}" data-st="pat:${k}">${l}</button>`).join('')}</div>
  <h4>Background image</h4>
  <div class="row"><button class="btn small" data-st="upload">${I('upload')} Upload</button><input type="text" id="stUrl" placeholder="…or paste an image URL" value="${b.image&&!b.image.startsWith('data:')&&!isRef(b.image)?esc(b.image):''}">${b.image?`<button class="btn small" data-st="noimg">Remove</button>`:''}</div>
  <h4>Font <span class="n">this space</span></h4>
  <div class="fonts">${Object.entries(FONTS).map(([k,[l,f]])=>`<button class="${font===k?'on':''}" data-st="font:${k}"><b style="font-family:${f}">Aa</b><span>${l}</span></button>`).join('')}</div>
  <h4>Accent</h4>
  <div class="accs">${ACCENTS.map((a,i)=>`<button class="acc ${acc===i?'on':''}" data-st="acc:${i}" title="${a.n}" style="background:${a.c}"></button>`).join('')}</div>
  <h4>Theme</h4>
  <div class="seg">${[['auto','Auto'],['light','Light'],['dark','Dark']].map(([k,l])=>`<button class="${th===k?'on':''}" data-st="theme:${k}">${l}</button>`).join('')}</div>
  <p class="small muted" style="margin:12px 0 0">Box colors & icons: click ⋯ on any box. Card colors & frames: click the tag above a card.</p>`;
  const c=styleEl.querySelector('#stColor'); c.oninput=()=>{ setBg({color:c.value, grad:'', image:''}); };
  c.onchange=()=>buildStyle();
  const u=styleEl.querySelector('#stUrl'); u.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter' && u.value.trim()){ setBg({image:u.value.trim(), dark:false}); buildStyle(); } });
}
function setBg(patch){ const sp=S(); sp.bg=Object.assign({}, sp.bg||{dots:true}, patch); for(const k of ['color','grad','image']) if(sp.bg[k]==='') delete sp.bg[k]; applyBg(); save(); }
styleEl.addEventListener('click',async e=>{
  if(e.target.closest('[data-close]')) return closePanels();
  const el=e.target.closest('[data-st]'); if(!el) return; const [k,v,v2]=el.dataset.st.split(':');
  if(k==='look'){ const l=LOOKS[+v]; S().bg={...l.bg}; S().font=l.font; applyBg(); save(); }
  else if(k==='color') setBg({color:v, grad:'', image:'', dark:false});
  else if(k==='grad') setBg({grad:GRADS[v], color:'', image:'', dark:v2==='1'});
  else if(k==='pat') setBg({pattern:v});
  else if(k==='upload'){ $('#bgFile').click(); return; }
  else if(k==='noimg') setBg({image:''});
  else if(k==='font'){ S().font=v; applyBg(); save(); }
  else if(k==='acc'){ db.settings.accent=+v; applyAccent(); save(); }
  else if(k==='theme'){ db.settings.theme=v; applyTheme(); save(); }
  buildStyle();
});
styleEl.addEventListener('keydown',e=>e.stopPropagation());
$('#bgFile').onchange=async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ const bmp=await createImageBitmap(f), max=1800, sc=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const cv=document.createElement('canvas'); cv.width=Math.round(bmp.width*sc); cv.height=Math.round(bmp.height*sc); const ctx=cv.getContext('2d'); ctx.drawImage(bmp,0,0,cv.width,cv.height);
    const t=document.createElement('canvas'); t.width=t.height=1; const tc=t.getContext('2d'); tc.drawImage(cv,0,0,1,1); const [r,g,bl]=tc.getImageData(0,0,1,1).data;
    setBg({image:await storeImage(cv.toDataURL('image/jpeg',.8)), dark:(.2126*r+.7152*g+.0722*bl)/255<.45, pattern:'none'}); toast('Background updated'); buildStyle();
  }catch(err){ toast('Couldn’t read that image'); }
};

// =====================================================================
// SYNC (GitHub Gist)
// =====================================================================
async function gh(method,path,body){
  const t=db.settings.gist.token; if(!t) throw new Error('Add a GitHub token in Settings first');
  const r=await fetch('https://api.github.com'+path,{method,headers:{'Authorization':'Bearer '+t,'Accept':'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  if(!r.ok) throw new Error(`GitHub said ${r.status}${r.status===401?' — check the token':r.status===404?' — check the Gist ID':''}`);
  return r.json();
}
async function exportData(){ const d=JSON.parse(JSON.stringify(db)); d.settings.gist={...d.settings.gist,token:''}; return inlineImages(d); }
async function syncPush(quiet){
  const g=db.settings.gist; try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(e){}
  const files={'sprawl.json':{content:JSON.stringify(await exportData())}};
  const j = g.id ? await gh('PATCH','/gists/'+g.id,{files}) : await gh('POST','/gists',{description:'Sprawl canvas backup',public:false,files});
  g.id=j.id; g.last=new Date().toISOString(); try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(e){}
  syncStatus(); if(!quiet) toast('Pushed to Gist ✓');
}
async function syncPull(){
  const g=db.settings.gist; if(!g.id) throw new Error('No Gist ID yet — push first or paste an ID in Settings');
  const j=await gh('GET','/gists/'+g.id), f=j.files['sprawl.json']; if(!f) throw new Error('That Gist has no sprawl.json');
  const txt = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  const d=JSON.parse(txt); if(!d.spaces) throw new Error('Gist content isn’t a Sprawl backup');
  if(!confirm('Replace this browser’s spaces with the Gist version? (Export a backup first if unsure.)')) return;
  const keep=g; if(editingId) commitEdit(); db=migrate(d); db.settings.gist={...keep,last:new Date().toISOString()};
  await migrateImages(); await loadImages();
  undoStack=[]; redoStack=[]; sel.clear(); applyTheme(); render(); flush(); syncStatus(); toast('Pulled from Gist ✓');
}
function syncStatus(){ const g=db.settings.gist, el=$('#ghStatus'); if(el) el.textContent = g.last ? 'Last sync '+ago(Date.parse(g.last)) : ''; const gi=$('#ghGist'); if(gi && document.activeElement!==gi) gi.value=g.id||''; }

// =====================================================================
// INTRO — first visit: what this is, a live demo of a card shaping itself, and two ways in
// =====================================================================
const introEl=$('#intro'); let demoT=null;
const DEMO=['coffee with maya thursday 10am','20 min stretch','tacos, ramen or pizza tonight?','split 86 between 3','remind me to renew the passport tomorrow','4 miles in km'];
function demoLoop(){
  const txt=introEl.querySelector('.demo-text'), out=introEl.querySelector('.demo-out'), chip=introEl.querySelector('.demo-chip');
  let i=0;
  const run=()=>{ const phrase=DEMO[i%DEMO.length]; i++; let n=0; out.innerHTML=''; chip.textContent='';
    const tick=()=>{ n++; txt.innerHTML=esc(phrase.slice(0,n))+'<span class="caret"></span>';
      if(n<phrase.length){ demoT=setTimeout(tick,38+Math.random()*40); return; }
      const type=rank(phrase)[0].type, tmp={...newCard(0,0,phrase),type,text:type==='todo'?transform('todo',phrase):phrase};
      chip.innerHTML=`becomes ${TI(type)} ${TYPE_META[type].l}`;
      demoT=setTimeout(()=>{ let h=''; try{ h=contentHTML(tmp); }catch(e){} out.innerHTML=h; out.classList.remove('morph'); void out.offsetWidth; out.classList.add('morph');
        demoT=setTimeout(run,2600); },500); };
    demoT=setTimeout(tick,500); };
  run();
}
function openIntro(){ if(editingId) commitEdit(); closePop(); closePanels(); introEl.hidden=false; clearTimeout(demoT); demoLoop(); }
function closeIntro(){ introEl.hidden=true; clearTimeout(demoT); if(!db.settings.introSeen){ db.settings.introSeen=true; save(); } }
introEl.addEventListener('click',e=>{
  if(e.target===introEl) return closeIntro();
  const b=e.target.closest('[data-act]'); if(!b) return; const a=b.dataset.act; closeIntro();
  if(a==='tour'){ const id=ensureWelcome(); if(id!==db.current) switchSpace(id); zoomFit(false,1,innerWidth<600?.7:.15); return; }
  if(a==='try'){ let id=db.order.find(i=>db.spaces[i].name==='Scratch'); if(!id){ const sp=newSpace('Scratch'); db.spaces[sp.id]=sp; db.order.push(sp.id); id=sp.id; }
    if(id!==db.current) switchSpace(id); const w=centerWorld(); createCard(w.x-110,w.y-20); }
});
introEl.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); closeIntro(); } });

// =====================================================================
// TOOLBAR + SETTINGS
// =====================================================================
$('#spaceBtn').onclick=spaceMenu;
$('#searchBtn').onclick=()=>openPalette();
$('#styleBtn').onclick=()=>styleEl.hidden?openStyle():closePanels();
$('#todayBtn').onclick=()=>todayEl.hidden?openToday():closePanels();
$('#drawBtn').onclick=()=>toggleDraw();
$('#selBtn').onclick=toggleSelectMode;
$('#addBtn').onclick=insertMenu;
$('#undoBtn').onclick=undo;
$('#zenExit').onclick=toggleZen;
$('#zIn').onclick=()=>zoomAt(innerWidth/2,innerHeight/2,1.2);
$('#zOut').onclick=()=>zoomAt(innerWidth/2,innerHeight/2,1/1.2);
$('#zReset').onclick=()=>{ const v=V(); const c=centerWorld(); v.z=1; v.x=innerWidth/2-c.x; v.y=innerHeight/2-c.y; applyView(); };
$('#zFit').onclick=()=>zoomFit();
engineEl.onclick=()=>openSettings();
function openSettings(){ if(editingId) commitEdit(); closePop(); todayEl.hidden=true; styleEl.hidden=true; $('#todayBtn').classList.remove('on'); $('#styleBtn').classList.remove('on'); settingsEl.hidden=false; syncSettings(); }
$('#setBtn').onclick=()=>settingsEl.hidden?openSettings():closePanels();
settingsEl.querySelector('[data-close]').onclick=closePanels;
settingsEl.addEventListener('keydown',e=>e.stopPropagation());
function renderTypeGrid(){
  const off=new Set(db.settings.disabled);
  $('#typeGrid').innerHTML=TYPES.map(t=>`<label title="${esc(TYPE_META[t].d)}" style="padding:2px 0"><input type="checkbox" data-type="${t}" ${off.has(t)?'':'checked'} ${t==='note'?'disabled':''}> ${TI(t)} <b>${TYPE_META[t].l}</b> <span class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(TYPE_META[t].ex)}</span></label>`).join('');
  $('#typeCount').textContent=`${enabledTypes().length} of ${TYPES.length} on`;
}
$('#typeGrid').addEventListener('change',e=>{ const t=e.target.dataset.type; if(!t) return; const off=new Set(db.settings.disabled); e.target.checked?off.delete(t):off.add(t); db.settings.disabled=[...off]; save(); renderTypeGrid(); });
$('#typesAll').onclick=()=>{ db.settings.disabled=[]; save(); renderTypeGrid(); };
$('#typesBasic').onclick=()=>{ db.settings.disabled=TYPES.filter(t=>SMART.has(t)); save(); renderTypeGrid(); };
function syncSettings(){
  const st=db.settings, b=S().bg||{};
  $('#optLive').checked=st.live; probeOut();
  $('#optSnap').checked=st.snap; $('#optMini').checked=st.minimap; $('#optLegend').checked=st.legend;
  $('#ghToken').value=st.gist.token; $('#ghAuto').checked=st.gist.auto; syncStatus(); renderTypeGrid();
}
$('#optLive').onchange=e=>{ db.settings.live=e.target.checked; save(); };
function probeOut(){
  const q=$('#probeIn').value.trim(), out=$('#probeOut'); if(!q){ out.innerHTML=''; return; }
  const t0=performance.now(), r=rank(q); const ms=(performance.now()-t0).toFixed(1);
  out.innerHTML=r.slice(0,4).map((x,i)=>`<span class="chipS ${i?'':'on'}">${TI(x.type)}${TYPE_META[x.type].l} ${Math.round(x.score*100)}%</span>`).join(' ')+`<span class="small muted" style="margin-left:6px">${ms} ms</span>`;
}
$('#probeIn').addEventListener('input',probeOut);
$('#introBtn').onclick=openIntro;
$('#optSnap').onchange=e=>{ db.settings.snap=e.target.checked; save(); };
$('#optMini').onchange=e=>{ db.settings.minimap=e.target.checked; save(); drawMinimap(); };
$('#optLegend').onchange=e=>{ db.settings.legend=e.target.checked; save(); renderLegend(); };
$('#ghToken').oninput=e=>{ db.settings.gist.token=e.target.value.trim(); save(); };
$('#ghGist').oninput=e=>{ db.settings.gist.id=e.target.value.trim().replace(/^.*\//,''); save(); };
$('#ghAuto').onchange=e=>{ db.settings.gist.auto=e.target.checked; save(); };
$('#ghPush').onclick=()=>{ $('#ghStatus').textContent='Pushing…'; syncPush().catch(err=>{ $('#ghStatus').textContent='✕ '+err.message; }); };
$('#ghPull').onclick=()=>{ $('#ghStatus').textContent='Pulling…'; syncPull().catch(err=>{ $('#ghStatus').textContent='✕ '+err.message; }); };
async function exportJson(){ flush(); download(`sprawl-backup-${iso(new Date())}.json`, JSON.stringify(await exportData(),null,1), 'application/json'); }
function exportMd(){ download(`${S().name.replace(/[^\w-]+/g,'-')}.md`, spaceMarkdown(S()), 'text/markdown'); }
function exportCanvas(){ download(`${S().name.replace(/[^\w-]+/g,'-')}.canvas`, JSON.stringify(toJsonCanvas(S()),null,1), 'application/json'); }
$('#expJson').onclick=exportJson; $('#expMd').onclick=exportMd; $('#expCanvas').onclick=exportCanvas;
$('#impJson').onclick=()=>$('#impFile').click();
async function importFile(f){
  try{ const d=JSON.parse(await f.text());
    if(d.nodes){ const s=fromJsonCanvas(d,f.name.replace(/\.(canvas|json)$/i,'')); db.spaces[s.id]=s; db.order.push(s.id); switchSpace(s.id); toast(`Imported canvas — ${s.cards.length} cards`); return; }
    if(!d.spaces) throw 0;
    for(const [id,s] of Object.entries(d.spaces)){ db.spaces[id]=s; if(!db.order.includes(id)) db.order.push(id); }
    (d.templates||[]).forEach(t=>{ if(!db.templates.some(q=>q.id===t.id)) db.templates.push(t); });
    migrate(db); await migrateImages(); await loadImages(); save(); render(); toast(`Imported ${Object.keys(d.spaces).length} space(s)`);
  }catch(err){ toast('That file isn’t a Sprawl backup or JSON Canvas'); }
}
$('#impFile').onchange=async e=>{ const f=e.target.files[0]; if(f) await importFile(f); e.target.value=''; };

let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2600); }
addEventListener('resize',()=>queueMini());

// =====================================================================
// GO
// =====================================================================
document.querySelectorAll('i[data-i]').forEach(el=>{ el.outerHTML=I(el.dataset.i); });
(async()=>{
  db = migrate(load() || seed());
  try{ if(await migrateImages()) flush(); await loadImages(); gcImages(); }catch(e){}
  const freshView=!S().view;
  applyTheme();
  render();
  if(freshView) zoomFit(false,1,innerWidth<600?.7:.15);
  showEngine();
  if(!db.settings.introSeen) openIntro();
  window.__sprawl = { get db(){ return db; }, ruleRank, rank, modelProbs, parseWhen, parseCalc, parseConvert, parseTZ, parseGoal, parsePoll, parseContact, parseExpense, parseSplit, parseCountdown, parseHabit, parseTimer, parseRandom, parseColor, storeImage, imgSrc };
})();
})();
