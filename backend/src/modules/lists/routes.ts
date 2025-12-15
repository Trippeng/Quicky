import { Router } from 'express';
import { z } from 'zod';
import { sendZodError, sendError } from '../../utils/http';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { OrgRole } from '@prisma/client';

const router = Router();

function parseLimit(q: any, def = 20, max = 50) {
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return Math.min(n, max);
  return def;
}

async function getTeamWithOrg(teamId: string) {
  return prisma.team.findUnique({ where: { id: teamId }, include: { organization: true } });
}

// Create list in a team (OWNER or ADMIN in the team's org)
const createListSchema = z.object({ name: z.string().min(2) });
router.post('/teams/:teamId/lists', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createListSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const { name } = parsed.data;
  const team = await getTeamWithOrg(req.params.teamId);
  if (!team) return sendError(res, 404, 'Team not found');
  const membership = await prisma.membership.findFirst({ where: { organizationId: team.organizationId, userId: req.user!.id } });
  if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
    return sendError(res, 403, 'Forbidden');
  }
  const list = await prisma.taskList.create({ data: { name, teamId: team.id } });
  return res.status(201).json({ status: 'ok', data: list });
});

// List task lists for a team (must be a member of the org); cursor pagination
router.get('/teams/:teamId/lists', requireAuth, async (req: AuthRequest, res) => {
  const team = await getTeamWithOrg(req.params.teamId);
  if (!team) return sendError(res, 404, 'Team not found');
  const membership = await prisma.membership.findFirst({ where: { organizationId: team.organizationId, userId: req.user!.id } });
  if (!membership) return sendError(res, 403, 'Forbidden');
  const limit = parseLimit(req.query.limit);
  const cursorId = typeof req.query.cursor === 'string' ? (req.query.cursor as string) : undefined;
  const query: any = {
    where: { teamId: team.id, archived: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  };
  if (cursorId) {
    query.cursor = { id: cursorId };
    query.skip = 1;
  }
  const items = await prisma.taskList.findMany(query);
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return res.json({ status: 'ok', data: items, meta: { nextCursor, limit } });
});

// Patch list (OWNER or ADMIN in org required)
const patchListSchema = z.object({ name: z.string().min(2).optional(), archived: z.boolean().optional() });
router.patch('/lists/:listId', requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.taskList.findUnique({ where: { id: req.params.listId }, include: { team: true } });
  if (!list) return sendError(res, 404, 'List not found');
  const orgId = list.team.organizationId;
  const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: req.user!.id } });
  if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
    return sendError(res, 403, 'Forbidden');
  }
  const parsed = patchListSchema.safeParse(req.body || {});
  if (!parsed.success) return sendZodError(res, parsed);
  const data: any = {};
  if (typeof parsed.data.name === 'string') data.name = parsed.data.name;
  if (typeof parsed.data.archived === 'boolean') data.archived = parsed.data.archived;
  const updated = await prisma.taskList.update({ where: { id: list.id }, data });
  return res.json({ status: 'ok', data: updated });
});

// Delete list (OWNER or ADMIN in org required). Cascades to tasks.
router.delete('/lists/:listId', requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.taskList.findUnique({ where: { id: req.params.listId }, include: { team: true } });
  if (!list) return sendError(res, 404, 'List not found');
  const orgId = list.team.organizationId;
  const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: req.user!.id } });
  if (!membership || (membership.role !== OrgRole.OWNER && membership.role !== OrgRole.ADMIN)) {
    return sendError(res, 403, 'Forbidden');
  }
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({ where: { taskListId: list.id } });
    await tx.taskList.delete({ where: { id: list.id } });
  });
  return res.json({ status: 'ok', data: { id: list.id } });
});

export default router;
