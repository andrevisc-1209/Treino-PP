import { describe, expect, it } from 'vitest'
import { linkHttps, linkMapsDoEndereco } from './linkSeguro'

describe('linkHttps', () => {
  it('aceita https', () => expect(linkHttps('https://maps.google.com/?q=academia')).toBe('https://maps.google.com/?q=academia'))
  it.each(['javascript:alert(1)', 'data:text/html,<b>x</b>', 'http://maps.google.com', 'ftp://x.com', '//x.com', 'maps.google.com', '', '   '])(
    'recusa %s',
    (v) => expect(linkHttps(v)).toBeNull(),
  )
  it('recusa o que não é texto', () => {
    expect(linkHttps(null)).toBeNull()
    expect(linkHttps(undefined)).toBeNull()
    expect(linkHttps(42)).toBeNull()
  })
})

describe('linkMapsDoEndereco', () => {
  it('codifica o endereço', () => expect(linkMapsDoEndereco('Rua A, 10 & B')).toBe('https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%2010%20%26%20B'))
})
