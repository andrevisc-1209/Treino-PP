import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { useAssinatura } from '@/features/assinatura/useAssinatura'
import { dataSP, formatarDataCurta } from '@/lib/datas'
import { PlanoModal } from './PlanoModal'
import { diasParaFimDoAcesso, varianteDoAvisoDeRenovacao } from './renovacaoBannerRegra'

/**
 * Aviso de renovação para quem já paga: o pagamento é avulso e não renova sozinho. Linha compacta na Hoje a 7 dias do fim e banner completo
 * nos últimos 3 (ver renovacaoBannerRegra.ts). Só vale para assinatura ativa; o teste tem o TrialBanner e o vencido, o modo leitura.
 */
export function RenovacaoBanner() {
  const { data: assinatura } = useAssinatura()
  const { pathname } = useLocation()
  const [modalAberto, setModalAberto] = useState(false)

  const dias = assinatura && assinatura.status === 'ativa' && assinatura.estaAtivo ? diasParaFimDoAcesso(assinatura.assinaturaFim, assinatura.bonusAte) : null
  const variante = varianteDoAvisoDeRenovacao(pathname, dias)
  if (!assinatura || dias === null || !variante) return null

  const fim = [assinatura.assinaturaFim, assinatura.bonusAte].filter((d): d is Date => !!d).reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
  const quando = `${formatarDataCurta(dataSP(fim))} · ${dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`}`

  if (variante === 'compacto') {
    return (
      <>
        <button type="button" onClick={() => setModalAberto(true)} className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-xl bg-amber-50 px-3 text-left text-sm text-amber-950 active:bg-amber-100">
          <CalendarClock size={16} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            Seu acesso vai até <strong>{quando}</strong>
          </span>
          <span className="shrink-0 font-semibold">Renovar</span>
          <ChevronRight size={16} className="shrink-0" aria-hidden />
        </button>
        <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-100 px-4 py-3 text-amber-950">
        <CalendarClock size={18} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          Seu acesso termina em <strong>{quando}</strong>. O pagamento não renova sozinho: renove para não perder a gravação.
        </p>
        <button type="button" onClick={() => setModalAberto(true)} className="min-h-11 shrink-0 rounded-lg bg-amber-950 px-3 text-sm font-semibold text-white active:bg-amber-900">
          Renovar
        </button>
      </div>
      <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </>
  )
}
