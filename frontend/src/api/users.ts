import { apiGetJson } from './client'

export type MeResponse = { status: 'ok' | 'error'; data?: { id: string; email: string; username?: string }; message?: string }

export async function getMe() {
  return apiGetJson<MeResponse>('/api/users/me')
}