import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

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

  res.json({
    id: user.id,
    username: user.username,
    bestScore: bestOverall._max.bestScore ?? 0
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
    const created = await prisma.userStat.create({
      data: {
        userId: user.id,
        dimension,
        attempts: 1,
        bestScore: score,
        totalTime: solveSeconds,
        avgTime: solveSeconds
      }
    });
    res.json(created);
    return;
  }

  const newAttempts = existing.attempts + 1;
  const newTotalTime = existing.totalTime + solveSeconds;
  const newAvg = newTotalTime / newAttempts;
  const newBest = Math.max(existing.bestScore, score);

  const updated = await prisma.userStat.update({
    where: { userId_dimension: { userId: user.id, dimension } },
    data: {
      attempts: newAttempts,
      totalTime: newTotalTime,
      avgTime: newAvg,
      bestScore: newBest
    }
  });

  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
