/*******************************************************
 * script.js
 ******************************************************/

// Global game variables
let currentPlayer = 1; // Player 1 = Red, Player 2 = Blue
let diceValues = [0, 0];
let boardState = [];
const totalPoints = 24;
let gameMode = "pass";
let isGameActive = false;

// Track which point is selected & whether we've rolled
let selectedPointIndex = null;
let hasRolledThisTurn = false;

// ------------------------------------------------------
// On page load, attach event listeners
// ------------------------------------------------------
window.onload = () => {
  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("rollDiceBtn").addEventListener("click", rollDice);
};

/*******************************************************
 * Start or re-start the game
 *******************************************************/
function startGame() {
  gameMode = document.getElementById("gameMode").value;
  isGameActive = true;
  currentPlayer = 1;
  hasRolledThisTurn = false;

  initBoard();   // Set initial positions of checkers
  renderBoard(); // Draw them on screen
  updatePlayerDisplay();

  // Clear dice UI
  diceValues = [0, 0];
  document.getElementById("die1").innerText = "-";
  document.getElementById("die2").innerText = "-";
}

/*******************************************************
 * Initialize boardState with standard start positions
 * for a two-row layout:
 *  - Top row:  indexes 0..11
 *  - Bottom row: indexes 12..23
 *  Player 1 (Red) moves "forward" (index + dice).
 *  Player 2 (Blue) moves "backward" (index - dice).
 *******************************************************/
function initBoard() {
  boardState = new Array(totalPoints).fill(null).map(() => {
    return { player: 0, count: 0 };
  });

  // Example distribution (you can tweak these indexes):
  // Player 1 (Red)
  boardState[0]  = { player: 1, count: 2 };  // 2 checkers
  boardState[11] = { player: 1, count: 5 }; // 5 checkers
  boardState[16] = { player: 1, count: 3 }; // 3 checkers
  boardState[18] = { player: 1, count: 5 }; // 5 checkers

  // Player 2 (Blue)
  boardState[23] = { player: 2, count: 2 };
  boardState[12] = { player: 2, count: 5 };
  boardState[7]  = { player: 2, count: 3 };
  boardState[5]  = { player: 2, count: 5 };
}

/*******************************************************
 * Render the board by populating the topRow (0..11)
 * and bottomRow (12..23) with point divs
 *******************************************************/
function renderBoard() {
  clearHighlights();

  const topRowEl = document.getElementById("topRow");
  const bottomRowEl = document.getElementById("bottomRow");

  topRowEl.innerHTML = "";
  bottomRowEl.innerHTML = "";

  // TOP ROW: indexes [0..11]
  for (let i = 0; i < 12; i++) {
    const pointEl = createPointElement(i);
    topRowEl.appendChild(pointEl);
  }

  // BOTTOM ROW: indexes [12..23]
  for (let i = 12; i < 24; i++) {
    const pointEl = createPointElement(i);
    bottomRowEl.appendChild(pointEl);
  }
}

/*******************************************************
 * Create DOM element for a single "point"
 *******************************************************/
function createPointElement(index) {
  const point = document.createElement("div");
  point.classList.add("point");
  point.dataset.index = index;

  // If the point has checkers, render them
  const pointData = boardState[index];
  if (pointData && pointData.count > 0) {
    for (let c = 0; c < pointData.count; c++) {
      const checker = document.createElement("div");
      checker.classList.add("checker");
      checker.classList.add(
        pointData.player === 1 ? "player1" : "player2"
      );
      checker.innerText = pointData.player === 1 ? "1" : "2";

      // Simple vertical stacking
      checker.style.top = `${c * 45}px`;
      point.appendChild(checker);
    }
  }

  // Click event for moves
  point.addEventListener("click", () => onPointClick(index));

  return point;
}

/*******************************************************
 * Clicking on a point: either select or attempt move
 *******************************************************/
function onPointClick(index) {
  if (!isGameActive) return;

  // Must roll first!
  if (!hasRolledThisTurn) {
    alert("You must roll the dice before moving.");
    return;
  }

  // If no point selected yet, try selecting
  if (selectedPointIndex === null) {
    // Only select if it belongs to currentPlayer
    if (
      boardState[index].player === currentPlayer &&
      boardState[index].count > 0
    ) {
      selectedPointIndex = index;
      highlightPossibleDestinations(index);
    }
  } else {
    // Attempt the move
    attemptMove(selectedPointIndex, index);
    selectedPointIndex = null;
    clearHighlights();
  }
}

/*******************************************************
 * Attempt a move from fromIndex to toIndex
 *******************************************************/
function attemptMove(fromIndex, toIndex) {
  const distance = Math.abs(toIndex - fromIndex);

  // Must match a remaining die
  if (!diceValues.includes(distance)) {
    alert("Move not allowed: must match one of the dice.");
    return;
  }

  // Check direction
  if (currentPlayer === 1 && toIndex < fromIndex) {
    alert("Invalid direction for Player 1.");
    return;
  }
  if (currentPlayer === 2 && toIndex > fromIndex) {
    alert("Invalid direction for Player 2.");
    return;
  }

  // Confirm fromIndex belongs to current player
  if (
    boardState[fromIndex].player === currentPlayer &&
    boardState[fromIndex].count > 0
  ) {
    // Move 1 checker
    boardState[fromIndex].count--;

    // Capture logic (simplified)
    if (
      boardState[toIndex].player !== currentPlayer &&
      boardState[toIndex].count === 1
    ) {
      // In a full game, you'd put that checker on the bar
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    } else if (boardState[toIndex].player === currentPlayer) {
      boardState[toIndex].count++;
    } else {
      // If empty or belongs to other with 0 checkers
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    }

    // Mark the used die as 0 (used)
    const usedIndex = diceValues.indexOf(distance);
    if (usedIndex !== -1) {
      diceValues[usedIndex] = 0;
    }

    // Re-render
    renderBoard();

    // If both dice are used up (0,0), or no moves left, switch player
    if (diceValues[0] === 0 && diceValues[1] === 0) {
      switchPlayer();
    }
  }
}

/*******************************************************
 * Highlight possible destinations for the selected point
 *******************************************************/
function highlightPossibleDestinations(fromIndex) {
  clearHighlights();

  const possibleMoves = getValidDestinations(
    fromIndex,
    diceValues,
    currentPlayer
  );

  // If no valid moves, highlight fromIndex in red
  if (possibleMoves.length === 0) {
    const fromPointEl = document.querySelector(
      `.point[data-index='${fromIndex}']`
    );
    fromPointEl.classList.add("highlight-invalid");
    return;
  }

  // Otherwise highlight each valid target in green
  possibleMoves.forEach((target) => {
    const pointEl = document.querySelector(`.point[data-index='${target}']`);
    if (pointEl) {
      pointEl.classList.add("highlight-valid");
    }
  });
}

/*******************************************************
 * Returns array of valid destinations for fromIndex
 * given the current dice & player direction
 *******************************************************/
function getValidDestinations(fromIndex, dice, player) {
  const valid = [];

  dice.forEach((d) => {
    if (d <= 0) return; // already used
    let target;
    if (player === 1) {
      // Player 1 moves up in index
      target = fromIndex + d;
      if (target > 23) return;
    } else {
      // Player 2 moves down in index
      target = fromIndex - d;
      if (target < 0) return;
    }

    // Check occupant
    const spot = boardState[target];
    // If empty, or belongs to same player, or has only 1 opposing checker
    if (
      spot.player === 0 ||
      spot.player === player ||
      (spot.player !== player && spot.count === 1)
    ) {
      valid.push(target);
    }
  });

  return [...new Set(valid)];
}

/*******************************************************
 * Roll the dice (once per turn)
 *******************************************************/
function rollDice() {
  if (!isGameActive) return;

  if (hasRolledThisTurn) {
    alert("You have already rolled this turn!");
    return;
  }

  diceValues[0] = Math.floor(Math.random() * 6) + 1;
  diceValues[1] = Math.floor(Math.random() * 6) + 1;

  document.getElementById("die1").innerText = diceValues[0];
  document.getElementById("die2").innerText = diceValues[1];

  hasRolledThisTurn = true;
}

/*******************************************************
 * Switch to the other player
 *******************************************************/
function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updatePlayerDisplay();

  // Reset dice & roll flag for next player
  diceValues = [0, 0];
  document.getElementById("die1").innerText = "-";
  document.getElementById("die2").innerText = "-";
  hasRolledThisTurn = false;

  if (gameMode === "cpu" && currentPlayer === 2) {
    cpuTurn();
  }
}

/*******************************************************
 * Very naive CPU turn
 *******************************************************/
function cpuTurn() {
  setTimeout(() => {
    rollDice();

    // Attempt simple moves for each die
    for (let d = 0; d < diceValues.length; d++) {
      const dist = diceValues[d];
      if (dist > 0) {
        // find a checker for Player 2
        let moved = false;
        for (let i = 0; i < totalPoints; i++) {
          if (boardState[i].player === 2 && boardState[i].count > 0) {
            const target = i - dist; // CPU is player 2
            if (target >= 0) {
              // Check if valid
              if (getValidDestinations(i, [dist], 2).includes(target)) {
                attemptMove(i, target);
                moved = true;
                break;
              }
            }
          }
          if (moved) break;
        }
      }
    }

    switchPlayer();
  }, 1000);
}

/*******************************************************
 * Clear highlight classes
 *******************************************************/
function clearHighlights() {
  document.querySelectorAll(".point").forEach((pt) => {
    pt.classList.remove("highlight-valid");
    pt.classList.remove("highlight-invalid");
  });
}

/*******************************************************
 * Update "Current Player" display
 *******************************************************/
function updatePlayerDisplay() {
  const playerName = currentPlayer === 1 ? "Player 1" : "Player 2";
  document.getElementById("playerName").innerText = playerName;
}
