import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { buscarPerfilProfissional } from './api'
import { PerfilObrigatorioForm } from './PerfilObrigatorioForm'

/**
 * Pra onde o Supabase manda de volta depois do OAuth (Google) — ver
 * options.redirectTo em SocialLoginButtons.tsx. O supabase-js já processa o
 * retorno sozinho (detectSessionInUrl) e atualiza o AuthProvider; aqui só
 * decide pra onde ir depois que a sessão aparece: se é a primeira vez (nome,
 * CPF ou telefone ainda vazios), pede pra completar o cadastro antes do
 * dashboard — senão manda direto pra "/".
 */
export function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<'checando' | 'completar' | null>('checando')
  const [nomeGoogle, setNomeGoogle] = useState('')

  useEffect(() => {
    if (loading || !session) return
    buscarPerfilProfissional(session.user.id)
      .then((perfil) => {
        if (perfil.name.trim() && perfil.cpf && perfil.phone) {
          navigate('/', { replace: true })
        } else {
          const nomeMeta = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? ''
          setNomeGoogle(perfil.name.trim() || nomeMeta)
          setEtapa('completar')
        }
      })
      .catch(() => setEtapa('completar'))
  }, [loading, session, navigate])

  if (loading || etapa === 'checando') return <div className="p-8 text-center text-slate-500">Entrando…</div>
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">Complete seu perfil</h1>
          <p className="text-sm text-slate-500">Só mais um passo antes de começar.</p>
        </div>
        <PerfilObrigatorioForm userId={session.user.id} nomeInicial={nomeGoogle} onConcluido={() => navigate('/', { replace: true })} />
      </div>
    </div>
  )
}
