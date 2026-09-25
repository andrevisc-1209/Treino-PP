// Traduz os erros mais comuns do Supabase/PostgREST pra mensagens em
// português que fazem sentido pro personal, em vez do texto técnico cru
// (ex.: "duplicate key value violates unique constraint ...").

type ErroComoObjeto = { message?: unknown; code?: unknown; status?: unknown }

function comoObjeto(erro: unknown): ErroComoObjeto {
  return typeof erro === 'object' && erro !== null ? (erro as ErroComoObjeto) : {}
}

export function mapearErroSupabase(erro: unknown): string {
  const { message, code, status } = comoObjeto(erro)
  const msg = typeof message === 'string' ? message : String(erro ?? '')
  const msgMin = msg.toLowerCase()

  if (msgMin.includes('failed to fetch') || msgMin.includes('network') || msgMin.includes('load failed')) {
    return 'Sem conexão com a internet. Verifique o sinal e tente de novo.'
  }
  if (msgMin.includes('sessão expirada') || msgMin.includes('jwt expired') || status === 401) {
    return 'Sua sessão expirou. Saia e entre de novo.'
  }
  if (code === '42501' || msgMin.includes('row-level security') || msgMin.includes('permission denied') || status === 403) {
    return 'Você não tem permissão para fazer isso.'
  }
  if (code === '23505' || msgMin.includes('duplicate key') || msgMin.includes('already exists')) {
    return 'Já existe um registro com esses dados.'
  }
  if (code === '23514' || msgMin.includes('violates check constraint')) {
    return 'Valor inválido para este campo.'
  }
  if (code === '23503' || msgMin.includes('violates foreign key constraint')) {
    return 'Esse item está sendo usado em outro lugar e não pode ser alterado assim.'
  }
  if (msgMin.includes('violates not-null constraint')) {
    return 'Preencha todos os campos obrigatórios.'
  }

  return 'Algo deu errado. Tente de novo.'
}
