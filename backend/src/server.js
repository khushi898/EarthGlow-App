import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
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

app.use(express.json({ limit: '10mb' }));

// Limit repeated password login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Too many login attempts. Please try again in 15 minutes.'
  }
});

// Limit repeated OTP verification attempts.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Too many verification attempts. Please try again later.'
  }
});

// Limit password-reset email requests.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Too many password-reset requests. Please try again later.'
  }
});

// Limit password-reset submissions.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message:
      'Too many password-reset attempts. Please try again later.'
  }
});

// Apply limits to specific authentication endpoints.
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/verify-login', otpLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);

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

// Start backend server
const port = process.env.PORT || 5000;

try {
  await mongoose.connect(process.env.MONGO_URI);

  console.log('MongoDB connected');

  app.listen(port, () => {
    console.log(
      `Server serving on http://localhost:${port}`
    );
  });
} catch (error) {
  console.error(
    'MongoDB connection failed:',
    error.message
  );

  process.exit(1);
}