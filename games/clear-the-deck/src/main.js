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
const humanPlayerIdx = 0;

// Kick things off
function main() {
  renderModeSelection(handleModeSelect);
}

/** Handle top‑level menu choice */
function handleModeSelect(mode) {
  if (mode === 'play') {
    // so “Back” knows where to go
    handlePlayStart.__parentSelectMode = handleModeSelect;
    renderPlaySetup(handlePlayStart);
  } else if (mode === 'sim') {
    handleSimStart.__parentSelectMode = handleModeSelect;
    renderSimulationSetup(handleSimStart);
  }
}

/** Start a live game: human vs. CPUs */
function handlePlayStart({ playerCount }) {
  // 1) Init engine
  engine = new GameEngine(playerCount);
  engine.init();

  // 2) Create bots for slots 1…playerCount-1
  botList = Array(playerCount);
  for (let i = 1; i < playerCount; i++) {
    botList[i] = new bots.RandomBot();  // you could let user pick strategy later
  }

  // 3) Human “Play” callback
  function onPlay(cards) {
    if (engine.currentPlayer !== humanPlayerIdx) return;
    engine.playCards(humanPlayerIdx, cards);
    runBots();
    updateGameUI();
  }
  onPlay.__parentSelectMode = handleModeSelect;

  // 4) Human “Pick up” callback
  function onPickup() {
    if (engine.currentPlayer !== humanPlayerIdx) return;
    engine.pickUpCenter(humanPlayerIdx);
    runBots();
    updateGameUI();
  }
  onPickup.__parentSelectMode = handleModeSelect;

  // 5) Run bot turns until it’s human’s turn (or game over)
  function runBots() {
    while (!engine.isGameOver() && engine.currentPlayer !== humanPlayerIdx) {
      const idx = engine.currentPlayer;
      const move = botList[idx].chooseMove(engine, idx);
      if (move.action === 'play') {
        engine.playCards(idx, move.cards);
      } else {
        engine.pickUpCenter(idx);
      }
    }
  }

  // 6) Render the current game state
  function updateGameUI() {
    renderGame(
      {
        playerCount,
        players: engine.players,
        centerPile: engine.centerPile,
        currentPlayer: engine.currentPlayer
      },
      onPlay,
      onPickup
    );
  }

  // initial render
  updateGameUI();
}


/** Run N games of bots-only and show stats */
function handleSimStart({ playerCount, botName, numGames }) {
  // so “Back” works
  handleSimStart.__parentSelectMode = handleModeSelect;
  // pick the class
  const BotClass = bots[botName];

  // prepare bot instances for every seat
  botList = Array(playerCount).fill().map(() => new BotClass());

  const wins = Array(playerCount).fill(0);

  // simulate
  for (let i = 0; i < numGames; i++) {
    engine = new GameEngine(playerCount);
    engine.init();
    // play until someone goes out
    while (!engine.isGameOver()) {
      const idx = engine.currentPlayer;
      const move = botList[idx].chooseMove(engine, idx);
      if (move.action === 'play') {
        engine.playCards(idx, move.cards);
      } else {
        engine.pickUpCenter(idx);
      }
    }
    // find the winner (empty slots)
    const winner = engine.players.findIndex(p =>
      p.hand.length === 0 &&
      p.faceUp.length === 0 &&
      p.faceDown.length === 0
    );
    wins[winner]++;
  }

  const results = { totalGames: numGames, wins };
  // attach for “Back” button
  renderSimulationResults.__parentSelectMode = handleModeSelect;
  renderSimulationResults(results);
}


// start the app!
main();
