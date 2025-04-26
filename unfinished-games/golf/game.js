// game.js

// ===== Gauge Drawing (no PNG) =====
function drawGaugeCanvas() {
  const cvs = document.getElementById("shot-meter-canvas");
  const ctx2 = cvs.getContext("2d");
  const W = cvs.width,
    r = W / 2,
    cx = r,
    cy = r;

  // clear
  ctx2.clearRect(0, 0, W, W);

  // 1) white border (semi-circle)
  ctx2.lineWidth = 2;
  ctx2.strokeStyle = "#fff";
  ctx2.beginPath();
  ctx2.arc(cx, cy, r - 2, Math.PI, 0);
  ctx2.stroke();

  // 2) hatched fill between outer and inner arc
  const hatch = document.createElement("canvas");
  hatch.width = hatch.height = 8;
  const hctx = hatch.getContext("2d");
  hctx.strokeStyle = "rgba(0,0,0,0.2)";
  hctx.lineWidth = 1;
  hctx.beginPath();
  hctx.moveTo(0, 8);
  hctx.lineTo(8, 0);
  hctx.stroke();
  const pat = ctx2.createPattern(hatch, "repeat");

  ctx2.save();
  ctx2.beginPath();
  ctx2.moveTo(0, cy);
  ctx2.arc(cx, cy, r - 2, Math.PI, 0);
  ctx2.lineTo(cx + (r - 2 - 16), cy);
  ctx2.arc(cx, cy, r - 2 - 16, 0, Math.PI, true);
  ctx2.closePath();
  ctx2.fillStyle = pat;
  ctx2.fill();
  ctx2.restore();

  // 3) colored zones (power=top arc, accuracy=bottom arc)
  const zones = [
    { start: 80, end: 100, color: "limegreen" },
    { start: 100, end: 110, color: "gold" },
    { start: 110, end: 130, color: "orange" },
    { start: 130, end: 180, color: "red" },
  ];
  zones.forEach((z) => {
    // top (power)
    const a1 = Math.PI * (1 - z.start / 180);
    const a2 = Math.PI * (1 - z.end / 180);
    ctx2.lineWidth = 16;
    ctx2.strokeStyle = z.color;
    ctx2.beginPath();
    ctx2.arc(cx, cy, r - 2 - 8, a1, a2, false);
    ctx2.stroke();

    // bottom (accuracy)
    const lo = 180 - z.end,
      hi = 180 - z.start;
    const b1 = Math.PI * (1 - lo / 180);
    const b2 = Math.PI * (1 - hi / 180);
    ctx2.beginPath();
    ctx2.arc(cx, cy, r - 2 - 8, b1, b2, true);
    ctx2.stroke();
  });

  // 4) tick marks & labels
  ctx2.fillStyle = "#fff";
  ctx2.font = "10px monospace";
  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const ang = Math.PI * (1 - frac);
    const x1 = cx + Math.cos(ang) * (r - 2);
    const y1 = cy + Math.sin(ang) * (r - 2);
    const x2 = cx + Math.cos(ang) * (r - 12);
    const y2 = cy + Math.sin(ang) * (r - 12);

    ctx2.lineWidth = 2;
    ctx2.strokeStyle = "#fff";
    ctx2.beginPath();
    ctx2.moveTo(x1, y1);
    ctx2.lineTo(x2, y2);
    ctx2.stroke();

    const lx = cx + Math.cos(ang) * (r + 7);
    const ly = cy + Math.sin(ang) * (r + 7);
    ctx2.fillText(`${i * 25}`, lx - 6, ly + 4);
  }
}

// ===== Shot-Meter Logic =====
let meterAngle = 180; // start pointing down
let meterDir = -1; // move toward up (0°)
let lastTime = null;
let meterRaf = null;
let swingPhase = 0; // 0=ready → 1=power → 2=accuracy
const shotResult = { power: 0, accuracy: 0 };

const POWER_ZONES = [
  { start: 80, end: 100, factor: 1.0 },
  { start: 100, end: 110, factor: 0.8 },
  { start: 110, end: 130, factor: 0.6 },
  { start: 130, end: 180, factor: 0.4 },
];
const ACC_ZONES = [
  { start: -100, end: -80, factor: 1.0 },
  { start: -120, end: -100, factor: 0.8 },
  { start: -140, end: -120, factor: 0.6 },
  { start: -180, end: -140, factor: 0.4 },
];

function wrapAngle(a) {
  while (a > 180) a -= 360;
  while (a <= -180) a += 360;
  return a;
}
function findZone(a, zones) {
  a = wrapAngle(a);
  return zones.find((z) => a >= z.start && a <= z.end) || { factor: 0 };
}
function computePower(a) {
  return findZone(a, POWER_ZONES).factor;
}
function computeAccuracy(a) {
  return findZone(a, ACC_ZONES).factor;
}

function drawMeter(ts) {
  if (lastTime === null) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  meterAngle += meterDir * 180 * dt; // 180° per second

  // ← clamp & bounce between 0° and 180°
  if (meterAngle >= 180) {
    meterAngle = 180;
    meterDir = -1;
  }
  if (meterAngle <= 0) {
    meterAngle = 0;
    meterDir = 1;
  }

  document.getElementById("indicator").style.transform =
    `rotate(${meterAngle}deg)`;

  meterRaf = requestAnimationFrame(drawMeter);
}

function startMeter() {
  cancelAnimationFrame(meterRaf);
  swingPhase = 1; // entering power phase
  meterAngle = 180; // reset at bottom
  meterDir = -1; // go toward up (=0°)
  lastTime = null;
  meterRaf = requestAnimationFrame(drawMeter);
}

// ===== Course & Club Definitions =====
const holes = [
  {
    par: 3,
    tee: { x: 100, y: 500 },
    hole: { x: 700, y: 150, radius: 12 },
    fairwayColor: "#8fc975",
  },
  {
    par: 4,
    tee: { x: 80, y: 520 },
    hole: { x: 720, y: 100, radius: 12 },
    fairwayColor: "#a3c67f",
  },
  {
    par: 5,
    tee: { x: 120, y: 480 },
    hole: { x: 680, y: 80, radius: 12 },
    fairwayColor: "#7fb26f",
  },
];
let currentHole = 0,
  shots = 0;

const clubs = [
  "Putter",
  "Wedge",
  "9-Iron",
  "7-Iron",
  "5-Iron",
  "3-Wood",
  "Driver",
];
const maxDist = {
  Putter: 100,
  Wedge: 200,
  "9-Iron": 250,
  "7-Iron": 300,
  "5-Iron": 350,
  "3-Wood": 400,
  Driver: 500,
};
let clubIdx = 1;

// ===== Aim & Ball State =====
let aimAngle = 0;

const ball = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, moving: false };

// ===== Rendering Setup =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const holeLabel = document.getElementById("hole-label");
const clubLabel = document.getElementById("current-club");

// hatch pattern for semi-transparent fill
const _hatchCanvas = document.createElement("canvas");
_hatchCanvas.width = _hatchCanvas.height = 8;
const _hctx = _hatchCanvas.getContext("2d");
_hctx.strokeStyle = "rgba(255,255,255,0.3)";
_hctx.lineWidth = 1;
_hctx.beginPath();
_hctx.moveTo(0, 8);
_hctx.lineTo(8, 0);
_hctx.stroke();
const hatchPattern = ctx.createPattern(_hatchCanvas, "repeat");

// ===== Constants =====
const FRICTION = 0.98,
  GRAVITY = 0.3,
  TAP_STEP = 2,
  HOLD_STEP = 6,
  HOLD_RATE = 50,
  MAX_ERR_DEG = 10;

let leftHoldInt = null,
  rightHoldInt = null;

// ===== UI Helpers =====
function updateHoleLabel() {
  const h = holes[currentHole];
  holeLabel.innerText = `Hole ${currentHole + 1} (Par ${h.par}) – Shots: ${shots}`;
}

function initHole() {
  const h = holes[currentHole];
  ball.x = h.tee.x;
  ball.y = h.tee.y;
  ball.vx = ball.vy = ball.z = ball.vz = 0;
  ball.moving = false;

  shots = 0;
  swingPhase = 0;
  aimAngle = 0;

  clubLabel.innerText = clubs[clubIdx];
  updateHoleLabel();
}

// ===== Draw Routines =====
function drawGolfer() {
  const t = holes[currentHole].tee;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(t.x, t.y - 14, 6, 0, Math.PI * 2);
  ctx.fill(); // head
  ctx.fillRect(t.x - 2, t.y - 14, 4, 16); // body
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t.x + 3, t.y + 2);
  ctx.lineTo(t.x + 20, t.y - 10);
  ctx.stroke(); // club
}

function drawHole() {
  const h = holes[currentHole];
  ctx.fillStyle = h.fairwayColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#444";
  ctx.fillRect(h.tee.x - 5, h.tee.y - 5, 10, 10);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(h.hole.x, h.hole.y, h.hole.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "red";
  ctx.fillRect(h.hole.x, h.hole.y - 30, 2, 30);
  ctx.beginPath();
  ctx.moveTo(h.hole.x + 2, h.hole.y - 30);
  ctx.lineTo(h.hole.x + 15, h.hole.y - 22);
  ctx.lineTo(h.hole.x + 2, h.hole.y - 14);
  ctx.fill(); // flag
}

function drawBall() {
  if (ball.z > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y - ball.z, 6, 0, Math.PI * 2);
  ctx.fill();
}

function updateBall() {
  if (!ball.moving) return;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.z += ball.vz;
  ball.vz -= GRAVITY;
  if (ball.z < 0) {
    ball.z = 0;
    ball.vz = 0;
  }

  ball.vx *= FRICTION;
  ball.vy *= FRICTION;

  const h = holes[currentHole].hole;
  if (Math.hypot(ball.x - h.x, ball.y - h.y) < h.radius) {
    ball.moving = false;
    setTimeout(() => {
      alert(`You holed Hole ${currentHole + 1} in ${shots} shots!`);
      currentHole = (currentHole + 1) % holes.length;
      initHole();
    }, 100);
  }
  if (Math.hypot(ball.vx, ball.vy) < 0.2) ball.moving = false;
}

function drawAimMarkers() {
  if (ball.moving || swingPhase > 0) return;
  const dist = maxDist[clubs[clubIdx]];
  const rad = (aimAngle * Math.PI) / 180;
  const dx = Math.cos(rad),
    dy = -Math.sin(rad);

  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const px = ball.x + dx * dist * f;
    const py = ball.y + dy * dist * f;
    ctx.fillStyle = "rgba(255,0,0,0.8)";
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ===== Main Loop =====
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHole();
  drawGolfer();
  drawAimMarkers();
  drawBall();
  updateBall();
  requestAnimationFrame(loop);
}

// ===== UI Bindings =====
// Hole navigation
document.getElementById("prev-hole").onclick = () => {
  currentHole = (currentHole + holes.length - 1) % holes.length;
  initHole();
};
document.getElementById("next-hole").onclick = () => {
  currentHole = (currentHole + 1) % holes.length;
  initHole();
};

// Club selector
document.getElementById("prev-club").onclick = () => {
  clubIdx = (clubIdx + clubs.length - 1) % clubs.length;
  clubLabel.innerText = clubs[clubIdx];
};
document.getElementById("next-club").onclick = () => {
  clubIdx = (clubIdx + 1) % clubs.length;
  clubLabel.innerText = clubs[clubIdx];
};

// Aim controls (tap & hold)
const leftBtn = document.getElementById("aim-left"),
  rightBtn = document.getElementById("aim-right");

leftBtn.onclick = () => {
  aimAngle = (aimAngle + TAP_STEP) % 360;
};
leftBtn.onmousedown = () => {
  leftHoldInt = setInterval(() => {
    aimAngle = (aimAngle + HOLD_STEP) % 360;
  }, HOLD_RATE);
};
leftBtn.onmouseup = leftBtn.onmouseleave = () => clearInterval(leftHoldInt);

rightBtn.onclick = () => {
  aimAngle = (aimAngle - TAP_STEP + 360) % 360;
};
rightBtn.onmousedown = () => {
  rightHoldInt = setInterval(() => {
    aimAngle = (aimAngle - HOLD_STEP + 360) % 360;
  }, HOLD_RATE);
};
rightBtn.onmouseup = rightBtn.onmouseleave = () => clearInterval(rightHoldInt);

// Swing button
document.getElementById("swing").onclick = () => {
  if (swingPhase === 0) {
    // start power sweep
    startMeter();
  } else if (swingPhase === 1) {
    // lock power, start accuracy sweep
    shotResult.power = computePower(meterAngle);
    meterDir = -1;
    swingPhase = 2;
  } else if (swingPhase === 2) {
    // lock accuracy, take the shot
    shotResult.accuracy = computeAccuracy(meterAngle);
    cancelAnimationFrame(meterRaf);

    shots++;
    updateHoleLabel();
    swingPhase = 0;

    // compute distance & direction
    const dist = maxDist[clubs[clubIdx]] * shotResult.power;
    const aimRad = (aimAngle * Math.PI) / 180;
    const errDeg = (1 - shotResult.accuracy) * MAX_ERR_DEG;
    const errRad = ((errDeg * Math.PI) / 180) * (Math.random() < 0.5 ? -1 : 1);
    const final = aimRad + errRad;
    const speed = dist * (1 - FRICTION);

    ball.vx = Math.cos(final) * speed;
    ball.vy = -Math.sin(final) * speed;
    ball.vz = clubs[clubIdx] === "Putter" ? 0 : dist * 0.01 + 4;
    ball.moving = true;
  }
};

// ===== Startup =====
window.addEventListener("load", () => {
  drawGaugeCanvas();
  initHole();
  loop();
});
