import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const router = Router();

function parseLimit(q: any, def = 20, max = 100) {
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return Math.min(n, max);
  return def;
}

async function getTaskWithOrg(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId }, include: { taskList: { include: { team: true } } } });
}

async function ensureMember(orgId: string, userId: string) {
  const member = await prisma.membership.findFirst({ where: { organizationId: orgId, userId } });
  return !!member;
}

// Post a message to a task (org members)
router.post('/tasks/:taskId/messages', requireAuth, async (req: AuthRequest, res) => {
  const task = await getTaskWithOrg(req.params.taskId);
  if (!task) return res.status(404).json({ status: 'error', message: 'Task not found' });
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  const { body } = req.body || {};
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(422).json({ status: 'error', message: 'Invalid body' });
  }
  const msg = await prisma.taskMessage.create({ data: { taskId: task.id, authorId: req.user!.id, body } });
  return res.status(201).json({ status: 'ok', data: msg });
});

// List messages for a task (org members), chronological order with cursor pagination
router.get('/tasks/:taskId/messages', requireAuth, async (req: AuthRequest, res) => {
  const task = await getTaskWithOrg(req.params.taskId);
  if (!task) return res.status(404).json({ status: 'error', message: 'Task not found' });
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return res.status(403).json({ status: 'error', message: 'Forbidden' });
  }
  const limit = parseLimit(req.query.limit);
  const cursorId = typeof req.query.cursor === 'string' ? (req.query.cursor as string) : undefined;
  const query: any = {
    where: { taskId: task.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: limit,
  };
  if (cursorId) {
    query.cursor = { id: cursorId };
    query.skip = 1;
  }
  const items = await prisma.taskMessage.findMany(query);
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return res.json({ status: 'ok', data: items, meta: { nextCursor, limit } });
});

export default router;
