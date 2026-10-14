import { describe, expect, it } from 'vitest'
import { badgeProva, diasParaProva, provasDoFoco, rotuloProva } from './provaAlvo'

describe('prova alvo', () => {
  it('provas por modalidade foco', () => {
    expect(provasDoFoco('triathlon').map((p) => p.valor)).toEqual(['sprint', 'olimpico', '70.3', 'ironman'])
    expect(provasDoFoco('corrida').map((p) => p.valor)).toEqual(['5k', '10k', '21k', '42k'])
    expect(provasDoFoco('natacao')).toEqual([])
    expect(provasDoFoco(null)).toEqual([])
    expect(rotuloProva('70.3')).toBe('70.3')
  })
  it('dias até a prova (só no futuro)', () => {
    expect(diasParaProva('2026-11-29', '2026-10-13')).toBe(47)
    expect(diasParaProva('2026-10-13', '2026-10-13')).toBe(0)
    expect(diasParaProva('2026-10-12', '2026-10-13')).toBeNull()
    expect(diasParaProva(null, '2026-10-13')).toBeNull()
  })
  it('badge do topo da ficha', () => {
    expect(badgeProva('ironman', '2026-11-29', '2026-10-13')).toBe('🏁 Ironman · 47 dias')
    expect(badgeProva('ironman', '2026-10-14', '2026-10-13')).toBe('🏁 Ironman · amanhã')
    expect(badgeProva('ironman', '2026-10-13', '2026-10-13')).toBe('🏁 Ironman · hoje')
    expect(badgeProva(null, '2026-12-01', '2026-10-13')).toBe('🏁 Prova · 49 dias')
    expect(badgeProva('ironman', '2026-09-01', '2026-10-13')).toBeNull()
  })
})
