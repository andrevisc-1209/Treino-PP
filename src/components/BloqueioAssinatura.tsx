import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui'
import { PlanoModal } from './PlanoModal'

/**
 * Tela de quem tenta fazer algo que o modo leitura não permite (ex.: iniciar um treino). Em vez de deixar a pessoa percorrer o fluxo
 * e errar no fim, explica e já abre a escolha do plano.
 */
export function BloqueioAssinatura({ titulo, onVoltar }: { titulo: string; onVoltar: () => void }) {
  const [planosAbertos, setPlanosAbertos] = useState(true)

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-900">
        <Lock size={26} aria-hidden />
      </span>
      <h1 className="text-xl font-bold">{titulo}</h1>
      <p className="text-sm text-slate-600">
        Seu período de uso terminou. Suas informações continuam disponíveis para consulta; para criar e alterar, assine o plano.
      </p>
      <Button className="w-full" onClick={() => setPlanosAbertos(true)}>
        Ver planos
      </Button>
      <button type="button" onClick={onVoltar} className="min-h-11 px-4 text-sm font-medium text-slate-600 underline">
        Voltar
      </button>
      <PlanoModal open={planosAbertos} onClose={() => setPlanosAbertos(false)} />
    </div>
  )
}
