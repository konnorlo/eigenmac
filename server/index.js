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
  password: z.string().min(8).max(64)
});

const loginSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(64)
});

const solveSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(64),
  dimension: z.number().int().min(2).max(10),
  score: z.number().int().min(0).max(100000),
  solveSeconds: z.number().min(0).max(3600)
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/signup', async (req, res) => {
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

app.post('/login', async (req, res) => {
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

app.post('/solve', async (req, res) => {
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
  const players = Array.from(room.players.values());
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
    isHost: p.id === room.hostId
  }));
  const payload = {
    type: 'room:state',
    room: {
      id: room.id,
      mode: room.mode,
      settings: room.settings,
      started: room.started,
      hostId: room.hostId,
      players: room.players.size,
      maxPlayers: room.maxPlayers,
      displayName: room.displayName,
      seed: room.seed,
      playersList
    }
  };
  broadcast(room, payload);
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
  clients.set(clientId, { ws, roomId: null });
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
        hostId: clientId,
        isPublic: !password,
        password,
        displayName: ensureName(msg.displayName || msg.name),
        seed: crypto.randomUUID(),
        players: new Map(),
        bots: [],
        maxPlayers: MAX_PLAYERS,
        createdAt: Date.now(),
        started: false,
        ended: false,
        t: 0,
        cutIndex: 0,
        timeLeft: 0,
        interval: null,
        winnerId: null,
        lastActivity: Date.now()
      };
      room.players.set(clientId, {
        id: clientId,
        name: ensureName(msg.name),
        score: 0,
        alive: true,
        lastScoreTime: 0,
        isBot: false
      });
      rooms.set(id, room);
      client.roomId = id;
      room.lastActivity = Date.now();
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
      if (room.started) {
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
        alive: true,
        lastScoreTime: 0,
        isBot: false
      });
      client.roomId = room.id;
      room.lastActivity = Date.now();
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
        client.roomId = null;
      }
      return;
    }

    if (msg.type === 'room:start') {
      const room = rooms.get(client.roomId);
      if (!room || room.hostId !== clientId) return;
      room.winnerId = null;
      room.lastActivity = Date.now();
      startRoom(room);
      return;
    }

    if (msg.type === 'game:score') {
      const room = rooms.get(client.roomId);
      if (!room || !room.started) return;
      const player = room.players.get(clientId);
      if (!player || !player.alive) return;
      room.lastActivity = Date.now();
      const nextScore = Math.max(player.score, Number(msg.score || 0));
      if (nextScore !== player.score) {
        player.score = nextScore;
        player.lastScoreTime = room.t;
        sendRoomTick(room);
      }
    }
  });

  ws.on('close', () => {
    const client = clients.get(clientId);
    if (client?.roomId) {
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
    }
    clients.delete(clientId);
  });
});
