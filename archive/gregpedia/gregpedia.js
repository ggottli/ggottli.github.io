// Gregpedia v0.2 — local knowledge + PythonAnywhere OpenRouter proxy

/***************
 * LOCAL DB
 ***************/
let GREG_DB = [];

async function loadDB() {
  const url = window.__GREGPEDIA_DATA_URL__ || "data/gregpedia.json";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load DB");
    GREG_DB = await res.json();
  } catch (e) {
    console.error("Gregpedia DB load error:", e);
    GREG_DB = []; // fallback
  }
}

/***************
 * SEARCH
 ***************/
function scoreDoc(q, doc) {
  const query = q.toLowerCase();
  const hay = [
    doc.topic,
    doc.summary,
    doc.details,
    ...(doc.aliases || []),
    ...(doc.tags || []),
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;
  query.split(/\s+/).forEach((tok) => {
    if (!tok) return;
    if (doc.topic.toLowerCase() === tok) score += 5;
    if ((doc.aliases || []).some((a) => a.toLowerCase() === tok)) score += 4;
    if (hay.includes(tok)) score += 2;
  });
  if (doc.topic.toLowerCase().includes(query)) score += 3;
  return score;
}

function searchGregpedia(q) {
  if (!q || !q.trim()) return null;
  const scored = GREG_DB.map((d) => ({ d, s: scoreDoc(q, d) })).sort(
    (a, b) => b.s - a.s,
  );
  const top = scored[0];
  if (!top || top.s <= 0) return null;
  return top.d;
}

/***************
 * RENDER
 ***************/
function el(id) {
  return document.getElementById(id);
}
function setHidden(id, hidden) {
  el(id).hidden = hidden;
}

function mdEscape(html) {
  return html.replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
}

// very small, “good-enough” markdown renderer (bold, italics, code, headings, line breaks).
function renderMarkdown(md) {
  let h = mdEscape(md);

  // headings (##, #)
  h = h
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // bold/italics/code
  h = h
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");

  // simple lists
  h = h
    .replace(/^(?:-|\*) (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");

  // line breaks
  h = h.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");

  return `<p>${h}</p>`;
}

function renderResult(doc, query) {
  el("gp-meta").textContent =
    `Result for “${query}” • from Gregpedia knowledge base`;
  el("gp-heading").textContent = doc.topic;
  el("gp-content").innerHTML = `
    <p>${doc.summary}</p>
    <p style="white-space: pre-wrap;">${doc.details}</p>
    <div class="gp-tags">${(doc.tags || []).map((t) => `<span class="gp-tag">${t}</span>`).join(" ")}</div>
  `;
  el("gp-links").innerHTML = (doc.links || [])
    .map(
      (l) =>
        `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`,
    )
    .join("");
  setHidden("gp-result", false);
}

function renderNoMatch(query) {
  el("gp-meta").textContent = `No exact match for “${query}”.`;
  el("gp-heading").textContent = "Try one of these:";
  const picks = GREG_DB.slice(0, 5)
    .map(
      (d) =>
        `<li><button data-gp-topic="${d.id}" class="gp-as-link">${d.topic}</button></li>`,
    )
    .join("");
  el("gp-content").innerHTML = `<ul>${picks}</ul>`;
  el("gp-links").innerHTML = "";
  setHidden("gp-result", false);
  document.querySelectorAll("button[data-gp-topic]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-gp-topic");
      const doc = GREG_DB.find((d) => d.id === id);
      if (doc) {
        renderResult(doc, doc.topic);
      }
    });
  });
}

/***************
 * PYTHONANYWHERE BACKEND (OpenRouter proxy)
 * – mirrors the pattern from your other project
 ***************/
const PA_BACKEND = "https://ggottli.pythonanywhere.com"; // <- CHANGE THIS
const ENDPOINT = `${PA_BACKEND}/api/chat`;

// Build messages for AI (system + user). We prepend local DB as RAG context.
function buildMessages(query) {
  const context = GREG_DB.map(
    (d) => `# ${d.topic}\n${d.summary}\n${d.details}`,
  ).join("\n\n");
  const system = {
    role: "system",
    content:
      "You are Gregpedia, an assistant that answers only about Greg. Use the provided context as the single source of truth. If you cannot find an answer, say you don't know. Keep responses accurate, informative, and concise. Aim for 2-5 sentences.",
  };
  const user = {
    role: "user",
    content: `Query: ${query}\n\nContext:\n${context}`,
  };
  return [system, user];
}

// Like your chatbot example: streaming OR non-streaming
async function sendToBackend(
  messages,
  { stream = true, model = "openai/gpt-oss-20b:free" } = {},
) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream, model }),
  });

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const j = await res.json();
      msg = j?.error?.detail || j?.error || JSON.stringify(j);
    } catch {}
    throw new Error(msg);
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // Non-streaming or fallback to JSON
  if (!ct.includes("text/event-stream")) {
    const data = await res.json();
    return { done: true, text: data?.choices?.[0]?.message?.content || "" };
  }

  // Streaming SSE
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let partial = "";
  return {
    async read(onChunk) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        partial += decoder.decode(value, { stream: true });
        const lines = partial.split("\n");
        partial = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("data:")) {
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta = j?.choices?.[0]?.delta?.content ?? "";
              if (delta) onChunk(delta);
            } catch {}
          }
        }
      }
      return { done: true };
    },
  };
}

/***************
 * CONTROLLER
 ***************/
async function handleQuery(q) {
  const local = searchGregpedia(q);
  if (local) {
    renderResult(local, q);
    return;
  }

  // If not in local DB, ask backend (streamed)
  setHidden("gp-result", false);
  el("gp-meta").textContent = `Answering “${q}” • via Gregpedia (AI)`;
  el("gp-heading").textContent = "AI-assisted answer";
  el("gp-content").innerHTML =
    `<p id="gp-stream"></p><div class="gp-tags"><span class="gp-tag">AI</span><span class="gp-tag">RAG</span></div>`;
  el("gp-links").innerHTML = "";

  const streamEl = document.getElementById("gp-stream");
  streamEl.textContent = ""; // clear

  try {
    const messages = buildMessages(q);
    const s = await sendToBackend(messages, { stream: true });
    await s.read((delta) => {
      streamEl.textContent += delta;
    });
  } catch (err) {
    streamEl.textContent = "Error contacting Gregpedia server.";
    console.error(err);
  }
}

async function init() {
  await loadDB();
  const form = el("gp-form");
  const input = el("gp-q");
  const params = new URLSearchParams(location.search);
  const initial = params.get("q");
  if (initial) {
    input.value = initial;
    handleQuery(initial);
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
    handleQuery(q);
  });
}

window.addEventListener("DOMContentLoaded", init);
