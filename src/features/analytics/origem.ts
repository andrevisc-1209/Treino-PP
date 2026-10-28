// Origem do cadastro (UTM, primeiro toque). A landing (/landing.html, mesma origem do app) e o /login guardam utm_source/medium/campaign
// no localStorage na primeira visita; depois de entrar, o app manda isso UMA vez ao servidor (treino.registrar_origem_cadastro, migration
// 20261079), que só aceita conta nova. Sem origem = "direto". Quem já tem sessão abrindo um link não conta (é conta existente).
// O script da landing grava o MESMO formato: {"s": source, "m": medium, "c": campaign, "t": instante}.

export const CHAVE_ORIGEM = 'treino_origem'

export type Origem = { source: string; medium: string | null; campaign: string | null }

const limpar = (v: string | null): string => (v ?? '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 60)

/** Origem dos parâmetros do link (?utm_source=…); null se não há utm_source válido. */
export function origemDoLink(search: string): Origem | null {
  const p = new URLSearchParams(search)
  const source = limpar(p.get('utm_source'))
  if (!source) return null
  return { source, medium: limpar(p.get('utm_medium')) || null, campaign: limpar(p.get('utm_campaign')) || null }
}

function armazenamento(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Guarda a origem do link se ainda não há uma guardada (primeiro toque vence) e se a pessoa NÃO está logada. */
export function guardarOrigemDoLink(search: string, haSessao: boolean, agora: number = Date.now()): void {
  if (haSessao) return
  const origem = origemDoLink(search)
  if (!origem) return
  const store = armazenamento()
  try {
    if (store?.getItem(CHAVE_ORIGEM)) return
    store?.setItem(CHAVE_ORIGEM, JSON.stringify({ s: origem.source, m: origem.medium, c: origem.campaign, t: agora }))
  } catch {
    /* sem armazenamento: a origem se perde e o cadastro conta como direto */
  }
}

export function lerOrigemGuardada(): Origem | null {
  try {
    const bruto = armazenamento()?.getItem(CHAVE_ORIGEM)
    if (!bruto) return null
    const o = JSON.parse(bruto) as { s?: unknown; m?: unknown; c?: unknown }
    const source = limpar(typeof o.s === 'string' ? o.s : null)
    if (!source) return null
    return { source, medium: limpar(typeof o.m === 'string' ? o.m : null) || null, campaign: limpar(typeof o.c === 'string' ? o.c : null) || null }
  } catch {
    return null
  }
}

export function limparOrigemGuardada(): void {
  try {
    armazenamento()?.removeItem(CHAVE_ORIGEM)
  } catch {
    /* idem */
  }
}
