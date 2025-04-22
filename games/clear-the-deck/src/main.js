// src/main.js

import { GameEngine } from './gameEngine.js';
import { bots } from './bots.js';
import {
  renderModeSelection,
  renderPlaySetup,
  renderSimulationSetup,
  renderGame,
  renderSimulationResults
} from './ui.js';

let engine;
let botList;
let statusMessage = '';
const humanIndex = 0;

/** Pause for the given milliseconds */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Entry point */
function main() {
  renderModeSelection(handleModeSelect);
}

/** Handle top‑level menu */
function handleModeSelect(mode) {
  if (mode === 'play') {
    handlePlayStart.__parentSelectMode = handleModeSelect;
    renderPlaySetup(handlePlayStart);
  } else if (mode === 'sim') {
    handleSimStart.__parentSelectMode = handleModeSelect;
    renderSimulationSetup(handleSimStart);
  }
}

/**
 * Live play: human vs. bots
 * @param {{ playerCount: number }} config
 */
async function handlePlayStart({ playerCount }) {
  // initialize engine and bots
  engine = new GameEngine(playerCount);
  engine.init();
  botList = Array.from({ length: playerCount }, (_, idx) =>
    idx === humanIndex ? null : new bots.RandomBot()
  );

  /** Re-render the game state */
  async function updateUI() {
    renderGame(
      {
        playerCount,
        players: engine.players,
        centerPile: engine.centerPile,
        currentPlayer: engine.currentPlayer,
        statusMessage
      },
      onPlay,
      onPickup
    );
  }

  /** Run bot turns until it's the human's turn again (or game over) */
  async function runBots() {
    while (!engine.isGameOver() && engine.currentPlayer !== humanIndex) {
      const idx = engine.currentPlayer;
      statusMessage = `Player ${idx + 1} (Bot) is thinking…`;
      await updateUI();
      await sleep(800);

      const move = botList[idx].chooseMove(engine, idx);
      if (move.action === 'play') {
        engine.playCards(idx, move.cards);
        statusMessage = `Player ${idx + 1} played ${move.cards.length}×${move.cards[0]}`;
      } else {
        engine.pickUpCenter(idx);
        statusMessage = `Player ${idx + 1} picked up the pile`;
      }
      await updateUI();
      await sleep(800);
    }
    statusMessage = '';
    await updateUI();
  }

  /** Callback when human plays cards */
  const onPlay = async (cards) => {
    if (engine.currentPlayer !== humanIndex) return;
    engine.playCards(humanIndex, cards);
    await runBots();
  };
  onPlay.__parentSelectMode = handleModeSelect;

  /** Callback when human picks up */
  const onPickup = async () => {
    if (engine.currentPlayer !== humanIndex) return;
    engine.pickUpCenter(humanIndex);
    await runBots();
  };
  onPickup.__parentSelectMode = handleModeSelect;

  // initial render
  await updateUI();
}

/**
 * Simulation mode: bots only
 * @param {{ playerCount: number, botName: string, numGames: number }} config
 */
function handleSimStart({ playerCount, botName, numGames }) {
  handleSimStart.__parentSelectMode = handleModeSelect;

  if (!bots[botName]) {
    console.error(`Bot strategy "${botName}" not found.`);
    return;
  }
  const BotClass = bots[botName];
  botList = Array.from({ length: playerCount }, () => new BotClass());
  const wins = Array(playerCount).fill(0);

  for (let game = 0; game < numGames; game++) {
    engine = new GameEngine(playerCount);
    engine.init();

    while (!engine.isGameOver()) {
      const idx = engine.currentPlayer;
      const move = botList[idx].chooseMove(engine, idx);
      if (move.action === 'play') {
        engine.playCards(idx, move.cards);
      } else {
        engine.pickUpCenter(idx);
      }
    }

    const winner = engine.players.findIndex(p =>
      p.hand.length === 0 &&
      p.faceUp.length === 0 &&
      p.faceDown.length === 0
    );
    if (winner >= 0) wins[winner]++;
  }

  const results = { totalGames: numGames, wins };
  renderSimulationResults.__parentSelectMode = handleModeSelect;
  renderSimulationResults(results);
}

// start the app
main();
