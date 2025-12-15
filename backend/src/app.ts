import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import orgRoutes from './modules/orgs/routes';
import teamRoutes from './modules/teams/routes';
import listRoutes from './modules/lists/routes';
import taskRoutes from './modules/tasks/routes';
import messageRoutes from './modules/messages/routes';
import inviteRoutes from './modules/invites/routes';
import { prisma } from './db/prisma';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const createApp = () => {
  const app = express();
  app.use(helmet());
  // Tighten CORS: allow only dev frontend
  const allowedOrigins = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5174',
  ];
  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Structured request logging with request id
  app.use(pinoHttp({ logger, genReqId: () => Math.random().toString(36).slice(2) }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/health/db', async (_req, res) => {
    try {
      // Connectivity + current DB time
      const rows = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
      const now = Array.isArray(rows) && rows[0]?.now ? new Date(rows[0].now).toISOString() : null;
      res.json({ status: 'ok', data: { db: now ? 'up' : 'unknown', now } });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: 'DB check failed', detail: err?.message });
    }
  });

  // Rate limit auth endpoints
  const authLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/orgs', orgRoutes);
  app.use('/api', teamRoutes);
  app.use('/api', listRoutes);
  app.use('/api', taskRoutes);
  app.use('/api', messageRoutes);
  app.use('/api/invites', inviteRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Not found' });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'unhandled-error');
    const status = err.status || 500;
    res.status(status).json({ status: 'error', message: err.message || 'Internal Server Error' });
  });

  return app;
};
