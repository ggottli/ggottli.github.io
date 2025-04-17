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

  // Track the last played cards for removal
  let lastCpuCardIndex = null;
  let lastPlayerCardIndex = null;

  // Track the last CPU/Player card data
  let lastCpuCardData = null;
  let lastPlayerCardData = null;

  let roundActive = false;

  // 1) Generate a simpler deck for demonstration.
  //    You can incorporate your inverse-odds logic if you want.
  function generateDeck() {
    const types = ["Fire", "Water", "Snow"];
    const colors = ["Red", "Blue", "Green"];
    // We'll just do numbers 2..10 with 1 occurrence each for brevity.
    // If you want inverse odds, you can adapt the logic from previous code.
    const deck = [];
    for (let type of types) {
      for (let color of colors) {
        for (let num = 2; num <= 10; num++) {
          deck.push({ type, color, number: num });
        }
      }
    }
    return deck;
  }

  const fullDeck = generateDeck();

  // Random pick from fullDeck
  function drawOneCard() {
    const idx = Math.floor(Math.random() * fullDeck.length);
    return fullDeck[idx];
  }

  // Draw multiple
  function drawMultipleCards(n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      arr.push(drawOneCard());
    }
    return arr;
  }

  // Initialize the game
  function initGame() {
    cpuHand = drawMultipleCards(5);
    playerHand = drawMultipleCards(5);

    renderCPUHand();
    renderPlayerHand();

    nextRoundBtn.style.display = "none";
    roundResult.textContent = "Pick a card to begin!";
    roundActive = true;
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

      cardDiv.style.borderColor = getColorCode(card.color);
      cardDiv.style.backgroundImage = `url('assets/${card.type.toLowerCase()}.png')`;

      // Number
      const numDiv = document.createElement("div");
      numDiv.classList.add("card-number");
      numDiv.textContent = card.number;
      cardDiv.appendChild(numDiv);

      // On click
      cardDiv.addEventListener("click", () => {
        if (roundActive) {
          roundActive = false;
          selectCards(index);
        }
      });

      playerHandContainer.appendChild(cardDiv);
    });
  }

  // On player selecting a card
  function selectCards(playerIndex) {
    // CPU picks random
    const cpuIndex = Math.floor(Math.random() * cpuHand.length);

    // Store these for next round
    lastCpuCardIndex = cpuIndex;
    lastPlayerCardIndex = playerIndex;

    const cpuCardData = cpuHand[cpuIndex];
    const playerCardData = playerHand[playerIndex];

    lastCpuCardData = cpuCardData;
    lastPlayerCardData = playerCardData;

    // DOM elements
    const playerCardElem = playerHandContainer.querySelector(`[data-index='${playerIndex}']`);
    const cpuCardElem = cpuHandContainer.querySelector(`[data-index='${cpuIndex}']`);

    // Animate player card to center
    animateCardToSlot(
      playerCardElem, 
      playerSelectedSlot, 
      playerCardData, 
      false /* isCPU */
    );

    // Animate CPU card to center
    animateCardToSlot(
      cpuCardElem,
      cpuSelectedSlot,
      cpuCardData,
      true /* isCPU */
    );

    // After short delay, do round logic
    setTimeout(() => {
      doRoundLogic(cpuCardData, playerCardData);
    }, 900);
  }

  // The main round logic
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

    // Check for game win
    if (checkForGameWin(cpuWins)) {
      roundResult.textContent = "CPU has achieved victory!";
      endGame();
      return;
    } else if (checkForGameWin(playerWins)) {
      roundResult.textContent = "You have achieved victory!";
      endGame();
      return;
    }

    // Show next round button
    nextRoundBtn.style.display = "inline-block";
  }

  // When user presses Next Round
  nextRoundBtn.addEventListener("click", () => {
    nextRoundBtn.style.display = "none";

    // Remove the used cards from each hand
    cpuHand.splice(lastCpuCardIndex, 1);
    playerHand.splice(lastPlayerCardIndex, 1);

    // Optionally: draw new cards
    cpuHand.push(drawOneCard());
    playerHand.push(drawOneCard());

    // Clear center slots
    cpuSelectedSlot.innerHTML = "";
    playerSelectedSlot.innerHTML = "";

    // Re-render
    renderCPUHand();
    renderPlayerHand();

    roundResult.textContent = "Pick a card for the next round!";
    roundActive = true;
  });

  // Animation to center
  // isCPU = true if we want to label it as CPU card
  function animateCardToSlot(cardElem, slotElem, cardData, isCPU) {
    // get bounding rect
    const startRect = cardElem.getBoundingClientRect();
    // create clone for animation
    const clone = document.createElement("div");
    clone.classList.add("animated-card");

    // Face-up image for both CPU and Player in the center
    clone.style.backgroundImage = `url('assets/${cardData.type.toLowerCase()}.png')`;
    clone.style.border = `4px solid ${getColorCode(cardData.color)}`;

    // place clone at start
    clone.style.left = startRect.left + "px";
    clone.style.top = startRect.top + "px";
    document.body.appendChild(clone);

    // force reflow
    clone.getBoundingClientRect();

    // get destination
    const endRect = slotElem.getBoundingClientRect();
    const offsetX = endRect.left - startRect.left + (slotElem.offsetWidth/2 - clone.offsetWidth/2);
    const offsetY = endRect.top - startRect.top + (slotElem.offsetHeight/2 - clone.offsetHeight/2);

    // transition
    clone.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    // on transition end
    clone.addEventListener("transitionend", () => {
      // remove the clone from the body
      clone.remove();

      // create a "center card" that stays in the slot
      const centerCard = document.createElement("div");
      centerCard.classList.add("center-card");
      centerCard.style.borderColor = getColorCode(cardData.color);
      centerCard.style.backgroundImage = `url('assets/${cardData.type.toLowerCase()}.png')`;

      // add the number label
      const numDiv = document.createElement("div");
      numDiv.classList.add("card-number");
      numDiv.textContent = cardData.number;
      centerCard.appendChild(numDiv);

      slotElem.appendChild(centerCard);
    });
  }

  // Round winner
  function determineWinner(cpuCard, playerCard) {
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

  // Check for 3 distinct types or 3 distinct colors in same type
  function checkForGameWin(winsArray) {
    if (winsArray.length < 3) return false;
    const uniqueTypes = new Set(winsArray.map(w => w.type));
    if (uniqueTypes.size >= 3) return true;

    const typeColorMap = {};
    for (let w of winsArray) {
      if (!typeColorMap[w.type]) typeColorMap[w.type] = new Set();
      typeColorMap[w.type].add(w.color);
    }
    for (let t in typeColorMap) {
      if (typeColorMap[t].size >= 3) return true;
    }
    return false;
  }

  // Update corner trackers
  function updateWinsDisplay(container, winsArray) {
    container.innerHTML = "";
    const types = ["Fire", "Water", "Snow"];
    const typeMap = { Fire: [], Water: [], Snow: [] };
    for (let w of winsArray) {
      typeMap[w.type].push(w.color);
    }
    types.forEach((t) => {
      if (typeMap[t].length > 0) {
        const col = document.createElement("div");
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.marginRight = "5px";
        typeMap[t].forEach((color) => {
          const box = document.createElement("div");
          box.style.width = "40px";
          box.style.height = "40px";
          box.style.backgroundColor = getColorCode(color);
          box.style.backgroundImage = `url('assets/${t.toLowerCase()}.png')`;
          box.style.backgroundSize = "contain";
          box.style.backgroundRepeat = "no-repeat";
          box.style.backgroundPosition = "center";
          box.style.border = "2px solid #00000055";
          box.style.borderRadius = "4px";
          box.style.marginBottom = "5px";
          col.appendChild(box);
        });
        container.appendChild(col);
      }
    });
  }

  // color -> CSS
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
    // Optionally show "Play Again" or reload
  }

  // Start game
  initGame();
});
