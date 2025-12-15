import { apiFetch } from './client'

export type AcceptInviteResponse = { status: 'ok' | 'error'; data?: { organizationId: string }; message?: string }

export async function acceptInvite(token: string): Promise<AcceptInviteResponse> {
  const resp = await apiFetch('/api/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  return (await resp.json()) as AcceptInviteResponse
}
