import { describe, expect, it } from 'vitest'
import { FOTO_MAX_CHARS, fotoValida, recorteQuadrado } from './fotoPerfil'

describe('foto do perfil', () => {
  it('aceita WebP e JPEG em data URL dentro do limite', () => {
    expect(fotoValida('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA')
    expect(fotoValida('data:image/jpeg;base64,/9j/4AAQ==')).toBe('data:image/jpeg;base64,/9j/4AAQ==')
  })
  it('recusa outro tipo, texto solto, endereço externo e script', () => {
    expect(fotoValida('data:image/png;base64,AAAA')).toBeNull()
    expect(fotoValida('data:image/svg+xml;base64,AAAA')).toBeNull()
    expect(fotoValida('https://exemplo.com/foto.jpg')).toBeNull()
    expect(fotoValida('data:image/webp;base64,AA" onerror="x()')).toBeNull()
    expect(fotoValida(null)).toBeNull()
    expect(fotoValida(42)).toBeNull()
  })
  it('recusa foto acima do limite do banco', () => {
    expect(fotoValida('data:image/webp;base64,' + 'A'.repeat(FOTO_MAX_CHARS))).toBeNull()
  })
  it('recorta o quadrado do meio', () => {
    expect(recorteQuadrado(4000, 3000)).toEqual({ sx: 500, sy: 0, lado: 3000 })
    expect(recorteQuadrado(3000, 4000)).toEqual({ sx: 0, sy: 500, lado: 3000 })
    expect(recorteQuadrado(500, 500)).toEqual({ sx: 0, sy: 0, lado: 500 })
  })
})
