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
  const passButton = document.getElementById("pass-button");
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
  let startingPlayer = "player";
  let initialUpcardState = null;
  let isAnimatingCard = false;

  // --- Game Initialization ---
  function newGame() {
    setNewGameButtonState(false);
    const newShuffledDeck = shuffleDeck(createDeck());
    playerHand = newShuffledDeck.slice(0, 10);
    computerHand = newShuffledDeck.slice(10, 20);
    discardPile = [newShuffledDeck[20]];
    deck = newShuffledDeck.slice(21);

    selectedCardsFromPlayerHand = [];
    startingPlayer = Math.random() < 0.5 ? "player" : "computer";
    initialUpcardState = {
      currentTurn: startingPlayer,
      passes: 0,
    };
    gamePhase = "initialUpcard";
    turn = startingPlayer;
    message =
      startingPlayer === "player"
        ? "You may take the up card or pass."
        : "Computer is deciding whether to take the up card.";

    updateScoresDisplay();
    renderAll();
    updateMessageDisplay(message);
    updateActionButtons();

    if (startingPlayer === "computer") {
      setTimeout(() => computerTurn(), 800);
    }
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

  function setNewGameButtonState(isEnabled) {
    newGameButton.disabled = !isEnabled;
    newGameButton.setAttribute("aria-disabled", String(!isEnabled));
  }

  function updateActionButtons() {
    knockButton.style.display = "none";
    passButton.style.display = "none";
    passButton.disabled = false;

    if (
      initialUpcardState &&
      turn === "player" &&
      initialUpcardState.currentTurn === "player"
    ) {
      passButton.style.display = "inline-block";
    }

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

  function updateInitialMessage() {
    if (!initialUpcardState) return;
    if (initialUpcardState.currentTurn === "player") {
      if (initialUpcardState.passes === 0) {
        updateMessageDisplay("You may take the up card or pass.");
      } else {
        updateMessageDisplay(
          "Computer passed. Take the up card or pass. Passing means you must draw next.",
        );
      }
    } else {
      if (initialUpcardState.passes === 0) {
        updateMessageDisplay(
          "Computer is deciding whether to take the up card or pass.",
        );
      } else {
        updateMessageDisplay(
          "You passed. The computer may take the up card or pass.",
        );
      }
    }
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getHandAnchorElement(handContainer) {
    if (!handContainer) return document.body;
    const children = handContainer.children;
    if (children.length > 0) {
      return children[children.length - 1];
    }
    return handContainer;
  }

  function getDiscardAnchorElement() {
    return (
      discardPileCardContainer.firstElementChild || discardPileCardContainer
    );
  }

  function waitForAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function animateCardMovement(
    sourceElement,
    targetElement,
    { hideSource = true } = {},
  ) {
    if (!sourceElement || !targetElement) return;

    isAnimatingCard = true;

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const flyingCard = sourceElement.cloneNode(true);
    flyingCard.classList.add("flying-card");
    flyingCard.style.width = `${sourceRect.width}px`;
    flyingCard.style.height = `${sourceRect.height}px`;
    flyingCard.style.left = `${sourceRect.left}px`;
    flyingCard.style.top = `${sourceRect.top}px`;
    flyingCard.style.transform = "translate(0, 0) scale(1, 1)";

    if (hideSource) {
      sourceElement.classList.add("card-hidden");
    }

    document.body.appendChild(flyingCard);
    await waitForAnimationFrame();

    const translateX = targetRect.left - sourceRect.left;
    const translateY = targetRect.top - sourceRect.top;
    const scaleX = sourceRect.width ? targetRect.width / sourceRect.width : 1;
    const scaleY = sourceRect.height
      ? targetRect.height / sourceRect.height
      : 1;

    flyingCard.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    flyingCard.style.opacity = "0.35";

    await new Promise((resolve) => {
      const cleanup = () => {
        flyingCard.remove();
        resolve();
      };
      const timer = setTimeout(cleanup, 600);
      flyingCard.addEventListener(
        "transitionend",
        () => {
          clearTimeout(timer);
          cleanup();
        },
        { once: true },
      );
    });

    if (hideSource) {
      sourceElement.classList.remove("card-hidden");
    }

    isAnimatingCard = false;
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
  async function handleDrawFromDeck() {
    if (isAnimatingCard) return;
    if (turn !== "player" || gamePhase !== "draw" || deck.length === 0) return;

    const target = getHandAnchorElement(playerHandDiv);
    await animateCardMovement(stockPileCardDiv, target, { hideSource: false });

    const newCard = deck.shift();
    playerHand.push(newCard);
    gamePhase = "discard";
    renderAll();
    updateMessageDisplay("Choose a card to discard or knock.");
    updateActionButtons();
  }

  async function handleDrawFromDiscard() {
    if (isAnimatingCard || discardPile.length === 0) return;

    if (
      gamePhase === "initialUpcard" &&
      initialUpcardState &&
      turn === "player" &&
      initialUpcardState.currentTurn === "player"
    ) {
      await takeTopDiscardForPlayer(true);
      return;
    }

    if (turn !== "player" || gamePhase !== "draw") return;

    await takeTopDiscardForPlayer(false);
  }

  async function takeTopDiscardForPlayer(fromInitialPhase) {
    const discardCardElement =
      discardPileCardContainer.querySelector(".card") ||
      discardPileCardContainer;
    const target = getHandAnchorElement(playerHandDiv);
    await animateCardMovement(discardCardElement, target);

    const topCard = discardPile.pop();
    playerHand.push(topCard);
    gamePhase = "discard";
    if (fromInitialPhase) {
      initialUpcardState = null;
    }

    renderAll();
    updateMessageDisplay("Choose a card to discard or knock.");
    updateActionButtons();
  }

  async function handlePlayerCardClick(cardToDiscard) {
    if (isAnimatingCard) return;
    if (
      turn !== "player" ||
      gamePhase !== "discard" ||
      playerHand.length !== 11
    ) {
      return;
    }

    const cardElement = playerHandDiv.querySelector(
      `[data-card-id="${cardToDiscard.id}"]`,
    );
    const discardTarget = getDiscardAnchorElement();
    await animateCardMovement(cardElement, discardTarget);

    playerHand = playerHand.filter((c) => c.id !== cardToDiscard.id);
    discardPile.push(cardToDiscard);

    renderAll();
    updateActionButtons();

    if (canGinWith10Cards(playerHand)) {
      await sleep(400);
      endRound("gin", "player");
      return;
    }

    turn = "computer";
    gamePhase = "draw"; // Computer will draw next
    updateMessageDisplay("Computer's turn 🤖");
    updateActionButtons();
    await sleep(800);
    computerTurn();
  }

  async function handleKnockOut() {
    if (isAnimatingCard) return;
    if (
      turn !== "player" ||
      gamePhase !== "discard" ||
      playerHand.length !== 11
    )
      return;

    const knockAction = getBestKnockAction(playerHand);
    if (knockAction.canKnock && knockAction.bestDiscard) {
      const cardToDiscard = knockAction.bestDiscard;
      const cardElement = playerHandDiv.querySelector(
        `[data-card-id="${cardToDiscard.id}"]`,
      );
      await animateCardMovement(cardElement, getDiscardAnchorElement());

      playerHand = playerHand.filter((c) => c.id !== cardToDiscard.id);
      discardPile.push(cardToDiscard);

      renderAll();
      updateActionButtons();

      const type = knockAction.deadwood === 0 ? "gin" : "knock";
      await sleep(400);
      endRound(type, "player");
    } else {
      updateMessageDisplay("Cannot knock right now.");
    }
  }

  function handlePlayerPassUpcard() {
    if (
      isAnimatingCard ||
      !initialUpcardState ||
      turn !== "player" ||
      initialUpcardState.currentTurn !== "player"
    ) {
      return;
    }
    processInitialPass();
  }

  function processInitialPass() {
    if (!initialUpcardState) return;

    initialUpcardState.passes += 1;
    turn = turn === "player" ? "computer" : "player";

    if (initialUpcardState.passes >= 2) {
      turn = startingPlayer;
      initialUpcardState = null;
      gamePhase = "draw";
      const forcedMessage =
        turn === "player"
          ? "Both players passed. You must draw from the stock or take the up card."
          : "Both players passed. The computer must draw from the stock or take the up card.";
      updateMessageDisplay(forcedMessage);
      updateActionButtons();
      if (turn === "computer") {
        setTimeout(() => computerTurn(), 800);
      }
      return;
    }

    if (initialUpcardState) {
      initialUpcardState.currentTurn = turn;
    }
    updateInitialMessage();
    updateActionButtons();

    if (turn === "computer") {
      setTimeout(() => computerTurn(), 800);
    }
  }

  // --- Computer AI ---
  async function computerTurn() {
    if (turn !== "computer") return;

    if (gamePhase === "initialUpcard") {
      await handleComputerInitialDecision();
      return;
    }

    if (gamePhase !== "draw") return;

    updateMessageDisplay("Computer's thinking... 🤔");
    await sleep(450);

    let drawnCard = null;
    let drawSource = "deck";

    if (discardPile.length > 0) {
      const discardTopCard = discardPile[discardPile.length - 1];
      const handWithDiscard = [...computerHand, discardTopCard];
      let bestDeadwoodWithDiscard = Infinity;
      for (const card of handWithDiscard) {
        const testHand = handWithDiscard.filter((c) => c.id !== card.id);
        bestDeadwoodWithDiscard = Math.min(
          bestDeadwoodWithDiscard,
          calculateDeadwood(testHand),
        );
      }

      const nextDeckCard = deck[0];
      let bestDeadwoodWithDeck = calculateDeadwood(computerHand);
      if (nextDeckCard) {
        const handWithDeck = [...computerHand, nextDeckCard];
        bestDeadwoodWithDeck = getBestKnockAction(handWithDeck).deadwood;
      }

      if (
        bestDeadwoodWithDiscard < bestDeadwoodWithDeck - 1 ||
        Math.random() < 0.35
      ) {
        drawSource = "discard";
      }
    }

    if (drawSource === "discard" && discardPile.length > 0) {
      const discardElement =
        discardPileCardContainer.querySelector(".card") ||
        discardPileCardContainer;
      await animateCardMovement(
        discardElement,
        getHandAnchorElement(computerHandDiv),
      );
      drawnCard = discardPile.pop();
    } else {
      if (deck.length === 0) {
        if (discardPile.length === 0) {
          updateMessageDisplay("Deck is empty. Computer cannot draw.");
          turn = "player";
          gamePhase = "draw";
          renderAll();
          updateActionButtons();
          return;
        }
        const discardElement =
          discardPileCardContainer.querySelector(".card") ||
          discardPileCardContainer;
        await animateCardMovement(
          discardElement,
          getHandAnchorElement(computerHandDiv),
        );
        drawnCard = discardPile.pop();
      } else {
        await animateCardMovement(
          stockPileCardDiv,
          getHandAnchorElement(computerHandDiv),
          { hideSource: false },
        );
        drawnCard = deck.shift();
      }
    }

    computerHand.push(drawnCard);
    gamePhase = "discard";
    renderAll();

    const { minDeadwood } = await computerDiscardPhase();
    const roundEnded = await computerPostDiscardDecisions(minDeadwood);
    if (roundEnded) return;

    turn = "player";
    gamePhase = "draw";
    updateMessageDisplay("Your turn - draw a card.");
    updateActionButtons();
  }

  async function handleComputerInitialDecision() {
    if (
      !initialUpcardState ||
      turn !== "computer" ||
      gamePhase !== "initialUpcard"
    ) {
      return;
    }

    updateMessageDisplay("Computer is considering the up card...");
    await sleep(500);

    const discardTopCard = discardPile[discardPile.length - 1];
    let takeUpCard = false;

    if (discardTopCard) {
      const handWithDiscard = [...computerHand, discardTopCard];
      const discardDeadwood = getBestKnockAction(handWithDiscard).deadwood;
      const nextDeckCard = deck[0];
      let deckDeadwood = calculateDeadwood(computerHand);
      if (nextDeckCard) {
        const handWithDeck = [...computerHand, nextDeckCard];
        deckDeadwood = getBestKnockAction(handWithDeck).deadwood;
      }

      takeUpCard =
        discardDeadwood <= deckDeadwood - 1 ||
        (discardDeadwood <= deckDeadwood && Math.random() < 0.4);
    }

    if (takeUpCard && discardPile.length > 0) {
      const discardElement =
        discardPileCardContainer.querySelector(".card") ||
        discardPileCardContainer;
      await animateCardMovement(
        discardElement,
        getHandAnchorElement(computerHandDiv),
      );
      const card = discardPile.pop();
      computerHand.push(card);
      initialUpcardState = null;
      gamePhase = "discard";
      renderAll();

      const { minDeadwood } = await computerDiscardPhase();
      const roundEnded = await computerPostDiscardDecisions(minDeadwood);
      if (roundEnded) return;

      turn = "player";
      gamePhase = "draw";
      updateMessageDisplay("Your turn - draw a card.");
      updateActionButtons();
    } else {
      updateMessageDisplay("Computer passed on the up card.");
      await sleep(400);
      processInitialPass();
    }
  }

  async function computerDiscardPhase() {
    let cardToDiscard = null;
    let bestPossibleHandAfterDiscard = [];
    let minDeadwood = Infinity;

    for (const potentialDiscard of computerHand) {
      const candidateHand = computerHand.filter(
        (card) => card.id !== potentialDiscard.id,
      );
      const deadwood = calculateDeadwood(candidateHand);
      if (
        deadwood < minDeadwood ||
        (deadwood === minDeadwood &&
          potentialDiscard.value > (cardToDiscard?.value || 0))
      ) {
        minDeadwood = deadwood;
        cardToDiscard = potentialDiscard;
        bestPossibleHandAfterDiscard = candidateHand;
      }
    }

    if (!cardToDiscard) {
      return { minDeadwood: calculateDeadwood(computerHand) };
    }

    await waitForAnimationFrame();
    const discardIndex = computerHand.findIndex(
      (card) => card.id === cardToDiscard.id,
    );
    const cardElement = computerHandDiv.children[discardIndex];
    if (cardElement) {
      await animateCardMovement(cardElement, getDiscardAnchorElement());
    }

    computerHand = bestPossibleHandAfterDiscard;
    discardPile.push(cardToDiscard);
    renderAll();
    updateActionButtons();

    return { minDeadwood };
  }

  async function computerPostDiscardDecisions(minDeadwood) {
    if (canGinWith10Cards(computerHand)) {
      await sleep(500);
      endRound("gin", "computer");
      return true;
    }

    if (
      canKnockWith10Cards(computerHand) &&
      (minDeadwood < 5 || Math.random() > 0.4)
    ) {
      await sleep(500);
      endRound("knock", "computer");
      return true;
    }

    return false;
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
    initialUpcardState = null;
    setNewGameButtonState(true);
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

  // --- Event Listeners ---
  newGameButton.addEventListener("click", newGame);
  knockButton.addEventListener("click", handleKnockOut);
  passButton.addEventListener("click", handlePlayerPassUpcard);
  stockPileCardDiv.addEventListener("click", handleDrawFromDeck);
  // Discard pile card click is handled by re-rendering it with a listener

  // --- Initial Game Start ---
  newGame();
});
