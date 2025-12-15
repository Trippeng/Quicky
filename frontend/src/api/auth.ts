import { apiFetch, setAccessToken } from './client'

type LoginResponse = { status: 'ok' | 'error'; data?: { accessToken: string }; message?: string }

export async function login(email: string, password: string): Promise<LoginResponse> {
  const resp = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const json = (await resp.json()) as LoginResponse
  if (json.status === 'ok' && json.data?.accessToken) {
    setAccessToken(json.data.accessToken)
  }
  return json
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
  setAccessToken(null)
}
