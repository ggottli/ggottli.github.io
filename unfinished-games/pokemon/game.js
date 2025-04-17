// Set up the canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

// Game states: "exploration" or "battle"
let gameState = "exploration";

// Player object with position and movement speed
let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  speed: 4,
};

// Probability (per frame) of a wild encounter when exploring
const encounterProbability = 0.005;

// Define some wild Pokémon with simple stats
const wildPokemonList = [
  { name: "Bulbasaur", hp: 30, maxHp: 30 },
  { name: "Charmander", hp: 30, maxHp: 30 },
  { name: "Squirtle", hp: 30, maxHp: 30 },
];

let currentWildPokemon = null; // holds the wild Pokémon during a battle

// Array to hold the player's caught Pokémon
let playerParty = [];

// Keep track of key presses
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Main update function – handles both exploration and battle logic
function update() {
  if (gameState === "exploration") {
    // Move player with arrow keys
    if (keys["ArrowUp"]) player.y -= player.speed;
    if (keys["ArrowDown"]) player.y += player.speed;
    if (keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["ArrowRight"]) player.x += player.speed;

    // Keep player within bounds
    player.x = Math.max(0, Math.min(canvas.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height, player.y));

    // Random encounter check (for simplicity, assume entire area is "tall grass")
    if (Math.random() < encounterProbability) {
      startEncounter();
    }
  }
  // In battle mode, game updates wait for player input (handled in the keydown listener below)
}

// Draw the game scene
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "exploration") {
    // Draw a grassy background
    ctx.fillStyle = "lightgreen";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the player as a blue circle
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // Optional: display party count
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText("Party: " + playerParty.length + " Pokémon", 10, 20);
  } else if (gameState === "battle") {
    // Draw a battle background
    ctx.fillStyle = "darkgray";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Display enemy Pokémon (represented as a red square)
    ctx.fillStyle = "red";
    ctx.fillRect(600, 100, 100, 100);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(currentWildPokemon.name, 600, 90);
    ctx.fillText(
      "HP: " + currentWildPokemon.hp + "/" + currentWildPokemon.maxHp,
      600,
      220
    );

    // Display battle options
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Press F to Fight, C to Catch, R to Run", 50, canvas.height - 50);
  }
}

// Main game loop using requestAnimationFrame
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start a wild encounter by selecting a random Pokémon
function startEncounter() {
  // Deep copy to reset HP values for the encounter
  currentWildPokemon = JSON.parse(
    JSON.stringify(wildPokemonList[Math.floor(Math.random() * wildPokemonList.length)])
  );
  gameState = "battle";
  console.log("Encounter started with", currentWildPokemon.name);
}

// Handle battle commands via key presses
window.addEventListener("keydown", function (e) {
  if (gameState === "battle") {
    const key = e.key.toLowerCase();
    if (key === "f") {
      // Fight: simulate an attack dealing 5-14 damage
      let damage = Math.floor(Math.random() * 10) + 5;
      currentWildPokemon.hp -= damage;
      alert("You attacked " + currentWildPokemon.name + " for " + damage + " damage!");
      if (currentWildPokemon.hp <= 0) {
        alert("You defeated " + currentWildPokemon.name + "!");
        gameState = "exploration";
      }
    } else if (key === "c") {
      // Attempt to catch the Pokémon (50% chance)
      if (Math.random() > 0.5) {
        alert("Gotcha! You caught " + currentWildPokemon.name + "!");
        playerParty.push(currentWildPokemon);
        gameState = "exploration";
      } else {
        alert(currentWildPokemon.name + " broke free!");
      }
    } else if (key === "r") {
      // Attempt to run away (50% chance)
      if (Math.random() > 0.5) {
        alert("Got away safely!");
        gameState = "exploration";
      } else {
        alert("Couldn't escape!");
      }
    }
  }
});

// Start the game loop
gameLoop();
