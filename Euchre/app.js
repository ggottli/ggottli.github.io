// app.js

////////////////////
// Global Game State
////////////////////
const gameState = {
  trumpSuit: null,
  dealerPosition: 0,       // index in [0,1,2,3] for who is dealing
  currentPlayerIndex: 0,   // who’s turn it is to lead a card
  leadSuit: null,          // suit of the first card played in a trick
  trickCards: [],          // array of { playerIndex, card }
  players: [
    { name: 'Shark', hand: [], tricksWon: 0, score: 0 },
    { name: 'Watson', hand: [], tricksWon: 0, score: 0 },
    { name: 'Queenpin', hand: [], tricksWon: 0, score: 0 },
    { name: 'You', hand: [], tricksWon: 0, score: 0 },
  ],
  kitty: [],
  deck: [],
  roundActive: false
};

// For convenience, we’ll define a map from player index to seat name if needed:
const seatIds = ['player-top', 'player-left', 'player-right', 'player-bottom'];

const suits = ['C', 'D', 'H', 'S']; // Clubs, Diamonds, Hearts, Spades
const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];

function buildEuchreDeck() {
  const deck = [];
  for (let s of suits) {
    for (let r of ranks) {
      deck.push({ rank: r, suit: s });
    }
  }
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function dealCards() {
  gameState.deck = shuffle(buildEuchreDeck());

  // Reset hands/tricks
  gameState.players.forEach(p => {
    p.hand = [];
    p.tricksWon = 0;
  });
  gameState.kitty = [];

  // Simple approach: deal 5 each
  let deckIndex = 0;
  for (let i = 0; i < 5; i++) {
    for (let p = 0; p < 4; p++) {
      let player = gameState.players[(gameState.dealerPosition + 1 + p) % 4];
      player.hand.push(gameState.deck[deckIndex]);
      deckIndex++;
    }
  }

  // Then 4 to kitty
  for (let i = 0; i < 4; i++) {
    gameState.kitty.push(gameState.deck[deckIndex]);
    deckIndex++;
  }

  // “Up card” is kitty[0]
  displayUpCard(gameState.kitty[0]);
}

function onPassClicked() {
  alert("You passed!");
  // We’ll let the AI players randomly decide to pick up the up card or not.
  // If no one picks it, we do a “second round” (not fully implemented in this snippet).
  let decided = false;
  for (let i = 0; i < 3; i++) {
    let aiPlayer = gameState.players[(gameState.dealerPosition + 1 + i) % 4];
    // Random chance for them to “order up”:
    if (Math.random() > 0.5) {
      decided = true;
      setTrump(gameState.kitty[0].suit, aiPlayer);
      break;
    }
  }
  if (!decided) {
    // Second round or Force dealer to pick, etc.  
    // We'll just default the second round to pick the next suit in a naive approach:
    let nextSuit = getRandomSuitExcluding(gameState.kitty[0].suit);
    setTrump(nextSuit, gameState.players[gameState.dealerPosition]);
  }
}

function onOrderUpClicked() {
  alert("You ordered up trump!");
  setTrump(gameState.kitty[0].suit, gameState.players[3]); // “You” are index=3
}

function setTrump(suit, orderingPlayer) {
  gameState.trumpSuit = suit;
  // If the ordering player is the dealer, they pick up the up card and discard one
  // For simplicity, skip the discard logic or just pick a random discard
  alert(orderingPlayer.name + " set trump to " + suit);
  // Now we start the round
  startRound();
}

function getRandomSuitExcluding(excludeSuit) {
  const possible = suits.filter(s => s !== excludeSuit);
  return possible[Math.floor(Math.random() * possible.length)];
}

function getCardPower(card, leadSuit, trumpSuit) {
  // Identify Right Bower
  const isRightBower = (card.rank === 'J' && card.suit === trumpSuit);
  
  // Identify Left Bower
  const colorMatches = (trumpSuit === 'S' || trumpSuit === 'C')
    ? (card.suit === 'S' || card.suit === 'C')
    : (card.suit === 'H' || card.suit === 'D');
  const isLeftBower = (card.rank === 'J' && colorMatches && !isRightBower);

  // If it’s the left bower, treat suit as if it’s trump for following suit
  let effectiveSuit = card.suit;
  if (isLeftBower) {
    effectiveSuit = trumpSuit;
  }

  // Determine if this card “follows suit” or is “trump.”
  let isTrump = (effectiveSuit === trumpSuit);

  // Base rank
  // A typical ranking: 9(1), 10(2), J(3), Q(4), K(5), A(6)
  // But we’ll put bower logic on top of that.
  let baseValues = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 };
  let baseValue = baseValues[card.rank] || 0;

  let power = baseValue;

  // Bump up for trump
  if (isTrump) {
    power += 100; // big jump for trump
    if (isRightBower) {
      power += 200; // make Right Bower unstoppable
    } else if (isLeftBower) {
      power += 150; // second unstoppable
    }
  } else if (effectiveSuit === leadSuit) {
    power += 50; // normal following lead suit
  }

  return power;
}

function startRound() {
  // Reset trick wins:
  gameState.players.forEach(p => p.tricksWon = 0);
  gameState.currentPlayerIndex = (gameState.dealerPosition + 1) % 4; // left of dealer leads first
  gameState.roundActive = true;

  // We can now let the first player “lead.” If that’s AI, do it automatically
  if (gameState.currentPlayerIndex !== 3) {
    aiPlayCard();
  } else {
    // Wait for your card selection
    // You’ll need to make your card divs clickable
  }
}

function playCard(playerIndex, cardIndex) {
  const player = gameState.players[playerIndex];
  const card = player.hand[cardIndex];

  // If it’s the first card of the trick:
  if (gameState.trickCards.length === 0) {
    // leadSuit is the card’s “effective suit” if it’s left bower, or normal suit
    if (card.rank === 'J' && isLeftBower(card, gameState.trumpSuit)) {
      // left bower acts like trump for suit, but for leading we can treat it as trump
      gameState.leadSuit = gameState.trumpSuit;
    } else {
      gameState.leadSuit = card.suit;
    }
  }

  // Remove card from hand
  player.hand.splice(cardIndex, 1);

  // Record the play
  gameState.trickCards.push({ playerIndex, card });

  // Visually place the card in the middle of the table...
  displayPlayedCard(playerIndex, card);

  // Next player
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;

  // If we have 4 cards played, that’s the end of the trick
  if (gameState.trickCards.length === 4) {
    concludeTrick();
  } else {
    // If next player is AI, let them play
    if (gameState.currentPlayerIndex !== 3) {
      aiPlayCard();
    }
  }
}

function isLeftBower(card, trump) {
  // If trump is black, left bower is J of the other black suit
  // If trump is red, left bower is J of the other red suit
  // We can reuse logic from getCardPower or simply do direct check:
  if (card.rank !== 'J') return false;
  if ((trump === 'S' || trump === 'C')) {
    return (card.suit === 'S' || card.suit === 'C') && card.suit !== trump;
  } else {
    return (card.suit === 'H' || card.suit === 'D') && card.suit !== trump;
  }
}

function concludeTrick() {
  // Determine winner of the trick
  let winningPlayerIndex = null;
  let winningPower = -1;
  for (let tc of gameState.trickCards) {
    let p = getCardPower(tc.card, gameState.leadSuit, gameState.trumpSuit);
    if (p > winningPower) {
      winningPower = p;
      winningPlayerIndex = tc.playerIndex;
    }
  }

  // Increase that player’s trick count
  gameState.players[winningPlayerIndex].tricksWon++;

  // Clear the trick from the table visually
  clearTrickFromTable();

  // Reset trick info
  gameState.trickCards = [];
  gameState.leadSuit = null;

  // Winner leads next
  gameState.currentPlayerIndex = winningPlayerIndex;

  // If each player’s hand is empty (all 5 tricks done), hand is over
  if (gameState.players[0].hand.length === 0 &&
      gameState.players[1].hand.length === 0 &&
      gameState.players[2].hand.length === 0 &&
      gameState.players[3].hand.length === 0) {
    endHand();
  } else {
    // Next trick
    if (gameState.currentPlayerIndex !== 3) {
      aiPlayCard();
    }
  }
}

function aiPlayCard() {
  const playerIndex = gameState.currentPlayerIndex;
  const player = gameState.players[playerIndex];
  
  // If no trick started or leadSuit is null, pick random from entire hand
  if (!gameState.leadSuit || gameState.trickCards.length === 0) {
    let cardIndex = Math.floor(Math.random() * player.hand.length);
    playCard(playerIndex, cardIndex);
  } else {
    // We have a leadSuit, so see if this AI can follow suit
    let followableCards = [];
    for (let i = 0; i < player.hand.length; i++) {
      let c = player.hand[i];
      let cSuit = isLeftBower(c, gameState.trumpSuit) ? gameState.trumpSuit : c.suit;
      if (cSuit === gameState.leadSuit) {
        followableCards.push(i);
      }
    }
    if (followableCards.length > 0) {
      // choose from the follow suit cards
      let rndIndex = Math.floor(Math.random() * followableCards.length);
      playCard(playerIndex, followableCards[rndIndex]);
    } else {
      // throw off suit or random card
      let cardIndex = Math.floor(Math.random() * player.hand.length);
      playCard(playerIndex, cardIndex);
    }
  }
}

function endHand() {
  // Example partnership: (0,2) vs. (1,3)
  // If the trump-caller is in 0 or 2, that team is makerTeam.
  // If the trump-caller is in 1 or 3, that team is defenderTeam, etc.
  // Let’s store the ordering player's index in gameState for clarity.
  
  // Count up the tricks for each team
  let team0Tricks = gameState.players[0].tricksWon + gameState.players[2].tricksWon;
  let team1Tricks = gameState.players[1].tricksWon + gameState.players[3].tricksWon;

  let makerTeam = [0,2]; // just an example
  /* check if the trump-caller is index=1 or 3 */
  if (true) {
    makerTeam = [1,3];
  }

  // Summarize maker team’s trick count:
  let makerTricks = makerTeam.includes(0) ? team0Tricks : team1Tricks;
  let defenderTricks = 5 - makerTricks; // total of 5 in a euchre hand

  let makerTeamScoreAdd = 0;
  let defenderTeamScoreAdd = 0;

  // Basic scoring logic
  if (makerTricks >= 3 && makerTricks < 5) {
    makerTeamScoreAdd = 1;
  } else if (makerTricks === 5) {
    makerTeamScoreAdd = 2;
  } else {
    // The makers got “euchred”
    defenderTeamScoreAdd = 2;
  }

  // Update the actual gameState scores
  if (makerTeam.includes(0)) {
    // team (0,2) is maker
    gameState.players[0].score += makerTeamScoreAdd;
    gameState.players[2].score += makerTeamScoreAdd;
    gameState.players[1].score += defenderTeamScoreAdd;
    gameState.players[3].score += defenderTeamScoreAdd;
  } else {
    // team (1,3) is maker
    gameState.players[1].score += makerTeamScoreAdd;
    gameState.players[3].score += makerTeamScoreAdd;
    gameState.players[0].score += defenderTeamScoreAdd;
    gameState.players[2].score += defenderTeamScoreAdd;
  }

  // Update scoreboard visually
  updateScoreboard();

  // Move dealer position and start next hand or check if game is over
  gameState.dealerPosition = (gameState.dealerPosition + 1) % 4;
  checkForGameEnd();

  // Start new hand
  dealCards();
  // prompt for trump again, etc.
}

function updateScoreboard() {
  // For example, if each seat’s .score <span> is under #player-top, #player-left, etc.
  for (let i = 0; i < 4; i++) {
    let seatDiv = document.getElementById(seatIds[i]);
    let scoreSpan = seatDiv.querySelector('.score');
    scoreSpan.textContent = gameState.players[i].score;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Hook up your buttons
  document.getElementById('btn-pass').addEventListener('click', onPassClicked);
  document.getElementById('btn-orderup').addEventListener('click', onOrderUpClicked);
  document.getElementById('btn-not-alone').addEventListener('click', () => {
    alert("Not alone! (We'll implement that logic later)");
  });

  // Deal initial hand
  dealCards();
  // Wait for user to choose pass/order, etc.
});

function showYourHand() {
  const yourHandDiv = document.getElementById('your-hand');
  yourHandDiv.innerHTML = '';

  let yourHand = gameState.players[3].hand;
  yourHand.forEach((card, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card');
    cardDiv.style.backgroundImage = `url('images/${card.suit}${card.rank}.png')`;
    // On click
    cardDiv.addEventListener('click', () => {
      // Make sure it’s your turn
      if (gameState.currentPlayerIndex === 3 && gameState.roundActive) {
        // Check if it’s a legal card (follow suit if you have it, etc.)
        if (isCardLegalToPlay(3, index)) {
          playCard(3, index);
        } else {
          alert("You must follow suit if possible!");
        }
      }
    });
    yourHandDiv.appendChild(cardDiv);
  });
}

function isCardLegalToPlay(playerIndex, cardIndex) {
  // If no lead suit yet, any card is legal
  if (!gameState.leadSuit || gameState.trickCards.length === 0) return true;

  // Otherwise, check if the card matches lead suit (or left bower -> trump)  
  // If the player has at least one card that follows suit, they must use it
  const player = gameState.players[playerIndex];
  const cardToPlay = player.hand[cardIndex];
  const cSuit = isLeftBower(cardToPlay, gameState.trumpSuit)
    ? gameState.trumpSuit
    : cardToPlay.suit;

  if (cSuit === gameState.leadSuit) {
    return true; // it follows suit
  } else {
    // See if they actually have a card that can follow suit
    for (let c of player.hand) {
      let cS = isLeftBower(c, gameState.trumpSuit) ? gameState.trumpSuit : c.suit;
      if (cS === gameState.leadSuit) {
        return false; // they do have a suit card, so they must follow
      }
    }
    // If they have no cards of the lead suit, it's legal to throw anything
    return true;
  }
}
