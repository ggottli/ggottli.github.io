// Synthetic training data for the Sprawl shape model. Templates + vocab, seeded so runs are reproducible.
'use strict';
let seed=1337; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
const pick=a=>a[Math.floor(rnd()*a.length)];
const int=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const maybe=(p,s)=>rnd()<p?s:'';
const cap=s=>s?s[0].toUpperCase()+s.slice(1):s;

const names=['maya','sam','priyanka','jordan','alex','noah','mike','greg','lena','tom','ava','dad','mom','the team','the landlord','dr patel','sarah','liam','chen','omar','ines','kai','the client','my sister','ben','zoe'];
const people=['maya chen','sam rivera','jordan lee','alex kim','noah brooks','lena fischer','tom okafor','ava patel','omar haddad','ines moreau','kai tanaka','zoe martin','ben adler','sarah cole'];
const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday','mon','tue','wed','thu','fri','sat','sun','tomorrow','today','tonight','next week','this weekend','next monday','next friday','in 2 days','in 3 weeks','day after tomorrow'];
const dates=['march 5','nov 12','jan 3rd','sept 30','dec 1','4/14','10/30','12/3','2026-11-05','apr 22','june 8','july 4th','oct 9'];
const times=['8am','9am','10am','11am','noon','1pm','2pm','3pm','4pm','5:30pm','6pm','7pm','8pm','9:15','10:30','at 3','at 7','7:30','midnight','in the morning','in the afternoon','in the evening'];
const eventWords=['dinner','lunch','breakfast','brunch','coffee','meeting','sync','standup','1:1','interview','dentist','doctor','haircut','call','demo','review','workshop','party','concert','game','class','flight','hotel check-in','trip','drinks','birthday','wedding','webinar','appointment','practice','rehearsal','offsite','movie','happy hour','catch up','visit','board meeting','retro','planning','kickoff'];
const places=['the office','downtown','the cafe','zoom','home','the park','the gym','the studio','school','the airport','their place','the library'];
const cities=['tokyo','london','paris','berlin','sydney','new york','chicago','denver','toronto','mumbai','dubai','singapore','seoul','lisbon','austin','seattle','boston','madrid','rome','bangkok','hong kong','mexico city','amsterdam','honolulu','auckland','vancouver','cairo','nairobi'];
const zones=['pst','est','cst','mst','gmt','utc','ist','cet','jst','bst','aest','sgt','pt','et'];
const verbs=['call','email','text','buy','send','finish','schedule','book','review','fix','write','ship','pay','submit','prep','update','draft','ask','reply','clean','order','research','read','build','deploy','check','renew','cancel','return','pick up','plan','follow up with','set up','make','get','file','print','sign','register','confirm','meet','finalize','test','refactor','merge','push','publish','post','share','invite','contact','message','ping','start','try','learn','study','practice','wash','organize','sort','backup','migrate','measure','sketch','outline','rewrite','proofread','mail','return','water','feed','walk','vacuum','declutter','install','upgrade','reserve','look into','figure out','decide on','clear out'];
const objects=['the report','taxes','the invoice','groceries','the dentist','the landlord','the deck','the budget','the proposal','the dog','the plants','the car','insurance','passport','the slides','the contract','tickets','the kitchen','the garage','the website','the bug','the onboarding doc','the api','the blog post','the newsletter','mom','the bank','a gift for sam','the lease','the pr','the roadmap','the demo','the pitch','the quarterly numbers','the new hire','the design review','the printer','the wifi','dinner','the trip','a plumber','the laundry','birthday cards','the podcast','that paper','the standup notes'];
const things=['milk','eggs','bread','coffee','bananas','rice','chicken','onions','garlic','olive oil','pasta','cheese','yogurt','apples','spinach','batteries','charger','passport','headphones','sunscreen','toothbrush','socks','notebook','pens','tape','light bulbs','paper towels','dog food','butter','tomatoes','lemons','beans','oats','tea','honey','flour','sugar','salt','towels','cables','hdmi adapter','umbrella','snacks','water bottle'];
const topics=['the launch','onboarding','pricing','the garden','retention','the move','the roadmap','hiring','the kitchen remodel','our weekly digest','the summer trip','the reading list','customer churn','remote work','the new logo','the podcast','meal prep','sleep','the budget','the api redesign','mentoring','the book club','the parking situation','q3 planning','the side project'];
const adjs=['interesting','surprising','slow','expensive','worth it','overrated','underrated','messy','fun','hard','simple','weird','great','fine','broken','done','blocked','promising','risky','boring'];
const noteFrag=['the meeting went better than expected','thinking about {topic} again','idea: combine {topic} with {topic2}','notes from the call: they want it by spring','the cheaper option is probably fine for now','{topic} is {adj}, keep an eye on it','random thought — what if {topic} were optional','{name} mentioned {topic} is {adj}','turns out the {thing} was in the garage the whole time','we agreed to revisit {topic} after the holidays','the {thing} aisle is at the back on the left','good quote from the book about {topic}','{topic}: mostly {adj}, a bit {adj2}','key takeaway: fewer meetings, more writing','observation: nobody reads the long version','the second draft is much tighter than the first','still not sure {topic} is the right call','learned today that {city} has two airports','{name} is out until {day}','this is where the {topic} notes live','remember how {adj} {topic} felt last time','parking is free after 6','the plan: ship small, learn fast','{topic} — park it for now','feels like {topic} keeps coming back','that podcast episode about {topic} was {adj}','the view from the {place} is {adj}','ok so {topic} is basically {adj}','rough notes on {topic}','context for later: {name} owns {topic}','{topic} recap\nwhat worked: {adj}\nwhat didn\'t: {adj2}','they said yes','meh','not today','!!','wow','the {thing} arrived','my favorite part was the ending','i keep forgetting how {adj} {place} is in winter','cold brew ratio 1:4 overnight','wifi password is on the fridge','the 2025-2026 plan','q4 2025-2026 plan','i sat with {name} for an hour','enjoy the sun today','9-5 is fine','the sun was out','spend less time on {topic}','{num}-{num2} people showed up','version 2.3.1 broke the {thing}','room 204, second floor','{city} was {adj}'];
const quotes=['the only way out is through','less, but better','make it work, make it right, make it fast','simplicity is the ultimate sophistication','what gets measured gets managed','done is better than perfect','the best time to plant a tree was twenty years ago','everything should be made as simple as possible, but not simpler','you can\'t manage what you can\'t see','ship it and see','first make the change easy, then make the easy change','writing is thinking','slow is smooth, smooth is fast','perfect is the enemy of good','move slowly and fix things','the map is not the territory','i have not failed, i\'ve just found ten thousand ways that won\'t work'];
const qs=['why does {topic} keep slipping','how do we know {topic} is working','what would make {topic} easier','should we drop {topic}','who owns {topic}','is {topic} worth the cost','when did {topic} last get reviewed','what\'s the simplest version of {topic}','how might we fix {topic}','what if we stopped {topic} entirely','where does {topic} go wrong','could {name} take over {topic}','do we actually need {topic}','what did we learn from {topic}','is {name} coming {day}','does anyone still use the {thing}','why is {place} always so busy','what\'s blocking {topic}','how many people does {topic} affect','are we sure about {topic}','which {topic} option is cheaper'];
const activities=['focus','stretch','break','nap','tea','meditation','reading','writing','deep work','workout','plank','walk','oven','laundry','pasta','rest','study','sprint','eggs','rice','cooldown','breathing','standup','power nap','sauna','journaling','piano','drawing','sketching','emails','inbox zero','tidy up'];
const habits=['run','gym','read','meditate','stretch','journal','walk the dog','drink water','no sugar','floss','write','practice piano','spanish','yoga','cold shower','call mom','water the plants','inbox zero','lift','swim','bike','sleep by 11','vitamins','10k steps','cook at home','sketch','pushups','language lesson','tidy desk','early wake'];
const goalUnits=['books','miles','km','pages','words','pushups','workouts','hours','posts','users','customers','dollars','steps','days','episodes','chapters','lessons','trips','recipes','calls'];
const goalVerbs=['read','run','walk','write','ship','save','log','finish','publish','reach','swim','draw','learn','cook','visit','record','sell','sign','close'];
const colorNames=['sky blue','sage','terracotta','coral','navy','mustard','teal','burgundy','charcoal','forest green','mint','lavender','salmon','olive','crimson','indigo','slate gray','cream','rust','cobalt','emerald','plum','peach','sand','maroon','periwinkle','ivory','ochre','magenta','turquoise'];
const units=[['miles','km'],['km','miles'],['kg','lbs'],['lbs','kg'],['feet','meters'],['cm','inches'],['inches','cm'],['f','c'],['c','f'],['celsius','fahrenheit'],['liters','gallons'],['cups','ml'],['oz','grams'],['mph','kph'],['gb','mb'],['hours','minutes'],['acres','hectares'],['yards','meters'],['tbsp','ml'],['stone','kg'],['m','ft'],['knots','mph'],['days','hours'],['sq ft','sqm']];
const expenseThings=['lunch','coffee','uber','groceries','gas','the train','rent','dinner','parking','a book','flights','the hotel','netflix','new shoes','the gym','pharmacy','concert tickets','electricity','the plumber','dog food','takeout','a haircut','taxi','beer','the dentist','a gift','sushi','bagels','a lamp','spotify'];
const holidays=['christmas','new year','new years eve','halloween','thanksgiving','valentines day','july 4th','labor day','memorial day','mothers day','fathers day','st patricks day','christmas eve','nye'];
const futureEvents=['the trip','launch','my birthday','the wedding','vacation','the deadline','the exam','the move','graduation','the marathon','the big game','the conference','the retreat','demo day','kickoff'];
const pollOpts=[['tacos','ramen','pizza'],['beach','hike','museum'],['friday','saturday'],['blue','green','orange'],['zoom','in person'],['morning','afternoon'],['train','drive','fly'],['italian','thai','sushi'],['option a','option b'],['keep','cut'],['monthly','yearly'],['react','svelte','vue'],['coffee','tea'],['park','pool'],['v1','v2','v3'],['cats','dogs'],['ship friday','ship monday'],['bold','subtle'],['the red one','the black one'],['stay','go'],['mountains','sea'],['book club','movie night','board games']];
const occasions=['for friday','tonight','for the offsite','this weekend','for lunch','for the launch','for q3','for the party','next week','for the logo','for dinner','for the trip'];
const headings=['q3 roadmap','ideas','week 12','launch plan','reading list','open questions','parking lot','next steps','people','budget 2027','trip to {city}','the pitch','inbox','done','backlog','themes','risks','{topic}','wins','maybe later','today','this week','project phoenix','retro notes','design review','shopping','agenda','decisions','principles','links','archive','timeline','phase 2','draft 3','version b','kitchen','garden','health','money','learning','notes','{topic} — {adj}'];
const domains=['example.com','github.com/sprawl/sprawl','news.ycombinator.com/item?id=4123','en.wikipedia.org/wiki/Spatial_memory','youtube.com/watch?v=dQw4w9WgXcQ','open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC','kinopio.club','medium.com/@sam/why-we-switched','docs.google.com/document/d/abc','notion.so/team/plan','arxiv.org/abs/2301.01234','x.com/someone/status/123','vercel.com/blog/some-post','nytimes.com/2026/10/26/tech/canvas.html','figma.com/file/xyz','linear.app/issue/SP-42','substack.com/p/slow-software','pketh.org/towards-a-better-whiteboard.html'];
const emails=['maya@example.com','sam.rivera@gmail.com','jordan@acme.co','alex.kim@uni.edu','hello@studio.io','noah_b@outlook.com','lena@fischer.de'];
const phones=['555 201 8890','(555) 201-8890','555-201-8890','+1 555 201 8890','+44 20 7946 0958','98200 12345','+91 98200 12345','415-555-0199','212 555 0147','07700 900123'];

function fill(t){ return t.replace(/\{(\w+)\}/g,(m,k)=>({name:pick(names),topic:pick(topics),topic2:pick(topics),adj:pick(adjs),adj2:pick(adjs),thing:pick(things),day:pick(days),city:pick(cities),place:pick(places),num:int(2,40),num2:int(41,99)}[k]??m)); }

const gen={
  note(){ const r=rnd();
    if(r<.55) return fill(pick(noteFrag));
    if(r<.75) return fill(pick(noteFrag))+'\n'+fill(pick(noteFrag));
    if(r<.85) return cap(fill(pick(noteFrag)))+'. '+cap(fill(pick(noteFrag)))+'.';
    if(r<.92) return ['```','const x = '+int(1,9)+';','```'].join('\n');
    return pick(['2026-11-05','10/30','12/1','555-123-4567','1-800-555-1234','9-5','2025-2026','v2.3.1','room '+int(100,999),'row '+int(1,30)+' seat '+int(1,40),'3-4 people','lot b',int(1,99)+' comments','pin 4421','flight ba'+int(100,999),'take the 2nd exit','ch '+int(1,20),'page '+int(1,400)]); },
  todo(){ const r=rnd(), v=pick(verbs), o=pick(objects);
    if(r<.25) return `${v} ${o}`+maybe(.3,' '+pick(days))+maybe(.2,' @'+pick(['tomorrow','fri','mon','nextweek','today']));
    if(r<.4) return pick(['need to','i need to','have to','i have to','must','remember to','todo:','to do:'])+` ${v} ${o}`+maybe(.3,' by '+pick(days));
    if(r<.55){ const k=int(2,5); return pick(['buy','get','pack','bring','grab','pick up','order'])+' '+Array.from({length:k},()=>pick(things)).join(rnd()<.5?', ':', ')+(rnd()<.5?' and '+pick(things):''); }
    if(r<.75){ const k=int(2,5); return Array.from({length:k},()=>pick(['- ','* ','• ',''])+cap(pick(verbs))+' '+pick(objects)).join('\n'); }
    if(r<.9){ const k=int(1,4); return (rnd()<.5?pick(['todo','tasks','groceries','packing list','next steps','this week','checklist'])+':\n':'')+Array.from({length:k},()=>`[${rnd()<.2?'x':' '}] ${pick(verbs)} ${pick(objects)}`).join('\n'); }
    return pick(['spend 20 min on email','clear out the inbox','sort the photos from '+pick(cities),'call back '+pick(names),'quick fix for the '+pick(things),'one more pass on '+pick(topics),'declutter desk','get the '+pick(things)+' before '+pick(days),'renew the lease','unsubscribe from newsletters']); },
  heading(){ const r=rnd(), h=fill(pick(headings)); if(r<.4) return '# '+cap(h); if(r<.55) return '## '+cap(h); if(r<.75) return h.toUpperCase(); return h.split(' ').map(cap).join(' '); },
  link(){ const u='https://'+pick(domains), r=rnd(); if(r<.5) return u; if(r<.8) return u+' '+pick(['read later','check later','watch later','bookmark','for the deck','ref','good thread','save']); return pick(['read later','worth a look','from '+pick(names),'bookmark'])+' '+u; },
  question(){ const q=fill(pick(qs)), r=rnd(); if(r<.75) return cap(q)+'?'; if(r<.9) return q+'??'; return pick(['wondering whether ','open question: ','not sure '])+q; },
  quote(){ const q=pick(quotes), r=rnd(), who=pick(['dieter rams','kent beck','someone wise','my grandmother','a wise friend','unknown','brian eno','the manual','steve jobs','annie dillard',pick(names)]); if(r<.5) return `"${q}" — ${who}`; if(r<.7) return `> ${q}`; if(r<.85) return `“${q}”`; return `"${q}" - ${who}`; },
  event(){ const r=rnd(), e=pick(eventWords), n=pick(names), d=pick(days), t=pick(times), dt=pick(dates);
    if(r<.3) return `${e} with ${n} ${d} ${t}`;
    if(r<.45) return `${e} ${d} ${t}`;
    if(r<.55) return `${d} ${t} ${e} with ${n}`;
    if(r<.65) return `${e} ${dt}`+maybe(.5,' '+t);
    if(r<.75) return `${pick(['flight to','train to','trip to','fly to'])} ${pick(cities)} ${pick([d,dt])}`+maybe(.6,' '+t);
    if(r<.85) return `${n} ${d} ${t}`;
    if(r<.93) return `${e} at ${pick(places)} ${d}`+maybe(.5,' '+t);
    return pick([`${int(10,45)} minute ${e} ${d} ${t}`,`${e} w/ ${n} ${d.slice(0,3)} ${t}`,`${e}: ${n}, ${d} ${t}`,`${cap(e)} ${dt} ${t}`,`${n}'s ${pick(['birthday','wedding','party','recital'])} ${dt}`]); },
  reminder(){ const r=rnd(), v=pick(verbs), o=pick(objects), when=pick(days)+maybe(.4,' '+pick(times));
    if(r<.45) return `remind me to ${v} ${o} ${when}`+maybe(.2,' '+pick(['urgent','asap','important','!!']));
    if(r<.6) return `remind me ${when} to ${v} ${o}`;
    if(r<.75) return `don't forget to ${v} ${o}`+maybe(.6,' '+when);
    if(r<.9) return `reminder: ${v} ${o} ${when}`;
    return pick([`don't forget ${pick(things)}`,`remind me: ${v} ${o}`,`reminder — ${o} ${when}`,`dont forget to ${v} ${o}`]); },
  timer(){ const r=rnd(), n=pick([1,2,3,5,8,10,12,15,20,25,30,45,50,60,90]), a=pick(activities);
    if(r<.35) return `${n} min ${a}`; if(r<.5) return `${a} ${n} ${pick(['min','mins','minutes'])}`;
    if(r<.6) return `${pick(['set a timer for','timer','start a','set'])} ${n} ${pick(['min','minutes'])}`+maybe(.5,' '+a);
    if(r<.7) return `${n}m ${a}`; if(r<.8) return `${pick(['pomodoro','focus session','deep work','focus'])}`;
    if(r<.9) return `${n} ${pick(['min','minutes'])}`; return pick([`${int(1,2)} hour ${a}`,`${int(10,59)} sec ${a}`,`${n}:00 ${a}`.replace(':00',' min'),`${n} min`,`${a} timer`,`${int(1,3)}h ${a}`]); },
  habit(){ const r=rnd(), h=pick(habits), n=int(2,6);
    if(r<.3) return `${h} ${n}x a week`; if(r<.45) return `${h} ${pick(['daily','every day','everyday','every morning','every night','every evening','nightly'])}`;
    if(r<.6) return `${h} ${n} times a week`; if(r<.7) return `${pick(['daily','weekly'])} ${h}`;
    if(r<.8) return `${h} ${pick(['once a week','twice a week','every weekday','weekdays','3 times per week','2x/week'])}`;
    if(r<.9){ const dl=['mon','tue','wed','thu','fri','sat','sun','monday','tuesday','wednesday','thursday','friday']; const k=int(2,3); const ds=Array.from({length:k},()=>pick(dl)); return `${h} ${ds.join(pick([' and ','/',', ',' & ']))}`; }
    return pick([`${h} ${n}x per week`,`${h} every day`,`${n}x a week ${h}`,`${h} - daily`,`${h} (daily)`,`${h} ${n}x/wk`,`${h} on ${pick(['mon','tue','wed','thu','fri'])} and ${pick(['tue','wed','thu','fri','sat'])}`]); },
  goal(){ const r=rnd(), v=pick(goalVerbs), n=pick([5,10,12,20,24,30,50,52,100,200,365,500,1000,5000,10000]), u=pick(goalUnits), m=int(0,Math.max(1,Math.floor(n*.6))), per=pick(['this year','this month','this week','this quarter','by december','by summer','by june','in 2027']);
    if(r<.35) return `${v} ${n} ${u} ${per}, ${m} ${pick(['done','so far','completed','finished'])}`;
    if(r<.55) return `${v} ${n} ${u} ${per}`; if(r<.7) return `goal: ${v} ${n} ${u}`+maybe(.5,', '+m+' done');
    if(r<.85) return `${v} ${n} ${u} ${per} - ${m} ${pick(['done','so far'])}`;
    return pick([`save $${n} ${per}`,`${n} ${u} ${per}, ${m} logged`,`goal ${n} ${u}`,`${v} ${n} ${u} by ${pick(dates)}`,`${v} ${n}k ${u} ${per}`]); },
  color(){ const r=rnd(); const hex=()=>'#'+Array.from({length:rnd()<.3?3:6},()=>'0123456789abcdef'[int(0,15)]).join('');
    if(r<.4) return hex(); if(r<.55) return hex().toUpperCase(); if(r<.85) return pick(colorNames); if(r<.93) return `rgb(${int(0,255)}, ${int(0,255)}, ${int(0,255)})`; return `hsl(${int(0,359)}, ${int(0,100)}%, ${int(0,100)}%)`; },
  calc(){ const r=rnd(), a=int(2,999), b=int(2,99), p=pick([5,10,12,15,18,20,25,30,50,8.5]);
    if(r<.25) return `${p}% of ${a}`; if(r<.45) return `${a} ${pick(['+','-','*','/','x','×'])} ${b}`;
    if(r<.55) return `what is ${a} ${pick(['times','plus','minus','divided by'])} ${b}`; if(r<.65) return `${a}*${b}${pick(['','+'+int(1,9),'/'+int(2,9)])}`;
    if(r<.75) return `${pick(['sqrt','abs','round'])}(${a})`; if(r<.85) return `${a} ${pick(['squared','cubed'])}`;
    return pick([`$${a} + ${p}% tip`,`${p}% off ${a}`,`(${a}+${b})*${int(2,9)}`,`${a}/${b}=`,`${a} plus ${b}%`,`=${a}*${b}`,`${a}^2`,`${int(1,9)}/${int(2,9)} + ${int(1,9)}/${int(2,9)}`]); },
  convert(){ const [u1,u2]=pick(units), n=pick([1,2,3,4,5,6,8,10,12,15,20,25,30,50,60,68,72,75,100,150,200,250,500,1000]), r=rnd();
    if(r<.5) return `${n} ${u1} ${pick(['in','to','into'])} ${u2}`; if(r<.65) return `convert ${n} ${u1} to ${u2}`;
    if(r<.8) return `${n}${u1} to ${u2}`; return `${n} ${u1} ${pick(['=','->','as'])} ${u2}`; },
  split(){ const r=rnd(), n=pick([24,36,48,60,86,90,120,150,180,240,300,480,1200,2400]), k=int(2,8), tip=pick([10,15,18,20,22,25]);
    if(r<.4) return `split ${n} between ${k}`; if(r<.55) return `split ${n} between ${k} tip ${tip}%`; if(r<.7) return `split $${n} ${pick(['among','between','with','across'])} ${k}`+maybe(.3,' people');
    if(r<.85) return `${n} split ${k} ways`.replace('ways',k>4?'ways':'ways'); return pick([`split the bill ${n} ${k} ways`,`split ${n} by ${k} with ${tip}% tip`,`$${n} split between ${k}`,`split ${n}k between ${k}`]); },
  expense(){ const r=rnd(), n=pick([4,6,8,12,14,18,22,25,30,38,45,60,80,120,250,450,900,1200]), t=pick(expenseThings);
    if(r<.4) return `spent ${n} on ${t}`; if(r<.55) return `$${n} ${t}`; if(r<.7) return `paid ${n} for ${t}`; if(r<.8) return `${t} cost $${n}`;
    return pick([`spent $${n} ${t}`,`${t} was $${n}`,`paid $${n} ${t}`,`spent ${n} bucks on ${t}`,`${n} on ${t}`.replace(/^/,'$'),`i spent ${n} at ${t}`]); },
  countdown(){ const r=rnd(), h=pick(holidays), e=pick(futureEvents), d=pick(dates);
    if(r<.35) return `days until ${h}`; if(r<.5) return `countdown to ${pick([h,d,e+' '+d])}`; if(r<.65) return `how many days until ${pick([h,d,e+' on '+d])}`;
    if(r<.8) return `${pick([h,e])} countdown`; return pick([`days till ${d}`,`how long until ${h}`,`sleeps until ${h}`,`days until ${e} ${d}`,`weeks until ${d}`,`days before ${d}`]); },
  timezone(){ const r=rnd(), c=pick(cities), c2=pick(cities), t=pick(['9am','3pm','10:30am','noon','5pm','8pm','7','11']);
    if(r<.35) return `time in ${c}`; if(r<.5) return `${t} ${pick(zones)} in ${pick([pick(zones),c])}`; if(r<.65) return `what time is it in ${c}`;
    if(r<.75) return `${t} ${c} ${pick(['in','to'])} ${c2}`; if(r<.85) return `time in ${c}, ${c2}`; return pick([`${c} time`,`current time in ${c}`,`${t} ${pick(zones)} to ${pick(zones)}`,`clock in ${c} and ${c2}`,`${t} here in ${c}`]); },
  random(){ const r=rnd(), o=pick(pollOpts);
    if(r<.25) return `roll ${pick(['2d6','d20','a die','3d6','1d8','d6','dice'])}`; if(r<.4) return pick(['flip a coin','coin flip','heads or tails','toss a coin','coin toss']);
    if(r<.6) return `pick one: ${o.join(', ')}`.replace(/, ([^,]+)$/,' or $1'); if(r<.75) return `${pick(['choose','pick','random','decide'])} ${pick(['between','from',''])} ${o.join(' or ')}`.replace(/\s+/g,' ');
    if(r<.85) return `random number between ${int(1,10)} and ${int(20,100)}`; return pick(['yes or no','magic 8 ball','d20','2d6','pick a number from 1 to 10','8 ball',`choose: ${o.join(', ')}`]); },
  poll(){ const r=rnd(), o=pick(pollOpts), oc=pick(occasions);
    if(r<.35) return `${o.join(', ')} ${oc}?`.replace(/, ([^,]+) (for|tonight|this|next)/,' or $1 $2'); if(r<.55) return `${o.join(' or ')}?`;
    if(r<.7) return `poll: ${o.join(' vs ')}`; if(r<.85) return `${pick(['should we','do we want','which one:','what\'s better:','let\'s do'])} ${o.join(' or ')}?`;
    return pick([`${o[0]} vs ${o[1]}?`,`vote: ${o.join(', ')}`,`${cap(o.join(' or '))} ${oc}?`,`poll ${o.join(' / ')}`,`${o.join(', ')} or ${pick(o)}?`]); },
  contact(){ const r=rnd(), n=pick(people), ph=pick(phones), em=pick(emails);
    if(r<.3) return `${n} ${ph}`; if(r<.5) return `${n} ${em}`; if(r<.7) return `${n} ${ph} ${em}`; if(r<.8) return `${n} - ${em}`;
    return pick([`${n}: ${ph}`,`${n}, ${em}`,`${cap(n.split(' ')[0])} ${ph}`,`${n} phone ${ph}`,`${n} email ${em}`,`${n} mobile: ${ph}`,`${n} · ${ph} · ${em}`]); },
};
const COUNTS={note:2600,todo:2200,heading:1000,link:900,question:1300,quote:700,event:2000,reminder:1200,timer:1100,habit:1000,goal:1000,color:800,calc:1000,convert:1000,split:700,expense:1000,countdown:900,timezone:900,random:900,poll:1300,contact:900};
function generate(){ const out=[]; for(const [type,n] of Object.entries(COUNTS)){ const seen=new Set(); let tries=0; while(seen.size<n && tries<n*4){ tries++; const t=gen[type](); if(t && !seen.has(t)) seen.add(t); } seen.forEach(text=>out.push({text,type})); } return out; }
module.exports={generate, COUNTS};
