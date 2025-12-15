import { Router } from 'express';
import { z } from 'zod';
import { sendZodError, sendError } from '../../utils/http';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { OrgRole, TaskStatus } from '@prisma/client';

const router = Router();

function parseLimit(q: any, def = 20, max = 50) {
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return Math.min(n, max);
  return def;
}

async function getListWithOrg(listId: string) {
  return prisma.taskList.findUnique({
    where: { id: listId },
    include: { team: { select: { organizationId: true } } },
  });
}

async function ensureMember(orgId: string, userId: string) {
  const member = await prisma.membership.findFirst({ where: { organizationId: orgId, userId } });
  return !!member;
}

// Create task in list (org members)
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.string().optional(),
});
router.post('/lists/:listId/tasks', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const { title, description, ownerId } = parsed.data;
  const list = await getListWithOrg(req.params.listId);
  if (!list) return sendError(res, 404, 'List not found');
  const orgId = list.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  const data: any = { title, description, taskListId: list.id };
  if (ownerId) data.ownerId = ownerId;
  const task = await prisma.task.create({ data });
  return res.status(201).json({ status: 'ok', data: task });
});

// List tasks in list (org members) with filters and cursor pagination
router.get('/lists/:listId/tasks', requireAuth, async (req: AuthRequest, res) => {
  const list = await getListWithOrg(req.params.listId);
  if (!list) return sendError(res, 404, 'List not found');
  const orgId = list.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  const where: any = { taskListId: list.id, archived: false };
  if (typeof req.query.status === 'string' && Object.values(TaskStatus).includes(req.query.status as TaskStatus)) {
    where.status = req.query.status as TaskStatus;
  }
  if (typeof req.query.ownerId === 'string') {
    where.ownerId = req.query.ownerId as string;
  }
  const limit = parseLimit(req.query.limit);
  const cursorId = typeof req.query.cursor === 'string' ? (req.query.cursor as string) : undefined;
  const query: any = { where, orderBy: { createdAt: 'desc' }, take: limit };
  if (cursorId) { query.cursor = { id: cursorId }; query.skip = 1; }
  const items = await prisma.task.findMany(query);
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return res.json({ status: 'ok', data: items, meta: { nextCursor, limit } });
});

// Get task by id (org members)
router.get('/tasks/:taskId', requireAuth, async (req: AuthRequest, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { taskList: { include: { team: true } } } });
  if (!task) return sendError(res, 404, 'Task not found');
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  // Strip nested to keep envelope small
  const { taskList, ...rest } = task as any;
  return res.json({ status: 'ok', data: rest });
});

// Patch task (org members) — allow updates to title, description, status, ownerId
const patchTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  ownerId: z.string().nullable().optional(),
  archived: z.boolean().optional(),
});
router.patch('/tasks/:taskId', requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { taskList: { include: { team: true } } } });
  if (!existing) return sendError(res, 404, 'Task not found');
  const orgId = existing.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  const parsed = patchTaskSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const data = parsed.data as any;
  const updated = await prisma.task.update({ where: { id: existing.id }, data });
  return res.json({ status: 'ok', data: updated });
});

// Delete task (org members)
router.delete('/tasks/:taskId', requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { taskList: { include: { team: true } } } });
  if (!existing) return sendError(res, 404, 'Task not found');
  const orgId = existing.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  await prisma.task.delete({ where: { id: existing.id } });
  return res.json({ status: 'ok', data: { id: existing.id } });
});

export default router;
