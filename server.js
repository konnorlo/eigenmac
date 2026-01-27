import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const ROOM_EXPIRE_MS = 10 * 60 * 1000;
const MAX_PLAYERS = 100;

const CUT_TIMES = [20, 33, 47, 57, 67, 80, 93, 107, 120];
const CUT_RANKS = [80, 60, 50, 40, 30, 20, 15, 10, 5];

const DIFFICULTY_PARAMS = {
  easy: { mean: 0.07, std: 0.03 },
  medium: { mean: 0.1, std: 0.04 },
  hard: { mean: 0.13, std: 0.05 },
  improbable: { mean: 0.17, std: 0.06 }
};

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
  'Hazel Quinn'
];

const rooms = new Map();
let nextClientId = 1;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randNormal(mean, std) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += letters[randInt(0, letters.length - 1)];
  }
  return code;
}

function getRoom(code) {
  return rooms.get(code);
}

function createRoom({ passcode, publicRoom }) {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();
  const room = {
    code,
    passcode: passcode || '',
    publicRoom: !!publicRoom,
    hostId: null,
    createdAt: Date.now(),
    lastActive: Date.now(),
    started: false,
    settings: null,
    players: new Map(),
    bots: [],
    t: 0,
    cutIndex: 0,
    interval: null
  };
  rooms.set(code, room);
  return room;
}

function removeRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.interval) clearInterval(room.interval);
  rooms.delete(code);
}

function broadcast(room, payload) {
  const msg = JSON.stringify(payload);
  room.players.forEach((p) => {
    if (p.ws.readyState === p.ws.OPEN) {
      p.ws.send(msg);
    }
  });
}

function buildLeaderboard(room) {
  const entries = [];
  room.players.forEach((p) => {
    entries.push({ name: p.name, score: p.score, alive: p.alive, id: p.id, isPlayer: true });
  });
  room.bots.forEach((b) => {
    if (!b.alive) return;
    entries.push({ name: b.name, score: b.score, alive: b.alive, isPlayer: false });
  });
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

function updatePlacements(room) {
  const leaderboard = buildLeaderboard(room);
  const aliveCount = leaderboard.filter((e) => e.alive).length;
  room.players.forEach((p) => {
    const placement = 1 + leaderboard.filter((e) => e.alive && e.score > p.score).length;
    p.placement = placement;
    p.remaining = aliveCount;
  });
}

function tickRoom(room) {
  room.t += 1;
  room.lastActive = Date.now();

  room.bots.forEach((b) => {
    if (!b.alive) return;
    const expected = Math.floor(b.rate * room.t);
    if (b.score < expected) b.score = expected;
  });

  if (room.settings?.mode === 'battle') {
    const nextCutTime = CUT_TIMES[room.cutIndex];
    const nextCutRank = CUT_RANKS[room.cutIndex];
    if (nextCutTime !== undefined && room.t >= nextCutTime) {
      const alive = room.bots.filter((b) => b.alive);
      const keepCount = Math.max(1, Math.ceil(alive.length * ((nextCutRank ?? 80) / 100)));
      const cutCount = Math.max(0, alive.length - keepCount);
      alive.sort((a, b) => a.score - b.score);
      for (let i = 0; i < cutCount; i += 1) alive[i].alive = false;

      updatePlacements(room);
      room.players.forEach((p) => {
        const safeCount = Math.max(1, Math.ceil(p.remaining * ((nextCutRank ?? 80) / 100)));
        if (p.placement > safeCount) {
          p.alive = false;
          if (p.ws.readyState === p.ws.OPEN) {
            p.ws.send(JSON.stringify({ type: 'eliminated' }));
          }
        }
      });
      room.cutIndex += 1;
    }
  }

  updatePlacements(room);
  const leaderboard = buildLeaderboard(room).slice(0, 20);
  const placements = {};
  room.players.forEach((p) => {
    placements[p.id] = { placement: p.placement, remaining: p.remaining };
  });
  broadcast(room, { type: 'leaderboard', leaderboard, placements, t: room.t });
}

function startRoom(room, settings) {
  room.started = true;
  room.settings = settings;
  room.t = 0;
  room.cutIndex = 0;

  const diff = DIFFICULTY_PARAMS[settings.difficulty] || DIFFICULTY_PARAMS.medium;
  const names = shuffle(BOT_NAMES);
  const botCount = Math.max(0, MAX_PLAYERS - room.players.size);
  room.bots = Array.from({ length: botCount }, (_, i) => ({
    name: names[i % names.length],
    rate: Math.max(0.02, randNormal(diff.mean, diff.std)),
    score: 0,
    alive: true
  }));

  room.players.forEach((p) => {
    p.score = 0;
    p.alive = true;
  });

  broadcast(room, { type: 'start', settings, code: room.code });

  if (room.interval) clearInterval(room.interval);
  room.interval = setInterval(() => tickRoom(room), 1000);
}

function cleanupRooms() {
  const now = Date.now();
  rooms.forEach((room, code) => {
    const noPlayers = room.players.size === 0;
    if (noPlayers && now - room.lastActive > ROOM_EXPIRE_MS) {
      removeRoom(code);
    }
  });
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Server listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  const id = `c${nextClientId++}`;
  let currentRoom = null;
  ws.send(JSON.stringify({ type: 'hello', id }));

  ws.on('message', (data) => {
    let msg = null;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'create') {
      const room = createRoom({ passcode: msg.passcode, publicRoom: msg.publicRoom });
      currentRoom = room;
      room.hostId = id;
      room.players.set(id, { id, name: msg.name || 'host', ws, score: 0, alive: true, placement: 1, remaining: 1 });
      ws.send(JSON.stringify({ type: 'room', code: room.code, host: true }));
      return;
    }

    if (msg.type === 'join') {
      const room = getRoom(msg.code);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'room not found' }));
        return;
      }
      if (room.passcode && room.passcode !== msg.passcode) {
        ws.send(JSON.stringify({ type: 'error', message: 'wrong passcode' }));
        return;
      }
      currentRoom = room;
      room.players.set(id, { id, name: msg.name || 'player', ws, score: 0, alive: true, placement: 1, remaining: 1 });
      ws.send(JSON.stringify({ type: 'room', code: room.code, host: room.hostId === id }));
      broadcast(room, { type: 'players', count: room.players.size });
      return;
    }

    if (msg.type === 'start') {
      if (!currentRoom || currentRoom.hostId !== id) return;
      startRoom(currentRoom, msg.settings);
      return;
    }

    if (msg.type === 'score') {
      if (!currentRoom) return;
      const player = currentRoom.players.get(id);
      if (!player) return;
      player.score = msg.score;
      return;
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.players.delete(id);
      currentRoom.lastActive = Date.now();
      if (currentRoom.hostId === id) {
        const nextHost = currentRoom.players.values().next().value;
        currentRoom.hostId = nextHost ? nextHost.id : null;
      }
    }
  });
});

setInterval(cleanupRooms, 60 * 1000);
