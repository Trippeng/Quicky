import { Router } from 'express';
import { z } from 'zod';
import { sendZodError, sendError } from '../../utils/http';
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
const createMessageSchema = z.object({ body: z.string().min(1) });
router.post('/tasks/:taskId/messages', requireAuth, async (req: AuthRequest, res) => {
  const task = await getTaskWithOrg(req.params.taskId);
  if (!task) return sendError(res, 404, 'Task not found');
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
  }
  const parsed = createMessageSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendZodError(res, parsed);
  }
  const { body } = parsed.data;
  const msg = await prisma.taskMessage.create({ data: { taskId: task.id, authorId: req.user!.id, body } });
  return res.status(201).json({ status: 'ok', data: msg });
});

// List messages for a task (org members), chronological order with cursor pagination
router.get('/tasks/:taskId/messages', requireAuth, async (req: AuthRequest, res) => {
  const task = await getTaskWithOrg(req.params.taskId);
  if (!task) return sendError(res, 404, 'Task not found');
  const orgId = task.taskList.team.organizationId;
  if (!(await ensureMember(orgId, req.user!.id))) {
    return sendError(res, 403, 'Forbidden');
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
