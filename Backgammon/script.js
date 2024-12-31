/*******************************************************
 * script.js
 ******************************************************/

// Define our clockwise/counterclockwise rings (24 points)
const redRing = [
  0, 1, 2, 3, 4, 5,    // top-right, left→right
  23, 22, 21, 20, 19, 18, // bottom-right, right→left
  17, 16, 15, 14, 13, 12, // bottom-left, left→right
  11, 10, 9, 8, 7, 6      // top-left, right→left
];
// Reverse of redRing for Blue (counterclockwise)
const blueRing = [...redRing].reverse();

// Global game variables
let currentPlayer = 1; // 1 = Red, 2 = Blue
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
 * (You can adjust these to suit your preferred layout)
 *******************************************************/
function initBoard() {
  boardState = new Array(totalPoints).fill(null).map(() => {
    return { player: 0, count: 0 };
  });

  // Example: 2,5,3,5 for each player
  // Player 1 (Red)
  boardState[0]  = { player: 1, count: 2 };
  boardState[11] = { player: 1, count: 5 };
  boardState[16] = { player: 1, count: 3 };
  boardState[18] = { player: 1, count: 5 };

  // Player 2 (Blue)
  boardState[23] = { player: 2, count: 2 };
  boardState[12] = { player: 2, count: 5 };
  boardState[7]  = { player: 2, count: 3 };
  boardState[5]  = { player: 2, count: 5 };
}

/*******************************************************
 * Render the board by populating the topRow (0..11)
 * and bottomRow (12..23) with point divs.
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

      // *** Smaller size: about 30px instead of 40px
      checker.style.width = "30px";
      checker.style.height = "30px";

      // Stack them a bit tighter
      checker.style.top = `${c * 35}px`;

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
 * using our ring logic for each player
 *******************************************************/
function attemptMove(fromIndex, toIndex) {
  // Determine how far in the ring we are moving
  // based on the player's ring
  const ring = (currentPlayer === 1) ? redRing : blueRing;

  // Position of fromIndex in the ring
  const fromPos = ring.indexOf(fromIndex);
  // Position of toIndex in the ring
  const toPos   = ring.indexOf(toIndex);

  if (fromPos === -1 || toPos === -1) {
    alert("Invalid move: index not in ring.");
    return;
  }

  // The "distance" in ring steps might be positive (red forward) or negative (blue forward).
  // But we've structured it so:
  //   - Red’s ring is in clockwise order
  //   - Blue’s ring is in counterclockwise order
  // So for Red, distance = (toPos - fromPos).
  // For Blue, also (toPos - fromPos).
  // Then we check if that distance matches a remaining die (like 1..6).
  let rawDistance = toPos - fromPos; 
  // Because ring is reversed for Blue, a forward move is + for Red, also + for Blue in that ring ordering.
  if (rawDistance < 0) {
    // if we "wrapped" around (like ring index overflow), we can do modulo
    rawDistance = rawDistance + 24; 
  }

  // rawDistance is how many steps around the ring we moved
  // Must match a die
  if (!diceValues.includes(rawDistance)) {
    alert("Move not allowed: must match one of the dice.");
    return;
  }

  // Check fromIndex belongs to current player
  if (
    boardState[fromIndex].player !== currentPlayer ||
    boardState[fromIndex].count <= 0
  ) {
    alert("No checker to move from that point.");
    return;
  }

  // Move 1 checker
  boardState[fromIndex].count--;

  // If capturing (simplified)
  if (
    boardState[toIndex].player !== currentPlayer &&
    boardState[toIndex].count === 1
  ) {
    // In a full game, you'd place that checker on the bar
    boardState[toIndex] = { player: currentPlayer, count: 1 };
  } else if (boardState[toIndex].player === currentPlayer) {
    boardState[toIndex].count++;
  } else {
    // Empty or belongs to other with 0 checkers
    boardState[toIndex] = { player: currentPlayer, count: 1 };
  }

  // Mark the used die as 0
  const usedDieIndex = diceValues.indexOf(rawDistance);
  if (usedDieIndex !== -1) {
    diceValues[usedDieIndex] = 0;
  }

  // Re-render
  renderBoard();

  // If dice are fully used, switch
  if (diceValues[0] === 0 && diceValues[1] === 0) {
    switchPlayer();
  }
}

/*******************************************************
 * Highlight possible destinations for the selected point
 *******************************************************/
function highlightPossibleDestinations(fromIndex) {
  clearHighlights();

  const validSpots = getValidDestinations(fromIndex, diceValues, currentPlayer);

  // If no valid moves, highlight fromIndex in red
  if (validSpots.length === 0) {
    const fromPointEl = document.querySelector(
      `.point[data-index='${fromIndex}']`
    );
    fromPointEl?.classList.add("highlight-invalid");
    return;
  }

  // Otherwise highlight each valid target in green
  validSpots.forEach((target) => {
    const pointEl = document.querySelector(`.point[data-index='${target}']`);
    pointEl?.classList.add("highlight-valid");
  });
}

/*******************************************************
 * Get all valid destinations from a given index,
 * given the dice and the player's ring
 *******************************************************/
function getValidDestinations(fromIndex, dice, player) {
  const ring = (player === 1) ? redRing : blueRing;
  const fromPos = ring.indexOf(fromIndex);
  if (fromPos === -1) return [];

  const valid = [];

  dice.forEach((die) => {
    if (die <= 0) return; // already used

    let targetPos = fromPos + die;
    // If we exceed the ring length, wrap around
    if (targetPos >= 24) {
      targetPos = targetPos - 24;
    }

    const toIndex = ring[targetPos];
    // Check occupant
    const spot = boardState[toIndex];
    if (
      spot.player === 0 ||
      spot.player === player ||
      (spot.player !== player && spot.count === 1)
    ) {
      valid.push(toIndex);
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

  // CPU turn?
  if (gameMode === "cpu" && currentPlayer === 2) {
    cpuTurn();
  }
}

/*******************************************************
 * Simple CPU turn (naive)
 *******************************************************/
function cpuTurn() {
  setTimeout(() => {
    rollDice();

    // Attempt simple moves for each die
    for (let d = 0; d < diceValues.length; d++) {
      const dist = diceValues[d];
      if (dist > 0) {
        // find a checker for Player 2
        // Because we’re using the ring, let's just brute-force from ring[0..23]
        const ring = blueRing;
        let madeMove = false;

        for (let i = 0; i < 24; i++) {
          const idx = ring[i];
          if (boardState[idx].player === 2 && boardState[idx].count > 0) {
            // try moving dist steps forward in the ring
            let targetPos = i + dist;
            if (targetPos >= 24) targetPos -= 24;
            const toIdx = ring[targetPos];

            // check if it’s valid
            if (getValidDestinations(idx, [dist], 2).includes(toIdx)) {
              attemptMove(idx, toIdx);
              madeMove = true;
              break;
            }
          }
          if (madeMove) break;
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
