import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { hashPassword, verifyPassword } from './crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens';
import { env } from '../../config/env';
import { sendError, sendZodError } from '../../utils/http';

const router = Router();

// Helper to set refresh cookie
function setRefreshCookie(res: any, token: string) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Email existence check for progressive Login/Signup
router.post('/check-email', async (req, res) => {
  const email = (req.body?.email || '').toString()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return sendError(res, 422, 'Valid email required')
  }
  const user = await prisma.user.findUnique({ where: { email } })
  return res.json({ status: 'ok', data: { exists: !!user } })
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return sendZodError(res, parsed);
    }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }
  const at = signAccessToken({ sub: user.id });
  const rt = signRefreshToken({ sub: user.id, tokenId: user.id });
  setRefreshCookie(res, rt);
  return res.json({ status: 'ok', data: { accessToken: at } });
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.passwordHash) {
    return res.status(409).json({ status: 'error', message: 'User already exists' });
  }
  const hash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { email, username: email.split('@')[0], passwordHash: hash },
  });
  const at = signAccessToken({ sub: user.id });
  const rt = signRefreshToken({ sub: user.id, tokenId: user.id });
  setRefreshCookie(res, rt);
  return res.json({ status: 'ok', data: { accessToken: at } });
});

router.post('/refresh', async (req, res) => {
  const cookie = req.cookies?.rt;
  if (!cookie) {
    return res.status(401).json({ status: 'error', message: 'Missing refresh token' });
  }
  try {
    const payload = verifyRefreshToken(cookie);
    const at = signAccessToken({ sub: payload.sub });
    // Rotate refresh token to reduce replay risk (always rotate; especially important in production)
    const rt = signRefreshToken({ sub: payload.sub, tokenId: payload.tokenId || payload.sub });
    setRefreshCookie(res, rt);
    return res.json({ status: 'ok', data: { accessToken: at } });
  } catch (e) {
    return res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (_req, res) => {
  res.clearCookie('rt', { path: '/api/auth/refresh' });
  return res.json({ status: 'ok', message: 'Logged out' });
});

// OTP endpoints (placeholders)
router.post('/otp/request', async (req, res) => {
  const { email } = req.body || {};
    if (!email) return sendError(res, 422, 'Email required');
  // Generate OTP and expiry
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.user.upsert({
    where: { email },
    update: { otpValue: otp, otpExpiresAt: expires },
    create: { email, username: email.split('@')[0], otpValue: otp, otpExpiresAt: expires },
  });
  // In a real app, send via email provider
  return res.json({ status: 'ok', message: 'OTP issued' });
});

router.post('/otp/verify', async (req, res) => {
  const { email, otp } = req.body || {};
    if (!email || !otp) return sendError(res, 422, 'Email and OTP required');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otpValue || !user.otpExpiresAt) {
    return res.status(401).json({ status: 'error', message: 'Invalid OTP' });
  }
  if (user.otpValue !== otp || user.otpExpiresAt < new Date()) {
    return res.status(401).json({ status: 'error', message: 'Invalid OTP' });
  }
  // Invalidate OTP
  await prisma.user.update({ where: { id: user.id }, data: { otpValue: null, otpExpiresAt: null } });
  const at = signAccessToken({ sub: user.id });
  const rt = signRefreshToken({ sub: user.id, tokenId: user.id });
  setRefreshCookie(res, rt);
  return res.json({ status: 'ok', data: { accessToken: at } });
});

export default router;
