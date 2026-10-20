import { describe, expect, it } from 'vitest'
import { mapearErroSupabase } from './erros'
import { ERROS } from './mensagens'

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
  it('CPF duplicado vira mensagem genérica (não confirma que o CPF existe)', () => {
    expect(
      mapearErroSupabase({ code: '23505', message: 'duplicate key value violates unique constraint "idx_professionals_cpf"', details: 'Key (cpf)=(11144477735) already exists.' }),
    ).toBe(ERROS.CPF.duplicado)
    // genérica: não confirma que o CPF já existe
    expect(ERROS.CPF.duplicado).not.toMatch(/já cadastrado|já existe/i)
  })
  it('mapeia e-mail duplicado pelos details', () => {
    expect(
      mapearErroSupabase({ code: '23505', message: 'duplicate key value violates unique constraint "professionals_email_key"', details: 'Key (email)=(a@a.com) already exists.' }),
    ).toMatch(/e-mail já está cadastrado/i)
  })
  it('mapeia valor inválido (check constraint)', () => {
    expect(mapearErroSupabase({ code: '23514', message: 'violates check constraint' })).toMatch(/inválido/i)
    expect(mapearErroSupabase({ code: '23514', message: 'new row for relation "alunos" violates check constraint "alunos_name_tamanho_chk"' })).toMatch(/longo demais/i)
  })
  it('cai num texto genérico pra erro desconhecido', () => {
    expect(mapearErroSupabase(new Error('algo bem específico do Postgres'))).toMatch(/algo deu errado/i)
  })
  it('mensagens da RPC atualizar_cpf: inválido, limite de tentativas e colisão genérica', () => {
    expect(mapearErroSupabase({ code: 'P0001', message: 'CPF inválido.' })).toBe(ERROS.CPF.invalido)
    expect(mapearErroSupabase({ code: 'P0001', message: 'Muitas tentativas de salvar o CPF. Tente novamente amanhã.' })).toBe(ERROS.CPF.tentativas)
    expect(mapearErroSupabase({ code: 'P0001', message: 'Não foi possível salvar o CPF. Confira os dados ou fale com o suporte.' })).toBe(ERROS.CPF.duplicado)
    expect(mapearErroSupabase({ code: 'P0001', message: 'CPF não pode ser alterado após o cadastro' })).toBe(ERROS.CPF.imutavel)
  })
})
