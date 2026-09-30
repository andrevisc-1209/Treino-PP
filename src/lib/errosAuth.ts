// Traduz os erros do supabase.auth (login, cadastro, recuperação de senha,
// reenvio de confirmação) pra mensagens em português — o Supabase retorna
// tudo em inglês por padrão. Textos centralizados em mensagens.ts.

import { ERROS } from './mensagens'

type ErroAuth = { message?: unknown; code?: unknown; status?: unknown }

function comoObjeto(erro: unknown): ErroAuth {
  return typeof erro === 'object' && erro !== null ? (erro as ErroAuth) : {}
}

const MENSAGENS_POR_CODE: Record<string, string> = {
  invalid_credentials: ERROS.AUTH.credenciaisInvalidas,
  email_not_confirmed: ERROS.AUTH.emailNaoConfirmado,
  user_not_found: 'Não encontramos uma conta com esse e-mail.',
  user_banned: 'Esta conta está bloqueada. Fale com o suporte.',
  user_already_exists: ERROS.AUTH.emailDuplicado,
  email_exists: ERROS.AUTH.emailDuplicado,
  identity_already_exists: ERROS.AUTH.emailDuplicado,
  weak_password: ERROS.AUTH.senhaFraca,
  same_password: 'A nova senha precisa ser diferente da atual.',
  signup_disabled: 'Cadastro desativado no momento.',
  email_provider_disabled: 'Cadastro por e-mail desativado no momento.',
  email_address_invalid: 'E-mail inválido.',
  email_address_not_authorized: 'Esse e-mail não pode ser usado.',
  validation_failed: 'Dados inválidos. Confira os campos e tente de novo.',
  otp_expired: 'Link expirado. Peça um novo.',
  session_expired: ERROS.AUTH.sessaoExpirada,
  session_not_found: ERROS.AUTH.sessaoExpirada,
  refresh_token_not_found: ERROS.AUTH.sessaoExpirada,
  refresh_token_already_used: ERROS.AUTH.sessaoExpirada,
  flow_state_not_found: 'Este link não é mais válido. Peça um novo.',
  flow_state_expired: 'Este link expirou. Peça um novo.',
  captcha_failed: 'Verificação de segurança falhou. Recarregue a página e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_sms_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  request_timeout: 'A operação demorou demais. Tente de novo.',
  bad_jwt: ERROS.AUTH.sessaoExpirada,
  bad_json: 'Algo deu errado. Tente de novo.',
  reauthentication_needed: 'Por segurança, entre novamente antes de continuar.',
  reauthentication_not_valid: 'Código de confirmação incorreto.',
}

/** Chaves cujo texto original (não o code) indica limite de tentativas. */
const PADROES_DE_MENSAGEM: [RegExp, string][] = [
  [/failed to fetch|network|load failed/i, ERROS.REDE.semConexao],
  [/for security purposes.*after \d+ seconds?/i, 'Muitas tentativas em seguida. Aguarde um pouco e tente de novo.'],
  [/invalid login credentials/i, ERROS.AUTH.credenciaisInvalidas],
  [/email not confirmed/i, ERROS.AUTH.emailNaoConfirmado],
  [/user already registered/i, ERROS.AUTH.emailDuplicado],
  [/password should be at least/i, ERROS.AUTH.senhaFraca],
  [/email rate limit exceeded/i, 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.'],
  [/captcha/i, 'Verificação de segurança falhou. Recarregue a página e tente de novo.'],
  // Erro genérico que o Supabase devolve quando o trigger handle_new_user()
  // falha no signUp (ex.: CPF já cadastrado — o unique index dispara dentro
  // do trigger, e o GoTrue não repassa o detalhe original do Postgres pra
  // cá, só essa mensagem genérica).
  [/database error saving new user/i, ERROS.CPF.falhaNoCadastro],
]

export function mapearErroAuth(erro: unknown): string {
  const { message, code } = comoObjeto(erro)
  const msg = typeof message === 'string' ? message : String(erro ?? '')

  if (typeof code === 'string' && MENSAGENS_POR_CODE[code]) {
    return MENSAGENS_POR_CODE[code]
  }

  for (const [padrao, mensagem] of PADROES_DE_MENSAGEM) {
    if (padrao.test(msg)) return mensagem
  }

  return ERROS.AUTH.generico
}
