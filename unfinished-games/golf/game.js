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
  // These zones define where the meter needle needs to be for good shots.
  // 0 degrees is up, 90 is right (or left on meter), 180 is down.
  // The visual gauge makes 80-100 degrees (near horizontal) the "green" zone.
  const zones = [
    { start: 80, end: 100, color: "limegreen" }, // Best
    { start: 100, end: 110, color: "gold" }, // Good
    { start: 110, end: 130, color: "orange" }, // Fair
    { start: 130, end: 180, color: "red" }, // Poor
    // Assuming zones mirrored for angles 0-80 if meter sweeps full range
    // For simplicity, we consider 0-80 as effectively "red" or minimal power/accuracy.
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

    // bottom (accuracy) - drawn identically to visually suggest same targetting
    const lo = 180 - z.end, // These map to the same visual areas
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
    const ang = Math.PI * (1 - frac); // 0 is right, PI is left. Meter is 0 (up) to 180 (down).
    // Tick marks here are for visual reference on the semi-circle display.
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

    // Adjusted label positioning for clarity
    const lx = cx + Math.cos(ang) * (r - 30); // Bring labels closer
    const ly = cy + Math.sin(ang) * (r - 30);
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    // Display labels 0, 25, 50, 75, 100 relative to meter sweep for user understanding if desired
    // Current labels are 0,25,50,75,100 - mapping to 180, 135, 90, 45, 0 degrees of meterAngle
    // E.g., label "100" is at ang=0 (right), which is meterAngle ~90 if center aligned.
    // Let's keep it simple, these are just visual ticks.
    ctx2.fillText(`${i * 25}`, lx, ly);
  }
}

// ===== Shot-Meter Logic =====
let meterAngle = 180; // start pointing down
let meterDir = -1; // move toward up (0°)
let lastTime = null;
let meterRaf = null;
let swingPhase = 0; // 0=ready → 1=power → 2=accuracy
const shotResult = { power: 0, accuracy: 0 };
const swingButton = document.getElementById("swing"); // Get swing button once

// **MODIFIED**: Renamed POWER_ZONES to METER_ZONES
// These zones define the effectiveness factor based on the meter's angle (0-180).
// 0 is straight up, 90 is horizontal, 180 is straight down.
// An angle between 80-100 (near horizontal on the gauge) gives max factor.
const METER_ZONES = [
  { start: 80, end: 100, factor: 1.0 }, // Best (e.g., green zone)
  { start: 100, end: 110, factor: 0.8 }, // Good (e.g., gold zone)
  { start: 70, end: 80, factor: 0.8 }, // Symmetric good zone
  { start: 110, end: 130, factor: 0.6 }, // Fair
  { start: 50, end: 70, factor: 0.6 }, // Symmetric fair
  { start: 130, end: 180, factor: 0.4 }, // Poor
  { start: 0, end: 50, factor: 0.4 }, // Symmetric poor
];

// **MODIFIED**: Simplified to getZoneFactor, removed wrapAngle as meterAngle is 0-180
function getZoneFactor(angle) {
  const zone = METER_ZONES.find((z) => angle >= z.start && angle <= z.end);
  return zone ? zone.factor : 0.2; // Default to a low factor if not in a defined zone (e.g. 0-50 if not covered)
}

function drawMeter(ts) {
  if (lastTime === null) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;

  meterAngle += meterDir * 270 * dt; // Speed of meter (degrees per second) - increased for more challenge

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
  swingPhase = 1;
  swingButton.innerText = "Set Power"; // **MODIFIED**
  meterAngle = 180;
  meterDir = -1;
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
let totalScore = 0; // **ADDED**: Total score tracking

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
  // Max distance in pixels
  Putter: 80, // Reduced putter max distance
  Wedge: 150, // Adjusted distances for better gameplay feel
  "9-Iron": 180,
  "7-Iron": 210,
  "5-Iron": 240,
  "3-Wood": 270,
  Driver: 300, // Canvas is 800 wide, 500 was too much for single shot to hole.
};
let clubIdx = 1; // Default to Wedge

// ===== Aim & Ball State =====
let aimAngle = 0; // Angle in degrees, 0 is right, 90 is up.

const ball = { x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, moving: false };

// ===== Rendering Setup =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const holeLabel = document.getElementById("hole-label");
const clubLabel = document.getElementById("current-club");
const totalScoreLabel = document.createElement("span"); // **ADDED**: Score display
totalScoreLabel.id = "total-score-label";
document.getElementById("top-bar").appendChild(totalScoreLabel);

// hatch pattern for semi-transparent fill (not currently used, but good to have)
/*
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
*/

// ===== Constants =====
const AIR_FRICTION = 0.992; // **ADDED**: Slight air resistance
const GROUND_FRICTION = 0.96; // Original FRICTION was 0.98
const GRAVITY = 0.25; // Adjusted gravity
const TAP_STEP = 3, // Degrees per click
  HOLD_STEP = 7, // Degrees per interval when holding
  HOLD_RATE = 40, // Milliseconds for hold interval
  MAX_ERR_DEG = 15; // Max error in degrees for worst accuracy

let leftHoldInt = null,
  rightHoldInt = null;

// ===== UI Helpers =====
function updateHoleLabel() {
  const h = holes[currentHole];
  holeLabel.innerText = `Hole ${currentHole + 1} (Par ${h.par}) – Shots: ${shots}`;
  totalScoreLabel.innerText = `Total: ${totalScore >= 0 ? "+" : ""}${totalScore}`; // **ADDED**
}

function initHole(resetScorecard = false) {
  const h = holes[currentHole];
  ball.x = h.tee.x;
  ball.y = h.tee.y;
  ball.vx = ball.vy = ball.z = ball.vz = 0;
  ball.moving = false;

  shots = 0;
  swingPhase = 0;
  swingButton.innerText = "Swing"; // **MODIFIED**
  aimAngle = 0; // Default aim to the right

  if (resetScorecard) {
    totalScore = 0;
  }

  clubLabel.innerText = clubs[clubIdx];
  updateHoleLabel();
  document.getElementById("indicator").style.transform = `rotate(180deg)`; // Reset meter indicator
  cancelAnimationFrame(meterRaf); // Ensure meter is stopped
}

// ===== Draw Routines =====
function drawGolfer() {
  // **MODIFIED**: Draw golfer at ball's current position and rotated by aimAngle
  if (ball.moving || swingPhase !== 0) return; // Don't draw if ball moving or mid-swing

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate((-aimAngle * Math.PI) / 180); // Negative due to canvas Y-axis down

  // Golfer drawn relative to (0,0) after translation/rotation
  // Simple triangular body for retro look
  ctx.fillStyle = "#333"; // Darker golfer
  ctx.beginPath();
  ctx.moveTo(0, 0); // Feet at ball position
  ctx.lineTo(-5, -25); // Left shoulder
  ctx.lineTo(5, -25); // Right shoulder
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = "#f0d9b5"; // Skin tone
  ctx.beginPath();
  ctx.arc(0, -30, 5, 0, Math.PI * 2); // Head centered above body
  ctx.fill();

  // Club (simple line)
  ctx.strokeStyle = "#777"; // Grey club
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -5); // Grip area
  ctx.lineTo(25, 5); // Club head direction (points right by default before rotation)
  ctx.stroke();

  ctx.restore();
}

function drawHole() {
  const h = holes[currentHole];
  ctx.fillStyle = h.fairwayColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tee Box Markers
  ctx.fillStyle = "#ddd"; // Light grey for tee markers
  ctx.fillRect(h.tee.x - 10, h.tee.y - 3, 8, 8); // Left marker
  ctx.fillRect(h.tee.x + 2, h.tee.y - 3, 8, 8); // Right marker

  // Hole Cup
  ctx.fillStyle = "#222"; // Darker hole
  ctx.beginPath();
  ctx.arc(h.hole.x, h.hole.y, h.hole.radius, 0, Math.PI * 2);
  ctx.fill();

  // Flagstick
  ctx.fillStyle = "#999"; // Pole color
  ctx.fillRect(h.hole.x - 1, h.hole.y - 30, 2, 30); // Pole

  ctx.fillStyle = "red"; // Flag color
  ctx.beginPath();
  ctx.moveTo(h.hole.x, h.hole.y - 30); // Attach to pole
  ctx.lineTo(h.hole.x + 15, h.hole.y - 25);
  ctx.lineTo(h.hole.x, h.hole.y - 20);
  ctx.closePath();
  ctx.fill(); // flag
}

function drawBall() {
  // Shadow
  if (ball.z > 0) {
    const shadowSize = Math.max(2, 6 - ball.z * 0.1); // Shadow shrinks as ball goes higher
    const shadowOpacity = Math.max(0.1, 0.4 - ball.z * 0.01);
    ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
    ctx.beginPath();
    // Elliptical shadow, gets smaller when ball is higher
    ctx.ellipse(
      ball.x,
      ball.y + 2,
      shadowSize * 1.5,
      shadowSize * 0.75,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Ball
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  // Draw ball slightly above its shadow/ground position based on z (height)
  ctx.arc(ball.x, ball.y - ball.z, 5, 0, Math.PI * 2); // Ball radius 5
  ctx.fill();
  // Small black dot for spin/orientation (optional)
  // ctx.fillStyle = "#000";
  // ctx.beginPath();
  // ctx.arc(ball.x + 2, ball.y - ball.z - 2, 1, 0, Math.PI * 2);
  // ctx.fill();
}

function updateBall() {
  if (!ball.moving) return;

  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.z += ball.vz;
  ball.vz -= GRAVITY;

  if (ball.z < 0) {
    // Ball has hit or gone below ground
    ball.z = 0;
    ball.vz = -ball.vz * 0.3; // Bounce slightly, losing energy
    if (Math.abs(ball.vz) < 0.5) ball.vz = 0; // Stop bouncing if very little bounce
  }

  // Apply friction
  const currentFriction =
    ball.z > 0 && ball.vz > 0 ? AIR_FRICTION : GROUND_FRICTION; // Less friction in air
  ball.vx *= currentFriction;
  ball.vy *= currentFriction;

  // Check for out of bounds (simple canvas boundary)
  if (
    ball.x < 0 ||
    ball.x > canvas.width ||
    ball.y < 0 ||
    ball.y > canvas.height
  ) {
    alert(
      "Out of bounds! Penalty +1 shot. Resetting ball to previous position.",
    );
    shots++; // Penalty stroke
    // Reset to position before this shot - requires storing previous ball position
    // For now, just stop it and let player play from there (or reset to tee for simplicity in this version)
    // Simplified: For this example, let's just put it back on the tee for simplicity of not storing last pos
    // More robust: store ball.last_x, ball.last_y before shot.
    ball.x = holes[currentHole].tee.x; // Simplification: back to tee
    ball.y = holes[currentHole].tee.y;
    ball.moving = false;
    updateHoleLabel();
    return;
  }

  const h = holes[currentHole].hole;
  if (ball.z === 0 && Math.hypot(ball.x - h.x, ball.y - h.y) < h.radius) {
    ball.moving = false;
    ball.vx = 0; // Stop ball in hole
    ball.vy = 0;
    setTimeout(() => {
      const scoreForHole = shots - h.par;
      let scoreText = "";
      if (scoreForHole === 0) scoreText = "Par!";
      else if (scoreForHole < 0) scoreText = `${scoreForHole}! Birdie/Eagle!`;
      else scoreText = `+${scoreForHole}. Bogey.`;

      totalScore += scoreForHole; // **ADDED**
      alert(
        `Hole ${currentHole + 1} complete! In ${shots} shots. (${scoreText})`,
      );

      currentHole = currentHole + 1;
      if (currentHole >= holes.length) {
        alert(
          `Congratulations! You completed the course! Final Score: ${totalScore >= 0 ? "+" : ""}${totalScore}`,
        );
        currentHole = 0; // Restart or go to a game end screen
        initHole(true); // Reset scorecard for new game
      } else {
        initHole();
      }
    }, 200);
  } else if (Math.hypot(ball.vx, ball.vy) < 0.1 && ball.z === 0) {
    // Ball stops if slow enough on the ground
    ball.moving = false;
    ball.vx = 0;
    ball.vy = 0;
    swingButton.disabled = false; // Re-enable swing button
  }
}

function drawAimMarkers() {
  if (ball.moving || swingPhase > 0) return;
  const club = clubs[clubIdx];
  const dist = maxDist[club];
  const rad = (aimAngle * Math.PI) / 180; // aimAngle is CW from positive X, need CCW for math
  const dx = Math.cos(-rad); // For screen coords, positive angle means clockwise from positive x-axis.
  const dy = Math.sin(-rad); // Standard math angle (CCW from +X) for cos/sin.

  ctx.save();
  ctx.translate(ball.x, ball.y); // Markers originate from ball

  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const px = dx * dist * f;
    const py = dy * dist * f;
    ctx.fillStyle = f === 1 ? "rgba(255,0,0,0.7)" : "rgba(255,255,255,0.5)"; // Red for max, white for intermediate
    ctx.beginPath();
    ctx.arc(px, py, f === 1 ? 4 : 2, 0, Math.PI * 2); // Bigger marker for max distance
    ctx.fill();
  });

  // Draw a line for the aim direction
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(dx * dist, dy * dist);
  ctx.stroke();

  ctx.restore();
}

// ===== Main Loop =====
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHole();
  // Draw golfer before ball if golfer is "behind" ball
  drawBall(); // Draw ball first so golfer can be 'on top' or aiming relative to it
  drawGolfer(); // Draw golfer if applicable
  drawAimMarkers(); // Draw markers if applicable
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
  aimAngle = (aimAngle + TAP_STEP + 360) % 360;
};
leftBtn.onmousedown = () => {
  clearInterval(leftHoldInt); // Clear any existing interval
  aimAngle = (aimAngle + TAP_STEP + 360) % 360; // Immediate feedback
  leftHoldInt = setInterval(() => {
    aimAngle = (aimAngle + HOLD_STEP + 360) % 360;
  }, HOLD_RATE);
};
leftBtn.onmouseup = leftBtn.onmouseleave = () => clearInterval(leftHoldInt);

rightBtn.onclick = () => {
  aimAngle = (aimAngle - TAP_STEP + 360) % 360;
};
rightBtn.onmousedown = () => {
  clearInterval(rightHoldInt);
  aimAngle = (aimAngle - TAP_STEP + 360) % 360; // Immediate feedback
  rightHoldInt = setInterval(() => {
    aimAngle = (aimAngle - HOLD_STEP + 360) % 360;
  }, HOLD_RATE);
};
rightBtn.onmouseup = rightBtn.onmouseleave = () => clearInterval(rightHoldInt);

// Swing button
swingButton.onclick = () => {
  if (ball.moving) return; // Don't allow swing if ball is already moving

  if (swingPhase === 0) {
    swingButton.disabled = true; // Disable button briefly to prevent double clicks
    startMeter();
    swingButton.disabled = false; // Re-enable after processing start
  } else if (swingPhase === 1) {
    // Power set
    swingButton.disabled = true;
    shotResult.power = getZoneFactor(meterAngle); // **MODIFIED**
    // Keep meter going for accuracy, reset direction if preferred, or just continue
    meterDir *= -1; // Reverse meter for accuracy phase, or reset: meterAngle = 180; meterDir = -1;
    lastTime = null; // Reset lastTime for smooth transition
    swingPhase = 2;
    swingButton.innerText = "Set Accuracy"; // **MODIFIED**
    swingButton.disabled = false;
  } else if (swingPhase === 2) {
    // Accuracy set
    swingButton.disabled = true;
    shotResult.accuracy = getZoneFactor(meterAngle); // **MODIFIED**
    cancelAnimationFrame(meterRaf);
    document.getElementById("indicator").style.transform = `rotate(180deg)`; // Reset indicator visually

    shots++;
    updateHoleLabel();
    swingPhase = 0;
    swingButton.innerText = "Swing"; // **MODIFIED**

    // Store pre-shot position for potential OOB reset
    // ball.last_x = ball.x; ball.last_y = ball.y;

    const clubName = clubs[clubIdx];
    const baseDist = maxDist[clubName] * shotResult.power;

    // Angle calculation: aimAngle is 0 right, positive CCW.
    // Convert to standard radians for math: positive CCW from positive X-axis.
    const aimRad = (-aimAngle * Math.PI) / 180; // Game uses CW, math uses CCW

    // Accuracy influences the final angle. Perfect accuracy (1.0) = 0 error.
    const errorSign = Math.random() < 0.5 ? -1 : 1;
    const errorAmount = (1 - shotResult.accuracy) * MAX_ERR_DEG; // Max error of MAX_ERR_DEG degrees
    const errRad = (errorSign * errorAmount * Math.PI) / 180;
    const finalAngleRad = aimRad + errRad;

    // Initial speed calculation (adjust factor as needed for feel)
    // The original calculation `baseDist * (1 - GROUND_FRICTION)` is effectively V0 = X * (1-f)
    // which means distance X = V0 / (1-f). This is sound.
    const initialSpeed = baseDist * (1 - GROUND_FRICTION); // This determines travel distance on ground

    ball.vx = Math.cos(finalAngleRad) * initialSpeed;
    ball.vy = Math.sin(finalAngleRad) * initialSpeed;

    // Launch angle (vz) - higher for longer clubs, lower for shorter. Putter is flat.
    // Increased launch height for more hang time, proportional to distance
    ball.vz =
      clubName === "Putter"
        ? 0
        : Math.max(1, baseDist * 0.02 + 2) * shotResult.power;
    if (shotResult.power < 0.3) ball.vz *= 0.5; // Lower flight for very weak shots

    ball.moving = true;
    swingButton.disabled = false; // Re-enable after shot
  }
};

// ===== Startup =====
window.addEventListener("load", () => {
  drawGaugeCanvas();
  initHole(true); // Initialize first hole and reset scorecard
  loop();
});
