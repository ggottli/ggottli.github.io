/* ============================
   Radial Tree + Chat (SSE + Voice Mode)
   ============================ */

/* -------- Demo tree data -------- */
const TREE = {
  center: {
    id: "center",
    title: "Viajero",
    desc: "Comienza tu aventura en Madrid.",
    state: "available",
  },
  branches: [
    {
      angle: -90,
      nodes: [
        { id: "metro", title: "Metro", desc: "Billetes, líneas, transbordos." },
        { id: "bus", title: "Bus", desc: "Pedir parada, anuncios rápidos." },
        { id: "renfe", title: "Cercanías", desc: "Validaciones, retrasos." },
      ],
    },
    {
      angle: 30,
      nodes: [
        { id: "cafe", title: "Café", desc: "Pedido natural y cortesía." },
        { id: "mercado", title: "Mercado", desc: "Cantidades, precios." },
        {
          id: "restaurante",
          title: "Restaurante",
          desc: "Reserva, alergias, cuenta.",
        },
      ],
    },
    {
      angle: 150,
      nodes: [
        { id: "hotel", title: "Hotel", desc: "Check-in, llaves, horarios." },
        { id: "barrio", title: "Barrio", desc: "Recs locales, acentos." },
        { id: "noche", title: "Tapas", desc: "Ambiente ruidoso, cuentas." },
      ],
    },
    {
      angle: -150,
      nodes: [
        { id: "telefono", title: "Móvil", desc: "SIM, datos, recargas." },
        { id: "tramites", title: "Trámites", desc: "Citas, formularios." },
        { id: "salud", title: "Salud", desc: "Farmacia, urgencias." },
      ],
    },
  ],
};

/* -------- DOM refs -------- */
const nodeLayer = document.getElementById("nodeLayer");
const linkLayer = document.getElementById("linkLayer");
const detailTitle = document.getElementById("detailTitle");
const detailDesc = document.getElementById("detailDesc");
const startBtn = document.getElementById("startBtn");
const completeBtn = document.getElementById("completeBtn");

const chatModal = document.getElementById("chatModal");
const chatTitle = document.getElementById("chatTitle");
const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("chatInput");
const micBtn = document.getElementById("micBtn");
const sendBtn = document.getElementById("sendBtn");
const sttHint = document.getElementById("sttHint");

const fitBtn = document.getElementById("fitBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetBtn = document.getElementById("resetBtn");

/* -------- API base (PythonAnywhere) -------- */
const API_BASE = "https://ggottli.pythonanywhere.com";

/* -------- State -------- */
let scale = 1,
  pan = { x: 0, y: 0 };
let dragging = false,
  dragStart = { x: 0, y: 0 };
let activeId = null;
let completion = JSON.parse(localStorage.getItem("hq:done") || "{}");
let convo = []; // messages: {role, content}

/* ============================
   Build & layout
   ============================ */
function computeState(id, branchIndex, depth) {
  if (id === "center") return "available";
  const parent =
    depth === 0 ? "center" : TREE.branches[branchIndex].nodes[depth - 1].id;
  if (completion[id]) return "completed";
  return completion[parent] || parent === "center" ? "available" : "locked";
}

function build() {
  nodeLayer.innerHTML = "";
  linkLayer.innerHTML = "";
  const rect = nodeLayer.getBoundingClientRect();
  const cx = rect.width / 2,
    cy = rect.height / 2;
  const ringGap = 150;

  // center traveler sprite (SVG <symbol> is in index.html)
  const traveler = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  traveler.setAttribute("class", "traveler");
  traveler.style.position = "absolute";
  traveler.style.left = cx + "px";
  traveler.style.top = cy + "px";
  traveler.innerHTML = `<use href="#traveler16"></use>`;
  traveler.addEventListener("click", () => {
    selectNode({
      id: "center",
      title: "Viajero",
      desc: "Desde aquí eliges tu camino.",
      state: "available",
    });
  });
  nodeLayer.appendChild(traveler);

  // branches
  TREE.branches.forEach((b, bi) => {
    const theta = (b.angle * Math.PI) / 180;
    b.nodes.forEach((n, di) => {
      const r = (di + 1) * ringGap;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      const state = computeState(n.id, bi, di);
      placeHex({ ...n, state }, x, y);

      // link
      const from =
        di === 0
          ? { x: cx, y: cy }
          : {
              x: cx + Math.cos(theta) * (di * ringGap),
              y: cy + Math.sin(theta) * (di * ringGap),
            };
      drawLink(from, { x, y });
      placeNub((from.x + x) / 2, (from.y + y) / 2);
    });
  });
}

function placeHex(node, x, y) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `hex ${node.state}`;
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.dataset.id = node.id;
  el.innerHTML = `<div class="title">${node.title}</div><div class="desc">${node.desc || ""}</div>`;
  el.addEventListener("click", () => selectNode(node));
  nodeLayer.appendChild(el);
}

function drawLink(p1, p2) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const midx = (p1.x + p2.x) / 2,
    midy = (p1.y + p2.y) / 2;
  path.setAttribute("d", `M ${p1.x} ${p1.y} Q ${midx} ${midy} ${p2.x} ${p2.y}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "var(--link)");
  path.setAttribute("stroke-width", "2.5");
  linkLayer.appendChild(path);
}
function placeNub(x, y) {
  const nub = document.createElement("div");
  nub.className = "connector";
  nub.style.left = x + "px";
  nub.style.top = y + "px";
  nodeLayer.appendChild(nub);
}

/* ============================
   Selection panel
   ============================ */
function selectNode(n) {
  activeId = n.id;
  detailTitle.textContent = n.title;
  detailDesc.textContent = n.desc || "";
  const isLocked = n.state === "locked";
  startBtn.disabled = isLocked;
  completeBtn.disabled = isLocked;
}

startBtn.addEventListener("click", openChat);
completeBtn.addEventListener("click", () => {
  if (!activeId) return;
  completion[activeId] = true;
  localStorage.setItem("hq:done", JSON.stringify(completion));
  build();
});

/* ============================
   Chat UI + OpenRouter (SSE)
   ============================ */
function addMsg(role, text) {
  const row = document.createElement("div");
  row.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

function extractNonStreamAssistant(json) {
  try {
    // Some providers wrap reasoning separately
    return json?.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

function parseSSEData(payload) {
  try {
    const j = JSON.parse(payload);

    // Skip reasoning if present
    if (j?.choices?.[0]?.delta?.reasoning) {
      return "";
    }

    const delta = j?.choices?.[0]?.delta?.content;
    if (typeof delta === "string") return delta;
    const full = j?.choices?.[0]?.message?.content;
    if (typeof full === "string") return full;
    if (j?.error)
      return `[error] ${j.error.detail || j.error.message || "unknown"}`;
    return "";
  } catch {
    return payload;
  }
}

function openChat() {
  if (!activeId) return;
  chatTitle.textContent = detailTitle.textContent;
  chatWindow.innerHTML = "";
  convo = [
    {
      role: "system",
      content: `Eres un compañero de conversación español nativo.
Escenario: ${detailTitle.textContent}.
Habla de forma natural con acento peninsular, velocidad realista, frases coloquiales.
Mantén respuestas breves (1–3 frases) y haz preguntas para avanzar.
Si el usuario pide ayuda, repite más despacio o explica.`,
    },
  ];
  addMsg(
    "sys",
    "Escenario: " + detailTitle.textContent + ". ¡Listo cuando tú digas!",
  );
  chatModal.showModal();
  // reset voice mode state when opening
  stopVoiceMode();
}

async function sendChat(userText) {
  addMsg("user", userText);
  convo.push({ role: "user", content: userText });

  const botBubble = addMsg("bot", "…"); // stream into this

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: convo,
        stream: true, // ask server to stream via SSE
        temperature: 0.8,
        max_tokens: 400,
      }),
    });

    if (!res.ok) throw new Error("HTTP " + res.status);
    const ctype = res.headers.get("Content-Type") || "";

    // ---- STREAM PATH (SSE) ----
    if (ctype.includes("text/event-stream") && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "",
        acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const event = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 2);
          if (!event) continue; // keep-alive

          const line = event.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;

          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            buf = "";
            break;
          }

          const piece = parseSSEData(payload);
          if (piece) {
            acc += piece;
            botBubble.textContent = acc;
            chatWindow.scrollTop = chatWindow.scrollHeight;
          }
        }
      }

      const finalText = (acc || "").trim();
      botBubble.textContent = finalText || "(sin respuesta)";
      if (finalText) convo.push({ role: "assistant", content: finalText });
      return finalText;
    }

    // ---- NON-STREAM PATH ----
    const json = await res.json();
    const text = extractNonStreamAssistant(json) || "(sin respuesta)";
    botBubble.textContent = text;
    convo.push({ role: "assistant", content: text });
    return text;
  } catch (err) {
    console.error(err);
    botBubble.textContent = "Error de conexión. Intenta de nuevo.";
    return "";
  }
}

/* send form */
sendBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const v = chatInput.value.trim();
  if (!v) return;
  chatInput.value = "";
  sendChat(v).then((reply) => {
    if (voiceMode && reply) speak(reply).then(() => maybeStartListening());
  });
});

/* ============================
   Voice Mode (STT + TTS loop)
   ============================ */
let voiceMode = false;

// --- STT setup (SpeechRecognition) ---
let recognizer = null,
  recognizing = false;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognizer = new SR();
  recognizer.lang = "es-ES"; // target accent; you can make this scenario-selectable
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  recognizer.onresult = (e) => {
    const txt = Array.from(e.results)
      .map((r) => r[0].transcript)
      .join(" ")
      .trim();
    if (!txt) {
      maybeStartListening();
      return;
    }
    chatInput.value = ""; // keep input clean while in voice mode
    sendChat(txt).then((reply) => {
      if (voiceMode && reply) speak(reply).then(() => maybeStartListening());
    });
  };
  recognizer.onerror = () => {
    recognizing = false;
    if (voiceMode) maybeStartListening();
  };
  recognizer.onend = () => {
    recognizing = false;
    if (voiceMode) maybeStartListening();
  };
  sttHint.textContent = "Tip: pulsa 🎤 para hablar y alternar Modo Voz.";
} else {
  micBtn.disabled = true;
  sttHint.textContent = "Tu navegador no soporta dictado (Web Speech API).";
}

// --- TTS setup (speechSynthesis) ---
let ttsReady = false,
  esVoice = null;
function pickSpanishVoice() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  // Prefer es-ES, then any es-*
  esVoice =
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("es-es")) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("es"));
  ttsReady = !!esVoice;
}
if ("speechSynthesis" in window) {
  pickSpanishVoice();
  window.speechSynthesis.onvoiceschanged = pickSpanishVoice;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return Promise.resolve(); // no TTS
  // Stop any ongoing speech to support barge-in
  window.speechSynthesis.cancel();

  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (esVoice) u.voice = esVoice;
    u.lang = (esVoice && esVoice.lang) || "es-ES";
    u.rate = 1.0; // adjust if you want faster/slower
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onend = resolve;
    u.onerror = resolve;
    window.speechSynthesis.speak(u);
  });
}

function startListening() {
  if (!recognizer || recognizing) return;
  try {
    recognizer.start();
    recognizing = true;
  } catch {
    /* ignore rapid restarts */
  }
}
function stopListening() {
  if (!recognizer) return;
  try {
    recognizer.stop();
  } catch {}
  recognizing = false;
}
function maybeStartListening() {
  // Only auto-start if in voice mode and not currently speaking
  if (voiceMode && !window.speechSynthesis.speaking && !recognizing) {
    startListening();
  }
}

function startVoiceMode() {
  if (voiceMode) return;
  voiceMode = true;
  micBtn.textContent = "🛑";
  micBtn.title = "Detener Modo Voz";
  // If TTS not supported, we still do STT->text responses
  maybeStartListening();
}
function stopVoiceMode() {
  if (!voiceMode) return;
  voiceMode = false;
  micBtn.textContent = "🎤";
  micBtn.title = "Modo Voz";
  stopListening();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

micBtn.addEventListener("click", () => {
  if (!recognizer && !("speechSynthesis" in window)) {
    // no voice capabilities at all
    return;
  }
  if (voiceMode) stopVoiceMode();
  else startVoiceMode();
});

// Close dialog => stop voice mode
chatModal.addEventListener("close", stopVoiceMode);

/* ============================
   Pan & zoom
   ============================ */
function applyTZ() {
  nodeLayer.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  linkLayer.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
}
nodeLayer.addEventListener("mousedown", (e) => {
  if (e.target.closest(".hex") || e.target.closest(".traveler")) return;
  dragging = true;
  dragStart = { x: e.clientX - pan.x, y: e.clientY - pan.y };
});
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  pan.x = e.clientX - dragStart.x;
  pan.y = e.clientY - dragStart.y;
  applyTZ();
});
window.addEventListener("mouseup", () => (dragging = false));
nodeLayer.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const prev = scale;
    scale = Math.min(2.2, Math.max(0.6, scale + delta));
    const rect = nodeLayer.getBoundingClientRect();
    const cx = (e.clientX - rect.left - pan.x) / prev;
    const cy = (e.clientY - rect.top - pan.y) / prev;
    pan.x -= cx * (scale - prev);
    pan.y -= cy * (scale - prev);
    applyTZ();
  },
  { passive: false },
);

fitBtn.addEventListener("click", () => {
  scale = 1;
  pan = { x: 0, y: 0 };
  applyTZ();
});
zoomInBtn.addEventListener("click", () => {
  scale = Math.min(2.2, scale + 0.1);
  applyTZ();
});
zoomOutBtn.addEventListener("click", () => {
  scale = Math.max(0.6, scale - 0.1);
  applyTZ();
});
resetBtn.addEventListener("click", () => {
  completion = {};
  localStorage.removeItem("hq:done");
  build();
});

/* ============================
   Boot
   ============================ */
build();
