// Lógica pura do Mercado Pago (sem APIs do Deno) — compartilhada entre
// mp-subscribe e mp-webhook e testável com vitest.

export type Plano = 'mensal' | 'trimestral' | 'semestral'
export type StatusAssinatura = 'ativa' | 'expirada' | 'cancelada'

// Fonte única de preço/periodicidade do lado do servidor: o cliente só manda o
// NOME do plano, nunca valor nem frequência.
export const PLANOS: Record<Plano, { reason: string; frequency: number; amount: number }> = {
  mensal: { reason: 'Treino PP Mensal', frequency: 1, amount: 10 },
  trimestral: { reason: 'Treino PP Trimestral', frequency: 3, amount: 27 },
  semestral: { reason: 'Treino PP Semestral', frequency: 6, amount: 50 },
}

export function ehPlano(v: unknown): v is Plano {
  return v === 'mensal' || v === 'trimestral' || v === 'semestral'
}

export function planoPorFrequencia(meses: number | undefined): Plano | null {
  const achado = (Object.entries(PLANOS) as [Plano, (typeof PLANOS)[Plano]][]).find(([, p]) => p.frequency === meses)
  return achado ? achado[0] : null
}

/** Status do preapproval no MP -> status em treino.assinaturas. null = ignorar (ex.: pending). */
export function statusDoMP(status: string | undefined): StatusAssinatura | null {
  if (status === 'authorized') return 'ativa'
  if (status === 'cancelled') return 'cancelada'
  if (status === 'paused') return 'expirada'
  return null
}

/** Fim do período pago = próxima cobrança + folga (renovação atrasada não bloqueia o app na hora). */
export function fimDoPeriodo(nextPaymentDate: string | undefined, folgaDias = 5): string | null {
  if (!nextPaymentDate) return null
  const t = new Date(nextPaymentDate).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + folgaDias * 86_400_000).toISOString()
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** card_token do MP (Bricks): 32 caracteres hexadecimais. */
export function tokenDeCartaoValido(v: unknown): v is string {
  return typeof v === 'string' && /^[a-f0-9]{32}$/i.test(v)
}

export type PreapprovalMP = {
  id?: string | number
  status?: string
  external_reference?: string
  next_payment_date?: string
  auto_recurring?: { frequency?: number }
}

/** O que gravar em treino.assinaturas a partir de um preapproval do MP. null = nada a fazer. */
export function atualizacaoDoPreapproval(
  pre: PreapprovalMP,
): { professionalId: string; atualizacao: Record<string, unknown> } | null {
  const status = statusDoMP(pre.status)
  const professionalId = pre.external_reference
  if (!status || !professionalId || !UUID.test(professionalId)) return null
  const atualizacao: Record<string, unknown> = { status, mp_subscription_id: String(pre.id) }
  if (status === 'ativa') {
    atualizacao.plano = planoPorFrequencia(pre.auto_recurring?.frequency)
    atualizacao.assinatura_fim = fimDoPeriodo(pre.next_payment_date)
  }
  return { professionalId, atualizacao }
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Valida o header x-signature do webhook do MP:
 *   manifest = "id:<data.id minúsculo>;request-id:<x-request-id>;ts:<ts>;"
 *   v1 = HMAC-SHA256(manifest, segredo do webhook)
 */
export async function assinaturaValida(args: {
  secret: string
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): Promise<boolean> {
  const { secret, xSignature, xRequestId, dataId } = args
  if (!xSignature || !xRequestId || !dataId) return false
  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  )
  if (!partes.ts || !partes.v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${partes.ts};`
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const esperado = hex(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifest)))
  if (esperado.length !== partes.v1.length) return false
  let diff = 0
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ partes.v1.charCodeAt(i)
  return diff === 0
}
