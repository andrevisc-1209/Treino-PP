import { describe, expect, it } from 'vitest'
import { sugerirNomeDuplicado } from './nomes'

describe('sugerirNomeDuplicado', () => {
  it('sugere "(2)" quando não há duplicata ainda', () => {
    expect(sugerirNomeDuplicado('Upper A', ['Upper A'])).toBe('Upper A (2)')
  })
  it('pula números já usados', () => {
    expect(sugerirNomeDuplicado('Upper A', ['Upper A', 'Upper A (2)', 'Upper A (3)'])).toBe('Upper A (4)')
  })
  it('ignora maiúsculas/minúsculas', () => {
    expect(sugerirNomeDuplicado('Upper A', ['upper a', 'UPPER A (2)'])).toBe('Upper A (3)')
  })
})
