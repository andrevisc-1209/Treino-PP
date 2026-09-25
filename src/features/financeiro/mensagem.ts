import type { Peso } from '@/features/alunos/api'
import type { SessaoDetalhada } from '@/features/evolucao/api'
import { evolucaoExercicio, exerciciosExecutados, pseMedia, variacaoPeso } from '@/features/evolucao/calc'
import { formatarBRL } from '@/lib/moeda'

export type ResumoTreinoPeriodo = {
  quantidadeTreinos: number
  pseMedio: number | null
  exercicioDestaque: string | null
  cargaInicial: number | null
  cargaFinal: number | null
  variacaoPesoKg: number | null
}

/** Resumo de treino do período para a mensagem de fatura. Nunca inclui dados de saúde/bem-estar. */
export function resumoTreinoPeriodo(sessoes: SessaoDetalhada[], pesos: Peso[]): ResumoTreinoPeriodo {
  const exercicios = exerciciosExecutados(sessoes)
  let destaque: { nome: string; inicial: number; final: number } | null = null
  for (const ex of exercicios) {
    const pontos = evolucaoExercicio(sessoes, ex.id).filter((p) => p.maiorCarga != null)
    if (pontos.length < 2) continue
    const inicial = pontos[0].maiorCarga!
    const final = pontos[pontos.length - 1].maiorCarga!
    const delta = final - inicial
    if (delta > 0 && (!destaque || delta > destaque.final - destaque.inicial)) {
      destaque = { nome: ex.nome, inicial, final }
    }
  }
  return {
    quantidadeTreinos: sessoes.length,
    pseMedio: pseMedia(sessoes),
    exercicioDestaque: destaque?.nome ?? null,
    cargaInicial: destaque?.inicial ?? null,
    cargaFinal: destaque?.final ?? null,
    variacaoPesoKg: variacaoPeso(pesos),
  }
}

export type MensagemFaturaInput = {
  primeiroNome: string
  periodoLabel: string
  quantidadeAulas: number
  datasAulas: string[]
  modelo: 'por_aula' | 'mensal'
  valorUnitario: number | null
  total: number
  ajuste: number
  ajusteDescricao: string | null
  vencimentoLabel: string
  pixPayload: string | null
  resumoTreino: ResumoTreinoPeriodo | null
}

/** Monta a mensagem padrão de fatura (o professor pode editar antes de enviar). */
export function montarMensagemFatura(input: MensagemFaturaInput): string {
  const linhas: string[] = []
  linhas.push(`Olá, ${input.primeiroNome}! Segue o resumo de ${input.periodoLabel}:`)
  linhas.push(`📅 Aulas: ${input.quantidadeAulas}${input.datasAulas.length > 0 ? ` (${input.datasAulas.join(', ')})` : ''}`)

  if (input.modelo === 'por_aula' && input.valorUnitario != null) {
    linhas.push(`💰 ${input.quantidadeAulas} × ${formatarBRL(input.valorUnitario)} = ${formatarBRL(input.total)}`)
  } else {
    linhas.push(`💰 Mensalidade: ${formatarBRL(input.total)}`)
  }

  if (input.ajuste !== 0) {
    const sinal = input.ajuste > 0 ? '+' : '−'
    const desc = input.ajusteDescricao ? ` (${input.ajusteDescricao})` : ''
    linhas.push(`Ajuste${desc}: ${sinal} ${formatarBRL(Math.abs(input.ajuste))}`)
  }

  linhas.push(`Vencimento: ${input.vencimentoLabel}`)

  if (input.pixPayload) {
    linhas.push('')
    linhas.push('Pix copia e cola:')
    linhas.push(input.pixPayload)
  }

  const r = input.resumoTreino
  if (r && r.quantidadeTreinos > 0) {
    linhas.push('')
    const partes = [`🏋️ Seu mês de treino: ${r.quantidadeTreinos} treinos`]
    if (r.pseMedio != null) partes.push(`PSE médio ${r.pseMedio.toFixed(1)}`)
    if (r.exercicioDestaque) partes.push(`destaque: ${r.exercicioDestaque}`)
    linhas.push(partes.join(' · '))

    if (r.cargaInicial != null && r.cargaFinal != null) {
      const variacao = r.variacaoPesoKg != null ? ` · peso ${r.variacaoPesoKg > 0 ? '+' : ''}${r.variacaoPesoKg.toFixed(1)} kg` : ''
      linhas.push(`${r.cargaInicial} → ${r.cargaFinal} kg${variacao}`)
    } else if (r.variacaoPesoKg != null) {
      linhas.push(`peso ${r.variacaoPesoKg > 0 ? '+' : ''}${r.variacaoPesoKg.toFixed(1)} kg`)
    }
  }

  linhas.push('')
  linhas.push('Qualquer dúvida, me chama!')
  return linhas.join('\n')
}
