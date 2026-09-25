import { describe, expect, it } from 'vitest'
import { linkWhatsApp } from './whatsapp'

describe('linkWhatsApp', () => {
  it('acrescenta 55 para número local (11 dígitos)', () => {
    expect(linkWhatsApp('(21) 98765-4321')).toBe('https://wa.me/5521987654321')
  })

  it('acrescenta 55 para número local (10 dígitos)', () => {
    expect(linkWhatsApp('(21) 3765-4321')).toBe('https://wa.me/552137654321')
  })

  it('mantém o 55 se já vier com DDI', () => {
    expect(linkWhatsApp('+55 21 98765-4321')).toBe('https://wa.me/5521987654321')
  })

  it('retorna null para telefone ausente ou inválido', () => {
    expect(linkWhatsApp(null)).toBeNull()
    expect(linkWhatsApp('')).toBeNull()
    expect(linkWhatsApp('123')).toBeNull()
  })
})
