// script.js
// --------------------------------------------------------------------
// Global Variables
// --------------------------------------------------------------------
let players = [];
let currentPlayerIndex = 0;
let rollCount = 1;
let maxRolls = 3;
let totalDice = 5;

// We’ll track the face value of each die and its color:
let diceValues = Array(totalDice).fill(null);   // e.g. [1, 4, 3, 6, 2]
let diceColors = Array(totalDice).fill(null);   // e.g. ['black','red','black','red','red']
let lockedDice = Array(totalDice).fill(false);

// Keep track of consecutive 0-point rounds
let consecutiveNoPointsRounds = 0;

// Chips config
const CHIPS = [
  { type: "twoPairs", label: "2 Pairs", points: 5, remaining: 4 },
  { type: "threeOfAKind", label: "3 of a Kind", points: 10, remaining: 4 },
  { type: "smallStraight", label: "Small Straight", points: 20, remaining: 4 },
  { type: "flush", label: "Flush", points: 25, remaining: 4 },
  { type: "fullHouse", label: "Full House", points: 30, remaining: 4 },
  { type: "fourOfAKind", label: "4 of a Kind", points: 40, remaining: 4 },
  { type: "largeStraight", label: "Large Straight", points: 50, remaining: 4 }
];

// --------------------------------------------------------------------
// Setup Players
// --------------------------------------------------------------------
function setupPlayers(num) {
  players = [];
  for (let i = 0; i < num; i++) {
    players.push({
      name: `Player ${i + 1}`,
      score: 0,
      chipsTaken: []
    });
  }
}

// --------------------------------------------------------------------
// Helper Functions
// --------------------------------------------------------------------
function rollDice() {
  // Roll only the dice that are not locked
  for (let i = 0; i < totalDice; i++) {
    if (!lockedDice[i]) {
      const value = Math.floor(Math.random() * 6) + 1;  // 1-6
      diceValues[i] = value;
      // Determine color: even -> red, odd -> black
      diceColors[i] = (value % 2 === 0) ? "red" : "black";
    }
  }
}

function updateDiceUI() {
  const diceContainer = document.getElementById("diceContainer");
  diceContainer.innerHTML = "";

  for (let i = 0; i < totalDice; i++) {
    const die = document.createElement("div");
    die.classList.add("die");
    
    // Add color class
    if (diceColors[i] === "red") {
      die.classList.add("red-die");
    } else {
      die.classList.add("black-die");
    }
    
    // Show the die face value
    die.textContent = diceValues[i] !== null ? diceValues[i] : "?";

    // If this die is locked
    if (lockedDice[i]) {
      die.classList.add("locked");
    }

    // Click listener for locking/unlocking dice
    die.addEventListener("click", () => {
      // Only allow locking if we haven't exceeded maxRolls
      // and if we have already rolled at least once
      if (rollCount <= maxRolls && rollCount > 1) {
        lockedDice[i] = !lockedDice[i];
        updateDiceUI();
      }
    });

    diceContainer.appendChild(die);
  }
}

function updateChipList() {
  const chipList = document.getElementById("chipList");
  chipList.innerHTML = "";
  CHIPS.forEach((chip) => {
    const li = document.createElement("li");
    li.textContent = `${chip.label} (${chip.points} points) - Remaining: ${chip.remaining}`;
    chipList.appendChild(li);
  });
}

function updateScoreboard() {
  const scoreTableBody = document.getElementById("scoreTableBody");
  scoreTableBody.innerHTML = "";

  players.forEach((player) => {
    const row = document.createElement("tr");
    
    const nameCell = document.createElement("td");
    nameCell.textContent = player.name;
    row.appendChild(nameCell);

    const scoreCell = document.createElement("td");
    scoreCell.textContent = player.score;
    row.appendChild(scoreCell);

    const chipsCell = document.createElement("td");
    chipsCell.textContent = player.chipsTaken.join(", ");
    row.appendChild(chipsCell);

    scoreTableBody.appendChild(row);
  });
}

// Evaluate dice to see which chips are possible
function evaluateDiceForChips() {
  // 1) Check if we have yamslam (all 5 dice have same face)
  const firstValue = diceValues[0];
  const isYamslam = diceValues.every(val => val === firstValue);

  // If yamslam, return a special indicator
  if (isYamslam) {
    return { isYamslam: true, possible: [] };
  }

  // 2) Otherwise, gather possible chips
  const possibleChips = [];

  // Get frequency of each face value
  const freq = {};
  diceValues.forEach(val => {
    freq[val] = (freq[val] || 0) + 1;
  });

  // Check flush = all dice same color
  const firstColor = diceColors[0];
  const isFlush = diceColors.every(color => color === firstColor);
  if (isFlush) {
    possibleChips.push("flush");
  }

  // Check 2 Pairs:
  let pairsCount = 0;
  Object.values(freq).forEach(count => {
    if (count >= 2) pairsCount++;
  });
  if (pairsCount >= 2) {
    possibleChips.push("twoPairs");
  }

  // Check 3 of a Kind:
  if (Object.values(freq).some(count => count >= 3)) {
    possibleChips.push("threeOfAKind");
  }

  // Check 4 of a Kind:
  if (Object.values(freq).some(count => count >= 4)) {
    possibleChips.push("fourOfAKind");
  }

  // Check Full House (3 of a kind + 2 of a kind)
  let hasThree = Object.values(freq).some(count => count === 3);
  let hasTwo = Object.values(freq).some(count => count === 2);
  if (hasThree && hasTwo) {
    possibleChips.push("fullHouse");
  }

  // Check for straights
  const uniqueSorted = [...new Set(diceValues)].sort((a, b) => a - b);
  if (checkConsecutive(uniqueSorted, 4)) {
    possibleChips.push("smallStraight");
  }
  if (checkConsecutive(uniqueSorted, 5)) {
    possibleChips.push("largeStraight");
  }

  return { isYamslam: false, possible: possibleChips };
}

// Helper to see if there's a run of n consecutive numbers
function checkConsecutive(arr, n) {
  for (let i = 0; i <= arr.length - n; i++) {
    let isConsecutive = true;
    for (let j = 1; j < n; j++) {
      if (arr[i + j] !== arr[i] + j) {
        isConsecutive = false;
        break;
      }
    }
    if (isConsecutive) return true;
  }
  return false;
}

// Check if all chips are gone
function allChipsGone() {
  return CHIPS.reduce((acc, chip) => acc + chip.remaining, 0) === 0;
}

// End the game: find winner, alert
function endGame() {
  let winner = players[0];
  for (const player of players) {
    if (player.score > winner.score) {
      winner = player;
    }
  }
  alert(`Game Over! The winner is ${winner.name} with ${winner.score} points!`);
}

// --------------------------------------------------------------------
// Main Game Flow
// --------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
    const startGameBtn = document.getElementById("startGameBtn");
    const rollDiceBtn = document.getElementById("rollDiceBtn");
    const confirmRollBtn = document.getElementById("confirmRollBtn");
    const playerCountInput = document.getElementById("playerCount");
  
    startGameBtn.addEventListener("click", () => {
      // Set up players
      const numPlayers = parseInt(playerCountInput.value, 10);
      if (numPlayers <= 0) return;
      setupPlayers(numPlayers);
  
      // Reset game variables
      currentPlayerIndex = 0;
      rollCount = 1;
      diceValues = Array(totalDice).fill(null);
      diceColors = Array(totalDice).fill(null);
      lockedDice = Array(totalDice).fill(false);
      consecutiveNoPointsRounds = 0;
  
      // Show the game container
      document.getElementById("gameContainer").classList.remove("hidden");
      document.getElementById("currentPlayer").textContent = 
        `${players[currentPlayerIndex].name}'s Turn!`;
      document.getElementById("rollCount").textContent = rollCount;
  
      // Initially disable confirm since no dice have been rolled yet
      confirmRollBtn.disabled = true;
  
      updateDiceUI();
      updateChipList();
      updateScoreboard();
    });
  
    // Rolling the dice
    rollDiceBtn.addEventListener("click", () => {
      if (rollCount <= maxRolls) {
        rollDice();
        updateDiceUI();
  
        // After each roll, increment rollCount
        rollCount++;
        document.getElementById("rollCount").textContent = 
          rollCount > maxRolls ? maxRolls : rollCount;
  
        // **Enable confirm** so the user can stop rolling and take a chip if they want
        confirmRollBtn.disabled = false;
      }
    });
  
    // Confirm and take chip
    confirmRollBtn.addEventListener("click", () => {
      // Evaluate the dice
      const { isYamslam, possible } = evaluateDiceForChips();
  
      let claimedChip = null;
      let bestPoints = 0;
  
      if (isYamslam) {
        // Yamslam logic: can choose any chip (we choose highest available by default)
        CHIPS.forEach(chip => {
          if (chip.remaining > 0 && chip.points > bestPoints) {
            claimedChip = chip;
            bestPoints = chip.points;
          }
        });
  
        if (claimedChip) {
          claimedChip.remaining--;
          players[currentPlayerIndex].score += claimedChip.points;
          players[currentPlayerIndex].chipsTaken.push(claimedChip.label);
          alert(
            `${players[currentPlayerIndex].name} rolled a Yamslam! ` +
            `They choose "${claimedChip.label}" for ${claimedChip.points} points!`
          );
        } else {
          alert("All chips are gone—no chip to take, so 0 points!");
        }
      } else {
        // Normal logic: pick the best chip from the possible ones
        possible.forEach(chipType => {
          const chipObj = CHIPS.find(ch => ch.type === chipType && ch.remaining > 0);
          if (chipObj && chipObj.points > bestPoints) {
            claimedChip = chipObj;
            bestPoints = chipObj.points;
          }
        });
  
        if (claimedChip) {
          claimedChip.remaining--;
          players[currentPlayerIndex].score += claimedChip.points;
          players[currentPlayerIndex].chipsTaken.push(claimedChip.label);
          alert(`${players[currentPlayerIndex].name} takes "${claimedChip.label}" for ${claimedChip.points} points!`);
        } else {
          // No valid chip => 0 points
          alert(`No available chip for this dice combination—0 points this round.`);
        }
      }
  
      // Determine how many points the player earned
      let earnedPointsThisRound = claimedChip ? claimedChip.points : 0;
      if (isYamslam && claimedChip) {
        earnedPointsThisRound = claimedChip.points;
      }
  
      // Track consecutive no-point rounds
      if (earnedPointsThisRound === 0) {
        consecutiveNoPointsRounds++;
      } else {
        consecutiveNoPointsRounds = 0;
      }
  
      // Update UI
      updateScoreboard();
      updateChipList();
  
      // Check end-game conditions
      if (allChipsGone() || consecutiveNoPointsRounds >= players.length) {
        endGame();
        return;
      }
  
      // Move to next player
      currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
      rollCount = 1;
      diceValues = Array(totalDice).fill(null);
      diceColors = Array(totalDice).fill(null);
      lockedDice = Array(totalDice).fill(false);
  
      document.getElementById("currentPlayer").textContent = 
        `${players[currentPlayerIndex].name}'s Turn!`;
      document.getElementById("rollCount").textContent = rollCount;
  
      // Disable confirm until the new player rolls at least once
      confirmRollBtn.disabled = true;
  
      updateDiceUI();
    });
  });