import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/state/session'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useSession()
  const loc = useLocation()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: loc }} replace />
  const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('lastOrgId') : null
  if (!lastOrgId && loc.pathname !== '/org') {
    return <Navigate to="/org" replace />
  }
  return children
}
