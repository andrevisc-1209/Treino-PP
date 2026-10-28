// Mês do relatório mensal de acompanhamento: opções do seletor, primeiro e último dia. Sem I/O.

import { ultimoDiaDoMes } from './previsaoDoMes'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const

export type MesRelatorio = { valor: string; rotulo: string }

/** "2026-10" → "outubro de 2026" */
export function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} de ${ano}`
}

/** Últimos 12 meses (o atual primeiro), no formato AAAA-MM. Um seletor comum, porque nem todo navegador tem campo de mês. */
export function mesesDisponiveis(hojeISO: string, quantidade = 12): MesRelatorio[] {
  let [ano, mes] = hojeISO.split('-').map(Number)
  const lista: MesRelatorio[] = []
  for (let i = 0; i < quantidade; i++) {
    const valor = `${ano}-${String(mes).padStart(2, '0')}`
    lista.push({ valor, rotulo: rotuloDoMes(valor) })
    mes -= 1
    if (mes === 0) {
      mes = 12
      ano -= 1
    }
  }
  return lista
}

/** O mês anterior ao de hoje (o relatório mensal costuma ser feito depois que o mês fecha). */
export function mesAnterior(hojeISO: string): string {
  return mesesDisponiveis(hojeISO, 2)[1].valor
}

export function primeiroDiaDoMes(mes: string): string {
  return `${mes}-01`
}

export function ultimoDiaDoMesRelatorio(mes: string): string {
  return ultimoDiaDoMes(`${mes}-01`)
}
