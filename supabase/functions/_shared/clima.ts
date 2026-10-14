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

/** Dica curta para treinar ao ar livre hoje. */
export function dicaTreino(p: Previsao): string {
  if (p.chuvaProb >= 60) return 'Chuva provável — considere treino indoor ou remarcar o outdoor.'
  if (p.sensacao >= 34 || p.temp >= 32) return 'Calor forte — prefira cedo ou à noite e reforce a hidratação.'
  if (p.uv >= 8) return 'UV alto — evite o treino outdoor entre 10h e 16h.'
  if (p.vento >= 35) return 'Vento forte — atenção em bike e natação em mar aberto.'
  return 'Boas condições para treinar ao ar livre.'
}
