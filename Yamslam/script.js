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

// Keep track of how many players have taken a turn in the current round
// Once this equals players.length, a full round has passed.
let playersThisRound = 0;
// Keep track if someone scored this round
let someoneScoredThisRound = false;

// The discard pile for chips removed from the game
let DISCARD_PILE = [];

// Chips config
// We'll track how many remain in the game. Once remain=0, that chip is effectively gone unless resurrected from discard (in Yamslam).
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
// Setup
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
// Dice Rolling & UI
// --------------------------------------------------------------------
function rollDice() {
  for (let i = 0; i < totalDice; i++) {
    if (!lockedDice[i]) {
      const value = Math.floor(Math.random() * 6) + 1; // 1-6
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

    // Clicking toggles locked state, but only if at least 1 roll has occurred
    // and we have not exceeded maxRolls.
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

// Discard the highest remaining chip (by points) to the discard pile
function discardHighestChip() {
  // Find the chip in CHIPS that has the largest 'points' with remaining > 0
  let highestChip = null;
  for (let chip of CHIPS) {
    if (chip.remaining > 0) {
      if (!highestChip || chip.points > highestChip.points) {
        highestChip = chip;
      }
    }
  }

  // If we found one, remove one from 'remaining' and push it onto discard
  if (highestChip) {
    highestChip.remaining--;
    DISCARD_PILE.push({
      type: highestChip.type,
      label: highestChip.label,
      points: highestChip.points
    });
    alert(`No one scored this round. Discarding the highest chip: ${highestChip.label} (${highestChip.points} pts).`);
  }
}

// Returns true if all CHIPS.remain are 0
function allChipsGone() {
  let sum = 0;
  for (let chip of CHIPS) {
    sum += chip.remaining;
  }
  return sum === 0;
}

// Evaluate dice to see which chips are possible (same as before)
function evaluateDiceForChips() {
  // Check if all dice have the same value => Yamslam
  const firstValue = diceValues[0];
  const isYamslam = diceValues.every(val => val === firstValue);

  if (isYamslam) {
    return { isYamslam: true, possible: [] };
  }

  const possibleChips = [];
  // freq count
  const freq = {};
  diceValues.forEach(val => {
    freq[val] = (freq[val] || 0) + 1;
  });

  // Flush = all dice same color
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

  return { isYamslam: false, possible: possibleChips };
}

// Helper to check consecutive runs
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

// Find the single highest chip among both the CHIPS (where remaining>0) and DISCARD_PILE
function findHighestChipAmongAll() {
  let bestChip = null;
  let bestPoints = 0;
  let fromDiscard = false;

  // 1) Check CHIPS with remain > 0
  for (let chip of CHIPS) {
    if (chip.remaining > 0 && chip.points > bestPoints) {
      bestChip = chip;
      bestPoints = chip.points;
      fromDiscard = false;
    }
  }
  // 2) Check DISCARD_PILE
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

    // Round tracking
    playersThisRound = 0;
    someoneScoredThisRound = false;

    // Discard pile
    DISCARD_PILE = [];

    // Reset chip remain (optional if you want a "fresh" game every time)
    // CHIPS.forEach(ch => ch.remaining = 4);

    document.getElementById("gameContainer").classList.remove("hidden");
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    // Initially, must roll at least once
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
      rollCount++;
      document.getElementById("rollCount").textContent = (rollCount > maxRolls) ? maxRolls : rollCount;

      // Enable confirm so user can stop rolling early
      confirmRollBtn.disabled = false;
    }
  });

  // Confirm and take chip
  confirmRollBtn.addEventListener("click", () => {
    const { isYamslam, possible } = evaluateDiceForChips();

    let claimedChip = null;
    let earnedPoints = 0;

    if (isYamslam) {
      // 1) For Yamslam, find the single highest chip among CHIPS + DISCARD_PILE
      let { chip: highestChip, fromDiscard } = findHighestChipAmongAll();
      if (highestChip) {
        // If fromDiscard = true, remove it from the discard pile
        if (fromDiscard) {
          // remove 1 instance from DISCARD_PILE
          const idx = DISCARD_PILE.indexOf(highestChip);
          if (idx !== -1) {
            DISCARD_PILE.splice(idx, 1);
          }
        } else {
          // Decrement remain in CHIPS
          highestChip.remaining--;
        }
        // Player claims it
        claimedChip = highestChip;
        earnedPoints = highestChip.points;

        players[currentPlayerIndex].score += earnedPoints;
        players[currentPlayerIndex].chipsTaken.push(highestChip.label);

        alert(
          `${players[currentPlayerIndex].name} rolled a Yamslam! They claim the highest chip: ` +
          `"${highestChip.label}" (${highestChip.points} pts).`
        );
      } else {
        // If no chip available at all (should be rare if the game hasn't ended),
        // then it's 0 points.
        alert("No chips left to claim (all gone or discarded) — 0 points!");
      }
    } else {
      // Normal logic: pick the best possible chip from `possible`
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
        // No valid chip => 0 points
        alert(`No available chip for this dice combination—0 points this turn.`);
      }
    }

    // Update scoreboard & chipList
    updateScoreboard();
    updateChipList();

    // If the user earned > 0, they scored
    if (earnedPoints > 0) {
      someoneScoredThisRound = true;
    }

    // Check if all chips are gone => game ends
    if (allChipsGone()) {
      endGame();
      return;
    }

    // Because we confirmed, the turn is over. We reset dice for the next turn.
    rollCount = 1;
    diceValues = Array(totalDice).fill(null);
    diceColors = Array(totalDice).fill(null);
    lockedDice = Array(totalDice).fill(false);
    confirmRollBtn.disabled = true;
    updateDiceUI();

    // SPECIAL CASE: Yamslam => same player goes again
    // so we do NOT increment playersThisRound or currentPlayerIndex.
    // They get a fresh 3 rolls in their extra turn.
    if (isYamslam) {
      document.getElementById("currentPlayer").textContent = 
        `${players[currentPlayerIndex].name}'s EXTRA TURN (Yamslam)!`;
      document.getElementById("rollCount").textContent = rollCount;
      return; // Stop here—same player goes again
    }

    // Otherwise, move to next player
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    document.getElementById("currentPlayer").textContent = 
      `${players[currentPlayerIndex].name}'s Turn!`;
    document.getElementById("rollCount").textContent = rollCount;

    // Increment how many players have gone in this round
    playersThisRound++;

    // If we've reached the end of the round (all players had 1 turn)
    if (playersThisRound === players.length) {
      // Check if no one scored
      if (!someoneScoredThisRound) {
        // Discard highest chip
        discardHighestChip();
        updateChipList();
        // Check if that discard ended the game
        if (allChipsGone()) {
          endGame();
          return;
        }
      }

      // Start a new round
      playersThisRound = 0;
      someoneScoredThisRound = false;
    }
  });
});

// End the game
function endGame() {
  // Tally up final scores
  let winner = players[0];
  for (let p of players) {
    if (p.score > winner.score) {
      winner = p;
    }
  }
  alert(`Game Over! The winner is ${winner.name} with ${winner.score} points!`);

  // Optionally, you can hide or disable game UI here
}
