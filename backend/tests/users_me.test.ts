import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { signAccessToken } from '../src/modules/auth/tokens';

const app = createApp();

describe('users/me endpoints', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: 'me@example.com', username: 'me-user', passwordHash: null } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/users/me');
    expect([401,403]).toContain(res.status);
  });

  it('returns current user with auth', async () => {
    const at = signAccessToken({ sub: userId });
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${at}`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.email).toBe('me@example.com');
  });

  it('PATCH validates payload', async () => {
    const at = signAccessToken({ sub: userId });
    const bad = await request(app).patch('/api/users/me').set('Authorization', `Bearer ${at}`).send({ username: '' });
    expect([400,422]).toContain(bad.status);
  });

  it('PATCH updates username', async () => {
    const at = signAccessToken({ sub: userId });
    const res = await request(app).patch('/api/users/me').set('Authorization', `Bearer ${at}`).send({ username: 'updated-name' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.username).toBe('updated-name');
  });
});
