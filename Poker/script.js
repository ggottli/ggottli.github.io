// script.js

// Constants for suits and ranks
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// ------------------
// Card & Deck Classes
// ------------------
class Card {
  constructor(suit, rank) {
    this.suit = suit;
    this.rank = rank;
  }
  getValue() {
    const valueMap = {
      "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
      "7": 7, "8": 8, "9": 9, "10": 10,
      "J": 11, "Q": 12, "K": 13, "A": 14
    };
    return valueMap[this.rank];
  }
  toString() {
    return `${this.rank} of ${this.suit}`;
  }
}

class Deck {
  constructor() {
    this.cards = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  deal() {
    return this.cards.pop();
  }
}

// ------------------
// Player and Bot Classes
// ------------------
class Player {
  constructor(name, chips = 1000, isHuman = false) {
    this.name = name;
    this.chips = chips;
    this.isHuman = isHuman;
    this.hand = [];
    this.active = true; // Still in the hand
    this.currentBet = 0;
  }
  resetHand() {
    this.hand = [];
    this.active = true;
    this.currentBet = 0;
  }
}

class Bot extends Player {
  constructor(name, chips, playingStyle) {
    super(name, chips, false);
    this.playingStyle = playingStyle; // Hidden playing style
  }
  decideAction(gameState) {
    // Simple decision logic: uses hand strength from evaluateHand
    let handStrength = evaluateHand(this.hand.concat(gameState.communityCards));
    if (this.playingStyle === "aggressive") {
      if (handStrength > 30 || Math.random() < 0.7) {
        return "raise";
      } else {
        return "call";
      }
    } else if (this.playingStyle === "conservative") {
      if (handStrength > 35) {
        return "raise";
      } else if (handStrength > 20) {
        return "call";
      } else {
        return "fold";
      }
    } else { // random
      const actions = ["call", "raise", "fold"];
      return actions[Math.floor(Math.random() * actions.length)];
    }
  }
}

// ------------------
// Hand Evaluation (Simplified)
// ------------------
function evaluateHand(cards) {
  // A basic evaluator: sums card values and adds bonuses for pairs/triples
  let sum = 0;
  let counts = {};
  for (let card of cards) {
    sum += card.getValue();
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  for (let rank in counts) {
    if (counts[rank] === 2) sum += 10;
    if (counts[rank] === 3) sum += 20;
    if (counts[rank] === 4) sum += 50;
  }
  return sum;
}

// ------------------
// Rendering Helpers for Cards
// ------------------
function renderCard(card) {
  // Create a card face element.
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card");
  // Red color for hearts and diamonds
  if (card.suit === "hearts" || card.suit === "diamonds") {
    cardDiv.classList.add("red");
  }
  const suitSymbols = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠"
  };
  cardDiv.innerHTML = `<div class="card-rank">${card.rank}</div>
                       <div class="card-suit">${suitSymbols[card.suit]}</div>`;
  return cardDiv;
}

function renderCardBack() {
  // Create a card-back element (for hidden cards)
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "card-back");
  cardDiv.innerHTML = "&nbsp;";
  return cardDiv;
}

// ------------------
// Game Engine Object with Betting Rounds
// ------------------
let game = {
  players: [],
  deck: null,
  communityCards: [],
  pot: 0,
  currentBet: 50, // fixed raise amount per betting round
  state: "preflop", // possible states: preflop, flop, turn, river, showdown
  currentPlayerIndex: 0, // index used for the betting round

  // Initialize a new round
  init: function () {
    this.players = [];
    this.communityCards = [];
    this.pot = 0;
    this.deck = new Deck();
    this.deck.shuffle();
    this.state = "preflop";

    // Create one human and eight bots with generic names.
    this.players.push(new Player("You", 1000, true));
    const botStyles = ["aggressive", "conservative", "random"];
    for (let i = 2; i <= 9; i++) {
      let style = botStyles[Math.floor(Math.random() * botStyles.length)];
      this.players.push(new Bot("Player " + i, 1000, style));
    }

    // Reset each player's hand.
    this.players.forEach(p => p.resetHand());

    // Deal two hole cards to each active player.
    for (let i = 0; i < 2; i++) {
      this.players.forEach(p => {
        if (p.active) {
          p.hand.push(this.deck.deal());
        }
      });
    }

    updateUI();
    addMessage("=== New Round: Pre-flop Betting Round ===");
    // Start the first betting round.
    this.startBettingRound();
  },

  // Begin a betting round by resetting the player index.
  startBettingRound: function() {
    this.currentPlayerIndex = 0;
    this.promptNextPlayer();
  },

  // Prompt the next active player (in clockwise order) to act.
  promptNextPlayer: function() {
    // Skip players who are not active.
    while (this.currentPlayerIndex < this.players.length && !this.players[this.currentPlayerIndex].active) {
      this.currentPlayerIndex++;
    }
    if (this.currentPlayerIndex >= this.players.length) {
      // All players have acted; end this betting round.
      this.endBettingRound();
      return;
    }
    let currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.isHuman) {
      addMessage("Your turn. Choose an action.");
      enableActionButtons(true);
    } else {
      // For bots, simulate a brief delay before auto‑deciding.
      enableActionButtons(false);
      setTimeout(() => {
        let decision = currentPlayer.decideAction(this);
        addMessage(`${currentPlayer.name} chooses to ${decision}.`);
        processPlayerDecision(currentPlayer, decision);
        this.currentPlayerIndex++;
        this.promptNextPlayer();
      }, 1000);
    }
  },

  // Process the human player's action.
  processHumanAction: function(decision) {
    let currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isHuman) {
      processPlayerDecision(currentPlayer, decision);
      addMessage(`You choose to ${decision}.`);
      enableActionButtons(false);
      this.currentPlayerIndex++;
      this.promptNextPlayer();
    }
  },

  // End the current betting round and advance the game stage.
  endBettingRound: function() {
    if (this.state === "preflop") {
      // Reveal the Flop (3 cards)
      for (let i = 0; i < 3; i++) {
        this.communityCards.push(this.deck.deal());
      }
      this.state = "flop";
      addMessage("=== Flop Betting Round ===");
    } else if (this.state === "flop") {
      // Reveal the Turn (1 card)
      this.communityCards.push(this.deck.deal());
      this.state = "turn";
      addMessage("=== Turn Betting Round ===");
    } else if (this.state === "turn") {
      // Reveal the River (1 card)
      this.communityCards.push(this.deck.deal());
      this.state = "river";
      addMessage("=== River Betting Round ===");
    } else if (this.state === "river") {
      // Proceed to showdown.
      this.state = "showdown";
      this.showdown();
      return;
    }
    updateUI();
    // Start the next betting round.
    this.startBettingRound();
  },

  // At showdown, reveal all cards and determine the winner.
  showdown: function() {
    updateUI();
    let bestScore = -1;
    let winner = null;
    for (let p of this.players) {
      if (p.active) {
        let fullHand = p.hand.concat(this.communityCards);
        let score = evaluateHand(fullHand);
        addMessage(`${p.name} has a score of ${score}.`);
        if (score > bestScore) {
          bestScore = score;
          winner = p;
        }
      }
    }
    if (winner) {
      winner.chips += this.pot;
      addMessage(`${winner.name} wins the pot of ${this.pot} chips!`);
    } else {
      addMessage("No winner this round.");
    }
    updateUI();
    addMessage("Click the messages area to start a new round.");
  }
};

// Process a player's decision (applies to both human and bots).
function processPlayerDecision(player, decision) {
  if (decision === "fold") {
    player.active = false;
  } else if (decision === "raise") {
    if (player.chips >= game.currentBet) {
      player.chips -= game.currentBet;
      player.currentBet += game.currentBet;
      game.pot += game.currentBet;
    } else {
      addMessage(`${player.name} cannot raise (insufficient chips). Treated as call.`);
    }
  }
  // For a "call," no chip adjustment is needed.
  updateUI();
}

// ------------------
// UI Helper Functions
// ------------------
function updateUI() {
  // Update each player's slot with their info and hand.
  for (let i = 0; i < game.players.length; i++) {
    let player = game.players[i];
    let slot = document.getElementById("player-slot-" + i);
    if (slot) {
      slot.innerHTML = `<strong>${player.name}</strong><br>Chips: ${player.chips}`;
      let handDiv = document.createElement("div");
      handDiv.className = "hand";
      // Show cards face‑up for the human or at showdown.
      if (player.isHuman || game.state === "showdown") {
        player.hand.forEach(card => handDiv.appendChild(renderCard(card)));
      } else {
        // For bots during betting rounds, show card backs.
        if (player.hand.length > 0) {
          handDiv.appendChild(renderCardBack());
          handDiv.appendChild(renderCardBack());
        }
      }
      slot.appendChild(handDiv);
    }
  }
  // Update the community cards (always face‑up).
  const communityDiv = document.getElementById("community-cards");
  communityDiv.innerHTML = "";
  game.communityCards.forEach(card => communityDiv.appendChild(renderCard(card)));
}

function addMessage(msg) {
  const messagesDiv = document.getElementById("messages");
  const p = document.createElement("p");
  p.innerText = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function enableActionButtons(enabled) {
  document.getElementById("btn-call").disabled = !enabled;
  document.getElementById("btn-raise").disabled = !enabled;
  document.getElementById("btn-fold").disabled = !enabled;
}

// ------------------
// Button Event Listeners
// ------------------
document.getElementById("btn-call").addEventListener("click", function () {
  if (game.state !== "showdown") {
    game.processHumanAction("call");
  }
});
document.getElementById("btn-raise").addEventListener("click", function () {
  if (game.state !== "showdown") {
    game.processHumanAction("raise");
  }
});
document.getElementById("btn-fold").addEventListener("click", function () {
  if (game.state !== "showdown") {
    game.processHumanAction("fold");
  }
});

// When clicking the messages area after a round, start a new round.
document.getElementById("messages").addEventListener("click", function () {
  if (game.state === "showdown") {
    game.init();
  }
});

// Start the game on page load.
game.init();
