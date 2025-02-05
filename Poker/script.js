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
      "2": 2,  "3": 3,  "4": 4,  "5": 5,  "6": 6,
      "7": 7,  "8": 8,  "9": 9,  "10": 10, "J": 11,
      "Q": 12, "K": 13, "A": 14
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
    this.active = true; // Active in the current round
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
    this.playingStyle = playingStyle; // e.g. "aggressive", "conservative", "random"
  }
  decideAction(gameState) {
    // Simple decision logic based on the bot’s playing style and (simplified) hand strength
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
      // "random" style: choose randomly among actions
      const actions = ["call", "raise", "fold"];
      return actions[Math.floor(Math.random() * actions.length)];
    }
  }
}

// ------------------
// Hand Evaluation (Simplified)
// ------------------
function evaluateHand(cards) {
  // This is a basic evaluator: it sums the card values and adds bonuses for pairs.
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
  // Creates a card face element.
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card");
  // Color red for hearts and diamonds
  if (card.suit === "hearts" || card.suit === "diamonds") {
    cardDiv.classList.add("red");
  }
  // Map suit names to Unicode symbols
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
  // Creates a card-back element (for hidden cards)
  let cardDiv = document.createElement("div");
  cardDiv.classList.add("card", "card-back");
  // Optionally, you can add a pattern or text here.
  cardDiv.innerHTML = "&nbsp;";
  return cardDiv;
}

// ------------------
// Game Engine Object
// ------------------
let game = {
  players: [],
  deck: null,
  communityCards: [],
  pot: 0,
  currentBet: 50, // Fixed bet amount for simplicity
  roundInProgress: false,
  
  // Initialize a new round
  init: function () {
    this.players = [];
    this.communityCards = [];
    this.pot = 0;
    this.deck = new Deck();
    this.deck.shuffle();
    
    // Create one human player and eight bots (generic names)
    this.players.push(new Player("You", 1000, true));
    const botStyles = ["aggressive", "conservative", "random"];
    for (let i = 2; i <= 9; i++) {
      let style = botStyles[Math.floor(Math.random() * botStyles.length)];
      this.players.push(new Bot("Player " + i, 1000, style));
    }
    
    // Reset each player’s hand and mark them active
    this.players.forEach(p => p.resetHand());
    
    // Each player “antes” a fixed bet
    this.players.forEach(p => {
      if (p.chips >= this.currentBet) {
        p.chips -= this.currentBet;
        p.currentBet = this.currentBet;
        this.pot += this.currentBet;
      } else {
        p.active = false;
      }
    });
    
    // Deal two cards to each active player
    for (let i = 0; i < 2; i++) {
      for (let p of this.players) {
        if (p.active) {
          p.hand.push(this.deck.deal());
        }
      }
    }
    
    this.roundInProgress = true;
    updateUI();
    addMessage("New round started. Choose your action!");
  },
  
  // Process the human player’s action and then process bots’ actions
  playerAction: function (action) {
    let human = this.players.find(p => p.isHuman);
    if (!human || !human.active) {
      addMessage("You are not active in this round.");
      return;
    }
    
    if (action === "fold") {
      human.active = false;
      addMessage("You folded.");
    } else if (action === "call") {
      addMessage("You called.");
      // In this simplified game, call does not change the bet (ante already paid)
    } else if (action === "raise") {
      let raiseAmount = this.currentBet; // fixed raise amount
      if (human.chips >= raiseAmount) {
        human.chips -= raiseAmount;
        human.currentBet += raiseAmount;
        this.pot += raiseAmount;
        addMessage("You raised!");
      } else {
        addMessage("Not enough chips to raise.");
        return;
      }
    }
    
    // Let each bot decide and act
    for (let p of this.players) {
      if (!p.isHuman && p.active) {
        let decision = p.decideAction(this);
        if (decision === "fold") {
          p.active = false;
          addMessage(`${p.name} folds.`);
        } else if (decision === "call") {
          addMessage(`${p.name} calls.`);
        } else if (decision === "raise") {
          let raiseAmount = this.currentBet;
          if (p.chips >= raiseAmount) {
            p.chips -= raiseAmount;
            p.currentBet += raiseAmount;
            this.pot += raiseAmount;
            addMessage(`${p.name} raises!`);
          } else {
            addMessage(`${p.name} wanted to raise but didn’t have enough chips.`);
          }
        }
      }
    }
    
    // Complete the round by dealing community cards and determining a winner
    this.completeRound();
  },
  
  // Complete the round: deal community cards, evaluate hands, and award the pot.
  completeRound: function () {
    // Deal all five community cards
    while (this.communityCards.length < 5) {
      this.communityCards.push(this.deck.deal());
    }
    this.roundInProgress = false;
    updateUI();
    
    // Evaluate hands for each active player
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
    
    // Eliminate players with 0 chips
    this.players = this.players.filter(p => p.chips > 0);
    if (this.players.length <= 1) {
      addMessage("Game over!");
    } else {
      addMessage("Click 'Start New Round' to continue.");
    }
  }
};

// ------------------
// UI Helper Functions
// ------------------
function updateUI() {
  // Update each player slot on the table
  for (let i = 0; i < game.players.length; i++) {
    let player = game.players[i];
    let slot = document.getElementById("player-slot-" + i);
    slot.innerHTML = `<strong>${player.name}</strong><br>Chips: ${player.chips}`;
    
    // Create a div to hold the player's cards
    let handDiv = document.createElement("div");
    handDiv.className = "hand";
    
    // Show your cards face up always; for bots, show card backs if the round is in progress.
    if (player.isHuman || !game.roundInProgress) {
      player.hand.forEach(card => {
        handDiv.appendChild(renderCard(card));
      });
    } else {
      // For bots, show hidden cards (card backs) while the round is active.
      if (player.hand.length > 0) {
        handDiv.appendChild(renderCardBack());
        handDiv.appendChild(renderCardBack());
      }
    }
    slot.appendChild(handDiv);
  }
  
  // Update community cards at center of the table
  const communityDiv = document.getElementById("community-cards");
  communityDiv.innerHTML = "";
  if (game.communityCards.length > 0) {
    game.communityCards.forEach(card => {
      communityDiv.appendChild(renderCard(card));
    });
  }
}

function addMessage(msg) {
  const messagesDiv = document.getElementById("messages");
  const p = document.createElement("p");
  p.innerText = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ------------------
// Button Event Listeners
// ------------------
document.getElementById("btn-call").addEventListener("click", function () {
  if (game.roundInProgress) {
    game.playerAction("call");
  }
});
document.getElementById("btn-raise").addEventListener("click", function () {
  if (game.roundInProgress) {
    game.playerAction("raise");
  }
});
document.getElementById("btn-fold").addEventListener("click", function () {
  if (game.roundInProgress) {
    game.playerAction("fold");
  }
});

// Start a new round when the user clicks on the "Start New Round" message.
document.getElementById("messages").addEventListener("click", function () {
  if (!game.roundInProgress && game.players.length > 1) {
    game.init();
  }
});

// ------------------
// Start the Game on Page Load
// ------------------
game.init();
