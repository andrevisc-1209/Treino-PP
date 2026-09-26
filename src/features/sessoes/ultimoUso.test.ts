import { describe, expect, it } from 'vitest'
import { formatarUltimoUso } from './ultimoUso'

describe('formatarUltimoUso', () => {
  it('formata sets×reps · carga (data)', () => {
    expect(formatarUltimoUso({ session_date: '2026-09-12', sets: 3, reps: 10, load_kg: 18 })).toBe('Última vez: 3×10 · 18 kg (12/09)')
  })
  it('omite a carga quando não tem', () => {
    expect(formatarUltimoUso({ session_date: '2026-09-12', sets: 3, reps: 10, load_kg: null })).toBe('Última vez: 3×10 (12/09)')
  })
  it('usa "séries" quando não tem reps', () => {
    expect(formatarUltimoUso({ session_date: '2026-09-12', sets: 1, reps: null, load_kg: null })).toBe('Última vez: 1 série (12/09)')
    expect(formatarUltimoUso({ session_date: '2026-09-12', sets: 3, reps: null, load_kg: null })).toBe('Última vez: 3 séries (12/09)')
  })
  it('retorna null sem dado', () => {
    expect(formatarUltimoUso(undefined)).toBeNull()
  })
})
