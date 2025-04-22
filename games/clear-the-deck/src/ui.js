// src/ui.js

import { bots } from './bots.js';

const ROOT_ID = 'game-root';

/**
 * Top‑level mode selector.
 * onSelectMode('play') or onSelectMode('sim')
 */
export function renderModeSelection(onSelectMode) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = `
    <div class="flex flex-col items-center space-y-6 p-8">
      <h1 class="text-3xl font-bold">Clear the Deck</h1>
      <button id="mode-play" class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Play vs. Bots
      </button>
      <button id="mode-sim" class="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600">
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
 * Play setup form: choose total players (you + CPUs).
 * onStart({ playerCount })
 */
export function renderPlaySetup(onStart) {
  const root = document.getElementById(ROOT_ID);
  root.innerHTML = `
    <div class="max-w-md mx-auto p-6 space-y-4">
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
        <button id="play-start" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
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
 * Simulation setup form.
 * onSimStart({ playerCount, botName, numGames })
 */
export function renderSimulationSetup(onSimStart) {
  const root = document.getElementById(ROOT_ID);
  const botOptions = Object.keys(bots)
    .map(name => `<option value="${name}">${name}</option>`)
    .join('');
  root.innerHTML = `
    <div class="max-w-md mx-auto p-6 space-y-4">
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
        <button id="sim-start" class="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
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
 * Shows the gameplay
 * You'll hook up actual engine state & callbacks here.
 */
export function renderGame(state, onPlay, onPickup) {
    const root = document.getElementById(ROOT_ID);
    root.innerHTML = '';
  
    const { playerCount, players, centerPile, currentPlayer } = state;
    const isYourTurn = currentPlayer === 0;
  
    // HEADER
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-6';
    header.innerHTML = `
      <h2 class="text-2xl font-bold">Clear the Deck</h2>
      <span class="text-lg ${isYourTurn ? 'text-green-600' : 'text-gray-600'}">
        ${isYourTurn ? 'Your turn' : `Player ${currentPlayer+1}'s turn`}
      </span>
    `;
    root.appendChild(header);
  
    // CENTER PILE
    const centerSection = document.createElement('div');
    centerSection.className = 'mb-6';
    centerSection.innerHTML = `<h3 class="font-semibold mb-2">Center Pile (${centerPile.length})</h3>`;
    const pile = document.createElement('div');
    pile.className = 'flex flex-wrap';
    centerPile.forEach(rank => {
      const c = document.createElement('div');
      c.className = 'w-12 h-16 border rounded flex items-center justify-center m-1 bg-white shadow';
      c.textContent = rank === 1 ? 'A'
                     : rank === 11 ? 'J'
                     : rank === 12 ? 'Q'
                     : rank === 13 ? 'K'
                     : rank;
      pile.appendChild(c);
    });
    centerSection.appendChild(pile);
    root.appendChild(centerSection);
  
    // BOTS
    const botsSection = document.createElement('div');
    botsSection.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6';
    players.forEach((p, idx) => {
      if (idx === 0) return; // skip human
      const box = document.createElement('div');
      box.className = 'p-4 border rounded bg-white shadow';
      box.innerHTML = `
        <p class="font-semibold">Player ${idx+1} (Bot)</p>
        <p class="text-sm">Table (face‑up): ${p.faceUp.length}</p>
        <p class="text-sm">Hand: ${p.hand.length}</p>
        <p class="text-sm">Face‑down: ${p.faceDown.length}</p>
      `;
      botsSection.appendChild(box);
    });
    root.appendChild(botsSection);
  
    // HUMAN
    const youSection = document.createElement('div');
    youSection.className = 'p-4 border rounded bg-white shadow mb-4';
    youSection.innerHTML = `<h3 class="font-semibold mb-2">Your Cards</h3>`;
    root.appendChild(youSection);
  
    // selection state
    const selected = new Set();
  
    function makeCard(rank, zone, idx) {
      const el = document.createElement('div');
      el.className = [
        'w-12 h-16 border rounded flex items-center justify-center m-1 cursor-pointer',
        isYourTurn ? 'hover:ring hover:ring-blue-300' : 'opacity-50',
        'bg-white'
      ].join(' ');
      el.textContent = rank === 1 ? 'A'
                     : rank === 11 ? 'J'
                     : rank === 12 ? 'Q'
                     : rank === 13 ? 'K'
                     : rank;
      el.dataset.key = `${zone}-${idx}`;
      el.dataset.rank = rank;
      if (isYourTurn) {
        el.addEventListener('click', () => {
          const key = el.dataset.key;
          if (selected.has(key)) {
            selected.delete(key);
            el.classList.remove('ring', 'ring-yellow-300');
          } else {
            selected.add(key);
            el.classList.add('ring', 'ring-yellow-300');
          }
          playBtn.disabled = selected.size === 0;
        });
      }
      return el;
    }
  
    // face‑up cards
    const fuContainer = document.createElement('div');
    fuContainer.className = 'mb-4';
    fuContainer.innerHTML = '<p class="font-medium mb-1">Table (Face-up):</p>';
    const fuCards = document.createElement('div');
    fuCards.className = 'flex flex-wrap';
    players[0].faceUp.forEach((rank, i) =>
      fuCards.appendChild(makeCard(rank, 'faceUp', i))
    );
    fuContainer.appendChild(fuCards);
    root.appendChild(fuContainer);
  
    // hand cards
    const handContainer = document.createElement('div');
    handContainer.className = 'mb-4';
    handContainer.innerHTML = '<p class="font-medium mb-1">Your Hand:</p>';
    const handCards = document.createElement('div');
    handCards.className = 'flex flex-wrap';
    players[0].hand.forEach((rank, i) =>
      handCards.appendChild(makeCard(rank, 'hand', i))
    );
    handContainer.appendChild(handCards);
    root.appendChild(handContainer);
  
    // CONTROLS
    const controls = document.createElement('div');
    controls.className = 'flex space-x-4 mt-2';
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Play Selected';
    playBtn.className = 'flex-1 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50';
    playBtn.disabled = true;
    if (isYourTurn) {
      playBtn.addEventListener('click', () => {
        const cards = Array.from(selected).map(key => {
          const [zone, idx] = key.split('-');
          return Number(players[0][zone][idx]);
        });
        onPlay(cards);
      });
    }
    const pickupBtn = document.createElement('button');
    pickupBtn.textContent = 'Pick Up';
    pickupBtn.className = 'flex-1 px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50';
    pickupBtn.disabled = !isYourTurn;
    if (isYourTurn) {
      pickupBtn.addEventListener('click', () => onPickup());
    }
    controls.append(playBtn, pickupBtn);
    root.appendChild(controls);
  
    // EXIT TO MENU
    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'Exit to Menu';
    exitBtn.className = 'mt-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400';
    exitBtn.addEventListener('click', () =>
      renderModeSelection(onPlay.__parentSelectMode)
    );
    root.appendChild(exitBtn);
  }  


/**
 * Shows the results of the simulations
 * results = { wins: [count0, count1, …], avgScores: […] }
 */
export function renderSimulationResults(results) {
    const root = document.getElementById(ROOT_ID);
    root.innerHTML = '';
  
    const { totalGames, wins } = results;
  
    // HEADER
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-6';
    header.innerHTML = `
      <h2 class="text-2xl font-bold">Simulation Results</h2>
      <span class="text-gray-600">Total games: ${totalGames}</span>
    `;
    root.appendChild(header);
  
    // RESULTS TABLE
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto mb-6';
    const table = document.createElement('table');
    table.className = 'min-w-full bg-white border';
  
    // Table head
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr class="bg-gray-200 text-gray-700">
        <th class="px-4 py-2 text-left">Player</th>
        <th class="px-4 py-2 text-right">Wins</th>
        <th class="px-4 py-2 text-right">Win %</th>
      </tr>
    `;
    table.appendChild(thead);
  
    // Table body
    const tbody = document.createElement('tbody');
    wins.forEach((winCount, idx) => {
      const pct = ((winCount / totalGames) * 100).toFixed(1) + '%';
      const row = document.createElement('tr');
      row.className = idx % 2 === 0 ? 'bg-gray-50' : '';
      row.innerHTML = `
        <td class="border-t px-4 py-2">Player ${idx + 1}</td>
        <td class="border-t px-4 py-2 text-right">${winCount}</td>
        <td class="border-t px-4 py-2 text-right">${pct}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    root.appendChild(tableWrapper);
  
    // BACK BUTTON
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Menu';
    backBtn.className = 'px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400';
    backBtn.addEventListener('click', () =>
      renderModeSelection(renderSimulationResults.__parentSelectMode)
    );
    root.appendChild(backBtn);
  }
  
