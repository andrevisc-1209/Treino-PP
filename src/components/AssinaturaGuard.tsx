import { useState, type ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAssinatura } from '@/features/assinatura/useAssinatura'
import { PlanoModal } from './PlanoModal'
import { Button } from './ui'

/** Bloqueia o app quando o trial venceu e não há assinatura ativa. */
export function AssinaturaGuard({ children }: { children: ReactNode }) {
  const { data: assinatura, isLoading } = useAssinatura()
  const [modalAberto, setModalAberto] = useState(true)

  // Sem dado ainda (carregando ou erro de rede): deixa passar em vez de
  // bloquear — não queremos travar o app inteiro por uma falha de rede.
  if (isLoading || !assinatura || assinatura.estaAtivo) return <>{children}</>

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-center shadow">
        <h1 className="text-xl font-bold">Seu trial expirou</h1>
        <p className="text-sm text-slate-600">
          Assine um dos planos pra continuar usando o Treino e mantendo acesso aos seus alunos.
        </p>
        <Button onClick={() => setModalAberto(true)} className="w-full">
          Ver planos
        </Button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mx-auto flex items-center gap-1 text-sm text-slate-400"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
      <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </div>
  )
}
