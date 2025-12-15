import { apiGetJson } from './client'

export type Task = { id: string; title: string; status: string; taskListId: string }
export type TasksResponse = { status: 'ok' | 'error'; data?: Task[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listTasks(listId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<TasksResponse>(`/api/lists/${listId}/tasks?${qs.toString()}`)
}
