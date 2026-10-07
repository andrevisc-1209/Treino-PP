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

/** Detalhes da modalidade: campos simples (texto/número) + a lista opcional `exercicios_livres`. */
export type ModalidadeDetalhes = Record<string, string | number | ExercicioLivre[]>

export const MODALIDADES_CONFIG: Record<ModalidadeTipo, { label: string; emoji: string; campos: ModalidadeCampo[] }> = {
  musculacao: { label: 'Musculação', emoji: '🏋️', campos: [] }, // usa a estrutura de exercícios existente
  corrida: {
    label: 'Corrida',
    emoji: '🏃',
    campos: [
      { key: 'distancia_km', label: 'Distância (km)', type: 'number', placeholder: '5' },
      { key: 'pace_alvo', label: 'Pace alvo (min/km)', type: 'text', placeholder: '5:30' },
      { key: 'terreno', label: 'Terreno', type: 'select', options: ['asfalto', 'trilha', 'pista', 'esteira'] },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  natacao: {
    label: 'Natação',
    emoji: '🏊',
    campos: [
      { key: 'distancia_m', label: 'Distância total (m)', type: 'number', placeholder: '1000' },
      { key: 'estilo', label: 'Estilo', type: 'select', options: ['crawl', 'costas', 'peito', 'borboleta', 'medley'] },
      { key: 'tiros', label: 'Número de tiros', type: 'number', placeholder: '10' },
      { key: 'intervalo_seg', label: 'Intervalo entre tiros (seg)', type: 'number', placeholder: '30' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  ciclismo: {
    label: 'Ciclismo',
    emoji: '🚴',
    campos: [
      { key: 'distancia_km', label: 'Distância (km)', type: 'number' },
      { key: 'desnivel_m', label: 'Desnível (m)', type: 'number' },
      { key: 'cadencia_alvo', label: 'Cadência alvo (rpm)', type: 'number' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['rua', 'mountain bike', 'indoor'] },
    ],
  },
  funcional: {
    label: 'Funcional / HIIT',
    emoji: '⚡',
    campos: [
      { key: 'rounds', label: 'Rounds', type: 'number', placeholder: '5' },
      { key: 'duracao_min', label: 'Duração total (min)', type: 'number' },
      { key: 'descanso_seg', label: 'Descanso entre rounds (seg)', type: 'number', placeholder: '60' },
    ],
  },
  futebol: {
    label: 'Futebol',
    emoji: '⚽',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'foco', label: 'Foco da sessão', type: 'text', placeholder: 'ex: resistência, técnica, tático' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  futevolei: {
    label: 'Futevôlei',
    emoji: '🏐',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  pilates: {
    label: 'Pilates',
    emoji: '🧘',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'nivel', label: 'Nível', type: 'select', options: ['iniciante', 'intermediário', 'avançado'] },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  yoga: {
    label: 'Yoga',
    emoji: '🧘‍♀️',
    campos: [
      { key: 'duracao_min', label: 'Duração (min)', type: 'number' },
      { key: 'estilo', label: 'Estilo', type: 'select', options: ['hatha', 'vinyasa', 'yin', 'ashtanga', 'restaurativo'] },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  boxe: {
    label: 'Boxe / Luta',
    emoji: '🥊',
    campos: [
      { key: 'rounds', label: 'Rounds', type: 'number' },
      { key: 'duracao_round_min', label: 'Duração do round (min)', type: 'number', placeholder: '3' },
      { key: 'descanso_seg', label: 'Descanso (seg)', type: 'number', placeholder: '60' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  escalada: {
    label: 'Escalada',
    emoji: '🧗',
    campos: [
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['boulder', 'esportiva', 'tradicional', 'indoor'] },
      { key: 'nivel_via', label: 'Nível da via', type: 'text', placeholder: 'ex: 6a, V4' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
  },
  remo: {
    label: 'Remo',
    emoji: '🚣',
    campos: [
      { key: 'distancia_m', label: 'Distância (m)', type: 'number' },
      { key: 'tempo_alvo', label: 'Tempo alvo', type: 'text', placeholder: 'ex: 20:00' },
      { key: 'observacoes', label: 'Observações', type: 'textarea' },
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
export function montarDetalhes(modalidade: ModalidadeTipo, valores: Record<string, string>, livres: ExercicioLivre[] = []): ModalidadeDetalhes {
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
  // exercícios livres (nome + instrução) só nas modalidades sem lista de exercícios do app
  if (modalidade !== 'musculacao') {
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

/** Detalhes salvos → texto de cada campo do formulário (para editar). */
export function valoresDoFormulario(detalhes: ModalidadeDetalhes | null | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(detalhes ?? {})
      .filter(([k, v]) => k !== 'exercicios_livres' && !Array.isArray(v))
      .map(([k, v]) => [k, String(v)]),
  )
}

const num = (v: unknown) => (typeof v === 'number' ? formatarNumero(v) : null)

/** Métrica-chave para o subtítulo do card (ex.: "5 km · pace 5:30/km"). null se não houver. */
export function resumoModalidade(modalidade: ModalidadeTipo, d: ModalidadeDetalhes | null | undefined): string | null {
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
  exercicios?: { exercicio_id: string; nome: string; series_planejadas: number; series_feitas: number; obs?: string }[]
  resultado?: Record<string, string | number>
  exercicios_livres?: { nome: string; feito: boolean }[]
}

/** O que foi registrado, em linhas legíveis para o personal ("Distância feita (km): 5,2", "✔ Alongar"). */
export function descreverExecucao(modalidade: ModalidadeTipo, d: DetalhesExecucao | null | undefined): string[] {
  const x = d ?? {}
  const linhas: string[] = []
  if (modalidade === 'musculacao') {
    for (const e of x.exercicios ?? []) {
      linhas.push(`${e.nome}: ${e.series_feitas}/${e.series_planejadas} séries${e.obs ? ` — ${e.obs}` : ''}`)
    }
    return linhas
  }
  for (const c of RESULTADO_CAMPOS[modalidade]) {
    const v = x.resultado?.[c.key]
    if (v !== undefined && v !== '') linhas.push(`${c.label}: ${typeof v === 'number' ? formatarNumero(v) : v}`)
  }
  for (const l of x.exercicios_livres ?? []) linhas.push(`${l.feito ? '✔' : '✘'} ${l.nome}`)
  return linhas
}
