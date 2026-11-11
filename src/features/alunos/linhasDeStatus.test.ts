import { describe, expect, it } from 'vitest'
import { proximaAulaDe, textoProximaAula, textoUltimoTreino } from './linhasDeStatus'

const aula = (starts_at: string, local: string | null = null) => ({ starts_at, duration_min: 60, local })

describe('próxima aula', () => {
  it('hoje, amanhã e dia da semana', () => {
    expect(textoProximaAula(aula('2026-11-11T21:00:00Z'), '2026-11-11').texto).toBe('Hoje · 18:00')
    expect(textoProximaAula(aula('2026-11-12T10:00:00Z'), '2026-11-11').texto).toBe('Amanhã · 07:00')
    expect(textoProximaAula(aula('2026-11-13T21:00:00Z'), '2026-11-11').texto).toMatch(/13\/11 · 18:00$/)
  })
  it('sem aula marcada e com local curto', () => {
    expect(textoProximaAula(null, '2026-11-11')).toEqual({ texto: 'Nenhuma aula marcada', detalhe: null })
    expect(textoProximaAula(aula('2026-11-11T21:00:00Z', 'Smart Fit — Rua X, 10 - Laranjeiras, Rio de Janeiro - RJ'), '2026-11-11').detalhe).toBe('Smart Fit · Laranjeiras')
  })
  it('escolhe a mais próxima que ainda não começou, sem depender da ordem de entrada', () => {
    const agora = new Date('2026-11-11T12:00:00Z').getTime()
    const r = proximaAulaDe([aula('2026-11-13T12:00:00Z'), aula('2026-11-11T09:00:00Z'), aula('2026-11-12T12:00:00Z')], agora)
    expect(r?.starts_at).toBe('2026-11-12T12:00:00Z')
    expect(proximaAulaDe([], agora)).toBeNull()
  })
})

describe('último treino', () => {
  it('em palavras, e alerta depois de 7 dias ou se nunca treinou', () => {
    expect(textoUltimoTreino('2026-11-11', '2026-11-11')).toEqual({ texto: 'Hoje', alerta: false })
    expect(textoUltimoTreino('2026-11-10', '2026-11-11')).toEqual({ texto: 'Ontem', alerta: false })
    expect(textoUltimoTreino('2026-11-04', '2026-11-11')).toEqual({ texto: 'há 7 dias', alerta: false })
    expect(textoUltimoTreino('2026-11-02', '2026-11-11')).toEqual({ texto: 'há 9 dias', alerta: true })
    expect(textoUltimoTreino(null, '2026-11-11')).toEqual({ texto: 'Nunca treinou', alerta: true })
  })
})
