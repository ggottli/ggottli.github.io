// DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const scoreInfo = document.getElementById('scoreInfo');

// Game state
let gameStarted = false;

// Canvas resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // initial size

// Bird variables
let birdX = 50;
let birdY = canvas.height / 2;
let birdSize = 20;
let gravity = 0.5;
let velocity = 0;
let jumpStrength = -8;

// Pipes
const pipeWidth = 60;
let pipeSpeed = 4;   // Faster
let gap = 120;       // Closer gap
let pipes = [];

// Scores
let score = 0;
let highScore = 0;
let lastScore = 0;  // We'll display this after a round

// Create a pipe
function createPipe() {
  let topHeight = Math.random() * (canvas.height - gap - 50) + 50;
  let bottomHeight = canvas.height - topHeight - gap;
  
  pipes.push({
    x: canvas.width,
    topHeight,
    bottomHeight
  });
}

// Reset game variables
function resetGame() {
  birdY = canvas.height / 2;
  velocity = 0;
  score = 0;
  pipes = [];
  createPipe();
}

// End the game, show title screen with last/high scores
function endGame() {
  gameStarted = false;
  lastScore = score;
  
  // Check if this is a new high score
  if (lastScore > highScore) {
    highScore = lastScore;
  }
  
  // Display the start screen with new info
  scoreInfo.textContent = `Last Score: ${lastScore}\nHigh Score: ${highScore}`;
  startScreen.style.display = 'flex';
}

// Start the game
function startGame() {
  startScreen.style.display = 'none'; // Hide start screen
  gameStarted = true;
  resetGame();
}

// Attach events to the start button (desktop + mobile)
startBtn.addEventListener('click', startGame);
startBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startGame();
});

// Main loop
function gameLoop() {
  if (gameStarted) {
    update();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();

// Update game logic
function update() {
  // Bird gravity
  velocity += gravity;
  birdY += velocity;

  // Move pipes
  for (let i = 0; i < pipes.length; i++) {
    pipes[i].x -= pipeSpeed;

    // Check top pipe collision
    if (
      birdX + birdSize > pipes[i].x &&
      birdX < pipes[i].x + pipeWidth &&
      birdY < pipes[i].topHeight
    ) {
      endGame();
      return; // Stop checking collisions this frame
    }

    // Check bottom pipe collision
    if (
      birdX + birdSize > pipes[i].x &&
      birdX < pipes[i].x + pipeWidth &&
      birdY + birdSize > canvas.height - pipes[i].bottomHeight
    ) {
      endGame();
      return;
    }

    // Pipe goes off screen
    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
      i--;
      score++;
      createPipe();
    }
  }

  // Check ground or ceiling collision
  if (birdY + birdSize > canvas.height || birdY < 0) {
    endGame();
    return;
  }
}

// Draw game elements
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Bird
  ctx.fillStyle = 'yellow';
  ctx.fillRect(birdX, birdY, birdSize, birdSize);

  // Pipes
  ctx.fillStyle = 'green';
  for (let pipe of pipes) {
    // Top pipe
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    // Bottom pipe
    ctx.fillRect(
      pipe.x,
      canvas.height - pipe.bottomHeight,
      pipeWidth,
      pipe.bottomHeight
    );
  }

  // Score
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`High: ${highScore}`, 20, 70);
}

// Listen for jump (desktop + mobile)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    velocity = jumpStrength;
  }
});
window.addEventListener('mousedown', () => {
  if (gameStarted) velocity = jumpStrength;
});
window.addEventListener('touchstart', (e) => {
  // If game hasn't started, the start screen handles that
  if (gameStarted) velocity = jumpStrength;
});
