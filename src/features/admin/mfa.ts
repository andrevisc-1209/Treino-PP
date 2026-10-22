import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Nível de garantia da sessão: aal1 = só senha/Google; aal2 = também o código do autenticador (TOTP). */
export type NivelAal = 'aal1' | 'aal2' | null

export type EstadoMfa = 'sem_fator' | 'precisa_codigo' | 'ok'

/**
 * O que o painel admin deve fazer com a sessão atual:
 *  - sem fator cadastrado → 'sem_fator' (E1: segue, com aviso para ativar; a exigência no servidor vem na etapa seguinte);
 *  - fator cadastrado mas a sessão ainda é aal1 → 'precisa_codigo' (pede o código de 6 dígitos antes de abrir o painel);
 *  - fator cadastrado e sessão aal2 → 'ok'.
 */
export function estadoMfa(args: { nivelAtual: NivelAal; temFatorVerificado: boolean }): EstadoMfa {
  if (!args.temFatorVerificado) return 'sem_fator'
  return args.nivelAtual === 'aal2' ? 'ok' : 'precisa_codigo'
}

/** Código do autenticador: exatamente 6 dígitos. */
export const codigoMfaValido = (v: string): boolean => /^\d{6}$/.test(v)

export type FatorMfa = { id: string; nome: string; criadoEm: string }

export type DadosMfa = { estado: EstadoMfa; nivelAtual: NivelAal; fatores: FatorMfa[] }

async function carregarMfa(): Promise<DadosMfa> {
  const [{ data: aal, error: erroAal }, { data: lista, error: erroLista }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])
  if (erroAal) throw erroAal
  if (erroLista) throw erroLista
  const fatores = (lista?.totp ?? []).map((f) => ({ id: f.id, nome: f.friendly_name ?? 'Autenticador', criadoEm: f.created_at }))
  const nivelAtual = (aal?.currentLevel as NivelAal) ?? null
  return { estado: estadoMfa({ nivelAtual, temFatorVerificado: fatores.length > 0 }), nivelAtual, fatores }
}

const CHAVE = ['admin', 'mfa'] as const

/** Estado do segundo fator da sessão atual (fatores TOTP verificados + nível aal). */
export function useMfa() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: CHAVE, queryFn: carregarMfa, staleTime: 0, retry: false })
  return { ...query, recarregar: () => qc.invalidateQueries({ queryKey: CHAVE }) }
}

export type CadastroMfa = { factorId: string; qrCode: string; segredo: string }

/** Inicia o cadastro de um autenticador (TOTP): devolve o QR Code e a chave em texto (para guardar em um gerenciador de senhas ou em um 2º aparelho). */
export async function iniciarCadastroMfa(): Promise<CadastroMfa> {
  // limpa tentativas interrompidas (fatores não verificados): senão o cadastro novo pode falhar por nome repetido
  const { data: lista } = await supabase.auth.mfa.listFactors()
  for (const f of lista?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Autenticador ${new Date().toISOString().slice(0, 16).replace('T', ' ')}` })
  if (error || !data) throw error ?? new Error('Não foi possível iniciar o cadastro.')
  return { factorId: data.id, qrCode: data.totp.qr_code, segredo: data.totp.secret }
}

/** Confere o código de 6 dígitos (cadastro e login do admin). Se certo, a sessão passa a aal2. */
export async function verificarCodigoMfa(factorId: string, codigo: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo })
  if (error) throw error
}

export async function removerFatorMfa(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw error
}

/** Mensagem em português para o erro do código (o Supabase devolve em inglês). */
export function mensagemErroMfa(erro: unknown): string {
  const e = (typeof erro === 'object' && erro !== null ? erro : {}) as { message?: unknown; code?: unknown }
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  if (e.code === 'mfa_verification_failed' || msg.includes('invalid totp') || msg.includes('verification failed')) return 'Código incorreto. Confira o código no aplicativo e tente de novo.'
  if (e.code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  return 'Não foi possível confirmar o código. Tente de novo.'
}
