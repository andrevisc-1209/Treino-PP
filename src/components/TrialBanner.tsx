import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAssinatura } from '@/features/assinatura/useAssinatura'
import { PlanoModal } from './PlanoModal'

/**
 * Aviso do trial no topo do app. Some sozinho quando não está mais em trial
 * (ou já tem assinatura ativa, ou o trial venceu — nesse caso quem assume é
 * o AssinaturaGuard, que bloqueia a tela inteira; não faz sentido duplicar o
 * aviso aqui também).
 */
export function TrialBanner() {
  const { data: assinatura } = useAssinatura()
  const [modalAberto, setModalAberto] = useState(false)

  if (!assinatura || assinatura.status !== 'trial' || assinatura.diasRestantesTrial === null || assinatura.diasRestantesTrial <= 0) {
    return null
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-white">
        <Sparkles size={18} className="shrink-0 text-brand-bright" />
        <p className="min-w-0 flex-1 text-sm">
          Você tem <strong>{assinatura.diasRestantesTrial}</strong>{' '}
          {assinatura.diasRestantesTrial === 1 ? 'dia' : 'dias'} de trial gratuito restantes.
        </p>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-accent active:bg-slate-100"
        >
          Assinar agora
        </button>
      </div>
      <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </>
  )
}
