// Traduz os erros mais comuns do Supabase/PostgREST pra mensagens em
// português que fazem sentido pro personal, em vez do texto técnico cru
// (ex.: "duplicate key value violates unique constraint ..."). Textos
// centralizados em mensagens.ts.

import { ERROS } from './mensagens'
import { ErroAmigavel } from './erroAmigavel'

type ErroComoObjeto = { message?: unknown; code?: unknown; status?: unknown; details?: unknown }

function comoObjeto(erro: unknown): ErroComoObjeto {
  return typeof erro === 'object' && erro !== null ? (erro as ErroComoObjeto) : {}
}

export function mapearErroSupabase(erro: unknown): string {
  // mensagem já escrita para o usuário (ex.: a que a Edge Function devolveu): mostra como está
  if (erro instanceof ErroAmigavel) return erro.message
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
  // policy restritiva da assinatura (migration 20261052): texto próprio em vez do técnico "violates row-level security policy ..."
  if (msgMin.includes('assinatura_ativa_')) return ERROS.ASSINATURA.modoLeitura
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
  // mensagens da RPC atualizar_cpf (migration 20261048)
  if (code === 'P0001' && msgMin.includes('muitas tentativas de salvar o cpf')) return ERROS.CPF.tentativas
  if (code === 'P0001' && msgMin.includes('cpf inválido')) return ERROS.CPF.invalido
  if (code === 'P0001' && msgMin.includes('não foi possível salvar o cpf')) return ERROS.CPF.duplicado
  // trava do banco (migration 20261051): dado clínico só com consentimento ativo do aluno
  if (code === 'P0001' && msgMin.includes('não autorizou o registro de dados de saúde')) {
    return 'O aluno ainda não autorizou o registro de dados de saúde.'
  }
  if (msgMin.includes('_tamanho_chk')) {
    return 'Texto longo demais para este campo. Encurte e tente de novo.'
  }
  // trava do banco (migration 20261057): aluno só é apagado depois de arquivado
  if (code === 'P0001' && msgMin.includes('arquive o aluno antes de apagar')) return ERROS.ALUNO.arquivarAntes
  // lixeira de alunos (migration 20261059) e limite de relatos (20261060)
  if (code === 'P0001' && msgMin.includes('antes de mandar para a lixeira')) return ERROS.ALUNO.arquivarAntesLixeira
  if (code === 'P0001' && msgMin.includes('para a lixeira antes de apagar')) return ERROS.ALUNO.lixeiraAntes
  if (code === 'P0001' && msgMin.includes('restaure o aluno da lixeira')) return ERROS.ALUNO.restaurarAntes
  if (code === 'P0001' && msgMin.includes('vários relatos')) return 'Você já enviou vários relatos na última hora. Aguarde um pouco ou fale com a gente pelo WhatsApp.'
  // limites da cobrança do aluno (CHECKs de aluno_cobranca): diz QUAL campo estourou em vez do genérico
  if (textoCompleto.includes('aluno_cobranca_dia_ciclo')) return 'Dia do ciclo deve ser entre 1 e 28.'
  if (textoCompleto.includes('aluno_cobranca_dias_vencimento')) return 'Vencimento deve ser de 0 a 30 dias após o fechamento.'
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
