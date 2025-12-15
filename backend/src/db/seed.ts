import { prisma } from './prisma';
import { hashPassword } from '../modules/auth/crypto';
import { OrgRole, TaskStatus } from '@prisma/client';

async function main() {
  // Demo user
  const email = 'demo@example.com';
  const password = 'Demo1234';
  const username = 'demo';
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { username, passwordHash },
    create: { email, username, passwordHash },
  });

  // Second user for RBAC testing
  const email2 = 'user2@example.com';
  const password2 = 'User2Pass!';
  const username2 = 'user2';
  const passwordHash2 = await hashPassword(password2);

  await prisma.user.upsert({
    where: { email: email2 },
    update: { username: username2, passwordHash: passwordHash2 },
    create: { email: email2, username: username2, passwordHash: passwordHash2 },
  });

  // Organization & membership for demo
  let org = await prisma.organization.findFirst({ where: { ownerId: (await prisma.user.findUnique({ where: { email } }))!.id } });
  const demoUser = await prisma.user.findUnique({ where: { email } });
  const user2 = await prisma.user.findUnique({ where: { email: email2 } });
  if (!demoUser || !user2) throw new Error('Users not seeded correctly');
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Demo Org', ownerId: demoUser.id } });
    await prisma.membership.create({ data: { userId: demoUser.id, organizationId: org.id, role: OrgRole.OWNER } });
    await prisma.membership.create({ data: { userId: user2.id, organizationId: org.id, role: OrgRole.MEMBER } });
  }

  // Team
  let team = await prisma.team.findFirst({ where: { organizationId: org.id } });
  if (!team) {
    team = await prisma.team.create({ data: { name: 'Alpha Team', organizationId: org.id } });
  }

  // List
  let list = await prisma.taskList.findFirst({ where: { teamId: team.id } });
  if (!list) {
    list = await prisma.taskList.create({ data: { name: 'Backlog', teamId: team.id } });
  }

  // Task
  let task = await prisma.task.findFirst({ where: { taskListId: list.id } });
  if (!task) {
    task = await prisma.task.create({ data: { title: 'Demo Task', description: 'Seeded task', taskListId: list.id, status: TaskStatus.REQUIRES_ATTENTION, ownerId: demoUser.id } });
  }

  // Messages
  const messages = await prisma.taskMessage.findMany({ where: { taskId: task.id } });
  if (messages.length < 2) {
    await prisma.taskMessage.create({ data: { taskId: task.id, authorId: demoUser.id, body: 'Initial message' } });
    await prisma.taskMessage.create({ data: { taskId: task.id, authorId: demoUser.id, body: 'Follow-up' } });
  }

  console.log('Seed completed:', { org: org.name, team: team.name, list: list.name, task: task.title });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
