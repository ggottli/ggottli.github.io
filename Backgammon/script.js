// script.js

// Global game variables
let currentPlayer = 1; // 1 or 2
let diceValues = [0, 0];
let boardState = []; 
const totalPoints = 24;
let gameMode = "pass"; 
let isGameActive = false;

// Tracking which point is selected
let selectedPointIndex = null;

/**
 * On page load, attach event listeners
 */
window.onload = () => {
  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("rollDiceBtn").addEventListener("click", rollDice);
};

/**
 * Start (or restart) a game
 */
function startGame() {
  gameMode = document.getElementById("gameMode").value;
  isGameActive = true;
  currentPlayer = 1;
  
  initBoard();
  renderBoard();
  updatePlayerDisplay();
}

/**
 * Initialize boardState with the standard backgammon setup
 * For demonstration, we’ll use indexes:
 *   topRight:   23 -> 18
 *   topLeft:    17 -> 12
 *   bottomLeft: 11 -> 6
 *   bottomRight: 5 -> 0
 */
function initBoard() {
  boardState = new Array(totalPoints).fill(null).map(() => {
    return { player: 0, count: 0 };
  });

  // Player 1 (commonly starts on top right / top left)
  boardState[23] = { player: 1, count: 2 }; // 24-point
  boardState[12] = { player: 1, count: 5 }; // 13-point
  boardState[7]  = { player: 1, count: 3 }; // 8-point
  boardState[5]  = { player: 1, count: 5 }; // 6-point

  // Player 2 (mirrored on the other side)
  boardState[0]  = { player: 2, count: 2 };  // 1-point
  boardState[11] = { player: 2, count: 5 };  // 12-point
  boardState[16] = { player: 2, count: 3 };  // 17-point
  boardState[18] = { player: 2, count: 5 };  // 19-point
}

/**
 * Render the board into the DOM
 */
function renderBoard() {
  clearHighlights();

  // Clear each section
  document.getElementById("topRight").innerHTML = "";
  document.getElementById("topLeft").innerHTML = "";
  document.getElementById("bottomLeft").innerHTML = "";
  document.getElementById("bottomRight").innerHTML = "";

  // TopRight: indexes 23 down to 18
  for (let i = 23; i >= 18; i--) {
    const pointEl = createPointElement(i);
    document.getElementById("topRight").appendChild(pointEl);
  }

  // TopLeft: indexes 17 down to 12
  for (let i = 17; i >= 12; i--) {
    const pointEl = createPointElement(i);
    document.getElementById("topLeft").appendChild(pointEl);
  }

  // BottomLeft: indexes 11 down to 6
  for (let i = 11; i >= 6; i--) {
    const pointEl = createPointElement(i);
    document.getElementById("bottomLeft").appendChild(pointEl);
  }

  // BottomRight: indexes 5 down to 0
  for (let i = 5; i >= 0; i--) {
    const pointEl = createPointElement(i);
    document.getElementById("bottomRight").appendChild(pointEl);
  }
}

/**
 * Create the DOM element for a point (triangle)
 */
function createPointElement(index) {
  const point = document.createElement("div");
  point.classList.add("point");
  point.dataset.index = index;

  // If there are checkers, create them
  const pointData = boardState[index];
  if (pointData && pointData.count > 0) {
    for (let i = 0; i < pointData.count; i++) {
      const checker = document.createElement("div");
      checker.classList.add("checker");
      checker.classList.add(pointData.player === 1 ? "player1" : "player2");
      checker.innerText = pointData.player === 1 ? "1" : "2";
      // Vertical stacking
      checker.style.top = `${i * 45}px`; 
      point.appendChild(checker);
    }
  }

  // Add an event listener for clicks
  point.addEventListener("click", () => onPointClick(index));
  return point;
}

/**
 * Handle a click on a point
 */
function onPointClick(index) {
  if (!isGameActive) return;

  // If no point selected yet...
  if (selectedPointIndex === null) {
    // Only select if this point belongs to the current player
    if (boardState[index].player === currentPlayer && boardState[index].count > 0) {
      selectedPointIndex = index;
      highlightPossibleDestinations(index);
    }
  } else {
    // Attempt a move from the selected point to this new point
    attemptMove(selectedPointIndex, index);
    // Reset selection
    selectedPointIndex = null;
    clearHighlights();
  }
}

/**
 * Highlight valid / invalid moves for a selected point
 */
function highlightPossibleDestinations(fromIndex) {
  // First clear any old highlights
  clearHighlights();

  // Get all points
  const allPoints = document.querySelectorAll(".point");

  // Calculate all potential moves from the dice values
  const possibleMoves = getValidDestinations(fromIndex, diceValues, currentPlayer);

  // If there are no valid moves, highlight the current point in red
  if (possibleMoves.length === 0) {
    const fromPointEl = document.querySelector(`.point[data-index='${fromIndex}']`);
    fromPointEl.classList.add("highlight-invalid");
    return;
  }

  // Mark each valid move in green
  possibleMoves.forEach(destIndex => {
    const pointEl = document.querySelector(`.point[data-index='${destIndex}']`);
    if (pointEl) {
      pointEl.classList.add("highlight-valid");
    }
  });
}

/**
 * Returns an array of valid destinations given the current dice
 */
function getValidDestinations(fromIndex, dice, player) {
  const validDestinations = [];

  dice.forEach(d => {
    if (d <= 0) return; // skip any used dice

    let target;
    // Player 1 typically moves from a higher index to a lower index
    // Player 2 from a lower index to a higher index (depending on setup)
    if (player === 1) {
      target = fromIndex - d; 
      if (target >= 0) {
        // Check if capturing is allowed or if open
        const spot = boardState[target];
        if (spot.player === 0 || spot.player === 1 || (spot.player !== 1 && spot.count === 1)) {
          validDestinations.push(target);
        }
      }
    } else {
      target = fromIndex + d;
      if (target < totalPoints) {
        // Check capture / open
        const spot = boardState[target];
        if (spot.player === 0 || spot.player === 2 || (spot.player !== 2 && spot.count === 1)) {
          validDestinations.push(target);
        }
      }
    }
  });

  // Remove duplicates if both dice are the same
  return [...new Set(validDestinations)];
}

/**
 * Attempt to move from one point to another
 */
function attemptMove(fromIndex, toIndex) {
  // Make sure this move is valid based on the dice
  const distance = Math.abs(toIndex - fromIndex);
  if (!diceValues.includes(distance)) {
    alert("Move not allowed. Distance must match a dice roll.");
    return;
  }

  // Check direction
  if (currentPlayer === 1 && toIndex > fromIndex) {
    alert("Invalid direction for Player 1.");
    return;
  }
  if (currentPlayer === 2 && toIndex < fromIndex) {
    alert("Invalid direction for Player 2.");
    return;
  }

  // If fromIndex has checkers of the current player
  if (boardState[fromIndex].player === currentPlayer && boardState[fromIndex].count > 0) {
    // Move the checker
    boardState[fromIndex].count--;

    // Capturing logic (very simplified)
    if (boardState[toIndex].player !== currentPlayer && boardState[toIndex].count === 1) {
      // In real backgammon, you'd move the captured checker to the bar
      // For now, just wipe it
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    } else if (boardState[toIndex].player === currentPlayer) {
      boardState[toIndex].count++;
    } else {
      // If empty or belongs to other but 0 count
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    }

    // Remove used dice
    let usedIndex = diceValues.indexOf(distance);
    if (usedIndex !== -1) {
      diceValues.splice(usedIndex, 1);
      diceValues.push(0); 
    }

    // Re-render
    renderBoard();

    // If dice are used up or no further moves, switch player
    if (diceValues[0] === 0 && diceValues[1] === 0) {
      switchPlayer();
    }
  }
}

/**
 * Roll the dice
 */
function rollDice() {
  if (!isGameActive) return;

  diceValues[0] = Math.floor(Math.random() * 6) + 1;
  diceValues[1] = Math.floor(Math.random() * 6) + 1;

  // Update the UI
  document.getElementById("die1").innerText = diceValues[0];
  document.getElementById("die2").innerText = diceValues[1];
}

/**
 * Switch to the other player
 */
function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updatePlayerDisplay();

  if (gameMode === "cpu" && currentPlayer === 2) {
    // CPU turn - naive
    cpuTurn();
  }
}

/**
 * Very basic CPU turn
 */
function cpuTurn() {
  setTimeout(() => {
    rollDice();

    // Try a naive move for CPU
    let madeAMove = false;
    for (let i = 0; i < totalPoints; i++) {
      if (boardState[i].player === 2 && boardState[i].count > 0) {
        // Check dice for possible move
        for (let d = 0; d < diceValues.length; d++) {
          let dist = diceValues[d];
          if (dist > 0) {
            let target = i + dist; // CPU is player 2
            if (target < totalPoints) {
              // Attempt move
              // We'll re-use the attemptMove, but it alerts on invalid moves
              // For a real CPU, you'd handle it more gracefully
              attemptMove(i, target);
              madeAMove = true;
              break;
            }
          }
        }
      }
      if (madeAMove) break;
    }

    // Switch back
    switchPlayer();
  }, 1000);
}

/**
 * Clear all highlight classes
 */
function clearHighlights() {
  document.querySelectorAll(".point").forEach(point => {
    point.classList.remove("highlight-valid");
    point.classList.remove("highlight-invalid");
  });
}

/**
 * Update the display of which player's turn it is
 */
function updatePlayerDisplay() {
  document.getElementById("playerName").innerText = currentPlayer === 1 ? "Player 1" : "Player 2";
}
