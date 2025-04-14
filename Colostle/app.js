// Define the suits and ranks for a standard deck of cards
const suits = ["♥", "♦", "♣", "♠"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Sample prompt arrays (feel free to adjust or expand these arrays)
const redPrompts = [
  "A mysterious stranger in unusual robes appears, hinting at hidden knowledge.",
  "A dangerous beast lurks nearby, its eyes fixed on you.",
  "You encounter a person who seems essential to your calling.",
  "A cryptic message or inscription emerges from the shadows.",
  "A sudden twist of fate confronts you with an unexpected challenge."
];

const blackPrompts = [
  "A majestic, ancient doorway stands before you, promising secrets beyond.",
  "A glimmering treasure catches your eye amidst the ruins.",
  "An imposing staircase leads upward into mist and mystery.",
  "The ruins of a forgotten civilization whisper lost tales.",
  "A towering castle structure looms in the distance, full of enigmas."
];

// Utility function: Get a random element from an array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Function to simulate a card draw based on exploration score
function drawCards(num) {
  let drawnCards = [];
  for (let i = 0; i < num; i++) {
    const suit = randomChoice(suits);
    const rank = randomChoice(ranks);
    
    // Determine prompt based on suit color
    let prompt = "";
    if (suit === "♥" || suit === "♦") {
      prompt = randomChoice(redPrompts);
    } else {
      prompt = randomChoice(blackPrompts);
    }
    
    drawnCards.push({ suit, rank, prompt });
  }
  return drawnCards;
}

// Display drawn cards and their prompts in the exploration panel
function displayCards(cards) {
  const displayDiv = document.getElementById("cards-display");
  displayDiv.innerHTML = ""; // Clear previous results
  
  cards.forEach(card => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    
    const title = document.createElement("h3");
    title.innerText = `${card.rank} ${card.suit}`;
    cardDiv.appendChild(title);
    
    const prompt = document.createElement("p");
    prompt.innerText = card.prompt;
    cardDiv.appendChild(prompt);
    
    displayDiv.appendChild(cardDiv);
  });
}

// Save journal entry to the timeline
function saveJournalEntry(text) {
  if (!text.trim()) {
    alert("Please write something in your journal before continuing.");
    return;
  }
  const timeline = document.getElementById("timeline");
  const listItem = document.createElement("li");
  
  // Create a summary (first 40 characters) for the timeline list
  const summary = text.length > 40 ? text.substring(0, 40) + "..." : text;
  listItem.innerText = summary;
  
  // Store the full text in a data attribute for later viewing
  listItem.dataset.fullText = text;
  
  // Add click event to open modal for full text view
  listItem.addEventListener("click", function() {
    openModal(this.dataset.fullText);
  });
  
  timeline.appendChild(listItem);
  
  // Clear the journal input
  document.getElementById("journal-input").value = "";
  
  // Clear the cards display for the next phase
  document.getElementById("cards-display").innerHTML = "";
}

// Open the modal to display saved journal entry
function openModal(text) {
  const modal = document.getElementById("modal");
  document.getElementById("modal-text").innerText = text;
  modal.classList.remove("hidden");
}

// Close modal when clicking the close button
document.getElementById("close-modal").addEventListener("click", function() {
  document.getElementById("modal").classList.add("hidden");
});

// Set up event listeners for Explore and Continue buttons
document.getElementById("explore-btn").addEventListener("click", function() {
  // Get the exploration score from input
  const score = parseInt(document.getElementById("explorationScore").value) || 1;
  const cards = drawCards(score);
  displayCards(cards);
});

document.getElementById("continue-btn").addEventListener("click", function() {
  const journalText = document.getElementById("journal-input").value;
  saveJournalEntry(journalText);
});
