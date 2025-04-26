// ----- CARD DATA -----
const CARD_DEFINITIONS = [
  {
    name: "Dragon",
    moves: [
      [-2, 1],
      [-1, 1],
      [1, -1],
      [2, -1],
    ],
  },
  {
    name: "Tiger",
    moves: [
      [0, -2],
      [0, 1],
    ],
  },
  {
    name: "Ox",
    moves: [
      [0, -1],
      [0, 1],
      [-1, 0],
    ],
  },
  {
    name: "Crab",
    moves: [
      [0, -1],
      [-2, 0],
      [2, 0],
    ],
  },
  {
    name: "Monkey",
    moves: [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ],
  },
  {
    name: "Elephant",
    moves: [
      [-1, 0],
      [-1, 1],
      [1, 0],
      [1, 1],
    ],
  },
  {
    name: "Crane",
    moves: [
      [0, -1],
      [-1, 1],
      [1, 1],
    ],
  },
  {
    name: "Rabbit",
    moves: [
      [1, -1],
      [2, 1],
      [-1, 1],
    ],
  },
  {
    name: "Goose",
    moves: [
      [-1, 0],
      [-1, 1],
      [1, 0],
      [1, -1],
    ],
  },
  {
    name: "Rooster",
    moves: [
      [1, 0],
      [1, 1],
      [-1, 0],
      [-1, -1],
    ],
  },
  {
    name: "Boar",
    moves: [
      [0, -1],
      [-1, 0],
      [1, 0],
    ],
  },
  {
    name: "Horse",
    moves: [
      [0, -1],
      [0, 1],
      [1, 0],
    ],
  },
  {
    name: "Frog",
    moves: [
      [-2, 0],
      [1, 1],
      [-1, -1],
    ],
  },
  {
    name: "Mantis",
    moves: [
      [0, -1],
      [-1, 1],
      [1, 1],
    ],
  },
  {
    name: "Eel",
    moves: [
      [-1, 0],
      [1, 1],
      [1, -1],
    ],
  },
];

// ----- STATE -----
let currentPlayer = "player"; // 'player' (blue) or 'opponent' (red)
let hands = { player: [], opponent: [], center: null };
let selectedCard = null,
  selectedPiece = null;

// ----- INIT -----
window.onload = () => {
  buildBoard();
  deal();
  renderHands();
  updateTurnTitle();
  placeInitialPieces();
};

/* Build 5×5 */
function buildBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.onclick = onCellClick;
      board.appendChild(cell);
    }
  }
}

/* Shuffle & deal */
function deal() {
  const deck = [...CARD_DEFINITIONS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  hands.player = deck.splice(0, 2);
  hands.opponent = deck.splice(0, 2);
  hands.center = deck.splice(0, 1)[0];
}

/* Draw both hands as grids */
function renderHands() {
  ["player", "opponent"].forEach((side) => {
    const container = document.getElementById(`${side}-cards`);
    container.innerHTML = "";
    hands[side].forEach((cardDef, idx) => {
      const cardEl = createCardElement(cardDef, side);
      if (side === currentPlayer) {
        cardEl.onclick = () => {
          selectedCard = cardDef;
          clearCardSelection();
          cardEl.classList.add("selected");
        };
      }
      container.appendChild(cardEl);
    });
  });
  updateTurnTitle();
}

/* Build one card as a 5×5 grid */
/**
 * Build one card as a 5×5 grid, flipping the moves
 * if it’s **not** the active player’s card.
 */
function createCardElement(cardDef, side) {
  const el = document.createElement("div");
  el.classList.add("card");
  if (side !== currentPlayer) el.classList.add("disabled");

  // name label
  const title = document.createElement("div");
  title.classList.add("card-name");
  title.textContent = cardDef.name;
  el.appendChild(title);

  // determine flip: bottom (active) = normal, top (inactive) = flipped
  const flipped = side !== currentPlayer;

  // draw the 5×5 grid
  const grid = document.createElement("div");
  grid.classList.add("card-grid");
  for (let yy = 0; yy < 5; yy++) {
    for (let xx = 0; xx < 5; xx++) {
      const cell = document.createElement("div");
      cell.classList.add("card-cell");
      if (xx === 2 && yy === 2) cell.classList.add("center");

      // plot each move, flipping if needed
      cardDef.moves.forEach(([dx, dy]) => {
        // if flipped, invert both axes
        const mdx = flipped ? -dx : dx;
        const mdy = flipped ? -dy : dy;
        // note: y index goes top→bottom, so we subtract mdy
        if (xx === 2 + mdx && yy === 2 - mdy) {
          cell.classList.add("move", side);
        }
      });

      grid.appendChild(cell);
    }
  }
  el.appendChild(grid);
  return el;
}

/* Place Blue + Red pieces */
function placeInitialPieces() {
  document.querySelectorAll(".piece").forEach((p) => p.remove());
  for (let x = 0; x < 5; x++) {
    placePiece(x, 4, "player", x === 2 ? "master" : "student");
    placePiece(x, 0, "opponent", x === 2 ? "master" : "student");
  }
}
function placePiece(x, y, side, role) {
  const cell = document.querySelector(`.cell[data-x='${x}'][data-y='${y}']`);
  const p = document.createElement("div");
  p.classList.add("piece", side, role);
  p.onclick = onPieceClick;
  cell.appendChild(p);
}

/* Update header */
function updateTurnTitle() {
  const hh = document.getElementById("turn-title");
  if (currentPlayer === "player") {
    hh.textContent = "Blue's Turn";
    hh.style.color = "var(--blue)";
  } else {
    hh.textContent = "Red's Turn";
    hh.style.color = "var(--red)";
  }
}

/* Movement logic */
function onPieceClick(evt) {
  if (!selectedCard) return;
  const cell = evt.currentTarget.parentElement;
  selectedPiece = { x: +cell.dataset.x, y: +cell.dataset.y };
  highlightMoves();
}

function highlightMoves() {
  clearHighlights();
  selectedCard.moves.forEach(([dx, dy]) => {
    const tx = selectedPiece.x + dx;
    const ty = selectedPiece.y - dy * (currentPlayer === "player" ? 1 : -1);
    const tgt = document.querySelector(`.cell[data-x='${tx}'][data-y='${ty}']`);
    if (tgt) tgt.classList.add("highlight");
  });
}

function onCellClick(evt) {
  const cell = evt.currentTarget;
  if (!selectedCard || !cell.classList.contains("highlight")) return;

  // move / capture
  const from = document.querySelector(
    `.cell[data-x='${selectedPiece.x}'][data-y='${selectedPiece.y}']`,
  );
  if (cell.firstChild) cell.firstChild.remove();
  const piece = from.querySelector(".piece");
  cell.appendChild(piece);

  // swap with center (unused but kept for full rules)
  const hand = hands[currentPlayer];
  const i = hand.findIndex((c) => c.name === selectedCard.name);
  [hand[i], hands.center] = [hands.center, hand[i]];

  // reset & next turn
  selectedCard = selectedPiece = null;
  currentPlayer = currentPlayer === "player" ? "opponent" : "player";
  renderHands();
  clearHighlights();
  updateTurnTitle();
}

/* Helpers */
function clearHighlights() {
  document
    .querySelectorAll(".cell.highlight")
    .forEach((c) => c.classList.remove("highlight"));
}
function clearCardSelection() {
  document
    .querySelectorAll(".card.selected")
    .forEach((c) => c.classList.remove("selected"));
}
