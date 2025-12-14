import { prisma } from './prisma';
import { hashPassword } from '../modules/auth/crypto';

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

  console.log('Seeded users:', [
    { email, password },
    { email: email2, password: password2 },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
