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
    where: { organizationId: orgId, archived: false },
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

// Patch team (OWNER or ADMIN required)
const patchTeamSchema = z.object({
  name: z.string().min(2).optional(),
  archived: z.boolean().optional(),
});

router.patch('/teams/:teamId', requireAuth, async (req: AuthRequest, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) return sendError(res, 404, 'Team not found');

  // Check membership + role in the team's organization
  const membership = await prisma.membership.findFirst({ where: { organizationId: team.organizationId, userId: req.user!.id } });
  if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
    return sendError(res, 403, 'Forbidden');
  }

  const parsed = patchTeamSchema.safeParse(req.body || {});
  if (!parsed.success) return sendZodError(res, parsed);

  const data: any = {};
  if (typeof parsed.data.name === 'string') data.name = parsed.data.name;
  if (typeof parsed.data.archived === 'boolean') data.archived = parsed.data.archived;

  const updated = await prisma.team.update({ where: { id: team.id }, data });
  return res.json({ status: 'ok', data: updated });
});

// Delete team (OWNER or ADMIN required). Cascades to lists and tasks.
router.delete('/teams/:teamId', requireAuth, async (req: AuthRequest, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) return sendError(res, 404, 'Team not found');
  const membership = await prisma.membership.findFirst({ where: { organizationId: team.organizationId, userId: req.user!.id } });
  if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
    return sendError(res, 403, 'Forbidden');
  }
  await prisma.$transaction(async (tx) => {
    const lists = await tx.taskList.findMany({ where: { teamId: team.id } });
    for (const l of lists) {
      await tx.task.deleteMany({ where: { taskListId: l.id } });
    }
    await tx.taskList.deleteMany({ where: { teamId: team.id } });
    await tx.team.delete({ where: { id: team.id } });
  });
  return res.json({ status: 'ok', data: { id: team.id } });
});

export default router;
