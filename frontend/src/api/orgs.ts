import { apiFetch, apiGetJson } from './client'

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type Org = { id: string; name: string; role: OrgRole }
export type OrgsResponse = { status: 'ok' | 'error'; data?: Org[]; message?: string }
export type CreateOrgResponse = { status: 'ok' | 'error'; data?: Org; message?: string }
export type OrgSettings = { hideTeams?: boolean; hideLists?: boolean }
export type OrgSettingsResponse = { status: 'ok' | 'error'; data?: OrgSettings; message?: string }

export async function listOrgs(): Promise<OrgsResponse> {
  return apiGetJson<OrgsResponse>('/api/orgs')
}

export async function createOrg(name: string): Promise<CreateOrgResponse> {
  const resp = await apiFetch('/api/orgs', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return (await resp.json()) as CreateOrgResponse
}

export async function getOrgSettings(orgId: string): Promise<OrgSettingsResponse> {
  return apiGetJson<OrgSettingsResponse>(`/api/orgs/${orgId}/settings`)
}

export async function patchOrgSettings(orgId: string, settings: OrgSettings): Promise<OrgSettingsResponse> {
  const resp = await apiFetch(`/api/orgs/${orgId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
  return (await resp.json()) as OrgSettingsResponse
}
