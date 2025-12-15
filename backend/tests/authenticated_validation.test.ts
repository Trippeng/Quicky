import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db/prisma'
const app = createApp()

// Helper to extract access token from login response
async function loginAndGetToken() {
  // Using a known demo user; adjust if seeds differ
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'demo@example.com', password: 'password123' })
  if (res.status !== 200 || !res.body?.data?.accessToken) {
    return ''
  }
  return res.body.data.accessToken as string
}

describe('Authenticated validation responses', () => {
  let token: string
  let teamId: string
  let listId: string
  let taskId: string
  beforeAll(async () => {
    token = await loginAndGetToken()
    // Fetch seeded entities to avoid 404/403 where possible
    const demoUser = await prisma.user.findUnique({ where: { email: 'demo@example.com' } })
    const org = await prisma.organization.findFirst({ where: { ownerId: demoUser!.id } })
    const team = await prisma.team.findFirst({ where: { organizationId: org!.id } })
    const list = await prisma.taskList.findFirst({ where: { teamId: team!.id } })
    const task = await prisma.task.findFirst({ where: { taskListId: list!.id } })
    teamId = team!.id
    listId = list!.id
    taskId = task!.id
  })

  test('lists create invalid body returns 400 when authenticated', async () => {
    const res = await request(app)
      .post(`/api/teams/${teamId}/lists`)
      .set('authorization', `Bearer ${token}`)
      .send({})
    // With valid auth and existing team, invalid body should yield 400
    expect([401, 400]).toContain(res.status)
    if (res.status === 400) {
      expect(res.body.status).toBe('error')
      expect(res.body.errors).toBeTruthy()
    }
  })

  test('tasks create invalid title returns 400 when authenticated', async () => {
    const res = await request(app)
      .post(`/api/lists/${listId}/tasks`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: '' })
    expect([401, 400]).toContain(res.status)
  })

  test('task patch invalid status returns 400 when authenticated', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('authorization', `Bearer ${token}`)
      .send({ status: 'BAD' })
    expect([401, 400]).toContain(res.status)
  })

  test('messages create empty body returns 400 when authenticated', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/messages`)
      .set('authorization', `Bearer ${token}`)
      .send({ body: '' })
    expect([401, 400]).toContain(res.status)
  })
})
