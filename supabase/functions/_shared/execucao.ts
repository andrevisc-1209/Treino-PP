// Validação do resultado que o aluno envia pela página pública /treino/:token (sem login).
// Tudo que chega do navegador é tratado como hostil: só passa o formato conhecido, com limites de tamanho.

export const MODALIDADES = [
  'musculacao', 'corrida', 'natacao', 'ciclismo', 'funcional', 'futebol',
  'futevolei', 'pilates', 'yoga', 'boxe', 'escalada', 'remo',
] as const
export type Modalidade = (typeof MODALIDADES)[number]

// Campos de resultado aceitos por modalidade (mantenha igual a RESULTADO_CAMPOS em src/types/modalidades.ts).
export const CAMPOS_RESULTADO: Record<Exclude<Modalidade, 'musculacao'>, { key: string; type: 'number' | 'text' }[]> = {
  corrida: [{ key: 'distancia_km', type: 'number' }, { key: 'tempo_total', type: 'text' }, { key: 'pace_medio', type: 'text' }],
  natacao: [{ key: 'tiros_feitos', type: 'number' }, { key: 'distancia_total_m', type: 'number' }],
  ciclismo: [{ key: 'distancia_km', type: 'number' }, { key: 'tempo_total', type: 'text' }],
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

export type EntradaExecucao = { detalhes?: unknown; notas?: unknown }
export type ResultadoValidacao = { ok: true; detalhes: Record<string, unknown>; notas: string | null } | { ok: false; erro: string }

/**
 * `exerciciosPlano`: exercícios REAIS do treino (id/nome/séries) buscados no servidor — o que o navegador
 * manda só vale se bater com eles (ids desconhecidos são ignorados; séries feitas ≤ séries planejadas).
 */
export function validarExecucao(
  modalidade: Modalidade,
  entrada: EntradaExecucao,
  exerciciosPlano: { exercicio_id: string; nome: string; series: number }[],
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
  } else {
    const resultadoBruto = bruto.resultado && typeof bruto.resultado === 'object' ? (bruto.resultado as Record<string, unknown>) : {}
    const resultado: Record<string, string | number> = {}
    for (const c of CAMPOS_RESULTADO[modalidade]) {
      const v = resultadoBruto[c.key]
      if (c.type === 'number') {
        const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : Number.NaN
        if (Number.isFinite(n) && n >= 0 && n <= 100000) resultado[c.key] = n
      } else if (texto(v, 40)) {
        resultado[c.key] = texto(v, 40)
      }
    }
    detalhes.resultado = resultado
    const livres = Array.isArray(bruto.exercicios_livres) ? bruto.exercicios_livres.slice(0, MAX_ITENS) : []
    detalhes.exercicios_livres = livres
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .map((x) => ({ nome: texto(x.nome, 120), feito: x.feito === true }))
      .filter((x) => x.nome)
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
