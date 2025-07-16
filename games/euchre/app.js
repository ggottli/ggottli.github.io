// Euchre Simulator - Full-featured with Step-By-Step Insights

class EuchreBot {
    constructor(strategy, game) {
        this.strategy = strategy;
        this.game = game; // Reference to the main game object
    }

    // --- AI LOGIC (MOVED FROM EuchreSimulator) ---

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
        if (hasRight && hasLeft) score += 30;
        else if (hasRight) score += 15;
        else if (hasLeft) score += 8;
        score += Math.pow(trumpCount, 2.5);
        score +=
            hand.filter(
                (c) =>
                    c.rank === "A" && this.game.getEffectiveSuit(c, trumpSuit) !== trumpSuit,
            ).length * 3;
        return score;
    }

    getBestCall(hand, potentialSuits, upcard, isRoundTwo) {
        let bestCall = { suit: null, score: -1, loner: false };
        const callThreshold = isRoundTwo
            ? this.strategy.r2Threshold
            : this.strategy.r1Threshold;
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

        // Sort cards from lowest to highest value
        validCards.sort(
            (a, b) =>
                this.game.getCardValue(a, trumpSuit, leadSuit) -
                this.game.getCardValue(b, trumpSuit, leadSuit),
        );
        const lowestCard = validCards[0];
        const highestCard = validCards[validCards.length - 1];

        // Lead logic
        if (leadSuit === null) {
            let cardToLead = highestCard; // Default lead
            const trumpInHand = validCards.filter(c => this.game.getEffectiveSuit(c, trumpSuit) === trumpSuit);
            const offSuitInHand = validCards.filter(c => this.game.getEffectiveSuit(c, trumpSuit) !== trumpSuit);

            const leadStrategy = isMaker
                ? this.strategy.leadWhenMaker
                : partnerIsMaker
                    ? this.strategy.leadWhenPartnerMaker
                    : this.strategy.leadOnDefense;

            if (leadStrategy === 'best_trump' && trumpInHand.length > 0) {
                cardToLead = trumpInHand[trumpInHand.length - 1];
            } else if (leadStrategy === 'best_offsuit' && offSuitInHand.length > 0) {
                cardToLead = offSuitInHand[offSuitInHand.length - 1];
            }
            return cardToLead;
        }

        // Follow logic
        const winnerSoFar = this.game.determineWinner(
            trick,
            playersInTrick,
            trumpSuit,
            leadSuit,
        );
        const partnerIsWinning = winnerSoFar % 2 === myPlayerIndex % 2;

        if (partnerIsWinning && !this.strategy.trumpWhenPartnerWinning) {
            return lowestCard; // Play off if partner is winning and strategy says so
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
            if (isOpponentWinning && !this.strategy.overtrumpOpponent) {
                // Don't overtrump if strategy says not to
                return lowestCard;
            }
            return canWin[0]; // Play lowest winning card
        }

        return lowestCard; // Can't win, play lowest card
    }
}


class EuchreSimulator {
  constructor() {
    this.suits = ["S", "H", "D", "C"];
    this.ranks = ["9", "T", "J", "Q", "K", "A"];
    this.suitSymbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
    this.rankNames = { 9: "9", T: "10", J: "J", Q: "Q", K: "K", A: "A" };
    this.resetBatchStats();
    this.initializeUI();
    this.sbsGame = null;
    this.sbsHistory = [];
    this.bots = this.getPlayerSettings().map(s => new EuchreBot(s, this));
  }

  // --- Core Game Logic ---
  createDeck() {
    const deck = [];
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        deck.push({ suit, rank });
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
    const rankValues = { A: 6, K: 5, Q: 4, J: 3, T: 2, 9: 1 };
    if (effectiveSuit === trumpSuit) {
      value = 100;
      if (rank === "J") {
        if (suit === trumpSuit) value += 20;
        else value += 15;
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
    const colorMap = { S: "C", C: "S", H: "D", D: "H" };
    return colorMap[suit];
  }
  getEffectiveSuit(card, trumpSuit) {
    if (card.rank === "J" && this.getSameColorSuit(card.suit) === trumpSuit) {
      return trumpSuit;
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
    return { suit, rank };
  }
  deal(dealerIndex = 3) {
    const deck = this.shuffleDeck(this.createDeck());
    const hands = [[], [], [], []];
    for (let i = 0; i < 20; i++) {
      hands[(dealerIndex + 1 + i) % 4].push(deck[i]);
    }
    const upcard = deck[20];
    return { hands, upcard, dealer: dealerIndex };
  }
  dealerDiscard(hand, trumpSuit, strategy) {
    let discardCandidate = null;
    let lowestValue = Infinity;

    if (strategy.dealerDiscardStrategy === 'lowest_non_trump') {
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
            // If all cards are trump, discard the lowest trump
            const sortedTrump = hand.sort(
                (a, b) =>
                    this.getCardValue(a, trumpSuit) - this.getCardValue(b, trumpSuit),
            );
            discardCandidate = sortedTrump[0];
        }
    } else { // 'lowest_card'
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
    const settings = this.getPlayerSettings();
    let completed = 0;
    const runBatch = () => {
      const batchSize = Math.min(100, numGames - completed);
      for (let i = 0; i < batchSize; i++) {
        this.simulateGame(settings);
      }
      completed += batchSize;
      this.updateProgress(completed / numGames);
      if (completed < numGames) {
        setTimeout(runBatch, 0);
      } else {
        this.displayBatchResults();
      }
    };
    runBatch();
  }
  simulateGame(settings) {
    const game = { score: [0, 0], hands: 0 };
    let dealerIndex = Math.floor(Math.random() * 4);
    while (game.score[0] < 10 && game.score[1] < 10) {
      const handResult = this.simulateHand(settings, dealerIndex);
      game.score[handResult.winner] += handResult.points;
      game.hands++;
      dealerIndex = (dealerIndex + 1) % 4;
    }
    this.batchStats.totalGames++;
    this.batchStats.teamWins[game.score[0] >= 10 ? 0 : 1]++;
  }

  // FIX: Added the missing statistics collection for TCI.
  simulateHand(settings, dealerIndex) {
    this.batchStats.totalHands++;
    const { hands, upcard } = this.deal(dealerIndex);
    const stickTheDealer = document.getElementById("stick-dealer").checked;
    let trumpSuit = null;
    let maker = -1;
    let loner = false;
    let currentHands = hands.map((h) => [...h]);

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
        this.dealerDiscard(currentHands[dealerIndex], trumpSuit, this.bots[dealerIndex].strategy);
        break;
      } else {
        this.batchStats.playerStats[playerIndex].passes++;
        currentHands[playerIndex].forEach((c) => {
          this.batchStats.cardStats[`${c.rank}${c.suit}`].inHandOnPass++;
        });
      }
    }
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
    if (trumpSuit === null && stickTheDealer) {
      maker = dealerIndex;
      const otherSuits = this.suits.filter((s) => s !== upcard.suit);
      const call = this.bots[maker].getBestCall(
        currentHands[maker],
        otherSuits,
        upcard,
        true,
      ) || { suit: otherSuits[0], loner: false };
      trumpSuit = call.suit;
      loner = call.loner;
      this.batchStats.playerStats[maker].calls++;
      this.batchStats.playerStats[maker].stuckAsDealer++;
      this.batchStats.stickTheDealerHands++;
    }
    if (trumpSuit === null) {
      return this.simulateHand(settings, (dealerIndex + 1) % 4);
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
      playersInTrick = playerOrder;
      for (const cpi of playersInTrick) {
        const bot = this.bots[cpi];
        const card = bot.playCard(
          currentHands[cpi],
          trickCards,
          trumpSuit,
          leadSuit,
          playersInTrick,
          cpi,
          cpi === maker,
          cpi === (maker + 2) % 4,
        );
        this.batchStats.cardStats[`${card.rank}${card.suit}`].plays++;
        if (trickCards.length === 0) {
          leadSuit = this.getEffectiveSuit(card, trumpSuit);
        }
        trickCards.push(card);
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
      this.batchStats.playerStats[(maker + 1) % 4].euchresFor++;
      this.batchStats.playerStats[(maker + 3) % 4].euchresFor++;
      if (
        this.batchStats.playerStats[maker].stuckAsDealer > 0 &&
        this.batchStats.stickTheDealerHands >
          this.batchStats.stickTheDealerEuchres
      ) {
        if (dealerIndex === maker) this.batchStats.stickTheDealerEuchres++;
      }
    } else {
      if (loner) {
        points = makersTricks === 5 ? 4 : 1;
        this.batchStats.playerStats[maker].lonerSuccesses++;
      } else {
        points = makersTricks === 5 ? 2 : 1;
      }
    }
    return { winner: isEuchre ? 1 - makerTeam : makerTeam, points };
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
    const SIMULATION_COUNT = 250;
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
    const deck = this.createDeck();
    let unknownCards = deck.filter(
      (c) => !knownCards.has(`${c.rank}${c.suit}`),
    );
    unknownCards = this.shuffleDeck(unknownCards);
    for (let i = 0; i < 4; i++) {
      if (i === playerIndex) continue;
      hands[i] = unknownCards.splice(0, hands[i].length);
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
    this.populateCustomHandSelectors();
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
      .getElementById("deal-hand")
      .addEventListener("click", () => this.handleDealRandomSbs());
    document
      .getElementById("deal-random-sbs")
      .addEventListener("click", () => this.handleDealRandomSbs());
    document
      .getElementById("start-custom-hand")
      .addEventListener("click", () => this.handleStartCustomHand());
    document
      .getElementById("sbs-play-best")
      .addEventListener("click", () => this.advanceSbsGame(true));
    document
        .getElementById("sbs-undo")
        .addEventListener("click", () => this.undoSbsMove());

    document.querySelectorAll('.advanced-strategy-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = e.target.nextElementSibling;
            panel.classList.toggle('visible');
        });
    });
  }

  populateCustomHandSelectors() {
    const deck = this.createDeck();
    const options = deck
      .map(
        (c) =>
          `<option value="${this.cardToString(c)}">${this.cardToString(c)}</option>`,
      )
      .join("");
    for (let i = 1; i <= 4; i++) {
      const container = document.getElementById(`custom-hand-${i}`);
      let selectors = "";
      for (let j = 0; j < 5; j++) {
        selectors += `<select class="form-control">${options}</select>`;
      }
      container.innerHTML = selectors;
    }
    document.getElementById("custom-upcard").innerHTML =
      `<option value="">-</option>${options}`;
  }
  handleDealRandomSbs() {
    const { hands, upcard, dealer } = this.deal();
    this.startStepByStepMode(hands, upcard, dealer);
  }
  handleStartCustomHand() {
    const hands = [[], [], [], []];
    let upcard = null;
    let error = false;
    const seenCards = new Set();

    for (let i = 1; i <= 4; i++) {
      const selectors = document.querySelectorAll(`#custom-hand-${i} select`);
      for (const sel of selectors) {
        const cardStr = sel.value;
        if (!cardStr || seenCards.has(cardStr)) {
          error = true;
          break;
        }
        seenCards.add(cardStr);
        hands[i - 1].push(this.stringToCard(cardStr));
      }
      if (error) break;
    }

    const upcardStr = document.getElementById("custom-upcard").value;
    if (!upcardStr || seenCards.has(upcardStr)) {
      error = true;
    }

    if (error) {
      alert(
        "Error: Duplicate or missing cards selected. Each of the 21 cards must be unique.",
      );
      return;
    }
    upcard = this.stringToCard(upcardStr);
    this.startStepByStepMode(hands, upcard);
  }

  startStepByStepMode(hands, upcard, dealer = 3) {
    this.sbsHistory = []; // Clear history
    this.sbsGame = {
      phase: "bidding",
      hands: hands.map((h) => [...h]),
      initialHands: JSON.parse(JSON.stringify(hands)),
      upcard: upcard,
      dealer: dealer,
      currentPlayer: (dealer + 1) % 4,
      biddingRound: 1,
      log: [`Hand dealt. Player ${dealer + 1} starts bidding.`],
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
    this.saveSbsState(); // Save initial state
    this.updateSbsUI();
    this.clearInsights();
  }

  saveSbsState() {
    this.sbsHistory.push(JSON.parse(JSON.stringify(this.sbsGame)));
  }

  undoSbsMove() {
    if (this.sbsHistory.length > 1) {
      this.sbsHistory.pop(); // Remove current state
      this.sbsGame = this.sbsHistory[this.sbsHistory.length - 1]; // Restore previous state
      this.updateSbsUI();
      this.clearInsights();
    }
  }

  // FIX: The game loop is now truly step-by-step and waits for the user.
  advanceSbsGame(isAuto = false) {
    if (!this.sbsGame || this.sbsGame.phase === "finished") {
      alert("Please start a new hand to play.");
      return;
    }

    this.saveSbsState();

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

      if (call) {
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
          this.dealerDiscard(game.hands[game.dealer], game.trumpSuit, this.bots[game.dealer].strategy);
          game.log.push(`Dealer (P${game.dealer + 1}) picks up the upcard.`);
        }
      } else {
        game.log.push(`Player ${player + 1} passes.`);
        game.currentPlayer = (game.currentPlayer + 1) % 4;
        if (game.currentPlayer === (game.dealer + 1) % 4) {
          game.biddingRound++;
          if (game.biddingRound > 2) {
            if (document.getElementById("stick-dealer").checked) {
              game.log.push("All players passed. Dealer is stuck.");
              game.maker = game.dealer;
              const otherSuits = this.suits.filter(
                (s) => s !== game.upcard.suit,
              );
              const stuckCall = this.bots[game.maker].getBestCall(
                game.hands[game.maker],
                otherSuits,
                game.upcard,
                true,
              ) || { suit: otherSuits[0], loner: false };
              game.trumpSuit = stuckCall.suit;
              game.loner = stuckCall.loner;
              game.phase = "playing";
              game.currentPlayer = game.leader;
              game.log.push(
                `Dealer is stuck with ${this.suitSymbols[game.trumpSuit]} trump.`,
              );
            } else {
              game.log.push("All players passed twice. It's a misdeal.");
              game.phase = "finished";
            }
          }
        }
      }
    } else if (game.phase === "playing") {
      const insights = this.getBestPlayWithInsight(player, game);
      this.displayInsights(insights, player);

      if (isAuto) {
        const bestMove = insights.find((i) => i.isBest).card;
        this.playSbsCard(bestMove);
      } else {
        // Manual play is handled by card click events
        return;
      }
    }

    this.updateSbsUI();
  }

  playSbsCard(card) {
    const game = this.sbsGame;
    const player = game.currentPlayer;

    game.log.push(
      `Player ${player + 1} plays ${this.cardToString(card)}.`,);
    if (game.trickCards.length === 0)
      game.leadSuit = this.getEffectiveSuit(card, game.trumpSuit);
    game.trickCards.push(card);
    game.playersInTrick.push(player);
    game.hands[player] = game.hands[player].filter(
      (c) => !(c.rank === card.rank && c.suit === card.suit),
    );

    const playersInRound = game.loner ? 3 : 4;
    if (game.trickCards.length >= playersInRound) {
      this.updateSbsUI(); // Update to show the full trick
      const winner = this.determineWinner(
        game.trickCards,
        game.playersInTrick,
        game.trumpSuit,
        game.leadSuit,
      );
      setTimeout(() => {
        // Pause to let user see the completed trick
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
          const makerTeam = game.maker % 2;
          if (game.tricksWon[makerTeam] >= 3) {
            game.log.push(
              `Makers win the hand with ${game.tricksWon[makerTeam]} tricks.`,
            );
          } else {
            game.log.push(`Makers get euchred!`);
          }
          game.phase = "finished";
          this.updateSbsUI();
        }
      }, 1200);
      return; // Stop execution until next button click
    } else {
      game.currentPlayer = this.getPlayerOrder(game.leader)[
        game.playersInTrick.length
      ];
    }
    this.updateSbsUI();
  }

  updateSbsUI() {
    if (!this.sbsGame) {
      document.getElementById("step-results").style.display = "none";
      return;
    }
    document.getElementById("step-results").style.display = "block";
    const game = this.sbsGame;
    const validCards = this.getValidCards(
        game.hands[game.currentPlayer],
        game.leadSuit,
        game.trumpSuit
    );

    for (let i = 0; i < 4; i++) {
      const handDiv = document
        .getElementById(`player-${i + 1}-sbs`)
        .querySelector(".cards");
      handDiv.innerHTML = game.hands[i]
        .map((c) => {
            const isPlayable = i === game.currentPlayer && validCards.some(vc => vc.rank === c.rank && vc.suit === c.suit);
            const cardEl = document.createElement('span');
            cardEl.className = `card-display ${isPlayable ? 'playable' : ''}`;
            cardEl.textContent = this.cardToString(c);
            if (isPlayable) {
                cardEl.onclick = () => this.playSbsCard(c);
            }
            return cardEl.outerHTML;
        })
        .join("");
    }
    const trickDiv = document.getElementById("trick-cards");
    trickDiv.innerHTML = "";

    const playerOrder = this.getPlayerOrder(game.leader);
    for (let i = 0; i < 4; i++) {
      const seat = playerOrder[i];
      const cardPlayed = game.playersInTrick.includes(seat)
        ? game.trickCards[game.playersInTrick.indexOf(seat)]
        : null;
      const placeholder = document.createElement("div");
      placeholder.className = "trick-card";
      if (seat === game.currentPlayer && game.phase !== "finished") {
        placeholder.classList.add("current-player");
      }
      placeholder.innerHTML = `<span class="seat-label">${["N", "E", "S", "W"][seat]}</span><div class="card-placeholder ${cardPlayed ? "played" : ""}">${cardPlayed ? this.cardToString(cardPlayed) : ""}</div>`;
      trickDiv.appendChild(placeholder);
    }
    document.getElementById("trump-suit").textContent = game.trumpSuit
      ? this.suitSymbols[game.trumpSuit]
      : "-";
    document.getElementById("upcard-display").textContent = this.cardToString(
      game.upcard,
    );
    document.getElementById("game-log").innerHTML = game.log
      .map((msg) => `<p>${msg}</p>`)
      .join("");
    document.getElementById("game-log").scrollTop =
      document.getElementById("game-log").scrollHeight;
    if (game.phase !== "playing") {
      this.clearInsights();
    }
  }
  displayInsights(insights, playerIndex) {
    const tableBody = document.getElementById("move-insights-table");
    tableBody.innerHTML = insights
      .map(
        (i) =>
          `<tr class="${i.isBest ? "is-best" : ""}"><td>${this.cardToString(i.card)}</td><td>${i.winRate.toFixed(1)}%</td><td>${i.notes || ""}</td></tr>`,
      )
      .join("");
    document.getElementById("insight-player-name").textContent =
      `for Player ${playerIndex + 1}`;
  }
  clearInsights() {
    document.getElementById("move-insights-table").innerHTML = "";
    document.getElementById("insight-player-name").textContent = "";
  }

  // FIX: Swiching to Step mode now correctly shows the panel.
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
    const avgHands = totalGames > 0 ? (totalHands / totalGames).toFixed(1) : 0;
    teamStatsBody.innerHTML = `<tr><td>Team 1&3</td><td>${totalGames > 0 ? ((teamWins[0] / totalGames) * 100).toFixed(1) : 0}%</td><td>${avgHands}</td></tr><tr><td>Team 2&4</td><td>${totalGames > 0 ? ((teamWins[1] / totalGames) * 100).toFixed(1) : 0}%</td><td>${avgHands}</td></tr>`;
    const gameStatsBody = document.getElementById("game-stats");
    const stdEuchreRate =
      stickTheDealerHands > 0
        ? ((stickTheDealerEuchres / stickTheDealerHands) * 100).toFixed(1)
        : 0;
    gameStatsBody.innerHTML = `<tr><td>"Stick the Dealer" Hands</td><td>${totalHands > 0 ? ((stickTheDealerHands / totalHands) * 100).toFixed(1) : 0}%</td><td>Percentage of all hands where the dealer was stuck.</td></tr><tr><td>"Stick the Dealer" Euchre Rate</td><td>${stdEuchreRate}%</td><td>Of the times the dealer was stuck, how often they were euchred.</td></tr>`;
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
        return `<tr><td>Seat ${i + 1}</td><td>${callRate}%</td><td>${p.round1Calls} / ${p.round2Calls}</td><td>${makerWinRate}%</td><td>${p.euchresFor} / ${p.euchresAgainst}</td><td>${p.lonerAttempts}</td><td>${lonerSuccessRate}%</td></tr>`;
      })
      .join("");
    const cardPowerBody = document.getElementById("card-power-stats");
    const overallCallRate =
      playerStats.reduce((sum, p) => sum + p.calls, 0) /
      playerStats.reduce((sum, p) => sum + p.calls + p.passes, 0);
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
        return `<tr><td>${this.cardToString(card)}</td><td>${twr}%</td><td style="color: ${tci >= 0 ? "green" : "red"}">${tci >= 0 ? "+" : ""}${tci.toFixed(1)}%</td></tr>`;
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
        leadStyle: row.querySelector(".lead-style").value,
        protectPartner: row.querySelector(".protect-partner").checked,
        // Advanced settings
        leadWhenMaker: row.querySelector(".lead-when-maker").value,
        leadWhenPartnerMaker: row.querySelector(".lead-when-partner-maker").value,
        leadOnDefense: row.querySelector(".lead-on-defense").value,
        trumpWhenPartnerWinning: row.querySelector(".trump-when-partner-winning").checked,
        overtrumpOpponent: row.querySelector(".overtrump-opponent").checked,
        trumpPartnersAce: row.querySelector(".trump-partners-ace").checked,
        dealerDiscardStrategy: row.querySelector(".dealer-discard-strategy").value,
      });
    }
    this.bots = settings.map(s => new EuchreBot(s, this));
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
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new EuchreSimulator();
});
