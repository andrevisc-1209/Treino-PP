import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAssinatura } from '@/features/assinatura/useAssinatura'
import { PlanoModal } from './PlanoModal'

/**
 * Modo leitura: trial ou assinatura vencidos. O app continua aberto (o personal vê todas as informações dele), mas o SERVIDOR não
 * aceita mais gravações (migration 20261052). Este aviso explica o motivo e leva ao pagamento.
 */
export function AssinaturaExpiradaBanner() {
  const { data: assinatura } = useAssinatura()
  const [modalAberto, setModalAberto] = useState(false)

  // sem dado ainda (carregando/erro de rede): não mostra nada; o servidor é quem barra as gravações
  if (!assinatura || assinatura.estaAtivo) return null

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900" role="status">
        <Lock size={18} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          Para usar o Treino, assine o plano. Suas informações continuam disponíveis aqui, <strong>só para consulta</strong>.
        </p>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="min-h-11 shrink-0 rounded-lg bg-amber-900 px-3 text-sm font-semibold text-white active:bg-amber-950"
        >
          Ver planos
        </button>
      </div>
      <PlanoModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </>
  )
}
