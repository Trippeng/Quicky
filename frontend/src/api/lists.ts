import { apiGetJson } from './client'

export type TaskList = { id: string; name: string; teamId: string }
export type ListsResponse = { status: 'ok' | 'error'; data?: TaskList[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listLists(teamId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<ListsResponse>(`/api/teams/${teamId}/lists?${qs.toString()}`)
}
