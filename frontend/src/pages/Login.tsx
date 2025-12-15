import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorAlert, InfoAlert } from '@/components/ui/alert'
import { login as apiLogin, signup as apiSignup, checkEmail, requestOtp, verifyOtp } from '@/api/auth'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useSession } from '@/state/session'

export default function Login() {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('Demo1234')
  const [otp, setOtp] = useState('')
  const [exists, setExists] = useState<boolean | null>(null)
  const [stage, setStage] = useState<'email' | 'auth'>('email')
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation() as any
  const { setToken, isAuthenticated, loading: sessionLoading } = useSession()

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      const to = loc.state?.from?.pathname || '/dashboard'
      navigate(to, { replace: true })
    }
  }, [isAuthenticated, sessionLoading])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setExists(null)
        return
      }
      const res = await checkEmail(email)
      if (!cancelled) setExists(res.status === 'ok' ? !!res.data?.exists : null)
    })()
    return () => { cancelled = true }
  }, [email])

  useEffect(() => {
    if (!otpSent) return
    setCooldown(60)
    const id = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(id)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [otpSent])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Basic client-side password validation to surface helpful messages
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }
    const res = exists ? await apiLogin(email, password) : await apiSignup(email, password)
    if (res.status === 'ok' && res.data?.accessToken) {
      setToken(res.data.accessToken)
      const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('lastOrgId') : null
      const defaultRoute = lastOrgId ? '/dashboard' : '/org'
      const to = loc.state?.from?.pathname || defaultRoute
      navigate(to, { replace: true })
    } else {
      setError(res.message || (exists ? 'Login failed' : 'Signup failed'))
    }
    setLoading(false)
  }

  async function onRequestOtp() {
    setLoading(true)
    setError(null)
    const res = await requestOtp(email)
    if (res.status !== 'ok') {
      setError(res.message || 'OTP request failed')
    } else {
      setOtpSent(true)
    }
    setLoading(false)
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await verifyOtp(email, otp)
    if (res.status === 'ok' && res.data?.accessToken) {
      setToken(res.data.accessToken)
      const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('lastOrgId') : null
      const defaultRoute = lastOrgId ? '/dashboard' : '/org'
      const to = loc.state?.from?.pathname || defaultRoute
      navigate(to, { replace: true })
    } else {
      setError(res.message || 'OTP verify failed')
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-sm">
      <h2 className="text-xl font-semibold mb-2">{stage === 'email' ? 'Log in or Sign up' : exists ? 'Log in' : 'Sign up'}</h2>
      {stage !== 'email' && <div className="text-xs text-muted-foreground mb-4">{email}</div>}

      {stage === 'email' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!validEmail) return
            if (exists === null) {
              const res = await checkEmail(email)
              setExists(res.status === 'ok' ? !!res.data?.exists : null)
            }
            setStage('auth')
          }}
          className="space-y-3"
        >
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" label="Email" error={!validEmail && email ? 'Enter a valid email address' : undefined} />
          <Button type="submit" disabled={!validEmail}>Continue</Button>
        </form>
      )}

      {stage === 'auth' && (
        <form onSubmit={onSubmit} className="space-y-3">
          <button type="button" className="text-xs underline" onClick={() => setStage('email')}>Back</button>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={exists ? 'Password' : 'Choose a password'} label={exists ? 'Password' : 'Create Password'} />
          <div className="flex items-center gap-2">
            <Button disabled={loading} type="submit">{exists ? (loading ? 'Logging in…' : 'Log in') : (loading ? 'Signing up…' : 'Sign up')}</Button>
            <Button type="button" variant="secondary" disabled={loading || !email || cooldown > 0} onClick={onRequestOtp}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'}</Button>
          </div>
          {otpSent && (<InfoAlert message="OTP sent. Check your email and enter the code below." />)}
          <div className="flex items-center gap-2">
            <Input className="flex-1" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" label="One-Time Password" />
            <Button type="button" disabled={loading || !otp} onClick={onVerifyOtp}>Verify OTP</Button>
          </div>
          <ErrorAlert message={error || undefined} />
        </form>
      )}

      <div className="mt-4 text-sm text-muted-foreground">
        Dev helpers: <Link className="underline" to="/dev/auth-test">Auth test</Link> · <Link className="underline" to="/health/db">DB health</Link>
      </div>
    </div>
  )
}
