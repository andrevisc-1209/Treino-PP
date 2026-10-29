/** Contatos do admin com os personais e última atividade (helpers puros, sem I/O). Dados vêm das funções da migration 20261085. */
import { dataSP, diasEntre } from '@/lib/datas'
import type { ItemAcao } from './biV1'

export type CanalContato = 'whatsapp' | 'telefone' | 'email' | 'outro'
export const CANAIS_CONTATO: { valor: CanalContato; rotulo: string }[] = [
  { valor: 'whatsapp', rotulo: 'WhatsApp' },
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'outro', rotulo: 'Outro' },
]

export type ResultadoContato = 'sem_resposta' | 'respondeu' | 'combinou_retorno' | 'resolvido' | 'nao_quer'
export const RESULTADOS_CONTATO: { valor: ResultadoContato; rotulo: string }[] = [
  { valor: 'sem_resposta', rotulo: 'Sem resposta' },
  { valor: 'respondeu', rotulo: 'Respondeu' },
  { valor: 'combinou_retorno', rotulo: 'Combinou retorno' },
  { valor: 'resolvido', rotulo: 'Resolvido' },
  { valor: 'nao_quer', rotulo: 'Não quer continuar' },
]

/** Quantos dias o alerta fica escondido depois do contato (0 = não adiar). */
export const OPCOES_ADIAR = [0, 3, 7, 14] as const
export const LIMITE_OBSERVACAO = 300

const rotuloCanal = (c: string) => CANAIS_CONTATO.find((x) => x.valor === c)?.rotulo ?? c
const rotuloResultado = (r: string) => RESULTADOS_CONTATO.find((x) => x.valor === r)?.rotulo ?? r

export type ResumoContato = { professional_id: string; ultimo_em: string; canal: string; resultado: string; adiar_ate: string | null; total: number }
export type ContatoRegistrado = {
  id: string
  criado_em: string
  motivo: string
  canal: string
  resultado: string
  observacao: string | null
  adiar_ate: string | null
  admin_nome: string | null
}

export function normalizarResumoContatos(raw: unknown): Map<string, ResumoContato> {
  const mapa = new Map<string, ResumoContato>()
  for (const l of (raw as Record<string, unknown>[] | null) ?? []) {
    mapa.set(String(l.professional_id), {
      professional_id: String(l.professional_id),
      ultimo_em: String(l.ultimo_em),
      canal: String(l.canal),
      resultado: String(l.resultado),
      adiar_ate: (l.adiar_ate as string | null) ?? null,
      total: Number(l.total ?? 0),
    })
  }
  return mapa
}

export function normalizarContatos(raw: unknown): ContatoRegistrado[] {
  return ((raw as Record<string, unknown>[] | null) ?? []).map((l) => ({
    id: String(l.id),
    criado_em: String(l.criado_em),
    motivo: String(l.motivo ?? 'manual'),
    canal: String(l.canal),
    resultado: String(l.resultado),
    observacao: (l.observacao as string | null) ?? null,
    adiar_ate: (l.adiar_ate as string | null) ?? null,
    admin_nome: (l.admin_nome as string | null) ?? null,
  }))
}

/** Última atividade por personal: professional_id → instante (ou null = nunca usou o app além do cadastro). */
export function normalizarAtividade(raw: unknown): Map<string, string | null> {
  const mapa = new Map<string, string | null>()
  for (const l of (raw as Record<string, unknown>[] | null) ?? []) mapa.set(String(l.professional_id), (l.ultima_atividade as string | null) ?? null)
  return mapa
}

/** O alerta está adiado hoje? (a data de adiamento vale até o fim do dia). */
export function alertaAdiado(r: Pick<ResumoContato, 'adiar_ate'> | undefined, hojeISO: string): boolean {
  return !!r?.adiar_ate && r.adiar_ate >= hojeISO
}

/** Separa a lista de ação entre o que ainda pede contato e o que foi adiado depois de um contato. */
export function separarAdiados(lista: ItemAcao[], resumo: Map<string, ResumoContato> | undefined, hojeISO: string): { ativos: ItemAcao[]; adiados: ItemAcao[] } {
  const ativos: ItemAcao[] = []
  const adiados: ItemAcao[] = []
  for (const i of lista) (alertaAdiado(resumo?.get(i.professional_id), hojeISO) ? adiados : ativos).push(i)
  return { ativos, adiados }
}

function haQuanto(dias: number): string {
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

/** "WhatsApp · respondeu · há 3 dias"; null sem contato. */
export function rotuloUltimoContato(r: ResumoContato | undefined, agora: Date = new Date()): string | null {
  if (!r) return null
  return `${rotuloCanal(r.canal)} · ${rotuloResultado(r.resultado).toLowerCase()} · ${haQuanto(diasEntre(dataSP(r.ultimo_em), dataSP(agora)))}`
}

/** "hoje", "ontem", "há 12 dias" ou "sem uso ainda" (só cadastro). */
export function rotuloUltimaAtividade(iso: string | null | undefined, agora: Date = new Date()): string {
  if (iso === undefined) return '—'
  if (iso === null) return 'sem uso ainda'
  return haQuanto(diasEntre(dataSP(iso), dataSP(agora)))
}

/** Dias desde a última atividade (null = nunca usou; undefined = sem dado). */
export function diasSemAtividade(iso: string | null | undefined, agora: Date = new Date()): number | null | undefined {
  if (iso === undefined) return undefined
  if (iso === null) return null
  return Math.max(0, diasEntre(dataSP(iso), dataSP(agora)))
}

export const rotuloMotivoContato = (m: string): string =>
  ({ manual: 'Contato avulso', trial_sem_ativacao: 'Teste acabando sem 3 alunos', pagante_sem_uso: 'Pagante sem usar o app', vencendo: 'Plano vencendo' } as Record<string, string>)[m] ?? m

export { rotuloCanal, rotuloResultado }
