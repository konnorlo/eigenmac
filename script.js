// DVD logo settings (easy tweak)
const DVD_SPEED_X = 16;
const DVD_SPEED_Y = 14;
const DVD_WIDTH = 420;
const DVD_HEIGHT = 240;
const DVD_OPACITY = 0.82;
const CORNER_CHANCE = 0.12;
const DVD_SPEED_MIN = 0.5;
const DVD_SPEED_MAX = 3;
const DVD_SIZE_MIN = 0.25;
const DVD_SIZE_MAX = 1.25;
const DVD_ACCEL_RATE = 0.015;
const DVD_MAX_MULT = 1.8;
const DVD_BOUNCE_MULT = 0.22;

// Game default settings (easy tweak)
const DEFAULT_TIME_LIMIT = 120;
const DEFAULT_RANGE = 6;
const DEFAULT_SIZE_MIN = 2;
const DEFAULT_SIZE_MAX = 3;
const DEFAULT_SYMMETRIC = false;
const DEFAULT_MODE = 'classic';
const DEFAULT_DIFFICULTY = 'medium';

// Optional API (leave empty to disable)
const API_BASE_URL = 'https://eigenmac1.onrender.com';
const POWER_FORMULA = 'best avg 5 in a row × (matrix size)!';


const BATTLE_DURATION = 110;
const BATTLE_COMPETITORS = 99;
const BATTLE_MEAN_MULT = 0.9;
const BOT_MEAN_RATE = 0.1;
const BOT_STD_RATE = 0.04;
const CUT_TIMES = [23, 39, 55, 66, 78, 94, 109, 125, 140];
const CUT_RANKS = [60, 45, 30, 25, 18, 12, 8, 5, 3];

const DIFFICULTY_PARAMS = {
  easy: { mean: 0.07, std: 0.04 },
  medium: { mean: 0.1, std: 0.05 },
  hard: { mean: 0.13, std: 0.06 },
  improbable: { mean: 0.17, std: 0.08 }
};

const matrixEl = document.getElementById('matrix');
const answerEl = document.getElementById('answer');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const feedbackEl = document.getElementById('feedback');

const startBtn = document.getElementById('start');
const editSettingsBtn = document.getElementById('edit-settings');

const timeLimitInput = document.getElementById('time-limit');
const rangeInput = document.getElementById('range');
const symmetricInput = document.getElementById('symmetric');
const sizeMinInput = document.getElementById('size-min');
const sizeMaxInput = document.getElementById('size-max');
const modeInput = document.getElementById('mode');
const difficultyInput = document.getElementById('difficulty');
const difficultyWrap = document.getElementById('difficulty-wrap');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const authSignupBtn = document.getElementById('auth-signup');
const authLoginBtn = document.getElementById('auth-login');
const authLogoutBtn = document.getElementById('auth-logout');
const authStatusEl = document.getElementById('auth-status');
const powerToggleBtn = document.getElementById('power-toggle');
const powerModalEl = document.getElementById('power-modal');
const powerListEl = document.getElementById('power-list');
const powerCloseBtn = document.getElementById('power-close');

const screenStart = document.getElementById('screen-start');
const screenGame = document.getElementById('screen-game');
const screenDeploy = document.getElementById('screen-deploy');
const statsEl = document.getElementById('stats');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const battleStatusEl = document.getElementById('battle-status');
const deployScreen = document.getElementById('screen-deploy');
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardListEl = document.getElementById('leaderboard-list');
const battleLayoutEl = document.getElementById('battle-layout');
const powerScoreEl = document.getElementById('power-score');
const pad = document.getElementById('pad');
const dvdTemplate = document.getElementById('dvd-template');
const confetti = document.getElementById('confetti');
const resultOverlay = document.getElementById('result-overlay');
const confettiImg = new Image();
confettiImg.src = 'confetti.png';
const resultBetterImg = new Image();
const resultLowerImg = new Image();
const resultRoyaleWinImg = new Image();
const paircraftImg = new Image();
resultBetterImg.src = 'better-than-best.png';
resultLowerImg.src = 'lower-than-best.png';
resultRoyaleWinImg.src = 'royale-winner.png';
paircraftImg.src = 'paircraft.png';

const BOT_NAMES = [
  'Marla Kingsley',
  'Devon Pike',
  'Avery Holt',
  'Rowan Hale',
  'Sloan Mercer',
  'Quinn Calder',
  'Talia Wren',
  'Elias Brook',
  'Nora Voss',
  'Milo Hart',
  'Juno Vale',
  'Sasha Reed',
  'Iris Dane',
  'Luca Frost',
  'Remy Clarke',
  'Vera Lane',
  'Alden Cross',
  'Mae Lennox',
  'Zara Finch',
  'Theo Black',
  'Aria Knox',
  'Kian Rhodes',
  'Elise Gray',
  'Bram Noble',
  'Skye Arden',
  'Mira Holt',
  'Gideon Park',
  'Lyra Stone',
  'Owen Vale',
  'Hazel Quinn',
  'Justin Wang',
  'Aarush Chugh',
  'Aarush Chugh',
  'Aarush Chugh',
  'Aarush Chugh',
  'Aarush Chugh',
  'Aman Thawani',
  'Ethan Wang',
  'Ethan Bilderbeek',
  'Kanye West',
  'Ishanth Srinivas',
  'Jordan Hu',
  'Panav Pallothu',
  'Alexandros Lekkas',
  'Rohan Rao',
  'Neal Pannala',
  'Kevin Li',
  'Brian Jiang',
  'Brian Jiang',
  'Brian Jiang',
  'Brian Jiang'
];

const PLAYER_NAME = 'you';
const PAIRCRAFT_CHANCE = 0.08;

let timer = null;
let timeLeft = 0;
let score = 0;
let bestScore = 0;
let gameActive = false;
let currentEigenvalues = [];
let currentInputs = [];
let matched = [];
let currentMatrixSize = DEFAULT_SIZE_MIN;
let playerLastScoreTime = 0;
let auth = null;
let problemStartTime = Date.now();
let dimensionScores = {};
let powerScore = 0;
let settings = {
  timeLimit: DEFAULT_TIME_LIMIT,
  range: DEFAULT_RANGE,
  symmetric: DEFAULT_SYMMETRIC,
  sizeMin: DEFAULT_SIZE_MIN,
  sizeMax: DEFAULT_SIZE_MAX,
  mode: DEFAULT_MODE,
  difficulty: DEFAULT_DIFFICULTY
};

let padCtx = null;
let padDrawing = false;
let padLabelDrawn = false;
let resultBackgroundImg = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiActive = false;
let debugResultBackground = false;
let battle = {
  active: false,
  t: 0,
  cutIndex: 0,
  competitors: [],
  mean: 0,
  std: 0,
  placement: 0,
  eliminated: false
};

const dvdBoxes = [];
let dvdAnimActive = false;
let dvdThrottleThreshold = 8;

function clearDvdBoxes() {
  dvdBoxes.forEach((box) => box.el.remove());
  dvdBoxes.splice(0, dvdBoxes.length);
  dvdAnimActive = false;
}

function showStaticDvd() {
  if (!dvdTemplate) return;
  dvdTemplate.style.display = 'block';
  dvdTemplate.style.opacity = `${DVD_OPACITY}`;
  dvdTemplate.style.width = `${window.innerWidth}px`;
  dvdTemplate.style.height = `${window.innerHeight}px`;
  dvdTemplate.style.transform = 'translate(0, 0)';
}

function hideStaticDvd() {
  if (!dvdTemplate) return;
  dvdTemplate.style.display = 'none';
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function randNormal(mean, std) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

async function ensureAuth() {
  if (!API_BASE_URL) return null;
  if (auth) return auth;
  const stored = localStorage.getItem('eigenmac_auth');
  if (stored) {
    auth = JSON.parse(stored);
    return auth;
  }
  return null;
}

async function refreshAuthStats() {
  if (!API_BASE_URL || !auth) return;
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth)
  });
  if (!res.ok) return;
  const data = await res.json();
  if (typeof data.bestScore === 'number') {
    bestScore = data.bestScore;
    if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  }
  if (typeof data.power === 'number') {
    powerScore = data.power;
    if (powerScoreEl) powerScoreEl.textContent = `power: ${powerScore.toFixed(2)}`;
  }
}


async function submitSolve(dimension, solveSeconds, dimensionScore) {
  if (!API_BASE_URL) return;
  const activeAuth = await ensureAuth();
  if (!activeAuth) return;
  const payload = { ...activeAuth, dimension, solveSeconds, score: dimensionScore };
  const res = await fetch(`${API_BASE_URL}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    const data = await res.json();
    if (typeof data.bestScore === 'number') {
      bestScore = Math.max(bestScore, data.bestScore);
      if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
    }
    if (typeof data.power === 'number') {
      powerScore = data.power;
      if (powerScoreEl) powerScoreEl.textContent = `power: ${powerScore.toFixed(2)}`;
    }
  }
}

async function fetchPowerLeaderboard() {
  if (!API_BASE_URL || !powerListEl) return;
  powerListEl.innerHTML = '<li>loading...</li>';
  const res = await fetch(`${API_BASE_URL}/power-leaderboard`);
  if (!res.ok) {
    powerListEl.innerHTML = '<li>failed to load</li>';
    return;
  }
  const data = await res.json();
  powerListEl.innerHTML = '';
  data.items.forEach((row, idx) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.innerHTML = `<span class="leaderboard-rank">${idx + 1}</span><span class="leaderboard-name">${row.username}</span><span class="leaderboard-score">${row.power.toFixed(2)}</span>`;
    powerListEl.appendChild(li);
  });
}

function setAuth(nextAuth) {
  auth = nextAuth;
  if (auth) {
    localStorage.setItem('eigenmac_auth', JSON.stringify(auth));
    if (authStatusEl) authStatusEl.textContent = `logged in as ${auth.username}`;
    if (authLogoutBtn) authLogoutBtn.classList.remove('hidden');
  } else {
    localStorage.removeItem('eigenmac_auth');
    if (authStatusEl) authStatusEl.textContent = 'not logged in';
    if (authLogoutBtn) authLogoutBtn.classList.add('hidden');
  }
}

async function handleSignup() {
  if (!API_BASE_URL) return;
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();
  if (!username || password.length < 8) {
    if (authStatusEl) authStatusEl.textContent = 'invalid username/password';
    return;
  }
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    if (authStatusEl) authStatusEl.textContent = 'signup failed';
    return;
  }
  setAuth({ username, password });
  bestScore = 0;
  if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
}

async function handleLogin() {
  if (!API_BASE_URL) return;
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();
  if (!username || password.length < 8) {
    if (authStatusEl) authStatusEl.textContent = 'invalid username/password';
    return;
  }
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    if (authStatusEl) authStatusEl.textContent = 'login failed';
    return;
  }
  const data = await res.json();
  setAuth({ username, password });
  if (typeof data.bestScore === 'number') {
    bestScore = data.bestScore;
    if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  }
}

function handleLogout() {
  setAuth(null);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedStep() {
  const r = Math.random();
  if (r < 0.125) return -2;
  if (r < 0.375) return -1;
  if (r < 0.625) return 0;
  if (r < 0.875) return 1;
  return 2;
}

function addRow(matrix, target, source, factor) {
  const n = matrix.length;
  for (let c = 0; c < n; c += 1) {
    matrix[target][c] += factor * matrix[source][c];
  }
}

function addCol(matrix, target, source, factor) {
  const n = matrix.length;
  for (let r = 0; r < n; r += 1) {
    matrix[r][target] += factor * matrix[r][source];
  }
}

function generateProblem() {
  const { range, sizeMin, sizeMax } = settings;
  const min = Math.min(sizeMin, sizeMax);
  const max = Math.max(sizeMin, sizeMax);
  const size = randInt(min, max);
  const bound = 25;
  let matrix = [];
  let eigenvalues = [];

  for (let attempt = 0; attempt < 200; attempt += 1) {
    eigenvalues = Array.from({ length: size }, () => randInt(-range, range));
    if (eigenvalues.every((v) => v === 0)) {
      eigenvalues[0] = 1;
    }

    const ordered = shuffle(eigenvalues);
    matrix = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (r === c ? ordered[r] : 0))
    );

    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) {
          if (i === j) continue;
          const step = weightedStep();
          if (step === 0) continue;
          addRow(matrix, i, j, step);
          addCol(matrix, j, i, -step);
        }
      }
    }

    const within = matrix.every((row) => row.every((val) => val <= bound && val >= -bound));
    const diagonalOnly = matrix.every((row, r) =>
      row.every((val, c) => (r === c ? true : val === 0))
    );
    const upperTriangular = matrix.every((row, r) =>
      row.every((val, c) => (r > c ? val === 0 : true))
    );
    const lowerTriangular = matrix.every((row, r) =>
      row.every((val, c) => (r < c ? val === 0 : true))
    );
    const diagValues = matrix.map((row, i) => row[i]).slice().sort((a, b) => a - b);
    const eigValues = eigenvalues.slice().sort((a, b) => a - b);
    const diagonalEqualsEigen = diagValues.every((v, i) => v === eigValues[i]);
    const trivialEigen = diagonalOnly || upperTriangular || lowerTriangular || diagonalEqualsEigen;
    if (within && !trivialEigen) break;
  }

  return { matrix, eigenvalues };
}

function setMatrixGrid(size) {
  matrixEl.style.setProperty('--n', size);
}

function renderMatrix(matrix) {
  matrixEl.innerHTML = '';
  matrix.flat().forEach((val) => {
    const cell = document.createElement('div');
    cell.className = 'matrix-cell';
    cell.textContent = val;
    matrixEl.appendChild(cell);
  });
}

function buildInputs(count) {
  answerEl.innerHTML = '';
  currentInputs = [];
  matched = Array(count).fill(false);

  for (let i = 0; i < count; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'text';
    input.pattern = '-?[0-9]*';
    input.placeholder = `λ${i + 1}`;
    input.addEventListener('input', () => handleInput(i));
    currentInputs.push(input);
    answerEl.appendChild(input);
  }
}

function focusInput(index) {
  const input = currentInputs[index];
  if (!input) return;
  input.focus();
  input.select();
}

function focusCurrentInput() {
  const activeIndex = currentInputs.findIndex((input) => !input.disabled);
  if (activeIndex === -1) {
    focusInput(0);
    return;
  }
  focusInput(activeIndex);
}

function parseInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  if (!Number.isInteger(num)) return null;
  return num;
}

function canMatch(value, used) {
  for (let i = 0; i < currentEigenvalues.length; i += 1) {
    if (used[i]) continue;
    if (currentEigenvalues[i] === value) return i;
  }
  return -1;
}

function handleInput(index) {
  if (!gameActive) return;
  const value = parseInput(currentInputs[index].value);
  if (value === null) return;

  const used = [...matched];
  const matchIdx = canMatch(value, used);
  if (matchIdx === -1) {
    feedbackEl.textContent = 'Not an eigenvalue.';
    feedbackEl.className = 'feedback error';
    return;
  }

  matched[matchIdx] = true;
  currentInputs[index].value = value;
  currentInputs[index].disabled = true;

  if (index < currentInputs.length - 1) {
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';
    focusInput(index + 1);
    return;
  }

  if (matched.every(Boolean)) {
    score += 1;
    scoreEl.textContent = score;
    if (battle.active) {
      playerLastScoreTime = battle.t;
    }
    const solveSeconds = Math.max(0, Math.round((Date.now() - problemStartTime) / 1000));
    const dimKey = `${currentMatrixSize}`;
    dimensionScores[dimKey] = (dimensionScores[dimKey] || 0) + 1;
    submitSolve(currentMatrixSize, solveSeconds, dimensionScores[dimKey]);
    feedbackEl.textContent = 'Correct!';
    feedbackEl.className = 'feedback success';
    nextProblem();
    spawnDvdBox();
    if (settings.mode === 'battle') {
      updateBattleStatus();
    }
  }
}

function nextProblem() {
  const { matrix, eigenvalues } = generateProblem();
  currentEigenvalues = eigenvalues;
  currentMatrixSize = matrix.length;
  problemStartTime = Date.now();
  setMatrixGrid(matrix.length);
  renderMatrix(matrix);
  buildInputs(eigenvalues.length);
  if (battle.active) {
    battle.competitors.forEach((c) => {
      c.baseRate = Math.max(0.02, randNormal(battle.mean, battle.std));
    });
  }
  if (padCtx && pad) {
    padCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    padLabelDrawn = false;
    drawPadLabel();
  }
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  focusInput(0);
}

function resizePad() {
  if (!pad) return;
  const dpr = window.devicePixelRatio || 1;
  pad.width = Math.floor(window.innerWidth * dpr);
  pad.height = Math.floor(window.innerHeight * dpr);
  pad.style.width = `${window.innerWidth}px`;
  pad.style.height = `${window.innerHeight}px`;
  padCtx = pad.getContext('2d');
  padCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  padCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  padCtx.lineWidth = 2;
  padCtx.lineJoin = 'round';
  padCtx.lineCap = 'round';
  padCtx.strokeStyle = '#111111';
  padLabelDrawn = false;
  if (resultBackgroundImg) {
    drawResultBackground(resultBackgroundImg);
  } else {
    drawPadLabel();
  }
}

function resizeConfetti() {
  if (!confetti) return;
  const dpr = window.devicePixelRatio || 1;
  confetti.width = Math.floor(window.innerWidth * dpr);
  confetti.height = Math.floor(window.innerHeight * dpr);
  confetti.style.width = `${window.innerWidth}px`;
  confetti.style.height = `${window.innerHeight}px`;
  confettiCtx = confetti.getContext('2d');
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function triggerConfetti(x, y) {
  if (!confettiCtx) return;
  const colors = ['#f87171', '#facc15', '#34d399', '#60a5fa', '#f472b6'];
  const count = 90;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    confettiParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 4 + Math.random() * 4,
      life: 60 + Math.random() * 40,
      color: colors[randInt(0, colors.length - 1)],
      img: null,
      rotation: 0,
      rotationSpeed: 0
    });
  }
  if (!confettiActive) {
    confettiActive = true;
    requestAnimationFrame(animateConfetti);
  }
}

function triggerImageConfetti(x, y) {
  if (!confettiCtx || !confettiImg.complete) return;
  const count = 120;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const size = 16 + Math.random() * 16;
    confettiParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size,
      life: 80 + Math.random() * 50,
      color: null,
      img: confettiImg,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    });
  }
  if (!confettiActive) {
    confettiActive = true;
    requestAnimationFrame(animateConfetti);
  }
}

function animateConfetti() {
  if (!confettiCtx) return;
  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confettiParticles = confettiParticles.filter((p) => p.life > 0);
  confettiParticles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 1;
    if (p.img) {
      p.rotation += p.rotationSpeed;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      confettiCtx.restore();
    } else {
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(p.x, p.y, p.size, p.size);
    }
  });

  if (confettiParticles.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiActive = false;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function padPosition(event) {
  return { x: event.clientX, y: event.clientY };
}

function shouldIgnoreDrawTarget(target) {
  if (!target) return false;
  if (target.closest) {
    return !!target.closest('input, button, select, textarea');
  }
  return false;
}

function startPadDraw(event) {
  if (!padCtx) return;
  if (shouldIgnoreDrawTarget(event.target)) return;
  padDrawing = true;
  const { x, y } = padPosition(event);
  padCtx.beginPath();
  padCtx.moveTo(x, y);
}

function drawPad(event) {
  if (!padDrawing || !padCtx) return;
  const { x, y } = padPosition(event);
  padCtx.lineTo(x, y);
  padCtx.stroke();
}

function endPadDraw() {
  padDrawing = false;
}

function drawPadLabel() {
  if (!padCtx || padLabelDrawn) return;
  const x = Math.max(16, window.innerWidth - 240);
  const y = 90;
  padCtx.save();
  padCtx.strokeStyle = '#b8bcc5';
  padCtx.lineWidth = 2.5;
  padCtx.beginPath();
  padCtx.rect(x - 16, y - 56, 210, 90);
  padCtx.stroke();

  padCtx.fillStyle = '#b8bcc5';
  padCtx.font = '28px "Comic Sans MS", "Comic Sans", cursive';
  padCtx.fillText('notepad', x, y);
  padCtx.font = '18px "Comic Sans MS", "Comic Sans", cursive';
  padCtx.fillText('draw here', x + 6, y + 26);
  padCtx.restore();
  padLabelDrawn = true;
}

function drawResultBackground(img) {
  if (!padCtx || !img || !img.complete) return;
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  padCtx.clearRect(0, 0, cw, ch);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (cw - w) / 2;
  const y = (ch - h) / 2;
  padCtx.drawImage(img, x, y, w, h);
  if (debugResultBackground) {
    padCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    padCtx.fillRect(20, 20, 220, 40);
    padCtx.fillStyle = '#ffffff';
    padCtx.font = '16px \"Space Grotesk\", sans-serif';
    padCtx.fillText('RESULT BG LOADED', 30, 46);
  }
}

function startBattle() {
  battle.active = true;
  battle.t = 0;
  battle.cutIndex = 0;
  const diff = DIFFICULTY_PARAMS[settings.difficulty] || DIFFICULTY_PARAMS.medium;
  battle.mean = diff.mean * BATTLE_MEAN_MULT;
  battle.std = diff.std;
  battle.eliminated = false;
  const names = shuffle(BOT_NAMES);
  battle.competitors = Array.from({ length: BATTLE_COMPETITORS }, (_, i) => ({
    name: names[i % names.length],
    baseRate: Math.max(0.02, randNormal(battle.mean, battle.std)),
    score: 0,
    alive: true,
    lastScoreTime: 0
  }));
  playerLastScoreTime = 0;
  updateBattleStatus();
}

function paceCompetitors() {
  const sizeFactor = 2 / (Math.max(2, currentMatrixSize)**1.21);
  battle.competitors.forEach((c) => {
    if (!c.alive) return;
    const expected = Math.floor(c.baseRate * sizeFactor * battle.t);
    if (c.score < expected) {
      c.score = expected;
      c.lastScoreTime = battle.t;
    }
  });
}

function cutCompetitors(cutRankPercent) {
  const alive = battle.competitors.filter((c) => c.alive);
  if (alive.length <= 1) return;
  const keepCount = Math.max(1, Math.ceil(alive.length * (cutRankPercent / 100)));
  const cutCount = Math.max(0, alive.length - keepCount);
  alive.sort((a, b) => a.score - b.score);
  for (let i = 0; i < cutCount; i += 1) {
    alive[i].alive = false;
  }
}

function updateBattleStatus() {
  if (!battleStatusEl) return;
  if (!battle.active) {
    battleStatusEl.textContent = '';
    if (leaderboardEl) leaderboardEl.classList.add('hidden');
    if (battleLayoutEl) battleLayoutEl.classList.add('single');
    return;
  }
  if (leaderboardEl) leaderboardEl.classList.remove('hidden');
  if (battleLayoutEl) battleLayoutEl.classList.remove('single');
  const alive = battle.competitors.filter((c) => c.alive);
  const playerEntry = { name: PLAYER_NAME, score, alive: true, lastScoreTime: playerLastScoreTime };
  const placement = 1 + alive.filter((c) => c.score > score || (c.score === score && c.lastScoreTime < playerLastScoreTime)).length;
  const remaining = alive.length + 1;
  const nextCutTime = CUT_TIMES[battle.cutIndex] ?? BATTLE_DURATION;
  const nextCutIn = Math.max(0, nextCutTime - battle.t);
  battle.placement = placement;
  battleStatusEl.textContent = `placement: ${placement}/${remaining} · next cut in ${nextCutIn}s`;
  renderLeaderboard(playerEntry);
}


function renderLeaderboard(playerEntry) {
  if (!leaderboardListEl) return;
  const top = [...battle.competitors.filter((c) => c.alive), playerEntry]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.lastScoreTime - b.lastScoreTime;
    })
    .slice(0, 20);
  leaderboardListEl.innerHTML = '';
  top.forEach((c, idx) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.innerHTML = `<span class="leaderboard-rank">${idx + 1}</span><span class="leaderboard-name">${c.name}</span><span class="leaderboard-score">${c.score}</span>`;
    leaderboardListEl.appendChild(li);
  });
}

function tickBattle() {
  if (!battle.active) return;
  battle.t += 1;
  paceCompetitors();
  const nextCutTime = CUT_TIMES[battle.cutIndex];
  const nextCutRank = CUT_RANKS[battle.cutIndex];
  if (nextCutTime !== undefined && battle.t >= nextCutTime) {
    cutCompetitors(nextCutRank ?? 80);
    const aliveCount = battle.competitors.filter((c) => c.alive).length;
    const remaining = aliveCount + 1;
    const safeCount = Math.max(1, Math.ceil(remaining * ((nextCutRank ?? 80) / 100)));
    const placement = 1 + battle.competitors.filter((c) => c.alive && (c.score > score || (c.score === score && c.lastScoreTime < playerLastScoreTime))).length;
    battle.placement = placement;
    if (placement > safeCount) {
      battle.eliminated = true;
      endGame();
      return;
    }
    battle.cutIndex += 1;
  }
  updateBattleStatus();
}

function spawnDvdBox() {
  if (!dvdTemplate) return;
  const usePaircraft = Math.random() < PAIRCRAFT_CHANCE;
  const baseSpeed = Math.hypot(DVD_SPEED_X, DVD_SPEED_Y) || 1;
  const speedScale = randFloat(DVD_SPEED_MIN, DVD_SPEED_MAX);
  const sizeScale = randFloat(DVD_SIZE_MIN, DVD_SIZE_MAX);
  const width = DVD_WIDTH * sizeScale;
  const height = DVD_HEIGHT * sizeScale;
  const angle = randFloat(0, Math.PI * 2);
  const speed = baseSpeed * speedScale;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  const el = dvdTemplate.cloneNode(true);
  el.id = '';
  el.classList.remove('dvd-template');
  el.style.display = 'block';
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.opacity = `${DVD_OPACITY}`;
  if (usePaircraft) {
    el.src = 'paircraft.png';
  }
  document.body.appendChild(el);

  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  const x = randFloat(0, maxX);
  const y = randFloat(0, maxY);

  dvdBoxes.push({
    el,
    x,
    y,
    vx,
    vy,
    width,
    height,
    baseSpeed: speed,
    speedMultiplier: 1,
    phase: 'accelerate'
  });
  applyDvdThrottle();
  if (!dvdAnimActive) {
    dvdAnimActive = true;
    requestAnimationFrame(animateDvds);
  }
}

function applyDvdThrottle() {
  if (dvdBoxes.length < dvdThrottleThreshold) return;
  dvdThrottleThreshold *= 2;
  dvdBoxes.forEach((box) => {
    box.width *= 0.5;
    box.height *= 0.5;
    box.vx *= 0.5;
    box.vy *= 0.5;
    box.baseSpeed *= 0.5;
    box.speedMultiplier = Math.min(box.speedMultiplier, 1);
    box.el.style.width = `${box.width}px`;
    box.el.style.height = `${box.height}px`;
    box.x = Math.min(box.x, window.innerWidth - box.width);
    box.y = Math.min(box.y, window.innerHeight - box.height);
  });
}

function handleWallBounce(box) {
  let bouncedX = false;
  let bouncedY = false;

  if (box.x <= 0 || box.x + box.width >= window.innerWidth) {
    box.vx *= -1;
    box.x = Math.max(0, Math.min(box.x, window.innerWidth - box.width));
    bouncedX = true;
  }
  if (box.y <= 0 || box.y + box.height >= window.innerHeight) {
    box.vy *= -1;
    box.y = Math.max(0, Math.min(box.y, window.innerHeight - box.height));
    bouncedY = true;
  }

  if (bouncedX && bouncedY) {
    triggerConfetti(box.x + box.width / 2, box.y + box.height / 2);
  }

  if ((bouncedX || bouncedY) && Math.random() < CORNER_CHANCE) {
    const speed = Math.hypot(box.vx, box.vy) || 2;
    const targetX = box.vx > 0 ? window.innerWidth - box.width : 0;
    const targetY = box.vy > 0 ? window.innerHeight - box.height : 0;
    const dx = targetX - box.x;
    const dy = targetY - box.y;
    const len = Math.hypot(dx, dy) || 1;
    box.vx = (dx / len) * speed;
    box.vy = (dy / len) * speed;
  }

  if (bouncedX || bouncedY) {
    box.speedMultiplier = DVD_BOUNCE_MULT;
    box.phase = 'recover';
  }
}

function handleBoxCollisions() {
  for (let i = 0; i < dvdBoxes.length; i += 1) {
    const a = dvdBoxes[i];
    for (let j = i + 1; j < dvdBoxes.length; j += 1) {
      const b = dvdBoxes[j];
      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
      const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
      if (!overlapX || !overlapY) continue;

      const tempVx = a.vx;
      const tempVy = a.vy;
      a.vx = b.vx;
      a.vy = b.vy;
      b.vx = tempVx;
      b.vy = tempVy;
      const tempSpeed = a.baseSpeed;
      a.baseSpeed = b.baseSpeed;
      b.baseSpeed = tempSpeed;

      const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
      const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const push = 4;
      a.x += (dx / dist) * push;
      a.y += (dy / dist) * push;
      b.x -= (dx / dist) * push;
      b.y -= (dy / dist) * push;
    }
  }
}

function animateDvds() {
  dvdBoxes.forEach((box) => {
    if (box.phase === 'recover') {
      box.speedMultiplier = Math.min(1, box.speedMultiplier + DVD_ACCEL_RATE * 2);
      if (box.speedMultiplier >= 1) {
        box.phase = 'accelerate';
      }
    } else {
      box.speedMultiplier = Math.min(DVD_MAX_MULT, box.speedMultiplier + DVD_ACCEL_RATE);
    }

    box.x += box.vx * box.speedMultiplier;
    box.y += box.vy * box.speedMultiplier;
    handleWallBounce(box);
  });

  handleBoxCollisions();

  dvdBoxes.forEach((box) => {
    box.el.style.transform = `translate(${box.x}px, ${box.y}px)`;
  });

  requestAnimationFrame(animateDvds);
}

function startGame() {
  settings = {
    timeLimit: Number(timeLimitInput.value),
    range: Number(rangeInput.value),
    symmetric: symmetricInput.value === 'yes',
    sizeMin: Number(sizeMinInput.value),
    sizeMax: Number(sizeMaxInput.value),
    mode: modeInput.value,
    difficulty: difficultyInput.value
  };

  score = 0;
  dimensionScores = {};
  timeLeft = settings.mode === 'battle' ? BATTLE_DURATION : settings.timeLimit;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;

  showOnlyScreen(screenGame);
  statsEl.style.visibility = 'visible';
  if (resultOverlay) {
    resultOverlay.style.display = 'none';
    resultOverlay.removeAttribute('src');
    resultOverlay.alt = '';
  }
  resultBackgroundImg = null;
  if (padCtx && pad) {
    padCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    padLabelDrawn = false;
    drawPadLabel();
  }

  gameActive = true;
  hideStaticDvd();
  clearDvdBoxes();
  dvdThrottleThreshold = 8;
  spawnDvdBox();
  nextProblem();
  focusInput(0);

  if (timer) clearInterval(timer);
  if (settings.mode === 'battle') {
    startBattle();
  } else if (battleStatusEl) {
    battleStatusEl.textContent = '';
  }
  if (leaderboardEl) {
    leaderboardEl.classList.toggle('hidden', settings.mode !== 'battle');
  }
  if (battleLayoutEl) {
    battleLayoutEl.classList.toggle('single', settings.mode !== 'battle');
  }
  timer = setInterval(() => {
    timeLeft -= 1;
    timeEl.textContent = timeLeft;
    if (settings.mode === 'battle') {
      tickBattle();
      if (battle.active && battle.t >= BATTLE_DURATION) {
        endGame();
      }
    } else if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameActive = false;
  clearInterval(timer);
  timer = null;
  const prevBest = bestScore;
  if (score >= bestScore) {
    bestScore = score;
    if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  }
  debugResultBackground = false;
  if (score >= prevBest) {
    resultBackgroundImg = resultBetterImg;
  } else if (score < prevBest) {
    resultBackgroundImg = resultLowerImg;
  } else {
    resultBackgroundImg = null;
  }
  if (resultOverlay) {
    if (settings.mode === 'battle' && battle.placement === 1 && !battle.eliminated) {
      resultOverlay.src = 'royale-winner.png';
      resultOverlay.alt = 'battle royale winner';
      resultOverlay.style.display = 'block';
    } else if (battle.eliminated) {
      resultOverlay.src = 'lower-than-best.png';
      resultOverlay.alt = 'lower than best';
      resultOverlay.style.display = 'block';
    } else if (score >= prevBest) {
      resultOverlay.src = 'better-than-best.png';
      resultOverlay.alt = 'better than best';
      resultOverlay.style.display = 'block';
    } else if (score < prevBest) {
      resultOverlay.src = 'lower-than-best.png';
      resultOverlay.alt = 'lower than best';
      resultOverlay.style.display = 'block';
    } else {
      resultOverlay.style.display = 'none';
      resultOverlay.removeAttribute('src');
      resultOverlay.alt = '';
    }
  }
  if (settings.mode === 'battle') {
    finalScoreEl.textContent = `score: ${score} · rank: ${battle.placement}/${BATTLE_COMPETITORS + 1}`;
  } else {
    finalScoreEl.textContent = `score: ${score}`;
  }
  screenStart.classList.add('hidden');
  screenGame.classList.add('hidden');
  screenDeploy.classList.remove('hidden');
  screenStart.style.display = 'none';
  screenGame.style.display = 'none';
  screenDeploy.style.display = 'block';
  triggerImageConfetti(window.innerWidth / 2, window.innerHeight / 2);
  hideStaticDvd();
  clearDvdBoxes();
  battle.active = false;
}

function showStartScreen() {
  showOnlyScreen(screenStart);
  statsEl.style.visibility = 'hidden';
}

function showOnlyScreen(target) {
  [screenStart, screenGame, screenDeploy].forEach((screen) => {
    if (!screen) return;
    if (screen === target) {
      screen.classList.remove('hidden');
      screen.style.display = 'block';
    } else {
      screen.classList.add('hidden');
      screen.style.display = 'none';
    }
  });
}

startBtn.addEventListener('click', startGame);
editSettingsBtn.addEventListener('click', showStartScreen);
modeInput.addEventListener('change', () => {
  difficultyWrap.classList.toggle('hidden', modeInput.value !== 'battle');
});
const setPowerModalOpen = async (isOpen) => {
  if (!powerModalEl) return;
  if (isOpen) {
    powerModalEl.classList.remove('hidden');
    powerModalEl.style.display = 'grid';
    await fetchPowerLeaderboard();
  } else {
    powerModalEl.classList.add('hidden');
    powerModalEl.style.display = 'none';
  }
};
if (powerToggleBtn && powerModalEl) {
  powerToggleBtn.addEventListener('click', async () => {
    const isOpen = powerModalEl.classList.contains('hidden');
    await setPowerModalOpen(isOpen);
  });
}
if (powerCloseBtn && powerModalEl) {
  powerCloseBtn.addEventListener('click', () => {
    setPowerModalOpen(false);
  });
}
if (powerModalEl) {
  powerModalEl.addEventListener('click', (event) => {
    if (event.target === powerModalEl) {
      setPowerModalOpen(false);
    }
  });
}
if (authSignupBtn) authSignupBtn.addEventListener('click', handleSignup);
if (authLoginBtn) authLoginBtn.addEventListener('click', handleLogin);
if (authLogoutBtn) authLogoutBtn.addEventListener('click', handleLogout);

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  if (screenDeploy.classList.contains('hidden')) return;
  event.preventDefault();
  startGame();
});

window.addEventListener('load', () => {
  statsEl.style.visibility = 'hidden';
  timeLimitInput.value = DEFAULT_TIME_LIMIT;
  rangeInput.value = DEFAULT_RANGE;
  sizeMinInput.value = `${DEFAULT_SIZE_MIN}`;
  sizeMaxInput.value = `${DEFAULT_SIZE_MAX}`;
  symmetricInput.value = DEFAULT_SYMMETRIC ? 'yes' : 'no';
  modeInput.value = DEFAULT_MODE;
  difficultyInput.value = DEFAULT_DIFFICULTY;
  difficultyWrap.classList.toggle('hidden', modeInput.value !== 'battle');
  if (leaderboardEl) leaderboardEl.classList.add('hidden');
  if (API_BASE_URL) {
    const stored = localStorage.getItem('eigenmac_auth');
    if (stored) {
      setAuth(JSON.parse(stored));
      refreshAuthStats();
    }
  } else {
    setAuth(null);
  }
  if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  resizePad();
  resizeConfetti();
  showStaticDvd();
  if (pad) {
    document.addEventListener('mousedown', startPadDraw);
    document.addEventListener('mousemove', drawPad);
    window.addEventListener('mouseup', () => {
      endPadDraw();
      if (gameActive) focusCurrentInput();
    });
  }
  window.addEventListener('resize', resizePad);
  window.addEventListener('resize', resizeConfetti);
  window.addEventListener('resize', () => {
    dvdBoxes.forEach((box) => {
      box.x = Math.min(box.x, window.innerWidth - box.width);
      box.y = Math.min(box.y, window.innerHeight - box.height);
    });
  });
});

document.addEventListener('mouseup', (event) => {
  if (!gameActive) return;
  if (event.target && event.target.tagName === 'INPUT') return;
  focusCurrentInput();
});
