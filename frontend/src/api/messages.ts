import { apiGetJson, apiPostJson } from './client'

export type TaskMessage = { id: string; authorId: string; body: string; createdAt: string; taskId: string }
export type MessagesResponse = { status: 'ok' | 'error'; data?: TaskMessage[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listMessages(taskId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<MessagesResponse>(`/api/tasks/${taskId}/messages?${qs.toString()}`)
}

export type MessageCreateResponse = { status: 'ok' | 'error'; data?: TaskMessage; message?: string }
export async function sendMessage(taskId: string, body: string) {
  if (!body || body.trim().length === 0) {
    return { status: 'error', message: 'Message cannot be empty' } as MessageCreateResponse
  }
  return apiPostJson<MessageCreateResponse>(`/api/tasks/${taskId}/messages`, { body: body.trim() })
}
