import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { estruturadoDoTemplate, temBlocos } from './aplicar'
import { validarBrick } from '@/types/brick'
import { validarCiclismo } from '@/types/ciclismo'
import { validarCorrida } from '@/types/corrida'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'

// A migration é a fonte dos modelos: o teste extrai os JSONs dela e confere que o app os entende e valida.
const sql = readFileSync('supabase/migrations/20261029000000_templates_treino.sql', 'utf8')
const linhas = [...sql.matchAll(/\('([\w-]+)', '(\w+)', '[^']+',\s*'[^']*',\s*\$json\$([\s\S]*?)\$json\$::jsonb, (\d+)\)/g)].map((m) => ({
  slug: m[1],
  modalidade: m[2] as ModalidadeTipo,
  detalhes: JSON.parse(m[3]) as ModalidadeDetalhes,
}))

describe('templates do sistema (migration)', () => {
  it('traz os 8 modelos esperados, com slugs únicos', () => {
    expect(linhas).toHaveLength(8)
    expect(new Set(linhas.map((l) => l.slug)).size).toBe(8)
    expect(linhas.map((l) => l.modalidade).sort()).toEqual(['brick', 'brick', 'ciclismo', 'ciclismo', 'ciclismo', 'corrida', 'corrida', 'corrida'])
  })
  it.each(linhas.map((l) => [l.slug, l] as const))('%s carrega no formulário e passa na validação', (_slug, l) => {
    const e = estruturadoDoTemplate(l.modalidade, l.detalhes)
    expect(temBlocos(l.modalidade, e)).toBe(true)
    const erro = l.modalidade === 'corrida' ? validarCorrida(e.corrida) : l.modalidade === 'ciclismo' ? validarCiclismo(e.ciclismo) : validarBrick(e.brick)
    expect(erro).toBeNull()
  })
  it('cada aplicação gera ids novos nos blocos', () => {
    const l = linhas.find((x) => x.slug === 'corrida-intervalado-5x400')!
    const a = estruturadoDoTemplate(l.modalidade, l.detalhes).corrida.blocos
    const b = estruturadoDoTemplate(l.modalidade, l.detalhes).corrida.blocos
    expect(a.every((x) => x.id)).toBe(true)
    expect(a[0].id).not.toBe(b[0].id)
  })
  it('é idempotente', () => {
    expect(sql).toMatch(/ON CONFLICT \(slug\) DO NOTHING/)
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS treino\.templates_treino/)
  })
})
