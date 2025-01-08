document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const cpuPenguin = document.getElementById("cpu-penguin");
  const playerPenguin = document.getElementById("player-penguin");
  const playerHandContainer = document.getElementById("player-hand");
  const roundResult = document.getElementById("round-result");
  const nextRoundBtn = document.getElementById("next-round-btn");

  const cpuWinsDisplay = document.getElementById("cpu-wins-display");
  const playerWinsDisplay = document.getElementById("player-wins-display");

  const cpuPlayedCardSlot = document.getElementById("cpu-played-card");
  const playerPlayedCardSlot = document.getElementById("player-played-card");

  // Track the Rounds each side has won (store { type, color })
  let cpuWins = [];
  let playerWins = [];

  // Keep track of player's hand (5 cards). We'll store them globally.
  let playerHand = [];

  // For controlling clicks during a round
  let roundActive = false;

  // 1. Generate the deck
  function generateDeck() {
    const types = ["Fire", "Water", "Snow"];
    const colors = ["Red", "Blue", "Green"];
    const deck = [];

    // 3 types x 3 colors x 5 numbers = 45 cards
    for (let type of types) {
      for (let color of colors) {
        for (let num = 1; num <= 5; num++) {
          deck.push({ 
            type: type, 
            color: color, 
            number: num 
          });
        }
      }
    }
    return deck;
  }

  const deck = generateDeck();

  // 2. Initialize the game: player's initial 5 cards
  function initGame() {
    playerHand = drawMultipleCards(5);
    renderPlayerHand();

    roundResult.textContent = "Choose a card to begin!";
    nextRoundBtn.style.display = "none";
    roundActive = true;
  }

  // Draw multiple cards from the deck
  function drawMultipleCards(amount) {
    const drawn = [];
    for (let i = 0; i < amount; i++) {
      drawn.push(drawOneCard());
    }
    return drawn;
  }

  // Draw a single random card from the deck
  function drawOneCard() {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck[randomIndex];
  }

  // Render player's hand
  function renderPlayerHand() {
    playerHandContainer.innerHTML = "";

    playerHand.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";

      // Border color
      cardDiv.style.borderColor = getColorCode(card.color);

      // Background image based on type
      cardDiv.style.backgroundImage = `url('assets/${card.type.toLowerCase()}.png')`;

      // Card number in bottom-right
      const numberDiv = document.createElement("div");
      numberDiv.className = "card-number";
      numberDiv.textContent = card.number;
      cardDiv.appendChild(numberDiv);

      // Click -> Play round
      cardDiv.addEventListener("click", () => {
        if (roundActive) {
          roundActive = false;
          playRound(index);
        }
      });

      playerHandContainer.appendChild(cardDiv);
    });
  }

  // Map "Red"/"Blue"/"Green" to real colors
  function getColorCode(colorName) {
    switch (colorName) {
      case "Red": return "red";
      case "Blue": return "blue";
      case "Green": return "green";
      default: return "black";
    }
  }

  // Play a round
  function playRound(playerCardIndex) {
    // Player's chosen card
    const playerCard = playerHand[playerCardIndex];

    // CPU picks a random card
    const cpuCard = drawOneCard();

    // Show them in the center
    showPlayedCards(cpuCard, playerCard);

    // Determine winner
    const winner = determineRoundWinner(cpuCard, playerCard);
    let resultText = `CPU played ${cpuCard.type} ${cpuCard.number}. 
                      You played ${playerCard.type} ${playerCard.number}. `;

    if (winner === "CPU") {
      cpuWins.push({ type: cpuCard.type, color: cpuCard.color });
      updateWinsDisplay(cpuWinsDisplay, cpuWins);
      resultText += "CPU wins this round!";
    } else if (winner === "Player") {
      playerWins.push({ type: playerCard.type, color: playerCard.color });
      updateWinsDisplay(playerWinsDisplay, playerWins);
      resultText += "You win this round!";
    } else {
      resultText += "It's a tie!";
    }

    roundResult.textContent = resultText;

    // Check if CPU or Player has achieved overall victory
    if (checkForGameWin(cpuWins)) {
      roundResult.textContent = "CPU has achieved victory!";
      endGame();
      return;
    } else if (checkForGameWin(playerWins)) {
      roundResult.textContent = "You have achieved victory!";
      endGame();
      return;
    }

    // Remove used card from player's hand
    playerHand.splice(playerCardIndex, 1);

    // Draw a new card (so player stays at 5)
    playerHand.push(drawOneCard());

    // Show "Next Round" button after a short delay
    setTimeout(() => {
      nextRoundBtn.style.display = "inline-block";
    }, 1000);
  }

  // Display the CPU's and player's chosen cards in center
  function showPlayedCards(cpuCard, playerCard) {
    // Clear previous played cards
    cpuPlayedCardSlot.innerHTML = "";
    playerPlayedCardSlot.innerHTML = "";

    // CPU card
    const cpuCardDiv = document.createElement("div");
    cpuCardDiv.className = "card";
    cpuCardDiv.style.borderColor = getColorCode(cpuCard.color);
    cpuCardDiv.style.backgroundImage = `url('assets/${cpuCard.type.toLowerCase()}.png')`;
    const cpuNum = document.createElement("div");
    cpuNum.className = "card-number";
    cpuNum.textContent = cpuCard.number;
    cpuCardDiv.appendChild(cpuNum);
    cpuPlayedCardSlot.appendChild(cpuCardDiv);

    // Player card
    const playerCardDiv = document.createElement("div");
    playerCardDiv.className = "card";
    playerCardDiv.style.borderColor = getColorCode(playerCard.color);
    playerCardDiv.style.backgroundImage = `url('assets/${playerCard.type.toLowerCase()}.png')`;
    const playerNum = document.createElement("div");
    playerNum.className = "card-number";
    playerNum.textContent = playerCard.number;
    playerCardDiv.appendChild(playerNum);
    playerPlayedCardSlot.appendChild(playerCardDiv);
  }

  // Card-Jitsu rules (Fire > Snow, Snow > Water, Water > Fire)
  function determineRoundWinner(cpuCard, playerCard) {
    // If same type, compare numbers
    if (cpuCard.type === playerCard.type) {
      if (cpuCard.number > playerCard.number) return "CPU";
      if (cpuCard.number < playerCard.number) return "Player";
      return "Tie";
    }

    // Fire > Snow, Snow > Water, Water > Fire
    if (cpuCard.type === "Fire" && playerCard.type === "Snow") return "CPU";
    if (cpuCard.type === "Snow" && playerCard.type === "Fire") return "Player";

    if (cpuCard.type === "Snow" && playerCard.type === "Water") return "CPU";
    if (cpuCard.type === "Water" && playerCard.type === "Snow") return "Player";

    if (cpuCard.type === "Water" && playerCard.type === "Fire") return "CPU";
    if (cpuCard.type === "Fire" && playerCard.type === "Water") return "Player";
  }

  // Check for 3 distinct types OR 3 distinct colors of the same type
  function checkForGameWin(winsArray) {
    if (winsArray.length < 3) return false;

    // Check for 3 distinct types
    const uniqueTypes = new Set(winsArray.map(win => win.type));
    if (uniqueTypes.size >= 3) {
      return true;
    }

    // Check for same type but 3 distinct colors
    const typeColorMap = {};
    for (let w of winsArray) {
      if (!typeColorMap[w.type]) {
        typeColorMap[w.type] = new Set();
      }
      typeColorMap[w.type].add(w.color);
    }
    for (let t in typeColorMap) {
      if (typeColorMap[t].size >= 3) {
        return true;
      }
    }
    return false;
  }

  // UPDATED: Display wins as small squares grouped by type
  function updateWinsDisplay(container, winsArray) {
    // Clear old content
    container.innerHTML = "";

    // Group wins by type
    const types = ["Fire", "Water", "Snow"];
    const typeMap = {
      Fire: [],
      Water: [],
      Snow: [],
    };

    // Populate typeMap with the colors of each win
    for (let w of winsArray) {
      typeMap[w.type].push(w.color);
    }

    // For each type in order, create a column if that type has any wins
    types.forEach((type) => {
      const colorsWon = typeMap[type];
      if (colorsWon.length > 0) {
        // Create a vertical column for this element type
        const typeColumn = document.createElement("div");
        typeColumn.classList.add("type-column");

        // For each color in this type, create a win-square
        colorsWon.forEach((color) => {
          const winSquare = document.createElement("div");
          winSquare.classList.add("win-square");
          // Make square the color of the card
          winSquare.style.backgroundColor = getColorCode(color);
          // Set the PNG in the center
          winSquare.style.backgroundImage = `url('assets/${type.toLowerCase()}.png')`;
          typeColumn.appendChild(winSquare);
        });

        // Add this type column to the corner tracker container
        container.appendChild(typeColumn);
      }
    });
  }

  // Next round -> re-render hand, let the player choose again
  nextRoundBtn.addEventListener("click", () => {
    nextRoundBtn.style.display = "none";

    // Clear center slots
    cpuPlayedCardSlot.innerHTML = "";
    playerPlayedCardSlot.innerHTML = "";

    // Re-draw player's hand
    renderPlayerHand();

    roundResult.textContent = "Pick a card for the next round!";
    roundActive = true;
  });

  // End game
  function endGame() {
    nextRoundBtn.style.display = "none";
    roundActive = false;
    // Optionally show "Play Again" or reload the page
  }

  // Initialize on page load
  initGame();
});
