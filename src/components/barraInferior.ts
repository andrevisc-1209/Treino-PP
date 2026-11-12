import { CalendarDays, ClipboardList, DollarSign, Sun, Users } from 'lucide-react'

/** Ordem e rótulos da barra inferior (auditoria de UX de 28/10/2026): "Treinos" no lugar de "Meus treinos" (vocabulário fixo) e antes do Financeiro. */
export const ITEMS = [
  { to: '/', label: 'Hoje', icon: Sun, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/alunos', label: 'Alunos', icon: Users, end: false },
  { to: '/meus-treinos', label: 'Treinos', icon: ClipboardList, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, end: false },
]

export type VarianteDaBarra = 'padrao' | 'centro'

const CHAVE = 'treino_barra'

/** Variante pedida pela URL (?barra=centro ou ?barra=padrao); guardada no aparelho para o teste com personais não depender do link. */
export function lerVarianteDaBarra(search: string, guardada: string | null): VarianteDaBarra {
  const url = new URLSearchParams(search).get('barra')
  if (url === 'centro' || url === 'padrao') return url
  return guardada === 'centro' ? 'centro' : 'padrao'
}

export function guardarVarianteDaBarra(v: VarianteDaBarra) {
  try {
    localStorage.setItem(CHAVE, v)
  } catch {
    // sem localStorage (modo privado): vale só para esta abertura
  }
}

export function varianteGuardada(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

/** No modo "centro", o Hoje vai para o meio (3º de 5) e ganha destaque; os outros quatro mantêm a ordem relativa. */
export function ordemDaBarra(v: VarianteDaBarra) {
  if (v === 'padrao') return ITEMS
  const [hoje, ...resto] = ITEMS
  return [resto[0], resto[1], hoje, resto[2], resto[3]]
}

/** A barra em uso agora (URL ou o que ficou guardado), para anotar em eventos de uso. */
export function varianteAtualDaBarra(): VarianteDaBarra {
  return lerVarianteDaBarra(typeof location === 'undefined' ? '' : location.search, varianteGuardada())
}
