// Comparação pura entre a lista de exercícios de um plano (cópia do
// aluno) e de um treino planejado (modelo), para detectar se a cópia
// está desatualizada. Sem I/O.

export type ItemComparavel = {
  exercicio_id: string
  order_index: number
  sets: number
  reps: string
  target_load_kg: number | null
  rest_seconds: number | null
}

/** true se as duas listas têm os mesmos exercícios, na mesma ordem, com a mesma prescrição. */
export function itensIguais(a: ItemComparavel[], b: ItemComparavel[]): boolean {
  if (a.length !== b.length) return false
  const ordenadosA = [...a].sort((x, y) => x.order_index - y.order_index)
  const ordenadosB = [...b].sort((x, y) => x.order_index - y.order_index)
  return ordenadosA.every((item, i) => {
    const outro = ordenadosB[i]
    return (
      item.exercicio_id === outro.exercicio_id &&
      item.sets === outro.sets &&
      item.reps === outro.reps &&
      item.target_load_kg === outro.target_load_kg &&
      item.rest_seconds === outro.rest_seconds
    )
  })
}
