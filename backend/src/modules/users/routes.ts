import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const id = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, createdAt: true, updatedAt: true },
  });
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
  return res.json({ status: 'ok', data: user });
});

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const id = req.user!.id;
  const { username } = req.body || {};
  if (username && (typeof username !== 'string' || username.length < 2)) {
    return res.status(422).json({ status: 'error', message: 'Invalid username' });
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { username: username ?? undefined },
    select: { id: true, email: true, username: true, createdAt: true, updatedAt: true },
  });
  return res.json({ status: 'ok', data: updated });
});

export default router;
