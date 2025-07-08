// Euchre Simulator - Core Logic
class EuchreSimulator {
  constructor() {
    this.suits = ["S", "H", "D", "C"];
    this.ranks = ["9", "T", "J", "Q", "K", "A"];
    this.suitSymbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
    this.rankNames = { 9: "9", T: "10", J: "J", Q: "Q", K: "K", A: "A" };

    this.currentGame = null;
    this.resetBatchStats();

    this.initializeUI();
  }

  // Card utilities
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
        if (suit === trumpSuit)
          value += 20; // Right bower
        else value += 15; // Left bower
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
    return `${this.rankNames[card.rank]}${this.suitSymbols[card.suit]}`;
  }

  // Game logic
  deal(dealerIndex = 3) {
    const deck = this.shuffleDeck(this.createDeck());
    const hands = [[], [], [], []];

    for (let i = 0; i < 20; i++) {
      hands[(dealerIndex + 1 + i) % 4].push(deck[i]);
    }

    const upcard = deck[20];
    return { hands, upcard, dealer: dealerIndex };
  }

  calculateHandScore(hand, trumpSuit) {
    let score = 0;
    let trumpCount = 0;
    let hasRight = false;
    let hasLeft = false;

    for (const card of hand) {
      const effectiveSuit = this.getEffectiveSuit(card, trumpSuit);
      if (effectiveSuit === trumpSuit) {
        trumpCount++;
        if (card.rank === "J") {
          if (card.suit === trumpSuit) hasRight = true;
          else hasLeft = true;
        }
        score += this.getCardValue(card, trumpSuit);
      } else if (card.rank === "A") {
        score += 4;
      }
    }

    if (hasRight) score += 10;
    if (hasLeft) score += 5;
    score += Math.pow(trumpCount, 2);

    return score;
  }

  shouldBid(hand, upcard, trumpSuit, aggressiveness, isRoundTwo, isDealer) {
    const handWithUpcard = !isRoundTwo && isDealer ? [...hand, upcard] : hand;
    const handScore = this.calculateHandScore(handWithUpcard, trumpSuit);

    let baseThreshold = isRoundTwo ? 28 : 35;
    if (isDealer) baseThreshold -= 5;

    const threshold = baseThreshold - (aggressiveness - 50) * 0.15;
    const shouldCall = handScore >= threshold;
    if (!shouldCall) return { bid: false };

    const lonerThreshold = 65 - (aggressiveness - 50) * 0.1;
    return { bid: true, loner: handScore >= lonerThreshold };
  }

  dealerDiscard(hand, trumpSuit) {
    let discardCandidate = null;
    let lowestValue = Infinity;

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
      const sortedTrump = hand.sort(
        (a, b) =>
          this.getCardValue(a, trumpSuit) - this.getCardValue(b, trumpSuit),
      );
      discardCandidate = sortedTrump[0];
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

  playCard(hand, trick, trumpSuit, leadSuit, aggressiveness) {
    // FIX: The entire card playing logic is updated to use the 'aggressiveness' parameter.
    const validCards = this.getValidCards(hand, leadSuit, trumpSuit);
    if (validCards.length === 1) return validCards[0];

    // Sort cards from lowest value to highest
    validCards.sort(
      (a, b) =>
        this.getCardValue(a, trumpSuit, leadSuit) -
        this.getCardValue(b, trumpSuit, leadSuit),
    );
    const lowestCard = validCards[0];
    const highestCard = validCards[validCards.length - 1];

    if (leadSuit === null) {
      // We are leading the trick
      // An aggressive player is more likely to lead with their highest card.
      // We'll use a random roll against their aggressiveness score.
      const roll = Math.random() * 100;
      if (roll < aggressiveness) {
        return highestCard; // Play high
      } else {
        return lowestCard; // Play low
      }
    } else {
      // We are following
      const currentWinningCard = [...trick].sort(
        (a, b) =>
          this.getCardValue(b, trumpSuit, leadSuit) -
          this.getCardValue(a, trumpSuit, leadSuit),
      )[0];
      const winningValue = this.getCardValue(
        currentWinningCard,
        trumpSuit,
        leadSuit,
      );

      // Find all cards in our hand that can win the trick
      const winningCards = validCards.filter(
        (c) => this.getCardValue(c, trumpSuit, leadSuit) > winningValue,
      );

      if (winningCards.length > 0) {
        // We have at least one card that can win the trick.
        // Aggressive players will be more willing to use a winning card.
        const willingnessToWin = 20 + aggressiveness; // Base 20% + aggressiveness score
        const roll = Math.random() * 100;

        if (roll < willingnessToWin) {
          // Play the SMALLEST card that can still win the trick.
          return winningCards[0];
        } else {
          // Decided to be conservative and save high cards.
          return lowestCard;
        }
      } else {
        // We cannot win the trick, so we must play our lowest card (sluff).
        return lowestCard;
      }
    }
  }

  getValidCards(hand, leadSuit, trumpSuit) {
    if (!leadSuit) return hand;
    const cardsInLeadSuit = hand.filter(
      (card) => this.getEffectiveSuit(card, trumpSuit) === leadSuit,
    );
    return cardsInLeadSuit.length > 0 ? cardsInLeadSuit : hand;
  }

  // Simulation methods
  runBatchSimulation(numGames) {
    this.resetBatchStats();
    const settings = this.getPlayerSettings();
    let completed = 0;

    const runBatch = () => {
      const batchSize = Math.min(100, numGames - completed);
      for (let i = 0; i < batchSize; i++) {
        const result = this.simulateGame(settings);
        this.updateBatchStats(result);
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
    const game = {
      score: [0, 0],
      hands: 0,
      euchres: [0, 0],
      loners: [0, 0],
      cardImpact: [],
    };
    let dealerIndex = Math.floor(Math.random() * 4);

    while (game.score[0] < 10 && game.score[1] < 10) {
      const handResult = this.simulateHand(settings, dealerIndex);

      const winningTeam = handResult.winner % 2;
      game.score[winningTeam] += handResult.points;
      game.hands++;

      if (handResult.euchre) {
        game.euchres[winningTeam]++;
      }
      if (handResult.loner) {
        game.loners[handResult.maker % 2]++;
      }
      game.cardImpact.push(...handResult.cardImpact);
      dealerIndex = (dealerIndex + 1) % 4;
    }

    return {
      ...game,
      winner: game.score[0] >= 10 ? 0 : 1,
    };
  }

  simulateHand(settings, dealerIndex) {
    const { hands, upcard } = this.deal(dealerIndex);
    const stickTheDealer = document.getElementById("stick-dealer").checked;

    let trumpSuit = null;
    let maker = -1;
    let loner = false;
    let currentHands = hands.map((h) => [...h]);

    // Round 1 bidding
    for (let i = 0; i < 4; i++) {
      const playerIndex = (dealerIndex + 1 + i) % 4;
      const bid = this.shouldBid(
        currentHands[playerIndex],
        upcard,
        upcard.suit,
        settings[playerIndex].aggressiveness,
        false,
        playerIndex === dealerIndex,
      );
      if (bid.bid) {
        trumpSuit = upcard.suit;
        maker = playerIndex;
        loner = bid.loner;
        currentHands[dealerIndex].push(upcard);
        this.dealerDiscard(currentHands[dealerIndex], trumpSuit);
        break;
      }
    }

    // Round 2 bidding
    if (trumpSuit === null) {
      for (let i = 0; i < 4; i++) {
        const playerIndex = (dealerIndex + 1 + i) % 4;
        const otherSuits = this.suits.filter((s) => s !== upcard.suit);
        for (const suit of otherSuits) {
          const bid = this.shouldBid(
            currentHands[playerIndex],
            upcard,
            suit,
            settings[playerIndex].aggressiveness,
            true,
            playerIndex === dealerIndex,
          );
          if (bid.bid) {
            trumpSuit = suit;
            maker = playerIndex;
            loner = bid.loner;
            break;
          }
        }
        if (trumpSuit) break;
      }
    }

    // Stick the Dealer
    if (trumpSuit === null && stickTheDealer) {
      maker = dealerIndex;
      let bestSuit = "";
      let bestScore = -1;
      for (const suit of this.suits.filter((s) => s !== upcard.suit)) {
        const score = this.calculateHandScore(currentHands[maker], suit);
        if (score > bestScore) {
          bestScore = score;
          bestSuit = suit;
        }
      }
      trumpSuit = bestSuit || this.suits.filter((s) => s !== upcard.suit)[0];
    }

    if (trumpSuit === null) {
      return this.simulateHand(settings, (dealerIndex + 1) % 4);
    }

    let tricksWon = [0, 0];
    let leader = (dealerIndex + 1) % 4;
    const handCardImpact = [];

    for (let trickNum = 0; trickNum < 5; trickNum++) {
      const trickCards = [];
      let playersInTrick = [];
      let leadSuit = null;
      const makerPartner = (maker + 2) % 4;

      let playerOrder = [];
      for (let i = 0; i < 4; i++) {
        const currentPlayerIndex = (leader + i) % 4;
        if (loner && currentPlayerIndex === makerPartner) {
          continue;
        }
        playerOrder.push(currentPlayerIndex);
      }
      playersInTrick = playerOrder;

      for (const currentPlayerIndex of playersInTrick) {
        const card = this.playCard(
          currentHands[currentPlayerIndex],
          trickCards,
          trumpSuit,
          leadSuit,
          settings[currentPlayerIndex].aggressiveness,
        );
        if (trickCards.length === 0) {
          leadSuit = this.getEffectiveSuit(card, trumpSuit);
          handCardImpact.push({ card: card, seat: currentPlayerIndex });
        }
        trickCards.push(card);
        currentHands[currentPlayerIndex] = currentHands[
          currentPlayerIndex
        ].filter((c) => c !== card);
      }

      const winnerOfTrick = this.determineWinner(
        trickCards,
        playersInTrick,
        trumpSuit,
        leadSuit,
      );
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
    } else {
      if (loner) {
        points = makersTricks === 5 ? 4 : 1;
      } else {
        points = makersTricks === 5 ? 2 : 1;
      }
    }

    const winningTeamIndex = isEuchre ? 1 - makerTeam : makerTeam;

    const finalCardImpact = handCardImpact.map((impact) => ({
      ...impact,
      handWinner: winningTeamIndex,
    }));

    return {
      winner: winningTeamIndex,
      points: points,
      euchre: isEuchre,
      loner: loner && makersTricks >= 3,
      maker: maker,
      cardImpact: finalCardImpact,
    };
  }

  resetBatchStats() {
    this.batchStats = {
      totalGames: 0,
      teamWins: [0, 0],
      gamesTo10: [],
      euchres: [0, 0],
      loners: [0, 0],
      cardImpact: {},
    };
  }

  updateBatchStats(result) {
    this.batchStats.totalGames++;
    this.batchStats.teamWins[result.winner]++;
    this.batchStats.gamesTo10.push(result.hands);
    this.batchStats.euchres[0] += result.euchres[0];
    this.batchStats.euchres[1] += result.euchres[1];
    this.batchStats.loners[0] += result.loners[0];
    this.batchStats.loners[1] += result.loners[1];

    for (const impact of result.cardImpact) {
      const key = `${impact.card.rank}${impact.card.suit}-${impact.seat}`;
      if (!this.batchStats.cardImpact[key]) {
        this.batchStats.cardImpact[key] = { wins: 0, total: 0 };
      }
      this.batchStats.cardImpact[key].total++;
      if (impact.handWinner === impact.seat % 2) {
        this.batchStats.cardImpact[key].wins++;
      }
    }
  }

  // UI Methods
  initializeUI() {
    this.populateCardSelectors();
    this.bindEventListeners();
    this.updateUI();
  }

  populateCardSelectors() {
    const options = [""];
    const fullDeck = this.createDeck();
    for (const card of fullDeck) {
      options.push(this.cardToString(card));
    }

    document.querySelectorAll(".card-selector").forEach((select) => {
      select.innerHTML = options
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
    });

    const upcardSelect = document.getElementById("upcard-selector");
    upcardSelect.innerHTML =
      '<option value="random">Random Upcard</option>' +
      options
        .slice(1)
        .map((opt) => `<option value="${opt}">${opt}</option>`)
        .join("");
  }

  bindEventListeners() {
    document.querySelectorAll('input[name="mode"]').forEach((radio) => {
      radio.addEventListener("change", () => this.updateUI());
    });

    document.querySelectorAll(".aggression-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const valueSpan = e.target
          .closest(".aggression-control")
          .querySelector(".aggression-value");
        valueSpan.textContent = e.target.value;
      });
    });

    document.querySelectorAll(".strategy-preset").forEach((select) => {
      select.addEventListener("change", (e) => {
        const row = e.target.closest(".player-row");
        const slider = row.querySelector(".aggression-slider");
        const valueSpan = row.querySelector(".aggression-value");

        const presets = { conservative: 25, normal: 50, aggressive: 75 };
        slider.value = presets[e.target.value];
        valueSpan.textContent = slider.value;
      });
    });

    document.querySelectorAll('input[name^="card-setup"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const row = e.target.closest(".player-row");
        const customCards = row.querySelector(".custom-cards");
        customCards.classList.toggle("hidden", e.target.value !== "custom");
      });
    });

    document.getElementById("run-simulation").addEventListener("click", () => {
      const numSims = parseInt(
        document.getElementById("num-simulations").value,
      );
      this.runBatchSimulation(numSims);
    });

    document
      .getElementById("deal-hand")
      .addEventListener("click", () => this.startStepMode());
    document
      .getElementById("next-trick")
      .addEventListener("click", () => this.nextTrick());
    document
      .getElementById("reset-simulation")
      .addEventListener("click", () => this.resetSimulation());
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
    document.getElementById("deal-hand").classList.toggle("hidden", isBatch);
    document.getElementById("next-trick").classList.toggle("hidden", isBatch);
    document.getElementById("step-results").classList.toggle("hidden", isBatch);
  }

  getPlayerSettings() {
    const settings = [];
    for (let i = 1; i <= 4; i++) {
      const row = document.querySelector(`[data-seat="${i}"]`);
      settings.push({
        name: row.querySelector(".player-name").value,
        aggressiveness: parseInt(row.querySelector(".aggression-slider").value),
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

  displayBatchResults() {
    const stats = this.batchStats;
    const teamStatsBody = document.getElementById("team-stats");
    const avgHands =
      stats.totalGames > 0
        ? (
            stats.gamesTo10.reduce((a, b) => a + b, 0) / stats.totalGames
          ).toFixed(1)
        : 0;

    teamStatsBody.innerHTML = `
            <tr>
                <td>Team 1&3</td>
                <td>${stats.totalGames > 0 ? ((stats.teamWins[0] / stats.totalGames) * 100).toFixed(1) : 0}%</td>
                <td>${avgHands}</td>
                <td>${stats.euchres[0]}</td>
                <td>${stats.loners[0]}</td>
            </tr>
            <tr>
                <td>Team 2&4</td>
                <td>${stats.totalGames > 0 ? ((stats.teamWins[1] / stats.totalGames) * 100).toFixed(1) : 0}%</td>
                <td>${avgHands}</td>
                <td>${stats.euchres[1]}</td>
                <td>${stats.loners[1]}</td>
            </tr>
        `;
    this.displayCardImpact();
  }

  displayCardImpact() {
    const cardImpactBody = document.getElementById("card-impact");
    cardImpactBody.innerHTML = "";
    const cardData = {};

    for (const [key, data] of Object.entries(this.batchStats.cardImpact)) {
      const [cardStr, seat] = key.split("-");
      const seatNum = parseInt(seat);

      if (!cardData[cardStr]) {
        cardData[cardStr] = ["-", "-", "-", "-"];
      }

      const winRate =
        data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : "0.0";
      cardData[cardStr][seatNum] = `${winRate}%`;
    }

    const sortedDeck = this.createDeck().sort(
      (a, b) => this.getCardValue(b, "S") - this.getCardValue(a, "S"),
    );

    const rows = sortedDeck
      .map((card) => {
        const cardKey = `${card.rank}${card.suit}`;
        const cardDisplay = this.cardToString(card);
        const data = cardData[cardKey] || ["-", "-", "-", "-"];
        return `
                <tr>
                    <td>${cardDisplay}</td>
                    <td>${data[0]}</td>
                    <td>${data[1]}</td>
                    <td>${data[2]}</td>
                    <td>${data[3]}</td>
                </tr>
            `;
      })
      .join("");

    cardImpactBody.innerHTML = rows;
  }

  resetSimulation() {
    this.currentGame = null;
    this.resetBatchStats();

    document.getElementById("team-stats").innerHTML = "";
    document.getElementById("card-impact").innerHTML = "";
    document.getElementById("game-log").innerHTML =
      '<p>Click "Run" or "Deal" to start.</p>';
    document.getElementById("team1-score").textContent = "0";
    document.getElementById("team2-score").textContent = "0";
    document.getElementById("trump-suit").textContent = "-";
    document.getElementById("upcard-display").textContent = "-";

    for (let i = 1; i <= 4; i++) {
      const playerHand = document
        .getElementById(`player-${i}`)
        .querySelector(".cards");
      if (playerHand) playerHand.innerHTML = "";
    }

    document.querySelectorAll(".card-placeholder").forEach((p) => {
      p.textContent = "";
      p.classList.remove("played");
    });

    document.getElementById("progress-bar").classList.add("hidden");
  }

  // The step-by-step mode would need a significant rewrite to match the new simulation engine.
  startStepMode() {
    alert("Step-by-step mode is not fully implemented in this version.");
  }
  nextTrick() {
    alert("Step-by-step mode is not fully implemented in this version.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new EuchreSimulator();
});
