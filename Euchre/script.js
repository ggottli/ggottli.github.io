/***************************************************
 * Euchre Full Example (Simplified)
 ***************************************************/
const suits = ["♠","♥","♦","♣"];
const values = ["9","10","J","Q","K","A"];

/** We’ll seat players as:
 * 0: Partner (top, team1)
 * 1: Opponent1 (left, team2)
 * 2: Opponent2 (right, team2)
 * 3: User (bottom, team1)
 */
let players = [
  { name: "Partner", hand: [], team: 1 },
  { name: "Opponent1", hand: [], team: 2 },
  { name: "Opponent2", hand: [], team: 2 },
  { name: "You", hand: [], team: 1 }
];

// HTML references
const partnerHandDiv = document.getElementById("partner-hand");
const opponent1HandDiv = document.getElementById("opponent1-hand");
const opponent2HandDiv = document.getElementById("opponent2-hand");
const userHandDiv    = document.getElementById("user-hand");

const partnerPlaySpot  = document.getElementById("partner-play-spot");
const opponent1PlaySpot= document.getElementById("opponent1-play-spot");
const opponent2PlaySpot= document.getElementById("opponent2-play-spot");
const userPlaySpot     = document.getElementById("user-play-spot");

const kittyCardDiv  = document.getElementById("kitty-card");

const messageArea   = document.getElementById("message-area");
const dealerIndicator = document.getElementById("dealer-indicator");
const trumpIndicator  = document.getElementById("trump-indicator");

const btnOrderUp    = document.getElementById("btn-order-up");
const btnPass       = document.getElementById("btn-pass");
const btnSelectTrump= document.getElementById("btn-select-trump");

const team1ScoreSpan= document.getElementById("team1-score");
const team2ScoreSpan= document.getElementById("team2-score");

// Game State
let deck = [];
let kittyCard = null;
let trumpSuit = null;
let dealerIndex = 0;
let makerIndex = null;  // who picked trump
let currentPhase = 0;   // 0=deal,1=phase1,2=phase2,3=play
let roundTrickCount = 0;
let leaderPos = 0;      // who leads the next trick
let currentTrick = [];
let team1Score = 0;
let team2Score = 0;
let trickWinsByTeam = {1:0, 2:0};

/***************************************************
 *  Deck & Deal
 ***************************************************/

function createDeck() {
  deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({value:v, suit:s});
    }
  }
}

function shuffleDeck() {
  for(let i=0; i<deck.length; i++){
    let swapIdx = Math.floor(Math.random()*deck.length);
    [deck[i],deck[swapIdx]]=[deck[swapIdx],deck[i]];
  }
}

function dealCards() {
  // Clear old
  players.forEach(p => p.hand = []);
  shuffleDeck();

  // 5 cards each
  for (let r=0; r<5; r++) {
    for (let i=1; i<=4; i++) {
      let playerPos = (dealerIndex + i) % 4;
      players[playerPos].hand.push(deck.pop());
    }
  }
  kittyCard = deck.pop(); // leftover for trump
}

/***************************************************
 *  Rendering
 ***************************************************/

function getSuitColor(s) {
  return (s === "♥" || s === "♦") ? "red" : "black";
}

function renderHands() {
  // Partner
  partnerHandDiv.innerHTML="";
  players[0].hand.forEach(()=> {
    let c = document.createElement("div");
    c.className="card deal-animation";
    c.textContent="🂠";
    partnerHandDiv.appendChild(c);
  });

  // Opp1
  opponent1HandDiv.innerHTML="";
  players[1].hand.forEach(()=> {
    let c=document.createElement("div");
    c.className="card deal-animation";
    c.textContent="🂠";
    opponent1HandDiv.appendChild(c);
  });

  // Opp2
  opponent2HandDiv.innerHTML="";
  players[2].hand.forEach(()=> {
    let c=document.createElement("div");
    c.className="card deal-animation";
    c.textContent="🂠";
    opponent2HandDiv.appendChild(c);
  });

  // User
  userHandDiv.innerHTML="";
  players[3].hand.forEach((card,idx)=>{
    let c=document.createElement("div");
    c.classList.add("card", getSuitColor(card.suit));
    c.innerHTML=`
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
    c.addEventListener("click", ()=>onUserPlayCard(idx));
    userHandDiv.appendChild(c);
  });

  // Kitty
  if (kittyCard) {
    kittyCardDiv.innerHTML=`
      <div class="card ${getSuitColor(kittyCard.suit)} deal-animation">
        <div>${kittyCard.value}</div>
        <div class="suit">${kittyCard.suit}</div>
      </div>
    `;
  } else {
    kittyCardDiv.innerHTML="";
  }
}

function updateDealerIndicator() {
  dealerIndicator.textContent = `Dealer: ${players[dealerIndex].name}`;
}

function updateTrumpIndicator() {
  if (trumpSuit) {
    trumpIndicator.textContent = `Trump: ${trumpSuit}`;
  } else {
    trumpIndicator.textContent = "Trump: ?";
  }
}

function updateScoreboard() {
  team1ScoreSpan.textContent = team1Score;
  team2ScoreSpan.textContent = team2Score;
}

/***************************************************
 *  Buttons: Order Up, Pass, Select Trump
 ***************************************************/

btnOrderUp.addEventListener("click", () => {
  btnOrderUp.disabled=true; 
  btnPass.disabled=true;
  orderUp(3); // user = index 3
});
btnPass.addEventListener("click", () => {
  btnOrderUp.disabled=true; 
  btnPass.disabled=true; 
  btnSelectTrump.disabled=true;
  passAction();
});
btnSelectTrump.addEventListener("click", ()=> {
  let chosen = prompt("Pick trump suit (♠, ♥, ♦, or ♣):");
  if(!suits.includes(chosen)){
    messageArea.textContent="Invalid suit. Try again or pass.";
    return;
  }
  trumpSuit=chosen;
  makerIndex=3; // user
  messageArea.textContent = `${players[3].name} chooses trump: ${trumpSuit}`;
  startPlayPhase();
});

/***************************************************
 *  Phase 1: Order Up
 ***************************************************/

let phase1Offset=0;

function startPhase1() {
  currentPhase=1;
  phase1Offset=0;
  messageArea.textContent=`Kitty suit is ${kittyCard.suit}. Checking who orders up...`;
  askNextToOrderUp();
}

function askNextToOrderUp() {
  if(phase1Offset>=4) {
    // no one ordered => Phase2
    startPhase2();
    return;
  }
  let pIndex = (dealerIndex+1+phase1Offset)%4;
  if(pIndex===3) {
    // user => enable UI
    btnOrderUp.disabled=false;
    btnPass.disabled=false;
    btnSelectTrump.disabled=true;
  } else {
    // AI (30% chance)
    let decides = Math.random()<0.3; 
    if(decides) {
      orderUp(pIndex);
    } else {
      phase1Offset++;
      askNextToOrderUp();
    }
  }
}

function orderUp(pIndex){
  trumpSuit=kittyCard.suit;
  makerIndex=pIndex;
  messageArea.textContent=`${players[pIndex].name} orders up ${trumpSuit}!`;
  // dealer picks up
  let dPos=dealerIndex;
  players[dPos].hand.push(kittyCard);
  // random discard
  let discardI = Math.floor(Math.random()*players[dPos].hand.length);
  players[dPos].hand.splice(discardI,1);
  kittyCard=null;
  startPlayPhase();
}

/***************************************************
 *  Phase 2: Select Another Trump
 ***************************************************/

let phase2Offset=0;
function startPhase2(){
  currentPhase=2;
  phase2Offset=0;
  messageArea.textContent=`No one ordered up. Next phase to select trump or pass.`;
  askNextToPickTrump();
}

function askNextToPickTrump(){
  if(phase2Offset>=4){
    // stick the dealer
    let dPos=dealerIndex;
    let forced = suits[Math.floor(Math.random()*suits.length)];
    trumpSuit=forced;
    makerIndex=dPos;
    messageArea.textContent=`Dealer is stuck with ${trumpSuit}.`;
    kittyCard=null;
    startPlayPhase();
    return;
  }
  let pIndex=(dealerIndex+1+phase2Offset)%4;
  if(pIndex===3){
    // user => can pick or pass
    btnOrderUp.disabled=true;
    btnPass.disabled=false;
    btnSelectTrump.disabled=false;
  } else {
    // AI
    let decides=Math.random()<0.3;
    if(decides){
      let pick = suits[Math.floor(Math.random()*suits.length)];
      if(pick===kittyCard?.suit){
        // try a different suit if we want
        pick=suits[(suits.indexOf(pick)+1)%4];
      }
      trumpSuit=pick;
      makerIndex=pIndex;
      kittyCard=null;
      messageArea.textContent=`${players[pIndex].name} picks ${trumpSuit} as trump!`;
      startPlayPhase();
    } else {
      phase2Offset++;
      askNextToPickTrump();
    }
  }
}

function passAction() {
  // user passes
  if(currentPhase===1){
    phase1Offset++;
    askNextToOrderUp();
  } else if(currentPhase===2){
    phase2Offset++;
    askNextToPickTrump();
  }
}

/***************************************************
 *  Playing Phase
 ***************************************************/

function startPlayPhase(){
  currentPhase=3;
  renderHands();
  updateTrumpIndicator();
  // next to lead is dealerIndex+1
  leaderPos=(dealerIndex+1)%4;
  roundTrickCount=0;
  trickWinsByTeam[1]=0;
  trickWinsByTeam[2]=0;
  setTimeout(()=>playNextTrick(),1000);
}

function playNextTrick(){
  currentTrick=[];
  roundTrickCount++;
  if(roundTrickCount>5){
    finishRound();
    return;
  }
  messageArea.textContent=`Trick #${roundTrickCount}: ${players[leaderPos].name} leads.`;
  if(leaderPos===3){
    // user lead
    // wait for user to click a card
  } else {
    aiPlayCard(leaderPos);
  }
}

function onUserPlayCard(index){
  if(currentPhase!==3) return;
  // user must be next or must follow suit logic. skipping advanced checks
  let card=players[3].hand.splice(index,1)[0];
  playCardToSpot(3,card);
  currentTrick.push({player:3,card});
  nextPlayerInTrick((3+1)%4);
}

function aiPlayCard(pIndex){
  // naive approach
  let cIndex=Math.floor(Math.random()*players[pIndex].hand.length);
  let card=players[pIndex].hand.splice(cIndex,1)[0];
  playCardToSpot(pIndex,card);
  currentTrick.push({player:pIndex,card});
  nextPlayerInTrick((pIndex+1)%4);
}

function nextPlayerInTrick(pos){
  if(currentTrick.length>=4){
    // determine winner
    let winner=determineTrickWinner(currentTrick);
    messageArea.textContent=`${players[winner].name} wins the trick!`;
    leaderPos=winner;
    let team=players[winner].team;
    trickWinsByTeam[team]++;
    setTimeout(()=>playNextTrick(),1500);
    return;
  }
  if(pos===3){
    // user
    // wait user click
    messageArea.textContent=`Your turn to play a card.`;
  } else {
    setTimeout(()=>aiPlayCard(pos),1000);
  }
}

/** Simple approach ignoring bowers. 
 * Trump outranks led suit. Otherwise compare ranks. 
 */
function determineTrickWinner(trick){
  let trump=trumpSuit;
  let ledSuit=trick[0].card.suit;
  let winnerIdx=0;
  for(let i=1;i<4;i++){
    let curr=trick[i].card;
    let lead=trick[winnerIdx].card;
    // if curr has trump but lead doesn't
    if(curr.suit===trump && lead.suit!==trump){
      winnerIdx=i;
    } 
    else if(curr.suit===lead.suit && lead.suit!==trump){
      // compare index in values
      if(values.indexOf(curr.value)>values.indexOf(lead.value)){
        winnerIdx=i;
      }
    }
    else if(curr.suit===trump && lead.suit===trump){
      // compare ranks in trump
      if(values.indexOf(curr.value)>values.indexOf(lead.value)){
        winnerIdx=i;
      }
    }
  }
  return trick[winnerIdx].player;
}

/***************************************************
 *  Animations: Move card to .play-spot
 ***************************************************/
function playCardToSpot(playerIndex, card){
  let spot;
  switch(playerIndex){
    case 0: spot=partnerPlaySpot; break;
    case 1: spot=opponent1PlaySpot; break;
    case 2: spot=opponent2PlaySpot; break;
    case 3: spot=userPlaySpot; break;
  }
  spot.innerHTML="";
  let cardDiv=document.createElement("div");
  cardDiv.classList.add("card","played-card", getSuitColor(card.suit));
  cardDiv.innerHTML=`
    <div>${card.value}</div>
    <div class="suit">${card.suit}</div>
  `;
  spot.appendChild(cardDiv);

  // Force reflow
  cardDiv.getBoundingClientRect();
  // Animate to center
  cardDiv.classList.add("to-center");
}

/***************************************************
 *  End of Round (Scoring)
 ***************************************************/
function finishRound(){
  messageArea.textContent="Round finished. Calculating points...";
  let makerTeam=players[makerIndex].team;
  let makerTricks=trickWinsByTeam[makerTeam];
  let otherTeam=(makerTeam===1)?2:1;
  let otherTricks=trickWinsByTeam[otherTeam];
  // Award points
  if(makerTricks>=3 && makerTricks<5){
    // 3 or 4
    if(makerTricks===5){
      // Actually if 5 that’s 2 points, but let's handle that:
      // We'll do else if(makerTricks===5) -> 2 points
    }
    // Actually let's do:
    if(makerTricks===5){
      // If the maker took all 5
      messageArea.textContent+=" Maker took all 5 => +2 points!";
      if(makerTeam===1) team1Score+=2; else team2Score+=2;
    } else {
      // 3 or 4 => +1
      messageArea.textContent+=` Maker took ${makerTricks} => +1 point.`;
      if(makerTeam===1) team1Score+=1; else team2Score+=1;
    }
  } 
  else if(makerTricks===5){
    // took all 5 => +2
    messageArea.textContent+=" Maker took all 5 => +2 points!";
    if(makerTeam===1) team1Score+=2; else team2Score+=2;
  }
  else {
    // maker fails => other team gets 2
    messageArea.textContent+=` Maker only took ${makerTricks} => Other team +2.`;
    if(otherTeam===1) team1Score+=2; else team2Score+=2;
  }

  updateScoreboard();
  setTimeout(()=>checkForGameEnd(),2000);
}

function checkForGameEnd(){
  if(team1Score>=10){
    messageArea.textContent="Team1 reaches 10! Game over.";
    // Could show a "Play again?" button or auto reload
  } else if(team2Score>=10){
    messageArea.textContent="Team2 reaches 10! Game over.";
  } else {
    // next round
    nextRound();
  }
}

function nextRound(){
  // rotate dealer
  dealerIndex=(dealerIndex+1)%4;
  startNewRound();
}

/***************************************************
 *  Master Flow
 ***************************************************/
function startNewRound(){
  if(team1Score>=10||team2Score>=10){
    messageArea.textContent="Game Over. Refresh to start again.";
    return;
  }
  trumpSuit=null; makerIndex=null;
  createDeck(); 
  shuffleDeck();
  dealCards();
  renderHands();
  updateDealerIndicator();
  updateTrumpIndicator();
  setTimeout(()=>startPhase1(),1000);
}

window.addEventListener("DOMContentLoaded",()=>{
  startNewRound();
});
