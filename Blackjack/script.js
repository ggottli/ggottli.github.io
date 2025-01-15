// script.js

// -------------------------------------
// Global Variables
// -------------------------------------
let deck = [];
let playerHand = [];
let dealerHand = [];

let totalChips = 2000; // Player starts with 2000 chips
let currentBet = 0;

let gameOver = false;
let dealerRevealed = false; // is dealer's second card revealed?

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
// Deck & Value Functions
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
  
  // Handle Ace as 1 or 11
  if (hasAce && total + 10 <= 21) {
    total += 10;
  }
  return total;
}

// -------------------------------------
// Rendering & Animation
// -------------------------------------

/**
 * Create and return a new card DOM element with the given card data.
 * If 'hidden' is true, show a face-down look.
 */
function createCardElement(card, hidden = false) {
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "deal-animation");

  if (hidden) {
    // Face-down card
    cardDiv.style.backgroundColor = "#333";
    cardDiv.style.color = "#333";
    cardDiv.textContent = "???";
  } else {
    // Face-up card
    cardDiv.innerHTML = `
      <div>${card.value}</div>
      <div class="suit">${card.suit}</div>
    `;
  }
  return cardDiv;
}

/**
 * Display the entire hand in the given container.
 * If 'isDealer' is true and dealerRevealed=false, the second card is hidden.
 */
function displayHand(hand, container, isDealer = false) {
  container.innerHTML = "";

  hand.forEach((card, index) => {
    let hidden = false;
    // Dealer's second card face-down if not revealed
    if (isDealer && index === 1 && !dealerRevealed) {
      hidden = true;
    }

    const cardElement = createCardElement(card, hidden);
    container.appendChild(cardElement);
  });
}

/**
 * Deal a single card from the deck to a target hand & update its container visually.
 * Return a Promise so we can await the delay easily.
 */
function dealOneCard(hand, container, isDealer = false, hideSecondDealerCard = false) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Pop a card off the deck
      const card = deck.pop();

      // If dealer's second card + not revealed -> hidden
      let hidden = false;
      if (isDealer && hand.length === 1 && !dealerRevealed) {
        hidden = true;
      }

      // Create the card DOM element
      const cardElement = createCardElement(card, hidden);

      // Add it to the container
      container.appendChild(cardElement);

      // Add the card to the hand array
      hand.push(card);

      resolve();
    }, 500); // 500ms delay per card
  });
}

/**
 * Update the text of the player's and dealer's score.
 */
function updateScores() {
  // Player
  const playerValue = getHandValue(playerHand);
  playerScoreP.textContent = `Score: ${playerValue}`;

  // Dealer
  if (!dealerRevealed && dealerHand.length > 0) {
    // Show just first card's value if second is hidden
    const firstCardVal = getCardValue(dealerHand[0]);
    // If first card is Ace, it might be 1 or 11, let's display "11+" to hint
    if (dealerHand[0].value === "A") {
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

/**
 * Check if it's the end of the game and handle results/payout.
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
    // Compare totals
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

  // Check if player is broke
  if (totalChips <= 0) {
    messageP.textContent = "You are out of chips! Game Over!";
    disableBetting();
    disableGameplay();
  }
}

/**
 * End the round, but do NOT reset the bet (unless user presses Clear).
 */
function endRound() {
  // Reactivate "Deal" and "Clear"
  dealBtn.disabled = false;
  clearBtn.disabled = false;
  // Disable Hit & Stand
  hitBtn.disabled = true;
  standBtn.disabled = true;
  // Mark game over
  gameOver = true;
}

/**
 * Start a new round (initial deal).
 * If no bet is placed or bet is too big, handle accordingly.
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

  // If deck is low, reshuffle
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

  // Disable deal / clear while round is in progress
  dealBtn.disabled = true;
  clearBtn.disabled = true;

  // Enable Hit / Stand
  hitBtn.disabled = false;
  standBtn.disabled = false;

  // Clear old cards from the DOM
  dealerCardsDiv.innerHTML = "";
  playerCardsDiv.innerHTML = "";

  // Deal initial 2 cards to player, 2 to dealer, with a delay
  await dealOneCard(playerHand, playerCardsDiv, false);
  updateScores();

  await dealOneCard(dealerHand, dealerCardsDiv, true);
  updateScores();

  await dealOneCard(playerHand, playerCardsDiv, false);
  updateScores();

  await dealOneCard(dealerHand, dealerCardsDiv, true);
  updateScores();
}

/**
 * Disable the ability to bet if out of chips.
 */
function disableBetting() {
  chipElements.forEach(chip => {
    chip.style.pointerEvents = "none";
  });
  clearBtn.disabled = true;
  dealBtn.disabled = true;
}

/**
 * Disable Hit/Stand (used if the user is out of chips).
 */
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
    // Only allow if there's enough chips left to cover it
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
    dealerRevealed = true; // Reveal the dealer’s hidden card

    // Dealer draws until 17 or more, with delay for each card
    while (getHandValue(dealerHand) < 17) {
      await dealOneCard(dealerHand, dealerCardsDiv, true);
      updateScores();
    }

    gameOver = true;
    checkForEndOfGame();
  }
});
