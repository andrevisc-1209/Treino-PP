// Lógica pura do card de clima (sem APIs do Deno) — testável com vitest.

const ESTADOS: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
  GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
}

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export type ResultadoGeocoding = { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string }

/** Entre os resultados da busca por nome, o do estado (UF) informado — ou o primeiro do Brasil. */
export function escolherLocal(resultados: ResultadoGeocoding[] | undefined, uf: string): ResultadoGeocoding | null {
  const br = (resultados ?? []).filter((r) => !r.country_code || r.country_code === 'BR')
  const estado = ESTADOS[uf.toUpperCase()]
  return br.find((r) => estado && r.admin1 && sem(r.admin1) === sem(estado)) ?? br[0] ?? null
}

/** Código WMO do Open-Meteo → texto e emoji. */
export function condicao(codigo: number): { texto: string; emoji: string } {
  if (codigo === 0) return { texto: 'Céu limpo', emoji: '☀️' }
  if (codigo <= 2) return { texto: 'Poucas nuvens', emoji: '🌤️' }
  if (codigo === 3) return { texto: 'Nublado', emoji: '☁️' }
  if (codigo === 45 || codigo === 48) return { texto: 'Neblina', emoji: '🌫️' }
  if (codigo >= 51 && codigo <= 57) return { texto: 'Garoa', emoji: '🌦️' }
  if (codigo >= 61 && codigo <= 67) return { texto: 'Chuva', emoji: '🌧️' }
  if (codigo >= 80 && codigo <= 82) return { texto: 'Pancadas de chuva', emoji: '🌧️' }
  if (codigo >= 95) return { texto: 'Tempestade', emoji: '⛈️' }
  return { texto: 'Tempo instável', emoji: '🌥️' }
}

export type Previsao = { temp: number; sensacao: number; vento: number; chuvaProb: number; uv: number }

/**
 * Recado curto, em tom de colega, para o treino de hoje. Prioridade: chuva quase certa > chuva provável > calor > UV > vento >
 * dia bom > neutro.
 */
export function dicaTreino(p: Previsao): string {
  if (p.chuvaProb >= 70) return 'Vai chover. Melhor treino indoor hoje'
  if (p.chuvaProb >= 40) return 'Chance de chuva — vale ter um plano B'
  if (p.temp >= 35 || p.sensacao >= 35) return 'Calor pesado — hidrata bem os alunos'
  if (p.uv >= 8) return 'UV alto hoje — melhor treinar cedo ou depois das 16h'
  if (p.vento >= 35) return 'Vento forte hoje — cuidado com atividades ao ar livre'
  // dia bom: sem chuva à vista, temperatura agradável, UV e vento tranquilos
  if (p.chuvaProb < 20 && p.temp >= 18 && p.temp <= 29 && p.uv < 6 && p.vento < 20) return 'Dia perfeito pra treino ao ar livre!'
  return 'Condições ok pra treinar hoje'
}

/** Volume de chuva previsto para o dia, em texto curto ("cerca de 8 mm"); null quando é irrelevante (< 0,1 mm) ou não veio. */
export function rotuloChuvaMm(mm: number | null | undefined): string | null {
  if (mm == null || !Number.isFinite(mm) || mm < 0.1) return null
  if (mm < 1) return 'menos de 1 mm'
  const n = mm >= 10 ? Math.round(mm) : Math.round(mm * 10) / 10
  return `cerca de ${String(n).replace('.', ',')} mm`
}
