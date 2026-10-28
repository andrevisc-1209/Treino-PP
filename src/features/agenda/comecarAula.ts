export type DecisaoComecar =
  /** um único aluno previsto: vai direto para o treino dele */
  | { tipo: 'navegar'; to: string }
  /** mais de um previsto: abre a folha "Iniciar treino de quem?" */
  | { tipo: 'escolher' }
  /** ninguém previsto: abre o menu da aula */
  | { tipo: 'menu' }

/** O que o botão "Começar" de uma aula faz (mesma regra na Hoje e na Agenda). */
export function decidirComecar(aula: { id: string; aula_participantes: { aluno_id: string; status: string }[] }): DecisaoComecar {
  const previstos = aula.aula_participantes.filter((p) => p.status === 'previsto')
  if (previstos.length === 1) return { tipo: 'navegar', to: `/alunos/${previstos[0].aluno_id}/sessoes/nova?aula=${aula.id}` }
  if (previstos.length > 1) return { tipo: 'escolher' }
  return { tipo: 'menu' }
}
