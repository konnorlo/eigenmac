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

const signupSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(64)
});

const loginSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(64)
});

const scoreSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8).max(64),
  score: z.number().int().min(0).max(100000)
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

  res.json({ id: user.id, username: user.username, highScore: user.highScore, averageScore: user.averageScore, attempts: user.attempts });
});

app.post('/score', async (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { username, password, score } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const newAttempts = user.attempts + 1;
  const newAverage = ((user.averageScore * user.attempts) + score) / newAttempts;
  const newHigh = Math.max(user.highScore, score);

  const updated = await prisma.user.update({
    where: { username },
    data: {
      attempts: newAttempts,
      averageScore: newAverage,
      highScore: newHigh
    }
  });

  res.json({ username: updated.username, highScore: updated.highScore, averageScore: updated.averageScore, attempts: updated.attempts });
});

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
