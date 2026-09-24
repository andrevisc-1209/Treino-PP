import { Navigate, Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  return (
    <div className="pb-16">
      <Outlet />
      <BottomNav />
    </div>
  )
}
