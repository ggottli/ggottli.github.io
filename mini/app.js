(function () {
  const gridEl = document.getElementById("grid");
  const cluesAcrossEl = document.getElementById("cluesAcross");
  const cluesDownEl = document.getElementById("cluesDown");
  const timerEl = document.getElementById("timer");
  const cursorInfoEl = document.getElementById("cursorInfo");
  const datePicker = document.getElementById("datePicker");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnCheck = document.getElementById("btnCheck");
  const btnReveal = document.getElementById("btnReveal");
  const btnReset = document.getElementById("btnReset");

  const STATE = {
    puzzle: null,
    cells: [],
    entries: [],
    cursor: { dir: "across", entryIndex: 0, pos: 0 },
    startTime: null,
    timerId: null,
  };

  const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  async function loadFor(date) {
    datePicker.value = date;
    let data;
    try {
      data = await fetchJson(`puzzles/${date}.json`);
    } catch (e) {
      try {
        const bank = await fetchJson("puzzles/bank.json");
        if (Array.isArray(bank) && bank.length) {
          const seed = Number(date.replaceAll("-", ""));
          const pick = bank[seed % bank.length];
          data = JSON.parse(JSON.stringify(pick));
          data.date = date;
        } else throw new Error("Empty bank");
      } catch (err) {
        console.warn("No puzzle for date and no bank.json; loading sample.");
        data = await fetchJson("puzzles/2025-08-29.json");
        data.date = date;
      }
    }
    initPuzzle(data);
  }

  async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  }

  function initPuzzle(puz) {
    if (STATE.timerId) clearInterval(STATE.timerId);
    STATE.puzzle = puz;
    STATE.cells = [];
    STATE.entries = [];
    STATE.cursor = { dir: "across", entryIndex: 0, pos: 0 };
    try {
      buildGrid(puz);
      buildEntriesAndClues(puz); // derive from grid; then attach clues/answers by num
      attachHandlers();
      restoreProgress(puz.date);
      startTimer(puz.date);
    } catch (err) {
      console.error(err);
      toast("Puzzle failed to load. Check JSON format.");
    }
  }

  function buildGrid(puz) {
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${puz.size.cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${puz.size.rows}, 1fr)`;

    const { rows, cols } = puz.size;
    for (let r = 0; r < rows; r++) {
      STATE.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const ch = puz.grid[r][c];
        const cell = document.createElement("div");
        cell.className = "cell" + (ch === "." ? " black" : "");
        cell.role = "gridcell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        if (ch !== ".") {
          const input = document.createElement("input");
          input.maxLength = 1;
          input.autocapitalize = "characters";
          input.inputMode = "latin";
          input.ariaLabel = `Row ${r + 1} column ${c + 1}`;
          cell.appendChild(input);
        }
        gridEl.appendChild(cell);
        STATE.cells[r][c] = cell;
      }
    }

    // numbering + visual numbers
    let num = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (puz.grid[r][c] === ".") continue;
        const startAcross =
          (c === 0 || puz.grid[r][c - 1] === ".") &&
          c + 1 < cols &&
          puz.grid[r][c + 1] !== ".";
        const startDown =
          (r === 0 || puz.grid[r - 1][c] === ".") &&
          r + 1 < rows &&
          puz.grid[r + 1][c] !== ".";
        if (startAcross || startDown) {
          num++;
          const numEl = document.createElement("div");
          numEl.className = "num";
          numEl.textContent = num;
          STATE.cells[r][c].appendChild(numEl);
        }
      }
    }
  }

  function buildEntriesAndClues(puz) {
    const { rows, cols } = puz.size;
    // Build entries purely from the grid shape
    let num = 0;
    const entries = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (puz.grid[r][c] === ".") continue;
        const startAcross =
          (c === 0 || puz.grid[r][c - 1] === ".") &&
          (c + 1 < cols ? puz.grid[r][c + 1] !== "." : false);
        const startDown =
          (r === 0 || puz.grid[r - 1][c] === ".") &&
          (r + 1 < rows ? puz.grid[r + 1][c] !== "." : false);
        if (startAcross || startDown) {
          num++;
          if (startAcross) {
            const cells = [];
            let cc = c;
            while (cc < cols && puz.grid[r][cc] !== ".") {
              cells.push({ r, c: cc });
              cc++;
            }
            entries.push({ dir: "across", num, cells });
          }
          if (startDown) {
            const cells = [];
            let rr = r;
            while (rr < rows && puz.grid[rr][c] !== ".") {
              cells.push({ r: rr, c });
              rr++;
            }
            entries.push({ dir: "down", num, cells });
          }
        }
      }
    }

    // Attach clues/answers by clue number
    const clueMap = { across: new Map(), down: new Map() };
    (puz.clues?.across || []).forEach((c) => clueMap.across.set(c.num, c));
    (puz.clues?.down || []).forEach((c) => clueMap.down.set(c.num, c));

    STATE.entries = entries.map((e) => {
      const clue = clueMap[e.dir].get(e.num);
      const answer = clue?.answer ? String(clue.answer).toUpperCase() : null;
      const clueText = clue?.clue || "(no clue provided)";
      // Soft-validate lengths; do not crash
      if (answer && answer.length !== e.cells.length) {
        console.warn(
          `Length mismatch for ${e.dir} ${e.num}: answer has ${answer.length}, cells ${e.cells.length}`,
        );
      }
      return { ...e, clue: clueText, answer: answer };
    });

    // Render clue lists
    cluesAcrossEl.innerHTML = "";
    cluesDownEl.innerHTML = "";
    const render = (entry) => {
      const li = document.createElement("li");
      li.className = "clue";
      li.id = `clue-${entry.dir}-${entry.num}`;
      li.textContent =
        `${entry.num}. ${entry.clue}` +
        (entry.answer ? "" : " [author: add answer]");
      li.addEventListener("click", () => {
        focusEntry(indexOf(entry), entry.dir);
      });
      return li;
    };
    STATE.entries
      .filter((e) => e.dir === "across")
      .forEach((e) => cluesAcrossEl.appendChild(render(e)));
    STATE.entries
      .filter((e) => e.dir === "down")
      .forEach((e) => cluesDownEl.appendChild(render(e)));

    focusEntry(0, "across");
    updateHighlights();
  }

  function indexOf(entry) {
    return STATE.entries.findIndex(
      (e) => e.dir === entry.dir && e.num === entry.num,
    );
  }

  function focusEntry(entryIndex, dir) {
    const i = Math.max(0, Math.min(entryIndex, STATE.entries.length - 1));
    const entry = STATE.entries[i];
    if (!entry) return;
    STATE.cursor = { dir: dir || entry.dir, entryIndex: i, pos: 0 };
    const cellPos = entry.cells[0];
    const cell = STATE.cells[cellPos.r][cellPos.c];
    if (cell && cell.firstElementChild) cell.firstElementChild.focus();
    updateHighlights();
  }

  function updateHighlights() {
    for (const row of STATE.cells)
      for (const cell of row) {
        if (!cell) continue;
        cell.classList.remove("active", "highlight");
      }
    document
      .querySelectorAll(".clue")
      .forEach((el) => el.classList.remove("active"));

    const entry = STATE.entries[STATE.cursor.entryIndex];
    if (!entry) return;
    entry.cells.forEach(({ r, c }) =>
      STATE.cells[r][c].classList.add("highlight"),
    );
    const firstCell =
      STATE.cells[entry.cells[STATE.cursor.pos].r][
        entry.cells[STATE.cursor.pos].c
      ];
    if (firstCell) firstCell.classList.add("active");

    cursorInfoEl.textContent = `${entry.num}-${entry.dir === "across" ? "Across" : "Down"}`;
    const clueEl = document.getElementById(`clue-${entry.dir}-${entry.num}`);
    if (clueEl) clueEl.classList.add("active");
  }

  function moveCursor(delta) {
    const entry = STATE.entries[STATE.cursor.entryIndex];
    const nextPos = Math.max(
      0,
      Math.min(STATE.cursor.pos + delta, entry.cells.length - 1),
    );
    STATE.cursor.pos = nextPos;
    const cellPos = entry.cells[nextPos];
    const cell = STATE.cells[cellPos.r][cellPos.c];
    cell?.firstElementChild?.focus();
    updateHighlights();
  }

  function nextEntry(dir) {
    const list = STATE.entries.filter((e) => e.dir === dir);
    const current = STATE.entries[STATE.cursor.entryIndex];
    const idxInList = list.findIndex((e) => e.num === current.num);
    const next = list[(idxInList + 1) % list.length];
    focusEntry(indexOf(next), dir);
  }

  function handleInput(e) {
    const key = e.key;
    if (key === "Tab") {
      e.preventDefault();
      nextEntry(STATE.cursor.dir);
      return;
    }
    if (key === "Enter") {
      e.preventDefault();
      STATE.cursor.dir = STATE.cursor.dir === "across" ? "down" : "across";
      updateHighlights();
      return;
    }
    if (key === "Backspace") {
      e.target.value = "";
      moveCursor(-1);
      saveProgress();
      return;
    }
    if (/^([a-zA-Z])$/.test(key)) {
      e.target.value = key.toUpperCase();
      moveCursor(1);
      saveProgress();
      setTimeout(checkIfComplete, 0);
    }
  }

  function attachHandlers() {
    gridEl.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("keydown", handleInput);
      inp.addEventListener("focus", (e) => {
        const cell = e.target.parentElement;
        const r = +cell.dataset.r,
          c = +cell.dataset.c;
        const idx = STATE.entries.findIndex(
          (en) =>
            en.dir === STATE.cursor.dir &&
            en.cells.some((p) => p.r === r && p.c === c),
        );
        if (idx >= 0) {
          STATE.cursor.entryIndex = idx;
          STATE.cursor.pos = STATE.entries[idx].cells.findIndex(
            (p) => p.r === r && p.c === c,
          );
        } else {
          const idx2 = STATE.entries.findIndex((en) =>
            en.cells.some((p) => p.r === r && p.c === c),
          );
          if (idx2 >= 0) {
            STATE.cursor.entryIndex = idx2;
            STATE.cursor.pos = STATE.entries[idx2].cells.findIndex(
              (p) => p.r === r && p.c === c,
            );
          }
        }
        updateHighlights();
      });
    });

    btnPrev.onclick = () => shiftDate(-1);
    btnNext.onclick = () => shiftDate(1);
    datePicker.onchange = () => loadFor(datePicker.value);

    btnCheck.onclick = checkCurrent;
    btnReveal.onclick = revealCurrent;
    btnReset.onclick = () => {
      clearProgress(STATE.puzzle.date);
      initPuzzle(STATE.puzzle);
    };
  }

  function shiftDate(days) {
    const d = new Date(datePicker.value || todayStr());
    d.setDate(d.getDate() + days);
    loadFor(d.toISOString().slice(0, 10));
  }

  function lettersFor(entry) {
    return entry.cells.map(
      ({ r, c }) =>
        STATE.cells[r][c].querySelector("input")?.value?.toUpperCase() || "",
    );
  }

  function markEntry(entry, isCorrect) {
    entry.cells.forEach(({ r, c }) => {
      const cell = STATE.cells[r][c];
      cell.classList.remove("wrong", "correct");
      if (isCorrect === true) cell.classList.add("correct");
      if (isCorrect === false) cell.classList.add("wrong");
      setTimeout(() => {
        cell.classList.remove("wrong", "correct");
      }, 900);
    });
  }

  function checkCurrent() {
    const entry = STATE.entries[STATE.cursor.entryIndex];
    if (!entry.answer) {
      toast("No answer set for this clue.");
      return;
    }
    const guess = lettersFor(entry).join("");
    markEntry(entry, guess === entry.answer);
  }

  function revealCurrent() {
    const entry = STATE.entries[STATE.cursor.entryIndex];
    if (!entry.answer) {
      toast("No answer set for this clue.");
      return;
    }
    entry.cells.forEach((pos, i) => {
      const cell = STATE.cells[pos.r][pos.c];
      const inp = cell.querySelector("input");
      if (inp) inp.value = entry.answer[i] || "";
    });
    saveProgress();
    checkIfComplete();
  }

  function checkIfComplete() {
    // Only consider entries that have answers
    const solvable = STATE.entries.filter((e) => !!e.answer);
    if (!solvable.length) return;
    const filled = solvable.every((e) => lettersFor(e).join("") === e.answer);
    if (filled) {
      clearInterval(STATE.timerId);
      timerEl.classList.add("done");
      toast(`You solved it in ${timerEl.textContent}! 🎉`);
    }
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.className = "toast";
    document.body.appendChild(t);
    setTimeout(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 2000);
  }

  function startTimer(date) {
    const saved = JSON.parse(localStorage.getItem(storeKey(date)) || "{}");
    STATE.startTime = saved.startTime ? new Date(saved.startTime) : new Date();
    if (!saved.startTime) {
      saveProgress();
    }
    STATE.timerId = setInterval(() => {
      const secs = Math.floor((Date.now() - STATE.startTime.getTime()) / 1000);
      const m = String(Math.floor(secs / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }, 250);
  }

  function storeKey(date) {
    return `mini-${date}`;
  }

  function saveProgress() {
    const entryVals = STATE.entries.map((e) => lettersFor(e).join(""));
    localStorage.setItem(
      storeKey(STATE.puzzle.date),
      JSON.stringify({ startTime: STATE.startTime, entries: entryVals }),
    );
  }
  function restoreProgress(date) {
    const saved = JSON.parse(localStorage.getItem(storeKey(date)) || "{}");
    if (!saved.entries) return;
    STATE.entries.forEach((e, i) => {
      const letters = saved.entries[i] || "";
      e.cells.forEach((pos, j) => {
        const inp = STATE.cells[pos.r][pos.c].querySelector("input");
        if (inp && letters[j]) inp.value = letters[j];
      });
    });
  }
  function clearProgress(date) {
    localStorage.removeItem(storeKey(date));
  }

  const d0 = todayStr();
  datePicker.value = d0;
  loadFor(d0);
})();
