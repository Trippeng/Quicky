import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { OrgRole } from '@prisma/client';

const router = Router();

// Create organization; creator becomes OWNER
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || name.length < 2) {
    return res.status(422).json({ status: 'error', message: 'Invalid name' });
  }
  const org = await prisma.organization.create({
    data: { name, ownerId: req.user!.id },
  });
  await prisma.membership.create({
    data: { organizationId: org.id, userId: req.user!.id, role: OrgRole.OWNER },
  });
  return res.json({ status: 'ok', data: org });
});

// List my organizations
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const orgs = await prisma.organization.findMany({
    where: { memberships: { some: { userId: req.user!.id } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ status: 'ok', data: orgs });
});

// Get org by id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' });
  return res.json({ status: 'ok', data: org });
});

// Members list
router.get('/:id/members', requireAuth, async (req: AuthRequest, res) => {
  const members = await prisma.membership.findMany({
    where: { organizationId: req.params.id },
    include: { user: { select: { id: true, email: true, username: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ status: 'ok', data: members });
});

// Add a member by email with role (OWNER or ADMIN required)
router.post('/:id/members', requireAuth, requireRole([OrgRole.OWNER, OrgRole.ADMIN]), async (req: AuthRequest, res) => {
  const orgId = req.params.id;
  const { email, role } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(422).json({ status: 'error', message: 'Invalid email' });
  }
  if (!Object.values(OrgRole).includes(role)) {
    return res.status(422).json({ status: 'error', message: 'Invalid role' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }
  const existing = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: user.id } });
  if (existing) {
    return res.status(409).json({ status: 'error', message: 'User already a member' });
  }
  const membership = await prisma.membership.create({
    data: { organizationId: orgId, userId: user.id, role },
  });
  return res.status(201).json({ status: 'ok', data: membership });
});

// Update member role (OWNER or ADMIN required)
router.patch('/:orgId/members/:memberId', requireAuth, requireRole([OrgRole.OWNER, OrgRole.ADMIN]), async (req: AuthRequest, res) => {
  const { role } = req.body || {};
  if (!Object.values(OrgRole).includes(role)) {
    return res.status(422).json({ status: 'error', message: 'Invalid role' });
  }
  // Prevent changing the OWNER's role
  const target = await prisma.membership.findUnique({ where: { id: req.params.memberId } });
  if (!target) {
    return res.status(404).json({ status: 'error', message: 'Membership not found' });
  }
  if (target.role === OrgRole.OWNER) {
    return res.status(403).json({ status: 'error', message: 'Cannot modify OWNER role' });
  }
  const updated = await prisma.membership.update({
    where: { id: req.params.memberId },
    data: { role },
  });
  return res.json({ status: 'ok', data: updated });
});

export default router;
