import { somarDias } from '@/lib/datas'

/** "vence no fechamento", "vence 1 dia após fechar", "vence 5 dias após fechar" (antes: "vence 0 dias após fechar"). */
export function textoVencimento(dias: number): string {
  if (dias <= 0) return 'vence no fechamento'
  return `vence ${dias} ${dias === 1 ? 'dia' : 'dias'} após fechar`
}

/**
 * Vencimento da fatura: `dias` depois do FECHAMENTO. A conta parte do que vier depois, o fim do ciclo ou o dia em que o ciclo é fechado
 * (hoje). Partir só do fim do ciclo fazia a fatura de um ciclo fechado com atraso já nascer vencida (e disparar os avisos de atraso).
 */
export function vencimentoDaFatura(cicloFimISO: string, hojeISO: string, dias: number): string {
  const base = hojeISO > cicloFimISO ? hojeISO : cicloFimISO
  return dias > 0 ? somarDias(base, dias) : base
}
