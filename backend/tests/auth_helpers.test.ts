import { hashPassword, verifyPassword } from '../src/modules/auth/crypto';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../src/modules/auth/tokens';

describe('auth helpers', () => {
  it('hashes and verifies password', async () => {
    const plain = 'secret123';
    const hash = await hashPassword(plain);
    expect(hash).toBeTruthy();
    const ok = await verifyPassword(plain, hash);
    expect(ok).toBe(true);
    const bad = await verifyPassword('wrong', hash);
    expect(bad).toBe(false);
  });

  it('signs and verifies access token', () => {
    const token = signAccessToken({ sub: 'user_1', orgId: 'org_1', roles: ['ADMIN'] }, '1h');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.orgId).toBe('org_1');
    expect(payload.roles).toContain('ADMIN');
  });

  it('signs and verifies refresh token', () => {
    const token = signRefreshToken({ sub: 'user_2', tokenId: 'rotation_1' }, '7d');
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('user_2');
    expect(payload.tokenId).toBe('rotation_1');
  });
});
