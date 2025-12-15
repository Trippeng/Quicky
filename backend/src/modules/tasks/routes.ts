import { Router } from 'express';
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
router.post('/lists/:listId/tasks', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, ownerId } = req.body || {};
  if (!title || typeof title !== 'string' || title.length < 1) {
    return res.status(422).json({ status: 'error', message: 'Invalid title' });
  }
  const list = await getListWithOrg(req.params.listId);
  if (!list) return res.status(404).json({ status: 'error', message: 'List not found' });
  const orgId = list.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  const data: any = { title, description, taskListId: list.id };
  if (ownerId && typeof ownerId === 'string') data.ownerId = ownerId;
  const task = await prisma.task.create({ data });
  return res.status(201).json({ status: 'ok', data: task });
});

// List tasks in list (org members) with filters and cursor pagination
router.get('/lists/:listId/tasks', requireAuth, async (req: AuthRequest, res) => {
  const list = await getListWithOrg(req.params.listId);
  if (!list) return res.status(404).json({ status: 'error', message: 'List not found' });
  const orgId = list.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  const where: any = { taskListId: list.id };
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
  if (!task) return res.status(404).json({ status: 'error', message: 'Task not found' });
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  // Strip nested to keep envelope small
  const { taskList, ...rest } = task as any;
  return res.json({ status: 'ok', data: rest });
});

// Patch task (org members) — allow updates to title, description, status, ownerId
router.patch('/tasks/:taskId', requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { taskList: { include: { team: true } } } });
  if (!existing) return res.status(404).json({ status: 'error', message: 'Task not found' });
  const orgId = existing.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  const { title, description, status, ownerId } = req.body || {};
  const data: any = {};
  if (title != null) {
    if (typeof title !== 'string' || title.length < 1) return res.status(422).json({ status: 'error', message: 'Invalid title' });
    data.title = title;
  }
  if (description != null) {
    if (typeof description !== 'string') return res.status(422).json({ status: 'error', message: 'Invalid description' });
    data.description = description;
  }
  if (status != null) {
    if (!Object.values(TaskStatus).includes(status)) return res.status(422).json({ status: 'error', message: 'Invalid status' });
    data.status = status;
  }
  if (ownerId != null) {
    if (ownerId !== null && typeof ownerId !== 'string') return res.status(422).json({ status: 'error', message: 'Invalid ownerId' });
    data.ownerId = ownerId;
  }
  const updated = await prisma.task.update({ where: { id: existing.id }, data });
  return res.json({ status: 'ok', data: updated });
});

export default router;
