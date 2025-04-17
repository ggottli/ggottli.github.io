// References to DOM elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");
const gameContainer = document.getElementById("gameContainer");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");       // Title screen button
const startBtnEnd = document.getElementById("startBtnEnd"); // Game Over screen button

const playerScoreEl = document.getElementById("playerScore");
const cpuScoreEl = document.getElementById("cpuScore");
const winnerText = document.getElementById("winnerText");

// Game settings
let gameState = "title"; // can be "title", "playing", or "gameover"
const winningScore = 5;

// Resize the canvas to the window size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Scores
let playerScore = 0;
let cpuScore = 0;

// Paddles & puck
const paddleRadius = 40;
const puckRadius = 20;

// Positions
let playerX, playerY;
let cpuX, cpuY;
let puckX, puckY;
let puckSpeedX, puckSpeedY;

// Player movement
let pointerX = 0;
let pointerY = 0;
let isPointerDown = false;

// CPU speed
const cpuSpeed = 5;

// Button event listeners
startBtn.addEventListener("click", startGame);
startBtnEnd.addEventListener("click", startGame);

// Mouse & touch events
canvas.addEventListener('mousedown', (e) => {
  if (gameState === "playing") {
    isPointerDown = true;
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
});
canvas.addEventListener('mousemove', (e) => {
  if (gameState === "playing" && isPointerDown) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
});
canvas.addEventListener('mouseup', () => {
  isPointerDown = false;
});
canvas.addEventListener('touchstart', (e) => {
  if (gameState === "playing") {
    isPointerDown = true;
    const touch = e.touches[0];
    pointerX = touch.clientX;
    pointerY = touch.clientY;
  }
});
canvas.addEventListener('touchmove', (e) => {
  if (gameState === "playing" && isPointerDown) {
    const touch = e.touches[0];
    pointerX = touch.clientX;
    pointerY = touch.clientY;
  }
});
canvas.addEventListener('touchend', () => {
  isPointerDown = false;
});

// Start game
function startGame() {
  // Reset game state to playing
  gameState = "playing";

  // Hide title and game over screens, show the game container
  titleScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  gameContainer.style.display = "block";

  // Reset scores
  playerScore = 0;
  cpuScore = 0;
  playerScoreEl.textContent = playerScore;
  cpuScoreEl.textContent = cpuScore;

  // Initialize positions
  initPositions();
}

// Initialize paddles/puck positions
function initPositions() {
  playerX = canvas.width / 2;
  playerY = canvas.height - 100;
  cpuX = canvas.width / 2;
  cpuY = 100;
  puckX = canvas.width / 2;
  puckY = canvas.height / 2;

  // Random direction for the puck
  puckSpeedX = (Math.random() * 4 - 2) * 2;
  puckSpeedY = (Math.random() * 4 - 2) * 2;
}

// Distance helper
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Animation loop
function gameLoop() {
  if (gameState === "playing") {
    update();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();

// Update positions and check collisions
function update() {
  // Player paddle movement
  if (isPointerDown) {
    playerX = pointerX;
    playerY = pointerY;
  }

  // Bound player horizontally
  if (playerX < paddleRadius) playerX = paddleRadius;
  if (playerX > canvas.width - paddleRadius) playerX = canvas.width - paddleRadius;

  // Lock player in bottom half
  if (playerY < (canvas.height / 2 + paddleRadius)) {
    playerY = canvas.height / 2 + paddleRadius;
  }
  if (playerY > canvas.height - paddleRadius) {
    playerY = canvas.height - paddleRadius;
  }

  // CPU movement
  if (puckX < cpuX) {
    cpuX -= Math.min(cpuSpeed, cpuX - puckX);
  } else if (puckX > cpuX) {
    cpuX += Math.min(cpuSpeed, puckX - cpuX);
  }
  // Bound CPU horizontally
  if (cpuX < paddleRadius) cpuX = paddleRadius;
  if (cpuX > canvas.width - paddleRadius) cpuX = canvas.width - paddleRadius;
  // Keep CPU near top
  cpuY = 100;

  // Move puck
  puckX += puckSpeedX;
  puckY += puckSpeedY;

  // Left/right wall collision
  if (puckX < puckRadius) {
    puckX = puckRadius;
    puckSpeedX = Math.abs(puckSpeedX);
  } else if (puckX > canvas.width - puckRadius) {
    puckX = canvas.width - puckRadius;
    puckSpeedX = -Math.abs(puckSpeedX);
  }

  // Goal check (top/bottom)
  if (puckY < puckRadius) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    checkWinCondition("Player");
    if (gameState === "playing") initPositions();
    return;
  }
  if (puckY > canvas.height - puckRadius) {
    cpuScore++;
    cpuScoreEl.textContent = cpuScore;
    checkWinCondition("CPU");
    if (gameState === "playing") initPositions();
    return;
  }

  // Paddle collisions
  checkPaddleCollision(playerX, playerY);
  checkPaddleCollision(cpuX, cpuY);
}

// Check if either reached winningScore
function checkWinCondition(scorer) {
  if (playerScore >= winningScore) {
    endGame("Player");
  } else if (cpuScore >= winningScore) {
    endGame("CPU");
  }
}

// End the game, show game over screen
function endGame(winner) {
  gameState = "gameover";

  // Hide the game container
  gameContainer.style.display = "none";

  // Show final score + winner text
  winnerText.innerText = `${winner} wins!\nFinal Score: ${playerScore} - ${cpuScore}`;

  // Show the game over screen
  gameOverScreen.style.display = "flex";
}

// Handle puck collisions with a paddle
function checkPaddleCollision(paddleX, paddleY) {
  let dist = distance(paddleX, paddleY, puckX, puckY);
  let sumRadius = paddleRadius + puckRadius;

  if (dist < sumRadius) {
    // Basic collision response
    let angle = Math.atan2(puckY - paddleY, puckX - paddleX);

    // Reposition puck to avoid overlap
    puckX = paddleX + Math.cos(angle) * sumRadius;
    puckY = paddleY + Math.sin(angle) * sumRadius;

    // Reflect puck velocity
    let speed = Math.sqrt(puckSpeedX * puckSpeedX + puckSpeedY * puckSpeedY);
    const minSpeed = 2;
    speed = Math.max(speed, minSpeed);

    puckSpeedX = Math.cos(angle) * speed;
    puckSpeedY = Math.sin(angle) * speed;

    // Slightly increase speed
    puckSpeedX *= 1.05;
    puckSpeedY *= 1.05;
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Middle line
  ctx.strokeStyle = "#fff";
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  // Player paddle
  ctx.setLineDash([]);
  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.arc(playerX, playerY, paddleRadius, 0, Math.PI * 2);
  ctx.fill();

  // CPU paddle
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(cpuX, cpuY, paddleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Puck
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(puckX, puckY, puckRadius, 0, Math.PI * 2);
  ctx.fill();
}
