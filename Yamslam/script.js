/*********************************
 * script.js
 *********************************/

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

// Round tracking
let playersThisRound = 0;           
let someoneScoredThisRound = false; 

// Discard pile
let DISCARD_PILE = [];

// Track who took the last chip (for the Last Draw bonus). If the game
// ends via discard, this remains null, so no one gets the Last Draw.
let lastDrawPlayer = null;

// Constants for bonus points
const GOLDEN_7_BONUS = 50;
const SILVER_6_BONUS = 20; // only if not Golden 7
const FULL_STACK_BONUS = 30; 
const LAST_DRAW_BONUS = 20;

// Chips config
// 7 types total
const CHIPS = [
  { type: "twoPairs",      label: "2 Pairs",        points: 5, remaining: 4 },
  { type: "threeOfAKind",  label: "3 of a Kind",    points: 10, remaining: 4 },
  { type: "smallStraight", label: "Small Straight", points: 20, remaining: 4 },
  { type: "flush",         label: "Flush",          points: 25, remaining: 4 },
  { type: "fullHouse",     label: "Full House",     points: 30, remaining: 4 },
  { type: "fourOfAKind",   label: "4 of a Kind",    points: 40, remaining: 4 },
  { type: "largeStraight", label: "Large Straight", points: 50, remaining: 4 }
];

// A helper map so we can convert from label -> type if needed
// (since players only store 'label' in their chipsTaken[]).
const labelToType = {
  "2 Pairs":        "twoPairs",
  "3 of a Kind":    "threeOfAKind",
  "Small Straight": "smallStraight",
  "Flush":          "flush",
  "Full House":     "fullHouse",
  "4 of a Kind":    "fourOfAKind",
  "Large Straight": "largeStraight"
};

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
// Dice Roll Logic & UI
// --------------------------------------------------------------------
function rollDice() {
  for (let i = 0; i < totalDice; i++) {
    if (!lockedDice[i]) {
      const value = Math.floor(Math.random() * 6) + 1; // 1..6
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

    // Red or black
    if (diceColors[i] === "red") {
      die.classList.add("red-die");
    } else {
      die.classList.add("black-die");
    }

    die.textContent = (diceValues[i] !== null) ? diceValues[i] : "?";

    if (lockedDice[i]) {
      die.classList.add("locked");
    }

    // Toggling lock
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

// Update the Discard Pile UI
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
// Chip & Round Logic
// --------------------------------------------------------------------
function discardHighestChip() {
  // Find highest chip with remaining > 0
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
    
    updateChipList();
    updateDiscardList();
  }
}

function allChipsGone() {
  return CHIPS.reduce((sum, chip) => sum + chip.remaining, 0) === 0;
}

// Evaluate dice combos
function evaluateDiceForChips() {
  // Check for Yamslam
  const firstValue = diceValues[0];
  const isYamslam = diceValues.every(val => val === firstValue);
  if (isYamslam) {
    return { isYamslam: true, possible: [] };
  }

  const freq = {};
  diceValues.forEach(val => {
    freq[val] = (freq[val] || 0) + 1;
  });

  const possibleChips = [];

  // Flush
  const firstColor = diceColors[0];
  const isFlush = diceColors.every(c => c === firstColor);
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

  // Full House (3 + 2)
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

  return { isYamslam, possible: possibleChips };
}

// Check if there's a run of 'n' consecutive numbers
function checkConsecutive(arr, n) {
  for (let i = 0; i <= arr.length - n; i++) {
    let consecutive = true;
    for (let j = 1; j < n; j++) {
      if (arr[i + j] !== arr[i] + j) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }
  return false;
}

// Yamslam logic: find highest chip in discard pile *first*; else from CHIPS
function findHighestChipDiscardFirst() {
  let bestChip = null;
  let bestPoints = 0;
  let fromDiscard = false;

  // 1) Discard pile
  for (let dChip of DISCARD_PILE) {
    if (dChip.points > bestPoints) {
      bestPoints = dChip.points;
      bestChip = dChip;
      fromDiscard = true;
    }
  }
  // 2) If none found, check CHIPS
  if (!bestChip) {
    for (let chip of CHIPS) {
      if (chip.remaining > 0 && chip.points > bestPoints) {
        bestPoints = chip.points;
        bestChip = chip;
        fromDiscard = false;
      }
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
    // Setup players
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
    lastDrawPlayer = null;

    // (Optional) Reset chips for new game
    // CHIPS.forEach(ch => ch.remaining = 4);

    document.getElementById("gameContainer").classList.remove("hidden");
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    confirmRollBtn.disabled = true;

    updateDiceUI();
    updateChipList();
    updateDiscardList();
    updateScoreboard();
  });

  rollDiceBtn.addEventListener("click", () => {
    if (rollCount <= maxRolls) {
      rollDice();
      updateDiceUI();
      rollCount++;
      document.getElementById("rollCount").textContent = (rollCount > maxRolls) ? maxRolls : rollCount;

      // Can confirm after first roll
      confirmRollBtn.disabled = false;
    }
  });

  confirmRollBtn.addEventListener("click", () => {
    const { isYamslam, possible } = evaluateDiceForChips();

    let claimedChip = null;
    let earnedPoints = 0;

    if (isYamslam) {
      // Yamslam => discard first, then CHIPS
      const { chip: highestChip, fromDiscard } = findHighestChipDiscardFirst();
      if (highestChip) {
        if (fromDiscard) {
          // remove from discard
          const idx = DISCARD_PILE.indexOf(highestChip);
          if (idx !== -1) {
            DISCARD_PILE.splice(idx, 1);
          }
          updateDiscardList();
        } else {
          // remove from CHIPS.remaining
          highestChip.remaining--;
          updateChipList();
        }

        claimedChip = highestChip;
        earnedPoints = highestChip.points;
        players[currentPlayerIndex].score += earnedPoints;
        players[currentPlayerIndex].chipsTaken.push(highestChip.label);

        alert(
          `${players[currentPlayerIndex].name} rolled a Yamslam! 
           They take "${highestChip.label}" for ${highestChip.points} points!`
        );
      } else {
        alert("No chips remain anywhere — 0 points this turn!");
      }
    } else {
      // Normal logic => best possible chip from "possible"
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
        updateChipList();
      } else {
        alert(`No available chip for this dice combination—0 points this turn.`);
      }
    }

    updateScoreboard();

    if (earnedPoints > 0) {
      someoneScoredThisRound = true;
    }

    // Check if all chips are gone => then that means this player took the last chip
    if (allChipsGone()) {
      // This was triggered by a player claiming a chip, so they're the last-draw player
      lastDrawPlayer = players[currentPlayerIndex];
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
      return;
    }

    // Otherwise, move to next player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    // End of a player's turn => increment count
    playersThisRound++;

    // If a full round passed
    if (playersThisRound === players.length) {
      if (!someoneScoredThisRound) {
        // discard top chip
        discardHighestChip();

        // If discarding that chip ended the game
        if (allChipsGone()) {
          // No one took it => no Last Draw bonus
          lastDrawPlayer = null; 
          endGame();
          return;
        }
      }
      // Reset round tracking
      playersThisRound = 0;
      someoneScoredThisRound = false;
    }
  });
});

// --------------------------------------------------------------------
// End Game + Bonus Logic
// --------------------------------------------------------------------
function endGame() {
  // Award end-of-game bonuses
  awardBonuses();

  // Now find the highest scoring player
  let winner = players[0];
  for (let p of players) {
    if (p.score > winner.score) {
      winner = p;
    }
  }

  alert(`Game Over! The winner is ${winner.name} with ${winner.score} points!`);
}

// --------------------------------------------------------------------
// Bonus Logic
// --------------------------------------------------------------------
function awardBonuses() {
  // For each player:
  // 1) Count how many distinct chip TYPES they've taken
  // 2) Check if they have all 4 of any type => Full Stack
  // 3) Check Golden 7 or Silver 6
  // 4) Check if they are lastDrawPlayer => Last Draw

  players.forEach((player) => {
    // Frequency of each chip TYPE the player has
    const typeFreq = {};

    player.chipsTaken.forEach((label) => {
      const t = labelToType[label]; 
      if (!typeFreq[t]) {
        typeFreq[t] = 0;
      }
      typeFreq[t]++;
    });

    const uniqueTypes = Object.keys(typeFreq).length;
    let bonusPoints = 0;

    // (A) Check Golden 7 vs Silver 6
    if (uniqueTypes === 7) {
      // All 7 types
      bonusPoints += GOLDEN_7_BONUS;
    } else if (uniqueTypes === 6) {
      // 6 distinct types (only if not Golden 7)
      bonusPoints += SILVER_6_BONUS;
    }

    // (B) Check Full Stack: any type with freq = 4
    for (let chipType in typeFreq) {
      if (typeFreq[chipType] === 4) {
        // This player collected all 4 of that chip
        bonusPoints += FULL_STACK_BONUS;
      }
    }

    // (C) Check Last Draw
    if (lastDrawPlayer && lastDrawPlayer.name === player.name) {
      bonusPoints += LAST_DRAW_BONUS;
    }

    // Add bonus to the player's final score
    player.score += bonusPoints;
  });

  // Update scoreboard one last time, so it reflects bonus additions
  updateScoreboard();
}
