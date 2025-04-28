// Helpers
const $ = (id) => document.getElementById(id);
const storageKey = "bibleJournalData";

// Current plan state
let plan = null;
let entries = [];
let currentIndex = 0;

// Topic mode state
let topicVerses = [];
let topicIndex = 0;

// Load saved plan & entries from localStorage
function loadStorage() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      plan = data.plan || null;
      entries = data.entries || [];
    }
  } catch (err) {
    console.error("Couldn’t parse saved data, resetting…", err);
    localStorage.removeItem(storageKey);
    plan = null;
    entries = [];
  }
}

// Persist plan & entries to localStorage
function persist() {
  localStorage.setItem(storageKey, JSON.stringify({ plan, entries }));
}

// Show only one main section
function showSection(sec) {
  ["setup", "journal", "devotional"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.classList.toggle("hidden", id !== sec);
    }
  });
}

// Toggle inputs based on Book vs Topic mode
function updateSetupUI() {
  const mode = $("plan-mode").value;
  $("book-setup").classList.toggle("hidden", mode === "topic");
  $("topic-setup").classList.toggle("hidden", mode === "book");
}

// Render sidebar timeline + controls
function renderTimeline() {
  const tl = $("timeline");
  tl.innerHTML = "";

  // Daily Devotional button
  const devBtn = document.createElement("button");
  devBtn.textContent = "🕮 Daily Devotional";
  devBtn.addEventListener("click", () => {
    showSection("devotional");
    fetchDevotional();
  });
  tl.appendChild(devBtn);

  // + Add Entry button
  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add Entry";
  addBtn.addEventListener("click", addEntry);
  tl.appendChild(addBtn);

  // Existing entries
  entries.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "day" + (i === currentIndex ? " active" : "");
    div.textContent = `${new Date(e.date).toLocaleDateString()} – ${e.chapter}`;
    div.addEventListener("click", () => loadEntry(i));
    tl.appendChild(div);
  });
}

// Fetch & display devotional (uses enewhope proxy)
async function fetchDevotional() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const endpoint = [
    "https://developer.enewhope.org/devotions.php",
    "?churchname=New+Hope+Oahu",
    "&churchweb=www.enewhope.org",
    "&h1color=333",
    "&h2color=333",
    "&navigationcolor=333",
    `&month=${month}`,
    `&day=${day}`,
  ].join("");
  const proxyURL = "https://api.allorigins.win/raw?url=";
  const url = proxyURL + encodeURIComponent(endpoint);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Proxy returned HTTP ${res.status}`);
    const html = await res.text();

    // Parse and extract only the devotional content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    let content = doc.querySelector("#devotionsText");
    if (!content) {
      content = doc.querySelector("main") || doc.body;
    }
    // Remove unwanted UI elements
    content
      .querySelectorAll("img, nav, header, footer, .menu, ul")
      .forEach((el) => el.remove());
    $("dev-body").innerHTML = content.innerHTML;
  } catch (err) {
    console.error("Devotional load error", err);
    $("dev-body").innerHTML =
      "<p><em>Couldn’t load devotional — please try again later.</em></p>";
  }
}

// Add a new entry (branches by mode)
function addEntry() {
  if (plan?.type === "topic") {
    return addTopicEntry();
  }

  const nextChap = entries.length
    ? entries[entries.length - 1].chapter + 1
    : plan.startChapter;

  entries.push({
    date: new Date().toISOString(),
    chapter: nextChap,
    text: "",
  });
  currentIndex = entries.length - 1;
  persist();
  renderTimeline();
  loadEntry(currentIndex);
}

// Handle Topic mode: pull next verse reference
async function addTopicEntry() {
  if (topicIndex >= topicVerses.length) {
    return alert("You’ve reached the end of this topic.");
  }

  const ref = topicVerses[topicIndex++].reference;
  entries.push({
    date: new Date().toISOString(),
    chapter: ref,
    text: "",
  });
  currentIndex = entries.length - 1;
  persist();
  renderTimeline();

  // Display the pulled verse
  showSection("journal");
  $("chap-num-display").textContent = ref;
  $("passage-ref").textContent = ref;
  $("entry").value = "";

  try {
    const url = `https://bible-api.com/${encodeURIComponent(
      ref,
    )}?translation=${plan.translation}`;
    const res = await fetch(url);
    const json = await res.json();
    $("passage-text").innerHTML = (json.text || "").replace(/\n/g, "<br>");
  } catch (err) {
    console.error(err);
    $("passage-text").innerHTML = "<p><em>Error loading passage.</em></p>";
  }
}

// Load & display a journal entry (Book mode)
async function loadEntry(idx) {
  currentIndex = idx;
  renderTimeline();
  showSection("journal");

  const e = entries[idx];
  $("chap-num-display").textContent = e.chapter;
  $("passage-ref").textContent = `${plan.book} ${e.chapter}`;
  $("entry").value = e.text;

  try {
    const url = `https://bible-api.com/${encodeURIComponent(
      plan.book + " " + e.chapter,
    )}?translation=${plan.translation}`;
    const res = await fetch(url);
    const json = await res.json();
    $("passage-text").innerHTML = (json.text || "").replace(/\n/g, "<br>");
  } catch {
    $("passage-text").innerHTML = "<p><em>Error loading passage.</em></p>";
  }
}

// Prompt to change chapter for current entry
function changeChapter() {
  const current = entries[currentIndex].chapter;
  const input = prompt("Enter chapter number or ref:", current);
  if (!input) return;
  entries[currentIndex].chapter = input.trim();
  persist();
  loadEntry(currentIndex);
}

// Prompt to change translation for plan
function changeTranslation() {
  const current = plan.translation || "";
  const input = prompt("Enter translation code (e.g. kjv, esv, web):", current);
  if (input) {
    plan.translation = input.trim();
    persist();
    loadEntry(currentIndex);
  }
}

// Save the reflection text
function saveEntry() {
  entries[currentIndex].text = $("entry").value.trim();
  entries[currentIndex].date = new Date().toISOString();
  persist();
  alert("Entry saved!");
  renderTimeline();
}

// Export data as JSON file
function exportProgress() {
  const blob = new Blob([JSON.stringify({ plan, entries })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bible-journal.json";
  a.click();
}

// Import data from JSON file
function importProgress(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      plan = obj.plan;
      entries = obj.entries || [];
      persist();
      initialize();
    } catch {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}

// Fetch topical data from OpenBible.info
// Fetch topical data from OpenBible.info via AllOrigins proxy
// Fetch topical data by scraping the HTML page
async function loadTopicData(name) {
  // 1) Hit the HTTP URL (so it’s pre-rendered) via our CORS proxy
  const endpoint = `http://openbible.info/topics/${encodeURIComponent(name)}/`;
  const proxyURL = "https://api.allorigins.win/raw?url=";
  const url = proxyURL + encodeURIComponent(endpoint);
  console.log("Loading topic from:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();

    // 2) Parse it
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // 3) Grab *all* <a> tags and filter by a proper Book Chapter:Verse pattern
    const anchors = Array.from(doc.querySelectorAll("a"));
    topicVerses = anchors
      .map((a) => a.textContent.trim())
      .filter((txt) =>
        // optional leading number+space (e.g. "1 " in "1 John 3:16"),
        // then letters, space, digits:digits, optional "-digits"
        /^[1-3]?\s?[A-Za-z]+\s\d+:\d+(-\d+)?$/.test(txt),
      )
      .map((reference) => ({ reference }));

    topicIndex = 0;
    console.log("Parsed topicVerses:", topicVerses);

    if (!topicVerses.length) {
      alert(`No verses found for “${name}”.`);
    }
  } catch (err) {
    console.error("Topic load error:", err);
    alert("Failed to load topic. Check console for details.");
  }
}

// Start a new plan (Book or Topic mode)
async function startPlan() {
  const mode = $("plan-mode").value;
  const translation = $("translation").value;

  if (mode === "book") {
    const book = $("book-name").value;
    const chap = parseInt($("start-chap").value, 10);
    if (!book || !chap) return alert("Select a book & chapter.");

    plan = { type: "book", book, startChapter: chap, translation };
    entries = [];
    persist();
    addEntry();
  } else {
    const topic = $("topic-name").value.trim();
    if (!topic) return alert("Enter a topic name.");
    await loadTopicData(topic);
    plan = { type: "topic", topic, translation };
    entries = [];
    persist();
    addEntry();
  }
}

// Wire up events
function setupEventHandlers() {
  document
    .querySelector("#plan-mode")
    ?.addEventListener("change", updateSetupUI);

  document
    .querySelector("#refresh-dev")
    ?.addEventListener("click", fetchDevotional);

  document.querySelector("#save-entry")?.addEventListener("click", saveEntry);

  document
    .querySelector("#export-json")
    ?.addEventListener("click", exportProgress);

  document
    .querySelector("#import-json")
    ?.addEventListener("change", importProgress);

  document
    .querySelector("#change-chapter")
    ?.addEventListener("click", changeChapter);

  document
    .querySelector("#change-translation")
    ?.addEventListener("click", changeTranslation);

  document
    .querySelector("#start-plan")
    ?.addEventListener("click", () => startPlan());
}

// Initialize on page load
function initialize() {
  loadStorage();
  setupEventHandlers();
  updateSetupUI();

  if (plan) {
    showSection("journal");
    renderTimeline();
    if (entries.length) loadEntry(currentIndex);
  } else {
    showSection("setup");
  }
}

window.addEventListener("DOMContentLoaded", initialize);
