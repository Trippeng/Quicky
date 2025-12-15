import { apiGetJson } from './client'

export type Team = { id: string; name: string; organizationId: string }
export type TeamsResponse = { status: 'ok' | 'error'; data?: Team[]; meta?: { nextCursor?: string | null }; message?: string }

export async function listTeams(orgId: string, limit = 20, cursor?: string) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (cursor) qs.set('cursor', cursor)
  return apiGetJson<TeamsResponse>(`/api/orgs/${orgId}/teams?${qs.toString()}`)
}
