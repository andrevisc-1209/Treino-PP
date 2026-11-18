/** Helpers puros do painel de cupons de parceiro no /admin (sem I/O). Só nome de personal e números: nunca dado de aluno. */
import { normalizarCupom } from '@/features/cupom/cupom'

export type PublicoCampanha = 'novos' | 'todos'
export const ROTULO_PUBLICO: Record<PublicoCampanha, string> = { novos: 'Só contas novas', todos: 'Qualquer personal' }

export type TotaisCupons = { campanhas: number; ativas: number; resgates: number; ativados: number; pagantes: number; dias_concedidos: number }

export type CampanhaCupom = {
  id: string
  codigo: string
  parceiro: string
  dias_bonus: number
  valido_de: string
  valido_ate: string
  max_usos: number
  ativa: boolean
  publico: PublicoCampanha
  usos: number
  ativados: number
  pagantes: number
}

export type ResgateRecente = { id: string; codigo: string; parceiro: string; personal_nome: string; dias: number; resgatado_em: string; ativado: boolean; pagante: boolean }

export type PainelCupons = { totais: TotaisCupons; campanhas: CampanhaCupom[]; recentes: ResgateRecente[] }

const num = (v: unknown) => Number(v ?? 0)

/** O JSON do banco chega com contagens como número ou texto: normaliza e nunca devolve undefined. */
export function normalizarCupons(bruto: unknown): PainelCupons {
  const b = (bruto ?? {}) as Record<string, unknown>
  const t = (b.totais ?? {}) as Record<string, unknown>
  return {
    totais: {
      campanhas: num(t.campanhas),
      ativas: num(t.ativas),
      resgates: num(t.resgates),
      ativados: num(t.ativados),
      pagantes: num(t.pagantes),
      dias_concedidos: num(t.dias_concedidos),
    },
    campanhas: ((b.campanhas ?? []) as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      codigo: String(c.codigo ?? ''),
      parceiro: String(c.parceiro ?? ''),
      dias_bonus: num(c.dias_bonus),
      valido_de: String(c.valido_de ?? ''),
      valido_ate: String(c.valido_ate ?? ''),
      max_usos: num(c.max_usos),
      ativa: c.ativa === true,
      publico: c.publico === 'todos' ? 'todos' : 'novos',
      usos: num(c.usos),
      ativados: num(c.ativados),
      pagantes: num(c.pagantes),
    })),
    recentes: ((b.recentes ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      codigo: String(r.codigo ?? ''),
      parceiro: String(r.parceiro ?? ''),
      personal_nome: String(r.personal_nome ?? ''),
      dias: num(r.dias),
      resgatado_em: String(r.resgatado_em ?? ''),
      ativado: r.ativado === true,
      pagante: r.pagante === true,
    })),
  }
}

export type SituacaoCampanha = 'vigente' | 'pausada' | 'esgotada' | 'vencida' | 'agendada'

/** Em que pé a campanha está agora (a ordem importa: pausada vence as outras, depois vencida, esgotada e agendada). */
export function situacaoDaCampanha(c: Pick<CampanhaCupom, 'ativa' | 'valido_de' | 'valido_ate' | 'max_usos' | 'usos'>, agora: number = Date.now()): SituacaoCampanha {
  if (!c.ativa) return 'pausada'
  if (new Date(c.valido_ate).getTime() < agora) return 'vencida'
  if (c.usos >= c.max_usos) return 'esgotada'
  if (new Date(c.valido_de).getTime() > agora) return 'agendada'
  return 'vigente'
}

export const ROTULO_SITUACAO_CAMPANHA: Record<SituacaoCampanha, string> = {
  vigente: 'Vigente',
  pausada: 'Pausada',
  esgotada: 'Esgotada',
  vencida: 'Vencida',
  agendada: 'Ainda não começou',
}

/** Percentual inteiro (0 quando o total é 0). */
export const percentual = (parte: number, total: number): number => (total > 0 ? Math.round((parte / total) * 100) : 0)

/** "2027-02-28" (campo de data) → último instante do dia em Brasília, para o servidor. Data inválida = null. */
export function fimDoDiaSP(data: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null
  const d = new Date(`${data}T23:59:59-03:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export type FormCampanha = { codigo: string; parceiro: string; dias: string; validade: string; maxUsos: string; publico: PublicoCampanha }

/** Valida o formulário de nova campanha; devolve a mensagem do primeiro erro ou null. O servidor valida de novo. */
export function erroDoFormulario(f: FormCampanha, agora: number = Date.now()): string | null {
  if (!normalizarCupom(f.codigo)) return 'O código precisa ter de 4 a 20 letras e números, sem espaço.'
  if (!f.parceiro.trim()) return 'Informe o nome do parceiro.'
  const dias = Number(f.dias)
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return 'Os dias do cupom vão de 1 a 365.'
  const ate = fimDoDiaSP(f.validade)
  if (!ate || new Date(ate).getTime() <= agora) return 'A validade precisa ser uma data futura.'
  const max = Number(f.maxUsos)
  if (!Number.isInteger(max) || max < 1 || max > 100000) return 'O limite de usos vai de 1 a 100.000.'
  return null
}
