document.addEventListener("DOMContentLoaded", () => {
  // DOM references
  const cpuHandContainer = document.getElementById("cpu-hand");
  const playerHandContainer = document.getElementById("player-hand");
  const cpuSelectedSlot = document.getElementById("cpu-selected-slot");
  const playerSelectedSlot = document.getElementById("player-selected-slot");

  const cpuWinsDisplay = document.getElementById("cpu-wins-display");
  const playerWinsDisplay = document.getElementById("player-wins-display");

  const roundResult = document.getElementById("round-result");
  const nextRoundBtn = document.getElementById("next-round-btn");

  // CPU & Player "win" data
  let cpuWins = [];
  let playerWins = [];

  // CPU & Player hands
  let cpuHand = [];
  let playerHand = [];

  // For controlling the flow (prevent multiple clicks during animation)
  let roundActive = false;

  // Generate deck
  function generateDeck() {
    const types = ["Fire", "Water", "Snow"];
    const colors = ["Red", "Blue", "Green"];
    const deck = [];
    for (let type of types) {
      for (let color of colors) {
        for (let num = 1; num <= 5; num++) {
          deck.push({
            type,
            color,
            number: num
          });
        }
      }
    }
    return deck;
  }

  const fullDeck = generateDeck();

  // Shuffle or random pick helper
  function drawOneCard() {
    const idx = Math.floor(Math.random() * fullDeck.length);
    return fullDeck[idx];
  }

  // Initialize the game
  function initGame() {
    // Let's give each side 5 random cards
    cpuHand = drawMultipleCards(5);
    playerHand = drawMultipleCards(5);

    renderCPUHand();
    renderPlayerHand();

    roundActive = true;
    nextRoundBtn.style.display = "none";
    roundResult.textContent = "Pick a card to begin!";
  }

  function drawMultipleCards(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      drawn.push(drawOneCard());
    }
    return drawn;
  }

  // Render CPU hand (face-down)
  function renderCPUHand() {
    cpuHandContainer.innerHTML = "";
    cpuHand.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("card");
      // Face-down image
      cardDiv.style.backgroundImage = "url('assets/cpu-card.png')";

      // We'll store data so we know which card this is
      cardDiv.dataset.index = index;

      // The CPU doesn't need a click event. We pick randomly in code.

      cpuHandContainer.appendChild(cardDiv);
    });
  }

  // Render Player hand (face-up)
  function renderPlayerHand() {
    playerHandContainer.innerHTML = "";
    playerHand.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("card", "card-faceup");
      cardDiv.dataset.index = index;

      // Show element image + border color
      cardDiv.style.backgroundImage = `url('assets/${card.type.toLowerCase()}.png')`;
      cardDiv.style.borderColor = getColorCode(card.color);

      // Number label
      const numDiv = document.createElement("div");
      numDiv.classList.add("card-number");
      numDiv.textContent = card.number;
      cardDiv.appendChild(numDiv);

      // Click event
      cardDiv.addEventListener("click", () => {
        if (roundActive) {
          roundActive = false;
          // Animate the player's chosen card & CPU's chosen card
          selectCards(index);
        }
      });

      playerHandContainer.appendChild(cardDiv);
    });
  }

  // Animate and then do round logic
  function selectCards(playerIndex) {
    // CPU picks random card from its hand
    const cpuIndex = Math.floor(Math.random() * cpuHand.length);

    // The actual card data
    const playerCardData = playerHand[playerIndex];
    const cpuCardData = cpuHand[cpuIndex];

    // DOM elements
    const playerCardElem = playerHandContainer.querySelector(`[data-index='${playerIndex}']`);
    const cpuCardElem = cpuHandContainer.querySelector(`[data-index='${cpuIndex}']`);

    // Animate player's card
    animateCardToSlot(playerCardElem, playerSelectedSlot, playerCardData, () => {
      // After player's card arrives
    });

    // Animate CPU's card
    animateCardToSlot(cpuCardElem, cpuSelectedSlot, cpuCardData, () => {
      // After CPU's card arrives
    });

    // After both animations end, we do the round logic.
    // We'll wait a bit for animations (0.8s + buffer).
    setTimeout(() => {
      playRound(cpuCardData, playerCardData, cpuIndex, playerIndex);
    }, 900);
  }

  // Moves a card from the hand to the selected slot with a smooth transition
  function animateCardToSlot(cardElem, targetSlot, cardData, onComplete) {
    // 1. Get the starting position
    const startRect = cardElem.getBoundingClientRect();
    // 2. Clone the card to animate
    const clone = document.createElement("div");
    clone.classList.add("animated-card");
    // If it's CPU card, use cpu-card.png; if it's player card, show the type image
    if (cardData.type) {
      // It's a face-up card (player's) if it has a .type property
      clone.style.backgroundImage = `url('assets/${cardData.type.toLowerCase()}.png')`;
      clone.style.border = `4px solid ${getColorCode(cardData.color)}`;
    } else {
      // fallback check: if you store CPU data differently, adjust
      clone.style.backgroundImage = "url('assets/cpu-card.png')";
    }
    // Set initial position
    clone.style.left = startRect.left + "px";
    clone.style.top = startRect.top + "px";
    document.body.appendChild(clone);

    // Force reflow so transition can happen
    clone.getBoundingClientRect();

    // 3. Get target slot position
    const endRect = targetSlot.getBoundingClientRect();
    const offsetX = endRect.left - startRect.left;
    const offsetY = endRect.top - startRect.top;

    // 4. Animate via transform
    clone.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    // On transition end, remove clone & run callback
    clone.addEventListener("transitionend", () => {
      clone.remove();
      if (onComplete) onComplete();
    });
  }

  // Once animations are done, handle the round logic
  function playRound(cpuCard, playerCard, cpuIndex, playerIndex) {
    // Remove the used card from CPU hand & Player hand
    cpuHand.splice(cpuIndex, 1);
    playerHand.splice(playerIndex, 1);

    // Determine winner
    const winner = determineWinner(cpuCard, playerCard);
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

    // Check for overall game win
    if (checkForGameWin(cpuWins)) {
      roundResult.textContent = "CPU has achieved victory!";
      endGame();
      return;
    } else if (checkForGameWin(playerWins)) {
      roundResult.textContent = "You have achieved victory!";
      endGame();
      return;
    }

    // Next round: draw a new card for CPU & Player to maintain 5 (optional)
    cpuHand.push(drawOneCard());
    playerHand.push(drawOneCard());

    // Re-render
    renderCPUHand();
    renderPlayerHand();

    // Show next round button
    setTimeout(() => {
      nextRoundBtn.style.display = "inline-block";
    }, 500);
  }

  function determineWinner(cpuCard, playerCard) {
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

  function getColorCode(colorName) {
    switch (colorName) {
      case "Red": return "red";
      case "Blue": return "blue";
      case "Green": return "green";
      default: return "black";
    }
  }

  // Check if a side has 3 distinct types OR 3 distinct colors of the same type
  function checkForGameWin(winsArray) {
    if (winsArray.length < 3) return false;

    // 3 distinct types?
    const uniqueTypes = new Set(winsArray.map(win => win.type));
    if (uniqueTypes.size >= 3) {
      return true;
    }

    // or 3 distinct colors in the same type
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

  // Display each win as a small square
  function updateWinsDisplay(container, winsArray) {
    container.innerHTML = "";

    // group by type
    const types = ["Fire", "Water", "Snow"];
    const typeMap = { Fire: [], Water: [], Snow: [] };
    for (let w of winsArray) {
      typeMap[w.type].push(w.color);
    }

    types.forEach((type) => {
      if (typeMap[type].length > 0) {
        // create a column for this type
        const typeColumn = document.createElement("div");
        typeColumn.style.display = "flex";
        typeColumn.style.flexDirection = "column";
        typeColumn.style.marginRight = "5px";

        typeMap[type].forEach((color) => {
          const square = document.createElement("div");
          square.style.width = "40px";
          square.style.height = "40px";
          square.style.backgroundColor = getColorCode(color);
          square.style.backgroundImage = `url('assets/${type.toLowerCase()}.png')`;
          square.style.backgroundSize = "contain";
          square.style.backgroundPosition = "center";
          square.style.backgroundRepeat = "no-repeat";
          square.style.border = "2px solid #00000055";
          square.style.borderRadius = "4px";
          square.style.marginBottom = "5px";

          typeColumn.appendChild(square);
        });

        container.appendChild(typeColumn);
      }
    });
  }

  // Next round
  nextRoundBtn.addEventListener("click", () => {
    nextRoundBtn.style.display = "none";
    roundResult.textContent = "Pick a card to begin!";
    roundActive = true;

    // Clear selected slots
    cpuSelectedSlot.innerHTML = "";
    playerSelectedSlot.innerHTML = "";
  });

  // End game
  function endGame() {
    roundActive = false;
    nextRoundBtn.style.display = "none";
    // Optionally add a "Play Again" button or reload.
  }

  // Start
  initGame();
});
