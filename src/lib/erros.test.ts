import { describe, expect, it } from 'vitest'
import { mapearErroSupabase } from './erros'

describe('mapearErroSupabase', () => {
  it('mapeia falha de rede', () => {
    expect(mapearErroSupabase(new Error('Failed to fetch'))).toMatch(/conexão/i)
  })
  it('mapeia sessão expirada', () => {
    expect(mapearErroSupabase(new Error('Sessão expirada'))).toMatch(/sessão/i)
  })
  it('mapeia RLS/permissão pelo code do Postgres', () => {
    expect(mapearErroSupabase({ code: '42501', message: 'permission denied for table x' })).toMatch(/permissão/i)
  })
  it('mapeia duplicidade (unique constraint)', () => {
    expect(mapearErroSupabase({ code: '23505', message: 'duplicate key value violates unique constraint' })).toMatch(/já existe/i)
  })
  it('mapeia valor inválido (check constraint)', () => {
    expect(mapearErroSupabase({ code: '23514', message: 'violates check constraint' })).toMatch(/inválido/i)
  })
  it('cai num texto genérico pra erro desconhecido', () => {
    expect(mapearErroSupabase(new Error('algo bem específico do Postgres'))).toBe('Algo deu errado. Tente de novo.')
  })
})
