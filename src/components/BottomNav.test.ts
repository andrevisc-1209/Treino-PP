import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ITEMS } from './BottomNav'

describe('barra inferior', () => {
  it('cinco destinos, nesta ordem, com "Treinos" (não "Meus treinos") e Financeiro por último', () => {
    expect(ITEMS.map((i) => i.label)).toEqual(['Hoje', 'Agenda', 'Alunos', 'Treinos', 'Financeiro'])
    expect(ITEMS.map((i) => i.to)).toEqual(['/', '/agenda', '/alunos', '/meus-treinos', '/financeiro'])
  })
})

// Regra do projeto: alvos de toque ≥ 44 px. As setas e abas da Agenda tinham 36 px (size-9 / min-h-9): este teste trava a volta.
describe('alvos de toque da Agenda', () => {
  const fonte = fs.readFileSync(path.join(import.meta.dirname, '..', 'features', 'agenda', 'AgendaPage.tsx'), 'utf8')
  it('não usa size-9 nem min-h-9 nos controles', () => {
    expect(fonte).not.toMatch(/\bsize-9\b/)
    expect(fonte).not.toMatch(/\bmin-h-9\b/)
  })
  it('setas de navegação com 44 px', () => {
    expect(fonte.match(/size-11/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
