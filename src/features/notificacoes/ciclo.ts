import { formatarBRL } from '@/lib/moeda'

export type PayloadCiclo = { periodo_inicio?: string; periodo_fim?: string; total?: number; modelo?: 'por_aula' | 'mensal' }

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** "10/09 a 09/10" */
export function periodoDoCiclo(p: PayloadCiclo): string {
  return p.periodo_inicio && p.periodo_fim ? `${dm(p.periodo_inicio)} a ${dm(p.periodo_fim)}` : 'do mês'
}

/** "O ciclo de 10/09 a 09/10 fechou. Encerre o mês e envie o resumo com o valor de R$ 600,00." */
export function textoCicloEncerrado(p: PayloadCiclo): string {
  const valor = typeof p.total === 'number' ? ` com o valor de ${formatarBRL(p.total)}` : ''
  return `O ciclo de ${periodoDoCiclo(p)} fechou. Encerre o mês e envie o resumo${valor}.`
}

/** Link do botão "Encerrar mês": abre o fechamento daquele ciclo (ref = início do ciclo). */
export function linkEncerrarMes(alunoId: string, p: PayloadCiclo): string {
  return `/alunos/${alunoId}/fechar-ciclo${p.periodo_inicio ? `?ref=${p.periodo_inicio}` : ''}`
}
