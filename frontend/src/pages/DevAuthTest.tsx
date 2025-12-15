import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { login } from '@/api/auth'
import { apiGetJson, setAccessToken } from '@/api/client'

export default function DevAuthTest() {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('Demo1234')
  const [log, setLog] = useState<string>('')

  function append(entry: any) {
    setLog((prev) => prev + '\n' + (typeof entry === 'string' ? entry : JSON.stringify(entry)))
  }

  async function doLogin() {
    append('Login...')
    const res = await login(email, password)
    append(res)
  }

  async function getMe() {
    append('GET /api/users/me')
    const res = await apiGetJson('/api/users/me')
    append(res)
  }

  async function force401ThenRetry() {
    append('Force 401 → refresh → retry /users/me')
    setAccessToken('invalid')
    const res = await apiGetJson('/api/users/me')
    append(res)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Dev Auth Test</h2>
      <div className="flex flex-col gap-2 max-w-sm">
        <input className="border rounded px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input className="border rounded px-2 py-1" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
      </div>
      <div className="flex gap-2">
        <Button onClick={doLogin}>Login</Button>
        <Button variant="secondary" onClick={getMe}>Me</Button>
        <Button variant="outline" onClick={force401ThenRetry}>Force 401 + Retry</Button>
      </div>
      <pre className="bg-muted/50 border rounded p-3 text-xs overflow-auto whitespace-pre-wrap">{log || 'No logs yet'}</pre>
    </div>
  )
}
