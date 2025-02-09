// Get canvas and context
const canvas = document.getElementById('boardCanvas');
const ctx = canvas.getContext('2d');

// Resize the canvas to fit the screen (or a max width)
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.9, 800);
  canvas.height = canvas.width * 0.6; // board aspect ratio
  drawBoard();
  drawCheckers();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game state object
let gameState = {
  board: new Array(24).fill(null).map(() => ({ color: null, count: 0 })),
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: 'white',
  dice: [],
  movesLeft: [],
  selectedPoint: null,
};

// Initialize board with standard backgammon positions
function initGame() {
  // Reset all points
  for (let i = 0; i < 24; i++) {
    gameState.board[i] = { color: null, count: 0 };
  }
  // Black: (using board indices 0–23, where 0 = point 1, 23 = point 24)
  // Standard positions: 2 on point 1 (index 0), 5 on point 12 (index 11),
  // 3 on point 17 (index 16), and 5 on point 19 (index 18)
  gameState.board[0] = { color: 'black', count: 2 };
  gameState.board[11] = { color: 'black', count: 5 };
  gameState.board[16] = { color: 'black', count: 3 };
  gameState.board[18] = { color: 'black', count: 5 };

  // White: 2 on point 24 (index 23), 5 on point 13 (index 12),
  // 3 on point 8 (index 7), and 5 on point 6 (index 5)
  gameState.board[23] = { color: 'white', count: 2 };
  gameState.board[12] = { color: 'white', count: 5 };
  gameState.board[7]  = { color: 'white', count: 3 };
  gameState.board[5]  = { color: 'white', count: 5 };

  gameState.bar = { white: 0, black: 0 };
  gameState.borneOff = { white: 0, black: 0 };
  gameState.currentPlayer = 'white';
  gameState.dice = [];
  gameState.movesLeft = [];
  gameState.selectedPoint = null;
  updateGameInfo();
}
initGame();

// Draw the backgammon board
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14; // 12 triangles plus margins for the bar gap
  const triangleHeight = boardHeight / 2;

  // Background
  ctx.fillStyle = "#006600";
  ctx.fillRect(0, 0, boardWidth, boardHeight);

  // Draw the bar (center divider)
  const barX = boardWidth / 2 - pointWidth / 2;
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(barX, 0, pointWidth, boardHeight);

  // Draw triangles on the top row (points 13–24)
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = (i % 2 === 0) ? "#FFD700" : "#8B0000";
    let x;
    if (i < 6) {
      // Left side of the bar (points 24 to 19, i.e. indexes 23 to 18)
      x = boardWidth / 2 - pointWidth * (i + 1) - pointWidth;
    } else {
      // Right side (points 18 to 13, i.e. indexes 17 to 12)
      x = boardWidth / 2 + pointWidth * (i - 6);
    }
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + pointWidth, 0);
    ctx.lineTo(x + pointWidth / 2, triangleHeight);
    ctx.closePath();
    ctx.fill();
  }

  // Draw triangles on the bottom row (points 1–12)
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = (i % 2 === 0) ? "#FFD700" : "#8B0000";
    let x;
    if (i < 6) {
      // Left side of the bar (points 1 to 6, indexes 0–5)
      x = boardWidth / 2 - pointWidth * (6 - i);
    } else {
      // Right side (points 7 to 12, indexes 6–11)
      x = boardWidth / 2 + pointWidth * (i - 6) + pointWidth;
    }
    ctx.beginPath();
    ctx.moveTo(x, boardHeight);
    ctx.lineTo(x + pointWidth, boardHeight);
    ctx.lineTo(x + pointWidth / 2, boardHeight - triangleHeight);
    ctx.closePath();
    ctx.fill();
  }
}

// Draw checkers on the board
function drawCheckers() {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const checkerRadius = pointWidth * 0.4;
  
  // Helper function to draw a single checker
  function drawChecker(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, checkerRadius, 0, Math.PI * 2);
    ctx.fillStyle = (color === 'white') ? "#FFFFFF" : "#000000";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
  }
  
  // Loop through each board point and draw any checkers present.
  // We assume:
  // - Bottom row: points 1–12 (indexes 0–11)
  // - Top row: points 13–24 (indexes 12–23)
  for (let i = 0; i < 24; i++) {
    const point = gameState.board[i];
    if (point.count === 0) continue;
    
    let isTop = i >= 12;
    let x, yStart, yStep = checkerRadius * 2.2;
    if (isTop) {
      // Top row: For simplicity, we split the top into two groups:
      // indexes 12–17 (right of bar) and 18–23 (left of bar)
      if (i < 18) {
        let pos = i - 12;
        x = canvas.width / 2 + pointWidth * pos + pointWidth + pointWidth / 2;
      } else {
        let pos = i - 18;
        x = canvas.width / 2 - pointWidth * (pos + 1) - pointWidth / 2;
      }
      yStart = checkerRadius + 5;
      for (let j = 0; j < point.count; j++) {
        let y = yStart + j * yStep;
        if (y > canvas.height / 2 - checkerRadius) y = canvas.height / 2 - checkerRadius;
        drawChecker(x, y, point.color);
      }
    } else {
      // Bottom row: split into two groups: indexes 0–5 (left of bar) and 6–11 (right of bar)
      if (i < 6) {
        let pos = i;
        x = canvas.width / 2 - pointWidth * (6 - pos) + pointWidth / 2;
      } else {
        let pos = i - 6;
        x = canvas.width / 2 + pointWidth * pos + pointWidth + pointWidth / 2;
      }
      yStart = canvas.height - checkerRadius - 5;
      for (let j = 0; j < point.count; j++) {
        let y = yStart - j * yStep;
        if (y < canvas.height / 2 + checkerRadius) y = canvas.height / 2 + checkerRadius;
        drawChecker(x, y, point.color);
      }
    }
  }
  
  // Draw checkers on the bar (if any)
  if (gameState.bar.white > 0) {
    let x = canvas.width / 2;
    let yStart = canvas.height / 2 + checkerRadius + 10;
    for (let j = 0; j < gameState.bar.white; j++) {
      let y = yStart + j * (checkerRadius * 2.2);
      drawChecker(x, y, 'white');
    }
  }
  if (gameState.bar.black > 0) {
    let x = canvas.width / 2;
    let yStart = canvas.height / 2 - checkerRadius - 10;
    for (let j = 0; j < gameState.bar.black; j++) {
      let y = yStart - j * (checkerRadius * 2.2);
      drawChecker(x, y, 'black');
    }
  }
}

// Update game information display
function updateGameInfo() {
  const infoDiv = document.getElementById('gameInfo');
  infoDiv.innerHTML = `Current Player: ${gameState.currentPlayer.toUpperCase()}`;
  
  const diceDiv = document.getElementById('diceDisplay');
  diceDiv.innerHTML = `Dice: ${gameState.dice.join(', ')}`;
}

// --- Dice Roll Functionality ---
// When the player clicks the "Roll Dice" button, roll two dice.
document.getElementById('rollButton').addEventListener('click', () => {
  if (gameState.dice.length > 0) {
    alert("You've already rolled!");
    return;
  }
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  gameState.dice = [die1, die2];
  // Doubles yield four moves
  gameState.movesLeft = (die1 === die2) ? [die1, die1, die1, die1] : [die1, die2];
  updateGameInfo();
});

// --- Interactivity: Clicking to Move Checkers ---
// We add a click listener to the canvas to let the player select a checker
// and then select a destination point.
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const pointIndex = getPointFromCoordinates(clickX, clickY);
  if (pointIndex === null) return; // clicked outside active board areas
  
  // If no piece is selected, select one if it belongs to the current player.
  if (gameState.selectedPoint === null) {
    const point = gameState.board[pointIndex];
    if (point && point.count > 0 && point.color === gameState.currentPlayer) {
      gameState.selectedPoint = pointIndex;
      highlightPoint(pointIndex);
    }
  } else {
    // Attempt to move from the selected point to the clicked point.
    attemptMove(gameState.selectedPoint, pointIndex);
    gameState.selectedPoint = null;
    drawBoard();
    drawCheckers();
  }
});

// --- Mapping Click Coordinates to a Board Point ---
// (This mapping is tied to how we drew the board above.)
function getPointFromCoordinates(x, y) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  
  let isTop = y < boardHeight / 2;
  let pointIndex = null;
  if (isTop) {
    // Top row
    if (x < boardWidth / 2 - pointWidth) {
      // Left side of the bar (points 19–24 => indexes 18–23)
      let relativeX = boardWidth / 2 - pointWidth - x;
      let pos = Math.floor(relativeX / pointWidth);
      pointIndex = 23 - pos;
    } else if (x > boardWidth / 2 + pointWidth) {
      // Right side (points 13–18 => indexes 12–17)
      let relativeX = x - (boardWidth / 2 + pointWidth);
      let pos = Math.floor(relativeX / pointWidth);
      pointIndex = 12 + pos;
    }
  } else {
    // Bottom row
    if (x < boardWidth / 2) {
      // Left side (points 1–6 => indexes 0–5)
      let relativeX = x - (boardWidth / 2 - pointWidth * 6);
      let pos = Math.floor(relativeX / pointWidth);
      pointIndex = pos;
    } else if (x > boardWidth / 2) {
      // Right side (points 7–12 => indexes 6–11)
      let relativeX = x - boardWidth / 2 - pointWidth;
      let pos = Math.floor(relativeX / pointWidth);
      pointIndex = 6 + pos;
    }
  }
  return pointIndex;
}

// --- Highlight a Selected Point ---
// (For simplicity, we overlay a semi-transparent rectangle.)
function highlightPoint(pointIndex) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  let x, y, width, height;
  if (pointIndex < 12) { // Bottom row
    if (pointIndex < 6) {
      x = boardWidth / 2 - pointWidth * 6 + pointIndex * pointWidth;
    } else {
      x = boardWidth / 2 + pointWidth + (pointIndex - 6) * pointWidth;
    }
    y = boardHeight / 2;
    width = pointWidth;
    height = boardHeight / 2;
  } else { // Top row
    if (pointIndex < 18) {
      x = boardWidth / 2 + pointWidth + (pointIndex - 12) * pointWidth;
    } else {
      x = boardWidth / 2 - pointWidth * (pointIndex - 17);
    }
    y = 0;
    width = pointWidth;
    height = boardHeight / 2;
  }
  ctx.fillStyle = "rgba(0,0,255,0.3)";
  ctx.fillRect(x, y, width, height);
}

// --- Attempt a Move ---
// This function checks if the selected move is legal given the dice roll.
// (It uses a simplified rule: the move distance must match one of the dice values.)
function attemptMove(fromIndex, toIndex) {
  const fromPoint = gameState.board[fromIndex];
  if (!fromPoint || fromPoint.count === 0 || fromPoint.color !== gameState.currentPlayer)
    return;
  
  // Calculate move distance (note: white moves from higher index to lower, black vice versa)
  let moveDistance = (gameState.currentPlayer === 'white') 
    ? fromIndex - toIndex 
    : toIndex - fromIndex;
    
  if (moveDistance <= 0) {
    alert("Invalid move direction.");
    return;
  }
  
  // Check if any available die exactly matches the move distance.
  let dieIndex = gameState.movesLeft.indexOf(moveDistance);
  if (dieIndex === -1) {
    alert("No matching dice for that move distance.");
    return;
  }
  
  // Validate destination: if it is occupied by more than one opposing checker, the move is illegal.
  const destination = gameState.board[toIndex];
  if (destination.count > 0 && destination.color !== gameState.currentPlayer && destination.count > 1) {
    alert("Destination blocked.");
    return;
  }
  
  // Move is valid. Update the game state:
  // Remove a checker from the origin.
  fromPoint.count--;
  if (fromPoint.count === 0) {
    fromPoint.color = null;
  }
  // If the destination has one opponent checker, hit it (send it to the bar).
  if (destination.count === 1 && destination.color !== gameState.currentPlayer) {
    if (destination.color === 'white') {
      gameState.bar.white++;
    } else {
      gameState.bar.black++;
    }
    gameState.board[toIndex] = { color: gameState.currentPlayer, count: 1 };
  } else {
    // Otherwise, add the checker to the destination.
    if (destination.count === 0) {
      gameState.board[toIndex] = { color: gameState.currentPlayer, count: 1 };
    } else {
      gameState.board[toIndex].count++;
    }
  }
  
  // Remove the die that was used.
  gameState.movesLeft.splice(dieIndex, 1);
  
  // If no moves remain, switch turns.
  if (gameState.movesLeft.length === 0) {
    gameState.dice = [];
    gameState.currentPlayer = (gameState.currentPlayer === 'white') ? 'black' : 'white';
  }
  updateGameInfo();
}

// Initial draw
function redraw() {
  drawBoard();
  drawCheckers();
}
redraw();
