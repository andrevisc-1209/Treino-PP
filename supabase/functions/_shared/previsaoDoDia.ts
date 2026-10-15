// Previsão do dia (Open-Meteo, sem chave) para a mensagem do briefing. Mesmo critério do card de clima do app:
// a cidade/UF do personal vira coordenadas pela geocodificação do Open-Meteo. Devolve null em qualquer falha (a mensagem sai sem a seção).

import { condicao, escolherLocal, type ResultadoGeocoding } from './clima.ts'
import type { ClimaDoDia } from './notificacoes.ts'

export async function previsaoDoDia(cidade: string | null | undefined, uf: string | null | undefined, fetchFn: typeof fetch = fetch): Promise<ClimaDoDia | null> {
  const c = cidade?.trim()
  const u = uf?.trim()
  if (!c || !u) return null
  try {
    const g = await fetchFn(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=10&language=pt&countryCode=BR`)
    if (!g.ok) return null
    const local = escolherLocal(((await g.json()) as { results?: ResultadoGeocoding[] }).results, u)
    if (!local) return null
    const f = await fetchFn(
      `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=America%2FSao_Paulo`,
    )
    if (!f.ok) return null
    const d = await f.json()
    const cond = condicao(d.daily.weather_code[0] ?? 0)
    return {
      emoji: cond.emoji,
      texto: cond.texto,
      min: Math.round(d.daily.temperature_2m_min[0]),
      max: Math.round(d.daily.temperature_2m_max[0]),
      chuvaProb: Math.round(d.daily.precipitation_probability_max[0] ?? 0),
    }
  } catch {
    return null
  }
}
