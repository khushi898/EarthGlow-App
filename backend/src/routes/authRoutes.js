import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import createToken from '../utils/createToken.js';

import {
  sendLoginOtp,
  sendPasswordResetEmail
} from '../utils/emailService.js';

const router = Router();

const OTP_LIFETIME = 5 * 60 * 1000;
const RESET_LIFETIME = 15 * 60 * 1000;
const OTP_COOLDOWN = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const normalizeEmail = value =>
  String(value || '').trim().toLowerCase();

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const hashOtp = (userId, code) => {
  if (!process.env.OTP_SECRET) {
    throw new Error('OTP_SECRET is missing');
  }

  return crypto
    .createHmac('sha256', process.env.OTP_SECRET)
    .update(`${userId}:${code}`)
    .digest('hex');
};

const hashResetToken = token =>
  crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const isOtpTestAccount = email => {
  const testEmail = normalizeEmail(
    process.env.EMAIL_TEST_TO
  );

  return (
    process.env.EMAIL_TEST_MODE === 'true' &&
    Boolean(testEmail) &&
    email === testEmail
  );
};

// Register customer
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !normalizedEmail ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters'
      });
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    return res.status(201).json({
      message: 'Account created. Please sign in.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    const user = await User.findOne({ email })
      .select('+loginOtpHash');

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Normal login for customers.
    // Only the designated test account requires OTP.
    if (!isOtpTestAccount(email)) {
      return res.json({
        token: createToken(user),
        user: publicUser(user)
      });
    }

    const now = Date.now();

    if (
      user.loginOtpLastSent &&
      now - new Date(user.loginOtpLastSent).getTime()
        < OTP_COOLDOWN
    ) {
      return res.status(429).json({
        message: 'Please wait before requesting another code.'
      });
    }

    const code = crypto
      .randomInt(0, 10000)
      .toString()
      .padStart(4, '0');

    user.loginOtpHash = hashOtp(user._id, code);
    user.loginOtpExpires = new Date(
      now + OTP_LIFETIME
    );
    user.loginOtpAttempts = 0;
    user.loginOtpLastSent = new Date(now);

    await user.save();

    await sendLoginOtp(user.email, code);

    return res.json({
      requiresVerification: true,
      message: 'Verification code sent to your email.'
    });
  } catch (error) {
    next(error);
  }
});

// Verify 4-digit OTP
router.post('/verify-login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '');

    if (!/^\d{4}$/.test(code)) {
      return res.status(400).json({
        message: 'Enter a valid 4-digit code.'
      });
    }

    if (!isOtpTestAccount(email)) {
      return res.status(403).json({
        message: 'Email verification is unavailable for this account.'
      });
    }

    const user = await User.findOne({ email })
      .select('+loginOtpHash');

    if (!user || !user.loginOtpHash) {
      return res.status(400).json({
        message: 'Invalid or expired verification code.'
      });
    }

    if (
      !user.loginOtpExpires ||
      user.loginOtpExpires.getTime() <= Date.now() ||
      user.loginOtpAttempts >= MAX_OTP_ATTEMPTS
    ) {
      return res.status(400).json({
        message: 'Code expired or too many attempts. Please sign in again.'
      });
    }

    const expected = Buffer.from(
      user.loginOtpHash,
      'hex'
    );

    const received = Buffer.from(
      hashOtp(user._id, code),
      'hex'
    );

    const valid =
      expected.length === received.length &&
      crypto.timingSafeEqual(expected, received);

    if (!valid) {
      user.loginOtpAttempts += 1;

      if (user.loginOtpAttempts >= MAX_OTP_ATTEMPTS) {
        user.loginOtpHash = null;
        user.loginOtpExpires = null;
      }

      await user.save();

      return res.status(400).json({
        message: 'Invalid or expired verification code.'
      });
    }

    user.loginOtpHash = null;
    user.loginOtpExpires = null;
    user.loginOtpAttempts = 0;

    await user.save();

    return res.json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);

    const response = {
      message:
        'If the account exists, a password-reset email will be sent.'
    };

    const user = await User.findOne({ email });

    // Resend test sender can only email the test account.
    if (!user || !isOtpTestAccount(email)) {
      return res.json(response);
    }

    const now = Date.now();

    if (
      user.resetPasswordExpires &&
      user.resetPasswordExpires.getTime() >
        now + RESET_LIFETIME - OTP_COOLDOWN
    ) {
      return res.json(response);
    }

    const token = crypto
      .randomBytes(32)
      .toString('hex');

    user.resetPasswordTokenHash =
      hashResetToken(token);

    user.resetPasswordExpires = new Date(
      now + RESET_LIFETIME
    );

    await user.save();

    const frontendUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173';

    const resetLink =
      `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    await sendPasswordResetEmail(
      user.email,
      resetLink
    );

    return res.json(response);
  } catch (error) {
    next(error);
  }
});

// Reset Password
router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({
        message: 'Invalid password-reset link.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    const user = await User.findOne({
      resetPasswordTokenHash: hashResetToken(token),
      resetPasswordExpires: {
        $gt: new Date()
      }
    }).select('+resetPasswordTokenHash');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired password-reset link.'
      });
    }

    user.passwordHash = await bcrypt.hash(
      password,
      12
    );

    user.tokenVersion =
      (user.tokenVersion ?? 0) + 1;

    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;

    user.loginOtpHash = null;
    user.loginOtpExpires = null;
    user.loginOtpAttempts = 0;

    await user.save();

    return res.json({
      message:
        'Password updated successfully. Please sign in again.'
    });
  } catch (error) {
    next(error);
  }
});

// Current user
router.get('/me', protect, (req, res) => {
  res.json({
    user: req.user
  });
});

export default router;