import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { AssinaturaGuard } from '@/components/AssinaturaGuard'
import { TrialBanner } from '@/components/TrialBanner'
import { useIsAdmin } from '@/features/admin/useIsAdmin'
import { useNotificacoesRealtime } from '@/features/notificacoes/api'
import { useAuth } from './AuthProvider'

// Modo foco: cadastro/edição de aluno e todo o ciclo de uma sessão (pré-treino,
// execução, pós-treino) escondem a navegação global — ver docs/ux-audit e a
// tarefa "modo aula". A saída passa a ser o botão "✕ Sair" de cada tela.
const ROTAS_MODO_FOCO = [/^\/alunos\/novo$/, /^\/alunos\/[^/]+\/editar$/, /^\/alunos\/[^/]+\/sessoes\//]

/** Visitante deslogado em "/" vê a landing (HTML estático em public/). App instalado (PWA) vai direto pro login. */
function IrParaLandingOuLogin() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  useEffect(() => {
    if (!standalone) window.location.replace('/landing.html')
  }, [standalone])
  return standalone ? <Navigate to="/login" replace /> : null
}

/** Assina as notificações do personal (Realtime) enquanto o app autenticado está aberto. */
function NotificacoesRealtime({ professionalId }: { professionalId: string }) {
  useNotificacoesRealtime(professionalId)
  return null
}

export function RequireAuth() {
  const { session, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const location = useLocation()
  if (loading || adminLoading) return <div className="p-8 text-center text-slate-500">Carregando…</div>
  if (!session) return location.pathname === '/' ? <IrParaLandingOuLogin /> : <Navigate to="/login" replace />
  // Conta de admin não é um personal — manda direto pro painel em vez de
  // mostrar a home/agenda/bottom nav de personal (que não faz sentido pra
  // essa conta). Pedido explícito: toda vez que essa conta logar, cair
  // direto no /admin.
  if (isAdmin) return <Navigate to="/admin" replace />

  const modoFoco = ROTAS_MODO_FOCO.some((r) => r.test(location.pathname))

  return (
    <div className={modoFoco ? '' : 'pb-16'}>
      <NotificacoesRealtime professionalId={session.user.id} />
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
