// script.js

// 1. Wait for the page to load
document.addEventListener("DOMContentLoaded", () => {
    const playerPenguin = document.getElementById("player-penguin");
    const cpuPenguin = document.getElementById("cpu-penguin");
    const playerHandContainer = document.getElementById("player-hand");
    const roundResult = document.getElementById("round-result");
    const nextRoundBtn = document.getElementById("next-round-btn");
    const playerScoreDisplay = document.getElementById("player-score");
    const cpuScoreDisplay = document.getElementById("cpu-score");
  
    // Scores
    let playerScore = 0;
    let cpuScore = 0;
    let roundActive = true; // to prevent picking multiple times
  
    // 2. Trigger the initial animations
    walkInPenguins();
  
    // After they walk in, make them bow
    setTimeout(() => {
      bowPenguins();
      // After bow, create the deck & deal the first hand
      setTimeout(() => {
        createPlayerHand();
      }, 1200);
    }, 2000);
  
    // 3. Generate a deck
    // Let's define possible elements and numbers
    // For simplicity, 3 elements: Fire, Water, Snow
    // Numbers: 1-5
    function generateDeck() {
      const elements = ["Fire", "Water", "Snow"];
      const deck = [];
      for (let elem of elements) {
        for (let num = 1; num <= 5; num++) {
          deck.push({ element: elem, number: num });
        }
      }
      return deck;
    }
  
    const deck = generateDeck();
  
    // 4. Create the player's hand (random 5 cards)
    function createPlayerHand() {
      // Clear previous hand if any
      playerHandContainer.innerHTML = "";
      roundResult.textContent = "";
      nextRoundBtn.style.display = "none";
      roundActive = true;
  
      const playerHand = [];
      for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * deck.length);
        playerHand.push(deck[randomIndex]);
      }
  
      // Render the cards
      playerHand.forEach((card, index) => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "card";
        cardDiv.innerHTML = `
          <div class="card-element">${card.element}</div>
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
  
    // 5. CPU picks a random card
    function getCpuCard() {
      const randomIndex = Math.floor(Math.random() * deck.length);
      return deck[randomIndex];
    }
  
    // 6. Compare the cards and determine winner
    function playRound(playerCard) {
      const cpuCard = getCpuCard();
  
      // Calculate winner
      const winner = determineWinner(playerCard, cpuCard);
  
      // Display result
      let resultText = `You played ${playerCard.element} ${playerCard.number}. CPU played ${cpuCard.element} ${cpuCard.number}. `;
      if (winner === "Player") {
        playerScore++;
        resultText += "You win this round!";
      } else if (winner === "CPU") {
        cpuScore++;
        resultText += "CPU wins this round!";
      } else {
        resultText += "It's a tie!";
      }
  
      // Update scoreboard
      playerScoreDisplay.textContent = playerScore;
      cpuScoreDisplay.textContent = cpuScore;
  
      roundResult.textContent = resultText;
  
      // Check if game is over
      if (playerScore === 3) {
        roundResult.textContent = "You win the game!";
        endGame();
        return;
      } else if (cpuScore === 3) {
        roundResult.textContent = "CPU wins the game!";
        endGame();
        return;
      }
  
      // Show next round button
      nextRoundBtn.style.display = "inline-block";
    }
  
    // 7. Determine winner based on Card-Jitsu rules
    function determineWinner(playerCard, cpuCard) {
      // If same element, compare numbers
      if (playerCard.element === cpuCard.element) {
        if (playerCard.number > cpuCard.number) return "Player";
        else if (playerCard.number < cpuCard.number) return "CPU";
        else return "Tie";
      }
  
      // If different elements, apply elemental hierarchy
      // Fire > Snow, Snow > Water, Water > Fire
      if (playerCard.element === "Fire" && cpuCard.element === "Snow") return "Player";
      if (playerCard.element === "Snow" && cpuCard.element === "Fire") return "CPU";
  
      if (playerCard.element === "Snow" && cpuCard.element === "Water") return "Player";
      if (playerCard.element === "Water" && cpuCard.element === "Snow") return "CPU";
  
      if (playerCard.element === "Water" && cpuCard.element === "Fire") return "Player";
      if (playerCard.element === "Fire" && cpuCard.element === "Water") return "CPU";
    }
  
    // 8. Next round
    nextRoundBtn.addEventListener("click", () => {
      createPlayerHand();
    });
  
    // 9. End game (optional: reload the page or do something else)
    function endGame() {
      // Hide next round button
      nextRoundBtn.style.display = "none";
  
      // You could show a "Play Again" button and reset scores
      // or just let them refresh the page
    }
  
    /* ANIMATION FUNCTIONS */
    function walkInPenguins() {
      // Add classes that move them inside
      playerPenguin.classList.add("walk-in-left");
      cpuPenguin.classList.add("walk-in-right");
    }
  
    function bowPenguins() {
      // Add bow animation
      playerPenguin.classList.add("bow");
      cpuPenguin.classList.add("bow");
      // Remove the bow animation after it finishes so it can replay if needed
      setTimeout(() => {
        playerPenguin.classList.remove("bow");
        cpuPenguin.classList.remove("bow");
      }, 1000);
    }
  });
  