// game.js

// --- hole definitions ---
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

let currentHole = 0;

// --- clubs & swing states ---
const clubs = ["Wedge", "9-Iron", "7-Iron", "5-Iron", "3-Wood", "Driver"];
let clubIdx = 0;
let aimAngle = 0; // degrees
let swingState = 0; // 0=ready,1=power,2=accuracy
let power = 0;
let accuracy = 0;

// --- ball state ---
let ball = { x: 0, y: 0, vx: 0, vy: 0, moving: false };

// --- setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const holeLabel = document.getElementById("hole-label");
const clubLabel = document.getElementById("current-club");
const aimLabel = document.getElementById("aim-angle");

function initHole() {
  const h = holes[currentHole];
  ball.x = h.tee.x;
  ball.y = h.tee.y;
  ball.vx = ball.vy = 0;
  ball.moving = false;
  document.getElementById("swing").innerText = "Swing";
  swingState = 0;
  power = 0;
  accuracy = 0;
  holeLabel.innerText = `Hole ${currentHole + 1} (Par ${h.par})`;
}

function drawHole() {
  const h = holes[currentHole];
  // fairway
  ctx.fillStyle = h.fairwayColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // tee marker
  ctx.fillStyle = "#444";
  ctx.fillRect(h.tee.x - 5, h.tee.y - 5, 10, 10);

  // hole & flag
  ctx.beginPath();
  ctx.arc(h.hole.x, h.hole.y, h.hole.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  // simple flag
  ctx.fillStyle = "red";
  ctx.fillRect(h.hole.x, h.hole.y - 30, 2, 30);
  ctx.beginPath();
  ctx.moveTo(h.hole.x + 2, h.hole.y - 30);
  ctx.lineTo(h.hole.x + 15, h.hole.y - 22);
  ctx.lineTo(h.hole.x + 2, h.hole.y - 14);
  ctx.fill();
}

function drawBall() {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function updateBall() {
  if (!ball.moving) return;
  ball.x += ball.vx;
  ball.y += ball.vy;
  // simple friction
  ball.vx *= 0.98;
  ball.vy *= 0.98;
  if (Math.hypot(ball.vx, ball.vy) < 0.2) ball.moving = false;
}

// --- swing meter loop ---
let meterInterval;
function startPowerMeter() {
  power = 0;
  const dir = 1;
  meterInterval = setInterval(() => {
    power += dir * 2;
    if (power >= 100 || power <= 0) power = Math.max(0, Math.min(100, power));
    // TODO: draw on UI or console.log for now:
    document.getElementById("swing").innerText = `Power: ${power}%`;
  }, 10);
}

// --- main draw ---
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHole();
  drawBall();
  updateBall();
  requestAnimationFrame(loop);
}

// --- event bindings ---
document.getElementById("prev-hole").onclick = () => {
  currentHole = (currentHole + holes.length - 1) % holes.length;
  initHole();
};
document.getElementById("next-hole").onclick = () => {
  currentHole = (currentHole + 1) % holes.length;
  initHole();
};

document.getElementById("prev-club").onclick = () => {
  clubIdx = (clubIdx + clubs.length - 1) % clubs.length;
  clubLabel.innerText = clubs[clubIdx];
};
document.getElementById("next-club").onclick = () => {
  clubIdx = (clubIdx + 1) % clubs.length;
  clubLabel.innerText = clubs[clubIdx];
};

document.getElementById("aim-left").onclick = () => {
  aimAngle = (aimAngle - 5 + 360) % 360;
  aimLabel.innerText = `${aimAngle}°`;
};
document.getElementById("aim-right").onclick = () => {
  aimAngle = (aimAngle + 5) % 360;
  aimLabel.innerText = `${aimAngle}°`;
};

document.getElementById("swing").onclick = () => {
  if (swingState === 0) {
    // START power meter
    startPowerMeter();
    swingState = 1;
  } else if (swingState === 1) {
    // LOCK power
    clearInterval(meterInterval);
    swingState = 2;
    // start accuracy meter
    accuracy = 0;
    const dir = 1;
    meterInterval = setInterval(() => {
      accuracy += dir * 4;
      if (accuracy >= 100 || accuracy <= 0)
        accuracy = Math.max(0, Math.min(100, accuracy));
      document.getElementById("swing").innerText = `Acc: ${accuracy}%`;
    }, 10);
  } else if (swingState === 2) {
    // FIRE!
    clearInterval(meterInterval);
    const rad = (aimAngle * Math.PI) / 180;
    // simple velocity calc: power→speed, club modifier
    const clubPower = (clubs.length - clubIdx) * 0.5 + 1;
    const speed = (power / 100) * clubPower * 15;
    ball.vx = Math.cos(rad) * speed;
    ball.vy = Math.sin(rad) * -speed;
    ball.moving = true;
    swingState = 0;
    document.getElementById("swing").innerText = "Swing";
  }
};

// kick off
initHole();
loop();
