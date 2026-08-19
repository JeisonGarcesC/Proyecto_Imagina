import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './auth/authRouter.js';
import { prisma } from './db/prisma.js';

export function createApp({ db = prisma } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      const error = new Error('Origen CORS no permitido.');
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      return callback(error);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/auth', createAuthRouter({ db }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
