// Global character object, episode counter, and timeline data.
let character = {};
let episodeCount = 0;
let currentLocation = "The Colostle";

// Utility: returns a random element from an array.
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Full deck: all 13 ranks.
const allRanks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = ["♥", "♦", "♣", "♠"];

/* --- Card Mappings --- */
// Red card mapping for ranks A–10.
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

// Black card mapping for ranks A–10.
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

// Face card mapping for Rook encounters.
const faceCardMapping = {
  "J": "Rook Encounter: You are surrounded by a horde of minor Rooks.",
  "Q": "Rook Encounter: A medium-sized Rook appears before you.",
  "K": "Rook Encounter: A massive Rook looms over you in terrifying grandeur."
};

const oceanRedMapping = {
    "A": {
      "♥": "An uncharted island emerges on the horizon. [Quiet coast]",
      "♦": "A mysterious ship sails by. [Armed coast guard]"
    },
    "2": {
      "♥": "A pod of dolphins guides your vessel. [Easy Passage]",
      "♦": "A school of aggressive fish attacks. [Dangerous]"
    },
    "3": {
      "♥": "A message in a bottle washes ashore. [Friendly]",
      "♦": "A stranded sailor appears. [Not friendly]"
    },
    "4": {
      "♥": "A merchant ship offers trade. [Trustworthy]",
      "♦": "A pirate ship signals war. [Untrustworthy]"
    },
    "5": {
      "♥": "A calm bay offers safe harbor. [Seems safe]",
      "♦": "A turbulent squall approaches. [Something’s off]"
    },
    "6": {
      "♥": "Fellow adventurers on a ship offer alliance. [Friendly]",
      "♦": "A rival captain challenges you. [Not friendly]"
    },
    "7": {
      "♥": "A sea monster emerges, guiding you to hidden treasure. [Taken to a new course]",
      "♦": "A whirlpool threatens to pull you under. [Taken off course]"
    },
    "8": {
      "♥": "You find an abandoned lighthouse. [Calm light]",
      "♦": "You see a ghost ship in the mist. [Haunting]"
    },
    "9": {
      "♥": "A coral reef teems with marine life. [Safe passage]",
      "♦": "An oil spill makes the area hazardous. [Doomed]"
    },
    "10": {
      "♥": "A bustling port city is in sight. [Harboring opportunity]",
      "♦": "A deserted dock challenges you. [Abandoned]"
    }
  };
  
  const oceanBlackMapping = {
    "A": {
      "♠": "A hidden treasure chest floats near a rock. [Untouched]",
      "♣": "Remains of a sunken ship hint at attempted raids. [Evidence]"
    },
    "2": {
      "♠": "A rickety bridge of ice connects two icebergs. [Intact/Locked]",
      "♣": "The ice bridge is partially melted. [Ruined]"
    },
    "3": {
      "♠": "A towering iceberg forms a staircase into the sky. [Intact]",
      "♣": "An iceberg collapses, showing its old ruins. [Ruined]"
    },
    "4": {
      "♠": "Frozen remains of an ancient vessel. [Somewhat intact]. Draw an EVENT card.",
      "♣": "The ship is broken apart in the ice. [Mostly rubble]. Draw an EVENT card."
    },
    "5": {
      "♠": "A frozen mechanism churns in the ice. [Functional]",
      "♣": "The mechanism is iced over and sputtering. [Damaged]"
    },
    "6": {
      "♠": "You skate gracefully across the frozen lake. [You avoid it!]",
      "♣": "You slip on the ice. [You are caught in it!]"
    },
    "7": {
      "♠": "An ice cave beckons. [Flat and easily navigable]",
      "♣": "A deep crevasse hides within the ice. [Deep and hard to climb into]"
    },
    "8": {
      "♠": "A calm, frozen sea lies ahead. [Calm]",
      "♣": "A blizzard shakes the frozen ocean. [Stormy]"
    },
    "9": {
      "♠": "A glimmering clue in the ice is revealed. [Something you were looking for]",
      "♣": "The clue is obscured by heavy frost. [A clue to the next step]"
    },
    "10": {
      "♠": "You approach a thriving icy harbor. [Thriving]",
      "♣": "An abandoned icy port lies silent. [Abandoned]"
    }
  };
  
  const oceanFaceMapping = {
    "J": "Ocean Encounter: A swarm of ice-crusted minions surrounds you.",
    "Q": "Ocean Encounter: A medium-sized kraken emerges from the deep.",
    "K": "Ocean Encounter: A colossal Leviathan surfaces with a mighty roar."
  };

// --- Cities Tables ---
const cityRedMapping = {
  "A": { "♥": "A grand palace grounds. [Noble district]", "♦": "A busy marketplace in a city district. [Trading]" },
  "2": { "♥": "A quiet residential area full of life. [Safe]", "♦": "A slum area with potential for danger. [Risky]" },
  "3": { "♥": "A cultural center with art and literature. [Inspiring]", "♦": "A shady alley full of whispers. [Dangerous]" },
  "4": { "♥": "An affluent neighborhood with elegant architecture. [Trusted]", "♦": "A derelict building with rumors of hauntings. [Untrusted]" },
  "5": { "♥": "A vibrant town square bustling with activity. [Energetic]", "♦": "A city district darkened by crime. [Menacing]" },
  "6": { "♥": "A public plaza where citizens gather to celebrate. [Friendly]", "♦": "A district in turmoil with riots. [Chaotic]" },
  "7": { "♥": "An ancient monument steeped in local lore. [Revered]", "♦": "A neglected memorial that holds a grim secret. [Foreboding]" },
  "8": { "♥": "A well-maintained civic center. [Organized]", "♦": "An abandoned civic building. [Deserted]" },
  "9": { "♥": "A grand theatre showcasing the best of local art. [Majestic]", "♦": "A crumbling theatre haunted by memories. [Haunting]" },
  "10": { "♥": "A flourishing new city district. [Innovative]", "♦": "A dilapidated part of the city in decline. [Fallen]" }
};

const cityBlackMapping = {
  "A": { "♠": "A majestic city hall stands proud. [Untouched]", "♣": "A city hall showing signs of corruption. [Tarnished]" },
  "2": { "♠": "A guarded library of ancient lore. [Intact/Locked]", "♣": "A burned-down archive of lost knowledge. [Ruined]" },
  "3": { "♠": "A soaring skyscraper that pierces the sky. [Intact]", "♣": "A skyscraper in decay, collapsing under neglect. [Ruined]" },
  "4": { "♠": "Modern bridges connect bustling districts. [Functional]", "♣": "A disrepair infrastructure failing in critical areas. [Damaged]" },
  "5": { "♠": "A stately museum of the city's history. [Well-preserved]", "♣": "An abandoned museum with broken exhibits. [Neglected]" },
  "6": { "♠": "A lively community center fosters hope. [Vibrant]", "♣": "A decaying community center bearing the scars of conflict. [Battered]" },
  "7": { "♠": "Elegant towers hint at prosperous business. [Flourishing]", "♣": "Empty, shell-like structures mark failed commerce. [Deserted]" },
  "8": { "♠": "A modern transit hub efficiently connecting the city. [Smooth]", "♣": "A chaotic transport station with gridlock. [Disorderly]" },
  "9": { "♠": "A cultural festival fills the streets with joy. [Celebratory]", "♣": "A spontaneous riot disrupts celebrations. [Tumultuous]" },
  "10": { "♠": "A new urban development promising a bright future. [Thriving]", "♣": "An urban sprawl overwhelmed by decay. [Abandoned]" }
};

const cityFaceMapping = {
  "J": "City Encounter: A street gang challenges your authority.",
  "Q": "City Encounter: A local dignitary offers valuable insights.",
  "K": "City Encounter: A crisis erupts that reshapes the urban landscape."
};

// Item and Event tables.
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
  return randomChoice(itemTable).prompt;
}

function drawEvent() {
  return randomChoice(eventTable).prompt;
}

// drawCards function now includes face cards as Rook encounters.  
function drawCards(num) {
    let drawnCards = [];
    let table;
    
    if (currentLocation === "Oceans") {
      table = {
        redMapping: oceanRedMapping,
        blackMapping: oceanBlackMapping,
        faceMapping: oceanFaceMapping
      };
    } else if (currentLocation === "Cities") {
      table = {
        redMapping: cityRedMapping,
        blackMapping: cityBlackMapping,
        faceMapping: cityFaceMapping
      };
    } else {
      table = {
        redMapping: redCardMapping,
        blackMapping: blackCardMapping,
        faceMapping: faceCardMapping
      };
    }
    
    for (let i = 0; i < num; i++) {
      const suit = randomChoice(suits);
      const rank = randomChoice(allRanks);
      
      // Face cards (Rook/Encounter) handling.
      if (["J", "Q", "K"].includes(rank)) {
        let basePrompt = table.faceMapping[rank];
        if (currentLocation === "Oceans") {
          const reward = drawItem();
          drawnCards.push({ suit, rank, prompt: `${basePrompt} – Reward: ${reward}` });
        } else if (currentLocation === "Cities") {
          const reward = drawItem();
          drawnCards.push({ suit, rank, prompt: `${basePrompt} – Reward: ${reward}` });
        } else {
          let rookType = randomChoice(["Electric", "Rumble", "Ice"]);
          const reward = drawItem();
          drawnCards.push({ suit, rank, prompt: `${basePrompt} – ${rookType} Rook – Reward: ${reward}` });
        }
        continue;
      }
      
      let basePrompt = "";
      let extraPrompt = "";
      if (suit === "♥" || suit === "♦") {
        const mapping = table.redMapping[rank];
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
        const mapping = table.blackMapping[rank];
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

// Journal entries are prefixed with "Episode X:".
function saveJournalEntry(text) {
  if (!text.trim()) {
    alert("Please write something in your journal before continuing.");
    return;
  }
  episodeCount++;
  const journalText = `Episode ${episodeCount}: ${text.trim()}`;
  
  const timeline = document.getElementById("timeline");
  const listItem = document.createElement("li");
  const summary = journalText.length > 40 ? journalText.substring(0, 40) + "..." : journalText;
  listItem.innerText = summary;
  listItem.dataset.fullText = journalText;
  listItem.addEventListener("click", function() {
    openModal(this.dataset.fullText);
  });
  timeline.appendChild(listItem);
  document.getElementById("journal-input").value = "";
  document.getElementById("cards-display").innerHTML = "";
}

function openModal(text) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-text").innerText = text;
  modal.classList.remove("hidden");
}
document.getElementById("close-modal").addEventListener("click", function() {
  document.getElementById("modal").classList.add("hidden");
});

// Update inventory display.
function updateInventoryDisplay() {
  const invDisplay = document.getElementById("info-inventory");
  if (character.inventory.length === 0) {
    invDisplay.innerText = "None";
  } else {
    invDisplay.innerText = character.inventory.join(", ");
  }
}

// Exploration uses the character's assigned exploration score.
document.getElementById("explore-btn").addEventListener("click", function() {
  const cards = drawCards(character.explorationScore);
  displayCards(cards);
});

document.getElementById("continue-btn").addEventListener("click", function() {
  const journalText = document.getElementById("journal-input").value;
  saveJournalEntry(journalText);
});

// Add Item button.
document.getElementById("add-item-btn").addEventListener("click", function() {
  let newItem = prompt("Enter an item to add:");
  if (newItem) {
    character.inventory.push(newItem);
    updateInventoryDisplay();
  }
});

// Remove Item button.
document.getElementById("remove-item-btn").addEventListener("click", function() {
  if (character.inventory.length === 0) {
    alert("Your inventory is empty!");
    return;
  }
  let itemToRemove = prompt("Enter the name of the item to remove:\nInventory: " + character.inventory.join(", "));
  if (itemToRemove) {
    const index = character.inventory.indexOf(itemToRemove);
    if (index > -1) {
      character.inventory.splice(index, 1);
      updateInventoryDisplay();
    } else {
      alert("Item not found in inventory.");
    }
  }
});

// Update Score button: prompts for new Exploration and Combat scores.
document.getElementById("update-score-btn").addEventListener("click", function() {
  let newExplScore = prompt("Enter new Exploration Score (0-5):", character.explorationScore);
  let newCombScore = prompt("Enter new Combat Score (0-5):", character.combatScore);
  newExplScore = parseInt(newExplScore);
  newCombScore = parseInt(newCombScore);
  if (!isNaN(newExplScore) && newExplScore >= 0 && newExplScore <= 5) {
    character.explorationScore = newExplScore;
    document.getElementById("info-exploration").innerText = character.explorationScore;
    document.getElementById("exploration-score-display").innerText = character.explorationScore;
  } else {
    alert("Invalid Exploration Score.");
  }
  if (!isNaN(newCombScore) && newCombScore >= 0 && newCombScore <= 5) {
    character.combatScore = newCombScore;
    document.getElementById("info-combat").innerText = character.combatScore;
  } else {
    alert("Invalid Combat Score.");
  }
});

// Change Location button: changes which table is used when drawing cards.
document.getElementById("change-location-btn").addEventListener("click", function() {
    document.getElementById("location-modal").classList.remove("hidden");
  });
  
  document.getElementById("close-location-modal").addEventListener("click", function() {
    document.getElementById("location-modal").classList.add("hidden");
  });
  
  document.getElementById("set-location-btn").addEventListener("click", function() {
    const sel = document.getElementById("location-select");
    const choice = sel.value;
    currentLocation = choice;
    alert("Location changed to " + currentLocation);
    document.getElementById("location-modal").classList.add("hidden");
  });
  
  

// Save Game button: download the game state as a JSON file.
document.getElementById("save-game-btn").addEventListener("click", function() {
  const timelineElements = document.querySelectorAll("#timeline li");
  let timelineData = [];
  timelineElements.forEach(li => {
    timelineData.push(li.dataset.fullText);
  });
  
  const gameState = {
    character: character,
    episodeCount: episodeCount,
    timeline: timelineData
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "colostle_save.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// Load Game button: load game state from uploaded JSON.
document.getElementById("load-game-btn").addEventListener("click", function() {
  const fileInput = document.getElementById("upload-file");
  if (!fileInput.files.length) {
    alert("Please choose a file to upload.");
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const gameState = JSON.parse(e.target.result);
      // Update global state.
      character = gameState.character;
      episodeCount = gameState.episodeCount || 0;
      
      // Update timeline.
      const timeline = document.getElementById("timeline");
      timeline.innerHTML = "";
      if (gameState.timeline && Array.isArray(gameState.timeline)) {
        gameState.timeline.forEach(entry => {
          const li = document.createElement("li");
          li.innerText = entry.length > 40 ? entry.substring(0, 40) + "..." : entry;
          li.dataset.fullText = entry;
          li.addEventListener("click", function() {
            openModal(this.dataset.fullText);
          });
          timeline.appendChild(li);
        });
      }
      
      // Update UI elements.
      document.getElementById("info-exploration").innerText = character.explorationScore;
      document.getElementById("info-combat").innerText = character.combatScore;
      document.getElementById("exploration-score-display").innerText = character.explorationScore;
      updateInventoryDisplay();
      
      // Hide the character builder, show exploration and info box.
      document.getElementById("character-builder").classList.add("hidden");
      document.getElementById("exploration-section").classList.remove("hidden");
      document.getElementById("info-box").classList.remove("hidden");
    } catch (err) {
      alert("Error loading saved game. Make sure the file is a valid game save.");
    }
  };
  reader.readAsText(file);
});

// View Character button: open character sheet modal.
document.getElementById("view-char-btn").addEventListener("click", function() {
  const charInfo = `
    <h2>Character Sheet</h2>
    <p><strong>Class:</strong> ${character.class}</p>
    <p><strong>Calling:</strong> ${character.calling}</p>
    <p><strong>Nature:</strong> ${character.nature}</p>
    <p><strong>Exploration Score:</strong> ${character.explorationScore} / 5</p>
    <p><strong>Combat Score:</strong> ${character.combatScore} / 5</p>
    <p><strong>Inventory:</strong> ${character.inventory.length ? character.inventory.join(", ") : "None"}</p>
  `;
  document.getElementById("char-modal-text").innerHTML = charInfo;
  document.getElementById("char-modal").classList.remove("hidden");
});
document.getElementById("close-char-modal").addEventListener("click", function() {
  document.getElementById("char-modal").classList.add("hidden");
});

// Character creation: on form submit.
document.getElementById("character-form").addEventListener("submit", function(event) {
  event.preventDefault();
  
  const classSelect = document.getElementById("class-select");
  const callingSelect = document.getElementById("calling-select");
  const natureSelect = document.getElementById("nature-select");
  
  const selectedClass = classSelect.options[classSelect.selectedIndex];
  const charClass = selectedClass.text;
  const explorationScore = parseInt(selectedClass.getAttribute("data-exploration"));
  const combatScore = parseInt(selectedClass.getAttribute("data-combat"));
  
  const charCalling = callingSelect.options[callingSelect.selectedIndex].text;
  const charNature = natureSelect.options[natureSelect.selectedIndex].text;
  
  // Save character info.
  character = {
    class: charClass,
    calling: charCalling,
    nature: charNature,
    explorationScore,
    combatScore,
    inventory: []
  };
  
  // Update info box.
  document.getElementById("info-exploration").innerText = character.explorationScore;
  document.getElementById("info-combat").innerText = character.combatScore;
  updateInventoryDisplay();
  
  // Hide character builder; show exploration section and info box.
  document.getElementById("character-builder").classList.add("hidden");
  document.getElementById("exploration-section").classList.remove("hidden");
  document.getElementById("info-box").classList.remove("hidden");
});
