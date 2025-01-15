// script.js

// -------------------------------------
// Global Variables
// -------------------------------------
let deck = [];
let playerHand = [];
let dealerHand = [];

let totalChips = 2000;     // Player starts with 2000 chips
let currentBet = 0;

let gameOver = false;

// HTML Elements
const dealerCardsDiv = document.getElementById("dealer-cards");
const dealerScoreP = document.getElementById("dealer-score");
const playerCardsDiv = document.getElementById("player-cards");
const playerScoreP = document.getElementById("player-score");

const totalChipsSpan = document.getElementById("total-chips");
const currentBetSpan = document.getElementById("current-bet");
const messageP = document.getElementById("message");

const deckCardsRemainingSpan = document.getElementById("deck-cards-remaining");

// Buttons
const clearBtn = document.getElementById("btn-clear");
const dealBtn = document.getElementById("btn-deal");
const hitBtn = document.getElementById("btn-hit");
const standBtn = document.getElementById("btn-stand");

// Chips for betting
const chipElements = document.querySelectorAll(".chip");

// -------------------------------------
// Functions
// -------------------------------------

/**
 * Creates a deck combining 3 standard decks (3 x 52 = 156 cards).
 */
function createDeck() {
  deck = [];
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [
    "A", "2", "3", "4", "5",
    "6", "7", "8", "9", "10",
    "J", "Q", "K"
  ];
  
  // 3 decks
  for (let d = 0; d < 3; d++) {
    for (let suit of suits) {
      for (let value of values) {
        deck.push({ value, suit });
      }
    }
  }
}

/**
 * Shuffle the global deck in place.
 */
function shuffleDeck() {
  for (let i = 0; i < deck.length; i++) {
    let swapIdx = Math.floor(Math.random() * deck.length);
    [deck[i], deck[swapIdx]] = [deck[swapIdx], deck[i]];
  }
}

/**
 * Returns integer value of a given card (Ace special-case is handled in getHandValue).
 */
function getCardValue(card) {
  if (card.value === "A") {
    return 1; 
  } else if (["J", "Q", "K"].includes(card.value)) {
    return 10;
  } else {
    return parseInt(card.value);
  }
}

/**
 * Returns total hand value (handling Ace as 1 or 11).
 */
function getHandValue(hand) {
  let total = 0;
  let hasAce = false;

  for (let card of hand) {
    total += getCardValue(card);
    if (card.value === "A") {
      hasAce = true;
    }
  }
  
  // If there's an Ace and it won't bust, add 10
  if (hasAce && total + 10 <= 21) {
    total += 10;
  }
  return total;
}

/**
 * Visually display a hand’s cards in the given container.
 */
function displayHand(hand, container) {
  container.innerHTML = "";
  for (let card of hand) {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.innerHTML = `
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
    container.appendChild(cardDiv);
  }
}

/**
 * Update both player and dealer score text.
 */
function updateScores() {
  playerScoreP.textContent = `Score: ${getHandValue(playerHand)}`;
  dealerScoreP.textContent = `Score: ${getHandValue(dealerHand)}`;
}

/**
 * Updates deck-cards-remaining display.
 */
function updateDeckInfo() {
  deckCardsRemainingSpan.textContent = `Cards left: ${deck.length}`;
}

/**
 * Check for the end of the game (bust or stand), update chips, show message, etc.
 */
function checkForEndOfGame() {
  const playerValue = getHandValue(playerHand);
  const dealerValue = getHandValue(dealerHand);

  if (playerValue > 21) {
    // Player bust
    messageP.textContent = "You busted! Dealer wins!";
    totalChips -= currentBet;
    endRound();
  } else if (dealerValue > 21) {
    // Dealer bust
    messageP.textContent = "Dealer busted! You win!";
    totalChips += currentBet;
    endRound();
  } else if (gameOver) {
    // Compare final totals
    if (playerValue > dealerValue) {
      messageP.textContent = "You win!";
      totalChips += currentBet;
    } else if (playerValue < dealerValue) {
      messageP.textContent = "Dealer wins!";
      totalChips -= currentBet;
    } else {
      messageP.textContent = "It's a tie!";
      // Tie = push, no chip change
    }
    endRound();
  }

  totalChipsSpan.textContent = totalChips;

  // Check if player is out of chips
  if (totalChips <= 0) {
    messageP.textContent = "You are out of chips! Game Over!";
    disableBetting();
    disableGameplay();
  }
}

/**
 * Called when the round is over (bust or stand scenario).
 */
function endRound() {
  dealBtn.disabled = false;
  clearBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  currentBet = 0;
  currentBetSpan.textContent = currentBet;
  gameOver = true;
}

/**
 * Begin a new round (deal).
 */
function startNewGame() {
  // If we have fewer than, say, 10 cards left, let's reshuffle to ensure we have enough
  // Or you can decide to reshuffle only if the deck is fully exhausted.
  if (deck.length < 10) {
    createDeck();
    shuffleDeck();
  }

  // Clear previous round
  playerHand = [];
  dealerHand = [];
  gameOver = false;
  messageP.textContent = "";

  // Deal initial cards
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());

  // Update visuals
  displayHand(playerHand, playerCardsDiv);
  displayHand(dealerHand, dealerCardsDiv);
  updateScores();
  updateDeckInfo();

  // Gameplay buttons are active
  hitBtn.disabled = false;
  standBtn.disabled = false;
  // Bet controls are disabled during a round
  dealBtn.disabled = true;
  clearBtn.disabled = true;
}

/**
 * Disable betting area if the player is out of chips or game is over.
 */
function disableBetting() {
  chipElements.forEach(chip => {
    chip.style.pointerEvents = "none";
  });
  clearBtn.disabled = true;
  dealBtn.disabled = true;
}

/**
 * Disable gameplay controls (Hit / Stand).
 */
function disableGameplay() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

// -------------------------------------
// Event Listeners
// -------------------------------------

// On page load, create and shuffle the deck, update the UI
window.addEventListener("DOMContentLoaded", () => {
  createDeck();
  shuffleDeck();
  updateDeckInfo();
  totalChipsSpan.textContent = totalChips;
  currentBetSpan.textContent = currentBet;
});

// Betting Chips Click
chipElements.forEach(chip => {
  chip.addEventListener("click", () => {
    const chipValue = parseInt(chip.getAttribute("data-value"));
    // Only allow a bet if the player has enough chips
    if (totalChips - currentBet >= chipValue) {
      currentBet += chipValue;
      currentBetSpan.textContent = currentBet;
    }
  });
});

// Clear Bet
clearBtn.addEventListener("click", () => {
  currentBet = 0;
  currentBetSpan.textContent = currentBet;
});

// Deal
dealBtn.addEventListener("click", () => {
  // If no bet was placed, show a message
  if (currentBet <= 0) {
    messageP.textContent = "Please place a bet before dealing!";
    return;
  }

  // Otherwise, start the round
  startNewGame();
});

// Hit
hitBtn.addEventListener("click", () => {
  if (!gameOver) {
    playerHand.push(deck.pop());
    displayHand(playerHand, playerCardsDiv);
    updateScores();
    updateDeckInfo();

    if (getHandValue(playerHand) > 21) {
      gameOver = true;
    }
    checkForEndOfGame();
  }
});

// Stand
standBtn.addEventListener("click", () => {
  if (!gameOver) {
    // Dealer draws until 17 or more
    while (getHandValue(dealerHand) < 17) {
      dealerHand.push(deck.pop());
    }
    displayHand(dealerHand, dealerCardsDiv);
    updateScores();
    updateDeckInfo();
    gameOver = true;
    checkForEndOfGame();
  }
});
