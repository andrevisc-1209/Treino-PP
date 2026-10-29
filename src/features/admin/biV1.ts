/** BI v1 do /admin: helpers puros (sem I/O). Dados vêm de `admin_bi_v1` e `admin_lista_acao` (migration 20261079). Só personal e agregados. */
import { linkWhatsApp } from '@/lib/whatsapp'

/** Meta do dono: pagantes ativos até a data (docs/MKT-POSICIONAMENTO.md). Fica aqui, no app, para mudar sem migration. */
export const META_PAGANTES = 100
export const PRAZO_META = '2027-01-26'

export type SituacaoBI = 'trial' | 'ativa' | 'expirada' | 'cancelada'
export const SITUACOES_BI: { valor: SituacaoBI; rotulo: string }[] = [
  { valor: 'trial', rotulo: 'Em trial' },
  { valor: 'ativa', rotulo: 'Pagante' },
  { valor: 'expirada', rotulo: 'Vencido' },
  { valor: 'cancelada', rotulo: 'Cancelado' },
]

export type FiltrosBI = { cidade: string; situacao: '' | SituacaoBI; origem: string }
export const SEM_FILTROS: FiltrosBI = { cidade: '', situacao: '', origem: '' }

export type MetaBI = { pagantes_ativos: number; mrr: number; ja_pagaram: number; serie: { dia: string; acumulado: number }[] }
export type FunilBI = {
  cadastrou: number
  perfil_completo: number
  primeiro_aluno: number
  tres_alunos: number
  pagou: number
  mediana_horas_primeiro_aluno: number | null
  mediana_horas_tres_alunos: number | null
  mediana_dias_primeiro_pagamento: number | null
}
export type LinhaGrupo = { cadastros: number; ativados: number; pagantes: number }
export type CidadeBI = LinhaGrupo & { cidade: string }
export type OrigemBI = LinhaGrupo & { origem: string }
export type DadosBIv1 = { dias: number; meta: MetaBI; funil: FunilBI; cidades: CidadeBI[]; origens: OrigemBI[] }

const n = (v: unknown) => Number(v ?? 0) || 0
const nOuNulo = (v: unknown) => (v === null || v === undefined ? null : Number(v))

/** Normaliza o JSON do RPC (números podem vir como string; ausente vira 0). */
export function normalizarBIv1(raw: unknown): DadosBIv1 {
  const o = (raw ?? {}) as Record<string, unknown>
  const meta = (o.meta ?? {}) as Record<string, unknown>
  const funil = (o.funil ?? {}) as Record<string, unknown>
  const grupo = (l: Record<string, unknown>) => ({ cadastros: n(l.cadastros), ativados: n(l.ativados), pagantes: n(l.pagantes) })
  return {
    dias: n(o.dias),
    meta: {
      pagantes_ativos: n(meta.pagantes_ativos),
      mrr: n(meta.mrr),
      ja_pagaram: n(meta.ja_pagaram),
      serie: ((meta.serie as Record<string, unknown>[] | undefined) ?? []).map((p) => ({ dia: String(p.dia), acumulado: n(p.acumulado) })),
    },
    funil: {
      cadastrou: n(funil.cadastrou),
      perfil_completo: n(funil.perfil_completo),
      primeiro_aluno: n(funil.primeiro_aluno),
      tres_alunos: n(funil.tres_alunos),
      pagou: n(funil.pagou),
      mediana_horas_primeiro_aluno: nOuNulo(funil.mediana_horas_primeiro_aluno),
      mediana_horas_tres_alunos: nOuNulo(funil.mediana_horas_tres_alunos),
      mediana_dias_primeiro_pagamento: nOuNulo(funil.mediana_dias_primeiro_pagamento),
    },
    cidades: ((o.cidades as Record<string, unknown>[] | undefined) ?? []).map((l) => ({ cidade: String(l.cidade), ...grupo(l) })),
    origens: ((o.origens as Record<string, unknown>[] | undefined) ?? []).map((l) => ({ origem: String(l.origem), ...grupo(l) })),
  }
}

/** Dias de calendário entre duas datas AAAA-MM-DD (b − a). */
function diasEntre(a: string, b: string): number {
  const [a1, m1, d1] = a.split('-').map(Number)
  const [a2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

export type ProgressoMeta = { faltam: number; percentual: number; diasRestantes: number; semanasRestantes: number; porSemanaNecessario: number; atingida: boolean; vencida: boolean }

/** Quanto falta para a meta e o ritmo semanal necessário (arredondado para cima). */
export function progressoDaMeta(pagantes: number, hojeISO: string, meta: number = META_PAGANTES, prazoISO: string = PRAZO_META): ProgressoMeta {
  const faltam = Math.max(0, meta - pagantes)
  const diasRestantes = Math.max(0, diasEntre(hojeISO, prazoISO))
  const semanasRestantes = Math.max(0, diasRestantes / 7)
  return {
    faltam,
    percentual: Math.min(100, Math.round((pagantes / meta) * 100)),
    diasRestantes,
    semanasRestantes: Math.round(semanasRestantes * 10) / 10,
    porSemanaNecessario: faltam === 0 ? 0 : semanasRestantes < 1 ? faltam : Math.ceil(faltam / semanasRestantes),
    atingida: pagantes >= meta,
    vencida: diasEntre(hojeISO, prazoISO) < 0,
  }
}

/** Novos pagantes nos últimos 7 dias da série acumulada (ritmo real, para comparar com o necessário). */
export function ritmoSemanal(serie: { dia: string; acumulado: number }[]): number {
  if (serie.length === 0) return 0
  const ultimo = serie[serie.length - 1].acumulado
  const base = serie.length > 7 ? serie[serie.length - 8].acumulado : 0
  return Math.max(0, ultimo - base)
}

export type EtapaFunil = {
  chave: keyof Omit<FunilBI, `mediana_${string}`>
  rotulo: string
  valor: number
  pctDoInicio: number
  /** Passagem da etapa anterior; null na primeira etapa, sem etapa anterior ou quando a etapa tem mais gente que a anterior (não é funil sequencial). */
  pctDaAnterior: number | null
  /** Quantos chegaram à etapa sem passar pela anterior (ao menos): "Pagou" inclui quem pagou sem chegar a 3 alunos. */
  semPassarPelaAnterior: number
  legenda: string | null
}

export function formatarMediana(horas: number | null): string {
  if (horas === null) return 'sem dados'
  if (horas < 1) return 'menos de 1 h'
  if (horas < 48) return `${Math.round(horas)} h`
  return `${Math.round(horas / 24)} dias`
}

/** Etapas do funil com a conversão sobre o início e sobre a etapa anterior. */
export function etapasDoFunil(f: FunilBI): EtapaFunil[] {
  const itens: { chave: EtapaFunil['chave']; rotulo: string; valor: number; legenda: string | null }[] = [
    { chave: 'cadastrou', rotulo: 'Cadastrou', valor: f.cadastrou, legenda: null },
    { chave: 'perfil_completo', rotulo: 'Completou o perfil', valor: f.perfil_completo, legenda: null },
    { chave: 'primeiro_aluno', rotulo: 'Cadastrou o 1º aluno', valor: f.primeiro_aluno, legenda: f.mediana_horas_primeiro_aluno === null ? null : `mediana: ${formatarMediana(f.mediana_horas_primeiro_aluno)} após o cadastro` },
    { chave: 'tres_alunos', rotulo: 'Chegou a 3 alunos', valor: f.tres_alunos, legenda: f.mediana_horas_tres_alunos === null ? null : `mediana: ${formatarMediana(f.mediana_horas_tres_alunos)} após o cadastro` },
    { chave: 'pagou', rotulo: 'Pagou', valor: f.pagou, legenda: f.mediana_dias_primeiro_pagamento === null ? null : `mediana: ${formatarMediana(f.mediana_dias_primeiro_pagamento * 24)} após o cadastro` },
  ]
  return itens.map((e, i) => {
    const anterior = i === 0 ? 0 : itens[i - 1].valor
    const sequencial = i > 0 && anterior > 0 && e.valor <= anterior
    return {
      ...e,
      pctDoInicio: f.cadastrou === 0 ? 0 : Math.round((e.valor / f.cadastrou) * 100),
      pctDaAnterior: sequencial ? Math.round((e.valor / anterior) * 100) : null,
      semPassarPelaAnterior: i > 0 && e.valor > anterior ? e.valor - anterior : 0,
    }
  })
}

/** Etapa com a maior perda em relação à anterior (onde o personal mais trava); null se não há dados suficientes. */
export function maiorGargalo(etapas: EtapaFunil[]): EtapaFunil | null {
  const comparaveis = etapas.filter((e) => e.pctDaAnterior !== null && etapas[0].valor >= 5)
  if (comparaveis.length === 0) return null
  return comparaveis.reduce((pior, e) => ((e.pctDaAnterior as number) < (pior.pctDaAnterior as number) ? e : pior))
}

/** Conversão cadastro → pagante (%), ou null sem cadastros. */
export function conversaoParaPagante(l: LinhaGrupo): number | null {
  return l.cadastros === 0 ? null : Math.round((l.pagantes / l.cadastros) * 100)
}

/** Custo por pagante = investimento ÷ pagantes; null sem pagantes ou sem investimento informado. */
export function custoPorPagante(investimento: number | null, pagantes: number): number | null {
  if (investimento === null || !Number.isFinite(investimento) || investimento < 0 || pagantes <= 0) return null
  return Math.round((investimento / pagantes) * 100) / 100
}

/** "Investimento" digitado em reais ("300", "1.250,50") → número; vazio/ruim = null. */
export function lerInvestimento(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  const v = Number(limpo)
  return Number.isFinite(v) && v >= 0 ? v : null
}

export const ROTULO_ORIGEM: Record<string, string> = { direto: 'Direto / sem origem', indicacao: 'Indicação', instagram: 'Instagram', whatsapp: 'WhatsApp' }
export const rotuloOrigem = (o: string): string => ROTULO_ORIGEM[o] ?? o

// ---------- lista de ação ----------
export type MotivoAcao = 'trial_sem_ativacao' | 'pagante_sem_uso' | 'vencendo'
export type ItemAcao = {
  professional_id: string
  nome: string
  cidade: string | null
  telefone: string | null
  plano: string | null
  status: string
  motivo: MotivoAcao
  dias: number
  qtd_alunos: number
}

export function normalizarListaAcao(raw: unknown): ItemAcao[] {
  return ((raw as Record<string, unknown>[] | null) ?? []).map((r) => ({
    professional_id: String(r.professional_id),
    nome: String(r.nome ?? ''),
    cidade: (r.cidade as string | null) ?? null,
    telefone: (r.telefone as string | null) ?? null,
    plano: (r.plano as string | null) ?? null,
    status: String(r.status ?? ''),
    motivo: r.motivo as MotivoAcao,
    dias: n(r.dias),
    qtd_alunos: n(r.qtd_alunos),
  }))
}

export const ROTULO_MOTIVO: Record<MotivoAcao, string> = {
  trial_sem_ativacao: 'Teste acabando sem 3 alunos',
  pagante_sem_uso: 'Pagante sem usar o app',
  vencendo: 'Plano vencendo',
}

/** Frase curta com o número de dias de cada motivo. */
export function detalheDoMotivo(i: Pick<ItemAcao, 'motivo' | 'dias' | 'qtd_alunos'>): string {
  const alunos = `${i.qtd_alunos} ${i.qtd_alunos === 1 ? 'aluno' : 'alunos'}`
  if (i.motivo === 'trial_sem_ativacao') return `${i.dias === 0 ? 'termina hoje' : i.dias === 1 ? 'falta 1 dia' : `faltam ${i.dias} dias`} · ${alunos}`
  if (i.motivo === 'pagante_sem_uso') return `sem atividade há ${i.dias} dias · ${alunos}`
  return `${i.dias === 0 ? 'vence hoje' : i.dias === 1 ? 'vence amanhã' : `vence em ${i.dias} dias`} · ${alunos}`
}

/** Link do WhatsApp para falar com o personal (sem texto: o texto você escreve na hora); null sem telefone válido. */
export function linkContatoPersonal(telefone: string | null): string | null {
  return linkWhatsApp(telefone)
}
