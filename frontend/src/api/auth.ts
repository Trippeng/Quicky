import { apiFetch, setAccessToken } from './client'

type LoginResponse = { status: 'ok' | 'error'; data?: { accessToken: string }; message?: string }
type CheckEmailResponse = { status: 'ok' | 'error'; data?: { exists: boolean }; message?: string }
type SimpleOk = { status: 'ok' | 'error'; message?: string; data?: any }

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

export async function signup(email: string, password: string): Promise<LoginResponse> {
  const resp = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const json = (await resp.json()) as LoginResponse
  if (json.status === 'ok' && json.data?.accessToken) {
    setAccessToken(json.data.accessToken)
  }
  return json
}

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
  const resp = await apiFetch('/api/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return (await resp.json()) as CheckEmailResponse
}

export async function requestOtp(email: string): Promise<SimpleOk> {
  const resp = await apiFetch('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return (await resp.json()) as SimpleOk
}

export async function verifyOtp(email: string, otp: string): Promise<LoginResponse> {
  const resp = await apiFetch('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
  const json = (await resp.json()) as LoginResponse
  if (json.status === 'ok' && json.data?.accessToken) {
    setAccessToken(json.data.accessToken)
  }
  return json
}
