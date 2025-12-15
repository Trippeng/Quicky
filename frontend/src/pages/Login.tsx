import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { login as apiLogin } from '@/api/auth'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useSession } from '@/state/session'

export default function Login() {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('Demo1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation() as any
  const { setToken } = useSession()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await apiLogin(email, password)
    if (res.status === 'ok' && res.data?.accessToken) {
      setToken(res.data.accessToken)
      const to = loc.state?.from?.pathname || '/org'
      navigate(to, { replace: true })
    } else {
      setError(res.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-sm">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full border rounded px-2 py-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <Button disabled={loading} type="submit">{loading ? 'Logging in…' : 'Login'}</Button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>
      <div className="mt-4 text-sm text-muted-foreground">
        Dev helpers: <Link className="underline" to="/dev/auth-test">Auth test</Link> · <Link className="underline" to="/health/db">DB health</Link>
      </div>
    </div>
  )
}
