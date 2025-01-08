// Select the canvas and get the drawing context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Adjust the canvas size to fill the screen
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // initial size

// Game Variables
let birdX = 50;
let birdY = canvas.height / 2;
let birdSize = 20;
let gravity = 0.5;
let velocity = 0;
let jumpStrength = -8;

// Pipe Variables
const pipeWidth = 60;
let pipeSpeed = 3;
let gap = 150; // space between top pipe and bottom pipe

// We'll store pipes in an array
let pipes = [];

// Score
let score = 0;
let highScore = 0;

// Create an initial set of pipes
function createPipe() {
  // random gap position
  let topHeight = Math.random() * (canvas.height - gap - 50) + 50;
  let bottomHeight = canvas.height - topHeight - gap;
  
  pipes.push({
    x: canvas.width,
    topHeight: topHeight,
    bottomHeight: bottomHeight
  });
}

// Initialize first pipe
createPipe();

// Game Loop
function update() {
  // Bird gravity
  velocity += gravity;
  birdY += velocity;

  // Pipe movement
  for (let i = 0; i < pipes.length; i++) {
    pipes[i].x -= pipeSpeed;

    // Check collision with bird
    // 1. Collision with top pipe
    if (
      birdX + birdSize > pipes[i].x &&
      birdX < pipes[i].x + pipeWidth &&
      birdY < pipes[i].topHeight
    ) {
      resetGame();
    }

    // 2. Collision with bottom pipe
    if (
      birdX + birdSize > pipes[i].x &&
      birdX < pipes[i].x + pipeWidth &&
      birdY + birdSize > canvas.height - pipes[i].bottomHeight
    ) {
      resetGame();
    }

    // If pipe goes off screen, remove it and add a new one
    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
      i--;
      score++;
      if (score > highScore) highScore = score;
      createPipe();
    }
  }

  // If bird hits the ground or goes above the canvas, reset game
  if (birdY + birdSize > canvas.height || birdY < 0) {
    resetGame();
  }
}

// Draw everything
function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the bird
  ctx.fillStyle = 'yellow';
  ctx.fillRect(birdX, birdY, birdSize, birdSize);

  // Draw the pipes
  ctx.fillStyle = 'green';
  for (let pipe of pipes) {
    // top pipe
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
    // bottom pipe
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

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();

// Listen for jump (space bar or click)
window.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
    velocity = jumpStrength;
  }
});
window.addEventListener('mousedown', function () {
  velocity = jumpStrength;
});

// Reset the game
function resetGame() {
  // Reset bird position and velocity
  birdY = canvas.height / 2;
  velocity = 0;
  score = 0;

  // Clear pipes and create a new one
  pipes = [];
  createPipe();
}
