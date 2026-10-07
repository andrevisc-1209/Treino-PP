import { useState } from 'react'
import { BottomSheet, Button } from '@/components/ui'
import { mostrarInfoGlobal } from '@/components/Toast'
import { MODALIDADES_CONFIG, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'
import { useRegistrarExecucaoPresencial } from './api'
import { FormResultadoModalidade, ReferenciaTreino } from './ResultadoModalidade'
import { detalhesDoResultado, RESULTADO_VAZIO, type EstadoResultado } from './resultado'

export type PlanoParaExecucao = { id: string; name: string; modalidade: ModalidadeTipo; modalidade_detalhes: ModalidadeDetalhes }

/**
 * Aula presencial de uma modalidade sem lista de exercícios do app: o personal vê a prescrição,
 * marca o que foi feito e registra o resultado. (Musculação continua no fluxo de Sessão.)
 */
export function ExecucaoPresencialSheet({ plano, alunoId, onClose }: { plano: PlanoParaExecucao | null; alunoId: string; onClose: () => void }) {
  const registrar = useRegistrarExecucaoPresencial(alunoId)
  const [estado, setEstado] = useState<EstadoResultado>(RESULTADO_VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  const fechar = () => {
    setEstado(RESULTADO_VAZIO)
    setErro(null)
    onClose()
  }

  const salvar = () => {
    if (!plano || plano.modalidade === 'musculacao') return
    setErro(null)
    registrar.mutate(
      { plano, detalhes: detalhesDoResultado(plano.modalidade, plano.modalidade_detalhes, estado), notas: estado.notas },
      {
        onSuccess: () => {
          mostrarInfoGlobal('Treino registrado.')
          fechar()
        },
        onError: (e) => setErro((e as Error).message),
      },
    )
  }

  const cfg = plano ? MODALIDADES_CONFIG[plano.modalidade] : null
  return (
    <BottomSheet open={!!plano} onClose={fechar} title={plano && cfg ? `${cfg.emoji} ${plano.name}` : ''}>
      {plano && plano.modalidade !== 'musculacao' && (
        <div className="space-y-4">
          <ReferenciaTreino modalidade={plano.modalidade} detalhes={plano.modalidade_detalhes} />
          <FormResultadoModalidade modalidade={plano.modalidade} detalhes={plano.modalidade_detalhes} estado={estado} onEstado={setEstado} />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={salvar} className="w-full" disabled={registrar.isPending}>
            Registrar treino
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
