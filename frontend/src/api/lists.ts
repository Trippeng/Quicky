import { apiFetchJson, apiGetJson, apiPostJson } from './client'

export type TaskList = { id: string; name: string; teamId: string; archived?: boolean }
export type ListsResponse = { status: 'ok' | 'error'; data?: TaskList[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listLists(teamId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<ListsResponse>(`/api/teams/${teamId}/lists?${qs.toString()}`)
}

export type ListCreateRequest = { name: string }
export type ListCreateResponse = { status: 'ok' | 'error'; data?: TaskList; message?: string }

export async function createList(teamId: string, payload: ListCreateRequest) {
  if (!payload.name || payload.name.trim().length < 2) {
    return { status: 'error', message: 'List name must be at least 2 characters' } as ListCreateResponse
  }
  return apiPostJson<ListCreateResponse>(`/api/teams/${teamId}/lists`, payload)
}

export type ListPatchRequest = { name?: string; archived?: boolean }
export type ListPatchResponse = { status: 'ok' | 'error'; data?: TaskList; message?: string }

export async function patchList(listId: string, payload: ListPatchRequest) {
  return apiFetchJson<ListPatchResponse>(`/api/lists/${listId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export type ListDeleteResponse = { status: 'ok' | 'error'; data?: { id: string }; message?: string }

export async function deleteList(listId: string) {
  return apiFetchJson<ListDeleteResponse>(`/api/lists/${listId}`, { method: 'DELETE' })
}
