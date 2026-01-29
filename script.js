// DVD logo settings
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

// Game default settings
const DEFAULT_TIME_LIMIT = 120;
const DEFAULT_RANGE = 6;
const DEFAULT_SIZE_MIN = 2;
const DEFAULT_SIZE_MAX = 3;
const DEFAULT_SYMMETRIC = false;
const DEFAULT_MODE = 'classic';
const DEFAULT_DIFFICULTY = 'medium';

// API
const API_BASE_URL = 'https://eigenmac1.onrender.com';
const WS_BASE_URL = API_BASE_URL ? API_BASE_URL.replace(/^http/, 'ws') : '';
const POWER_FORMULA = 'per mode, per preset leaderboards';
const RECONNECT_TOKEN_KEY = 'eigenmac_reconnect_token';
const LOCAL_BEST_KEY = 'eigenmac_best_local';
const LOCAL_BEST_TIME_KEY = 'eigenmac_best_local_time';

// 0 = multiplayer, 1 = singleplayer
let typeToggle = 1;

const PRESETS = {
  p2: { timeLimit: 120, sizeMin: 2, sizeMax: 2, range: 8, symmetric: false },
  p3: { timeLimit: 120, sizeMin: 3, sizeMax: 3, range: 6, symmetric: false },
  p4: { timeLimit: 120, sizeMin: 4, sizeMax: 4, range: 5, symmetric: false },
  p5: { timeLimit: 120, sizeMin: 5, sizeMax: 5, range: 4, symmetric: false }
};

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getProblemRng() {
  if (!multiplayer.enabled || !multiplayer.seed) return Math.random;
  const seedFn = xmur3(`${multiplayer.seed}:${multiplayer.problemIndex}`);
  const seed = seedFn();
  return mulberry32(seed);
}


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
const rankValueEl = document.getElementById('rank-value');
const rankStatEl = document.getElementById('rank-stat');

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
const tabSingleBtn = document.getElementById('tab-single');
const tabMultiBtn = document.getElementById('tab-multi');
const panelSingle = document.getElementById('panel-single');
const panelMulti = document.getElementById('panel-multi');
const presetGrid = document.getElementById('preset-grid');
const customSettingsEl = document.getElementById('custom-settings');
const mpPresetGrid = document.getElementById('mp-preset-grid');
const mpCustomSettingsEl = document.getElementById('mp-custom-settings');
const mpTabCreate = document.getElementById('mp-tab-create');
const mpTabJoin = document.getElementById('mp-tab-join');
const mpTabPublic = document.getElementById('mp-tab-public');
const mpTabsEl = document.getElementById('mp-tabs');
const mpPanelCreate = document.getElementById('mp-panel-create');
const mpPanelJoin = document.getElementById('mp-panel-join');
const mpPanelPublic = document.getElementById('mp-panel-public');
const mpCreateInitialEl = document.getElementById('mp-create-initial');
const mpCreateLobbyEl = document.getElementById('mp-create-lobby');
const mpRoomNameInput = document.getElementById('mp-room-name');
const mpPasswordInput = document.getElementById('mp-password');
const mpRoomCodeInput = document.getElementById('mp-room-code-join');
const mpJoinPasswordInput = document.getElementById('mp-join-password');
const mpModeInput = document.getElementById('mp-mode');
const mpDifficultyInput = document.getElementById('mp-difficulty');
const mpDifficultyWrap = document.getElementById('mp-difficulty-wrap');
const mpTimeLimitInput = document.getElementById('mp-time-limit');
const mpRangeInput = document.getElementById('mp-range');
const mpSymmetricInput = document.getElementById('mp-symmetric');
const mpSizeMinInput = document.getElementById('mp-size-min');
const mpSizeMaxInput = document.getElementById('mp-size-max');
const mpJoinBtn = document.getElementById('mp-join');
const mpListBtn = document.getElementById('mp-list');
const mpRoomsEl = document.getElementById('mp-rooms');
const mpRoomStatusEl = document.getElementById('mp-room-status');
const mpPlayersTitleEl = document.getElementById('mp-players-title');
const mpPlayersEl = document.getElementById('mp-players');
const mpLoadingEl = document.getElementById('mp-loading');
const mpCreateBtn = document.getElementById('mp-create');
const mpLockBtn = document.getElementById('mp-lock');
const mpLockStatusEl = document.getElementById('mp-lock-status');
const mpChatLogEl = document.getElementById('mp-chat-log');
const mpChatTextEl = document.getElementById('mp-chat-text');
const mpChatSendBtn = document.getElementById('mp-chat-send');
const mpSpectateInput = document.getElementById('mp-spectate');
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
const leaderboardModeEl = document.getElementById('leaderboard-mode');
const leaderboardPresetEl = document.getElementById('leaderboard-preset');
const leaderboardRefreshBtn = document.getElementById('leaderboard-refresh');

const screenStart = document.getElementById('screen-start');
const screenGame = document.getElementById('screen-game');
const screenDeploy = document.getElementById('screen-deploy');
const statsEl = document.getElementById('stats');
const presetStatsEl = document.getElementById('preset-stats');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const battleStatusEl = document.getElementById('battle-status');
const deployScreen = document.getElementById('screen-deploy');
const leaderboardEl = document.getElementById('leaderboard');
const leaderboardListEl = document.getElementById('leaderboard-list');
const battleLayoutEl = document.getElementById('battle-layout');
const mpStatusEl = document.getElementById('mp-status');
const mpLeaveBtn = document.getElementById('mp-leave');
const mpStartBtn = document.getElementById('mp-start');
const pad = document.getElementById('pad');
const leaveGameBtn = document.getElementById('leave-game');
const dvdTemplate = document.getElementById('dvd-template');
const confetti = document.getElementById('confetti');
const resultOverlay = document.getElementById('result-overlay');
const confettiImg = new Image();
confettiImg.src = 'confetti.png';
const resultBetterImg = new Image();
const resultLowerImg = new Image();
const resultRoyaleWinImg = new Image();
const paircraftImg = new Image();
resultBetterImg.src = 'images/new_best.png';
resultLowerImg.src = 'images/not_new_best.png';
resultRoyaleWinImg.src = 'images/royale_winner.png';
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
  'Aman Thawani',
  'Ethan Wang',
  'Ethan Bilderbeek',
  'Michitaka Ito',
  'Ishanth Srinivas',
  'Jordan Hu',
  'Panav Pallothu',
  'Alexandros Lekkas',
  'Rohan Rao',
  'Neal Pannala',
  'Kevin Li',
  'Brian Jiang',
  'Ian Teo',
  'Felipe Real',
  'Ashwin Balaraman',
  'Tim You',
  'Rithvik Ijju',
  'Elias Raki'
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
let wsClientId = null;
let settings = {
  timeLimit: DEFAULT_TIME_LIMIT,
  range: DEFAULT_RANGE,
  symmetric: DEFAULT_SYMMETRIC,
  sizeMin: DEFAULT_SIZE_MIN,
  sizeMax: DEFAULT_SIZE_MAX,
  mode: DEFAULT_MODE,
  difficulty: DEFAULT_DIFFICULTY
};

let selectedPresetSingle = 'p2';
let selectedPresetMulti = 'p2';
let activeStartTab = 'single';
let activeMpTab = 'create';
// 0 = create, 1 = join, 2 = public
let mpTypeToggle = 2;
let bestScoreUpdatedAt = null;
let lastPresetSelectedAt = null;

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

let multiplayer = {
  enabled: false,
  connected: false,
  inRoom: false,
  isHost: false,
  started: false,
  roomId: null,
  roomMode: null,
  roomSettings: null,
  leaderboard: [],
  placement: 0,
  eliminated: false,
  winnerId: null,
  playerName: null,
  isSpectator: false,
  settingsLocked: false,
  timeLeft: 0,
  nextCutIn: 0,
  lastRoomId: null,
  seed: null,
  problemIndex: 0,
  targetIndex: 0,
  reconnectToken: null,
  ws: null
};

try {
  multiplayer.reconnectToken = localStorage.getItem(RECONNECT_TOKEN_KEY);
} catch {
  multiplayer.reconnectToken = null;
}

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

function randInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min, max, rng = Math.random) {
  return rng() * (max - min) + min;
}

function randNormal(mean, std, rng = Math.random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function factorial(n) {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

function formatDateTime(date) {
  if (!date) return '';
  return date.toLocaleString();
}

function updateBestScoreTitle() {
  if (!bestScoreEl) return;
  const time = formatDateTime(bestScoreUpdatedAt);
  bestScoreEl.title = time ? `best score updated: ${time}` : 'best score';
}

function loadLocalBestScore() {
  try {
    const raw = localStorage.getItem(LOCAL_BEST_KEY);
    const time = localStorage.getItem(LOCAL_BEST_TIME_KEY);
    if (raw) {
      bestScore = Number(raw) || 0;
      bestScoreUpdatedAt = time ? new Date(time) : null;
    }
  } catch {
    // ignore
  }
}

function saveLocalBestScore() {
  try {
    localStorage.setItem(LOCAL_BEST_KEY, `${bestScore}`);
    if (bestScoreUpdatedAt) {
      localStorage.setItem(LOCAL_BEST_TIME_KEY, bestScoreUpdatedAt.toISOString());
    }
  } catch {
    // ignore
  }
}

function updateRankDisplay(placement, total) {
  if (!rankValueEl || !rankStatEl) return;
  const showRank = (multiplayer.enabled && multiplayer.roomMode === 'battle')
    || (!multiplayer.enabled && settings.mode === 'battle');
  rankStatEl.classList.toggle('hidden', !showRank);
  if (!showRank) {
    rankValueEl.textContent = '-';
    rankValueEl.title = 'rank';
    return;
  }
  const value = placement ? `${placement}${total ? `/${total}` : ''}` : '-';
  rankValueEl.textContent = value;
  const time = formatDateTime(new Date());
  rankValueEl.title = placement ? `rank updated: ${time}` : 'rank';
}

function presetLabel(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return 'custom settings';
  const sym = preset.symmetric ? 'symmetric' : 'not symmetric';
  return `${preset.timeLimit}s · ${preset.sizeMin}x${preset.sizeMax} · |λ|≤${preset.range} · ${sym}`;
}

function applyPresetTooltips() {
  if (presetGrid) {
    presetGrid.querySelectorAll('.preset').forEach((btn) => {
      const key = btn.dataset.preset;
      btn.title = key === 'custom' ? 'custom settings' : presetLabel(key);
    });
  }
  if (mpPresetGrid) {
    mpPresetGrid.querySelectorAll('.preset').forEach((btn) => {
      const key = btn.dataset.preset;
      btn.title = key === 'custom' ? 'custom settings' : presetLabel(key);
    });
  }
}

function updatePresetHoverTime(scope = 'single') {
  const grid = scope === 'single' ? presetGrid : mpPresetGrid;
  if (!grid) return;
  const active = grid.querySelector('.preset.active');
  if (!active) return;
  const base = active.dataset.preset === 'custom' ? 'custom settings' : presetLabel(active.dataset.preset);
  const time = formatDateTime(lastPresetSelectedAt);
  active.title = time ? `${base} · selected ${time}` : base;
}

function loadPresetStats() {
  try {
    const raw = localStorage.getItem('preset_stats');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePresetStats(data) {
  try {
    localStorage.setItem('preset_stats', JSON.stringify(data));
  } catch {
    // ignore
  }
}

function updatePresetStatsDisplay() {
  if (!presetStatsEl) return;
  if (!gameActive || screenGame.classList.contains('hidden')) {
    presetStatsEl.style.display = 'none';
    return;
  }
  const key = resolvePresetKey(settings, activeStartTab === 'multi' ? selectedPresetMulti : selectedPresetSingle);
  if (!key) {
    presetStatsEl.style.display = 'none';
    return;
  }
  const mode = settings.mode || 'classic';
  const stats = loadPresetStats();
  const entry = stats[`${mode}:${key}`];
  if (!entry) {
    presetStatsEl.style.display = 'none';
    return;
  }
  const avg = entry.attempts ? (entry.totalScore / entry.attempts).toFixed(1) : '0.0';
  presetStatsEl.style.display = 'block';
  presetStatsEl.textContent = `${key} ${mode} · best ${entry.best} · avg ${avg} · attempts ${entry.attempts}`;
}

function recordPresetResult(mode, presetKey, scoreValue) {
  if (!presetKey) return;
  const stats = loadPresetStats();
  const key = `${mode}:${presetKey}`;
  const entry = stats[key] || { attempts: 0, totalScore: 0, best: 0 };
  entry.attempts += 1;
  entry.totalScore += scoreValue;
  entry.best = Math.max(entry.best || 0, scoreValue);
  entry.updatedAt = new Date().toISOString();
  stats[key] = entry;
  savePresetStats(stats);
}

function applyRoomSettings(room) {
  if (!room?.settings) return;
  const incoming = room.settings;
  if (mpTimeLimitInput) mpTimeLimitInput.value = incoming.timeLimit;
  if (mpRangeInput) mpRangeInput.value = incoming.range;
  if (mpSymmetricInput) mpSymmetricInput.value = incoming.symmetric ? 'yes' : 'no';
  if (mpSizeMinInput) mpSizeMinInput.value = incoming.sizeMin;
  if (mpSizeMaxInput) mpSizeMaxInput.value = incoming.sizeMax;
  if (mpModeInput) mpModeInput.value = room.mode || 'classic';
  if (mpDifficultyInput && incoming.difficulty) mpDifficultyInput.value = incoming.difficulty;
  if (mpDifficultyWrap) mpDifficultyWrap.classList.toggle('hidden', mpModeInput?.value !== 'battle');
  const presetKey = resolvePresetKey(incoming, selectedPresetMulti) || 'custom';
  selectedPresetMulti = presetKey;
  setPresetButtons(mpPresetGrid, presetKey);
  if (mpCustomSettingsEl) mpCustomSettingsEl.classList.toggle('hidden', presetKey !== 'custom');
}

function updateMpSettingsControls() {
  const inRoom = multiplayer.inRoom;
  if (mpTabsEl) {
    mpTabsEl.classList.toggle('hidden', inRoom);
    mpTabsEl.style.display = inRoom ? 'none' : 'flex';
  }
  if (mpCreateInitialEl) {
    mpCreateInitialEl.classList.toggle('hidden', inRoom);
    mpCreateInitialEl.style.display = inRoom ? 'none' : 'grid';
  }
  if (mpCreateLobbyEl) {
    mpCreateLobbyEl.classList.toggle('hidden', !inRoom);
    mpCreateLobbyEl.style.display = inRoom ? 'grid' : 'none';
  }
  if (mpPanelJoin && inRoom) {
    mpPanelJoin.classList.add('hidden');
    mpPanelJoin.style.display = 'none';
  }
  if (mpPanelPublic && inRoom) {
    mpPanelPublic.classList.add('hidden');
    mpPanelPublic.style.display = 'none';
  }

  const isEditable = inRoom && multiplayer.isHost && !multiplayer.settingsLocked && !multiplayer.started;
  const shouldDisable = !isEditable;
  [mpTimeLimitInput, mpRangeInput, mpSizeMinInput, mpSizeMaxInput, mpSymmetricInput, mpModeInput, mpDifficultyInput]
    .filter(Boolean)
    .forEach((el) => {
      el.disabled = shouldDisable;
    });
  if (mpPresetGrid) {
    mpPresetGrid.querySelectorAll('.preset').forEach((btn) => {
      btn.disabled = shouldDisable;
    });
  }
  if (mpLockBtn) {
    mpLockBtn.classList.toggle('hidden', !inRoom || !multiplayer.isHost);
    mpLockBtn.textContent = multiplayer.settingsLocked ? 'unlock settings' : 'lock settings';
    mpLockBtn.disabled = multiplayer.started;
  }
  if (mpLockStatusEl) {
    mpLockStatusEl.textContent = multiplayer.settingsLocked ? 'settings locked by host' : 'settings unlocked';
  }
}

function broadcastRoomSettingsUpdate() {
  if (!multiplayer.inRoom || !multiplayer.isHost || multiplayer.settingsLocked || multiplayer.started) return;
  if (mpDifficultyWrap) mpDifficultyWrap.classList.toggle('hidden', mpModeInput?.value !== 'battle');
  const payload = {
    type: 'room:update-settings',
    mode: mpModeInput?.value || 'classic',
    settings: {
      timeLimit: Number(mpTimeLimitInput?.value || 120),
      range: Number(mpRangeInput?.value || 6),
      symmetric: mpSymmetricInput?.value === 'yes',
      sizeMin: Number(mpSizeMinInput?.value || 2),
      sizeMax: Number(mpSizeMaxInput?.value || 3),
      difficulty: mpDifficultyInput?.value || DEFAULT_DIFFICULTY
    }
  };
  sendWsMessage(payload);
}

function renderChatLog(chat) {
  if (!mpChatLogEl) return;
  mpChatLogEl.innerHTML = '';
  (chat || []).forEach((message) => appendChatMessage(message));
}

function appendChatMessage(message) {
  if (!mpChatLogEl || !message) return;
  const row = document.createElement('div');
  const ts = message.ts ? new Date(message.ts).toLocaleTimeString() : '';
  row.textContent = `${message.name}${ts ? ` · ${ts}` : ''}: ${message.text}`;
  mpChatLogEl.appendChild(row);
  mpChatLogEl.scrollTop = mpChatLogEl.scrollHeight;
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
    bestScoreUpdatedAt = new Date();
    updateBestScoreTitle();
  }
  // power removed
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
      bestScoreUpdatedAt = new Date();
      updateBestScoreTitle();
    }
    // power removed
  }
}

function resolvePresetKey(currentSettings, fallbackPreset) {
  const entries = Object.entries(PRESETS);
  for (const [key, preset] of entries) {
    if (
      preset.timeLimit === currentSettings.timeLimit &&
      preset.sizeMin === currentSettings.sizeMin &&
      preset.sizeMax === currentSettings.sizeMax &&
      preset.range === currentSettings.range &&
      preset.symmetric === currentSettings.symmetric
    ) {
      return key;
    }
  }
  return fallbackPreset || 'custom';
}

async function submitResult() {
  if (!API_BASE_URL) return;
  const activeAuth = await ensureAuth();
  if (!activeAuth) return;
  const presetFallback = activeStartTab === 'multi' ? selectedPresetMulti : selectedPresetSingle;
  const preset = resolvePresetKey(settings, presetFallback);
  const duration = settings.mode === 'battle' ? BATTLE_DURATION : settings.timeLimit;
  const payload = {
    ...activeAuth,
    mode: settings.mode,
    preset: preset || 'custom',
    score,
    duration,
    sizeMin: settings.sizeMin,
    sizeMax: settings.sizeMax,
    range: settings.range,
    symmetric: settings.symmetric
  };
  await fetch(`${API_BASE_URL}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function fetchLeaderboard() {
  if (!API_BASE_URL || !powerListEl) return;
  const mode = leaderboardModeEl?.value || 'classic';
  const preset = leaderboardPresetEl?.value || 'p2';
  powerListEl.innerHTML = '<li>loading...</li>';
  const res = await fetch(`${API_BASE_URL}/leaderboard?mode=${mode}&preset=${preset}`);
  if (!res.ok) {
    powerListEl.innerHTML = '<li>failed to load</li>';
    return;
  }
  const data = await res.json();
  powerListEl.innerHTML = '';
  (data.items || []).forEach((row, idx) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.innerHTML = `<span class="leaderboard-rank">${idx + 1}</span><span class="leaderboard-name">${row.username}</span><span class="leaderboard-score">${row.score}</span>`;
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

function getMultiplayerName() {
  if (auth?.username) return auth.username;
  const stored = localStorage.getItem('eigenmac_mp_name');
  if (stored) return stored;
  const fallback = `guest_${randInt(1000, 9999)}`;
  localStorage.setItem('eigenmac_mp_name', fallback);
  return fallback;
}

function setMultiplayerStatus(text) {
  if (mpStatusEl) mpStatusEl.textContent = text || '';
  console.log('[mp] status', text);
}

function setRoomStatus(html) {
  if (!mpRoomStatusEl) return;
  mpRoomStatusEl.innerHTML = html || '';
}

function setMpLoading(isLoading) {
  if (!mpLoadingEl) return;
  mpLoadingEl.classList.toggle('hidden', !isLoading);
}

function setPresetButtons(gridEl, presetKey) {
  if (!gridEl) return;
  Array.from(gridEl.querySelectorAll('.preset')).forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === presetKey);
  });
}

function applyPresetToInputs(preset, scope = 'single') {
  if (!preset) return;
  if (scope === 'single') {
    timeLimitInput.value = preset.timeLimit;
    sizeMinInput.value = `${preset.sizeMin}`;
    sizeMaxInput.value = `${preset.sizeMax}`;
    rangeInput.value = preset.range;
    symmetricInput.value = preset.symmetric ? 'yes' : 'no';
  } else {
    mpTimeLimitInput.value = preset.timeLimit;
    mpSizeMinInput.value = `${preset.sizeMin}`;
    mpSizeMaxInput.value = `${preset.sizeMax}`;
    mpRangeInput.value = preset.range;
    mpSymmetricInput.value = preset.symmetric ? 'yes' : 'no';
  }
}

function getSingleSettings() {
  if (selectedPresetSingle !== 'custom') {
    return { ...PRESETS[selectedPresetSingle] };
  }
  return {
    timeLimit: Number(timeLimitInput.value),
    range: Number(rangeInput.value),
    symmetric: symmetricInput.value === 'yes',
    sizeMin: Number(sizeMinInput.value),
    sizeMax: Number(sizeMaxInput.value),
    mode: modeInput.value,
    difficulty: difficultyInput.value
  };
}

function getMultiSettings() {
  if (selectedPresetMulti !== 'custom') {
    return { ...PRESETS[selectedPresetMulti] };
  }
  return {
    timeLimit: Number(mpTimeLimitInput.value),
    range: Number(mpRangeInput.value),
    symmetric: mpSymmetricInput.value === 'yes',
    sizeMin: Number(mpSizeMinInput.value),
    sizeMax: Number(mpSizeMaxInput.value)
  };
}

function updateStartButtonLabel() {
  if (!startBtn) return;
  console.log('[mp] updateStartButtonLabel', {
    enabled: multiplayer.enabled,
    inRoom: multiplayer.inRoom,
    isHost: multiplayer.isHost,
    started: multiplayer.started
  });
  startBtn.textContent = 'start';
  if (mpStartBtn) {
    if (!multiplayer.inRoom) {
      mpStartBtn.classList.add('hidden');
      mpStartBtn.disabled = true;
    } else if (multiplayer.isHost && !multiplayer.started) {
      mpStartBtn.classList.remove('hidden');
      mpStartBtn.disabled = false;
    } else if (multiplayer.isHost) {
      mpStartBtn.classList.remove('hidden');
      mpStartBtn.disabled = true;
    } else {
      mpStartBtn.classList.add('hidden');
      mpStartBtn.disabled = true;
    }
  }
}

function setStartTab(tab) {
  typeToggle = tab === 'multi' ? 0 : 1;
  activeStartTab = tab;
  if (tabSingleBtn) tabSingleBtn.classList.toggle('active', tab === 'single');
  if (tabMultiBtn) tabMultiBtn.classList.toggle('active', tab === 'multi');
  if (panelSingle) {
    panelSingle.classList.toggle('hidden', tab !== 'single');
    panelSingle.style.display = tab === 'single' ? 'grid' : 'none';
  }
  if (panelMulti) {
    panelMulti.classList.toggle('hidden', tab !== 'multi');
    panelMulti.style.display = tab === 'multi' ? 'grid' : 'none';
  }
  if (tab === 'single') {
    if (multiplayer.inRoom) handleMultiplayerLeave();
    multiplayer.enabled = false;
  } else {
    multiplayer.enabled = true;
  }
  updateStartButtonLabel();
}

function setMpTab(tab) {
  if (multiplayer.inRoom) tab = 'create';
  mpTypeToggle = tab === 'create' ? 0 : tab === 'join' ? 1 : 2;
  activeMpTab = tab;
  if (mpTabCreate) mpTabCreate.classList.toggle('active', tab === 'create');
  if (mpTabJoin) mpTabJoin.classList.toggle('active', tab === 'join');
  if (mpTabPublic) mpTabPublic.classList.toggle('active', tab === 'public');
  if (mpPanelCreate) {
    mpPanelCreate.classList.toggle('hidden', tab !== 'create');
    mpPanelCreate.style.display = tab === 'create' ? 'grid' : 'none';
  }
  if (mpPanelJoin) {
    mpPanelJoin.classList.toggle('hidden', tab !== 'join');
    mpPanelJoin.style.display = tab === 'join' ? 'grid' : 'none';
  }
  if (mpPanelPublic) {
    mpPanelPublic.classList.toggle('hidden', tab !== 'public');
    mpPanelPublic.style.display = tab === 'public' ? 'grid' : 'none';
  }
  updateMpSettingsControls();
}

function selectPreset(presetKey, scope = 'single') {
  lastPresetSelectedAt = new Date();
  if (scope === 'single') {
    selectedPresetSingle = presetKey;
    setPresetButtons(presetGrid, presetKey);
    if (customSettingsEl) customSettingsEl.classList.toggle('hidden', presetKey !== 'custom');
    if (presetKey !== 'custom') applyPresetToInputs(PRESETS[presetKey], 'single');
    updatePresetHoverTime('single');
  } else {
    selectedPresetMulti = presetKey;
    setPresetButtons(mpPresetGrid, presetKey);
    if (mpCustomSettingsEl) mpCustomSettingsEl.classList.toggle('hidden', presetKey !== 'custom');
    if (presetKey !== 'custom') applyPresetToInputs(PRESETS[presetKey], 'multi');
    updatePresetHoverTime('multi');
    broadcastRoomSettingsUpdate();
  }
  updatePresetStatsDisplay();
}

function renderPublicRooms(rooms) {
  if (!mpRoomsEl) return;
  mpRoomsEl.innerHTML = '';
  if (!rooms.length) {
    mpRoomsEl.textContent = 'no public rooms found';
    return;
  }
  rooms.forEach((room) => {
    const row = document.createElement('div');
    row.className = 'mp-room';
    row.innerHTML = `<span>${room.name || 'room'} · ${room.id} · ${room.players}/${room.maxPlayers}</span>`;
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = 'join';
    btn.addEventListener('click', () => {
      if (mpRoomCodeInput) mpRoomCodeInput.value = room.id;
      setMpTab('join');
      handleMultiplayerJoin();
    });
    row.appendChild(btn);
    mpRoomsEl.appendChild(row);
  });
}

function renderMultiplayerLeaderboard(items) {
  if (!leaderboardListEl) return;
  const full = items || [];
  const playerName = multiplayer.playerName;
  leaderboardListEl.innerHTML = '';
  full.forEach((c, idx) => {
    const rank = idx + 1;
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    const name = c.name === playerName ? `${c.name} (you)` : c.name;
    li.innerHTML = `<span class="leaderboard-rank">${rank}</span><span class="leaderboard-name">${name}</span><span class="leaderboard-score">${c.score}</span>`;
    leaderboardListEl.appendChild(li);
  });
}

function renderMultiplayerPlayers(players) {
  if (!mpPlayersEl) return;
  mpPlayersEl.innerHTML = '';
  if (!players || !players.length) {
    mpPlayersEl.textContent = 'no players yet';
    return;
  }
  players.forEach((player) => {
    const row = document.createElement('div');
    row.className = 'mp-player';
    const tags = [];
    if (player.isHost) tags.push('host');
    if (player.isSpectator) tags.push('spectator');
    const label = tags.length ? `${player.name} (${tags.join(', ')})` : player.name;
    row.textContent = label;
    if (multiplayer.isHost && player.id && player.id !== wsClientId) {
      const controls = document.createElement('span');
      controls.className = 'mp-player-controls';
      const kickBtn = document.createElement('button');
      kickBtn.className = 'ghost small';
      kickBtn.textContent = 'remove';
      kickBtn.addEventListener('click', () => sendWsMessage({ type: 'room:kick', playerId: player.id }));
      const promoteBtn = document.createElement('button');
      promoteBtn.className = 'ghost small';
      promoteBtn.textContent = 'promote';
      promoteBtn.addEventListener('click', () => sendWsMessage({ type: 'room:promote', playerId: player.id }));
      controls.appendChild(promoteBtn);
      controls.appendChild(kickBtn);
      row.appendChild(controls);
    }
    mpPlayersEl.appendChild(row);
  });
}

function storeReconnectToken(token) {
  if (!token) return;
  multiplayer.reconnectToken = token;
  try {
    localStorage.setItem(RECONNECT_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearReconnectToken() {
  multiplayer.reconnectToken = null;
  try {
    localStorage.removeItem(RECONNECT_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function sendWsMessage(payload) {
  if (!multiplayer.ws || multiplayer.ws.readyState !== 1) return;
  multiplayer.ws.send(JSON.stringify(payload));
}

function sendWsWhenReady(payload) {
  ensureMultiplayerSocket();
  if (multiplayer.ws && multiplayer.ws.readyState === 1) {
    sendWsMessage(payload);
  } else if (multiplayer.ws) {
    multiplayer.ws.addEventListener('open', () => sendWsMessage(payload), { once: true });
  }
}

function resetMultiplayerState({ clearToken = false } = {}) {
  multiplayer.inRoom = false;
  multiplayer.isHost = false;
  multiplayer.started = false;
  multiplayer.roomId = null;
  multiplayer.roomMode = null;
  multiplayer.roomSettings = null;
  multiplayer.leaderboard = [];
  multiplayer.placement = 0;
  multiplayer.eliminated = false;
  multiplayer.winnerId = null;
  multiplayer.playerName = null;
  multiplayer.isSpectator = false;
  multiplayer.settingsLocked = false;
  multiplayer.timeLeft = 0;
  multiplayer.nextCutIn = 0;
  multiplayer.lastRoomId = null;
  setMultiplayerStatus('');
  setRoomStatus('');
  multiplayer.problemIndex = 0;
  multiplayer.targetIndex = 0;
  if (clearToken) clearReconnectToken();
  if (mpLeaveBtn) mpLeaveBtn.classList.add('hidden');
  if (mpCreateBtn) mpCreateBtn.classList.remove('hidden');
  if (mpStartBtn) mpStartBtn.classList.add('hidden');
  if (mpLockBtn) mpLockBtn.classList.add('hidden');
  if (mpPlayersTitleEl) mpPlayersTitleEl.textContent = 'Players:';
  if (mpPlayersEl) mpPlayersEl.innerHTML = '';
  if (mpChatLogEl) mpChatLogEl.innerHTML = '';
  if (mpLockStatusEl) mpLockStatusEl.textContent = '';
  if (leaderboardEl && !battle.active) leaderboardEl.classList.add('hidden');
  if (battleLayoutEl && !battle.active) battleLayoutEl.classList.add('single');
  updateStartButtonLabel();
  updateMpSettingsControls();
}

function handleWsMessage(data) {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'hello') {
    wsClientId = data.clientId;
    return;
  }
  if (data.type === 'room:list') {
    renderPublicRooms(data.rooms || []);
    return;
  }
  if (data.type === 'room:token') {
    storeReconnectToken(data.token);
    return;
  }
  if (data.type === 'room:sync') {
    if (typeof data.seed === 'string') multiplayer.seed = data.seed;
    if (Number.isFinite(data.problemIndex)) multiplayer.problemIndex = Number(data.problemIndex);
    if (Number.isFinite(data.targetIndex)) multiplayer.targetIndex = Number(data.targetIndex);
    if (gameActive && multiplayer.enabled) {
      const { matrix, eigenvalues } = generateProblem();
      renderProblem(matrix, eigenvalues);
    }
    return;
  }
  if (data.type === 'room:state') {
    multiplayer.enabled = true;
    setStartTab('multi');
    setMpTab('create');
    const wasInRoom = multiplayer.inRoom;
    const prevRoomId = multiplayer.roomId;
    multiplayer.inRoom = true;
    multiplayer.roomId = data.room.id;
    multiplayer.roomMode = data.room.mode;
    multiplayer.roomSettings = data.room.settings;
    multiplayer.settingsLocked = Boolean(data.room.settingsLocked);
    multiplayer.seed = data.room.seed;
    multiplayer.isHost = data.room.hostId === wsClientId;
    multiplayer.started = data.room.started;
    multiplayer.isSpectator = Boolean(data.you?.isSpectator);
    if (!wasInRoom || prevRoomId !== data.room.id) {
      multiplayer.problemIndex = Number(data.room.problemIndex ?? 0);
    }
    multiplayer.targetIndex = Number(data.room.problemIndex ?? multiplayer.targetIndex ?? 0);
    applyRoomSettings(data.room);
    if (mpLeaveBtn) mpLeaveBtn.classList.remove('hidden');
    if (mpCreateBtn) mpCreateBtn.classList.add('hidden');
    const statusPrefix = !wasInRoom || prevRoomId !== data.room.id
      ? (multiplayer.isHost ? 'room created' : 'joined room')
      : 'room';
    const displayName = data.room.displayName || 'room';
    setRoomStatus(`${statusPrefix}: ${displayName}<br>code: ${data.room.id}`);
    if (mpRoomNameInput) mpRoomNameInput.value = data.room.displayName || 'room';
    setMultiplayerStatus(`code: ${data.room.id}`);
    if (multiplayer.isSpectator) {
      setMultiplayerStatus(`spectating · code: ${data.room.id}`);
    }
    renderMultiplayerPlayers(data.room.playersList || []);
    renderChatLog(data.room.chat || []);
    updateMpSettingsControls();
    updateStartButtonLabel();
    setMpLoading(false);
    return;
  }
  if (data.type === 'room:chat') {
    if (data.chat) {
      renderChatLog(data.chat);
    } else if (data.message) {
      appendChatMessage(data.message);
    }
    return;
  }
  if (data.type === 'room:tick') {
    multiplayer.started = true;
    multiplayer.timeLeft = data.timeLeft;
    multiplayer.placement = data.placement || 0;
    multiplayer.eliminated = data.eliminated || false;
    multiplayer.winnerId = data.winnerId || null;
    if (Number.isFinite(data.problemIndex)) multiplayer.problemIndex = Number(data.problemIndex);
    if (Number.isFinite(data.targetIndex)) multiplayer.targetIndex = Number(data.targetIndex);
    updateStartButtonLabel();
    if (!gameActive) {
      settings = { ...data.settings };
      startGame({ fromMultiplayer: true, timeLeftOverride: data.timeLeft });
    }
    timeLeft = data.timeLeft;
    timeEl.textContent = timeLeft;
    multiplayer.leaderboard = data.leaderboard || [];
    renderMultiplayerLeaderboard(multiplayer.leaderboard);
    if (battleStatusEl) battleStatusEl.textContent = data.status || '';
    updateRankDisplay(multiplayer.placement);
    if (data.roomMode === 'battle' && data.winnerId) {
      if (data.winnerId === wsClientId) {
        resultOverlay.src = 'images/royale_winner.png';
        resultOverlay.alt = 'battle royale winner';
        resultOverlay.style.display = 'block';
      }
    }
    if (data.timeLeft <= 0 || (data.roomMode === 'battle' && data.winnerId)) {
      endGame();
    }
    return;
  }
  if (data.type === 'room:end') {
    if (data.status) setMultiplayerStatus(data.status);
    multiplayer.winnerId = data.winnerId || multiplayer.winnerId;
    return;
  }
  if (data.type === 'room:error') {
    setMultiplayerStatus(data.message || 'multiplayer error');
    setMpLoading(false);
    return;
  }
  if (data.type === 'room:kicked') {
    setMultiplayerStatus('removed from room');
    resetMultiplayerState({ clearToken: true });
    showStartScreen();
    return;
  }
}

function ensureMultiplayerSocket() {
  if (!WS_BASE_URL) return;
  if (multiplayer.ws && multiplayer.ws.readyState === 1) return;
  console.log('[mp] connecting ws', WS_BASE_URL);
  setMpLoading(true);
  multiplayer.ws = new WebSocket(WS_BASE_URL.replace(/^http/, 'ws'));
  multiplayer.ws.addEventListener('open', () => {
    multiplayer.connected = true;
    console.log('[mp] ws open');
    if (multiplayer.reconnectToken) {
      sendWsMessage({ type: 'room:reconnect', token: multiplayer.reconnectToken });
    }
    updateStartButtonLabel();
  });
  multiplayer.ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[mp] ws message', data);
      handleWsMessage(data);
    } catch {
      // ignore
    }
  });
  multiplayer.ws.addEventListener('close', () => {
    multiplayer.connected = false;
    console.log('[mp] ws closed');
    resetMultiplayerState();
  });
  multiplayer.ws.addEventListener('error', () => {
    multiplayer.connected = false;
    console.log('[mp] ws error');
  });
}

function handleMultiplayerCreate() {
  clearReconnectToken();
  console.log('[mp] create click', {
    mode: mpModeInput?.value,
    room: mpRoomNameInput?.value,
    name: getMultiplayerName()
  });
  setMpLoading(true);
  const name = getMultiplayerName();
  multiplayer.playerName = name;
  const roomName = mpRoomNameInput?.value.trim() || 'room';
  const password = mpPasswordInput?.value.trim() || '';
  const baseSettings = getMultiSettings();
  const payload = {
    type: 'room:create',
    name,
    displayName: roomName,
    password,
    mode: mpModeInput?.value || 'classic',
    settings: {
      ...baseSettings,
      difficulty: mpDifficultyInput?.value || 'medium'
    }
  };
  sendWsWhenReady(payload);
}

function handleMultiplayerJoin() {
  clearReconnectToken();
  console.log('[mp] join click', {
    room: mpRoomCodeInput?.value,
    name: getMultiplayerName()
  });
  const roomId = (mpRoomCodeInput?.value || '').trim().toUpperCase();
  if (!roomId) {
    setMultiplayerStatus('enter a room code to join');
    return;
  }
  const name = getMultiplayerName();
  multiplayer.playerName = name;
  const password = mpJoinPasswordInput?.value.trim() || '';
  const spectate = Boolean(mpSpectateInput?.checked);
  sendWsWhenReady({ type: 'room:join', roomId, name, password, spectate });
}

function handleMultiplayerList() {
  console.log('[mp] list click');
  sendWsWhenReady({ type: 'room:list' });
}

function handleMultiplayerLeave() {
  console.log('[mp] leave click');
  if (!multiplayer.ws || !multiplayer.inRoom) return;
  sendWsMessage({ type: 'room:leave' });
  resetMultiplayerState({ clearToken: true });
  showStartScreen();
}

function handleMultiplayerStartClick() {
  multiplayer.enabled = activeStartTab === 'multi';
  console.log('[mp] start click', {
    enabled: multiplayer.enabled,
    inRoom: multiplayer.inRoom,
    isHost: multiplayer.isHost,
    started: multiplayer.started
  });
  if (!multiplayer.enabled) {
    startGame();
    return;
  }
  if (!multiplayer.inRoom) {
    const roomCode = mpRoomCodeInput?.value.trim();
    if (roomCode) {
      handleMultiplayerJoin();
    } else {
      handleMultiplayerCreate();
    }
    return;
  }
  if (multiplayer.isHost && !multiplayer.started) {
    sendWsMessage({ type: 'room:start' });
  } else if (!multiplayer.started) {
    setMultiplayerStatus('waiting for host to start');
  }
}

function handleChatSend() {
  if (!multiplayer.inRoom || !mpChatTextEl) return;
  const text = mpChatTextEl.value.trim();
  if (!text) return;
  sendWsMessage({ type: 'room:chat', text });
  mpChatTextEl.value = '';
}

async function handleSignup() {
  if (!API_BASE_URL) return;
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();
  if (!username || password.length < 1) {
    if (authStatusEl) authStatusEl.textContent = 'invalid username/password';
    return;
  }
  console.log('[auth] signup attempt', username);
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    console.log('[auth] signup failed', res.status);
    if (authStatusEl) authStatusEl.textContent = 'signup failed';
    return;
  }
  console.log('[auth] signup ok', username);
  setAuth({ username, password });
  bestScore = 0;
  if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  bestScoreUpdatedAt = new Date();
  updateBestScoreTitle();
  if (authStatusEl) authStatusEl.textContent = `account created: ${username}`;
}

async function handleLogin() {
  if (!API_BASE_URL) return;
  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value.trim();
  if (!username || password.length < 1) {
    if (authStatusEl) authStatusEl.textContent = 'invalid username/password';
    return;
  }
  console.log('[auth] login attempt', username);
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    console.log('[auth] login failed', res.status);
    if (authStatusEl) authStatusEl.textContent = 'login failed';
    return;
  }
  const data = await res.json();
  console.log('[auth] login ok', data.username);
  setAuth({ username, password });
  if (typeof data.bestScore === 'number') {
    bestScore = data.bestScore;
    if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
    bestScoreUpdatedAt = new Date();
    updateBestScoreTitle();
  }
  // power removed
  if (authStatusEl) authStatusEl.textContent = `logged in: ${username}`;
}

function handleLogout() {
  setAuth(null);
  loadLocalBestScore();
  if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  updateBestScoreTitle();
}

function shuffle(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i, rng);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedStep(rng = Math.random) {
  const r = rng();
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
  const rng = getProblemRng();
  const { range, sizeMin, sizeMax } = settings;
  const min = Math.min(sizeMin, sizeMax);
  const max = Math.max(sizeMin, sizeMax);
  const size = randInt(min, max, rng);
  const bound = 25;
  let matrix = [];
  let eigenvalues = [];

  for (let attempt = 0; attempt < 200; attempt += 1) {
    eigenvalues = Array.from({ length: size }, () => randInt(-range, range, rng));
    if (eigenvalues.every((v) => v === 0)) {
      eigenvalues[0] = 1;
    }

    const ordered = shuffle(eigenvalues, rng);
    matrix = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (r === c ? ordered[r] : 0))
    );

    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) {
          if (i === j) continue;
          const step = weightedStep(rng);
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
    if (multiplayer.enabled && multiplayer.isSpectator) {
      input.disabled = true;
      input.placeholder = 'spectating';
    }
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
  if (multiplayer.enabled && multiplayer.isSpectator) return;
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
    if (multiplayer.enabled && multiplayer.inRoom && multiplayer.started) {
      const reportedIndex = multiplayer.problemIndex;
      sendWsMessage({
        type: 'game:score',
        score,
        dimension: currentMatrixSize,
        solveSeconds,
        problemIndex: reportedIndex
      });
    }
    feedbackEl.textContent = 'Correct!';
    feedbackEl.className = 'feedback success';
    nextProblem({ advanceIndex: multiplayer.enabled });
    spawnDvdBox();
    if (battle.active) {
      updateBattleStatus();
    }
  }
}

function renderProblem(matrix, eigenvalues) {
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

function nextProblem({ advanceIndex = true } = {}) {
  if (multiplayer.enabled && advanceIndex) {
    multiplayer.problemIndex += 1;
  }
  const { matrix, eigenvalues } = generateProblem();
  renderProblem(matrix, eigenvalues);
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
    if (leaderboardEl && !multiplayer.enabled) leaderboardEl.classList.add('hidden');
    if (battleLayoutEl && !multiplayer.enabled) battleLayoutEl.classList.add('single');
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
  updateRankDisplay(placement, remaining);
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

function startGame(options = {}) {
  const { fromMultiplayer = false, timeLeftOverride = null } = options;
  if (multiplayer.enabled && !fromMultiplayer) {
    setMultiplayerStatus('create or join a room first');
    return;
  }
  if (!fromMultiplayer) {
    const base = getSingleSettings();
    settings = {
      ...base,
      mode: modeInput.value,
      difficulty: difficultyInput.value
    };
  } else if (multiplayer.roomSettings) {
    settings = { ...multiplayer.roomSettings };
    settings.mode = multiplayer.roomMode || settings.mode;
  }

  score = 0;
  dimensionScores = {};
  if (!fromMultiplayer) {
    multiplayer.problemIndex = 0;
    multiplayer.targetIndex = 0;
  }
  timeLeft = timeLeftOverride ?? (settings.mode === 'battle' ? BATTLE_DURATION : settings.timeLimit);
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  updateRankDisplay(0);

  showOnlyScreen(screenGame);
  statsEl.style.visibility = 'visible';
  if (leaveGameBtn) leaveGameBtn.classList.toggle('hidden', !multiplayer.enabled);
  if (mpLeaveBtn) mpLeaveBtn.classList.toggle('hidden', !multiplayer.inRoom);
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
  nextProblem({ advanceIndex: false });
  focusInput(0);
  updatePresetStatsDisplay();
  if (multiplayer.enabled && multiplayer.isSpectator && feedbackEl) {
    feedbackEl.textContent = 'spectating';
    feedbackEl.className = 'feedback';
  }

  if (timer) clearInterval(timer);
  if (!fromMultiplayer) {
    if (settings.mode === 'battle') {
      startBattle();
    } else if (battleStatusEl) {
      battleStatusEl.textContent = '';
    }
  }
  const showLeaderboard = settings.mode === 'battle' || multiplayer.enabled;
  if (leaderboardEl) {
    leaderboardEl.classList.toggle('hidden', !showLeaderboard);
  }
  if (battleLayoutEl) {
    battleLayoutEl.classList.toggle('single', !showLeaderboard);
  }
  if (!fromMultiplayer) {
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
}

function endGame() {
  gameActive = false;
  clearInterval(timer);
  timer = null;
  submitResult();
  const presetKey = resolvePresetKey(settings, activeStartTab === 'multi' ? selectedPresetMulti : selectedPresetSingle);
  recordPresetResult(settings.mode || 'classic', presetKey || 'custom', score);
  updatePresetStatsDisplay();
  const prevBest = bestScore;
  if (score >= bestScore) {
    bestScore = score;
    if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
    bestScoreUpdatedAt = new Date();
    updateBestScoreTitle();
    if (!auth) saveLocalBestScore();
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
      resultOverlay.src = 'images/royale_winner.png';
      resultOverlay.alt = 'battle royale winner';
      resultOverlay.style.display = 'block';
    } else if (battle.eliminated) {
      resultOverlay.src = 'images/not_new_best.png';
      resultOverlay.alt = 'lower than best';
      resultOverlay.style.display = 'block';
    } else if (score >= prevBest) {
      resultOverlay.src = 'images/new_best.png';
      resultOverlay.alt = 'better than best';
      resultOverlay.style.display = 'block';
    } else if (score < prevBest) {
      resultOverlay.src = 'images/not_new_best.png';
      resultOverlay.alt = 'lower than best';
      resultOverlay.style.display = 'block';
    } else {
      resultOverlay.style.display = 'none';
      resultOverlay.removeAttribute('src');
      resultOverlay.alt = '';
    }
  }
  if (multiplayer.enabled && multiplayer.started && multiplayer.roomMode === 'battle') {
    const placement = multiplayer.placement || 0;
    const total = multiplayer.leaderboard.length || 0;
    finalScoreEl.textContent = placement ? `score: ${score} · rank: ${placement}/${total || '?'}` : `score: ${score}`;
  } else if (settings.mode === 'battle') {
    finalScoreEl.textContent = `score: ${score} · rank: ${battle.placement}/${BATTLE_COMPETITORS + 1}`;
  } else {
    finalScoreEl.textContent = `score: ${score}`;
  }
  if (multiplayer.enabled && multiplayer.winnerId) {
    if (multiplayer.winnerId === wsClientId) {
      resultOverlay.src = 'images/royale_winner.png';
      resultOverlay.alt = 'battle royale winner';
      resultOverlay.style.display = 'block';
    } else {
      resultOverlay.src = 'images/not_new_best.png';
      resultOverlay.alt = 'eliminated';
      resultOverlay.style.display = 'block';
    }
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
  multiplayer.started = false;
}

function quickLeaveGame() {
  if (!multiplayer.enabled) return;
  if (!gameActive) return;
  gameActive = false;
  clearInterval(timer);
  timer = null;
  battle.active = false;
  multiplayer.started = false;
  if (multiplayer.enabled && multiplayer.inRoom) {
    sendWsMessage({ type: 'room:leave' });
    resetMultiplayerState({ clearToken: true });
  }
  showStartScreen();
  hideStaticDvd();
  clearDvdBoxes();
  updatePresetStatsDisplay();
}

function showStartScreen() {
  showOnlyScreen(screenStart);
  statsEl.style.visibility = 'hidden';
  if (presetStatsEl) presetStatsEl.style.display = 'none';
  updateRankDisplay(0);
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
if (tabSingleBtn) tabSingleBtn.addEventListener('click', () => setStartTab('single'));
if (tabMultiBtn) tabMultiBtn.addEventListener('click', () => setStartTab('multi'));
if (mpTabCreate) mpTabCreate.addEventListener('click', () => setMpTab('create'));
if (mpTabJoin) mpTabJoin.addEventListener('click', () => setMpTab('join'));
if (mpTabPublic) mpTabPublic.addEventListener('click', () => setMpTab('public'));
if (mpModeInput && mpDifficultyWrap) {
  mpModeInput.addEventListener('change', () => {
    mpDifficultyWrap.classList.toggle('hidden', mpModeInput.value !== 'battle');
  });
}
if (presetGrid) {
  presetGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('.preset');
    if (!btn) return;
    selectPreset(btn.dataset.preset, 'single');
  });
}
if (mpPresetGrid) {
  mpPresetGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('.preset');
    if (!btn) return;
    selectPreset(btn.dataset.preset, 'multi');
  });
}
if (mpCreateBtn) mpCreateBtn.addEventListener('click', handleMultiplayerCreate);
if (mpJoinBtn) mpJoinBtn.addEventListener('click', handleMultiplayerJoin);
if (mpListBtn) mpListBtn.addEventListener('click', handleMultiplayerList);
if (mpLeaveBtn) mpLeaveBtn.addEventListener('click', handleMultiplayerLeave);
if (mpStartBtn) mpStartBtn.addEventListener('click', () => sendWsMessage({ type: 'room:start' }));
if (mpLockBtn) mpLockBtn.addEventListener('click', () => {
  sendWsMessage({ type: 'room:lock', locked: !multiplayer.settingsLocked });
});
if (mpChatSendBtn) mpChatSendBtn.addEventListener('click', handleChatSend);
if (mpChatTextEl) {
  mpChatTextEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleChatSend();
    }
  });
}

[
  mpTimeLimitInput,
  mpRangeInput,
  mpSizeMinInput,
  mpSizeMaxInput
].forEach((input) => {
  if (!input) return;
  input.addEventListener('input', broadcastRoomSettingsUpdate);
});
[
  mpSymmetricInput,
  mpModeInput,
  mpDifficultyInput
].forEach((input) => {
  if (!input) return;
  input.addEventListener('change', broadcastRoomSettingsUpdate);
});
const setPowerModalOpen = async (isOpen) => {
  if (!powerModalEl) return;
  if (isOpen) {
    powerModalEl.classList.remove('hidden');
    powerModalEl.style.display = 'grid';
    if (leaderboardModeEl) leaderboardModeEl.value = settings.mode;
    if (leaderboardPresetEl) {
      const presetFallback = activeStartTab === 'multi' ? selectedPresetMulti : selectedPresetSingle;
      leaderboardPresetEl.value = resolvePresetKey(settings, presetFallback);
    }
    await fetchLeaderboard();
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
if (leaderboardRefreshBtn) {
  leaderboardRefreshBtn.addEventListener('click', () => {
    fetchLeaderboard();
  });
}

if (leaveGameBtn) leaveGameBtn.addEventListener('click', quickLeaveGame);
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
  if (activeStartTab === 'single') startGame();
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyL') return;
  if (screenGame.classList.contains('hidden')) return;
  if (!multiplayer.enabled) return;
  event.preventDefault();
  quickLeaveGame();
});

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  if (screenStart.classList.contains('hidden')) return;
  event.preventDefault();
  if (activeStartTab === 'single') {
    startGame();
    return;
  }
  if (activeMpTab === 'create') {
    handleMultiplayerCreate();
    return;
  }
  if (activeMpTab === 'join') {
    handleMultiplayerJoin();
    return;
  }
  if (activeMpTab === 'public') {
    handleMultiplayerList();
  }
});

window.addEventListener('load', () => {
  statsEl.style.visibility = 'hidden';
  applyPresetToInputs(PRESETS[selectedPresetSingle], 'single');
  modeInput.value = DEFAULT_MODE;
  difficultyInput.value = DEFAULT_DIFFICULTY;
  difficultyWrap.classList.toggle('hidden', modeInput.value !== 'battle');
  applyPresetToInputs(PRESETS[selectedPresetMulti], 'multi');
  if (mpModeInput) mpModeInput.value = 'classic';
  if (mpDifficultyInput) mpDifficultyInput.value = DEFAULT_DIFFICULTY;
  if (mpDifficultyWrap) mpDifficultyWrap.classList.add('hidden');
  setStartTab(typeToggle === 0 ? 'multi' : 'single');
  setMpTab(mpTypeToggle === 1 ? 'join' : mpTypeToggle === 2 ? 'public' : 'create');
  selectPreset(selectedPresetSingle, 'single');
  selectPreset(selectedPresetMulti, 'multi');
  applyPresetTooltips();
  if (leaderboardEl) leaderboardEl.classList.add('hidden');
  if (API_BASE_URL) {
    const stored = localStorage.getItem('eigenmac_auth');
    if (stored) {
      setAuth(JSON.parse(stored));
      refreshAuthStats();
    } else {
      loadLocalBestScore();
    }
  } else {
    setAuth(null);
    loadLocalBestScore();
  }
  if (bestScoreEl) bestScoreEl.textContent = `best: ${bestScore}`;
  updateBestScoreTitle();
  updatePresetStatsDisplay();
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
