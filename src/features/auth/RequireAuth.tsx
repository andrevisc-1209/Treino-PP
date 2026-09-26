import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { useAuth } from './AuthProvider'

// Modo foco: cadastro/edição de aluno e todo o ciclo de uma sessão (pré-treino,
// execução, pós-treino) escondem a navegação global — ver docs/ux-audit e a
// tarefa "modo aula". A saída passa a ser o botão "✕ Sair" de cada tela.
const ROTAS_MODO_FOCO = [/^\/alunos\/novo$/, /^\/alunos\/[^/]+\/editar$/, /^\/alunos\/[^/]+\/sessoes\//]

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />

  const modoFoco = ROTAS_MODO_FOCO.some((r) => r.test(location.pathname))

  return (
    <div className={modoFoco ? '' : 'pb-16'}>
      <Outlet />
      {!modoFoco && <BottomNav />}
    </div>
  )
}
