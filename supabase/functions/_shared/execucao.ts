// Validação do resultado que o aluno envia pela página pública /treino/:token (sem login).
// Tudo que chega do navegador é tratado como hostil: só passa o formato conhecido, com limites de tamanho.

export const MODALIDADES = [
  'musculacao', 'corrida', 'natacao', 'ciclismo', 'funcional', 'futebol',
  'futevolei', 'pilates', 'yoga', 'boxe', 'escalada', 'remo', 'brick',
] as const
export type Modalidade = (typeof MODALIDADES)[number]

// Campos de resultado aceitos por modalidade (mantenha igual a RESULTADO_CAMPOS em src/types/modalidades.ts).
type CampoServidor = { key: string; type: 'number' | 'text' | 'opcao' | 'rpe' }
const CONCLUSAO: CampoServidor = { key: 'conclusao', type: 'opcao' }
const RPE: CampoServidor = { key: 'rpe', type: 'rpe' }
const OPCOES_CONCLUSAO = ['sim', 'parcial', 'nao']

export const CAMPOS_RESULTADO: Record<Exclude<Modalidade, 'musculacao'>, CampoServidor[]> = {
  corrida: [CONCLUSAO, { key: 'distancia_km', type: 'number' }, { key: 'tempo_min', type: 'number' }, { key: 'pace_medio', type: 'text' }, RPE, { key: 'tempo_total', type: 'text' }],
  natacao: [{ key: 'tiros_feitos', type: 'number' }, { key: 'distancia_total_m', type: 'number' }],
  ciclismo: [CONCLUSAO, { key: 'distancia_km', type: 'number' }, { key: 'tempo_min', type: 'number' }, { key: 'velocidade_media', type: 'number' }, RPE, { key: 'tempo_total', type: 'text' }],
  brick: [
    CONCLUSAO,
    { key: 'bike_distancia_km', type: 'number' }, { key: 'bike_tempo_min', type: 'number' }, { key: 'bike_velocidade_media', type: 'number' },
    { key: 'run_distancia_km', type: 'number' }, { key: 'run_tempo_min', type: 'number' }, { key: 'run_pace_medio', type: 'text' },
    RPE,
  ],
  funcional: [{ key: 'rounds_feitos', type: 'number' }, { key: 'duracao_min', type: 'number' }],
  futebol: [{ key: 'duracao_min', type: 'number' }],
  futevolei: [{ key: 'duracao_min', type: 'number' }],
  pilates: [{ key: 'duracao_min', type: 'number' }],
  yoga: [{ key: 'duracao_min', type: 'number' }],
  boxe: [{ key: 'rounds_feitos', type: 'number' }],
  escalada: [{ key: 'vias_feitas', type: 'number' }, { key: 'nivel_max', type: 'text' }],
  remo: [{ key: 'distancia_m', type: 'number' }, { key: 'tempo_total', type: 'text' }],
}

const MAX_ITENS = 60
const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const inteiro = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number.NaN
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

/** Tempo de execução opcional (h+min já somados no navegador): inteiro de minutos, 1 a 1440. Vale para qualquer modalidade. */
const CAMPO_DURACAO: CampoServidor = { key: 'duracao_minutos', type: 'number' }

type BlocoNatacaoServidor = { nome: string; parametros: { distancia?: number; series?: number } }

/**
 * Metros nadados nos blocos marcados (distância × séries, só piscina), a partir do que está salvo no treino —
 * não do número que o navegador manda. O item i do checklist é o bloco i; o nome precisa bater.
 * Mantenha igual a distanciaNatacaoFeita em src/features/execucoes/resultado.ts.
 */
export function distanciaNatacaoFeita(detalhesPlano: unknown, livres: { nome: string; feito: boolean }[]): number {
  const blocos = (detalhesPlano as { blocos?: unknown } | null)?.blocos
  if (!Array.isArray(blocos)) return 0
  let total = 0
  blocos.forEach((b, i) => {
    const bloco = b as Partial<BlocoNatacaoServidor> | null
    const item = livres[i]
    if (!bloco || typeof bloco.nome !== 'string' || !item?.feito || item.nome !== bloco.nome.trim().slice(0, 120)) return
    const dist = bloco.parametros?.distancia
    const series = bloco.parametros?.series
    if (typeof dist === 'number' && Number.isFinite(dist) && dist > 0) total += dist * (typeof series === 'number' && series > 0 ? series : 1)
  })
  return Math.min(total, 100000)
}

const primeiroInteiro = (reps: string): number | null => {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : null
}

/** Volume da musculação em kg·rep: Σ séries feitas × repetições × carga (só exercícios com carga e repetições numéricas). */
export function volumeMusculacao(
  feitos: { exercicio_id: string; series_feitas: number }[],
  plano: { exercicio_id: string; reps: string; carga_kg: number | null }[],
): number {
  const porId = new Map(plano.map((p) => [p.exercicio_id, p]))
  let total = 0
  for (const f of feitos) {
    const p = porId.get(f.exercicio_id)
    const reps = p ? primeiroInteiro(p.reps) : null
    if (p && reps !== null && p.carga_kg != null && p.carga_kg > 0) total += f.series_feitas * reps * p.carga_kg
  }
  return Math.round(total * 10) / 10
}

/** Número de minutos do tempo de execução enviado pelo navegador (opcional). */
function duracaoMinutos(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number.NaN
  return Number.isInteger(n) && n >= 1 && n <= 1440 ? n : null
}

export type EntradaExecucao = { detalhes?: unknown; notas?: unknown }
export type ResultadoValidacao = { ok: true; detalhes: Record<string, unknown>; notas: string | null } | { ok: false; erro: string }

/**
 * `exerciciosPlano`: exercícios REAIS do treino (id/nome/séries) buscados no servidor — o que o navegador
 * manda só vale se bater com eles (ids desconhecidos são ignorados; séries feitas ≤ séries planejadas).
 */
export function validarExecucao(
  modalidade: Modalidade,
  entrada: EntradaExecucao,
  exerciciosPlano: { exercicio_id: string; nome: string; series: number; reps?: string; carga_kg?: number | null }[],
  detalhesPlano?: unknown,
): ResultadoValidacao {
  const bruto = entrada.detalhes && typeof entrada.detalhes === 'object' ? (entrada.detalhes as Record<string, unknown>) : {}
  const notas = texto(entrada.notas, 1000) || null
  const detalhes: Record<string, unknown> = {}

  if (modalidade === 'musculacao') {
    const lista = Array.isArray(bruto.exercicios) ? bruto.exercicios.slice(0, MAX_ITENS) : []
    const porId = new Map(exerciciosPlano.map((e) => [e.exercicio_id, e]))
    const vistos = new Set<string>()
    const exercicios: Record<string, unknown>[] = []
    for (const item of lista) {
      if (!item || typeof item !== 'object') continue
      const i = item as Record<string, unknown>
      const real = typeof i.exercicio_id === 'string' ? porId.get(i.exercicio_id) : undefined
      if (!real || vistos.has(real.exercicio_id)) continue
      vistos.add(real.exercicio_id)
      const feitas = inteiro(i.series_feitas, 0, real.series)
      if (feitas === null) return { ok: false, erro: 'Séries inválidas.' }
      exercicios.push({
        exercicio_id: real.exercicio_id,
        nome: real.nome,
        series_planejadas: real.series,
        series_feitas: feitas,
        ...(texto(i.obs, 300) ? { obs: texto(i.obs, 300) } : {}),
      })
    }
    detalhes.exercicios = exercicios
    const resultadoMusc: Record<string, number> = {}
    const minutosMusc = duracaoMinutos((bruto.resultado as Record<string, unknown> | undefined)?.[CAMPO_DURACAO.key])
    if (minutosMusc !== null) resultadoMusc.duracao_minutos = minutosMusc
    const volume = volumeMusculacao(
      exercicios.map((e) => ({ exercicio_id: String(e.exercicio_id), series_feitas: Number(e.series_feitas) })),
      exerciciosPlano.map((e) => ({ exercicio_id: e.exercicio_id, reps: e.reps ?? '', carga_kg: e.carga_kg ?? null })),
    )
    if (volume > 0) resultadoMusc.volume_kg_rep = volume
    if (Object.keys(resultadoMusc).length > 0) detalhes.resultado = resultadoMusc
  } else {
    const resultadoBruto = bruto.resultado && typeof bruto.resultado === 'object' ? (bruto.resultado as Record<string, unknown>) : {}
    const resultado: Record<string, string | number> = {}
    for (const c of CAMPOS_RESULTADO[modalidade]) {
      const v = resultadoBruto[c.key]
      if (c.type === 'opcao') {
        if (typeof v === 'string' && OPCOES_CONCLUSAO.includes(v)) resultado[c.key] = v
      } else if (c.type === 'rpe') {
        const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN
        if (Number.isInteger(n) && n >= 1 && n <= 10) resultado[c.key] = n
      } else if (c.type === 'number') {
        const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : Number.NaN
        if (Number.isFinite(n) && n >= 0 && n <= 100000) resultado[c.key] = n
      } else if (texto(v, 40)) {
        resultado[c.key] = texto(v, 40)
      }
    }
    const minutos = duracaoMinutos(resultadoBruto[CAMPO_DURACAO.key])
    if (minutos !== null) resultado.duracao_minutos = minutos
    const livres = Array.isArray(bruto.exercicios_livres) ? bruto.exercicios_livres.slice(0, MAX_ITENS) : []
    detalhes.exercicios_livres = livres
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({ nome: texto(x.nome, 120), feito: x.feito === true }))
      .filter((x) => x.nome)
    // Natação sem distância digitada: vale a soma dos blocos marcados (calculada aqui, do treino salvo).
    if (modalidade === 'natacao' && resultado.distancia_total_m === undefined) {
      const metros = distanciaNatacaoFeita(detalhesPlano, detalhes.exercicios_livres as { nome: string; feito: boolean }[])
      if (metros > 0) resultado.distancia_total_m = metros
    }
    detalhes.resultado = resultado
  }
  return { ok: true, detalhes, notas }
}

export function linkValido(
  link: { expira_em: string; usado_em: string | null } | null,
  agora: Date = new Date(),
): 'valido' | 'invalido' | 'expirado' | 'usado' {
  if (!link) return 'invalido'
  if (link.usado_em) return 'usado'
  if (new Date(link.expira_em).getTime() < agora.getTime()) return 'expirado'
  return 'valido'
}
