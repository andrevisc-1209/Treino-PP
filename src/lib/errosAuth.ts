// Traduz os erros do supabase.auth (login, cadastro, recuperação de senha,
// reenvio de confirmação) pra mensagens em português — o Supabase retorna
// tudo em inglês por padrão.

type ErroAuth = { message?: unknown; code?: unknown; status?: unknown }

function comoObjeto(erro: unknown): ErroAuth {
  return typeof erro === 'object' && erro !== null ? (erro as ErroAuth) : {}
}

const MENSAGENS_POR_CODE: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_not_found: 'Não encontramos uma conta com esse e-mail.',
  user_banned: 'Esta conta está bloqueada. Fale com o suporte.',
  user_already_exists: 'Esse e-mail já está cadastrado. Tente entrar ou recuperar a senha.',
  email_exists: 'Esse e-mail já está cadastrado. Tente entrar ou recuperar a senha.',
  identity_already_exists: 'Esse e-mail já está cadastrado. Tente entrar ou recuperar a senha.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  signup_disabled: 'Cadastro desativado no momento.',
  email_provider_disabled: 'Cadastro por e-mail desativado no momento.',
  email_address_invalid: 'E-mail inválido.',
  email_address_not_authorized: 'Esse e-mail não pode ser usado.',
  validation_failed: 'Dados inválidos. Confira os campos e tente de novo.',
  otp_expired: 'Link expirado. Peça um novo.',
  session_expired: 'Sua sessão expirou. Entre novamente.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
  refresh_token_already_used: 'Sua sessão expirou. Entre novamente.',
  flow_state_not_found: 'Este link não é mais válido. Peça um novo.',
  flow_state_expired: 'Este link expirou. Peça um novo.',
  captcha_failed: 'Verificação de segurança falhou. Recarregue a página e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  over_sms_send_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  request_timeout: 'A operação demorou demais. Tente de novo.',
  bad_jwt: 'Sua sessão expirou. Entre novamente.',
  bad_json: 'Algo deu errado. Tente de novo.',
  reauthentication_needed: 'Por segurança, entre novamente antes de continuar.',
  reauthentication_not_valid: 'Código de confirmação incorreto.',
}

/** Chaves cujo texto original (não o code) indica limite de tentativas. */
const PADROES_DE_MENSAGEM: [RegExp, string][] = [
  [/failed to fetch|network|load failed/i, 'Sem conexão com a internet. Verifique o sinal e tente de novo.'],
  [/for security purposes.*after \d+ seconds?/i, 'Muitas tentativas em seguida. Aguarde um pouco e tente de novo.'],
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar.'],
  [/user already registered/i, 'Esse e-mail já está cadastrado. Tente entrar ou recuperar a senha.'],
  [/password should be at least/i, 'Senha fraca. Use pelo menos 8 caracteres.'],
  [/email rate limit exceeded/i, 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.'],
  [/captcha/i, 'Verificação de segurança falhou. Recarregue a página e tente de novo.'],
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

  return 'Não foi possível concluir. Tente de novo.'
}
