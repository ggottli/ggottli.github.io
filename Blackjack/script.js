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
let dealerRevealed = false; // Tracks if dealer’s hidden card is revealed yet

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

// Betting chips
const chipElements = document.querySelectorAll(".chip");

// -------------------------------------
// Functions
// -------------------------------------

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

function shuffleDeck() {
  for (let i = 0; i < deck.length; i++) {
    let swapIdx = Math.floor(Math.random() * deck.length);
    [deck[i], deck[swapIdx]] = [deck[swapIdx], deck[i]];
  }
}

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
 * Display the player's hand normally, but display the dealer's second card face-down if dealerRevealed is false.
 */
function displayHand(hand, container, isDealer = false) {
  container.innerHTML = "";
  hand.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");

    // If this is the dealer's second card and we have not revealed it yet, show a "face-down" card
    if (isDealer && index === 1 && !dealerRevealed) {
      // Face-down card
      cardDiv.style.backgroundColor = "#333";
      cardDiv.style.color = "#333";
      cardDiv.textContent = "???";
    } else {
      // Normal face-up card
      cardDiv.innerHTML = `
        <div>${card.value}</div>
        <div class="suit">${card.suit}</div>
      `;
    }
    container.appendChild(cardDiv);
  });
}

function updateScores() {
  // If dealer card is not revealed, only show the first card's value
  if (!dealerRevealed) {
    // show partial dealer score
    if (dealerHand.length > 0) {
      const firstCardValue = getCardValue(dealerHand[0]);
      const showValue = (dealerHand[0].value === "A") ? 11 : firstCardValue; 
      dealerScoreP.textContent = `Score: ${showValue}+`;
    } else {
      dealerScoreP.textContent = "Score: 0";
    }
  } else {
    dealerScoreP.textContent = `Score: ${getHandValue(dealerHand)}`;
  }

  // Player score always face-up
  playerScoreP.textContent = `Score: ${getHandValue(playerHand)}`;
}

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

function endRound() {
  dealBtn.disabled = false;
  clearBtn.disabled = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  currentBet = 0;
  currentBetSpan.textContent = currentBet;
  gameOver = true;
}

function startNewGame() {
  // If deck is low, reshuffle
  if (deck.length < 10) {
    createDeck();
    shuffleDeck();
  }

  // Clear old state
  playerHand = [];
  dealerHand = [];
  gameOver = false;
  dealerRevealed = false;
  messageP.textContent = "";

  // Deal initial cards
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());

  // Show them
  displayHand(dealerHand, dealerCardsDiv, true);   // Dealer with hidden second card
  displayHand(playerHand, playerCardsDiv, false);  // Player face-up
  updateScores();

  // Gameplay buttons active
  hitBtn.disabled = false;
  standBtn.disabled = false;
  // Bet controls disabled
  dealBtn.disabled = true;
  clearBtn.disabled = true;
}

/** Disable betting area if out of chips */
function disableBetting() {
  chipElements.forEach(chip => {
    chip.style.pointerEvents = "none";
  });
  clearBtn.disabled = true;
  dealBtn.disabled = true;
}

/** Disable Hit/Stand. */
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
  if (currentBet <= 0) {
    messageP.textContent = "Please place a bet before dealing!";
    return;
  }
  startNewGame();
});

// Hit
hitBtn.addEventListener("click", () => {
  if (!gameOver) {
    playerHand.push(deck.pop());
    displayHand(playerHand, playerCardsDiv, false);
    updateScores();

    if (getHandValue(playerHand) > 21) {
      gameOver = true;
    }
    checkForEndOfGame();
  }
});

// Stand
standBtn.addEventListener("click", () => {
  if (!gameOver) {
    // Reveal dealer's second card
    dealerRevealed = true;

    // Dealer draws until 17 or more
    while (getHandValue(dealerHand) < 17) {
      dealerHand.push(deck.pop());
    }

    // Update displays
    displayHand(dealerHand, dealerCardsDiv, true);
    updateScores();

    gameOver = true;
    checkForEndOfGame();
  }
});
