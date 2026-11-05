import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

import {
  errorHandler,
  notFound
} from './middleware/errorMiddleware.js';

function limiter({ windowMs = 15 * 60 * 1000, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message }
  });
}

// Builds the Express app without connecting to a database or opening a port,
// so tests can run the real API against their own temporary database.
export function createApp() {
  const app = express();

  // Trust Render's reverse proxy when deployed.
  // Keep local development working normally.
  if (process.env.RENDER === 'true') {
    app.set('trust proxy', 1);
  }

  // Allow EarthGlow frontend and local development.
  app.use(cors({
    origin: [
      process.env.CLIENT_URL ||
        'https://earthglow-app.onrender.com',
      'http://localhost:5173'
    ]
  }));

  // Only product requests can carry uploaded images.
  app.use('/api/products', express.json({ limit: '10mb' }));
  app.use(express.json({ limit: '100kb' }));

  // Apply limits to specific authentication endpoints.
  app.use('/api/auth/register', limiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: 'Too many accounts created. Please try again later.'
  }));

  app.use('/api/auth/login', limiter({
    limit: 10,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }));

  app.use('/api/auth/verify-login', limiter({
    limit: 10,
    message: 'Too many verification attempts. Please try again later.'
  }));

  app.use('/api/auth/forgot-password', limiter({
    limit: 5,
    message: 'Too many password-reset requests. Please try again later.'
  }));

  app.use('/api/auth/reset-password', limiter({
    limit: 10,
    message: 'Too many password-reset attempts. Please try again later.'
  }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      message: 'EarthGlow API is running'
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);

  // Error handlers
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
