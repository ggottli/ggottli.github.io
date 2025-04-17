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
    this.active = true; // still in the current hand
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
    this.playingStyle = playingStyle; // hidden playing style
  }
  decideAction(gameState) {
    // Basic decision logic based on hand strength.
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
    } else {
      const actions = ["call", "raise", "fold"];
      return actions[Math.floor(Math.random() * actions.length)];
    }
  }
}

// ------------------
// Hand Evaluation (Simplified)
// ------------------
function evaluateHand(cards) {
  // Basic evaluator: sum card values and add bonus for pairs/triples.
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
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card");
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
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "card-back");
  cardDiv.innerHTML = "&nbsp;";
  return cardDiv;
}

// ------------------
// Animate Fold: When a player folds, animate the hand disappearing
// ------------------
function animateFold(playerIndex, callback) {
  let slot = document.getElementById("player-slot-" + playerIndex);
  if (slot) {
    let handDiv = slot.querySelector(".hand");
    if (handDiv) {
      handDiv.classList.add("folded");
      // After the animation (800ms), call the callback.
      setTimeout(() => {
        callback();
      }, 800);
    } else {
      callback();
    }
  } else {
    callback();
  }
}

// ------------------
// Game Engine Object with Betting Rounds
// ------------------
let game = {
  players: [],
  deck: null,
  communityCards: [],
  pot: 0,
  currentBet: 50,   // initial bet amount
  highestBet: 50,   // tracks the current highest bet in this round
  state: "preflop", // states: preflop, flop, turn, river, showdown
  currentPlayerIndex: 0, // index for betting order

  init: function () {
    this.players = [];
    this.communityCards = [];
    this.pot = 0;
    this.deck = new Deck();
    this.deck.shuffle();
    this.state = "preflop";
    this.highestBet = 50;

    // Create one human and eight bots with generic names.
    this.players.push(new Player("You", 1000, true));
    const botStyles = ["aggressive", "conservative", "random"];
    for (let i = 2; i <= 9; i++) {
      let style = botStyles[Math.floor(Math.random() * botStyles.length)];
      this.players.push(new Bot("Player " + i, 1000, style));
    }
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
    this.startBettingRound();
  },

  startBettingRound: function() {
    this.currentPlayerIndex = 0;
    this.promptNextPlayer();
  },

  promptNextPlayer: function() {
    // Skip players who are not active.
    while (this.currentPlayerIndex < this.players.length && !this.players[this.currentPlayerIndex].active) {
      this.currentPlayerIndex++;
    }
    if (this.currentPlayerIndex >= this.players.length) {
      this.endBettingRound();
      return;
    }
    let currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.isHuman) {
      let requiredCall = this.highestBet - currentPlayer.currentBet;
      addMessage(`Your turn. You need to call ${requiredCall} chips.`);
      enableActionButtons(true);
    } else {
      enableActionButtons(false);
      let idx = this.currentPlayerIndex;
      setTimeout(() => {
        let decision = currentPlayer.decideAction(this);
        addMessage(`${currentPlayer.name} chooses to ${decision}.`);
        processPlayerDecision(currentPlayer, decision, idx);
        this.currentPlayerIndex++;
        this.promptNextPlayer();
      }, 1000);
    }
  },

  processHumanAction: function(decision) {
    let currentPlayer = this.players[this.currentPlayerIndex];
    let idx = this.currentPlayerIndex;
    if (decision === "raise") {
      let requiredCall = this.highestBet - currentPlayer.currentBet;
      let minRaise = requiredCall + 10; // For example, minimum raise is call amount + 10.
      addMessage(`You need to call ${requiredCall} chips. Minimum raise is ${minRaise} chips.`);
      let input = prompt(`Enter raise amount (minimum ${minRaise}):`);
      let raiseAmount = parseInt(input);
      if (isNaN(raiseAmount)) {
        addMessage("Invalid raise amount. Treated as call.");
        decision = "call";
      } else {
        processPlayerDecision(currentPlayer, decision, idx, raiseAmount);
      }
    } else {
      processPlayerDecision(currentPlayer, decision, idx);
    }
    addMessage(`You choose to ${decision}.`);
    enableActionButtons(false);
    this.currentPlayerIndex++;
    this.promptNextPlayer();
  },

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
    this.startBettingRound();
  },

  showdown: function() {
    updateUI();
    let bestScore = -1;
    let winner = null;
    this.players.forEach(p => {
      if (p.active) {
        let fullHand = p.hand.concat(this.communityCards);
        let score = evaluateHand(fullHand);
        addMessage(`${p.name} has a score of ${score}.`);
        if (score > bestScore) {
          bestScore = score;
          winner = p;
        }
      }
    });
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

// ------------------
// Process a Player's Decision
// ------------------
function processPlayerDecision(player, decision, playerIndex, raiseAmount) {
  if (decision === "fold") {
    // Animate fold then mark the player inactive.
    animateFold(playerIndex, () => {
      updateUI();
    });
    player.active = false;
  } else if (decision === "call") {
    let requiredCall = game.highestBet - player.currentBet;
    if (requiredCall > 0) {
      if (player.chips >= requiredCall) {
        player.chips -= requiredCall;
        player.currentBet += requiredCall;
        game.pot += requiredCall;
      } else {
        addMessage(`${player.name} doesn't have enough chips to call. Folding.`);
        animateFold(playerIndex, () => {
          updateUI();
        });
        player.active = false;
      }
    }
  } else if (decision === "raise") {
    let requiredCall = game.highestBet - player.currentBet;
    if (player.isHuman) {
      if (!raiseAmount || isNaN(raiseAmount)) {
        addMessage("Invalid raise amount. Treated as call.");
        decision = "call";
        processPlayerDecision(player, decision, playerIndex);
        return;
      }
      let minRaise = requiredCall + 10;
      if (raiseAmount < minRaise) {
        addMessage(`Raise must be at least ${minRaise} chips. Treated as call.`);
        decision = "call";
        processPlayerDecision(player, decision, playerIndex);
        return;
      }
      if (player.chips >= raiseAmount) {
        player.chips -= raiseAmount;
        player.currentBet += raiseAmount;
        game.pot += raiseAmount;
        if (player.currentBet > game.highestBet) {
          game.highestBet = player.currentBet;
        }
      } else {
        addMessage("Not enough chips to raise that amount. Treated as call.");
        decision = "call";
        processPlayerDecision(player, decision, playerIndex);
        return;
      }
    } else {
      // For bots, use a fixed raise: requiredCall + 10.
      let botRaise = requiredCall + 10;
      if (player.chips >= botRaise) {
        player.chips -= botRaise;
        player.currentBet += botRaise;
        game.pot += botRaise;
        if (player.currentBet > game.highestBet) {
          game.highestBet = player.currentBet;
        }
      } else {
        let callAmt = requiredCall;
        if (player.chips >= callAmt) {
          player.chips -= callAmt;
          player.currentBet += callAmt;
          game.pot += callAmt;
        } else {
          addMessage(`${player.name} cannot raise and folds.`);
          animateFold(playerIndex, () => {
            updateUI();
          });
          player.active = false;
        }
      }
    }
  }
  updateUI();
}

// ------------------
// UI Helper Functions
// ------------------
function updateUI() {
  // Update each player's slot.
  for (let i = 0; i < game.players.length; i++) {
    let player = game.players[i];
    let slot = document.getElementById("player-slot-" + i);
    if (slot) {
      if (!player.active) {
        slot.innerHTML = `<strong>${player.name}</strong><br>Folded`;
      } else {
        slot.innerHTML = `<strong>${player.name}</strong><br>Chips: ${player.chips}`;
        let handDiv = document.createElement("div");
        handDiv.className = "hand";
        // Show cards face‑up for human or at showdown; for bots during betting rounds, show card backs.
        if (player.isHuman || game.state === "showdown") {
          player.hand.forEach(card => handDiv.appendChild(renderCard(card)));
        } else {
          if (player.hand.length > 0) {
            handDiv.appendChild(renderCardBack());
            handDiv.appendChild(renderCardBack());
          }
        }
        slot.appendChild(handDiv);
      }
    }
  }
  // Update community cards (always face‑up).
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

// Start a new round on messages click after showdown.
document.getElementById("messages").addEventListener("click", function () {
  if (game.state === "showdown") {
    game.init();
  }
});

// Start the game on page load.
game.init();
