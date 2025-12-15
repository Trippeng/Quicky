import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { refreshSession, setAccessToken } from '@/api/client'

interface SessionValue {
  isAuthenticated: boolean
  loading: boolean
  setToken: (t: string | null) => void
  clear: () => void
}

const SessionCtx = createContext<SessionValue | undefined>(undefined)

export function useSession() {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Try to hydrate via refresh cookie on load
    ;(async () => {
      const ok = await refreshSession()
      setAuth(ok)
      setLoading(false)
    })()
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      isAuthenticated,
      loading,
      setToken: (t: string | null) => {
        setAccessToken(t)
        setAuth(!!t)
      },
      clear: () => {
        setAccessToken(null)
        setAuth(false)
      },
    }),
    [isAuthenticated, loading]
  )

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}
