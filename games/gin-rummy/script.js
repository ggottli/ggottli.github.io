document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const playerScoreDisplay = document.getElementById("player-score-display");
  const computerScoreDisplay = document.getElementById(
    "computer-score-display",
  );
  const gameMessage = document.getElementById("game-message");
  const computerHandDiv = document.getElementById("computer-hand");
  const computerInfoDiv = document.getElementById("computer-info");
  const stockPileCardDiv = document.getElementById("stock-pile-card");
  const stockPileCountDiv = document.getElementById("stock-pile-count");
  const discardPileCardContainer = document.getElementById(
    "discard-pile-card-container",
  );
  const discardPileCountDiv = document.getElementById("discard-pile-count");
  const playerHandDiv = document.getElementById("player-hand");
  const playerDeadwoodDiv = document.getElementById("player-deadwood");
  const playerMeldsInfoDiv = document.getElementById("player-melds-info");
  const playerKnockInfoDiv = document.getElementById("player-knock-info");
  const newGameButton = document.getElementById("new-game-button");
  const knockButton = document.getElementById("knock-button");

  // --- Card Utilities ---
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];

  const createDeck = () => {
    const deck = [];
    suits.forEach((suit) => {
      ranks.forEach((rank) => {
        deck.push({
          suit,
          rank,
          id: `${rank}${suit}`,
          value:
            rank === "A"
              ? 1
              : ["J", "Q", "K"].includes(rank)
                ? 10
                : parseInt(rank) || 10,
        });
      });
    });
    return deck;
  };

  const shuffleDeck = (deck) => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  // --- Game State ---
  let deck = [];
  let playerHand = [];
  let computerHand = [];
  let discardPile = [];
  let selectedCardsFromPlayerHand = []; // For visual selection, not used in core logic like React version's toggle
  let gamePhase = "draw"; // 'draw', 'discard', 'gameOver'
  let turn = "player";
  let scores = { player: 0, computer: 0 };
  let message = "Draw a card to start your turn";
  // Drag and Drop State
  let draggedCardElement = null;
  let draggedCardData = null;
  let originalPlayerHandOrder = []; // To help with DND updates

  // --- Game Initialization ---
  function newGame() {
    const newShuffledDeck = shuffleDeck(createDeck());
    playerHand = newShuffledDeck.slice(0, 10);
    computerHand = newShuffledDeck.slice(10, 20);
    discardPile = [newShuffledDeck[20]];
    deck = newShuffledDeck.slice(21);

    selectedCardsFromPlayerHand = [];
    gamePhase = "draw";
    turn = "player";
    message = "Draw a card to start your turn";

    // scores remain for multi-round play, reset them if you want single game scores
    // scores = { player: 0, computer: 0 };

    updateScoresDisplay();
    renderAll();
    updateMessageDisplay();
    updateActionButtons();
  }

  // --- Rendering Functions ---
  function renderCard(
    card,
    faceDown = false,
    isSelected = false,
    isDraggedOver = false,
  ) {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");
    cardDiv.dataset.cardId = card.id;

    if (faceDown) {
      cardDiv.classList.add("back");
      cardDiv.innerHTML = "<span>?</span>";
    } else {
      const rankDiv = document.createElement("div");
      rankDiv.classList.add("rank");
      rankDiv.textContent = card.rank;

      const suitDiv = document.createElement("div");
      suitDiv.classList.add("suit");
      suitDiv.textContent = card.suit;

      if (["♥", "♦"].includes(card.suit)) {
        cardDiv.classList.add("red-suit");
      } else {
        cardDiv.classList.add("black-suit");
      }
      cardDiv.appendChild(rankDiv);
      cardDiv.appendChild(suitDiv);
    }
    if (isSelected) cardDiv.classList.add("selected");
    if (isDraggedOver) cardDiv.classList.add("dragged-over-slot"); // Placeholder, actual slot will highlight

    return cardDiv;
  }

  function renderPlayerHand() {
    playerHandDiv.innerHTML = "";
    originalPlayerHandOrder = [...playerHand]; // Store current order for DND reference
    playerHand.forEach((card, index) => {
      const cardSlotDiv = document.createElement("div");
      cardSlotDiv.classList.add("player-card-slot");
      cardSlotDiv.dataset.index = index; // Index of the slot

      const cardElement = renderCard(
        card,
        false,
        selectedCardsFromPlayerHand.includes(card.id),
      );
      cardElement.draggable = true;
      cardElement.dataset.handIndex = index; // Index of the card in hand

      cardElement.addEventListener("click", () => handlePlayerCardClick(card));

      // Drag and Drop listeners for the card element
      cardElement.addEventListener("dragstart", (e) =>
        onDragStartCard(e, card, index),
      );
      cardElement.addEventListener("dragend", onDragEndCard);

      // Drag over/drop listeners for the slot div
      cardSlotDiv.addEventListener("dragover", (e) => onDragOverSlot(e, index));
      cardSlotDiv.addEventListener("dragleave", (e) =>
        onDragLeaveSlot(e, index),
      );
      cardSlotDiv.addEventListener("drop", (e) => onDropOnSlot(e, index));

      cardSlotDiv.appendChild(cardElement);
      playerHandDiv.appendChild(cardSlotDiv);
    });
    updatePlayerHandInfo();
  }

  function renderComputerHand() {
    computerHandDiv.innerHTML = "";
    computerHand.forEach((card) => {
      const cardElement = renderCard(card, gamePhase !== "gameOver");
      computerHandDiv.appendChild(cardElement);
    });
    computerInfoDiv.textContent =
      gamePhase === "gameOver"
        ? `Deadwood: ${calculateDeadwood(computerHand)} | Melds: ${findMelds(computerHand).melds.flat().length} cards | Unmatched: ${findMelds(computerHand).unmatched.length} cards`
        : `Cards: ${computerHand.length}`;
  }

  function renderDiscardPile() {
    discardPileCardContainer.innerHTML = "";
    if (discardPile.length > 0) {
      const topCard = discardPile[discardPile.length - 1];
      const cardElement = renderCard(topCard);
      cardElement.addEventListener("click", handleDrawFromDiscard);
      discardPileCardContainer.appendChild(cardElement);
    } else {
      const emptyDiv = document.createElement("div");
      emptyDiv.classList.add("card-placeholder", "empty");
      emptyDiv.textContent = "Empty";
      discardPileCardContainer.appendChild(emptyDiv);
    }
    discardPileCountDiv.textContent = `${discardPile.length} cards`;
  }

  function renderStockPile() {
    stockPileCountDiv.textContent = `${deck.length} cards`;
    if (deck.length === 0) {
      stockPileCardDiv.style.cursor = "default";
      stockPileCardDiv.classList.add("empty"); // Optional: style differently
    } else {
      stockPileCardDiv.style.cursor = "pointer";
      stockPileCardDiv.classList.remove("empty");
    }
  }

  function updatePlayerHandInfo() {
    const deadwood = calculateDeadwood(playerHand);
    const meldsResult = findMelds(playerHand);
    playerDeadwoodDiv.textContent = `Deadwood: ${deadwood} points`;
    playerMeldsInfoDiv.textContent = `Melds: ${meldsResult.melds.flat().length} cards | Unmatched: ${meldsResult.unmatched.length} cards`;

    playerKnockInfoDiv.textContent = "";
    playerKnockInfoDiv.className = "knock-status"; // Reset classes

    if (turn === "player" && playerHand.length > 0) {
      let canShowKnockInfo = false;
      let currentDeadwood = deadwood;
      let isGin = false;

      if (gamePhase === "discard" && playerHand.length === 11) {
        const knockAction = getBestKnockAction(playerHand);
        if (knockAction.canKnock) {
          canShowKnockInfo = true;
          currentDeadwood = knockAction.deadwood;
          isGin = currentDeadwood === 0;
          playerKnockInfoDiv.textContent = isGin
            ? "Gin Available!"
            : "Knock Available!";
        }
      } else if (playerHand.length === 10) {
        // After discard, or for display outside discard phase
        if (canGinWith10Cards(playerHand)) {
          canShowKnockInfo = true;
          isGin = true;
          playerKnockInfoDiv.textContent = "Can Gin!";
        } else if (canKnockWith10Cards(playerHand)) {
          canShowKnockInfo = true;
          playerKnockInfoDiv.textContent = "Can Knock!";
        }
      }
      if (canShowKnockInfo) {
        playerKnockInfoDiv.classList.add(isGin ? "gin" : "knock");
      }
    }
  }

  function renderAll() {
    renderPlayerHand();
    renderComputerHand();
    renderDiscardPile();
    renderStockPile();
    updatePlayerHandInfo();
  }

  function updateScoresDisplay() {
    playerScoreDisplay.textContent = `🏆 You: ${scores.player}`;
    computerScoreDisplay.textContent = `🏆 Computer: ${scores.computer}`;
  }

  function updateMessageDisplay(newMessage = message) {
    message = newMessage; // Update global message state
    gameMessage.textContent = message;
  }

  function updateActionButtons() {
    knockButton.style.display = "none";
    if (
      turn === "player" &&
      gamePhase === "discard" &&
      playerHand.length === 11
    ) {
      const knockAction = getBestKnockAction(playerHand);
      if (knockAction.canKnock) {
        knockButton.style.display = "inline-block";
        knockButton.textContent =
          knockAction.deadwood === 0 ? "Gin!" : "Knock!";
      }
    }
    // New Game button is always visible
  }

  // --- Meld Logic (Copied and adapted from React) ---
  const getCardNumericValue = (rank) => {
    if (rank === "A") return 1;
    if (["K", "Q", "J"].includes(rank))
      return 10 + ["J", "Q", "K"].indexOf(rank) + 1;
    return parseInt(rank);
  };

  const findMelds = (hand) => {
    const melds = [];
    const used = new Set();
    const sortedHand = [...hand].sort((a, b) => {
      if (a.suit < b.suit) return -1;
      if (a.suit > b.suit) return 1;
      return getCardNumericValue(a.rank) - getCardNumericValue(b.rank);
    });

    suits.forEach((suit) => {
      const suitCards = sortedHand
        .filter((card) => card.suit === suit)
        .sort(
          (a, b) => getCardNumericValue(a.rank) - getCardNumericValue(b.rank),
        );

      for (let i = 0; i <= suitCards.length - 3; i++) {
        if (used.has(suitCards[i].id)) continue;
        const currentRun = [suitCards[i]];
        let lastVal = getCardNumericValue(suitCards[i].rank);

        for (let j = i + 1; j < suitCards.length; j++) {
          if (used.has(suitCards[j].id)) continue;
          const currentVal = getCardNumericValue(suitCards[j].rank);
          if (currentVal === lastVal + 1) {
            currentRun.push(suitCards[j]);
            lastVal = currentVal;
          } else if (currentVal > lastVal + 1) {
            break;
          }
        }
        if (currentRun.length >= 3) {
          // Check if adding this run is optimal (simple greedy approach for now)
          const tempUsed = new Set(used);
          let canAdd = true;
          currentRun.forEach((c) => {
            if (tempUsed.has(c.id)) canAdd = false;
          }); // Basic check

          if (canAdd) {
            melds.push([...currentRun]);
            currentRun.forEach((card) => used.add(card.id));
            i = -1; // Re-scan suit for more runs
          }
        }
      }
    });

    ranks.forEach((rank) => {
      const rankCards = sortedHand.filter(
        (card) => card.rank === rank && !used.has(card.id),
      );
      if (rankCards.length >= 3) {
        const setToAdd = rankCards.slice(0, rankCards.length >= 4 ? 4 : 3);
        melds.push(setToAdd);
        setToAdd.forEach((card) => used.add(card.id));
      }
    });
    return { melds, unmatched: hand.filter((card) => !used.has(card.id)) };
  };

  const calculateDeadwood = (hand) => {
    if (!hand || hand.length === 0) return 0;
    const { unmatched } = findMelds(hand);
    return unmatched.reduce((sum, card) => sum + card.value, 0);
  };

  const getBestKnockAction = (currentHand) => {
    if (currentHand.length !== 11) {
      const deadwood = calculateDeadwood(currentHand);
      return { canKnock: deadwood <= 10, bestDiscard: null, deadwood };
    }
    let bestDeadwood = Infinity;
    let cardToDiscardForBestKnock = null;
    for (const cardToTestDiscard of currentHand) {
      const tempHand = currentHand.filter((c) => c.id !== cardToTestDiscard.id);
      const deadwood = calculateDeadwood(tempHand);
      if (deadwood < bestDeadwood) {
        bestDeadwood = deadwood;
        cardToDiscardForBestKnock = cardToTestDiscard;
      } else if (deadwood === bestDeadwood) {
        if (cardToTestDiscard.value > (cardToDiscardForBestKnock?.value || 0)) {
          cardToDiscardForBestKnock = cardToTestDiscard;
        }
      }
    }
    return {
      canKnock: bestDeadwood <= 10,
      bestDiscard: cardToDiscardForBestKnock,
      deadwood: bestDeadwood,
    };
  };

  const canKnockWith10Cards = (hand) => calculateDeadwood(hand) <= 10;
  const canGinWith10Cards = (hand) => calculateDeadwood(hand) === 0;

  // --- Player Actions ---
  function handleDrawFromDeck() {
    if (turn !== "player" || gamePhase !== "draw" || deck.length === 0) return;

    const newCard = deck.shift(); // Take from the top (start) of the deck
    playerHand.push(newCard);
    gamePhase = "discard";
    updateMessageDisplay("Choose a card to discard or knock.");

    animateCardEffect(newCard.id, "draw"); // Example animation call
    renderAll();
    updateActionButtons();
  }

  function handleDrawFromDiscard() {
    if (turn !== "player" || gamePhase !== "draw" || discardPile.length === 0)
      return;

    const topCard = discardPile.pop();
    playerHand.push(topCard);
    gamePhase = "discard";
    updateMessageDisplay("Choose a card to discard or knock.");

    animateCardEffect(topCard.id, "draw");
    renderAll();
    updateActionButtons();
  }

  function handlePlayerCardClick(cardToDiscard) {
    if (
      turn !== "player" ||
      gamePhase !== "discard" ||
      playerHand.length !== 11
    ) {
      // If not in discard phase or not 11 cards, treat as selection toggle (optional)
      // const selectedIndex = selectedCardsFromPlayerHand.findIndex(c => c.id === cardToDiscard.id);
      // if (selectedIndex > -1) selectedCardsFromPlayerHand.splice(selectedIndex, 1);
      // else selectedCardsFromPlayerHand.push(cardToDiscard);
      // renderPlayerHand(); // Re-render to show selection
      return;
    }

    playerHand = playerHand.filter((c) => c.id !== cardToDiscard.id);
    discardPile.push(cardToDiscard);

    animateCardEffect(cardToDiscard.id, "discard");

    if (canGinWith10Cards(playerHand)) {
      setTimeout(() => endRound("gin", "player"), 500);
      return;
    }

    turn = "computer";
    gamePhase = "draw"; // Computer will draw next
    updateMessageDisplay("Computer's turn 🤖");
    renderAll();
    updateActionButtons();
    setTimeout(computerTurn, 1500);
  }

  function handleKnockOut() {
    if (
      turn !== "player" ||
      gamePhase !== "discard" ||
      playerHand.length !== 11
    )
      return;

    const knockAction = getBestKnockAction(playerHand);
    if (knockAction.canKnock && knockAction.bestDiscard) {
      const cardToDiscard = knockAction.bestDiscard;
      playerHand = playerHand.filter((c) => c.id !== cardToDiscard.id);
      discardPile.push(cardToDiscard);

      animateCardEffect(cardToDiscard.id, "discard");

      const type = knockAction.deadwood === 0 ? "gin" : "knock";
      setTimeout(() => endRound(type, "player"), 500);
    } else {
      updateMessageDisplay("Cannot knock.");
    }
  }

  // --- Computer AI ---
  function computerTurn() {
    updateMessageDisplay("Computer's thinking... 🤔");
    let drawnCard;
    let source = "deck";
    let tempHand = [...computerHand];

    // AI: Evaluate taking from discard (simplified)
    if (discardPile.length > 0) {
      const discardTopCard = discardPile[discardPile.length - 1];
      const handWithDiscard = [...computerHand, discardTopCard];
      // Simulate discarding worst card from this hypothetical 11-card hand
      let potentialDeadwoodWithDiscard = Infinity;
      for (const c of handWithDiscard) {
        const tempH = handWithDiscard.filter((tc) => tc.id !== c.id);
        potentialDeadwoodWithDiscard = Math.min(
          potentialDeadwoodWithDiscard,
          calculateDeadwood(tempH),
        );
      }
      const currentDeadwoodAfterOptimalDiscard = getBestKnockAction([
        ...computerHand,
        deck[0] || createDeck()[0],
      ]).deadwood;

      if (
        potentialDeadwoodWithDiscard < currentDeadwoodAfterOptimalDiscard - 2 ||
        Math.random() < 0.25
      ) {
        // Prefer discard if it's good
        drawnCard = discardPile.pop();
        tempHand.push(drawnCard);
        source = "discard";
        animateCardEffect(drawnCard.id, "computerDraw");
      }
    }

    if (source === "deck") {
      if (deck.length === 0) {
        updateMessageDisplay("Deck is empty, Computer passes.");
        turn = "player";
        gamePhase = "draw";
        renderAll();
        updateActionButtons();
        updateMessageDisplay("Your turn - draw a card (Deck was empty for AI)");
        return;
      }
      drawnCard = deck.shift();
      tempHand.push(drawnCard);
      animateCardEffect(drawnCard.id, "computerDraw");
    }

    // Computer now has 11 cards, needs to discard one.
    let cardToDiscard;
    let bestPossibleHandAfterDiscard = [];
    let minDeadwood = Infinity;

    for (const potentialDiscard of tempHand) {
      const currentTryHand = tempHand.filter(
        (c) => c.id !== potentialDiscard.id,
      );
      const currentDeadwood = calculateDeadwood(currentTryHand);
      if (currentDeadwood < minDeadwood) {
        minDeadwood = currentDeadwood;
        cardToDiscard = potentialDiscard;
        bestPossibleHandAfterDiscard = currentTryHand;
      } else if (currentDeadwood === minDeadwood) {
        if (potentialDiscard.value > (cardToDiscard?.value || 0)) {
          cardToDiscard = potentialDiscard;
          bestPossibleHandAfterDiscard = currentTryHand;
        }
      }
    }
    if (!cardToDiscard && tempHand.length > 0) {
      // Failsafe
      cardToDiscard = tempHand.sort((a, b) => b.value - a.value)[0];
      bestPossibleHandAfterDiscard = tempHand.filter(
        (c) => c.id !== cardToDiscard.id,
      );
    }

    if (cardToDiscard) {
      computerHand = bestPossibleHandAfterDiscard;
      discardPile.push(cardToDiscard);
      animateCardEffect(cardToDiscard.id, "computerDiscard");
    } else {
      // Should not happen
      turn = "player";
      gamePhase = "draw";
      renderAll();
      updateActionButtons();
      return;
    }

    // Check computer knock/gin
    if (canGinWith10Cards(computerHand)) {
      setTimeout(() => endRound("gin", "computer"), 1000);
      return;
    }
    if (
      canKnockWith10Cards(computerHand) &&
      (minDeadwood < 5 || Math.random() > 0.4)
    ) {
      // AI doesn't always knock
      setTimeout(() => endRound("knock", "computer"), 1000);
      return;
    }

    turn = "player";
    gamePhase = "draw";
    updateMessageDisplay("Your turn - draw a card.");
    renderAll();
    updateActionButtons();
  }

  // --- End of Round ---
  function endRound(type, winner) {
    const playerDeadwood = calculateDeadwood(playerHand);
    const computerDeadwood = calculateDeadwood(computerHand);
    let points = 0;
    let roundResult = "";
    let actualWinner = winner;

    if (type === "gin") {
      points = (winner === "player" ? computerDeadwood : playerDeadwood) + 25;
      roundResult = winner === "player" ? "You got Gin!" : "Computer got Gin!";
    } else if (type === "knock") {
      if (winner === "player") {
        if (computerDeadwood <= playerDeadwood) {
          // Undercut by computer
          points = playerDeadwood - computerDeadwood + 25;
          roundResult = "Computer undercut you!";
          actualWinner = "computer";
        } else {
          points = computerDeadwood - playerDeadwood;
          roundResult = "You knocked and won!";
        }
      } else {
        // Computer knocked
        if (playerDeadwood <= computerDeadwood) {
          // Undercut by player
          points = computerDeadwood - playerDeadwood + 25;
          roundResult = "You undercut the computer!";
          actualWinner = "player";
        } else {
          points = playerDeadwood - computerDeadwood;
          roundResult = "Computer knocked and won!";
        }
      }
    }

    if (actualWinner === "player") scores.player += points;
    else if (actualWinner === "computer") scores.computer += points;

    updateMessageDisplay(
      `${roundResult} Player Deadwood: ${playerDeadwood}, Computer Deadwood: ${computerDeadwood}. Points: ${points} for ${actualWinner}.`,
    );
    gamePhase = "gameOver";
    updateScoresDisplay();
    renderAll(); // Render to show computer's hand
    updateActionButtons(); // Hide knock button
  }

  // --- Drag and Drop for Player Hand ---
  function onDragStartCard(event, card, index) {
    draggedCardElement = event.target.closest(".card"); // The card element itself
    draggedCardData = { card, originalIndex: index };
    event.dataTransfer.effectAllowed = "move";
    // Optional: Set a custom drag image if you don't want the default card preview
    // event.dataTransfer.setData('text/plain', card.id); // Required for Firefox sometimes
    setTimeout(() => {
      if (draggedCardElement) draggedCardElement.classList.add("dragging");
    }, 0);
  }

  function onDragOverSlot(event, targetSlotIndex) {
    event.preventDefault(); // Allow drop
    const targetSlotElement = event.target.closest(".player-card-slot");
    if (
      targetSlotElement &&
      draggedCardData &&
      draggedCardData.originalIndex !== targetSlotIndex
    ) {
      // Add a class to highlight the slot visually
      document
        .querySelectorAll(".player-card-slot")
        .forEach((slot) => slot.classList.remove("drag-over-active"));
      if (targetSlotElement)
        targetSlotElement.classList.add("drag-over-active");
    }
  }

  function onDragLeaveSlot(event, targetSlotIndex) {
    const targetSlotElement = event.target.closest(".player-card-slot");
    if (targetSlotElement) {
      targetSlotElement.classList.remove("drag-over-active");
    }
  }

  function onDropOnSlot(event, dropSlotIndex) {
    event.preventDefault();
    document
      .querySelectorAll(".player-card-slot")
      .forEach((slot) => slot.classList.remove("drag-over-active"));

    if (!draggedCardData || draggedCardData.originalIndex === dropSlotIndex) {
      if (draggedCardElement) draggedCardElement.classList.remove("dragging");
      draggedCardData = null;
      draggedCardElement = null;
      return;
    }

    const newHandOrder = [...originalPlayerHandOrder]; // Use the order at the start of the drag
    const [draggedItem] = newHandOrder.splice(draggedCardData.originalIndex, 1);
    newHandOrder.splice(dropSlotIndex, 0, draggedItem);

    playerHand = newHandOrder; // Update the actual playerHand state

    if (draggedCardElement) draggedCardElement.classList.remove("dragging");
    draggedCardData = null;
    draggedCardElement = null;

    renderPlayerHand(); // Re-render the hand with new order
    updatePlayerHandInfo(); // Update melds/deadwood based on new order
  }

  function onDragEndCard() {
    if (draggedCardElement) draggedCardElement.classList.remove("dragging");
    document
      .querySelectorAll(".player-card-slot")
      .forEach((slot) => slot.classList.remove("drag-over-active"));
    draggedCardData = null;
    draggedCardElement = null;
  }

  // --- Animations (simple example) ---
  function animateCardEffect(cardId, animationType) {
    // This is a placeholder. In a real scenario, you'd find the card element
    // (possibly after it's rendered) and apply a CSS animation class.
    // For simplicity, CSS animations triggered by class addition on render might be easier.
    // e.g., playerHandDiv.querySelector(`[data-card-id="${cardId}"]`)?.classList.add(`card-animation-${animationType}`);
    // And then remove the class after the animation.
    console.log(`Animate ${cardId} with ${animationType}`);
  }

  // --- Event Listeners ---
  newGameButton.addEventListener("click", newGame);
  knockButton.addEventListener("click", handleKnockOut);
  stockPileCardDiv.addEventListener("click", handleDrawFromDeck);
  // Discard pile card click is handled by re-rendering it with a listener

  // --- Initial Game Start ---
  newGame();
});
