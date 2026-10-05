import { dataSP, formatarDataCurta, inicioDaSemanaSP, somarDias } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'

/** Uma aula do ciclo fechado (linha de aula_participantes já ligada à fatura). */
export type ItemRecibo = {
  id: string
  status: 'previsto' | 'presente' | 'falta' | 'cancelou'
  valor: number | null
  starts_at: string
  duration_min: number
  local: string | null
  pse: number | null
  nota: number | null
  /** Data (YYYY-MM-DD) da sessão de treino ligada à aula, se houve. */
  data_sessao: string | null
}

export function ordenarItens(itens: ItemRecibo[]): ItemRecibo[] {
  return [...itens].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

const presentes = (itens: ItemRecibo[]) => itens.filter((i) => i.status === 'presente')

export type ResumoRecibo = { aulasRealizadas: number; diasUnicos: number; locais: string[] }

export function resumoRecibo(itens: ItemRecibo[]): ResumoRecibo {
  const feitas = presentes(itens)
  const locais = new Map<string, string>()
  for (const i of feitas) {
    const nome = i.local?.trim()
    if (nome && !locais.has(nome.toLowerCase())) locais.set(nome.toLowerCase(), nome)
  }
  return {
    aulasRealizadas: feitas.length,
    diasUnicos: new Set(feitas.map((i) => dataSP(i.starts_at))).size,
    locais: [...locais.values()],
  }
}

function semanasEntre(primeira: string, ultima: string): string[] {
  const semanas: string[] = []
  for (let s = primeira; s <= ultima; s = somarDias(s, 7)) semanas.push(s)
  return semanas
}

export type PontoSemana = { semana: string; rotulo: string; valor: number }

/** Aulas realizadas por semana (seg–dom), incluindo semanas sem aula (0) entre a primeira e a última. */
export function frequenciaSemanal(itens: ItemRecibo[]): PontoSemana[] {
  const feitas = presentes(itens)
  if (feitas.length === 0) return []
  const porSemana = new Map<string, number>()
  for (const i of feitas) {
    const s = inicioDaSemanaSP(dataSP(i.starts_at))
    porSemana.set(s, (porSemana.get(s) ?? 0) + 1)
  }
  const chaves = [...porSemana.keys()].sort()
  return semanasEntre(chaves[0], chaves[chaves.length - 1]).map((s) => ({
    semana: s,
    rotulo: formatarDataCurta(s),
    valor: porSemana.get(s) ?? 0,
  }))
}

/** PSE médio por semana (só semanas com PSE registrado). */
export function pseMedioPorSemana(itens: ItemRecibo[]): PontoSemana[] {
  const porSemana = new Map<string, number[]>()
  for (const i of itens) {
    if (i.pse == null) continue
    const s = inicioDaSemanaSP(i.data_sessao ?? dataSP(i.starts_at))
    porSemana.set(s, [...(porSemana.get(s) ?? []), i.pse])
  }
  return [...porSemana.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, v]) => ({ semana, rotulo: formatarDataCurta(semana), valor: Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10 }))
}

export type PontoNota = { data: string; rotulo: string; valor: number }

/** Nota do personal por treino, em ordem cronológica. */
export function notasPorTreino(itens: ItemRecibo[]): PontoNota[] {
  return ordenarItens(itens)
    .filter((i) => i.nota != null)
    .map((i) => {
      const data = i.data_sessao ?? dataSP(i.starts_at)
      return { data, rotulo: formatarDataCurta(data), valor: i.nota as number }
    })
}

/**
 * Texto curto pra compartilhar (WhatsApp etc.). Só dados de cobrança e volume de aulas —
 * nunca prontidão/bem-estar nem notas (regra de LGPD do projeto).
 */
export function textoCompartilharRecibo(args: {
  alunoNome: string
  personalNome: string
  periodo: string
  resumo: ResumoRecibo
  total: number
}): string {
  const { alunoNome, personalNome, periodo, resumo, total } = args
  return [
    `Recibo — ${alunoNome}`,
    `Período: ${periodo}`,
    `Aulas realizadas: ${resumo.aulasRealizadas} em ${resumo.diasUnicos} ${resumo.diasUnicos === 1 ? 'dia' : 'dias'}`,
    `Total do ciclo: ${formatarBRL(total)}`,
    `Personal: ${personalNome}`,
    'Gerado pelo Treino PP',
  ].join('\n')
}
