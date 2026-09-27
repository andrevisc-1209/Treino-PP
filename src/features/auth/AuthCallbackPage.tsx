import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { buscarNomeProfissional, salvarNomeProfissional } from './api'
import { Button, Field, Input } from '@/components/ui'

/**
 * Pra onde o Supabase manda de volta depois do OAuth (Google/Facebook) —
 * ver options.redirectTo em SocialLoginButtons.tsx. O supabase-js já
 * processa o retorno sozinho (detectSessionInUrl) e atualiza o AuthProvider;
 * aqui só decide pra onde ir depois que a sessão aparece.
 */
export function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<'checando' | 'nome' | null>('checando')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (loading || !session) return
    buscarNomeProfissional(session.user.id)
      .then((nomeAtual) => {
        if (nomeAtual.trim()) navigate('/', { replace: true })
        else setEtapa('nome')
      })
      .catch(() => setEtapa('nome'))
  }, [loading, session, navigate])

  if (loading || etapa === 'checando') return <div className="p-8 text-center text-slate-500">Entrando…</div>
  if (!session) return <Navigate to="/login" replace />

  const salvarNome = async () => {
    if (!nome.trim()) {
      setErro('Informe seu nome')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await salvarNomeProfissional(session.user.id, nome.trim())
      navigate('/', { replace: true })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">Como podemos te chamar?</h1>
          <p className="text-sm text-slate-500">Seu nome aparece para os seus alunos.</p>
        </div>
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button onClick={salvarNome} className="w-full" disabled={salvando}>
          Concluir
        </Button>
      </div>
    </div>
  )
}
