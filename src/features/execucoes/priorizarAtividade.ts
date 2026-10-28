/** Põe primeiro, sem trocar a ordem relativa, as atividades que têm observação do aluno ainda não lida. */
export function priorizarAtividades<T extends { id: string; notas_aluno: string | null }>(itens: T[], comObservacaoNova: Set<string>): T[] {
  const nova = (a: T) => !!a.notas_aluno && comObservacaoNova.has(a.id)
  return [...itens.filter(nova), ...itens.filter((a) => !nova(a))]
}
