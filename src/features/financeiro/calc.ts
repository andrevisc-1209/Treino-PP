// Lógica pura do financeiro: ciclo de cobrança, itens cobráveis do
// ciclo, totais e divisão de valor em grupo. Sem I/O.

import { dataSP, somarDias } from '@/lib/datas'

export type Ciclo = { inicio: string; fim: string }

function dataISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Ciclo (mensal) que contém `hojeISO`, dado o dia em que ele começa (1–28). Ex.: dia 10 → 10/set a 09/out. */
export function cicloAtual(diaCiclo: number, hojeISO: string): Ciclo {
  const [ano, mes, dia] = hojeISO.split('-').map(Number)
  let anoIni = ano
  let mesIni = mes
  if (dia < diaCiclo) {
    mesIni -= 1
    if (mesIni === 0) {
      mesIni = 12
      anoIni -= 1
    }
  }
  const inicio = dataISO(anoIni, mesIni, diaCiclo)

  let anoFim = anoIni
  let mesFim = mesIni + 1
  if (mesFim === 13) {
    mesFim = 1
    anoFim += 1
  }
  const proximoInicio = dataISO(anoFim, mesFim, diaCiclo)
  const fim = somarDias(proximoInicio, -1)

  return { inicio, fim }
}

export type ParticipacaoParaFechamento = {
  id: string
  cobrar: boolean | null
  valor: number | null
  fatura_id: string | null
  aula_starts_at: string
}

/** Participações ainda não faturadas, cobráveis, com a aula dentro do ciclo. */
export function itensCobraveisDoCiclo<T extends ParticipacaoParaFechamento>(participacoes: T[], ciclo: Ciclo): T[] {
  return participacoes.filter((p) => {
    if (p.fatura_id !== null) return false
    if (p.cobrar !== true) return false
    const data = dataSP(p.aula_starts_at)
    return data >= ciclo.inicio && data <= ciclo.fim
  })
}

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Total do modelo "por aula": soma dos valores dos itens + ajuste. */
export function totalPorAula(itens: { valor: number | null }[], ajuste: number): number {
  const soma = itens.reduce((acc, i) => acc + (i.valor ?? 0), 0)
  return arredondar2(soma + ajuste)
}

/** Total do modelo "mensal": valor da mensalidade + ajuste (as aulas do ciclo entram só como informação). */
export function totalMensal(valorMensal: number, ajuste: number): number {
  return arredondar2(valorMensal + ajuste)
}

/** Divide um valor total igualmente entre N participantes; a sobra de centavos fica com o último. */
export function dividirValor(total: number, n: number): number[] {
  if (n <= 0) return []
  const totalCentavos = Math.round(total * 100)
  const baseCentavos = Math.floor(totalCentavos / n)
  const resto = totalCentavos - baseCentavos * n
  const valores = Array.from({ length: n }, () => baseCentavos)
  valores[n - 1] += resto
  return valores.map((c) => c / 100)
}
