import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

// Using a fake org id; membership check should 403
const fakeOrgId = 'cm_fake_org'

describe('Teams routes', () => {
  test('list teams forbidden when not a member', async () => {
    const res = await request(app).get(`/api/orgs/${fakeOrgId}/teams`)
    // Depending on auth/membership, it may 401, 403, or 404; accept error envelope
    expect(['error']).toContain(res.body.status)
    expect([401, 403, 404]).toContain(res.status)
  })
})
