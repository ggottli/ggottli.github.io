// Core canvas + DOM references
const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");
const rollButton = document.getElementById("rollButton");
const statusDiv = document.getElementById("gameInfo");
const playerPanels = {
  white: document.querySelector('.playerPanel[data-player="white"]'),
  black: document.querySelector('.playerPanel[data-player="black"]')
};
const statNodes = {
  whiteBar: document.getElementById("whiteBar"),
  whiteOff: document.getElementById("whiteOff"),
  blackBar: document.getElementById("blackBar"),
  blackOff: document.getElementById("blackOff")
};

// Game constants and shared helpers
const TOTAL_CHECKERS = 15;
const HOME_RANGES = { white: [0, 5], black: [18, 23] };
const DIRECTIONS = { white: -1, black: 1 };

const gameState = {
  board: [],
  bar: { white: 0, black: 0 },
  borneOff: { white: 0, black: 0 },
  currentPlayer: null,
  phase: "initial-roll",
  diceFaces: [],
  allowedSequences: [],
  legalMoves: [],
  highlightMoves: [],
  selectedSource: null,
  movesRemaining: 0,
  message: "Roll to see who starts.",
  animating: false
};

// ---------------------- Initialization ----------------------
function initGame() {
  initBoard();
  resizeCanvas();
  setMessage("Roll to see who starts.");
  updateControls();
  updateHud();
  redraw();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  redraw();
});

rollButton.addEventListener("click", async () => {
  if (gameState.animating) return;
  if (gameState.phase === "initial-roll") {
    await startInitialRoll();
  } else if (gameState.phase === "player-await-roll") {
    await startPlayerTurn();
  } else if (gameState.phase === "game-over") {
    resetGame();
  }
});

canvas.addEventListener("click", handleCanvasClick);

initGame();

// ---------------------- Layout + Drawing ----------------------
function resizeCanvas() {
  const width = Math.min(window.innerWidth * 0.95, 960);
  canvas.width = width;
  canvas.height = width * 0.6;
}

function getLayout() {
  const pointWidth = canvas.width / 14;
  const triangleHeight = canvas.height / 2;
  const barX = canvas.width / 2 - pointWidth;
  return { pointWidth, triangleHeight, barX };
}

function redraw() {
  drawBoard();
  drawHighlights();
  drawCheckers();
  drawBarCheckers();
  drawBearOffCheckers();
  drawBearOffTargets();
  drawDice();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d7b48a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { pointWidth, triangleHeight, barX } = getLayout();
  const darkColor = "#6f3b1e";
  const lightColor = "#c4854a";

  // central bar
  const gradient = ctx.createLinearGradient(barX, 0, barX + pointWidth * 2, 0);
  gradient.addColorStop(0, "#8c5127");
  gradient.addColorStop(1, "#a3673a");
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, 0, pointWidth * 2, canvas.height);

  for (let i = 0; i < 12; i++) {
    const color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      x = barX - pointWidth * (6 - i);
    } else {
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, 0, pointWidth, triangleHeight, "down", color);
  }

  for (let i = 0; i < 12; i++) {
    const color = i % 2 === 0 ? darkColor : lightColor;
    let x;
    if (i < 6) {
      x = barX - pointWidth * (6 - i);
    } else {
      x = barX + pointWidth * 2 + pointWidth * (i - 6);
    }
    drawTriangle(x, canvas.height - triangleHeight, pointWidth, triangleHeight, "up", color);
  }
}

function drawTriangle(x, y, width, height, direction, color) {
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
  ctx.fillStyle = color;
  ctx.fill();
}

function drawHighlights() {
  if (gameState.selectedSource !== null) {
    const sourcePos = getHighlightPosition(gameState.selectedSource);
    if (sourcePos) drawGlow(sourcePos.x, sourcePos.y, "rgba(255, 255, 255, 0.35)");
  }
  gameState.highlightMoves.forEach((move) => {
    const targetPos = move.bearOff ? getBearOffTarget("white") : getPointEntryPosition(move.to);
    if (targetPos) {
      drawGlow(targetPos.x, targetPos.y, "rgba(255, 227, 166, 0.65)");
    }
  });
}

function drawGlow(x, y, color) {
  const radius = getCheckerRadius() * 1.2;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCheckers() {
  const checkerRadius = getCheckerRadius();
  const offset = 6;

  // bottom row indices 0-11
  for (let i = 0; i < 12; i++) {
    const point = gameState.board[i];
    if (!point.count) continue;
    const x = getPointEntryPosition(i).x;
    for (let j = 0; j < point.count; j++) {
      let y = canvas.height - offset - checkerRadius - j * (checkerRadius * 2 + 4);
      if (y < canvas.height / 2 + checkerRadius) y = canvas.height / 2 + checkerRadius;
      drawCheckerPiece(x, y, point.color);
    }
  }

  // top row indices 12-23
  for (let i = 12; i < 24; i++) {
    const point = gameState.board[i];
    if (!point.count) continue;
    const x = getPointEntryPosition(i).x;
    for (let j = 0; j < point.count; j++) {
      let y = offset + checkerRadius + j * (checkerRadius * 2 + 4);
      if (y > canvas.height / 2 - checkerRadius) y = canvas.height / 2 - checkerRadius;
      drawCheckerPiece(x, y, point.color);
    }
  }
}

function drawCheckerPiece(x, y, color) {
  const radius = getCheckerRadius();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color === "white" ? "#f8f8f6" : "#131313";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.stroke();
}

function drawBarCheckers() {
  const checkerRadius = getCheckerRadius();
  const spacing = checkerRadius * 2.2;
  const { pointWidth } = getLayout();

  if (gameState.bar.white > 0) {
    const barX = canvas.width / 2;
    let barY = canvas.height * 0.7;
    for (let j = 0; j < gameState.bar.white; j++) {
      drawCheckerPiece(barX, barY + j * spacing, "white");
    }
  }

  if (gameState.bar.black > 0) {
    const barX = canvas.width / 2 + pointWidth;
    let barY = canvas.height * 0.3;
    for (let j = 0; j < gameState.bar.black; j++) {
      drawCheckerPiece(barX, barY - j * spacing, "black");
    }
  }
}

function drawBearOffCheckers() {
  const whiteTarget = getBearOffTarget("white");
  const blackTarget = getBearOffTarget("black");
  const spacing = getCheckerRadius() * 1.35;

  for (let i = 0; i < gameState.borneOff.white; i++) {
    const column = Math.floor(i / 5);
    const row = i % 5;
    const x = whiteTarget.x + column * spacing * 0.8;
    const y = whiteTarget.y - row * spacing;
    drawCheckerPiece(x, y, "white");
  }

  for (let i = 0; i < gameState.borneOff.black; i++) {
    const column = Math.floor(i / 5);
    const row = i % 5;
    const x = blackTarget.x - column * spacing * 0.8;
    const y = blackTarget.y + row * spacing;
    drawCheckerPiece(x, y, "black");
  }
}

function drawBearOffTargets() {
  const white = getBearOffTarget("white");
  const black = getBearOffTarget("black");

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(white.x, white.y, white.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(black.x, black.y, black.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDice() {
  if (!gameState.diceFaces.length) return;
  const { pointWidth } = getLayout();
  const diceSize = pointWidth * 0.9;
  const padding = pointWidth * 0.25;
  const totalWidth = diceSize * 2 + padding;
  const startX = (canvas.width - totalWidth) / 2;
  const yTop = canvas.height / 2 - diceSize - 12;
  const yBottom = canvas.height / 2 + 12;
  const values = [...gameState.diceFaces];
  if (values.length === 1) values.push(null);

  [values[0], values[1]].forEach((value, idx) => {
    const x = startX + idx * (diceSize + padding);
    const y = idx === 0 ? yTop : yBottom;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.beginPath();
    drawRoundedRectPath(x, y, diceSize, diceSize, 10);
    ctx.fill();
    ctx.stroke();
    if (value) {
      ctx.fillStyle = "#111";
      ctx.font = `${diceSize * 0.55}px 'Inter', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(value), x + diceSize / 2, y + diceSize / 2 + 1);
    }
  });

  if (gameState.diceFaces.length === 2 && gameState.diceFaces[0] === gameState.diceFaces[1]) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.font = `${pointWidth * 0.6}px 'Inter', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Double", canvas.width / 2, canvas.height / 2);
  }
}

// ---------------------- HUD Helpers ----------------------
function updateHud() {
  statNodes.whiteBar.textContent = gameState.bar.white;
  statNodes.blackBar.textContent = gameState.bar.black;
  statNodes.whiteOff.textContent = gameState.borneOff.white;
  statNodes.blackOff.textContent = gameState.borneOff.black;

  Object.entries(playerPanels).forEach(([player, node]) => {
    node.classList.toggle("active", gameState.currentPlayer === player && gameState.phase !== "initial-roll");
  });

  const diceText = gameState.diceFaces.length
    ? `Dice: ${gameState.diceFaces.join(" & ")}${
        gameState.diceFaces.length === 2 && gameState.diceFaces[0] === gameState.diceFaces[1] ? " (double)" : ""
      }`
    : "Dice: -";
  const turnText = `Turn: ${gameState.currentPlayer ? (gameState.currentPlayer === "white" ? "You" : "CPU") : "-"}`;
  const movesText = gameState.movesRemaining ? `Moves left: ${gameState.movesRemaining}` : "";

  statusDiv.innerHTML = `<strong>${gameState.message}</strong><br>${diceText}<br>${turnText}${movesText ? "<br>" + movesText : ""}`;
}

function updateControls() {
  switch (gameState.phase) {
    case "initial-roll":
      rollButton.disabled = gameState.animating;
      rollButton.textContent = "Roll to Start";
      break;
    case "player-await-roll":
      rollButton.disabled = gameState.animating;
      rollButton.textContent = "Roll Dice";
      break;
    case "player-rolling":
      rollButton.disabled = true;
      rollButton.textContent = "Rolling...";
      break;
    case "player-move":
      rollButton.disabled = true;
      rollButton.textContent = "Select a checker";
      break;
    case "player-finished":
      rollButton.disabled = true;
      rollButton.textContent = "Waiting...";
      break;
    case "cpu-turn":
    case "cpu-moving":
    case "cpu-finished":
      rollButton.disabled = true;
      rollButton.textContent = "CPU Turn";
      break;
    case "game-over":
      rollButton.disabled = false;
      rollButton.textContent = "Play Again";
      break;
    default:
      rollButton.disabled = true;
      rollButton.textContent = "...";
  }
}

function setMessage(text) {
  gameState.message = text;
  updateHud();
}

// ---------------------- Game Setup ----------------------
function initBoard() {
  gameState.board = Array.from({ length: 24 }, () => ({ color: null, count: 0 }));
  gameState.board[0] = { color: "black", count: 2 };
  gameState.board[11] = { color: "black", count: 5 };
  gameState.board[16] = { color: "black", count: 3 };
  gameState.board[18] = { color: "black", count: 5 };

  gameState.board[23] = { color: "white", count: 2 };
  gameState.board[12] = { color: "white", count: 5 };
  gameState.board[7] = { color: "white", count: 3 };
  gameState.board[5] = { color: "white", count: 5 };

  gameState.bar = { white: 0, black: 0 };
  gameState.borneOff = { white: 0, black: 0 };
  gameState.diceFaces = [];
  gameState.allowedSequences = [];
  gameState.legalMoves = [];
  gameState.highlightMoves = [];
  gameState.selectedSource = null;
  gameState.movesRemaining = 0;
}

function resetGame() {
  gameState.currentPlayer = null;
  gameState.phase = "initial-roll";
  gameState.animating = false;
  initBoard();
  setMessage("Roll to see who starts.");
  updateControls();
  redraw();
}

// ---------------------- Dice Rolling ----------------------
function rollDice(numDice) {
  return new Promise((resolve) => {
    const duration = 900;
    const interval = 90;
    let elapsed = 0;
    gameState.animating = true;
    updateControls();
    const timer = setInterval(() => {
      const temp = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
      gameState.diceFaces = temp;
      redraw();
      elapsed += interval;
      if (elapsed >= duration) {
        clearInterval(timer);
        const finalRoll = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
        gameState.diceFaces = finalRoll;
        redraw();
        setTimeout(() => {
          gameState.animating = false;
          updateControls();
          resolve(finalRoll);
        }, 150);
      }
    }, interval);
  });
}

function expandDiceForMoves(values) {
  if (values.length === 2 && values[0] === values[1]) {
    return [values[0], values[0], values[0], values[0]];
  }
  return values.slice();
}

// ---------------------- Turn Flow ----------------------
async function startInitialRoll() {
  updateControls();
  setMessage("Your opening roll...");
  const whiteRoll = (await rollDice(1))[0];
  setMessage(`You rolled ${whiteRoll}. CPU rolling...`);
  const blackRoll = (await rollDice(1))[0];

  if (whiteRoll === blackRoll) {
    setMessage(`Tie at ${whiteRoll}. Roll again.`);
    updateControls();
    return;
  }

  const diceFaces = [whiteRoll, blackRoll];
  gameState.diceFaces = diceFaces;
  if (whiteRoll > blackRoll) {
    gameState.currentPlayer = "white";
    gameState.phase = "player-move";
    setMessage(`You start! Play ${whiteRoll} and ${blackRoll}.`);
    const diceMoves = expandDiceForMoves(diceFaces);
    prepareHumanTurn(diceMoves);
  } else {
    gameState.currentPlayer = "black";
    gameState.phase = "cpu-moving";
    setMessage(`CPU starts with ${blackRoll} and ${whiteRoll}.`);
    const diceMoves = expandDiceForMoves([blackRoll, whiteRoll]);
    runCpuTurnWithDice(diceMoves);
  }
  updateControls();
}

async function startPlayerTurn() {
  gameState.phase = "player-rolling";
  updateControls();
  setMessage("Rolling your dice...");
  const roll = await rollDice(2);
  setMessage(`You rolled ${roll.join(" & ")}. Select a checker.`);
  gameState.phase = "player-move";
  const diceMoves = expandDiceForMoves(roll);
  prepareHumanTurn(diceMoves);
}

function prepareHumanTurn(diceMoves) {
  const sequences = computeLegalMoveSequences("white", diceMoves, cloneCoreState(gameState));
  if (!sequences.length) {
    setMessage("No legal moves. Turn passes to CPU.");
    gameState.diceFaces = diceMoves.length ? [diceMoves[0], diceMoves[1] || diceMoves[0]] : [];
    gameState.phase = "player-finished";
    updateControls();
    setTimeout(() => endTurn(), 900);
    return;
  }
  gameState.allowedSequences = sequences;
  gameState.selectedSource = null;
  updateLegalMovesFromSequences();
  updateControls();
  redraw();
}

async function startCpuTurn() {
  gameState.phase = "cpu-turn";
  updateControls();
  setMessage("CPU rolling...");
  const roll = await rollDice(2);
  runCpuTurnWithDice(expandDiceForMoves(roll));
}

function runCpuTurnWithDice(diceMoves) {
  const sequences = computeLegalMoveSequences("black", diceMoves, cloneCoreState(gameState));
  if (!sequences.length) {
    setMessage("CPU has no moves. Your roll!");
    gameState.phase = "cpu-finished";
    updateControls();
    setTimeout(() => endTurn(), 900);
    return;
  }
  gameState.phase = "cpu-moving";
  updateControls();
  const chosen = pickCpuSequence(sequences);
  gameState.movesRemaining = chosen.length;
  executeCpuSequence(chosen.slice());
}

function executeCpuSequence(sequence) {
  if (!sequence.length) {
    setTimeout(() => endTurn(), 500);
    return;
  }
  const move = sequence.shift();
  gameState.movesRemaining = sequence.length + 1;
  setMessage(`CPU moves ${describeMove(move, "black")}`);
  performMove(move, "black", () => {
    if (checkVictory("black")) {
      handleVictory("black");
      return;
    }
    if (!sequence.length) {
      setTimeout(() => endTurn(), 600);
    } else {
      setTimeout(() => executeCpuSequence(sequence), 400);
    }
  });
}

function endTurn() {
  gameState.allowedSequences = [];
  gameState.legalMoves = [];
  gameState.highlightMoves = [];
  gameState.selectedSource = null;
  gameState.movesRemaining = 0;
  gameState.diceFaces = [];
  redraw();
  if (gameState.currentPlayer === "white") {
    gameState.currentPlayer = "black";
    gameState.phase = "cpu-turn";
    setMessage("CPU's turn. Rolling...");
    updateControls();
    setTimeout(() => startCpuTurn(), 500);
  } else {
    gameState.currentPlayer = "white";
    gameState.phase = "player-await-roll";
    setMessage("Your turn. Roll the dice.");
    updateControls();
  }
}

function handleVictory(player) {
  const text = player === "white" ? "You bear off all 15! Victory." : "CPU bears off first. Better luck next time.";
  setMessage(text);
  gameState.phase = "game-over";
  updateControls();
}

// ---------------------- Player Interaction ----------------------
function handleCanvasClick(event) {
  if (gameState.phase !== "player-move" || gameState.animating) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const target = resolveClickTarget(x, y);
  if (!target) return;

  if (gameState.selectedSource === null) {
    if (target.type === "bar" && gameState.bar.white > 0 && hasMovesFromSource("bar")) {
      setSelectedSource("bar");
      return;
    }
    if (target.type === "point") {
      const point = gameState.board[target.index];
      if (point && point.color === "white" && point.count > 0 && hasMovesFromSource(target.index)) {
        setSelectedSource(target.index);
      }
    }
  } else {
    if (target.type === "point" && target.index === gameState.selectedSource) {
      setSelectedSource(null);
      return;
    }
    if (target.type === "bar" && gameState.selectedSource === "bar") {
      setSelectedSource(null);
      return;
    }
    const destination = interpretDestination(target);
    if (!destination) return;
    const chosenMove = gameState.highlightMoves.find((move) =>
      destinationsMatch(move, destination)
    );
    if (chosenMove) {
      setSelectedSource(null);
      performMove(chosenMove, "white", () => {
        afterHumanMove(chosenMove);
      });
    }
  }
}

function hasMovesFromSource(source) {
  return gameState.legalMoves.some((move) => move.from === source);
}

function interpretDestination(target) {
  if (target.type === "point") return { type: "point", index: target.index };
  if (target.type === "bearOff" && target.player === "white") return { type: "bearOff" };
  return null;
}

function destinationsMatch(move, destination) {
  if (destination.type === "bearOff") return move.bearOff;
  return !move.bearOff && move.to === destination.index;
}

function setSelectedSource(source) {
  gameState.selectedSource = source;
  if (source === null) {
    gameState.highlightMoves = [];
  } else {
    gameState.highlightMoves = gameState.legalMoves.filter((move) => move.from === source);
  }
  redraw();
}

function afterHumanMove(move) {
  if (checkVictory("white")) {
    handleVictory("white");
    return;
  }
  consumeMove(move);
  updateLegalMovesFromSequences();
  if (!gameState.movesRemaining || !gameState.legalMoves.length) {
    setMessage("No more legal moves. CPU's turn.");
    gameState.phase = "player-finished";
    updateControls();
    setTimeout(() => endTurn(), 600);
  } else {
    setMessage(`Moves remaining: ${gameState.movesRemaining}. Select your next move.`);
  }
}

function consumeMove(move) {
  gameState.allowedSequences = gameState.allowedSequences
    .filter((sequence) => sequence.length && sameMove(sequence[0], move))
    .map((sequence) => sequence.slice(1));
}

function updateLegalMovesFromSequences() {
  const moves = [];
  const seen = new Set();
  let remaining = 0;
  gameState.allowedSequences.forEach((sequence) => {
    if (sequence.length > remaining) remaining = sequence.length;
    if (!sequence.length) return;
    const move = sequence[0];
    const key = serializeMove(move);
    if (!seen.has(key)) {
      seen.add(key);
      moves.push(cloneMove(move));
    }
  });
  gameState.legalMoves = moves;
  gameState.movesRemaining = remaining;
  gameState.highlightMoves = gameState.selectedSource !== null ? moves.filter((m) => m.from === gameState.selectedSource) : [];
  updateHud();
}

// ---------------------- Move + Rule Logic ----------------------
function getOpponent(player) {
  return player === "white" ? "black" : "white";
}

function cloneCoreState(state) {
  return {
    board: state.board.map((point) => ({ color: point.color, count: point.count })),
    bar: { white: state.bar.white, black: state.bar.black },
    borneOff: { white: state.borneOff.white, black: state.borneOff.black }
  };
}

function computeLegalMoveSequences(player, dice, baseState) {
  if (!dice.length) return [];
  const permutations = uniquePermutations(dice);
  let maxUsed = 0;
  const best = [];
  const seen = new Set();

  function explore(state, order, idx, sequence) {
    if (idx >= order.length) {
      record(sequence);
      return;
    }
    const die = order[idx];
    const moves = getMovesForDie(state, player, die);
    if (!moves.length) {
      explore(state, order, idx + 1, sequence);
      return;
    }
    moves.forEach((move) => {
      const nextState = cloneCoreState(state);
      applyMoveToState(nextState, move, player);
      sequence.push(move);
      explore(nextState, order, idx + 1, sequence);
      sequence.pop();
    });
  }

  function record(sequence) {
    if (sequence.length === 0) return;
    if (sequence.length > maxUsed) {
      maxUsed = sequence.length;
      best.length = 0;
      seen.clear();
    }
    if (sequence.length === maxUsed) {
      const snapshot = sequence.map(cloneMove);
      const key = snapshot.map(serializeMove).join("|");
      if (!seen.has(key)) {
        seen.add(key);
        best.push(snapshot);
      }
    }
  }

  permutations.forEach((order) => {
    explore(cloneCoreState(baseState), order, 0, []);
  });

  return best;
}

function getMovesForDie(state, player, die) {
  const moves = [];
  const opponent = getOpponent(player);
  const direction = DIRECTIONS[player];
  const board = state.board;

  if (state.bar[player] > 0) {
    const dest = player === "white" ? 24 - die : die - 1;
    const point = board[dest];
    if (isPointOpen(point, player)) {
      moves.push({ from: "bar", to: dest, die, bearOff: false, hit: point.count === 1 && point.color === opponent });
    }
    return moves;
  }

  for (let i = 0; i < 24; i++) {
    const point = board[i];
    if (point.color !== player || point.count === 0) continue;
    let dest = i + direction * die;
    if (dest >= 0 && dest <= 23) {
      const target = board[dest];
      if (isPointOpen(target, player)) {
        moves.push({
          from: i,
          to: dest,
          die,
          bearOff: false,
          hit: target.count === 1 && target.color === opponent
        });
      }
    } else if (canBearOffFrom(state, player, i, die)) {
      moves.push({ from: i, to: null, die, bearOff: true, hit: false });
    }
  }
  return moves;
}

function isPointOpen(point, player) {
  if (!point.count) return true;
  if (point.color === player) return true;
  return point.count === 1;
}

function canBearOffFrom(state, player, index, die) {
  if (!allCheckersInHome(state, player)) return false;
  const direction = DIRECTIONS[player];
  const dest = index + direction * die;
  if (player === "white") {
    if (dest === -1) return true;
    if (dest < -1) {
      return !hasCheckerBeyond(state, player, index);
    }
  } else {
    if (dest === 24) return true;
    if (dest > 24) {
      return !hasCheckerBeyond(state, player, index);
    }
  }
  return false;
}

function allCheckersInHome(state, player) {
  const [start, end] = HOME_RANGES[player];
  if (state.bar[player] > 0) return false;
  for (let i = 0; i < 24; i++) {
    const point = state.board[i];
    if (point.color === player && point.count > 0) {
      if (i < start || i > end) return false;
    }
  }
  return true;
}

function hasCheckerBeyond(state, player, fromIndex) {
  const [start, end] = HOME_RANGES[player];
  if (player === "white") {
    for (let i = fromIndex + 1; i <= end; i++) {
      if (state.board[i].color === player && state.board[i].count > 0) return true;
    }
  } else {
    for (let i = fromIndex - 1; i >= start; i--) {
      if (state.board[i].color === player && state.board[i].count > 0) return true;
    }
  }
  return false;
}

function applyMoveToState(state, move, player) {
  const opponent = getOpponent(player);
  if (move.from === "bar") {
    state.bar[player]--;
  } else {
    state.board[move.from].count--;
    if (state.board[move.from].count === 0) state.board[move.from].color = null;
  }

  if (move.bearOff) {
    state.borneOff[player]++;
    return;
  }

  const dest = state.board[move.to];
  if (dest.count === 1 && dest.color === opponent) {
    state.bar[opponent]++;
    state.board[move.to] = { color: player, count: 1 };
  } else if (dest.count === 0) {
    state.board[move.to] = { color: player, count: 1 };
  } else {
    dest.count++;
    dest.color = player;
  }
}

function sameMove(a, b) {
  return a.from === b.from && a.to === b.to && a.die === b.die && a.bearOff === b.bearOff;
}

function serializeMove(move) {
  return `${move.from}-${move.to === null ? "off" : move.to}-${move.die}`;
}

function cloneMove(move) {
  return { from: move.from, to: move.to, die: move.die, bearOff: move.bearOff, hit: move.hit };
}

function uniquePermutations(values) {
  const counts = {};
  values.forEach((val) => {
    counts[val] = (counts[val] || 0) + 1;
  });
  const result = [];
  const buffer = [];
  const keys = Object.keys(counts).map(Number);

  function backtrack() {
    if (buffer.length === values.length) {
      result.push(buffer.slice());
      return;
    }
    for (const key of keys) {
      if (!counts[key]) continue;
      counts[key]--;
      buffer.push(key);
      backtrack();
      buffer.pop();
      counts[key]++;
    }
  }

  backtrack();
  return result;
}

function pickCpuSequence(sequences) {
  let bestScore = -Infinity;
  let choice = sequences[0];
  sequences.forEach((sequence) => {
    const score = sequence.reduce((acc, move) => acc + evaluateCpuMove(move), 0) + Math.random();
    if (score > bestScore) {
      bestScore = score;
      choice = sequence;
    }
  });
  return choice.map(cloneMove);
}

function evaluateCpuMove(move) {
  let score = move.die;
  if (move.hit) score += 5;
  if (move.bearOff) score += 8;
  if (move.from === "bar") score += 2;
  if (!move.bearOff && typeof move.to === "number") {
    score += move.to * 0.2;
  }
  return score;
}

function describeMove(move, player) {
  if (move.bearOff) return "bearing off";
  const pointFrom = move.from === "bar" ? "bar" : `point ${move.from + 1}`;
  const pointTo = move.to !== null ? `point ${move.to + 1}` : "off";
  let text = `${pointFrom} → ${pointTo}`;
  if (move.hit) text += " (hit)";
  return text;
}

function checkVictory(player) {
  return gameState.borneOff[player] >= TOTAL_CHECKERS;
}

// ---------------------- Animation ----------------------
function performMove(move, player, callback) {
  const startPos = getMoveStartPosition(move, player);
  const nextState = cloneCoreState(gameState);
  applyMoveToState(nextState, move, player);
  const endPos = getMoveEndPosition(move, player, nextState);
  gameState.animating = true;
  updateControls();
  const duration = 450;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    const currentX = startPos.x + (endPos.x - startPos.x) * ease;
    const currentY = startPos.y + (endPos.y - startPos.y) * ease;
    redraw();
    drawCheckerPiece(currentX, currentY, player);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      gameState.board = nextState.board;
      gameState.bar = nextState.bar;
      gameState.borneOff = nextState.borneOff;
      gameState.animating = false;
      updateHud();
      updateControls();
      redraw();
      callback();
    }
  }

  requestAnimationFrame(step);
}

function getMoveStartPosition(move, player) {
  if (move.from === "bar") {
    const slotIndex = Math.max(gameState.bar[player] - 1, 0);
    return getBarCheckerPosition(player, slotIndex);
  }
  const point = gameState.board[move.from];
  const slot = Math.max(point.count - 1, 0);
  return getCheckerSlotPosition(move.from, slot);
}

function getMoveEndPosition(move, player, nextState) {
  if (move.bearOff) {
    const index = nextState.borneOff[player] - 1;
    return getBearOffStackPosition(player, index);
  }
  const point = nextState.board[move.to];
  const slot = Math.max(point.count - 1, 0);
  return getCheckerSlotPosition(move.to, slot);
}

// ---------------------- Geometry Helpers ----------------------
function getCheckerRadius() {
  return (canvas.width / 14) * 0.4;
}

function getPointEntryPosition(index) {
  const { pointWidth, barX } = getLayout();
  const leftStart = barX - pointWidth * 6;
  const rightStart = barX + pointWidth * 2;
  let x;
  if (index < 12) {
    if (index <= 5) {
      const local = 5 - index; // point 1 is far right
      x = rightStart + local * pointWidth + pointWidth / 2;
    } else {
      const local = 11 - index; // point 12 is far left
      x = leftStart + local * pointWidth + pointWidth / 2;
    }
    return { x, y: canvas.height - 20 };
  }
  if (index <= 17) {
    const local = index - 12; // point 13 starts at far left
    x = leftStart + local * pointWidth + pointWidth / 2;
  } else {
    const local = index - 18; // point 19 starts near bar
    x = rightStart + local * pointWidth + pointWidth / 2;
  }
  return { x, y: 20 };
}

function getCheckerSlotPosition(index, slot) {
  const base = getPointEntryPosition(index);
  const radius = getCheckerRadius();
  const spacing = radius * 2.1;
  const isBottom = index < 12;
  const direction = isBottom ? -1 : 1;
  let y = isBottom ? canvas.height - radius - 6 : radius + 6;
  y += direction * slot * spacing;
  const limit = canvas.height / 2 - radius - 2;
  if (isBottom && y < canvas.height / 2 + radius) y = canvas.height / 2 + radius;
  if (!isBottom && y > limit) y = limit;
  return { x: base.x, y };
}

function getBarCheckerPosition(player, slot) {
  const safeSlot = Math.max(slot, 0);
  const { pointWidth } = getLayout();
  const radius = getCheckerRadius();
  const spacing = radius * 2.2;
  if (player === "white") {
    const x = canvas.width / 2;
    const y = canvas.height * 0.65 + safeSlot * spacing;
    return { x, y };
  }
  const x = canvas.width / 2 + pointWidth;
  const y = canvas.height * 0.35 - safeSlot * spacing;
  return { x, y };
}

function getBearOffTarget(player) {
  const radius = getCheckerRadius() * 1.4;
  if (player === "white") {
    return { x: getLayout().pointWidth * 1.4, y: canvas.height - 35, radius };
  }
  return { x: canvas.width - getLayout().pointWidth * 1.4, y: 35, radius };
}

function getBearOffStackPosition(player, index) {
  const target = getBearOffTarget(player);
  const spacing = getCheckerRadius() * 1.3;
  const column = Math.floor(index / 5);
  const row = index % 5;
  if (player === "white") {
    return { x: target.x + column * spacing * 0.8, y: target.y - row * spacing };
  }
  return { x: target.x - column * spacing * 0.8, y: target.y + row * spacing };
}

function drawRoundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getHighlightPosition(source) {
  if (source === "bar") {
    const pos = getBarCheckerPosition("white", 0);
    return { x: pos.x, y: canvas.height * 0.72 };
  }
  return getPointEntryPosition(source);
}

function resolveClickTarget(x, y) {
  const { pointWidth, triangleHeight, barX } = getLayout();
  const leftStart = barX - pointWidth * 6;
  const rightStart = barX + pointWidth * 2;
  const bearOffTarget = getBearOffTarget("white");
  const dx = x - bearOffTarget.x;
  const dy = y - bearOffTarget.y;
  if (gameState.legalMoves.some((move) => move.bearOff) && Math.sqrt(dx * dx + dy * dy) <= bearOffTarget.radius) {
    return { type: "bearOff", player: "white" };
  }

  if (x >= barX && x <= barX + pointWidth * 2 && gameState.bar.white > 0) {
    return { type: "bar" };
  }

  if (y < triangleHeight) {
    if (x < barX) {
      const local = Math.floor((x - leftStart) / pointWidth);
      if (local >= 0 && local < 6) {
        const index = 12 + local;
        return { type: "point", index };
      }
    } else if (x > barX + pointWidth * 2) {
      const local = Math.floor((x - rightStart) / pointWidth);
      if (local >= 0 && local < 6) {
        const index = 18 + local;
        return { type: "point", index };
      }
    }
  } else {
    if (x < barX) {
      const local = Math.floor((x - leftStart) / pointWidth);
      if (local >= 0 && local < 6) {
        const index = 11 - local;
        return { type: "point", index };
      }
    } else if (x > barX + pointWidth * 2) {
      const local = Math.floor((x - rightStart) / pointWidth);
      if (local >= 0 && local < 6) {
        const index = 5 - local;
        return { type: "point", index };
      }
    }
  }
  return null;
}
