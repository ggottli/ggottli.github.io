// src/ui.js

import { bots } from './bots.js';

/** ID of the root container in index.html */
const ROOT_ID = 'game-root';

/**
 * Convert numeric rank to the DeckOfCardsAPI image code.
 * Note: tens are '0' in the API, not 'T'.
 */
function rankToCode(rank) {
  switch (rank) {
    case 1:  return 'AH';
    case 11: return 'JH';
    case 12: return 'QH';
    case 13: return 'KH';
    case 10: return '0H';       // TEN → '0H'
    default: return `${rank}H`;
  }
}

/**
 * Render top‑level menu.
 */
export function renderModeSelection(onSelectMode) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = `
    <div class="flex flex-col items-center space-y-6 p-8">
      <h1 class="text-4xl font-bold">Clear the Deck</h1>
      <button id="mode-play" class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
        Play vs. Bots
      </button>
      <button id="mode-sim" class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
        Run Simulation
      </button>
    </div>
  `;
  document.getElementById('mode-play')
          .addEventListener('click', () => onSelectMode('play'));
  document.getElementById('mode-sim')
          .addEventListener('click', () => onSelectMode('sim'));
}

/**
 * Render play‑setup form.
 */
export function renderPlaySetup(onStart) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = `
    <div class="max-w-md mx-auto p-6 space-y-4 bg-white rounded shadow">
      <h2 class="text-2xl font-semibold">Play vs. Bots</h2>
      <label class="block">
        Number of players (you + bots):
        <select id="play-count" class="mt-1 block w-full border rounded p-2">
          ${[2,3,4,5].map(n => `<option value="${n}">${n}</option>`).join('')}
        </select>
      </label>
      <div class="flex space-x-4">
        <button id="play-back" class="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          ← Back
        </button>
        <button id="play-start" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Start Game
        </button>
      </div>
    </div>
  `;
  document.getElementById('play-back')
          .addEventListener('click', () => renderModeSelection(onStart.__parentSelectMode));
  document.getElementById('play-start')
          .addEventListener('click', () => {
            const playerCount = parseInt(document.getElementById('play-count').value, 10);
            onStart({ playerCount });
          });
}

/**
 * Render simulation‑setup form.
 */
export function renderSimulationSetup(onSimStart) {
  const root = document.getElementById(ROOT_ID);
  const botOptions = Object.keys(bots)
    .map(name => `<option value="${name}">${name}</option>`)
    .join('');
  root.innerHTML = `
    <div class="max-w-md mx-auto p-6 space-y-4 bg-white rounded shadow">
      <h2 class="text-2xl font-semibold">Run Simulation</h2>
      <label class="block">
        Number of players (bots only):
        <select id="sim-count" class="mt-1 block w-full border rounded p-2">
          ${[2,3,4,5,6].map(n => `<option value="${n}">${n}</option>`).join('')}
        </select>
      </label>
      <label class="block">
        Bot strategy:
        <select id="sim-bot" class="mt-1 block w-full border rounded p-2">
          ${botOptions}
        </select>
      </label>
      <label class="block">
        Number of games:
        <input id="sim-games" type="number" min="1" value="1000"
               class="mt-1 block w-full border rounded p-2" />
      </label>
      <div class="flex space-x-4">
        <button id="sim-back" class="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          ← Back
        </button>
        <button id="sim-start" class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Run
        </button>
      </div>
    </div>
  `;
  document.getElementById('sim-back')
          .addEventListener('click', () => renderModeSelection(onSimStart.__parentSelectMode));
  document.getElementById('sim-start')
          .addEventListener('click', () => {
            const playerCount = parseInt(document.getElementById('sim-count').value, 10);
            const botName     = document.getElementById('sim-bot').value;
            const numGames    = parseInt(document.getElementById('sim-games').value, 10);
            onSimStart({ playerCount, botName, numGames });
          });
}

/**
 * Render the live game.
 * Now accepts a fourth callback, onReveal(idx), for when the player flips a face‑down card.
 */
export function renderGame(state, onPlay, onPickup, onReveal) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = '';
  const { playerCount, players, centerPile, currentPlayer, statusMessage } = state;
  const isYourTurn = currentPlayer === 0;

  // Header
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-2';
  header.innerHTML = `
    <h2 class="text-2xl font-bold">Clear the Deck</h2>
    <span class="text-lg ${isYourTurn ? 'text-green-600' : 'text-gray-600'}">
      ${isYourTurn ? 'Your turn' : `Player ${currentPlayer+1}'s turn`}
    </span>
  `;
  root.appendChild(header);

  // Status / bot thinking
  if (statusMessage) {
    const status = document.createElement('div');
    status.className = 'flex items-center mb-4 text-gray-700';
    status.innerHTML = `
      <svg class="animate-spin h-5 w-5 mr-2 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>${statusMessage}</span>
    `;
    root.appendChild(status);
  }

  // Center pile
  const centerSection = document.createElement('div');
  centerSection.className = 'mb-6';
  centerSection.innerHTML = `<h3 class="font-semibold mb-1">Center Pile (${centerPile.length})</h3>`;
  const pile = document.createElement('div');
  pile.className = 'flex';
  centerPile.forEach(rank => {
    const img = document.createElement('img');
    img.src = `https://deckofcardsapi.com/static/img/${rankToCode(rank)}.png`;
    img.alt = rank;
    img.className = 'w-16 h-24 m-1 shadow';
    pile.appendChild(img);
  });
  centerSection.appendChild(pile);
  root.appendChild(centerSection);

  // Opponents
  const botsSection = document.createElement('div');
  botsSection.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6';
  players.forEach((p, idx) => {
    if (idx === 0) return;
    const box = document.createElement('div');
    box.className = 'p-4 border rounded bg-white shadow';
    box.innerHTML = `<p class="font-semibold mb-2">Player ${idx+1} (Bot)</p>`;
    // face-up
    const fu = document.createElement('div');
    fu.className = 'flex';
    p.faceUp.forEach(rank => {
      const img = document.createElement('img');
      img.src = `https://deckofcardsapi.com/static/img/${rankToCode(rank)}.png`;
      img.alt = rank;
      img.className = 'w-12 h-20 m-0.5';
      fu.appendChild(img);
    });
    // face-down
    const fd = document.createElement('div');
    fd.className = 'flex ml-2';
    p.faceDown.forEach(() => {
      const img = document.createElement('img');
      img.src = 'https://deckofcardsapi.com/static/img/back.png';
      img.alt = 'face-down';
      img.className = 'w-12 h-20 m-0.5';
      fd.appendChild(img);
    });
    box.append(fu, fd);
    botsSection.appendChild(box);
  });
  root.appendChild(botsSection);

  // Human player's area
  const youSection = document.createElement('div');
  youSection.className = 'p-4 border rounded bg-white shadow mb-4';
  youSection.innerHTML = `<h3 class="font-semibold mb-2">Your Cards</h3>`;
  root.appendChild(youSection);

  // Face-up cards (your table)
  const selected = new Set();
  function makeCard(rank, zone, idx) {
    const img = document.createElement('img');
    img.src = zone === 'faceDown'
      ? 'https://deckofcardsapi.com/static/img/back.png'
      : `https://deckofcardsapi.com/static/img/${rankToCode(rank)}.png`;
    img.alt = rank;
    img.className = [
      'w-16 h-24 m-1 shadow',
      isYourTurn ? 'cursor-pointer hover:ring hover:ring-blue-400' : 'opacity-50'
    ].join(' ');
    img.dataset.key  = `${zone}-${idx}`;
    img.dataset.zone = zone;
    img.dataset.rank = rank;
    if (isYourTurn && zone !== 'faceDown') {
      img.addEventListener('click', () => {
        const key = img.dataset.key;
        if (selected.has(key)) {
          selected.delete(key);
          img.classList.remove('ring', 'ring-yellow-300');
        } else {
          selected.add(key);
          img.classList.add('ring', 'ring-yellow-300');
        }
      });
    }
    return img;
  }

  // Your face-up
  const fuContainer = document.createElement('div');
  fuContainer.innerHTML = '<p class="font-medium mb-1">Table (Face-up):</p>';
  const fuCards = document.createElement('div');
  fuCards.className = 'flex';
  players[0].faceUp.forEach((r, i) => fuCards.appendChild(makeCard(r, 'faceUp', i)));
  fuContainer.appendChild(fuCards);
  root.appendChild(fuContainer);

  // Your hand
  const handContainer = document.createElement('div');
  handContainer.innerHTML = '<p class="font-medium mb-1">Your Hand:</p>';
  const handCards = document.createElement('div');
  handCards.className = 'flex';
  players[0].hand.forEach((r, i) => handCards.appendChild(makeCard(r, 'hand', i)));
  handContainer.appendChild(handCards);
  root.appendChild(handContainer);

  // Your face-down
  const fdContainer = document.createElement('div');
  fdContainer.innerHTML = '<p class="font-medium mb-1">Table (Face-down):</p>';
  const fdCards = document.createElement('div');
  fdCards.className = 'flex';
  players[0].faceDown.forEach((_, i) => {
    const img = document.createElement('img');
    img.src   = 'https://deckofcardsapi.com/static/img/back.png';
    img.alt   = 'face-down';
    img.className = [
      'w-16 h-24 m-1 shadow',
      isYourTurn && players[0].faceUp.length === 0 ? 
        'cursor-pointer hover:ring hover:ring-red-400' : 
        'opacity-50'
    ].join(' ');
    if (isYourTurn && players[0].faceUp.length === 0 && typeof onReveal === 'function') {
      img.addEventListener('click', () => onReveal(i));
    }
    fdCards.appendChild(img);
  });
  fdContainer.appendChild(fdCards);
  root.appendChild(fdContainer);

  // Controls
  const controls = document.createElement('div');
  controls.className = 'flex space-x-4 mt-2';
  const playBtn = document.createElement('button');
  playBtn.textContent = 'Play Selected';
  playBtn.className = 'flex-1 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50';
  playBtn.disabled = selected.size === 0;
  if (isYourTurn) {
    playBtn.addEventListener('click', () => {
      const cards = Array.from(selected).map(key => {
        const [ zone, idx ] = key.split('-');
        return Number(players[0][zone][idx]);
      });
      onPlay(cards);
    });
  }
  const pickupBtn = document.createElement('button');
  pickupBtn.textContent = 'Pick Up';
  pickupBtn.className = 'flex-1 px-4 py-2 bg-red-600 text-white rounded';
  pickupBtn.disabled = !isYourTurn;
  if (isYourTurn) {
    pickupBtn.addEventListener('click', () => onPickup());
  }
  controls.append(playBtn, pickupBtn);
  root.appendChild(controls);

  // Back to menu
  const exitBtn = document.createElement('button');
  exitBtn.textContent = '← Back to Menu';
  exitBtn.className = 'mt-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400';
  exitBtn.addEventListener('click', () =>
    renderModeSelection(onPlay.__parentSelectMode)
  );
  root.appendChild(exitBtn);
}

/**
 * Render simulation results.
 */
export function renderSimulationResults(results) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = '';
  const { totalGames, wins } = results;

  // Header
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-6';
  header.innerHTML = `
    <h2 class="text-2xl font-bold">Simulation Results</h2>
    <span class="text-gray-600">Total games: ${totalGames}</span>
  `;
  root.appendChild(header);

  // Table
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'overflow-x-auto mb-6';
  const table = document.createElement('table');
  table.className = 'min-w-full bg-white border';

  // Head
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr class="bg-gray-200 text-gray-700">
      <th class="px-4 py-2 text-left">Player</th>
      <th class="px-4 py-2 text-right">Wins</th>
      <th class="px-4 py-2 text-right">Win %</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  wins.forEach((count, i) => {
    const pct = ((count / totalGames) * 100).toFixed(1) + '%';
    const row = document.createElement('tr');
    if (i % 2 === 0) row.className = 'bg-gray-50';
    row.innerHTML = `
      <td class="border-t px-4 py-2">Player ${i+1}</td>
      <td class="border-t px-4 py-2 text-right">${count}</td>
      <td class="border-t px-4 py-2 text-right">${pct}</td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  root.appendChild(tableWrapper);

  // Back
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back to Menu';
  backBtn.className = 'px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400';
  backBtn.addEventListener('click', () =>
    renderModeSelection(renderSimulationResults.__parentSelectMode)
  );
  root.appendChild(backBtn);
}
