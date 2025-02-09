// ==================== Global Setup ====================
const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

// Resize canvas to fit screen (with a maximum width)
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.95, 800);
  canvas.height = canvas.width * 0.6; // maintain board aspect ratio
  redraw();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==================== Game State ====================
// We use indices 0..23 for the 24 board points.
// Standard starting positions:
// • White (human): 2 on point 24 (index 23), 5 on point 13 (index 12),
//   3 on point 8 (index 7), and 5 on point 6 (index 5).
// • Black (CPU): 2 on point 1 (index 0), 5 on point 12 (index 11),
//   3 on point 17 (index 16), and 5 on point 19 (index 18).
// White moves from high index toward 0 (and bears off on the left),
// while Black moves from low index upward (bearing off on the right).
let gameState = {
  board: new Array(24).fill(null).map(() => ({ color: null, count: 0 })),
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: null, // "white" (human) or "black" (CPU)
  dice: [],            // The current dice values
  movesLeft: [],       // The dice values not yet used this turn
  selectedSource: null, // When a piece is selected: a board index or "bar"
  validMoves: [],      // Valid moves for the selected checker
  // Game phase controls overall flow:
  // "initial" – initial roll to decide who goes first.
  // "playerRoll" / "playerMove" – human turn.
  // "cpuRoll" / "cpuMove" – CPU turn.
  gamePhase: "initial",
  // For initial roll: each side’s one-die result.
  initialRoll: { white: null, black: null },
};

// ==================== Initial Setup ====================
function initGame() {
  // Clear the board first
  for (let i = 0; i < 24; i++) {
    gameState.board[i] = { color: null, count: 0 };
  }
  // Black (CPU)
  gameState.board[0]   = { color: "black", count: 2 };
  gameState.board[11]  = { color: "black", count: 5 };
  gameState.board[16]  = { color: "black", count: 3 };
  gameState.board[18]  = { color: "black", count: 5 };
  // White (human)
  gameState.board[23]  = { color: "white", count: 2 };
  gameState.board[12]  = { color: "white", count: 5 };
  gameState.board[7]   = { color: "white", count: 3 };
  gameState.board[5]   = { color: "white", count: 5 };

  gameState.bar.white = 0;
  gameState.bar.black = 0;
  gameState.borneOff.white = 0;
  gameState.borneOff.black = 0;
  gameState.dice = [];
  gameState.movesLeft = [];
  gameState.selectedSource = null;
  gameState.validMoves = [];
  gameState.currentPlayer = null;
  gameState.gamePhase = "initial";
  gameState.initialRoll.white = null;
  gameState.initialRoll.black = null;
  updateGameInfo();
  redraw();
}
initGame();

// ==================== Drawing Functions ====================

// Draw the board with a tan background and alternating point colors.
// The board is divided into two halves with a central bar.
function drawBoard() {
  // Clear entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // (The canvas background is already tan via CSS, but we fill it here as well.)
  ctx.fillStyle = "#D2B48C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const barX = boardWidth / 2 - pointWidth;

  // Draw the bar (central divider)
  ctx.fillStyle = "#A0522D"; // rich brown
  ctx.fillRect(barX, 0, pointWidth * 2, boardHeight);

  // Colors for points
  const darkColor = "#8B4513";
  const lightColor = "#CD853F";

  // --- Top Row (points 13–24) ---
  // Points 24 to 19 (indices 23 to 18) are to the left of the bar.
  // Points 18 to 13 (indices 17 to 12) are to the right.
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      // Left of bar: i=0 gives point 24 (index 23), i=5 gives point 19 (index 18)
      x = barX - pointWidth * (6 - i);
    } else {
      // Right of bar: i=6 gives point 18 (index 17), i=11 gives point 13 (index 12)
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, 0, pointWidth, triangleHeight, "down", color);
  }

  // --- Bottom Row (points 1–12) ---
  // Points 1–6 (indices 0–5) lie to the left of the bar,
  // and points 7–12 (indices 6–11) lie to the right.
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      x = boardWidth / 2 - pointWidth * (6 - i);
    } else {
      x = boardWidth / 2 + pointWidth + (i - 6) * pointWidth;
    }
    drawTriangle(x, boardHeight - triangleHeight, pointWidth, triangleHeight, "up", color);
  }
}

// Helper to draw a triangle (point) given its position and direction.
function drawTriangle(x, y, width, height, direction, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (direction === "up") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width / 2, y + height);
  } else {
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width / 2, y);
  }
  ctx.closePath();
  ctx.fill();
}

// Draw all checkers based on gameState.board and gameState.bar.
function drawCheckers() {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const checkerRadius = pointWidth * 0.4;
  const offset = 5;

  // Draw checkers on board points.
  // Bottom row: indices 0–11 (points 1–12)
  // Top row: indices 12–23 (points 13–24)
  for (let i = 0; i < 24; i++) {
    const point = gameState.board[i];
    if (point.count === 0) continue;
    let isTop = i >= 12;
    let x, yStart, yStep = checkerRadius * 2.2;
    if (isTop) {
      // For top row:
      if (i < 18) {
        // Right of bar: indices 12–17 (points 13–18)
        let pos = i - 12;
        x = boardWidth / 2 + pointWidth * 2 + pos * pointWidth + pointWidth / 2;
      } else {
        // Left of bar: indices 18–23 (points 19–24; note reverse order)
        let pos = 23 - i;
        x = boardWidth / 2 - pointWidth * (pos + 1) + pointWidth / 2;
      }
      yStart = checkerRadius + offset;
      // Stack checkers from the top down (but not past the middle)
      for (let j = 0; j < point.count; j++) {
        let y = yStart + j * yStep;
        if (y > triangleHeight - checkerRadius) y = triangleHeight - checkerRadius;
        drawChecker(x, y, point.color);
      }
    } else {
      // Bottom row:
      if (i < 6) {
        // Left of bar: indices 0–5 (points 1–6)
        x = boardWidth / 2 - pointWidth * (6 - i) + pointWidth / 2;
      } else {
        // Right of bar: indices 6–11 (points 7–12)
        let pos = i - 6;
        x = boardWidth / 2 + pointWidth + pos * pointWidth + pointWidth / 2;
      }
      yStart = boardHeight - checkerRadius - offset;
      // Stack checkers upward from the bottom (but not past the middle)
      for (let j = 0; j < point.count; j++) {
        let y = yStart - j * yStep;
        if (y < triangleHeight + checkerRadius) y = triangleHeight + checkerRadius;
        drawChecker(x, y, point.color);
      }
    }
  }

  // Draw checkers on the bar.
  if (gameState.bar.white > 0) {
    let barCenter = getBarCenter("white");
    // For multiple checkers, offset vertically.
    for (let j = 0; j < gameState.bar.white; j++) {
      drawChecker(barCenter.x, barCenter.y + j * (checkerRadius * 2.2), "white");
    }
  }
  if (gameState.bar.black > 0) {
    let barCenter = getBarCenter("black");
    for (let j = 0; j < gameState.bar.black; j++) {
      drawChecker(barCenter.x, barCenter.y - j * (checkerRadius * 2.2), "black");
    }
  }
}

// Helper to draw a single checker.
function drawChecker(x, y, color) {
  const boardWidth = canvas.width;
  const pointWidth = boardWidth / 14;
  const checkerRadius = pointWidth * 0.4;
  ctx.beginPath();
  ctx.arc(x, y, checkerRadius, 0, Math.PI * 2);
  // Use pure white and pure black for the checkers.
  ctx.fillStyle = color === "white" ? "#FFFFFF" : "#000000";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#333";
  ctx.stroke();
}

// Draw the dice in the middle of the board (one above the other).
function drawDice() {
  if (gameState.dice.length === 0) return;
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const diceSize = pointWidth; // dice are squares roughly as wide as a board point
  const diceX = (boardWidth - diceSize) / 2;
  // Vertically center the two dice (one above, one below center)
  const diceY1 = boardHeight / 2 - diceSize - 5;
  const diceY2 = boardHeight / 2 + 5;

  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  // Draw first dice
  ctx.fillRect(diceX, diceY1, diceSize, diceSize);
  ctx.strokeRect(diceX, diceY1, diceSize, diceSize);
  // Draw second dice
  ctx.fillRect(diceX, diceY2, diceSize, diceSize);
  ctx.strokeRect(diceX, diceY2, diceSize, diceSize);

  // Draw the dice values (centered)
  ctx.fillStyle = "#000000";
  ctx.font = diceSize * 0.6 + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (gameState.dice.length >= 1) {
    ctx.fillText(gameState.dice[0], diceX + diceSize / 2, diceY1 + diceSize / 2);
  }
  if (gameState.dice.length >= 2) {
    ctx.fillText(gameState.dice[1], diceX + diceSize / 2, diceY2 + diceSize / 2);
  }
}

// ==================== Helper Functions for Animation ====================

// Compute the center of a board point (for moving checkers).
function getPointCenter(index) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  let cx, cy;
  if (index < 12) {
    // Bottom row: indices 0–11.
    if (index < 6) {
      cx = boardWidth / 2 - pointWidth * (6 - index) + pointWidth / 2;
    } else {
      cx = boardWidth / 2 + pointWidth + (index - 6) * pointWidth + pointWidth / 2;
    }
    cy = boardHeight - triangleHeight / 2;
  } else {
    // Top row: indices 12–23.
    if (index < 18) { // Right of bar: indices 12–17.
      let pos = index - 12;
      cx = boardWidth / 2 + pointWidth * 2 + pos * pointWidth + pointWidth / 2;
    } else { // Left of bar: indices 18–23 (reverse order)
      let pos = 23 - index;
      cx = boardWidth / 2 - pointWidth * (pos + 1) + pointWidth / 2;
    }
    cy = triangleHeight / 2;
  }
  return { x: cx, y: cy };
}

// Compute a center point for checkers on the bar.
function getBarCenter(player) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  if (player === "white") {
    // Place white checkers roughly in the lower half of the bar.
    return { x: boardWidth / 2, y: (boardHeight + boardHeight / 2) / 2 };
  } else {
    // Place black checkers in the upper half.
    return { x: boardWidth / 2 + pointWidth, y: boardHeight / 4 };
  }
}

// Compute a center point for bearing off.
function getBearOffCenter(player) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  if (player === "white") {
    // For white, bearing off is on the left side.
    return { x: 20, y: boardHeight - 20 };
  } else {
    // For black, bearing off is on the right side.
    return { x: boardWidth - 20, y: 20 };
  }
}

// ==================== UI & Dice Roll Animation ====================

function updateGameInfo() {
  const infoDiv = document.getElementById("gameInfo");
  let phaseText = "";
  switch (gameState.gamePhase) {
    case "initial":
      phaseText = "Initial Roll: Click Roll Dice to roll your die.";
      break;
    case "playerRoll":
      phaseText = "Your Turn: Click Roll Dice to roll.";
      break;
    case "playerMove":
      phaseText = "Your Turn: Select a checker to see valid moves.";
      break;
    case "cpuRoll":
      phaseText = "CPU's Turn: Rolling dice...";
      break;
    case "cpuMove":
      phaseText = "CPU is moving...";
      break;
  }
  let diceText = gameState.dice.length > 0 ? "Dice: " + gameState.dice.join(", ") : "";
  let turnText = gameState.currentPlayer === "white" ? "Your checkers (White)" : "CPU checkers (Black)";
  infoDiv.innerHTML = `<strong>${phaseText}</strong><br>${diceText}<br>Current Turn: ${turnText}`;
}

// Roll the dice with an animation that shows rapidly changing values.
function rollDiceAnimation(numDice, callback) {
  let duration = 1000; // animation duration in ms
  let interval = 100;  // update every 100ms
  let elapsed = 0;
  let animationInterval = setInterval(() => {
    let tempRolls = [];
    for (let i = 0; i < numDice; i++) {
      tempRolls.push(Math.floor(Math.random() * 6) + 1);
    }
    gameState.dice = tempRolls;
    updateGameInfo();
    redraw();
    elapsed += interval;
    if (elapsed >= duration) {
      clearInterval(animationInterval);
      // Final dice values:
      let finalRolls = [];
      for (let i = 0; i < numDice; i++) {
        finalRolls.push(Math.floor(Math.random() * 6) + 1);
      }
      gameState.dice = finalRolls;
      // Set movesLeft (4 moves if doubles, else 2 moves).
      if (numDice === 2 && finalRolls[0] === finalRolls[1]) {
        gameState.movesLeft = [finalRolls[0], finalRolls[0], finalRolls[0], finalRolls[0]];
      } else if (numDice === 2) {
        gameState.movesLeft = [...finalRolls];
      }
      updateGameInfo();
      redraw();
      callback(finalRolls);
    }
  }, interval);
}

// ==================== Checker Move Animation ====================

// This function animates a checker moving from its source to destination.
function animateCheckerMove(move, callback) {
  let player = gameState.currentPlayer;
  let startPos, endPos;
  if (move.from === "bar") {
    startPos = getBarCenter(player);
  } else {
    startPos = getPointCenter(move.from);
  }
  if (move.bearOff) {
    endPos = getBearOffCenter(player);
  } else {
    endPos = getPointCenter(move.to);
  }
  let duration = 500; // duration in ms
  let startTime = null;
  function animateStep(timestamp) {
    if (!startTime) startTime = timestamp;
    let elapsed = timestamp - startTime;
    let t = Math.min(elapsed / duration, 1);
    let currentX = startPos.x + t * (endPos.x - startPos.x);
    let currentY = startPos.y + t * (endPos.y - startPos.y);
    redraw(); // redraw board, checkers, and dice
    // Draw the moving checker on top.
    const boardWidth = canvas.width;
    const pointWidth = boardWidth / 14;
    const checkerRadius = pointWidth * 0.4;
    ctx.beginPath();
    ctx.arc(currentX, currentY, checkerRadius, 0, Math.PI * 2);
    ctx.fillStyle = player === "white" ? "#FFFFFF" : "#000000";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.stroke();
    if (t < 1) {
      requestAnimationFrame(animateStep);
    } else {
      callback();
    }
  }
  requestAnimationFrame(animateStep);
}

// This function performs a move with an animation.
// It first removes the checker from the source (so it isn’t drawn in its old position),
// then animates the moving checker, and finally updates the destination.
function performMove(move, callback) {
  // Remove the used die from movesLeft.
  let dieIndex = gameState.movesLeft.indexOf(move.die);
  if (dieIndex !== -1) gameState.movesLeft.splice(dieIndex, 1);
  // Remove checker from source.
  if (move.from === "bar") {
    gameState.bar[gameState.currentPlayer]--;
  } else {
    gameState.board[move.from].count--;
    if (gameState.board[move.from].count === 0) {
      gameState.board[move.from].color = null;
    }
  }
  // Animate the moving checker.
  animateCheckerMove(move, () => {
    // After animation, update destination.
    if (move.bearOff) {
      gameState.borneOff[gameState.currentPlayer]++;
    } else {
      let destPoint = gameState.board[move.to];
      // If there’s exactly one opposing checker, hit it.
      if (destPoint.count === 1 && destPoint.color !== gameState.currentPlayer) {
        gameState.bar[destPoint.color]++;
        gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
      } else {
        if (destPoint.count === 0) {
          gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
        } else {
          gameState.board[move.to].count++;
        }
      }
    }
    callback();
  });
}

// ==================== Move Generation & Validation ====================

// Returns an array of valid moves for a checker at the given source.
// Source is either a board index or "bar".
function getValidMoves(source) {
  let moves = [];
  if (source === "bar") {
    // When re-entering from the bar:
    // For white, re-entry is into the opponent's home board (points 19–24, indices 18–23).
    gameState.movesLeft.forEach((die) => {
      let dest = 24 - die; // die 1 enters at index 23, die 6 at index 18.
      let point = gameState.board[dest];
      // Allow if the destination is empty or has one opposing checker.
      if (
        point.count === 0 ||
        point.color === "white" ||
        (point.count === 1 && point.color === "black")
      ) {
        moves.push({ from: "bar", to: dest, die: die, bearOff: false });
      }
    });
  } else if (typeof source === "number") {
    gameState.movesLeft.forEach((die) => {
      let dest, bearOff = false;
      if (gameState.currentPlayer === "white") {
        dest = source - die;
        // Bearing off: if dest is off the board and all white checkers are in home board (indices 0–5).
        if (dest < 0 && canBearOff("white")) {
          bearOff = true;
        }
      } else {
        dest = source + die;
        if (dest > 23 && canBearOff("black")) {
          bearOff = true;
        }
      }
      if (bearOff) {
        moves.push({ from: source, to: null, die: die, bearOff: true });
      } else if (dest >= 0 && dest <= 23) {
        let destination = gameState.board[dest];
        if (
          destination.count === 0 ||
          destination.color === gameState.currentPlayer ||
          (destination.count === 1 && destination.color !== gameState.currentPlayer)
        ) {
          moves.push({ from: source, to: dest, die: die, bearOff: false });
        }
      }
    });
  }
  return moves;
}

// Check if all checkers for a player are in their home board.
function canBearOff(player) {
  let homeRange;
  if (player === "white") {
    homeRange = [0, 5]; // white's home board (points 1–6)
  } else {
    homeRange = [18, 23]; // black's home board (points 19–24)
  }
  let totalOnBoard = 0, inHome = 0;
  for (let i = 0; i < 24; i++) {
    let point = gameState.board[i];
    if (point.color === player) {
      totalOnBoard += point.count;
      if (i >= homeRange[0] && i <= homeRange[1]) {
        inHome += point.count;
      }
    }
  }
  // If any checkers are on the bar, bearing off is not allowed.
  if (gameState.bar[player] > 0) return false;
  return totalOnBoard > 0 && totalOnBoard === inHome;
}

// ==================== Player Input Handling ====================

// Map a click’s coordinates to a board point (or "bar").
// (This logic matches the board–drawing layout.)
function getPointFromCoordinates(x, y) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const barX = boardWidth / 2 - pointWidth;
  // If click is in the bar and the player has checkers there, return "bar".
  if (x >= barX && x <= barX + pointWidth * 2) {
    if (gameState.bar[gameState.currentPlayer] > 0) return "bar";
  }
  // Determine top or bottom half.
  if (y < triangleHeight) {
    // Top row: points 13–24.
    if (x < barX) {
      let pos = Math.floor((barX - x) / pointWidth);
      return 23 - pos; // left of bar: indices 23 downwards.
    } else if (x > barX + pointWidth * 2) {
      let pos = Math.floor((x - (barX + pointWidth * 2)) / pointWidth);
      return 12 + pos; // right of bar: indices 12 upwards.
    }
  } else {
    // Bottom row: points 1–12.
    if (x < barX) {
      let pos = Math.floor((x - (barX - pointWidth * 6)) / pointWidth);
      return pos; // left of bar: indices 0–5.
    } else if (x > barX + pointWidth * 2) {
      let pos = Math.floor((x - (barX + pointWidth * 2)) / pointWidth);
      return 6 + pos; // right of bar: indices 6–11.
    }
  }
  return null;
}

// Handle clicks during the player's move phase.
canvas.addEventListener("click", (event) => {
  // Only allow clicks when it's the human's move phase.
  if (gameState.currentPlayer !== "white" || gameState.gamePhase !== "playerMove") return;
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  let clickedArea = getPointFromCoordinates(clickX, clickY);
  // If the player has checkers on the bar, they must re‑enter from there.
  if (gameState.bar.white > 0 && clickedArea !== "bar") {
    alert("You must re‑enter your checkers from the bar!");
    return;
  }
  if (gameState.selectedSource === null) {
    // No checker selected yet; try to select one.
    if (clickedArea === "bar") {
      gameState.selectedSource = "bar";
      gameState.validMoves = getValidMoves("bar");
      if (gameState.validMoves.length === 0) {
        alert("No legal moves from the bar!");
        gameState.selectedSource = null;
        return;
      }
    } else if (typeof clickedArea === "number") {
      const point = gameState.board[clickedArea];
      if (point && point.count > 0 && point.color === "white") {
        gameState.selectedSource = clickedArea;
        gameState.validMoves = getValidMoves(clickedArea);
        if (gameState.validMoves.length === 0) {
          alert("No legal moves for this checker.");
          gameState.selectedSource = null;
          return;
        }
      }
    }
    redraw();
    // Optionally, highlight valid destinations here.
  } else {
    // A checker is already selected; try to complete a move.
    let destination = clickedArea;
    // For bearing off, if the player clicks near the bottom-left corner.
    if (gameState.selectedSource !== "bar" && destination === null && clickX < 50 && clickY > canvas.height - 50) {
      destination = "bearOff";
    }
    let chosenMove = gameState.validMoves.find(
      (move) => (move.to === destination) || (move.bearOff && destination === "bearOff")
    );
    if (chosenMove) {
      // Perform the move with animation.
      performMove(chosenMove, () => {
        gameState.selectedSource = null;
        gameState.validMoves = [];
        updateGameInfo();
        redraw();
        if (gameState.movesLeft.length === 0) {
          endTurn();
        }
      });
    } else {
      // Deselect if the clicked area isn’t a valid destination.
      gameState.selectedSource = null;
      gameState.validMoves = [];
      redraw();
    }
  }
});

// ==================== Turn Management & CPU Logic ====================

// Called when no moves remain; switches turns.
function endTurn() {
  if (gameState.currentPlayer === "white") {
    gameState.currentPlayer = "black";
    gameState.gamePhase = "cpuRoll";
    updateGameInfo();
    setTimeout(cpuTurn, 1000);
  } else {
    gameState.currentPlayer = "white";
    gameState.gamePhase = "playerRoll";
    gameState.dice = [];
    gameState.movesLeft = [];
    updateGameInfo();
    redraw();
  }
}

// CPU turn: roll dice and then make moves automatically.
function cpuTurn() {
  if (gameState.currentPlayer !== "black") return;
  gameState.gamePhase = "cpuRoll";
  updateGameInfo();
  rollDiceAnimation(2, () => {
    gameState.gamePhase = "cpuMove";
    updateGameInfo();
    setTimeout(cpuMakeMove, 500);
  });
}

// Gather all legal moves for the CPU.
function getAllLegalMoves(player) {
  let moves = [];
  // If checkers are on the bar, these must be moved first.
  if (gameState.bar[player] > 0) {
    gameState.movesLeft.forEach((die) => {
      // For black, re-entry is into white’s home board (points 1–6, indices 0–5).
      let dest = die - 1;
      let point = gameState.board[dest];
      if (
        point.count === 0 ||
        point.color === player ||
        (point.count === 1 && point.color !== player)
      ) {
        moves.push({ from: "bar", to: dest, die: die, bearOff: false });
      }
    });
    return moves;
  }
  for (let i = 0; i < 24; i++) {
    let point = gameState.board[i];
    if (point.color === player && point.count > 0) {
      gameState.movesLeft.forEach((die) => {
        let dest, bearOff = false;
        if (player === "black") {
          dest = i + die;
          if (dest > 23 && canBearOff("black")) {
            bearOff = true;
          }
        } else {
          dest = i - die;
          if (dest < 0 && canBearOff("white")) {
            bearOff = true;
          }
        }
        if (bearOff) {
          moves.push({ from: i, to: null, die: die, bearOff: true });
        } else if (dest >= 0 && dest <= 23) {
          let destination = gameState.board[dest];
          if (
            destination.count === 0 ||
            destination.color === player ||
            (destination.count === 1 && destination.color !== player)
          ) {
            moves.push({ from: i, to: dest, die: die, bearOff: false });
          }
        }
      });
    }
  }
  return moves;
}

// CPU makes one move at a time.
function cpuMakeMove() {
  if (gameState.currentPlayer !== "black" || gameState.gamePhase !== "cpuMove") return;
  let legalMoves = getAllLegalMoves("black");
  if (legalMoves.length === 0) {
    gameState.dice = [];
    gameState.movesLeft = [];
    endTurn();
    return;
  }
  // (For simplicity, pick the first legal move.)
  let move = legalMoves[0];
  performMove(move, () => {
    updateGameInfo();
    setTimeout(() => {
      if (gameState.movesLeft.length > 0) {
        cpuMakeMove();
      } else {
        endTurn();
      }
    }, 600);
  });
}

// ==================== Redraw Function ====================
function redraw() {
  drawBoard();
  drawCheckers();
  drawDice();
  updateGameInfo();
}

// ==================== Dice Roll Button Handler ====================
document.getElementById("rollButton").addEventListener("click", () => {
  if (gameState.gamePhase === "initial") {
    // --- Initial Roll to decide who goes first ---
    document.getElementById("rollButton").disabled = true;
    rollDiceAnimation(1, (roll) => {
      gameState.initialRoll.white = roll[0];
      updateGameInfo();
      setTimeout(() => {
        rollDiceAnimation(1, (cpuRoll) => {
          gameState.initialRoll.black = cpuRoll[0];
          if (gameState.initialRoll.white === gameState.initialRoll.black) {
            alert("Tie! Roll again to decide who goes first.");
            gameState.initialRoll.white = null;
            gameState.initialRoll.black = null;
            gameState.dice = [];
            gameState.gamePhase = "initial";
            updateGameInfo();
          } else {
            if (gameState.initialRoll.white > gameState.initialRoll.black) {
              gameState.currentPlayer = "white";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft = gameState.initialRoll.white === gameState.initialRoll.black
                ? [gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white]
                : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("You won the initial roll! You go first.");
              gameState.gamePhase = "playerMove";
            } else {
              gameState.currentPlayer = "black";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft = gameState.initialRoll.white === gameState.initialRoll.black
                ? [gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black]
                : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("CPU won the initial roll! CPU goes first.");
              gameState.gamePhase = "cpuMove";
              setTimeout(cpuTurn, 1000);
            }
          }
          document.getElementById("rollButton").disabled = false;
          updateGameInfo();
          redraw();
        });
      }, 500);
    });
  } else if (gameState.gamePhase === "playerRoll") {
    // --- Player’s regular turn dice roll ---
    document.getElementById("rollButton").disabled = true;
    rollDiceAnimation(2, () => {
      gameState.gamePhase = "playerMove";
      document.getElementById("rollButton").disabled = false;
      updateGameInfo();
      redraw();
    });
  }
});

// ==================== Initial Redraw ====================
redraw();
