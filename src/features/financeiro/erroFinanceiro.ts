import { ErroAmigavel } from '@/lib/erroAmigavel'
import { somarDias } from '@/lib/datas'

/** O ciclo daquele aluno/período já tem fatura (não cancelada): só pode existir uma por período. */
export class CicloJaFechadoError extends Error {
  constructor() {
    super('Este ciclo já foi encerrado.')
    this.name = 'CicloJaFechadoError'
  }
}

/** Tentativa de fechar um ciclo que ainda não terminou (só se fecha a partir do dia seguinte ao último dia do ciclo). */
export class CicloNaoTerminouError extends Error {
  constructor(periodoFim: string) {
    const aberto = somarDias(periodoFim, 1)
    super(`Este ciclo termina em ${periodoFim.slice(8, 10)}/${periodoFim.slice(5, 7)}. Você poderá fechá-lo a partir de ${aberto.slice(8, 10)}/${aberto.slice(5, 7)}.`)
    this.name = 'CicloNaoTerminouError'
  }
}

/**
 * Traduz o erro de uma função do financeiro (fechar_ciclo, cancelar_fatura) para o que o app mostra. As regras de negócio do banco
 * (SQLSTATE P0001) já vêm com a mensagem em português: viram `ErroAmigavel`; "ciclo já encerrado" vira o erro próprio da tela.
 * Qualquer outro erro (rede, permissão, assinatura) segue como veio, para `mapearErroSupabase` tratar.
 */
export function traduzirErroFinanceiro(erro: unknown): unknown {
  const e = erro as { code?: unknown; message?: unknown } | null
  if (e && e.code === 'P0001' && typeof e.message === 'string') {
    if (/já foi encerrado/i.test(e.message)) return new CicloJaFechadoError()
    return new ErroAmigavel(e.message)
  }
  return erro
}
