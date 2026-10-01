import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { AssinaturaGuard } from '@/components/AssinaturaGuard'
import { TrialBanner } from '@/components/TrialBanner'
import { useIsAdmin } from '@/features/admin/useIsAdmin'
import { useAuth } from './AuthProvider'

// Modo foco: cadastro/edição de aluno e todo o ciclo de uma sessão (pré-treino,
// execução, pós-treino) escondem a navegação global — ver docs/ux-audit e a
// tarefa "modo aula". A saída passa a ser o botão "✕ Sair" de cada tela.
const ROTAS_MODO_FOCO = [/^\/alunos\/novo$/, /^\/alunos\/[^/]+\/editar$/, /^\/alunos\/[^/]+\/sessoes\//]

export function RequireAuth() {
  const { session, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const location = useLocation()
  if (loading || adminLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return <Navigate to="/login" replace />
  // Conta de admin não é um personal — manda direto pro painel em vez de
  // mostrar a home/agenda/bottom nav de personal (que não faz sentido pra
  // essa conta). Pedido explícito: toda vez que essa conta logar, cair
  // direto no /admin.
  if (isAdmin) return <Navigate to="/admin" replace />

  const modoFoco = ROTAS_MODO_FOCO.some((r) => r.test(location.pathname))

  return (
    <div className={modoFoco ? '' : 'pb-16'}>
      <AssinaturaGuard>
        {!modoFoco && (
          <div className="mx-auto max-w-2xl px-4 pt-4">
            <TrialBanner />
          </div>
        )}
        <Outlet />
      </AssinaturaGuard>
      {!modoFoco && <BottomNav />}
    </div>
  )
}
