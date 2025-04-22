#!/usr/bin/env node

import { GameEngine } from '../src/gameEngine.js';
import { bots } from '../src/bots.js';

// Parse CLI args: [numGames] [playerCount] [botName]
const [ rawNumGames, rawPlayerCount, botName = 'RandomBot' ] = process.argv.slice(2);
const numGames    = parseInt(rawNumGames, 10)    || 1000;
const playerCount = parseInt(rawPlayerCount, 10) || 2;

if (!bots[botName]) {
  console.error(`\n⚠️  Bot strategy "${botName}" not found. Available: ${Object.keys(bots).join(', ')}\n`);
  process.exit(1);
}

const BotClass = bots[botName];
const wins = Array(playerCount).fill(0);
let totalRounds = 0;

for (let game = 0; game < numGames; game++) {
  const engine = new GameEngine(playerCount);
  engine.init();

  // instantiate one bot per seat
  const botList = Array.from({ length: playerCount }, () => new BotClass());

  let rounds = 0;
  // play until someone goes out
  while (!engine.isGameOver()) {
    const idx = engine.currentPlayer;
    const move = botList[idx].chooseMove(engine, idx);

    if (move.action === 'play') {
      engine.playCards(idx, move.cards);
    } else {
      engine.pickUpCenter(idx);
    }

    rounds++;
  }

  // find the winner (first player with no cards left)
  const winner = engine.players.findIndex(p =>
    p.hand.length === 0 &&
    p.faceUp.length === 0 &&
    p.faceDown.length === 0
  );
  if (winner >= 0) wins[winner]++;
  totalRounds += rounds;
}

// Output summary
console.log('\n🎲  Simulation complete');
console.log(`• Strategy:   ${botName}`);
console.log(`• Players:    ${playerCount}`);
console.log(`• Games run:  ${numGames}`);
console.log(`• Avg rounds: ${(totalRounds / numGames).toFixed(1)}\n`);

const results = wins.map((w, i) => ({
  Player:    `Player ${i + 1}`,
  Wins:      w,
  'Win %':   ((w / numGames) * 100).toFixed(1) + '%'
}));

console.table(results);
