import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Toda Edge Function chamada pelo navegador (supabase.functions.invoke) precisa liberar, na pré-checagem CORS (OPTIONS), os cabeçalhos
// que o supabase-js envia. Se faltar `apikey` ou `x-client-info` o navegador bloqueia o POST antes de enviar: a função só vê o OPTIONS
// (sem nenhum erro no log) e o app cai na mensagem de reserva. Foi o que quebrou o reset de senha do admin.
const DIR = path.join(import.meta.dirname)
const funcoesComCors = fs
  .readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_shared')
  .map((d) => ({ nome: d.name, arquivo: path.join(DIR, d.name, 'index.ts') }))
  .filter((f) => fs.existsSync(f.arquivo))
  .map((f) => ({ ...f, codigo: fs.readFileSync(f.arquivo, 'utf8') }))
  .filter((f) => f.codigo.includes('Access-Control-Allow-Headers'))

describe('CORS das Edge Functions chamadas pelo navegador', () => {
  it('encontra as funções com CORS', () => expect(funcoesComCors.length).toBeGreaterThan(8))

  it.each(funcoesComCors.map((f) => [f.nome, f.codigo] as const))('%s libera authorization, apikey, content-type e x-client-info', (_nome, codigo) => {
    const linha = codigo.split('\n').find((l) => l.includes('Access-Control-Allow-Headers')) ?? ''
    for (const cabecalho of ['authorization', 'apikey', 'content-type', 'x-client-info']) expect(linha.toLowerCase()).toContain(cabecalho)
  })
})
