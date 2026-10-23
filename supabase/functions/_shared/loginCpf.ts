// Regras puras do login com CPF (sem I/O, testáveis no vitest). O index.ts da função login-cpf só orquestra.

export const MSG_CREDENCIAIS = 'CPF ou senha incorretos. Se você acabou de criar a conta, confirme o e-mail antes de entrar.'
export const MSG_LIMITE = 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
export const MSG_CAPTCHA = 'Não foi possível confirmar que você não é um robô. Tente de novo.'

/** Limites (janela fixa): por IP e por CPF. Passou, responde a mesma mensagem exista o CPF ou não. Não tranca a conta. */
export const LIMITE_IP = { max: 30, janelaSeg: 3600 }
export const LIMITE_CPF = { max: 10, janelaSeg: 900 }
export const LIMITE_SEM_IP = { max: 100, janelaSeg: 3600 }

/** Tempo mínimo (ms, contado desde o início do pedido) de toda falha de credencial: sem isso, "CPF com conta" demora mais que "sem conta" e o tempo revela quem existe. */
export const PISO_FALHA_MS = 3000

/** Quanto ainda falta esperar para a falha chegar ao piso (0 se já passou). */
export const esperaAteOPiso = (decorridoMs: number): number => Math.max(0, PISO_FALHA_MS - Math.max(0, decorridoMs))

export const normalizarCpf = (valor: unknown): string => (typeof valor === 'string' ? valor.replace(/\D/g, '') : '')

/** Dígitos verificadores (módulo 11), igual a src/lib/cpf.ts e treino.cpf_valido(). Rejeita sequências repetidas. */
export function cpfValido(valor: string): boolean {
  if (!/^\d{11}$/.test(valor) || /^(\d)\1{10}$/.test(valor)) return false
  const dv = (base: string, peso: number) => {
    const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (peso - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return dv(valor.slice(0, 9), 10) === Number(valor[9]) && dv(valor.slice(0, 10), 11) === Number(valor[10])
}

export type PedidoLogin = { cpf: string; password: string; captchaToken: string | undefined }

/** Lê o corpo sem confiar em nada: devolve null se faltar algo ou vier fora do formato. */
export function lerPedido(corpo: unknown): PedidoLogin | null {
  if (typeof corpo !== 'object' || corpo === null) return null
  const { cpf, password, captchaToken } = corpo as Record<string, unknown>
  const digitos = normalizarCpf(cpf)
  if (!cpfValido(digitos)) return null
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) return null
  if (captchaToken !== undefined && (typeof captchaToken !== 'string' || captchaToken.length > 4096)) return null
  return { cpf: digitos, password, captchaToken: captchaToken || undefined }
}

export type DestinoErroAuth = 'captcha' | 'limite' | 'credenciais'

/** O que o erro do Auth vira para o cliente. Conta inexistente, senha errada, só-Google e e-mail não confirmado caem todos em 'credenciais'. */
export function classificarErroAuth(erro: { status?: number; code?: string; message?: string }): DestinoErroAuth {
  const code = erro.code ?? ''
  if (code === 'captcha_failed' || /captcha/i.test(erro.message ?? '')) return 'captcha'
  if (erro.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'limite'
  return 'credenciais'
}

export type FalhaLogin = { status: number; corpo: { error: string } }

/** Único construtor de resposta de falha: o mesmo status e a mesma mensagem para qualquer motivo de credencial. */
export function falhaLogin(destino: DestinoErroAuth | 'pedido'): FalhaLogin {
  if (destino === 'captcha') return { status: 400, corpo: { error: MSG_CAPTCHA } }
  if (destino === 'limite') return { status: 429, corpo: { error: MSG_LIMITE } }
  return { status: 401, corpo: { error: MSG_CREDENCIAIS } }
}
