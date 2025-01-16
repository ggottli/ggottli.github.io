// Global game state
let deck = [];
let players = [
  { name: "You", hand: [], tricksWon: 0 },
  { name: "Watson", hand: [], tricksWon: 0 },
  { name: "Shark", hand: [], tricksWon: 0 },
  { name: "Queenpin", hand: [], tricksWon: 0 }
];
let trumpSuit = null;
let currentDealerIndex = 0;
let currentTurnIndex = 1; // the player to the left of the dealer goes first

document.addEventListener('DOMContentLoaded', () => {
  initDeck();
  shuffleDeck();
  dealCards();
  showHands();
  // Start the bidding phase
  showTrumpSelection();
});

/**
 * Initialize a standard 24-card Euchre deck:
 *  9, 10, J, Q, K, A of each suit (♣, ♦, ♥, ♠)
 */
function initDeck() {
  const suits = ['C', 'D', 'H', 'S'];
  const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
  deck = [];
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({ rank, suit });
    });
  });
}

/** Fisher-Yates Shuffle */
function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/** Deal 5 cards to each player */
function dealCards() {
  let cardIndex = 0;
  for (let round = 0; round < 5; round++) {
    for (let p = 0; p < 4; p++) {
      // Get card
      const card = deck[cardIndex];
      players[p].hand.push(card);
      cardIndex++;
    }
  }
  // Remaining top card for "cut card" (potential trump)
  // or leave in deck if you prefer a different approach
}

/** Display each player's hand in the UI */
function showHands() {
  players.forEach((player, index) => {
    const handContainer = document.getElementById(`hand-${positionFromIndex(index)}`);
    handContainer.innerHTML = '';
    player.hand.forEach(card => {
      const cardDiv = document.createElement('div');
      cardDiv.classList.add('card');
      // Use card image from images/ folder
      cardDiv.style.backgroundImage = `url('../images/${card.rank}${card.suit}.png')`;
      handContainer.appendChild(cardDiv);
    });
  });
}

/** Convert index to "bottom", "left", "top", "right" */
function positionFromIndex(i) {
  if (i === 0) return 'bottom';
  if (i === 1) return 'left';
  if (i === 2) return 'top';
  if (i === 3) return 'right';
}

/** Show Trump Selection */
function showTrumpSelection() {
  const trumpModal = document.getElementById('trump-selection');
  trumpModal.style.display = 'block';
}

const passBtn = document.getElementById('pass-btn');
const orderBtn = document.getElementById('order-btn');
const aloneBtn = document.getElementById('alone-btn');

passBtn.addEventListener('click', () => {
  // handle pass logic
  alert("You passed!");
  // Next player's turn to accept or pass, etc.
});

orderBtn.addEventListener('click', () => {
  // handle order up logic
  trumpSuit = determineSuitFromCutCard(); // implement a function that reads the cut card
  alert(`You ordered up trump: ${trumpSuit}`);
  // hide the modal
  document.getElementById('trump-selection').style.display = 'none';
});

aloneBtn.addEventListener('click', () => {
  // handle going alone
  alert("You are going alone!");
  // hide the modal
  document.getElementById('trump-selection').style.display = 'none';
});

function dealCardsWithAnimation() {
  let dealIndex = 0;

  const dealInterval = setInterval(() => {
    if (dealIndex >= 20) { // 5 cards * 4 players
      clearInterval(dealInterval);
      showHands(); // after dealing is done
      return;
    }

    const playerIndex = dealIndex % 4;
    const card = deck[dealIndex];
    players[playerIndex].hand.push(card);

    // Create an animating card
    const animCard = document.createElement('div');
    animCard.classList.add('card');
    animCard.style.backgroundImage = `url('../images/card-back.png')`; // show back as it travels
    animCard.style.position = 'absolute';
    animCard.style.left = '50%';
    animCard.style.top = '50%';

    document.getElementById('game-container').appendChild(animCard);

    // Calculate the target position
    const handEl = document.getElementById(`hand-${positionFromIndex(playerIndex)}`);
    const handRect = handEl.getBoundingClientRect();
    const cardLeft = handRect.left + (handEl.offsetWidth / 2) - 30; // approximate center
    const cardTop = handRect.top + (handEl.offsetHeight / 2) - 45; // approximate center

    // Animate
    animCard.style.transition = 'left 0.5s, top 0.5s';
    setTimeout(() => {
      animCard.style.left = `${cardLeft}px`;
      animCard.style.top = `${cardTop}px`;
    }, 50);

    // After animation finishes
    setTimeout(() => {
      animCard.remove();
      // if we've dealt all cards to a player, they’ll be displayed in showHands()
    }, 600);

    dealIndex++;
  }, 600);
}
