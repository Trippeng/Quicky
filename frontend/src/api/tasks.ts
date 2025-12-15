import { apiGetJson, apiPostJson } from './client'

export type Task = { id: string; title: string; status: string; taskListId: string }
export type TasksResponse = { status: 'ok' | 'error'; data?: Task[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listTasks(listId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<TasksResponse>(`/api/lists/${listId}/tasks?${qs.toString()}`)
}

export type TaskCreateRequest = { title: string; status?: string }
export type TaskCreateResponse = { status: 'ok' | 'error'; data?: Task; message?: string }

export async function createTask(listId: string, payload: TaskCreateRequest) {
  if (!payload.title || payload.title.trim().length < 2) {
    return { status: 'error', message: 'Task title must be at least 2 characters' } as TaskCreateResponse
  }
  const body = { title: payload.title, status: payload.status ?? 'open' }
  return apiPostJson<TaskCreateResponse>(`/api/lists/${listId}/tasks`, body)
}
