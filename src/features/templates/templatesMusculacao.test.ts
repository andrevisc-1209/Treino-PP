import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { itensMusculacaoDe } from './aplicar'

const ler = (f: string) => readFileSync(`supabase/migrations/${f}`, 'utf8')
const sql = ler('20261030000000_templates_musculacao.sql')

// biblioteca global semeada pelas migrations (nome em minúsculas, como no join da migration)
const biblioteca = new Set(
  [ler('20260924000000_create_treino_schema.sql'), ler('20261028000000_grupo_reabilitacao_prep_fisica.sql')].flatMap((s) => [...s.matchAll(/\(NULL, '([^']+)',/g)].map((m) => m[1].toLowerCase())),
)

const itens = [...sql.matchAll(/\('(musculacao-[\w-]+)', (\d+), '([^']+)', (\d+), '([^']+)', (\d+)\)/g)].map((m) => ({ slug: m[1], nome: m[3], sets: Number(m[4]) }))
const porModelo = (slug: string) => itens.filter((i) => i.slug === slug)
const naBiblioteca = (slug: string) => porModelo(slug).filter((i) => biblioteca.has(i.nome.toLowerCase()))

describe('templates de musculação (migration)', () => {
  it('define os 5 modelos pedidos', () => {
    expect([...new Set(itens.map((i) => i.slug))]).toEqual([
      'musculacao-full-body-iniciante',
      'musculacao-hiit-abdomen',
      'musculacao-a-pernas',
      'musculacao-b-peito-triceps',
      'musculacao-c-costas-biceps',
    ])
  })
  it('exercícios que não existem na biblioteca são omitidos (join interno), os demais ficam', () => {
    const ausentes = itens.filter((i) => !biblioteca.has(i.nome.toLowerCase())).map((i) => i.nome)
    expect(ausentes.sort()).toEqual(['Desenvolvimento com Halteres', 'Remada Unilateral', 'Rosca Martelo'])
    expect(naBiblioteca('musculacao-full-body-iniciante')).toHaveLength(5)
    expect(naBiblioteca('musculacao-hiit-abdomen')).toHaveLength(8)
    expect(naBiblioteca('musculacao-a-pernas')).toHaveLength(5)
    expect(naBiblioteca('musculacao-b-peito-triceps')).toHaveLength(5)
    expect(naBiblioteca('musculacao-c-costas-biceps')).toHaveLength(3)
  })
  it('é idempotente e só usa exercícios globais', () => {
    expect(sql).toMatch(/ON CONFLICT \(slug\) DO NOTHING/)
    expect(sql).toMatch(/e\.professional_id IS NULL/)
  })
})

describe('itensMusculacaoDe', () => {
  it('lê os itens do JSON e ignora lixo', () => {
    const d = { exercicios: [{ exercicio_id: 'a', nome: 'X', sets: 3, reps: '10', rest_seconds: 60 }, { nome: 'sem id' }, { exercicio_id: 'b', nome: 'Y', sets: 4, reps: '8' }] } as never
    expect(itensMusculacaoDe(d)).toEqual([
      { exercicio_id: 'a', nome: 'X', sets: 3, reps: '10', rest_seconds: 60 },
      { exercicio_id: 'b', nome: 'Y', sets: 4, reps: '8', rest_seconds: null },
    ])
    expect(itensMusculacaoDe({})).toEqual([])
  })
})
