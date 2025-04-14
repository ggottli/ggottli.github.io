// Utility function: returns a random element from an array
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  // For exploration, we only use ranks A through 10.
  const explorationRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  // Full set of suits (♥, ♦ for red; ♣, ♠ for black)
  const suits = ["♥", "♦", "♣", "♠"];
  
  // Define mappings for red card prompts (pages 25)
  const redCardMapping = {
    "A": {
      "♥": "A stranger in unusual robes with a castle symbol on them. [Unarmed]",
      "♦": "A stranger in unusual robes with a castle symbol on them. [Armed]"
    },
    "2": {
      "♥": "Animal to hunt for food. [Easy Prey]",
      "♦": "Animal to hunt for food. [Dangerous]"
    },
    "3": {
      "♥": "CALLING – You come across someone key to your calling. [Friendly]",
      "♦": "CALLING – You come across someone key to your calling. [Not friendly]"
    },
    "4": {
      "♥": "A person you meet asks you to find something for them. [Trustworthy]. Draw an ITEM card.",
      "♦": "A person you meet asks you to find something for them. [Untrustworthy]. Draw an ITEM card."
    },
    "5": {
      "♥": "A dead body of another human. [Seems safe]. Draw an ITEM card OR an EVENT card.",
      "♦": "A dead body of another human. [Something’s off]. Draw an ITEM card OR an EVENT card."
    },
    "6": {
      "♥": "Another adventurer like yourself, garbed in Rook Armour. [Friendly]",
      "♦": "Another adventurer like yourself, garbed in Rook Armour. [Not friendly]"
    },
    "7": {
      "♥": "A gargoyle appears and takes you to a new area. [Taken to a new area]",
      "♦": "A gargoyle appears and carries you up to its nest. [Taken to the rafters]"
    },
    "8": {
      "♥": "You come across a small settlement. [Safe]. Draw an ITEM card.",
      "♦": "You come across a small settlement. [Event]. Draw an EVENT card."
    },
    "9": {
      "♥": "A massive skeleton stares at you. [Safe]",
      "♦": "A massive skeleton stares at you. [Bandit camp]"
    },
    "10": {
      "♥": "A camp of people is nearby—you pass unnoticed. [They don’t notice you]",
      "♦": "A camp of people captures you. [You are captured]"
    }
  };
  
  // Define mappings for black card prompts (page 26)
  const blackCardMapping = {
    "A": {
      "♠": "A large treasure is here. [Untouched]. Add 1 to your score and gain an item.",
      "♣": "A large treasure is here. [Evidence of attempted raids]. Add 1 to your score and gain an item."
    },
    "2": {
      "♠": "A door stands before you. [Intact/Locked].",
      "♣": "A door stands before you. [Ruined]."
    },
    "3": {
      "♠": "A staircase leads upward, disappearing into mist. [Intact].",
      "♣": "A staircase leads upward, disappearing into mist. [Ruined]."
    },
    "4": {
      "♠": "Ruins of a forgotten civilization. [Somewhat intact]. Draw an EVENT card.",
      "♣": "Ruins of a forgotten civilization. [Mostly rubble]. Draw an EVENT card."
    },
    "5": {
      "♠": "A strange mechanism operates in the Colostle. [Functional].",
      "♣": "A strange mechanism operates in the Colostle. [Damaged]."
    },
    "6": {
      "♠": "You avoid a trap. [You avoid it!].",
      "♣": "You are caught in a trap. [You are caught in it!]."
    },
    "7": {
      "♠": "A cave entrance beckons you. [Flat and easily navigable].",
      "♣": "A cave entrance beckons you. [Deep and hard to climb into]."
    },
    "8": {
      "♠": "The sea stretches before you. [Calm].",
      "♣": "The sea stretches before you. [Stormy]."
    },
    "9": {
      "♠": "You find a clue to your calling. [Something you were looking for].",
      "♣": "You find a clue to your calling. [A clue to the next step]."
    },
    "10": {
      "♠": "You come across a bustling city. [Thriving].",
      "♣": "You come across an abandoned city. [Abandoned]."
    }
  };
  
  // Define Item and Event tables (from page 27)
  const itemTable = [
    { value: "TREASURE", prompt: "TREASURE (for trading)" },
    { value: "SUPPLIES", prompt: "SUPPLIES" },
    { value: "KNOWLEDGE", prompt: "KNOWLEDGE" },
    { value: "HERBS/INGREDIENTS", prompt: "HERBS/INGREDIENTS to make a healing potion to heal one WOUND" },
    { value: "KEY", prompt: "KEY" },
    { value: "VEHICLE", prompt: "VEHICLE" },
    { value: "A TAME ANIMAL", prompt: "A TAME ANIMAL" },
    { value: "POTION", prompt: "POTION" },
    { value: "MACHINE PART", prompt: "MACHINE PART" },
    { value: "MAP", prompt: "MAP" },
    { value: "WEAPON", prompt: "WEAPON" },
    { value: "ARTEFACT/IDOL", prompt: "ARTEFACT/IDOL" },
    { value: "2 TREASURES", prompt: "2 TREASURES (for trading)" }
  ];
  
  const eventTable = [
    { value: "YOU MEET A FRIEND", prompt: "YOU MEET A FRIEND" },
    { value: "A STORM", prompt: "A STORM" },
    { value: "SOMETHING FALLS FROM THE CEILING", prompt: "SOMETHING FALLS FROM THE ‘CEILING’" },
    { value: "YOU FALL", prompt: "YOU FALL" },
    { value: "A LOUD NOISE", prompt: "A LOUD NOISE" },
    { value: "A STRANGE FEELING", prompt: "A STRANGE FEELING" },
    { value: "SUN SETS OR RISES", prompt: "SUN SETS OR RISES" },
    { value: "A FIRE STARTS", prompt: "A FIRE STARTS" },
    { value: "SOMETHING BREAKS", prompt: "SOMETHING BREAKS" },
    { value: "YOUR WAY IS BLOCKED", prompt: "YOUR WAY IS BLOCKED" },
    { value: "YOU ARE SURROUNDED", prompt: "YOU ARE SURROUNDED" },
    { value: "HUNGER SETS IN", prompt: "HUNGER SETS IN" },
    { value: "CREATE/REPAIR SOMETHING", prompt: "CREATE/REPAIR SOMETHING" }
  ];
  
  // Helper functions to "draw" an item or event card when needed
  function drawItem() {
    const item = randomChoice(itemTable);
    return `ITEM: ${item.prompt}`;
  }
  
  function drawEvent() {
    const event = randomChoice(eventTable);
    return `EVENT: ${event.prompt}`;
  }
  
  // Main function to draw a set of exploration cards based on the exploration score
  function drawCards(num) {
    let drawnCards = [];
    for (let i = 0; i < num; i++) {
      // Choose a random suit from the full set and a rank from explorationRanks
      const suit = randomChoice(suits);
      const rank = randomChoice(explorationRanks);
      let basePrompt = "";
      let extraPrompt = "";
  
      // Determine if red (♥, ♦) or black (♣, ♠)
      if (suit === "♥" || suit === "♦") {
        // Use red card mapping
        const mapping = redCardMapping[rank];
        if (mapping && mapping[suit]) {
          basePrompt = mapping[suit];
          // Check for instructions to draw an extra card prompt
          if (basePrompt.includes("Draw an ITEM card OR an EVENT card")) {
            // Randomly choose ITEM or EVENT
            extraPrompt = (Math.random() < 0.5) ? drawItem() : drawEvent();
          } else if (basePrompt.includes("Draw an ITEM card")) {
            extraPrompt = drawItem();
          } else if (basePrompt.includes("Draw an EVENT card")) {
            extraPrompt = drawEvent();
          }
        }
      } else {
        // Black cards (♣, ♠)
        const mapping = blackCardMapping[rank];
        if (mapping && mapping[suit]) {
          basePrompt = mapping[suit];
          // For Ace, the text tells you to "gain an item" – so automatically draw an item.
          if (rank === "A") {
            extraPrompt = drawItem();
          }
          // For prompts that instruct drawing an EVENT card
          if (basePrompt.includes("Draw an EVENT card")) {
            extraPrompt = drawEvent();
          }
        }
      }
      
      // Combine the base prompt and any extra prompt
      let fullPrompt = basePrompt;
      if (extraPrompt) {
        fullPrompt += " – " + extraPrompt;
      }
      
      drawnCards.push({ suit, rank, prompt: fullPrompt });
    }
    return drawnCards;
  }
  
  // Display drawn cards in the exploration panel
  function displayCards(cards) {
    const displayDiv = document.getElementById("cards-display");
    displayDiv.innerHTML = ""; // clear previous cards
    cards.forEach(card => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";
      const title = document.createElement("h3");
      title.innerText = `${card.rank} ${card.suit}`;
      cardDiv.appendChild(title);
      const promptPara = document.createElement("p");
      promptPara.innerText = card.prompt;
      cardDiv.appendChild(promptPara);
      displayDiv.appendChild(cardDiv);
    });
  }
  
  // Save a journal entry to the timeline
  function saveJournalEntry(text) {
    if (!text.trim()) {
      alert("Please write something in your journal before continuing.");
      return;
    }
    const timeline = document.getElementById("timeline");
    const listItem = document.createElement("li");
    // Use the first 40 characters as a summary for the timeline
    const summary = text.length > 40 ? text.substring(0, 40) + "..." : text;
    listItem.innerText = summary;
    // Save full text as a data attribute
    listItem.dataset.fullText = text;
    // Add event listener to show full text on click
    listItem.addEventListener("click", function() {
      openModal(this.dataset.fullText);
    });
    timeline.appendChild(listItem);
    // Clear the journal input and card display for next phase
    document.getElementById("journal-input").value = "";
    document.getElementById("cards-display").innerHTML = "";
  }
  
  // Modal handling: open modal with full journal text
  function openModal(text) {
    const modal = document.getElementById("modal");
    document.getElementById("modal-text").innerText = text;
    modal.classList.remove("hidden");
  }
  
  // Close modal when clicking the close button
  document.getElementById("close-modal").addEventListener("click", function() {
    document.getElementById("modal").classList.add("hidden");
  });
  
  // Set up event listeners for exploration and journaling
  document.getElementById("explore-btn").addEventListener("click", function() {
    const score = parseInt(document.getElementById("explorationScore").value) || 1;
    const cards = drawCards(score);
    displayCards(cards);
  });
  
  document.getElementById("continue-btn").addEventListener("click", function() {
    const journalText = document.getElementById("journal-input").value;
    saveJournalEntry(journalText);
  });
  