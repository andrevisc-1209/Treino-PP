// Cupom de parceiro: um código dá N dias grátis a uma conta NOVA (regra, limite e período no banco: migration 20261105).
// Aqui só o que é puro: código, link, a guarda do código até a pessoa entrar e as mensagens de cada resposta do servidor.

export const CHAVE_CUPOM = 'treino_cupom'
const FORMATO = /^[A-Z0-9]{4,20}$/

/** Limpa e valida o código (maiúsculas, sem espaço nem hífen). Devolve null se não tiver o formato certo. */
export function normalizarCupom(valor: string | null | undefined): string | null {
  const c = (valor ?? '').toUpperCase().replace(/[\s-]/g, '')
  return FORMATO.test(c) ? c : null
}

/** Link para o parceiro divulgar: abre direto no cadastro com o cupom preenchido e a origem (UTM) da campanha. */
export function linkDeCupom(codigo: string, parceiro?: string, base = 'https://treino.personalperto.com.br'): string {
  const med = (parceiro ?? '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 60)
  const cod = encodeURIComponent(codigo)
  return `${base}/login?cupom=${cod}&utm_source=parceiro${med ? `&utm_medium=${med}` : ''}&utm_campaign=cupom-${cod.toLowerCase()}`
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>
const armazenamento = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Guarda o cupom (já validado) até a pessoa entrar. Código inválido ou vazio apaga o que estava guardado. */
export function guardarCupom(valor: string | null | undefined): void {
  const codigo = normalizarCupom(valor)
  try {
    if (codigo) armazenamento()?.setItem(CHAVE_CUPOM, codigo)
    else armazenamento()?.removeItem(CHAVE_CUPOM)
  } catch {
    /* sem armazenamento: o cupom se perde e a pessoa pode digitar de novo depois */
  }
}

/** Guarda o cupom do link (?cupom=). Só quem NÃO está logado: quem já tem sessão abrindo o link é conta existente. */
export function guardarCupomDoLink(search: string, haSessao: boolean): void {
  if (haSessao) return
  const codigo = normalizarCupom(new URLSearchParams(search).get('cupom'))
  if (codigo) guardarCupom(codigo)
}

export function lerCupomGuardado(): string | null {
  try {
    return normalizarCupom(armazenamento()?.getItem(CHAVE_CUPOM))
  } catch {
    return null
  }
}

export function limparCupomGuardado(): void {
  try {
    armazenamento()?.removeItem(CHAVE_CUPOM)
  } catch {
    /* idem */
  }
}

export type ResultadoCupom = 'ok' | 'invalido' | 'fora_do_periodo' | 'esgotado' | 'ja_usou' | 'nao_novo' | 'muitas_tentativas'
export type RespostaCupom = { resultado: ResultadoCupom; dias?: number; bonus_ate?: string | null }

/** Resposta curta para a pessoa (sempre mostra algo: ela pediu o cupom). */
export function textoDoResultado(r: RespostaCupom): { ok: boolean; texto: string } {
  switch (r.resultado) {
    case 'ok':
      return { ok: true, texto: `Cupom aplicado! Você ganhou ${r.dias ?? 0} dias grátis, somados ao seu teste.` }
    case 'invalido':
      return { ok: false, texto: 'Esse código de cupom não existe ou foi pausado. Confira com quem te passou.' }
    case 'fora_do_periodo':
      return { ok: false, texto: 'Esse cupom não está mais valendo (fora do período da campanha).' }
    case 'esgotado':
      return { ok: false, texto: 'Esse cupom já atingiu o limite de usos.' }
    case 'ja_usou':
      return { ok: false, texto: 'Esta conta já usou um cupom. Vale um cupom por conta.' }
    case 'nao_novo':
      return { ok: false, texto: 'O cupom vale só para contas novas: criadas há até 7 dias e ainda sem alunos cadastrados.' }
    case 'muitas_tentativas':
      return { ok: false, texto: 'Muitos códigos errados. Tente de novo daqui a 1 hora.' }
  }
}

export type MeuCupom = { usou: boolean; dias?: number; resgatado_em?: string }
