import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { OrgRole } from '@prisma/client';
import crypto from 'crypto';

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
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user!.id },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const data = memberships.map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role }))
  return res.json({ status: 'ok', data });
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

// Create an invite (OWNER or ADMIN required)
router.post('/:id/invites', requireAuth, requireRole([OrgRole.OWNER, OrgRole.ADMIN]), async (req: AuthRequest, res) => {
  const orgId = req.params.id;
  const days = typeof req.body?.days === 'number' && req.body.days > 0 ? Math.min(req.body.days, 30) : 14;
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({ data: { organizationId: orgId, token, expiresAt } });
  return res.status(201).json({ status: 'ok', data: invite });
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
// Org Settings endpoints
router.get('/:id/settings', requireAuth, async (req: AuthRequest, res) => {
  // Ensure requester is a member of the org
  const membership = await prisma.membership.findFirst({ where: { organizationId: req.params.id, userId: req.user!.id } })
  if (!membership) return res.status(403).json({ status: 'error', message: 'Forbidden' })
  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' })
  const settings = (org as any).settings || {}
  return res.json({ status: 'ok', data: settings })
});

router.patch('/:id/settings', requireAuth, requireRole([OrgRole.OWNER, OrgRole.ADMIN]), async (req: AuthRequest, res) => {
  const orgId = req.params.id
  const { hideTeams, hideLists } = req.body || {}
  if (typeof hideTeams !== 'boolean' && typeof hideLists !== 'boolean') {
    return res.status(422).json({ status: 'error', message: 'No valid settings provided' })
  }
  // Load current settings
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) return res.status(404).json({ status: 'error', message: 'Organization not found' })
  const current = ((org as any).settings || {}) as { hideTeams?: boolean; hideLists?: boolean }
  const next = { ...current }
  if (typeof hideTeams === 'boolean') next.hideTeams = hideTeams
  if (typeof hideLists === 'boolean') next.hideLists = hideLists
  // Enforce constraints: if hiding teams, org must have at most one non-archived team
  if (next.hideTeams) {
    const count = await prisma.team.count({ where: { organizationId: orgId, archived: false } })
    if (count > 1) return res.status(409).json({ status: 'error', message: 'Cannot hide Teams: more than one team exists.' })
  }
  // If hiding lists, each team must have at most one non-archived list
  if (next.hideLists) {
    const teams = await prisma.team.findMany({ where: { organizationId: orgId, archived: false }, select: { id: true } })
    for (const t of teams) {
      const listCount = await prisma.taskList.count({ where: { teamId: t.id, archived: false } })
      if (listCount > 1) return res.status(409).json({ status: 'error', message: 'Cannot hide Task Lists: a team has more than one list.' })
    }
  }
  const updated = await prisma.organization.update({ where: { id: orgId }, data: { settings: next as any } })
  return res.json({ status: 'ok', data: (updated as any).settings || {} })
});

export default router;
