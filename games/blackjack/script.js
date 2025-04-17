// script.js

// -------------------------------------
// Global Variables
// -------------------------------------
let deck = [];
let playerHand = [];
let dealerHand = [];

let totalChips = 2000; 
let currentBet = 0;

let gameOver = false;
let dealerRevealed = false;

// HTML Elements
const dealerCardsDiv = document.getElementById("dealer-cards");
const dealerScoreP = document.getElementById("dealer-score");
const playerCardsDiv = document.getElementById("player-cards");
const playerScoreP = document.getElementById("player-score");

const totalChipsSpan = document.getElementById("total-chips");
const currentBetSpan = document.getElementById("current-bet");
const messageP = document.getElementById("message");

// Buttons
const clearBtn = document.getElementById("btn-clear");
const dealBtn = document.getElementById("btn-deal");
const hitBtn = document.getElementById("btn-hit");
const standBtn = document.getElementById("btn-stand");

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

function getHandValue(hand) {
  let total = 0;
  let hasAce = false;

  for (let card of hand) {
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

/**
 * Check if a 2-card hand is exactly 21 => "blackjack".
 */
function isBlackjack(hand) {
  return hand.length === 2 && getHandValue(hand) === 21;
}

// -------------------------------------
// Rendering / Animations
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

/**
 * Display the entire hand in the given container.
 */
function displayHand(hand, container, isDealer = false) {
  container.innerHTML = "";
  hand.forEach((card, index) => {
    let hidden = false;

    // If dealer's second card is hidden
    if (isDealer && index === 1 && !dealerRevealed) {
      hidden = true;
    }
    const cardElem = createCardElement(card, hidden);
    container.appendChild(cardElem);
  });
}

function updateScores() {
  const playerValue = getHandValue(playerHand);
  playerScoreP.textContent = `Score: ${playerValue}`;

  if (!dealerRevealed && dealerHand.length > 0) {
    // Show just first card's value if second is hidden
    const firstCardVal = getCardValue(dealerHand[0]);
    if (dealerHand[0].value === "A") {
      // Could show "11+" for an ace
      dealerScoreP.textContent = `Score: 11+`;
    } else {
      dealerScoreP.textContent = `Score: ${firstCardVal}+`;
    }
  } else {
    const dealerValue = getHandValue(dealerHand);
    dealerScoreP.textContent = `Score: ${dealerValue}`;
  }
}

// -------------------------------------
// Game Flow
// -------------------------------------

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
    // Compare
    if (playerValue > dealerValue) {
      messageP.textContent = "You win!";
      totalChips += currentBet;
    } else if (playerValue < dealerValue) {
      messageP.textContent = "Dealer wins!";
      totalChips -= currentBet;
    } else {
      messageP.textContent = "It's a tie!";
      // No chip change
    }
    endRound();
  }

  totalChipsSpan.textContent = totalChips;

  if (totalChips <= 0) {
    messageP.textContent = "You are out of chips! Game Over!";
    disableBetting();
    disableGameplay();
  }
}

function endRound() {
  dealBtn.disabled = false;
  clearBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  gameOver = true;
}

/**
 * Start dealing a new round with initial cards and check for blackjack immediately.
 */
async function startNewGame() {
  // If no bet or bet too large, handle
  if (currentBet <= 0) {
    messageP.textContent = "Please place a bet before dealing!";
    return;
  }
  if (currentBet > totalChips) {
    messageP.textContent = "Your bet exceeds your total chips!";
    return;
  }

  // Reshuffle if deck is low
  if (deck.length < 10) {
    createDeck();
    shuffleDeck();
  }

  // Reset state
  playerHand = [];
  dealerHand = [];
  dealerRevealed = false;
  gameOver = false;
  messageP.textContent = "";

  // UI states
  dealBtn.disabled = true;
  clearBtn.disabled = true;
  hitBtn.disabled = false;
  standBtn.disabled = false;

  // Clear old cards
  dealerCardsDiv.innerHTML = "";
  playerCardsDiv.innerHTML = "";

  // Deal 2 cards to player, 2 cards to dealer
  await dealOneCard(playerHand, playerCardsDiv, false);
  updateScores();

  await dealOneCard(dealerHand, dealerCardsDiv, true);
  updateScores();

  await dealOneCard(playerHand, playerCardsDiv, false);
  updateScores();

  await dealOneCard(dealerHand, dealerCardsDiv, true);
  updateScores();

  // **Check for immediate blackjack** scenarios
  const playerHasBJ = isBlackjack(playerHand);
  const dealerHasBJ = isBlackjack(dealerHand);

  if (playerHasBJ || dealerHasBJ) {
    // Reveal dealer’s card
    dealerRevealed = true;
    displayHand(dealerHand, dealerCardsDiv, true);
    updateScores();

    if (playerHasBJ && dealerHasBJ) {
      // Both have blackjack => push
      messageP.textContent = "Both have blackjack! Push!";
      // no chip change
      endRound();
      return;
    } else if (playerHasBJ && !dealerHasBJ) {
      // Player alone has blackjack => 3:2 payout
      messageP.textContent = "Blackjack! You win 3:2!";
      totalChips += currentBet * 1.5;
      totalChipsSpan.textContent = totalChips;
      endRound();
      return;
    } else if (dealerHasBJ && !playerHasBJ) {
      // Dealer alone has blackjack
      messageP.textContent = "Dealer has blackjack!";
      totalChips -= currentBet;
      totalChipsSpan.textContent = totalChips;
      endRound();
      return;
    }
  }
}

/**
 * Deal a single card from the deck with a small delay & animation.
 */
function dealOneCard(hand, container, isDealer = false) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const card = deck.pop();
      // If it's the dealer's second card (index=1), might be hidden if not revealed
      const hidden = (isDealer && hand.length === 1 && !dealerRevealed);

      const cardElem = createCardElement(card, hidden);
      container.appendChild(cardElem);

      hand.push(card);
      resolve();
    }, 500);
  });
}

/** Disable betting if chips are 0 */
function disableBetting() {
  chipElements.forEach(chip => {
    chip.style.pointerEvents = "none";
  });
  clearBtn.disabled = true;
  dealBtn.disabled = true;
}

/** Disable Hit/Stand */
function disableGameplay() {
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

// -------------------------------------
// Event Listeners
// -------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  createDeck();
  shuffleDeck();
  totalChipsSpan.textContent = totalChips;
  currentBetSpan.textContent = currentBet;
});

// Betting Chips
chipElements.forEach(chip => {
  chip.addEventListener("click", () => {
    const chipValue = parseInt(chip.getAttribute("data-value"));
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
  startNewGame();
});

// Hit
hitBtn.addEventListener("click", () => {
  if (!gameOver) {
    dealOneCard(playerHand, playerCardsDiv, false).then(() => {
      updateScores();
      if (getHandValue(playerHand) > 21) {
        gameOver = true;
      }
      checkForEndOfGame();
    });
  }
});

// Stand
standBtn.addEventListener("click", async () => {
  if (!gameOver) {
    // Reveal dealer's hidden card now
    dealerRevealed = true;
    displayHand(dealerHand, dealerCardsDiv, true);
    updateScores();

    // Dealer draws until 17 or more
    while (getHandValue(dealerHand) < 17) {
      await dealOneCard(dealerHand, dealerCardsDiv, true);
      updateScores();
    }

    gameOver = true;
    checkForEndOfGame();
  }
});
