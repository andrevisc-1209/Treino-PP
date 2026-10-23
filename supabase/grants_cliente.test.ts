import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Verbos que a migration 20261055 (grants mínimos, etapa 2) tirou de `authenticated`. Se o app passar a usar um deles, o código
// falha em produção com "permission denied": este teste avisa antes, e a saída é conceder o privilégio numa migration nova.
const REVOGADOS: Record<string, string[]> = {
  pesos: ['update', 'delete'],
  sessao_series: ['delete'],
  horarios_fixos: ['delete'],
  aluno_cobranca: ['delete'],
  aula_participantes: ['delete'],
  sessoes: ['delete'],
  professional_config: ['delete'],
  aluno_locais_treino: ['update'],
  horario_alunos: ['update'],
  sessao_exercicios: ['update'], // migration 20261056 (a FK ON DELETE SET NULL anula plano_exercicio_id sem precisar do grant)
}

function arquivosTs(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return arquivosTs(p)
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : []
  })
}

describe('grants mínimos (etapa 2): o app não usa o que foi revogado', () => {
  const raiz = path.join(import.meta.dirname, '..', 'src')
  const usos: string[] = []
  for (const arquivo of arquivosTs(raiz)) {
    const codigo = fs.readFileSync(arquivo, 'utf8')
    for (const m of codigo.matchAll(/\.from\('([a-z_]+)'\)/g)) {
      const verbos = REVOGADOS[m[1]]
      if (!verbos) continue
      const resto = codigo.slice(m.index! + m[0].length, m.index! + m[0].length + 900)
      const fim = resto.search(/\.from\(|\n\s*\n|\bconst\b|\bexport\b/)
      const trecho = fim === -1 ? resto : resto.slice(0, fim)
      for (const v of verbos) if (new RegExp(`\\.${v}\\(`).test(trecho) || (v === 'update' && /\.upsert\(/.test(trecho))) usos.push(`${m[1]}.${v} em ${path.relative(raiz, arquivo)}`)
    }
  }

  it('nenhum .update/.delete/.upsert do front nas tabelas/verbos revogados', () => expect(usos).toEqual([]))

  it('as migrations de grants (etapa 2) revogam exatamente a lista combinada', () => {
    const arquivos = ['20261055000000_grants_minimos_etapa2.sql', '20261056000000_grants_sessao_exercicios.sql']
    const revogados: Record<string, string[]> = {}
    for (const arquivo of arquivos) {
      const sql = fs.readFileSync(path.join(import.meta.dirname, 'migrations', arquivo), 'utf8').replace(/--[^\n]*/g, '')
      for (const m of sql.matchAll(/REVOKE\s+([A-Z, ]+?)\s+ON\s+treino\.(\w+)\s+FROM\s+authenticated/g)) {
        revogados[m[2]] = [...(revogados[m[2]] ?? []), ...m[1].split(',').map((v) => v.trim().toLowerCase())]
      }
    }
    expect(revogados).toEqual(REVOGADOS)
  })
})
