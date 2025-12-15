import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

describe('Auth routes', () => {
  test('login invalid payload returns 400 with errors', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.status).toBe('error')
    expect(res.body.errors).toBeTruthy()
  })

  test('refresh rate limit headers present', async () => {
    const res = await request(app).post('/api/auth/refresh')
    expect(res.headers['ratelimit-policy']).toBeTruthy()
    expect(res.headers['ratelimit-limit']).toBeTruthy()
  })
})
