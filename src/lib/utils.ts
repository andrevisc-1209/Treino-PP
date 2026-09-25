import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function idade(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate + 'T00:00:00')
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a
}

/**
 * Para cada item de uma lista com nomes possivelmente repetidos, retorna um
 * sufixo curto pra diferenciar homônimos (idade, ou final do telefone se não
 * tiver data de nascimento) — null quando o nome já é único na lista.
 */
export function desambiguarPorNome<T extends { name: string; birth_date?: string | null; phone?: string | null }>(
  itens: T[],
): (item: T) => string | null {
  const nomesRepetidos = new Set<string>()
  const vistos = new Set<string>()
  for (const it of itens) {
    const chave = it.name.trim().toLowerCase()
    if (vistos.has(chave)) nomesRepetidos.add(chave)
    vistos.add(chave)
  }
  return (item: T) => {
    if (!nomesRepetidos.has(item.name.trim().toLowerCase())) return null
    const anos = idade(item.birth_date ?? null)
    if (anos != null) return `${anos} anos`
    if (item.phone) return `final ${item.phone.slice(-4)}`
    return null
  }
}

/** Máscara progressiva (21) 99999-9999 conforme o usuário digita. */
export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
