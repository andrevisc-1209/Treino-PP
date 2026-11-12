/** Locais de atendimento do personal (até 5): "2 academias". Helpers puros, sem I/O. */

export type LocalDeAtendimento = { nome: string; endereco: string; mapsLink: string }

export const MAX_LOCAIS = 5
/** Mesmo limite de pagina_locais no banco: o que a página pública mostra. */
const MAX_RESUMO = 100

const limpa = (t: unknown, max: number): string => (typeof t === 'string' ? t.trim().replace(/\s+/g, ' ').slice(0, max) : '')

/** Lê o que veio do banco, só com o formato conhecido; item sem nome é descartado. */
export function lerLocais(bruto: unknown): LocalDeAtendimento[] {
  if (!Array.isArray(bruto)) return []
  const out: LocalDeAtendimento[] = []
  for (const x of bruto) {
    const o = (x ?? {}) as Record<string, unknown>
    const nome = limpa(o.nome, 80)
    if (!nome) continue
    out.push({ nome, endereco: limpa(o.endereco, 200), mapsLink: typeof o.mapsLink === 'string' && /^https:\/\//.test(o.mapsLink) ? o.mapsLink.slice(0, 500) : '' })
  }
  return out.slice(0, MAX_LOCAIS)
}

const mesmoLocal = (a: LocalDeAtendimento, b: LocalDeAtendimento) => a.nome.toLowerCase() === b.nome.toLowerCase() && a.endereco.toLowerCase() === b.endereco.toLowerCase()

/** Adiciona sem repetir e sem passar de 5. `motivo` explica por que não adicionou. */
export function adicionarLocal(lista: LocalDeAtendimento[], novo: LocalDeAtendimento): { ok: true; lista: LocalDeAtendimento[] } | { ok: false; motivo: string } {
  const nome = limpa(novo.nome, 80)
  if (!nome) return { ok: false, motivo: 'Informe o nome do local.' }
  const local = { nome, endereco: limpa(novo.endereco, 200), mapsLink: novo.mapsLink }
  if (lista.some((l) => mesmoLocal(l, local))) return { ok: false, motivo: 'Esse local já está na lista.' }
  if (lista.length >= MAX_LOCAIS) return { ok: false, motivo: `Você pode ter até ${MAX_LOCAIS} locais. Remova um para adicionar outro.` }
  return { ok: true, lista: [...lista, local] }
}

export const removerLocal = (lista: LocalDeAtendimento[], indice: number): LocalDeAtendimento[] => lista.filter((_, i) => i !== indice)

/** O que a página pública mostra em "Onde você atende": só os nomes, separados por " · ", até 100 caracteres, sem cortar um nome ao meio. Vazio = null. */
export function resumoDosLocais(lista: LocalDeAtendimento[]): string | null {
  const nomes: string[] = []
  let total = 0
  for (const l of lista) {
    const sep = nomes.length === 0 ? 0 : 3
    if (total + sep + l.nome.length > MAX_RESUMO) break
    nomes.push(l.nome)
    total += sep + l.nome.length
  }
  if (nomes.length === 0 && lista.length > 0) return lista[0].nome.slice(0, MAX_RESUMO)
  return nomes.length > 0 ? nomes.join(' · ') : null
}

/** Texto gravado no campo "Local" de uma aula ou horário: "Nome — endereço" (só o nome, se o endereço repete o nome ou falta). */
export function textoDoLocal(l: LocalDeAtendimento): string {
  return l.endereco && !l.endereco.toLowerCase().startsWith(l.nome.toLowerCase()) ? `${l.nome} — ${l.endereco}` : l.nome
}
