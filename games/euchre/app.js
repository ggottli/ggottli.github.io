// Euchre Simulator - Full-featured with Step-By-Step Insights
// Last Updated: July 15, 2025

class EuchreBot {
  constructor(strategy, game) {
    this.strategy = strategy;
    this.game = game; // Reference to the main game object for utility functions
  }

  /**
   * Calculates a numerical score for a hand given a potential trump suit.
   * This score is used to decide whether to call trump.
   * @param {Array<Object>} hand - The player's hand.
   * @param {string} trumpSuit - The potential trump suit.
   * @returns {number} The calculated score of the hand.
   */
  calculateHandScore(hand, trumpSuit) {
    let score = 0;
    let trumpCount = 0;
    let hasRight = false;
    let hasLeft = false;

    for (const card of hand) {
      if (this.game.getEffectiveSuit(card, trumpSuit) === trumpSuit) {
        trumpCount++;
        if (card.rank === "J") {
          if (card.suit === trumpSuit) hasRight = true;
          else hasLeft = true;
        }
      }
    }

    // Heavily weight having the bowers
    if (hasRight && hasLeft) score += 30;
    else if (hasRight) score += 15;
    else if (hasLeft) score += 8;

    // Weight the number of trump cards
    score += Math.pow(trumpCount, 2.5);

    // Add points for off-suit aces
    score +=
      hand.filter(
        (c) =>
          c.rank === "A" &&
          this.game.getEffectiveSuit(c, trumpSuit) !== trumpSuit,
      ).length * 3;

    return score;
  }

  /**
   * Determines the best suit to call as trump, if any.
   * @param {Array<Object>} hand - The player's hand.
   * @param {Array<string>} potentialSuits - The suits the player is allowed to call.
   * @param {Object} upcard - The card turned up by the dealer.
   * @param {boolean} isRoundTwo - Whether this is the second round of bidding.
   * @returns {Object|null} The best call { suit, score, loner } or null if passing.
   */
  getBestCall(hand, potentialSuits, upcard, isRoundTwo) {
    let bestCall = {
      suit: null,
      score: -1,
      loner: false,
    };
    const callThreshold = isRoundTwo
      ? this.strategy.r2Threshold
      : this.strategy.r1Threshold;

    // In round 1, the player evaluates their hand as if they have the upcard
    const handForEval = isRoundTwo ? hand : [...hand, upcard];

    for (const suit of potentialSuits) {
      const score = this.calculateHandScore(handForEval, suit);
      if (score > bestCall.score) {
        bestCall.score = score;
        bestCall.suit = suit;
      }
    }

    if (bestCall.score >= callThreshold) {
      if (bestCall.score >= this.strategy.lonerThreshold) {
        bestCall.loner = true;
      }
      return bestCall;
    }
    return null;
  }

  /**
   * Decides which card to play based on the current game state and the bot's strategy.
   * @param {Array<Object>} hand - The bot's current hand.
   * @param {Array<Object>} trick - The cards already played in the current trick.
   * @param {string} trumpSuit - The current trump suit.
   * @param {string|null} leadSuit - The suit that was led in the current trick.
   * @param {Array<number>} playersInTrick - The indices of players who have played in the trick.
   * @param {number} myPlayerIndex - The bot's own player index.
   * @param {boolean} isMaker - Is this bot the one who called trump?
   * @param {boolean} partnerIsMaker - Is the bot's partner the one who called trump?
   * @returns {Object} The card to play.
   */
  playCard(
    hand,
    trick,
    trumpSuit,
    leadSuit,
    playersInTrick = [],
    myPlayerIndex,
    isMaker,
    partnerIsMaker,
  ) {
    const validCards = this.game.getValidCards(hand, leadSuit, trumpSuit);
    if (validCards.length === 1) return validCards[0];

    // Sort cards from lowest to highest value for easier decision making
    validCards.sort(
      (a, b) =>
        this.game.getCardValue(a, trumpSuit, leadSuit) -
        this.game.getCardValue(b, trumpSuit, leadSuit),
    );
    const lowestCard = validCards[0];
    const highestCard = validCards[validCards.length - 1];

    // --- Lead Logic (when it's the bot's turn to start a trick) ---
    if (leadSuit === null) {
      let cardToLead = highestCard; // Default to leading highest card
      const trumpInHand = validCards.filter(
        (c) => this.game.getEffectiveSuit(c, trumpSuit) === trumpSuit,
      );
      const offSuitInHand = validCards.filter(
        (c) => this.game.getEffectiveSuit(c, trumpSuit) !== trumpSuit,
      );

      // Determine which lead strategy to use based on the situation
      const leadStrategy = isMaker
        ? this.strategy.leadWhenMaker
        : partnerIsMaker
          ? this.strategy.leadWhenPartnerMaker
          : this.strategy.leadOnDefense;

      if (leadStrategy === "best_trump" && trumpInHand.length > 0) {
        cardToLead = trumpInHand[trumpInHand.length - 1]; // Highest trump
      } else if (leadStrategy === "best_offsuit" && offSuitInHand.length > 0) {
        cardToLead = offSuitInHand[offSuitInHand.length - 1]; // Highest off-suit
      }
      return cardToLead;
    }

    // --- Follow Logic (when another player has already led) ---
    const winnerSoFar = this.game.determineWinner(
      trick,
      playersInTrick,
      trumpSuit,
      leadSuit,
    );
    const partnerIsWinning = winnerSoFar % 2 === myPlayerIndex % 2;

    // If partner is winning and strategy says not to trump them, play the lowest card possible
    if (partnerIsWinning && !this.strategy.trumpWhenPartnerWinning) {
      const winningCardInTrick = trick[playersInTrick.indexOf(winnerSoFar)];
      // Special case: if partner won with a low trump, consider trumping with a high trump to be safe
      if (
        this.game.getEffectiveSuit(winningCardInTrick, trumpSuit) ===
          trumpSuit &&
        !this.strategy.trumpPartnersAce
      ) {
        return lowestCard;
      }
    }

    const winningCardInTrick = trick.find(
      (c, i) => playersInTrick[i] === winnerSoFar,
    );
    const winningValue = this.game.getCardValue(
      winningCardInTrick,
      trumpSuit,
      leadSuit,
    );

    const canWin = validCards.filter(
      (c) => this.game.getCardValue(c, trumpSuit, leadSuit) > winningValue,
    );

    if (canWin.length > 0) {
      // If we can win, should we?
      const isOpponentWinning = !partnerIsWinning;
      if (
        isOpponentWinning &&
        !this.strategy.overtrumpOpponent &&
        this.game.getEffectiveSuit(winningCardInTrick, trumpSuit) === trumpSuit
      ) {
        // Don't overtrump if strategy says not to
        return lowestCard;
      }
      return canWin[0]; // Play the lowest card that can win the trick
    }

    return lowestCard; // Can't win, so play the lowest card (slough)
  }
}

class EuchreSimulator {
  constructor() {
    this.suits = ["S", "H", "D", "C"];
    this.ranks = ["9", "T", "J", "Q", "K", "A"];
    this.suitSymbols = {
      S: "♠",
      H: "♥",
      D: "♦",
      C: "♣",
    };
    this.rankNames = {
      9: "9",
      T: "10",
      J: "J",
      Q: "Q",
      K: "K",
      A: "A",
    };
    this.resetBatchStats();
    this.initializeUI();
    this.sbsGame = null;
    this.sbsHistory = [];
    this.bots = this.getPlayerSettings().map((s) => new EuchreBot(s, this));
  }

  // --- Core Game Logic ---
  createDeck() {
    const deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push({
          suit,
          rank,
        });
      }
    }
    return deck;
  }
  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  getCardValue(card, trumpSuit, leadSuit = null) {
    const { suit, rank } = card;
    const effectiveSuit = this.getEffectiveSuit(card, trumpSuit);
    let value = 0;
    const rankValues = {
      A: 6,
      K: 5,
      Q: 4,
      J: 3,
      T: 2,
      9: 1,
    };
    if (effectiveSuit === trumpSuit) {
      value = 100;
      if (rank === "J") {
        if (suit === trumpSuit)
          value += 20; // Right Bower
        else value += 15; // Left Bower
      } else {
        value += rankValues[rank];
      }
    } else if (effectiveSuit === leadSuit) {
      value = 50;
      value += rankValues[rank];
    } else {
      value = rankValues[rank];
    }
    return value;
  }
  getSameColorSuit(suit) {
    const colorMap = {
      S: "C",
      C: "S",
      H: "D",
      D: "H",
    };
    return colorMap[suit];
  }
  getEffectiveSuit(card, trumpSuit) {
    if (card.rank === "J" && this.getSameColorSuit(card.suit) === trumpSuit) {
      return trumpSuit; // This is the Left Bower
    }
    return card.suit;
  }
  cardToString(card) {
    if (!card) return "";
    return `${this.rankNames[card.rank]}${this.suitSymbols[card.suit]}`;
  }
  stringToCard(str) {
    if (!str) return null;
    const suitSymbol = str.slice(-1);
    const rankStr = str.slice(0, -1);
    const suit = Object.keys(this.suitSymbols).find(
      (s) => this.suitSymbols[s] === suitSymbol,
    );
    const rank = Object.keys(this.rankNames).find(
      (r) => this.rankNames[r] === rankStr,
    );
    return {
      suit,
      rank,
    };
  }
  deal(dealerIndex = 3) {
    const deck = this.shuffleDeck(this.createDeck());
    const hands = [[], [], [], []];
    for (let i = 0; i < 20; i++) {
      hands[(dealerIndex + 1 + i) % 4].push(deck[i]);
    }
    const upcard = deck[20];
    return {
      hands,
      upcard,
      dealer: dealerIndex,
    };
  }
  dealerDiscard(hand, trumpSuit, strategy) {
    let discardCandidate = null;
    let lowestValue = Infinity;

    if (strategy.dealerDiscardStrategy === "lowest_non_trump") {
      const nonTrumpCards = hand.filter(
        (c) => this.getEffectiveSuit(c, trumpSuit) !== trumpSuit,
      );
      if (nonTrumpCards.length > 0) {
        for (const card of nonTrumpCards) {
          const value = this.getCardValue(card, trumpSuit);
          if (value < lowestValue) {
            lowestValue = value;
            discardCandidate = card;
          }
        }
      } else {
        // If all cards are trump, must discard the lowest trump
        const sortedTrump = hand.sort(
          (a, b) =>
            this.getCardValue(a, trumpSuit) - this.getCardValue(b, trumpSuit),
        );
        discardCandidate = sortedTrump[0];
      }
    } else {
      // 'lowest_card' strategy
      for (const card of hand) {
        const value = this.getCardValue(card, trumpSuit);
        if (value < lowestValue) {
          lowestValue = value;
          discardCandidate = card;
        }
      }
    }

    const index = hand.findIndex((c) => c === discardCandidate);
    if (index > -1) {
      hand.splice(index, 1);
    }
  }
  determineWinner(trick, trickPlayers, trumpSuit, leadSuit) {
    let winnerIndex = 0;
    let highestValue = -1;
    for (let i = 0; i < trick.length; i++) {
      const card = trick[i];
      const value = this.getCardValue(card, trumpSuit, leadSuit);
      if (value > highestValue) {
        highestValue = value;
        winnerIndex = i;
      }
    }
    return trickPlayers[winnerIndex];
  }
  getValidCards(hand, leadSuit, trumpSuit) {
    if (!leadSuit) return hand;
    const cardsInLeadSuit = hand.filter(
      (card) => this.getEffectiveSuit(card, trumpSuit) === leadSuit,
    );
    return cardsInLeadSuit.length > 0 ? cardsInLeadSuit : hand;
  }

  // --- BATCH SIMULATION LOGIC ---
  resetBatchStats() {
    this.batchStats = {
      totalGames: 0,
      totalHands: 0,
      teamWins: [0, 0],
      stickTheDealerHands: 0,
      stickTheDealerEuchres: 0,
      playerStats: Array(4)
        .fill(0)
        .map(() => ({
          calls: 0,
          passes: 0,
          round1Calls: 0,
          round2Calls: 0,
          stuckAsDealer: 0,
          lonerAttempts: 0,
          lonerSuccesses: 0,
          handsAsMaker: 0,
          euchresAgainst: 0,
          euchresFor: 0,
        })),
      cardStats: {},
    };
    const deck = this.createDeck();
    for (const card of deck) {
      const key = `${card.rank}${card.suit}`;
      this.batchStats.cardStats[key] = {
        plays: 0,
        trickWins: 0,
        inHandOnCall: 0,
        inHandOnPass: 0,
      };
    }
  }
  runBatchSimulation(numGames) {
    this.resetBatchStats();
    this.bots = this.getPlayerSettings().map((s) => new EuchreBot(s, this));
    let completed = 0;
    const runBatch = () => {
      const batchSize = Math.min(100, numGames - completed);
      for (let i = 0; i < batchSize; i++) {
        this.simulateGame();
      }
      completed += batchSize;
      this.updateProgress(completed / numGames);
      if (completed < numGames) {
        setTimeout(runBatch, 0); // Yield to the main thread to keep UI responsive
      } else {
        this.displayBatchResults();
      }
    };
    runBatch();
  }
  simulateGame() {
    const game = {
      score: [0, 0],
      hands: 0,
    };
    let dealerIndex = Math.floor(Math.random() * 4);
    while (game.score[0] < 10 && game.score[1] < 10) {
      const handResult = this.simulateHand(dealerIndex);
      if (handResult) {
        game.score[handResult.winner] += handResult.points;
      }
      game.hands++;
      dealerIndex = (dealerIndex + 1) % 4;
    }
    this.batchStats.totalGames++;
    this.batchStats.totalHands += game.hands;
    this.batchStats.teamWins[game.score[0] >= 10 ? 0 : 1]++;
  }
  simulateHand(dealerIndex) {
    this.batchStats.totalHands++;
    const { hands, upcard } = this.deal(dealerIndex);
    const stickTheDealer = document.getElementById("stick-dealer").checked;
    let trumpSuit = null;
    let maker = -1;
    let loner = false;
    let currentHands = hands.map((h) => [...h]);

    // Round 1 Bidding
    for (let i = 0; i < 4; i++) {
      const playerIndex = (dealerIndex + 1 + i) % 4;
      const bot = this.bots[playerIndex];
      const call = bot.getBestCall(
        currentHands[playerIndex],
        [upcard.suit],
        upcard,
        false,
      );

      if (call) {
        this.batchStats.playerStats[playerIndex].calls++;
        this.batchStats.playerStats[playerIndex].round1Calls++;
        currentHands[playerIndex].forEach((c) => {
          this.batchStats.cardStats[`${c.rank}${c.suit}`].inHandOnCall++;
        });
        trumpSuit = call.suit;
        maker = playerIndex;
        loner = call.loner;
        currentHands[dealerIndex].push(upcard);
        this.dealerDiscard(
          currentHands[dealerIndex],
          trumpSuit,
          this.bots[dealerIndex].strategy,
        );
        break;
      } else {
        this.batchStats.playerStats[playerIndex].passes++;
        currentHands[playerIndex].forEach((c) => {
          this.batchStats.cardStats[`${c.rank}${c.suit}`].inHandOnPass++;
        });
      }
    }
    // Round 2 Bidding
    if (trumpSuit === null) {
      const otherSuits = this.suits.filter((s) => s !== upcard.suit);
      for (let i = 0; i < 4; i++) {
        const playerIndex = (dealerIndex + 1 + i) % 4;
        const bot = this.bots[playerIndex];
        const call = bot.getBestCall(
          currentHands[playerIndex],
          otherSuits,
          upcard,
          true,
        );
        if (call) {
          this.batchStats.playerStats[playerIndex].calls++;
          this.batchStats.playerStats[playerIndex].round2Calls++;
          currentHands[playerIndex].forEach((c) => {
            this.batchStats.cardStats[`${c.rank}${c.suit}`].inHandOnCall++;
          });
          trumpSuit = call.suit;
          maker = playerIndex;
          loner = call.loner;
          break;
        } else {
          this.batchStats.playerStats[playerIndex].passes++;
          currentHands[playerIndex].forEach((c) => {
            this.batchStats.cardStats[`${c.rank}${c.suit}`].inHandOnPass++;
          });
        }
      }
    }
    // Stick the Dealer
    if (trumpSuit === null && stickTheDealer) {
      maker = dealerIndex;
      const otherSuits = this.suits.filter((s) => s !== upcard.suit);
      const call = this.bots[maker].getBestCall(
        currentHands[maker],
        otherSuits,
        upcard,
        true,
      ) || {
        suit: otherSuits[0],
        loner: false,
      }; // Must call something
      trumpSuit = call.suit;
      loner = call.loner;
      this.batchStats.playerStats[maker].calls++;
      this.batchStats.playerStats[maker].stuckAsDealer++;
      this.batchStats.stickTheDealerHands++;
    }
    if (trumpSuit === null) {
      return null; // Misdeal
    }
    if (loner) {
      this.batchStats.playerStats[maker].lonerAttempts++;
    }
    this.batchStats.playerStats[maker].handsAsMaker++;
    let tricksWon = [0, 0];
    let leader = (dealerIndex + 1) % 4;
    for (let trickNum = 0; trickNum < 5; trickNum++) {
      const trickCards = [];
      let playersInTrick = [];
      let leadSuit = null;
      const makerPartner = (maker + 2) % 4;
      let playerOrder = [];
      for (let i = 0; i < 4; i++) {
        const cpi = (leader + i) % 4;
        if (loner && cpi === makerPartner) continue;
        playerOrder.push(cpi);
      }

      for (const cpi of playerOrder) {
        const bot = this.bots[cpi];
        const card = bot.playCard(
          currentHands[cpi],
          trickCards,
          trumpSuit,
          leadSuit,
          playersInTrick,
          cpi,
          cpi === maker,
          cpi % 2 === maker % 2 && cpi !== maker,
        );
        this.batchStats.cardStats[`${card.rank}${card.suit}`].plays++;
        if (trickCards.length === 0) {
          leadSuit = this.getEffectiveSuit(card, trumpSuit);
        }
        trickCards.push(card);
        playersInTrick.push(cpi);
        currentHands[cpi] = currentHands[cpi].filter(
          (c) => !(c.rank === card.rank && c.suit === card.suit),
        );
      }

      const winnerOfTrick = this.determineWinner(
        trickCards,
        playersInTrick,
        trumpSuit,
        leadSuit,
      );
      const winningCard = trickCards[playersInTrick.indexOf(winnerOfTrick)];
      this.batchStats.cardStats[`${winningCard.rank}${winningCard.suit}`]
        .trickWins++;
      tricksWon[winnerOfTrick % 2]++;
      leader = winnerOfTrick;
    }
    const makerTeam = maker % 2;
    const makersTricks = tricksWon[makerTeam];
    let points = 0;
    let isEuchre = false;
    if (makersTricks < 3) {
      points = 2;
      isEuchre = true;
      this.batchStats.playerStats[maker].euchresAgainst++;
      this.batchStats.playerStats[(maker + 2) % 4].euchresAgainst++;
      this.batchStats.playerStats[(maker + 1) % 4].euchresFor++;
      this.batchStats.playerStats[(maker + 3) % 4].euchresFor++;
      if (dealerIndex === maker && stickTheDealer) {
        this.batchStats.stickTheDealerEuchres++;
      }
    } else {
      if (loner) {
        points = makersTricks === 5 ? 4 : 1;
        if (makersTricks === 5) {
          this.batchStats.playerStats[maker].lonerSuccesses++;
        }
      } else {
        points = makersTricks === 5 ? 2 : 1;
      }
    }
    return {
      winner: isEuchre ? 1 - makerTeam : makerTeam,
      points,
    };
  }

  // --- STEP-BY-STEP & INSIGHT ENGINE LOGIC ---
  getBestPlayWithInsight(playerIndex, gameState) {
    const validPlays = this.getValidCards(
      gameState.hands[playerIndex],
      gameState.leadSuit,
      gameState.trumpSuit,
    );
    if (validPlays.length === 1) {
      return [
        {
          card: validPlays[0],
          winRate: 100,
          isBest: true,
          notes: "Only valid card.",
        },
      ];
    }
    const insights = [];
    const SIMULATION_COUNT = 250; // Lower for faster UI, raise for more accuracy
    for (const cardToTest of validPlays) {
      let wins = 0;
      for (let i = 0; i < SIMULATION_COUNT; i++) {
        if (this.runMonteCarloPlay(playerIndex, cardToTest, gameState)) {
          wins++;
        }
      }
      insights.push({
        card: cardToTest,
        winRate: (wins / SIMULATION_COUNT) * 100,
      });
    }
    insights.sort((a, b) => b.winRate - a.winRate);
    if (insights.length > 0) {
      insights[0].isBest = true;
      insights[0].notes = "Highest statistical chance to win the trick.";
    }
    return insights;
  }
  runMonteCarloPlay(playerIndex, cardToPlay, originalGameState) {
    let gameState = JSON.parse(JSON.stringify(originalGameState));
    let hands = gameState.hands;
    const knownCards = new Set([
      ...hands[playerIndex].map((c) => `${c.rank}${c.suit}`),
      ...gameState.trickCards.map((c) => `${c.rank}${c.suit}`),
    ]);
    if (gameState.upcard) {
      knownCards.add(`${gameState.upcard.rank}${gameState.upcard.suit}`);
    }

    const deck = this.createDeck();
    let unknownCards = deck.filter(
      (c) => !knownCards.has(`${c.rank}${c.suit}`),
    );
    unknownCards = this.shuffleDeck(unknownCards);
    for (let i = 0; i < 4; i++) {
      if (i === playerIndex) continue;
      const handSize = hands[i].length;
      hands[i] = unknownCards.splice(0, handSize);
    }

    let trick = [...gameState.trickCards];
    let playersInTrick = [...gameState.playersInTrick];
    trick.push(cardToPlay);
    playersInTrick.push(playerIndex);

    const playerOrder = this.getPlayerOrder(gameState.leader);
    const startIndex = playersInTrick.length;

    for (let i = startIndex; i < playerOrder.length; i++) {
      const currentPlayer = playerOrder[i];
      if (gameState.loner && currentPlayer === (gameState.maker + 2) % 4)
        continue;
      const valid = this.getValidCards(
        hands[currentPlayer],
        gameState.leadSuit,
        gameState.trumpSuit,
      );
      const card = valid[Math.floor(Math.random() * valid.length)];
      trick.push(card);
      playersInTrick.push(currentPlayer);
    }
    const trickWinner = this.determineWinner(
      trick,
      playersInTrick,
      gameState.trumpSuit,
      gameState.leadSuit,
    );
    return trickWinner % 2 === playerIndex % 2;
  }
  getPlayerOrder(leader) {
    let order = [];
    for (let i = 0; i < 4; i++) {
      order.push((leader + i) % 4);
    }
    return order;
  }

  // --- UI and State Management ---
  initializeUI() {
    this.bindEventListeners();
    this.updateUI();
  }
  bindEventListeners() {
    document
      .querySelectorAll('input[name="mode"]')
      .forEach((radio) =>
        radio.addEventListener("change", () => this.updateUI()),
      );
    document
      .getElementById("run-simulation")
      .addEventListener("click", () =>
        this.runBatchSimulation(
          parseInt(document.getElementById("num-simulations").value),
        ),
      );
    document
      .getElementById("reset-simulation")
      .addEventListener("click", () => this.resetSimulation());
    document
      .getElementById("deal-random-sbs")
      .addEventListener("click", () => this.handleDealRandomSbs());
    document
      .getElementById("sbs-play-best")
      .addEventListener("click", () => this.advanceSbsGame(true));
    document
      .getElementById("sbs-undo")
      .addEventListener("click", () => this.undoSbsMove());

    document.querySelectorAll(".advanced-strategy-toggle").forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const panel = e.target.nextElementSibling;
        panel.classList.toggle("visible");
        e.target.textContent = panel.classList.contains("visible")
          ? "Hide Advanced Strategy"
          : "Show Advanced Strategy";
      });
    });
  }
  handleDealRandomSbs() {
    const { hands, upcard, dealer } = this.deal();
    this.startStepByStepMode(hands, upcard, dealer);
  }
  startStepByStepMode(hands, upcard, dealer = 3) {
    this.sbsHistory = [];
    this.sbsGame = {
      phase: "bidding",
      hands: hands.map((h) => [...h]),
      initialHands: JSON.parse(JSON.stringify(hands)),
      upcard: upcard,
      dealer: dealer,
      currentPlayer: (dealer + 1) % 4,
      biddingRound: 1,
      log: [
        `Hand dealt. Player ${
          ((dealer + 1) % 4) + 1
        } starts bidding. Click 'Play Best Move' to advance.`,
      ],
      score: [0, 0],
      trumpSuit: null,
      maker: -1,
      loner: false,
      currentTrick: 0,
      trickCards: [],
      playersInTrick: [],
      leader: (dealer + 1) % 4,
      leadSuit: null,
      tricksWon: [0, 0],
    };
    this.saveSbsState();
    this.updateSbsUI();
    this.clearInsights();
    this.advanceSbsGame(false, true); // Show insight for first bidder
  }
  saveSbsState() {
    this.sbsHistory.push(JSON.parse(JSON.stringify(this.sbsGame)));
  }
  undoSbsMove() {
    if (this.sbsHistory.length > 1) {
      this.sbsHistory.pop();
      this.sbsGame = JSON.parse(
        JSON.stringify(this.sbsHistory[this.sbsHistory.length - 1]),
      );
      this.updateSbsUI();
      this.clearInsights();
      // After undoing, show insights for the now-current player
      this.advanceSbsGame(false, true);
    }
  }
  advanceSbsGame(isAuto = false, insightOnly = false) {
    if (!this.sbsGame || this.sbsGame.phase === "finished") {
      if (!insightOnly) alert("Please start a new hand to play.");
      return;
    }

    if (!insightOnly) {
      this.saveSbsState();
    }

    const game = this.sbsGame;
    const player = game.currentPlayer;
    const bot = this.bots[player];

    if (game.phase === "bidding") {
      const potentialSuits =
        game.biddingRound === 1
          ? [game.upcard.suit]
          : this.suits.filter((s) => s !== game.upcard.suit);
      const call = bot.getBestCall(
        game.hands[player],
        potentialSuits,
        game.upcard,
        game.biddingRound === 2,
      );

      if (call && isAuto) {
        game.trumpSuit = call.suit;
        game.maker = player;
        game.loner = call.loner;
        game.phase = "playing";
        game.currentPlayer = game.leader;
        game.log.push(
          `Player ${player + 1} calls ${this.suitSymbols[game.trumpSuit]} trump.`,
        );
        if (game.biddingRound === 1) {
          game.hands[game.dealer].push(game.upcard);
          this.dealerDiscard(
            game.hands[game.dealer],
            game.trumpSuit,
            this.bots[game.dealer].strategy,
          );
          game.log.push(`Dealer (P${game.dealer + 1}) picks up the upcard.`);
        }
        this.advanceSbsGame(false, true); // Show insights for first player
      } else if (isAuto) {
        game.log.push(`Player ${player + 1} passes.`);
        game.currentPlayer = (game.currentPlayer + 1) % 4;
        if (game.currentPlayer === (game.dealer + 1) % 4) {
          game.biddingRound++;
          if (game.biddingRound > 2) {
            if (document.getElementById("stick-dealer").checked) {
              // ... stick the dealer logic ...
            } else {
              game.log.push("All players passed twice. It's a misdeal.");
              game.phase = "finished";
            }
          }
        }
        this.advanceSbsGame(true); // Continue auto-play
      }
    } else if (game.phase === "playing") {
      const insights = this.getBestPlayWithInsight(player, game);
      this.displayInsights(insights, player);

      if (isAuto && !insightOnly) {
        const bestMove = insights.find((i) => i.isBest).card;
        setTimeout(() => this.playSbsCard(bestMove), 300);
      }
    }
    this.updateSbsUI();
  }
  playSbsCard(card) {
    const game = this.sbsGame;
    const player = game.currentPlayer;

    this.saveSbsState();

    game.log.push(`Player ${player + 1} plays ${this.cardToString(card)}.`);
    if (game.trickCards.length === 0)
      game.leadSuit = this.getEffectiveSuit(card, game.trumpSuit);
    game.trickCards.push(card);
    game.playersInTrick.push(player);
    game.hands[player] = game.hands[player].filter(
      (c) => !(c.rank === card.rank && c.suit === card.suit),
    );

    const playersInRound = game.loner ? 3 : 4;
    if (game.trickCards.length >= playersInRound) {
      this.updateSbsUI();
      const winner = this.determineWinner(
        game.trickCards,
        game.playersInTrick,
        game.trumpSuit,
        game.leadSuit,
      );
      setTimeout(() => {
        game.log.push(`--- Player ${winner + 1} wins the trick. ---`);
        game.tricksWon[winner % 2]++;
        game.leader = winner;
        game.currentPlayer = winner;
        game.trickCards = [];
        game.playersInTrick = [];
        game.leadSuit = null;
        game.currentTrick++;
        this.clearInsights();
        this.updateSbsUI();

        if (game.currentTrick === 5) {
          // Hand over logic
          game.phase = "finished";
          game.log.push("Hand finished.");
          this.updateSbsUI();
        } else {
          this.advanceSbsGame(false, true); // Show insights for next leader
        }
      }, 1200);
    } else {
      const playerOrder = this.getPlayerOrder(game.leader);
      const nextPlayerIndex = playerOrder.indexOf(player) + 1;
      game.currentPlayer = playerOrder[nextPlayerIndex];
      this.updateSbsUI();
      this.advanceSbsGame(false, true); // Show insights for next player
    }
  }
  updateSbsUI() {
    const stepResultsDiv = document.getElementById("step-results");
    if (!this.sbsGame) {
      stepResultsDiv.classList.add("hidden");
      return;
    }
    stepResultsDiv.classList.remove("hidden");

    const game = this.sbsGame;
    const validCards =
      game.phase === "playing"
        ? this.getValidCards(
            game.hands[game.currentPlayer],
            game.leadSuit,
            game.trumpSuit,
          )
        : [];

    for (let i = 0; i < 4; i++) {
      const handDiv = document
        .getElementById(`player-${i + 1}-sbs`)
        .querySelector(".cards");
      handDiv.innerHTML = ""; // Clear old cards
      game.hands[i].forEach((c) => {
        const isPlayable =
          i === game.currentPlayer &&
          game.phase === "playing" &&
          validCards.some((vc) => vc.rank === c.rank && vc.suit === c.suit);
        const cardEl = document.createElement("span");
        cardEl.className = `card-display ${isPlayable ? "playable" : ""}`;
        cardEl.textContent = this.cardToString(c);
        if (isPlayable) {
          cardEl.onclick = () => this.playSbsCard(c);
        }
        handDiv.appendChild(cardEl);
      });
    }
    const trickDiv = document.getElementById("trick-cards");
    trickDiv.innerHTML = "";

    const playerOrder = this.getPlayerOrder(game.leader);
    for (const seat of playerOrder) {
      const cardPlayed = game.playersInTrick.includes(seat)
        ? game.trickCards[game.playersInTrick.indexOf(seat)]
        : null;
      const placeholder = document.createElement("div");
      placeholder.className = "trick-card";
      if (seat === game.currentPlayer && game.phase !== "finished") {
        placeholder.classList.add("current-player");
      }
      placeholder.innerHTML = `<span class="seat-label">${
        ["N", "E", "S", "W"][seat]
      }</span><div class="card-placeholder ${cardPlayed ? "played" : ""}">${
        cardPlayed ? this.cardToString(cardPlayed) : ""
      }</div>`;
      trickDiv.appendChild(placeholder);
    }

    document.getElementById("team1-score").textContent = game.score[0];
    document.getElementById("team2-score").textContent = game.score[1];
    document.getElementById("trump-suit").textContent = game.trumpSuit
      ? this.suitSymbols[game.trumpSuit]
      : "-";
    document.getElementById("upcard-display").textContent = this.cardToString(
      game.upcard,
    );
    const logContent = document.getElementById("game-log");
    logContent.innerHTML = game.log.map((msg) => `<p>${msg}</p>`).join("");
    logContent.scrollTop = logContent.scrollHeight;

    if (game.phase !== "playing") {
      this.clearInsights();
    }
  }
  displayInsights(insights, playerIndex) {
    const tableBody = document.getElementById("move-insights-table");
    tableBody.innerHTML = insights
      .map(
        (i) =>
          `<tr class="${i.isBest ? "is-best" : ""}"><td>${this.cardToString(
            i.card,
          )}</td><td>${i.winRate.toFixed(1)}%</td><td>${
            i.notes || ""
          }</td></tr>`,
      )
      .join("");
    document.getElementById("insight-player-name").textContent =
      `for Player ${playerIndex + 1}`;
  }
  clearInsights() {
    document.getElementById("move-insights-table").innerHTML = "";
    document.getElementById("insight-player-name").textContent = "";
  }
  updateUI() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const isBatch = mode === "batch";

    document
      .getElementById("batch-settings")
      .classList.toggle("hidden", !isBatch);
    document
      .getElementById("run-simulation")
      .classList.toggle("hidden", !isBatch);
    document
      .getElementById("batch-results")
      .classList.toggle("hidden", !isBatch);
    document.getElementById("step-results").classList.toggle("hidden", isBatch);

    if (isBatch) {
      this.sbsGame = null;
      this.updateSbsUI();
    } else {
      this.bots = this.getPlayerSettings().map((s) => new EuchreBot(s, this));
    }
  }
  displayBatchResults() {
    const {
      totalGames,
      totalHands,
      teamWins,
      stickTheDealerHands,
      stickTheDealerEuchres,
      playerStats,
      cardStats,
    } = this.batchStats;
    const teamStatsBody = document.getElementById("team-stats");
    const avgHands = totalGames > 0 ? (totalHands / totalGames).toFixed(2) : 0;
    teamStatsBody.innerHTML = `<tr><td>Team 1&3</td><td>${
      totalGames > 0 ? ((teamWins[0] / totalGames) * 100).toFixed(1) : 0
    }%</td><td>${avgHands}</td></tr><tr><td>Team 2&4</td><td>${
      totalGames > 0 ? ((teamWins[1] / totalGames) * 100).toFixed(1) : 0
    }%</td><td>${avgHands}</td></tr>`;
    const gameStatsBody = document.getElementById("game-stats");
    const stdEuchreRate =
      stickTheDealerHands > 0
        ? ((stickTheDealerEuchres / stickTheDealerHands) * 100).toFixed(1)
        : 0;
    gameStatsBody.innerHTML = `<tr><td>"Stick the Dealer" Hands</td><td>${
      totalHands > 0 ? ((stickTheDealerHands / totalHands) * 100).toFixed(1) : 0
    }%</td><td>Percentage of all hands where the dealer was stuck.</td></tr><tr><td>"Stick the Dealer" Euchre Rate</td><td>${stdEuchreRate}%</td><td>Of the times the dealer was stuck, how often they were euchred.</td></tr>`;
    const playerStatsBody = document.getElementById("player-stats");
    playerStatsBody.innerHTML = playerStats
      .map((p, i) => {
        const totalDecisions = p.calls + p.passes;
        const callRate =
          totalDecisions > 0
            ? ((p.calls / totalDecisions) * 100).toFixed(1)
            : 0;
        const makerWinRate =
          p.handsAsMaker > 0
            ? (
                ((p.handsAsMaker - p.euchresAgainst) / p.handsAsMaker) *
                100
              ).toFixed(1)
            : 0;
        const lonerSuccessRate =
          p.lonerAttempts > 0
            ? ((p.lonerSuccesses / p.lonerAttempts) * 100).toFixed(1)
            : 0;
        return `<tr><td>Seat ${i + 1}</td><td>${callRate}%</td><td>${
          p.round1Calls
        } / ${p.round2Calls}</td><td>${makerWinRate}%</td><td>${p.euchresFor} / ${
          p.euchresAgainst
        }</td><td>${p.lonerAttempts}</td><td>${lonerSuccessRate}%</td></tr>`;
      })
      .join("");
    const cardPowerBody = document.getElementById("card-power-stats");
    const allDecisions = playerStats.reduce(
      (sum, p) => sum + p.calls + p.passes,
      0,
    );
    const overallCallRate =
      allDecisions > 0
        ? playerStats.reduce((sum, p) => sum + p.calls, 0) / allDecisions
        : 0;
    const sortedDeck = this.createDeck().sort(
      (a, b) => this.getCardValue(b, "S") - this.getCardValue(a, "S"),
    );
    cardPowerBody.innerHTML = sortedDeck
      .map((card) => {
        const key = `${card.rank}${card.suit}`;
        const stats = cardStats[key];
        const twr =
          stats.plays > 0
            ? ((stats.trickWins / stats.plays) * 100).toFixed(1)
            : 0;
        const inHandTotal =
          (stats.inHandOnCall || 0) + (stats.inHandOnPass || 0);
        const cardCallRate =
          inHandTotal > 0
            ? (stats.inHandOnCall || 0) / inHandTotal
            : overallCallRate;
        const tci =
          overallCallRate > 0
            ? ((cardCallRate - overallCallRate) / overallCallRate) * 100
            : 0;
        return `<tr><td>${this.cardToString(
          card,
        )}</td><td>${twr}%</td><td style="color: ${
          tci >= 0 ? "var(--color-success)" : "var(--color-error)"
        }">${tci >= 0 ? "+" : ""}${tci.toFixed(1)}%</td></tr>`;
      })
      .join("");
  }
  getPlayerSettings() {
    const settings = [];
    for (let i = 1; i <= 4; i++) {
      const row = document.querySelector(`[data-seat="${i}"]`);
      settings.push({
        name: row.querySelector(".player-name").value,
        r1Threshold: parseInt(row.querySelector(".bidding-threshold-r1").value),
        r2Threshold: parseInt(row.querySelector(".bidding-threshold-r2").value),
        lonerThreshold: parseInt(row.querySelector(".loner-threshold").value),
        leadWhenMaker: row.querySelector(".lead-when-maker").value,
        leadWhenPartnerMaker: row.querySelector(".lead-when-partner-maker")
          .value,
        leadOnDefense: row.querySelector(".lead-on-defense").value,
        trumpWhenPartnerWinning: row.querySelector(
          ".trump-when-partner-winning",
        ).checked,
        overtrumpOpponent: row.querySelector(".overtrump-opponent").checked,
        trumpPartnersAce: row.querySelector(".trump-partners-ace").checked,
        dealerDiscardStrategy: row.querySelector(".dealer-discard-strategy")
          .value,
      });
    }
    return settings;
  }
  updateProgress(progress) {
    const progressBar = document.getElementById("progress-bar");
    const progressFill = progressBar.querySelector(".progress-fill");
    const progressText = progressBar.querySelector(".progress-text");
    progressBar.classList.remove("hidden");
    progressFill.style.width = `${progress * 100}%`;
    progressText.textContent = `${Math.round(progress * 100)}%`;
    if (progress >= 1) {
      setTimeout(() => progressBar.classList.add("hidden"), 1000);
    }
  }
  resetSimulation() {
    this.sbsGame = null;
    this.updateSbsUI();
    this.clearInsights();
    this.resetBatchStats();
    document.getElementById("team-stats").innerHTML = "";
    document.getElementById("game-stats").innerHTML = "";
    document.getElementById("player-stats").innerHTML = "";
    document.getElementById("card-power-stats").innerHTML = "";
    document.getElementById("progress-bar").classList.add("hidden");
    document.getElementById("game-log").innerHTML =
      "<p>Run a simulation or deal a hand to see results.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new EuchreSimulator();
});
