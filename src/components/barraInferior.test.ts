import { describe, expect, it } from 'vitest'
import { lerVarianteDaBarra, ordemDaBarra } from './barraInferior'

describe('barra inferior', () => {
  it('padrão: Hoje em primeiro', () => {
    expect(ordemDaBarra('padrao').map((i) => i.label)).toEqual(['Hoje', 'Agenda', 'Alunos', 'Treinos', 'Financeiro'])
  })
  it('centro: Hoje no meio, os outros mantêm a ordem', () => {
    expect(ordemDaBarra('centro').map((i) => i.label)).toEqual(['Agenda', 'Alunos', 'Hoje', 'Treinos', 'Financeiro'])
  })
  it('a URL manda; sem ela vale o que ficou guardado; sem escolha, Hoje no centro', () => {
    expect(lerVarianteDaBarra('?barra=centro', null)).toBe('centro')
    expect(lerVarianteDaBarra('?barra=padrao', 'centro')).toBe('padrao')
    expect(lerVarianteDaBarra('', 'padrao')).toBe('padrao')
    expect(lerVarianteDaBarra('', 'centro')).toBe('centro')
    expect(lerVarianteDaBarra('', null)).toBe('centro')
    expect(lerVarianteDaBarra('?barra=xyz', null)).toBe('centro')
  })
})
