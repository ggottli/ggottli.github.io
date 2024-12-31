/*****************
 * Global Variables
 *****************/
let deck = [];
let playerHand = [];
let opponentHands = [[], [], []]; // Opponent1, Opponent2, Opponent3

let trumpSuit = null;
let currentDealer = 0;     // Keep track of who is dealing (0=You, 1=Opp1, 2=Opp2, 3=Opp3)
let currentPlayer = 1;     // The first player to act (left of dealer) after dealing
let team1Score = 0;
let team2Score = 0;

let tricksPlayed = 0;
let tricksWonByTeam1 = 0;
let tricksWonByTeam2 = 0;

/*******************
 * Initialization
 *******************/
window.addEventListener("load", () => {
  createDeck();
  shuffleDeck(deck);
  startNewRound();
});

/*******************
 * Create the Euchre Deck (24 cards)
 *******************/
function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["9", "10", "J", "Q", "K", "A"];
  deck = [];
  for (let s of suits) {
    for (let r of ranks) {
      deck.push({ rank: r, suit: s });
    }
  }
}

/*********************
 * Shuffle the Deck
 *********************/
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/***********************
 * Start a New Round
 ***********************/
function startNewRound() {
  // Reset
  playerHand = [];
  opponentHands = [[], [], []];
  trumpSuit = null;
  tricksPlayed = 0;
  tricksWonByTeam1 = 0;
  tricksWonByTeam2 = 0;

  // Shuffle
  shuffleDeck(deck);

  // Deal 5 cards each (Euchre style typically 2-3 or 3-2, but we'll keep it simple)
  for (let i = 0; i < 5; i++) {
    // Player is seat 0
    playerHand.push(deck.pop());
    // Opponents
    for (let opp = 0; opp < 3; opp++) {
      opponentHands[opp].push(deck.pop());
    }
  }

  // Turn-up card (for bidding)
  const turnUpCard = deck.pop();

  // Render hands (face up for player, face down for opponents)
  renderHands();

  // Start the bidding phase
  doBiddingPhase(turnUpCard);
}

/****************************
 * Bidding Logic
 ****************************/
function doBiddingPhase(turnUpCard) {
  // Show turn-up card in UI
  const biddingArea = document.getElementById("bidding-area");
  biddingArea.innerHTML = `
    <div>Turn-up Card: ${turnUpCard.rank}${turnUpCard.suit}</div>
  `;

  // Let each player (in turn) decide whether to call trump or pass
  // We'll start with player to the left of the dealer
  let firstToAct = (currentDealer + 1) % 4;
  let hasChosenTrump = false;
  let chosenSuit = null;

  // We’ll do a single pass around the table for simplicity
  let passCount = 0;

  for (let i = 0; i < 4; i++) {
    let p = (firstToAct + i) % 4;
    if (p === 0) {
      // Human player's decision
      // Simple approach: confirm box
      let wantsTrump = confirm(
        `Do you want to make ${turnUpCard.suit} trump? (OK = Yes, Cancel = No)`
      );
      if (wantsTrump) {
        chosenSuit = turnUpCard.suit;
        hasChosenTrump = true;
        break;
      } else {
        passCount++;
      }
    } else {
      // AI's decision
      // Evaluate if calling the turnUpCard.suit is beneficial
      let aiHand = opponentHands[p - 1]; // p-1 because opponentHands[0] = Opp1
      let strength = calcTrumpStrength(aiHand, turnUpCard.suit);
      // If AI hand is strong enough, call trump
      if (strength >= 7) {
        chosenSuit = turnUpCard.suit;
        hasChosenTrump = true;
        console.log(`Opponent ${p} calls trump suit = ${chosenSuit} (score=${strength})`);
        break;
      } else {
        passCount++;
      }
    }
  }

  // If everyone passes in this simplified approach, we choose a random trump
  // In real Euchre, there's a second round of naming a different suit or passing
  if (!hasChosenTrump && passCount === 4) {
    // We'll pick a random suit or let the AI pick one
    const suits = ["♠", "♥", "♦", "♣"];
    chosenSuit = suits[Math.floor(Math.random() * suits.length)];
    console.log("Everyone passed; picking random trump suit:", chosenSuit);
  }

  trumpSuit = chosenSuit;
  biddingArea.innerHTML += `<div>Trump Suit: ${trumpSuit}</div>`;

  // Move to play phase
  startTrickTaking();
}

/****************************
 * Calculate "Trump Strength"
 * A simple heuristic:
 * - 9 = 1
 * - 10 = 2
 * - J = 3
 * - Q = 4
 * - K = 5
 * - A = 6
 * Sum up all cards that match the potential trump suit.
 ****************************/
function calcTrumpStrength(hand, suit) {
  let rankValues = { "9": 1, "10": 2, "J": 3, "Q": 4, "K": 5, "A": 6 };
  let score = 0;
  hand.forEach((card) => {
    if (card.suit === suit) {
      score += rankValues[card.rank] || 0;
    }
  });
  return score;
}

/****************************
 * Start Trick-Taking Phase
 ****************************/
function startTrickTaking() {
  // In Euchre, there are 5 tricks
  playTrick();
}

/****************************
 * Play a Single Trick
 ****************************/
function playTrick(leadPlayer = (currentDealer + 1) % 4) {
  if (tricksPlayed === 5) {
    // All 5 tricks done, evaluate round
    determineRoundWinner();
    return;
  }

  let playedCards = [];
  let leadSuit = null;

  // We'll do each player's turn in order: leadPlayer -> leadPlayer+1 -> ... -> leadPlayer+3
  for (let i = 0; i < 4; i++) {
    let p = (leadPlayer + i) % 4;
    if (p === 0) {
      // Human player's turn
      // We must let them choose from valid options
      let chosenCard = null;

      // Render the player's hand so they can click a card to play
      renderHands(leadSuit); // pass leadSuit so we highlight valid moves

      chosenCard = yieldUserPlay(leadSuit); // a function that returns a Promise or uses a callback
      // We'll handle the asynchronous nature with a callback approach for simplicity
      // See the code for yieldUserPlay below.

      // Because the user’s choice is async (click event), we’ll handle the rest of the trick in that callback.
      return; 
    } else {
      // AI player's turn
      let oppIndex = p - 1; // Opponent index in [0..2]
      let aiHand = opponentHands[oppIndex];
      let cardToPlay = aiSelectCard(aiHand, leadSuit, trumpSuit, playedCards, p);
      removeCardFromHand(aiHand, cardToPlay);
      playedCards.push({ player: p, card: cardToPlay });
      if (!leadSuit) leadSuit = cardToPlay.suit;
    }
  }

  // If we reach here in a synchronous loop, that means all 4 players have played
  finishTrick(playedCards, leadSuit);
}

/****************************
 * yieldUserPlay(leadSuit)
 * Renders the player's hand as clickable cards.
 * We only allow valid cards (following suit if possible).
 * We'll use an event listener. Once user clicks a valid card,
 * we continue the trick from there.
 ****************************/
function yieldUserPlay(leadSuit) {
  // Because we can’t just “return” from an async event,
  // we handle the next steps in an event listener callback.

  // We’ll set a global or higher scoped function to handle once the user picks a card.
  // In a more robust system, you’d use a Promise or a UI event bus.

  const playerHandElem = document.getElementById("player-hand");
  
  // Mark valid cards
  let validMoves = getValidMoves(playerHand, leadSuit);
  // Add “clickable” to valid card divs
  [...playerHandElem.querySelectorAll(".card")].forEach((cardDiv) => {
    let cardInfo = cardDiv.dataset; // data-rank, data-suit
    let isValid = validMoves.some(
      (c) => c.rank === cardInfo.rank && c.suit === cardInfo.suit
    );
    if (isValid) {
      cardDiv.classList.add("clickable");
      cardDiv.addEventListener("click", onCardClick);
    }
  });

  function onCardClick(e) {
    let rank = e.target.dataset.rank;
    let suit = e.target.dataset.suit;
    // Remove from player's hand
    let cardObj = { rank, suit };
    removeCardFromHand(playerHand, cardObj);

    // Clear event listeners
    [...playerHandElem.querySelectorAll(".card")].forEach((cd) => {
      cd.classList.remove("clickable");
      cd.removeEventListener("click", onCardClick);
    });

    // We store the user’s played card
    let playedCards = [];
    let leadPlayer = (currentDealer + 1) % 4; 
    // We know user was at position p=0, the leadPlayer for the moment or after.

    // The user’s card is the first in this trick
    if (!leadSuit) leadSuit = suit;
    playedCards.push({ player: 0, card: cardObj });

    // Next 3 AI plays
    for (let i = 1; i < 4; i++) {
      let p = (leadPlayer + i) % 4;
      let oppIndex = p - 1;
      if (p < 1) continue; // skip if p=0 again, not possible but just in case
      let aiHand = opponentHands[oppIndex];
      let aiCard = aiSelectCard(aiHand, leadSuit, trumpSuit, playedCards, p);
      removeCardFromHand(aiHand, aiCard);
      playedCards.push({ player: p, card: aiCard });
    }

    // Evaluate the trick
    finishTrick(playedCards, leadSuit);
  }
}

/****************************
 * AI Select Card
 * Basic logic:
 * 1) Must follow lead suit if you have it.
 * 2) If partner is already winning, throw lowest legal card.
 * 3) If opponent is winning, try to beat them if you can with minimal card that wins.
 * 4) Otherwise, random legal card.
 ****************************/
function aiSelectCard(aiHand, leadSuit, trumpSuit, playedCards, aiPlayer) {
  let validMoves = getValidMoves(aiHand, leadSuit);
  if (validMoves.length === 0) {
    // If there's no lead suit, the entire hand is valid
    validMoves = [...aiHand];
  }

  // Figure out who is winning so far
  let bestSoFar = determineCurrentTrickWinner(playedCards, leadSuit, trumpSuit);
  if (!bestSoFar) {
    // If no cards played yet, we are the first to play
    // Just pick a random card from valid moves
    return randomChoice(validMoves);
  }

  let winningPlayer = bestSoFar.player;
  // Are they my partner or an opponent?
  let isPartnerWinning = false;
  // Partner pairs: (0&2) vs (1&3) in typical seat arrangement. 
  // But here, we said seats: 0=You, 1=Opp1, 2=Opp2, 3=Opp3, 
  // so let’s define teams: Team1 = (0,2), Team2 = (1,3).
  if ((winningPlayer === 0 && aiPlayer === 2) || (winningPlayer === 2 && aiPlayer === 0)) {
    isPartnerWinning = true;
  }
  if ((winningPlayer === 1 && aiPlayer === 3) || (winningPlayer === 3 && aiPlayer === 1)) {
    isPartnerWinning = true;
  }

  if (isPartnerWinning) {
    // Throw lowest legal card to not waste good cards
    return pickLowest(validMoves, trumpSuit);
  } else {
    // Opponent is winning
    // Try to beat them if possible
    let canWinCards = validMoves.filter((c) => {
      let testPlay = [...playedCards, { player: aiPlayer, card: c }];
      let winner = determineCurrentTrickWinner(testPlay, leadSuit, trumpSuit);
      return winner.player === aiPlayer; // If playing c would win the trick
    });
    if (canWinCards.length > 0) {
      // Play the minimal card that wins
      // i.e. pick the "lowest" among canWinCards
      return pickLowest(canWinCards, trumpSuit);
    } else {
      // Can't win, so throw a low card
      return pickLowest(validMoves, trumpSuit);
    }
  }
}

/****************************
 * Utility: pickLowest(cards, trumpSuit)
 * Ranks: 9=0,10=1,J=2,Q=3,K=4,A=5
 * For simplicity, treat trump as higher but still pick the minimal rank.
 ****************************/
function pickLowest(cards, trumpSuit) {
  const rankOrder = { "9": 0, "10": 1, "J": 2, "Q": 3, "K": 4, "A": 5 };
  // Sort by "is trump?" then rank
  let sorted = [...cards].sort((a, b) => {
    let aTrump = a.suit === trumpSuit ? 1 : 0;
    let bTrump = b.suit === trumpSuit ? 1 : 0;
    if (aTrump !== bTrump) return aTrump - bTrump; // non-trump first
    return rankOrder[a.rank] - rankOrder[b.rank];  // then by rank
  });
  return sorted[0]; // The first is the lowest
}

/****************************
 * Get Valid Moves (follow suit if possible)
 ****************************/
function getValidMoves(hand, leadSuit) {
  if (!leadSuit) {
    // No lead suit means anything goes
    return [...hand];
  }
  // All cards matching leadSuit
  let followSuit = hand.filter((c) => c.suit === leadSuit);
  return followSuit.length > 0 ? followSuit : [...hand];
}

/****************************
 * Remove Card From Hand
 ****************************/
function removeCardFromHand(hand, cardObj) {
  let idx = hand.findIndex((c) => c.rank === cardObj.rank && c.suit === cardObj.suit);
  if (idx >= 0) {
    hand.splice(idx, 1);
  }
}

/****************************
 * Determine Current Trick Winner (Partial)
 * Evaluate the set of playedCards to find who is winning so far.
 ****************************/
function determineCurrentTrickWinner(playedCards, leadSuit, trumpSuit) {
  if (playedCards.length === 0) return null; // no winner yet

  let best = { player: playedCards[0].player, card: playedCards[0].card };
  for (let i = 1; i < playedCards.length; i++) {
    let contender = playedCards[i];
    best = compareCards(best, contender, leadSuit, trumpSuit);
  }
  return best;
}

/****************************
 * Compare Two Cards
 ****************************/
function compareCards(bestSoFar, contender, leadSuit, trumpSuit) {
  let rankOrder = { "9": 0, "10": 1, "J": 2, "Q": 3, "K": 4, "A": 5 };
  
  let a = bestSoFar.card;
  let b = contender.card;

  // Check trump
  if (a.suit === trumpSuit && b.suit !== trumpSuit) {
    return bestSoFar;
  }
  if (b.suit === trumpSuit && a.suit !== trumpSuit) {
    return contender;
  }

  // Both trump or both not trump
  // Check lead suit
  if (a.suit === leadSuit && b.suit !== leadSuit) {
    return bestSoFar;
  }
  if (b.suit === leadSuit && a.suit !== leadSuit) {
    return contender;
  }

  // If same suit, compare rank
  if (a.suit === b.suit) {
    if (rankOrder[a.rank] >= rankOrder[b.rank]) {
      return bestSoFar;
    } else {
      return contender;
    }
  }

  // If neither matches lead or trump, bestSoFar remains
  return bestSoFar;
}

/****************************
 * Finish Trick
 * Once all 4 cards are played.
 ****************************/
function finishTrick(playedCards, leadSuit) {
  // Identify winner
  let winner = determineCurrentTrickWinner(playedCards, leadSuit, trumpSuit);
  console.log(`Trick #${tricksPlayed + 1} winner: Player ${winner.player}`);

  // Count trick for the team
  if (winner.player === 0 || winner.player === 2) {
    // Team1
    tricksWonByTeam1++;
  } else {
    // Team2
    tricksWonByTeam2++;
  }

  // Display played cards on table (for reference)
  displayPlayedCards(playedCards, winner.player);

  tricksPlayed++;
  // Next trick: winner leads
  setTimeout(() => {
    playTrick(winner.player);
  }, 1500);
}

/****************************
 * Determine Round Winner
 ****************************/
function determineRoundWinner() {
  // After 5 tricks
  let biddingArea = document.getElementById("bidding-area");
  biddingArea.innerHTML = `Round complete.<br>
    Team1 took ${tricksWonByTeam1} trick(s).<br>
    Team2 took ${tricksWonByTeam2} trick(s).<br>
  `;
  
  // 3+ tricks = 1 point, all 5 = 2 points (simplified)
  if (tricksWonByTeam1 > tricksWonByTeam2) {
    // Team1
    team1Score++;
    biddingArea.innerHTML += `Team1 gets 1 point.<br>`;
  } else {
    // Team2
    team2Score++;
    biddingArea.innerHTML += `Team2 gets 1 point.<br>`;
  }

  // Update scoreboard
  document.getElementById("team1-score").textContent = `Team1: ${team1Score}`;
  document.getElementById("team2-score").textContent = `Team2: ${team2Score}`;

  // Check if someone hit 10
  if (team1Score >= 10) {
    alert("Team1 wins the game!");
    resetGame();
  } else if (team2Score >= 10) {
    alert("Team2 wins the game!");
    resetGame();
  } else {
    // Start new round
    startNewRound();
  }
}

/****************************
 * Reset Game
 ****************************/
function resetGame() {
  team1Score = 0;
  team2Score = 0;
  shuffleDeck(deck);
  startNewRound();
}

/****************************
 * Render Hands in UI
 * If leadSuit is given, highlight valid cards in player's hand
 ****************************/
function renderHands(leadSuit=null) {
  // Player's hand
  const playerHandElem = document.getElementById("player-hand");
  playerHandElem.innerHTML = "";
  playerHand.forEach((card) => {
    let cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.dataset.rank = card.rank;
    cardDiv.dataset.suit = card.suit;
    cardDiv.textContent = card.rank + card.suit;

    // If we have a leadSuit, we can highlight valid moves
    let validMoves = getValidMoves(playerHand, leadSuit);
    let isValid = validMoves.some(
      (c) => c.rank === card.rank && c.suit === card.suit
    );
    if (leadSuit && isValid) {
      cardDiv.style.border = "2px solid yellow"; // or some highlight
    } else if (leadSuit) {
      cardDiv.style.opacity = "0.5";
    }
    playerHandElem.appendChild(cardDiv);
  });

  // Opponents: face-down representation
  for (let opp = 0; opp < 3; opp++) {
    let oppElem = document.getElementById(`opponent${opp + 1}-hand`);
    oppElem.innerHTML = "";
    opponentHands[opp].forEach(() => {
      let facedown = document.createElement("div");
      facedown.classList.add("card", "facedown");
      oppElem.appendChild(facedown);
    });
  }
}

/****************************
 * Display Played Cards on Table
 ****************************/
function displayPlayedCards(playedCards, winnerPlayer) {
  const tableArea = document.getElementById("played-cards");
  tableArea.innerHTML = "";
  playedCards.forEach((pc) => {
    let div = document.createElement("div");
    div.classList.add("card");
    div.textContent = `${pc.card.rank}${pc.card.suit} (P${pc.player})`;
    if (pc.player === winnerPlayer) {
      div.style.backgroundColor = "#f0ad4e"; // highlight winner
    }
    tableArea.appendChild(div);
  });
}

/****************************
 * Utility: Pick Random
 ****************************/
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
