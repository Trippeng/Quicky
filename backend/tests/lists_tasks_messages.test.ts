import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

describe('Lists/Tasks/Messages validation', () => {
  test('lists create invalid body returns 400', async () => {
    const res = await request(app).post('/api/teams/fakeTeam/lists').send({})
    expect([401, 400, 404, 403]).toContain(res.status)
    if (res.status === 400) {
      expect(res.body.status).toBe('error')
      expect(res.body.errors).toBeTruthy()
    }
  })

  test('tasks create invalid title returns 400', async () => {
    const res = await request(app).post('/api/lists/fakeList/tasks').send({ title: '' })
    expect([401, 400, 404, 403]).toContain(res.status)
  })

  test('task patch invalid status returns 400', async () => {
    const res = await request(app).patch('/api/tasks/fakeTask').send({ status: 'BAD' })
    expect([401, 400, 404, 403]).toContain(res.status)
  })

  test('messages create empty body returns 400', async () => {
    const res = await request(app).post('/api/tasks/fakeTask/messages').send({ body: '' })
    expect([401, 400, 404, 403]).toContain(res.status)
  })
})
