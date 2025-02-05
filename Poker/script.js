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
  // This is a very basic evaluator: it sums the card values and adds bonuses for pairs.
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
    
    // Create one human player and three bots with different styles
    this.players.push(new Player("You", 1000, true));
    this.players.push(new Bot("Bot Aggro", 1000, "aggressive"));
    this.players.push(new Bot("Bot Cautious", 1000, "conservative"));
    this.players.push(new Bot("Bot Random", 1000, "random"));
    
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
    
    // Clear any previous community cards
    this.communityCards = [];
    this.roundInProgress = true;
    updateUI();
    addMessage("New round started. Choose your action!");
    // Now the game will wait for your input via the buttons.
  },
  
  // Process the human player’s action then process the bots’ responses
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
      // For this simplified game, the call action doesn’t change the bet (ante already paid)
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
          // They already ante’d, so no extra chips needed
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
  
  // Complete the round: deal community cards, evaluate hands, award the pot.
  completeRound: function () {
    // For simplicity, deal all five community cards at once
    while (this.communityCards.length < 5) {
      this.communityCards.push(this.deck.deal());
    }
    updateUI();
    
    // Evaluate hands for each active player (human and bots)
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
    
    this.roundInProgress = false;
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
  // Update players’ info and community cards on the page.
  const playerInfoDiv = document.getElementById("player-info");
  const botInfoDiv = document.getElementById("bot-info");
  const communityDiv = document.getElementById("community-cards");
  
  playerInfoDiv.innerHTML = "<h2>Your Info</h2>";
  botInfoDiv.innerHTML = "<h2>Opponents</h2>";
  communityDiv.innerHTML = "";
  
  game.players.forEach(p => {
    let info = document.createElement("div");
    info.className = "player";
    info.innerHTML = `<strong>${p.name}</strong> - Chips: ${p.chips}`;
    if (p.isHuman) {
      info.innerHTML += "<br>Hand: " + p.hand.map(c => c.toString()).join(", ");
      playerInfoDiv.appendChild(info);
    } else {
      botInfoDiv.appendChild(info);
    }
  });
  
  if (game.communityCards.length > 0) {
    communityDiv.innerHTML =
      "<strong>Community Cards:</strong> " +
      game.communityCards.map(c => c.toString()).join(", ");
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

// Create a Start New Round button dynamically
const startButton = document.createElement("button");
startButton.innerText = "Start New Round";
startButton.addEventListener("click", function () {
  if (!game.roundInProgress) {
    game.init();
  }
});
document.getElementById("actions").appendChild(startButton);

// ------------------
// Start the Game on Page Load
// ------------------
game.init();
