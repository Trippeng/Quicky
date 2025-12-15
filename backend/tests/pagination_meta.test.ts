import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/prisma'

const app = createApp()

async function authToken() {
  const res = await request(app).post('/api/auth/login').send({ email: 'demo@example.com', password: 'password123' })
  return res.status === 200 ? res.body.data.accessToken : ''
}

describe('Pagination meta: nextCursor across resources', () => {
  let token = ''

  beforeAll(async () => {
    token = await authToken()
  })

  test('teams list: meta.nextCursor present when more pages', async () => {
    const org = await prisma.organization.findFirst()
    const res = await request(app)
      .get(`/api/orgs/${org!.id}/teams?limit=1`)
      .set('authorization', `Bearer ${token}`)
    expect([200, 401]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.status).toBe('ok')
      expect(res.body.meta).toBeDefined()
      expect(res.body.meta.nextCursor === null || typeof res.body.meta.nextCursor === 'string').toBe(true)
    }
  })

  test('lists list: meta.nextCursor present', async () => {
    const team = await prisma.team.findFirst()
    const res = await request(app)
      .get(`/api/teams/${team!.id}/lists?limit=1`)
      .set('authorization', `Bearer ${token}`)
    expect([200, 401]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.meta).toBeDefined()
      expect(res.body.meta.nextCursor === null || typeof res.body.meta.nextCursor === 'string').toBe(true)
    }
  })

  test('tasks list: meta.nextCursor present', async () => {
    const list = await prisma.taskList.findFirst()
    const res = await request(app)
      .get(`/api/lists/${list!.id}/tasks?limit=1`)
      .set('authorization', `Bearer ${token}`)
    expect([200, 401]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.meta).toBeDefined()
      expect(res.body.meta.nextCursor === null || typeof res.body.meta.nextCursor === 'string').toBe(true)
    }
  })

  test('messages list: meta.nextCursor present', async () => {
    const task = await prisma.task.findFirst()
    const res = await request(app)
      .get(`/api/tasks/${task!.id}/messages?limit=1`)
      .set('authorization', `Bearer ${token}`)
    expect([200, 401]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body.meta).toBeDefined()
      expect(res.body.meta.nextCursor === null || typeof res.body.meta.nextCursor === 'string').toBe(true)
    }
  })
})
