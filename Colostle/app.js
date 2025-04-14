// Global character object – will be filled upon creation.
let character = {};

// Utility function: returns a random element from an array.
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// For exploration, only use ranks A–10.
const explorationRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const suits = ["♥", "♦", "♣", "♠"];

// Mappings from the original exploration tables (pages 25–26)
// Red card mapping (for ♥ and ♦).
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
    "♥": "Another adventurer in Rook Armour appears. [Friendly]",
    "♦": "Another adventurer in Rook Armour appears. [Not friendly]"
  },
  "7": {
    "♥": "A gargoyle appears and takes you to a new area. [Taken to a new area]",
    "♦": "A gargoyle appears and carries you up to its nest. [Taken to the rafters]"
  },
  "8": {
    "♥": "You find a small settlement. [Safe]. Draw an ITEM card.",
    "♦": "You find a small settlement. [Event]. Draw an EVENT card."
  },
  "9": {
    "♥": "A massive skeleton stares at you. [Safe]",
    "♦": "A massive skeleton stares at you. [Bandit camp]"
  },
  "10": {
    "♥": "You pass by a camp of people unnoticed. [They don’t notice you]",
    "♦": "A camp captures you. [You are captured]"
  }
};

// Black card mapping (for ♣ and ♠).
const blackCardMapping = {
  "A": {
    "♠": "A large treasure appears. [Untouched]. Add 1 to your score and gain an item.",
    "♣": "A large treasure appears. [Evidence of attempted raids]. Add 1 to your score and gain an item."
  },
  "2": {
    "♠": "A mysterious door stands before you. [Intact/Locked].",
    "♣": "A mysterious door stands before you. [Ruined]."
  },
  "3": {
    "♠": "A grand staircase appears, leading up into mist. [Intact].",
    "♣": "A crumbling staircase appears, lost in ruin. [Ruined]."
  },
  "4": {
    "♠": "Ruins of a forgotten civilization beckon. [Somewhat intact]. Draw an EVENT card.",
    "♣": "Ruins of a forgotten civilization lie in rubble. [Mostly rubble]. Draw an EVENT card."
  },
  "5": {
    "♠": "A strange mechanism hums with life. [Functional].",
    "♣": "A strange mechanism sputters, barely working. [Damaged]."
  },
  "6": {
    "♠": "You skillfully avoid a trap. [You avoid it!].",
    "♣": "You are caught in a trap. [You are caught in it!]."
  },
  "7": {
    "♠": "A cave entrance seems inviting. [Flat and easily navigable].",
    "♣": "A cave entrance is deep and hard to scale. [Deep and hard to climb into]."
  },
  "8": {
    "♠": "The calm sea stretches before you. [Calm].",
    "♣": "The sea roils with a storm. [Stormy]."
  },
  "9": {
    "♠": "A clue to your calling is revealed. [Something you were looking for].",
    "♣": "A clue to your calling is revealed. [A clue to the next step]."
  },
  "10": {
    "♠": "You come upon a thriving city. [Thriving].",
    "♣": "You come upon an abandoned city. [Abandoned]."
  }
};

// Item and Event tables (from page 27)
const itemTable = [
  { prompt: "TREASURE (for trading)" },
  { prompt: "SUPPLIES" },
  { prompt: "KNOWLEDGE" },
  { prompt: "HERBS/INGREDIENTS to make a healing potion to heal one WOUND" },
  { prompt: "KEY" },
  { prompt: "VEHICLE" },
  { prompt: "A TAME ANIMAL" },
  { prompt: "POTION" },
  { prompt: "MACHINE PART" },
  { prompt: "MAP" },
  { prompt: "WEAPON" },
  { prompt: "ARTEFACT/IDOL" },
  { prompt: "2 TREASURES (for trading)" }
];

const eventTable = [
  { prompt: "YOU MEET A FRIEND" },
  { prompt: "A STORM" },
  { prompt: "SOMETHING FALLS FROM THE ‘CEILING’" },
  { prompt: "YOU FALL" },
  { prompt: "A LOUD NOISE" },
  { prompt: "A STRANGE FEELING" },
  { prompt: "SUN SETS OR RISES" },
  { prompt: "A FIRE STARTS" },
  { prompt: "SOMETHING BREAKS" },
  { prompt: "YOUR WAY IS BLOCKED" },
  { prompt: "YOU ARE SURROUNDED" },
  { prompt: "HUNGER SETS IN" },
  { prompt: "CREATE/REPAIR SOMETHING" }
];

function drawItem() {
  return "ITEM: " + randomChoice(itemTable).prompt;
}

function drawEvent() {
  return "EVENT: " + randomChoice(eventTable).prompt;
}

// Main exploration card draw function.
// Uses the red or black card mappings; if the prompt instructs an extra draw (item or event), appends the extra text.
function drawCards(num) {
  let drawnCards = [];
  for (let i = 0; i < num; i++) {
    const suit = randomChoice(suits);
    const rank = randomChoice(explorationRanks);
    let basePrompt = "";
    let extraPrompt = "";

    if (suit === "♥" || suit === "♦") {
      const mapping = redCardMapping[rank];
      if (mapping && mapping[suit]) {
        basePrompt = mapping[suit];
        if (basePrompt.includes("Draw an ITEM card OR an EVENT card")) {
          extraPrompt = (Math.random() < 0.5) ? drawItem() : drawEvent();
        } else if (basePrompt.includes("Draw an ITEM card")) {
          extraPrompt = drawItem();
        } else if (basePrompt.includes("Draw an EVENT card")) {
          extraPrompt = drawEvent();
        }
      }
    } else {
      const mapping = blackCardMapping[rank];
      if (mapping && mapping[suit]) {
        basePrompt = mapping[suit];
        if (rank === "A") {
          extraPrompt = drawItem();
        }
        if (basePrompt.includes("Draw an EVENT card")) {
          extraPrompt = drawEvent();
        }
      }
    }
    
    let fullPrompt = basePrompt;
    if (extraPrompt) {
      fullPrompt += " – " + extraPrompt;
    }
    
    drawnCards.push({ suit, rank, prompt: fullPrompt });
  }
  return drawnCards;
}

// Function to display drawn cards.
function displayCards(cards) {
  const displayDiv = document.getElementById("cards-display");
  displayDiv.innerHTML = "";
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

// Save journal entry to timeline.
function saveJournalEntry(text) {
  if (!text.trim()) {
    alert("Please write something in your journal before continuing.");
    return;
  }
  const timeline = document.getElementById("timeline");
  const listItem = document.createElement("li");
  const summary = text.length > 40 ? text.substring(0, 40) + "..." : text;
  listItem.innerText = summary;
  listItem.dataset.fullText = text;
  listItem.addEventListener("click", function() {
    openModal(this.dataset.fullText);
  });
  timeline.appendChild(listItem);
  document.getElementById("journal-input").value = "";
  document.getElementById("cards-display").innerHTML = "";
}

// Modal handling.
function openModal(text) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-text").innerText = text;
  modal.classList.remove("hidden");
}
document.getElementById("close-modal").addEventListener("click", function() {
  document.getElementById("modal").classList.add("hidden");
});

// Event listener for exploration (using character-assigned exploration score).
document.getElementById("explore-btn").addEventListener("click", function() {
  const expScore = character.explorationScore;
  const cards = drawCards(expScore);
  displayCards(cards);
});

// Event listener for journaling.
document.getElementById("continue-btn").addEventListener("click", function() {
  const journalText = document.getElementById("journal-input").value;
  saveJournalEntry(journalText);
});

// Character creation
document.getElementById("character-form").addEventListener("submit", function(event) {
  event.preventDefault();
  
  // Get values from dropdowns.
  const classSelect = document.getElementById("class-select");
  const callingSelect = document.getElementById("calling-select");
  const natureSelect = document.getElementById("nature-select");
  
  const selectedClass = classSelect.options[classSelect.selectedIndex];
  const charClass = selectedClass.text;
  const explorationScore = parseInt(selectedClass.getAttribute("data-exploration"));
  const combatScore = parseInt(selectedClass.getAttribute("data-combat"));
  
  const charCalling = callingSelect.options[callingSelect.selectedIndex].text;
  const charNature = natureSelect.options[natureSelect.selectedIndex].text;
  
  // Store character data.
  character = {
    class: charClass,
    calling: charCalling,
    nature: charNature,
    explorationScore,
    combatScore
  };

  // Update game header with character details.
  document.getElementById("char-class").innerText = character.class;
  document.getElementById("char-calling").innerText = character.calling;
  document.getElementById("char-nature").innerText = character.nature;
  document.getElementById("char-expl-score").innerText = character.explorationScore;
  document.getElementById("char-combat-score").innerText = character.combatScore;
  
  // Also show the fixed exploration score in the exploration controls.
  document.getElementById("exploration-score-display").innerText = character.explorationScore;
  
  // Hide character builder and show game header and exploration section.
  document.getElementById("character-builder").classList.add("hidden");
  document.getElementById("game-header").classList.remove("hidden");
  document.getElementById("exploration-section").classList.remove("hidden");
});
