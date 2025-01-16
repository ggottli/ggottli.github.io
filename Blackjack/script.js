// script.js

// -------------------------------------
// Global Variables
// -------------------------------------
let deck = [];
let dealerHand = [];
// Instead of one playerHand, we have an array of playerHands
let playerHands = [];  
let activeHandIndex = 0;  // Which hand is currently being played?

let totalChips = 2000; 
let currentBet = 0;

let gameOver = false;
let dealerRevealed = false;

// HTML Elements
const dealerCardsDiv = document.getElementById("dealer-cards");
const dealerScoreP = document.getElementById("dealer-score");
const totalChipsSpan = document.getElementById("total-chips");
const currentBetSpan = document.getElementById("current-bet");
const messageP = document.getElementById("message");

// Player hands container
const playerHandsContainer = document.getElementById("player-hands-container");

// Buttons
const clearBtn = document.getElementById("btn-clear");
const dealBtn = document.getElementById("btn-deal");
const hitBtn = document.getElementById("btn-hit");
const standBtn = document.getElementById("btn-stand");
const doubleBtn = document.getElementById("btn-double");
const splitBtn = document.getElementById("btn-split");

// Betting Chips
const chipElements = document.querySelectorAll(".chip");

// -------------------------------------
// Deck Setup
// -------------------------------------

function createDeck() {
  deck = [];
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5","6","7","8","9","10","J","Q","K"];
  
  // 3 decks
  for (let d = 0; d < 3; d++) {
    for (let suit of suits) {
      for (let value of values) {
        deck.push({ value, suit });
      }
    }
  }
}

function shuffleDeck() {
  for (let i = 0; i < deck.length; i++) {
    let swapIdx = Math.floor(Math.random() * deck.length);
    [deck[i], deck[swapIdx]] = [deck[swapIdx], deck[i]];
  }
}

// -------------------------------------
// Blackjack Logic
// -------------------------------------

function getCardValue(card) {
  if (card.value === "A") {
    return 1; 
  } else if (["J", "Q", "K"].includes(card.value)) {
    return 10;
  } else {
    return parseInt(card.value);
  }
}

function getHandValue(cards) {
  let total = 0;
  let hasAce = false;
  for (let card of cards) {
    total += getCardValue(card);
    if (card.value === "A") {
      hasAce = true;
    }
  }
  if (hasAce && total + 10 <= 21) {
    total += 10;
  }
  return total;
}

// Check if a 2-card hand is exactly 21 => "blackjack"
function isBlackjack(cards) {
  return cards.length === 2 && getHandValue(cards) === 21;
}

// Are these two cards splittable? (same rank or 10-value combos)
function canSplitCards(card1, card2) {
  // If both have same value (e.g. two 8s, or 4/4, etc.)
  if (card1.value === card2.value) return true;

  // If both 10-value cards, treat them as splittable 
  // (some casinos do, some don't). 
  // e.g. K/10 or Q/J, etc.
  const val1 = getCardValue(card1);
  const val2 = getCardValue(card2);
  return (val1 === 10 && val2 === 10);
}

// -------------------------------------
// Rendering & UI
// -------------------------------------

function createCardElement(card, hidden = false) {
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "deal-animation");
  if (hidden) {
    cardDiv.style.backgroundColor = "#333";
    cardDiv.style.color = "#333";
    cardDiv.textContent = "???";
  } else {
    cardDiv.innerHTML = `
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
  }
  return cardDiv;
}

function displayDealerHand() {
  dealerCardsDiv.innerHTML = "";
  dealerHand.forEach((card, index) => {
    let hidden = false;
    if (index === 1 && !dealerRevealed) {
      hidden = true;
    }
    let cardElem = createCardElement(card, hidden);
    dealerCardsDiv.appendChild(cardElem);
  });
  // Update dealer score text
  if (!dealerRevealed && dealerHand.length > 0) {
    const firstVal = getCardValue(dealerHand[0]);
    if (dealerHand[0].value === "A") {
      dealerScoreP.textContent = `Score: 11+`;
    } else {
      dealerScoreP.textContent = `Score: ${firstVal}+`;
    }
  } else {
    dealerScoreP.textContent = `Score: ${getHandValue(dealerHand)}`;
  }
}

function displayPlayerHands() {
  // Clear container
  playerHandsContainer.innerHTML = "";

  playerHands.forEach((handObj, index) => {
    // Create a wrapper div
    const handArea = document.createElement("div");
    handArea.classList.add("player-hand-area");

    // Title
    const title = document.createElement("div");
    title.classList.add("player-hand-title");
    title.textContent = `Your Hand #${index + 1} (Bet: ${handObj.bet})`;
    handArea.appendChild(title);

    // Card container
    const cardsDiv = document.createElement("div");
    cardsDiv.classList.add("card-container");

    handObj.cards.forEach(card => {
      let cardElem = createCardElement(card, false);
      cardsDiv.appendChild(cardElem);
    });
    handArea.appendChild(cardsDiv);

    // Score
    const scoreP = document.createElement("p");
    scoreP.textContent = `Score: ${getHandValue(handObj.cards)}`;
    handArea.appendChild(scoreP);

    playerHandsContainer.appendChild(handArea);
  });
}

function updateUI() {
  displayDealerHand();
  displayPlayerHands();
  totalChipsSpan.textContent = totalChips;
  currentBetSpan.textContent = currentBet;
}

// -------------------------------------
// Deal Logic & Round Management
// -------------------------------------

async function dealOneCard(hand) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const card = deck.pop();
      hand.push(card);
      resolve();
    }, 500);
  });
}

function endRound() {
  gameOver = true;
  dealBtn.disabled = false;
  clearBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  doubleBtn.disabled = true;
  splitBtn.disabled = true;
}

/**
 * Check if we should enable "Split" or "Double" for the current active hand.
 */
function updateActionButtons() {
  if (gameOver) return;

  const handObj = playerHands[activeHandIndex];
  const cards = handObj.cards;

  // "Hit" and "Stand" are usually allowed unless hand busted or finished.
  // We'll handle bust logic after dealing a card.

  // Double Down: only allowed if exactly 2 cards, and player has enough chips.
  if (cards.length === 2 && totalChips >= handObj.bet + 1) {
    doubleBtn.disabled = false;
  } else {
    doubleBtn.disabled = true;
  }

  // Split: only if exactly 2 cards that are splittable, 
  // and the player has enough chips to match the bet again,
  // and we haven't already splitted this hand (we only allow one split total).
  // We'll keep it simple: no multi-splits. 
  if (
    cards.length === 2 && 
    canSplitCards(cards[0], cards[1]) &&
    totalChips >= handObj.bet + 1 &&
    playerHands.length < 2  // means we haven't splitted yet
  ) {
    splitBtn.disabled = false;
  } else {
    splitBtn.disabled = true;
  }
}

/**
 * Move to the next player hand if any remain. Otherwise proceed to dealer.
 */
function nextHandOrDealer() {
  // Mark the current hand finished
  playerHands[activeHandIndex].finished = true;

  // Find next unfinished hand
  let nextIndex = playerHands.findIndex(h => !h.finished);
  if (nextIndex !== -1) {
    // We have another hand to play
    activeHandIndex = nextIndex;
    messageP.textContent = `Now playing Hand #${activeHandIndex+1}...`;
    updateActionButtons();
  } else {
    // All hands done => dealer's turn if at least one player's hand isn't busted
    const anySurvivor = playerHands.some(h => getHandValue(h.cards) <= 21);
    if (anySurvivor) {
      dealerTurn();
    } else {
      // Everyone busted, round ends
      messageP.textContent = "All your hands busted! Dealer wins automatically.";
      // subtract bets that haven't been subtracted yet?
      finalizeRound();
    }
  }
}

/**
 * Dealer draws to 17, then we compare each player's hand that isn't busted.
 */
async function dealerTurn() {
  dealerRevealed = true;
  updateUI();

  while (getHandValue(dealerHand) < 17) {
    await dealOneCard(dealerHand);
    updateUI();
  }

  // Compare each hand that isn't busted
  finalizeRound();
}

function finalizeRound() {
  const dealerVal = getHandValue(dealerHand);
  let results = [];

  playerHands.forEach((handObj, index) => {
    const val = getHandValue(handObj.cards);
    if (val > 21) {
      // Busted => lose
      totalChips -= handObj.bet;
      results.push(`Hand #${index+1}: Busted, you lose (-${handObj.bet}).`);
    } else if (dealerVal > 21) {
      // Dealer bust => you win
      totalChips += handObj.bet;
      results.push(`Hand #${index+1}: Dealer busted, you win (+${handObj.bet}).`);
    } else if (val > dealerVal) {
      // Win
      totalChips += handObj.bet;
      results.push(`Hand #${index+1}: You win (+${handObj.bet}).`);
    } else if (val < dealerVal) {
      // Lose
      totalChips -= handObj.bet;
      results.push(`Hand #${index+1}: Dealer wins (-${handObj.bet}).`);
    } else {
      // Tie => push
      results.push(`Hand #${index+1}: Push (no change).`);
    }
  });

  messageP.textContent = results.join(" ");
  updateUI();
  endRound();
}

/**
 * Start a new round.
 * Single-hand or multi-hand if splitted.
 */
async function startNewGame() {
  if (currentBet <= 0) {
    messageP.textContent = "Please place a bet before dealing!";
    return;
  }
  if (currentBet > totalChips) {
    messageP.textContent = "Your bet exceeds your total chips!";
    return;
  }
  if (deck.length < 10) {
    createDeck();
    shuffleDeck();
  }

  gameOver = false;
  dealerRevealed = false;
  dealerHand = [];
  playerHands = [
    {
      cards: [],
      bet: currentBet,
      finished: false,
    },
  ];
  activeHandIndex = 0;

  messageP.textContent = "";
  dealBtn.disabled = true;
  clearBtn.disabled = true;
  hitBtn.disabled = false;
  standBtn.disabled = false;

  // Clear UI
  dealerCardsDiv.innerHTML = "";
  playerHandsContainer.innerHTML = "";

  // Deal 2 cards to player, 2 to dealer
  await dealOneCard(playerHands[0].cards);
  updateUI();

  await dealOneCard(dealerHand);
  updateUI();

  await dealOneCard(playerHands[0].cards);
  updateUI();

  await dealOneCard(dealerHand);
  updateUI();

  // Now check immediate blackjacks, etc. 
  // (We'll skip complicated immediate BJ logic for splits, 
  //  but you could incorporate the same approach as before.)
  updateActionButtons();
}

/**
 * Player hits on the current active hand.
 */
async function playerHit() {
  if (gameOver) return;

  let handObj = playerHands[activeHandIndex];
  if (handObj.finished) return; // can't hit a finished hand

  await dealOneCard(handObj.cards);
  updateUI();

  const val = getHandValue(handObj.cards);
  if (val > 21) {
    // Busted => next hand
    messageP.textContent = `Hand #${activeHandIndex+1} busted!`;
    handObj.finished = true;
    nextHandOrDealer();
  } else {
    updateActionButtons();
  }
}

/**
 * Player stands on the current active hand.
 */
function playerStand() {
  if (gameOver) return;

  let handObj = playerHands[activeHandIndex];
  if (handObj.finished) return;

  messageP.textContent = `You stood on hand #${activeHandIndex+1}`;
  handObj.finished = true;

  nextHandOrDealer();
}

/**
 * Double down on the current active hand.
 * Double the bet, deal 1 card, then stand automatically.
 */
async function playerDoubleDown() {
  if (gameOver) return;

  let handObj = playerHands[activeHandIndex];
  if (handObj.finished) return;
  if (handObj.cards.length !== 2) return; // must have exactly 2 cards

  // Check if we have enough chips to double
  if (totalChips < handObj.bet + 1) {
    messageP.textContent = "Not enough chips to double!";
    return;
  }

  // Increase bet
  handObj.bet += handObj.bet; 
  // or: 
  // totalChips -= handObj.bet; 
  // but in this code, we only pay out at end. 
  // We'll just logically treat bet as doubled.
  // So if you lose, you lose double; if you win, you gain double.

  // Deal one card
  await dealOneCard(handObj.cards);
  updateUI();

  // Stand automatically
  handObj.finished = true;
  messageP.textContent = `Doubled down on Hand #${activeHandIndex+1}, final total: ${getHandValue(handObj.cards)}`;
  nextHandOrDealer();
}

/**
 * Split the current active hand if possible.
 */
function playerSplit() {
  if (gameOver) return;

  let handObj = playerHands[activeHandIndex];
  if (handObj.finished) return;
  if (handObj.cards.length !== 2) return;

  const [card1, card2] = handObj.cards;
  if (!canSplitCards(card1, card2)) {
    messageP.textContent = "Cannot split these cards!";
    return;
  }

  // Check if enough chips to match the bet
  if (totalChips < handObj.bet + 1) {
    messageP.textContent = "Not enough chips to split!";
    return;
  }

  // Create a new hand with the second card
  const newHand = {
    cards: [card2],
    bet: handObj.bet,
    finished: false,
  };

  // The first hand just has the first card now
  handObj.cards = [card1];

  // Insert newHand after the current hand
  playerHands.splice(activeHandIndex+1, 0, newHand);

  messageP.textContent = "Split successful! You have two hands now.";
  updateUI();
  updateActionButtons();
}

// -------------------------------------
// Event Listeners
// -------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  createDeck();
  shuffleDeck();
  updateUI();
});

// Betting
chipElements.forEach(chip => {
  chip.addEventListener("click", () => {
    const chipValue = parseInt(chip.getAttribute("data-value"));
    if (totalChips - currentBet >= chipValue) {
      currentBet += chipValue;
      updateUI();
    }
  });
});

clearBtn.addEventListener("click", () => {
  currentBet = 0;
  updateUI();
});

dealBtn.addEventListener("click", () => {
  startNewGame();
});

// Gameplay
hitBtn.addEventListener("click", () => {
  playerHit();
});
standBtn.addEventListener("click", () => {
  playerStand();
});
doubleBtn.addEventListener("click", () => {
  playerDoubleDown();
});
splitBtn.addEventListener("click", () => {
  playerSplit();
});
