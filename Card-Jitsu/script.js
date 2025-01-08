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

  // Track the Rounds each side has won (store the { type, color })
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

  // 2. Shuffle deck helper (optional, or just random picks each time)
  // Here we’ll just pick random from the deck if needed.

  // 3. Initial setup: create player's first 5 cards & show them
  function initGame() {
    // CPU/Player can “walk in” if you’d like, or remove that logic if not needed
    // Let's just deal the player's initial 5 cards:
    playerHand = drawMultipleCards(5);
    renderPlayerHand();

    roundResult.textContent = "Choose a card to begin!";
    nextRoundBtn.style.display = "none";
    roundActive = true;
  }

  // Draw multiple cards from deck at random
  function drawMultipleCards(amount) {
    const drawn = [];
    for (let i = 0; i < amount; i++) {
      drawn.push(drawOneCard());
    }
    return drawn;
  }

  // Draw a single random card from deck
  function drawOneCard() {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck[randomIndex];
  }

  // 4. Render player's hand
  function renderPlayerHand() {
    playerHandContainer.innerHTML = "";

    playerHand.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";

      // Set the border color
      cardDiv.style.borderColor = getColorCode(card.color);

      // Set background image based on type
      cardDiv.style.backgroundImage = `url('assets/${card.type.toLowerCase()}.png')`;

      // Display the number
      const numberDiv = document.createElement("div");
      numberDiv.className = "card-number";
      numberDiv.textContent = card.number;
      cardDiv.appendChild(numberDiv);

      // On click, play round with this card
      cardDiv.addEventListener("click", () => {
        if (roundActive) {
          roundActive = false;
          playRound(index); // pass the index of the chosen card
        }
      });

      playerHandContainer.appendChild(cardDiv);
    });
  }

  // Utility to translate color strings to actual CSS color codes
  function getColorCode(colorName) {
    switch (colorName) {
      case "Red": return "red";
      case "Blue": return "blue";
      case "Green": return "green";
      default: return "black";
    }
  }

  // 5. Play a round (player picks a card from their hand)
  function playRound(playerCardIndex) {
    // Get the chosen card from player's hand
    const playerCard = playerHand[playerCardIndex];

    // CPU picks a random card from the deck
    const cpuCard = drawOneCard();

    // Display these cards in the center
    showPlayedCards(cpuCard, playerCard);

    // Determine round winner
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

    // Check if game is won
    if (checkForGameWin(cpuWins)) {
      roundResult.textContent = "CPU has achieved victory!";
      endGame();
      return;
    } else if (checkForGameWin(playerWins)) {
      roundResult.textContent = "You have achieved victory!";
      endGame();
      return;
    }

    // Remove the used card from the player's hand
    playerHand.splice(playerCardIndex, 1);

    // Draw a new card for the player to maintain 5 cards total
    const newCard = drawOneCard();
    playerHand.push(newCard);

    // Wait a moment, then show "Next Round" button
    setTimeout(() => {
      nextRoundBtn.style.display = "inline-block";
    }, 1000);
  }

  // Show the CPU card in the left slot, the Player card in the right slot
  function showPlayedCards(cpuCard, playerCard) {
    // Clear any previous played cards
    cpuPlayedCardSlot.innerHTML = "";
    playerPlayedCardSlot.innerHTML = "";

    // CPU's card
    const cpuCardDiv = document.createElement("div");
    cpuCardDiv.className = "card";
    cpuCardDiv.style.borderColor = getColorCode(cpuCard.color);
    cpuCardDiv.style.backgroundImage = `url('assets/${cpuCard.type.toLowerCase()}.png')`;
    const cpuNum = document.createElement("div");
    cpuNum.className = "card-number";
    cpuNum.textContent = cpuCard.number;
    cpuCardDiv.appendChild(cpuNum);
    cpuPlayedCardSlot.appendChild(cpuCardDiv);

    // Player's card
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

  // Round outcome based on Card-Jitsu rules (Fire > Snow, Snow > Water, Water > Fire)
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

  // 6. Check if a player has 3 distinct types OR 3 distinct colors of the same type
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

  // 7. Update the visual display of wins (top corners)
  function updateWinsDisplay(container, winsArray) {
    container.innerHTML = "";

    // Example: show small text "F-R" for Fire-Red, etc.
    winsArray.forEach((win) => {
      const winDiv = document.createElement("div");
      winDiv.style.margin = "0 5px";
      winDiv.textContent = `${win.type[0]}-${win.color[0]}`;
      container.appendChild(winDiv);
    });
  }

  // 8. Next round button -> re-render the player's hand and prompt
  nextRoundBtn.addEventListener("click", () => {
    // Hide the button
    nextRoundBtn.style.display = "none";

    // Clear center slots from last round
    cpuPlayedCardSlot.innerHTML = "";
    playerPlayedCardSlot.innerHTML = "";

    // Re-draw player's hand with updated cards
    renderPlayerHand();

    // Let the player pick again
    roundResult.textContent = "Pick a card for the next round!";
    roundActive = true;
  });

  // 9. End game (disable interactions, show final message)
  function endGame() {
    nextRoundBtn.style.display = "none";
    roundActive = false;
    // Optionally, show a "Play Again" button or reload the page.
  }

  // Initialize the game on page load
  initGame();
});
