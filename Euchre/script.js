// script.js

/****************************************************
 * Basic Data Setup
 ****************************************************/
const suits = ["♠","♥","♦","♣"];
const values = ["9","10","J","Q","K","A"];
let deck = [];
let players = [
  { name: "Opponent1", hand: [], team: 1 },
  { name: "Opponent2", hand: [], team: 2 },
  { name: "Partner",   hand: [], team: 1 },
  { name: "You",       hand: [], team: 2 },
];

// For convenience in referencing positions:
const OPP1 = 0, OPP2 = 1, PARTNER = 2, USER = 3;

let kittyCard = null;      // The face-up kitty card
let trumpSuit = null;      // The chosen trump
let dealerIndex = 0;       // Who is dealing this round?
let currentPhase = 0;      // 0 = dealing, 1=phase1 trump, 2=phase2 trump, 3=playing
let messageArea = document.getElementById("message-area");

// HTML references
const opponent1HandDiv = document.getElementById("opponent1-hand");
const opponent2HandDiv = document.getElementById("opponent2-hand");
const partnerHandDiv = document.getElementById("partner-hand");
const userHandDiv = document.getElementById("user-hand");
const kittyCardDiv = document.getElementById("kitty-card");

const btnOrderUp = document.getElementById("btn-order-up");
const btnPass = document.getElementById("btn-pass");
const btnSelectTrump = document.getElementById("btn-select-trump");

/****************************************************
 * Euchre Setup
 ****************************************************/

/** Create a 24-card Euchre deck. */
function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let val of values) {
      deck.push({value: val, suit});
    }
  }
}

/** Shuffle deck in place. */
function shuffleDeck() {
  for(let i = 0; i < deck.length; i++){
    const swapIdx = Math.floor(Math.random() * deck.length);
    [deck[i], deck[swapIdx]] = [deck[swapIdx], deck[i]];
  }
}

/** Deal 5 cards to each player and 1 kitty card. */
function dealCards() {
  // Clear old hands
  players.forEach(p => p.hand = []);
  // Shuffle & deal
  shuffleDeck();
  // Each player gets 5
  for (let round = 0; round < 5; round++) {
    for (let i = 0; i < 4; i++) {
      players[(dealerIndex + 1 + i) % 4].hand.push(deck.pop());
    }
  }
  // Next card is kitty
  kittyCard = deck.pop();
}

/****************************************************
 * Rendering
 ****************************************************/
function renderHands() {
  // For now, show AI cards face-down for Opponents, face-up for user. 
  // (Or face-up for debugging.)
  opponent1HandDiv.innerHTML = "";
  players[OPP1].hand.forEach(() => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "deal-animation");
    cardDiv.textContent = "🂠"; // Face-down
    opponent1HandDiv.appendChild(cardDiv);
  });

  opponent2HandDiv.innerHTML = "";
  players[OPP2].hand.forEach(() => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "deal-animation");
    cardDiv.textContent = "🂠"; // Face-down
    opponent2HandDiv.appendChild(cardDiv);
  });

  partnerHandDiv.innerHTML = "";
  players[PARTNER].hand.forEach(() => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "deal-animation");
    cardDiv.textContent = "🂠"; // Face-down
    partnerHandDiv.appendChild(cardDiv);
  });

  userHandDiv.innerHTML = "";
  players[USER].hand.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card", "deal-animation");
    cardDiv.innerHTML = `<div>${card.value}</div><div class="suit">${card.suit}</div>`;
    // For playing a card, you might add a click event:
    cardDiv.addEventListener("click", () => onUserPlaysCard(index));
    userHandDiv.appendChild(cardDiv);
  });

  // Render kitty
  if (kittyCard) {
    kittyCardDiv.innerHTML = `
      <div class="card deal-animation">
        <div>${kittyCard.value}</div>
        <div class="suit">${kittyCard.suit}</div>
      </div>
    `;
  } else {
    kittyCardDiv.innerHTML = "";
  }
}

/****************************************************
 * Simple Trump Phase Logic
 ****************************************************/

/** Start Phase 1 - chance to order up the kitty's suit. */
function startPhase1Trump() {
  currentPhase = 1;
  messageArea.textContent = `Kitty suit is ${kittyCard.suit}. Who will order up?`;
  // We'll iterate in order: (dealerIndex+1) % 4, etc.
  askNextToOrderUp(0); // naive approach
}

/** Ask each player in turn if they want to order up. */
function askNextToOrderUp(offset) {
  let playerPos = (dealerIndex + 1 + offset) % 4;
  if (offset >= 4) {
    // No one ordered => go to Phase 2
    startPhase2Trump();
    return;
  }
  if (playerPos === USER) {
    // enable UI for user (Order Up / Pass)
    btnOrderUp.disabled = false;
    btnPass.disabled = false;
    btnSelectTrump.disabled = true;
  } else {
    // AI logic (random or pass)
    let decide = Math.random() < 0.3; // 30% chance to order up
    if (decide) {
      orderUp(playerPos);
    } else {
      askNextToOrderUp(offset + 1);
    }
  }
}

/** If a player orders up the kitty suit. */
function orderUp(playerPos) {
  trumpSuit = kittyCard.suit;
  messageArea.textContent = `${players[playerPos].name} ordered up ${trumpSuit}!`;
  currentPhase = 3; // skip phase2, jump to playing
  // The dealer picks up the card
  let dPos = dealerIndex;
  players[dPos].hand.push(kittyCard);
  // The dealer should discard 1 card (naive: random discard).
  let discardIndex = Math.floor(Math.random() * players[dPos].hand.length);
  players[dPos].hand.splice(discardIndex,1);

  // Re-render
  kittyCard = null;
  renderHands();

  // proceed to playing
  setTimeout(() => {
    startPlaying();
  }, 1000);
}

/** If no one orders up in Phase 1, we do Phase 2. */
function startPhase2Trump() {
  currentPhase = 2;
  messageArea.textContent = `No one ordered up. Pick a trump or pass.`;
  askNextToPickTrump(0);
}

/** Similar approach for Phase 2. */
function askNextToPickTrump(offset) {
  let playerPos = (dealerIndex + 1 + offset) % 4;
  if (offset >= 4) {
    // Everyone passed => random force or "Stick the dealer" 
    // For simplicity, let the dealer pick random suit.
    let dPos = dealerIndex;
    let forcedSuit = suits[Math.floor(Math.random()*suits.length)];
    trumpSuit = forcedSuit;
    messageArea.textContent = `Dealer picks ${trumpSuit} by default.`;
    currentPhase = 3;
    kittyCard = null;
    renderHands();
    setTimeout(() => {
      startPlaying();
    }, 1000);
    return;
  }
  if (playerPos === USER) {
    // enable "Select Trump" button or "Pass"
    btnOrderUp.disabled = true;
    btnSelectTrump.disabled = false;
    btnPass.disabled = false;
  } else {
    // AI picks randomly or passes
    let decide = Math.random() < 0.3; 
    if (decide) {
      let chosenSuit = suits[Math.floor(Math.random()*suits.length)];
      trumpSuit = chosenSuit === kittyCard?.suit ? suits[(suits.indexOf(chosenSuit)+1)%4] : chosenSuit;
      messageArea.textContent = `${players[playerPos].name} picks ${trumpSuit} as trump!`;
      currentPhase = 3;
      kittyCard = null;
      renderHands();
      setTimeout(() => {
        startPlaying();
      }, 1000);
    } else {
      askNextToPickTrump(offset + 1);
    }
  }
}

/****************************************************
 * Playing Phase (very simplified)
 ****************************************************/
let currentTrick = []; // store the 4 cards played
let leaderPos = 0;     // who leads the trick
let trickCount = 0;

function startPlaying() {
  messageArea.textContent = `Trump is ${trumpSuit}. Let's play!`;
  trickCount = 0;
  leaderPos = (dealerIndex + 1) % 4; // next after dealer leads first
  playNextTrick();
}

/** Start or continue the next trick. Clear any table of old cards, etc. */
function playNextTrick() {
  currentTrick = [];
  trickCount++;
  if (trickCount > 5) {
    // Round over
    finishRound();
    return;
  }
  messageArea.textContent = `Trick #${trickCount}: ${players[leaderPos].name} leads.`;
  if (leaderPos === USER) {
    // user picks a card to lead
    // the click handler is on the user’s cards
  } else {
    // AI leads
    let aiCardIndex = Math.floor(Math.random()*players[leaderPos].hand.length);
    let playedCard = players[leaderPos].hand.splice(aiCardIndex,1)[0];
    currentTrick.push({player: leaderPos, card: playedCard});
    renderHands(); 
    nextPlayerInTrick((leaderPos+1)%4);
  }
}

/** Called when the user clicks a card to play. */
function onUserPlaysCard(index) {
  if (currentPhase !== 3) return; // not in playing phase
  if (leaderPos !== USER && currentTrick.length===0) return; 
  // If the user isn't the leader, must follow suit if possible, etc. 
  // We'll skip that logic for brevity.

  let playedCard = players[USER].hand.splice(index,1)[0];
  currentTrick.push({player: USER, card: playedCard});
  renderHands();
  nextPlayerInTrick((USER+1)%4);
}

/** Each subsequent player (AI) plays a card, eventually 4 cards in the trick. */
function nextPlayerInTrick(pos) {
  if (currentTrick.length >= 4) {
    // Determine trick winner
    let winner = determineTrickWinner(currentTrick, trumpSuit);
    messageArea.textContent = `${players[winner].name} wins the trick!`;
    leaderPos = winner;
    setTimeout(() => {
      playNextTrick();
    }, 1500);
    return;
  }
  if (pos === USER) {
    // wait for user to click
    messageArea.textContent = `Your turn to play a card.`;
    return;
  } else {
    // AI chooses a card
    let aiCardIndex = Math.floor(Math.random()*players[pos].hand.length);
    let playedCard = players[pos].hand.splice(aiCardIndex,1)[0];
    currentTrick.push({player: pos, card: playedCard});
    renderHands();
    nextPlayerInTrick((pos+1)%4);
  }
}

/** Very naive approach for determining which card wins the trick. */
function determineTrickWinner(trick, trump) {
  // In real Euchre: Right Bower = Jack of trump, Left Bower = Jack of same color, then A/K/Q/J/T/9
  // For simplicity, let's just track suit following and trump. 
  // We'll skip Bower logic or do minimal approach.

  let ledSuit = trick[0].card.suit;
  let winningIndex = 0;
  for (let i = 1; i < trick.length; i++) {
    if (trick[i].card.suit === trick[winningIndex].card.suit) {
      // same suit, compare rank?
      // We'll do naive rank ordering
      if (values.indexOf(trick[i].card.value) > values.indexOf(trick[winningIndex].card.value)) {
        winningIndex = i;
      }
    } 
    // else if it’s trump vs non-trump
    else if (trick[i].card.suit === trump && trick[winningIndex].card.suit !== trump) {
      winningIndex = i;
    }
  }
  return trick[winningIndex].player;
}

/** After 5 tricks, see how many each team took. */
function finishRound() {
  messageArea.textContent = "Round finished! (No scoring logic in this example.)";
  // You might count how many tricks each team took, etc.

  endRound();
}

/****************************************************
 * UI Button Handlers
 ****************************************************/
btnOrderUp.addEventListener("click", () => {
  btnOrderUp.disabled = true;
  btnPass.disabled = true;
  orderUp(USER);
});

btnPass.addEventListener("click", () => {
  // If in Phase1, we go to next offset
  // If in Phase2, we also go to next offset, etc.
  btnOrderUp.disabled = true;
  btnPass.disabled = true;
  btnSelectTrump.disabled = true;
  if (currentPhase === 1) {
    // pass in phase1 => ask next
    let offset = 0;
    // find who was asked
    // naive approach: skip
    askNextToOrderUp(offset + 1);
  } else if (currentPhase === 2) {
    // pass in phase2 => next
    askNextToPickTrump(1);
  }
});

btnSelectTrump.addEventListener("click", () => {
  // Let user pick from suits
  let chosen = prompt("Pick trump suit (♠, ♥, ♦, or ♣):");
  if (!suits.includes(chosen)) {
    messageArea.textContent = "Invalid suit. Try again or pass.";
    return;
  }
  trumpSuit = chosen;
  messageArea.textContent = `You chose ${trumpSuit} as trump!`;
  currentPhase = 3;
  kittyCard = null;
  renderHands();
  setTimeout(() => {
    startPlaying();
  }, 1000);
});

/****************************************************
 * Game Start
 ****************************************************/
function startNewRound() {
  createDeck();
  shuffleDeck();
  dealCards();
  renderHands();
  startPhase1Trump();
}

// Just start a new round on page load
window.addEventListener("DOMContentLoaded", () => {
  dealerIndex = Math.floor(Math.random()*4); 
  startNewRound();
});
