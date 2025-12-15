import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import OrgSelect from '@/pages/OrgSelect'
import Dashboard from '@/pages/Dashboard'
import HealthDb from '@/pages/HealthDb'
import DevAuthTest from '@/pages/DevAuthTest'
import RequireAuth from '@/app/RequireAuth'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/org" element={<RequireAuth><OrgSelect /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/health/db" element={<HealthDb />} />
        <Route path="/dev/auth-test" element={<DevAuthTest />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
