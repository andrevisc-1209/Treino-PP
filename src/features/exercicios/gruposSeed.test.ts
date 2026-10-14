import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// O grupo é semeado por migration (a biblioteca de musculação vive em treino.exercicios): confere o conteúdo do SQL.
const sql = readFileSync('supabase/migrations/20261028000000_grupo_reabilitacao_prep_fisica.sql', 'utf8')
const linhas = [...sql.matchAll(/^\s*\(NULL, '([^']+)', 'Reabilitação \/ Prep Física', '(I|II)', (NULL|'[^']*')\)/gm)].map((m) => ({ nome: m[1], fase: m[2] }))

describe('grupo Reabilitação / Prep Física', () => {
  it('23 exercícios: 11 na fase I e 12 na fase II', () => {
    expect(linhas).toHaveLength(23)
    expect(linhas.filter((l) => l.fase === 'I')).toHaveLength(11)
    expect(linhas.filter((l) => l.fase === 'II')).toHaveLength(12)
  })
  it('nomes únicos (o banco impede duplicado entre os globais)', () => {
    const nomes = linhas.map((l) => l.nome.toLowerCase())
    expect(new Set(nomes).size).toBe(nomes.length)
  })
  it('a fase é coluna de dados, não texto do nome', () => {
    expect(linhas.every((l) => !/fase/i.test(l.nome))).toBe(true)
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS fase')
  })
})
