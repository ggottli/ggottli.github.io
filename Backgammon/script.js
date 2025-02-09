// ------------------ Global Setup ------------------
const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

// Resize canvas (max width 800px, and a board aspect ratio of 0.6)
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.95, 800);
  canvas.height = canvas.width * 0.6;
  redraw();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ------------------ Game State ------------------
/*
  We represent the board as an array of 24 points (indices 0–23).
  For indexing:
    • Point 1 is index 0 and Point 24 is index 23.
    • White (human) moves from high indices to low (bearing off on the left),
      and Black (CPU) moves from low to high (bearing off on the right).

  Standard starting positions:
    • Black: 2 on point 1 (index 0), 5 on point 12 (index 11),
             3 on point 17 (index 16), 5 on point 19 (index 18)
    • White: 2 on point 24 (index 23), 5 on point 13 (index 12),
             3 on point 8 (index 7), 5 on point 6 (index 5)
*/
let gameState = {
  board: [], // will hold 24 objects {color: "white"/"black", count: number}
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: null, // "white" (human) or "black" (CPU)
  dice: [],            // current dice values
  movesLeft: [],       // dice values not yet used this turn
  selectedSource: null, // when a checker is selected (a board index or "bar")
  validMoves: [],      // legal moves for the selected checker
  // gamePhase controls overall flow:
  // "initial" – initial roll to decide who goes first.
  // "playerRoll" / "playerMove" – human turn.
  // "cpuRoll" / "cpuMove" – CPU turn.
  gamePhase: "initial",
  initialRoll: { white: null, black: null } // for initial one-die roll per side
};

// Initialize board with starting positions
function initBoard() {
  gameState.board = [];
  for (let i = 0; i < 24; i++) {
    gameState.board.push({ color: null, count: 0 });
  }
  // Black starting positions:
  gameState.board[0] = { color: "black", count: 2 };
  gameState.board[11] = { color: "black", count: 5 };
  gameState.board[16] = { color: "black", count: 3 };
  gameState.board[18] = { color: "black", count: 5 };
  // White starting positions:
  gameState.board[23] = { color: "white", count: 2 };
  gameState.board[12] = { color: "white", count: 5 };
  gameState.board[7]  = { color: "white", count: 3 };
  gameState.board[5]  = { color: "white", count: 5 };

  gameState.bar.white = 0;
  gameState.bar.black = 0;
  gameState.borneOff.white = 0;
  gameState.borneOff.black = 0;
  gameState.dice = [];
  gameState.movesLeft = [];
  gameState.selectedSource = null;
  gameState.validMoves = [];
  gameState.gamePhase = "initial";
  gameState.initialRoll.white = null;
  gameState.initialRoll.black = null;
}
initBoard();

// ------------------ Drawing Functions ------------------

// Draw the board: a tan background with a central bar and 24 triangles.
// The 24 points are split into two rows:
//  • Top row: Points 13–24 (indices 12–23)
//      – Left of bar: Points 24 to 19 (indices 23 to 18)
//      – Right of bar: Points 18 to 13 (indices 17 to 12)
//  • Bottom row: Points 1–12 (indices 0–11)
//      – Left of bar: Points 1–6 (indices 0–5)
//      – Right of bar: Points 7–12 (indices 6–11)
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // (The canvas background is set in CSS, but we fill it here too.)
  ctx.fillStyle = "#D2B48C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const barX = boardWidth / 2 - pointWidth;

  // Draw the central bar.
  ctx.fillStyle = "#A0522D";
  ctx.fillRect(barX, 0, pointWidth * 2, boardHeight);

  // Colors for the points.
  const darkColor = "#8B4513";
  const lightColor = "#CD853F";

  // Top row (indices 12–23)
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      // Left of the bar: i = 0 corresponds to index 23, i = 5 to index 18.
      x = barX - pointWidth * (6 - i);
    } else {
      // Right of the bar: i = 6 corresponds to index 17, i = 11 to index 12.
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, 0, pointWidth, triangleHeight, "down", color);
  }

  // Bottom row (indices 0–11)
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      x = barX - pointWidth * (6 - i);
    } else {
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, boardHeight - triangleHeight, pointWidth, triangleHeight, "up", color);
  }
}

// Helper to draw a triangle (a point) given its position, size, direction, and color.
function drawTriangle(x, y, width, height, direction, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (direction === "up") {
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width / 2, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width / 2, y + height);
  }
  ctx.closePath();
  ctx.fill();
}

// Draw the checkers based on the board and bar.
function drawCheckers() {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const checkerRadius = pointWidth * 0.4;
  const offset = 5;

  // Draw checkers on the board.
  // Bottom row (indices 0–11):
  for (let i = 0; i < 12; i++) {
    const point = gameState.board[i];
    if (point.count <= 0) continue;
    let x;
    if (i < 6) {
      x = (canvas.width / 2 - pointWidth * 6) + i * pointWidth + pointWidth / 2;
    } else {
      x = canvas.width / 2 + pointWidth * 2 + (i - 6) * pointWidth + pointWidth / 2;
    }
    // Stack checkers from the bottom upward.
    for (let j = 0; j < point.count; j++) {
      let y = canvas.height - offset - checkerRadius - j * (checkerRadius * 2.2);
      if (y < canvas.height / 2 + checkerRadius) y = canvas.height / 2 + checkerRadius;
      drawChecker(x, y, point.color);
    }
  }

  // Top row (indices 12–23):
  for (let i = 12; i < 24; i++) {
    const point = gameState.board[i];
    if (point.count <= 0) continue;
    let x;
    if (i < 18) {
      // Right of bar: indices 12–17.
      x = canvas.width / 2 + pointWidth * 2 + (i - 12) * pointWidth + pointWidth / 2;
    } else {
      // Left of bar: indices 18–23 (reverse order).
      let pos = 23 - i; // index 23 → pos = 0; index 18 → pos = 5.
      x = canvas.width / 2 - pointWidth * (pos + 1) + pointWidth / 2;
    }
    // Stack checkers from the top downward.
    for (let j = 0; j < point.count; j++) {
      let y = offset + checkerRadius + j * (checkerRadius * 2.2);
      if (y > canvas.height / 2 - checkerRadius) y = canvas.height / 2 - checkerRadius;
      drawChecker(x, y, point.color);
    }
  }

  // Draw checkers on the bar.
  if (gameState.bar.white > 0) {
    let barX = canvas.width / 2;
    let barY = canvas.height * 0.75;
    for (let j = 0; j < gameState.bar.white; j++) {
      drawChecker(barX, barY + j * (checkerRadius * 2.2), "white");
    }
  }
  if (gameState.bar.black > 0) {
    let barX = canvas.width / 2 + pointWidth;
    let barY = canvas.height * 0.25;
    for (let j = 0; j < gameState.bar.black; j++) {
      drawChecker(barX, barY - j * (checkerRadius * 2.2), "black");
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
  ctx.fillStyle = color === "white" ? "#FFFFFF" : "#000000";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#333";
  ctx.stroke();
}

// Draw the dice as two centered squares (one above, one below center).
function drawDice() {
  if (gameState.dice.length < 2) return;
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const diceSize = pointWidth;
  const diceX = (boardWidth - diceSize) / 2;
  const diceY1 = boardHeight / 2 - diceSize - 5;
  const diceY2 = boardHeight / 2 + 5;

  ctx.fillStyle = "#FFF";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillRect(diceX, diceY1, diceSize, diceSize);
  ctx.strokeRect(diceX, diceY1, diceSize, diceSize);
  ctx.fillRect(diceX, diceY2, diceSize, diceSize);
  ctx.strokeRect(diceX, diceY2, diceSize, diceSize);

  ctx.fillStyle = "#000";
  ctx.font = diceSize * 0.6 + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(gameState.dice[0], diceX + diceSize / 2, diceY1 + diceSize / 2);
  ctx.fillText(gameState.dice[1], diceX + diceSize / 2, diceY2 + diceSize / 2);
}

// Redraw the entire board.
function redraw() {
  drawBoard();
  drawCheckers();
  drawDice();
  updateGameInfo();
}

// ------------------ UI & Animation ------------------

// Update the game information text.
function updateGameInfo() {
  const infoDiv = document.getElementById("gameInfo");
  let phaseText = "";
  switch (gameState.gamePhase) {
    case "initial":
      phaseText = "Initial Roll: Click Roll Dice";
      break;
    case "playerRoll":
      phaseText = "Your Turn: Click Roll Dice";
      break;
    case "playerMove":
      phaseText = "Your Turn: Select a checker and then a destination";
      break;
    case "cpuRoll":
      phaseText = "CPU Turn: Rolling dice...";
      break;
    case "cpuMove":
      phaseText = "CPU is moving...";
      break;
  }
  infoDiv.innerHTML = `<strong>${phaseText}</strong><br>Dice: ${gameState.dice.join(
    ", "
  )}<br>Current: ${gameState.currentPlayer || "-"}`;
}

// Animate dice rolling (updates dice values for a short duration).
function rollDiceAnimation(numDice, callback) {
  let duration = 1000; // milliseconds
  let interval = 100;
  let elapsed = 0;
  let anim = setInterval(() => {
    let temp = [];
    for (let i = 0; i < numDice; i++) {
      temp.push(Math.floor(Math.random() * 6) + 1);
    }
    gameState.dice = temp;
    updateGameInfo();
    redraw();
    elapsed += interval;
    if (elapsed >= duration) {
      clearInterval(anim);
      let finalRoll = [];
      for (let i = 0; i < numDice; i++) {
        finalRoll.push(Math.floor(Math.random() * 6) + 1);
      }
      gameState.dice = finalRoll;
      if (numDice === 2) {
        if (finalRoll[0] === finalRoll[1]) {
          gameState.movesLeft = [finalRoll[0], finalRoll[0], finalRoll[0], finalRoll[0]];
        } else {
          gameState.movesLeft = [finalRoll[0], finalRoll[1]];
        }
      } else {
        gameState.movesLeft = [finalRoll[0]];
      }
      updateGameInfo();
      redraw();
      callback(finalRoll);
    }
  }, interval);
}

// ------------------ Checker Move Animation ------------------

// Get the center (x,y) for a given board point index.
function getPointCenter(index) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  let cx, cy;
  if (index < 12) {
    // Bottom row.
    if (index < 6) {
      cx = (canvas.width / 2 - pointWidth * 6) + index * pointWidth + pointWidth / 2;
    } else {
      cx = canvas.width / 2 + pointWidth * 2 + (index - 6) * pointWidth + pointWidth / 2;
    }
    cy = canvas.height - (canvas.height - canvas.height / 2) / 2;
  } else {
    // Top row.
    if (index < 18) {
      cx = canvas.width / 2 + pointWidth * 2 + (index - 12) * pointWidth + pointWidth / 2;
    } else {
      let pos = 23 - index;
      cx = canvas.width / 2 - pointWidth * (pos + 1) + pointWidth / 2;
    }
    cy = (canvas.height / 2) / 2;
  }
  return { x: cx, y: cy };
}

// Get the center for a checker on the bar (for a given player).
function getBarCenter(player) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  if (player === "white") {
    return { x: canvas.width / 2, y: canvas.height * 0.75 };
  } else {
    return { x: canvas.width / 2 + pointWidth, y: canvas.height * 0.25 };
  }
}

// Animate a checker moving from its source to its destination.
function animateCheckerMove(move, callback) {
  let player = gameState.currentPlayer;
  let startPos, endPos;
  if (move.from === "bar") {
    startPos = getBarCenter(player);
  } else {
    startPos = getPointCenter(move.from);
  }
  if (move.bearOff) {
    // For bearing off, choose a fixed off-board position.
    endPos = player === "white" ? { x: 30, y: canvas.height - 30 } : { x: canvas.width - 30, y: 30 };
  } else {
    endPos = getPointCenter(move.to);
  }
  let duration = 500; // in ms
  let startTime = null;
  function animateStep(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = timestamp - startTime;
    let t = Math.min(progress / duration, 1);
    let currentX = startPos.x + t * (endPos.x - startPos.x);
    let currentY = startPos.y + t * (endPos.y - startPos.y);
    redraw();
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

// Perform a move: update game state and animate the checker.
function performMove(move, callback) {
  // Remove the used die.
  let idx = gameState.movesLeft.indexOf(move.die);
  if (idx >= 0) gameState.movesLeft.splice(idx, 1);
  // Remove the checker from the source.
  if (move.from === "bar") {
    gameState.bar[gameState.currentPlayer]--;
  } else {
    gameState.board[move.from].count--;
    if (gameState.board[move.from].count === 0) {
      gameState.board[move.from].color = null;
    }
  }
  animateCheckerMove(move, () => {
    if (move.bearOff) {
      gameState.borneOff[gameState.currentPlayer]++;
    } else {
      let dest = gameState.board[move.to];
      // If exactly one opposing checker is there, hit it.
      if (dest.count === 1 && dest.color !== gameState.currentPlayer) {
        gameState.bar[dest.color]++;
        gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
      } else {
        if (dest.count === 0) {
          gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
        } else {
          gameState.board[move.to].count++;
        }
      }
    }
    callback();
  });
}

// ------------------ Move Generation & Input ------------------

// Get all legal moves for a selected source (a board point or "bar").
function getValidMoves(source) {
  let moves = [];
  if (source === "bar") {
    gameState.movesLeft.forEach((die) => {
      // For white, re‑entry is on point 24–die → index = 24 – die;
      // for black, re‑entry is on point die → index = die – 1.
      let dest = gameState.currentPlayer === "white" ? 24 - die : die - 1;
      let point = gameState.board[dest];
      if (
        point.count === 0 ||
        point.color === gameState.currentPlayer ||
        (point.count === 1 && point.color !== gameState.currentPlayer)
      ) {
        moves.push({ from: "bar", to: dest, die: die, bearOff: false });
      }
    });
  } else {
    gameState.movesLeft.forEach((die) => {
      let dest, bearOff = false;
      if (gameState.currentPlayer === "white") {
        dest = source - die;
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

// Check if a player can bear off (all checkers in the home board).
function canBearOff(player) {
  let homeRange = player === "white" ? [0, 5] : [18, 23];
  let total = 0,
    inHome = 0;
  for (let i = 0; i < 24; i++) {
    if (gameState.board[i].color === player) {
      total += gameState.board[i].count;
      if (i >= homeRange[0] && i <= homeRange[1]) {
        inHome += gameState.board[i].count;
      }
    }
  }
  if (gameState.bar[player] > 0) return false;
  return total > 0 && total === inHome;
}

// Map click coordinates to a board point or "bar".
// (The logic here mirrors the board–drawing layout.)
function getPointFromCoordinates(x, y) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const barX = canvas.width / 2 - pointWidth;
  // If click is in the bar region and the current player has checkers there, return "bar".
  if (x >= barX && x <= barX + pointWidth * 2) {
    if (gameState.bar[gameState.currentPlayer] > 0) return "bar";
  }
  if (y < triangleHeight) {
    // Top row.
    if (x < barX) {
      let pos = Math.floor((barX - x) / pointWidth);
      return 23 - pos; // left of bar: indices 23 downwards.
    } else if (x > barX + pointWidth * 2) {
      let pos = Math.floor((x - (barX + pointWidth * 2)) / pointWidth);
      return 12 + pos; // right of bar: indices 12 upwards.
    }
  } else {
    // Bottom row.
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

// ------------------ Player Input ------------------

// Handle canvas clicks during the human's move phase.
canvas.addEventListener("click", (e) => {
  if (gameState.currentPlayer !== "white" || gameState.gamePhase !== "playerMove") return;
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  let clicked = getPointFromCoordinates(x, y);
  // If the player has checkers on the bar, they must re‑enter them.
  if (gameState.bar.white > 0 && clicked !== "bar") {
    alert("You must re‑enter your checkers from the bar!");
    return;
  }
  if (gameState.selectedSource === null) {
    // No checker selected yet.
    if (clicked === "bar") {
      gameState.selectedSource = "bar";
      gameState.validMoves = getValidMoves("bar");
    } else if (typeof clicked === "number") {
      let point = gameState.board[clicked];
      if (point && point.count > 0 && point.color === "white") {
        gameState.selectedSource = clicked;
        gameState.validMoves = getValidMoves(clicked);
      }
    }
    redraw();
  } else {
    // A source has already been selected; try to complete a move.
    let destination = clicked;
    // For bearing off, if the player clicks near the bottom-left corner.
    if (gameState.selectedSource !== "bar" && destination === null && x < 50 && y > canvas.height - 50) {
      destination = "bearOff";
    }
    let chosen = gameState.validMoves.find(
      (m) => m.to === destination || (m.bearOff && destination === "bearOff")
    );
    if (chosen) {
      performMove(chosen, () => {
        gameState.selectedSource = null;
        gameState.validMoves = [];
        redraw();
        if (gameState.movesLeft.length === 0) {
          endTurn();
        }
      });
    } else {
      // Deselect if an invalid destination was clicked.
      gameState.selectedSource = null;
      gameState.validMoves = [];
      redraw();
    }
  }
});

// ------------------ Turn Management & CPU ------------------

// End the current turn and switch players.
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

// CPU turn: roll dice and then make moves.
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
  if (gameState.bar[player] > 0) {
    gameState.movesLeft.forEach((die) => {
      let dest = player === "black" ? die - 1 : 24 - die;
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
  let legal = getAllLegalMoves("black");
  if (legal.length === 0) {
    gameState.dice = [];
    gameState.movesLeft = [];
    endTurn();
    return;
  }
  // For simplicity, pick the first legal move.
  let move = legal[0];
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

// ------------------ Dice Roll Button Handler ------------------
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
            alert("Tie! Roll again.");
            gameState.initialRoll.white = null;
            gameState.initialRoll.black = null;
            gameState.dice = [];
            gameState.gamePhase = "initial";
            updateGameInfo();
          } else {
            if (gameState.initialRoll.white > gameState.initialRoll.black) {
              gameState.currentPlayer = "white";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft =
                gameState.initialRoll.white === gameState.initialRoll.black
                  ? [gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white]
                  : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("You win the initial roll! You go first.");
              gameState.gamePhase = "playerMove";
            } else {
              gameState.currentPlayer = "black";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft =
                gameState.initialRoll.white === gameState.initialRoll.black
                  ? [gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black]
                  : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("CPU wins the initial roll! CPU goes first.");
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
    // --- Player’s Regular Turn ---
    document.getElementById("rollButton").disabled = true;
    rollDiceAnimation(2, () => {
      gameState.gamePhase = "playerMove";
      document.getElementById("rollButton").disabled = false;
      updateGameInfo();
      redraw();
    });
  }
});

// ------------------ Initial Redraw ------------------
redraw();
