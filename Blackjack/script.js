// Script.js

// ---------------------
// Global Variables
// ---------------------
let deck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;

// HTML elements
const dealerCardsDiv = document.getElementById("dealer-cards");
const dealerScoreP = document.getElementById("dealer-score");
const playerCardsDiv = document.getElementById("player-cards");
const playerScoreP = document.getElementById("player-score");
const messageP = document.getElementById("message");

const dealBtn = document.getElementById("btn-deal");
const hitBtn = document.getElementById("btn-hit");
const standBtn = document.getElementById("btn-stand");

// ---------------------
// Utility Functions
// ---------------------
function createDeck() {
  // Clears the deck, then creates a new one
  deck = [];
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [
    "A", "2", "3", "4", "5",
    "6", "7", "8", "9", "10",
    "J", "Q", "K"
  ];

  for (let suit of suits) {
    for (let value of values) {
      deck.push({ value, suit });
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
    // Handle A later, as 1 or 11
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

  // If there's an Ace and it won't bust, add 10
  if (hasAce && total + 10 <= 21) {
    total += 10;
  }
  return total;
}

function displayHand(hand, element) {
  // Clear existing cards
  element.innerHTML = "";

  // Show each card in the hand
  for (let card of hand) {
    let cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.innerHTML = `
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
    element.appendChild(cardDiv);
  }
}

function updateScores() {
  const playerValue = getHandValue(playerHand);
  const dealerValue = getHandValue(dealerHand);
  playerScoreP.textContent = `Score: ${playerValue}`;
  dealerScoreP.textContent = `Score: ${dealerValue}`;
}

function checkForEndOfGame() {
  const playerValue = getHandValue(playerHand);
  const dealerValue = getHandValue(dealerHand);

  if (playerValue > 21) {
    messageP.textContent = "You busted! Dealer wins!";
    gameOver = true;
  } else if (dealerValue > 21) {
    messageP.textContent = "Dealer busted! You win!";
    gameOver = true;
  } else if (gameOver) {
    // This means dealer finished drawing
    if (playerValue > dealerValue) {
      messageP.textContent = "You win!";
    } else if (playerValue < dealerValue) {
      messageP.textContent = "Dealer wins!";
    } else {
      messageP.textContent = "It's a tie!";
    }
  }

  // Disable buttons if game is over
  if (gameOver) {
    dealBtn.disabled = false;   // Let the user play again
    hitBtn.disabled = true;
    standBtn.disabled = true;
  }
}

// ---------------------
// Button Actions
// ---------------------
dealBtn.addEventListener("click", () => {
  startNewGame();
});

hitBtn.addEventListener("click", () => {
  if (!gameOver) {
    playerHand.push(deck.pop());
    displayHand(playerHand, playerCardsDiv);
    updateScores();
    if (getHandValue(playerHand) > 21) {
      gameOver = true;
    }
    checkForEndOfGame();
  }
});

standBtn.addEventListener("click", () => {
  if (!gameOver) {
    // Dealer's turn
    while (getHandValue(dealerHand) < 17) {
      dealerHand.push(deck.pop());
    }
    displayHand(dealerHand, dealerCardsDiv);
    gameOver = true;
    updateScores();
    checkForEndOfGame();
  }
});

// ---------------------
// Start the Game
// ---------------------
function startNewGame() {
  createDeck();
  shuffleDeck();

  // Clear existing data
  playerHand = [];
  dealerHand = [];
  gameOver = false;
  messageP.textContent = "";

  // Deal initial cards
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());
  playerHand.push(deck.pop());
  dealerHand.push(deck.pop());

  // Display
  displayHand(playerHand, playerCardsDiv);
  displayHand(dealerHand, dealerCardsDiv);
  updateScores();

  // Disable/enable appropriate buttons
  dealBtn.disabled = true;
  hitBtn.disabled = false;
  standBtn.disabled = false;
}
