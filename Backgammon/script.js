// Game Variables
let currentPlayer = 1; // 1 or 2
let diceValues = [0, 0];
let boardState = []; // e.g., an array of 24 points, each containing how many checkers belong to Player1 or Player2
const totalPoints = 24;

// For CPU mode
let gameMode = "pass"; // default pass mode
let isGameActive = false;

window.onload = () => {
    document.getElementById("startGameBtn").addEventListener("click", startGame);
    document.getElementById("rollDiceBtn").addEventListener("click", rollDice);
  };
  
  function startGame() {
    // Get the selected mode
    gameMode = document.getElementById("gameMode").value;
    isGameActive = true;
  
    // Initialize the board, place checkers
    initBoard();
    renderBoard();
  
    // Reset current player
    currentPlayer = 1;
    updatePlayerDisplay();
  }
  
  function rollDice() {
    if (!isGameActive) return;
  
    // Generate dice values (1 - 6)
    diceValues[0] = Math.floor(Math.random() * 6) + 1;
    diceValues[1] = Math.floor(Math.random() * 6) + 1;
  
    // Display dice
    document.getElementById("die1").innerText = diceValues[0];
    document.getElementById("die2").innerText = diceValues[1];
  
    // Now handle possible moves...
    handleMoves(currentPlayer, diceValues);
  }

  function initBoard() {
    boardState = new Array(totalPoints).fill(null).map(() => {
      return { player: 0, count: 0 };
    });
  
    // For player 1 (example layout)
    boardState[23] = { player: 1, count: 2 }; // 24-point
    boardState[12] = { player: 1, count: 5 }; // 13-point
    boardState[7]  = { player: 1, count: 3 }; // 8-point
    boardState[5]  = { player: 1, count: 5 }; // 6-point
  
    // For player 2 (mirrored positions in typical backgammon)
    boardState[0]  = { player: 2, count: 2 };  // 1-point
    boardState[11] = { player: 2, count: 5 };  // 12-point
    boardState[16] = { player: 2, count: 3 };  // 17-point
    boardState[18] = { player: 2, count: 5 };  // 19-point
  }
  function renderBoard() {
    const boardEl = document.getElementById("backgammonBoard");
    boardEl.innerHTML = ""; // clear any existing elements
  
    // We can split the board into two halves (points 0-11, 12-23)
    const leftHalf = document.createElement("div");
    leftHalf.classList.add("board-half");
  
    for (let i = 11; i >= 0; i--) {
      const pointEl = createPointElement(i);
      leftHalf.appendChild(pointEl);
    }
  
    const rightHalf = document.createElement("div");
    rightHalf.classList.add("board-half");
  
    for (let i = 12; i < 24; i++) {
      const pointEl = createPointElement(i);
      rightHalf.appendChild(pointEl);
    }
  
    boardEl.appendChild(leftHalf);
    boardEl.appendChild(rightHalf);
  }
  
  /**
   * Creates a point (triangle) element with checkers inside
   * @param {number} index - the index of the point in boardState
   */
  function createPointElement(index) {
    const point = document.createElement("div");
    point.classList.add("point");
    point.dataset.index = index;
  
    // If there are checkers, create them
    const pointData = boardState[index];
    if (pointData && pointData.count > 0) {
      for (let i = 0; i < pointData.count; i++) {
        const checker = document.createElement("div");
        checker.classList.add("checker");
        checker.classList.add(pointData.player === 1 ? "player1" : "player2");
        checker.innerText = pointData.player === 1 ? "1" : "2";
  
        // Position the checkers (simple vertical stacking)
        checker.style.top = `${i * 45}px`; // Adjust for spacing
        point.appendChild(checker);
      }
    }
  
    // Add event listener to allow moves
    point.addEventListener("click", () => onPointClick(index));
    return point;
  }
  let selectedPointIndex = null;

  function onPointClick(index) {
    if (!isGameActive) return;
  
    // If we haven’t selected a point yet, select it if it’s the current player’s point
    if (selectedPointIndex === null) {
      if (boardState[index].player === currentPlayer && boardState[index].count > 0) {
        selectedPointIndex = index;
      }
    } else {
      // Try to move from selectedPointIndex to the new index
      attemptMove(selectedPointIndex, index);
      selectedPointIndex = null;
    }
  }
  
  function attemptMove(from, to) {
    // Calculate the distance
    const distance = Math.abs(to - from);
  
    // Check if distance matches any of the dice values
    if (!diceValues.includes(distance)) {
      alert("Move not allowed. Distance not matching the dice roll.");
      return;
    }
  
    // Check if movement direction is correct depending on the player
    // e.g., Player 1 moves from high index to low index, Player 2 vice versa in this example
    if (currentPlayer === 1 && to > from) {
      alert("Invalid direction for Player 1.");
      return;
    }
    if (currentPlayer === 2 && to < from) {
      alert("Invalid direction for Player 2.");
      return;
    }
  
    // If valid, move the checker
    if (boardState[from].count > 0) {
      boardState[from].count--;
      // If it’s capturing
      if (boardState[to].player !== currentPlayer && boardState[to].count === 1) {
        // Send the single checker to bar or handle logic
        // For simplicity, just remove it
        boardState[to] = { player: currentPlayer, count: 1 };
      } else if (boardState[to].player === currentPlayer) {
        boardState[to].count++;
      } else {
        // If empty or belongs to the other player with 0 checkers
        boardState[to] = { player: currentPlayer, count: 1 };
      }
  
      // Remove the used dice value
      // If the player rolled, for example, diceValues = [3, 5] and we used 3:
      let usedIndex = diceValues.indexOf(distance);
      if (usedIndex !== -1) {
        diceValues.splice(usedIndex, 1);
        diceValues.push(0); // Or remove it entirely if you don't want leftover dice
      }
  
      // Re-render
      renderBoard();
  
      // If both dice used or no further valid moves, switch player
      if (diceValues[0] === 0 && diceValues[1] === 0) {
        switchPlayer();
      }
    }
  }
  
  function switchPlayer() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updatePlayerDisplay();
  
    if (gameMode === "cpu" && currentPlayer === 2) {
      // CPU's turn
      cpuTurn();
    }
  }
  function cpuTurn() {
    setTimeout(() => {
      // Roll dice for CPU
      rollDice();
  
      // Naive approach: just pick the first possible move
      // This is obviously not a strong AI, but it demonstrates the idea.
      let madeAMove = false;
      for (let i = 0; i < totalPoints; i++) {
        const pointData = boardState[i];
        if (pointData.player === 2 && pointData.count > 0) {
          // Check for possible dice moves
          for (let d = 0; d < diceValues.length; d++) {
            let distance = diceValues[d];
            if (distance > 0) {
              let target = i + distance; // Player 2 moves from low to high in this example
              if (target < totalPoints) {
                attemptMove(i, target);
                madeAMove = true;
                break;
              }
            }
          }
        }
        if (madeAMove) break;
      }
  
      // Switch back to Player 1 if the CPU can’t move or used up the dice
      switchPlayer();
    }, 1000); // CPU reaction delay
  }
  function updatePlayerDisplay() {
    document.getElementById("playerName").innerText = currentPlayer === 1 ? "Player 1" : "Player 2";
  }
            