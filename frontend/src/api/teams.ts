import { apiFetch, apiFetchJson, apiGetJson, apiPostJson } from './client'

export type Team = { id: string; name: string; organizationId: string; archived?: boolean }
export type TeamsResponse = { status: 'ok' | 'error'; data?: Team[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listTeams(orgId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<TeamsResponse>(`/api/orgs/${orgId}/teams?${qs.toString()}`)
}

export type TeamCreateRequest = { name: string }
export type TeamCreateResponse = { status: 'ok' | 'error'; data?: Team; message?: string }

export async function createTeam(orgId: string, payload: TeamCreateRequest) {
  if (!payload.name || payload.name.trim().length < 2) {
    return { status: 'error', message: 'Team name must be at least 2 characters' } as TeamCreateResponse
  }
  return apiPostJson<TeamCreateResponse>(`/api/orgs/${orgId}/teams`, payload)
}

export type TeamPatchRequest = { name?: string; archived?: boolean }
export type TeamPatchResponse = { status: 'ok' | 'error'; data?: Team; message?: string }

export async function patchTeam(teamId: string, payload: TeamPatchRequest) {
  return apiFetchJson<TeamPatchResponse>(`/api/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export type TeamDeleteResponse = { status: 'ok' | 'error'; data?: { id: string }; message?: string }

export async function deleteTeam(teamId: string) {
  return apiFetchJson<TeamDeleteResponse>(`/api/teams/${teamId}`, { method: 'DELETE' })
}
