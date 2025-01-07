// script.js

// --------------------------------------------------------------------
// Global Variables
// --------------------------------------------------------------------
let players = [];
let currentPlayerIndex = 0;
let rollCount = 1;
let maxRolls = 3;
let totalDice = 5;

let diceValues = Array(totalDice).fill(null);
let diceColors = Array(totalDice).fill(null);
let lockedDice = Array(totalDice).fill(false);

// Track round info
let playersThisRound = 0;        // How many players have gone this round
let someoneScoredThisRound = false;

// Discard pile
let DISCARD_PILE = [];

// Chips config
const CHIPS = [
  { type: "twoPairs",      label: "2 Pairs",        points: 10, remaining: 4 },
  { type: "threeOfAKind",  label: "3 of a Kind",    points: 15, remaining: 4 },
  { type: "smallStraight", label: "Small Straight", points: 20, remaining: 4 },
  { type: "flush",         label: "Flush",          points: 25, remaining: 4 },
  { type: "fullHouse",     label: "Full House",     points: 30, remaining: 4 },
  { type: "fourOfAKind",   label: "4 of a Kind",    points: 35, remaining: 4 },
  { type: "largeStraight", label: "Large Straight", points: 40, remaining: 4 }
];

// --------------------------------------------------------------------
// Player Setup
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
// Rolling Dice & UI
// --------------------------------------------------------------------
function rollDice() {
  for (let i = 0; i < totalDice; i++) {
    if (!lockedDice[i]) {
      const value = Math.floor(Math.random() * 6) + 1;
      diceValues[i] = value;
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

    // Color class
    if (diceColors[i] === "red") {
      die.classList.add("red-die");
    } else {
      die.classList.add("black-die");
    }

    // Show value or "?"
    die.textContent = (diceValues[i] !== null) ? diceValues[i] : "?";

    // Locked?
    if (lockedDice[i]) {
      die.classList.add("locked");
    }

    // Clicking toggles lock (if allowed)
    die.addEventListener("click", () => {
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

// NEW FUNCTION: Update the Discard Pile UI
function updateDiscardList() {
  const discardList = document.getElementById("discardList");
  discardList.innerHTML = "";

  DISCARD_PILE.forEach((chip) => {
    const li = document.createElement("li");
    li.textContent = `${chip.label} (${chip.points} points)`;
    discardList.appendChild(li);
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

// --------------------------------------------------------------------
// Core Chip Logic
// --------------------------------------------------------------------
function discardHighestChip() {
  // Find the highest-point chip in CHIPS with remaining > 0
  let highestChip = null;
  for (let chip of CHIPS) {
    if (chip.remaining > 0) {
      if (!highestChip || chip.points > highestChip.points) {
        highestChip = chip;
      }
    }
  }
  if (highestChip) {
    highestChip.remaining--;
    DISCARD_PILE.push({
      type: highestChip.type,
      label: highestChip.label,
      points: highestChip.points
    });
    alert(`No one scored this round. Discarding the highest chip: ${highestChip.label} (${highestChip.points} pts).`);
    
    // Update Discard Pile UI
    updateDiscardList();
  }
}

// Check if all CHIPS have 0 remaining
function allChipsGone() {
  let sum = 0;
  for (let chip of CHIPS) {
    sum += chip.remaining;
  }
  return sum === 0;
}

// Evaluate dice for possible chips
function evaluateDiceForChips() {
  // Check Yamslam
  const firstValue = diceValues[0];
  const isYamslam = diceValues.every(val => val === firstValue);
  if (isYamslam) {
    return { isYamslam: true, possible: [] };
  }

  // Otherwise check other combos
  const possibleChips = [];
  const freq = {};
  diceValues.forEach(val => {
    freq[val] = (freq[val] || 0) + 1;
  });

  // Flush
  const firstColor = diceColors[0];
  const isFlush = diceColors.every(color => color === firstColor);
  if (isFlush) {
    possibleChips.push("flush");
  }

  // 2 Pairs
  let pairsCount = 0;
  Object.values(freq).forEach(count => {
    if (count >= 2) pairsCount++;
  });
  if (pairsCount >= 2) {
    possibleChips.push("twoPairs");
  }

  // 3 of a Kind
  if (Object.values(freq).some(count => count >= 3)) {
    possibleChips.push("threeOfAKind");
  }

  // 4 of a Kind
  if (Object.values(freq).some(count => count >= 4)) {
    possibleChips.push("fourOfAKind");
  }

  // Full House
  let hasThree = Object.values(freq).some(count => count === 3);
  let hasTwo = Object.values(freq).some(count => count === 2);
  if (hasThree && hasTwo) {
    possibleChips.push("fullHouse");
  }

  // Straights
  const uniqueSorted = [...new Set(diceValues)].sort((a, b) => a - b);
  if (checkConsecutive(uniqueSorted, 4)) {
    possibleChips.push("smallStraight");
  }
  if (checkConsecutive(uniqueSorted, 5)) {
    possibleChips.push("largeStraight");
  }

  return { isYamslam: false, possible: possibleChips };
}

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

// Find the highest chip among both remaining CHIPS and DISCARD_PILE
function findHighestChipAmongAll() {
  let bestChip = null;
  let bestPoints = 0;
  let fromDiscard = false;

  // Check CHIPS
  for (let chip of CHIPS) {
    if (chip.remaining > 0 && chip.points > bestPoints) {
      bestChip = chip;
      bestPoints = chip.points;
      fromDiscard = false;
    }
  }
  // Check DISCARD_PILE
  for (let dChip of DISCARD_PILE) {
    if (dChip.points > bestPoints) {
      bestChip = dChip;
      bestPoints = dChip.points;
      fromDiscard = true;
    }
  }

  return { chip: bestChip, fromDiscard };
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
    const numPlayers = parseInt(playerCountInput.value, 10);
    if (numPlayers <= 0) return;
    setupPlayers(numPlayers);

    // Reset
    currentPlayerIndex = 0;
    rollCount = 1;
    diceValues = Array(totalDice).fill(null);
    diceColors = Array(totalDice).fill(null);
    lockedDice = Array(totalDice).fill(false);

    playersThisRound = 0;
    someoneScoredThisRound = false;
    DISCARD_PILE = [];

    // (Optional) Reset chips if you want a fresh game
    // CHIPS.forEach(ch => ch.remaining = 4);

    document.getElementById("gameContainer").classList.remove("hidden");
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    // Initially, must roll at least once
    confirmRollBtn.disabled = true;

    updateDiceUI();
    updateChipList();
    updateDiscardList(); // Show empty at start
    updateScoreboard();
  });

  rollDiceBtn.addEventListener("click", () => {
    if (rollCount <= maxRolls) {
      rollDice();
      updateDiceUI();
      rollCount++;
      document.getElementById("rollCount").textContent = (rollCount > maxRolls) ? maxRolls : rollCount;

      // Now the user can confirm at any time
      confirmRollBtn.disabled = false;
    }
  });

  confirmRollBtn.addEventListener("click", () => {
    const { isYamslam, possible } = evaluateDiceForChips();

    let claimedChip = null;
    let earnedPoints = 0;

    if (isYamslam) {
      // Yamslam => highest chip among CHIPS + DISCARD_PILE
      let { chip: highestChip, fromDiscard } = findHighestChipAmongAll();
      if (highestChip) {
        // remove from discard or decrement remaining
        if (fromDiscard) {
          let idx = DISCARD_PILE.indexOf(highestChip);
          if (idx !== -1) {
            DISCARD_PILE.splice(idx, 1);
          }
          updateDiscardList();
        } else {
          highestChip.remaining--;
        }
        claimedChip = highestChip;
        earnedPoints = highestChip.points;

        players[currentPlayerIndex].score += earnedPoints;
        players[currentPlayerIndex].chipsTaken.push(highestChip.label);

        alert(
          `${players[currentPlayerIndex].name} rolled a Yamslam! 
           They claim "${highestChip.label}" for ${highestChip.points} points!`
        );
      } else {
        // No chips to take
        alert("No chips left anywhere — 0 points!");
      }
    } else {
      // Normal logic => best possible chip from `possible`
      let bestPoints = 0;
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
        earnedPoints = claimedChip.points;
        alert(`${players[currentPlayerIndex].name} takes "${claimedChip.label}" for ${claimedChip.points} points!`);
      } else {
        alert(`No available chip for this dice combination—0 points this turn.`);
      }
    }

    // Update scoreboard and chip list
    updateScoreboard();
    updateChipList();

    // Did they score?
    if (earnedPoints > 0) {
      someoneScoredThisRound = true;
    }

    // Check if all chips are gone
    if (allChipsGone()) {
      endGame();
      return;
    }

    // Reset for next turn
    rollCount = 1;
    diceValues = Array(totalDice).fill(null);
    diceColors = Array(totalDice).fill(null);
    lockedDice = Array(totalDice).fill(false);
    confirmRollBtn.disabled = true;
    updateDiceUI();

    // If Yamslam => same player goes again
    if (isYamslam) {
      document.getElementById("currentPlayer").textContent = 
        `${players[currentPlayerIndex].name}'s EXTRA TURN (Yamslam)!`;
      document.getElementById("rollCount").textContent = rollCount;
      return; // same player, new turn
    }

    // Otherwise, move to next player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    // Increment how many have gone in this round
    playersThisRound++;
    if (playersThisRound === players.length) {
      // End of round
      if (!someoneScoredThisRound) {
        discardHighestChip();
      }
      // Start a new round
      playersThisRound = 0;
      someoneScoredThisRound = false;
    }
  });
});

// --------------------------------------------------------------------
// End Game
// --------------------------------------------------------------------
function endGame() {
  let winner = players[0];
  for (let p of players) {
    if (p.score > winner.score) {
      winner = p;
    }
  }
  alert(`Game Over! The winner is ${winner.name} with ${winner.score} points!`);
}
