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
  it('mapeia tentativa de alterar CPF (trigger tg_bloquear_cpf)', () => {
    expect(mapearErroSupabase({ code: 'P0001', message: 'CPF não pode ser alterado após o cadastro' })).toMatch(/não pode ser alterado/i)
  })
  it('mapeia CPF duplicado pelo nome do índice/coluna nos details', () => {
    expect(
      mapearErroSupabase({ code: '23505', message: 'duplicate key value violates unique constraint "idx_professionals_cpf"', details: 'Key (cpf)=(11144477735) already exists.' }),
    ).toMatch(/cpf já cadastrado/i)
  })
  it('mapeia e-mail duplicado pelos details', () => {
    expect(
      mapearErroSupabase({ code: '23505', message: 'duplicate key value violates unique constraint "professionals_email_key"', details: 'Key (email)=(a@a.com) already exists.' }),
    ).toMatch(/e-mail já está cadastrado/i)
  })
  it('mapeia valor inválido (check constraint)', () => {
    expect(mapearErroSupabase({ code: '23514', message: 'violates check constraint' })).toMatch(/inválido/i)
  })
  it('cai num texto genérico pra erro desconhecido', () => {
    expect(mapearErroSupabase(new Error('algo bem específico do Postgres'))).toMatch(/algo deu errado/i)
  })
})
