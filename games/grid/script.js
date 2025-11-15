// --- Game constants -------------------------------------------------------
const GRID_SIZE = 5;
const CENTER = Math.floor(GRID_SIZE / 2);
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANK_VALUES = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "J": 11,
  "Q": 12,
  "K": 13,
  "A": 14
};

// --- DOM references -------------------------------------------------------
const gridEl = document.getElementById("grid");
const statusMessageEl = document.getElementById("status-message");
const deckCountEl = document.getElementById("deck-count");
const gridCountEl = document.getElementById("grid-count");
const neighborInfoEl = document.getElementById("neighbor-info");
const guessHintEl = document.getElementById("guess-hint");
const lastCardDisplayEl = document.getElementById("last-card-display");
const guessButtons = {
  higher: document.getElementById("guess-higher"),
  lower: document.getElementById("guess-lower"),
  inside: document.getElementById("guess-inside"),
  outside: document.getElementById("guess-outside")
};
const newGameButton = document.getElementById("new-game");
const rulesButton = document.getElementById("rules-button");
const rulesModal = document.getElementById("rules-modal");
const closeRulesButtons = [
  document.getElementById("close-rules"),
  document.getElementById("close-rules-bottom")
];
const backdrop = document.getElementById("backdrop");

// --- Game state -----------------------------------------------------------
let deck = [];
let grid = [];
let selectedCell = null;
let lastDrawnCard = null;
let messageQueue = [];
let isResolving = false;
let highlightTarget = null;

// --- Utility functions ----------------------------------------------------
function createDeck() {
  const newDeck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      newDeck.push({ rank, suit, value: RANK_VALUES[rank] });
    }
  }
  return newDeck;
}

function shuffleDeck(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function emptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function inBounds(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function getNeighbors(row, col) {
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const neighbors = [];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc) && grid[nr][nc]) {
      neighbors.push({ ...grid[nr][nc], row: nr, col: nc });
    }
  }
  return neighbors;
}

function cellHasAdjacentCard(row, col) {
  if (grid[row][col]) return false;
  return getNeighbors(row, col).length > 0;
}

function formatCard(card) {
  if (!card) return "";
  return `${card.rank} ${card.suit}`;
}

function formatValue(value) {
  return Object.keys(RANK_VALUES).find((rank) => RANK_VALUES[rank] === value) || value;
}

function cardsOnGrid() {
  return grid.flat().filter(Boolean).length;
}

function queueMessage(text) {
  messageQueue.push(text);
  updateStatusMessage();
}

function updateStatusMessage() {
  statusMessageEl.textContent = messageQueue[messageQueue.length - 1] || "";
}

function clearSelection() {
  selectedCell = null;
  neighborInfoEl.textContent = "None selected";
  guessHintEl.textContent = "Select a valid empty cell to begin.";
  Object.values(guessButtons).forEach((button) => {
    button.disabled = true;
    button.classList.remove("active");
  });
}

function updateLastCardDisplay() {
  if (!lastDrawnCard) {
    lastCardDisplayEl.textContent = "—";
    lastCardDisplayEl.classList.add("empty");
    delete lastCardDisplayEl.dataset.suit;
    return;
  }
  lastCardDisplayEl.classList.remove("empty");
  lastCardDisplayEl.dataset.suit = lastDrawnCard.suit;
  lastCardDisplayEl.innerHTML = `
    <span class="rank">${lastDrawnCard.rank}</span>
    <span class="suit">${lastDrawnCard.suit}</span>
  `;
}

function updateCounts() {
  deckCountEl.textContent = deck.length.toString();
  gridCountEl.textContent = cardsOnGrid().toString();
}

function renderGrid() {
  gridEl.innerHTML = "";
  const totalCards = cardsOnGrid();
  const boardEmpty = totalCards === 0;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cellDiv = document.createElement("button");
      cellDiv.className = "cell";
      cellDiv.setAttribute("role", "gridcell");
      cellDiv.dataset.row = row;
      cellDiv.dataset.col = col;
      const card = grid[row][col];

      if (card) {
        cellDiv.classList.add("card");
        cellDiv.dataset.suit = card.suit;
        cellDiv.innerHTML = `
          <span class="rank">${card.rank}</span>
          <span class="suit">${card.suit}</span>
        `;
        cellDiv.disabled = true;
        if (card.justPlaced) {
          cellDiv.classList.add("appearing");
          delete card.justPlaced;
        }
      } else {
        delete cellDiv.dataset.suit;
        cellDiv.innerHTML = "";
        const isValid = cellHasAdjacentCard(row, col) || (boardEmpty && row === CENTER && col === CENTER);
        if (isValid && !isResolving) {
          cellDiv.classList.add("valid");
        }
        if (!isValid) {
          cellDiv.classList.add("blocked");
        }
        cellDiv.disabled = isResolving;
      }

      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        cellDiv.classList.add("selected");
      }

      if (highlightTarget && (highlightTarget.row === row || highlightTarget.col === col)) {
        cellDiv.classList.add("highlight");
      }

      cellDiv.addEventListener("click", () => handleCellClick(row, col));
      gridEl.appendChild(cellDiv);
    }
  }
}

function startNewGame() {
  deck = createDeck();
  shuffleDeck(deck);
  grid = emptyGrid();
  selectedCell = null;
  lastDrawnCard = null;
  messageQueue = [];
  isResolving = false;
  highlightTarget = null;

  // Place the first card in the center
  const firstCard = deck.pop();
  if (!firstCard) {
    queueMessage("Deck creation failed. Try refreshing the page.");
    return;
  }
  firstCard.justPlaced = true;
  grid[CENTER][CENTER] = firstCard;
  lastDrawnCard = firstCard;

  queueMessage("Game started! Choose an empty cell adjacent to a card.");
  clearSelection();
  updateCounts();
  updateLastCardDisplay();
  renderGrid();
}

function isValidCell(row, col) {
  if (!inBounds(row, col)) return false;
  if (grid[row][col]) return false;
  if (cardsOnGrid() === 0) {
    return row === CENTER && col === CENTER;
  }
  const neighbors = getNeighbors(row, col);
  return neighbors.length > 0;
}

function handleCellClick(row, col) {
  if (isResolving) return;
  if (grid[row][col]) return;
  if (!isValidCell(row, col)) {
    queueMessage("Cell must touch at least one card.");
    return;
  }

  selectedCell = { row, col };
  const neighbors = getNeighbors(row, col);
  const neighborValues = neighbors
    .slice()
    .sort((a, b) => a.value - b.value)
    .map((n) => formatCard(n));
  neighborInfoEl.textContent = neighborValues.join(", ");

  Object.values(guessButtons).forEach((button) => button.classList.remove("active"));

  if (neighbors.length === 1) {
    guessButtons.higher.disabled = false;
    guessButtons.lower.disabled = false;
    guessButtons.inside.disabled = true;
    guessButtons.outside.disabled = true;
    guessHintEl.textContent = "Will the next card be higher or lower?";
  } else {
    guessButtons.higher.disabled = true;
    guessButtons.lower.disabled = true;
    guessButtons.inside.disabled = false;
    guessButtons.outside.disabled = false;
    guessHintEl.textContent = "Is the next card inside or outside the neighbor range?";
  }

  queueMessage("Make your guess!");
  renderGrid();
}

function drawCard() {
  if (deck.length === 0) {
    return null;
  }
  return deck.pop();
}

function makeGuess(type) {
  if (!selectedCell || isResolving) return;
  const { row, col } = selectedCell;
  const neighbors = getNeighbors(row, col);
  if (neighbors.length === 0) {
    queueMessage("You must choose a cell next to an existing card.");
    clearSelection();
    renderGrid();
    return;
  }

  Object.values(guessButtons).forEach((btn) => btn.disabled = true);
  isResolving = true;

  const drawnCard = drawCard();
  if (!drawnCard) {
    queueMessage("The deck is empty! Game over.");
    selectedCell = null;
    handleGameOver(false);
    return;
  }

  lastDrawnCard = drawnCard;
  updateLastCardDisplay();

  let guessCorrect = false;
  let explanation = "";

  if (neighbors.length === 1) {
    const neighbor = neighbors[0];
    if (type === "higher") {
      guessCorrect = drawnCard.value > neighbor.value;
      explanation = `${drawnCard.rank} vs ${neighbor.rank}`;
    } else if (type === "lower") {
      guessCorrect = drawnCard.value < neighbor.value;
      explanation = `${drawnCard.rank} vs ${neighbor.rank}`;
    }
    if (drawnCard.value === neighbor.value) {
      guessCorrect = false;
      explanation = `${drawnCard.rank} matches ${neighbor.rank}`;
    }
  } else {
    const values = neighbors.map((n) => n.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    if (type === "inside") {
      guessCorrect = drawnCard.value > low && drawnCard.value < high;
      explanation = `${drawnCard.rank} between ${formatValue(low)} and ${formatValue(high)}`;
    } else if (type === "outside") {
      guessCorrect = drawnCard.value < low || drawnCard.value > high;
      explanation = `${drawnCard.rank} outside ${formatValue(low)}-${formatValue(high)}`;
    }
    if (drawnCard.value === low || drawnCard.value === high) {
      guessCorrect = false;
      explanation = `${drawnCard.rank} equals the boundary`;
    }
  }

  if (guessCorrect) {
    drawnCard.justPlaced = true;
    grid[row][col] = drawnCard;
    queueMessage(`Correct! ${explanation}.`);
    selectedCell = null;
    isResolving = false;
    updateCounts();
    clearSelection();
    renderGrid();
    checkForEndConditions();
  } else {
    queueMessage(`Incorrect! ${explanation}. Row ${row + 1} and column ${col + 1} cleared.`);
    selectedCell = null;
    applyWrongGuessPenalty(row, col);
  }
}

function applyWrongGuessPenalty(row, col) {
  highlightTarget = { row, col };
  renderGrid();

  setTimeout(() => {
    highlightTarget = null;

    // Remove entire row and column
    for (let c = 0; c < GRID_SIZE; c += 1) {
      grid[row][c] = null;
    }
    for (let r = 0; r < GRID_SIZE; r += 1) {
      grid[r][col] = null;
    }

    collapseGrid();
    updateCounts();
    isResolving = false;
    clearSelection();
    renderGrid();
    checkForEndConditions();
  }, 600);
}

function collapseGrid() {
  const remaining = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (grid[row][col]) {
        remaining.push(grid[row][col]);
      }
      grid[row][col] = null;
    }
  }

  let index = 0;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (index < remaining.length) {
        const card = remaining[index];
        card.justPlaced = true;
        grid[row][col] = card;
        index += 1;
      }
    }
  }
}

function checkForEndConditions() {
  const filled = cardsOnGrid();
  if (filled === GRID_SIZE * GRID_SIZE) {
    queueMessage("You filled the grid! You win!");
    endGame(true);
    return;
  }

  if (deck.length === 0) {
    queueMessage("No cards remain in the deck. Game over.");
    endGame(false);
  }
}

function endGame(win) {
  isResolving = true;
  guessHintEl.textContent = win ? "You win! Start a new game?" : "Out of cards. Try again!";
  Object.values(guessButtons).forEach((btn) => (btn.disabled = true));
}

function handleGameOver(win) {
  endGame(win);
  renderGrid();
}

function attachEventListeners() {
  Object.entries(guessButtons).forEach(([type, button]) => {
    button.addEventListener("click", () => {
      button.classList.add("active");
      makeGuess(type);
    });
  });

  newGameButton.addEventListener("click", () => {
    startNewGame();
  });

  rulesButton.addEventListener("click", openRules);
  closeRulesButtons.forEach((btn) => btn.addEventListener("click", closeRules));
  backdrop.addEventListener("click", closeRules);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !rulesModal.hidden) {
      closeRules();
    }
  });
}

function openRules() {
  rulesModal.hidden = false;
  backdrop.hidden = false;
  rulesModal.focus();
}

function closeRules() {
  rulesModal.hidden = true;
  backdrop.hidden = true;
}

// --- Initial setup --------------------------------------------------------
attachEventListeners();
startNewGame();
