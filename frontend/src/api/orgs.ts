import { apiFetch, apiGetJson } from './client'

export type Org = { id: string; name: string }
export type OrgsResponse = { status: 'ok' | 'error'; data?: Org[]; message?: string }
export type CreateOrgResponse = { status: 'ok' | 'error'; data?: Org; message?: string }

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
