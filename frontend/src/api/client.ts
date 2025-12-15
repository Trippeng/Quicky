let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export async function refreshSession(): Promise<boolean> {
  try {
    const resp = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!resp.ok) return false
    const json = await resp.json()
    const token = json?.data?.accessToken as string | undefined
    if (token) {
      setAccessToken(token)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function apiFetch(input: string, init: RequestInit = {}, retry = true) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (init.headers) {
    if (init.headers instanceof Headers) {
      for (const [k, v] of init.headers.entries()) headers[k] = String(v)
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers as Array<[string, string]>) headers[k] = String(v)
    } else {
      Object.assign(headers, init.headers as Record<string, string>)
    }
  }
  if (accessToken && !('Authorization' in headers)) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const resp = await fetch(input, { ...init, headers, credentials: 'include' })
  if (resp.status === 401 && retry) {
    const ok = await refreshSession()
    if (ok) return apiFetch(input, init, false)
  }
  return resp
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const resp = await apiFetch(path)
  const json = await resp.json()
  return json as T
}

export async function apiPostJson<T>(path: string, body: any): Promise<T> {
  const resp = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
  const json = await resp.json()
  return json as T
}
