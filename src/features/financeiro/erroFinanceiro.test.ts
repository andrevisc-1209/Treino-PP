import { describe, expect, it } from 'vitest'
import { ErroAmigavel } from '@/lib/erroAmigavel'
import { CicloJaFechadoError, CicloNaoTerminouError, traduzirErroFinanceiro } from './erroFinanceiro'

describe('traduzirErroFinanceiro', () => {
  it('regra de negócio do banco (P0001) vira mensagem amigável, igual ao texto do banco', () => {
    const e = traduzirErroFinanceiro({ code: 'P0001', message: 'Esta fatura não pode ser cancelada agora: se está paga, desfaça o pagamento antes.' })
    expect(e).toBeInstanceOf(ErroAmigavel)
    expect((e as Error).message).toContain('desfaça o pagamento antes')
  })
  it('"ciclo já encerrado" vira o erro próprio da tela', () => {
    expect(traduzirErroFinanceiro({ code: 'P0001', message: 'Este ciclo já foi encerrado.' })).toBeInstanceOf(CicloJaFechadoError)
  })
  it('qualquer outro erro (rede, permissão, assinatura) segue como veio', () => {
    const rede = { message: 'Failed to fetch' }
    const permissao = { code: '42501', message: 'new row violates row-level security policy' }
    expect(traduzirErroFinanceiro(rede)).toBe(rede)
    expect(traduzirErroFinanceiro(permissao)).toBe(permissao)
    expect(traduzirErroFinanceiro(null)).toBeNull()
  })
})

describe('CicloNaoTerminouError', () => {
  it('diz quando o ciclo termina e quando poderá ser fechado', () => {
    expect(new CicloNaoTerminouError('2026-10-31').message).toBe('Este ciclo termina em 31/10. Você poderá fechá-lo a partir de 01/11.')
  })
})
