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

  // Track the last played cards for removal later
  let lastCpuCardIndex = null;
  let lastPlayerCardIndex = null;

  let lastCpuCardData = null;
  let lastPlayerCardData = null;

  // For controlling the flow (prevent multiple clicks during animation)
  let roundActive = false;

  // 1. Generate deck with inverse odds for numbers 2..10
  // 2 -> 9 occurrences, 3 -> 8, ..., 10 -> 1
  // Summation = 45 per type/color => 3 types x 3 colors = 405 total
  function generateDeck() {
    const types = ["Fire", "Water", "Snow"];
    const colors = ["Red", "Blue", "Green"];

    // Weighted occurrences
    const numberOccurrences = {
      2: 9,
      3: 8,
      4: 7,
      5: 6,
      6: 5,
      7: 4,
      8: 3,
      9: 2,
      10: 1
    };

    const deck = [];
    for (let type of types) {
      for (let color of colors) {
        for (let num = 2; num <= 10; num++) {
          const count = numberOccurrences[num];
          // push this card 'count' times
          for (let i = 0; i < count; i++) {
            deck.push({ type, color, number: num });
          }
        }
      }
    }
    return deck;
  }

  const fullDeck = generateDeck();

  // Shuffle pick helpers
  function drawOneCard() {
    const idx = Math.floor(Math.random() * fullDeck.length);
    return fullDeck[idx];
  }

  function drawMultipleCards(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      drawn.push(drawOneCard());
    }
    return drawn;
  }

  // Initialize the game
  function initGame() {
    cpuHand = drawMultipleCards(5);
    playerHand = drawMultipleCards(5);

    renderCPUHand();
    renderPlayerHand();

    roundActive = true;
    nextRoundBtn.style.display = "none";
    roundResult.textContent = "Pick a card to begin!";
  }

  // Render CPU hand (face-down)
  function renderCPUHand() {
    cpuHandContainer.innerHTML = "";
    cpuHand.forEach((card, index) => {
      const cardDiv = document.createElement("div");
      cardDiv.classList.add("card");
      cardDiv.style.backgroundImage = "url('assets/cpu-card.png')";
      cardDiv.dataset.index = index;
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

      cardDiv.style.backgroundImage = `url('assets/${card.type.toLowerCase()}.png')`;
      cardDiv.style.borderColor = getColorCode(card.color);

      const numDiv = document.createElement("div");
      numDiv.classList.add("card-number");
      numDiv.textContent = card.number;
      cardDiv.appendChild(numDiv);

      // Click event
      cardDiv.addEventListener("click", () => {
        if (roundActive) {
          roundActive = false;
          selectCards(index);
        }
      });
      playerHandContainer.appendChild(cardDiv);
    });
  }

  // Animate selection & do round logic
  function selectCards(playerIndex) {
    // CPU picks random from its hand
    const cpuIndex = Math.floor(Math.random() * cpuHand.length);

    // Save these for next round removal
    lastCpuCardIndex = cpuIndex;
    lastPlayerCardIndex = playerIndex;

    // The actual card data
    const playerCardData = playerHand[playerIndex];
    const cpuCardData = cpuHand[cpuIndex];

    lastCpuCardData = cpuCardData;
    lastPlayerCardData = playerCardData;

    // DOM elements
    const playerCardElem = playerHandContainer.querySelector(`[data-index='${playerIndex}']`);
    const cpuCardElem = cpuHandContainer.querySelector(`[data-index='${cpuIndex}']`);

    // Animate to center
    animateCardToSlot(playerCardElem, playerSelectedSlot, playerCardData, () => {});
    animateCardToSlot(cpuCardElem, cpuSelectedSlot, cpuCardData, () => {});

    // After the animation, do the round logic
    setTimeout(() => {
      doRoundLogic(cpuCardData, playerCardData);
    }, 900);
  }

  // Round logic (but don't remove/replace cards from hands yet)
  function doRoundLogic(cpuCard, playerCard) {
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

    // Show Next Round button
    nextRoundBtn.style.display = "inline-block";
  }

  // Next Round
  nextRoundBtn.addEventListener("click", () => {
    nextRoundBtn.style.display = "none";

    // 1) Remove the used cards from each hand
    cpuHand.splice(lastCpuCardIndex, 1);
    playerHand.splice(lastPlayerCardIndex, 1);

    // 2) Draw new card(s) to maintain 5 each
    cpuHand.push(drawOneCard());
    playerHand.push(drawOneCard());

    // 3) Clear the center slots
    cpuSelectedSlot.innerHTML = "";
    playerSelectedSlot.innerHTML = "";

    // 4) Re-render
    renderCPUHand();
    renderPlayerHand();

    roundResult.textContent = "Pick a card for the next round!";
    roundActive = true;
  });

  // Animate card from hand to slot
  function animateCardToSlot(cardElem, targetSlot, cardData, onComplete) {
    const startRect = cardElem.getBoundingClientRect();
    const clone = document.createElement("div");
    clone.classList.add("animated-card");

    if (cardData.type) {
      // It's a player card (face-up)
      clone.style.backgroundImage = `url('assets/${cardData.type.toLowerCase()}.png')`;
      clone.style.border = `4px solid ${getColorCode(cardData.color)}`;
    } else {
      // If CPU card data is stored similarly, you'll have .type, 
      // but let's assume "cpu-card" if we want it face-down
      clone.style.backgroundImage = "url('assets/cpu-card.png')";
    }

    clone.style.left = startRect.left + "px";
    clone.style.top = startRect.top + "px";
    document.body.appendChild(clone);
    // force reflow
    clone.getBoundingClientRect();

    const endRect = targetSlot.getBoundingClientRect();
    const offsetX = endRect.left - startRect.left;
    const offsetY = endRect.top - startRect.top;
    clone.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    clone.addEventListener("transitionend", () => {
      clone.remove();
      if (onComplete) onComplete();
    });
  }

  // Determine round winner
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

  // Check for overall victory condition
  function checkForGameWin(winsArray) {
    if (winsArray.length < 3) return false;

    // 3 distinct types
    const uniqueTypes = new Set(winsArray.map(win => win.type));
    if (uniqueTypes.size >= 3) {
      return true;
    }

    // or 3 distinct colors of the same type
    const typeColorMap = {};
    for (let w of winsArray) {
      if (!typeColorMap[w.type]) typeColorMap[w.type] = new Set();
      typeColorMap[w.type].add(w.color);
    }
    for (let t in typeColorMap) {
      if (typeColorMap[t].size >= 3) {
        return true;
      }
    }
    return false;
  }

  // Update the corner trackers
  function updateWinsDisplay(container, winsArray) {
    container.innerHTML = "";

    const types = ["Fire", "Water", "Snow"];
    const typeMap = { Fire: [], Water: [], Snow: [] };
    for (let w of winsArray) {
      typeMap[w.type].push(w.color);
    }

    types.forEach((type) => {
      if (typeMap[type].length > 0) {
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

  // Utility for color -> CSS
  function getColorCode(colorName) {
    switch (colorName) {
      case "Red": return "red";
      case "Blue": return "blue";
      case "Green": return "green";
      default: return "black";
    }
  }

  // End game
  function endGame() {
    roundActive = false;
    nextRoundBtn.style.display = "none";
    // Optionally add a "Play Again" or reload
  }

  // Start
  initGame();
});
