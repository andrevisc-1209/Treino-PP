import { useState } from 'react'
import { useAlunos } from '@/features/alunos/api'
import { emAtivacao, gravarDispensada, lerDispensada } from './ativacao'

/** Estado da ativação do personal novo (alunos cadastrados até 3). Compartilhado pela tela Hoje, o cartão e o checklist. */
export function useAtivacao() {
  const { data: alunos } = useAlunos()
  const [dispensada, setDispensada] = useState(lerDispensada)
  const total = alunos?.length
  return {
    total,
    carregando: total === undefined,
    emAtivacao: emAtivacao(total, dispensada),
    dispensar: () => {
      gravarDispensada()
      setDispensada(true)
    },
  }
}
