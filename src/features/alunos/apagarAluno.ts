import { supabase } from '@/lib/supabase'

/** O que some junto quando um aluno é apagado de vez (as tabelas filhas caem em cascata). */
export type ResumoApagar = { sessoes: number; treinos: number; avaliacoes: number; faturas: number }

const item = (n: number, um: string, varios: string): string | null => (n > 0 ? `${n} ${n === 1 ? um : varios}` : null)

/** "12 sessões de treino, 3 treinos e 5 faturas" (só o que existe); vazio se não houver nada. */
export function descreverPerdas(r: ResumoApagar): string {
  const partes = [
    item(r.sessoes, 'sessão de treino', 'sessões de treino'),
    item(r.treinos, 'treino montado', 'treinos montados'),
    item(r.avaliacoes, 'avaliação', 'avaliações'),
    item(r.faturas, 'fatura', 'faturas'),
  ].filter((p): p is string => p !== null)
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}

/** Texto da confirmação de apagar. `resumo` null = não deu para contar (sem rede): fala do que some sem números. */
export function mensagemApagarAluno(nome: string, resumo: ResumoApagar | null): string {
  const perdas = resumo ? descreverPerdas(resumo) : ''
  const o_que = resumo
    ? perdas
      ? ` Junto vão ${perdas}.`
      : ' Ele não tem treinos, avaliações nem faturas registrados.'
    : ' Junto vão todo o histórico dele: treinos, sessões, avaliações e faturas.'
  return `Isso apaga ${nome} para sempre e não dá para desfazer.${o_que} Se você só quer parar de atender, deixe arquivado: nada se perde.`
}

const contar = async (tabela: 'sessoes' | 'planos' | 'pesos' | 'faturas', alunoId: string): Promise<number> => {
  const { count, error } = await supabase.from(tabela).select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId)
  if (error) throw error
  return count ?? 0
}

/** Conta o que seria perdido. Se falhar (rede), devolve null e a confirmação usa o texto sem números. */
export async function buscarResumoApagar(alunoId: string): Promise<ResumoApagar | null> {
  try {
    const [sessoes, treinos, avaliacoes, faturas] = await Promise.all([
      contar('sessoes', alunoId),
      contar('planos', alunoId),
      contar('pesos', alunoId),
      contar('faturas', alunoId),
    ])
    return { sessoes, treinos, avaliacoes, faturas }
  } catch {
    return null
  }
}
