const boardEl = document.getElementById("board");
const sizeSelect = document.getElementById("size");
const resetBtn = document.getElementById("reset");
const mineCountEl = document.getElementById("mine-count");
const timerEl = document.getElementById("timer");

let rows, cols, mineCount, grid;
let timerId = null;
let elapsed = 0;
let flagsUsed = 0;

function init() {
  // ─── Reset timer & stats ──────────────────────────
  if (timerId) clearInterval(timerId);
  elapsed = 0;
  timerEl.textContent = `Time: 0s`;
  flagsUsed = 0;

  // ─── Figure out size & mines ──────────────────────
  const sel = sizeSelect.value;
  if (sel === "custom") {
    rows = parseInt(prompt("Rows?", "10"), 10) || 10;
    cols = parseInt(prompt("Cols?", "10"), 10) || 10;
    mineCount = parseInt(
      prompt(`Mines? (max ${rows * cols - 1})`, Math.floor(rows * cols * 0.15)),
      10,
    );
    // clamp
    mineCount = Math.min(Math.max(mineCount, 1), rows * cols - 1);
  } else {
    rows = cols = parseInt(sel, 10);
    mineCount = rows === 9 ? 10 : 40;
  }
  mineCountEl.textContent = `Mines: ${mineCount}`;

  // ─── Prepare grid data ────────────────────────────
  grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      cnt: 0,
      revealed: false,
      flagged: false,
    })),
  );

  // ─── Plant mines & neighbor counts ────────────────
  let placed = 0;
  while (placed < mineCount) {
    let r = Math.floor(Math.random() * rows),
      c = Math.floor(Math.random() * cols);
    if (!grid[r][c].mine) {
      grid[r][c].mine = true;
      placed++;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          let nr = r + dr,
            nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            grid[nr][nc].cnt++;
          }
        }
      }
    }
  }

  // ─── Render board ─────────────────────────────────
  boardEl.style.gridTemplate = `repeat(${rows}, 1fr) / repeat(${cols}, 1fr)`;
  boardEl.innerHTML = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.r = r;
      cellEl.dataset.c = c;
      cellEl.oncontextmenu = (e) => {
        e.preventDefault();
        toggleFlag(r, c, cellEl);
      };
      cellEl.onclick = () => revealCell(r, c, cellEl);
      boardEl.appendChild(cellEl);
    }
  }
}

function startTimer() {
  // ensure only one timer
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    elapsed++;
    timerEl.textContent = `Time: ${elapsed}s`;
  }, 1000);
}

function revealCell(r, c, el) {
  const cell = grid[r][c];
  if (cell.flagged || cell.revealed) return;
  if (elapsed === 0) startTimer();

  cell.revealed = true;
  el.classList.add("revealed");
  if (cell.mine) {
    el.classList.add("mine");
    return gameOver(false);
  }
  if (cell.cnt > 0) {
    el.textContent = cell.cnt;
    el.dataset.num = cell.cnt;
  } else {
    // flood-fill zeros
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        let nr = r + dr,
          nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !grid[nr][nc].revealed
        ) {
          revealCell(
            nr,
            nc,
            document.querySelector(`.cell[data-r="${nr}"][data-c="${nc}"]`),
          );
        }
      }
    }
  }
  checkWin();
}

function toggleFlag(r, c, el) {
  const cell = grid[r][c];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  el.classList.toggle("flagged");
  flagsUsed += cell.flagged ? 1 : -1;
  mineCountEl.textContent = `Mines: ${mineCount - flagsUsed}`;
}

function gameOver(won) {
  clearInterval(timerId);
  // reveal all mines
  document.querySelectorAll(".cell").forEach((el) => {
    let r = +el.dataset.r,
      c = +el.dataset.c;
    if (grid[r][c].mine) el.classList.add("mine", "revealed");
  });
  setTimeout(() => alert(won ? "You Win! 🎉" : "Game Over 💥"), 100);
}

function checkWin() {
  const revealedCount = grid.flat().filter((c) => c.revealed).length;
  if (revealedCount === rows * cols - mineCount) {
    gameOver(true);
  }
}

resetBtn.addEventListener("click", init);
window.addEventListener("load", init);
