// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Adjust canvas size to fit the window
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Score elements
const playerScoreEl = document.getElementById("playerScore");
const cpuScoreEl = document.getElementById("cpuScore");

// Game objects
let playerScore = 0;
let cpuScore = 0;

// Dimensions and positions
const paddleRadius = 40;
const puckRadius = 20;

// Starting positions (we'll reset these in a function)
let playerX, playerY;
let cpuX, cpuY;
let puckX, puckY;
let puckSpeedX, puckSpeedY;

// Movement tracking for the player's finger/mouse
let pointerX = 0;
let pointerY = 0;
let isPointerDown = false;

// CPU settings
const cpuSpeed = 5; // how quickly the CPU moves its paddle

// Initialize / reset game
function initPositions() {
  playerX = canvas.width / 2;
  playerY = canvas.height - 100; // near bottom
  cpuX = canvas.width / 2;
  cpuY = 100;                    // near top
  puckX = canvas.width / 2;
  puckY = canvas.height / 2;
  // Random direction
  puckSpeedX = (Math.random() * 4 - 2) * 2;
  puckSpeedY = (Math.random() * 4 - 2) * 2;
}

initPositions();

// Event listeners for mouse and touch
canvas.addEventListener('mousedown', (e) => {
  isPointerDown = true;
  pointerX = e.clientX;
  pointerY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
  if (isPointerDown) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
});

canvas.addEventListener('mouseup', () => {
  isPointerDown = false;
});

// Touch
canvas.addEventListener('touchstart', (e) => {
  isPointerDown = true;
  const touch = e.touches[0];
  pointerX = touch.clientX;
  pointerY = touch.clientY;
});

canvas.addEventListener('touchmove', (e) => {
  if (isPointerDown) {
    const touch = e.touches[0];
    pointerX = touch.clientX;
    pointerY = touch.clientY;
  }
});

canvas.addEventListener('touchend', () => {
  isPointerDown = false;
});

// Helper to calculate distance
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Main game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Update positions and handle logic
function update() {
  // Move player's paddle toward pointer if pointer is down
  if (isPointerDown) {
    playerX = pointerX;
    playerY = pointerY;
  }

  // Bound the player's paddle within the canvas horizontally
  if (playerX < paddleRadius) playerX = paddleRadius;
  if (playerX > canvas.width - paddleRadius) playerX = canvas.width - paddleRadius;

  // -------------------------
  // Prevent player from crossing into CPU side
  // Player must stay in bottom half of the screen.
  // We'll clamp so player cannot go above canvas.height/2.
  if (playerY < canvas.height / 2 + paddleRadius) {
    playerY = canvas.height / 2 + paddleRadius;
  }
  // Also clamp bottom edge.
  if (playerY > canvas.height - paddleRadius) {
    playerY = canvas.height - paddleRadius;
  }
  // -------------------------

  // CPU tries to move paddle towards the puck, limited by cpuSpeed
  if (puckX < cpuX) {
    cpuX -= Math.min(cpuSpeed, cpuX - puckX);
  } else if (puckX > cpuX) {
    cpuX += Math.min(cpuSpeed, puckX - cpuX);
  }
  // Bound CPU horizontally
  if (cpuX < paddleRadius) cpuX = paddleRadius;
  if (cpuX > canvas.width - paddleRadius) cpuX = canvas.width - paddleRadius;
  // CPU stays near the top
  cpuY = 100;

  // Move the puck
  puckX += puckSpeedX;
  puckY += puckSpeedY;

  // -------------------------
  // Handle collisions with left/right walls *before* checking goals
  handleWallCollision();
  // -------------------------

  // Check if puck hits top/bottom edges = goal
  if (puckY < puckRadius) {
    // Goal for Player
    playerScore++;
    playerScoreEl.textContent = playerScore;
    initPositions();
    return;
  }
  if (puckY > canvas.height - puckRadius) {
    // Goal for CPU
    cpuScore++;
    cpuScoreEl.textContent = cpuScore;
    initPositions();
    return;
  }

  // Collisions with paddles
  checkPaddleCollision(playerX, playerY);
  checkPaddleCollision(cpuX, cpuY);
}

// -------------------------
// New function to handle the puck + walls properly
function handleWallCollision() {
  // Left or right wall
  if (puckX < puckRadius) {
    puckX = puckRadius;           // force back into bounds
    puckSpeedX = Math.abs(puckSpeedX); // reverse speed if needed
  }
  if (puckX > canvas.width - puckRadius) {
    puckX = canvas.width - puckRadius; // force back into bounds
    puckSpeedX = -Math.abs(puckSpeedX); // reverse speed if needed
  }
}
// -------------------------

// Check collision with a paddle
function checkPaddleCollision(paddleX, paddleY) {
  let dist = distance(paddleX, paddleY, puckX, puckY);
  let sumRadius = paddleRadius + puckRadius;
  if (dist < sumRadius) {
    // Basic collision response
    let angle = Math.atan2(puckY - paddleY, puckX - paddleX);
    // Move puck to the edge of the paddle to avoid overlap
    puckX = paddleX + Math.cos(angle) * sumRadius;
    puckY = paddleY + Math.sin(angle) * sumRadius;
    // Reflect puck’s velocity, add a bit of “bounce”
    let speed = Math.sqrt(puckSpeedX * puckSpeedX + puckSpeedY * puckSpeedY);
    // We ensure speed is not zero to avoid the puck "freezing" against the wall
    let minSpeed = 2; // or any small positive number
    speed = Math.max(speed, minSpeed);

    puckSpeedX = Math.cos(angle) * speed;
    puckSpeedY = Math.sin(angle) * speed;
    // Increase speed slightly after each collision for fun
    puckSpeedX *= 1.05;
    puckSpeedY *= 1.05;
  }
}

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw middle line
  ctx.strokeStyle = "#fff";
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  // Draw player paddle
  ctx.setLineDash([]);
  ctx.fillStyle = "blue";
  ctx.beginPath();
  ctx.arc(playerX, playerY, paddleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw CPU paddle
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(cpuX, cpuY, paddleRadius, 0, Math.PI * 2);
  ctx.fill();

  // Draw puck
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(puckX, puckY, puckRadius, 0, Math.PI * 2);
  ctx.fill();
}

// Start the game loop
gameLoop();
