// Traduz os erros mais comuns do Supabase/PostgREST pra mensagens em
// português que fazem sentido pro personal, em vez do texto técnico cru
// (ex.: "duplicate key value violates unique constraint ..."). Textos
// centralizados em mensagens.ts.

import { ERROS } from './mensagens'

type ErroComoObjeto = { message?: unknown; code?: unknown; status?: unknown; details?: unknown }

function comoObjeto(erro: unknown): ErroComoObjeto {
  return typeof erro === 'object' && erro !== null ? (erro as ErroComoObjeto) : {}
}

export function mapearErroSupabase(erro: unknown): string {
  const { message, code, status, details } = comoObjeto(erro)
  const msg = typeof message === 'string' ? message : String(erro ?? '')
  const msgMin = msg.toLowerCase()
  const detailsMin = (typeof details === 'string' ? details : '').toLowerCase()
  const textoCompleto = `${msgMin} ${detailsMin}`

  if (msgMin.includes('failed to fetch') || msgMin.includes('network') || msgMin.includes('load failed')) {
    return ERROS.REDE.semConexao
  }
  if (msgMin.includes('sessão expirada') || msgMin.includes('jwt expired') || status === 401) {
    return ERROS.AUTH.sessaoExpirada
  }
  if (code === '42501' || msgMin.includes('row-level security') || msgMin.includes('permission denied') || status === 403) {
    return 'Você não tem permissão para fazer isso.'
  }
  if (code === '23505' || msgMin.includes('duplicate key') || msgMin.includes('already exists')) {
    if (textoCompleto.includes('cpf')) return ERROS.CPF.duplicado
    if (textoCompleto.includes('email')) return ERROS.AUTH.emailDuplicado
    return 'Já existe um registro com esses dados.'
  }
  if (code === 'P0001' && msgMin.includes('cpf não pode ser alterado')) {
    return ERROS.CPF.imutavel
  }
  if (code === '23514' || msgMin.includes('violates check constraint')) {
    return 'Valor inválido para este campo.'
  }
  if (code === '23503' || msgMin.includes('violates foreign key constraint')) {
    return 'Esse item está sendo usado em outro lugar e não pode ser alterado assim.'
  }
  if (msgMin.includes('violates not-null constraint')) {
    return ERROS.FORM.obrigatorio
  }

  return ERROS.REDE.generico
}
