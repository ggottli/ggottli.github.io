// Select DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

// Track whether the game has started
let gameStarted = false;

// Resize canvas to fill the screen
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

// Pipe variables (closer, faster = harder)
const pipeWidth = 60;
let pipeSpeed = 4;   // Increased speed from 3 to 4
let gap = 120;       // Reduced gap from 150 to 120
let pipes = [];

// Score
let score = 0;
let highScore = 0;

// Create a pipe
function createPipe() {
  // Random gap position
  let topHeight = Math.random() * (canvas.height - gap - 50) + 50;
  let bottomHeight = canvas.height - topHeight - gap;
  
  pipes.push({
    x: canvas.width,
    topHeight: topHeight,
    bottomHeight: bottomHeight
  });
}

// Reset game
function resetGame() {
  birdY = canvas.height / 2;
  velocity = 0;
  score = 0;
  pipes = [];
  createPipe();
}

// Function to start the game
function startGame() {
  // Hide start screen
  startScreen.style.display = 'none';
  // Begin game
  gameStarted = true;
  resetGame();
}

// Attach click & touch events to the start button
startBtn.addEventListener('click', startGame);
// Some mobile browsers only fire 'touchstart' or fire both. Add it to be safe.
startBtn.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent double event on some browsers
  startGame();
});

// Main game loop
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
      resetGame();
    }
    // Check bottom pipe collision
    if (
      birdX + birdSize > pipes[i].x &&
      birdX < pipes[i].x + pipeWidth &&
      birdY + birdSize > canvas.height - pipes[i].bottomHeight
    ) {
      resetGame();
    }

    // If pipe goes off screen, remove it and create a new one
    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
      i--;
      score++;
      if (score > highScore) highScore = score;
      createPipe();
    }
  }

  // Check if bird hits the ground or the top
  if (birdY + birdSize > canvas.height || birdY < 0) {
    resetGame();
  }
}

// Draw the game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Bird
  ctx.fillStyle = 'yellow';
  ctx.fillRect(birdX, birdY, birdSize, birdSize);

  // Draw Pipes
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

  // Draw Score
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.fillText(`Score: ${score}`, 20, 40);
  ctx.fillText(`High Score: ${highScore}`, 20, 70);
}

// Listen for jump events on desktop and mobile
// Desktop: Space or Mouse Down
window.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
    velocity = jumpStrength;
  }
});
window.addEventListener('mousedown', function () {
  velocity = jumpStrength;
});

// Mobile: Touch Start
window.addEventListener('touchstart', function (e) {
  // If we’re on the start screen, it might overlap. 
  // We can ignore if gameStarted is false because the Start button listener handles that.
  if (gameStarted) {
    velocity = jumpStrength;
  }
});
