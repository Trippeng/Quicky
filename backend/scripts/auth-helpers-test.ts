const { hashPassword, verifyPassword } = require('./../src/modules/auth/crypto');
const { signAccessToken, verifyAccessToken } = require('./../src/modules/auth/tokens');

async function main() {
  const plain = 'Demo1234';
  const hash = await hashPassword(plain);
  const okTrue = await verifyPassword(plain, hash);
  const okFalse = await verifyPassword('Wrong1234', hash);
  console.log('bcrypt okTrue:', okTrue, 'okFalse:', okFalse);

  const at = signAccessToken({ sub: 'user-123', orgId: 'org-1', roles: ['MEMBER'] }, '1h');
  const payload = verifyAccessToken(at);
  console.log('jwt payload:', payload);
}

main().catch((e: any) => {
  console.error('auth helpers test error:', e);
  process.exit(1);
});
