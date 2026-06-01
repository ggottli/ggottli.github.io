const presets = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const boardEl = document.getElementById("board");
const settingsForm = document.getElementById("settings");
const presetEl = document.getElementById("preset");
const rowsEl = document.getElementById("rows");
const colsEl = document.getElementById("cols");
const minesEl = document.getElementById("mines");
const minesLeftEl = document.getElementById("mines-left");
const timerEl = document.getElementById("timer");
const clearedEl = document.getElementById("cleared");
const bestTimeEl = document.getElementById("best-time");
const statusEl = document.getElementById("status");

const state = {
  rows: 9,
  cols: 9,
  mines: 10,
  cells: [],
  cellEls: [],
  flags: 0,
  revealed: 0,
  started: false,
  ended: false,
  elapsed: 0,
  timerId: null,
  longPressId: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getIndex(row, col) {
  return row * state.cols + col;
}

function getCell(row, col) {
  if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) {
    return null;
  }
  return state.cells[getIndex(row, col)];
}

function neighbors(row, col) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const cell = getCell(row + dr, col + dc);
      if (cell) {
        result.push(cell);
      }
    }
  }
  return result;
}

function readSettings() {
  const rows = clamp(parseInt(rowsEl.value, 10) || 9, 5, 40);
  const cols = clamp(parseInt(colsEl.value, 10) || 9, 5, 50);
  const maxMines = Math.max(1, rows * cols - 9);
  const mines = clamp(parseInt(minesEl.value, 10) || 10, 1, maxMines);

  rowsEl.value = rows;
  colsEl.value = cols;
  minesEl.max = maxMines;
  minesEl.value = mines;

  return { rows, cols, mines };
}

function applyPreset() {
  const preset = presets[presetEl.value];
  if (!preset) {
    return;
  }

  rowsEl.value = preset.rows;
  colsEl.value = preset.cols;
  minesEl.value = preset.mines;
}

function createCell(row, col) {
  return {
    row,
    col,
    mine: false,
    count: 0,
    revealed: false,
    flagged: false,
  };
}

function resetTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
  state.elapsed = 0;
  timerEl.textContent = "0";
}

function startTimer() {
  if (state.timerId) {
    return;
  }

  state.timerId = window.setInterval(() => {
    state.elapsed += 1;
    timerEl.textContent = state.elapsed;
  }, 1000);
}

function bestTimeKey() {
  return `minesweeper-best-${state.rows}x${state.cols}-${state.mines}`;
}

function updateBestTime() {
  const best = window.localStorage.getItem(bestTimeKey());
  bestTimeEl.textContent = best ? `${best}s` : "--";
}

function setStatus(message, mode = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("win", "loss");
  if (mode) {
    statusEl.classList.add(mode);
  }
}

function updateHud() {
  minesLeftEl.textContent = state.mines - state.flags;
  const safeCells = state.rows * state.cols - state.mines;
  const progress = safeCells > 0 ? Math.floor((state.revealed / safeCells) * 100) : 0;
  clearedEl.textContent = `${progress}%`;
}

function buildBoard() {
  const settings = readSettings();
  state.rows = settings.rows;
  state.cols = settings.cols;
  state.mines = settings.mines;
  state.flags = 0;
  state.revealed = 0;
  state.started = false;
  state.ended = false;
  state.cells = [];
  state.cellEls = [];
  resetTimer();

  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      state.cells.push(createCell(row, col));
    }
  }

  boardEl.innerHTML = "";
  boardEl.style.setProperty("--cols", state.cols);
  boardEl.setAttribute("aria-rowcount", state.rows);
  boardEl.setAttribute("aria-colcount", state.cols);

  state.cells.forEach((cell) => {
    const cellEl = document.createElement("button");
    cellEl.className = "cell";
    cellEl.type = "button";
    cellEl.dataset.row = cell.row;
    cellEl.dataset.col = cell.col;
    cellEl.setAttribute("role", "gridcell");
    cellEl.setAttribute("aria-label", `Hidden cell ${cell.row + 1}, ${cell.col + 1}`);

    cellEl.addEventListener("click", () => revealCell(cell));
    cellEl.addEventListener("dblclick", () => chordCell(cell));
    cellEl.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleFlag(cell);
    });
    cellEl.addEventListener("keydown", (event) => handleCellKey(event, cell));
    cellEl.addEventListener("pointerdown", () => queueLongPress(cell));
    cellEl.addEventListener("pointerup", clearLongPress);
    cellEl.addEventListener("pointerleave", clearLongPress);
    cellEl.addEventListener("pointercancel", clearLongPress);

    boardEl.appendChild(cellEl);
    state.cellEls.push(cellEl);
  });

  setStatus("Choose a field and make the first sweep.");
  updateHud();
  updateBestTime();
}

function placeMines(firstCell) {
  const protectedCells = new Set([
    getIndex(firstCell.row, firstCell.col),
    ...neighbors(firstCell.row, firstCell.col).map((cell) => getIndex(cell.row, cell.col)),
  ]);

  let candidates = state.cells.filter(
    (cell) => !protectedCells.has(getIndex(cell.row, cell.col)),
  );

  if (candidates.length < state.mines) {
    candidates = state.cells.filter((cell) => getIndex(cell.row, cell.col) !== getIndex(firstCell.row, firstCell.col));
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  candidates.slice(0, state.mines).forEach((cell) => {
    cell.mine = true;
  });

  state.cells.forEach((cell) => {
    if (!cell.mine) {
      cell.count = neighbors(cell.row, cell.col).filter((neighbor) => neighbor.mine).length;
    }
  });
}

function handleCellKey(event, cell) {
  if (event.key === "f" || event.key === "F") {
    event.preventDefault();
    toggleFlag(cell);
  }

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (cell.revealed) {
      chordCell(cell);
    } else {
      revealCell(cell);
    }
  }
}

function queueLongPress(cell) {
  clearLongPress();
  state.longPressId = window.setTimeout(() => {
    toggleFlag(cell);
  }, 520);
}

function clearLongPress() {
  window.clearTimeout(state.longPressId);
  state.longPressId = null;
}

function renderCell(cell) {
  const el = state.cellEls[getIndex(cell.row, cell.col)];
  el.classList.toggle("revealed", cell.revealed);
  el.classList.toggle("flagged", cell.flagged && !cell.revealed);
  el.classList.toggle("mine", cell.mine);
  el.classList.toggle("game-ended", state.ended);

  if (cell.revealed && !cell.mine && cell.count > 0) {
    el.textContent = cell.count;
    el.dataset.count = cell.count;
    el.setAttribute("aria-label", `Revealed ${cell.count}`);
  } else {
    el.textContent = "";
    delete el.dataset.count;
    if (cell.flagged) {
      el.setAttribute("aria-label", `Flagged cell ${cell.row + 1}, ${cell.col + 1}`);
    } else if (!cell.revealed) {
      el.setAttribute("aria-label", `Hidden cell ${cell.row + 1}, ${cell.col + 1}`);
    }
  }
}

function revealCell(cell) {
  clearLongPress();
  if (state.ended || cell.flagged || cell.revealed) {
    return;
  }

  if (!state.started) {
    state.started = true;
    placeMines(cell);
    startTimer();
    setStatus("Sweep carefully. Right-click to flag, double-click a number to clear around it.");
  }

  if (cell.mine) {
    cell.revealed = true;
    renderCell(cell);
    endGame(false, cell);
    return;
  }

  floodReveal(cell);
  updateHud();
  checkWin();
}

function floodReveal(startCell) {
  const queue = [startCell];

  while (queue.length) {
    const cell = queue.shift();
    if (cell.revealed || cell.flagged || cell.mine) {
      continue;
    }

    cell.revealed = true;
    state.revealed += 1;
    renderCell(cell);

    if (cell.count === 0) {
      neighbors(cell.row, cell.col).forEach((neighbor) => {
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
          queue.push(neighbor);
        }
      });
    }
  }
}

function toggleFlag(cell) {
  clearLongPress();
  if (state.ended || cell.revealed) {
    return;
  }

  cell.flagged = !cell.flagged;
  state.flags += cell.flagged ? 1 : -1;
  renderCell(cell);
  updateHud();
}

function chordCell(cell) {
  if (state.ended || !cell.revealed || cell.count === 0) {
    return;
  }

  const adjacent = neighbors(cell.row, cell.col);
  const adjacentFlags = adjacent.filter((neighbor) => neighbor.flagged).length;
  if (adjacentFlags !== cell.count) {
    return;
  }

  adjacent.forEach((neighbor) => {
    if (!neighbor.flagged && !neighbor.revealed) {
      revealCell(neighbor);
    }
  });
}

function revealAllMines(hitCell) {
  state.cells.forEach((cell) => {
    const el = state.cellEls[getIndex(cell.row, cell.col)];
    if (cell.mine) {
      cell.revealed = true;
      el.classList.add("revealed", "mine");
    }
    if (hitCell && cell === hitCell) {
      el.classList.add("mine-hit");
    }
    if (cell.flagged && !cell.mine) {
      el.classList.add("wrong-flag");
    }
    el.classList.add("game-ended");
  });
}

function secureWinningBoard() {
  state.cells.forEach((cell) => {
    const el = state.cellEls[getIndex(cell.row, cell.col)];
    if (cell.mine && !cell.flagged) {
      cell.flagged = true;
      state.flags += 1;
      renderCell(cell);
    }
    el.classList.add("game-ended");
  });
}

function endGame(won, hitCell = null) {
  state.ended = true;
  window.clearInterval(state.timerId);

  if (won) {
    const currentBest = parseInt(window.localStorage.getItem(bestTimeKey()), 10);
    if (!currentBest || state.elapsed < currentBest) {
      window.localStorage.setItem(bestTimeKey(), state.elapsed);
    }
    secureWinningBoard();
    setStatus(`Field cleared in ${state.elapsed}s. Start a new game to run it back.`, "win");
    updateBestTime();
  } else {
    revealAllMines(hitCell);
    setStatus("Mine triggered. The field is revealed for review.", "loss");
  }

  updateHud();
}

function checkWin() {
  if (state.revealed === state.rows * state.cols - state.mines) {
    endGame(true);
  }
}

presetEl.addEventListener("change", () => {
  applyPreset();
  buildBoard();
});

[rowsEl, colsEl, minesEl].forEach((input) => {
  input.addEventListener("input", () => {
    presetEl.value = "custom";
    readSettings();
  });
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buildBoard();
});

applyPreset();
buildBoard();
