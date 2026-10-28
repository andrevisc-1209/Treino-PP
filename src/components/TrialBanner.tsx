import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useAssinatura } from '@/features/assinatura/useAssinatura'
import { PlanoModal } from './PlanoModal'
import { varianteDoBannerDoTeste } from './trialBannerRegra'

/**
 * Aviso do trial no topo do app: linha compacta na tela Hoje, nada nas demais e banner completo nos últimos dias (ver trialBannerRegra.ts). Some sozinho quando não está mais em trial
 * (ou já tem assinatura ativa, ou o trial venceu — nesse caso quem assume é
 * o AssinaturaExpiradaBanner, do modo leitura; não faz sentido duplicar o
 * aviso aqui também).
 */
export function TrialBanner() {
  const { data: assinatura } = useAssinatura()
  const { pathname } = useLocation()
  const [modalAberto, setModalAberto] = useState(false)

  const variante = assinatura && assinatura.status === 'trial' ? varianteDoBannerDoTeste(pathname, assinatura.diasRestantesTrial) : null
  if (!assinatura || !variante) return null

  if (variante === 'compacto') {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-xl bg-accent px-3 text-left text-sm text-white active:opacity-90"
        >
          <Sparkles size={16} className="shrink-0 text-brand-bright" aria-hidden />
          <span className="min-w-0 flex-1">
            Teste grátis: <strong>{assinatura.diasRestantesTrial}</strong> {assinatura.diasRestantesTrial === 1 ? 'dia restante' : 'dias restantes'}
          </span>
          <ChevronRight size={16} className="shrink-0 text-white/80" aria-hidden />
        </button>
        <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
      </>
    )
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
