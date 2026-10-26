import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PLANOS } from './mp.ts'

// Os preços do MRR estimado vivem em SQL (migration 20261066, função admin_financeiro): este teste cobra a paridade com PLANOS
// (mp.ts). Se um preço mudar lá, o teste quebra e lembra de criar uma migration nova com a função atualizada.
const sql = fs.readFileSync(path.join(import.meta.dirname, '../../migrations/20261066000000_admin_financeiro.sql'), 'utf8')

describe('MRR estimado (SQL) x preços do servidor (mp.ts)', () => {
  it('cada plano tem o valor mensal equivalente certo na função', () => {
    expect(sql).toContain(`WHEN 'mensal' THEN ${PLANOS.mensal.amount}`)
    expect(sql).toContain(`WHEN 'trimestral' THEN ${PLANOS.trimestral.amount}.0 / ${PLANOS.trimestral.frequency}`)
    expect(sql).toContain(`WHEN 'semestral' THEN ${PLANOS.semestral.amount}.0 / ${PLANOS.semestral.frequency}`)
  })
})
