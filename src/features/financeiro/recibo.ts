import { dataSP, formatarDataCurta, inicioDaSemanaSP, somarDias } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { formatarNumero } from '@/lib/format'
import { ehModalidade, MODALIDADES_CONFIG } from '@/types/modalidades'
import { duracaoAtipica } from '@/features/sessoes/duracaoAtipica'
import { volumeZero, type Volume } from '@/features/execucoes/volume'

/** Uma aula do ciclo fechado (linha de aula_participantes já ligada à fatura). */
export type ItemRecibo = {
  id: string
  status: 'previsto' | 'presente' | 'falta' | 'cancelou'
  valor: number | null
  starts_at: string
  duration_min: number
  local: string | null
  /** modalidade do treino da sessão da aula (null se não houve sessão) */
  modalidade?: string | null
  pse: number | null
  nota: number | null
  /** Data (YYYY-MM-DD) da sessão de treino ligada à aula, se houve. */
  data_sessao: string | null
  /** Duração gravada da sessão (min), se houve sessão e foi informada. */
  duracao_sessao_min?: number | null
  /** Treino feito pelo aluno à distância (pelo link) e cobrado como aula. */
  a_distancia?: boolean
  /** Exercícios com ao menos uma série concluída na sessão. */
  exercicios_feitos?: number
  /** Séries concluídas na sessão. */
  series_feitas?: number
  /** Nome do treino planejado da sessão ("Treino A"), se houve. */
  plano_nome?: string | null
  /** Volume realizado (km, metros, minutos) registrado no resultado das modalidades fora da musculação. */
  volume?: Volume
  /** Tempo registrado no resultado da execução (min), fora da musculação. */
  duracao_execucao_min?: number | null
  /** A aula (presença, falta ou cancelamento) foi cobrada. Itens de uma fatura são todos cobrados. */
  cobrar?: boolean | null
  /** Execução (treino à distância ou de outra modalidade) ligada a esta aula. */
  execucao_id?: string | null
  /** Maior carga (kg) feita em cada exercício da sessão. */
  cargas?: { exercicio_id: string; nome: string; carga_kg: number }[]
  /** Pace médio da corrida registrada (segundos por km). */
  pace_seg_km?: number | null
  /** Treino à distância feito no ciclo e NÃO cobrado: aparece no relatório, mas não conta como aula nem no total. */
  fora_da_cobranca?: boolean
}

export type MetricasTreino = { exercicios: number; series: number; minutos: number }

/**
 * Totais dos treinos (sessões) ligados às aulas do ciclo; null quando não há nenhum dado de treino
 * (aulas sem sessão, ou sessões sem série/duração gravada) — nada é inventado.
 */
export function metricasDeTreino(itens: ItemRecibo[]): MetricasTreino | null {
  const m = itens.reduce(
    (a, i) => ({ exercicios: a.exercicios + (i.exercicios_feitos ?? 0), series: a.series + (i.series_feitas ?? 0), minutos: a.minutos + (duracaoConfiavel(i.duracao_sessao_min) ?? duracaoConfiavel(i.duracao_execucao_min) ?? 0) }),
    { exercicios: 0, series: 0, minutos: 0 },
  )
  return m.exercicios > 0 || m.series > 0 || m.minutos > 0 ? m : null
}

export function ordenarItens(itens: ItemRecibo[]): ItemRecibo[] {
  return [...itens].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}

const presentes = (itens: ItemRecibo[]) => itens.filter((i) => i.status === 'presente' && !i.fora_da_cobranca)

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

// ---------- Resumo por modalidade ----------

export type ResumoModalidade = {
  modalidade: string
  rotulo: string
  emoji: string
  /** aulas presentes dessa modalidade (as cobradas no ciclo) */
  aulas: number
  /** treinos à distância dessa modalidade que não foram cobrados (só informativo) */
  aDistanciaSemCobranca: number
  /** o que foi registrado, só com valor > 0: "12,4 km", "3,2 km nadados", "13 séries"… (vazio = só a contagem de aulas) */
  numeros: string[]
  /** o número que merece destaque no relatório ("12,4 km", "13 séries"); null se a modalidade não registrou nada */
  destaque: string | null
}

const km = (v: number) => `${formatarNumero(Math.round(v * 10) / 10)} km`
const minutos = (v: number) => `${formatarNumero(Math.round(v))} min`

/** Duração registrada que parece verdadeira: fora da faixa de 20 min a 3 h é provável engano e não entra no relatório. */
export const duracaoConfiavel = (min: number | null | undefined): number | null => (min != null && min > 0 && duracaoAtipica(min) === null ? min : null)

/**
 * Uma linha por modalidade que o aluno fez no ciclo, com os números que aquela modalidade registra (km na corrida, metros na
 * natação, km ou minutos no ciclismo, bike e corrida no brick, séries na musculação). Nada de zero nem traço: sem dado,
 * fica só a quantidade de aulas. Aulas sem treino registrado (sem modalidade) ficam de fora do resumo.
 */
export function resumoPorModalidade(itens: ItemRecibo[]): ResumoModalidade[] {
  const grupos = new Map<string, ItemRecibo[]>()
  for (const i of itens) {
    if (i.status !== 'presente' || !ehModalidade(i.modalidade)) continue
    grupos.set(i.modalidade, [...(grupos.get(i.modalidade) ?? []), i])
  }
  const ordem = Object.keys(MODALIDADES_CONFIG)
  return [...grupos.entries()]
    .sort(([a], [b]) => ordem.indexOf(a) - ordem.indexOf(b))
    .map(([modalidade, lista]) => {
      const v = lista.reduce<Volume>((a, i) => {
        const x = i.volume ?? volumeZero()
        return { natacaoKm: a.natacaoKm + x.natacaoKm, ciclismoKm: a.ciclismoKm + x.ciclismoKm, ciclismoMin: a.ciclismoMin + x.ciclismoMin, corridaKm: a.corridaKm + x.corridaKm }
      }, volumeZero())
      const series = lista.reduce((a, i) => a + (i.series_feitas ?? 0), 0)
      const numeros: string[] = []
      if (modalidade === 'musculacao') {
        if (series > 0) numeros.push(`${series} ${series === 1 ? 'série' : 'séries'}`)
      } else if (modalidade === 'natacao') {
        if (v.natacaoKm > 0) numeros.push(`${formatarNumero(Math.round(v.natacaoKm * 1000))} m nadados`)
      } else if (modalidade === 'corrida') {
        if (v.corridaKm > 0) numeros.push(km(v.corridaKm))
      } else if (modalidade === 'ciclismo') {
        if (v.ciclismoKm > 0) numeros.push(km(v.ciclismoKm))
        else if (v.ciclismoMin > 0) numeros.push(minutos(v.ciclismoMin))
      } else if (modalidade === 'brick') {
        if (v.ciclismoKm > 0) numeros.push(`${km(v.ciclismoKm)} de bike`)
        else if (v.ciclismoMin > 0) numeros.push(`${minutos(v.ciclismoMin)} de bike`)
        if (v.corridaKm > 0) numeros.push(`${km(v.corridaKm)} de corrida`)
      }
      const kmTotal = v.natacaoKm + v.ciclismoKm + v.corridaKm
      const destaque =
        modalidade === 'musculacao'
          ? series > 0
            ? `${series} ${series === 1 ? 'série' : 'séries'}`
            : null
          : modalidade === 'natacao'
            ? v.natacaoKm >= 1
              ? km(v.natacaoKm)
              : v.natacaoKm > 0
                ? `${formatarNumero(Math.round(v.natacaoKm * 1000))} m`
                : null
            : kmTotal > 0
              ? km(kmTotal)
              : v.ciclismoMin > 0
                ? minutos(v.ciclismoMin)
                : null
      const tempo = lista.reduce((a, i) => a + (duracaoConfiavel(i.duracao_sessao_min) ?? duracaoConfiavel(i.duracao_execucao_min) ?? 0), 0)
      if (tempo > 0) numeros.push(minutos(tempo))
      const cfg = MODALIDADES_CONFIG[modalidade as keyof typeof MODALIDADES_CONFIG]
      return { modalidade, rotulo: cfg.label, emoji: cfg.emoji, aulas: lista.filter((i) => !i.fora_da_cobranca).length, aDistanciaSemCobranca: lista.filter((i) => i.fora_da_cobranca).length, numeros, destaque }
    })
}

/** "3 aulas · 12,4 km · 95 min" */
export function textoResumoModalidade(r: ResumoModalidade): string {
  const aulas = r.aulas > 0 || r.aDistanciaSemCobranca === 0 ? [`${r.aulas} ${r.aulas === 1 ? 'aula' : 'aulas'}`] : []
  const distancia = r.aDistanciaSemCobranca > 0 ? [`${r.aDistanciaSemCobranca} ${r.aDistanciaSemCobranca === 1 ? 'treino à distância' : 'treinos à distância'}`] : []
  return [...aulas, ...distancia, ...r.numeros].join(' · ')
}

/** Aulas por semana em média, só quando o ciclo tem pelo menos 3 semanas de dados (antes disso a média engana). */
export function frequenciaMedia(itens: ItemRecibo[]): number | null {
  const semanas = frequenciaSemanal(itens)
  if (semanas.length < 3) return null
  const total = semanas.reduce((a, s) => a + s.valor, 0)
  return Math.round((total / semanas.length) * 10) / 10
}

/**
 * Assiduidade: aulas realizadas de aulas que contavam. Falta e cancelamento só entram na conta quando foram COBRADOS (o personal decide
 * isso aula a aula); sem nenhum deles, não há o que mostrar (null) e o relatório fica só com "aulas realizadas".
 */
export function assiduidade(itens: ItemRecibo[]): { realizadas: number; previstas: number; faltasCobradas: number } | null {
  const doCiclo = itens.filter((i) => !i.fora_da_cobranca)
  const realizadas = doCiclo.filter((i) => i.status === 'presente').length
  const faltasCobradas = doCiclo.filter((i) => (i.status === 'falta' || i.status === 'cancelou') && i.cobrar !== false).length
  return faltasCobradas > 0 ? { realizadas, previstas: realizadas + faltasCobradas, faltasCobradas } : null
}

/** Nota média do personal (0–10) e em quantos treinos; null se nenhum treino foi avaliado. */
export function notaMedia(itens: ItemRecibo[]): { media: number; treinos: number } | null {
  const notas = notasPorTreino(itens)
  if (notas.length === 0) return null
  return { media: Math.round((notas.reduce((a, n) => a + n.valor, 0) / notas.length) * 10) / 10, treinos: notas.length }
}

/** O gráfico de nota só aparece com 5 treinos avaliados ou mais; antes disso, vale a média. */
export const MINIMO_NOTAS_PARA_GRAFICO = 5
