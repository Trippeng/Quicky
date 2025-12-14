import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { hashPassword, verifyPassword } from './crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens';
import { env } from '../../config/env';

const router = Router();

// Helper to set refresh cookie
function setRefreshCookie(res: any, token: string) {
  res.cookie('rt', token, {
    httpOnly: true,
    secure: false, // set true in production with HTTPS
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(422).json({ status: 'error', message: 'Email and password required' });
  }
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

router.post('/refresh', async (req, res) => {
  const cookie = req.cookies?.rt;
  if (!cookie) {
    return res.status(401).json({ status: 'error', message: 'Missing refresh token' });
  }
  try {
    const payload = verifyRefreshToken(cookie);
    const at = signAccessToken({ sub: payload.sub });
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
  if (!email) return res.status(422).json({ status: 'error', message: 'Email required' });
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
  if (!email || !otp) return res.status(422).json({ status: 'error', message: 'Email and OTP required' });
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
