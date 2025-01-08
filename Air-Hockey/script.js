// Grabbing elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");
const gameContainer = document.getElementById("gameContainer");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const playerScoreEl = document.getElementById("playerScore");
const cpuScoreEl = document.getElementById("cpuScore");
const winnerText = document.getElementById("winnerText");

// Game settings
let gameState = "title"; // can be "title", "playing", "gameover"
const winningScore = 5;

// Canvas resizing
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Scores
let playerScore = 0;
let cpuScore = 0;

// Dimensions
const paddleRadius = 40;
const puckRadius = 20;

// Positions and speeds
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

// Event Listeners for Buttons
startBtn.addEventListener("click", startGame);
playAgainBtn.addEventListener("click", playAgain);

// Event listeners for mouse/touch
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

// Touch events
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

// Start & Reset Logic
function startGame() {
  // Switch to playing state
  gameState = "playing";
  // Hide title screen, show game
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

function playAgain() {
  // Same as startGame, but we come from "gameover"
  startGame();
}

// Init positions
function initPositions() {
  playerX = canvas.width / 2;
  playerY = canvas.height - 100; // near bottom
  cpuX = canvas.width / 2;
  cpuY = 100;                    // near top
  puckX = canvas.width / 2;
  puckY = canvas.height / 2;
  // Random direction for puck
  puckSpeedX = (Math.random() * 4 - 2) * 2;
  puckSpeedY = (Math.random() * 4 - 2) * 2;
}

// Distance helper
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Game loop
function gameLoop() {
  // Only update/draw if game is in "playing" state
  if (gameState === "playing") {
    update();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
gameLoop(); // start the animation loop once

function update() {
  // Move player paddle
  if (isPointerDown) {
    playerX = pointerX;
    playerY = pointerY;
  }

  // Bound player horizontally
  if (playerX < paddleRadius) playerX = paddleRadius;
  if (playerX > canvas.width - paddleRadius) playerX = canvas.width - paddleRadius;

  // Lock player to bottom half
  if (playerY < canvas.height / 2 + paddleRadius) {
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

  // Check collisions with walls (left/right)
  if (puckX < puckRadius) {
    puckX = puckRadius;
    puckSpeedX = Math.abs(puckSpeedX);
  }
  if (puckX > canvas.width - puckRadius) {
    puckX = canvas.width - puckRadius;
    puckSpeedX = -Math.abs(puckSpeedX);
  }

  // Check goal (top/bottom)
  if (puckY < puckRadius) {
    // Player scores
    playerScore++;
    playerScoreEl.textContent = playerScore;
    checkWinCondition();
    if (gameState === "playing") initPositions();
    return;
  }
  if (puckY > canvas.height - puckRadius) {
    // CPU scores
    cpuScore++;
    cpuScoreEl.textContent = cpuScore;
    checkWinCondition();
    if (gameState === "playing") initPositions();
    return;
  }

  // Collisions with paddles
  checkPaddleCollision(playerX, playerY);
  checkPaddleCollision(cpuX, cpuY);
}

// Check if anyone reached 5 points
function checkWinCondition() {
  if (playerScore >= winningScore) {
    endGame("Player");
  } else if (cpuScore >= winningScore) {
    endGame("CPU");
  }
}

function endGame(winner) {
  // Switch to gameover
  gameState = "gameover";
  // Show final score
  winnerText.innerText = `${winner} wins!\nFinal Score: ${playerScore} - ${cpuScore}`;
  // Hide the game container
  gameContainer.style.display = "none";
  // Show the game over screen
  gameOverScreen.style.display = "flex";
}

// Paddle collision
function checkPaddleCollision(paddleX, paddleY) {
  let dist = distance(paddleX, paddleY, puckX, puckY);
  let sumRadius = paddleRadius + puckRadius;
  if (dist < sumRadius) {
    // Basic collision response
    let angle = Math.atan2(puckY - paddleY, puckX - paddleX);
    // Move puck to the edge of the paddle to avoid overlap
    puckX = paddleX + Math.cos(angle) * sumRadius;
    puckY = paddleY + Math.sin(angle) * sumRadius;
    // Reflect puck velocity, add bounce
    let speed = Math.sqrt(puckSpeedX * puckSpeedX + puckSpeedY * puckSpeedY);
    const minSpeed = 2;
    speed = Math.max(speed, minSpeed);

    puckSpeedX = Math.cos(angle) * speed;
    puckSpeedY = Math.sin(angle) * speed;
    // Increase speed slightly
    puckSpeedX *= 1.05;
    puckSpeedY *= 1.05;
  }
}

// Draw
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
