import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import orgRoutes from './modules/orgs/routes';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Request logging (minimal)
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'request');
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/orgs', orgRoutes);

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
