import { describe, expect, it } from 'vitest'
import { confirmacaoValida, dataBR, lerSolicitacao, montarEmailExclusao } from './exclusaoConta'

describe('confirmacaoValida', () => {
  it('aceita EXCLUIR sem se importar com caixa ou espaço nas pontas', () => {
    expect(confirmacaoValida('EXCLUIR')).toBe(true)
    expect(confirmacaoValida('  excluir ')).toBe(true)
  })
  it('recusa o resto', () => {
    for (const v of ['', 'EXCLUI', 'EXCLUIR!', 'sim', null, undefined, 1, {}]) expect(confirmacaoValida(v)).toBe(false)
  })
})

describe('lerSolicitacao', () => {
  const ok = { protocolo: 'EXC-2026-ABCD2345', solicitada_em: '2026-10-28T12:00:00Z', prevista_em: '2026-11-27T12:00:00Z', ja_existia: false }
  it('lê a resposta do banco', () => expect(lerSolicitacao(ok)).toEqual(ok))
  it('recusa protocolo fora do formato ou campos ausentes', () => {
    expect(lerSolicitacao({ ...ok, protocolo: 'EXC-2026-ABCD234O' })).toBeNull()
    expect(lerSolicitacao({ ...ok, prevista_em: undefined })).toBeNull()
    expect(lerSolicitacao(null)).toBeNull()
  })
})

describe('e-mail de exclusão', () => {
  const m = montarEmailExclusao({ protocolo: 'EXC-2026-ABCD2345', prevista_em: '2026-11-27T15:00:00Z', appUrl: 'https://treino.personalperto.com.br' })
  it('traz protocolo, data prevista (dd/mm/aaaa), como cancelar e o que fica guardado', () => {
    expect(dataBR('2026-11-27T15:00:00Z')).toBe('27/11/2026')
    for (const t of [m.texto, m.html]) {
      expect(t).toContain('EXC-2026-ABCD2345')
      expect(t).toContain('27/11/2026')
      expect(t).toContain('Cancelar exclusão')
      expect(t).toContain('5 anos')
    }
    expect(m.assunto).toContain('EXC-2026-ABCD2345')
    expect(m.html).toContain('logo-email-branco.png')
  })
  it('não cita dado de aluno nem de saúde', () => {
    expect(m.texto + m.html).not.toMatch(/lesão|cirurgia|medicamento|\bCPF:/i)
  })
  it('escapa HTML no que vem de fora', () => {
    const x = montarEmailExclusao({ protocolo: 'EXC-2026-ABCD2345', prevista_em: '2026-11-27T15:00:00Z', appUrl: 'https://x.com/"><script>' })
    expect(x.html).not.toContain('<script>')
  })
})
