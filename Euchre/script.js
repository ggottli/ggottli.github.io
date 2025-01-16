/**********************************************
 * Script focusing on improved visuals / pacing
 **********************************************/

// Example seat arrangement
let players = [
  { name: "Partner", hand: [] },
  { name: "Opponent1", hand: [] },
  { name: "Opponent2", hand: [] },
  { name: "You", hand: [] },
];

// HTML references
const partnerHandDiv  = document.getElementById("partner-hand");
const opponent1HandDiv= document.getElementById("opponent1-hand");
const opponent2HandDiv= document.getElementById("opponent2-hand");
const userHandDiv     = document.getElementById("user-hand");
const trickArea       = document.getElementById("trick-area");
const messageArea     = document.getElementById("message-area");

/** Minimal deck for demonstration. We'll focus on visuals. */
const suits=["♠","♥","♦","♣"];
const values=["9","10","J","Q","K","A"];
let deck=[];

/** Example: we'll just deal 5 random cards to each. */
function dealSomeCards(){
  // create small deck for demo
  deck=[];
  for(let s of suits){
    for(let v of values){
      deck.push({value:v,suit:s});
    }
  }
  deck.sort(()=>Math.random()-0.5);
  // give 5 each
  for(let p=0;p<4;p++){
    players[p].hand = deck.splice(0,5);
  }
}

/** Render the 4 hands (3 are face-down, user is face-up). */
function renderHands(){
  // partner top
  partnerHandDiv.innerHTML="";
  players[0].hand.forEach(()=> {
    const c=document.createElement("div");
    c.className="card";
    c.textContent="🂠";
    partnerHandDiv.appendChild(c);
  });

  // opp1 left
  opponent1HandDiv.innerHTML="";
  players[1].hand.forEach(()=>{
    const c=document.createElement("div");
    c.className="card";
    c.textContent="🂠";
    opponent1HandDiv.appendChild(c);
  });

  // opp2 right
  opponent2HandDiv.innerHTML="";
  players[2].hand.forEach(()=>{
    const c=document.createElement("div");
    c.className="card";
    c.textContent="🂠";
    opponent2HandDiv.appendChild(c);
  });

  // user bottom (face-up)
  userHandDiv.innerHTML="";
  players[3].hand.forEach((card,idx)=>{
    let c=document.createElement("div");
    c.classList.add("card", getSuitColor(card.suit));
    c.innerHTML=`
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
    // On click => user plays
    c.addEventListener("click", ()=> userPlaysCard(idx));
    userHandDiv.appendChild(c);
  });
}

function getSuitColor(suit){
  return (suit==="♥"|| suit==="♦")?"red":"black";
}

/** We'll store the 4 played cards for a single trick in an array */
let trickCards=[]; // array of {playerIndex, cardData}

/** Called when user clicks a card */
function userPlaysCard(handIndex){
  let card=players[3].hand.splice(handIndex,1)[0];
  let cardElem=userHandDiv.children[handIndex]; // the actual DOM element

  animateCardToTrick(3,card, cardElem);

  // next AI players will follow with a delay
  let nextPos=0; // partner leads next?
  setTimeout(()=>aiPlaysCard(0),1500);
  setTimeout(()=>aiPlaysCard(1),3000);
  setTimeout(()=>aiPlaysCard(2),4500);
  // after 4th card, we can see them all in trick-area
  // then show winner, remove them, etc.
  setTimeout(()=>completeTrick(),6000);
}

/** AI picks a random card */
function aiPlaysCard(pIndex){
  let cIndex=Math.floor(Math.random()*players[pIndex].hand.length);
  let card=players[pIndex].hand.splice(cIndex,1)[0];
  // The DOM element is the cIndex-th child in their container
  let parentDiv=null;
  switch(pIndex){
    case 0: parentDiv=partnerHandDiv; break;
    case 1: parentDiv=opponent1HandDiv; break;
    case 2: parentDiv=opponent2HandDiv; break;
  }
  let cardElem=parentDiv.children[cIndex];
  animateCardToTrick(pIndex, card, cardElem);
}

/** Animate the card from the player's hand to the trick-area. */
function animateCardToTrick(playerIndex, cardData, cardElem){
  // 1) Get bounding rect of the original card
  let rect=cardElem.getBoundingClientRect();
  
  // 2) Create a "clone" that is absolutely positioned so it starts from the same spot
  let clone=cardElem.cloneNode(true);
  document.body.appendChild(clone);
  clone.classList.add("play-anim"); // position absolute, top-left= old card
  clone.style.left=rect.left+"px";
  clone.style.top=rect.top+"px";
  // If it's AI, set face-up now:
  if(playerIndex!==3){
    clone.innerHTML=`<div>${cardData.value}</div><div class="suit">${cardData.suit}</div>`;
    clone.classList.remove("red","black");
    clone.classList.add(getSuitColor(cardData.suit));
  }

  // 3) Remove the original card from the DOM
  cardElem.remove();

  // 4) Add the played card info to trickCards
  trickCards.push({playerIndex, card: cardData, cloneElem: clone});

  // 5) Position the clone in .trick-area
  // We'll place them in a row. We'll offset them slightly.
  const trickRect=trickArea.getBoundingClientRect();
  let slotIndex = trickCards.length-1; // 0..3
  let xOffset=trickRect.left + 15 + slotIndex*60; 
  let yOffset= trickRect.top + (trickRect.height/2) - 36; // center vertically

  // Force a reflow so the clone is in its initial position
  clone.getBoundingClientRect();
  
  // 6) Animate it to the new position
  clone.style.left=xOffset+"px";
  clone.style.top=yOffset+"px";
}

/** After all 4 cards are played */
function completeTrick(){
  messageArea.textContent="All cards played! You can see them in the center.";
  // You could determine the winner, highlight them, etc.
  setTimeout(()=>{
    // remove them from DOM
    trickCards.forEach(tc => {
      tc.cloneElem.remove();
    });
    trickCards=[];
    messageArea.textContent="Trick done. Next trick or next round...";
  },2000);
}

/** For demonstration: start a round with some cards. */
function startDemo(){
  dealSomeCards();
  renderHands();
  messageArea.textContent="Click a card from your hand to play it. Then watch the AI!";
}

window.addEventListener("DOMContentLoaded", startDemo);
