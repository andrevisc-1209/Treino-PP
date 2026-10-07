import { formatarNumero } from '@/lib/format'

export type ModalidadeTipo =
  | 'musculacao'
  | 'corrida'
  | 'natacao'
  | 'ciclismo'
  | 'funcional'
  | 'futebol'
  | 'futevolei'
  | 'pilates'
  | 'yoga'
  | 'boxe'
  | 'escalada'
  | 'remo'

export type TipoExecucao = 'sincrono' | 'assincrono'

export interface ModalidadeCampo {
  key: string
  label: string
  type: 'number' | 'text' | 'textarea' | 'select'
  options?: string[]
  placeholder?: string
}

export type ExercicioLivre = { nome: string; descricao?: string }

export const INTENSIDADES = ['leve', 'moderado', 'forte', 'máximo'] as const

/** Bloco de um treino de endurance (aquecimento, série principal, soltura…). Distância em metros. */
export interface BlocoTreino {
  id: string
  nome: string
  descricao: string
  distancia?: number
  duracao?: string
  intensidade?: string
  observacoes?: string
}

/** Modalidades cujo treino é uma lista de blocos (no lugar dos campos únicos da Fase 1). */
export const MODALIDADES_COM_BLOCOS: ModalidadeTipo[] = ['natacao', 'corrida', 'ciclismo', 'remo', 'funcional']
export const usaBlocos = (m: ModalidadeTipo): boolean => MODALIDADES_COM_BLOCOS.includes(m)

/** Detalhes da modalidade: campos simples (texto/número) + a lista opcional `exercicios_livres`. */
export type ModalidadeDetalhes = Record<string, string | number | ExercicioLivre[] | BlocoTreino[]>

export const MODALIDADES_CONFIG: Record<ModalidadeTipo, { label: string; emoji: string; campos: ModalidadeCampo[] }> = {
  musculacao: { label: 'Musculação', emoji: '🏋️', campos: [] }, // usa a estrutura de exercícios existente
  corrida: {
    label: 'Corrida',
    emoji: '🏃',
    campos: [
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  natacao: {
    label: 'Natação',
    emoji: '🏊',
    campos: [
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  ciclismo: {
    label: 'Ciclismo',
    emoji: '🚴',
    campos: [
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  funcional: {
    label: 'Funcional / HIIT',
    emoji: '⚡',
    campos: [
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  futebol: {
    label: 'Futebol',
    emoji: '⚽',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'foco', label: 'Foco da sessão', type: 'text', placeholder: 'ex: resistência, técnica, tático' },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  futevolei: {
    label: 'Futevôlei',
    emoji: '🏐',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  pilates: {
    label: 'Pilates',
    emoji: '🧘',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'nivel', label: 'Nível', type: 'select', options: ['iniciante', 'intermediário', 'avançado'] },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  yoga: {
    label: 'Yoga',
    emoji: '🧘‍♀️',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'estilo', label: 'Estilo', type: 'select', options: ['hatha', 'vinyasa', 'yin', 'ashtanga', 'restaurativo'] },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  boxe: {
    label: 'Boxe / Luta',
    emoji: '🥊',
    campos: [
      { key: 'rounds', label: 'Rounds', type: 'number' },
      { key: 'duracao_round_min', label: 'Duração do round (min)', type: 'number', placeholder: '3' },
      { key: 'descanso_seg', label: 'Descanso (seg)', type: 'number', placeholder: '60' },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  escalada: {
    label: 'Escalada',
    emoji: '🧗',
    campos: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['boulder', 'esportiva', 'tradicional', 'indoor'] },
      { key: 'nivel_via', label: 'Nível da via', type: 'text', placeholder: 'ex: 6a, V4' },
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
  remo: {
    label: 'Remo',
    emoji: '🚣',
    campos: [
      { key: 'observacoes', label: 'Observações gerais', type: 'textarea' },
    ],
  },
}

export const MODALIDADES: ModalidadeTipo[] = Object.keys(MODALIDADES_CONFIG) as ModalidadeTipo[]

export function ehModalidade(v: unknown): v is ModalidadeTipo {
  return typeof v === 'string' && v in MODALIDADES_CONFIG
}

/**
 * Valores digitados → objeto salvo no banco: só os campos da modalidade, sem vazios,
 * números como número. Musculação nunca guarda detalhes ({}).
 */
export function montarDetalhes(
  modalidade: ModalidadeTipo,
  valores: Record<string, string>,
  livres: ExercicioLivre[] = [],
  blocos: BlocoTreino[] = [],
): ModalidadeDetalhes {
  const saida: ModalidadeDetalhes = {}
  for (const c of MODALIDADES_CONFIG[modalidade].campos) {
    const bruto = (valores[c.key] ?? '').trim()
    if (!bruto) continue
    if (c.type === 'number') {
      const n = Number(bruto.replace(',', '.'))
      if (Number.isFinite(n) && n >= 0) saida[c.key] = n
    } else if (c.type === 'select') {
      if (c.options?.includes(bruto)) saida[c.key] = bruto
    } else {
      saida[c.key] = bruto
    }
  }
  if (usaBlocos(modalidade)) {
    const limpos = blocos.map(limparBloco).filter((b): b is BlocoTreino => b !== null)
    if (limpos.length > 0) saida.blocos = limpos
  } else if (modalidade !== 'musculacao') {
    // exercícios livres (nome + instrução) nas modalidades sem blocos nem lista de exercícios do app
    const limpos = livres
      .map((l) => ({ nome: l.nome.trim(), descricao: (l.descricao ?? '').trim() }))
      .filter((l) => l.nome)
      .map((l) => (l.descricao ? l : { nome: l.nome }))
    if (limpos.length > 0) saida.exercicios_livres = limpos
  }
  return saida
}

/** Exercícios livres salvos (aceita o formato antigo de texto único da Fase 1: uma linha = um exercício). */
export function exerciciosLivresDe(d: ModalidadeDetalhes | null | undefined): ExercicioLivre[] {
  const v = d?.exercicios_livres
  if (Array.isArray(v)) return v.filter((x) => x && typeof x.nome === 'string' && x.nome.trim()).map((x) => ({ nome: x.nome, descricao: x.descricao }))
  if (typeof v === 'string') return v.split('\n').map((l) => l.trim()).filter(Boolean).map((nome) => ({ nome }))
  return []
}

function limparBloco(b: BlocoTreino): BlocoTreino | null {
  const nome = b.nome.trim()
  const descricao = b.descricao.trim()
  if (!nome || !descricao) return null
  const distancia = typeof b.distancia === 'number' && Number.isFinite(b.distancia) && b.distancia > 0 ? b.distancia : undefined
  const duracao = b.duracao?.trim()
  const intensidade = b.intensidade?.trim()
  const observacoes = b.observacoes?.trim()
  return {
    id: b.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())),
    nome,
    descricao,
    ...(distancia !== undefined ? { distancia } : {}),
    ...(duracao ? { duracao } : {}),
    ...(intensidade ? { intensidade } : {}),
    ...(observacoes ? { observacoes } : {}),
  }
}

/** Valida a lista de blocos do formulário (modalidades com blocos): ao menos 1, cada um com nome e descrição. */
export function validarBlocos(modalidade: ModalidadeTipo, blocos: BlocoTreino[]): string | null {
  if (!usaBlocos(modalidade)) return null
  if (blocos.length === 0) return 'Adicione ao menos um bloco ao treino.'
  if (blocos.some((b) => !b.nome.trim() || !b.descricao.trim())) return 'Preencha o nome e a descrição de cada bloco.'
  return null
}

/**
 * Blocos de um treino. Treinos criados na Fase 1/2 (campos únicos: distancia_km, estilo, tiros…) viram um bloco único
 * "Treino", para aparecerem — e poderem ser editados — no formato novo sem perder o que foi cadastrado.
 */
export function blocosDe(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): BlocoTreino[] {
  if (!usaBlocos(modalidade)) return []
  const v = d?.blocos
  if (Array.isArray(v)) {
    return (v as BlocoTreino[])
      .filter((b) => b && typeof b.nome === 'string' && typeof b.descricao === 'string')
      .map((b, i) => ({ ...b, id: b.id || `b${i}` }))
  }
  const legado = resumoLegado(modalidade, d)
  return legado ? [{ id: 'legado', nome: 'Treino', descricao: legado }] : []
}

/** "Aquecimento — 400m livre · 400 m · leve" */
export function formatarBloco(b: BlocoTreino): string {
  const extras = [typeof b.distancia === 'number' ? `${formatarNumero(b.distancia)} m` : null, b.duracao, b.intensidade].filter(Boolean)
  return `${b.nome} — ${b.descricao}${extras.length ? ` · ${extras.join(' · ')}` : ''}`
}

/**
 * Itens que o aluno marca ao concluir: os blocos (modalidades com blocos) ou os exercícios livres (demais).
 * O texto do bloco vai em `descricao`.
 */
export function itensChecklist(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): ExercicioLivre[] {
  if (usaBlocos(modalidade)) {
    return blocosDe(modalidade, d).map((b) => ({
      nome: b.nome,
      descricao: [b.descricao, typeof b.distancia === 'number' ? `${formatarNumero(b.distancia)} m` : null, b.duracao, b.intensidade].filter(Boolean).join(' · '),
    }))
  }
  return exerciciosLivresDe(d)
}

/** Detalhes salvos → texto de cada campo do formulário (para editar). */
export function valoresDoFormulario(detalhes: ModalidadeDetalhes | null | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(detalhes ?? {})
      .filter(([k, v]) => k !== 'exercicios_livres' && !Array.isArray(v))
      .map(([k, v]) => [k, String(v)]),
  )
}

const num = (v: unknown) => (typeof v === 'number' ? formatarNumero(v) : null)

/** Resumo dos campos únicos da Fase 1 (treinos antigos de corrida, natação…). */
function resumoLegado(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): string | null {
  const x = d ?? {}
  const partes: (string | null)[] = []
  switch (modalidade) {
    case 'musculacao':
      return null
    case 'corrida':
      partes.push(num(x.distancia_km) && `${num(x.distancia_km)} km`, x.pace_alvo ? `pace ${x.pace_alvo}/km` : null, x.terreno ? String(x.terreno) : null)
      break
    case 'natacao':
      partes.push(
        num(x.distancia_m) && `${num(x.distancia_m)} m`,
        num(x.tiros) && `${num(x.tiros)} tiros`,
        x.estilo ? String(x.estilo) : null,
      )
      break
    case 'ciclismo':
      partes.push(num(x.distancia_km) && `${num(x.distancia_km)} km`, num(x.desnivel_m) && `${num(x.desnivel_m)} m de desnível`, x.tipo ? String(x.tipo) : null)
      break
    case 'funcional':
      partes.push(num(x.rounds) && `${num(x.rounds)} rounds`, num(x.duracao_min) && `${num(x.duracao_min)} min`)
      break
    case 'boxe':
      partes.push(num(x.rounds) && `${num(x.rounds)} rounds`, num(x.duracao_round_min) && `${num(x.duracao_round_min)} min cada`)
      break
    case 'escalada':
      partes.push(x.tipo ? String(x.tipo) : null, x.nivel_via ? `via ${x.nivel_via}` : null)
      break
    case 'remo':
      partes.push(num(x.distancia_m) && `${num(x.distancia_m)} m`, x.tempo_alvo ? `tempo ${x.tempo_alvo}` : null)
      break
    default:
      // futebol, futevôlei, pilates, yoga
      partes.push(num(x.duracao_min) && `${num(x.duracao_min)} min`, x.foco ? String(x.foco) : x.nivel ? String(x.nivel) : x.estilo ? String(x.estilo) : null)
  }
  const texto = partes.filter(Boolean).join(' · ')
  return texto || null
}

/** Subtítulo do card: "4 blocos · 2.500 m" (com blocos) ou a métrica dos campos antigos (ex.: "5 km · pace 5:30/km"). null se não houver. */
export function resumoModalidade(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): string | null {
  if (usaBlocos(modalidade) && Array.isArray(d?.blocos)) {
    const blocos = blocosDe(modalidade, d)
    if (blocos.length === 0) return null
    const total = blocos.reduce((a, b) => a + (typeof b.distancia === 'number' ? b.distancia : 0), 0)
    return `${blocos.length} ${blocos.length === 1 ? 'bloco' : 'blocos'}${total > 0 ? ` · ${formatarNumero(total)} m` : ''}`
  }
  return resumoLegado(modalidade, d)
}

/** Linhas "rótulo: valor" dos detalhes preenchidos, na ordem dos campos (usa o rótulo do formulário, não a chave). */
export function linhasDetalhes(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): string[] {
  const x = d ?? {}
  return MODALIDADES_CONFIG[modalidade].campos
    .filter((c) => x[c.key] !== undefined && x[c.key] !== '' && !Array.isArray(x[c.key]))
    .map((c) => `• ${c.label}: ${typeof x[c.key] === 'number' ? formatarNumero(x[c.key] as number) : x[c.key]}`)
}

// ---------------------------------------------------------------------------
// Resultado que o aluno/personal registra ao fazer o treino (modalidades sem lista de exercícios do app)
// Mantenha igual a CAMPOS_RESULTADO em supabase/functions/_shared/execucao.ts.
// ---------------------------------------------------------------------------

export const RESULTADO_CAMPOS: Record<Exclude<ModalidadeTipo, 'musculacao'>, { key: string; label: string; type: 'number' | 'text'; placeholder?: string }[]> = {
  corrida: [
    { key: 'distancia_km', label: 'Distância feita (km)', type: 'number', placeholder: '5,2' },
    { key: 'tempo_total', label: 'Tempo total', type: 'text', placeholder: '28:30' },
    { key: 'pace_medio', label: 'Pace médio (min/km)', type: 'text', placeholder: '5:29' },
  ],
  natacao: [
    { key: 'tiros_feitos', label: 'Tiros feitos', type: 'number' },
    { key: 'distancia_total_m', label: 'Distância total (m)', type: 'number' },
  ],
  ciclismo: [
    { key: 'distancia_km', label: 'Distância feita (km)', type: 'number' },
    { key: 'tempo_total', label: 'Tempo total', type: 'text', placeholder: '1:10:00' },
  ],
  funcional: [
    { key: 'rounds_feitos', label: 'Rounds feitos', type: 'number' },
    { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
  ],
  futebol: [{ key: 'duracao_min', label: 'Duração (min)', type: 'number' }],
  futevolei: [{ key: 'duracao_min', label: 'Duração (min)', type: 'number' }],
  pilates: [{ key: 'duracao_min', label: 'Duração (min)', type: 'number' }],
  yoga: [{ key: 'duracao_min', label: 'Duração (min)', type: 'number' }],
  boxe: [{ key: 'rounds_feitos', label: 'Rounds feitos', type: 'number' }],
  escalada: [
    { key: 'vias_feitas', label: 'Vias feitas', type: 'number' },
    { key: 'nivel_max', label: 'Nível mais alto', type: 'text', placeholder: '6a' },
  ],
  remo: [
    { key: 'distancia_m', label: 'Distância feita (m)', type: 'number' },
    { key: 'tempo_total', label: 'Tempo total', type: 'text', placeholder: '20:00' },
  ],
}

export type DetalhesExecucao = {
  exercicios?: { exercicio_id: string; nome: string; series_planejadas: number; series_feitas: number; carga_kg?: number; obs?: string }[]
  /** sessão presencial de musculação: PSE (0–10) e duração informadas ao concluir */
  pse?: number
  duracao_min?: number
  resultado?: Record<string, string | number>
  exercicios_livres?: { nome: string; feito: boolean }[]
}

/** O que foi registrado, em linhas legíveis para o personal ("Distância feita (km): 5,2", "✔ Alongar"). */
export function descreverExecucao(modalidade: ModalidadeTipo, d: DetalhesExecucao | null | undefined): string[] {
  const x = d ?? {}
  const linhas: string[] = []
  if (modalidade === 'musculacao') {
    for (const e of x.exercicios ?? []) {
      linhas.push(`${e.nome}: ${e.series_feitas}/${e.series_planejadas} séries${e.carga_kg ? ` · até ${formatarNumero(e.carga_kg)} kg` : ''}${e.obs ? ` — ${e.obs}` : ''}`)
    }
    if (typeof x.pse === 'number') linhas.push(`PSE: ${x.pse}/10`)
    if (typeof x.duracao_min === 'number') linhas.push(`Duração: ${formatarNumero(x.duracao_min)} min`)
    return linhas
  }
  for (const c of RESULTADO_CAMPOS[modalidade]) {
    const v = x.resultado?.[c.key]
    if (v !== undefined && v !== '') linhas.push(`${c.label}: ${typeof v === 'number' ? formatarNumero(v) : v}`)
  }
  for (const l of x.exercicios_livres ?? []) linhas.push(`${l.feito ? '✔' : '✘'} ${l.nome}`)
  return linhas
}
