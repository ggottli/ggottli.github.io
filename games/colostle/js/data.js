/* =====================================================================
   DATA — rules & tables, summarised in plain words from the rulebooks.
   Card: {r: 1..13, s: 'S'|'H'|'C'|'D'}
   ===================================================================== */
const SUITS = {
  S:{sym:'♠',name:'Spades',color:'black'},
  H:{sym:'♥',name:'Hearts',color:'red'},
  C:{sym:'♣',name:'Clubs',color:'black'},
  D:{sym:'♦',name:'Diamonds',color:'red'}
};
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_WORDS = ['Ace','2','3','4','5','6','7','8','9','10','Jack','Queen','King'];
const rankLabel = r => RANKS[r-1];
const cardLabel = c => rankLabel(c.r) + SUITS[c.s].sym;
const colorOf = c => SUITS[c.s].color;
const isRed = c => colorOf(c)==='red';
const isFace = c => c.r>=11;

/* ---------- Classes ---------- */
const CLASSES = {
  armed:   {name:'The Armed',    exp:3, com:4, book:'Core', blurb:'A Rook arm has been grafted to your body through a grafting ritual. Melee specialists, warriors, tough. Any kind of arm: blade, hand, cannon, something stranger. An arm with a hand can carry an extra weapon.',
            qs:['Is the arm a trophy from your first Rook, a family heirloom, a replacement limb, or a mark of status?','What does it cost you to wield it — weight, pain, a mind that pushes back?','Do you see flashes of the Rook’s memories through it?']},
  followed:{name:'The Followed', exp:5, com:3, book:'Core', blurb:'A small Rook companion — a Rookling — follows you. Rooklings are found in the cores of larger Rooks and have roughly a pet’s level of sense. Followed are rangers, pathfinders and navigators. Your Rookling shares the body and magic type of the Rook it came from (build it with the Rook creation tables).',
            qs:['Did you have to hide the bond from a village that hates Rooks?','Is your Rookling the core of a Rook that hurt someone you loved?','What does it look like, and how do the two of you fight together?']},
  helmed:  {name:'The Helmed',   exp:2, com:5, book:'Core', blurb:'You wear a Helm made from a Rook’s core, granting you its magic (Ice, Electric or Rumble). Helmed are the closest thing to wizards or crystal-engineers. Venerated by some, feared or hunted as heretics by others.',
            qs:['When did you first understand how Rooks work?','Do you respect Rooks or just see parts to tinker with?','Are you more at home in a workshop than on the road?']},
  mounted: {name:'The Mounted',  exp:5, com:2, book:'Core', blurb:'You ride a mount built from Rook locomotion parts — anything from a horse-like walker to a boat or a bike. Nomads, scavengers and mechanics who constantly harvest parts to keep the mount running. The mount carries a weapon you can use on Weapon attacks. Low combat to start, but you will grow.',
            qs:['Do you come from a tribe of Mounted who build homes from Rook parts?','What does your mount look like, and what weapon is bolted to it?','Have you found a part unlike any other?']},
  allied:  {name:'The Allied',   exp:5, com:4, book:'Roomlands', blurb:'Two characters played as one. No starting power-up, but you have each other. Decide freely which of the two does what in exploration and combat, and who takes each wound. If a score hits zero, one of the two dies — add 2 to that score and carry on as the survivor. Arms, helms, Rooklings and mounts you win can be fitted to either.',
            qs:['Siblings, partners, old friends — or thrown together by a ritual neither of you chose?','What tests the bond?']},
  bastion: {name:'The Bastion',  exp:2, com:4, book:'Roomlands', blurb:'A person-sized, speaking stone construct — the “immune system” of a long-lost Colossal Rook. Bastions share the powers of their Colossal Rook’s Rookstone on a small scale and are usually met with fear or distrust by Roomlanders.',
            qs:['Where did you come from, and do you remember it?','Are you searching for others like you, or the Colossal body you were born in?']},
  within:  {name:'The Within',   exp:5, com:5, book:'Core (earned)', blurb:'Never a starting class. Defeat an Astrolithic Rook on the Battlements and pilot its husk as a flying Rooksuit. While Within you can fly, you are ignored by Astrolithics, and your scores are a temporary 5/5 upgrade over your true class.',
            qs:['Is this the end of your legend, or a new beginning?','What happens if you are separated from the suit?']}
};

/* ---------- Calling & Nature ---------- */
const CALLINGS = [
  [1,2,'The Black Army','An unstoppable army in spiked black armour is burning its way across the lands — and, impossibly, living Rooks with purple-flame eyes march under its command. They came to your village one night. You survived. Get to the bottom of the Black Army and the Rooks of Purple Flame.'],
  [3,4,'The Weapon in the Tower','A dream shows you a slender tower, far away, that might once have been a Rook. A weapon waits at its top, calling to you. Your village is besieged by Rooks and its hunters are stretched thin — reaching the tower might save it.'],
  [5,6,'The Dragon Rook','The only Rook known to fly passed overhead. Rumour says a hunting party is forming, and that whoever defeats it gains the power of flight. You can’t let them reach it first.'],
  [7,8,'A Secret Friendship','Your village hates all Rooks since one tore through it. Yet you have a secret friend — an unusual Rook that never attacks. One day it is gone from its spot in the forest, with signs of a struggle and a trail leading away. Find it.'],
  [9,10,'The Legend of the Rookstones','Everyone knows there are only three Rookstones: Ice, Shock and Rumble. But the childhood stories spoke of hundreds of one-of-a-kind stones with unique powers. What if the fabled Rookstones are real?'],
  [11,12,'The Key and the Five Temples','A family map covering many Rooms marks five locations that look like fallen Rook bodies, each with a coloured glyph. A strange key with a Rook symbol looks like it would fit one. What is locked inside?'],
  [13,13,'A Mission for a Knight','You belong to an Order of Knights — the finest Rook fighters in the Colostle. Your superior has summoned you with a mission.']
];
const NATURES = [
  [1,2,'Happy-go-lucky, extremely optimistic, fun'],
  [3,4,'Impatient, quick to anger, grumpy'],
  [5,6,'Brave, by-the-book, serious, no sense of humour'],
  [7,8,'Introspective, quiet, mysterious, few words'],
  [9,10,'Larger than life, exaggerated stories, roaring laughter'],
  [11,12,'Sly, strategic, always planning'],
  [13,13,'Salt of the earth, talks easily with anyone']
];

/* ---------- Exploration tables ----------
   Entry: {t:title, m:{suit or B/R : modifier}, d:description, g:glyph, sub:'items'|'events'|..., fight:'person'|'medium'|'massive'|..., clue:true}
*/
const TABLES = {};

TABLES.land = {
  name:'The Roomlands (on foot)', short:'Roomlands', book:'Core',
  intro:'Red cards are living things and people; black cards are places, structures and objects. Draw cards equal to your Exploration score and weave them into one chapter. Rooks are optional fights — you can always sneak past.',
  red:{
    1:{t:'Cultist', g:'hood', m:{H:'Unarmed',D:'Armed'}, d:'A stranger in unusual robes marked with a castle symbol. They are hard to find and harder to talk to, but they clearly know something about the Colostle. If it comes to a fight, create a person opponent.', fight:'person'},
    2:{t:'Wild animal', g:'paw', m:{H:'Easy prey',D:'Dangerous'}, d:'A strange beast to hunt for food — odd combinations of creatures you half-recognise. Adventuring is hungry work.'},
    3:{t:'Calling — a person', g:'star', m:{H:'Friendly',D:'Not friendly'}, d:'Someone tied to your Calling. A clue, a lead — or an obstacle who stands in your way.'},
    4:{t:'Someone needs you to find something', g:'person', m:{H:'Trustworthy',D:'Untrustworthy'}, d:'A person asks you to recover something they have lost or are too afraid to fetch. Draw from the Item table for the reward they offer, and use this phase’s other cards to shape where you must go. If it turns into a fight, create a person opponent.', sub:'items', fight:'person'},
    5:{t:'Dead body', g:'skull', m:{H:'Seems safe',D:'Something’s off…'}, d:'Another human, dead. Who were they? Draw an Item (something on their person) or an Event (the situation develops).', sub:'items', sub2:'events'},
    6:{t:'Another adventurer', g:'person', m:{H:'Friendly',D:'Not friendly'}, d:'Someone like you, in Rook armour and armed as one of the classes. Help, rivalry, or something darker? If it comes to a fight, create a person opponent.', fight:'person'},
    7:{t:'Gargoyles', g:'wings', m:{H:'Taken to a new area',D:'Taken to the Rafters'}, d:'A screech, heavy wings — and you are lifted by the shoulders. There is no fighting a Gargoyle. Hearts: it drops you in a whole new area. Diamonds: it carries you up to its nest in the Rafters (see the Rafters table).'},
    8:{t:'Village', g:'huts', m:{H:'Safe — draw an Item',D:'Draw an Event'}, d:'A small settlement of wood and skins. If safe, draw an Item to see what can be found there; otherwise draw an Event.', sub:'items', sub2:'events'},
    9:{t:'Massive skeleton', g:'bone', m:{H:'Safe',D:'Bandit camp'}, d:'Humanoid, impossibly large. It can’t be… can it?'},
    10:{t:'Non-human camp', g:'tent', m:{H:'They don’t notice you',D:'You are captured'}, d:'A camp of people who walk on two legs and carry tools — but are not human. Who are they? What do they want?'}
  },
  black:{
    1:{t:'Treasure', g:'chest', m:{S:'Untouched',C:'Evidence of attempted raids'}, d:'A large treasure — a chest, a golden object on an altar. Add 1 point to Exploration or Combat and invent an item for your inventory.', gain:'score'},
    2:{t:'Door', g:'door', m:{S:'Intact / locked',C:'Ruined'}, d:'A door between Rooms, so vast it vanishes into the sky. Ruined: slip through a gap. Intact: find a mechanism to open it. You may choose the Room beyond to be a Tundroom, or replace this prompt with a Crackway.'},
    3:{t:'Staircase', g:'stairs', m:{S:'Intact',C:'Ruined'}, d:'A staircase to another floor, each step the height of a house. Your first staircase leads to another floor; any later one may lead to the Battlements. You may replace this prompt with a Crackway.'},
    4:{t:'Ancient ruins', g:'ruins', m:{S:'Somewhat intact',C:'Mostly rubble'}, d:'Ruins of a people you have never heard of, with unfamiliar inscriptions. Draw an Event for something else to happen here.', sub:'events'},
    5:{t:'Strange mechanism', g:'gear', m:{S:'Functional',C:'Damaged'}, d:'Oversized pipes, gearwheels and levers that operate something in the Colostle. If damaged you may need to find something to repair it.'},
    6:{t:'Trap', g:'trap', m:{S:'You avoid it!',C:'You are caught in it!'}, d:'A hunter’s trap, a pit, old machinery. What now?'},
    7:{t:'Cave', g:'cave', m:{S:'Flat and easily navigable',C:'Deep and hard to climb into'}, d:'A dark entrance. Could it lead deeper into the Colostle itself? You may replace this prompt with a Crackway.'},
    8:{t:'The sea', g:'waves', m:{S:'Calm',C:'Stormy'}, d:'A coast, and water to the horizon — still inside a Room. Switch to the Ocean table if you have a boat (or a Mounted friend); otherwise treat it as a coastal region.'},
    9:{t:'Calling — a place', g:'star', m:{S:'Something you were looking for',C:'A clue to the next step'}, d:'A place tied to your Calling — a building with a clue, or a location you were seeking.'},
    10:{t:'A city', g:'city', m:{S:'Thriving',C:'Abandoned'}, d:'A huge settlement built from Rook husks: shops, culture, hunters. Open the City panel to build it, or consider it abandoned.'}
  },
  face:{
    11:{t:'Item', g:'flask', d:'You find an item. Draw from the Item table.', sub:'items'},
    12:{t:'Medium Rook', g:'rook', d:'A Rook the size of a cart or small building. Fight it (Combat score 3) or sneak past.', fight:'medium'},
    13:{t:'Massive Rook', g:'rook', d:'A Rook the size of a large house or bigger, with battlements and rooms inside. Fight it (Combat score 5) or sneak past.', fight:'massive'}
  }
};

TABLES.items = { name:'Items', short:'Items', book:'Core', kind:'sub',
  intro:'Draw here whenever a prompt says “draw an Item”, or to randomise any item you collect.',
  all:{1:{t:'Treasure (for trading)',gain:'treasure'},2:{t:'Supplies'},3:{t:'Knowledge'},4:{t:'Herbs / ingredients', d:'Enough to brew a healing potion that heals one Wound.'},5:{t:'Key'},6:{t:'Vehicle'},7:{t:'A tame animal'},8:{t:'Potion'},9:{t:'Machine part'},10:{t:'Map'},11:{t:'Weapon'},12:{t:'Artefact / idol'},13:{t:'2 Treasures (for trading)',gain:'treasure2'}}
};
TABLES.events = { name:'Events', short:'Events', book:'Core', kind:'sub',
  intro:'Draw here whenever a prompt says “draw an Event”, or any time you want more flavour.',
  all:{1:{t:'You meet a friend'},2:{t:'A storm'},3:{t:'Something falls from the “ceiling”'},4:{t:'You fall'},5:{t:'A loud noise'},6:{t:'A strange feeling'},7:{t:'Sun sets or rises'},8:{t:'A fire starts'},9:{t:'Something breaks'},10:{t:'Your way is blocked'},11:{t:'You are surrounded'},12:{t:'Hunger sets in'},13:{t:'Create / repair something'}}
};

TABLES.ocean = {
  name:'The Ocean (at sea)', short:'Ocean', book:'Core',
  intro:'You need a boat or seagoing mount. Several prompts ask you to check the Weather — if more than one does in a phase, only the first Weather draw counts. Sea Rooks are optional fights.',
  all:{
    1:{t:'Castle tower in the sea', g:'tower', m:{B:'Uninhabited',R:'You hear voices deep within…'}, d:'A lone tower rises from the waves with a doorway at sea level. Inside, stairs drop into an airtight complex beneath the water. Check Weather.', weather:true},
    2:{t:'Seagoing adventurer', g:'person', m:{B:'Friendly',R:'Not friendly'}, d:'Another sailor in their own vessel. If hostile and you fight, create a person opponent. Check Weather.', weather:true, fight:'person'},
    3:{t:'Shipwreck', g:'wreck', m:{B:'Intact — 2 Items',R:'Wrecked — 1 Item'}, d:'Pull alongside. Intact: explore inside and find two Items. Wrecked: one Item floats in the debris.', sub:'items'},
    4:{t:'Crenellated island', g:'tower', m:{B:'Dead',R:'The Rook’s traps are still active!'}, d:'Castle crenellations ring the island’s edge. Are you looking at the very top of a huge Rook beneath the waves?'},
    5:{t:'Sea creature', g:'waves', m:{B:'Swims past your vessel',R:'Hits your vessel as it passes!'}, d:'Something huge moves just below the surface. Leading you somewhere? Food? Check Weather.', weather:true},
    6:{t:'Sea cave', g:'cave', m:{B:'Uninhabited — draw an Item',R:'Inhabited — not by humans'}, d:'Large enough to sail into, cavern leading to cavern like an underground river.', sub:'items'},
    7:{t:'Pirate ship', g:'wreck', m:{B:'A Treasure to find',R:'A Weapon to find'}, d:'Pirates lasso your ship and haul you aboard. Not a fight — sneak through the decks, find the treasure or weapon, and escape.'},
    8:{t:'Shallows & underwater ruins', g:'ruins', m:{B:'Treasure to find',R:'Rook parts to find'}, d:'If the weather is good, drop anchor and dive.'},
    9:{t:'Small island', g:'island', m:{B:'Uninhabited',R:'Inhabited'}, d:'Run one Exploration phase on the Roomlands table here, then return to sea. Check Weather.', weather:true},
    10:{t:'Coastline', g:'waves', m:{B:'Unguarded',R:'Guarded'}, d:'Disembark here to return to the Roomlands table. Check Weather.', weather:true},
    11:{t:'Small island with an Item', g:'flask', d:'Draw from the Item table.', sub:'items'},
    12:{t:'Medium Sea Rook', g:'rook', d:'Fight it (Combat score 3) or steer wide.', fight:'medium'},
    13:{t:'Massive Sea Rook', g:'rook', d:'A leviathan breaching the surface. Fight it (Combat score 5) or steer wide.', fight:'massive'}
  }
};
TABLES.weather = { name:'Weather', short:'Weather', book:'Core', kind:'sub',
  intro:'Only the first Weather draw in a phase applies. Weather colours the whole phase — and any fight in it.',
  all:{1:{t:'Sunshine', d:'Add 1 to Exploration or Combat.', gain:'score'},2:{t:'Strong winds', d:'A good wind carries you where you want to go, fast.'},3:{t:'Fog', d:'Visibility down to arm’s length. Unnervingly quiet.'},4:{t:'Heavy rain', d:'No shelter. Sail on.'},5:{t:'Calm', d:'No wind, baking heat. Stuck for 24 hours.'},6:{t:'Crosswind', d:'Blown off course, lost at sea for 24 hours.'},7:{t:'Snow', d:'Flakes settle on the deck. It is going to get cold.'},8:{t:'Waterspout', d:'A twisting column of water — heading for you.'},9:{t:'Storm', d:'Huge waves, heavy winds.'},10:{t:'Lightning', d:'Forks light the sky; the sea churns.'},11:{t:'Ice', d:'The sea freezes around your boat. Stuck for 24 hours.'},12:{t:'Tsunami', d:'A wall of water looms. Ride it or be smashed.'},13:{t:'Maelstrom', d:'Your boat is damaged; you wake stranded on a new island. Return to the Roomlands table next phase.'}}
};

TABLES.battlements = {
  name:'The Battlements (rooftops)', short:'Battlements', book:'Core',
  intro:'Perpetual twilight under a sky of lights. Black = you explore stealthily; Red = exposed. If you end a phase with 3 or more red cards (Queen counts as 1 red, King as 2) you must either hide for the phase (redraw everything next phase) or draw an Exposure Event. Astrolithic Rooks have Combat score 6 and no creation step.',
  all:{
    1:{t:'Nomad camp', g:'tent', m:{B:'Stealthy',R:'Exposed!'}, d:'Frightened nomads squatting in a sturdy outbuilding. Resting with them heals one Wound.'},
    2:{t:'Barren prairie', g:'star', m:{B:'Stealthy',R:'Exposed!'}, d:'A flat roof stretching to the horizon. Almost no cover.'},
    3:{t:'Battlement edge', g:'tower', m:{B:'Stealthy',R:'Exposed!'}, d:'A labyrinth of lower roofs below. Moving on means climbing down.'},
    4:{t:'Small outbuilding', g:'tower', m:{B:'Stealthy',R:'Exposed!'}, d:'A tiny castle tower on the roof. Draw another card: black — find an Item; red — a wounded, cowering person.', sub:'items'},
    5:{t:'Crashed Astrolithic Rook', g:'rook', m:{B:'Stealthy',R:'Exposed!'}, d:'Rectangular wings of cracked blue glass. Helm, Arm or Mount materials may be salvaged — but no Rookling inside.'},
    6:{t:'Rooftop forest', g:'tree', m:{B:'Stealthy',R:'Exposed!'}, d:'Trees rooted in the brickwork — perfect cover. Quiet, calm, maybe animals to hunt.'},
    7:{t:'Ice wastes', g:'snow', m:{B:'Stealthy',R:'Exposed!'}, d:'This roof covers a cold Room below. Piercing arctic wind.'},
    8:{t:'Nomad being hunted', g:'wings', m:{B:'Stealthy',R:'Exposed!'}, d:'A lone nomad sprints in terror; behind them an Astrolithic Rook skims the ground. Do you help?'},
    9:{t:'Hole in the roof', g:'door', m:{B:'Stealthy',R:'Exposed!'}, d:'Dizzying height; lands and oceans like a patchwork far below. You could climb down to the Rafters of that Room.'},
    10:{t:'Friendly adventurer', g:'person', m:{B:'Stealthy',R:'Exposed!'}, d:'Tough and friendly, they team up with you. If you face an Astrolithic Rook this phase they reduce its Combat score by 1; otherwise they heal one of your Wounds.'},
    11:{t:'A way back down', g:'stairs', d:'A staircase or climbable wall back to a Room below (return to the Roomlands table).'},
    12:{t:'Queen — counts as 1 red card', g:'wings', d:'Whatever its colour, this adds one to your red count this phase.', redcount:1},
    13:{t:'King — counts as 2 red cards', g:'wings', d:'Whatever its colour, this adds two to your red count this phase.', redcount:2}
  }
};
TABLES.exposure = { name:'Exposure events', short:'Exposure', book:'Core', kind:'sub',
  intro:'Drawn when you risk exploring with 3+ red cards on the Battlements.',
  ranges:[[1,2,{t:'Treasure fall', d:'A stone capsule falls from the sky, triggered by your movement. Nothing attacks — the capsule holds a Treasure.', gain:'treasure'}],
          [3,4,{t:'Astrolithic Rook chase', d:'One falls onto a distant roof, rises, and turns toward you. Run and hide using this phase’s other prompts — or fight.', fight:'astrolithic'}],
          [5,6,{t:'Eerie silence', d:'Nothing happens. You got away with it this time.'}],
          [7,8,{t:'Astrolithic wreckfall', d:'Draw another card: red — debris hits you, take one Wound; black — you are safe.'}],
          [9,10,{t:'Meteor shower', d:'Burning debris rains down with nowhere to hide. Take one Wound.', wound:1}],
          [11,13,{t:'Astrolithic Rook appears', d:'Create no opponent — Astrolithics all fight alike. Combat score 6.', fight:'astrolithic'}]]
};

TABLES.tundroom = {
  name:'The Tundroom (ice wastes)', short:'Tundroom', book:'Roomlands',
  intro:'A Room of ice and snow. Enter one by choosing it as the Room beyond any Door. Travel village to village; friendly villages each have a trouble to solve (draw a Village Event) and reward you with 2 crew. Crew of 5 lets you sail a Rooknaught. Ice Rooks are always massive, always Ice, Combat score 5.',
  all:{
    1:{t:'Massive Rook husk', g:'rook', m:{R:'Bandits camped inside',B:'Abandoned'}, d:'With work this could become a Rooknaught. Create it with the Rook opponent tables; it takes a Mounted’s skills and 2 days. Sailing it needs a crew of 5.'},
    2:{t:'Balcony', g:'tower', m:{R:'Frozen waterfall',B:'Stairway up to it'}, d:'Halfway up the Room’s wall a floor juts out behind a massive stone railing. More lands up there, if you can climb.'},
    3:{t:'Village on a black rock', g:'huts', m:{R:'Unfriendly',B:'Friendly — draw a Village Event'}, d:'A settlement perched on an island in the Ice Sea. Unfriendly villages drive you off. Friendly ones trade, have a tavern (+1 Exploration or Combat per visit), and need help.', sub:'village'},
    4:{t:'Tribesperson', g:'person', m:{R:'Unfriendly',B:'Friendly'}, d:'Another soul out on the ice. Surviving, or lost? Can you trust them?'},
    5:{t:'Blizzard', g:'snow', m:{R:'Extreme',B:'Survivable'}, d:'Visibility gone, progress slow. Extreme: take cover at a Rook husk, village or Calling location drawn this phase — or take 1 Wound.'},
    6:{t:'Mountain against the wall', g:'mountain', m:{R:'3-day climb',B:'1-day climb'}, d:'Climb it to reach the Rafters of this Room. Each day is one Exploration phase.'},
    7:{t:'Door out of the Tundroom', g:'door', m:{R:'Rook husk in the doorway',B:'Clear'}, d:'Mark it on your map and return within one phase when ready to leave. A husk in the doorway can be treated as the Ace prompt.'},
    8:{t:'Wild animal', g:'paw', m:{R:'Leaping Mammoth',B:'Ice Boar'}, d:'Food, if you can take it. The mammoth leaps and slams; the boar skates on the ice.'},
    9:{t:'Calling', g:'star', m:{R:'A place',B:'A person'}, d:'Something or someone key to your Calling, out here on the ice.'},
    10:{t:'Village on a black rock', g:'huts', m:{R:'Unfriendly',B:'Friendly — draw a Village Event'}, d:'As the 3: a settlement perched on an island in the Ice Sea.', sub:'village'},
    11:{t:'Medium Rook', g:'rook', d:'Fight it (Combat score 3) or avoid it.', fight:'medium'},
    12:{t:'Ice Rook', g:'rook', d:'Massive, Ice magic, Combat score 5 — on its home ground.', fight:'icerook'},
    13:{t:'Enemy Rooknaught', g:'rook', d:'A Rook husk crewed by five Naught. Fight it on foot (Combat score 6, then its crew at 5) or Rooknaught to Rooknaught.', fight:'rooknaught'}
  }
};
TABLES.village = { name:'Tundroom village events', short:'Village events', book:'Roomlands', kind:'sub',
  intro:'Solve the trouble to earn the village’s trust: 2 villagers join your crew. Redraw any event you have already solved.',
  ranges:[[1,2,{t:'Starving', d:'Food is almost gone and nobody is strong enough to hunt. A kill you already carry solves it at once; otherwise hunt a wild animal.'}],
          [3,4,{t:'Raided by warriors', d:'A nearby village of hardened fighters keeps attacking. No army can be raised — but the attackers are deeply superstitious.'}],
          [5,6,{t:'Ancient Ice Rook', d:'A massive Ice Rook stalks the surrounding lands. If you help, you meet it in the first phase after leaving the village.', fight:'icerook'}],
          [7,8,{t:'Missing Rooklings', d:'Beloved Rooklings vanish in the night, more every day. Someone in the village is behind it. Who, and why?'}],
          [9,10,{t:'Defences in ruins', d:'A chieftain will attack at dawn. One day and one night to rebuild the barricades and hold the line.'}],
          [11,13,{t:'The sparkling pillar', d:'The village is carved into a supporting pillar. A glittering stone recently mined in its depths is turning those who touch it to stone. Carvings on the pillar — or local Rooklings — may hold answers.'}]]
};
TABLES.crew = { name:'Tundroom crew characters', short:'Crew', book:'Roomlands', kind:'sub',
  intro:'Draw two after solving a Village Event to meet your new crew.',
  all:{1:{t:'Scared, lacking confidence, keen to prove themselves'},2:{t:'Arrogant and overconfident, but tough and reliable'},3:{t:'Daft joker, a little cowardly, a good friend'},4:{t:'Tough and stoic — won’t mention a wound until after the battle'},5:{t:'Cute and small, great company, useless in a fight'},6:{t:'Big, burly and battle-scarred'},7:{t:'Intelligent and strategic, not tough but extremely clever'},8:{t:'Agile, swift and powerful — an experienced fighter'},9:{t:'Shrewd, quiet and brooding — a great thief or spy'},10:{t:'Elegant and sophisticated, and handy with a sword'},11:{t:'Wise, old and experienced'},12:{t:'High-born and wealthy, keen to leave it all behind'},13:{t:'Another Rook hunter, as experienced as you'}}
};

TABLES.rafters = {
  name:'The Rafters (jungle beams)', short:'Rafters', book:'Roomlands',
  intro:'Reach the Rafters by Gargoyle, from a hole in the Battlements, or from the top of a staircase. Prehistoric jungle; no Rooks, but Gargoyles you cannot really fight. Only the first Gargoyle drawn in a phase counts. Collect 3 Clues, then return to a Gargoyle’s nest to unlock the Mysteries of the Gargoyles (Roomlands book, p.91).',
  red:{
    1:{t:'Cultist', g:'hood', m:{H:'They disappear into the jungle',D:'They attack you'}, d:'Clue. The same robes you saw below — but what are they doing up here? Tight-lipped if you talk. Standard person combat if you fight.', clue:true, fight:'person'},
    2:{t:'Insect game', g:'paw', m:{H:'Dog-sized ant',D:'Horse-sized beetle'}, d:'The animals up here are insectoid and huge, with sweet, juicy “meat”.'},
    3:{t:'Calling — a person', g:'star', m:{H:'Alive and exploring',D:'Dying from a fatal wound'}, d:'Someone key to your Calling — another adventurer trapped on the Rafters, perhaps.'},
    4:{t:'Adventurer’s body', g:'skull', m:{H:'Draw for an Item',D:'Gain 1 Treasure'}, d:'Clue. Carried here by Gargoyles — the torn shoulders tell you that — then killed by something. A small stone in their hand bears the cultists’ symbol.', clue:true, sub:'items'},
    5:{t:'Carnivorous plant', g:'tree', m:{H:'You notice it',D:'You are trapped in its jaws!'}, d:'Huge fleshy green jaws close around you and begin to digest. Like a trap — think your way out.'},
    6:{t:'Gnarled Gargoyle', g:'wings', m:{H:'You notice it',D:'It catches you by surprise!'}, d:'Classic winged beast with a castellated head. If it grabs you it lifts you high and drops you: draw a card — red: 1 Wound; black: the trees break your fall.', garg:'gnarled'},
    7:{t:'Swift Gargoyle', g:'wings', m:{H:'You notice it',D:'It catches you by surprise!'}, d:'Sleek and dragon-like. If it grabs you it flies you to the neighbouring Rafter — any way down or nest you found must be found again.', garg:'swift'},
    8:{t:'Warm rain', g:'waves', m:{H:'Lasts a full night',D:'Passes after an hour'}, d:'The heavens open. Everything glistens. A good time to make camp.'},
    9:{t:'Cultist saddling a Gargoyle', g:'hood', m:{H:'They don’t notice you',D:'They notice you'}, d:'Clue. In a clearing, a cultist fits a saddle to a Swift Gargoyle. If noticed, they fly off. If not, you may fight the cultist (the Gargoyle flees); win and draw an Item.', clue:true, fight:'person', sub:'items'},
    10:{t:'Gargoyle’s nest', g:'cave', d:'A great cave in the thin vertical mountains. You cannot enter until you hold 3 Clues. With 3 Clues, return here and read the Mysteries of the Gargoyles (Roomlands p.91).', nest:true}
  },
  black:{
    1:{t:'Treasure satchel', g:'chest', m:{S:'Untouched',C:'Evidence of attempted raids'}, d:'Clue. A satchel hangs from a branch, dropped from a height. Inside, a Treasure.', clue:true, gain:'treasure'},
    2:{t:'Wooden shack', g:'huts', m:{S:'Abandoned',C:'A cultist is inside!'}, d:'Clue. Built by human hands. If a cultist is inside, beat them to enter. Within: papers and diagrams of Gargoyles and their nests.', clue:true, fight:'person'},
    3:{t:'Hulk Gargoyle', g:'wings', m:{S:'You notice it',C:'It catches you by surprise'}, d:'Much larger, gliding rather than flying. If surprised you take 1 unavoidable Wound, then a piece breaks off it and it flees: draw a card — red: 1 Treasure; black: a part for your Arm, Helm, Mount or Rookling, +1 Combat.', garg:'hulk'},
    4:{t:'Gnarled Gargoyle', g:'wings', m:{S:'You notice it',C:'It catches you by surprise'}, d:'If it grabs you it lifts and drops you: draw a card — red: 1 Wound; black: the trees save you.', garg:'gnarled'},
    5:{t:'Foot of a nest mountain', g:'mountain', m:{S:'Seems safe to camp',C:'Noises nearby — not safe'}, d:'Clue. Strange words carved into the rock and a pile of rounded stones all bearing one symbol. You have seen it before.', clue:true},
    6:{t:'Hole in the ceiling', g:'door', m:{S:'A vine hangs down',C:'No way up'}, d:'Clouds of a Room above, fenced for safety by its people. Climb the vine to enter another Room (Roomlands table).'},
    7:{t:'Swift Gargoyle', g:'wings', m:{S:'You notice it',C:'It catches you by surprise'}, d:'If it grabs you it carries you to the next Rafter over.', garg:'swift'},
    8:{t:'Skylight', g:'door', m:{S:'Glass intact — must be broken',C:'Glass broken — can be traversed'}, d:'A window in the ceiling leading to the Battlements.'},
    9:{t:'Calling — a place', g:'star', m:{S:'Something you were looking for',C:'A clue to the next step'}, d:'A place key to your Calling.'},
    10:{t:'A way down', g:'stairs', m:{S:'Looks safe',C:'Looks like it might collapse!'}, d:'A vine or splintered beam leading down. Mark it to return to. When you leave, choose whether it connects to a Staircase or the Roomlands floor.'}
  },
  face:{
    11:{t:'Item', g:'flask', d:'Draw from the Item table.', sub:'items'},
    12:{t:'Draw 1 additional card', g:'star', d:'Draw one more card for this phase.', extra:1},
    13:{t:'Draw 1 additional card', g:'star', d:'Draw one more card for this phase.', extra:1}
  }
};

TABLES.crackways = {
  name:'The Crackways (through the walls)', short:'Crackways', book:'Roomlands',
  intro:'Replace any Cave, Staircase or Door prompt with a Crackway. First draw a marker card: black — the Crackway is signed safe (ignore all Bandit modifiers); red — unmarked, Bandits apply. Crossing takes at least 2 phases. A Crackway you have crossed becomes a 1-phase fast-travel route.',
  all:{
    1:{t:'Treasure', g:'chest', m:{B:'Abandoned by an adventurer',R:'Broken crystal from the walls'}, d:'Something of value left in the halls — perhaps an artefact, perhaps on a body.', gain:'treasure'},
    2:{t:'Great hall', g:'ruins', m:{B:'Empty and echoing',R:'Bandit camp'}, d:'A vast carved chamber of ornate pillars vanishing into blackness in every direction.'},
    3:{t:'Chasm', g:'cave', m:{B:'A thin bridge spans the gap',R:'The bridge has collapsed'}, d:'Find a way across or add one Exploration phase to your crossing.'},
    4:{t:'Perilous staircase', g:'stairs', m:{B:'Intact',R:'Ruined'}, d:'No handrails, just steps cut from stone. Take care… right?'},
    5:{t:'Maze', g:'gear', m:{B:'Alone in the maze',R:'You’re being followed by Bandits!'}, d:'Thin rune-carved corridors. Draw 5 cards: 3 of the same colour means you make it through; otherwise you are lost — add one phase to your crossing.', maze:true},
    6:{t:'Another adventurer', g:'person', m:{B:'Lost in the Crackway',R:'Held prisoner by Bandits'}, d:'Travelling through like you. Who are they, and where are they going?'},
    7:{t:'Monolith', g:'tower', m:{B:'Intact',R:'Ruined'}, d:'A huge tablet of ancient runes. An academic in a city might pay for this — or can you read it?'},
    8:{t:'Trapped Rook', g:'rook', m:{B:'Medium sized',R:'Massive sized'}, d:'An agitated Rook wedged in a cavern too small for it. Fight it with the normal rules if you dare.', fight:'rookbysize'},
    9:{t:'Calling', g:'star', m:{B:'A person',R:'A location'}, d:'Something or someone key to your Calling.'},
    10:{t:'Lost weapon', g:'sword', m:{B:'Abandoned by an adventurer',R:'Held by Bandits'}, d:'A powerful weapon in an ancient armoury — or in the hands of Bandits who have no right to it.'},
    11:{t:'Jack — guarded Crackway', g:'person', d:'Guards patrol the whole route; if you meet Bandits they may help.'},
    12:{t:'Queen — raw caverns', g:'cave', d:'Mostly natural caves with a little carving to aid the way.'},
    13:{t:'King — a lost city', g:'city', d:'This Crackway was once a city; halls and corridors snake off the main route.'}
  }
};

/* ---------- Parapette quarters ---------- */
TABLES.market = { name:'Parapette — The Market District ♦', short:'Market', book:'Roomlands', kind:'quarter',
  intro:'Anything can be bought or sold here. Draw Exploration-score cards of any suit.',
  all:{1:{t:'Delivery job', d:'A vendor asks you to deliver something. Complete it for one Treasure. Draw a card — its suit names the quarter to deliver to; run an Exploration phase there.'},2:{t:'Something catches your eye', d:'On a stall, or discarded by the road.'},3:{t:'Hidden alleyway', d:'Dark, off the beaten path, unnoticed by everyone else.'},4:{t:'Stray Rookling', d:'Ownerless, it follows you. Use the Rookling Crèche table to define it.'},5:{t:'A theft', d:'Someone steals from a stall right in front of you.'},6:{t:'Poster', d:'A missing — or wanted — person.'},7:{t:'Calling item', d:'An item for sale connected to your Calling.'},8:{t:'A familiar face', d:'Someone you have met before, or knew long ago.'},9:{t:'Healing food', d:'A vendor sells food that heals 1 point of Exploration or Combat for one Treasure, once per visit.'},10:{t:'Undervalued item', d:'The vendor clearly doesn’t know what they have.'},11:{t:'Pushy vendor', d:'Loud, obnoxious, and determined to sell you something.'},12:{t:'Unique clothing', d:'Change your character’s whole look here, if you wish. No rules effect.'},13:{t:'Treasure on the ground', d:'Ask around for its owner — or keep it.', gain:'treasure'}}
};
TABLES.crescents = { name:'Parapette — The Crescents ♠', short:'Crescents', book:'Roomlands', kind:'quarter',
  intro:'Where the wealthy “elite” live, between two canals. Clean, quiet, tree-lined — and snobbish.',
  all:{1:{t:'Rookstone jewellery', d:'In a jeweller’s window: a piece centred on an Electric, Ice or Rumble stone.'},2:{t:'Snubbed', d:'A well-dressed resident spits and tells you to get back to the Lanes.'},3:{t:'A lush park', d:'Residents walk their Rooklings and chat on benches. Peaceful, nothing like the Roomlands.'},4:{t:'Fancy hotel', d:'A painted Rook husk turned stately hotel. Stay for 2 Treasures to heal 1 point of Exploration or Combat, once per visit.'},5:{t:'Fine dining', d:'Cultured food, finer customers. A change from whatever you can catch.'},6:{t:'A procession', d:'A gilded stagecoach drawn by Rooklings carries someone important.'},7:{t:'Drunk noble', d:'Asks you to help them home — somewhere in the Crescents. Good luck finding it.'},8:{t:'Beggar abused', d:'Residents harass a busker on a tree-lined corner.'},9:{t:'A commission', d:'A kindly, wealthy elder hires you for a job linked to your Calling — a lead on a person or place.'},10:{t:'Missing shipment', d:'A business owner’s goods never arrived. Draw a card — its suit names the quarter to investigate; run an Exploration phase there.'},11:{t:'Mugging', d:'Two Lanes residents assault a wealthy man, claiming he can spare a few treasures.'},12:{t:'Arrested', d:'Crescent guards detain you overnight without much reason.'},13:{t:'Bodyguard wanted', d:'A notice seeks a bodyguard for an expedition. Create a quest with the Hunter’s Guild generator and take them along.'}}
};
TABLES.guildtown = { name:'Parapette — Guildtown ♥', short:'Guildtown', book:'Roomlands', kind:'quarter',
  intro:'Guilds, academies and the great Hunter’s Guild hall. Learning, noise and ambition.',
  all:{1:{t:'The Lapidarist', d:'Take a Parapette Guild quest; they add “bring back a Rookstone I need”. Complete it for a Rookstone of your choice.'},2:{t:'The Rooksmith', d:'Take a Parapette Guild quest; they add “bring back a Rook part I need”. Complete it for a mount of your own design.'},3:{t:'Guild of Archaeologists', d:'Auditoriums and libraries chasing the Colostle’s origins. They always need an adventurer’s help.'},4:{t:'The Museum', d:'Exhibits on Rooks, famous Rooklings, Parapette itself, and scarce artefacts from distant Roomland cultures.'},5:{t:'The Academy', d:'Fused Rook husks full of laboratories. Ask anyone anything, or wander the halls.'},6:{t:'The Archives', d:'Research your Calling among the books and scrolls.'},7:{t:'Eccentric inventor', d:'Field-test their invention. Draw a card — red: a strange new kind of Arm; black: a Mount for new terrain. Report back after your next expedition.'},8:{t:'Dropped Rookstone', d:'It rolls to your feet. Shouting behind you…'},9:{t:'Accused!', d:'An academic cries thief and the guards turn to look at you.'},10:{t:'Armchair experts', d:'Academics discuss Rook combat — and get it badly wrong.'},11:{t:'Pamphlet', d:'An invitation to a secret radical meeting.'},12:{t:'Rowdy students', d:'Drinking in a courtyard, arguing Rookstone lore.'},13:{t:'The wild-haired academic', d:'Publicly announcing a theory everyone mocks — but you know something about it.'}}
};
TABLES.lanes = { name:'Parapette — The Lanes ♣', short:'Lanes', book:'Roomlands', kind:'quarter',
  intro:'Cramped, crooked, crowded — and full of things you can find nowhere else. Mind your manners.',
  all:{1:{t:'Hooded informant', d:'A figure in a shadowy corner has information about your Calling.'},2:{t:'Pickpocket', d:'A thief strikes in front of you; the victim never notices.'},3:{t:'Street fight', d:'Two gangs with improvised weapons, Arms and Rooklings.'},4:{t:'Something’s missing', d:'Something of yours has been taken.'},5:{t:'Contraband shop', d:'Arms, Rooklings, helms and mount parts bristling with blades. For one Treasure, buy one and add +1 Combat.', gain:'combat-buy'},6:{t:'Gloomy bar', d:'A tiny alley bar; at the back, a cordoned-off gang boss runs their operation.'},7:{t:'Smugglers', d:'They see you too. Draw a card — red: they are not happy; black: open to negotiation.'},8:{t:'Someone recognises you', d:'And runs.'},9:{t:'The slums', d:'Lean-to housing and begging — bleak, dirty, but a real community.'},10:{t:'The docks', d:'Barges, barrels and burly stares across the murky canal.'},11:{t:'Summoned', d:'Someone demands you follow them to their leader. They don’t look friendly.'},12:{t:'The warehouse', d:'People work on a massive Rook husk. Its hand twitches with life…'},13:{t:'Overheard', d:'Covert talk that touches your Calling, a current mission, or the state of the Colostle itself.'}}
};
TABLES.rooksrest = { name:'Parapette — Rook’s Rest tavern', short:'Rook’s Rest', book:'Roomlands', kind:'sub',
  intro:'A labyrinthine tavern through the underbelly of the city. Draw one card to spice up a visit.',
  all:{1:{t:'Mystery drinks', d:'A tray arrives that you didn’t order.'},2:{t:'A drunk picks a fight', d:'Burly, scarred and inebriated.'},3:{t:'An old friend', d:'Someone you haven’t seen in years, here of all places.'},4:{t:'A whisper about your Calling', d:'A mysterious stranger, or a note.'},5:{t:'A brawl breaks out', d:'Tables splinter; the barman vanishes through a back door.'},6:{t:'Dice game', d:'A gambling circle in the corner.'},7:{t:'Last orders', d:'Later than you thought. Go deeper for an open bar, or find a room.'},8:{t:'A strange leaf', d:'Chew it: draw a card — red: immediately inebriated; black: heal 1 point of either score.'},9:{t:'Something precious on the floor', d:'Jewellery, a ring…'},10:{t:'A beaten Rookling', d:'Damaged, friendly, and wanting to stay with you.'},11:{t:'A liar at the bar', d:'Tall tales you know for a fact are false.'},12:{t:'A lone cultist', d:'Gloomy in a corner, nursing a drink.'},13:{t:'You are drunk', d:'One, or a few — definitely drunk.'}}
};

/* ---------- City ---------- */
const CITY_FIXED = [{r:13,t:'Hunter’s Guild', d:'Take Rook-hunting quests for treasure.'},{r:12,t:'Tavern', d:'Trade any item for a night’s stay: +1 Exploration or Combat, once per visit (spend a phase outside the city before using it again). Ask a stranger for a quest once per visit.'},{r:11,t:'Merchant', d:'Special items for sale (see list).'},{r:10,t:'Housing District', d:'Where the people live — contacts, rumours, old friends.'}];
const CITY_DRAW = {1:{t:'Palace Grounds', d:'A ruler lives here. You won’t simply be let in — unless your story, or a Treasure as offering, opens the door.'},
  2:{t:'Lapidarist', d:'1 Treasure: add a magic type (Ice, Rumble or Electric) to your Helm. 2 Treasures: add a magic type to an Arm, Rookling or Mount. 3 Treasures: a one-of-a-kind Rookstone with a power you invent.'},
  3:{t:'Rooksmith', d:'3 Treasures: a custom mount, land or sea, with a Weapon attack of your choice.'},
  4:{t:'Cartographer', d:'Pays 2 Treasures for a map of a new area: take a Guild quest, map your phases on it, bring it back.'},
  5:{t:'Weapon Smith', d:'1 Treasure: upgrade your weapon, +1 Combat. 2 Treasures: a whole new weapon, +1 Combat.'},
  6:{t:'Arms Dealer', d:'2 Treasures: a whole new Rook arm of your design, attunement ritual included.'},
  7:{t:'Rookling Crèche', d:'Trade a Rookling, or pay 2 Treasures, for a random Rookling (draw on the Crèche table).'},
  8:{t:'Gourmet District', d:'Pays 1 Treasure for a wild beast you have caught. 1 Treasure: a great meal, +1 Exploration.'},
  9:{t:'House for Sale', d:'20 Treasures. Healing: once per stay, a week in the city restores both scores to their starting values. Fast travel: the caravan brings you home from any Guild quest in a day.'},
  10:{t:'Housing District', d:'A second housing district — more homes, more rumours, healthy competition between neighbourhoods (or redraw if you prefer one).'}};
const CRECHE = {1:'A spidery one with 6 legs',2:'A ball-shaped one that rolls',3:'A telescopic one that extends and retracts',4:'One with a large glowing eye',5:'A speedy wheeled one',6:'A friendly and loving one',7:'One with powerful spring-like legs',8:'Walks on four legs like a dog',9:'One that splits into 3 parts',10:'A mean one bristling with blades',11:'One that floats in the air beside you',12:'One with a mysterious door in its front',13:'One that emits garbled speech from time to time'};
const MERCHANT = [
  {t:'Mysterious Potion', p:'2 Treasures', d:'Removes one Wound after battle. Single use.'},
  {t:'Rook Gauntlets', p:'Any 1 item', d:'Stone Rook hands over your own — punch with a Rook’s power.'},
  {t:'Extending Pole', p:'Any 3 items', d:'Telescopic Rook-part pole: vault upward, strike from range.'},
  {t:'Electric Sword', p:'1 Treasure', d:'A Rook greatsword imbued with Electric magic.'},
  {t:'Glider', p:'3 Treasures', d:'An unfolding glider on your back — glide from heights.'},
  {t:'Weatherstone', p:'Any 5 items', d:'Draw once on the Weather table: that is the weather it always summons. Once per Exploration phase.'},
  {t:'Tripwire Launcher', p:'4 items', d:'Fires two chained pins — aimed well, it trips a Rook.'},
  {t:'Turtle Shell Armour', p:'5 Treasures', d:'Blocks one Wound each Combat phase.'}
];
const QUEST = {
  core:{
    location:[[1,2,'A deep dark forest'],[3,3,'An island in the middle of a lake'],[4,5,'High in rocky mountains'],[6,6,'A Rook graveyard'],[7,8,'Deep in a strange cave'],[9,9,'Misty, gloomy swamplands'],[10,11,'A doorway to another Room'],[12,12,'Abandoned ruins of an ancient people'],[13,13,'A huge staircase leading up into the clouds']],
    distance:{S:2,C:3,H:4,D:5},
    twist:{1:'The Rook picks on travellers, attacks their mounts — and eats them.',2:'The Rook is somehow flying, circling a tower and dropping boulders on anyone who comes close.',3:'Inside a huge ancient husk, a medium Rook sends hordes of Rooklings out to steal.',4:'A massive spider-like Rook is terrorising local towns.',5:'A wheeled Rook churns up a village’s farmland.',6:'A Rook has nested in a village and forced everyone out.',7:'A Rook planted in a river has blocked the water.',8:'An underground Rook causes earthquakes with Rumble magic.',9:'Atop a volcano a massive Rook awakens and may trigger an eruption.',10:'A mischievous spectral Rookling haunts a town.',11:'A town built on a dormant Rook — which has woken and begun to move.',12:'A voice is heard from within a massive dormant Rook.',13:'A whole village dreams of the same Rook, though none has seen it… yet.'},
    reward:{S:2,C:2,H:3,D:2}
  },
  parapette:{
    location:[[1,2,'Inside a massive tree — a huge wooden hall'],[3,3,'On the flanks of a volcano'],[4,5,'Up on the Rafters'],[6,6,'An abandoned city'],[7,8,'Deep underwater in a clear lake'],[9,9,'A small Room, completely pitch black'],[10,11,'The edge of a hole leading down to another Room'],[12,12,'The top of a flat-topped mountain'],[13,13,'A huge, flat, sandy beach']],
    distance:{S:1,C:2,H:3,D:3},
    twist:{1:'A massive four-legged Rook with a mouth of stone teeth gobbles up Rooklings into a room in its belly.',2:'A massive Rook has lifted a town onto its back and walks in a straight line.',3:'A massive Rook that splits into two smaller Rooks whenever it takes a finishing blow — and they do too.',4:'A medium Rook holed up in a town, pretending to be a building.',5:'A medium Rook relentlessly chases a band of mounted nomads.',6:'A massive Rook has drunk a town’s lake dry and sits waiting in the empty bed.',7:'A medium Rook appears only at night and steals people away.',8:'A massive Ice Rook has turned part of a Room to ice wastes.',9:'A massive Electric Rook holds a permanent storm over a huge area.',10:'A massive Rumble Rook head-butts the bottom step of a staircase, endangering those who live on it.',11:'Rumours of a Rook with none of the three known powers.',12:'Two medium Rooks joined by a bridge, terrorising an area because they can’t agree on a direction.',13:'The “King Rook” — the largest ever seen, perhaps 30 rooms inside, lights glowing within as though people live there.'},
    reward:{S:2,C:3,H:4,D:3}
  }
};

/* ---------- Biomes & oracles ---------- */
const BIOMES = [
  ['A–7♠','Desert','Barren and arid; the Brazier burns hotter by day, nights freeze. Finding water is the challenge — though some Rooks are rumoured to carry reservoirs.'],
  ['8–K♠','Swamp','Knee-deep water and mud, thick mist, bones of the unlucky. Hazards everywhere; a Rook can sneak up on you.'],
  ['A–7♣','Forest','Food, shelter, life. Rooks rarely enter dense trees. Watch for other people — bandits, or friendly settlements.'],
  ['8–K♣','Mountains','Hard, tiring roads. Rooks abound, some adapted to the terrain.'],
  ['A–7♥','Icy tundra','Whole cultures survive here in their own way. Use the Tundroom rules.'],
  ['8–K♥','Jungle','Humid, dark, full of ruins and wildlife. Rooks cannot navigate it — ignore Rook combat, but giant creatures can use Rook combat rules.'],
  ['A–7♦','Plains','Open farmland — the best chance for human life, and the most exposed to Rooks. You may find a village every phase here, but may have to defend it.'],
  ['8–K♦','Rocklands','Hot and dry with rivers. Aggressive Rooks hide behind rock formations. Locals say avoid it.']
];
const ORACLE_RES = {
  red:{lo:'No — and it’s worse than expected', mid:'No', hi:'No — but there is an upside'},
  black:{lo:'Yes — with a complication', mid:'Yes', hi:'Yes — with a bonus'}
};
const NPC = {
  name:['Nelia','Thorug','Berek','Fen-Reley','Soriq','Alis','Dreya','Yeleris','Perelli','Quen','Taura','Reneen','Mirriq'],
  look:['Beautiful','Rugged','Scarred','Old','Muscle-bound','Delicate','Wild and feral','Posh and fancy','Cute and small','Big','Wiry and thin','Injured','A child'],
  trait:['A joker, always quipping','Suspicious','Weary','Timid, quiet','Dominating, intimidating','Fiery, passionate','Arrogant and over-confident','Tough and reliable','Stoic','Intelligent and strategic','Shrewd, quiet and brooding','Wise and experienced','Desperate for adventure']
};
const STORY = {
  incite:['Protect…','Assist…','Destroy…','Investigate…','Escort…','Rescue someone from…','Find or locate…','Escape from…','Smuggle…','Deceive…','Defeat…','Stop…','Capture…'],
  subject:['A Rookling or Rooklings','An archaeological dig at ancient ruins','A Rook fighting arena','A massive Rook husk','Someone experimenting with Rookstones','A powerful artefact','A castle hold manned by soldiers','Shady dealings','A meeting of cultists','A strange and complicated machine','A locked door to another Room','A unique Rookstone','A royal formal event'],
  twist:['Betrayal','Love','A murder','Explosion!','Treasure','Key item found','Dark secret','Clue to an ancient mystery','A kidnapping','Someone reveals their true identity','A Rook appears — but something’s strange…','A chase!','An injury']
};
const ROOKHOME_MAINT = {S:{t:'Running well', d:'Nothing to worry about for now.'},C:{t:'A strange noise', d:'A wobble in a mechanism. Fix it now and ignore the next 3 maintenance draws.'},H:{t:'A fault', d:'Repair it externally before moving on. Run an Exploration phase to see what surrounds you while you work.'},D:{t:'Critically damaged', d:'Replacement parts needed: defeat any Rook and salvage from it before you can move again.'}};

/* ---------- Combat tables ---------- */
const INTENTION = {S:'Kill you',C:'Steal from you',H:'Flee from you',D:'Hide something from you'};
const MAGIC = {S:'None',C:'Electric',H:'Rumble',D:'Ice'};
const REWARD = {S:'Helm',C:'Arm',H:'Rookling',D:'Weapon'};
const ALT_REWARD = {S:{t:'Navigation Matrix', d:'Add a prompt of your choice from your current exploration table to an exploration phase of your choice. Single use.'},C:{t:'Lubrication Oil', d:'Add a chosen card from the discard pile to your hand. Single use, once per combat.'},H:{t:'Armour Plate', d:'The next Wound you would take destroys this instead and does not affect your scores. Only one equipped at a time.'},D:{t:'Clash Bang', d:'Install into one suit. The next time you Clash with that suit it explodes, destroying the gem and turning the Clash into a win.'}};
const NAUGHT_REWARD = {S:{t:'Great Ice Sword', d:'Blade of solid never-melting ice. Attacking an Ice Rook with it heals one Wound, once per battle.'},C:{t:'Great Ice Shield', d:'Absorbs all incoming Ice attacks — no damage from Ice magic.'},H:{t:'Icicle Rookstone', d:'Grants the power to grow and launch icicle missiles. Install in a Helm or Rookling.'},D:{t:'The Carapice', d:'Legendary light armour threaded with stone and fused to an Ice Rookstone: skate on ice anywhere, immune to Ice damage.'}};
const ATTACK_TYPE = {S:'Unarmed attack',C:'Weapon attack',H:'Magic attack',D:'Creative attack'};
const ATTACK_HINT = {S:'Body or fists.',C:'A weapon — or unarmed if none.',H:'Ice, Electric or Rumble — or unarmed if no magic.',D:'Something different: combine, improvise, kick sand.'};
const ASTRO_ATTACK = {S:'Laser attack',C:'Flying attack',H:'Grab attack',D:'Rocket attack'};
const ASTRO_HINT = {S:'A charged emitter flashes white heat in a straight line.',C:'It swoops out of reach, wheels, and lashes back in.',H:'A stone hand grabs you and the Rook hurtles skyward.',D:'A detached arm or turret rockets toward you.'};
const INTERNAL_ATTACK = {S:'Internal defences',C:'It reaches into itself',H:'Magic floods the rooms',D:'It thrashes'};
const INTERNAL_HINT = {S:'Traps, spikes, crushing walls.',C:'A stone hand gropes inward to throw you out.',H:'Its Rookstone’s magic spreads through the interior.',D:'It throws itself around to shake you loose and batter you against the walls.'};
const OPPONENTS = {
  person:{name:'Another person', score:1, create:'person'},
  medium:{name:'Medium Rook', score:3, create:'rook'},
  massive:{name:'Massive Rook', score:5, create:'rook'},
  feral:{name:'Feral Massive Rook', score:6, create:'rook'},
  icerook:{name:'Ice Rook', score:5, create:'rook', fixedMagic:'D', fixedSize:'massive'},
  astrolithic:{name:'Astrolithic Rook', score:6, create:'none'},
  rooknaught:{name:'Enemy Rooknaught (on foot)', score:6, create:'rook', crewAfter:5},
  crew:{name:'Rooknaught crew (5 Naught)', score:5, create:'none'},
  custom:{name:'Custom opponent', score:3, create:'rook'}
};

/* ---------- Glyphs (simple original line icons) ---------- */
const GLYPHS = {
  rook:'<path d="M18 56h26M22 56V24h18v32M20 24V14h5v5h4v-5h4v5h4v-5h5v10M28 56V42a3 3 0 0 1 6 0v14"/>',
  door:'<path d="M18 56V14a13 13 0 0 1 26 0v42M18 56h26M38 36h2"/>',
  stairs:'<path d="M10 56h12v-10h10v-10h10v-10h10V14M10 56h44"/>',
  ruins:'<path d="M12 56h40M16 56V30M16 30l-2-6h8l-2 6M30 56V20l-2-6h8l-2 6v18M48 56V36l-2-6h8M22 44h10M40 50h12"/>',
  gear:'<circle cx="32" cy="32" r="8"/><path d="M32 10v6M32 48v6M10 32h6M48 32h6M16.4 16.4l4.3 4.3M43.3 43.3l4.3 4.3M16.4 47.6l4.3-4.3M43.3 20.7l4.3-4.3"/><circle cx="32" cy="32" r="17"/>',
  trap:'<path d="M10 28h44L48 56H16zM18 28v-6l6 6M30 28v-8l4 8M44 28v-6l-6 6M26 56l6-10 6 10"/>',
  cave:'<path d="M8 56h48M12 56V36a20 20 0 0 1 40 0v20M22 56V42a10 10 0 0 1 20 0v14"/>',
  waves:'<path d="M8 28c6-6 10-6 16 0s10 6 16 0 10-6 16 0M8 40c6-6 10-6 16 0s10 6 16 0 10-6 16 0M8 52c6-6 10-6 16 0s10 6 16 0 10-6 16 0"/>',
  star:'<path d="M32 8v48M8 32h48M15 15l34 34M49 15L15 49"/><circle cx="32" cy="32" r="7"/>',
  city:'<path d="M8 56h48M12 56V30h10v26M26 56V18h12v38M42 56V26h10v30M16 36h2M16 44h2M30 26h4M30 34h4M30 42h4M46 34h2M46 44h2"/>',
  chest:'<path d="M12 28h40v26H12zM12 28a20 12 0 0 1 40 0M12 40h40M29 36h6v8h-6z"/>',
  flask:'<path d="M26 10h12M28 10v12L16 46a6 6 0 0 0 5 8h22a6 6 0 0 0 5-8L36 22V10M22 40h20"/>',
  hood:'<path d="M20 56V34a12 12 0 0 1 24 0v22M16 56h32M26 36c2 4 10 4 12 0M32 18v4"/>',
  paw:'<ellipse cx="32" cy="42" rx="11" ry="9"/><ellipse cx="18" cy="30" rx="4.5" ry="6"/><ellipse cx="27" cy="22" rx="4.5" ry="6"/><ellipse cx="37" cy="22" rx="4.5" ry="6"/><ellipse cx="46" cy="30" rx="4.5" ry="6"/>',
  person:'<circle cx="32" cy="16" r="7"/><path d="M18 56v-14a14 14 0 0 1 28 0v14M32 42v14"/>',
  skull:'<path d="M18 36a14 14 0 1 1 28 0v8h-6v8H24v-8h-6z"/><circle cx="26" cy="32" r="3"/><circle cx="38" cy="32" r="3"/><path d="M30 44h4"/>',
  wings:'<path d="M32 36c-6-14-16-18-26-16 4 8 10 10 14 10-4 6-2 12 2 14 6-2 8-6 10-8 2 2 4 6 10 8 4-2 6-8 2-14 4 0 10-2 14-10-10-2-20 2-26 16z"/>',
  huts:'<path d="M8 56h48M12 56V38l10-12 10 12v18M34 56V40l9-10 9 10v16M18 56v-8h8v8M39 56v-7h8v7"/>',
  bone:'<path d="M22 24a5 5 0 1 1 6-6l8 8a5 5 0 1 1 6 6 5 5 0 1 1-6 6l-8-8a5 5 0 1 1-6-6z" transform="translate(0,4)"/><path d="M40 14l6-6M44 10l-2-2M52 20l-2-2"/>',
  tent:'<path d="M8 56h48M12 56L32 14l20 42M24 56l8-18 8 18M32 14v-6"/>',
  tower:'<path d="M20 56V20h24v36M20 20v-8h5v4h5v-4h4v4h5v-4h5v8M28 56V44a4 4 0 0 1 8 0v12M8 56h48"/>',
  wreck:'<path d="M10 44c6 6 10 6 16 0s10 6 16 0 10 6 16 0M16 40l6-20 20 6-6 14M30 20V8l10 6-10 6"/>',
  island:'<path d="M10 48c6 6 10 6 16 0s10 6 16 0 10 6 16 0M16 44a16 10 0 0 1 32 0M32 34V20M32 20c-6-2-8-6-6-10 4 2 6 6 6 10zM32 20c6-2 8-6 6-10-4 2-6 6-6 10z"/>',
  tree:'<path d="M32 56V40M32 40c-10 2-18-6-14-16 2-8 10-12 14-12s12 4 14 12c4 10-4 18-14 16z"/>',
  snow:'<path d="M32 10v44M13 21l38 22M13 43l38-22M32 10l-5 6M32 10l5 6M32 54l-5-6M32 54l5-6"/>',
  mountain:'<path d="M6 54L24 20l10 16 6-8 18 26zM24 20l4 8 4-4"/>',
  sword:'<path d="M32 8v34M24 44h16M28 44v6a4 4 0 0 0 8 0v-6M26 20l6-12 6 12"/>'
};
function glyph(name){ const p=GLYPHS[name]||GLYPHS.star; return `<svg viewBox="0 0 64 64" aria-hidden="true">${p}</svg>`; }

/* ---------- 2-player co-op (Roomlands pp.51–57) ---------- */
TABLES.complications = { name:'Co-op complications', short:'Complications', book:'Roomlands', kind:'sub',
  redLabel:'Red cards — personal complications', blackLabel:'Black cards — environmental complications',
  intro:'Two-player games. Draw at any point in an Exploration phase to complicate the day: red cards are personal, black cards environmental. Use the 2-player oracle whenever a prompt asks which of you is affected.',
  red:{
    1:{t:'Someone only one of you knows', d:'A figure appears — following you, or simply happened upon. One of you knows them; the other may be suspicious.'},
    2:{t:'Disagreement', d:'Something you find this phase sets your characters against each other. Let their Natures decide how it plays out.'},
    3:{t:'Bonding', d:'Something this phase brings your characters closer — an obstacle overcome together, a helping hand.'},
    4:{t:'Ambush!', d:'Two bandits attack. Each player runs a separate Combat against one person opponent.', fight:'person'},
    5:{t:'Helping hand', d:'One of you helps the other this phase. Use the 2-player oracle to see who needs the help.'},
    6:{t:'Loss', d:'One of you loses something important — a weapon, an item. Plan how to recover it, then check the oracle to see if the plan works.'},
    7:{t:'Run!', d:'Something you cannot fight — a huge beast, a rolling Rook your weapons cannot damage. Run.'},
    8:{t:'A secret', d:'Events threaten to reveal a secret about one of you. Use the oracle to see whose.'},
    9:{t:'Damaged item', d:'Something important to one character is broken this phase. The oracle decides whose.'},
    10:{t:'Nemesis', d:'A clue to an enemy from your shared past. They have been this way.'},
    11:{t:'A wild Rookling', d:'It wanders up to you both.'},
    12:{t:'Poisoned!', d:'A strange feeling comes over you both. Work out how you were poisoned this phase, then how to cure it.'},
    13:{t:'Stronger opponent', d:'+1 to the Combat score of any opponent this phase.'}
  },
  black:{
    1:{t:'One of you is trapped', d:'Something this phase traps one of you — the oracle decides who.'},
    2:{t:'Fork in the road', d:'Two paths. Split this phase’s prompts across them and decide together which way to go.'},
    3:{t:'Obstacle', d:'Something blocks the path that no one could pass alone — a Rookfall in a canyon, a fallen tree.'},
    4:{t:'Shelter', d:'Heavy weather forces you both to take cover. Draw on the Weather table for what hits.', sub:'weather'},
    5:{t:'Challenging terrain', d:'Rough ground ahead slows your progress — a desert, a swamp…'},
    6:{t:'Blockage', d:'An impassable blockage. Find another route.'},
    7:{t:'Collapsing floor!', d:'You both fall through into a whole new area. You may completely redraw this phase’s cards.'},
    8:{t:'Breakdown', d:'A mount, arm, helm or Rookling stops working until it is repaired or re-parted. The oracle decides whose.'},
    9:{t:'Vantage point', d:'Something tall to climb — a husk, a tree. Oracle for the climb; from the top, draw two full phases at once and keep one (discard the other).'},
    10:{t:'Rigged', d:'Any item or treasure found this phase looks trapped, just as you reach for it.'},
    11:{t:'The Rook falls', d:'If you drew a Rook this phase it is Massive — and it collapses dead as it approaches. A door on its side falls open; apply some of this phase’s cards to its interior. No Rook drawn: ignore this card.'},
    12:{t:'You wake in a cell!', d:'This card comes first; the other prompts are what you can see inside and outside the cell. Get out.'},
    13:{t:'Sharp eyes', d:'The Leader draws one extra exploration card, to reveal whenever they like.', extra:1}
  }
};
const COOP_ORACLE = {red:'Bad outcome · negative · no · Player 1 (the Leader)', black:'Good outcome · positive · yes · Player 2'};

/* ---------- Search for the Seastone (Roomlands pp.61–85) — mechanics only; the story stays in the book ---------- */
const CROWN_ISLE = [
  {id:'camp', t:'1. Camp-fire', d:'Someone camped here not long ago: bags, clothing, a barrel. Search them.', draw:{S:'A hooded cloak, deep blue with a trim like waves',C:'A fire-starting kit — your own campfires from now on',H:'The diary of another adventurer, lost to legend (not Aanya’s)',D:'A Treasure, buried to await its owner’s return'}, items:{S:'Blue wave-trimmed cloak',C:'Fire-starting kit',H:'A lost adventurer’s diary'}, treasure:{D:1}},
  {id:'tower', t:'2. Central tower', d:'A small castellated tower at the island’s centre. Inside, a dark spiral staircase drops underground; water drips. Descend to enter the Undersea Labyrinth.', doors:true},
  {id:'cache', t:'3. Expedition cache', d:'Rotten crates from a large expedition, long ago. Search them.', draw:{S:'A propellor-like piece of Rook machinery — fit it to an Arm, Mount or Rookling',C:'Three small explosive bundles with strike-fuses',H:'A journal: a crew of ten came here for treasure and glory',D:'Food rations — keep them; they heal one Wound when eaten'}, items:{S:'Rook propellor part',C:'Explosive bundle (avoids one Bastion fight) ×3',H:'Journal of the ten-man expedition',D:'Food rations (heal 1 Wound)'}},
  {id:'husk', t:'4. Rook husk', d:'It looks asleep, or dormant. Investigating means drawing a card — and you must abide by it.', draw:{S:'Damaged and dead — and it carries a weapon you have never seen. Take the halberd.',C:'Dead, and pillaged by earlier adventurers. Nothing here.',H:'A Medium Rook stirs, but has not noticed you. Hide, or fight it.',D:'It wakes and comes straight at you — a Medium Rook, and no avoiding the fight.'}, fight:{H:'medium',D:'medium'}, items:{S:'Decorative halberd with a watery motif and blue tassel'}, rewardOnWin:'Decorative halberd with a watery motif and blue tassel'},
  {id:'trees', t:'5. Trees', d:'A little vegetation on an otherwise bare island. Look for food.', draw:{S:'Nothing',C:'A fruit — heal 1 point of Exploration or Combat',H:'Nothing',D:'Mushrooms — heal 1 point of Exploration or Combat'}, heal:{C:true,D:true}}
];
const HALL_DOORS = [
  {n:1, t:'Door 1', d:'Heavy and oppressive; no muscling through. Carved lines run from its frame to two stone levers — one at floor level, one high on a wall.', to:'torrents'},
  {n:2, t:'Door 2', d:'Person-sized but sturdy. Set above it, a gemstone slowly cycles amber, cloudy grey, diamond white…', to:'winds'},
  {n:3, t:'Door 3', d:'A frame filled with clay that has hardened — but with a few cracks.', to:'gears'}
];
const HALL_IDS = ['torrents','winds','gears'];
TABLES.torrents = { name:'Seastone — the Halls of Torrents', short:'Halls of Torrents', book:'Roomlands campaign', kind:'hall',
  intro:'Thin winding tunnels — sometimes you crawl, sometimes seawater floods through. Three Exploration phases here let you move on (or throw the switch for the grating). Jack, Queen, King: a Bastion.',
  all:{
    1:{t:'Bastion husk', g:'chest', d:'A Bastion shell broken into pieces. Make armour of it and you can avoid any battle with a Bastion.', item:'Bastion-shell armour (avoid any Bastion fight)'},
    2:{t:'Rush of water', g:'waves', d:'You hear it, then it hits. Grab hold or be washed backward.', check:[{on:'red', hit:'Washed away down random tunnels — a whole new area', miss:'You hold on'}]},
    3:{t:'Metal grating', g:'trap', d:'It blocks the way; there must be a switch somewhere. With the switch thrown, return here — passing the grating completes the Halls of Torrents.', exitWith:'switch'},
    4:{t:'Drowned adventurer', g:'skull', d:'Caught by the torrents. Rations and healing herbs in their bag — heal one Wound.', heal:true},
    5:{t:'The torrent engine', g:'gear', d:'Gearwheels, pumps, an ancient engine — it controls the torrents, and it has a keyhole. With the key, switch the torrents off and ignore every later Rush of water.', keyUse:true},
    6:{t:'Rush of water', g:'waves', d:'You hear it, then it hits. Grab hold or be washed backward.', check:[{on:'red', hit:'Washed away down random tunnels — a whole new area', miss:'You hold on'}]},
    7:{t:'Pool of fish', g:'island', d:'A small room with a permanent pool, ocean fish swimming in it.'},
    8:{t:'Silt dead end — a key', g:'flask', d:'A heap of silt and detritus. Something glints in it: a KEY.', item:'Key (the torrent engine)'},
    9:{t:'Rush of water', g:'waves', d:'You hear it, then it hits. Grab hold or be washed backward.', check:[{on:'red', hit:'Washed away down random tunnels — a whole new area', miss:'You hold on'}]},
    10:{t:'Rusted switch', g:'gear', d:'Old and stiff, but with some strength it might still work. Throw it and the grating lifts.', switchFound:true},
    11:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    12:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    13:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'}
  }
};
TABLES.winds = { name:'Seastone — the Hall of Winds', short:'Hall of Winds', book:'Roomlands campaign', kind:'hall',
  intro:'A cathedral of stone criss-crossed by thin bridges and stairways, raked by sudden winds. Three Exploration phases here let you move on. Jack, Queen, King: a Bastion.',
  all:{
    1:{t:'An explosive', g:'flask', d:'A small explosive device — the same as the Crown Isle bundles. Use one to distract a Bastion and avoid that fight. Single use.', item:'Explosive (avoids one Bastion fight)'},
    2:{t:'Broken walkway', g:'stairs', d:'It continues beyond the gap. Find a creative way across — or add an extra phase before you can clear the Hall. If you want fate to decide your plan: draw a card, black succeeds.', check:[{on:'black', hit:'Your plan works', miss:'It fails — add one Exploration phase'}]},
    3:{t:'Rush of wind', g:'wings', d:'A massive gust. Hold on or be blown off your feet.', check:[{on:'red', hit:'Thrown from the walkway!', miss:'You hold on'},{on:'C', hit:'1 Wound of fall damage as you crash onto a lower walkway', miss:'A soft landing', wound:true}]},
    4:{t:'Surrounded by Bastions', g:'rook', d:'They block every exit from this walkway. You cannot fight them all — get creative. If you leap from the walkway: draw a card, clubs means 1 Wound of fall damage.', check:[{on:'C', hit:'1 Wound of fall damage', miss:'You land safely', wound:true, label:'Leap from the walkway'}]},
    5:{t:'Rush of wind', g:'wings', d:'A massive gust. Hold on or be blown off your feet.', check:[{on:'red', hit:'Thrown from the walkway!', miss:'You hold on'},{on:'C', hit:'1 Wound of fall damage as you crash onto a lower walkway', miss:'A soft landing', wound:true}]},
    6:{t:'Crushed adventurer', g:'skull', d:'Crumpled against a low wall by a gust and a fall. Healing herbs in her clothes — heal one Wound.', heal:true},
    7:{t:'The great fan', g:'gear', d:'The source of the winds. Destroy it and ignore every later Rush of wind. If you want fate to decide your plan: draw a card, black succeeds.', check:[{on:'black', hit:'The fan is wrecked — no more rushes of wind', miss:'It keeps turning'}]},
    8:{t:'Rope bridge', g:'stairs', d:'The walkway has fallen away; a rope spans the gap, tied there by an earlier adventurer.'},
    9:{t:'Flying fish', g:'wings', d:'A bird flits over your head — no, a kind of flying fish.'},
    10:{t:'Rush of wind', g:'wings', d:'A massive gust. Hold on or be blown off your feet.', check:[{on:'red', hit:'Thrown from the walkway!', miss:'You hold on'},{on:'C', hit:'1 Wound of fall damage as you crash onto a lower walkway', miss:'A soft landing', wound:true}]},
    11:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    12:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    13:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'}
  }
};
TABLES.gears = { name:'Seastone — the Halls of Gears', short:'Halls of Gears', book:'Roomlands campaign', kind:'hall',
  intro:'Cubic rooms stacked into a three-dimensional maze, huge axles and gears turning through the walls. Three Exploration phases here let you move on (or fix the jam for the shifting door). Jack, Queen, King: a Bastion.',
  all:{
    1:{t:'The Gearblade', g:'sword', d:'A sword in remarkable condition, locked into a dais: cog-shaped guard, gilded gears on the grip. Take and equip it for +1 Combat.', item:'The Gearblade (+1 Combat)', gain:'combat-item'},
    2:{t:'Locked door', g:'door', d:'Gears and axles work the lock — but some of the gears are missing.'},
    3:{t:'Runaway gear', g:'gear', d:'A crash behind you: a massive stone gear, dislodged, free-wheels down the slope toward you!'},
    4:{t:'Sudden activation', g:'gear', d:'The whole room starts turning and swinging. Draw a card: a spade means 1 Wound from a machine part.', check:[{on:'S', hit:'1 Wound — hit by the machinery', miss:'You duck clear', wound:true}]},
    5:{t:'Bones in the gears', g:'skull', d:'An adventurer crushed between two gearwheels, jamming them. Is this stopping another part of the machine from working?', jam:true},
    6:{t:'Rotating platforms', g:'gear', d:'A huge room dropping into darkness, spanned by gearwheels spinning on their sides — platforms to leap across to the far door.'},
    7:{t:'Sudden activation', g:'gear', d:'The whole room starts turning and swinging. Draw a card: a spade means 1 Wound from a machine part.', check:[{on:'S', hit:'1 Wound — hit by the machinery', miss:'You duck clear', wound:true}]},
    8:{t:'Sudden activation', g:'gear', d:'The whole room starts turning and swinging. Draw a card: a spade means 1 Wound from a machine part.', check:[{on:'S', hit:'1 Wound — hit by the machinery', miss:'You duck clear', wound:true}]},
    9:{t:'The shifting door', g:'door', d:'Open a crack, shifting back and forth an inch or two — jammed somewhere else in the system. Clear a gear jam and it opens. Passing through completes the Halls of Gears.', exitWith:'jam'},
    10:{t:'Clunk!', g:'trap', d:'A button under your foot — blades swing at you! Draw a card: hearts means 1 Wound.', check:[{on:'H', hit:'1 Wound from the blades', miss:'You twist clear', wound:true}]},
    11:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    12:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'},
    13:{t:'Bastion encounter!', g:'rook', d:'Draw to see its type and whether it has noticed you.', fight:'bastion'}
  }
};
const BASTION_ATTACK = {
  sword:{S:'Sword throw',C:'Flurry of slashes',H:'Spinning blade wheel',D:'Heavy blow from above'},
  seastone:{S:'Focused jet shot',C:'Water wall',H:'Drench',D:'Float'}
};
const BASTION_HINT = {
  sword:{S:'It hurls its huge sea-rusted sword.',C:'A flurry of bludgeoning slashes.',H:'It spins the blade like a wheel.',D:'A crushing two-handed blow from above.'},
  seastone:{S:'A piercing jet of water from afar.',C:'A wall of water slams into you.',H:'A huge weight of water drops from above.',D:'Trapped in a bubble, lifted, and smashed into a wall.'}
};
const QUEEN_PHASES = [
  {score:3, title:'Phase 1 — her fury', intro:'She comes at you wild and flailing, like a possessed witch, snapping and contorting as she closes the distance in seconds.',
   atk:{S:'Tidal shockwave',C:'Drowning column',H:'Twin swords of the deep',D:'Whispers of the sea'},
   hint:{S:'A bubble of water around her bursts outward in a three-dimensional shockwave.',C:'A floor-to-ceiling column of water lifts you off the ground and starts to drown you. Hitting her breaks it.',H:'Two massive swords of pouring water. Cannot be blocked by an Unarmed (♠) counter — that costs a Wound regardless.',D:'Malicious seashell whispers fill your mind. Shake them off with a physical or magical lash-out.'},
   unblock:{atk:'H',ctr:'S'}, aanya:{S:'heal',C:'crit',H:'crit',D:'heal'},
   aanyaText:{S:'Fights supportively, hanging back with a strange potion for when you take a hit.',C:'A whirlwind of blows, constantly at your side.',H:'Vanishes completely, then strikes from on high when you need her most.',D:'Fights supportively, hanging back with a strange potion for when you take a hit.'}, objects:true},
  {score:4, title:'Phase 2 — the flood', intro:'Your hits crack her carapace. She screams; the walls split and water pours in until she can swim — and she stalks the deep parts like a shark.',
   atk:{S:'Rip-tide',C:'Razor leap',H:'Dagger rain',D:'Dispel'},
   hint:{S:'A stone hand at your ankle pulls you under.',C:'She bursts from the water and slashes as she hurtles past.',H:'A roomful of razor-sharp droplets falls straight down. Nowhere to take cover.',D:'The Seastone surges to block your magic. Cannot be blocked by a Magic (♥) counter — that costs a Wound regardless.'},
   unblock:{atk:'D',ctr:'H'}, aanya:{S:'none',C:'temp',H:'crit',D:'none'},
   aanyaText:{S:'Caught out in the water, she cannot find her footing and takes hits of her own.',C:'Throws you her weapon when you need it most — one extra option this phase.',H:'A whirlwind of blows, constantly at your side.',D:'Wounded and terrified, she stays out of the way. You fight alone.'}, objects:true},
  {score:3, title:'Phase 3 — underwater', intro:'Parts of her stone body fall away — but the room is nearly full. You fight this last phase mostly underwater, in her element: one fewer option this phase (unless your Combat is 1). The point returns afterwards.',
   atk:{S:'Grapple',C:'Hydrokinetic grasp',H:'Maelstrom',D:'Scream of the Kraken'},
   hint:{S:'She wrestles you, dragging you deeper.',C:'The currents tear the weapon from your hands. Cannot be blocked by a Weapon (♣) counter — that costs a Wound regardless.',H:'She circles at speed, spinning you in a vicious inward current.',D:'A screech that pummels body and eardrums. An attack on her might stop it.'},
   unblock:{atk:'C',ctr:'C'}, aanya:{S:'crit',C:'temp',H:'crit',D:'temp'},
   aanyaText:{S:'Vanishes into the depths, then strikes from above with immense force.',C:'Passes you her weapon when you need it most — one extra option this phase.',H:'A whirlwind of blows, constantly at your side.',D:'She follows your orders — one extra option this phase.'}, objects:false, penalty:true}
];
const QUEEN_OBJECTS = {
  S:{t:'Discarded worn shield', d:'An old wooden shield from an adventurer whose story ended here. Blocks one attack from the Queen, then it is destroyed.', kind:'shield'},
  C:{t:'Abandoned adventurer’s pack', d:'A vial of Stalwart. You drink it: heal one Combat point.', kind:'com'},
  H:{t:'Discarded worn shield', d:'An old wooden shield from an adventurer whose story ended here. Blocks one attack from the Queen, then it is destroyed.', kind:'shield'},
  D:{t:'Abandoned adventurer’s pack', d:'A vial of Stalwart. You drink it: heal one Exploration point.', kind:'exp'}
};
const AANYA_ABILITY = {heal:'Heal one Wound (once this phase)', crit:'Critical hit when your counter matches her suit', temp:'One extra option (once this phase)', none:'No ability this phase'};
OPPONENTS.bastion = {name:'Bastion', score:3, create:'bastion', module:'seastone'};
OPPONENTS.queen = {name:'The Drowned Queen', score:3, create:'queen', module:'seastone'};

/* ---------- Items with rules effects (matched by name in the inventory) ---------- */
const ITEM_FX = [
  {k:'plate',   re:/armour plate/i,            t:'Armour Plate',        d:'Destroyed instead of the next Wound you would take.'},
  {k:'turtle',  re:/turtle shell/i,            t:'Turtle Shell Armour', d:'Blocks one Wound each Combat phase.'},
  {k:'potion',  re:/mysterious potion/i,       t:'Mysterious Potion',   d:'Removes one Wound after battle. Single use.'},
  {k:'oil',     re:/lubrication oil/i,         t:'Lubrication Oil',     d:'Add a chosen card from the discard pile to your hand. Single use, once per fight.'},
  {k:'bang',    re:/clash bang/i,              t:'Clash Bang',          d:'Installed in a suit: the next Clash with that suit becomes a win, destroying the gem.'},
  {k:'matrix',  re:/navigation matrix/i,       t:'Navigation Matrix',   d:'Add a prompt of your choice from the current table to a phase. Single use.'},
  {k:'icesword',re:/great ice sword/i,         t:'Great Ice Sword',     d:'Attacking an Ice Rook with it heals one Wound, once per battle.'},
  {k:'iceshield',re:/great ice shield|carapice/i, t:'Ice immunity',     d:'No damage from Ice magic attacks.'},
  {k:'bastionarmour', re:/bastion-shell armour/i, t:'Bastion-shell armour', d:'Avoid any battle with a Bastion.'},
  {k:'explosive', re:/explosive/i,             t:'Explosive',           d:'Distracts one Bastion — avoid that fight. Single use.'},
  {k:'rations', re:/food rations/i,            t:'Food rations',        d:'Eat to heal one Wound. Single use.'},
  {k:'herbs',   re:/herbs|healing potion/i,    t:'Healing herbs / potion', d:'Heals one Wound. Single use.'}
];
function hasItem(a, k){ const fx=ITEM_FX.find(x=>x.k===k); return !!(fx && a.inventory.some(it=>fx.re.test(it))); }
function removeItem(a, k){ const fx=ITEM_FX.find(x=>x.k===k); if(!fx) return false; const i=a.inventory.findIndex(it=>fx.re.test(it)); if(i<0) return false;
  const m=a.inventory[i].match(/×(\d+)/); if(m && Number(m[1])>1){ a.inventory[i]=a.inventory[i].replace(/×\d+/, '×'+(Number(m[1])-1)); } else a.inventory.splice(i,1); return true; }
