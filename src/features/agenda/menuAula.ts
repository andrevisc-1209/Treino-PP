export type EstadoMenuAula = {
  status: 'agendada' | 'realizada' | 'cancelada'
  totalParticipantes: number
  previstos: number
}

export type MenuAula = {
  /** Aviso mostrado no topo do menu; null quando não há o que explicar. */
  mensagem: string | null
  /** Iniciar treino / check-in / falta: dependem de ter aluno ainda "previsto". */
  agirNosAlunos: boolean
  /** Cancelar / remarcar: são da aula inteira, valem pra toda aula agendada (inclusive sem alunos). */
  agirNaAula: boolean
}

/**
 * O que o menu de uma aula oferece. Invariante (testada): o menu nunca fica vazio — sempre há uma mensagem
 * ou ao menos uma ação. Antes, uma aula agendada sem alunos "previstos" abria só um painel branco vazio.
 */
export function descreverMenuAula({ status, totalParticipantes, previstos }: EstadoMenuAula): MenuAula {
  if (status === 'realizada') return { mensagem: 'Esta aula já foi realizada.', agirNosAlunos: false, agirNaAula: false }
  if (status === 'cancelada') return { mensagem: 'Esta aula foi cancelada.', agirNosAlunos: false, agirNaAula: false }
  const agirNosAlunos = previstos > 0
  const mensagem = agirNosAlunos
    ? null
    : totalParticipantes === 0
      ? 'Esta aula não tem alunos. Você pode remarcá-la ou cancelá-la.'
      : 'Todos os alunos desta aula já foram registrados.'
  return { mensagem, agirNosAlunos, agirNaAula: true }
}
