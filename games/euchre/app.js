// Euchre Simulator - Core Logic
class EuchreSimulator {
    constructor() {
        this.suits = ['S', 'H', 'D', 'C'];
        this.ranks = ['9', 'T', 'J', 'Q', 'K', 'A'];
        this.suitSymbols = { 'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣' };
        this.rankNames = { '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
        
        this.currentGame = null;
        this.batchStats = {
            totalGames: 0,
            teamWins: [0, 0],
            gamesTo10: [],
            euchres: [0, 0],
            loners: [0, 0],
            cardImpact: {}
        };
        
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

    getCardValue(card, trumpSuit) {
        const { suit, rank } = card;
        
        // Right bower (Jack of trump)
        if (rank === 'J' && suit === trumpSuit) return 11;
        
        // Left bower (Jack of same color as trump)
        if (rank === 'J' && this.getSameColorSuit(suit) === trumpSuit) return 10;
        
        // Trump cards
        if (suit === trumpSuit) {
            const trumpValues = { 'A': 9, 'K': 8, 'Q': 7, 'T': 6, '9': 5 };
            return trumpValues[rank];
        }
        
        // Non-trump cards
        const nonTrumpValues = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1, 'T': 0, '9': -1 };
        return nonTrumpValues[rank];
    }

    getSameColorSuit(suit) {
        const colorMap = { 'S': 'C', 'C': 'S', 'H': 'D', 'D': 'H' };
        return colorMap[suit];
    }

    getEffectiveSuit(card, trumpSuit) {
        // Left bower is considered trump suit
        if (card.rank === 'J' && this.getSameColorSuit(card.suit) === trumpSuit) {
            return trumpSuit;
        }
        return card.suit;
    }

    cardToString(card) {
        return `${this.rankNames[card.rank]}${this.suitSymbols[card.suit]}`;
    }

    stringToCard(str) {
        const suitSymbol = str.slice(-1);
        const rankStr = str.slice(0, -1);
        const suit = Object.keys(this.suitSymbols).find(s => this.suitSymbols[s] === suitSymbol);
        const rank = Object.keys(this.rankNames).find(r => this.rankNames[r] === rankStr);
        return { suit, rank };
    }

    // Game logic
    deal() {
        const deck = this.shuffleDeck(this.createDeck());
        const hands = [[], [], [], []];
        
        // Deal 3-2 pattern
        let cardIndex = 0;
        for (let round = 0; round < 2; round++) {
            for (let player = 0; player < 4; player++) {
                const cardsThisRound = round === 0 ? 3 : 2;
                for (let i = 0; i < cardsThisRound; i++) {
                    hands[player].push(deck[cardIndex++]);
                }
            }
        }
        
        const upcard = deck[cardIndex++];
        const kitty = deck.slice(cardIndex);
        
        return { hands, upcard, kitty };
    }

    calculateHandScore(hand, trumpSuit) {
        let score = 0;
        let trumpCount = 0;
        
        for (const card of hand) {
            const effectiveSuit = this.getEffectiveSuit(card, trumpSuit);
            if (effectiveSuit === trumpSuit) {
                trumpCount++;
                score += this.getCardValue(card, trumpSuit);
            } else if (card.rank === 'A') {
                score += 2;
            }
        }
        
        // Bonus for multiple trump
        if (trumpCount >= 3) score += 5;
        if (trumpCount >= 4) score += 10;
        
        return score;
    }

    shouldBid(hand, upcard, trumpSuit, aggressiveness, position) {
        const handWithUpcard = position === 3 ? [...hand, upcard] : hand;
        const handScore = this.calculateHandScore(handWithUpcard, trumpSuit);
        
        // Adjust threshold based on aggressiveness
        const baseThreshold = 15;
        const threshold = baseThreshold - (aggressiveness - 50) * 0.2;
        
        return handScore >= threshold;
    }

    determineWinner(trick, trumpSuit, leadSuit) {
        let winnerIndex = 0;
        let highestValue = -1;
        
        for (let i = 0; i < trick.length; i++) {
            const card = trick[i];
            const effectiveSuit = this.getEffectiveSuit(card, trumpSuit);
            let value = this.getCardValue(card, trumpSuit);
            
            // Boost value if following suit or trump
            if (effectiveSuit === trumpSuit) {
                value += 100; // Trump always wins
            } else if (effectiveSuit === leadSuit) {
                value += 50; // Following suit
            }
            
            if (value > highestValue) {
                highestValue = value;
                winnerIndex = i;
            }
        }
        
        return winnerIndex;
    }

    playCard(hand, trick, trumpSuit, leadSuit, aggressiveness) {
        const validCards = this.getValidCards(hand, leadSuit, trumpSuit);
        
        if (validCards.length === 1) return validCards[0];
        
        // Simple AI strategy
        if (leadSuit === null) {
            // Leading - play highest card if aggressive, lowest if conservative
            validCards.sort((a, b) => this.getCardValue(b, trumpSuit) - this.getCardValue(a, trumpSuit));
            return aggressiveness > 50 ? validCards[0] : validCards[validCards.length - 1];
        }
        
        // Following suit
        const canWin = this.canWinTrick(validCards, trick, trumpSuit, leadSuit);
        if (canWin && aggressiveness > 30) {
            // Play to win
            return this.getLowestWinning(validCards, trick, trumpSuit, leadSuit);
        } else {
            // Play lowest card
            validCards.sort((a, b) => this.getCardValue(a, trumpSuit) - this.getCardValue(b, trumpSuit));
            return validCards[0];
        }
    }

    getValidCards(hand, leadSuit, trumpSuit) {
        if (leadSuit === null) return hand; // Can play any card when leading
        
        const followingSuit = hand.filter(card => this.getEffectiveSuit(card, trumpSuit) === leadSuit);
        return followingSuit.length > 0 ? followingSuit : hand;
    }

    canWinTrick(validCards, trick, trumpSuit, leadSuit) {
        const currentWinner = this.determineWinner(trick, trumpSuit, leadSuit);
        const winningCard = trick[currentWinner];
        const winningValue = this.getCardValue(winningCard, trumpSuit);
        
        return validCards.some(card => this.getCardValue(card, trumpSuit) > winningValue);
    }

    getLowestWinning(validCards, trick, trumpSuit, leadSuit) {
        const currentWinner = this.determineWinner(trick, trumpSuit, leadSuit);
        const winningCard = trick[currentWinner];
        const winningValue = this.getCardValue(winningCard, trumpSuit);
        
        const winningCards = validCards.filter(card => this.getCardValue(card, trumpSuit) > winningValue);
        winningCards.sort((a, b) => this.getCardValue(a, trumpSuit) - this.getCardValue(b, trumpSuit));
        
        return winningCards[0];
    }

    // Simulation methods
    runBatchSimulation(numGames) {
        this.batchStats = {
            totalGames: 0,
            teamWins: [0, 0],
            gamesTo10: [],
            euchres: [0, 0],
            loners: [0, 0],
            cardImpact: {}
        };

        const settings = this.getPlayerSettings();
        let completed = 0;
        
        const runBatch = () => {
            const batchSize = Math.min(100, numGames - completed);
            
            for (let i = 0; i < batchSize; i++) {
                const result = this.simulateGame(settings);
                this.updateBatchStats(result);
                completed++;
            }
            
            this.updateProgress(completed / numGames);
            
            if (completed < numGames) {
                setTimeout(runBatch, 1);
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
            cardImpact: [],
            euchres: [0, 0],
            loners: [0, 0]
        };
        
        while (game.score[0] < 10 && game.score[1] < 10) {
            const handResult = this.simulateHand(settings);
            game.score[handResult.winner % 2] += handResult.points;
            game.hands++;
            
            if (handResult.euchre) {
                game.euchres[handResult.winner % 2]++;
            }
            if (handResult.loner) {
                game.loners[handResult.winner % 2]++;
            }
            
            game.cardImpact.push(...handResult.cardImpact);
        }
        
        return game;
    }

    simulateHand(settings) {
        const { hands, upcard } = this.deal();
        
        // Bidding phase
        let trumpSuit = null;
        let maker = -1;
        let loner = false;
        
        // First round bidding (upcard)
        for (let i = 0; i < 4; i++) {
            if (this.shouldBid(hands[i], upcard, upcard.suit, settings[i].aggressiveness, i)) {
                trumpSuit = upcard.suit;
                maker = i;
                if (i === 3) hands[i].push(upcard); // Dealer picks up
                break;
            }
        }
        
        // Second round bidding (if needed)
        if (trumpSuit === null) {
            for (let i = 0; i < 4; i++) {
                for (const suit of this.suits) {
                    if (suit !== upcard.suit && this.shouldBid(hands[i], null, suit, settings[i].aggressiveness, i)) {
                        trumpSuit = suit;
                        maker = i;
                        break;
                    }
                }
                if (trumpSuit) break;
            }
        }
        
        // Force dealer to pick if all pass
        if (trumpSuit === null) {
            trumpSuit = this.suits[Math.floor(Math.random() * this.suits.length)];
            maker = 3;
        }
        
        // Play 5 tricks
        let tricksWon = [0, 0];
        const cardImpact = [];
        
        for (let trick = 0; trick < 5; trick++) {
            const trickCards = [];
            let leadSuit = null;
            
            for (let i = 0; i < 4; i++) {
                const card = this.playCard(hands[i], trickCards, trumpSuit, leadSuit, settings[i].aggressiveness);
                
                if (i === 0) {
                    leadSuit = this.getEffectiveSuit(card, trumpSuit);
                    // Track card impact for first card of trick
                    cardImpact.push({
                        card: card,
                        seat: i,
                        trick: trick
                    });
                }
                
                trickCards.push(card);
                hands[i] = hands[i].filter(c => c !== card);
            }
            
            const winner = this.determineWinner(trickCards, trumpSuit, leadSuit);
            tricksWon[winner % 2]++;
        }
        
        // Determine points and winner
        const makerTeam = maker % 2;
        const points = tricksWon[makerTeam] >= 3 ? 
            (tricksWon[makerTeam] === 5 ? 2 : 1) : 0;
        
        const euchre = points === 0;
        const winner = euchre ? 1 - makerTeam : makerTeam;
        const actualPoints = euchre ? 2 : points;
        
        return {
            winner,
            points: actualPoints,
            euchre,
            loner,
            cardImpact
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
        
        // Update card impact
        for (const impact of result.cardImpact) {
            const key = `${impact.card.rank}${impact.card.suit}-${impact.seat}`;
            if (!this.batchStats.cardImpact[key]) {
                this.batchStats.cardImpact[key] = { wins: 0, total: 0 };
            }
            this.batchStats.cardImpact[key].total++;
            if (result.winner === impact.seat % 2) {
                this.batchStats.cardImpact[key].wins++;
            }
        }
    }

    // Step-by-step simulation
    startStepMode() {
        const settings = this.getPlayerSettings();
        this.currentGame = this.createStepGame(settings);
        this.displayStepGame();
    }

    createStepGame(settings) {
        const { hands, upcard } = this.deal();
        
        return {
            hands,
            upcard,
            trumpSuit: null,
            maker: -1,
            currentTrick: 0,
            currentPlayer: 0,
            trickCards: [],
            tricksWon: [0, 0],
            score: [0, 0],
            leadSuit: null,
            settings,
            log: []
        };
    }

    nextTrick() {
        if (!this.currentGame) return;
        
        const game = this.currentGame;
        
        // Handle bidding if not done
        if (game.trumpSuit === null) {
            this.handleBidding();
            return;
        }
        
        // Play one card
        if (game.trickCards.length < 4) {
            const card = this.playCard(
                game.hands[game.currentPlayer],
                game.trickCards,
                game.trumpSuit,
                game.leadSuit,
                game.settings[game.currentPlayer].aggressiveness
            );
            
            if (game.trickCards.length === 0) {
                game.leadSuit = this.getEffectiveSuit(card, game.trumpSuit);
            }
            
            game.trickCards.push(card);
            game.hands[game.currentPlayer] = game.hands[game.currentPlayer].filter(c => c !== card);
            
            game.log.push(`${game.settings[game.currentPlayer].name} plays ${this.cardToString(card)}`);
            
            game.currentPlayer = (game.currentPlayer + 1) % 4;
            
            // Check if trick is complete
            if (game.trickCards.length === 4) {
                const winner = this.determineWinner(game.trickCards, game.trumpSuit, game.leadSuit);
                game.tricksWon[winner % 2]++;
                game.log.push(`${game.settings[winner].name} wins the trick`);
                
                game.currentTrick++;
                game.currentPlayer = winner;
                game.trickCards = [];
                game.leadSuit = null;
                
                // Check if hand is complete
                if (game.currentTrick === 5) {
                    this.finishHand();
                }
            }
        }
        
        this.displayStepGame();
    }

    handleBidding() {
        const game = this.currentGame;
        
        // Simple bidding - first player to bid takes it
        for (let i = 0; i < 4; i++) {
            if (this.shouldBid(game.hands[i], game.upcard, game.upcard.suit, game.settings[i].aggressiveness, i)) {
                game.trumpSuit = game.upcard.suit;
                game.maker = i;
                if (i === 3) game.hands[i].push(game.upcard);
                game.log.push(`${game.settings[i].name} calls ${this.suitSymbols[game.trumpSuit]} trump`);
                return;
            }
        }
        
        // All pass, dealer forced to pick
        game.trumpSuit = game.upcard.suit;
        game.maker = 3;
        game.hands[3].push(game.upcard);
        game.log.push(`${game.settings[3].name} is stuck with ${this.suitSymbols[game.trumpSuit]} trump`);
    }

    finishHand() {
        const game = this.currentGame;
        const makerTeam = game.maker % 2;
        const points = game.tricksWon[makerTeam] >= 3 ? 
            (game.tricksWon[makerTeam] === 5 ? 2 : 1) : 0;
        
        if (points === 0) {
            // Euchre
            game.score[1 - makerTeam] += 2;
            game.log.push(`Euchre! Team ${1 - makerTeam + 1} scores 2 points`);
        } else {
            game.score[makerTeam] += points;
            game.log.push(`Team ${makerTeam + 1} scores ${points} points`);
        }
        
        if (game.score[0] >= 10 || game.score[1] >= 10) {
            const winner = game.score[0] >= 10 ? 0 : 1;
            game.log.push(`Game Over! Team ${winner + 1} wins!`);
        }
    }

    // UI Methods
    initializeUI() {
        this.populateCardSelectors();
        this.bindEventListeners();
        this.updateUI();
    }

    populateCardSelectors() {
        const options = [''];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                options.push(`${this.rankNames[rank]}${this.suitSymbols[suit]}`);
            }
        }
        
        document.querySelectorAll('.card-selector').forEach(select => {
            select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
        });
        
        const upcardSelect = document.getElementById('upcard-selector');
        upcardSelect.innerHTML = '<option value="random">Random Upcard</option>' + 
            options.slice(1).map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }

    bindEventListeners() {
        // Mode selection
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateUI());
        });
        
        // Player settings
        document.querySelectorAll('.aggression-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const valueSpan = e.target.parentElement.querySelector('.aggression-value');
                valueSpan.textContent = e.target.value;
            });
        });
        
        document.querySelectorAll('.strategy-preset').forEach(select => {
            select.addEventListener('change', (e) => {
                const row = e.target.closest('.player-row');
                const slider = row.querySelector('.aggression-slider');
                const valueSpan = row.querySelector('.aggression-value');
                
                const presets = { conservative: 25, normal: 50, aggressive: 75 };
                slider.value = presets[e.target.value];
                valueSpan.textContent = slider.value;
            });
        });
        
        // Card setup toggles
        document.querySelectorAll('input[name^="card-setup"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const row = e.target.closest('.player-row');
                const customCards = row.querySelector('.custom-cards');
                
                if (e.target.value === 'custom') {
                    customCards.classList.remove('hidden');
                } else {
                    customCards.classList.add('hidden');
                }
            });
        });
        
        // Action buttons
        document.getElementById('run-simulation').addEventListener('click', () => {
            const numSims = parseInt(document.getElementById('num-simulations').value);
            this.runBatchSimulation(numSims);
        });
        
        document.getElementById('deal-hand').addEventListener('click', () => {
            this.startStepMode();
        });
        
        document.getElementById('next-trick').addEventListener('click', () => {
            this.nextTrick();
        });
        
        document.getElementById('reset-simulation').addEventListener('click', () => {
            this.resetSimulation();
        });
    }

    updateUI() {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const batchSettings = document.getElementById('batch-settings');
        const runButton = document.getElementById('run-simulation');
        const dealButton = document.getElementById('deal-hand');
        const nextButton = document.getElementById('next-trick');
        const batchResults = document.getElementById('batch-results');
        const stepResults = document.getElementById('step-results');
        
        if (mode === 'batch') {
            batchSettings.classList.remove('hidden');
            runButton.classList.remove('hidden');
            dealButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            batchResults.classList.remove('hidden');
            stepResults.classList.add('hidden');
        } else {
            batchSettings.classList.add('hidden');
            runButton.classList.add('hidden');
            dealButton.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            batchResults.classList.add('hidden');
            stepResults.classList.remove('hidden');
        }
    }

    getPlayerSettings() {
        const settings = [];
        
        for (let i = 1; i <= 4; i++) {
            const row = document.querySelector(`[data-seat="${i}"]`);
            settings.push({
                name: row.querySelector('.player-name').value,
                aggressiveness: parseInt(row.querySelector('.aggression-slider').value),
                strategy: row.querySelector('.strategy-preset').value
            });
        }
        
        return settings;
    }

    updateProgress(progress) {
        const progressBar = document.getElementById('progress-bar');
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressText = progressBar.querySelector('.progress-text');
        
        progressBar.classList.remove('hidden');
        progressFill.style.width = `${progress * 100}%`;
        progressText.textContent = `${Math.round(progress * 100)}%`;
        
        if (progress >= 1) {
            setTimeout(() => progressBar.classList.add('hidden'), 1000);
        }
    }

    displayBatchResults() {
        const stats = this.batchStats;
        const teamStatsBody = document.getElementById('team-stats');
        
        teamStatsBody.innerHTML = `
            <tr>
                <td>Team 1&3</td>
                <td>${(stats.teamWins[0] / stats.totalGames * 100).toFixed(1)}%</td>
                <td>${(stats.gamesTo10.reduce((a, b) => a + b, 0) / stats.totalGames).toFixed(1)}</td>
                <td>${stats.euchres[0]}</td>
                <td>${stats.loners[0]}</td>
            </tr>
            <tr>
                <td>Team 2&4</td>
                <td>${(stats.teamWins[1] / stats.totalGames * 100).toFixed(1)}%</td>
                <td>${(stats.gamesTo10.reduce((a, b) => a + b, 0) / stats.totalGames).toFixed(1)}</td>
                <td>${stats.euchres[1]}</td>
                <td>${stats.loners[1]}</td>
            </tr>
        `;
        
        this.displayCardImpact();
    }

    displayCardImpact() {
        const cardImpactBody = document.getElementById('card-impact');
        const cardData = {};
        
        // Organize data by card
        for (const [key, data] of Object.entries(this.batchStats.cardImpact)) {
            const [card, seat] = key.split('-');
            const seatNum = parseInt(seat);
            
            if (!cardData[card]) {
                cardData[card] = ['-', '-', '-', '-'];
            }
            
            const winRate = data.total > 0 ? (data.wins / data.total * 100).toFixed(1) : '0.0';
            cardData[card][seatNum] = `${winRate}%`;
        }
        
        // Create rows
        const rows = [];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                const cardKey = `${rank}${suit}`;
                const cardDisplay = `${this.rankNames[rank]}${this.suitSymbols[suit]}`;
                const data = cardData[cardKey] || ['-', '-', '-', '-'];
                
                rows.push(`
                    <tr>
                        <td>${cardDisplay}</td>
                        <td>${data[0]}</td>
                        <td>${data[1]}</td>
                        <td>${data[2]}</td>
                        <td>${data[3]}</td>
                    </tr>
                `);
            }
        }
        
        cardImpactBody.innerHTML = rows.join('');
    }

    displayStepGame() {
        if (!this.currentGame) return;
        
        const game = this.currentGame;
        
        // Update score
        document.getElementById('team1-score').textContent = game.score[0];
        document.getElementById('team2-score').textContent = game.score[1];
        
        // Update trump
        document.getElementById('trump-suit').textContent = 
            game.trumpSuit ? this.suitSymbols[game.trumpSuit] : '-';
        document.getElementById('upcard-display').textContent = 
            game.upcard ? this.cardToString(game.upcard) : '-';
        
        // Update hands
        for (let i = 0; i < 4; i++) {
            const playerDiv = document.getElementById(`player-${i + 1}`);
            const cardsDiv = playerDiv.querySelector('.cards');
            
            playerDiv.querySelector('h5').textContent = `${game.settings[i].name} (${['North', 'East', 'South', 'West'][i]})`;
            
            cardsDiv.innerHTML = game.hands[i]
                .map(card => `<span class="card">${this.cardToString(card)}</span>`)
                .join('');
        }
        
        // Update trick
        const trickCards = document.getElementById('trick-cards');
        const trickCardDivs = trickCards.querySelectorAll('.trick-card');
        
        trickCardDivs.forEach((div, i) => {
            const placeholder = div.querySelector('.card-placeholder');
            
            if (i < game.trickCards.length) {
                placeholder.textContent = this.cardToString(game.trickCards[i]);
                placeholder.classList.add('played');
            } else {
                placeholder.textContent = '';
                placeholder.classList.remove('played');
            }
            
            // Highlight current player
            if (i === game.currentPlayer && game.trickCards.length < 4) {
                div.classList.add('current-player');
            } else {
                div.classList.remove('current-player');
            }
        });
        
        // Update log
        const gameLog = document.getElementById('game-log');
        gameLog.innerHTML = game.log.map(msg => `<p>${msg}</p>`).join('');
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    resetSimulation() {
        this.currentGame = null;
        this.batchStats = {
            totalGames: 0,
            teamWins: [0, 0],
            gamesTo10: [],
            euchres: [0, 0],
            loners: [0, 0],
            cardImpact: {}
        };
        
        // Clear results
        document.getElementById('team-stats').innerHTML = '';
        document.getElementById('card-impact').innerHTML = '';
        document.getElementById('game-log').innerHTML = '<p>Click "Deal Hand" to start a new game.</p>';
        
        // Reset scores
        document.getElementById('team1-score').textContent = '0';
        document.getElementById('team2-score').textContent = '0';
        document.getElementById('trump-suit').textContent = '-';
        document.getElementById('upcard-display').textContent = '-';
        
        // Clear hands and trick
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`player-${i}`).querySelector('.cards').innerHTML = '';
        }
        
        document.querySelectorAll('.card-placeholder').forEach(placeholder => {
            placeholder.textContent = '';
            placeholder.classList.remove('played');
        });
        
        document.querySelectorAll('.trick-card').forEach(div => {
            div.classList.remove('current-player');
        });
        
        // Hide progress bar
        document.getElementById('progress-bar').classList.add('hidden');
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EuchreSimulator();
});