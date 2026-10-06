import { describe, expect, it } from 'vitest'
import { horaMinimaSP } from './datas'

describe('horaMinimaSP', () => {
  // 2026-10-05 01:30 UTC = 2026-10-04 22:30 em São Paulo (UTC-3)
  const agora = new Date('2026-10-05T01:30:00Z')
  it('hoje (data de SP, não a UTC) limita pela hora atual de SP', () => {
    expect(horaMinimaSP('2026-10-04', agora)).toBe('22:30')
  })
  it('outros dias não têm limite', () => {
    expect(horaMinimaSP('2026-10-05', agora)).toBeUndefined()
    expect(horaMinimaSP('2026-10-10', agora)).toBeUndefined()
  })
})
