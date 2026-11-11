/** Campos do perfil opcional da página pública (Configurações → Página pública). Helpers puros, sem I/O. */

export type PerfilDigitado = { cref: string; modalidades: string; locais: string; preco: string }

export type DadosDoPerfil = { pagina_cref: string | null; pagina_modalidades: string | null; pagina_locais: string | null; pagina_preco_aula: number | null }

export const LIMITES_PERFIL = { cref: 30, modalidades: 80, locais: 100 } as const
export const PRECO_MIN = 1
export const PRECO_MAX = 5000

const ou_nulo = (t: string): string | null => t.trim().replace(/\s+/g, ' ') || null

/** Converte o que o personal digitou ("120", "120,50") em número; vazio = sem valor; fora de R$ 1 a R$ 5.000 ou ilegível = inválido. */
export function lerPrecoDigitado(texto: string): number | null | 'invalido' {
  const t = texto.trim().replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || n < PRECO_MIN || n > PRECO_MAX) return 'invalido'
  return Math.round(n * 100) / 100
}

/** O que gravar, ou a mensagem do que corrigir. Campo vazio vira nulo (a página pública não mostra). */
export function perfilParaSalvar(f: PerfilDigitado): { ok: true; dados: DadosDoPerfil } | { ok: false; erro: string } {
  const preco = lerPrecoDigitado(f.preco)
  if (preco === 'invalido') return { ok: false, erro: 'O valor deve ficar entre R$ 1,00 e R$ 5.000,00.' }
  return {
    ok: true,
    dados: {
      pagina_cref: ou_nulo(f.cref)?.slice(0, LIMITES_PERFIL.cref) ?? null,
      pagina_modalidades: ou_nulo(f.modalidades)?.slice(0, LIMITES_PERFIL.modalidades) ?? null,
      pagina_locais: ou_nulo(f.locais)?.slice(0, LIMITES_PERFIL.locais) ?? null,
      pagina_preco_aula: preco,
    },
  }
}

/** O formulário vem do que está salvo: preço com vírgula, vazio quando não há. */
export function perfilDigitadoDe(c: { pagina_cref?: string | null; pagina_modalidades?: string | null; pagina_locais?: string | null; pagina_preco_aula?: number | null } | null | undefined): PerfilDigitado {
  return {
    cref: c?.pagina_cref ?? '',
    modalidades: c?.pagina_modalidades ?? '',
    locais: c?.pagina_locais ?? '',
    preco: c?.pagina_preco_aula != null ? String(c.pagina_preco_aula).replace('.', ',') : '',
  }
}
