document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const playerPenguin = document.getElementById("player-penguin");
    const cpuPenguin = document.getElementById("cpu-penguin");
    const playerHandContainer = document.getElementById("player-hand");
    const roundResult = document.getElementById("round-result");
    const nextRoundBtn = document.getElementById("next-round-btn");
  
    const playerWinsDisplay = document.getElementById("player-wins-display");
    const cpuWinsDisplay = document.getElementById("cpu-wins-display");
  
    // Track the Rounds each has won (store the card: { type, color })
    let playerWins = [];
    let cpuWins = [];
  
    // Controls whether a round is active (so player can't click multiple cards)
    let roundActive = false;
  
    // 1. Trigger the initial animations
    walkInPenguins();
  
    // After they walk in, make them bow, then create the first hand
    setTimeout(() => {
      bowPenguins();
      setTimeout(() => {
        createPlayerHand();
      }, 1200);
    }, 2000);
  
    // 2. Generate a deck
    // For example, 3 types x 3 colors x 5 numbers = 45 cards
    function generateDeck() {
      const types = ["Fire", "Water", "Snow"];
      const colors = ["Red", "Blue", "Green"];
      const deck = [];
  
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
  
    // 3. Create player's hand (e.g., 5 random cards)
    function createPlayerHand() {
      // Reset the round state
      playerHandContainer.innerHTML = "";
      roundResult.textContent = "";
      nextRoundBtn.style.display = "none";
      roundActive = true;
  
      // Generate 5 random cards for player's hand
      const handSize = 5;
      let playerHand = [];
      for (let i = 0; i < handSize; i++) {
        const randomIndex = Math.floor(Math.random() * deck.length);
        playerHand.push(deck[randomIndex]);
      }
  
      // Render the cards
      playerHand.forEach((card, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card";
        cardDiv.innerHTML = `
          <div class="card-element">${card.type}</div>
          <div class="card-color">${card.color}</div>
          <div class="card-number">${card.number}</div>
        `;
        cardDiv.addEventListener("click", () => {
          if (roundActive) {
            roundActive = false;
            playRound(card);
          }
        });
        playerHandContainer.appendChild(cardDiv);
      });
    }
  
    // 4. CPU picks a random card
    function getCpuCard() {
      const randomIndex = Math.floor(Math.random() * deck.length);
      return deck[randomIndex];
    }
  
    // 5. Compare the cards (Fire > Snow, Snow > Water, Water > Fire)
    function playRound(playerCard) {
      const cpuCard = getCpuCard();
  
      // Determine winner
      const winner = determineRoundWinner(playerCard, cpuCard);
  
      let resultText = `You played ${playerCard.type} (${playerCard.color}) ${playerCard.number}. 
                        CPU played ${cpuCard.type} (${cpuCard.color}) ${cpuCard.number}. `;
  
      if (winner === "Player") {
        // Store the winning card's type/color for the player
        playerWins.push({ type: playerCard.type, color: playerCard.color });
        updateWinsDisplay(playerWinsDisplay, playerWins);
        resultText += "You win this round!";
      } else if (winner === "CPU") {
        // Store the winning card's type/color for the CPU
        cpuWins.push({ type: cpuCard.type, color: cpuCard.color });
        updateWinsDisplay(cpuWinsDisplay, cpuWins);
        resultText += "CPU wins this round!";
      } else {
        resultText += "It's a tie!";
      }
  
      roundResult.textContent = resultText;
  
      // Check if there's a game winner
      if (checkForGameWin(playerWins)) {
        roundResult.textContent = "You have achieved victory!";
        endGame();
        return;
      } else if (checkForGameWin(cpuWins)) {
        roundResult.textContent = "CPU has achieved victory!";
        endGame();
        return;
      }
  
      // Show next round button
      nextRoundBtn.style.display = "inline-block";
    }
  
    // Round outcome based on Card-Jitsu rules
    function determineRoundWinner(playerCard, cpuCard) {
      // If same type, compare numbers
      if (playerCard.type === cpuCard.type) {
        if (playerCard.number > cpuCard.number) return "Player";
        if (playerCard.number < cpuCard.number) return "CPU";
        return "Tie";
      }
  
      // Fire > Snow, Snow > Water, Water > Fire
      if (playerCard.type === "Fire" && cpuCard.type === "Snow") return "Player";
      if (playerCard.type === "Snow" && cpuCard.type === "Fire") return "CPU";
  
      if (playerCard.type === "Snow" && cpuCard.type === "Water") return "Player";
      if (playerCard.type === "Water" && cpuCard.type === "Snow") return "CPU";
  
      if (playerCard.type === "Water" && cpuCard.type === "Fire") return "Player";
      if (playerCard.type === "Fire" && cpuCard.type === "Water") return "CPU";
    }
  
    // 6. Check if a player has 3 distinct types OR 3 distinct colors of the same type
    function checkForGameWin(winsArray) {
      // We only check if they have at least 3 round-wins total
      if (winsArray.length < 3) return false;
  
      // 6.1 Check for 3 distinct types
      // Gather unique types from wins
      const uniqueTypes = new Set(winsArray.map(win => win.type));
      if (uniqueTypes.size >= 3) {
        return true;
      }
  
      // 6.2 Check for 3 wins of the same type with 3 distinct colors
      // Group by type -> then check if that type has at least 3 distinct colors
      // Example: { Fire: Set(["Red","Blue"]), Water: Set([...]) }
      const typeColorMap = {};
      for (let w of winsArray) {
        const t = w.type;
        if (!typeColorMap[t]) typeColorMap[t] = new Set();
        typeColorMap[t].add(w.color);
      }
      // Now check if any type has 3 distinct colors
      for (let t in typeColorMap) {
        if (typeColorMap[t].size >= 3) return true;
      }
  
      // If neither condition is met, return false
      return false;
    }
  
    // 7. Update the visual display of wins (top corners)
    function updateWinsDisplay(container, winsArray) {
      // Clear out the old content
      container.innerHTML = "";
  
      // For each round won, show an icon or a short label (type/color)
      // e.g., "F-Red", "W-Blue", ...
      winsArray.forEach((win) => {
        const winDiv = document.createElement("div");
        winDiv.style.margin = "0 5px";
        winDiv.textContent = `${win.type[0]}-${win.color[0]}`;
        /*
          If you want to show an icon:
          - You could create an <img> based on the type or color
          - Or use a custom mini-badge or sprite
        */
        container.appendChild(winDiv);
      });
    }
  
    // 8. Next round button -> create new hand
    nextRoundBtn.addEventListener("click", () => {
      createPlayerHand();
    });
  
    // 9. End game (disable interactions, show final message)
    function endGame() {
      // Hide next round button
      nextRoundBtn.style.display = "none";
      roundActive = false;
      // Optionally, you could create a "Play Again" button 
      // or automatically reload the page.
    }
  
    /* ANIMATION HELPERS */
    function walkInPenguins() {
      playerPenguin.classList.add("walk-in-left");
      cpuPenguin.classList.add("walk-in-right");
    }
  
    function bowPenguins() {
      playerPenguin.classList.add("bow");
      cpuPenguin.classList.add("bow");
      setTimeout(() => {
        playerPenguin.classList.remove("bow");
        cpuPenguin.classList.remove("bow");
      }, 1000);
    }
  });
  