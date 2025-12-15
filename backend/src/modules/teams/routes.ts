import { Router } from 'express';
import { z } from 'zod';
import { sendZodError, sendError } from '../../utils/http';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import { OrgRole } from '@prisma/client';

const router = Router();

function parseLimit(q: any, def = 20, max = 50) {
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return Math.min(n, max);
  return def;
}

// Create team in an org (OWNER or ADMIN required)
const createTeamSchema = z.object({ name: z.string().min(2) });
router.post('/orgs/:orgId/teams', requireAuth, requireRole([OrgRole.OWNER, OrgRole.ADMIN]), async (req: AuthRequest, res) => {
  const parsed = createTeamSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const { name } = parsed.data;
  const org = await prisma.organization.findUnique({ where: { id: req.params.orgId } });
  if (!org) return sendError(res, 404, 'Organization not found');
  const team = await prisma.team.create({ data: { name, organizationId: org.id } });
  return res.status(201).json({ status: 'ok', data: team });
});

// List teams for an org (must be a member); cursor pagination
router.get('/orgs/:orgId/teams', requireAuth, async (req: AuthRequest, res) => {
  const orgId = req.params.orgId;
  const member = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: req.user!.id } });
  if (!member) return sendError(res, 403, 'Forbidden');
  const limit = parseLimit(req.query.limit);
  const cursorId = typeof req.query.cursor === 'string' ? (req.query.cursor as string) : undefined;
  const query: any = {
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  };
  if (cursorId) {
    query.cursor = { id: cursorId };
    query.skip = 1;
  }
  const items = await prisma.team.findMany(query);
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return res.json({ status: 'ok', data: items, meta: { nextCursor, limit } });
});

export default router;
