// script.js

// Global game variables
let currentPlayer = 1; // Player 1 = White-ish (red), Player 2 = Black-ish (blue)
let diceValues = [0, 0];
let boardState = []; 
const totalPoints = 24;
let gameMode = "pass"; 
let isGameActive = false;

// Track selection & whether we've rolled this turn
let selectedPointIndex = null;
let hasRolledThisTurn = false; // Prevent multiple rolls in one turn

/**
 * On page load, attach event listeners
 */
window.onload = () => {
  document.getElementById("startGameBtn").addEventListener("click", startGame);
  document.getElementById("rollDiceBtn").addEventListener("click", rollDice);
};

/**
 * Start or restart the game
 */
function startGame() {
  gameMode = document.getElementById("gameMode").value;
  isGameActive = true;
  currentPlayer = 1;
  hasRolledThisTurn = false;

  initBoard();
  renderBoard();
  updatePlayerDisplay();

  // Clear dice
  diceValues = [0, 0];
  document.getElementById("die1").innerText = "-";
  document.getElementById("die2").innerText = "-";
}

/**
 * Initialize boardState with standard backgammon setup, 
 * but in our indexing:
 *  - Index 0 (top-right) to 5 = top-right quadrant
 *  - Index 6..11 = top-left quadrant
 *  - Index 12..17 = bottom-left quadrant
 *  - Index 18..23 = bottom-right quadrant
 *
 * White (P1) starts at index 0,11,16,18
 * Black (P2) starts at index 23,12,7,5
 */
function initBoard() {
  boardState = new Array(totalPoints).fill(null).map(() => {
    return { player: 0, count: 0 };
  });

  // Player 1 (white/red), moving 0 -> 23
  boardState[0]  = { player: 1, count: 2 }; // White's 24-point
  boardState[11] = { player: 1, count: 5 }; // White's 13-point
  boardState[16] = { player: 1, count: 3 }; // White's 8-point
  boardState[18] = { player: 1, count: 5 }; // White's 6-point

  // Player 2 (black/blue), moving 23 -> 0
  boardState[23] = { player: 2, count: 2 }; // Black's 1-point
  boardState[12] = { player: 2, count: 5 }; // Black's 12-point
  boardState[7]  = { player: 2, count: 3 }; // Black's 17-point
  boardState[5]  = { player: 2, count: 5 }; // Black's 19-point
}

/**
 * Render the board into the DOM
 */
function renderBoard() {
  clearHighlights();

  // Clear each quadrant
  document.getElementById("topRight").innerHTML = "";   // indices 0..5
  document.getElementById("topLeft").innerHTML = "";    // indices 6..11
  document.getElementById("bottomLeft").innerHTML = ""; // indices 12..17
  document.getElementById("bottomRight").innerHTML = "";// indices 18..23

  // topRight: index 0..5 (we actually want it visually right->left, but we'll just append in ascending order)
  for (let i = 0; i <= 5; i++) {
    const pointEl = createPointElement(i);
    document.getElementById("topRight").appendChild(pointEl);
  }

  // topLeft: index 6..11
  for (let i = 6; i <= 11; i++) {
    const pointEl = createPointElement(i);
    document.getElementById("topLeft").appendChild(pointEl);
  }

  // bottomLeft: index 12..17
  for (let i = 12; i <= 17; i++) {
    const pointEl = createPointElement(i);
    document.getElementById("bottomLeft").appendChild(pointEl);
  }

  // bottomRight: index 18..23
  for (let i = 18; i <= 23; i++) {
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
    for (let c = 0; c < pointData.count; c++) {
      const checker = document.createElement("div");
      checker.classList.add("checker");
      checker.classList.add(pointData.player === 1 ? "player1" : "player2");
      checker.innerText = (pointData.player === 1) ? "1" : "2";
      // Vertical stacking
      checker.style.top = `${c * 45}px`; 
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

  // If we haven't rolled yet this turn, we can't move
  if (!hasRolledThisTurn) {
    alert("You must roll the dice before moving.");
    return;
  }

  // If no point selected yet, try selecting
  if (selectedPointIndex === null) {
    // Only select if it belongs to the current player
    if (boardState[index].player === currentPlayer && boardState[index].count > 0) {
      selectedPointIndex = index;
      highlightPossibleDestinations(index);
    }
  } else {
    // Attempt a move from selectedPointIndex to 'index'
    attemptMove(selectedPointIndex, index);
    // Reset selection
    selectedPointIndex = null;
    clearHighlights();
  }
}

/**
 * Highlight possible moves for the selected checker
 */
function highlightPossibleDestinations(fromIndex) {
  clearHighlights();
  const possibleMoves = getValidDestinations(fromIndex, diceValues, currentPlayer);

  // If no valid moves, highlight the fromIndex in red
  if (possibleMoves.length === 0) {
    const fromPointEl = document.querySelector(`.point[data-index='${fromIndex}']`);
    fromPointEl.classList.add("highlight-invalid");
    return;
  }

  // Highlight each valid destination in green
  possibleMoves.forEach(destIndex => {
    const destEl = document.querySelector(`.point[data-index='${destIndex}']`);
    if (destEl) {
      destEl.classList.add("highlight-valid");
    }
  });
}

/**
 * Return array of valid destination indexes given dice & player
 * White (P1) moves index + distance; Black (P2) moves index - distance.
 */
function getValidDestinations(fromIndex, dice, player) {
  const valid = [];

  dice.forEach(d => {
    if (d <= 0) return;  // skip used dice

    let target = (player === 1)
      ? fromIndex + d   // White goes "up"
      : fromIndex - d;  // Black goes "down"

    // Check boundaries
    if (target < 0 || target >= totalPoints) return;

    // Spot’s occupant
    const spot = boardState[target];
    // In real backgammon, we must check if spot has 0 or 1 enemy checker
    // We'll do a simplified check:
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

/**
 * Attempt a move
 */
function attemptMove(fromIndex, toIndex) {
  const distance = Math.abs(toIndex - fromIndex);

  // Must match a remaining die
  if (!diceValues.includes(distance)) {
    alert("Move not allowed: must match one of the dice.");
    return;
  }

  // Check direction is correct
  if (currentPlayer === 1 && toIndex < fromIndex) {
    alert("Invalid direction for Player 1.");
    return;
  } 
  if (currentPlayer === 2 && toIndex > fromIndex) {
    alert("Invalid direction for Player 2.");
    return;
  }

  // Actually move the checker
  if (boardState[fromIndex].player === currentPlayer && boardState[fromIndex].count > 0) {
    boardState[fromIndex].count--;

    // If capturing (very simplified)
    if (boardState[toIndex].player !== currentPlayer && boardState[toIndex].count === 1) {
      // In full rules, we'd move the captured checker to the bar
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    } else if (boardState[toIndex].player === currentPlayer) {
      boardState[toIndex].count++;
    } else {
      // either empty, or belongs to other but has 0 checkers (rare)
      boardState[toIndex] = { player: currentPlayer, count: 1 };
    }

    // Remove used die
    let usedIndex = diceValues.indexOf(distance);
    if (usedIndex !== -1) {
      diceValues.splice(usedIndex, 1);
      diceValues.push(0); 
    }

    // Re-render
    renderBoard();

    // If dice are used up or no more moves, switch turn
    if (diceValues[0] === 0 && diceValues[1] === 0) {
      switchPlayer();
    } else {
      // It's still the same player's turn if they have leftover dice
      // They can continue moving if possible
    }
  }
}

/**
 * Roll the dice (only once per turn)
 */
function rollDice() {
  if (!isGameActive) return;

  // If we've already rolled this turn, do nothing
  if (hasRolledThisTurn) {
    alert("You have already rolled this turn!");
    return;
  }

  diceValues[0] = Math.floor(Math.random() * 6) + 1;
  diceValues[1] = Math.floor(Math.random() * 6) + 1;

  // Update the UI
  document.getElementById("die1").innerText = diceValues[0];
  document.getElementById("die2").innerText = diceValues[1];

  hasRolledThisTurn = true;
}

/**
 * Switch to the other player
 */
function switchPlayer() {
  currentPlayer = (currentPlayer === 1) ? 2 : 1;
  updatePlayerDisplay();

  // Reset dice for next player
  diceValues = [0, 0];
  document.getElementById("die1").innerText = "-";
  document.getElementById("die2").innerText = "-";

  hasRolledThisTurn = false;

  if (gameMode === "cpu" && currentPlayer === 2) {
    cpuTurn();
  }
}

/**
 * Naive CPU turn for demonstration
 */
function cpuTurn() {
  // CPU "thinks" briefly
  setTimeout(() => {
    rollDice(); // CPU rolls

    // Very naive approach: just make one valid move with each die if possible
    for (let d = 0; d < diceValues.length; d++) {
      const dist = diceValues[d];
      if (dist > 0) {
        let moved = false;
        for (let i = 0; i < totalPoints; i++) {
          if (boardState[i].player === 2 && boardState[i].count > 0) {
            let target = i - dist; // CPU is player 2, moves downward
            if (target >= 0) {
              // Check if it’s a valid move
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
    
    // Switch back to Player 1
    switchPlayer();
  }, 1000);
}

/**
 * Clear highlight classes
 */
function clearHighlights() {
  document.querySelectorAll(".point").forEach(pt => {
    pt.classList.remove("highlight-valid");
    pt.classList.remove("highlight-invalid");
  });
}

/**
 * Update the "Current Player" display
 */
function updatePlayerDisplay() {
  const playerName = currentPlayer === 1 ? "Player 1" : "Player 2";
  document.getElementById("playerName").innerText = playerName;
}
