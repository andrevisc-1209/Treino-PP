// Edge Function: clima   (JWT do personal)
//
// GET/POST → previsão de hoje para a cidade do cadastro do personal (professionals.cidade / uf), via Open-Meteo
// (gratuito, sem chave). Só a cidade vai para o serviço externo — nenhum dado de aluno. Resposta:
// { cidade, uf, atual: { temp, sensacao, vento, texto, emoji }, hoje: { min, max, chuvaProb, chuvaMm, uv }, dica }.
// Sem cidade cadastrada: { semCidade: true }.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { criarCacheTtl } from '../_shared/cacheTtl.ts'
import { condicao, dicaTreino, escolherLocal, type ResultadoGeocoding } from '../_shared/clima.ts'
import { respostaDoLimite, verificarLimite } from '../_shared/rateLimit.ts'

const APP_URL = 'https://treino.personalperto.com.br'
// localhost só se ALLOW_LOCALHOST_CORS=true (nunca definido em produção).
const ORIGENS_PERMITIDAS = [APP_URL, ...(Deno.env.get('ALLOW_LOCALHOST_CORS') === 'true' ? ['http://localhost:5173'] : [])]

// Cache por cidade/UF (3 h, até 500 cidades): a previsão é a mesma para todo personal da cidade. Só guarda respostas de sucesso.
// Melhor esforço: vive na instância da function e some no cold start.
const cache = criarCacheTtl<Record<string, unknown>>(3 * 3_600_000, 500)

function cors(req: Request) {
  const origem = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENS_PERMITIDAS.includes(origem) ? origem : APP_URL,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) })

  const auth = req.headers.get('Authorization')
  if (!auth) return json(req, { error: 'Não autenticado.' }, 401)
  const cliente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, db: { schema: 'treino' } })
  const { data: u, error: errUser } = await cliente.auth.getUser()
  if (errUser || !u.user) return json(req, { error: 'Não autenticado.' }, 401)
  // 30/hora por personal, falha ABERTA: a previsão é só um enfeite; se o banco do limite cair, ela continua.
  const bloqueio = respostaDoLimite(await verificarLimite(`clima:${u.user.id}`, 30, 3600), 'aberta', cors(req))
  if (bloqueio) return bloqueio

  const { data: perfil } = await cliente.from('professionals').select('cidade, uf').eq('id', u.user.id).maybeSingle()
  const cidade = perfil?.cidade?.trim()
  const uf = perfil?.uf?.trim()
  if (!cidade || !uf) return json(req, { semCidade: true })

  const chave = `${cidade.toLowerCase()}|${uf.toUpperCase()}`
  const guardado = cache.get(chave)
  if (guardado) return json(req, guardado)

  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=10&language=pt&countryCode=BR`)
    if (!g.ok) throw new Error(`geocoding ${g.status}`)
    const local = escolherLocal(((await g.json()) as { results?: ResultadoGeocoding[] }).results, uf)
    if (!local) return json(req, { semCidade: true })

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max&forecast_days=1&timezone=America%2FSao_Paulo`
    const f = await fetch(url)
    if (!f.ok) throw new Error(`forecast ${f.status}`)
    const d = await f.json()
    const atual = { temp: Math.round(d.current.temperature_2m), sensacao: Math.round(d.current.apparent_temperature), vento: Math.round(d.current.wind_speed_10m) }
    const hoje = {
      min: Math.round(d.daily.temperature_2m_min[0]),
      max: Math.round(d.daily.temperature_2m_max[0]),
      chuvaProb: Math.round(d.daily.precipitation_probability_max[0] ?? 0),
      chuvaMm: Math.round((d.daily.precipitation_sum?.[0] ?? 0) * 10) / 10,
      uv: Math.round((d.daily.uv_index_max[0] ?? 0) * 10) / 10,
    }
    const c = condicao(d.current.weather_code)
    const resposta = {
      cidade,
      uf,
      atual: { ...atual, texto: c.texto, emoji: c.emoji },
      hoje,
      dica: dicaTreino({ ...atual, chuvaProb: hoje.chuvaProb, uv: hoje.uv }),
    }
    cache.set(chave, resposta)
    return json(req, resposta)
  } catch (e) {
    console.error('clima:', (e as Error).message)
    return json(req, { error: 'Previsão indisponível no momento.' }, 502)
  }
})
