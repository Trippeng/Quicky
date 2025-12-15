import React from 'react'
import { SessionProvider } from '@/state/session'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
