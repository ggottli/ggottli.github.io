// src/bots.js

/**
 * Interface:
 *   constructor(name?: string)
 *   chooseMove(engine: GameEngine, playerIdx: number) → { action: 'play', cards: number[] } | { action: 'pickup' }
 */

import { GameEngine } from './gameEngine.js';

export class RandomBot {
  constructor(name = 'RandomBot') {
    this.name = name;
  }

  chooseMove(engine, playerIdx) {
    const player = engine.players[playerIdx];
    // Count how many of each rank the player has (hand + faceUp)
    const counts = {};
    [...player.hand, ...player.faceUp].forEach(r => {
      counts[r] = (counts[r] || 0) + 1;
    });

    // Build all legal play moves: for each rank ≤ lastValue (or ten), play 1..count copies
    const legalMoves = [];
    for (const rankStr of Object.keys(counts)) {
      const rank = Number(rankStr);
      if (engine.canPlay(rank)) {
        for (let qty = 1; qty <= counts[rank]; qty++) {
          legalMoves.push({ action: 'play', cards: Array(qty).fill(rank) });
        }
      }
    }

    // If no legal play, pick up
    if (legalMoves.length === 0) {
      return { action: 'pickup' };
    }

    // Otherwise pick one at random
    const idx = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[idx];
  }
}


export class LowestBot {
  constructor(name = 'LowestBot') {
    this.name = name;
  }

  chooseMove(engine, playerIdx) {
    const player = engine.players[playerIdx];
    const counts = {};
    [...player.hand, ...player.faceUp].forEach(r => {
      counts[r] = (counts[r] || 0) + 1;
    });

    // Try ranks in ascending order, playing all copies of the first legal rank
    const ranks = Object.keys(counts).map(Number).sort((a, b) => a - b);
    for (const rank of ranks) {
      if (engine.canPlay(rank)) {
        return { action: 'play', cards: Array(counts[rank]).fill(rank) };
      }
    }

    // No playable rank → pick up
    return { action: 'pickup' };
  }
}


// Optional export of all bots
export const bots = {
  RandomBot,
  LowestBot,
};
