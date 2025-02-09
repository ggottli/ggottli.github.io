// === Global Setup ===
const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");

// Resize canvas to fit screen (with a maximum width)
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.95, 800);
  canvas.height = canvas.width * 0.6; // maintain a board aspect ratio
  drawBoard();
  drawCheckers();
  if (gameState.selectedSource !== null) {
    // Re‑highlight valid moves if a piece was selected
    highlightValidDestinations();
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// === Game State ===
// We use indices 0..23 for the 24 board points. (Point 1 is index 0, Point 24 is index 23.)
// By standard rules, white (the human player) moves from high index to low index (bearing off from index <0)
// while black (the CPU) moves from low index to high index (bearing off from index >23).
let gameState = {
  board: new Array(24).fill(null).map(() => ({ color: null, count: 0 })),
  // The bar stores checkers that have been hit.
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  // currentPlayer is set to "white" (human) or "black" (CPU)
  currentPlayer: null,
  // The dice for the current turn (an array of numbers)
  dice: [],
  // Moves left – a copy of the dice values that haven’t yet been played this turn.
  movesLeft: [],
  // selectedSource is either a board point index or the string "bar" when a checker is selected for moving.
  selectedSource: null,
  // validMoves holds the list of legal moves for the currently selected checker.
  validMoves: [],
  // gamePhase controls the overall flow:
  // "initial" – initial roll to decide who goes first.
  // "playerRoll" or "cpuRoll" – waiting for a dice roll.
  // "playerMove" or "cpuMove" – waiting for moves.
  gamePhase: "initial",
  // For the initial roll we store each side’s roll (a single die each)
  initialRoll: { white: null, black: null },
};

// === Initialize Board ===
// Standard starting positions:
// For white (human): 2 on point 24 (index 23), 5 on point 13 (index 12),
// 3 on point 8 (index 7), and 5 on point 6 (index 5).
// For black (CPU): 2 on point 1 (index 0), 5 on point 12 (index 11),
// 3 on point 17 (index 16), and 5 on point 19 (index 18).
function initGame() {
  for (let i = 0; i < 24; i++) {
    gameState.board[i] = { color: null, count: 0 };
  }
  // Black (CPU)
  gameState.board[0] = { color: "black", count: 2 };
  gameState.board[11] = { color: "black", count: 5 };
  gameState.board[16] = { color: "black", count: 3 };
  gameState.board[18] = { color: "black", count: 5 };
  // White (human)
  gameState.board[23] = { color: "white", count: 2 };
  gameState.board[12] = { color: "white", count: 5 };
  gameState.board[7] = { color: "white", count: 3 };
  gameState.board[5] = { color: "white", count: 5 };

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
  drawBoard();
  drawCheckers();
}
initGame();

// === Drawing Functions ===

// Draw the board with a tan background and alternating point colors.
// The board is divided into a top row (points 13–24) and bottom row (points 1–12).
function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw the tan board background (set in CSS but we clear it here too)
  ctx.fillStyle = "#D2B48C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  // We reserve 14 “columns”: 6 points on each side and 2 columns for the bar.
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;

  // Draw the bar in the center
  const barX = boardWidth / 2 - pointWidth;
  ctx.fillStyle = "#A0522D"; // a rich brown for the bar
  ctx.fillRect(barX, 0, pointWidth * 2, boardHeight);

  // Helper function to draw a triangle (point)
  // (x,y) is the left corner; direction "up" or "down" indicates which way the triangle points.
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

  // Colors for points: alternate dark brown and light brown.
  const darkColor = "#8B4513";
  const lightColor = "#CD853F";

  // --- Top Row (points 13-24) ---
  // The top row is drawn from left to right.
  // Points 24 to 19 are on the left of the bar and points 18 to 13 on the right.
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      // left of the bar; points 24 to 19 (indices 23 to 18)
      x = barX - pointWidth * (6 - i);
    } else {
      // right of the bar; points 18 to 13 (indices 17 to 12)
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, 0, pointWidth, triangleHeight, "down", color);
  }

  // --- Bottom Row (points 1-12) ---
  // The bottom row is drawn from left to right.
  // Points 1-6 are to the left of the bar; points 7-12 are to the right.
  for (let i = 0; i < 12; i++) {
    let color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      // left of the bar; points 1-6 (indices 0 to 5)
      x = barX - pointWidth * (6 - i);
    } else {
      // right of the bar; points 7-12 (indices 6 to 11)
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, boardHeight - triangleHeight, pointWidth, triangleHeight, "up", color);
  }

  // Optionally, highlight the bar if the player has checkers there.
  if (gameState.bar.white > 0 && gameState.currentPlayer === "white") {
    ctx.fillStyle = "rgba(0,255,0,0.3)";
    ctx.fillRect(barX, boardHeight / 2, pointWidth * 2, boardHeight / 2);
  }
  if (gameState.bar.black > 0 && gameState.currentPlayer === "black") {
    ctx.fillStyle = "rgba(0,255,0,0.3)";
    ctx.fillRect(barX, 0, pointWidth * 2, boardHeight / 2);
  }
}

// Draw the checkers on the board and on the bar.
// For clarity, we use a light color for the human (“white”) and a dark color for the CPU (“black”).
function drawCheckers() {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  const checkerRadius = pointWidth * 0.4;
  const offset = 5;

  // Helper to draw a checker with a border.
  function drawChecker(x, y, color) {
    ctx.beginPath();
    ctx.arc(x, y, checkerRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.stroke();
  }

  // Draw checkers on board points.
  // Our board array uses indices 0–23. Points 1–12 (indices 0–11) are in the bottom row;
  // points 13–24 (indices 12–23) are in the top row.
  for (let i = 0; i < 24; i++) {
    const point = gameState.board[i];
    if (point.count === 0) continue;
    let isTop = i >= 12;
    let x, yStart, yStep = checkerRadius * 2.2;
    if (isTop) {
      // For the top row, we split the points into two groups (left of the bar and right).
      if (i < 18) {
        // Right of the bar: points 13-18 (board indices 12–17)
        let pos = i - 12;
        x = canvas.width / 2 + pointWidth * (pos + 1) + pointWidth;
      } else {
        // Left of the bar: points 19-24 (indices 18–23)
        let pos = i - 18;
        x = canvas.width / 2 - pointWidth * (6 - pos);
      }
      yStart = checkerRadius + offset;
      for (let j = 0; j < point.count; j++) {
        let y = yStart + j * yStep;
        if (y > triangleHeight - checkerRadius) y = triangleHeight - checkerRadius;
        drawChecker(x, y, point.color === "white" ? "#F5DEB3" : "#8B4513");
      }
    } else {
      // Bottom row: split into two groups.
      if (i < 6) {
        // Points 1-6 (indices 0–5)
        let pos = i;
        x = canvas.width / 2 - pointWidth * (6 - pos) + pointWidth / 2;
      } else {
        // Points 7-12 (indices 6–11)
        let pos = i - 6;
        x = canvas.width / 2 + pointWidth * pos + pointWidth * 2;
      }
      yStart = canvas.height - checkerRadius - offset;
      for (let j = 0; j < point.count; j++) {
        let y = yStart - j * yStep;
        if (y < canvas.height - triangleHeight + checkerRadius) y = canvas.height - triangleHeight + checkerRadius;
        drawChecker(x, y, point.color === "white" ? "#F5DEB3" : "#8B4513");
      }
    }
  }

  // Draw checkers on the bar.
  if (gameState.bar.white > 0) {
    // For white, draw them on the bottom half of the bar.
    let x = canvas.width / 2;
    let yStart = canvas.height / 2 + checkerRadius;
    for (let j = 0; j < gameState.bar.white; j++) {
      let y = yStart + j * (checkerRadius * 2.2);
      drawChecker(x, y, "#F5DEB3");
    }
  }
  if (gameState.bar.black > 0) {
    // For black, draw them on the top half of the bar.
    let x = canvas.width / 2 + pointWidth;
    let yStart = canvas.height / 2 - checkerRadius;
    for (let j = 0; j < gameState.bar.black; j++) {
      let y = yStart - j * (checkerRadius * 2.2);
      drawChecker(x, y, "#8B4513");
    }
  }
}

// Highlight a board point (or the bar) to indicate selection.
function highlightArea(x, y, width, height) {
  ctx.fillStyle = "rgba(0, 0, 255, 0.3)";
  ctx.fillRect(x, y, width, height);
}

// When a player selects a piece (or bar), we highlight valid destination points.
function highlightValidDestinations() {
  gameState.validMoves.forEach((move) => {
    // Highlight the destination region.
    let dest = move.to;
    // For bearing off moves, we highlight an off‐board area.
    if (move.bearOff) {
      // Draw a small highlight near the board edge.
      if (gameState.currentPlayer === "white") {
        ctx.fillStyle = "rgba(0,255,0,0.5)";
        ctx.fillRect(0, canvas.height - 40, 40, 40);
      } else {
        ctx.fillStyle = "rgba(0,255,0,0.5)";
        ctx.fillRect(canvas.width - 40, 0, 40, 40);
      }
      return;
    }
    // Otherwise, map the destination board point to a screen region.
    const boardWidth = canvas.width;
    const boardHeight = canvas.height;
    const pointWidth = boardWidth / 14;
    const triangleHeight = boardHeight / 2;
    let x, y, w, h;
    if (dest < 12) {
      // Bottom row.
      if (dest < 6) {
        x = canvas.width / 2 - pointWidth * 6 + dest * pointWidth;
      } else {
        x = canvas.width / 2 + pointWidth * (dest - 6) + pointWidth * 2;
      }
      y = canvas.height - triangleHeight;
      w = pointWidth;
      h = triangleHeight;
    } else {
      // Top row.
      if (dest < 18) {
        let pos = dest - 12;
        x = canvas.width / 2 + pointWidth * (pos + 1) + pointWidth;
      } else {
        let pos = dest - 18;
        x = canvas.width / 2 - pointWidth * (6 - pos);
      }
      y = 0;
      w = pointWidth;
      h = triangleHeight;
    }
    highlightArea(x, y, w, h);
  });
}

// === UI Updates ===

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
  let turnText =
    gameState.currentPlayer === "white"
      ? "Your checkers (White)"
      : "CPU checkers (Black)";
  infoDiv.innerHTML = `<strong>${phaseText}</strong><br>${diceText}<br>Current Turn: ${turnText}`;
  // Also update dice display
  document.getElementById("diceDisplay").innerText = diceText;
  // Enable or disable the roll button based on phase.
  const rollButton = document.getElementById("rollButton");
  if (gameState.gamePhase === "playerRoll" || gameState.gamePhase === "initial") {
    rollButton.disabled = false;
  } else {
    rollButton.disabled = true;
  }
}

// === Dice Animation ===
// Roll the given number of dice (1 or 2) with a brief animation.
function rollDiceAnimation(numDice, callback) {
  let duration = 1000; // milliseconds
  let interval = 100; // update every 100ms
  let elapsed = 0;
  let animationInterval = setInterval(() => {
    let tempRolls = [];
    for (let i = 0; i < numDice; i++) {
      tempRolls.push(Math.floor(Math.random() * 6) + 1);
    }
    gameState.dice = tempRolls;
    updateGameInfo();
    elapsed += interval;
    if (elapsed >= duration) {
      clearInterval(animationInterval);
      // Final roll result:
      let finalRolls = [];
      for (let i = 0; i < numDice; i++) {
        finalRolls.push(Math.floor(Math.random() * 6) + 1);
      }
      gameState.dice = finalRolls;
      // For a dice roll during a turn, if doubles then 4 moves are allowed.
      if (numDice === 2 && finalRolls[0] === finalRolls[1]) {
        gameState.movesLeft = [finalRolls[0], finalRolls[0], finalRolls[0], finalRolls[0]];
      } else if (numDice === 2) {
        gameState.movesLeft = [...finalRolls];
      }
      updateGameInfo();
      callback(finalRolls);
      drawBoard();
      drawCheckers();
      if (gameState.selectedSource !== null) {
        highlightValidDestinations();
      }
    }
  }, interval);
}

// === Dice Roll Button Handler ===
document.getElementById("rollButton").addEventListener("click", () => {
  if (gameState.gamePhase === "initial") {
    // === Initial Roll to decide who goes first ===
    // Human rolls one die.
    document.getElementById("rollButton").disabled = true;
    rollDiceAnimation(1, (roll) => {
      gameState.initialRoll.white = roll[0];
      updateGameInfo();
      // Now simulate CPU rolling after a brief delay.
      setTimeout(() => {
        rollDiceAnimation(1, (cpuRoll) => {
          gameState.initialRoll.black = cpuRoll[0];
          // If tie, re‑roll.
          if (gameState.initialRoll.white === gameState.initialRoll.black) {
            alert("Tie! Roll again to decide who goes first.");
            gameState.initialRoll.white = null;
            gameState.initialRoll.black = null;
            gameState.dice = [];
            gameState.gamePhase = "initial";
            updateGameInfo();
          } else {
            // The higher roll wins and uses both dice as the initial dice.
            if (gameState.initialRoll.white > gameState.initialRoll.black) {
              gameState.currentPlayer = "white";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft =
                gameState.initialRoll.white === gameState.initialRoll.black
                  ? [gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white, gameState.initialRoll.white]
                  : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("You won the initial roll! You go first.");
              gameState.gamePhase = "playerMove";
            } else {
              gameState.currentPlayer = "black";
              gameState.dice = [gameState.initialRoll.white, gameState.initialRoll.black];
              gameState.movesLeft =
                gameState.initialRoll.white === gameState.initialRoll.black
                  ? [gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black, gameState.initialRoll.black]
                  : [gameState.initialRoll.white, gameState.initialRoll.black];
              alert("CPU won the initial roll! CPU goes first.");
              gameState.gamePhase = "cpuMove";
              setTimeout(cpuTurn, 1000);
            }
          }
          updateGameInfo();
        });
      }, 500);
    });
  } else if (gameState.gamePhase === "playerRoll") {
    // === Regular turn dice roll for the player ===
    document.getElementById("rollButton").disabled = true;
    rollDiceAnimation(2, () => {
      gameState.gamePhase = "playerMove";
      updateGameInfo();
    });
  }
});

// === Checker Selection & Move Handling ===

// Get the board point index from click coordinates.
// (This function maps the canvas click position to a board point index.)
function getPointFromCoordinates(x, y) {
  const boardWidth = canvas.width;
  const boardHeight = canvas.height;
  const pointWidth = boardWidth / 14;
  const triangleHeight = boardHeight / 2;
  // Check if click is in the bar area.
  const barX = boardWidth / 2 - pointWidth;
  if (x >= barX && x <= barX + pointWidth * 2) {
    // If the current player has checkers on the bar, return "bar"
    if (gameState.bar[gameState.currentPlayer] > 0) {
      return "bar";
    }
  }
  // Determine if the click is on the top or bottom half.
  if (y < triangleHeight) {
    // Top row: points 13-24 (indices 12-23)
    // Left of bar: points 19-24 (indices 18-23)
    // Right of bar: points 13-18 (indices 12-17)
    if (x < barX) {
      // left of bar
      let pos = Math.floor((barX - x) / pointWidth);
      return 23 - pos; // points 24 downwards
    } else if (x > barX + pointWidth * 2) {
      let pos = Math.floor((x - (barX + pointWidth * 2)) / pointWidth);
      return 12 + pos;
    }
  } else {
    // Bottom row: points 1-12 (indices 0-11)
    // Left of bar: points 1-6 (indices 0-5)
    // Right of bar: points 7-12 (indices 6-11)
    if (x < barX) {
      let pos = Math.floor((x - (barX - pointWidth * 6)) / pointWidth);
      return pos;
    } else if (x > barX + pointWidth * 2) {
      let pos = Math.floor((x - (barX + pointWidth * 2)) / pointWidth);
      return 6 + pos;
    }
  }
  return null;
}

// When the player clicks the canvas in his move phase:
canvas.addEventListener("click", (event) => {
  // Only allow clicks during the player's move phase.
  if (gameState.currentPlayer !== "white" || gameState.gamePhase !== "playerMove") return;
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  let clickedSource = getPointFromCoordinates(clickX, clickY);
  // If the player has checkers on the bar, he must re‑enter them.
  if (gameState.bar.white > 0 && clickedSource !== "bar") {
    alert("You must re‑enter your checkers from the bar!");
    return;
  }
  // If no piece is currently selected, then try to select one.
  if (gameState.selectedSource === null) {
    // Determine if the clicked area contains one of the player's checkers.
    if (clickedSource === "bar") {
      // There is at least one checker on the bar.
      gameState.selectedSource = "bar";
      gameState.validMoves = getValidMoves("bar");
      if (gameState.validMoves.length === 0) {
        alert("No legal moves from the bar!");
        gameState.selectedSource = null;
      }
    } else if (typeof clickedSource === "number") {
      const point = gameState.board[clickedSource];
      if (point && point.count > 0 && point.color === "white") {
        gameState.selectedSource = clickedSource;
        gameState.validMoves = getValidMoves(clickedSource);
        if (gameState.validMoves.length === 0) {
          alert("No legal moves for this checker.");
          gameState.selectedSource = null;
        }
      }
    }
    drawBoard();
    drawCheckers();
    if (gameState.validMoves.length > 0) highlightValidDestinations();
  } else {
    // A source is already selected; now see if the clicked destination matches one valid move.
    let destination = clickedSource;
    // For bearing off, if the player clicks near the bottom‑left corner, interpret that as a bear‑off move.
    if (
      gameState.selectedSource !== "bar" &&
      destination === null &&
      clickX < 50 &&
      clickY > canvas.height - 50
    ) {
      destination = "bearOff";
    }
    let chosenMove = gameState.validMoves.find(
      (move) => (move.to === destination) || (move.bearOff && destination === "bearOff")
    );
    if (chosenMove) {
      attemptMove(chosenMove);
      gameState.selectedSource = null;
      gameState.validMoves = [];
      drawBoard();
      drawCheckers();
      updateGameInfo();
      // If moves remain, wait for further selection; otherwise end turn.
      if (gameState.movesLeft.length === 0) {
        endTurn();
      }
    } else {
      // If the player clicks somewhere else, deselect.
      gameState.selectedSource = null;
      gameState.validMoves = [];
      drawBoard();
      drawCheckers();
    }
  }
});

// === Move Generation & Validation ===

// Returns an array of valid moves for a checker selected from a given source.
// The source is either a board index (number) or the string "bar".
function getValidMoves(source) {
  let moves = [];
  // If the player has checkers on the bar, the only legal moves are re‑entry moves.
  if (source === "bar") {
    // For white (human), re‑entry is into the opponent's home board (points 19–24, indices 18–23)
    gameState.movesLeft.forEach((die) => {
      // For white: a die of 1 enters on point 24 (index 23), 2 → index 22, …, 6 → index 18.
      let dest = 24 - die; // e.g. die 1 => 23
      // Validate destination: must be open (empty or with one black checker).
      let point = gameState.board[dest];
      if (
        point === undefined ||
        (point.count > 0 && point.color === "white") ||
        (point.count === 1 && point.color === "black")
      ) {
        moves.push({ from: "bar", to: dest, die: die, bearOff: false });
      }
    });
  } else if (typeof source === "number") {
    // For a checker on the board.
    gameState.movesLeft.forEach((die) => {
      let dest;
      let bearOff = false;
      if (gameState.currentPlayer === "white") {
        dest = source - die;
        // Bearing off: if the destination is off the board and all white checkers are in the home board (indices 0–5)
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
        // Destination is legal if empty or has checkers of same color,
        // or if it has exactly one opposing checker (which will be hit).
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

// Checks if all checkers for the given player are in their home board.
function canBearOff(player) {
  let homeRange;
  if (player === "white") {
    // White's home board: points 1–6 (indices 0–5)
    homeRange = [0, 5];
  } else {
    // Black's home board: points 19–24 (indices 18–23)
    homeRange = [18, 23];
  }
  // Count all checkers on the board for this player.
  let totalOnBoard = 0;
  let inHome = 0;
  for (let i = 0; i < 24; i++) {
    let point = gameState.board[i];
    if (point.color === player) {
      totalOnBoard += point.count;
      if (i >= homeRange[0] && i <= homeRange[1]) {
        inHome += point.count;
      }
    }
  }
  // Also, if any checkers are on the bar, bearing off is not allowed.
  if (gameState.bar[player] > 0) return false;
  return totalOnBoard > 0 && totalOnBoard === inHome;
}

// Attempt the given move. This function updates the game state.
function attemptMove(move) {
  // Remove the used die from movesLeft.
  let dieIndex = gameState.movesLeft.indexOf(move.die);
  if (dieIndex !== -1) {
    gameState.movesLeft.splice(dieIndex, 1);
  }

  // Remove checker from source.
  if (move.from === "bar") {
    gameState.bar[gameState.currentPlayer]--;
  } else {
    gameState.board[move.from].count--;
    if (gameState.board[move.from].count === 0) {
      gameState.board[move.from].color = null;
    }
  }

  // If bearing off, increment borneOff.
  if (move.bearOff) {
    gameState.borneOff[gameState.currentPlayer]++;
  } else {
    // If destination point has exactly one opposing checker, that checker is hit.
    let destPoint = gameState.board[move.to];
    if (destPoint.count === 1 && destPoint.color !== gameState.currentPlayer) {
      // Send the hit checker to the bar.
      gameState.bar[destPoint.color]++;
      // Replace with the moving checker.
      gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
    } else {
      if (destPoint.count === 0) {
        gameState.board[move.to] = { color: gameState.currentPlayer, count: 1 };
      } else {
        gameState.board[move.to].count++;
      }
    }
  }
}

// When the turn is over (no moves left), switch turns.
function endTurn() {
  // Check for win conditions here (borneOff 15 checkers, etc.) if desired.
  // For now, simply switch turn.
  if (gameState.currentPlayer === "white") {
    gameState.currentPlayer = "black";
    gameState.gamePhase = "cpuRoll";
    updateGameInfo();
    setTimeout(cpuTurn, 1000);
  } else {
    gameState.currentPlayer = "white";
    gameState.gamePhase = "playerRoll";
    // Clear dice so that player must roll.
    gameState.dice = [];
    gameState.movesLeft = [];
    updateGameInfo();
  }
}

// === CPU Logic ===

// The CPU turn: roll dice and then make moves automatically.
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
  // If the CPU has checkers on the bar, those must be moved first.
  if (gameState.bar[player] > 0) {
    // For black, re‑entry is into white’s home board (points 1–6, indices 0–5).
    gameState.movesLeft.forEach((die) => {
      // For black: a die of 1 enters on point 1 (index 0), 2 → index 1, etc.
      let dest = die - 1;
      let point = gameState.board[dest];
      if (
        point === undefined ||
        (point.count > 0 && point.color === player) ||
        (point.count === 1 && point.color !== player)
      ) {
        moves.push({ from: "bar", to: dest, die: die, bearOff: false });
      }
    });
    return moves;
  }
  // Otherwise, check each board point.
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
    // No legal moves – end turn.
    gameState.dice = [];
    gameState.movesLeft = [];
    endTurn();
    return;
  }
  // Pick the first legal move (or choose randomly).
  let move = legalMoves[0];
  attemptMove(move);
  drawBoard();
  drawCheckers();
  updateGameInfo();
  // Delay before the next CPU move.
  setTimeout(() => {
    if (gameState.movesLeft.length > 0) {
      cpuMakeMove();
    } else {
      endTurn();
    }
  }, 600);
}

// === Redraw on state changes ===
function redraw() {
  drawBoard();
  drawCheckers();
  updateGameInfo();
}
redraw();
