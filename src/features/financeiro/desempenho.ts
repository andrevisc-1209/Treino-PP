import type { Fatura } from './api'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export type PontoReceita = { mes: string; rotulo: string; total: number }

/** Recebido (faturas pagas, pela data do pagamento) nos últimos `n` meses terminando em `hoje` (YYYY-MM-DD). */
export function recebidoPorMes(faturas: Pick<Fatura, 'status' | 'paga_em' | 'total'>[], hoje: string, n = 6): PontoReceita[] {
  const [ano, mes] = hoje.split('-').map(Number)
  const pontos: PontoReceita[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - 1 - i, 1))
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const total = faturas.filter((f) => f.status === 'paga' && f.paga_em?.startsWith(chave)).reduce((a, f) => a + f.total, 0)
    pontos.push({ mes: chave, rotulo: MESES[d.getUTCMonth()], total })
  }
  return pontos
}
