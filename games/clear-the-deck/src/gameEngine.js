// src/gameEngine.js

export class GameEngine {
    constructor(playerCount) {
      this.playerCount = playerCount;
      this.players = [];       // each: { hand: [], faceUp: [], faceDown: [] }
      this.centerPile = [];    // cards in play
      this.discardPile = [];   // cleared cards (not used for drawing)
      this.currentPlayer = 0;  // whose turn it is
      this.lastValue = null;   // rank of the last legal play
    }
  
    // Initialize deck, shuffle, and deal to players
    init() {
      this._makeDeck();
      this._shuffle();
      this._deal();
    }
  
    _makeDeck() {
      this.deck = [];
      // compute decks needed so each player gets 20 cards
      const decksNeeded = Math.ceil((20 * this.playerCount) / 52);
      const ranks = [1,2,3,4,5,6,7,8,9,10,11,12,13];
      for (let d = 0; d < decksNeeded; d++) {
        for (let r of ranks) {
          // four suits per rank (suits don’t matter)
          for (let i = 0; i < 4; i++) {
            this.deck.push(r);
          }
        }
      }
    }
  
    _shuffle() {
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
  
    _deal() {
      // set up empty players
      this.players = Array.from({length: this.playerCount}, () => ({
        hand: [], faceUp: [], faceDown: []
      }));
      // deal 4 face‑down cards
      for (let i = 0; i < 4; i++) {
        this.players.forEach(p => p.faceDown.push(this.deck.pop()));
      }
      // deal 4 face‑up cards
      for (let i = 0; i < 4; i++) {
        this.players.forEach(p => p.faceUp.push(this.deck.pop()));
      }
      // deal 12 cards to each player’s hand
      for (let i = 0; i < 12; i++) {
        this.players.forEach(p => p.hand.push(this.deck.pop()));
      }
    }
  
    /**
     * Player plays an array of cards (all same rank).
     * Returns an object { extraTurn: boolean, type: 'play'|'pickup'|'clear' }.
     */
    playCards(playerIdx, cards) {
      if (playerIdx !== this.currentPlayer) {
        throw new Error(`It's not player ${playerIdx}'s turn.`);
      }
      if (!cards || cards.length === 0) {
        throw new Error('No cards provided to play.');
      }
      const rank = cards[0];
      if (!cards.every(c => c === rank)) {
        throw new Error('All played cards must be the same rank.');
      }
  
      const player = this.players[playerIdx];
      // Check availability: count occurrences in hand + faceUp
      let available = [...player.hand, ...player.faceUp].filter(c => c === rank).length;
      if (available < cards.length) {
        throw new Error(`Player ${playerIdx} does not have ${cards.length} of rank ${rank}.`);
      }
  
      // Remove cards from hand first, then faceUp
      let toRemove = cards.length;
      while (toRemove > 0 && player.hand.includes(rank)) {
        player.hand.splice(player.hand.indexOf(rank), 1);
        toRemove--;
      }
      while (toRemove > 0 && player.faceUp.includes(rank)) {
        player.faceUp.splice(player.faceUp.indexOf(rank), 1);
        toRemove--;
      }
  
      // Place them onto the center pile
      this.centerPile.push(...cards);
  
      // --- WILD TEN: clear immediately ---
      if (rank === 10) {
        this.clearCenter(playerIdx);
        return { extraTurn: true, type: 'clear' };
      }
  
      const oldLast = this.lastValue;
  
      // --- PLAY TOO HIGH: pick up the entire pile ---
      if (oldLast !== null && rank > oldLast) {
        this.pickUpCenter(playerIdx);
        return { extraTurn: true, type: 'pickup' };
      }
  
      // --- CHECK FOR SET: 4+ of same rank in center ---
      const sameCount = this.centerPile.filter(c => c === rank).length;
      if (sameCount >= 4) {
        this.clearCenter(playerIdx);
        return { extraTurn: true, type: 'clear' };
      }
  
      // --- Normal play: advance turn and update lastValue ---
      this.lastValue = rank;
      this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
      return { extraTurn: false, type: 'play' };
    }
  
    /** Player picks up the entire center pile into their hand. */
    pickUpCenter(playerIdx) {
      this.players[playerIdx].hand.push(...this.centerPile);
      this.centerPile = [];
      this.lastValue = null;
      // currentPlayer stays the same (extra turn)
    }
  
    /** Clear the center pile to the discard pile. */
    clearCenter(playerIdx) {
      this.discardPile.push(...this.centerPile);
      this.centerPile = [];
      this.lastValue = null;
      // currentPlayer stays the same (extra turn)
    }
  
    /**
     * Helper for bots: returns true if playing `rank` would be legal
     * (i.e. it won't force a pick‑up).  Tens always clear, so treat as legal.
     */
    canPlay(rank) {
      if (this.centerPile.length === 0) return true;
      if (rank === 10) return true;
      return this.lastValue === null || rank <= this.lastValue;
    }
  
    /**
     * Reveal (and remove) a face‑down card for playerIdx.
     * Only allowed when their faceUp array is empty.
     */
    revealFaceDown(playerIdx) {
      const p = this.players[playerIdx];
      if (p.faceUp.length > 0) {
        throw new Error('Must clear all face‑up cards before revealing face‑down.');
      }
      if (p.faceDown.length === 0) {
        throw new Error('No face‑down cards to reveal.');
      }
      return p.faceDown.pop();
    }
  
    /** Returns true if any player has played all their cards. */
    isGameOver() {
      return this.players.some(p =>
        p.hand.length === 0 &&
        p.faceUp.length === 0 &&
        p.faceDown.length === 0
      );
    }
  }
  