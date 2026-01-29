import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { WebSocketServer } from 'ws';
import crypto from 'crypto';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const MAX_PLAYERS = 100;
const ROOM_TTL_MS = 5 * 60 * 1000;
const CUT_TIMES = [23, 39, 55, 66, 78, 94, 109, 125, 140];
const CUT_RANKS = [60, 45, 30, 25, 18, 12, 8, 5, 3];
const BATTLE_DURATION = 110;
const BATTLE_MEAN_MULT = 0.9;
const BOT_MEAN_RATE = 0.1;
const BOT_STD_RATE = 0.04;
const DIFFICULTY_PARAMS = {
  easy: { mean: 0.07, std: 0.04 },
  medium: { mean: 0.1, std: 0.05 },
  hard: { mean: 0.13, std: 0.06 },
  improbable: { mean: 0.17, std: 0.08 }
};

const rooms = new Map();
const clients = new Map();
const reconnectTokens = new Map();
const rateBuckets = new Map();

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randNormal = (mean, std) => {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
};
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const factorial = (n) => {
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
};

const createRoomId = () => {
  const id = crypto.randomBytes(3).toString('hex').toUpperCase();
  return id;
};

const ensureName = (name) => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed) return trimmed;
  return `guest_${randInt(1000, 9999)}`;
};

const issueReconnectToken = (clientId, roomId, name) => {
  const token = crypto.randomBytes(16).toString('hex');
  reconnectTokens.set(token, {
    roomId,
    playerId: clientId,
    name,
    lastSeen: Date.now()
  });
  const client = clients.get(clientId);
  if (client) {
    client.token = token;
  }
  return token;
};

const rateLimit = ({ windowMs, max }) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateBuckets.set(key, { start: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > max) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  return next();
};

const averageSizeFactor = (settings) => {
  const avgSize = (settings.sizeMin + settings.sizeMax) / 2;
  return 2 / (Math.max(2, avgSize) ** 1.21);
};

const listPublicRooms = () => {
  const items = [];
  rooms.forEach((room) => {
    if (!room.isPublic || room.ended) return;
    items.push({
      id: room.id,
      name: room.displayName,
      players: room.players.size,
      maxPlayers: room.maxPlayers
    });
  });
  return items;
};

const signupSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(1).max(64)
});

const loginSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(1).max(64)
});

const solveSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(1).max(64),
  dimension: z.number().int().min(2).max(10),
  score: z.number().int().min(0).max(100000),
  solveSeconds: z.number().min(0).max(3600)
});

const resultSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(1).max(64),
  mode: z.enum(['classic', 'battle']),
  preset: z.string().min(1).max(20),
  score: z.number().int().min(0).max(100000),
  duration: z.number().int().min(0).max(3600),
  sizeMin: z.number().int().min(2).max(10),
  sizeMax: z.number().int().min(2).max(10),
  range: z.number().int().min(1).max(50),
  symmetric: z.boolean()
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/signup', rateLimit({ windowMs: 60_000, max: 8 }), async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { username, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: 'user_exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash }
  });

  res.json({ id: user.id, username: user.username });
});

app.post('/login', rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const bestOverall = await prisma.userStat.aggregate({
    where: { userId: user.id },
    _max: { bestScore: true }
  });

  const factorial = (n) => {
    let out = 1;
    for (let i = 2; i <= n; i += 1) out *= i;
    return out;
  };
  const stats = await prisma.userStat.findMany({ where: { userId: user.id } });
  const power = stats.reduce((acc, s) => {
    if (s.bestAvg5 > 0) {
      const score = factorial(s.dimension) / s.bestAvg5 - 0.005;
      return Math.max(acc, score);
    }
    return acc;
  }, 0);

  res.json({
    id: user.id,
    username: user.username,
    bestScore: bestOverall._max.bestScore ?? 0,
    power
  });
});

app.post('/solve', rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
  const parsed = solveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { username, password, score, solveSeconds, dimension } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const existing = await prisma.userStat.findUnique({
    where: { userId_dimension: { userId: user.id, dimension } }
  });

  if (!existing) {
    const lastFive = [solveSeconds];
    const created = await prisma.userStat.create({
      data: {
        userId: user.id,
        dimension,
        attempts: 1,
        bestScore: score,
        totalTime: solveSeconds,
        avgTime: solveSeconds,
        bestAvg5: 0,
        lastFive
      }
    });
    res.json(created);
    return;
  }

  const newAttempts = existing.attempts + 1;
  const newTotalTime = existing.totalTime + solveSeconds;
  const newAvg = newTotalTime / newAttempts;
  const newBest = Math.max(existing.bestScore, score);
  const lastFive = Array.isArray(existing.lastFive) ? [...existing.lastFive] : [];
  lastFive.push(solveSeconds);
  while (lastFive.length > 5) lastFive.shift();
  const avg5 = lastFive.length === 5 ? lastFive.reduce((a, b) => a + b, 0) / 5 : 0;
  const hasBest = existing.bestAvg5 > 0;
  const newBestAvg5 = avg5 > 0 ? (hasBest ? Math.min(existing.bestAvg5, avg5) : avg5) : existing.bestAvg5;

  const updated = await prisma.userStat.update({
    where: { userId_dimension: { userId: user.id, dimension } },
    data: {
      attempts: newAttempts,
      totalTime: newTotalTime,
      avgTime: newAvg,
      bestScore: newBest,
      bestAvg5: newBestAvg5,
      lastFive
    }
  });

  const bestOverall = await prisma.userStat.aggregate({
    where: { userId: user.id },
    _max: { bestScore: true }
  });

  const power = await prisma.userStat.findMany({
    where: { userId: user.id }
  }).then((stats) => {
    const factorial = (n) => {
      let out = 1;
      for (let i = 2; i <= n; i += 1) out *= i;
      return out;
    };
    return stats.reduce((acc, s) => {
      if (s.bestAvg5 > 0) {
        const score = factorial(s.dimension) / s.bestAvg5 - 0.005;
        return Math.max(acc, score);
      }
      return acc;
    }, 0);
  });

  res.json({ ...updated, bestScore: bestOverall._max.bestScore ?? newBest, power });
});

app.post('/results', rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { username, password, ...payload } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const created = await prisma.gameResult.create({
    data: {
      userId: user.id,
      ...payload
    }
  });
  res.json({ id: created.id });
});

app.get('/leaderboard', rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
  const mode = req.query.mode === 'battle' ? 'battle' : 'classic';
  const preset = typeof req.query.preset === 'string' ? req.query.preset : 'p2';
  const items = await prisma.gameResult.findMany({
    where: { mode, preset },
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    take: 20,
    include: { user: true }
  });
  res.json({
    items: items.map((r) => ({
      username: r.user.username,
      score: r.score,
      duration: r.duration,
      createdAt: r.createdAt
    }))
  });
});

app.get('/power-leaderboard', async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { stats: true }
  });
  const factorial = (n) => {
    let out = 1;
    for (let i = 2; i <= n; i += 1) out *= i;
    return out;
  };
  const items = users.map((u) => {
    let power = 0;
    u.stats.forEach((s) => {
      if (s.bestAvg5 > 0) {
        power = Math.max(power, factorial(s.dimension) / s.bestAvg5 - 0.005);
      }
    });
    return { username: u.username, power };
  }).sort((a, b) => b.power - a.power).slice(0, 20);

  res.json({ items });
});

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
  'Theo Black'
];

const createBot = (name, mean, std) => ({
  id: `bot_${crypto.randomUUID()}`,
  name,
  score: 0,
  alive: true,
  lastScoreTime: 0,
  baseRate: Math.max(0.02, randNormal(mean, std)),
  isBot: true
});

const syncBots = (room) => {
  if (room.started) return;
  const target = Math.max(0, room.maxPlayers - room.players.size);
  if (room.bots.length > target) {
    room.bots = room.bots.slice(0, target);
    return;
  }
  if (room.bots.length < target) {
    const names = shuffle(BOT_NAMES);
    const diff = DIFFICULTY_PARAMS[room.settings.difficulty] || DIFFICULTY_PARAMS.medium;
    const mean = room.mode === 'battle' ? diff.mean * BATTLE_MEAN_MULT : BOT_MEAN_RATE;
    const std = room.mode === 'battle' ? diff.std : BOT_STD_RATE;
    while (room.bots.length < target) {
      const name = names[room.bots.length % names.length];
      room.bots.push(createBot(name, mean, std));
    }
  }
};

const send = (ws, payload) => {
  if (ws.readyState !== 1) return;
  ws.send(JSON.stringify(payload));
};

const broadcast = (room, payload) => {
  room.players.forEach((player) => {
    const client = clients.get(player.id);
    if (client?.ws) {
      send(client.ws, payload);
    }
  });
};

const getParticipants = (room) => {
  const players = Array.from(room.players.values()).filter((p) => !p.isSpectator);
  return [...players, ...room.bots];
};

const computeLeaderboard = (room) => {
  return getParticipants(room)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.lastScoreTime - b.lastScoreTime;
    });
};

const computePlacement = (room, player) => {
  const alive = getParticipants(room).filter((p) => p.alive);
  return 1 + alive.filter((p) =>
    p.score > player.score || (p.score === player.score && p.lastScoreTime < player.lastScoreTime)
  ).length;
};

const applyCut = (room, percent) => {
  const alive = getParticipants(room).filter((p) => p.alive);
  if (alive.length <= 1) return;
  const keepCount = Math.max(1, Math.ceil(alive.length * (percent / 100)));
  const cutCount = Math.max(0, alive.length - keepCount);
  alive.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.lastScoreTime - b.lastScoreTime;
  });
  for (let i = 0; i < cutCount; i += 1) {
    alive[i].alive = false;
  }
};

const updateBots = (room) => {
  const sizeFactor = averageSizeFactor(room.settings);
  room.bots.forEach((bot) => {
    if (!bot.alive) return;
    const expected = Math.floor(bot.baseRate * sizeFactor * room.t);
    if (bot.score < expected) {
      bot.score = expected;
      bot.lastScoreTime = room.t;
    }
  });
};

const sendRoomState = (room) => {
  const playersList = Array.from(room.players.values()).map((p) => ({
    name: p.name,
    isHost: p.id === room.hostId,
    isSpectator: Boolean(p.isSpectator)
  }));
  room.players.forEach((player) => {
    const client = clients.get(player.id);
    if (!client?.ws) return;
    send(client.ws, {
      type: 'room:state',
      room: {
        id: room.id,
        mode: room.mode,
        settings: room.settings,
        settingsLocked: Boolean(room.settingsLocked),
        started: room.started,
        hostId: room.hostId,
        players: room.players.size,
        maxPlayers: room.maxPlayers,
        displayName: room.displayName,
        seed: room.seed,
        problemIndex: room.problemIndex,
        playersList,
        chat: room.chat || []
      },
      you: {
        isSpectator: Boolean(player.isSpectator)
      }
    });
  });
};

const sendRoomTick = (room) => {
  const leaderboard = computeLeaderboard(room).slice(0, 20);
  room.players.forEach((player) => {
    const client = clients.get(player.id);
    if (!client?.ws) return;
    const placement = computePlacement(room, player);
    const nextCutTime = Math.min(CUT_TIMES[room.cutIndex] ?? BATTLE_DURATION, BATTLE_DURATION);
    const nextCutIn = Math.max(0, nextCutTime - room.t);
    const remaining = getParticipants(room).filter((p) => p.alive).length;
    const status = room.mode === 'battle'
      ? `placement: ${placement}/${remaining} · next cut in ${nextCutIn}s`
      : `placement: ${placement}/${getParticipants(room).length}`;
    send(client.ws, {
      type: 'room:tick',
      timeLeft: room.timeLeft,
      leaderboard,
      placement,
      status,
      settings: room.settings,
      problemIndex: player.problemIndex ?? 0,
      targetIndex: room.problemIndex,
      roomMode: room.mode,
      winnerId: room.winnerId || null,
      eliminated: !player.alive
    });
  });
};

const startRoom = (room) => {
  if (room.started) return;
  room.started = true;
  room.ended = false;
  room.t = 0;
  room.cutIndex = 0;
  room.timeLeft = room.mode === 'battle' ? BATTLE_DURATION : room.settings.timeLimit;
  syncBots(room);
  sendRoomState(room);
  sendRoomTick(room);
  if (room.interval) clearInterval(room.interval);
      room.interval = setInterval(() => {
        room.t += 1;
        room.timeLeft = Math.max(0, room.timeLeft - 1);
        updateBots(room);
    if (room.mode === 'battle') {
      const nextCutTime = CUT_TIMES[room.cutIndex];
      const nextCutRank = CUT_RANKS[room.cutIndex];
      if (nextCutTime !== undefined && nextCutTime <= BATTLE_DURATION && room.t >= nextCutTime) {
        applyCut(room, nextCutRank ?? 80);
        room.cutIndex += 1;
      }
    }
    sendRoomTick(room);
    const aliveCount = getParticipants(room).filter((p) => p.alive).length;
    if (room.mode === 'battle' && aliveCount <= 1 && !room.winnerId) {
      const winner = getParticipants(room).find((p) => p.alive);
      room.winnerId = winner ? winner.id : null;
    }
    if (room.timeLeft <= 0 || (room.mode === 'battle' && aliveCount <= 1)) {
      room.started = false;
      room.ended = true;
      clearInterval(room.interval);
      room.interval = null;
      const winnerName = room.winnerId
        ? getParticipants(room).find((p) => p.id === room.winnerId)?.name
        : null;
      broadcast(room, { type: 'room:end', status: winnerName ? `${winnerName} won` : 'match ended', winnerId: room.winnerId });
    }
    room.lastActivity = Date.now();
  }, 1000);
};

const cleanupRooms = () => {
  const now = Date.now();
  reconnectTokens.forEach((entry, token) => {
    if (now - entry.lastSeen > ROOM_TTL_MS) {
      const room = rooms.get(entry.roomId);
      if (room && room.players.has(entry.playerId)) {
        room.players.delete(entry.playerId);
        if (room.hostId === entry.playerId) {
          const nextHost = room.players.keys().next().value;
          room.hostId = nextHost || null;
        }
        room.lastActivity = Date.now();
      }
      reconnectTokens.delete(token);
    }
  });
  rooms.forEach((room, roomId) => {
    if (room.players.size === 0) {
      if (room.interval) clearInterval(room.interval);
      rooms.delete(roomId);
      return;
    }
    if (!room.started && now - room.lastActivity > ROOM_TTL_MS) {
      if (room.interval) clearInterval(room.interval);
      rooms.delete(roomId);
    }
  });
};

setInterval(cleanupRooms, 60 * 1000);

const httpServer = app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  const clientId = crypto.randomUUID();
  clients.set(clientId, { ws, roomId: null, token: null });
  send(ws, { type: 'hello', clientId });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg?.type) return;
    const client = clients.get(clientId);
    if (!client) return;

    if (msg.type === 'room:reconnect') {
      const token = typeof msg.token === 'string' ? msg.token : '';
      const entry = reconnectTokens.get(token);
      if (!entry) {
        send(ws, { type: 'room:error', message: 'reconnect failed' });
        return;
      }
      const room = rooms.get(entry.roomId);
      if (!room) {
        reconnectTokens.delete(token);
        send(ws, { type: 'room:error', message: 'room not found' });
        return;
      }
      const oldId = entry.playerId;
      const existing = room.players.get(oldId);
      if (existing) {
        room.players.delete(oldId);
        room.players.set(clientId, { ...existing, id: clientId, connected: true });
        if (room.hostId === oldId) {
          room.hostId = clientId;
        }
      } else {
        room.players.set(clientId, {
          id: clientId,
          name: ensureName(entry.name),
          score: 0,
          alive: true,
          lastScoreTime: 0,
          problemIndex: room.problemIndex,
          connected: true,
          isSpectator: false,
          isBot: false
        });
      }
      entry.playerId = clientId;
      entry.lastSeen = Date.now();
      const clientRef = clients.get(clientId);
      if (clientRef) {
        clientRef.roomId = room.id;
        clientRef.token = token;
      }
      room.lastActivity = Date.now();
      send(ws, { type: 'room:token', token });
      sendRoomState(room);
      sendRoomTick(room);
      return;
    }

    if (msg.type === 'room:list') {
      send(ws, { type: 'room:list', rooms: listPublicRooms() });
      return;
    }

    if (msg.type === 'room:create') {
      if (client.roomId) {
        send(ws, { type: 'room:error', message: 'already hosting or in a room' });
        return;
      }
      const id = createRoomId();
      const password = msg.password || '';
      const incoming = msg.settings || {};
      const settings = {
        timeLimit: Number(incoming.timeLimit ?? 120),
        range: Number(incoming.range ?? 6),
        symmetric: Boolean(incoming.symmetric),
        sizeMin: Number(incoming.sizeMin ?? 2),
        sizeMax: Number(incoming.sizeMax ?? 3),
        difficulty: incoming.difficulty ?? 'medium'
      };
      const mode = msg.mode === 'battle' ? 'battle' : 'classic';
      const room = {
        id,
        mode,
        settings,
        settingsLocked: false,
        hostId: clientId,
        isPublic: !password,
        password,
        displayName: ensureName(msg.displayName || msg.name),
        seed: crypto.randomUUID(),
        players: new Map(),
        bots: [],
        chat: [],
        maxPlayers: MAX_PLAYERS,
        createdAt: Date.now(),
        started: false,
        ended: false,
        t: 0,
        cutIndex: 0,
        timeLeft: 0,
        interval: null,
        winnerId: null,
        problemIndex: 0,
        lastActivity: Date.now()
      };
      room.players.set(clientId, {
        id: clientId,
        name: ensureName(msg.name),
        score: 0,
        alive: true,
        lastScoreTime: 0,
        problemIndex: room.problemIndex,
        connected: true,
        isSpectator: false,
        isBot: false
      });
      rooms.set(id, room);
      client.roomId = id;
      room.lastActivity = Date.now();
      const token = issueReconnectToken(clientId, id, room.players.get(clientId).name);
      send(ws, { type: 'room:token', token });
      syncBots(room);
      sendRoomState(room);
      return;
    }

    if (msg.type === 'room:join') {
      const room = rooms.get(msg.roomId);
      if (!room) {
        send(ws, { type: 'room:error', message: 'room not found' });
        return;
      }
      const spectate = Boolean(msg.spectate);
      if (room.started && !spectate) {
        send(ws, { type: 'room:error', message: 'match already started' });
        return;
      }
      if (room.password && room.password !== msg.password) {
        send(ws, { type: 'room:error', message: 'wrong password' });
        return;
      }
      if (room.players.size >= room.maxPlayers) {
        send(ws, { type: 'room:error', message: 'room full' });
        return;
      }
      room.players.set(clientId, {
        id: clientId,
        name: ensureName(msg.name),
        score: 0,
        alive: !spectate,
        lastScoreTime: 0,
        problemIndex: room.problemIndex,
        connected: true,
        isSpectator: spectate,
        isBot: false
      });
      client.roomId = room.id;
      room.lastActivity = Date.now();
      const token = issueReconnectToken(clientId, room.id, room.players.get(clientId).name);
      send(ws, { type: 'room:token', token });
      syncBots(room);
      sendRoomState(room);
      return;
    }

    if (msg.type === 'room:leave') {
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          room.players.delete(clientId);
          room.lastActivity = Date.now();
          if (room.hostId === clientId) {
            const nextHost = room.players.keys().next().value;
            room.hostId = nextHost || null;
          }
          if (room.players.size === 0) {
            if (room.interval) clearInterval(room.interval);
            rooms.delete(room.id);
          } else {
            syncBots(room);
            sendRoomState(room);
          }
        }
        if (client.token) {
          reconnectTokens.delete(client.token);
          client.token = null;
        }
        client.roomId = null;
      }
      return;
    }

    if (msg.type === 'room:update-settings') {
      const room = rooms.get(client.roomId);
      if (!room || room.hostId !== clientId) return;
      if (room.started || room.settingsLocked) return;
      const incoming = msg.settings || {};
      room.settings = {
        timeLimit: Number(incoming.timeLimit ?? room.settings.timeLimit ?? 120),
        range: Number(incoming.range ?? room.settings.range ?? 6),
        symmetric: Boolean(incoming.symmetric ?? room.settings.symmetric),
        sizeMin: Number(incoming.sizeMin ?? room.settings.sizeMin ?? 2),
        sizeMax: Number(incoming.sizeMax ?? room.settings.sizeMax ?? 3),
        difficulty: incoming.difficulty ?? room.settings.difficulty ?? 'medium'
      };
      room.mode = msg.mode === 'battle' ? 'battle' : room.mode === 'battle' ? 'battle' : 'classic';
      room.seed = crypto.randomUUID();
      room.problemIndex = 0;
      room.players.forEach((player) => {
        player.problemIndex = 0;
      });
      room.lastActivity = Date.now();
      sendRoomState(room);
      return;
    }

    if (msg.type === 'room:lock') {
      const room = rooms.get(client.roomId);
      if (!room || room.hostId !== clientId) return;
      room.settingsLocked = Boolean(msg.locked);
      room.lastActivity = Date.now();
      sendRoomState(room);
      return;
    }

    if (msg.type === 'room:chat') {
      const room = rooms.get(client.roomId);
      if (!room) return;
      const player = room.players.get(clientId);
      if (!player) return;
      const text = typeof msg.text === 'string' ? msg.text.trim() : '';
      if (!text) return;
      const entry = {
        name: player.name,
        text: text.slice(0, 200),
        ts: Date.now()
      };
      room.chat = room.chat || [];
      room.chat.push(entry);
      if (room.chat.length > 50) room.chat.shift();
      room.lastActivity = Date.now();
      broadcast(room, { type: 'room:chat', message: entry, chat: room.chat });
      return;
    }

    if (msg.type === 'room:start') {
      const room = rooms.get(client.roomId);
      if (!room || room.hostId !== clientId) return;
      room.winnerId = null;
      room.problemIndex = 0;
      room.players.forEach((player) => {
        player.problemIndex = 0;
      });
      room.lastActivity = Date.now();
      startRoom(room);
      return;
    }

    if (msg.type === 'game:score') {
      const room = rooms.get(client.roomId);
      if (!room || !room.started) return;
      const player = room.players.get(clientId);
      if (!player || !player.alive || player.isSpectator) return;
      room.lastActivity = Date.now();
      const reportedIndex = Number(msg.problemIndex ?? -1);
      if (reportedIndex !== player.problemIndex) {
        send(client.ws, {
          type: 'room:sync',
          problemIndex: player.problemIndex,
          targetIndex: room.problemIndex,
          seed: room.seed
        });
        return;
      }
      const nextScore = Math.max(player.score, Number(msg.score || 0));
      if (nextScore !== player.score) {
        player.score = nextScore;
        player.lastScoreTime = room.t;
        player.problemIndex += 1;
        room.problemIndex = Math.max(room.problemIndex, player.problemIndex);
        sendRoomTick(room);
      }
    }
  });

  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client?.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        const player = room.players.get(clientId);
        const token = client.token;
        if (token && reconnectTokens.has(token) && player) {
          player.connected = false;
          const entry = reconnectTokens.get(token);
          if (entry) entry.lastSeen = Date.now();
        } else {
          room.players.delete(clientId);
          if (room.hostId === clientId) {
            const nextHost = room.players.keys().next().value;
            room.hostId = nextHost || null;
          }
        }
        room.lastActivity = Date.now();
        if (room.players.size === 0) {
          if (room.interval) clearInterval(room.interval);
          rooms.delete(room.id);
        } else {
          syncBots(room);
          sendRoomState(room);
        }
      }
    }
    clients.delete(clientId);
  });
});
