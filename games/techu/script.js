// script.js
// Techu pass & play (with first‐draw fix, full connectivity, and proper setup‐selection)

console.log("Techu script loaded");

const RANKS = [
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
  "A",
];
let decks = { red: [], black: [] };
let hands = { red: [], black: [] };
let board = [];
let currentPlayer = null;
let phase = "setup";
let setupPlays = { red: null, black: null };
let selectedCard = null;

// UI refs
const boardEl = document.getElementById("board");
const infoEl = document.getElementById("info");
const handEl = document.getElementById("hand");
const discardBtn = document.getElementById("discardBtn");

initGame();

function initGame() {
  decks.red = makeHalfDeck("red");
  decks.black = makeHalfDeck("black");
  shuffle(decks.red);
  shuffle(decks.black);

  board = Array(5)
    .fill()
    .map(() => Array(5).fill(null));
  hands.red = drawMany(decks.red, 3);
  hands.black = drawMany(decks.black, 3);

  // Build grid
  boardEl.innerHTML = "";
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.id = `cell-${r}-${c}`;
      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
  discardBtn.addEventListener("click", onDiscard);

  phase = "setup";
  setupTurn("black");
  render();
}

function makeHalfDeck(color) {
  const arr = [];
  for (let rank of RANKS) {
    // two of each rank per color
    arr.push({ rank, color }, { rank, color });
  }
  return arr;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function drawMany(deck, n) {
  return deck.splice(0, n);
}

function setupTurn(player) {
  currentPlayer = player;
  selectedCard = null; // clear any leftover selection
  infoEl.textContent = `SETUP: ${player.toUpperCase()} – select a card then click home‐center.`;
  render();
}

function finishSetup() {
  // place the two home‐center cards
  placeAt("black", 0, 2, setupPlays.black);
  placeAt("red", 4, 2, setupPlays.red);

  // decide who draws first (lowest wins)
  const r = RANKS.indexOf(setupPlays.red.rank);
  const b = RANKS.indexOf(setupPlays.black.rank);
  if (r < b) currentPlayer = "red";
  else if (b < r) currentPlayer = "black";
  else currentPlayer = Math.random() < 0.5 ? "red" : "black";

  // draw up to 3 for the starter
  if (hands[currentPlayer].length < 3) {
    const card = decks[currentPlayer].shift();
    if (card) hands[currentPlayer].push(card);
  }

  phase = "play";
  infoEl.textContent = `${currentPlayer.toUpperCase()} to play (drew to 3).`;
  render();
}

function onCellClick(r, c) {
  // ─── SETUP PHASE ───
  if (phase === "setup") {
    const homeRow = currentPlayer === "black" ? 0 : 4;
    const homeCol = 2;
    // only allow clicking exactly on home‐center
    if (r !== homeRow || c !== homeCol) return;

    // require a selection
    if (selectedCard === null) {
      alert("Please click a card in your hand to select it.");
      return;
    }

    // remove *that* card from your hand
    const card = hands[currentPlayer].splice(selectedCard, 1)[0];
    selectedCard = null; // clear the selection
    setupPlays[currentPlayer] = card; // record the play

    // move to next setup or start the game
    if (currentPlayer === "black") setupTurn("red");
    else finishSetup();

    return;
  }

  // ─── NORMAL PLAY PHASE ───
  if (phase !== "play" || selectedCard === null) return;
  const card = hands[currentPlayer][selectedCard];
  if (isValidMove(currentPlayer, card, r, c)) {
    hands[currentPlayer].splice(selectedCard, 1);
    placeAt(currentPlayer, r, c, card);
    endTurn();
  } else {
    alert("Invalid placement!");
  }
}

function renderHand() {
  handEl.innerHTML = "";
  hands[currentPlayer].forEach((card, i) => {
    const btn = document.createElement("button");
    btn.textContent = card.rank;
    btn.className = `hand-card ${card.color}-card`;
    if (i === selectedCard) btn.classList.add("selected");
    btn.onclick = () => {
      selectedCard = i === selectedCard ? null : i;
      render();
    };
    handEl.appendChild(btn);
  });
}

function onDiscard() {
  if (selectedCard === null) return;
  hands[currentPlayer].splice(selectedCard, 1);
  selectedCard = null;
  endTurn();
}

// BFS connectivity + rank rules
function isValidMove(player, card, r, c) {
  const occ = board[r][c];
  if (occ && occ.rank === card.rank) return false;
  if (occ && RANKS.indexOf(card.rank) < RANKS.indexOf(occ.rank)) return false;

  const homeRow = player === "black" ? 0 : 4;
  const visited = Array(5)
    .fill()
    .map(() => Array(5).fill(false));
  const queue = [[r, c]];
  visited[r][c] = true;

  while (queue.length) {
    const [cr, cc] = queue.shift();
    if (cr === homeRow) return true;
    for (let [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nr = cr + dr,
        nc = cc + dc;
      if (nr < 0 || nr > 4 || nc < 0 || nc > 4) continue;
      if (visited[nr][nc]) continue;
      const nbr = board[nr][nc];
      if (nbr && nbr.color === player) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return false;
}

function placeAt(player, r, c, card) {
  board[r][c] = { ...card };
}

function endTurn() {
  selectedCard = null;
  const decksEmpty = !decks.red.length && !decks.black.length;
  const handsEmpty = !hands.red.length && !hands.black.length;
  if (decksEmpty && handsEmpty) return gameOver();

  currentPlayer = currentPlayer === "red" ? "black" : "red";
  if (hands[currentPlayer].length < 3) {
    const d = decks[currentPlayer].shift();
    if (d) hands[currentPlayer].push(d);
  }
  infoEl.textContent = `${currentPlayer.toUpperCase()}'s turn.`;
  render();
}

function gameOver() {
  let cnt = { red: 0, black: 0 };
  board.flat().forEach((c) => {
    if (c) cnt[c.color]++;
  });
  const winner =
    cnt.red > cnt.black ? "Red" : cnt.black > cnt.red ? "Black" : "Tie";
  alert(`Game Over!\nRed: ${cnt.red}\nBlack: ${cnt.black}\n→ ${winner} wins!`);
  infoEl.textContent = "🔔 Game Over!";
  phase = "done";
}

function render() {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const el = document.getElementById(`cell-${r}-${c}`);
      el.innerHTML = "";
      el.classList.remove("available");
      const v = board[r][c];
      if (v) {
        const d = document.createElement("div");
        d.className = `card ${v.color}-card`;
        d.textContent = v.rank;
        el.appendChild(d);
      } else if (phase === "play" && selectedCard !== null) {
        const card = hands[currentPlayer][selectedCard];
        if (isValidMove(currentPlayer, card, r, c)) {
          el.classList.add("available");
        }
      }
    }
  }
  renderHand();
}
