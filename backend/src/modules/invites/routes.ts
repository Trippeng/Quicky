import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

// Accept an invite by token; creates MEMBER membership if not already a member
router.post('/accept', requireAuth, async (req: AuthRequest, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(422).json({ status: 'error', message: 'Invalid token' });
  }
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) {
    return res.status(404).json({ status: 'error', message: 'Invite not found' });
  }
  if (invite.usedAt) {
    return res.status(410).json({ status: 'error', message: 'Invite already used' });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return res.status(410).json({ status: 'error', message: 'Invite expired' });
  }
  const existing = await prisma.membership.findFirst({ where: { organizationId: invite.organizationId, userId: req.user!.id } });
  if (existing) {
    return res.status(409).json({ status: 'error', message: 'Already a member' });
  }
  const membership = await prisma.membership.create({
    data: { organizationId: invite.organizationId, userId: req.user!.id },
  });
  await prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
  return res.json({ status: 'ok', data: membership });
});

export default router;
